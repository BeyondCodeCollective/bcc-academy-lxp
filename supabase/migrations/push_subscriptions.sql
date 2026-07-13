-- Web push subscriptions for browser push notifications.
-- Students opt in via the PushToggle component in the dashboard.
-- Subscriptions are cleaned up automatically when push delivery
-- returns 410 Gone (expired/unsubscribed).

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  updated_at timestamptz not null default now(),
  unique (student_id, endpoint)
);

create index if not exists idx_push_subscriptions_student
  on push_subscriptions (student_id);

alter table push_subscriptions enable row level security;

create policy "Students can manage own push subscriptions"
  on push_subscriptions for all
  using (auth.uid() = student_id);
