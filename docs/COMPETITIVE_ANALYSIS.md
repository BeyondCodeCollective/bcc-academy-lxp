# BCC Academy — Competitive Analysis
### July 2026

---

## What BCC Academy Is

A custom-built learning platform for Black Girls Code / Beyond Code Collective. One Next.js codebase serves multiple branded programs (Catalyst, Forte, Home for the Summer) with role-based access, weekly curriculum tracks, live Zoom sessions, surveys, admin analytics, and certificates. Built for a nonprofit serving underrepresented communities in tech, ages 7–77.

---

## Direct Competitors

### Tier 1 — Enterprise LMS (too heavy, too expensive)

| | BCC Academy | Canvas LMS | Moodle | Blackboard | Schoology |
|---|---|---|---|---|---|
| **Cost** | ~$0 (Vercel + Supabase) | $5–15/student/yr | Free (hosting $500–5K/yr) | $10–25/student/yr | $1–4/student/yr |
| **Target** | Nonprofit STEM | Higher ed, K-12 | Higher ed, corporate | Higher ed | K-12 districts |
| **Multi-program** | ✅ Native (one codebase) | ❌ One instance per org | ❌ One site per install | ❌ One instance per org | ❌ District-scoped |
| **Custom branding** | ✅ Per-program | ⚠️ Limited themes | ⚠️ Plugin-dependent | ⚠️ Limited | ⚠️ Limited |
| **Surveys** | ✅ Custom-built | ⚠️ Quizzes only | ⚠️ Plugin | ⚠️ Basic | ⚠️ Basic |
| **Live sessions** | ✅ Zoom SDK embedded | ⚠️ LTI integration | ⚠️ Plugin | ⚠️ Collaborate | ⚠️ Third-party |
| **Admin analytics** | ✅ Custom dashboards | ✅ Strong | ⚠️ Plugin | ✅ Strong | ⚠️ Basic |
| **Invite-based enrollment** | ✅ Native | ❌ Manual roster | ❌ Manual | ❌ Manual | ❌ District-synced |
| **Accessibility** | ✅ TTS, font scaling | ✅ WCAG compliant | ⚠️ Varies | ✅ WCAG compliant | ✅ WCAG compliant |

**Verdict:** These are 800-pound gorillas built for universities with IT departments. Way too heavy for a nonprofit running 3–5 programs. Canvas has 300+ features BCC Academy doesn't need. Moodle requires a sysadmin. Blackboard costs $50K+/year.

---

### Tier 2 — Course Platforms (creator economy, not org-level)

| | BCC Academy | Teachable | Thinkific | Kajabi | Podia |
|---|---|---|---|---|---|
| **Cost** | ~$0 | $39–199/mo | $36–149/mo | $55–319/mo | $39–89/mo |
| **Target** | Nonprofit org | Solo creators | Solo creators | Solo creators | Solo creators |
| **Multi-program** | ✅ | ❌ One school | ❌ One school | ❌ One site | ❌ One site |
| **Cohort-based** | ✅ | ❌ Self-paced | ❌ Self-paced | ❌ Self-paced | ❌ Self-paced |
| **Live sessions** | ✅ Zoom embedded | ❌ External | ❌ External | ⚠️ Webinar | ❌ External |
| **Admin roles** | ✅ 4 levels | ❌ 2 (admin/student) | ❌ 2 | ❌ 2 | ❌ 2 |
| **Surveys** | ✅ Custom | ❌ Quizzes | ❌ Quizzes | ❌ Quizzes | ❌ Quizzes |
| **Custom domain** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **API/automation** | ✅ Full control | ⚠️ Zapier | ⚠️ Zapier | ⚠️ Zapier | ⚠️ Zapier |

**Verdict:** These are for individual course creators selling pre-recorded content. None support cohort-based learning, multi-program routing, or the admin complexity BCC Academy needs. Teachable/Thinkific would cost $1,500–3,000/year and still not do what you need.

---

### Tier 3 — Collaborative/Social LMS (closest overlap)

