# Catalyst Programmer Handoff Decision Packet

## Purpose

This packet is designed to help Angel and Fonz prepare the most complete possible version of the Catalyst learner pathway alignment tool to bring to the greater Catalyst team. Fonz is the person coding the tool.

For the deeper methodology and rationale behind these working directions, see **catalyst_assessment_master_methodology_and_rationale.md**.

The goal is to move task by task through the framework and identify:

- What is already drafted.
- What Angel and Fonz need input on.
- What Fonz needs for implementation.
- What should be taken to the Catalyst team.
- What should be taken to professional input, including the suggested PhD reviewers:
  - A PhD who leads large-scale transformation of learning systems across higher education.
  - A PhD who specializes in functional behavioral assessments.

## Decision status key

Use this status system for every open item:

| Status | Meaning |
|---|---|
| Ready for programmer | Angel can provide the decision now. |
| Needs Catalyst input | The decision affects team strategy, operations, program design, or stakeholder alignment. |
| Needs professional input | The decision affects assessment quality, behavioral interpretation, validation language, scoring defensibility, or learner risk. |
| Defer until pilot | The decision should be tested with learner data before finalizing. |
| Not needed for v1 | The decision can wait until a later version. |

## Task 1: Overall assessment architecture

### What exists now

The framework currently has 3 scored assessment modules, a non-scored universal design practice layer, and a separate Program and Partner Track Alignment Layer.

- Module 1: Archetype identity
- Module 2: Work style scenarios
- Module 3: Motivation and pathway orientation
- Learning support and universal design practice layer: former Module 4, now non-scored
- Alignment Layer: Program and partner training track matches

Professional review update: The core scored dimensions are well separated. Module 1 can stay focused on identity-oriented strengths because Module 2 captures response style and Module 3 captures investment/motivation. The former Module 4 should move out of scored assessment because the evidence does not support matching instruction to learning-style preference as a way to improve outcomes.

### Decisions Angel and Fonz need input on

| Decision | Recommended status | Notes |
|---|---|---|
| Confirm that program/partner tracks are not Module 5. | Ready for programmer | **Decision made by Angel:** keep program/partner tracks as an alignment layer, not an assessment module. |
| Confirm the order learners experience the scored modules. | Working direction for review | **Angel recommendation:** Module 1, then Module 2, then Module 3, then profile loading. |
| Decide whether learners complete all modules at once or in stages. | Needs Catalyst input | **Angel direction:** do not stage modules for v1. Although staging may reduce fatigue, Catalyst is rigorous tech training with significant student investment, so learners should complete the full assessment as one required intake before final training track placement or coaching recommendations. |
| Decide whether results are shown immediately or after facilitator review. | Working direction for review | **Angel recommendation:** show the combined reflection profile immediately after all 3 scored modules are complete. Facilitator review should gate placement decisions, not the learner’s access to their own reflection results. |
| Decide whether the system creates one combined report or separate module reports. | Ready for programmer | **Decision made:** hybrid architecture. Build module-level scoring as the underlying data architecture, then layer one combined report on top as the primary learner-facing and facilitator-facing output. |

### Fonz needs for implementation

- Confirmed module order.
- Whether each module is required or optional.
- Whether learners can save and resume.
- Whether results are displayed immediately.
- Whether reports are generated for learners, facilitators, coaches, and/or administrators.
- Module-level scored outputs at the data layer.
- Combined report logic as a synthesis layer after module scoring is stable.

### Recommended module order

Use the numerical order as the learner experience order:

1. **Module 1: Archetype identity**
2. **Module 2: Work style scenarios**
3. **Module 3: Motivation and pathway orientation**
4. **Profile loading**

Rationale:

- **Module 1 anchors identity:** It begins with the core reflection question: “Who am I across contexts?” Starting with identity gives the rest of the intake a reflective foundation.
- **Module 2 creates a format break:** After 27 Likert items, forced-choice scenarios offer a change of pace and function as a fatigue reset.
- **Module 3 builds on identity and behavior:** Motivation lands better after learners have already reflected on who they are and how they tend to respond in realistic situations.
- **Profile loading closes the intake:** The former Module 4 becomes a non-scored universal design practice and should not extend the scored intake.

