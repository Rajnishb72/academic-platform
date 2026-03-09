"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@/hooks/useUser";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderHeart,
  FileText,
  Trash2,
  Pencil,
  Eye,
  UploadCloud,
  Loader2,
  X,
  CheckCircle2,
  ChevronDown,
  AlertCircle,
  Star,
  Download,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/client";
import { logUniqueView } from "@/lib/interactions";
import dynamic from "next/dynamic";
const PdfThumbnail = dynamic(() => import("@/components/PdfThumbnail"), { ssr: false, loading: () => <div className="h-full w-full bg-slate-800 animate-pulse" /> });

// ─── Types ────────────────────────────────────────────────────────────────────

interface Note {
  id: string;
  user_id: string;
  title: string;
  subject: string;
  file_url: string;
  storage_path: string;
  created_at: string | null;
  avg_rating: number | null;
  downloads_count: number | null;
}

const SUBJECTS = [
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

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.95 }}
      className={`fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-2xl border px-5 py-3.5 shadow-2xl backdrop-blur-xl
        ${ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-red-500/30 bg-red-500/10 text-red-400"}`}
    >
      {ok ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" />
      )}
      <span className="text-[13px] font-medium">{msg}</span>
    </motion.div>
  );
}

// ─── Delete Confirmation ──────────────────────────────────────────────────────

