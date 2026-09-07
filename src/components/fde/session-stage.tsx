"use client";

/**
 * Field Ready — "Where AI Belongs", the learner-facing session stage.
 *
 * Design comes from the canvas (artboards `Main` / `Build`): cream #FAF7F2,
 * one centerd column at every width, cobalt #1D59FF as the only accent,
 * Archivo display. Structure comes from the run of show — four parts, in the
 * order Fonz teaches them.
 *
 * The rule this is built on: every screen asks the learner to commit to
 * something before it shows them anything. You guess the number before the
 * number lands; you say what you'd do with an email before you see what it
 * did; you vote confirm/hold/human before it answers. A deck you click
 * through teaches nothing — the whole point of the session is that the room
 * gets caught being wrong about Amara, and you cannot be caught being wrong
 * if you never committed.
 *
 * Deliberately model-free. Every decision here is what Claude Code actually
 * returned when Fonz ran these four emails against `data/program_rules.md`,
 * transcribed. So the Sept 21 room needs no AI Gateway, cannot 403, and
 * cannot wander off script in front of seven people.
 *
 * Single-player: seven laptops, each at its own pace, while Fonz walks the
 * room. Shared vote tallies are a later layer.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { saveFourSecondCall, markSessionComplete } from "@/app/dashboard/track/[slug]/[week]/live/actions";

/* ── palette ─────────────────────────────────────────────────────────── */

const CREAM = "#FAF7F2";
const COBALT = "#1D59FF";
const INK = "#1a1a1a";
const INK_SOFT = "#6E6A63";
const INK_FAINT = "#A39D93";
const RULE = "#F2EDE5";
const BONE = "#E9E3D9";
const EDGE = "#EDE7DD";
const DISPLAY = "var(--font-archivo), -apple-system, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";


/* ── narration ───────────────────────────────────────────────────────── */

/**
 * The instructor's voice.
 *
 * Every line in this session is written to be *spoken* ("Morning. I had a
 * proper look at that portal you mentioned."). Rendered silently they read as
 * one half of a conversation nobody is having, which is precisely how the
 * flow felt wrong. So the page talks.
 *
 * Browser speechSynthesis on purpose: it needs no API key, no budget and no
 * network, so it cannot fail in front of seven people the way a hosted voice
 * can. It is robotic. Swapping in ElevenLabs later means replacing the body
 * of `say` and nothing else.
 *
 * Browsers refuse speech until the user has interacted with the page — the
 * cover's Start button is that interaction, which is why nothing is spoken
 * before it.
 */
