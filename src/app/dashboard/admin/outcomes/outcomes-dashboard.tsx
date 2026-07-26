import { DonutChart } from "@/components/charts/donut-chart";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { LineChart, type LineSeries } from "@/components/charts/line-chart";
import { PairedBarChart } from "@/components/charts/paired-bar-chart";
import { FunnelChart } from "@/components/charts/funnel-chart";
import type { OutcomesData } from "@/lib/analytics/outcomes";
import type { ProgressData } from "@/lib/analytics/progress";
import type { AcquisitionData } from "@/lib/analytics/acquisition";
import { COBALT_FAMILY as PALETTE, STATUS_COLORS } from "@/components/stats/palette";
import { SectionHeadline } from "@/components/stats/section-headline";
import { microLabel, PersonCell } from "@/components/ui";

export type OutcomesDashboardData = {
  outcomes: OutcomesData;
  progress: ProgressData;
  acquisition: AcquisitionData;
};

// Categorical segments use the shared cobalt family (one hue, no rainbow) —
// imported as PALETTE at the top. Semantic status colors (on-track/at-risk/
// disengaged below) stay green/amber/grey — meaning a monochrome ramp would lose.

export function OutcomesDashboard({ data }: { data: OutcomesDashboardData }) {
  const { outcomes, progress, acquisition } = data;

  return (
    <div className="space-y-14">
      <OutcomesSection outcomes={outcomes} />
      <ProgressSection progress={progress} />
      <AcquisitionSection acquisition={acquisition} />
    </div>
  );
}

// ─── 1. Outcomes & Learning ──────────────────────────────────────────────────

