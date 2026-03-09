"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Bookmark,
  Share2,
  TrendingUp,
  Clock,
  Flame,
  Tag,
  ChevronUp,
  Loader2,
  Search,
  RefreshCw,
  Star,
  BadgeCheck,
} from "lucide-react";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import {
  ForumPost,
  fetchPosts,
  castVote,
  toggleSave,
  fetchLeaderboard,
  LeaderboardEntry,
  subscribeToForumPosts,
  timeAgo,
} from "@/lib/forums";
import CommentsPanel from "@/components/forums/CommentsPanel";
import { useToast } from "@/components/ToastProvider";

const FILTER_TABS = ["Hot", "New", "Top", "Rising"] as const;
type FilterTab = (typeof FILTER_TABS)[number];
type SortKey = "hot" | "new" | "top" | "rising";
const FILTER_SORT: Record<FilterTab, SortKey> = {
  Hot: "hot",
  New: "new",
  Top: "top",
  Rising: "rising",
};

const CATEGORY_COLORS: Record<string, string> = {
  Question: "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20",
  Resource: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20",
  Discussion: "bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20",
  Solution: "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20",
};

// --- Vote Button ----------------------------------------------------------------

function VoteButton({
  type,
  count,
  active,
  onClick,
  disabled,
}: {
  type: "up" | "down";
  count: number;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const isUp = type === "up";
  const cls = active
    ? isUp
      ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40"
      : "bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40"
    : "hover:bg-[var(--ax-surface-3)]";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={"flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 " + cls}
      style={!active ? { color: "var(--ax-text-muted)" } : {}}
    >
      {isUp ? (
        <ThumbsUp className="h-3.5 w-3.5" />
      ) : (
        <ThumbsDown className="h-3.5 w-3.5" />
      )}
      <span>{count}</span>
    </button>
  );
}

// --- Post Card -------------------------------------------------------------------

