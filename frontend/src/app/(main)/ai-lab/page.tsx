"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, Sparkles, Loader2, AlertTriangle, X, RotateCcw,
  BookOpen, HelpCircle, Brain, Zap, Search, BarChart2, ChevronDown, ChevronUp,
  CheckCircle2, RefreshCw,
} from "lucide-react";

// ─── PDF extraction ─────────────────────────────────────────────────────────

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map((item) => ("str" in item ? item.str : "")).join(" ") + "\n\n";
  }
  return fullText.trim();
}

// ─── Types ──────────────────────────────────────────────────────────────────

type Tool = "intelligence" | "summarizer" | "quiz" | "flashcards" | "solver" | "insights";

interface ToolResult {
  intelligence?: { summary: string; questions: { question: string; answer: string }[] };
  summarizer?: { oneLiner: string; paragraph: string; detailed: string };
  quiz?: { quiz: { question: string; options: string[]; correct: number; explanation: string }[] };
  flashcards?: { flashcards: { term: string; definition: string }[] };
  insights?: { difficulty: string; estimatedReadTime: string; keyTopics: string[]; recommendedSchedule: string; studyTips: string[]; examFocus: string[]; prerequisites: string[] };
}

// ─── Tool config ─────────────────────────────────────────────────────────────

const TOOLS: { id: Tool; label: string; icon: React.ElementType; color: string; desc: string }[] = [
  { id: "intelligence", label: "Document Intelligence", icon: Brain, color: "from-violet-600 to-purple-600", desc: "Summary + key Q&A" },
  { id: "summarizer", label: "Smart Summarizer", icon: BookOpen, color: "from-blue-600 to-cyan-600", desc: "3-layer summary" },
  { id: "quiz", label: "Quiz Generator", icon: HelpCircle, color: "from-amber-500 to-orange-600", desc: "5 MCQ questions" },
  { id: "flashcards", label: "Flashcard Generator", icon: Zap, color: "from-emerald-500 to-teal-600", desc: "10 flashcards" },
  { id: "solver", label: "Question Solver", icon: Search, color: "from-rose-500 to-pink-600", desc: "Ask anything" },
  { id: "insights", label: "Study Insights", icon: BarChart2, color: "from-indigo-500 to-blue-700", desc: "Tips & schedule" },
];