### Module 1 fatigue mitigation

Module 1 is the longest module at 27 items. Keep it first, but reduce perceived length through interface design:

1. Present Module 1 in **two visual sections**, roughly items 1-14 and 15-27.
2. Score both sections as one Module 1 construct set.
3. Do not add an unscored warm-up question before Module 1.

The visual section break inside Module 1 is enough to manage perceived length. Trusting the learner to begin directly is more aligned with the rest of the tool.

### Intake transition messages

Use short transition messages between sections instead of partial results.

| Moment | Learner-facing message |
|---|---|
| Mid Module 1 | That’s the first half of Module 1. The next set is loading now. |
| After Module 1, entering Module 2 | That’s Module 1. Module 2 is loading now. The format shifts to short scenarios. |
| After Module 2, entering Module 3 | That’s Module 2. Module 3 is loading now. |
| After Module 3, loading profile | That’s all three modules. Your profile is loading now. |

### Recommended intake flow based on Angel direction

Use a **single full required intake** model:

1. Learners should complete all required modules as part of one intake experience.
2. The assessment should be designed to stay within the realistic 10 to 15 minute completion range.
3. Module-level completion can still be tracked internally for data quality and error handling.
4. Final pathway or training track recommendations should not be generated until the full intake is complete.
5. If a learner exits early, results should be saved as incomplete and not used for final placement guidance.

Rationale: Staging may reduce fatigue, but Catalyst is rigorous tech training with significant investment in each student. The team needs the full learner profile before making final track-alignment or coaching decisions.

### Report architecture decision

Use a **hybrid report architecture**:

1. Each module produces its own scored output at the data layer.
2. Learners do not see module-by-module results during intake.
3. Learners complete all 3 scored modules and then receive one combined profile.
4. The combined learner profile should present archetype as one part of a broader strengths and pathway picture, not as “the answer.”
5. Facilitators get both views:
   - The combined profile as the working document for coaching and placement conversations.
   - Individual module outputs for drill-down when a learner asks why they received a result or when a coach wants to explore one dimension.
6. For Catalyst placement, use the combined profile because high-investment training track decisions need cross-module signal, not archetype alone.

Do not build the final combined report logic until the modules are stable enough after pilot review. Build the modules first, validate or revise them through pilot data, then build the combined report as the synthesis layer.

The combined report should not:

- Produce a single composite score across modules.
- Predict job success or training outcomes.
- Collapse the four dimensions into one “type.”
- Present the learner as a single label.
- Drop a wall of text on the learner.

Use progressive disclosure:

- Short summary view at the top.
- Expandable or clearly separated sections for each dimension.
- Facilitator drill-down available behind the combined profile.

Pilot exception:

If Module 1 is piloted before Modules 2-4 are complete, use a temporary facilitator-only Module 1 output. Label it clearly as a single-module check, not the full learner profile, and do not repurpose it as the final learner-facing experience.

During intake, if learner engagement is a concern, show completion signals without partial results:

> You have completed Module 1 of 3. Your full profile will be ready after all three sections are complete.

### Results release and facilitator review rule

Working direction for review: **release reflection results immediately; review placement decisions before finalizing.**

Workflow:

1. Learner completes all 3 scored modules in one intake.
2. Learner immediately sees their combined reflection profile:
   - Archetype identity.
   - Work style pattern.
   - Motivation/pathway orientation.
   - Optional learning support/self-advocacy resources, if Catalyst chooses to show them outside the scored profile.
   - Strengths-based next-step framing.
3. Facilitator receives a completion notification and access to the facilitator-facing report.
4. Beyond Code Collective coaches and instructors reach out for a coaching conversation within a defined window. Suggested window: **5 to 7 business days**.
5. If the learner is being considered for Catalyst or another high-stakes placement, the system may generate a placement recommendation but should not auto-assign the learner.
6. Placement or resource decisions are confirmed by a facilitator after the coaching conversation.

Rationale:

- The reflection profile is the learner’s self-knowledge and should not be withheld.
- Facilitator review should gate decisions about program access, placement, and resources, not access to reflection results.
- Immediate access communicates trust and prevents a power imbalance where staff see the learner’s profile before the learner does.
- Delayed release can recreate the experience of being surveilled, flagged, or reviewed by systems that did not serve the learner.
- Facilitator bottlenecks should not break the feedback loop after a learner completes a 10 to 15 minute intake.

