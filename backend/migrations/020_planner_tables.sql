-- ============================================================================
-- Migration 020: Planner Tables (study_plans + plan_proofs)
-- ============================================================================

-- 1. study_plans — stores the full AI-generated study plan per user
CREATE TABLE IF NOT EXISTS study_plans (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     TEXT NOT NULL,
    name        TEXT NOT NULL,
    target_date DATE NOT NULL,
    daily_hours NUMERIC(3,1) DEFAULT 2,
    intensity   TEXT DEFAULT 'normal' CHECK (intensity IN ('light','normal','aggressive')),
    plan_data   JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS study_plans_user_idx ON study_plans(user_id);
CREATE INDEX IF NOT EXISTS study_plans_created_idx ON study_plans(created_at DESC);

-- 2. plan_proofs — per-chapter proof submissions linked to a plan
CREATE TABLE IF NOT EXISTS plan_proofs (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id         UUID NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL,
    chapter_index   INT NOT NULL,
    file_url        TEXT,
    file_name       TEXT,
    notes           TEXT,
    submitted_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plan_proofs_plan_idx ON plan_proofs(plan_id);
CREATE INDEX IF NOT EXISTS plan_proofs_user_idx ON plan_proofs(user_id);

-- 3. RLS Policies
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_proofs ENABLE ROW LEVEL SECURITY;

-- Users can only see/modify their own plans
CREATE POLICY "Users manage own plans"
    ON study_plans FOR ALL
    USING (auth.uid()::text = user_id OR current_setting('request.jwt.claims', true)::json->>'sub' = user_id)
    WITH CHECK (auth.uid()::text = user_id OR current_setting('request.jwt.claims', true)::json->>'sub' = user_id);

-- Users can only see/modify their own proofs
CREATE POLICY "Users manage own proofs"
    ON plan_proofs FOR ALL
    USING (auth.uid()::text = user_id OR current_setting('request.jwt.claims', true)::json->>'sub' = user_id)
    WITH CHECK (auth.uid()::text = user_id OR current_setting('request.jwt.claims', true)::json->>'sub' = user_id);

-- Allow anon key to read/write (Clerk handles auth, not Supabase auth)
CREATE POLICY "Anon access plans" ON study_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon access proofs" ON plan_proofs FOR ALL USING (true) WITH CHECK (true);
