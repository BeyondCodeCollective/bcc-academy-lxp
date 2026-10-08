# FDE 101 · Field Ready Lab — facilitator guide
**Two hours · eight blocks · in the room, laptops open, Cowork running**
**Mica and Fonz facilitating · one build per builder**

Tested 16 September 2026 with two builders, Shonda and Cristina. It went well
enough to become the curriculum, so this is the version to run.

The goal is not to cover a syllabus. It is that every builder leaves with a
version zero of one thing, has broken it on purpose, and can explain how it
works to someone who was not in the room.

Source of truth for edits: the [facilitator guide doc](https://docs.google.com/document/d/1UbN_3n8CUcY_lAmwouB0YC1Chlw93YMLxFGUSpNB1uM/edit)
and `../deck/Field Ready Lab.pdf`. Change all three together.

---

## At a glance

| Time | Block | Lead | Outcome |
| --- | --- | --- | --- |
| 0:00–0:10 | Settle | Mica | Everyone in Cowork, folders connected, accounts working |
| 0:10–0:20 | Why you're here | Mica | Each builder restates what they want to build, one sentence, on the board |
| 0:20–0:40 | Intro to AI | Mica and Fonz | Can say what an LLM is and isn't; six ways we fool ourselves; tokens and parameters |
| 0:40–0:55 | Claude + Cowork 101 | Mica and Fonz | The loop, the four moves, the one rule; one live task end to end |
| 0:55–1:00 | Workflows vs agents | Fonz | Each builder names the step where things drop |
| 1:00–1:45 | Get building | Both float | Three 15-minute rounds: specify, build v0, break it |
| 1:45–1:55 | Demo | Builders | Four minutes each: what it does, what broke, one piece you didn't write |
| 1:55–2:00 | Future state + backlog | Mica | What v1 needs; what we learned for the program |

---

## On the board before anyone arrives

> # Never ship a result you can't explain.
>
> **Specify · Read · Interrogate · Reject**
>
> *Validate, don't trust.*

Leave it up for the whole two hours. Every correction you make during the build
rounds points back at it.

---

## Before they arrive

- [ ] Each builder brings **their own real, messy input** in a connected folder.
      Messy is better than clean — clean data teaches nothing. In the test run
      that was Shonda's bizdev lead spreadsheet (or a 15-row stand-in with the
      same bad columns) and Cristina's five to ten contacts from a recent event,
      in whatever form they existed: photos of cards, a notes file, a voice memo
      transcript.
- [ ] Cowork open, folders connected, accounts working — check this *before* the
      clock starts, not during Settle.
- [ ] The Barnum demo prompts ready to paste (both parts, below).
- [ ] A visible timer. The rounds are 15 minutes and they will run over.
- [ ] A printed or shared **build card** per builder (`2 - Build card.md`).
- [ ] Agenda on the whiteboard, and the one rule above it.
- [ ] **Someone taking observation notes for the program**: where it dragged,
      which term landed, what confused people, whether 45 minutes was enough.

---

## 0:10 · Why you're here (10 min, Mica)

> "We are here to build one thing each that fixes a step in your work that
> currently drops details. By the end you will have a version zero, you will
> have broken it on purpose, and you will be able to explain how it works to
> someone who wasn't here."

Each builder restates what they want to build, in one sentence. **Write it on
the board exactly as said.** Push for the pain, not the tool — if the sentence
names a piece of software, ask again.

Then two questions to each, both answers written under the statement:

- "Who notices when this goes wrong today?"
- "What does wrong look like?"

Those answers are the test cases in Round 3. That is the whole reason you ask
them now.

**From the test run** — the working statements, kept as examples of the right
altitude:

| Builder | Working statement |
| --- | --- |
| Shonda | A business development dashboard so I and my team can source, track and maintain leads and get from first conversation to submitted proposal faster with fewer dropped details, pulling in what the bizdev team already finds instead of chasing an inconsistent spreadsheet. *Stretch: a first-pass edit in my style before drafts reach me.* |
| Cristina | A way to capture the people I meet at events so they are tracked and the rest of the team can follow up, without me being the bottleneck. *Stretch: a brief with proposed next steps for team members based on the strategic plan and active projects.* |

---

## 0:20 · Intro to AI (20 min)

### Part 1 · What an LLM is and isn't (Mica)

A large language model is a very good guesser. It has processed an enormous
amount of text and learned which words tend to follow which. When you type, it
predicts the most plausible next piece of text, one piece at a time. That is the
whole trick.

> **It is not looking things up. It is not thinking. It does not know you.**
> It makes an educated guess. The guess is sometimes excellent. It is still a guess.

Deep knowledge, zero understanding. The line that lands:

> Imagine you are in a play, performing as Albert Einstein. You have a script, so
> you know what to say. You have no idea what any of it actually means.
> Understanding needs a mind. There is no mind here.

