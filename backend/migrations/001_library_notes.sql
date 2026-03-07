-- Supabase SQL: Create the library_notes table
-- Run this in the Supabase Dashboard → SQL Editor

create table if not exists public.library_notes (
  id            uuid          default gen_random_uuid() primary key,
  user_id       text          not null,         -- Clerk user ID (e.g. user_2abc...)
  title         text          not null,
  description   text,
  subject       text          not null,
  doc_type      text          not null default 'handwritten',
  is_public     boolean       not null default true,
  allow_ai_index boolean      not null default true,
  file_url      text          not null,         -- Supabase Storage URL
  downloads     integer       not null default 0,
  rating        numeric(3,2)  not null default 0,
  rating_count  integer       not null default 0,
  xp_earned     integer       not null default 0,
  created_at    timestamptz   default now(),
  updated_at    timestamptz   default now()
);

-- Index for fast user lookups
create index if not exists idx_library_notes_user_id on public.library_notes (user_id);

-- Index for public notes (for explore page)
create index if not exists idx_library_notes_public on public.library_notes (is_public, created_at desc);

-- Row Level Security
alter table public.library_notes enable row level security;

-- Allow users to read their own notes (service role bypasses RLS anyway)
create policy "Users can read own notes"
  on public.library_notes for select
  using (auth.uid()::text = user_id);

-- Allow insert (from service role via backend)
create policy "Service role can insert"
  on public.library_notes for insert
  with check (true);

-- Allow update own notes
create policy "Users can update own notes"
  on public.library_notes for update
  using (auth.uid()::text = user_id);

-- Allow delete own notes
create policy "Users can delete own notes"
  on public.library_notes for delete
  using (auth.uid()::text = user_id);