function DeleteModal({
  note,
  onConfirm,
  onCancel,
  loading,
}: {
  note: Note;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        transition={{ type: "spring", damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[380px] rounded-3xl border border-slate-800 bg-slate-900 p-7 shadow-2xl shadow-black/40"
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/20">
            <ShieldAlert className="h-6 w-6 text-red-500" />
          </div>
          <h3 className="text-[17px] font-bold text-slate-100 mb-1">
            Remove this note?
          </h3>
          <p className="text-[13px] text-slate-400 mb-2">
            This will permanently remove the file from storage and delete all
            associated data.
          </p>
          <div className="rounded-xl bg-slate-800/50 ring-1 ring-slate-700 px-4 py-2.5 mb-6 w-full">
            <p className="text-[13px] font-medium text-slate-300 line-clamp-2">
              {note.title}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{note.subject}</p>
          </div>
          <div className="flex w-full gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 rounded-2xl bg-slate-800 py-3 text-[13px] font-semibold text-slate-300 ring-1 ring-slate-700 hover:bg-slate-700 hover:text-slate-200 transition-all disabled:opacity-40"
            >
              Keep It
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-red-600 to-red-500 py-3 text-[13px] font-bold text-white shadow-lg shadow-red-900/20 hover:brightness-110 transition-all disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {loading ? "Removing..." : "Yes, Remove"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({
  note,
  onClose,
  onSaved,
}: {
  note: Note;
  onClose: () => void;
  onSaved: (u: Note) => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [subject, setSubject] = useState(note.subject);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function handleSave() {
    if (!title.trim() || saving) return;
    setSaving(true);
    setErr("");
    try {
      const db = createClient();
      const { error } = await db
        .from("notes")
        .update({ title: title.trim(), subject })
        .eq("id", note.id);
      if (error) {
        setErr(error.message);
        setSaving(false);
        return;
      }
      onSaved({ ...note, title: title.trim(), subject });
    } catch (e) {
      setErr(String(e));
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        transition={{ type: "spring", damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/95 p-7 shadow-2xl shadow-black/40 backdrop-blur-md"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[17px] font-bold text-slate-100">
              Edit Note Details
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Update the title and subject of your note
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1.5 block">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-[13px] text-slate-100 placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1.5 block">
              Subject
            </label>
            <div className="relative">
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 pr-9 text-[13px] text-slate-100 focus:border-blue-500/50 focus:outline-none transition-all"
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-2xl bg-slate-800/50 ring-1 ring-slate-700 p-3">
            <FileText className="h-4 w-4 text-slate-500" />
            <span className="text-[11px] text-slate-400">
              The uploaded file cannot be modified
            </span>
          </div>
          {err && <p className="text-xs text-red-500 font-medium">{err}</p>}
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl bg-slate-800 py-3 text-[13px] font-semibold text-slate-300 ring-1 ring-slate-700 hover:bg-slate-700 hover:text-slate-200 transition-all"
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-blue-600 to-blue-500 py-3 text-[13px] font-bold text-white shadow-lg shadow-blue-900/40 hover:brightness-110 disabled:opacity-40 transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Preview Modal ──────────────────────────────────────────────────────────

function PreviewModal({ note, onClose }: { note: Note; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 30 }}
        transition={{ type: "spring", damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40"
      >
        <div className="flex items-center justify-between border-b border-slate-800/50 px-6 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10">
              <FileText className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <h3 className="truncate text-[13px] font-semibold text-slate-100">
              {note.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 bg-slate-950">
          <iframe
            src={`${note.file_url}#view=FitH&toolbar=0`}
            title={note.title}
            width="100%"
            height="100%"
            className="border-0"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CollectionsPage() {
  const { userId, isLoaded } = useUser();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [deleteNote, setDeleteNote] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [previewNote, setPreview] = useState<Note | null>(null);
  const isFetching = useRef(false);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  const fetchNotes = useCallback(async () => {
    if (!userId || isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", String(userId))
        .order("created_at", { ascending: false });
      if (error) console.error("[Collections]", error.message);
      else setNotes((data as Note[]) ?? []);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [userId]);

  useEffect(() => {
    if (isLoaded) fetchNotes();
  }, [isLoaded, fetchNotes]);

  function handlePreview(note: Note) {
    setPreview(note);
    if (userId) logUniqueView(note.id, userId);
  }

  async function handleDelete() {
    if (!deleteNote) return;
    setDeleting(true);
    const note = deleteNote;
    const prev = [...notes];
    setNotes((ns) => ns.filter((n) => n.id !== note.id));
    try {
      const db = createClient();
      if (note.storage_path) {
        const { error: se } = await db.storage
          .from("notes")
          .remove([note.storage_path]);
        if (se)
          await supabase.storage.from("notes").remove([note.storage_path]);
      }
      let { error: de } = await db.from("notes").delete().eq("id", note.id);
      if (de) {
        const r = await supabase.from("notes").delete().eq("id", note.id);
        de = r.error;
      }
      if (de) {
        setNotes(prev);
        showToast("Failed to remove note", false);
      } else showToast("Note removed successfully", true);
    } catch {
      setNotes(prev);
      showToast("Something went wrong", false);
    } finally {
      setDeleting(false);
      setDeleteNote(null);
    }
  }

  function onEditSaved(u: Note) {
    setNotes((ns) => ns.map((n) => (n.id === u.id ? u : n)));
    setEditNote(null);
    showToast("Changes saved", true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            My Contributions
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Notes you have shared with the community
          </p>
        </div>
        <Link
          href="/library/upload"
          className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-blue-600 to-blue-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-900/40 hover:shadow-blue-500/40 hover:brightness-110 transition-all"
        >
          <UploadCloud className="h-4 w-4" /> Upload New
        </Link>
      </div>

      {/* Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-800 bg-slate-800/50 overflow-hidden animate-pulse"
            >
              <div className="h-32 bg-slate-700" />
              <div className="p-4 space-y-3">
                <div className="h-2 w-1/3 rounded bg-slate-700" />
                <div className="h-3 w-2/3 rounded bg-slate-700" />
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
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-800/50 ring-1 ring-slate-700">
            <FolderHeart className="h-7 w-7 text-slate-500" />
          </div>
          <p className="text-lg font-semibold text-slate-300">
            Nothing here yet
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Upload your first study note to get started
          </p>
          <Link
            href="/library/upload"
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-blue-600 to-blue-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-900/40 hover:brightness-110 transition-all"
          >
            <UploadCloud className="h-4 w-4" /> Upload Notes
          </Link>
        </motion.div>
      )}

      {!loading && notes.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {notes.map((note, i) => {
              const color = SUBJECT_COLOR[note.subject];
              const dl = note.downloads_count ?? 0;
              const rating = note.avg_rating ?? 0;
              return (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.04, type: "spring", damping: 20 }}
                  whileHover={{ y: -4 }}
                  className="group flex flex-col rounded-2xl border border-slate-800 bg-slate-900/50 shadow-md transition-all hover:border-slate-700 hover:shadow-xl hover:shadow-black/40 border-b-4 overflow-hidden"
                  style={{ borderBottomColor: color?.dot ? `var(--${color.dot.replace('bg-', '')})` : "var(--ax-border-light)" }}
                >
                  {/* Thumbnail */}
                  <div
                    className="relative h-36 cursor-pointer overflow-hidden"
                    onClick={() => handlePreview(note)}
                  >
                    <PdfThumbnail
                      url={note.file_url}
                      className="h-full w-full"
                      accentColor={color?.text ?? "text-slate-500"}
                      gradientClass="from-black/40 to-transparent"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-linear-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <span className="flex items-center gap-1.5 rounded-full bg-slate-800 px-5 py-2 text-xs font-bold text-white shadow-xl">
                        <Eye className="h-3.5 w-3.5" /> Preview
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-4">
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
                    <h3 className="line-clamp-2 text-[13px] font-semibold text-slate-100 leading-snug cursor-pointer group-hover:text-blue-400 transition-colors" onClick={() => handlePreview(note)}>
                      {note.title}
                    </h3>
                    <div className="mt-2.5 flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Download className="h-2.5 w-2.5" />
                        {dl}
                      </span>
                      {rating > 0 && (
                        <span className="flex items-center gap-0.5 text-amber-500">
                          <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                          {rating.toFixed(1)}
                        </span>
                      )}
                      <span className="ml-auto text-[10px] text-slate-500">
                        {note.created_at
                          ? new Date(note.created_at).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" },
                          )
                          : ""}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex border-t border-slate-800/50 bg-slate-950/40">
                    <button
                      onClick={() => handlePreview(note)}
                      className="flex flex-1 items-center justify-center gap-1.5 py-3 text-[11px] font-semibold text-slate-400 hover:bg-slate-800/50 hover:text-blue-400 transition-all border-r border-slate-800/50"
                    >
                      <Eye className="h-3 w-3" /> Preview
                    </button>
                    <button
                      onClick={() => setEditNote(note)}
                      className="flex flex-1 items-center justify-center gap-1.5 py-3 text-[11px] font-semibold text-slate-400 hover:bg-slate-800/50 hover:text-blue-400 transition-all border-r border-slate-800/50"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    <button
                      onClick={() => setDeleteNote(note)}
                      className="flex items-center justify-center gap-1 px-5 py-3 text-[11px] font-semibold text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {previewNote && (
          <PreviewModal note={previewNote} onClose={() => setPreview(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {editNote && (
          <EditModal
            note={editNote}
            onClose={() => setEditNote(null)}
            onSaved={onEditSaved}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteNote && (
          <DeleteModal
            note={deleteNote}
            onConfirm={handleDelete}
            onCancel={() => setDeleteNote(null)}
            loading={deleting}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && <Toast msg={toast.msg} ok={toast.ok} />}
      </AnimatePresence>
    </div>
  );
}
