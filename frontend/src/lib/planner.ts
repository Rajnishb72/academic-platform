export interface StoredPlanChapter {
    id: string;
    title: string;
    daysAssigned: number;
    topics: string[];
}

export interface StoredPlanSlot {
    chapterIndex: number;
    title: string;
    startDate: string;
    endDate: string;
    daysAllocated: number;
    overview?: string;
    dailyGoals: string[];
    studyTip: string;
    difficulty: "easy" | "medium" | "hard";
}

export interface StoredPlan {
    id: string;
    name: string;
    createdAt: string;
    targetDate: string;
    dailyHours: number;
    intensity?: "light" | "normal" | "aggressive";
    chapters?: StoredPlanChapter[];
    proofs?: { chapterIndex: number; proofUrl: string; proofId?: string; fileName?: string; uploadedAt?: string; submittedAt?: string }[];
    plan: {
        feasible: boolean;
        warning: string | null;
        totalDaysAvailable: number;
        schedule: StoredPlanSlot[];
        overallStrategy: string;
        motivationalNote: string;
    };
}

export interface MilestoneDefinition {
    id: string;
    category: "progress" | "streak" | "goals" | "mastery";
    title: string;
    description: string;
    xp: number;
    tier: "bronze" | "silver" | "gold" | "platinum" | "diamond" | "heroic" | "legendary";
    icon: string;
}

export interface MilestoneState {
    id: string;
    achieved: boolean;
    achievedAt?: string;
}

