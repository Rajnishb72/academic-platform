"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard } from "lucide-react";

interface ShortcutGroup {
    title: string;
    shortcuts: { keys: string[]; label: string }[];
}

const GROUPS: ShortcutGroup[] = [
    {
        title: "Navigation",
        shortcuts: [
            { keys: ["⌘", "K"], label: "Open Command Palette" },
            { keys: ["?"], label: "Show this cheatsheet" },
            { keys: ["Esc"], label: "Close modal / drawer" },
        ],
    },
    {
        title: "Quick Actions",
        shortcuts: [
            { keys: ["G", "D"], label: "Go to Dashboard" },
            { keys: ["G", "L"], label: "Go to Library" },
            { keys: ["G", "F"], label: "Go to Forums" },
            { keys: ["G", "P"], label: "Go to Planner" },
            { keys: ["G", "C"], label: "Go to Campus" },
        ],
    },
    {
        title: "Content",
        shortcuts: [
            { keys: ["N"], label: "New post (on Forums)" },
            { keys: ["U"], label: "Upload note (on Library)" },
        ],
    },
];

const GO_ROUTES: Record<string, string> = {
    d: "/dashboard", l: "/library", f: "/forums", p: "/planner", c: "/campus/my-campus",
};

export function KeyboardShortcuts() {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const pendingG = useRef(false);
    const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        function isInput(t: EventTarget | null): boolean {
            return t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || (t instanceof HTMLElement && t.isContentEditable);
        }

        function onKey(e: KeyboardEvent) {
            if (isInput(e.target)) return;

            // Toggle cheatsheet
            if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                setOpen((v) => !v);
                return;
            }
            if (e.key === "Escape") { setOpen(false); return; }

            // G + key navigation
            if (e.key === "g" && !e.metaKey && !e.ctrlKey) {
                pendingG.current = true;
                if (gTimer.current) clearTimeout(gTimer.current);
                gTimer.current = setTimeout(() => { pendingG.current = false; }, 1500);
                return;
            }
            if (pendingG.current) {
                const route = GO_ROUTES[e.key.toLowerCase()];
                if (route) { e.preventDefault(); router.push(route); }
                pendingG.current = false;
                if (gTimer.current) clearTimeout(gTimer.current);
                return;
            }

            // Single-key shortcuts
            if (e.key === "n" && !e.metaKey && !e.ctrlKey) { router.push("/forums/create"); return; }
            if (e.key === "u" && !e.metaKey && !e.ctrlKey) { router.push("/library/upload"); return; }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [router]);

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setOpen(false)}
                        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 22, stiffness: 300 }}
                        className="fixed left-1/2 top-1/2 z-[101] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 shadow-2xl"
                        style={{
                            background: "var(--ax-surface-1, #0f172a)",
                            border: "1px solid var(--ax-border, rgba(148,163,184,0.1))",
                        }}
                    >
                        {/* Header */}
                        <div className="mb-5 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 ring-1 ring-indigo-500/20">
                                    <Keyboard className="h-4 w-4 text-indigo-400" />
                                </div>
                                <h2 className="text-base font-bold" style={{ color: "var(--ax-text-primary)" }}>
                                    Keyboard Shortcuts
                                </h2>
                            </div>
                            <button
                                onClick={() => setOpen(false)}
                                className="rounded-lg p-1.5 transition-colors hover:bg-[var(--ax-surface-3)]"
                                style={{ color: "var(--ax-text-muted)" }}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Groups */}
                        <div className="space-y-5">
                            {GROUPS.map((group) => (
                                <div key={group.title}>
                                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest"
                                        style={{ color: "var(--ax-text-faint)" }}>
                                        {group.title}
                                    </p>
                                    <div className="space-y-1.5">
                                        {group.shortcuts.map((s) => (
                                            <div key={s.label} className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-[var(--ax-surface-3)]">
                                                <span className="text-xs" style={{ color: "var(--ax-text-secondary)" }}>
                                                    {s.label}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    {s.keys.map((k) => (
                                                        <kbd
                                                            key={k}
                                                            className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-md px-1.5 text-[10px] font-semibold"
                                                            style={{
                                                                background: "var(--ax-surface-3, rgba(30,41,59,0.6))",
                                                                border: "1px solid var(--ax-border)",
                                                                color: "var(--ax-text-primary)",
                                                                boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                                                            }}
                                                        >
                                                            {k}
                                                        </kbd>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="mt-5 flex items-center justify-center gap-1 text-[10px]"
                            style={{ color: "var(--ax-text-faint)" }}>
                            Press <kbd className="mx-0.5 rounded border px-1 py-0.5 text-[9px]"
                                style={{ borderColor: "var(--ax-border)", background: "var(--ax-surface-3)" }}>?</kbd> to toggle
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
