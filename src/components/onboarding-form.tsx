"use client";

import { useState } from "react";
import { completeOnboarding } from "@/app/dashboard/actions";
import { User } from "lucide-react";

const EDUCATION_LEVELS = [
  "Some High School",
  "High School Diploma / GED",
  "Some College",
  "Associate's Degree",
  "Bachelor's Degree",
  "Master's Degree or Higher",
  "Trade / Vocational Certificate",
  "Other",
];

interface Props {
  defaultFirstName: string;
  defaultLastName: string;
}

export function OnboardingForm({ defaultFirstName, defaultLastName }: Props) {
  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [location, setLocation] = useState("");
  const [dob, setDob] = useState("");
  const [education, setEducation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canSubmit =
    firstName.trim() && lastName.trim() && location.trim() && dob && education;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    setError("");

    try {
      await completeOnboarding({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        location: location.trim(),
        date_of_birth: dob,
        education_level: education,
      });
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setSaving(false);
      console.error(err);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl animate-[fadeIn_0.3s_ease-out] max-h-[calc(100dvh-3rem)] overflow-y-auto">
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 mb-4">
              <User size={28} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900">
              Let&apos;s get to know you
            </h2>
            <p className="mt-2 text-sm text-neutral-500">
              Quick intro so we can personalize your experience.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="ob-first"
                  className="mb-1.5 block text-xs font-medium text-neutral-600"
                >
                  First Name
                </label>
                <input
                  id="ob-first"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white focus:ring-1 focus:ring-neutral-900 focus:outline-none transition-all"
                />
              </div>
              <div>
                <label
                  htmlFor="ob-last"
                  className="mb-1.5 block text-xs font-medium text-neutral-600"
                >
                  Last Name
                </label>
                <input
                  id="ob-last"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white focus:ring-1 focus:ring-neutral-900 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label
                htmlFor="ob-location"
                className="mb-1.5 block text-xs font-medium text-neutral-600"
              >
                Location
              </label>
              <input
                id="ob-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, State"
                required
                autoComplete="address-level2"
                className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white focus:ring-1 focus:ring-neutral-900 focus:outline-none transition-all"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label
                htmlFor="ob-dob"
                className="mb-1.5 block text-xs font-medium text-neutral-600"
              >
                Date of Birth
              </label>
              <input
                id="ob-dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
                autoComplete="bdate"
                className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3 text-base text-neutral-900 focus:border-neutral-900 focus:bg-white focus:ring-1 focus:ring-neutral-900 focus:outline-none transition-all appearance-none"
              />
            </div>

            {/* Education Level */}
            <div>
              <label
                htmlFor="ob-education"
                className="mb-1.5 block text-xs font-medium text-neutral-600"
              >
                Level of Education
              </label>
              <select
                id="ob-education"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                required
                className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3 text-base text-neutral-900 focus:border-neutral-900 focus:bg-white focus:ring-1 focus:ring-neutral-900 focus:outline-none transition-all appearance-none"
              >
                <option value="" disabled>
                  Select one
                </option>
                {EDUCATION_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={!canSubmit || saving}
              className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 active:bg-neutral-700 disabled:opacity-50 mt-2"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-3.5 w-3.5 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Saving...
                </span>
              ) : (
                "Continue"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
