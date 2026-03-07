// lib/library-ranks.ts
import { Shield, Swords, Medal, Gem, Crown, Circle, BookOpen, Star, Sparkles, TrendingUp, Compass, Bookmark, Flame, Zap } from "lucide-react";

export interface LibraryRank {
    name: string;
    minXp: number;
    icon: any;        // Lucide component
    color: string;    // text color class
    bgHover: string;  // hover background class
    borderX: string;  // border color class
    glow: string;     // glow drop-shadow / shadow class
}

// Total possible XP from Library milestones is typically high, 
// so we'll set a reasonable curve up to ~12k XP for the max rank.
export const LIBRARY_RANKS: LibraryRank[] = [
    {
        name: "Newcomer",
        minXp: 0,
        icon: Compass,
        color: "text-zinc-400",
        bgHover: "hover:bg-zinc-500/10",
        borderX: "border-zinc-500/30",
        glow: "shadow-[0_0_15px_rgba(113,113,122,0.15)]",
    },
    {
        name: "Bronze Scribe",
        minXp: 100,
        icon: BookOpen,
        color: "text-amber-700",
        bgHover: "hover:bg-amber-700/10",
        borderX: "border-amber-700/30",
        glow: "shadow-[0_0_15px_rgba(180,83,9,0.2)]",
    },
    {
        name: "Silver Quill",
        minXp: 400,
        icon: Bookmark,
        color: "text-slate-300",
        bgHover: "hover:bg-slate-400/10",
        borderX: "border-slate-400/30",
        glow: "shadow-[0_0_15px_rgba(148,163,184,0.2)]",
    },
    {
        name: "Gold Sage",
        minXp: 1000,
        icon: Shield,
        color: "text-yellow-400",
        bgHover: "hover:bg-yellow-400/10",
        borderX: "border-yellow-400/30",
        glow: "shadow-[0_0_15px_rgba(250,204,21,0.2)]",
    },
    {
        name: "Platinum Scholar",
        minXp: 2000,
        icon: Medal,
        color: "text-cyan-300",
        bgHover: "hover:bg-cyan-300/10",
        borderX: "border-cyan-300/30",
        glow: "shadow-[0_0_15px_rgba(103,232,249,0.2)]",
    },
    {
        name: "Diamond Mentor",
        minXp: 3500,
        icon: Gem,
        color: "text-blue-400",
        bgHover: "hover:bg-blue-400/10",
        borderX: "border-blue-400/30",
        glow: "shadow-[0_0_18px_rgba(96,165,250,0.25)]",
    },
    {
        name: "Emerald Virtuoso",
        minXp: 5000,
        icon: Flame,
        color: "text-emerald-400",
        bgHover: "hover:bg-emerald-400/10",
        borderX: "border-emerald-400/30",
        glow: "shadow-[0_0_18px_rgba(52,211,153,0.25)]",
    },
    {
        name: "Ruby Luminary",
        minXp: 7000,
        icon: Star,
        color: "text-rose-400",
        bgHover: "hover:bg-rose-400/10",
        borderX: "border-rose-400/30",
        glow: "shadow-[0_0_18px_rgba(251,113,133,0.25)]",
    },
    {
        name: "Sapphire Legend",
        minXp: 9500,
        icon: Crown,
        color: "text-indigo-400",
        bgHover: "hover:bg-indigo-400/10",
        borderX: "border-indigo-400/30",
        glow: "shadow-[0_0_20px_rgba(129,140,248,0.3)]",
    },
    {
        name: "Celestial Grandmaster",
        minXp: 12000,
        icon: Sparkles,
        color: "text-yellow-300",
        bgHover: "hover:bg-yellow-300/10",
        borderX: "border-yellow-300/30",
        glow: "shadow-[0_0_24px_rgba(253,224,71,0.35)]",
    },
];

export function getLibraryRank(xp: number): LibraryRank {
    let highest = LIBRARY_RANKS[0];
    for (const rank of LIBRARY_RANKS) {
        if (xp >= rank.minXp) {
            highest = rank;
        } else {
            break;
        }
    }
    return highest;
}

export function getNextLibraryRank(xp: number): LibraryRank | null {
    for (const rank of LIBRARY_RANKS) {
        if (rank.minXp > xp) return rank;
    }
    return null; // Reached max rank
}
