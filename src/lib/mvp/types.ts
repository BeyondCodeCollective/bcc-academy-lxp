// timestamps use ISO strings, dates use YYYY-MM-DD,
// percentages use 0–100, and null means unavailable rather than zero.
export type MvpCount = number | null;
export type MvpPercentage = number | null;

// Program lifecycle labels. Unknown avoids guessing missing status.
export type MvpProgramStatus =
  | "starting_soon"
  | "active"
  | "completed"
  | "unknown";

// Filter choices are separate from learner records.
export type MvpLearnerFilter =
  | "all"
  | "enrolled"
  | "started"
  | "active"
  | "completed"
  | "needs_check_in";

// Approved filters cover program/course, city, learner status, and dates.
// Null dates = no date restriction, supporting "everything to date."
export type MvpFilters = {
  programId: string | null;
  courseSlug: string | null;
  // Legacy key: full students.location text, not a parsed or verified city.
  city: string | null;
  learnerStatus: MvpLearnerFilter;
  startDate: string | null;
  endDate: string | null;
};

// Filter options must contain only programs and courses the user may access.
export type MvpFilterOptions = {
  programs: Array<{
    id: string;
    name: string;
  }>;
  courses: Array<{
    programId: string;
    slug: string;
    name: string;
  }>;
  cities: string[];
};

// Organization totals distinguish unique learners from participation
// across programs. Started and completed counts may overlap.
export type MvpSummary = {
  uniqueLearnersStarted: MvpCount;
  uniqueLearnersCompleted: MvpCount;
  programParticipationsStarted: MvpCount;
  programParticipationsCompleted: MvpCount;
  upcomingEnrollments: MvpCount;
};

// One performance row represents a specific program/course/cohort offering.
// Stable row IDs keep separate cohorts from being combined accidentally.
export type MvpProgramRow = {
  id: string;
  programId: string;
  programName: string;
  courseSlug: string | null;
  courseName: string | null;
  cohortId: string | null;
  cohortName: string | null;

  status: MvpProgramStatus;
  startDate: string | null;
  endDate: string | null;

  totalParticipants: MvpCount;
  enrolledBeforeStart: MvpCount;
  started: MvpCount;
  active: MvpCount;
  completed: MvpCount;

  attendanceRate: MvpPercentage;
  progressRate: MvpPercentage;
  completionRate: MvpPercentage;
  surveyResponseRate: MvpPercentage;
  learnersNeedingCheckIn: MvpCount;
};

// The framework requests ZIP, city, and state. 
// Missing geography remains explicit, and geography does not determine the program hierarchy.
export type MvpLocation = {
  zip: string | null;
  city: string | null;
  state: string | null;
};

// Initial check-in signals come from the completed Q&A. Thresholds are
// configured by program; "missed two sessions" is not assumed consecutive.
export type MvpAttentionReason =
  | "missed_sessions"
  | "missing_required_submission"
  | "low_assessment"
  | "behind_expected_progress";

// Each flag includes a readable explanation and references to supporting
// records, enabling the requested "view evidence" interaction.
export type MvpAttentionFlag = {
  id: string;
  reason: MvpAttentionReason;
  explanation: string;
  ruleId: string;
  detectedAt: string;
  evidence: Array<{
    label: string;
    sourceRecordId: string;
    href: string | null;
  }>;
};

// One learner row belongs to a specific program offering. Participation
// milestones can overlap; active status remains unknown until evaluated.
export type MvpLearnerRow = {
  learnerId: string;
  learnerName: string;
  programRowId: string;
  location: MvpLocation;

  startedAt: string | null;
  completedAt: string | null;
  isActive: boolean | null;
  attendanceRate: MvpPercentage;
  progressRate: MvpPercentage;
  lastMeaningfulActivityAt: string | null;

  checkInStatus: "not_evaluated" | "no_flags" | "flagged";
  attentionFlags: MvpAttentionFlag[];
};

// Outcomes differ by program. Preserve the original measure, scale, and
// sample size rather than combining unrelated survey questions.
export type MvpOutcomeMeasure = {
  id: string;
  label: string;
  sourceLabel: string;
  unit: string;
  beforeValue: number | null;
  afterValue: number | null;
  change: number | null;
  respondentCount: MvpCount;
  pairedRespondentCount: MvpCount;
};

// Aggregate demographic distributions support the requested age/salary
// reporting. Categories and units come from the actual source data.
export type MvpDemographicSummary = {
  id: string;
  label: string;
  unit: string | null;
  respondentCount: MvpCount;
  missingCount: MvpCount;
  groups: Array<{
    label: string;
    count: MvpCount;
  }>;
};

// Minimal non-financial commitments compare an actual result with a target.
// No red/amber/green health judgment is inferred without an agreed rule.
export type MvpCommitment = {
  id: string;
  programId: string;
  label: string;
  metricKey: string;
  unit: string;
  target: number;
  actual: number | null;
  periodStart: string | null;
  periodEnd: string | null;
  deadline: string | null;
  ownerName: string | null;
};

// Program drill-down supports the requested final-results screen:
// program dates, participants, completions, outcomes, and learner cities.
export type MvpProgramDetail = {
  program: MvpProgramRow;
  learners: MvpLearnerRow[];
  outcomes: MvpOutcomeMeasure[];
  demographics: MvpDemographicSummary[];
  commitments: MvpCommitment[];
};

// Query time and source freshness are different. Show the team member
// only when a recorded human update or validation actually exists.
export type MvpFreshness = {
  fetchedAt: string;
  sourceUpdatedAt: string | null;
  lastValidatedAt: string | null;
  lastValidatedBy: string | null;
};

// Metric definitions explain what is counted and the denominator used.
// Unavailable measurements carry a reason for display beside the metric.
export type MvpMetricDefinition = {
  key: string;
  label: string;
  definition: string;
  denominator: string | null;
  unavailableReason: string | null;
};

// The overview receives scoped data and the applied filters together.
// Program details can be loaded separately when a user opens a row.
export type MvpDashboardData = {
  demographics?: MvpDemographicSummary[];
  surveyOutcomes?: import("./survey-queries").MvpSurveyOutcomeGroup[];
  checkInEvaluations?: import("./check-ins").MvpCheckInEvaluation[];
  scopeLabel: string;
  appliedFilters: MvpFilters;
  filterOptions: MvpFilterOptions;
  summary: MvpSummary;
  programs: MvpProgramRow[];
  commitments: MvpCommitment[];
  freshness: MvpFreshness;
  metricDefinitions: MvpMetricDefinition[];
};