| | BCC Academy | 360Learning | TalentLMS | Edmodo | Google Classroom |
|---|---|---|---|---|---|
| **Cost** | ~$0 | $8/user/mo | $119/mo (40 users) | Free (limited ops) | Free |
| **Target** | Nonprofit STEM | Corporate L&D | Corporate training | K-12 | K-12 |
| **Multi-program** | ✅ | ⚠️ Workspaces | ⚠️ Groups | ❌ | ❌ |
| **Cohort-based** | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| **Live sessions** | ✅ Zoom embedded | ❌ External | ❌ External | ❌ External | ✅ Meet built-in |
| **Surveys** | ✅ | ⚠️ Polls | ❌ | ❌ | ❌ |
| **Admin analytics** | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| **Invite enrollment** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Custom branding** | ✅ | ⚠️ | ✅ | ❌ | ❌ |
| **Offline/mobile** | ⚠️ Responsive | ✅ App | ✅ App | ✅ App | ✅ App |

**Verdict:** 360Learning is the closest enterprise competitor — collaborative, cohort-based, good analytics. But at $8/user/mo with 200 learners, that's $19,200/year. TalentLMS is cheaper but lacks the depth. Google Classroom is free but can't brand, can't multi-program, and the admin tools are bare-bones.

---

### Tier 4 — Coding Education Platforms (niche overlap)

| | BCC Academy | Code.org | Replit Teams | Scrimba | Codecademy |
|---|---|---|---|---|---|
| **Cost** | ~$0 | Free | $25/user/mo | $18/user/mo | $17–25/user/mo |
| **Target** | Nonprofit STEM | K-12 CS | Coding bootcamps | Self-paced | Self-paced |
| **Cohort-based** | ✅ | ⚠️ Teacher-led | ✅ | ❌ | ❌ |
| **Multi-program** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Coding environment** | ❌ | ✅ In-browser | ✅ In-browser | ✅ In-browser | ✅ In-browser |
| **Live sessions** | ✅ Zoom | ❌ | ❌ | ❌ | ❌ |
| **Surveys/assessments** | ✅ | ⚠️ Quizzes | ⚠️ | ⚠️ | ✅ |
| **Admin analytics** | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| **Nonprofit focus** | ✅ Core mission | ✅ Core mission | ❌ | ❌ | ❌ |
| **Workforce readiness** | ✅ CompTIA, coaching | ❌ | ❌ | ❌ | ⚠️ |

**Verdict:** Code.org is free and serves K-12 CS beautifully, but it's a curriculum provider, not a platform you can customize. Replit Teams has an in-browser IDE (huge for coding education) but no multi-program or survey support. Scrimba/Codecademy are self-paced only.

---

## BCC Academy Scorecard (1–10)

| Capability | BCC Academy | Best Competitor | Gap |
|---|---|---|---|
| **Multi-program management** | 9 | Canvas: 3 | BCC Academy wins — native multi-tenant from one codebase |
| **Cohort-based learning** | 8 | 360Learning: 8 | Tie — both strong |
| **Custom branding per program** | 9 | TalentLMS: 6 | BCC Academy wins — full CSS/branding per program |
| **Admin analytics** | 7 | Canvas: 8 | Close — BCC has engagement scores, attendance, survey insights |
| **Live session integration** | 8 | Google Classroom: 7 | BCC wins — Zoom SDK embedded with auto-attendance |
| **Survey/assessment system** | 8 | Moodle: 7 | BCC wins — custom survey wizard, dual-likert, public forms |
| **Invite-based enrollment** | 8 | 360Learning: 7 | BCC wins — allowlist, invite links, application forms |
| **Accessibility** | 6 | Canvas: 9 | **Gap** — BCC has TTS + font scaling but no WCAG audit, no screen reader testing |
| **Mobile experience** | 5 | Teachable: 9 | **Gap** — responsive but no native app, no offline, no push notifications |
| **Content authoring** | 3 | Moodle: 8 | **Biggest gap** — no WYSIWYG editor, no drag-and-drop, no media library |
| **Grading/certificates** | 5 | Canvas: 9 | **Gap** — certificates exist but no gradebook, no rubrics, no GPA |
| **Communication/messaging** | 2 | Slack: 10 | **Biggest gap** — no in-platform messaging, no discussion forums, no announcements push |
| **Payment/monetization** | 1 | Teachable: 9 | **N/A for nonprofit** — but limits future self-sustainability |
| **API/integrations** | 4 | Canvas: 9 | **Gap** — no REST API, no webhook system, no LTI support |
| **Scalability** | 6 | Canvas: 10 | **Gap** — in-memory rate limiter, no Redis, single-region Supabase |
| **Cost to operate** | 10 | Google Classroom: 10 | Tie — both ~$0 at current scale |

