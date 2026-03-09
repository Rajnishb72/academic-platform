"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/hooks/useUser";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Download,
  Compass,
  Star,
  FileText,
  Loader2,
  Eye,
  ArrowDownUp,
  TrendingUp,
  Clock,
  ChevronDown,
  Bookmark,
  BadgeCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { logUniqueView, logUniqueDownload, rateNote, getUserBookmarks, toggleBookmarkServer } from "@/lib/interactions";
import dynamic from "next/dynamic";
const PdfThumbnail = dynamic(() => import("@/components/PdfThumbnail"), { ssr: false, loading: () => <div className="h-full w-full bg-slate-800 animate-pulse" /> });

// ─── Types ────────────────────────────────────────────────────────────────────

interface Note {
  id: string;
  user_id: string;
  uploader_name: string | null;
  uploader_avatar?: string | null;
  title: string;
  subject: string;
  file_url: string;
  storage_path: string;
  downloads_count: number | null;
  avg_rating: number | null;
  views_count: number | null;
  created_at: string | null;
  is_verified?: boolean;
}

const SUBJECTS = [
  "All",
  "Artificial Intelligence",
  "Information & Network Security",
  "Linux Server Administration",
  "Game Programming",
  "Project Management",
  "Data Science",
  "Cloud Computing and Web Services",
  "Information Retrieval",
  "Ethical Hacking",
  "Customer Relationship Management",
];

const SUBJECT_COLOR: Record<string, { dot: string; text: string }> = {
  "Artificial Intelligence": { dot: "bg-violet-400", text: "text-violet-400" },
  "Information & Network Security": {
    dot: "bg-rose-400",
    text: "text-rose-400",
  },
  "Linux Server Administration": {
    dot: "bg-orange-400",
    text: "text-orange-400",
  },
  "Game Programming": { dot: "bg-pink-400", text: "text-pink-400" },
  "Project Management": { dot: "bg-teal-400", text: "text-teal-400" },
  "Data Science": { dot: "bg-sky-400", text: "text-sky-400" },
  "Cloud Computing and Web Services": {
    dot: "bg-cyan-400",
    text: "text-cyan-400",
  },
  "Information Retrieval": { dot: "bg-indigo-400", text: "text-indigo-400" },
  "Ethical Hacking": { dot: "bg-emerald-400", text: "text-emerald-400" },
  "Customer Relationship Management": {
    dot: "bg-amber-400",
    text: "text-amber-400",
  },
};

// ─── useBookmarks (server-side) ───────────────────────────────────────────────

function useBookmarks(userId: string | null | undefined) {
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setBookmarks(new Set());
      return;
    }
    getUserBookmarks(userId).then(setBookmarks);
  }, [userId]);

  async function toggleBookmark(noteId: string) {
    if (!userId || busy === noteId) return;
    setBusy(noteId);

    // Optimistic
    const next = new Set(bookmarks);
    const wasBookmarked = next.has(noteId);
    if (wasBookmarked) next.delete(noteId);
    else next.add(noteId);
    setBookmarks(next);

    const isNowBookmarked = await toggleBookmarkServer(noteId, userId);

    // Revert if mismatch
    if (isNowBookmarked !== !wasBookmarked) {
      const reverted = new Set(bookmarks);
      if (isNowBookmarked) reverted.add(noteId);
      else reverted.delete(noteId);
      setBookmarks(reverted);
    }

    setBusy(null);
  }

  return { bookmarks, toggleBookmark, busy };
}

// ─── useRating (persistent + optimistic) ──────────────────────────────────────

