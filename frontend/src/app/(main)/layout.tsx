"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@/hooks/useUser";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { MessagingPanel } from "@/components/MessagingPanel";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { ensureProfile } from "@/lib/profile";
import { supabase } from "@/lib/supabase";
import { CommandPalette } from "@/components/CommandPalette";
import { ScrollToTop } from "@/components/ScrollToTop";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import {
  getNotifications,
  getUnreadNotifCount,
  getUnreadMessageCount,
  type Notification,
} from "@/lib/messages";
import {
  BarChart2,
  Bell,
  BookOpen,
  Bot,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Home,
  LayoutDashboard,
  Loader2,
  Menu,
  MessageCircle,
  MessageSquare,
  School,
  Search,
  X,
  Sparkles,
  Trophy,
  UserCircle,
} from "lucide-react";
import { globalSearch, type SearchResults } from "@/lib/social";

/* ═══════════════════════════════════════════════════════════════════════════
   NAV CONFIG — grouped sections with module accent colors
   ═══════════════════════════════════════════════════════════════════════════ */
const NAV_GROUPS = [
  {
    label: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, accent: "from-blue-500 to-indigo-600", color: "text-blue-400", bg: "bg-blue-500/10" },
    ],
  },
  {
    label: "Community",
    items: [
      { label: "Library", href: "/library", icon: BookOpen, accent: "from-amber-500 to-orange-600", color: "text-amber-400", bg: "bg-amber-500/10" },
      { label: "Forums", href: "/forums", icon: MessageSquare, accent: "from-indigo-500 to-blue-600", color: "text-indigo-400", bg: "bg-indigo-500/10" },
      { label: "Campus", href: "/campus", icon: School, accent: "from-emerald-500 to-teal-600", color: "text-emerald-400", bg: "bg-emerald-500/10" },
      { label: "Leaderboard", href: "/leaderboard", icon: Trophy, accent: "from-orange-400 to-red-500", color: "text-orange-400", bg: "bg-orange-500/10" },
    ],
  },
  {
    label: "Tools",
    items: [
      { label: "Planner", href: "/planner", icon: Calendar, accent: "from-violet-500 to-purple-600", color: "text-violet-400", bg: "bg-violet-500/10" },
      { label: "AI Lab", href: "/ai-lab", icon: Bot, accent: "from-pink-500 to-rose-600", color: "text-pink-400", bg: "bg-pink-500/10" },
      { label: "Insights", href: "/insights", icon: BarChart2, accent: "from-cyan-500 to-sky-600", color: "text-cyan-400", bg: "bg-cyan-500/10" },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

/* ═══════════════════════════════════════════════════════════════════════════
   BREADCRUMB LABELS — derive from path
   ═══════════════════════════════════════════════════════════════════════════ */
const BREADCRUMB_MAP: Record<string, string> = {
  dashboard: "Dashboard",
  planner: "Planner",
  library: "Library",
  forums: "Forums",
  campus: "Campus",
  "ai-lab": "AI Lab",
  insights: "Insights",
  profile: "Profile",
  search: "Search",
  admin: "Admin",
  messages: "Messages",
  feed: "Feed",
  upload: "Upload",
  create: "Create",
  ranking: "Ranking",
  milestones: "Milestones",
  collections: "My Contributions",
  history: "History",
  "my-discussions": "My Posts",
  saved: "Saved",
  reputation: "Reputation",
  "my-campus": "My Groups",
  join: "Join with Code",
  manage: "Edit Group",
  users: "Users",
  new: "New",
};

function getBreadcrumbs(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  return parts.map((part, i) => ({
    label: BREADCRUMB_MAP[part] ?? part.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    href: "/" + parts.slice(0, i + 1).join("/"),
    isLast: i === parts.length - 1,
  }));
}

/* ═══════════════════════════════════════════════════════════════════════════
   HEADER SEARCH
   ═══════════════════════════════════════════════════════════════════════════ */
function HeaderSearchTrigger() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLFormElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const r = await globalSearch(q);
      setResults(r);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(val), 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
    }
  };

  const nav = (href: string) => {
    router.push(href);
    setIsOpen(false);
    setQuery("");
  }

  const total = results ? results.users.length + results.materials.length + results.groups.length : 0;

  return (
    <form
      ref={wrapperRef}
      onSubmit={handleSubmit}
      className="relative z-50 hidden sm:flex items-center gap-2 h-9 w-56 xl:w-72 rounded-[0.625rem] px-3 transition-colors hover:bg-[var(--ax-surface-3)] focus-within:bg-[var(--ax-surface-3)] focus-within:ring-2 focus-within:ring-blue-500/50"
      style={{ border: "1px solid var(--ax-border)", background: "var(--ax-surface-2)" }}
    >
      <button suppressHydrationWarning type="submit" className="shrink-0 group hover:opacity-80 transition-opacity" aria-label="Submit search">
        <Search className="h-3.5 w-3.5" style={{ color: "var(--ax-text-faint)" }} />
      </button>
      <input
        suppressHydrationWarning
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => { if (query.trim()) setIsOpen(true); }}
        onClick={() => { if (query.trim()) setIsOpen(true); }}
        placeholder="Search Academix…"
        className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--ax-text-faint)]"
        style={{ color: "var(--ax-text-primary)" }}
      />
      <button type="submit" className="hidden" />

      {isOpen && query.trim() && (
        <div className="absolute left-0 top-full mt-2 w-full sm:w-[350px] rounded-xl shadow-2xl overflow-hidden z-[100] transform-gpu"
          style={{ border: "1px solid var(--ax-border)", background: "var(--ax-surface-1)" }}>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            </div>
          ) : results && total > 0 ? (
            <div className="max-h-[26rem] overflow-y-auto py-2" style={{ scrollbarWidth: "none" }}>
              {results.users.length > 0 && (
                <div className="mb-2">
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Users</p>
                  {results.users.slice(0, 3).map(u => (
                    <button key={u.id} type="button" onClick={() => nav(`/users/${u.id}`)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[var(--ax-surface-2)] text-left transition group">
                      <UserCircle className="h-4 w-4 text-slate-500 group-hover:text-blue-400 shrink-0 transition" />
                      <span className="text-sm font-medium text-slate-300 group-hover:text-slate-100 truncate transition">{u.display_name ?? "User"}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.materials.length > 0 && (
                <div className="mb-2">
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Materials</p>
                  {results.materials.slice(0, 3).map(m => (
                    <button key={m.id} type="button" onClick={() => { setIsOpen(false); window.open(m.file_url, "_blank"); }} className="w-full flex flex-col justify-center px-3 py-2 hover:bg-[var(--ax-surface-2)] text-left transition group">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-[15px] w-[15px] text-slate-500 group-hover:text-amber-400 shrink-0 transition" />
                        <span className="text-sm font-medium text-slate-300 group-hover:text-slate-100 truncate transition">{m.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-0.5 ml-[22px] truncate">{m.subject}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.groups.length > 0 && (
                <div className="mb-2">
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Groups</p>
                  {results.groups.slice(0, 3).map(g => (
                    <button key={g.id} type="button" onClick={() => nav(`/campus`)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[var(--ax-surface-2)] text-left transition group">
                      <School className="h-4 w-4 text-slate-500 group-hover:text-emerald-400 shrink-0 transition" />
                      <span className="text-sm font-medium text-slate-300 group-hover:text-slate-100 truncate transition">{g.name}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="border-t border-[var(--ax-border)] p-2 mt-1">
                <button type="button" onClick={(e) => handleSubmit(e as any)} className="w-full flex items-center justify-center gap-2 rounded-lg py-1.5 text-[13px] font-medium text-blue-400 hover:bg-blue-500/10 transition">
                  View all {total} results
                  <span className="text-[10px]">→</span>
                </button>
              </div>
            </div>
          ) : results ? (
            <div className="px-4 py-8 text-center">
              <Search className="h-5 w-5 mx-auto mb-2 text-slate-600" />
              <p className="text-xs text-slate-400">No results found for &ldquo;{query}&rdquo;</p>
            </div>
          ) : null}
        </div>
      )}
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SIDEBAR
   ═══════════════════════════════════════════════════════════════════════════ */
function Sidebar({ collapsed, onToggle, onClose }: {
  collapsed: boolean;
  onToggle: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col" style={{ background: "var(--ax-surface-1)", borderRight: "1px solid var(--ax-border)" }}>
      {/* ── Brand ── */}
      <div className="flex h-16 shrink-0 items-center border-b px-4" style={{ borderColor: "var(--ax-border)" }}>
        <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 shadow-md"
            style={{ boxShadow: "0 4px 20px rgba(99, 102, 241, 0.3), 0 0 0 1px rgba(99, 102, 241, 0.1)" }}>
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <span className="text-base font-bold tracking-tight whitespace-nowrap ax-gradient-text">
              Academix
            </span>
          )}
        </Link>
        {/* Close (mobile) */}
        {onClose && (
          <button onClick={onClose}
            className="ml-auto rounded-md p-1 lg:hidden"
            style={{ color: "var(--ax-text-muted)" }}>
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* ── Navigation Groups ── */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide" style={{ padding: collapsed ? "1rem 0.5rem" : "1rem 0.75rem" }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5">
            {!collapsed && (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--ax-text-faint)" }}>
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map(({ label, href, icon: Icon, accent, color, bg }) => {
                const isActive = pathname === href || pathname.startsWith(href + "/");
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onClose}
                      title={collapsed ? label : undefined}
                      className={`group relative flex items-center rounded-xl text-sm font-medium transition-all duration-200
                        ${collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5"}
                        ${isActive
                          ? "text-white"
                          : "hover:bg-[var(--ax-surface-hover)]"
                        }`}
                      style={isActive ? {} : { color: "var(--ax-text-secondary)" }}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-gradient-to-b ${accent}`}
                          style={{ height: "60%" }} />
                      )}
                      {/* Active bg */}
                      {isActive && (
                        <span className="absolute inset-0 rounded-xl opacity-100"
                          style={{ background: "var(--ax-surface-3)" }} />
                      )}
                      <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200
                        ${isActive ? bg : "group-hover:bg-[var(--ax-surface-3)]"}`}>
                        <Icon className={`h-4 w-4 transition-colors duration-200 ${isActive ? color : "group-hover:text-slate-300"}`}
                          style={isActive ? {} : { color: "var(--ax-text-faint)" }} />
                      </span>
                      {!collapsed && (
                        <span className="relative z-10">{label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Collapse Toggle (desktop only) ── */}
      <div className="hidden lg:flex border-t px-3 py-3" style={{ borderColor: "var(--ax-border)" }}>
        <button
          suppressHydrationWarning
          onClick={onToggle}
          className="flex w-full items-center justify-center rounded-lg p-2 transition-colors hover:bg-[var(--ax-surface-3)]"
          style={{ color: "var(--ax-text-muted)" }}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* ── Search Shortcut ── */}
      <div className="hidden lg:block border-t px-3 py-2" style={{ borderColor: "var(--ax-border)" }}>
        <button
          suppressHydrationWarning
          onClick={() => {
            // Trigger ⌘K programmatically
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true, bubbles: true }));
          }}
          className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-[var(--ax-surface-3)]
            ${collapsed ? "justify-center" : ""}`}
          style={{ color: "var(--ax-text-muted)" }}
          title="Search (⌘K)"
        >
          <Search className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left text-xs">Search</span>
              <kbd className="rounded-md border px-1.5 py-0.5 text-[9px] font-medium"
                style={{ color: "var(--ax-text-faint)", borderColor: "var(--ax-border)", background: "var(--ax-surface-2)" }}>
                ⌘K
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* ── Footer Profile ── */}
      <div className="border-t p-3" style={{ borderColor: "var(--ax-border)" }}>
        <ProfileDropdown variant="sidebar" onNavigate={onClose} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MOBILE BOTTOM NAV — quick access on small screens
   ═══════════════════════════════════════════════════════════════════════════ */
const MOBILE_TABS = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Library", href: "/library", icon: BookOpen },
  { label: "Forums", href: "/forums", icon: MessageSquare },
  { label: "Campus", href: "/campus", icon: School },
];

function MobileBottomNav({ onMoreClick }: { onMoreClick: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex lg:hidden h-16 items-stretch border-t safe-area-pb"
      style={{ borderColor: "var(--ax-border)", background: "rgba(5, 8, 22, 0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
      aria-label="Mobile navigation">
      {MOBILE_TABS.map(({ label, href, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link key={href} href={href}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors
              ${isActive ? "text-indigo-400" : ""}`}
            style={isActive ? {} : { color: "var(--ax-text-faint)" }}
            aria-current={isActive ? "page" : undefined}>
            <Icon className={`h-5 w-5 ${isActive ? "text-indigo-400" : ""}`} />
            <span>{label}</span>
            {isActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-b-full bg-indigo-500" />
            )}
          </Link>
        );
      })}
      <button onClick={onMoreClick}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors"
        style={{ color: "var(--ax-text-faint)" }}
        aria-label="Open full menu">
        <Menu className="h-5 w-5" />
        <span>More</span>
      </button>
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROFILE ENSURER
   ═══════════════════════════════════════════════════════════════════════════ */
function ProfileEnsurer() {
  const { user, isLoaded } = useUser();
  useEffect(() => {
    if (!isLoaded || !user) return;
    const t = setTimeout(() => {
      const name = user.fullName ?? user.firstName ?? user.username ?? null;
      ensureProfile(user.id, name);
    }, 500);
    return () => clearTimeout(t);
  }, [isLoaded, user]);
  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN LAYOUT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const userId = isLoaded ? user?.id : undefined;
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadMsg, setUnreadMsg] = useState(0);
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifBtnRef = useRef<HTMLButtonElement>(null);

  const sidebarW = sidebarCollapsed ? "w-[72px]" : "w-64";
  const mainPl = sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-64";
  const headerLg = sidebarCollapsed ? "lg:left-[72px]" : "lg:left-64";

  const breadcrumbs = getBreadcrumbs(pathname);

  // Notification counts
  useEffect(() => {
    if (!userId) return;
    getUnreadNotifCount(userId).then(setUnreadNotif);
    getUnreadMessageCount(userId).then(setUnreadMsg);
  }, [userId]);

  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    setNotifLoading(true);
    const data = await getNotifications(userId);
    setNotifications(data);
    setUnreadNotif(data.filter((n) => !n.is_read).length);
    setNotifLoading(false);
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (notifOpen) loadNotifications();
  }, [notifOpen, loadNotifications]);

  // Realtime notifications
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifs:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload: any) => {
          const type = payload.new?.type;
          if (type !== "message" && type !== "friend_request") {
            setUnreadNotif((c) => c + 1);
          }
          if (notifOpen) loadNotifications();
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, notifOpen, loadNotifications]);

  return (
    <div className="min-h-screen font-sans ax-grid-bg"
      style={{ background: "var(--ax-surface-0)", color: "var(--ax-text-primary)" }}>

      {/* ── Skip to Content (a11y) ── */}
      <a href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-xl focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white focus:shadow-lg focus:outline-none"
      >Skip to main content</a>

      {/* ── Mobile Sidebar Overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "rgba(5, 8, 22, 0.8)" }}
            onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 h-full w-64 shadow-2xl">
            <Sidebar collapsed={false} onToggle={() => { }} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Fixed Desktop Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-30 hidden ${sidebarW} transition-all duration-300 lg:block`}
        style={{ boxShadow: "4px 0 24px rgba(0,0,0,0.15)" }}
        aria-label="Main navigation sidebar">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((c) => !c)}
        />
      </aside>

      {/* ── Top Header ── */}
      <header className={`fixed left-0 right-0 top-0 z-30 flex h-16 items-center border-b px-4 ${headerLg} transition-all duration-300`}
        style={{ borderColor: "var(--ax-border)", background: "rgba(5, 8, 22, 0.75)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
        role="banner" aria-label="Platform header">
        {/* Left: hamburger + breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 transition-colors hover:bg-[var(--ax-surface-3)] lg:hidden"
            style={{ color: "var(--ax-text-muted)" }}
            aria-label="Open navigation menu">
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumbs */}
          <nav className="hidden sm:flex items-center gap-1 text-sm min-w-0" aria-label="Breadcrumb">
            <Link href="/dashboard" className="flex items-center gap-1 rounded-md p-1 transition-colors hover:bg-[var(--ax-surface-3)]"
              style={{ color: "var(--ax-text-muted)" }}>
              <Home className="h-3.5 w-3.5" />
            </Link>
            {breadcrumbs.map((crumb) => (
              <span key={crumb.href} className="flex items-center gap-1 min-w-0">
                <ChevronRight className="h-3 w-3 shrink-0" style={{ color: "var(--ax-text-faint)" }} />
                {crumb.isLast ? (
                  <span className="font-semibold truncate" style={{ color: "var(--ax-text-primary)" }}>
                    {crumb.label}
                  </span>
                ) : (
                  <Link href={crumb.href} className="truncate transition-colors hover:text-white"
                    style={{ color: "var(--ax-text-muted)" }}>
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>
        </div>

        <div className="flex-1" />

        {/* Right: Search + Icons + Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Mobile search icon — visible only on small screens */}
          <Link href="/search"
            className="flex sm:hidden h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--ax-surface-3)]"
            style={{ color: "var(--ax-text-muted)" }}
            aria-label="Search">
            <Search className="h-[18px] w-[18px]" />
          </Link>
          <HeaderSearchTrigger />

          {/* Message Icon */}
          <button
            suppressHydrationWarning
            onClick={() => { setMsgOpen(true); setNotifOpen(false); }}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--ax-surface-3)]"
            style={{ color: "var(--ax-text-muted)" }}>
            <MessageCircle className="h-[18px] w-[18px]" />
            {unreadMsg > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                style={{ background: "var(--ax-danger)", boxShadow: "0 0 8px rgba(239,68,68,0.4)" }}>
                {unreadMsg > 9 ? "9+" : unreadMsg}
              </span>
            )}
          </button>

          {/* Notification Icon */}
          <div className="relative">
            <button
              suppressHydrationWarning
              ref={notifBtnRef}
              onClick={() => { setNotifOpen((o) => !o); setMsgOpen(false); }}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--ax-surface-3)]"
              style={{ color: "var(--ax-text-muted)" }}>
              <Bell className="h-[18px] w-[18px]" />
              {unreadNotif > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ background: "var(--ax-danger)", boxShadow: "0 0 8px rgba(239,68,68,0.4)" }}>
                  {unreadNotif > 9 ? "9+" : unreadNotif}
                </span>
              )}
            </button>
            {userId && (
              <NotificationsPanel
                open={notifOpen}
                onClose={() => setNotifOpen(false)}
                userId={userId}
                notifications={notifications}
                loading={notifLoading}
                onMarkRead={(id) => {
                  setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
                  setUnreadNotif((c) => Math.max(0, c - 1));
                }}
                onMarkAllRead={() => {
                  setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
                  setUnreadNotif(0);
                }}
                onClearAll={async () => {
                  try {
                    const { error } = await supabase.from('notifications').delete().eq('user_id', userId);
                    if (error) {
                      console.error("Supabase Error clearing notifications:", error);
                      throw error;
                    }
                    setNotifications([]);
                    setUnreadNotif(0);
                  } catch (err) {
                    console.error("Failed to clear notifications", err);
                  }
                }}
              />
            )}
          </div>

          {/* Divider */}
          <div className="h-6 w-px mx-1" style={{ background: "var(--ax-border-light)" }} />

          {/* Profile */}
          <ProfileDropdown variant="header" />
        </div>
      </header>

      {/* ── Main Content ── */}
      <ProfileEnsurer />
      <MessagingPanel open={msgOpen} onClose={() => setMsgOpen(false)} onUnreadChange={setUnreadMsg} />
      <CommandPalette />
      <ScrollToTop />
      <KeyboardShortcuts />
      <main id="main-content" className={`min-h-screen pt-16 pb-20 lg:pb-0 ${mainPl} transition-all duration-300`}
        role="main" aria-label="Main content">
        <div className="h-full">{children}</div>
      </main>
      <MobileBottomNav onMoreClick={() => setSidebarOpen(true)} />
    </div>
  );
}
