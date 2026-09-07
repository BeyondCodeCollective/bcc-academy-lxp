// Practice-exam engine. The one rule that shapes everything here: the answer
// key never leaves the server. Client components receive questions through
// clientView() (answers stripped); grading happens in a server action against
// the key in the data module, which is import "server-only" guarded.

import "server-only";
import { NETWORK_PLUS_POST, type ExamQuestion } from "./network-plus-post";

export type Exam = typeof NETWORK_PLUS_POST;

const EXAMS: Record<string, Exam> = {
  [NETWORK_PLUS_POST.id]: NETWORK_PLUS_POST,
};

export function getExam(id: string): Exam | null {
  return EXAMS[id] ?? null;
}

/** Practice exams belonging to a course (via appliesToTracks). */
export function examsForTrack(trackSlug: string): Exam[] {
  return Object.values(EXAMS).filter((e) => e.appliesToTracks.includes(trackSlug));
}

export type ClientQuestion = Omit<ExamQuestion, "correct">;

/** The exam as the browser is allowed to see it. */
export function clientView(exam: Exam): {
  id: string;
  title: string;
  description: string;
  minutes: number;
  questions: ClientQuestion[];
} {
  return {
    id: exam.id,
    title: exam.title,
    description: exam.description,
    minutes: exam.minutes,
    questions: exam.questions.map(({ correct: _correct, ...q }) => q),
  };
}

export type DomainScore = { domain: string; correct: number; total: number };

/** A missed question as the learner may see it: what was asked and what they
 *  answered — NEVER the correct option. With unlimited retakes, revealing the
 *  key would turn the exam into memorization and void the readiness signal. */
export type MissedQuestion = {
  n: number;
  domain: string;
  prompt: string;
  /** The option text the learner chose; null if left blank. */
  answered: string | null;
};

/** One question as an INSTRUCTOR may see it: the prompt, what the learner
 *  picked, and the right answer. Staff-only — the learner-facing
 *  MissedQuestion deliberately withholds `correct`, and this must never be
 *  handed to a learner surface. */
export type ReviewedQuestion = {
  n: number;
  domain: string;
  prompt: string;
  answered: string | null;
  correct: string;
  isCorrect: boolean;
};

/** Full item-level review of a submitted attempt, for the instructor's
 *  per-student view. Ordered by question number. */
export function reviewAttempt(
  exam: Exam,
  answers: Record<string, number>,
): ReviewedQuestion[] {
  return exam.questions.map((q) => {
    const picked = answers[String(q.n)];
    return {
      n: q.n,
      domain: q.domain,
      prompt: q.prompt,
      answered: picked !== undefined ? q.options[picked] ?? null : null,
      correct: q.options[q.correct],
      isCorrect: picked === q.correct,
    };
  });
}

export function grade(
  exam: Exam,
  answers: Record<string, number>,
): { score: number; total: number; domainScores: DomainScore[]; missed: MissedQuestion[] } {
  let score = 0;
  const byDomain = new Map<string, DomainScore>();
  const missed: MissedQuestion[] = [];
  for (const q of exam.questions) {
    let d = byDomain.get(q.domain);
    if (!d) {
      d = { domain: q.domain, correct: 0, total: 0 };
      byDomain.set(q.domain, d);
    }
    d.total++;
    const picked = answers[String(q.n)];
    if (picked === q.correct) {
      score++;
      d.correct++;
    } else {
      missed.push({
        n: q.n,
        domain: q.domain,
        prompt: q.prompt,
        answered: picked !== undefined ? q.options[picked] ?? null : null,
      });
    }
  }
  return { score, total: exam.questions.length, domainScores: [...byDomain.values()], missed };
}