Operational rule:

If a learner completes the intake outside facilitator working hours, the system should still release the reflection profile immediately. Coaching outreach can happen the next business day, but reflection results should not wait for facilitator availability.

### Item count guidance

The current total scored assessment count is **49 items**: 27 Module 1 items, 12 Module 2 scenarios, and 10 Module 3 items. This stays inside the **47 to 49 item** target for 18 to 24 year old learners and should likely fit a **10 to 15 minute** completion window. Avoid expanding beyond 60 items unless the team intentionally redesigns the intake experience, because drop-off may increase.

## Task 2: Module 1 archetype questions and output formula

### What exists now

Initial draft created in: **module_1_questions_and_output_formula.md**

The draft includes:

- 9 tech-forward archetypes.
- 27 total items.
- 3 items per archetype.
- 5-point Likert response scale.
- Raw score, average score, and optional percentage score formulas.
- Primary, secondary, blended, confidence, and tie rules.

### Decisions Angel and Fonz need input on

| Decision | Recommended status | Notes |
|---|---|---|
| Approve the 9 archetype names. | Ready for programmer or Needs Catalyst input | Current names: Navigator, Developer, Igniter, Connector, Systems Thinker, Culture Keeper, Designer, Support Specialist, Explorer. |
| Approve the 27 item statements. | Needs professional input | Item wording affects measurement quality and should be reviewed. |
| Confirm the 5-point response scale. | Needs professional input | Especially important if the tool may later claim reliability or validity. |
| Decide whether to show numeric scores to learners. | Needs Catalyst input | Current recommendation: do not show full numeric scores to learners by default. |
| Decide whether learners can receive a blended archetype. | Ready for programmer | Current recommendation: yes. |
| Approve confidence bands and tie rules. | Needs professional input | These affect interpretation and should be reviewed. |
| Decide whether secondary archetype appears in learner report. | Needs Catalyst input | Could show only if scores are close. |

### Fonz needs for implementation

- Final item list.
- Item IDs.
- Response scale.
- Scoring thresholds.
- Tie and blended-profile logic.
- Output fields.
- Report copy for each archetype.
- Version number for scoring model.

### Professional review flag

This task should be reviewed by the PhD with functional behavioral assessment expertise because item wording, self-report limitations, scoring thresholds, confidence bands, and interpretation rules affect assessment quality.

## Task 3: Module 2 workplace scenario questions and formula

### What exists now

Module 2 is conceptually defined, the work-style dimensions have been collapsed into a 4-axis working set, and a 12-scenario pilot draft now exists in **module_2_scenarios_and_output_formula.md**.

Current direction:

- Use hypothetical learning, tech, and workplace scenarios.
- Ask learners what they are most likely to do.
- Measure likely behavior in context rather than self-identity.
- Score 4 work-style dimensions:
  - Social energy: Solo ↔ Collaborative.
  - Structure preference: Structured ↔ Adaptive.
  - Contribution mode: Front-facing ↔ Behind the scenes.
  - Pace: Quick-moving ↔ Methodical.

Professional review update: The “most likely” forced-choice format is a strong design choice because it counterbalances Module 1’s Likert scale. Forced choice can reduce social desirability inflation because learners must choose the response that fits best instead of agreeing with every positive statement.

Pilot budget update: 4 dimensions at 3 scenarios each equals 12 scenarios total. This uses item budget reallocated from the former scored Module 4 and strengthens the signal for each axis.

Forced-choice balance rule: both response options in each scenario must read as equally legitimate and capable. If one option sounds smarter, kinder, cooler, more mature, or more employable, the item should be revised before pilot.

### Decisions Angel and Fonz need input on

