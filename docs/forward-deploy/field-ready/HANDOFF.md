# Field Ready — handoff

Everything another assistant needs to pick this up. Written 2026-09-10.

---

## 1. What this is

**Field Ready** is a 90-minute session that seven BGC/BCC staff run together on
**21 September 2026**. It teaches one idea: *the AI is not the hard part —
deciding what it may touch is.*

It is not slides. It is a voice-driven, interactive web session each person
opens on their own laptop. It talks, it listens to spoken answers, it refuses
to advance until they commit to a decision, and it saves a sentence they write
to their own account.

It sits **in front of** a longer 13-session course, and is the pilot Fonz is
pitching to Mica, who is building her own curriculum that this must merge with.

---

## 2. The three repos

| Repo | Local path | What is in it |
| --- | --- | --- |
| `BeyondCodeCollective/bcc-academy-lxp` | `~/dev/work/bcc-academy-lxp-fde` (worktree) | **The product.** Next.js 16 + Supabase LXP. The session lives here. |
| `youngfonz/course-builder` | `~/dev/work/fde-course` | Course material, the pitch deck, session scripts. This file. |
| `BeyondCodeCollective/GFX1000` | `~/dev/work/GFX1000` | Design-tool knowledge repo (brand, skills, pipeline). Mostly separate; relevant only for brand rules. |

**Never work in `~/dev/work/bcc-academy-lxp`** — a different session uses that
worktree on other branches. LXP work happens in the `-fde` worktree only, and
branches are cut from `origin/main`, not from whatever HEAD happens to be.

---

## 3. The thing to improve

**`src/components/fde/session-stage.tsx`** — 1,337 lines, one file, client
component. This is the whole learner experience.

### Shape

```
useNarration()   ElevenLabs via /api/fde/voice, browser SpeechSynthesis fallback
useListening()   Web Speech API recognition, restarts itself on `onend`
Welcome          overlay; the audio trigger. Nothing speaks until they click.
CountIn          3-2-1 before the first line, so it is not startling
PartOne          BEATS[] walk: a story, a spoken question, a guess, the reveal
PartTwo          four real enrollment emails; each person makes a call, no AI yet
PartThree        the same four handed to an AI; they vote, then see what it did
PartFour         they write one sentence; it saves to their reflection
Done             closing line
```

### Data that drives it

- `BEATS[]` — every spoken line in part one, with `gate` and `mic` per beat
- `REPLIES[]` — three different responses keyed to how they answer the opener
- `OPENERS`, `GUESSES` — what a learner can say or click
- `CASES[]` — the four emails (Kwame, Marley, Amara, Theo) with the AI's
  decision, its reasoning, and the sting
- `CALLS` — confirm / hold / give it to a person

### Non-obvious things that will bite

- **Chrome drops an utterance queued in the same tick as `cancel()`.** There is
  a deliberate 60ms `setTimeout` before `synth.speak()`. Do not remove it.
- **Voice is served as a same-origin `GET`, not `fetch` + `createObjectURL`.**
  The app's CSP has no `blob:` in `media-src`, so a blob URL is silently
  blocked and it falls back to the robot voice with no error.
- **Recognition ends itself** after silence or an unmatched result. `onend`
  restarts it. Without that the mic freezes mid-session.
- **The reflection prompt text is the jsonb storage key.** It is read from the
  track config, never restated. A copy that drifts writes the answer somewhere
  nothing reads.

### Where the UX could genuinely get better

- Nothing handles **seven people at once** — never load-tested.
- If they follow along live on Zoom, **every laptop speaks** unless everyone
  wears headphones. Unresolved product question.
- Speech recognition is **Chrome-only**. Safari and Firefox silently fall back
  to clicking, which works but is a different experience.
- Part one is a fixed linear walk. Nothing adapts to a room that is moving
  faster or slower than the script.

---

## 4. Verified state (2026-09-09, on production)

A full walkthrough of `https://bccacademy.io/dashboard/track/forward-deploy/1/live`
passed **38/38**: welcome gate, voice (29KB `audio/mpeg`), every gate in all
four parts, both database writes (`reflections.responses`,
`week_progress.video_watched_at`), zero JS errors, zero failed requests.

**The one path never verified: the microphone.** Headless Chrome cannot feed
real mic input. Everything else is measured; this is inferred.

Recently shipped:

- **#1113** — new `facilitate_cohort` capability. The instructor queue was
  gated on `manage_students` (admin+ only), so the role named `instructor`
  saw the menu link and got redirected.
- **#1114** — "What the room wrote" panel. The session writes a reflection,
  not flags or checkpoints, so the facilitator queue showed nothing from it.

Still open: **#1102** ("Course page: one object, one answer") conflicts with
merged **#1111** ("two objects, not five loose strips") on the same files.
Recommendation was to close it and redo the one good idea — folding the
next-up action inside the hero — fresh against main.

---

## 5. Hard constraints

1. **Everything learner-facing ships in the LXP.** Never a standalone file,
   never a preview URL. This has been said many times and it is not negotiable.
2. **American English** throughout. There is a CI guard for it.
3. **Brand**: cobalt `#1D59FF`, yellow `#E5F701`, Special Gothic Condensed One
   for display, Goga for body, Apercu Mono. The session stage itself uses a
   cream `#FAF7F2` ground.
4. **Never invent content** — no fabricated numbers, names, or quotes. The
   session's data is built from the shape of a real failure, and the emails and
   rules trace to a real person's judgment.

---

## 6. How to verify a change

```bash
cd ~/dev/work/bcc-academy-lxp-fde
npx tsc --noEmit
npx eslint src/components/fde/ src/app/dashboard/admin/instructor/

# sign in as a real user and drive the real site
node scripts/mint-one-signin-link.mjs fonz.morris@hey.com /dashboard/track/forward-deploy/1/live
```

`fonz.morris@hey.com` holds the `instructor` role and is enrolled, so one login
reaches both the learner session and the facilitator view.

**"Merged" is not "live."** After a merge, production can still be a commit
behind — a verification run failed for exactly this reason. Wait for the
production deploy carrying your SHA, then re-verify against `bccacademy.io`.

---

## 7. The deck

`deck/Field Ready - pilot proposal for Mica.html` — ten slides, one
self-contained file. Arrows move; `n` shows speaker notes; `d` is nudge mode
(a build tool — strip the script before it ships).

Presentation order agreed: slides 01–07, then **stop at 08 and open the live
session**, run three minutes, land on Amara where the room splits. Back for
09–10, then stop talking. Do not lead with the admin view.
