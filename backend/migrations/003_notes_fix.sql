-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: Add 'created_at' column to the 'notes' table
-- Run this in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add created_at column (with a default so existing rows get a value)
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Backfill any existing rows that have NULL (should be safe after the above)
UPDATE public.notes
  SET created_at = NOW()
  WHERE created_at IS NULL;

-- 3. (Optional) Make it NOT NULL going forward
ALTER TABLE public.notes
  ALTER COLUMN created_at SET NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verify: Check the 'notes' table schema
-- ─────────────────────────────────────────────────────────────────────────────
SELECT column_name, data_type, column_default, is_nullable
FROM   information_schema.columns
WHERE  table_schema = 'public'
  AND  table_name   = 'notes'
ORDER  BY ordinal_position;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verify: Check RLS policies on the 'notes' table
-- ─────────────────────────────────────────────────────────────────────────────
SELECT policyname, cmd, qual, with_check
FROM   pg_policies
WHERE  tablename = 'notes'
  AND  schemaname = 'public';

-- ─────────────────────────────────────────────────────────────────────────────
-- If RLS policies are missing, re-create them:
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS (idempotent)
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- SELECT: users can read their own notes + all public notes
CREATE POLICY IF NOT EXISTS "notes_select"
  ON public.notes FOR SELECT
  USING (
    is_public = TRUE
    OR auth.uid()::TEXT = user_id
  );

-- INSERT: user can only insert rows where user_id = their own Clerk ID
CREATE POLICY IF NOT EXISTS "notes_insert"
  ON public.notes FOR INSERT
  WITH CHECK (auth.uid()::TEXT = user_id);

-- UPDATE: owner only
CREATE POLICY IF NOT EXISTS "notes_update"
  ON public.notes FOR UPDATE
  USING (auth.uid()::TEXT = user_id);

-- DELETE: owner only
CREATE POLICY IF NOT EXISTS "notes_delete"
  ON public.notes FOR DELETE
  USING (auth.uid()::TEXT = user_id);
