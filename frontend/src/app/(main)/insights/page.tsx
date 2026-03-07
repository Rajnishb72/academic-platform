"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import {
  Activity, ArrowRight, Award, BarChart2, BookOpen, Bot, Brain, CalendarDays,
  CheckCircle2, ClipboardList, Flame, GraduationCap, Loader2, MessageSquare,
  School, Sparkles, Star, Target, Trophy, TrendingUp, Upload, Users, Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchMyInstitutions, fetchAssignments } from "@/lib/campus";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ForumPost { id: string; title: string; created_at: string; upvotes_count: number; comments_count: number; category?: string; }
interface LibraryNote { id: string; title: string; created_at?: string; views_count?: number; downloads_count?: number; subject?: string; }
interface SavedScheduleSlot { chapterIndex: number; title: string; startDate: string; endDate: string; daysAllocated: number; difficulty: "easy" | "medium" | "hard"; }
interface SavedPlan { id: string; name: string; createdAt: string; targetDate: string; dailyHours: number; plan: { feasible: boolean; schedule: SavedScheduleSlot[]; overallStrategy: string }; }
interface InsightData { forumPosts: ForumPost[]; libraryNotes: LibraryNote[]; plans: SavedPlan[]; groupCount: number; pendingCount: number; submittedCount: number; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function totalChapters(plans: SavedPlan[]) { return plans.reduce((s, p) => s + p.plan.schedule.length, 0); }

function weeklyBuckets(events: string[], weeks = 8): number[] {
  const now = Date.now();
  return Array.from({ length: weeks }, (_, i) => {
    const from = now - (weeks - i) * 7 * 86_400_000;
    const to = now - (weeks - i - 1) * 7 * 86_400_000;
    return events.filter((e) => { const t = new Date(e).getTime(); return t >= from && t < to; }).length;
  });
}

function buildHeatmap(events: string[]): Map<string, number> {
  const map = new Map<string, number>();
  events.forEach((d) => { const key = d.split("T")[0]; map.set(key, (map.get(key) ?? 0) + 1); });
  return map;
}

function heatColor(count: number) {
  if (count === 0) return "bg-slate-800/60";
  if (count === 1) return "bg-blue-900/60";
  if (count === 2) return "bg-blue-600/80";
  if (count === 3) return "bg-blue-500";
  return "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]";
}

// ─── Progress Ring ─────────────────────────────────────────────────────────────

function ProgressRing({ pct, size = 80, stroke = 6, color = "#3b82f6" }: { pct: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1.2s ease" }} />
    </svg>
  );
}

// ─── Bar Chart ─────────────────────────────────────────────────────────────────

function BarChart({ values, color = "bg-blue-500", labels }: { values: number[]; color?: string; labels?: string[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-24 items-end gap-1.5">
      {values.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div className="relative w-full">
            <div className={`w-full rounded-t-md ${color} transition-all duration-700`}
              style={{ height: `${Math.max((v / max) * 88, v > 0 ? 6 : 0)}px`, opacity: 0.5 + (i / values.length) * 0.5 }} />
          </div>
          {labels && <span className="text-[9px] text-slate-500">{labels[i]}</span>}
        </div>
      ))}
    </div>
  );
}

// ─── Activity Heatmap ────────────────────────────────────────────────────────

