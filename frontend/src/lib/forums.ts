import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PostCategory = "Question" | "Discussion" | "Resource" | "Solution";

export interface ForumPost {
  id: string;
  user_id: string;
  author_name: string;
  author_avatar: string; // URL or initials
  is_verified?: boolean;
  title: string;
  body: string;
  tags: string[];
  category: PostCategory;
  upvotes_count: number;
  downvotes_count: number;
  saves_count: number;
  comments_count: number;
  created_at: string;
  // enriched client-side
  userVote?: "up" | "down" | null;
  saved?: boolean;
}

export interface UserVoteMap {
  [postId: string]: "up" | "down";
}
export interface UserSaveSet {
  [postId: string]: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  const w = Math.floor(d / 7);
  if (w > 0) return `${w}w ago`;
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

// ─── Profile Enrichment ───────────────────────────────────────────────────────

async function enrichWithProfiles<T extends { user_id: string; author_name: string; author_avatar: string; is_verified?: boolean }>(
  items: T[]
): Promise<T[]> {
  if (!items.length) return [];
  const userIds = [...new Set(items.map(i => i.user_id))];
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, display_name, avatar_url, is_verified")
    .in("id", userIds);

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

  return items.map(item => {
    const prof = profileMap.get(item.user_id);
    const name = prof?.display_name || item.author_name;
    const avatar = prof?.avatar_url || (name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2));
    return { ...item, author_name: name, author_avatar: avatar, is_verified: prof?.is_verified ?? false };
  });
}

// ─── Fetch all posts ──────────────────────────────────────────────────────────

export async function fetchPosts(
  userId: string | null,
  sort: "hot" | "new" | "top" | "rising" = "new",
): Promise<ForumPost[]> {
  let query = supabase.from("forum_posts").select("*");

  if (sort === "new") query = query.order("created_at", { ascending: false });
  if (sort === "top")
    query = query.order("upvotes_count", { ascending: false });
  if (sort === "hot")
    query = query.order("upvotes_count", { ascending: false });
  if (sort === "rising")
    query = query.order("created_at", { ascending: false });

  let data, error;
  try {
    ({ data, error } = await query);
  } catch (e) {
    console.error("[forum] fetchPosts network error:", e);
    throw new Error(
      "Failed to reach the database. Check your connection or Supabase project status.",
    );
  }
  if (error) {
    console.error("[forum] fetchPosts:", error.message);
    throw new Error(error.message);
  }

  const rawPosts: ForumPost[] = (data ?? []).map((p) => ({
    ...p,
    userVote: null,
    saved: false,
  }));

  const posts = await enrichWithProfiles(rawPosts);

  if (!userId || posts.length === 0) return posts;

  // Enrich with user's votes and saves in parallel
  const ids = posts.map((p) => p.id);
  const [votesRes, savesRes] = await Promise.all([
    supabase
      .from("forum_votes")
      .select("post_id, vote_type")
      .eq("user_id", userId)
      .in("post_id", ids),
    supabase
      .from("forum_saves")
      .select("post_id")
      .eq("user_id", userId)
      .in("post_id", ids),
  ]);

  const voteMap: UserVoteMap = {};
  for (const v of votesRes.data ?? []) voteMap[v.post_id] = v.vote_type;

  const saveSet: UserSaveSet = {};
  for (const s of savesRes.data ?? []) saveSet[s.post_id] = true;

  return posts.map((p) => ({
    ...p,
    userVote: voteMap[p.id] ?? null,
    saved: saveSet[p.id] ?? false,
  }));
}

// ─── Fetch posts by user ──────────────────────────────────────────────────────

export async function fetchMyPosts(userId: string): Promise<ForumPost[]> {
  const { data, error } = await supabase
    .from("forum_posts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[forum] fetchMyPosts:", error.message);
    return [];
  }

  const rawPosts = (data ?? []).map((p) => ({ ...p, userVote: null, saved: false }));
  return enrichWithProfiles(rawPosts);
}

// ─── Fetch saved posts for user ───────────────────────────────────────────────

