// Render branded email HTML to static files for the demo video (scenes 3 & 9).
// Mirrors the live templates in src/lib/email.ts (dark-header shell + CTA).
// Self-contained so it never collides with product code. Run:
//   node demo/generate-emails.mjs
import { writeFile, mkdir } from "node:fs/promises";

const shell = (brand, body) => `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f5f5f7;padding:40px 16px;">
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
  <div style="background:#1a1a1a;padding:28px 24px;text-align:center;">
    <p style="margin:0;font-size:24px;font-weight:700;letter-spacing:-0.02em;text-transform:uppercase;color:#ffffff;">${brand}</p>
  </div>
  <div style="padding:32px 24px;">${body}</div>
</div></body></html>`;

const cta = (label) => `<div style="text-align:center;margin:0 0 28px;">
  <a href="#" style="display:inline-block;padding:14px 36px;background:#1a1a1a;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.02em;">${label}</a></div>`;

const invite = shell("Black Girls Code", `
  <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a;">Welcome to Black Girls Code.</p>
  <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#555;">Your spot in the Roblox camp is ready. Click below to open your dashboard — no password needed.</p>
  ${cta("Get started →")}
  <p style="margin:0;font-size:12px;color:#999;line-height:1.5;">If you didn't expect this, you can ignore it. Questions? Email <a href="mailto:info@bccacademy.io" style="color:#1a1a1a;">info@bccacademy.io</a>.</p>`);

const signin = shell("Black Girls Code", `
  <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a;">You're almost in.</p>
  <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#555;">Click the button below to sign in and open your portal. This link expires in 24 hours.</p>
  ${cta("Open my portal →")}
  <p style="margin:0;font-size:12px;color:#999;line-height:1.5;">If you didn't request this, you can safely ignore this email.</p>`);

const notification = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f5f5f7;padding:40px 16px;">
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:28px 24px;box-shadow:0 1px 3px rgba(0,0,0,.08);font-size:15px;line-height:1.6;color:#1a1a1a;">
  <p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#999;">BCC Academy</p>
  <p style="margin:0 0 16px;font-weight:700;font-size:18px;">New &ldquo;Learn More&rdquo; sign-up</p>
  <p style="margin:0 0 4px;"><strong>Name:</strong> Jordan Bennett</p>
  <p style="margin:0 0 4px;"><strong>Email:</strong> jordan.bennett@example.com</p>
  <p style="margin:0 0 4px;"><strong>Source:</strong> homepage</p>
  <p style="margin:16px 0 0;font-size:12px;color:#999;">Saved to public_survey_responses (Catalyst). Reply to this email to reach them directly.</p>
</div></body></html>`;

await mkdir(new URL("./emails/", import.meta.url), { recursive: true });
const files = { "invite.html": invite, "signin.html": signin, "signup-notification.html": notification };
for (const [name, html] of Object.entries(files)) {
  await writeFile(new URL(`./emails/${name}`, import.meta.url), html);
  console.log("✓ demo/emails/" + name);
}
