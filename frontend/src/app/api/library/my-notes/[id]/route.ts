// Next.js API Route: /api/library/my-notes/[id]
// Handles PATCH (edit metadata) and DELETE for a single note.

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabaseClient = await createClient();
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = (await supabaseClient.auth.getSession()).data.session?.access_token;

    const { id } = await params;
    const body = await req.json();

    try {
        const res = await fetch(`${BACKEND}/library/my-notes/${id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json({ error: "Backend unreachable" }, { status: 503 });
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabaseClient = await createClient();
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = (await supabaseClient.auth.getSession()).data.session?.access_token;

    const { id } = await params;

    try {
        const res = await fetch(`${BACKEND}/library/my-notes/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });
        return NextResponse.json({ success: true }, { status: res.status });
    } catch {
        return NextResponse.json({ error: "Backend unreachable" }, { status: 503 });
    }
}
