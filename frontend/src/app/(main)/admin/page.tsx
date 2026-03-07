"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    ShieldCheck, Users, MessageSquare, BookOpen, School, ClipboardList,
    TrendingUp, Loader2, Trash2, BadgeCheck, BadgeX, ArrowLeft, BarChart2,
    CheckCircle2, AlertCircle, Eye, Flag, Search, Filter,
    Activity, Globe, Database, Server, Clock, AlertTriangle,
    ChevronRight, Download, Star, Zap, Ban,
} from "lucide-react";
import {
    isAdminSession, fetchPlatformStats, adminDeleteNote, adminDeletePost,
    adminDeleteGroup, setUserVerified, setGroupVerified,
    adminUserBlock, adminUserDelete, type PlatformStats,
} from "@/lib/admin";
import { globalSearch, getAllUsers, type SearchResults, type SearchUser } from "@/lib/social";

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ values, color = "#6366f1", height = 32 }: { values: number[]; color?: string; height?: number }) {
    const max = Math.max(...values, 1);
    const w = 100;
    const points = values.map((v, i) => `${(i / (values.length - 1)) * w},${height - (v / max) * (height - 4)}`).join(" ");
    return (
        <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
            <defs>
                <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polygon points={`0,${height} ${points} ${w},${height}`} fill={`url(#sg-${color.replace("#", "")})`} />
            <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

// ─── Bar Chart (Enhanced) ─────────────────────────────────────────────────────

function BarChart({ values, color = "#6366f1", label }: { values: number[]; color?: string; label: string }) {
    const max = Math.max(...values, 1);
    const labels = ["W-7", "W-6", "W-5", "W-4", "W-3", "W-2", "W-1", "Now"];
    return (
        <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--ax-text-faint)" }}>{label}</p>
            <div className="flex h-24 items-end gap-1.5">
                {values.map((v, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1 group">
                        <span className="text-[9px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color }}>{v}</span>
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max((v / max) * 80, v > 0 ? 4 : 0)}px` }}
                            transition={{ delay: i * 0.05, duration: 0.5 }}
                            className="w-full rounded-t-md transition-all group-hover:opacity-100"
                            style={{ background: color, opacity: 0.4 + (i / values.length) * 0.6 }}
                        />
                        <span className="text-[8px]" style={{ color: "var(--ax-text-faint)" }}>{labels[i]}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, gradient, trend, sparkData }: {
    label: string; value: number; icon: React.ElementType; gradient: string;
    trend?: string; sparkData?: number[];
}) {
    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="ax-card group relative overflow-hidden p-5">
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.05] transition-opacity duration-300`} />
            <div className="flex items-start justify-between mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
                    <Icon className="h-4.5 w-4.5 text-white" />
                </div>
                {trend && (
                    <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 ring-1 ring-emerald-500/20">
                        <TrendingUp className="h-2.5 w-2.5" />{trend}
                    </span>
                )}
            </div>
            <p className="text-2xl font-bold" style={{ color: "var(--ax-text-primary)" }}>{value.toLocaleString()}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--ax-text-muted)" }}>{label}</p>
            {sparkData && (
                <div className="mt-3 -mx-1">
                    <Sparkline values={sparkData} color={gradient.includes("blue") ? "#3b82f6" : gradient.includes("purple") ? "#8b5cf6" : gradient.includes("amber") ? "#f59e0b" : gradient.includes("emerald") ? "#10b981" : "#f43f5e"} />
                </div>
            )}
        </motion.div>
    );
}

// Moderation UI and System Health removed as per user request.


// ─── Section Panel ────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children, color = "text-slate-400", badge }: {
    title: string; icon: React.ElementType; children: React.ReactNode; color?: string; badge?: number;
}) {
    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="ax-card-flat overflow-hidden">
            <div className="flex items-center justify-between border-b px-5 py-3.5"
                style={{ borderColor: "var(--ax-border)", background: "var(--ax-surface-1)" }}>
                <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${color}`} />
                    <h2 className="text-sm font-bold" style={{ color: "var(--ax-text-primary)" }}>{title}</h2>
                </div>
                {badge !== undefined && badge > 0 && (
                    <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-400 ring-1 ring-indigo-500/20">
                        {badge}
                    </span>
                )}
            </div>
            <div className="flex flex-col gap-2 p-4">{children}</div>
        </motion.div>
    );
}

// ─── User Row ─────────────────────────────────────────────────────────────────

function UserRow({ user, onToggleVerify, onBlock, onDelete }: {
    user: { id: string; display_name: string | null; avatar_url: string | null; is_verified: boolean; is_banned?: boolean };
    onToggleVerify: () => void;
    onBlock: () => void;
    onDelete: () => void;
}) {
    const initials = (user.display_name ?? "U").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
    return (
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--ax-surface-hover)]"
            style={{ border: "1px solid var(--ax-border)" }}>
            {user.avatar_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={user.avatar_url} alt={user.display_name ?? "User avatar"} className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-white/10" />
                : <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[10px] font-bold text-white ring-1 ring-white/10">{initials}</div>
            }
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <p className="truncate text-xs font-semibold" style={{ color: "var(--ax-text-primary)" }}>{user.display_name ?? "Unnamed User"}</p>
                    {user.is_verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-blue-400" />}
                    {user.is_banned && <span className="rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold text-rose-500 font-mono">BANNED</span>}
                </div>
                <p className="text-[10px]" style={{ color: "var(--ax-text-faint)" }}>{user.id.slice(0, 16)}…</p>
            </div>
            <div className="flex items-center gap-2">
                <Link href={`/users/${user.id}`} className="text-[10px] text-blue-400 hover:text-blue-300 transition hover:underline">View</Link>
                <button onClick={onToggleVerify}
                    className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors
                        ${user.is_verified
                            ? "border-slate-600 bg-slate-800/80 text-slate-400 hover:bg-slate-700"
                            : "border-blue-700/50 bg-blue-600/15 text-blue-400 hover:bg-blue-600/25"}`}>
                    {user.is_verified ? <BadgeX className="h-3 w-3" /> : <BadgeCheck className="h-3 w-3" />}
                    {user.is_verified ? "Unverify" : "Verify"}
                </button>
                <button onClick={onBlock}
                    className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors
                        ${user.is_banned
                            ? "border-emerald-700/50 bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600/25"
                            : "border-rose-700/50 bg-rose-600/15 text-rose-400 hover:bg-rose-600/25"}`}>
                    {user.is_banned ? <CheckCircle2 className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                    {user.is_banned ? "Unblock" : "Block"}
                </button>
                <button onClick={onDelete}
                    className="flex items-center gap-1 rounded-lg border border-rose-700/50 bg-rose-950/30 px-2 py-1 text-[10px] font-medium text-rose-400 hover:bg-rose-900/50 transition">
                    <Trash2 className="h-3 w-3" />
                </button>
            </div>
        </div>
    );
}

// ─── Admin Page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
    const router = useRouter();
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"overview" | "users" | "content">("overview");
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    // Advanced search
    const [searchQ, setSearchQ] = useState("");
    const [isSearching, setIsSearching] = useState(false);

    // Pagination for users tab
    const [usersPage, setUsersPage] = useState(1);
    const [paginatedUsers, setPaginatedUsers] = useState<SearchUser[]>([]);
    const [totalUsersCount, setTotalUsersCount] = useState(0);

    // Deletion Modal State
    const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
    const [isDeletingUser, setIsDeletingUser] = useState(false);

    const loadUsersPage = useCallback(async (page: number, query: string) => {
        setIsSearching(true);
        try {
            if (query.trim() !== "") {
                const res = await globalSearch(query);
                setPaginatedUsers(res.users);
                setTotalUsersCount(res.users.length);
            } else {
                const { users, total } = await getAllUsers(page, 10);
                setPaginatedUsers(users);
                setTotalUsersCount(total);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        if (!isAdminSession()) { router.replace("/dashboard"); return; }
        fetchPlatformStats().then((s) => { setStats(s); setLoading(false); });
        loadUsersPage(1, "");
    }, [router, loadUsersPage]);

    // Handle search input debounce
    useEffect(() => {
        if (tab !== "users") return;
        const to = setTimeout(() => {
            setUsersPage(1);
            loadUsersPage(1, searchQ);
        }, 500);
        return () => clearTimeout(to);
    }, [searchQ, tab, loadUsersPage]);

    function showToast(msg: string, ok = true) {

        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3000);
    }

    async function deletePost(id: string) {
        try { await adminDeletePost(id); showToast("Post deleted"); setStats((s) => s ? { ...s, recentPosts: s.recentPosts.filter((p) => p.id !== id), totalPosts: s.totalPosts - 1 } : s); }
        catch { showToast("Failed to delete post", false); }
    }
    async function deleteNote(id: string) {
        try { await adminDeleteNote(id); showToast("File deleted"); setStats((s) => s ? { ...s, recentNotes: s.recentNotes.filter((n) => n.id !== id), totalNotes: s.totalNotes - 1 } : s); }
        catch { showToast("Failed to delete file", false); }
    }
    async function deleteGroup(id: string) {
        try { await adminDeleteGroup(id); showToast("Group deleted"); setStats((s) => s ? { ...s, recentGroups: s.recentGroups.filter((g) => g.id !== id), totalGroups: s.totalGroups - 1 } : s); }
        catch { showToast("Failed to delete group", false); }
    }
    async function toggleUserVerified(userId: string, current: boolean) {
        await setUserVerified(userId, !current);
        showToast(!current ? "User verified ✓" : "Verification removed");
        setStats((s) => s ? { ...s, recentUsers: s.recentUsers.map((u) => u.id === userId ? { ...u, is_verified: !current } : u) } : s);
    }
    async function toggleGroupVerified(groupId: string, current: boolean) {
        await setGroupVerified(groupId, !current);
        showToast(!current ? "Group verified ✓" : "Group verification removed");
        setStats((s) => s ? { ...s, recentGroups: s.recentGroups.map((g) => g.id === groupId ? { ...g, is_verified: !current } : g) } : s);
    }

    async function toggleUserBanned(userId: string, current: boolean) {
        try {
            await adminUserBlock(userId, !current);
            showToast(!current ? "User blocked 🚫" : "User unblocked ✓");
            setPaginatedUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_banned: !current } : u));
            setStats((s) => s ? { ...s, recentUsers: s.recentUsers.map((u) => u.id === userId ? { ...u, is_banned: !current } : u) } : s);
        } catch {
            showToast("Failed to modify user state", false);
        }
    }

    function promptDeleteUser(userId: string, name: string) {
        setUserToDelete({ id: userId, name });
    }

    async function confirmUserDeletion() {
        if (!userToDelete) return;
        setIsDeletingUser(true);
        try {
            await adminUserDelete(userToDelete.id);
            showToast("User deleted successfully");
            setPaginatedUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
            setStats((s) => s ? { ...s, totalUsers: s.totalUsers - 1, recentUsers: s.recentUsers.filter((u) => u.id !== userToDelete.id) } : s);
            setUserToDelete(null);
        } catch {
            showToast("Failed to delete user", false);
        } finally {
            setIsDeletingUser(false);
        }
    }

    const TABS = [
        { key: "overview" as const, label: "Overview", icon: BarChart2 },
        { key: "users" as const, label: "Users", icon: Users },
        { key: "content" as const, label: "Content", icon: BookOpen },
    ];

    if (loading) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
                <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
                    <Loader2 className="h-8 w-8 animate-spin text-amber-500 relative" />
                </div>
                <p className="text-sm" style={{ color: "var(--ax-text-muted)" }}>Loading platform analytics…</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 ax-ambient-glow min-h-screen">
            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border px-4 py-3 shadow-2xl text-sm font-medium backdrop-blur-md
                            ${toast.ok ? "border-emerald-700/50 bg-emerald-950/60 text-emerald-400" : "border-rose-700/50 bg-rose-950/60 text-rose-400"}`}>
                        {toast.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Header Banner ── */}
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
                className="ax-gradient-border mb-7 overflow-hidden backdrop-blur-md" style={{ background: "var(--ax-surface-1)" }}>
                <div className="h-[2px] w-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
                <div className="flex items-center justify-between gap-4 px-6 py-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg"
                            style={{ boxShadow: "0 4px 14px rgba(245, 158, 11, 0.3)" }}>
                            <ShieldCheck className="h-5.5 w-5.5" />
                        </div>
                        <div>
                            <p className="text-xs" style={{ color: "var(--ax-text-muted)" }}>Platform Control</p>
                            <h1 className="text-lg font-bold tracking-tight" style={{ color: "var(--ax-text-primary)" }}>Admin Dashboard</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--ax-surface-3)]"
                            style={{ color: "var(--ax-text-muted)", border: "1px solid var(--ax-border)" }}>
                            <ArrowLeft className="h-3.5 w-3.5" /> Back to App
                        </Link>
                    </div>
                </div>
            </motion.div>

            {/* ── Platform Stats Grid ── */}
            <div className="mb-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <StatCard label="Total Users" value={stats!.totalUsers} icon={Users} gradient="from-blue-500 to-indigo-600"
                    trend="+12%" sparkData={[3, 5, 4, 7, 6, 8, 9, 12]} />
                <StatCard label="Forum Posts" value={stats!.totalPosts} icon={MessageSquare} gradient="from-purple-500 to-violet-600"
                    sparkData={stats!.postsByWeek} />
                <StatCard label="Library Files" value={stats!.totalNotes} icon={BookOpen} gradient="from-amber-500 to-orange-600"
                    sparkData={stats!.notesByWeek} />
                <StatCard label="Campus Groups" value={stats!.totalGroups} icon={School} gradient="from-emerald-500 to-teal-600"
                    trend="+5%" />
                <StatCard label="Submissions" value={stats!.totalSubmissions} icon={ClipboardList} gradient="from-rose-500 to-pink-600" />
            </div>

            {/* ── Analytics Charts Row ── */}
            <div className="mb-7 grid gap-6 sm:grid-cols-2">
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                    className="ax-card p-5">
                    <BarChart values={stats!.postsByWeek} color="#8b5cf6" label="Forum Posts per Week" />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="ax-card p-5">
                    <BarChart values={stats!.notesByWeek} color="#f59e0b" label="Library Uploads per Week" />
                </motion.div>
            </div>

            {/* ── Controls Row ── */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex gap-1 overflow-x-auto scrollbar-hide rounded-xl p-1 shrink-0"
                    style={{ background: "var(--ax-surface-2)", border: "1px solid var(--ax-border)" }}>
                    {TABS.map(({ key, label, icon: Icon }) => (
                        <button key={key} onClick={() => setTab(key as any)}
                            className={`relative flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all whitespace-nowrap
                                ${tab === key ? "text-white shadow-sm" : "hover:bg-[var(--ax-surface-3)]"}`}
                            style={tab === key ? { background: "var(--ax-surface-3)" } : { color: "var(--ax-text-muted)" }}>
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                            {tab === key && (
                                <motion.div layoutId="admin-tab-pill" className="absolute inset-0 rounded-lg"
                                    style={{ background: "var(--ax-surface-3)", zIndex: -1 }}
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }} />
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 h-11 w-full sm:max-w-xs transition-colors focus-within:ring-2 focus-within:ring-amber-500/50"
                    style={{ border: "1px solid var(--ax-border)", background: "var(--ax-surface-2)" }}>
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin text-amber-500" /> : <Search className="h-4 w-4 text-slate-500" />}
                    <input
                        type="text"
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                        placeholder={tab === "users" ? "Find user by @handle or name…" : "Search content globally…"}
                        className="bg-transparent text-sm outline-none w-full placeholder:text-slate-500"
                        style={{ color: "var(--ax-text-primary)" }}
                    />
                </div>
            </div>

            {/* ── Tab Content ── */}
            <AnimatePresence mode="wait">
                {/* Overview Tab */}
                {tab === "overview" && (
                    <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className="grid gap-6 lg:grid-cols-2">
                        <Section title="Recent Users" icon={Users} color="text-blue-400" badge={stats!.recentUsers.length}>
                            {stats!.recentUsers.slice(0, 8).map((u) => (
                                <UserRow key={u.id} user={u as any} onToggleVerify={() => toggleUserVerified(u.id, u.is_verified)} onBlock={() => toggleUserBanned(u.id, !!u.is_banned)} onDelete={() => promptDeleteUser(u.id, u.display_name ?? 'this user')} />
                            ))}
                        </Section>
                        <Section title="Recent Posts" icon={MessageSquare} color="text-indigo-400" badge={stats!.recentPosts.length}>
                            {stats!.recentPosts.slice(0, 8).map((p) => (
                                <div key={p.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--ax-surface-hover)]"
                                    style={{ border: "1px solid var(--ax-border)" }}>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-medium" style={{ color: "var(--ax-text-primary)" }}>{p.title}</p>
                                        <p className="text-[10px]" style={{ color: "var(--ax-text-faint)" }}>
                                            {new Date(p.created_at).toLocaleDateString()} · <TrendingUp className="inline h-2.5 w-2.5" /> {p.upvotes_count}
                                        </p>
                                    </div>
                                    <button onClick={() => deletePost(p.id)} className="shrink-0 rounded-lg p-1.5 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                                        style={{ color: "var(--ax-text-faint)" }}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </Section>
                    </motion.div>
                )}

                {/* Users Tab */}
                {tab === "users" && (
                    <motion.div key="users" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                        <Section title={searchQ ? `Search Results (${totalUsersCount})` : "All Registered Users"} icon={Users} color="text-blue-400" badge={totalUsersCount}>
                            {paginatedUsers.length === 0 && !isSearching ? (
                                <div className="py-8 text-center text-sm text-slate-500">No users found for &quot;{searchQ}&quot;</div>
                            ) : (
                                paginatedUsers.map((u) => (
                                    <UserRow key={u.id} user={u as any} onToggleVerify={() => toggleUserVerified(u.id, !!(u as any).is_verified)} onBlock={() => toggleUserBanned(u.id, !!(u as any).is_banned)} onDelete={() => promptDeleteUser(u.id, u.display_name ?? 'this user')} />
                                ))
                            )}

                            {/* Pagination Controls */}
                            {searchQ.trim() === "" && totalUsersCount > 10 && (
                                <div className="mt-4 flex flex-wrap justify-center gap-1">
                                    {Array.from({ length: Math.ceil(totalUsersCount / 10) }).map((_, idx) => {
                                        const pageNum = idx + 1;
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => {
                                                    setUsersPage(pageNum);
                                                    loadUsersPage(pageNum, "");
                                                }}
                                                disabled={isSearching}
                                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold transition ${usersPage === pageNum ? "bg-amber-600 text-white" : "bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200"} ${isSearching ? "opacity-50 cursor-not-allowed" : ""}`}
                                            >
                                                {usersPage === pageNum && isSearching ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : pageNum}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </Section>
                    </motion.div>
                )}

                {/* Content Tab */}
                {tab === "content" && (
                    <motion.div key="content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className="grid gap-6 lg:grid-cols-2">
                        <Section title="Library Files (Most Viewed)" icon={BookOpen} color="text-amber-400" badge={stats!.totalNotes}>
                            {stats!.recentNotes.map((n) => (
                                <div key={n.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--ax-surface-hover)]"
                                    style={{ border: "1px solid var(--ax-border)" }}>
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
                                        <BookOpen className="h-4 w-4 text-amber-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-medium" style={{ color: "var(--ax-text-primary)" }}>{n.title}</p>
                                        <p className="text-[10px]" style={{ color: "var(--ax-text-faint)" }}>
                                            <Download className="inline h-2.5 w-2.5" /> {n.downloads_count ?? 0} · {new Date(n.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <button onClick={() => deleteNote(n.id)}
                                        className="flex items-center gap-1 rounded-lg border border-rose-700/50 bg-rose-950/30 px-2 py-1 text-[10px] font-medium text-rose-400 hover:bg-rose-900/50 transition">
                                        <Trash2 className="h-3 w-3" /> Remove
                                    </button>
                                </div>
                            ))}
                        </Section>
                        <Section title="Campus Groups" icon={School} color="text-emerald-400" badge={stats!.totalGroups}>
                            {stats!.recentGroups.map((g) => (
                                <div key={g.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--ax-surface-hover)]"
                                    style={{ border: "1px solid var(--ax-border)" }}>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <p className="truncate text-xs font-semibold" style={{ color: "var(--ax-text-primary)" }}>{g.name}</p>
                                            {g.is_verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                                        </div>
                                        <p className="text-[10px]" style={{ color: "var(--ax-text-faint)" }}>{g.member_count} members</p>
                                    </div>
                                    <button onClick={() => toggleGroupVerified(g.id, g.is_verified)}
                                        className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors
                                            ${g.is_verified ? "border-slate-600 bg-slate-800/80 text-slate-400 hover:bg-slate-700" : "border-amber-700/40 bg-amber-600/15 text-amber-500 hover:bg-amber-600/25"}`}>
                                        {g.is_verified ? <BadgeX className="h-3 w-3" /> : <BadgeCheck className="h-3 w-3" />}
                                        {g.is_verified ? "Unverify" : "Verify"}
                                    </button>
                                    <button onClick={() => deleteGroup(g.id)}
                                        className="flex items-center gap-1 rounded-lg border border-rose-700/50 bg-rose-950/30 px-2 py-1 text-[10px] font-medium text-rose-400 hover:bg-rose-900/50 transition">
                                        <Trash2 className="h-3 w-3" /> Delete
                                    </button>
                                </div>
                            ))}
                        </Section>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom Delete Confirmation Modal */}
            <AnimatePresence>
                {userToDelete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            className="w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl"
                            style={{ background: "var(--ax-surface-1)", border: "1px solid var(--ax-border)" }}
                        >
                            <div className="p-6">
                                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10">
                                    <AlertTriangle className="h-6 w-6 text-rose-500" />
                                </div>
                                <h3 className="text-center text-lg font-bold" style={{ color: "var(--ax-text-primary)" }}>
                                    Delete User File?
                                </h3>
                                <p className="mt-2 text-center text-sm" style={{ color: "var(--ax-text-faint)" }}>
                                    Are you absolutely sure you want to permanently delete <strong>{userToDelete.name}</strong>? This action will destroy their account and cannot be reversed.
                                </p>
                            </div>
                            <div className="flex gap-3 bg-black/20 p-4" style={{ borderTop: "1px solid var(--ax-border)" }}>
                                <button
                                    onClick={() => setUserToDelete(null)}
                                    disabled={isDeletingUser}
                                    className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:bg-[var(--ax-surface-3)]"
                                    style={{ color: "var(--ax-text-muted)" }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmUserDeletion}
                                    disabled={isDeletingUser}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
                                >
                                    {isDeletingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
