-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 017: Admin flags + Verification badges
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- Add is_verified badge to user_profiles (no schema change needed for groups)
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS is_verified  BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS bio          TEXT,
    ADD COLUMN IF NOT EXISTS is_admin     BOOLEAN NOT NULL DEFAULT false;

-- Add verified badge to campus_institutions
ALTER TABLE public.campus_institutions
    ADD COLUMN IF NOT EXISTS is_verified  BOOLEAN NOT NULL DEFAULT false;
