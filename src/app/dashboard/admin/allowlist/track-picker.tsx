"use client";

import { useRouter } from "next/navigation";
import { fieldInput } from "@/components/ui";

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
      className={`${fieldInput} sm:w-auto min-w-[320px] font-medium`}
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
