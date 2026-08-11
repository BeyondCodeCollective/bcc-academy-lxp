"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveLandingPageAction, uploadLandingImageAction } from "./actions";
import type { LandingPageInput } from "./actions";
import type { ScheduleDay, LandingPartner } from "@/lib/landing-pages";
import { Field, fieldInput, buttonClass, Panel } from "@/components/ui";
import { toSlug } from "@/lib/programs/slug";
import { compressImage } from "@/lib/compress-image";

/** Partner row in form state — both kinds carry every field so toggling kind
 *  doesn't lose what the user already typed. */
type PartnerDraft = {
  kind: "image" | "wordmark";
  src: string;
  alt: string;
  label: string;
  height: string;
};

const emptyPartner = (): PartnerDraft => ({ kind: "wordmark", src: "", alt: "", label: "", height: "" });

export type LandingFormInitial = LandingPageInput;

function toDrafts(partners: LandingPartner[]): PartnerDraft[] {
  return partners.map((p) =>
    p.kind === "image"
      ? { kind: "image", src: p.src, alt: p.alt, label: "", height: p.height ? String(p.height) : "" }
      : { kind: "wordmark", src: "", alt: "", label: p.label, height: p.height ? String(p.height) : "" },
  );
}

export function LandingForm({
  initial,
  originalSlug,
}: {
  initial: LandingFormInitial;
  /** Present when editing — lets the action delete the old row on a slug rename. */
  originalSlug?: string;
}) {
  const router = useRouter();
  const isEdit = !!originalSlug;

  const [slug, setSlug] = useState(initial.slug);
  const [published, setPublished] = useState(initial.published);
  const [headerLabel, setHeaderLabel] = useState(initial.headerLabel);
  const [eyebrow, setEyebrow] = useState(initial.eyebrow);
  const [headline, setHeadline] = useState(initial.headline);
  const [subhead, setSubhead] = useState(initial.subhead);
  const [accent, setAccent] = useState(initial.accent);
  const [formLabel, setFormLabel] = useState(initial.formLabel);
  const [trackSlug, setTrackSlug] = useState(initial.trackSlug);
  const [eventbriteEventId, setEventbriteEventId] = useState(initial.eventbriteEventId);
  const [embedHeight, setEmbedHeight] = useState(
    initial.embedHeight != null ? String(initial.embedHeight) : "",
  );
  const [schedule, setSchedule] = useState<ScheduleDay[]>(
    initial.schedule.length ? initial.schedule : [],
  );
  const [secondaryCtaLabel, setSecondaryCtaLabel] = useState(initial.secondaryCtaLabel);
  const [secondaryCtaUrl, setSecondaryCtaUrl] = useState(initial.secondaryCtaUrl);
  const [partners, setPartners] = useState<PartnerDraft[]>(toDrafts(initial.partners));
  const [heroImageUrl, setHeroImageUrl] = useState(initial.heroImageUrl);
  const [darkTheme, setDarkTheme] = useState(initial.pageTheme === "dark");
  const [uploadingHero, setUploadingHero] = useState(false);
  const [heroUploadError, setHeroUploadError] = useState<string | null>(null);
  const [footerText, setFooterText] = useState(initial.footerText);
  const [metaTitle, setMetaTitle] = useState(initial.metaTitle);
  const [metaDescription, setMetaDescription] = useState(initial.metaDescription);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewSlug = toSlug(slug);
  const accentValid = /^#[0-9a-fA-F]{6}$/.test(accent.trim());

  function updateSchedule(i: number, patch: Partial<ScheduleDay>) {
    setSchedule((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function updatePartner(i: number, patch: Partial<PartnerDraft>) {
    setPartners((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const partnersOut: LandingPartner[] = partners
      .map((p): LandingPartner | null => {
        const height = p.height.trim() ? Number(p.height) : undefined;
        if (p.kind === "image") {
          if (!p.src.trim()) return null;
          return { kind: "image", src: p.src.trim(), alt: p.alt.trim(), ...(height ? { height } : {}) };
        }
        if (!p.label.trim()) return null;
        return { kind: "wordmark", label: p.label.trim(), ...(height ? { height } : {}) };
      })
      .filter((p): p is LandingPartner => p !== null);

    try {
      const res = await saveLandingPageAction(
        {
          slug,
          published,
          headerLabel,
          eyebrow,
          headline,
          subhead,
          accent,
          formLabel,
          trackSlug,
          eventbriteEventId,
          embedHeight: embedHeight.trim() ? Number(embedHeight) : null,
          schedule,
          secondaryCtaLabel,
          secondaryCtaUrl,
          partners: partnersOut,
          heroImageUrl,
          pageTheme: darkTheme ? "dark" : "",
          footerText,
          metaTitle,
          metaDescription,
        },
        originalSlug,
      );

      if (res.success) {
        router.push("/dashboard/admin/landing");
        router.refresh();
      } else {
        setError(res.error);
        setPending(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Basics ── */}
      <Panel className="space-y-5 p-5">
        <h2 className="text-sm font-semibold text-ink">Basics</h2>

        <Field label="Slug" hint="the URL path">
          <input
            type="text"
            required
            placeholder="bgc-roblox"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className={`${fieldInput} font-mono`}
          />
          {previewSlug && (
            <p className="mt-1.5 font-mono text-xs text-ink-soft">
              bccacademy.io/bcc/<span className="text-primary">{previewSlug}</span>
            </p>
          )}
        </Field>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={darkTheme}
            onChange={(e) => setDarkTheme(e.target.checked)}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          <span className="text-sm text-ink">
            Dark page{" "}
            <span className="text-ink-faint">— black background, cream text</span>
          </span>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          <span className="text-sm text-ink">
            Published{" "}
            <span className="text-ink-faint">— when off, the page returns 404</span>
          </span>
        </label>

        <Field label="Header label" hint="small uppercase label, top-left">
          <input
            type="text"
            placeholder="BCC Academy"
            value={headerLabel}
            onChange={(e) => setHeaderLabel(e.target.value)}
            className={fieldInput}
          />
        </Field>
      </Panel>

      {/* ── Hero copy ── */}
      <Panel className="space-y-5 p-5">
        <h2 className="text-sm font-semibold text-ink">Hero</h2>

        <Field label="Eyebrow" hint="optional small accent line above the headline">
          <input
            type="text"
            placeholder="Summer Camp · Ages 9–14"
            value={eyebrow}
            onChange={(e) => setEyebrow(e.target.value)}
            className={fieldInput}
          />
        </Field>

        <Field label="Headline" hint="each new line becomes a line break on the page">
          <textarea
            required
            rows={3}
            placeholder={"She won't just\nplay Roblox.\nShe'll build it."}
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className={`${fieldInput} resize-y`}
          />
        </Field>

        <Field label="Subhead" hint="optional supporting paragraph">
          <textarea
            rows={2}
            value={subhead}
            onChange={(e) => setSubhead(e.target.value)}
            className={`${fieldInput} resize-y`}
          />
        </Field>

        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <Field label="Accent color" hint="6-digit hex">
            <input
              type="text"
              placeholder="#1D59FF"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              className={`${fieldInput} font-mono`}
            />
          </Field>
          <div
            className="h-[42px] w-12 shrink-0 rounded-lg border border-rule"
            style={{ backgroundColor: accentValid ? accent.trim() : "#f5f5f7" }}
            aria-hidden
          />
        </div>
      </Panel>

      {/* ── Sign-up form ── */}
      <Panel className="space-y-5 p-5">
        <h2 className="text-sm font-semibold text-ink">Sign-up form</h2>

        <Field label="Form label" hint="small label above the email field">
          <input
            type="text"
            placeholder="Get on the list"
            value={formLabel}
            onChange={(e) => setFormLabel(e.target.value)}
            className={fieldInput}
          />
        </Field>

        <Field label="Track slug" hint="optional — tags the signup with a track">
          <input
            type="text"
            placeholder="roblox-camp"
            value={trackSlug}
            onChange={(e) => setTrackSlug(e.target.value)}
            className={`${fieldInput} font-mono`}
          />
        </Field>

        <Field
          label="Eventbrite event ID"
          hint="optional — when set, the page embeds Eventbrite registration instead of the email form. Registrants are auto-provisioned into the track above."
        >
          <input
            type="text"
            placeholder="1234567890123"
            value={eventbriteEventId}
            onChange={(e) => setEventbriteEventId(e.target.value)}
            className={`${fieldInput} font-mono`}
          />
        </Field>

        <Field
          label="Embed height (px)"
          hint="optional — height of the inline Eventbrite form. Blank = default (520). Tune to fit without scroll or wasted space."
        >
          <input
            type="number"
            min={200}
            placeholder="520"
            value={embedHeight}
            onChange={(e) => setEmbedHeight(e.target.value)}
            className={`${fieldInput} max-w-[140px] font-mono`}
          />
        </Field>
      </Panel>

      {/* ── Schedule ── */}
      <Panel className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Schedule</h2>
          <button
            type="button"
            onClick={() => setSchedule((p) => [...p, { label: "", title: "" }])}
            className={buttonClass("secondary", "sm")}
          >
            + Add row
          </button>
        </div>

        {schedule.length === 0 && (
          <p className="text-sm text-ink-faint">No schedule rows. Add one to show a schedule block.</p>
        )}

        <div className="space-y-3">
          {schedule.map((s, i) => (
            <div key={i} className="flex items-start gap-2">
              <input
                type="text"
                placeholder="Label (e.g. Week 1)"
                value={s.label}
                onChange={(e) => updateSchedule(i, { label: e.target.value })}
                className={`${fieldInput} flex-[0_0_38%]`}
              />
              <input
                type="text"
                placeholder="Title (e.g. Build your first game)"
                value={s.title}
                onChange={(e) => updateSchedule(i, { title: e.target.value })}
                className={fieldInput}
              />
              <button
                type="button"
                onClick={() => setSchedule((p) => p.filter((_, idx) => idx !== i))}
                className={`${buttonClass("ghost", "sm")} shrink-0`}
                aria-label="Remove schedule row"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </Panel>

      {/* ── Secondary CTA ── */}
      <Panel className="space-y-5 p-5">
        <h2 className="text-sm font-semibold text-ink">Secondary link</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Link label">
            <input
              type="text"
              placeholder="Read the full curriculum"
              value={secondaryCtaLabel}
              onChange={(e) => setSecondaryCtaLabel(e.target.value)}
              className={fieldInput}
            />
          </Field>
          <Field label="Link URL">
            <input
              type="text"
              placeholder="https://…"
              value={secondaryCtaUrl}
              onChange={(e) => setSecondaryCtaUrl(e.target.value)}
              className={fieldInput}
            />
          </Field>
        </div>
      </Panel>

      {/* ── Partners ── */}
      <Panel className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Partner logos</h2>
          <button
            type="button"
            onClick={() => setPartners((p) => [...p, emptyPartner()])}
            className={buttonClass("secondary", "sm")}
          >
            + Add partner
          </button>
        </div>

        {partners.length === 0 && (
          <p className="text-sm text-ink-faint">No partners. Add an image logo or a text wordmark.</p>
        )}

        <div className="space-y-4">
          {partners.map((p, i) => (
            <div key={i} className="rounded-lg border border-rule p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="inline-flex rounded-lg border border-rule p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => updatePartner(i, { kind: "wordmark" })}
                    className={`rounded px-2.5 py-1 font-medium transition-colors ${
                      p.kind === "wordmark" ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    Wordmark
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePartner(i, { kind: "image" })}
                    className={`rounded px-2.5 py-1 font-medium transition-colors ${
                      p.kind === "image" ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    Image
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setPartners((prev) => prev.filter((_, idx) => idx !== i))}
                  className={buttonClass("ghost", "sm")}
                  aria-label="Remove partner"
                >
                  ✕
                </button>
              </div>

              {p.kind === "image" ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Image URL">
                    <input
                      type="text"
                      placeholder="https://…/logo.png"
                      value={p.src}
                      onChange={(e) => updatePartner(i, { src: e.target.value })}
                      className={fieldInput}
                    />
                  </Field>
                  <Field label="Alt text">
                    <input
                      type="text"
                      placeholder="Black Girls Code"
                      value={p.alt}
                      onChange={(e) => updatePartner(i, { alt: e.target.value })}
                      className={fieldInput}
                    />
                  </Field>
                </div>
              ) : (
                <Field label="Wordmark text">
                  <input
                    type="text"
                    placeholder="BLACK GIRLS CODE"
                    value={p.label}
                    onChange={(e) => updatePartner(i, { label: e.target.value })}
                    className={fieldInput}
                  />
                </Field>
              )}

              <Field label="Height (px)" hint="optional">
                <input
                  type="number"
                  min={1}
                  placeholder={p.kind === "image" ? "36" : "26"}
                  value={p.height}
                  onChange={(e) => updatePartner(i, { height: e.target.value })}
                  className={`${fieldInput} max-w-[120px]`}
                />
              </Field>
            </div>
          ))}
        </div>
      </Panel>

      {/* ── Media & footer ── */}
      <Panel className="space-y-5 p-5">
        <h2 className="text-sm font-semibold text-ink">Media & footer</h2>

        <Field label="Hero image" hint="optional — fills the right panel">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="https://…/hero.jpg"
              value={heroImageUrl}
              onChange={(e) => setHeroImageUrl(e.target.value)}
              className={fieldInput}
            />
            <label className={`${buttonClass("secondary", "sm")} shrink-0 cursor-pointer`}>
              {uploadingHero ? "Uploading…" : "Upload"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                className="sr-only"
                disabled={uploadingHero}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setUploadingHero(true);
                  setHeroUploadError(null);
                  try {
                    const fd = new FormData();
                    fd.set("file", await compressImage(file));
                    const res = await uploadLandingImageAction(fd);
                    if (res.success) setHeroImageUrl(res.url);
                    else setHeroUploadError(res.error);
                  } catch {
                    setHeroUploadError("Upload failed. Please try again.");
                  } finally {
                    setUploadingHero(false);
                  }
                }}
              />
            </label>
          </div>
          {heroUploadError && (
            <p className="mt-1.5 text-xs text-red-600">{heroUploadError}</p>
          )}
        </Field>

        <Field label="Footer text">
          <input
            type="text"
            placeholder="© 2026 BCC Academy"
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            className={fieldInput}
          />
        </Field>
      </Panel>

      {/* ── SEO ── */}
      <Panel className="space-y-5 p-5">
        <h2 className="text-sm font-semibold text-ink">SEO</h2>

        <Field label="Meta title" hint="falls back to the headline">
          <input
            type="text"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            className={fieldInput}
          />
        </Field>

        <Field label="Meta description" hint="falls back to the subhead">
          <textarea
            rows={2}
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            className={`${fieldInput} resize-y`}
          />
        </Field>
      </Panel>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className={`${buttonClass("primary", "md")} flex-1`}
        >
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create landing page"}
        </button>
        {isEdit && previewSlug && (
          <a
            href={`/bcc/${previewSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass("secondary", "md")}
          >
            Preview ↗
          </a>
        )}
      </div>
    </form>
  );
}
