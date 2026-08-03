import { Resend } from "resend";
import type { ProgramConfig, TrackConfig } from "@/lib/programs/types";
import { isTutorAvailable } from "@/lib/programs";
import { buildGoogleCalendarUrl } from "@/lib/gcal";
import { subscribeToNewsletter } from "@/lib/mailchimp";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_ADDRESS =
  process.env.RESEND_FROM_ADDRESS ?? "BCC Academy <noreply@mail.bccacademy.io>";

export async function sendSignInEmail({
  to,
  magicLink,
  programName,
}: {
  to: string;
  magicLink: string;
  programName: string;
}): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping sign-in email");
    return;
  }
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Your ${programName} sign-in link`,
    html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
  <div style="background:#1a1a1a;padding:28px 24px;text-align:center;">
    <p style="margin:0;font-size:24px;font-weight:700;letter-spacing:-0.02em;text-transform:uppercase;color:#ffffff;">${programName}</p>
  </div>
  <div style="padding:32px 24px;">
    <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a;">You're almost in.</p>
    <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#555;">Click the button below to sign in and open your portal. This link expires in 24 hours.</p>
    <div style="text-align:center;margin:0 0 28px;">
      <a href="${magicLink}" style="display:inline-block;padding:14px 36px;background:#1a1a1a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.02em;">Open my portal →</a>
    </div>
    <p style="margin:0;font-size:12px;color:#999;line-height:1.5;">If you didn't request this, you can safely ignore this email. Questions? Reply here or email <a href="mailto:info@bccacademy.io" style="color:#1a1a1a;">info@bccacademy.io</a>.</p>
  </div>
</div>`,
  });
  if (error) {
    console.error("[email] sendSignInEmail failed:", JSON.stringify(error));
    throw new Error("Failed to send sign-in email");
  }
}

/** Cohort invite — one-click link to /invite/<token> that signs the student
 *  in on click (no expiry). Sent in bulk by the super-admin invite tool. */
type InviteEmailContent = { subject: string; text: string; html: string };

/** Shared dark-header shell. The header shows the program/org brand (white-
 *  label — BCC Academy is the infrastructure, not the brand on student email). */
