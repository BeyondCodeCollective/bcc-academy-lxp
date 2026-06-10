import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack(config) {
    // @zoom/meetingsdk's UMD bundle references these as optional peer deps that
    // aren't in the dependency tree. Stub them out so webpack doesn't error.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@zoom/download-manager": false,
      jszip: false,
    };
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
    ];
  },
  async headers() {
    const cspReport = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://*.supabase.co https://images.pexels.com https://img.evbuc.com https://*.google-analytics.com https://*.googletagmanager.com",
      "font-src 'self' https://fonts.gstatic.com",
      "media-src 'self' https://*.supabase.co https://images.pexels.com",
      "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
      "connect-src 'self' https://*.supabase.co https://*.resend.com https://va.vercel-scripts.com https://*.google-analytics.com https://o4506503091847168.ingest.us.sentry.io",
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
        value: "camera=(), microphone=(), geolocation=(), payment=()",
      },
      { key: "Content-Security-Policy-Report-Only", value: cspReport },
    ];
    return [{ source: "/(.*)", headers: baseHeaders }];
  },
};

export default nextConfig;
