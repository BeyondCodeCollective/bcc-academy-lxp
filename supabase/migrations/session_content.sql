-- Session content: recording URLs, meeting links, and resources per track/week
create table if not exists session_content (
  id uuid default gen_random_uuid() primary key,
  track text not null check (track in ('mass', 'techplus')),
  week_number int not null check (week_number >= 1),
  meeting_link text,
  recording_url text,
  -- resources is a JSONB array of { name: string, url: string, type: string }
  resources jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  unique(track, week_number)
);

-- RLS
alter table session_content enable row level security;

-- Any authenticated student can read session content
create policy "Authenticated users can read session content" on session_content
  for select using (auth.role() = 'authenticated');

-- Service role bypasses RLS automatically — no explicit policy needed for writes.
-- Admin writes go through createServiceClient() which uses the service role key.
