-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 018: Profile Likes (independent entity — not tied to forum upvotes)
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profile_likes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    liked_id    TEXT NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    liker_id    TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(liked_id, liker_id)
);

ALTER TABLE public.profile_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_likes_select" ON public.profile_likes;
DROP POLICY IF EXISTS "profile_likes_insert" ON public.profile_likes;
DROP POLICY IF EXISTS "profile_likes_delete" ON public.profile_likes;

CREATE POLICY "profile_likes_select" ON public.profile_likes FOR SELECT USING (true);
CREATE POLICY "profile_likes_insert" ON public.profile_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "profile_likes_delete" ON public.profile_likes FOR DELETE USING (true);
