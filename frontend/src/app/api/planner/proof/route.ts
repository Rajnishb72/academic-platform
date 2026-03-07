import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// Use service-role key for privileged server-side upload; fall back to anon key.
const SUPABASE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";

const BUCKET = "planner-proofs";

export async function POST(req: NextRequest) {
    const supabaseClient = await createClient();
    const { data: { user } } = await supabaseClient.auth.getUser();
    const userId = user?.id;
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return NextResponse.json(
            { error: "Supabase not configured" },
            { status: 500 },
        );
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const planId = (formData.get("planId") as string | null) ?? "unknown";
        const chapterIndex = (formData.get("chapterIndex") as string | null) ?? "0";

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Validate: only PDFs
        if (file.type !== "application/pdf") {
            return NextResponse.json(
                { error: "Only PDF files are accepted" },
                { status: 400 },
            );
        }

        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `${userId}/${planId}/ch${chapterIndex}_${timestamp}_${safeName}`;

        // Convert File → ArrayBuffer → Buffer for server-side upload
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: { persistSession: false },
        });

        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, buffer, {
                contentType: "application/pdf",
                upsert: true,
            });

        if (uploadError) {
            console.error("[planner/proof] Supabase upload error:", uploadError);
            throw new Error(uploadError.message);
        }

        // Get a permanent public URL (works if bucket is public) or a signed URL
        const { data: urlData } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(storagePath);

        const url = urlData?.publicUrl ?? "";

        return NextResponse.json({ url, fileName: file.name });
    } catch (err) {
        console.error("[planner/proof] error:", err);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
