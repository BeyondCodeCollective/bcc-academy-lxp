# BCC Academy — Product Demo Video (script v1)

- **Voice:** Bella (ElevenLabs `EXAVITQu4vr4xnSDxMaL`)
- **Target length:** ~2:00
- **Recording env:** local dev + seeded demo data (clean, no real PII) — flip to prod if preferred
- **Flow:** Playwright drives Chrome (headed, slowMo) while you record in Screen Studio; each scene pairs a narration line with the on-screen action.

> Note on coherence: the **Roblox landing is the opener** (a real, published white-label front door). The **learner + admin journey** runs on a seeded demo self‑paced course, since the Roblox course itself isn't built yet. Narration bridges this as "every program gets its own front door."

---

| # | Screen / on-screen action | Narration (Bella) |
|---|---|---|
| 1 | **Roblox landing** — load `/camp/bgc-roblox`, slow scroll through the hero ("She won't just play Roblox. She'll build it.") | "Every program on BCC Academy gets its own front door. This is Black Girls Code's Roblox camp — its own brand, its own story, launched without writing a line of code." |
| 2 | **Sign up** — fill the landing's name + email form, submit, show the success state | "A family signs up in seconds. No account to create, no friction — just a name and an email." |
| 3 | **The invite email** — open the rendered invite email (email-preview route) | "Behind the scenes, a branded invite goes out from the program's own domain. One click. No password to remember." |
| 4 | **One-click login** — click the magic link → the personalized dashboard loads | "They click once, and they're in. The dashboard already knows where they are and what to do next." |
| 5 | **Inside a course** — open a course → a week; show the lesson video, objectives, materials | "Each week is everything in one place — the lesson, the materials, the assignment." |
| 6 | **Do the work** — mark the recording watched, submit the assignment; the completion ticks fill | "Watch the lesson, do the work, submit it — and progress updates live." |
| 7 | **Admin · People** — admin home → People; show the pipeline (Allowlisted → Invited → Joined → Active); hover "Send all invites" | "On the staff side, you see the whole pipeline — who's invited, who's joined, who hasn't started — and you can invite an entire cohort in one tap." |
| 8 | **Admin · Progress** — open the self-paced Progress grid (watched + uploaded per week) | "Every signal in one view — watched, submitted, engaged. You can spot who needs a nudge before they fall behind." |
| 9 | **The team gets notified** — open the signup-notification email (email-preview route) | "And the moment a new learner signs up, the team knows." |
| 10 | **Close** — `bccacademy.io` index with the hero video playing | "One platform. Every program. From beginners to wisdom learners — human in the lead." |

---

## Build checklist (after script approval)
1. **Email-preview route** — renders the real invite / login / signup-notification templates at a URL so scenes 3 & 9 can show actual branded email on screen.
2. **Seed demo data** — a clean demo program + course + one demo learner (with some progress) so scenes 4–8 look intentional.
3. **Audio generator** — `script.md` narration → per-scene Bella MP3s via the ElevenLabs API.
4. **Playwright runner** — headed Chrome, slowMo, scene-by-scene; optional pacing synced to each clip's length.
