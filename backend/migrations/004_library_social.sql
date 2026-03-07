-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Library Social Features
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add missing columns to 'notes' table
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS downloads_count  INT     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_rating       NUMERIC DEFAULT 0;

-- 2. Create 'library_interactions' table
CREATE TABLE IF NOT EXISTS public.library_interactions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT        NOT NULL,
  note_id          UUID        REFERENCES public.notes(id) ON DELETE CASCADE,
  interaction_type TEXT        NOT NULL CHECK (interaction_type IN ('view', 'download', 'rate')),
  rating           SMALLINT    CHECK (rating BETWEEN 1 AND 5),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON public.library_interactions (user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_note_id ON public.library_interactions (note_id);

-- 3. RPC to safely increment downloads_count (avoids race conditions)
CREATE OR REPLACE FUNCTION increment_downloads(note_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE public.notes
  SET downloads_count = COALESCE(downloads_count, 0) + 1
  WHERE id = note_id;
$$;

-- 4. RLS on library_interactions
ALTER TABLE public.library_interactions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own interactions
CREATE POLICY IF NOT EXISTS "interactions_insert"
  ON public.library_interactions FOR INSERT
  WITH CHECK (auth.uid()::TEXT = user_id);

-- Users can read their own interactions
CREATE POLICY IF NOT EXISTS "interactions_select"
  ON public.library_interactions FOR SELECT
  USING (auth.uid()::TEXT = user_id);

-- 5. Add created_at to notes if missing
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