| Decision | Recommended status | Notes |
|---|---|---|
| Confirm the final work-style dimensions. | Working direction for review | Current working set: Social energy, Structure preference, Contribution mode, and Pace. |
| Decide how many scenarios Module 2 should include. | Working direction for review | Current recommendation: 12 scenarios total, 3 per dimension. |
| Review the 12 drafted scenario pairs for balance. | Needs professional input | Current draft uses 2-option forced choice. Reviewers should check whether either option reads as the “right” answer. |
| Decide whether Module 2 maps to work-style only or also archetype-adjacent patterns. | Needs professional input and Catalyst input | This is a core framework decision. |
| Decide whether Module 2 can modify Module 1 report language. | Needs Catalyst input | Example: Navigator identity with behind-the-scenes work style. |
| Decide how scenario outputs appear to learners. | Needs Catalyst input | Labels should be useful, not confusing. |

### Fonz needs for implementation

- Scenario list.
- Response options.
- Response-to-dimension scoring map.
- Response-to-pole scoring map.
- Dimension names.
- Output formula.
- Tie rules.
- How Module 2 connects to Module 1.
- Learner-facing and facilitator-facing result language.
- Display randomization for option order.
- Pilot analytics for option balance and redundancy.

### Suggested Module 2 review-support automation for Fonz

Angel does not want this created as an active weekday task right now. This should be treated as a possible implementation suggestion for Fonz.

Potential feature:

1. Use the agreed source location or files provided by Fonz for the latest Module 2 scenario file and pilot watch flag notes.
2. Run a social desirability balance check across the 12 forced-choice scenarios.
3. Flag any option that may read as smarter, kinder, more capable, more mature, more employable, or more tech-ready than its paired option.
4. Suggest concrete rewrites for at-risk pairs.
5. Produce a short review brief for Angel before she reviews the items.

Guardrails:

- Do not auto-finalize item language.
- Do not replace professional review.
- Do not send automated emails unless Angel and Fonz later approve the schedule, source location, recipients, and email behavior.
- Treat this as review support for Angel and Fonz, not as an assessment validation process.

### Module 2 output formula summary

Each option maps to one pole of its dimension. Across the 3 scenarios for each axis:

| Response pattern | Axis output |
|---|---|
| Same pole selected 3 times | Leans that pole, clear 3-to-0 signal |
| One pole selected twice and the other once | Leans toward the 2-selection pole, lighter 2-to-1 signal |

Report the result as a position, not a high or low score. For example: **Leans Collaborative** or **Leans Solo**, with the data layer preserving whether it is a clean sweep or a 2-to-1 lean. If Catalyst wants to preserve “Balanced,” Fonz and the team need a display rule because 3 binary scenarios do not produce a true tie.

### Professional review flag

This task should be reviewed by both PhD advisors. The functional behavioral assessment expert can review whether the scenarios reasonably capture behavior patterns. The higher education learning systems expert can review whether the scenarios are appropriate for learners and training pathway decisions.

## Task 4: Module 3 motivation and pathway orientation formula

### What exists now

Module 3 is conceptually defined, the motivation sub-dimensions have been collapsed into a 3-driver working set, and a 10-item pilot draft now exists in **module_3_items_and_output_formula.md**.

It should identify what keeps the learner engaged and derive whether they lean toward:

- Job placement orientation.
- Ownership/building orientation.
- Blended orientation.

Working motivation sub-dimensions:

- Self-direction: how much the learner wants to build, own, and direct their own work.
- Stability-seeking: how much the learner wants reliable, predictable footing.
- Risk comfort: how much uncertainty the learner can sit with.

Professional review update: the earlier 6 to 8 item budget was enough only if Module 3 was limited to 2 or 3 motivation sub-dimensions. The current 10-item plan still keeps Module 3 to 3 sub-dimensions and uses the added item budget to strengthen Risk comfort rather than adding more constructs.

Pilot budget update: 10 items total, with 3 items for Self-direction, 3 items for Stability-seeking, and 4 items for Risk comfort. Risk comfort is weighted slightly heavier because it is the most consequential sustainability modifier.

Item draft update: 9 items are forward-scored on the same 5-point Likert scale. M3-RSK-04 is reverse-scored, so agreement counts toward lower Risk comfort.

### Decisions Angel and Fonz need input on

