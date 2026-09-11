# SOURCE.md — Canonical Source Material

> This is the source of truth. If a lesson and this file disagree, this file
> wins. Every lesson, exercise and check traces back to something here. Each
> section names where it came from; statistics carry a citation.

---

## 1. The Forward Deploy playbook (primary source)

The course is built on the **Forward Deploy** series and roadmap by Fonz Morris
(Beyond Code Collective). Three artefacts:

- Video: *The One Job AI Can't Touch, No One Explains* — youtube.com/watch?v=hc1nx2tzoa8
- Video: *5 Steps to Become a Forward Deployed Engineer (2026)* — youtube.com/watch?v=4pz2_TnQocI
- PDF: *The FDE 30-Day Roadmap* — forwarddeploy.fonz.sh/fde-roadmap.pdf

### 1.1 Two problems hiding inside "build software"

> "You shipped it. The tests pass. The latency is good... Six months later, you
> open the dashboard and check the usage numbers. **41 people out of 11,000.**
> The software works perfectly. Almost nobody uses it. This is the normal
> outcome. Not the failure case, the normal one."

- Problem one: **making it work.** Problem two: **making it land** inside a real
  organisation, with real data messier than your fixtures, and real people who
  already have a way of doing this they like better than yours.
- Almost every engineer is optimised for the first problem. Almost every failure
  happens in the second. The FDE exists in that gap.

### 1.2 What an FDE is, and the four things it isn't

An FDE is a real engineer who works **inside the customer's world** instead of
inside the vendor's codebase. Not a demo, a slide deck or a recommendation memo.
Production work against the customer's actual data, sitting with the people who
will use the thing.

| Confused with | The difference |
|---|---|
| Sales engineer | Works before the deal; output is **confidence**. FDE works after; output is a **working system**. |
| Consultant | Tells you what to do and leaves. FDE **builds it and stays until it's used**. |
| Support | Reactive and ticket-shaped. FDE work is **proactive and outcome-shaped**. |
| Product engineer who talks to customers | Owns the **surface of the product**. FDE owns **whether a specific customer succeeds**. |

> "The FDE's unit of success is not a feature. It's a **deployment**."

### 1.3 Why the role exists: Palantir, then every AI company

- Palantir built the role to sell into places "where normal enterprise software
  goes to die": government agencies, banks, hospitals. Thirty years of data, no
  clean schema, a very good reason for every strange thing they do. So they sent
  engineers, not to advise but to build.
- The FDEs kept building the same things for different customers. Those patterns
  were pulled back into the core product. **The deployment layer became the R&D
  function.**
- Every AI company hit the same wall: a model that "can do almost anything in
  general and nothing in particular." The demo is stunning; then it hits a real
  company, and the hard problems were never about the model:
  - which **system of record** has the truth in it
  - whether the data anyone can get to is the data that matters
  - what **"correct" even means** for this customer, and who decides
  - whether the humans doing the job today will **adopt it or route around it**
- None of that is solved by a better model. All of it is solved by an engineer
  standing inside the problem.

### 1.4 The texture of the job

- You read someone else's schema. Written years ago by someone who left, with
  column names that are abbreviations of words nobody uses any more.
- You write **glue**. Unglamorous, deeply specific, and the reason the thing
  works at all.
- You sit in rooms and watch someone do their job the slow way, and **you don't
  interrupt**, because the reason they do it the slow way is usually load-bearing.
- You **say no, constantly**. The single highest-value thing an FDE does is kill
  a requirement that would have consumed a quarter and shipped something nobody
  wanted. You can only do that credibly if you're technical enough to know it's
  possible and close enough to know it's pointless.
- You **carry a number**: not story points, but whether this deployment is in
  production and being used by the people it was built for.

### 1.5 The honest costs, and what you get

