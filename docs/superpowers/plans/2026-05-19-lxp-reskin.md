# LXP Dashboard Reskin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the LXP dashboard's warm cream/beige palette with clean neutrals + BCC cobalt, and remove all border-radius from panels, cards, and nav items.

**Architecture:** Token swap in `globals.css` propagates through all CSS variables automatically. Per-component passes remove `rounded-*` Tailwind classes and add sharp replacements (top accent borders on cards, left-stripe active indicator on nav). Marketing site and avatar/dot elements are untouched.

**Tech Stack:** Next.js 16, Tailwind CSS v4, CSS custom properties, `npm run dev` on port 3000 for visual verification.

---

## Files Modified

| File | What changes |
|---|---|
| `src/app/globals.css` | All `:root` color tokens — primary change |
| `src/components/track-card.tsx` | Remove `rounded-xl`, add `border-t-2` top accent |
| `src/components/nav.tsx` | Remove `rounded-lg` from items; add `border-l-2` active indicator |
| `src/components/track-grid.tsx` | Remove `rounded-xl` from empty state; flatten filter pills |
| `src/app/dashboard/page.tsx` | Remove `rounded-xl`/`rounded-full` from inline cards, progress bar, announcement, survey card |
| `src/components/onboarding-form.tsx` | Remove `rounded-2xl`/`rounded-xl` from modal and track items |
| `src/components/user-menu.tsx` | Remove `rounded-xl`/`rounded-lg` from popover and menu items |

**Not touched:** `.marketing-scope`, avatar `rounded-full` (must stay circular), status badge pills on track cards (`rounded-full` — small functional element), `rounded-full` on dot indicators.

---

## Task 1: Token swap — `globals.css`

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Update `:root` color tokens**

Replace the entire `:root` block (lines 3–33) with:

```css
:root {
  --background: #f5f5f7;
  --surface-elevated: #ffffff;
  --surface-soft: #f0f0f2;
  --foreground: #1a1a1a;
  --primary: #1D59FF;
  --primary-hover: #1448CC;
  --accent: #E54D2E;
  --cream: #f5f5f7;
  --muted: #888888;
  --muted-bg: #ebebed;
  --border: #e5e5e5;

  --paper: #f5f5f7;
  --paper-tint: #ebebed;
  --paper-tint-soft: #f0f0f2;
  --ink: #1a1a1a;
  --ink-soft: #555555;
  --ink-faint: #888888;
  --rule: #e5e5e5;
  --rule-soft: #eeeeee;
}
```

- [ ] **Step 2: Verify on dev server**