| Decision | Recommended status | Notes |
|---|---|---|
| Confirm the final motivation dimensions. | Working direction for review | Current working set: Self-direction, Stability-seeking, and Risk comfort. |
| Review the 10 drafted Module 3 items. | Needs professional input | Review for construct clarity, equity risk, social desirability, reverse-scoring clarity, and whether the language separates aspiration from current circumstance. |
| Decide whether pathway orientation is a separate score or derived from motivation drivers. | Working direction for review | Current recommendation: derive pathway orientation from the 3 motivation drivers. Do not measure separately. |
| Decide how to distinguish job placement, ownership/building, and blended orientation. | Working direction for review | Use Self-direction and Stability-seeking as independent axes, with Risk comfort as a sustainability modifier. |
| Decide what ownership/building language should be used with learners. | Working direction for review | Do not use “entrepreneur” as the main learner-facing term. Use building your own thing, ownership, running your own work, or shaping direction. |
| Decide how Module 3 influences program recommendations. | Needs Catalyst input | Important for Training Track Matches. |

### Fonz needs for implementation

- Item list.
- Motivation dimension map.
- Formula for each motivation driver.
- Formula for pathway orientation.
- Rules for blended pathway orientation.
- Output language.
- Connection rules to program/partner tracks.
- Final threshold rules for High, Moderate, and Low.
- Reverse-scoring rule for M3-RSK-04.
- Pilot analytics for the M3-RSK-01 / M3-RSK-02 split, M3-RSK-04 sustained-uncertainty strain, and potential M3-SDR-03 correlation with Module 1.

### Module 3 output formula summary

Use averages as the primary computational field. Nine items are forward-scored on the 5-point Likert scale, and M3-RSK-04 is reverse-scored:

```text
Self-direction = average(M3-SDR-01, M3-SDR-02, M3-SDR-03)
Stability-seeking = average(M3-STB-01, M3-STB-02, M3-STB-03)
Risk comfort = average(M3-RSK-01, M3-RSK-02, M3-RSK-03, reverse(M3-RSK-04))
```

Pathway orientation is derived from Self-direction and Stability-seeking:

| Pattern | Derived orientation |
|---|---|
| High Self-direction, low Stability-seeking | Ownership/building lean |
| Low Self-direction, high Stability-seeking | Placement/role lean |
| High Self-direction, high Stability-seeking | Blended pathway |
| Low Self-direction, low Stability-seeking | Still exploring |

Risk comfort modifies sustainability and support planning, not direction.

### Professional review flag

This task should be reviewed professionally because motivation, autonomy, risk comfort, security, and ownership/building drive can be interpreted differently across learners, cultures, financial realities, and life circumstances.

## Task 5: Learning support and universal design practice

### What exists now

The former scored Module 4 has been reallocated to a non-scored universal design practice layer.

The learning styles claim that matching instruction to a learner’s preferred channel improves learning outcomes is not supported strongly enough to use as scored assessment logic. The safer and more evidence-aligned direction is to provide varied resources and structured peer exchange to every learner.

Current supporting note: **module_4_reallocation_to_universal_design_practice.md**

### Decisions Angel and Fonz need input on

| Decision | Recommended status | Notes |
|---|---|---|
| Confirm that learning preference is no longer a scored module. | Needs Catalyst input | This changes how the tool is presented to Catalyst and funders. |
| Decide whether to create a non-scored learner self-advocacy handout. | Needs Catalyst input | Preserves the affirming value without making unsupported learning-style claims. |
| Decide how facilitators will deliver varied resources and peer exchange. | Needs Catalyst input | This is a program capacity and practice question. |
| Decide whether the portal needs a universal design checklist or resource section. | Needs programmer and Catalyst input | Could support program consistency without scoring learners. |
| Decide what language is allowed around learning preferences. | Needs professional input | Avoid “teach to your style and you will learn better.” |

### Fonz needs for implementation

- Whether to remove Module 4 from the scored intake flow.
- Whether to archive any drafted learning preference items as coaching prompts.
- Whether to build a non-scored self-advocacy resource.
- Whether to add a program-level universal design checklist.
- Updated intake progress logic showing 3 scored modules, not 4.
- Updated report logic excluding scored learning-style results.

### Professional review flag

This should be reviewed by the higher education learning systems PhD because learning preference language can easily be misused. The core claim should be that Catalyst offers multiple ways into content for everyone, not that learners must be diagnosed by style before instruction can be effective.

## Task 6: Program and Partner Track Alignment Layer

