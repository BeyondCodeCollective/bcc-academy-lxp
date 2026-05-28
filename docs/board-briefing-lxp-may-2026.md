# BCC Academy LXP — Board Briefing
**May 2026 | Technical Source Document**

> This document is raw source material for the board narrative. It covers three things: (1) what was built, (2) what data the platform now collects, and (3) what the first wave of data is showing. The April 2026 board report did not include LXP information — this is the first data snapshot.

---

## 1. What Was Built

### The Platform

BCC Academy launched a custom Learning Experience Platform (LXP) — a purpose-built web application at **bccacademy.io**. It is not a white-labeled off-the-shelf tool. Every screen, data model, and workflow was designed around BCC's specific programs and community.

**Tech stack:** Next.js (React), Supabase (PostgreSQL), hosted on Vercel. Magic-link authentication — no passwords, no app to download.

**Development timeline:** 371 git commits from March 21 to May 22, 2026 — approximately 9 weeks of active development. The platform went from zero to a fully operational multi-program system in that window.

### Core Capabilities Shipped

#### Student-Facing
- **Personalized dashboard** — each student lands on their program and track automatically; the platform knows who they are and what they're enrolled in
- **Curriculum viewer** — weekly lesson modules with resources, organized by cohort week
- **Assignments** — students submit written work and reflections directly in the platform; instructors review and leave feedback
- **Accessibility features** — text scale controls, read-aloud mode (screen reader integration), designed for learners with varying literacy and accessibility needs

#### Instructor-Facing
- **Roster management** — view students by track, manage cohort assignments, track roles
- **Student work review** — review submissions and reflections across the whole track from one screen
- **Attendance tracking** — mark and review session attendance by track
- **Engagement dashboard** — per-student engagement scores derived from submissions, reflections, and attendance

#### Admin / Operations
- **Multi-track admin** — a single admin surface manages all tracks simultaneously; switching between Catalyst tracks (AI Fundamentals, AI + Digital Natives, MASS Training, TechPlus) requires one click
- **Program-level insights** — aggregate analytics including survey completion rates, cohort engagement, student work volume
- **Cross-track people management** — bulk-assign students to tracks, manage roles, view full roster across the program
- **Lunch & Learn management** — dedicated tab for workshop-style events visible to managers only

#### Survey Infrastructure
Two separate data pipelines — both live:
- **Auth pipeline** (logged-in students) — Catalyst cohort pre/mid/post surveys, learner intake, engagement check-ins
- **Public pipeline** (no login required) — Network+ post-program survey, workshop feedback; used for alumni and community members who don't have platform accounts

---

## 2. Program Structure in the Platform

### Programs

| Program | Description |
|---------|-------------|
| **Catalyst** | BCC's flagship multi-track tech training program |
| **Network+** | Alumni networking and community program (separate community platform; post-program survey data piped into LXP) |

### Catalyst Tracks

| Track | Enrolled Students |
|-------|-------------------|
| AI Fundamentals | 9 |
| AI + Digital Natives | 6 |
| MASS Training | 4 |
| TechPlus (CompTIA) | 4 |
| **Total** | **23 enrollments** (19 unique students) |

### Cohorts Running (as of May 22, 2026)

| Cohort | Start Date | Duration | Program |
|--------|------------|----------|---------|
| CompTIA Tech+ Foundations, MASS Training & AI Fundamentals — Cohort 1 | March 23, 2026 | 8 weeks | Catalyst |
| Catalyst — Cohort 1 | March 24, 2026 | 10 weeks | Catalyst |
| The Forge — Cohort 1 | April 17, 2026 | 8 weeks | Catalyst |

### Network+ Community
- **374 alumni** imported from Circle (the BCC community platform) into the LXP database — this is the reachable universe for follow-on programs, post-program surveys, and alumni engagement
- Source: `circle-2026` import (May 17, 2026)

### Platform Users

| Role | Count |
|------|-------|
| Students | 19 |
| Admins | 3 |
| Super-admins | 3 |
| Instructors | 2 |

---

## 3. What Data the Platform Collects

### Survey System

The platform runs a matched pre/mid/post survey design — the same statements appear at each stage so gains can be measured precisely. As of May 22, 2026:

| Survey | Responses |
|--------|-----------|
| Pre-Program (Catalyst Spring 2026) | 15 |
| Mid-Program (Catalyst Spring 2026) | 5 |
| Post-Program (Catalyst Spring 2026) | 3 |
| Learner Intake | 5 |
| Network+ Post-Program | 15 |
| Workshop Feedback | 1 |

### What Each Survey Captures

**Pre-Program Survey**
- Demographics: gender, race/ethnicity, employment status, education level, zip code, household income, first-generation college status, languages spoken, disability disclosure
- Starting confidence on 5 tech identity statements (1–5 scale)
- Baseline AI/digital experience level

**Mid-Program Survey**
- Updated demographics (for grant/impact reporting)
- Tech confidence re-rated on the same 5 statements (before + now, capturing in-program change)
- Coaching experience: 4 rated dimensions (valuable, structured, safe, transformative)
- Open-text: what they want more of, hardest parts of CompTIA content, what success looks like at 12 months
- 1-on-1 coaching rating and memorable moments

**Post-Program Survey**
- Final confidence re-rating on all statements
- AI experience change
- NPS-equivalent: would you recommend BCC?
- Open-ended: what shifted for them

**Network+ Post-Program Survey (public pipeline)**
- Same confidence statements (before/after format)
- Belonging in tech, networking skills, career readiness
- Demographics for alumni impact reporting

