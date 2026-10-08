"use client";

import { useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import { buttonClass } from "@/components/ui";
import {
  ATTENDEE_SELECTS,
  emptyAttendee,
  type AttendeeField,
  type AttendeeInput,
  type AttendeeSelectField,
} from "@/lib/events";
import { registerForEvent, type ParentInput } from "./actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-rule bg-white px-3.5 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:ring-1 focus:ring-ink-faint focus:outline-none transition-all";
const LABEL_CLASS = "mb-2 block text-sm font-medium text-ink";

function Required() {
  return (
    <span aria-hidden="true" className="ml-0.5 text-red-500">
      *
    </span>
  );
}

const SELECT_LABELS: Record<AttendeeSelectField, string> = {
  grade: "Current grade",
  school_type: "School type",
  gender: "Gender",
  race_ethnicity: "Race / ethnicity",
  tshirt_size: "T-shirt size",
  experience_level: "Coding experience",
  eligibility: "Do any of these apply? (helps BGC with support eligibility)",
};

export function RegisterForm({
  eventSlug,
  eventTitle,
  maxAttendees,
}: {
  eventSlug: string;
  eventTitle: string;
  maxAttendees: number;
}) {
  const [parent, setParent] = useState<ParentInput>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    cityState: "",
    zip: "",
  });
  const [attendees, setAttendees] = useState<AttendeeInput[]>([emptyAttendee()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ name: string; ticketCode: string }[] | null>(null);

  const setParentField = (key: keyof ParentInput, value: string) =>
    setParent((p) => ({ ...p, [key]: value }));
  const setAttendeeField = (i: number, key: AttendeeField, value: string) =>
    setAttendees((list) => list.map((a, idx) => (idx === i ? { ...a, [key]: value } : a)));
  const addAttendee = () =>
    setAttendees((list) => (list.length < maxAttendees ? [...list, emptyAttendee()] : list));
  const removeAttendee = (i: number) =>
    setAttendees((list) => (list.length > 1 ? list.filter((_, idx) => idx !== i) : list));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await registerForEvent({ eventSlug, parent, attendees });
      if (res.ok) {
        setDone(res.attendees);
        window.scrollTo({ top: 0 });
      } else {
        setError(res.error);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto w-full max-w-2xl px-5 pb-20">
        <div className="rounded-lg border border-rule bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Check className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-ink">You&apos;re registered</h2>
          <p className="mt-2 text-sm text-ink-soft">
            A confirmation for {eventTitle} is on its way to {parent.email}. Each attendee has their
            own ticket and cancel link in that email.
          </p>
          <ul className="mx-auto mt-6 max-w-sm divide-y divide-rule text-left text-sm">
            {done.map((a) => (
              <li key={a.ticketCode} className="flex items-center justify-between py-2.5">
                <span className="font-medium text-ink">{a.name}</span>
                <span className="font-mono text-xs tracking-wider text-ink-soft">{a.ticketCode}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl px-5 pb-20" noValidate>
      <section className="rounded-lg border border-rule bg-white p-6">
        <h2 className="text-base font-bold text-ink">Parent or guardian</h2>
        <p className="mt-1 text-sm text-ink-soft">
          We send the confirmation and any day-of updates here.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="parent-first" className={LABEL_CLASS}>
              First name
              <Required />
            </label>
            <input
              id="parent-first"
              type="text"
              autoComplete="given-name"
              required
              value={parent.firstName}
              onChange={(e) => setParentField("firstName", e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="parent-last" className={LABEL_CLASS}>
              Last name
              <Required />
            </label>
            <input
              id="parent-last"
              type="text"
              autoComplete="family-name"
              required
              value={parent.lastName}
              onChange={(e) => setParentField("lastName", e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="parent-email" className={LABEL_CLASS}>
              Email
              <Required />
            </label>
            <input
              id="parent-email"
              type="email"
              autoComplete="email"
              required
              value={parent.email}
              onChange={(e) => setParentField("email", e.target.value)}
              placeholder="you@example.com"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="parent-phone" className={LABEL_CLASS}>
              Cell phone
            </label>
            <input
              id="parent-phone"
              type="tel"
              autoComplete="tel"
              value={parent.phone}
              onChange={(e) => setParentField("phone", e.target.value)}
              placeholder="123-456-7890"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="parent-city" className={LABEL_CLASS}>
              City, state
            </label>
            <input
              id="parent-city"
              type="text"
              autoComplete="address-level2"
              value={parent.cityState}
              onChange={(e) => setParentField("cityState", e.target.value)}
              placeholder="Detroit, MI"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="parent-zip" className={LABEL_CLASS}>
              Zip code
            </label>
            <input
              id="parent-zip"
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              value={parent.zip}
              onChange={(e) => setParentField("zip", e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
        </div>
      </section>

      {attendees.map((a, i) => (
        <section key={i} className="mt-4 rounded-lg border border-rule bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-ink">Attendee {i + 1}</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Each student gets their own ticket.
              </p>
            </div>
            {attendees.length > 1 && (
              <button
                type="button"
                onClick={() => removeAttendee(i)}
                className={buttonClass("ghost", "sm")}
                aria-label={`Remove attendee ${i + 1}`}
              >
                <X size={14} />
                Remove
              </button>
            )}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`a${i}-first`} className={LABEL_CLASS}>
                First name
                <Required />
              </label>
              <input
                id={`a${i}-first`}
                type="text"
                required
                value={a.first_name}
                onChange={(e) => setAttendeeField(i, "first_name", e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor={`a${i}-last`} className={LABEL_CLASS}>
                Last name
                <Required />
              </label>
              <input
                id={`a${i}-last`}
                type="text"
                required
                value={a.last_name}
                onChange={(e) => setAttendeeField(i, "last_name", e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor={`a${i}-dob`} className={LABEL_CLASS}>
                Date of birth
                <Required />
              </label>
              <input
                id={`a${i}-dob`}
                type="date"
                required
                value={a.date_of_birth}
                onChange={(e) => setAttendeeField(i, "date_of_birth", e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <SelectField i={i} field="grade" value={a.grade} onChange={setAttendeeField} />
            <div>
              <label htmlFor={`a${i}-school`} className={LABEL_CLASS}>
                School name
              </label>
              <input
                id={`a${i}-school`}
                type="text"
                value={a.school_name}
                onChange={(e) => setAttendeeField(i, "school_name", e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <SelectField i={i} field="school_type" value={a.school_type} onChange={setAttendeeField} />
            <SelectField i={i} field="gender" value={a.gender} onChange={setAttendeeField} />
            <SelectField i={i} field="race_ethnicity" value={a.race_ethnicity} onChange={setAttendeeField} />
            <SelectField i={i} field="tshirt_size" value={a.tshirt_size} onChange={setAttendeeField} />
            <SelectField i={i} field="experience_level" value={a.experience_level} onChange={setAttendeeField} />
            <div>
              <label htmlFor={`a${i}-ec-name`} className={LABEL_CLASS}>
                Emergency contact name
              </label>
              <input
                id={`a${i}-ec-name`}
                type="text"
                value={a.emergency_contact_name}
                onChange={(e) => setAttendeeField(i, "emergency_contact_name", e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor={`a${i}-ec-phone`} className={LABEL_CLASS}>
                Emergency contact phone
              </label>
              <input
                id={`a${i}-ec-phone`}
                type="tel"
                value={a.emergency_contact_phone}
                onChange={(e) => setAttendeeField(i, "emergency_contact_phone", e.target.value)}
                placeholder="123-456-7890"
                className={INPUT_CLASS}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`a${i}-allergies`} className={LABEL_CLASS}>
                Food allergies or restrictions
              </label>
              <input
                id={`a${i}-allergies`}
                type="text"
                value={a.allergies}
                onChange={(e) => setAttendeeField(i, "allergies", e.target.value)}
                placeholder="None"
                className={INPUT_CLASS}
              />
            </div>
            <div className="sm:col-span-2">
              <SelectField i={i} field="eligibility" value={a.eligibility} onChange={setAttendeeField} />
            </div>
          </div>
        </section>
      ))}

      {attendees.length < maxAttendees && (
        <button type="button" onClick={addAttendee} className={`${buttonClass("secondary", "md")} mt-4`}>
          <Plus size={16} />
          Add another attendee
        </button>
      )}

      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between border-t border-rule pt-6">
        <p className="text-xs text-ink-soft">
          {attendees.length} of {maxAttendees} attendees
        </p>
        <button type="submit" disabled={submitting} className={buttonClass("primary", "md")}>
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Registering...
            </>
          ) : (
            <>
              <Check size={16} />
              Register
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function SelectField({
  i,
  field,
  value,
  onChange,
}: {
  i: number;
  field: AttendeeSelectField;
  value: string;
  onChange: (i: number, key: AttendeeField, value: string) => void;
}) {
  const id = `a${i}-${field}`;
  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>
        {SELECT_LABELS[field]}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(i, field, e.target.value)}
        className={INPUT_CLASS}
      >
        <option value="">Select one</option>
        {ATTENDEE_SELECTS[field].map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
