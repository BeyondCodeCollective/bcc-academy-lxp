# Brand and landing page playbook

Notes for anyone — or any AI feature — building a public page on this platform.
Written 2026-09-06 after auditing why content-heavy landing pages read flat.

The platform is multi-brand. A landing page is the **brand register** (design IS
the product); the learner dashboard is the **product register** (design serves
the task). The rules below differ between the two on purpose.

---

## The brands

| Program | Primary | Accent | Tagline color | Voice |
|---|---|---|---|---|
| Catalyst / BCC | `#1a1a1a` ink | `#1D59FF` cobalt | `#1D59FF` | "Workforce development powered by Beyond Code Collective" |
| BGC (Black Girls Code) | `#7C3AED` | `#7C3AED` | `#7C3AED` | "Build the future you imagine" |
| Beyond the Game (ATG) | `#2E75B6` | `#D4A843` gold | `#E4F800` | "From Sports to Tech" |
| Beyond Code Centers | `#0047AB` | `#2563EB` | `#60A5FA` | "Where Innovation Meets Community" |

Platform-only colors, never a program's identity:

- **Electric green `#E5F701`** — BCC's live/active signal. Filled shapes only,
  never text on white.
- **Semantic status** (`--success` / `--warning` / `--danger`) — "how is it
  going" signals. Never decoration, never a brand accent.

### The structural gap: BGC has one purple doing three jobs

BGC sets `primary`, `accent`, and `tagline` to the same `#7C3AED`. With a single
value there is no way to make anything secondary — every purple element competes
with every other, which is a large part of why BGC pages read flat no matter how
the layout changes. ATG, by contrast, has a real three-color system.

**BGC needs a tonal ramp before its pages can have depth.** A workable one, all
derived from the existing hue so nothing is invented:

| Role | Value | Use |
|---|---|---|
| Ground | `#1E1035` | Dark bands, hero grounds |
| Primary | `#7C3AED` | The accent as it exists today — CTAs, headings |
| Lift | `#A78BFA` | On-dark accents, links on dark grounds |
| Tint | `#F3EEFF` | Light section grounds, chips, table stripes |

Adding these to `src/lib/programs/bgc.ts` is the single highest-leverage brand
change available right now.

---

## Why content-heavy landing pages read flat

Measured in `src/app/bcc/[slug]/landing-view.tsx`:

- The headline is `clamp(34px, 4vw, 48px)`. Everything after it is **11px** or
  **15px**. There is no size between 15 and 34.
- Every `bodySections` entry renders identically: an 11px uppercase accent
  kicker over 15px body at ~77% ink opacity, separated by a hairline.
- So a page with eight sections is eight identical grey blocks. The layout is
  correct and the rhythm is nonexistent.

The hairline-between-bands treatment is right for two or three sections. It is
what fails at eight.

## Fixing it

**1. Give sections a real heading.** The 11px kicker is a label, not a heading.
Keep it as an eyebrow if it earns its place, but the section's actual heading
should be 22–26px in ink — not accent-colored, so the accent stays scarce.

**2. Raise body copy.** 15px at 77% opacity is product-register density on a
marketing page. Use 17px at full ink, capped at 65–75ch.

**3. Vary treatment by content role, not by position.** Long pages need sections
that *look* different because they *are* different:

| Content | Treatment |
|---|---|
| Overview / who it's for | Prose, wide measure |
| What you'll do / learn | Numbered or structured list, not a paragraph |
| Schedule | Already distinct — keep it that way |
| Outcome / proof | A single large number or a pull quote, full width |
| Instructor | Photo + bio, asymmetric |

**4. One dark band, mid-page.** A long page needs a spine. Put a single band on
the program's ground color (BGC `#1E1035`, BCC ink `#1a1a1a`) roughly two-thirds
down, carrying the outcome or the CTA. It splits the page into two acts and
gives the eye somewhere to land. One per page — two makes stripes.

**5. Vary vertical rhythm.** Sections are uniformly `mt-9 pt-9` today. Let the
band before the dark section breathe more than the ones inside a list.

---

## Cross-brand rules

- **The accent is the program's, always.** Never hardcode cobalt in a shared
  landing component; read `page.accent`.
- **Electric green never appears on a BGC page.** It is BCC's signal, not a
  neutral UI color. On BGC, the live/active role goes to the Lift purple.
- **One dark object per page.** On a course page the generated cover art already
  fills that slot; don't stack a second dark hero under it.
- **One display size per surface.** The course page uses 30px; match it rather
  than introducing 32 or 34. Near-miss sizes are what make a UI read flat.
- **Green means state, cobalt means interactive, program accent means identity.**
  If a color is doing two of those jobs, it will feel muddy.

---

## Known drift to fix

- `home-for-summer` uses accent `#1E59FF`; the brand cobalt is `#1D59FF`.
- `bgc-roblox` is filed under the `bcc` program but is themed BGC purple — it
  will render under the wrong URL prefix and the wrong shell.
- Only two landing pages set `page_theme: dark`, and both are drafts. The dark
  treatment is available and effectively unused.

---

## For the AI page drafter

`src/lib/course-import/parse.ts` and `generate.ts` draft `landing.bodySections`
from a cohort brief. Sections drafted as four interchangeable prose blocks will
render as four identical grey bands no matter how good the layout is. When
editing those prompts, ask for sections that differ in kind — an overview, a
structured "what you'll do" list, an outcome worth setting large — so the page
has something to build rhythm from.
