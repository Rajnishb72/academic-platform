"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Award,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  PenSquare,
  Crown,
  Medal,
  Loader2,
  Zap,
  Info,
  ChevronRight,
  Star,
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { fetchLeaderboard, fetchMyPosts, LeaderboardEntry, ForumPost } from "@/lib/forums";
import Link from "next/link";

const REPUTATION_TIERS = [
  {
    label: "Member",
    min: 0,
    max: 99,
    color: "text-slate-400",
    ring: "ring-slate-700",
    bg: "bg-slate-800/50",
    dot: "bg-slate-500",
    description: "Brand new — just getting started",
  },
  {
    label: "Contributor",
    min: 100,
    max: 299,
    color: "text-emerald-400",
    ring: "ring-emerald-500/30",
    bg: "bg-emerald-500/10",
    dot: "bg-emerald-400",
    description: "Consistently posting and engaging",
  },
  {
    label: "Veteran",
    min: 300,
    max: 699,
    color: "text-blue-400",
    ring: "ring-blue-500/30",
    bg: "bg-blue-500/10",
    dot: "bg-blue-400",
    description: "Trusted voice with quality content",
  },
  {
    label: "Expert",
    min: 700,
    max: 1499,
    color: "text-violet-400",
    ring: "ring-violet-500/30",
    bg: "bg-violet-500/10",
    dot: "bg-violet-400",
    description: "Highly valued community knowledge",
  },
  {
    label: "Scholar",
    min: 1500,
    max: 3499,
    color: "text-amber-400",
    ring: "ring-amber-500/30",
    bg: "bg-amber-500/10",
    dot: "bg-amber-400",
    description: "Top-tier reputation, widely respected",
  },
  {
    label: "Legend",
    min: 3500,
    max: Infinity,
    color: "text-rose-400",
    ring: "ring-rose-500/30",
    bg: "bg-rose-500/10",
    dot: "bg-rose-500",
    description: "Pinnacle — an icon of the community",
  },
];

const BADGE_STYLES: Record<string, string> = {
  Member: "bg-slate-800/60 text-slate-400 ring-1 ring-slate-700",
  Contributor: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30",
  Veteran: "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30",
  Expert: "bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/30",
  Scholar: "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30",
  Legend: "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30",
};

function calcRep(posts: ForumPost[]): number {
  return Math.max(
    0,
    posts.reduce(
      (s, p) =>
        s +
        10 +
        p.upvotes_count * 5 +
        p.comments_count * 1 -
        p.downvotes_count * 2,
      0,
    ),
  );
}

function getTier(rep: number) {
  return (
    REPUTATION_TIERS.slice().reverse().find((t) => rep >= t.min) ??
    REPUTATION_TIERS[0]
  );
}

function getNextTier(rep: number) {
  return REPUTATION_TIERS.find((t) => rep < t.max) ?? REPUTATION_TIERS[REPUTATION_TIERS.length - 1];
}

const RANK_ICON = (rank: number) => {
  if (rank === 1) return <Crown className="h-4 w-4 text-amber-400" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-slate-400" />;
  if (rank === 3) return <Medal className="h-4 w-4 text-amber-600" />;
  return <span className="text-xs font-bold text-slate-500">#{rank}</span>;
};

const TABS = ["Leaderboard", "My Reputation", "How It Works"] as const;
type Tab = (typeof TABS)[number];

const ACTIONS = [
  { action: "Create a post", icon: PenSquare, pts: "+10", color: "text-indigo-400" },
  { action: "Receive an upvote", icon: ThumbsUp, pts: "+5", color: "text-emerald-400" },
  { action: "Someone comments on your post", icon: MessageCircle, pts: "+1", color: "text-blue-400" },
  { action: "Receive a downvote", icon: ThumbsDown, pts: "−2", color: "text-rose-400" },
];

