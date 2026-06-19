"use client";

import { useEffect, useRef } from "react";
import { VIDEO_URLS } from "@/data/marketing/videos";

// Background hero video. Mobile browsers only autoplay when the element is
// muted + playsInline; React doesn't reliably emit the `muted` ATTRIBUTE in
// server HTML, so we also force `muted` and call play() via a ref on mount —
// the standard fix for "autoplays on desktop but not mobile". (iOS Low Power
// Mode can still block it; the dark fallback shows in that case.)
export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    const play = () => {
      v.play().catch(() => {});
    };
    play();
    v.addEventListener("canplay", play, { once: true });
    return () => v.removeEventListener("canplay", play);
  }, []);

  return (
    <video
      ref={ref}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
      className="absolute inset-0 h-full w-full object-cover"
    >
      <source src={VIDEO_URLS.hero} type="video/mp4" />
    </video>
  );
}
