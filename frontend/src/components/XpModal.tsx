"use client";

import { motion } from "framer-motion";
import { X, CheckCircle, Lock } from "lucide-react";
import * as Icons from "lucide-react";
import { XP_TITLES } from "@/lib/xp";

interface XpModalProps {
    currentXp: number;
    onClose: () => void;
}

export default function XpModal({ currentXp, onClose }: XpModalProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl"
            >
                <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 py-5">
                    <div>
                        <h2 className="text-xl font-bold text-white">XP Rank Progression</h2>
                        <p className="mt-1 text-sm text-slate-400">
                            Earn XP by posting, uploading notes, and completing plans.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {XP_TITLES.map((title, i) => {
                        const isUnlocked = currentXp >= title.threshold;
                        const isNext = !isUnlocked && (i === 0 || currentXp >= XP_TITLES[i - 1].threshold);
                        const isMaxed = isUnlocked && i === XP_TITLES.length - 1;
                        const IconComponent = (Icons as any)[title.icon] || Icons.Star;

                        return (
                            <motion.div
                                key={title.rank}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className={`relative flex items-center gap-4 rounded-2xl border p-4 transition-all ${isUnlocked
                                        ? "border-slate-700 bg-slate-800/40"
                                        : isNext
                                            ? "border-blue-500/30 bg-blue-500/5"
                                            : "border-slate-800/50 bg-slate-900/30 opacity-60"
                                    }`}
                            >
                                {/* Level Badge */}
                                <div
                                    className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl shadow-inner ${isUnlocked
                                            ? `bg-linear-to-br ${title.gradient} text-white`
                                            : "bg-slate-800 text-slate-500 ring-1 ring-inset ring-slate-700"
                                        }`}
                                >
                                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">Rank</span>
                                    <span className="text-lg font-black leading-none">{title.rank}</span>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <IconComponent
                                            className={`h-5 w-5 ${isUnlocked ? title.color : "text-slate-500"}`}
                                        />
                                        <h3 className={`font-bold truncate ${isUnlocked ? "text-slate-100" : "text-slate-400"}`}>
                                            {title.name}
                                        </h3>
                                    </div>
                                    <p className="mt-1 truncate text-xs text-slate-500">
                                        {title.tagline}
                                    </p>

                                    {/* Progress bar if it's the next rank */}
                                    {isNext && i > 0 && (
                                        <div className="mt-3">
                                            <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-1.5">
                                                <span>{currentXp} XP</span>
                                                <span>{title.threshold} XP</span>
                                            </div>
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                                                <div
                                                    className={`h-full bg-linear-to-r ${title.gradient} transition-all`}
                                                    style={{
                                                        width: `${Math.min(
                                                            100,
                                                            Math.max(
                                                                0,
                                                                ((currentXp - XP_TITLES[i - 1].threshold) /
                                                                    (title.threshold - XP_TITLES[i - 1].threshold)) *
                                                                100
                                                            )
                                                        )}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Status Icon */}
                                <div className="flex flex-col items-end gap-1">
                                    {isUnlocked ? (
                                        <span className="flex items-center justify-center rounded-full bg-emerald-500/10 p-1.5 text-emerald-400">
                                            <CheckCircle className="h-4 w-4" />
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center rounded-full bg-slate-800 p-1.5 text-slate-500">
                                            <Lock className="h-4 w-4" />
                                        </span>
                                    )}
                                    {!isUnlocked && !isNext && (
                                        <span className="text-[10px] font-bold text-slate-600">
                                            {title.threshold} XP
                                        </span>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>
        </motion.div>
    );
}
