-- Event management, phase 2: capacity enforced per attendee, waitlist, and
-- offer-to-confirm promotion when a seat opens.
--
-- Attendee status lifecycle:
--   confirmed  - holds a seat
--   waitlisted - event was full at registration; queued by created_at
--   offered    - a seat opened and was offered; holds the seat until
--                offer_expires_at, confirmed via confirm_token
--   expired    - offer window passed without confirming; seat released
--   cancelled  - parent cancelled (any prior status)
--   attended   - checked in (phase 3)
-- Idempotent; safe to re-run.

alter table event_attendees drop constraint if exists event_attendees_status_check;
alter table event_attendees add constraint event_attendees_status_check
  check (status in ('confirmed', 'waitlisted', 'offered', 'expired', 'cancelled', 'attended'));

alter table event_attendees
  add column if not exists confirm_token uuid unique,
  add column if not exists offered_at timestamptz,
  add column if not exists offer_expires_at timestamptz,
  add column if not exists confirmed_at timestamptz;

-- Queue order for promotion: oldest waitlisted attendee first.
create index if not exists idx_event_attendees_waitlist
  on event_attendees(event_id, created_at) where status = 'waitlisted';

-- Offers past their window are swept by /api/cron/events-waitlist.
create index if not exists idx_event_attendees_offer_expiry
  on event_attendees(offer_expires_at) where status = 'offered';

alter table events
  add column if not exists waitlist_enabled boolean not null default true,
  add column if not exists offer_window_hours int not null default 48;
