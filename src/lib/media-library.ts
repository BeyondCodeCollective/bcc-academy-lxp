// The photo library behind auto-set hero images. Photos are bulk-uploaded by
// admins (Death to Stock packs, mostly), AI-captioned once on upload, and
// picked from at course-creation time. Nothing here blocks a course: every
// caller treats a miss or an error as "no photo".

import { generateObject, jsonSchema } from "ai";
import type { createServiceClient } from "@/lib/supabase/server";

// Same gateway routing as the tutor and the course importer.
const MODEL = "google/gemini-2.5-flash";

export type LibraryPhoto = {
  id: string;
  url: string;
  path: string;
  source: string;
  description: string | null;
  tags: string[];
  createdAt: string;
};

type Svc = ReturnType<typeof createServiceClient>;

function rowToPhoto(row: Record<string, unknown>): LibraryPhoto {
  return {
    id: row.id as string,
    url: row.url as string,
    path: row.path as string,
    source: (row.source as string) ?? "dts",
    description: (row.description as string | null) ?? null,
    tags: (row.tags as string[] | null) ?? [],
    createdAt: row.created_at as string,
  };
}

export async function listLibraryPhotos(svc: Svc): Promise<LibraryPhoto[]> {
  const { data } = await svc
    .from("media_library")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  return (data ?? []).map(rowToPhoto);
}

const TAG_SCHEMA = jsonSchema<{ description: string; tags: string[] }>({
  type: "object",
  additionalProperties: false,
  required: ["description", "tags"],
  properties: {
    description: {
      type: "string",
      description: "One sentence: subject, setting, mood. Written for matching, not marketing.",
    },
    tags: {
      type: "array",
      items: { type: "string" },
      description: "5-10 lowercase keywords: subjects, activities, mood, dominant colors.",
    },
  },
});

/** Caption a freshly uploaded photo so the picker can match against it. */
export async function tagPhoto(
  imageBytes: Buffer,
  mediaType: string,
): Promise<{ description: string; tags: string[] }> {
  const { object } = await generateObject({
    model: MODEL,
    schema: TAG_SCHEMA,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Caption this stock photo for a searchable library used to pick course hero images.",
          },
          { type: "file", data: imageBytes.toString("base64"), mediaType },
        ],
      },
    ],
  });
  return object;
}

const PICK_SCHEMA = jsonSchema<{ photoId: string; searchQuery: string }>({
  type: "object",
  additionalProperties: false,
  required: ["photoId", "searchQuery"],
  properties: {
    photoId: {
      type: "string",
      description:
        "The id of the best-matching library photo, or empty string if none genuinely fits the course.",
    },
    searchQuery: {
      type: "string",
      description:
        "2-4 word stock-photo search query for this course (used as fallback), e.g. 'teens coding laptop'.",
    },
  },
});

/** Pick the best library photo for a course, or return a stock-search query
 *  when the library has nothing that fits. */
export async function pickLibraryPhoto(
  svc: Svc,
  courseSummary: string,
): Promise<{ photo: LibraryPhoto | null; searchQuery: string }> {
  const photos = await listLibraryPhotos(svc);
  const catalog = photos
    .map((p) => `${p.id} — ${p.description ?? ""} [${p.tags.join(", ")}]`)
    .join("\n");

  const { object } = await generateObject({
    model: MODEL,
    schema: PICK_SCHEMA,
    system:
      "You pick a hero photo for a course landing page. Choose a library photo only when it genuinely matches the course's subject or audience mood — a mismatched photo is worse than none. Always provide the fallback search query.",
    prompt: `COURSE:\n${courseSummary}\n\nLIBRARY (${photos.length} photos):\n${catalog || "(empty)"}`,
  });

  const photo = photos.find((p) => p.id === object.photoId) ?? null;
  return { photo, searchQuery: object.searchQuery };
}

/** Search Pexels for a landscape hero photo. Returns null without a key —
 *  the library is the primary source; this is only the fallback. */
export async function searchPexelsPhoto(
  query: string,
): Promise<{ url: string; photographer: string } | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key || !query.trim()) return null;

  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&size=large&per_page=1`,
    { headers: { Authorization: key } },
  );
  if (!res.ok) return null;
  const json = (await res.json()) as {
    photos?: Array<{ src?: { large2x?: string; large?: string }; photographer?: string }>;
  };
  const hit = json.photos?.[0];
  const url = hit?.src?.large2x ?? hit?.src?.large;
  return url ? { url, photographer: hit?.photographer ?? "" } : null;
}
