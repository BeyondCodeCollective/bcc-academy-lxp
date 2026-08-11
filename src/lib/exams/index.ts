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

export function grade(
  exam: Exam,
  answers: Record<string, number>,
): { score: number; total: number; domainScores: DomainScore[] } {
  let score = 0;
  const byDomain = new Map<string, DomainScore>();
  for (const q of exam.questions) {
    let d = byDomain.get(q.domain);
    if (!d) {
      d = { domain: q.domain, correct: 0, total: 0 };
      byDomain.set(q.domain, d);
    }
    d.total++;
    if (answers[String(q.n)] === q.correct) {
      score++;
      d.correct++;
    }
  }
  return { score, total: exam.questions.length, domainScores: [...byDomain.values()] };
}
