"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listPublicSurveyResponses, createCohortAction } from "./actions";
import { CaretDown as ChevronDown, ArrowSquareOut as ExternalLink, Trash as Trash2, Download, CircleNotch as Loader2 } from "@phosphor-icons/react";
import { buttonClass, fieldInput } from "@/components/ui";
import { type CohortRow, trackLabel, type AdminTrackConfig } from "./admin-shared";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function PublicSurveyCard({
  title,
  responseCount,
  programSlug,
  surveyType,
  onExport,
  onDelete,
  onInvite,
  previewHref,
}: {
  title: string;
  responseCount: number;
  programSlug: string;
  surveyType: string;
  onExport: () => Promise<void>;
  onDelete: (email: string) => Promise<void>;
  onInvite: (email: string) => Promise<{ success: boolean; error?: string }>;
  previewHref: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [inviting, setInviting] = useState<string | null>(null);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [responses, setResponses] = useState<{ email: string; full_name: string; completedAt: string | null; invitedAt: string | null; responses: Record<string, unknown> }[]>([]);
  const loaded = useRef(false);

  async function loadResponses() {
    if (loaded.current) return;
    setLoading(true);
    try {
      const data = await listPublicSurveyResponses(programSlug, surveyType);
      setResponses(data.map((r) => ({ email: r.email, full_name: r.full_name, completedAt: r.completed_at, invitedAt: r.invited_at, responses: r.responses })));
      loaded.current = true;
    } finally {
      setLoading(false);
    }
  }

  async function handleExpand() {
    setExpanded((v) => !v);
    if (!expanded) loadResponses();
  }

  async function handleDelete(email: string) {
    setDeleting(email);
    try {
      await onDelete(email);
      setResponses((prev) => prev.filter((r) => r.email !== email));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="text-xs text-ink-faint mt-0.5">{responseCount} response{responseCount === 1 ? "" : "s"}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={previewHref}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass("secondary", "sm")}
        >
          <ExternalLink size={12} />
          Preview
        </a>
        <button
          type="button"
          onClick={async () => { try { await onExport(); } catch (e) { console.error("Export failed:", e); } }}
          className={buttonClass("secondary", "sm")}
        >
          <Download size={12} />
          Export CSV
        </button>
        {responseCount > 0 && (
          <button
            type="button"
            onClick={handleExpand}
            className={buttonClass("secondary", "sm")}
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <ChevronDown size={12} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />}
            {expanded ? "Hide" : "Responses"}
          </button>
        )}
      </div>
      {expanded && (
        <div className="mt-3 border-t border-rule-soft pt-3 space-y-1">
          {responses.length === 0 && !loading && (
            <p className="text-xs text-ink-faint px-2">No responses found.</p>
          )}
          {responses.map((r) => (
            <div key={r.email} className="border border-rule-soft overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-2 py-1.5 hover:bg-paper-tint-soft">
                <button
                  type="button"
                  onClick={() => setExpandedEmail(expandedEmail === r.email ? null : r.email)}
                  className="flex-1 text-left min-w-0"
                >
                  <p className="text-xs font-medium text-ink truncate">{r.full_name}</p>
                  <p className="text-micro text-ink-faint truncate">{r.email}{r.completedAt ? ` · ${new Date(r.completedAt).toLocaleDateString()}` : ""}</p>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  {r.invitedAt ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-micro font-medium text-green-700" title={`Invited ${new Date(r.invitedAt).toLocaleDateString()}`}>
                      ✓ Invited
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        setInviting(r.email);
                        const result = await onInvite(r.email);
                        if (result.success) {
                          setResponses((prev) => prev.map((resp) =>
                            resp.email === r.email ? { ...resp, invitedAt: new Date().toISOString() } : resp
                          ));
                        }
                        setInviting(null);
                      }}
                      disabled={inviting === r.email}
                      className="inline-flex items-center gap-1 bg-blue-50 px-2 py-1 text-micro font-medium text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                      title="Accept & send invite email"
                    >
                      {inviting === r.email ? <Loader2 size={11} className="animate-spin" /> : "Send Invite"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setExpandedEmail(expandedEmail === r.email ? null : r.email)}
                    className="rounded p-1 text-ink-faint hover:text-ink-soft hover:bg-paper-tint transition-colors"
                    title={expandedEmail === r.email ? "Hide answers" : "View answers"}
                  >
                    <ChevronDown size={13} className={`transition-transform ${expandedEmail === r.email ? "rotate-180" : ""}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(r.email)}
                    disabled={deleting === r.email}
                    className="rounded p-1 text-ink-faint hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Delete response"
                  >
                    {deleting === r.email ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
              {expandedEmail === r.email && (
                <div className="border-t border-rule-soft bg-neutral-50 px-3 py-2 space-y-1.5">
                  {Object.entries(r.responses)
                    .filter(([, val]) => val !== null && val !== undefined && val !== "")
                    .map(([key, val]) => (
                      <div key={key}>
                        <p className="text-micro font-semibold uppercase tracking-wide text-ink-faint">
                          {key.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-ink mt-0.5">
                          {formatResponseValue(val)}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
export function formatResponseValue(val: unknown): string {
  if (Array.isArray(val)) return val.join(", ");
  if (val === true) return "Yes";
  if (val === false) return "No";
  if (typeof val === "object" && val !== null) {
    // dual-likert: { "Statement text": { before: "3", now: "4" } }
    return Object.entries(val as Record<string, unknown>)
      .map(([stmt, rating]) => {
        if (typeof rating === "object" && rating !== null) {
          const r = rating as Record<string, string>;
          return `${stmt}: before ${r.before ?? "—"} → now ${r.now ?? "—"}`;
        }
        return `${stmt}: ${String(rating)}`;
      })
      .join(" · ");
  }
  return String(val);
}
// ─── Survey Links Panel ───────────────────────────────────────────────────────

export const PUBLIC_SURVEY_LINKS = [
  { id: "bcc-learner-intake",       label: "BCC Learner Intake",                   path: "/survey/bcc-learner-intake" },
  { id: "bcc-workshop",             label: "Workshop Survey",                       path: "/survey/bcc-workshop" },
  { id: "pre-survey-spring-2026",   label: "Pre-Survey (Spring 2026)",             path: "/survey/pre-survey-spring-2026" },
  { id: "post-survey-spring-2026",  label: "Post-Survey (Spring 2026)",            path: "/survey/post-survey-spring-2026" },
  { id: "network-plus-post",        label: "Network+ End-of-Cohort Survey",        path: "/survey/network-plus-post" },
  { id: "security-plus-application",label: "Security+ Application",               path: "/apply/security-plus" },
];
export function GroupsPanel({
  cohorts,
  tracks,
}: {
  cohorts: CohortRow[];
  tracks: AdminTrackConfig[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [trackSlug, setTrackSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [totalWeeks, setTotalWeeks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trackSlug || !displayName.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createCohortAction({
        track_slug: trackSlug,
        display_name: displayName.trim(),
        start_date: startDate || null,
        total_weeks: totalWeeks ? parseInt(totalWeeks, 10) : null,
      });
      setShowForm(false);
      setTrackSlug("");
      setDisplayName("");
      setStartDate("");
      setTotalWeeks("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create group");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-micro font-semibold uppercase tracking-[0.16em] text-ink-faint">
          Groups
        </h2>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-xs text-ink-faint hover:text-ink-soft transition-colors"
          >
            + New Group
          </button>
        )}
      </div>

      {cohorts.length === 0 && !showForm && (
        <p className="text-sm text-ink-faint">
          No groups yet. Create one to organize students by track and cohort.
        </p>
      )}

      {cohorts.length > 0 && (
        <div className="divide-y divide-rule overflow-hidden panel">
          {cohorts.map((c) => {
            const dest = c.track_slug
              ? `/dashboard/admin?tab=${c.track_slug}&view=students`
              : `/dashboard/admin?tab=students`;
            return (
              <Link
                key={c.id}
                href={dest}
                className="group flex items-center gap-4 px-4 py-3.5 hover:bg-paper-tint-soft transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink truncate">
                    {c.display_name || c.name}
                  </p>
                  {c.track_slug && (
                    <p className="text-xs text-ink-faint truncate">
                      {trackLabel(c.track_slug)}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-ink-faint group-hover:text-ink-soft transition-colors">→</span>
              </Link>
            );
          })}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="panel p-4 space-y-3"
        >
          <p className="text-sm font-semibold text-ink">New group</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-ink-soft">Track</label>
              <div className="relative mt-1">
                <select
                  required
                  value={trackSlug}
                  onChange={(e) => setTrackSlug(e.target.value)}
                  className="w-full appearance-none border border-rule bg-neutral-50 pl-3 pr-7 py-2 text-sm text-ink focus:border-ink-faint"
                >
                  <option value="">— select track —</option>
                  {tracks.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.shortName || t.name}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint">▾</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-soft">Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Security+ · Cohort 1"
                className={`${fieldInput} mt-1`}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-soft">Start date (optional)</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`${fieldInput} mt-1`}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-soft">Duration in weeks (optional)</label>
              <input
                type="number"
                min="1"
                value={totalWeeks}
                onChange={(e) => setTotalWeeks(e.target.value)}
                placeholder="e.g. 10"
                className={`${fieldInput} mt-1`}
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className={buttonClass("secondary", "sm")}
            >
              {submitting ? "Creating…" : "Create group"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(null); }}
              className="text-xs text-ink-faint hover:text-ink-soft transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

    </div>
  );
}
export function SurveyLinksPanel({ surveyConfigs }: { surveyConfigs: { id: string; title: string }[] }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (path: string, id: string) => {
    const url = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const authLinks = surveyConfigs.map((s) => ({
    id: s.id,
    label: s.title,
    path: `/dashboard/survey/${s.id}`,
    auth: true,
  }));

  const allLinks = [
    ...PUBLIC_SURVEY_LINKS.map((s) => ({ ...s, auth: false })),
    ...authLinks,
  ];

  return (
    <div className="panel">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-paper-tint-soft transition-colors"
      >
        <span className="text-sm font-semibold text-ink">
          {allLinks.length} survey {allLinks.length === 1 ? "link" : "links"}
        </span>
        <span className="text-ink-faint text-xs">{open ? "↑ collapse" : "↓ expand"}</span>
      </button>
      {open && (
        <div className="divide-y divide-rule border-t border-rule">
          {allLinks.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink truncate">{s.label}</p>
                <p className="text-micro text-ink-faint font-mono truncate">
                  {typeof window !== "undefined" ? `${window.location.origin}${s.path}` : s.path}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {s.auth && (
                  <span className="text-micro font-medium uppercase tracking-wide text-ink-faint border border-rule px-1.5 py-0.5">
                    login required
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => copy(s.path, s.id)}
                  className={buttonClass("secondary", "sm")}
                >
                  {copied === s.id ? "✓ Copied" : "Copy link"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
