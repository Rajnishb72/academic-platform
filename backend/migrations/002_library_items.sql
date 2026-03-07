-- Supabase SQL: library_items table (Notes Management system)
-- Run in: Supabase Dashboard → SQL Editor

-- ── Create table ──────────────────────────────────────────────────────────────
create table if not exists public.library_items (
  id          uuid         default gen_random_uuid() primary key,
  user_id     text         not null,       -- Clerk user ID
  title       text         not null,
  subject     text         not null,
  summary     text,
  is_public   boolean      not null default true,
  file_url    text         not null,       -- Supabase Storage public URL
  file_path   text         not null,       -- Storage path (for deletion)
  created_at  timestamptz  default now(),
  updated_at  timestamptz  default now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_library_items_user   on public.library_items (user_id);
create index if not exists idx_library_items_public on public.library_items (is_public, created_at desc);
create index if not exists idx_library_items_subject on public.library_items (subject);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.library_items enable row level security;

-- Read: public notes visible to everyone; private notes visible only to owner
create policy "Public notes visible to all"
  on public.library_items for select
  using (is_public = true or auth.uid()::text = user_id);

-- Insert: authenticated users can insert their own rows
create policy "Authenticated users can insert own items"
  on public.library_items for insert
  with check (auth.uid()::text = user_id);

-- Update: only the owner can update
create policy "Owners can update their items"
  on public.library_items for update
  using (auth.uid()::text = user_id);

-- Delete: only the owner can delete
create policy "Owners can delete their items"
  on public.library_items for delete
  using (auth.uid()::text = user_id);

-- ── Storage Bucket Setup ──────────────────────────────────────────────────────
-- Run separately in Supabase Dashboard → Storage → New Bucket:
-- Name: notes
-- Public: YES (so public file URLs work without signed URLs)
--
-- Then add a Storage policy:
-- Bucket: notes
-- Policy name: "Authenticated users can upload"
-- Operation: INSERT
-- Using expression: auth.uid() IS NOT NULL
