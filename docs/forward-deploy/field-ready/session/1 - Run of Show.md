# FDE 101 — Run of Show
**Monday 21 September · 12:00 ET · 90 minutes on Zoom**
**Fonz sharing screen and driving · Mica on chat and people · 7 people**

The goal is not to cover a syllabus. It is that seven people watch an AI make four real decisions, catch it being wrong once, and tell it what it must never do. Then write one line about their own job.

If you only get through three of the four blocks, fine. Do not rush block 3.

---

## Before the call

**The day before**
- [ ] Everyone has the Zoom link from the platform: `bccacademy.io` → FDE 101.
- [ ] Send one line: *"Nothing to prepare. Camera on if you can. 90 minutes."*
- [ ] Send the four emails as a PDF so people can read at their own pace during block 2.

**Fifteen minutes early**
- [ ] Claude Code open at the course folder, one warm-up prompt already sent.
- [ ] **Font size up.** Whatever looks big on your screen is too small on someone's laptop.
- [ ] Only the terminal shared. Close mail, Slack, notifications, everything.
- [ ] Mica in the meeting, chat open, capture sheet open beside it.
- [ ] Test the share once with Mica before anyone joins.

**Zoom rules for this one**
- Cameras on if people can. You need faces to read the room.
- Everyone unmuted by default, seven people is small enough. If it gets noisy, Mica manages it.
- **Do not fill silence.** On Zoom a three-second pause feels like thirty. Count it out and let it sit.
- Spotlight yourself when you talk, share screen when you run something.

**If the AI misbehaves live, do not hide it.** That is the lesson. Say "watch, it might get this wrong" and carry on.

**It thinks for a few seconds before answering.** Let the room watch it think. The pause works for you.

**It says smarter things than this script, more than once.** When it does, stop and point at it rather than pushing on.

---

## 0–10 · The one that nobody used
**Fonz talking. No screen share yet — just your face.**

Tell it as a story:

> Six months ago a youth center launched a family portal. Parents could enroll their kids online instead of emailing. It worked. Tests passed, no bugs, the team shipped it.

Then ask, and go round by name: **"Eleven thousand families were eligible. How many actually used it?"**

Get all seven. Mica types each guess into chat as they say it, so everyone sees the spread.

Now share screen and paste:

```
Read data/usage_report.csv and tell me in plain English: how many families were eligible, how many actually used the portal last month, and what happened to the coordinator's hours since it launched.
```

Read the answer out loud. **41 of 11,061. Her hours went up, 146 to 153.**

Then the only line that matters here:

> The software worked perfectly. It just never landed. Those are two different jobs, and almost nobody is assigned the second one. That second job is what we're doing today.

**Mica captures:** every guess, and who reacted when the number landed.

---

## 10–30 · What's actually in the inbox
**Mica leads. Fonz shares the emails on screen.**

Put the four emails up. Two minutes of quiet reading — say out loud that it's two minutes of silence and that it's deliberate, or Zoom silence will feel broken.

Then one email at a time. Mica asks the group: **"What would you do with this one?"** and calls on people by name. Nobody gets to hide on Zoom.

| Email | The thing to draw out |
|---|---|
| Kwame | Everything is there. Easy. Nobody argues. |
| Marley | No date of birth. Someone will say "just ring her." Good — that's a decision. |
| Amara | Same phone number as a child already enrolled. **Duplicate or sibling?** The group will split. This is the moment. |
| Theo | Mentions an inhaler and a tablet at 4pm. Watch faces change. |

When they split on Amara, land it:

> Denise has done this eleven years. Same phone, different child means sibling, not duplicate. That rule is written down nowhere. It lives in her head. When she's on holiday it walks out of the building with her.

Then: **"How many calls like that do you reckon she makes in a week?"**

**Mica captures:** the exact words people use disagreeing about Amara. Those words are the course.

---

## 30–70 · Point it at them
**Fonz driving, screen shared the whole block. This is the one. Give it the time.**

Say what's about to happen:

> I'm going to give an AI those same four emails and the rules Denise uses. You're going to tell me whether it got each one right, before it answers.

First, show it the rules:

```
Read data/program_rules.md and give me back the five rules you think matter most, in plain English, one line each.
```

Read them out. Point at the pickup form rule and that Denise won't say why.

Then one email at a time. **Before each, the group votes in chat: confirm, hold, or human.** Mica reads the vote out before you press enter.

```
Read data/intake_emails/01_clean.txt. Using data/program_rules.md, tell me: what would you do with this enrollment, and which rule made you decide? Two lines. No code.
```

Then `02_missing_dob.txt`, then `05_sibling.txt`.

**Slow right down on the sibling one.** They already argued about it.

I tested this. It gets the sibling call right, then catches something the group almost certainly won't: the mother says "same pickup form covers both kids," but that's her assumption, not something on file. So it confirms Amara as a sibling **and** holds her first day until a human checks the form names her.

When it does that, stop:

> Nobody here caught that. It did, because we gave it the rules. That's what good looks like.

Then the last one. Set it up first:

> This one's different. Vote before I run it.

```
Read data/intake_emails/08_medical.txt. Using data/program_rules.md, tell me what you would do with this enrollment and why. Two lines. No code.
```

It refuses and sends it to a human. Stop. Don't move quickly.

> **Who decided that? Not the AI. Denise did, eleven years ago, and we wrote it down. That's the job. You're not here to learn to type. You're here to decide what it's allowed to touch.**

If time allows, take the rule away and run it again so they watch it get it wrong. That lands harder than anything else in the ninety minutes.

**Mica captures:** which votes the group got wrong, and the moment the mood changes.

---

## 70–90 · Your turn
**Mica leads. Fonz stops sharing — faces only.**

Everyone finishes this sentence, in the platform under Session 1 → Reflection, or in chat if that's easier:

> **The call I make in about four seconds that would take someone new an hour to get wrong is _______.**

Three minutes of quiet to write. Then go round by name and have each person read theirs out. Don't skip anyone. Nobody gets to say "I haven't got one" — everyone has one. If someone's stuck, ask what they retyped last week.

Fonz closes:

> That sentence is the thing you own that the AI can't have. Everything after today is about building something that respects it.

Then be straight about what's next:

> We're going to build this properly based on what happened in this room today.

**Mica captures:** all seven sentences, word for word.

---

## Within 24 hours

- Mica types up the capture sheet while it's fresh.
- The two of you spend 20 minutes on one question: **which single moment made the room lean in?** Build 102 around that.
- Send the seven a short note with their own sentence quoted back to them.
