import { Loader2 } from "lucide-react";

// Neutral centered loader, deliberately NOT a skeleton. Layout-mimicking
// skeletons flash as a "different UI" whenever the guess is wrong, and a
// loading file can't know what the page will actually render. A plain
// loader promises nothing and mismatches nothing.
export default function TutorLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading">
      <Loader2 size={24} className="animate-spin text-ink-faint" />
    </div>
  );
}
