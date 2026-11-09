import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin, allowedTrackSlugsForActor } from "@/app/dashboard/admin/actions-shared";
import { PageHeader } from "@/components/page-header";
import { loadExitSurveyCompletion, loadExitSurveyResults, summarizeBySession } from "@/lib/exit-survey-results";
import { UNCLEAR_PROMPT } from "@/lib/exit-survey";

export const dynamic = "force-dynamic";

export default async function ExitSurveyResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  const { track } = await searchParams;
  if (!track) notFound();
  const actor = await requireAdmin();
  const allowed = await allowedTrackSlugsForActor(actor, actor.svc);
  if (allowed && !allowed.has(track)) notFound();

  const [rows, completion] = await Promise.all([
    loadExitSurveyResults(actor.svc, track),
    loadExitSurveyCompletion(actor.svc, track),
  ]);
  const summary = summarizeBySession(rows);
  const csvHref = `/api/admin/exit-surveys/csv?track=${encodeURIComponent(track)}`;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-5 py-8 space-y-8">
      <PageHeader
        title="Exit survey results"
        subtitle={track}
        noWrap
        actions={
          <a href={csvHref} className="text-sm text-ink underline">
            Download CSV
          </a>
        }
      />
      <p className="text-sm text-ink-soft">
        Answers are anonymous: no names, codes or times, so no one can tell who said what. Back to the{" "}
        <Link href="/dashboard/admin" className="text-ink underline">
          admin panel
        </Link>
        .
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-ink-soft">No responses yet.</p>
      ) : (
        <>
          <section>
            <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
              Average rating by session
            </h2>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs text-ink-faint">
                  <th className="py-2 pr-4 font-medium">Week</th>
                  <th className="py-2 pr-4 font-medium">Session</th>
                  <th className="py-2 pr-4 font-medium">Responses</th>
                  <th className="py-2 font-medium">Average (1 to 5)</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((s) => (
                  <tr key={`${s.week}:${s.session}`} className="border-b border-neutral-100">
                    <td className="py-2 pr-4">{s.week}</td>
                    <td className="py-2 pr-4">{s.session}</td>
                    <td className="py-2 pr-4">{s.responses}</td>
                    <td className="py-2">{s.average}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
              Completion
            </h2>
            <ul className="mt-2 divide-y divide-neutral-100">
              {completion.map((c) => (
                <li key={`${c.week}:${c.session}`} className="py-2 text-sm">
                  <span className="font-medium text-ink">
                    Week {c.week}, session {c.session}
                  </span>
                  <span className="text-ink-faint">
                    {" "}
                    · {c.answered} of {c.enrolled} answered
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">All responses</h2>
            <ul className="mt-2 divide-y divide-neutral-100">
              {rows.map((r, i) => (
                <li key={i} className="py-3 text-sm">
                  <p className="font-medium text-ink">
                    <span className="font-normal text-ink-faint">
                      Week {r.week_number}, session {r.session_number}
                      {r.understanding !== null ? ` · rated ${r.understanding}` : ""}
                      {r.hours_text ? ` · ${r.hours_text} hrs` : ""}
                    </span>
                  </p>
                  {r.unclear_text && (
                    <p className="mt-1 whitespace-pre-line text-ink-soft">
                      <span className="text-ink-faint">{UNCLEAR_PROMPT} </span>
                      {r.unclear_text}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
