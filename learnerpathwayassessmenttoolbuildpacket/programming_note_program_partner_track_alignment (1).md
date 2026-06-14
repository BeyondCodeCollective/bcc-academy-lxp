# Programming Note: Program and Partner Track Alignment Layer

## Purpose

The learner pathway alignment framework needs a place for existing and future Catalyst programs, partner programs, and training tracks to connect to learner assessment results.

Decision confirmed by Angel: This should be treated as a **Program and Partner Track Alignment Layer**, not as a fifth assessment module. Modules 1-4 describe the learner. The alignment layer uses those results to recommend or contextualize actual available training tracks.

## Where this fits in the framework

Recommended structure:

1. **Module 1: Archetype identity**
   - Who the learner tends to be across contexts.
2. **Module 2: Work style scenarios**
   - How the learner is likely to operate in realistic learning, tech, or workplace situations.
3. **Module 3: Motivation and pathway orientation**
   - What keeps the learner engaged and whether they lean toward job placement, entrepreneurship, or a blended pathway.
4. **Module 4: Learning preference**
   - Lightweight instructional support preferences across Visual, Aural, Read/Write, and Kinesthetic modes.
5. **Program and Partner Track Alignment Layer**
   - Which current or future Catalyst programs, partner tracks, or training opportunities may fit the learner’s profile.

## Portal section connection

The current portal view uses a **Programs Overview** section with program records organized by fields such as:

- Program
- Persona
- Track
- Location
- Timeline
- Participants
- Status
- Funding

The visible program status categories include:

- Active
- Starting Soon
- Partner Contingent
- Planned

The visible track examples include:

- A - Cyber
- A - Cloud
- A - Data & AI
- B - AI Fundamentals
- B - AI & Workflow
- A/C - Salesforce/HubSpot
- Community programming

The alignment layer should connect these program and track records to learner-facing pathway recommendations.

## Recommended naming options

Possible names for this section in the framework:

1. **Program and Partner Track Alignment**
   - Best clear operational name.
2. **Training Track Match**
   - Best learner-facing name.
3. **Catalyst Pathway Match**
   - Best branded name if the team wants it to feel specific to Catalyst.
4. **Program Placement Layer**
   - Best internal/programming name.
5. **Pathway-to-Program Alignment**
   - Best if the team wants the assessment result to clearly connect to available offerings.

Recommended internal name: **Program and Partner Track Alignment Layer**.

Recommended learner-facing name: **Your Training Track Matches**.

## Data model needed

Each program or partner track should have a structured record with these fields:

| Field | Purpose |
|---|---|
| Program ID | Stable unique identifier for the program. |
| Program name | Display name shown in the portal and reports. |
| Provider/partner | Catalyst, partner organization, employer partner, funder, or internal team. |
| Persona served | Current portal persona category or audience segment. |
| Track | Cyber, Cloud, Data & AI, AI Fundamentals, AI & Workflow, Salesforce/HubSpot, Community Programming, etc. |
| Track level | Introductory, intermediate, advanced, bridge, career switcher, college, operator, etc. |
| Delivery format | Virtual, in-person, hybrid, internal, cohort-based, self-paced, event series. |
| Location | City, state, national, virtual, internal, TBD. |
| Timeline | Start and end dates, rolling, TBD, planned cycle. |
| Status | Active, Starting Soon, Partner Contingent, Planned, Archived, Paused. |
| Capacity/participants | Available seats or participant target. |
| Funding | Funder, partner, grant source, unfunded, beyond funded, TBD. |
| Prerequisites | Required skills, experience, eligibility, equipment, or prior modules. |
| Ideal archetypes | Archetypes that may naturally align with the program. |
| Secondary archetypes | Archetypes that may also fit with support or specific motivation. |
| Work-style fit | Module 2 dimensions that support fit. |
| Motivation fit | Module 3 drivers that support fit. |
| Learning support notes | Module 4 instructional supports that may matter. |
| Current role pathways | Roles the program currently prepares learners for. |
| Future-facing pathways | Future or emerging roles connected to the program. |
| Confidence level | High, medium, low, or needs advisor review. |
| Last reviewed date | Date the record was last checked. |
| Source/owner | Person or system responsible for maintaining the record. |

## Matching logic

The program recommendation should not be based on archetype alone. It should combine all relevant module outputs.

