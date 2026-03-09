import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ─── Shared singleton (browser-safe) ────────────────────────────────────────
//
// Uses globalThis to survive Next.js HMR + module re-evaluation.
// Only ONE GoTrueClient instance per browser tab = no warning.
//
// Auth persistence disabled because this project uses Clerk for auth;
// Supabase is used purely as API/data layer.
//
declare global {
    var __supabaseAnon: SupabaseClient | undefined;
    var __supabaseAuthCache: { token: string; client: SupabaseClient } | undefined;
}

function getAnonClient(): SupabaseClient {
    if (typeof window !== "undefined" && globalThis.__supabaseAnon) {
        return globalThis.__supabaseAnon;
    }
    const client = createClient(SUPABASE_URL, SUPABASE_ANON, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    if (typeof window !== "undefined") {
        globalThis.__supabaseAnon = client;
    }
    return client;
}

export const supabase = getAnonClient();

// ─── Authenticated client factory (Clerk JWT → Supabase RLS) ─────────────────

export function getAuthClient(clerkToken: string): SupabaseClient {
    const cached = globalThis.__supabaseAuthCache;
    if (cached?.token === clerkToken) return cached.client;

    const client = createClient(SUPABASE_URL, SUPABASE_ANON, {
        global: {
            headers: { Authorization: `Bearer ${clerkToken}` },
        },
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    });

    globalThis.__supabaseAuthCache = { token: clerkToken, client };
    return client;
}

/** Alias — same as getAuthClient, exported for explicit naming at call sites. */
export const getAuthSupabase = getAuthClient;

/**
 * Retrieves and validates a Clerk token for Supabase.
 * Returns null and logs a helpful error if the template isn't configured.
 */
export async function getSupabaseToken(
    getToken: (opts: { template: string }) => Promise<string | null>
): Promise<string | null> {
    const token = await getToken({ template: "supabase" });
    if (!token) {
        console.error(
            "[Supabase] ❌ Token is null — ensure the 'supabase' JWT Template exists in Clerk Dashboard → JWT Templates."
        );
    }
    return token;
}
