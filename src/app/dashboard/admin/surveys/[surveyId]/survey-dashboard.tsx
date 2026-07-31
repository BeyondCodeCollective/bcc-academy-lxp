"use client";

import { useMemo, useState } from "react";
import { Download } from "@phosphor-icons/react";
import type { SurveyQuestion } from "@/components/survey-fields";
import type { BCCSurveyResponse } from "../../actions";
import { aggregateDualLikert, aggregateLikertMeans } from "@/lib/surveys/aggregate";
import { LikertDiverging, type LikertRow } from "@/components/stats/likert-diverging";
import { PageHeader, Section } from "@/components/page-header";
import { buttonClass, fieldInput } from "@/components/ui";
import { getApplicationFileUrl } from "../../actions-misc";

interface Props {
  surveyId: string;
  surveyTitle: string;
  schema: SurveyQuestion[];
  responses: BCCSurveyResponse[];
  programs: { slug: string; name: string }[];
  /**
   * "standalone" renders a full editorial header (eyebrow + h1).
   * "embedded" drops the header, so a parent (e.g. the master-detail
   *  ledger view) can supply its own.
   */
  chrome?: "standalone" | "embedded";
}

// Neutral-only data palette derived from the cream surface tokens. No
// vermillion, no blue, no AI-gradient. Active values render in warm charcoal,
// inactive in a warm-tinted neutral so the bars sit on cream without looking
// sterile.
const INK = "var(--ink)";
const INK_DIM = "#d1d1d6";

