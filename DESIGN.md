---
name: BCC Academy
description: Digital Learning Ecosystem — BCC as infrastructure, human in the lead
# BCC Academy palette — as implemented in globals.css. NOT the fonz.sh
# personal palette: vermillion coral (#E54D2E / #F0613E) belongs to
# fonz.sh and must never appear on BCC Academy surfaces.
colors:
  primary: "#1D59FF" # BCC cobalt — CTAs, active states, links
  primary-hover: "#1448CC"
  highlight: "#E5F701" # electric green — live/active accents; filled shapes only, never text on white
  background: "#f5f5f7" # page body
  paper: "#fafafb" # dashboard canvas
  surface-elevated: "#ffffff" # panel cards
  surface-soft: "#f0f0f2"
  ink: "#1a1a1a" # text + dark surfaces (never pure #000)
  ink-soft: "#555555"
  ink-faint: "#717177"
  rule: "#e5e5e5" # hairlines
  program-bgc: "#7C3AED" # Black Girls Code program accent (per-program theming)
  never:
    - "#E54D2E — fonz.sh coral, not BCC"
    - "#F0613E — fonz.sh coral (dark variant), not BCC"
typography:
  # Two type worlds by design (June 2026 platform pass): Bricolage carries
  # the brand on marketing/landing surfaces (+ the holding-page hero, which
  # echoes the landing page); Archivo carries in-app headings; body is the
  # SF/system stack with Geist as webfont fallback. Plus Jakarta Sans was
  # retired in that pass and is no longer loaded.
  display: # marketing/landing pages + pre-launch holding hero
    fontFamily: Bricolage Grotesque
    fontWeight: 700
    lineHeight: 1.1
  heading: # in-app h1–h6 (set globally in globals.css)
    fontFamily: Archivo
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.02em
  body:
    fontFamily: -apple-system, SF Pro Text, Geist, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: -apple-system, SF Pro Text, Geist, sans-serif
    fontSize: 14px
    fontWeight: 500
  mono:
    fontFamily: Geist Mono
    fontSize: 14px
    fontWeight: 400
rounded:
  sm: 6px
  md: 10px
  lg: 16px
  xl: 24px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  2xl: 96px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: full
    padding: 12px 24px
  button-dark:
    backgroundColor: "{colors.ink}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: full
    padding: 12px 24px
  button-secondary:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: full
    padding: 12px 24px
  card:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 24px
  input:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 12px 16px
---

# BCC Academy Design System

## Overview

BCC Academy is a Digital Learning Ecosystem. The visual identity reflects the platform's core philosophy: human in the lead. Technology that makes space for people — not the other way around.

The aesthetic is Apple-inspired: clean hierarchy, deliberate whitespace, a single warm accent, and a dark/light rhythm that gives every section a clear purpose. Matte over glossy. Every element earns its place.

This design system is shared across BCC (Beyond Code Collective) and BGC (Black Girls Code) learning experiences on the platform.

## Colors

BCC Academy's implemented palette (see `globals.css` — the single source of truth):

- **Primary / BCC cobalt** (`#1D59FF`, hover `#1448CC`): CTAs, active states, links, focus rings. The one interactive accent.
- **Highlight / electric green** (`#E5F701`): live/active moments (LIVE badges, "You're in"). Loud — filled shapes and borders only, never text on white.
- **Ink** (`#1a1a1a` / soft `#555555` / faint `#717177`): text hierarchy and dark surfaces. Matte charcoal — never pure black `#000`.
- **Background** (`#f5f5f7`) / **Paper** (`#fafafb`): page body and dashboard canvas — barely-there neutrals so white panels pop.
- **Surface-elevated** (`#ffffff`): panel cards, separated by hairline rules (`#e5e5e5`), not shadows.
- **Program accents**: each org themes its own shell (Black Girls Code `#7C3AED` purple). Program accents live in program config, never hardcoded in shared components.

**Never on BCC Academy surfaces:** vermillion coral `#E54D2E` / `#F0613E` — that is the fonz.sh personal-site palette, not this platform's. Never rainbow or purple-pink-blue AI gradients.

## Typography

Two type worlds, each with a clear role — this is the system as implemented
since the June 2026 platform-wide design pass. Never use Inter, Roboto, or
Open Sans. (Plus Jakarta Sans was retired in that pass and is no longer
loaded; older references to it are historical.)

- **Bricolage Grotesque** — the *marketing* display face: public landing
  pages (`/bcc/*`) and the pre-launch holding-page hero, which deliberately
  echoes the landing page the learner registered on. Carries the brand
  voice: bold, contemporary, human. Load via `next/font/google`.
- **Archivo** — the *in-app* heading face: every h1–h6 across the dashboard
  and admin, applied globally in `globals.css` with -0.02em tracking.
  Editorial weight on top of the system body.
