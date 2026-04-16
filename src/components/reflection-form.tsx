"use client";

import { useState } from "react";
import { submitReflection } from "@/app/dashboard/track/actions";
import type { ReflectionRow, FeedbackRow } from "@/app/dashboard/track/actions";
import { PenLine, CheckCircle, Loader2, MessageSquare, ChevronDown } from "lucide-react";

const DEFAULT_PROMPTS = [
  "What did you learn this week?",
  "What was challenging?",
  "How will you apply this going forward?",
];

export function ReflectionForm({
  trackSlug,
  weekNumber,
  prompts,
  existing,
  feedback,
}: {
  trackSlug: string;
  weekNumber: number;
  prompts: string[];
  existing: ReflectionRow | null;
  feedback: FeedbackRow[];
}) {
  const activePrompts = prompts.length > 0 ? prompts : DEFAULT_PROMPTS;
  const existingResponses = existing?.responses ?? {};

  const [responses, setResponses] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const prompt of activePrompts) {
      initial[prompt] = existingResponses[prompt] ?? "";
    }
    initial["_additional"] = existingResponses["_additional"] ?? "";
    return initial;
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!existing?.submitted_at);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  function updateResponse(key: string, value: string) {
    setResponses((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit() {
    setSaving(true);
    setError("");
    try {
      // Only send non-empty responses
      const cleaned: Record<string, string> = {};
      for (const [key, value] of Object.entries(responses)) {
        if (value.trim()) cleaned[key] = value.trim();
      }
      await submitReflection(trackSlug, weekNumber, cleaned);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    }
    setSaving(false);
  }

  const hasContent = Object.values(responses).some((v) => v.trim());

  return (
    <div className="rounded-xl border border-neutral-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-4 sm:p-6 text-left hover:bg-neutral-50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-2">
          <PenLine size={14} className="text-neutral-400" />
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
            Weekly Reflection
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
              <CheckCircle size={14} />
              Submitted
            </span>
          )}
          <ChevronDown
            size={16}
            className={`text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {!open ? null : (
      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
      {/* Structured prompts */}
      <div className="space-y-4 mb-4">
        {activePrompts.map((prompt) => (
          <div key={prompt}>
            <label className="text-sm font-medium text-neutral-700 mb-1.5 block">
              {prompt}
            </label>
            <textarea
              value={responses[prompt] ?? ""}
              onChange={(e) => updateResponse(prompt, e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none resize-none"
            />
          </div>
        ))}
      </div>

      {/* Free text */}
      <div className="mb-4">
        <label className="text-sm font-medium text-neutral-700 mb-1.5 block">
          Additional thoughts (optional)
        </label>
        <textarea
          value={responses["_additional"] ?? ""}
          onChange={(e) => updateResponse("_additional", e.target.value)}
          placeholder="Anything else on your mind..."
          rows={2}
          className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none resize-none"
        />
      </div>

      {/* Error */}
      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={saving || !hasContent}
        className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors"
      >
        {saving ? (
          <><Loader2 size={14} className="animate-spin" /> Saving...</>
        ) : saved ? (
          <><CheckCircle size={14} /> Update Reflection</>
        ) : (
          "Submit Reflection"
        )}
      </button>

      {/* Feedback from instructor */}
      {feedback.length > 0 && (
        <div className="mt-5 pt-4 border-t border-neutral-100 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare size={14} className="text-neutral-400" />
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
              Instructor Feedback
            </h3>
          </div>
          {feedback.map((fb) => (
            <div
              key={fb.id}
              className="rounded-lg border border-neutral-100 bg-neutral-50 p-3"
            >
              <p className="text-sm text-neutral-700">{fb.comment}</p>
              <p className="text-[11px] text-neutral-400 mt-1">
                {fb.reviewer_name} &middot;{" "}
                {new Date(fb.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
      </div>
      )}
    </div>
  );
}
