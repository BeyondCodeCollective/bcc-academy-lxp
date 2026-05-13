import { NextResponse } from "next/server";
import { Resend } from "resend";
import { careers, type PersonalityKey } from "@/data/marketing/quiz";
import { careerPathways } from "@/data/marketing/careerPathways";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_ADDRESS =
  process.env.RESEND_FROM_ADDRESS ?? "BCC Academy <noreply@bccacademy.io>";

type Body = {
  email: string;
  personalityKey: PersonalityKey;
  ageGroup: "under18" | "18plus" | null;
};

const VALID_KEYS = new Set<PersonalityKey>([
  "fixer", "architect", "connector", "creator", "builder", "maker",
  "strategist", "guardian", "analyst", "healer", "educator", "advocate",
]);

export async function POST(request: Request) {
  if (!resend) {
    return NextResponse.json({ ok: false, reason: "email_disabled" });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (!VALID_KEYS.has(body.personalityKey)) {
    return NextResponse.json({ error: "Invalid personality" }, { status: 400 });
  }

  const career = careers[body.personalityKey];
  const pathway = careerPathways[career.pathway];
  const isYouth = body.ageGroup === "under18";

  const subject = `Your BCC Academy career path: ${career.name}`;
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:#000;padding:32px 24px;">
            <p style="margin:0 0 8px;font-size:11px;color:#E5F701;text-transform:uppercase;letter-spacing:2px;font-family:'SF Mono',Menlo,monospace;">[ Your Path ]</p>
            <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;line-height:1.1;">${career.name}</h1>
            <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.7);font-style:italic;">&ldquo;${career.tagline}&rdquo;</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px;">
            <div style="background:#1D59FF;color:#ffffff;padding:16px 18px;border-radius:8px;margin-bottom:20px;">
              <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;opacity:0.85;">Your Ideal Role</p>
              <p style="margin:4px 0 2px;font-size:18px;font-weight:700;">${career.role}</p>
              <p style="margin:0;font-size:14px;opacity:0.9;">$${career.salary.mid.toLocaleString()}/year average</p>
            </div>

            <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#999;">[ Training Pathway ]</p>
            <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:${pathway.accent};">${pathway.shortName}</p>
            <p style="margin:0 0 20px;font-size:14px;color:#444;line-height:1.5;">${pathway.description}</p>

            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
              <tr>
                <td style="background:#000;border-radius:8px;text-align:center;">
                  <a href="https://bccacademy.io/quiz" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:#E5F701;text-decoration:none;text-transform:uppercase;letter-spacing:1px;">
                    View Your Full Results &rarr;
                  </a>
                </td>
              </tr>
            </table>

            ${isYouth ? `<p style="margin:20px 0 0;font-size:13px;color:#666;line-height:1.5;text-align:center;">Share this with a parent or guardian — they'll have everything they need to help you get started.</p>` : ""}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px 24px;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:11px;color:#999;text-align:center;">
              Beyond Code Collective · BCC Academy
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
    to: email,
    subject,
    html,
  });

  if (error) {
    console.error("[quiz/results] send failed:", error);
    return NextResponse.json({ ok: false, reason: "send_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
