-- Phase 6: a landing page can host an event's registration form.
-- landing_pages.event_slug points at events.slug (same program as the page);
-- when set, the page's signup slot renders the multi-attendee RegisterForm
-- and /events links the event to this page instead of the bare register URL.
-- Idempotent; safe to re-run.

alter table public.landing_pages
  add column if not exists event_slug text;

create index if not exists idx_landing_pages_event_slug
  on public.landing_pages(event_slug) where event_slug is not null;
