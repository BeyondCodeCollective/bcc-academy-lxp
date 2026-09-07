/**
 * Centralized video URLs for BCC Academy.
 * Replace placeholder Pexels URLs with actual BCC footage as it becomes available.
 */

export const VIDEO_URLS = {
  /** Hero background — diverse people, tech, community feel */
  hero: "https://videos.pexels.com/video-files/8198511/8198511-hd_1920_1080_25fps.mp4",

  /** Human in the Loop — mentorship, one-on-one, guiding */
  humanInTheLoop: {
    principle01: "https://videos.pexels.com/video-files/6893988/6893988-hd_1920_1080_30fps.mp4",
    principle02: "https://videos.pexels.com/video-files/5198148/5198148-hd_1920_1080_30fps.mp4",
    principle03: "https://videos.pexels.com/video-files/8348784/8348784-hd_1920_1080_25fps.mp4",
  },

  /** Proof section — cobalt block background, community energy */
  proof: "https://videos.pexels.com/video-files/3255275/3255275-uhd_2560_1440_25fps.mp4",

  /** Final CTA — inspirational, aspirational, wide shots */
  finalCTA: "https://videos.pexels.com/video-files/5378758/5378758-uhd_2560_1440_30fps.mp4",

  /** Pathways — one per pathway for desktop carousel backgrounds */
  pathways: {
    explorers: "https://videos.pexels.com/video-files/8348784/8348784-hd_1920_1080_25fps.mp4",
    builders: "https://videos.pexels.com/video-files/5198148/5198148-hd_1920_1080_30fps.mp4",
    launchers: "https://videos.pexels.com/video-files/3255275/3255275-uhd_2560_1440_25fps.mp4",
    pivoters: "https://videos.pexels.com/video-files/6893988/6893988-hd_1920_1080_30fps.mp4",
    wisdomLeaders: "https://videos.pexels.com/video-files/5378758/5378758-uhd_2560_1440_30fps.mp4",
  },

  /** Photo strip — short clips interspersed with photos */
  strip: [
    "https://videos.pexels.com/video-files/6893988/6893988-hd_1920_1080_30fps.mp4",
    "https://videos.pexels.com/video-files/5198148/5198148-hd_1920_1080_30fps.mp4",
  ],
} as const;