export const ALL_MILESTONES: MilestoneDefinition[] = [
    // --- The Completionist Path (Progress) -----------------------------------
    { id: "prog_bronze", category: "progress", tier: "bronze", xp: 20, title: "Initiate", description: "Submit ≥10% of chapters. Min 3 submissions total.", icon: "BookOpen" },
    { id: "prog_silver", category: "progress", tier: "silver", xp: 50, title: "Diligent Learner", description: "Submit ≥25% of chapters. Min 6 submissions total.", icon: "BookOpen" },
    { id: "prog_gold", category: "progress", tier: "gold", xp: 100, title: "Steadfast", description: "Submit ≥50% of chapters. Min 10 submissions total.", icon: "Target" },
    { id: "prog_platinum", category: "progress", tier: "platinum", xp: 180, title: "The Finisher", description: "Submit ≥75% of chapters. Min 16 submissions total.", icon: "Target" },
    { id: "prog_diamond", category: "progress", tier: "diamond", xp: 300, title: "Full Scholar", description: "Submit 100% of all plans. Min 20 total chapters planned.", icon: "Trophy" },
    { id: "prog_heroic", category: "progress", tier: "heroic", xp: 500, title: "Academic Titan", description: "Complete 3 separate plans, each with ≥6 chapters.", icon: "Trophy" },
    { id: "prog_legendary", category: "progress", tier: "legendary", xp: 1000, title: "Completionist Grandmaster", description: "Complete 5 separate plans, each with ≥8 chapters (≥40 total).", icon: "Trophy" },

    // --- The Consistency Path (Streak) ---------------------------------------
    { id: "streak_bronze", category: "streak", tier: "bronze", xp: 15, title: "Habit Builder", description: "Submit proofs on 3 consecutive study days.", icon: "Flame" },
    { id: "streak_silver", category: "streak", tier: "silver", xp: 50, title: "Week Warrior", description: "Maintain a 7-day proof submission streak.", icon: "Flame" },
    { id: "streak_gold", category: "streak", tier: "gold", xp: 100, title: "Relentless", description: "Maintain a 14-day proof submission streak.", icon: "Zap" },
    { id: "streak_platinum", category: "streak", tier: "platinum", xp: 200, title: "Iron Discipline", description: "Maintain a 30-day proof submission streak.", icon: "Zap" },
    { id: "streak_diamond", category: "streak", tier: "diamond", xp: 400, title: "Unbreakable", description: "Maintain a 60-day proof submission streak.", icon: "Zap" },
    { id: "streak_heroic", category: "streak", tier: "heroic", xp: 700, title: "The Machine", description: "Maintain a 90-day proof submission streak.", icon: "Zap" },
    { id: "streak_legendary", category: "streak", tier: "legendary", xp: 1200, title: "Eternal Grind", description: "Maintain a 180-day proof submission streak.", icon: "Zap" },

    // --- The Execution Path (Goals / Submissions) ----------------------------
    { id: "goal_bronze", category: "goals", tier: "bronze", xp: 10, title: "First Step", description: "Submit your very first chapter proof.", icon: "CheckCheck" },
    { id: "goal_silver", category: "goals", tier: "silver", xp: 30, title: "Rising Star", description: "Submit proofs for 5 chapters across any plans.", icon: "CheckCheck" },
    { id: "goal_gold", category: "goals", tier: "gold", xp: 70, title: "Chapter Master", description: "Submit proofs for 10 chapters across all plans.", icon: "ListChecks" },
    { id: "goal_platinum", category: "goals", tier: "platinum", xp: 150, title: "Syllabus Conqueror", description: "Submit proofs for 25 chapters across all plans.", icon: "ListChecks" },
    { id: "goal_diamond", category: "goals", tier: "diamond", xp: 300, title: "Brainiac", description: "Submit proofs for 50 chapters across all plans.", icon: "Brain" },
    { id: "goal_heroic", category: "goals", tier: "heroic", xp: 600, title: "Intellectual Elite", description: "Submit proofs for 75 chapters across all plans.", icon: "Brain" },
    { id: "goal_legendary", category: "goals", tier: "legendary", xp: 1000, title: "Proof Centurion", description: "Submit proofs for 100 chapters across all plans.", icon: "Trophy" },

    // --- The Speedster Path (Mastery / Deadline Discipline) ------------------
    { id: "ontime_silver", category: "mastery", tier: "silver", xp: 40, title: "Deadline Keeper", description: "Submit 5 chapters before their scheduled deadline.", icon: "CalendarDays" },
    { id: "ontime_gold", category: "mastery", tier: "gold", xp: 80, title: "Time Master", description: "Submit 10 chapters before their scheduled deadline.", icon: "CalendarDays" },
    { id: "ontime_platinum", category: "mastery", tier: "platinum", xp: 200, title: "Flawless Execution", description: "Submit all chapters in any one plan before deadline.", icon: "CalendarDays" },
    { id: "ontime_diamond", category: "mastery", tier: "diamond", xp: 350, title: "Clockwork Scholar", description: "Submit 25 chapters on time across all plans.", icon: "CalendarDays" },
    { id: "ontime_heroic", category: "mastery", tier: "heroic", xp: 600, title: "Deadline Assassin", description: "Complete 3 separate plans entirely on time (each ≥5 chapters).", icon: "BarChart2" },
    { id: "ontime_legendary", category: "mastery", tier: "legendary", xp: 1000, title: "Temporal Grandmaster", description: "Complete 5 plans entirely on time, each with ≥8 chapters.", icon: "BarChart2" },
    { id: "weekly_silver", category: "mastery", tier: "silver", xp: 40, title: "Speed Demon", description: "Complete 70%+ of scheduled chapters in any single week.", icon: "BarChart2" },
];

// ─── Planner Rank System (Game-like XP-based ranks) ──────────────────────────

export interface PlannerRank {
    threshold: number;
    name: string;
    icon: string;
    color: string;        // text color class
    bgColor: string;      // background gradient
    borderColor: string;  // border class
    glow: string;         // shadow glow class
}

