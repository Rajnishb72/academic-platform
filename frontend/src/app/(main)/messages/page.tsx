"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useUser } from "@/hooks/useUser";
import { motion, AnimatePresence } from "framer-motion";
import {
    MessageSquare,
    Send,
    Loader2,
    Search,
    UserCircle2,
    CheckCircle2,
    Clock,
    Users,
    X,
    ArrowLeft,
} from "lucide-react";
import {
    getFriendsAndRequests,
    type FriendEntry,
} from "@/lib/social";
import {
    fetchMessages,
    sendMessage,
    markMessagesRead,
    type PrivateMessage,
} from "@/lib/messaging";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function getInitials(name: string | null, fallback = "?") {
    if (!name) return fallback;
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ src, name, size = 36 }: { src?: string | null; name: string | null; size?: number }) {
    if (src) return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ?? ""} className="rounded-full object-cover ring-1 ring-white/10" style={{ width: size, height: size }} />
    );
    return (
        <div className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white ring-1 ring-white/10" style={{ width: size, height: size, fontSize: size * 0.36 }}>
            {getInitials(name)}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MessagesPage() {
    const { user, isLoaded } = useUser();
    const [friends, setFriends] = useState<FriendEntry[]>([]);
    const [loadingFriends, setLoadingFriends] = useState(true);
    const [selected, setSelected] = useState<FriendEntry | null>(null);
    const [messages, setMessages] = useState<PrivateMessage[]>([]);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [search, setSearch] = useState("");
    const [showSidebar, setShowSidebar] = useState(true);
    const bottomRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load accepted friends
    useEffect(() => {
        if (!user?.id) return;
        getFriendsAndRequests(user.id).then((all) => {
            setFriends(all.filter((f) => f.status === "accepted"));
            setLoadingFriends(false);
        });
    }, [user?.id]);

    // Load messages for selected friend
    const loadMessages = useCallback(async () => {
        if (!user?.id || !selected) return;
        try {
            const msgs = await fetchMessages(user.id, selected.userId);
            setMessages(msgs);
            await markMessagesRead(selected.userId, user.id);
        } catch { /* ignore */ }
    }, [user?.id, selected]);

    useEffect(() => {
        if (!selected) return;
        setLoadingMsgs(true);
        loadMessages().finally(() => setLoadingMsgs(false));

        // Poll every 4 seconds
        pollRef.current = setInterval(loadMessages, 4000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [selected, loadMessages]);

    // Scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function handleSend() {
        if (!input.trim() || !user?.id || !selected || sending) return;
        const content = input.trim();
        setInput("");
        setSending(true);
        try {
            const msg = await sendMessage(user.id, selected.userId, content);
            setMessages((prev) => [...prev, msg]);
        } catch { /* ignore */ } finally {
            setSending(false);
        }
    }

    function selectFriend(f: FriendEntry) {
        setSelected(f);
        setShowSidebar(false); // Hide sidebar on mobile after selection
    }

    const filteredFriends = friends.filter((f) =>
        (f.profile.display_name ?? "").toLowerCase().includes(search.toLowerCase())
    );

    if (!isLoaded) return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--ax-accent)" }} />
        </div>
    );

    return (
        <div className="space-y-5">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--ax-text-primary)" }}>
                    Messages
                </h1>
                <p className="mt-0.5 text-sm" style={{ color: "var(--ax-text-secondary)" }}>
                    Private conversations with your connections.
                </p>
            </div>

            {/* Chat Container */}
            <div className="ax-card-flat flex h-[calc(100vh-220px)] min-h-[480px] overflow-hidden rounded-2xl"
                style={{ border: "1px solid var(--ax-border)" }}>

                {/* ── Friends Sidebar ─────────────────────────────────────── */}
                <div className={`flex w-full md:w-80 shrink-0 flex-col overflow-hidden transition-all duration-300
                    ${showSidebar ? "max-w-full md:max-w-80" : "max-w-0 md:max-w-80"}
                    border-r`}
                    style={{ borderColor: "var(--ax-border)", background: "var(--ax-surface-1)" }}>

                    {/* Sidebar Header */}
                    <div className="px-4 py-3.5" style={{ borderBottom: "1px solid var(--ax-border)" }}>
                        <div className="relative flex items-center">
                            <Search className="pointer-events-none absolute left-3 z-10 h-4 w-4" style={{ color: "var(--ax-text-faint)" }} />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search conversations..."
                                className="ax-input h-9 w-full rounded-xl pl-10 pr-3 text-xs"
                            />
                            {search && (
                                <button onClick={() => setSearch("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5"
                                    style={{ color: "var(--ax-text-faint)" }}>
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Friend list */}
                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                        {loadingFriends ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--ax-text-faint)" }} />
                            </div>
                        ) : filteredFriends.length === 0 ? (
                            <div className="flex flex-col items-center gap-3 py-16 text-center px-6">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl"
                                    style={{ background: "var(--ax-surface-3)" }}>
                                    <Users className="h-6 w-6" style={{ color: "var(--ax-text-faint)" }} />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold" style={{ color: "var(--ax-text-secondary)" }}>
                                        No connections yet
                                    </p>
                                    <p className="text-xs mt-1" style={{ color: "var(--ax-text-faint)" }}>
                                        Add friends from user profiles to start messaging.
                                    </p>
                                </div>
                            </div>
                        ) : filteredFriends.map((f) => (
                            <button
                                key={f.userId}
                                onClick={() => selectFriend(f)}
                                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-150"
                                style={{
                                    background: selected?.userId === f.userId ? "var(--ax-surface-3)" : "transparent",
                                    borderLeft: selected?.userId === f.userId
                                        ? "2px solid var(--ax-accent)" : "2px solid transparent",
                                }}
                            >
                                <Avatar src={f.profile.avatar_url} name={f.profile.display_name} size={40} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold"
                                        style={{ color: selected?.userId === f.userId ? "var(--ax-accent)" : "var(--ax-text-primary)" }}>
                                        {f.profile.display_name ?? "User"}
                                    </p>
                                    <p className="text-[10px]" style={{ color: "var(--ax-text-faint)" }}>
                                        Tap to open chat
                                    </p>
                                </div>
                                {selected?.userId === f.userId && (
                                    <div className="h-2 w-2 rounded-full shrink-0" style={{ background: "var(--ax-accent)" }} />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Chat Window ─────────────────────────────────────────── */}
                <div className="flex flex-1 flex-col overflow-hidden" style={{ background: "var(--ax-surface-0)" }}>
                    {selected ? (
                        <>
                            {/* Chat header */}
                            <div className="flex items-center gap-3 px-5 py-3.5"
                                style={{ borderBottom: "1px solid var(--ax-border)", background: "var(--ax-surface-1)" }}>
                                {/* Mobile back button */}
                                <button onClick={() => setShowSidebar(true)}
                                    className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                                    style={{ color: "var(--ax-text-muted)" }}>
                                    <ArrowLeft className="h-4 w-4" />
                                </button>
                                <Avatar src={selected.profile.avatar_url} name={selected.profile.display_name} size={36} />
                                <div>
                                    <p className="text-sm font-bold" style={{ color: "var(--ax-text-primary)" }}>
                                        {selected.profile.display_name ?? "User"}
                                    </p>
                                    <p className="text-[10px]" style={{ color: "var(--ax-text-faint)" }}>
                                        Private conversation
                                    </p>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5 scrollbar-hide ax-scroll-touch">
                                {loadingMsgs ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--ax-text-faint)" }} />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center gap-3 py-16 text-center">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl"
                                            style={{ background: "var(--ax-surface-2)" }}>
                                            <MessageSquare className="h-7 w-7" style={{ color: "var(--ax-text-faint)" }} />
                                        </div>
                                        <p className="text-sm" style={{ color: "var(--ax-text-secondary)" }}>
                                            Start the conversation. Say hello!
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <AnimatePresence initial={false}>
                                            {messages.map((msg) => {
                                                const isMe = msg.sender_id === user!.id;
                                                return (
                                                    <motion.div
                                                        key={msg.id}
                                                        initial={{ opacity: 0, y: 8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                                                    >
                                                        <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${isMe
                                                            ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-br-sm"
                                                            : "rounded-bl-sm"
                                                            }`}
                                                            style={!isMe ? {
                                                                background: "var(--ax-surface-2)",
                                                                color: "var(--ax-text-primary)",
                                                                border: "1px solid var(--ax-border)"
                                                            } : undefined}
                                                        >
                                                            <p className="leading-relaxed">{msg.content}</p>
                                                            <p className={`mt-1 text-[10px] ${isMe ? "text-indigo-200" : ""}`}
                                                                style={!isMe ? { color: "var(--ax-text-faint)" } : undefined}>
                                                                {formatTime(msg.created_at)}
                                                            </p>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </AnimatePresence>
                                        <div ref={bottomRef} />
                                    </>
                                )}
                            </div>

                            {/* Input */}
                            <div className="px-4 py-3" style={{ borderTop: "1px solid var(--ax-border)", background: "var(--ax-surface-1)" }}>
                                <form
                                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                    className="flex items-center gap-2"
                                >
                                    <input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder={`Message ${selected.profile.display_name ?? "friend"}...`}
                                        className="ax-input flex-1 rounded-xl px-4 py-2.5 text-sm"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!input.trim() || sending}
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md transition-all hover:shadow-indigo-500/25 hover:scale-[1.03] active:scale-95 disabled:opacity-40 disabled:hover:shadow-none disabled:hover:scale-100"
                                    >
                                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center px-8">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl"
                                style={{ background: "var(--ax-surface-2)", border: "1px solid var(--ax-border)" }}>
                                <MessageSquare className="h-8 w-8" style={{ color: "var(--ax-accent)" }} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold" style={{ color: "var(--ax-text-primary)" }}>
                                    Select a Conversation
                                </h3>
                                <p className="mt-1 text-sm" style={{ color: "var(--ax-text-secondary)" }}>
                                    Choose a connection from the left to begin chatting.
                                </p>
                            </div>
                            {friends.length === 0 && !loadingFriends && (
                                <p className="text-xs max-w-xs" style={{ color: "var(--ax-text-faint)" }}>
                                    You have no connections yet. Visit user profiles to send friend requests.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
