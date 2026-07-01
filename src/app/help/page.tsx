"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type Article = {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  role?: ("student" | "instructor" | "admin" | "super_admin")[];
};

type Section = {
  id: string;
  title: string;
  articles: Article[];
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT DATA
// ─────────────────────────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    articles: [
      {
        id: "what-is-bcc-academy",
        title: "What is BCC Academy?",
        description: "Overview of the platform and who it's for",
        content: <WhatIsBccAcademy />,
      },
      {
        id: "your-first-login",
        title: "Your First Login",
        description: "How to access the platform with magic links",
        content: <YourFirstLogin />,
      },
      {
        id: "dashboard-overview",
        title: "Dashboard Overview",
        description: "Understanding your personalized home screen",
        content: <DashboardOverview />,
      },
    ],
  },
  {
    id: "for-students",
    title: "For Students",
    articles: [
      {
        id: "joining-a-track",
        title: "Joining a Track",
        description: "How to enroll in your first course",
        content: <JoiningATrack />,
        role: ["student"],
      },
      {
        id: "completing-weekly-work",
        title: "Completing Weekly Work",
        description: "Submissions, reflections, and attendance",
        content: <CompletingWeeklyWork />,
        role: ["student"],
      },
      {
        id: "using-the-ai-tutor",
        title: "Using the AI Tutor",
        description: "Get help from your program's AI assistant",
        content: <UsingTheAiTutor />,
        role: ["student"],
      },
      {
        id: "pathway-assessment",
        title: "Pathway Profile Assessment",
        description: "Understanding your learner profile",
        content: <PathwayAssessment />,
        role: ["student"],
      },
      {
        id: "calendar-sync",
        title: "Calendar Sync",
        description: "Add sessions to your personal calendar",
        content: <CalendarSync />,
        role: ["student"],
      },
    ],
  },
  {
    id: "for-instructors",
    title: "For Instructors",
    articles: [
      {
        id: "instructor-overview",
        title: "Instructor Overview",
        description: "What you can do as a track instructor",
        content: <InstructorOverview />,
        role: ["instructor"],
      },
      {
        id: "taking-attendance",
        title: "Taking Attendance",
        description: "Mark who showed up to each session",
        content: <TakingAttendance />,
        role: ["instructor"],
      },
      {
        id: "reviewing-submissions",
        title: "Reviewing Submissions",
        description: "View and track student work",
        content: <ReviewingSubmissions />,
        role: ["instructor"],
      },
      {
        id: "reading-reflections",
        title: "Reading Reflections",
        description: "Understand how students are doing",
        content: <ReadingReflections />,
        role: ["instructor"],
      },
      {
        id: "posting-announcements",
        title: "Posting Announcements",
        description: "Communicate with your cohort",
        content: <PostingAnnouncements />,
        role: ["instructor"],
      },
    ],
  },
  {
    id: "for-admins",
    title: "For Admins",
    articles: [
      {
        id: "admin-overview",
        title: "Admin Overview",
        description: "Managing your program from the admin panel",
        content: <AdminOverview />,
        role: ["admin"],
      },
      {
        id: "adding-people",
        title: "Adding People",
        description: "Invite students, instructors, and other admins",
        content: <AddingPeople />,
        role: ["admin"],
      },
      {
        id: "managing-cohorts",
        title: "Managing Cohorts",
        description: "Organize students by track and cohort",
        content: <ManagingCohorts />,
        role: ["admin"],
      },
      {
        id: "survey-insights",
        title: "Survey Insights",
        description: "Analyze intake and feedback responses",
        content: <SurveyInsights />,
        role: ["admin"],
      },
      {
        id: "engagement-scores",
        title: "Engagement Scores",
        description: "Understanding the four-pillar metric",
        content: <EngagementScores />,
        role: ["admin"],
      },
      {
        id: "self-paced-progress",
        title: "Self-Paced Progress",
        description: "Track students in self-paced courses",
        content: <SelfPacedProgress />,
        role: ["admin"],
      },
    ],
  },
  {
    id: "course-management",
    title: "Course Management",
    articles: [
      {
        id: "creating-tracks",
        title: "Creating Tracks",
        description: "Build new courses from scratch",
        content: <CreatingTracks />,
        role: ["admin", "super_admin"],
      },
      {
        id: "weekly-structure",
        title: "Weekly Structure",
        description: "Configure weeks, content, and gating",
        content: <WeeklyStructure />,
        role: ["admin", "super_admin"],
      },
      {
        id: "content-gating",
        title: "Content Gating",
        description: "Drip-release and sequential unlocking",
        content: <ContentGating />,
        role: ["admin", "super_admin"],
      },
      {
        id: "prerequisites",
        title: "Prerequisites",
        description: "Lock tracks until others are completed",
        content: <Prerequisites />,
        role: ["admin", "super_admin"],
      },
      {
        id: "surveys-and-gates",
        title: "Surveys and Gates",
        description: "Require forms before track access",
        content: <SurveysAndGates />,
        role: ["admin", "super_admin"],
      },
    ],
  },
  {
    id: "platform",
    title: "Platform",
    articles: [
      {
        id: "multi-program",
        title: "Multi-Program Architecture",
        description: "How programs share the platform",
        content: <MultiProgram />,
        role: ["admin", "super_admin"],
      },
      {
        id: "roles-and-permissions",
        title: "Roles and Permissions",
        description: "Student, instructor, admin, super-admin",
        content: <RolesAndPermissions />,
        role: ["admin", "super_admin"],
      },
      {
        id: "preview-as-student",
        title: "Preview as Student",
        description: "See what students see",
        content: <PreviewAsStudent />,
        role: ["super_admin"],
      },
      {
        id: "data-privacy",
        title: "Data Privacy",
        description: "GDPR, COPPA, and withdrawal requests",
        content: <DataPrivacy />,
        role: ["admin", "super_admin"],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ARTICLE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function WhatIsBccAcademy() {
  return (
    <>
      <p className="text-lg text-muted mb-6">
        BCC Academy is a Learning Experience Platform (LXP) built for workforce development programs.
        It handles everything from student enrollment to curriculum delivery to progress tracking —
        all in one place.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">Who uses it?</h3>
      <ul className="space-y-3 mb-6">
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span><strong>Students</strong> — access tracks, submit work, get AI tutoring</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span><strong>Instructors</strong> — take attendance, review submissions, post announcements</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span><strong>Admins</strong> — manage people, view analytics, configure tracks</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span><strong>Super-admins</strong> — cross-program visibility and platform configuration</span>
        </li>
      </ul>

      <h3 className="text-xl font-bold text-ink mb-3">Key philosophy</h3>
      <p className="text-muted mb-4">
        The platform is built on the idea that <strong>the student experience comes first</strong>.
        Every student sees a personalized dashboard based on their actual state — not a generic
        home screen. If they need to complete onboarding, that's what they see. If they have
        a pending survey, that's front and center.
      </p>
      <p className="text-muted">
        This documentation will help you navigate the platform based on your role.
      </p>
    </>
  );
}

function YourFirstLogin() {
  return (
    <>
      <p className="text-lg text-muted mb-6">
        BCC Academy uses magic link authentication — no passwords to remember, no apps to download.
      </p>

      <div className="bg-surface rounded-xl p-6 mb-6">
        <h3 className="font-bold text-ink mb-4">How it works</h3>
        <ol className="space-y-4">
          <li className="flex gap-4">
            <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">1</span>
            <div>
              <p className="font-medium text-ink">Enter your email on the login page</p>
              <p className="text-sm text-muted">Use the same email that was allowlisted for your program</p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">2</span>
            <div>
              <p className="font-medium text-ink">Check your inbox</p>
              <p className="text-sm text-muted">You'll receive an email with a sign-in link from your program's domain</p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">3</span>
            <div>
              <p className="font-medium text-ink">Click the link</p>
              <p className="text-sm text-muted">You're signed in immediately — no password required</p>
            </div>
          </li>
        </ol>
      </div>

      <h3 className="text-xl font-bold text-ink mb-3">Troubleshooting</h3>
      <div className="space-y-4">
        <div className="border-l-4 border-primary pl-4">
          <p className="font-medium text-ink">I didn't get the email</p>
          <p className="text-muted text-sm">Check spam/promotions folders. If it's not there, try again — the platform will resend. If you still don't see it, contact your program admin to verify your email is on the allowlist.</p>
        </div>
        <div className="border-l-4 border-primary pl-4">
          <p className="font-medium text-ink">The link says "expired"</p>
          <p className="text-muted text-sm">Magic links expire after 24 hours for security. Request a fresh one from the login page.</p>
        </div>
        <div className="border-l-4 border-primary pl-4">
          <p className="font-medium text-ink">It says "email not allowlisted"</p>
          <p className="text-muted text-sm">Your program restricts access to approved emails. Contact your admin to get added to the allowlist.</p>
        </div>
      </div>
    </>
  );
}

function DashboardOverview() {
  return (
    <>
      <p className="text-lg text-muted mb-6">
        Your dashboard is personalized based on what you need to do right now.
        No two students see the same screen.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">What you might see</h3>
      <div className="grid gap-4 mb-6">
        <div className="bg-surface rounded-lg p-4">
          <p className="font-bold text-ink mb-1">Welcome video</p>
          <p className="text-sm text-muted">First-time login? You'll see your program's welcome video with a custom message from the team.</p>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <p className="font-bold text-ink mb-1">Pending survey</p>
          <p className="text-sm text-muted">Required intake forms appear here and block track access until completed.</p>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <p className="font-bold text-ink mb-1">Continue learning</p>
          <p className="text-sm text-muted">Your current week in each enrolled track — click to jump straight in.</p>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <p className="font-bold text-ink mb-1">Track grid</p>
          <p className="text-sm text-muted">All your enrolled tracks with progress indicators and quick access.</p>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <p className="font-bold text-ink mb-1">What's New feed</p>
          <p className="text-sm text-muted">Announcements, instructor feedback, and upcoming office hours in one place.</p>
        </div>
      </div>

      <h3 className="text-xl font-bold text-ink mb-3">Track cards</h3>
      <p className="text-muted mb-4">
        Each track you're enrolled in appears as a card showing:
      </p>
      <ul className="space-y-2 mb-6">
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Current week (e.g., "Week 3 of 12")</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Progress bar showing completion</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Quick action to continue or review</span>
        </li>
      </ul>
    </>
  );
}

function JoiningATrack() {
  return (
    <>
      <p className="text-lg text-muted mb-6">
        There are several ways to get enrolled in a track, depending on your program's setup.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">Method 1: Invite link</h3>
      <p className="text-muted mb-4">
        Your admin may send you a track-specific join link. Click it, sign in (or create an account),
        and you're automatically enrolled. This is the most common method.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">Method 2: Dashboard enrollment</h3>
      <p className="text-muted mb-4">
        Some programs show available tracks directly on your dashboard. If you see a track card
        with an "Enroll" button, you can join with one click — no separate link needed.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">Method 3: Admissions funnel</h3>
      <p className="text-muted mb-4">
        Competitive programs may require an application. You'll submit a form, and an admin will
        review it. If accepted, you'll receive a magic link invite automatically.
      </p>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="font-medium text-amber-900 mb-1">Can't see your track?</p>
        <p className="text-sm text-amber-800">
          Make sure you're logged in with the correct email. If you have multiple email addresses,
          the track might be tied to a different one. Contact your program admin for help.
        </p>
      </div>
    </>
  );
}

function CompletingWeeklyWork() {
  return (
    <>
      <p className="text-lg text-muted mb-6">
        Each week in your track has three components: content to review, work to submit,
        and a reflection to write.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">The weekly flow</h3>
      <div className="space-y-4 mb-6">
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-primary font-bold">1</span>
          </div>
          <div>
            <p className="font-medium text-ink">Review the week's content</p>
            <p className="text-sm text-muted">Objectives, session recordings, resources — everything you need for the week.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-primary font-bold">2</span>
          </div>
          <div>
            <p className="font-medium text-ink">Submit your work</p>
            <p className="text-sm text-muted">Upload files or paste links in response to the week's prompts. You can save drafts and come back.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-primary font-bold">3</span>
          </div>
          <div>
            <p className="font-medium text-ink">Write your reflection</p>
            <p className="text-sm text-muted">A short written response about what you learned. This helps instructors understand how you're doing.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-primary font-bold">4</span>
          </div>
          <div>
            <p className="font-medium text-ink">Attend the session</p>
            <p className="text-sm text-muted">Your instructor marks attendance. If you miss it, reach out to them directly.</p>
          </div>
        </div>
      </div>

      <h3 className="text-xl font-bold text-ink mb-3">Saving vs. submitting</h3>
      <p className="text-muted mb-4">
        Your work auto-saves as you type. When you're ready, click "Submit" to finalize it.
        Once submitted, you can still edit until the week closes — just click "Update submission."
      </p>
    </>
  );
}

function UsingTheAiTutor() {
  return (
    <>
      <p className="text-lg text-muted mb-6">
        Each program has its own AI tutor, customized to the curriculum and trained on the
        specific content you're learning.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">Accessing the tutor</h3>
      <p className="text-muted mb-4">
        Look for the "AI Tutor" link in your track navigation or sidebar. Click it to open
        a chat interface where you can ask questions about the curriculum.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">What to ask</h3>
      <ul className="space-y-2 mb-6">
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">"Explain this week's concept in simpler terms"</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">"Help me brainstorm ideas for my submission"</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">"Quiz me on what I should know after Week 4"</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">"Walk me through this coding problem step by step"</span>
        </li>
      </ul>

      <div className="bg-surface rounded-lg p-4">
        <p className="font-medium text-ink mb-1">Your conversations count</p>
        <p className="text-sm text-muted">
          Every message you send to the AI tutor contributes to your engagement score.
          Using the tutor regularly shows you're actively learning.
        </p>
      </div>
    </>
  );
}

function PathwayAssessment() {
  return (
    <>
      <p className="text-lg text-muted mb-6">
        The Pathway Profile Assessment is a psychometric tool that helps you understand
        your learning style, work preferences, and motivations.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">The three modules</h3>
      <div className="space-y-4 mb-6">
        <div className="border-l-4 border-primary pl-4">
          <p className="font-bold text-ink">Module 1: How you show up</p>
          <p className="text-muted text-sm">Likert-scale questions about your strengths and tendencies</p>
        </div>
        <div className="border-l-4 border-primary pl-4">
          <p className="font-bold text-ink">Module 2: How you work</p>
          <p className="text-muted text-sm">Forced-choice scenarios that reveal your work style preferences</p>
        </div>
        <div className="border-l-4 border-primary pl-4">
          <p className="font-bold text-ink">Module 3: What drives you</p>
          <p className="text-muted text-sm">Questions about your motivations and pathway orientation</p>
        </div>
      </div>

      <h3 className="text-xl font-bold text-ink mb-3">Your results</h3>
      <p className="text-muted mb-4">
        After completing all three modules, you'll see your:
      </p>
      <ul className="space-y-2 mb-6">
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted"><strong>Archetype</strong> — your primary and secondary learner types</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted"><strong>Work style</strong> — how you prefer to collaborate and handle ambiguity</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted"><strong>Pathway orientation</strong> — what kind of path fits you right now</span>
        </li>
      </ul>

      <div className="bg-surface rounded-lg p-4">
        <p className="font-medium text-ink mb-1">Resume anytime</p>
        <p className="text-sm text-muted">
          Your progress saves after each module. Close the tab and come back — you'll pick up exactly where you left off.
        </p>
      </div>
    </>
  );
}

function CalendarSync() {
  return (
    <>
      <p className="text-lg text-muted mb-6">
        Never miss a session. Sync your track schedule to your personal calendar.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">Subscribe to everything</h3>
      <p className="text-muted mb-4">
        From your track page, look for the calendar icon or "Subscribe" button.
        You'll get a URL you can add to Apple Calendar, Google Calendar, or Outlook.
        All your sessions will appear automatically, and update if times change.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">Add individual sessions</h3>
      <p className="text-muted mb-4">
        See an office hours session you want to attend? Click the Google Calendar icon
        next to any session to add just that one to your calendar.
      </p>

      <div className="bg-surface rounded-lg p-4">
        <p className="font-medium text-ink mb-1">iCal format</p>
        <p className="text-sm text-muted">
          The subscription feed uses standard iCal format, which works with virtually every calendar app.
        </p>
      </div>
    </>
  );
}

function InstructorOverview() {
  return (
    <>
      <p className="text-lg text-muted mb-6">
        As an instructor, you have access to a dedicated admin panel for your assigned tracks.
        You can see student progress, take attendance, review work, and communicate with your cohort.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">What you can do</h3>
      <div className="grid gap-3 mb-6">
        <div className="flex items-center gap-3 bg-surface rounded-lg p-3">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-muted">View your assigned tracks</span>
        </div>
        <div className="flex items-center gap-3 bg-surface rounded-lg p-3">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-muted">See student roster and enrollment status</span>
        </div>
        <div className="flex items-center gap-3 bg-surface rounded-lg p-3">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-muted">Mark attendance for each session</span>
        </div>
        <div className="flex items-center gap-3 bg-surface rounded-lg p-3">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-muted">Review submissions and reflections</span>
        </div>
        <div className="flex items-center gap-3 bg-surface rounded-lg p-3">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-muted">Post announcements to your cohort</span>
        </div>
        <div className="flex items-center gap-3 bg-surface rounded-lg p-3">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-muted">View engagement scores per student</span>
        </div>
      </div>

      <h3 className="text-xl font-bold text-ink mb-3">Accessing the admin panel</h3>
      <p className="text-muted">
        Log in to the platform, then navigate to <code className="bg-surface px-2 py-1 rounded text-sm">/dashboard/admin</code>.
        You'll see tabs for Students, Attendance, Submissions, Reflections, and more.
        Each tab only loads when you click it, keeping the panel fast.
      </p>
    </>
  );
}

function TakingAttendance() {
  return (
    <>
      <p className="text-lg text-muted mb-6">
        Attendance is tracked per session, not per week. If your track runs multiple
        sessions in a week, you'll mark each one separately.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">How to mark attendance</h3>
      <ol className="space-y-4 mb-6">
        <li className="flex gap-4">
          <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">1</span>
          <div>
            <p className="font-medium text-ink">Go to the Attendance tab</p>
            <p className="text-sm text-muted">In your admin panel, click "Attendance"</p>
          </div>
        </li>
        <li className="flex gap-4">
          <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">2</span>
          <div>
            <p className="font-medium text-ink">Select the session</p>
            <p className="text-sm text-muted">Choose which week and session you're marking</p>
          </div>
        </li>
        <li className="flex gap-4">
          <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">3</span>
          <div>
            <p className="font-medium text-ink">Check off attendees</p>
            <p className="text-sm text-muted">Click the checkbox next to each student who was present</p>
          </div>
        </li>
        <li className="flex gap-4">
          <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">4</span>
          <div>
            <p className="font-medium text-ink">Save</p>
            <p className="text-sm text-muted">Your changes are recorded with a timestamp</p>
          </div>
        </li>
      </ol>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="font-medium text-amber-900 mb-1">Self-paced tracks</p>
        <p className="text-sm text-amber-800">
          Self-paced courses don't have attendance. Instead, you'll see a "Progress" tab
          showing which recordings each student watched and which assignments they submitted.
        </p>
      </div>
    </>
  );
}

function ReviewingSubmissions() {
  return (
    <>
      <p className="text-lg text-muted mb-6">
        Student submissions include their responses to prompts plus any files or links they've attached.
        You can review everything from the Submissions tab.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">Viewing submissions</h3>
      <p className="text-muted mb-4">
        In the Submissions tab, you'll see a list of all student work. You can filter by:
      </p>
      <ul className="space-y-2 mb-6">
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Track — see only one track at a time</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Week — focus on a specific week's submissions</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Student — see one student's work across all weeks</span>
        </li>
      </ul>

      <h3 className="text-xl font-bold text-ink mb-3">Submission details</h3>
      <p className="text-muted mb-4">
        Click any submission to see:
      </p>
      <ul className="space-y-2 mb-6">
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">The prompt questions for that week</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">The student's written responses</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Attached files (click to download)</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Submitted links (GitHub, Figma, etc.)</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Timestamp of submission</span>
        </li>
      </ul>
    </>
  );
}

function ReadingReflections() {
  return (
    <>
      <p className="text-lg text-muted mb-6">
        Weekly reflections give students a chance to process what they learned.
        They're also a valuable signal for you about how students are doing.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">Accessing reflections</h3>
      <p className="text-muted mb-4">
        Click the "Reflections" tab in your admin panel. You'll see all student reflections,
        filterable by track, week, or individual student.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">What to look for</h3>
      <div className="space-y-3 mb-6">
        <div className="bg-surface rounded-lg p-4">
          <p className="font-medium text-ink mb-1">Green flags</p>
          <p className="text-sm text-muted">Specific details about what they learned, connections to prior weeks, questions that show curiosity</p>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <p className="font-medium text-ink mb-1">Yellow flags</p>
          <p className="text-sm text-muted">Vague responses, minimal effort, confusion about the week's objectives</p>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <p className="font-medium text-ink mb-1">Red flags</p>
          <p className="text-sm text-muted">Statements about struggling, missing sessions, or feeling behind — reach out to these students</p>
        </div>
      </div>

      <div className="bg-surface rounded-lg p-4">
        <p className="font-medium text-ink mb-1">Reflections affect engagement scores</p>
        <p className="text-sm text-muted">
          Completing reflections contributes to a student's overall engagement score.
          Students who skip reflections will show lower engagement even if they attend and submit work.
        </p>
      </div>
    </>
  );
}

function PostingAnnouncements() {
  return (
    <>
      <p className="text-lg text-muted mb-6">
        Announcements appear in students' "What's New" feeds and on the relevant track pages.
        Use them for reminders, updates, or shoutouts.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">Creating an announcement</h3>
      <ol className="space-y-4 mb-6">
        <li className="flex gap-4">
          <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">1</span>
          <div>
            <p className="font-medium text-ink">Navigate to your track</p>
            <p className="text-sm text-muted">From the admin home, click "Manage" on the relevant track</p>
          </div>
        </li>
        <li className="flex gap-4">
          <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">2</span>
          <div>
            <p className="font-medium text-ink">Find the Announcements section</p>
            <p className="text-sm text-muted">Usually in the track settings or a dedicated tab</p>
          </div>
        </li>
        <li className="flex gap-4">
          <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">3</span>
          <div>
            <p className="font-medium text-ink">Write and post</p>
            <p className="text-sm text-muted">Add your title and message, then publish</p>
          </div>
        </li>
      </ol>

      <h3 className="text-xl font-bold text-ink mb-3">Where announcements appear</h3>
      <ul className="space-y-2 mb-6">
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Student dashboard "What's New" feed</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">The relevant track page</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Email notifications (if students have them enabled)</span>
        </li>
      </ul>
    </>
  );
}

function AdminOverview() {
  return (
    <>
      <p className="text-lg text-muted mb-6">
        As a program admin, you have full operational control over your program.
        You can manage people, configure tracks, view analytics, and handle enrollment.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">Your responsibilities</h3>
      <div className="grid gap-3 mb-6">
        <div className="bg-surface rounded-lg p-4">
          <p className="font-bold text-ink mb-1">People management</p>
          <p className="text-sm text-muted">Add students, instructors, and other admins. Manage the allowlist and send invites.</p>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <p className="font-bold text-ink mb-1">Track configuration</p>
          <p className="text-sm text-muted">Set up new tracks, configure weeks, manage content gating and prerequisites.</p>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <p className="font-bold text-ink mb-1">Analytics and insights</p>
          <p className="text-sm text-muted">View engagement scores, survey responses, completion rates, and attendance patterns.</p>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <p className="font-bold text-ink mb-1">Operations</p>
          <p className="text-sm text-muted">Handle admissions, process data withdrawal requests, manage program settings.</p>
        </div>
      </div>

      <h3 className="text-xl font-bold text-ink mb-3">Admin panel structure</h3>
      <p className="text-muted mb-4">
        The admin panel is organized into tabs, each loading independently:
      </p>
      <ul className="space-y-2 mb-6">
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted"><strong>Students</strong> — roster, enrollment status, individual student details</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted"><strong>Attendance</strong> — session-by-session attendance marking and review</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted"><strong>Submissions</strong> — all student work, filterable by track/week/student</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted"><strong>Reflections</strong> — weekly student reflections</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted"><strong>Engagement</strong> — four-pillar engagement scores per student</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted"><strong>Survey Insights</strong> — response analytics and export</span>
        </li>
      </ul>
    </>
  );
}

function AddingPeople() {
  return (
    <>
      <p className="text-lg text-muted mb-6">
        The "Add People" interface is your one-stop shop for bringing new users into the platform.
        It combines allowlist management and invite sending in one place.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">Two ways to add people</h3>
      <div className="space-y-4 mb-6">
        <div className="border-l-4 border-primary pl-4">
          <p className="font-bold text-ink">Invite by email</p>
          <p className="text-muted text-sm">Adds the email to the allowlist AND sends a one-click magic link invite immediately. Best for students.</p>
        </div>
        <div className="border-l-4 border-primary pl-4">
          <p className="font-bold text-ink">Add account directly</p>
          <p className="text-muted text-sm">Creates the account without sending an invite. Best for instructors and admins who will log in later.</p>
        </div>
      </div>

      <h3 className="text-xl font-bold text-ink mb-3">Bulk invites</h3>
      <p className="text-muted mb-4">
        Have a whole cohort to onboard? Use the bulk invite feature:
      </p>
      <ol className="space-y-3 mb-6">
        <li className="flex gap-3">
          <span className="w-6 h-6 rounded-full bg-surface flex items-center justify-center text-sm font-bold shrink-0">1</span>
          <span className="text-muted">Add all emails to the allowlist (paste a list)</span>
        </li>
        <li className="flex gap-3">
          <span className="w-6 h-6 rounded-full bg-surface flex items-center justify-center text-sm font-bold shrink-0">2</span>
          <span className="text-muted">Click "Send invites to all pending"</span>
        </li>
        <li className="flex gap-3">
          <span className="w-6 h-6 rounded-full bg-surface flex items-center justify-center text-sm font-bold shrink-0">3</span>
          <span className="text-muted">The system sends only to those who haven't joined yet — safe to re-run</span>
        </li>
      </ol>

      <div className="bg-surface rounded-lg p-4">
        <p className="font-medium text-ink mb-1">The pipeline view</p>
        <p className="text-sm text-muted">
          The People tab shows everyone at every stage: Allowlisted → Invited → Joined → Active.
          You can see exactly who's still pending and remove people from the list if needed.
        </p>
      </div>
    </>
  );
}

function ManagingCohorts() {
  return (
    <>
      <p className="text-lg text-muted mb-6">
        Cohorts are groups of students going through a track together.
        The platform helps you organize and track each cohort separately.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">Cohort organization</h3>
      <p className="text-muted mb-4">
        In the admin panel, students are grouped by track cohort. Each group row shows:
      </p>
      <ul className="space-y-2 mb-6">
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Cohort name and track</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Number of enrolled students</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Current week (for cohort-paced tracks)</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Quick link to view that cohort's students</span>
        </li>
      </ul>

      <h3 className="text-xl font-bold text-ink mb-3">Cohort vs. self-paced</h3>
      <div className="grid gap-4 mb-6">
        <div className="bg-surface rounded-lg p-4">
          <p className="font-bold text-ink mb-1">Cohort-paced</p>
          <p className="text-sm text-muted">Everyone moves through the weeks together. You mark attendance per session. The current week advances automatically based on the cohort start date.</p>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <p className="font-bold text-ink mb-1">Self-paced</p>
          <p className="text-sm text-muted">Students progress at their own speed. No attendance — instead, you track progress via a grid showing who watched each recording and submitted each assignment.</p>
        </div>
      </div>
    </>
  );
}

function SurveyInsights() {
  return (
    <>
      <p className="text-lg text-muted mb-6">
        The Survey Insights tab shows response analytics for all your program's surveys —
        intake forms, pre-surveys, post-surveys, and feedback forms.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">What you'll see</h3>
      <ul className="space-y-2 mb-6">
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Response counts (enrolled students vs. public responses)</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Completion rates</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Breakdowns by cohort (if using program variants)</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Individual response review</span>
        </li>
      </ul>

      <h3 className="text-xl font-bold text-ink mb-3">Exporting data</h3>
      <p className="text-muted mb-4">
        Need to analyze responses elsewhere? Click "Export CSV" to download all responses
        for any survey. The export includes both enrolled students and public responses,
        with a column distinguishing them.
      </p>

      <div className="bg-surface rounded-lg p-4">
        <p className="font-medium text-ink mb-1">Survey gating</p>
        <p className="text-sm text-muted">
          Surveys marked as "required" block track access until completed.
          You'll see which students are still pending in the insights view.
        </p>
      </div>
    </>
  );
}

function EngagementScores() {
  return (
    <>
      <p className="text-lg text-muted mb-6">
        Engagement scores give you a single number per student that reflects their
        overall participation — built from four distinct signals.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">The four pillars</h3>
      <div className="space-y-4 mb-6">
        <div className="flex gap-4 items-start">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-primary font-bold">1</span>
          </div>
          <div>
            <p className="font-bold text-ink">Attendance</p>
            <p className="text-sm text-muted">Showing up to live sessions (cohort-paced tracks only)</p>
          </div>
        </div>
        <div className="flex gap-4 items-start">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-primary font-bold">2</span>
          </div>
          <div>
            <p className="font-bold text-ink">Submissions</p>
            <p className="text-sm text-muted">Completing and submitting weekly work</p>
          </div>
        </div>
        <div className="flex gap-4 items-start">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-primary font-bold">3</span>
          </div>
          <div>
            <p className="font-bold text-ink">Reflections</p>
            <p className="text-sm text-muted">Writing weekly reflections</p>
          </div>
        </div>
        <div className="flex gap-4 items-start">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-primary font-bold">4</span>
          </div>
          <div>
            <p className="font-bold text-ink">AI Tutor usage</p>
            <p className="text-sm text-muted">Engaging with the AI tutor for help</p>
          </div>
        </div>
      </div>

      <h3 className="text-xl font-bold text-ink mb-3">Reading the scores</h3>
      <p className="text-muted mb-4">
        Each student has an overall engagement score plus a breakdown showing their
        performance in each pillar. Use this to:
      </p>
      <ul className="space-y-2 mb-6">
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Identify students who might need extra support</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Recognize highly engaged students</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Spot patterns (e.g., attending but not submitting)</span>
        </li>
      </ul>
    </>
  );
}

function SelfPacedProgress() {
  return (
    <>
      <p className="text-lg text-muted mb-6">
        Self-paced courses don't use attendance. Instead, you track student progress
        through a grid showing engagement with each week's content.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">The progress grid</h3>
      <p className="text-muted mb-4">
        For self-paced tracks, the "Progress" tab (replacing Attendance) shows:
      </p>
      <ul className="space-y-2 mb-6">
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Rows = students</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Columns = weeks</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Cells = whether they watched the recording AND submitted work</span>
        </li>
      </ul>

      <h3 className="text-xl font-bold text-ink mb-3">Cell states</h3>
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-green-100 border border-green-300" />
          <span className="text-muted">Watched + submitted (complete)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-amber-100 border border-amber-300" />
          <span className="text-muted">Partial (one or the other)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-gray-100 border border-gray-300" />
          <span className="text-muted">Not started</span>
        </div>
      </div>

      <div className="bg-surface rounded-lg p-4">
        <p className="font-medium text-ink mb-1">Running totals</p>
        <p className="text-sm text-muted">
          Each student row shows a count of weeks completed, so you can quickly see
          who's ahead and who's falling behind.
        </p>
      </div>
    </>
  );
}

function CreatingTracks() {
  return (
    <>
      <p className="text-lg text-muted mb-6">
        Tracks are the core learning units in BCC Academy. Each track has weeks,
        content, submissions, and optionally prerequisites.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">Creating a new track</h3>
      <ol className="space-y-4 mb-6">
        <li className="flex gap-4">
          <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">1</span>
          <div>
            <p className="font-medium text-ink">Go to Admin → Manage Courses</p>
            <p className="text-sm text-muted">Or use the Program Builder if you're a super-admin</p>
          </div>
        </li>
        <li className="flex gap-4">
          <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">2</span>
          <div>
            <p className="font-medium text-ink">Click "Create Track"</p>
            <p className="text-sm text-muted">Fill in the basic info: name, description, duration</p>
          </div>
        </li>
        <li className="flex gap-4">
          <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">3</span>
          <div>
            <p className="font-medium text-ink">Configure weeks</p>
            <p className="text-sm text-muted">Add titles, descriptions, objectives, and prompts for each week</p>
          </div>
        </li>
        <li className="flex gap-4">
          <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">4</span>
          <div>
            <p className="font-medium text-ink">Set gating and prerequisites</p>
            <p className="text-sm text-muted">Decide if weeks unlock sequentially or all at once</p>
          </div>
        </li>
      </ol>

      <h3 className="text-xl font-bold text-ink mb-3">Track types</h3>
      <div className="grid gap-4">
        <div className="bg-surface rounded-lg p-4">
          <p className="font-bold text-ink mb-1">Weekly (cohort-paced)</p>
          <p className="text-sm text-muted">Students move through together. You take attendance. Weeks unlock based on the cohort calendar.</p>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <p className="font-bold text-ink mb-1">Self-paced</p>
          <p className="text-sm text-muted">Students progress individually. No attendance — you track via the progress grid. Weeks can unlock sequentially or all at once.</p>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <p className="font-bold text-ink mb-1">Single-event</p>
          <p className="text-sm text-muted">One-off workshops or intensives. No weekly structure — just a single session with materials.</p>
        </div>
      </div>
    </>
  );
}

function WeeklyStructure() {
  return (
    <>
      <p className="text-lg text-muted mb-6">
        Each week in a track is a self-contained unit with content, activities, and assessments.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">Week components</h3>
      <div className="space-y-3 mb-6">
        <div className="flex gap-4 items-start">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <div>
            <p className="font-medium text-ink">Title & description</p>
            <p className="text-sm text-muted">What this week covers</p>
          </div>
        </div>
        <div className="flex gap-4 items-start">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <div>
            <p className="font-medium text-ink">Learning objectives</p>
            <p className="text-sm text-muted">What students should know by the end</p>
          </div>
        </div>
        <div className="flex gap-4 items-start">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <div>
            <p className="font-medium text-ink">Session schedule</p>
            <p className="text-sm text-muted">When live sessions happen (cohort-paced only)</p>
          </div>
        </div>
        <div className="flex gap-4 items-start">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <div>
            <p className="font-medium text-ink">Video recording</p>
            <p className="text-sm text-muted">Link to the session recording (added after session)</p>
          </div>
        </div>
        <div className="flex gap-4 items-start">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <div>
            <p className="font-medium text-ink">Submission prompts</p>
            <p className="text-sm text-muted">Questions or tasks students respond to</p>
          </div>
        </div>
        <div className="flex gap-4 items-start">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <div>
            <p className="font-medium text-ink">Reflection prompt</p>
            <p className="text-sm text-muted">The weekly reflection question</p>
          </div>
        </div>
      </div>

      <h3 className="text-xl font-bold text-ink mb-3">Phases</h3>
      <p className="text-muted mb-4">
        Group weeks into phases to give students a sense of the journey:
      </p>
      <ul className="space-y-2">
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Foundation (weeks 1-3)</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Core (weeks 4-8)</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Workshop (weeks 9-10)</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Exit (weeks 11-12)</span>
        </li>
      </ul>
    </>
  );
}

function ContentGating() {
  return (
    <>
      <p className="text-lg text-muted mb-6">
        Control when students can access content with two types of gating:
        date-based and sequential.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">Date-based gating (drip release)</h3>
      <p className="text-muted mb-4">
        Set a date for each week to unlock. Students can see what's coming but can't
        access it until the date passes. This is the default for cohort-paced tracks.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">Sequential gating</h3>
      <p className="text-muted mb-4">
        Require students to complete Week 1 before Week 2 unlocks, and so on.
        Great for self-paced courses where you want to guide the learning path.
      </p>

      <div className="bg-surface rounded-lg p-4 mb-6">
        <p className="font-medium text-ink mb-1">How to enable sequential gating</p>
        <p className="text-sm text-muted">
          In the course editor, look for "Sequential week unlocking" toggle.
          Turn it on to require completion of prior weeks. This is a per-course setting —
          no code required.
        </p>
      </div>

      <h3 className="text-xl font-bold text-ink mb-3">What counts as "complete"?</h3>
      <p className="text-muted">
        For sequential unlocking, a week is considered complete when the student
        submits the weekly work. Reflections and attendance don't block progression
        (though they do affect engagement scores).
      </p>
    </>
  );
}

function Prerequisites() {
  return (
    <>
      <p className="text-lg text-muted mb-6">
        Prerequisites let you lock a track until students have completed another one.
        Useful for leveled curricula or certification paths.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">Setting prerequisites</h3>
      <ol className="space-y-4 mb-6">
        <li className="flex gap-4">
          <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">1</span>
          <div>
            <p className="font-medium text-ink">Edit the track</p>
            <p className="text-sm text-muted">Go to Admin → Manage Courses → [Your Track]</p>
          </div>
        </li>
        <li className="flex gap-4">
          <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">2</span>
          <div>
            <p className="font-medium text-ink">Find "Prerequisites"</p>
            <p className="text-sm text-muted">Usually in the track settings section</p>
          </div>
        </li>
        <li className="flex gap-4">
          <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">3</span>
          <div>
            <p className="font-medium text-ink">Select required tracks</p>
            <p className="text-sm text-muted">Choose which tracks must be completed first</p>
          </div>
        </li>
      </ol>

      <h3 className="text-xl font-bold text-ink mb-3">What students see</h3>
      <p className="text-muted">
        If a student tries to access a track they haven't earned yet, they'll see a
        message explaining which prerequisite they need to complete, with a link to
        that track.
      </p>
    </>
  );
}

function SurveysAndGates() {
  return (
    <>
      <p className="text-lg text-muted mb-6">
        Surveys can be optional or required. Required surveys block track access
        until completed — perfect for intake forms, consent, or pre-assessments.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">Survey types</h3>
      <div className="space-y-4 mb-6">
        <div className="bg-surface rounded-lg p-4">
          <p className="font-bold text-ink mb-1">Intake surveys</p>
          <p className="text-sm text-muted">Collect demographic data, consent, or baseline information before the program starts.</p>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <p className="font-bold text-ink mb-1">Pre-surveys</p>
          <p className="text-sm text-muted">Assess knowledge or attitudes before a track begins. Compare with post-surveys to measure change.</p>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <p className="font-bold text-ink mb-1">Post-surveys</p>
          <p className="text-sm text-muted">Feedback and assessment at the end of a track.</p>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <p className="font-bold text-ink mb-1">Public surveys</p>
          <p className="text-sm text-muted">Run without login for prospective students. Responses merge into their record when they enroll.</p>
        </div>
      </div>

      <h3 className="text-xl font-bold text-ink mb-3">Gating tracks with surveys</h3>
      <p className="text-muted mb-4">
        When creating or editing a survey, toggle "Required" to make it a gate.
        Students will see it on their dashboard with a clear "Required" badge,
        and they can't access the track until it's done.
      </p>

      <div className="bg-surface rounded-lg p-4">
        <p className="font-medium text-ink mb-1">Question types</p>
        <p className="text-sm text-muted">
          Radio buttons (single select), checkboxes (multi-select), and open text.
          Each question can be required or optional.
        </p>
      </div>
    </>
  );
}

function MultiProgram() {
  return (
    <>
      <p className="text-lg text-muted mb-6">
        BCC Academy is designed as a multi-tenant platform. Multiple programs run
        on the same infrastructure, each with their own branding, users, and data.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">Program isolation</h3>
      <p className="text-muted mb-4">
        Each program's data is completely isolated:
      </p>
      <ul className="space-y-2 mb-6">
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Students in Program A cannot see Program B's tracks</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Admins only see their own program's data</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Analytics are scoped per program</span>
        </li>
      </ul>

      <h3 className="text-xl font-bold text-ink mb-3">Shared infrastructure</h3>
      <p className="text-muted mb-4">
        While data is isolated, programs share:
      </p>
      <ul className="space-y-2 mb-6">
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Platform features (AI tutor, assessments, analytics)</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Authentication system (magic links)</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Security and compliance infrastructure</span>
        </li>
      </ul>

      <h3 className="text-xl font-bold text-ink mb-3">Super-admin view</h3>
      <p className="text-muted">
        Super-admins can see across programs for platform management, but even they
        respect data isolation rules when acting as a specific program admin.
      </p>
    </>
  );
}

function RolesAndPermissions() {
  return (
    <>
      <p className="text-lg text-muted mb-6">
        Four roles control access to the platform. Each role inherits from the one below it.
      </p>

      <div className="space-y-4 mb-6">
        <div className="border-l-4 border-gray-300 pl-4">
          <p className="font-bold text-ink">Student</p>
          <p className="text-muted text-sm">Access enrolled tracks, submit work, use AI tutor, view own progress</p>
        </div>
        <div className="border-l-4 border-blue-400 pl-4">
          <p className="font-bold text-ink">Instructor</p>
          <p className="text-muted text-sm">Everything Student can do, plus: admin panel for assigned tracks, attendance, submission review, announcements</p>
        </div>
        <div className="border-l-4 border-primary pl-4">
          <p className="font-bold text-ink">Admin</p>
          <p className="text-muted text-sm">Everything Instructor can do, plus: full program management, people management, track configuration, analytics</p>
        </div>
        <div className="border-l-4 border-purple-500 pl-4">
          <p className="font-bold text-ink">Super-admin</p>
          <p className="text-muted text-sm">Everything Admin can do, plus: cross-program visibility, program creation, platform configuration, PII access logging</p>
        </div>
      </div>

      <h3 className="text-xl font-bold text-ink mb-3">Assigning roles</h3>
      <p className="text-muted">
        Roles are assigned when adding people or can be changed later from the admin panel.
        You can only assign roles at or below your own level (admins can't create super-admins).
      </p>
    </>
  );
}

function PreviewAsStudent() {
  return (
    <>
      <p className="text-lg text-muted mb-6">
        Super-admins can preview the platform exactly as a student sees it.
        This isn't just hidden menus — it's a real restriction that blocks admin access.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">How to use it</h3>
      <ol className="space-y-4 mb-6">
        <li className="flex gap-4">
          <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">1</span>
          <div>
            <p className="font-medium text-ink">Click "Preview as Student"</p>
            <p className="text-sm text-muted">Usually in the admin header or user menu</p>
          </div>
        </li>
        <li className="flex gap-4">
          <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">2</span>
          <div>
            <p className="font-medium text-ink">Browse as a student</p>
            <p className="text-sm text-muted">You'll see exactly what students see — no admin pages, no admin actions</p>
          </div>
        </li>
        <li className="flex gap-4">
          <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">3</span>
          <div>
            <p className="font-medium text-ink">Exit preview</p>
            <p className="text-sm text-muted">Click "Exit Preview" to return to admin mode</p>
          </div>
        </li>
      </ol>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="font-medium text-amber-900 mb-1">Real restrictions apply</p>
        <p className="text-sm text-amber-800">
          While in preview mode, you genuinely cannot access admin pages or perform admin actions.
          This is a security feature, not just cosmetic. If you try to visit an admin URL directly,
          you'll be blocked.
        </p>
      </div>
    </>
  );
}

function DataPrivacy() {
  return (
    <>
      <p className="text-lg text-muted mb-6">
        BCC Academy is built with privacy and compliance in mind.
        Here's what you need to know about data handling.
      </p>

      <h3 className="text-xl font-bold text-ink mb-3">GDPR compliance</h3>
      <div className="space-y-3 mb-6">
        <div className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted"><strong>Data withdrawal</strong> — Students can request data deletion from their settings</span>
        </div>
        <div className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted"><strong>Audit trail</strong> — All PII access by super-admins is logged</span>
        </div>
        <div className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted"><strong>Right to access</strong> — Students can view their own data anytime</span>
        </div>
      </div>

      <h3 className="text-xl font-bold text-ink mb-3">COPPA (for minors)</h3>
      <p className="text-muted mb-4">
        Programs serving students under 13 can enable COPPA compliance features:
      </p>
      <ul className="space-y-2 mb-6">
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Parental consent workflows</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Restricted data collection</span>
        </li>
        <li className="flex gap-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-muted">Age verification prompts</span>
        </li>
      </ul>

      <h3 className="text-xl font-bold text-ink mb-3">Handling withdrawal requests</h3>
      <p className="text-muted">
        When a student requests data withdrawal, the request is logged and routed to an admin.
        You'll see it in the admin panel with instructions for processing. The student receives
        confirmation when complete.
      </p>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function HelpCenter() {
  const [activeArticle, setActiveArticle] = useState<string>("what-is-bcc-academy");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<string[]>(
    SECTIONS.map((s) => s.id)
  );

  const allArticles = useMemo(() => {
    return SECTIONS.flatMap((section) =>
      section.articles.map((article) => ({ ...article, sectionId: section.id }))
    );
  }, []);

  const activeArticleData = allArticles.find((a) => a.id === activeArticle);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return SECTIONS;
    const query = searchQuery.toLowerCase();
    return SECTIONS.map((section) => ({
      ...section,
      articles: section.articles.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.description.toLowerCase().includes(query)
      ),
    })).filter((s) => s.articles.length > 0);
  }, [searchQuery]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const currentSection = SECTIONS.find((s) =>
    s.articles.some((a) => a.id === activeArticle)
  );
  const currentIndex = currentSection?.articles.findIndex(
    (a) => a.id === activeArticle
  ) ?? -1;
  const prevArticle = currentIndex > 0 ? currentSection?.articles[currentIndex - 1] : null;
  const nextArticle =
    currentIndex < (currentSection?.articles.length ?? 0) - 1
      ? currentSection?.articles[currentIndex + 1]
      : null;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-charcoal text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/"
                className="font-display text-2xl font-bold tracking-tight"
              >
                BCC <span className="text-[#E5F701]">[</span>Academy
                <span className="text-[#E5F701]">]</span>
              </Link>
              <span className="mx-3 text-white/30">|</span>
              <span className="text-white/60">Help Center</span>
            </div>
            <Link
              href="/dashboard"
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              Go to Dashboard →
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-72 shrink-0">
            {/* Search */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface border border-rule rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            {/* Navigation */}
            <nav className="space-y-2">
              {filteredSections.map((section) => (
                <div key={section.id}>
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-ink hover:bg-surface rounded-lg transition-colors"
                  >
                    {section.title}
                    <svg
                      className={`w-4 h-4 text-muted transition-transform ${
                        expandedSections.includes(section.id) ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {expandedSections.includes(section.id) && (
                    <div className="mt-1 ml-2 space-y-0.5">
                      {section.articles.map((article) => (
                        <button
                          key={article.id}
                          onClick={() => setActiveArticle(article.id)}
                          className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                            activeArticle === article.id
                              ? "bg-primary text-white"
                              : "text-muted hover:bg-surface hover:text-ink"
                          }`}
                        >
                          {article.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* Role badges */}
            {activeArticleData?.role && (
              <div className="mt-8 pt-6 border-t border-rule">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                  For
                </p>
                <div className="flex flex-wrap gap-2">
                  {activeArticleData.role.map((r) => (
                    <span
                      key={r}
                      className="px-2 py-1 bg-surface text-xs text-muted rounded-md capitalize"
                    >
                      {r.replace("_", "-")}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {activeArticleData ? (
              <article className="max-w-3xl">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-muted mb-4">
                  <span>Help Center</span>
                  <span>/</span>
                  <span>{currentSection?.title}</span>
                  <span>/</span>
                  <span className="text-ink">{activeArticleData.title}</span>
                </div>

                {/* Title */}
                <h1
                  className="font-display text-3xl font-bold text-ink mb-3"
                >
                  {activeArticleData.title}
                </h1>
                <p className="text-lg text-muted mb-8">
                  {activeArticleData.description}
                </p>

                {/* Content */}
                <div className="prose prose-slate max-w-none">
                  {activeArticleData.content}
                </div>

                {/* Prev/Next navigation */}
                <div className="mt-12 pt-8 border-t border-rule">
                  <div className="flex justify-between">
                    {prevArticle ? (
                      <button
                        onClick={() => setActiveArticle(prevArticle.id)}
                        className="text-left"
                      >
                        <span className="text-sm text-muted block mb-1">
                          ← Previous
                        </span>
                        <span className="text-ink font-medium hover:text-primary transition-colors">
                          {prevArticle.title}
                        </span>
                      </button>
                    ) : (
                      <div />
                    )}
                    {nextArticle ? (
                      <button
                        onClick={() => setActiveArticle(nextArticle.id)}
                        className="text-right"
                      >
                        <span className="text-sm text-muted block mb-1">
                          Next →
                        </span>
                        <span className="text-ink font-medium hover:text-primary transition-colors">
                          {nextArticle.title}
                        </span>
                      </button>
                    ) : (
                      <div />
                    )}
                  </div>
                </div>
              </article>
            ) : (
              <div className="text-center py-20">
                <p className="text-muted">Select an article to get started</p>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-charcoal text-white mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <p className="text-white/50 text-sm">
              BCC Academy Learning Experience Platform
            </p>
            <div className="flex gap-6 text-sm">
              <Link href="/privacy" className="text-white/50 hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-white/50 hover:text-white transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
