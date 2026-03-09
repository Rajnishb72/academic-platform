'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

export function useUser() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Single supabase instance (cached via globalThis singleton)
    const [supabase] = useState(() => createClient());

    useEffect(() => {
        let mounted = true;

        async function restoreSession() {
            try {
                // Step 1: Try getSession() first — reads from localStorage (instant)
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    // Step 2: Validate the session with getUser() (server call)
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
                    // No session in localStorage — user is genuinely logged out
                    setUser(null);
                }
            } catch (err) {
                console.warn('[useUser] Session restore error:', err);
                if (mounted) setUser(null);
            } finally {
                if (mounted) setIsLoaded(true);
            }
        }

        restoreSession();

        // Listen for auth state changes (login, logout, token refresh)
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

    // Provide a compatible interface for all modules
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
        // Fallback to real Supabase user if needed
        supabaseUser: user
    };
}
