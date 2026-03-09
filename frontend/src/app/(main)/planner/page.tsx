"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useUser } from "@/hooks/useUser";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Sparkles,
  CalendarDays,
  BookOpen,
  Zap,
  Flame,
  Upload,
  CheckCircle2,
  ChevronRight,
  BarChart2,
  Trophy,
  Target,
  ArrowLeft,
  Brain,
  Trash2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Plus,
  X,
  Check, // Added Check
  CheckCheck,
  Circle,
  ListChecks,
  FileText,
  Download,
  Eye,
  Pencil,
  ClipboardList,
  AlertTriangle,
  Loader2,
  Clock,
  Tag,
  AlertCircle,
  Shield,
  Sword as Swords,
  Medal,
  Gem,
  Crown,
} from "lucide-react";


// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedScheduleSlot {
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

interface SavedPlan {
  id: string;
  name: string;
  createdAt: string;
  targetDate: string;
  dailyHours: number;
  intensity?: string;
  plan: {
    feasible: boolean;
    warning: string | null;
    totalDaysAvailable: number;
    schedule: SavedScheduleSlot[];
    overallStrategy: string;
    motivationalNote: string;
  };
  proofs?: {
    chapterIndex: number;
    proofUrl: string;
    proofId?: string;
    fileName: string;
    uploadedAt: string;
  }[];
}

// On-demand proof URL loader — avoids pulling large base64 data on listing queries
async function fetchProofUrl(proofId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("plan_proofs")
      .select("file_url")
      .eq("id", proofId)
      .single();
    if (error || !data) return null;
    return data.file_url;
  } catch { return null; }
}

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  hard: "bg-red-500/10 text-red-400 border-red-500/20",
};

function fmtDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

interface ChapterSlot {
  chapter: number;
  startDay: number;
  endDay: number;
  startDate: string;
  endDate: string;
  completed: boolean;
}

interface PlanConfig {
  subject: string;
  chapters: number;
  startDate: string;
  endDate: string;
  smartDistribution: boolean;
}


function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function generateRoadmap(config: PlanConfig): ChapterSlot[] {
  const start = new Date(config.startDate);
  const end = new Date(config.endDate);
  const totalDays = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 86400000),
  );
  const daysPerChapter = Math.max(1, Math.floor(totalDays / config.chapters));

  return Array.from({ length: config.chapters }, (_, i) => {
    const startDay = i * daysPerChapter;
    const endDay =
      i < config.chapters - 1 ? startDay + daysPerChapter - 1 : totalDays;
    return {
      chapter: i + 1,
      startDay,
      endDay,
      startDate: addDays(config.startDate, startDay),
      endDate: addDays(config.startDate, endDay),
      completed: false,
    };
  });
}

// ─── Sub-Module Navigation ────────────────────────────────────────────────────

const SUB_NAV = [
  { label: "Generate Plan", icon: Brain, desc: "AI-powered study planner" },
  { label: "My Plans", icon: ClipboardList, desc: "View saved plans" },
  { label: "Progress", icon: BarChart2, desc: "Track your study stats" },
  { label: "Milestones & Achievements", icon: Trophy, desc: "Achievements and XP" },
];

// ─── AI Roadmap Architect Card ───────────────────────────────────────────────

// ─── Inline AI Plan Generator (Premium Redesign) ─────────────────────────────
// Single-column stacked layout with How-It-Works, glassmorphism, micro-interactions

// --- PDF Text Extraction (client-side via pdfjs-dist) ---
let _pdfjsModule: any = null;
async function loadPdfJs() {
  if (_pdfjsModule) return _pdfjsModule;
  // @ts-ignore – pdfjs-dist uses top-level await; topLevelAwait: true is set in next.config.ts
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  _pdfjsModule = pdfjs;
  return pdfjs;
}

