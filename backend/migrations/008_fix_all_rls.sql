-- ─────────────────────────────────────────────────────────────────────────────
-- CRITICAL FIX: Allow interaction tracking to work
-- Run in: Supabase Dashboard → SQL Editor
--
-- Problem: RLS on library_interactions uses auth.uid()::TEXT = user_id
-- But anon client has auth.uid() = NULL, so ALL inserts/selects are blocked.
-- This breaks: rating, views, downloads, history.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Fix notes table RLS ──────────────────────────────────────────────────────

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notes_select_all" ON public.notes;
CREATE POLICY "notes_select_all" ON public.notes FOR SELECT USING (true);

DROP POLICY IF EXISTS "notes_insert_own" ON public.notes;
CREATE POLICY "notes_insert_own" ON public.notes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "notes_update_own" ON public.notes;
CREATE POLICY "notes_update_own" ON public.notes FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "notes_delete_own" ON public.notes;
CREATE POLICY "notes_delete_own" ON public.notes FOR DELETE USING (true);

-- ── Fix library_interactions table RLS ───────────────────────────────────────

ALTER TABLE public.library_interactions ENABLE ROW LEVEL SECURITY;

-- Drop old restrictive policies
DROP POLICY IF EXISTS "interactions_insert" ON public.library_interactions;
DROP POLICY IF EXISTS "interactions_select" ON public.library_interactions;

-- Allow anyone to read all interactions (needed for ranking, history)
CREATE POLICY "interactions_select_all" ON public.library_interactions
  FOR SELECT USING (true);

-- Allow anyone to insert interactions (user_id stored as text from Clerk)
CREATE POLICY "interactions_insert_all" ON public.library_interactions
  FOR INSERT WITH CHECK (true);

-- Allow anyone to update interactions (for rating upsert)
CREATE POLICY "interactions_update_all" ON public.library_interactions
  FOR UPDATE USING (true) WITH CHECK (true);

-- Allow delete if needed
CREATE POLICY "interactions_delete_all" ON public.library_interactions
  FOR DELETE USING (true);

-- ── Ensure RPCs exist ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_downloads(note_id UUID)
RETURNS VOID LANGUAGE SQL SECURITY DEFINER AS $$
  UPDATE public.notes
  SET downloads_count = COALESCE(downloads_count, 0) + 1
  WHERE id = note_id;
$$;

CREATE OR REPLACE FUNCTION update_avg_rating(target_note_id UUID)
RETURNS VOID LANGUAGE SQL SECURITY DEFINER AS $$
  UPDATE public.notes
  SET avg_rating = (
    SELECT ROUND(AVG(rating)::numeric, 1)
    FROM public.library_interactions
    WHERE note_id = target_note_id
      AND interaction_type = 'rate'
      AND rating IS NOT NULL
  )
  WHERE id = target_note_id;
$$;

-- ── Unique constraint for upsert (if not exists) ────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_note_type'
  ) THEN
    ALTER TABLE public.library_interactions
      ADD CONSTRAINT unique_user_note_type
      UNIQUE (user_id, note_id, interaction_type);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Constraint may already exist: %', SQLERRM;
END;
$$;

-- ── Storage: allow public delete from notes bucket ───────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('notes', 'notes', true)
ON CONFLICT (id) DO UPDATE SET public = true;
