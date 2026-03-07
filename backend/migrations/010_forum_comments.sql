-- ============================================================
-- 010_forum_comments.sql
-- Comments (with nested replies, edit, delete, like/dislike)
-- ============================================================

-- ── 1. forum_comments ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_comments (
    id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id       UUID        NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
    user_id       TEXT        NOT NULL,
    author_name   TEXT        NOT NULL,
    author_avatar TEXT        NOT NULL DEFAULT '',
    body          TEXT        NOT NULL,
    parent_id     UUID        REFERENCES forum_comments(id) ON DELETE CASCADE,
    likes_count   INTEGER     NOT NULL DEFAULT 0,
    dislikes_count INTEGER    NOT NULL DEFAULT 0,
    edited        BOOLEAN     NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. forum_comment_votes ────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_comment_votes (
    comment_id  UUID  NOT NULL REFERENCES forum_comments(id) ON DELETE CASCADE,
    user_id     TEXT  NOT NULL,
    vote_type   TEXT  NOT NULL CHECK (vote_type IN ('like','dislike')),
    PRIMARY KEY (comment_id, user_id)
);

-- ── 3. RLS (open, matching library pattern) ───────────────
ALTER TABLE forum_comments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comment_votes  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forum_comments_open"
    ON forum_comments FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "forum_comment_votes_open"
    ON forum_comment_votes FOR ALL USING (true) WITH CHECK (true);

-- ── 4. Indexes ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS forum_comments_post_id_idx    ON forum_comments(post_id);
CREATE INDEX IF NOT EXISTS forum_comments_parent_id_idx  ON forum_comments(parent_id);
CREATE INDEX IF NOT EXISTS forum_comments_created_at_idx ON forum_comments(created_at);
CREATE INDEX IF NOT EXISTS forum_cvotes_comment_idx      ON forum_comment_votes(comment_id);
CREATE INDEX IF NOT EXISTS forum_cvotes_user_idx         ON forum_comment_votes(user_id);

-- ── 5. RPC: cast_comment_vote ─────────────────────────────
-- Returns 'added' | 'changed' | 'removed'
CREATE OR REPLACE FUNCTION cast_comment_vote(
    p_comment_id UUID,
    p_user_id    TEXT,
    p_vote_type  TEXT   -- 'like' | 'dislike'
) RETURNS TEXT AS $$
DECLARE
    v_existing TEXT;
    v_result   TEXT;
BEGIN
    SELECT vote_type INTO v_existing
    FROM forum_comment_votes
    WHERE comment_id = p_comment_id AND user_id = p_user_id;

    IF v_existing IS NULL THEN
        -- Add new vote
        INSERT INTO forum_comment_votes(comment_id, user_id, vote_type)
        VALUES (p_comment_id, p_user_id, p_vote_type);

        IF p_vote_type = 'like' THEN
            UPDATE forum_comments SET likes_count    = likes_count    + 1 WHERE id = p_comment_id;
        ELSE
            UPDATE forum_comments SET dislikes_count = dislikes_count + 1 WHERE id = p_comment_id;
        END IF;
        v_result := 'added';

    ELSIF v_existing = p_vote_type THEN
        -- Remove (toggle off)
        DELETE FROM forum_comment_votes WHERE comment_id = p_comment_id AND user_id = p_user_id;

        IF p_vote_type = 'like' THEN
            UPDATE forum_comments SET likes_count    = GREATEST(0, likes_count    - 1) WHERE id = p_comment_id;
        ELSE
            UPDATE forum_comments SET dislikes_count = GREATEST(0, dislikes_count - 1) WHERE id = p_comment_id;
        END IF;
        v_result := 'removed';

    ELSE
        -- Switch vote
        UPDATE forum_comment_votes SET vote_type = p_vote_type
        WHERE comment_id = p_comment_id AND user_id = p_user_id;

        IF p_vote_type = 'like' THEN
            UPDATE forum_comments
            SET likes_count    = likes_count    + 1,
                dislikes_count = GREATEST(0, dislikes_count - 1)
            WHERE id = p_comment_id;
        ELSE
            UPDATE forum_comments
            SET dislikes_count = dislikes_count + 1,
                likes_count    = GREATEST(0, likes_count    - 1)
            WHERE id = p_comment_id;
        END IF;
        v_result := 'changed';
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ── 6. Trigger: increment forum_posts.comments_count ──────
CREATE OR REPLACE FUNCTION increment_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE forum_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_forum_comment_insert ON forum_comments;
CREATE TRIGGER on_forum_comment_insert
    AFTER INSERT ON forum_comments
    FOR EACH ROW EXECUTE FUNCTION increment_post_comments_count();

-- ── 7. Trigger: decrement forum_posts.comments_count ──────
CREATE OR REPLACE FUNCTION decrement_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE forum_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_forum_comment_delete ON forum_comments;
CREATE TRIGGER on_forum_comment_delete
    AFTER DELETE ON forum_comments
    FOR EACH ROW EXECUTE FUNCTION decrement_post_comments_count();

-- ── 8. Realtime ───────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE forum_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE forum_comment_votes;