async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjs = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  const maxPages = Math.min(pdf.numPages, 30);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => ("str" in item ? item.str : "")).join(" ");
    fullText += pageText + "\n";
  }
  return fullText.trim();
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { resolve((reader.result as string).split(",")[1]); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface InlineChapter { id: string; title: string; topics: string[]; source: "ai" | "manual"; }
interface InlineScheduleSlot { chapterIndex: number; title: string; startDate: string; endDate: string; daysAllocated: number; overview?: string; dailyGoals: string[]; studyTip: string; difficulty: "easy" | "medium" | "hard"; }
interface InlineGeneratedPlan { feasible: boolean; warning: string | null; totalDaysAvailable: number; schedule: InlineScheduleSlot[]; overallStrategy: string; motivationalNote: string; }
type InlinePhase = "idle" | "scanning" | "extracted" | "generating" | "done";

const STEP_ITEMS = [
  { icon: Upload, title: "Upload", desc: "Drop your syllabus PDF or image" },
  { icon: Brain, title: "Extract", desc: "AI reads and identifies every chapter" },
  { icon: Sparkles, title: "Generate", desc: "Get a personalised study schedule" },
];

function AiRoadmapCard({ onPlanGenerated }: { onPlanGenerated?: (plan: SavedPlan) => void }) {
  const { user } = useUser();

  const [phase, setPhase] = React.useState<InlinePhase>("idle");
  const [isDragging, setIsDragging] = React.useState(false);
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);
  const [chapters, setChapters] = React.useState<InlineChapter[]>([]);
  const [visibleCount, setVisibleCount] = React.useState(0);
  const [extractError, setExtractError] = React.useState<string | null>(null);
  const [planName, setPlanName] = React.useState("");
  const [planDays, setPlanDays] = React.useState(0);
  const [newChapterTitle, setNewChapterTitle] = React.useState("");
  const [generatedPlan, setGeneratedPlan] = React.useState<InlineGeneratedPlan | null>(null);
  const [expandedSlots, setExpandedSlots] = React.useState<Set<number>>(new Set());
  const [generatingMsg, setGeneratingMsg] = React.useState("AI is generating your plan...");
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Rotate loading messages
  React.useEffect(() => {
    if (phase !== "generating") return;
    const msgs = ["AI is generating your plan...", "Analysing chapter complexity...", "Optimising your study schedule...", "Calculating the best path...", "Almost there..."];
    let idx = 0;
    const t = setInterval(() => { idx = (idx + 1) % msgs.length; setGeneratingMsg(msgs[idx]); }, 1800);
    return () => clearInterval(t);
  }, [phase]);

  // Staggered chapter reveal
  React.useEffect(() => {
    if (phase !== "extracted") return;
    setVisibleCount(0);
    const t = setInterval(() => {
      setVisibleCount((n) => { if (n >= chapters.length) { clearInterval(t); return n; } return n + 1; });
    }, 150);
    return () => clearInterval(t);
  }, [phase, chapters.length]);

  // --- File processing ---
  async function processFile(file: File) {
    const isPdf = file.type === "application/pdf";
    const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
    if (!isPdf && !isImage) return;
    setUploadedFile(file);
    setExtractError(null);
    setImagePreview(null);
    setPhase("scanning");

    // Auto-suggest plan name from filename
    const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    if (!planName) setPlanName(baseName);

    try {
      if (isImage) {
        const dataUrl = await fileToDataURL(file);
        setImagePreview(dataUrl);
        const base64 = await fileToBase64(file);
        const res = await fetch("/api/planner/extract", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
        });
        const data = await res.json();
        if (!res.ok || !data.chapters?.length) {
          setExtractError("AI could not find chapters in this image. Add them manually.");
          setChapters([]); setPhase("extracted"); return;
        }
        setChapters(data.chapters.map((c: { title: string; topics?: string[] }) => ({
          id: Math.random().toString(36).slice(2, 9), title: c.title,
          topics: c.topics ?? [], source: "ai" as const,
        })));
        setPhase("extracted"); return;
      }
      // PDF path
      const text = await extractTextFromPdf(file);
      if (!text || text.length < 50) {
        setExtractError("Could not read text from this PDF. It may be scanned/image-based. Add chapters manually.");
        setChapters([]); setPhase("extracted"); return;
      }
      const res = await fetch("/api/planner/extract", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok || !data.chapters?.length) {
        setExtractError(data.error || "AI could not extract chapters from this PDF. Add chapters manually.");
        setChapters([]); setPhase("extracted"); return;
      }
      setChapters(data.chapters.map((c: { title: string; topics?: string[] }) => ({
        id: Math.random().toString(36).slice(2, 9), title: c.title,
        topics: c.topics ?? [], source: "ai" as const,
      })));
      setPhase("extracted");
    } catch (err) {
      console.error(err);
      setExtractError("Something went wrong reading the file. You can still add chapters manually.");
      setChapters([]); setPhase("extracted");
    }
  }

  function addChapter() {
    const title = newChapterTitle.trim();
    if (!title) return;
    setChapters((prev) => [...prev, { id: Math.random().toString(36).slice(2, 9), title, topics: [], source: "manual" }]);
    setNewChapterTitle(""); setVisibleCount((n) => n + 1);
  }

  function removeChapter(id: string) { setChapters((prev) => prev.filter((c) => c.id !== id)); }

  // Days per chapter removed — distribution happens when user sets total days

  // --- Generate schedule ---
  async function handleGenerate() {
    if (!planName || planDays < 1 || chapters.length === 0) return;
    if (!user?.id) {
      setExtractError("Please sign in to generate and save a study plan.");
      return;
    }
    setPhase("generating"); setExtractError(null);
    const targetDateObj = new Date();
    targetDateObj.setDate(targetDateObj.getDate() + planDays);
    const targetDate = targetDateObj.toISOString().slice(0, 10);
    const dailyHours = Math.min(8, Math.max(1, Math.round((chapters.length / Math.max(1, planDays)) * 2 * 10) / 10));
    const pace = planDays / chapters.length;
    const intensity: "light" | "normal" | "aggressive" = pace >= 3 ? "light" : pace >= 1.5 ? "normal" : "aggressive";
    try {
      const res = await fetch("/api/planner/schedule", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapters: chapters.map((c) => ({ title: c.title, estimatedDays: Math.max(1, Math.round(planDays / chapters.length)), topics: c.topics })),
          targetDate, dailyHours, planName, intensity,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.plan) throw new Error(data.error ?? "Schedule generation failed");
      const plan: InlineGeneratedPlan = data.plan;
      setGeneratedPlan(plan);

      // Save to Supabase and let DB auto-generate UUID
      const { data: insertedPlan, error: dbErr } = await supabase.from("study_plans").insert({
        user_id: user.id, name: planName,
        target_date: targetDate, daily_hours: dailyHours, intensity, plan_data: plan,
      }).select().single();

      if (dbErr) {
        console.warn("[planner] Supabase save failed:", dbErr);
      } else if (insertedPlan && onPlanGenerated) {
        // Map to SavedPlan shape and notify parent
        onPlanGenerated({
          id: insertedPlan.id,
          name: insertedPlan.name,
          createdAt: insertedPlan.created_at,
          targetDate: insertedPlan.target_date,
          dailyHours: insertedPlan.daily_hours,
          intensity: insertedPlan.intensity ?? "normal",
          plan: insertedPlan.plan_data,
          proofs: []
        } as SavedPlan);
      }

      setPhase("done");
    } catch (err) {
      console.error(err);
      setPhase("extracted");
      setExtractError(err instanceof Error ? err.message : "Failed to generate schedule. Try again.");
    }
  }

  function toggleSlot(idx: number) {
    setExpandedSlots((prev) => { const next = new Set(prev); next.has(idx) ? next.delete(idx) : next.add(idx); return next; });
  }

  function resetAll() {
    setPhase("idle"); setUploadedFile(null); setChapters([]); setVisibleCount(0);
    setExtractError(null); setImagePreview(null); setGeneratedPlan(null);
    setPlanName(""); setPlanDays(0);
  }

  const fmtInline = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const isReady = phase === "extracted" && !!planName && planDays >= 1 && chapters.length > 0;
  const tooTight = planDays > 0 && chapters.length > 0 && planDays < chapters.length;
  const recommendedDays = chapters.length > 0 ? Math.max(chapters.length, Math.round(chapters.length * 2.5)) : 0;

  // ── DONE VIEW: Show generated schedule ──
  if (phase === "done" && generatedPlan) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={resetAll} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Create Another Plan
          </button>
          <button onClick={() => { setPhase("extracted"); setGeneratedPlan(null); }} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Edit Plan
          </button>
        </div>

        {/* Hero card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 border border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-transparent to-indigo-500/5"
          style={{ backdropFilter: "blur(12px)" }}>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/20">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white">{planName}</h2>
              <p className="mt-1 text-sm text-slate-400">{generatedPlan.schedule.length} chapters &middot; {planDays} days</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{generatedPlan.overallStrategy}</p>
            </div>
          </div>
          {generatedPlan.warning && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
              <p className="text-sm text-amber-300">{generatedPlan.warning}</p>
            </div>
          )}
          <div className="mt-4 flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <span className="text-slate-500 italic">{generatedPlan.motivationalNote}</span>
          </div>
        </motion.div>

        {/* Schedule timeline */}
        <div className="space-y-3">
          {generatedPlan.schedule.map((slot, idx) => {
            const isExpanded = expandedSlots.has(idx);
            const diffStyle = slot.difficulty === "easy" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : slot.difficulty === "hard" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20";
            return (
              <motion.div key={idx} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden hover:border-slate-700 transition-colors"
                style={{ backdropFilter: "blur(8px)" }}>
                <button onClick={() => toggleSlot(idx)} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-800/30 transition-colors">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-sm font-bold text-violet-400 ring-1 ring-violet-500/30">
                    {slot.chapterIndex}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-200 text-sm truncate">{slot.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{fmtInline(slot.startDate)} &rarr; {fmtInline(slot.endDate)} &middot; {slot.daysAllocated} day{slot.daysAllocated !== 1 ? "s" : ""}</p>
                  </div>
                  <span className={`hidden sm:inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${diffStyle}`}>{slot.difficulty}</span>
                  {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />}
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden border-t border-slate-800">
                      <div className="px-5 py-4 space-y-4">
                        {slot.overview && (
                          <div className="flex items-start gap-2 rounded-xl border border-violet-500/15 bg-violet-500/5 p-3">
                            <BookOpen className="h-4 w-4 shrink-0 mt-0.5 text-violet-400" />
                            <p className="text-xs text-slate-300 leading-relaxed">{slot.overview}</p>
                          </div>
                        )}
                        <div>
                          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><Target className="h-3.5 w-3.5" /> Daily Goals</p>
                          <ul className="space-y-1.5">
                            {slot.dailyGoals.map((goal, gi) => (
                              <li key={gi} className="flex items-start gap-2 text-sm text-slate-300"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />{goal}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex items-start gap-2 rounded-xl border border-indigo-500/15 bg-indigo-500/5 p-3">
                          <Lightbulb className="h-4 w-4 mt-0.5 shrink-0 text-indigo-400" />
                          <p className="text-sm text-slate-300">{slot.studyTip}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── MAIN VIEW: Upload + Configure + Generate (single-column) ──
  return (
    <div className="mx-auto max-w-5xl space-y-8">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/20">
          <Brain className="h-7 w-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">Build Your Study Plan</h2>
        <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">Upload your syllabus, review extracted chapters, set your timeline, and let AI create a personalised study roadmap.</p>
      </motion.div>

      {/* How It Works */}
      {phase === "idle" && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STEP_ITEMS.map((step, i) => (
            <div key={step.title} className="relative flex flex-col items-center text-center rounded-2xl border border-slate-800 bg-slate-900/50 p-5 hover:border-violet-500/30 transition-all duration-300 group"
              style={{ backdropFilter: "blur(8px)" }}>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20 group-hover:ring-violet-500/40 transition-all">
                <step.icon className="h-5 w-5 text-violet-400" />
              </div>
              <p className="text-sm font-semibold text-white">{step.title}</p>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">{step.desc}</p>
              {i < 2 && <ChevronRight className="absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-700 hidden md:block" />}
            </div>
          ))}
        </motion.div>
      )}

      {/* Error banner */}
      {extractError && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4"
          style={{ backdropFilter: "blur(8px)" }}>
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-300">Heads up</p>
            <p className="text-sm text-amber-300/80 mt-0.5">{extractError}</p>
          </div>
        </motion.div>
      )}

      {/* Upload Zone */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 hover:border-slate-700 transition-colors"
        style={{ backdropFilter: "blur(8px)" }}>
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-200">
          <FileText className="h-4 w-4 text-violet-400" /> Upload Syllabus
        </h3>
        <AnimatePresence>
          {phase === "idle" && (
            <motion.div key="dropzone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file) processFile(file); }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-all duration-300 ${isDragging ? "border-violet-500 bg-violet-500/5 scale-[1.01]" : "border-slate-700 hover:border-violet-500/40 hover:bg-slate-800/30"}`}>
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.gif" className="hidden"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) processFile(file); e.target.value = ""; }} />
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 ring-1 ring-slate-700 group-hover:ring-violet-500/30">
                <Upload className="h-7 w-7 text-violet-400" />
              </div>
              <p className="text-base font-medium text-white">Drop your syllabus here</p>
              <p className="mt-1.5 text-sm text-slate-500">or click to browse from your device</p>
              <div className="mt-4 flex items-center gap-1.5">
                {["PDF", "JPG", "PNG", "WEBP"].map((ext) => (
                  <span key={ext} className="rounded-full border border-slate-700/50 bg-slate-800/80 px-2.5 py-0.5 text-[11px] font-medium text-slate-400">{ext}</span>
                ))}
              </div>
            </motion.div>
          )}

          {phase === "scanning" && (
            <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/5 px-6 py-12 text-center">
              <div className="relative mb-6 flex h-20 w-20 items-center justify-center">
                <motion.div className="absolute h-full w-full rounded-full border border-violet-500/40" animate={{ scale: [1, 1.6], opacity: [0.6, 0] }} transition={{ duration: 1.5, repeat: Infinity }} />
                <motion.div className="absolute h-full w-full rounded-full border border-violet-500/20" animate={{ scale: [1, 1.4], opacity: [0.4, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }} />
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/10"><Brain className="h-7 w-7 text-violet-400" /></div>
              </div>
              <p className="text-base font-semibold text-violet-300">AI is reading your file...</p>
              <p className="mt-2 text-sm text-slate-500">
                {ACCEPTED_IMAGE_TYPES.includes(uploadedFile?.type ?? "") ? "Analysing image with AI Vision" : "Extracting chapters from"}{" "}
                <span className="font-medium text-slate-300">{uploadedFile?.name}</span>
              </p>
              <div className="mt-4 h-1.5 w-48 overflow-hidden rounded-full bg-slate-800">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-500" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 12, ease: "easeInOut" }} />
              </div>
            </motion.div>
          )}

          {(phase === "extracted" || phase === "generating") && (
            <motion.div key="extracted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  {chapters.length > 0
                    ? <span>Extracted <strong>{chapters.length}</strong> chapters from <span className="font-medium text-slate-300">{uploadedFile?.name}</span></span>
                    : <span>No chapters found. Add them manually below.</span>}
                </div>
                <button onClick={resetAll} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors">
                  <X className="h-3.5 w-3.5" /> Replace
                </button>
              </div>

              {imagePreview && (
                <div className="mb-3 overflow-hidden rounded-xl border border-slate-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Uploaded syllabus" className="max-h-40 w-full object-contain bg-slate-900" />
                </div>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1 scrollbar-hide">
                {chapters.slice(0, visibleCount).map((ch, idx) => (
                  <motion.div key={ch.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }}
                    className={`group flex flex-col gap-2 rounded-xl border px-4 py-3 transition-all hover:scale-[1.005] ${ch.source === "ai" ? "border-slate-800 bg-slate-900/40" : "border-violet-500/30 bg-violet-500/5"}`}>
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-xs font-bold text-violet-400 ring-1 ring-violet-500/30">{idx + 1}</span>
                      <div className="flex-1 min-w-0"><p className="truncate text-sm font-medium text-slate-200">{ch.title}</p></div>
                      <div className="flex shrink-0 items-center gap-2">
                        {ch.source === "manual" && <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-xs text-violet-400">manual</span>}
                        <button onClick={() => removeChapter(ch.id)} className="opacity-0 group-hover:opacity-100 rounded-lg p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {ch.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pl-10">
                        {ch.topics.map((t, ti) => (<span key={ti} className="rounded-full bg-slate-800/80 px-2.5 py-0.5 text-[10px] text-slate-500">{t}</span>))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {phase === "extracted" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
                  <input type="text" placeholder="Add a chapter manually..." value={newChapterTitle} onChange={(e) => setNewChapterTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addChapter()}
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50" />
                  <button onClick={addChapter} disabled={!newChapterTitle.trim()}
                    className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition-colors border border-slate-700">
                    <Plus className="h-4 w-4" /> Add
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Plan Setup */}
      {(phase === "extracted" || phase === "generating") && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6"
          style={{ backdropFilter: "blur(8px)" }}>
          <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <CalendarDays className="h-4 w-4 text-violet-400" /> Configure Your Plan
          </h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-400"><Tag className="h-3.5 w-3.5 text-violet-400" /> Plan Name</label>
              <input type="text" placeholder='e.g. "Finals Prep — Physics"' value={planName} onChange={(e) => setPlanName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50" />
            </div>
            <div className="space-y-2">
              <label className="flex items-center justify-between text-xs font-medium text-slate-400">
                <span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-violet-400" /> Duration (days)</span>
                {recommendedDays > 0 && planDays === 0 && (
                  <button onClick={() => setPlanDays(recommendedDays)} className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors">
                    Suggested: {recommendedDays}d
                  </button>
                )}
              </label>
              <input type="number" min={1} max={365} placeholder={recommendedDays > 0 ? `Recommended: ${recommendedDays}` : "e.g. 30"} value={planDays === 0 ? "" : planDays}
                onChange={(e) => setPlanDays(Math.max(0, Math.min(365, Number(e.target.value) || 0)))}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50" />
            </div>
          </div>
        </motion.div>
      )}

      {/* Plan Preview (below, not sidebar) */}
      {(phase === "extracted" || phase === "generating") && chapters.length > 0 && planDays > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6"
          style={{ backdropFilter: "blur(8px)" }}>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-200"><Sparkles className="h-4 w-4 text-violet-400" /> Plan Preview</h3>
          {(() => {
            const n = chapters.length;
            const daysEach = planDays / n;
            const autoHours = Math.min(8, Math.max(1, Math.round((n / planDays) * 2 * 10) / 10));
            const targetDateObj = new Date(); targetDateObj.setDate(targetDateObj.getDate() + planDays);
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Chapters", value: `${n}`, accent: "text-slate-200" },
                  { label: "Days / Chapter", value: `${daysEach.toFixed(1)}d`, accent: tooTight ? "text-red-400" : "text-emerald-400" },
                  { label: "Daily Study", value: `~${autoHours}h`, accent: "text-violet-400" },
                  { label: "Deadline", value: targetDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" }), accent: "text-slate-200" },
                ].map(({ label, value, accent }) => (
                  <div key={label} className="rounded-xl border border-slate-800 bg-slate-800/30 p-3 text-center">
                    <p className="text-xs text-slate-500 mb-1">{label}</p>
                    <p className={`text-lg font-bold ${accent}`}>{value}</p>
                  </div>
                ))}
              </div>
            );
          })()}
          {tooTight && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/5 p-3">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
              <p className="text-xs text-red-300">{chapters.length} chapters need at least {chapters.length} days. Add more days or remove some chapters.</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Generate Button */}
      {(phase === "extracted" || phase === "generating") && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {phase === "extracted" && (!planName || planDays < 1) && chapters.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                <p className="text-xs text-amber-300">
                  Fill in the {!planName && planDays < 1 ? "plan name and number of days" : !planName ? "plan name" : "number of days"} to generate your plan.
                </p>
              </div>
            </div>
          )}

          <motion.button onClick={handleGenerate} disabled={!isReady || tooTight}
            animate={isReady && !tooTight ? { boxShadow: ["0 0 0px rgba(139,92,246,0.3)", "0 0 20px rgba(139,92,246,0.3)", "0 0 0px rgba(139,92,246,0.3)"] } : {}}
            transition={isReady && !tooTight ? { duration: 2, repeat: Infinity } : {}}
            className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 py-4 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:shadow-violet-500/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none">
            {phase === "generating" ? (
              <><Loader2 className="h-4 w-4 animate-spin" /><span>{generatingMsg}</span></>
            ) : (
              <><Brain className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" /> Generate My Plan <ChevronRight className="h-4 w-4" /></>
            )}
            {phase !== "generating" && (
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent group-hover:translate-x-full transition-transform duration-700" />
            )}
          </motion.button>

          <p className="text-center text-xs text-slate-600">Powered by AI &mdash; your plan is generated in seconds.</p>
        </motion.div>
      )}
    </div>
  );
}



// Module-level cache — survives unmount/remount across page navigations
let _plansCache: SavedPlan[] | null = null;
let _plansCacheUserId: string | null = null;

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PlannerPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState("Generate Plan");
  const [phase, setPhase] = useState<"planning" | "generated">("planning");
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  // Plans from Supabase — initialize from cache if available
  const isCacheHit = _plansCache !== null && _plansCacheUserId === user?.id;
  const [savedPlans, setSavedPlansRaw] = useState<SavedPlan[]>(isCacheHit ? _plansCache! : []);
  const [viewingPlan, setViewingPlan] = useState<SavedPlan | null>(null);
  const [expandedSlots, setExpandedSlots] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(!isCacheHit);

  // Wrap setSavedPlans to also update module-level cache
  const setSavedPlans = useCallback((val: SavedPlan[] | ((prev: SavedPlan[]) => SavedPlan[])) => {
    setSavedPlansRaw(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      _plansCache = next;
      _plansCacheUserId = user?.id ?? null;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // stable — never recreated

  // Track whether we've already fetched for this user so we don't re-fetch on every re-render
  const hasFetched = useRef(false);

  useEffect(() => {
    // If this is the same user and we already have cached plans, skip the fetch entirely
    if (!user?.id) { setLoading(false); return; }
    if (_plansCacheUserId === user.id && _plansCache !== null && hasFetched.current) {
      // Plans already in cache and state from initialization — nothing to do
      setLoading(false);
      return;
    }
    hasFetched.current = true;
    (async () => {
      try {
        // Fetch study_plans and plan_proofs in two separate queries to avoid 500 errors
        // from PostgREST join syntax when FK relationship isn't configured in Supabase schema cache
        const [plansResult, proofsResult] = await Promise.all([
          supabase
            .from("study_plans")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("plan_proofs")
            .select("id,plan_id,user_id,chapter_index,file_name,submitted_at")
            .eq("user_id", user.id),
        ]);

        if (!plansResult.error && plansResult.data) {
          // Group proofs by plan_id for fast merge
          const proofsByPlan: Record<string, any[]> = {};
          (proofsResult.data ?? []).forEach((p: any) => {
            if (!proofsByPlan[p.plan_id]) proofsByPlan[p.plan_id] = [];
            proofsByPlan[p.plan_id].push(p);
          });

          const mapped = plansResult.data.map((row: any) => ({
            id: row.id as string,
            name: row.name as string,
            createdAt: row.created_at as string,
            targetDate: row.target_date as string,
            dailyHours: row.daily_hours as number,
            intensity: (row.intensity as string) ?? "normal",
            plan: (row.plan_data as SavedPlan["plan"]) ?? { feasible: true, warning: null, totalDaysAvailable: 0, schedule: [], overallStrategy: "", motivationalNote: "" },
            proofs: (proofsByPlan[row.id] ?? []).map((p: any) => ({
              chapterIndex: p.chapter_index,
              proofUrl: p.file_url ?? "",  // may be empty from lightweight query; loaded on-demand
              proofId: p.id,
              fileName: p.file_name,
              uploadedAt: p.submitted_at,
            })),
          })) as SavedPlan[];
          setSavedPlans(mapped);
        }
      } catch (err) {
        console.warn("[planner] Failed to load plans:", err);
      }
      setLoading(false);
    })();
    // Only re-run when the user ID actually changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col" style={{ background: "var(--ax-surface-0)" }}>
      {/* ── Library-Style Header ── */}
      <div className="pt-5 px-4 sm:px-6 lg:px-8 w-full border-b pb-3" style={{ borderColor: "var(--ax-border)", background: "var(--ax-surface-0)" }}>
        <div className="mb-4 text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-lg shadow-violet-500/20">
              <CalendarDays className="h-4 w-4 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-bold tracking-tight text-white">
                Academic Planner
              </h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--ax-text-secondary)" }}>
                AI-powered study schedules, progress tracking, and milestones.
              </p>
            </div>
          </div>
        </div>

        {/* ── Sub-Module Navigation ── */}
        <nav className="flex w-full overflow-x-auto scrollbar-hide border-b" style={{ borderColor: "var(--ax-border)" }} aria-label="Planner navigation">
          {SUB_NAV.map(({ label, icon: Icon, desc }) => {
            const isActive = activeTab === label;
            return (
              <button
                key={label}
                suppressHydrationWarning
                onClick={() => setActiveTab(label)}
                className={`relative flex shrink-0 items-center justify-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 ${isActive ? "" : "hover:bg-[var(--ax-surface-3)]"}`}
                style={{ color: isActive ? "var(--ax-text-primary)" : "var(--ax-text-muted)" }}
              >
                {isActive && (
                  <motion.span
                    layoutId="planner-tab-pill"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-t-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className={`relative z-10 h-4 w-4 ${isActive ? "text-violet-400" : ""}`} style={isActive ? {} : { color: "var(--ax-text-faint)" }} />
                <span className="relative z-10">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Page Body ── */}
      <div className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Always mount all tabs — use CSS to hide/show. This prevents mount/unmount flicker. */}
        <div className={activeTab === "Generate Plan" ? "block" : "hidden"}>
          <AiRoadmapCard
            onPlanGenerated={(newPlan) => {
              setSavedPlans((prev) => [newPlan, ...prev]);
            }}
          />
        </div>

        <div className={activeTab === "My Plans" ? "block" : "hidden"}>
          <PlansTab savedPlans={savedPlans} setSavedPlans={setSavedPlans} setActiveTab={setActiveTab} loading={loading} />
        </div>

        <div className={activeTab === "Progress" ? "block" : "hidden"}>
          <ProgressTab savedPlans={savedPlans} />
        </div>

        <div className={activeTab === "Milestones & Achievements" ? "block" : "hidden"}>
          <MilestonesTab savedPlans={savedPlans} userId={user?.id ?? null} />
        </div>
      </div>
    </div>
  );
}

// --- helpers shared by tab components ----------------------------------------

function fmtDateShort(d: string | undefined | null) {
  if (!d) return "�";
  try {
    // date-only strings (YYYY-MM-DD) need local-time suffix to avoid UTC shift
    const date = d.length === 10 ? new Date(d + "T00:00:00") : new Date(d);
    if (isNaN(date.getTime())) return "�";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return "�"; }
}

// Locale-independent short-date formatter to avoid SSR/client hydration mismatch.
// toLocaleDateString() returns different formats on Node.js (server) vs Chrome browser.
const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtChartDate(dateStr: string, type: "weekday" | "monthday" = "weekday"): string {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  if (type === "weekday") return WEEKDAY_NAMES[d.getDay()];
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

// --- ProgressTab -------------------------------------------------------------
function ProgressTab({ savedPlans }: { savedPlans: SavedPlan[] }) {
  const plans = React.useMemo(() => savedPlans.map(sp => ({
    id: sp.id, name: sp.name, createdAt: sp.createdAt,
    targetDate: sp.targetDate, dailyHours: sp.dailyHours,
    intensity: sp.intensity ?? "normal",
    plan: sp.plan, proofs: sp.proofs ?? [],
  })) as StoredPlan[], [savedPlans]);
  const [earnedXP, setEarnedXP] = React.useState(0);

  React.useEffect(() => {
    try {
      const computed = computeMilestoneStates(plans);
      const xp = computed.filter(m => m.achieved).reduce((sum, m) => {
        const def = ALL_MILESTONES.find(x => x.id === m.id);
        return sum + (def?.xp ?? 0);
      }, 0);
      setEarnedXP(xp);
    } catch { /* ignore */ }
  }, [plans]);

  const totalChapters = plans.reduce((s, p) => s + p.plan.schedule.length, 0);
  const submittedProofs = plans.reduce((s, p) => s + (p.proofs?.length ?? 0), 0);
  const completionPct = totalChapters > 0 ? Math.round((submittedProofs / totalChapters) * 100) : 0;

  // Collect all submission dates (in local timezone)
  const allDates: string[] = plans.flatMap(p =>
    (p.proofs ?? []).flatMap(pr => {
      const rawTs = pr.uploadedAt ?? pr.submittedAt ?? "";
      if (!rawTs) return [];
      const parsed = new Date(rawTs);
      if (isNaN(parsed.getTime())) return [];
      return [new Date(parsed.getTime() - (parsed.getTimezoneOffset() * 60000)).toISOString().split("T")[0]];
    })
  ).sort();

  // Streak calculation
  function calcStreak(dates: string[]) {
    const unique = [...new Set(dates)].sort().reverse();
    let streak = 0;
    // use local timezone today string instead of matching UTC
    const localToday = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split("T")[0];

    // Allow the streak to stay alive if today or yesterday has a submission
    let expectedDate = new Date(localToday + "T00:00:00");
    if (unique.length > 0 && unique[0] !== localToday && unique[0] === new Date(expectedDate.getTime() - 86400000).toISOString().split("T")[0]) {
      expectedDate = new Date(unique[0] + "T00:00:00");
    }

    for (const dateStr of unique) {
      const cur = new Date(dateStr + "T00:00:00");
      const diff = Math.round((expectedDate.getTime() - cur.getTime()) / 86400000);
      if (diff === 0 || diff === streak) { streak++; expectedDate = cur; }
      else break;
    }
    return streak;
  }

  function calcLongestStreak(dates: string[]) {
    const unique = [...new Set(dates)].sort();
    let max = 0, cur = 0, prev = "";
    for (const d of unique) {
      if (prev) {
        const diff = Math.round((new Date(d).getTime() - new Date(prev).getTime()) / 86400000);
        cur = diff === 1 ? cur + 1 : 1;
      } else { cur = 1; }
      max = Math.max(max, cur);
      prev = d;
    }
    return max;
  }
  const currentStreak = calcStreak(allDates);
  const longestStreak = calcLongestStreak(allDates);

  // Consistency (active days in last 30 days)
  const today = new Date();
  const getLocalDateStr = (d: Date) => new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split("T")[0];
  const localTodayStr = getLocalDateStr(today);

  const last30Dates = new Set(Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - i);
    return getLocalDateStr(d);
  }));
  const activeDays = new Set(allDates.filter(d => last30Dates.has(d))).size;
  const consistencyScore = Math.round((activeDays / 30) * 100);

  // Weekly activity (last 7 days)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (6 - i));
    return getLocalDateStr(d);
  });
  const submissionsByDay: Record<string, number> = {};
  plans.forEach(p => {
    (p.proofs ?? []).forEach(proof => {
      const rawTs = proof.uploadedAt ?? proof.submittedAt ?? "";
      if (!rawTs) return;
      // Parse as Date and convert to local day string to match weekDays / heatmapDays keys
      const parsed = new Date(rawTs);
      if (!isNaN(parsed.getTime())) {
        const day = getLocalDateStr(parsed);
        submissionsByDay[day] = (submissionsByDay[day] ?? 0) + 1;
      }
    });
  });
  const weekData = weekDays.map(d => ({ date: d, count: submissionsByDay[d] ?? 0 }));
  const maxCount = Math.max(...weekData.map(d => d.count), 1);

  // Heatmap generation (last 14 days)
  const heatmapDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (13 - i));
    return getLocalDateStr(d);
  });

  // Intensity Distribution
  const intensityData = {
    light: plans.filter(p => p.intensity === "light").length,
    normal: plans.filter(p => !p.intensity || p.intensity === "normal").length,
    aggressive: plans.filter(p => p.intensity === "aggressive").length,
  };
  const totalIntensity = plans.length || 1; // avoid division by zero

  // On-time count
  let ontimeCount = 0;
  plans.forEach(p => {
    p.plan.schedule.forEach(slot => {
      const proof = (p.proofs ?? []).find(pr => pr.chapterIndex === slot.chapterIndex);
      if (proof && (proof.uploadedAt ?? "").slice(0, 10) <= slot.endDate) ontimeCount++;
    });
  });

  const stats = [
    { label: "Chapters Done", value: `${submittedProofs}/${totalChapters}`, sub: "proof submitted", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    { label: "Completion", value: `${completionPct}%`, sub: "of all chapters", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    { label: "XP Earned", value: String(earnedXP), sub: "from achievements", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    { label: "Current Streak", value: `${currentStreak}d`, sub: currentStreak > 0 ? "keep it up!" : "submit today!", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
    { label: "Best Streak", value: `${longestStreak}d`, sub: "consecutive days", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
    { label: "Consistency", value: `${consistencyScore}%`, sub: "active last 30 days", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
  ];

  return (
    <div className="space-y-8">
      {/* ── Progress Header ── */}
      <div>
        <h2 className="text-xl font-bold text-white">Your Study Progress</h2>
        <p className="text-sm mt-1 text-slate-400">Analytics and telemetry from your recent study sessions.</p>
      </div>

      {/* ── Key Metrics Grid ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(({ label, value, sub, color, bg }) => (
          <div key={label} className={`relative overflow-hidden rounded-3xl border p-5 ${bg} transition-transform hover:-translate-y-1`}>
            {/* Subtle glow effect */}
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/5 blur-2xl" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
            <p className={`text-3xl font-black ${color}`}>{value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left Column: Activity & Engagement ── */}
        <div className="space-y-6 lg:col-span-2">

          {/* Weekly activity Bar Chart */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-sm font-bold tracking-wide text-slate-200 uppercase flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-indigo-400" /> Weekly Activity Volume
                </h3>
                <p className="text-xs text-slate-500 mt-1">Proof submissions over the last 7 days</p>
              </div>
              <div className="rounded-lg bg-indigo-500/10 px-3 py-1.5 border border-indigo-500/20">
                <span className="text-xs font-bold text-indigo-400">Total: {weekData.reduce((s, d) => s + d.count, 0)}</span>
              </div>
            </div>

            <div className="flex items-end gap-3 h-32 px-2">
              {weekData.map(({ date, count }) => {
                const heightPct = Math.round((count / maxCount) * 100);
                const dayName = fmtChartDate(date, "weekday");
                const isToday = date === localTodayStr;
                return (
                  <div key={date} className="group flex flex-1 flex-col items-center gap-2 relative">
                    {/* Tooltip */}
                    <div className="pointer-events-none absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                      {count} submission{count !== 1 ? "s" : ""}
                    </div>

                    <div className="relative w-full flex flex-col justify-end items-center h-full rounded-t-xl bg-slate-800/30 overflow-hidden ring-1 ring-inset ring-slate-800/50">
                      <motion.div
                        className={`w-full rounded-t-xl transition-colors ${count > 0 ? "bg-gradient-to-t from-indigo-500 via-blue-500 to-cyan-400 shadow-[0_0_15px_rgba(99,102,241,0.5)]" : "bg-transparent"} ${isToday && count === 0 ? "border-t-2 border-dashed border-slate-600 bg-slate-800/20" : ""}`}
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(heightPct, count > 0 ? 15 : 2)}%` }}
                        transition={{ duration: 0.7, delay: 0.1, type: "spring", stiffness: 100, damping: 15 }}
                      />
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider ${isToday ? "font-black text-blue-400" : "font-semibold text-slate-500"}`}>{dayName}</span>
                  </div>
                );
              })}
            </div>
            {weekData.every(d => d.count === 0) && (
              <p className="text-center text-xs font-medium text-slate-500 mt-6 bg-slate-800/20 py-3 rounded-xl border border-dashed border-slate-700">
                No submissions this week. Upload chapter proofs to populate your activity chart!
              </p>
            )}
          </div>

          {/* Activity Heatmap Grid */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg shadow-black/20">
            <h3 className="text-sm font-bold tracking-wide text-slate-200 uppercase flex items-center gap-2 mb-1">
              <CalendarDays className="h-4 w-4 text-emerald-400" /> 14-Day Activity Heatmap
            </h3>
            <p className="text-xs text-slate-500 mb-6">Intensity of your submissions over the last two weeks</p>

            <div className="flex flex-wrap gap-2">
              {heatmapDays.map((date) => {
                const count = submissionsByDay[date] || 0;
                const isToday = date === localTodayStr;

                // Determine color intensity
                let heatColor = "bg-slate-800/50 ring-1 ring-slate-700/50"; // 0
                if (count > 0 && count <= 2) heatColor = "bg-emerald-900/40 ring-1 ring-emerald-800/50 shadow-[0_0_10px_rgba(16,185,129,0.1)]"; // Low
                if (count > 2 && count <= 5) heatColor = "bg-emerald-600/60 ring-1 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]"; // Mid
                if (count > 5) heatColor = "bg-emerald-400 ring-1 ring-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.4)]"; // High

                return (
                  <div key={date} className="relative group">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 ${heatColor} ${isToday ? "ring-2 ring-white/50" : ""}`}>
                      {count > 0 ? (
                        <span className={`text-xs font-bold ${count > 5 ? "text-emerald-950" : "text-emerald-100"}`}>{count}</span>
                      ) : (
                        <span className="text-[10px] text-slate-600 font-medium">{new Date(date + "T00:00:00").getDate()}</span>
                      )}
                    </div>
                    {/* Tooltip */}
                    <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 border border-slate-700 text-white text-[10px] font-bold px-2 py-1 rounded shadow-xl whitespace-nowrap z-10 flex flex-col items-center">
                      <span>{count} proofs</span>
                      <span className="text-[8px] text-slate-400 font-normal">{fmtChartDate(date, "monthday")}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 mt-4 justify-end text-[10px] font-medium text-slate-500 uppercase tracking-wider">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-sm bg-slate-800/50 border border-slate-700/50"></div>
                <div className="w-3 h-3 rounded-sm bg-emerald-900/40 border border-emerald-800/50"></div>
                <div className="w-3 h-3 rounded-sm bg-emerald-600/60 border border-emerald-500/50"></div>
                <div className="w-3 h-3 rounded-sm bg-emerald-400 border border-emerald-300"></div>
              </div>
              <span>More</span>
            </div>
          </div>
        </div>

        {/* ── Right Column: Breakdowns ── */}
        <div className="space-y-6">

          {/* Plan Breakdown */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col max-h-[400px]">
            <h3 className="text-sm font-bold tracking-wide text-slate-200 uppercase mb-4 sticky top-0 bg-slate-900/40 pb-2 backdrop-blur-sm z-10">Plan Completion</h3>

            <div className="overflow-y-auto pr-2 pb-2 space-y-4 flex-1 scrollbar-thin scrollbar-thumb-slate-700">
              {plans.length > 0 ? plans.map(p => {
                const total = p.plan.schedule?.length || 0;
                const done = (p.proofs?.length ?? 0);
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                const daysLeft = Math.max(0, Math.round((new Date(p.targetDate).getTime() - Date.now()) / 86400000));

                return (
                  <div key={p.id} className="group relative rounded-2xl border border-slate-800 bg-slate-950/50 p-4 transition-colors hover:border-indigo-500/30 hover:bg-slate-900/80">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-200 text-sm truncate">{p.name}</p>
                        <p className="text-[10px] font-medium text-slate-500 mt-1 uppercase tracking-wide">
                          {done} of {total} CH &middot; {daysLeft > 0 ? <span className="text-amber-400/80">{daysLeft} days left</span> : <span className="text-red-400/80">Deadline passed</span>}
                        </p>
                      </div>
                      <span className={`shrink-0 text-lg font-black ${pct === 100 ? "text-emerald-400" : pct > 50 ? "text-indigo-400" : "text-slate-400"}`}>{pct}%</span>
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80 flex">
                      <motion.div
                        className={`h-full rounded-full ${pct === 100 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                );
              }) : (
                <div className="flex flex-col items-center justify-center p-8 text-center h-full border border-dashed border-slate-700 rounded-2xl">
                  <BarChart2 className="h-8 w-8 text-slate-600 mb-3" />
                  <p className="text-sm font-semibold text-slate-400">No active plans</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-[200px]">Generate a plan to see detailed breakdowns.</p>
                </div>
              )}
            </div>
          </div>

          {/* Intensity Distribution */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg shadow-black/20">
            <h3 className="text-sm font-bold tracking-wide text-slate-200 uppercase flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-amber-400" /> Plan Intensity
            </h3>
            <p className="text-xs text-slate-500 mb-6">Distribution of your study pacing</p>

            {plans.length > 0 ? (
              <div className="space-y-4">
                {[
                  { key: "light", label: "Light Pace", count: intensityData.light, color: "bg-emerald-500", text: "text-emerald-400" },
                  { key: "normal", label: "Normal Pace", count: intensityData.normal, color: "bg-blue-500", text: "text-blue-400" },
                  { key: "aggressive", label: "Aggressive Pace", count: intensityData.aggressive, color: "bg-orange-500", text: "text-orange-400" }
                ].map((item) => {
                  const pct = Math.round((item.count / totalIntensity) * 100);
                  return (
                    <div key={item.key} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-300">{item.label}</span>
                        <div className="flex justify-end gap-2 text-slate-500 font-medium">
                          <span>{item.count}</span>
                          <span className={`${item.text} w-8 text-right`}>{pct}%</span>
                        </div>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                        <motion.div
                          className={`h-full rounded-full ${item.color}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center h-[120px] border border-dashed border-slate-700 rounded-2xl">
                <p className="text-xs text-slate-500 max-w-[200px]">Generate plans to see your intensity distribution.</p>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}

import {
  type StoredPlan,
  type StoredPlanChapter,
  type StoredPlanSlot,
  type MilestoneDefinition,
  type MilestoneState,
  ALL_MILESTONES,
  computeMilestoneStates,
  PLANNER_RANKS,
  getPlannerRank,
  getNextPlannerRank,
} from "@/lib/planner";

const TIER_STYLES = {
  bronze: {
    ring: "ring-2 ring-amber-500/40",
    bg: "bg-gradient-to-br from-amber-900/20 to-orange-900/20",
    icon: "text-amber-400",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    label: "Bronze",
    glow: "",
    dot: "bg-amber-500",
  },
  silver: {
    ring: "ring-2 ring-slate-500/40",
    bg: "bg-gradient-to-br from-slate-800 to-slate-700/50",
    icon: "text-slate-300",
    badge: "bg-slate-700/50 text-slate-300 border-slate-600",
    label: "Silver",
    glow: "",
    dot: "bg-slate-400",
  },
  gold: {
    ring: "ring-2 ring-yellow-500/50",
    bg: "bg-gradient-to-br from-yellow-900/20 to-amber-900/20",
    icon: "text-yellow-400",
    badge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    label: "Gold",
    glow: "shadow-yellow-500/20",
    dot: "bg-yellow-400",
  },
  platinum: {
    ring: "ring-2 ring-indigo-500/50",
    bg: "bg-gradient-to-br from-indigo-900/20 to-violet-900/20",
    icon: "text-indigo-400",
    badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    label: "Platinum",
    glow: "shadow-indigo-500/20",
    dot: "bg-indigo-400",
  },
  diamond: {
    ring: "ring-2 ring-cyan-500/60",
    bg: "bg-gradient-to-br from-cyan-900/20 to-sky-900/20",
    icon: "text-cyan-400",
    badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    label: "Diamond",
    glow: "shadow-cyan-500/20",
    dot: "bg-cyan-400",
  },
  heroic: {
    ring: "ring-2 ring-violet-500/60",
    bg: "bg-gradient-to-br from-violet-900/20 to-purple-900/20",
    icon: "text-violet-400",
    badge: "bg-violet-500/10 text-violet-400 border-violet-500/30",
    label: "Heroic",
    glow: "shadow-violet-500/20",
    dot: "bg-violet-500",
  },
  legendary: {
    ring: "ring-2 ring-rose-500/60",
    bg: "bg-gradient-to-br from-rose-900/20 to-amber-900/20",
    icon: "text-rose-400",
    badge: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    label: "Legendary",
    glow: "shadow-rose-500/20",
    dot: "bg-gradient-to-r from-rose-500 to-amber-400",
  },
} as const;

const CATEGORY_META = {
  progress: { label: "The Completionist Path", color: "text-blue-400", bg: "bg-blue-900/10", border: "border-blue-500/20", desc: "Awarded based on overall chapter completion across all plans" },
  streak: { label: "The Consistency Path", color: "text-orange-400", bg: "bg-orange-900/10", border: "border-orange-500/20", desc: "Awarded for consecutive days of unbroken study activity" },
  goals: { label: "The Execution Path", color: "text-emerald-400", bg: "bg-emerald-900/10", border: "border-emerald-500/20", desc: "Awarded for total volume of chapter proofs submitted" },
  mastery: { label: "The Speedster Path", color: "text-purple-400", bg: "bg-purple-900/10", border: "border-purple-500/20", desc: "Awarded for strict on-time submissions and rapid completion rates" },
};

// Icon renderer for milestones & ranks
function MilestoneIcon({ name, className }: { name: string; className?: string }) {
  const cls = className ?? "h-5 w-5";
  if (name === "BookOpen") return <BookOpen className={cls} />;
  if (name === "Target") return <Target className={cls} />;
  if (name === "Trophy") return <Trophy className={cls} />;
  if (name === "Flame") return <Flame className={cls} />;
  if (name === "Zap") return <Zap className={cls} />;
  if (name === "CheckCheck") return <CheckCheck className={cls} />;
  if (name === "ListChecks") return <ListChecks className={cls} />;
  if (name === "Brain") return <Brain className={cls} />;
  if (name === "CalendarDays") return <CalendarDays className={cls} />;
  if (name === "BarChart2") return <BarChart2 className={cls} />;
  if (name === "Shield") return <Shield className={cls} />;
  if (name === "Swords") return <Swords className={cls} />;
  if (name === "Medal") return <Medal className={cls} />;
  if (name === "Gem") return <Gem className={cls} />;
  if (name === "Crown") return <Crown className={cls} />;
  if (name === "Circle") return <Circle className={cls} />;
  if (name === "Sparkles") return <Sparkles className={cls} />;
  return <Sparkles className={cls} />;
}

// --- MilestonesTab -----------------------------------------------------------
function MilestonesTab({ savedPlans, userId }: { savedPlans: SavedPlan[]; userId: string | null }) {
  const plans = React.useMemo(() => savedPlans.map(sp => ({
    id: sp.id, name: sp.name, createdAt: sp.createdAt,
    targetDate: sp.targetDate, dailyHours: sp.dailyHours,
    intensity: sp.intensity ?? "normal",
    plan: sp.plan, proofs: sp.proofs ?? [],
  })) as StoredPlan[], [savedPlans]);
  const [states, setStates] = React.useState<MilestoneState[]>([]);
  const [selectedTitle, setSelectedTitle] = React.useState<string | null>(null);
  const [titleToast, setTitleToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const computed = computeMilestoneStates(plans);
      setStates(computed);
    } catch { /* ignore */ }
  }, [plans]);

  // Load selected title from Supabase
  React.useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("user_profiles")
          .select("selected_title")
          .eq("id", userId)
          .single();
        if (data?.selected_title) setSelectedTitle(data.selected_title);
      } catch { /* ignore */ }
    })();
  }, [userId]);

  // Save selected title to Supabase
  async function equipTitle(title: string) {
    setSelectedTitle(title);
    setTitleToast(`Equipped: ${title}`);
    setTimeout(() => setTitleToast(null), 2500);
    if (!userId) return;
    try {
      await supabase
        .from("user_profiles")
        .upsert({ id: userId, selected_title: title, updated_at: new Date().toISOString() });
    } catch (err) {
      console.warn("[planner] Failed to save title:", err);
    }
  }

  const stateMap = new Map(states.map(s => [s.id, s]));
  const totalXP = ALL_MILESTONES.reduce((sum, m) => {
    const s = stateMap.get(m.id);
    return sum + (s?.achieved ? m.xp : 0);
  }, 0);
  const achievedCount = states.filter(s => s.achieved).length;
  const totalCount = ALL_MILESTONES.length;

  // Level system: every 100 XP = 1 level
  const level = Math.floor(totalXP / 100) + 1;
  const xpIntoLevel = totalXP % 100;
  const maxXP = ALL_MILESTONES.reduce((s, m) => s + m.xp, 0);

  const allSubmissions: string[] = plans.flatMap(p =>
    (p.proofs ?? [])
      .map(proof => (proof.uploadedAt ?? proof.submittedAt ?? "").slice(0, 10))
      .filter(Boolean)
  ).sort();

  const maxStreak = React.useMemo(() => {
    const unique = [...new Set(allSubmissions)].sort();
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
  }, [allSubmissions]);

  const tierOrder = ["bronze", "silver", "gold", "platinum", "diamond", "heroic", "legendary"] as const;
  const tierCounts = tierOrder.map(t => ({
    tier: t,
    count: states.filter(s => s.achieved && ALL_MILESTONES.find(m => m.id === s.id)?.tier === t).length,
    total: ALL_MILESTONES.filter(m => m.tier === t).length,
  }));

  // Planner title system
  const PLANNER_TITLES = [
    // Completionist Path
    { id: "prog_legendary", name: "Completionist Grandmaster", rarity: "Mythic", pill: "bg-gradient-to-r from-rose-500/20 to-orange-500/20 border border-rose-500/50 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]", head: "bg-clip-text text-transparent bg-gradient-to-r from-rose-400 to-orange-400 font-black tracking-widest", icon: "Crown" },
    { id: "prog_heroic", name: "Academic Titan", rarity: "Legendary", pill: "bg-violet-500/20 border border-violet-500/40 text-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.3)]", head: "text-violet-400 font-extrabold", icon: "Swords" },
    { id: "prog_diamond", name: "Full Scholar", rarity: "Epic", pill: "bg-cyan-500/15 border border-cyan-500/30 text-cyan-300", head: "text-cyan-400 font-bold", icon: "Gem" },
    { id: "prog_platinum", name: "The Finisher", rarity: "Rare", pill: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400", head: "text-emerald-400 font-semibold", icon: "ShieldCheck" },
    { id: "prog_gold", name: "Steadfast", rarity: "Uncommon", pill: "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20", head: "text-yellow-500", icon: "Medal" },

    // Consistency Path
    { id: "streak_legendary", name: "Eternal Grind", rarity: "Mythic", pill: "bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]", head: "bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-rose-400 font-black tracking-widest", icon: "Flame" },
    { id: "streak_diamond", name: "Unbreakable", rarity: "Epic", pill: "bg-cyan-500/15 border border-cyan-500/30 text-cyan-300", head: "text-cyan-400 font-bold", icon: "Shield" },
    { id: "streak_platinum", name: "Iron Discipline", rarity: "Rare", pill: "bg-indigo-500/15 border border-indigo-500/30 text-indigo-300", head: "text-indigo-400 font-semibold", icon: "Dumbbell" },
    { id: "streak_gold", name: "Relentless", rarity: "Uncommon", pill: "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20", head: "text-yellow-500", icon: "Zap" },
    { id: "streak_silver", name: "Week Warrior", rarity: "Common", pill: "bg-slate-500/10 text-slate-400 border border-slate-500/20", head: "text-slate-400", icon: "Calendar" },

    // Speedster Path
    { id: "ontime_legendary", name: "Temporal Grandmaster", rarity: "Mythic", pill: "bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20 border border-fuchsia-500/50 text-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.4)]", head: "bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-purple-400 font-black tracking-widest", icon: "Hourglass" },
    { id: "ontime_heroic", name: "Deadline Assassin", rarity: "Legendary", pill: "bg-violet-500/20 border border-violet-500/40 text-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.3)]", head: "text-violet-400 font-extrabold", icon: "Crosshair" },
    { id: "ontime_diamond", name: "Clockwork Scholar", rarity: "Epic", pill: "bg-cyan-500/15 border border-cyan-500/30 text-cyan-300", head: "text-cyan-400 font-bold", icon: "Clock" },
    { id: "ontime_platinum", name: "Flawless Execution", rarity: "Rare", pill: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400", head: "text-emerald-400 font-semibold", icon: "CheckCircle" },
    { id: "weekly_silver", name: "Speed Demon", rarity: "Common", pill: "bg-slate-500/10 text-slate-400 border border-slate-500/20", head: "text-slate-400", icon: "Zap" },
  ];
  const currentTitle = PLANNER_TITLES.find(t => t.name === selectedTitle && stateMap.get(t.id)?.achieved)
    ?? PLANNER_TITLES.find(t => stateMap.get(t.id)?.achieved)
    ?? null;

  const categories = (["progress", "streak", "goals", "mastery"] as const);

  const currentRank = getPlannerRank(totalXP);
  const nextRank = getNextPlannerRank(totalXP);
  const rankProgress = nextRank ? Math.min(((totalXP - currentRank.threshold) / (nextRank.threshold - currentRank.threshold)) * 100, 100) : 100;
  const rankShowcaseRef = React.useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-6">
      {/* ── Toast notification ── */}
      <AnimatePresence>
        {titleToast && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-2xl border border-emerald-500/40 bg-emerald-950/90 backdrop-blur-xl px-5 py-3 text-sm font-bold text-emerald-300 shadow-2xl shadow-emerald-500/20"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            {titleToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Compact Hero Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900 p-5 shadow-lg"
      >
        {/* Animated gradient accent */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-violet-500/50 via-fuchsia-500/50 to-amber-400/50" />
        <div className="absolute -top-32 -right-32 w-60 h-60 rounded-full bg-indigo-500/5 blur-[80px] pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-center gap-5">
          {/* Compact Level Ring */}
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(99,102,241,0.1)" strokeWidth="8" />
              <motion.circle
                cx="60" cy="60" r="52" fill="none"
                stroke="url(#levelGrad)" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 52}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - xpIntoLevel / 100) }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="levelGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>
              </defs>
            </svg>
            <div className="text-center z-10">
              <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-[0.15em]">Level</p>
              <p className="text-3xl font-black text-white leading-none">{level}</p>
              <p className="text-[9px] font-semibold text-indigo-400 mt-0.5">{xpIntoLevel}/100</p>
            </div>
          </div>

          <div className="flex-1 text-center md:text-left min-w-0">
            <div className="flex items-center gap-2 justify-center md:justify-start flex-wrap">
              <h2 className={`text-xl md:text-2xl font-black tracking-tight ${currentTitle ? currentTitle.head : "text-slate-100"}`}>
                {currentTitle ? currentTitle.name : "Study Newcomer"}
              </h2>
              {currentTitle && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[9px] font-bold text-indigo-300 uppercase"
                >
                  <Trophy className="h-2.5 w-2.5" /> Equipped
                </motion.span>
              )}
            </div>

            {/* Rank Badge — clickable to scroll to showcase */}
            <button
              onClick={() => rankShowcaseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className={`mt-1.5 inline-flex items-center gap-2 rounded-full border ${currentRank.borderColor} bg-gradient-to-r ${currentRank.bgColor} px-3 py-1 text-xs font-bold ${currentRank.color} hover:opacity-90 transition-all cursor-pointer ${currentRank.glow}`}
              title="Click to see all ranks"
            >
              <MilestoneIcon name={currentRank.icon} className={`h-3.5 w-3.5 ${currentRank.color}`} />
              {currentRank.name}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            <p className="mt-1.5 text-xs text-slate-400">
              <span className="text-slate-200 font-bold">{achievedCount}</span>/{totalCount} milestones
              &nbsp;·&nbsp; <span className="text-indigo-400 font-bold">{totalXP}</span>/<span className="text-slate-500">{maxXP}</span> XP
            </p>

            {/* Compact Stats Row */}
            <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
              {([
                { label: "Unlocked", value: achievedCount, icon: Trophy, color: "text-violet-300", bg: "bg-slate-800/50", border: "border-slate-700/50" },
                { label: "Streak", value: `${maxStreak}d`, icon: Flame, color: "text-amber-300", bg: "bg-slate-800/50", border: "border-slate-700/50" },
                { label: "XP", value: totalXP, icon: Zap, color: "text-emerald-300", bg: "bg-slate-800/50", border: "border-slate-700/50" },
              ] as const).map((stat) => (
                <div key={stat.label} className={`flex items-center gap-2 rounded-xl border ${stat.border} ${stat.bg} px-3 py-2`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <div>
                    <p className="text-sm font-black text-white leading-none">{stat.value}</p>
                    <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Rank Showcase ── */}
      <div ref={rankShowcaseRef} className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600/20 to-indigo-600/20 ring-1 ring-violet-500/30">
              <Shield className="h-4 w-4 text-violet-400" />
            </div>
            Planner Ranks
          </h3>
          <span className="text-xs text-slate-500 font-medium">Earn XP from milestones to rank up</span>
        </div>

        {/* Rank progress bar */}
        {nextRank && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className={`font-bold ${currentRank.color}`}>{currentRank.name}</span>
              <span className="text-slate-500">{totalXP} / {nextRank.threshold} XP</span>
              <span className={`font-bold ${nextRank.color}`}>{nextRank.name}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400"
                initial={{ width: 0 }}
                animate={{ width: `${rankProgress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1 text-center">
              {nextRank.threshold - totalXP} XP to {nextRank.name}
            </p>
          </div>
        )}
        {!nextRank && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-3 text-center">
            <p className="text-xs font-bold text-amber-300">🏆 Max Rank Achieved — Legendary Sage</p>
          </div>
        )}

        {/* All ranks grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {PLANNER_RANKS.map((rank, idx) => {
            const isCurrentRank = rank.name === currentRank.name;
            const isLocked = totalXP < rank.threshold;
            return (
              <motion.div
                key={rank.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`relative flex flex-col items-center rounded-xl border p-3 text-center transition-all duration-300 ${isCurrentRank
                  ? `border-slate-600 bg-slate-800 ring-1 ring-slate-500 shadow-md ${rank.glow}`
                  : isLocked
                    ? "border-slate-800/50 bg-slate-900/30 opacity-40"
                    : "border-slate-700 bg-slate-800/80 opacity-80"
                  }`}
              >
                {isCurrentRank && (
                  <div className="absolute -top-2 bg-slate-700 border border-slate-600 text-slate-200 text-[8px] uppercase tracking-[0.1em] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    Current
                  </div>
                )}
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg mb-1.5 ${isCurrentRank ? `bg-slate-700` : isLocked ? "bg-slate-800/60" : `bg-slate-900/50`
                  }`}>
                  <MilestoneIcon name={rank.icon} className={`h-4.5 w-4.5 ${isLocked ? "text-slate-600" : rank.color}`} />
                </div>
                <p className={`text-[11px] font-bold leading-tight ${isLocked ? "text-slate-500" : "text-slate-200"}`}>
                  {rank.name}
                </p>
                <p className="text-[9px] text-slate-400 mt-0.5">{rank.threshold} XP</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Equippable Titles ── */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
              <Trophy className="h-4 w-4 text-amber-400" />
            </div>
            Title Collection
          </h3>
          <span className="text-xs text-slate-500 font-medium">Click to equip · Shown on profile</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {PLANNER_TITLES.map((titleDef) => {
            const milestone = ALL_MILESTONES.find(m => m.id === titleDef.id);
            const achieved = stateMap.get(titleDef.id)?.achieved;
            const isEquipped = currentTitle?.id === titleDef.id;

            return (
              <motion.button
                key={titleDef.id}
                whileHover={achieved ? { scale: 1.04, y: -2 } : {}}
                whileTap={achieved ? { scale: 0.97 } : {}}
                onClick={() => achieved && equipTitle(titleDef.name)}
                disabled={!achieved}
                className={`relative flex flex-col items-center justify-center p-5 rounded-2xl border transition-all duration-300 text-center group ${achieved
                  ? `bg-slate-900 shadow-lg cursor-pointer hover:shadow-2xl ${isEquipped ? `ring-2 ring-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.25)] border-[rgba(99,102,241,0.5)] ${titleDef.pill}` : `${titleDef.pill} hover:border-indigo-500/50 hover:shadow-indigo-500/20`}`
                  : 'bg-slate-900/30 border-slate-800/40 opacity-40 cursor-not-allowed'
                  }`}
              >
                {isEquipped && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[8px] uppercase tracking-[0.15em] font-black px-2.5 py-0.5 rounded-full z-10 shadow-lg shadow-indigo-500/30"
                  >
                    ★ Equipped
                  </motion.div>
                )}

                {achieved && "rarity" in titleDef && (
                  <div className={`absolute top-2 right-2 text-[8px] uppercase tracking-widest font-black opacity-80 ${titleDef.head}`}>
                    {(titleDef as any).rarity}
                  </div>
                )}

                {achieved ? (
                  <div className={`h-12 w-12 overflow-hidden rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br from-indigo-600/30 to-violet-600/20 ring-1 ring-indigo-500/30 ${isEquipped ? 'shadow-lg shadow-indigo-500/20' : ''} group-hover:ring-indigo-500/50 transition-all`}>
                    <MilestoneIcon name={"icon" in titleDef ? (titleDef as any).icon : "Trophy"} className={`h-6 w-6 ${titleDef.head.split(" ")[0]}`} />
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-slate-800/60 flex items-center justify-center mb-3 ring-1 ring-slate-700/50">
                    <Target className="h-5 w-5 text-slate-600" />
                  </div>
                )}
                <p className={`text-xs font-bold leading-tight ${achieved ? titleDef.head : "text-slate-600"}`}>
                  {titleDef.name}
                </p>
                {milestone && (
                  <p className={`text-[9px] mt-1.5 leading-tight ${achieved ? "text-slate-500/80" : "text-slate-700"}`}>
                    {milestone.description}
                  </p>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Tier Progress ── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/10 ring-1 ring-blue-500/20">
            <Target className="h-3.5 w-3.5 text-blue-400" />
          </div>
          Rank Progress
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {tierCounts.map(({ tier, count, total }) => {
            const style = TIER_STYLES[tier];
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={tier} className={`rounded-xl border ${style.badge} p-3 text-center relative overflow-hidden`}>
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-700/30">
                  <motion.div
                    className="h-full bg-current opacity-40"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.1em]">{style.label}</p>
                <p className="text-lg font-black mt-0.5">{count}<span className="text-[10px] font-normal opacity-50">/{total}</span></p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Achievement Categories ── */}
      {categories.map(cat => {
        const meta = CATEGORY_META[cat];
        const defs = ALL_MILESTONES.filter(m => m.category === cat);
        const catAchieved = defs.filter(m => stateMap.get(m.id)?.achieved).length;
        const catPct = defs.length > 0 ? Math.round((catAchieved / defs.length) * 100) : 0;

        return (
          <motion.div
            key={cat}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border ${meta.border} bg-gradient-to-br ${meta.bg} from-slate-900/90 to-slate-950/80 p-6 space-y-5 backdrop-blur-sm`}
          >
            {/* Category header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-base font-bold ${meta.color} flex items-center gap-2`}>
                  {meta.label}
                  <span className={`text-[10px] font-black rounded-full px-2 py-0.5 ${meta.border} bg-slate-900/50`}>{catPct}%</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{meta.desc}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-slate-300">{catAchieved}/{defs.length}</p>
                <p className="text-[10px] text-slate-600 font-medium">completed</p>
              </div>
            </div>

            {/* Category progress bar */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/60">
              <motion.div
                className={`h-full rounded-full ${catPct === 100 ? "bg-emerald-400" : "bg-gradient-to-r from-indigo-500 to-violet-500"}`}
                initial={{ width: 0 }}
                animate={{ width: `${catPct}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
              />
            </div>

            {/* Achievement cards */}
            <div className="grid gap-3">
              {defs.map((m) => {
                const state = stateMap.get(m.id);
                const achieved = state?.achieved ?? false;
                const tierStyle = TIER_STYLES[m.tier];

                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ x: 4 }}
                    className={`relative flex items-center gap-4 rounded-xl border p-4 transition-all duration-200 ${achieved
                      ? `bg-gradient-to-r from-slate-800/60 to-slate-900/40 ${tierStyle.ring} shadow-sm hover:shadow-md`
                      : "border-slate-800/60 bg-slate-900/30 opacity-50"
                      }`}
                  >
                    {/* Icon */}
                    <div className={`shrink-0 flex h-11 w-11 items-center justify-center rounded-xl ${achieved ? `bg-gradient-to-br from-slate-800 to-slate-900 ${tierStyle.ring} shadow-inner` : "bg-slate-800/60 ring-1 ring-slate-700/50"}`}>
                      <MilestoneIcon name={m.icon} className={`h-5 w-5 ${achieved ? tierStyle.icon : "text-slate-600"}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-bold ${achieved ? "text-slate-200" : "text-slate-500"}`}>{m.title}</p>
                        <span className={`text-[9px] font-black uppercase tracking-wider rounded-full px-1.5 py-0.5 ${achieved ? tierStyle.badge : "border border-slate-700 text-slate-600 bg-slate-800/50"}`}>
                          {m.tier}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{m.description}</p>
                    </div>

                    {/* Right side: XP + status */}
                    <div className="shrink-0 text-right flex flex-col items-end gap-1.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold ${achieved ? "text-amber-400" : "text-slate-600"}`}>
                        <Zap className="h-3 w-3" /> {m.xp} XP
                      </span>
                      {achieved ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" /> Unlocked
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Locked</span>
                      )}
                    </div>

                    {/* Achieved glow checkmark */}
                    {achieved && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-slate-900 shadow-lg shadow-emerald-500/30 z-10"
                      >
                        <Check className="h-3 w-3 text-white stroke-[3px]" />
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        );
      })}

      {plans.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-700 p-12 text-center space-y-3 flex flex-col items-center">
          <div className="h-16 w-16 rounded-2xl bg-slate-800/50 flex items-center justify-center">
            <Trophy className="h-8 w-8 text-slate-700" />
          </div>
          <p className="text-sm font-bold text-slate-400">No achievements yet</p>
          <p className="text-xs text-slate-500 max-w-sm">Create study plans and complete chapters to start unlocking achievements, earning XP, and progressing through the ranks.</p>
        </div>
      )}
    </div>
  );
}

// --- Plans Tab (Classroom-style) ---------------------------------------------

const INTENSITY_LABELS: Record<string, { emoji: string; label: string; color: string }> = {
  light: { emoji: "??", label: "Light", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  normal: { emoji: "?", label: "Normal", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  aggressive: { emoji: "??", label: "Aggressive", color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
};


// --- Helper for Blobs --------------------------------------------------------
// --- Helper for Blobs --------------------------------------------------------
async function dataUrlToBlobUrl(dataUrl: string): Promise<string> {
  try {
    if (!dataUrl?.includes(",")) return dataUrl;
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error("Failed to convert dataUrl to blob", e);
    return dataUrl;
  }
}


function PlansTab({
  savedPlans,
  setSavedPlans,
  setActiveTab,
  loading,
}: {
  savedPlans: SavedPlan[];
  setSavedPlans: React.Dispatch<React.SetStateAction<SavedPlan[]>>;
  setActiveTab: (tab: string) => void;
  loading?: boolean;
}) {
  const { user } = useUser();
  const router = useRouter();
  const [viewingPlan, setViewingPlan] = React.useState<StoredPlan | null>(null);
  const [editingPlanId, setEditingPlanId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [deletingPlanId, setDeletingPlanId] = React.useState<string | null>(null);
  // Per-chapter upload state: key = chapterIndex, value = File or null
  const [pendingFiles, setPendingFiles] = React.useState<Record<number, File | null>>({});
  const [uploadingChapter, setUploadingChapter] = React.useState<number | null>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const fileInputRefs = React.useRef<Record<number, HTMLInputElement | null>>({});

  // Derive plans from parent savedPlans prop (instant, no state delay)
  const plans = React.useMemo(() => savedPlans.map(sp => ({
    id: sp.id, name: sp.name, createdAt: sp.createdAt,
    targetDate: sp.targetDate, dailyHours: sp.dailyHours,
    intensity: sp.intensity ?? "normal",
    plan: sp.plan, proofs: sp.proofs ?? [],
  })) as StoredPlan[], [savedPlans]);

  function persistPlans(updated: StoredPlan[]) {
    // Sync directly to parent state — no local copy needed
    setSavedPlans(updated as unknown as SavedPlan[]);
  }

  async function deletePlan(id: string) {
    // Optimistic update
    persistPlans(plans.filter(p => p.id !== id));
    if (viewingPlan?.id === id) setViewingPlan(null);
    setDeletingPlanId(null);

    try {
      const { error } = await supabase.from("study_plans").delete().eq("id", id);
      if (error) {
        console.error("Failed to delete plan:", error);
        // We could revert optimistic update here if needed via a refetch
      }
    } catch (e) {
      console.error("Exception during deletePlan:", e);
    }
  }

  async function renamePlan(id: string, name: string) {
    if (!name.trim()) return;
    persistPlans(plans.map(p => p.id === id ? { ...p, name } : p));
    setEditingPlanId(null);
    try {
      await supabase.from("study_plans").update({ name }).eq("id", id);
    } catch (e) {
      console.error("Exception during renamePlan:", e);
    }
  }

  function selectFile(chapterIndex: number, file: File) {
    setPendingFiles(prev => ({ ...prev, [chapterIndex]: file }));
    setUploadError(null);
  }

  function removeSelectedFile(chapterIndex: number) {
    setPendingFiles(prev => ({ ...prev, [chapterIndex]: null }));
  }

  async function submitProof(plan: StoredPlan, slot: StoredPlanSlot) {
    const file = pendingFiles[slot.chapterIndex];
    if (!file || !user?.id) return;
    setUploadingChapter(slot.chapterIndex);
    setUploadError(null);

    try {
      // 1. Upload to Supabase Storage (avoids statement timeout from large base64 strings in DB)
      const storagePath = `${user.id}/${plan.id}/${slot.chapterIndex}_${Date.now()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("plan-proofs")
        .upload(storagePath, file, { upsert: true, contentType: "application/pdf" });

      let fileUrl: string;

      if (uploadError) {
        // Fallback: if storage bucket doesn't exist or fails, store a small placeholder
        // and try direct base64 (only for very small files < 500KB)
        console.warn("[planner] Storage upload failed, falling back to base64:", uploadError.message);
        if (file.size > 500_000) {
          setUploadError("File too large. Please use a PDF under 500KB, or ask admin to create the 'plan-proofs' storage bucket in Supabase.");
          setUploadingChapter(null);
          return;
        }
        // Small file fallback: read as base64
        fileUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(file);
        });
      } else {
        // Get public URL from storage
        const { data: urlData } = supabase.storage
          .from("plan-proofs")
          .getPublicUrl(storagePath);
        fileUrl = urlData.publicUrl;
      }

      // 2. Insert proof record into database (only stores the URL, not the file data)
      const { error: dbError } = await supabase.from("plan_proofs").insert({
        plan_id: plan.id,
        user_id: user.id,
        chapter_index: slot.chapterIndex,
        file_url: fileUrl,
        file_name: file.name,
      });

      if (dbError) throw dbError;

      // 3. Update local state optimistically
      const proofs = [
        ...(plan.proofs ?? []).filter(p => p.chapterIndex !== slot.chapterIndex),
        { chapterIndex: slot.chapterIndex, proofUrl: fileUrl, fileName: file.name, uploadedAt: new Date().toISOString() },
      ];
      const updated = plans.map(p => p.id === plan.id ? { ...p, proofs } : p);
      persistPlans(updated);
      setViewingPlan(updated.find(p => p.id === plan.id) ?? null);
      setPendingFiles(prev => ({ ...prev, [slot.chapterIndex]: null }));
    } catch (err: any) {
      console.error("Proof save error:", err);
      if (err?.code === "22001" || err?.message?.includes("too large")) {
        setUploadError("File is too large for database storage. Please try a smaller file (under 2MB).");
      } else if (err?.message?.includes("timeout")) {
        setUploadError("Upload timed out. Please try a smaller PDF file.");
      } else {
        setUploadError("Failed to save proof: " + (err?.message || "Unknown error"));
      }
    } finally {
      setUploadingChapter(null);
    }
  }

  async function unsubmit(plan: StoredPlan, chapterIndex: number) {
    const proofs = (plan.proofs ?? []).filter(p => p.chapterIndex !== chapterIndex);
    const updated = plans.map((p: StoredPlan) => p.id === plan.id ? { ...p, proofs } : p);
    persistPlans(updated);
    setViewingPlan(updated.find(p => p.id === plan.id) ?? null);
    try {
      await supabase.from("plan_proofs").delete().eq("plan_id", plan.id).eq("chapter_index", chapterIndex);
    } catch { }
  }

  const completionPct = (plan: StoredPlan) => {
    const total = plan.plan.schedule.length;
    if (total === 0) return 0;
    return Math.round(((plan.proofs?.length ?? 0) / total) * 100);
  };

  // -- Detail (classroom) view ----------------------------------------------
  if (viewingPlan) {
    const il = INTENSITY_LABELS[viewingPlan.intensity ?? "normal"] ?? INTENSITY_LABELS.normal;
    const pct = completionPct(viewingPlan);
    return (
      <div className="">
        <button
          onClick={() => { setViewingPlan(null); setPendingFiles({}); setUploadError(null); }}
          className="mb-5 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Plans
        </button>

        {/* Plan header */}
        {(() => {
          const daysLeft = Math.ceil((new Date(viewingPlan.targetDate + "T00:00:00").getTime() - Date.now()) / 86400000);
          const urgency = daysLeft < 0 ? "overdue" : daysLeft <= 3 ? "critical" : daysLeft <= 7 ? "warning" : "ok";
          const urgencyBadge = {
            overdue: "bg-red-500/10 text-red-400 border-red-500/20",
            critical: "bg-red-500/10 text-red-500 border-red-500/20",
            warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
            ok: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          }[urgency];
          const urgencyText = urgency === "overdue" ? "Overdue" : urgency === "critical" ? `${daysLeft}d left!` : urgency === "warning" ? `${daysLeft} days left` : daysLeft === 0 ? "Due today" : `${daysLeft} days left`;
          return (
            <div className="ax-card mb-4 overflow-hidden shadow-md">
              {/* Colored top accent by urgency */}
              <div className={`h-1.5 w-full ${urgency === "overdue" || urgency === "critical" ? "bg-red-500" : urgency === "warning" ? "bg-amber-400" : "bg-gradient-to-r from-blue-500 to-indigo-500"}`} />
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-600/20">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-white leading-tight">{viewingPlan.name}</h2>
                      <span className={`shrink-0 text-xs font-bold border rounded-full px-2.5 py-1 ${urgencyBadge}`}>
                        {urgencyText}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${il.color}`}>
                        {il.emoji} {il.label}
                      </span>
                      <span className="text-xs text-slate-400">
                        {viewingPlan.plan.schedule.length} chapters &middot; {viewingPlan.dailyHours}h/day &middot; Due {fmtDateShort(viewingPlan.targetDate)}
                      </span>
                    </div>
                    {viewingPlan.plan.overallStrategy && (
                      <p className="mt-2 text-sm text-slate-400 leading-relaxed line-clamp-2">{viewingPlan.plan.overallStrategy}</p>
                    )}
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">{viewingPlan.proofs?.length ?? 0} of {viewingPlan.plan.schedule.length} chapters submitted</span>
                    <span className={`font-bold ${pct === 100 ? "text-emerald-400" : "text-slate-300"}`}>{pct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <motion.div
                      className={`h-full rounded-full ${pct === 100 ? "bg-emerald-400" : "bg-gradient-to-r from-blue-500 to-indigo-500"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                  {pct === 100 && (
                    <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Plan complete � outstanding work!
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {uploadError && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-400 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
            {uploadError}
          </div>
        )}

        {/* Chapter assignment cards */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            Chapter Assignments
            <span className="text-xs font-normal text-slate-500">� upload proof to mark complete</span>
          </h3>
          {viewingPlan.plan.schedule.map((slot) => {
            const proof = (viewingPlan.proofs ?? []).find(p => p.chapterIndex === slot.chapterIndex);
            const submitted = !!proof;
            const pending = pendingFiles[slot.chapterIndex] ?? null;
            const isUploading = uploadingChapter === slot.chapterIndex;
            const isPastDue = new Date(slot.endDate) < new Date();

            return (
              <div
                key={slot.chapterIndex}
                className={`ax-card overflow-hidden transition-all ${submitted ? "border-emerald-500/30" : isPastDue ? "border-amber-500/30" : ""
                  }`}
              >
                {/* Chapter header */}
                {(() => {
                  const endMs = new Date(slot.endDate + "T00:00:00").getTime();
                  const daysLeft = Math.ceil((endMs - Date.now()) / 86400000);
                  const isOverdue = daysLeft < 0 && !submitted;
                  const isCritical = daysLeft >= 0 && daysLeft <= 2 && !submitted;
                  const isWarning = daysLeft > 2 && daysLeft <= 5 && !submitted;
                  const deadlinePill = submitted
                    ? null
                    : isOverdue
                      ? <span className="shrink-0 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5">Overdue</span>
                      : isCritical
                        ? <span className="shrink-0 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5">{daysLeft === 0 ? "Due today" : `${daysLeft}d left`}</span>
                        : isWarning
                          ? <span className="shrink-0 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">{daysLeft}d left</span>
                          : null;
                  return (
                    <div className={`flex items-center gap-3 px-4 py-3 border-b ${submitted ? "border-emerald-500/20 bg-emerald-900/10" : isOverdue ? "border-red-500/20 bg-red-900/10" : isCritical ? "border-red-500/20" : "border-slate-800"}`}>
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-2 ${submitted ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30"
                        : isOverdue ? "bg-red-500/10 text-red-400 ring-red-500/30"
                          : isCritical ? "bg-red-500/10 text-red-500 ring-red-500/30"
                            : isWarning ? "bg-amber-500/10 text-amber-400 ring-amber-500/30"
                              : "bg-blue-500/10 text-blue-400 ring-blue-500/30"
                        }`}>
                        {submitted ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs">{slot.chapterIndex}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-200 text-sm leading-tight truncate">{slot.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-xs text-slate-400">
                            {fmtDateShort(slot.startDate)} ? {fmtDateShort(slot.endDate)}
                          </span>
                          <span className="text-slate-600 text-xs">�</span>
                          <span className={`text-[10px] font-medium capitalize rounded-full border px-1.5 py-0.5 ${slot.difficulty === "easy" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : slot.difficulty === "hard" ? "bg-red-500/10 text-red-400 border-red-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            }`}>{slot.difficulty}</span>
                          {deadlinePill}
                        </div>
                      </div>
                      {submitted && (
                        <span className="shrink-0 flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
                          <CheckCircle2 className="h-3 w-3" /> Submitted
                        </span>
                      )}
                    </div>
                  );
                })()}

                {/* Assignment body */}
                <div className="px-4 py-3 space-y-2.5">
                  {/* Chapter overview from AI */}
                  {slot.overview && (
                    <div className="flex items-start gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
                      <BookOpen className="h-4 w-4 shrink-0 mt-0.5 text-blue-400" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-blue-400 mb-0.5">Chapter Overview</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{slot.overview}</p>
                      </div>
                    </div>
                  )}

                  {/* Study tip */}
                  <div className="flex items-start gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
                    <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-indigo-400" />
                    <p className="text-xs text-slate-400">{slot.studyTip}</p>
                  </div>

                  {/* Daily goals */}
                  {slot.dailyGoals.length > 0 && (
                    <ul className="space-y-1">
                      {slot.dailyGoals.slice(0, 3).map((g, gi) => (
                        <li key={gi} className="flex items-start gap-2 text-xs text-slate-400">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-400" />
                          {g}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Submission area */}
                  {submitted ? (
                    // Already submitted
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20">
                          <FileText className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-emerald-300 truncate">{proof!.fileName ?? "Proof uploaded"}</p>
                          {proof!.uploadedAt && (
                            <p className="text-xs text-emerald-400">Submitted {new Date(proof!.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={async () => {
                            let url = proof?.proofUrl;
                            if (!url && proof?.proofId) url = await fetchProofUrl(proof.proofId) || "";
                            if (!url) { alert("Could not load proof URL. Please try again or re-upload."); return; }

                            // Optimistically update the state so we don't re-fetch
                            if (!proof?.proofUrl && url) {
                              const updatedPlans = plans.map(p => {
                                if (p.id !== viewingPlan.id) return p;
                                const updatedProofs = (p.proofs ?? []).map(pr => pr.chapterIndex === slot.chapterIndex ? { ...pr, proofUrl: url } : pr);
                                return { ...p, proofs: updatedProofs };
                              });
                              persistPlans(updatedPlans);
                            }

                            try {
                              const isDataUrl = url.startsWith("data:");
                              if (isDataUrl) {
                                const blobUrl = await dataUrlToBlobUrl(url);
                                const newTab = window.open(blobUrl, "_blank");
                                if (!newTab) {
                                  const a = document.createElement("a");
                                  a.href = blobUrl;
                                  a.target = "_blank";
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                }
                                setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
                              } else {
                                window.open(url, "_blank");
                              }
                            } catch (e) { console.error(e); }
                          }}
                          className="flex items-center gap-1.5 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" /> View PDF
                        </button>
                        <button
                          onClick={async () => {
                            let url = proof?.proofUrl;
                            if (!url && proof?.proofId) url = await fetchProofUrl(proof.proofId) || "";
                            if (!url) { alert("Could not load proof URL. Please try again or re-upload."); return; }

                            // Optimistically update the state so we don't re-fetch
                            if (!proof?.proofUrl && url) {
                              const updatedPlans = plans.map(p => {
                                if (p.id !== viewingPlan.id) return p;
                                const updatedProofs = (p.proofs ?? []).map(pr => pr.chapterIndex === slot.chapterIndex ? { ...pr, proofUrl: url } : pr);
                                return { ...p, proofs: updatedProofs };
                              });
                              persistPlans(updatedPlans);
                            }

                            try {
                              const isDataUrl = url.startsWith("data:");
                              const finalUrl = isDataUrl ? await dataUrlToBlobUrl(url) : url;
                              const a = document.createElement("a");
                              a.href = finalUrl;
                              a.download = proof?.fileName ?? "proof.pdf";
                              a.target = "_blank";
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              if (isDataUrl) setTimeout(() => URL.revokeObjectURL(finalUrl), 10000);
                            } catch (e) { console.error(e); }
                          }}
                          className="flex items-center gap-1.5 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" /> Download
                        </button>
                        <button onClick={() => unsubmit(viewingPlan, slot.chapterIndex)}
                          className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors">
                          <X className="h-3.5 w-3.5" /> Unsubmit
                        </button>
                      </div>
                    </div>
                  ) : pending ? (
                    // File selected, not yet submitted
                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 space-y-3">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 shrink-0 text-blue-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-blue-300 truncate">{pending.name}</p>
                          <p className="text-xs text-blue-400">{(pending.size / 1024).toFixed(1)} KB &middot; PDF</p>
                        </div>
                        <button onClick={() => removeSelectedFile(slot.chapterIndex)}
                          className="rounded-lg p-1.5 text-blue-500 hover:bg-blue-500/20 transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => submitProof(viewingPlan, slot)}
                          disabled={isUploading}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-500 active:scale-[0.98] transition-all disabled:opacity-60"
                        >
                          {isUploading ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                          ) : (
                            <><Upload className="h-4 w-4" /> Turn In</>
                          )}
                        </button>
                        <button onClick={() => removeSelectedFile(slot.chapterIndex)}
                          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // No file selected yet
                    <div>
                      <input
                        ref={el => { fileInputRefs.current[slot.chapterIndex] = el; }}
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) selectFile(slot.chapterIndex, file);
                          e.target.value = "";
                        }}
                      />
                      <button
                        onClick={() => fileInputRefs.current[slot.chapterIndex]?.click()}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/50 px-4 py-3 text-sm font-medium text-slate-400 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-400 transition-all"
                      >
                        <Upload className="h-4 w-4" /> Attach PDF &amp; Turn In
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // -- List view ----------------------------------------------------------------
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-6 w-32 rounded-lg bg-slate-800 animate-pulse" />
            <div className="h-4 w-64 rounded-lg bg-slate-800/60 animate-pulse mt-2" />
          </div>
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <div className="h-1 w-full bg-slate-800 animate-pulse" />
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-800 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded-lg bg-slate-800 animate-pulse" />
                  <div className="h-3 w-32 rounded-lg bg-slate-800/60 animate-pulse" />
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-800 animate-pulse" />
              <div className="h-10 w-full rounded-xl bg-slate-800 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">My Plans</h2>
          <p className="text-sm text-slate-400 mt-0.5">AI-generated study plans. Submit chapter proofs to track completion.</p>
        </div>
        <button
          onClick={() => setActiveTab("Generate Plan")}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Plan
        </button>
      </div>

      {plans.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-700 py-20 text-center">
          <ClipboardList className="h-12 w-12 text-slate-700" />
          <div>
            <p className="font-semibold text-slate-400">No plans yet</p>
            <p className="text-sm text-slate-500 mt-1">Generate your first plan from the AI Plan Generator tab.</p>
          </div>
          <button onClick={() => setActiveTab("Generate Plan")}
            className="mt-2 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-colors">
            <Brain className="h-4 w-4" /> Generate Plan
          </button>
        </div>
      )}

      {plans.map(plan => {
        const pct = completionPct(plan);
        const il = INTENSITY_LABELS[plan.intensity ?? "normal"] ?? INTENSITY_LABELS.normal;
        const daysLeft = Math.ceil((new Date(plan.targetDate + "T00:00:00").getTime() - Date.now()) / 86400000);
        const done = plan.proofs?.length ?? 0;
        const total = plan.plan.schedule.length;
        const isComplete = pct === 100;
        const urgencyBorder = isComplete ? "border-emerald-500/30" : daysLeft < 0 ? "border-red-500/30" : daysLeft <= 3 ? "border-red-500/20" : daysLeft <= 7 ? "border-amber-500/30" : "border-slate-800";
        const urgencyAccent = isComplete ? "bg-emerald-500" : daysLeft < 0 ? "bg-red-500" : daysLeft <= 3 ? "bg-red-400" : daysLeft <= 7 ? "bg-amber-400" : "bg-gradient-to-r from-blue-500 to-indigo-500";
        return (
          <div key={plan.id} className={`rounded-2xl border bg-slate-900/40 overflow-hidden hover:bg-slate-800/60 transition-all ${urgencyBorder}`}>
            {/* Urgency accent stripe */}
            <div className={`h-1 w-full ${urgencyAccent}`} />

            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${isComplete ? "bg-emerald-500/10 ring-1 ring-emerald-500/20" : "bg-blue-500/10 ring-1 ring-blue-500/20"}`}>
                  {isComplete ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Brain className="h-4 w-4 text-blue-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  {editingPlanId === plan.id ? (
                    <form onSubmit={e => { e.preventDefault(); renamePlan(plan.id, editName); }} className="flex items-center gap-2">
                      <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                        className="flex-1 rounded-lg border border-blue-500/50 bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50" />
                      <button type="submit" className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500">Save</button>
                      <button type="button" onClick={() => setEditingPlanId(null)} className="rounded-lg p-1.5 text-slate-500 hover:text-slate-300"><X className="h-4 w-4" /></button>
                    </form>
                  ) : (
                    <p className="font-bold text-slate-200 truncate text-sm">{plan.name}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${il.color}`}>
                      {il.emoji} {il.label}
                    </span>
                    <span className="text-xs text-slate-500">{total} chapters</span>
                    <span className={`text-[11px] font-semibold rounded-full border px-2 py-0.5 ${isComplete ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : daysLeft < 0 ? "bg-red-500/10 text-red-400 border-red-500/30" : daysLeft <= 7 ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-slate-800 text-slate-400 border-slate-700"}`}>
                      {isComplete ? "Complete" : daysLeft < 0 ? "Overdue" : daysLeft === 0 ? "Due today" : `${daysLeft}d left`}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setEditingPlanId(plan.id); setEditName(plan.name); }}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors" title="Rename">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeletingPlanId(plan.id)}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Mini progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">{done}/{total} submitted</span>
                  <span className={`font-bold ${isComplete ? "text-emerald-400" : "text-slate-300"}`}>{pct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <motion.div
                    className={`h-full rounded-full ${isComplete ? "bg-emerald-400" : "bg-gradient-to-r from-blue-500 to-indigo-400"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>

              <button onClick={() => { setViewingPlan(plan); setPendingFiles({}); setUploadError(null); }}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${isComplete ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-slate-800 text-white hover:bg-slate-700 hover:shadow-lg"}`}>
                {isComplete ? <CheckCircle2 className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {isComplete ? "View Completed Plan" : "Open Plan"}
              </button>

              {deletingPlanId === plan.id && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                  <p className="flex-1 text-sm text-red-400">Are you sure you want to permanently delete <strong>{plan.name}</strong>? All associated data and submitted proofs will be removed. This action cannot be reversed.</p>
                  <button onClick={() => deletePlan(plan.id)} className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-500">Delete</button>
                  <button onClick={() => setDeletingPlanId(null)} className="rounded-lg p-1 text-red-500 hover:text-red-300"><X className="h-4 w-4" /></button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}