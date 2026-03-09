"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusCircle,
  KeyRound,
  Users,
  Settings,
  LayoutDashboard,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Copy,
  Check,
  Loader2,
  Trash2,
  Globe,
  Lock,
  BookOpen,
  ClipboardList,
  ShieldCheck,
  AlertTriangle,
  FileText,
  BadgeCheck,
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import {
  fetchOwnedInstitutions,
  fetchAssignments,
  fetchSubmissions,
  createInstitution,
  fetchMembers,
  approveMember,
  rejectMember,
  regenerateInviteCode,
  updateInstitution,
  makeInitials,
  type Institution,
  type CampusMember,
  type Assignment,
  type Submission,
} from "@/lib/campus";

// --- Constants ----------------------------------------------------------------

const AVATAR_COLORS = [
  "from-emerald-500 to-teal-600",
  "from-blue-500 to-indigo-600",
  "from-purple-500 to-violet-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-sky-600",
];

const ROLE_BADGE: Record<string, string> = {
  owner: "bg-amber-500/15 text-amber-400 ring-amber-500/20",
  admin: "bg-blue-500/15 text-blue-400 ring-blue-500/20",
  instructor: "bg-purple-500/15 text-purple-400 ring-purple-500/20",
  student: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/20",
};

const MANAGE_TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "submissions", label: "Submissions", icon: ClipboardList },
  { id: "requests", label: "Requests", icon: ShieldCheck },
  { id: "members", label: "Members", icon: Users },
  { id: "settings", label: "Settings", icon: Settings },
] as const;
type ManageTab = (typeof MANAGE_TABS)[number]["id"];

// --- Create Institution Form --------------------------------------------------

