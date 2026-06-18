"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { saveTrackOverview } from "./actions-tracks";
import type { OfficeHour } from "@/lib/programs/types";
import { fieldInput, buttonClass } from "@/components/ui";

type Props = {
  trackSlug: string;
  programSlug: string;
  initial: OfficeHour[];
};

const BLANK: OfficeHour = {
  date: "",
  time: "",
  title: "",
  description: "",
  joinUrl: "",
  dialIn: "",
};

// Editable office hours / live sessions for a course. Saves the whole list as
// the `office_hours` override on track_overrides (empty list = none shown,
// overriding the TS config). Works for office hours OR live class times — the
// shape is the same (a dated session with a title, time, link, and dial-in).
export function OfficeHoursEditor({ trackSlug, programSlug, initial }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<OfficeHour[]>(() =>
    initial.map((o) => ({ ...BLANK, ...o })),
  );
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const update = (i: number, field: keyof OfficeHour, value: string) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  const add = () => setRows((prev) => [...prev, { ...BLANK }]);
  const remove = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  async function save() {
    setState("saving");
    // Drop blank rows (need at least a title or date); strip empty optionals.
    const cleaned: OfficeHour[] = rows
      .filter((r) => r.title.trim() || r.date.trim())
      .map((r) => ({
        date: r.date.trim(),
        time: r.time.trim(),
        title: r.title.trim(),
        description: r.description.trim(),
        ...(r.joinUrl?.trim() ? { joinUrl: r.joinUrl.trim() } : {}),
        ...(r.dialIn?.trim() ? { dialIn: r.dialIn.trim() } : {}),
      }));
    try {
      await saveTrackOverview(trackSlug, { office_hours: cleaned }, programSlug);
      setState("saved");
      router.refresh();
      setTimeout(() => setState("idle"), 2000);
    } catch (e) {
      console.error("[OfficeHoursEditor] save failed:", e);
      setState("error");
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-faint">
            Office hours &amp; live sessions
          </h3>
          <p className="mt-1 text-[12px] text-ink-soft">
            Shown on the course overview. Add drop-in office hours or live class
            times — each with a date, time, join link, and dial-in.
          </p>
        </div>
        <button type="button" onClick={add} className={buttonClass("secondary", "sm")}>
          <Plus size={13} aria-hidden /> Add
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="panel px-4 py-6 text-center text-[13px] text-ink-faint">
          No sessions yet. Add one to show it on the course overview.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={i} className="panel space-y-3 p-4">
              <div className="flex items-start gap-3">
                <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-ink-faint">Date</span>
                    <input type="date" value={r.date} onChange={(e) => update(i, "date", e.target.value)} className={fieldInput} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-ink-faint">Time</span>
                    <input type="text" value={r.time} onChange={(e) => update(i, "time", e.target.value)} placeholder="1pm EST (10am PT)" className={fieldInput} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-ink-faint">Title</span>
                    <input type="text" value={r.title} onChange={(e) => update(i, "title", e.target.value)} placeholder="AI Office Hours" className={fieldInput} />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label="Remove session"
                  className="mt-5 shrink-0 rounded-md p-1.5 text-ink-faint transition-colors hover:bg-paper-tint hover:text-ink"
                >
                  <Trash2 size={15} aria-hidden />
                </button>
              </div>
              <label className="block">
                <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-ink-faint">Description</span>
                <textarea value={r.description} onChange={(e) => update(i, "description", e.target.value)} rows={2} placeholder="What this session is for…" className={fieldInput} />
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-ink-faint">Join link (optional)</span>
                  <input type="text" value={r.joinUrl ?? ""} onChange={(e) => update(i, "joinUrl", e.target.value)} placeholder="https://meet.google.com/…" className={fieldInput} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-ink-faint">Dial-in (optional)</span>
                  <input type="text" value={r.dialIn ?? ""} onChange={(e) => update(i, "dialIn", e.target.value)} placeholder="(US) +1 … · PIN: …" className={fieldInput} />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={state === "saving"}
          className={buttonClass("primary", "sm")}
        >
          {state === "saving" ? "Saving…" : "Save office hours"}
        </button>
        {state === "saved" && <span className="text-[12px] text-ink-soft">Saved ✓</span>}
        {state === "error" && <span className="text-[12px] text-red-600">Couldn’t save — try again.</span>}
      </div>
    </section>
  );
}
