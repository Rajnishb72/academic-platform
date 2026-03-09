"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  BadgeCheck,
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  GraduationCap,
  Loader2,
  MessageSquare,
  ThumbsUp,
  TrendingUp,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import {
  fetchPublicProfile,
  getSocialRelationship,
  getFollowCounts,
  getFollowers,
  getFollowing,
  followUser,
  unfollowUser,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend,
  likeProfile,
  unlikeProfile,
  getFriendsAndRequests,
  type SearchUser,
  type FollowEntry,
  type FriendEntry,
} from "@/lib/social";
import { computeUserXP, XP_TITLES, type XPBreakdown, type TitleLevel } from "@/lib/xp";
import {
  isAdminSession,
  adminDeletePost,
  adminDeleteNote,
  setUserVerified,
} from "@/lib/admin";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublicMaterial {
  id: string;
  title: string;
  subject: string;
  created_at: string;
  views_count?: number;
  downloads_count?: number;
  file_url?: string;
}
interface Post {
  id: string;
  title: string;
  created_at: string;
  upvotes_count?: number;
  comments_count?: number;
  category?: string;
}
interface Profile extends SearchUser {
  bio?: string;
  institution?: string;
  is_verified?: boolean;
}
type FriendStatus = "none" | "pending_sent" | "pending_received" | "accepted";
type Tab =
  | "overview"
  | "contributions"
  | "achievements"
  | "followers"
  | "following"
  | "friends";

function getBadges(
  posts: number,
  materials: number,
  groups: number,
  submitted: number,
  xp: number,
) {
  return [
    {
      label: "First Steps",
      desc: "Posted first forum discussion",
      icon: MessageSquare,
      earned: posts >= 1,
      color: "text-purple-400 bg-purple-500/10 ring-purple-500/20",
    },
    {
      label: "Wordsmith",
      desc: "10+ forum discussions",
      icon: MessageSquare,
      earned: posts >= 10,
      color: "text-purple-400 bg-purple-500/10 ring-purple-500/20",
    },
    {
      label: "Knowledge Keeper",
      desc: "Uploaded 3+ library notes",
      icon: BookOpen,
      earned: materials >= 3,
      color: "text-amber-400 bg-amber-500/10 ring-amber-500/20",
    },
    {
      label: "Library Scholar",
      desc: "Uploaded 10+ library notes",
      icon: BookOpen,
      earned: materials >= 10,
      color: "text-amber-400 bg-amber-500/10 ring-amber-500/20",
    },
    {
      label: "Group Player",
      desc: "Joined 2+ campus groups",
      icon: Users,
      earned: groups >= 2,
      color: "text-emerald-400 bg-emerald-500/10 ring-emerald-500/20",
    },
    {
      label: "Contributor",
      desc: "Submitted an assignment",
      icon: CheckCircle2,
      earned: submitted >= 1,
      color: "text-teal-400 bg-teal-500/10 ring-teal-500/20",
    },
    {
      label: "Engaged Scholar",
      desc: "Reached Scholar rank",
      icon: Brain,
      earned: xp >= 150,
      color: "text-blue-400 bg-blue-500/10 ring-blue-500/20",
    },
    {
      label: "Research Pro",
      desc: "Reached Academic rank",
      icon: Award,
      earned: xp >= 700,
      color: "text-violet-400 bg-violet-500/10 ring-violet-500/20",
    },
  ];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({
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
      className="flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 ring-4 ring-slate-800 text-2xl font-extrabold text-white"
    >
      {initials}
    </div>
  );
}

function FriendButton({
  status,
  loading,
  onAction,
}: {
  status: FriendStatus;
  loading: boolean;
  onAction: (a: "send" | "accept" | "remove") => void;
}) {
  const base =
    "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50";
  if (status === "accepted")
    return (
      <button
        onClick={() => onAction("remove")}
        disabled={loading}
        className={`${base} border-emerald-700/40 bg-emerald-600/15 text-emerald-400 hover:bg-rose-600/15 hover:border-rose-700/40 hover:text-rose-400`}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <UserCheck className="h-3.5 w-3.5" />
        )}{" "}
        Friends
      </button>
    );
  if (status === "pending_sent")
    return (
      <button
        onClick={() => onAction("remove")}
        disabled={loading}
        className={`${base} border-slate-700 bg-slate-800/60 text-slate-400`}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Users className="h-3.5 w-3.5" />
        )}{" "}
        Pending
      </button>
    );
  if (status === "pending_received")
    return (
      <button
        onClick={() => onAction("accept")}
        disabled={loading}
        className={`${base} border-amber-700/40 bg-amber-600/15 text-amber-400 hover:bg-emerald-600/15 hover:border-emerald-700/40 hover:text-emerald-400`}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}{" "}
        Accept
      </button>
    );
  return (
    <button
      onClick={() => onAction("send")}
      disabled={loading}
      className={`${base} border-slate-700 bg-slate-800/60 text-slate-400 hover:border-blue-700/40 hover:bg-blue-600/10 hover:text-blue-400`}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <UserPlus className="h-3.5 w-3.5" />
      )}{" "}
      Add Friend
    </button>
  );
}

