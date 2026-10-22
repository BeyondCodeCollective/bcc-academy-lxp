-- When the confirmation email last went out for a signup. A repeat submit of the
-- same page + email + date now re-sends the confirmation (found 2026-10-21: a
-- returning learner re-submitted, saw success and got nothing), at most once per
-- 10 minutes, so the public form can't be used to flood an inbox. Null means no
-- confirmation recorded yet, which counts as due.
alter table landing_signups add column if not exists last_confirmation_at timestamptz;
