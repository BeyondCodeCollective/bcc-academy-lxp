import { Mail } from "lucide-react";

const instructors = [
  {
    name: "Kobie Joyner",
    role: "Instructor, CompTIA Tech+ Foundations",
    email: "kkjoyner@gmail.com",
  },
  {
    name: "Ramon Clemente",
    role: "Program Lead, After The Game",
    email: null,
  },
];

export function InstructorInfo() {
  return (
    <div className="rounded-lg border border-border p-4">
      <h3 className="mb-3 text-sm font-semibold text-muted uppercase tracking-wide">
        Your Team
      </h3>
      <div className="space-y-3">
        {instructors.map((i) => (
          <div key={i.name} className="flex items-start justify-between">
            <div>
              <p className="font-medium text-foreground">{i.name}</p>
              <p className="text-sm text-muted">{i.role}</p>
            </div>
            {i.email && (
              <a
                href={`mailto:${i.email}`}
                className="mt-1 text-primary hover:text-primary-hover"
                aria-label={`Email ${i.name}`}
              >
                <Mail size={18} />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