function useNarration() {
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const lastRef = useRef<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tokenRef = useRef(0);

  // localStorage is client-only, so the preference cannot be part of the
  // initial state without breaking hydration — reading it in an effect after
  // mount is the hydration-safe pattern, and it runs exactly once.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
      if (localStorage.getItem("fde-muted") === "true") setMuted(true);
    } catch {
      /* private mode — default to speaking */
    }
  }, []);

  const stop = useCallback(() => {
    tokenRef.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  /**
   * Last resort only. If ElevenLabs is unreachable or unconfigured the
   * session still has to talk, so fall back to the browser's own voice
   * rather than going silent in front of a room.
   */
  const fallback = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    // Chrome drops an utterance queued in the same tick as cancel().
    window.setTimeout(() => {
      const u = new SpeechSynthesisUtterance(text.replace(/[—–]/g, ", ").replace(/[*_`#>]/g, ""));
      const voices = synth.getVoices();
      const pick = (re: RegExp) => voices.find((v) => /^en[-_]US/i.test(v.lang) && re.test(v.name));
      const v = pick(/Ava|Allison|Susan|Zoe/i) ?? pick(/Samantha/i) ?? voices.find((x) => /^en[-_]US/i.test(x.lang));
      if (v) u.voice = v;
      u.rate = 0.98;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      synth.speak(u);
    }, 60);
  }, []);

  const say = useCallback(
    (text: string, opts?: { force?: boolean }) => {
      if (typeof window === "undefined") return;
      if (!opts?.force && text === lastRef.current) return;
      lastRef.current = text;
      stop();
      if (muted || !text.trim()) return;

      // A later line must never be talked over by an earlier one that was
      // still being fetched when the learner moved on.
      const token = ++tokenRef.current;
      setSpeaking(true);

      // Same-origin URL rather than a blob: the app's CSP has no `blob:` in
      // media-src, so a blob-backed <audio> is blocked outright.
      const audio = new Audio(`/api/fde/voice?text=${encodeURIComponent(text)}`);
      audioRef.current = audio;
      audio.onended = () => {
        if (token === tokenRef.current) setSpeaking(false);
      };
      audio.onerror = () => {
        // Unconfigured key, network, a bad response — she still has to talk.
        if (token !== tokenRef.current) return;
        setSpeaking(false);
        fallback(text);
      };
      audio.play().catch(() => {
        if (token !== tokenRef.current) return;
        setSpeaking(false);
        fallback(text);
      });
    },
    [muted, stop, fallback],
  );

  const toggleMute = useCallback(() => {
    const next = !muted;
    try {
      localStorage.setItem("fde-muted", String(next));
    } catch {
      /* nothing to persist to; the toggle still works for this visit */
    }
    // Muting mid-sentence has to actually shut her up, so stop here in the
    // handler rather than reacting to the state change afterwards.
    if (next) stop();
    setMuted(next);
  }, [muted, stop]);

  // Never leave a voice talking to an empty room.
  useEffect(() => stop, [stop]);

  return { say, stop, muted, toggleMute, speaking };
}

type Voice = ReturnType<typeof useNarration>;

/** Speak a line whenever it changes. */
function useSpeak(voice: Voice, text: string) {
  const { say } = voice;
  useEffect(() => {
    say(text);
  }, [say, text]);
}

/** Persistent, always-visible: is she talking, are you meant to be. */
function VoiceChip({ voice, yourTurn }: { voice: Voice; yourTurn?: boolean }) {
  const live = voice.speaking;
  const label = voice.muted ? "Sound off" : yourTurn ? "Your turn — say it out loud" : live ? "Speaking" : "Listening";
  const accent = voice.muted ? INK_FAINT : yourTurn || live ? COBALT : INK_FAINT;
  return (
    <button
      onClick={voice.toggleMute}
      aria-label={voice.muted ? "Turn the instructor's voice on" : "Turn the instructor's voice off"}
      style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "9px 16px 9px 13px", borderRadius: 99, background: "#fff", border: `1px solid ${accent === COBALT ? "#C9D8FF" : EDGE}`, cursor: "pointer" }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 3, height: 16 }} aria-hidden>
        {[0, 0.1, 0.2, 0.3].map((d) => (
          <span key={d} style={{ width: 3, height: 16, borderRadius: 99, background: accent, transformOrigin: "center", animation: voice.muted ? "none" : `${live || yourTurn ? "fde-speak" : "fde-idle"} .8s ease-in-out ${d}s infinite`, transform: voice.muted ? "scaleY(.3)" : undefined }} />
        ))}
      </span>
      <span style={{ fontSize: 12.5, color: accent }}>{label}</span>
    </button>
  );
}


/* ── listening ───────────────────────────────────────────────────────── */

type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

function getRecognition(): RecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/**
 * The other half of the conversation.
 *
 * She asks the room questions and the chip said "say it out loud" — but
 * nothing was listening, so answering did nothing and the session felt
 * broken. This listens on exactly the beats that ask something, matches what
 * it hears against that beat's options, and shows the words as they arrive so
 * the learner can see it working.
 *
 * Tapping always still works. Recognition is unavailable in Firefox, needs a
 * permission grant, and mishears people — it can be the fast path, never the
 * only one.
 */
function useListening({
  active,
  onMatch,
}: {
  active: boolean;
  onMatch: (heard: string) => boolean;
}) {
  const [heard, setHeard] = useState("");
  const [state, setState] = useState<"off" | "listening" | "denied" | "unsupported">("off");
  const recRef = useRef<RecognitionLike | null>(null);
  // The matcher closes over this beat's state and changes every render, but
  // recognition must not be torn down and restarted each time — keep the
  // latest one in a ref, updated in an effect rather than during render.
  const matchRef = useRef(onMatch);
  useEffect(() => {
    matchRef.current = onMatch;
  }, [onMatch]);

  /* eslint-disable react-hooks/set-state-in-effect --
     SpeechRecognition is exactly the "external system" the rule carves out:
     this effect subscribes to it and the setState calls report its status
     (unsupported, started, denied) back to the UI. There is nowhere else to
     learn any of it — the API is imperative and only exists on the client. */
  useEffect(() => {
    if (!active) {
      recRef.current?.stop();
      recRef.current = null;
      setHeard("");
      setState("off");
      return;
    }

    const rec = getRecognition();
    if (!rec) {
      setState("unsupported");
      return;
    }

    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setHeard(text.trim());
      // Stop the moment the answer is recognizable — leaving the mic open
      // after a match means the next sentence overwrites the choice.
      if (matchRef.current(text)) rec.stop();
    };
    rec.onerror = (e) => {
      setState(e?.error === "not-allowed" ? "denied" : "off");
    };
    rec.onend = () => {
      recRef.current = null;
    };

    try {
      rec.start();
      recRef.current = rec;
      setState("listening");
    } catch {
      // start() throws if one is already running; the existing one is fine.
      setState("listening");
    }

    return () => {
      rec.onresult = null;
      rec.onend = null;
      rec.onerror = null;
      rec.stop();
      recRef.current = null;
    };
  }, [active]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return { heard, state };
}

/** What counts as each answer when spoken aloud. */
function matchOpener(said: string): number | null {
  const t = said.toLowerCase();
  if (/\b(no|nope|not that|never|none)\b/.test(t)) return 2;
  if (/\b(probably|maybe|possibly|never counted|not sure|think so)\b/.test(t)) return 1;
  if (/\b(yes|yeah|yep|yup|definitely|absolutely|for sure|we have|loads)\b/.test(t)) return 0;
  return null;
}

function matchGuess(said: string): number | null {
  const t = said.toLowerCase();
  if (/\bhundred\b|\b1%|\bone percent\b/.test(t)) return 3;
  if (/\bten\b|\b10%|\bten percent\b/.test(t)) return 2;
  if (/\bquarter\b|\b25|\btwenty.?five\b/.test(t)) return 1;
  if (/\bhalf\b|\b50|\bfifty\b/.test(t)) return 0;
  return null;
}

/* ── the four parts ──────────────────────────────────────────────────── */

const PARTS = [
  { n: 1, title: "The one nobody used", blurb: "Six months of a portal that worked perfectly." },
  { n: 2, title: "What's actually in the inbox", blurb: "Four enrollments that really arrived. You decide first." },
  { n: 3, title: "Point it at them", blurb: "Vote before it answers. Check its judgment, not its typing." },
  { n: 4, title: "Your turn", blurb: "The call only you can make." },
];

/* ── part 1 ──────────────────────────────────────────────────────────── */

const MONTHS = [
  { label: "Sep", users: 58 },
  { label: "Oct", users: 71 },
  { label: "Nov", users: 49 },
  { label: "Dec", users: 33 },
  { label: "Jan", users: 46 },
  { label: "Feb", users: 41 },
];

/**
 * Beats.
 *
 * It opens on the learner, not on Riverbend. The earlier draft started with
 * "that portal you mentioned" — a reference to a conversation nobody had
 * had, about an organization nobody had heard of. Now she asks them
 * something true about their own workplace first, and the youth center
 * arrives as the answer to their own answer.
 *
 * `gate` names an action the beat will not move past.
 */
const BEATS = [
  { line: "Hey — good to meet you.", sub: "I'm going to show you something that went sideways at a place a lot like yours. Before I do, I want to know one thing about you.", card: 0, mic: "idle", gate: false },
  { line: "Has anywhere you've worked ever launched something new that almost nobody ended up using?", sub: "Say it out loud, or pick the closest one. There's no wrong answer here.", card: 0, mic: "live", gate: "opening" },
  { line: "Almost everyone says yes.", sub: "", card: 0, mic: "idle", gate: false },
  { line: "This is six months of it.", sub: "Poke around. Tap any month.", card: 1, mic: "idle", gate: false },
  { line: "Eleven thousand families were eligible. How many actually used it?", sub: "Commit to a number before you move on. Say it out loud too. That's the part that stings later.", card: 1, mic: "live", gate: "guess" },
  { line: "Not even close.", sub: "A quarter would have been 2,700 people. The team who built it guessed high too.", card: 2, mic: "idle", gate: false },
  { line: "And here's the part that gets me.", sub: "She was supposed to get time back. These are the coordinator's hours over the same six months.", card: 3, mic: "idle", gate: false },
  { line: "It worked perfectly. It just never landed.", sub: "Those are two different jobs, and almost nobody is assigned the second one. That second job is what we're doing today.", card: 3, mic: "live", gate: false },
] as const;

/**
 * What she says back, per answer.
 *
 * The second beat used to be one fixed line — "Almost everyone says yes." —
 * so someone who answered "not that I know of" got told they had said yes.
 * Asking a question and ignoring the answer is worse than never asking: it
 * teaches the learner that nothing they do here is heard. Each answer gets
 * its own reply, and all three arrive at the same place.
 */
const REPLIES = [
  {
    line: "Almost everyone says yes.",
    sub: (who: string) =>
      `Thanks${who ? `, ${who}` : ""}. So let me show you one with the numbers still attached. A youth center built a family portal so parents could sign their kids up online instead of emailing. It shipped on time. Tests passed. No bugs.`,
  },
  {
    line: "Almost nobody counts.",
    sub: (who: string) =>
      `And that's most of the problem right there${who ? `, ${who}` : ""}. So let me show you one where somebody did count. A youth center built a family portal so parents could sign their kids up online instead of emailing. It shipped on time. Tests passed. No bugs.`,
  },
  {
    line: "Then you're lucky, or nobody checked.",
    sub: (who: string) =>
      `Usually it's the second one${who ? `, ${who}` : ""}. So let me show you a place that did check. A youth center built a family portal so parents could sign their kids up online instead of emailing. It shipped on time. Tests passed. No bugs.`,
  },
];

/**
 * A first name, or "" when we have none.
 *
 * She does not lead with it. Being addressed by name by a machine you have
 * never spoken to before is startling — you brace instead of listening. So
 * she says hello first, asks her question, and uses the name only in her
 * reply, which is where a person uses yours: after you have told them
 * something, as acknowledgement rather than address.
 */
function firstNameOf(name: string) {
  return name.trim().split(/\s+/)[0] ?? "";
}

/** How they answer the opening question. Every road leads onward. */
const OPENERS = [
  "Yes — we have one of those",
  "Probably, I just never counted",
  "Not that I know of",
];

/** What the learner can guess, as a share of 11,061. */
const GUESSES = [
  { label: "About half", n: "5,500" },
  { label: "A quarter", n: "2,700" },
  { label: "One in ten", n: "1,100" },
  { label: "One in a hundred", n: "110" },
];

/* ── parts 2 & 3 ─────────────────────────────────────────────────────── */

type Call = "confirm" | "hold" | "human";

const CALLS: { id: Call; label: string; hint: string }[] = [
  { id: "confirm", label: "Confirm it", hint: "Enroll them, nothing's missing" },
  { id: "hold", label: "Hold it", hint: "Something needs asking first" },
  { id: "human", label: "Give it to a person", hint: "Not a machine's call at all" },
];

const CASES: {
  tab: string; file: string; when: string; from: string; body: string;
  answer: Call; decision: string; badge: string; tone: "good" | "warn" | "stop";
  because: string; fields: [string, string][]; sting?: string;
}[] = [
  {
    tab: "Kwame", file: "01_clean.txt", when: "Tuesday 9:04", from: "Grace O.",
    body: "Hi,\n\nI would like to enroll my son Kwame in the after school\nprogram at Riverbend Main. He was born 06/02/2016 and is\nin 4th grade. My number is 555-0142. Signed pickup form\nattached.\n\nThank you!",
    answer: "confirm", decision: "Ready to confirm", badge: "✓", tone: "good",
    because: "Everything it needs is there, and nothing breaks a rule.",
    fields: [["program", "ASP"], ["site", "RB1"], ["grade", "4"], ["pickup form", "attached"]],
  },
  {
    tab: "Marley", file: "02_missing_dob.txt", when: "Tuesday 11:20", from: "unknown",
    body: "hey can you sign up my daughter Marley for the after\nschool thing at eastside she is in 5th grade.\ncall me 555-0209\n\nthx",
    answer: "hold", decision: "Hold, ask the family", badge: "?", tone: "warn",
    because: "No date of birth, so it can't check she's the right age. It drafted the reply asking for it. It didn't send it.",
    fields: [["program", "ASP"], ["site", "RB2"], ["grade", "5"], ["date of birth", "missing"]],
  },
  {
    tab: "Amara", file: "05_sibling.txt", when: "Wednesday 8:41", from: "Grace O.",
    body: "Sorry, one more! Can you also add Kwame's sister Amara?\nShe's already enrolled at Riverbend Main I think\n(born 03/14/2015, grade 5). Same number, 555-0142.\nSame pickup form covers both kids.",
    answer: "confirm", decision: "Confirm as a sibling — and hold her first day", badge: "✓", tone: "good",
    because: "Same phone number as a kid already enrolled means sibling, not duplicate. That's Denise's rule, and it was written down nowhere until we wrote it down.",
    sting: "Then it caught something almost nobody in the room does. The mom says the same pickup form covers both kids. That's her assumption, not something on file. So it holds Amara's first day until a person checks that the form actually names her.",
    fields: [["program", "ASP"], ["site", "RB1"], ["grade", "5"], ["flag", "sibling priority"], ["first day", "held for check"]],
  },
  {
    tab: "Theo", file: "08_medical.txt", when: "Wednesday 16:55", from: "D. Osei",
    body: "I would like to enroll Theo (DOB 2015-08-14, grade 5) in\nAfter School at Eastside. Pickup form attached. One thing:\nTheo has an inhaler he needs to keep with him and takes a\ntablet at 4pm. Is there a form for that?",
    answer: "human", decision: "Refused. Straight to a human.", badge: "!", tone: "stop",
    because: "Medication came up, so it won't touch this one. Not because it couldn't. Because you said anything medical goes to a person.",
    sting: "Who decided that? Not the AI. Denise did, eleven years ago, and we wrote it down. That's the job.",
    fields: [["program", "ASP"], ["site", "RB2"], ["flag", "medication"], ["sent to", "a human"]],
  },
];

const TONES = {
  good: { bg: "#ffffff", fg: INK, sub: INK_SOFT, rule: RULE, badgeBg: COBALT, badgeFg: "#fff" },
  warn: { bg: "#ffffff", fg: INK, sub: INK_SOFT, rule: RULE, badgeBg: "#E4DED4", badgeFg: "#4A463F" },
  stop: { bg: INK, fg: "#ffffff", sub: "rgba(255,255,255,.7)", rule: "rgba(255,255,255,.16)", badgeBg: "#fff", badgeFg: INK },
} as const;

/* ── shell ───────────────────────────────────────────────────────────── */

type Phase = "part1" | "part2" | "part3" | "part4" | "done";
const ORDER: Phase[] = ["part1", "part2", "part3", "part4", "done"];

export function SessionStage({
  trackSlug,
  weekNumber,
  prompt,
  savedSentence,
  firstName,
}: {
  trackSlug: string;
  weekNumber: number;
  prompt: string;
  savedSentence: string;
  firstName: string | null;
}) {
  const [phase, setPhase] = useState<Phase>("part1");
  const [welcome, setWelcome] = useState(true);
  const [countIn, setCountIn] = useState<number | null>(null);
  // The platform usually knows who this is. When it doesn't — a shared
  // laptop, a profile with no first name — she asks, rather than opening on
  // "Hey there", which is the tell that nobody is really being spoken to.
  const [name, setName] = useState((firstName ?? "").trim());
  const [resumeAt, setResumeAt] = useState<Phase | null>(null);
  const partIndex = Math.max(0, ORDER.indexOf(phase));
  const voice = useNarration();

  // Where they got to lives on the device, not the server: it is a
  // convenience, and a ninety-minute session does not move between laptops.
  // The sentence — the part that matters — is saved properly.
  const key = `fde-stage:${trackSlug}:${weekNumber}`;

  useEffect(() => {
    try {
      const at = localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only storage, once on mount
      if (at && ORDER.includes(at as Phase) && at !== "part1") setResumeAt(at as Phase);
    } catch {
      /* private mode — they simply start at the beginning */
    }
  }, [key]);

  const go = useCallback(
    (next: Phase) => {
      setPhase(next);
      try {
        localStorage.setItem(key, next);
      } catch {
        /* resume is best-effort */
      }
    },
    [key],
  );

  // The overlay is the audio unlock: browsers refuse speech until the user
  // has acted, so this one click both opens the session and gives her a
  // voice. Part 1 is already mounted behind it and speaks the instant it
  // clears — the learner never meets a silent screen.
  // Dismissing the overlay used to drop the learner straight into a voice
  // already mid-sentence, which startles people. Three seconds of nothing
  // first: they see the room they have walked into, then she speaks.
  const enter = (who: string, at?: Phase) => {
    setName(who.trim());
    if (at && at !== "part1") setPhase(at);
    setWelcome(false);
    setCountIn(3);
  };

  useEffect(() => {
    if (countIn === null) return;
    if (countIn > 0) {
      const t = window.setTimeout(() => setCountIn(countIn - 1), 800);
      return () => window.clearTimeout(t);
    }
    // Speech is still allowed here: the browser's activation from the button
    // press persists for the rest of the page's life, not just that tick.
    const t = window.setTimeout(() => {
      setCountIn(null);
      if (phase === "part1") voice.say(`${BEATS[0].line} ${BEATS[0].sub}`, { force: true });
    }, 500);
    return () => window.clearTimeout(t);
  }, [countIn, phase, voice, name]);

  return (
    <div style={{ minHeight: "100dvh", background: CREAM, WebkitFontSmoothing: "antialiased", color: INK }}>
      <Keyframes />
      {welcome && <Welcome onEnter={enter} resumeAt={resumeAt} knownName={firstName} />}
      {countIn !== null && <CountIn n={countIn} />}
      <div aria-hidden={welcome || countIn !== null} style={{ maxWidth: 680, margin: "0 auto", padding: "0 20px 64px", minHeight: "100dvh", display: "flex", flexDirection: "column", filter: welcome ? "blur(6px)" : countIn !== null ? "blur(3px)" : "none", transition: "filter .6s ease" }}>
        {phase !== "done" && <PartRail active={partIndex} />}
        {phase === "part1" && <PartOne voice={voice} spoken={!welcome && countIn === null} name={name} onDone={() => go("part2")} />}
        {phase === "part2" && <PartTwo voice={voice} onDone={() => go("part3")} />}
        {phase === "part3" && <PartThree voice={voice} onDone={() => go("part4")} />}
        {phase === "part4" && (
          <PartFour
            voice={voice}
            trackSlug={trackSlug}
            weekNumber={weekNumber}
            prompt={prompt}
            saved={savedSentence}
            onDone={() => go("done")}
          />
        )}
        {phase === "done" && <Done voice={voice} />}
      </div>
    </div>
  );
}

function Keyframes() {
  return (
    <style>{`
      @keyframes fde-land { 0% { opacity:0; transform:translateY(52px) scale(.96) } 70% { opacity:1; transform:translateY(-4px) scale(1.004) } 100% { transform:none } }
      @keyframes fde-rise { from { opacity:0; transform:translateY(13px) } to { opacity:1; transform:none } }
      @keyframes fde-speak { 0%,100% { transform:scaleY(.22) } 50% { transform:scaleY(1) } }
      @keyframes fde-idle { 0%,100% { transform:scaleY(.16) } 50% { transform:scaleY(.42) } }
      @keyframes fde-countin { 0% { opacity:0; transform:scale(.72) } 65% { opacity:1; transform:scale(1.06) } 100% { transform:scale(1) } }
      @keyframes fde-nudge { 0%,100% { transform:translateX(0) } 50% { transform:translateX(3px) } }
      @keyframes fde-ring { from { stroke-dashoffset: 465 } to { stroke-dashoffset: 0 } }
      @keyframes fde-halo { 0% { opacity:.5; transform:scale(.7) } 100% { opacity:0; transform:scale(1.55) } }
      @keyframes fde-count { 0% { opacity:0; transform:scale(.5) } 45% { opacity:1; transform:scale(1.07) } 78% { transform:scale(1) } 100% { opacity:.9; transform:scale(.97) } }
      .fde-card { box-shadow: 0 30px 70px -26px rgba(90,70,45,.36), 0 2px 5px rgba(90,70,45,.05); }
      .fde-btn { transition: transform .18s ease, background .18s ease, border-color .18s ease; }
      .fde-btn:hover:not(:disabled) { transform: translateY(-1px); }
      .fde-btn:disabled { opacity: .45; cursor: not-allowed; }
      .fde-pick { transition: all .2s ease; }
      .fde-pick:hover:not(:disabled) { border-color: ${INK} !important; }
      @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
    `}</style>
  );
}

/** Where you are, by name — not anonymous dots. */
function PartRail({ active }: { active: number }) {
  return (
    <nav aria-label="Session progress" style={{ display: "flex", gap: 6, padding: "22px 0 6px", flexWrap: "wrap" }}>
      {PARTS.map((p, i) => (
        <div key={p.n} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 12px 6px 8px", borderRadius: 99, background: i === active ? INK : "transparent", border: `1px solid ${i === active ? INK : i < active ? "#DDD6CA" : "transparent"}` }}>
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 10, width: 16, height: 16, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", background: i === active ? COBALT : i < active ? "#DDD6CA" : "#EBE5DB", color: i === active ? "#fff" : i < active ? "#fff" : INK_FAINT }}>
            {i < active ? "✓" : p.n}
          </span>
          <span style={{ fontSize: 11.5, color: i === active ? "#fff" : i < active ? INK_SOFT : INK_FAINT, whiteSpace: "nowrap" }}>{p.title}</span>
        </div>
      ))}
    </nav>
  );
}

/* ── reusable bits ───────────────────────────────────────────────────── */

function Heading({ children, sub, size = 46 }: { children: React.ReactNode; sub?: string; size?: number }) {
  return (
    <div style={{ marginTop: 34 }}>
      <h1 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: `clamp(29px, 5.4vw, ${size}px)`, lineHeight: 1.11, letterSpacing: "-.04em", color: INK, margin: 0, textWrap: "pretty", animation: "fde-rise .5s cubic-bezier(.16,1,.3,1)" }}>
        {children}
      </h1>
      {sub && <p style={{ fontSize: 15, lineHeight: 1.6, color: INK_SOFT, marginTop: 14, marginBottom: 0, animation: "fde-rise .75s cubic-bezier(.16,1,.3,1)" }}>{sub}</p>}
    </div>
  );
}

function Primary({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button className="fde-btn" onClick={onClick} disabled={disabled} style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 15, padding: "13px 26px", borderRadius: 99, background: INK, color: "#fff", border: "none", cursor: "pointer" }}>
      {children}
    </button>
  );
}

/** The bottom bar. Always says what you can do and what happens next. */
function Footer({ note, children }: { note?: string; children?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, paddingTop: 26, marginTop: "auto", borderTop: `1px solid ${RULE}`, flexWrap: "wrap" }}>
      {note && <span style={{ fontSize: 12.5, color: INK_FAINT, flex: "1 1 200px" }}>{note}</span>}
      <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>{children}</div>
    </div>
  );
}

