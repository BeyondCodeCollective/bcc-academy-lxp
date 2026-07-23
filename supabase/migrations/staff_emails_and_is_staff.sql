-- Staff = BGC/BCC employees who should only see Lunch & Learns, never learner
-- content. Domain (@wearebgc.org) is auto-staff in code; this table lets admins
-- designate staff on mixed domains (e.g. specific @wearebcc.org employees) where
-- domain can't decide (real students like Ramon also use wearebcc.org).
create table if not exists staff_emails (
  email text primary key,
  added_by uuid references students(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Resolved per-account flag (domain OR staff_emails). Read by session/gates/metrics
-- so learner surfaces can exclude staff without an email-domain check everywhere.
alter table students add column if not exists is_staff boolean not null default false;

-- Backfill existing accounts: the auto-staff domain + anyone already on the list.
update students
set is_staff = true
where is_staff = false
  and (
    lower(split_part(email, '@', 2)) = 'wearebgc.org'
    or lower(email) in (select email from staff_emails)
  );
