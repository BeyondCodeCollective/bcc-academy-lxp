// Event management (phase 1). Shared constants, types, and formatting only:
// this file is imported by client components, so no server imports here.
// An event registration is one parent/guardian plus one attendee row per child.
// Attendees are NOT accounts: nothing here touches the students table.

export type EventRow = {
  id: string;
  program_id: string;
  slug: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  location: string | null;
  join_url: string | null;
  capacity: number | null;
  max_attendees_per_registration: number;
  status: "draft" | "open" | "closed";
};

export const EVENT_COLUMNS =
  "id, program_id, slug, title, description, starts_at, ends_at, timezone, location, join_url, capacity, max_attendees_per_registration, status";

// Per-attendee fields, mirroring the participant block BGC already asks for on
// Hivebrite so the roster carries the same information on day one.
export const ATTENDEE_SELECTS = {
  grade: ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "Not in school"],
  school_type: ["Public", "Charter", "Private", "Homeschool", "Other"],
  gender: ["Girl / Woman", "Boy / Man", "Non-binary", "Prefer to self-describe", "Prefer not to say"],
  race_ethnicity: [
    "Black or African American",
    "Hispanic or Latino/a",
    "Asian",
    "Native American or Alaska Native",
    "Native Hawaiian or Pacific Islander",
    "White",
    "Two or more races",
    "Prefer not to say",
  ],
  tshirt_size: ["Youth S", "Youth M", "Youth L", "Adult S", "Adult M", "Adult L", "Adult XL", "Adult 2XL"],
  experience_level: ["No experience yet", "A little (tried a few lessons)", "Some (built a small project)", "A lot (codes regularly)"],
  eligibility: [
    "Free or reduced-price lunch",
    "SNAP, TANF, or WIC",
    "Title I school",
    "None of these",
    "Prefer not to say",
  ],
} as const;

export type AttendeeSelectField = keyof typeof ATTENDEE_SELECTS;

export const ATTENDEE_TEXT_FIELDS = [
  "first_name",
  "last_name",
  "date_of_birth",
  "school_name",
  "allergies",
  "emergency_contact_name",
  "emergency_contact_phone",
] as const;

export type AttendeeField = (typeof ATTENDEE_TEXT_FIELDS)[number] | AttendeeSelectField;

export type AttendeeInput = Record<AttendeeField, string>;

export const ATTENDEE_FIELDS: AttendeeField[] = [
  ...ATTENDEE_TEXT_FIELDS,
  ...(Object.keys(ATTENDEE_SELECTS) as AttendeeSelectField[]),
];

export function emptyAttendee(): AttendeeInput {
  return Object.fromEntries(ATTENDEE_FIELDS.map((f) => [f, ""])) as AttendeeInput;
}

/** "Saturday, November 7 · 9:00 AM – 11:00 AM PST", in the event's own timezone. */
export function formatEventWhen(startsAt: string, endsAt: string | null, timezone: string): string {
  const start = new Date(startsAt);
  const date = start.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: timezone,
  });
  const time = (d: Date, withZone: boolean) =>
    d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
      ...(withZone ? { timeZoneName: "short" } : {}),
    });
  if (!endsAt) return `${date} · ${time(start, true)}`;
  return `${date} · ${time(start, false)} – ${time(new Date(endsAt), true)}`;
}
