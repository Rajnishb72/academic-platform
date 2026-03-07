-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 011: Campus — Institution Engine
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. campus_institutions ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.campus_institutions (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id         TEXT        NOT NULL,                            -- Clerk user ID
    name             TEXT        NOT NULL,
    description      TEXT        NOT NULL DEFAULT '',
    avatar_initials  TEXT        NOT NULL DEFAULT '??',
    avatar_color     TEXT        NOT NULL DEFAULT 'from-blue-500 to-indigo-600',
    is_public        BOOLEAN     NOT NULL DEFAULT true,
    invite_code      TEXT        NOT NULL UNIQUE,
    member_count     INTEGER     NOT NULL DEFAULT 1,
    course_count     INTEGER     NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. campus_members ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.campus_members (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id   UUID        NOT NULL REFERENCES public.campus_institutions(id) ON DELETE CASCADE,
    user_id          TEXT        NOT NULL,
    name             TEXT        NOT NULL DEFAULT 'Anonymous',
    avatar_initials  TEXT        NOT NULL DEFAULT '??',
    role             TEXT        NOT NULL DEFAULT 'student'
                                  CHECK (role IN ('owner','admin','instructor','student')),
    status           TEXT        NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('active','pending','invited')),
    joined_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_campus_member UNIQUE (institution_id, user_id)
);

