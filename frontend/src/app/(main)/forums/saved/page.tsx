"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bookmark,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Tag,
  Search,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { fetchSavedPosts, toggleSave, ForumPost, timeAgo } from "@/lib/forums";

const CATEGORY_COLORS: Record<string, string> = {
  Question: "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20",
  Resource: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20",
  Discussion: "bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20",
  Solution: "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20",
};

export default function SavedPage() {
  const { user } = useUser();
  const userId = user?.id ?? null;

  const [saved, setSaved] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [unsavingId, setUnsavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!userId) return;
    fetchSavedPosts(userId).then((data) => {
      setSaved(data);
      setLoading(false);
    });
  }, [userId]);

  async function handleUnsave(id: string) {
    if (!userId) return;
    setUnsavingId(id);
    const nowSaved = await toggleSave(id, userId);
    if (nowSaved === false) {
      setSaved((prev) => prev.filter((p) => p.id !== id));
    }
    setUnsavingId(null);
  }

  const filtered = saved.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100">Saved Posts</h2>
          <p className="text-xs text-slate-400">
            {saved.length} posts bookmarked
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved…"
            className="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-2.5 pl-9 pr-4 text-sm text-slate-200 placeholder-slate-500 outline-none transition focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800/60 bg-slate-900/50 py-16">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-indigo-400" />
            <p className="text-sm text-slate-400">Loading saved posts…</p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center rounded-xl border border-slate-800/60 bg-slate-900/50 py-16 text-center"
              >
                <Bookmark className="mb-3 h-10 w-10 text-slate-600" />
                {saved.length === 0 ? (
                  <>
                    <p className="text-sm font-medium text-slate-400">
                      Nothing saved yet
                    </p>
                    <Link
                      href="/forums"
                      className="mt-4 rounded-lg bg-indigo-600/20 px-4 py-2 text-xs font-medium text-indigo-400 ring-1 ring-indigo-500/20 transition hover:bg-indigo-600/30"
                    >
                      Browse the Feed
                    </Link>
                  </>
                ) : (
                  <p className="text-sm font-medium text-slate-400">
                    No results for &ldquo;{search}&rdquo;
                  </p>
                )}
              </motion.div>
            ) : (
              filtered.map((post) => (
                <motion.div
                  key={post.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-5 transition-all hover:border-indigo-500/40 hover:bg-slate-800/60"
                >
                  {/* Author */}
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {post.author_avatar && /^https?:\/\//.test(post.author_avatar) ? (
                        <img src={post.author_avatar} alt={post.author_name} className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-white/10" />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white shadow-sm">
                          {post.author_avatar}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-slate-200">
                          {post.author_name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {timeAgo(post.created_at)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CATEGORY_COLORS[post.category] ?? ""}`}
                    >
                      {post.category}
                    </span>
                  </div>

                  <Link href={`/forums/${post.id}`}>
                    <h3 className="mb-2 text-sm font-semibold text-slate-100 hover:text-indigo-400 cursor-pointer transition-colors">
                      {post.title}
                    </h3>
                  </Link>
                  <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-slate-400">
                    {post.body}
                  </p>

                  {/* Tags */}
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 rounded-full bg-slate-800/60 px-2.5 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-slate-700/50"
                      >
                        <Tag className="h-2.5 w-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Metrics + Unsave */}
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                      <ThumbsUp className="h-3.5 w-3.5" /> {post.upvotes_count}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-rose-400">
                      <ThumbsDown className="h-3.5 w-3.5" />{" "}
                      {post.downvotes_count}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MessageCircle className="h-3.5 w-3.5" />{" "}
                      {post.comments_count}
                    </span>
                    <button
                      onClick={() => handleUnsave(post.id)}
                      disabled={unsavingId === post.id}
                      className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-indigo-400 ring-1 ring-indigo-500/20 transition hover:bg-rose-500/10 hover:text-rose-400 hover:ring-rose-500/20 disabled:opacity-50"
                    >
                      {unsavingId === post.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Bookmark className="h-3.5 w-3.5 fill-current" />
                      )}
                      Unsave
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
