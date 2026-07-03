// Catalyst Participation Agreement — one-click "please sign" email.
//
// Sends each student a personal /invite/<token>?next=/dashboard/agreement
// link: one click signs them in (creating the account + enrollment on first
// use) and lands directly on the Participation Agreement signing page.
// Reuses the durable invite token if the student already has one for the
// track; safe to send to students who already have accounts.
//
// Usage:
//   node scripts/send-agreement-request.mjs --track game-on --test you@example.com
//   node scripts/send-agreement-request.mjs --track game-on --list scripts/agreement-recipients.local.csv --dry-run
//   node scripts/send-agreement-request.mjs --track game-on --list scripts/agreement-recipients.local.csv --send
//
// Agreement-only (no course enrollment on click): --track none
// The invite row stores an empty track_slug; the auth callback treats an
// empty track as "don't enroll", so the click creates the account and signs
// the agreement — nothing else.
//
// The CSV needs an email somewhere on each line (header rows ignored); any
// other fields on the line are treated as the student's name. Run --dry-run
// first to eyeball the parsed rows. Progress is checkpointed to
// scripts/agreement-send-results.local.json after every send, so re-running
// --send skips anyone already delivered.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const PROGRAM_SLUG = "catalyst";
const RESULTS_FILE = "scripts/agreement-send-results.local.json";
const SEND_DELAY_MS = 550; // ~2/sec — Resend rate limit
const AGREEMENT_NEXT = "/dashboard/agreement";
const ORIGIN = "https://bccacademy.io";

function env(key, fallback) {
  const line = readFileSync(".env.local", "utf8")
    .split("\n")
    .find((l) => l.startsWith(key + "="));
  if (!line) {
    if (fallback !== undefined) return fallback;
    throw new Error(`missing ${key} in .env.local`);
  }
  return line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
}

