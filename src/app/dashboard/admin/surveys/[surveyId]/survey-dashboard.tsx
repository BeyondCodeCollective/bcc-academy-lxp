"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import type { SurveyQuestion } from "@/components/survey-fields";
import type { BCCSurveyResponse } from "../../actions";

interface Props {
  surveyId: string;
  surveyTitle: string;
  schema: SurveyQuestion[];
  responses: BCCSurveyResponse[];
  programs: { slug: string; name: string }[];
}

const ACCENT = "#E54D2E";
const CHARCOAL = "#1a1a1a";

export function SurveyDashboard({
  surveyId,
  surveyTitle,
  schema,
  responses,
  programs,
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
      <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
        <p className="text-sm text-neutral-500">No responses yet for this survey.</p>
      </div>
    );
  }

  // Group questions by type for layout
  const radioQs = schema.filter((q) => q.type === "radio");
  const multiSelectQs = schema.filter((q) => q.type === "multi-select");
  const likertQs = schema.filter((q) => q.type === "likert");
  const dualLikertQs = schema.filter((q) => q.type === "dual-likert");
  const textQs = schema.filter((q) => q.type === "text");

  return (
    <div className="space-y-6">
      {/* Header strip */}
      <div className="rounded-xl bg-[#1a1a1a] text-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              {surveyTitle}
            </p>
            <p className="text-3xl font-bold mt-1">{total}</p>
            <p className="text-xs text-neutral-400">
              response{total === 1 ? "" : "s"}
              {filter !== "all" && (
                <> · {programs.find((p) => p.slug === filter)?.name ?? filter}</>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={total === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-medium text-neutral-900 hover:bg-neutral-100 transition-colors disabled:opacity-40"
          >
            <Download size={13} />
            Download CSV
          </button>
        </div>

        {programsWithData.length > 1 && (
          <div className="flex gap-1.5 flex-wrap mt-4">
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
      </div>

      {/* Demographics */}
      {radioQs.length > 0 && (
        <Section title="Single-choice answers">
          <div className="grid gap-3 md:grid-cols-2">
            {radioQs.map((q) => (
              <RadioBlock key={q.id} question={q} visible={visible} />
            ))}
          </div>
        </Section>
      )}

      {/* Multi-select */}
      {multiSelectQs.length > 0 && (
        <Section title="Multi-select answers">
          <div className="grid gap-3 md:grid-cols-2">
            {multiSelectQs.map((q) => (
              <MultiSelectBlock key={q.id} question={q} visible={visible} />
            ))}
          </div>
        </Section>
      )}

      {/* Likert */}
      {likertQs.length > 0 && (
        <Section title="Rating scales">
          <div className="space-y-3">
            {likertQs.map((q) => (
              <LikertBlock key={q.id} question={q} visible={visible} />
            ))}
          </div>
        </Section>
      )}

      {/* Dual-likert (before/after) */}
      {dualLikertQs.length > 0 && (
        <Section title="Before → After">
          <div className="space-y-3">
            {dualLikertQs.map((q) => (
              <DualLikertBlock key={q.id} question={q} visible={visible} />
            ))}
          </div>
        </Section>
      )}

      {/* Free text */}
      {textQs.length > 0 && (
        <Section title="Free text">
          <div className="space-y-2">
            {textQs.map((q) => (
              <TextBlock key={q.id} question={q} visible={visible} />
            ))}
          </div>
        </Section>
      )}
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
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
        active
          ? "bg-white text-[#1a1a1a]"
          : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
      }`}
    >
      {label}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">
        {title}
      </h2>
      {children}
    </section>
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
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-sm font-semibold text-neutral-900 leading-snug">
        {question.label}
      </p>
      <p className="text-[11px] text-neutral-400 mt-0.5">{answered} answered</p>
      <div className="mt-3 space-y-1.5">
        {question.options.map((opt) => {
          const count = counts.get(opt) ?? 0;
          const pct = answered === 0 ? 0 : Math.round((count / answered) * 100);
          return (
            <div key={opt}>
              <div className="flex justify-between gap-2 text-[11px] text-neutral-700">
                <span className="truncate">{opt}</span>
                <span className="text-neutral-500 shrink-0 tabular-nums">
                  {count} · {pct}%
                </span>
              </div>
              <div className="h-1.5 mt-0.5 rounded-full bg-neutral-100 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(count / max) * 100}%`,
                    backgroundColor: count > 0 ? ACCENT : "transparent",
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
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-sm font-semibold text-neutral-900 leading-snug">
        {question.label}
      </p>
      <p className="text-[11px] text-neutral-400 mt-0.5">{answered} answered</p>
      <div className="mt-3 space-y-1.5">
        {question.options.map((opt) => {
          const count = counts.get(opt) ?? 0;
          const pct = answered === 0 ? 0 : Math.round((count / answered) * 100);
          return (
            <div key={opt}>
              <div className="flex justify-between gap-2 text-[11px] text-neutral-700">
                <span className="truncate">{opt}</span>
                <span className="text-neutral-500 shrink-0 tabular-nums">
                  {count} · {pct}%
                </span>
              </div>
              <div className="h-1.5 mt-0.5 rounded-full bg-neutral-100 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(count / max) * 100}%`,
                    backgroundColor: count > 0 ? ACCENT : "transparent",
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
  const scaleNums = question.scale.map((s) => Number(s));
  const isNumericAscending = scaleNums.every((n) => !Number.isNaN(n));

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-sm font-semibold text-neutral-900 leading-snug">
        {question.label}
      </p>
      {question.scaleAnchors && (
        <p className="text-[11px] text-neutral-400 mt-0.5">
          {question.scaleAnchors.low} → {question.scaleAnchors.high}
        </p>
      )}
      <div className="mt-3 space-y-3">
        {question.statements.map((stmt) => {
          // Likert answers stored as { [statement]: scaleValue }
          const counts = new Map<string, number>();
          let total = 0;
          let sum = 0;
          for (const r of visible) {
            const block = r.responses[question.id] as Record<string, unknown> | undefined;
            const v = block?.[stmt];
            if (typeof v === "string" && v.length > 0) {
              counts.set(v, (counts.get(v) ?? 0) + 1);
              total++;
              const n = Number(v);
              if (!Number.isNaN(n)) sum += n;
            }
          }
          const mean = total === 0 ? 0 : sum / total;

          return (
            <div key={stmt}>
              <div className="flex justify-between gap-2 items-baseline">
                <p className="text-xs text-neutral-700 leading-snug">{stmt}</p>
                {isNumericAscending && total > 0 && (
                  <p className="text-xs font-semibold text-neutral-900 shrink-0 tabular-nums">
                    {mean.toFixed(2)}
                    <span className="text-[10px] text-neutral-400 font-normal ml-1">
                      avg
                    </span>
                  </p>
                )}
              </div>
              <div className="flex gap-1 mt-1">
                {question.scale.map((s) => {
                  const c = counts.get(s) ?? 0;
                  const pct = total === 0 ? 0 : Math.round((c / total) * 100);
                  return (
                    <div key={s} className="flex-1">
                      <div className="h-6 rounded bg-neutral-100 overflow-hidden flex items-end">
                        <div
                          className="w-full"
                          style={{
                            height: `${pct}%`,
                            backgroundColor: c > 0 ? CHARCOAL : "transparent",
                          }}
                        />
                      </div>
                      <p className="text-[9px] text-center text-neutral-400 mt-0.5 tabular-nums">
                        {s}
                      </p>
                      <p className="text-[9px] text-center text-neutral-500 tabular-nums">
                        {c}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
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
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-sm font-semibold text-neutral-900 leading-snug">
        {question.label}
      </p>
      <p className="text-[11px] text-neutral-400 mt-0.5">
        {question.beforeLabel} → {question.nowLabel}
      </p>
      <div className="mt-3 space-y-2.5">
        {question.statements.map((stmt) => {
          let beforeSum = 0;
          let beforeN = 0;
          let nowSum = 0;
          let nowN = 0;
          for (const r of visible) {
            const block = r.responses[question.id] as
              | Record<string, { before?: string; now?: string }>
              | undefined;
            const pair = block?.[stmt];
            if (pair) {
              const b = Number(pair.before);
              if (!Number.isNaN(b)) {
                beforeSum += b;
                beforeN++;
              }
              const n = Number(pair.now);
              if (!Number.isNaN(n)) {
                nowSum += n;
                nowN++;
              }
            }
          }
          const beforeMean = beforeN === 0 ? 0 : beforeSum / beforeN;
          const nowMean = nowN === 0 ? 0 : nowSum / nowN;
          const delta = nowMean - beforeMean;
          const beforePct = (beforeMean / scaleMax) * 100;
          const nowPct = (nowMean / scaleMax) * 100;

          return (
            <div key={stmt}>
              <div className="flex justify-between gap-2 items-baseline mb-1">
                <p className="text-xs text-neutral-700 leading-snug">{stmt}</p>
                {beforeN > 0 && nowN > 0 && (
                  <p className="text-xs font-semibold shrink-0 tabular-nums">
                    <span className="text-neutral-400">{beforeMean.toFixed(2)}</span>
                    <span className="mx-1 text-neutral-400">→</span>
                    <span className="text-neutral-900">{nowMean.toFixed(2)}</span>
                    <span
                      className="ml-2 px-1.5 py-0.5 rounded text-white text-[10px]"
                      style={{
                        backgroundColor: delta >= 0 ? ACCENT : "#888",
                      }}
                    >
                      {delta >= 0 ? "+" : ""}
                      {delta.toFixed(2)}
                    </span>
                  </p>
                )}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-neutral-400 w-12 shrink-0 uppercase">
                    Before
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${beforePct}%`,
                        backgroundColor: "#bbb",
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-neutral-400 w-12 shrink-0 uppercase">
                    Now
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${nowPct}%`,
                        backgroundColor: ACCENT,
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

  return (
    <div className="rounded-xl border border-neutral-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-neutral-50 transition-colors"
      >
        <p className="text-sm font-semibold text-neutral-900 leading-snug">
          {question.label}
        </p>
        <span className="text-[11px] text-neutral-400 shrink-0 tabular-nums">
          {answers.length} {open ? "▴" : "▾"}
        </span>
      </button>
      {open && (
        <div className="border-t border-neutral-100 divide-y divide-neutral-100">
          {answers.length === 0 && (
            <p className="px-4 py-3 text-xs text-neutral-400">No answers.</p>
          )}
          {answers.map((a, i) => (
            <div key={i} className="px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                {a.name}
              </p>
              <p className="text-xs text-neutral-700 mt-1 whitespace-pre-wrap">
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
