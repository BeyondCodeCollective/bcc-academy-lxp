# BCC Academy — Product Requirements Document

**Product:** BCC Academy (bccacademy.io)
**Owner:** Beyond Code Collective
**Last Updated:** April 7, 2026
**Status:** V1 — Active Development

---

## 1. Product Overview

BCC Academy is the learning experience platform for Beyond Code Collective (BCC). It provides human-facilitated, cohort-based tech education for learners ages 7 to 70+. Every learner is paired with a named human facilitator — not a chatbot, not a forum — who checks in weekly, adapts the learning plan, and holds the learner accountable.

The platform differentiates itself from self-paced online learning (Udemy, Coursera, YouTube) through a "Human in the Loop" model that drives a 95% completion rate versus the 3–15% industry average.

BCC Academy is proudly home to Black Girls Code.

**Note:** Community features (forums, discussion boards, peer networking) are out of scope for this product. Community engagement will be handled through Slack.

---

## 2. Target Audience

| Segment | Age Range | Description |
|---------|-----------|-------------|
| **Primary visitors** | 18–50 | Working adults, career changers, mid-career professionals actively browsing the site |
| **Explorers** | 7–17 | Youth discovering tech for the first time (parents/guardians are the decision-makers) |
| **Pivoters** | 25–50 | People with career experience outside of tech looking to transition |
| **Launchers** | 18–35 | Job seekers ready to land their first or next tech role |
| **Wisdom Leaders** | 45–70+ | Experienced professionals who want to mentor and teach |

---

## 3. Product Components

### 3.1 Marketing Landing Page (`/`)

The single-page marketing site that drives quiz completions and pathway enrollment.

**Current sections (in order):**

| # | Section | Purpose |
|---|---------|---------|
| 1 | **Header** | Fixed nav with BCC [Academy] logo, section links, "Take the Quiz" CTA, announcement banner (The Forge ATL) |
| 2 | **Hero** | Full-viewport video background with parallax, rotating headline ("Everyone BUILDS / GROWS / LEARNS / LEADS / BELONGS"), dual CTAs (quiz + pathways), infinite partner marquee |
| 3 | **Photo Strip** | Auto-scrolling horizontal strip of real BCC event photography. Grayscale by default, color on hover. Pauses on hover. |
| 4 | **Pathways** | Interactive pathway explorer — horizontal scroll-jacking on desktop (6 full-viewport panels), vertical card stack on mobile. Each of 5 pathways shown with image, icon, description, and CTAs. Quiz CTA on every panel. |
| 5 | **Human in the Loop** | Two-beat layout. Beat 1: dramatic 95% stat at viewport-scale typography with scroll zoom-through. Beat 2: three pedagogy principle cards in alternating 2-column layout with slide-in animations. |
| 6 | **Proof** | Full-bleed photo mosaic of real BCC imagery with independent parallax speeds. Honest messaging ("We just launched. Zero graduates. And that's the point."). Horizontal stat ticker with real numbers. "Be the First" CTA block. |
| 7 | **Our People** | Facilitator showcase — 4 facilitators with portrait images, bios, teaching focus, partner org, and years of experience. |
| 8 | **Hubs & Events** | The Forge ATL flagship hub (hero card with parallax image) + virtual learning option + 4 upcoming events in compact grid. |
| 9 | **FAQ** | Two-column layout — sticky left header with "Contact Us" CTA, right-side 6-question accordion with numbered items. |
| 10 | **Final CTA** | Closing call-to-action ("The future of tech doesn't start with code. It starts with someone who sees you.") + email capture form for newsletter. |
| 11 | **Footer** | 4-column layout: brand, pathways links, programs links, connect links + legal links. |

**Primary conversion goal:** Quiz completion → lead capture → pathway enrollment.

**Design system:**

