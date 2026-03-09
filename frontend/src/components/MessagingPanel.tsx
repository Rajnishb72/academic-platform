"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useUser } from "@/hooks/useUser";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, Search, Send, Users, X, ChevronLeft,
  Loader2, Trash2, Check, CheckCheck, Smile, Pencil, Pin, PinOff, BadgeCheck
} from "lucide-react";
import {
  getFriendsAndRequests, type FriendEntry,
} from "@/lib/social";
import {
  fetchMessages, sendMessage, markMessagesRead, deleteMessage, editMessage,
  getUnreadCount,
  type PrivateMessage,
} from "@/lib/messaging";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function getDateKey(iso: string) { return new Date(iso).toDateString(); }

function canEdit(createdAt: string) {
  return (Date.now() - new Date(createdAt).getTime()) < 30_000;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ src, name, size = 36 }: { src?: string | null; name: string | null; size?: number }) {
  const initials = (name ?? "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  if (src) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name ?? ""} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  );
  return (
    <div className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white shadow-inner"
      style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </div>
  );
}

// ─── Quick Emoji ──────────────────────────────────────────────────────────────

const QUICK_EMOJIS = ["😊", "😂", "❤️", "👍", "🎉", "🔥", "😍", "🤔", "👋", "💯", "✨", "😎", "🙏", "💪", "📚", "✅"];

function EmojiPicker({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ type: "spring", duration: 0.2 }}
      className="absolute bottom-full left-0 mb-3 rounded-2xl p-2.5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] z-50 origin-bottom-left"
      style={{ background: "var(--ax-surface-1)", border: "1px solid var(--ax-border)" }}>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
        {QUICK_EMOJIS.map((e) => (
          <button key={e} onClick={() => { onSelect(e); onClose(); }}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-lg hover:bg-slate-800 transition hover:scale-110 active:scale-95">
            {e}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Date Divider ─────────────────────────────────────────────────────────────

function DateDivider({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 py-4 opacity-70">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[var(--ax-border)]" />
      <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
        style={{ background: "var(--ax-surface-2)", color: "var(--ax-text-muted)", border: "1px solid var(--ax-border)" }}>
        {date}
      </span>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[var(--ax-border)]" />
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg, isMe, showTail, onDelete, onEdit,
}: {
  msg: PrivateMessage; isMe: boolean; showTail: boolean; onDelete: () => void; onEdit: (newContent: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(msg.content);
  const editRef = useRef<HTMLInputElement>(null);

  const isDeleted = msg.content === "🚫 This message was deleted";

  function submitEdit() {
    if (editText.trim() && editText.trim() !== msg.content) {
      onEdit(editText.trim());
    }
    setEditing(false);
  }

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} group px-1 sm:px-2 w-full`}
      onMouseEnter={() => setShowActions(true)} onMouseLeave={() => setShowActions(false)}>
      <div className="relative max-w-[85%] sm:max-w-[75%]">
        <div className={`relative px-4 py-2.5 text-[14px] leading-relaxed shadow-sm transition-all
          ${isMe
            ? `rounded-2xl ${showTail ? "rounded-br-sm" : ""} bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-indigo-500/10`
            : `rounded-2xl ${showTail ? "rounded-bl-sm" : ""}`
          } ${isDeleted ? "opacity-60 italic" : ""}`}
          style={!isMe ? { background: "var(--ax-surface-2)", color: "var(--ax-text-primary)", border: "1px solid var(--ax-border)" } : undefined}>

          {editing ? (
            <form onSubmit={(e) => { e.preventDefault(); submitEdit(); }} className="flex items-center gap-2">
              <input ref={editRef} value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus
                className="flex-1 bg-transparent outline-none text-[14px] min-w-0" />
              <button type="submit" className="text-white/80 hover:text-white transition hover:scale-110"><Check className="h-4 w-4" /></button>
              <button type="button" onClick={() => setEditing(false)} className="text-white/60 hover:text-white transition hover:scale-110"><X className="h-4 w-4" /></button>
            </form>
          ) : (
            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
          )}

          <div className={`flex items-center justify-end gap-1.5 mt-1 select-none ${isMe ? "text-indigo-200/80" : ""}`}
            style={!isMe ? { color: "var(--ax-text-faint)" } : undefined}>
            <span className="text-[10px] font-medium">{formatTime(msg.created_at)}</span>
            {isMe && !isDeleted && (
              msg.read_at
                ? <CheckCheck className="h-3.5 w-3.5 text-sky-300 drop-shadow-sm" />
                : <Check className="h-3.5 w-3.5" />
            )}
          </div>
        </div>

        {/* Actions */}
        <AnimatePresence>
          {isMe && showActions && !editing && !isDeleted && (
            <motion.div initial={{ opacity: 0, scale: 0.9, x: 10 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9, x: 10 }}
              className={`absolute top-1/2 -translate-y-1/2 -left-16 flex items-center gap-1 rounded-full p-1 bg-slate-900/80 backdrop-blur-md border border-slate-800 shadow-xl`}>
              {canEdit(msg.created_at) && (
                <button onClick={() => { setEditing(true); setEditText(msg.content); }}
                  className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-slate-700 hover:text-white transition text-slate-400"
                  title="Edit (within 30s)">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              <button onClick={onDelete}
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-rose-500/20 hover:text-rose-400 transition text-slate-400"
                title="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface MessagingPanelProps {
  open: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function MessagingPanel({ open, onClose, onUnreadChange }: MessagingPanelProps) {
  const { user } = useUser();
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [pinnedUsers, setPinnedUsers] = useState<string[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [selected, setSelected] = useState<FriendEntry | null>(null);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load pinned state from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("ax_pinned_chats");
      if (stored) setPinnedUsers(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Save pinned state
  const togglePin = useCallback((e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    setPinnedUsers(prev => {
      const next = prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId];
      try { localStorage.setItem("ax_pinned_chats", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Load friends
  useEffect(() => {
    if (!user?.id || !open) return;
    getFriendsAndRequests(user.id).then((all) => {
      setFriends(all.filter((f) => f.status === "accepted"));
      setLoadingFriends(false);
    });
  }, [user?.id, open]);

  // Count unread
  useEffect(() => {
    if (!user?.id || !open) return;
    getUnreadCount(user.id).then((c: number) => onUnreadChange?.(c));
  }, [user?.id, open, onUnreadChange]);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!user?.id || !selected) return;
    try {
      const msgs = await fetchMessages(user.id, selected.userId);
      setMessages(msgs);
      await markMessagesRead(selected.userId, user.id);
      const unread = await getUnreadCount(user.id);
      onUnreadChange?.(unread);
    } catch { /* ignore */ }
  }, [user?.id, selected, onUnreadChange]);

  useEffect(() => {
    if (!selected) return;
    setLoadingMsgs(true);
    setInput("");
    setShowEmoji(false);
    loadMessages().finally(() => setLoadingMsgs(false));
    pollRef.current = setInterval(loadMessages, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selected, loadMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function handleSend() {
    if (!input.trim() || !user?.id || !selected || sending) return;
    const content = input.trim();
    setInput(""); setSending(true); setShowEmoji(false);
    try {
      const msg = await sendMessage(user.id, selected.userId, content);
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch { /* ignore */ } finally { setSending(false); inputRef.current?.focus(); }
  }

  async function handleDelete(msgId: number) {
    if (!user?.id) return;
    try {
      const ok = await deleteMessage(msgId, user.id);
      if (ok) setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: "🚫 This message was deleted" } : m));
    } catch { /* ignore */ }
  }

  async function handleEdit(msgId: number, newContent: string) {
    if (!user?.id) return;
    try {
      // Optimistic update
      setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: newContent } : m));
      // Backend update
      await editMessage(msgId, user.id, newContent);
    } catch { /* ignore */ }
  }

  // Sort friends: Pinned first, then by name
  const sortedFriends = useMemo(() => {
    const list = friends.filter((f) => (f.profile.display_name ?? "").toLowerCase().includes(search.toLowerCase()));
    return list.sort((a, b) => {
      const aPin = pinnedUsers.includes(a.userId);
      const bPin = pinnedUsers.includes(b.userId);
      if (aPin && !bPin) return -1;
      if (!aPin && bPin) return 1;
      const nameA = a.profile.display_name ?? "";
      const nameB = b.profile.display_name ?? "";
      return nameA.localeCompare(nameB);
    });
  }, [friends, search, pinnedUsers]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />

          {/* Panel — right half. Full width on mobile, right panel on md+ */}
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 bottom-0 z-[101] flex w-full md:w-1/2 flex-col shadow-2xl"
            style={{ background: "var(--ax-surface-0)", borderLeft: "1px solid var(--ax-border)" }}
          >
            {!selected ? (
              /* ── Friend List ──────────────────────────────── */
              <motion.div key="list" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex h-full flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: "1px solid var(--ax-border)" }}>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 text-indigo-400">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-bold" style={{ color: "var(--ax-text-primary)" }}>Messages</h2>
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: "var(--ax-accent)", color: "white" }}>{friends.length}</span>
                  </div>
                  <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl transition hover:bg-[var(--ax-surface-3)] text-slate-400 hover:text-white"
                  ><X className="h-5 w-5" /></button>
                </div>

                {/* Search */}
                <div className="px-5 py-4 shrink-0">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500 group-focus-within:text-violet-400 transition-colors">
                      <Search className="h-4 w-4" />
                    </div>
                    {/* Fixed padding here: pl-10 to prevent overlap */}
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search friends..."
                      className="h-11 w-full rounded-2xl pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-violet-500/30"
                      style={{ background: "var(--ax-surface-2)", color: "var(--ax-text-primary)", border: "1px solid var(--ax-border)" }} />
                  </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto scrollbar-hide px-3 pb-4">
                  {loadingFriends ? (
                    <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--ax-text-faint)" }} /></div>
                  ) : sortedFriends.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-20 text-center px-6">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/50">
                        <Users className="h-8 w-8" style={{ color: "var(--ax-text-faint)" }} />
                      </div>
                      <p className="text-sm font-medium" style={{ color: "var(--ax-text-secondary)" }}>{search ? "No matches found" : "No friends yet"}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {sortedFriends.map((f) => {
                        const isPinned = pinnedUsers.includes(f.userId);
                        return (
                          <div key={f.userId} className="relative group">
                            <button onClick={() => setSelected(f)}
                              className="flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition hover:bg-[var(--ax-surface-hover)]">
                              <div className="relative">
                                <Avatar src={f.profile.avatar_url} name={f.profile.display_name} size={48} />
                                {isPinned && (
                                  <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 ring-2 ring-slate-900 text-amber-400">
                                    <Pin className="h-3 w-3 fill-amber-400" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex justify-between items-baseline mb-0.5">
                                  <p className="flex items-center gap-1 truncate text-[15px] font-bold" style={{ color: "var(--ax-text-primary)" }}>
                                    {f.profile.display_name ?? "User"}
                                    {f.profile.is_verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-blue-400" />}
                                  </p>
                                </div>
                                <p className="truncate text-xs font-medium" style={{ color: "var(--ax-text-muted)" }}>Tap to start chatting</p>
                              </div>
                            </button>
                            <button onClick={(e) => togglePin(e, f.userId)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 opacity-0 group-hover:opacity-100 transition hover:scale-110 active:scale-95 text-slate-400 hover:text-amber-400"
                              title={isPinned ? "Unpin" : "Pin"}>
                              {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              /* ── Chat View ────────────────────────────────── */
              <motion.div key="chat" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex h-full flex-col bg-slate-950/40">
                {/* Chat header */}
                <div className="flex items-center gap-3 px-3 py-3 shrink-0 bg-slate-900/80 backdrop-blur-md z-10" style={{ borderBottom: "1px solid var(--ax-border)" }}>
                  <button onClick={() => setSelected(null)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-[var(--ax-surface-3)] active:scale-95 text-slate-400 hover:text-white">
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <Avatar src={selected.profile.avatar_url} name={selected.profile.display_name} size={42} />
                  <div className="flex-1 min-w-0 ml-1">
                    <p className="flex items-center gap-1 text-[15px] font-bold truncate text-white">
                      {selected.profile.display_name ?? "User"}
                      {selected.profile.is_verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-blue-400" />}
                    </p>
                    <p className="text-[11px] font-medium text-indigo-400">Academix Friend</p>
                  </div>
                  <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-[var(--ax-surface-3)] active:scale-95 text-slate-400 hover:text-white"
                  ><X className="h-5 w-5" /></button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-hide flex flex-col"
                  style={{ backgroundImage: "radial-gradient(circle at 2px 2px, var(--ax-border) 1px, transparent 0)", backgroundSize: "28px 28px" }}>
                  {loadingMsgs ? (
                    <div className="flex items-center justify-center flex-1">
                      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-center shrink-0 min-h-[50%]">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/10 mb-4 animate-bounce">
                        <MessageCircle className="h-10 w-10 text-indigo-400" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1">Start the conversation</h3>
                      <p className="text-sm text-slate-400 max-w-[200px]">Send a message to break the ice with {selected.profile.display_name?.split(" ")[0] ?? "your friend"} 👋</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 w-full shrink-0">
                      {messages.map((msg, idx) => {
                        const isMe = msg.sender_id === user!.id;
                        const prevMsg = idx > 0 ? messages[idx - 1] : null;
                        const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;
                        const showDate = !prevMsg || getDateKey(prevMsg.created_at) !== getDateKey(msg.created_at);
                        const showTail = !nextMsg || nextMsg.sender_id !== msg.sender_id || getDateKey(nextMsg.created_at) !== getDateKey(msg.created_at);

                        return (
                          <div key={msg.id} className="w-full">
                            {showDate && <DateDivider date={formatDate(msg.created_at)} />}
                            <MessageBubble msg={msg} isMe={isMe} showTail={showTail}
                              onDelete={() => handleDelete(msg.id)}
                              onEdit={(newContent) => handleEdit(msg.id, newContent)} />
                          </div>
                        );
                      })}
                      <div ref={bottomRef} className="h-2 shrink-0" />
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="px-4 py-3 shrink-0 bg-slate-900/80 backdrop-blur-md z-10" style={{ borderTop: "1px solid var(--ax-border)" }}>
                  <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-end gap-2">
                    <div className="relative shrink-0 pb-1.5">
                      <button type="button" onClick={() => setShowEmoji(!showEmoji)}
                        className={`flex h-10 w-10 items-center justify-center rounded-full transition active:scale-95 ${showEmoji ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                        <Smile className="h-5 w-5" />
                      </button>
                      <AnimatePresence>
                        {showEmoji && <EmojiPicker onSelect={(e) => setInput((v) => v + e)} onClose={() => setShowEmoji(false)} />}
                      </AnimatePresence>
                    </div>

                    <div className="flex-1 relative">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        placeholder="Message..."
                        className="w-full max-h-32 min-h-[44px] rounded-2xl px-4 py-3 text-sm outline-none resize-none transition-all focus:ring-2 focus:ring-indigo-500/40 scrollbar-hide bg-slate-800 border border-slate-700 text-white placeholder-slate-400"
                        rows={1}
                        onFocus={() => setShowEmoji(false)}
                      />
                    </div>

                    <div className="shrink-0 pb-1.5">
                      <button type="submit" disabled={!input.trim() || sending}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg transition active:scale-90 disabled:opacity-40 disabled:active:scale-100 hover:shadow-indigo-500/25">
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
