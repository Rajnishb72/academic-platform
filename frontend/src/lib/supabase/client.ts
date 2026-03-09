import { createBrowserClient } from '@supabase/ssr'

let _browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
    // On the server, always create a fresh instance (no caching) to prevent state leaks across requests
    if (typeof window === 'undefined') {
        return createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
    }

    // In the browser, cache the client to prevent "Multiple GoTrueClient instances" warning
    if (_browserClient) return _browserClient;

    _browserClient = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    return _browserClient;
}