| Token | Value |
|-------|-------|
| Primary | Cobalt `#1D59FF` |
| Accent | Electric Green `#E5F701` |
| Dark | True Black `#000000` |
| Light | Off-White `#FFFDF7` |
| Dark surface | Dark Cobalt `#012966` |
| Warm surface | Charcoal `#2F2F2F` |
| Display font | Special Gothic Condensed (variable) |
| Body font | Space Mono (monospace) |
| Secondary font | GT Standard |
| Corners | Sharp (no border-radius) |
| Bracket notation | `[ Like This ]` for labels |
| Grain texture | SVG noise overlay at 3% opacity on dark sections |

---

### 3.2 Career Quiz (`/quiz`)

An interactive career assessment tool that matches learners with one of 12 tech career personalities and recommends a learning pathway.

**Flow:**

```
Home Screen → Lead Capture → Questions (2) → Loading Animation → Results
```

**Screens:**

**1. Home Screen**
- Age selection: "Under 18" or "18+"
- Hero text explaining the 2-minute quiz
- "Start the Quiz" CTA

**2. Lead Capture**
- Email input (required)
- Phone number input (optional, toggle)
- Validation before proceeding
- This is the lead generation entry point

**3. Questions (2 total, 6 options each)**

| Question | Theme |
|----------|-------|
| "Your friend's computer dies right before a big deadline. What do you do?" | Problem-solving style |
| "You just won $10,000. What's your first thought?" | Motivation/values |

Each answer maps to a personality type via weighted voting. The most-selected personality wins.

**4. Loading Screen**
- 4-stage animated progression:
  1. "Analyzing your answers..."
  2. "Finding your strengths..."
  3. "Matching career paths..."
  4. "Building your roadmap..."

**5. Results Screen**
- Career title and tagline
- Salary range with visual chart (low / mid / high)
- Time-to-completion calculator (adjustable: 2, 4, or 6 hrs/day)
- Day-to-day responsibilities (5 bullet points)
- Recommended courses (different for youth vs. adult)
- "Send My Results" CTA
- "Retake Quiz" option

**12 Career Personalities:**

| Personality | Career Match | Salary Range |
|-------------|-------------|-------------|
| Fixer | IT Support Specialist | $45–75k |
| Architect | Data Analyst | $55–95k |
| Connector | Salesforce Administrator | $60–105k |
| Creator | UX Designer | $62–115k |
| Builder | Entrepreneur/Freelancer | $40–150k |
| Maker | Creative Technologist | $42–85k |
| Strategist | Project Manager | $65–120k |
| Guardian | Cybersecurity Analyst | $70–130k |
| Detective | Data Storyteller | $58–105k |
| Healer | AI for Social Impact Specialist | $48–90k |
| Educator | Technical Trainer | $52–95k |
| Advocate | Community Tech Coordinator | $45–85k |

---

### 3.3 Pathway Detail Pages (`/pathways/[slug]`)

Individual pages for each of the 5 learning pathways. Currently placeholder pages with basic pathway info. These will expand to include full curriculum details, facilitator assignments, enrollment flows, and learning module previews.

**5 Pathways:**

| Pathway | Slug | Stage | Target Learner |
|---------|------|-------|----------------|
| Explorers | `/pathways/explorers` | Just getting started | Youth (7-17), absolute beginners |
| Builders | `/pathways/builders` | Ready to create | Learners with basics who want to ship real projects |
| Launchers | `/pathways/launchers` | Breaking into tech | Job seekers ready for their first/next tech role |
| Pivoters | `/pathways/pivoters` | Changing direction | Career changers with non-tech experience |
| Wisdom Leaders | `/pathways/wisdom-leaders` | Sharing what you know | Experienced professionals who want to mentor |

**Current state:** Static pages generated at build time via `generateStaticParams()`. Display pathway name, stage, tagline, description, and icon. Full content marked as "coming soon."

---

