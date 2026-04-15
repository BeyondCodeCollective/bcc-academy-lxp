-- Programs table for multi-program white-labeling
-- Each program (ATG, The Forge, etc.) gets its own row.
-- All tenant tables reference program_id for data isolation.

-- 1. Create the programs table
create table if not exists programs (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  name text not null,
  created_at timestamptz default now()
);

-- 2. Insert the two programs
insert into programs (slug, name) values
  ('atg', 'After The Game'),
  ('forge', 'The Forge')
on conflict (slug) do nothing;

-- 3. Add program_id to students (nullable first for backfill)
alter table students add column if not exists program_id uuid references programs(id);

-- 4. Add program_id to cohorts
alter table cohorts add column if not exists program_id uuid references programs(id);

-- 5. Add program_id to session_content
alter table session_content add column if not exists program_id uuid references programs(id);

-- 6. Add program_id to attendance
alter table attendance add column if not exists program_id uuid references programs(id);

-- 7. Backfill all existing rows with the ATG program ID
update students set program_id = (select id from programs where slug = 'atg') where program_id is null;
update cohorts set program_id = (select id from programs where slug = 'atg') where program_id is null;
update session_content set program_id = (select id from programs where slug = 'atg') where program_id is null;
update attendance set program_id = (select id from programs where slug = 'atg') where program_id is null;

-- 8. Make program_id NOT NULL after backfill
alter table students alter column program_id set not null;
alter table cohorts alter column program_id set not null;
alter table session_content alter column program_id set not null;
alter table attendance alter column program_id set not null;

-- 9. Update unique constraints to include program_id
-- session_content: was (track, week_number), now (program_id, track, week_number)
alter table session_content drop constraint if exists session_content_track_week_number_key;
alter table session_content add constraint session_content_program_track_week_key
  unique (program_id, track, week_number);

-- attendance: was (student_id, track, week_number, session_number), now includes program_id
alter table attendance drop constraint if exists attendance_student_id_track_week_number_session_number_key;
alter table attendance add constraint attendance_program_student_track_week_session_key
  unique (program_id, student_id, track, week_number, session_number);
