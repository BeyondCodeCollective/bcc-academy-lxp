-- Move the 175 emails uploaded to Catalyst's allowlist over to the Upskill
-- Bahamas (forte) allowlist. The admin who uploaded landed on the page's
-- default program selector (Catalyst, alphabetically first) and pasted there
-- instead of switching the picker to Upskill Bahamas — Catalyst doesn't have
-- requireAllowlist enabled anyway, so the rows were dormant.
--
-- We move rather than copy: the original upload was intended for Upskill
-- Bahamas only, and an empty Catalyst allowlist is the safer default state.
-- ON CONFLICT skips any address that already exists under `forte` so this is
-- safe to re-run.
--
-- Anything that's actually meant to be on the Catalyst allowlist can be
-- uploaded again with the picker pointed at Catalyst.

insert into allowed_signup_emails (email, program_slug, added_at, added_by)
select email, 'forte', added_at, added_by
from allowed_signup_emails
where program_slug = 'catalyst'
on conflict (email, program_slug) do nothing;

delete from allowed_signup_emails where program_slug = 'catalyst';