function useRating(
  userId: string | null | undefined,
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>,
) {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);

  // Load existing ratings from DB on mount
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("library_interactions")
          .select("note_id, rating")
          .eq("user_id", String(userId))
          .eq("interaction_type", "rate")
          .not("rating", "is", null);

        if (data) {
          const map: Record<string, number> = {};
          data.forEach((r: any) => { if (r.rating) map[r.note_id] = r.rating; });
          setRatings(map);
        }
      } catch (err) {
        console.warn("[Rating] Load error:", err);
      }
    })();
  }, [userId]);

  async function rate(noteId: string, stars: number) {
    if (!userId || busy) return;
    setBusy(noteId);
    // Optimistic: update local rating immediately
    setRatings((r) => ({ ...r, [noteId]: stars }));
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, avg_rating: stars } : n)),
    );
    await rateNote(noteId, userId, stars);

    // Refetch actual avg_rating from DB for real-time accuracy
    try {
      const { data: noteData } = await supabase
        .from("notes")
        .select("avg_rating")
        .eq("id", noteId)
        .single();
      if (noteData) {
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? { ...n, avg_rating: noteData.avg_rating } : n)),
        );
      }
    } catch (err) {
      console.warn("[Rating] Refetch error:", err);
    }

    setBusy(null);
  }
  return { ratings, rate, busy };
}

// ─── Tracked interactions (to prevent duplicate optimistic increments) ─────

