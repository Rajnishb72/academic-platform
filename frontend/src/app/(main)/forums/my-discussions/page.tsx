"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  PenSquare,
  Tag,
  Clock,
  TrendingUp,
  Loader2,
  Zap,
  ExternalLink,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import {
  fetchMyPosts,
  deletePost as dbDeletePost,
  ForumPost,
  timeAgo,
} from "@/lib/forums";

const CATEGORY_COLORS: Record<string, string> = {
  Question: "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20",
  Resource: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20",
  Discussion: "bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20",
  Solution: "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20",
};

function calcPostRep(post: ForumPost): number {
  return Math.max(
    0,
    10 +
    post.upvotes_count * 5 +
    post.comments_count * 1 -
    post.downvotes_count * 2,
  );
}

function calcTotalRep(posts: ForumPost[]): number {
  return posts.reduce((s, p) => s + calcPostRep(p), 0);
}

export default function MyPostsPage() {
  const { user } = useUser();
  const userId = user?.id ?? null;

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "top" | "rep">("newest");

  useEffect(() => {
    if (!userId) return;
    fetchMyPosts(userId).then((data) => {
      setPosts(data);
      setLoading(false);
    });
  }, [userId]);

  async function handleDelete(id: string) {
    if (!userId) return;
    setDeletingId(id);
    const ok = await dbDeletePost(id, userId);
    if (ok) setPosts((prev) => prev.filter((p) => p.id !== id));
    setDeletingId(null);
  }

  const totalUpvotes = posts.reduce((s, p) => s + p.upvotes_count, 0);
  const totalComments = posts.reduce((s, p) => s + p.comments_count, 0);
  const totalRep = calcTotalRep(posts);

  const sorted = [...posts].sort((a, b) => {
    if (sortBy === "top") return b.upvotes_count - a.upvotes_count;
    if (sortBy === "rep") return calcPostRep(b) - calcPostRep(a);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const STATS = [
    { label: "Posts", value: posts.length, icon: PenSquare, color: "text-indigo-400", bg: "bg-indigo-500/10" },
    { label: "Upvotes", value: totalUpvotes, icon: ThumbsUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Comments", value: totalComments, icon: MessageCircle, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Rep Earned", value: `+${totalRep}`, icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map(({ label, value, icon: Icon, color, bg }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-slate-800/60 bg-slate-900/50 px-4 py-4 flex items-center gap-3"
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div>
              <p className="text-xl font-black text-slate-100 tabular-nums">{value}</p>
              <p className="text-[10px] text-slate-500">{label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Header + Actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-400">
            {loading ? "Loading…" : `${posts.length} post${posts.length !== 1 ? "s" : ""}`}
          </h2>
          {!loading && posts.length > 0 && (
            <div className="flex items-center gap-1 rounded-lg border border-slate-700/60 bg-slate-900/50 p-0.5">
              {(["newest", "top", "rep"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all capitalize
                    ${sortBy === s ? "bg-slate-800 text-indigo-400 ring-1 ring-indigo-500/30 shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
                >
                  {s === "rep" ? "Top Rep" : s === "newest" ? "New" : "Top"}
                </button>
              ))}
            </div>
          )}
        </div>
        <Link
          href="/forums/create"
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-500"
        >
          <PenSquare className="h-3.5 w-3.5" />
          New Post
        </Link>
      </div>

      {/* Posts */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-900/50 py-16">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-indigo-400" />
            <p className="text-sm text-slate-400">Loading your posts…</p>
          </div>
        ) : (
          <AnimatePresence>
            {posts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-900/50 py-16 text-center"
              >
                <MessageCircle className="mb-3 h-10 w-10 text-slate-600" />
                <p className="text-sm font-semibold text-slate-400">No posts yet</p>
                <p className="mt-1 text-xs text-slate-500">Start the conversation — your first post earns +10 rep</p>
                <Link
                  href="/forums/create"
                  className="mt-4 rounded-xl bg-indigo-600/10 px-5 py-2 text-xs font-semibold text-indigo-400 ring-1 ring-indigo-500/20 transition hover:bg-indigo-600/20"
                >
                  Create your first post
                </Link>
              </motion.div>
            ) : (
              sorted.map((post, i) => {
                const postRep = calcPostRep(post);
                const netVotes = post.upvotes_count - post.downvotes_count;
                return (
                  <motion.div
                    key={post.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ delay: i * 0.03 }}
                    className="group rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5 transition-all hover:border-indigo-500/40 hover:shadow-md hover:shadow-indigo-900/20"
                  >
                    {/* Top row */}
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${CATEGORY_COLORS[post.category] ?? ""}`}>
                          {post.category}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Clock className="h-3 w-3" />
                          {timeAgo(post.created_at)}
                        </span>
                      </div>
                      {/* Rep pill */}
                      <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold shrink-0
                        ${postRep > 10 ? "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20" : "bg-slate-800/60 text-slate-500"}`}>
                        <Zap className="h-2.5 w-2.5" />
                        +{postRep} rep
                      </div>
                    </div>

                    {/* Title */}
                    <Link href="/forums" className="block mb-2">
                      <h3 className="text-sm font-bold text-slate-100 group-hover:text-indigo-400 transition-colors flex items-start gap-1.5">
                        {post.title}
                        <ExternalLink className="h-3 w-3 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
                      </h3>
                    </Link>
                    <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-slate-400">{post.body}</p>

                    {/* Tags */}
                    {post.tags.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-1.5">
                        {post.tags.map((tag) => (
                          <span key={tag} className="flex items-center gap-1 rounded-full bg-slate-800/60 px-2.5 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-slate-700/50">
                            <Tag className="h-2.5 w-2.5" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Metrics + Actions */}
                    <div className="flex items-center gap-3">
                      {/* Net score */}
                      <span className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold tabular-nums
                        ${netVotes > 0 ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20" :
                          netVotes < 0 ? "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20" : "bg-slate-800/60 text-slate-500"}`}>
                        {netVotes > 0 ? <ThumbsUp className="h-3.5 w-3.5" /> : <ThumbsDown className="h-3.5 w-3.5" />}
                        {netVotes > 0 ? "+" : ""}{netVotes}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MessageCircle className="h-3.5 w-3.5" /> {post.comments_count}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {post.upvotes_count}↑ {post.downvotes_count}↓
                      </span>
                      <div className="ml-auto flex items-center gap-2">
                        <Link
                          href="/forums"
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-indigo-400 transition hover:bg-indigo-500/10 font-medium"
                        >
                          <Star className="h-3 w-3" /> View
                        </Link>
                        <button
                          onClick={() => handleDelete(post.id)}
                          disabled={deletingId === post.id}
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50"
                        >
                          {deletingId === post.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          Delete
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