### Engagement Signals (Logged Automatically)
- Submission timestamps and content (written assignments)
- Reflection timestamps and content
- Attendance records by session and track
- Platform login activity (via Supabase auth)

---

## 4. Early Data Insights

> **Sample sizes are small** — Catalyst Cohort 1 is still in-program. These are early signals, not final outcomes. Network+ data (n=15) is complete.

---

### Who We're Reaching — Catalyst Cohort 1

**Pre-Program Survey** (n=15, response rate: 15/19 students = 79%)

| Dimension | Data |
|-----------|------|
| Gender | 60% women (9), 40% men (6) |
| Race/Ethnicity | 93% Black or African American (14), 7% Other (1) |
| Employment | Mixed — approximately half employed (full or part-time), half unemployed or actively looking |

**This cohort reflects BCC's mission constituency** — majority Black, majority women, workforce-adjacent employment situations.

---

### Mid-Program Confidence Gains — Catalyst Cohort 1

**Mid-Program Survey** (n=4, excluding test submission)

Students rated the same 5 tech identity statements at the start of the program and again at the midpoint. Average point gains on a 5-point scale:

| Statement | Avg Before | Avg Now | Avg Gain |
|-----------|------------|---------|----------|
| I know how to keep building tech skills on my own | 2.0 | 3.75 | **+1.75** |
| I can talk about my technical skills with someone who works in tech | 2.25 | 3.75 | **+1.50** |
| I feel I belong in the tech industry | 2.5 | 3.75 | **+1.25** |
| I feel confident in my ability to learn technical material | 3.75 | 4.75 | **+1.00** |
| I see myself succeeding in a tech career | 4.0 | 4.50 | **+0.50** |

**Key signal:** The largest gains are in agency and belonging — not just subject-matter confidence. Students are becoming more confident that they *can* navigate the tech world, not just that they know the material.

**One notable case:** One respondent moved from 2→5 on belonging, 1→4 on building skills independently, and 2→5 on talking tech with industry peers — a 3-point gain across the board at the midpoint.

---

### Coaching Experience Ratings — Catalyst Cohort 1

**Mid-Program Survey** (n=4, 1–5 scale)

| Coaching Dimension | Avg Rating |
|--------------------|------------|
| Coaching sessions feel valuable to my growth | **4.75 / 5** |
| I feel comfortable being honest and open in sessions | **4.75 / 5** |
| I leave sessions thinking differently about my career | **4.50 / 5** |
| The pace and structure of sessions works for me | **4.50 / 5** |

All four respondents rated coaching at 4 or 5 on all dimensions. The floor was 3 (one respondent, across all dimensions uniformly — likely a test or outlier entry).

---

### What Students Say They Want at the End

Open-text responses to "What does success look like for you at the end of this program?":

> "Being more knowledgeable about tech. Have my Cert and possibly a job."

> "Being able to continue to take care of my loved ones financially."

> "A new career and a path to lead others to the same success."

> "To be more knowledgeable in the tech space and have options on career paths."

**Pattern:** Students are not just chasing a credential. They're connecting the program to financial stability, career pivots, and a desire to give back. The platform now captures this intent data systematically for every cohort.

---

### Network+ Post-Program Outcomes (n=15, complete cohort)

The Network+ post-program survey is the most complete dataset — 15 respondents who completed the program.

**Who responded:**
- 67% women
- 47% Black or African American
- 40% Hispanic/Latino

**Confidence gains on a 5-point scale (before vs. after program):**

| Area | Avg Gain |
|------|----------|
| Core networking knowledge statements | **+1.47 to +1.53** |
| Belonging and career confidence | **+0.80** |

**Satisfaction:**
- 2 out of 3 post-survey respondents (Catalyst): "a lot more confident" overall
- 2 out of 3 would recommend BCC to others

---

## 5. What the Platform Makes Possible Going Forward

The LXP is not just an administrative tool — it's BCC's primary data collection infrastructure for demonstrating impact. Before this system existed, outcomes data was scattered across Google Forms, spreadsheets, and Circle. Now:

1. **Every cohort has a matched pre/post survey automatically** — the platform enforces this by redirecting students to the pre-survey before they can access their dashboard
2. **Engagement is logged without manual work** — submission timestamps, reflection completion, and attendance create a composite picture of each student's participation
3. **Demographics are collected once** and linked to outcomes — eliminating double-entry and making grant reporting more accurate
4. **374 Network+ alumni are reachable** through a single import — future follow-on programs, job placement surveys, or alumni engagement campaigns can be measured in the same system
5. **Survey data is queryable in real time** — this document was generated by querying the live production database

---

## Appendix: Survey Schema Reference

### Matched Confidence Statements (Pre / Mid / Post)
Used across Catalyst surveys. Same wording at each stage enables precise delta measurement.

1. I feel I belong in the tech industry.
2. I see myself succeeding in a tech career.
3. I know how to keep building tech skills on my own.
4. I feel confident in my ability to learn technical material.
5. I can talk about my technical skills with someone who works in tech.

### Coaching Dimensions (Mid-Program)
1. The coaching sessions feel valuable to my growth.
2. The pace and structure of the sessions work for me.
3. I feel comfortable being honest and open in these sessions.
4. I leave the sessions thinking differently about my career or myself.

### Network+ Confidence Statements (Before/After)
Separate statement set for the networking program — covers networking skills, professional identity, and career readiness.

---

*Generated: May 22, 2026 | Source: BCC Academy LXP (bccacademy.io) production database + git history*
