"use client";

import { useId, useRef, useState } from "react";
import { loadCommitmentOptions } from "../commitment-options";

export type CommitmentDraft = {
  partner: string; name: string; program: string; programId: string;
  metrics: { name: string; source: string; target: string }[];
  period: string; deadline: string; owner: string; ownerId: string;
};
const inputStyle = "mt-2 min-h-11 w-full min-w-0 rounded-lg border border-rule px-3 py-2 font-normal focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";
const buttonStyle = "min-h-11 rounded-lg border border-rule px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50";
const names = ["[] commitment name 1", "[] commitment name 2", "[] commitment name 3"];

export function NewCommitment({ onCreate, initialDraft, editing = false }: {
  onCreate: (draft: CommitmentDraft) => void; initialDraft?: CommitmentDraft; editing?: boolean;
}) {
  const formId = useId();
  const [revision, setRevision] = useState(0);
  const [programId, setProgramId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const request = useRef(0);
  const nextMetric = useRef(1);
  const [metrics, setMetrics] = useState([0]);
  const [options, setOptions] = useState<Awaited<ReturnType<typeof loadCommitmentOptions>> | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  async function loadOptions() {
    const version = ++request.current;
    setOptions(null); setState("loading");
    try {
      const result = await loadCommitmentOptions();
      if (version === request.current) { setOptions(result); setState("ready"); }
    } catch {
      if (version === request.current) setState("error");
    }
  }
  return <>
    <button type="button" className={`${buttonStyle} bg-primary text-white`}
      onClick={() => {
        setRevision(value => value + 1);
        setMetrics(initialDraft ? initialDraft.metrics.map((_, index) => index) : [0]);
        nextMetric.current = initialDraft?.metrics.length ?? 1;
        setProgramId(initialDraft?.programId ?? ""); setOwnerId(initialDraft?.ownerId ?? "");
        dialog.current?.showModal(); void loadOptions();
      }}>{editing ? "Edit commitment" : "New commitment"}</button>
    <dialog ref={dialog} aria-labelledby={`${formId}-heading`} aria-describedby={`${formId}-help`}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-xl border border-rule bg-white p-5 text-ink shadow-xl backdrop:bg-black/40 sm:p-6"
      onClose={() => { request.current++; form.current?.reset(); setMetrics([0]); nextMetric.current = 1; setOptions(null); }}>
      <h2 id={`${formId}-heading`} className="text-xl font-semibold">{editing ? "Edit commitment" : "New commitment"}</h2>
      <p id={`${formId}-help`} className="mt-2 text-sm text-ink-soft">Layout preview only. Commitment names are placeholders. This commitment will appear on this page, but will not be saved after a refresh.</p>
      {state === "loading" && <p role="status" className="mt-3 text-sm">Loading programs and owners…</p>}
      {state === "error" && <div role="alert" className="mt-3 text-sm">Programs and owners are unavailable. <button type="button" className={buttonStyle} onClick={() => void loadOptions()}>Retry</button></div>}
      <form key={revision} ref={form} className="mt-5" onSubmit={event => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const value = (key: string) => String(data.get(key) ?? "").trim();
        const program = options?.programs.find(row => row.id === value("program"));
        const owner = options?.owners.find(row => row.id === value("owner"));
        const rows = metrics.map(id => ({ name: value(`metric-${id}`), source: value(`source-${id}`), target: value(`target-${id}`) }));
        if (!program || !names.includes(value("name")) || !value("partner") || rows.some(row => !row.name)) return;
        onCreate({ partner: value("partner"), name: value("name"), program: program.name, programId: program.id,
          owner: owner?.name ?? "", ownerId: owner?.id ?? "", period: value("period"), deadline: value("deadline"), metrics: rows });
        dialog.current?.close();
      }}>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <label className="min-w-0 text-sm font-medium">Partner / funder (required)<input name="partner" defaultValue={initialDraft?.partner ?? ""} required maxLength={200} pattern={".*\\S.*"} className={inputStyle} /></label>
          <label className="min-w-0 text-sm font-medium">Commitment name (required)<select name="name" required defaultValue={initialDraft?.name ?? ""} className={inputStyle}><option value="">Select a commitment name</option>{names.map(name => <option key={name}>{name}</option>)}</select></label>
          <label className="min-w-0 text-sm font-medium">Linked program (required)<select name="program" required value={programId} onChange={event => setProgramId(event.target.value)} disabled={state !== "ready" || !options?.programs.length} className={inputStyle}><option value="">Select a program</option>{options?.programs.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
          <label className="min-w-0 text-sm font-medium">Owner<select name="owner" value={ownerId} onChange={event => setOwnerId(event.target.value)} disabled={state !== "ready" || !options?.owners.length} className={inputStyle}><option value="">Select an owner</option>{options?.owners.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
          <label className="min-w-0 text-sm font-medium">Reporting period<span className="block text-xs font-normal text-ink-soft">Dates the results cover, such as Jan–Mar 2027.</span><input name="period" defaultValue={initialDraft?.period ?? ""} maxLength={200} className={inputStyle} /></label>
          <label className="min-w-0 text-sm font-medium">Deadline<input name="deadline" defaultValue={initialDraft?.deadline ?? ""} type="date" className={inputStyle} /></label>
        </div>
        {state === "ready" && !options?.programs.length && <p role="status" className="mt-3 text-sm">No authorized programs are available. A program is required to add a preview commitment.</p>}
        {state === "ready" && !options?.owners.length && <p className="mt-3 text-sm">No admin or super-admin owners are available.</p>}
        <div className="mt-5 space-y-4">
          <p className="text-sm text-ink-soft">Add 1–4 metrics for this commitment.</p>
          {metrics.map((id, index) => <fieldset key={id} className="min-w-0 rounded-lg border border-rule p-4">
            <legend className="px-1 text-sm font-semibold">Metric {index + 1}</legend>
            <label className="block text-sm font-medium">Metric name (required)<input name={`metric-${id}`} defaultValue={initialDraft?.metrics[id]?.name ?? ""} required maxLength={200} pattern={".*\\S.*"} className={inputStyle} /></label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="min-w-0 text-sm font-medium">Data source<span className="block text-xs font-normal text-ink-soft">Where the result comes from, such as attendance records.</span><input name={`source-${id}`} defaultValue={initialDraft?.metrics[id]?.source ?? ""} maxLength={200} className={inputStyle} /></label>
              <label className="min-w-0 text-sm font-medium">Target<span className="block text-xs font-normal text-ink-soft">The agreed goal, such as 40 learners or 80%.</span><input name={`target-${id}`} defaultValue={initialDraft?.metrics[id]?.target ?? ""} maxLength={200} className={inputStyle} /></label>
            </div>
            {metrics.length > 1 && <button type="button" aria-label={`Remove metric ${index + 1}`} className={`${buttonStyle} mt-3`} onClick={() => setMetrics(current => current.filter(value => value !== id))}>Remove metric</button>}
          </fieldset>)}
          <button type="button" disabled={metrics.length >= 4} className={buttonStyle} onClick={() => { const id = nextMetric.current++; setMetrics(current => [...current, id]); }}>Add metric</button>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" className={buttonStyle} onClick={() => dialog.current?.close()}>Cancel</button>
          <button type="submit" disabled={state !== "ready" || !options?.programs.length} className={`${buttonStyle} bg-primary text-white`}>{editing ? "Save preview changes" : "Add preview commitment"}</button>
        </div>
      </form>
    </dialog>
  </>;
}
