"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Flame, MessageSquare, PenSquare, Bookmark, Award } from "lucide-react";

const NAV = [
  { label: "Feed", href: "/forums", icon: Flame },
  { label: "My Posts", href: "/forums/my-discussions", icon: MessageSquare },
  { label: "Create Post", href: "/forums/create", icon: PenSquare },
  { label: "Saved", href: "/forums/saved", icon: Bookmark },
  { label: "Reputation", href: "/forums/reputation", icon: Award },
] as const;

export default function ForumsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const activeHref =
    NAV.find(({ href }) =>
      href === "/forums" ? pathname === "/forums" : pathname.startsWith(href),
    )?.href ?? "/forums";

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col" style={{ background: "var(--ax-surface-0)" }}>
      {/* ── Module Header Banner ── */}
      <div className="relative overflow-hidden border-b" style={{ borderColor: "var(--ax-border)" }}>
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-blue-600/5 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--ax-surface-0)]" />

        <div className="relative mx-auto flex max-w-7xl items-center gap-4 px-6 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg"
            style={{ boxShadow: "0 4px 14px rgba(99, 102, 241, 0.25)" }}>
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight" style={{ color: "var(--ax-text-primary)" }}>
              Forums
            </h1>
            <p className="text-xs" style={{ color: "var(--ax-text-muted)" }}>
              Community discussions · earn merit & reputation
            </p>
          </div>
        </div>
      </div>

      {/* ── Sub-Navigation Tabs ── */}
      <div className="sticky top-16 z-20 border-b" style={{ borderColor: "var(--ax-border)", background: "rgba(5, 8, 22, 0.85)", backdropFilter: "blur(16px)" }}>
        <div className="mx-auto max-w-7xl px-6">
          <nav className="flex gap-1 overflow-x-auto py-2 scrollbar-hide" aria-label="Forums navigation">
            {NAV.map(({ label, href, icon: Icon }) => {
              const isActive = href === activeHref;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200
                    ${isActive ? "" : "hover:bg-[var(--ax-surface-3)]"}`}
                  style={{ color: isActive ? "var(--ax-text-primary)" : "var(--ax-text-muted)" }}
                >
                  {isActive && (
                    <motion.span
                      layoutId="forums-tab-pill"
                      className="absolute inset-0 rounded-lg"
                      style={{ background: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.2)" }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon className={`relative z-10 h-4 w-4 ${isActive ? "text-indigo-400" : ""}`}
                    style={isActive ? {} : { color: "var(--ax-text-faint)" }} />
                  <span className="relative z-10">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ── Content ── */}
      <main className="flex-1 overflow-x-hidden" style={{ background: "var(--ax-surface-0)" }}>
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
