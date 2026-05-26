-- Move the signup allowlist from per-PROGRAM scoping (atg / forge / forte /
-- catalyst) to per-COURSE scoping (mass / techplus / ai-literacy / etc).
-- Each program has many tracks and the team wants to gate each one
-- independently — uploading 175 emails to "Upskill Bahamas" used to mean
-- every track inside that program was opened up to those 175 even though
-- only AI Literacy is actually running right now.
--
-- The new schema is keyed on (email, track_slug). Old rows under
-- program_slug='forte' are backfilled to track_slug='ai-literacy' (the only
-- live Upskill Bahamas track). Any leftover rows without an obvious
-- track destination are deleted — re-upload via the new per-track picker.

-- Step 1 — add track_slug, backfill the Upskill Bahamas list.
alter table allowed_signup_emails
  add column if not exists track_slug text;

update allowed_signup_emails
  set track_slug = 'ai-literacy'
  where program_slug = 'forte' and track_slug is null;

-- Step 2 — drop any rows still without a track_slug. Empty allowlists are
-- the safest default (no gate). Re-upload via the new per-track UI.
delete from allowed_signup_emails where track_slug is null;

-- Step 3 — make track_slug required and rebuild the primary key.
alter table allowed_signup_emails alter column track_slug set not null;

alter table allowed_signup_emails drop constraint if exists allowed_signup_emails_pkey;
alter table allowed_signup_emails add primary key (email, track_slug);

-- Step 4 — drop the program_slug column. The track→program relationship is
-- knowable from the TS config; storing it here is redundant and made it
-- possible to upload "into the wrong program".
drop index if exists allowed_signup_emails_program_idx;
alter table allowed_signup_emails drop column if exists program_slug;

create index if not exists allowed_signup_emails_track_idx
  on allowed_signup_emails (track_slug);