function OutcomesSection({ outcomes }: { outcomes: OutcomesData }) {
  const hasShift = outcomes.groups.length > 0;
  // Sign-aware headline — a flat or slightly-negative average must not render
  // "rose +-0.03". Below ±0.05 on a 1–5 scale is noise, so call it steady.
  const d = outcomes.avgDelta;
  const shiftHeadline =
    d >= 0.05
      ? `Confidence rose +${d.toFixed(2)} on average`
      : d <= -0.05
        ? `Confidence dipped ${d.toFixed(2)} on average`
        : "Confidence held about steady";
  return (
    <section className="space-y-5">
      <SectionHeadline
        eyebrow="Outcomes & Learning"
        headline={hasShift ? shiftHeadline : "Learning gain"}
        sub={
          hasShift
            ? `Across ${outcomes.statementCount} measures · up to ${outcomes.respondents} learners reporting before & after`
            : "Before/after confidence shows up here once a cohort completes a survey with paired (before → now) questions."
        }
      />

      {hasShift ? (
        <div className="space-y-4">
          {outcomes.groups.map((g) => (
            <div key={`${g.surveyId}-${g.label}`} className="space-y-1">
              <PairedBarChart
                title={`${g.label} · ${g.surveyTitle}`}
                beforeLabel={g.beforeLabel}
                nowLabel={g.nowLabel}
                scaleMax={g.scaleMax}
                rows={g.rows}
              />
              {g.isCrossSurvey && (
                <p className="text-[11px] text-ink-faint">
                  Cohort-level: compares pre-survey respondents to post-survey
                  respondents, not the same individuals paired.
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyCard text="No paired before/after survey responses yet." />
      )}

      {(outcomes.pathway.length > 0 || outcomes.archetype.length > 0) && (
        <div className="space-y-3 pt-2">
          <p className={microLabel}>
            Who our learners are · from the entry assessment
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {outcomes.pathway.length > 0 && (
              <DonutChart title="Pathway orientation" segments={withColors(outcomes.pathway)} />
            )}
            {outcomes.archetype.length > 0 && (
              <DonutChart title="Primary archetype" segments={withColors(outcomes.archetype)} />
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── 2. Progress & Completion ────────────────────────────────────────────────

function ProgressSection({ progress }: { progress: ProgressData }) {
  // Average progress = how far through the material learners have gotten, from
  // the weekly "still reached" curve. This is the honest signal WHILE a course
  // runs — leading with completion reads as "0% failed" when a cohort just isn't
  // finished yet. Completion stays, but as secondary context, not the headline.
  const avgProgress = (t: ProgressData["tracks"][number]) =>
    t.totalWeeks > 0
      ? Math.round(t.dropoff.reduce((a, b) => a + b, 0) / t.totalWeeks)
      : 0;

  const overallAvgProgress = (() => {
    let num = 0;
    let den = 0;
    for (const t of progress.tracks) {
      if (t.enrolled > 0 && t.totalWeeks > 0) {
        num += avgProgress(t) * t.enrolled;
        den += t.enrolled;
      }
    }
    return den > 0 ? Math.round(num / den) : 0;
  })();

  const shown = progress.tracks.filter((t) => t.enrolled >= 3).slice(0, 5);
  const maxWeeks = Math.max(1, ...shown.map((t) => t.totalWeeks));
  const xLabels = Array.from({ length: maxWeeks }, (_, i) => `W${i + 1}`);
  const series: LineSeries[] = shown.map((t, i) => ({
    label: t.name,
    color: PALETTE[i % PALETTE.length],
    points: t.dropoff,
  }));

  const progressData = progress.tracks
    .filter((t) => t.enrolled >= 3)
    .map((t) => ({ label: t.name, value: avgProgress(t) }));

  const nTracks = progress.tracks.filter((t) => t.enrolled >= 1).length;

  return (
    <section className="space-y-5">
      <SectionHeadline
        eyebrow="Progress"
        headline={`${overallAvgProgress}% of the way through, on average`}
        sub={`${progress.totalEnrolled.toLocaleString()} enrolled across ${nTracks} course${nTracks === 1 ? "" : "s"}${
          progress.totalCompleted > 0
            ? ` · ${progress.totalCompleted.toLocaleString()} completed so far`
            : ""
        }${
          progress.medianDaysToComplete !== null
            ? ` · median ${progress.medianDaysToComplete} days to finish`
            : ""
        }`}
      />

      <div className="grid gap-3 lg:grid-cols-2">
        {progressData.length > 0 ? (
          <HorizontalBarChart
            title="Progress by track"
            data={progressData}
            unit="%"
            max={100}
            barClass="bg-primary"
            totalCaption={{ value: progressData.length, label: "tracks" }}
          />
        ) : (
          <EmptyCard text="No track has enough enrollment to chart progress yet." />
        )}

        {series.length > 0 ? (
          <LineChart
            title="Still active by week"
            xLabels={xLabels}
            series={series}
            caption={`${shown.length} track${shown.length === 1 ? "" : "s"}`}
          />
        ) : (
          <EmptyCard text="Not enough weekly activity to chart retention yet." />
        )}
      </div>
    </section>
  );
}

// ─── 3. Acquisition & Risk ───────────────────────────────────────────────────

function AcquisitionSection({ acquisition }: { acquisition: AcquisitionData }) {
  const riskSegments = [
    { label: "On track", value: acquisition.risk["on-track"], color: STATUS_COLORS.success },
    { label: "Check in", value: acquisition.risk["at-risk"], color: STATUS_COLORS.warning },
    { label: "Inactive", value: acquisition.risk.disengaged, color: STATUS_COLORS.inactive },
  ];
  const totalScored = riskSegments.reduce((s, r) => s + r.value, 0);
  const needs = acquisition.risk["at-risk"] + acquisition.risk.disengaged;

  return (
    <section className="space-y-5">
      <SectionHeadline
        eyebrow="Acquisition & Risk"
        headline={
          needs > 0
            ? `${needs} learner${needs === 1 ? "" : "s"} need${needs === 1 ? "s" : ""} a check-in`
            : "Everyone's engaged"
        }
        sub="From invite acceptance through activation, plus who's gone quiet."
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <FunnelChart
          title="Activation funnel"
          stages={acquisition.activationFunnel}
          barClass="bg-primary"
        />
        <FunnelChart
          title="Invite acceptance"
          stages={acquisition.inviteFunnel}
          barClass="bg-primary"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {totalScored > 0 ? (
          <DonutChart
            title="Engagement risk"
            segments={riskSegments}
            centerValue={totalScored}
            centerLabel="learners"
          />
        ) : (
          <EmptyCard text="No learners to score yet." />
        )}

        <div className="panel p-5">
          <p className={`mb-4 ${microLabel}`}>
            Needs attention
          </p>
          {acquisition.needsAttention.length === 0 ? (
            <p className="text-sm text-ink-faint">Nobody&apos;s drifting — nice.</p>
          ) : (
            <>
              {/* Cap the list — a 20-name wall makes the whole row read as one
                 long empty column next to the risk donut. The full set lives
                 in Attendance's "Need a check-in". */}
              <ul className="divide-y divide-rule-soft">
                {acquisition.needsAttention.slice(0, 8).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                    <PersonCell name={s.name} email={s.email} />
                    <span className="shrink-0 text-[11px] tabular-nums text-ink-soft">
                      {s.signal}
                    </span>
                  </li>
                ))}
              </ul>
              {acquisition.needsAttention.length > 8 && (
                <p className="mt-2 text-xs text-ink-faint">
                  + {acquisition.needsAttention.length - 8} more in Analytics → Attendance
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Shared bits ─────────────────────────────────────────────────────────────

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="panel px-6 py-10 text-center">
      <p className="text-[13px] text-ink-soft">{text}</p>
    </div>
  );
}

function withColors(
  segments: { label: string; value: number }[],
): { label: string; value: number; color: string }[] {
  return segments.map((s, i) => ({ ...s, color: PALETTE[i % PALETTE.length] }));
}
