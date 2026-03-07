-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 016: Private Messaging + Notifications
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. private_messages ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.private_messages (
    id          BIGSERIAL   PRIMARY KEY,
    sender_id   TEXT        NOT NULL,   -- Clerk user ID of sender
    receiver_id TEXT        NOT NULL,   -- Clerk user ID of receiver
    content     TEXT        NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now(),
    read_at     TIMESTAMPTZ             -- NULL = unread
);

ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "msg_select" ON public.private_messages;
DROP POLICY IF EXISTS "msg_insert" ON public.private_messages;
DROP POLICY IF EXISTS "msg_update" ON public.private_messages;

CREATE POLICY "msg_select" ON public.private_messages FOR SELECT USING (true);
CREATE POLICY "msg_insert" ON public.private_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "msg_update" ON public.private_messages FOR UPDATE USING (true) WITH CHECK (true);

-- ── 2. notifications ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
    id           BIGSERIAL   PRIMARY KEY,
    user_id      TEXT        NOT NULL,   -- who receives the notification
    type         TEXT        NOT NULL,   -- 'message' | 'follow' | 'friend_request' | 'friend_accepted'
    from_user_id TEXT        NOT NULL,   -- who triggered it
    reference_id TEXT,                  -- e.g. message id, post id
    content      TEXT,                  -- human-readable text
    is_read      BOOLEAN     DEFAULT false,
    created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select" ON public.notifications;
DROP POLICY IF EXISTS "notif_insert" ON public.notifications;
DROP POLICY IF EXISTS "notif_update" ON public.notifications;

CREATE POLICY "notif_select" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE USING (true) WITH CHECK (true);

-- ── 3. Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_pm_sender       ON public.private_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_pm_receiver     ON public.private_messages (receiver_id);
CREATE INDEX IF NOT EXISTS idx_pm_created      ON public.private_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_user      ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notif_created   ON public.notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_unread    ON public.notifications (user_id, is_read);
