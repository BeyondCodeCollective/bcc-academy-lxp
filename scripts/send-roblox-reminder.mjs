// Roblox Virtual Summer Bootcamp — day-before reminder campaign (July 6, 2026).
//
// Sends the "starts tomorrow" email to every participant with their personal
// one-click /invite/<token> login link. Reuses the durable token a registrant
// already has (Eventbrite registration minted one); mints + provisions
// (allowlist + invite row) for anyone new. Unlike the admin invites panel,
// this sends to EVERYONE on the list — including people who already have
// accounts — because it's an event reminder, not a first-touch invite.
//
// Usage:
//   node scripts/send-roblox-reminder.mjs --test you@example.com
//   node scripts/send-roblox-reminder.mjs --list scripts/roblox-participants.local.csv --dry-run
//   node scripts/send-roblox-reminder.mjs --list scripts/roblox-participants.local.csv --send
//
// The CSV needs an email somewhere on each line (header rows ignored); any
// other fields on the line are treated as the student's name (2 fields →
// first + last, 1 field → split on the first space). When a name is present
// the account is PRE-CREATED with it, so the Zoom embed joins with the
// student's real name for attendance (invite-click accounts are otherwise
// nameless, which the Zoom SDK rejects). Run --dry-run first to eyeball the
// parsed names. Progress is checkpointed to
// scripts/roblox-send-results.local.json after every send, so re-running
// --send skips anyone already delivered.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const TRACK_SLUG = "roblox-virtual-bootcamp";
const PROGRAM_SLUG = "bgc";
const RESULTS_FILE = "scripts/roblox-send-results.local.json";
const SEND_DELAY_MS = 550; // ~2/sec — Resend rate limit

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

// Parent-facing brand is Black Girls Code — the org families registered with.
// BCC Academy is the infrastructure, not the brand on student email (same
// white-label rule as src/lib/email.ts). Address stays on the verified
// mail.bccacademy.io domain; only the display name changes.
const FROM = "Black Girls Code <noreply@mail.bccacademy.io>";

const SUBJECT =
  "Reminder: Roblox Virtual Summer Bootcamp starts TOMORROW — your one-click login inside 🚀";

function emailText(inviteLink) {
  return `Hi!

We hope this email finds you well!

Just a quick reminder that the Roblox Virtual Summer Bootcamp kicks off TOMORROW (Tuesday, July 7) at 9:00 AM EST!

The bootcamp runs three days — Tuesday through Thursday, July 7–9 — at the same time each day. We're so excited to code with your student!

🔔 Important Reminders:

✅ Arrive ON TIME:
This helps instructors support all students and keeps activities running smoothly.

✅ One-Click Login (NEW!):
This year students join right from their personal camp portal — no Zoom links or meeting IDs needed. Your student's personal login link is below: one click signs them in (no password) and their name is set automatically for attendance. The same link works all three days, so keep this email handy!

✅ Cameras ON:
Students should have their cameras on throughout the workshop to engage with peers and instructors. 🎥

📅 Event Details:

🕕 When: Tuesday–Thursday, July 7–9 · 9:00 AM EST daily

💻 Where: your student's personal portal link (works all 3 days):
${inviteLink}

We can't wait to see everyone tomorrow for an amazing session!

Questions? Reply to this email or contact info@bccacademy.io.`;
}

function emailHtml(inviteLink) {
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
  <div style="background:#1a1a1a;padding:28px 24px;text-align:center;">
    <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em;text-transform:uppercase;color:#ffffff;">Black Girls Code</p>
    <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.7);">Roblox Virtual Summer Bootcamp</p>
  </div>
  <div style="padding:32px 24px;">
    <p style="margin:0 0 16px;font-size:16px;color:#1a1a1a;">Hi!</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#555;">We hope this email finds you well!</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#555;">Just a quick reminder that the <strong>Roblox Virtual Summer Bootcamp</strong> kicks off <strong>TOMORROW (Tuesday, July 7) at 9:00 AM EST</strong>! The bootcamp runs three days — Tuesday through Thursday, July 7–9 — at the same time each day.</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#555;">We're so excited to code with your student!</p>

    <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#1a1a1a;">🔔 Important Reminders:</p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#555;">✅ <strong>Arrive ON TIME:</strong><br/>This helps instructors support all students and keeps activities running smoothly.</p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#555;">✅ <strong>One-Click Login (NEW!):</strong><br/>This year students join right from their personal camp portal — no Zoom links or meeting IDs needed. The button below signs your student in with one click (no password), and their name is set automatically for attendance. The same link works all three days, so keep this email handy!</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#555;">✅ <strong>Cameras ON:</strong><br/>Students should have their cameras on throughout the workshop to engage with peers and instructors. 🎥</p>

    <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#1a1a1a;">📅 Event Details:</p>
    <p style="margin:0 0 6px;font-size:15px;line-height:1.6;color:#555;">🕕 <strong>When:</strong> Tuesday–Thursday, July 7–9 · 9:00 AM EST daily</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#555;">💻 <strong>Where:</strong> your student's personal portal — one click below:</p>
    <div style="text-align:center;margin:0 0 28px;">
      <a href="${inviteLink}" style="display:inline-block;padding:14px 36px;background:#1a1a1a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.02em;">Enter the Bootcamp →</a>
    </div>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#555;">We can't wait to see everyone tomorrow for an amazing session!</p>
    <p style="margin:0;font-size:12px;color:#999;line-height:1.5;">Questions? Reply here or email <a href="mailto:info@bccacademy.io" style="color:#1a1a1a;">info@bccacademy.io</a>.</p>
  </div>
