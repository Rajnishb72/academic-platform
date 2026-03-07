"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useUser } from "@/hooks/useUser";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Search,
  Send,
  Users,
  X,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  sendMessage,
  getMessages,
  getConversations,
  getFriendsForChat,
  markMessagesRead,
  type Message,
  type Conversation,
} from "@/lib/messages";

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  src,
  name,
  size = 36,
}: {
  src?: string | null;
  name: string;
  size?: number;
}) {
  const initials =
    name
      .split(" ")
      .map((w) => w[0] ?? "")
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";
  const px = `${size}px`;
  if (src)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        style={{ width: px, height: px }}
        className="rounded-full object-cover shrink-0"
      />
    );
  return (
    <div
      style={{ width: px, height: px }}
      className="flex shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white"
    >
      {initials}
    </div>
  );
}

// ─── Time formatter ───────────────────────────────────────────────────────────

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface MessagingPanelProps {
  open: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MessagingPanel({
  open,
  onClose,
  onUnreadChange,
}: MessagingPanelProps) {
  const { user } = useUser();
  const userId = user?.id;

  const [view, setView] = useState<"list" | "chat">("list");
  const [search, setSearch] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [friends, setFriends] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Load conversation list ─────────────────────────────────────────────────
  const loadList = useCallback(async () => {
    if (!userId) return;
    await Promise.resolve(); // Prevent sync state update warning in useEffect
    setLoadingList(true);
    const [convs, friendList] = await Promise.all([
      getConversations(userId),
      getFriendsForChat(userId),
    ]);
    setConversations(convs);
    setFriends(friendList);

    const total = convs.reduce((s, c) => s + c.unreadCount, 0);
    onUnreadChange?.(total);
    setLoadingList(false);
  }, [userId, onUnreadChange]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open && userId) loadList();
  }, [open, userId, loadList]);

  // ── Load messages for selected user ───────────────────────────────────────
  const openChat = useCallback(
    async (chatUser: ChatUser) => {
      if (!userId) return;
      setSelectedUser(chatUser);
      setView("chat");
      setLoadingChat(true);
      const msgs = await getMessages(userId, chatUser.id);
      setMessages(msgs);
      setLoadingChat(false);
      await markMessagesRead(userId, chatUser.id);
      // Update unread count in list
      setConversations((prev) =>
        prev.map((c) =>
          c.userId === chatUser.id ? { ...c, unreadCount: 0 } : c,
        ),
      );
      setTimeout(
        () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
    },
    [userId],
  );

  // ── Realtime subscription for new messages ────────────────────────────────
  useEffect(() => {
    if (!userId || !open) return;

    const channel = supabase
      .channel(`messages:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "private_messages",
          filter: `receiver_id=eq.${userId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          // If currently chatting with this sender, append the message
          setSelectedUser((sel) => {
            if (sel?.id === newMsg.sender_id) {
              setMessages((prev) => [...prev, newMsg]);
              markMessagesRead(userId, newMsg.sender_id);
              setTimeout(
                () =>
                  messagesEndRef.current?.scrollIntoView({
                    behavior: "smooth",
                  }),
                50,
              );
            }
            return sel;
          });
          // Refresh conversation list
          loadList();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, open, loadList]);

  // ── Send message ──────────────────────────────────────────────────────────
  async function handleSend() {
    if (!input.trim() || !userId || !selectedUser || sending) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    const name = user?.fullName ?? user?.firstName ?? null;
    const msg = await sendMessage(userId, selectedUser.id, text, name);
    if (msg) {
      setMessages((prev) => [...prev, msg]);
      setTimeout(
        () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
      // Update conversation list
      loadList();
    }
    setSending(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ─── Friend-only messaging constraint ─────────────────────────────────────
  // Only allow messaging if the user is in the current friends list
  const friendIds = new Set(friends.map((f) => f.id));
  const validConversations = conversations.filter((c) => friendIds.has(c.userId));

  const convUserIds = new Set(validConversations.map((c) => c.userId));
  const extraFriends = friends.filter((u) => !convUserIds.has(u.id));

  const allUsers: ChatUser[] = [
    ...validConversations.map((c) => ({
      id: c.userId,
      display_name: c.display_name,
      avatar_url: c.avatar_url,
    })),
    ...extraFriends,
  ];

  const filtered = search.trim()
    ? allUsers.filter((u) =>
      (u.display_name ?? "").toLowerCase().includes(search.toLowerCase()),
    )
    : allUsers;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col shadow-2xl" style={{ borderLeft: "1px solid var(--ax-border)", background: "var(--ax-surface-0)" }}
          >
            {/* ── Header ── */}
            <div className="flex h-14 shrink-0 items-center justify-between px-4" style={{ borderBottom: "1px solid var(--ax-border)" }}>
              {view === "chat" && selectedUser ? (
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => {
                      setView("list");
                      setSelectedUser(null);
                    }}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <Avatar
                    src={selectedUser.avatar_url}
                    name={selectedUser.display_name ?? "?"}
                    size={30}
                  />
                  <span className="truncate text-sm font-semibold" style={{ color: "var(--ax-text-primary)" }}>
                    {selectedUser.display_name ?? "User"}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-blue-400" />
                  <span className="text-sm font-bold" style={{ color: "var(--ax-text-primary)" }}>Messages</span>
                </div>
              )}
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ── List view ── */}
            {view === "list" && (
              <div className="flex flex-1 flex-col overflow-hidden">
                {/* Search */}
                <div className="px-3 py-2.5" style={{ borderBottom: "1px solid var(--ax-border)" }}>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search conversations…"
                      className="ax-input h-9 w-full rounded-lg pr-3 text-sm"
                      style={{ paddingLeft: "2.5rem" }}
                    />
                  </div>
                </div>

                {/* User list */}
                <div className="flex-1 overflow-y-auto">
                  {loadingList ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-16 text-center px-4">
                      <Users className="h-8 w-8 text-slate-600" />
                      <p className="text-sm font-semibold text-slate-500">
                        No friends yet
                      </p>
                      <p className="text-xs text-slate-600">
                        Add friends from someone&apos;s profile to start chatting
                      </p>
                    </div>
                  ) : (
                    <ul>
                      {filtered.map((u) => {
                        const conv = conversations.find(
                          (c) => c.userId === u.id,
                        );
                        const name = u.display_name ?? "User";
                        return (
                          <li key={u.id}>
                            <button
                              onClick={() => openChat(u)}
                              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-800/60"
                            >
                              <div className="relative">
                                <Avatar
                                  src={u.avatar_url}
                                  name={name}
                                  size={38}
                                />
                                {conv && conv.unreadCount > 0 && (
                                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white ring-2 ring-slate-950">
                                    {conv.unreadCount}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className={`truncate text-sm font-semibold ${conv?.unreadCount
                                      ? "text-white"
                                      : "text-slate-300"
                                      }`}
                                  >
                                    {name}
                                  </span>
                                  {conv && (
                                    <span className="shrink-0 text-[10px] text-slate-600">
                                      {relativeTime(conv.lastAt)}
                                    </span>
                                  )}
                                </div>
                                {conv && (
                                  <p
                                    className={`truncate text-xs ${conv.unreadCount
                                      ? "text-blue-400 font-medium"
                                      : "text-slate-500"
                                      }`}
                                  >
                                    {conv.lastMessage}
                                  </p>
                                )}
                                {!conv && (
                                  <p className="text-xs text-slate-600">
                                    Start a conversation
                                  </p>
                                )}
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* ── Chat view ── */}
            {view === "chat" && selectedUser && (
              <div className="flex flex-1 flex-col overflow-hidden">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                  {loadingChat ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-16 text-center">
                      <MessageCircle className="h-8 w-8 text-slate-600" />
                      <p className="text-sm text-slate-500">
                        Say hello to {selectedUser.display_name ?? "this user"}!
                      </p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMine = m.sender_id === userId;
                      return (
                        <div
                          key={m.id}
                          className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                        >
                          {!isMine && (
                            <Avatar
                              src={selectedUser.avatar_url}
                              name={selectedUser.display_name ?? "?"}
                              size={24}
                            />
                          )}
                          <div
                            className={`mx-2 max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${isMine
                              ? "rounded-br-sm bg-blue-600 text-white"
                              : "rounded-bl-sm bg-slate-800 text-slate-200"
                              }`}
                          >
                            {m.content}
                            <p
                              className={`mt-0.5 text-[10px] ${isMine ? "text-blue-200/70" : "text-slate-500"
                                }`}
                            >
                              {relativeTime(m.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="shrink-0 px-3 py-3" style={{ borderTop: "1px solid var(--ax-border)" }}>
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={`Message ${selectedUser.display_name ?? "user"}…`}
                      rows={1}
                      className="ax-input flex-1 resize-none rounded-xl px-3 py-2.5 max-h-32 overflow-y-auto"
                      style={{ scrollbarWidth: "none" }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || sending}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-600">
                    Enter to send · Shift+Enter for new line
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
