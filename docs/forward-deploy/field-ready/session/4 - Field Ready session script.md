# Field Ready · Session 1 · Where AI Belongs
## The written script

Generated from the live session (`src/components/fde/session-stage.tsx`), so this
document and what a learner actually meets are the same thing. Ninety minutes,
four parts. Everything here is editable.

**The four parts**

1. **The one nobody used** — Six months of a portal that worked perfectly.
2. **What's actually in the inbox** — Four enrollments that really arrived. You decide first.
3. **Point it at them** — Vote before it answers. Check its judgment, not its typing.
4. **Your turn** — The call only you can make.

---

## Part 1 · The one nobody used

She speaks each of these. A beat marked **[waits]** will not move on until the
learner answers.

**1.** “Hey — good to meet you.”
> I'm going to show you something that went sideways at a place a lot like yours. Before I do, I want to know one thing about you.

**2. [waits]** “Has anywhere you've worked ever launched something new that almost nobody ended up using?”
> Say it out loud, or pick the closest one. There's no wrong answer here.

*They answer out loud or tap:* “Yes — we have one of those” · “Probably, I just never counted” · “Not that I know of”

**3.** “Almost everyone says yes.”

**4.** “This is six months of it.”
> Poke around. Tap any month.

**5. [waits]** “Eleven thousand families were eligible. How many actually used it?”
> Commit to a number before you move on. Say it out loud too. That's the part that stings later.

*They commit to a number:* About half (5,500) · A quarter (2,700) · One in ten (1,100) · One in a hundred (110)

**6.** “Not even close.”
> A quarter would have been 2,700 people. The team who built it guessed high too.

**7.** “And here's the part that gets me.”
> She was supposed to get time back. These are the coordinator's hours over the same six months.

**8.** “It worked perfectly. It just never landed.”
> Those are two different jobs, and almost nobody is assigned the second one. That second job is what we're doing today.

### What she says back, per answer

Beat 2 is her reply, so it depends on what they said.

- They said **“Yes — we have one of those”** → “Almost everyone says yes.” 
  > Thanks${who ? 
- They said **“Probably, I just never counted”** → “Almost nobody counts.” 
  >  : ""}. So let me show you one with the numbers still attached. A youth center built a family portal so parents could sign their kids up online instead of emailing. It shipped on time. Tests passed. No bugs.
- They said **“Not that I know of”** → “Then you're lucky, or nobody checked.” 
  > And that's most of the problem right there${who ? 

---

## Parts 2 and 3 · the four emails

The same four emails run twice.

**Part 2 — they judge, with no AI in the room.** Each person reads an email and
says what they would do with it. Three options: **Confirm it** (enroll them,
nothing is missing), **Hold it** (something needs asking first), **Give it to a
person** (not a machine's call at all). They must call all four before part 3
opens.

**Part 3 — the same four are handed to the AI**, along with the rules the front
desk actually uses. Before each answer is revealed the learner votes again. Then
it shows what the AI decided, why, and whether they matched it. The point of
part 3 is not that the AI is clever. It is that the learner is on record first,
so being caught out lands personally.

### Kwame — `01_clean.txt` · Tuesday 9:04

```
Hi,

I would like to enroll my son Kwame in the after school
program at Riverbend Main. He was born 06/02/2016 and is
in 4th grade. My number is 555-0142. Signed pickup form
attached.

Thank you!
```

**It decides:** Ready to confirm  
**Why:** Everything it needs is there, and nothing breaks a rule.

*A learner matches it by voting:* Confirm it

---

### Marley — `02_missing_dob.txt` · Tuesday 11:20

```
hey can you sign up my daughter Marley for the after
school thing at eastside she is in 5th grade.
call me 555-0209

thx
```

**It decides:** Hold, ask the family  
**Why:** No date of birth, so it can't check she's the right age. It drafted the reply asking for it. It didn't send it.

*A learner matches it by voting:* Hold it

---

### Amara — `05_sibling.txt` · Wednesday 8:41

```
Sorry, one more! Can you also add Kwame's sister Amara?
She's already enrolled at Riverbend Main I think
(born 03/14/2015, grade 5). Same number, 555-0142.
Same pickup form covers both kids.
```

**It decides:** Confirm as a sibling — and hold her first day  
**Why:** Same phone number as a kid already enrolled means sibling, not duplicate. That's Denise's rule, and it was written down nowhere until we wrote it down.

**The part nobody catches:** Then it caught something almost nobody in the room does. The mom says the same pickup form covers both kids. That's her assumption, not something on file. So it holds Amara's first day until a person checks that the form actually names her.

*A learner matches it by voting:* Confirm it

---

### Theo — `08_medical.txt` · Wednesday 16:55

```
I would like to enroll Theo (DOB 2015-08-14, grade 5) in
After School at Eastside. Pickup form attached. One thing:
Theo has an inhaler he needs to keep with him and takes a
tablet at 4pm. Is there a form for that?
```

**It decides:** Refused. Straight to a human.  
**Why:** Medication came up, so it won't touch this one. Not because it couldn't. Because you said anything medical goes to a person.

**The part nobody catches:** Who decided that? Not the AI. Denise did, eleven years ago, and we wrote it down. That's the job.

*A learner matches it by voting:* Give it to a person

---

## Part 4 · Your turn

She says: “Nobody in that room decided any of it on the spot. A person wrote
those rules down years ago, and the machine borrowed her judgment. So what's
yours?”

Each person finishes one sentence:

> **The call I make in about four seconds that would take someone new an hour to
> get wrong is…**

They type it. It will not let them finish until they have written something. It
saves to their own account as the session's reflection, which is where a
facilitator reads it afterwards, and it marks the session complete.

Closing line: “That sentence is the thing you own that the AI can't have.”
