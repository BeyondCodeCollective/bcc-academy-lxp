-- Event seats: make the capacity check and the seat write one step.
--
-- registerForEvent counted open seats in one query and inserted attendees in
-- another, and promoteWaitlist did the same before offering seats. Two
-- requests landing together (two families on the last seat, or the cron and a
-- cancellation) could each see the seat as free and both take it. These two
-- functions lock the event row for the duration of the check and the write,
-- so concurrent callers queue behind each other. Idempotent; safe to re-run.
--
-- A seat is held by confirmed, offered and attended attendees (see
-- SEAT_HOLDING in src/lib/events-waitlist.ts).

-- Register a family's attendees. Capacity is per attendee and a family that
-- does not fully fit is waitlisted together. outcome is 'confirmed',
-- 'waitlisted' or 'full' (no rows inserted; seats_open says how many remain),
-- or 'not_found'.
create or replace function public.register_event_attendees(
  p_registration_id uuid,
  p_event_id uuid,
  p_attendees jsonb
)
returns table (
  outcome text,
  seats_open int,
  first_name text,
  last_name text,
  ticket_code text,
  cancel_token uuid
)
language plpgsql
set search_path = public
as $$
declare
  v_event events%rowtype;
  v_count int := jsonb_array_length(p_attendees);
  v_open int;
  v_status text;
begin
  select * into v_event from events where id = p_event_id for update;
  if not found then
    return query select 'not_found'::text, 0, null::text, null::text, null::text, null::uuid;
    return;
  end if;

  v_status := 'confirmed';
  v_open := null;
  if v_event.capacity is not null then
    v_open := greatest(0, v_event.capacity - (
      select count(*)::int from event_attendees ea
      where ea.event_id = p_event_id and ea.status in ('confirmed', 'offered', 'attended')
    ));
    if v_count > v_open then
      if not v_event.waitlist_enabled then
        return query select 'full'::text, v_open, null::text, null::text, null::text, null::uuid;
        return;
      end if;
      v_status := 'waitlisted';
    end if;
  end if;

  return query
  with ins as (
    insert into event_attendees (
      registration_id, event_id, status, first_name, last_name, date_of_birth,
      grade, school_name, school_type, gender, race_ethnicity, tshirt_size,
      allergies, emergency_contact_name, emergency_contact_phone,
      experience_level, eligibility
    )
    select
      p_registration_id, p_event_id, v_status, a.first_name, a.last_name, a.date_of_birth::date,
      nullif(a.grade, ''), nullif(a.school_name, ''), nullif(a.school_type, ''),
      nullif(a.gender, ''), nullif(a.race_ethnicity, ''), nullif(a.tshirt_size, ''),
      nullif(a.allergies, ''), nullif(a.emergency_contact_name, ''),
      nullif(a.emergency_contact_phone, ''), nullif(a.experience_level, ''),
      nullif(a.eligibility, '')
    from jsonb_to_recordset(p_attendees) as a(
      first_name text, last_name text, date_of_birth text, grade text,
      school_name text, school_type text, gender text, race_ethnicity text,
      tshirt_size text, allergies text, emergency_contact_name text,
      emergency_contact_phone text, experience_level text, eligibility text
    )
    returning event_attendees.first_name, event_attendees.last_name,
              event_attendees.ticket_code, event_attendees.cancel_token
  )
  select v_status, v_open, ins.first_name, ins.last_name, ins.ticket_code, ins.cancel_token
  from ins;
end;
$$;

-- Expire stale offers, then offer every open seat to the oldest waitlisted
-- attendees, returning who was offered. The caller emails them.
create or replace function public.offer_waitlist_seats(p_event_id uuid)
returns table (
  attendee_id uuid,
  registration_id uuid,
  first_name text,
  last_name text,
  confirm_token uuid,
  offer_expires_at timestamptz
)
language plpgsql
set search_path = public
as $$
declare
  v_event events%rowtype;
  v_open int;
begin
  select * into v_event from events where id = p_event_id for update;
  if not found or not v_event.waitlist_enabled or v_event.capacity is null then
    return;
  end if;

  update event_attendees ea
  set status = 'expired'
  where ea.event_id = p_event_id and ea.status = 'offered' and ea.offer_expires_at < now();

  v_open := v_event.capacity - (
    select count(*)::int from event_attendees ea
    where ea.event_id = p_event_id and ea.status in ('confirmed', 'offered', 'attended')
  );
  if v_open <= 0 then
    return;
  end if;

  return query
  with q as (
    select ea.id from event_attendees ea
    where ea.event_id = p_event_id and ea.status = 'waitlisted'
    order by ea.created_at
    limit v_open
    for update
  )
  update event_attendees a
  set status = 'offered',
      offered_at = now(),
      offer_expires_at = now() + make_interval(hours => v_event.offer_window_hours),
      confirm_token = gen_random_uuid()
  from q
  where a.id = q.id
  returning a.id, a.registration_id, a.first_name, a.last_name, a.confirm_token, a.offer_expires_at;
end;
$$;

-- Server-only, like the rest of the events tables: the service role calls
-- these; nobody else may.
revoke all on function public.register_event_attendees(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.offer_waitlist_seats(uuid) from public, anon, authenticated;
grant execute on function public.register_event_attendees(uuid, uuid, jsonb) to service_role;
grant execute on function public.offer_waitlist_seats(uuid) to service_role;
