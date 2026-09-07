-- Attribution captured at signup on /bcc/<slug>: "How did you hear about us?".
-- Lives on the signup row rather than in a survey because it's asked at the
-- moment of intent, before the person ever reaches the portal. Additive +
-- nullable; every existing row stays valid and reads as "not asked".
alter table landing_signups add column if not exists heard_about text;
