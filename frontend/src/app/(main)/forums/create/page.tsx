"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  PenSquare,
  Tag,
  X,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { createPost, PostCategory } from "@/lib/forums";
import { useToast } from "@/components/ToastProvider";

const CATEGORIES = ["Question", "Discussion", "Resource", "Solution"] as const;
type Category = (typeof CATEGORIES)[number];

const SUGGESTED_TAGS = [
  "AI",
  "Data Science",
  "Linux",
  "Ethical Hacking",
  "Career",
  "NLP",
  "Game Programming",
  "DevOps",
  "Resources",
  "Database",
  "Next.js",
  "Python",
  "Cloud",
  "Study",
  "Project",
];

const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
  Question: "Ask the community for help or clarification",
  Discussion: "Start an open-ended conversation on a topic",
  Resource: "Share useful links, files, or study material",
  Solution: "Post a solution to a known problem",
};

interface FormState {
  title: string;
  body: string;
  tags: string[];
  category: Category;
  tagInput: string;
}

function makeInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function CreatePostPage() {
  const router = useRouter();
  const { user } = useUser();
  const toast = useToast();
  const [form, setForm] = useState<FormState>({
    title: "",
    body: "",
    tags: [],
    category: "Question",
    tagInput: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  function addTag(tag: string) {
    const clean = tag.trim();
    if (!clean || form.tags.includes(clean) || form.tags.length >= 5) return;
    setForm((f) => ({ ...f, tags: [...f.tags, clean], tagInput: "" }));
  }

  function removeTag(tag: string) {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(form.tagInput);
    }
  }

  function validate() {
    const newErrors: typeof errors = {};
    if (!form.title.trim()) newErrors.title = "Title is required";
    else if (form.title.length < 10)
      newErrors.title = "Title must be at least 10 characters";
    if (!form.body.trim()) newErrors.body = "Content is required";
    else if (form.body.length < 20)
      newErrors.body = "Content must be at least 20 characters";
    if (form.tags.length === 0) newErrors.tags = "Add at least one tag";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !user) return;
    setSubmitting(true);
    setSubmitError(null);

    const fullName = user.fullName ?? user.username ?? "Anonymous";
    const avatar = makeInitials(fullName);

    const result = await createPost({
      user_id: user.id,
      author_name: fullName,
      author_avatar: avatar,
      title: form.title.trim(),
      body: form.body.trim(),
      tags: form.tags,
      category: form.category as PostCategory,
    });

    if (!result) {
      setSubmitError("Failed to publish post. Please try again.");
      toast.error("Publish failed", "Please try again.");
      setSubmitting(false);
      return;
    }

    toast.success("Post published!", "Redirecting to the feed…");
    setSubmitted(true);
    setTimeout(() => router.push("/forums"), 1500);
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-100">Post Published!</h2>
        <p className="text-sm text-slate-400">Redirecting you to the feed…</p>
      </motion.div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 ring-1 ring-indigo-500/40">
          <PenSquare className="h-4 w-4 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-100">Create a Post</h2>
          <p className="text-xs text-slate-400">
            Share knowledge, ask questions, spark discussions
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Category */}
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-4">
          <label className="mb-3 block text-xs font-semibold uppercase tracking-widest text-slate-500">
            Post Type
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setForm((f) => ({ ...f, category: cat }))}
                className={`rounded-lg border px-3 py-2.5 text-left text-xs font-medium transition-all
                                    ${form.category === cat
                    ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.1)]"
                    : "border-slate-700/50 bg-slate-800/40 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                  }`}
              >
                <span className="font-semibold">{cat}</span>
                <p className="mt-0.5 text-[10px] font-normal leading-snug opacity-70">
                  {CATEGORY_DESCRIPTIONS[cat]}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
            Title *
          </label>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Write a clear, descriptive title…"
            className="w-full rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none transition focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
            maxLength={150}
          />
          <div className="mt-1.5 flex items-center justify-between">
            {errors.title ? (
              <p className="flex items-center gap-1 text-[11px] text-rose-400">
                <AlertCircle className="h-3 w-3" /> {errors.title}
              </p>
            ) : (
              <span />
            )}
            <p className="text-[10px] text-slate-500">{form.title.length}/150</p>
          </div>
        </div>

        {/* Body */}
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
            Content *
          </label>
          <textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            placeholder="Describe your question, share your thoughts, or post your resource…"
            rows={7}
            className="w-full resize-none rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none transition focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
            maxLength={5000}
          />
          <div className="mt-1.5 flex items-center justify-between">
            {errors.body ? (
              <p className="flex items-center gap-1 text-[11px] text-rose-400">
                <AlertCircle className="h-3 w-3" /> {errors.body}
              </p>
            ) : (
              <span />
            )}
            <p className="text-[10px] text-slate-500">{form.body.length}/5000</p>
          </div>
        </div>

        {/* Tags */}
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
            Tags *{" "}
            <span className="normal-case font-normal text-slate-500">
              (up to 5)
            </span>
          </label>

          {/* Tag input */}
          <div className="mb-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                value={form.tagInput}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tagInput: e.target.value }))
                }
                onKeyDown={handleTagKeyDown}
                placeholder="Type and press Enter or comma…"
                className="w-full rounded-lg border border-slate-700/60 bg-slate-900 py-2 pl-8 pr-3 text-sm text-slate-200 placeholder-slate-500 outline-none transition focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 disabled:opacity-50"
                disabled={form.tags.length >= 5}
              />
            </div>
            <button
              type="button"
              onClick={() => addTag(form.tagInput)}
              disabled={form.tags.length >= 5 || !form.tagInput.trim()}
              className="rounded-lg bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-700 disabled:opacity-40"
            >
              Add
            </button>
          </div>

          {/* Current tags */}
          {form.tags.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {form.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full bg-indigo-500/20 px-2.5 py-1 text-[11px] font-medium text-indigo-300 ring-1 ring-indigo-500/40 shadow-[0_0_10px_rgba(99,102,241,0.1)]"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-0.5 text-indigo-400 hover:text-indigo-200 transition"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Suggestions */}
          <div>
            <p className="mb-1.5 flex items-center gap-1 text-[10px] text-slate-500">
              <Sparkles className="h-3 w-3 text-indigo-400" /> Suggested:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_TAGS.filter((t) => !form.tags.includes(t)).map(
                (tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    disabled={form.tags.length >= 5}
                    className="rounded-full bg-slate-800/40 px-2.5 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-slate-700/50 transition hover:bg-slate-800/80 hover:text-slate-200 disabled:opacity-50"
                  >
                    + {tag}
                  </button>
                ),
              )}
            </div>
          </div>

          {errors.tags && (
            <p className="mt-2 flex items-center gap-1 text-[11px] text-rose-400">
              <AlertCircle className="h-3 w-3" /> {errors.tags}
            </p>
          )}
        </div>

        {/* Submit error */}
        {submitError && (
          <p className="flex items-center gap-2 rounded-lg bg-rose-500/10 px-4 py-3 text-xs text-rose-400 ring-1 ring-rose-500/20">
            <AlertCircle className="h-4 w-4 shrink-0" /> {submitError}
          </p>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/forums")}
            className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-400 transition hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] transition hover:bg-indigo-500 disabled:opacity-60 disabled:hover:shadow-none"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PenSquare className="h-4 w-4" />
            )}
            {submitting ? "Publishing…" : "Publish Post"}
          </button>
        </div>
      </form>
    </div>
  );
}
