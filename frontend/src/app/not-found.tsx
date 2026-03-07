"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Search, Sparkles } from "lucide-react";

export default function NotFound() {
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4"
            style={{ background: "var(--ax-bg, #050816)" }}>

            {/* Ambient glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(99,102,241,0.12),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(139,92,246,0.08),transparent_50%)]" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", damping: 20, stiffness: 200 }}
                className="relative z-10 flex flex-col items-center text-center"
            >
                {/* Big 404 */}
                <div className="relative mb-2">
                    <span className="text-[8rem] sm:text-[12rem] font-black leading-none tracking-tighter"
                        style={{
                            background: "linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #3b82f6 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            opacity: 0.15,
                        }}>
                        404
                    </span>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, type: "spring", damping: 15 }}
                            className="flex h-20 w-20 items-center justify-center rounded-3xl"
                            style={{
                                background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))",
                                border: "1px solid rgba(99, 102, 241, 0.2)",
                                boxShadow: "0 0 40px rgba(99, 102, 241, 0.15)",
                            }}
                        >
                            <Sparkles className="h-8 w-8 text-indigo-400" />
                        </motion.div>
                    </div>
                </div>

                {/* Text */}
                <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl"
                    style={{ color: "var(--ax-text-primary, #f1f5f9)" }}
                >
                    Page not found
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                    className="mb-8 max-w-sm text-sm leading-relaxed"
                    style={{ color: "var(--ax-text-muted, #94a3b8)" }}
                >
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                    Let&apos;s get you back on track.
                </motion.p>

                {/* Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="flex flex-col items-center gap-3 sm:flex-row"
                >
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl"
                        style={{
                            background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                            boxShadow: "0 4px 20px rgba(79, 70, 229, 0.3)",
                        }}
                    >
                        <Home className="h-4 w-4" />
                        Go to Dashboard
                    </Link>

                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-medium transition-colors"
                        style={{
                            borderColor: "var(--ax-border, rgba(148,163,184,0.1))",
                            color: "var(--ax-text-secondary, #cbd5e1)",
                            background: "var(--ax-surface-2, rgba(15,23,42,0.5))",
                        }}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Go Back
                    </button>
                </motion.div>

                {/* Search hint */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 flex items-center gap-1.5 text-xs"
                    style={{ color: "var(--ax-text-faint, #64748b)" }}
                >
                    <Search className="h-3 w-3" />
                    Press <kbd className="rounded border px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ borderColor: "var(--ax-border)", background: "var(--ax-surface-2, rgba(15,23,42,0.5))" }}>
                        ⌘K
                    </kbd> to search for anything
                </motion.p>
            </motion.div>
        </div>
    );
}