function inviteShell(brand: string, bodyHtml: string): string {
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
  <div style="background:#1a1a1a;padding:28px 24px;text-align:center;">
    <p style="margin:0;font-size:24px;font-weight:700;letter-spacing:-0.02em;text-transform:uppercase;color:#ffffff;">${brand}</p>
  </div>
  <div style="padding:32px 24px;">
${bodyHtml}
  </div>
</div>`;
}

function ctaButton(inviteLink: string, label: string): string {
  return `<div style="text-align:center;margin:0 0 28px;">
      <a href="${inviteLink}" style="display:inline-block;padding:14px 36px;background:#1a1a1a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.02em;">${label}</a>
    </div>`;
}

/** Upskill Bahamas summer-2026 campaign copy (provided by the team). The
 *  generic per-person one-click link is injected as the CTA. */
function forteSummerInvite(programName: string, inviteLink: string): InviteEmailContent {
  return {
    subject: "UpSkill Bahamas: Foundations of AI & Digital Skills Summer Programming",
    text: `Hello!

ICYMI — here's a note to make sure you have all the details on an update to your Upskill Bahamas Foundations of AI & Digital Skills program!

Here's the update:
Your course content has a new home! We've moved everything into one learning portal, and brought all your existing course content with it, plus new summer sessions we're releasing just in time for the season.

Everything is:
• Self-paced
• Completely free
• Built to meet you where you are

Access your new portal here (one click, no password needed):
${inviteLink}

If you have any trouble logging in or finding your courses, please email info@bccacademy.io and we'll help you out.

We're excited for you to keep building real AI and digital skills this summer!

Best,
The Beyond Code Team`,
    html: inviteShell(programName, `    <p style="margin:0 0 16px;font-size:16px;color:#1a1a1a;">Hello!</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#555;">ICYMI — here's a note to make sure you have all the details on an update to your <strong>Upskill Bahamas Foundations of AI &amp; Digital Skills</strong> program!</p>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#555;"><strong>Here's the update:</strong></p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#555;">Your course content has a new home! We've moved everything into one learning portal, and brought all your existing course content with it, plus new summer sessions we're releasing just in time for the season.</p>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#555;">Everything is:</p>
    <ul style="margin:0 0 24px;padding-left:20px;font-size:15px;line-height:1.7;color:#555;">
      <li>Self-paced</li>
      <li>Completely free</li>
      <li>Built to meet you where you are</li>
    </ul>
    ${ctaButton(inviteLink, "Access your portal →")}
    <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#777;">If you have any trouble logging in or finding your courses, please email <a href="mailto:info@bccacademy.io" style="color:#1a1a1a;">info@bccacademy.io</a> and we'll help you out.</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#555;">We're excited for you to keep building real AI and digital skills this summer!</p>
    <p style="margin:0;font-size:15px;line-height:1.6;color:#555;">Best,<br/>The Beyond Code Team</p>`),
  };
}

/** Default invite copy for any program without a campaign-specific template. */
function genericInvite(programName: string, inviteLink: string): InviteEmailContent {
  return {
    subject: `You're invited to ${programName}`,
    text: `Welcome to ${programName}.

Your spot is ready. Open your dashboard — no password needed:

${inviteLink}

If you didn't expect this, you can ignore it. Questions? Email info@bccacademy.io.`,
    html: inviteShell(programName, `    <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a;">Welcome to ${programName}.</p>
    <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#555;">Your spot is ready. Click the button below to open your dashboard — no password needed.</p>
    ${ctaButton(inviteLink, "Get started →")}
    <p style="margin:0;font-size:12px;color:#999;line-height:1.5;">If you didn't expect this, you can ignore it. Questions? Reply here or email <a href="mailto:info@bccacademy.io" style="color:#1a1a1a;">info@bccacademy.io</a>.</p>`),
  };
}

export async function sendInviteEmail({
  to,
  inviteLink,
  programName,
  programSlug,
}: {
  to: string;
  inviteLink: string;
  programName: string;
  /** Selects campaign-specific copy. Forte = Upskill Bahamas summer template;
   *  anything else falls back to the generic invite. */
  programSlug?: string;
}): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping invite email");
    throw new Error("Email is not configured (RESEND_API_KEY missing)");
  }
  const content =
    programSlug === "forte"
      ? forteSummerInvite(programName, inviteLink)
      : genericInvite(programName, inviteLink);

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
  if (error) {
    console.error("[email] sendInviteEmail failed:", JSON.stringify(error));
    throw new Error("Failed to send invite email");
  }
}

/**
 * Certificate email — sent when an admin issues a certificate of completion.
 * Carries the PUBLIC certificate link (/certificate/<id>, no login) so the
 * family can view, print, and share it. Program-branded like every other
 * student email (white-label: the org is the brand, not BCC Academy).
 */
export async function sendCertificateEmail({
  to,
  firstName,
  programName,
  courseName,
  certificateUrl,
}: {
  to: string;
  firstName: string;
  programName: string;
  courseName: string;
  certificateUrl: string;
}): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping certificate email");
    throw new Error("Email is not configured (RESEND_API_KEY missing)");
  }
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const name = firstName.trim();
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `🎉 Certificate of Completion — ${courseName}`,
    text: `Congratulations${name ? `, ${name}` : ""}!

You completed ${courseName} — and your official certificate is ready.

View, print, or share it here (no login needed):
${certificateUrl}

This link is permanent, so it can go on a resume or LinkedIn profile — anyone who clicks it sees the verified certificate.

We're proud of you!
${programName}`,
    html: inviteShell(
      programName,
      `    <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#16a34a;">🎉 Certificate earned</p>
    <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a;">Congratulations${name ? `, ${esc(name)}` : ""}!</p>
    <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#555;">You completed <strong>${esc(courseName)}</strong> — and your official certificate is ready. View it, print it, or share it with the button below. No login needed.</p>
    ${ctaButton(certificateUrl, "View my certificate →")}
    <p style="margin:0;font-size:12px;color:#999;line-height:1.5;">This link is permanent — it can go on a resume or LinkedIn profile, and anyone who clicks it sees the verified certificate. Questions? Reply here or email <a href="mailto:info@bccacademy.io" style="color:#1a1a1a;">info@bccacademy.io</a>.</p>`,
    ),
  });
  if (error) {
    console.error("[email] sendCertificateEmail failed:", JSON.stringify(error));
    throw new Error("Failed to send certificate email");
  }
}

