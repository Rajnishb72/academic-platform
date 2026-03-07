-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 009: Forums — Community & Reputation Engine
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. forum_posts ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.forum_posts (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          TEXT        NOT NULL,           -- Clerk user ID
    author_name      TEXT        NOT NULL DEFAULT 'Anonymous',
    author_avatar    TEXT        NOT NULL DEFAULT '?',  -- 2-char initials
    title            TEXT        NOT NULL,
    body             TEXT        NOT NULL,
    tags             TEXT[]      NOT NULL DEFAULT '{}',
    category         TEXT        NOT NULL DEFAULT 'Discussion'
                                 CHECK (category IN ('Question','Discussion','Resource','Solution')),
    upvotes_count    INTEGER     NOT NULL DEFAULT 0,
    downvotes_count  INTEGER     NOT NULL DEFAULT 0,
    saves_count      INTEGER     NOT NULL DEFAULT 0,
    comments_count   INTEGER     NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. forum_votes ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.forum_votes (
    id        UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id   UUID  NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
    user_id   TEXT  NOT NULL,
    vote_type TEXT  NOT NULL CHECK (vote_type IN ('up','down')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_forum_vote UNIQUE (user_id, post_id)
);

-- ── 3. forum_saves ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.forum_saves (
    id         UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id    UUID  NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
    user_id    TEXT  NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_forum_save UNIQUE (user_id, post_id)
);

-- ── 4. Enable Realtime ───────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_saves;

-- ── 5. RLS — open policies (Clerk JWT identifies users via user_id TEXT) ───────

ALTER TABLE public.forum_posts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_votes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_saves  ENABLE ROW LEVEL SECURITY;

-- forum_posts
DROP POLICY IF EXISTS "fp_select_all"   ON public.forum_posts;
DROP POLICY IF EXISTS "fp_insert_own"   ON public.forum_posts;
DROP POLICY IF EXISTS "fp_update_own"   ON public.forum_posts;
DROP POLICY IF EXISTS "fp_delete_own"   ON public.forum_posts;

CREATE POLICY "fp_select_all"  ON public.forum_posts FOR SELECT USING (true);
CREATE POLICY "fp_insert_own"  ON public.forum_posts FOR INSERT WITH CHECK (true);
CREATE POLICY "fp_update_own"  ON public.forum_posts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "fp_delete_own"  ON public.forum_posts FOR DELETE USING (true);

-- forum_votes
DROP POLICY IF EXISTS "fv_select_all"   ON public.forum_votes;
DROP POLICY IF EXISTS "fv_insert_all"   ON public.forum_votes;
DROP POLICY IF EXISTS "fv_update_all"   ON public.forum_votes;
DROP POLICY IF EXISTS "fv_delete_all"   ON public.forum_votes;

CREATE POLICY "fv_select_all"  ON public.forum_votes FOR SELECT USING (true);
CREATE POLICY "fv_insert_all"  ON public.forum_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "fv_update_all"  ON public.forum_votes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "fv_delete_all"  ON public.forum_votes FOR DELETE USING (true);

-- forum_saves
DROP POLICY IF EXISTS "fs_select_all"   ON public.forum_saves;
DROP POLICY IF EXISTS "fs_insert_all"   ON public.forum_saves;
DROP POLICY IF EXISTS "fs_delete_all"   ON public.forum_saves;

CREATE POLICY "fs_select_all"  ON public.forum_saves FOR SELECT USING (true);
CREATE POLICY "fs_insert_all"  ON public.forum_saves FOR INSERT WITH CHECK (true);
CREATE POLICY "fs_delete_all"  ON public.forum_saves FOR DELETE USING (true);

-- ── 6. RPC: Cast a vote (insert/change/remove) ───────────────────────────────
-- Returns: 'added', 'changed', 'removed'

CREATE OR REPLACE FUNCTION cast_forum_vote(
    p_post_id   UUID,
    p_user_id   TEXT,
    p_vote_type TEXT   -- 'up' or 'down'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    existing_type TEXT;
    result        TEXT;
BEGIN
    SELECT vote_type INTO existing_type
    FROM public.forum_votes
    WHERE post_id = p_post_id AND user_id = p_user_id;

    IF existing_type IS NULL THEN
        -- No vote yet → insert new
        INSERT INTO public.forum_votes (post_id, user_id, vote_type)
        VALUES (p_post_id, p_user_id, p_vote_type);

        IF p_vote_type = 'up' THEN
            UPDATE public.forum_posts SET upvotes_count = upvotes_count + 1 WHERE id = p_post_id;
        ELSE
            UPDATE public.forum_posts SET downvotes_count = downvotes_count + 1 WHERE id = p_post_id;
        END IF;
        result := 'added';

    ELSIF existing_type = p_vote_type THEN
        -- Same vote again → remove (toggle off)
        DELETE FROM public.forum_votes WHERE post_id = p_post_id AND user_id = p_user_id;

        IF p_vote_type = 'up' THEN
            UPDATE public.forum_posts SET upvotes_count = GREATEST(upvotes_count - 1, 0) WHERE id = p_post_id;
        ELSE
            UPDATE public.forum_posts SET downvotes_count = GREATEST(downvotes_count - 1, 0) WHERE id = p_post_id;
        END IF;
        result := 'removed';

    ELSE
        -- Different vote → change
        UPDATE public.forum_votes SET vote_type = p_vote_type WHERE post_id = p_post_id AND user_id = p_user_id;

        IF p_vote_type = 'up' THEN
            UPDATE public.forum_posts
            SET upvotes_count   = upvotes_count + 1,
                downvotes_count = GREATEST(downvotes_count - 1, 0)
            WHERE id = p_post_id;
        ELSE
            UPDATE public.forum_posts
            SET downvotes_count = downvotes_count + 1,
                upvotes_count   = GREATEST(upvotes_count - 1, 0)
            WHERE id = p_post_id;
        END IF;
        result := 'changed';
    END IF;

    RETURN result;
END;
$$;

-- ── 7. RPC: Toggle save ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION toggle_forum_save(
    p_post_id UUID,
    p_user_id TEXT
)
RETURNS BOOLEAN   -- true = now saved, false = now unsaved
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    existing_id UUID;
BEGIN
    SELECT id INTO existing_id
    FROM public.forum_saves
    WHERE post_id = p_post_id AND user_id = p_user_id;

    IF existing_id IS NULL THEN
        INSERT INTO public.forum_saves (post_id, user_id) VALUES (p_post_id, p_user_id);
        UPDATE public.forum_posts SET saves_count = saves_count + 1 WHERE id = p_post_id;
        RETURN TRUE;
    ELSE
        DELETE FROM public.forum_saves WHERE id = existing_id;
        UPDATE public.forum_posts SET saves_count = GREATEST(saves_count - 1, 0) WHERE id = p_post_id;
        RETURN FALSE;
    END IF;
END;
$$;

-- ── 8. Index for fast lookups ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_forum_posts_user_id   ON public.forum_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created_at ON public.forum_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_votes_post_id    ON public.forum_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_votes_user_id    ON public.forum_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_saves_post_id    ON public.forum_saves(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_saves_user_id    ON public.forum_saves(user_id);
