# BCC Academy — PRODUCT.md

## Register

product — app UI (learner dashboard + admin panel). Design serves the product. The
public apex/landing pages are the one brand-register exception; treat them per-task.

## Platform

web — Next.js (App Router) on Vercel.

## What it is

BCC Academy is a Digital Learning Ecosystem. BCC (Beyond Code Collective) is the
infrastructure; programs and tracks (CompTIA Security+/Network+/Tech+, AI
Fundamentals, MASS Wraparound, camps, Lunch & Learns) run on top of it. Built in
partnership with BGC (Black Girls Code); both orgs serve their communities on the
shared platform via per-program theming.

## Users

- **Learners** — students in cohort tracks and camps; check schedules, join Zoom
  sessions, submit work, reflect, chat with the tutor, earn certificates.
- **Instructors** — view-only on their assigned course rosters; manage session
  content, attendance, announcements for their tracks only.
- **Program admins / super-admins** — BCC staff who manage rosters, allowlists,
  courses, surveys, analytics, and board reporting across programs.

## Purpose & positioning

Give small, high-touch education programs the operational backbone of a large LMS
without the bloat: one hub (Catalyst) for enrollment, live sessions, engagement
tracking, and outcomes reporting. Positioning: human in the lead — technology
makes space for people, not the other way around.

## Desired outcome

Learners show up and finish (attendance, submissions, certificates). Staff see
honest engagement signals at a glance (never a zero that means "we didn't record
it"). Funders/board see credible outcome numbers.

## Brand personality

Human-first, warm but disciplined. Apple-inspired restraint: clean hierarchy,
deliberate whitespace, matte over glossy, one interactive accent (BCC cobalt
#1D59FF), electric-green highlight reserved for live/active moments. Archivo
carries every heading; the system stack carries the work.

## Anti-references

- Rainbow / purple-blue-pink AI gradients; glossy SaaS dashboard clichés.
- fonz.sh vermillion coral (#E54D2E / #F0613E) — different brand, never here.
- Traffic-light status colors; hero-metric templates; decorative glassmorphism.
- Inter/Roboto/Open Sans; Bricolage Grotesque and Plus Jakarta Sans are retired.

## Accessibility

WCAG AA contrast; 44px touch targets; keyboard focus visible (cobalt ring);
learner audience includes school-age students (BGC camps) — plain language,
low-jargon UX copy on learner surfaces.

## Design principles

1. Every element earns its place — no decoration without function.
2. Depth via contrast and hairlines, not shadows and glow.
3. Honest numbers: metrics reflect what was recorded, phrased for the phase
   (enrolled → active → completed).
4. Shared components over one-offs; DESIGN.md and globals.css are the source of
   truth for tokens.
