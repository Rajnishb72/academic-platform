-- Migration 026: Add XP tracking to user_profiles
-- This ensures the leaderboard loads instantly and stays perfectly synced with profile XP.
-- Run in: Supabase Database -> SQL Editor

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS total_xp INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS forum_xp INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS library_xp INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS planner_xp INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_user_profiles_total_xp ON public.user_profiles(total_xp DESC);
