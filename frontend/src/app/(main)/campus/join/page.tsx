"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  KeyRound,
  CheckCircle2,
  Loader2,
  Building2,
  Users,
  BookOpen,
  Lock,
  Globe,
  ChevronRight,
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import {
  fetchInstitutionByCode,
  joinInstitution,
  makeInitials,
  type Institution,
  type MembershipStatus,
} from "@/lib/campus";

type JoinState =
  | "idle"
  | "loading"
  | "found"
  | "not_found"
  | "already_joined"
  | "joined";

export default function JoinWithCodePage() {
  const { user } = useUser();
  const [code, setCode] = useState("");
  const [state, setState] = useState<JoinState>("idle");
  const [found, setFound] = useState<Institution | null>(null);
  const [joinResult, setJoinResult] = useState<MembershipStatus | null>(null);

  async function handleLookup() {
    if (!code.trim()) return;
    setState("loading");
    try {
      const match = await fetchInstitutionByCode(code.trim());
      if (!match) {
        setState("not_found");
        return;
      }
      if (match.userRole && match.memberStatus === "active") {
        setFound(match);
        setState("already_joined");
        return;
      }
      setFound(match);
      setState("found");
    } catch {
      setState("not_found");
    }
  }

  async function handleJoin() {
    if (!found || !user) return;
    setState("loading");
    try {
      const result = await joinInstitution(
        found.id,
        user.id,
        user.fullName ?? user.username ?? "Member",
        makeInitials(user.fullName ?? user.username ?? "?"),
      );
      setJoinResult(result);
      setState("joined");
    } catch (e) {
      console.error(e);
      setState("found"); // go back to confirm view on error
    }
  }

  function handleReset() {
    setCode("");
    setFound(null);
    setState("idle");
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-600/20 to-teal-400/10 ring-1 ring-emerald-500/20">
          <KeyRound className="h-7 w-7 text-emerald-400" />
        </div>
        <h1 className="text-xl font-bold text-slate-100">
          Join with Invite Code
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Enter the code shared by your group to request access
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* ── Idle / Input ── */}
        {(state === "idle" || state === "not_found") && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-4"
          >
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (state === "not_found") setState("idle");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                placeholder="e.g. ACMX-2026"
                className="h-12 w-full rounded-xl border border-slate-700/60 bg-slate-900 pl-11 pr-4 text-sm font-mono text-slate-200 tracking-wider placeholder:text-slate-500 placeholder:tracking-normal focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 uppercase"
                autoFocus
              />
            </div>

            {state === "not_found" && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 rounded-lg bg-rose-950/30 px-3 py-2 text-xs text-rose-400 ring-1 ring-rose-800/40"
              >
                No group found with that code. Double-check and try again.
              </motion.p>
            )}

            <button
              onClick={handleLookup}
              disabled={!code.trim()}
              className="h-12 w-full rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Look Up Group
            </button>

            <p className="text-center text-xs text-slate-400">
              Ask your group admin for the invite code.
            </p>
          </motion.div>
        )}

        {/* ── Loading ── */}
        {state === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-16"
          >
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            <p className="text-sm text-slate-400">Looking up group…</p>
          </motion.div>
        )}

        {/* ── Found — Preview + Confirm ── */}
        {state === "found" && found && (
          <motion.div
            key="found"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-5"
          >
            {/* Institution card */}
            <div className="rounded-2xl border border-emerald-800/30 bg-emerald-950/20 p-5">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br ${found.avatar_color} text-sm font-bold text-white`}
                >
                  {found.avatar_initials}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-100">
                      {found.name}
                    </h2>
                    {found.is_public ? (
                      <Globe className="h-3.5 w-3.5 text-slate-400" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    {found.description}
                  </p>
                  <div className="mt-3 flex gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {found.member_count.toLocaleString()} members
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-slate-400">
              {found.is_public
                ? "This is a public group — you'll join immediately."
                : "This is a private group — your request will be reviewed by an admin."}
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleJoin}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition hover:bg-emerald-500"
              >
                {found.is_public ? "Join Now" : "Request Access"}{" "}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Already a member ── */}
        {state === "already_joined" && found && (
          <motion.div
            key="already"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-5 py-8 text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 ring-1 ring-blue-500/20">
              <Building2 className="h-7 w-7 text-blue-400" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-100">
                You&apos;re already a member!
              </p>
              <p className="mt-1 text-sm text-slate-400">
                You already belong to{" "}
                <span className="font-semibold text-slate-200">
                  {found.name}
                </span>
                .
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-slate-100"
              >
                Try Another
              </button>
              <a
                href="/campus/my-campus"
                className="flex items-center gap-2 rounded-xl bg-emerald-600/15 px-4 py-2.5 text-sm font-semibold text-emerald-400 ring-1 ring-emerald-500/20 transition hover:bg-emerald-600/25"
              >
                Go to My Groups <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </motion.div>
        )}

        {/* ── Success ── */}
        {state === "joined" && found && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-5 py-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                delay: 0.1,
              }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-2 ring-emerald-500/30"
            >
              <CheckCircle2 className="h-9 w-9 text-emerald-400" />
            </motion.div>
            <div>
              <p className="text-lg font-bold text-slate-100">
                {joinResult === "active" ? "You've joined!" : "Request sent!"}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {joinResult === "active"
                  ? `Welcome to ${found?.name}. Your group is ready.`
                  : `Your request to join ${found?.name} has been sent to an admin for approval.`}
              </p>
            </div>
            <a
              href="/campus/my-campus"
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition hover:bg-emerald-500"
            >
              Open My Groups <ChevronRight className="h-4 w-4" />
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
