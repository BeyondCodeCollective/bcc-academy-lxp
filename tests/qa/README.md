# QA regression suite

Playwright specs for the checks QA runs by hand each cycle. The default run is
read-only. Tests that create or change data are in `writes.spec.ts` and are
skipped unless `QA_WRITES=1`.

## Run

```sh
set -a; . /path/to/.env.local; set +a
export SMOKE_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
export SMOKE_SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
npx playwright test -c playwright.qa.config.ts      # or: pnpm test:qa
npx playwright test -c playwright.qa.config.ts --headed   # watch it run
```

`SMOKE_BASE_URL` defaults to `https://bccacademy.io`. Without the two Supabase
variables every spec skips. Never commit the service role key.

## Files

- `october.spec.ts` (read only): public landing pages (age/ZIP fields, form position, event landing, ended page 404), phone sideways-scroll checks, public events and survey pages, admin pages as the super admin, signups filter and CSV header, access checks (plain admin is redirected away from `/dashboard/admin/mvp`, super admin is not), signed-out redirects, MASS and Security+ survey link checks, landing editor library picker, staff check-in screen.
- `writes.spec.ts` (QA_WRITES=1): creates `youngfonz+qa1..6` accounts, signups, event registrations, survey and application submissions, and toggles an event setting. The top-of-file comment lists preconditions and the prod rows created. Run `--grep @A` before `--grep @B`.
- `helpers.ts`: `loginAs`, phone viewport, sideways-scroll check.

## Rule for every write

Nothing in this suite deletes data. After any write run, a human lists the rows
created, writes the cleanup SQL (select first, then delete by exact ids or
`+qa` emails), shows it, and gets approval before running it. Do not hardcode
ids of rows that may be cleaned up; look them up at runtime.

## Gotchas

- Running `next dev` with a symlinked `node_modules` needs `--webpack`.
- `loginAs` mints a magic link with the service role key and opens `/auth/callback` directly, so no inbox is needed.
- A user who never confirmed their email needs `verification_type` `signup`, not `magiclink`; `loginAs` reads it from the generated link.
- The read-only suite signs in as real staff accounts, which updates their last sign-in time. Nothing else is written.
