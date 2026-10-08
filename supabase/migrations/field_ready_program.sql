-- Field Ready becomes its own program.
--
-- It shipped as `forward-deploy`, one track under Catalyst. That was right for
-- seven hand-enrolled staff and wrong for a community product: a stranger who
-- signs up would become a Catalyst student, sit in Catalyst's rosters, answer
-- Catalyst's surveys and finish holding a Catalyst certificate.
--
-- No domain of its own — program resolution already falls back to a track's
-- home program (see resolveTrackProgram), so bccacademy.io serves it on a path
-- and no DNS changes are needed.
--
-- Nothing else moves here. The existing `forward-deploy` track stays exactly
-- where it is, under Catalyst, serving the seven staff and the pitch demo.
insert into programs (slug, name) values
  ('field-ready', 'Field Ready')
on conflict (slug) do nothing;
