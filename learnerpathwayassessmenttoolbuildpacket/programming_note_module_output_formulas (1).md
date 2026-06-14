# Programming Note: Module Output Formulas Needed

## Purpose

Angel will need to provide the programmer with the output formulas for each module in the learner pathway alignment framework. These formulas should explain how raw assessment responses become learner-facing results, facilitator notes, pathway recommendations, and report language.

For the deeper methodology and rationale behind these scoring and reporting choices, see **catalyst_assessment_master_methodology_and_rationale.md**.

This note is a placeholder and handoff checklist for the scoring/output logic that still needs to be specified before the assessment can be programmed reliably.

## Professional review guidance received

Professional review feedback confirmed that the core constructs are conceptually strong because each scored module answers a distinct core question. This separation helps reduce construct overlap: Module 1 does not need to carry work behavior and motivation on its own.

The reviewer also noted that a total of **47 to 49 items** is realistic for an 18 to 24 year old intake population and should land in roughly a **10 to 15 minute** completion range. The reviewer warned that going over 60 items with this age group may create meaningful drop-off.

### Current target item count

| Module | Current target | Professional guidance |
|---|---:|---|
| Module 1: Archetype identity | 27 items | Stronger after item-level review; keep construct narrow. |
| Module 2: Work style scenarios | 12 scenarios/items | Forced-choice “most likely” format is a useful counterbalance to Module 1 Likert items; now 3 per axis. |
| Module 3: Motivation and pathway orientation | 10 items | 3 Self-direction, 3 Stability-seeking, and 4 Risk comfort items. |
| Former Module 4: Learning preference | 0 scored items | Reallocated to universal design program practice and possible coaching/self-advocacy handout. |
| Total | 49 scored items | Inside the 47 to 49 target; avoid exceeding 60. |

### Cross-module language guidance

Any “friction point” language should remain strengths-first. Learners should read friction language as **“here is where I may need support”**, not as a weakness or reason to doubt themselves. Facilitator-facing outputs can include more detail, but learner-facing outputs should remain confidence-building and developmental.

## Working scoring and reporting decisions for review

These decisions apply across the full assessment unless a module-specific formula states otherwise. They are current working directions, not a substitute for review. Angel still wants recommendations from Fonz, the Catalyst team, and professional reviewers before final build decisions.

| Decision area | Confirmed direction |
|---|---|
| Primary computational field | Use **averages** as the primary computational field. This keeps scoring stable if items are added after pilot. |
| Raw totals | Store raw totals internally, but do not use them as the main comparison field. |
| Percentages | Optional for facilitator-facing reports only. Do not show percentages to learners. |
| Normalized scores | Do not use until there is enough pilot data to build norms. Target at least 100 to 200 completed assessments before considering norming. |
| Likert scale consistency | Modules 1 and 3 should use the same 5-point scale and average to a 1.00 to 5.00 dimension score. |
| Module 2 scoring | Module 2 will use forced-choice scoring. Report positions on each axis rather than high/low scores. If a visual display is needed, keep it consistent with the combined report while avoiding false precision. |
| Learner-facing scores | Learners see labels and narrative only, not numeric scores. |
| Facilitator-facing scores | Facilitators may see score tables, confidence bands, flags, coaching questions, and cross-module observations. |
| Archetype pairings | Generate secondary/blended outputs dynamically from score gaps. Do not create fixed named pair types such as “Navigator-Connector” as new categories. |
| Pathway recommendations | Use Modules 1, 2, and 3 together. Learning preference should not be scored or used for pathway selection. |
| Narrative generation | Use prewritten language blocks for pilot. Consider automated synthesis only after pilot data validates the language. |
| Composite scores | Do not create one composite score across modules. |

### Learner-facing score display rule

Learners should receive labels, narrative, and optional non-numeric visuals. Numeric scores invite comparison between learners, imply false precision, and can pull learners toward score-chasing instead of reflection.

Acceptable learner-facing display:

- Primary archetype label.
- Optional secondary or blended pattern when relevant.
- Strengths-based narrative.
- Growth/support language.
- Track or pathway suggestions.
- A simple relative-strength visual without exact numbers, if needed.

