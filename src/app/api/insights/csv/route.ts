import { NextResponse, type NextRequest } from "next/server";
import { requireCapability } from "@/app/dashboard/admin/actions-shared";
import { getProgram } from "@/lib/programs/server";
import { buildInsightsData } from "@/lib/analytics/insights-data";

export const dynamic = "force-dynamic";

function escapeCsvCell(value: unknown): string {
  if (value == null) return "";
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, newline, or quote
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function flattenResponse(response: Record<string, unknown>): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(response)) {
    if (key.startsWith("_")) continue; // Skip internal fields
    if (Array.isArray(value)) {
      flat[key] = value.join("; ");
    } else if (typeof value === "object" && value !== null) {
      // Handle nested objects (like Likert scales)
      for (const [subKey, subValue] of Object.entries(value)) {
        if (subValue !== null && typeof subValue === "object" && !Array.isArray(subValue)) {
          // Dual-likert: each statement holds { before, now }. One column per
          // side — String() on the object exported "[object Object]".
          for (const [pairKey, pairValue] of Object.entries(subValue as Record<string, unknown>)) {
            flat[`${key}_${subKey}_${pairKey}`] = String(pairValue ?? "");
          }
        } else {
          flat[`${key}_${subKey}`] = String(subValue ?? "");
        }
      }
    } else {
      flat[key] = String(value ?? "");
    }
  }
  return flat;
}

