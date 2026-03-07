require('dotenv').config({ path: '../backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function globalSearch(q) {
    if (!q.trim()) return { users: [], materials: [], groups: [] };
    const term = `%${q.trim()}%`;

    const [usersRes, matRes, grpRes] = await Promise.all([
        supabase
            .from("user_profiles")
            .select("id,display_name,avatar_url")
            .ilike("display_name", term)
            .limit(20),
        supabase
            .from("library_items")
            .select("id,title,subject,summary,user_id,created_at,file_url,views_count,downloads_count")
            .eq("is_public", true)
            .or(`title.ilike.${term},subject.ilike.${term}`)
            .order("created_at", { ascending: false })
            .limit(20),
        supabase
            .from("campus_institutions")
            .select(
                "id,name,description,avatar_initials,avatar_color,member_count,is_public",
            )
            .eq("is_public", true)
            .or(`name.ilike.${term},description.ilike.${term}`)
            .limit(20),
    ]);

    const notesRes = await supabase
        .from("notes")
        .select(
            "id,title,subject,summary,user_id,created_at,file_url,uploader_name,views_count,downloads_count",
        )
        .eq("is_public", true)
        .or(`title.ilike.${term},subject.ilike.${term}`)
        .order("created_at", { ascending: false })
        .limit(20);

    const matItems = (matRes.data ?? []).map((m) => ({
        ...m,
        uploader_name: null,
    }));
    const noteItems = (notesRes.data ?? []).map((n) => ({
        ...n,
        file_url: n.file_url ?? "",
    }));

    const matMap = new Map();
    [...matItems, ...noteItems].forEach((m) =>
        matMap.set(m.id, m),
    );

    return {
        users: (usersRes.data ?? []),
        materials: Array.from(matMap.values()),
        groups: (grpRes.data ?? []),
    };
}

globalSearch("sachin").then(r => console.log(JSON.stringify(r, null, 2))).catch(e => console.error("THREW:", e));