## 4. Technical Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.6 (App Router, Turbopack) |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS 4 (`@theme inline` for design tokens) |
| Animation | Framer Motion 12.35 |
| Icons | Phosphor Icons (React) 2.1 |
| Fonts | next/font/local (Special Gothic, GT Standard) + next/font/google (Space Mono) |
| Analytics | Vercel Analytics + Google Analytics (G-KJF6CKFSTP) |
| Deployment | Vercel (static generation + SSG) |
| Images | Next.js Image optimization, local assets in `public/images/bcc/` |

### Data Architecture

All data is currently hardcoded in TypeScript files (`src/data/`). No database or CMS.

| File | Records | Description |
|------|---------|-------------|
| `pathways.ts` | 5 | Learning pathway definitions |
| `quiz.ts` | 12 personalities, 2 questions | Career quiz content and matching logic |
| `facilitators.ts` | 4 | Facilitator profiles |
| `events.ts` | 6 | Upcoming events |
| `testimonials.ts` | 3 | Learner testimonials |
| `partners.ts` | 11 | Partner/institution logos |

### Key Framer Motion Patterns

| Pattern | Usage |
|---------|-------|
| `useScroll` + `useTransform` | Parallax on hero video, section images, 95% stat zoom-through, horizontal scroll-jacking |
| `AnimatePresence` | Quiz screen transitions, pathway panel swaps, testimonial carousel |
| `whileInView` | Scroll-triggered section reveals (fadeInUp, slideInLeft/Right) |
| `staggerContainer` | Sequential child animations in lists and grids |

### Image Assets

| Directory | Contents | Count |
|-----------|----------|-------|
| `public/images/bcc/community/` | Event and cohort photos | 6 |
| `public/images/bcc/faces/` | Facilitator and team portraits | 14 |
| `public/images/bcc/initiatives/` | Program imagery (Forge, Catalysts) | 3 |
| `public/images/bcc/logos/` | BCC and partner logos | Multiple |
| `public/images/bcc/icons/` | Brand icon set | 5 |
| `public/images/bcc/` (root) | Hero photos (forge-panel, community-selfie, studying-together) | 4 |

### External Dependencies

| Resource | Type | Source |
|----------|------|--------|
| Hero background video | Pexels stock video | `videos.pexels.com/video-files/8198511/...` |
| Space Mono font | Google Fonts | Loaded via `next/font/google` |

---

## 5. Learning Experience Platform (Roadmap)

The landing page and quiz are the acquisition layer. The learning experience platform is the product learners use after enrollment.

### 5.1 Core Platform Requirements

**Facilitator Dashboard**
- View assigned learners and their progress
- Schedule and track weekly check-ins
- Flag at-risk learners (disengagement alerts powered by AI)
- Adapt learning plans per learner
- Message learners directly

**Learner Dashboard**
- View current pathway and progress
- Access learning modules and course content
- See upcoming check-in schedule
- Track certifications earned
- Access facilitator contact info

**Learning Modules**
- Structured curriculum per pathway
- Integration with partner content (CompTIA, Salesforce, Google certifications)
- Progress tracking per module
- Project-based assignments
- Cohort-based pacing (not self-paced)

**AI-Powered Insights (Facilitator Tool)**
- Learning velocity tracking
- Early disengagement detection
- Personalized content recommendations
- All interventions surfaced to the human facilitator — AI does not contact learners directly

### 5.2 Enrollment Flow (To Be Built)

```
Quiz Results → Select Pathway → Create Account → Lead Capture → Facilitator Assignment → Onboarding
```

### 5.3 Certification Tracking

Learners earn industry-recognized credentials through partner programs:
- CompTIA (Tech+, Network+, Security+)
- Salesforce (Administrator, Platform Developer)
- Google (Data Analytics, UX Design, IT Support)

The platform should track certification progress and display earned credentials on the learner profile.

---

## 6. Partner & Facilitator Ecosystem

### Current Facilitators (4)