Costs: depth traded for range; less legible work (no repo that shows what you
did); travel; exposure (when the deployment fails, it's yours). "If those
trade-offs sound bad, this genuinely isn't your role. And that's a fine answer."

In exchange: a **short feedback loop to reality** (days, not quarters);
**judgment**, not opinions, after a few deployments you can tell in the first
meeting whether something will work; **leverage**, because the FDE is the only
person who sees the product, the customer and the gap between them at once; and
**durability**, because the hard part was never the code, it's judgment under
ambiguity in a room full of competing incentives.

### 1.6 The five steps (from the short video)

1. **Code foundations** — Python, Git, SQL, APIs.
2. **The AI stack** — large language models, prompting, retrieval, agents.
3. **Ship real deployments** — build, deploy and debug in production.
4. **Customer skills** — discovery calls, live demos, translating between
   business and technical. "That's the forward part of the job."
5. **Land the role** — a deployed portfolio, certifications, interview reps.
   "Proof beats resumes."

*Course note:* this course is for non-technical staff. Step 1 is done **by**
Claude Code, not by the learner. Steps 2 to 5 are done by the learner, with
Claude Code as the builder.

### 1.7 The three stages of the job (roadmap)

1. **Understand the business reality.** Not the wiki version. The real process,
   with its 40 senders, forwarded threads, and rules that live in one veteran's
   head.
2. **Decide where intelligence belongs.** The smallest build that moves the most
   work with the least model authority.
3. **Build it and own it until it works.** Through the failures, in production,
   with a number attached.

### 1.8 The 30-day roadmap (roadmap, verbatim structure)

**Week 1 — Build an agent loop end to end.** Pick one model and one agent
platform. "Ignore everyone telling you to stay model agnostic; judgment
transfers, tool-hopping doesn't." Build an agent that takes a real input (an
email, a PDF, a form), makes a decision, and produces a real output.
Checklist: one model, one platform, zero switching for 30 days · automate one
workflow you personally understand deeply · ship something ugly that works by
Friday.

**Week 2 — Make it survive failure.** "There's one happy path and a thousand
unhappy ones, and the exceptions are the job." Feed it garbage: wrong file
types, missing fields, contradictory instructions, the weird forwarded thread.
Every failure becomes a handler, a retry, or a graceful escalation to a human.
Checklist: list 20 ways it breaks, fix or fence every one · add an audit trail,
every decision logged, every action reversible · decide what it should refuse
to do on its own.

**Week 3 — Make it measurable.** "Businesses measure revenue, risk, and cost.
Nothing else." Attach the agent to one of those numbers and build the eval that
proves it. Run 50 test cases. "When 41 pass, the 9 failures are the
deliverable." Checklist: 50 eval cases from real examples, not invented ones ·
investigate every failure, no celebrating pass rates · state the result in
business terms: hours saved, errors caught, days recovered.

**Week 4 — Defend it like a VP.** "Nobody buys AI; people buy not getting
fired." Show the before, the after, and the number. Never say "audit" (call it a
sprint). Never propose a migration (build on top of what exists). Make the
person who sponsored you look brilliant. Checklist: one-page writeup (broken
workflow, what you built, what changed) · a 5-minute demo **through** the
unhappy paths, not around them · publish it; the writeup is your portfolio.

### 1.9 The five deaths of an AI pilot (roadmap)

| # | Death | The check |
|---|---|---|
| 1 | Built for the demo, not reality | Has it seen the real inputs, including the ugly ones? |
| 2 | Forced a migration | Does it work on top of the stack they already have? |
| 3 | Happy path only | What happens on the 20 worst inputs you listed? |
| 4 | No owner after launch | Whose name is on it in 90 days? (It should be yours.) |
| 5 | Moves no metric | Which of revenue, risk or cost does it visibly change? |

---

## 2. The pilot-failure statistic

- **"95% of enterprise generative-AI pilots deliver no measurable P&L impact."**
  Source: MIT NANDA initiative, *The GenAI Divide: State of AI in Business
  2025* (August 2025). The roadmap cites this as "95% of AI pilots fail" and
  attributes the failure not to models but to the absence of three things:
  nobody decided where intelligence belongs, nobody built for the unhappy paths,
  nobody owned the result.
- The instructor may quote the figure as "roughly 95% of pilots show no
  measurable business impact (MIT, 2025)". It must not be presented as "95% of
  AI projects crash" or similar.

## 3. History of the role (secondary sources)

Source: Gergely Orosz, *What are Forward Deployed Engineers, and why are they so
in demand?*, The Pragmatic Engineer newsletter
(newsletter.pragmaticengineer.com/p/forward-deployed-engineers); Palantir blog,
*Dev versus Delta*.

- Palantir created the role in the early 2010s and called it **"Delta."** Teams
  in early Palantir business development were named after NATO alphabet letters.
- Delta engineers were deployment-oriented and often on site; **"Echo"**
  engineers were platform-oriented, responsible for what graduated from a
  deployment into the product.
