-- Surveys (the BCC Learner Intake gate) become an opt-in feature toggle,
-- mirroring assessment_enabled. Off by default; turned on per program or per
-- track from the admin Features page. See src/lib/surveys/features.ts.

alter table program_features
  add column if not exists survey_enabled boolean not null default false;

alter table track_features
  add column if not exists survey_enabled boolean not null default false;
