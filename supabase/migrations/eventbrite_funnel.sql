-- Eventbrite registration funnel.
--
-- A camp landing page can embed an Eventbrite event. When someone registers
-- via the embed, we resolve their order server-side (claim route + order.placed
-- webhook), allowlist them for the page's track, mint a durable invite token,
-- and email them a confirmation. Curriculum stays locked behind the track's
-- start date — registration earns the holding page, not the lessons.

-- 1) Which Eventbrite event a camp page embeds. NULL = no embed (keep the
--    legacy email-magic-link form).
alter table landing_pages
  add column if not exists eventbrite_event_id text default null;

create index if not exists landing_pages_eventbrite_event_idx
  on landing_pages (eventbrite_event_id);

-- 2) Idempotency ledger. Both the client claim route and the order.placed
--    webhook process the same order; the order_id PK guarantees we provision +
--    email exactly once. invite_token links back to the durable /invite/<token>
--    we issued for that registrant.
create table if not exists eventbrite_orders (
  order_id     text primary key,
  email        text not null,
  track_slug   text not null,
  event_id     text,
  invite_token text,
  created_at   timestamptz not null default now()
);

create index if not exists eventbrite_orders_email_idx
  on eventbrite_orders (email);
