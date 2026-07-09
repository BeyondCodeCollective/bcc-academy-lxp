-- The attendance table restricted `track` to ('mass','techplus'), which
-- silently rejected auto-attendance inserts for every other track (Security+
-- `comptia-security`, Network+ `network-plus`, Roblox, the new MASS instances,
-- …). Combined with the missing program_id / mismatched conflict target in the
-- zoom-signature route, nothing was ever recorded. Drop the whitelist so any
-- enrolled track can record; the app already verifies enrollment (via
-- student_tracks) before inserting.
alter table public.attendance drop constraint if exists attendance_track_check;
