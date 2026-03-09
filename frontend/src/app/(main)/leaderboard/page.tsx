"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
    Trophy, Medal, Star, User, ArrowRight,
    Sprout, BookOpen, PenLine, GraduationCap, Lightbulb,
    HeartHandshake, Award, Gem, Crown, MessageSquare, Calendar,
    ChevronDown, ChevronUp, BadgeCheck,
} from "lucide-react";
import { computeAllUsersXP, XP_TITLES, type LeaderboardEntry, type TitleLevel } from "@/lib/xp";

// Map icon name to lucide component
const ICON_MAP: Record<string, React.ElementType> = {
    Sprout, BookOpen, PenLine, GraduationCap, Lightbulb,
    HeartHandshake, Award, Trophy, Gem, Crown,
};

function TitleIcon({ title, size = 16 }: { title: TitleLevel; size?: number }) {
    const Icon = ICON_MAP[title.icon] ?? Star;
    return <Icon className={`${title.color}`} style={{ width: size, height: size }} />;
}

export default function LeaderboardPage() {
    const [users, setUsers] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedUser, setExpandedUser] = useState<string | null>(null);

    useEffect(() => {
        computeAllUsersXP().then((entries) => {
            setUsers(entries);
            setLoading(false);
        });
    }, []);

    return (
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
            <div className="mb-10 flex flex-col items-center text-center">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/30">
                    <Trophy className="h-8 w-8 text-amber-500" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Platform Leaderboard</h1>
                <p className="text-slate-400 max-w-lg">
                    Real rankings based on contributions across Forums, Library, and Planner.
                </p>
            </div>

            {/* Title Legend */}
            <div className="mb-8 flex flex-wrap justify-center gap-2">
                {XP_TITLES.filter((_, i) => i > 0).map((t) => (
                    <div key={t.name} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold border border-slate-700/50 bg-slate-800/40">
                        <TitleIcon title={t} size={12} />
                        <span className={t.color}>{t.name}</span>
                        <span className="text-slate-500">{t.threshold.toLocaleString()}+</span>
                    </div>
                ))}
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-20 w-full ax-skeleton rounded-2xl" />
                    ))}
                </div>
            ) : (
                <div className="space-y-12">
                    {/* Top 3 Podium */}
                    <div className="flex items-end justify-center gap-4 sm:gap-8 px-4 mt-8">
                        {[users[1], users[0], users[2]].map((u, i) => {
                            if (!u) return null;
                            const isFirst = i === 1;
                            const isSecond = i === 0;

                            const heightStr = isFirst ? "h-40" : isSecond ? "h-32" : "h-28";
                            const colorTheme = isFirst
                                ? "bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.2)]"
                                : isSecond
                                    ? "bg-slate-400/20 border-slate-400/50 text-slate-300"
                                    : "bg-orange-700/20 border-orange-700/50 text-orange-400";

                            return (
                                <motion.div
                                    key={u.id}
                                    initial={{ opacity: 0, y: 50 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 + 0.2, type: "spring" }}
                                    className="flex flex-col items-center group relative"
                                >
                                    <div className="mb-4 relative">
                                        <div className={`p-1 rounded-full bg-linear-to-b ${isFirst ? "from-amber-400 to-amber-600" : isSecond ? "from-slate-300 to-slate-500" : "from-orange-400 to-orange-700"}`}>
                                            {u.avatar_url ? (
                                                <Image src={u.avatar_url} alt={u.display_name} width={isFirst ? 80 : 64} height={isFirst ? 80 : 64} className={`rounded-full object-cover ${isFirst ? "w-20 h-20" : "w-16 h-16"}`} unoptimized />
                                            ) : (
                                                <div className={`flex items-center justify-center rounded-full bg-slate-900 ${isFirst ? "w-20 h-20" : "w-16 h-16"}`}>
                                                    <User className="w-1/2 h-1/2 text-slate-400" />
                                                </div>
                                            )}
                                        </div>
                                        {isFirst && <Medal className="absolute -bottom-2 -right-2 h-8 w-8 text-amber-500 drop-shadow-lg" />}
                                    </div>

                                    <Link href={`/users/${u.id}`} className="text-center hover:scale-105 transition-transform z-10 w-full">
                                        <div className={`w-36 sm:w-48 rounded-t-2xl border-t border-l border-r p-4 backdrop-blur-md flex flex-col items-center justify-end ${heightStr} ${colorTheme}`}>
                                            <h3 className="flex items-center justify-center gap-1 font-bold text-white w-full text-center text-[13px] sm:text-base leading-tight">
                                                <span className="break-words">{u.display_name}</span>
                                                {u.is_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-blue-400" />}
                                            </h3>
                                            <div className="flex items-center gap-1 text-xs font-semibold mb-2 opacity-80">
                                                <TitleIcon title={u.title} size={12} />
                                                {u.title.name}
                                            </div>
                                            <div className="mt-auto flex items-center gap-1.5 text-sm font-bold bg-black/30 px-3 py-1 rounded-full">
                                                <Star className="w-3.5 h-3.5 fill-current" />
                                                {u.totalXP.toLocaleString()}
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* List View */}
                    <div className="ax-card overflow-hidden">
                        <div className="bg-slate-900/80 p-3 sm:p-4 grid grid-cols-[2rem_1fr_4rem] sm:grid-cols-[3rem_1fr_8rem_8rem] gap-2 sm:gap-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800">
                            <div className="text-center">#</div>
                            <div>Contributor</div>
                            <div className="text-right hidden sm:block">Title</div>
                            <div className="text-right">XP</div>
                        </div>
                        <div className="divide-y divide-slate-800/60">
                            {users.slice(3).map((u, i) => (
                                <div key={u.id}>
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="grid grid-cols-[2rem_1fr_4rem] sm:grid-cols-[3rem_1fr_8rem_8rem] gap-2 sm:gap-4 p-3 sm:p-4 items-center hover:bg-slate-800/40 transition-colors group cursor-pointer"
                                        onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                                    >
                                        <div className="text-center font-bold text-xs sm:text-sm" style={{ color: "var(--ax-text-muted)" }}>{u.rank}</div>
                                        <Link href={`/users/${u.id}`} className="flex items-center gap-2 sm:gap-3 min-w-0" onClick={(e) => e.stopPropagation()}>
                                            {u.avatar_url ? (
                                                <Image src={u.avatar_url} alt={u.display_name} width={36} height={36} className="w-7 h-7 sm:w-9 sm:h-9 rounded-full object-cover ring-1 ring-slate-700" unoptimized />
                                            ) : (
                                                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 text-[9px] sm:text-[11px] font-bold text-white ring-1 ring-slate-700">
                                                    {(u.display_name ?? "?").charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-slate-200 truncate group-hover:text-white transition">
                                                    {u.display_name}
                                                    {u.is_verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-blue-400" />}
                                                </p>
                                            </div>
                                        </Link>
                                        <div className="hidden sm:flex items-center justify-end gap-1">
                                            <TitleIcon title={u.title} size={14} />
                                            <span className={`text-xs font-semibold ${u.title.color}`}>{u.title.name}</span>
                                        </div>
                                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                                            <span className="text-xs sm:text-sm font-bold text-amber-400">{u.totalXP.toLocaleString()}</span>
                                            {expandedUser === u.id ? <ChevronUp className="h-3.5 w-3.5 text-slate-500" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-500" />}
                                        </div>
                                    </motion.div>

                                    {/* Expanded XP Breakdown */}
                                    {expandedUser === u.id && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="px-4 pb-4 ml-[3rem]"
                                        >
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="rounded-xl p-3 bg-indigo-500/10 border border-indigo-500/20">
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
                                                        <span className="text-[10px] font-bold uppercase text-indigo-400">Forum</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-white">{u.forumXP} XP</p>
                                                </div>
                                                <div className="rounded-xl p-3 bg-amber-500/10 border border-amber-500/20">
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <BookOpen className="h-3.5 w-3.5 text-amber-400" />
                                                        <span className="text-[10px] font-bold uppercase text-amber-400">Library</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-white">{u.libraryXP} XP</p>
                                                </div>
                                                <div className="rounded-xl p-3 bg-violet-500/10 border border-violet-500/20">
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <Calendar className="h-3.5 w-3.5 text-violet-400" />
                                                        <span className="text-[10px] font-bold uppercase text-violet-400">Planner</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-white">{u.plannerXP} XP</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {users.length === 0 && (
                        <div className="text-center py-16">
                            <Trophy className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-400">No users yet. Be the first to contribute!</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
