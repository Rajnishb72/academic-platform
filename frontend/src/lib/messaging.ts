import { supabase } from "@/lib/supabase";

export interface PrivateMessage {
    id: number;
    sender_id: string;
    receiver_id: string;
    content: string;
    created_at: string;
    read_at: string | null;
}

export async function fetchMessages(
    userId: string,
    friendId: string,
): Promise<PrivateMessage[]> {
    const { data, error } = await supabase
        .from("private_messages")
        .select("*")
        .or(
            `and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`,
        )
        .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
}

export async function sendMessage(
    senderId: string,
    receiverId: string,
    content: string,
): Promise<PrivateMessage> {
    const { data, error } = await supabase
        .from("private_messages")
        .insert({ sender_id: senderId, receiver_id: receiverId, content })
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data;
}

export async function markMessagesRead(
    senderId: string,
    receiverId: string,
): Promise<void> {
    await supabase
        .from("private_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("sender_id", senderId)
        .eq("receiver_id", receiverId)
        .is("read_at", null);
}

export async function getUnreadCount(userId: string): Promise<number> {
    const { count } = await supabase
        .from("private_messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .is("read_at", null);
    return count ?? 0;
}
