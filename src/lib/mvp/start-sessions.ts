import type { MvpScheduleInput } from "./schedule";
import type { MvpSessionSlot } from "./milestones";

// Session 1 is the first slot within a teaching unit, including weekly units
// with multiple sessions. A later check-in never substitutes for that slot.
export function getMvpStartSlots(track: MvpScheduleInput["track"]): MvpSessionSlot[] | null {
  if (!track || track.selfPaced || track.startDateTbd ||
      !Number.isInteger(track.sessionsPerWeek) || track.sessionsPerWeek < 1) return null;
  const units = track.weekSummaries ?? [];
  if (!units.length || new Set(units.map(unit => unit.week)).size !== units.length ||
      units.some(unit => !Number.isInteger(unit.week) || unit.week < 0 || !unit.date ||
        !/^\d{4}-\d{2}-\d{2}$/.test(unit.date) ||
        !Number.isFinite(Date.parse(`${unit.date}T12:00:00Z`)) ||
        new Date(`${unit.date}T12:00:00Z`).toISOString().slice(0, 10) !== unit.date)) return null;
  const teaching = units.filter(unit => !unit.label?.trim()).sort((a, b) => a.date!.localeCompare(b.date!));
  if (!teaching.length || (teaching.length > 1 && teaching[0].date === teaching[1].date)) return null;
  const kickoff = units.filter(unit => /^kick[ -]?off$/i.test(unit.label?.trim() ?? ""));
  if (kickoff.length > 1 || kickoff.some(unit => unit.date! > teaching[0].date!)) return null;
  return [...kickoff, teaching[0]].map(unit => ({
    weekNumber: unit.week, sessionNumber: 1, label: unit.label || "First session",
  }));
}
