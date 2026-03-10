"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Settings, ChevronUp, ShieldCheck, ShieldOff, Eye, EyeOff, X, Lock, BadgeCheck } from "lucide-react";
import Image from "next/image";
import { fetchProfile } from "@/lib/profile";
import { isAdminSession, loginAdmin, logoutAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/client";

interface Props {
  variant?: "sidebar" | "header";
  onNavigate?: () => void;
}

export function ProfileDropdown({ variant = "header", onNavigate }: Props) {
  const { user, supabaseUser, isLoaded } = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPwd, setAdminPwd] = useState("");
  const [adminError, setAdminError] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    fetchProfile(user.id).then((p) => {
      if (p?.avatar_url) setAvatarUrl(p.avatar_url);
      setIsVerified(p?.is_verified ?? false);
    });

    // Subscribe to realtime avatar changes so sidebar/header refresh instantly
    const sb = createClient();
    const channel = sb
      .channel("profile-avatar-sync")
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "user_profiles", filter: `id=eq.${user.id}` },
        (payload: any) => {
          const newAvatar = payload.new?.avatar_url;
          if (newAvatar) setAvatarUrl(newAvatar);
        },
      )
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [user?.id]);

  useEffect(() => {
    const checkAdmin = async () => setIsAdmin(isAdminSession());
    checkAdmin();
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Show skeleton while auth is loading (prevents "?" flash on refresh) ──
  if (!isLoaded) {
    if (variant === "sidebar") {
      return (
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <div className="h-[34px] w-[34px] shrink-0 rounded-full bg-slate-700 animate-pulse" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3 w-24 rounded bg-slate-700 animate-pulse" />
            <div className="h-2.5 w-16 rounded bg-slate-800 animate-pulse" />
          </div>
        </div>
      );
    }
    return (
      <div className="h-8 w-8 rounded-full bg-slate-700 animate-pulse" />
    );
  }

  const initials = user
    ? ((user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "")).toUpperCase() || (user.username?.[0]?.toUpperCase() ?? "?")
    : "?";

  const displayName = user?.fullName
    ? user.fullName
    : user?.firstName
      ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
      : (user?.username ?? "My Account");

  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  function renderAvatar(size: number = 32) {
    const style = { width: size, height: size, minWidth: size, minHeight: size };
    if (avatarUrl || user?.imageUrl) {
      return (
        <Image src={avatarUrl ?? user?.imageUrl ?? ""} alt={displayName} width={size} height={size} style={style}
          className="rounded-full object-cover ring-2 ring-slate-700" unoptimized />
      );
    }
    return (
      <div style={style} className="flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white ring-2 ring-slate-700">
        {initials}
      </div>
    );
  }

  async function handleSignOut() {
    setOpen(false);
    logoutAdmin();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  function handleAdminLogin() {
    if (loginAdmin(adminPwd)) {
      setIsAdmin(true);
      setShowAdminModal(false);
      setAdminPwd("");
      setAdminError("");
      setOpen(false);
      router.push("/admin");
    } else {
      setAdminError("Incorrect password");
    }
  }

  function handleAdminLogout() {
    logoutAdmin();
    setIsAdmin(false);
    setOpen(false);
    if (window.location.pathname.startsWith("/admin")) router.push("/dashboard");
  }

  const menu = open && (
    <div className={`absolute z-50 min-w-[200px] overflow-hidden rounded-xl shadow-2xl shadow-black/60 ${variant === "sidebar" ? "bottom-full left-0 mb-2" : "right-0 top-full mt-2"}`} style={{ border: "1px solid var(--ax-border)", background: "var(--ax-surface-1)" }}>
      {/* User info */}
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--ax-border)" }}>
        <div className="flex items-center gap-2">
          <p className="flex items-center gap-1 truncate text-sm font-semibold" style={{ color: "var(--ax-text-primary)" }}>
            {displayName}
            {isVerified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-blue-400" />}
          </p>
          {isAdmin && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-400 ring-1 ring-amber-500/30">
              <ShieldCheck className="h-2.5 w-2.5" /> ADMIN
            </span>
          )}
        </div>
        {email && <p className="truncate text-xs text-slate-500">{email}</p>}
      </div>

      <div className="p-1.5">
        <Link href="/profile" onClick={() => { setOpen(false); onNavigate?.(); }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white">
          <Settings className="h-4 w-4 text-slate-500" /> Profile Settings
        </Link>

        {isAdmin && (
          <>
            <Link href="/admin" onClick={() => { setOpen(false); onNavigate?.(); }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-amber-400 transition hover:bg-amber-500/10">
              <ShieldCheck className="h-4 w-4" /> Admin Panel
            </Link>
            <button onClick={handleAdminLogout}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white">
              <ShieldOff className="h-4 w-4" /> Exit Admin Mode
            </button>
          </>
        )}

        {!isAdmin && (
          <button onClick={() => { setShowAdminModal(true); setOpen(false); }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-500 transition hover:bg-slate-800 hover:text-slate-300">
            <Lock className="h-4 w-4" /> Admin Login
          </button>
        )}

        <Link href="/about" onClick={() => { setOpen(false); onNavigate?.(); }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white">
          <Eye className="h-4 w-4 text-slate-500" /> About Us
        </Link>

        <div className="my-1 border-t border-slate-800" />
        <button onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-400 transition hover:bg-rose-500/10">
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Admin Password Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ border: "1px solid var(--ax-border)", background: "var(--ax-surface-1)" }}>
            <button onClick={() => { setShowAdminModal(false); setAdminError(""); setAdminPwd(""); }}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-white transition">
              <X className="h-4 w-4" />
            </button>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-500/30">
                <ShieldCheck className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Admin Login</h2>
                <p className="text-xs text-slate-500">Enter the admin password to continue</p>
              </div>
            </div>
            <div className="relative mb-3">
              <input
                type={showPwd ? "text" : "password"}
                value={adminPwd}
                onChange={(e) => { setAdminPwd(e.target.value); setAdminError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                placeholder="Admin password"
                autoFocus
                className="ax-input h-10 w-full rounded-xl px-4 pr-10"
              />
              <button onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {adminError && <p className="mb-3 text-xs text-rose-400">{adminError}</p>}
            <button onClick={handleAdminLogin}
              className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white transition hover:bg-amber-400">
              Login as Admin
            </button>
          </div>
        </div>
      )}

      {/* Sidebar variant */}
      {variant === "sidebar" ? (
        <div ref={ref} className="relative">
          <button onClick={() => setOpen((v) => !v)} suppressHydrationWarning
            className="flex w-full items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-800/60">
            {renderAvatar(34)}
            <div className="min-w-0 flex-1 text-left">
              <p className="flex items-center gap-1 truncate text-sm font-medium text-slate-200">
                {displayName}
                {isVerified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-blue-400" />}
              </p>
              <p className="truncate text-xs text-slate-500">{isAdmin ? "🛡️ Admin Mode" : "Scholar Profile"}</p>
            </div>
            <ChevronUp className={`h-3.5 w-3.5 shrink-0 text-slate-600 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          {menu}
        </div>
      ) : (
        <div ref={ref} className="relative z-40">
          <button onClick={() => setOpen((v) => !v)} suppressHydrationWarning
            className="relative rounded-full transition hover:ring-2 hover:ring-blue-500/50" aria-label="Account menu">
            {renderAvatar(32)}
            {isAdmin && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 ring-2 ring-slate-900">
                <ShieldCheck className="h-2 w-2 text-white" />
              </span>
            )}
          </button>
          {menu}
        </div>
      )}
    </>
  );
}
