"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
    BookOpen,
    MessageSquare,
    School,
    CalendarCheck,
    BrainCircuit,
    Trophy,
    Users,
    Heart,
    Mail,
    Shield,
    Sparkles,
    Github,
    ExternalLink,
    Star,
    ChevronRight,
    Zap,
    Target,
    TrendingUp,
    Award,
    Lightbulb,
} from "lucide-react";

// ─── Animated Section ─────────────────────────────────────────────────────────

function Section({
    children,
    delay = 0,
}: {
    children: React.ReactNode;
    delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, type: "spring", damping: 22 }}
        >
            {children}
        </motion.div>
    );
}

// ─── Module Card ──────────────────────────────────────────────────────────────

function ModuleCard({
    icon: Icon,
    title,
    description,
    features,
    color,
    href,
}: {
    icon: React.ElementType;
    title: string;
    description: string;
    features: string[];
    color: string;
    href: string;
}) {
    return (
        <Link href={href}>
            <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                className="group relative overflow-hidden rounded-2xl p-6 transition-all cursor-pointer"
                style={{
                    background: "var(--ax-surface-1)",
                    border: "1px solid var(--ax-border)",
                }}
            >
                <div
                    className="absolute top-0 left-0 h-1 w-full opacity-60 group-hover:opacity-100 transition-opacity"
                    style={{ background: color }}
                />
                <div className="flex items-start gap-4">
                    <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm"
                        style={{
                            background: `${color}15`,
                            border: `1px solid ${color}30`,
                        }}
                    >
                        <Icon className="h-5 w-5" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3
                            className="text-sm font-bold mb-1 group-hover:text-amber-400 transition-colors"
                            style={{ color: "var(--ax-text-primary)" }}
                        >
                            {title}
                        </h3>
                        <p
                            className="text-xs leading-relaxed mb-3"
                            style={{ color: "var(--ax-text-secondary)" }}
                        >
                            {description}
                        </p>
                        <ul className="space-y-1">
                            {features.map((f, i) => (
                                <li
                                    key={i}
                                    className="flex items-center gap-2 text-[11px]"
                                    style={{ color: "var(--ax-text-muted)" }}
                                >
                                    <ChevronRight
                                        className="h-3 w-3 shrink-0"
                                        style={{ color }}
                                    />
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}

// ─── Stat Block ───────────────────────────────────────────────────────────────

function StatBlock({
    icon: Icon,
    label,
    value,
    color,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    color: string;
}) {
    return (
        <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{
                background: "var(--ax-surface-1)",
                border: "1px solid var(--ax-border)",
            }}
        >
            <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ background: `${color}15` }}
            >
                <Icon className="h-4 w-4" style={{ color }} />
            </div>
            <div>
                <p
                    className="text-sm font-bold"
                    style={{ color: "var(--ax-text-primary)" }}
                >
                    {value}
                </p>
                <p className="text-[10px]" style={{ color: "var(--ax-text-faint)" }}>
                    {label}
                </p>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
    const MODULES = [
        {
            icon: MessageSquare,
            title: "Forums",
            description:
                "Community-driven discussions. Post questions, share resources, earn reputation through community engagement.",
            features: [
                "Create posts with categories & tags",
                "Upvote/downvote system with reputation tracking",
                "Earn XP: 10 per post, 3 per comment, 5 per upvote received",
                "Leaderboard with reputation tiers",
            ],
            color: "#818cf8",
            href: "/forums",
        },
        {
            icon: BookOpen,
            title: "Library",
            description:
                "Upload, discover, and organize academic notes. Rate resources and build a collaborative knowledge base.",
            features: [
                "Upload PDFs with subject tagging",
                "Star ratings and download tracking",
                "Earn XP: 15 per upload, 5 per download received, 3 per rating",
                "Milestones and contributor leaderboard",
            ],
            color: "#f59e0b",
            href: "/library",
        },
        {
            icon: School,
            title: "Campus",
            description:
                "Create or join institutional groups. Collaborate with peers, share assignments, and build your academic network.",
            features: [
                "Institution groups with invite codes",
                "Member management & roles",
                "Assignment sharing and collaboration",
                "Group-specific discussions",
            ],
            color: "#10b981",
            href: "/campus",
        },
        {
            icon: CalendarCheck,
            title: "Planner",
            description:
                "Build structured study plans and track progress with proof submissions. Stay disciplined and earn XP.",
            features: [
                "Custom study plans with daily hours",
                "Chapter-by-chapter proof uploads",
                "Earn XP: 20 per plan, 50 per proof submitted",
                "Weekly activity tracking with streaks",
            ],
            color: "#ef4444",
            href: "/planner",
        },
        {
            icon: BrainCircuit,
            title: "AI Lab",
            description:
                "AI-powered tools for academic assistance. Generate summaries, quizzes, and study guides from your materials.",
            features: [
                "AI-powered note summarization",
                "Quiz generation from content",
                "Smart study recommendations",
                "Experimental features",
            ],
            color: "#8b5cf6",
            href: "/ai-lab",
        },
    ];

    return (
        <div className="mx-auto max-w-4xl px-4 py-8 space-y-10">
            {/* Hero */}
            <Section>
                <div
                    className="relative overflow-hidden rounded-3xl p-8 sm:p-10 text-center"
                    style={{
                        background:
                            "linear-gradient(135deg, var(--ax-surface-1) 0%, var(--ax-surface-2) 100%)",
                        border: "1px solid var(--ax-border)",
                    }}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-indigo-500/5" />
                    <div className="relative">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", damping: 15 }}
                            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20"
                        >
                            <Sparkles className="h-8 w-8 text-white" />
                        </motion.div>
                        <h1
                            className="text-3xl sm:text-4xl font-black tracking-tight"
                            style={{ color: "var(--ax-text-primary)" }}
                        >
                            Academix
                        </h1>
                        <p
                            className="mt-2 text-sm sm:text-base max-w-lg mx-auto leading-relaxed"
                            style={{ color: "var(--ax-text-secondary)" }}
                        >
                            The ultimate academic platform for students. Learn, share, and
                            grow together through collaborative learning and structured study
                            tools.
                        </p>

                        <div className="mt-6 flex flex-wrap justify-center gap-3">
                            <StatBlock
                                icon={Target}
                                label="Active Modules"
                                value="5"
                                color="#f59e0b"
                            />
                            <StatBlock
                                icon={Zap}
                                label="XP Sources"
                                value="3"
                                color="#10b981"
                            />
                            <StatBlock
                                icon={TrendingUp}
                                label="Title Levels"
                                value="10"
                                color="#818cf8"
                            />
                        </div>
                    </div>
                </div>
            </Section>

            {/* How XP & Community Engagement Works */}
            <Section delay={0.1}>
                <div
                    className="rounded-2xl p-6 sm:p-8"
                    style={{
                        background: "var(--ax-surface-1)",
                        border: "1px solid var(--ax-border)",
                    }}
                >
                    <div className="flex items-center gap-3 mb-5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
                            <Trophy className="h-5 w-5 text-amber-400" />
                        </div>
                        <div>
                            <h2
                                className="text-lg font-bold"
                                style={{ color: "var(--ax-text-primary)" }}
                            >
                                Community Engagement & XP System
                            </h2>
                            <p
                                className="text-xs"
                                style={{ color: "var(--ax-text-secondary)" }}
                            >
                                How to earn XP, level up, and climb the leaderboard
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div
                            className="rounded-xl p-4"
                            style={{
                                background: "var(--ax-surface-2)",
                                border: "1px solid var(--ax-border)",
                            }}
                        >
                            <h3
                                className="text-sm font-bold mb-2 flex items-center gap-2"
                                style={{ color: "var(--ax-text-primary)" }}
                            >
                                <Lightbulb className="h-4 w-4 text-amber-400" /> How It Works
                            </h3>
                            <p
                                className="text-xs leading-relaxed"
                                style={{ color: "var(--ax-text-secondary)" }}
                            >
                                Your total XP comes from <strong>three sources</strong>: Forums,
                                Library, and Planner. Every meaningful contribution earns XP,
                                which determines your global title and rank on the Platform
                                Leaderboard. Each module also has its own milestone system with
                                independent tiers.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            {[
                                {
                                    module: "Forums",
                                    icon: MessageSquare,
                                    color: "#818cf8",
                                    items: [
                                        "Post: +10 XP",
                                        "Comment: +3 XP",
                                        "Upvote received: +5 XP",
                                    ],
                                },
                                {
                                    module: "Library",
                                    icon: BookOpen,
                                    color: "#f59e0b",
                                    items: [
                                        "Upload: +15 XP",
                                        "Download received: +5 XP",
                                        "Rating received: +3 XP",
                                    ],
                                },
                                {
                                    module: "Planner",
                                    icon: CalendarCheck,
                                    color: "#ef4444",
                                    items: [
                                        "Plan created: +20 XP",
                                        "Proof submitted: +50 XP",
                                        "Consistent streaks: bonus",
                                    ],
                                },
                            ].map((s) => (
                                <div
                                    key={s.module}
                                    className="rounded-xl p-4"
                                    style={{
                                        background: "var(--ax-surface-2)",
                                        border: `1px solid ${s.color}25`,
                                    }}
                                >
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <s.icon className="h-4 w-4" style={{ color: s.color }} />
                                        <span
                                            className="text-xs font-bold"
                                            style={{ color: s.color }}
                                        >
                                            {s.module}
                                        </span>
                                    </div>
                                    <ul className="space-y-1.5">
                                        {s.items.map((item, i) => (
                                            <li
                                                key={i}
                                                className="text-[11px]"
                                                style={{ color: "var(--ax-text-muted)" }}
                                            >
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>

                        <div
                            className="rounded-xl p-4"
                            style={{
                                background: "var(--ax-surface-2)",
                                border: "1px solid var(--ax-border)",
                            }}
                        >
                            <h3
                                className="text-sm font-bold mb-2 flex items-center gap-2"
                                style={{ color: "var(--ax-text-primary)" }}
                            >
                                <Award className="h-4 w-4 text-indigo-400" /> Title Progression
                            </h3>
                            <p
                                className="text-xs leading-relaxed"
                                style={{ color: "var(--ax-text-secondary)" }}
                            >
                                As you accumulate XP, you unlock titles from{" "}
                                <strong>Student Explorer</strong> (0 XP) up to{" "}
                                <strong>Grandmaster Sage</strong> (15,000+ XP). Your title is
                                displayed on your profile and leaderboard. The highest title
                                requires consistent contribution across ALL three
                                modules — forums, library, and planner.
                            </p>
                        </div>
                    </div>
                </div>
            </Section>

            {/* Modules Overview */}
            <Section delay={0.2}>
                <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/20">
                        <Star className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                        <h2
                            className="text-lg font-bold"
                            style={{ color: "var(--ax-text-primary)" }}
                        >
                            Platform Modules
                        </h2>
                        <p
                            className="text-xs"
                            style={{ color: "var(--ax-text-secondary)" }}
                        >
                            Everything you can do on Academix
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    {MODULES.map((mod) => (
                        <ModuleCard key={mod.title} {...mod} />
                    ))}
                </div>
            </Section>

            {/* Social & Messaging */}
            <Section delay={0.3}>
                <div
                    className="rounded-2xl p-6 sm:p-8"
                    style={{
                        background: "var(--ax-surface-1)",
                        border: "1px solid var(--ax-border)",
                    }}
                >
                    <div className="flex items-center gap-3 mb-5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
                            <Users className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                            <h2
                                className="text-lg font-bold"
                                style={{ color: "var(--ax-text-primary)" }}
                            >
                                Social & Messaging
                            </h2>
                            <p
                                className="text-xs"
                                style={{ color: "var(--ax-text-secondary)" }}
                            >
                                Connect, follow, and chat with peers
                            </p>
                        </div>
                    </div>
                    <div
                        className="space-y-2 text-xs leading-relaxed"
                        style={{ color: "var(--ax-text-secondary)" }}
                    >
                        <p>
                            <strong>Follow System:</strong> Follow other users to see their
                            activity. Mutual follows unlock friend status.
                        </p>
                        <p>
                            <strong>Friend Requests:</strong> Send friend requests from user
                            profiles. Once accepted, you become friends.
                        </p>
                        <p>
                            <strong>Private Messaging:</strong> Only friends can message each
                            other. This ensures a safe and trusted communication environment.
                        </p>
                        <p>
                            <strong>Notifications:</strong> Get notified about friend
                            requests, messages, follows, and planner deadlines.
                        </p>
                    </div>
                </div>
            </Section>

            {/* About & Contact */}
            <Section delay={0.4}>
                <div
                    className="rounded-2xl p-6 sm:p-8"
                    style={{
                        background: "var(--ax-surface-1)",
                        border: "1px solid var(--ax-border)",
                    }}
                >
                    <div className="flex items-center gap-3 mb-5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 ring-1 ring-rose-500/20">
                            <Heart className="h-5 w-5 text-rose-400" />
                        </div>
                        <div>
                            <h2
                                className="text-lg font-bold"
                                style={{ color: "var(--ax-text-primary)" }}
                            >
                                About Us
                            </h2>
                            <p
                                className="text-xs"
                                style={{ color: "var(--ax-text-secondary)" }}
                            >
                                Who built this and how to get help
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div
                            className="rounded-xl p-4"
                            style={{
                                background: "var(--ax-surface-2)",
                                border: "1px solid var(--ax-border)",
                            }}
                        >
                            <h3
                                className="text-sm font-bold mb-2"
                                style={{ color: "var(--ax-text-primary)" }}
                            >
                                Developer
                            </h3>
                            <p
                                className="text-xs mb-3"
                                style={{ color: "var(--ax-text-secondary)" }}
                            >
                                Built by{" "}
                                <strong className="text-amber-400">Rajnish Bhardwaj</strong>
                            </p>
                            <div className="space-y-2">
                                <a
                                    href="mailto:bhardwajrajanishcs232457@gmail.com"
                                    className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    <Mail className="h-3.5 w-3.5" /> bhardwajrajanishcs232457@gmail.com
                                </a>
                                <a
                                    href="https://github.com/Rajnishb72"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    <Github className="h-3.5 w-3.5" /> @Rajnishb72
                                </a>
                            </div>
                        </div>

                        <div
                            className="rounded-xl p-4"
                            style={{
                                background: "var(--ax-surface-2)",
                                border: "1px solid var(--ax-border)",
                            }}
                        >
                            <h3
                                className="text-sm font-bold mb-2"
                                style={{ color: "var(--ax-text-primary)" }}
                            >
                                Help & Support
                            </h3>
                            <ul
                                className="space-y-1.5 text-xs"
                                style={{ color: "var(--ax-text-secondary)" }}
                            >
                                <li className="flex items-center gap-2">
                                    <Shield className="h-3.5 w-3.5 text-emerald-400 shrink-0" />{" "}
                                    Report issues via email
                                </li>
                                <li className="flex items-center gap-2">
                                    <ExternalLink className="h-3.5 w-3.5 text-amber-400 shrink-0" />{" "}
                                    Check GitHub for updates
                                </li>
                                <li className="flex items-center gap-2">
                                    <Users className="h-3.5 w-3.5 text-indigo-400 shrink-0" />{" "}
                                    Community support via Forums
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div
                        className="mt-4 rounded-xl p-4 text-center"
                        style={{
                            background: "var(--ax-surface-2)",
                            border: "1px solid var(--ax-border)",
                        }}
                    >
                        <p
                            className="text-xs"
                            style={{ color: "var(--ax-text-faint)" }}
                        >
                            Academix v2.0 · Built with Next.js, Supabase, TypeScript, Framer
                            Motion · © {new Date().getFullYear()} Rajnish Bhardwaj. All rights
                            reserved.
                        </p>
                    </div>
                </div>
            </Section>
        </div>
    );
}
