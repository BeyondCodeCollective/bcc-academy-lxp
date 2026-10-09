# Progress, assessment and survey participation

Backend metrics are connected to the dashboard's authorized, applied-filter roster and PDF/CSV metric selection. No UI controls, migrations, real policy entries or database writes were added.

## Recorded required-video progress

`progressRate` is watched learner/week pairs divided by selected learners times explicitly configured required video weeks. It is available only for mapped self-paced offerings. It is not a measure of overall learning, course completion, or arbitrary content progress. An empty roster or absent mapping is unavailable; an eligible mapped roster with no watched videos is zero. Duplicate watches count once; invalid/future timestamps make the aggregate unavailable. The row retains numerator, denominator and mapped weeks.

## Assessment results

`assessmentAveragePercent` is the mean of each learner's latest valid completed mapped exam percentage. Learners without usable attempts are excluded from the score denominator, not scored zero. Rows retain eligible, assessed and unavailable learner counts plus the exam ID. A malformed or tied latest attempt does not fall back to an older score. No scores from different exam IDs are combined. This uses the explicit mapping introduced for check-in signals; it does not cover unrelated LPAT assessments, rubrics or all exam instruments automatically. Export units include exam and assessed/eligible coverage.

## Survey response

`surveyParticipation` supplies unique completed respondents, selected eligible roster size and response percentage per explicitly mapped survey. It includes non-numeric surveys without reading their answers. Drafts, invalid timestamps, future completions, outsiders and responses stamped to another program are excluded. Repeated submissions count once.

`surveyResponseRate` means completed **at least one** mapped course survey, not all required surveys. It never averages percentages across instruments. No mapping or no eligible roster means unavailable; a mapped survey with no responses is zero. The denominator is the current filtered roster, not a reconstructed historical invitation list. Program-wide surveys remain distinct from course surveys. Outcome averages still require supported paired numeric scales.

Live populated-data verification, real mappings, and broader assessment/progress sources remain deferred. The formulas above describe the supported adapters, not universal coverage of every program.