### What exists now

Programming note created in: **programming_note_program_partner_track_alignment.md**

This layer connects assessment outputs to actual Catalyst programs, partner programs, and training tracks.

Current portal section appears to be **Programs Overview**.

Example track categories visible or discussed:

- Cyber.
- Cloud.
- Data & AI.
- AI Fundamentals.
- AI & Workflow.
- Salesforce/HubSpot.
- Community programming.

### Decisions Angel and Fonz need input on

| Decision | Recommended status | Notes |
|---|---|---|
| Confirm source of truth for program data. | Needs programmer input | Could be portal database, internal admin table, structured export, or another system Fonz identifies. Do not assume Google Drive as a source. |
| Decide whether learners see specific programs or only track categories. | Needs Catalyst input | Specific programs may change often. |
| Decide whether planned or partner-contingent programs appear to learners. | Needs Catalyst input | Could create confusion if not available. |
| Decide whether matching is automatic or coach-reviewed. | Needs Catalyst input | High-stakes recommendations should likely include review. |
| Decide what makes a program a strong, possible, or future match. | Needs Catalyst input and professional input | Needs transparent criteria. |
| Decide how eligibility, location, funding, timeline, and capacity affect recommendations. | Needs Catalyst input | Operationally important. |

### Fonz needs for implementation

- Program data source.
- Program fields.
- Track taxonomy.
- Program status rules.
- Matching criteria.
- Recommendation output format.
- Monthly update process.

### Catalyst review flag

This task should go to the Catalyst team because it affects operations, partner relationships, funding, program visibility, learner expectations, and facilitator workflows.

## Task 7: Monthly update workflow

### What exists now

Programming note created in: **programming_note_monthly_archetype_template_refresh.md**

The monthly workflow should refresh:

- Latest Module 1 Archetype Report Template.
- Current and future-facing pathway language.
- BLS and World Economic Forum data.
- Program and partner track alignment.
- Program status, location, funding, capacity, and timelines.

### Decisions Angel and Fonz need input on

| Decision | Recommended status | Notes |
|---|---|---|
| Choose monthly schedule. | Needs Catalyst input | Depends on team review rhythm. |
| Decide whether updates overwrite or create dated versions. | Needs programmer and Catalyst input | Version history is important. |
| Decide whether automation can save directly or requires human review. | Needs Catalyst input | Recommended: human review for v1. |
| Decide whether Angel gets notified after each update. | Ready for programmer | Recommended: yes. |
| Decide which sources are approved beyond BLS and WEF. | Needs Catalyst input | Avoid weak or inconsistent sources. |
| Decide what happens if data is missing or source access fails. | Needs programmer input | Needs error handling. |

### Fonz needs for implementation

- Source system, database location, or structured export location.
- File naming rules.
- Update schedule.
- Source list.
- Write-back permissions.
- Notification preference.
- Versioning rules.

## Task 8: Report outputs and audiences

### What exists now

The framework needs different outputs for different users.

Potential audiences:

- Learner.
- Facilitator.
- Coach/advisor.
- Administrator/program team.
- Partner or funder, likely aggregate only.

Professional review update: “Likely friction points” can be useful, but learner-facing language must remain strengths-first. A learner should read friction language as “here is where I may need support,” not as a weakness, deficit, or reason for self-doubt.

### Decisions Angel and Fonz need input on

| Decision | Recommended status | Notes |
|---|---|---|
| Decide what learners see. | Needs Catalyst input | Should be empowering and not too technical. |
| Decide what facilitators see. | Needs Catalyst input | Can include scores, flags, and coaching notes. |
| Decide what coaches/advisors see. | Needs Catalyst input | May include program recommendations and follow-up questions. |
| Decide what administrators see. | Needs Catalyst input | Could include aggregate trends. |
| Decide whether partners/funders see individual-level data. | Needs Catalyst input and legal/privacy review | Be careful with learner privacy. |
| Decide whether reports are generated as portal pages, PDFs, dashboard views, downloadable files, or all of these. | Needs programmer input and Catalyst input | Impacts build scope. |

### Fonz needs for implementation

- Output formats.
- Role-based access rules.
- Report sections by audience.
- Data privacy rules.
- Export/download requirements.
- Storage and retention requirements.

