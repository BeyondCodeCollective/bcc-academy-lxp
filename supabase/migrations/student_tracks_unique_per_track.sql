-- One enrollment per (student, track), regardless of program.
--
-- The old UNIQUE (student_id, track_slug, program_id) let a track that moves
-- programs (e.g. Roblox: catalyst -> bgc) leave a stale "ghost" enrollment row
-- under the old program, so the course rendered twice. Collapse to one row per
-- (student, track); enrollment upsert now self-heals program_id on the next
-- sign-in (see src/lib/auth/deferred-setup.ts).

-- Dedupe: keep the newest row per (student, track), drop the older ghosts.
delete from student_tracks st
using (
  select id,
         row_number() over (
           partition by student_id, track_slug
           order by created_at desc, id desc
         ) as rn
  from student_tracks
) d
where st.id = d.id and d.rn > 1;

alter table student_tracks
  drop constraint if exists student_tracks_student_id_track_slug_program_id_key;

alter table student_tracks
  add constraint student_tracks_student_id_track_slug_key
  unique (student_id, track_slug);
