// Gives an existing course the landing page and art it would have received
// had it been created through the admin course builder. Courses made before
// PR #1072 — or by any path that bypasses createCourseAction — have neither.
//
//   node --env-file=.env.local scripts/backfill-course-landing.mjs <track-slug> [--no-art]
//   node --env-file=.env.local scripts/backfill-course-landing.mjs --list
//
// Needs gateway auth for the copy/art steps (AI_GATEWAY_API_KEY, or a fresh
// VERCEL_OIDC_TOKEN from `vercel env pull`). --no-art skips both and just
// files the landing page, which needs no model at all.
//
// The page is created UNPUBLISHED, exactly like ensureLandingForCourse does:
// nothing goes public until someone reviews it.

import { generateObject, experimental_generateImage as generateImage, gateway, jsonSchema } from "ai";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Missing SUPABASE env.");
  process.exit(1);
}
const h = {
  apikey: SUPA_KEY,
  Authorization: `Bearer ${SUPA_KEY}`,
  "Content-Type": "application/json",
};

const args = process.argv.slice(2);
const noArt = args.includes("--no-art");
const slug = args.find((a) => !a.startsWith("--"));

const api = async (path, init) => {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, { ...init, headers: h });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
};

// --list: which courses are missing a landing page.
if (args.includes("--list") || !slug) {
  const tracks = await api("track_overrides?select=track_slug,name,cover_image_url&archived_at=is.null");
  const pages = await api("landing_pages?select=slug,track_slug");
  const have = new Set(pages.flatMap((p) => [p.slug, p.track_slug]).filter(Boolean));
  const missing = tracks.filter((t) => !have.has(t.track_slug));
  console.log(`${missing.length} of ${tracks.length} courses have no landing page:\n`);
  for (const t of missing) {
    console.log(`  ${t.track_slug.padEnd(42)} ${t.cover_image_url ? "has cover" : "no cover"}`);
  }
  console.log(`\nRun with a slug to backfill one.`);
  process.exit(0);
}

const [track] = await api(
  `track_overrides?select=*&track_slug=eq.${encodeURIComponent(slug)}`,
);
if (!track) {
  console.error(`No course with slug "${slug}".`);
  process.exit(1);
}

const [existing] = await api(
  `landing_pages?select=slug&or=(slug.eq.${encodeURIComponent(slug)},track_slug.eq.${encodeURIComponent(slug)})`,
);
if (existing) {
  console.error(`A landing page already exists for "${slug}" — nothing to do.`);
  process.exit(1);
}

const [program] = await api(`programs?select=slug&id=eq.${track.program_id}`);
const sessions = await api(
  `session_content?select=week_number,title,objectives&track=eq.${encodeURIComponent(slug)}&order=week_number`,
);

console.log(`Backfilling ${track.name} (${slug})`);

// ── 1. Landing copy ────────────────────────────────────────────────────
const summary = [
  track.name,
  track.description,
  (sessions[0]?.objectives ?? []).join("; "),
  (track.week_summaries ?? []).map((w) => w.topic).filter(Boolean).join(", "),
]
  .filter(Boolean)
  .join("\n")
  .slice(0, 3000);

let copy = {
  headline: track.name,
  subhead: "",
  eyebrow: "",
  bodySections: [],
};

if (!noArt) {
  const { object } = await generateObject({
    model: "google/gemini-2.5-flash",
    schema: jsonSchema({
      type: "object",
      additionalProperties: false,
      required: ["headline", "subhead", "eyebrow", "bodySections"],
      properties: {
        headline: { type: "string" },
        subhead: { type: "string" },
        eyebrow: { type: "string", description: 'Tiny kicker, e.g. "Free · 13 weeks". Empty if nothing fits.' },
        bodySections: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["heading", "body", "emphasis"],
            properties: {
              heading: { type: "string" },
              body: { type: "string" },
              emphasis: { type: "boolean" },
            },
          },
        },
      },
    }),
    system:
      "You write landing page copy for BCC Academy. Use only what the course says — never invent prices, partners, or logistics. Warm, concrete, no hype, no em dashes. Write US English, never British spellings: use organization, program, enrollment, behavior, color, center, analyze, recognize. Sections must differ in kind (an overview, a bulleted what-happens list, a short outcome) so the page has rhythm. Keep each block to 2-3 sentences and use "- " bulleted lines wherever the content is really a list — walls of paragraph text are what make a long page unreadable. mark exactly ONE section emphasis=true — the outcome or strongest claim.",
    prompt: `Write the landing page copy for this course.\n\n${summary}`,
  });
  copy = object;
  console.log(`  copy: "${copy.headline}" + ${copy.bodySections.length} sections`);
}