/* ── welcome ─────────────────────────────────────────────────────────── */

/**
 * The front door, and the audio unlock in one.
 *
 * A browser will not let a page speak until the user has interacted with it,
 * so something has to be clicked before she can say a word. Rather than spend
 * a whole silent screen on it, this is a scrim over Part 1: the session is
 * already there behind the blur, and the single button both opens it and
 * gives her a voice. Nobody meets a mute page.
 */
/**
 * The count-in.
 *
 * Three seconds is dead air unless it is doing something, so it does: a
 * cobalt ring closing on every beat, the numeral springing in, a halo
 * pushing outward behind it, and one short line per count saying what they
 * are walking into. By zero they should want it to start.
 */
const COUNT_LINES: Record<number, string> = {
  3: "Four parts.",
  2: "One real story.",
  1: "Your call at the end.",
};

function CountIn({ n }: { n: number }) {
  const CIRC = 465; // 2πr at r=74

  return (
    <div
      aria-hidden
      style={{ position: "fixed", inset: 0, zIndex: 45, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, background: "rgba(250,247,242,.9)", backdropFilter: "blur(10px)" }}
    >
      <div style={{ position: "relative", width: 190, height: 190, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* One expanding ring per beat, so each count pushes the air outward. */}
        <span key={`halo-${n}`} style={{ position: "absolute", inset: 26, borderRadius: "50%", border: `2px solid ${COBALT}`, animation: "fde-halo .9s cubic-bezier(.16,1,.3,1) forwards" }} />

        <svg width="190" height="190" viewBox="0 0 190 190" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <circle cx="95" cy="95" r="74" fill="none" stroke="#E9E3D9" strokeWidth="3" />
          <circle
            key={`ring-${n}`}
            cx="95" cy="95" r="74" fill="none" stroke={COBALT} strokeWidth="3" strokeLinecap="round"
            strokeDasharray={CIRC}
            style={{ animation: "fde-ring .8s linear forwards" }}
          />
        </svg>

        {n > 0 ? (
          <span key={`n-${n}`} style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 92, lineHeight: 1, letterSpacing: "-.06em", color: INK, animation: "fde-count .8s cubic-bezier(.34,1.56,.64,1)" }}>
            {n}
          </span>
        ) : (
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 25, letterSpacing: "-.03em", color: COBALT, animation: "fde-count .5s cubic-bezier(.34,1.56,.64,1)" }}>
            Here we go
          </span>
        )}
      </div>

      {n > 0 && (
        <span key={`t-${n}`} style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 17, letterSpacing: "-.02em", color: INK_SOFT, animation: "fde-rise .5s cubic-bezier(.16,1,.3,1)" }}>
          {COUNT_LINES[n] ?? ""}
        </span>
      )}
    </div>
  );
}

