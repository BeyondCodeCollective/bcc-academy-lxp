// Fake fixtures for the Supabase stub. All data invented; example.test emails.
const iso = (d) => d.toISOString().slice(0, 10);
const today = new Date();
const addDays = (n) => new Date(today.getTime() + n * 86400000);

export const PROGRAM_ID = "00000000-0000-4000-8000-000000000001";
export const COHORT_ID = "00000000-0000-4000-8000-0000000000c1";

const cohort = {
  id: COHORT_ID, name: "e2e-cohort", display_name: "E2E Cohort",
  start_date: iso(addDays(-14)), end_date: iso(addDays(60)), total_weeks: 8, created_at: "2026-01-01T00:00:00Z",
};

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
// Fake HS256-shaped JWT (not signed). The stub recognises it by exact string;
// supabase-js falls back to GET /auth/v1/user for HS* tokens.
export const fakeJwt = (id, email) =>
  `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: id, email, role: "authenticated", aud: "authenticated", exp: 4102444800 })}.e2e`;

const RAW_USERS = [
  { key: "student", id: "10000000-0000-4000-8000-000000000001", email: "student@example.test", token: "e2e-token-student", role: "student", first: "Sam", last: "Student", tracks: ["mass"] },
  { key: "future", id: "10000000-0000-4000-8000-000000000006", email: "future@example.test", role: "student", first: "Fay", last: "Future", tracks: ["techplus"] },
  { key: "empty", id: "10000000-0000-4000-8000-000000000002", email: "empty@example.test", token: "e2e-token-empty", role: "student", first: "Erin", last: "Empty", tracks: [] },
  { key: "instructor", id: "10000000-0000-4000-8000-000000000003", email: "instructor@example.test", token: "e2e-token-instructor", role: "instructor", first: "Ivy", last: "Instructor", tracks: [], teaches: ["mass"] },
  { key: "admin", id: "10000000-0000-4000-8000-000000000004", email: "admin@example.test", token: "e2e-token-admin", role: "admin", first: "Ada", last: "Admin", tracks: [] },
  { key: "super", id: "10000000-0000-4000-8000-000000000005", email: "super@example.test", token: "e2e-token-super", role: "super_admin", first: "Sue", last: "Super", tracks: [] },
];

export const USERS = RAW_USERS.map((u) => ({ ...u, token: fakeJwt(u.id, u.email) }));

export function sessionCookie(u) {
  const sess = { access_token: u.token, refresh_token: "r", expires_at: 4102444800, expires_in: 86400, token_type: "bearer", user: { id: u.id, email: u.email, aud: "authenticated" } };
  return { name: "sb-localhost-auth-token", value: "base64-" + Buffer.from(JSON.stringify(sess)).toString("base64url") };
}

export function FIXTURES(/* caller */) {
  const students = USERS.map((u) => ({
    id: u.id, email: u.email, first_name: u.first, last_name: u.last, avatar_url: null, role: u.role,
    is_staff: false, is_test: false, cohort_id: COHORT_ID, program_id: PROGRAM_ID, onboarding_completed: true,
    welcome_seen_at: "2026-01-02T00:00:00Z", cohorts: cohort, zip: "30301", date_of_birth: "2000-01-01",
  }));
  return {
    programs: [{ id: PROGRAM_ID, slug: "atg", name: "Beyond the Game", is_dynamic: false }, { id: "00000000-0000-4000-8000-000000000002", slug: "catalyst", name: "Catalyst", is_dynamic: false }],
    cohorts: [cohort],
    students,
    student_tracks: USERS.flatMap((u) => u.tracks.map((t) => ({ student_id: u.id, track_slug: t, program_id: PROGRAM_ID, enrolled_at: "2026-01-03T00:00:00Z", status: "active" }))),
    instructor_tracks: USERS.flatMap((u) => (u.teaches || []).map((t) => ({ student_id: u.id, track_slug: t, program_id: PROGRAM_ID }))),
    track_overrides: [{ track_slug: "techplus", program_id: PROGRAM_ID, programs: { slug: "atg" }, start_date: iso(addDays(30)), total_weeks: 6 }],
    allowed_signup_emails: [{ email: "invited@example.test", track_slug: "mass" }],
    applications: [{
      id: "20000000-0000-4000-8000-000000000001", slug: "e2e-open-app", program_id: PROGRAM_ID, track_slug: null,
      title: "E2E Open Application", description: "Fixture application used by local E2E.",
      questions: [
        { type: "text", id: "why", label: "Why do you want to join?", required: true },
      ],
      hidden_questions: [], open: true, closes_at: null, notify_email: null, created_at: "2026-01-01T00:00:00Z",
    }],
    landing_pages: [{
      slug: "e2e-landing", published: true, program_id: PROGRAM_ID, programs: { slug: "atg" }, header_label: "BCC Academy",
      eyebrow: "E2E", headline: "E2E Landing Headline", subhead: "Fixture landing page.", accent: "#1D59FF",
      schedule: [], partners: [], body_sections: [], sessions: [], signup_questions: [], native_enroll: false,
      coming_soon: false, hide_age_zip: false, enroll_on_signup: false,
    }],
    session_content: [],
  };
}