Open `http://localhost:3000/dashboard`. The main area background should now be light grey (`#f5f5f7`) — no more warm cream. The sidebar stays dark (it doesn't use these tokens). If cream is still showing, hard-refresh (Cmd+Shift+R).

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style: swap LXP palette to clean neutral + BCC cobalt"
```

---

## Task 2: Track card — sharp corners + top accent border

**Files:**
- Modify: `src/components/track-card.tsx`

- [ ] **Step 1: Update the card wrapper**

Find line 86:
```tsx
className="group flex h-full flex-col overflow-hidden rounded-xl border border-rule bg-surface-soft transition-colors hover:border-ink-faint hover:bg-paper-tint-soft"
```

Replace with:
```tsx
className="group flex h-full flex-col overflow-hidden border-t-2 bg-surface-soft transition-colors hover:bg-paper-tint-soft"
style={{ borderTopColor: tone }}
```

- [ ] **Step 2: Add a bottom/side border so cards have definition**

The card still needs a visible edge against the grey background. Add a wrapping border via a parent or add `border border-rule border-t-0` alongside the top accent. Full replacement for line 86:

```tsx
className="group flex h-full flex-col overflow-hidden border border-rule bg-surface-soft transition-colors hover:bg-paper-tint-soft"
style={{ borderTopColor: tone, borderTopWidth: '2px' }}
```

- [ ] **Step 3: Remove the rounded icon background pill on status badge (line 99)**

Find:
```tsx
className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold backdrop-blur"
```

Status badges are small functional elements — keep their `rounded-full`. No change needed here.

- [ ] **Step 4: Verify on dev server**

Open `http://localhost:3000/dashboard`. Track cards should have sharp corners with a colored top border matching each track's tone (vermillion, blue, etc.). No pill-shaped card corners.

- [ ] **Step 5: Commit**

```bash
git add src/components/track-card.tsx
git commit -m "style: track cards — sharp corners, top accent border"
```

---

## Task 3: Nav — sharp items + cobalt active indicator

**Files:**
- Modify: `src/components/nav.tsx`

- [ ] **Step 1: Update `renderItem` active/inactive classes (line 144)**

Find:
```tsx
className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
  active
    ? "bg-white/15 text-white"
    : "text-neutral-300 hover:bg-white/10 hover:text-white"
}`}
```

Replace with:
```tsx
className={`flex min-h-[44px] items-center gap-3 px-3 py-2 text-sm font-medium transition-colors ${
  active
    ? "border-l-2 border-primary bg-white/10 text-white pl-[10px]"
    : "border-l-2 border-transparent text-neutral-300 hover:bg-white/10 hover:text-white pl-[10px]"
}`}
```

Note: `pl-[10px]` compensates for the 2px border so text doesn't jump on active toggle (`px-3` = 12px → 12px - 2px border = 10px remaining left padding).

- [ ] **Step 2: Update help link (line 165)**

Find:
```tsx
className={`flex min-h-[40px] items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
  helpActive
    ? "text-neutral-200"
    : "text-neutral-500 hover:text-neutral-300"
}`}
```

Replace with:
```tsx
className={`flex min-h-[40px] items-center gap-2.5 px-3 py-1.5 text-[13px] transition-colors ${
  helpActive
    ? "text-neutral-200"
    : "text-neutral-500 hover:text-neutral-300"
}`}
```

- [ ] **Step 3: Update curriculum week links (line 227)**

Find:
```tsx
className={`flex min-h-[36px] items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
  isActive
    ? "bg-white/15 text-white"
    : isCurrent
      ? "text-white hover:bg-white/10"
      : isFuture
        ? "text-neutral-600 hover:bg-white/5 hover:text-neutral-400"
        : "text-neutral-400 hover:bg-white/10 hover:text-neutral-200"
}`}
```

Replace with:
```tsx
className={`flex min-h-[36px] items-center gap-2.5 px-3 py-1.5 text-[13px] transition-colors ${
  isActive
    ? "border-l-2 border-primary bg-white/10 text-white pl-[10px]"
    : isCurrent
      ? "border-l-2 border-transparent text-white hover:bg-white/10 pl-[10px]"
      : isFuture
        ? "border-l-2 border-transparent text-neutral-600 hover:bg-white/5 hover:text-neutral-400 pl-[10px]"
        : "border-l-2 border-transparent text-neutral-400 hover:bg-white/10 hover:text-neutral-200 pl-[10px]"
}`}
```

- [ ] **Step 4: Update lunch-learn recording links (line 280)**

Find:
```tsx
className={`flex min-h-[36px] items-start gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
  isActive
    ? "bg-white/15 text-white"
    : "text-neutral-300 hover:bg-white/10 hover:text-white"
}`}
```

Replace with:
```tsx
className={`flex min-h-[36px] items-start gap-2.5 px-3 py-1.5 text-[13px] transition-colors ${
  isActive
    ? "border-l-2 border-primary bg-white/10 text-white pl-[10px]"
    : "border-l-2 border-transparent text-neutral-300 hover:bg-white/10 hover:text-white pl-[10px]"
}`}
```

- [ ] **Step 4b: Update topbar variant nav links (lines 339, 351)**

Find (line ~339):
```tsx
className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
```

Replace with:
```tsx
className={`px-3 py-1.5 text-sm font-medium transition-colors ${
```

Find (line ~351):
```tsx
className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
```

Replace with:
```tsx
className={`px-3 py-1.5 text-sm transition-colors ${
```

- [ ] **Step 4c: Update mobile icon buttons (lines 376, 408, 545, 577)**

All four share the same pattern. Find each:
```tsx
className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-neutral-200 hover:bg-white/10 hover:text-white transition-colors"
```
and:
```tsx
className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
```

Replace each by removing `rounded-lg` (the element becomes a square touch target):
```tsx
className="flex min-h-[44px] min-w-[44px] items-center justify-center text-neutral-200 hover:bg-white/10 hover:text-white transition-colors"
```
```tsx
className="flex min-h-[44px] min-w-[44px] items-center justify-center text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
```

- [ ] **Step 5: Update UserMenu sidebar trigger (line 135)**

Find:
```tsx
className="flex w-full min-h-[44px] items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
```

Replace with:
```tsx
className="flex w-full min-h-[44px] items-center gap-2.5 px-2 py-1.5 text-left transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
```

- [ ] **Step 6: Verify on dev server**

Open `http://localhost:3000/dashboard`. Active nav item should show a cobalt left stripe, no pill highlight. Non-active items should be flush. Curriculum week links follow the same pattern.

- [ ] **Step 7: Commit**

```bash
git add src/components/nav.tsx
git commit -m "style: nav — sharp items, cobalt left-border active indicator"
```

---

## Task 4: Dashboard page inline components

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Remove rounded from "no cohort" and "not enrolled" cards (lines 225, 261)**

Find both instances of:
```tsx
className="rounded-xl border border-neutral-200 bg-white p-6 sm:p-8 text-center"
```

Replace with:
```tsx
className="border border-rule bg-surface-elevated p-6 sm:p-8 text-center"
```

Also on line 278:
```tsx
className="rounded-xl border border-neutral-200 bg-white p-5"
```
Replace with:
```tsx
className="border border-rule bg-surface-elevated p-5"
```

And the week-preview items (line 286):
```tsx
className="flex flex-col items-center rounded-lg bg-neutral-50 p-3 text-center"
```
Replace with:
```tsx
className="flex flex-col items-center bg-muted-bg p-3 text-center"
```

- [ ] **Step 2: Flatten the progress bar (lines 354–358)**

Find:
```tsx
<div className="h-1.5 w-full overflow-hidden rounded-full bg-rule">
  <div
    className="h-full rounded-full bg-ink transition-all"
```

Replace with:
```tsx
<div className="h-1.5 w-full overflow-hidden bg-rule">
  <div
    className="h-full bg-primary transition-all"
```

(Also updates the fill to cobalt `bg-primary` instead of charcoal `bg-ink`.)

- [ ] **Step 3: Flatten the announcement block (line 330)**

Find:
```tsx
className="rounded-xl border-l-2 border-blue-500 bg-blue-50 px-4 py-3 sm:px-5 sm:py-4"
```

Replace with:
```tsx
className="border-l-2 border-blue-500 bg-blue-50 px-4 py-3 sm:px-5 sm:py-4"
```

- [ ] **Step 4: Flatten the SurveyCard (line 416)**

Find:
```tsx
className="group block rounded-xl border-l-2 border-amber-500 bg-amber-50 px-4 py-3 sm:px-5 sm:py-4 transition-colors hover:bg-amber-100/70"
```

Replace with:
```tsx
className="group block border-l-2 border-amber-500 bg-amber-50 px-4 py-3 sm:px-5 sm:py-4 transition-colors hover:bg-amber-100/70"
```

- [ ] **Step 5: Update icon containers in empty states (lines 226, 262)**

Find both:
```tsx
className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-2xl"
```

Replace with:
```tsx
className="mx-auto flex h-14 w-14 items-center justify-center bg-muted-bg text-2xl"
```

- [ ] **Step 6: Verify on dev server**

Open `http://localhost:3000/dashboard`. Progress bar should be square-ended and cobalt. Announcement and survey cards should be flush left-border strips with no right-side curve.

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "style: dashboard page — flatten cards, progress bar, announcements"
```

---

## Task 5: Track grid — flatten filter pills + empty state

**Files:**
- Modify: `src/components/track-grid.tsx`

- [ ] **Step 1: Flatten filter pills (line 116)**

Find:
```tsx
className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
  active
    ? "bg-ink text-white"
    : "text-ink-soft hover:text-ink disabled:cursor-not-allowed disabled:text-ink-faint/50 disabled:hover:text-ink-faint/50"
}`}
```

Replace with:
```tsx
className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-colors ${
  active
    ? "bg-ink text-white"
    : "text-ink-soft hover:text-ink disabled:cursor-not-allowed disabled:text-ink-faint/50 disabled:hover:text-ink-faint/50"
}`}
```

- [ ] **Step 2: Flatten the empty state message (line 137)**

Find:
```tsx
className="rounded-xl border border-rule bg-surface-soft px-5 py-8 text-center text-sm text-ink-soft"
```

Replace with:
```tsx
className="border border-rule bg-surface-soft px-5 py-8 text-center text-sm text-ink-soft"
```

- [ ] **Step 3: Verify on dev server**

The "All / In progress / Upcoming" filter buttons should have square edges. Empty state panel should be rectangular.

- [ ] **Step 4: Commit**

```bash
git add src/components/track-grid.tsx
git commit -m "style: track grid — flatten filter pills and empty state"
```

---

## Task 6: Onboarding modal — flatten

**Files:**
- Modify: `src/components/onboarding-form.tsx`

- [ ] **Step 1: Flatten the modal panel (line 71)**

Find:
```tsx
className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-y-auto max-h-[90svh] animate-[fadeIn_0.3s_ease-out]"
```

Replace with:
```tsx
className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto max-h-[90svh] animate-[fadeIn_0.3s_ease-out]"
```

- [ ] **Step 2: Flatten the close button (line 78)**

Find:
```tsx
className="absolute top-3 right-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 transition-colors"
```

Replace with:
```tsx
className="absolute top-3 right-3 z-10 inline-flex h-9 w-9 items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 transition-colors"
```

- [ ] **Step 3: Flatten the icon container (line 84)**

Find:
```tsx
className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 mb-4"
```

Replace with:
```tsx
className="mx-auto flex h-14 w-14 items-center justify-center bg-neutral-900 mb-4"
```

- [ ] **Step 4: Flatten track item cards (line 99)**

Find:
```tsx
className="flex gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3.5"
```

Replace with:
```tsx
className="flex gap-3 border border-rule bg-surface-soft p-3.5"
```

Also flatten the track icon container (line 101):
```tsx
className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-lg"
```

Replace with:
```tsx
className="flex h-10 w-10 shrink-0 items-center justify-center bg-neutral-900 text-lg"
```

- [ ] **Step 5: Flatten the bullet dots (line 118)**

Find all three:
```tsx
className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400"
```

Replace with:
```tsx
className="mt-0.5 h-1.5 w-1.5 shrink-0 bg-neutral-400"
```

- [ ] **Step 6: Flatten the CTA button (line 134)**

Find:
```tsx
className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 active:bg-neutral-700 disabled:opacity-50"
```

Replace with:
```tsx
className="w-full bg-neutral-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 active:bg-neutral-700 disabled:opacity-50"
```

- [ ] **Step 7: Verify on dev server**

Trigger the onboarding modal (requires a test account that hasn't set `welcome_seen_at`, or temporarily return `needsOnboarding = true` in `dashboard/page.tsx`). Modal should have sharp corners, no rounded icon or CTA button.

- [ ] **Step 8: Commit**

```bash
git add src/components/onboarding-form.tsx
git commit -m "style: onboarding modal — flatten all rounded elements"
```

---

## Task 7: User menu popover — flatten

**Files:**
- Modify: `src/components/user-menu.tsx`

- [ ] **Step 1: Flatten the popover panel (line 177)**

Find:
```tsx
className={`absolute z-40 w-72 rounded-xl border border-rule-soft bg-paper p-1 shadow-[0_8px_24px_-12px_rgba(31,27,22,0.18)] ${popoverPosition}`}
```

Replace with:
```tsx
className={`absolute z-40 w-72 border border-rule-soft bg-surface-elevated p-1 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.12)] ${popoverPosition}`}
```

- [ ] **Step 2: Flatten avatar in popover header (line 183)**

Find:
```tsx
className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-paper-tint text-sm font-semibold tracking-tight text-ink-soft"
```

Avatar must stay circular — keep `rounded-full`. No change.

- [ ] **Step 3: Flatten program switcher menu items (line 224)**

Find:
```tsx
className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors ${
  isCurrent
    ? "text-ink font-medium"
    : "text-ink-soft hover:bg-paper-tint-soft hover:text-ink"
}`}
```

