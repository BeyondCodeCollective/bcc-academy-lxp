"use client";

import Link from "next/link";

// Failed reads never become zero-count dashboards. Retry preserves the URL scope.
export default function MvpError({ reset }: { reset: () => void }) {
  return (
    <section className="p-6" role="alert">
      <h2 className="text-xl font-semibold">Unable to load MVP data</h2>
      <p className="my-3">Check database access and the selected program/course. No counts are being shown because the request could not be completed.</p>
      <button type="button" onClick={reset} className="rounded border px-4 py-2">Try again</button>
      <Link href="/dashboard/admin/mvp" className="ml-4 underline">Clear filters</Link>
    </section>
  );
}
