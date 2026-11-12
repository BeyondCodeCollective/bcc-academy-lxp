# Phase 3: Static checks (report only)

Raw logs in AUDIT/logs/ (eslint.json, us-english.log, build.log, build.time, madge.log, outdated.log).

## 1. ESLint (src only) : FAIL
- 799 files linted: 187 errors, 51 warnings. Exit 1. `node scripts/check-us-english.mjs`: PASS (no British spellings).
- Errors by rule: react/no-unescaped-entities 137, @next/next/no-html-link-for-pages 28, react-hooks/set-state-in-effect 12, react-hooks/preserve-manual-memoization 3, react-hooks/purity 2, react-hooks/immutability 2, no-explicit-any 1, prefer-const 1, no-children-prop 1.
- Warnings: no-unused-vars 44, unused eslint-disable directives 4, exhaustive-deps 2, jsx-a11y/alt-text 1.
- Top files: src/app/help/help-center.tsx 135 (nearly all unescaped entities), src/app/dashboard/admin/admin-tabs.tsx 28 (html-link-for-pages), admin/track-view.tsx 6, components/marketing/Header.tsx 5.
- Real-bug candidates: react-hooks/purity `Date.now` during render at src/app/dashboard/insights/page.tsx:111 and src/app/dashboard/survey/[id]/page.tsx:55 (server components, so likely harmless but flagged).
- Heap crash cause: bare `eslint` walks the repo root. Candidates: public/ (117M, 120 js files incl. zoom SDK vendor bundles, the likely culprit), archive/ (43 ts), demo/, scripts/, tests/, evals/. Recommended eslint.config.mjs globalIgnores additions: `"public/**"`, `"archive/**"`, `"demo/**"`, `"learnerpathwayassessmenttoolbuildpacket/**"`, `"qr-codes/**"`, `"docs/**"`, `"supabase/**"`, `"coverage/**"`. Or change the script to `eslint src`. (I did not bisect which one is the culprit.)

## 2. Prettier : N/A
Not configured (no config file, no dependency, no script). Not run.

## 3. next build : PASS
- Next 16.2.6 (Turbopack). Success, 26.4s wall (compile 10.8s, TS 10.3s, 57 static pages). No warnings or errors in log.
- Env needed: only the three fake Supabase vars (NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321, ANON_KEY=placeholder, SERVICE_ROLE_KEY=placeholder). No build-time network data fetches observed. Note the prebuild copies the Zoom SDK into public/zoom (96M).
- Turbopack prints no First Load JS table, so route sizes are not available from the build output (route table is names only; ~150 routes, nearly all dynamic, only /, /_not-found, /apple-icon, /assessment-preview static).
- .next left in place; `git check-ignore .next` confirms ignored.

## 4. pnpm audit : FAIL
- Held back from this public branch; tracked privately.

## 5. Circular dependencies : WARN
13 cycles (801 files), none among core app code except one: app/dashboard/admin/admin-tabs.tsx > insights-tab.tsx > page.tsx. The rest are lib/mvp type-import cycles (lib/mvp/types.ts <-> staff-review, event-queries, participant-queries, overview-participation, check-ins > attendance-verification > attention; privacy <-> survey-queries; survey-queries > survey-outcomes > types; learner-options <-> learner-queries > learner-roster) plus two in admin/mvp/mvp-components (learner-filters <-> learner-directory <-> learner-evidence). Likely type-only imports (benign at runtime); full list in madge.log (cycles 1 to 13, all listed, so the 15 shortest are all of them).

## 6. Bundle size : WARN
- .next/static/chunks total 4.5M. Largest chunks: 635 KB (tiptap/prosemirror, ~19 tiptap refs), 221 KB (react-dom), 203 KB (@supabase client), then 109, 107, 106, 100, 97, 92, 77, 75, 75, 71, 70, 70 KB.
- tiptap (rich-text-editor.tsx) is imported statically (no dynamic()) in admin/track-view.tsx and admin/track-overview-form.tsx, so the 635 KB chunk loads for the admin track pages; wrap RichTextEditor in `next/dynamic` (ssr:false) to defer. Admin-only, so learner impact is nil.
- Zoom SDK: self-hosted in public/zoom (96M), loaded at runtime by components/zoom-embed.tsx, not bundled. ZoomEmbed is statically imported in the learner track/[week] page but the SDK itself is not in a chunk.
- @react-pdf/renderer is used only in server paths (api/insights/pdf, lib/mvp/report-pdf.tsx, admin/insights-pdf.tsx); not in client chunks that I saw.
- dynamic() is used for marketing sections, nav menus, auth banner; sensible.

## 7. Hygiene : WARN
- src non-test counts: eslint-disable 40, `as any` 11, @ts-expect-error 0, @ts-ignore 0, console.log 1.
- tsconfig: strict true, skipLibCheck true, isolatedModules true, target ES2017, exclude archive. No noUncheckedIndexedAccess / noUnusedLocals.
- Outdated majors (top): typescript 5.9.3 -> 7.0.2, eslint 9.39 -> 10.14, ai 6.0 -> 7.0, @ai-sdk/anthropic 3 -> 4, @vercel/sandbox 3 -> 4, framer-motion 12 -> 14, vitest 4 -> 5, web-push 3 -> 4, lucide-react 0.577 -> 1.72, @types/node 20 -> 26, @anthropic-ai/sdk 0.124 -> 1.8. Minor lag: @supabase/supabase-js 2.99 -> 2.119, @react-pdf/renderer 4.5 -> 4.9, tiptap 3.27 -> 3.33.

## Trivial fixes
- src/app/dashboard/admin/page.tsx:706: `let trackExams` -> `const trackExams` (prefer-const).
- src/app/dashboard/admin/attendance-tab.tsx:164, track-overview-form.tsx:91, track-view.tsx:138, src/components/user-menu.tsx:66: delete the unused `eslint-disable` directive comment.
- src/app/dashboard/admin/announcements/page.tsx:37: replace `any` with a concrete type (no-explicit-any).
- eslint.config.mjs: add the globalIgnores listed in section 1.
- package.json: `lint` script could be `eslint src && node scripts/check-us-english.mjs` (not applied, report only).

## Logged, not trivial
- 137 react/no-unescaped-entities in src/app/help/help-center.tsx (mass escape of quotes/apostrophes) and 28 no-html-link-for-pages in admin-tabs.tsx (`<a>` -> `<Link>`, check intent).
- 12 react-hooks/set-state-in-effect, 3 preserve-manual-memoization, 2 immutability: React Compiler rule violations, need per-case review.
- Cycle admin-tabs <-> insights-tab <-> page.tsx; extract shared types.
- Dynamic-import RichTextEditor; consider noUnusedLocals/noUncheckedIndexedAccess.
