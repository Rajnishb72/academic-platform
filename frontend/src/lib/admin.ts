/**
 * Admin utility — password-gated, stored in sessionStorage.
 * Password is checked client-side only (suitable for a personal/dev app).
 * Supabase mutations still happen via open RLS policies.
 */

const ADMIN_KEY = "academix_admin_session";
const ADMIN_PASSWORD = "academix@admin2025"; // Change this to your desired password

export function isAdminSession(): boolean {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(ADMIN_KEY) === "true";
}

export function loginAdmin(password: string): boolean {
    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem(ADMIN_KEY, "true");
        return true;
    }
    return false;
}

export function logoutAdmin(): void {
    sessionStorage.removeItem(ADMIN_KEY);
}

import { supabase } from "@/lib/supabase";

// ─── Verification ──────────────────────────────────────────────────────────────

/** Grant/revoke verified badge to a user */
export async function setUserVerified(userId: string, verified: boolean): Promise<void> {
    await supabase
        .from("user_profiles")
        .upsert({ id: userId, is_verified: verified }, { onConflict: "id" });
}

/** Grant/revoke verified badge to a campus group */
export async function setGroupVerified(groupId: string, verified: boolean): Promise<void> {
    await supabase
        .from("campus_institutions")
        .update({ is_verified: verified })
        .eq("id", groupId);
}

// ─── Delete notes (library) ────────────────────────────────────────────────────

export async function adminDeleteNote(noteId: string): Promise<void> {
    const { error } = await supabase.from("notes").delete().eq("id", noteId);
    if (error) throw new Error(error.message);
}

// ─── Delete forum post ─────────────────────────────────────────────────────────

export async function adminDeletePost(postId: string): Promise<void> {
    // Delete comments first (cascade may already handle this, but be safe)
    await supabase.from("forum_comments").delete().eq("post_id", postId);
    const { error } = await supabase.from("forum_posts").delete().eq("id", postId);
    if (error) throw new Error(error.message);
}

// ─── Delete campus group (institution) ────────────────────────────────────────

export async function adminDeleteGroup(groupId: string): Promise<void> {
    const { error } = await supabase.from("campus_institutions").delete().eq("id", groupId);
    if (error) throw new Error(error.message);
}

// ─── Users ─────────────────────────────────────────────────────────────────────

export async function adminUserBlock(userId: string, isBanned: boolean): Promise<void> {
    const { error } = await supabase.from("user_profiles").update({ is_banned: isBanned }).eq("id", userId);
    if (error) throw new Error(error.message);
}

export async function adminUserDelete(userId: string): Promise<void> {
    const { error } = await supabase.from("user_profiles").delete().eq("id", userId);
    if (error) throw new Error(error.message);
}

// ─── Platform stats ────────────────────────────────────────────────────────────

export interface PlatformStats {
    totalUsers: number;
    totalPosts: number;
    totalNotes: number;
    totalGroups: number;
    totalSubmissions: number;
    recentUsers: { id: string; display_name: string | null; avatar_url: string | null; is_verified: boolean; is_banned?: boolean; created_at?: string }[];
    recentPosts: { id: string; title: string; created_at: string; upvotes_count: number }[];
    recentGroups: { id: string; name: string; member_count: number; is_verified: boolean }[];
    recentNotes: { id: string; title: string; created_at: string; downloads_count: number }[];
    postsByWeek: number[];
    notesByWeek: number[];
}

function weeklyBuckets(dates: string[], weeks = 8): number[] {
    const now = Date.now();
    return Array.from({ length: weeks }, (_, i) => {
        const from = now - (weeks - i) * 7 * 86_400_000;
        const to = now - (weeks - i - 1) * 7 * 86_400_000;
        return dates.filter((d) => { const t = new Date(d).getTime(); return t >= from && t < to; }).length;
    });
}

export async function fetchPlatformStats(): Promise<PlatformStats> {
    // Fetch all data in parallel — count from row length to avoid RLS blocking aggregate COUNT
    const [
        usersRes, postsRes, notesRes, groupsRes, submissionsRes,
        recentPostsRes, recentGroupsRes, recentNotesRes,
    ] = await Promise.all([
        supabase.from("user_profiles").select("id,display_name,avatar_url,is_verified,is_banned").order("updated_at", { ascending: false }).limit(10),
        supabase.from("forum_posts").select("id,created_at").limit(500),
        supabase.from("notes").select("id,created_at").limit(500),
        supabase.from("campus_institutions").select("id").limit(500),
        supabase.from("campus_submissions").select("id").limit(500),
        supabase.from("forum_posts").select("id,title,created_at,upvotes_count").order("created_at", { ascending: false }).limit(20),
        supabase.from("campus_institutions").select("id,name,member_count,is_verified").order("member_count", { ascending: false }).limit(20),
        supabase.from("notes").select("id,title,created_at,downloads_count").order("downloads_count", { ascending: false }).limit(20),
    ]);

    const postDates = (postsRes.data ?? []).map((p: { created_at: string }) => p.created_at);
    const noteDates = (notesRes.data ?? []).map((n: { created_at: string }) => n.created_at);

    return {
        totalUsers: (usersRes.data ?? []).length,
        totalPosts: (postsRes.data ?? []).length,
        totalNotes: (notesRes.data ?? []).length,
        totalGroups: (groupsRes.data ?? []).length,
        totalSubmissions: (submissionsRes.data ?? []).length,
        recentUsers: (usersRes.data ?? []) as PlatformStats["recentUsers"],
        recentPosts: (recentPostsRes.data ?? []) as PlatformStats["recentPosts"],
        recentGroups: (recentGroupsRes.data ?? []) as PlatformStats["recentGroups"],
        recentNotes: (recentNotesRes.data ?? []) as PlatformStats["recentNotes"],
        postsByWeek: weeklyBuckets(postDates),
        notesByWeek: weeklyBuckets(noteDates),
    };
}
