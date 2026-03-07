"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  CornerDownRight,
  X,
  Loader2,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  Pencil,
  Trash2,
  Check,
} from "lucide-react";
import {
  ForumComment,
  fetchComments,
  addComment,
  editComment,
  deleteComment,
  castCommentVote,
  subscribeToComments,
  timeAgo,
} from "@/lib/forums";

// ─── Single comment bubble ────────────────────────────────────────────────────

function CommentBubble({
  comment,
  depth,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onVote,
}: {
  comment: ForumComment;
  depth: number;
  currentUserId: string | null;
  onReply: (c: ForumComment) => void;
  onEdit: (id: string, newBody: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onVote: (id: string, type: "like" | "dislike") => Promise<void>;
}) {
  const isOwn = comment.user_id === currentUserId;
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.body);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [voting, setVoting] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);

  async function handleSaveEdit() {
    if (!editText.trim() || editText.trim() === comment.body) {
      setEditing(false);
      return;
    }
    setSaving(true);
    await onEdit(comment.id, editText.trim());
    setSaving(false);
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this comment?")) return;
    setDeleting(true);
    await onDelete(comment.id);
    // Parent removes it from state; no need to setDeleting(false)
  }

  async function handleVote(type: "like" | "dislike") {
    if (!currentUserId || voting) return;
    setVoting(true);
    await onVote(comment.id, type);
    setVoting(false);
  }

  return (
    <div
      className={`flex flex-col gap-2 ${depth > 0 ? "ml-7 border-l-2 border-slate-700/50 pl-3" : ""}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="group flex gap-2.5"
      >
        {/* Avatar */}
        <div
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-sm
                    ${isOwn ? "bg-linear-to-br from-indigo-500 to-purple-600" : "bg-linear-to-br from-slate-600 to-slate-700 ring-1 ring-slate-600/50"}`}
        >
          {comment.author_avatar}
        </div>

        <div className="flex-1 min-w-0">
          {/* Bubble */}
          <div
            className={`rounded-xl px-3 py-2 text-xs leading-relaxed
                        ${isOwn ? "bg-indigo-500/10 ring-1 ring-indigo-500/20" : "bg-slate-800/60 ring-1 ring-slate-700/50"}`}
          >
            {/* Author + time + edited badge */}
            <div className="mb-1 flex flex-wrap items-baseline gap-1.5">
              <span
                className={`font-semibold ${isOwn ? "text-indigo-400" : "text-slate-300"}`}
              >
                {isOwn ? "You" : comment.author_name}
              </span>
              <span className="text-[10px] text-slate-500">
                {timeAgo(comment.created_at)}
              </span>
              {comment.edited && (
                <span className="text-[9px] italic text-slate-500">
                  (edited)
                </span>
              )}
            </div>

            {/* Body or edit textarea */}
            {editing ? (
              <div className="flex flex-col gap-1.5">
                <textarea
                  ref={editRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSaveEdit();
                    }
                    if (e.key === "Escape") {
                      setEditing(false);
                      setEditText(comment.body);
                    }
                  }}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-indigo-500/30 bg-slate-900/50 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500/50"
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-[10px] font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    ) : (
                      <Check className="h-2.5 w-2.5" />
                    )}
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEditText(comment.body);
                    }}
                    className="rounded-md px-2.5 py-1 text-[10px] text-slate-400 transition hover:text-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap break-all text-slate-300">
                {comment.body}
              </p>
            )}
          </div>

          {/* Action bar */}
          {!editing && (
            <div className="mt-1 flex items-center gap-0.5">
              {/* Like */}
              <button
                onClick={() => handleVote("like")}
                disabled={voting || !currentUserId}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition disabled:opacity-40
                                    ${comment.userVote === "like"
                    ? "text-emerald-400"
                    : "text-slate-500 hover:text-emerald-400"
                  }`}
              >
                <ThumbsUp
                  className={`h-3 w-3 ${comment.userVote === "like" ? "fill-emerald-400/30" : ""}`}
                />
                {comment.likes_count > 0 && comment.likes_count}
              </button>

              {/* Dislike */}
              <button
                onClick={() => handleVote("dislike")}
                disabled={voting || !currentUserId}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition disabled:opacity-40
                                    ${comment.userVote === "dislike"
                    ? "text-rose-400"
                    : "text-slate-500 hover:text-rose-400"
                  }`}
              >
                <ThumbsDown
                  className={`h-3 w-3 ${comment.userVote === "dislike" ? "fill-rose-400/30" : ""}`}
                />
                {comment.dislikes_count > 0 && comment.dislikes_count}
              </button>

              {/* Reply (root level only) */}
              {depth === 0 && (
                <button
                  onClick={() => onReply(comment)}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-slate-500 transition hover:text-indigo-400"
                >
                  <CornerDownRight className="h-3 w-3" />
                  Reply
                </button>
              )}

              {/* Own comment: Edit + Delete */}
              {isOwn && (
                <div className="ml-auto flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => setEditing(true)}
                    className="rounded-md p-1 text-slate-500 transition hover:bg-slate-800 hover:text-indigo-400"
                    title="Edit"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded-md p-1 text-slate-500 transition hover:bg-slate-800 hover:text-rose-400 disabled:opacity-50"
                    title="Delete"
                  >
                    {deleting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="flex flex-col gap-2">
          {comment.replies.map((reply) => (
            <CommentBubble
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              currentUserId={currentUserId}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onVote={onVote}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Comments Panel ───────────────────────────────────────────────────────────

interface CommentsPanelProps {
  postId: string;
  commentsCount: number;
  currentUserId: string | null;
  authorName: string;
  authorAvatar: string;
  onCountChange?: (delta: number) => void;
}

export default function CommentsPanel({
  postId,
  commentsCount,
  currentUserId,
  authorName,
  authorAvatar,
  onCountChange,
}: CommentsPanelProps) {
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ForumComment | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Initial fetch (with user votes enriched)
  useEffect(() => {
    fetchComments(postId, currentUserId).then((data) => {
      setComments(data);
      setLoading(false);
    });
  }, [postId, currentUserId]);

  // Realtime: new comments from ALL users
  useEffect(() => {
    const unsub = subscribeToComments(postId, (newComment) => {
      setComments((prev) => {
        const flat = flattenComments(prev);
        if (flat.some((c) => c.id === newComment.id)) return prev;

        // Replace optimistic placeholder if present
        const opt = flat.find(
          (c) =>
            c.id.startsWith("opt-") &&
            c.user_id === newComment.user_id &&
            c.body === newComment.body &&
            c.parent_id === newComment.parent_id,
        );
        if (opt) {
          if (!newComment.parent_id) {
            return prev.map((c) =>
              c.id === opt.id
                ? { ...newComment, userVote: null, replies: c.replies ?? [] }
                : c,
            );
          }
          return prev.map((r) =>
            replaceOptimistic(r, opt.id, { ...newComment, userVote: null }),
          );
        }

        const enriched = { ...newComment, userVote: null as null, replies: [] };
        if (!newComment.parent_id) return [...prev, enriched];
        return prev.map((r) => addReplyToTree(r, enriched));
      });
    });
    return unsub;
  }, [postId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  useEffect(() => {
    if (replyingTo) inputRef.current?.focus();
  }, [replyingTo]);

  // ── Submit new comment / reply ──────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !currentUserId) return;

    setSubmitting(true);
    setText("");

    const optimistic: ForumComment = {
      id: "opt-" + Date.now(),
      post_id: postId,
      user_id: currentUserId,
      author_name: authorName,
      author_avatar: authorAvatar,
      body: trimmed,
      parent_id: replyingTo?.id ?? null,
      likes_count: 0,
      dislikes_count: 0,
      edited: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      userVote: null,
      replies: [],
    };

    if (!optimistic.parent_id) {
      setComments((prev) => [...prev, optimistic]);
    } else {
      setComments((prev) => prev.map((r) => addReplyToTree(r, optimistic)));
    }

    const result = await addComment(
      postId,
      currentUserId,
      authorName,
      authorAvatar,
      trimmed,
      replyingTo?.id,
    );
    if (result) {
      onCountChange?.(1);
      const real = { ...result, userVote: null as null, replies: [] };
      if (!result.parent_id) {
        setComments((prev) =>
          prev.map((c) => (c.id === optimistic.id ? real : c)),
        );
      } else {
        setComments((prev) =>
          prev.map((r) => replaceOptimistic(r, optimistic.id, real)),
        );
      }
    }
    setReplyingTo(null);
    setSubmitting(false);
  }

  // ── Edit ────────────────────────────────────────────────────────────────
  async function handleEdit(id: string, newBody: string): Promise<void> {
    if (!currentUserId) return;
    const ok = await editComment(id, currentUserId, newBody);
    if (ok) {
      setComments((prev) =>
        prev.map((r) =>
          updateCommentInTree(r, id, (c) => ({
            ...c,
            body: newBody,
            edited: true,
          })),
        ),
      );
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────
  async function handleDelete(id: string): Promise<void> {
    if (!currentUserId) return;
    const ok = await deleteComment(id, currentUserId);
    if (ok) {
      onCountChange?.(-1);
      setComments((prev) => removeCommentFromTree(prev, id));
    }
  }

  // ── Vote on comment ─────────────────────────────────────────────────────
  async function handleVote(
    id: string,
    type: "like" | "dislike",
  ): Promise<void> {
    if (!currentUserId) return;

    // Optimistic
    setComments((prev) =>
      prev.map((r) =>
        updateCommentInTree(r, id, (c) => {
          const wasThis = c.userVote === type;
          const wasOther = c.userVote !== null && c.userVote !== type;
          return {
            ...c,
            likes_count:
              type === "like"
                ? wasThis
                  ? c.likes_count - 1
                  : c.likes_count + 1
                : wasOther && c.userVote === "like"
                  ? c.likes_count - 1
                  : c.likes_count,
            dislikes_count:
              type === "dislike"
                ? wasThis
                  ? c.dislikes_count - 1
                  : c.dislikes_count + 1
                : wasOther && c.userVote === "dislike"
                  ? c.dislikes_count - 1
                  : c.dislikes_count,
            userVote: wasThis ? null : type,
          };
        }),
      ),
    );
    await castCommentVote(id, currentUserId, type);
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22 }}
      className="overflow-hidden"
    >
      <div className="px-5 py-4" style={{ borderTop: "1px solid var(--ax-border)", background: "var(--ax-surface-2)" }}>
        {/* Header */}
        <div className="mb-3 flex items-center gap-2">
          <MessageCircle className="h-3.5 w-3.5 text-indigo-400" />
          <span className="text-xs font-semibold" style={{ color: "var(--ax-text-secondary)" }}>
            {commentsCount} Comment{commentsCount !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Comment list */}
        <div className="mb-4 flex max-h-80 flex-col gap-3 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500/50" />
            </div>
          ) : comments.length === 0 ? (
            <p className="py-4 text-center text-[11px] text-slate-500">
              No comments yet — be the first!
            </p>
          ) : (
            <AnimatePresence>
              {comments.map((c) => (
                <CommentBubble
                  key={c.id}
                  comment={c}
                  depth={0}
                  currentUserId={currentUserId}
                  onReply={(target) => {
                    setReplyingTo(target);
                    inputRef.current?.focus();
                  }}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onVote={handleVote}
                />
              ))}
            </AnimatePresence>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {currentUserId ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <AnimatePresence>
              {replyingTo && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-2 rounded-lg bg-indigo-500/10 px-3 py-2 ring-1 ring-indigo-500/20 mb-2"
                >
                  <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                  <span className="flex-1 truncate text-[11px] text-indigo-300">
                    Replying to <strong className="text-indigo-200">{replyingTo.author_name}</strong>:{" "}
                    {replyingTo.body.slice(0, 50)}
                    {replyingTo.body.length > 50 ? "…" : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="text-slate-400 transition hover:text-slate-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-end gap-2">
              <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-[10px] font-bold text-white">
                {authorAvatar}
              </div>
              <div className="relative flex-1">
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e as unknown as React.FormEvent);
                    }
                  }}
                  placeholder={
                    replyingTo
                      ? `Reply to ${replyingTo.author_name}…`
                      : "Write a comment… (Enter to send, Shift+Enter for new line)"
                  }
                  rows={1}
                  className="ax-input block w-full resize-none rounded-xl px-3.5 py-2.5 pr-10 text-xs"
                  style={{ minHeight: "38px", maxHeight: "96px" }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = Math.min(el.scrollHeight, 96) + "px";
                  }}
                />
                <button
                  type="submit"
                  disabled={!text.trim() || submitting}
                  className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:opacity-40"
                >
                  {submitting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <p className="text-center text-[11px] text-slate-500">
            Sign in to comment
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Tree helpers ──────────────────────────────────────────────────────────────

function flattenComments(roots: ForumComment[]): ForumComment[] {
  const out: ForumComment[] = [];
  function walk(c: ForumComment) {
    out.push(c);
    c.replies?.forEach(walk);
  }
  roots.forEach(walk);
  return out;
}

function addReplyToTree(root: ForumComment, reply: ForumComment): ForumComment {
  if (root.id === reply.parent_id) {
    return { ...root, replies: [...(root.replies ?? []), reply] };
  }
  return {
    ...root,
    replies: (root.replies ?? []).map((r) => addReplyToTree(r, reply)),
  };
}

function replaceOptimistic(
  root: ForumComment,
  optId: string,
  real: ForumComment,
): ForumComment {
  if (root.id === optId) return { ...real, replies: root.replies ?? [] };
  return {
    ...root,
    replies: (root.replies ?? []).map((r) => replaceOptimistic(r, optId, real)),
  };
}

function updateCommentInTree(
  root: ForumComment,
  id: string,
  updater: (c: ForumComment) => ForumComment,
): ForumComment {
  if (root.id === id) return updater(root);
  return {
    ...root,
    replies: (root.replies ?? []).map((r) =>
      updateCommentInTree(r, id, updater),
    ),
  };
}

function removeCommentFromTree(
  roots: ForumComment[],
  id: string,
): ForumComment[] {
  return roots
    .filter((c) => c.id !== id)
    .map((c) => ({
      ...c,
      replies: removeCommentFromTree(c.replies ?? [], id),
    }));
}
