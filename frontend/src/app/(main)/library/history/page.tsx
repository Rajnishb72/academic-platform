"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@/hooks/useUser";
import { motion, AnimatePresence } from "framer-motion";
import {
  History, Eye, Download, FileText, Clock, X, ExternalLink, Star, Loader2, Bookmark
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Interaction {
  id: string;
  interaction_type: "view" | "download" | "rate" | "bookmark";
  created_at: string;
  rating: number | null;
  notes: {
    id: string;
    title: string;
    subject: string;
    file_url: string;
    uploader_name: string | null;
    user_id: string;
  } | null;
}

interface HistoryItem {
  noteId: string;
  title: string;
  subject: string;
  fileUrl: string;
  uploaderName: string | null;
  uploaderId: string;
  type: string;
  time: string;
  rating: number | null;
}

const SUBJECT_COLOR: Record<string, { dot: string; text: string }> = {
  "Artificial Intelligence": { dot: "bg-violet-400", text: "text-violet-400" },
  "Information & Network Security": { dot: "bg-rose-400", text: "text-rose-400" },
  "Linux Server Administration": { dot: "bg-orange-400", text: "text-orange-400" },
  "Game Programming": { dot: "bg-pink-400", text: "text-pink-400" },
  "Project Management": { dot: "bg-teal-400", text: "text-teal-400" },
  "Data Science": { dot: "bg-sky-400", text: "text-sky-400" },
  "Cloud Computing and Web Services": { dot: "bg-cyan-400", text: "text-cyan-400" },
  "Information Retrieval": { dot: "bg-indigo-400", text: "text-indigo-400" },
  "Ethical Hacking": { dot: "bg-emerald-400", text: "text-emerald-400" },
  "Customer Relationship Management": { dot: "bg-amber-400", text: "text-amber-400" },
};

type FilterKey = "all" | "view" | "download" | "rate" | "bookmark";
const FILTERS: { key: FilterKey; label: string; icon: typeof Eye }[] = [
  { key: "all", label: "All Activity", icon: History },
  { key: "view", label: "Previewed", icon: Eye },
  { key: "download", label: "Downloaded", icon: Download },
  { key: "bookmark", label: "Bookmarked", icon: Bookmark },
  { key: "rate", label: "Rated", icon: Star },
];

function typeStyle(type: string) {
  if (type === "view") return { bg: "bg-blue-500/10", ring: "ring-blue-500/15", icon: <Eye className="h-4 w-4 text-blue-400" />, label: "Previewed", color: "text-blue-400" };
  if (type === "download") return { bg: "bg-emerald-500/10", ring: "ring-emerald-500/15", icon: <Download className="h-4 w-4 text-emerald-400" />, label: "Downloaded", color: "text-emerald-400" };
  if (type === "bookmark") return { bg: "bg-indigo-500/10", ring: "ring-indigo-500/15", icon: <Bookmark className="h-4 w-4 text-indigo-400" />, label: "Bookmarked", color: "text-indigo-400" };
  return { bg: "bg-amber-500/10", ring: "ring-amber-500/15", icon: <Star className="h-4 w-4 text-amber-400" />, label: "Rated", color: "text-amber-400" };
}

function groupByDate(items: HistoryItem[]): Record<string, HistoryItem[]> {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  return items.reduce<Record<string, HistoryItem[]>>((acc, item) => {
    const d = new Date(item.time);
    const label =
      d.toDateString() === today ? "Today" :
        d.toDateString() === yesterday ? "Yesterday" :
          d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    (acc[label] ??= []).push(item);
    return acc;
  }, {});
}

// ─── Preview Modal ─────────────────────────────────────────────────────────────

function PreviewModal({ item, onClose }: { item: HistoryItem; onClose: () => void }) {
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
        <div className="flex-1 min-w-0 bg-slate-950">
          <iframe src={`${item.fileUrl}#view=FitH&toolbar=0`} title={item.title} width="100%" height="100%" className="border-0" />
        </div>
        <div className="flex w-[280px] shrink-0 flex-col border-l border-slate-800/50 bg-slate-900/50">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/50">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">File Info</span>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 transition">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            {/* File name clearly labeled */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1">File Title</p>
              <p className="text-[14px] font-semibold text-slate-100 leading-snug">{item.title}</p>
            </div>
            {/* Subject */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1">Subject</p>
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${SUBJECT_COLOR[item.subject]?.dot ?? "bg-slate-500"}`} />
                <span className={`text-[12px] font-medium ${SUBJECT_COLOR[item.subject]?.text ?? "text-slate-400"}`}>{item.subject}</span>
              </div>
            </div>
            {/* Uploader — clearly labeled separately from filename */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1">Uploaded by</p>
              <p className="text-[13px] font-semibold text-slate-200">
                {item.uploaderName ?? item.uploaderId.slice(0, 16)}
              </p>
            </div>
          </div>
          <div className="border-t border-slate-800/50 p-4 space-y-2">
            <a
              href={item.fileUrl} download target="_blank" rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20 transition"
            >
              <Download className="h-4 w-4" /> Download
            </a>
            <a
              href={item.fileUrl} target="_blank" rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 ring-1 ring-slate-700 py-2 text-xs font-medium text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open in New Tab
            </a>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const { userId, isLoaded } = useUser();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [preview, setPreview] = useState<HistoryItem | null>(null);
  const isFetching = useRef(false);

  const fetchHistory = useCallback(async () => {
    if (!userId || isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    try {
      let q = supabase
        .from("library_interactions")
        .select("id, interaction_type, created_at, rating, notes ( id, title, subject, file_url, uploader_name, user_id )")
        .eq("user_id", String(userId))
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter !== "all") q = q.eq("interaction_type", filter);
      const { data, error } = await q;
      if (error) { console.error("[History]", error.message); setItems([]); }
      else {
        const raw = (data as unknown as Interaction[]) ?? [];
        setItems(
          raw.filter((r) => r.notes).map((r) => ({
            noteId: r.notes!.id,
            title: r.notes!.title,
            subject: r.notes!.subject,
            fileUrl: r.notes!.file_url,
            uploaderName: r.notes!.uploader_name,
            uploaderId: r.notes!.user_id,
            type: r.interaction_type,
            time: r.created_at,
            rating: r.rating,
          })),
        );
      }
    } finally { setLoading(false); isFetching.current = false; }
  }, [userId, filter]);

  useEffect(() => { if (isLoaded) fetchHistory(); }, [isLoaded, fetchHistory]);

  const grouped = groupByDate(items);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Activity</h1>
        <p className="text-sm text-slate-400 mt-0.5">Track your library interactions — click any row to preview</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
        {FILTERS.map(({ key, label, icon: Icon }) => (
          <button
            key={key} onClick={() => setFilter(key)}
            className={`relative flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold transition-all
              ${filter === key ? "text-blue-400" : "text-slate-400 hover:text-slate-200"}`}
          >
            {filter === key && (
              <motion.div layoutId="historyTab" className="absolute inset-0 rounded-full bg-blue-500/10 ring-1 ring-blue-500/20" transition={{ type: "spring", damping: 25, stiffness: 300 }} />
            )}
            <span className="relative flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /> {label}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-800/50 p-4 animate-pulse">
              <div className="h-10 w-10 rounded-xl bg-slate-700" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-2/3 rounded bg-slate-700" />
                <div className="h-2 w-1/3 rounded bg-slate-700" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center py-28 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-800/50 ring-1 ring-slate-700">
            <Clock className="h-7 w-7 text-slate-500" />
          </div>
          <p className="text-lg font-semibold text-slate-300">No activity yet</p>
          <p className="mt-1 text-sm text-slate-500">
            {filter === "all" ? "Preview or download notes to see your history here" : `No ${filter === "view" ? "preview" : filter} activity found`}
          </p>
        </motion.div>
      )}

      {/* Timeline */}
      {!loading && items.length > 0 && (
        <div className="space-y-7">
          {Object.entries(grouped).map(([date, dateItems]) => (
            <div key={date}>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3 pl-1">{date}</p>
              <div className="space-y-1.5">
                {dateItems.map((item, idx) => {
                  const style = typeStyle(item.type);
                  const color = SUBJECT_COLOR[item.subject];
                  const time = new Date(item.time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <motion.button
                      key={`${item.noteId}-${item.time}-${idx}`}
                      onClick={() => setPreview(item)}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03, type: "spring", damping: 20 }}
                      className="group w-full flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-3.5 text-left transition-all hover:border-slate-700 hover:bg-slate-800 cursor-pointer"
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.bg} ring-1 ${style.ring}`}>
                        {style.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* FILE TITLE — prominent */}
                        <p className="line-clamp-1 text-[13px] font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">
                          {item.title}
                        </p>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1">
                            <span className={`h-1.5 w-1.5 rounded-full ${color?.dot ?? "bg-slate-500"}`} />
                            <span className={`text-[10px] font-medium ${color?.text ?? "text-slate-400"}`}>{item.subject}</span>
                          </div>
                          <span className={`text-[10px] font-semibold ${style.color}`}>{style.label}</span>
                          {/* UPLOADER NAME — clearly separate from title */}
                          <span className="text-[10px] text-slate-500">
                            by {item.uploaderName ?? item.uploaderId.slice(0, 12)}
                          </span>
                          {item.type === "rate" && item.rating && (
                            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-400">
                              <Star className="h-2.5 w-2.5 fill-amber-400" /> {item.rating}/5
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-medium text-slate-500">{time}</span>
                        <FileText className="h-3.5 w-3.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      <AnimatePresence>
        {preview && <PreviewModal item={preview} onClose={() => setPreview(null)} />}
      </AnimatePresence>
    </div>
  );
}
