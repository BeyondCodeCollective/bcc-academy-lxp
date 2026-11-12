/**
 * Buttons for the week page. Pill-shaped and 44px tall, per the approved week
 * page layout: one primary action per block, everything else quiet.
 */
const WEEK_BTN =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-[22px] text-[15px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export const weekBtnPrimary = `${WEEK_BTN} bg-primary text-white hover:bg-primary-hover`;
export const weekBtnQuiet = `${WEEK_BTN} border border-ink text-ink hover:bg-surface-soft`;

/** The small state word that sits right of a block heading ("Not sent yet"). */
export const weekState =
  "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-sans text-[13px] font-medium tracking-normal text-ink-faint";
export const weekStateDone = `${weekState} !text-success-text`;

/** Block heading: Archivo 20px with an optional state word on the right. */
export const weekHeading =
  "mb-3.5 flex items-baseline justify-between gap-3 text-xl font-semibold leading-tight text-ink";