function Welcome({
  onEnter,
  resumeAt,
  knownName,
}: {
  onEnter: (who: string, at?: Phase) => void;
  resumeAt: Phase | null;
  knownName: string | null;
}) {
  const [typed, setTyped] = useState("");
  const resumeLabel = resumeAt ? PARTS[Math.max(0, ORDER.indexOf(resumeAt))]?.title : null;

  // A learner the platform already knows gets greeted, not interrogated.
  const known = (knownName ?? "").trim().split(/\s+/)[0] ?? "";
  const who = known || typed.trim();
  const ready = who.length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Field Ready"
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(250,247,242,.82)", backdropFilter: "blur(10px)", animation: "fde-rise .4s ease" }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) onEnter(who, resumeAt ?? undefined);
        }}
        className="fde-card"
        style={{ background: "#fff", borderRadius: 26, padding: "38px 34px", maxWidth: 470, width: "100%", textAlign: "center", animation: "fde-land .7s cubic-bezier(.22,1.4,.4,1)" }}
      >
        <span style={{ width: 44, height: 44, borderRadius: "50%", background: COBALT, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: DISPLAY, fontWeight: 700, fontSize: 17, color: "#fff" }}>F</span>

        <h1 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: "clamp(27px, 6vw, 37px)", lineHeight: 1.08, letterSpacing: "-.04em", margin: "20px 0 0" }}>
          Welcome to Field&nbsp;Ready
        </h1>
        <p style={{ fontSize: 15.5, lineHeight: 1.6, color: INK_SOFT, margin: "14px 0 0" }}>
          {known ? `Good to see you, ${known}. ` : ""}Ninety minutes, four parts. I&rsquo;ll walk
          you through a real project that failed, and you&rsquo;ll decide what an AI
          should and shouldn&rsquo;t be allowed to touch.
        </p>

        {!known && (
          <div style={{ margin: "22px 0 0", textAlign: "left" }}>
            <label htmlFor="fde-name" style={{ display: "block", fontSize: 13, color: INK_SOFT, marginBottom: 7 }}>
              First — what should I call you?
            </label>
            <input
              id="fde-name"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              autoComplete="given-name"
              placeholder="Your first name"
              style={{ width: "100%", padding: "13px 15px", borderRadius: 12, border: `1px solid ${EDGE}`, background: CREAM, fontSize: 15, color: INK, boxSizing: "border-box", fontFamily: "inherit" }}
            />
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", margin: "22px 0 0", padding: "12px 16px", borderRadius: 14, background: "#F4F0E8", fontSize: 13, color: INK_SOFT }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={COBALT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M19 5a9 9 0 0 1 0 14" />
          </svg>
          <span><strong style={{ color: INK }}>Turn your sound on.</strong> I speak, and I listen — you can answer out loud.</span>
        </div>

        <button
          type="submit"
          className="fde-btn"
          disabled={!ready}
          style={{ width: "100%", marginTop: 22, fontFamily: DISPLAY, fontWeight: 600, fontSize: 16, padding: "15px 26px", borderRadius: 99, background: ready ? INK : "#D8D2C7", color: "#fff", border: "none", cursor: ready ? "pointer" : "not-allowed" }}
        >
          {resumeAt ? `Pick up at ${resumeLabel}` : "I\u2019m ready \u2014 start talking"}
        </button>

        {resumeAt && (
          <button
            type="button"
            className="fde-btn"
            onClick={() => ready && onEnter(who, "part1")}
            style={{ width: "100%", marginTop: 10, fontSize: 13.5, padding: "11px 20px", borderRadius: 99, background: "transparent", color: INK_SOFT, border: `1px solid ${EDGE}`, cursor: "pointer" }}
          >
            Start again from the beginning
          </button>
        )}

        <p style={{ fontSize: 12, color: INK_FAINT, margin: "16px 0 0" }}>
          Nothing to install. You never write code.
        </p>
      </form>
    </div>
  );
}