function useTrackedInteractions(userId: string | null | undefined) {
  const [viewedNotes, setViewedNotes] = useState<Set<string>>(new Set());
  const [downloadedNotes, setDownloadedNotes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("library_interactions")
          .select("note_id, interaction_type")
          .eq("user_id", String(userId))
          .in("interaction_type", ["view", "download"]);

        if (data) {
          const views = new Set<string>();
          const downloads = new Set<string>();
          data.forEach((r: any) => {
            if (r.interaction_type === "view") views.add(r.note_id);
            if (r.interaction_type === "download") downloads.add(r.note_id);
          });
          setViewedNotes(views);
          setDownloadedNotes(downloads);
        }
      } catch (err) {
        console.warn("[Interactions] Load error:", err);
      }
    })();
  }, [userId]);

  function markViewed(noteId: string) {
    setViewedNotes((prev) => new Set(prev).add(noteId));
  }

  function markDownloaded(noteId: string) {
    setDownloadedNotes((prev) => new Set(prev).add(noteId));
  }

  return { viewedNotes, downloadedNotes, markViewed, markDownloaded };
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRow({
  value,
  onRate,
  disabled,
  size = 14,
}: {
  value: number;
  onRate?: (s: number) => void;
  disabled?: boolean;
  size?: number;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div
      className="inline-flex items-center gap-px"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          disabled={disabled}
          onMouseEnter={() => !disabled && setHover(s)}
          onClick={(e) => {
            e.stopPropagation();
            onRate?.(s);
          }}
          className="p-[1px] transition-transform hover:scale-125 disabled:cursor-default"
        >
          <Star
            style={{ width: size, height: size }}
            className={`transition-colors ${s <= (hover || value)
              ? "fill-amber-400 text-amber-400"
              : "text-slate-600"
              }`}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({
  note,
  userId,
  onClose,
  rate,
  userRating,
  busy,
  isBookmarked,
  toggleBookmark,
  onDownload,
}: {
  note: Note;
  userId: string | null;
  onClose: () => void;
  rate: (id: string, s: number) => void;
  userRating: number;
  busy: boolean;
  isBookmarked: boolean;
  toggleBookmark: () => void;
  onDownload: () => void;
}) {
  const nameStr = note.uploader_name || "Unknown User";
  const initials = nameStr.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const color = SUBJECT_COLOR[note.subject];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 30 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="flex h-[88vh] w-full max-w-[1100px] overflow-hidden rounded-3xl shadow-2xl"
        style={{ border: "1px solid var(--ax-border-light)", background: "var(--ax-surface-2)", boxShadow: "var(--ax-shadow-lg)" }}
      >
        {/* PDF viewer */}
        <div className="flex-1 min-w-0" style={{ background: "var(--ax-surface-0)" }}>
          <iframe
            src={`${note.file_url}#view=FitH&toolbar=0`}
            title={note.title}
            width="100%"
            height="100%"
            className="border-0"
          />
        </div>

        {/* Info panel */}
        <div className="flex w-[340px] shrink-0 flex-col" style={{ borderLeft: "1px solid var(--ax-border)", background: "var(--ax-surface-1)" }}>
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--ax-border)" }}>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--ax-text-faint)" }}>
              Note Info
            </span>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg transition-all"
              style={{ background: "var(--ax-surface-3)", color: "var(--ax-text-muted)" }}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Uploader */}
            <div className="flex items-center gap-3">
              {note.uploader_avatar ? (
                <img src={note.uploader_avatar} alt={nameStr} className="h-10 w-10 sm:h-11 sm:w-11 object-cover rounded-xl sm:rounded-2xl ring-1 ring-white/10" />
              ) : (
                <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl sm:rounded-2xl bg-blue-500/10 text-xs sm:text-sm font-bold text-blue-400 ring-1 ring-blue-500/20">
                  {initials}
                </div>
              )}
              <div>
                <a
                  href={`/search?q=${encodeURIComponent(note.uploader_name ?? note.user_id ?? "")}`}
                  className="inline-flex items-center gap-1 text-[13px] font-semibold text-blue-400 hover:underline transition-colors"
                >
                  {note.uploader_name ?? note.user_id?.slice(0, 16)}
                  {note.is_verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-blue-400" />}
                </a>
                <p className="text-[10px] text-slate-500">Tap to view profile</p>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1.5 block">
                Title
              </label>
              <p className="text-[15px] font-semibold text-slate-100 leading-relaxed">
                {note.title}
              </p>
            </div>

            {/* Subject */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1.5 block">
                Subject
              </label>
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${color?.dot ?? "bg-slate-500"}`}
                />
                <span
                  className={`text-[13px] font-medium ${color?.text ?? "text-slate-300"}`}
                >
                  {note.subject}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl p-4 text-center" style={{ background: "var(--ax-surface-3)", border: "1px solid var(--ax-border)" }}>
                <p className="text-2xl font-bold" style={{ color: "var(--ax-text-primary)" }}>
                  {note.views_count ?? 0}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--ax-text-faint)" }}>Views</p>
              </div>
              <div className="rounded-2xl p-4 text-center" style={{ background: "var(--ax-surface-3)", border: "1px solid var(--ax-border)" }}>
                <p className="text-2xl font-bold" style={{ color: "var(--ax-text-primary)" }}>
                  {note.downloads_count ?? 0}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--ax-text-faint)" }}>Downloads</p>
              </div>
              <div className="rounded-2xl p-4 text-center" style={{ background: "var(--ax-surface-3)", border: "1px solid var(--ax-border)" }}>
                <p className="text-2xl font-bold" style={{ color: "var(--ax-text-primary)" }}>
                  {note.avg_rating ? note.avg_rating.toFixed(1) : "--"}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--ax-text-faint)" }}>Rating</p>
              </div>
            </div>

            {/* Your rating */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2 block">
                Rate this note
              </label>
              <StarRow
                value={userRating}
                onRate={(s) => rate(note.id, s)}
                disabled={!userId || busy}
                size={20}
              />
            </div>

            {/* Date */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1 block">
                Published
              </label>
              <p className="text-[13px] text-slate-400">
                {note.created_at
                  ? new Date(note.created_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                  : "Unknown"}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="p-5 space-y-2.5" style={{ borderTop: "1px solid var(--ax-border)" }}>
            <button
              onClick={toggleBookmark}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition-all border ${isBookmarked ? "border-rose-500/50 bg-rose-500/10 text-rose-400" : "border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-700 hover:bg-slate-800"}`}
            >
              <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} /> {isBookmarked ? "Bookmarked" : "Bookmark Note"}
            </button>
            <button
              onClick={() => { onDownload(); onClose(); }}
              className="ax-btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold"
            >
              <Download className="h-4 w-4" /> Download File
            </button>
            <a
              href={note.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ax-btn-ghost flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-xs font-medium"
            >
              Open in New Tab
            </a>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const { userId } = useUser();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("All");
  const [sortBy, setSortBy] = useState<"recent" | "views" | "rating">("recent");
  const [showFilters, setFilters] = useState(false);
  const [detail, setDetail] = useState<Note | null>(null);
  const { ratings, rate, busy } = useRating(userId, setNotes);
  const { bookmarks, toggleBookmark } = useBookmarks(userId);
  const { viewedNotes, downloadedNotes, markViewed, markDownloaded } = useTrackedInteractions(userId);
  const [visibleCount, setVisibleCount] = useState(12);
  const NOTES_PER_PAGE = 12;

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("notes")
        .select(
          "id, user_id, uploader_name, title, subject, file_url, storage_path, downloads_count, avg_rating, created_at, views_count",
        );
      // Sort order
      if (sortBy === "views") q = q.order("views_count", { ascending: false });
      else if (sortBy === "rating") q = q.order("avg_rating", { ascending: false, nullsFirst: false });
      else q = q.order("created_at", { ascending: false });
      if (subject !== "All") q = q.eq("subject", subject);
      if (search.trim())
        q = q.or(`title.ilike.%${search}%,subject.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) {
        console.error("[Explore]", error.message);
      } else {
        const rawNotes = (data as Note[]) ?? [];
        if (rawNotes.length > 0) {
          const uids = Array.from(new Set(rawNotes.map((n) => n.user_id)));
          const { data: profs } = await supabase.from("user_profiles").select("id, display_name, avatar_url, is_verified").in("id", uids);
          const pMap = new Map((profs || []).map((p: any) => [p.id, p]));
          const enriched = rawNotes.map((n) => {
            const p: any = pMap.get(n.user_id);
            return {
              ...n,
              uploader_name: p?.display_name || n.uploader_name,
              uploader_avatar: p?.avatar_url,
              is_verified: p?.is_verified ?? false,
            };
          });
          setNotes(enriched);
        } else {
          setNotes([]);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [search, subject, sortBy]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  function handleView(note: Note) {
    if (userId && !viewedNotes.has(note.id)) {
      logUniqueView(note.id, userId);
      const updated = { ...note, views_count: (note.views_count ?? 0) + 1 };
      setDetail(updated);
      setNotes((p) =>
        p.map((n) =>
          n.id === note.id ? updated : n,
        ),
      );
      markViewed(note.id);
    } else {
      setDetail(note);
    }
  }

  function handleDownload(note: Note) {
    window.open(note.file_url, "_blank");
    if (userId && !downloadedNotes.has(note.id)) {
      logUniqueDownload(note.id, userId);
      // Optimistic increment only if first download
      setNotes((p) =>
        p.map((n) =>
          n.id === note.id
            ? { ...n, downloads_count: (n.downloads_count ?? 0) + 1 }
            : n,
        ),
      );
      markDownloaded(note.id);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight ax-gradient-text-warm">
            Explore
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--ax-text-secondary)" }}>
            Discover study materials shared by the community
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-500" style={{ top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or subject..."
              className="ax-input flex h-10 w-full rounded-2xl border border-slate-700 bg-slate-800/50 !pl-10 pr-10 text-sm text-slate-200 placeholder:text-slate-500 hover:border-blue-500/40 focus:border-blue-500 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all sm:w-64"
            />

            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 rounded-full p-0.5 text-slate-500 hover:bg-slate-700 hover:text-slate-300 transition"
                style={{ top: "50%", transform: "translateY(-50%)" }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setFilters((v) => !v)}
            className={`flex h-10 items-center gap-1.5 rounded-2xl border px-4 text-xs font-semibold transition-all
              ${showFilters ? "border-blue-500/30 bg-blue-500/10 text-blue-400" : "border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200"}`}
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${showFilters ? "rotate-180" : ""}`}
            />{" "}
            Subjects
          </button>
        </div>
      </div>

      {/* Quick-access category chips + Sort */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {["All", ...SUBJECTS.slice(1, 6)].map((s) => {
            const c = SUBJECT_COLOR[s];
            const isActive = subject === s;
            return (
              <button
                key={s}
                onClick={() => setSubject(s)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all
                  ${isActive
                    ? "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30 shadow-sm shadow-blue-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-[var(--ax-surface-hover)]"}`}
              >
                {c && <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />}
                {s === "All" ? "All Subjects" : s}
              </button>
            );
          })}
          {subject !== "All" && !SUBJECTS.slice(0, 6).includes(subject) && (
            <span className="flex items-center gap-1.5 rounded-full bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30 px-3 py-1.5 text-[11px] font-semibold">
              <span className={`h-1.5 w-1.5 rounded-full ${SUBJECT_COLOR[subject]?.dot ?? "bg-slate-400"}`} />
              {subject}
              <button onClick={() => setSubject("All")} className="ml-0.5 hover:text-white"><X className="h-3 w-3" /></button>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <ArrowDownUp className="h-3.5 w-3.5" style={{ color: "var(--ax-text-faint)" }} />
          {([
            { key: "recent" as const, label: "Recent", icon: Clock },
            { key: "views" as const, label: "Most Viewed", icon: TrendingUp },
            { key: "rating" as const, label: "Top Rated", icon: Star },
          ]).map(({ key, label, icon: SIcon }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all
                ${sortBy === key
                  ? "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20"
                  : "text-slate-500 hover:text-slate-300 hover:bg-[var(--ax-surface-hover)]"}`}
            >
              <SIcon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Subject chips */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 py-1">
              {SUBJECTS.map((s) => {
                const c = SUBJECT_COLOR[s];
                return (
                  <button
                    key={s}
                    onClick={() => setSubject(s)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all
                      ${subject === s
                        ? "border-blue-500/30 bg-blue-500/10 text-blue-400 shadow-sm shadow-blue-500/10"
                        : "border-slate-700 bg-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                      }`}
                  >
                    {c && (
                      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                    )}
                    {s}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && (
        <p className="text-[11px] text-slate-500 font-medium">
          {notes.length} result{notes.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--ax-border)", background: "var(--ax-surface-2)" }}>
              <div className="h-36 ax-skeleton" />
              <div className="p-4 space-y-3">
                <div className="h-2 w-1/3 ax-skeleton" />
                <div className="h-3 w-2/3 ax-skeleton" />
                <div className="h-2 w-1/4 ax-skeleton" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && notes.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center py-28 text-center"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl" style={{ background: "var(--ax-surface-3)", border: "1px solid var(--ax-border)" }}>
            <Compass className="h-7 w-7" style={{ color: "var(--ax-text-faint)" }} />
          </div>
          <p className="text-lg font-semibold" style={{ color: "var(--ax-text-primary)" }}>No notes found</p>
          <p className="mt-1 text-sm" style={{ color: "var(--ax-text-muted)" }}>
            Try adjusting your search or filters
          </p>
        </motion.div>
      )}

      {/* ── Cards Grid ── */}
      {!loading && notes.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {notes.slice(0, visibleCount).map((note, i) => {
              const color = SUBJECT_COLOR[note.subject];
              const nameStr = note.uploader_name || "Unknown User";
              const initials = nameStr.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
              const dl = note.downloads_count ?? 0;
              const avgR = note.avg_rating ?? 0;
              return (
                <motion.div
                  key={note.id}
                  layoutId={note.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, type: "spring", damping: 20 }}
                  whileHover={{ y: -4 }}
                  className="ax-card group flex flex-col overflow-hidden border-b-4"
                  style={{ borderBottomColor: color?.dot ? `var(--${color.dot.replace('bg-', '')})` : "var(--ax-border-light)" }}
                >
                  {/* ── PDF Thumbnail ── */}
                  <div
                    className="relative h-36 cursor-pointer overflow-hidden"
                    onClick={() => handleView(note)}
                  >
                    <PdfThumbnail
                      url={note.file_url}
                      className="h-full w-full"
                      accentColor={color?.text ?? "text-slate-500"}
                      gradientClass="from-black/40 to-transparent"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-linear-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <motion.span
                        whileHover={{ scale: 1.05 }}
                        className="flex items-center gap-1.5 rounded-full bg-slate-800 px-5 py-2 text-xs font-bold text-white shadow-xl"
                      >
                        <Eye className="h-3.5 w-3.5" /> Preview
                      </motion.span>
                    </div>
                    {/* Bookmark Button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleBookmark(note.id); }}
                      className={`absolute top-3 right-3 z-10 p-2 rounded-xl backdrop-blur-md transition-all ${bookmarks.has(note.id) ? "bg-rose-500/90 text-white shadow-lg shadow-rose-500/30 ring-1 ring-rose-400" : "bg-black/40 text-slate-300 hover:bg-black/60 ring-1 ring-white/10 opacity-0 group-hover:opacity-100"}`}
                    >
                      <Bookmark className={`h-4 w-4 ${bookmarks.has(note.id) ? "fill-current" : ""}`} />
                    </button>
                  </div>

                  {/* ── Body ── */}
                  <div className="flex flex-1 flex-col p-4">
                    {/* Subject */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${color?.dot ?? "bg-slate-500"}`}
                      />
                      <span
                        className={`text-[10px] font-bold uppercase tracking-[0.15em] ${color?.text ?? "text-slate-400"}`}
                      >
                        {note.subject}
                      </span>
                    </div>

                    {/* Title */}
                    <h3
                      className="line-clamp-2 text-[13px] font-semibold leading-snug cursor-pointer hover:text-amber-400 transition-colors"
                      style={{ color: "var(--ax-text-primary)" }}
                      onClick={() => handleView(note)}
                    >
                      {note.title}
                    </h3>

                    {/* Inline rating */}
                    {avgR > 0 && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <StarRow value={Math.round(avgR)} disabled size={11} />
                        <span className="text-[10px] font-semibold text-amber-400/80">
                          {avgR.toFixed(1)}
                        </span>
                      </div>
                    )}

                    {/* Meta */}
                    <div className="mt-auto pt-3 flex items-center gap-2" style={{ borderTop: "1px solid var(--ax-border)" }}>
                      {note.uploader_avatar ? (
                        <img src={note.uploader_avatar} alt={nameStr} className="h-5 w-5 rounded-md object-cover" />
                      ) : (
                        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/10 text-[9px] font-bold text-amber-400">
                          {initials}
                        </div>
                      )}
                      <span className="flex items-center gap-1 flex-1 truncate text-[10px]" style={{ color: "var(--ax-text-faint)" }}>
                        {note.uploader_name ?? note.user_id?.slice(0, 12)}
                        {note.is_verified && <BadgeCheck className="h-3 w-3 shrink-0 text-blue-400" />}
                      </span>
                      <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--ax-text-faint)" }}>
                        <span className="flex items-center gap-0.5" title="Views">
                          <Eye className="h-2.5 w-2.5" />
                          {note.views_count ?? 0}
                        </span>
                        <span className="flex items-center gap-0.5" title="Downloads">
                          <Download className="h-2.5 w-2.5" />
                          {dl}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action bar */}
                  <div className="flex" style={{ borderTop: "1px solid var(--ax-border)" }}>
                    <button
                      onClick={() => handleView(note)}
                      className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-all hover:bg-[var(--ax-surface-hover)] hover:text-amber-400"
                      style={{ color: "var(--ax-text-muted)", borderRight: "1px solid var(--ax-border)" }}
                    >
                      <Eye className="h-3 w-3" /> Preview
                    </button>
                    <button
                      onClick={() => handleDownload(note)}
                      className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-all hover:bg-[var(--ax-surface-hover)] hover:text-amber-400"
                      style={{ color: "var(--ax-text-muted)" }}
                    >
                      <Download className="h-3 w-3" /> Download
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Load More */}
          {visibleCount < notes.length && (
            <div className="flex flex-col items-center gap-2 pt-6">
              <p className="text-[11px] text-slate-500">Showing {Math.min(visibleCount, notes.length)} of {notes.length} notes</p>
              <button
                onClick={() => setVisibleCount((c) => c + NOTES_PER_PAGE)}
                className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-6 py-2.5 text-sm font-semibold text-amber-400 transition-all hover:bg-amber-500/20 hover:shadow-[0_0_15px_rgba(245,158,11,0.15)]"
              >
                Load More Notes
              </button>
            </div>
          )}
          {visibleCount >= notes.length && notes.length > NOTES_PER_PAGE && (
            <p className="text-center text-[11px] text-slate-600 pt-4">All {notes.length} notes shown</p>
          )}
        </>
      )}

      <AnimatePresence>
        {detail && (
          <DetailModal
            note={detail}
            userId={userId ?? null}
            onClose={() => setDetail(null)}
            rate={rate}
            userRating={
              ratings[detail.id] ?? Math.round(detail.avg_rating ?? 0)
            }
            busy={busy === detail.id}
            isBookmarked={bookmarks.has(detail.id)}
            toggleBookmark={() => toggleBookmark(detail.id)}
            onDownload={() => handleDownload(detail)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
