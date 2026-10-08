import { createServiceClient } from "@/lib/supabase/server";
import { formatEventWhen } from "@/lib/events";
import { SurveyForm } from "./survey-form";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = {
  id: string;
  parent_first_name: string;
  events: { title: string; starts_at: string; ends_at: string | null; timezone: string; programs: { name: string } | null } | null;
  // registration_id is unique, so PostgREST embeds this to-one: an object or null.
  event_survey_responses: SurveyRow | SurveyRow[] | null;
};
type SurveyRow = { rating: number; would_recommend: boolean | null; enjoyed: string | null; improve: string | null };

export default async function EventSurveyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const svc = createServiceClient();
  const { data } = UUID_RE.test(token)
    ? await svc
        .from("event_registrations")
        .select(
          "id, parent_first_name, events(title, starts_at, ends_at, timezone, programs(name)), event_survey_responses(rating, would_recommend, enjoyed, improve)",
        )
        .eq("survey_token", token)
        .maybeSingle()
    : { data: null };
  const reg = data as unknown as Row | null;

  if (!reg || !reg.events) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="mx-auto w-full max-w-md px-5 py-16">
          <div className="rounded-lg border border-rule bg-white p-8">
            <h1 className="text-xl font-bold text-ink">This link is not valid</h1>
            <p className="mt-2 text-sm text-ink-soft">The link may have been copied incorrectly.</p>
          </div>
        </div>
      </div>
    );
  }

  const embedded = reg.event_survey_responses;
  const existing = Array.isArray(embedded) ? (embedded[0] ?? null) : embedded;
  const org = reg.events.programs?.name ?? "";

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto w-full max-w-2xl px-5 pt-10 pb-6">
        {org && <p className="text-xs font-medium tracking-wide text-primary uppercase">{org}</p>}
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">How was {reg.events.title}?</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {formatEventWhen(reg.events.starts_at, reg.events.ends_at, reg.events.timezone)} · Four quick questions, about a
          minute.
        </p>
      </div>
      <SurveyForm
        token={token}
        initial={
          existing
            ? {
                rating: existing.rating,
                wouldRecommend: existing.would_recommend,
                enjoyed: existing.enjoyed ?? "",
                improve: existing.improve ?? "",
              }
            : null
        }
      />
    </div>
  );
}
