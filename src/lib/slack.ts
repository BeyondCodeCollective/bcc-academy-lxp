// Slack DMs from the platform. Needs a Slack app bot token (SLACK_BOT_TOKEN)
// with the users:read.email and chat:write scopes. Without it every send is a
// no-op, so email stays the guaranteed channel.

const SLACK_API = "https://slack.com/api";

export function isSlackConfigured(): boolean {
  return !!process.env.SLACK_BOT_TOKEN;
}

async function slackCall(method: string, init: { query?: Record<string, string>; body?: unknown }) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return null;
  const url = new URL(`${SLACK_API}/${method}`);
  for (const [k, v] of Object.entries(init.query ?? {})) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method: init.body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json; charset=utf-8" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  return (await res.json()) as { ok: boolean; error?: string; user?: { id: string } };
}

/**
 * DM the Slack user with this email. Returns false (and logs why) when Slack
 * isn't configured, the email has no Slack account, or the send fails.
 */
export async function sendSlackDmByEmail(email: string, text: string): Promise<boolean> {
  if (!isSlackConfigured()) return false;
  try {
    const lookup = await slackCall("users.lookupByEmail", { query: { email } });
    if (!lookup?.ok || !lookup.user) {
      console.warn(`[slack] no Slack user for ${email}: ${lookup?.error ?? "unknown"}`);
      return false;
    }
    const sent = await slackCall("chat.postMessage", { body: { channel: lookup.user.id, text } });
    if (!sent?.ok) {
      console.error(`[slack] DM to ${email} failed: ${sent?.error ?? "unknown"}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[slack] DM failed:", e);
    return false;
  }
}
