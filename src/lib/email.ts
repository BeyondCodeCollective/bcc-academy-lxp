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
    <p style="margin:0;font-size:12px;color:#999;line-height:1.5;">If you didn't request this, you can safely ignore this email. Questions? Reply here or email <a href="mailto:hello@wearebgc.org" style="color:#1a1a1a;">hello@wearebgc.org</a>.</p>
  </div>
</div>`,
  });
  if (error) {
    console.error("[email] sendSignInEmail failed:", JSON.stringify(error));
    throw new Error("Failed to send sign-in email");
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
        <p style="font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#E54D2E;margin:0 0 12px">Beyond Code Collective</p>
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
};

export async function sendWelcomeEmail({
  to,
  firstName,
  program,
  enrolledTracks,
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
  const dashboardUrl = `https://${program.domain}/dashboard`;

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
          <td style="background:${program.colors.primary};padding:32px 24px;text-align:center;">
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">
              Welcome to BCC Academy
            </h1>
            <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">
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
                <td style="background:${program.colors.primary};border-radius:10px;text-align:center;">
                  <a href="${dashboardUrl}" style="display:inline-block;padding:12px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                    Go to Your Dashboard
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
    subject: `Welcome to BCC Academy`,
    html,
  });

  if (error) {
    console.error("[email] welcome send failed:", error);
  }
}