Do not show learners:

- Raw totals.
- Average scores.
- Percentages.
- Normalized or norm-referenced scores.
- Technical confidence labels.

### Facilitator-facing detail rule

Facilitators should receive more detail than learners because they need to interpret results responsibly. Facilitator-facing outputs may include:

- Full score tables.
- Primary, secondary, and top-pattern scores.
- Confidence bands.
- Blended, broad-high, flat, low-confidence, and tie flags.
- Coaching questions.
- Cross-module observations.
- Program/track alignment notes.

### Uncertainty and confidence language rule

Keep operational uncertainty flags in the facilitator view. Do not show phrases like **“needs reflection”** or **“facilitator review recommended”** to learners.

Learner-facing language should describe the pattern in strengths-first developmental language:

| Technical pattern | Facilitator-facing label | Learner-facing language direction |
|---|---|---|
| Flat or low-confidence result | Low confidence primary / flat pattern | “Your strengths are still taking shape. This is normal, especially when you are exploring new environments. Beyond Code Collective coaches and instructors will help you build on what is already showing up.” |
| Broad high result | Broad high pattern | “Your responses show strengths across many areas. This often means you adapt to different situations or bring range. Beyond Code Collective coaches and instructors will help you identify where to focus first.” |
| Tie across 4 or more archetypes | Tie among 4 or more archetypes | “Your pattern is showing range across several strengths. This is a starting point for a coaching conversation, not a final picture.” |
| Close top 2 results | Blended profile | “Your results show a blended strengths pattern. More than one strength may describe how you naturally contribute.” |

Rationale: Many learners may have prior experiences of being flagged, reviewed, referred, or sorted by institutions. Operational language should not leak into learner-facing results because it can feel like failure, gatekeeping, or judgment. The learner experience should preserve the “no wrong answers” framing.

### Prewritten language block rule

Use prewritten language blocks for pilot. This provides quality control, preserves the intended voice, prevents accidental predictive or diagnostic claims, and ensures consistent outputs across learners while the team studies how the language lands.

Approximate pilot content scope:

- 80 to 120 prewritten blocks across the full system.
- Most blocks under 100 words.
- Heaviest concentration in Module 1.
- Small set of bridging blocks for the combined report so the final profile does not read like four separate reports stapled together.

After pilot, the combined synthesis layer is the first place to consider carefully constrained automatic generation. Dimension-level descriptions should remain prewritten unless the team has strong evidence that generated language is safe and accurate.

## Modules requiring output formulas

### Module 1: Archetype identity

Module 1 identifies the learner’s primary identity-oriented archetype.

Status: Initial draft created in **module_1_questions_and_output_formula.md**. This draft includes 27 items, a 5-point response scale, item-to-archetype mapping, scoring formulas, tie rules, confidence bands, and recommended output fields.

Programmer will need:

- Item-to-archetype scoring map.
- Score calculation method for each archetype.
- Tie-breaking rules.
- Rules for primary archetype, secondary archetype, or blended profile.
- Minimum score threshold, if any, for reporting an archetype.
- Output language for each archetype:
  - Navigator
  - Developer
  - Igniter
  - Connector
  - Systems Thinker
  - Culture Keeper
  - Designer
  - Support Specialist
  - Explorer
- Whether archetype pairings should appear in learner reports, facilitator reports, or both.

### Module 2: Work style scenarios

Module 2 uses hypothetical learning, tech, or workplace scenarios to identify likely behavior in context.

Status: Scenario draft created in **module_2_scenarios_and_output_formula.md**. This draft now includes 12 forced-choice scenarios, 3 per work-style dimension, plus scenario-to-pole scoring rules and pilot watch flags.

Working dimension set for review:

| Dimension | Poles | Pilot scoring plan |
|---|---|---|
| Social energy | Solo ↔ Collaborative | 3 forced-choice scenarios. |
| Structure preference | Structured ↔ Adaptive | 3 forced-choice scenarios. |
| Contribution mode | Front-facing ↔ Behind the scenes | 3 forced-choice scenarios. |
| Pace | Quick-moving ↔ Methodical | 3 forced-choice scenarios. |

