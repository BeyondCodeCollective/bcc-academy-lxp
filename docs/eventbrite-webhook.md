# Eventbrite registration funnel — operations

The funnel (`/bcc/<slug>` → Eventbrite embed → portal) provisions a registrant
two ways, both idempotent on the Eventbrite order id:

- **Claim (fast path):** `POST /api/eventbrite/claim` — fired by the embed when
  checkout completes; redirects the browser straight into the portal.
- **Webhook (backstop):** `POST /api/eventbrite/webhook` — Eventbrite's
  `order.placed`; covers anyone whose browser closed before the claim ran.

Both resolve the order through the Eventbrite API (`EVENTBRITE_API_TOKEN`), so a
forged request can't provision anyone — a bogus order id just fails to resolve.
Both are also **rate-limited per IP** (claim 8/min, webhook 120/min).

## Hardening the webhook (recommended)

By default the webhook accepts any POST (the order-id resolution is the real
gate). To additionally reject anything that doesn't present a shared secret:

1. **Generate a secret:**
   ```sh
   node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
   ```
2. **Set it in Vercel** (Production) and pull locally:
   ```sh
   vercel env add EVENTBRITE_WEBHOOK_SECRET production
   ```
3. **Update the Eventbrite webhook URL** to carry the secret — either as a query
   param or an `x-webhook-secret` header. Query param is easiest in Eventbrite's
   UID:
   ```
   https://bccacademy.io/api/eventbrite/webhook?key=<secret>
   ```

⚠️ **Order matters.** The code enforces the secret the moment
`EVENTBRITE_WEBHOOK_SECRET` is set. If you set the env var **before** updating the
Eventbrite payload URL, the live webhook will start returning 401 and the backstop
will stop provisioning (the claim fast-path still works). Do step 3 first, or do 2
and 3 close together.

The comparison is constant-time. Leaving the secret unset keeps the endpoint open
(still low-risk) and is the safe default.

## Other defenses

- **Eventbrite-side (do this in the Eventbrite dashboard):** turn on CAPTCHA /
  spam protection and set a per-order / per-email ticket limit. This stops most
  bot signups at the source.
- **Curriculum is time-gated:** a registrant only ever sees the holding page until
  the course's `start_date`. A bot/no-show can't reach lessons.
- **Admin review:** `/dashboard/admin/registrations` lists every signup with an
  account-status badge and flags emails that registered multiple times (`×N`).
