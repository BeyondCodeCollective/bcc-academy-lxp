-- Curated photo library for auto-set hero images. Admins bulk-upload Death to
-- Stock packs (or any licensed photos); each photo is AI-tagged on upload so
-- the course importer can pick the best match at creation time without anyone
-- hunting for images. Files live in the public `landing` storage bucket under
-- library/; this table is the searchable index.
create table if not exists public.media_library (
  id          uuid primary key default gen_random_uuid(),
  url         text not null,             -- public URL in the landing bucket
  path        text not null unique,      -- storage path, for deletes
  source      text not null default 'dts',
  description text,                      -- one-sentence AI caption
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now()
);

-- No public read needed: photos are served straight from storage; this index
-- is only read server-side (service client) by admins and the importer.
alter table public.media_library enable row level security;