export default function ReputationPage() {
  const { user } = useUser();
  const userId = user?.id ?? null;

  const [activeTab, setActiveTab] = useState<Tab>("Leaderboard");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myPosts, setMyPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard().then((data) => {
      setLeaderboard(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchMyPosts(userId).then(setMyPosts);
  }, [userId]);

  const myRep = calcRep(myPosts);
  const myTier = getTier(myRep);
  const nextTier = getNextTier(myRep);
  const totalUpvotes = myPosts.reduce((s, p) => s + p.upvotes_count, 0);
  const totalDownvotes = myPosts.reduce((s, p) => s + p.downvotes_count, 0);
  const totalComments = myPosts.reduce((s, p) => s + p.comments_count, 0);
  const currentTierIdx = REPUTATION_TIERS.findIndex((t) => t.label === myTier.label);
  const prevMin = REPUTATION_TIERS[currentTierIdx]?.min ?? 0;
  const nextMax = nextTier.max === Infinity ? myRep + 1 : nextTier.max;
  const progress = nextTier.max === Infinity
    ? 100
    : Math.min(((myRep - prevMin) / (nextMax - prevMin)) * 100, 100);

  const myRank = leaderboard.findIndex((e) => e.user_id === userId) + 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Tab toggle */}
      <div className="flex items-center gap-1 self-start rounded-xl border border-slate-700/60 bg-slate-900/50 p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all
              ${activeTab === tab
                ? "bg-slate-800 text-indigo-400 ring-1 ring-indigo-500/30 shadow-sm"
                : "text-slate-500 hover:text-slate-300"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── LEADERBOARD ── */}
      {activeTab === "Leaderboard" && (
        loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-900/50 py-20">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-indigo-400" />
            <p className="text-sm text-slate-400">Loading leaderboard…</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-900/50 py-20 text-center">
            <Award className="mb-3 h-10 w-10 text-slate-600" />
            <p className="text-sm text-slate-400">No contributors yet</p>
            <p className="mt-1 text-xs text-slate-500">Be the first to post and earn reputation!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Podium top 3 */}
            {leaderboard.length >= 1 && (
              <div className="flex flex-row items-end justify-center gap-3 pt-6 pb-2">
                {[1, 0, 2].map((orderedIndex) => {
                  const c = leaderboard[orderedIndex];
                  if (!c) return <div key={orderedIndex} className="w-[30%]" />;

                  const tier = getTier(c.total_rep);
                  const isFirst = orderedIndex === 0;
                  const isSecond = orderedIndex === 1;

                  return (
                    <motion.div
                      key={c.user_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: orderedIndex * 0.1 }}
                      className={`relative flex flex-col items-center gap-2 rounded-t-2xl border-t border-l border-r p-4 text-center transition w-[30%] max-w-[140px]
                        ${isFirst ? "h-56 border-amber-500/40 bg-gradient-to-b from-amber-500/15 to-slate-900/60 shadow-lg shadow-amber-900/20 z-10" :
                          isSecond ? "h-48 border-slate-700/60 bg-slate-800/50" : "h-44 border-amber-700/30 bg-amber-900/10"}`}
                    >
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">{RANK_ICON(orderedIndex + 1)}</div>
                      <div className={`flex items-center justify-center rounded-full text-sm font-black text-white shadow-md mb-1
                        ${isFirst ? "h-14 w-14 bg-gradient-to-br from-amber-400 to-orange-500 ring-4 ring-amber-500/20" :
                          isSecond ? "h-11 w-11 bg-gradient-to-br from-slate-400 to-slate-600 ring-2 ring-slate-500/20" :
                            "h-10 w-10 bg-gradient-to-br from-amber-600 to-amber-800 ring-2 ring-amber-700/20"}`}>
                        {c.author_avatar}
                      </div>
                      <p className="text-xs font-semibold text-slate-200 leading-tight truncate w-full">{c.author_name}</p>
                      <p className={`text-lg font-black ${isFirst ? "text-amber-400" : "text-slate-300"}`}>
                        {c.total_rep.toLocaleString()}
                      </p>
                      <span className={`mt-auto mb-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${BADGE_STYLES[tier.label]}`}>
                        {tier.label}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Full table */}
            <div className="overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/50">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-800/50">
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Rank</th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">User</th>
                    <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">Rep</th>
                    <th className="hidden px-5 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500 sm:table-cell">Posts</th>
                    <th className="hidden px-5 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500 sm:table-cell">Upvotes</th>
                    <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.slice(3, 10).map((c, idx) => {
                    const actualRank = idx + 4;
                    const isMe = c.user_id === userId;
                    const tier = getTier(c.total_rep);
                    return (
                      <motion.tr
                        key={c.user_id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className={`border-b border-slate-800/60 transition-colors last:border-0
                          ${isMe ? "bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/20" : "hover:bg-slate-800/40"}`}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">{RANK_ICON(actualRank)}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[10px] font-bold text-white
                              ${isMe ? "ring-2 ring-indigo-400 ring-offset-1 ring-offset-slate-900" : ""}`}>
                              {c.author_avatar}
                            </div>
                            <div>
                              <p className={`text-xs font-semibold ${isMe ? "text-indigo-400" : "text-slate-200"}`}>
                                {c.author_name}
                              </p>
                              {isMe && <p className="text-[10px] text-indigo-400">You</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="text-sm font-black text-slate-100">{c.total_rep.toLocaleString()}</span>
                        </td>
                        <td className="hidden px-5 py-3 text-right text-xs text-slate-500 sm:table-cell">{c.posts}</td>
                        <td className="hidden px-5 py-3 text-right sm:table-cell">
                          <span className="flex items-center justify-end gap-1 text-xs text-emerald-400">
                            <ThumbsUp className="h-3 w-3" /> {c.total_upvotes}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${BADGE_STYLES[tier.label]}`}>
                            {tier.label}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* ── MY REPUTATION ── */}
      {activeTab === "My Reputation" && (
        <div className="flex flex-col gap-5">
          {/* Hero card */}
          <div className={`relative overflow-hidden rounded-2xl border p-6 ${myTier.ring} ${myTier.bg}`}>
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-gradient-to-br from-white/5 to-transparent -translate-y-8 translate-x-8" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Your Reputation</p>
                <p className="text-5xl font-black text-slate-100 tabular-nums">
                  {myRep.toLocaleString()}
                  <span className="text-sm font-normal text-slate-500 ml-2">pts</span>
                </p>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${BADGE_STYLES[myTier.label]}`}>
                    {myTier.label}
                  </span>
                  {myRank > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-slate-800/60 px-3 py-1 text-xs font-semibold text-slate-300 ring-1 ring-slate-700">
                      <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                      Rank #{myRank}
                    </span>
                  )}
                  {nextTier.max !== Infinity && (
                    <span className="text-xs text-slate-500">
                      → next: <span className={`font-semibold ${nextTier.color}`}>{nextTier.label}</span>
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-500 italic">{myTier.description}</p>
              </div>
              <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 shadow-sm ${myTier.ring} bg-slate-900/80`}>
                <Award className={`h-8 w-8 ${myTier.color}`} />
              </div>
            </div>

            {/* Progress bar */}
            {nextTier.max !== Infinity && (
              <div className="mt-5">
                <div className="mb-2 flex justify-between text-[11px] text-slate-500">
                  <span>Progress to <span className={`font-bold ${nextTier.color}`}>{nextTier.label}</span></span>
                  <span className="tabular-nums">{myRep} / {nextTier.max}</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-800 ring-1 ring-slate-700">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-500 text-right">
                  {Math.max(0, (nextTier.max === Infinity ? 0 : nextTier.max) - myRep)} pts to next tier
                </p>
              </div>
            )}
            {nextTier.max === Infinity && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-400 ring-1 ring-rose-500/20">
                <Crown className="h-3.5 w-3.5" /> Maximum tier reached — you&apos;re a Legend!
              </div>
            )}
          </div>

          {/* Stats breakdown */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Posts", value: myPosts.length, icon: PenSquare, color: "text-indigo-400", pts: `+${myPosts.length * 10} pts`, bg: "bg-indigo-500/10" },
              { label: "Upvotes", value: totalUpvotes, icon: ThumbsUp, color: "text-emerald-400", pts: `+${totalUpvotes * 5} pts`, bg: "bg-emerald-500/10" },
              { label: "Comments", value: totalComments, icon: MessageCircle, color: "text-blue-400", pts: `+${totalComments} pts`, bg: "bg-blue-500/10" },
              { label: "Downvotes", value: totalDownvotes, icon: ThumbsDown, color: "text-rose-400", pts: `-${totalDownvotes * 2} pts`, bg: "bg-rose-500/10" },
            ].map(({ label, value, icon: Icon, color, pts, bg }) => (
              <div key={label} className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-4">
                <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <p className="text-xl font-black text-slate-100 tabular-nums">{value}</p>
                <p className="text-[10px] text-slate-500">{label}</p>
                <p className={`mt-0.5 text-[10px] font-bold ${color}`}>{pts}</p>
              </div>
            ))}
          </div>

          {/* Tier reference */}
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">All Tiers</p>
            <div className="flex flex-col gap-1.5">
              {REPUTATION_TIERS.map((tier) => {
                const isCurrent = myTier.label === tier.label;
                const isReached = myRep >= tier.min;
                return (
                  <div
                    key={tier.label}
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 transition
                      ${isCurrent ? `${tier.bg} ring-1 ${tier.ring}` : isReached ? "bg-slate-800/40" : "opacity-40"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${isReached ? tier.dot : "bg-slate-600"}`} />
                      <div>
                        <p className={`text-xs font-bold ${isCurrent ? tier.color : isReached ? "text-slate-300" : "text-slate-600"}`}>
                          {tier.label}
                          {isCurrent && <span className="ml-2 text-[10px] font-normal opacity-70">(current)</span>}
                        </p>
                        <p className="text-[10px] text-slate-500">{tier.description}</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 shrink-0 ml-3">
                      {tier.min}–{tier.max === Infinity ? "∞" : tier.max}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <Link
            href="/forums/my-discussions"
            className="flex items-center justify-between rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-5 py-3.5 text-sm font-semibold text-indigo-400 transition hover:bg-indigo-500/20"
          >
            <span>View all my posts</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* ── HOW IT WORKS ── */}
      {activeTab === "How It Works" && (
        <div className="flex flex-col gap-5">
          {/* Intro */}
          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-5">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-indigo-400" />
              <div>
                <p className="text-sm font-bold text-slate-100 mb-1">How Reputation Works</p>
                <p className="text-xs leading-relaxed text-slate-400">
                  Reputation is a <span className="font-semibold text-slate-300">continuous score</span> that reflects the quality
                  and impact of your contributions. Unlike badges (one-time unlocks), reputation
                  <span className="font-semibold text-slate-300"> grows and can decrease</span> based on community feedback —
                  just like Reddit karma. Post quality content, engage thoughtfully, and watch your score climb.
                </p>
              </div>
            </div>
          </div>

          {/* Actions table */}
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 overflow-hidden">
            <div className="border-b border-slate-800 bg-slate-800/50 px-5 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Point Actions</p>
            </div>
            <div className="divide-y divide-slate-800/60">
              {ACTIONS.map(({ action, icon: Icon, pts, color }) => (
                <div key={action} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800">
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <p className="flex-1 text-sm text-slate-300">{action}</p>
                  <span className={`text-sm font-black tabular-nums ${color}`}>{pts}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rules */}
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Key Rules</p>
            {[
              { icon: Zap, text: "Reputation updates in real-time as the community votes on your content.", color: "text-amber-400" },
              { icon: ThumbsDown, text: "Downvotes reduce your score by 2 — low-quality posts will hurt your standing.", color: "text-rose-400" },
              { icon: TrendingUp, text: "Post consistently to maximise your base points — 10 pts per post, every time.", color: "text-indigo-400" },
              { icon: MessageCircle, text: "Engaging posts that spark discussion earn bonus points from comments.", color: "text-blue-400" },
              { icon: Award, text: "Reach higher tiers to unlock special badges displayed on your profile.", color: "text-violet-400" },
            ].map(({ icon: Icon, text, color }) => (
              <div key={text} className="flex items-start gap-3">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
                <p className="text-xs leading-relaxed text-slate-400">{text}</p>
              </div>
            ))}
          </div>

          {/* Tiers overview */}
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Tier Overview</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {REPUTATION_TIERS.map((tier) => (
                <div key={tier.label} className={`flex items-center gap-3 rounded-xl border p-3 ${tier.ring} ${tier.bg}`}>
                  <div className={`h-3 w-3 shrink-0 rounded-full ${tier.dot}`} />
                  <div className="flex-1">
                    <p className={`text-xs font-bold ${tier.color}`}>{tier.label}</p>
                    <p className="text-[10px] text-slate-500">{tier.description}</p>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0">{tier.min}–{tier.max === Infinity ? "∞" : tier.max}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
