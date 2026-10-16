/** "1 session", "3 sessions": the singular unit noun with an s only when it isn't one. */
export function countLabel(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}
