-- Admin-toggleable sequential gating per course. When true on a self-paced
-- track, week N stays locked until week N-1 is complete. NULL = use the TS
-- config default (off). Mirrors submissions_enabled / reflections_enabled.

alter table track_overrides
  add column if not exists sequential_gating boolean;
