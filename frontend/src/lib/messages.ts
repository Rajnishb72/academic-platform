import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Message {
  id: number;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

export interface Conversation {
  userId: string;
  display_name: string | null;
  avatar_url: string | null;
  lastMessage: string;
  lastAt: string;
  unreadCount: number;
}

export interface Notification {
  id: number;
  user_id: string;
  type: "message" | "follow" | "friend_request" | "friend_accepted" | "planner_deadline";
  from_user_id: string;
  reference_id: string | null;
  content: string | null;
  is_read: boolean;
  created_at: string;
  from_profile?: { display_name: string | null; avatar_url: string | null };
}

// ─── Messaging ────────────────────────────────────────────────────────────────

/** Send a private message and create a notification for the receiver */
export async function sendMessage(
  senderId: string,
  receiverId: string,
  content: string,
  senderName: string | null,
): Promise<Message | null> {
  const { data, error } = await supabase
    .from("private_messages")
    .insert({ sender_id: senderId, receiver_id: receiverId, content })
    .select()
    .single();
  if (error) {
    console.error("[msg] send:", error.message);
    return null;
  }

  // Create notification for receiver
  await supabase.from("notifications").insert({
    user_id: receiverId,
    type: "message",
    from_user_id: senderId,
    reference_id: String(data.id),
    content: `${senderName ?? "Someone"} sent you a message`,
  });

  return data as Message;
}

/** Get all messages between two users, oldest first */
export async function getMessages(
  userA: string,
  userB: string,
): Promise<Message[]> {
  const { data, error } = await supabase
    .from("private_messages")
    .select("*")
    .or(
      `and(sender_id.eq.${userA},receiver_id.eq.${userB}),and(sender_id.eq.${userB},receiver_id.eq.${userA})`,
    )
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) {
    console.error("[msg] get:", error.message);
    return [];
  }
  return (data ?? []) as Message[];
}

/** Mark all messages from `fromUserId` as read */
export async function markMessagesRead(
  currentUserId: string,
  fromUserId: string,
): Promise<void> {
  await supabase
    .from("private_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("receiver_id", currentUserId)
    .eq("sender_id", fromUserId)
    .is("read_at", null);
}

/** Get unread message count for a user */
export async function getUnreadMessageCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from("private_messages")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", userId)
    .is("read_at", null);
  return count ?? 0;
}

/**
 * Get conversations list for a user.
 * Returns one entry per conversation partner with the last message + unread count.
 */
export async function getConversations(
  userId: string,
): Promise<Conversation[]> {
  // Get all messages involving this user
  const { data, error } = await supabase
    .from("private_messages")
    .select("sender_id,receiver_id,content,created_at,read_at")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error || !data) return [];

  // Build conversation map keyed by the other party's userId
  const convMap = new Map<
    string,
    { lastMessage: string; lastAt: string; unreadCount: number }
  >();

  for (const m of data) {
    const otherId = m.sender_id === userId ? m.receiver_id : m.sender_id;
    if (!convMap.has(otherId)) {
      convMap.set(otherId, {
        lastMessage: m.content,
        lastAt: m.created_at,
        unreadCount: 0,
      });
    }
    // Count unread (messages sent TO current user that haven't been read)
    if (m.receiver_id === userId && !m.read_at) {
      const entry = convMap.get(otherId)!;
      entry.unreadCount++;
    }
  }

  if (convMap.size === 0) return [];

  // Fetch profiles for all conversation partners
  const otherIds = Array.from(convMap.keys());
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id,display_name,avatar_url")
    .in("id", otherIds);

  const profileMap: Record<
    string,
    { display_name: string | null; avatar_url: string | null }
  > = {};
  for (const p of profiles ?? []) profileMap[p.id] = p;

  return otherIds
    .map((id) => ({
      userId: id,
      display_name: profileMap[id]?.display_name ?? null,
      avatar_url: profileMap[id]?.avatar_url ?? null,
      ...convMap.get(id)!,
    }))
    .sort(
      (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
    );
}

/** Get accepted friends (to start new conversations with) — friends-only gate */
export async function getFriendsForChat(
  userId: string,
): Promise<{ id: string; display_name: string | null; avatar_url: string | null }[]> {
  const { data, error } = await supabase
    .from("user_friends")
    .select("requester_id,recipient_id")
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    .eq("status", "accepted")
    .limit(100);
  if (error || !data || data.length === 0) return [];

  const friendIds = data.map((r) =>
    r.requester_id === userId ? r.recipient_id : r.requester_id,
  );
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id,display_name,avatar_url")
    .in("id", friendIds);
  return (profiles ?? []) as {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  }[];
}

// ─── Notifications ────────────────────────────────────────────────────────────

/** Create a notification (used externally by follow/friend actions) */
export async function createNotification(payload: {
  userId: string;
  type: Notification["type"];
  fromUserId: string;
  referenceId?: string;
  content: string;
}): Promise<void> {
  await supabase.from("notifications").insert({
    user_id: payload.userId,
    type: payload.type,
    from_user_id: payload.fromUserId,
    reference_id: payload.referenceId ?? null,
    content: payload.content,
  });
}

/** Get recent notifications for a user, with sender profile */
export async function getNotifications(
  userId: string,
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .not("type", "in", '("message","friend_request")')
    .order("created_at", { ascending: false })
    .limit(30);
  if (error || !data) return [];

  // Fetch from_user profiles
  const fromIds = [...new Set(data.map((n) => n.from_user_id))];
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id,display_name,avatar_url")
    .in("id", fromIds);

  const pMap: Record<
    string,
    { display_name: string | null; avatar_url: string | null }
  > = {};
  for (const p of profiles ?? []) pMap[p.id] = p;

  return data.map((n) => ({
    ...n,
    from_profile: pMap[n.from_user_id] ?? {
      display_name: null,
      avatar_url: null,
    },
  })) as Notification[];
}

/** Get unread notification count */
export async function getUnreadNotifCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false)
    .not("type", "in", '("message","friend_request")');
  return count ?? 0;
}

/** Mark a single notification as read */
export async function markNotifRead(notifId: number): Promise<void> {
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notifId);
}

/** Mark all notifications as read for a user */
export async function markAllNotifsRead(userId: string): Promise<void> {
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .not("type", "in", '("message","friend_request")')
    .eq("is_read", false);
}
