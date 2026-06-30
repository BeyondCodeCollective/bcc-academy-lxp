import "server-only";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { InsightsData, InsightsSection } from "@/lib/analytics/insights-data";
import type { BCCSurveyResponse } from "@/app/dashboard/admin/actions-surveys";

// Cohort family — single cobalt hue, distinguished by lightness (no rainbow),
// mirroring the on-screen Insights palette.
const PALETTE = ["#1D59FF", "#7CA0FF", "#1A2B6B", "#4B5FA8", "#A7B6D9", "#C9D4F0"];
const INK = "#1A1A1A";
const INK_SOFT = "#52525B";
const INK_FAINT = "#9CA3AF";
const RULE = "#E4E4E7";

// Read a response's cohort the same way the on-screen dashboard does.
function cohortOf(r: BCCSurveyResponse): string {
  const raw = (r.responses?.program_variant ?? r.responses?._cohort_track) as unknown;
  return typeof raw === "string" && raw.trim() ? raw.trim() : "Untagged";
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
