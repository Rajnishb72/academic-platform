import { supabase } from "@/lib/supabase";

export type InteractionType = "view" | "download" | "rate" | "bookmark";

// ─── Bookmarks ────────────────────────────────────────────────────────────────

/**
 * Toggles a bookmark for a user on a note.
 */
export async function toggleBookmarkServer(noteId: string, userId: string): Promise<boolean> {
    try {
        const strUserId = String(userId);
        // Check if exists
        const { data } = await supabase
            .from("library_interactions")
            .select("id")
            .eq("note_id", noteId)
            .eq("user_id", strUserId)
            .eq("interaction_type", "bookmark")
            .maybeSingle();

        if (data) {
            // Remove
            await supabase
                .from("library_interactions")
                .delete()
                .eq("id", data.id);
            return false; // Not bookmarked anymore
        } else {
            // Add
            await supabase.from("library_interactions").insert({
                note_id: noteId,
                user_id: strUserId,
                interaction_type: "bookmark",
            });
            return true; // Bookmarked
        }
    } catch (err) {
        console.warn("[Bookmark] Error:", err);
        return false;
    }
}

/**
 * Gets all note IDs bookmarked by a user.
 */
export async function getUserBookmarks(userId: string): Promise<Set<string>> {
    try {
        const { data, error } = await supabase
            .from("library_interactions")
            .select("note_id")
            .eq("user_id", String(userId))
            .eq("interaction_type", "bookmark");

        if (error) throw error;
        return new Set((data || []).map(r => r.note_id as string));
    } catch (err) {
        console.warn("[Bookmark] Fetch error:", err);
        return new Set();
    }
}

// ─── Unique View ──────────────────────────────────────────────────────────────

export async function logUniqueView(noteId: string, userId: string): Promise<void> {
    try {
        const strUserId = String(userId);
        // Use RPC that handles uniqueness check + insert + increment all in one
        // SECURITY DEFINER bypasses RLS (which blocks Clerk users from inserting)
        const { data, error } = await supabase.rpc("record_view", {
            p_note_id: noteId,
            p_user_id: strUserId,
        });

        if (error) {
            console.warn("[View] record_view RPC failed:", error.message);
        } else {
            console.log("[View] record_view result:", data ? "new view recorded" : "already viewed");
        }
    } catch (err) {
        console.warn("[View] Error:", err);
    }
}

// ─── Download ─────────────────────────────────────────────────────────────────

export async function logUniqueDownload(noteId: string, userId: string): Promise<void> {
    try {
        const strUserId = String(userId);

        // Check if exists
        const { data } = await supabase
            .from("library_interactions")
            .select("id")
            .eq("user_id", strUserId)
            .eq("note_id", noteId)
            .eq("interaction_type", "download")
            .maybeSingle();

        if (data) {
            console.log("[Download] Already tracked for user.");
            return;
        }

        // Insert interaction
        const { error: insertErr } = await supabase
            .from("library_interactions")
            .insert({
                note_id: noteId,
                user_id: strUserId,
                interaction_type: "download",
            });

        if (insertErr) {
            console.warn("[Download] Insert warn:", insertErr.message);
            return;
        }

        // Increment downloads_count via RPC
        const { error: rpcErr } = await supabase.rpc("increment_downloads", {
            note_id: noteId,
        });

        if (rpcErr) {
            console.warn("[Download] RPC fallback:", rpcErr.message);
            // Fallback: manual increment
            const { data: noteData } = await supabase
                .from("notes")
                .select("downloads_count")
                .eq("id", noteId)
                .single();

            if (noteData) {
                const { error: upErr } = await supabase
                    .from("notes")
                    .update({ downloads_count: (noteData.downloads_count ?? 0) + 1 })
                    .eq("id", noteId);
                if (upErr) console.warn("[Download] Manual increment failed:", upErr.message);
                else console.log("[Download] Manual increment done");
            }
        } else {
            console.log("[Download] Tracked + incremented for note:", noteId);
        }
    } catch (err) {
        console.warn("[Download] Error:", err);
    }
}

// ─── Rating ───────────────────────────────────────────────────────────────────

/**
 * Rates a note (1–5). Upserts the rating, then recalculates avg_rating.
 */
export async function rateNote(
    noteId: string,
    userId: string,
    rating: number
): Promise<void> {
    try {
        // Upsert: one rating per (user, note)
        const { error: upsertErr } = await supabase
            .from("library_interactions")
            .upsert(
                {
                    note_id: noteId,
                    user_id: String(userId),
                    interaction_type: "rate",
                    rating,
                },
                { onConflict: "user_id,note_id,interaction_type" }
            );

        if (upsertErr) {
            console.warn("[Rating] Upsert failed:", upsertErr.message);
            // Fallback: try delete + insert
            await supabase
                .from("library_interactions")
                .delete()
                .eq("user_id", String(userId))
                .eq("note_id", noteId)
                .eq("interaction_type", "rate");

            const { error: insertErr } = await supabase
                .from("library_interactions")
                .insert({
                    note_id: noteId,
                    user_id: String(userId),
                    interaction_type: "rate",
                    rating,
                });

            if (insertErr) {
                console.error("[Rating] Insert also failed:", insertErr.message);
                return;
            }
        }

        // Recalculate avg_rating via RPC
        const { error: rpcErr } = await supabase.rpc("update_avg_rating", {
            target_note_id: noteId,
        });

        if (rpcErr) {
            console.warn("[Rating] RPC fallback:", rpcErr.message);
            // Manual recalculation
            const { data: rows } = await supabase
                .from("library_interactions")
                .select("rating")
                .eq("note_id", noteId)
                .eq("interaction_type", "rate")
                .not("rating", "is", null);

            if (rows && rows.length > 0) {
                const avg = rows.reduce((s, r) => s + (r.rating ?? 0), 0) / rows.length;
                await supabase
                    .from("notes")
                    .update({ avg_rating: Math.round(avg * 10) / 10 })
                    .eq("id", noteId);
                console.log("[Rating] Manual avg updated:", Math.round(avg * 10) / 10);
            }
        } else {
            console.log("[Rating] Tracked + avg updated for note:", noteId);
        }
    } catch (err) {
        console.warn("[Rating] Error:", err);
    }
}

// ─── Legacy alias ─────────────────────────────────────────────────────────────

/** @deprecated Use logUniqueView / logDownload / rateNote instead */
export async function logInteraction(
    noteId: string,
    userId: string,
    type: InteractionType,
    rating?: number
): Promise<void> {
    if (type === "view") return logUniqueView(noteId, userId);
    if (type === "download") return logUniqueDownload(noteId, userId);
    if (type === "rate" && rating !== undefined) return rateNote(noteId, userId, rating);
}