-- ── 3. campus_courses ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.campus_courses (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id   UUID        NOT NULL REFERENCES public.campus_institutions(id) ON DELETE CASCADE,
    title            TEXT        NOT NULL,
    description      TEXT        NOT NULL DEFAULT '',
    instructor_name  TEXT        NOT NULL DEFAULT 'Instructor',
    instructor_id    TEXT        NOT NULL,                            -- Clerk user ID
    student_count    INTEGER     NOT NULL DEFAULT 0,
    assignment_count INTEGER     NOT NULL DEFAULT 0,
    color            TEXT        NOT NULL DEFAULT 'blue',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. campus_assignments ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.campus_assignments (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id        UUID        NOT NULL REFERENCES public.campus_courses(id) ON DELETE CASCADE,
    institution_id   UUID        NOT NULL REFERENCES public.campus_institutions(id) ON DELETE CASCADE,
    title            TEXT        NOT NULL,
    description      TEXT        NOT NULL DEFAULT '',
    due_date         TIMESTAMPTZ NOT NULL,
    max_points       INTEGER     NOT NULL DEFAULT 100,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. campus_submissions ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.campus_submissions (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id    UUID        NOT NULL REFERENCES public.campus_assignments(id) ON DELETE CASCADE,
    user_id          TEXT        NOT NULL,
    score            INTEGER,
    graded           BOOLEAN     NOT NULL DEFAULT false,
    submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_campus_submission UNIQUE (assignment_id, user_id)
);

-- ── 6. campus_announcements ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.campus_announcements (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id   UUID        NOT NULL REFERENCES public.campus_institutions(id) ON DELETE CASCADE,
    author_id        TEXT        NOT NULL,
    author_name      TEXT        NOT NULL DEFAULT 'Admin',
    author_avatar    TEXT        NOT NULL DEFAULT 'AD',
    title            TEXT        NOT NULL,
    body             TEXT        NOT NULL,
    pinned           BOOLEAN     NOT NULL DEFAULT false,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 7. Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS campus_members_institution_idx ON public.campus_members(institution_id);
CREATE INDEX IF NOT EXISTS campus_members_user_idx        ON public.campus_members(user_id);
CREATE INDEX IF NOT EXISTS campus_courses_institution_idx ON public.campus_courses(institution_id);
CREATE INDEX IF NOT EXISTS campus_assignments_course_idx  ON public.campus_assignments(course_id);
CREATE INDEX IF NOT EXISTS campus_assignments_inst_idx    ON public.campus_assignments(institution_id);
CREATE INDEX IF NOT EXISTS campus_submissions_asgn_idx   ON public.campus_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS campus_submissions_user_idx   ON public.campus_submissions(user_id);
CREATE INDEX IF NOT EXISTS campus_announcements_inst_idx ON public.campus_announcements(institution_id);
CREATE INDEX IF NOT EXISTS campus_institutions_code_idx  ON public.campus_institutions(invite_code);

-- ── 8. RLS — open policies (same pattern as forums) ──────────────────────────

ALTER TABLE public.campus_institutions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_courses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_assignments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_submissions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_announcements ENABLE ROW LEVEL SECURITY;

-- institutions
DROP POLICY IF EXISTS "ci_select_all"  ON public.campus_institutions;
DROP POLICY IF EXISTS "ci_insert_all"  ON public.campus_institutions;
DROP POLICY IF EXISTS "ci_update_all"  ON public.campus_institutions;
DROP POLICY IF EXISTS "ci_delete_all"  ON public.campus_institutions;
CREATE POLICY "ci_select_all"  ON public.campus_institutions FOR SELECT USING (true);
CREATE POLICY "ci_insert_all"  ON public.campus_institutions FOR INSERT WITH CHECK (true);
CREATE POLICY "ci_update_all"  ON public.campus_institutions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "ci_delete_all"  ON public.campus_institutions FOR DELETE USING (true);

-- members
DROP POLICY IF EXISTS "cm_select_all"  ON public.campus_members;
DROP POLICY IF EXISTS "cm_insert_all"  ON public.campus_members;
DROP POLICY IF EXISTS "cm_update_all"  ON public.campus_members;
DROP POLICY IF EXISTS "cm_delete_all"  ON public.campus_members;
CREATE POLICY "cm_select_all"  ON public.campus_members FOR SELECT USING (true);
CREATE POLICY "cm_insert_all"  ON public.campus_members FOR INSERT WITH CHECK (true);
CREATE POLICY "cm_update_all"  ON public.campus_members FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "cm_delete_all"  ON public.campus_members FOR DELETE USING (true);

-- courses
DROP POLICY IF EXISTS "cc_select_all"  ON public.campus_courses;
DROP POLICY IF EXISTS "cc_insert_all"  ON public.campus_courses;
DROP POLICY IF EXISTS "cc_update_all"  ON public.campus_courses;
DROP POLICY IF EXISTS "cc_delete_all"  ON public.campus_courses;
CREATE POLICY "cc_select_all"  ON public.campus_courses FOR SELECT USING (true);
CREATE POLICY "cc_insert_all"  ON public.campus_courses FOR INSERT WITH CHECK (true);
CREATE POLICY "cc_update_all"  ON public.campus_courses FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "cc_delete_all"  ON public.campus_courses FOR DELETE USING (true);

-- assignments
DROP POLICY IF EXISTS "ca_select_all"  ON public.campus_assignments;
DROP POLICY IF EXISTS "ca_insert_all"  ON public.campus_assignments;
DROP POLICY IF EXISTS "ca_update_all"  ON public.campus_assignments;
DROP POLICY IF EXISTS "ca_delete_all"  ON public.campus_assignments;
CREATE POLICY "ca_select_all"  ON public.campus_assignments FOR SELECT USING (true);
CREATE POLICY "ca_insert_all"  ON public.campus_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "ca_update_all"  ON public.campus_assignments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "ca_delete_all"  ON public.campus_assignments FOR DELETE USING (true);

-- submissions
DROP POLICY IF EXISTS "cs_select_all"  ON public.campus_submissions;
DROP POLICY IF EXISTS "cs_insert_all"  ON public.campus_submissions;
DROP POLICY IF EXISTS "cs_update_all"  ON public.campus_submissions;
DROP POLICY IF EXISTS "cs_delete_all"  ON public.campus_submissions;
CREATE POLICY "cs_select_all"  ON public.campus_submissions FOR SELECT USING (true);
CREATE POLICY "cs_insert_all"  ON public.campus_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "cs_update_all"  ON public.campus_submissions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "cs_delete_all"  ON public.campus_submissions FOR DELETE USING (true);

-- announcements
DROP POLICY IF EXISTS "can_select_all"  ON public.campus_announcements;
DROP POLICY IF EXISTS "can_insert_all"  ON public.campus_announcements;
DROP POLICY IF EXISTS "can_update_all"  ON public.campus_announcements;
DROP POLICY IF EXISTS "can_delete_all"  ON public.campus_announcements;
CREATE POLICY "can_select_all"  ON public.campus_announcements FOR SELECT USING (true);
CREATE POLICY "can_insert_all"  ON public.campus_announcements FOR INSERT WITH CHECK (true);
CREATE POLICY "can_update_all"  ON public.campus_announcements FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "can_delete_all"  ON public.campus_announcements FOR DELETE USING (true);

-- ── 9. RPC: generate unique invite code ───────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_invite_code(prefix TEXT DEFAULT 'CAMP')
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_code TEXT;
    v_exists BOOLEAN;
BEGIN
    LOOP
        v_code := prefix || '-' || upper(substring(md5(random()::text) FROM 1 FOR 6));
        SELECT EXISTS (
            SELECT 1 FROM public.campus_institutions WHERE invite_code = v_code
        ) INTO v_exists;
        EXIT WHEN NOT v_exists;
    END LOOP;
    RETURN v_code;
END;
$$;

-- ── 10. RPC: join institution ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION join_campus_institution(
    p_institution_id UUID,
    p_user_id        TEXT,
    p_name           TEXT,
    p_avatar         TEXT
) RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_is_public BOOLEAN;
    v_status    TEXT;
BEGIN
    SELECT is_public INTO v_is_public
    FROM public.campus_institutions
    WHERE id = p_institution_id;

    IF v_is_public THEN
        v_status := 'active';
    ELSE
        v_status := 'pending';
    END IF;

    INSERT INTO public.campus_members (institution_id, user_id, name, avatar_initials, role, status)
    VALUES (p_institution_id, p_user_id, p_name, p_avatar, 'student', v_status)
    ON CONFLICT (institution_id, user_id) DO NOTHING;

    IF v_is_public THEN
        UPDATE public.campus_institutions
        SET member_count = member_count + 1
        WHERE id = p_institution_id
          AND NOT EXISTS (
              SELECT 1 FROM public.campus_members
              WHERE institution_id = p_institution_id AND user_id = p_user_id AND status = 'active'
              LIMIT 1
          );
    END IF;

    RETURN v_status;
END;
$$;
