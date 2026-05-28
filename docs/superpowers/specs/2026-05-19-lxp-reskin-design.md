# LXP Dashboard Reskin — Design Spec

**Date:** 2026-05-19  
**Status:** Approved  
**Scope:** LXP dashboard only — marketing site (`marketing-scope`) is untouched.

---

## Goal

Replace the warm cream/beige palette on the LXP dashboard with a clean neutral palette aligned to the BCC brand. Remove all rounded corners from dashboard UI elements. The result should feel cohesive with the marketing site's bold identity without copying its dark/electric-green aesthetic.

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Color direction | Clean neutral + BCC cobalt | Professional, readable, brand-consistent |
| Border radius | 0 (sharp edges throughout) | Matches BCC brand's angular, urban-tech identity |
| Fonts | Keep current (Geist Sans + Space Mono) | Color-only change; font swap is separate scope |
| Marketing site | Untouched | Stays in `.marketing-scope` isolation |
| Electric green | Excluded | Too bold for a learning app shell |

---

## Token Changes (`globals.css`)

All changes are to CSS custom properties in `:root`. The `@theme inline` block propagates them to Tailwind utilities automatically.

| Token | Before | After |
|---|---|---|
| `--background` / `--paper` | `#F7F4EE` | `#f5f5f7` |
| `--surface-soft` / `--paper-tint` | `#FBFAF6` / `#EFEAE0` | `#f0f0f2` / `#ebebed` |
| `--paper-tint-soft` | `#F2EDE0` | `#f5f5f7` |
| `--ink` | `#1F1B16` | `#1a1a1a` |
| `--ink-soft` | `#6B6258` | `#555555` |
| `--ink-faint` | `#9B9388` | `#888888` |
| `--rule` | `#E7E1D2` | `#e5e5e5` |
| `--rule-soft` | `#EFEAE0` | `#eeeeee` |
| `--primary` | `#2E75B6` | `#1D59FF` |
| `--primary-hover` | `#245d94` | `#1448CC` |
| `--accent` | `#D4A843` | `#E54D2E` |
| `--cream` | `#fdf5de` | `#f5f5f7` (aliased, not removed) |

---

## Border Radius Removal

All `rounded-*` Tailwind classes in dashboard components are removed or replaced with `rounded-none`. Sharp edges apply to:

- Track cards (`track-card.tsx`) — `rounded-xl` → removed; add top accent border per track tone
- Nav items (`nav.tsx`) — `rounded-lg` → removed; active item gets `border-l-2 border-primary` indicator
- Dashboard cards (inline in `dashboard/page.tsx`) — `rounded-xl` → removed
- Announcement blocks — already use `rounded-0` on left side; remove right-side radius
- Progress bar — `rounded-full` → `rounded-none`
- Survey card (`SurveyCard`) — `rounded-xl` → removed
- Single event card — no change needed (no radius classes)
- Onboarding form, welcome overlay — `rounded-*` → removed where present

**Cards get a top accent border** (2px, track tone color) in place of rounded corners to preserve per-track identity.

---

## Components in Scope

| File | Changes |
|---|---|
| `src/app/globals.css` | Token swap (primary change) |
| `src/components/nav.tsx` | Remove `rounded-lg` from nav items; add left-border active indicator |
| `src/components/track-card.tsx` | Remove `rounded-xl`; add `border-t-2` with track tone color |
| `src/components/track-grid.tsx` | Check for any radius classes |
| `src/app/dashboard/page.tsx` | Remove `rounded-xl` from inline cards, announcement, progress bar |
| `src/components/onboarding-form.tsx` | Remove `rounded-*` |
| `src/components/welcome-overlay.tsx` | Remove `rounded-*` if present |
| `src/components/survey-wizard.tsx` | Remove `rounded-*` if present |
| `src/components/user-menu.tsx` | Remove `rounded-*` if present |

---

## What Does NOT Change

- Marketing site tokens and `.marketing-scope` wrapper — fully isolated
- Nav sidebar background (`#1a1a1a`) — already charcoal, stays
- Blue announcement blocks — kept per user preference (see project memory)
- Fonts — Geist Sans + Space Mono unchanged
- Track tone colors (`TRACK_TONES` array in `track-card.tsx`) — unchanged
- `border-radius` on browser-chrome elements (avatars, pills on status badges) — preserve for readability

---

## Testing

Run `npm run dev` and verify:
1. Dashboard page — no cream/beige, no rounded cards
2. Nav — active item shows left cobalt stripe, not pill highlight
3. Progress bar — square ends, cobalt fill
4. Track cards — sharp corners, top accent border visible
5. Marketing site (`/` homepage) — completely unchanged
6. Dark mode / high contrast OS settings — still readable
