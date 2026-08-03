"use client";

import { useState } from "react";
import { createOrganizationAction } from "./actions";
import type { CreateOrganizationResult } from "./actions";
import { toSlug } from "@/lib/programs/slug";
import { Field, fieldInput, buttonClass } from "@/components/ui";

export function CreateOrganizationForm() {
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [accent, setAccent] = useState("#1D59FF");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<CreateOrganizationResult, { success: true }> | null>(null);
  const [copied, setCopied] = useState(false);

  const slug = toSlug(name);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await createOrganizationAction({ name, headline, accent });
      if (res.success) setResult(res);
      else setError(res.error);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(result.joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-5 space-y-4">
          <p className="text-sm font-semibold text-green-800">✓ Organization created</p>

          <div className="rounded-lg border border-green-200 bg-white p-4 space-y-3">
            <p className="font-mono text-sm text-green-700 break-all">{result.joinUrl}</p>
            <button
              type="button"
              onClick={handleCopy}
              className={`${buttonClass("primary", "md")} w-full`}
            >
              {copied ? "Copied!" : "Copy join link"}
            </button>
          </div>

          <p className="text-xs text-green-700">
            The join page is live at this link. Its landing page was created
            unpublished, so nothing else is public until you publish it.
          </p>
        </div>

        <a
          href={`/dashboard/admin/programs/new?program=${result.slug}`}
          className={`${buttonClass("primary", "md")} block w-full text-center`}
        >
          Add the first course →
        </a>

        {result.landingUrl && (
          <a
            href={result.landingUrl}
            className={`${buttonClass("secondary", "md")} block w-full text-center`}
          >
            Edit the landing page
          </a>
        )}

        <button
          type="button"
          onClick={() => {
            setResult(null);
            setError(null);
            setName("");
            setHeadline("");
            setAccent("#1D59FF");
            setCopied(false);
          }}
          className="w-full text-center text-sm text-ink-soft hover:text-ink-soft transition-colors py-1"
        >
          + Create another organization
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Organization name">
        <input
          id="name"
          type="text"
          required
          placeholder="e.g. Bethany Baptist Church"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={fieldInput}
        />
        {slug && (
          <p className="mt-1.5 text-xs text-ink-soft">
            Join link: <span className="font-mono">bccacademy.io/join/{slug}</span>
          </p>
        )}
      </Field>

      <Field label="Landing page headline (optional)">
        <input
          id="headline"
          type="text"
          placeholder="Defaults to the organization name"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          className={fieldInput}
        />
      </Field>

      <Field label="Brand color" hint="used across the org's portal and landing page">
        <div className="flex items-center gap-2">
          <input
            id="accent"
            type="color"
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            aria-label="Brand color"
            className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-rule bg-white p-1"
          />
          <input
            type="text"
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            placeholder="#1D59FF"
            className={`${fieldInput} font-mono`}
          />
        </div>
      </Field>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !name.trim()}
        className={`${buttonClass("primary", "md")} w-full`}
      >
        {pending ? "Creating…" : "Create organization"}
      </button>
    </form>
  );
}
