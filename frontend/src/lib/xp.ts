/**
 * Global XP System — computes real XP from 3 sources: Forum, Library, Planner.
 *
 * XP Point Values:
 *   Forum:   post = 10, comment = 5, upvote received = 2
 *   Library: note uploaded = 15, download received = 1, rating received = 3
 *   Planner: plan created = 10, proof submitted = 20, milestone XP (from planner.ts)
 *
 * Title system uses lucide-react icon names for rendering.
 */

import { supabase } from "@/lib/supabase";
import { calcLibXP, computeLibraryStats, UserStats } from "./library-milestones";
import { computeMilestoneStates, ALL_MILESTONES, StoredPlan } from "./planner";

// ─── Title Definitions ──────────────────────────────────────────────────────

export interface TitleLevel {
    rank: number;
    name: string;
    /** Minimum XP to reach this level */
    threshold: number;
    /** lucide-react icon name */
    icon: string;
    /** Tailwind text color class */
    color: string;
    /** Tailwind gradient for badges */
    gradient: string;
    /** Short tagline */
    tagline: string;
}

/**
 * 10 Title Levels — calibrated so the last level (Grandmaster Sage) requires
 * heavy contribution across ALL 3 sources (Forum + Library + Planner).
 *
 * Realistic XP estimates for a power user across all 3 sources:
 *   Forum:   100 posts (1000) + 300 comments (1500) + 1000 upvotes (2000) = ~4500
 *   Library: 50 uploads (750) + 2000 downloads (2000) + 200 ratings (600) = ~3350
 *   Planner: 20 plans (200) + 100 proofs (2000) + milestones (~2000) = ~4200
 *   Total max realistic: ~12,050
 *
 * Last title at 10000 requires all 3 sources at near-max contribution.
 */
export const XP_TITLES: TitleLevel[] = [
    { rank: 1, threshold: 0, name: "Student Explorer", icon: "Sprout", color: "text-slate-400", gradient: "from-slate-600 to-slate-700", tagline: "Your academic journey begins" },
    { rank: 2, threshold: 100, name: "Eager Learner", icon: "BookOpen", color: "text-emerald-400", gradient: "from-emerald-600 to-green-700", tagline: "First steps into knowledge" },
    { rank: 3, threshold: 250, name: "Active Collaborator", icon: "PenLine", color: "text-blue-400", gradient: "from-blue-600 to-indigo-700", tagline: "Actively sharing & learning" },
    { rank: 4, threshold: 600, name: "Knowledge Builder", icon: "Layers", color: "text-indigo-400", gradient: "from-indigo-600 to-violet-700", tagline: "Consistent source of wisdom" },
    { rank: 5, threshold: 1200, name: "Campus Scholar", icon: "GraduationCap", color: "text-violet-400", gradient: "from-violet-600 to-purple-700", tagline: "Deep engagement across modules" },
    { rank: 6, threshold: 2000, name: "Trusted Mentor", icon: "HeartHandshake", color: "text-pink-400", gradient: "from-pink-600 to-rose-700", tagline: "Guiding others to excellence" },
    { rank: 7, threshold: 3500, name: "Distinguished Academic", icon: "Award", color: "text-amber-400", gradient: "from-amber-500 to-orange-600", tagline: "Recognized authority" },
    { rank: 8, threshold: 6000, name: "Elite Polymath", icon: "Combine", color: "text-orange-400", gradient: "from-orange-500 to-red-600", tagline: "Exceptional multi-source mastery" },
    { rank: 9, threshold: 10000, name: "Academix Luminary", icon: "Lightbulb", color: "text-cyan-300", gradient: "from-cyan-500 to-blue-600", tagline: "Beacon of the platform" },
    { rank: 10, threshold: 15000, name: "Grandmaster Sage", icon: "Crown", color: "text-amber-300", gradient: "from-amber-400 via-yellow-500 to-orange-500", tagline: "Legendary all-source master" },
];

// ─── Title Helpers ───────────────────────────────────────────────────────────

