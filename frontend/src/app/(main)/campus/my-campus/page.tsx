"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ClipboardList,
  Megaphone,
  Users,
  Pin,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Star,
  ChevronLeft,
  GraduationCap,
  Globe,
  Lock,
  BookOpen,
  Loader2,
  Plus,
  Paperclip,
  FileText,
  Image as ImageIcon,
  X,
  Upload,
  Download,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import {
  fetchMyInstitutions,
  fetchAssignments,
  fetchAnnouncements,
  fetchMembers,
  createAssignment,
  createAnnouncement,
  uploadCampusFile,
  submitAssignment,
  fetchSubmissions,
  gradeSubmission,
  removeMember,
  promoteMember,
  timeAgo,
  daysUntil,
  type Institution,
  type Assignment,
  type Announcement,
  type CampusMember,
  type Submission,
} from "@/lib/campus";

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "assignments", label: "Assignments", icon: ClipboardList },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "members", label: "Members", icon: Users },
] as const;
type TabId = (typeof TABS)[number]["id"];

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  upcoming: {
    label: "Upcoming",
    icon: Clock,
    color: "text-blue-400 bg-blue-500/10 ring-blue-500/20",
  },
  submitted: {
    label: "Submitted",
    icon: CheckCircle2,
    color: "text-emerald-400 bg-emerald-500/10 ring-emerald-500/20",
  },
  graded: {
    label: "Graded",
    icon: Star,
    color: "text-amber-400 bg-amber-500/10 ring-amber-500/20",
  },
  overdue: {
    label: "Overdue",
    icon: AlertTriangle,
    color: "text-rose-400 bg-rose-500/10 ring-rose-500/20",
  },
};

const ROLE_BADGE: Record<string, string> = {
  owner: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20",
  admin: "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/20",
  instructor: "bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/20",
  student: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function AssignmentRow({
  asgn,
  onSubmit,
  isAdmin,
  onGrade,
}: {
  asgn: Assignment;
  onSubmit?: () => void;
  isAdmin?: boolean;
  onGrade?: () => void;
}) {
  const cfg = STATUS_CONFIG[asgn.status];
  const Icon = cfg.icon;
  const days = daysUntil(asgn.due_date);
  const isSubmitted = asgn.status === "submitted" || asgn.status === "graded";
  const canSubmit = onSubmit && (asgn.status === "upcoming" || asgn.status === "overdue");

  function viewFile(url: string, name?: string) {
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(
        `<!DOCTYPE html><html><head><title>${name ?? "File"}</title><style>body{margin:0;background:#111;}iframe,img{width:100vw;height:100vh;border:none;object-fit:contain;}</style></head><body><iframe src="${url}"></iframe></body></html>`
      );
      w.document.close();
    }
  }

  function downloadFile(url: string, name: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  }

  return (
    <div className={`flex flex-col overflow-hidden rounded-2xl border bg-slate-900/50 transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.1)] ${isSubmitted ? "border-emerald-500/30" : asgn.status === "overdue" ? "border-rose-500/30" : "border-slate-800/60"
      }`}>
      {/* Accent stripe */}
      <div className={`h-1 w-full ${isSubmitted ? "bg-emerald-500" : asgn.status === "overdue" ? "bg-rose-500" : asgn.status === "graded" ? "bg-amber-400" : "bg-gradient-to-r from-indigo-500 to-purple-500"
        }`} />

      <div className="flex flex-col gap-3 p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-100">{asgn.title}</p>
              <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${cfg.color}`}>
                <Icon className="h-3 w-3" />
                {cfg.label}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">{asgn.description ? asgn.description.slice(0, 60) : ''}</p>
            {asgn.description && (
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400 line-clamp-2">{asgn.description}</p>
            )}
          </div>
          {/* Score / due info */}
          <div className="shrink-0 text-right">
            {asgn.status === "graded" && asgn.score !== undefined ? (
              <p className="text-sm font-bold text-amber-400">{asgn.score}<span className="text-xs font-normal text-slate-500">/{asgn.max_points}</span></p>
            ) : (
              <p className={`text-xs font-semibold ${days < 0 ? "text-rose-400" : days <= 3 ? "text-amber-400" : "text-slate-500"
                }`}>
                {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d left`}
              </p>
            )}
            <p className="text-[10px] text-slate-500">{asgn.max_points} pts</p>
          </div>
        </div>

        {/* Admin's assignment attachment */}
        {asgn.file_url && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/40 px-3 py-2.5">
            {asgn.file_type === "pdf" ? (
              <FileText className="h-4 w-4 shrink-0 text-rose-400" />
            ) : (
              <ImageIcon className="h-4 w-4 shrink-0 text-indigo-400" />
            )}
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-300">Assignment Attachment</span>
            <div className="flex shrink-0 gap-1.5">
              <button
                onClick={() => viewFile(asgn.file_url!, "assignment")}
                className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:bg-slate-700 hover:text-slate-100"
              >
                <Eye className="h-3 w-3" /> View
              </button>
              <button
                onClick={() => downloadFile(asgn.file_url!, `assignment.${asgn.file_type ?? "pdf"}`)}
                className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:bg-slate-700 hover:text-slate-100"
              >
                <Download className="h-3 w-3" /> Download
              </button>
            </div>
          </div>
        )}

        {/* Student's own submission (submitted / graded) */}
        {isSubmitted && asgn.submission_file_url ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20">
                <FileText className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-emerald-300">My Submission</p>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Submitted
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => viewFile(asgn.submission_file_url!, "My Submission")}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
              >
                <Eye className="h-3 w-3" /> View PDF
              </button>
              <button
                onClick={() => downloadFile(asgn.submission_file_url!, `my-submission.${asgn.submission_file_type ?? "pdf"}`)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
              >
                <Download className="h-3 w-3" /> Download
              </button>
            </div>
          </div>
        ) : canSubmit ? (
          /* Planner-style Attach PDF & Turn In button */
          <button
            onClick={onSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-700 bg-slate-800/40 px-4 py-3 text-sm font-semibold text-slate-400 transition hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400"
          >
            <Upload className="h-4 w-4" />
            Attach PDF &amp; Turn In
          </button>
        ) : isAdmin && onGrade ? (
          /* Admin — grade submissions button */
          <button
            onClick={onGrade}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5 text-xs font-semibold text-indigo-400 transition hover:bg-indigo-500/20"
          >
            <Star className="h-3.5 w-3.5" /> Grade Submissions
          </button>
        ) : null}
      </div>
    </div>
  );
}

