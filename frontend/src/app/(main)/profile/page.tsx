"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useUser } from "@/hooks/useUser";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  AlertCircle,
  Award,
  BarChart2,
  BookOpen,
  Bot,
  Brain,
  Camera,
  CalendarDays,
  Check,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Flame,
  HeartHandshake,
  KeyRound,
  Loader2,
  Medal,
  MessageSquare,
  Save,
  School,
  Settings,
  ShieldCheck,
  Target,
  ThumbsUp,
  Trash2,
  TrendingUp,
  Trophy,
  Upload,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
  Zap,
  Shield,
  Circle,
  Sparkles,
  Compass,
  Bookmark,
  Gem,
  Lock,
  Star,
} from "lucide-react";
import { fetchProfile, saveDisplayName, uploadAvatar, saveProfileSettings, checkUsernameAvailable, propagateNameChange } from "@/lib/profile";
import { supabase } from "@/lib/supabase";
import { fetchMyInstitutions, fetchAssignments, type Institution } from "@/lib/campus";
import { computeMilestoneStates, ALL_MILESTONES, type StoredPlan, getPlannerRank, getNextPlannerRank, PLANNER_RANKS } from "@/lib/planner";
import { ALL_LIB_MILESTONES, computeLibraryStats, calcLibXP, type UserStats } from "@/lib/library-milestones";
import { LIBRARY_RANKS, getLibraryRank, getNextLibraryRank } from "@/lib/library-ranks";
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowCounts,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  getFriendsAndRequests,
  getProfileLikeCount,
  type FollowEntry,
  type FriendEntry,
} from "@/lib/social";
import { isAdminSession, adminDeletePost, adminDeleteNote, adminDeleteGroup } from "@/lib/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileTab =
  | "overview"
  | "contributions"
  | "achievements"
  | "activity"
  | "followers"
  | "following"
  | "friends"
  | "settings"
  | "admin";

interface ProfileData {
  forumPosts: {
    id: string;
    title: string;
    created_at: string;
    upvotes_count: number;
    comments_count: number;
    category?: string;
  }[];
  libraryNotes: {
    id: string;
    title: string;
    subject?: string;
    file_url?: string;
    avg_rating?: number;
    downloads_count?: number;
    created_at?: string;
  }[];
  submittedCount: number;
  groupCount: number;
  planCount: number;
  planChapters: number;
  plannerSubmittedCount: number;  // chapters submitted with proof
  plannerMilestoneXP: number;     // XP earned from planner milestones
  libraryMilestoneXP: number;     // XP earned from library milestones
  earnedTitles: { id: string; title: string; source: string }[];
}

// ─── XP helpers ──────────────────────────────────────────────────────────────

function calcXP(d: ProfileData) {
  return (
    calcRep(d) +                    // 1 XP per Forum Reputation point
    d.forumPosts.length * 10 +
    d.libraryNotes.length * 10 +   // 10 XP per note upload (matches library XP model)
    d.submittedCount * 15 +
    d.groupCount * 8 +
    d.planCount * 25 +
    d.plannerSubmittedCount * 5 +   // 5 XP per chapter submitted
    d.plannerMilestoneXP +          // XP from planner achievements
    d.libraryMilestoneXP            // XP from library achievements
  );
}

function calcRep(d: ProfileData) {
  return d.forumPosts.reduce((s, p) => s + (p.upvotes_count ?? 0), 0);
}

// 10-tier title system
const XP_TIERS: { threshold: number; title: string; color: string }[] = [
  { threshold: 0, title: "Newcomer", color: "text-zinc-500" },
  { threshold: 50, title: "Aspirant", color: "text-slate-500" },
  { threshold: 150, title: "Scholar", color: "text-blue-600" },
  { threshold: 350, title: "Researcher", color: "text-indigo-600" },
  { threshold: 700, title: "Academic", color: "text-violet-600" },
  { threshold: 1200, title: "Senior Scholar", color: "text-purple-600" },
  { threshold: 2000, title: "Expert", color: "text-amber-600" },
  { threshold: 3500, title: "Elite Academic", color: "text-orange-600" },
  { threshold: 6000, title: "Distinguished", color: "text-rose-600" },
  { threshold: 10000, title: "Grandmaster", color: "text-yellow-500" },
];

function xpTitle(xp: number): string {
  let title = XP_TIERS[0].title;
  for (const tier of XP_TIERS) {
    if (xp >= tier.threshold) title = tier.title;
    else break;
  }
  return title;
}

function xpTitleColor(xp: number): string {
  let color = XP_TIERS[0].color;
  for (const tier of XP_TIERS) {
    if (xp >= tier.threshold) color = tier.color;
    else break;
  }
  return color;
}

function xpLevel(xp: number): { level: number; current: number; next: number } {
  const thresholds = XP_TIERS.map(t => t.threshold);
  let level = 0;
  for (let i = 0; i < thresholds.length - 1; i++) {
    if (xp >= thresholds[i]) level = i + 1;
  }
  if (xp >= thresholds[thresholds.length - 1]) level = thresholds.length;
  const curThresh = thresholds[Math.min(level - 1, thresholds.length - 1)] ?? 0;
  const nextThresh = thresholds[Math.min(level, thresholds.length - 1)] ?? thresholds[thresholds.length - 1];
  return { level, current: xp - curThresh, next: nextThresh - curThresh };
}

// ─── Badge definitions ───────────────────────────────────────────────────────

function getBadges(d: ProfileData, totalUpvotes: number) {
  // Compute total XP to gate level-based badges
  const xpEst = calcXP(d);

  return [
    // ── Activity Badges ──
    {
      id: "fs",
      label: "First Steps",
      description: "Post your first forum discussion",
      icon: MessageSquare,
      earned: d.forumPosts.length >= 1,
      color: "text-purple-500",
    },
    {
      id: "ws",
      label: "Wordsmith",
      description: "Post 10+ forum discussions",
      icon: MessageSquare,
      earned: d.forumPosts.length >= 10,
      color: "text-purple-600",
    },
    {
      id: "kk",
      label: "Knowledge Keeper",
      description: "Upload 3+ library notes",
      icon: BookOpen,
      earned: d.libraryNotes.length >= 3,
      color: "text-amber-500",
    },
    {
      id: "ls",
      label: "Library Scholar",
      description: "Upload 10+ library notes",
      icon: BookOpen,
      earned: d.libraryNotes.length >= 10,
      color: "text-amber-600",
    },
    {
      id: "gp",
      label: "Group Player",
      description: "Join 2+ campus groups",
      icon: Users,
      earned: d.groupCount >= 2,
      color: "text-emerald-500",
    },
    {
      id: "cp",
      label: "Community Pillar",
      description: "Join 5+ campus groups",
      icon: Users,
      earned: d.groupCount >= 5,
      color: "text-emerald-600",
    },
    {
      id: "crp",
      label: "Crowd Pleaser",
      description: "Earn 10+ forum upvotes",
      icon: TrendingUp,
      earned: totalUpvotes >= 10,
      color: "text-blue-500",
    },
    {
      id: "fl",
      label: "Forum Legend",
      description: "Earn 50+ forum upvotes",
      icon: TrendingUp,
      earned: totalUpvotes >= 50,
      color: "text-blue-700",
    },
    // ── Library Engagement Badges ──
    {
      id: "lvv",
      label: "Viral Voice",
      description: "Earn 100+ total views on library notes",
      icon: Eye,
      earned: (d as any).libStats?.totalViews >= 100,
      color: "text-sky-400",
    },
    {
      id: "lpr",
      label: "Popular Resource",
      description: "Earn 50+ total downloads on library notes",
      icon: Download,
      earned: (d as any).libStats?.totalDownloads >= 50,
      color: "text-teal-400",
    },
    {
      id: "lbc",
      label: "Bookmarked",
      description: "Earn 20+ total bookmarks on library notes",
      icon: Bookmark,
      earned: (d as any).libStats?.totalBookmarks >= 20,
      color: "text-indigo-400",
    },
    // ── Level / XP Badges ──
    {
      id: "xpp",
      label: "XP Pioneer",
      description: "Reach 150 XP (Scholar level)",
      icon: Zap,
      earned: xpEst >= 150,
      color: "text-yellow-500",
    },
    {
      id: "aclvl",
      label: "Academic",
      description: "Reach 700 XP (Academic level)",
      icon: Zap,
      earned: xpEst >= 700,
      color: "text-orange-500",
    },
    {
      id: "eslvl",
      label: "Elite Status",
      description: "Reach 3500 XP (Elite Academic level)",
      icon: Zap,
      earned: xpEst >= 3500,
      color: "text-rose-500",
    },
    {
      id: "gm",
      label: "Grandmaster",
      description: "Reach 1500 XP (Legend level)",
      icon: Star,
      earned: xpEst >= 1500,
      color: "text-yellow-400",
    },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm shadow-lg ${ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-rose-500/30 bg-rose-500/10 text-rose-400"}`}
    >
      {ok ? (
        <Check className="h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" />
      )}
      {msg}
    </motion.div>
  );
}

// ─── Avatar circle ────────────────────────────────────────────────────────────

function AvatarCircle({
  src,
  initials,
  size = 80,
}: {
  src?: string | null;
  initials: string;
  size?: number;
}) {
  const px = `${size}px`;
  if (src)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt="avatar"
        style={{ width: px, height: px }}
        className="rounded-full object-cover ring-4 ring-slate-800"
      />
    );
  return (
    <div
      style={{ width: px, height: px }}
      className="flex items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-indigo-600 text-2xl font-bold text-white ring-4 ring-slate-800"
    >
      {initials}
    </div>
  );
}

// ─── Settings input ───────────────────────────────────────────────────────────

function SettingsInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  rightSlot,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 pr-10 text-sm text-slate-200 placeholder:text-slate-500 transition focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
        />
        {rightSlot && (
          <div className="absolute inset-y-0 right-3 flex items-center">
            {rightSlot}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const [tab, setTab] = useState<ProfileTab>("overview");
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [previewNote, setPreviewNote] = useState<ProfileData["libraryNotes"][0] | null>(null);

  // Title Selection (read from Supabase — editable from Planner module)
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("user_profiles")
          .select("selected_title")
          .eq("id", user.id)
          .single();
        if (data?.selected_title) setSelectedTitle(data.selected_title);
      } catch { /* ignore */ }
    })();
  }, [user?.id]);

  // Settings state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [institution, setInstitution] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  // Avatar upload
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Social � followers / friends
  const [followers, setFollowers] = useState<FollowEntry[]>([]);
  const [following, setFollowing] = useState<FollowEntry[]>([]);
  const [followCounts, setFollowCounts] = useState({
    followers: 0,
    following: 0,
  });
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [pendingOps, setPendingOps] = useState<Record<string, boolean>>({});
  const [myGroups, setMyGroups] = useState<Institution[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const isAdminMode = isAdminSession();

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    if (!user?.id) return;
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setUsername(user.username ?? "");
    try {
      const [profile, forumResult, libraryResult, myGroups, plansResult, proofsResult] = await Promise.all(
        [
          fetchProfile(user.id),
          supabase
            .from("forum_posts")
            .select("id,title,created_at,upvotes_count,comments_count,category")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("notes")
            .select("id,title,subject,file_url,downloads_count,avg_rating,created_at,uploader_name")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          fetchMyInstitutions(user.id),
          supabase
            .from("study_plans")
            .select("*")
            .eq("user_id", user.id),
          supabase
            .from("plan_proofs")
            .select("id,plan_id,user_id,chapter_index,file_name,submitted_at")
            .eq("user_id", user.id),
        ],
      );

      if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
      else if (user.imageUrl) setAvatarUrl(user.imageUrl);

      if (profile?.bio) setBio(profile.bio);
      if (profile?.institution) setInstitution(profile.institution);

      const notes = (libraryResult.data ?? []) as ProfileData["libraryNotes"];
      const posts = (forumResult.data ?? []) as ProfileData["forumPosts"];

      let submitted = 0;
      let planCount = 0;
      let planChapters = 0;

      await Promise.all(
        myGroups.map(async (g) => {
          try {
            const a = await fetchAssignments(g.id, user.id, g.userRole);
            submitted += a.filter(
              (x: { status: string }) =>
                x.status === "submitted" || x.status === "graded",
            ).length;
          } catch {
            /* ignore */
          }
        }),
      );

      let plannerSubmittedCount = 0;
      let plannerMilestoneXP = 0;
      let plannerTitles: { id: string; title: string; source: string }[] = [];
      try {
        if (plansResult.data) {
          // Group proofs by plan_id
          const proofsByPlan: Record<string, any[]> = {};
          (proofsResult.data ?? []).forEach((p: any) => {
            if (!proofsByPlan[p.plan_id]) proofsByPlan[p.plan_id] = [];
            proofsByPlan[p.plan_id].push(p);
          });

          const plans: StoredPlan[] = plansResult.data.map((row: any) => ({
            id: row.id,
            name: row.name,
            createdAt: row.created_at,
            targetDate: row.target_date,
            dailyHours: row.daily_hours,
            intensity: row.intensity || "normal",
            plan: row.plan_data || { schedule: [] },
            proofs: (proofsByPlan[row.id] ?? []).map((p: any) => ({
              chapterIndex: p.chapter_index,
              proofUrl: p.file_url,
              fileName: p.file_name,
              uploadedAt: p.submitted_at,
            })),
          }));

          planCount = plans.length;
          planChapters = plans.reduce((s, p) => s + (p.plan.schedule?.length || 0), 0);
          plannerSubmittedCount = plans.reduce((s, p) => s + (p.proofs?.length || 0), 0);

          // Compute milestone XP and titles
          const states = computeMilestoneStates(plans);
          const achievedMilestones = states.filter(s => s.achieved).map(s => ALL_MILESTONES.find(x => x.id === s.id)).filter(Boolean) as typeof ALL_MILESTONES;

          plannerMilestoneXP = achievedMilestones.reduce((sum, m) => sum + m.xp, 0);
          plannerTitles = achievedMilestones.map(m => ({ id: m.id, title: m.title, source: "Planner Milestone" }));
        }
      } catch (e) { console.error("Planner stats error", e); }

      // Fetch library interactions for uploaded notes to compute Library XP
      let libraryXP = 0;
      let libStats: UserStats | null = null;
      if (libraryResult.data && libraryResult.data.length > 0) {
        const noteIds = libraryResult.data.map(n => n.id);
        const { data: interactions } = await supabase
          .from("library_interactions")
          .select("interaction_type")
          .in("note_id", noteIds)
          .in("interaction_type", ["view", "bookmark"]);

        let viewCount = 0;
        let bookmarkCount = 0;
        if (interactions) {
          viewCount = interactions.filter(i => i.interaction_type === "view").length;
          bookmarkCount = interactions.filter(i => i.interaction_type === "bookmark").length;
        }

        const myNotes = libraryResult.data;
        const notesWithStats = myNotes.map(n => ({
          ...n,
          views_count: n.id === myNotes[0]?.id ? viewCount : 0, // simple hack to pass total count down
        }));

        // Use our robust helper methods
        libStats = computeLibraryStats(myNotes, viewCount, bookmarkCount);

        libraryXP = calcLibXP(libStats);
      }

      const pData: ProfileData & { libStats?: UserStats | null } = {
        forumPosts: forumResult.data as any[] ?? [],
        libraryNotes: libraryResult.data as any[] ?? [],
        submittedCount: submitted,
        groupCount: myGroups ? new Set(myGroups.map((g: any) => g.id)).size : 0,
        planCount,
        planChapters,
        plannerSubmittedCount,
        plannerMilestoneXP,
        libraryMilestoneXP: libraryXP,
        earnedTitles: plannerTitles,
        libStats,
      };
      setProfileData(pData);
      setMyGroups(myGroups);
    } catch (e) {
      console.error("Profile load:", e);
    } finally {
      setLoadingData(false);
    }
  }, [user?.id, user?.firstName, user?.lastName, user?.imageUrl]);

  useEffect(() => {
    load();
  }, [load]);

  // Load follow counts along with main data (for overview stats)
  useEffect(() => {
    if (!user?.id) return;
    getFollowCounts(user.id).then(setFollowCounts).catch(() => { });
    getProfileLikeCount(user.id).then(setLikeCount).catch(() => { });
  }, [user?.id]);

  // Lazy-load full social data when user switches to those tabs
  const loadSocial = useCallback(async () => {
    if (!user?.id || socialLoaded) return;
    setSocialLoading(true);
    try {
      const [flrs, flng, frds] = await Promise.all([
        getFollowers(user.id),
        getFollowing(user.id),
        getFriendsAndRequests(user.id),
      ]);
      setFollowers(flrs);
      setFollowing(flng);
      setFriends(frds);
      setSocialLoaded(true);
    } catch (e) {
      console.error("social load:", e);
    } finally {
      setSocialLoading(false);
    }
  }, [user?.id, socialLoaded]);

  useEffect(() => {
    if (tab === "followers" || tab === "friends") loadSocial();
  }, [tab, loadSocial]);

  if (!isLoaded || loadingData) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
    : (user?.username ?? "Scholar");
  const initials =
    displayName
      .split(" ")
      .map((w: string) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  const xp = profileData ? calcXP(profileData) : 0;
  const rep = profileData ? calcRep(profileData) : 0;
  const title = xpTitle(xp);
  const titleColor = xpTitleColor(xp);
  const { current: xpCurrent, next: xpNext, level } = xpLevel(xp);
  const xpPct = xpNext > 0 ? Math.min((xpCurrent / xpNext) * 100, 100) : 100;

  const badges = profileData ? getBadges(profileData, rep) : [];
  const earnedBadges = badges.filter((b) => b.earned);

  const availableTitles = [
    { id: "level_title", title: title, source: "Current Level" },
    ...earnedBadges.map(b => ({ id: b.label, title: b.label, source: "Badge" })),
    ...(profileData?.earnedTitles || [])
  ];

  const displayTitleString = selectedTitle ?? title;
  const isCustomTitle = selectedTitle !== null && selectedTitle !== title;

  const TABS: { key: ProfileTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "contributions", label: "Contributions" },
    { key: "achievements", label: "Achievements" },
    { key: "activity", label: "Activity" },
    { key: "followers", label: `Followers (${followCounts.followers})` },
    { key: "following", label: `Following (${followCounts.following})` },
    { key: "friends", label: "Friends" },
    { key: "settings", label: "Settings" },
    ...(isAdminMode ? [{ key: "admin" as ProfileTab, label: "🛡️ Admin" }] : []),
  ];

  // ── Avatar upload handlers ────────────────────────────────────────────────
  function pickFile(file: File) {
    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file.", false);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be under 5 MB.", false);
      return;
    }
    setAvatarFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleAvatarSave() {
    if (!user?.id || !avatarFile) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(user.id, avatarFile);
      try {
        const supabaseClient = createClient();
        await supabaseClient.auth.updateUser({ data: { avatar_url: url } });
      } catch {
        /* non-critical */
      }
      setAvatarUrl(url);
      setPreviewUrl(null);
      setAvatarFile(null);
      showToast("Profile picture updated!", true);
    } catch (e) {
      showToast((e as Error).message || "Upload failed.", false);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleNameSave() {
    if (!user?.id) return;

    // Check constraints locally before saving
    if (username.trim()) {
      try {
        const isAvailable = await checkUsernameAvailable(username.trim(), user.id);
        if (!isAvailable) {
          showToast("Username is already taken. Please choose another.", false);
          return;
        }
      } catch (e) {
        showToast("Failed to verify username availability.", false);
        return;
      }
    }

    setSavingName(true);
    try {
      const { createClient } = require("@/lib/supabase/client");
      const newDisplayName = `${firstName.trim()} ${lastName.trim()}`.trim();
      await createClient().auth.updateUser({
        data: {
          display_name: newDisplayName,
          username: username.trim(),
        }
      });
      await saveProfileSettings(
        user.id,
        {
          display_name: newDisplayName,
          username: username.trim(),
        }
      );
      // Propagate name change across all modules (forums, library, comments)
      await propagateNameChange(user.id, newDisplayName, username.trim());
      showToast("Profile settings updated!", true);
    } catch (e) {
      showToast((e as Error).message || "Failed to update profile.", false);
    } finally {
      setSavingName(false);
    }
  }

  async function handlePasswordSave() {
    if (newPw !== confirmPw) {
      showToast("Passwords don't match.", false);
      return;
    }
    if (newPw.length < 8) {
      showToast("Password must be at least 8 characters.", false);
      return;
    }
    setSavingPw(true);
    try {
      const supabaseClient = createClient();
      await supabaseClient.auth.updateUser({ password: newPw });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      showToast("Password updated!", true);
    } catch (e) {
      showToast((e as Error).message || "Failed to update password.", false);
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* ── Page header ── */}
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-xs text-slate-400">
          <Link href="/dashboard" className="transition hover:text-slate-200">
            Academix
          </Link>
          <span>/</span>
          <span className="text-slate-500">Profile</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-100">Profile</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage your account, preferences, and academic identity.
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="mb-6 border-b border-slate-800">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition ${tab === key ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        {/* OVERVIEW */}
        {tab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-6"
          >
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-6 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
              <div className="flex flex-wrap items-start gap-5">
                <div className="relative shrink-0">
                  <AvatarCircle src={avatarUrl} initials={initials} size={80} />
                  <button
                    onClick={() => setTab("settings")}
                    className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-800 transition hover:bg-slate-700"
                  >
                    <Camera className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-slate-100 flex items-center gap-3 relative">
                    {displayName}
                  </h2>
                  {user?.username && (
                    <p className="mt-1 text-sm font-medium text-slate-400">
                      @{user.username}
                    </p>
                  )}
                  <p className="mt-1 text-sm font-semibold" style={{}}>
                    <span className={titleColor}>{title}</span>
                    <span className="ml-2 text-xs font-normal text-slate-500">Level {level}</span>
                  </p>

                  {/* Equipped Planner Title — shown below level, above XP */}
                  {isCustomTitle && (
                    <div className="mt-1.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400`} title="Equipped Title — change from Planner › Milestones">
                        <Award className="h-3 w-3" />
                        {displayTitleString}
                      </span>
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-0.5 text-xs font-semibold text-indigo-400">
                      <Zap className="h-3 w-3" />
                      {xp.toLocaleString()} XP
                    </span>
                    <span className="flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-0.5 text-xs font-semibold text-indigo-400">
                      <ThumbsUp className="h-3 w-3" />
                      {likeCount} Likes
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* XP Progress */}
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-300">XP Progress</span>
                <span className="text-slate-500">
                  {xp.toLocaleString()} /{" "}
                  {(xp - xpCurrent + xpNext).toLocaleString()}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPct}%` }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className="h-full rounded-full bg-linear-to-r from-indigo-500 to-purple-500"
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {xpNext - xpCurrent} XP to next level — keep going!
              </p>
            </div>

            {/* Tiers/Ranks overview */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Planner Rank Card */}
              {(() => {
                const plannerXP = profileData?.plannerMilestoneXP ?? 0;
                const curRank = getPlannerRank(plannerXP);
                const nxtRank = getNextPlannerRank(plannerXP);
                const rkPct = nxtRank ? Math.min(((plannerXP - curRank.threshold) / (nxtRank.threshold - curRank.threshold)) * 100, 100) : 100;
                // Icon renderer for rank
                const RankIcon = ({ name, cls }: { name: string; cls: string }) => {
                  if (name === "Circle") return <Circle className={cls} />;
                  if (name === "Shield") return <Shield className={cls} />;
                  if (name === "Medal") return <Medal className={cls} />;
                  if (name === "Target") return <Target className={cls} />;
                  if (name === "Trophy") return <Trophy className={cls} />;
                  if (name === "Flame") return <Flame className={cls} />;
                  if (name === "Crown") return <Award className={cls} />;
                  if (name === "Gem") return <Zap className={cls} />;
                  return <Award className={cls} />;
                };
                return (
                  <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-4 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${curRank.bgColor} ${curRank.borderColor} ${curRank.glow}`}>
                        <RankIcon name={curRank.icon} cls={`h-4.5 w-4.5 ${curRank.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Planner Rank</p>
                        <p className={`text-sm font-bold ${curRank.color}`}>{curRank.name}</p>
                      </div>
                    </div>
                    {nxtRank ? (
                      <>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${rkPct}%` }}
                            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                          />
                        </div>
                        <p className="mt-1.5 text-[10px] text-slate-500 text-center">
                          {plannerXP} / {nxtRank.threshold} XP
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-amber-300 font-bold text-center mt-2">🏆 Max Rank Achieved</p>
                    )}
                  </div>
                );
              })()}

              {/* Library Rank Card */}
              {(() => {
                const libXP = profileData?.libraryMilestoneXP ?? 0;
                const curRank = getLibraryRank(libXP);
                const nxtRank = getNextLibraryRank(libXP);
                const rkPct = nxtRank ? Math.min(((libXP - curRank.minXp) / (nxtRank.minXp - curRank.minXp)) * 100, 100) : 100;

                const RankIcon = curRank.icon;
                return (
                  <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-4 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950/50 border ${curRank.borderX} ${curRank.glow}`}>
                        <RankIcon className={`h-4.5 w-4.5 ${curRank.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Library Rank</p>
                        <p className={`text-sm font-bold ${curRank.color}`}>{curRank.name}</p>
                      </div>
                    </div>
                    {nxtRank ? (
                      <>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                          <motion.div
                            className={`h-full rounded-full ${curRank.bgHover.replace("hover:", "")} blur-[1px]`}
                            style={{ backgroundColor: "currentColor", width: `${rkPct}%` }}
                            initial={{ width: 0 }}
                            animate={{ width: `${rkPct}%` }}
                            transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
                          />
                        </div>
                        <p className="mt-1.5 text-[10px] text-slate-500 text-center">
                          {libXP} / {nxtRank.minXp} XP
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-amber-300 font-bold text-center mt-2">🏆 Max Rank Achieved</p>
                    )}
                  </div>
                );
              })()}

              {/* Forum Tier Card */}
              {(() => {
                const forumRep = profileData ? calcRep(profileData) + Math.max(0, profileData.forumPosts.reduce((s, p) => s + 10 + p.comments_count * 1, 0)) : 0;
                const FORUM_TIERS = [
                  { label: "Member", min: 0, max: 99, color: "text-slate-400", ring: "ring-slate-700" },
                  { label: "Contributor", min: 100, max: 299, color: "text-emerald-400", ring: "ring-emerald-500/30" },
                  { label: "Veteran", min: 300, max: 699, color: "text-blue-400", ring: "ring-blue-500/30" },
                  { label: "Expert", min: 700, max: 1499, color: "text-violet-400", ring: "ring-violet-500/30" },
                  { label: "Scholar", min: 1500, max: 3499, color: "text-amber-400", ring: "ring-amber-500/30" },
                  { label: "Legend", min: 3500, max: Infinity, color: "text-rose-400", ring: "ring-rose-500/30" },
                ];
                const forumTier = FORUM_TIERS.slice().reverse().find(t => forumRep >= t.min) ?? FORUM_TIERS[0];

                return (
                  <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-4 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950/50 border ${forumTier.ring}`}>
                        <MessageSquare className={`h-4.5 w-4.5 ${forumTier.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Forum Tier</p>
                        <p className={`text-sm font-bold ${forumTier.color}`}>{forumTier.label}</p>
                      </div>
                    </div>
                    {forumTier.max !== Infinity ? (
                      <>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(((forumRep - forumTier.min) / (forumTier.max - forumTier.min)) * 100, 100)}%` }}
                            transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                          />
                        </div>
                        <p className="mt-1.5 text-[10px] text-slate-500 text-center">
                          {forumRep} / {forumTier.max} Rep
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-amber-300 font-bold text-center mt-2">🏆 Max Tier Achieved</p>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {[
                { label: "Groups", value: profileData?.groupCount ?? 0, icon: School, color: "text-emerald-400" },
                { label: "Forum Posts", value: profileData?.forumPosts.length ?? 0, icon: MessageSquare, color: "text-purple-400" },
                { label: "Notes Uploaded", value: profileData?.libraryNotes.length ?? 0, icon: BookOpen, color: "text-amber-400" },
                { label: "Assignments", value: profileData?.submittedCount ?? 0, icon: CheckCircle2, color: "text-teal-400" },
                { label: "Followers", value: followCounts.followers, icon: Users, color: "text-blue-400" },
                { label: "Following", value: followCounts.following, icon: UserCheck, color: "text-indigo-400" },
                { label: "Likes", value: likeCount, icon: ThumbsUp, color: "text-blue-400" },
                { label: "Badges", value: `${(profileData ? getBadges(profileData, rep).filter((b) => b.earned).length : 0)}/${profileData ? getBadges(profileData, rep).length : 0}`, icon: Award, color: "text-amber-400" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="flex flex-col items-center gap-1 rounded-xl border border-slate-800/60 bg-slate-900/50 py-4">
                  <Icon className={`h-5 w-5 ${color}`} />
                  <p className="text-xl font-bold text-slate-100">{value}</p>
                  <p className="text-[11px] text-slate-500">{label}</p>
                </div>
              ))}
            </div>

            {/* Campus Groups */}
            {myGroups.length > 0 && (
              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <School className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-slate-100">My Campus Groups</h3>
                    <span className="rounded-full bg-emerald-600/15 px-2 py-0.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
                      {myGroups.length}
                    </span>
                  </div>
                  <Link
                    href="/campus/my-campus"
                    className="text-xs font-medium text-blue-400 hover:text-blue-300 transition"
                  >
                    View all →
                  </Link>
                </div>
                <div className="flex flex-col gap-2">
                  {myGroups.map((g) => (
                    <Link
                      key={g.id}
                      href="/campus/my-campus"
                      className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/40 px-4 py-3 transition hover:border-emerald-500/30 hover:bg-emerald-500/5"
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br ${g.avatar_color} text-[11px] font-bold text-white shadow`}
                      >
                        {g.avatar_initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-200">{g.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {g.member_count} members · {g.assignment_count ?? 0} assignments
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ring-1 ${g.userRole === "owner"
                        ? "bg-amber-500/10 text-amber-400 ring-amber-500/30"
                        : g.userRole === "admin"
                          ? "bg-indigo-500/10 text-indigo-400 ring-indigo-500/30"
                          : "bg-slate-800 text-slate-400 ring-slate-700"
                        }`}>
                        {g.userRole ?? "member"}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* CONTRIBUTIONS */}
        {tab === "contributions" && (
          <motion.div
            key="contributions"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-6"
          >
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
              <div className="mb-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-bold text-slate-100">Forum Posts</h3>
                <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-400 ring-1 ring-purple-500/30">
                  {profileData?.forumPosts.length ?? 0}
                </span>
              </div>
              {(profileData?.forumPosts.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <MessageSquare className="h-7 w-7 text-slate-600" />
                  <p className="text-sm text-slate-400">No forum posts yet.</p>
                  <Link
                    href="/forums/create"
                    className="text-xs text-purple-400 hover:underline"
                  >
                    Start a discussion →
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {profileData?.forumPosts.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Link
                        href="/forums"
                        className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/40 px-4 py-3 transition hover:border-purple-500/30 hover:bg-purple-500/5"
                      >
                        <MessageSquare className="h-4 w-4 shrink-0 text-purple-400/60" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-200 group-hover:text-purple-300 transition-colors">
                            {p.title}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            {p.category ? ` · ${p.category}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1 text-emerald-400">
                            <TrendingUp className="h-3 w-3" />
                            {p.upvotes_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {p.comments_count}
                          </span>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes Uploaded */}
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
              <div className="mb-4 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  Notes Uploaded
                </h3>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-500 ring-1 ring-amber-500/30">
                  {profileData?.libraryNotes.length ?? 0}
                </span>
              </div>
              {(profileData?.libraryNotes.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Upload className="h-7 w-7 text-slate-600" />
                  <p className="text-sm text-slate-400">No uploads yet.</p>
                  <Link
                    href="/library/upload"
                    className="text-xs text-amber-400 hover:underline"
                  >
                    Upload now →
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {profileData?.libraryNotes.map((n, i) => (
                    <motion.button
                      key={n.id}
                      onClick={() => n.file_url ? setPreviewNote(n) : undefined}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`group flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/40 px-4 py-3 text-left transition hover:border-amber-500/30 hover:bg-amber-500/5 ${n.file_url ? "cursor-pointer" : "cursor-default"
                        }`}
                    >
                      <BookOpen className="h-4 w-4 shrink-0 text-amber-400/60" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-200 group-hover:text-amber-400 transition-colors">
                          {n.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {n.subject && <p className="text-xs text-slate-500">{n.subject}</p>}
                          {n.downloads_count !== undefined && (
                            <span className="flex items-center gap-0.5 text-[10px] text-slate-500">
                              <Download className="h-2.5 w-2.5" /> {n.downloads_count}
                            </span>
                          )}
                          {n.avg_rating && n.avg_rating > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                              <ThumbsUp className="h-2.5 w-2.5" /> {n.avg_rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {n.created_at && (
                          <span className="text-[10px] text-slate-500">
                            {new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                        {n.file_url && (
                          <Eye className="h-3.5 w-3.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ACHIEVEMENTS */}
        {tab === "achievements" && (
          <motion.div
            key="achievements"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-6"
          >
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-6 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-slate-100">
                    <Medal className="h-5 w-5 text-indigo-400" />
                    Planner Badges
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Complete study plans, submit proofs, and maintain streaks to earn these.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-indigo-400">{profileData ? getBadges(profileData, rep).filter(b => b.earned).length : 0}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Unlocked</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {profileData ? getBadges(profileData, rep).map((b) => {
                  const BIcon = b.icon;
                  return (
                    <div
                      key={b.id}
                      className={`relative flex items-center gap-3 rounded-xl border p-3 transition-colors ${b.earned
                        ? "border-indigo-500/30 bg-indigo-500/10"
                        : "border-slate-800 bg-slate-800/20 opacity-50 grayscale"
                        }`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${b.earned ? "bg-indigo-500/20" : "bg-slate-700"}`}>
                        {b.earned ? (
                          <BIcon className="h-5 w-5 text-indigo-400" />
                        ) : (
                          <Lock className="h-4 w-4 text-slate-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-bold ${b.earned ? "text-indigo-300" : "text-slate-400"}`}>
                          {b.label}
                        </p>
                        <p className="truncate text-[10px] text-slate-500">{b.description}</p>
                      </div>
                    </div>
                  );
                }) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-6 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-slate-100">
                    <BookOpen className="h-5 w-5 text-amber-500" />
                    Library Badges
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Upload notes, gain downloads, ratings, and bookmarks to collect these.
                  </p>
                </div>
                {/* Calculate earned count on the fly for UI presentation if profileData is fully loaded */}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {profileData && (() => {
                  const stats = {
                    uploadCount: profileData.libraryNotes.length,
                    totalDownloads: profileData.libraryNotes.reduce((s, n) => s + (n.downloads_count ?? 0), 0),
                    totalViews: 0, // In full app we might retrieve this, but we approximate for profile showcase
                    totalBookmarks: 0,
                    totalRatings: profileData.libraryNotes.reduce((s, n) => s + (n.avg_rating && n.avg_rating >= 4 ? 1 : 0), 0),
                    topNoteDownloads: Math.max(0, ...profileData.libraryNotes.map(n => n.downloads_count ?? 0)),
                    notesAbove50Downloads: profileData.libraryNotes.filter(n => (n.downloads_count ?? 0) >= 50).length,
                    subjectsUploaded: new Set(profileData.libraryNotes.map(n => n.subject || "")),
                    consecutiveWeeks: 0,
                  };

                  return ALL_LIB_MILESTONES.map((m: any) => {
                    // Since some views/bookmarks aren't in `profileData` by default without heavy fetching,
                    // we do a loose check for profile visual or strict check if we passed total stats.
                    // For exactness, user sees true progress on the Library page.
                    const achieved = m.check(stats as any);
                    const MIcon = m.icon;
                    return (
                      <div
                        key={m.id}
                        className={`relative flex items-center gap-3 rounded-xl border p-3 transition-colors ${achieved
                          ? "border-amber-500/30 bg-amber-500/10"
                          : "border-slate-800 bg-slate-800/20 opacity-50 grayscale"
                          }`}
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${achieved ? "bg-amber-500/20" : "bg-slate-700"}`}>
                          {achieved ? (
                            <MIcon className="h-5 w-5 text-amber-400" />
                          ) : (
                            <Lock className="h-4 w-4 text-slate-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-bold ${achieved ? "text-amber-300" : "text-slate-400"}`}>
                            {m.label}
                          </p>
                          <p className="truncate text-[10px] text-slate-500">{m.description}</p>
                        </div>
                      </div>
                    )
                  });
                })()}
              </div>
            </div>
          </motion.div>
        )}

        {/* Planner Achievements — 7-tier system */}
        {tab === "achievements" && (
          <motion.div
            key="achievements-planner-tiers" // Changed key to avoid conflict with the main achievements div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            {/* General badges */}
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5">
              <div className="mb-1 flex items-center gap-2">
                <Award className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-bold text-slate-100">Platform Badges</h3>
              </div>
              <p className="mb-5 text-xs text-slate-500">
                <span className="font-semibold text-slate-300">{earnedBadges.length}</span>{" "}
                of {badges.length} earned
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {badges.map((b, i) => {
                  const Icon = b.icon;
                  return (
                    <motion.div
                      key={b.label}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`flex items-center gap-3 rounded-xl border p-3 transition ${b.earned ? `${b.color} border-current/20 ring-1 ring-current/10` : "border-slate-800 opacity-35 grayscale"}`}
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${b.earned ? "bg-current/10" : "bg-slate-800"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold">{b.label}</p>
                        <p className="text-[10px] text-slate-500">{b.description}</p>
                      </div>
                      {b.earned && <CheckCircle2 className="ml-auto h-3.5 w-3.5 shrink-0" />}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Planner Achievements — 7-tier system */}
            {(() => {
              const TIER_STYLES: Record<string, { ring: string; bg: string; icon: string; badge: string; glow: string }> = {
                bronze: { ring: "ring-2 ring-amber-500/40", bg: "bg-gradient-to-br from-amber-900/20 to-orange-900/20", icon: "text-amber-400", badge: "bg-amber-500/10 text-amber-400 border-amber-500/30", glow: "" },
                silver: { ring: "ring-2 ring-slate-500/40", bg: "bg-gradient-to-br from-slate-800 to-slate-700/50", icon: "text-slate-300", badge: "bg-slate-700/50 text-slate-300 border-slate-600", glow: "" },
                gold: { ring: "ring-2 ring-yellow-500/50", bg: "bg-gradient-to-br from-yellow-900/20 to-amber-900/20", icon: "text-yellow-400", badge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", glow: "shadow-yellow-500/20" },
                platinum: { ring: "ring-2 ring-indigo-500/50", bg: "bg-gradient-to-br from-indigo-900/20 to-violet-900/20", icon: "text-indigo-400", badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30", glow: "shadow-indigo-500/20" },
                diamond: { ring: "ring-2 ring-cyan-500/60", bg: "bg-gradient-to-br from-cyan-900/20 to-sky-900/20", icon: "text-cyan-400", badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30", glow: "shadow-cyan-500/20" },
                heroic: { ring: "ring-2 ring-violet-500/60", bg: "bg-gradient-to-br from-violet-900/20 to-purple-900/20", icon: "text-violet-400", badge: "bg-violet-500/10 text-violet-400 border-violet-500/30", glow: "shadow-violet-500/20" },
                legendary: { ring: "ring-2 ring-rose-500/60", bg: "bg-gradient-to-br from-rose-900/20 to-amber-900/20", icon: "text-rose-400", badge: "bg-rose-500/10 text-rose-400 border-rose-500/30", glow: "shadow-rose-500/20" },
              };

              const CATEGORY_META: Record<string, { label: string; color: string }> = {
                progress: { label: "The Completionist Path", color: "text-blue-400" },
                streak: { label: "The Consistency Path", color: "text-orange-400" },
                goals: { label: "The Execution Path", color: "text-emerald-400" },
                mastery: { label: "The Speedster Path", color: "text-purple-400" },
              };

              const PLANNER_TITLES = [
                { id: "prog_legendary", name: "Completionist Grandmaster", rarity: "Mythic", head: "bg-clip-text text-transparent bg-gradient-to-r from-rose-400 to-orange-400 font-black" },
                { id: "prog_heroic", name: "Academic Titan", rarity: "Legendary", head: "text-violet-400 font-extrabold" },
                { id: "prog_diamond", name: "Full Scholar", rarity: "Epic", head: "text-cyan-400 font-bold" },
                { id: "prog_platinum", name: "The Finisher", rarity: "Rare", head: "text-emerald-400 font-semibold" },
                { id: "prog_gold", name: "Steadfast", rarity: "Uncommon", head: "text-yellow-500" },
                { id: "streak_legendary", name: "Eternal Grind", rarity: "Mythic", head: "bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-rose-400 font-black" },
                { id: "streak_diamond", name: "Unbreakable", rarity: "Epic", head: "text-cyan-400 font-bold" },
                { id: "streak_platinum", name: "Iron Discipline", rarity: "Rare", head: "text-indigo-400 font-semibold" },
                { id: "streak_gold", name: "Relentless", rarity: "Uncommon", head: "text-yellow-500" },
                { id: "streak_silver", name: "Week Warrior", rarity: "Common", head: "text-slate-400" },
                { id: "ontime_legendary", name: "Temporal Grandmaster", rarity: "Mythic", head: "bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-purple-400 font-black" },
                { id: "ontime_heroic", name: "Deadline Assassin", rarity: "Legendary", head: "text-violet-400 font-extrabold" },
                { id: "ontime_diamond", name: "Clockwork Scholar", rarity: "Epic", head: "text-cyan-400 font-bold" },
                { id: "ontime_platinum", name: "Flawless Execution", rarity: "Rare", head: "text-emerald-400 font-semibold" },
                { id: "weekly_silver", name: "Speed Demon", rarity: "Common", head: "text-slate-400" },
              ];

              // Use live milestone states computed from Supabase data (in profileData via computeMilestoneStates)
              // Fall back to localStorage if no Supabase data is available yet
              let milestoneStates: { id: string; achieved: boolean; achievedAt?: string }[] = [];
              try { const ms = localStorage.getItem("academix_milestones_v2"); if (ms) milestoneStates = JSON.parse(ms); } catch { /* ignore */ }
              const stateMap = new Map(milestoneStates.map(m => [m.id, m]));
              const plannerEarned = ALL_MILESTONES.filter(m => stateMap.get(m.id)?.achieved).length;
              const cats = ["progress", "streak", "goals", "mastery"] as const;

              // Find current planner title (the selected one from Supabase or the highest earned)
              const currentPlannerTitle = PLANNER_TITLES.find(t => t.name === selectedTitle && stateMap.get(t.id)?.achieved)
                ?? PLANNER_TITLES.find(t => stateMap.get(t.id)?.achieved)
                ?? null;

              // Simple icon renderer for the profile page
              const renderIcon = (name: string, cls: string) => {
                if (name === "BookOpen") return <BookOpen className={cls} />;
                if (name === "Target") return <Target className={cls} />;
                if (name === "Trophy") return <Trophy className={cls} />;
                if (name === "Flame") return <Flame className={cls} />;
                if (name === "Zap") return <Zap className={cls} />;
                if (name === "CheckCheck") return <Check className={cls} />;
                if (name === "ListChecks") return <CheckCircle2 className={cls} />;
                if (name === "Brain") return <Brain className={cls} />;
                if (name === "CalendarDays") return <CalendarDays className={cls} />;
                if (name === "BarChart2") return <BarChart2 className={cls} />;
                return <Award className={cls} />;
              };

              return (
                <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-indigo-400" />
                      <h3 className="text-sm font-bold text-slate-100">Planner Achievements</h3>
                    </div>
                    <span className="text-xs text-slate-500">
                      <span className="font-semibold text-slate-300">{plannerEarned}</span> / {ALL_MILESTONES.length} unlocked
                    </span>
                  </div>

                  {/* Dynamic Planner Title card */}
                  <div className={`rounded-xl border p-4 flex items-center gap-4 ${currentPlannerTitle ? "border-indigo-500/30 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.1)]" : "border-slate-800 bg-slate-800/50"}`}>
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${currentPlannerTitle ? "bg-indigo-500/20" : "bg-slate-800"}`}>
                      <Award className={`h-5 w-5 ${currentPlannerTitle ? "text-indigo-400" : "text-slate-600"}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Planner Title</p>
                      {currentPlannerTitle ? (
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-bold ${currentPlannerTitle.head}`}>{currentPlannerTitle.name}</p>
                          {"rarity" in currentPlannerTitle && (
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">{(currentPlannerTitle as any).rarity}</span>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400">Study Newcomer <span className="text-[10px]">— submit your first proof to earn a title</span></p>
                      )}
                    </div>
                    {currentPlannerTitle && <CheckCircle2 className="h-5 w-5 text-indigo-400 shrink-0" />}
                  </div>

                  {cats.map(cat => {
                    const meta = CATEGORY_META[cat];
                    const catMs = ALL_MILESTONES.filter(m => m.category === cat);
                    const catEarned = catMs.filter(m => stateMap.get(m.id)?.achieved).length;

                    return (
                      <div key={cat} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className={`text-xs font-bold uppercase tracking-wide ${meta.color}`}>{meta.label}</p>
                          <span className="text-[11px] font-medium text-slate-500">{catEarned}/{catMs.length}</span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {catMs.map((m, i) => {
                            const state = stateMap.get(m.id);
                            const earned = state?.achieved ?? false;
                            const style = TIER_STYLES[m.tier] ?? TIER_STYLES.bronze;

                            return (
                              <motion.div
                                key={m.id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.02 }}
                                className={`relative flex items-center gap-3 rounded-xl border p-3 transition-colors ${earned ? `${style.bg} border-slate-700/60 shadow-sm` : "border-slate-800 bg-slate-800/30 opacity-40"}`}
                              >
                                {/* Icon */}
                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${earned ? `${style.ring} shadow-inner bg-slate-900/50` : "bg-slate-800/60 ring-1 ring-slate-700/50"}`}>
                                  {renderIcon(m.icon, `h-4 w-4 ${earned ? style.icon : "text-slate-600"}`)}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className={`text-xs font-bold leading-tight ${earned ? "text-slate-200" : "text-slate-500"}`}>{m.title}</p>
                                    <span className={`text-[8px] font-black uppercase tracking-wider rounded-full px-1.5 py-0.5 ${earned ? style.badge : "border border-slate-700 text-slate-600 bg-slate-800/50"}`}>
                                      {m.tier}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 leading-snug mt-0.5 truncate" title={m.description}>{m.description}</p>

                                  <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-800/50">
                                    <div className="flex items-center gap-1 text-[9px] font-bold">
                                      <Zap className={`h-2.5 w-2.5 ${earned ? "text-amber-400" : "text-slate-600"}`} />
                                      <span className={earned ? "text-amber-400" : "text-slate-600"}>{m.xp} XP</span>
                                    </div>
                                    {earned && state?.achievedAt && (
                                      <span className="text-[9px] text-emerald-400/90 font-medium">
                                        {new Date(state.achievedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {earned && <CheckCircle2 className="absolute -top-1.5 -right-1.5 h-4 w-4 text-emerald-500 bg-[#090b14] rounded-full shadow-sm" />}
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </motion.div>
        )
        }

        {/* FORUM REPUTATION — shown inside achievements tab */}
        {tab === "achievements" && (() => {
          const posts = profileData?.forumPosts ?? [];
          const forumRep = Math.max(
            0,
            posts.reduce(
              (s, p) => s + 10 + p.upvotes_count * 5 + p.comments_count * 1 - (0) * 2,
              0,
            ),
          );
          const FORUM_TIERS = [
            { label: "Member", min: 0, max: 99, color: "text-slate-400", bg: "bg-slate-800/60", ring: "ring-slate-700" },
            { label: "Contributor", min: 100, max: 299, color: "text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-500/30" },
            { label: "Veteran", min: 300, max: 699, color: "text-blue-400", bg: "bg-blue-500/10", ring: "ring-blue-500/30" },
            { label: "Expert", min: 700, max: 1499, color: "text-violet-400", bg: "bg-violet-500/10", ring: "ring-violet-500/30" },
            { label: "Scholar", min: 1500, max: 3499, color: "text-amber-400", bg: "bg-amber-500/10", ring: "ring-amber-500/30" },
            { label: "Legend", min: 3500, max: Infinity, color: "text-rose-400", bg: "bg-rose-500/10", ring: "ring-rose-500/30" },
          ];
          const tier = FORUM_TIERS.slice().reverse().find(t => forumRep >= t.min) ?? FORUM_TIERS[0];
          const next = FORUM_TIERS.find(t => forumRep < t.max) ?? FORUM_TIERS[FORUM_TIERS.length - 1];
          const progress = next.max === Infinity ? 100 : Math.min(((forumRep - tier.min) / (next.max - tier.min)) * 100, 100);
          const FORUM_MS = [
            { id: "fm1", title: "First Steps", desc: "Post your first discussion", xp: 15, earned: posts.length >= 1 },
            { id: "fm2", title: "Wordsmith", desc: "Post 10+ discussions", xp: 40, earned: posts.length >= 10 },
            { id: "fm3", title: "Crowd Pleaser", desc: "Earn 10+ upvotes across posts", xp: 30, earned: posts.reduce((s, p) => s + p.upvotes_count, 0) >= 10 },
            { id: "fm4", title: "Forum Legend", desc: "Earn 50+ upvotes across posts", xp: 100, earned: posts.reduce((s, p) => s + p.upvotes_count, 0) >= 50 },
            { id: "fm5", title: "Veteran", desc: "Reach Veteran tier (300+ rep)", xp: 60, earned: forumRep >= 300 },
            { id: "fm6", title: "Scholar Tier", desc: "Reach Scholar tier (1500+ rep)", xp: 200, earned: forumRep >= 1500 },
          ];
          const earnedMs = FORUM_MS.filter(m => m.earned).length;
          return (
            <motion.div
              key="forum-rep"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-100">Forum Reputation</h3>
                </div>
                <Link href="/forums/reputation" className="text-[11px] text-indigo-400 hover:underline">View full →</Link>
              </div>
              {/* Tier card */}
              <div className={`flex items-center gap-4 rounded-xl border p-4 ${tier.ring} ${tier.bg}`}>
                <div>
                  <p className="text-2xl font-black text-slate-100 tabular-nums">{forumRep.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500">reputation pts</p>
                </div>
                <div className="flex-1">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${tier.ring} ${tier.color} bg-slate-900/60`}>{tier.label}</span>
                  {next.max !== Infinity && (
                    <div className="mt-2">
                      <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                        <span>→ {next.label}</span><span>{forumRep}/{next.max}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 ring-1 ring-slate-700">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Milestones */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Forum Milestones</p>
                  <span className="text-[10px] text-slate-500"><span className="font-semibold text-slate-300">{earnedMs}</span>/{FORUM_MS.length}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {FORUM_MS.map((m, i) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`relative flex items-start gap-3 rounded-xl border p-3 transition ${m.earned ? "border-indigo-500/30 bg-indigo-500/10" : "border-slate-800 bg-slate-800/40 opacity-40"
                        }`}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[10px] font-black ${m.earned ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" : "border-slate-700 bg-slate-800 text-slate-600"
                        }`}>
                        {m.earned ? "✓" : "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold leading-tight ${m.earned ? "text-slate-100" : "text-slate-600"}`}>{m.title}</p>
                        <p className="text-[10px] text-slate-500 leading-snug mt-0.5">{m.desc}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Zap className="h-2.5 w-2.5 text-indigo-400" />
                          <span className="text-[10px] font-bold text-indigo-400">{m.xp} XP</span>
                        </div>
                      </div>
                      {m.earned && <CheckCircle2 className="absolute -top-1.5 -right-1.5 h-4 w-4 text-emerald-400 bg-slate-900 rounded-full" />}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })()}

        {/* LIBRARY MILESTONES (inside Achievements tab) */}
        {tab === "achievements" && (() => {
          const noteCount = profileData?.libraryNotes.length ?? 0;
          const totalDl = profileData?.libraryNotes.reduce((s, n) => s + (n.downloads_count ?? 0), 0) ?? 0;
          const subjects = new Set(profileData?.libraryNotes.map(n => n.subject ?? ""));
          const LIB_MS = [
            { id: "first_note", title: "First Note", desc: "Upload your first note", xp: 10, tier: "Bronze", earned: noteCount >= 1 },
            { id: "note_pack", title: "Note Pack", desc: "Upload 5 notes", xp: 25, tier: "Bronze", earned: noteCount >= 5 },
            { id: "knowledge", title: "Knowledge Base", desc: "Upload 10 notes", xp: 50, tier: "Silver", earned: noteCount >= 10 },
            { id: "lib_titan", title: "Library Titan", desc: "Upload 25 notes", xp: 120, tier: "Gold", earned: noteCount >= 25 },
            { id: "pop_start", title: "Popular Start", desc: "Your notes get 50 total downloads", xp: 20, tier: "Bronze", earned: totalDl >= 50 },
            { id: "rising_star", title: "Rising Star", desc: "200 total downloads on your notes", xp: 60, tier: "Silver", earned: totalDl >= 200 },
            { id: "dl_legend", title: "Download Legend", desc: "500 total downloads on your notes", xp: 150, tier: "Gold", earned: totalDl >= 500 },
            { id: "cons_sharer", title: "Consistent Sharer", desc: "Upload notes in 3 different subjects", xp: 30, tier: "Bronze", earned: subjects.size >= 3 },
            { id: "domain_exp", title: "Domain Expert", desc: "Upload notes in 5 different subjects", xp: 70, tier: "Silver", earned: subjects.size >= 5 },
          ];
          const TIER_C: Record<string, string> = {
            Bronze: "border-amber-500/30 bg-amber-500/10",
            Silver: "border-slate-600 bg-slate-800/60",
            Gold: "border-yellow-500/30 bg-yellow-500/10",
          };
          const TIER_B: Record<string, string> = {
            Bronze: "bg-amber-500/20 text-amber-300 border-amber-500/30",
            Silver: "bg-slate-700 text-slate-300 border-slate-600",
            Gold: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
          };
          const earned = LIB_MS.filter(m => m.earned).length;
          return (
            <motion.div
              key="lib-milestones"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-slate-100">Library Milestones</h3>
                </div>
                <span className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-300">{earned}</span> / {LIB_MS.length} unlocked
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {LIB_MS.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`relative flex items-start gap-3 rounded-xl border p-3 shadow-sm transition ${m.earned ? TIER_C[m.tier] : "border-slate-800 bg-slate-800/40 opacity-40"
                      }`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[10px] font-black ${m.earned ? TIER_B[m.tier] : "border-slate-700 bg-slate-800 text-slate-600"
                      }`}>
                      {m.tier.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold leading-tight ${m.earned ? "text-slate-100" : "text-slate-600"}`}>{m.title}</p>
                      <p className="text-[10px] text-slate-500 leading-snug mt-0.5">{m.desc}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Zap className="h-2.5 w-2.5 text-amber-400" />
                        <span className="text-[10px] font-bold text-amber-400">{m.xp} XP</span>
                      </div>
                    </div>
                    {m.earned && <CheckCircle2 className="absolute -top-1.5 -right-1.5 h-4 w-4 text-emerald-400 bg-slate-900 rounded-full" />}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })()}

        {/* ACTIVITY */}
        {
          tab === "activity" && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-100">Recent Activity</h3>
                </div>
                {(() => {
                  const events: {
                    label: string;
                    sublabel?: string;
                    time: string;
                    icon: React.ElementType;
                    color: string;
                    href?: string;
                  }[] = [
                    // Forum posts authored
                    ...(profileData?.forumPosts.slice(0, 8).map((p) => ({
                      label: `Posted "${p.title.slice(0, 55)}${p.title.length > 55 ? "…" : ""}"`,
                      sublabel: p.category ? `Forum · ${p.category}` : "Forum",
                      time: p.created_at,
                      icon: MessageSquare,
                      color: "text-purple-400",
                      href: "/forums",
                    })) ?? []),
                    // Library uploads
                    ...(profileData?.libraryNotes
                      .filter((n) => n.created_at)
                      .slice(0, 5)
                      .map((n) => ({
                        label: `Uploaded "${n.title.slice(0, 55)}${n.title.length > 55 ? "…" : ""}"`,
                        sublabel: n.subject ? `Library · ${n.subject}` : "Library",
                        time: n.created_at!,
                        icon: Upload,
                        color: "text-amber-400",
                        href: "/library",
                      })) ?? []),
                  ]
                    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
                    .slice(0, 12);

                  if (events.length === 0)
                    return (
                      <div className="flex flex-col items-center gap-2 py-10 text-center">
                        <BarChart2 className="h-7 w-7 text-slate-600" />
                        <p className="text-sm text-slate-400">No activity yet. Start contributing!</p>
                      </div>
                    );

                  return (
                    <div className="relative flex flex-col gap-0">
                      <div className="absolute left-3.75 top-0 h-full w-px bg-slate-800" />
                      {events.map(({ label, sublabel, time, icon: Icon, color, href }, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="relative flex items-start gap-4 pb-5 last:pb-0"
                        >
                          <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800">
                            <Icon className={`h-3.5 w-3.5 ${color}`} />
                          </div>
                          <div className="flex-1 pt-0.5">
                            {href ? (
                              <Link href={href} className="block text-sm text-slate-300 hover:text-indigo-400 transition-colors">
                                {label}
                              </Link>
                            ) : (
                              <p className="text-sm text-slate-300">{label}</p>
                            )}
                            <div className="flex items-center gap-2 mt-0.5">
                              {sublabel && <span className="text-[10px] text-slate-500">{sublabel} ·</span>}
                              <span className="text-[10px] text-slate-500">
                                {new Date(time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )
        }

        {/* FOLLOWERS */}
        {
          tab === "followers" && (
            <motion.div
              key="followers"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col gap-5"
            >
              {socialLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              ) : (
                <>
                  {/* Followers list */}
                  <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
                    <div className="mb-4 flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-400" />
                      <h3 className="text-sm font-bold text-slate-100">
                        Followers
                      </h3>
                      <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-400 ring-1 ring-blue-500/30">
                        {followers.length}
                      </span>
                    </div>
                    {followers.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-8 text-center">
                        <Users className="h-7 w-7 text-slate-600" />
                        <p className="text-sm text-slate-400">No followers yet.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {followers.map((entry, i) => {
                          const name =
                            entry.profile.display_name ||
                            `User #${entry.userId.slice(0, 8)}`;
                          const initials2 = name
                            .split(" ")
                            .map((w: string) => w[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2);
                          const isFollowingBack = following.some(
                            (f) => f.userId === entry.userId,
                          );
                          const opKey = `follow-${entry.userId}`;
                          return (
                            <motion.div
                              key={entry.userId}
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.04 }}
                              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/40 px-4 py-3"
                            >
                              {entry.profile.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={entry.profile.avatar_url}
                                  alt={name}
                                  className="h-9 w-9 rounded-full object-cover ring-2 ring-slate-700"
                                />
                              ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white ring-2 ring-slate-700">
                                  {initials2}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-200 truncate">
                                  {name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {new Date(entry.created_at).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    },
                                  )}
                                </p>
                              </div>
                              <button
                                disabled={pendingOps[opKey]}
                                onClick={async () => {
                                  if (!user?.id) return;
                                  setPendingOps((p) => ({ ...p, [opKey]: true }));
                                  try {
                                    if (isFollowingBack) {
                                      await unfollowUser(user.id, entry.userId);
                                      setFollowing((prev) =>
                                        prev.filter(
                                          (f) => f.userId !== entry.userId,
                                        ),
                                      );
                                      setFollowCounts((c) => ({
                                        ...c,
                                        following: Math.max(0, c.following - 1),
                                      }));
                                    } else {
                                      await followUser(user.id, entry.userId);
                                      setFollowing((prev) => [
                                        {
                                          userId: entry.userId,
                                          profile: entry.profile,
                                          created_at: new Date().toISOString(),
                                        },
                                        ...prev,
                                      ]);
                                      setFollowCounts((c) => ({
                                        ...c,
                                        following: c.following + 1,
                                      }));
                                    }
                                  } catch {
                                    /* ignore */
                                  } finally {
                                    setPendingOps((p) => ({
                                      ...p,
                                      [opKey]: false,
                                    }));
                                  }
                                }}
                                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${isFollowingBack ? "border border-slate-700 bg-slate-800 text-slate-300 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400" : "bg-blue-600 text-white hover:bg-blue-500"}`}
                              >
                                {pendingOps[opKey] ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : isFollowingBack ? (
                                  <>
                                    <UserMinus className="h-3 w-3" />
                                    Unfollow
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="h-3 w-3" />
                                    Follow Back
                                  </>
                                )}
                              </button>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )
        }

        {/* FRIENDS */}
        {
          tab === "friends" && (
            <motion.div
              key="friends"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col gap-5"
            >
              {socialLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              ) : (
                <>
                  {/* Pending incoming requests */}
                  {friends.filter((f) => f.status === "pending" && !f.isRequester)
                    .length > 0 && (
                      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
                        <div className="mb-4 flex items-center gap-2">
                          <UserPlus className="h-4 w-4 text-amber-400" />
                          <h3 className="text-sm font-bold text-amber-100">
                            Friend Requests
                          </h3>
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400 ring-1 ring-amber-500/30">
                            {
                              friends.filter(
                                (f) => f.status === "pending" && !f.isRequester,
                              ).length
                            }
                          </span>
                        </div>
                        <div className="flex flex-col gap-2">
                          {friends
                            .filter((f) => f.status === "pending" && !f.isRequester)
                            .map((entry, i) => {
                              const name =
                                entry.profile.display_name ||
                                `User #${entry.userId.slice(0, 8)}`;
                              const initials2 = name
                                .split(" ")
                                .map((w: string) => w[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2);
                              const opKey = `fr-${entry.userId}`;
                              return (
                                <motion.div
                                  key={entry.userId}
                                  initial={{ opacity: 0, x: -6 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.04 }}
                                  className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3"
                                >
                                  {entry.profile.avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={entry.profile.avatar_url}
                                      alt={name}
                                      className="h-9 w-9 rounded-full object-cover ring-2 ring-zinc-200"
                                    />
                                  ) : (
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-amber-500 to-orange-600 text-xs font-bold text-white ring-2 ring-zinc-200">
                                      {initials2}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-amber-100 truncate">
                                      {name}
                                    </p>
                                    <p className="text-xs text-amber-500/60">
                                      sent a friend request
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 gap-2">
                                    <button
                                      disabled={pendingOps[opKey]}
                                      onClick={async () => {
                                        if (!user?.id) return;
                                        setPendingOps((p) => ({
                                          ...p,
                                          [opKey]: true,
                                        }));
                                        try {
                                          await acceptFriendRequest(
                                            entry.userId,
                                            user.id,
                                          );
                                          setFriends((prev) =>
                                            prev.map((f) =>
                                              f.userId === entry.userId
                                                ? { ...f, status: "accepted" }
                                                : f,
                                            ),
                                          );
                                          showToast(
                                            `You and ${name} are now friends!`,
                                            true,
                                          );
                                        } catch {
                                          /* ignore */
                                        } finally {
                                          setPendingOps((p) => ({
                                            ...p,
                                            [opKey]: false,
                                          }));
                                        }
                                      }}
                                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                                    >
                                      {pendingOps[opKey] ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <>
                                          <Check className="h-3 w-3" />
                                          Accept
                                        </>
                                      )}
                                    </button>
                                    <button
                                      disabled={pendingOps[opKey]}
                                      onClick={async () => {
                                        if (!user?.id) return;
                                        setPendingOps((p) => ({
                                          ...p,
                                          [opKey]: true,
                                        }));
                                        try {
                                          await declineFriendRequest(
                                            entry.userId,
                                            user.id,
                                          );
                                          setFriends((prev) =>
                                            prev.filter(
                                              (f) => f.userId !== entry.userId,
                                            ),
                                          );
                                        } catch {
                                          /* ignore */
                                        } finally {
                                          setPendingOps((p) => ({
                                            ...p,
                                            [opKey]: false,
                                          }));
                                        }
                                      }}
                                      className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 disabled:opacity-50"
                                    >
                                      <X className="h-3 w-3" />
                                      Decline
                                    </button>
                                  </div>
                                </motion.div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                  {/* Accepted friends */}
                  <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
                    <div className="mb-4 flex items-center gap-2">
                      <HeartHandshake className="h-4 w-4 text-emerald-400" />
                      <h3 className="text-sm font-bold text-slate-100">Friends</h3>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
                        {friends.filter((f) => f.status === "accepted").length}
                      </span>
                    </div>
                    {friends.filter((f) => f.status === "accepted").length ===
                      0 ? (
                      <div className="flex flex-col items-center gap-2 py-8 text-center">
                        <HeartHandshake className="h-7 w-7 text-slate-600" />
                        <p className="text-sm text-slate-400">No friends yet.</p>
                        <p className="text-xs text-slate-500">
                          Follow other users and send a friend request to connect.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {friends
                          .filter((f) => f.status === "accepted")
                          .map((entry, i) => {
                            const name =
                              entry.profile.display_name ||
                              `User #${entry.userId.slice(0, 8)}`;
                            const initials2 = name
                              .split(" ")
                              .map((w: string) => w[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2);
                            const opKey = `rm-${entry.userId}`;
                            return (
                              <motion.div
                                key={entry.userId}
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.04 }}
                                className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/40 px-4 py-3"
                              >
                                {entry.profile.avatar_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={entry.profile.avatar_url}
                                    alt={name}
                                    className="h-9 w-9 rounded-full object-cover ring-2 ring-zinc-200"
                                  />
                                ) : (
                                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white ring-2 ring-zinc-200">
                                    {initials2}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-200 truncate">
                                    {name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Friends since{" "}
                                    {new Date(
                                      entry.created_at,
                                    ).toLocaleDateString("en-US", {
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </p>
                                </div>
                                <button
                                  disabled={pendingOps[opKey]}
                                  onClick={async () => {
                                    if (!user?.id) return;
                                    setPendingOps((p) => ({
                                      ...p,
                                      [opKey]: true,
                                    }));
                                    try {
                                      await removeFriend(user.id, entry.userId);
                                      setFriends((prev) =>
                                        prev.filter(
                                          (f) => f.userId !== entry.userId,
                                        ),
                                      );
                                    } catch {
                                      /* ignore */
                                    } finally {
                                      setPendingOps((p) => ({
                                        ...p,
                                        [opKey]: false,
                                      }));
                                    }
                                  }}
                                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50"
                                >
                                  {pendingOps[opKey] ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    "Remove"
                                  )}
                                </button>
                              </motion.div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Sent � pending outgoing */}
                  {friends.filter((f) => f.status === "pending" && f.isRequester)
                    .length > 0 && (
                      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
                        <div className="mb-3 flex items-center gap-2">
                          <UserPlus className="h-4 w-4 text-slate-400" />
                          <h3 className="text-sm font-bold text-slate-100">
                            Pending Sent Requests
                          </h3>
                        </div>
                        <div className="flex flex-col gap-2">
                          {friends
                            .filter((f) => f.status === "pending" && f.isRequester)
                            .map((entry, i) => {
                              const name =
                                entry.profile.display_name ||
                                `User #${entry.userId.slice(0, 8)}`;
                              const initials2 = name
                                .split(" ")
                                .map((w: string) => w[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2);
                              const opKey = `cancel-${entry.userId}`;
                              return (
                                <motion.div
                                  key={entry.userId}
                                  initial={{ opacity: 0, x: -6 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.04 }}
                                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/40 px-4 py-3 opacity-70"
                                >
                                  {entry.profile.avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={entry.profile.avatar_url}
                                      alt={name}
                                      className="h-8 w-8 rounded-full object-cover ring-2 ring-slate-700"
                                    />
                                  ) : (
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-400">
                                      {initials2}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-300 truncate">
                                      {name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      Request pending
                                    </p>
                                  </div>
                                  <button
                                    disabled={pendingOps[opKey]}
                                    onClick={async () => {
                                      if (!user?.id) return;
                                      setPendingOps((p) => ({
                                        ...p,
                                        [opKey]: true,
                                      }));
                                      try {
                                        await declineFriendRequest(
                                          user.id,
                                          entry.userId,
                                        );
                                        setFriends((prev) =>
                                          prev.filter(
                                            (f) => f.userId !== entry.userId,
                                          ),
                                        );
                                      } catch {
                                        /* ignore */
                                      } finally {
                                        setPendingOps((p) => ({
                                          ...p,
                                          [opKey]: false,
                                        }));
                                      }
                                    }}
                                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 disabled:opacity-50"
                                  >
                                    {pendingOps[opKey] ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      "Cancel"
                                    )}
                                  </button>
                                </motion.div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                </>
              )}
            </motion.div>
          )
        }

        {/* FOLLOWING */}
        {tab === "following" && (
          <motion.div key="following" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col gap-4">
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
              <div className="mb-4 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-100">Following</h3>
                <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-400 ring-1 ring-indigo-500/30">{followCounts.following}</span>
              </div>
              {socialLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div>
              ) : following.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">You&apos;re not following anyone yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {following.map((entry, i) => {
                    const name = entry.profile.display_name ?? "Anonymous";
                    const ini = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
                    const opKey = `unfollow-${entry.userId}`;
                    return (
                      <motion.div key={entry.userId} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/40 px-4 py-3">
                        {entry.profile.avatar_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={entry.profile.avatar_url} alt={name} className="h-8 w-8 rounded-full object-cover ring-2 ring-slate-700" />
                          : <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-xs font-bold text-white">{ini}</div>
                        }
                        <div className="flex-1 min-w-0">
                          <Link href={`/users/${entry.userId}`} className="block truncate text-sm font-medium text-slate-200 hover:text-indigo-400 transition">{name}</Link>
                          <p className="text-xs text-slate-500">{new Date(entry.created_at).toLocaleDateString()}</p>
                        </div>
                        <button disabled={pendingOps[opKey]} onClick={async () => {
                          if (!user?.id) return;
                          setPendingOps((p) => ({ ...p, [opKey]: true }));
                          try {
                            await unfollowUser(user.id, entry.userId);
                            setFollowing((prev) => prev.filter((f) => f.userId !== entry.userId));
                            setFollowCounts((c) => ({ ...c, following: Math.max(0, c.following - 1) }));
                          } finally { setPendingOps((p) => ({ ...p, [opKey]: false })); }
                        }}
                          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 disabled:opacity-50">
                          {pendingOps[opKey] ? <Loader2 className="h-3 w-3 animate-spin" /> : <><UserMinus className="h-3 w-3" /> Unfollow</>}
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ADMIN MODERATION */}
        {tab === "admin" && isAdminMode && (
          <motion.div key="admin" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col gap-5">
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <ShieldCheck className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm font-bold text-amber-400">Admin Moderation Mode</p>
                <p className="text-xs text-amber-400/60">You can delete posts, notes, and groups below. Changes are permanent.</p>
              </div>
            </div>

            {/* Delete Forum Posts */}
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
              <div className="mb-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-bold text-slate-100">Forum Posts</h3>
                <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-400 ring-1 ring-purple-500/30">{profileData?.forumPosts.length ?? 0}</span>
              </div>
              {!profileData?.forumPosts.length ? (
                <p className="text-sm text-slate-500 py-2">No posts.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {profileData.forumPosts.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/40 px-4 py-2.5">
                      <p className="flex-1 truncate text-sm text-slate-200">{p.title}</p>
                      <span className="text-[10px] text-slate-500">{new Date(p.created_at).toLocaleDateString()}</span>
                      <button onClick={async () => {
                        try {
                          await adminDeletePost(p.id);
                          setProfileData((d) => d ? { ...d, forumPosts: d.forumPosts.filter((x) => x.id !== p.id) } : d);
                          showToast("Post deleted", true);
                        } catch { showToast("Failed to delete post", false); }
                      }} className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-400 hover:bg-rose-500/20 transition">
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Delete Library Notes */}
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
              <div className="mb-4 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">Library Notes</h3>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-500 ring-1 ring-amber-500/30">{profileData?.libraryNotes.length ?? 0}</span>
              </div>
              {!profileData?.libraryNotes.length ? (
                <p className="text-sm text-slate-500 py-2">No notes.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {profileData.libraryNotes.map((n) => (
                    <div key={n.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/40 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-slate-200">{n.title}</p>
                        {n.subject && <p className="text-xs text-slate-500">{n.subject}</p>}
                      </div>
                      <button onClick={async () => {
                        try {
                          await adminDeleteNote(n.id);
                          setProfileData((d) => d ? { ...d, libraryNotes: d.libraryNotes.filter((x) => x.id !== n.id) } : d);
                          showToast("Note deleted", true);
                        } catch { showToast("Failed to delete note", false); }
                      }} className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-400 hover:bg-rose-500/20 transition">
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Delete Campus Groups */}
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
              <div className="mb-4 flex items-center gap-2">
                <School className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">Campus Groups</h3>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/30">{myGroups.length}</span>
              </div>
              {!myGroups.length ? (
                <p className="text-sm text-slate-500 py-2">No campus groups.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {myGroups.map((g) => (
                    <div key={g.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/40 px-4 py-2.5">
                      <p className="flex-1 truncate text-sm font-medium text-slate-200">{g.name}</p>
                      <button onClick={async () => {
                        try {
                          await adminDeleteGroup(g.id);
                          setMyGroups((prev) => prev.filter((x) => x.id !== g.id));
                          showToast("Group deleted", true);
                        } catch { showToast("Failed to delete group", false); }
                      }} className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-400 hover:bg-rose-500/20 transition">
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* SETTINGS */}
        {
          tab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col gap-5"
            >
              {/* Profile picture */}
              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
                <div className="mb-4 flex items-center gap-2">
                  <Camera className="h-4 w-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-100">
                    Profile Picture
                  </h3>
                </div>
                <div className="flex items-center gap-5">
                  <div className="relative shrink-0">
                    <AvatarCircle
                      src={previewUrl ?? avatarUrl}
                      initials={initials}
                      size={64}
                    />
                    {previewUrl && (
                      <button
                        onClick={() => {
                          setPreviewUrl(null);
                          setAvatarFile(null);
                        }}
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 ring-1 ring-slate-700 hover:bg-rose-500 hover:text-white"
                      >
                        <X className="h-3 w-3 text-slate-400" />
                      </button>
                    )}
                  </div>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      const f = e.dataTransfer.files[0];
                      if (f) pickFile(f);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed py-5 text-center transition ${dragging ? "border-blue-500 bg-blue-500/5" : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/50"}`}
                  >
                    <Upload className="h-5 w-5 text-slate-400" />
                    <p className="text-xs text-slate-300">
                      Drop image or click to browse
                    </p>
                    <p className="text-[10px] text-slate-500">
                      PNG, JPG · Max 5 MB
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) pickFile(f);
                    }}
                  />
                </div>
                {avatarFile && (
                  <button
                    onClick={handleAvatarSave}
                    disabled={uploadingAvatar}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
                  >
                    {uploadingAvatar ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading…
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Picture
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Display name */}
              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
                <div className="mb-4 flex items-center gap-2">
                  <Settings className="h-4 w-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-100">
                    Display Name
                  </h3>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SettingsInput
                      label="First Name"
                      value={firstName}
                      onChange={setFirstName}
                      placeholder="John"
                    />
                    <SettingsInput
                      label="Last Name"
                      value={lastName}
                      onChange={setLastName}
                      placeholder="Smith"
                    />
                    <div className="sm:col-span-2 mt-1">
                      <SettingsInput
                        label="Username"
                        value={username}
                        onChange={setUsername}
                        placeholder="johndoe123"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">Email: {email}</p>
                  <button
                    onClick={handleNameSave}
                    disabled={savingName}
                    className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
                  >
                    {savingName ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Settings
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
                <div className="mb-4 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-100">
                    Change Password
                  </h3>
                </div>
                <div className="flex flex-col gap-3">
                  <SettingsInput
                    label="Current Password"
                    type={showPw ? "text" : "password"}
                    value={currentPw}
                    onChange={setCurrentPw}
                    placeholder="••••••••"
                    rightSlot={
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="text-slate-400 hover:text-slate-200"
                      >
                        {showPw ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    }
                  />
                  <SettingsInput
                    label="New Password"
                    type="password"
                    value={newPw}
                    onChange={setNewPw}
                    placeholder="Min. 8 characters"
                  />
                  <SettingsInput
                    label="Confirm Password"
                    type="password"
                    value={confirmPw}
                    onChange={setConfirmPw}
                    placeholder="Repeat new password"
                  />
                  {newPw.length > 0 && (
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => {
                        const score = [
                          newPw.length >= 8,
                          /[A-Z]/.test(newPw),
                          /[0-9]/.test(newPw),
                          /[^A-Za-z0-9]/.test(newPw),
                        ].filter(Boolean).length;
                        return (
                          <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full ${i < score ? ["bg-rose-500", "bg-amber-500", "bg-yellow-400", "bg-emerald-500"][score - 1] : "bg-slate-700"}`}
                          />
                        );
                      })}
                    </div>
                  )}
                  <button
                    onClick={handlePasswordSave}
                    disabled={savingPw || !currentPw || !newPw || !confirmPw}
                    className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingPw ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Updating…
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4" />
                        Update Password
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )
        }
      </AnimatePresence>

      {/* Note Preview Modal */}
      <AnimatePresence>
        {previewNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
            onClick={() => setPreviewNote(null)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 30 }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/50"
            >
              <div className="flex items-center justify-between border-b border-slate-800 px-6 py-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <BookOpen className="h-4 w-4 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-slate-100">{previewNote.title}</p>
                    {previewNote.subject && <p className="text-[10px] text-slate-400">{previewNote.subject}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {previewNote.file_url && (
                    <a
                      href={previewNote.file_url}
                      download
                      className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white hover:brightness-110 transition-all"
                    >
                      <Download className="h-3 w-3" /> Download
                    </a>
                  )}
                  <button
                    onClick={() => setPreviewNote(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-slate-950">
                {previewNote.file_url ? (
                  <iframe
                    src={`${previewNote.file_url}#view=FitH&toolbar=0`}
                    title={previewNote.title}
                    width="100%"
                    height="100%"
                    className="border-0"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">No preview available</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
        <AnimatePresence>
          {toast && <Toast msg={toast.msg} ok={toast.ok} />}
        </AnimatePresence>
      </div>
    </div >
  );
}
