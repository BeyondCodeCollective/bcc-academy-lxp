// How to read one likert question's answers in a report: its legend and how a
// stored answer becomes 1..5. Taken from the question's own anchors, because
// scales differ: current surveys run 1 = Strongly disagree to 5 = Strongly
// agree (Field Ready, MASS, ...), older ones ran the other way. A single
// hard-coded "1 = Strongly Agree" legend made the Field Ready pre-survey
// export read upside down (Mica, 2026-11-09).

type Anchors = { low: string; high: string } | undefined;

const AGREEMENT_LADDER = ["strongly disagree", "disagree", "neutral", "agree", "strongly agree"];

/** Drops a leading number and separator ("1: ", or "1" plus a dash) from an anchor. */
function anchorText(a: string): string {
  return a.replace(/^\s*\d+\s*[—–:-]\s*/, "").trim();
}

/** True when the low end of the scale is agreement (the old, inverted way). */
function agreeIsLow(anchors: Anchors): boolean {
  if (!anchors) return false;
  const low = anchors.low.toLowerCase();
  return /\bagree/.test(low) && !/disagree/.test(low);
}

export function likertLegend(anchors: Anchors, points = 5): string {
  if (!anchors) return `Scale 1 to ${points}`;
  return `Scale 1 = ${anchorText(anchors.low)} to ${points} = ${anchorText(anchors.high)}`;
}

/**
 * A stored answer as a scale point, or NaN. Numeric answers are the point the
 * learner clicked. Label answers ("Strongly Agree") land on the end of the
 * scale that the question's anchors give them.
 */
export function likertPoint(raw: unknown, anchors: Anchors): number {
  const s = String(raw ?? "").trim().toLowerCase();
  if (/^[1-5]$/.test(s)) return Number(s);
  const label = s === "neither agree nor disagree" ? "neutral" : s;
  const i = AGREEMENT_LADDER.indexOf(label);
  if (i === -1) return NaN;
  return agreeIsLow(anchors) ? 5 - i : i + 1;
}
