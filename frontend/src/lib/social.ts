import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SocialProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface FollowEntry {
  userId: string;
  profile: SocialProfile;
  created_at: string;
}

export interface FriendEntry {
  userId: string;
  profile: SocialProfile;
  status: "pending" | "accepted";
  isRequester: boolean; // true = current user sent the request
  created_at: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function getProfiles(
  ids: string[],
): Promise<Record<string, SocialProfile>> {
  if (!ids.length) return {};
  const { data } = await supabase
    .from("user_profiles")
    .select("id,display_name,avatar_url")
    .in("id", ids);
  const map: Record<string, SocialProfile> = {};
  for (const p of data ?? []) map[p.id] = p;
  return map;
}

// ─── Follow / Unfollow ───────────────────────────────────────────────────────

export async function followUser(
  followerId: string,
  followingId: string,
): Promise<void> {
  await supabase
    .from("user_follows")
    .upsert({ follower_id: followerId, following_id: followingId });
}

export async function unfollowUser(
  followerId: string,
  followingId: string,
): Promise<void> {
  await supabase
    .from("user_follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);
}

export async function checkIsFollowing(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("user_follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();
  return !!data;
}

export async function getFollowers(userId: string): Promise<FollowEntry[]> {
  const { data } = await supabase
    .from("user_follows")
    .select("follower_id,created_at")
    .eq("following_id", userId)
    .order("created_at", { ascending: false });
  if (!data?.length) return [];
  const ids = data.map((r) => r.follower_id);
  const profiles = await getProfiles(ids);
  return data.map((r) => ({
    userId: r.follower_id,
    profile: profiles[r.follower_id] ?? {
      id: r.follower_id,
      display_name: null,
      username: null,
      avatar_url: null,
    },
    created_at: r.created_at,
  }));
}

export async function getFollowing(userId: string): Promise<FollowEntry[]> {
  const { data } = await supabase
    .from("user_follows")
    .select("following_id,created_at")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false });
  if (!data?.length) return [];
  const ids = data.map((r) => r.following_id);
  const profiles = await getProfiles(ids);
  return data.map((r) => ({
    userId: r.following_id,
    profile: profiles[r.following_id] ?? {
      id: r.following_id,
      display_name: null,
      username: null,
      avatar_url: null,
    },
    created_at: r.created_at,
  }));
}

export async function getFollowCounts(
  userId: string,
): Promise<{ followers: number; following: number }> {
  const [f1, f2] = await Promise.all([
    supabase
      .from("user_follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", userId),
    supabase
      .from("user_follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", userId),
  ]);
  return { followers: f1.count ?? 0, following: f2.count ?? 0 };
}

// ─── Friends ──────────────────────────────────────────────────────────────────

export async function sendFriendRequest(
  requesterId: string,
  recipientId: string,
): Promise<void> {
  await supabase.from("user_friends").upsert({
    requester_id: requesterId,
    recipient_id: recipientId,
    status: "pending",
  });
}

export async function acceptFriendRequest(
  requesterId: string,
  recipientId: string,
): Promise<void> {
  await supabase
    .from("user_friends")
    .update({ status: "accepted" })
    .eq("requester_id", requesterId)
    .eq("recipient_id", recipientId);
}

export async function declineFriendRequest(
  requesterId: string,
  recipientId: string,
): Promise<void> {
  await supabase
    .from("user_friends")
    .delete()
    .eq("requester_id", requesterId)
    .eq("recipient_id", recipientId);
}

export async function removeFriend(
  userId: string,
  otherId: string,
): Promise<void> {
  // Handle both directions of the relationship
  await supabase
    .from("user_friends")
    .delete()
    .or(
      `and(requester_id.eq.${userId},recipient_id.eq.${otherId}),and(requester_id.eq.${otherId},recipient_id.eq.${userId})`,
    );
}

/** Returns all friend entries (accepted + pending) involving userId. */
export async function getFriendsAndRequests(
  userId: string,
): Promise<FriendEntry[]> {
  const { data } = await supabase
    .from("user_friends")
    .select("requester_id,recipient_id,status,created_at")
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (!data?.length) return [];
  const otherIds = data.map((r) =>
    r.requester_id === userId ? r.recipient_id : r.requester_id,
  );
  const profiles = await getProfiles(otherIds);
  return data.map((r) => {
    const isRequester = r.requester_id === userId;
    const otherId = isRequester ? r.recipient_id : r.requester_id;
    return {
      userId: otherId,
      profile: profiles[otherId] ?? {
        id: otherId,
        display_name: null,
        username: null,
        avatar_url: null,
      },
      status: r.status as "pending" | "accepted",
      isRequester,
      created_at: r.created_at,
    };
  });
}

export async function getFriendCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from("user_friends")
    .select("id", { count: "exact", head: true })
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    .eq("status", "accepted");
  return count ?? 0;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface SearchUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

export interface SearchMaterial {
  id: string;
  title: string;
  subject: string;
  summary: string | null;
  user_id: string;
  uploader_name: string | null;
  created_at: string;
  file_url: string;
  views_count?: number;
  downloads_count?: number;
}

export interface SearchGroup {
  id: string;
  name: string;
  description: string;
  avatar_initials: string;
  avatar_color: string;
  member_count: number;
  is_public: boolean;
}

export interface SearchResults {
  users: SearchUser[];
  materials: SearchMaterial[];
  groups: SearchGroup[];
}

export async function getAllUsers(page: number = 1, limit: number = 20): Promise<{ users: SearchUser[]; total: number }> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count } = await supabase
    .from("user_profiles")
    .select("id,display_name,avatar_url,username", { count: "exact" })
    .order("display_name", { ascending: true })
    .range(from, to);

  return { users: (data ?? []) as SearchUser[], total: count ?? 0 };
}