/** Human-readable "when" for an event, in its own timezone with a tz label
 *  (e.g. "Thursday, July 9 · 2:00 PM EDT"). Falls back to UTC if no tz. */
function formatEventWhen(startUtc: string | null, timezone: string | null): string | null {
  if (!startUtc) return null;
  try {
    const d = new Date(startUtc);
    const date = d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: timezone ?? "UTC",
    });
    const time = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
      timeZone: timezone ?? "UTC",
    });
    return `${date} · ${time}`;
  } catch {
    return null;
  }
}

/** Google Calendar + downloadable .ics links for the registration emails. */
function eventCalendarLinks(opts: {
  origin: string;
  title: string;
  startUtc: string | null;
  endUtc: string | null;
  details: string;
  /** The event's "where" — the portal/invite link, so the calendar entry
   *  always carries the way back in. */
  location?: string;
}): { google: string; ics: string } | null {
  if (!opts.startUtc) return null;
  // Default to a 1-hour block when Eventbrite gives no end time.
  const endUtc =
    opts.endUtc ?? new Date(Date.parse(opts.startUtc) + 3_600_000).toISOString();
  const google = buildGoogleCalendarUrl({
    title: opts.title,
    date: opts.startUtc.slice(0, 10),
    startUtc: opts.startUtc,
    endUtc,
    details: opts.details,
    ...(opts.location ? { location: opts.location } : {}),
  });
  const ics =
    `${opts.origin}/api/calendar/event?` +
    new URLSearchParams({
      title: opts.title,
      start: opts.startUtc,
      end: endUtc,
      details: opts.details,
      ...(opts.location ? { location: opts.location } : {}),
    }).toString();
  return { google, ics };
}

/**
 * Registration confirmation — sent the moment someone registers for an event via
 * the embedded Eventbrite checkout. Carries the DURABLE one-click portal link
 * (/invite/<token>, no expiry — their permanent door back in) plus Add-to-iCal
 * and Add-to-Google-Calendar links. The portal lands them on the holding page;
 * the curriculum stays locked until the start date.
 */