- Until around 2016 Palantir employed **more FDEs than conventional software
  engineers**. When Foundry launched, many moved into core product, carrying
  field experience with them.
- OpenAI launched its FDE function in early 2025. FDEs there write code on
  customer infrastructure and work with more ambiguity than solutions
  architects. Example: work with John Deere on farmer interventions that also
  improved a public API for all customers.
- Typical time split: site visits and customer work 25–50% of time; the rest is
  product contribution and internal knowledge-sharing.
- Who fits: comfort with ambiguity, travel and unconventional environments
  (air-gapped systems, factory floors). Most postings ask for several years of
  engineering experience.

## 4. Market context (secondary sources, September 2026)

- FDE job postings grew from roughly 640 in April 2025 to about 5,300 in April
  2026 (Aced/Exponent guide, tryexponent.com/blog/what-is-a-forward-deployed-engineer).
- Roughly 90% of organisations report using AI somewhere, far fewer have it in
  production across operations; the bottleneck moved from model capability to
  execution inside complex environments (CIO Dive; TechTarget).
- Companies hiring under FDE or adjacent titles include OpenAI, Anthropic,
  Palantir, Scale AI, Sierra, Ramp, and services firms such as Deloitte and
  Accenture.
- Anthropic's posting asks for a technical customer-facing background and
  production experience with LLMs: prompting, agent development, evaluation
  frameworks, deployment at scale, and "high agency with an ability to navigate
  ambiguity present in complex organizations."
- Compensation figures vary widely by source and level; the instructor should
  not quote a single number as fact. The roadmap cites public postings at
  $280K base (OpenAI) and $300K (Handshake).

## 5. What the interview tests (secondary sources)

Source: Aced/Exponent, *Forward Deployed Engineer Interview: The Definitive 2026
Guide*; Perspective AI interview guides.

- Three things in roughly equal weight: technical depth, customer-facing
  judgment, and reasoning out loud through ambiguity.
- The signature round is the **open-ended decomposition case**: 45–60 minutes,
  a vague customer problem, no single right answer. Example prompt: "A major
  city wants to reduce 911 response times using call data, traffic data and
  ambulance GPS. You have 60 minutes."
- What gets scored: clarifying before solving; naming missing data and
  stakeholders; stating assumptions aloud; decomposing into chunks sequenced by
  risk and value; proposing a walking-skeleton first version; surfacing failure
  modes; talking continuously.
- The single biggest filter: **jumping to a technical solution before scoping.**
- Client-simulation prompts: explain to a non-technical VP why the system cannot
  guarantee 100% accuracy; push back on a feature that compromises data
  governance; explain a three-week slip to a customer's CTO.
- Other common rejections: saying "we" instead of "I", hand-waving on
  evaluation, over-promising in the role-play, preparing as if for a LeetCode
  interview.

## 6. The 30-day project, as taught in the source interview

Source: Nate B Jones, *OpenAI Pays $280,000 For This Job. You Don't Have To Be
An Engineer* (AI News & Strategy Daily, 23 Aug 2026,
youtube.com/watch?v=0bLI31EFDDs). This is the interview the roadmap's
statistics come from. Claims below are his unless marked otherwise.

### 6.1 The gap
- Anthropic said it would train tens of thousands of engineers to install AI
  inside banks, airlines and insurers; he reports that 86 had actually trained.
  Quote as "the video reports 86", not as a verified figure.
- OpenAI posts FDE at up to $280K base plus equity; Handshake at $300K.
- "AI is a general-purpose capability and the last mile in AI is really hard.
  FDEs bridge that gap."

### 6.2 The Maya story (the worked example behind the roadmap)
- Maya runs claims operations at a regional insurer. The CEO wants claims
  processed twice as fast. That is not a buildable job.
- She pulls **actual files**: one claim that cleared intake in a day and one that
  sat for a week. In the slow one, the repair estimate arrived Tuesday but the
  **signature page was missing** and nobody noticed until Friday. Three days gone
  before any decision.
- Rough math: a few thousand claims a month, 600–700 incomplete, several days
  lost each: **roughly 1,800–2,000 days of claims sitting still every month.**
  The information needed to flag it already exists in the packet.
- **Leverage**: the point where a relatively small build moves the largest
  amount of work without giving the model a dangerous amount of authority. The
  service only notices the file is incomplete, points to the missing item, and
  prepares the communication. Injury decisions and fraud stay with people.