function CreateForm({ onCreated }: { onCreated: (inst: Institution) => void }) {
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
        owner_name: user.fullName ?? user.username ?? "Owner",
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
    <div className="mx-auto max-w-xl px-6 py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-600/20 to-teal-400/10 ring-1 ring-emerald-500/20">
          <PlusCircle className="h-7 w-7 text-emerald-400" />
        </div>
        <h1 className="text-xl font-bold text-slate-100">Create Your Group</h1>
        <p className="mt-2 text-sm text-slate-500">
          Set up a campus space — you&apos;ll be the owner and can manage everything
        </p>
      </div>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-5">
          {/* Institution Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">
              Group Name *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Stanford CS Hub"
              className="h-11 w-full rounded-xl border border-slate-700/60 bg-slate-800/50 px-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">
              Description
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder="What is this campus for? Who should join?"
              className="w-full resize-none rounded-xl border border-slate-700/60 bg-slate-800/50 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            />
          </div>

          {/* Avatar Color */}
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-500">
              Brand Color
            </label>
            <div className="flex gap-3">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full bg-linear-to-br ${c} ring-2 ring-offset-2 ring-offset-slate-900 transition ${color === c
                    ? "ring-emerald-400 scale-110"
                    : "ring-transparent"
                    }`}
                />
              ))}
            </div>
          </div>

          {/* Visibility toggle */}
          <div className="flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-800/50 px-4 py-3.5">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="h-4 w-4 text-emerald-400" />
              ) : (
                <Lock className="h-4 w-4 text-slate-500" />
              )}
              <div>
                <p className="text-sm font-medium text-slate-200">
                  {isPublic ? "Public Group" : "Private Group"}
                </p>
                <p className="text-xs text-slate-500">
                  {isPublic
                    ? "Anyone can discover and request to join"
                    : "Only people with your invite code can join"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsPublic(!isPublic)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${isPublic ? "bg-emerald-600" : "bg-slate-600"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-slate-900/60 shadow transition-transform duration-200 ${isPublic ? "translate-x-5" : "translate-x-0"}`}
              />
            </button>
          </div>

          {/* Preview */}
          {name.trim() && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-800/50 p-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br ${color} text-sm font-bold text-white shadow-lg`}
              >
                {makeInitials(name)}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">{name}</p>
                <p className="text-xs text-slate-500">
                  {isPublic ? "Public" : "Private"} · You as Owner · 1 member
                </p>
              </div>
            </div>
          )}

          {err && (
            <p className="flex items-center gap-2 rounded-lg bg-rose-950/40 px-3 py-2.5 text-xs text-rose-400 ring-1 ring-rose-800/40">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {err}
            </p>
          )}

          <button
            onClick={handleCreate}
            disabled={!name.trim() || saving}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlusCircle className="h-4 w-4" />
            )}
            {saving ? "Creating…" : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Management Dashboard ----------------------------------------------------

function ManageDashboard({
  institution: initialInst,
  onUpdated,
}: {
  institution: Institution;
  onUpdated?: (updated: Institution) => void;
}) {
  const [inst, setInst] = useState(initialInst);
  const [activeTab, setActiveTab] = useState<ManageTab>("overview");
  const [members, setMembers] = useState<CampusMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [expandedAsgn, setExpandedAsgn] = useState<string | null>(null);
  const [submissionsCache, setSubmissionsCache] = useState<
    Record<string, Submission[]>
  >({});
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [actionIds, setActionIds] = useState<Set<string>>(new Set());

  // Settings state
  const [editName, setEditName] = useState(inst.name);
  const [editDesc, setEditDesc] = useState(inst.description);
  const [editPublic, setEditPublic] = useState(inst.is_public);
  const [editColor, setEditColor] = useState(inst.avatar_color);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const data = await fetchMembers(inst.id);
      setMembers(data);
    } catch {
      /* ignore */
    } finally {
      setLoadingMembers(false);
    }
  }, [inst.id]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Load assignments once (for submissions tab)
  useEffect(() => {
    setLoadingAssignments(true);
    fetchAssignments(inst.id, inst.owner_id, "owner")
      .then(setAssignments)
      .catch(() => { })
      .finally(() => setLoadingAssignments(false));
  }, [inst.id, inst.owner_id]);

  async function loadSubmissions(asgnId: string) {
    if (submissionsCache[asgnId]) {
      setExpandedAsgn((prev) => (prev === asgnId ? null : asgnId));
      return;
    }
    setLoadingSubs(true);
    setExpandedAsgn(asgnId);
    try {
      const subs = await fetchSubmissions(asgnId);
      setSubmissionsCache((prev) => ({ ...prev, [asgnId]: subs }));
    } catch {
      setSubmissionsCache((prev) => ({ ...prev, [asgnId]: [] }));
    } finally {
      setLoadingSubs(false);
    }
  }

  const pendingMembers = members.filter((m) => m.status === "pending");
  const activeMembers = members.filter((m) => m.status === "active");

  async function handleApprove(memberId: string) {
    setActionIds((s) => new Set(s).add(memberId));
    try {
      await approveMember(memberId);
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, status: "active" } : m)),
      );
    } finally {
      setActionIds((s) => {
        const n = new Set(s);
        n.delete(memberId);
        return n;
      });
    }
  }

  async function handleReject(memberId: string) {
    setActionIds((s) => new Set(s).add(memberId));
    try {
      await rejectMember(memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } finally {
      setActionIds((s) => {
        const n = new Set(s);
        n.delete(memberId);
        return n;
      });
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm("Remove this member from your group?")) return;
    setActionIds((s) => new Set(s).add(memberId));
    try {
      await rejectMember(memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } finally {
      setActionIds((s) => {
        const n = new Set(s);
        n.delete(memberId);
        return n;
      });
    }
  }

  async function handleCopyCode() {
    await navigator.clipboard.writeText(inst.invite_code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const newCode = await regenerateInviteCode(
        inst.id,
        inst.avatar_initials.slice(0, 4),
      );
      setInst((prev) => ({ ...prev, invite_code: newCode }));
    } finally {
      setRegenerating(false);
    }
  }

  async function handleSaveSettings() {
    setSavingSettings(true);
    setSettingsMsg(null);
    try {
      await updateInstitution(inst.id, {
        name: editName.trim(),
        description: editDesc.trim(),
        is_public: editPublic,
        avatar_color: editColor,
      });
      const updated = {
        ...inst,
        name: editName.trim(),
        description: editDesc.trim(),
        is_public: editPublic,
        avatar_color: editColor,
        avatar_initials: makeInitials(editName.trim()),
      };
      setInst(updated);
      onUpdated?.(updated);
      setSettingsMsg({ type: "ok", text: "Settings saved successfully." });
    } catch (e) {
      setSettingsMsg({
        type: "err",
        text: e instanceof Error ? e.message : "Failed to save.",
      });
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Institution header card */}
      <div
        className={`mb-8 flex items-center gap-5 overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6`}
      >
        <div
          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br ${inst.avatar_color} text-lg font-bold text-white shadow-xl`}
        >
          {inst.avatar_initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-bold text-slate-100">
              {inst.name}
            </h2>
            {inst.is_verified && (
              <span title="Verified Group">
                <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-400" />
              </span>
            )}
            <span
              className={`shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${ROLE_BADGE.owner}`}
            >
              Owner
            </span>
            {inst.is_public ? (
              <Globe className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            ) : (
              <Lock className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            )}
          </div>
          <p className="mt-0.5 text-sm text-slate-500">{inst.description}</p>
          <div className="mt-3 flex gap-5 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {inst.member_count} members
            </span>
            {pendingMembers.length > 0 && (
              <span className="flex items-center gap-1 text-amber-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                {pendingMembers.length} pending
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-900/60 p-1 scrollbar-hide">
        {MANAGE_TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          const hasBadge = id === "requests" && pendingMembers.length > 0;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`relative flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all
                                ${isActive ? "text-slate-100" : "text-slate-500 hover:text-slate-300"}`}
            >
              {isActive && (
                <motion.span
                  layoutId="manage-tab"
                  className="absolute inset-0 rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/30"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                className={`relative z-10 h-4 w-4 ${isActive ? "text-emerald-600" : "text-slate-500"}`}
              />
              <span className="relative z-10">{label}</span>
              {hasBadge && (
                <span className="relative z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-black">
                  {pendingMembers.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {/* -- Overview -- */}
          {activeTab === "overview" && (
            <div className="flex flex-col gap-6">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {[
                  {
                    label: "Total Members",
                    value: activeMembers.length,
                    icon: Users,
                    color: "text-emerald-400",
                  },
                  {
                    label: "Pending Requests",
                    value: pendingMembers.length,
                    icon: ShieldCheck,
                    color: "text-amber-400",
                  },
                  {
                    label: "Assignments",
                    value: "—",
                    icon: ClipboardList,
                    color: "text-purple-400",
                  },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div
                    key={label}
                    className="flex flex-col gap-2 rounded-xl border border-slate-700/60 bg-slate-900/60 p-4"
                  >
                    <Icon className={`h-5 w-5 ${color}`} />
                    <p className="text-2xl font-bold text-slate-100">{value}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                ))}
              </div>

              {/* Invite code panel */}
              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6">
                <div className="mb-4 flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-slate-200">
                    Invite Code
                  </h3>
                </div>
                <p className="mb-4 text-xs text-slate-500">
                  Share this code with people you want to invite. Anyone who
                  enters it on the{" "}
                  <span className="text-slate-400">Join with Code</span> page
                  will be able to{" "}
                  {inst.is_public
                    ? "join directly"
                    : "send a join request for your approval"}
                  .
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-xl border border-emerald-800/30 bg-emerald-950/20 px-5 py-3 text-center">
                    <span className="font-mono text-xl font-bold tracking-[0.25em] text-emerald-300">
                      {inst.invite_code}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800 text-slate-500 transition hover:bg-slate-600 hover:text-slate-100"
                    title="Copy code"
                  >
                    {codeCopied ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="flex h-12 items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800 px-4 text-sm font-medium text-slate-500 transition hover:bg-slate-600 hover:text-slate-100 disabled:opacity-50"
                    title="Generate a new code (old code will stop working)"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`}
                    />
                    <span className="hidden sm:inline">Regenerate</span>
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  ? Regenerating will invalidate the old code immediately.
                </p>
              </div>

              {/* Pending requests preview */}
              {pendingMembers.length > 0 && (
                <div className="rounded-2xl border border-amber-900/30 bg-amber-950/10 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-400">
                      <ShieldCheck className="h-4 w-4" />
                      {pendingMembers.length} Pending Request
                      {pendingMembers.length > 1 ? "s" : ""}
                    </h3>
                    <button
                      onClick={() => setActiveTab("requests")}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      Manage all ?
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {pendingMembers.slice(0, 3).map((m) => (
                      <RequestRow
                        key={m.id}
                        member={m}
                        loading={actionIds.has(m.id)}
                        onApprove={handleApprove}
                        onReject={handleReject}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* -- Submissions -- */}
          {activeTab === "submissions" && (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">
                  Assignment Submissions
                </h3>
                <p className="text-xs text-slate-500">
                  View work submitted by members for each assignment.
                </p>
              </div>
              {loadingAssignments ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                </div>
              ) : assignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-700/60 bg-slate-800/50 py-16 text-center">
                  <ClipboardList className="mb-3 h-10 w-10 text-slate-600" />
                  <p className="text-sm font-medium text-slate-500">
                    No assignments yet
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Create assignments in My Groups to see submissions here
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {assignments.map((asgn) => {
                    const subs = submissionsCache[asgn.id];
                    const isExpanded = expandedAsgn === asgn.id;
                    return (
                      <div
                        key={asgn.id}
                        className="rounded-2xl border border-slate-700/60 bg-slate-900/60 overflow-hidden"
                      >
                        <button
                          onClick={() => loadSubmissions(asgn.id)}
                          className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-800/50"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-200">
                              {asgn.title}
                            </p>
                            <p className="text-xs text-slate-500">
                              Due{" "}
                              {new Date(asgn.due_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            {subs && (
                              <span className="rounded-full bg-emerald-600/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
                                {subs.length} submitted
                              </span>
                            )}
                            <span
                              className={`text-xs text-slate-500 transition ${isExpanded ? "rotate-180" : ""}`}
                            >
                              ?
                            </span>
                          </div>
                        </button>

                        {/* Expanded submissions */}
                        {isExpanded && (
                          <div className="border-t border-slate-700/60 px-5 pb-4">
                            {loadingSubs && !subs ? (
                              <div className="flex justify-center py-6">
                                <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                              </div>
                            ) : !subs || subs.length === 0 ? (
                              <p className="py-6 text-center text-xs text-slate-500">
                                No submissions yet.
                              </p>
                            ) : (
                              <div className="mt-3 flex flex-col gap-2">
                                {subs.map((sub) => (
                                  <div
                                    key={sub.id}
                                    className="flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-800/50 px-3 py-2.5"
                                  >
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-slate-200">
                                      {sub.user_avatar}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-medium text-slate-200">
                                        {sub.user_name}
                                      </p>
                                      <p className="text-[10px] text-slate-500">
                                        Submitted{" "}
                                        {new Date(
                                          sub.submitted_at,
                                        ).toLocaleString()}
                                      </p>
                                    </div>
                                    {sub.file_url ? (
                                      <a
                                        href={sub.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-emerald-700/40 hover:text-emerald-400"
                                      >
                                        {sub.file_type === "pdf" ? (
                                          <FileText className="h-3.5 w-3.5 text-rose-400" />
                                        ) : (
                                          <BookOpen className="h-3.5 w-3.5 text-blue-400" />
                                        )}
                                        View
                                      </a>
                                    ) : (
                                      <span className="rounded-full bg-emerald-600/10 px-2 py-0.5 text-[10px] text-emerald-500 ring-1 ring-emerald-500/20">
                                        submitted
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* -- Requests -- */}
          {activeTab === "requests" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">
                    Join Requests
                  </h3>
                  <p className="text-xs text-slate-500">
                    {pendingMembers.length === 0
                      ? "No pending requests"
                      : `${pendingMembers.length} member${pendingMembers.length > 1 ? "s" : ""} waiting for approval`}
                  </p>
                </div>
                <button
                  onClick={loadMembers}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800 px-3 py-2 text-xs text-slate-500 transition hover:text-slate-100"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </button>
              </div>

              {loadingMembers ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                </div>
              ) : pendingMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-700/60 bg-slate-800/50 py-16 text-center">
                  <CheckCircle2 className="mb-3 h-10 w-10 text-emerald-700" />
                  <p className="text-sm font-medium text-slate-500">
                    All caught up!
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    No pending join requests right now
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {pendingMembers.map((m) => (
                    <RequestRow
                      key={m.id}
                      member={m}
                      loading={actionIds.has(m.id)}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      showDate
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* -- Members -- */}
          {activeTab === "members" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  {activeMembers.length} active member
                  {activeMembers.length !== 1 ? "s" : ""}
                </p>
              </div>

              {loadingMembers ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                </div>
              ) : (
                activeMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-3 transition hover:border-slate-600"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-200">
                      {m.avatar_initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-200">
                        {m.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Joined {new Date(m.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${ROLE_BADGE[m.role]}`}
                    >
                      {m.role}
                    </span>
                    {m.role !== "owner" && (
                      <button
                        onClick={() => handleRemove(m.id)}
                        disabled={actionIds.has(m.id)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800 text-slate-500 transition hover:border-rose-800/40 hover:bg-rose-950/20 hover:text-rose-400 disabled:opacity-40"
                        title="Remove member"
                      >
                        {actionIds.has(m.id) ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* -- Settings -- */}
          {activeTab === "settings" && (
            <div className="mx-auto max-w-lg">
              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6">
                <h3 className="mb-5 text-sm font-semibold text-slate-200">
                  Group Settings
                </h3>

                <div className="flex flex-col gap-5">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">
                      Group Name
                    </label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-700/60 bg-slate-800/50 px-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">
                      Description
                    </label>
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-slate-700/60 bg-slate-800/50 px-3 py-2.5 text-sm text-slate-200 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-slate-500">
                      Brand Color
                    </label>
                    <div className="flex gap-3">
                      {AVATAR_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          className={`h-7 w-7 rounded-full bg-linear-to-br ${c} ring-2 ring-offset-2 ring-offset-slate-900 transition ${editColor === c ? "ring-emerald-400 scale-110" : "ring-transparent"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-800/50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      {editPublic ? (
                        <Globe className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Lock className="h-4 w-4 text-slate-500" />
                      )}
                      <p className="text-sm font-medium text-slate-200">
                        {editPublic ? "Public" : "Private"}
                      </p>
                    </div>
                    <button
                      onClick={() => setEditPublic(!editPublic)}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${editPublic ? "bg-emerald-600" : "bg-slate-600"}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-slate-900/60 shadow transition-transform ${editPublic ? "translate-x-5" : "translate-x-0"}`}
                      />
                    </button>
                  </div>

                  {settingsMsg && (
                    <p
                      className={`rounded-lg px-3 py-2.5 text-xs ring-1 ${settingsMsg.type === "ok"
                        ? "bg-emerald-950/30 text-emerald-400 ring-emerald-800/40"
                        : "bg-rose-950/30 text-rose-400 ring-rose-800/40"
                        }`}
                    >
                      {settingsMsg.text}
                    </p>
                  )}

                  <button
                    onClick={handleSaveSettings}
                    disabled={savingSettings || !editName.trim()}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {savingSettings ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {savingSettings ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// --- Request Row sub-component ------------------------------------------------

function RequestRow({
  member,
  loading,
  onApprove,
  onReject,
  showDate = false,
}: {
  member: CampusMember;
  loading: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  showDate?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-3 transition hover:border-slate-600">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-amber-700/40 to-orange-600/30 text-xs font-bold text-amber-200">
        {member.avatar_initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate text-sm font-medium text-slate-200">
          {member.name}
          {member.is_verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-blue-400" />}
        </p>
        {showDate && (
          <p className="text-xs text-slate-500">
            Requested {new Date(member.joined_at).toLocaleDateString()}
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={() => onApprove(member.id)}
          disabled={loading}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600/15 px-3 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/20 transition hover:bg-emerald-600/25 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          Approve
        </button>
        <button
          onClick={() => onReject(member.id)}
          disabled={loading}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-rose-600/10 px-3 text-xs font-semibold text-rose-400 ring-1 ring-rose-500/20 transition hover:bg-rose-600/20 disabled:opacity-50"
        >
          <XCircle className="h-3.5 w-3.5" />
          Reject
        </button>
      </div>
    </div>
  );
}

// --- Page ---------------------------------------------------------------------

export default function ManagePage() {
  const { user } = useUser();
  const [groups, setGroups] = useState<Institution[] | undefined>(undefined); // undefined = loading
  const [selected, setSelected] = useState<Institution | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const userId = user?.id;
  const load = useCallback(async () => {
    if (!userId) return;
    const list = await fetchOwnedInstitutions(userId);
    setGroups(list);
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // -- Loading --
  if (groups === undefined) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // -- Create form --
  if (showCreate) {
    return (
      <>
        <div className="mx-auto max-w-xl px-6 pt-6">
          <button
            onClick={() => setShowCreate(false)}
            className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-200 transition"
          >
            ? Back to my groups
          </button>
        </div>
        <CreateForm
          onCreated={(inst) => {
            setGroups((prev) => [...(prev ?? []), inst]);
            setShowCreate(false);
            setSelected(inst);
          }}
        />
      </>
    );
  }

  // -- Detail / dashboard --
  if (selected) {
    return (
      <>
        <div className="mx-auto max-w-6xl px-6 pt-6">
          <button
            onClick={() => setSelected(null)}
            className="mb-2 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-200 transition"
          >
            ? All my groups
          </button>
        </div>
        <ManageDashboard
          institution={selected}
          onUpdated={(updated) => {
            setGroups((prev) =>
              prev?.map((g) => (g.id === updated.id ? updated : g)),
            );
            setSelected(updated);
          }}
        />
      </>
    );
  }

  // -- Group list --
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Create & Edit Groups</h1>
          <p className="mt-1 text-sm text-slate-500">
            Select a group to manage, or create a new one
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition hover:bg-emerald-500"
        >
          <PlusCircle className="h-4 w-4" />
          Create New Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-700/60 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 ring-1 ring-zinc-200">
            <PlusCircle className="h-7 w-7 text-slate-500" />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-200">No groups yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Create your first group to get started
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition"
          >
            Create Group
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelected(g)}
              className="flex w-full items-center gap-4 rounded-2xl border border-slate-700/60 bg-slate-900/60 px-5 py-4 text-left transition hover:border-emerald-600/30 hover:bg-slate-800/50"
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br ${g.avatar_color} text-sm font-bold text-white shadow-lg`}
              >
                {g.avatar_initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-100">
                    {g.name}
                  </p>
                  <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400 ring-1 ring-amber-500/20">
                    Owner
                  </span>
                </div>
                <div className="mt-1 flex gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {g.member_count} members
                  </span>
                </div>
              </div>
              <Settings className="h-4 w-4 shrink-0 text-slate-500" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

