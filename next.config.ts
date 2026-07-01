import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack(config) {
    return config;
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "img.evbuc.com" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/dashboard/apply/:slug",
        destination: "/apply/:slug",
        permanent: true,
      },
      // Short shareable alias for the BGC Roblox landing page
      {
        source: "/bcc/roblox",
        destination: "/bcc/bgc-roblox",
        permanent: false,
      },
      // Landing pages moved from /camp/* to /bcc/* — keep old links alive.
      {
        source: "/camp/roblox",
        destination: "/bcc/bgc-roblox",
        permanent: false,
      },
      {
        source: "/camp/:slug",
        destination: "/bcc/:slug",
        permanent: false,
      },
      // Old feature HTML page → new help center
      {
        source: "/bcc-academy-features.html",
        destination: "/help",
        permanent: true,
      },
      {
        source: "/bcc-academy-features",
        destination: "/help",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      // Friendly URL for the BGC × BCC operating-system follow-along deck.
      { source: "/empower", destination: "/follow/empower-7ee93ad328.html" },
    ];
  },
  async headers() {
    const cspReport = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com https://www.googletagmanager.com https://www.eventbrite.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://*.supabase.co https://images.pexels.com https://img.evbuc.com https://*.eventbrite.com https://*.google-analytics.com https://*.googletagmanager.com",
      "font-src 'self' https://fonts.gstatic.com",
      "media-src 'self' https://*.supabase.co https://images.pexels.com https://videos.pexels.com",
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://zoom.us https://*.zoom.us https://www.eventbrite.com https://*.eventbrite.com",
      "connect-src 'self' https://*.supabase.co https://*.resend.com https://va.vercel-scripts.com https://*.google-analytics.com https://o4506503091847168.ingest.us.sentry.io https://*.zoom.us wss://*.zoom.us https://www.eventbrite.com https://*.eventbrite.com https://*.evbuc.com",
      "report-uri /api/csp-report",
    ].join("; ");

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
        value: "camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=()",
      },
      // Enforced (was Report-Only). The allowlist above was validated against
      // the report stream, so enforcing now blocks XSS exfiltration/resource
      // injection rather than only reporting it. Follow-up: drop 'unsafe-inline'
      // / 'unsafe-eval' from script-src by nonce-ing the GA + Zoom inline
      // scripts — that's the remaining gap for full script-injection defense.
      { key: "Content-Security-Policy", value: cspReport },
    ];
    return [
      { source: "/(.*)", headers: baseHeaders },
      // The Zoom embed page must be frameable by the app itself — the global
      // DENY would block the <iframe> before the SDK ever loads
      {
        source: "/api/zoom-frame",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
    ];
  },
};

export default nextConfig;
