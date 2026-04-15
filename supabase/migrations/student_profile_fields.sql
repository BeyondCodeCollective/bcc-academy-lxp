-- Add profile fields collected during onboarding
alter table students
  add column if not exists location text,
  add column if not exists date_of_birth date,
  add column if not exists education_level text,
  add column if not exists onboarding_completed boolean not null default false;
