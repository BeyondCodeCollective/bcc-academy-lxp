# Phase 4: Lighthouse (mobile preset, simulated throttling)

Lighthouse 12.6.1 against the PRODUCTION build (`next build` + `next start`) on localhost:3100 with fake Supabase stub, headless Playwright Chromium, all non-localhost hosts unresolvable. Numbers are from a laptop with stubbed data and no CDN, so use them for relative comparison only; dev mode numbers would be much worse and are not representative. Logged-in dashboards were not scored (cookie auth not supported by the CLI run).

| Page | Perf | A11y | Best practices | SEO | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|
| / | 83 | 95 | 93 | 100 | 4.7 s | 0 ms | 0 |
| /login | 87 | 95 | 93 | 100 | 4.0 s | 10 ms | 0 |
| /atg/e2e-landing | 91 | 100 | 96 | 100 | 3.4 s | 20 ms | 0 |
| /apply/e2e-open-app | 88 | 95 | 96 | 100 | 3.8 s | 20 ms | 0 |

Top opportunities: LCP is the only real issue (3.4 to 4.7 s simulated mobile); check the LCP element and image sizing on `/` first. Also flagged: unused JavaScript, legacy JavaScript (apply, landing), color-contrast (same white/40 pattern as 04-a11y.md), offscreen images on /login. Console errors and inspector issues are the Vercel insights script 404 and the blocked third party calls from our network block, not product defects.