export async function fetchSavedPosts(userId: string): Promise<ForumPost[]> {
  // Get post IDs the user saved
  const { data: saves, error: savesErr } = await supabase
    .from("forum_saves")
    .select("post_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (savesErr || !saves?.length) return [];

  const ids = saves.map((s) => s.post_id);
  const { data, error } = await supabase
    .from("forum_posts")
    .select("*")
    .in("id", ids);

  if (error) {
    console.error("[forum] fetchSavedPosts:", error.message);
    return [];
  }

  const rawPosts = (data ?? []).map((p) => ({ ...p, userVote: null, saved: true }));
  return enrichWithProfiles(rawPosts);
}

// ─── Create a post ────────────────────────────────────────────────────────────

export async function createPost(post: {
  user_id: string;
  author_name: string;
  author_avatar: string;
  title: string;
  body: string;
  tags: string[];
  category: PostCategory;
}): Promise<ForumPost | null> {
  const { data, error } = await supabase
    .from("forum_posts")
    .insert(post)
    .select()
    .single();

  if (error) {
    console.error("[forum] createPost:", error.message);
    return null;
  }
  return { ...data, userVote: null, saved: false };
}

// ─── Delete a post ────────────────────────────────────────────────────────────

export async function deletePost(
  postId: string,
  userId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("forum_posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", userId); // safety: only owner can delete

  if (error) {
    console.error("[forum] deletePost:", error.message);
    return false;
  }
  return true;
}

// ─── Vote (RPC) ───────────────────────────────────────────────────────────────

export async function castVote(
  postId: string,
  userId: string,
  voteType: "up" | "down",
): Promise<"added" | "changed" | "removed" | null> {
  const { data, error } = await supabase.rpc("cast_forum_vote", {
    p_post_id: postId,
    p_user_id: userId,
    p_vote_type: voteType,
  });
  if (error) {
    console.error("[forum] castVote:", error.message);
    return null;
  }
  return data as "added" | "changed" | "removed";
}

// ─── Save (RPC) ───────────────────────────────────────────────────────────────

export async function toggleSave(
  postId: string,
  userId: string,
): Promise<boolean | null> {
  const { data, error } = await supabase.rpc("toggle_forum_save", {
    p_post_id: postId,
    p_user_id: userId,
  });
  if (error) {
    console.error("[forum] toggleSave:", error.message);
    return null;
  }
  return data as boolean;
}

// ─── Fetch leaderboard ────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  user_id: string;
  author_name: string;
  author_avatar: string;
  is_verified?: boolean;
  total_rep: number;
  posts: number;
  total_upvotes: number;
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from("forum_posts")
    .select("user_id, author_name, author_avatar, upvotes_count, downvotes_count, comments_count");

  if (error) {
    console.error("[forum] fetchLeaderboard:", error.message);
    return [];
  }

  const map: Record<string, LeaderboardEntry> = {};
  for (const row of data ?? []) {
    if (!map[row.user_id]) {
      map[row.user_id] = {
        user_id: row.user_id,
        author_name: row.author_name,
        author_avatar: row.author_avatar,
        total_rep: 0,
        posts: 0,
        total_upvotes: 0,
      };
    }
    map[row.user_id].posts += 1;
    map[row.user_id].total_upvotes += row.upvotes_count ?? 0;
    // Reddit-style reputation: posting earns base points, upvotes multiply value,
    // downvotes reduce (like karma decay), comments show engagement
    map[row.user_id].total_rep +=
      10 +                                       // +10 per post created
      (row.upvotes_count ?? 0) * 5 +             // +5 per upvote received
      (row.comments_count ?? 0) * 1 -            // +1 per comment on your post
      (row.downvotes_count ?? 0) * 2;            // -2 per downvote received (karma decay)
  }

  const rawEntries = Object.values(map)
    .map((e) => ({ ...e, total_rep: Math.max(0, e.total_rep) })) // floor at 0
    .sort((a, b) => b.total_rep - a.total_rep);

  // Use the same profile enrichment!
  return enrichWithProfiles(rawEntries) as Promise<LeaderboardEntry[]>;
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export interface ForumComment {
  id: string;
  post_id: string;
  user_id: string;
  author_name: string;
  author_avatar: string;
  body: string;
  parent_id: string | null;
  likes_count: number;
  dislikes_count: number;
  edited: boolean;
  created_at: string;
  updated_at: string;
  // client-side enrichment
  userVote?: "like" | "dislike" | null;
  replies?: ForumComment[];
}

export async function fetchComments(
  postId: string,
  userId?: string | null,
): Promise<ForumComment[]> {
  const { data, error } = await supabase
    .from("forum_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[forum] fetchComments:", error.message);
    return [];
  }

  // Fetch this user's votes on all comments in parallel
  const voteMap: Record<string, "like" | "dislike"> = {};
  if (userId) {
    const { data: votes } = await supabase
      .from("forum_comment_votes")
      .select("comment_id, vote_type")
      .eq("user_id", userId);
    for (const v of votes ?? []) voteMap[v.comment_id] = v.vote_type;
  }

  // Enrich base comments with latest profiles (avatars & names)
  const enrichedComments = await enrichWithProfiles((data ?? []) as ForumComment[]);

  // Nest replies under their parent
  const map: Record<string, ForumComment> = {};
  for (const c of enrichedComments) {
    map[c.id] = { ...c, userVote: voteMap[c.id] ?? null, replies: [] };
  }
  const roots: ForumComment[] = [];
  for (const c of Object.values(map)) {
    if (c.parent_id && map[c.parent_id]) {
      map[c.parent_id].replies!.push(c);
    } else {
      roots.push(c);
    }
  }
  return roots;
}

