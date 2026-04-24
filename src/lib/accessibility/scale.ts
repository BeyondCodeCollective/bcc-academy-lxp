// User-controlled text scale. Stored in a cookie so the preference survives
// navigation + reloads and can be read server-side to avoid a flash of
// unscaled text.
//
// The scale is applied by setting the root <html> font-size. Tailwind v4
// sizes default to rem, so text-sm, text-base, etc. all scale proportionally.

export const TEXT_SCALE_COOKIE = "text-scale";

export const TEXT_SCALES = [100, 125, 150] as const;
export type TextScale = (typeof TEXT_SCALES)[number];

export const DEFAULT_TEXT_SCALE: TextScale = 100;

export function parseTextScale(raw: string | undefined | null): TextScale {
  const n = Number(raw);
  return (TEXT_SCALES as readonly number[]).includes(n)
    ? (n as TextScale)
    : DEFAULT_TEXT_SCALE;
}

export function rootFontSizeFor(scale: TextScale): string {
  return `${(16 * scale) / 100}px`;
}
