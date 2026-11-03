/**
 * Strict, REPORT-ONLY script policy used to measure what it would take to drop
 * 'unsafe-inline' / 'unsafe-eval' from the enforced policy in next.config.ts.
 * It never blocks anything. Violations go to /api/csp-report?ro=1 and are
 * logged as [csp-report-only] so they can be told apart from enforced hits.
 *
 * Only script-src is set on purpose: every other directive is already enforced
 * by the real header, so repeating them here would just double the report noise.
 *
 * 'unsafe-eval' is deliberately NOT included. The Zoom Meeting SDK may need it
 * (and certainly needs WebAssembly, hence 'wasm-unsafe-eval'), but that is
 * unverified: leaving it out means the report stream shows whether the SDK
 * really calls eval/new Function instead of us guessing. Dev adds it because
 * React uses eval for debugging there (Next docs).
 *
 * 'strict-dynamic' makes browsers ignore host allowlists and 'self', trusting
 * only nonce'd scripts and the scripts they load. Older browsers that lack it
 * fall back to the https: / blob: entries.
 */
export function buildStrictScriptPolicy(nonce: string): string {
  const dev = process.env.NODE_ENV === "development";
  return [
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${dev ? " 'unsafe-eval'" : ""} https: blob:`,
    "report-uri /api/csp-report?ro=1",
  ].join("; ");
}

export const CSP_REPORT_ONLY_HEADER = "Content-Security-Policy-Report-Only";