export async function editComment(
  commentId: string,
  userId: string,
  newBody: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("forum_comments")
    .update({
      body: newBody.trim(),
      edited: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", commentId)
    .eq("user_id", userId); // server-side ownership check

  if (error) {
    console.error("[forum] editComment:", error.message);
    return false;
  }
  return true;
}

export async function deleteComment(
  commentId: string,
  userId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("forum_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", userId); // server-side ownership check

  if (error) {
    console.error("[forum] deleteComment:", error.message);
    return false;
  }
  return true;
}

export async function castCommentVote(
  commentId: string,
  userId: string,
  voteType: "like" | "dislike",
): Promise<"added" | "changed" | "removed" | null> {
  const { data, error } = await supabase.rpc("cast_comment_vote", {
    p_comment_id: commentId,
    p_user_id: userId,
    p_vote_type: voteType,
  });
  if (error) {
    console.error("[forum] castCommentVote:", error.message);
    return null;
  }
  return data as "added" | "changed" | "removed";
}

export async function addComment(
  postId: string,
  userId: string,
  authorName: string,
  authorAvatar: string,
  body: string,
  parentId?: string | null,
): Promise<ForumComment | null> {
  const { data, error } = await supabase
    .from("forum_comments")
    .insert({
      post_id: postId,
      user_id: userId,
      author_name: authorName,
      author_avatar: authorAvatar,
      body: body.trim(),
      parent_id: parentId ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[forum] addComment:", error.message);
    return null;
  }
  return data as ForumComment;
}

export function subscribeToComments(
  postId: string,
  onInsert: (comment: ForumComment) => void,
): () => void {
  const channel = supabase
    .channel(`forum_comments_${postId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "forum_comments",
        filter: `post_id=eq.${postId}`,
      },
      (payload) => onInsert(payload.new as ForumComment),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ─── Realtime subscription ────────────────────────────────────────────────────

/**
 * Subscribes to INSERT/UPDATE/DELETE on forum_posts.
 * Returns unsub function.
 */
export function subscribeToForumPosts(
  onInsert: (post: ForumPost) => void,
  onUpdate: (post: ForumPost) => void,
  onDelete: (id: string) => void,
): () => void {
  const channel: RealtimeChannel = supabase
    .channel("forum_posts_realtime")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "forum_posts" },
      (payload) =>
        onInsert({
          ...(payload.new as ForumPost),
          userVote: null,
          saved: false,
        }),
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "forum_posts" },
      (payload) => onUpdate(payload.new as ForumPost),
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "forum_posts" },
      (payload) => onDelete((payload.old as { id: string }).id),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
