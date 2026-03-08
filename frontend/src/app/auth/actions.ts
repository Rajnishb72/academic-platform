'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureProfile } from '@/lib/profile'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        redirect('/sign-in?message=' + encodeURIComponent('Please fill in all fields.'))
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            // User-friendly error messages
            let message = error.message
            if (error.message.toLowerCase().includes('invalid login credentials')) {
                message = 'Invalid email or password. Please try again.'
            } else if (error.message.toLowerCase().includes('email not confirmed')) {
                message = 'Please verify your email before signing in.'
            }
            redirect('/sign-in?message=' + encodeURIComponent(message))
        }

        revalidatePath('/', 'layout')
        redirect('/dashboard')
    } catch (e) {
        // Re-throw redirect errors (Next.js uses NEXT_REDIRECT which throws)
        if (e instanceof Error && e.message === 'NEXT_REDIRECT') throw e
        // Re-throw any error with digest (Next.js internal redirect mechanism)
        if (e && typeof e === 'object' && 'digest' in e) throw e
        redirect('/sign-in?message=' + encodeURIComponent('An unexpected error occurred. Please try again.'))
    }
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const username = formData.get('username') as string

    // Validate all required fields
    if (!email || !password || !firstName || !username) {
        redirect('/sign-up?message=' + encodeURIComponent('Please fill in all required fields.'))
    }

    // Validate password length
    if (password.length < 6) {
        redirect('/sign-up?message=' + encodeURIComponent('Password must be at least 6 characters long.'))
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        redirect('/sign-up?message=' + encodeURIComponent('Username can only contain letters, numbers, and underscores.'))
    }

    const name = `${firstName} ${lastName}`.trim()

    try {
        // Check if email is already in use
        const { data: existingEmail } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle()

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
            // User-friendly error messages
            let message = error.message
            if (error.message.toLowerCase().includes('already registered') ||
                error.message.toLowerCase().includes('already been registered') ||
                error.message.toLowerCase().includes('user already registered')) {
                message = 'This email is already registered. Please sign in instead.'
            } else if (error.message.toLowerCase().includes('password')) {
                message = 'Password is too weak. Please use at least 6 characters.'
            } else if (error.message.toLowerCase().includes('valid email')) {
                message = 'Please enter a valid email address.'
            }
            redirect('/sign-up?message=' + encodeURIComponent(message))
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
        // Redirect with success message
        redirect('/sign-up?status=success&message=' + encodeURIComponent('Account created successfully! Redirecting to dashboard...'))
    } catch (e) {
        // Re-throw redirect errors (Next.js uses NEXT_REDIRECT which throws)
        if (e instanceof Error && e.message === 'NEXT_REDIRECT') throw e
        // Re-throw any error with digest (Next.js internal redirect mechanism)
        if (e && typeof e === 'object' && 'digest' in e) throw e
        redirect('/sign-up?message=' + encodeURIComponent('An unexpected error occurred. Please try again.'))
    }
}