export async function sendEventConfirmationEmail({
  to,
  firstName,
  programName,
  eventName,
  eventStartUtc,
  eventEndUtc,
  eventTimezone,
  inviteLink,
  origin,
}: {
  to: string;
  firstName: string;
  programName: string;
  eventName: string;
  eventStartUtc: string | null;
  eventEndUtc: string | null;
  /** Local wall-clock start; accepted for parity with the resolver but display
   *  is derived from eventStartUtc + eventTimezone (correct in any locale). */
  eventStartLocal?: string | null;
  eventTimezone: string | null;
  inviteLink: string;
  origin: string;
}): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping event confirmation email");
    return;
  }
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const when = formatEventWhen(eventStartUtc, eventTimezone);
  const cal = eventCalendarLinks({
    origin,
    title: eventName,
    startUtc: eventStartUtc,
    endUtc: eventEndUtc,
    details: `Your spot for ${eventName}. Enter the portal: ${inviteLink}`,
    location: inviteLink,
  });

  const calRow = cal
    ? `<p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#999;">Add to your calendar</p>
    <div style="margin:0 0 28px;">
      <a href="${cal.google}" style="display:inline-block;margin:0 8px 8px 0;padding:9px 16px;border:1px solid #e0e0e0;border-radius:8px;color:#1a1a1a;text-decoration:none;font-weight:600;font-size:13px;">Google Calendar</a>
      <a href="${cal.ics}" style="display:inline-block;margin:0 8px 8px 0;padding:9px 16px;border:1px solid #e0e0e0;border-radius:8px;color:#1a1a1a;text-decoration:none;font-weight:600;font-size:13px;">Apple / iCal</a>
    </div>`
    : "";

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `You're registered — ${eventName}`,
    text: `You're registered for ${eventName}.${when ? `\n\nWhen: ${when}` : ""}

Your portal is ready. Open it any time with this link (no password needed):
${inviteLink}

You'll see a countdown to kickoff — come back here when we start.${cal ? `\n\nAdd to Google Calendar: ${cal.google}\nAdd to Apple/iCal: ${cal.ics}` : ""}

Questions? Reply to this email or contact info@bccacademy.io.`,
    html: inviteShell(
      programName,
      `    <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#16a34a;">✓ You're registered</p>
    <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#1a1a1a;">${esc(eventName)}</p>
    ${when ? `<p style="margin:0 0 20px;font-size:14px;color:#666;">${esc(when)}</p>` : ""}
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#444;">Hey${firstName ? ` ${esc(firstName)}` : ""}, your spot is saved and your portal is ready. Head in below — you'll see a countdown to kickoff. This link is your permanent door back in, so keep this email.</p>
    ${ctaButton(inviteLink, "Enter your portal →")}
    ${calRow}
    <p style="margin:0;font-size:12px;color:#999;line-height:1.5;">Questions? Reply here or email <a href="mailto:info@bccacademy.io" style="color:#1a1a1a;">info@bccacademy.io</a>.</p>`,
    ),
  });
  if (error) {
    console.error("[email] sendEventConfirmationEmail failed:", JSON.stringify(error));
    throw new Error("Failed to send event confirmation email");
  }
}

/** Confirmation email for the public-survey withdrawal flow.
 *  The action that triggers this always returns success regardless of
 *  whether the address has any data on file, so this email also doubles
 *  as the only enumeration signal — keep the wording neutral. */
export async function sendWithdrawConfirmEmail(params: {
  to: string;
  confirmUrl: string;
}): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping withdraw confirmation email");
    return;
  }
  const { to, confirmUrl } = params;
  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Confirm survey response deletion",
    html: `
      <div style="font-family:-apple-system,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
        <p style="font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#1D59FF;margin:0 0 12px">Beyond Code Collective</p>
        <h1 style="font-size:22px;font-weight:700;margin:0 0 12px">Confirm deletion</h1>
        <p style="font-size:14px;line-height:1.55;color:#374151;margin:0 0 16px">
          Someone requested to remove every public survey response tied to this email
          address. If that was you, click the button below within the next hour to
          complete the deletion. Otherwise, ignore this email — nothing will change.
        </p>
        <p style="margin:24px 0">
          <a href="${confirmUrl}" style="display:inline-block;padding:12px 20px;background:#1a1a1a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">Delete my responses</a>
        </p>
        <p style="font-size:12px;color:#6b7280;margin:24px 0 0">
          This link expires in 1 hour. Need help? Reply to
          <a href="mailto:privacy@bccacademy.io" style="color:#1a1a1a">privacy@bccacademy.io</a>.
        </p>
      </div>
    `,
  });
}

type WelcomeEmailParams = {
  to: string;
  firstName: string;
  program: ProgramConfig;
  enrolledTracks: TrackConfig[];
  /** Durable one-click sign-in link (e.g. /invite/<token>). */
  signInUrl: string;
};

