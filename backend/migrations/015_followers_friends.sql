-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 015: Followers & Friends
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. user_follows  (follow / unfollow) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_follows (
    id           BIGSERIAL   PRIMARY KEY,
    follower_id  TEXT        NOT NULL,   -- Clerk user ID of the person following
    following_id TEXT        NOT NULL,   -- Clerk user ID of the person being followed
    created_at   TIMESTAMPTZ DEFAULT now(),
    UNIQUE (follower_id, following_id)
);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "follows_select" ON public.user_follows;
DROP POLICY IF EXISTS "follows_insert" ON public.user_follows;
DROP POLICY IF EXISTS "follows_delete" ON public.user_follows;

CREATE POLICY "follows_select"
    ON public.user_follows FOR SELECT USING (true);

CREATE POLICY "follows_insert"
    ON public.user_follows FOR INSERT WITH CHECK (true);

CREATE POLICY "follows_delete"
    ON public.user_follows FOR DELETE USING (true);

-- ── 2. user_friends  (friend requests + accepted) ────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_friends (
    id           BIGSERIAL   PRIMARY KEY,
    requester_id TEXT        NOT NULL,   -- Clerk user ID of request sender
    recipient_id TEXT        NOT NULL,   -- Clerk user ID of request receiver
    status       TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'accepted')),
    created_at   TIMESTAMPTZ DEFAULT now(),
    UNIQUE (requester_id, recipient_id)
);

ALTER TABLE public.user_friends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friends_select" ON public.user_friends;
DROP POLICY IF EXISTS "friends_all"    ON public.user_friends;

CREATE POLICY "friends_select"
    ON public.user_friends FOR SELECT USING (true);

CREATE POLICY "friends_all"
    ON public.user_friends FOR ALL USING (true) WITH CHECK (true);

-- ── 3. Indexes for fast lookups ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_user_follows_follower   ON public.user_follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following  ON public.user_follows (following_id);
CREATE INDEX IF NOT EXISTS idx_user_friends_requester  ON public.user_friends (requester_id);
CREATE INDEX IF NOT EXISTS idx_user_friends_recipient  ON public.user_friends (recipient_id);