Total pilot plan: 12 scenarios. This uses item budget reallocated from the former scored Module 4 and gives each axis 3 scenarios.

Core output rule: Each axis reports as a position, not a high or low score. With 3 scenarios per axis, preserve whether the result is a 3-to-0 clear lean or a 2-to-1 lighter lean. If Catalyst wants to preserve a “balanced” label, Fonz and the team should decide whether a 2-to-1 pattern displays as “balanced with a lean” or simply “leans [pole].”

Programmer will need:

- Scenario-to-dimension scoring map from **module_2_scenarios_and_output_formula.md**.
- Response option-to-pole scoring map.
- Final work-style dimensions to report.
- Whether Module 2 maps to:
  - Work-style dimensions only.
  - Archetype-adjacent patterns.
  - A hybrid model.
- Rules for interpreting close scores.
- Output language for each work-style result.
- Guidance for connecting Module 2 results back to Module 1 archetype without collapsing the two.
- Display randomization so A/B order does not train learners into selecting the same letter repeatedly.
- Pilot analytics that flag any forced-choice pair where one option is selected by more than about 75 percent of learners.

Professional review note: Module 2’s “most likely” forced-choice format is recommended because it reduces the social desirability inflation that can happen in Module 1 Likert items. Module 2 can carry response-style and behavior-in-context information that Module 1 should not carry alone.

Facilitator-facing sustainability rule: flag possible sustainability strain when 2 or more Module 2 dimensions oppose the profile of a recommended track. This is a support-planning signal, not an exclusion rule. Pace mismatch must inform support, not gatekeeping, and both poles should be treated as legitimate strengths.

Suggested automation for Fonz: consider a review-support workflow that uses the agreed source location or files provided by Fonz for the latest Module 2 scenario files and pilot watch flag notes, checks all 12 forced-choice scenarios for social desirability imbalance, flags any option that reads as smarter/kinder/more capable than its pair, and drafts specific rewrite suggestions for Angel. This should remain a suggestion only unless Angel and Fonz later approve the schedule, source location, recipients, and delivery method.

### Module 3: Motivation and pathway orientation

Module 3 identifies what keeps the learner engaged and whether they lean toward placement/role pathways, ownership/building pathways, or blended pathways.

Status: Item draft created in **module_3_items_and_output_formula.md**. This draft includes 10 Likert items: 3 for Self-direction, 3 for Stability-seeking, and 4 for Risk comfort. M3-RSK-04 is reverse-scored.

Working sub-dimension set for review:

| Sub-dimension | Meaning | Pilot scoring plan |
|---|---|---|
| Self-direction | How much the learner wants to build, own, and direct their own work. | 3 Likert items. |
| Stability-seeking | How much the learner wants reliable, predictable footing. | 3 Likert items. |
| Risk comfort | How much uncertainty the learner can sit with. | 4 Likert items. |

Total pilot plan: 10 items. Risk comfort is intentionally weighted slightly heavier because it carries major sustainability and equity implications.

Pathway orientation should be derived from these drivers, not measured separately.

Self-direction and Stability-seeking should be independent axes:

| Pattern | Derived pathway orientation |
|---|---|
| High self-direction, low stability-seeking | Ownership/building lean. |
| Low self-direction, high stability-seeking | Placement/role lean. |
| High self-direction, high stability-seeking | Blended pathway: wants ownership and stable footing. |
| Low self-direction, low stability-seeking | Still exploring; do not force pathway. |

Risk comfort modifies sustainability and support planning. It should not be used to exclude learners from ownership/building pathways.

Two Module 3 output rules should be explicit:

1. Stability-seeking is never a verdict on ownership capacity, and it is never permanent.
2. A learner who needs stability now may build later once they have more foundation under them.

Programmer will need:

- Motivation dimensions and item mapping from **module_3_items_and_output_formula.md**.
- Score calculation for each motivation driver.
- Pathway orientation formula:
  - Job placement orientation.
  - Ownership/building orientation.
  - Blended orientation.
