-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Library Overhaul — unique views + rating recalc
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Unique constraint for one-per-type interactions (view, rate)
--    This enables upsert for ratings and prevents duplicate views.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_interactions_user_note_type'
  ) THEN
    ALTER TABLE public.library_interactions
      ADD CONSTRAINT uq_interactions_user_note_type
      UNIQUE (user_id, note_id, interaction_type);
  END IF;
END $$;

-- 2. RPC: Recalculate avg_rating from all 'rate' interactions for a note
CREATE OR REPLACE FUNCTION update_avg_rating(target_note_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE public.notes
  SET avg_rating = (
    SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0)
    FROM   public.library_interactions
    WHERE  note_id = target_note_id
      AND  interaction_type = 'rate'
      AND  rating IS NOT NULL
  )
  WHERE id = target_note_id;
$$;

-- 3. Ensure increment_downloads exists (idempotent)
CREATE OR REPLACE FUNCTION increment_downloads(note_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE public.notes
  SET downloads_count = COALESCE(downloads_count, 0) + 1
  WHERE id = note_id;
$$;
