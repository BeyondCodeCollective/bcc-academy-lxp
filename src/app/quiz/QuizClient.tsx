"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Wrench, ChartBar, Lightning, Sparkle, Lightbulb, Hammer, Target, Shield,
  MagnifyingGlass, Heart, Star, HandFist, Backpack, Rocket, Envelope, Lock,
  Desktop, ChartLineUp, Confetti, GraduationCap, HeartBreak, EyeSlash,
  Prohibit, PaintBrush, Warning, Fire, Clipboard, Handshake, Books, Brain,
  Eye, Smiley, Palette, Moon, ChatCircle, DeviceMobile, HandWaving,
  FingerprintSimple, Check,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { type PersonalityKey, careers, questions } from "@/data/marketing/quiz";
import { careerPathways, type CertLevel } from "@/data/marketing/careerPathways";

// ============================================
// TYPES
// ============================================

type AgeGroup = "under18" | "18plus" | null;
type Screen = "home" | "capture" | "quiz" | "loading" | "results";

// ============================================
// ICON HELPERS
// ============================================

function CareerIcon({ type, size = 32, className = "" }: { type: PersonalityKey; size?: number; className?: string }) {
  const props = { size, weight: "bold" as const, className };
  switch (type) {
    case "fixer": return <Wrench {...props} />;
    case "architect": return <ChartBar {...props} />;
    case "connector": return <Lightning {...props} />;
    case "creator": return <Sparkle {...props} />;
    case "builder": return <Lightbulb {...props} />;
    case "maker": return <Hammer {...props} />;
    case "strategist": return <Target {...props} />;
    case "guardian": return <Shield {...props} />;
    case "analyst": return <MagnifyingGlass {...props} />;
    case "healer": return <Heart {...props} />;
    case "educator": return <Star {...props} />;
    case "advocate": return <HandFist {...props} />;
  }
}

function AnswerIcon({ name, size = 28, className = "" }: { name: string; size?: number; className?: string }) {
  const props = { size, weight: "bold" as const, className };
  const icons: Record<string, React.ReactNode> = {
    wrench: <Wrench {...props} />, "magnifying-glass": <MagnifyingGlass {...props} />,
    "device-mobile": <DeviceMobile {...props} />, target: <Target {...props} />,
    shield: <Shield {...props} />, star: <Star {...props} />,
    desktop: <Desktop {...props} />, "chart-line-up": <ChartLineUp {...props} />,
    party: <Confetti {...props} />, rocket: <Rocket {...props} />,
    "hand-fist": <HandFist {...props} />, "graduation-cap": <GraduationCap {...props} />,
    "heart-break": <HeartBreak {...props} />, "eye-slash": <EyeSlash {...props} />,
    prohibit: <Prohibit {...props} />, "paint-brush": <PaintBrush {...props} />,
    warning: <Warning {...props} />, fire: <Fire {...props} />,
    lightning: <Lightning {...props} />, clipboard: <Clipboard {...props} />,
    handshake: <Handshake {...props} />, sparkle: <Sparkle {...props} />,
    books: <Books {...props} />, heart: <Heart {...props} />,
    brain: <Brain {...props} />, eye: <Eye {...props} />,
    smiley: <Smiley {...props} />, lightbulb: <Lightbulb {...props} />,
    palette: <Palette {...props} />, moon: <Moon {...props} />,
    "chat-circle": <ChatCircle {...props} />, hammer: <Hammer {...props} />,
    "hand-waving": <HandWaving {...props} />, "fingerprint-simple": <FingerprintSimple {...props} />,
    "chart-bar": <ChartBar {...props} />,
  };
  return <>{icons[name] || <Sparkle {...props} />}</>;
}

// ============================================
// SCREEN: HOME
// ============================================

