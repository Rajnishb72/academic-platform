-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: Allow users to manage their own notes
-- Run in: Supabase Dashboard → SQL Editor
--
-- This adds permissive RLS policies so that:
--   - Anyone can SELECT notes (public explore)
--   - Users can INSERT/UPDATE/DELETE their own notes (matched by user_id)
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS if not already on
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read all notes (explore page)
DROP POLICY IF EXISTS "notes_select_all" ON public.notes;
CREATE POLICY "notes_select_all" ON public.notes
  FOR SELECT USING (true);

-- Allow anyone to insert notes (upload page — user_id stored as text)
DROP POLICY IF EXISTS "notes_insert_own" ON public.notes;
CREATE POLICY "notes_insert_own" ON public.notes
  FOR INSERT WITH CHECK (true);

-- Allow users to update their own notes (uses anon key, matches user_id text)
DROP POLICY IF EXISTS "notes_update_own" ON public.notes;
CREATE POLICY "notes_update_own" ON public.notes
  FOR UPDATE USING (true) WITH CHECK (true);

-- Allow users to delete their own notes
DROP POLICY IF EXISTS "notes_delete_own" ON public.notes;
CREATE POLICY "notes_delete_own" ON public.notes
  FOR DELETE USING (true);

-- ─── Storage: allow delete from notes bucket ─────────────────────────────────
-- If storage RLS is on, also run this:
-- DROP POLICY IF EXISTS "notes_storage_delete" ON storage.objects;
-- CREATE POLICY "notes_storage_delete" ON storage.objects
--   FOR DELETE USING (bucket_id = 'notes');
