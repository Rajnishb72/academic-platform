"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Download, Star, Eye, FileText, Loader2, Users, X, ExternalLink,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RankedNote {
  id: string;
  title: string;
  subject: string;
  file_url: string;
  uploader_name: string | null;
  user_id: string;
  downloads_count: number;
  avg_rating: number | null;
  metric: number;
}

interface Contributor {
  user_id: string;
  uploader_name: string | null;
  count: number;
}

type TabKey = "viewed" | "downloaded" | "rated" | "contributor";

const TABS: { key: TabKey; label: string; icon: typeof Eye }[] = [
  { key: "viewed", label: "Top Viewed", icon: Eye },
  { key: "downloaded", label: "Top Downloaded", icon: Download },
  { key: "rated", label: "Top Rated", icon: Star },
  { key: "contributor", label: "Top Contributor", icon: Users },
];

const BADGE: Record<string, string> = {
  "Artificial Intelligence": "bg-violet-500/10 text-violet-400 border-violet-500/20",
  "Information & Network Security": "bg-red-500/10 text-red-400 border-red-500/20",
  "Linux Server Administration": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "Game Programming": "bg-pink-500/10 text-pink-400 border-pink-500/20",
  "Project Management": "bg-teal-500/10 text-teal-400 border-teal-500/20",
  "Data Science": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Cloud Computing and Web Services": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "Information Retrieval": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  "Ethical Hacking": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Customer Relationship Management": "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

const RANK_STYLE = (i: number) =>
  i === 0 ? "bg-amber-500/15 text-amber-500 shadow-sm shadow-amber-500/20 ring-1 ring-amber-500/30" :
    i === 1 ? "bg-slate-300 text-slate-700 shadow-sm ring-1 ring-slate-400" :
      i === 2 ? "bg-orange-500/15 text-orange-400 shadow-sm shadow-orange-500/20 ring-1 ring-orange-500/30" :
        "bg-slate-800/50 text-slate-500 ring-1 ring-slate-700/50";

// ─── Note Preview Modal ───────────────────────────────────────────────────────

function PreviewModal({ note, onClose }: { note: RankedNote; onClose: () => void }) {
  const bc = BADGE[note.subject] ?? "bg-slate-800/50 text-slate-300 border-slate-700";
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 30 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="flex h-[88vh] w-full max-w-[1100px] overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40"
      >
        {/* PDF viewer */}
        <div className="flex-1 min-w-0 bg-slate-950">
          <iframe src={`${note.file_url}#view=FitH&toolbar=0`} title={note.title} width="100%" height="100%" className="border-0" />
        </div>
        {/* Info panel */}
        <div className="flex w-[300px] shrink-0 flex-col border-l border-slate-800/50 bg-slate-900/50">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/50">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Note Info</span>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1">Title</p>
              <p className="text-[15px] font-semibold text-slate-100 leading-relaxed">{note.title}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1.5">Subject</p>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${bc}`}>{note.subject}</span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1">Contributor</p>
              <Link
                href={`/search?q=${encodeURIComponent(note.uploader_name ?? note.user_id)}`}
                className="text-[13px] font-semibold text-blue-400 hover:underline"
                onClick={onClose}
              >
                {note.uploader_name ?? note.user_id.slice(0, 16)}
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-800/50 p-3 ring-1 ring-slate-700 text-center">
                <p className="text-xl font-bold text-slate-100">{note.downloads_count ?? 0}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Downloads</p>
              </div>
              <div className="rounded-2xl bg-slate-800/50 p-3 ring-1 ring-slate-700 text-center">
                <p className="text-xl font-bold text-slate-100">{note.avg_rating ? note.avg_rating.toFixed(1) : "--"}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Rating</p>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800/50 p-4 space-y-2">
            <a
              href={note.file_url} download target="_blank" rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 transition"
            >
              <Download className="h-4 w-4" /> Download
            </a>
            <a
              href={note.file_url} target="_blank" rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 py-2.5 text-xs font-medium text-slate-400 ring-1 ring-slate-700 hover:bg-slate-700 hover:text-slate-200 transition"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open in New Tab
            </a>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-800/50 p-4 animate-pulse">
          <div className="h-8 w-8 rounded-full bg-slate-700" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 rounded bg-slate-700" />
            <div className="h-2 w-1/3 rounded bg-slate-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RankingPage() {
  const [tab, setTab] = useState<TabKey>("downloaded");
  const [notes, setNotes] = useState<RankedNote[]>([]);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<RankedNote | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setNotes([]); setContributors([]);
      try {
        if (tab === "contributor") {
          const { data, error } = await supabase
            .from("notes")
            .select("user_id, uploader_name");
          if (error) { console.error("[Ranking] Contributor:", error.message); return; }
          const map = new Map<string, { name: string | null; count: number }>();
          ((data ?? []) as { user_id: string; uploader_name: string | null }[]).forEach((r) => {
            const e = map.get(r.user_id);
            if (e) e.count++;
            else map.set(r.user_id, { name: r.uploader_name, count: 1 });
          });
          setContributors(
            Array.from(map.entries())
              .map(([user_id, { name, count }]) => ({ user_id, uploader_name: name, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 10),
          );
        } else if (tab === "viewed") {
          const { data: interactions, error } = await supabase
            .from("library_interactions")
            .select("note_id, notes ( id, title, subject, file_url, uploader_name, user_id, downloads_count, avg_rating )")
            .eq("interaction_type", "view");
          if (error) { console.error("[Ranking] Views:", error.message); return; }
          const viewCounts = new Map<string, { note: RankedNote; count: number }>();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const row of (interactions ?? []) as any[]) {
            const noteObj = Array.isArray(row.notes) ? row.notes[0] : row.notes;
            if (!noteObj) continue;
            const noteId = row.note_id as string;
            const existing = viewCounts.get(noteId);
            if (existing) existing.count++;
            else viewCounts.set(noteId, { note: { ...noteObj, downloads_count: noteObj.downloads_count ?? 0 }, count: 1 });
          }
          setNotes(
            Array.from(viewCounts.values())
              .map(({ note, count }) => ({ ...note, metric: count }))
              .sort((a, b) => b.metric - a.metric)
              .slice(0, 10),
          );
        } else if (tab === "downloaded") {
          const { data, error } = await supabase
            .from("notes")
            .select("id, title, subject, file_url, uploader_name, user_id, downloads_count, avg_rating")
            .order("downloads_count", { ascending: false })
            .limit(10);
          if (error) { console.error("[Ranking] Downloads:", error.message); return; }
          setNotes(((data ?? []) as RankedNote[]).map((n) => ({ ...n, downloads_count: n.downloads_count ?? 0, metric: n.downloads_count ?? 0 })));
        } else {
          const { data, error } = await supabase
            .from("notes")
            .select("id, title, subject, file_url, uploader_name, user_id, downloads_count, avg_rating")
            .not("avg_rating", "is", null).gt("avg_rating", 0)
            .order("avg_rating", { ascending: false })
            .limit(10);
          if (error) { console.error("[Ranking] Rated:", error.message); return; }
          setNotes(((data ?? []) as RankedNote[]).map((n) => ({ ...n, downloads_count: n.downloads_count ?? 0, metric: n.avg_rating ?? 0 })));
        }
      } finally { setLoading(false); }
    }
    load();
  }, [tab]);

  const metricLabel = (t: TabKey) => t === "viewed" ? "views" : t === "downloaded" ? "downloads" : t === "rated" ? "rating" : "";
  const metricIcon = (t: TabKey) =>
    t === "viewed" ? <Eye className="h-4 w-4 text-blue-400" /> :
      t === "downloaded" ? <Download className="h-4 w-4 text-emerald-400" /> :
        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />;
  const metricValue = (note: RankedNote, t: TabKey) => t === "rated" ? note.metric.toFixed(1) : String(note.metric);

  const top3Notes = notes.slice(0, 3);
  const restNotes = notes.slice(3, 10);
  const top3Contribs = contributors.slice(0, 3);
  const restContribs = contributors.slice(3, 10);

  // Helper for podium visual scales and colors
  const PODIUM_STYLE = (r: number) => {
    if (r === 1) return { h: "h-56 sm:h-64", color: "bg-amber-500/15 border-amber-500/30 text-amber-500 shadow-amber-500/20", badge: "bg-amber-500 text-white" };
    if (r === 2) return { h: "h-48 sm:h-56", color: "bg-slate-300/10 border-slate-400/30 text-slate-300 shadow-slate-300/10", badge: "bg-slate-300 text-slate-800" };
    return { h: "h-40 sm:h-48", color: "bg-orange-500/10 border-orange-500/30 text-orange-400 shadow-orange-500/10", badge: "bg-orange-500 text-white" };
  };

  const PodiumNote = ({ note, rank }: { note: RankedNote; rank: number }) => {
    const st = PODIUM_STYLE(rank);
    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * rank, type: "spring", damping: 20 }}
        onClick={() => setPreview(note)}
        className={`relative flex flex-col items-center justify-end rounded-t-3xl border border-b-0 p-4 w-full max-w-[180px] shrink-0 transition hover:brightness-110 cursor-pointer shadow-lg ${st.color} ${st.h}`}
      >
        <div className={`absolute -top-6 flex h-12 w-12 items-center justify-center rounded-full text-lg font-black shadow-lg ring-4 ring-slate-900 ${st.badge}`}>
          #{rank}
        </div>
        <div className="w-full text-center space-y-2 z-10">
          <h3 className="line-clamp-2 text-[13px] font-bold text-slate-100">{note.title}</h3>
          <p className="text-[10px] text-slate-400 truncate">by {note.uploader_name ?? note.user_id.slice(0, 8)}</p>
          <div className="flex flex-col items-center justify-center rounded-xl bg-slate-950/60 p-2 border border-black/30 backdrop-blur-sm shadow-inner">
            <span className="text-xl font-black">{metricValue(note, tab)}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 text-slate-300">{metricLabel(tab)}</span>
          </div>
        </div>
        {/* Subtle ground reflection */}
        <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-black/40 to-transparent pointer-events-none rounded-t-lg" />
      </motion.div>
    );
  };

  const PodiumContrib = ({ c, rank }: { c: Contributor; rank: number }) => {
    const st = PODIUM_STYLE(rank);
    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * rank, type: "spring", damping: 20 }}
        className={`relative flex flex-col items-center justify-end rounded-t-3xl border border-b-0 p-4 w-full max-w-[180px] shrink-0 shadow-lg ${st.color} ${st.h}`}
      >
        <div className={`absolute -top-6 flex h-12 w-12 items-center justify-center rounded-full text-lg font-black shadow-lg ring-4 ring-slate-900 ${st.badge}`}>
          #{rank}
        </div>
        <div className="w-full text-center space-y-2 z-10">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-sm font-bold text-blue-400 ring-1 ring-blue-500/30 mb-2">
            {(c.uploader_name ?? c.user_id).slice(0, 1).toUpperCase()}
          </div>
          <h3 className="truncate text-[13px] font-bold text-slate-100"><Link href={`/search?q=${encodeURIComponent(c.uploader_name ?? c.user_id)}`} className="hover:underline">{c.uploader_name ?? c.user_id.slice(0, 12)}</Link></h3>
          <div className="flex flex-col items-center justify-center rounded-xl bg-slate-950/60 p-2 border border-black/30 backdrop-blur-sm shadow-inner mt-2">
            <span className="text-xl font-black">{c.count}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 text-slate-300">notes</span>
          </div>
        </div>
        <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-black/40 to-transparent pointer-events-none rounded-t-lg" />
      </motion.div>
    );
  };


  return (
    <div className="mx-auto max-w-5xl w-full overflow-x-hidden space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 ring-1 ring-amber-500/30">
          <Trophy className="h-6 w-6 text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Leaderboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">Top notes and contributors — competing for glory</p>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* Top Navigation */}
        <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-slate-800/50">
          {TABS.map(({ key, label, icon: Icon }) => {
            const isActive = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200
                  ${isActive
                    ? "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30 shadow-sm shadow-blue-500/10"
                    : "bg-slate-900/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent"}`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? "text-blue-400" : "text-slate-500"}`} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">

          {loading && <Skeleton />}

          {!loading && notes.length === 0 && contributors.length === 0 && (
            <div className="flex flex-col items-center py-20 text-center">
              <Trophy className="mb-3 h-12 w-12 text-slate-700" />
              <p className="font-medium text-slate-400">No data yet</p>
              <p className="mt-1 text-sm text-slate-500">Rankings appear when notes get activity</p>
            </div>
          )}

          {/* ── Podium Display for Top 3 ── */}
          {!loading && (top3Notes.length > 0 || top3Contribs.length > 0) && (
            <div className="relative pt-12 pb-4 px-4 flex items-end justify-center gap-3 sm:gap-6 border-b-2 border-slate-800 mb-8 overflow-x-auto">
              {/* Rank 2 (Left) */}
              {tab !== "contributor" ? (top3Notes[1] && <PodiumNote note={top3Notes[1]} rank={2} />) : (top3Contribs[1] && <PodiumContrib c={top3Contribs[1]} rank={2} />)}

              {/* Rank 1 (Center) */}
              {tab !== "contributor" ? (top3Notes[0] && <PodiumNote note={top3Notes[0]} rank={1} />) : (top3Contribs[0] && <PodiumContrib c={top3Contribs[0]} rank={1} />)}

              {/* Rank 3 (Right) */}
              {tab !== "contributor" ? (top3Notes[2] && <PodiumNote note={top3Notes[2]} rank={3} />) : (top3Contribs[2] && <PodiumContrib c={top3Contribs[2]} rank={3} />)}
            </div>
          )}

          {/* ── List Display for Ranks 4-10 ── */}
          {!loading && tab !== "contributor" && restNotes.length > 0 && (
            <div className="space-y-2.5 max-w-3xl mx-auto">
              {restNotes.map((note, idx) => {
                const i = idx + 3; // Rank 4 onwards
                const bc = BADGE[note.subject] ?? "bg-slate-800/50 text-slate-300 border-slate-700";
                return (
                  <motion.button
                    key={note.id} onClick={() => setPreview(note)}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="w-full flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-3 pt-3 pb-3 text-left transition hover:border-blue-500/40 hover:shadow-md hover:bg-slate-800/70 cursor-pointer"
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${RANK_STYLE(i)}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="truncate text-[13px] font-semibold text-slate-100 group-hover:text-blue-400">{note.title}</h3>
                      <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-medium ${bc}`}>{note.subject}</span>
                        {(note.uploader_name || note.user_id) && (
                          <span className="text-[10px] text-slate-500">by {note.uploader_name ?? note.user_id.slice(0, 12)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-800">
                      {metricIcon(tab)}
                      <span className="text-sm font-bold text-slate-200">{metricValue(note, tab)}</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}

          {!loading && tab === "contributor" && restContribs.length > 0 && (
            <div className="space-y-2.5 max-w-3xl mx-auto">
              {restContribs.map((c, idx) => {
                const i = idx + 3; // Rank 4 onwards
                return (
                  <motion.div
                    key={c.user_id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-3 transition hover:border-blue-500/40 hover:bg-slate-800/70"
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${RANK_STYLE(i)}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold text-blue-400">
                        {(c.uploader_name ?? c.user_id).slice(0, 1).toUpperCase()}
                      </div>
                      <Link
                        href={`/search?q=${encodeURIComponent(c.uploader_name ?? c.user_id)}`}
                        className="truncate text-[13px] font-semibold text-blue-400 hover:underline"
                      >
                        {c.uploader_name ?? c.user_id.slice(0, 20)}
                      </Link>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-800">
                      <FileText className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-sm font-bold text-slate-200">{c.count}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Preview Modal */}
          <AnimatePresence>
            {preview && <PreviewModal note={preview} onClose={() => setPreview(null)} />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
