-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add uploader_name to notes table
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS uploader_name TEXT DEFAULT 'Anonymous';
