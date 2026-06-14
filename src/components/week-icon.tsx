import { createElement } from "react";
import { weekIconForEmoji } from "@/lib/track-visual";

/**
 * Renders a week-topic icon. Track data stores these as emoji strings
 * (DB-editable); adult-facing tracks map them to Phosphor icons, while
 * kid-facing tracks (`emoji` true, e.g. Roblox bootcamp) keep the raw
 * emoji. Unmapped emojis fall back to the emoji itself.
 */
export function WeekIcon({
  icon,
  emoji = false,
  size,
  className,
}: {
  icon: string;
  emoji?: boolean;
  size: number;
  className?: string;
}) {
  const icn = emoji ? null : weekIconForEmoji(icon);
  if (!icn) return <>{icon}</>;
  return createElement(icn, { size, weight: "regular", className });
}
