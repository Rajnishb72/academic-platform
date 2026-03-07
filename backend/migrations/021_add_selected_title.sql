-- ============================================================================
-- Migration 021: Add selected_title column to user_profiles
-- ============================================================================

ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS selected_title TEXT DEFAULT NULL;
