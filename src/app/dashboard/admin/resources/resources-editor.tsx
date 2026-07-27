"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash as Trash2, ArrowUp, ArrowDown } from "@phosphor-icons/react";
import { saveResources, type ResourceInput } from "./actions";
import { fieldInput, buttonClass } from "@/components/ui";

type Row = ResourceInput;

const BLANK: Row = { title: "", description: "", url: "", category: "", icon: "" };

type Props = {
  programSlug: string;
  programName: string;
  initial: Row[];
};

// Flexible per-program resources editor: each row is "anything" (a tool, a
// link, a document, a contact) with an optional category for grouping. The
// whole list is saved at once (replace-all).
export function ResourcesEditor({ programSlug, programName, initial }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() =>
    initial.length ? initial.map((r) => ({ ...BLANK, ...r })) : [{ ...BLANK }],
  );
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const update = (i: number, field: keyof Row, value: string) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  const add = () => setRows((prev) => [...prev, { ...BLANK }]);
  const remove = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) =>
    setRows((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  async function save() {
    setState("saving");
    try {
      await saveResources(
        programSlug,
        rows.filter((r) => r.title.trim() !== ""),
      );
      setState("saved");
      router.refresh();
      setTimeout(() => setState("idle"), 2000);
    } catch (e) {
      console.error("[ResourcesEditor] save failed:", e);
      setState("error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <p className="text-xs text-ink-soft">
          Resources shown on the <strong>{programName}</strong> Resources page. Add
          anything — tools, materials, links, docs, contacts. The optional
          category groups items on the page.
        </p>
        <button type="button" onClick={add} className={buttonClass("secondary", "sm")}>
          <Plus size={13} aria-hidden /> Add
        </button>
      </div>

      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="panel space-y-3 p-4">
            <div className="flex items-start gap-3">
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_4rem]">
                <label className="block">
                  <span className="mb-1 block text-micro font-medium uppercase tracking-wider text-ink-faint">Title</span>
                  <input type="text" value={r.title} onChange={(e) => update(i, "title", e.target.value)} placeholder="ChatGPT" className={fieldInput} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-micro font-medium uppercase tracking-wider text-ink-faint">Category</span>
                  <input type="text" value={r.category} onChange={(e) => update(i, "category", e.target.value)} placeholder="Tools" className={fieldInput} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-micro font-medium uppercase tracking-wider text-ink-faint">Icon</span>
                  <input type="text" value={r.icon} onChange={(e) => update(i, "icon", e.target.value)} placeholder="🔧" className={`${fieldInput} text-center`} />
                </label>
              </div>
              <div className="mt-5 flex shrink-0 flex-col gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="rounded p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-ink-faint hover:bg-paper-tint hover:text-ink disabled:opacity-30">
                  <ArrowUp size={13} aria-hidden />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down" className="rounded p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-ink-faint hover:bg-paper-tint hover:text-ink disabled:opacity-30">
                  <ArrowDown size={13} aria-hidden />
                </button>
              </div>
              <button type="button" onClick={() => remove(i)} aria-label="Remove" className="mt-5 shrink-0 rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-paper-tint hover:text-ink">
                <Trash2 size={15} aria-hidden />
              </button>
            </div>
            <label className="block">
              <span className="mb-1 block text-micro font-medium uppercase tracking-wider text-ink-faint">Link (optional)</span>
              <input type="text" value={r.url} onChange={(e) => update(i, "url", e.target.value)} placeholder="https://…" className={fieldInput} />
            </label>
            <label className="block">
              <span className="mb-1 block text-micro font-medium uppercase tracking-wider text-ink-faint">Description (optional)</span>
              <textarea value={r.description} onChange={(e) => update(i, "description", e.target.value)} rows={2} placeholder="What this is / how to use it…" className={fieldInput} />
            </label>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={state === "saving"} className={buttonClass("primary", "sm")}>
          {state === "saving" ? "Saving…" : "Save resources"}
        </button>
        {state === "saved" && <span className="text-xs text-ink-soft">Saved ✓</span>}
        {state === "error" && <span className="text-xs text-red-600">Couldn’t save — try again.</span>}
      </div>
    </div>
  );
}