export async function globalSearch(q: string): Promise<SearchResults> {
  if (!q.trim()) return { users: [], materials: [], groups: [] };
  const term = `%${q.trim()}%`;

  // Run all queries in parallel.
  // NOTE: user search uses plain .ilike() — the .or() variant misparses
  // the % wildcards inside PostgREST's filter string and silently returns 0 rows.
  const [usersRes, matRes, grpRes] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("id,display_name,avatar_url,username")
      .or(`display_name.ilike.${term},username.ilike.${term}`)
      .limit(20),
    supabase
      .from("library_items")
      .select("id,title,subject,summary,user_id,created_at,file_url,views_count,downloads_count")
      .eq("is_public", true)
      .or(`title.ilike.${term},subject.ilike.${term}`)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("campus_institutions")
      .select(
        "id,name,description,avatar_initials,avatar_color,member_count,is_public",
      )
      .eq("is_public", true)
      .or(`name.ilike.${term},description.ilike.${term}`)
      .limit(20),
  ]);

  // Also search notes table (older schema)
  const notesRes = await supabase
    .from("notes")
    .select(
      "id,title,subject,summary,user_id,created_at,file_url,uploader_name,views_count,downloads_count",
    )
    .eq("is_public", true)
    .or(`title.ilike.${term},subject.ilike.${term}`)
    .order("created_at", { ascending: false })
    .limit(20);

  const matItems = (matRes.data ?? []).map((m) => ({
    ...m,
    uploader_name: null,
  }));
  const noteItems = (notesRes.data ?? []).map((n) => ({
    ...n,
    file_url: n.file_url ?? "",
  }));

  // Merge + deduplicate by id
  const matMap = new Map<string, SearchMaterial>();
  [...matItems, ...noteItems].forEach((m) =>
    matMap.set(m.id, m as SearchMaterial),
  );

  return {
    users: (usersRes.data ?? []) as SearchUser[],
    materials: Array.from(matMap.values()),
    groups: (grpRes.data ?? []) as SearchGroup[],
  };
}

