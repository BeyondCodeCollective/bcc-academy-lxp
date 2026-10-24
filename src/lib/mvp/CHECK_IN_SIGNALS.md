# Additional check-in signals

Locally integrated into dashboard evaluation, needs-check-in filtering, counts and existing exports. No UI, database writes or migrations were added.

- Missing mandatory work: uses the existing exact program/course assignment configuration. An unsubmitted required assignment triggers after its inclusive configured grace window (approved default: 14 days). A late completed submission clears this missing-work signal; it does not retroactively satisfy the separate active-status timeliness rule. Drafts do not count. Corrupt timestamps remain unknown.
- Low assessment: explicit course-to-exam mapping and minimum percentage are required. Reads only score/total metadata for the authorized roster. Uses latest completed attempt, not best attempt; tied timestamps, invalid scores and absent attempts remain unknown. This adapter supports `exam_attempts`, not every LXP assessment instrument.
- Behind expected progress: explicit self-paced required-video checkpoints only. Owners must provide required week IDs, checkpoint date and minimum percentage. It measures recorded watched videos, not overall learning, submissions or generic course completion. Optional/unmapped weeks do not count. No inactivity or schedule pace is guessed. Future/invalid watched timestamps remain unknown.

`MVP_SIGNAL_POLICIES` intentionally remains empty until actual program mappings and thresholds are approved. Missing-work rules reuse `MVP_OFFERING_ACTIVE_CONFIGS`, also not populated by this work. The new logic is implemented and tested with synthetic policy fixtures; no claim is made that every real program has an active rule.

Activity reads are paginated and limited to the authorized program/course roster. Exams have no course/program field, so their exact exam mapping is mandatory; review whether an exam reused across offerings can serve as evidence for each before configuring it. A permission/read failure aborts the query rather than reporting zero. One learner with several flags counts once. A proven flag remains actionable even if another rule cannot be evaluated. No flag under configured rules does not certify coverage of unconfigured rules.

Evidence references distinguish an actual exam attempt ID from a configured assignment/checkpoint reference. Missing work cannot supply a nonexistent submission ID. Requirements assume the approved configuration applies to that current roster; historical exemptions, individual extensions and late-join eligibility need explicit records/policy before activation. Full historical membership remains outside this adapter.

Live populated-data verification and real policy activation remain pending. Fonz-dependent work is deferred at the user's request.
