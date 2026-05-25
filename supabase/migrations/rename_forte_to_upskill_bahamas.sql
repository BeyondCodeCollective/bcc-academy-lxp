-- Rename the program from "Forte Bahamas" to "Upskill Bahamas" in the
-- programs table. The slug stays "forte" so existing magic links, cookies,
-- /join URLs, and student.program_slug rows continue to work — only the
-- display name changes here, matching the TypeScript config rename.
-- Idempotent; safe to re-run.

update programs
set name = 'Upskill Bahamas'
where slug = 'forte';
