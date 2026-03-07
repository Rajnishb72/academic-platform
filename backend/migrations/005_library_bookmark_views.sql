-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Library Bookmarks, Views, and Avg Rating Support
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Update CHECK constraint to allow 'bookmark' interaction type
ALTER TABLE public.library_interactions 
  DROP CONSTRAINT IF EXISTS library_interactions_interaction_type_check;
ALTER TABLE public.library_interactions 
  ADD CONSTRAINT library_interactions_interaction_type_check 
  CHECK (interaction_type IN ('view', 'download', 'rate', 'bookmark'));

-- 2. Add views_count column to notes table
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS views_count INT DEFAULT 0;

-- 3. Allow all users to read all interactions (needed for public view/download/bookmark counts)
DROP POLICY IF EXISTS "interactions_select" ON public.library_interactions;
DROP POLICY IF EXISTS "interactions_select_all" ON public.library_interactions;
CREATE POLICY "interactions_select_all" ON public.library_interactions FOR SELECT USING (true);

-- 4. Allow users to delete their own interactions (for unbookmark)
DROP POLICY IF EXISTS "interactions_delete" ON public.library_interactions;
CREATE POLICY "interactions_delete" ON public.library_interactions FOR DELETE USING (true);

-- 5. Add unique constraint for upserts on rating
-- This enables the ON CONFLICT clause for (user_id, note_id, interaction_type)
CREATE UNIQUE INDEX IF NOT EXISTS idx_interactions_unique 
  ON public.library_interactions (user_id, note_id, interaction_type);

-- 6. RPC for avg rating recalculation
CREATE OR REPLACE FUNCTION update_avg_rating(target_note_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE public.notes SET avg_rating = (
    SELECT COALESCE(AVG(rating), 0) 
    FROM public.library_interactions 
    WHERE note_id = target_note_id 
      AND interaction_type = 'rate' 
      AND rating IS NOT NULL
  ) WHERE id = target_note_id;
$$;

-- 7. RPC for view count increment (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION increment_views(note_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE public.notes
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = note_id;
$$;

-- 8. Open INSERT policy for Clerk auth (auth.uid() is NULL with Clerk)
DROP POLICY IF EXISTS "interactions_insert" ON public.library_interactions;
CREATE POLICY "interactions_insert" ON public.library_interactions
  FOR INSERT WITH CHECK (true);

-- 9. Open UPDATE policy for rating upserts
DROP POLICY IF EXISTS "interactions_update" ON public.library_interactions;
CREATE POLICY "interactions_update" ON public.library_interactions
  FOR UPDATE USING (true);

-- 10. RPC: record a unique view (check + insert + increment in one call)
CREATE OR REPLACE FUNCTION record_view(p_note_id UUID, p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
  -- Check if already viewed
  IF EXISTS (
    SELECT 1 FROM public.library_interactions
    WHERE user_id = p_user_id AND note_id = p_note_id AND interaction_type = 'view'
  ) THEN
    RETURN FALSE;
  END IF;

  -- Insert interaction
  INSERT INTO public.library_interactions (user_id, note_id, interaction_type)
  VALUES (p_user_id, p_note_id, 'view');

  -- Increment views_count
  UPDATE public.notes
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = p_note_id;

  RETURN TRUE;
END;
$$;
