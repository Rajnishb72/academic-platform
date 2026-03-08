import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ShieldCheck, GraduationCap, ArrowRight, Lock, Mail, User, AlertCircle, AtSign, CheckCircle2 } from 'lucide-react'
import { signup } from '@/app/auth/actions'

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ message?: string; status?: string }> }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const resolvedSearchParams = await searchParams

    if (user) {
        redirect('/dashboard')
    }

    const isSuccess = resolvedSearchParams?.status === 'success'

    return (
        <div className="min-h-screen flex text-slate-200 bg-slate-950 font-sans selection:bg-indigo-500/30">
            <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
                <div className="mx-auto w-full max-w-sm lg:w-96 relative z-10">
                    <Link href="/" className="flex items-center gap-2.5 mb-8 w-fit hover:opacity-80 transition-opacity">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
                            <GraduationCap className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white">Academix</span>
                    </Link>

                    <div>
                        <h2 className="text-3xl font-black tracking-tight text-white">Get started</h2>
                        <p className="mt-2 text-sm text-slate-400">
                            Already have an account?{' '}
                            <Link href="/sign-in" className="font-semibold text-indigo-400 hover:text-indigo-300 hover:underline">
                                Sign in to your account
                            </Link>
                        </p>
                    </div>

                    <div className="mt-8">
                        <form action={signup} className="space-y-5">
                            {/* Success message */}
                            {isSuccess && resolvedSearchParams?.message && (
                                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 mb-5">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                        <p className="text-sm font-medium text-emerald-300">
                                            {resolvedSearchParams.message}
                                        </p>
                                    </div>
                                    <script dangerouslySetInnerHTML={{ __html: `setTimeout(function(){window.location.href='/dashboard'},2000)` }} />
                                </div>
                            )}

                            {/* Error message */}
                            {!isSuccess && resolvedSearchParams?.message && (
                                <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 mb-5">
                                    <div className="flex items-center gap-3">
                                        <AlertCircle className="h-5 w-5 text-rose-400" />
                                        <p className="text-sm font-medium text-rose-300">
                                            {resolvedSearchParams.message}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium leading-6 text-slate-300">
                                        First Name
                                    </label>
                                    <div className="relative mt-2 flex items-center">
                                        <User className="absolute left-3 h-5 w-5 text-slate-500" />
                                        <input
                                            id="firstName"
                                            name="firstName"
                                            type="text"
                                            required
                                            className="block w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 pl-10 pr-3 text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:bg-white/[0.05] focus:outline-none focus:ring-1 focus:ring-indigo-500/50 sm:text-sm transition-colors"
                                            placeholder="John"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium leading-6 text-slate-300">
                                        Last Name
                                    </label>
                                    <div className="relative mt-2 flex items-center">
                                        <User className="absolute left-3 h-5 w-5 text-slate-500" />
                                        <input
                                            id="lastName"
                                            name="lastName"
                                            type="text"
                                            required
                                            className="block w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 pl-10 pr-3 text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:bg-white/[0.05] focus:outline-none focus:ring-1 focus:ring-indigo-500/50 sm:text-sm transition-colors"
                                            placeholder="Doe"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium leading-6 text-slate-300">
                                    Username
                                </label>
                                <div className="relative mt-2 flex items-center">
                                    <AtSign className="absolute left-3 h-5 w-5 text-slate-500" />
                                    <input
                                        id="username"
                                        name="username"
                                        type="text"
                                        required
                                        className="block w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 pl-10 pr-3 text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:bg-white/[0.05] focus:outline-none focus:ring-1 focus:ring-indigo-500/50 sm:text-sm transition-colors"
                                        placeholder="johndoe123"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium leading-6 text-slate-300">
                                    Email address
                                </label>
                                <div className="relative mt-2 flex items-center">
                                    <Mail className="absolute left-3 h-5 w-5 text-slate-500" />
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        className="block w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 pl-10 pr-3 text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:bg-white/[0.05] focus:outline-none focus:ring-1 focus:ring-indigo-500/50 sm:text-sm transition-colors"
                                        placeholder="student@university.edu"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium leading-6 text-slate-300">
                                    Password
                                </label>
                                <div className="relative mt-2 flex items-center">
                                    <Lock className="absolute left-3 h-5 w-5 text-slate-500" />
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="new-password"
                                        required
                                        className="block w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 pl-10 pr-3 text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:bg-white/[0.05] focus:outline-none focus:ring-1 focus:ring-indigo-500/50 sm:text-sm transition-colors"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <p className="mt-1.5 text-[11px] text-slate-500">Must be at least 6 characters</p>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    className="group flex w-full items-center justify-center gap-2 mt-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-[0_0_24px_rgba(99,102,241,0.35)] active:scale-[0.98]"
                                >
                                    Create account
                                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <div className="relative hidden w-0 flex-1 lg:block bg-slate-900 border-l border-white/[0.04] overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08),transparent_50%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:3rem_3rem]" />

                <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center text-slate-400">
                    <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.2)]">
                        <ShieldCheck className="h-10 w-10 text-indigo-400" />
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight text-white mb-4">
                        Join the Academix Network
                    </h3>
                    <p className="max-w-md text-slate-400 leading-relaxed">
                        Collaborate with peers, discover high-quality study materials, and access powerful AI tools designed for students.
                    </p>
                </div>
            </div>
        </div>
    )
}
