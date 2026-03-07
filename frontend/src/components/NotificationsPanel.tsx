"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Check,
  UserPlus,
  Users,
  HeartHandshake,
  Loader2,
  BellOff,
  CalendarDays,
  Trash2,
} from "lucide-react";
import {
  type Notification,
  markNotifRead,
  markAllNotifsRead,
} from "@/lib/messages";

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  src,
  name,
  size = 34,
}: {
  src?: string | null;
  name: string;
  size?: number;
}) {
  const initials =
    name
      .split(" ")
      .map((w) => w[0] ?? "")
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";
  const px = `${size}px`;
  if (src)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        style={{ width: px, height: px }}
        className="rounded-full object-cover shrink-0"
      />
    );
  return (
    <div
      style={{ width: px, height: px }}
      className="flex shrink-0 items-center justify-center rounded-full bg-linear-to-br from-violet-500 to-purple-600 text-xs font-bold text-white"
    >
      {initials}
    </div>
  );
}

// ─── Icon per notification type ───────────────────────────────────────────────

function TypeIcon({ type }: { type: Notification["type"] }) {
  if (type === "follow")
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
        <UserPlus className="h-3 w-3 text-emerald-400" />
      </div>
    );
  if (type === "friend_request")
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20">
        <Users className="h-3 w-3 text-amber-400" />
      </div>
    );
  if (type === "friend_accepted")
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20">
        <HeartHandshake className="h-3 w-3 text-violet-400" />
      </div>
    );
  if (type === "planner_deadline")
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500/20">
        <CalendarDays className="h-3 w-3 text-orange-400" />
      </div>
    );
  return (
    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20">
      <HeartHandshake className="h-3 w-3 text-violet-400" />
    </div>
  );
}

// ─── Time ─────────────────────────────────────────────────────────────────────

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  notifications: Notification[];
  loading: boolean;
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onClearAll?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationsPanel({
  open,
  onClose,
  userId,
  notifications,
  loading,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
}: NotificationsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  // Filter out message notifications and friend_request notifications (now handled natively by the backend query)
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function handleMarkRead(id: number) {
    await markNotifRead(id);
    onMarkRead(id);
  }

  async function handleMarkAll() {
    await markAllNotifsRead(userId);
    onMarkAllRead();
  }



  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          key="notif-panel"
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          className="absolute right-0 top-12 z-50 w-80 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden" style={{ border: "1px solid var(--ax-border)", background: "var(--ax-surface-0)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--ax-border)" }}>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-bold" style={{ color: "var(--ax-text-primary)" }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-slate-800 hover:text-blue-400"
                >
                  <Check className="h-3 w-3" />
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && onClearAll && (
                <button
                  onClick={onClearAll}
                  title="Clear all notifications"
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-800 hover:text-red-400"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <BellOff className="h-7 w-7 text-slate-600" />
                <p className="text-sm text-slate-500">No notifications yet</p>
                <p className="text-xs text-slate-600">Follow someone or complete a plan to get started</p>
              </div>
            ) : (
              <ul>
                {notifications.map((n) => {
                  const fromName = n.from_profile?.display_name ?? "Someone";
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => !n.is_read && handleMarkRead(n.id)}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-800/60 ${!n.is_read ? "bg-blue-600/5" : ""
                          }`}
                      >
                        <div className="relative mt-0.5 shrink-0">
                          <Avatar
                            src={n.from_profile?.avatar_url}
                            name={fromName}
                            size={34}
                          />
                          <div className="absolute -bottom-1 -right-1">
                            <TypeIcon type={n.type} />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {n.content ?? `${fromName} interacted with you`}
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-600">
                            {relativeTime(n.created_at)}
                          </p>
                        </div>
                        {!n.is_read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