function AnnouncementCard({ ann }: { ann: Announcement }) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-5 transition ${ann.pinned ? "border-emerald-500/40 bg-emerald-950/20" : "border-slate-800/60 bg-slate-900/50 hover:border-slate-700 hover:shadow-[0_0_15px_rgba(99,102,241,0.08)]"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-300 ring-1 ring-slate-700/50">
            {ann.author_avatar}
          </div>
          <div>
            <p className="text-xs font-medium text-slate-300">
              {ann.author_name}
            </p>
            <p className="text-[10px] text-slate-500">
              {timeAgo(ann.created_at)}
            </p>
          </div>
        </div>
        {ann.pinned && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
            <Pin className="h-3 w-3" /> Pinned
          </span>
        )}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-100">{ann.title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">{ann.body}</p>
      </div>
      {ann.attachment_url &&
        (ann.attachment_type === "image" ? (
          <a
            href={ann.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-xl border border-slate-700/60"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ann.attachment_url}
              alt="attachment"
              className="max-h-64 w-full object-cover transition hover:opacity-90"
            />
          </a>
        ) : (
          <a
            href={ann.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-2 text-xs text-slate-300 transition hover:border-slate-600 hover:text-slate-100"
          >
            <FileText className="h-3.5 w-3.5 shrink-0 text-rose-400" />
            <span className="truncate">View attachment (PDF)</span>
            <Paperclip className="ml-auto h-3 w-3 shrink-0 text-slate-500" />
          </a>
        ))}
    </div>
  );
}
function MemberRow({
  member,
  isAdmin,
  currentUserId,
  onRemove,
  onPromote,
  onDemote,
}: {
  member: CampusMember;
  isAdmin?: boolean;
  currentUserId?: string;
  onRemove?: (m: CampusMember) => void;
  onPromote?: (m: CampusMember) => void;
  onDemote?: (m: CampusMember) => void;
}) {
  const canRemove =
    isAdmin &&
    onRemove &&
    member.user_id !== currentUserId &&
    member.role !== "owner";

  const canPromote =
    isAdmin &&
    onPromote &&
    member.user_id !== currentUserId &&
    member.role !== "owner" &&
    member.role !== "admin";

  const PROMOTE_NEXT: Record<string, "instructor" | "admin"> = {
    student: "instructor",
    instructor: "admin",
  };

  const canDemote =
    isAdmin &&
    onDemote &&
    member.user_id !== currentUserId &&
    member.role !== "owner" &&
    member.role !== "student";

  const DEMOTE_NEXT: Record<string, "student" | "instructor"> = {
    admin: "instructor",
    instructor: "student",
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-800/60 bg-slate-900/40 px-4 py-3 transition hover:border-indigo-500/40 hover:bg-slate-800/60">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300 ring-1 ring-slate-700/50">
        {member.avatar_initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-200">
          {member.name}
        </p>
        <p className="text-xs text-slate-500">{timeAgo(member.joined_at)}</p>
      </div>
      <div className="flex items-center gap-2">
        {member.status === "pending" && (
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 ring-1 ring-amber-500/20">
            Pending
          </span>
        )}
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_BADGE[member.role]}`}
        >
          {member.role}
        </span>
        {canPromote && (
          <button
            onClick={() => onPromote!(member)}
            className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-400 transition hover:bg-indigo-500/20"
            title={`Promote to ${PROMOTE_NEXT[member.role]}`}
          >
            ↑ Promote
          </button>
        )}
        {canDemote && (
          <button
            onClick={() => onDemote!(member)}
            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400 transition hover:bg-rose-500/20"
            title={`Demote to ${DEMOTE_NEXT[member.role]}`}
          >
            ↓ Demote
          </button>
        )}
        {canRemove && (
          <button
            onClick={() => onRemove!(member)}
            className="ml-1 rounded-lg p-1 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400"
            title="Remove member"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  institution,
  assignments,
  announcements,
  onTabChange,
}: {
  institution: Institution;
  assignments: Assignment[];
  announcements: Announcement[];
  onTabChange: (tab: TabId) => void;
}) {
  const upcoming = assignments
    .filter((a) => a.status === "upcoming" || a.status === "overdue")
    .slice(0, 3);
  const pinned = announcements.filter((a) => a.pinned);

  return (
    <div className="flex flex-col gap-6">
      {/* Institution banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/50 p-6 shadow-[0_0_20px_rgba(99,102,241,0.05)]">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br ${institution.avatar_color} text-base font-bold text-white shadow-lg`}
          >
            {institution.avatar_initials}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              {institution.name}
            </h2>
            <p className="text-sm text-slate-400">{institution.description}</p>
          </div>
        </div>
        <div className="mt-5 flex gap-5 text-sm">
          <div>
            <p className="text-lg font-bold text-slate-200">
              {institution.member_count.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500">Members</p>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-200">
              {assignments.length}
            </p>
            <p className="text-xs text-slate-500">Assignments</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming assignments */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-300">
              Upcoming / Overdue
            </h3>
            <button
              onClick={() => onTabChange("assignments")}
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              View all →
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {upcoming.map((a) => (
              <AssignmentRow key={a.id} asgn={a} />
            ))}
          </div>
        </div>

        {/* Pinned announcements */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-300">
              Pinned Announcements
            </h3>
            <button
              onClick={() => onTabChange("announcements")}
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              View all →
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {pinned.map((a) => (
              <AnnouncementCard key={a.id} ann={a} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Create Assignment Modal ──────────────────────────────────────────────────

function CreateAssignmentModal({
  group,
  members,
  user,
  onClose,
  onCreated,
}: {
  group: Institution;
  members: CampusMember[];
  user: { id: string };
  onClose: () => void;
  onCreated: (a: Assignment) => void;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [maxPoints, setMaxPoints] = useState(100);
  const [assignToAll, setAssignToAll] = useState(true);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const activeMembers = members.filter(
    (m) => m.status === "active" && m.user_id !== user.id,
  );

  const toggleMember = (uid: string) =>
    setSelectedMembers((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid],
    );

  const handleSubmit = async () => {
    if (!title.trim() || !dueDate) {
      setErr("Title and due date are required.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      let fileUrl: string | null = null;
      let fileType: string | null = null;
      if (file) {
        const up = await uploadCampusFile(file, "assignments", group.id);
        fileUrl = up.url;
        fileType = up.type;
      }
      const assigned = assignToAll
        ? null
        : selectedMembers.length > 0
          ? selectedMembers
          : null;
      const a = await createAssignment({
        institution_id: group.id,
        title: title.trim(),
        description: desc.trim(),
        due_date: new Date(dueDate).toISOString(),
        max_points: maxPoints,
        file_url: fileUrl,
        file_type: fileType,
        assigned_to: assigned,
      });
      onCreated(a);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create assignment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700/60 bg-slate-900 p-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] max-h-[90vh]"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">New Assignment</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Title *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 3 Review"
              className="h-10 w-full rounded-xl border border-slate-700/60 bg-slate-800/60 px-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Instructions
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder="Describe the assignment…"
              className="w-full rounded-xl border border-slate-700/60 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 resize-none"
            />
          </div>

          {/* Due date + Points */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500">
                Due Date *
              </label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-800 focus:border-emerald-500/60 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500">
                Max Points
              </label>
              <input
                type="number"
                value={maxPoints}
                onChange={(e) => setMaxPoints(Number(e.target.value))}
                min={1}
                max={1000}
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-800 focus:border-emerald-500/60 focus:outline-none"
              />
            </div>
          </div>

          {/* File upload */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">
              Attachment (PDF or Image)
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                {file.type === "application/pdf" ? (
                  <FileText className="h-4 w-4 shrink-0 text-rose-400" />
                ) : (
                  <ImageIcon className="h-4 w-4 shrink-0 text-blue-400" />
                )}
                <span className="min-w-0 flex-1 truncate text-xs text-zinc-600">
                  {file.name}
                </span>
                <button
                  onClick={() => setFile(null)}
                  className="shrink-0 text-zinc-400 hover:text-zinc-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-200 bg-white text-xs text-zinc-400 transition hover:border-zinc-400 hover:text-zinc-700"
              >
                <Upload className="h-3.5 w-3.5" /> Click to attach file
              </button>
            )}
          </div>

          {/* Assign to */}
          <div>
            <label className="mb-2 block text-xs font-medium text-zinc-500">
              Assign To
            </label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setAssignToAll(true)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${assignToAll
                  ? "bg-emerald-600/20 text-emerald-400 ring-1 ring-emerald-500/30"
                  : "bg-zinc-100 text-zinc-500 hover:text-zinc-700"
                  }`}
              >
                Everyone
              </button>
              <button
                onClick={() => setAssignToAll(false)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${!assignToAll
                  ? "bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30"
                  : "bg-zinc-100 text-zinc-500 hover:text-zinc-700"
                  }`}
              >
                Specific Members
              </button>
            </div>
            {!assignToAll && (
              <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-2">
                {activeMembers.length === 0 ? (
                  <p className="py-2 text-center text-xs text-zinc-400">
                    No other members
                  </p>
                ) : (
                  activeMembers.map((m) => (
                    <label
                      key={m.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-zinc-100"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(m.user_id)}
                        onChange={() => toggleMember(m.user_id)}
                        className="h-3.5 w-3.5 accent-emerald-500"
                      />
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-300 text-[10px] font-bold text-zinc-600">
                        {m.avatar_initials}
                      </div>
                      <span className="text-xs text-zinc-600">{m.name}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          {err && (
            <p className="rounded-lg bg-rose-950/40 px-3 py-2 text-xs text-rose-400 ring-1 ring-rose-800/40">
              {err}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim() || !dueDate}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {saving ? "Creating…" : "Create Assignment"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Post Announcement Modal ──────────────────────────────────────────────────

function PostAnnouncementModal({
  group,
  user,
  onClose,
  onPosted,
}: {
  group: Institution;
  user: {
    id: string;
    fullName?: string | null;
    username?: string | null;
    imageUrl?: string;
  };
  onClose: () => void;
  onPosted: (a: Announcement) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const authorName = user.fullName ?? user.username ?? "Admin";
  const authorAvatarInitials = authorName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) {
      setErr("Title and body are required.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      let attachmentUrl: string | null = null;
      let attachmentType: string | null = null;
      if (file) {
        const up = await uploadCampusFile(file, "announcements", group.id);
        attachmentUrl = up.url;
        attachmentType = up.type;
      }
      const ann = await createAnnouncement({
        institution_id: group.id,
        author_id: user.id,
        author_name: authorName,
        author_avatar: authorAvatarInitials,
        title: title.trim(),
        body: body.trim(),
        pinned,
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
      });
      onPosted(ann);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to post announcement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl max-h-[90vh]"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-900">
            Post Announcement
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">
              Title *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement title…"
              className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-emerald-500/60 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">
              Message *
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Write your announcement…"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-emerald-500/60 focus:outline-none resize-none"
            />
          </div>

          {/* File upload */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">
              Attachment (PDF or Image)
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                {file.type === "application/pdf" ? (
                  <FileText className="h-4 w-4 shrink-0 text-rose-400" />
                ) : (
                  <ImageIcon className="h-4 w-4 shrink-0 text-blue-400" />
                )}
                <span className="min-w-0 flex-1 truncate text-xs text-zinc-600">
                  {file.name}
                </span>
                <button
                  onClick={() => setFile(null)}
                  className="shrink-0 text-zinc-400 hover:text-zinc-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-200 bg-white text-xs text-zinc-400 transition hover:border-zinc-400 hover:text-zinc-700"
              >
                <Upload className="h-3.5 w-3.5" /> Click to attach PDF or image
              </button>
            )}
          </div>

          {/* Pin toggle */}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
            <div>
              <p className="text-sm font-medium text-zinc-800">Pin to top</p>
              <p className="text-xs text-zinc-400">
                Pinned announcements appear first
              </p>
            </div>
          </label>

          {err && (
            <p className="rounded-lg bg-rose-950/40 px-3 py-2 text-xs text-rose-400 ring-1 ring-rose-800/40">
              {err}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim() || !body.trim()}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Megaphone className="h-4 w-4" />
            )}
            {saving ? "Posting…" : "Post Announcement"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Submit Assignment Modal ──────────────────────────────────────────────────

function SubmitAssignmentModal({
  asgn,
  group,
  user,
  onClose,
  onSubmitted,
}: {
  asgn: Assignment;
  group: Institution;
  user: { id: string; fullName?: string | null; username?: string | null };
  onClose: () => void;
  onSubmitted: (asgnId: string, fileUrl: string, fileType: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const authorName = user.fullName ?? user.username ?? "Member";
  const authorAvatar = authorName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSubmit = async () => {
    if (!file) {
      setErr("Please attach your completed work (PDF or image).");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const up = await uploadCampusFile(file, "assignments", group.id);
      await submitAssignment(asgn.id, user.id, {
        file_url: up.url,
        file_type: up.type,
        user_name: authorName,
        user_avatar: authorAvatar,
      });
      onSubmitted(asgn.id, up.url, up.type);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md rounded-2xl border border-slate-700/60 bg-slate-900 p-6 shadow-[0_0_30px_rgba(0,0,0,0.5)]"
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-100">
              Submit Assignment
            </h2>
            <p className="mt-0.5 text-xs text-slate-400 truncate max-w-65">
              {asgn.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
            <p>
              Upload your completed work as a{" "}
              <span className="text-zinc-800">PDF or image</span>. This will be
              sent to the group owner.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">
              Your Work (PDF or Image) *
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/40 px-3 py-2.5">
                {file.type === "application/pdf" ? (
                  <FileText className="h-4 w-4 shrink-0 text-rose-400" />
                ) : (
                  <ImageIcon className="h-4 w-4 shrink-0 text-indigo-400" />
                )}
                <span className="min-w-0 flex-1 truncate text-xs text-slate-300">
                  {file.name}
                </span>
                <button
                  onClick={() => setFile(null)}
                  className="shrink-0 text-slate-400 hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex h-20 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-800/20 text-xs text-slate-500 transition hover:border-emerald-500/50 hover:bg-emerald-500/5 hover:text-emerald-400"
              >
                <Upload className="h-5 w-5" />
                Click to attach your completed work
              </button>
            )}
          </div>

          {err && (
            <p className="rounded-lg bg-rose-950/40 px-3 py-2 text-xs text-rose-400 ring-1 ring-rose-800/40">
              {err}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving || !file}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {saving ? "Uploading…" : "Submit Assignment"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Grade Submissions Modal ─────────────────────────────────────────────────

function GradeSubmissionsModal({
  asgn,
  onClose,
}: {
  asgn: Assignment;
  onClose: () => void;
}) {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions(asgn.id)
      .then((data) => {
        setSubs(data);
        const init: Record<string, string> = {};
        data.forEach((s) => { if (s.score !== null) init[s.id] = String(s.score); });
        setScores(init);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [asgn.id]);

  async function handleGrade(subId: string) {
    const raw = scores[subId];
    const score = parseFloat(raw);
    if (isNaN(score) || score < 0 || score > asgn.max_points) {
      setErr(`Score must be 0–${asgn.max_points}`);
      return;
    }
    setSaving((p) => ({ ...p, [subId]: true }));
    setErr(null);
    try {
      await gradeSubmission(subId, score);
      setSaved((p) => ({ ...p, [subId]: true }));
      setSubs((prev) => prev.map((s) => s.id === subId ? { ...s, score, graded: true } : s));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save grade");
    } finally {
      setSaving((p) => ({ ...p, [subId]: false }));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg rounded-2xl border border-slate-700/60 bg-slate-900 shadow-[0_0_30px_rgba(0,0,0,0.5)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-sm font-bold text-slate-100">Grade Submissions</h2>
            <p className="mt-0.5 truncate text-xs text-slate-400 max-w-72">{asgn.title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            </div>
          ) : subs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <FileText className="h-8 w-8 text-slate-600" />
              <p className="text-sm text-slate-400">No submissions yet.</p>
            </div>
          ) : subs.map((sub) => (
            <div key={sub.id} className={`rounded-xl border p-4 space-y-3 ${sub.graded ? "border-emerald-500/30 bg-emerald-500/5" : "border-slate-800 bg-slate-800/40"
              }`}>
              {/* Student info */}
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-[11px] font-bold text-indigo-400 ring-1 ring-indigo-500/30">
                  {sub.user_avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-200">{sub.user_name}</p>
                  <p className="text-[10px] text-slate-500">{timeAgo(sub.submitted_at)}</p>
                </div>
                {sub.graded && (
                  <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 ring-1 ring-emerald-500/30">
                    Graded: {sub.score}/{asgn.max_points}
                  </span>
                )}
              </div>

              {/* Submission file */}
              {sub.file_url && (
                <div className="flex gap-2">
                  <a
                    href={sub.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-[11px] font-medium text-slate-300 transition hover:bg-slate-700 hover:text-slate-100"
                  >
                    <Eye className="h-3 w-3" /> View Submission
                  </a>
                  <a
                    href={sub.file_url}
                    download
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-[11px] font-medium text-slate-300 transition hover:bg-slate-700 hover:text-slate-100"
                  >
                    <Download className="h-3 w-3" /> Download
                  </a>
                </div>
              )}

              {/* Grade input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min={0}
                    max={asgn.max_points}
                    placeholder={`Score (0–${asgn.max_points})`}
                    value={scores[sub.id] ?? ""}
                    onChange={(e) => setScores((p) => ({ ...p, [sub.id]: e.target.value }))}
                    className="h-9 w-full rounded-lg border border-slate-700/60 bg-slate-900 px-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                  />
                </div>
                <button
                  onClick={() => handleGrade(sub.id)}
                  disabled={saving[sub.id] || !scores[sub.id]}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving[sub.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved[sub.id] ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
                  {saved[sub.id] ? "Saved" : "Save Grade"}
                </button>
              </div>
            </div>
          ))}
          {err && (
            <p className="rounded-lg bg-rose-950/40 px-3 py-2 text-xs text-rose-400 ring-1 ring-rose-500/30">{err}</p>
          )}
        </div>

        <div className="border-t border-slate-800 px-6 py-3 text-right">
          <button onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition">
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Assignments Panel ────────────────────────────────────────────────────────

type AssignmentFilter = "All" | "Upcoming" | "Submitted" | "Graded" | "Overdue";
const FILTERS: AssignmentFilter[] = ["All", "Upcoming", "Submitted", "Graded", "Overdue"];

function AssignmentsPanel({
  assignments,
  isAdmin,
  onNewAssignment,
  onSubmit,
}: {
  assignments: Assignment[];
  isAdmin: boolean;
  onNewAssignment: () => void;
  onSubmit: (a: Assignment) => void;
}) {
  const [filter, setFilter] = useState<AssignmentFilter>("All");
  const [gradingAsgn, setGradingAsgn] = useState<Assignment | null>(null);

  const visible = assignments.filter((a) => {
    if (filter === "All") return true;
    return a.status === filter.toLowerCase();
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Filter + action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${filter === f
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                }`}
            >
              {f}
            </button>
          ))}
        </div>
        {isAdmin && (
          <button
            onClick={onNewAssignment}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600/15 px-3 py-1.5 text-xs font-semibold text-emerald-500 ring-1 ring-emerald-500/20 transition hover:bg-emerald-600/25"
          >
            <Plus className="h-3.5 w-3.5" /> New Assignment
          </button>
        )}
      </div>

      {/* Assignment cards */}
      <div className="flex flex-col gap-3">
        {visible.map((a) => (
          <AssignmentRow
            key={a.id}
            asgn={a}
            isAdmin={isAdmin}
            onSubmit={!isAdmin ? () => onSubmit(a) : undefined}
            onGrade={isAdmin ? () => setGradingAsgn(a) : undefined}
          />
        ))}
        {visible.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-800 py-16 text-center">
            <ClipboardList className="h-8 w-8 text-slate-600" />
            <p className="text-sm font-medium text-slate-400">
              {filter === "All" ? "No assignments yet." : `No ${filter.toLowerCase()} assignments.`}
            </p>
          </div>
        )}
      </div>

      {/* Grade modal */}
      <AnimatePresence>
        {gradingAsgn && (
          <GradeSubmissionsModal
            asgn={gradingAsgn}
            onClose={() => setGradingAsgn(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Group Card ───────────────────────────────────────────────────────────────

function GroupCard({
  group,
  onClick,
}: {
  group: Institution;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex flex-col gap-4 rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5 text-left transition hover:border-emerald-500/40 hover:bg-slate-800 w-full hover:shadow-[0_0_15px_rgba(99,102,241,0.08)]"
    >
      {/* Avatar + name row */}
      <div className="flex items-start gap-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br ${group.avatar_color} text-sm font-bold text-white shadow-md`}
        >
          {group.avatar_initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-bold text-slate-100">
              {group.name}
            </h3>
            {group.is_public ? (
              <Globe className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            ) : (
              <Lock className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-400 line-clamp-2">
            {group.description}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-700/60 bg-slate-800/40 p-3">
        {[
          { label: "Members", value: group.member_count, icon: Users },
          {
            label: "Assignments",
            value: group.assignment_count ?? 0,
            icon: ClipboardList,
          },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <Icon className="h-3.5 w-3.5 text-slate-500" />
            <p className="text-base font-bold text-slate-200">{value}</p>
            <p className="text-[10px] text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Role badge */}
      {group.userRole && (
        <div className="flex items-center justify-between">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${{
              owner:
                "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30",
              admin: "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30",
              instructor:
                "bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30",
              student:
                "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
            }[group.userRole]
              }`}
          >
            {group.userRole}
          </span>
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            Open <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
          </span>
        </div>
      )}
    </motion.button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyGroupsPage() {
  const { user } = useUser();

  // ── List state ──
  const [groups, setGroups] = useState<Institution[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // ── Selected group / detail state ──
  const [selected, setSelected] = useState<Institution | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [members, setMembers] = useState<CampusMember[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ── Modal state ──
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [showPostAnnouncement, setShowPostAnnouncement] = useState(false);
  const [submitForAsgn, setSubmitForAsgn] = useState<Assignment | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isAdmin =
    selected?.userRole === "owner" || selected?.userRole === "admin";

  // Load all groups
  const loadGroups = useCallback(async () => {
    if (!user?.id) return;
    setLoadingGroups(true);
    setListError(null);
    try {
      const data = await fetchMyInstitutions(user.id);
      setGroups(data);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to load groups");
    } finally {
      setLoadingGroups(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Load detail data when a group is selected
  const openGroup = useCallback(
    async (group: Institution) => {
      setSelected(group);
      setActiveTab("overview");
      setAssignments([]);
      setAnnouncements([]);
      setMembers([]);
      if (!user?.id) return;
      setLoadingDetail(true);
      try {
        const [a, ann, m] = await Promise.all([
          fetchAssignments(group.id, user.id, group.userRole),
          fetchAnnouncements(group.id),
          fetchMembers(group.id),
        ]);
        setAssignments(a);
        setAnnouncements(ann);
        setMembers(m);
      } catch (e) {
        console.error("Detail load error:", e);
      } finally {
        setLoadingDetail(false);
      }
    },
    [user?.id],
  );

  // ── Empty / loading states ──────────────────────────────────────────────

  if (loadingGroups) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (listError) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-sm text-rose-400">{listError}</p>
        <button
          onClick={loadGroups}
          className="mt-4 rounded-lg bg-rose-500/15 px-4 py-2 text-xs font-semibold text-rose-400 ring-1 ring-rose-500/20 transition hover:bg-rose-500/25"
        >
          Retry
        </button>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 ring-1 ring-slate-700">
          <GraduationCap className="h-8 w-8 text-slate-500" />
        </div>
        <h2 className="text-lg font-bold text-slate-100">
          You haven&apos;t joined a group yet
        </h2>
        <p className="mt-2 max-w-sm text-sm text-slate-400">
          Browse groups and join one to access assignments, announcements and
          more.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/campus"
            className="rounded-xl bg-emerald-600/20 px-5 py-2.5 text-sm font-semibold text-emerald-400 ring-1 ring-emerald-500/30 transition hover:bg-emerald-600/30 hover:text-emerald-300"
          >
            Browse Groups
          </Link>
          <Link
            href="/campus/join"
            className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-300 ring-1 ring-slate-700 transition hover:bg-slate-700"
          >
            Join with Code
          </Link>
        </div>
      </div>
    );
  }

  // ── Detail View ─────────────────────────────────────────────────────────

  if (selected) {
    return (
      <>
        {/* Modals */}
        <AnimatePresence>
          {showCreateAssignment && user && (
            <CreateAssignmentModal
              group={selected}
              members={members}
              user={user}
              onClose={() => setShowCreateAssignment(false)}
              onCreated={(a) => setAssignments((prev) => [...prev, a])}
            />
          )}
          {showPostAnnouncement && user && (
            <PostAnnouncementModal
              group={selected}
              user={user}
              onClose={() => setShowPostAnnouncement(false)}
              onPosted={(a) => setAnnouncements((prev) => [a, ...prev])}
            />
          )}
          {submitForAsgn && user && (
            <SubmitAssignmentModal
              asgn={submitForAsgn}
              group={selected}
              user={user}
              onClose={() => setSubmitForAsgn(null)}
              onSubmitted={(asgnId, fileUrl, fileType) => {
                setAssignments((prev) =>
                  prev.map((a) =>
                    a.id === asgnId
                      ? {
                        ...a,
                        status: "submitted" as const,
                        submission_file_url: fileUrl,
                        submission_file_type: fileType,
                      }
                      : a,
                  ),
                );
                setSuccessMsg(
                  "Assignment submitted! The owner can now review your work.",
                );
                setTimeout(() => setSuccessMsg(null), 5000);
              }}
            />
          )}
        </AnimatePresence>
        {/* Success toast */}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-2xl border border-emerald-700/40 bg-emerald-950/90 px-5 py-3 shadow-xl backdrop-blur-sm"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              <p className="text-sm font-medium text-emerald-200">
                {successMsg}
              </p>
              <button
                onClick={() => setSuccessMsg(null)}
                className="ml-2 text-emerald-400 hover:text-emerald-200"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="mx-auto max-w-6xl px-6 py-6">
          {/* Back + group header */}
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={() => setSelected(null)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-slate-800/60 hover:text-slate-200"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> My Groups
            </button>
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br ${selected.avatar_color} text-xs font-bold text-white shadow-md`}
              >
                {selected.avatar_initials}
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-100">
                  {selected.name}
                </h2>
                <p className="text-xs text-slate-500">
                  {selected.member_count} members
                </p>
              </div>
            </div>
          </div>

          {/* Inner Tab Bar */}
          <div className="mb-7 flex gap-1 overflow-x-auto rounded-xl border border-slate-800/60 bg-slate-900/50 p-1 scrollbar-hide shadow-[0_0_15px_rgba(0,0,0,0.2)]">
            {TABS.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`relative flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all
                                    ${isActive ? "text-emerald-100" : "text-slate-400 hover:text-slate-200"}`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="my-groups-tab"
                      className="absolute inset-0 rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/30"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}
                  <Icon
                    className={`relative z-10 h-4 w-4 ${isActive ? "text-emerald-400" : "text-slate-500"}`}
                  />
                  <span className="relative z-10">{label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === "overview" && (
                <OverviewTab
                  institution={selected}
                  assignments={assignments}
                  announcements={announcements}
                  onTabChange={setActiveTab}
                />
              )}

              {activeTab === "assignments" &&
                (loadingDetail ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                  </div>
                ) : (
                  <AssignmentsPanel
                    assignments={assignments}
                    isAdmin={isAdmin}
                    onNewAssignment={() => setShowCreateAssignment(true)}
                    onSubmit={(a) => setSubmitForAsgn(a)}
                  />
                ))}

              {activeTab === "announcements" &&
                (loadingDetail ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {isAdmin && (
                      <button
                        onClick={() => setShowPostAnnouncement(true)}
                        className="flex items-center gap-2 self-end rounded-xl bg-emerald-600/15 px-3 py-1.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/20 transition hover:bg-emerald-600/25"
                      >
                        <Plus className="h-3.5 w-3.5" /> Post Announcement
                      </button>
                    )}
                    {announcements.map((a) => (
                      <AnnouncementCard key={a.id} ann={a} />
                    ))}
                    {announcements.length === 0 && (
                      <p className="py-12 text-center text-sm text-zinc-400">
                        No announcements yet.
                      </p>
                    )}
                  </div>
                ))}

              {activeTab === "members" &&
                (loadingDetail ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm text-zinc-400">
                        {members.length} members
                      </p>
                      <span className="text-xs text-zinc-400">
                        {members.filter((m) => m.status === "pending").length}{" "}
                        pending approval
                      </span>
                    </div>
                    {members.map((m) => (
                      <MemberRow
                        key={m.id}
                        member={m}
                        isAdmin={isAdmin}
                        currentUserId={user?.id}
                        onPromote={async (member) => {
                          const next: Record<string, "instructor" | "admin"> = {
                            student: "instructor",
                            instructor: "admin",
                          };
                          const newRole = next[member.role];
                          if (!newRole) return;
                          try {
                            await promoteMember(member.id, newRole);
                            setMembers((prev) =>
                              prev.map((x) => x.id === member.id ? { ...x, role: newRole } : x)
                            );
                          } catch { /* ignore */ }
                        }}
                        onDemote={async (member) => {
                          const next: Record<string, "student" | "instructor"> = {
                            admin: "instructor",
                            instructor: "student",
                          };
                          const newRole = next[member.role];
                          if (!newRole) return;
                          try {
                            await promoteMember(member.id, newRole); // API only updates role, so promoteMember works for demote too
                            setMembers((prev) =>
                              prev.map((x) => x.id === member.id ? { ...x, role: newRole } : x)
                            );
                          } catch { /* ignore */ }
                        }}
                        onRemove={async (member) => {
                          try {
                            await removeMember(member.id);
                            setMembers((prev) => prev.filter((x) => x.id !== member.id));
                          } catch {
                            /* ignore */
                          }
                        }}
                      />
                    ))}
                    {members.length === 0 && (
                      <p className="py-12 text-center text-sm text-slate-500">
                        No members yet.
                      </p>
                    )}
                  </div>
                ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </>
    );
  }

  // ── List View ───────────────────────────────────────────────────────────

  return (
    <>
      {/* Modals */}
      <AnimatePresence>
        {showCreateAssignment && selected && user && (
          <CreateAssignmentModal
            group={selected}
            members={members}
            user={user}
            onClose={() => setShowCreateAssignment(false)}
            onCreated={(a) => setAssignments((prev) => [...prev, a])}
          />
        )}
        {showPostAnnouncement && selected && user && (
          <PostAnnouncementModal
            group={selected}
            user={user}
            onClose={() => setShowPostAnnouncement(false)}
            onPosted={(a) => setAnnouncements((prev) => [a, ...prev])}
          />
        )}
      </AnimatePresence>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100">My Groups</h2>
            <p className="text-sm text-slate-400">
              {groups.length} group{groups.length !== 1 ? "s" : ""} you belong
              to
            </p>
          </div>
          <Link
            href="/campus/join"
            className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/30 transition hover:bg-emerald-500/20"
          >
            + Join a Group
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} onClick={() => openGroup(g)} />
          ))}
        </div>
      </div>
    </>
  );
}
