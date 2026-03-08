"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, Variants } from "framer-motion";
import {
  BookOpen, BrainCircuit, Building2, LayoutDashboard, MessageSquare,
  Sparkles, ArrowRight, GraduationCap, ShieldCheck,
  Award, Zap, Database, Menu, X,
  Globe, Lock, Server, Cpu, Trophy, Medal, BadgeCheck,
  Upload, Search, Users, Star, TrendingUp,
  FileText, CheckCircle2, ChevronRight, BarChart3
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════════════════ */

const MODULES = [
  {
    id: "planner", title: "Academic Planner", icon: LayoutDashboard,
    gradient: "from-blue-500 to-cyan-500",
    description: "Build AI-powered study plans, track daily tasks, set exam milestones, and manage assignment deadlines across all your courses.",
    features: ["AI Schedule Generator", "Milestone Tracking", "Progress Analytics", "Smart Reminders"]
  },
  {
    id: "campus", title: "Digital Campus", icon: Building2,
    gradient: "from-emerald-500 to-teal-500",
    description: "Join course-specific groups, collaborate with classmates, submit assignments, and view leaderboards of top performers.",
    features: ["Group Collaboration", "Assignment Submissions", "Role Management", "Verified Institutions"]
  },
  {
    id: "library", title: "Study Library", icon: BookOpen,
    gradient: "from-amber-500 to-orange-500",
    description: "A curated repository of peer-reviewed study materials. Upload PDFs, share notes, rate content, and discover the best resources.",
    features: ["PDF Sharing", "Community Ratings", "Smart Search", "Collection Bookmarks"]
  },
  {
    id: "forum", title: "Discussion Forum", icon: MessageSquare,
    gradient: "from-purple-500 to-violet-500",
    description: "Engage in academic discourse. Ask questions, share solutions, and earn reputation through community upvotes.",
    features: ["Rich Text Posts", "Nested Comments", "Reputation System", "Topic Categories"]
  },
  {
    id: "ailab", title: "AI Study Lab", icon: BrainCircuit,
    gradient: "from-rose-500 to-pink-500",
    description: "Your AI-powered study assistant. Chat with documents, generate quizzes, create flashcards, and get instant summaries.",
    features: ["Document Analysis (RAG)", "Auto Quiz Generation", "Smart Summaries", "Flashcard Creator"]
  },
  {
    id: "profile", title: "Profile & Reputation", icon: Award,
    gradient: "from-indigo-500 to-blue-500",
    description: "Gamified academic growth. Earn XP for contributions, climb 10 ranks from Newcomer to Grandmaster, and collect achievement badges.",
    features: ["10-Tier XP System", "Achievement Badges", "Social Connections", "Public Portfolio"]
  }
];

const STEPS = [
  { step: "01", title: "Create Your Account", description: "Sign up in seconds with a secure, verified profile.", icon: Users },
  { step: "02", title: "Join Your Campus", description: "Connect with your institution and classmates instantly.", icon: Building2 },
  { step: "03", title: "Upload & Discover", description: "Share your notes and discover top-rated resources.", icon: Upload },
  { step: "04", title: "Learn with AI", description: "Generate quizzes, flashcards, and summaries with one click.", icon: BrainCircuit },
];

const TRUST_ITEMS = [
  { label: "End-to-End Encryption", icon: Lock, desc: "All data secured with industry-standard encryption." },
  { label: "Role-Based Access", icon: ShieldCheck, desc: "Admins, contributors, and viewers with clear permissions." },
  { label: "Verified Institutions", icon: BadgeCheck, desc: "Campus groups verified by institutional administrators." },
  { label: "99.9% Uptime", icon: Server, desc: "Deployed on enterprise infrastructure for reliability." },
];

const TECH_STACK = [
  { title: "Next.js 15", icon: Server, desc: "Server-side rendering with App Router for instant page loads." },
  { title: "Supabase", icon: Database, desc: "PostgreSQL database with real-time subscriptions and auth." },
  { title: "Gemini AI", icon: Cpu, desc: "Advanced RAG processing for document analysis and generation." },
  { title: "Real-Time", icon: Zap, desc: "Instant updates across all devices via WebSocket channels." },
];

/* ═══════════════════════════════════════════════════════════════════════════
   ANIMATIONS
   ═══════════════════════════════════════════════════════════════════════════ */

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, type: "spring", bounce: 0.4 } }
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