function PostCard({
  post,
  onVote,
  onSave,
  votingId,
  savingId,
  isCommentsOpen,
  onToggleComments,
  onCommentAdded,
  currentUserId,
  authorName,
  authorAvatar,
}: {
  post: ForumPost;
  onVote: (id: string, type: "up" | "down") => void;
  onSave: (id: string) => void;
  votingId: string | null;
  savingId: string | null;
  isCommentsOpen: boolean;
  onToggleComments: (id: string) => void;
  onCommentAdded: (id: string) => void;
  currentUserId: string | null;
  authorName: string;
  authorAvatar: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showReadMore, setShowReadMore] = useState(false);
  const bodyRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    // Using a reliable resize observer to determine if native text exceeds ~3 lines (approx 60px).
    const checkOverflow = () => {
      if (el.scrollHeight > 65 || el.scrollHeight > el.clientHeight + 2) {
        setShowReadMore(true);
      } else {
        setShowReadMore(false);
      }
    };

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);
    checkOverflow();

    return () => observer.disconnect();
  }, [post.body]);

  const netVotes = post.upvotes_count - post.downvotes_count;
  const netCls = netVotes > 0
    ? "text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/20"
    : netVotes < 0
      ? "text-rose-400 bg-rose-500/10 ring-1 ring-rose-500/20"
      : "text-slate-400 bg-slate-800 ring-1 ring-slate-700";

  const commentsCls = isCommentsOpen
    ? "bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/40"
    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200";

  const saveCls = post.saved
    ? "bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/40"
    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="ax-card group overflow-hidden"
    >
      <div className="p-5">
        {/* Top row: author + category */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            {post.author_avatar && /^https?:\/\//.test(post.author_avatar) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.author_avatar} alt={post.author_name} className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-white/10" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white shadow-sm">
                {post.author_avatar}
              </div>
            )}
            <div>
              <p className="flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--ax-text-primary)" }}>
                {post.author_name}
                {post.is_verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-blue-400" />}
              </p>
              <p className="text-[10px]" style={{ color: "var(--ax-text-faint)" }}>
                {timeAgo(post.created_at)}
              </p>
            </div>
          </div>
          <span className={"rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " + (CATEGORY_COLORS[post.category] ?? "")}>
            {post.category}
          </span>
        </div>

        {/* Title */}
        <h3 className="mb-2 text-sm font-semibold leading-snug group-hover:text-indigo-400 transition-colors cursor-pointer" style={{ color: "var(--ax-text-primary)" }}>
          {post.title}
        </h3>

        {/* Body wrapped in motion for smooth height transition */}
        <motion.div
          animate={{ height: expanded ? "auto" : "4.2rem" }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="relative overflow-hidden mb-1"
        >
          <p ref={bodyRef}
            className={`text-xs leading-relaxed whitespace-pre-wrap transition-colors duration-300 ${expanded ? "" : "line-clamp-3"}`}
            style={{ color: "var(--ax-text-secondary)" }}>
            {post.body}
          </p>
        </motion.div>

        {showReadMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mb-3 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
          >
            {expanded ? "Show Less" : "Read More"}
          </button>
        )}
        {!showReadMore && <div className="mb-3" />}

        {/* Tags */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium ring-1"
              style={{ background: "var(--ax-surface-3)", color: "var(--ax-text-secondary)", borderColor: "var(--ax-border)" }}
            >
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
        </div>

        {/* Action row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Votes */}
          <VoteButton type="up" count={post.upvotes_count} active={post.userVote === "up"} onClick={() => onVote(post.id, "up")} disabled={votingId === post.id} />
          <VoteButton type="down" count={post.downvotes_count} active={post.userVote === "down"} onClick={() => onVote(post.id, "down")} disabled={votingId === post.id} />

          {/* Net score pill */}
          <span className={"rounded-md px-2 py-1 text-[10px] font-bold tabular-nums " + netCls}>
            {netVotes > 0 ? "+" : ""}{netVotes}
          </span>

          <div className="ml-auto flex items-center gap-1.5">
            {/* Comments toggle */}
            <button
              onClick={() => onToggleComments(post.id)}
              className={"flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition " + commentsCls}
            >
              <MessageCircle className={"h-3.5 w-3.5 " + (isCommentsOpen ? "fill-indigo-400/30" : "")} />
              <span>{post.comments_count}</span>
            </button>

            {/* Save */}
            <button
              onClick={() => onSave(post.id)}
              disabled={savingId === post.id}
              className={"flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition disabled:opacity-50 " + saveCls}
            >
              <Bookmark className={"h-3.5 w-3.5 " + (post.saved ? "fill-indigo-400" : "")} />
            </button>

            {/* Share */}
            <button
              onClick={() => {
                const url = `${window.location.origin}/forums?postId=${post.id}`;
                navigator.clipboard.writeText(url);
                const { toast } = require("@/components/ToastProvider");
                if (toast) toast.success("Link copied to clipboard!");
              }}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition hover:bg-[var(--ax-surface-3)]"
              style={{ color: "var(--ax-text-muted)" }}
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Inline comments panel */}
      <AnimatePresence>
        {isCommentsOpen && (
          <CommentsPanel
            postId={post.id}
            commentsCount={post.comments_count}
            currentUserId={currentUserId}
            authorName={authorName}
            authorAvatar={authorAvatar}
            onCountChange={() => onCommentAdded(post.id)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- Page ------------------------------------------------------------------------

export default function ForumsFeedPage() {
  const { user } = useUser();
  const userId = user?.id ?? null;

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("New");
  const [search, setSearch] = useState("");
  const [votingId, setVotingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [topContributors, setTopContributors] = useState<LeaderboardEntry[]>([]);
  const [openCommentsId, setOpenCommentsId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);
  const POSTS_PER_PAGE = 10;
  const toast = useToast();

  function handleToggleComments(id: string) {
    setOpenCommentsId((prev) => (prev === id ? null : id));
  }

  function handleCommentAdded(postId: string) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p,
      ),
    );
  }

  const authorName = user?.fullName ?? user?.username ?? "Anonymous";
  const authorAvatar = (() => {
    const parts = authorName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [fetchedPosts, leaderboard] = await Promise.all([
        fetchPosts(userId, FILTER_SORT[activeFilter]),
        fetchLeaderboard(),
      ]);
      setPosts(fetchedPosts);
      setTopContributors(leaderboard.slice(0, 3));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setFetchError(msg);
      console.error("[forums page] load error:", msg);
    } finally {
      setLoading(false);
    }
  }, [userId, activeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime subscription
  useEffect(() => {
    const unsub = subscribeToForumPosts(
      (newPost) => {
        if (newPost.user_id !== userId) {
          setPosts((prev) => [newPost, ...prev]);
        }
      },
      (updatedPost) => {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === updatedPost.id
              ? { ...updatedPost, userVote: p.userVote, saved: p.saved }
              : p,
          ),
        );
      },
      (deletedId) => {
        setPosts((prev) => prev.filter((p) => p.id !== deletedId));
      },
    );
    return unsub;
  }, [userId]);

  async function handleVote(id: string, type: "up" | "down") {
    if (!userId) return;
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const alreadyVoted = p.userVote === type;
        const removingVote = alreadyVoted;
        const changingVote = !alreadyVoted && p.userVote !== null;
        return {
          ...p,
          upvotes_count:
            type === "up"
              ? removingVote ? p.upvotes_count - 1 : p.upvotes_count + 1
              : changingVote && p.userVote === "up" ? p.upvotes_count - 1 : p.upvotes_count,
          downvotes_count:
            type === "down"
              ? removingVote ? p.downvotes_count - 1 : p.downvotes_count + 1
              : changingVote && p.userVote === "down" ? p.downvotes_count - 1 : p.downvotes_count,
          userVote: alreadyVoted ? null : type,
        };
      }),
    );
    setVotingId(id);
    await castVote(id, userId, type);
    setVotingId(null);
  }

  async function handleSave(id: string) {
    if (!userId) return;
    setSavingId(id);
    const nowSaved = await toggleSave(id, userId);
    if (nowSaved !== null) {
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, saved: nowSaved } : p)),
      );
      toast.info(nowSaved ? "Post saved" : "Post unsaved");
    }
    setSavingId(null);
  }

  const filtered = posts.filter(
    (p) =>
      (p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))) &&
      (!activeCategory || p.category === activeCategory),
  );

  const paginatedPosts = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Extract trending tags from current posts
  const trendingTags = Array.from(
    posts.reduce((map, p) => {
      p.tags.forEach((t) => map.set(t, (map.get(t) || 0) + 1));
      return map;
    }, new Map<string, number>()),
  ).sort((a, b) => b[1] - a[1]).slice(0, 9).map(([tag]) => tag);

  const filterTabCls = (tab: FilterTab) =>
    activeFilter === tab
      ? "bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.15)]"
      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50";

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Main Feed */}
      <div className="flex-1 min-w-0">
        {/* Search + Filters */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search discussions, tags..."
              className="ax-input w-full rounded-xl py-2.5 !pl-10 pr-4"
            />
          </div>
          <div className="flex items-center gap-1 rounded-xl p-1" style={{ border: "1px solid var(--ax-border)", background: "var(--ax-surface-2)" }}>
            {FILTER_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={"flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all " + filterTabCls(tab)}
              >
                {tab === "Hot" && <Flame className="h-3 w-3" />}
                {tab === "New" && <Clock className="h-3 w-3" />}
                {tab === "Top" && <ChevronUp className="h-3 w-3" />}
                {tab === "Rising" && <TrendingUp className="h-3 w-3" />}
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Category filter strip */}
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveCategory(null)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all
              ${!activeCategory ? "bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30" : "text-slate-400 hover:text-slate-200 hover:bg-[var(--ax-surface-hover)]"}`}
          >
            All
          </button>
          {Object.keys(CATEGORY_COLORS).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all
                ${activeCategory === cat ? CATEGORY_COLORS[cat] : "text-slate-400 hover:text-slate-200 hover:bg-[var(--ax-surface-hover)]"}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Post List */}
        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="flex flex-col gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-2xl p-5 space-y-4" style={{ border: "1px solid var(--ax-border)", background: "var(--ax-surface-2)" }}>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full ax-skeleton" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2.5 w-24 ax-skeleton rounded" />
                      <div className="h-2 w-16 ax-skeleton rounded" />
                    </div>
                    <div className="h-5 w-16 ax-skeleton rounded-full" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-3/4 ax-skeleton rounded" />
                    <div className="h-3 w-full ax-skeleton rounded" />
                    <div className="h-3 w-2/3 ax-skeleton rounded" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-14 ax-skeleton rounded-lg" />
                    <div className="h-7 w-14 ax-skeleton rounded-lg" />
                    <div className="h-7 w-20 ax-skeleton rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : fetchError ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-rose-800/40 bg-rose-950/20 py-16 text-center px-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 ring-1 ring-rose-500/20">
                <RefreshCw className="h-6 w-6 text-rose-400" />
              </div>
              <p className="text-sm font-semibold text-rose-400">Failed to load posts</p>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                {fetchError.includes("Failed to fetch")
                  ? "Cannot reach the database. Your Supabase project may be paused \u2014 visit supabase.com to resume it, then retry."
                  : fetchError}
              </p>
              <button
                onClick={load}
                className="mt-5 flex items-center gap-2 rounded-lg bg-rose-600/20 px-4 py-2 text-xs font-medium text-rose-400 ring-1 ring-rose-500/20 transition hover:bg-rose-600/30"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            </div>
          ) : (
            <AnimatePresence>
              {filtered.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center rounded-xl py-16 text-center"
                  style={{ border: "1px solid var(--ax-border)", background: "var(--ax-surface-2)" }}
                >
                  <MessageCircle className="mb-3 h-10 w-10" style={{ color: "var(--ax-text-faint)" }} />
                  <p className="text-sm font-medium" style={{ color: "var(--ax-text-secondary)" }}>
                    {search ? `No results for "${search}"` : "No discussions yet — start one and spark the conversation"}
                  </p>
                  {!search && (
                    <Link
                      href="/forums/create"
                      className="mt-4 rounded-lg bg-indigo-600/20 px-4 py-2 text-xs font-medium text-indigo-400 ring-1 ring-indigo-500/20 transition hover:bg-indigo-600/30"
                    >
                      Create a Post
                    </Link>
                  )}
                </motion.div>
              ) : (
                <>
                  {paginatedPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onVote={handleVote}
                      onSave={handleSave}
                      votingId={votingId}
                      savingId={savingId}
                      isCommentsOpen={openCommentsId === post.id}
                      onToggleComments={handleToggleComments}
                      onCommentAdded={handleCommentAdded}
                      currentUserId={userId}
                      authorName={authorName}
                      authorAvatar={authorAvatar}
                    />
                  ))}
                  {hasMore && (
                    <div className="flex flex-col items-center gap-2 pt-2">
                      <p className="text-[11px] text-slate-500">
                        Showing {paginatedPosts.length} of {filtered.length} posts
                      </p>
                      <button
                        onClick={() => setVisibleCount((c) => c + POSTS_PER_PAGE)}
                        className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-6 py-2.5 text-sm font-semibold text-indigo-400 transition-all hover:bg-indigo-500/20 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                      >
                        Load More
                      </button>
                    </div>
                  )}
                  {!hasMore && filtered.length > POSTS_PER_PAGE && (
                    <p className="text-center text-[11px] text-slate-600 pt-2">
                      All {filtered.length} posts shown
                    </p>
                  )}
                </>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
        {/* Quick actions */}
        <div className="ax-card-flat p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ax-text-faint)" }}>
            Quick Actions
          </p>
          <Link
            href="/forums/create"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] transition hover:bg-indigo-500 hover:shadow-[0_0_20px_rgba(99,102,241,0.5)]"
          >
            <span>+ Create Post</span>
          </Link>
        </div>

        {/* Top Contributors */}
        <div className="ax-card-flat p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ax-text-faint)" }}>
            Top Contributors
          </p>
          <ul className="flex flex-col gap-2.5">
            {topContributors.length === 0 ? (
              <li className="text-xs text-slate-500 text-center py-2">
                No contributors yet
              </li>
            ) : (
              topContributors.map((c, i) => {
                const rankCls = i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : "text-amber-700";
                return (
                  <li key={c.user_id} className="flex items-center gap-2.5">
                    <span className={"w-5 text-center text-xs font-bold " + rankCls}>
                      #{i + 1}
                    </span>
                    {c.author_avatar && /^https?:\/\//.test(c.author_avatar) ? (
                      <img src={c.author_avatar} alt={c.author_name} className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-white/10" />
                    ) : (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-[10px] font-bold text-white shadow-sm">
                        {c.author_avatar}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="flex items-center gap-1 truncate text-xs font-medium text-slate-200">
                        {c.author_name}
                        {c.is_verified && <BadgeCheck className="h-3 w-3 shrink-0 text-blue-400" />}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        <Star className="inline h-2.5 w-2.5 -mt-0.5 text-amber-500" /> {c.total_rep.toLocaleString()} rep
                      </p>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
          <Link
            href="/forums/reputation"
            className="mt-3 block text-center text-[11px] text-indigo-400 hover:text-indigo-300 transition"
          >
            View full rankings &rarr;
          </Link>
        </div>

        {/* Popular Tags */}
        <div className="ax-card-flat p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ax-text-faint)" }}>
              Popular Tags
            </p>
            <button onClick={load} className="text-slate-500 hover:text-slate-300 transition">
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(trendingTags.length > 0 ? trendingTags : ["AI", "Data Science", "Linux", "Ethical Hacking", "Career", "NLP", "Game Programming", "DevOps", "Resources"]).map((tag) => (
              <button
                key={tag}
                onClick={() => setSearch(tag)}
                className="rounded-full bg-slate-800/50 px-2.5 py-1 text-[10px] font-medium text-slate-300 ring-1 ring-slate-700/50 transition hover:bg-indigo-500/20 hover:text-indigo-300 hover:ring-indigo-500/40"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
