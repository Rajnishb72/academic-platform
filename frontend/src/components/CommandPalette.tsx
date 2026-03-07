"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search, X, LayoutDashboard, BookOpen, MessageSquare, School,
    Bot, BarChart2, Calendar, ArrowRight, FileText, MessageCircle,
    Upload, Sparkles, Hash, Clock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* ── Types ─────────────────────────────────────────────────────────────── */
interface SearchResult {
    id: string;
    title: string;
    type: "note" | "post";
    subject?: string;
    created_at?: string;
}

/* ── Quick Links ───────────────────────────────────────────────────────── */
const QUICK_LINKS = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, color: "text-blue-400", section: "Navigate" },
    { label: "Library", href: "/library", icon: BookOpen, color: "text-amber-400", section: "Navigate" },
    { label: "Forums", href: "/forums", icon: MessageSquare, color: "text-indigo-400", section: "Navigate" },
    { label: "Campus", href: "/campus", icon: School, color: "text-emerald-400", section: "Navigate" },
    { label: "AI Lab", href: "/ai-lab", icon: Bot, color: "text-pink-400", section: "Navigate" },
    { label: "Insights", href: "/insights", icon: BarChart2, color: "text-cyan-400", section: "Navigate" },
    { label: "Planner", href: "/planner", icon: Calendar, color: "text-violet-400", section: "Navigate" },
    { label: "Upload Note", href: "/library/upload", icon: Upload, color: "text-amber-400", section: "Actions" },
    { label: "Create Post", href: "/forums/create", icon: MessageCircle, color: "text-indigo-400", section: "Actions" },
    { label: "New Study Plan", href: "/planner", icon: Sparkles, color: "text-violet-400", section: "Actions" },
];

