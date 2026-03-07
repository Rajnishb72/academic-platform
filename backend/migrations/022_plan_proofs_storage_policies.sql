-- ============================================================================
-- Migration 022: Storage policies for plan-proofs bucket
-- Run this in Supabase SQL Editor after creating the "plan-proofs" storage bucket
-- ============================================================================

-- Allow anyone to upload files (Clerk handles auth, not Supabase auth)
CREATE POLICY "Allow public uploads to plan-proofs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'plan-proofs');

-- Allow anyone to read/download files
CREATE POLICY "Allow public reads from plan-proofs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'plan-proofs');

-- Allow anyone to update/overwrite their files
CREATE POLICY "Allow public updates to plan-proofs"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'plan-proofs')
  WITH CHECK (bucket_id = 'plan-proofs');

-- Allow anyone to delete their files
CREATE POLICY "Allow public deletes from plan-proofs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'plan-proofs');
