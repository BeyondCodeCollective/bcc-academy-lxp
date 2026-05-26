"use client";

import { useRouter } from "next/navigation";

export function ProgramPicker({
  selectedSlug,
  programs,
}: {
  selectedSlug: string;
  programs: { slug: string; name: string }[];
}) {
  const router = useRouter();
  return (
    <select
      id="program-picker"
      value={selectedSlug}
      onChange={(e) => {
        router.push(`/dashboard/admin/allowlist?program=${e.target.value}`);
      }}
      className="w-full sm:w-auto min-w-[260px] border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 focus:outline-none focus:border-neutral-900"
    >
      {programs.map((p) => (
        <option key={p.slug} value={p.slug}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
