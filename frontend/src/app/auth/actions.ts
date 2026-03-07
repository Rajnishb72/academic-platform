'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureProfile } from '@/lib/profile'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    // Optionally ensure profile here conceptually, but `ensureProfile` 
    // is usually safer to run on layout wrapper or dashboard where we're sure the session is formed.
    // Actually, setting display name isn't needed on login if it already exists.

    if (error) {
        redirect('/sign-in?message=' + encodeURIComponent(error.message))
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const username = formData.get('username') as string

    const name = `${firstName} ${lastName}`.trim()

    // Validate username uniqueness BEFORE signing up auth user
    if (username) {
        const { data: existingUser } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('username', username)
            .maybeSingle()

        if (existingUser) {
            redirect('/sign-up?message=' + encodeURIComponent('Username is already taken. Please choose another one.'))
        }
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                display_name: name,
                username: username
            }
        }
    })

    if (error) {
        redirect('/sign-up?message=' + encodeURIComponent(error.message))
    }

    // Create the base profile directly right after sign up, so it exists when we redirect.
    if (data?.user) {
        try {
            await ensureProfile(data.user.id, name, username)
        } catch (e) {
            console.error("Could not ensure profile right away", e)
        }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}
