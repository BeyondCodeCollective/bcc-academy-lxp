"use client";

import Script from "next/script";

const GA_ID = "G-KJF6CKFSTP";

export function GoogleAnalyticsProvider() {
  const dataLayerName = "dataLayer";

  return (
    <>
      <Script
        id="_next-ga-init"
        dangerouslySetInnerHTML={{
          __html: `window['${dataLayerName}'] = window['${dataLayerName}'] || [];function gtag(){window['${dataLayerName}'].push(arguments);}gtag('js', new Date());gtag('config', '${GA_ID}');`,
        }}
      />
      <Script
        id="_next-ga"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      />
    </>
  );
}
