import "server-only";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { InsightsData, InsightsSection } from "@/lib/analytics/insights-data";
import type { BCCSurveyResponse } from "@/app/dashboard/admin/actions-surveys";
import type { SurveyQuestion } from "@/components/survey-fields";
import { normalizeCohortLabel } from "@/lib/surveys/cohort-labels";

// Cohort family — single cobalt hue, distinguished by lightness (no rainbow),
// mirroring the on-screen Insights palette.
const PALETTE = ["#1D59FF", "#7CA0FF", "#1A2B6B", "#4B5FA8", "#A7B6D9", "#C9D4F0"];
const INK = "#1A1A1A";
const INK_SOFT = "#52525B";
const INK_FAINT = "#9CA3AF";
const RULE = "#E4E4E7";

// Read a response's cohort the same way the on-screen dashboard does — including
// normalizeCohortLabel, so the PDF and the screen bucket cohorts identically.
function cohortOf(r: BCCSurveyResponse): string {
  const raw = (r.responses?.program_variant ?? r.responses?._cohort_track) as unknown;
  return typeof raw === "string" && raw.trim() ? normalizeCohortLabel(raw) : "Untagged";
}

const styles = StyleSheet.create({
  page: { paddingVertical: 48, paddingHorizontal: 48, fontFamily: "Helvetica", color: INK },
  eyebrow: { fontSize: 9, letterSpacing: 2, color: INK_FAINT, textTransform: "uppercase" },
  title: { fontSize: 24, fontFamily: "Helvetica-Bold", marginTop: 4 },
  meta: { fontSize: 10, color: INK_SOFT, marginTop: 6 },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 24 },
  statCard: { flex: 1, borderWidth: 1, borderColor: RULE, borderRadius: 6, padding: 14 },
  statValue: { fontSize: 22, fontFamily: "Helvetica-Bold" },
  statLabel: { fontSize: 9, color: INK_FAINT, textTransform: "uppercase", letterSpacing: 1, marginTop: 4 },
  sectionLabel: { fontSize: 9, letterSpacing: 2, color: INK_FAINT, textTransform: "uppercase", marginTop: 32, marginBottom: 10 },
  surveyRow: { borderTopWidth: 1, borderTopColor: RULE, paddingVertical: 12 },
  surveyHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  surveyTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", maxWidth: 380 },
  surveyCount: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  bar: { flexDirection: "row", height: 6, borderRadius: 3, overflow: "hidden", marginTop: 8, backgroundColor: "#F1F1F4" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  legendText: { fontSize: 8, color: INK_SOFT },
  empty: { fontSize: 11, color: INK_SOFT, marginTop: 24 },
  footer: { position: "absolute", bottom: 28, left: 48, right: 48, fontSize: 8, color: INK_FAINT, textAlign: "center" },
});

function cohortColor(name: string, all: string[]): string {
  if (name === "Untagged") return "#C9D4F0";
  const idx = all.filter((c) => c !== "Untagged").indexOf(name);
  return idx >= 0 ? PALETTE[idx % PALETTE.length] : "#6B7280";
}

type Computed = {
  responses: number;
  respondents: number;
  surveys: number;
  rows: {
    title: string;
    count: number;
    breakdown: { name: string; count: number; color: string }[];
  }[];
};

function compute(data: InsightsData, cohort: string): Computed {
  const scoped: InsightsSection[] =
    cohort === "all"
      ? data.sections
      : data.sections
          .map((s) => ({ ...s, responses: s.responses.filter((r) => cohortOf(r) === cohort) }))
          .filter((s) => s.responses.length > 0);

  const allCohorts = new Set<string>();
  for (const s of data.sections) for (const r of s.responses) allCohorts.add(cohortOf(r));
  const cohortList = [...allCohorts];

  const emails = new Set<string>();
  for (const s of scoped) for (const r of s.responses) if (r.email) emails.add(r.email.toLowerCase());

  const rows = scoped
    .filter((s) => s.responses.length > 0)
    .map((s) => {
      const byCohort = new Map<string, number>();
      for (const r of s.responses) {
        const c = cohortOf(r);
        byCohort.set(c, (byCohort.get(c) ?? 0) + 1);
      }
      return {
        title: s.survey.title,
        count: s.responses.length,
        breakdown: [...byCohort.entries()]
          .map(([name, count]) => ({ name, count, color: cohortColor(name, cohortList) }))
          .sort((a, b) => b.count - a.count),
      };
    })
    .sort((a, b) => b.count - a.count);

  return {
    responses: scoped.reduce((n, s) => n + s.responses.length, 0),
    respondents: emails.size,
    surveys: rows.length,
    rows,
  };
}