- "The same month of engineering can remove 1,800 days of waiting or make a
  rare edge case slightly better."

### 6.3 Three parts of the job, and where each background starts
1. Understand the business well enough to find the leverage point.
2. Build and inspect the system.
3. Stay after launch long enough to learn whether people use it and whether the
   result is worth the cost.

Engineers usually have part 2 and struggle to get close enough to the customer
for part 1. Operations, product and consulting people usually have part 1 and
need to get technical enough to build, inspect and know where it fails.
Solutions and implementation people sit in the middle; their test is whether
they stay responsible after the traditional handoff.

### 6.4 How to start: pull the last ten
- Don't dig into a whole job. **Pull the last 10–20 instances** of the problem,
  classify what went wrong, count, and do rough math. "You don't need a perfect
  financial model. You need enough evidence."
- Then **sit next to the person doing the work.** Much of what they do is not on
  the official process. Expect half your ten pain points to be wrong after you
  watch. Let reality change the assessment.
- By the end of week two you should be able to say: this is how much work I'm
  going to save, this is what I'm doing, this is why it matters, and this is how
  I'm securing the guardrails. "The point is to keep you from asking AI to
  invent a product before you understand the real person."

### 6.5 Domain knowledge is the edge
- A claims adjuster knows when an estimate is wrong; a finance operator knows
  when two reports share a name but not numbers; a support lead knows the one
  sentence that means "get a human now." You can't substitute for that.
- He cites a study of roughly 400,000 Claude Code sessions: people rated as
  experts in the task reached verified success more than twice as often as
  novices, and non-technical users' code quality came within a few points of
  technical users'. (Quote as "a study he cites"; the course did not verify it.)
- "If you're deep in healthcare, don't try to jump over." Bring the industry you
  already know. DXC's plan to certify existing engineers by industry is the
  same idea.
- You don't need to wait for a title. Find the piece of work, show you can
  solve it with AI, and the title follows. Adjacent titles that carry the same
  work with a different technical balance: applied AI engineer, customer
  engineer, solutions engineer, implementation engineer, technical deployment
  lead, AI operations, AI product.

### 6.6 Building responsibly
- **Least privilege**: Maya's service needs the intake documents, not payment
  or medical history. Lock off what the model doesn't need.
- **Evals** are a key engineering skill that has nothing to do with code: 50
  correctly adjudicated examples ("missing documents" / "not missing") as the
  test set.
- Enterprise deployments always hit the same wall: getting access to the data,
  understanding the policy nobody wrote down, fitting the tool into how people
  actually work, and the first complaint from a real user. Take **permissions,
  data access, authentication and IT expectations** seriously even in an
  exercise; you will have to explain those decisions.
- Ambition: if AI could save 2,000 hours a month and yours saves 20, look at
  the causes. "You need to demand and expect" the larger number.

### 6.7 The four weeks, his version
Week 1: pull real work, reconstruct what happened, classify, find leverage.
Week 2: sit next to the person; napkin math; state the impact before building.
Week 3: build the simplest solution with an AI agent; run it against the old
cases, clean and ugly; look at failures; rerun after every meaningful change.
Week 4: **let two or three people use it while you watch**; learn; fix the loop.
Then summarise: "I came in, I sat down, I saw how real people worked. I mapped
out the problems. I built this to fix it. I put it into production and got it to
work." Experienced people speedrun this in days.

## 7. Course-specific facts (this program)

- **Audience:** non-technical people in any industry: owners, operators,
  front-line staff, admins, leaders. The skill is industry-agnostic; see
  `data/OTHER_INDUSTRIES.md`. The learner never writes code. Claude Code
  builds; the learner directs, checks, decides and owns.
- **Practice environment:** Claude Code, opened in this course folder.
- **Running example:** one real workflow in the learner's business or organisation that is
  done the slow way today. Captured in `MY_DEPLOYMENT.md`. Optionally, one
  target company or role the learner is aiming at.
