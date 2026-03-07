// Next.js API Route: /api/library/my-notes
// Fetches notes for the authenticated user directly from Supabase

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // Use service role to bypass RLS; falls back to anon key in dev
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function GET() {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        const userId = user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data, error } = await supabase
            .from("notes")
            .select(
                "id, title, subject, file_url, downloads_count, avg_rating, created_at, uploader_name",
            )
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("[API/library/my-notes]", error.message);
            return NextResponse.json([], { status: 200 });
        }

        return NextResponse.json(data ?? []);
    } catch (e) {
        console.error("[API/library/my-notes] Unexpected:", e);
        return NextResponse.json([], { status: 200 });
    }
}