/* ── part 1 ──────────────────────────────────────────────────────────── */

function PartOne({ voice, spoken, name, onDone }: { voice: Voice; spoken: boolean; name: string; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [sel, setSel] = useState(5);
  const [guess, setGuess] = useState<number | null>(null);
  const [opener, setOpener] = useState<number | null>(null);
  // Set only when an answer arrived by voice. Someone who has just spoken
  // should not then have to reach for a button to be heard — but a tap is a
  // deliberate choice they may want to change, so taps still wait.
  const [spokenAnswer, setSpokenAnswer] = useState(false);
  const b = BEATS[i];
  // Beat 2 is her reply to the question, so it is whichever answer they gave.
  const reply = i === 2 && opener !== null ? REPLIES[opener] : null;
  const line = reply?.line ?? b.line;
  const sub = reply ? reply.sub(firstNameOf(name)) : b.sub;

  // The overlay speaks beat 0 itself (it owns the audio unlock), so hold off
  // until it has cleared or the first line would be said twice.
  useSpeak(voice, spoken && i > 0 ? `${line} ${sub}` : "");

  // Only listen once she has stopped talking, or the mic hears her, not them.
  const wantsAnswer = b.gate === "opening" || b.gate === "guess";
  const { heard, state: earState } = useListening({
    active: spoken && wantsAnswer && !voice.speaking,
    onMatch: (said) => {
      if (b.gate === "opening") {
        const n = matchOpener(said);
        if (n !== null) {
          setOpener(n);
          setSpokenAnswer(true);
          return true;
        }
      }
      if (b.gate === "guess") {
        const n = matchGuess(said);
        if (n !== null) {
          setGuess(n);
          setSpokenAnswer(true);
          return true;
        }
      }
      return false;
    },
  });
  const blocked =
    (b.gate === "guess" && guess === null) || (b.gate === "opening" && opener === null);
  // A beat carrying neither a card nor a question left most of the screen
  // empty with the line stranded at the top. Nothing to show means the words
  // are the thing to look at, so they sit in the middle.
  const hasVisual = b.card > 0 || b.gate !== false;
  const last = i === BEATS.length - 1;

  const next = useCallback(() => {
    if (blocked) return;
    setSpokenAnswer(false);
    if (last) onDone();
    else setI((n) => n + 1);
  }, [blocked, last, onDone]);

  // Answered out loud? Then move on out loud. Long enough that the learner
  // sees their answer land, short enough that it still reads as a reply
  // rather than a page turning on its own.
  useEffect(() => {
    if (!spokenAnswer || blocked) return;
    const t = window.setTimeout(next, 1100);
    return () => window.clearTimeout(t);
  }, [spokenAnswer, blocked, next]);

  // She talks, she stops, and the session carries on — the way a person
  // telling you something moves to the next thing without being asked.
  // Waiting for a click after every sentence is what made this read as a
  // deck being clicked through rather than someone talking to you.
  //
  // Only when she actually narrated it: muted, the learner is reading at
  // their own speed and the page must not move under them. Beats that ask a
  // question hold regardless — those wait on an answer, not on silence.
  const wasSpeaking = useRef(false);
  useEffect(() => {
    const justFinished = wasSpeaking.current && !voice.speaking;
    wasSpeaking.current = voice.speaking;
    if (!justFinished || blocked || voice.muted || b.gate !== false) return;
    // Longer at a part boundary: crossing a section should not feel like the
    // same half-second step as moving between two lines.
    const t = window.setTimeout(next, last ? 1500 : 850);
    return () => window.clearTimeout(t);
  }, [voice.speaking, voice.muted, blocked, b.gate, last, next]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [next]);

  return (
    <>
      {!hasVisual && (
        // One growing box holding just the words, so they sit in the middle
        // of the room rather than splitting the gap with the footer.
        <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <Heading sub={sub}>{line}</Heading>
        </div>
      )}
      {hasVisual && <Heading sub={sub}>{line}</Heading>}

      <div style={{ flexGrow: hasVisual ? 1 : 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 14, padding: hasVisual ? "26px 0" : 0 }}>
        {b.card === 1 && <ChartCard sel={sel} onPick={setSel} />}
        {b.card === 2 && <BigNumber guessed={guess} />}
        {b.card === 3 && <HoursCard />}

        {b.gate === "opening" && (
          <div className="fde-card" style={{ background: "#fff", borderRadius: 20, padding: 22, animation: "fde-land .6s cubic-bezier(.22,1.4,.4,1)" }}>
            <Ear state={earState} heard={heard} />
            <div style={{ fontSize: 12.5, color: INK_SOFT, marginBottom: 12 }}>Say it out loud, or tap the closest one.</div>
            <div style={{ display: "grid", gap: 9 }}>
              {OPENERS.map((label, n) => (
                <button
                  key={label}
                  className="fde-pick"
                  onClick={() => setOpener(n)}
                  aria-pressed={opener === n}
                  style={{ textAlign: "left", padding: "14px 16px", borderRadius: 13, cursor: "pointer", background: opener === n ? INK : "#fff", color: opener === n ? "#fff" : INK, border: `1px solid ${opener === n ? INK : EDGE}`, fontFamily: DISPLAY, fontWeight: 600, fontSize: 14.5 }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {b.gate === "guess" && (
          <div className="fde-card" style={{ background: "#fff", borderRadius: 20, padding: 22, animation: "fde-land .6s cubic-bezier(.22,1.4,.4,1)" }}>
            <Ear state={earState} heard={heard} />
            <div style={{ fontSize: 12.5, color: INK_SOFT, marginBottom: 12 }}>Say a number, or tap one. You cannot move on until you do.</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 9 }}>
              {GUESSES.map((g, n) => (
                <button
                  key={g.label}
                  className="fde-pick"
                  onClick={() => setGuess(n)}
                  aria-pressed={guess === n}
                  style={{ textAlign: "left", padding: "13px 15px", borderRadius: 13, cursor: "pointer", background: guess === n ? INK : "#fff", color: guess === n ? "#fff" : INK, border: `1px solid ${guess === n ? INK : EDGE}` }}
                >
                  <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 14 }}>{g.label}</div>
                  <div style={{ fontFamily: MONO, fontSize: 11.5, color: guess === n ? "rgba(255,255,255,.65)" : INK_FAINT, marginTop: 3 }}>≈ {g.n} families</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer note={blocked ? (b.gate === "opening" ? "Pick the closest one. She's waiting on you." : "Choose a number first. That's the whole point of the next screen.") : "Arrow keys work too."}>
        <VoiceChip voice={voice} yourTurn={b.mic === "live"} />
        <Primary onClick={next} disabled={blocked}>{last ? "Part 2 →" : "Next →"}</Primary>
      </Footer>
    </>
  );
}

/** Proof the mic is on, and what it thinks you said. */
function Ear({ state, heard }: { state: "off" | "listening" | "denied" | "unsupported"; heard: string }) {
  if (state === "off") return null;

  const note =
    state === "denied"
      ? "I can't hear you. The browser blocked the microphone, so tap your answer instead."
      : state === "unsupported"
        ? "This browser won't let me listen. Tap your answer instead."
        : heard
          ? null
          : "Listening…";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "10px 14px", borderRadius: 12, background: state === "listening" ? "#EEF3FF" : "#F4F0E8", border: `1px solid ${state === "listening" ? "#C9D8FF" : EDGE}` }}>
      {state === "listening" && (
        <span style={{ display: "flex", alignItems: "center", gap: 3, height: 14, flexShrink: 0 }} aria-hidden>
          {[0, 0.12, 0.24].map((d) => (
            <span key={d} style={{ width: 3, height: 14, borderRadius: 99, background: COBALT, transformOrigin: "center", animation: `fde-speak .9s ease-in-out ${d}s infinite` }} />
          ))}
        </span>
      )}
      <span aria-live="polite" style={{ fontSize: 13, color: heard ? INK : INK_SOFT, fontStyle: heard ? "normal" : "italic" }}>
        {heard ? `“${heard}”` : note}
      </span>
    </div>
  );
}

function ChartCard({ sel, onPick }: { sel: number; onPick: (i: number) => void }) {
  return (
    <div className="fde-card" style={{ background: "#fff", borderRadius: 20, padding: 26, animation: "fde-land .7s cubic-bezier(.22,1.4,.4,1)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: INK_SOFT }}>usage_report.csv</span>
        <span style={{ fontSize: 11, color: INK_FAINT }}>tap a month</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 148 }}>
        {MONTHS.map((m, i) => (
          <button key={m.label} onClick={() => onPick(i)} aria-label={`${m.label}: ${m.users} logged in`} style={{ flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end", cursor: "pointer", background: "none", border: "none", padding: 0 }}>
            <span style={{ width: "100%", borderRadius: "5px 5px 0 0", background: i === sel ? COBALT : BONE, height: `${Math.round((m.users / 75) * 100)}%`, transition: "all .35s cubic-bezier(.16,1,.3,1)" }} />
            <span style={{ fontSize: 10, color: i === sel ? INK : "#B5AEA3" }}>{m.label}</span>
          </button>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${RULE}`, marginTop: 16, paddingTop: 14, display: "flex", alignItems: "baseline", gap: 9 }}>
        <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 28, letterSpacing: "-.03em" }}>{MONTHS[sel].users}</span>
        <span style={{ fontSize: 13, color: INK_SOFT }}>logged in · {MONTHS[sel].label}</span>
      </div>
    </div>
  );
}

function BigNumber({ guessed }: { guessed: number | null }) {
  return (
    <div className="fde-card" style={{ background: COBALT, borderRadius: 20, padding: 26, boxShadow: "0 34px 76px -24px rgba(29,60,160,.52)", animation: "fde-land .72s cubic-bezier(.22,1.4,.4,1)" }}>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,.72)" }}>of 11,061 eligible families</div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: "clamp(72px, 15vw, 104px)", lineHeight: .82, letterSpacing: "-.06em", color: "#fff", marginTop: 8, animation: "fde-countin .8s cubic-bezier(.34,1.56,.64,1)" }}>41</div>
      <div style={{ fontSize: 15, lineHeight: 1.5, color: "rgba(255,255,255,.9)", marginTop: 18 }}>Under half a percent.</div>
      {guessed !== null && (
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.22)", fontSize: 13.5, color: "rgba(255,255,255,.9)" }}>
          You said <strong>{GUESSES[guessed].label.toLowerCase()}</strong> — about {GUESSES[guessed].n}. Everyone guesses high. So did the team who built it.
        </div>
      )}
    </div>
  );
}

function HoursCard() {
  return (
    <div className="fde-card" style={{ background: "#fff", borderRadius: 20, padding: 26, animation: "fde-land .72s cubic-bezier(.22,1.4,.4,1)" }}>
      <div style={{ fontSize: 12, color: INK_SOFT, marginBottom: 15 }}>Coordinator hours, same six months</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 7, height: 148 }} aria-hidden>
        {[62, 72, 68, 46, 92, 84].map((h, i) => (
          <span key={i} style={{ flexGrow: 1, background: i === 5 ? COBALT : BONE, borderRadius: "5px 5px 0 0", height: `${h}%` }} />
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${RULE}`, marginTop: 16, paddingTop: 14, display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 19, color: INK_FAINT }}>146</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={INK_FAINT} strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 19 }}>153</span>
        <span style={{ fontSize: 13, color: COBALT, marginLeft: 3 }}>went up</span>
      </div>
    </div>
  );
}

/* ── part 2 — you read them first, no AI in the room yet ─────────────── */

function PartTwo({ voice, onDone }: { voice: Voice; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [calls, setCalls] = useState<(Call | null)[]>([null, null, null, null]);
  const c = CASES[i];
  useSpeak(voice, "All right. Four that really came in. No AI yet, just you. Read each one and tell me what you'd do with it.");
  const mine = calls[i];
  const allDone = calls.every(Boolean);

  const set = (v: Call) => setCalls((p) => p.map((x, n) => (n === i ? v : x)));

  return (
    <>
      <Heading size={42} sub="Four that really came in. No AI yet, just you. Read each one and say what you'd do with it.">
        What&rsquo;s actually in the inbox
      </Heading>

      <CaseTabs i={i} onPick={setI} done={calls} />

      <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 14, padding: "18px 0" }}>
        <EmailCard c={c} />
        <div className="fde-card" style={{ background: "#fff", borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 12.5, color: INK_SOFT, marginBottom: 12 }}>Your call on {c.tab}. Nobody sees this but you.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 9 }}>
            {CALLS.map((k) => (
              <button key={k.id} className="fde-pick" onClick={() => set(k.id)} aria-pressed={mine === k.id} style={{ textAlign: "left", padding: "13px 15px", borderRadius: 13, cursor: "pointer", background: mine === k.id ? INK : "#fff", color: mine === k.id ? "#fff" : INK, border: `1px solid ${mine === k.id ? INK : EDGE}` }}>
                <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 14 }}>{k.label}</div>
                <div style={{ fontSize: 11.5, color: mine === k.id ? "rgba(255,255,255,.65)" : INK_FAINT, marginTop: 3 }}>{k.hint}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <Footer note={allDone ? "All four called. Now watch what it does with the same rules." : `${calls.filter(Boolean).length} of 4 called — pick the rest above.`}>
        <VoiceChip voice={voice} />
        {i < 3 && <Primary onClick={() => setI(i + 1)} disabled={!mine}>Next email →</Primary>}
        {i === 3 && <Primary onClick={onDone} disabled={!allDone}>Part 3 →</Primary>}
      </Footer>
    </>
  );
}

/* ── part 3 — it answers, you get marked ─────────────────────────────── */

function PartThree({ voice, onDone }: { voice: Voice; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState<boolean[]>([false, false, false, false]);
  const [votes, setVotes] = useState<(Call | null)[]>([null, null, null, null]);
  const c = CASES[i];
  useSpeak(voice, "Now I'm giving it those same four emails and the rules Denise uses. Vote before I run each one. You're checking its judgment, not its typing.");
  const vote = votes[i];
  const open = revealed[i];
  const allOpen = revealed.every(Boolean);

  const reveal = () => setRevealed((p) => p.map((x, n) => (n === i ? true : x)));
  const set = (v: Call) => setVotes((p) => p.map((x, n) => (n === i ? v : x)));
  const t = TONES[c.tone];

  return (
    <>
      <Heading size={42} sub="Same four emails, same rules Denise uses, now handed to the AI. Vote before you look. You're checking its judgment, not its typing.">
        Point it at them
      </Heading>

      <CaseTabs i={i} onPick={setI} done={revealed} />

      <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 14, padding: "18px 0" }}>
        {!open ? (
          <div className="fde-card" style={{ background: "#fff", borderRadius: 20, padding: 22 }}>
            <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{c.tab} — what will it do?</div>
            <div style={{ fontSize: 13, color: INK_SOFT, marginBottom: 14 }}>{c.when} · {c.file}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 9 }}>
              {CALLS.map((k) => (
                <button key={k.id} className="fde-pick" onClick={() => set(k.id)} aria-pressed={vote === k.id} style={{ textAlign: "left", padding: "13px 15px", borderRadius: 13, cursor: "pointer", background: vote === k.id ? COBALT : "#fff", color: vote === k.id ? "#fff" : INK, border: `1px solid ${vote === k.id ? COBALT : EDGE}` }}>
                  <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 14 }}>{k.label}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <EmailCard c={c} compact />
            <div className="fde-card" style={{ background: t.bg, borderRadius: 20, padding: 24, animation: "fde-land .6s cubic-bezier(.22,1.4,.4,1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 30, height: 30, borderRadius: "50%", background: t.badgeBg, color: t.badgeFg, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, flexShrink: 0 }} aria-hidden>{c.badge}</span>
                <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 20, letterSpacing: "-.02em", color: t.fg }}>{c.decision}</span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: t.sub, marginTop: 14, marginBottom: 0 }}>{c.because}</p>
              {c.sting && (
                <p style={{ fontSize: 14, lineHeight: 1.65, color: t.fg, marginTop: 14, marginBottom: 0, paddingLeft: 14, borderLeft: `2px solid ${c.tone === "stop" ? "#fff" : COBALT}` }}>{c.sting}</p>
              )}
              <div style={{ borderTop: `1px solid ${t.rule}`, marginTop: 18, paddingTop: 16, display: "flex", flexWrap: "wrap", gap: "10px 26px" }}>
                {c.fields.map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 10.5, color: t.sub, textTransform: "uppercase", letterSpacing: ".08em" }}>{k}</div>
                    <div style={{ fontFamily: MONO, fontSize: 13, color: t.fg, marginTop: 3 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            {vote && (
              <div style={{ padding: "14px 18px", borderRadius: 14, background: vote === c.answer ? "#EEF3FF" : "#F4F0E8", border: `1px solid ${vote === c.answer ? "#C9D8FF" : EDGE}`, fontSize: 13.5, color: INK_SOFT }}>
                {vote === c.answer
                  ? <>You called it <strong style={{ color: COBALT }}>the same way</strong>. Good. That means the rule is in your head too.</>
                  : <>You said <strong style={{ color: INK }}>{CALLS.find((k) => k.id === vote)?.label.toLowerCase()}</strong>. It went the other way. That gap is worth arguing about out loud.</>}
              </div>
            )}
          </>
        )}
      </div>

      <Footer note={open ? (allOpen ? "All four seen." : "Use the tabs to take the next one.") : "Vote first. No peeking. Being wrong here is the lesson."}>
        <VoiceChip voice={voice} />
        {!open && <Primary onClick={reveal} disabled={!vote}>Show me what it did →</Primary>}
        {open && i < 3 && <Primary onClick={() => setI(i + 1)}>Next email →</Primary>}
        {open && i === 3 && <Primary onClick={onDone} disabled={!allOpen}>Part 4 →</Primary>}
      </Footer>
    </>
  );
}

function CaseTabs({ i, onPick, done }: { i: number; onPick: (n: number) => void; done: (Call | null | boolean)[] }) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 24, flexWrap: "wrap" }}>
      {CASES.map((x, n) => (
        <button key={x.file} onClick={() => onPick(n)} aria-pressed={n === i} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, padding: "9px 15px", borderRadius: 99, cursor: "pointer", background: n === i ? INK : "#fff", color: n === i ? "#fff" : INK_SOFT, border: `1px solid ${n === i ? INK : EDGE}`, transition: "all .2s ease" }}>
          {done[n] && <span style={{ width: 6, height: 6, borderRadius: "50%", background: n === i ? COBALT : "#C9C2B6" }} aria-hidden />}
          {x.tab}
        </button>
      ))}
    </div>
  );
}