**Where the guesses come from** — three training passes, one line each:

| | | |
| --- | --- | --- |
| **1 · Pattern map** | **2 · Reinforcement** | **3 · Expert-led** |
| A map of every association in the data. Which words follow which. | Engineers mark outputs right or wrong. The system shapes future responses around the marks. | A hundred mathematicians reconstruct the conceptual frameworks so outputs get more specific. |

**You are the verifier.** On verifiable things — math, science, anything with a
checkable answer — the system can come back with something it confirmed.
Everything else is open-ended and subjective and it has no way to verify. You
decide whether the output is good. When it ends on a question asking your
opinion or offering more, that is it using you to check its work. (It is also
keeping you in the product. Say that part out loud too.)

> Every failure you will hit today comes from forgetting that. It will sound
> confident when it is wrong, agreeable when you are wrong, and personal when it
> is being generic. Your job is not to trust it or distrust it. Your job is to
> validate.

**Six ways our own brains make that hard.** Not exhaustive — examples of how our
psychology is wired to read these outputs. It comes from millions of years of
needing to trust the people talking to us, who were usually our own tribe, and
needing to care intensely about anything said about us.

| Term | Plain language | What to do about it |
| --- | --- | --- |
| Anthropomorphism | Treating a non-human thing as if it had thoughts and feelings. We do it to cars, pets and weather. Hardest with anything that talks back. | Say "the model" and "it", not "he" or "she". When you catch yourself asking whether it *understands*, rephrase: does the output match what I asked for? |
| Pathetic fallacy | The literary cousin: giving emotion to something that has none ("the cruel sea"). With AI it sounds like "it wanted to help", "it got confused". | The model did not want anything. It produced text. Describe what the text did, not what the tool felt. |
| ELIZA effect | Named for a 1966 chatbot that reflected your words back as questions. People confided in it and insisted it understood them, knowing it was a script. | Sixty years later the script is much better. The effect is identical. Warmth in the output is not evidence of understanding. |
| Barnum effect | Statements vague enough to fit anyone feel personally accurate. Horoscopes run on it. | When it tells you something about yourself, your team or your plan, ask: would this be equally true of the next person who walked in? |
| Cold reading | A performer produces "insight" with general statements, watches your reaction, adjusts. The audience supplies the specifics. | It does this by default, because it is trained to keep you engaged. Do not fill in the gaps for it. Make it be specific, then check the specifics. |
| Implicature | Humans cooperate in conversation: we assume the other person is truthful, relevant, and only says what they can back up. So we read meaning into what is implied. | The model is not a cooperative speaker. It is imitating what obeying those rules looks like. Read what it actually said. Do not credit it with what you inferred. |

You need to know these are happening so you can catch them happening to you. The
extreme end of not catching it is AI psychosis — people convinced they are
talking to a sentient god that knows everything.

### The live demo (3 min, two parts)

**Part one.** Paste this into Claude and read the answer out loud:

```
Here are three sentences about how I work: I like to move fast, I care about
the people I work with, and I sometimes take on too much. Based on this, tell
me what kind of leader I am and what I should watch out for.
```

Warm, plausible, flattering, and everyone in the room recognizes themselves in
it. Name what just happened while it is on screen: **Barnum** (it fits anyone),
**cold reading** (we supplied the specifics), **anthropomorphism** (it sounds
like it knows you), **implicature** (we read insight into three ordinary
sentences).

**Part two.** Set the voice and run it again:

```
Be direct and specific. Don't flatter me. Only say things that follow from what
I actually wrote, and tell me what you can't know from three sentences.
```

Shorter, more useful, less pleasant. That is the point:

> **You decide the voice you get back. Not sycophantic. Validate, don't trust.**

### Part 2 · Tokens and parameters (Fonz)

- **Tokens** are the pieces it reads and writes, roughly word-parts. "Business
  development" is about three. Everything you paste, every file it reads, every
  answer it gives counts against a ceiling per conversation. That is why long
  messy spreadsheets get pointed at, not pasted.
- **Parameters** are the dials inside the model, set once during training.
  Billions of them. Not a database of facts — a learned sense of what text tends
  to follow what. This is why it can be fluent about your industry and wrong
  about your numbers.
- **Nothing is live unless you connect it.** It does not see your Drive, your
  inbox, or today's date unless a tool gives it access. That is exactly what
  Cowork does, which is why the next block matters.
- **Practical rule:** bring the facts, let the model bring the language. Put the
  real spreadsheet in the folder. Don't ask it to remember your leads; ask it to
  read them.

---

## 0:40 · Claude + Cowork 101 (15 min, Fonz and Mica together)

