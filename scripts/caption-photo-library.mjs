// One-time overnight pass: give every seeded (Pexels) photo a real AI caption
// and tags, replacing the alt-text-plus-search-query stand-ins, so the hero
// picker matches on what's actually in each photo. Re-runnable: only rows
// whose description still carries the "(search: …)" stand-in are re-captioned.
//
// Auth: the Vercel AI Gateway (same route the app uses). Locally, pull a fresh
// OIDC token first — the direct Anthropic key in .env.local has no credits:
//   vercel env pull /tmp/env.vercel --environment=preview --yes
//   VERCEL_OIDC_TOKEN=$(grep '^VERCEL_OIDC_TOKEN=' /tmp/env.vercel | cut -d'"' -f2) \
//     node --env-file=.env.local scripts/caption-photo-library.mjs

import { generateObject, jsonSchema } from "ai";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Missing SUPABASE env.");
  process.exit(1);
}
if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
  console.error("Set AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN (see header comment).");
  process.exit(1);
}

const supaHeaders = {
  apikey: SUPA_KEY,
  Authorization: `Bearer ${SUPA_KEY}`,
  "Content-Type": "application/json",
};

const SCHEMA = jsonSchema({
  type: "object",
  additionalProperties: false,
  required: ["description", "tags"],
  properties: {
    description: {
      type: "string",
      description:
        "One sentence: subject, setting, mood. Apparent ages and settings matter for matching.",
    },
    tags: {
      type: "array",
      items: { type: "string" },
      description: "5-10 lowercase keywords: subjects, activities, mood, dominant colors.",
    },
  },
});

const res = await fetch(
  `${SUPA_URL}/rest/v1/media_library?select=id,url,description&description=like.*(search:*&order=created_at.asc`,
  { headers: supaHeaders },
);
const rows = await res.json();
console.log(`${rows.length} photos still carry stand-in captions.`);

let done = 0;
let failed = 0;

async function captionOne(row) {
  const { object } = await generateObject({
    model: "google/gemini-2.5-flash",
    schema: SCHEMA,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Caption this stock photo for a searchable library used to pick course hero images for a tech-education nonprofit.",
          },
          { type: "image", image: new URL(row.url) },
        ],
      },
    ],
  });

  const patch = await fetch(`${SUPA_URL}/rest/v1/media_library?id=eq.${row.id}`, {
    method: "PATCH",
    headers: supaHeaders,
    body: JSON.stringify({ description: object.description, tags: object.tags }),
  });
  if (!patch.ok) throw new Error(`patch ${patch.status}`);
}

// Four at a time: quick enough for an overnight run, gentle on rate limits.
const queue = [...rows];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const row = queue.shift();
      try {
        await captionOne(row);
        done++;
      } catch (err) {
        failed++;
        console.error(`✗ ${row.id}: ${err.message?.slice(0, 120)}`);
      }
      if ((done + failed) % 25 === 0) console.log(`…${done + failed}/${rows.length}`);
    }
  }),
);

console.log(`Done: ${done} captioned, ${failed} failed (re-run to retry failures).`);