export function SurveyDashboard({
  surveyId,
  surveyTitle,
  schema,
  responses,
  programs,
  chrome = "standalone",
}: Props) {
  const [filter, setFilter] = useState<string>("all");

  const programsWithData = useMemo(
    () =>
      programs.filter((p) => responses.some((r) => r.program_slug === p.slug)),
    [programs, responses],
  );

  const visible = useMemo(
    () =>
      filter === "all"
        ? responses
        : responses.filter((r) => r.program_slug === filter),
    [filter, responses],
  );

  const total = visible.length;

  function downloadCsv() {
    if (visible.length === 0) return;
    const allKeys = new Set<string>();
    visible.forEach((r) => Object.keys(r.responses).forEach((k) => allKeys.add(k)));
    const headers = ["Name", "Email", "Program", "Source", "Completed At", ...Array.from(allKeys)];
    const rows = visible.map((r) => [
      r.full_name,
      r.email,
      r.program_name,
      r.source,
      r.completed_at ?? "",
      ...Array.from(allKeys).map((k) => formatCsvValue(r.responses[k])),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${surveyId}-${filter}.csv`;
    a.click();
  }

  if (responses.length === 0) {
    return (
      <div className="space-y-6">
        {chrome === "standalone" && (
          <PageHeader eyebrow="Survey insights" title={surveyTitle} />
        )}
        <div className="panel px-6 py-12 text-center">
          <p className="text-sm font-medium text-ink">No responses yet</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs text-ink-soft">
            Responses will appear here once people start completing this survey.
          </p>
        </div>
      </div>
    );
  }

  // Application forms are all-text — render a person-first roster instead of
  // aggregated charts (which are useless when every question is open-ended).
  const isApplicationForm = schema.every((q) => q.type === "text");

  if (isApplicationForm) {
    return (
      <ApplicantRosterDashboard
        surveyTitle={surveyTitle}
        schema={schema}
        responses={responses}
        visible={visible}
        total={total}
        filter={filter}
        programs={programs}
        programsWithData={programsWithData}
        chrome={chrome}
        onFilterChange={setFilter}
        onDownloadCsv={downloadCsv}
      />
    );
  }

  // Group questions by type for layout
  const radioQs = schema.filter((q) => q.type === "radio");
  const multiSelectQs = schema.filter((q) => q.type === "multi-select");
  const likertQs = schema.filter((q) => q.type === "likert");
  const dualLikertQs = schema.filter((q) => q.type === "dual-likert");
  const textQs = schema.filter((q) => q.type === "text");
  const fileQs = schema.filter((q) => q.type === "file");

  return (
    <div className="space-y-10">
      {/* Shared PageHeader — same title treatment as every other admin page,
          instead of the one-off h2 + hand-rolled eyebrow this page carried. */}
      <PageHeader
        eyebrow={chrome === "standalone" ? "Survey insights" : undefined}
        title={surveyTitle}
        subtitle={`${total} response${total === 1 ? "" : "s"}${
          filter !== "all"
            ? ` · ${programs.find((p) => p.slug === filter)?.name ?? filter}`
            : ""
        }`}
        actions={
          <>
            {programsWithData.length > 1 && (
              <div className="flex gap-1">
                <FilterPill
                  label={`All (${responses.length})`}
                  active={filter === "all"}
                  onClick={() => setFilter("all")}
                />
                {programsWithData.map((p) => {
                  const count = responses.filter((r) => r.program_slug === p.slug).length;
                  return (
                    <FilterPill
                      key={p.slug}
                      label={`${p.name} (${count})`}
                      active={filter === p.slug}
                      onClick={() => setFilter(p.slug)}
                    />
                  );
                })}
              </div>
            )}
            {/* When embedded in Survey Insights, the parent already renders the
                authoritative server-side "Export CSV" (which strips internal
                _-fields and applies the student-record backfill). Showing this
                client-side CSV too gave two buttons and leaked internal columns
                like _cohort_track, so it only renders standalone. */}
            {chrome !== "embedded" && (
              <button
                type="button"
                onClick={downloadCsv}
                disabled={total === 0}
                className={buttonClass("secondary", "sm")}
              >
                <Download size={13} />
                CSV
              </button>
            )}
          </>
        }
      />

      {/* Demographics (radio) */}
      {radioQs.length > 0 && (
        <Section label="Single-choice answers" count={radioQs.length}>
          <div className="panel grid gap-x-10 gap-y-8 p-5 md:grid-cols-2">
            {radioQs.map((q) => (
              <RadioBlock key={q.id} question={q} visible={visible} />
            ))}
          </div>
        </Section>
      )}

      {/* Multi-select */}
      {multiSelectQs.length > 0 && (
        <Section label="Multi-select answers" count={multiSelectQs.length}>
          <div className="panel grid gap-x-10 gap-y-8 p-5 md:grid-cols-2">
            {multiSelectQs.map((q) => (
              <MultiSelectBlock key={q.id} question={q} visible={visible} />
            ))}
          </div>
        </Section>
      )}

      {/* Likert */}
      {likertQs.length > 0 && (
        <Section label="Rating scales" count={likertQs.length}>
          <div className="panel space-y-8 p-5">
            {likertQs.map((q) => (
              <LikertBlock key={q.id} question={q} visible={visible} />
            ))}
          </div>
        </Section>
      )}

      {/* Dual-likert */}
      {dualLikertQs.length > 0 && (
        <Section label="Before → after" count={dualLikertQs.length}>
          <div className="panel space-y-8 p-5">
            {dualLikertQs.map((q) => (
              <DualLikertBlock key={q.id} question={q} visible={visible} />
            ))}
          </div>
        </Section>
      )}

      {/* Attachments — without this section a `file` question renders nowhere,
         and an uploaded resume would be unreachable from the admin. */}
      {fileQs.length > 0 && (
        <Section label="Attachments" count={fileQs.length}>
          <div className="panel divide-y divide-rule-soft px-5">
            {fileQs.map((q) => (
              <FileBlock key={q.id} question={q} visible={visible} />
            ))}
          </div>
        </Section>
      )}

      {/* Free text */}
      {textQs.length > 0 && (
        <Section label="Free text" count={textQs.length}>
          <div className="panel divide-y divide-rule-soft px-5">
            {textQs.map((q) => (
              <TextBlock key={q.id} question={q} visible={visible} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ─── Applicant Roster ────────────────────────────────────────────────────────
// Used when every question in the schema is free-text (application forms).
// Pivots from question-first (chart per question) to person-first (card per
// applicant), since aggregating open-ended answers into charts is meaningless.

function ApplicantRosterDashboard({
  surveyTitle,
  schema,
  responses,
  visible,
  total,
  filter,
  programs,
  programsWithData,
  chrome,
  onFilterChange,
  onDownloadCsv,
}: {
  surveyTitle: string;
  schema: SurveyQuestion[];
  responses: BCCSurveyResponse[];
  visible: BCCSurveyResponse[];
  total: number;
  filter: string;
  programs: { slug: string; name: string }[];
  programsWithData: { slug: string; name: string }[];
  chrome: "standalone" | "embedded";
  onFilterChange: (f: string) => void;
  onDownloadCsv: () => void;
}) {
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Questions to show in the expanded view — skip `full_name` since it's
  // already the card heading (the response metadata `r.full_name` covers it).
  const answerQs = schema.filter((q) => q.id !== "full_name");

  const sorted = [...visible].sort((a, b) => {
    if (!a.completed_at && !b.completed_at) return 0;
    if (!a.completed_at) return 1;
    if (!b.completed_at) return -1;
    return b.completed_at.localeCompare(a.completed_at);
  });

  const filtered = search.trim()
    ? sorted.filter((r) =>
        `${r.full_name} ${r.email}`.toLowerCase().includes(search.toLowerCase())
      )
    : sorted;

  function initials(name: string) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  return (
    <div className="space-y-8">
      {/* Same shared header as the chart view — these two modes of one page
          used to render two different title treatments. */}
      <PageHeader
        eyebrow={chrome === "standalone" ? "Applications" : undefined}
        title={surveyTitle}
        subtitle={`${total} applicant${total === 1 ? "" : "s"}${
          filter !== "all"
            ? ` · ${programs.find((p) => p.slug === filter)?.name ?? filter}`
            : ""
        }`}
        actions={
          <>
            {programsWithData.length > 1 && (
              <div className="flex gap-1">
                <FilterPill
                  label={`All (${responses.length})`}
                  active={filter === "all"}
                  onClick={() => onFilterChange("all")}
                />
                {programsWithData.map((p) => {
                  const count = responses.filter((r) => r.program_slug === p.slug).length;
                  return (
                    <FilterPill
                      key={p.slug}
                      label={`${p.name} (${count})`}
                      active={filter === p.slug}
                      onClick={() => onFilterChange(p.slug)}
                    />
                  );
                })}
              </div>
            )}
            {/* Hidden when embedded — Survey Insights renders the authoritative
                server-side Export CSV above; two buttons leaked internal columns. */}
            {chrome !== "embedded" && (
              <button
                type="button"
                onClick={onDownloadCsv}
                disabled={total === 0}
                className={buttonClass("secondary", "sm")}
              >
                <Download size={13} />
                CSV
              </button>
            )}
          </>
        }
      />

      {/* Search */}
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or email…"
        className={`${fieldInput} max-w-sm`}
      />

      {/* Roster */}
      <div className="panel divide-y divide-rule-soft overflow-hidden">
        {filtered.length === 0 && (
          <p className="p-6 text-sm text-ink-soft">No applicants match your search.</p>
        )}
        {filtered.map((r) => {
          const key = r.email || r.full_name;
          const isOpen = expandedEmail === key;
          const date = r.completed_at
            ? new Date(r.completed_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : null;

          return (
            <div key={key}>
              <button
                type="button"
                onClick={() => setExpandedEmail(isOpen ? null : key)}
                className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-paper-tint-soft transition-colors"
              >
                {/* Initials avatar */}
                <div
                  className="shrink-0 h-9 w-9 rounded-full bg-paper-tint flex items-center justify-center text-micro font-semibold text-ink-soft select-none"
                  aria-hidden
                >
                  {initials(r.full_name || r.email)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">
                    {r.full_name || "—"}
                  </p>
                  <p className="text-micro text-ink-faint truncate">{r.email}</p>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  {date && (
                    <span className="text-micro text-ink-faint tabular-nums hidden sm:block">
                      {date}
                    </span>
                  )}
                  <span className={`text-ink-faint transition-transform inline-block text-xs ${isOpen ? "rotate-180" : ""}`}>
                    ▾
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-rule-soft bg-paper-tint-soft px-4 sm:px-6 py-5 space-y-6">
                  {answerQs.map((q) => {
                    const val = r.responses[q.id];
                    const text = typeof val === "string" ? val.trim() : "";
                    return (
                      <div key={q.id}>
                        <p className="text-micro font-semibold uppercase tracking-[0.16em] text-ink-faint mb-1">
                          {q.label}
                        </p>
                        {text ? (
                          <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
                            {text}
                          </p>
                        ) : (
                          <p className="text-xs text-ink-faint italic">No answer</p>
                        )}
                      </div>
                    );
                  })}
                  {date && (
                    <p className="text-micro text-ink-faint pt-2 border-t border-rule-soft">
                      Submitted {date}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1 text-micro font-medium tabular-nums transition-colors ${
        active
          ? "bg-ink text-white"
          : "bg-transparent text-ink-soft hover:bg-paper-tint"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Block renderers ────────────────────────────────────────────────────────

function RadioBlock({
  question,
  visible,
}: {
  question: Extract<SurveyQuestion, { type: "radio" }>;
  visible: BCCSurveyResponse[];
}) {
  const counts = new Map<string, number>();
  let answered = 0;
  for (const r of visible) {
    const v = r.responses[question.id];
    if (typeof v === "string" && v.length > 0) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
      answered++;
    }
  }
  const max = Math.max(1, ...Array.from(counts.values()));

  return (
    <div>
      <p className="text-sm font-medium text-ink leading-snug">
        {question.label}
      </p>
      <p className="text-micro text-ink-faint mt-1 tabular-nums">
        {answered} answered
      </p>
      <div className="mt-4 space-y-2">
        {question.options.map((opt) => {
          const count = counts.get(opt) ?? 0;
          const pct = answered === 0 ? 0 : Math.round((count / answered) * 100);
          return (
            <div key={opt}>
              <div className="flex items-baseline gap-3 text-xs text-ink">
                <span className="flex-1 truncate">{opt}</span>
                <span className="text-ink-soft shrink-0 tabular-nums text-micro">
                  {count}
                  <span className="text-ink-faint"> · {pct}%</span>
                </span>
              </div>
              <div className="h-[3px] mt-1 rounded-lg bg-paper-tint overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${(count / max) * 100}%`,
                    backgroundColor: count > 0 ? INK : "transparent",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MultiSelectBlock({
  question,
  visible,
}: {
  question: Extract<SurveyQuestion, { type: "multi-select" }>;
  visible: BCCSurveyResponse[];
}) {
  const counts = new Map<string, number>();
  let answered = 0;
  for (const r of visible) {
    const v = r.responses[question.id];
    if (Array.isArray(v) && v.length > 0) {
      answered++;
      for (const item of v) {
        if (typeof item === "string") counts.set(item, (counts.get(item) ?? 0) + 1);
      }
    }
  }
  const max = Math.max(1, ...Array.from(counts.values()));

  return (
    <div>
      <p className="text-sm font-medium text-ink leading-snug">
        {question.label}
      </p>
      <p className="text-micro text-ink-faint mt-1 tabular-nums">
        {answered} answered
      </p>
      <div className="mt-4 space-y-2">
        {question.options.map((opt) => {
          const count = counts.get(opt) ?? 0;
          const pct = answered === 0 ? 0 : Math.round((count / answered) * 100);
          return (
            <div key={opt}>
              <div className="flex items-baseline gap-3 text-xs text-ink">
                <span className="flex-1 truncate">{opt}</span>
                <span className="text-ink-soft shrink-0 tabular-nums text-micro">
                  {count}
                  <span className="text-ink-faint"> · {pct}%</span>
                </span>
              </div>
              <div className="h-[3px] mt-1 rounded-lg bg-paper-tint overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${(count / max) * 100}%`,
                    backgroundColor: count > 0 ? INK : "transparent",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LikertBlock({
  question,
  visible,
}: {
  question: Extract<SurveyQuestion, { type: "likert" }>;
  visible: BCCSurveyResponse[];
}) {
  // Means come from the shared aggregator so this dashboard and the admin
  // Outcomes analytics never disagree on a number; the per-value counts are
  // histogram-only and stay local.
  const meanStats = aggregateLikertMeans(question, visible);

  const rows: LikertRow[] = question.statements.map((stmt, i) => {
    const counts = question.scale.map(() => 0);
    let n = 0;
    for (const r of visible) {
      const block = r.responses[question.id] as Record<string, unknown> | undefined;
      const v = block?.[stmt];
      if (typeof v === "string" && v.length > 0) {
        const idx = question.scale.indexOf(v);
        if (idx >= 0) {
          counts[idx] += 1;
          n += 1;
        }
      }
    }
    return { statement: stmt, counts, mean: meanStats[i].mean, n };
  });

  const answered = rows.filter((r) => r.n > 0);

  return (
    <div>
      <p className="text-sm font-medium text-ink leading-snug">{question.label}</p>
      <div className="mt-4">
        {answered.length === 0 ? (
          <p className="text-xs text-ink-faint italic">No answers.</p>
        ) : (
          <LikertDiverging
            rows={answered}
            scaleLow={question.scaleAnchors?.low ?? question.scale[0]}
            scaleHigh={
              question.scaleAnchors?.high ?? question.scale[question.scale.length - 1]
            }
          />
        )}
      </div>
    </div>
  );
}

function DualLikertBlock({
  question,
  visible,
}: {
  question: Extract<SurveyQuestion, { type: "dual-likert" }>;
  visible: BCCSurveyResponse[];
}) {
  const scaleMax = Number(question.scale[question.scale.length - 1]);

  return (
    <div>
      <p className="text-sm font-medium text-ink leading-snug">
        {question.label}
      </p>
      <p className="text-micro text-ink-faint mt-1">
        {question.beforeLabel}{" "}
        <span className="text-ink-faint">→</span>{" "}
        {question.nowLabel}
      </p>
      <div className="mt-5 space-y-4">
        {aggregateDualLikert(question, visible).map(({ statement: stmt, before: beforeMean, now: nowMean, delta, n }) => {
          const beforePct = (beforeMean / scaleMax) * 100;
          const nowPct = (nowMean / scaleMax) * 100;

          return (
            <div key={stmt} className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 items-baseline">
              <p className="text-xs text-ink leading-snug">{stmt}</p>
              {n > 0 ? (
                <p className="text-lg font-semibold text-ink shrink-0 tabular-nums whitespace-nowrap">
                  {beforeMean.toFixed(2)}
                  <span className="text-ink-faint mx-1.5 font-normal">→</span>
                  {nowMean.toFixed(2)}
                  <span
                    className={`ml-2 text-micro font-sans font-medium tabular-nums ${
                      delta >= 0 ? "text-ink" : "text-ink-faint"
                    }`}
                  >
                    {delta >= 0 ? "+" : ""}
                    {delta.toFixed(2)}
                  </span>
                </p>
              ) : (
                <span className="text-micro text-ink-faint">—</span>
              )}
              <div className="col-span-2 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-micro uppercase tracking-wider text-ink-faint w-12 shrink-0">
                    Before
                  </span>
                  <div className="flex-1 h-1.5 bg-paper-tint overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${beforePct}%`,
                        backgroundColor: INK_DIM,
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-micro uppercase tracking-wider text-ink-faint w-12 shrink-0">
                    Now
                  </span>
                  <div className="flex-1 h-1.5 bg-paper-tint overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${nowPct}%`,
                        backgroundColor: INK,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TextBlock({
  question,
  visible,
}: {
  question: Extract<SurveyQuestion, { type: "text" }>;
  visible: BCCSurveyResponse[];
}) {
  const [open, setOpen] = useState(false);
  const answers = visible
    .map((r) => ({
      name: r.full_name,
      val: r.responses[question.id],
    }))
    .filter((a) => typeof a.val === "string" && (a.val as string).trim().length > 0);

  // Divider comes from the panel's divide-y, so this row draws none of its own.
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-baseline justify-between gap-4 py-3.5 text-left hover:text-ink transition-colors"
      >
        <p className="text-xs text-ink leading-snug">
          {question.label}
        </p>
        <span className="text-micro text-ink-faint shrink-0 tabular-nums">
          {answers.length}
          <span className="ml-2 inline-block w-3 text-center">{open ? "−" : "+"}</span>
        </span>
      </button>
      {open && (
        <div className="pb-4 -mt-1 space-y-4">
          {answers.length === 0 && (
            <p className="text-xs text-ink-faint italic">No answers.</p>
          )}
          {answers.map((a, i) => (
            <div key={i} className="border-l border-rule pl-4">
              <p className="text-micro font-medium uppercase tracking-wider text-ink-faint">
                {a.name}
              </p>
              <p className="text-xs text-ink mt-1 leading-relaxed whitespace-pre-wrap">
                {String(a.val)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatCsvValue(val: unknown): string {
  if (Array.isArray(val)) return val.join("; ");
  if (val === true) return "Yes";
  if (val === false) return "No";
  if (typeof val === "object" && val !== null) {
    return Object.entries(val as Record<string, unknown>)
      .map(([k, v]) => {
        if (typeof v === "object" && v !== null) {
          const r = v as Record<string, string>;
          return `${k}: before ${r.before ?? ""} now ${r.now ?? ""}`;
        }
        return `${k}: ${String(v)}`;
      })
      .join("; ");
  }
  return String(val ?? "");
}

// One row per applicant who attached a file. The URL is fetched on click rather
// than rendered up front: signing every file on page load would mint dozens of
// live links for files nobody opens, and each one expires in five minutes
// anyway — so a pre-signed list would be mostly dead by the time it was used.
function FileBlock({
  question,
  visible,
}: {
  question: Extract<SurveyQuestion, { type: "file" }>;
  visible: BCCSurveyResponse[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const files = visible
    .map((r) => ({
      name: r.full_name,
      email: r.email,
      file: r.responses[question.id] as
        | { path?: string; name?: string; size?: number }
        | undefined,
    }))
    .filter((a) => !!a.file?.path);

  async function openFile(path: string) {
    setPending(path);
    setError(null);
    try {
      const res = await getApplicationFileUrl(path);
      if (res.ok) {
        window.open(res.url, "_blank", "noopener,noreferrer");
      } else {
        setError(res.error);
      }
    } catch {
      setError("Could not open that file.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-baseline justify-between gap-4 py-3.5 text-left hover:text-ink transition-colors"
      >
        <p className="text-xs text-ink leading-snug">{question.label}</p>
        <span className="text-micro text-ink-faint shrink-0 tabular-nums">
          {files.length}
          <span className="ml-2 inline-block w-3 text-center">{open ? "−" : "+"}</span>
        </span>
      </button>
      {open && (
        <div className="pb-4 -mt-1 space-y-2">
          {files.length === 0 && (
            <p className="text-xs text-ink-faint italic">Nobody attached a file.</p>
          )}
          {files.map((a, i) => (
            <div key={i} className="flex items-center gap-3 border-l border-rule pl-4">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs text-ink">{a.name}</span>
                <span className="block truncate text-micro text-ink-faint">
                  {a.file?.name}
                </span>
              </span>
              <button
                type="button"
                onClick={() => openFile(a.file!.path!)}
                disabled={pending === a.file!.path}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-rule px-2.5 py-1 text-micro font-medium text-ink transition-colors hover:bg-paper-tint-soft disabled:opacity-50"
              >
                <Download size={12} />
                {pending === a.file!.path ? "Opening…" : "Open"}
              </button>
            </div>
          ))}
          {error && (
            <p className="pl-4 text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
