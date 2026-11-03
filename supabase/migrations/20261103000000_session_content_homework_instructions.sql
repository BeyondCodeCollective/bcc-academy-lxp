-- Instructor-written homework instructions, shown to learners above the
-- submission form on the week page. NULL = no instructions shown.
alter table session_content
  add column if not exists homework_instructions text;
