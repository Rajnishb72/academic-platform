'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

export function useUser() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // We recreate the client inside the component intentionally using the helper
    // which maintains a single instance under the hood or we simply instantiate it.
    const [supabase] = useState(() => createClient());

    useEffect(() => {
        let mounted = true;

        async function getUser() {
            const { data } = await supabase.auth.getUser();
            if (mounted) {
                setUser(data.user);
                setIsLoaded(true);
            }
        }

        getUser();

        const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (mounted) {
                    setUser(session?.user ?? null);
                    setIsLoaded(true);
                }
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