export function getTitle(xp: number): TitleLevel {
    let title = XP_TITLES[0];
    for (const t of XP_TITLES) {
        if (xp >= t.threshold) title = t;
        else break;
    }
    return title;
}

export function getNextTitle(xp: number): TitleLevel | null {
    for (const t of XP_TITLES) {
        if (t.threshold > xp) return t;
    }
    return null;
}

export function getXPToNextTitle(xp: number): number {
    const next = getNextTitle(xp);
    return next ? next.threshold - xp : 0;
}

export function getTitleProgress(xp: number): number {
    const current = getTitle(xp);
    const next = getNextTitle(xp);
    if (!next) return 100; // maxed out
    const range = next.threshold - current.threshold;
    const progress = xp - current.threshold;
    return Math.round((progress / range) * 100);
}

// ─── XP Breakdown ────────────────────────────────────────────────────────────

export interface XPBreakdown {
    forum: { posts: number; comments: number; upvotesReceived: number; total: number };
    library: { uploads: number; downloadsReceived: number; ratingsReceived: number; total: number };
    planner: { plans: number; proofs: number; total: number };
    totalXP: number;
    title: TitleLevel;
    nextTitle: TitleLevel | null;
    xpToNext: number;
    progressPct: number;
}

// ─── XP Point Constants ──────────────────────────────────────────────────────

export const XP_POINTS = {
    FORUM_POST: 10,
    FORUM_COMMENT: 5,
    FORUM_UPVOTE_RECEIVED: 2,
    LIBRARY_UPLOAD: 15,
    LIBRARY_DOWNLOAD_RECEIVED: 1,
    LIBRARY_RATING_RECEIVED: 3,
    PLANNER_PLAN_CREATED: 10,
    PLANNER_PROOF_SUBMITTED: 20,
} as const;

// ─── Compute XP for a single user ───────────────────────────────────────────

