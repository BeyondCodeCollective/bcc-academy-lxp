"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { EVENT_TIMEZONES } from "@/lib/events";
import { createEvent, type NewEventInput } from "./actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-rule bg-white px-3.5 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:ring-1 focus:ring-ink-faint focus:outline-none transition-all";
const LABEL_CLASS = "mb-2 block text-sm font-medium text-ink";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

export function NewEventForm() {
  const [v, setV] = useState<NewEventInput>({
    title: "",
    slug: "",
    description: "",
    date: "",
    startTime: "10:00",
    endTime: "12:00",
    timezone: "America/New_York",
    location: "",
    joinUrl: "",
    capacity: "",
    maxAttendees: "5",
    waitlistEnabled: true,
    status: "open",
  });
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof NewEventInput>(k: K, val: NewEventInput[K]) => setV((s) => ({ ...s, [k]: val }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await createEvent(v);
      // A successful create redirects; only an error returns.
      if (res && !res.ok) setError(res.error);
    } catch (err) {
      // next/navigation redirect() throws through the action boundary; let it.
      if (err && typeof err === "object" && "digest" in err) throw err;
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-rule bg-white p-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="ev-title" className={LABEL_CLASS}>
            Title
          </label>
          <input
            id="ev-title"
            type="text"
            required
            value={v.title}
            onChange={(e) => {
              set("title", e.target.value);
              if (!slugTouched) set("slug", slugify(e.target.value));
            }}
            placeholder="Detroit: KLA Enrichment"
            className={INPUT_CLASS}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="ev-slug" className={LABEL_CLASS}>
            Public link
          </label>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm text-ink-soft">/events/</span>
            <input
              id="ev-slug"
              type="text"
              required
              value={v.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", slugify(e.target.value));
              }}
              className={INPUT_CLASS}
            />
            <span className="shrink-0 text-sm text-ink-soft">/register</span>
          </div>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="ev-desc" className={LABEL_CLASS}>
            Description
          </label>
          <textarea
            id="ev-desc"
            rows={3}
            value={v.description}
            onChange={(e) => set("description", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="ev-date" className={LABEL_CLASS}>
            Date
          </label>
          <input id="ev-date" type="date" required value={v.date} onChange={(e) => set("date", e.target.value)} className={INPUT_CLASS} />
        </div>
        <div>
          <label htmlFor="ev-tz" className={LABEL_CLASS}>
            Timezone
          </label>
          <select id="ev-tz" value={v.timezone} onChange={(e) => set("timezone", e.target.value)} className={INPUT_CLASS}>
            {EVENT_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace("America/", "").replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ev-start" className={LABEL_CLASS}>
            Start time
          </label>
          <input id="ev-start" type="time" required value={v.startTime} onChange={(e) => set("startTime", e.target.value)} className={INPUT_CLASS} />
        </div>
        <div>
          <label htmlFor="ev-end" className={LABEL_CLASS}>
            End time
          </label>
          <input id="ev-end" type="time" value={v.endTime} onChange={(e) => set("endTime", e.target.value)} className={INPUT_CLASS} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="ev-location" className={LABEL_CLASS}>
            Location
          </label>
          <input
            id="ev-location"
            type="text"
            value={v.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="Street address, or leave blank for online"
            className={INPUT_CLASS}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="ev-join" className={LABEL_CLASS}>
            Join link (online events)
          </label>
          <input id="ev-join" type="url" value={v.joinUrl} onChange={(e) => set("joinUrl", e.target.value)} placeholder="https://zoom.us/j/..." className={INPUT_CLASS} />
        </div>
        <div>
          <label htmlFor="ev-capacity" className={LABEL_CLASS}>
            Capacity (attendees)
          </label>
          <input
            id="ev-capacity"
            type="number"
            min={1}
            inputMode="numeric"
            value={v.capacity}
            onChange={(e) => set("capacity", e.target.value)}
            placeholder="Unlimited"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="ev-max" className={LABEL_CLASS}>
            Attendees per registration
          </label>
          <input id="ev-max" type="number" min={1} max={10} inputMode="numeric" value={v.maxAttendees} onChange={(e) => set("maxAttendees", e.target.value)} className={INPUT_CLASS} />
        </div>
        <label className="flex items-center gap-3 text-sm text-ink">
          <input type="checkbox" checked={v.waitlistEnabled} onChange={(e) => set("waitlistEnabled", e.target.checked)} className="h-4 w-4 rounded border-rule" />
          Waitlist when full
        </label>
        <label className="flex items-center gap-3 text-sm text-ink">
          <input type="checkbox" checked={v.status === "open"} onChange={(e) => set("status", e.target.checked ? "open" : "draft")} className="h-4 w-4 rounded border-rule" />
          Open for registration now
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between border-t border-rule pt-6">
        <Link href="/dashboard/admin/events" className={buttonClass("ghost", "md")}>
          Cancel
        </Link>
        <button type="submit" disabled={submitting} className={buttonClass("primary", "md")}>
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Creating...
            </>
          ) : (
            "Create event"
          )}
        </button>
      </div>
    </form>
  );
}