**Overall: 6.2/10** — Exceptional for a custom-built nonprofit platform. Punches way above its weight on multi-program, surveys, and live sessions. Significant gaps in content authoring, communication, mobile, and accessibility.

---

## Strengths (What BCC Academy Does Better Than Anyone)

### 1. Multi-Program from One Codebase (9/10)
No competitor does this. Canvas requires a separate instance per org. Moodle requires a separate install. BCC Academy serves Catalyst, Forte, and Home for the Summer from one deployment with per-program branding, tracks, and surveys. This is a genuine competitive advantage.

### 2. Cost (10/10)
Operating cost is ~$0 (Vercel free tier + Supabase free tier). Canvas would cost $50K+/year for the same learner count. Moodle would need a $5K/year server + sysadmin. This is the single biggest advantage for a nonprofit.

### 3. Survey System (8/10)
Custom-built survey wizard with dual-likert (before/after comparison), public forms for walk-ins, CSV export, and audit logging. No competitor has this specific combination. Canvas has quizzes but not surveys. Google Classroom has Forms integration but it's disconnected.

### 4. Live Session Auto-Attendance (8/10)
Zoom Meeting SDK embedded directly with auto-attendance recording when a learner joins. Canvas requires LTI configuration. Google Classroom uses Meet but has no attendance tracking. This is a killer feature for accountability.

### 5. Invite-Based Enrollment (8/10)
Allowlist + invite links + application forms + track-specific enrollment. Most competitors require manual roster uploads or self-registration. BCC Academy's enrollment flow is more sophisticated than anything in the $0–$100/mo range.

---

## Weaknesses (What Needs to Be Fixed)

### 1. Content Authoring (3/10) — CRITICAL
**The single biggest gap.** There's no WYSIWYG editor for creating course content. Admins can't drag-and-drop modules, embed videos inline, or create interactive lessons without code changes. Every competitor — Canvas, Moodle, Teachable, even Google Classroom — has a content editor.

**Impact:** Every new course, every week's content, every curriculum change requires a developer. This is unsustainable at scale.

### 2. Communication (2/10) — CRITICAL
No in-platform messaging. No discussion forums. No push notifications for announcements. Students have to leave the platform (email, Slack, text) to communicate. Every LMS competitor has at least basic announcements + messaging.

**Impact:** Students disengage. Instructors can't reach learners in real-time. The "community" aspect is missing.

### 3. Mobile Experience (5/10) — HIGH
Responsive but no native app. No offline access. No push notifications. Students on phones (the primary audience) get a degraded experience. Zoom SDK on mobile is particularly rough.

**Impact:** BCC serves communities where mobile-first is the norm. A poor mobile experience directly hurts the people the platform is designed to serve.

### 4. Accessibility (6/10) — HIGH
Has TTS and font scaling (good), but no WCAG 2.1 audit, no screen reader testing, no keyboard navigation audit. The mobile drawer has `aria-modal="true"` but no focus trap. Several images had empty `alt=""` until this session.

**Impact:** Legal risk (ADA compliance), plus it contradicts the mission of serving all learners.

### 5. Analytics Depth (7/10) — MEDIUM
Good engagement scores and attendance tracking, but no learning analytics (time-on-task, completion velocity, struggling learner detection). No predictive analytics. No export to BI tools.

**Impact:** Funders want data. Instructors want to know who's struggling. The analytics are descriptive (what happened) but not prescriptive (what to do about it).

### 6. API/Integrations (4/10) — MEDIUM
No REST API. No webhook system. No LTI support. Can't integrate with external tools (Slack, Google Sheets, Zapier, n8n). The platform is a closed system.

**Impact:** Limits adoption by other orgs. Can't automate workflows. Every integration is custom code.

---

## 3-Month Roadmap Recommendation

### Month 1 — Foundation (Fix the Critical Gaps)

