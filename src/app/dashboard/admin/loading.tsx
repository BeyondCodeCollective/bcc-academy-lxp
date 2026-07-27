import { CircleNotch as Loader2 } from "@phosphor-icons/react/dist/ssr";

// Admin fallback — a neutral centered loader, deliberately NOT a skeleton.
// This file renders before the ?tab= param is read server-side, so it can't
// know which admin surface is coming (home picker, People rows, a track
// overview with charts…). A layout-mimicking skeleton is therefore always
// wrong for most tabs and reads as "a different UI flashing" on refresh
// (e.g. ?tab=comptia-security). A plain loader promises nothing and
// mismatches nothing.
export default function AdminLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading">
      <Loader2 size={24} className="animate-spin text-ink-faint" />
    </div>
  );
}
