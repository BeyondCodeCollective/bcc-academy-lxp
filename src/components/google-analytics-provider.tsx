"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const GA_IDS: Record<string, string> = {
  atg: "G-KJF6CKFSTP",
};

const PROGRAM_SLUG_COOKIE = "program-slug";

export function GoogleAnalyticsProvider() {
  const [gaId, setGaId] = useState<string | null>(null);

  useEffect(() => {
    const match = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${PROGRAM_SLUG_COOKIE}=([^;]+)`),
    );
    const slug = match ? match[1] : null;
    if (slug && GA_IDS[slug]) {
      setGaId(GA_IDS[slug]);
    }
  }, []);

  if (!gaId) return null;

  const dataLayerName = "dataLayer";

  return (
    <>
      <Script
        id="_next-ga-init"
        dangerouslySetInnerHTML={{
          __html: `window['${dataLayerName}'] = window['${dataLayerName}'] || [];function gtag(){window['${dataLayerName}'].push(arguments);}gtag('js', new Date());gtag('config', '${gaId}');`,
        }}
      />
      <Script
        id="_next-ga"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
    </>
  );
}
