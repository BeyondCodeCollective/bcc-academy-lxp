"use client";

import { useState, useTransition, useRef } from "react";
import { CheckCircle, AlertCircle, Upload, Loader2 } from "lucide-react";
import { replaceAllowedEmails, parseEmailList } from "./actions";

export function AllowlistForm({
  programSlug,
  programName,
  initialEmails,
  requireAllowlist,
}: {
  programSlug: string;
  programName: string;
  initialEmails: string[];
  requireAllowlist: boolean;
}) {
  const [value, setValue] = useState(initialEmails.join("\n"));
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "ok"; count: number } | { kind: "error"; msg: string }
  >({ kind: "idle" });
  const [isPending, startTransition] = useTransition();
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSave() {
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const result = await replaceAllowedEmails(programSlug, value);
      if (result.ok) {
        setStatus({ kind: "ok", count: result.count });
      } else {
        setStatus({ kind: "error", msg: result.error ?? "Save failed" });
      }
    });
  }

  async function handleFile(file: File) {
    const text = await file.text();
    // Parse server-side to keep the normalisation in one place; reuse result.
    const parsed = await parseEmailList(text);
    setValue(parsed.join("\n"));
    setPreviewCount(parsed.length);
    setStatus({ kind: "idle" });
  }

  return (
    <div className="space-y-4">
      {!requireAllowlist && (
        <div className="flex gap-2 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <p>
            <strong>Gate is currently off</strong> for {programName}. The
            allowlist saves to the database but isn&apos;t enforced until the
            program&apos;s <code className="font-mono text-[12px]">requireAllowlist</code> flag is flipped on in code.
          </p>
        </div>
      )}

      <div>
        <label
          htmlFor="emails"
          className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2"
        >
          Allowed emails — one per line, or upload a CSV
        </label>
        <textarea
          id="emails"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setPreviewCount(null);
            setStatus({ kind: "idle" });
          }}
          rows={14}
          className="w-full border border-neutral-300 px-3 py-2 font-mono text-[13px] leading-relaxed focus:outline-none focus:border-neutral-900"
          placeholder="ashley@example.com&#10;ryan@example.com&#10;…"
          spellCheck={false}
        />
        <p className="mt-1.5 text-xs text-neutral-500">
          {value.split(/\r?\n/).filter((l) => l.trim().length > 0).length} line(s)
          {previewCount !== null && previewCount !== value.split(/\r?\n/).filter((l) => l.trim().length > 0).length && (
            <> · {previewCount} valid email(s) detected from upload</>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
        >
          <Upload size={14} />
          Upload CSV
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-neutral-900 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Saving…
            </>
          ) : (
            "Replace allowlist"
          )}
        </button>
        {status.kind === "ok" && (
          <span className="inline-flex items-center gap-1.5 text-sm text-green-700">
            <CheckCircle size={14} />
            Saved · {status.count} email{status.count === 1 ? "" : "s"} on the list
          </span>
        )}
        {status.kind === "error" && (
          <span className="inline-flex items-center gap-1.5 text-sm text-red-600">
            <AlertCircle size={14} />
            {status.msg}
          </span>
        )}
      </div>

      <p className="text-xs text-neutral-500">
        Smart CSV parsing: if your file has a header row with an <code className="font-mono text-[11px]">email</code>{" "}
        column (Sprout Social, Mailchimp, etc), only that column is picked.
        Otherwise the first valid email in each row is taken. Duplicates and
        non-emails are dropped automatically.
      </p>
    </div>
  );
}
