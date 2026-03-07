-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 025: Add is_banned column to user_profiles
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;
