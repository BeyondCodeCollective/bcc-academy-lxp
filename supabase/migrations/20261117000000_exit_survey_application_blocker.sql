-- Pulse survey v2 (2026-11-19 on). The 1 to 5 statement changed from "I could
-- explain today's main idea to a colleague" to "I could use today's main idea
-- on a real task this week", so it gets its own column: `understanding` keeps
-- the old statement's answers and is no longer written, and the two are never
-- averaged together. `blocker` is the new single-choice "what got in the way"
-- question; the allowed keys match BLOCKER_OPTIONS in src/lib/exit-survey.ts.
alter table session_exit_surveys
  add column if not exists application smallint check (application between 1 and 5),
  add column if not exists blocker text check (
    blocker in ('no_time', 'unclear_task', 'unclear_why', 'tool_broken', 'did_it')
  );
