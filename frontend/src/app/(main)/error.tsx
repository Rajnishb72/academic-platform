"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[Academix Error]", error);
    }, [error]);

    return (
        <div className="relative flex min-h-[60vh] flex-col items-center justify-center px-4"
            style={{ background: "var(--ax-bg, #050816)" }}>

            {/* Ambient glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(239,68,68,0.08),transparent_60%)]" />

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", damping: 20 }}
                className="relative z-10 flex flex-col items-center text-center"
            >
                {/* Icon */}
                <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", damping: 15 }}
                    className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
                    style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        boxShadow: "0 0 30px rgba(239, 68, 68, 0.12)",
                    }}
                >
                    <AlertTriangle className="h-7 w-7 text-rose-400" />
                </motion.div>

                <h2 className="mb-2 text-xl font-bold" style={{ color: "var(--ax-text-primary, #f1f5f9)" }}>
                    Something went wrong
                </h2>
                <p className="mb-6 max-w-sm text-sm leading-relaxed" style={{ color: "var(--ax-text-muted, #94a3b8)" }}>
                    An unexpected error occurred. Don&apos;t worry — your data is safe. Try again or head back to the dashboard.
                </p>

                {/* Actions */}
                <div className="flex flex-col items-center gap-3 sm:flex-row">
                    <button
                        onClick={reset}
                        className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl"
                        style={{
                            background: "linear-gradient(135deg, #dc2626, #ef4444)",
                            boxShadow: "0 4px 14px rgba(220, 38, 38, 0.25)",
                        }}
                    >
                        <RefreshCw className="h-4 w-4" />
                        Try Again
                    </button>

                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium transition-colors"
                        style={{
                            borderColor: "var(--ax-border, rgba(148,163,184,0.1))",
                            color: "var(--ax-text-secondary, #cbd5e1)",
                            background: "var(--ax-surface-2, rgba(15,23,42,0.5))",
                        }}
                    >
                        <Home className="h-4 w-4" />
                        Dashboard
                    </Link>
                </div>

                {/* Error code */}
                {error.digest && (
                    <p className="mt-6 text-[10px] font-mono" style={{ color: "var(--ax-text-faint, #64748b)" }}>
                        Error ID: {error.digest}
                    </p>
                )}
            </motion.div>
        </div>
    );
}
