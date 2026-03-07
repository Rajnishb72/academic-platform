"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Users,
  BookOpen,
  Lock,
  Globe,
  Search,
  KeyRound,
  ChevronRight,
  Sparkles,
  Loader2,
  X,
  Plus,
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import {
  fetchInstitutions,
  createInstitution,
  makeInitials,
  type Institution,
} from "@/lib/campus";

const ROLE_BADGE: Record<string, string> = {
  owner: "bg-amber-500/15 text-amber-400 ring-amber-500/20",
  admin: "bg-blue-500/15 text-blue-400 ring-blue-500/20",
  instructor: "bg-purple-500/15 text-purple-400 ring-purple-500/20",
  student: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/20",
};

function InstitutionCard({ inst }: { inst: Institution }) {
  const joined = inst.userRole && inst.memberStatus === "active";

  return (
    <motion.div
      className="ax-card group relative flex flex-col overflow-hidden"
    >
      {/* Top gradient strip */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${inst.avatar_color}`} />

      <div className="flex flex-1 flex-col gap-4 p-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${inst.avatar_color} text-sm font-bold text-white shadow-lg`}
          >
            {inst.avatar_initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold group-hover:text-emerald-400 transition-colors" style={{ color: "var(--ax-text-primary)" }}>
                {inst.name}
              </h3>
              {inst.is_public ? (
                <Globe className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              ) : (
                <Lock className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              )}
            </div>
            {joined && inst.userRole && (
              <span
                className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${ROLE_BADGE[inst.userRole]}`}
              >
                {inst.userRole}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="line-clamp-2 text-xs leading-relaxed" style={{ color: "var(--ax-text-secondary)" }}>
          {inst.description}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs" style={{ color: "var(--ax-text-faint)" }}>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {inst.member_count.toLocaleString()} members
          </span>
        </div>

        {/* Action */}
        <div className="mt-auto pt-1">
          {joined ? (
            <Link
              href="/campus/my-campus"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600/15 px-4 py-2.5 text-sm font-semibold text-emerald-400 ring-1 ring-emerald-500/20 transition hover:bg-emerald-600/25"
            >
              Enter Group <ChevronRight className="h-4 w-4" />
            </Link>
          ) : inst.is_public ? (
            <Link
              href="/campus/join"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800/80 px-4 py-2.5 text-sm font-semibold text-slate-300 ring-1 ring-slate-700/50 transition hover:bg-slate-700 hover:text-slate-100"
            >
              Join Group
            </Link>
          ) : (
            <Link
              href="/campus/join"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800/50 px-4 py-2.5 text-sm font-semibold text-slate-400 ring-1 ring-slate-700/50 transition hover:bg-slate-700 hover:text-slate-200"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Join with Code
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Create Institution Modal ──────────────────────────────────────────────────

const AVATAR_COLORS = [
  "from-emerald-500 to-teal-600",
  "from-blue-500 to-indigo-600",
  "from-purple-500 to-violet-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-sky-600",
];

function CreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (inst: Institution) => void;
}) {
  const { user } = useUser();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [color, setColor] = useState(AVATAR_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim() || !user) return;
    setSaving(true);
    setErr(null);
    try {
      const inst = await createInstitution({
        owner_id: user.id,
        name: name.trim(),
        description: desc.trim(),
        avatar_initials: makeInitials(name.trim()),
        avatar_color: color,
        is_public: isPublic,
        owner_name: user.fullName ?? user.username ?? "Unknown",
        owner_avatar: makeInitials(user.fullName ?? user.username ?? "?"),
      });
      onCreated(inst);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ border: "1px solid var(--ax-border-light)", background: "var(--ax-surface-2)" }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold" style={{ color: "var(--ax-text-primary)" }}>Create Group</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Group Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Stanford CS Hub"
              className="ax-input h-10 w-full rounded-xl px-3"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Description
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder="What is this campus for?"
              className="ax-input w-full resize-none rounded-xl px-3 py-2.5"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-400">
              Avatar Color
            </label>
            <div className="flex gap-2">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full bg-gradient-to-br ${c} ring-2 ring-offset-2 ring-offset-[var(--ax-surface-0)] transition ${color === c ? "ring-emerald-400" : "ring-transparent"}`}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-200">Public Group</p>
              <p className="text-xs text-slate-500">
                Anyone can discover and join this group
              </p>
            </div>
            <button
              onClick={() => setIsPublic(!isPublic)}
              className={`relative h-6 w-11 rounded-full transition-colors ${isPublic ? "bg-emerald-600" : "bg-slate-700"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isPublic ? "translate-x-5" : "translate-x-0"}`}
              />
            </button>
          </div>

          {err && (
            <p className="rounded-lg bg-rose-950/40 px-3 py-2 text-xs text-rose-400 ring-1 ring-rose-800/40">
              {err}
            </p>
          )}

          {name.trim() && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-sm font-bold text-white shadow-sm`}
              >
                {makeInitials(name)}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">{name}</p>
                <p className="text-xs text-slate-500">
                  {isPublic ? "Public" : "Private"} · You as owner
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={!name.trim() || saving}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {saving ? "Creating…" : "Create Group"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InstitutionsPage() {
  const { user } = useUser();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInstitutions(user?.id ?? null);
      setInstitutions(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load institutions");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = institutions.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase()),
  );

  const myInstitutions = institutions.filter(
    (i) => i.userRole && i.memberStatus === "active",
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Stats row */}
      <div className="mb-8 grid grid-cols-2 gap-4">
        {[
          {
            label: "Groups",
            value: institutions.length,
            icon: Building2,
            color: "text-emerald-400",
          },
          {
            label: "My Groups",
            value: myInstitutions.length,
            icon: Users,
            color: "text-blue-400",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="ax-card-flat flex items-center gap-3 px-4 py-3"
          >
            <Icon className={`h-5 w-5 shrink-0 ${color}`} />
            <div>
              <p className="text-lg font-bold" style={{ color: "var(--ax-text-primary)" }}>
                {loading ? "…" : value}
              </p>
              <p className="text-xs" style={{ color: "var(--ax-text-faint)" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + heading */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Discover Groups</h2>
          <p className="text-sm" style={{ color: "var(--ax-text-secondary)" }}>
            Browse public groups or join with an invite code
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups…"
            className="ax-input h-10 w-full rounded-xl !pl-10 pr-4"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-900/40 bg-rose-950/20 py-16 text-center">
          <p className="text-sm font-medium text-rose-400">{error}</p>
          <button
            onClick={load}
            className="mt-4 rounded-lg bg-rose-500/15 px-4 py-2 text-xs font-semibold text-rose-400 ring-1 ring-rose-500/20 transition hover:bg-rose-500/25"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-900/30 py-20 text-center">
          <Building2 className="mb-3 h-10 w-10 text-slate-700" />
          <p className="text-sm font-medium text-slate-400">No groups found</p>
          <p className="mt-1 text-xs text-slate-500">
            Try a different search or join via invite code
          </p>
          <Link
            href="/campus/join"
            className="mt-5 flex items-center gap-2 rounded-lg bg-emerald-600/15 px-4 py-2 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/20 transition hover:bg-emerald-600/25"
          >
            <KeyRound className="h-3.5 w-3.5" /> Join with Code
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((inst) => (
            <InstitutionCard key={inst.id} inst={inst} />
          ))}

          {/* Create institution card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700/60 bg-transparent p-8 text-center transition hover:border-indigo-500/50"
          >
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800/80 ring-1 ring-slate-700/50 shadow-sm">
              <Sparkles className="h-5 w-5 text-indigo-400" />
            </div>
            <p className="text-sm font-medium text-slate-200">
              Create Institution
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Set up your own campus space
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 rounded-lg bg-emerald-600/15 px-4 py-2 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/20 transition hover:bg-emerald-600/25"
            >
              Get Started
            </button>
          </motion.div>
        </div>
      )}

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateModal
            onClose={() => setShowCreate(false)}
            onCreated={(inst) => {
              setInstitutions((prev) => [inst, ...prev]);
              setShowCreate(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
