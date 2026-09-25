-- "Coming soon" landing pages: the form collects name + email + ZIP into
-- landing_signups and does NOTHING else — no allowlist, no invite, no login
-- link, no course enrollment. For a program whose next cohort has no date yet.
alter table landing_pages add column if not exists coming_soon boolean not null default false;
