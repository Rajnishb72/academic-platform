-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 014: User Profiles — avatar, display_name
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. user_profiles table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id           TEXT PRIMARY KEY,          -- Clerk user ID
    display_name TEXT,
    avatar_url   TEXT,
    updated_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_upsert" ON public.user_profiles;

CREATE POLICY "profiles_select"
    ON public.user_profiles FOR SELECT USING (true);

CREATE POLICY "profiles_upsert"
    ON public.user_profiles FOR ALL USING (true) WITH CHECK (true);

-- ── 2. Avatars storage bucket ────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- ── 3. Storage RLS policies ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "avatars_select" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;

CREATE POLICY "avatars_select"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "avatars_update"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'avatars');

CREATE POLICY "avatars_delete"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'avatars');
