import type { CSSProperties, ReactNode } from "react";

// Markdown-lite for landing page copy: exactly the syntax admins naturally type
// into the subhead and section fields — blank line = new paragraph, single
// newline = line break, "- " or "• " lines = bullet list, **text** = bold.
// Nothing else (no links, no headings, no HTML). A deliberate floor, not a
// WYSIWYG: the fields stay plain text, the page renders them styled.

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  parts.forEach((part, i) => {
    if (!part) return;
    if (i % 2 === 1) {
      out.push(
        <strong key={`${keyBase}-b${i}`} className="font-semibold">
          {part}
        </strong>,
      );
    } else {
      out.push(part);
    }
  });
  return out;
}

function withBreaks(block: string, keyBase: string): ReactNode[] {
  const lines = block.split("\n");
  const out: ReactNode[] = [];
  lines.forEach((line, i) => {
    if (i > 0) out.push(<br key={`${keyBase}-br${i}`} />);
    out.push(...inline(line, `${keyBase}-l${i}`));
  });
  return out;
}

const BULLET = /^\s*[-•]\s+/;

export function RichText({
  text,
  className,
  style,
}: {
  text: string;
  className?: string;
  style?: CSSProperties;
}) {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className={className} style={style}>
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        if (lines.every((l) => BULLET.test(l))) {
          return (
            <ul key={bi} className="mt-3 space-y-1.5 pl-4 first:mt-0" style={{ listStyleType: "disc" }}>
              {lines.map((l, li) => (
                <li key={li}>{inline(l.replace(BULLET, ""), `${bi}-${li}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={bi} className="mt-3 first:mt-0">
            {withBreaks(block, `${bi}`)}
          </p>
        );
      })}
    </div>
  );
}
