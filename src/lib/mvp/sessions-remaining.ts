import type { MvpScheduleInput } from "./schedule";
import { resolveMvpHeldSessions, type MvpSessionDelivery } from "./held-sessions";

// Includes overdue sessions that have not been confirmed delivered.
export function calculateMvpSessionsRemaining(track: MvpScheduleInput["track"], delivery: MvpSessionDelivery[], asOf: Date) {
  const { remaining, total, delivered, unavailableReason } = resolveMvpHeldSessions(track, delivery, asOf);
  return { remaining, total, delivered, unavailableReason };
}