const API_MAP: Record<Exclude<Tool, "solver">, string> = {
  intelligence: "/api/ai-lab/analyze",
  summarizer: "/api/ai-lab/summarize",
  quiz: "/api/ai-lab/quiz",
  flashcards: "/api/ai-lab/flashcards",
  insights: "/api/ai-lab/insights",
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function QAAccordion({ items }: { items: { question: string; answer: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-2">
      {items.map((qa, i) => (
        <div key={i} className="ax-card overflow-hidden">
          <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-800 transition">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-bold text-violet-400">{i + 1}</span>
            <p className="flex-1 text-sm font-medium" style={{ color: "var(--ax-text-primary)" }}>{qa.question}</p>
            {open === i ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />}
          </button>
          <AnimatePresence>
            {open === i && (
              <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="border-t border-slate-800 bg-slate-800/50 px-4 py-3">
                  <p className="text-sm leading-relaxed text-slate-400">{qa.answer}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

function FlashCard({ card, index }: { card: { term: string; definition: string }; index: number }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="cursor-pointer perspective-1000"
      style={{ perspective: 1000 }}
      onClick={() => setFlipped(!flipped)}
    >
      <div className="relative h-36 w-full transition-transform duration-500" style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
        {/* Front */}
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-900/20 to-teal-900/20 p-4 text-center backface-hidden" style={{ backfaceVisibility: "hidden" }}>
          <span className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">Term</span>
          <p className="text-sm font-bold text-white">{card.term}</p>
          <p className="mt-2 text-[10px] text-slate-500">Tap to flip</p>
        </div>
        {/* Back */}
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-900/20 to-emerald-900/20 p-4 text-center" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
          <span className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-teal-400">Definition</span>
          <p className="text-sm leading-relaxed text-slate-300">{card.definition}</p>
        </div>
      </div>
    </motion.div>
  );
}

function QuizQuestion({ q, index }: { q: { question: string; options: string[]; correct: number; explanation: string }; index: number }) {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} className="ax-card p-5 space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-400">{index + 1}</span>
        <p className="text-sm font-semibold text-slate-200">{q.question}</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {q.options.map((opt, oi) => {
          const isCorrect = oi === q.correct;
          const isSelected = selected === oi;
          let cls = "rounded-xl border px-4 py-2.5 text-xs font-medium text-left transition ";
          if (selected === null) cls += "border-slate-700 bg-slate-800 hover:border-amber-500/50 hover:bg-amber-500/10 text-slate-300";
          else if (isCorrect) cls += "border-emerald-500/50 bg-emerald-500/10 text-emerald-400";
          else if (isSelected) cls += "border-rose-500/50 bg-rose-500/10 text-rose-400";
          else cls += "border-slate-800 bg-slate-900 text-slate-500";
          return (
            <button key={oi} disabled={selected !== null} onClick={() => setSelected(oi)} className={cls}>
              {opt}
            </button>
          );
        })}
      </div>
      <AnimatePresence>
        {selected !== null && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl px-4 py-3 text-xs leading-relaxed ${selected === q.correct ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/10 text-amber-400 border border-amber-500/30"}`}>
            💡 {q.explanation}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AILabPage() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [activeTool, setActiveTool] = useState<Tool>("intelligence");
  const [loading, setLoading] = useState(false);
  const [toolError, setToolError] = useState<string | null>(null);
  const [results, setResults] = useState<ToolResult>({});

  // Question Solver state
  const [question, setQuestion] = useState("");
  const [solverResult, setSolverResult] = useState<{ answer: string; confidence: string; relatedTopics: string[] } | null>(null);
  const [solvingQ, setSolvingQ] = useState(false);

  const handleFile = useCallback((f: File) => {
    if (f.type !== "application/pdf") { setExtractError("Only PDF files are supported."); return; }
    setFile(f);
    setText(null);
    setExtractError(null);
    setResults({});
    setSolverResult(null);
    setExtracting(true);
    extractPdfText(f)
      .then((t) => { if (t.length < 100) throw new Error("Could not extract text. Try a text-based PDF."); setText(t); })
      .catch((e) => setExtractError(e.message))
      .finally(() => setExtracting(false));
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  }, [handleFile]);

  async function runTool(tool: Tool) {
    if (!text || tool === "solver") return;
    if (results[tool as keyof ToolResult]) return; // cached
    setLoading(true); setToolError(null);
    try {
      const res = await fetch(API_MAP[tool as Exclude<Tool, "solver">], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, fileName: file?.name }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Failed");
      setResults((prev) => ({ ...prev, [tool]: data }));
    } catch (e) {
      setToolError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setLoading(false); }
  }

  async function solveQuestion() {
    if (!text || !question.trim() || solvingQ) return;
    setSolvingQ(true); setToolError(null);
    try {
      const res = await fetch("/api/ai-lab/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, question }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Failed");
      setSolverResult(data);
    } catch (e) {
      setToolError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setSolvingQ(false); }
  }

  // Auto-run tool on tab switch
  useEffect(() => {
    if (text && activeTool !== "solver") runTool(activeTool);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, text]);

  const reset = () => { setFile(null); setText(null); setExtractError(null); setResults({}); setSolverResult(null); setQuestion(""); };

  const cfg = TOOLS.find((t) => t.id === activeTool)!;
  const Icon = cfg.icon;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-7 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/20 to-blue-500/10 ring-1 ring-violet-500/20">
          <Sparkles className="h-6 w-6 text-violet-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--ax-text-primary)" }}>AI Study Lab</h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--ax-text-secondary)" }}>Upload a PDF — then use any of 6 AI-powered tools to master your material.</p>
        </div>
      </div>

      {/* Upload Zone */}
      {!text && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={onDrop}
          onClick={() => !extracting && fileRef.current?.click()}
          className={`group/drop relative mb-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition cursor-pointer ${isDragOver ? "border-violet-500 bg-violet-500/10" : extracting ? "border-violet-500/30 bg-violet-500/5" : "border-slate-700 bg-[var(--ax-surface-1)] hover:border-violet-500/50 hover:bg-[var(--ax-surface-2)]"}`}
        >
          <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {extracting ? (
            <>
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 ring-1 ring-violet-500/20">
                <Loader2 className="h-7 w-7 animate-spin text-violet-500" />
              </div>
              <p className="text-sm font-semibold text-violet-400">Extracting text…</p>
              <p className="mt-1 text-xs text-slate-500">Reading your PDF pages</p>
            </>
          ) : (
            <>
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 ring-1 ring-slate-700">
                <Upload className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-white">Drop your PDF here</p>
              <p className="mt-1 text-xs text-slate-500">or click to browse — text-based PDF, max ~50 MB</p>
            </>
          )}
        </div>
      )}

      {extractError && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
          <p className="flex-1 text-sm text-rose-400">{extractError}</p>
          <button onClick={reset} className="text-rose-400 hover:text-rose-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Active file bar */}
      {text && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-2.5">
          <FileText className="h-4 w-4 shrink-0 text-violet-500" />
          <span className="flex-1 truncate text-sm font-medium text-violet-300">{file?.name ?? "Document loaded"}</span>
          <span className="shrink-0 rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] text-violet-400">{(text.length / 1000).toFixed(0)}K chars</span>
          <button onClick={reset} className="shrink-0 rounded-lg p-1 text-violet-400 hover:text-violet-700 transition"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Tool tabs */}
      {text && (
        <>
          <div className="mb-5 flex flex-wrap gap-2">
            {TOOLS.map((t) => {
              const TIcon = t.icon;
              const isActive = activeTool === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { setActiveTool(t.id); setToolError(null); }}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition ${isActive ? `bg-gradient-to-r ${t.color} text-white border-transparent shadow-md` : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-600 hover:text-slate-200"}`}
                >
                  <TIcon className="h-3.5 w-3.5" />
                  {t.label}
                  {results[t.id as keyof ToolResult] && !isActive && (
                    <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">✓</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Error */}
          {toolError && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <p className="flex-1 text-sm text-rose-400">{toolError}</p>
              <button onClick={() => { setToolError(null); runTool(activeTool); }} className="shrink-0 text-rose-400 hover:text-rose-600 transition"><RefreshCw className="h-4 w-4" /></button>
            </div>
          )}

          {/* Tool Content Panel */}
          <AnimatePresence mode="wait">
            <motion.div key={activeTool} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="ax-card overflow-hidden relative">
              {/* Tool header */}
              <div className={`bg-gradient-to-r ${cfg.color} px-6 py-4 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">{cfg.label}</h2>
                    <p className="text-[10px] text-white/70">{cfg.desc}</p>
                  </div>
                </div>
                {results[activeTool as keyof ToolResult] && activeTool !== "solver" && (
                  <button
                    onClick={() => { setResults((p) => ({ ...p, [activeTool]: undefined })); runTool(activeTool); }}
                    className="flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-white/30"
                  >
                    <RefreshCw className="h-3 w-3" /> Regenerate
                  </button>
                )}
              </div>

              <div className="p-6">
                {/* Loading state */}
                {loading && activeTool !== "solver" && (
                  <div className="flex flex-col items-center gap-4 py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                    <p className="text-sm font-medium text-slate-400">AI is working…</p>
                    <p className="text-xs text-slate-500">Usually takes 10–20 seconds</p>
                  </div>
                )}

                {/* === Document Intelligence === */}
                {activeTool === "intelligence" && !loading && (
                  results.intelligence ? (
                    <div className="space-y-6">
                      <div>
                        <div className="mb-3 flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-violet-500" />
                          <h3 className="text-sm font-bold text-white">Chapter Summary</h3>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-400 whitespace-pre-line">{results.intelligence.summary}</p>
                      </div>
                      <div>
                        <div className="mb-3 flex items-center gap-2">
                          <HelpCircle className="h-4 w-4 text-violet-500" />
                          <h3 className="text-sm font-bold text-white">Key Q&As</h3>
                          <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold text-violet-400">{results.intelligence.questions.length}</span>
                        </div>
                        <QAAccordion items={results.intelligence.questions} />
                      </div>
                    </div>
                  ) : !loading && <div className="py-8 text-center text-sm text-slate-500">Loading…</div>
                )}

                {/* === Smart Summarizer === */}
                {activeTool === "summarizer" && !loading && results.summarizer && (
                  <div className="space-y-4">
                    {[
                      { label: "One-Liner", value: results.summarizer.oneLiner, color: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
                      { label: "Paragraph", value: results.summarizer.paragraph, color: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" },
                      { label: "Detailed", value: results.summarizer.detailed, color: "bg-slate-800 border-slate-700 text-slate-300" },
                    ].map((s) => (
                      <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest opacity-60">{s.label}</p>
                        <p className="text-sm leading-relaxed">{s.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* === Quiz Generator === */}
                {activeTool === "quiz" && !loading && results.quiz && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400">Select an answer to reveal the explanation.</p>
                    {results.quiz.quiz.map((q, i) => (
                      <QuizQuestion key={i} q={q} index={i} />
                    ))}
                  </div>
                )}

                {/* === Flashcard Generator === */}
                {activeTool === "flashcards" && !loading && results.flashcards && (
                  <div>
                    <p className="mb-4 text-xs text-slate-400">Tap any card to flip and reveal the definition.</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {results.flashcards.flashcards.map((card, i) => (
                        <FlashCard key={i} card={card} index={i} />
                      ))}
                    </div>
                  </div>
                )}

                {/* === Question Solver === */}
                {activeTool === "solver" && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); solveQuestion(); } }}
                        placeholder="Ask anything about this document…"
                        className="ax-input flex-1 rounded-xl px-4 py-2.5"
                      />
                      <button
                        onClick={solveQuestion}
                        disabled={!question.trim() || solvingQ}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {solvingQ ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        {solvingQ ? "Thinking…" : "Solve"}
                      </button>
                    </div>
                    <AnimatePresence>
                      {solverResult && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
                            <div className="mb-2 flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-rose-500" />
                              <span className="text-xs font-semibold text-rose-400">Answer</span>
                              <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${solverResult.confidence === "high" ? "bg-emerald-500/20 text-emerald-400" : solverResult.confidence === "medium" ? "bg-amber-500/20 text-amber-400" : "bg-slate-800 text-slate-400"}`}>
                                {solverResult.confidence} confidence
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed text-slate-300">{solverResult.answer}</p>
                          </div>
                          {solverResult.relatedTopics.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {solverResult.relatedTopics.map((t) => (
                                <span key={t} className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-400">{t}</span>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* === Study Insights === */}
                {activeTool === "insights" && !loading && results.insights && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400">Difficulty</p>
                        <p className="mt-1 text-base font-bold capitalize text-indigo-400">{results.insights.difficulty}</p>
                      </div>
                      <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-400">Read Time</p>
                        <p className="mt-1 text-base font-bold text-blue-400">{results.insights.estimatedReadTime}</p>
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Key Topics</p>
                      <div className="flex flex-wrap gap-2">
                        {results.insights.keyTopics.map((t) => (
                          <span key={t} className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-400">{t}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Recommended Schedule</p>
                      <p className="rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-3 text-sm text-slate-300">{results.insights.recommendedSchedule}</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Study Tips</p>
                        <ul className="space-y-1.5">
                          {results.insights.studyTips.map((t) => (
                            <li key={t} className="flex items-start gap-2 text-sm text-slate-400"><span className="mt-0.5 text-emerald-500">✓</span>{t}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Exam Focus</p>
                        <ul className="space-y-1.5">
                          {results.insights.examFocus.map((t) => (
                            <li key={t} className="flex items-start gap-2 text-sm text-slate-400"><span className="mt-0.5 text-amber-500">★</span>{t}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </>
      )}

      {/* Empty state - no file yet */}
      {!text && !extracting && !extractError && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {TOOLS.map((t) => {
            const TIcon = t.icon;
            return (
              <div key={t.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-3 opacity-50">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${t.color} opacity-70`}>
                  <TIcon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-300">{t.label}</p>
                  <p className="text-[10px] text-slate-500">{t.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
