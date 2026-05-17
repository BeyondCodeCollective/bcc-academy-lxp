"use client";

import { useState } from "react";
import { submitProject } from "@/app/dashboard/track/actions";
import type { SubmissionRow, SubmissionLink, SubmissionFile, FeedbackRow } from "@/app/dashboard/track/actions";
import { Plus, X, Link as LinkIcon, Upload, CheckCircle, Loader2, FileText, MessageSquare, ChevronDown } from "lucide-react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

export function SubmissionForm({
  trackSlug,
  weekNumber,
  existing,
  feedback,
}: {
  trackSlug: string;
  weekNumber: number;
  existing: SubmissionRow | null;
  feedback: FeedbackRow[];
}) {
  const [description, setDescription] = useState(existing?.description ?? "");
  const [links, setLinks] = useState<SubmissionLink[]>(existing?.links ?? []);
  const [files, setFiles] = useState<SubmissionFile[]>(existing?.files ?? []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!existing?.submitted_at);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);

  function addLink() {
    setLinks([...links, { url: "", label: "" }]);
    setSaved(false);
  }

  function updateLink(index: number, field: keyof SubmissionLink, value: string) {
    setLinks(links.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
    setSaved(false);
  }

  function removeLink(index: number) {
    setLinks(links.filter((_, i) => i !== index));
    setSaved(false);
  }

  function removeFile(index: number) {
    setFiles(files.filter((_, i) => i !== index));
    setSaved(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");

    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be signed in to upload.");

      // Path includes the student's user id so the bucket RLS policy
      // (storage_bucket_lockdown migration) restricts insert to your own
      // folder — no cross-student overwrites, no arbitrary-path writes.
      const safeName = file.name.replace(/[^a-zA-Z0-9._\-]/g, "_");
      const storagePath = `submissions/${trackSlug}/${weekNumber}/${user.id}/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("session-files")
        .upload(storagePath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) throw new Error(uploadError.message);

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/session-files/${storagePath}`;

      setFiles([...files, { url: publicUrl, name: file.name, type: file.type }]);
      setSaved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSubmit() {
    setSaving(true);
    setError("");
    try {
      await submitProject(trackSlug, weekNumber, {
        description,
        links: links.filter((l) => l.url.trim()),
        files,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    }
    setSaving(false);
  }

  const hasContent = description.trim() || links.some((l) => l.url.trim()) || files.length > 0;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-4 sm:p-6 text-left hover:bg-neutral-50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-2">
          <Upload size={14} className="text-neutral-400" />
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
            Submit Your Work
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
              <CheckCircle size={14} />
              Submitted
            </span>
          )}
          <ChevronDown
            size={16}
            className={`text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {!open ? null : (
      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
      {/* Description */}
      <div className="mb-4">
        <label className="text-xs font-medium text-neutral-500 mb-1 block">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => { setDescription(e.target.value); setSaved(false); }}
          placeholder="Describe what you worked on this week..."
          rows={3}
          className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none resize-none"
        />
      </div>

      {/* Links */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-neutral-500">Links</label>
          <button
            type="button"
            onClick={addLink}
            className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <Plus size={12} />
            Add Link
          </button>
        </div>
        {links.length === 0 && (
          <p className="text-[11px] text-neutral-400">No links added yet</p>
        )}
        <div className="space-y-2">
          {links.map((link, i) => (
            <div key={i} className="flex gap-2 items-start">
              <LinkIcon size={14} className="mt-2.5 text-neutral-400 shrink-0" />
              <input
                type="url"
                value={link.url}
                onChange={(e) => updateLink(i, "url", e.target.value)}
                placeholder="https://..."
                className="flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
              />
              <input
                type="text"
                value={link.label}
                onChange={(e) => updateLink(i, "label", e.target.value)}
                placeholder="Label (optional)"
                className="w-32 sm:w-40 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeLink(i)}
                className="mt-2 text-neutral-300 hover:text-red-400 transition-colors shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Files */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-neutral-500">Files</label>
          <label className={`inline-flex items-center gap-1 text-xs font-medium cursor-pointer transition-colors ${uploading ? "text-neutral-300" : "text-neutral-500 hover:text-neutral-900"}`}>
            {uploading ? (
              <><Loader2 size={12} className="animate-spin" /> Uploading...</>
            ) : (
              <><Upload size={12} /> Upload File</>
            )}
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
              accept="*/*"
            />
          </label>
        </div>
        {files.length === 0 && (
          <p className="text-[11px] text-neutral-400">No files uploaded yet</p>
        )}
        <div className="space-y-2">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2"
            >
              <FileText size={14} className="text-neutral-400 shrink-0" />
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-sm text-neutral-700 hover:text-neutral-900 truncate"
              >
                {file.name}
              </a>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="text-neutral-300 hover:text-red-400 transition-colors shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={saving || !hasContent}
        className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors"
      >
        {saving ? (
          <><Loader2 size={14} className="animate-spin" /> Saving...</>
        ) : saved ? (
          <><CheckCircle size={14} /> Update Submission</>
        ) : (
          "Submit"
        )}
      </button>

      {/* Feedback from instructor */}
      {feedback.length > 0 && (
        <div className="mt-5 pt-4 border-t border-neutral-100 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare size={14} className="text-neutral-400" />
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
              Instructor Feedback
            </h3>
          </div>
          {feedback.map((fb) => (
            <div
              key={fb.id}
              className="rounded-lg border border-neutral-100 bg-neutral-50 p-3"
            >
              <p className="text-sm text-neutral-700">{fb.comment}</p>
              <p className="text-[11px] text-neutral-400 mt-1">
                {fb.reviewer_name} &middot;{" "}
                {new Date(fb.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
      </div>
      )}
    </div>
  );
}
