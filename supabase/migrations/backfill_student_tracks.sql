-- Backfill student_tracks rows that were previously implicit via the
-- "no rows = show all tracks" fallback (removed in dashboard/page.tsx).
--
-- 1. Enroll every existing ATG student in both MASS and Tech+ so they don't
--    lose access after the fallback is dropped.
-- 2. Enroll youngfonz@gmail.com in ai-fundamentals on Forge for verification.

-- 1. ATG students → mass + techplus
with atg as (
  select id from programs where slug = 'atg'
)
insert into student_tracks (student_id, track_slug, program_id)
select s.id, t.slug, atg.id
from students s
cross join atg
cross join (values ('mass'), ('techplus')) as t(slug)
where s.program_id = atg.id
on conflict (student_id, track_slug, program_id) do nothing;

-- 2. youngfonz@gmail.com → ai-fundamentals on Forge
with forge as (
  select id from programs where slug = 'forge'
)
insert into student_tracks (student_id, track_slug, program_id)
select s.id, 'ai-fundamentals', forge.id
from students s
cross join forge
where lower(s.email) = 'youngfonz@gmail.com'
  and s.program_id = forge.id
on conflict (student_id, track_slug, program_id) do nothing;
