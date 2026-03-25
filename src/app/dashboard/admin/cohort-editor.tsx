"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Save, Trash2 } from "lucide-react";

type CohortRow = {
  id: string;
  name: string;
  display_name: string | null;
  start_date: string;
  total_weeks: number;
};

export function CohortEditor({ cohorts: initial }: { cohorts: CohortRow[] }) {
  const [cohorts, setCohorts] = useState(initial);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleSave(id: string, field: string, value: string | number) {
    setSaving(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("cohorts")
      .update({ [field]: value })
      .eq("id", id);

    if (!error) {
      setCohorts((prev) =>
        prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
      );
    }
    setSaving(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this cohort? Students assigned to it will be unassigned.")) return;
    setDeleting(id);
    const supabase = createClient();
    // Unassign students first
    await supabase.from("students").update({ cohort_id: null }).eq("cohort_id", id);
    const { error } = await supabase.from("cohorts").delete().eq("id", id);
    if (!error) {
      setCohorts((prev) => prev.filter((c) => c.id !== id));
    }
    setDeleting(null);
  }

  return (
    <div className="space-y-3">
      {cohorts.map((cohort) => (
        <div
          key={cohort.id}
          className={`rounded-lg border border-neutral-200 bg-white p-4 space-y-3 transition-opacity ${
            saving === cohort.id || deleting === cohort.id ? "opacity-50" : ""
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <div>
                <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide">
                  Display Name
                </label>
                <input
                  type="text"
                  defaultValue={cohort.display_name || ""}
                  onBlur={(e) => handleSave(cohort.id, "display_name", e.target.value)}
                  className="mt-0.5 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide">
                    Start Date
                  </label>
                  <input
                    type="date"
                    defaultValue={cohort.start_date}
                    onBlur={(e) => handleSave(cohort.id, "start_date", e.target.value)}
                    className="mt-0.5 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide">
                    Total Weeks
                  </label>
                  <input
                    type="number"
                    defaultValue={cohort.total_weeks}
                    min={1}
                    max={52}
                    onBlur={(e) => handleSave(cohort.id, "total_weeks", parseInt(e.target.value))}
                    className="mt-0.5 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => handleDelete(cohort.id)}
              className="mt-4 rounded-md p-2 text-neutral-300 hover:bg-red-50 hover:text-red-500 transition-colors"
              title="Delete cohort"
            >
              <Trash2 size={16} />
            </button>
          </div>
          <p className="text-[10px] text-neutral-300 font-mono truncate">{cohort.id}</p>
        </div>
      ))}

      {cohorts.length === 0 && (
        <p className="text-sm text-neutral-400 py-4 text-center">No cohorts</p>
      )}
    </div>
  );
}