function EmailCard({ c, compact }: { c: (typeof CASES)[number]; compact?: boolean }) {
  return (
    <div className="fde-card" style={{ background: "#fff", borderRadius: 20, padding: compact ? 20 : 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 13, gap: 12 }}>
        <span style={{ fontSize: 12.5, color: INK }}>From: {c.from}</span>
        <span style={{ fontFamily: MONO, fontSize: 11, color: INK_FAINT }}>{c.when}</span>
      </div>
      <pre style={{ margin: 0, fontFamily: MONO, fontSize: 12.5, lineHeight: 1.65, color: "#4A463F", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{c.body}</pre>
    </div>
  );
}

/* ── part 4 ──────────────────────────────────────────────────────────── */

function PartFour({
  voice, trackSlug, weekNumber, prompt, saved, onDone,
}: {
  voice: Voice; trackSlug: string; weekNumber: number; prompt: string; saved: string; onDone: () => void;
}) {
  const [v, setV] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  // Finishing writes the sentence to the week's reflection and marks the
  // session complete, so it lands where a facilitator already looks. If the
  // write fails the learner is told and kept on the page — losing the one
  // thing they were asked to produce is not an acceptable silent failure.
  const finish = async () => {
    setSaving(true);
    setError(false);
    try {
      await saveFourSecondCall(trackSlug, weekNumber, prompt, v);
      await markSessionComplete(trackSlug, weekNumber);
      onDone();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };
  useSpeak(voice, "Nobody in that room decided any of it on the spot. A person wrote the rules down years ago and the machine borrowed her judgment. So, what is yours?");
  return (
    <>
      <Heading size={46} sub="Nobody in that room decided any of it on the spot. A person wrote those rules down years ago, and the machine borrowed her judgment. So what's yours?">
        Your turn
      </Heading>

      <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "26px 0" }}>
        <div className="fde-card" style={{ background: "#fff", borderRadius: 20, padding: 26 }}>
          <label htmlFor="fde-sentence" style={{ display: "block", fontFamily: DISPLAY, fontWeight: 600, fontSize: 19, lineHeight: 1.42, letterSpacing: "-.02em" }}>
            {prompt}
          </label>
          <textarea id="fde-sentence" value={v} onChange={(e) => setV(e.target.value)} rows={3} placeholder="One sentence. The thing you just know." style={{ width: "100%", marginTop: 16, padding: "14px 16px", borderRadius: 12, border: `1px solid ${EDGE}`, background: CREAM, fontSize: 15, lineHeight: 1.6, color: INK, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
          <p style={{ fontSize: 12.5, color: error ? "#B4342C" : INK_FAINT, marginTop: 12, marginBottom: 0 }}>
            {error
              ? "That didn't save. Check your connection and try again — don't close the page."
              : "Saved to your session when you finish. Stuck? What did you retype last week that you've retyped a hundred times?"}
          </p>
        </div>
      </div>

      <Footer note="You'll read this one out loud.">
        <VoiceChip voice={voice} yourTurn />
        <Primary onClick={finish} disabled={saving || v.trim().length < 8}>{saving ? "Saving…" : "Finish →"}</Primary>
      </Footer>
    </>
  );
}

function Done({ voice }: { voice: Voice }) {
  useSpeak(voice, "That sentence is the thing you own that the AI cannot have. Everything after today is about building something that respects it.");
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 0" }}>
      <h1 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: "clamp(34px, 7vw, 54px)", lineHeight: 1.06, letterSpacing: "-.045em", margin: 0 }}>
        That sentence is the thing you own that the AI can&rsquo;t have.
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.65, color: INK_SOFT, marginTop: 20, maxWidth: 520 }}>
        Everything after today is about building something that respects it. The software
        in that story worked perfectly — it just never landed. Learning to tell those two
        apart, and then closing the gap, is the whole job.
      </p>
      <div style={{ marginTop: 26, fontSize: 13, color: INK_FAINT }}>You can close this page. Your sentence stays on this device.</div>
    </div>
  );
}
