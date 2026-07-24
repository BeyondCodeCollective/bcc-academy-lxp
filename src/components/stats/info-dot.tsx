// A small "(i)" affordance that reveals a one-line metric definition on hover or
// focus. Pure CSS (group-hover / focus-within) so it stays presentational and
// works in Server Components — no client JS. Keyboard-reachable via tabIndex.

export function InfoDot({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <span
        tabIndex={0}
        role="button"
        aria-label={text}
        className="flex h-[15px] w-[15px] cursor-help items-center justify-center rounded-full border border-rule font-serif text-[11px] italic leading-none text-ink-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        i
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[135%] left-1/2 z-10 w-52 -translate-x-1/2 translate-y-1 rounded-lg bg-ink px-3 py-2 text-xs font-medium normal-case leading-snug tracking-normal text-paper opacity-0 shadow-lg transition group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