function HomeScreen({ onSelectAge }: { onSelectAge: (age: AgeGroup) => void }) {
  return (
    <div className="h-[100dvh] flex">
      <div className="w-full lg:w-1/2 h-full bg-black flex flex-col">
        <header className="flex items-center justify-between px-4 md:px-12 py-6 md:py-8">
          <div className="font-display text-white text-sm md:text-base tracking-tight">BCC Academy</div>
          <Link href="/" className="text-white/80 text-sm hover:text-white transition-colors">
            Back to Home
          </Link>
        </header>

        <div className="flex-1 flex items-center px-4 md:px-12 lg:px-16 pb-6">
          <div className="w-full max-w-xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <h1 className="font-display text-3xl md:text-5xl lg:text-6xl text-white mb-4 md:mb-6 leading-[0.9]">
                Find your path.<br />
                <span className="text-white">Build your future.</span>
              </h1>

              <p className="text-base md:text-xl text-white/70 mb-6 md:mb-12 leading-relaxed">
                Quick questions. Real career matches. Let&rsquo;s find what fits you.
              </p>

              <p className="text-white/50 text-xs md:text-sm mb-4 md:mb-6 uppercase tracking-wider">
                [ Where are you in your journey? ]
              </p>

              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <button
                  onClick={() => onSelectAge("under18")}
                  className="group border-2 border-white/20 px-5 py-5 text-left transition-all hover:border-white active:scale-[0.98] md:hover:scale-[1.02] flex-1 bg-white/5"
                >
                  <div className="text-white/60 mb-2"><Backpack size={28} weight="bold" /></div>
                  <div className="text-lg font-semibold text-white mb-1">Still in school</div>
                  <div className="text-white/60 text-sm">Middle school, high school, or college</div>
                  <div className="text-white/40 text-[10px] mt-2 uppercase tracking-wider">
                    Designed for use with a parent or guardian.
                  </div>
                </button>

                <button
                  onClick={() => onSelectAge("18plus")}
                  className="group border-2 border-white/20 px-5 py-5 text-left transition-all hover:border-white active:scale-[0.98] md:hover:scale-[1.02] flex-1 bg-white/5"
                >
                  <div className="text-white/60 mb-2"><Rocket size={28} weight="bold" /></div>
                  <div className="text-lg font-semibold text-white mb-1">Ready to level up</div>
                  <div className="text-white/60 text-sm">Looking for a new career or skill</div>
                </button>
              </div>

              <p className="mt-6 md:mt-10 text-white/50 text-xs md:text-sm uppercase tracking-wider">
                [ 2 minutes ] &middot; No wrong answers
              </p>
              <p className="mt-3 text-white/30 text-[10px] md:text-[11px] leading-tight">
                Results are AI-generated and for guidance only.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Right side hero image */}
      <div className="hidden lg:block relative w-1/2 h-full border-l border-white/10 overflow-hidden">
        <Image
          src="/images/bcc/brand/quiz-hero.jpg"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
      </div>
    </div>
  );
}

// ============================================
// SCREEN: LEAD CAPTURE
// ============================================

