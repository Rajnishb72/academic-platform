"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import {
  BookOpen, Bot, Calendar, CheckCircle2, ClipboardList,
  Clock, AlertTriangle, Eye, GraduationCap, Loader2, MessageSquare, School,
  Sparkles, Star, Target, TrendingUp, Upload, Users, ArrowRight,
  Flame, ChevronRight, BarChart2, Zap, LayoutDashboard, Compass, Activity,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  fetchMyInstitutions, fetchAssignments, daysUntil,
  type Institution, type Assignment,
} from "@/lib/campus";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashStats {
  groups: number; pendingAssignments: number; forumPosts: number;
  libraryUploads: number; studyPlans: number; submittedCount: number;
  totalUpvotes: number; totalViews: number; chapters: number;
}
interface UpcomingAssignment extends Assignment { groupName: string; groupColor: string; }
interface RecentPost { id: string; title: string; created_at: string; upvotes_count: number; comments_count: number; }
interface StudyPlan { id: string; name: string; targetDate: string; totalChapters: number; dailyHours: number; }
interface TrendingNote { id: string; title: string; subject: string; views_count: number; avg_rating: number | null; created_at: string; }
interface HotPost { id: string; title: string; upvotes_count: number; comments_count: number; created_at: string; author_name: string | null; }
interface RecommendedNote { id: string; title: string; subject: string; avg_rating: number | null; views_count: number; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function relTimeFull(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function statusColor(status: string) {
  if (status === "overdue") return "text-rose-400 bg-rose-500/10 ring-rose-500/20";
  if (status === "submitted") return "text-emerald-400 bg-emerald-500/10 ring-emerald-500/20";
  if (status === "graded") return "text-amber-400 bg-amber-500/10 ring-amber-500/20";
  return "text-blue-400 bg-blue-500/10 ring-blue-500/20";
}
function statusIcon(status: string) {
  if (status === "overdue") return AlertTriangle;
  if (status === "submitted") return CheckCircle2;
  if (status === "graded") return Star;
  return Clock;
}

// ─── Mini Radial Progress ─────────────────────────────────────────────────────

function Ring({ pct, size = 52, stroke = 4, color = "#6366f1" }: { pct: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ax-surface-3)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease" }} />
    </svg>
  );
}

// ─── Stat Hero Card ───────────────────────────────────────────────────────────

function HeroCard({
  label, value, sub, icon: Icon, gradient, href, delay,
}: { label: string; value: number | string; sub?: string; icon: React.ElementType; gradient: string; href: string; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Link href={href} className="ax-card group relative flex flex-col gap-3 overflow-hidden p-5">
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-[0.06]`} />
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
          <Icon className="h-4.5 w-4.5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold" style={{ color: "var(--ax-text-primary)" }}>{value}</p>
          <p className="text-xs font-medium" style={{ color: "var(--ax-text-secondary)" }}>{label}</p>
          {sub && <p className="text-[10px]" style={{ color: "var(--ax-text-faint)" }}>{sub}</p>}
        </div>
        <ArrowRight className="absolute right-4 top-4 h-3.5 w-3.5 transition-colors group-hover:text-slate-300" style={{ color: "var(--ax-text-faint)" }} />
      </Link>
    </motion.div>
  );
}

// ─── Module Panel ─────────────────────────────────────────────────────────────

function Panel({ title, icon: Icon, href, color, children, delay = 0 }: {
  title: string; icon: React.ElementType; href?: string; color: string; children: React.ReactNode; delay?: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="ax-card-flat overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: "1px solid var(--ax-border)", background: "var(--ax-surface-1)" }}>
        <div className="flex items-center gap-2.5">
          <Icon className={`h-4 w-4 ${color}`} />
          <h2 className="text-sm font-bold" style={{ color: "var(--ax-text-primary)" }}>{title}</h2>
        </div>
        {href && (
          <Link href={href} className="flex items-center gap-1 text-xs transition-colors hover:text-white"
            style={{ color: "var(--ax-text-faint)" }}>
            View all <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

// ─── Tab Type ─────────────────────────────────────────────────────────────────

type DashTab = "overview" | "activity" | "discover" | "actions";

const DASH_TABS: { key: DashTab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "activity", label: "My Activity", icon: Activity },
  { key: "discover", label: "Discover", icon: Compass },
  { key: "actions", label: "Quick Actions", icon: Zap },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useUser();
  const [stats, setStats] = useState<DashStats | null>(null);
  const [groups, setGroups] = useState<Institution[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingAssignment[]>([]);
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [libraryNotes, setLibraryNotes] = useState<{ id: string; title: string; views_count?: number }[]>([]);
  const [trendingNotes, setTrendingNotes] = useState<TrendingNote[]>([]);
  const [hotPosts, setHotPosts] = useState<HotPost[]>([]);
  const [recommended, setRecommended] = useState<RecommendedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DashTab>("overview");
  const [mounted, setMounted] = useState(false);
  const [greetText, setGreetText] = useState("");
  const [dateText, setDateText] = useState("");

  // Hydration-safe: set client-only values after mount
  useEffect(() => {
    setMounted(true);
    setGreetText(greeting());
    setDateText(new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }));
  }, []);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [myGroups, forumResult, libraryResult, trendingResult, hotPostsResult] = await Promise.all([
        fetchMyInstitutions(user.id),
        supabase.from("forum_posts").select("id,title,created_at,upvotes_count,comments_count")
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        fetch("/api/library/my-notes").then((r) => r.json()).catch(() => []),
        supabase.from("notes").select("id,title,subject,views_count,avg_rating,created_at")
          .order("views_count", { ascending: false }).limit(5),
        supabase.from("forum_posts").select("id,title,upvotes_count,comments_count,created_at,author_name")
          .order("upvotes_count", { ascending: false }).limit(5),
      ]);

      setGroups(myGroups);

      const allAssignments: UpcomingAssignment[] = [];
      let submitted = 0;
      await Promise.all(myGroups.map(async (g) => {
        try {
          const asgns = await fetchAssignments(g.id, user.id, g.userRole);
          if (g.userRole !== "admin" && g.userRole !== "owner") {
            asgns.filter((a) => a.status === "upcoming" || a.status === "overdue").forEach((a) =>
              allAssignments.push({ ...a, groupName: g.name, groupColor: g.avatar_color })
            );
          }
          submitted += asgns.filter((a) => a.status === "submitted" || a.status === "graded").length;
        } catch { /* ignore */ }
      }));
      allAssignments.sort((a, b) => {
        if (a.status === "overdue" && b.status !== "overdue") return -1;
        if (b.status === "overdue" && a.status !== "overdue") return 1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });
      setUpcoming(allAssignments.slice(0, 6));

      const posts = (forumResult.data ?? []) as RecentPost[];
      setRecentPosts(posts);
      const totalUpvotes = posts.reduce((s, p) => s + (p.upvotes_count ?? 0), 0);

      const uploads = Array.isArray(libraryResult) ? libraryResult : [];
      setLibraryNotes(uploads.slice(0, 3));
      const totalViews = uploads.reduce((s: number, n: { views_count?: number }) => s + (n.views_count ?? 0), 0);

      setTrendingNotes((trendingResult.data ?? []) as TrendingNote[]);
      setHotPosts((hotPostsResult.data ?? []) as HotPost[]);

      const userSubjects = [...new Set(uploads.map((n: { subject?: string }) => n.subject).filter(Boolean))];
      if (userSubjects.length > 0) {
        const { data: recData } = await supabase
          .from("notes").select("id,title,subject,avg_rating,views_count")
          .in("subject", userSubjects).neq("user_id", user.id)
          .order("avg_rating", { ascending: false }).limit(5);
        setRecommended((recData ?? []) as RecommendedNote[]);
      } else {
        const { data: fallbackData } = await supabase
          .from("notes").select("id,title,subject,avg_rating,views_count")
          .order("avg_rating", { ascending: false }).limit(5);
        setRecommended((fallbackData ?? []) as RecommendedNote[]);
      }

      let plans: StudyPlan[] = [];
      let chapters = 0;
      try {
        const raw = localStorage.getItem("academix_plans");
        if (raw) {
          const parsed = JSON.parse(raw) as { id: string; name: string; targetDate: string; dailyHours: number; plan: { schedule: unknown[] } }[];
          plans = parsed.map((p) => ({ id: p.id, name: p.name, targetDate: p.targetDate, dailyHours: p.dailyHours ?? 1, totalChapters: p.plan.schedule.length }));
          chapters = plans.reduce((s, p) => s + p.totalChapters, 0);
        }
      } catch { /* ignore */ }
      setStudyPlans(plans.slice(0, 3));

      setStats({
        groups: myGroups.length, pendingAssignments: allAssignments.length,
        forumPosts: posts.length, libraryUploads: uploads.length,
        studyPlans: plans.length, submittedCount: submitted,
        totalUpvotes, totalViews, chapters,
      });
    } catch (e) { console.error("Dashboard load error:", e); }
    finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const engagementScore = useMemo(() => {
    if (!stats) return 0;
    return Math.min(
      Math.min(stats.forumPosts * 5, 25) +
      Math.min(stats.libraryUploads * 8, 25) +
      Math.min(stats.studyPlans * 10, 25) +
      Math.min(stats.groups * 8, 25), 100
    );
  }, [stats]);

  const engagementLabel = engagementScore >= 80 ? "Outstanding!" : engagementScore >= 50 ? "Great progress" : engagementScore >= 20 ? "Building up" : "Getting started";

  const firstName = user?.firstName ?? user?.username ?? "Student";
  const initials = (user?.fullName ?? firstName).split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-7">
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--ax-border)", background: "var(--ax-surface-2)" }}>
          <div className="h-[2px] w-full ax-skeleton" />
          <div className="flex items-center gap-4 px-6 py-5">
            <div className="h-12 w-12 rounded-2xl ax-skeleton" />
            <div className="space-y-2 flex-1">
              <div className="h-2.5 w-24 ax-skeleton rounded" />
              <div className="h-4 w-40 ax-skeleton rounded" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl p-4 space-y-3" style={{ border: "1px solid var(--ax-border)", background: "var(--ax-surface-2)" }}>
              <div className="h-8 w-8 rounded-lg ax-skeleton" />
              <div className="h-6 w-12 ax-skeleton rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 ax-ambient-glow min-h-screen">

      {/* ── Welcome Banner ───────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="ax-gradient-border mb-7 overflow-hidden backdrop-blur-md" style={{ background: "var(--ax-surface-1)" }}>
        <div className="h-[2px] w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
        <div className="flex items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-base font-bold text-white shadow-lg"
                style={{ boxShadow: "0 4px 14px rgba(99, 102, 241, 0.3)" }}>{initials}</div>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 ring-2 ring-[var(--ax-surface-2)]">
                <span className="h-2 w-2 rounded-full" style={{ background: "var(--ax-surface-2)" }} />
              </span>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--ax-text-muted)" }} suppressHydrationWarning>{greetText ? `${greetText},` : "\u00A0"}</p>
              <h1 className="text-lg font-bold tracking-tight ax-gradient-text">{firstName} 👋</h1>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="hidden items-center gap-3 sm:flex">
              <div className="relative flex items-center justify-center">
                <Ring pct={engagementScore} size={52} stroke={4} color="#6366f1" />
                <span className="absolute text-[10px] font-bold text-indigo-400">{engagementScore}</span>
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: "var(--ax-text-primary)" }}>Engagement</p>
                <p className="text-[10px]" style={{ color: "var(--ax-text-faint)" }}>{engagementLabel}</p>
              </div>
            </div>
            <div className="hidden h-8 w-px sm:block" style={{ background: "var(--ax-border-light)" }} />
            <div className="hidden items-center gap-2 sm:flex">
              <Flame className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-xs" style={{ color: "var(--ax-text-muted)" }}>Today</p>
                <p className="text-sm font-semibold" style={{ color: "var(--ax-text-primary)" }} suppressHydrationWarning>
                  {dateText || "\u00A0"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Onboarding Checklist ────────────────────────────────────────── */}
      <OnboardingChecklist stats={{
        uploads: stats?.libraryUploads ?? 0,
        posts: stats?.forumPosts ?? 0,
        groups: stats?.groups ?? 0,
        plans: stats?.studyPlans ?? 0,
        aiUsed: mounted && localStorage.getItem("academix_ai_used") === "1",
      }} />

      {/* ── Tab Navigation Bar ─────────────────────────────────────────── */}
      <div className="mb-7 flex gap-1 overflow-x-auto scrollbar-hide rounded-xl p-1"
        style={{ background: "var(--ax-surface-2)", border: "1px solid var(--ax-border)" }}>
        {DASH_TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`relative flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all whitespace-nowrap
                ${tab === key ? "text-white shadow-sm" : "hover:bg-[var(--ax-surface-3)]"}`}
            style={tab === key ? { background: "var(--ax-surface-3)" } : { color: "var(--ax-text-muted)" }}>
            <Icon className="h-3.5 w-3.5" />
            {label}
            {tab === key && (
              <motion.div layoutId="dash-tab-pill" className="absolute inset-0 rounded-lg"
                style={{ background: "var(--ax-surface-3)", zIndex: -1 }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }} />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">

        {/* ═══════════ OVERVIEW TAB ═══════════ */}
        {tab === "overview" && (
          <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            {/* Hero Stats */}
            <div className="mb-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 ax-stagger">
              {[
                { label: "Campus Groups", value: stats?.groups ?? 0, sub: "active", icon: School, gradient: "from-emerald-500 to-teal-600", href: "/campus/my-campus", delay: 0.04 },
                { label: "Pending Tasks", value: stats?.pendingAssignments ?? 0, sub: "to submit", icon: ClipboardList, gradient: "from-blue-500 to-indigo-600", href: "/campus/my-campus", delay: 0.08 },
                { label: "Forum Posts", value: stats?.forumPosts ?? 0, sub: `${stats?.totalUpvotes ?? 0} upvotes`, icon: MessageSquare, gradient: "from-indigo-500 to-violet-600", href: "/forums", delay: 0.12 },
                { label: "Library Files", value: stats?.libraryUploads ?? 0, sub: `${stats?.totalViews ?? 0} views`, icon: BookOpen, gradient: "from-amber-500 to-orange-600", href: "/library", delay: 0.16 },
                { label: "Study Plans", value: stats?.studyPlans ?? 0, sub: `${stats?.chapters ?? 0} chapters`, icon: Target, gradient: "from-rose-500 to-pink-600", href: "/planner", delay: 0.20 },
                { label: "Submitted Work", value: stats?.submittedCount ?? 0, sub: "assignments", icon: CheckCircle2, gradient: "from-teal-500 to-cyan-600", href: "/campus/my-campus", delay: 0.24 },
              ].map((s) => <HeroCard key={s.label} {...s} />)}
            </div>

            {/* Assignments + Campus Summary */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Panel title="Upcoming Assignments" icon={ClipboardList} href="/campus/my-campus" color="text-blue-400" delay={0.28}>
                  {upcoming.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
                        <CheckCircle2 className="h-7 w-7 text-emerald-500/60" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--ax-text-primary)" }}>All clear!</p>
                        <p className="text-xs" style={{ color: "var(--ax-text-muted)" }}>No pending assignments. Keep it up.</p>
                      </div>
                      <Link href="/campus" className="text-xs text-emerald-400 hover:underline">Browse groups →</Link>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {upcoming.map((a, i) => {
                        const days = daysUntil(a.due_date);
                        const SIcon = statusIcon(a.status);
                        const isOverdue = a.status === "overdue";
                        return (
                          <motion.div key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.28 + i * 0.05 }}
                            className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-[var(--ax-surface-hover)]"
                            style={{ border: "1px solid var(--ax-border)" }}>
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${a.groupColor} text-[10px] font-bold text-white shadow-sm ring-1 ring-white/10`}>
                              {a.groupName.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium" style={{ color: "var(--ax-text-primary)" }}>{a.title}</p>
                              <p className="text-xs" style={{ color: "var(--ax-text-faint)" }}>{a.groupName}</p>
                            </div>
                            <div className="hidden w-20 flex-col gap-1 sm:flex">
                              <div className="h-1 w-full overflow-hidden rounded-full" style={{ background: "var(--ax-surface-3)" }}>
                                <div className={`h-full rounded-full ${isOverdue ? "bg-rose-500" : Math.abs(days) <= 3 ? "bg-amber-400" : "bg-blue-400"}`}
                                  style={{ width: isOverdue ? "100%" : `${Math.max(0, 100 - days * 10)}%` }} />
                              </div>
                            </div>
                            <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1 ${statusColor(a.status)}`}>
                              <SIcon className="h-3 w-3" />
                              {a.status === "overdue" ? `${Math.abs(days)}d late` : days === 0 ? "Today" : `${days}d`}
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </Panel>
              </div>
              <div className="flex flex-col gap-6">
                <Panel title="Campus Summary" icon={School} href="/campus/my-campus" color="text-emerald-400" delay={0.32}>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Groups", value: stats?.groups ?? 0, color: "text-emerald-400", bg: "bg-emerald-500/10 border border-emerald-500/20" },
                      { label: "Pending", value: stats?.pendingAssignments ?? 0, color: "text-blue-400", bg: "bg-blue-500/10 border border-blue-500/20" },
                      { label: "Submitted", value: stats?.submittedCount ?? 0, color: "text-teal-400", bg: "bg-teal-500/10 border border-teal-500/20" },
                    ].map(({ label, value, color, bg }) => (
                      <div key={label} className={`flex flex-col items-center rounded-xl ${bg} py-3`}>
                        <p className={`text-xl font-bold ${color}`}>{value}</p>
                        <p className="text-[10px]" style={{ color: "var(--ax-text-muted)" }}>{label}</p>
                      </div>
                    ))}
                  </div>
                </Panel>
                {/* AI Lab CTA */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                  <Link href="/ai-lab" className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl p-5 transition hover:shadow-lg"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.1),transparent)]" />
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">AI Lab</p>
                      <p className="text-xs text-violet-200/80">Upload a PDF → get summaries, quizzes, flashcards & more</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-violet-200 transition group-hover:text-white">
                      Open AI Lab <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════ ACTIVITY TAB ═══════════ */}
        {tab === "activity" && (
          <motion.div key="activity" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* My Groups */}
              <Panel title="My Campus Groups" icon={School} href="/campus/my-campus" color="text-emerald-400" delay={0.05}>
                {groups.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <GraduationCap className="h-8 w-8" style={{ color: "var(--ax-text-faint)" }} />
                    <p className="text-sm" style={{ color: "var(--ax-text-muted)" }}>No groups yet</p>
                    <Link href="/campus" className="text-xs text-emerald-400 hover:underline">Join a group →</Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {groups.slice(0, 4).map((g, i) => (
                      <motion.div key={g.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.05 }}>
                        <Link href="/campus/my-campus" className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--ax-surface-hover)] group"
                          style={{ border: "1px solid var(--ax-border)" }}>
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${g.avatar_color} text-[10px] font-bold text-white ring-1 ring-white/10`}>{g.avatar_initials}</div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold" style={{ color: "var(--ax-text-primary)" }}>{g.name}</p>
                            <div className="flex gap-2 text-[10px]" style={{ color: "var(--ax-text-faint)" }}>
                              <span className="flex items-center gap-0.5"><Users className="h-2.5 w-2.5" />{g.member_count}</span>
                              <span className="flex items-center gap-0.5"><ClipboardList className="h-2.5 w-2.5" />{g.assignment_count ?? 0}</span>
                            </div>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ring-1 hidden sm:block ${g.userRole === "admin" || g.userRole === "owner" ? "bg-amber-500/10 text-amber-400 ring-amber-500/20" : "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"}`}>
                            {g.userRole}
                          </span>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}
              </Panel>

              {/* Forum Posts */}
              <Panel title="My Forum Posts" icon={MessageSquare} href="/forums" color="text-indigo-400" delay={0.08}>
                {recentPosts.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <MessageSquare className="h-8 w-8" style={{ color: "var(--ax-text-faint)" }} />
                    <p className="text-sm" style={{ color: "var(--ax-text-muted)" }}>No posts yet</p>
                    <Link href="/forums/create" className="text-xs text-indigo-400 hover:underline">Start a discussion →</Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {recentPosts.map((p, i) => (
                      <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.04 }}
                        className="rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--ax-surface-hover)]"
                        style={{ border: "1px solid var(--ax-border)" }}>
                        <p className="truncate text-xs font-medium" style={{ color: "var(--ax-text-primary)" }}>{p.title}</p>
                        <div className="mt-1 flex items-center justify-between text-[10px]" style={{ color: "var(--ax-text-faint)" }}>
                          <span>{relTimeFull(p.created_at)}</span>
                          <div className="flex gap-2">
                            <span className="flex items-center gap-0.5 text-indigo-400"><TrendingUp className="h-2.5 w-2.5" />{p.upvotes_count}</span>
                            <span className="flex items-center gap-0.5"><MessageSquare className="h-2.5 w-2.5" />{p.comments_count}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </Panel>

              {/* Library */}
              <Panel title="Library" icon={BookOpen} href="/library" color="text-amber-400" delay={0.12}>
                {libraryNotes.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <Upload className="h-8 w-8" style={{ color: "var(--ax-text-faint)" }} />
                    <p className="text-sm" style={{ color: "var(--ax-text-muted)" }}>No uploads yet</p>
                    <Link href="/library/upload" className="text-xs text-amber-400 hover:underline">Upload a file →</Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {libraryNotes.map((n) => (
                      <div key={n.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--ax-surface-hover)]"
                        style={{ border: "1px solid var(--ax-border)" }}>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
                          <BookOpen className="h-4 w-4 text-amber-400" />
                        </div>
                        <p className="flex-1 truncate text-xs font-medium" style={{ color: "var(--ax-text-primary)" }}>{n.title}</p>
                        <span className="text-[10px]" style={{ color: "var(--ax-text-faint)" }}>{n.views_count ?? 0} views</span>
                      </div>
                    ))}
                    <Link href="/library" className="flex items-center justify-center gap-1 pt-1 text-xs text-amber-400 transition hover:text-amber-300 hover:underline">
                      Browse Library <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </Panel>

              {/* Study Plans */}
              <Panel title="Study Plans" icon={Target} href="/planner" color="text-violet-400" delay={0.15}>
                {studyPlans.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <Calendar className="h-8 w-8" style={{ color: "var(--ax-text-faint)" }} />
                    <p className="text-sm" style={{ color: "var(--ax-text-muted)" }}>No plans yet</p>
                    <Link href="/planner" className="text-xs text-violet-400 hover:underline">Create a plan →</Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {studyPlans.map((p, i) => {
                      const daysLeft = Math.ceil((new Date(p.targetDate).getTime() - Date.now()) / 86_400_000);
                      const pct = Math.max(0, Math.min(100, 100 - (daysLeft / 30) * 100));
                      return (
                        <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}>
                          <Link href="/planner" className="flex flex-col gap-2 rounded-xl px-4 py-3 transition-colors hover:bg-[var(--ax-surface-hover)]"
                            style={{ border: "1px solid var(--ax-border)" }}>
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-xs font-semibold" style={{ color: "var(--ax-text-primary)" }}>{p.name}</p>
                              <span className={`shrink-0 text-[10px] font-bold ${daysLeft < 0 ? "text-rose-400" : daysLeft <= 7 ? "text-amber-400" : ""}`}
                                style={daysLeft >= 8 ? { color: "var(--ax-text-faint)" } : {}}>
                                {daysLeft < 0 ? `${Math.abs(daysLeft)}d ago` : daysLeft === 0 ? "Today!" : `${daysLeft}d`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--ax-text-faint)" }}>
                              <BookOpen className="h-3 w-3" />{p.totalChapters} chapters · {p.dailyHours}h/day
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--ax-surface-3)" }}>
                              <div className="h-full rounded-full bg-violet-500 transition-all duration-700" style={{ width: `${pct}%`, boxShadow: "0 0 10px rgba(139,92,246,0.5)" }} />
                            </div>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </Panel>
            </div>
          </motion.div>
        )}

        {/* ═══════════ DISCOVER TAB ═══════════ */}
        {tab === "discover" && (
          <motion.div key="discover" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Trending in Library */}
              <Panel title="Trending in Library" icon={TrendingUp} href="/library" color="text-amber-400" delay={0.05}>
                {trendingNotes.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <BookOpen className="h-8 w-8" style={{ color: "var(--ax-text-faint)" }} />
                    <p className="text-sm" style={{ color: "var(--ax-text-muted)" }}>No trending notes yet</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {trendingNotes.map((n, i) => (
                      <motion.div key={n.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + i * 0.04 }}>
                        <Link href="/library" className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--ax-surface-hover)] group"
                          style={{ border: "1px solid var(--ax-border)" }}>
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-[10px] font-bold text-amber-400 ring-1 ring-amber-500/20">{i + 1}</div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium" style={{ color: "var(--ax-text-primary)" }}>{n.title}</p>
                            <p className="text-[10px]" style={{ color: "var(--ax-text-faint)" }}>{n.subject}</p>
                          </div>
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="flex items-center gap-0.5 text-[10px] text-amber-400"><Eye className="h-2.5 w-2.5" />{n.views_count}</span>
                            {n.avg_rating && <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "var(--ax-text-faint)" }}><Star className="h-2.5 w-2.5" />{n.avg_rating.toFixed(1)}</span>}
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}
              </Panel>

              {/* Hot Discussions */}
              <Panel title="Hot Discussions" icon={Flame} href="/forums" color="text-rose-400" delay={0.10}>
                {hotPosts.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <MessageSquare className="h-8 w-8" style={{ color: "var(--ax-text-faint)" }} />
                    <p className="text-sm" style={{ color: "var(--ax-text-muted)" }}>No hot discussions yet</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {hotPosts.map((p, i) => (
                      <motion.div key={p.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.10 + i * 0.04 }}
                        className="rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--ax-surface-hover)]"
                        style={{ border: "1px solid var(--ax-border)" }}>
                        <p className="truncate text-xs font-medium" style={{ color: "var(--ax-text-primary)" }}>{p.title}</p>
                        <div className="mt-1 flex items-center justify-between text-[10px]" style={{ color: "var(--ax-text-faint)" }}>
                          <span>{p.author_name ?? "User"}</span>
                          <div className="flex gap-2">
                            <span className="flex items-center gap-0.5 text-rose-400"><TrendingUp className="h-2.5 w-2.5" />{p.upvotes_count}</span>
                            <span className="flex items-center gap-0.5"><MessageSquare className="h-2.5 w-2.5" />{p.comments_count}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </Panel>

              {/* Recommended */}
              <Panel title="Recommended For You" icon={Zap} href="/library" color="text-violet-400" delay={0.15}>
                {recommended.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <Sparkles className="h-8 w-8" style={{ color: "var(--ax-text-faint)" }} />
                    <p className="text-sm" style={{ color: "var(--ax-text-muted)" }}>Upload notes to get personalized recommendations</p>
                    <Link href="/library/upload" className="text-xs text-violet-400 hover:underline">Upload Notes →</Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {recommended.map((n, i) => (
                      <motion.div key={n.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.04 }}>
                        <Link href="/library" className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--ax-surface-hover)] group"
                          style={{ border: "1px solid var(--ax-border)" }}>
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-violet-500/20">
                            <Zap className="h-3 w-3 text-violet-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium" style={{ color: "var(--ax-text-primary)" }}>{n.title}</p>
                            <p className="text-[10px]" style={{ color: "var(--ax-text-faint)" }}>{n.subject}</p>
                          </div>
                          <div className="flex flex-col items-end gap-0.5">
                            {n.avg_rating && <span className="flex items-center gap-0.5 text-[10px] text-violet-400"><Star className="h-2.5 w-2.5" />{n.avg_rating.toFixed(1)}</span>}
                            <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "var(--ax-text-faint)" }}><Eye className="h-2.5 w-2.5" />{n.views_count ?? 0}</span>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          </motion.div>
        )}

        {/* ═══════════ QUICK ACTIONS TAB ═══════════ */}
        {tab === "actions" && (
          <motion.div key="actions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="grid gap-6 lg:grid-cols-2">
              <Panel title="Quick Actions" icon={Sparkles} color="text-amber-400" delay={0.05}>
                <div className="flex flex-col gap-2">
                  {[
                    { label: "Upload to Library", href: "/library/upload", icon: Upload, color: "text-amber-400", bg: "bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/20" },
                    { label: "Start Discussion", href: "/forums/create", icon: MessageSquare, color: "text-indigo-400", bg: "bg-indigo-500/10 hover:bg-indigo-500/15 border-indigo-500/20" },
                    { label: "Create Study Plan", href: "/planner", icon: Calendar, color: "text-violet-400", bg: "bg-violet-500/10 hover:bg-violet-500/15 border-violet-500/20" },
                    { label: "Join a Group", href: "/campus/join", icon: GraduationCap, color: "text-emerald-400", bg: "bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/20" },
                    { label: "View Insights", href: "/insights", icon: BarChart2, color: "text-cyan-400", bg: "bg-cyan-500/10 hover:bg-cyan-500/15 border-cyan-500/20" },
                  ].map(({ label, href, icon: Icon, color, bg }, i) => (
                    <motion.div key={href} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + i * 0.04 }}>
                      <Link href={href} className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors group ${bg}`}>
                        <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                        <span style={{ color: "var(--ax-text-secondary)" }} className="group-hover:text-white transition-colors">{label}</span>
                        <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 transition-all group-hover:translate-x-0.5" style={{ color: "var(--ax-text-faint)" }} />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </Panel>

              {/* AI Lab CTA */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.10 }}>
                <Link href="/ai-lab" className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl p-6 transition hover:shadow-lg"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.1),transparent)]" />
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">AI Lab</p>
                    <p className="text-sm text-violet-200/80 mt-1">Upload a PDF → get summaries, quizzes, flashcards & more</p>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-semibold text-violet-200 transition group-hover:text-white">
                    Open AI Lab <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
