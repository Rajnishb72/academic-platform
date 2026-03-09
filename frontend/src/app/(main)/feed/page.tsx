"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@/hooks/useUser";
import { fetchUserFeed, type FeedItem } from "@/lib/feed";
import { motion, AnimatePresence } from "framer-motion";
import {
    MessageSquare,
    BookOpen,
    School,
    Clock,
    ArrowRight,
    TrendingUp,
    Download,
    Eye,
    Loader2,
    Waves,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const TABS = ["For You", "Friends", "Campus", "Trending"];

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString();
}

export default function FeedPage() {
    const { user, isLoaded } = useUser();
    const [activeTab, setActiveTab] = useState("For You");
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadFeed = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const data = await fetchUserFeed(user.id);
        setFeed(data);
        setLoading(false);
    }, [user]);

    useEffect(() => {
        if (isLoaded && user) loadFeed();
    }, [isLoaded, user, loadFeed]);

    // Client-side filtering skeleton based on tabs
    const filteredFeed = feed.filter((item) => {
        if (activeTab === "Campus") return item.type === "campus";
        // For now "For You", "Friends", and "Trending" share the same default query from fetchUserFeed
        return true;
    });

    return (
        <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:max-w-4xl lg:mx-auto">
            {/* ── Header ── */}
            <div className="sticky top-16 z-20 border-b px-4 py-4 backdrop-blur-md transition-all lg:mt-8 lg:rounded-t-3xl lg:border-x lg:border-t"
                style={{ borderColor: "var(--ax-border)", background: "rgba(5, 8, 22, 0.85)" }}>
                <h1 className="text-xl font-black tracking-tight ax-gradient-text lg:text-3xl">Your Feed</h1>
                <p className="mt-1 text-sm font-medium" style={{ color: "var(--ax-text-faint)" }}>
                    The latest from your network and campus.
                </p>

                {/* ── Sub-Navbar ── */}
                <nav className="mt-4 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab;
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex shrink-0 items-center justify-center rounded-xl px-4 py-2 text-sm font-bold transition-all ${isActive
                                        ? "bg-blue-600 font-bold text-white shadow-lg shadow-blue-500/20"
                                        : "bg-[var(--ax-surface-2)] text-[var(--ax-text-muted)] hover:bg-[var(--ax-surface-3)] hover:text-white"
                                    }`}
                                style={!isActive ? { border: "1px solid var(--ax-border)" } : undefined}
                            >
                                {tab}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* ── Feed Content Area ── */}
            <div className="flex-1 p-4 lg:border-x lg:border-[var(--ax-border)] pb-24">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        <p className="mt-4 text-sm font-medium text-slate-400">Loading timeline...</p>
                    </div>
                ) : filteredFeed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-[var(--ax-border)] bg-[var(--ax-surface-1)] shadow-inner">
                            <Waves className="h-10 w-10 text-blue-500/60" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Quiet in here...</h2>
                        <p className="mt-2 max-w-sm text-sm" style={{ color: "var(--ax-text-muted)" }}>
                            Follow more colleagues, join a campus, or make a post to get your timeline moving.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <AnimatePresence mode="popLayout">
                            {filteredFeed.map((item, i) => (
                                <motion.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="ax-card group flex flex-col gap-3 p-4 sm:p-5"
                                >
                                    {/* Top row: author + type badge */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            {item.authorAvatar && item.authorAvatar.startsWith("http") ? (
                                                <Image src={item.authorAvatar} alt={item.authorName} width={36} height={36} className="rounded-full object-cover ring-2 ring-white/10" />
                                            ) : (
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white shadow-sm">
                                                    {item.authorAvatar || item.authorName[0]}
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-bold text-indigo-100">{item.authorName}</p>
                                                <div className="flex items-center gap-1 text-[10px] sm:text-xs" style={{ color: "var(--ax-text-faint)" }}>
                                                    <Clock className="h-3 w-3" />
                                                    {timeAgo(item.createdAt)}
                                                    {item.category && (
                                                        <>
                                                            <span className="mx-1">•</span>
                                                            <span className="text-blue-400 font-semibold">{item.category}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`flex items-center justify-center rounded-full px-2 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wide
                      ${item.type === "post" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : ""}
                      ${item.type === "note" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : ""}
                      ${item.type === "campus" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : ""}
                    `}>
                                            {item.type === "post" && <MessageSquare className="mr-1 h-3 w-3" />}
                                            {item.type === "note" && <BookOpen className="mr-1 h-3 w-3" />}
                                            {item.type === "campus" && <School className="mr-1 h-3 w-3" />}
                                            {item.type}
                                        </div>
                                    </div>

                                    {/* Body Content */}
                                    <div className="mt-1">
                                        <h3 className="text-base font-bold text-white sm:text-lg">{item.title}</h3>
                                        {item.excerpt && (
                                            <p className="mt-1.5 text-xs sm:text-sm leading-relaxed" style={{ color: "var(--ax-text-secondary)" }}>
                                                {item.excerpt}
                                            </p>
                                        )}
                                    </div>

                                    {/* Footer Metrics & Link */}
                                    <div className="mt-3 flex items-center justify-between border-t border-[var(--ax-border)] pt-3">
                                        <div className="flex items-center gap-3">
                                            {item.type === "post" && (
                                                <>
                                                    <div className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">
                                                        <TrendingUp className="h-3 w-3" /> {item.metrics?.upvotes ?? 0}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[10px] sm:text-xs font-medium text-slate-400 hover:text-white transition">
                                                        <MessageSquare className="h-3 w-3" /> {item.metrics?.comments ?? 0}
                                                    </div>
                                                </>
                                            )}
                                            {item.type === "note" && (
                                                <>
                                                    <div className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md">
                                                        <Download className="h-3 w-3" /> {item.metrics?.downloads ?? 0}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[10px] sm:text-xs font-medium text-slate-400 hover:text-white transition">
                                                        <Eye className="h-3 w-3" /> {item.metrics?.views ?? 0}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <Link
                                            href={item.url}
                                            className="group/btn flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-indigo-400 transition-colors hover:bg-indigo-500/10 hover:text-indigo-300"
                                        >
                                            View <ArrowRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-0.5" />
                                        </Link>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
