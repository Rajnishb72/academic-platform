"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────────── */
type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    description?: string;
    duration?: number;
}

interface ToastContextValue {
    toast: (opts: Omit<Toast, "id">) => void;
    success: (title: string, description?: string) => void;
    error: (title: string, description?: string) => void;
    warning: (title: string, description?: string) => void;
    info: (title: string, description?: string) => void;
}

/* ── Style Map ─────────────────────────────────────────────────────────── */
const TOAST_STYLES: Record<ToastType, { icon: typeof CheckCircle2; accent: string; bg: string; border: string; glow: string }> = {
    success: {
        icon: CheckCircle2,
        accent: "text-emerald-400",
        bg: "rgba(16, 185, 129, 0.08)",
        border: "rgba(16, 185, 129, 0.20)",
        glow: "0 0 20px rgba(16, 185, 129, 0.15)",
    },
    error: {
        icon: XCircle,
        accent: "text-rose-400",
        bg: "rgba(239, 68, 68, 0.08)",
        border: "rgba(239, 68, 68, 0.20)",
        glow: "0 0 20px rgba(239, 68, 68, 0.15)",
    },
    warning: {
        icon: AlertTriangle,
        accent: "text-amber-400",
        bg: "rgba(245, 158, 11, 0.08)",
        border: "rgba(245, 158, 11, 0.20)",
        glow: "0 0 20px rgba(245, 158, 11, 0.15)",
    },
    info: {
        icon: Info,
        accent: "text-blue-400",
        bg: "rgba(59, 130, 246, 0.08)",
        border: "rgba(59, 130, 246, 0.20)",
        glow: "0 0 20px rgba(59, 130, 246, 0.15)",
    },
};

/* ── Context ───────────────────────────────────────────────────────────── */
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within a ToastProvider");
    return ctx;
}

/* ── Provider ──────────────────────────────────────────────────────────── */
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback((opts: Omit<Toast, "id">) => {
        const id = Math.random().toString(36).slice(2, 9);
        const duration = opts.duration ?? 4000;
        setToasts((prev) => [...prev.slice(-4), { ...opts, id }]); // max 5 visible
        if (duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }
    }, [removeToast]);

    const value: ToastContextValue = {
        toast: addToast,
        success: (title, description) => addToast({ type: "success", title, description }),
        error: (title, description) => addToast({ type: "error", title, description }),
        warning: (title, description) => addToast({ type: "warning", title, description }),
        info: (title, description) => addToast({ type: "info", title, description }),
    };

    return (
        <ToastContext.Provider value={value}>
            {children}

            {/* ── Toast Container ── */}
            <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2.5 w-80 pointer-events-none">
                <AnimatePresence mode="popLayout">
                    {toasts.map((t) => {
                        const style = TOAST_STYLES[t.type];
                        const Icon = style.icon;
                        return (
                            <motion.div
                                key={t.id}
                                layout
                                initial={{ opacity: 0, x: 80, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 80, scale: 0.95 }}
                                transition={{ type: "spring", damping: 22, stiffness: 300 }}
                                className="pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3.5 backdrop-blur-xl shadow-2xl"
                                style={{
                                    background: `linear-gradient(135deg, ${style.bg}, var(--ax-surface-1))`,
                                    border: `1px solid ${style.border}`,
                                    boxShadow: style.glow,
                                }}
                            >
                                <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${style.accent}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold" style={{ color: "var(--ax-text-primary)" }}>
                                        {t.title}
                                    </p>
                                    {t.description && (
                                        <p className="mt-0.5 text-xs leading-relaxed" style={{ color: "var(--ax-text-muted)" }}>
                                            {t.description}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => removeToast(t.id)}
                                    className="shrink-0 rounded-md p-0.5 transition-colors hover:bg-white/5"
                                    style={{ color: "var(--ax-text-faint)" }}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}
