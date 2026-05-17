import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    // Applied to every response. CSP is intentionally NOT enforced yet —
    // adding it requires sweeping every inline script / 3rd-party domain
    // (YouTube, Supabase Storage, Resend pixel, Vercel Analytics) into
    // the policy. Plan: ship Content-Security-Policy-Report-Only first,
    // watch the report endpoint for a week, then promote to enforcing CSP.
    const baseHeaders = [
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=()",
      },
    ];
    return [{ source: "/(.*)", headers: baseHeaders }];
  },
};

export default nextConfig;
