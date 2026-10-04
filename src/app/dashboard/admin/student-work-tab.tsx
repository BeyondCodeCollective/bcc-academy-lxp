"use client";

import { useState, useEffect } from "react";
import { getAllSubmissions, addFeedback } from "./actions";
import type { AdminSubmissionRow } from "./actions";
import { CaretDown as ChevronDown, ArrowSquareOut as ExternalLink, CircleNotch as Loader2, FileText, PaperPlaneTilt as Send, ChatCentered as MessageSquare } from "@phosphor-icons/react";
import { fieldInput } from "@/components/ui";
import { type AdminTrackConfig } from "./admin-shared";

// ─── Student Work Tab ──────────────────────────────────────────────────────

export function StudentWorkTab({
  tracks,
  programSlug,
  viewSwitcher,
}: {
  tracks: AdminTrackConfig[];
  programSlug: string;
  viewSwitcher?: React.ReactNode;
}) {
  // Single-track callers (a course's Submissions view) hide the track filter,
  // so "all" would silently fetch program-wide and show other courses' work
  // under this course. Scope to the only track from the start.
  const [trackFilter, setTrackFilter] = useState<string>(
    tracks.length === 1 ? tracks[0].slug : "all",
  );
  const [weekFilter, setWeekFilter] = useState<number | "all">("all");
  const [submissions, setSubmissions] = useState<AdminSubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});
  const [sendingFeedback, setSendingFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const subs = await getAllSubmissions(programSlug, trackFilter !== "all" ? trackFilter : undefined);
        setSubmissions(subs);
      } catch (err) {
        console.error("Failed to load student work:", err);
      }
      setLoading(false);
    }
    load();
  }, [programSlug, trackFilter]);

  async function handleSendFeedback(itemId: string) {
    const text = feedbackText[itemId]?.trim();
    if (!text) return;
    setSendingFeedback(itemId);
    try {
      await addFeedback({
        submissionId: itemId,
        comment: text,
      });
      setFeedbackText((prev) => ({ ...prev, [itemId]: "" }));
      setSubmissions((prev) =>
        prev.map((s) => (s.id === itemId ? { ...s, feedback_count: s.feedback_count + 1 } : s))
      );
    } catch (err) {
      console.error("Failed to send feedback:", err);
    }
    setSendingFeedback(null);
  }

  const filteredSubmissions = submissions.filter((s) =>
    weekFilter === "all" ? true : s.week_number === weekFilter
  );

  const maxWeeks = Math.max(...tracks.map((t) => t.totalWeeks), 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {viewSwitcher}
        {tracks.length > 1 && (
          <div className="relative">
            <select
              value={trackFilter}
              onChange={(e) => setTrackFilter(e.target.value)}
              className="appearance-none border border-rule bg-neutral-50 pl-3 pr-7 py-1.5 text-xs font-medium text-ink focus:border-ink-faint"
            >
              <option value="all">All Tracks</option>
              {tracks.map((t) => (
                <option key={t.slug} value={t.slug}>{t.shortName}</option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint" />
          </div>
        )}

        <div className="relative">
          <select
            value={weekFilter}
            onChange={(e) => setWeekFilter(e.target.value === "all" ? "all" : parseInt(e.target.value))}
            className="appearance-none border border-rule bg-neutral-50 pl-3 pr-7 py-1.5 text-xs font-medium text-ink focus:border-ink-faint"
          >
            <option value="all">All Weeks</option>
            {Array.from({ length: maxWeeks }, (_, i) => (
              <option key={i + 1} value={i + 1}>Week {i + 1}</option>
            ))}
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint" />
        </div>

        <span className="text-xs text-ink-faint ml-auto">
          {filteredSubmissions.length} result{filteredSubmissions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-ink-faint" />
        </div>
      )}

      {!loading && (
        <div className="space-y-2">
          {filteredSubmissions.length === 0 && (
            <p className="text-sm text-ink-faint py-8 text-center">No submissions yet</p>
          )}
          {filteredSubmissions.map((sub) => (
            <div key={sub.id} className="panel overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                className="flex w-full items-center justify-between px-4 py-3 hover:bg-paper-tint-soft transition-colors"
              >
                <div className="flex items-center gap-3 text-left min-w-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{sub.student_name}</p>
                    <p className="text-micro text-ink-faint">
                      {(() => { const st = tracks.find((t) => t.slug === sub.track_slug); return `${st?.shortName ?? sub.track_slug} · ${st?.unitLabel || "Week"} ${sub.week_number}`; })()}
                      {sub.submitted_at && ` · ${new Date(sub.submitted_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {sub.feedback_count > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-micro text-green-600 bg-green-50 rounded-full px-1.5 py-0.5">
                      <MessageSquare size={10} /> {sub.feedback_count}
                    </span>
                  )}
                  <ChevronDown size={14} className={`text-ink-faint transition-transform ${expandedId === sub.id ? "rotate-180" : ""}`} />
                </div>
              </button>

              {expandedId === sub.id && (() => {
                // Render answers in syllabus order, not jsonb key order
                // (Postgres jsonb doesn't preserve insertion order).
                const responses = sub.prompt_responses ?? {};
                const orderedPrompts =
                  tracks
                    .find((t) => t.slug === sub.track_slug)
                    ?.weeks?.find((w) => w.week === sub.week_number)
                    ?.submissionPrompts ?? [];
                const orderedKeys = orderedPrompts.filter((p) => p in responses);
                const extraKeys = Object.keys(responses).filter(
                  (k) => !orderedKeys.includes(k),
                );
                const promptOrder = [...orderedKeys, ...extraKeys];
                return (
                <div className="border-t border-rule-soft px-4 py-3 space-y-3">
                  {promptOrder.map((prompt) => (
                    <div key={prompt}>
                      <p className="text-micro font-medium text-ink-faint mb-0.5">{prompt}</p>
                      <p className="text-sm text-ink whitespace-pre-wrap">{responses[prompt]}</p>
                    </div>
                  ))}
                  {sub.description && (
                    <div>
                      <p className="text-micro font-medium text-ink-faint uppercase tracking-wide mb-1">Description</p>
                      <p className="text-sm text-ink">{sub.description}</p>
                    </div>
                  )}
                  {sub.links.length > 0 && (
                    <div>
                      <p className="text-micro font-medium text-ink-faint uppercase tracking-wide mb-1">Links</p>
                      <div className="space-y-1">
                        {sub.links.map((link, i) => (
                          <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-ink hover:text-ink">
                            <ExternalLink size={12} className="shrink-0" />
                            {link.label || link.url}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {sub.files.length > 0 && (
                    <div>
                      <p className="text-micro font-medium text-ink-faint uppercase tracking-wide mb-1">Files</p>
                      <div className="space-y-1">
                        {sub.files.map((file, i) => (
                          <a key={i} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-ink hover:text-ink">
                            <FileText size={12} className="shrink-0" />
                            {file.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Feedback input */}
                  <div className="pt-2 border-t border-rule-soft">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={feedbackText[sub.id] ?? ""}
                        onChange={(e) => setFeedbackText((prev) => ({ ...prev, [sub.id]: e.target.value }))}
                        placeholder="Leave feedback..."
                        className={`${fieldInput} flex-1`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendFeedback(sub.id);
                          }
                        }}
                      />
                      <button
                        onClick={() => handleSendFeedback(sub.id)}
                        disabled={!feedbackText[sub.id]?.trim() || sendingFeedback === sub.id}
                        className="inline-flex items-center gap-1 bg-ink px-3 py-2 text-xs font-medium text-white hover:bg-ink/90 disabled:opacity-50 transition-colors"
                      >
                        {sendingFeedback === sub.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      </button>
                    </div>
                  </div>
                </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
