-- Add structured prompt responses to submissions.
-- Forte Bahamas (and any program with per-week submission prompts) stores the
-- student's answers to each "Written Artifact" question here, keyed by the
-- prompt text. Files and links remain in the existing columns for supporting
-- attachments (e.g. Brand Starter logo files).

alter table submissions
  add column if not exists prompt_responses jsonb not null default '{}'::jsonb;
