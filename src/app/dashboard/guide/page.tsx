import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { getProgram } from "@/lib/programs/server";
import { canAccessAdminPanel } from "@/lib/roles";
import {
  Video,
  ClipboardText,
  ChatCircleDots,
  CheckCircle,
  UploadSimple,
  MegaphoneSimple,
  ChartBar,
} from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

export default async function InstructorGuidePage() {
  const program = await getProgram();
  const ctx = await getSessionContext();
  if (!ctx?.student) redirect("/");

  const role = ctx.student.role ?? "student";
  if (!canAccessAdminPanel(role)) redirect("/dashboard");

  const weeklyTracks = program.tracks.filter((t) => t.type === "weekly");
  const singleEventTracks = program.tracks.filter(
    (t) => t.type === "single-event"
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Instructor Guide
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            How to manage your {program.name} tracks
          </p>
        </div>

        {/* Session Content */}
        <GuideSection
          icon={<Video size={22} weight="bold" />}
          title="Adding Meeting Links & Recordings"
        >
          <ol className="space-y-2 text-sm text-neutral-700 list-decimal list-inside">
            <li>
              Go to <strong>Admin → Content</strong> tab
            </li>
            <li>Select your track and the week you want to update</li>
            <li>
              Add the <strong>meeting link</strong> before each session so
              students can join directly from their dashboard
            </li>
            <li>
              After the session, add the <strong>recording URL</strong> — it
              appears on the student&apos;s week page automatically
            </li>
            <li>
              Optionally update the week title, description, or objectives if
              content changed
            </li>
          </ol>
        </GuideSection>

        {/* Submissions & Reflections */}
        <GuideSection
          icon={<ClipboardText size={22} weight="bold" />}
          title="Reviewing Submissions & Reflections"
        >
          <ol className="space-y-2 text-sm text-neutral-700 list-decimal list-inside">
            <li>
              Go to <strong>Admin → Submissions</strong> or{" "}
              <strong>Reflections</strong> tab
            </li>
            <li>
              Filter by track — you&apos;ll see all student work for your
              assigned tracks
            </li>
            <li>
              Click on any entry to read the full submission and leave{" "}
              <strong>feedback</strong>
            </li>
            <li>
              Students receive your feedback on their dashboard — keep it
              constructive and specific
            </li>
          </ol>
          {weeklyTracks.length > 0 && (
            <p className="mt-3 text-xs text-neutral-500">
              Tracks with submissions enabled:{" "}
              {weeklyTracks
                .filter((t) => t.submissionsEnabled !== false)
                .map((t) => t.name)
                .join(", ") || "None currently"}
            </p>
          )}
        </GuideSection>

        {/* Attendance */}
        <GuideSection
          icon={<CheckCircle size={22} weight="bold" />}
          title="Tracking Attendance"
        >
          <ol className="space-y-2 text-sm text-neutral-700 list-decimal list-inside">
            <li>
              Go to <strong>Admin → Attendance</strong> tab
            </li>
            <li>Select the track and week</li>
            <li>
              Check off students who attended each session — this data feeds into
              engagement tracking
            </li>
          </ol>
        </GuideSection>

        {/* AI Tutor section temporarily hidden pre-launch.
            See dashboard/layout.tsx for the matching showTutor=false override. */}

        {/* Announcements */}
        <GuideSection
          icon={<MegaphoneSimple size={22} weight="bold" />}
          title="Posting Announcements"
        >
          <ul className="space-y-2 text-sm text-neutral-700 list-disc list-inside">
            <li>
              Go to <strong>Admin → Students</strong> tab to post a message that
              appears as a banner on all students&apos; dashboards
            </li>
            <li>
              Use announcements for schedule changes, reminders, or
              encouragement
            </li>
            <li>Announcements expire automatically after the date you set</li>
          </ul>
        </GuideSection>

        {/* Single-event tracks */}
        {singleEventTracks.length > 0 && (
          <GuideSection
            icon={<UploadSimple size={22} weight="bold" />}
            title="Single-Event Tracks"
          >
            <ul className="space-y-2 text-sm text-neutral-700 list-disc list-inside">
              <li>
                Single-event tracks ({singleEventTracks.map((t) => t.name).join(", ")}) require students to
                complete an intake form before accessing session content
              </li>
              <li>
                Intake responses are visible in the <strong>Surveys</strong> tab
              </li>
              <li>
                These tracks don&apos;t have weekly submissions or reflections
              </li>
            </ul>
          </GuideSection>
        )}

        {/* Data & Export */}
        <GuideSection
          icon={<ChartBar size={22} weight="bold" />}
          title="Data & Exports"
        >
          <ul className="space-y-2 text-sm text-neutral-700 list-disc list-inside">
            <li>
              Attendance data can be exported as CSV from the Attendance tab
            </li>
            <li>
              Survey responses can be exported from the Surveys tab
            </li>
            <li>
              All data is scoped to your program — instructors only see their
              assigned tracks
            </li>
          </ul>
        </GuideSection>
      </div>
    </div>
  );
}

function GuideSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
          {icon}
        </div>
        <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}
