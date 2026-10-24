import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { MvpReport } from "./report-export";

const blue = "#1448CC";
const s = StyleSheet.create({
  page: { padding: 34, paddingTop: 30, paddingBottom: 52, fontFamily: "MvpReport", fontSize: 9, color: "#202329", lineHeight: 1.4 },
  stripe: { position: "absolute", top: 0, left: 0, right: 0, height: 5, backgroundColor: blue },
  brandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  brand: { fontSize: 10, fontWeight: 700, color: blue },
  badge: { fontSize: 7, color: blue, backgroundColor: "#E5F701", padding: 5 },
  eyebrow: { color: blue, fontSize: 8, fontWeight: 700, marginBottom: 5 },
  title: { fontSize: 27, lineHeight: 1.2, fontWeight: 700, marginBottom: 8 },
  muted: { color: "#626A76", fontSize: 8 },
  scope: { backgroundColor: "#F3F6FF", borderWidth: 0.5, borderColor: "#DCE4F8", padding: 10, marginTop: 13, marginBottom: 14 },
  scopeLine: { marginBottom: 3, fontSize: 8 },
  section: { fontSize: 13, fontWeight: 700, marginTop: 15, marginBottom: 8 },
  cards: { flexDirection: "row", gap: 7, marginBottom: 7 },
  card: { flex: 1, borderWidth: 0.5, borderColor: "#DCE4F8", borderRadius: 5, padding: 10, backgroundColor: "#F8FAFF" },
  bigNumber: { fontSize: 22, lineHeight: 1.2, fontWeight: 700, color: blue, marginBottom: 5 },
  unavailable: { fontSize: 12, lineHeight: 1.3, fontWeight: 700, color: "#626A76", marginBottom: 6 },
  label: { fontSize: 8, fontWeight: 700 },
  offering: { borderTopWidth: 0.7, borderTopColor: "#DCE4F8", paddingTop: 9, marginTop: 7, marginBottom: 6 },
  offeringTitle: { fontSize: 10, fontWeight: 700, marginBottom: 3 },
  metrics: { flexDirection: "row", gap: 7, marginBottom: 6 },
  metric: { flex: 1, padding: 7, backgroundColor: "#F7F8FA" },
  metricValue: { fontSize: 14, lineHeight: 1.3, fontWeight: 700, color: blue, marginBottom: 3 },
  reason: { fontSize: 7, color: "#626A76", marginTop: 3 },
  tableHeader: { flexDirection: "row", backgroundColor: "#EEF2FC", padding: 7, fontSize: 7, fontWeight: 700 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#E2E6EC", padding: 7, fontSize: 8 },
  measure: { width: "46%", paddingRight: 10 },
  result: { width: "13.5%", textAlign: "right", paddingLeft: 5 },
  note: { marginTop: 8, fontSize: 7, color: "#626A76" },
  warning: { backgroundColor: "#FFF8E9", padding: 8, marginTop: 5, fontSize: 8 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 5 },
  locationLabel: { width: "38%", fontSize: 8 },
  track: { width: "38%", height: 5, backgroundColor: "#E7EBF4", borderRadius: 2 },
  fill: { height: 5, backgroundColor: blue, borderRadius: 2 },
  locationValue: { width: "20%", textAlign: "right", fontSize: 8 },
  definition: { borderBottomWidth: 0.5, borderBottomColor: "#E2E6EC", paddingVertical: 7 },
  footer: { position: "absolute", top: 806, left: 34, right: 34, height: 16, fontSize: 8, color: "#626A76" },
});
const statuses: Record<string, string> = { all: "All learner statuses", enrolled: "Enrolled before start", started: "Started", active: "Active", completed: "Completed", needs_check_in: "Needs a check-in", starting_soon: "Starting soon", unknown: "Unavailable" };
function value(number: number | null | undefined) {
  return number == null || !Number.isFinite(number) ? "Unavailable" : number.toLocaleString("en-US", { maximumFractionDigits: 1 });
}
function chunks<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));
}
function timestamp(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "Unavailable" : new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(date);
}