- **SF / system stack** (`-apple-system…`, Geist as webfont fallback) —
  body text, UI labels, navigation, forms, everything functional.
- **Geist Mono** — code blocks, IDs, and tabular numbers (countdowns,
  stats) only.

**Scale:**

| Role | Size | Weight | Family |
|---|---|---|---|
| Display / Hero (marketing + holding hero) | 56–96px | Extra Bold (800) | Bricolage Grotesque |
| H1 (in-app) | 40–48px | Bold (700) | Archivo |
| H2 (in-app) | 28–36px | Semi-bold (600) | Archivo |
| H3 (in-app) | 20–24px | Semi-bold (600) | Archivo |
| Body | 16px | Regular (400) | SF / system stack |
| Label / Small | 14px | Medium (500) | SF / system stack |
| Caption | 12px | Medium (500) | SF / system stack |
| Code / tabular numbers | 14px | Regular (400) | Geist Mono |

## Layout

Sections alternate dark (`#1a1a1a`) and light (`#f5f5f7`). This rhythm creates breathing room and signals transitions between ideas — it is not decorative, it is structural.

- Max content width: 1200px, centered
- Section vertical padding: 96px desktop, 64px mobile
- Grid: 12-column, 24px gutters desktop
- Cards live on light backgrounds only — white cards on `#f5f5f7`

## Elevation & Depth

No gloss. No glow. Depth is expressed through:
- Background contrast between dark and light sections
- Subtle shadow (`shadow-sm` or `shadow-md`) on cards
- Scale on hover (`transform: scale(1.01–1.02)`)

Never use colored drop shadows, inner glows, or heavy box-shadows.

## Shapes

Consistent rounding is a signal of quality. Never mix sharp and rounded corners in the same component.

- Primary CTA buttons: `rounded-full`
- Secondary buttons: `rounded-full`
- Cards: `rounded-xl` (24px)
- Form inputs: `rounded-lg` (10px)
- Tags / chips / badges: `rounded-full`
- Modals: `rounded-2xl` (20px)

## Components

### Buttons
- **Primary**: `#1D59FF` fill, white text (hover `#1448CC`)
- **Dark**: `#1a1a1a` fill, white text — the app's default strong button (`buttonClass("dark")`)
- **Secondary**: transparent fill, `#1a1a1a` border + text on light; white border + text on dark
- **Ghost**: no border, text only, hover adds light background
- Minimum tap target: 44px height

### Cards
- White background, no border, `rounded-xl`
- Padding: 24–32px
- Placed on `#f5f5f7` sections only
- Hover: shadow lift + `scale(1.01)` transition

### Navigation
- Dark nav bar (`#1a1a1a` background), white text
- One accent element per nav — active/live states may use the `#E5F701` highlight as a filled shape
- Active nav items: subtle underline or background tint
- No heavy borders or colored backgrounds on nav links

### Forms & Inputs
- Background: white or `#f5f5f7`
- Border: 1px `#e5e5e5`, focus ring `#1D59FF`
- Labels: 14px, Medium, `#1a1a1a`
- Placeholder: `#9ca3af`
- Error state: red-600 border + error text below input

### Progress & Status
- Progress bar fill: `#1D59FF` on `#f0f0f2` track
- Completion states: green-50/green-600 chip (see the Certificates + attendance patterns)
- Status badges: muted background, text conveys state — avoid traffic-light colors (red/yellow/green)

### Event Cards (Lunch & Learns / Workshops)
- Same card rules as above
- Event type label: 12px, Medium, uppercase, `#1D59FF`
- Date/time: Plus Jakarta Sans, 14px, `#6b7280`
- Title: Bricolage Grotesque, 20px, Semi-bold

## Do's and Don'ts

- **Do** use `#1D59FF` for the single most important action on each screen
- **Do** alternate dark/light sections for visual rhythm on marketing and landing pages
- **Do** use Bricolage Grotesque on marketing/landing surfaces and Archivo for in-app headings — Bricolage is the brand voice, Archivo is the product voice
- **Do** keep cards white on `#f5f5f7` — contrast replaces borders
- **Do** use matte surfaces throughout
- **Don't** use pure black (`#000`) — always use `#1a1a1a`
- **Don't** use vermillion coral `#E54D2E`/`#F0613E` anywhere — that is fonz.sh branding, not BCC Academy
- **Don't** use rainbow gradients or purple-blue-pink AI aesthetics
- **Don't** add decorative elements without a functional purpose
- **Don't** use Inter, Roboto, or Open Sans
- **Don't** add borders to cards on light backgrounds
- **Don't** use glossy finishes, glow effects, or heavy box-shadows
- **Don't** mix sharp and rounded corners in the same component
