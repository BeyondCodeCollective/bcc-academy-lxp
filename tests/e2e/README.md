# Local end to end tests

Run only against localhost. `playwright.local.config.ts` throws if the base URL is not localhost or 127.0.0.1, and every test aborts any non-local request (`support/test.ts`).

    pnpm build   # needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (any fake values)
    pnpm exec playwright test -c playwright.local.config.ts

The config starts two servers and stops them at the end of the run: the Supabase stub on 54399 and `next start` on 3100 (override with `E2E_PORT`, `E2E_STUB_PORT`). Never run `test:smoke` or `test:qa`, they default to production.

## How auth works without credentials

No real Supabase and no real keys are involved. `support/supabase-stub.mjs` is a dependency free Node http server that impersonates two surfaces:

- GoTrue `GET /auth/v1/user`, which returns the user whose id is inside the bearer token.
- PostgREST `/rest/v1/*`, which serves the rows in `support/fixtures.mjs` (programs, cohorts, students, enrollments, instructor assignments, track overrides, allowlist, applications, landing page). Filters are applied loosely and rows are NOT scoped per caller, so this layer cannot test RLS (see AUDIT/ for the separate RLS harness).

`NEXT_PUBLIC_SUPABASE_URL` points at the stub, so the app builds its session cookie name from the host: `sb-localhost-auth-token`. `loginAs(context, "student" | "future" | "empty" | "instructor" | "admin" | "super", { program, preview })` writes that cookie as `base64-` plus base64url of a session JSON whose access_token is a fake HS256 shaped JWT. supabase-js falls back to `getUser` for HS tokens, which the stub answers. Staff pages need a program, so `program-override=atg` is set for them; `preview: true` sets `preview-as-student`.

All emails are `@example.test`. Nothing is sent: Resend and other third party keys are absent.

## Layout

- `public.spec.ts` public pages, login and apply forms
- `authwalls.spec.ts` walled routes, safe `next`, auth callback, invite
- `student.spec.ts`, `staff.spec.ts` (instructor, admin, preview as student)
- `session.spec.ts` expired and malformed sessions
- `api.spec.ts` unauthenticated API probes
- Per page axe, console, overflow and image findings go to `test-results/audit/*.jsonl`.