export async function GET(req: NextRequest) {
  let svc;
  try {
    ({ svc } = await requireCapability("view_insights"));
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && String((e as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    return new NextResponse("Not authorized", { status: 403 });
  }

  const program = await getProgram();
  const aggregatedSlugs = [program.slug === "marketing" ? "catalyst" : program.slug];
  const { data: programRows } = await svc
    .from("programs")
    .select("id, slug")
    .in("slug", aggregatedSlugs);
  const programIds = (programRows ?? []).map((p) => p.id as string);

  // Course scope, when the export was launched from a course's Surveys panel.
  // Same argument the screen passes: a CSV that silently returns program-wide
  // rows under a course heading is the failure this guards against.
  const trackSlug = req.nextUrl.searchParams.get("trackSlug") || undefined;
  const data = await buildInsightsData(programIds, aggregatedSlugs, trackSlug);

  const surveyId = req.nextUrl.searchParams.get("survey");
  const cohort = req.nextUrl.searchParams.get("cohort") || "all";

  const kebab = (v: string) =>
    v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const slug = trackSlug ? kebab(trackSlug) : kebab(program.name) || "program";
  const cohortSlug = cohort === "all" ? "" : `-${kebab(cohort)}`;

  // Single survey export
  if (surveyId) {
    const section = data.sections.find((s) => s.survey.id === surveyId);
    if (!section) {
      return new NextResponse("Survey not found for this program.", { status: 404 });
    }

    let responses = section.responses;
    if (cohort !== "all") {
      const normalizeCohort = (raw: unknown): string => {
        const str = String(raw ?? "").trim();
        if (!str) return "Untagged";
        // Normalize slug to label
        const map: Record<string, string> = {
          "comptia-security": "Comptia Security+",
          "ai-fundamentals": "AI Fundamentals",
          "ai-fundamentals-digital-natives": "AI Fundamentals for Digital Natives",
          "ai-fundamentals-wisdom": "AI Fundamentals for Wisdom Circle Leaders",
        };
        return map[str] || str;
      };
      responses = responses.filter((r) => normalizeCohort(r.responses?.program_variant ?? r.responses?._cohort_track) === cohort);
    }

    // Collect all unique keys from all responses
    const allKeys = new Set<string>();
    for (const r of responses) {
      const flat = flattenResponse(r.responses as Record<string, unknown>);
      for (const key of Object.keys(flat)) {
        allKeys.add(key);
      }
    }
    // Sort keys for consistent ordering, but put common fields first
    const priorityKeys = ["full_name", "email", "first_name", "last_name", "cohort", "program_variant", "agreed_at"];
    const sortedKeys = [
      ...priorityKeys.filter((k) => allKeys.has(k)),
      ...Array.from(allKeys).filter((k) => !priorityKeys.includes(k)).sort(),
    ];

    const header = ["Email", "Submitted At", "Cohort", ...sortedKeys.map(escapeCsvCell)].join(",");
    const rows = responses.map((r) => {
      const flat = flattenResponse(r.responses as Record<string, unknown>);
      const cohortLabel = String(r.responses?.program_variant ?? r.responses?._cohort_track ?? r.responses?.cohort ?? "");
      return [
        escapeCsvCell(r.email),
        escapeCsvCell(r.completed_at),
        escapeCsvCell(cohortLabel),
        ...sortedKeys.map((k) => escapeCsvCell(flat[k])),
      ].join(",");
    });

    const csv = [header, ...rows].join("\n");
    const filename = `${slug}-${kebab(section.survey.title)}${cohortSlug}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // All surveys export — simplified view with one row per response
  const allResponses = data.sections.flatMap((s) =>
    s.responses.map((r) => ({
      surveyId: s.survey.id,
      surveyTitle: s.survey.title,
      email: r.email,
      completedAt: r.completed_at,
      cohort: r.responses?.program_variant ?? r.responses?._cohort_track ?? r.responses?.cohort ?? "",
    }))
  );

  if (cohort !== "all") {
    const normalizeCohort = (raw: unknown): string => {
      const str = String(raw ?? "").trim();
      if (!str) return "Untagged";
      const map: Record<string, string> = {
        "comptia-security": "Comptia Security+",
        "ai-fundamentals": "AI Fundamentals",
        "ai-fundamentals-digital-natives": "AI Fundamentals for Digital Natives",
        "ai-fundamentals-wisdom": "AI Fundamentals for Wisdom Circle Leaders",
      };
      return map[str] || str;
    };
    // Filter to matching cohort
    const filtered = allResponses.filter((r) => normalizeCohort(r.cohort) === cohort);
    // Rebuild data.sections with filtered responses
    const filteredSections = data.sections.map((s) => ({
      ...s,
      responses: s.responses.filter((r) => normalizeCohort(r.responses?.program_variant ?? r.responses?._cohort_track) === cohort),
    }));

    // Export each survey as a separate sheet-like section in one CSV
    let combinedCsv = "";
    for (const section of filteredSections) {
      if (section.responses.length === 0) continue;

      const allKeys = new Set<string>();
      for (const r of section.responses) {
        const flat = flattenResponse(r.responses as Record<string, unknown>);
        for (const key of Object.keys(flat)) {
          allKeys.add(key);
        }
      }
      const priorityKeys = ["full_name", "email", "first_name", "last_name", "cohort", "program_variant", "agreed_at"];
      const sortedKeys = [
        ...priorityKeys.filter((k) => allKeys.has(k)),
        ...Array.from(allKeys).filter((k) => !priorityKeys.includes(k)).sort(),
      ];

      const header = ["Email", "Submitted At", "Cohort", ...sortedKeys.map(escapeCsvCell)].join(",");
      const rows = section.responses.map((r) => {
        const flat = flattenResponse(r.responses as Record<string, unknown>);
        const cohortLabel = String(r.responses?.program_variant ?? r.responses?._cohort_track ?? r.responses?.cohort ?? "");
        return [
          escapeCsvCell(r.email),
          escapeCsvCell(r.completed_at),
          escapeCsvCell(cohortLabel),
          ...sortedKeys.map((k) => escapeCsvCell(flat[k])),
        ].join(",");
      });

      combinedCsv += `\n# ${section.survey.title}\n`;
      combinedCsv += [header, ...rows].join("\n") + "\n";
    }

    const filename = `${slug}-all-surveys${cohortSlug}-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(combinedCsv.trim(), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // All cohorts, all surveys — summary view
  const header = ["Survey", "Email", "Submitted At", "Cohort"].join(",");
  const rows = allResponses.map((r) =>
    [escapeCsvCell(r.surveyTitle), escapeCsvCell(r.email), escapeCsvCell(r.completedAt), escapeCsvCell(r.cohort)].join(",")
  );

  const csv = [header, ...rows].join("\n");
  const filename = `${slug}-survey-summary${cohortSlug}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
