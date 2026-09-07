-- ZIP code captured on landing-page signups (grant/funder geography data).
alter table landing_signups add column if not exists zip_code text;