### Professional review flag

Any learner-facing interpretation should be reviewed to make sure the language is empowering, accurate, non-deterministic, and not used as a gatekeeping tool.

## Task 9: Data privacy, consent, and ethical use

### What exists now

This has not yet been fully defined, but it is important before implementation.

### Decisions Angel and Fonz need input on

| Decision | Recommended status | Notes |
|---|---|---|
| Decide what consent language learners see before taking the tool. | Needs professional input and possibly legal review | Important for trust and compliance. |
| Decide who can access individual learner results. | Needs Catalyst input | Role-based access required. |
| Decide how long assessment results are stored. | Needs Catalyst input | Data retention policy needed. |
| Decide whether learners can request deletion or correction. | Needs Catalyst input and legal/privacy review | Important if collecting identifiable data. |
| Decide whether results can be used for placement decisions. | Needs professional input and Catalyst input | Avoid harmful gatekeeping. |
| Decide whether results can be used for aggregate program design. | Needs Catalyst input | Likely yes, with privacy controls. |

### Fonz needs for implementation

- Consent text.
- Privacy rules.
- Access roles.
- Data retention rules.
- Export/deletion rules.
- Audit log requirements.

## Task 10: Pilot testing and validation plan

### What exists now

The tool is being designed as a structured self-report and pathway alignment tool, not yet a validated assessment.

### Decisions Angel and Fonz need input on

| Decision | Recommended status | Notes |
|---|---|---|
| Decide how many learners should pilot the tool before launch. | Needs professional input | Needed for basic reliability review. |
| Decide what feedback to collect after learners take it. | Needs professional input | Should include clarity, accuracy, usefulness, and emotional response. |
| Decide what facilitator feedback to collect. | Needs Catalyst input | Facilitators can identify confusing or unhelpful outputs. |
| Decide what data will be used to revise questions. | Needs professional input | Avoid revising only based on vibes. |
| Decide what claims the team can make after pilot. | Needs professional input | Important for credibility. |

### Fonz needs for implementation

- Pilot mode flag.
- Feedback collection form.
- Version tracking.
- Retake handling.
- Analytics dashboard or export.

### Professional review flag

This should go to both PhD advisors. The functional behavioral assessment expert can advise on measurement and interpretation. The higher education learning systems expert can advise on implementation, learner experience, and system-level usefulness.

## Recommended next working order

Use this order to prepare the programmer handoff:

1. Confirm the overall architecture.
2. Finalize Module 1 questions and scoring.
3. Review Module 2 scenarios and scoring.
4. Draft Module 3 motivation/pathway scoring.
5. Confirm the universal design practice layer that replaces scored Module 4.
6. Define report audiences and outputs.
7. Define Program and Partner Track Alignment Layer.
8. Define monthly update workflow.
9. Define privacy, consent, and ethical use rules.
10. Define pilot testing and review plan.

## Immediate next decisions for Angel

Start with these:

| Question | Suggested owner |
|---|---|
| Are the 9 archetype names final enough for v1? | Angel + Catalyst team |
| Are the 27 Module 1 items ready for professional review? | Angel |
| Should learners see only their primary archetype or primary plus secondary when close? | Angel + Catalyst team |
| Should blended results be allowed? | Angel |
| Should Module 2 measure work style only, or work style plus archetype-adjacent patterns? | Professional input |
| Should program matches be automatic or coach-reviewed? | Catalyst team |
| Should planned and partner-contingent programs be visible to learners? | Catalyst team |
| Who can access individual learner results? | Catalyst team + privacy/legal review |

## Working scoring and reporting decisions for review

These decisions are current working directions for the programmer handoff. Angel still wants recommendations and review from Fonz, the Catalyst team, and professional reviewers before final build decisions.

