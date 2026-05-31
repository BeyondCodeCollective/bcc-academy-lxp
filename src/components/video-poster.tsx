
type Props = {
  thumbnailUrl?: string | null;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  description?: string | null;
  cta?: string;
};

// Shared poster card visual for video content. Renders a 16:9 thumbnail
// (or a PlayCircle fallback) with a hover play-button overlay, plus the
// usual title / subtitle / CTA metadata block underneath. The wrapping
// element (Link, button, etc.) belongs to the caller — this is just the
// inside. Caller must apply the `group` class for hover effects to fire.
export function VideoPoster({
  thumbnailUrl,
  eyebrow,
  title,
  subtitle,
  description,
  cta = "Watch →",
}: Props) {
  return (
    <>
      <div className="relative aspect-video w-full overflow-hidden bg-paper-tint">
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-paper-tint">
            <span aria-hidden className="text-5xl text-ink-soft">▶</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/25">
          <span className="flex h-12 w-12 scale-90 items-center justify-center rounded-full bg-white/0 opacity-0 backdrop-blur transition-all group-hover:scale-100 group-hover:bg-white/95 group-hover:opacity-100">
            <span aria-hidden className="text-2xl text-ink">▶</span>
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        {eyebrow && (
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">
            {eyebrow}
          </p>
        )}
        <h3 className="mt-2 text-[17px] font-semibold text-ink leading-snug tracking-[-0.01em]">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-1 text-[13px] text-ink-soft">{subtitle}</p>
        )}
        {description && (
          <p className="mt-3 text-[13px] leading-[1.55] text-ink-soft line-clamp-3">
            {description}
          </p>
        )}
        {cta && (
          <span className="mt-auto pt-4 text-[12px] font-medium text-ink-soft group-hover:text-ink">
            {cta}
          </span>
        )}
      </div>
    </>
  );
}
