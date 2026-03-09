"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/hooks/useUser";
import { motion, AnimatePresence } from "framer-motion";
import {
    Medal,
    CheckCircle2,
    Lock,
    Crown,
    Loader2,
    ChevronDown,
    ChevronUp,
    Info,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { LIBRARY_RANKS, getLibraryRank, getNextLibraryRank } from "@/lib/library-ranks";
import {
    ALL_LIB_MILESTONES,
    TIER_STYLE,
    XP_SOURCES,
    computeLibraryStats,
    calcLibXP,
    type UserStats,
    type MilestoneDef,
} from "@/lib/library-milestones";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NoteRow {
    id: string;
    user_id: string;
    uploader_name: string | null;
    title: string;
    subject: string;
    downloads_count: number | null;
    avg_rating: number | null;
    views_count: number | null;
    created_at: string | null;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function XPCard({ xp, stats }: { xp: number; stats: UserStats }) {
    const rank = getLibraryRank(xp);
    const nextRank = getNextLibraryRank(xp);

    const xpIntoLevel = nextRank ? xp - rank.minXp : 100;
    const levelRange = nextRank ? nextRank.minXp - rank.minXp : 100;
    const progressPct = nextRank ? Math.min(100, Math.max(0, (xpIntoLevel / levelRange) * 100)) : 100;

    const achievedCount = ALL_LIB_MILESTONES.filter((m) => m.check(stats)).length;
    const RankIcon = rank.icon;

    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4 shadow-lg shadow-black/20 relative overflow-hidden">
            <div className={`absolute -right-8 -top-8 w-40 h-40 rounded-full blur-3xl opacity-20 ${rank.bgHover}`} />

            <div className="flex items-center gap-4 relative">
                <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-950/50 border border-slate-800 backdrop-blur-sm ${rank.glow}`}>
                    <RankIcon className={`h-8 w-8 ${rank.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                        <h2 className={`text-lg font-bold ${rank.color}`}>{rank.name}</h2>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${rank.borderX} ${rank.color} bg-slate-950/50 backdrop-blur-sm`}>
                            Rank
                        </span>
                    </div>
                    <div className="mt-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold">
                            <span className="text-slate-300">{xp} / {nextRank ? nextRank.minXp : "MAX"} XP</span>
                            <span className="text-slate-500">{nextRank ? `${nextRank.minXp - xp} XP to next` : "Max Rank"}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-950/50 border border-slate-800/80">
                            <motion.div
                                className={`h-full rounded-full ${rank.color.replace("text-", "bg-")}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPct}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-3 pt-3 border-t border-slate-800/50 relative">
                {[
                    { label: "Uploaded", value: stats.uploadCount, color: "text-blue-400" },
                    { label: "Downloads", value: stats.totalDownloads, color: "text-emerald-400" },
                    { label: "Views", value: stats.totalViews, color: "text-violet-400" },
                    { label: "Badges", value: achievedCount, color: "text-amber-400" },
                ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-xl border border-slate-800/60 bg-slate-950/30 p-3 text-center">
                        <p className={`text-xl font-bold ${color}`}>{value}</p>
                        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mt-1">{label}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function HowXPIsGained() {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/40 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                        <Info className="h-4 w-4 text-blue-400" />
                    </div>
                    <span className="text-sm font-semibold text-slate-200">How XP is Earned</span>
                </div>
                {expanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
            </button>
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-slate-800/50"
                    >
                        <div className="p-5 space-y-3">
                            <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                Earn XP by sharing knowledge and engaging with the community. Here&apos;s how you can level up:
                            </p>
                            <div className="grid gap-2.5">
                                {XP_SOURCES.map(({ icon: Icon, label, xp, color, bg }) => (
                                    <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-800/50 bg-slate-950/30 px-4 py-3">
                                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                                            <Icon className={`h-4 w-4 ${color}`} />
                                        </div>
                                        <span className="flex-1 text-[13px] text-slate-300">{label}</span>
                                        <span className={`text-xs font-bold ${color}`}>{xp}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-800/50">
                                💡 Completing milestones in each category also grants bonus XP. The more you contribute, the faster you rank up!
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function RankLadder({ xp }: { xp: number }) {
    return (
        <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Crown className="h-4 w-4 text-amber-500" /> Rank Progression
            </h3>
            <div className="space-y-2">
                {LIBRARY_RANKS.map((rank, i) => {
                    const isAchieved = xp >= rank.minXp;
                    const isCurrent = xp >= rank.minXp && (i === LIBRARY_RANKS.length - 1 || xp < LIBRARY_RANKS[i + 1].minXp);
                    const isNext = !isAchieved && (i === 0 || xp >= LIBRARY_RANKS[i - 1].minXp);
                    const RankIcon = rank.icon;

                    return (
                        <div key={rank.name} className="flex items-center gap-3">
                            {/* Connector dot */}
                            <div className="flex flex-col items-center w-4">
                                <div className={`h-3 w-3 rounded-full border-2 ${isAchieved ? `${rank.borderX} ${rank.color.replace("text-", "bg-")}` : "border-slate-700 bg-slate-900"}`} />
                                {i < LIBRARY_RANKS.length - 1 && (
                                    <div className={`w-0.5 h-6 ${isAchieved ? "bg-slate-700" : "bg-slate-800/50"}`} />
                                )}
                            </div>

                            {/* Rank card */}
                            <div className={`relative flex-1 flex items-center gap-3 rounded-xl border p-3 transition-all
                                ${isCurrent ? "bg-slate-900 border-slate-700 shadow-md ring-1 ring-slate-700" :
                                    isAchieved ? "bg-slate-900/40 border-slate-800/50" :
                                        "bg-slate-950/30 border-slate-800/30 opacity-50"}`}>

                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border backdrop-blur-sm
                                    ${isAchieved ? `${rank.glow} ${rank.borderX} bg-slate-950/80` : "border-slate-800 bg-slate-900"}`}>
                                    <RankIcon className={`h-4.5 w-4.5 ${isAchieved ? rank.color : "text-slate-600"}`} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className={`text-sm font-bold truncate ${isAchieved ? rank.color : "text-slate-500"}`}>
                                            {rank.name}
                                        </p>
                                        <span className={`text-[10px] font-bold tracking-wider ${isAchieved ? "text-slate-400" : "text-slate-600"}`}>
                                            {rank.minXp} XP
                                        </span>
                                    </div>
                                    {isCurrent && (
                                        <p className="text-[10px] text-emerald-400 mt-0.5 font-medium">✦ Current Rank</p>
                                    )}
                                    {isNext && (
                                        <p className="text-[10px] text-slate-500 mt-0.5">{(rank.minXp - xp)} XP needed</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function MilestonesSection({ stats }: { stats: UserStats }) {
    const categories = ["Upload", "Engagement", "Downloads", "Quality", "Bookmarks", "Consistency"];
    const [open, setOpen] = useState<Set<string>>(new Set(categories));
    const toggleCat = (c: string) => setOpen((prev) => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n; });

    return (
        <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Medal className="h-4 w-4 text-blue-500" /> Badges & Achievements
            </h3>
            {categories.map((cat) => {
                const items = ALL_LIB_MILESTONES.filter((m) => m.category === cat);
                const earned = items.filter((m) => m.check(stats)).length;
                const isOpen = open.has(cat);
                return (
                    <div key={cat} className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
                        <button
                            onClick={() => toggleCat(cat)}
                            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/40 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-slate-200">{cat} Milestones</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${earned === items.length ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20" : "text-slate-500 bg-slate-800"}`}>
                                    {earned}/{items.length}
                                </span>
                            </div>
                            {isOpen ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                        </button>
                        <AnimatePresence>
                            {isOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden border-t border-slate-800/50"
                                >
                                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {items.map((m) => {
                                            const achieved = m.check(stats);
                                            const ts = TIER_STYLE[m.tier];
                                            const Icon = m.icon;
                                            return (
                                                <motion.div
                                                    key={m.id}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`relative rounded-xl border p-4 transition-all ${achieved
                                                        ? `${ts.badge} shadow-md ${ts.glow}`
                                                        : "border-slate-800/50 bg-slate-900/40 opacity-50"
                                                        }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${achieved ? "bg-slate-800/50" : "bg-slate-800"}`}>
                                                            {achieved
                                                                ? <Icon className="h-4.5 w-4.5" />
                                                                : <Lock className="h-4 w-4 text-slate-500" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-semibold leading-tight text-slate-100">{m.label}</p>
                                                                <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${ts.badge}`}>{ts.label}</span>
                                                            </div>
                                                            <p className="text-[11px] text-slate-400 mt-0.5">{m.description}</p>
                                                        </div>
                                                        <span className={`shrink-0 text-xs font-bold ${achieved ? "text-emerald-400" : "text-slate-600"}`}>
                                                            +{m.xp} XP
                                                        </span>
                                                    </div>
                                                    {achieved && (
                                                        <CheckCircle2 className="absolute right-3 bottom-3 h-3.5 w-3.5 text-emerald-400" />
                                                    )}
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LibraryMilestonesPage() {
    const { userId } = useUser();
    const [loading, setLoading] = useState(true);
    const [userStats, setUserStats] = useState<UserStats>({
        uploadCount: 0, totalDownloads: 0, totalViews: 0, totalBookmarks: 0, totalRatings: 0,
        topNoteDownloads: 0, topNoteViews: 0, notesAbove50Downloads: 0, notesAbove100Views: 0,
        subjectsUploaded: new Set(), consecutiveWeeks: 0, avgRatingAbove4Count: 0
    });
    const [xp, setXp] = useState(0);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const { data: all } = await supabase
                    .from("notes")
                    .select("id, user_id, uploader_name, title, subject, downloads_count, avg_rating, views_count, created_at")
                    .order("downloads_count", { ascending: false });
                const rows = (all ?? []) as NoteRow[];

                if (userId) {
                    const myUploadedNotes = rows.filter((n) => n.user_id === userId);

                    let viewCount = 0;
                    let bookmarkCount = 0;

                    if (myUploadedNotes.length > 0) {
                        const noteIds = myUploadedNotes.map(n => n.id);
                        const { data: interactions } = await supabase
                            .from("library_interactions")
                            .select("interaction_type")
                            .in("note_id", noteIds)
                            .in("interaction_type", ["view", "bookmark"]);

                        if (interactions) {
                            viewCount = interactions.filter((i: any) => i.interaction_type === "view").length;
                            bookmarkCount = interactions.filter((i: any) => i.interaction_type === "bookmark").length;
                        }
                    }

                    const computedStats = computeLibraryStats(myUploadedNotes, viewCount, bookmarkCount);
                    setUserStats(computedStats);
                    setXp(calcLibXP(computedStats));
                }
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [userId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Library Milestones</h1>
                <p className="text-sm text-slate-400 mt-0.5">
                    Earn XP, unlock badges, and climb the ranks by contributing to the community.
                </p>
            </div>

            {userId ? (
                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-6">
                        <XPCard xp={xp} stats={userStats} />
                        <HowXPIsGained />
                        <MilestonesSection stats={userStats} />
                    </div>
                    <div className="space-y-5">
                        <RankLadder xp={xp} />
                    </div>
                </div>
            ) : (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
                    <Medal className="h-8 w-8 text-slate-700 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">Sign in to see your personal milestones and XP.</p>
                </div>
            )}
        </div>
    );
}