| Question | Decision |
|---|---|
| Should outputs use raw totals, averages, percentages, or normalized scores? | Use averages as the primary computational field. Store raw totals internally. Optional percentages may appear in facilitator-facing reports only. Do not use normalized scores until at least 100 to 200 completed assessments are available. |
| Should each module use the same scoring scale? | Yes for Likert Modules 1 and 3: use the same 5-point scale and average to 1.00 to 5.00 dimension scores. Module 2 uses forced choice and should report axis positions, preserving 3-to-0 versus 2-to-1 signal strength. |
| Should learners see numeric scores, labels only, or both? | Learners see labels and narrative only. No numeric scores. A simple non-numeric relative-strength visual is acceptable. |
| Should facilitators see more detail than learners? | Yes. Facilitators need score tables, confidence bands, flags, coaching questions, and cross-module observations. |
| Should archetype pairings be automatically generated? | Yes for secondary and blended outputs using gap rules. No fixed named pair types such as “Navigator-Connector.” Generate combinations dynamically and describe them naturally. |
| Should pathway recommendations be based only on Module 1? | No. Pathway recommendations should use Modules 1, 2, and 3 together. Learning preference should not be scored or used for pathway selection. Facilitators should review and confirm Catalyst placement recommendations. |
| Should low-confidence or tied results trigger a flag? | Yes in the facilitator view. Do not show “needs reflection” or “facilitator review recommended” to learners. Learner-facing language should be strengths-first and developmental. |
| Should the system generate narrative reports automatically or use prewritten blocks? | Use prewritten language blocks for pilot. Consider automatic generation only after pilot data validates the language, and only first in the synthesis layer. |

## Next content blockers before programming

The mechanical scoring/reporting decisions above are now clear. Module 2 and Module 3 now have first drafts, so the remaining blockers are review, threshold decisions, and Catalyst confirmation of the universal design practice layer.

| Blocker | Why it matters | Recommended next action |
|---|---|---|
| Module 2 work-style scenarios | The forced-choice scenarios now need review for balance, construct fit, and pilot readiness. | Scenario draft created in **module_2_scenarios_and_output_formula.md**. Next step is item-by-item review before professional review. |
| Module 3 motivation items | The item language needs review for construct clarity, equity risk, social desirability, and separation of aspiration from circumstance. | Item draft created in **module_3_items_and_output_formula.md**. Next step is item-by-item review and threshold discussion before professional review. |
| Universal design practice layer | The former Module 4 is no longer scored, but Catalyst must decide how varied resources and peer exchange will actually be delivered. | Review **module_4_reallocation_to_universal_design_practice.md** with Catalyst and professional reviewers. |

### Next-phase rule

The Module 2 and Module 3 collapsing exercises are complete as working directions for review, and first drafts now exist for both. The next work is:

- Review and revise the drafted Module 2 scenarios against the 4 work-style dimensions.
- Review and revise the drafted Module 3 items against the 3 motivation sub-dimensions.
- Confirm the non-scored universal design practice layer that replaces Module 4.
- Send the full instrument for professional review only after the drafts exist as a coherent package.

### Module 2 sustainability rule

Module 2 should support a sustainable-fit read, not just an initial-fit read.

In facilitator-facing outputs, flag possible sustainability strain when 2 or more Module 2 dimensions oppose the profile of a recommended track. This should be used as a coaching support signal before placement confirmation, not as an automatic exclusion rule.

Guardrail:

- Do not say: “You are methodical, so the fast track is not for you.”
- Do say: “You are methodical, and this track moves quickly, so Beyond Code Collective coaches and instructors can help build pacing strategies and check in on strain early.”

Pace runs both ways. A methodical learner may strain in a fast, adaptive environment, and a quick-moving learner may strain in a slow, heavily structured environment. Both poles are legitimate strengths.

### Module 3 equity and sustainability rule

Module 3 should support pathway sustainability without confusing material constraint for personality.

Guardrails:

- Self-direction and Stability-seeking must be independent axes, not opposite ends of one slider.
- Pathway orientation should be derived, not measured separately.
- Risk comfort should modify the support plan, not redirect the learner away from ownership paths.
- Stability-seeking is never a verdict on ownership capacity.
- A learner who needs stable footing now may still want to build or own something later.
- Items must separate what the learner wants from what the learner can currently afford.
- Learner-facing language should avoid “entrepreneur” and use building your own thing, ownership, running your own work, or shaping direction.

Wrong use:

> You are stability-seeking, so ownership paths are not for you.

Right use:

> Stable footing may help you stay focused right now, and Beyond Code Collective coaches and instructors can help you explore ownership or building pathways in a supported, staged way.
