import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ─── Shared singleton (browser-safe) ────────────────────────────────────────
//
// Uses globalThis to survive Next.js HMR + module re-evaluation.
// Only ONE GoTrueClient instance per browser tab = no warning.
//
// Session persistence is ENABLED so the auth token survives page refresh.
// The token is stored in localStorage under "sb-<project>-auth-token".
//
declare global {
    var __supabaseAnon: SupabaseClient | undefined;
}

function getAnonClient(): SupabaseClient {
    if (typeof window !== "undefined" && globalThis.__supabaseAnon) {
        return globalThis.__supabaseAnon;
    }
    const client = createClient(SUPABASE_URL, SUPABASE_ANON, {
        auth: {
            persistSession: true,       // ← CRITICAL: saves session to localStorage
            autoRefreshToken: true,      // ← auto-refreshes expired tokens
            detectSessionInUrl: true,    // ← handles OAuth redirects (sign-in callbacks)
        },
    });
    if (typeof window !== "undefined") {
        globalThis.__supabaseAnon = client;
    }
    return client;
}

export const supabase = getAnonClient();

// ─── Legacy exports (kept for backward compatibility) ────────────────────────

export function getAuthClient(token: string): SupabaseClient {
    // For Supabase Auth, the main client already handles auth tokens.
    // This is kept for any code that still calls getAuthClient.
    return supabase;
}

export const getAuthSupabase = getAuthClient;

export async function getSupabaseToken(
    getToken: (opts: { template: string }) => Promise<string | null>
): Promise<string | null> {
    // With Supabase Auth, the session is managed internally.
    // This helper is kept for backward compatibility.
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
}
