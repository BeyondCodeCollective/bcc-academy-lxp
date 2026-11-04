-- Participant codes: a stable pseudonym per learner (e.g. P-7K3QX9) so survey
-- and pulse-check exports can be read without seeing who said what. The link
-- back to the person is kept (student_id stays on every row) so it can be
-- traced later if ever needed; it just isn't shown to facilitators.
--
-- Codes are random, never derived from name/email/id, so knowing a learner's
-- details doesn't reveal their code. Alphabet drops 0/O/1/I/L so a code read
-- aloud or copied by hand stays unambiguous. 31^6 ≈ 887M codes; the unique
-- index is the backstop for the (vanishingly rare) concurrent collision.

create or replace function generate_participant_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  bytes bytea;
  code text;
begin
  loop
    -- gen_random_uuid() is core (pg13+) and CSPRNG-backed; no pgcrypto needed.
    bytes := uuid_send(gen_random_uuid());
    code := 'P-';
    for i in 0..5 loop
      code := code || substr(alphabet, (get_byte(bytes, i) % 31) + 1, 1);
    end loop;
    exit when not exists (select 1 from students where participant_code = code);
  end loop;
  return code;
end;
$$;

alter table students add column if not exists participant_code text;
create unique index if not exists students_participant_code_key
  on students (participant_code);

update students set participant_code = generate_participant_code()
  where participant_code is null;

alter table students alter column participant_code set default generate_participant_code();
alter table students alter column participant_code set not null;

-- Tag each response row with the code at write time, so exports read it off
-- the response itself and never need to join to the person.
alter table survey_responses add column if not exists participant_code text;
alter table session_exit_surveys add column if not exists participant_code text;

create or replace function stamp_participant_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.participant_code is null and new.student_id is not null then
    select participant_code into new.participant_code
      from students where id = new.student_id;
  end if;
  return new;
end;
$$;

drop trigger if exists survey_responses_participant_code on survey_responses;
create trigger survey_responses_participant_code
  before insert or update on survey_responses
  for each row execute function stamp_participant_code();

drop trigger if exists session_exit_surveys_participant_code on session_exit_surveys;
create trigger session_exit_surveys_participant_code
  before insert or update on session_exit_surveys
  for each row execute function stamp_participant_code();

update survey_responses r set participant_code = s.participant_code
  from students s
  where r.student_id = s.id and r.participant_code is null;

update session_exit_surveys r set participant_code = s.participant_code
  from students s
  where r.student_id = s.id and r.participant_code is null;
