// lib/library-milestones.ts
// Shared milestone definitions used by milestones page and profile page.

import {
    Upload,
    Download,
    Star,
    BookOpen,
    Award,
    TrendingUp,
    Zap,
    Crown,
    Bookmark,
    Eye,
    Heart,
    Target,
    Flame,
    Sparkles,
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
    { id: "up1", label: "First Contribution", description: "Upload your first note", xp: 10, tier: "bronze", category: "Upload", icon: Upload, check: (s) => s.uploadCount >= 1 },
    { id: "up2", label: "Rising Author", description: "Upload 5 notes", xp: 25, tier: "bronze", category: "Upload", icon: Upload, check: (s) => s.uploadCount >= 5 },
    { id: "up3", label: "Prolific Writer", description: "Upload 10 notes", xp: 60, tier: "silver", category: "Upload", icon: BookOpen, check: (s) => s.uploadCount >= 10 },
    { id: "up4", label: "Knowledge Architect", description: "Upload 25 notes", xp: 150, tier: "gold", category: "Upload", icon: Crown, check: (s) => s.uploadCount >= 25 },
    { id: "up5", label: "Content Titan", description: "Upload 50 notes", xp: 300, tier: "platinum", category: "Upload", icon: Flame, check: (s) => s.uploadCount >= 50 },
    { id: "up6", label: "Legendary Publisher", description: "Upload 100 notes", xp: 500, tier: "diamond", category: "Upload", icon: Sparkles, check: (s) => s.uploadCount >= 100 },

    // ── Engagement: Views ──
    { id: "ev1", label: "Getting Noticed", description: "Your notes reach 100 total views", xp: 30, tier: "bronze", category: "Engagement", icon: Eye, check: (s) => s.totalViews >= 100 },
    { id: "ev2", label: "Crowd Favorite", description: "Your notes reach 500 total views", xp: 70, tier: "silver", category: "Engagement", icon: Eye, check: (s) => s.totalViews >= 500 },
    { id: "ev3", label: "Viral Knowledge", description: "Your notes reach 1,000 total views", xp: 120, tier: "gold", category: "Engagement", icon: TrendingUp, check: (s) => s.totalViews >= 1000 },
    { id: "ev4", label: "View Magnet", description: "A single note reaches 200+ views", xp: 80, tier: "silver", category: "Engagement", icon: Zap, check: (s) => s.topNoteViews >= 200 },
    { id: "ev5", label: "Legendary Reach", description: "Your notes reach 5,000 total views", xp: 250, tier: "platinum", category: "Engagement", icon: Sparkles, check: (s) => s.totalViews >= 5000 },

    // ── Engagement: Downloads ──
    { id: "ed1", label: "First Downloads", description: "Your notes get 10 total downloads", xp: 20, tier: "bronze", category: "Downloads", icon: Download, check: (s) => s.totalDownloads >= 10 },
    { id: "ed2", label: "Popular Notes", description: "Your notes get 50 total downloads", xp: 40, tier: "bronze", category: "Downloads", icon: Download, check: (s) => s.totalDownloads >= 50 },
    { id: "ed3", label: "Download Star", description: "Your notes get 200 total downloads", xp: 100, tier: "silver", category: "Downloads", icon: TrendingUp, check: (s) => s.totalDownloads >= 200 },
    { id: "ed4", label: "Download Legend", description: "500 total downloads on your notes", xp: 200, tier: "gold", category: "Downloads", icon: Zap, check: (s) => s.totalDownloads >= 500 },
    { id: "ed5", label: "Hundred Club", description: "A single note reaches 100 downloads", xp: 80, tier: "silver", category: "Downloads", icon: Award, check: (s) => s.topNoteDownloads >= 100 },
    { id: "ed6", label: "Download Titan", description: "1,000 total downloads on your notes", xp: 350, tier: "platinum", category: "Downloads", icon: Flame, check: (s) => s.totalDownloads >= 1000 },

    // ── Quality: Ratings ──
    { id: "q1", label: "First Star", description: "Receive your first 4+ star rating", xp: 30, tier: "bronze", category: "Quality", icon: Star, check: (s) => s.avgRatingAbove4Count >= 1 },
    { id: "q2", label: "Quality Creator", description: "3 notes with 4+ star ratings", xp: 80, tier: "silver", category: "Quality", icon: Star, check: (s) => s.avgRatingAbove4Count >= 3 },
    { id: "q3", label: "Excellence Badge", description: "5 notes with 4+ star ratings", xp: 150, tier: "gold", category: "Quality", icon: Award, check: (s) => s.avgRatingAbove4Count >= 5 },
    { id: "q4", label: "Diamond Standard", description: "10 notes with 4+ star ratings", xp: 300, tier: "platinum", category: "Quality", icon: Crown, check: (s) => s.avgRatingAbove4Count >= 10 },

    // ── Bookmarks ──
    { id: "b1", label: "Worth Saving", description: "Your notes are bookmarked 5 times", xp: 25, tier: "bronze", category: "Bookmarks", icon: Bookmark, check: (s) => s.totalBookmarks >= 5 },
    { id: "b2", label: "Highly Saved", description: "Your notes are bookmarked 20 times", xp: 80, tier: "silver", category: "Bookmarks", icon: Bookmark, check: (s) => s.totalBookmarks >= 20 },
    { id: "b3", label: "Bookmark King", description: "Your notes are bookmarked 50 times", xp: 150, tier: "gold", category: "Bookmarks", icon: Heart, check: (s) => s.totalBookmarks >= 50 },
    { id: "b4", label: "Fan Favorite", description: "Your notes are bookmarked 100 times", xp: 250, tier: "platinum", category: "Bookmarks", icon: Sparkles, check: (s) => s.totalBookmarks >= 100 },

    // ── Consistency ──
    { id: "c1", label: "Multi-Subject", description: "Upload notes in 3 different subjects", xp: 40, tier: "bronze", category: "Consistency", icon: BookOpen, check: (s) => s.subjectsUploaded.size >= 3 },
    { id: "c2", label: "Domain Expert", description: "Upload notes in 5 different subjects", xp: 90, tier: "silver", category: "Consistency", icon: Target, check: (s) => s.subjectsUploaded.size >= 5 },
    { id: "c3", label: "Renaissance Mind", description: "Upload notes in 8 different subjects", xp: 180, tier: "gold", category: "Consistency", icon: BookOpen, check: (s) => s.subjectsUploaded.size >= 8 },
    { id: "c4", label: "Triple Crown", description: "3 notes with 50+ downloads each", xp: 120, tier: "gold", category: "Consistency", icon: Crown, check: (s) => s.notesAbove50Downloads >= 3 },
    { id: "c5", label: "View Maestro", description: "5 notes with 100+ views each", xp: 150, tier: "gold", category: "Consistency", icon: Eye, check: (s) => s.notesAbove100Views >= 5 },
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
