"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/hooks/useUser";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Download, Compass, Star, FileText, Loader2, Eye, Bookmark } from "lucide-react";
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

// ─── useRating (persistent + real-time) ───────────────────────────────────────

function useRating(userId: string | null | undefined, setNotes: React.Dispatch<React.SetStateAction<Note[]>>) {
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
        setRatings((r) => ({ ...r, [noteId]: stars }));
        setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, avg_rating: stars } : n)));
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

function StarRow({ value, onRate, disabled, size = 14 }: { value: number; onRate?: (s: number) => void; disabled?: boolean; size?: number; }) {
    const [hover, setHover] = useState(0);
    return (
        <div className="inline-flex items-center gap-px" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((s) => (
                <button
                    key={s} disabled={disabled} onMouseEnter={() => !disabled && setHover(s)}
                    onClick={(e) => { e.stopPropagation(); onRate?.(s); }}
                    className="p-[1px] transition-transform hover:scale-125 disabled:cursor-default"
                >
                    <Star style={{ width: size, height: size }} className={`transition-colors ${s <= (hover || value) ? "fill-amber-400 text-amber-400" : "text-slate-600"}`} />
                </button>
            ))}
        </div>
    );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({ note, userId, onClose, rate, userRating, busy, isBookmarked, toggleBookmark, onDownload }: any) {
    const color = SUBJECT_COLOR[note.subject];
    const nameStr = note.uploader_name || "Unknown User";
    const initials = nameStr.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md" onClick={onClose}>
            <motion.div initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 30 }} onClick={(e) => e.stopPropagation()} className="flex h-[88vh] w-full max-w-[1100px] overflow-hidden rounded-3xl shadow-2xl border border-slate-800 bg-slate-900">
                <div className="flex-1 min-w-0 bg-slate-950">
                    <iframe src={`${note.file_url}#view=FitH&toolbar=0`} title={note.title} width="100%" height="100%" className="border-0" />
                </div>
                <div className="flex w-[340px] shrink-0 flex-col border-l border-slate-800 bg-slate-900/50">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/50">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Note Info</span>
                        <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-400"><X className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                        <div className="flex items-center gap-3">
                            {note.uploader_avatar ? (
                                <img src={note.uploader_avatar} alt={nameStr} className="h-11 w-11 rounded-2xl object-cover ring-1 ring-white/10" />
                            ) : (
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-sm font-bold text-blue-400 ring-1 ring-blue-500/20">{initials}</div>
                            )}
                            <div>
                                <a href={`/search?q=${encodeURIComponent(note.uploader_name ?? note.user_id ?? "")}`} className="text-[13px] font-semibold text-blue-400 hover:underline">{note.uploader_name ?? note.user_id?.slice(0, 16)}</a>
                                <p className="text-[10px] text-slate-500">Tap to view profile</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1.5">Title</p>
                            <p className="text-[15px] font-semibold text-slate-100">{note.title}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1.5">Subject</p>
                            <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${color?.dot ?? "bg-slate-500"}`} />
                                <span className={`text-[13px] font-medium ${color?.text ?? "text-slate-300"}`}>{note.subject}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-xl bg-slate-800/50 p-3 ring-1 ring-slate-700 text-center">
                                <p className="text-xl font-bold text-slate-100">{note.views_count ?? 0}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">Views</p>
                            </div>
                            <div className="rounded-xl bg-slate-800/50 p-3 ring-1 ring-slate-700 text-center">
                                <p className="text-xl font-bold text-slate-100">{note.downloads_count ?? 0}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">Downloads</p>
                            </div>
                            <div className="rounded-xl bg-slate-800/50 p-3 ring-1 ring-slate-700 text-center">
                                <p className="text-xl font-bold text-slate-100">{note.avg_rating ? note.avg_rating.toFixed(1) : "--"}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">Rating</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">Rate this note</p>
                            <StarRow value={userRating} onRate={(s: number) => rate(note.id, s)} disabled={!userId || busy} size={20} />
                        </div>
                    </div>
                    <div className="p-5 space-y-2.5 border-t border-slate-800">
                        <button onClick={toggleBookmark} className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition-all border ${isBookmarked ? "border-rose-500/50 bg-rose-500/10 text-rose-400" : "border-slate-800 bg-slate-900/50 text-slate-300"}`}>
                            <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} /> {isBookmarked ? "Bookmarked" : "Bookmark Note"}
                        </button>
                        <button onClick={() => { onDownload(); onClose(); }} className="ax-btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold">
                            <Download className="h-4 w-4" /> Download File
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BookmarksPage() {
    const { userId } = useUser();
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState<Note | null>(null);
    const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
    const [busyBookmark, setBusyBookmark] = useState<string | null>(null);
    const [viewedNotes, setViewedNotes] = useState<Set<string>>(new Set());
    const [downloadedNotes, setDownloadedNotes] = useState<Set<string>>(new Set());

    const { ratings, rate, busy } = useRating(userId, setNotes);

    // Load user's existing view/download interactions
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

    const fetchBookmarks = useCallback(async () => {
        if (!userId) { setLoading(false); return; }
        setLoading(true);
        try {
            const bSet = await getUserBookmarks(userId);
            setBookmarks(bSet);
            if (bSet.size === 0) {
                setNotes([]);
                setLoading(false);
                return;
            }
            const ids = Array.from(bSet);
            const { data, error } = await supabase
                .from("notes")
                .select("id, user_id, uploader_name, title, subject, file_url, storage_path, downloads_count, avg_rating, created_at, views_count")
                .in("id", ids)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("[Bookmarks]", error.message);
            } else {
                const rawNotes = (data as Note[]) ?? [];
                if (rawNotes.length > 0) {
                    const uids = Array.from(new Set(rawNotes.map((n) => n.user_id)));
                    const { data: profs } = await supabase.from("user_profiles").select("id, display_name, avatar_url").in("id", uids);
                    const pMap = new Map((profs || []).map((p: any) => [p.id, p]));
                    const enriched = rawNotes.map((n) => {
                        const p: any = pMap.get(n.user_id);
                        return {
                            ...n,
                            uploader_name: p?.display_name || n.uploader_name,
                            uploader_avatar: p?.avatar_url,
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
    }, [userId]);

    useEffect(() => {
        fetchBookmarks();
    }, [fetchBookmarks]);

    async function toggleBookmarkLocal(noteId: string) {
        if (!userId || busyBookmark === noteId) return;
        setBusyBookmark(noteId);

        // Optimistic toggle
        const next = new Set(bookmarks);
        const wasBookmarked = next.has(noteId);
        if (wasBookmarked) {
            next.delete(noteId);
            // Also optimistically remove it from UI array immediately
            setNotes((prev) => prev.filter(n => n.id !== noteId));
            if (detail?.id === noteId) setDetail(null);
        } else {
            next.add(noteId);
        }
        setBookmarks(next);

        const isNowBookmarked = await toggleBookmarkServer(noteId, userId);

        if (isNowBookmarked !== !wasBookmarked) {
            // Revert UI on fail
            fetchBookmarks(); // Reload fully
        }
        setBusyBookmark(null);
    }

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
            setViewedNotes((prev) => new Set(prev).add(note.id));
        } else {
            setDetail(note);
        }
    }

    function handleDownload(note: Note) {
        window.open(note.file_url, "_blank");
        if (userId && !downloadedNotes.has(note.id)) {
            logUniqueDownload(note.id, userId);
            setNotes((p) =>
                p.map((n) =>
                    n.id === note.id ? { ...n, downloads_count: (n.downloads_count ?? 0) + 1 } : n,
                ),
            );
            setDownloadedNotes((prev) => new Set(prev).add(note.id));
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">My Bookmarks</h1>
                <p className="text-sm mt-0.5 text-slate-400">Notes you&apos;ve saved for quick access</p>
            </div>

            {!loading && (
                <p className="text-[11px] text-slate-500 font-medium">
                    {notes.length} result{notes.length !== 1 ? "s" : ""}
                </p>
            )}

            {/* Skeleton */}
            {loading && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/50">
                            <div className="h-36 animate-pulse bg-slate-800" />
                            <div className="p-4 space-y-3">
                                <div className="h-2 w-1/3 animate-pulse bg-slate-800" />
                                <div className="h-3 w-2/3 animate-pulse bg-slate-800" />
                                <div className="h-2 w-1/4 animate-pulse bg-slate-800" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && !userId && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center py-20 text-center">
                    <Bookmark className="mb-4 h-12 w-12 text-slate-700" />
                    <p className="text-sm font-semibold text-slate-300">Sign in to save bookmarks</p>
                </motion.div>
            )}

            {!loading && userId && notes.length === 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center py-20 text-center">
                    <Bookmark className="mb-4 h-12 w-12 text-slate-700" />
                    <p className="text-lg font-semibold text-slate-200">No bookmarks yet</p>
                    <p className="mt-1 text-sm text-slate-500">Tap the bookmark icon on any note in Explore to save it here</p>
                </motion.div>
            )}

            {/* Cards Grid */}
            {!loading && notes.length > 0 && (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {notes.map((note, i) => {
                        const color = SUBJECT_COLOR[note.subject];
                        const nameStr = note.uploader_name || "Unknown User";
                        const initials = nameStr.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
                        const dl = note.downloads_count ?? 0;
                        const avgR = note.avg_rating ?? 0;
                        return (
                            <motion.div
                                key={note.id}
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                                whileHover={{ y: -4 }}
                                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 shadow-md transition-all hover:border-slate-700 hover:shadow-xl border-b-4"
                                style={{ borderBottomColor: color?.dot ? `var(--${color.dot.replace('bg-', '')})` : "var(--ax-border-light)" }}
                            >
                                <div className="relative h-36 cursor-pointer overflow-hidden" onClick={() => handleView(note)}>
                                    <PdfThumbnail url={note.file_url} className="h-full w-full" accentColor={color?.text ?? "text-slate-500"} gradientClass="from-black/40 to-transparent" />
                                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                                        <span className="flex items-center gap-1.5 rounded-full bg-slate-800 px-5 py-2 text-xs font-bold text-white"><Eye className="h-3.5 w-3.5" /> Preview</span>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleBookmarkLocal(note.id); }}
                                        className="absolute top-3 right-3 z-10 p-2 rounded-xl backdrop-blur-md transition-all bg-rose-500/90 text-white shadow-lg shadow-rose-500/30 ring-1 ring-rose-400 hover:bg-rose-600"
                                    >
                                        <Bookmark className="h-4 w-4 fill-current" />
                                    </button>
                                </div>
                                <div className="flex flex-1 flex-col p-4">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <span className={`h-1.5 w-1.5 rounded-full ${color?.dot ?? "bg-slate-500"}`} />
                                        <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${color?.text ?? "text-slate-400"}`}>{note.subject}</span>
                                    </div>
                                    <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug cursor-pointer group-hover:text-amber-400 text-slate-100" onClick={() => handleView(note)}>
                                        {note.title}
                                    </h3>
                                    {avgR > 0 && (
                                        <div className="mt-2 flex items-center gap-1.5">
                                            <StarRow value={Math.round(avgR)} disabled size={11} />
                                            <span className="text-[10px] font-semibold text-amber-400/80">{avgR.toFixed(1)}</span>
                                        </div>
                                    )}
                                    <div className="mt-auto pt-3 flex items-center gap-2 border-t border-slate-800/50">
                                        {note.uploader_avatar ? (
                                            <img src={note.uploader_avatar} alt={nameStr} className="h-5 w-5 rounded-md object-cover" />
                                        ) : (
                                            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/10 text-[9px] font-bold text-amber-400">{initials}</div>
                                        )}
                                        <span className="flex-1 truncate text-[10px] text-slate-400">{note.uploader_name ?? note.user_id?.slice(0, 12)}</span>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                            <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" />{note.views_count ?? 0}</span>
                                            <span className="flex items-center gap-0.5"><Download className="h-2.5 w-2.5" />{dl}</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            <AnimatePresence>
                {detail && (
                    <DetailModal
                        note={detail} userId={userId ?? null} onClose={() => setDetail(null)} rate={rate}
                        userRating={ratings[detail.id] ?? Math.round(detail.avg_rating ?? 0)}
                        busy={busy === detail.id} isBookmarked={bookmarks.has(detail.id)}
                        toggleBookmark={() => toggleBookmarkLocal(detail.id)}
                        onDownload={() => handleDownload(detail)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