- How to handle learners who score high across multiple motivation drivers.
- Output language for:
  - Autonomy
  - Stability
  - Ownership
  - Risk comfort
  - Ownership/building drive
  - Security
  - Other confirmed motivation dimensions
- Rules for combining motivation results with pathway recommendations.
- Final threshold rules for High, Moderate, and Low sub-dimension scores.
- Reverse-scoring rule for M3-RSK-04.
- Pilot analytics for the M3-RSK-01 / M3-RSK-02 split, M3-RSK-04 sustained-uncertainty strain, and possible M3-SDR-03 correlation with Module 1.

Professional review note: the earlier 6 to 8 item budget was enough only if Module 3 surfaced 2 or 3 motivation sub-dimensions at most. The current 10-item plan still keeps Module 3 to 3 sub-dimensions and uses the added item budget to strengthen Risk comfort rather than adding more constructs.

Equity guardrail: Risk comfort and Stability-seeking are shaped by material circumstance. Items must separate what a learner wants and what gives them energy from what they can currently afford, access, or risk. Learner-facing language should not use “entrepreneur” as the primary term; use building your own thing, ownership, running your own work, or shaping direction.

### Learning support and universal design practice

The former Module 4 should not be programmed as a scored learning preference module. The evidence does not support the claim that matching instruction to a learner’s preferred channel improves learning outcomes.

Fonz may still need to support a non-scored practice or resource layer:

- Optional one-page learner self-advocacy handout.
- Facilitator prompts for varied resources and peer exchange.
- Program-level checklist showing whether each track offers multiple ways into content.
- No scored learning-style output.
- No pathway recommendation logic based on learning preference.
- No claim that teaching to a preferred style improves outcomes.

Catalyst team review note: The team should confirm that varied resources and structured peer exchange can actually be delivered across programs. This is a program design commitment, not a learner assessment score.

## Cross-module output logic needed

The programmer will also need rules for combining module results into one learner report.

Angel should provide:

- Whether each module produces a standalone output or contributes to a combined profile.
- Priority order of modules in the report.
- Whether Module 1 archetype is the main organizing result.
- How Module 2 work style should modify or add nuance to Module 1.
- How Module 3 motivation/pathway orientation should influence tech pathway recommendations.
- How the universal design practice layer should appear in facilitator resources, if at all.
- Whether results should be different for:
  - Learner-facing report.
  - Facilitator-facing report.
  - Coach/advisor-facing report.
  - Program-level aggregate data.

## Report architecture rule

Angel direction: use a **hybrid report architecture**.

### Data layer

Each module must produce its own scored output independently:

- Module 1: Archetype identity.
- Module 2: Work style scenarios.
- Module 3: Motivation and pathway orientation.
- Learning support/universal design practice layer, if implemented as a non-scored support resource.

This is non-negotiable for pilot flexibility. The team needs to be able to revise Module 2 scenarios or Module 3 motivation items without rewriting the entire report system every time.

### Learner-facing output

Learners should not see module-by-module results during intake. They should complete all three scored modules and then see one combined profile.

This prevents learners from over-focusing on Module 1 archetype as “the answer.” Archetype should appear as one part of a broader strengths, motivation, learning support, and pathway picture.

### Results release rule

After all three scored modules are complete, release the combined reflection profile to the learner immediately. Do not require facilitator review before the learner can see their reflection results.

Facilitator review should gate:

- Final placement decisions.
- Program access decisions.
- Resource allocation decisions.
- High-stakes pathway confirmation.

Facilitator review should not gate:

- The learner’s access to their own reflection profile.
- Strengths-based archetype, work style, or motivation results.
- Developmental next-step language.

If a learner completes the intake outside facilitator working hours, release the reflection profile immediately and queue facilitator outreach for the next business day.

### Facilitator-facing output

Facilitators should get both:

1. The combined profile as the main coaching and placement document.
2. Drill-down module outputs for interpretation, coaching, and quality review.

### Sequencing rule

Build and pilot module-level scoring first. Build the combined report logic last, after the modules are stable enough to synthesize.

