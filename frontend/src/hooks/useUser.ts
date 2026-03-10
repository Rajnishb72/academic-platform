'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

// ─── Synchronous session reader ─────────────────────────────────────────────
// Reads the Supabase auth cookie and decodes the JWT payload WITHOUT any async
// calls. This gives us the user object on the very first render — zero flicker.
//
function readSessionFromCookie(): User | null {
    if (typeof document === 'undefined') return null;
    try {
        // Supabase stores auth in a cookie like "sb-<ref>-auth-token"
        const cookies = document.cookie.split(';');
        for (const c of cookies) {
            const trimmed = c.trim();
            if (trimmed.startsWith('sb-') && trimmed.includes('-auth-token')) {
                // Cookie may be chunked (sb-xxx-auth-token.0, sb-xxx-auth-token.1, etc.)
                // Or it may be a single cookie. Try to get the base name.
                const eqIdx = trimmed.indexOf('=');
                if (eqIdx < 0) continue;
                const name = trimmed.substring(0, eqIdx).trim();

                // Collect all chunks for this cookie
                let fullValue = '';
                // Check if there are chunks (.0, .1, .2, etc.)
                const baseName = name.replace(/\.\d+$/, '');
                const chunks: { idx: number; val: string }[] = [];

                for (const c2 of cookies) {
                    const t2 = c2.trim();
                    const eq2 = t2.indexOf('=');
                    if (eq2 < 0) continue;
                    const n2 = t2.substring(0, eq2).trim();
                    const v2 = t2.substring(eq2 + 1);
                    if (n2 === baseName) {
                        chunks.push({ idx: -1, val: decodeURIComponent(v2) });
                    } else if (n2.startsWith(baseName + '.')) {
                        const chunkIdx = parseInt(n2.substring(baseName.length + 1), 10);
                        chunks.push({ idx: chunkIdx, val: decodeURIComponent(v2) });
                    }
                }

                if (chunks.length === 0) continue;

                // Sort chunks and concatenate
                if (chunks.some(ch => ch.idx >= 0)) {
                    chunks.sort((a, b) => a.idx - b.idx);
                }
                fullValue = chunks.map(ch => ch.val).join('');

                if (!fullValue) continue;

                // Try parsing as JSON (Supabase stores session as base64url-encoded JSON)
                let parsed: any;
                try {
                    // First try direct JSON parse
                    parsed = JSON.parse(fullValue);
                } catch {
                    // Try base64 decode
                    try {
                        parsed = JSON.parse(atob(fullValue.replace(/-/g, '+').replace(/_/g, '/')));
                    } catch {
                        continue;
                    }
                }

                // parsed should have access_token
                const accessToken = parsed?.access_token;
                if (!accessToken) continue;

                // Decode JWT payload (middle segment)
                const parts = accessToken.split('.');
                if (parts.length !== 3) continue;

                const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

                // Check expiry
                if (payload.exp && Date.now() / 1000 > payload.exp) continue;

                // Construct a minimal User object from the JWT
                return {
                    id: payload.sub,
                    email: payload.email,
                    user_metadata: payload.user_metadata ?? {},
                    app_metadata: payload.app_metadata ?? {},
                    aud: payload.aud ?? '',
                    created_at: '',
                } as User;
            }
        }
    } catch {
        // Silent fail — the async path will handle it
    }
    return null;
}

export function useUser() {
    // Initialize synchronously from cookie — NO loading state needed
    const [user, setUser] = useState<User | null>(() => readSessionFromCookie());
    const [isLoaded, setIsLoaded] = useState(() => readSessionFromCookie() !== null);

    const [supabase] = useState(() => createClient());

    useEffect(() => {
        let mounted = true;

        async function validateSession() {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    const { data } = await supabase.auth.getUser();

                    if (mounted && data?.user) {
                        const { data: profile } = await supabase
                            .from('user_profiles')
                            .select('is_banned')
                            .eq('id', data.user.id)
                            .maybeSingle();

                        if (profile?.is_banned) {
                            await supabase.auth.signOut();
                            setUser(null);
                        } else {
                            setUser(data.user);
                        }
                    } else if (mounted) {
                        setUser(null);
                    }
                } else if (mounted) {
                    setUser(null);
                }
            } catch (err) {
                console.warn('[useUser] Session validation error:', err);
                if (mounted) setUser(null);
            } finally {
                if (mounted) setIsLoaded(true);
            }
        }

        validateSession();

        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event: AuthChangeEvent, session: Session | null) => {
                if (!mounted) return;

                if (session?.user) {
                    const { data: profile } = await supabase
                        .from('user_profiles')
                        .select('is_banned')
                        .eq('id', session.user.id)
                        .maybeSingle();

                    if (profile?.is_banned) {
                        await supabase.auth.signOut();
                        setUser(null);
                    } else {
                        setUser(session.user);
                    }
                } else {
                    setUser(null);
                }
                setIsLoaded(true);
            }
        );

        return () => {
            mounted = false;
            authListener.subscription.unsubscribe();
        };
    }, [supabase]);

    const compatUser = user ? {
        id: user.id,
        fullName: (user.user_metadata?.display_name || user.user_metadata?.username || user.email?.split('@')[0]) as string,
        firstName: (user.user_metadata?.display_name?.split(' ')[0] || user.user_metadata?.username || user.email?.split('@')[0]) as string | undefined,
        lastName: (user.user_metadata?.display_name?.split(' ').slice(1).join(' ')) as string | undefined,
        username: (user.user_metadata?.username || user.email?.split('@')[0]) as string | undefined,
        imageUrl: (user.user_metadata?.avatar_url) as string | undefined,
        primaryEmailAddress: { emailAddress: user.email },
    } : null;

    return {
        user: compatUser,
        isLoaded,
        userId: user ? user.id : null,
        isSignedIn: !!user,
        supabaseUser: user
    };
}