Replace with:
```tsx
className={`flex w-full items-center gap-2 px-2.5 py-2 text-sm transition-colors ${
  isCurrent
    ? "text-ink font-medium"
    : "text-ink-soft hover:bg-paper-tint-soft hover:text-ink"
}`}
```

- [ ] **Step 4: Flatten sign out button (line 251)**

Find:
```tsx
className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-paper-tint-soft hover:text-ink"
```

Replace with:
```tsx
className="flex w-full items-center gap-2 px-2.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-paper-tint-soft hover:text-ink"
```

- [ ] **Step 5: Verify on dev server**

Click the user avatar in the sidebar. The dropdown should be a sharp rectangle. Menu items should have no pill hover state.

- [ ] **Step 6: Commit**

```bash
git add src/components/user-menu.tsx
git commit -m "style: user menu — flatten popover and menu items"
```

---

## Task 8: Final visual verification checklist

- [ ] **Dashboard home** (`/dashboard`) — grey background, square cards with top accent borders, flat progress bar in cobalt, flat announcement strip
- [ ] **Nav sidebar** — active item has cobalt left stripe, no pill highlight
- [ ] **Curriculum sidebar** — week items follow same flat active indicator
- [ ] **User menu popover** — sharp dropdown, no rounded hover states
- [ ] **Filter pills** (track grid) — square edges on All / In progress / Upcoming
- [ ] **Marketing site** (`/`) — completely unchanged, cream background + electric green still intact
- [ ] **OS high-contrast mode** — toggle in System Settings → Accessibility → Display → Increase Contrast; body text should remain legible

- [ ] **Commit any remaining touch-ups, then push the branch**

```bash
git push origin youngfonz/public-survey-marketing-fallback
```
