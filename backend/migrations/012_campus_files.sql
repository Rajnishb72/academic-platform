-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 012: Campus — File attachments + assigned_to
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Add file columns to campus_assignments ─────────────────────────────────

ALTER TABLE public.campus_assignments
    ADD COLUMN IF NOT EXISTS file_url    TEXT,
    ADD COLUMN IF NOT EXISTS file_type   TEXT,          -- 'pdf' | 'image'
    ADD COLUMN IF NOT EXISTS assigned_to TEXT[];        -- NULL = everyone; array of Clerk user IDs

-- ── 2. Add attachment columns to campus_announcements ────────────────────────

ALTER TABLE public.campus_announcements
    ADD COLUMN IF NOT EXISTS attachment_url  TEXT,
    ADD COLUMN IF NOT EXISTS attachment_type TEXT;      -- 'pdf' | 'image'

-- ── 3. Create Supabase Storage bucket for campus files ───────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('campus-files', 'campus-files', true)
ON CONFLICT (id) DO NOTHING;

-- ── 4. Storage RLS policies ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "campus_files_select" ON storage.objects;
DROP POLICY IF EXISTS "campus_files_insert" ON storage.objects;
DROP POLICY IF EXISTS "campus_files_delete" ON storage.objects;

CREATE POLICY "campus_files_select"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'campus-files');

CREATE POLICY "campus_files_insert"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'campus-files');

CREATE POLICY "campus_files_delete"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'campus-files');
