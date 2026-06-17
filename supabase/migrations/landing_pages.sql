-- DB-driven marketing landing pages (the "camp" template skin). One row per
-- public landing page, rendered by the /camp/[slug] template. Lets a new
-- per-org landing page be created/edited in the admin with no code deploy.
create table if not exists public.landing_pages (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  published           boolean not null default true,
  header_label        text not null default 'BCC Academy',
  eyebrow             text,
  headline            text not null,
  subhead             text,
  accent              text not null default '#1a1a1a',
  form_label          text,
  track_slug          text,            -- links the signup form to a track/portal
  schedule            jsonb not null default '[]'::jsonb,   -- [{label, title}]
  secondary_cta_label text,
  secondary_cta_url   text,
  partners            jsonb not null default '[]'::jsonb,   -- [{kind:'image'|'wordmark', src?, alt?, label?, height?}]
  hero_image_url      text,
  footer_text         text,
  meta_title          text,
  meta_description    text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Public read for published pages (the landing page is public, no auth). Writes
-- go through super-admin server actions on the service client.
alter table public.landing_pages enable row level security;
create policy "public can read published landing pages"
  on public.landing_pages for select
  using (published = true);