function LeadCaptureScreen({
  onSubmit,
  onSkip,
}: {
  onSubmit: (contact: { type: "email"; value: string }) => void;
  onSkip: () => void;
}) {
  const [value, setValue] = useState("");
  const [isValid, setIsValid] = useState(false);

  const validateEmail = (input: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    setIsValid(validateEmail(v));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) onSubmit({ type: "email", value });
  };

  return (
    <div className="h-[100dvh] flex">
      <div className="w-full lg:w-1/2 h-full bg-black flex flex-col">
        <header className="flex items-center justify-between px-4 md:px-12 py-6 md:py-8">
          <div className="font-display text-white text-sm md:text-base tracking-tight">BCC Academy</div>
        </header>

        <div className="flex-1 flex items-center px-4 md:px-12 lg:px-16 pb-6">
          <motion.div
            className="w-full max-w-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="text-white mb-4 md:mb-6"><Envelope size={48} weight="bold" /></div>
            <h1 className="font-display text-2xl md:text-4xl text-white mb-3 md:mb-4 leading-[0.9]">
              One quick thing
            </h1>
            <p className="text-base md:text-lg text-white/70 mb-6 md:mb-8 leading-relaxed">
              Where should we send your personalized results?
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
              <div className="relative">
                <input
                  type="email"
                  value={value}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  className="w-full bg-white text-black placeholder-gray-400 px-5 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-gray-400 border-0"
                  autoFocus
                />
                {isValid && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-black">
                    <Check size={24} weight="bold" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!isValid}
                className={`w-full py-4 text-lg font-bold transition-all uppercase tracking-wider ${
                  isValid
                    ? "bg-electric-green text-true-black hover:brightness-110"
                    : "bg-white/10 text-white/30 cursor-not-allowed"
                }`}
              >
                Let&rsquo;s Go &rarr;
              </button>
            </form>

            <button
              onClick={onSkip}
              className="mt-4 md:mt-6 text-white/50 hover:text-white text-sm transition-colors"
            >
              Skip for now
            </button>

            <p className="mt-6 md:mt-8 text-white/40 text-xs flex items-center gap-2 uppercase tracking-wider">
              <Lock size={14} weight="bold" /> No spam. Unsubscribe anytime.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="hidden lg:block relative w-1/2 h-full border-l border-white/10 overflow-hidden">
        <Image
          src="/images/bcc/brand/quiz-hero-2.jpg"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
      </div>
    </div>
  );
}

// ============================================
// SCREEN: LOADING
// ============================================

