import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ─── Anon client (public reads only, no RLS bypass) ───────────────────────────
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

// ─── Authenticated client factory (Clerk JWT → Supabase RLS) ─────────────────
//
// Why globalThis instead of a module-level variable?
//   Next.js HMR re-evaluates modules on every Fast Refresh, resetting
//   module-level `let` variables. Storing the cache on globalThis means
//   it survives HMR and we never call createClient() more than necessary,
//   eliminating "Multiple GoTrueClient instances" warnings.
//
declare global {
    var __supabaseAuthCache: { token: string; client: SupabaseClient } | undefined;
}

/**
 * Returns a Supabase client authenticated with the provided Clerk JWT.
 *
 * The JWT is forwarded as `Authorization: Bearer <token>` so Supabase
 * verifies it via the Clerk JWKS endpoint and enforces RLS:
 *   auth.uid()::text = user_id   ← critical: Clerk IDs are TEXT, not UUID
 *
 * @example
 *   const token = await getToken({ template: "supabase" });
 *   if (!token) throw new Error("No Supabase token");
 *   const db = getAuthClient(token);
 */
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