export async function computeUserXP(userId: string): Promise<XPBreakdown> {
    const [
        postsRes, commentsRes, upvotesRes,
        libraryNotesRes,
        plansRes, proofsRes,
    ] = await Promise.all([
        supabase.from("forum_posts").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("forum_comments").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("forum_posts").select("upvotes_count").eq("user_id", userId),
        supabase.from("notes").select("id,title,subject,file_url,downloads_count,avg_rating,created_at,views_count").eq("user_id", userId),
        // library_interactions query removed — now done after we know note IDs
        supabase.from("study_plans").select("id,name,target_date,daily_hours,plan_data,created_at").eq("user_id", userId),
        supabase.from("plan_proofs").select("id,plan_id,chapter_index,file_name,submitted_at,file_url").eq("user_id", userId),
    ]);

    const postCount = postsRes.count ?? 0;
    const commentCount = commentsRes.count ?? 0;
    const totalUpvotes = (upvotesRes.data ?? []).reduce((s: number, p: { upvotes_count: number }) => s + (p.upvotes_count ?? 0), 0);
    const forumXP = (postCount * XP_POINTS.FORUM_POST) + (commentCount * XP_POINTS.FORUM_COMMENT) + (totalUpvotes * XP_POINTS.FORUM_UPVOTE_RECEIVED);

    const myNotes = libraryNotesRes.data ?? [];
    const myNoteIds = new Set(myNotes.map(n => n.id));

    // Query interactions ON the user's notes (views/bookmarks received, not performed)
    let viewCount = 0;
    let bookmarkCount = 0;
    if (myNoteIds.size > 0) {
        const { data: noteInteractions } = await supabase
            .from("library_interactions")
            .select("interaction_type")
            .in("note_id", Array.from(myNoteIds))
            .in("interaction_type", ["view", "bookmark"]);
        (noteInteractions ?? []).forEach(i => {
            if (i.interaction_type === "view") viewCount++;
            else if (i.interaction_type === "bookmark") bookmarkCount++;
        });
    }

    // Inject fallback views_count so computeLibraryStats can aggregate accurately
    const notesWithStats = myNotes.map(n => ({
        ...n,
        views_count: n.id === myNotes[0]?.id ? viewCount : 0,
    }));

    const libStats = computeLibraryStats(notesWithStats, viewCount, bookmarkCount);
    const libraryXP = calcLibXP(libStats);

    const dbPlans = plansRes.data ?? [];
    const dbProofs = proofsRes.data ?? [];

    const proofsByPlan: Record<string, any[]> = {};
    dbProofs.forEach(p => {
        if (!proofsByPlan[p.plan_id]) proofsByPlan[p.plan_id] = [];
        proofsByPlan[p.plan_id].push(p);
    });

    const plans: StoredPlan[] = dbPlans.map(row => ({
        id: row.id,
        name: row.name,
        createdAt: row.created_at,
        targetDate: row.target_date,
        dailyHours: row.daily_hours ?? 1,
        plan: row.plan_data || { schedule: [] },
        proofs: (proofsByPlan[row.id] ?? []).map(p => ({
            chapterIndex: p.chapter_index,
            proofUrl: p.file_url,
            fileName: p.file_name,
            uploadedAt: p.submitted_at,
        })),
    }));

    const states = computeMilestoneStates(plans);
    const achievedMilestones = states.filter(s => s.achieved).map(s => ALL_MILESTONES.find(x => x.id === s.id)).filter(Boolean) as typeof ALL_MILESTONES;
    const plannerMilestoneXP = achievedMilestones.reduce((sum, m) => sum + m.xp, 0);

    const planCount = plans.length;
    const proofCount = dbProofs.length;
    const plannerBaseXP = (planCount * XP_POINTS.PLANNER_PLAN_CREATED) + (proofCount * XP_POINTS.PLANNER_PROOF_SUBMITTED);
    const plannerXP = plannerBaseXP + plannerMilestoneXP;

    const totalXP = forumXP + libraryXP + plannerXP;

    // Sync computed XP directly to profile (fire-and-forget)
    supabase.from("user_profiles").update({
        total_xp: totalXP,
        forum_xp: forumXP,
        library_xp: libraryXP,
        planner_xp: plannerXP,
    }).eq("id", userId).then(({ error }) => {
        if (error) console.error("Error syncing xp to profile:", error);
    });

    return {
        forum: { posts: postCount, comments: commentCount, upvotesReceived: totalUpvotes, total: forumXP },
        library: { uploads: myNotes.length, downloadsReceived: libStats.totalDownloads, ratingsReceived: libStats.totalRatings, total: libraryXP },
        planner: { plans: planCount, proofs: proofCount, total: plannerXP },
        totalXP,
        title: getTitle(totalXP),
        nextTitle: getNextTitle(totalXP),
        xpToNext: getXPToNextTitle(totalXP),
        progressPct: getTitleProgress(totalXP),
    };
}

// ─── Compute XP for ALL users (leaderboard) ──────────────────────────────────

export interface LeaderboardEntry {
    id: string;
    display_name: string;
    avatar_url: string | null;
    is_verified?: boolean;
    totalXP: number;
    title: TitleLevel;
    rank: number;
    forumXP: number;
    libraryXP: number;
    plannerXP: number;
}

export async function computeAllUsersXP(): Promise<LeaderboardEntry[]> {
    const { data: profiles, error } = await supabase
        .from("user_profiles")
        .select("id,display_name,avatar_url,is_verified,total_xp,forum_xp,library_xp,planner_xp")
        .order("total_xp", { ascending: false })
        .limit(100);

    if (error) {
        console.error("Leaderboard fetch error:", error);
        return [];
    }

    if (!profiles?.length) return [];

    const entries: LeaderboardEntry[] = profiles.map((user, i) => {
        const xp = user.total_xp || 0;
        return {
            id: user.id,
            display_name: user.display_name || `User ${user.id.slice(0, 4)}`,
            avatar_url: user.avatar_url,
            is_verified: user.is_verified ?? false,
            totalXP: xp,
            title: getTitle(xp),
            rank: i + 1,
            forumXP: user.forum_xp || 0,
            libraryXP: user.library_xp || 0,
            plannerXP: user.planner_xp || 0,
        };
    });

    return entries;
}