| Priority | Feature | Effort | Impact |
|---|---|---|---|
| P0 | **Content Editor** — WYSIWYG editor for track weeks (rich text, video embed, file upload). Use Tiptap or Plate (headless editors for React). Admin can create/edit week content without code. | 2 weeks | Unlocks self-service curriculum |
| P0 | **Announcements with email notifications** — Instructor posts an announcement → students get an email. Use Resend (already integrated). | 1 week | Basic communication channel |
| P0 | **WCAG 2.1 AA audit** — Hire an accessibility consultant or run automated audit (axe-core). Fix critical issues. | 1 week | Legal compliance + mission alignment |

### Month 2 — Engagement (Keep Students Coming Back)

| Priority | Feature | Effort | Impact |
|---|---|---|---|
| P1 | **Discussion forums** — Per-track, per-week discussion threads. Students can ask questions, help each other. Instructors can moderate. | 2 weeks | Community + peer learning |
| P1 | **Push notifications** — Web push for announcements, assignment reminders, new content. Use web-push API or OneSignal. | 1 week | Mobile engagement |
| P1 | **Progress certificates with shareable links** — LinkedIn-ready certificates with public verification URL. Already have certificates; make them shareable. | 3 days | Student motivation + marketing |
| P1 | **Admin content calendar** — Visual calendar showing what's scheduled across all tracks. Drag to reschedule. | 1 week | Instructor productivity |

### Month 3 — Scale (Prepare for Growth)

| Priority | Feature | Effort | Impact |
|---|---|---|---|
| P2 | **REST API** — Public API for enrollments, attendance, survey responses. API key auth. | 2 weeks | Enables integrations, partner orgs |
| P2 | **Funder dashboard** — Aggregate metrics across programs: enrollment trends, completion rates, demographic breakdowns. Export to PDF/CSV. | 2 weeks | Funder reporting (critical for nonprofit) |
| P2 | **Upstash Redis for rate limiting** — Swap in-memory rate limiter for Redis. Enables multi-instance scaling. | 2 days | Production scaling |
| P2 | **Mobile PWA** — Service worker, offline support for static content, install prompt. Not a native app but close. | 1 week | Mobile experience |

---

## What NOT to Build

| Feature | Why Skip It |
|---|---|
| Native mobile app | Too expensive ($50K+). PWA gets you 80% of the way. |
| In-browser coding environment | Replit/CodeSandbox do this better. Embed them. |
| Payment processing | Nonprofit — no revenue model needed. |
| LTI support | Complexity for complexity's sake. Build the API first. |
| Gradebook/rubrics | Overkill for the cohort model. Engagement scores are more useful. |
| AI tutoring | Already have the tutor API route. Polish it, don't rebuild it. |

---

## Strategic Positioning

BCC Academy isn't competing with Canvas or Moodle. It's not trying to be a general-purpose LMS. It's a **mission-specific platform** for running cohort-based tech education programs for underrepresented communities.

The moat is:
1. **Multi-program from one codebase** — no competitor does this at $0
2. **Survey + analytics pipeline** — funder-facing data that Canvas can't match
3. **Custom enrollment flow** — allowlist + invite + application, track-specific
4. **Human-in-the-loop philosophy** — not an AI-first platform, a human-first platform

The risk is:
1. **One developer maintains it** — bus factor of 1
2. **No content editor** — every curriculum change needs code
3. **No communication layer** — students have to leave the platform to talk
4. **Mobile is an afterthought** — in a mobile-first community

Fix the content editor and communication in Month 1, and BCC Academy becomes a genuinely differentiated product that no competitor can touch at the price point.

---

## Market Positioning Map

```
                    INSTITUTIONAL / ENTERPRISE
                           ▲
                           │
          Canvas ●         │         ● Absorb LMS
                           │
     Schoology ●           │      ● 360Learning
                           │
          Moodle ●         │         ● TalentLMS
                           │
   K-12 / YOUTH ◄─────────┼─────────► ADULT / WORKFORCE
                           │
     Google Classroom ●    │      ● Thinkific
                           │
        Code.org ●         │      ● Teachable
                           │
         Edmodo ●          │      ● freeCodeCamp
                           │              ● Scrimba
                           │
                           │         ● Replit Teams
                           │
                           ▼
                    CREATOR / SELF-PACED


    ★ BCC Academy = CENTER (institutional + youth + adult + workforce)
```

BCC Academy sits at the intersection of every quadrant — no other platform does this. That's the moat.
