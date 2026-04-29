import { Resend } from "resend";
import type { ProgramConfig, TrackConfig } from "@/lib/programs/types";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_ADDRESS =
  process.env.RESEND_FROM_ADDRESS ?? "BCC Academy <noreply@bccacademy.io>";

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

  const hasTutor = program.tutorConfig?.enabled !== false;
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
              Welcome to ${program.name}
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
    subject: `Welcome to ${program.name}`,
    html,
  });

  if (error) {
    console.error("[email] welcome send failed:", error);
  }
}
