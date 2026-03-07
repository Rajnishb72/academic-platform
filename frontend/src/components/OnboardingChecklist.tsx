"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircle2,
    Circle,
    Upload,
    MessageSquare,
    Users,
    Calendar,
    Bot,
    ChevronDown,
    ChevronUp,
    Sparkles,
    X,
} from "lucide-react";

interface ChecklistItem {
    id: string;
    label: string;
    description: string;
    href: string;
    icon: typeof Upload;
    color: string;
    check: (stats: OnboardingStats) => boolean;
}

interface OnboardingStats {
    uploads: number;
    posts: number;
    groups: number;
    plans: number;
    aiUsed: boolean;
}

const CHECKLIST: ChecklistItem[] = [
    {
        id: "upload",
        label: "Upload your first note",
        description: "Share study materials with the community",
        href: "/library/upload",
        icon: Upload,
        color: "text-amber-400",
        check: (s) => s.uploads > 0,
    },
    {
        id: "post",
        label: "Create a forum post",
        description: "Ask a question or share knowledge",
        href: "/forums/create",
        icon: MessageSquare,
        color: "text-indigo-400",
        check: (s) => s.posts > 0,
    },
    {
        id: "group",
        label: "Join a campus group",
        description: "Connect with your classmates",
        href: "/campus/join",
        icon: Users,
        color: "text-emerald-400",
        check: (s) => s.groups > 0,
    },
    {
        id: "plan",
        label: "Create a study plan",
        description: "AI-powered scheduling for your exams",
        href: "/planner",
        icon: Calendar,
        color: "text-violet-400",
        check: (s) => s.plans > 0,
    },
    {
        id: "ai",
        label: "Try the AI Lab",
        description: "Analyze notes and generate quizzes",
        href: "/ai-lab",
        icon: Bot,
        color: "text-cyan-400",
        check: (s) => s.aiUsed,
    },
];

export function OnboardingChecklist({ stats }: { stats: OnboardingStats }) {
    const STORAGE_KEY = "academix_onboarding_dismissed";
    const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash
    const [expanded, setExpanded] = useState(true);

    useEffect(() => {
        setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
    }, []);

    const completed = useMemo(() => CHECKLIST.filter((c) => c.check(stats)).length, [stats]);
    const total = CHECKLIST.length;
    const allDone = completed === total;
    const progress = Math.round((completed / total) * 100);

    // Auto-dismiss when all done
    useEffect(() => {
        if (allDone && !dismissed) {
            const t = setTimeout(() => {
                setDismissed(true);
                localStorage.setItem(STORAGE_KEY, "1");
            }, 5000);
            return () => clearTimeout(t);
        }
    }, [allDone, dismissed]);

    if (dismissed) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl overflow-hidden"
                style={{ border: "1px solid var(--ax-border)", background: "var(--ax-surface-2)" }}
            >
                {/* Progress bar */}
                <div className="h-1 w-full" style={{ background: "rgba(99, 102, 241, 0.08)" }}>
                    <motion.div
                        className="h-full rounded-full"
                        style={{ background: "linear-gradient(90deg, #6366f1, #a855f7)" }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                        <Sparkles className="h-4 w-4 text-indigo-400" />
                        <div>
                            <p className="text-sm font-semibold" style={{ color: "var(--ax-text-primary)" }}>
                                {allDone ? "All done! 🎉" : "Getting Started"}
                            </p>
                            <p className="text-[11px]" style={{ color: "var(--ax-text-muted)" }}>
                                {completed}/{total} completed
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="rounded-lg p-1.5 transition-colors hover:bg-[var(--ax-surface-3)]"
                            style={{ color: "var(--ax-text-muted)" }}
                        >
                            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                        <button
                            onClick={() => { setDismissed(true); localStorage.setItem(STORAGE_KEY, "1"); }}
                            className="rounded-lg p-1.5 transition-colors hover:bg-[var(--ax-surface-3)]"
                            style={{ color: "var(--ax-text-faint)" }}
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                {/* Items */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="flex flex-col gap-1 px-4 pb-4">
                                {CHECKLIST.map((item, i) => {
                                    const done = item.check(stats);
                                    const Icon = item.icon;
                                    return (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, x: -8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                        >
                                            <Link
                                                href={item.href}
                                                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors group ${done ? "opacity-60" : "hover:bg-[var(--ax-surface-hover)]"
                                                    }`}
                                            >
                                                {done ? (
                                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                                                ) : (
                                                    <Circle className="h-4 w-4 shrink-0" style={{ color: "var(--ax-text-faint)" }} />
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <p className={`text-xs font-medium ${done ? "line-through" : ""}`}
                                                        style={{ color: done ? "var(--ax-text-muted)" : "var(--ax-text-primary)" }}>
                                                        {item.label}
                                                    </p>
                                                    <p className="text-[10px]" style={{ color: "var(--ax-text-faint)" }}>
                                                        {item.description}
                                                    </p>
                                                </div>
                                                {!done && <Icon className={`h-3.5 w-3.5 shrink-0 ${item.color} opacity-0 group-hover:opacity-100 transition-opacity`} />}
                                            </Link>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
    );
}
