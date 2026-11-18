"use client";

import { useRef } from "react";

export type CommitmentDraft = {
  partner: string; name: string; program: string; metric: string; source: string;
  target: string; period: string; deadline: string; owner: string;
};
const fields: { key: keyof CommitmentDraft; label: string; required?: boolean; type?: string }[] = [
  { key: "partner", label: "Partner / funder", required: true },
  { key: "name", label: "Commitment name", required: true },
  { key: "program", label: "Linked program" },
  { key: "metric", label: "Metric name", required: true },
  { key: "source", label: "Data source" },
  { key: "target", label: "Target", },
  { key: "period", label: "Reporting period" },
  { key: "deadline", label: "Deadline", type: "date" },
  { key: "owner", label: "Owner" },
];

export function NewCommitment({ onCreate }: { onCreate: (draft: CommitmentDraft) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  return <>
    <button type="button" className="min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      onClick={() => dialog.current?.showModal()}>New commitment</button>
    <dialog ref={dialog} aria-labelledby="new-commitment-heading" aria-describedby="new-commitment-help"
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-xl border border-rule bg-white p-5 text-ink shadow-xl backdrop:bg-black/40 sm:p-6"
      onClose={() => form.current?.reset()}>
      <h2 id="new-commitment-heading" className="text-xl font-semibold">New commitment</h2>
      <p id="new-commitment-help" className="mt-2 text-sm text-ink-soft">Layout preview only. This commitment will appear on this page, but will not be saved after a refresh.</p>
      <form ref={form} className="mt-5" onSubmit={event => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const draft = Object.fromEntries(fields.map(field => [field.key, String(data.get(field.key) ?? "").trim()])) as CommitmentDraft;
        if (fields.some(field => field.required && !draft[field.key])) return;
        onCreate(draft);
        dialog.current?.close();
      }}>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">{fields.map(field => <label key={field.key} className="min-w-0 text-sm font-medium">
          {field.label}{field.required ? " (required)" : ""}
          <input name={field.key} type={field.type ?? "text"} required={field.required} maxLength={200}
            pattern={field.required ? ".*\\S.*" : undefined}
            className="mt-2 min-h-11 w-full min-w-0 rounded-lg border border-rule px-3 py-2 font-normal focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" />
        </label>)}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" className="min-h-11 rounded-lg border border-rule px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" onClick={() => dialog.current?.close()}>Cancel</button>
          <button type="submit" className="min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Add preview commitment</button>
        </div>
      </form>
    </dialog>
  </>;
}
