"use client";

import { useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

/**
 * Landing hero video. Autoplays muted (browsers require it) with captions on;
 * the speaker button is the user gesture that unlocks audio. Unmuting restarts
 * from the top so the viewer hears the whole pitch, and hides captions since
 * the audio is now carrying the words. Muting brings captions back.
 */
export function HeroVideo({
  src,
  fit,
}: {
  src: string;
  fit: "contain" | "cover";
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [unmuted, setUnmuted] = useState(false);

  function toggle() {
    const v = ref.current;
    if (!v) return;
    if (unmuted) {
      v.muted = true;
      setUnmuted(false);
      if (v.textTracks[0]) v.textTracks[0].mode = "showing";
    } else {
      v.muted = false;
      v.currentTime = 0;
      void v.play();
      setUnmuted(true);
      if (v.textTracks[0]) v.textTracks[0].mode = "hidden";
    }
  }

  return (
    <>
      <video
        ref={ref}
        src={src}
        autoPlay
        muted
        loop
        playsInline
        crossOrigin="anonymous"
        className={`absolute inset-0 w-full h-full object-center ${
          fit === "contain" ? "object-contain" : "object-cover"
        }`}
      >
        {/* Sibling captions file; a missing track 404s silently. */}
        <track kind="captions" srcLang="en" label="English" default src={`${src}.vtt`} />
      </video>
      <button
        type="button"
        onClick={toggle}
        aria-label={unmuted ? "Mute video" : "Play video with sound"}
        className="absolute bottom-5 left-5 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-transform hover:scale-105 active:scale-95"
      >
        {unmuted ? <Volume2 size={19} /> : <VolumeX size={19} />}
      </button>
    </>
  );
}
