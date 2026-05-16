// Initials avatar — letters from the person's name on a deterministically
// colored circle. No faces, no stock images. Two characters max: first letter
// of first name + first letter of last name, falling back to the first two
// letters of the local-part of their email.

type Props = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  size?: "sm" | "md" | "lg";
};

const SIZES: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-11 w-11 text-sm",
};

// Curated palette — avoids muddy or low-contrast tones. Deterministic per
// person so the same user always gets the same color.
const PALETTE = [
  ["bg-rose-100", "text-rose-700"],
  ["bg-amber-100", "text-amber-700"],
  ["bg-emerald-100", "text-emerald-700"],
  ["bg-sky-100", "text-sky-700"],
  ["bg-violet-100", "text-violet-700"],
  ["bg-fuchsia-100", "text-fuchsia-700"],
  ["bg-teal-100", "text-teal-700"],
  ["bg-orange-100", "text-orange-700"],
] as const;

function getInitials(
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null,
): string {
  const first = firstName?.trim()[0];
  const last = lastName?.trim()[0];
  if (first && last) return `${first}${last}`.toUpperCase();
  if (first) return first.toUpperCase();
  const local = email?.split("@")[0] ?? "";
  if (local.length >= 2) return local.slice(0, 2).toUpperCase();
  if (local.length === 1) return local.toUpperCase();
  return "·";
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({ firstName, lastName, email, size = "md" }: Props) {
  const initials = getInitials(firstName, lastName, email);
  const seed = `${firstName ?? ""}${lastName ?? ""}${email ?? ""}` || initials;
  const [bg, fg] = PALETTE[hashString(seed) % PALETTE.length];

  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight ${SIZES[size]} ${bg} ${fg}`}
    >
      {initials}
    </span>
  );
}
