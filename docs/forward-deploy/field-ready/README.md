# Field Ready 101

The session that goes in front of the 13-session course. Two formats now exist,
and they are not the same session — one is watched, one is built.

| | **The lab** (current) | **The platform session** |
| --- | --- | --- |
| Shape | In the room, laptops open, Cowork running | Remote, one screen, nothing to install |
| Length | 2 hours, eight blocks | 90 minutes, four parts |
| What happens | Each builder ships a v0 of one real thing and breaks it on purpose | The room watches an AI make four real enrollment decisions and catches it being wrong |
| They leave with | A working version zero, a build card, a backlog | One sentence about the call only they can make |
| Materials | `lab/` | `session/` |
| Status | **Tested 16 September 2026 with two builders. It worked; this is the curriculum to run.** | Built and live in the LXP |

The lab is the current FDE 101 curriculum. The platform session is still live
and is still what the deck demos — it has not been retired, and nothing here
assumes it has been.

## What is here

| Path | What it is |
| --- | --- |
| `lab/1 - Facilitator Guide.md` | The two-hour lab, block by block, with every prompt and facilitator tell. |
| `lab/2 - Build card.md` | One per builder. Filled in across the whole lab; the cards are the program's observation data. |
| `deck/Field Ready Lab.pdf` | The 20-slide lab deck. Runs alongside the facilitator guide. |
| `deck/Field Ready - pilot proposal for Mica.html` | The pitch to Mica. One self-contained HTML file — fonts, screenshots and the 0→1 sticker are base64-embedded, so it opens with no network. |
| `session/` | The platform session: run of show, Mica's capture sheet, the four-email handout, and the full spoken script. |
| `tools/nudge.js` | Build tool for the HTML deck (see below). |

## Editing the lab

Three things carry the same curriculum and drift apart if you touch one alone:

1. `lab/1 - Facilitator Guide.md` (this repo)
2. [The facilitator guide doc](https://docs.google.com/document/d/1UbN_3n8CUcY_lAmwouB0YC1Chlw93YMLxFGUSpNB1uM/edit) — Mica's working copy
3. `deck/Field Ready Lab.pdf`

The doc is where Mica drafts. The repo copy is what a facilitator runs from.
Change both, and re-export the deck if a block moved.

## The platform session is not in this repo

It is a React component in the LXP, because the LXP is the delivery surface —
nothing learner-facing ships as a standalone file.

- **Live**: https://bccacademy.io/dashboard/track/forward-deploy/1/live
- **Source**: `bcc-academy-lxp` → `src/components/fde/session-stage.tsx`
- **Facilitator view**: `/dashboard/admin/instructor` — "What the room wrote"
  lists every sentence the room wrote. Needs the `facilitate_cohort`
  capability, which the `instructor` role holds.

`session/4 - Field Ready session script.md` is transcribed **from** that
component, so the written script cannot drift from what learners actually meet.
Regenerate it rather than editing it by hand.

## The HTML deck

Open `deck/Field Ready - pilot proposal for Mica.html` in a browser.

- **arrows** — move between slides
- **n** — speaker notes
- **Next part →** on slide 03 drives the four parts by hand; the auto-rotation
  stops for good on the first click
- **d** — nudge mode

Ten slides. Verified at 1920, 1440, 1280, 1024, 820, 1180, 390 and 360 with
`~/.claude/skills/building-decks/scripts/verify.mjs`.

### Nudge mode

`tools/nudge.js` makes every element draggable and hands back the CSS. Press
`d`, drag, press `c`, paste the copied rule into the stylesheet.
`tools/nudge-bookmarklet.txt` is the same script as a `javascript:` URL — save
it as a bookmark and it works on any deck without editing the file.

**It is scaffolding.** Strip the `<script>` before a deck ships.

### Order for the pitch meeting

Slides 01–07, then **stop presenting at slide 08** and open the live session —
run three minutes and land on Amara, where the room splits. Back to the deck for
09–10, then stop talking; the ask slide ends on a question for Mica.

Do not lead with the admin or instructor view.