// Mirrors src/lib/invite-token.ts — short, unambiguous, ~81 bits of entropy.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
function generateInviteToken() {
  const bytes = randomBytes(14);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

// ---------- email content ----------

// Adult Catalyst cohort — BCC Academy brand (unlike the BGC-branded camp mail).
const FROM = "BCC Academy <noreply@mail.bccacademy.io>";
const SUBJECT = "Action needed: sign your Catalyst Participation Agreement";

function emailText(firstName, inviteLink) {
  const hi = firstName ? `Hi ${firstName},` : "Hi,";
  return `${hi}

Before we get started, we need you to review and sign the Catalyst Participation Agreement — it covers the commitments we make to each other as a learning community.

It takes about two minutes. The link below signs you in automatically (no password needed) and takes you straight to the agreement:

${inviteLink}

Questions? Reply to this email or contact info@bccacademy.io.

— The BCC Academy Team`;
}

function emailHtml(firstName, inviteLink) {
  const hi = firstName ? `Hi ${firstName},` : "Hi,";
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
  <div style="background:#1a1a1a;padding:28px 24px;text-align:center;">
    <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em;text-transform:uppercase;color:#ffffff;">BCC Academy</p>
    <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.7);">Catalyst · Participation Agreement</p>
  </div>
  <div style="padding:32px 24px;">
    <p style="margin:0 0 16px;font-size:16px;color:#1a1a1a;">${hi}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#555;">Before we get started, we need you to review and sign the <strong>Catalyst Participation Agreement</strong> — it covers the commitments we make to each other as a learning community.</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#555;">It takes about two minutes. The button below signs you in automatically (no password needed) and takes you straight to the agreement:</p>
    <div style="text-align:center;margin:0 0 28px;">
      <a href="${inviteLink}" style="display:inline-block;padding:14px 36px;background:#1a1a1a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.02em;">Review &amp; Sign →</a>
    </div>
    <p style="margin:0;font-size:12px;color:#999;line-height:1.5;">Questions? Reply here or email <a href="mailto:info@bccacademy.io" style="color:#1a1a1a;">info@bccacademy.io</a>.</p>
  </div>
</div>`;
}

// ---------- provisioning (mirrors send-roblox-reminder.mjs) ----------

const svc = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

let programId = null;
async function getProgramId() {
  if (programId) return programId;
  const { data, error } = await svc.from("programs").select("id").eq("slug", PROGRAM_SLUG).single();
  if (error || !data) throw new Error(`no programs row for ${PROGRAM_SLUG}`);
  programId = data.id;
  return programId;
}

/** Pre-create the account with the student's real name; never clobbers an existing name. */
async function provisionName(email, first, last) {
  if (!first && !last) return;
  const { data: created } = await svc.auth.admin
    .createUser({ email, email_confirm: true })
    .catch(() => ({ data: null }));
  const userId = created?.user?.id;
  if (userId) {
    const { error } = await svc.from("students").upsert(
      {
        id: userId,
        email,
        first_name: first,
        last_name: last,
        role: "student",
        cohort_id: null,
        program_id: await getProgramId(),
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
    if (error) throw new Error(`students insert: ${error.message}`);
    return;
  }
  const { data: row } = await svc
    .from("students")
    .select("id, first_name, last_name")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();
  if (row && !(row.first_name ?? "").trim() && !(row.last_name ?? "").trim()) {
    await svc.from("students").update({ first_name: first, last_name: last }).eq("id", row.id);
  }
}

/** Allowlist + reuse-or-mint the durable invite token. */
async function provision(email, trackSlug) {
  // Agreement-only invites (empty track) skip the allowlist: an allowlist row
  // would make the callback's allowlist-inference re-attach a course.
  if (trackSlug) {
    const { error: allowErr } = await svc
      .from("allowed_signup_emails")
      .upsert({ email, track_slug: trackSlug }, { onConflict: "email,track_slug", ignoreDuplicates: true });
    if (allowErr) throw new Error(`allowlist: ${allowErr.message}`);
  }

  const { data: existing } = await svc
    .from("invites")
    .select("token")
    .eq("track_slug", trackSlug)
    .ilike("email", email)
    .limit(1)
    .maybeSingle();
  if (existing?.token) return existing.token;

  const token = generateInviteToken();
  const { error: insErr } = await svc.from("invites").insert({
    token,
    email,
    track_slug: trackSlug,
    program_slug: PROGRAM_SLUG,
    status: "sent",
  });
  if (insErr) throw new Error(`invite insert: ${insErr.message}`);
  return token;
}

async function sendEmail(to, firstName, inviteLink) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to,
      subject: SUBJECT,
      text: emailText(firstName, inviteLink),
      html: emailHtml(firstName, inviteLink),
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
  return (await res.json()).id;
}

// ---------- CSV parsing (email anywhere on the line; other fields = name) ----------

function parseList(path) {
  const rows = [];
  for (const rawLine of readFileSync(path, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const fields = line.split(",").map((f) => f.trim().replace(/^["']|["']$/g, ""));
    const email = fields.find((f) => f.includes("@"))?.toLowerCase();
    if (!email) continue; // header or malformed
    const nameFields = fields.filter((f) => f && !f.includes("@"));
    let first = "", last = "";
    if (nameFields.length >= 2) [first, last] = nameFields;
    else if (nameFields.length === 1) {
      const ix = nameFields[0].indexOf(" ");
      if (ix > 0) { first = nameFields[0].slice(0, ix); last = nameFields[0].slice(ix + 1); }
      else first = nameFields[0];
    }
    rows.push({ email, first, last });
  }
  return rows;
}

// ---------- main ----------

const args = process.argv.slice(2);
const flag = (name) => {
  const ix = args.indexOf(`--${name}`);
  return ix >= 0 ? (args[ix + 1]?.startsWith("--") ? true : args[ix + 1] ?? true) : null;
};

const trackFlag = flag("track");
if (!trackFlag || trackFlag === true) {
  console.error("Required: --track <slug> (the course these students belong to, or `none` for agreement-only)");
  process.exit(1);
}
// `none` → empty track_slug: the click creates the account + signs the
// agreement without enrolling in any course.
const trackSlug = trackFlag === "none" ? "" : trackFlag;

const testEmail = flag("test");
const listPath = flag("list");
const dryRun = args.includes("--dry-run");
const doSend = args.includes("--send");

const recipients = testEmail
  ? [{ email: String(testEmail).toLowerCase(), first: "Test", last: "Student" }]
  : listPath
    ? parseList(String(listPath))
    : [];

if (recipients.length === 0) {
  console.error("Nothing to send: pass --test <email> or --list <csv>");
  process.exit(1);
}

// Verify the track exists under the program before touching anything.
if (trackSlug) {
  const pid = await getProgramId();
  const { data: trackRow } = await svc
    .from("track_overrides")
    .select("track_slug")
    .eq("program_id", pid)
    .eq("track_slug", trackSlug)
    .maybeSingle();
  if (!trackRow) {
    console.warn(`⚠ track "${trackSlug}" has no track_overrides row under ${PROGRAM_SLUG} — make sure the slug is right (TS-config tracks are fine).`);
  }
}

const results = existsSync(RESULTS_FILE) ? JSON.parse(readFileSync(RESULTS_FILE, "utf8")) : {};

console.log(`${recipients.length} recipient(s) · track=${trackSlug || "none (agreement only)"} · ${dryRun ? "DRY RUN" : doSend || testEmail ? "SENDING" : "no --send/--dry-run flag; defaulting to DRY RUN"}\n`);

for (const { email, first, last } of recipients) {
  if (results[email]?.sent) {
    console.log(`↷ ${email} — already sent (${results[email].sent})`);
    continue;
  }
  if (dryRun || (!doSend && !testEmail)) {
    console.log(`· ${email} — ${first} ${last}`.trim());
    continue;
  }
  try {
    await provisionName(email, first, last);
    const token = await provision(email, trackSlug);
    const inviteLink = `${ORIGIN}/invite/${token}?next=${encodeURIComponent(AGREEMENT_NEXT)}`;
    const id = await sendEmail(email, first, inviteLink);
    results[email] = { sent: new Date().toISOString(), resendId: id, token };
    writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    console.log(`✓ ${email} — sent (${id})`);
  } catch (err) {
    results[email] = { error: String(err?.message ?? err) };
    writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    console.error(`✗ ${email} — ${err?.message ?? err}`);
  }
  await new Promise((r) => setTimeout(r, SEND_DELAY_MS));
}

console.log("\nDone.");
