import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const isProtectedRoute =
        request.nextUrl.pathname.startsWith('/dashboard') ||
        request.nextUrl.pathname.startsWith('/library') ||
        request.nextUrl.pathname.startsWith('/forums') ||
        request.nextUrl.pathname.startsWith('/campus') ||
        request.nextUrl.pathname.startsWith('/ai-lab') ||
        request.nextUrl.pathname.startsWith('/planner') ||
        request.nextUrl.pathname.startsWith('/profile') ||
        request.nextUrl.pathname.startsWith('/admin') ||
        request.nextUrl.pathname.startsWith('/insights') ||
        request.nextUrl.pathname.startsWith('/messages') ||
        request.nextUrl.pathname.startsWith('/leaderboard') ||
        request.nextUrl.pathname.startsWith('/search') ||
        request.nextUrl.pathname.startsWith('/feed')

    if (!user && isProtectedRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/sign-in'
        return NextResponse.redirect(url)
    }

    if (user && (request.nextUrl.pathname === '/sign-up' || request.nextUrl.pathname === '/sign-in')) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