// ── 2. Hero photo from the library ─────────────────────────────────────
let heroUrl = null;
if (!noArt) {
  const photos = await api("media_library?select=id,url,description,tags&limit=500");
  const { object: pick } = await generateObject({
    model: "google/gemini-2.5-flash",
    schema: jsonSchema({
      type: "object",
      additionalProperties: false,
      required: ["photoId"],
      properties: { photoId: { type: "string", description: "Best-matching photo id, or empty string if none fits." } },
    }),
    system:
      "You pick a hero photo for a course landing page. Choose one only when it genuinely matches the course's subject or audience — a mismatched photo is worse than none.",
    prompt: `COURSE:\n${summary}\n\nLIBRARY:\n${photos
      .map((p) => `${p.id} — ${p.description ?? ""} [${(p.tags ?? []).join(", ")}]`)
      .join("\n")}`,
  });
  heroUrl = photos.find((p) => p.id === pick.photoId)?.url ?? null;
  console.log(`  hero: ${heroUrl ? "matched from library" : "no match"}`);
}

// ── 3. Branded cover illustration ──────────────────────────────────────
let coverUrl = null;
if (!noArt && !track.cover_image_url) {
  try {
    const { image } = await generateImage({
      model: gateway.imageModel("recraft/recraft-v3"),
      prompt: `Flat vector-style editorial illustration for a tech-education course cover, 16:9.
Subject: ${track.name}. ${(track.description ?? "").slice(0, 300)}
Style: near-black matte ground with one or two large soft radial glows behind the subject and a faint dot grid on one side. Centered bespoke flat illustration of the course subject built from simple geometric shapes, tilted about 3 degrees, with small in-world details. Modern, matte, confident. Absolutely no text, no letters, no words, no logos, no watermarks, no photorealism, no rainbow gradients.`,
      size: "1820x1024",
    });
    const mediaType = image.mediaType ?? "image/png";
    const ext = mediaType.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
    const path = `covers/${crypto.randomUUID()}.${ext}`;
    const up = await fetch(`${SUPA_URL}/storage/v1/object/landing/${path}`, {
      method: "POST",
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": mediaType },
      body: Buffer.from(image.uint8Array),
    });
    if (!up.ok) throw new Error(`upload ${up.status}`);
    coverUrl = `${SUPA_URL}/storage/v1/object/public/landing/${path}`;
    console.log("  cover: generated");
  } catch (err) {
    console.error(`  cover: failed (${err.message?.slice(0, 90)}) — continuing without it`);
  }
}

// One pickable cohort: the course's own start date.
const sessionOptions = track.start_date
  ? [
      {
        id: `${slug}-${track.start_date}`,
        label: new Date(`${track.start_date}T12:00:00Z`).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          timeZone: "UTC",
        }),
        startUtc: track.kickoff_time_utc ?? null,
        timezone: "America/New_York",
      },
    ]
  : [];

// ── 4. Write ───────────────────────────────────────────────────────────
await api("landing_pages", {
  method: "POST",
  body: JSON.stringify({
    slug,
    program_id: track.program_id,
    track_slug: slug,
    published: false, // reviewed before it goes public, same as the builder
    header_label: "BCC Academy",
    headline: copy.headline?.trim() || track.name,
    subhead: copy.subhead?.trim() || null,
    eyebrow: copy.eyebrow?.trim() || null,
    accent: "#1a1a1a",
    // A cohort date turns on the real signup form (name, email, ZIP, date)
    // instead of the bare email box.
    native_enroll: sessionOptions.length > 0,
    schedule: (track.week_summaries ?? [])
      .filter((w) => w.date && w.topic)
      .map((w) => ({
        label: new Date(`${w.date}T12:00:00Z`).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }),
        title: w.topic,
      })),
    partners: [],
    sessions: sessionOptions,
    body_sections: (copy.bodySections ?? []).filter((s) => s.heading?.trim() && s.body?.trim()),
    hero_image_url: heroUrl,
    og_image: coverUrl,
    updated_at: new Date().toISOString(),
  }),
});

if (coverUrl) {
  await api(`track_overrides?id=eq.${track.id}`, {
    method: "PATCH",
    body: JSON.stringify({ cover_image_url: coverUrl }),
  });
}

const prefix = program?.slug ?? "bcc";
console.log(`\n✓ Landing page created (unpublished) at /${prefix}/${slug}`);
console.log(`  Review and publish: /dashboard/admin/landing/${slug}`);
