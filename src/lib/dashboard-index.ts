// Single source for the dashboard's content index, used by BOTH the ⌘K search
// (searchItems) and the breadcrumb trail (labels: href → human name). Wrapped in
// React cache() so the two shell components that call it share one execution
// (and the two DB queries) per request.
//
// `labels` maps a concrete route href to its display name so the client-side
// breadcrumb can resolve dynamic segments (course/week/workshop/recording/
// survey/landing/program) without re-querying on navigation.

import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/server";
import { getAllPrograms, getJoinablePrograms } from "@/lib/programs";
import { getAllWorkshops } from "@/lib/workshops";
import { PLATFORM_AUTH_SURVEYS, PLATFORM_PUBLIC_SURVEYS } from "@/lib/surveys/platform";
import type { SearchItem } from "@/components/command-palette";

export type DashboardIndex = {
  searchItems: SearchItem[];
  labels: Record<string, string>;
};

export const getDashboardIndex = cache(async (): Promise<DashboardIndex> => {
  const searchItems: SearchItem[] = [];
  const labels: Record<string, string> = {};
  const seen = new Set<string>();

  // Courses + weeks (in-memory config), deduped by slug since Catalyst
  // aggregates other programs' tracks.
  for (const p of getAllPrograms()) {
    for (const t of p.tracks) {
      const tHref = `/dashboard/track/${t.slug}`;
      if (!seen.has(`t:${t.slug}`)) {
        seen.add(`t:${t.slug}`);
        searchItems.push({ label: t.name, href: tHref, hint: "Course", keywords: t.shortName });
        labels[tHref] = t.name;
        labels[`/dashboard/admin/programs/${t.slug}/edit`] = t.name;
      }
      for (const w of t.weeks ?? []) {
        const key = `w:${t.slug}:${w.week}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const wHref = `${tHref}/${w.week}`;
        searchItems.push({
          label: w.title,
          href: wHref,
          hint: `${t.shortName} · Week ${w.week}`,
          keywords: [w.subtitle, w.description, ...(w.objectives ?? [])].filter(Boolean).join(" "),
        });
        labels[wHref] = w.title;
        // Legacy week routes (/dashboard/mass/[week], /dashboard/techplus/[week])
        // reuse the same week titles.
        if (t.slug === "mass" || t.slug === "techplus") {
          labels[`/dashboard/${t.slug}/${w.week}`] = w.title;
        }
      }
    }
  }

  // Labels-only pass for programs OUTSIDE getAllPrograms (the special configs:
  // BGC, Forte, ATG, Beyond Code Centers). Their course/week routes must still
  // resolve in the breadcrumb trail — without this a BGC camper's crumb fell
  // back to a humanized slug + "Week N". They stay out of ⌘K searchItems,
  // which is scoped to the switchable program list.
  for (const p of getJoinablePrograms()) {
    for (const t of p.tracks) {
      const tHref = `/dashboard/track/${t.slug}`;
      labels[tHref] ??= t.name;
      labels[`/dashboard/admin/programs/${t.slug}/edit`] ??= t.name;
      for (const w of t.weeks ?? []) {
        labels[`${tHref}/${w.week}`] ??= w.title;
      }
    }
  }

  // Workshops (config).
  for (const w of getAllWorkshops()) {
    const href = `/dashboard/workshops/${w.slug}`;
    searchItems.push({ label: w.title, href, hint: "Workshop", keywords: w.description });
    labels[href] = w.title;
  }

  // Survey titles (config) for both the admin survey viewer and the learner
  // survey pages.
  for (const s of [
    ...Object.values(PLATFORM_AUTH_SURVEYS),
    ...Object.values(PLATFORM_PUBLIC_SURVEYS),
    ...getAllPrograms().flatMap((p) => p.surveys ?? []),
  ]) {
    labels[`/dashboard/admin/surveys/${s.id}`] = s.title;
    labels[`/dashboard/survey/${s.id}`] = s.title;
  }

  // DB-only content: Lunch & Learn recordings + landing pages. Resilient — the
  // index simply omits them if the queries fail.
  try {
    const svc = createServiceClient();
    const [rec, land, sessions, dynamicTracks] = await Promise.all([
      svc.from("lunch_learns").select("id, title, presenter, description"),
      svc.from("landing_pages").select("slug, headline"),
      svc.from("session_content").select("track, week_number, title").not("title", "is", null),
      // Courses under admin-created orgs (is_dynamic) have no TS config, so
      // the config passes above never label them.
      svc
        .from("track_overrides")
        .select("track_slug, name, programs!inner(is_dynamic)")
        .eq("programs.is_dynamic", true),
    ]);
    for (const t of dynamicTracks.data ?? []) {
      const name = (t.name as string) ?? (t.track_slug as string);
      labels[`/dashboard/track/${t.track_slug}`] ??= name;
      labels[`/dashboard/admin/programs/${t.track_slug}/edit`] ??= name;
    }
    // Admin-edited session titles override the config week titles so the
    // breadcrumb matches what the page actually displays.
    for (const s of sessions.data ?? []) {
      if (s.title) labels[`/dashboard/track/${s.track}/${s.week_number}`] = s.title as string;
    }
    for (const r of rec.data ?? []) {
      const href = `/dashboard/lunch-learn/${r.id}`;
      searchItems.push({
        label: r.title,
        href,
        hint: r.presenter ? `Lunch & Learn · ${r.presenter}` : "Lunch & Learn",
        keywords: r.description ?? undefined,
      });
      labels[href] = r.title;
    }
    for (const l of land.data ?? []) {
      labels[`/dashboard/admin/landing/${l.slug}`] = (l.headline as string) || l.slug;
    }
  } catch {
    // non-fatal
  }

  return { searchItems, labels };
});