// Only authorized aggregates enter the document, never learner contacts or
// browser-supplied totals. Survey scales are retained, not invented percentages.
export function MvpReportDocument({ report, view = "overview" }: { report: MvpReport; view?: "overview" | "programs" }) {
  const filterLabels = report.filterLabels ?? { program: report.scopeLabel, course: report.appliedFilters.courseSlug ? "Selected course" : "All courses" };
  const title = report.appliedFilters.programId ? filterLabels.program : view === "programs" ? "Program performance" : "Impact overview";
  const summary = report.summary ? [
    { label: "Unique learners started", count: report.summary.uniqueLearnersStarted },
    { label: "Program participations started", count: report.summary.programParticipationsStarted },
    { label: "Learners with a course completion", count: report.summary.uniqueLearnersCompleted },
    { label: "Learner/program pairs with a completion", count: report.summary.programParticipationsCompleted },
    { label: "Upcoming enrollments", count: report.summary.upcomingEnrollments },
  ] : [];
  const locations = report.locations;
  return <Document title={`${title} | BCC impact brief`} author="Beyond Code Collective">
    <Page size="A4" style={s.page} wrap>
      <View fixed style={s.stripe} />
      <Text fixed style={s.footer}>BCC | Internal aggregate report</Text>
      <Text fixed style={{ position: "absolute", top: 806, left: 500, width: 60, fontSize: 8, textAlign: "right", color: "#626A76" }} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      <View style={s.brandRow}><Text style={s.brand}>Beyond Code Collective</Text><Text style={s.badge}>PROGRAMS &amp; IMPACT</Text></View>
      <Text style={s.eyebrow}>{view === "programs" ? "PROGRAM IMPACT BRIEF" : "OVERVIEW IMPACT BRIEF"}</Text>
      <Text style={s.title}>{title}</Text>
      <Text style={s.muted}>Current-roster participation, program performance, and learner outcomes</Text>
      <View style={s.scope} wrap={false}>
        <Text style={s.scopeLine}>{filterLabels.program} / {filterLabels.course}</Text>
        <Text style={s.scopeLine}>Reported location: {report.appliedFilters.city ?? "All learner locations"} | {statuses[report.appliedFilters.learnerStatus] ?? "Unavailable"}</Text>
        <Text style={s.scopeLine}>Offering dates: {report.appliedFilters.startDate ?? "No start limit"} to {report.appliedFilters.endDate ?? "No end limit"}</Text>
        <Text style={s.muted}>Last refreshed: {timestamp(report.freshness.fetchedAt)}</Text>
      </View>
      <Text style={s.muted}>Fresh results for the applied filters. Dates select overlapping offerings; results cover each offering in full, using evidence available so far.</Text>
      {!!summary.length && <Text style={s.section} minPresenceAhead={85}>Current-roster summary</Text>}
      {chunks(summary, 3).map((group, i) => <View key={i} style={s.cards} wrap={false}>{group.map(item => <View key={item.label} style={s.card}>
        <Text style={item.count == null ? s.unavailable : s.bigNumber}>{value(item.count)}</Text><Text style={s.label}>{item.label}</Text>
      </View>)}</View>)}
      {!!summary.length && <Text style={s.note}>Counts overlap. Course completions are not program graduation or certificates. These are current-roster results, not historical all-time totals.</Text>}
      <Text style={s.section} minPresenceAhead={95}>Program performance</Text>
      {!report.rows.length && <Text style={s.muted}>No offerings match the applied filters.</Text>}
      {!!report.rows.length && report.rows.every(row => !row.metrics.length) && <Text style={s.muted}>No course-performance metrics selected.</Text>}
      {report.rows.map(row => <View key={row.id}>
        {chunks(row.metrics.length ? row.metrics : [], 3).map((group, i) => <View key={i} wrap={false}>
        <View style={s.offering}><Text style={s.offeringTitle}>{row.programName} / {row.courseName ?? "Course unavailable"}{i > 0 ? " (continued)" : ""}</Text><Text style={s.muted}>{statuses[row.status] ?? row.status} | {row.startDate ?? "Start unavailable"} to {row.endDate ?? "End unavailable"}</Text></View>
        <View style={s.metrics}>{group.map(metric => <View key={metric.key} style={s.metric}>
          <Text style={metric.value === null ? s.unavailable : s.metricValue}>{value(metric.value)}{metric.value !== null && metric.unit === "Percent" ? "%" : ""}</Text>
          <Text style={s.label}>{metric.label}</Text><Text style={s.reason}>{metric.unit}</Text>
          {metric.unavailableReason && <Text style={s.reason}>{metric.unavailableReason}</Text>}
        </View>)}</View></View>)}
      </View>)}
      {report.outcomes && <>
        <Text style={s.section} minPresenceAhead={80}>Learner survey outcomes</Text>
        {!report.outcomes.length && <Text style={s.muted}>No mapped survey outcomes are available.</Text>}
        {report.outcomes.map((group, i) => <View key={i}>
          <Text style={s.offeringTitle} minPresenceAhead={65}>{group.programName} / {group.courseName}</Text>
          {group.unavailableReason && <Text style={s.note}>{group.unavailableReason}</Text>}
          {!group.measures.length && !group.unavailableReason && <Text style={s.muted}>Results unavailable.</Text>}
          {!!group.measures.length && <View style={s.tableHeader} wrap={false} minPresenceAhead={40}><Text style={s.measure}>MEASURE / ORIGINAL SCALE</Text><Text style={s.result}>BEFORE</Text><Text style={s.result}>AFTER</Text><Text style={s.result}>CHANGE</Text><Text style={s.result}>PAIRS</Text></View>}
          {group.measures.map((measure, j) => <View key={`${measure.id}:${j}`} style={s.tableRow} wrap={false}>
            <View style={s.measure}><Text>{measure.label}</Text><Text style={s.reason}>{measure.sourceLabel} | {measure.unit}</Text></View>
            <Text style={s.result}>{value(measure.beforeValue)}</Text><Text style={s.result}>{value(measure.afterValue)}</Text><Text style={s.result}>{value(measure.change)}</Text><Text style={s.result}>{value(measure.pairedRespondentCount)}</Text>
          </View>)}
        </View>)}
        <Text style={s.note}>Self-reported before-and-now ratings from the same paired respondents. Different questions and scales are not pooled. Higher ratings do not necessarily mean better outcomes or establish program causation.</Text>
      </>}
      {"locations" in report && <>
        <Text style={s.section} minPresenceAhead={65}>Reported learner locations</Text>
        {!locations ? <Text style={s.muted}>Location summary unavailable.</Text> : <>
          <Text style={s.muted}>{value(locations.uniqueLearners)} current learners, including unknowns. Self-reported profile text, not verified cities.</Text>
          {[...locations.groups, { label: "Unknown / conflicting", count: locations.missingLocationLearners }].map((group, i) => {
            const percent = locations.uniqueLearners != null && locations.uniqueLearners > 0 && group.count != null ? group.count / locations.uniqueLearners * 100 : null;
            return <View key={i} style={s.locationRow} wrap={false}><Text style={s.locationLabel}>{group.label}</Text><View style={s.track}>{percent !== null && <View style={[s.fill, { width: `${Math.min(100, Math.max(0, percent))}%` }]} />}</View><Text style={s.locationValue}>{value(group.count)}{percent !== null ? ` | ${value(percent)}%` : ""}</Text></View>;
          })}
        </>}
      </>}
      {report.events && <>
        <Text style={s.section} minPresenceAhead={70}>Separate events</Text>
        {report.events.unavailableReason && <Text style={s.warning}>{report.events.unavailableReason}</Text>}
        {!report.events.rows.length && <Text style={s.muted}>No event rows available for this selection.</Text>}
        {report.events.rows.map((event, i) => <View key={i}>
          <Text style={s.offeringTitle} minPresenceAhead={45}>{event.programName} / {event.title}</Text>
          <Text style={s.muted}>{event.startsAt} to {event.endsAt ?? "End unavailable"} | {event.timezone} | Registration {event.registrationStatus}</Text>
          {event.metrics.map(metric => <View key={metric.key} style={s.definition} wrap={false}><Text>{metric.label}: {value(metric.value)}</Text><Text style={s.reason}>{metric.unit}{metric.unavailableReason ? ` | ${metric.unavailableReason}` : ""}</Text></View>)}
        </View>)}
      </>}
      <Text style={s.section} minPresenceAhead={65}>Definitions &amp; data quality</Text>
      {report.warnings.map((warning, i) => <Text key={i} style={s.warning}>{warning.reason}</Text>)}
      {report.definitions.map((definition, i) => <View key={i} style={s.definition}>
        <Text style={s.label} minPresenceAhead={20}>{definition.label}</Text><Text style={s.reason}>{definition.definition}</Text>
        {definition.denominator && <Text style={s.reason}>Denominator: {definition.denominator}</Text>}
        {definition.unavailableReason && <Text style={s.reason}>{definition.unavailableReason}</Text>}
      </View>)}
      <Text style={s.note}>Unavailable is not zero. This report contains aggregate results only, not learner names, emails, or check-in evidence. Demographic exports and funder commitments are not included.</Text>
    </Page>
  </Document>;
}
