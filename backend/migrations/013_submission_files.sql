-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 013: Campus — Submission file uploads
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.campus_submissions
    ADD COLUMN IF NOT EXISTS file_url    TEXT,
    ADD COLUMN IF NOT EXISTS file_type   TEXT,                  -- 'pdf' | 'image'
    ADD COLUMN IF NOT EXISTS user_name   TEXT NOT NULL DEFAULT 'Member',
    ADD COLUMN IF NOT EXISTS user_avatar TEXT NOT NULL DEFAULT '??';
