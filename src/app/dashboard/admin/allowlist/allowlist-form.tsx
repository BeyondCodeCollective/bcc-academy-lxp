"use client";

import { useState, useTransition, useRef } from "react";
import { CheckCircle, AlertCircle, Upload, Loader2 } from "lucide-react";
import { replaceAllowedEmails, parseEmailList } from "./actions";

export function AllowlistForm({
  trackSlug,
  trackName,
  initialEmails,
}: {
  trackSlug: string;
  trackName: string;
  initialEmails: string[];
}) {
  const [value, setValue] = useState(initialEmails.join("\n"));
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "ok"; count: number } | { kind: "error"; msg: string }
  >({ kind: "idle" });
  const [isPending, startTransition] = useTransition();
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const text = await file.text();
    const parsed = await parseEmailList(text);
    setValue(parsed.join("\n"));
    setPreviewCount(parsed.length);
    setStatus({ kind: "idle" });
  }

  function handleSave() {
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const result = await replaceAllowedEmails(trackSlug, value);
      if (result.ok) {
        setStatus({ kind: "ok", count: result.count });
      } else {
        setStatus({ kind: "error", msg: result.error ?? "Save failed" });
      }
    });
  }

  const savedCount = value
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0).length;
  const gateActive = savedCount > 0;

  return (
    <div className="space-y-4">
      <div
        className={`flex gap-2 border-l-4 p-4 text-sm ${
          gateActive
            ? "border-emerald-400 bg-emerald-50 text-emerald-900"
            : "border-neutral-300 bg-neutral-50 text-neutral-700"
        }`}
      >
        <span
          aria-hidden
          className={`mt-0.5 h-3 w-3 shrink-0 rounded-full ${
            gateActive ? "bg-emerald-500" : "bg-neutral-400"
          }`}
        />
        <p>
          {gateActive ? (
            <>
              <strong>{savedCount} email{savedCount === 1 ? "" : "s"}</strong>{" "}
              on the {trackName} list — only these addresses can sign up to{" "}
              {trackName}.
            </>
          ) : (
            <>
              The {trackName} list is empty, so the gate is off — anyone
              can sign up to {trackName}. Add emails below to turn it on.
            </>
          )}
        </p>
      </div>

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
            <> · {previewCount} valid email(s) detected from CSV</>
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
        CSV files: if your file has a header row with an <code className="font-mono text-[11px]">email</code>{" "}
        column, only that column is picked. Otherwise the first valid email in
        each row is taken. Duplicates and non-emails are dropped automatically.
      </p>
    </div>
  );
}
