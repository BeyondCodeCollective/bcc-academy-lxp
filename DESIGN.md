---
name: BCC Academy
description: Digital Learning Ecosystem — BCC as infrastructure, human in the lead
colors:
  primary: "#1a1a1a"
  accent: "#E54D2E"
  accent-dark: "#F0613E"
  surface-light: "#f5f5f7"
  surface-dark: "#1a1a1a"
  on-dark: "#ffffff"
  on-light: "#1a1a1a"
  card: "#ffffff"
  error: "#E54D2E"
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
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-dark}"
    typography: "{typography.label}"
    rounded: full
    padding: 12px 24px
  button-primary-dark:
    backgroundColor: "{colors.accent-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.label}"
    rounded: full
    padding: 12px 24px
  button-secondary:
    backgroundColor: transparent
    textColor: "{colors.on-light}"
    typography: "{typography.label}"
    rounded: full
    padding: 12px 24px
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.on-light}"
    rounded: "{rounded.xl}"
    padding: 24px
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.on-light}"
    rounded: "{rounded.md}"
    padding: 12px 16px
---

# BCC Academy Design System

## Overview

BCC Academy is a Digital Learning Ecosystem. The visual identity reflects the platform's core philosophy: human in the lead. Technology that makes space for people — not the other way around.

The aesthetic is Apple-inspired: clean hierarchy, deliberate whitespace, a single warm accent, and a dark/light rhythm that gives every section a clear purpose. Matte over glossy. Every element earns its place.

This design system is shared across BCC (Beyond Code Collective) and BGC (Black Girls Code) learning experiences on the platform.

## Colors

- **Primary / Surface-dark** (`#1a1a1a`): Dark section backgrounds and body text on light. Matte charcoal — never pure black `#000`.
- **Accent** (`#E54D2E`): CTAs, active states, progress, key interactive elements. Warm vermillion coral. Used sparingly — one dominant action per screen.
- **Accent-dark** (`#F0613E`): Accent variant for dark backgrounds to maintain contrast.
- **Surface-light** (`#f5f5f7`): Light section backgrounds — alternates with dark for visual rhythm.
- **Card** (`#ffffff`): Cards placed on light backgrounds only. White, no border.
- **On-dark** (`#ffffff`): Text and icons on dark surfaces.
- **On-light** (`#1a1a1a`): Text and icons on light surfaces.
- **Error** (`#E54D2E`): Validation errors and destructive action states.

Never use blue as an accent. Never use rainbow or purple-pink-blue AI gradients.

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
- **Primary** (light bg): `#E54D2E` fill, white text, `rounded-full`, Bricolage Grotesque or Plus Jakarta Sans Medium
- **Primary** (dark bg): `#F0613E` fill, white text, `rounded-full`
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
- One accent element per nav — the CTA button uses `#E54D2E`
- Active nav items: subtle underline or background tint, never blue
- No heavy borders or colored backgrounds on nav links

### Forms & Inputs
- Background: white or `#f5f5f7`
- Border: 1px `#d1d5db`, focus ring `#E54D2E`
- Labels: Plus Jakarta Sans, 14px, Medium, `#1a1a1a`
- Placeholder: `#9ca3af`
- Error state: `#E54D2E` border + error text below input

### Progress & Status
- Progress bar fill: `#E54D2E` on `#f5f5f7` track
- Completion states: use `#E54D2E` tint, not green
- Status badges: muted background, text conveys state — avoid traffic-light colors (red/yellow/green)

### Event Cards (Lunch & Learns / Workshops)
- Same card rules as above
- Event type label: Plus Jakarta Sans, 12px, Medium, uppercase, `#E54D2E`
- Date/time: Plus Jakarta Sans, 14px, `#6b7280`
- Title: Bricolage Grotesque, 20px, Semi-bold

## Do's and Don'ts

- **Do** use `#E54D2E` for the single most important action on each screen
- **Do** alternate dark/light sections for visual rhythm on marketing and landing pages
- **Do** use Bricolage Grotesque on marketing/landing surfaces and Archivo for in-app headings — Bricolage is the brand voice, Archivo is the product voice
- **Do** keep cards white on `#f5f5f7` — contrast replaces borders
- **Do** use matte surfaces throughout
- **Don't** use pure black (`#000`) — always use `#1a1a1a`
- **Don't** use blue as an accent color anywhere — not links, not buttons, not highlights
- **Don't** use rainbow gradients or purple-blue-pink AI aesthetics
- **Don't** add decorative elements without a functional purpose
- **Don't** use Inter, Roboto, or Open Sans
- **Don't** add borders to cards on light backgrounds
- **Don't** use glossy finishes, glow effects, or heavy box-shadows
- **Don't** mix sharp and rounded corners in the same component