export async function sendWelcomeEmail({
  to,
  firstName,
  program,
  enrolledTracks,
  signInUrl,
}: WelcomeEmailParams): Promise<void> {
  // Backfill the newsletter subscriber's name now that onboarding has captured
  // it (signup subscribed them with a blank name). Idempotent + program-gated.
  // Awaited: this helper already runs post-response (inside after()); a
  // `void` here was dropped with the lambda the same way as attendance was.
  await subscribeToNewsletter({ email: to, firstName, programSlug: program.slug });

  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping welcome email");
    return;
  }

  const trackListHtml = enrolledTracks
    .map(
      (t) =>
        `<tr>
          <td style="padding:8px 12px;font-size:14px;color:#1a1a1a;border-bottom:1px solid #f0f0f0;">
            <strong>${t.name}</strong><br/>
            <span style="color:#666;font-size:13px;">
              ${t.type === "single-event" ? `Single event · ${t.sessionTimes[0] ?? ""}` : `${t.totalWeeks} weeks · ${t.sessionTimes.join(" & ")}`}
              · with ${t.instructor}
            </span>
          </td>
        </tr>`
    )
    .join("");

  const hasTutor = isTutorAvailable(program);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#1a1a1a;padding:32px 24px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em;text-transform:uppercase;color:#ffffff;">${program.name}</p>
            <p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,0.7);">
              ${program.tagline}
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 24px;">
            <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;line-height:1.5;">
              Hey${firstName ? ` ${firstName}` : ""},
            </p>
            <p style="margin:0 0 20px;font-size:15px;color:#1a1a1a;line-height:1.5;">
              You're all set. Here's what you're signed up for:
            </p>

            ${
              enrolledTracks.length > 0
                ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border-radius:10px;margin-bottom:20px;overflow:hidden;">
                    ${trackListHtml}
                  </table>`
                : ""
            }

            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
              <tr>
                <td style="background:#1a1a1a;border-radius:10px;text-align:center;">
                  <a href="${signInUrl}" style="display:inline-block;padding:12px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                    Go to Your Portal
                  </a>
                </td>
              </tr>
            </table>

            ${
              hasTutor
                ? `<p style="margin:0 0 16px;font-size:14px;color:#666;line-height:1.5;">
                    <strong>AI Tutor:</strong> You have a built-in AI study buddy available 24/7. Find it in your dashboard — it knows your curriculum and can help you work through concepts.
                  </p>`
                : ""
            }

            <p style="margin:0;font-size:14px;color:#666;line-height:1.5;">
              If you have questions, reach out to your instructor or reply to this email.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 24px 24px;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:12px;color:#999;text-align:center;">
              ${program.organization} · ${program.name}
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Welcome to ${program.name}`,
    text: `Welcome to ${program.name}${firstName ? `, ${firstName}` : ""}!

You're enrolled in:
${enrolledTracks.map((t) => `- ${t.name}`).join("\n")}

Open your dashboard — no password needed:

${signInUrl}

Questions? Reply to this email.`,
    html,
  });

  if (error) {
    console.error("[email] welcome send failed:", error);
  }
}

/** Notification email — a new announcement was posted to a track the student
 *  is enrolled in. Gated upstream by notification_preferences.announcements. */
export async function sendAnnouncementEmail({
  to,
  programName,
  trackName,
  message,
  portalUrl,
}: {
  to: string;
  programName: string;
  trackName: string;
  message: string;
  portalUrl: string;
}): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping announcement email");
    return;
  }
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `New announcement · ${trackName}`,
    text: `New announcement in ${trackName}:\n\n${message}\n\nOpen your portal: ${portalUrl}`,
    html: inviteShell(
      programName,
      `    <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#999;">${esc(trackName)}</p>
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#1a1a1a;">New announcement</p>
    <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#444;white-space:pre-line;">${esc(message)}</p>
    ${ctaButton(portalUrl, "Open my portal →")}
    <p style="margin:0;font-size:12px;color:#999;line-height:1.5;">You're getting this because announcements are on in your notification settings. Turn them off any time in your portal under Settings.</p>`,
    ),
  });
  if (error) {
    console.error("[email] sendAnnouncementEmail failed:", JSON.stringify(error));
    throw new Error("Failed to send announcement email");
  }
}

/** Notification email — an instructor left feedback on the student's work.
 *  Gated upstream by notification_preferences.feedback. */
