-- Lunch & Learns: internal peer-teaching recordings for BCC/BGC staff.
-- Episodic (not weekly/cohort), so they live outside the track/week model.
-- Access is gated at the route layer (program-scoped to staff-learn) and
-- in server actions (admins-only for writes). RLS just requires auth.

create table if not exists lunch_learns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  presenter text not null,
  recording_url text not null,
  description text,
  recorded_at date not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_lunch_learns_recorded_at
  on lunch_learns (recorded_at desc);

alter table lunch_learns enable row level security;

-- Read: any authenticated user. Program-scoping happens at the route layer
-- (only the staff-learn program exposes the UI).
create policy "lunch_learns read for signed-in"
  on lunch_learns for select
  to authenticated
  using (true);

-- Write: any authenticated user passes RLS; server actions enforce
-- canAccessAdminPanel before mutating. Same pattern as other tables that
-- defer role checks to the action layer.
create policy "lunch_learns write for signed-in"
  on lunch_learns for insert
  to authenticated
  with check (true);

create policy "lunch_learns update for signed-in"
  on lunch_learns for update
  to authenticated
  using (true)
  with check (true);

create policy "lunch_learns delete for signed-in"
  on lunch_learns for delete
  to authenticated
  using (true);