function InsightsPdfDoc({
  data,
  cohort,
  programName,
  generatedAt,
}: {
  data: InsightsData;
  cohort: string;
  programName: string;
  generatedAt: string;
}) {
  const c = compute(data, cohort);
  const scopeLabel = cohort === "all" ? "All cohorts" : cohort;

  return (
    <Document title={`Survey Insights — ${programName}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrow}>Survey Insights</Text>
        <Text style={styles.title}>{programName}</Text>
        <Text style={styles.meta}>
          {scopeLabel} · Generated {generatedAt}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{c.responses.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Responses</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{c.respondents.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Respondents</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{c.surveys.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Surveys</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Surveys</Text>
        {c.rows.length === 0 ? (
          <Text style={styles.empty}>No responses for this scope yet.</Text>
        ) : (
          c.rows.map((row, i) => (
            <View key={i} style={styles.surveyRow} wrap={false}>
              <View style={styles.surveyHead}>
                <Text style={styles.surveyTitle}>{row.title}</Text>
                <Text style={styles.surveyCount}>{row.count}</Text>
              </View>
              <View style={styles.bar}>
                {row.breakdown.map((seg, j) => (
                  <View
                    key={j}
                    style={{ width: `${(seg.count / row.count) * 100}%`, backgroundColor: seg.color }}
                  />
                ))}
              </View>
              <View style={styles.legend}>
                {row.breakdown.map((seg, j) => (
                  <View key={j} style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: seg.color }]} />
                    <Text style={styles.legendText}>
                      {seg.name} {seg.count}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `BCC Academy · ${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}

/** Render the Survey Insights report to a PDF buffer for the given cohort. */
export async function renderInsightsPdf(opts: {
  data: InsightsData;
  cohort: string;
  programName: string;
  generatedAt: string;
}): Promise<Buffer> {
  return renderToBuffer(<InsightsPdfDoc {...opts} />);
}

// ── Detailed per-question report ─────────────────────────────────────────────
// A per-survey breakdown: every question with its response distribution
// (option counts, Likert averages/spread, and verbatim text answers).

// Likert answers are stored as labels (mostly) or a numeric string; map both to
// 1–5 where 1 = Strongly Agree … 5 = Strongly Disagree.
const LIKERT_SCALE: Record<string, number> = {
  "strongly agree": 1, agree: 2, neutral: 3, disagree: 4, "strongly disagree": 5,
  "1": 1, "2": 2, "3": 3, "4": 4, "5": 5,
};
const SHADES = ["#1D59FF", "#4B7BFF", "#7CA0FF", "#A7BEE8", "#C9D4F0"];
const TRACK = "#EEF1F8";

const d = StyleSheet.create({
  page: { paddingVertical: 44, paddingHorizontal: 46, fontFamily: "Helvetica", color: INK },
  eyebrow: { fontSize: 9, letterSpacing: 2, color: INK_FAINT, textTransform: "uppercase" },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", marginTop: 4, maxWidth: 460 },
  meta: { fontSize: 10, color: INK_SOFT, marginTop: 6 },
  q: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 7 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  optLabel: { fontSize: 9, color: INK, width: 220 },
  barWrap: { flex: 1, height: 8, backgroundColor: TRACK, borderRadius: 2, marginHorizontal: 6 },
  bar: { height: 8, backgroundColor: "#1D59FF", borderRadius: 2 },
  count: { fontSize: 8.5, color: INK_SOFT, width: 48, textAlign: "right" },
  stmt: { fontSize: 9.5, color: INK, flex: 1, paddingRight: 8 },
  mean: { fontSize: 8.5, color: "#1D59FF", fontFamily: "Helvetica-Bold" },
  dist: { flexDirection: "row", height: 7, borderRadius: 2, overflow: "hidden", marginTop: 3, backgroundColor: TRACK },
  txt: { fontSize: 9, color: INK, marginBottom: 4, paddingLeft: 8 },
  block: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: RULE },
  footer: { position: "absolute", bottom: 26, left: 46, right: 46, fontSize: 8, color: INK_FAINT, textAlign: "center" },
});

function DetailedSurveyDoc({
  section, cohort, programName, generatedAt,
}: {
  section: InsightsSection;
  cohort: string;
  programName: string;
  generatedAt: string;
}) {
  const rows = cohort === "all" ? section.responses : section.responses.filter((r) => cohortOf(r) === cohort);
  const N = rows.length;
  const schema = section.schema ?? [];
  const pct = (n: number) => (N ? Math.round((n / N) * 100) : 0);
  const val = (r: BCCSurveyResponse, id: string) => (r.responses as Record<string, unknown> | undefined)?.[id];

  const Options = (q: { id: string; options: string[] }, multi: boolean) => {
    const counts = q.options
      .map((o) => ({ o, n: rows.filter((r) => { const v = val(r, q.id); return multi ? Array.isArray(v) && v.includes(o) : v === o; }).length }))
      .filter((c) => c.n > 0).sort((a, b) => b.n - a.n);
    if (!counts.length) return <Text style={{ fontSize: 9, color: INK_FAINT }}>No responses recorded.</Text>;
    const max = Math.max(1, ...counts.map((c) => c.n));
    return (
      <View>
        {counts.map((c) => (
          <View key={c.o} style={d.row}>
            <Text style={d.optLabel}>{c.o}</Text>
            <View style={d.barWrap}><View style={[d.bar, { width: `${(c.n / max) * 100}%` }]} /></View>
            <Text style={d.count}>{c.n} · {pct(c.n)}%</Text>
          </View>
        ))}
      </View>
    );
  };

  const Likert = (q: { id: string; statements: string[] }) => (
    <View>
      {q.statements.map((st) => {
        const raw = rows.map((r) => (val(r, q.id) as Record<string, string> | undefined)?.[st]).filter(Boolean) as string[];
        const nums = raw.map((v) => LIKERT_SCALE[String(v).trim().toLowerCase()]).filter((n) => n >= 1 && n <= 5);
        const dist = [1, 2, 3, 4, 5].map((n) => nums.filter((x) => x === n).length);
        const total = nums.length || 1;
        const mean = nums.length ? (nums.reduce((a, x) => a + x, 0) / nums.length).toFixed(2) : "—";
        return (
          <View key={st} wrap={false} style={{ marginTop: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={d.stmt}>{st}</Text><Text style={d.mean}>avg {mean}</Text>
            </View>
            <View style={d.dist}>
              {dist.map((n, i) => n > 0 ? <View key={i} style={{ width: `${(n / total) * 100}%`, backgroundColor: SHADES[i] }} /> : null)}
            </View>
            <Text style={{ fontSize: 7.5, color: INK_FAINT, marginTop: 2 }}>{dist.map((n, i) => `${i + 1}:${n}`).join("   ")}</Text>
          </View>
        );
      })}
      <Text style={{ fontSize: 7.5, color: INK_FAINT, marginTop: 6 }}>Scale 1 = Strongly Agree to 5 = Strongly Disagree (lower = more confident)</Text>
    </View>
  );

  const blocks = schema
    .filter((q) => q.type !== "consent" && q.type !== "month-year")
    .map((q: SurveyQuestion, idx) => {
      let body: ReactNode = null;
      if (q.type === "radio") body = Options(q, false);
      else if (q.type === "multi-select") body = Options(q, true);
      else if (q.type === "likert") body = Likert(q);
      else if (q.type === "text") {
        const ans = rows.map((r) => (val(r, q.id) as string | undefined)?.trim()).filter(Boolean) as string[];
        body = ans.length ? <View>{ans.map((a, i) => <Text key={i} style={d.txt}>• {a}</Text>)}</View>
                          : <Text style={{ fontSize: 9, color: INK_FAINT }}>No responses.</Text>;
      }
      return (
        <View key={q.id} style={idx === 0 ? { marginTop: 22 } : d.block}>
          <Text style={d.q}>{q.label}{q.type === "text" ? "  ·  open text" : ""}</Text>
          {body}
        </View>
      );
    });

  const scope = cohort === "all" ? "All cohorts" : cohort;
  return (
    <Document title={`${section.survey.title} — Detailed · ${programName}`}>
      <Page size="A4" style={d.page} wrap>
        <Text style={d.eyebrow}>Detailed Survey Report</Text>
        <Text style={d.title}>{section.survey.title}</Text>
        <Text style={d.meta}>{programName} · {scope} · {N} respondents · Generated {generatedAt}</Text>
        {schema.length === 0
          ? <Text style={{ marginTop: 24, fontSize: 11, color: INK_SOFT }}>This survey has no question schema on file, so a per-question breakdown isn&apos;t available.</Text>
          : blocks}
        <Text style={d.footer} render={({ pageNumber, totalPages }) => `BCC Academy · ${section.survey.title} · ${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}

/** Render a per-question detailed report for ONE survey, scoped to a cohort. */
export async function renderDetailedSurveyPdf(opts: {
  section: InsightsSection;
  cohort: string;
  programName: string;
  generatedAt: string;
}): Promise<Buffer> {
  return renderToBuffer(<DetailedSurveyDoc {...opts} />);
}
