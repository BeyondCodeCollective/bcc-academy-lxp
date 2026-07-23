export type Student = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  sport: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: "student" | "instructor" | "admin" | "super_admin";
  /** Staff (BGC/BCC employee) — Lunch & Learns only, excluded from learner metrics. */
  is_staff: boolean;
  cohort_id: string | null;
  location: string | null;
  date_of_birth: string | null;
  zip: string | null;
  state: string | null;
  education_level: string | null;
  onboarding_completed: boolean;
  created_at: string;
  last_seen_at: string | null;
  last_activity_at: string | null;
};

export type Cohort = {
  id: string;
  name: string;
  display_name: string | null;
  track_slug: string | null;
  start_date: string | null;
  end_date: string | null;
  total_weeks: number | null;
  created_at: string;
};

export type Session = {
  id: string;
  cohort_id: string;
  week_number: number;
  session_number: number;
  title: string;
  description: string | null;
  session_date: string | null;
  start_time: string | null;
  end_time: string | null;
  meeting_link: string | null;
  status: "upcoming" | "completed" | "cancelled";
  created_at: string;
};

export type Resource = {
  id: string;
  cohort_id: string;
  title: string;
  description: string | null;
  category: "course_materials" | "recordings" | "career_prep" | "program_info";
  url: string | null;
  created_at: string;
};