function UserCard({ entry }: { entry: FollowEntry }) {
  const initials = (entry.profile.display_name ?? "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <Link
      href={`/users/${entry.userId}`}
      className="flex items-center gap-3 rounded-xl border border-slate-800/60 bg-slate-900/50 px-4 py-3 transition hover:border-blue-700/30 hover:bg-slate-800/50"
    >
      {entry.profile.avatar_url ? (
        <img
          src={entry.profile.avatar_url}
          alt=""
          className="h-9 w-9 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
          {initials}
        </div>
      )}
      <div className="min-w-0">
        <p className="flex items-center gap-1 truncate text-sm font-semibold text-slate-200">
          {entry.profile.display_name ?? "Anonymous"}
          {entry.profile.is_verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-blue-400" />}
        </p>
        <p className="text-xs text-slate-500">
          {new Date(entry.created_at).toLocaleDateString()}
        </p>
      </div>
    </Link>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useUser();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [materials, setMaterials] = useState<PublicMaterial[]>([]);
  const [groupCount, setGroupCount] = useState(0);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [followCounts, setFollowCounts] = useState({
    followers: 0,
    following: 0,
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>("none");
  const [followLoading, setFollowLoading] = useState(false);
  const [friendLoading, setFriendLoading] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [followers, setFollowers] = useState<FollowEntry[]>([]);
  const [following, setFollowing] = useState<FollowEntry[]>([]);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [xpData, setXpData] = useState<XPBreakdown | null>(null);
  const isAdminMode = isAdminSession();
  const isSelf = currentUser?.id === userId;

  useEffect(() => {
    if (!userId) return;
    async function load() {
      setLoading(true);
      try {
        const [pubData, countsData] = await Promise.all([
          fetchPublicProfile(userId),
          getFollowCounts(userId),
        ]);

        try {
          const userXp = await computeUserXP(userId);
          setXpData(userXp);
        } catch { /* ignore */ }

        const p = pubData.profile as Profile | null;

        // Fetch is_verified separately if not in profile data
        if (p && !("is_verified" in pubData.profile!)) {
          const { data: profRow } = await supabase
            .from("user_profiles")
            .select("is_verified")
            .eq("id", userId)
            .maybeSingle();
          if (profRow) p.is_verified = profRow.is_verified ?? false;
        }

        setProfile(p);
        setPosts(pubData.forumPosts as Post[]);
        setMaterials(pubData.materials as PublicMaterial[]);
        setGroupCount(pubData.groupCount ?? 0);
        setSubmittedCount(pubData.submittedCount ?? 0);
        setLikeCount(pubData.likeCount ?? 0);
        setFollowCounts(countsData);

        if (currentUser?.id && currentUser.id !== userId) {
          const rel = await getSocialRelationship(currentUser.id, userId);
          setIsFollowing(rel.isFollowing);
          setFriendStatus(rel.friendStatus as FriendStatus);
          setHasLiked(rel.hasLiked ?? false);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId, currentUser?.id]);

  // Load followers/following lazily when those tabs are opened
  useEffect(() => {
    if (
      (tab === "followers" || tab === "following" || tab === "friends") &&
      !socialLoaded
    ) {
      Promise.all([
        getFollowers(userId),
        getFollowing(userId),
        getFriendsAndRequests(userId),
      ]).then(([f, ing, frds]) => {
        setFollowers(f);
        setFollowing(ing);
        setFriends(frds);
        setSocialLoaded(true);
      });
    }
  }, [tab, userId, socialLoaded]);

  async function handleFollowToggle() {
    if (!currentUser?.id || isSelf) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(currentUser.id, userId);
        setIsFollowing(false);
        setFollowCounts((c) => ({
          ...c,
          followers: Math.max(0, c.followers - 1),
        }));
      } else {
        await followUser(currentUser.id, userId);
        setIsFollowing(true);
        setFollowCounts((c) => ({ ...c, followers: c.followers + 1 }));
      }
    } finally {
      setFollowLoading(false);
    }
  }

  async function handleFriendAction(action: "send" | "accept" | "remove") {
    if (!currentUser?.id || isSelf) return;
    setFriendLoading(true);
    try {
      if (action === "send") {
        await sendFriendRequest(currentUser.id, userId);
        setFriendStatus("pending_sent");
      } else if (action === "accept") {
        await acceptFriendRequest(currentUser.id, userId);
        setFriendStatus("accepted");
      } else {
        await removeFriend(currentUser.id, userId);
        setFriendStatus("none");
      }
    } finally {
      setFriendLoading(false);
    }
  }

  async function handleLike() {
    if (!currentUser?.id || isSelf) return;
    setLikeLoading(true);
    try {
      if (hasLiked) {
        await unlikeProfile(currentUser.id, userId);
        setHasLiked(false);
        setLikeCount((c) => Math.max(0, c - 1));
      } else {
        await likeProfile(currentUser.id, userId);
        setHasLiked(true);
        setLikeCount((c) => c + 1);
      }
    } finally {
      setLikeLoading(false);
    }
  }

  if (loading)
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm text-slate-400">Loading profile…</p>
      </div>
    );

  if (!profile)
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-semibold text-slate-300">User not found</p>
        <button
          onClick={() => router.back()}
          className="text-sm text-blue-400 hover:underline"
        >
          Go back
        </button>
      </div>
    );

  const displayName = profile.display_name ?? `User ${userId.slice(0, 6)}`;
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const xp = xpData?.totalXP ?? 0;
  const badges = getBadges(
    posts.length,
    materials.length,
    groupCount,
    submittedCount,
    xp,
  );
  const earnedCount = badges.filter((b) => b.earned).length;

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "contributions", label: "Contributions" },
    { id: "achievements", label: "Achievements" },
    { id: "followers", label: `Followers (${followCounts.followers})` },
    { id: "following", label: `Following (${followCounts.following})` },
    { id: "friends", label: "Friends" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <div className="mb-5 flex items-center gap-2 text-xs text-slate-500">
        <Link href="/dashboard" className="hover:text-slate-300 transition">
          Academix
        </Link>
        <span>/</span>
        <Link href="/search" className="hover:text-slate-300 transition">
          Search
        </Link>
        <span>/</span>
        <span className="max-w-[160px] truncate text-slate-400">
          {displayName}
        </span>
      </div>

      {/* Profile Hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/50"
      >
        {/* Gradient top bar */}
        <div className="h-24 bg-gradient-to-br from-blue-900/60 via-indigo-900/40 to-purple-900/60" />
        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <Avatar src={profile.avatar_url} initials={initials} size={80} />
              <div className="mb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-white">
                    {displayName}
                  </h1>
                  {profile.is_verified && (
                    <span title="Verified User">
                      <BadgeCheck className="h-5 w-5 text-blue-400" />
                    </span>
                  )}
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${xpData?.title.color ?? "text-slate-400"} bg-slate-800 border-slate-700`}
                  >
                    {xpData?.title.name ?? "Newcomer"}
                  </span>
                </div>
                {/* Institution / Role */}
                {profile.institution && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-400">
                    <GraduationCap className="h-4 w-4 shrink-0" />
                    {profile.institution}
                  </p>
                )}
                {/* XP bar */}
                <div className="mt-1.5 flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <div className="h-1.5 w-36 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                      style={{ width: `${xpData?.progressPct ?? 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500">
                    Lv {xpData?.title.rank ?? 1} · {xp} XP
                  </span>
                </div>
              </div>
            </div>
            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Like button */}
              {!isSelf && currentUser && (
                <button
                  onClick={handleLike}
                  disabled={likeLoading}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${hasLiked ? "border-blue-700/40 bg-blue-600/15 text-blue-400" : "border-slate-700 bg-slate-800/60 text-slate-400 hover:border-blue-700/40 hover:text-blue-400"}`}
                >
                  {likeLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ThumbsUp className="h-3.5 w-3.5" />
                  )}
                  {likeCount}
                </button>
              )}
              {isSelf && (
                <span className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-400">
                  <ThumbsUp className="h-3.5 w-3.5" /> {likeCount}
                </span>
              )}
              {!isSelf && currentUser && (
                <>
                  <button
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${isFollowing ? "border-blue-700/50 bg-blue-600/15 text-blue-400 hover:bg-rose-600/15 hover:border-rose-700/40 hover:text-rose-400" : "border-blue-700/50 bg-blue-600/15 text-blue-400 hover:bg-blue-600/25"}`}
                  >
                    {followLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isFollowing ? (
                      <UserMinus className="h-3.5 w-3.5" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5" />
                    )}
                    {isFollowing ? "Unfollow" : "Follow"}
                  </button>
                  <FriendButton
                    status={friendStatus}
                    loading={friendLoading}
                    onAction={handleFriendAction}
                  />
                </>
              )}
              {isSelf && (
                <Link
                  href="/profile"
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:border-blue-700/40 hover:text-blue-400 transition"
                >
                  Edit Profile
                </Link>
              )}
              {isAdminMode && !isSelf && (
                <button
                  onClick={async () => {
                    await setUserVerified(userId, !profile.is_verified);
                    setProfile((p) =>
                      p ? { ...p, is_verified: !p.is_verified } : p,
                    );
                  }}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${profile.is_verified ? "border-slate-700 bg-slate-800/60 text-slate-400 hover:border-blue-700/40 hover:text-blue-400" : "border-blue-700/40 bg-blue-600/15 text-blue-400"}`}
                >
                  <BadgeCheck className="h-3.5 w-3.5" />{" "}
                  {profile.is_verified ? "Remove Verified" : "Verify"}
                </button>
              )}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="mt-5 border-t border-slate-800/60 pt-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                {profile.bio}
              </p>
            </div>
          )}

          {/* Stats row */}
          <div className="mt-4 flex flex-wrap gap-5 text-xs text-slate-400 border-t border-slate-800/60 pt-4">
            {[
              {
                label: "Followers",
                value: followCounts.followers,
                color: "text-violet-400",
              },
              {
                label: "Following",
                value: followCounts.following,
                color: "text-blue-400",
              },
              {
                label: "Likes",
                value: likeCount,
                color: "text-blue-400",
                icon: ThumbsUp,
              },
              {
                label: "Badges",
                value: `${earnedCount} / ${badges.length}`,
                color: "text-amber-400",
              },
              { label: "XP", value: xp, color: "text-amber-400" },
            ].map(({ label, value, color }) => (
              <span key={label} className="flex items-center gap-1">
                <span className={`font-bold ${color}`}>{value}</span> {label}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="mb-5 flex gap-0.5 overflow-x-auto border-b border-slate-800 pb-0 scrollbar-hide">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative shrink-0 pb-3 px-3 text-sm font-semibold transition whitespace-nowrap ${tab === t.id ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
          >
            {t.label}
            {tab === t.id && (
              <motion.div
                layoutId="pub-tab"
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-blue-500"
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* OVERVIEW */}
        {tab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                {
                  label: "Forum Posts",
                  value: posts.length,
                  color: "text-purple-400",
                  bg: "bg-purple-500/10 ring-purple-500/20",
                },
                {
                  label: "Library Files",
                  value: materials.length,
                  color: "text-amber-400",
                  bg: "bg-amber-500/10 ring-amber-500/20",
                },
                {
                  label: "Campus Groups",
                  value: groupCount,
                  color: "text-emerald-400",
                  bg: "bg-emerald-500/10 ring-emerald-500/20",
                },
                {
                  label: "Submissions",
                  value: submittedCount,
                  color: "text-teal-400",
                  bg: "bg-teal-500/10 ring-teal-500/20",
                },
                {
                  label: "Profile Likes",
                  value: likeCount,
                  color: "text-blue-400",
                  bg: "bg-blue-500/10 ring-blue-500/20",
                },
                {
                  label: "Badges",
                  value: `${earnedCount} / ${badges.length}`,
                  color: "text-amber-400",
                  bg: "bg-amber-500/10 ring-amber-500/20",
                },
              ].map(({ label, value, color, bg }) => (
                <div
                  key={label}
                  className={`flex flex-col gap-2 rounded-2xl border border-slate-800/60 bg-slate-900/50 p-4 ring-1 ${bg}`}
                >
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-slate-400">{label}</p>
                </div>
              ))}
            </div>

            {/* Forum Tier Card */}
            {(() => {
              const forumRep = posts.reduce(
                (s, p) =>
                  s + (p.upvotes_count ?? 0) + 10 + (p.comments_count ?? 0),
                0,
              );
              const FORUM_TIERS = [
                {
                  label: "Member",
                  min: 0,
                  max: 99,
                  color: "text-slate-400",
                  ring: "ring-slate-700",
                },
                {
                  label: "Contributor",
                  min: 100,
                  max: 299,
                  color: "text-emerald-400",
                  ring: "ring-emerald-500/30",
                },
                {
                  label: "Veteran",
                  min: 300,
                  max: 699,
                  color: "text-blue-400",
                  ring: "ring-blue-500/30",
                },
                {
                  label: "Expert",
                  min: 700,
                  max: 1499,
                  color: "text-violet-400",
                  ring: "ring-violet-500/30",
                },
                {
                  label: "Scholar",
                  min: 1500,
                  max: 3499,
                  color: "text-amber-400",
                  ring: "ring-amber-500/30",
                },
                {
                  label: "Legend",
                  min: 3500,
                  max: Infinity,
                  color: "text-rose-400",
                  ring: "ring-rose-500/30",
                },
              ];
              const forumTier =
                FORUM_TIERS.slice()
                  .reverse()
                  .find((t) => forumRep >= t.min) ?? FORUM_TIERS[0];
              const forumRepPct =
                forumTier.max !== Infinity
                  ? Math.min(
                    ((forumRep - forumTier.min) /
                      (forumTier.max - forumTier.min)) *
                    100,
                    100,
                  )
                  : 100;

              return (
                <div className="mt-5 rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950/50 border ${forumTier.ring}`}
                    >
                      <MessageSquare className={`h-5 w-5 ${forumTier.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Forum Tier
                      </p>
                      <p className={`text-base font-bold ${forumTier.color}`}>
                        {forumTier.label}
                      </p>
                    </div>
                  </div>
                  {forumTier.max !== Infinity ? (
                    <>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${forumRepPct}%` }}
                          transition={{
                            duration: 1,
                            ease: "easeOut",
                            delay: 0.5,
                          }}
                        />
                      </div>
                      <p className="mt-2 text-[10px] text-slate-500">
                        {forumRep} / {forumTier.max} Rep
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-amber-300 font-bold mt-2">
                      🏆 Max Tier Achieved
                    </p>
                  )}
                </div>
              );
            })()}

            {/* XP progress */}
            <div className="mt-5 rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <p className="text-sm font-bold text-slate-200">
                    Level {xpData?.title.rank ?? 1} — <span className={`${xpData?.title.color ?? "text-slate-400"}`}>{xpData?.title.name ?? "Newcomer"}</span>
                  </p>
                </div>
                <span className="text-xs text-slate-500">{xp} XP</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700"
                  style={{ width: `${xpData?.progressPct ?? 0}%` }}
                />
              </div>
              <p className="mt-2 text-[10px] text-slate-500">
                {xpData?.progressPct ?? 0}% to next level ({xpData?.nextTitle?.name ?? "Max"})
              </p>
            </div>
          </motion.div>
        )}

        {/* CONTRIBUTIONS */}
        {tab === "contributions" && (
          <motion.div
            key="contributions"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-6"
          >
            {/* Forum posts */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-purple-400" />
                <h2 className="text-sm font-bold text-slate-200">
                  Forum Posts
                </h2>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-400">
                  {posts.length}
                </span>
              </div>
              {posts.length === 0 ? (
                <p className="py-4 text-sm text-slate-600">
                  No forum posts yet.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {posts.map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-col gap-1 rounded-xl border border-slate-800/60 bg-slate-900/50 px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="flex-1 truncate text-sm font-semibold text-slate-200">
                          {p.title}
                        </p>
                        {isAdminMode && (
                          <button
                            onClick={async () => {
                              await adminDeletePost(p.id);
                              setPosts((prev) =>
                                prev.filter((x) => x.id !== p.id),
                              );
                            }}
                            className="shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-medium text-rose-500 hover:bg-rose-900/30 transition"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        {p.category && (
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-400">
                            {p.category}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-blue-400" />
                          {p.upvotes_count ?? 0} upvotes
                        </span>
                        <span>
                          {new Date(p.created_at).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric", year: "numeric" },
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Library materials */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-amber-400" />
                <h2 className="text-sm font-bold text-slate-200">
                  Library Materials
                </h2>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-400">
                  {materials.length}
                </span>
              </div>
              {materials.length === 0 ? (
                <p className="py-4 text-sm text-slate-600">
                  No library uploads yet.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {materials.map((m) => (
                    <div
                      key={m.id}
                      className="group flex items-start gap-3 rounded-xl border border-slate-800/60 bg-slate-900/50 px-4 py-3 transition hover:border-amber-700/40"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
                        <BookOpen className="h-3.5 w-3.5 text-amber-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-200 group-hover:text-amber-300 transition">
                          {m.title}
                        </p>
                        {m.subject && (
                          <p className="text-xs text-slate-500">{m.subject}</p>
                        )}
                        <div className="mt-1 flex gap-3 text-[10px] text-slate-500">
                          <span>{m.views_count ?? 0} views</span>
                          <span>{m.downloads_count ?? 0} downloads</span>
                        </div>
                      </div>
                      {isAdminMode && (
                        <button
                          onClick={async () => {
                            await adminDeleteNote(m.id);
                            setMaterials((prev) =>
                              prev.filter((x) => x.id !== m.id),
                            );
                          }}
                          className="shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-medium text-rose-500 hover:bg-rose-900/30 transition"
                        >
                          Delete
                        </button>
                      )}
                    </div>
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
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="mb-4 flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-bold text-slate-200">Badges</h2>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-400">
                {earnedCount} / {badges.length}
              </span>
            </div>
            {/* Progress bar */}
            <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                style={{
                  width: `${Math.round((earnedCount / badges.length) * 100)}%`,
                }}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {badges.map((b) => (
                <div
                  key={b.label}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${b.earned ? "border-slate-700/50 bg-slate-800/40" : "border-slate-800/40 bg-slate-900/30 opacity-40 grayscale"}`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${b.color}`}
                  >
                    <b.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      {b.label}
                    </p>
                    <p className="text-xs text-slate-500">{b.desc}</p>
                  </div>
                  {b.earned && (
                    <Check className="ml-auto h-4 w-4 shrink-0 text-emerald-400" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* FOLLOWERS */}
        {tab === "followers" && (
          <motion.div
            key="followers"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-400" />
              <h2 className="text-sm font-bold text-slate-200">Followers</h2>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-400">
                {followCounts.followers}
              </span>
            </div>
            {!socialLoaded ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
              </div>
            ) : followers.length === 0 ? (
              <p className="py-4 text-sm text-slate-600">No followers yet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {followers.map((e) => (
                  <UserCard key={e.userId} entry={e} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* FOLLOWING */}
        {tab === "following" && (
          <motion.div
            key="following"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="mb-4 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-blue-400" />
              <h2 className="text-sm font-bold text-slate-200">Following</h2>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-400">
                {followCounts.following}
              </span>
            </div>
            {!socialLoaded ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
              </div>
            ) : following.length === 0 ? (
              <p className="py-4 text-sm text-slate-600">
                Not following anyone yet.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {following.map((e) => (
                  <UserCard key={e.userId} entry={e} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* FRIENDS */}
        {tab === "friends" && (
          <motion.div
            key="friends"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-slate-200">Friends</h2>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-400">
                {friends.filter((f) => f.status === "accepted").length}
              </span>
            </div>
            {!socialLoaded ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
              </div>
            ) : friends.filter((f) => f.status === "accepted").length === 0 ? (
              <p className="py-4 text-sm text-slate-600">No friends yet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {friends
                  .filter((f) => f.status === "accepted")
                  .map((e) => (
                    <UserCard key={e.userId} entry={e as any} />
                  ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
