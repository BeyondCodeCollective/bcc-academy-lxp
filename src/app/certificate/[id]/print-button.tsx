"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800 transition-colors"
    >
      Print Certificate
    </button>
  );
}