If Module 1 is piloted before the full tool exists, use a temporary facilitator-only output and label it clearly as a single-module check, not the final learner profile.

### Hard constraints

The combined report should not:

- Produce a single composite score across modules.
- Predict outcomes or job success.
- Collapse the four dimensions into one “type.”
- Present the learner as a single label.
- Overwhelm the learner with a wall of text.

Recommended interface pattern: progressive disclosure with a short summary view at the top and expandable or clearly separated sections for each dimension.

### Intake completion message

Instead of showing partial results after each module, show completion signals only:

```text
You have completed Module 1 of 3. Your full profile will be ready after all three sections are complete.
```

## Intake completion rule

Angel direction: use a **single full required intake** model.

Learners should complete all required modules as one intake experience. Although staging may reduce fatigue, Catalyst is a rigorous tech training environment with significant investment per student, so the full assessment should be completed before final pathway recommendations, training track matches, or coaching recommendations are generated.

### Intake module order

Working order for review:

1. Module 1: Archetype identity.
2. Module 2: Work style scenarios.
3. Module 3: Motivation and pathway orientation.
4. Profile loading.

Rationale:

- Module 1 establishes the identity anchor.
- Module 2 provides a format break after Likert items through forced-choice scenarios.
- Module 3 builds naturally after identity and behavior reflection.
- The combined profile loads after Module 3.

Programming implications:

- Design the full intake to stay within the recommended 10 to 15 minute completion range.
- Track module completion status separately for data quality and error handling.
- If a learner exits early, store partial results but mark them as incomplete.
- Do not generate final combined reports until all required modules are complete.
- If incomplete results are visible to facilitators, label them clearly as incomplete.
- Do not use incomplete assessments for final training track alignment.
- Present Module 1 in two visual sections while scoring it as one module.
- Do not include an unscored warm-up question before Module 1.
- Trigger learner-facing combined profile generation immediately after all required modules are complete.
- Trigger facilitator completion notification at the same time.
- Allow placement recommendations to be generated as draft/review status, not auto-assigned.

### Intake transition copy

Use these learner-facing messages between sections:

| Moment | Message |
|---|---|
| Mid Module 1 | That’s the first half of Module 1. The next set is loading now. |
| After Module 1 | That’s Module 1. Module 2 is loading now. The format shifts to short scenarios. |
| After Module 2 | That’s Module 2. Module 3 is loading now. |
| After Module 3 | That’s all three modules. Your profile is loading now. |

## Suggested formula documentation format

For each module, provide the programmer with a table like this:

| Item ID | Item text | Response option | Score value | Dimension/archetype | Notes |
|---|---|---|---|---|---|
| M1-Q01 | Placeholder item text | Strongly agree | 5 | Navigator | Example only |
| M1-Q01 | Placeholder item text | Agree | 4 | Navigator | Example only |
| M1-Q01 | Placeholder item text | Neutral | 3 | Navigator | Example only |
| M1-Q01 | Placeholder item text | Disagree | 2 | Navigator | Example only |
| M1-Q01 | Placeholder item text | Strongly disagree | 1 | Navigator | Example only |

Then provide an output rule like this:

```text
Navigator score = sum or average of all Navigator-coded items.
Primary archetype = highest archetype score.
Secondary archetype = second-highest archetype score if within [X] points of primary.
If two or more archetypes tie, use [tie-breaking rule].
```

## Open decisions for Angel

- Should outputs use raw totals, averages, percentages, or normalized scores?
- Should each module use the same scoring scale?
- Should the learner see numeric scores, labels only, or both?
- Should the facilitator see more detail than the learner?
- Should archetype pairings be automatically generated?
- Should pathway recommendations be based only on Module 1, or should Modules 2 and 3 influence them?
- Should low-confidence or tied results trigger a “needs reflection” output?
- Should the system generate a narrative report automatically or pull from prewritten language blocks?

## Recommended next step

Create one scoring/output formula table per scored module before programming begins. The programmer should not finalize report automation until all three scored module formula tables, the universal design practice decision, and cross-module output rules are approved.