export const PLANNER_RANKS: PlannerRank[] = [
    { threshold: 0, name: "Unranked", icon: "Circle", color: "text-slate-400", bgColor: "from-slate-800/80 to-slate-900/80", borderColor: "border-slate-700/50", glow: "" },
    { threshold: 100, name: "Bronze Initiate", icon: "Shield", color: "text-amber-500", bgColor: "from-amber-900/20 to-orange-900/10", borderColor: "border-amber-700/40", glow: "" },
    { threshold: 300, name: "Silver Strategist", icon: "Swords", color: "text-slate-300", bgColor: "from-slate-700/30 to-slate-800/30", borderColor: "border-slate-500/40", glow: "" },
    { threshold: 700, name: "Gold Tactician", icon: "Medal", color: "text-yellow-400", bgColor: "from-yellow-900/20 to-amber-900/10", borderColor: "border-yellow-600/40", glow: "shadow-yellow-500/5" },
    { threshold: 1200, name: "Platinum Planner", icon: "Target", color: "text-indigo-400", bgColor: "from-indigo-900/20 to-violet-900/10", borderColor: "border-indigo-500/40", glow: "shadow-indigo-500/5" },
    { threshold: 2000, name: "Diamond Scholar", icon: "Gem", color: "text-cyan-400", bgColor: "from-cyan-900/20 to-sky-900/10", borderColor: "border-cyan-500/40", glow: "shadow-cyan-500/5" },
    { threshold: 3000, name: "Master Architect", icon: "Crown", color: "text-violet-400", bgColor: "from-violet-900/20 to-purple-900/10", borderColor: "border-violet-500/40", glow: "shadow-violet-500/5" },
    { threshold: 4500, name: "Grandmaster", icon: "Trophy", color: "text-rose-400", bgColor: "from-rose-900/20 to-pink-900/10", borderColor: "border-rose-500/40", glow: "shadow-rose-500/5" },
    { threshold: 6500, name: "Champion", icon: "Flame", color: "text-orange-400", bgColor: "from-orange-900/20 to-red-900/10", borderColor: "border-orange-500/40", glow: "shadow-orange-500/10" },
    { threshold: 9000, name: "Legendary Sage", icon: "Sparkles", color: "text-amber-300", bgColor: "from-amber-800/20 to-rose-900/10", borderColor: "border-amber-500/50", glow: "shadow-amber-500/15" },
];

export function getPlannerRank(xp: number): PlannerRank {
    let rank = PLANNER_RANKS[0];
    for (const r of PLANNER_RANKS) {
        if (xp >= r.threshold) rank = r;
        else break;
    }
    return rank;
}

export function getNextPlannerRank(xp: number): PlannerRank | null {
    for (const r of PLANNER_RANKS) {
        if (r.threshold > xp) return r;
    }
    return null;
}

