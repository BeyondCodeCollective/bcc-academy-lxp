-- Extra multiple-choice questions a landing page asks on its native signup form
-- (e.g. Field Ready: resident / employment / in-person attendance), and the
-- answers each signup gave. Answers are stored as { "<question label>": "<choice>" }
-- so the admin export reads without a join and survives later question edits.
alter table public.landing_pages add column if not exists signup_questions jsonb not null default '[]'::jsonb;
alter table public.landing_signups add column if not exists answers jsonb not null default '{}'::jsonb;