export async function sendFeedbackEmail({
  to,
  programName,
  trackName,
  weekNumber,
  portalUrl,
}: {
  to: string;
  programName: string;
  trackName: string;
  weekNumber: number;
  portalUrl: string;
}): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping feedback email");
    return;
  }
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Your instructor left feedback · ${trackName} · Week ${weekNumber}`,
    text: `Your instructor left feedback on your Week ${weekNumber} work in ${trackName}.\n\nRead it in your portal: ${portalUrl}`,
    html: inviteShell(
      programName,
      `    <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#999;">${esc(trackName)} · Week ${weekNumber}</p>
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#1a1a1a;">You've got new feedback</p>
    <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#444;">Your instructor reviewed your work and left a note. Open your portal to read it.</p>
    ${ctaButton(portalUrl, "Read feedback →")}
    <p style="margin:0;font-size:12px;color:#999;line-height:1.5;">You're getting this because feedback alerts are on in your notification settings. Turn them off any time in your portal under Settings.</p>`,
    ),
  });
  if (error) {
    console.error("[email] sendFeedbackEmail failed:", JSON.stringify(error));
    throw new Error("Failed to send feedback email");
  }
}

/**
 * "We got your application" receipt for a public application form. Applicants
 * previously got only an on-screen confirmation — nothing in their inbox, so no
 * paper trail, no way to spot a typo'd address, and nothing to reply to.
 *
 * Deliberately makes no promise beyond "we'll be in touch by email": decisions
 * and timelines are the team's to communicate, not this receipt's.
 *
 * Never throws. The application is already saved by the time this runs, and a
 * mail failure must never surface as a failed submission.
 */
export async function sendApplicationConfirmationEmail({
  to,
  firstName,
  programName,
  applicationName,
}: {
  to: string;
  firstName?: string;
  /** Brand shown in the header bar, e.g. "Catalyst". */
  programName: string;
  /** What they applied to, e.g. "Home for the Summer". */
  applicationName: string;
}): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping application confirmation");
    return;
  }
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const hello = firstName ? ` ${esc(firstName)}` : "";

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      replyTo: "info@bccacademy.io",
      subject: `We received your ${applicationName} application`,
      text: `Thanks for applying to ${applicationName}.

We've received your application and our team is reviewing it. We'll get back to you at this email address soon with next steps.

Nothing to do for now — just keep an eye on your inbox.

Questions? Reply to this email or contact info@bccacademy.io.`,
      html: inviteShell(
        programName,
        `    <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#16a34a;">✓ Application received</p>
    <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:#1a1a1a;">${esc(applicationName)}</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#444;">Thanks for applying${hello}. We've got your application and our team is reviewing it. We'll get back to you at this email address soon with next steps.</p>
    <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#444;">Nothing to do for now — just keep an eye on your inbox.</p>
    <p style="margin:0;font-size:12px;color:#999;line-height:1.5;">Questions? Reply here or email <a href="mailto:info@bccacademy.io" style="color:#1a1a1a;">info@bccacademy.io</a>.</p>`,
      ),
    });
    if (error) {
      console.error("[email] sendApplicationConfirmationEmail failed:", JSON.stringify(error));
    }
  } catch (err) {
    console.error("[email] sendApplicationConfirmationEmail threw:", err);
  }
}

/**
 * Internal heads-up when someone fills the homepage "Learn More" form. Goes to
 * SIGNUP_NOTIFY_EMAIL (default info@bccacademy.io); reply-to is the signup's own
 * address so the team can respond directly. Self-contained try/catch — a failed
 * notification must never break the visitor's signup.
 */
export async function sendSignupNotification(input: {
  name: string;
  email: string;
  programName: string;
  source?: string;
}): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping signup notification");
    return;
  }
  const to = process.env.SIGNUP_NOTIFY_EMAIL ?? "info@bccacademy.io";
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      replyTo: input.email,
      subject: `New ${input.programName} sign-up: ${input.name || input.email}`,
      html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;">
  <p style="margin:0 0 12px;font-weight:700;">New &ldquo;Learn More&rdquo; sign-up</p>
  <p style="margin:0 0 4px;"><strong>Name:</strong> ${esc(input.name) || "—"}</p>
  <p style="margin:0 0 4px;"><strong>Email:</strong> ${esc(input.email)}</p>
  <p style="margin:0 0 4px;"><strong>Source:</strong> ${esc(input.source ?? "homepage")}</p>
  <p style="margin:12px 0 0;font-size:12px;color:#999;">Saved to public_survey_responses (${esc(input.programName)}). Reply to this email to reach them directly.</p>
