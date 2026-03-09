import { supabase } from "@/lib/supabase";

export interface FeedItem {
    id: string;
    type: "post" | "note" | "campus";
    title: string;
    excerpt?: string;
    authorName: string;
    authorAvatar?: string;
    createdAt: string;
    metrics?: { upvotes?: number; downloads?: number; comments?: number; views?: number };
    url: string;
    category?: string;
}

export async function fetchUserFeed(userId: string): Promise<FeedItem[]> {
    try {
        // Determine people the user follows or is friends with
        const { data: follows } = await supabase.from("user_follows").select("following_id").eq("follower_id", userId);
        const { data: friends1 } = await supabase.from("user_friends").select("recipient_id").eq("requester_id", userId).eq("status", "accepted");
        const { data: friends2 } = await supabase.from("user_friends").select("requester_id").eq("recipient_id", userId).eq("status", "accepted");

        const friendSet = new Set<string>();
        follows?.forEach(r => friendSet.add(r.following_id));
        friends1?.forEach(r => friendSet.add(r.recipient_id));
        friends2?.forEach(r => friendSet.add(r.requester_id));

        const friendIds = Array.from(friendSet);
        // If no friends, we fallback to global recent to ensure the feed isn't dead
        const useGlobal = friendIds.length === 0;

        // 1. Fetch Forum Posts
        let postQuery = supabase.from("forum_posts").select("id, title, body, created_at, upvotes_count, comments_count, category, author_name, author_avatar, user_id").order("created_at", { ascending: false }).limit(20);
        if (!useGlobal) postQuery = postQuery.in("user_id", friendIds);
        const { data: posts } = await postQuery;

        // 2. Fetch Library Notes
        let notesQuery = supabase.from("notes").select("id, title, description, created_at, downloads_count, views_count, subject, user_id").order("created_at", { ascending: false }).limit(20);
        if (!useGlobal) notesQuery = notesQuery.in("user_id", friendIds);
        const { data: notes } = await notesQuery;

        // 3. Fetch latest profiles for enrichment
        const userIds = new Set<string>();
        posts?.forEach(p => userIds.add(p.user_id));
        notes?.forEach(n => userIds.add(n.user_id));

        const { data: profiles } = await supabase.from("user_profiles").select("id, display_name, avatar_url").in("id", Array.from(userIds));
        const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

        // Build the feed
        const feed: FeedItem[] = [];

        posts?.forEach(p => {
            const prof = profileMap.get(p.user_id);
            feed.push({
                id: `post-${p.id}`,
                type: "post",
                title: p.title,
                excerpt: p.body?.substring(0, 150) + (p.body?.length > 150 ? "..." : ""),
                authorName: prof?.display_name || p.author_name || "Unknown",
                authorAvatar: prof?.avatar_url || p.author_avatar,
                createdAt: p.created_at,
                category: p.category,
                metrics: { upvotes: p.upvotes_count, comments: p.comments_count },
                url: `/forums`,
            });
        });

        notes?.forEach((n: any) => {
            const prof = profileMap.get(n.user_id);
            feed.push({
                id: `note-${n.id}`,
                type: "note",
                title: n.title,
                excerpt: n.description?.substring(0, 150) + (n.description?.length > 150 ? "..." : ""),
                authorName: prof?.display_name || "Unknown",
                authorAvatar: prof?.avatar_url,
                createdAt: n.created_at,

                category: n.subject || "Resource",
                metrics: { downloads: n.downloads_count, views: n.views_count },
                url: `/library`, // Standard link to library
            });
        });

        // Sort heavily by newest
        feed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Return unified chronological feed
        return feed;
    } catch (err) {
        console.error("Failed to load generic feed", err);
        return [];
    }
}
