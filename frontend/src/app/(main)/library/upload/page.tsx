"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  FileText,
  X,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";

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

// ─── Upload Security ────────────────────────────────────────────────────────
const ALLOWED_MIMES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);
const ALLOWED_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg", "webp", "gif"]);
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export default function UploadPage() {
  const { userId, user } = useUser();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  // Fire 1-day-before deadline notifications from pending list
  useEffect(() => {
    if (!userId) return;
    const key = "academix_pending_notifs";
    const pending: { planId: string; title: string; endDate: string }[] =
      JSON.parse(localStorage.getItem(key) ?? "[]");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const toFire = pending.filter((p) => {
      const d = new Date(p.endDate + "T00:00:00");
      return d.getTime() === tomorrow.getTime();
    });
    if (toFire.length === 0) return;
    const remaining = pending.filter((p) => {
      const d = new Date(p.endDate + "T00:00:00");
      return d.getTime() !== tomorrow.getTime();
    });
    localStorage.setItem(key, JSON.stringify(remaining));
    const rows = toFire.map((p) => ({
      user_id: userId,
      type: "planner_deadline" as const,
      from_user_id: userId,
      reference_id: p.planId,
      content: `Deadline tomorrow: ${p.title} — due ${new Date(p.endDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    }));
    supabase.from("notifications").insert(rows).then(({ error }: any) => { if (error) console.error(error); });
  }, [userId]);

  const [file, setFile] = useState<File | null>(null);
  const [isDrag, setIsDrag] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  function showToast(msg: string, ok: boolean) {
    if (ok) toast.success(msg);
    else toast.error(msg);
  }

  function pickFile(f: File) {
    // Validate MIME type
    if (!ALLOWED_MIMES.has(f.type))
      return showToast("Only PDF or image files (PNG, JPG, WebP, GIF)", false);
    // Validate file extension to prevent double-extension attacks
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.has(ext))
      return showToast(`File extension .${ext} is not allowed`, false);
    // Validate file size
    if (f.size > MAX_FILE_SIZE)
      return showToast("File must be under 20 MB", false);
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDrag(false);
    if (e.dataTransfer.files[0]) pickFile(e.dataTransfer.files[0]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !userId || loading) return;
    setLoading(true);
    try {
      const authDb = createClient();
      const safeName = file.name.replace(/\s+/g, "_");
      const storagePath = `${userId}/${Date.now()}-${safeName}`;

      const { error: se } = await authDb.storage
        .from("notes")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        });
      if (se) throw new Error(`Storage: ${se.message}`);

      const { data: urlData } = supabase.storage
        .from("notes")
        .getPublicUrl(storagePath);

      const { error: de } = await supabase.from("notes").insert({
        user_id: String(userId),
        uploader_name: user?.fullName ?? user?.firstName ?? user?.username ?? "Anonymous",
        title: title.trim(),
        subject,
        file_url: urlData.publicUrl,
        storage_path: storagePath,
      });
      if (de) throw new Error(`DB: ${de.message}`);

      showToast("Published! Redirecting to your notes…", true);
      setTimeout(() => router.push("/library/collections"), 1200);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Upload failed", false);
      setLoading(false);
    }
  }

  return (
    <div className="flex items-start justify-center">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl"
      >
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-md shadow-black/20">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <UploadCloud className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100">Share a Note</h1>
              <p className="text-xs text-slate-400">
                Help your peers — upload study material
              </p>
            </div>
          </div>

          <form onSubmit={handleUpload} className="space-y-4">
            <AnimatePresence mode="wait">
              {!file ? (
                <motion.div
                  key="drop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDrag(true);
                  }}
                  onDragLeave={() => setIsDrag(false)}
                  onDrop={onDrop}
                  onClick={() => fileRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition
                    ${isDrag ? "border-blue-500 bg-blue-500/10" : "border-slate-700 hover:border-blue-500/40 hover:bg-slate-800"}`}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) pickFile(e.target.files[0]);
                    }}
                  />
                  <UploadCloud className="mb-2 h-8 w-8 text-blue-400" />
                  <p className="text-sm font-medium text-slate-300">
                    Drop PDF or image here, or click to browse
                  </p>
                  <p className="mt-1 text-xs text-slate-500">PDF or image · Max 20 MB</p>
                </motion.div>
              ) : (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3"
                >
                  <FileText className="h-8 w-8 shrink-0 text-blue-400" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-slate-200">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  {!loading && (
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setTitle("");
                      }}
                      className="text-slate-500 hover:text-slate-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  Title *
                </label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. AI Module 4 Notes"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  Subject *
                </label>
                <div className="relative">
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  <select
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 pr-8 text-sm text-slate-100 focus:border-blue-500/50 focus:outline-none transition"
                  >
                    <option value="" disabled>
                      Select subject
                    </option>
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !file || !title || !subject}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 hover:bg-blue-500 disabled:opacity-40 transition"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  Publish to Library
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