/** Fetch a single user's public profile + their content */
export async function fetchPublicProfile(userId: string) {
  const [profileRes, postsRes, materialsRes, notesRes, groupsRes, submissionsRes, plannerProofsRes, likeCountRes] = await Promise.all([
    supabase.from("user_profiles").select("id,display_name,avatar_url,is_verified").eq("id", userId).maybeSingle(),
    supabase.from("forum_posts").select("id,title,created_at,upvotes_count,comments_count,category").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    supabase.from("library_items").select("id,title,subject,created_at,views_count,downloads_count,file_url").eq("user_id", userId).eq("is_public", true).order("created_at", { ascending: false }).limit(50),
    supabase.from("notes").select("id,title,subject,created_at,views_count,downloads_count").eq("user_id", userId).eq("is_public", true).order("created_at", { ascending: false }).limit(50),
    supabase.from("campus_members").select("institution_id", { count: "exact" }).eq("user_id", userId).eq("status", "active"),
    supabase.from("campus_submissions").select("id", { count: "exact" }).eq("student_id", userId),
    supabase.from("plan_proofs").select("id", { count: "exact" }).eq("user_id", userId),
    supabase.from("profile_likes").select("id", { count: "exact" }).eq("liked_id", userId),
  ]);

  const allMaterials = [...(materialsRes.data ?? []), ...(notesRes.data ?? [])];
  const seen = new Set<string>();
  const materials = allMaterials.filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });

  return {
    profile: profileRes.data as (SearchUser & { is_verified?: boolean }) | null,
    forumPosts: (postsRes.data ?? []) as { id: string; title: string; created_at: string; upvotes_count: number; comments_count: number; category?: string }[],
    materials: materials as { id: string; title: string; subject: string; created_at: string; views_count?: number; downloads_count?: number; file_url?: string }[],
    groupCount: groupsRes.count ?? 0,
    submittedCount: (submissionsRes.count ?? 0) + (plannerProofsRes.count ?? 0),
    likeCount: likeCountRes.count ?? 0,
  };
}

// ─── Profile Likes ────────────────────────────────────────────────────────────

export async function likeProfile(likerId: string, likedId: string): Promise<void> {
  await supabase.from("profile_likes").upsert({ liker_id: likerId, liked_id: likedId }, { onConflict: "liked_id,liker_id" });
}

export async function unlikeProfile(likerId: string, likedId: string): Promise<void> {
  await supabase.from("profile_likes").delete().eq("liker_id", likerId).eq("liked_id", likedId);
}

export async function hasLikedProfile(likerId: string, likedId: string): Promise<boolean> {
  const { data } = await supabase.from("profile_likes").select("id").eq("liker_id", likerId).eq("liked_id", likedId).maybeSingle();
  return !!data;
}

export async function getProfileLikeCount(likedId: string): Promise<number> {
  const { count } = await supabase.from("profile_likes").select("id", { count: "exact" }).eq("liked_id", likedId);
  return count ?? 0;
}

/** Check the social relationship between two users */
export async function getSocialRelationship(
  currentUserId: string,
  targetUserId: string,
): Promise<{
  isFollowing: boolean;
  friendStatus: "none" | "pending_sent" | "pending_received" | "accepted";
  hasLiked: boolean;
}> {
  const [followRes, friendRes, likeRes] = await Promise.all([
    supabase.from("user_follows").select("id").eq("follower_id", currentUserId).eq("following_id", targetUserId).maybeSingle(),
    supabase.from("user_friends").select("requester_id,status")
      .or(`and(requester_id.eq.${currentUserId},recipient_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},recipient_id.eq.${currentUserId})`)
      .maybeSingle(),
    supabase.from("profile_likes").select("id").eq("liker_id", currentUserId).eq("liked_id", targetUserId).maybeSingle(),
  ]);

  let friendStatus: "none" | "pending_sent" | "pending_received" | "accepted" = "none";
  if (friendRes.data) {
    if (friendRes.data.status === "accepted") friendStatus = "accepted";
    else if (friendRes.data.requester_id === currentUserId) friendStatus = "pending_sent";
    else friendStatus = "pending_received";
  }

  return { isFollowing: !!followRes.data, friendStatus, hasLiked: !!likeRes.data };
}


