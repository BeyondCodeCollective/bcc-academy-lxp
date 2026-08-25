---
name: ui-preflight
description: Pre-launch UI sweep — screenshot the changed surfaces at phone/tablet/desktop widths, auto-flag overflow and broken images, then visually review every frame for clipped text, cramped dropdowns, overlap, and boundary violations. Use before shipping any learner- or admin-facing UI change, or when asked to check responsiveness/mobile.
---

# UI Preflight

Catch the small UI breakages — text over the edge, dropdowns that don't fit,
images that don't load, layouts that fall apart on a phone — BEFORE a change
goes live.

## 1. Decide what to sweep

List every route the change touches, plus any route that shares the components
you edited. Don't sweep only the happy path — completion screens, empty states,
and gated/holding views count.

Pick the account that actually sees those routes:
- Learner surfaces → the throwaway test learner
  (`node scripts/make-mass-test-student.mjs 3001` creates/reset it; adapt the
  pattern for other tracks). NEVER walk flows as the real admin account —
  submissions write real rows.
- Public routes (`/apply/*`, `/survey/*`, `/bcc/*`) → no email needed.

## 2. Run the sweep

```sh
node scripts/ui-preflight.mjs --email <account> [--base http://localhost:3001] /route [/route ...]
```

It screenshots each route at 375px (real mobile emulation), 768px, and 1440px
into `/tmp/ui-preflight/`, and prints mechanical findings: horizontal page
overflow, elements crossing the right edge, broken images.

Check which port the dev server is on first (`curl -s localhost:3001` — the
repo often has other apps on 3000).

## 3. Review EVERY screenshot

Read each PNG. "No mechanical findings" is not a pass — the automated checks
can't see most of what matters. Look for:

- **Text**: clipped, truncated mid-word, overflowing its card, overlapping a
  neighbor, orphaned single words on their own line at 375px.
- **Dropdowns / selects**: wider than the viewport, labels squeezed, options
  cut off, native pickers misaligned with their label.
- **Touch targets**: buttons wrapped onto two lines, controls closer than a
  fingertip, footers overlapping content.
- **Images/logos**: missing, stretched, wrong aspect, blurry upscales.
- **Boundaries**: cards touching the viewport edge, fixed elements (modals,
  banners, FABs) covering content, sticky footers hiding the last field.
- Ignore the dark circular "N" badge — that's the Next.js dev-tools button,
  dev-only.

## 4. Interactions the static sweep can't reach

Modals, wizard pages past page 1, dropdowns open, error states: drive them with
a short throwaway Playwright script (import `chromium` from `@playwright/test`,
run from the repo root so node_modules resolves) at 375px, screenshot, review
the same way. Delete the script after.

## 5. Fix and re-run

Fix what you find, re-run the sweep on the affected routes, and confirm the
frames are clean before reporting done. Report anything you chose not to fix
(pre-existing, out of scope) explicitly.