export function computeMilestoneStates(plans: StoredPlan[]): MilestoneState[] {
    const totalChapters = plans.reduce((s, p) => s + p.plan.schedule.length, 0);
    const submittedProofs = plans.reduce((s, p) => s + (p.proofs?.length ?? 0), 0);
    const completionPct = totalChapters > 0 ? (submittedProofs / totalChapters) * 100 : 0;

    // All submission dates
    const allSubmissions: string[] = plans.flatMap(p =>
        (p.proofs ?? [])
            .map(proof => (proof.uploadedAt ?? proof.submittedAt ?? "").slice(0, 10))
            .filter(Boolean)
    ).sort();

    // Streak calculation
    function longestStreak(dates: string[]): number {
        const unique = [...new Set(dates)].sort();
        let max = 0, cur = 0, prev = "";
        for (const d of unique) {
            if (prev) {
                const diff = (new Date(d).getTime() - new Date(prev).getTime()) / 86400000;
                cur = diff === 1 ? cur + 1 : 1;
            } else { cur = 1; }
            max = Math.max(max, cur);
            prev = d;
        }
        return max;
    }
    const maxStreak = longestStreak(allSubmissions);

    // On-time goals: submitted before endDate
    let ontimeGoals = 0;
    let allOnTime = false;
    plans.forEach(p => {
        let planOnTime = 0;
        const submittedIdxs = new Map((p.proofs ?? []).map(pr => [pr.chapterIndex, pr.uploadedAt ?? pr.submittedAt ?? ""]));
        p.plan.schedule.forEach(slot => {
            const subDate = submittedIdxs.get(slot.chapterIndex);
            if (subDate && subDate.slice(0, 10) <= slot.endDate) planOnTime++;
        });
        ontimeGoals += planOnTime;
        if (planOnTime === p.plan.schedule.length && p.plan.schedule.length > 0) allOnTime = true;
    });

    // Weekly completion rate (this week)
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
    const weekStartStr = weekStart.toISOString().slice(0, 10);
    const thisWeekSubmissions = allSubmissions.filter(d => d >= weekStartStr).length;
    const thisWeekDue = plans.reduce((s, p) => {
        return s + p.plan.schedule.filter(slot => slot.endDate >= weekStartStr).length;
    }, 0);
    const weeklyRate = thisWeekDue > 0 ? (thisWeekSubmissions / thisWeekDue) * 100 : 0;

    // Multi-plan completion counts for Heroic / Legendary gates
    const plansComplete3x6 = plans.filter(
        p => p.plan.schedule.length >= 6 && (p.proofs?.length ?? 0) >= p.plan.schedule.length
    ).length;
    const plansComplete5x8 = plans.filter(
        p => p.plan.schedule.length >= 8 && (p.proofs?.length ?? 0) >= p.plan.schedule.length
    ).length;
    const totalChaptersAcrossAllPlans = plans.reduce((s, p) => s + p.plan.schedule.length, 0);

    // Per-plan on-time completion (for heroic/legendary mastery)
    const plansAllOntimeMin5 = plans.filter(p => {
        if (p.plan.schedule.length < 5) return false;
        const m = new Map((p.proofs ?? []).map(pr => [pr.chapterIndex, pr.uploadedAt ?? pr.submittedAt ?? ""]));
        return p.plan.schedule.every(s => { const d = m.get(s.chapterIndex); return d && d.slice(0, 10) <= s.endDate; });
    }).length;
    const plansAllOntimeMin8 = plans.filter(p => {
        if (p.plan.schedule.length < 8) return false;
        const m = new Map((p.proofs ?? []).map(pr => [pr.chapterIndex, pr.uploadedAt ?? pr.submittedAt ?? ""]));
        return p.plan.schedule.every(s => { const d = m.get(s.chapterIndex); return d && d.slice(0, 10) <= s.endDate; });
    }).length;

    const checks: Record<string, boolean> = {
        prog_bronze: completionPct >= 10 && submittedProofs >= 3,
        prog_silver: completionPct >= 25 && submittedProofs >= 6,
        prog_gold: completionPct >= 50 && submittedProofs >= 10,
        prog_platinum: completionPct >= 75 && submittedProofs >= 16,
        prog_diamond: completionPct >= 100 && totalChaptersAcrossAllPlans >= 20,
        prog_heroic: plansComplete3x6 >= 3,
        prog_legendary: plansComplete5x8 >= 5 && submittedProofs >= 40,
        streak_bronze: maxStreak >= 3,
        streak_silver: maxStreak >= 7,
        streak_gold: maxStreak >= 14,
        streak_platinum: maxStreak >= 30,
        streak_diamond: maxStreak >= 60,
        streak_heroic: maxStreak >= 90,
        streak_legendary: maxStreak >= 180,
        goal_bronze: submittedProofs >= 1,
        goal_silver: submittedProofs >= 5,
        goal_gold: submittedProofs >= 10,
        goal_platinum: submittedProofs >= 25,
        goal_diamond: submittedProofs >= 50,
        goal_heroic: submittedProofs >= 75,
        goal_legendary: submittedProofs >= 100,
        ontime_silver: ontimeGoals >= 5,
        ontime_gold: ontimeGoals >= 10,
        ontime_platinum: allOnTime,
        ontime_diamond: ontimeGoals >= 25,
        ontime_heroic: plansAllOntimeMin5 >= 3,
        ontime_legendary: plansAllOntimeMin8 >= 5,
        weekly_silver: weeklyRate >= 70,
    };

    let existing: MilestoneState[] = [];
    try {
        const raw = localStorage.getItem("academix_milestones_v2");
        if (raw) existing = JSON.parse(raw);
    } catch { /* ignore */ }

    const now = new Date().toISOString();
    // We'll update state, ideally this should be saved to DB too in future.
    const states = ALL_MILESTONES.map(m => {
        const prev = existing.find(e => e.id === m.id);
        const isNowAchieved = checks[m.id] ?? false;
        if (isNowAchieved) {
            return { id: m.id, achieved: true, achievedAt: prev?.achievedAt ?? now };
        }
        return { id: m.id, achieved: false };
    });

    // Automatically sync to local storage just to persist the achievedAt timestamp.
    try {
        localStorage.setItem("academix_milestones_v2", JSON.stringify(states));
    } catch { }

    return states;
}