</div>`;
}

// ---------- provisioning ----------

const svc = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

let bgcProgramId = null;
async function getBgcProgramId() {
  if (bgcProgramId) return bgcProgramId;
  const { data, error } = await svc.from("programs").select("id").eq("slug", PROGRAM_SLUG).single();
  if (error || !data) throw new Error(`no programs row for ${PROGRAM_SLUG}`);
  bgcProgramId = data.id;
  return bgcProgramId;
}

/**
 * Pre-create the account with the student's real name so the Zoom embed joins
 * with it (attendance). Never clobbers a name the student already has. The
 * auth callback's later upsert uses ignoreDuplicates, so this row survives
 * their first click.
 */
async function provisionName(email, first, last) {
  if (!first && !last) return;
  const { data: created } = await svc.auth.admin
    .createUser({ email, email_confirm: true })
    .catch(() => ({ data: null }));
  let userId = created?.user?.id;
  if (userId) {
    const { error } = await svc.from("students").upsert(
      {
        id: userId,
        email,
        first_name: first,
        last_name: last,
        role: "student",
        cohort_id: null,
        program_id: await getBgcProgramId(),
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
    if (error) throw new Error(`students insert: ${error.message}`);
    return;
  }
  // Auth user already existed — backfill the students row only if nameless.
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

/** Allowlist + reuse-or-mint the durable invite token (mirrors eventbrite-funnel). */
async function provision(email) {
  const { error: allowErr } = await svc
    .from("allowed_signup_emails")
    .upsert({ email, track_slug: TRACK_SLUG }, { onConflict: "email,track_slug", ignoreDuplicates: true });
  if (allowErr) throw new Error(`allowlist: ${allowErr.message}`);

  const { data: existing } = await svc
    .from("invites")
    .select("token")
    .eq("track_slug", TRACK_SLUG)
    .ilike("email", email)
    .limit(1)
    .maybeSingle();
  if (existing?.token) return existing.token;

  const token = generateInviteToken();
  const { error: insErr } = await svc.from("invites").insert({
    token,
    email,
    track_slug: TRACK_SLUG,
    program_slug: PROGRAM_SLUG,
    status: "sent",
  });
  if (insErr) throw new Error(`invite insert: ${insErr.message}`);
  return token;
}

async function sendEmail(to, inviteLink) {
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
      text: emailText(inviteLink),
      html: emailHtml(inviteLink),
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

// ---------- run modes ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  return {
    test: get("--test"),
    // Optional with --test: "First Last" pre-provisions the account name.
    name: get("--name"),
    list: get("--list"),
    origin: get("--origin") ?? "https://bccacademy.io",
    dryRun: args.includes("--dry-run"),
    send: args.includes("--send"),
  };
}

function readList(path) {
  const rows = readFileSync(path, "utf8")
    .split("\n")
    .flatMap((line) => {
      // Take whichever comma/semicolon-separated field is an email; header
      // rows and blank lines simply have none. Remaining fields are the name.
      const fields = line.split(/[,;\t]/).map((f) => f.trim().replace(/^["']|["']$/g, ""));
      const email = fields.find((f) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f));
      if (!email) return [];
      const nameFields = fields.filter((f) => f && f !== email);
      let first = "", last = "";
      if (nameFields.length >= 2) {
        [first, last] = nameFields;
      } else if (nameFields.length === 1) {
        const parts = nameFields[0].split(/\s+/);
        first = parts[0] ?? "";
        last = parts.slice(1).join(" ");
      }
      return [{ email: email.toLowerCase(), first, last }];
    });
  // Dedupe by email, first occurrence wins.
  const seen = new Map();
  for (const r of rows) if (!seen.has(r.email)) seen.set(r.email, r);
  return [...seen.values()];
}

function loadResults() {
  return existsSync(RESULTS_FILE) ? JSON.parse(readFileSync(RESULTS_FILE, "utf8")) : {};
}

const { test, name, list, origin, dryRun, send } = parseArgs();

if (test) {
  const email = test.toLowerCase();
  if (name) {
    const [first, ...rest] = name.split(/\s+/);
    await provisionName(email, first, rest.join(" "));
  }
  const token = await provision(email);
  const link = `${origin}/invite/${token}`;
  await sendEmail(email, link);
  console.log(`✅ Test sent to ${email}\n   link: ${link}`);
  process.exit(0);
}

if (!list) {
  console.error("Usage: --test <email> | --list <csv> [--dry-run | --send]");
  process.exit(1);
}

const people = readList(list);
console.log(`${people.length} unique emails in ${list}`);

if (!dryRun && !send) {
  console.error("Refusing to send without an explicit --send (or use --dry-run).");
  process.exit(1);
}

const results = loadResults();
let sent = 0, skipped = 0, failed = 0;

for (const { email, first, last } of people) {
  if (results[email]?.status === "sent") {
    skipped++;
    continue;
  }
  try {
    if (dryRun) {
      const token = await provision(email);
      console.log(`DRY  ${email}  (${first} ${last})`.trimEnd() + `  →  ${origin}/invite/${token}`);
      continue;
    }
    await provisionName(email, first, last);
    const token = await provision(email);
    const link = `${origin}/invite/${token}`;
    await sendEmail(email, link);
    results[email] = { status: "sent", at: new Date().toISOString() };
    writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    sent++;
    console.log(`SENT ${email}`);
    await sleep(SEND_DELAY_MS);
  } catch (e) {
    failed++;
    results[email] = { status: "failed", error: String(e?.message ?? e) };
    writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    console.error(`FAIL ${email}: ${e?.message ?? e}`);
  }
}

console.log(
  dryRun
    ? `\nDry run complete — ${people.length} would be sent. Check the parsed names above before --send.`
    : `\nDone. sent=${sent} skipped(already sent)=${skipped} failed=${failed}. Re-run with --send to retry failures.`,
);