- **Data rule:** real personal data about customers, clients, members, employees or anyone else
  never goes into Claude Code during this course. Shipped data in `data/` is
  synthetic. Own-workflow exercises use a de-identified sample approved by
  whoever owns the data (the learner, if it's their business). Anything pasted into Claude Code is sent to Anthropic's
  servers for processing.
- **Authority rule:** during this course the agent drafts, decides and logs. It
  never sends, deletes or changes a system of record on its own. A human clicks
  send.

---

## 8. Field research: the 20 most-viewed FDE videos, Mar–Sep 2026

Method: the twenty most-viewed YouTube videos about forward deployed
engineering published in the six months to 6 Sep 2026, transcribed in full
(~85,000 words) and cross-tabulated. **A point's weight is how many independent
sources repeat it.** Section 6 (Nate B Jones) is one of these twenty; the other
nineteen are new here. Full per-video notes, the recurrence tally and the
consensus-vs-single-source split live in the companion skill at
`~/.claude/skills/forward-deployed-engineering/references/source-notes.md`.

Speakers include the people who run these functions: **Kevin Bai** (Anthropic
applied AI; founding FDE at Rippling, grew it to ~25 in a year; ex-Palantir),
**Pauline Brunet** (leads FDE globally at Cursor), **Natalie Meurer** (head of
agent engineering at Sierra; Palantir 2016–2021), **Steven** (deployed engineer,
LangChain), **Voss** (Verity Agents, ex-Meta), **Tyler** (founding FDE, Retell),
**Pankaj Jaiswal** (FDE and FDE interviewer, SuperVity), plus one candidate's
report from fifteen FDE interview loops.

### 8.1 Consensus (15+ of 20 sources)

- Palantir invented the role and was mocked for it; the vindication is
  commercial, not rhetorical — Palantir's average contract value (~$4M) is more
  than triple the next public SaaS company (ServiceNow ~$1.2M). *(Kevin Bai)*
- The role is **consultant + product manager + software engineer in one person**
  — and specifically the *best* combination of the three, not the average.
  Someone who is neither a strong communicator nor a strong engineer is not an
  FDE. *(Voss; Kevin Bai; several roadmaps)*
- Intelligence is commoditised: every company can buy the same frontier models,
  so the advantage moved to **where, how and why** they are deployed. This is
  the one-sentence answer to "why does this job exist."

### 8.2 Heavily repeated (8–14 sources)

- **The documented process is fiction.** Corroborating stories, each from a
  different source: an agent denied refunds exactly as the written policy said
  and the company lost long-standing customers — the person who used to do the
  job had an undocumented rule (*company card → approve without reading*,
  because arguing over one refund costs the account). Palantir lost a **year**
  to a file-format migration one engineer kept blocking; nobody could explain
  why until someone watched her work — she checked data by double-clicking files
  open, and the new format had nothing to double-click. They gave her that back
  and she approved the migration in two days. *(AI LABS)*
- **Evals are the defining technical skill of the era**, and they involve little
  or no code — which is why a non-engineer can own them first. The deliverable
  is the failure analysis, not the pass rate. *(near-universal)*
- **Never force a migration.** Recurring real numbers: a client two years and
  a couple of million dollars into NetSuite; another five years and $5M into a
  finance system. Build on top and integrate outward. *(Voss; AI LABS)*
- **Revenue, risk, cost** — the only three things a business measures. Say which
  one you moved, with a number. *(Pauline Brunet; several)*
- Not an entry-level role: ~12% of postings target 0–2 years; 60% want 3–5;
  about 45% of FDEs arrive from software engineering. *(Marina Wyss)*

### 8.3 The triage that *is* the job (4–7 sources, stated most crisply by AI LABS)

Every step of the mapped workflow gets exactly one of three answers:

| Filter | Answer |
|---|---|
| Fixed rule that must be right every time | **Deterministic software** — not AI |
| Messy input needing a judgment call | **The model** |
| Expensive when wrong, or a genuine business call | **Stays human** |

Almost no real workflow should be fully AI. In one worked eight-step example:
four steps ran on their own, three ran with a human checking the output, one
stayed fully human. *(Voss's version: of ten steps, perhaps three need
judgment; the rest are if-then-else and API calls.)*

### 8.4 Adoption is a longer project than the build

- OpenAI built a tool for thousands of advisors at one of the world's largest
  banks: **6–8 weeks of engineering, then four more months of pilots and testing
  before advisors relied on it.** Roughly 98% ended up using it. Budget more
  time for trust than for building. *(AI LABS)*
- **Keep the visible steps.** Hand someone who ran an eleven-step process a
  one-step version and they stop using it: they used to check the work as they
  went, and now they are asked to trust an answer that simply appeared. Let the
  agent work *inside* the steps people already know. *(Voss)*
- **Nobody buys AI; they buy not getting fired.** Bringing you in is a personal
  risk to your sponsor — doing nothing is safe, and a failed project lands on
  them. De-risk it: first pass free, prove one number, make the sponsor
  promotable. And never call it an *audit* (people hear "tax audit") — call it a
  **sprint**. *(Voss and Greg Isenberg)*
- **Establish the baseline before you build.** An executive demanded an agent
  costing $2,000/day be switched off; it chose which engineer to dispatch to
  broken equipment, and sending the wrong person cost more than $2,000/day. He
  agreed instantly once someone did that arithmetic — he had only ever measured
  the cost. *(Pauline Brunet)*

### 8.5 When FDE is the wrong answer (single-source, attribute if quoted)

- **Kevin Bai's two tests.** (1) You need FDE only when a **technically complex
  product** meets a **non-technical buyer** — a technical product sold to
  engineers needs docs and devrel instead. (2) Your FDEs must build on a
  **platform of shared primitives**; if every engagement starts from scratch,
  "you do not have an FDE function, you have a dev shop," and maintenance will
  eat the P&L. FDE is a design partnership scaled up to enterprise.
- **Pauline Brunet's red flag.** The sentence "we're understaffed, can you just
  do this" means staff augmentation, not deployment. Her saving question:
  *"Who on your team will I be working with?"* Also: never sell "two FDEs for
  six months, do what you like" — keep scope **directional** (the problem and
  the phases), and define success numerically at scoping time: "if this goes
  from three hours to twenty minutes, is that a success?"
