"use client";

import { useRouter } from "next/navigation";

export function TrackPicker({
  selectedSlug,
  groups,
}: {
  selectedSlug: string;
  groups: { label: string; options: { slug: string; name: string }[] }[];
}) {
  const router = useRouter();
  return (
    <select
      id="track-picker"
      value={selectedSlug}
      onChange={(e) => {
        router.push(`/dashboard/admin/allowlist?track=${e.target.value}`);
      }}
      className="w-full sm:w-auto min-w-[320px] border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 focus:outline-none focus:border-neutral-900"
    >
      {groups.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.options.map((o) => (
            <option key={o.slug} value={o.slug}>
              {o.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
