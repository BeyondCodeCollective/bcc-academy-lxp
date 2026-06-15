-- Re-home program-scoped data after the program re-org (Beyond Code Centers
-- split + Roblox/Godot/IBM -> BGC). Moving a track between programs orphaned
-- its rows under the OLD program_id (session_content / track_overrides /
-- student_tracks are program-scoped). This points each track's data at its
-- correct home program. Guarded by tests/smoke/program-data-integrity.spec.ts.
--
-- Program ids: beyond-code-centers c497ff55…, forte cacead69…, catalyst a7dd0e35…

update session_content set program_id = 'c497ff55-3673-4a24-acbf-662d851f8f47'
  where track in ('ai-fundamentals','ai-digital-natives','ai-automation-bootcamp','foundations-ai')
    and program_id = 'a7dd0e35-dfba-451d-aa61-4e1251e1c53f';
update session_content set program_id = 'cacead69-b0e2-4f73-bf7d-dbc18b35acc6'
  where track = 'ai-literacy' and program_id = 'a7dd0e35-dfba-451d-aa61-4e1251e1c53f';

update track_overrides set program_id = 'c497ff55-3673-4a24-acbf-662d851f8f47'
  where track_slug in ('ai-fundamentals','ai-digital-natives','ai-automation-bootcamp','foundations-ai')
    and program_id = 'a7dd0e35-dfba-451d-aa61-4e1251e1c53f';
update track_overrides set program_id = 'cacead69-b0e2-4f73-bf7d-dbc18b35acc6'
  where track_slug = 'ai-literacy' and program_id = 'a7dd0e35-dfba-451d-aa61-4e1251e1c53f';

update student_tracks set program_id = 'c497ff55-3673-4a24-acbf-662d851f8f47'
  where track_slug in ('ai-fundamentals','ai-digital-natives','ai-automation-bootcamp')
    and program_id = 'a7dd0e35-dfba-451d-aa61-4e1251e1c53f';

-- Re-home students whose enrollments are ONLY beyond-code-centers tracks.
update students set program_id = 'c497ff55-3673-4a24-acbf-662d851f8f47'
  where program_id = 'a7dd0e35-dfba-451d-aa61-4e1251e1c53f'
    and id in (select student_id from student_tracks where track_slug in ('ai-fundamentals','ai-digital-natives','ai-automation-bootcamp'))
    and id not in (select student_id from student_tracks where track_slug not in ('ai-fundamentals','ai-digital-natives','ai-automation-bootcamp'));
