"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy, Medal, Star, ChevronUp, User, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface LeaderboardUser {
    id: string;
    display_name: string;
    avatar_url: string | null;
    xp: number;
    level: "Master" | "Scholar" | "Novice";
    rank: number;
}

// Pseudo-random number generator based on a string seed to ensure 
// stable mock XP scores for unchanged IDs.
function generateSeedScore(id: string) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = ((hash << 5) - hash) + id.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash % 9000) + 1000; // Scores between 1000 and 10000
}

export default function LeaderboardPage() {
    const [users, setUsers] = useState<LeaderboardUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLeaders() {
            const { data } = await supabase
                .from("user_profiles")
                .select("id, display_name, avatar_url")
                .limit(50);

            const mapped: LeaderboardUser[] = (data || []).map(u => {
                const xp = generateSeedScore(u.id);
                const level = xp > 7000 ? "Master" : xp > 3000 ? "Scholar" : "Novice";
                return {
                    id: u.id,
                    display_name: u.display_name || `User ${u.id.slice(0, 4)}`,
                    avatar_url: u.avatar_url,
                    xp,
                    level,
                    rank: 0
                };
            });

            // Sort by XP descending
            mapped.sort((a, b) => b.xp - a.xp);
            mapped.forEach((u, i) => { u.rank = i + 1; });

            setUsers(mapped);
            setLoading(false);
        }
        fetchLeaders();
    }, []);

    return (
        <div className="mx-auto max-w-5xl px-6 py-10">
            <div className="mb-10 flex flex-col items-center text-center">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/30">
                    <Trophy className="h-8 w-8 text-amber-500" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Platform Leaderboard</h1>
                <p className="text-slate-400 max-w-lg">
                    Recognizing the top contributors and scholars driving knowledge across the network.
                </p>
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
                            const isThird = i === 2;

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
                                                <img src={u.avatar_url} className={`rounded-full object-cover ${isFirst ? "w-20 h-20" : "w-16 h-16"}`} />
                                            ) : (
                                                <div className={`flex items-center justify-center rounded-full bg-slate-900 ${isFirst ? "w-20 h-20" : "w-16 h-16"}`}>
                                                    <User className="w-1/2 h-1/2 text-slate-400" />
                                                </div>
                                            )}
                                        </div>
                                        {isFirst && <Medal className="absolute -bottom-2 -right-2 h-8 w-8 text-amber-500 drop-shadow-lg" />}
                                    </div>

                                    <Link href={`/users/${u.id}`} className="text-center hover:scale-105 transition-transform z-10 w-full">
                                        <div className={`w-32 sm:w-40 rounded-t-2xl border-t border-l border-r p-4 backdrop-blur-md flex flex-col items-center justify-end ${heightStr} ${colorTheme}`}>
                                            <h3 className="font-bold text-white truncate w-full text-center">{u.display_name}</h3>
                                            <p className="text-xs font-semibold mb-2 opacity-80">{u.level}</p>
                                            <div className="mt-auto flex items-center gap-1.5 text-sm font-bold bg-black/30 px-3 py-1 rounded-full">
                                                <Star className="w-3.5 h-3.5 fill-current" />
                                                {u.xp.toLocaleString()}
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* List View */}
                    <div className="ax-card overflow-hidden">
                        <div className="bg-slate-900/80 p-4 grid grid-cols-[3rem_1fr_6rem_8rem] gap-4 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800">
                            <div className="text-center">Rank</div>
                            <div>Contributor</div>
                            <div className="text-right">Level</div>
                            <div className="text-right">Total XP</div>
                        </div>
                        <div className="divide-y divide-slate-800/60">
                            {users.slice(3).map((u, i) => (
                                <Link href={`/users/${u.id}`} key={u.id}>
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="grid grid-cols-[3rem_1fr_6rem_8rem] gap-4 p-4 items-center hover:bg-slate-800/40 transition-colors group cursor-pointer"
                                    >
                                        <div className="text-center font-bold text-slate-500 group-hover:text-slate-300">
                                            {u.rank}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {u.avatar_url ? (
                                                <img src={u.avatar_url} className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-800" />
                                            ) : (
                                                <div className="flex w-10 h-10 items-center justify-center rounded-full bg-slate-800 ring-1 ring-slate-700">
                                                    <User className="w-4 h-4 text-slate-400" />
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-semibold text-slate-200 group-hover:text-amber-400 transition-colors">{u.display_name}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><ChevronUp className="w-3 h-3 text-emerald-500" /> Top {(u.rank / users.length * 100).toFixed(0)}%</div>
                                            </div>
                                        </div>
                                        <div className="text-right text-sm">
                                            <span className={`px-2.5 py-1 rounded-md bg-slate-800 text-xs font-semibold ${u.level === "Scholar" ? "text-blue-400" : "text-slate-400"}`}>{u.level}</span>
                                        </div>
                                        <div className="text-right font-mono font-semibold text-amber-500 flex items-center justify-end gap-2">
                                            {u.xp.toLocaleString()} XP
                                            <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-amber-500 opacity-0 group-hover:-translate-x-1 group-hover:opacity-100 transition-all" />
                                        </div>
                                    </motion.div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
