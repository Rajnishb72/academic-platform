const fs = require('fs');
const path = require('path');

const profilePath = path.join(__dirname, '../src/app/(main)/profile/page.tsx');
const usersPath = path.join(__dirname, '../src/app/(main)/users/[userId]/page.tsx');
const outPath = path.join(__dirname, '../src/components/ProfileView.tsx');

let code = fs.readFileSync(profilePath, 'utf8');

// Add props
code = code.replace(
    'export default function ProfilePage() {',
    'export default function ProfileView({ targetUserId, isSelf }: { targetUserId: string; isSelf: boolean }) {'
);

// We need to fetch relationship details if !isSelf
code = code.replace(
    'import { useUser } from "@/hooks/useUser";',
    'import { useUser } from "@/hooks/useUser";\nimport { getSocialRelationship } from "@/lib/social";'
);

// Add state for relationship
code = code.replace(
    'const [likeCount, setLikeCount] = useState(0);',
    `const [likeCount, setLikeCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [friendStatus, setFriendStatus] = useState("none");
  const [followLoading, setFollowLoading] = useState(false);
  const [friendLoading, setFriendLoading] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);`
);

// Modify load() to use targetUserId
code = code.replace(/fetchProfile\(user\.id\)/g, 'fetchProfile(targetUserId)');
code = code.replace(/\.eq\("user_id", user\.id\)/g, '.eq("user_id", targetUserId)');
code = code.replace(/fetchMyInstitutions\(user\.id\)/g, 'fetchMyInstitutions(targetUserId)');
code = code.replace(/computeUserXP\(user\.id\)/g, 'computeUserXP(targetUserId)');
code = code.replace(/getFollowCounts\(user\.id\)/g, 'getFollowCounts(targetUserId)');
code = code.replace(/getProfileLikeCount\(user\.id\)/g, 'getProfileLikeCount(targetUserId)');
code = code.replace(/getFollowers\(user\.id\)/g, 'getFollowers(targetUserId)');
code = code.replace(/getFollowing\(user\.id\)/g, 'getFollowing(targetUserId)');
code = code.replace(/getFriendsAndRequests\(user\.id\)/g, 'getFriendsAndRequests(targetUserId)');

// Dependencies for load()
code = code.replace(/\[user\?.id, user\?.firstName, user\?.lastName, user\?.imageUrl\]/g, '[targetUserId]');
code = code.replace(/\[user\?.id\]/g, '[targetUserId]');
code = code.replace(/\[user\?.id, socialLoaded\]/g, '[targetUserId, socialLoaded]');

// Insert relationship fetch in the effect for like/follow
code = code.replace(
    'getProfileLikeCount(user.id)',
    `getProfileLikeCount(targetUserId)
      .then(setLikeCount)
      .catch(() => { });
    
    if (!isSelf && user?.id) {
      getSocialRelationship(user.id, targetUserId).then((rel) => {
        setIsFollowing(rel.isFollowing);
        setFriendStatus(rel.friendStatus);
        setHasLiked(rel.hasLiked ?? false);
      }).catch(() => {});
    }
  }, [targetUserId, isSelf, user?.id]);
  
  // ignore old code:`
);

// Patch TABS definition to hide settings/admin if !isSelf
code = code.replace(
    '...(isAdminMode ? [{ key: "admin" as ProfileTab, label: "🛡️ Admin" }] : []),',
    `...(isSelf ? [{ key: "settings" as ProfileTab, label: "Settings" }] : []),
    ...(isAdminMode && isSelf ? [{ key: "admin" as ProfileTab, label: "🛡️ Admin" }] : []),`
);
code = code.replace('{ key: "settings", label: "Settings" },', '');

// Add Like/Follow/Friend action handlers
code = code.replace(
    'function pickFile(file: File) {',
    `async function handleFollowToggle() {
    if (!user?.id || isSelf) return;
    setFollowLoading(true);
    try {
      if (isFollowing) { await unfollowUser(user.id, targetUserId); setIsFollowing(false); setFollowCounts((c) => ({ ...c, followers: Math.max(0, c.followers - 1) })); }
      else { await followUser(user.id, targetUserId); setIsFollowing(true); setFollowCounts((c) => ({ ...c, followers: c.followers + 1 })); }
    } finally { setFollowLoading(false); }
  }

  async function handleFriendAction(action: "send" | "accept" | "remove") {
    if (!user?.id || isSelf) return;
    setFriendLoading(true);
    try {
      if (action === "send") { await sendFriendRequest(user.id, targetUserId); setFriendStatus("pending_sent"); }
      else if (action === "accept") { await acceptFriendRequest(user.id, targetUserId); setFriendStatus("accepted"); }
      else { await removeFriend(user.id, targetUserId); setFriendStatus("none"); }
    } finally { setFriendLoading(false); }
  }

  async function handleLike() {
    if (!user?.id || isSelf) return;
    setLikeLoading(true);
    try {
      if (hasLiked) { await unlikeProfile(user.id, targetUserId); setHasLiked(false); setLikeCount((c) => Math.max(0, c - 1)); }
      else { await likeProfile(user.id, targetUserId); setHasLiked(true); setLikeCount((c) => c + 1); }
    } finally { setLikeLoading(false); }
  }

  function pickFile(file: File) {`
);

// Fix the name extraction: if !isSelf, we shouldn't use user.firstName
code = code.replace(
    'const displayName = user?.firstName\n    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`\n    : (user?.username ?? "Scholar");',
    `const displayName = profileData?.display_name || (user?.firstName && isSelf
    ? \`\${user.firstName}\${user.lastName ? \` \${user.lastName}\` : ""}\`
    : (user?.username ?? "Scholar"));`
);

fs.writeFileSync(outPath, code, 'utf8');
console.log("Done generating ProfileView.tsx");
