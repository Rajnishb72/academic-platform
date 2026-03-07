import { supabase } from "@/lib/supabase";

export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  updated_at: string;
  bio?: string;
  institution?: string;
}

// ─── Ensure row exists (called on every login) ──────────────────────────────
export async function ensureProfile(
  userId: string,
  clerkName: string | null,
  username?: string | null,
): Promise<void> {
  // Guard: bail if Supabase isn't configured yet
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    return;
  try {
    // Step 1: Insert the row if it doesn't exist yet
    const upsertData: any = {
      id: userId,
      display_name: clerkName,
      updated_at: new Date().toISOString(),
    };
    if (username) {
      upsertData.username = username;
    }

    await supabase
      .from("user_profiles")
      .upsert(
        upsertData,
        { onConflict: "id", ignoreDuplicates: true },
      );

    // Step 2: If the row exists but display_name is still null, fill it in
    // (covers users who were inserted before name sync was added)
    if (clerkName) {
      await supabase
        .from("user_profiles")
        .update({
          display_name: clerkName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .is("display_name", null);
    }
  } catch {
    // Non-critical — silently skip if network is unavailable
  }
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchProfile(
  userId: string,
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) console.error("[profile] fetch:", error.message);
  return data ?? null;
}

// ─── Username Availability ────────────────────────────────────────────────────

export async function checkUsernameAvailable(
  username: string,
  excludeUserId?: string
): Promise<boolean> {
  if (!username) return false;
  let query = supabase.from("user_profiles").select("id").eq("username", username);
  if (excludeUserId) {
    query = query.neq("id", excludeUserId);
  }
  const { data, error } = await query.limit(1);
  if (error) throw error;
  return data.length === 0;
}

// ─── Upsert Profile Settings ──────────────────────────────────────────────────

export async function saveProfileSettings(
  userId: string,
  data: { display_name?: string; bio?: string; institution?: string; username?: string }
): Promise<void> {
  const { error } = await supabase.from("user_profiles").update({
    ...data,
    updated_at: new Date().toISOString(),
  }).eq("id", userId);

  if (error) {
    // If update fails, fallback to upsert
    const { error: upsertErr } = await supabase.from("user_profiles").upsert({
      id: userId,
      ...data,
      updated_at: new Date().toISOString(),
    });
    if (upsertErr) throw new Error(upsertErr.message);
  }
}

// ─── Upsert name ─────────────────────────────────────────────────────────────

export async function saveDisplayName(
  userId: string,
  displayName: string,
): Promise<void> {
  await saveProfileSettings(userId, { display_name: displayName });
}

// ─── Upload avatar + save URL ─────────────────────────────────────────────────

export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadErr) throw new Error(uploadErr.message);

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
  const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  const { error: saveErr } = await supabase.from("user_profiles").upsert(
    {
      id: userId,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (saveErr) throw new Error(saveErr.message);

  return avatarUrl;
}