| Name | Organization | Teaches | Experience |
|------|-------------|---------|------------|
| Dr. Maya Johnson | UC Berkeley | Data Science & Analytics | 18 years |
| Prof. Alex Chen | MIT / RAICA | Creative AI & Machine Learning | 14 years |
| A.D. Carson | Rap Research Lab | Data Science + Culture | 12 years |
| Jordan Rivera | Figma | UX/UI Design | 10 years |

### Current Partners (11)

MIT, UC Berkeley, IBM, Salesforce, Zapier, Figma, CompTIA, ASU, Apple, ATDC, Rap Research Lab

---

## 7. Physical Hubs

| Hub | Status | Location |
|-----|--------|----------|
| The Forge ATL | **Now Open** | Atlanta, GA |
| The Forge NYC | Coming Soon (2026) | New York, NY |
| The Forge LA | Coming Soon (2026) | Los Angeles, CA |
| The Forge Bay Area | Coming Soon (2026) | San Francisco Bay Area, CA |

All programs are available virtually. Physical hubs are optional — learners can participate from anywhere.

---

## 8. Community (Out of Scope)

Community features are **not** part of the BCC Academy platform. Peer networking, discussion, and social engagement will be facilitated through **Slack**. The BCC Academy product focuses exclusively on the learning experience: pathway enrollment, facilitator matching, curriculum delivery, progress tracking, and certification.

---

## 9. Analytics & Tracking

| Tool | Purpose |
|------|---------|
| Vercel Analytics | Page views, web vitals, deployment performance |
| Google Analytics (G-KJF6CKFSTP) | User behavior, conversion funnels, traffic sources |

### Key Conversion Events to Track

| Event | Trigger |
|-------|---------|
| `quiz_started` | User clicks "Start the Quiz" |
| `lead_captured` | User submits email on lead capture screen |
| `quiz_completed` | User reaches results screen |
| `results_sent` | User clicks "Send My Results" |
| `pathway_explored` | User clicks into a pathway detail page |
| `cta_clicked` | User clicks any enrollment CTA |
| `newsletter_subscribed` | User submits email in footer capture |

---

## 10. SEO & Metadata

| Field | Value |
|-------|-------|
| Title | BCC Academy — Every Step, Someone's With You |
| Description | A global, intergenerational learning ecosystem for ages 7 to 70+. Every learner gets a real human facilitator. 95% completion rate. Proudly home to Black Girls Code. |
| OG Type | website |
| Twitter Card | summary_large_image |
| Robots | index, follow |

---

## 11. Current State & Known Issues

### What's Built
- Full marketing landing page with 8 sections + header/footer
- Interactive career quiz with 12 personality types and lead capture
- 5 pathway detail pages (placeholder content)
- Responsive design (mobile + desktop)
- Scroll-driven animations (parallax, horizontal scroll-jacking, counters)
- Real BCC photography integrated throughout
- Analytics (Vercel + Google)

### What Needs Work
- **Landing page visual design** — Current iteration needs refinement. Too cluttered in some sections, typography/spacing needs tightening. A design reference is being sourced for the next iteration.
- **Pathway detail pages** — Currently placeholder ("coming soon"). Need full curriculum previews, facilitator info, and enrollment CTAs.
- **Enrollment flow** — No account creation, payment, or facilitator assignment exists yet.
- **Learning platform** — The actual LMS/learning dashboard is not built. This is the core product to be developed.
- **Video content** — Hero uses stock video from Pexels. Should be replaced with original BCC content.
- **Image optimization** — Some images are very large (community-selfie.png is 35MB). Need compression.
- **Lead capture backend** — Quiz captures email/phone on the frontend but has no backend integration (no database, no email service).

---

## 12. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Quiz completion rate | > 70% of starts | GA funnel |
| Lead capture rate | > 50% of quiz starters | GA event |
| Pathway page visits | > 30% of landing page visitors | GA pageview |
| Time on site | > 3 minutes | GA |
| Mobile bounce rate | < 50% | GA |
| Facilitator-to-learner ratio | 1:15 max | Platform metric |
| Learner completion rate | 95% | Platform metric |
