import Link from "next/link";

// THE wordmark — one definition so the brand can't drift between surfaces.
// Size via className; treatment (uppercase, bold, green brackets) is fixed.
export function BrandWordmark({
  className = "text-2xl md:text-3xl",
}: {
  className?: string;
}) {
  return (
    <Link href="/" className="group inline-flex items-center">
      <span
        className={`font-display font-bold text-white uppercase tracking-tight leading-none ${className}`}
      >
        BCC <span className="text-electric-green">[</span>Academy
        <span className="text-electric-green">]</span>
      </span>
    </Link>
  );
}
