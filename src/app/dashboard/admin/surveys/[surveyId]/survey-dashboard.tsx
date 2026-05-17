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
const INK = "#1F1B16";
const INK_DIM = "#D8D2C4";

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
      <p className="text-sm text-[#6B6258]">No responses yet for this survey.</p>
    );
  }

  // Group questions by type for layout
  const radioQs = schema.filter((q) => q.type === "radio");
  const multiSelectQs = schema.filter((q) => q.type === "multi-select");
  const likertQs = schema.filter((q) => q.type === "likert");
  const dualLikertQs = schema.filter((q) => q.type === "dual-likert");
  const textQs = schema.filter((q) => q.type === "text");

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-[#E7E1D2]">
        <div>
          {chrome === "standalone" && (
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#6B6258] mb-2">
              Survey Insights
            </p>
          )}
          <h2 className="text-3xl font-bold text-[#1F1B16] tracking-tight">
            {surveyTitle}
          </h2>
          <p className="text-sm text-[#6B6258] mt-2 tabular-nums">
            {total} response{total === 1 ? "" : "s"}
            {filter !== "all" && (
              <> · {programs.find((p) => p.slug === filter)?.name ?? filter}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <button
            type="button"
            onClick={downloadCsv}
            disabled={total === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E7E1D2] bg-[#FBF9F4] px-3 py-1.5 text-xs font-medium text-[#1F1B16] hover:bg-[#F2EDE0] transition-colors disabled:opacity-40"
          >
            <Download size={13} />
            CSV
          </button>
        </div>
      </header>

      {/* Demographics (radio) */}
      {radioQs.length > 0 && (
        <Section title="Single-choice answers">
          <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
            {radioQs.map((q) => (
              <RadioBlock key={q.id} question={q} visible={visible} />
            ))}
          </div>
        </Section>
      )}

      {/* Multi-select */}
      {multiSelectQs.length > 0 && (
        <Section title="Multi-select answers">
          <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
            {multiSelectQs.map((q) => (
              <MultiSelectBlock key={q.id} question={q} visible={visible} />
            ))}
          </div>
        </Section>
      )}

      {/* Likert */}
      {likertQs.length > 0 && (
        <Section title="Rating scales">
          <div className="space-y-8">
            {likertQs.map((q) => (
              <LikertBlock key={q.id} question={q} visible={visible} />
            ))}
          </div>
        </Section>
      )}

      {/* Dual-likert */}
      {dualLikertQs.length > 0 && (
        <Section title="Before → after">
          <div className="space-y-8">
            {dualLikertQs.map((q) => (
              <DualLikertBlock key={q.id} question={q} visible={visible} />
            ))}
          </div>
        </Section>
      )}

      {/* Free text */}
      {textQs.length > 0 && (
        <Section title="Free text">
          <div className="space-y-1">
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
      className={`rounded-md px-2.5 py-1 text-[11px] font-medium tabular-nums transition-colors ${
        active
          ? "bg-[#1F1B16] text-[#F7F4EE]"
          : "bg-transparent text-[#6B6258] hover:bg-[#F2EDE0]"
      }`}
    >
      {label}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#9B9388] mb-4">
        {title}
      </h3>
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
    <div>
      <p className="text-sm font-medium text-[#1F1B16] leading-snug">
        {question.label}
      </p>
      <p className="text-[11px] text-[#9B9388] mt-1 tabular-nums">
        {answered} answered
      </p>
      <div className="mt-4 space-y-2">
        {question.options.map((opt) => {
          const count = counts.get(opt) ?? 0;
          const pct = answered === 0 ? 0 : Math.round((count / answered) * 100);
          return (
            <div key={opt}>
              <div className="flex items-baseline gap-3 text-[12px] text-[#1F1B16]">
                <span className="flex-1 truncate">{opt}</span>
                <span className="text-[#6B6258] shrink-0 tabular-nums text-[11px]">
                  {count}
                  <span className="text-[#9B9388]"> · {pct}%</span>
                </span>
              </div>
              <div className="h-[3px] mt-1 rounded-sm bg-[#EFEAE0] overflow-hidden">
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
      <p className="text-sm font-medium text-[#1F1B16] leading-snug">
        {question.label}
      </p>
      <p className="text-[11px] text-[#9B9388] mt-1 tabular-nums">
        {answered} answered
      </p>
      <div className="mt-4 space-y-2">
        {question.options.map((opt) => {
          const count = counts.get(opt) ?? 0;
          const pct = answered === 0 ? 0 : Math.round((count / answered) * 100);
          return (
            <div key={opt}>
              <div className="flex items-baseline gap-3 text-[12px] text-[#1F1B16]">
                <span className="flex-1 truncate">{opt}</span>
                <span className="text-[#6B6258] shrink-0 tabular-nums text-[11px]">
                  {count}
                  <span className="text-[#9B9388]"> · {pct}%</span>
                </span>
              </div>
              <div className="h-[3px] mt-1 rounded-sm bg-[#EFEAE0] overflow-hidden">
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
  const scaleNums = question.scale.map((s) => Number(s));
  const isNumericAscending = scaleNums.every((n) => !Number.isNaN(n));

  return (
    <div>
      <p className="text-sm font-medium text-[#1F1B16] leading-snug">
        {question.label}
      </p>
      {question.scaleAnchors && (
        <p className="text-[11px] text-[#9B9388] mt-1">
          {question.scaleAnchors.low}{" "}
          <span className="text-[#D8D2C4]">→</span>{" "}
          {question.scaleAnchors.high}
        </p>
      )}
      <div className="mt-5 space-y-5">
        {question.statements.map((stmt) => {
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
              <div className="flex items-baseline gap-3 mb-2">
                <p className="text-[13px] text-[#1F1B16] leading-snug flex-1">
                  {stmt}
                </p>
                {isNumericAscending && total > 0 && (
                  <p className="text-lg font-semibold text-[#1F1B16] shrink-0 tabular-nums">
                    {mean.toFixed(2)}
                    <span className="text-[10px] text-[#9B9388] font-sans font-normal ml-1 tracking-wider uppercase">
                      mean
                    </span>
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                {question.scale.map((s) => {
                  const c = counts.get(s) ?? 0;
                  const pct = total === 0 ? 0 : Math.round((c / total) * 100);
                  return (
                    <div key={s} className="flex-1">
                      <div className="h-7 bg-[#EFEAE0] flex items-end overflow-hidden">
                        <div
                          className="w-full"
                          style={{
                            height: `${pct}%`,
                            backgroundColor: c > 0 ? INK : "transparent",
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-center text-[#9B9388] mt-1 tabular-nums">
                        {s}
                      </p>
                      <p className="text-[10px] text-center text-[#1F1B16] tabular-nums font-medium">
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
    <div>
      <p className="text-sm font-medium text-[#1F1B16] leading-snug">
        {question.label}
      </p>
      <p className="text-[11px] text-[#9B9388] mt-1">
        {question.beforeLabel}{" "}
        <span className="text-[#D8D2C4]">→</span>{" "}
        {question.nowLabel}
      </p>
      <div className="mt-5 space-y-4">
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
            <div key={stmt} className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 items-baseline">
              <p className="text-[13px] text-[#1F1B16] leading-snug">{stmt}</p>
              {beforeN > 0 && nowN > 0 ? (
                <p className="text-lg font-semibold text-[#1F1B16] shrink-0 tabular-nums whitespace-nowrap">
                  {beforeMean.toFixed(2)}
                  <span className="text-[#9B9388] mx-1.5 font-normal">→</span>
                  {nowMean.toFixed(2)}
                  <span
                    className={`ml-2 text-[11px] font-sans font-medium tabular-nums ${
                      delta >= 0 ? "text-[#1F1B16]" : "text-[#9B9388]"
                    }`}
                  >
                    {delta >= 0 ? "+" : ""}
                    {delta.toFixed(2)}
                  </span>
                </p>
              ) : (
                <span className="text-[11px] text-[#9B9388]">—</span>
              )}
              <div className="col-span-2 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-[#9B9388] w-12 shrink-0">
                    Before
                  </span>
                  <div className="flex-1 h-1.5 bg-[#EFEAE0] overflow-hidden">
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
                  <span className="text-[10px] uppercase tracking-wider text-[#9B9388] w-12 shrink-0">
                    Now
                  </span>
                  <div className="flex-1 h-1.5 bg-[#EFEAE0] overflow-hidden">
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

  return (
    <div className="border-t border-[#E7E1D2] first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-baseline justify-between gap-4 py-3 text-left hover:text-[#1F1B16] transition-colors"
      >
        <p className="text-[13px] text-[#1F1B16] leading-snug">
          {question.label}
        </p>
        <span className="text-[11px] text-[#9B9388] shrink-0 tabular-nums">
          {answers.length}
          <span className="ml-2 inline-block w-3 text-center">{open ? "−" : "+"}</span>
        </span>
      </button>
      {open && (
        <div className="pb-4 -mt-1 space-y-4">
          {answers.length === 0 && (
            <p className="text-[12px] text-[#9B9388] italic">No answers.</p>
          )}
          {answers.map((a, i) => (
            <div key={i} className="border-l border-[#D8D2C4] pl-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#9B9388]">
                {a.name}
              </p>
              <p className="text-[13px] text-[#1F1B16] mt-1 leading-relaxed whitespace-pre-wrap">
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