Suggested matching hierarchy:

1. **Eligibility and availability**
   - Is the program active, starting soon, or planned?
   - Is the learner eligible?
   - Is the location/timeline possible?
   - Is there capacity or funding?
2. **Pathway relevance**
   - Does the program align with the learner’s stated pathway interest or Module 3 orientation?
   - Does the program prepare learners for roles that match the learner’s strengths?
3. **Archetype fit**
   - Does the program align with the learner’s Module 1 archetype?
   - Does it support the learner’s primary or secondary archetype?
4. **Work-style fit**
   - Does the program environment match Module 2 behavior patterns?
   - Example: collaborative cohort, independent build work, high structure, ambiguity, customer-facing, behind-the-scenes, etc.
5. **Learning support fit**
   - Does the program format support the learner’s Module 4 instructional preference?
   - Example: visual demos, discussion, written guides, hands-on labs.
6. **Advisor review**
   - If scores are tied, data is missing, or the fit is mixed, flag for facilitator or coach review.

## Suggested recommendation outputs

Each learner report could include:

### Strongest current program matches

Programs that are currently active or starting soon and align strongly with the learner’s profile.

### Possible future program matches

Programs that are planned, partner-contingent, location-limited, or future-facing.

### Good-fit tracks

Track categories that fit the learner even if a specific program is not currently available.

Examples:

- Cyber
- Cloud
- Data & AI
- AI Fundamentals
- AI & Workflow
- Salesforce/HubSpot
- Community Programming

### Coach/advisor notes

Private guidance for facilitators or coaches explaining why a program was recommended and what support the learner may need.

## Example fit logic by archetype

| Archetype | Possible track fit patterns |
|---|---|
| Navigator | Product, project coordination, AI workflow, program strategy, pathway planning. |
| Developer | Software, cloud, web, app building, QA, automation, technical labs. |
| Igniter | Startup, launch, AI adoption, digital marketing, innovation pilots, entrepreneurship. |
| Connector | Customer success, implementation, partner coordination, community, Salesforce/HubSpot. |
| Systems Thinker | Data & AI, cybersecurity, systems analysis, cloud infrastructure, operations. |
| Culture Keeper | Learning support, cohort facilitation, AI upskilling, community programming, change management. |
| Designer | UX/UI, digital design, content systems, AI experience design, accessibility. |
| Support Specialist | Help desk, IT support, technical support, documentation, AI support, user training. |
| Explorer | Introductory tracks, rotational exposure, emerging tech, AI fundamentals, interdisciplinary innovation. |

## Monthly update requirement

This program alignment layer should be included in the monthly refresh process.

Every month, the automation should:

1. Retrieve updated program and partner track records from the source system confirmed by Fonz.
2. Identify new, changed, paused, archived, active, starting soon, partner-contingent, and planned programs.
3. Refresh each program’s track, timeline, participant capacity, status, funding, and location.
4. Re-check labor-market and future-skills research for relevant track categories.
5. Update current role pathways and future-facing pathways tied to each track.
6. Recalculate or refresh program-to-archetype fit language.
7. Save the updated alignment file or template back to the agreed destination confirmed by Fonz.
8. Flag any missing data for human review.

## Open details for coworker/programmer

The coworker/programmer should confirm:

- Where the authoritative program list lives.
- Whether the portal/database, admin table, structured export, or another system is the source of truth.
- Whether the portal has an export, API, database table, or spreadsheet backing the Programs Overview.
- Exact folder/file IDs for program records.
- Whether the monthly update should write back to a database, the portal, a structured export, or another destination.
- Whether program matching should happen automatically or only generate draft recommendations for coach review.
- Whether learner reports should show specific programs or only track categories.
- Whether partner-contingent and planned programs should appear to learners, facilitators only, or not at all.
- How to handle programs with TBD location, timeline, funding, or capacity.

## Safety checks

Before publishing or saving updated recommendations:

- Do not recommend programs that are archived, paused, unavailable, or ineligible for the learner.
- Clearly label Partner Contingent and Planned programs.
- Do not imply guaranteed placement, enrollment, funding, or job outcomes.
- Do not use archetype as the only reason for a program recommendation.
- Preserve the distinction between identity, work style, motivation, learning preference, and actual program availability.
- Keep coach/advisor review available for uncertain or high-stakes recommendations.