- **Natalie Meurer's argument.** FDE "doesn't exist" — the title now covers
  DevOps, data integration, custom solutions, enablement and agent building, so
  it means everything and therefore nothing. Her interview question: *"what
  vintage of FDE are you?"* Her thesis: as code gets cheap and pricing moves to
  outcomes, product/agent/solutions engineering are all converging on forward
  deployment.

### 8.6 What the interviews actually test (adds to §5)

From fifteen first-hand loops (Anu Sharma) plus hirers' accounts (Kevin Bai,
Pankaj Jaiswal, Steven at LangChain, Tech With Tim):

- The **ambiguous case study** has the lowest pass rate (~40%) and the highest
  weight in the decision. **"There is no right answer, but there is a right way
  to answer"**: clarify before solving, decompose out loud, sequence by risk and
  value, and answer in business language rather than engineering language.
- **Object-oriented Python is back** — 30–50 clean lines, live, in a Google-Doc
  style editor with no syntax highlighting and no autocomplete. Pseudo-code and
  whiteboarding are gone.
- **Take-homes and work trials are common**: clone the repo, fix three issues,
  record yourself explaining what you did and why. Some companies run 2-day work
  trials where you demo to a real prospective client.
- **Agentic system design** is scored as its own discipline (models, evals,
  LLMOps, harness, MVP → production), as is **AI security** (prompt injection,
  PII, jailbreaks, failure handling).
- **Time management is explicitly scored** at LangChain — 30 minutes of slides
  and 5 of demo fails the round on its own.
- System design over LeetCode: interviewers look for intuition and scalability
  thinking, not the optimal solution. *(Pankaj Jaiswal)*
- Growth ladder, Palantir model: FDE is a **terminal title** (their head of
  commercial, running a nine-figure business, is titled FDE). Progression is
  scope — one slice of a customer's problem → one whole customer → an industry
  → a geography. The mental model: *"you are the CEO of a company with exactly
  one customer, and the only way to get more is to make that one succeed."*
  *(Kevin Bai)*

### 8.7 Numbers worth citing (verify before use; September 2026)

- Postings up ~700–1,100% year over year; 100+ companies hiring; New York has
  overtaken San Francisco as the top city (fintech and regulated industries).
- Base salaries cluster $150–320K; Palantir median total ~$230K; frontier labs
  roughly $350–450K mid-level and $600K–$1M+ at staff/principal — but **heavily
  private-company equity**, and OpenAI and Anthropic route many FDEs through
  separate deployment companies, so that equity may not be in the lab itself.
  Treat the million-dollar headline with scepticism. *(Marina Wyss)*
- Time split, one thousand-posting analysis: roughly 25% writing code, 50%
  integration and plumbing, 25% meetings and customer hand-holding; 68% of
  postings require travel. A practising FDE's own estimate: 30% client
  communication, 70% engineering. *(Marina Wyss; Pankaj Jaiswal)*
