"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { buttonClass } from "@/components/ui";
import type { ImportPreview } from "@/lib/events-import";
import { previewImport, runImport } from "./actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-rule bg-white px-3.5 py-3 font-mono text-xs text-ink placeholder:text-ink-faint focus:border-ink focus:ring-1 focus:ring-ink-faint focus:outline-none";

export function ImportForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState<"idle" | "preview" | "import">("idle");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ families: number; attendees: number } | null>(null);

  async function onFile(file: File) {
    setCsv(await file.text());
    setPreview(null);
    setDone(null);
  }

  async function onPreview() {
    setError(null);
    setBusy("preview");
    const res = await previewImport(eventId, csv);
    setBusy("idle");
    if (res.ok) setPreview(res.preview);
    else setError(res.error);
  }

  async function onImport() {
    setError(null);
    setBusy("import");
    const res = await runImport(eventId, csv);
    setBusy("idle");
    if (res.ok) {
      setDone(res);
      setPreview(null);
      router.refresh();
    } else setError(res.error);
  }

  if (done) {
    return (
      <div className="rounded-lg border border-rule bg-white p-6">
        <h2 className="text-base font-bold text-ink">Imported</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {done.families} new famil{done.families === 1 ? "y" : "ies"}, {done.attendees} new attendee
          {done.attendees === 1 ? "" : "s"}. Families already on the roster were reused.
        </p>
        <a href={`/dashboard/admin/events/${eventId}`} className={`${buttonClass("primary", "md")} mt-4`}>
          Open roster
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-rule bg-white p-6 space-y-4">
        <div>
          <label htmlFor="imp-file" className="mb-2 block text-sm font-medium text-ink">
            CSV file
          </label>
          <input
            id="imp-file"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            className="block text-sm text-ink"
          />
        </div>
        <div>
          <label htmlFor="imp-csv" className="mb-2 block text-sm font-medium text-ink">
            Or paste it
          </label>
          <textarea
            id="imp-csv"
            rows={8}
            value={csv}
            onChange={(e) => {
              setCsv(e.target.value);
              setPreview(null);
            }}
            placeholder={'First name,Last name,Email address,Participant\'s First Name,Participant\'s Last Name,...'}
            className={INPUT_CLASS}
          />
        </div>
        <button type="button" disabled={!csv.trim() || busy !== "idle"} onClick={onPreview} className={buttonClass("secondary", "md")}>
          {busy === "preview" ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Reading...
            </>
          ) : (
            "Preview"
          )}
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {preview && (
        <div className="rounded-lg border border-rule bg-white p-6 space-y-4">
          <p className="text-sm text-ink">
            <span className="font-semibold">{preview.rows} rows</span> → {preview.families} famil
            {preview.families === 1 ? "y" : "ies"}, {preview.attendees} attendee{preview.attendees === 1 ? "" : "s"}
            {preview.attended > 0 ? `, ${preview.attended} marked attended` : ""}.
          </p>
          <dl className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
            {Object.entries(preview.mapped).map(([field, header]) => (
              <div key={field} className="flex gap-2">
                <dt className="w-40 shrink-0 text-ink-soft">{field.replace(/_/g, " ")}</dt>
                <dd className="truncate text-ink">{header}</dd>
              </div>
            ))}
          </dl>
          {preview.skipped.length > 0 && (
            <details className="text-xs text-ink-soft">
              <summary className="cursor-pointer">{preview.skipped.length} row{preview.skipped.length === 1 ? "" : "s"} will be skipped</summary>
              <ul className="mt-2 list-disc pl-5">
                {preview.skipped.slice(0, 20).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </details>
          )}
          <button type="button" disabled={busy !== "idle" || preview.attendees === 0} onClick={onImport} className={buttonClass("primary", "md")}>
            {busy === "import" ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Importing...
              </>
            ) : (
              `Import ${preview.attendees} attendee${preview.attendees === 1 ? "" : "s"}`
            )}
          </button>
        </div>
      )}
    </div>
  );
}