| Minutes | What happens |
| --- | --- |
| 0–3 | What Cowork is: Claude that can work inside your files and connected apps (Drive, Gmail, Calendar, Slack, Notion) and do multi-step tasks while you watch. **The loop: you describe the goal · it plans · you approve · it does · you check.** Show the connected folder and the connectors. |
| 3–9 | One live task end to end, on a builder's real file. Read the plan before saying yes. When the answer comes back, do the four moves out loud. |
| 9–12 | The layer on top: a **Project** (context that persists), a **Skill** (a repeatable way of doing a task — "score a lead", "edit in Shonda's style"), an **Artifact** (a thing it makes: a dashboard, a doc, a tracker), a **Connector** (an app it can reach). Point at each. Do not teach each. |
| 12–15 | Approval and boundaries: it asks before it writes to your files or sends anything. **Nothing goes out without you.** Say plainly what stays in your account and what you would never paste in. |

The live task from the test run, on Shonda's lead spreadsheet:

```
Read this spreadsheet and tell me what stages a lead goes through, where the
data is inconsistent, and what fields are missing for tracking first
conversation to submitted proposal.
```

Then the four moves, named as you do them:

- **Specify** — that is what we asked for.
- **Read** — open what it produced. Actually open it.
- **Interrogate** — "why did you call this column inconsistent?"
- **Reject** — "that is more than I need; simplify this so I can explain it."

---

## 0:55 · Workflows vs agents (5 min, Fonz)

A workflow is a fixed sequence you define: capture, log, assign, follow up. An
agent is given a goal and decides its own steps. Most of what any of us needs is
a workflow with judgment at one or two steps.

> The question is never "should I build an agent." The question is "where does my
> workflow break today?"

Then: **"Your workflow is broken. Let's build."** Every builder names, out loud,
the one step where details drop. That step is what gets built first.

---

## 1:00 · Get building (45 min, three rounds)

Mica and Fonz float. **Do not solve it for them.** Ask the four-moves questions.

*The tell to watch for: a build that looks great and a builder who cannot say
what a field is for. That is silent acceptance. If someone says "great" to an
output without opening it, ask them to explain one line of it. Slow them down and
have them rebuild that piece by specifying it in smaller steps.*

### Round 1 · Specify (15 min)

Each builder fills the build card, then hands it to Cowork:

```
Here is what I want to build. Before you build anything, write me a short plan:
what you would create, what you need from me, and what you would not do yet.
```

Read the plan. Reject anything you cannot explain. **Cut scope until the first
version is one thing.** Say the goal, not the mechanism.

**From the test run** — what a good v0 scope looked like:

| Builder | v0 for today |
| --- | --- |
| Shonda | A lead tracker with fixed stages (sourced, first conversation, discovery, proposal drafted, submitted, won or lost), a fixed set of fields, and one routine that reads the team's existing spreadsheet plus her call notes and normalizes them into those stages and fields, flagging rows it could not place. The dashboard view and the editing-style skill are Round 3 or backlog. |
| Cristina | One intake path: drop a card photo, a notes file or a voice memo transcript into a folder or a Slack channel; Cowork extracts name, org, role, where met, what was discussed and next step into a structured record, assigns a follow-up owner from a short list, and posts one line to the team. Enrichment and CRM sync are backlog. |

### Round 2 · Build v0 (15 min)

Approve the plan and let it build. **The builder reads what it produces as it
produces it.** Two prompts every builder uses at least once this round:

```
Explain what you just did in two sentences.
```
```
Simplify this so I can explain it.
```

When v0 exists, run it once on real data.

### Round 3 · Break it (15 min)

Back to the card. Feed it the "wrong looks like" case on purpose:

| | | | |
| --- | --- | --- | --- |
| A lead with no stage | A duplicate contact | A card photo with no company name | A row in the wrong column |

Watch what it does. Then ask it to handle that case **and to tell you when it
cannot**.

If time remains, one stretch each — in the test run: Shonda pointed it at a past
proposal draft and asked it to describe her editing style in five rules (the seed
of the first-pass skill); Cristina had it draft the follow-up Slack line in her
voice, then corrected it.

---

## 1:45 · Demo (10 min)

Four minutes each, then one question from each observer. Say the three things
before the first demo starts:

1. **What it does** for the step that was broken.
2. **What broke**, and what happened.
3. **One piece of the output you did not write** but can explain. Say it out loud.

> **A broken run explained well beats a working run explained badly.**

---

## 1:55 · Future state + backlog (5 min, Mica)

Each builder says what v1 needs, in one sentence, and names their backlog on the
card — everything they cut today that they still want, one per line.

Then the program questions, for the observation notes:

1. Where did it drag?
2. Which of the six terms landed, and which fell flat?
3. Did anyone reach for the tool before reading?
4. Was 45 minutes right?
5. What would we cut or add for a room of twenty strangers?

---

## Within 24 hours

- Observation notes typed up while they are fresh.
- Twenty minutes on one question: **which moment made the room lean in?** That is
  what the next version is built around.
- Each builder gets their own build card back, filled in, with their v1 sentence
  quoted.