function ActivityHeatmap({ events }: { events: string[] }) {
  const today = new Date();
  const heatmap = useMemo(() => buildHeatmap(events), [events]);
  const weeks: Date[][] = [];
  const startOfGrid = new Date(today);
  startOfGrid.setDate(today.getDate() - 104);
  startOfGrid.setDate(startOfGrid.getDate() - startOfGrid.getDay());
  const cursor = new Date(startOfGrid);
  while (cursor <= today) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) { week.push(new Date(cursor)); cursor.setDate(cursor.getDate() + 1); }
    weeks.push(week);
  }
  const totalActivity = events.length;
  const last30 = events.filter((e) => (today.getTime() - new Date(e).getTime()) / 86_400_000 <= 30).length;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-4 text-xs text-slate-500">
          <span><span className="font-bold text-slate-200">{totalActivity}</span> total</span>
          <span><span className="font-bold text-blue-400">{last30}</span> this month</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((n) => <div key={n} className={`h-3 w-3 rounded-[3px] ${heatColor(n)}`} />)}
          <span>More</span>
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) => {
              const key = day.toISOString().split("T")[0];
              const count = heatmap.get(key) ?? 0;
              const isFuture = day > today;
              return <div key={di} title={`${key}: ${count} event${count !== 1 ? "s" : ""}`}
                className={`h-3 w-3 rounded-[3px] cursor-default ${isFuture ? "opacity-0" : heatColor(count)}`} />;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Metric Cell ─────────────────────────────────────────────────────────────

function MetricCell({ label, value, color, sub }: { label: string; value: number | string; color: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl py-4 transition hover:bg-[var(--ax-surface-hover)]" style={{ border: "1px solid var(--ax-border)", background: "var(--ax-surface-2)" }}>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs font-medium" style={{ color: "var(--ax-text-secondary)" }}>{label}</p>
      {sub && <p className="text-[10px]" style={{ color: "var(--ax-text-faint)" }}>{sub}</p>}
    </div>
  );
}

// ─── Section Shell ────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, color = "text-slate-400", href, children, delay = 0 }: {
  title: string; icon: React.ElementType; color?: string; href?: string; children: React.ReactNode; delay?: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="ax-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid var(--ax-border-light)", background: "var(--ax-surface-1)" }}>
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color}`} />
          <h2 className="text-sm font-bold" style={{ color: "var(--ax-text-primary)" }}>{title}</h2>
        </div>
        {href && (
          <Link href={href} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition">
            Open <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

// ─── Diff Bar ─────────────────────────────────────────────────────────────────

function DifficultyBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-xs text-slate-400 capitalize">{label}</span>
      <div className="flex-1 rounded-full bg-slate-800 h-2 overflow-hidden shadow-inner">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-xs font-medium text-slate-500">{pct}%</span>
    </div>
  );
}

// ─── Badge Card ───────────────────────────────────────────────────────────────

function BadgeCard({ label, description, icon: Icon, earned, color }: { label: string; description: string; icon: React.ElementType; earned: boolean; color: string }) {
  return (
    <div className={`relative flex items-center gap-3 rounded-xl border p-3 transition ${earned ? `border-[color:var(--tw-border-opacity)] ${color}/20 bg-[color:var(--tw-bg-opacity)] ${color}/5` : "border-[var(--ax-border)] bg-[var(--ax-surface-1)] opacity-60 grayscale"}`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${earned ? "" : "bg-slate-800"}`} style={earned ? { backgroundColor: "currentcolor", opacity: 0.1 } : {}}>
        <div className={`absolute flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${earned ? color : "text-slate-500"}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="min-w-0">
        <p className={`text-xs font-bold ${earned ? "text-white" : "text-slate-400"}`}>{label}</p>
        <p className="text-[10px] text-slate-500">{description}</p>
      </div>
      {earned && <CheckCircle2 className={`ml-auto h-3.5 w-3.5 shrink-0 ${color}`} />}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const { user } = useUser();
  const [data, setData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [forumResult, libraryResult, myGroups] = await Promise.all([
        supabase.from("forum_posts").select("id,title,created_at,upvotes_count,comments_count,category")
          .eq("user_id", user.id).order("created_at", { ascending: false }),
        fetch("/api/library/my-notes").then((r) => r.json()).catch(() => []),
        fetchMyInstitutions(user.id),
      ]);

      const posts = (forumResult.data ?? []) as ForumPost[];
      const notes = (Array.isArray(libraryResult) ? libraryResult : []) as LibraryNote[];

      let pending = 0, submitted = 0;
      await Promise.all(myGroups.map(async (g) => {
        try {
          const a = await fetchAssignments(g.id, user.id, g.userRole);
          if (g.userRole !== "admin" && g.userRole !== "owner") {
            pending += a.filter((x) => x.status === "upcoming" || x.status === "overdue").length;
          }
          submitted += a.filter((x) => x.status === "submitted" || x.status === "graded").length;
        } catch { /* ignore */ }
      }));

      let plans: SavedPlan[] = [];
      try { const raw = localStorage.getItem("academix_plans"); if (raw) plans = JSON.parse(raw) as SavedPlan[]; }
      catch { /* ignore */ }

      setData({ forumPosts: posts, libraryNotes: notes, plans, groupCount: myGroups.length, pendingCount: pending, submittedCount: submitted });
    } catch (e) { console.error("Insights load:", e); }
    finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  // Derived
  const allEvents = useMemo(() => !data ? [] : [
    ...data.forumPosts.map((p) => p.created_at),
    ...(data.libraryNotes.map((n) => n.created_at).filter(Boolean) as string[]),
    ...data.plans.map((p) => p.createdAt),
  ], [data]);

  const forumWeekly = useMemo(() => data ? weeklyBuckets(data.forumPosts.map((p) => p.created_at)) : [], [data]);
  const libraryWeekly = useMemo(() => data ? weeklyBuckets(data.libraryNotes.map((n) => n.created_at).filter(Boolean) as string[]) : [], [data]);

  const totalUpvotes = data?.forumPosts.reduce((s, p) => s + (p.upvotes_count ?? 0), 0) ?? 0;
  const totalComments = data?.forumPosts.reduce((s, p) => s + (p.comments_count ?? 0), 0) ?? 0;
  const totalViews = data?.libraryNotes.reduce((s, n) => s + (n.views_count ?? 0), 0) ?? 0;
  const totalDownloads = data?.libraryNotes.reduce((s, n) => s + (n.downloads_count ?? 0), 0) ?? 0;
  const chapters = data ? totalChapters(data.plans) : 0;

  const topPost = data?.forumPosts.reduce((b, p) => (p.upvotes_count > (b?.upvotes_count ?? -1) ? p : b), data.forumPosts[0]);
  const topNote = data?.libraryNotes.reduce((b, n) => ((n.views_count ?? 0) > (b?.views_count ?? -1) ? n : b), data.libraryNotes[0]);

  const engagementScore = useMemo(() => {
    if (!data) return 0;
    return Math.min(
      Math.min(data.forumPosts.length * 5, 25) + Math.min(data.libraryNotes.length * 8, 25) +
      Math.min(data.plans.length * 10, 25) + Math.min(data.groupCount * 8, 25), 100
    );
  }, [data]);
  const engLabel = engagementScore >= 80 ? "Outstanding!" : engagementScore >= 50 ? "Great progress" : engagementScore >= 20 ? "Building up" : "Just starting";
  const engColor = engagementScore >= 80 ? "#10b981" : engagementScore >= 50 ? "#3b82f6" : engagementScore >= 20 ? "#8b5cf6" : "#94a3b8";
  const weekLabels = ["W-7", "W-6", "W-5", "W-4", "W-3", "W-2", "W-1", "Now"];
  const firstName = user?.firstName ?? user?.username ?? "you";

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/20" />
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
        <p className="text-sm text-slate-500">Analyzing your academic activity…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

      {/* ── Header + Score ─────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="ax-card bg-[var(--ax-surface-1)]/80 backdrop-blur-md mb-7 overflow-hidden shadow-2xl">
        <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500" />
        <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--ax-text-primary)" }}>Your Insights</h1>
            <p className="mt-0.5 text-sm" style={{ color: "var(--ax-text-secondary)" }}>A full picture of your academic journey, {firstName}.</p>
          </div>
          {/* Engagement Score */}
          <div className="ax-card flex items-center gap-4 px-5 py-3 shadow-inner">
            <div className="relative flex items-center justify-center">
              <ProgressRing pct={engagementScore} size={68} stroke={6} color={engColor} />
              <div className="absolute flex flex-col items-center">
                <span className="text-base font-bold" style={{ color: engColor }}>{engagementScore}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-200">Engagement Score</p>
              <p className="text-xs text-slate-500">{engLabel}</p>
              <div className="mt-1 flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-1.5 w-6 rounded-full" style={{ background: i < Math.ceil(engagementScore / 20) ? engColor : "#1e293b" }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Hero Stats ──────────────────────────────────────────────── */}
      <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { icon: MessageSquare, label: "Forum Posts", value: data?.forumPosts.length ?? 0, sub: `${totalUpvotes} upvotes`, color: "bg-purple-600/10 text-purple-500 ring-1 ring-purple-500/20", delay: 0.04 },
          { icon: BookOpen, label: "Library Files", value: data?.libraryNotes.length ?? 0, sub: `${totalViews} views`, color: "bg-amber-600/10 text-amber-500 ring-1 ring-amber-500/20", delay: 0.08 },
          { icon: Target, label: "Study Plans", value: data?.plans.length ?? 0, sub: `${chapters} chapters`, color: "bg-rose-600/10 text-rose-500 ring-1 ring-rose-500/20", delay: 0.12 },
          { icon: School, label: "Groups", value: data?.groupCount ?? 0, sub: "joined", color: "bg-emerald-600/10 text-emerald-500 ring-1 ring-emerald-500/20", delay: 0.16 },
          { icon: CheckCircle2, label: "Submitted", value: data?.submittedCount ?? 0, sub: "assignments", color: "bg-teal-600/10 text-teal-500 ring-1 ring-teal-500/20", delay: 0.20 },
        ].map(({ icon: Icon, label, value, sub, color, delay }) => (
          <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
            className="ax-card flex flex-col gap-2 p-4 transition hover:bg-[var(--ax-surface-2)]">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}><Icon className="h-4 w-4" /></div>
            <div>
              <p className="text-2xl font-bold" style={{ color: "var(--ax-text-primary)" }}>{value}</p>
              <p className="text-xs font-medium" style={{ color: "var(--ax-text-secondary)" }}>{label}</p>
              {sub && <p className="text-[10px]" style={{ color: "var(--ax-text-faint)" }}>{sub}</p>}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Main Grid ───────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">

          {/* Activity Heatmap */}
          <Section icon={Activity} title="Activity Heatmap" color="text-blue-500" delay={0.28}>
            <ActivityHeatmap events={allEvents} />
          </Section>

          {/* Forum Performance */}
          <Section icon={MessageSquare} title="Forum Performance" color="text-purple-500" href="/forums" delay={0.32}>
            {(data?.forumPosts.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <MessageSquare className="h-9 w-9 text-slate-700" />
                <p className="text-sm text-slate-500">No forum posts yet.</p>
                <Link href="/forums/create" className="text-xs text-purple-500 hover:underline">Start a discussion →</Link>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-3 gap-3">
                  <MetricCell label="Posts" value={data?.forumPosts.length ?? 0} color="text-purple-500" />
                  <MetricCell label="Upvotes" value={totalUpvotes} color="text-blue-500" />
                  <MetricCell label="Replies" value={totalComments} color="text-emerald-500" />
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Posts per Week (8 wks)</p>
                  <BarChart values={forumWeekly} color="bg-purple-500" labels={weekLabels} />
                </div>
                {topPost && (
                  <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 px-4 py-3">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-purple-400">🔥 Top Post</p>
                    <p className="truncate text-sm font-semibold text-white">{topPost.title}</p>
                    <div className="mt-1 flex gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-purple-400" />{topPost.upvotes_count} upvotes</span>
                      <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3 text-slate-500" />{topPost.comments_count} replies</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* Library Impact */}
          <Section icon={BookOpen} title="Library Impact" color="text-amber-500" href="/library" delay={0.38}>
            {(data?.libraryNotes.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <BookOpen className="h-9 w-9 text-slate-700" />
                <p className="text-sm text-slate-500">No uploads yet.</p>
                <Link href="/library/upload" className="text-xs text-amber-500 hover:underline">Upload your first file →</Link>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-3 gap-3">
                  <MetricCell label="Files" value={data?.libraryNotes.length ?? 0} color="text-amber-500" />
                  <MetricCell label="Views" value={totalViews} color="text-blue-500" />
                  <MetricCell label="Downloads" value={totalDownloads} color="text-emerald-500" />
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Uploads per Week (8 wks)</p>
                  <BarChart values={libraryWeekly} color="bg-amber-500" labels={weekLabels} />
                </div>
                {topNote && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-400">⭐ Most Viewed</p>
                    <p className="truncate text-sm font-semibold text-white">{topNote.title}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{topNote.views_count ?? 0} views · {topNote.downloads_count ?? 0} downloads</p>
                  </div>
                )}
              </div>
            )}
          </Section>

        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">

          {/* Campus Summary */}
          <Section icon={School} title="Campus Summary" color="text-emerald-500" href="/campus/my-campus" delay={0.30}>
            <div className="grid grid-cols-2 gap-3">
              <MetricCell label="Groups Joined" value={data?.groupCount ?? 0} color="text-emerald-600" />
              <MetricCell label="Pending Tasks" value={data?.pendingCount ?? 0} color="text-blue-600" />
              <MetricCell label="Submitted Work" value={data?.submittedCount ?? 0} color="text-teal-600" />
            </div>
            <Link href="/campus/my-campus" className="mt-4 flex items-center justify-center gap-1 rounded-xl border border-emerald-500/20 bg-emerald-500/10 py-2 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/20">
              Go to Campus <ArrowRight className="h-3 w-3" />
            </Link>
          </Section>

          {/* AI Lab CTA */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Link href="/ai-lab" className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-600 to-indigo-700 p-5 transition hover:shadow-lg">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.1),transparent)]" />
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20"><Bot className="h-5 w-5 text-white" /></div>
              <div>
                <p className="text-sm font-bold text-white">AI Study Lab</p>
                <p className="text-xs text-violet-200">Upload a PDF to generate summaries, quizzes, flashcards & study insights</p>
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-violet-200 group-hover:text-white transition">
                Open AI Lab <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          </motion.div>

        </div>
      </div>
    </div >
  );
}
