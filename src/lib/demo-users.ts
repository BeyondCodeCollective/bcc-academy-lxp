import type { Role } from "@/lib/roles";

export type DemoUser = {
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
};

// Dev demo users — all example.com, no real PII.
const SUPER_ADMINS: DemoUser[] = [
  {
    email: "admin@example.com",
    first_name: "Admin",
    last_name: "User",
    role: "super_admin",
  },
];

const ADMINS: DemoUser[] = [
  {
    email: "admin2@example.com",
    first_name: "Admin",
    last_name: "Two",
    role: "admin",
  },
];

const INSTRUCTORS: DemoUser[] = [
  {
    email: "instructor@example.com",
    first_name: "Instructor",
    last_name: "User",
    role: "instructor",
  },
];

const STUDENTS: DemoUser[] = [
  {
    email: "student@example.com",
    first_name: "Student",
    last_name: "User",
    role: "student",
  },
];

export const DEMO_USERS = [...SUPER_ADMINS, ...ADMINS, ...INSTRUCTORS, ...STUDENTS];

export function getDemoUser(email: string): DemoUser | null {
  return (
    DEMO_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    ) || null
  );
}

export const DEMO_COOKIE = "atg-demo-user";
