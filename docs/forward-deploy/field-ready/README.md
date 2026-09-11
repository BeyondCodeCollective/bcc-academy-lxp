# Field Ready 101 — 21 September 2026

The 90-minute session that goes in front of the 13-session course. Seven staff,
nothing to install, ninety minutes.

## What is here

| Path | What it is |
| --- | --- |
| `deck/` | The pitch to Mica. One self-contained HTML file — fonts, screenshots and the 0→1 sticker are all base64-embedded, so it opens with no network. |
| `session/` | Run of show, Mica's capture sheet, the four-email handout, and the full spoken script. |
| `tools/nudge.js` | Build tool for the deck (see below). |

## The session itself is not in this repo

It is a React component in the LXP, because the LXP is the delivery surface —
nothing learner-facing ships as a standalone file.

- **Live**: https://bccacademy.io/dashboard/track/forward-deploy/1/live
- **Source**: `bcc-academy-lxp` → `src/components/fde/session-stage.tsx`
- **Facilitator view**: `/dashboard/admin/instructor` — "What the room wrote"
  lists every sentence the room wrote. Needs the `facilitate_cohort`
  capability, which the `instructor` role now holds.

`session/4 - Field Ready session script.md` is generated **from** that
component by parsing its constants, so the written script cannot drift from
what learners actually meet. Regenerate it rather than editing it by hand.

## The deck

Open `deck/Field Ready - pilot proposal for Mica.html` in a browser.

- **arrows** — move between slides
- **n** — speaker notes
- **Next part →** on slide 03 drives the four parts by hand; the auto-rotation
  stops for good on the first click
- **d** — nudge mode

Ten slides. Verified at 1920, 1440, 1280, 1024, 820, 1180, 390 and 360 with
`~/.claude/skills/building-decks/scripts/verify.mjs`.

## Nudge mode

`tools/nudge.js` makes every element on a deck draggable and hands back the
CSS. Press `d`, drag, press `c`, paste the copied rule into the stylesheet.

`tools/nudge-bookmarklet.txt` is the same script as a `javascript:` URL — save
it as a bookmark and it works on any deck without editing the file.

**It is scaffolding.** Strip the `<script>` before a deck ships.

## Order for the meeting

Slides 01–07, then **stop presenting at slide 08** and open the live session —
run three minutes and land on Amara, where the room splits. Back to the deck
for 09–10, then stop talking; the ask slide ends on a question for Mica.

Do not lead with the admin or instructor view.
