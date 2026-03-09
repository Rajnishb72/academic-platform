import { createBrowserClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ─── Shared singleton (browser-safe) ────────────────────────────────────────
//
// Uses createBrowserClient from @supabase/ssr which stores auth tokens
// in COOKIES (not just localStorage). This is critical because:
//   - The Next.js middleware reads cookies to check auth
//   - Without cookies, the middleware thinks the user is logged out on refresh
//   - Result: redirect to /sign-in on every page refresh
//
// globalThis caching ensures only ONE GoTrueClient instance per browser tab.
//
declare global {
    var __supabaseAnon: SupabaseClient | undefined;
}

function getClient(): SupabaseClient {
    if (typeof window !== "undefined" && globalThis.__supabaseAnon) {
        return globalThis.__supabaseAnon;
    }
    const client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON) as unknown as SupabaseClient;
    if (typeof window !== "undefined") {
        globalThis.__supabaseAnon = client;
    }
    return client;
}

export const supabase = getClient();

// ─── Legacy exports (kept for backward compatibility) ────────────────────────

export function getAuthClient(_token?: string): SupabaseClient {
    return supabase;
}

export const getAuthSupabase = getAuthClient;

export async function getSupabaseToken(
    getToken: (opts: { template: string }) => Promise<string | null>
): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
}