function LoadingScreen({ personalityKey }: { personalityKey: PersonalityKey }) {
  const [stage, setStage] = useState(0);
  const stages = ["Analyzing your answers...", "Finding your strengths...", "Matching career paths...", "Building your roadmap..."];

  useEffect(() => {
    const interval = setInterval(() => {
      setStage((prev) => (prev < stages.length - 1 ? prev + 1 : prev));
    }, 600);
    return () => clearInterval(interval);
  }, [stages.length]);

  return (
    <div className="h-[100dvh] bg-black flex items-center justify-center px-4">
      <div className="text-center">
        <motion.div
          className="flex justify-center mb-6 md:mb-8 text-white"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <CareerIcon type={personalityKey} size={64} />
        </motion.div>
        <div className="space-y-2 md:space-y-3">
          {stages.map((text, i) => (
            <p
              key={text}
              className={`text-base md:text-lg transition-all duration-300 ${
                i <= stage ? "text-white opacity-100" : "text-white/30"
              }`}
            >
              {i < stage && <Check size={16} weight="bold" className="inline mr-2 text-white" />}
              {i === stage && <span className="mr-2">&#9679;</span>}
              {text}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// SCREEN: QUESTION
// ============================================

function QuestionScreen({
  questionIndex,
  totalQuestions,
  onAnswer,
}: {
  questionIndex: number;
  totalQuestions: number;
  onAnswer: (personality: PersonalityKey) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const q = questions[questionIndex];

  const handleSelect = (index: number, personality: PersonalityKey) => {
    setSelected(index);
    setTimeout(() => onAnswer(personality), 400);
  };

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-black">
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 z-50">
        <div className="h-1 bg-white/10">
          <motion.div
            className="h-full bg-electric-green"
            initial={{ width: 0 }}
            animate={{ width: `${((questionIndex + 1) / totalQuestions) * 100}%` }}
            transition={{ duration: 0.7 }}
          />
        </div>
        <div className="flex justify-center gap-1.5 mt-3 md:mt-6">
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 md:h-2 rounded-full transition-all duration-300 ${
                i < questionIndex
                  ? "w-1.5 md:w-2 bg-white"
                  : i === questionIndex
                  ? "w-6 md:w-8 bg-white"
                  : "w-1.5 md:w-2 bg-white/30"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 h-full flex flex-col justify-center px-4 pt-14 pb-6 md:py-24">
        <div className="w-full max-w-2xl mx-auto flex flex-col h-full md:h-auto justify-between md:justify-start">
          <div className="flex-shrink-0">
            <motion.div
              key={questionIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-3 md:mb-8"
            >
              <span className="inline-block px-4 py-1.5 bg-white/10 text-white/70 text-sm font-medium uppercase tracking-wider">
                [{String(questionIndex + 1).padStart(2, "0")}] of [{String(totalQuestions).padStart(2, "0")}]
              </span>
            </motion.div>

            <motion.h2
              key={`q-${questionIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-display text-xl md:text-4xl lg:text-5xl text-white text-center mb-4 md:mb-10 leading-[0.9] px-2"
            >
              {q.question}
            </motion.h2>
          </div>

          <div className="flex-1 flex flex-col justify-center md:block">
            <motion.div
              key={`a-${questionIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 gap-2 md:gap-3"
            >
              {q.meta.map((answer, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(i, answer.personality)}
                  disabled={selected !== null}
                  className={`group relative text-left p-4 md:p-5 transition-all duration-300 min-h-[44px]
                    ${selected === i
                      ? "bg-electric-green text-true-black scale-[1.02]"
                      : selected !== null
                      ? "bg-white/5 text-white/40 scale-[0.98]"
                      : "bg-white/10 text-white hover:bg-white/20 md:hover:scale-[1.02]"
                    }
                  `}
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                    <span className={selected === i ? "text-true-black" : "text-white"}>
                      <AnswerIcon name={answer.icon} size={28} />
                    </span>
                    <span className="font-medium text-sm md:text-base leading-tight md:leading-snug line-clamp-2">
                      {q.answers[i]}
                    </span>
                  </div>
                  {selected === i && (
                    <div className="absolute top-2 right-2 md:top-3 md:right-3">
                      <Check size={24} weight="bold" className="text-black/60" />
                    </div>
                  )}
                </button>
              ))}
            </motion.div>
          </div>

          <p className="hidden md:block text-center mt-8 text-white/40 text-sm">
            Trust your gut. First instinct is usually right.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SCREEN: RESULTS
// ============================================

function ResultsScreen({
  personalityKey,
  onRestart,
}: {
  personalityKey: PersonalityKey;
  onRestart: () => void;
}) {
  const career = careers[personalityKey];
  const [hoursPerDay, setHoursPerDay] = useState<2 | 4 | 6>(4);
  const months = career.timeToComplete[hoursPerDay];
  const pathway = careerPathways[career.pathway];

  return (
    <div className="min-h-[100dvh] bg-off-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-off-white border-b border-true-black/10">
        <div className="px-4 md:px-12 lg:px-16 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-400 hover:text-black transition-colors text-sm uppercase tracking-wider"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Home
          </Link>
          <button
            onClick={onRestart}
            className="text-gray-400 hover:text-black text-sm font-medium transition-colors uppercase tracking-wider"
          >
            Retake Quiz
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 md:px-12 py-6 md:py-10">
        {/* Result header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 md:mb-8"
        >
          <p className="mb-2 text-xs md:text-sm font-semibold tracking-wider text-gray-400 uppercase">
            [ Your Path ]
          </p>
          <h1 className="font-display text-3xl md:text-5xl text-black tracking-tight mb-2 flex items-center gap-3">
            <span className="text-black"><CareerIcon type={personalityKey} size={40} /></span>
            {career.name}
          </h1>
          <p className="text-base md:text-xl text-gray-500 italic">
            &ldquo;{career.tagline}&rdquo;
          </p>
        </motion.div>

        {/* Role card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 md:mb-8 px-4 md:px-6 py-4 md:py-5 bg-cobalt text-white"
        >
          <p className="text-sm font-semibold opacity-80 uppercase tracking-wider">Your Ideal Role</p>
          <p className="text-xl md:text-2xl font-bold">{career.role}</p>
          <p className="text-base md:text-lg opacity-90 mt-1">
            ${career.salary.mid.toLocaleString()}/year average
          </p>
        </motion.div>

        {/* Time to complete */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 md:mb-8 bg-gray-50 p-4 md:p-6 border border-black/10"
        >
          <h3 className="text-base md:text-lg font-bold text-black mb-3 md:mb-4">How long will it take?</h3>
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4 flex-wrap">
            <span className="text-gray-500 text-sm">I can spend</span>
            <div className="flex bg-white border border-black/10 p-1">
              {([2, 4, 6] as const).map((hours) => (
                <button
                  key={hours}
                  onClick={() => setHoursPerDay(hours)}
                  className={`px-4 py-1.5 text-sm font-medium transition-all ${
                    hoursPerDay === hours ? "bg-cobalt text-white" : "text-grey-3"
                  }`}
                >
                  {hours}
                </button>
              ))}
            </div>
            <span className="text-gray-500 text-sm">hrs/day</span>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-black">
            &asymp; {months} Months
          </div>
          <p className="text-gray-400 text-xs mt-2 uppercase tracking-wider">*Based on student averages</p>
        </motion.div>

        <p className="text-gray-400 text-[10px] md:text-[11px] leading-tight mb-6 md:mb-8 uppercase tracking-wider">
          Salary and timeline estimates are based on industry averages and are not guaranteed.
        </p>

        {/* Training pathway — header + cert ladder merged */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6 md:mb-8 bg-white p-4 md:p-6 border border-black/10"
        >
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase mb-1">
                [ Your Training Pathway ]
              </p>
              <h2
                className="font-display text-xl md:text-2xl tracking-tight leading-tight"
                style={{ color: pathway.accent }}
              >
                {pathway.shortName}
              </h2>
            </div>
            {pathway.status === "in-design" ? (
              <span className="inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-black/5 text-black/60 border border-black/10 whitespace-nowrap">
                In Design
              </span>
            ) : (
              <span className="inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-electric-green text-true-black whitespace-nowrap">
                Live Now
              </span>
            )}
          </div>
          <ol className="relative space-y-0">
            {pathway.certLadder.map((cert, i) => {
              const isLast = i === pathway.certLadder.length - 1;
              const levelLabel: Record<CertLevel, string> = {
                foundational: "Foundational",
                intermediate: "Intermediate",
                advanced: "Advanced",
              };
              return (
                <li key={cert.name} className="relative flex gap-4 pb-5">
                  {!isLast && (
                    <div
                      className="absolute left-[15px] top-8 bottom-0 w-px"
                      style={{ backgroundColor: `${pathway.accent}33` }}
                    />
                  )}
                  <div
                    className="relative z-10 flex-shrink-0 w-8 h-8 flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: pathway.accent }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                        {levelLabel[cert.level]}
                      </span>
                    </div>
                    <p className="font-bold text-black text-sm md:text-base">{cert.name}</p>
                    <p className="text-gray-500 text-xs md:text-sm mt-0.5 leading-relaxed">
                      {cert.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </motion.div>

        {/* Day to day */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6 md:mb-8 bg-gray-50 p-4 md:p-6 border border-black/10"
        >
          <h3 className="text-base md:text-lg font-bold text-black mb-3 md:mb-4">Day-to-day looks like</h3>
          <ul className="space-y-2">
            {career.dayToDay.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                <span className="mt-0.5 w-1.5 h-1.5 bg-cobalt rounded-full flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Next steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="mb-6"
        >
          <p className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-3">
            [ What&rsquo;s Next ]
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href="https://atg.bccacademy.io"
              className="group flex flex-col gap-2 p-4 bg-cobalt text-white hover:bg-dark-cobalt transition-colors"
            >
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/60">Program</span>
              <span className="font-bold text-sm">After The Game</span>
              <span className="text-xs text-white/70 leading-snug">Tech careers for athletes in transition</span>
              <span className="mt-auto text-xs font-bold text-electric-green group-hover:underline">Apply →</span>
            </a>
            <a
              href="/survey/pre-survey-spring-2026"
              className="group flex flex-col gap-2 p-4 bg-true-black text-white hover:bg-cobalt transition-colors"
            >
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/60">Program</span>
              <span className="font-bold text-sm">The Forge</span>
              <span className="text-xs text-white/70 leading-snug">Human-led learning in a hub near you</span>
              <span className="mt-auto text-xs font-bold text-electric-green group-hover:underline">Apply →</span>
            </a>
            <a
              href="/#hubs"
              className="group flex flex-col gap-2 p-4 border-2 border-true-black/10 hover:border-cobalt/40 transition-colors"
            >
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Location</span>
              <span className="font-bold text-sm text-black">Find a Forge Hub</span>
              <span className="text-xs text-gray-400 leading-snug">See if there&rsquo;s a hub in your city</span>
              <span className="mt-auto text-xs font-bold text-cobalt group-hover:underline">Find a Hub →</span>
            </a>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function QuizPage() {
  const [screen, setScreen] = useState<Screen>("home");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<PersonalityKey[]>([]);
  const [result, setResult] = useState<PersonalityKey>("fixer");
  const [contactInfo, setContactInfo] = useState<{ type: "email"; value: string } | null>(null);

  const totalQuestions = questions.length;

  const calculateResult = (allAnswers: PersonalityKey[]): PersonalityKey => {
    const counts: Partial<Record<PersonalityKey, number>> = {};
    allAnswers.forEach((p) => {
      counts[p] = (counts[p] || 0) + 1;
    });
    let maxKey: PersonalityKey = "fixer";
    let maxCount = 0;
    (Object.entries(counts) as [PersonalityKey, number][]).forEach(([key, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxKey = key;
      }
    });
    return maxKey;
  };

  const handleSelectAge = (age: AgeGroup) => {
    setAgeGroup(age);
    setScreen("capture");
  };

  const handleCapture = (contact: { type: "email"; value: string }) => {
    setContactInfo(contact);
    setScreen("quiz");
  };

  const handleSkipCapture = () => {
    setScreen("quiz");
  };

  const handleAnswer = (personality: PersonalityKey) => {
    const newAnswers = [...answers, personality];
    setAnswers(newAnswers);

    if (questionIndex + 1 >= totalQuestions) {
      const finalResult = calculateResult(newAnswers);
      setResult(finalResult);
      setScreen("loading");
      // Fire-and-forget the results email. If the user skipped the
      // capture screen we have no email — just no-op. Failures are
      // logged server-side but don't block the user from seeing their
      // results on screen.
      if (contactInfo?.value) {
        void fetch("/api/quiz/results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: contactInfo.value,
            personalityKey: finalResult,
            ageGroup,
          }),
        }).catch(() => {});
      }
      setTimeout(() => setScreen("results"), 3000);
    } else {
      setQuestionIndex((prev) => prev + 1);
    }
  };

  const handleRestart = () => {
    setScreen("home");
    setAgeGroup(null);
    setQuestionIndex(0);
    setAnswers([]);
    setResult("fixer");
    setContactInfo(null);
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={screen === "quiz" ? `quiz-${questionIndex}` : screen}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {screen === "home" && <HomeScreen onSelectAge={handleSelectAge} />}
        {screen === "capture" && <LeadCaptureScreen onSubmit={handleCapture} onSkip={handleSkipCapture} />}
        {screen === "quiz" && (
          <QuestionScreen
            questionIndex={questionIndex}
            totalQuestions={totalQuestions}
            onAnswer={handleAnswer}
          />
        )}
        {screen === "loading" && <LoadingScreen personalityKey={result} />}
        {screen === "results" && (
          <ResultsScreen
            personalityKey={result}
            onRestart={handleRestart}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
