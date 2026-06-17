import { Resend } from "resend";
import type { ProgramConfig, TrackConfig } from "@/lib/programs/types";
import { isTutorAvailable } from "@/lib/programs";

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
    <p style="margin:0;font-size:24px;font-weight:700;letter-spacing:-0.02em;text-transform:uppercase;color:#ffffff;">BCC <span style="color:#E5F701;">[</span>Academy<span style="color:#E5F701;">]</span></p>
  </div>
  <div style="padding:32px 24px;">
    <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a;">You're almost in.</p>
    <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#555;">Click the button below to confirm your email and access your dashboard. This link expires in 24 hours.</p>
    <div style="text-align:center;margin:0 0 28px;">
      <a href="${magicLink}" style="display:inline-block;padding:14px 36px;background:#1a1a1a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.02em;">Confirm my account →</a>
    </div>
    <p style="margin:0;font-size:12px;color:#999;line-height:1.5;">If you didn't request this, you can safely ignore this email. Questions? Reply here or email <a href="mailto:fonz.morris@wearebgc.org" style="color:#1a1a1a;">fonz.morris@wearebgc.org</a>.</p>
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

/** Shared dark-header shell so every invite variant looks on-brand. */
function inviteShell(bodyHtml: string): string {
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
  <div style="background:#1a1a1a;padding:28px 24px;text-align:center;">
    <p style="margin:0;font-size:24px;font-weight:700;letter-spacing:-0.02em;text-transform:uppercase;color:#ffffff;">BCC <span style="color:#E5F701;">[</span>Academy<span style="color:#E5F701;">]</span></p>
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
function forteSummerInvite(inviteLink: string): InviteEmailContent {
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
    html: inviteShell(`    <p style="margin:0 0 16px;font-size:16px;color:#1a1a1a;">Hello!</p>
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
    html: inviteShell(`    <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a;">Welcome to ${programName}.</p>
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
      ? forteSummerInvite(inviteLink)
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
            <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em;text-transform:uppercase;color:#ffffff;">BCC <span style="color:#E5F701;">[</span>Academy<span style="color:#E5F701;">]</span></p>
            <p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,0.7);">
              ${program.tagline}
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 24px;">
            <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;line-height:1.5;">
              Hey ${firstName},
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
    text: `Welcome to ${program.name}, ${firstName}!

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