/* ── Component ─────────────────────────────────────────────────────────── */
export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    /* ── Open/close with ⌘K ───────────────────────────────────────────── */
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setOpen((o) => !o);
            }
            if (e.key === "Escape") setOpen(false);
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    /* ── Focus on open ────────────────────────────────────────────────── */
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setQuery("");
            setResults([]);
            setSelectedIndex(0);
        }
    }, [open]);

    /* ── Search with debounce ─────────────────────────────────────────── */
    const search = useCallback(async (q: string) => {
        if (!q.trim()) { setResults([]); return; }
        setSearching(true);
        try {
            const [notesRes, postsRes] = await Promise.all([
                supabase.from("notes").select("id,title,subject,created_at")
                    .ilike("title", `%${q}%`).limit(5),
                supabase.from("forum_posts").select("id,title,created_at")
                    .ilike("title", `%${q}%`).limit(5),
            ]);
            const notes: SearchResult[] = (notesRes.data ?? []).map((n) => ({
                id: n.id, title: n.title, type: "note" as const,
                subject: n.subject, created_at: n.created_at,
            }));
            const posts: SearchResult[] = (postsRes.data ?? []).map((p) => ({
                id: p.id, title: p.title, type: "post" as const,
                created_at: p.created_at,
            }));
            setResults([...notes, ...posts]);
            setSelectedIndex(0);
        } catch { /* ignore */ }
        setSearching(false);
    }, []);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(query), 250);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query, search]);

    /* ── Filtered quick links ─────────────────────────────────────────── */
    const filteredLinks = query.trim()
        ? QUICK_LINKS.filter((l) => l.label.toLowerCase().includes(query.toLowerCase()))
        : QUICK_LINKS;

    /* ── Navigate ─────────────────────────────────────────────────────── */
    function navigate(href: string) {
        setOpen(false);
        router.push(href);
    }

    /* ── All selectable items ────────────────────────────────────────── */
    const allItems = [
        ...filteredLinks.map((l) => ({ key: l.href, href: l.href })),
        ...results.map((r) => ({
            key: r.id,
            href: r.type === "note" ? "/library" : `/forums`,
        })),
    ];

    /* ── Keyboard Navigation ─────────────────────────────────────────── */
    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter" && allItems[selectedIndex]) {
            e.preventDefault();
            navigate(allItems[selectedIndex].href);
        }
    }

    if (!open) return null;

    const navLinks = filteredLinks.filter((l) => l.section === "Navigate");
    const actionLinks = filteredLinks.filter((l) => l.section === "Actions");

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
                onClick={() => setOpen(false)}
            >
                {/* Backdrop */}
                <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "rgba(5, 8, 22, 0.75)" }} />

                {/* Palette */}
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl"
                    style={{ border: "1px solid var(--ax-border)", background: "var(--ax-surface-1)" }}
                >
                    {/* ── Search input ── */}
                    <div className="flex items-center gap-3 px-4" style={{ borderBottom: "1px solid var(--ax-border)" }}>
                        <Search className="h-4 w-4 shrink-0" style={{ color: "var(--ax-text-faint)" }} />
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Search or jump to…"
                            className="h-12 flex-1 bg-transparent text-sm outline-none"
                            style={{ color: "var(--ax-text-primary)" }}
                        />
                        {query && (
                            <button onClick={() => setQuery("")} className="text-slate-500 hover:text-slate-300 transition">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                        <kbd className="flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-medium"
                            style={{ color: "var(--ax-text-faint)", borderColor: "var(--ax-border)", background: "var(--ax-surface-2)" }}>
                            ESC
                        </kbd>
                    </div>

                    {/* ── Results body ── */}
                    <div className="max-h-80 overflow-y-auto p-2" style={{ scrollbarWidth: "none" }}>
                        {/* Navigation */}
                        {navLinks.length > 0 && (
                            <div className="mb-1">
                                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ax-text-faint)" }}>
                                    Navigate
                                </p>
                                {navLinks.map((link) => {
                                    const idx = allItems.findIndex((a) => a.key === link.href);
                                    const Icon = link.icon;
                                    return (
                                        <button
                                            key={link.href}
                                            onClick={() => navigate(link.href)}
                                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors
                        ${idx === selectedIndex ? "bg-[var(--ax-surface-hover)]" : "hover:bg-[var(--ax-surface-hover)]"}`}
                                        >
                                            <Icon className={`h-4 w-4 shrink-0 ${link.color}`} />
                                            <span className="flex-1 font-medium" style={{ color: "var(--ax-text-primary)" }}>{link.label}</span>
                                            <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100" style={{ color: "var(--ax-text-faint)" }} />
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Actions */}
                        {actionLinks.length > 0 && (
                            <div className="mb-1">
                                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ax-text-faint)" }}>
                                    Quick Actions
                                </p>
                                {actionLinks.map((link) => {
                                    const idx = allItems.findIndex((a) => a.key === link.href);
                                    const Icon = link.icon;
                                    return (
                                        <button
                                            key={link.href}
                                            onClick={() => navigate(link.href)}
                                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors
                        ${idx === selectedIndex ? "bg-[var(--ax-surface-hover)]" : "hover:bg-[var(--ax-surface-hover)]"}`}
                                        >
                                            <Icon className={`h-4 w-4 shrink-0 ${link.color}`} />
                                            <span className="flex-1 font-medium" style={{ color: "var(--ax-text-primary)" }}>{link.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Search results */}
                        {query.trim() && results.length > 0 && (
                            <div className="mb-1">
                                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ax-text-faint)" }}>
                                    Search Results
                                </p>
                                {results.map((r) => {
                                    const idx = allItems.findIndex((a) => a.key === r.id);
                                    const isNote = r.type === "note";
                                    return (
                                        <button
                                            key={r.id}
                                            onClick={() => navigate(isNote ? "/library" : "/forums")}
                                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors
                        ${idx === selectedIndex ? "bg-[var(--ax-surface-hover)]" : "hover:bg-[var(--ax-surface-hover)]"}`}
                                        >
                                            {isNote
                                                ? <FileText className="h-4 w-4 shrink-0 text-amber-400" />
                                                : <Hash className="h-4 w-4 shrink-0 text-indigo-400" />
                                            }
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium" style={{ color: "var(--ax-text-primary)" }}>{r.title}</p>
                                                <p className="text-[10px]" style={{ color: "var(--ax-text-faint)" }}>
                                                    {isNote ? `Note · ${r.subject ?? "General"}` : "Forum Post"}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Searching indicator */}
                        {searching && (
                            <div className="flex items-center justify-center gap-2 py-6">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                                <span className="text-xs" style={{ color: "var(--ax-text-muted)" }}>Searching…</span>
                            </div>
                        )}

                        {/* No results */}
                        {query.trim() && !searching && results.length === 0 && filteredLinks.length === 0 && (
                            <div className="flex flex-col items-center gap-2 py-8 text-center">
                                <Search className="h-6 w-6" style={{ color: "var(--ax-text-faint)" }} />
                                <p className="text-sm" style={{ color: "var(--ax-text-muted)" }}>No results for &ldquo;{query}&rdquo;</p>
                            </div>
                        )}
                    </div>

                    {/* ── Footer shortcut hints ── */}
                    <div className="flex items-center gap-4 border-t px-4 py-2" style={{ borderColor: "var(--ax-border)" }}>
                        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--ax-text-faint)" }}>
                            <kbd className="rounded border px-1 py-0.5" style={{ borderColor: "var(--ax-border)", background: "var(--ax-surface-2)" }}>↑</kbd>
                            <kbd className="rounded border px-1 py-0.5" style={{ borderColor: "var(--ax-border)", background: "var(--ax-surface-2)" }}>↓</kbd>
                            <span>to navigate</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--ax-text-faint)" }}>
                            <kbd className="rounded border px-1.5 py-0.5" style={{ borderColor: "var(--ax-border)", background: "var(--ax-surface-2)" }}>↵</kbd>
                            <span>to select</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--ax-text-faint)" }}>
                            <kbd className="rounded border px-1 py-0.5" style={{ borderColor: "var(--ax-border)", background: "var(--ax-surface-2)" }}>esc</kbd>
                            <span>to close</span>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