</div>`,
    });
  } catch (e) {
    console.error(
      "[email] sendSignupNotification failed:",
      e instanceof Error ? e.message : String(e),
    );
  }
}

/**
 * Internal heads-up when someone submits a public application. Without it the
 * only way to know an application arrived is to open admin → Insights, so a
 * promo push looks identical to a dead one until someone remembers to check.
 *
 * Goes to APPLICATION_NOTIFY_EMAIL (default jihan.johnston@wearebcc.org) with
 * reply-to set to the applicant, so a reply reaches them directly. Carries only
 * the fields needed to triage — the full application lives in the portal.
 * Self-contained try/catch: a failed notification must never affect the
 * applicant's submission.
 */
export async function sendApplicationNotification(input: {
  name: string;
  email: string;
  /** What they applied to, e.g. "Home for the Summer". */
  applicationName: string;
  /** Short triage lines, e.g. { University: "Mercer", "Available for all sessions": "Yes" }. */
  details?: Record<string, string | undefined>;
}): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping application notification");
    return;
  }
  const to = process.env.APPLICATION_NOTIFY_EMAIL ?? "jihan.johnston@wearebcc.org";
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const rows = Object.entries(input.details ?? {})
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `  <p style="margin:0 0 4px;"><strong>${esc(k)}:</strong> ${esc(String(v))}</p>`,
    )
    .join("\n");

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      replyTo: input.email,
      subject: `New ${input.applicationName} application: ${input.name || input.email}`,
      html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;">
  <p style="margin:0 0 12px;font-weight:700;">New ${esc(input.applicationName)} application</p>
  <p style="margin:0 0 4px;"><strong>Name:</strong> ${esc(input.name) || "—"}</p>
  <p style="margin:0 0 4px;"><strong>Email:</strong> ${esc(input.email)}</p>
${rows}
  <p style="margin:12px 0 0;font-size:12px;color:#999;">Full application: bccacademy.io/dashboard/admin?tab=insights → ${esc(input.applicationName)}. Reply to this email to reach the applicant directly.</p>
</div>`,
    });
  } catch (e) {
    console.error(
      "[email] sendApplicationNotification failed:",
      e instanceof Error ? e.message : String(e),
    );
  }
}

/**
 * Internal heads-up when a staff-domain email signs in for the first time and
 * gets an auto-created account. Staff auto-creation is a feature (Lunch &
 * Learn access), but it's also how instructor accounts silently duplicate when
 * someone's real account lives under a personal email (Kobie, 2026-07-14).
 * This makes the event loud so a mix-up is caught the same day. Goes to
 * SIGNUP_NOTIFY_EMAIL; self-contained try/catch like sendSignupNotification.
 */
export async function sendStaffAccountNotification(input: {
  email: string;
}): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping staff account notification");
    return;
  }
  const to = process.env.SIGNUP_NOTIFY_EMAIL ?? "info@bccacademy.io";
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      replyTo: input.email,
      subject: `New staff account auto-created: ${input.email}`,
      html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;">
  <p style="margin:0 0 12px;font-weight:700;">A staff email just signed in with no existing account</p>
  <p style="margin:0 0 4px;"><strong>Email:</strong> ${esc(input.email)}</p>
  <p style="margin:0 0 12px;">A new student-role account was created automatically (staff Lunch &amp; Learn access). If this person already has an account under another email — for example an instructor set up on a personal address — merge or fix it in People before it causes confusion.</p>
  <p style="margin:12px 0 0;font-size:12px;color:#999;">They were shown the staff-welcome screen explaining this is a fresh account.</p>
</div>`,
    });
  } catch (e) {
    console.error(
      "[email] sendStaffAccountNotification failed:",
      e instanceof Error ? e.message : String(e),
    );
  }
}
