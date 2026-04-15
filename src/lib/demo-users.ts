import type { Role } from "@/lib/roles";

export type DemoUser = {
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
};

// Super admin
const SUPER_ADMINS: DemoUser[] = [
  {
    email: "fonz.morris@wearebgc.org",
    first_name: "Fonz",
    last_name: "Morris",
    role: "super_admin",
  },
];

// Admins
const ADMINS: DemoUser[] = [
  {
    email: "ramon.clemente@wearebgc.org",
    first_name: "Ramon",
    last_name: "Clemente",
    role: "admin",
  },
  {
    email: "mancini@wearebgc.org",
    first_name: "Cristina",
    last_name: "Mancini",
    role: "admin",
  },
];

// Instructors
const INSTRUCTORS: DemoUser[] = [
  {
    email: "kkjoyner@gmail.com",
    first_name: "Kobie",
    last_name: "Joyner",
    role: "instructor",
  },
];

// Students — update these emails as needed
const STUDENTS: DemoUser[] = [
  {
    email: "youngfonz@gmail.com",
    first_name: "Fonz",
    last_name: "Test",
    role: "student",
  },
  {
    email: "student2@example.com",
    first_name: "Chris",
    last_name: "Johnson",
    role: "student",
  },
  {
    email: "student3@example.com",
    first_name: "Kendra",
    last_name: "Davis",
    role: "student",
  },
  {
    email: "student4@example.com",
    first_name: "Cameron",
    last_name: "Thompson",
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
