import { ComingSoon } from "@/components/coming-soon";

// TEMP: Resources is discoverable (nav + search) but not live yet. Previously
// this redirected to /dashboard/help#instructors.
export default function ResourcesPage() {
  return (
    <ComingSoon
      title="Resources"
      message="Course materials, links, and contacts will live here soon."
    />
  );
}
