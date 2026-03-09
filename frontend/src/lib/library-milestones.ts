// lib/library-milestones.ts
// Shared milestone definitions used by milestones page and profile page.

import {
    BookOpen, Bookmark, Download, Eye, Flame, Heart, Sparkles, Star,
    Target, Upload, Zap, Crown, Award, Globe, Medal, CheckCircle,
    Layers, Workflow, Infinity, Calendar, Activity, Gem
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MilestoneTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export interface MilestoneDef {
    id: string;
    label: string;
    description: string;
    xp: number;
    tier: MilestoneTier;
    category: string;
    icon: any;
    check: (stats: UserStats) => boolean;
}

export interface UserStats {
    uploadCount: number;
    totalDownloads: number;
    totalViews: number;
    totalBookmarks: number;
    totalRatings: number;
    topNoteDownloads: number;
    topNoteViews: number;
    notesAbove50Downloads: number;
    notesAbove100Views: number;
    subjectsUploaded: Set<string>;
    consecutiveWeeks: number;
    avgRatingAbove4Count: number;
}

// ─── Tier Styles ──────────────────────────────────────────────────────────────

export const TIER_STYLE: Record<MilestoneTier, { badge: string; label: string; glow: string }> = {
    bronze: { badge: "border-amber-900/50 bg-amber-500/10 text-amber-500", label: "Bronze", glow: "shadow-amber-500/20" },
    silver: { badge: "border-slate-500/50 bg-slate-400/10 text-slate-300", label: "Silver", glow: "shadow-slate-400/20" },
    gold: { badge: "border-yellow-500/50 bg-yellow-500/10 text-yellow-400", label: "Gold", glow: "shadow-yellow-500/20" },
    platinum: { badge: "border-cyan-400/50 bg-cyan-400/10 text-cyan-300", label: "Platinum", glow: "shadow-cyan-400/20" },
    diamond: { badge: "border-indigo-400/50 bg-indigo-400/10 text-indigo-300", label: "Diamond", glow: "shadow-indigo-400/20" },
};

// ─── XP Sources ───────────────────────────────────────────────────────────────

export const XP_SOURCES = [
    { icon: Upload, label: "Upload a note", xp: "+10 XP", color: "text-blue-400", bg: "bg-blue-500/10" },
    { icon: Eye, label: "Your note gets 2 views", xp: "+1 XP", color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { icon: Download, label: "Your note gets 1 download", xp: "+1 XP", color: "text-violet-400", bg: "bg-violet-500/10" },
    { icon: Bookmark, label: "Your note gets 1 bookmark", xp: "+3 XP", color: "text-rose-400", bg: "bg-rose-500/10" },
    { icon: Star, label: "Your note gets a 4+ star rating", xp: "+20 XP", color: "text-amber-400", bg: "bg-amber-500/10" },
];

// ─── Milestone Definitions ────────────────────────────────────────────────────

export const ALL_LIB_MILESTONES: MilestoneDef[] = [
    // ── Upload Milestones ──
    { id: "up1", label: "First Contribution", description: "Upload your first note", xp: 25, tier: "bronze", category: "Upload", icon: Upload, check: (s) => s.uploadCount >= 1 },
    { id: "up2", label: "Rising Author", description: "Upload 5 notes", xp: 50, tier: "bronze", category: "Upload", icon: Upload, check: (s) => s.uploadCount >= 5 },
    { id: "up3", label: "Prolific Writer", description: "Upload 10 notes", xp: 120, tier: "silver", category: "Upload", icon: BookOpen, check: (s) => s.uploadCount >= 10 },
    { id: "up4", label: "Knowledge Architect", description: "Upload 25 notes", xp: 300, tier: "gold", category: "Upload", icon: Crown, check: (s) => s.uploadCount >= 25 },
    { id: "up5", label: "Content Titan", description: "Upload 50 notes", xp: 600, tier: "platinum", category: "Upload", icon: Flame, check: (s) => s.uploadCount >= 50 },
    { id: "up6", label: "Legendary Publisher", description: "Upload 100 notes", xp: 1200, tier: "diamond", category: "Upload", icon: Sparkles, check: (s) => s.uploadCount >= 100 },

    // ── Global View Milestones ──
    { id: "v1", label: "Getting Noticed", description: "Reach 50 total views", xp: 20, tier: "bronze", category: "Views", icon: Eye, check: (s) => s.totalViews >= 50 },
    { id: "v2", label: "Gaining Traction", description: "Reach 500 total views", xp: 50, tier: "silver", category: "Views", icon: Eye, check: (s) => s.totalViews >= 500 },
    { id: "v3", label: "Crowd Favorite", description: "Reach 2,500 total views", xp: 150, tier: "gold", category: "Views", icon: Eye, check: (s) => s.totalViews >= 2500 },
    { id: "v4", label: "Viral Knowledge", description: "Reach 10,000 total views", xp: 400, tier: "platinum", category: "Views", icon: Flame, check: (s) => s.totalViews >= 10000 },
    { id: "v5", label: "Global Reach", description: "Reach 50,000 total views", xp: 1000, tier: "diamond", category: "Views", icon: Globe, check: (s) => s.totalViews >= 50000 },
    { id: "v6", label: "Omnipresent", description: "Reach 250,000 total views", xp: 2500, tier: "diamond", category: "Views", icon: Sparkles, check: (s) => s.totalViews >= 250000 },

    // ── Global Download Milestones ──
    { id: "d1", label: "Helpful Hand", description: "Reach 25 total downloads", xp: 30, tier: "bronze", category: "Downloads", icon: Download, check: (s) => s.totalDownloads >= 25 },
    { id: "d2", label: "Trusted Resource", description: "Reach 100 total downloads", xp: 80, tier: "silver", category: "Downloads", icon: Download, check: (s) => s.totalDownloads >= 100 },
    { id: "d3", label: "Study Saver", description: "Reach 500 total downloads", xp: 200, tier: "gold", category: "Downloads", icon: Heart, check: (s) => s.totalDownloads >= 500 },
    { id: "d4", label: "Essential Reading", description: "Reach 2,500 total downloads", xp: 600, tier: "platinum", category: "Downloads", icon: Target, check: (s) => s.totalDownloads >= 2500 },
    { id: "d5", label: "Life Saver", description: "Reach 10,000 total downloads", xp: 1500, tier: "diamond", category: "Downloads", icon: Zap, check: (s) => s.totalDownloads >= 10000 },
    { id: "d6", label: "Foundation of Learning", description: "Reach 50,000 total downloads", xp: 3000, tier: "diamond", category: "Downloads", icon: Gem, check: (s) => s.totalDownloads >= 50000 },

    // ── Individual Note Excellence (Big Spikes) ──
    { id: "in1", label: "Hit Note", description: "A single note hits 100 downloads", xp: 100, tier: "silver", category: "Excellence", icon: Target, check: (s) => s.topNoteDownloads >= 100 },
    { id: "in2", label: "Blockbuster Note", description: "A single note hits 500 downloads", xp: 300, tier: "gold", category: "Excellence", icon: Flame, check: (s) => s.topNoteDownloads >= 500 },
    { id: "in3", label: "Legendary Note", description: "A single note hits 2,500 downloads", xp: 1000, tier: "diamond", category: "Excellence", icon: Crown, check: (s) => s.topNoteDownloads >= 2500 },

    // ── Ratings Milestones ──
    { id: "r1", label: "Peer Reviewed", description: "Receive 5 total ratings", xp: 30, tier: "bronze", category: "Ratings", icon: Star, check: (s) => s.totalRatings >= 5 },
    { id: "r2", label: "Highly Rated", description: "Receive 25 total ratings", xp: 100, tier: "silver", category: "Ratings", icon: Star, check: (s) => s.totalRatings >= 25 },
    { id: "r3", label: "Critically Acclaimed", description: "Receive 100 total ratings", xp: 300, tier: "gold", category: "Ratings", icon: Star, check: (s) => s.totalRatings >= 100 },
    { id: "r4", label: "Top Rated Author", description: "Receive 500 total ratings", xp: 800, tier: "platinum", category: "Ratings", icon: Award, check: (s) => s.totalRatings >= 500 },
    { id: "r5", label: "Hall of Fame", description: "Receive 2,000 total ratings", xp: 2000, tier: "diamond", category: "Ratings", icon: Medal, check: (s) => s.totalRatings >= 2000 },

    // ── Quality Consistency ──
    { id: "qc1", label: "Solid Quality", description: "Have 3 notes with a 4+ rating", xp: 80, tier: "silver", category: "Quality", icon: Award, check: (s) => s.avgRatingAbove4Count >= 3 },
    { id: "qc2", label: "Consistent Quality", description: "Have 10 notes with a 4+ rating", xp: 250, tier: "gold", category: "Quality", icon: Medal, check: (s) => s.avgRatingAbove4Count >= 10 },
    { id: "qc3", label: "Master Craftsman", description: "Have 25 notes with a 4+ rating", xp: 600, tier: "platinum", category: "Quality", icon: Gem, check: (s) => s.avgRatingAbove4Count >= 25 },
    { id: "qc4", label: "Flawless Record", description: "Have 50 notes with a 4+ rating", xp: 1500, tier: "diamond", category: "Quality", icon: CheckCircle, check: (s) => s.avgRatingAbove4Count >= 50 },

    // ── Bookmarks (Usefulness) ──
    { id: "b1", label: "Worth Keeping", description: "Notes bookmarked 10 times", xp: 40, tier: "bronze", category: "Utility", icon: Bookmark, check: (s) => s.totalBookmarks >= 10 },
    { id: "b2", label: "Reference Material", description: "Notes bookmarked 50 times", xp: 150, tier: "silver", category: "Utility", icon: Bookmark, check: (s) => s.totalBookmarks >= 50 },
    { id: "b3", label: "Must-Have", description: "Notes bookmarked 200 times", xp: 400, tier: "gold", category: "Utility", icon: Bookmark, check: (s) => s.totalBookmarks >= 200 },
    { id: "b4", label: "Indispensable", description: "Notes bookmarked 1,000 times", xp: 1000, tier: "platinum", category: "Utility", icon: Bookmark, check: (s) => s.totalBookmarks >= 1000 },

    // ── Versatility (Subjects) ──
    { id: "s1", label: "Dual Threat", description: "Upload notes in 2 different subjects", xp: 25, tier: "bronze", category: "Versatility", icon: Layers, check: (s) => s.subjectsUploaded.size >= 2 },
    { id: "s2", label: "Polymath", description: "Upload notes in 5 different subjects", xp: 80, tier: "silver", category: "Versatility", icon: Workflow, check: (s) => s.subjectsUploaded.size >= 5 },
    { id: "s3", label: "Renaissance Student", description: "Upload notes in 10 different subjects", xp: 250, tier: "gold", category: "Versatility", icon: Infinity, check: (s) => s.subjectsUploaded.size >= 10 },

    // ── Consistency (Weekly) ──
    { id: "w1", label: "Making a Habit", description: "Upload notes in 2 consecutive weeks", xp: 30, tier: "bronze", category: "Consistency", icon: Calendar, check: (s) => s.consecutiveWeeks >= 2 },
    { id: "w2", label: "On a Roll", description: "Upload notes in 4 consecutive weeks", xp: 80, tier: "silver", category: "Consistency", icon: Activity, check: (s) => s.consecutiveWeeks >= 4 },
    { id: "w3", label: "Unstoppable", description: "Upload notes in 8 consecutive weeks", xp: 200, tier: "gold", category: "Consistency", icon: Zap, check: (s) => s.consecutiveWeeks >= 8 },
    { id: "w4", label: "Machine", description: "Upload notes in 16 consecutive weeks", xp: 500, tier: "platinum", category: "Consistency", icon: CheckCircle, check: (s) => s.consecutiveWeeks >= 16 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function computeLibraryStats(myNotes: { downloads_count?: number | null; avg_rating?: number | null; views_count?: number | null; subject?: string; created_at?: string | null }[], totalViews: number, totalBookmarks: number): UserStats {
    const totalDownloads = myNotes.reduce((sum, n) => sum + (n.downloads_count ?? 0), 0);
    const avgRatingAbove4Count = myNotes.filter((n) => (n.avg_rating ?? 0) >= 4).length;
    const totalRatings = avgRatingAbove4Count;
    const topNoteDownloads = Math.max(0, ...myNotes.map((n) => n.downloads_count ?? 0));
    const topNoteViews = Math.max(0, ...myNotes.map((n) => n.views_count ?? 0));
    const notesAbove50Downloads = myNotes.filter((n) => (n.downloads_count ?? 0) >= 50).length;
    const notesAbove100Views = myNotes.filter((n) => (n.views_count ?? 0) >= 100).length;
    const subjectsUploaded = new Set(myNotes.map((n) => n.subject ?? ""));

    const weeks = new Set(
        myNotes
            .filter((n) => n.created_at)
            .map((n) => {
                const d = new Date(n.created_at!);
                const start = new Date(2020, 0, 1);
                return Math.floor((d.getTime() - start.getTime()) / (7 * 86400000));
            }),
    );
    const sortedWeeks = Array.from(weeks).sort((a, b) => a - b);
    let maxConsec = 0, cur = 1;
    for (let i = 1; i < sortedWeeks.length; i++) {
        if (sortedWeeks[i] - sortedWeeks[i - 1] === 1) { cur++; maxConsec = Math.max(maxConsec, cur); }
        else cur = 1;
    }
    const consecutiveWeeks = Math.max(maxConsec, sortedWeeks.length === 1 ? 1 : 0);

    return {
        uploadCount: myNotes.length,
        totalDownloads,
        totalViews,
        totalBookmarks,
        totalRatings,
        topNoteDownloads,
        topNoteViews,
        notesAbove50Downloads,
        notesAbove100Views,
        subjectsUploaded,
        consecutiveWeeks,
        avgRatingAbove4Count,
    };
}

export function calcLibXP(stats: UserStats): number {
    let xp = stats.uploadCount * 10;                        // +10 per upload
    xp += Math.floor(stats.totalViews / 2);                 // +1 per 2 views
    xp += stats.totalDownloads;                             // +1 per download
    xp += stats.totalBookmarks * 3;                         // +3 per bookmark
    xp += stats.avgRatingAbove4Count * 20;                  // +20 per 4+ star rated note
    ALL_LIB_MILESTONES.forEach((m) => { if (m.check(stats)) xp += m.xp; });
    return xp;
}