const scaleUp: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};

const floatAnimation: Variants = {
  hidden: { y: 0 },
  visible: { y: [-15, 15, -15], transition: { duration: 5, repeat: Infinity, ease: "easeInOut" } }
};

const pulseGlow: Variants = {
  hidden: { opacity: 0.3, scale: 0.8 },
  visible: { opacity: [0.3, 0.6, 0.3], scale: [0.8, 1.1, 0.8], transition: { duration: 8, repeat: Infinity, ease: "easeInOut" } }
};

/* ═══════════════════════════════════════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════════════════════════════════════ */

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Technology", href: "#technology" },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${scrolled
        ? "bg-slate-950/90 backdrop-blur-2xl border-b border-white/[0.06] shadow-lg shadow-black/20"
        : "bg-transparent"
        }`}
    >
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
            <GraduationCap className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">Academix</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-white">
              {l.label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white sm:block">
            Sign In
          </Link>
          <Link href="/sign-up" className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:shadow-[0_0_24px_rgba(99,102,241,0.35)] active:scale-[0.97]">
            Get Started
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
          {/* Mobile toggle */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/[0.06] hover:text-white md:hidden">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="border-t border-white/[0.06] bg-slate-950/95 backdrop-blur-2xl px-6 pb-6 pt-4 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.04] hover:text-white">
                {l.label}
              </a>
            ))}
            <Link href="/sign-in" onClick={() => setMobileOpen(false)}
              className="rounded-lg px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.04] hover:text-white">
              Sign In
            </Link>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION HEADING (reusable)
   ═══════════════════════════════════════════════════════════════════════════ */

function SectionHeader({ badge, title, subtitle }: { badge: string; title: string; subtitle: string }) {
  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}
      className="mx-auto max-w-2xl text-center mb-14 lg:mb-16">
      <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-indigo-400 mb-5">
        {badge}
      </span>
      <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-[2.75rem] leading-tight">
        {title}
      </h2>
      <p className="mt-4 text-base text-slate-400 leading-relaxed lg:text-lg">
        {subtitle}
      </p>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const yHero = useTransform(scrollYProgress, [0, 0.5], [0, 200]);
  const opHero = useTransform(scrollYProgress, [0, 0.18], [1, 0]);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Academix",
    "url": "https://academix.app", // Adjust to final domain
    "description": "The Ultimate Academic OS. Plan your semester, share notes, collaborate with classmates, and supercharge study sessions with AI-powered tools.",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30 font-sans overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <Navbar />

      {/* ─── 1. HERO ─────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden pt-[72px]">
        {/* Background Animating Orbs & Grid */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
          <motion.div initial="hidden" animate="visible" variants={pulseGlow} className="absolute left-1/4 top-1/4 h-[35rem] w-[35rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[120px]" />
          <motion.div initial="hidden" animate="visible" variants={pulseGlow} transition={{ delay: 2 }} className="absolute right-1/4 top-1/2 h-[35rem] w-[35rem] -translate-y-1/2 translate-x-1/2 rounded-full bg-violet-500/10 blur-[120px]" />

          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        </div>

        <motion.div style={{ y: yHero, opacity: opHero }} className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          {/* Badge */}
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
            className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-5 py-2 text-xs font-bold uppercase tracking-widest text-indigo-400 backdrop-blur-md shadow-[0_0_20px_rgba(99,102,241,0.15)]">
            <Sparkles className="h-3.5 w-3.5" />
            The Academic Operating System
          </motion.div>

          {/* Headline */}
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="text-[2.75rem] font-black tracking-tight text-white sm:text-6xl lg:text-7xl !leading-[1.08]">
            Study smarter.{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              Achieve more.
            </span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
            Plan your semester, share notes, collaborate with classmates, and supercharge study sessions with AI-powered tools — all in one platform.
          </motion.p>

          {/* CTAs */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/sign-up"
              className="group relative flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-4 text-sm font-bold text-white transition-all hover:shadow-[0_0_32px_rgba(99,102,241,0.4)] active:scale-[0.97] sm:w-auto">
              <span>Start Learning Free</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              <span className="pointer-events-none absolute inset-0 -translate-x-full rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-full transition-transform duration-700" />
            </Link>
            <a href="#features"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md px-8 py-4 text-sm font-semibold text-slate-300 transition-all hover:bg-white/[0.06] hover:border-white/[0.12] hover:text-white sm:w-auto">
              Explore Features
            </a>
          </motion.div>

          {/* Trust line */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500/60" /> Secured with Supabase Auth</span>
            <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-amber-500/60" /> Powered by Gemini AI</span>
            <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-blue-500/60" /> Free to Use</span>
          </motion.div>
        </motion.div>

        {/* Dashboard Preview */}
        <motion.div initial={{ opacity: 0, y: 120, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 1.2, type: "spring", bounce: 0.3, delay: 0.4 }}
          className="relative z-10 mt-20 w-full max-w-5xl px-6 lg:px-8 perspective-1000 group">
          <motion.div variants={floatAnimation} initial="hidden" animate="visible" className="rounded-2xl border border-white/[0.08] bg-slate-900/80 p-2 shadow-[0_0_50px_rgba(99,102,241,0.15)] backdrop-blur-2xl transition-transform duration-700 group-hover:rotate-x-2 group-hover:-translate-y-2">
            {/* Browser chrome */}
            <div className="flex h-9 items-center gap-2 rounded-t-xl border-b border-white/[0.04] px-4">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
              </div>
              <div className="mx-auto flex h-5 w-52 items-center justify-center rounded-md bg-slate-950/80 text-[10px] font-medium text-slate-500">
                academix.app/dashboard
              </div>
            </div>
            {/* Content mock */}
            <div className="relative h-[280px] sm:h-[380px] w-full overflow-hidden rounded-b-xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(99,102,241,0.08),transparent_50%)]" />
              <div className="grid grid-cols-3 gap-3 px-6 w-full max-w-lg z-10 opacity-60">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 space-y-2">
                    <div className="h-2 w-8 rounded bg-white/10" />
                    <div className="h-4 w-full rounded bg-white/[0.06]" />
                    <div className="h-2 w-2/3 rounded bg-white/[0.04]" />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
          {/* Gradient fade at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent z-20" />
        </motion.div>
      </section>

      {/* ─── 2. KEY FEATURES (MODULES) ───────────────────────────────────── */}
      <section id="features" className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <SectionHeader
            badge="Core Modules"
            title="Six integrated modules. One unified experience."
            subtitle="Every module works together — your planner feeds your progress, your uploads build your reputation, and AI amplifies everything."
          />

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}
            className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((mod) => (
              <motion.div key={mod.id} variants={fadeUp}
                className="group relative rounded-3xl border-2 border-white/5 bg-slate-900/40 p-1 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(99,102,241,0.5)]">
                {/* Thick glowing border overlay */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${mod.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-20`} />
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${mod.gradient} opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-10`} />

                <div className="relative h-full w-full rounded-[22px] border border-white/10 bg-slate-950/80 p-6 backdrop-blur-xl">
                  <div className={`relative mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${mod.gradient} shadow-xl shadow-black/50 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                    <mod.icon className="h-6 w-6 text-white drop-shadow-md" />
                  </div>
                  <h3 className="relative text-lg font-bold text-white tracking-tight mb-2">{mod.title}</h3>
                  <p className="relative text-sm leading-relaxed text-slate-400 mb-5">{mod.description}</p>
                  <ul className="relative space-y-2">
                    {mod.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-xs font-medium text-slate-300">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500/70 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── 3. HOW IT WORKS ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="relative py-24 sm:py-32 border-y border-white/[0.04]" style={{ background: "linear-gradient(to bottom, rgba(15,23,42,0.5), rgba(15,23,42,0.8))" }}>
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <SectionHeader
            badge="Getting Started"
            title="From sign-up to study success in four steps."
            subtitle="No complex onboarding. No learning curve. Start contributing and benefiting from the community in minutes."
          />

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <motion.div key={s.step} variants={fadeUp}
                className="group relative rounded-[2rem] border-2 border-slate-800 bg-slate-900/50 p-2 transition-all duration-500 hover:-translate-y-1 hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:bg-indigo-500/5">
                <div className="relative h-full w-full rounded-3xl border border-white/5 bg-slate-950/60 p-6 backdrop-blur-md">
                  {/* Step number */}
                  <div className="mb-6 flex items-center justify-between">
                    <span className="text-4xl font-black text-white/[0.08] tracking-tighter transition-colors duration-500 group-hover:text-indigo-500/20">{s.step}</span>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/30 transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 group-hover:bg-indigo-500/20 shadow-lg">
                      <s.icon className="h-5 w-5 text-indigo-400 group-hover:text-indigo-300" />
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{s.description}</p>
                  {/* Connector line (not on last) */}
                  {i < STEPS.length - 1 && (
                    <div className="absolute -right-3 top-1/2 hidden h-px w-6 bg-gradient-to-r from-indigo-500/20 to-transparent lg:block" />
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── 4. GAMIFICATION & REPUTATION ─────────────────────────────────── */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.08),transparent_70%)] blur-3xl" />

        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center">
            {/* Left — Text */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <span className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-purple-400 mb-6">
                <Trophy className="h-3.5 w-3.5" />
                Growth Engine
              </span>
              <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-[2.75rem] leading-tight">
                Your effort, quantified and rewarded.
              </h2>
              <p className="mt-6 text-lg text-slate-400 leading-relaxed">
                Every action builds your profile. Upload notes, answer questions, or complete study plans to earn XP. Progress from{" "}
                <strong className="text-slate-200">Newcomer</strong> to{" "}
                <strong className="text-amber-400">Grandmaster</strong> and collect unique achievement badges.
              </p>

              <div className="mt-10 grid grid-cols-2 gap-3">
                {[
                  { label: "10-Tier XP System", icon: Medal, color: "text-amber-400" },
                  { label: "Achievement Badges", icon: ShieldCheck, color: "text-blue-400" },
                  { label: "Public Portfolio", icon: Globe, color: "text-emerald-400" },
                  { label: "Leaderboards", icon: BarChart3, color: "text-rose-400" }
                ].map((item, i) => (
                  <motion.div key={i} whileHover={{ scale: 1.05 }} className="group flex items-center gap-3 rounded-2xl border-2 border-slate-800 bg-slate-900/60 px-5 py-4 transition-all duration-300 hover:border-purple-500/40 hover:bg-purple-500/10 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                    <item.icon className={`h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110 ${item.color}`} />
                    <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{item.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right — Profile card mockup */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="relative">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-600/20 blur-3xl opacity-30 rounded-full" />
              <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 shadow-2xl backdrop-blur-sm">
                {/* Profile header */}
                <div className="flex items-center gap-4 mb-7 border-b border-white/[0.06] pb-6">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg font-bold text-white shadow-[0_0_20px_rgba(99,102,241,0.35)]">
                    MS
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      Master Scholar
                      <BadgeCheck className="h-4.5 w-4.5 text-indigo-400" />
                    </h3>
                    <p className="text-sm text-purple-400 font-semibold">Level 7 &middot; 3,450 XP</p>
                  </div>
                </div>
                {/* XP bar */}
                <div className="space-y-2 mb-7">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-400">Progress to Level 8</span>
                    <span className="font-bold text-slate-300">65%</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full w-[65%] rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
                  </div>
                </div>
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {["Library Contributor", "Top Notes", "A+ Scholar", "7-Day Streak"].map((b, i) => (
                    <span key={i} className="rounded-md border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── 5. TRUST & SECURITY ─────────────────────────────────────────── */}
      <section className="py-24 sm:py-32 border-y border-white/[0.04]" style={{ background: "linear-gradient(to bottom, rgba(15,23,42,0.5), rgba(15,23,42,0.8))" }}>
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <SectionHeader
            badge="Trust & Security"
            title="Built for reliability. Secured by design."
            subtitle="Your academic data deserves enterprise-grade protection. Every layer of Academix is built with security and privacy in mind."
          />

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_ITEMS.map((item, i) => (
              <motion.div key={i} variants={fadeUp}
                className="group relative overflow-hidden rounded-[2rem] border-2 border-slate-800 bg-slate-900/40 p-8 text-center transition-all duration-500 hover:-translate-y-2 hover:border-emerald-500/40 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="relative z-10 mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 transition-all duration-500 group-hover:scale-110 group-hover:bg-emerald-500/20 shadow-lg shadow-emerald-500/10">
                  <item.icon className="h-5 w-5 text-emerald-400" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1.5">{item.label}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── 6. TECHNOLOGY ───────────────────────────────────────────────── */}
      <section id="technology" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <SectionHeader
            badge="Technology"
            title="Engineered for performance."
            subtitle="Built on modern, scalable web technologies ensuring a seamless real-time experience without compromises."
          />

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TECH_STACK.map((tech, i) => (
              <motion.div key={i} variants={fadeUp}
                className="group rounded-3xl border-2 border-slate-800 bg-slate-900/40 p-7 transition-all duration-500 hover:-translate-y-1 hover:bg-white/5 hover:border-white/20 hover:shadow-2xl">
                <tech.icon className="h-6 w-6 text-slate-300 mb-4 transition-transform group-hover:scale-110" />
                <h4 className="text-sm font-bold text-white mb-2">{tech.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{tech.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── 7. FINAL CTA ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-32 sm:py-48 bg-slate-950">
        <div className="pointer-events-none absolute inset-0 z-0">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={pulseGlow}
            className="absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/15 blur-[120px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950 opacity-90" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-5xl leading-tight">
              Ready to transform your academic journey?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-slate-400 leading-relaxed">
              Join thousands of students who plan smarter, collaborate better, and achieve more with Academix.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/sign-up"
                className="group flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-4 text-sm font-bold text-white transition-all hover:shadow-[0_0_32px_rgba(99,102,241,0.4)] active:scale-[0.97]">
                Get Started — It&apos;s Free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/sign-in"
                className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-8 py-4 text-sm font-semibold text-slate-300 transition-all hover:bg-white/[0.06] hover:text-white">
                Sign In
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── 8. FOOTER ───────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] bg-slate-950 py-14">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
                  <GraduationCap className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-bold tracking-tight text-white">Academix</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
                The unified academic platform that helps students plan, share, collaborate, and grow together.
              </p>
            </div>

            {/* Nav columns */}
            {[
              { title: "Platform", links: [{ label: "Study Library", href: "/library" }, { label: "Discussion Forum", href: "/forums" }, { label: "Digital Campus", href: "/campus" }, { label: "AI Study Lab", href: "/ai-lab" }] },
              { title: "Tools", links: [{ label: "Academic Planner", href: "/planner" }, { label: "Leaderboard", href: "/leaderboard" }, { label: "Search", href: "/search" }, { label: "Insights", href: "/insights" }] },
              { title: "Account", links: [{ label: "Sign In", href: "/sign-in" }, { label: "Sign Up", href: "/sign-up" }, { label: "Dashboard", href: "/dashboard" }, { label: "Profile", href: "/profile" }] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-sm text-slate-500 transition-colors hover:text-white">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 sm:flex-row">
            <p className="text-xs text-slate-500">&copy; {new Date().getFullYear()} Academix. All rights reserved.</p>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-emerald-500/60" /> Secured with Supabase</span>
              <span className="flex items-center gap-1.5"><Database className="h-3 w-3 text-blue-500/60" /> Powered by Supabase</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
