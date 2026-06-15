"use client";

import { useState } from "react";
import { submitProject } from "@/app/dashboard/track/actions";
import type { SubmissionRow, SubmissionLink, SubmissionFile, FeedbackRow } from "@/app/dashboard/track/actions";
import { Plus, X, Link as LinkIcon, Upload, CheckCircle, Loader2, FileText, MessageSquare, ChevronDown } from "lucide-react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { buttonClass } from "@/components/ui";

export function SubmissionForm({
  trackSlug,
  weekNumber,
  prompts,
  existing,
  feedback,
}: {
  trackSlug: string;
  weekNumber: number;
  /**
   * Structured questions ("Written Artifact") for this week's submission.
   * When provided, the form renders one labeled textarea per prompt and
   * persists the answers to `submissions.prompt_responses`. Files and links
   * remain available below as optional attachments.
   */
  prompts?: string[];
  existing: SubmissionRow | null;
  feedback: FeedbackRow[];
}) {
  const activePrompts = prompts ?? [];
  const hasPrompts = activePrompts.length > 0;
  const existingPromptResponses = existing?.prompt_responses ?? {};

  const [promptResponses, setPromptResponses] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const prompt of activePrompts) {
      initial[prompt] = existingPromptResponses[prompt] ?? "";
    }
    return initial;
  });
  const [description, setDescription] = useState(existing?.description ?? "");
  const [links, setLinks] = useState<SubmissionLink[]>(existing?.links ?? []);
  const [files, setFiles] = useState<SubmissionFile[]>(existing?.files ?? []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!existing?.submitted_at);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(
    (existing?.links?.length ?? 0) > 0 || (existing?.files?.length ?? 0) > 0
  );

  function updatePromptResponse(prompt: string, value: string) {
    setPromptResponses((prev) => ({ ...prev, [prompt]: value }));
    setSaved(false);
  }

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
      const cleanedPromptResponses: Record<string, string> = {};
      for (const [prompt, answer] of Object.entries(promptResponses)) {
        if (answer.trim()) cleanedPromptResponses[prompt] = answer.trim();
      }
      await submitProject(trackSlug, weekNumber, {
        description,
        links: links.filter((l) => l.url.trim()),
        files,
        promptResponses: cleanedPromptResponses,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    }
    setSaving(false);
  }

  const hasPromptContent = Object.values(promptResponses).some((v) => v.trim());
  const hasAttachmentContent =
    description.trim() || links.some((l) => l.url.trim()) || files.length > 0;
  const hasContent = hasPrompts ? hasPromptContent : hasAttachmentContent;

  const header = hasPrompts ? "Submit Your Project" : "Submit Your Work";

  return (
    <div className="panel">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-4 sm:p-6 text-left hover:bg-paper-tint-soft transition-colors"
      >
        <div className="flex items-center gap-2">
          <Upload size={14} className="text-ink-faint" />
          <h2 className="text-xs font-semibold text-ink-faint uppercase tracking-wide">
            {header}
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
            className={`text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {!open ? null : (
      <div className="px-4 sm:px-6 pb-4 sm:pb-6">

      {/* Per-prompt structured answers (Forte's Written Artifact). */}
      {hasPrompts && (
        <div className="space-y-4 mb-4">
          {activePrompts.map((prompt) => (
            <div key={prompt}>
              <label className="text-sm font-medium text-ink mb-1.5 block">
                {prompt}
              </label>
              <textarea
                value={promptResponses[prompt] ?? ""}
                onChange={(e) => updatePromptResponse(prompt, e.target.value)}
                rows={3}
                className="w-full border border-rule bg-neutral-50 px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none resize-none"
              />
            </div>
          ))}
        </div>
      )}

      {/* Attachments — collapsed by default when prompts are the focus. */}
      {hasPrompts ? (
        <div className="mb-4 border-t border-rule-soft pt-4">
          <button
            type="button"
            onClick={() => setAttachmentsOpen((v) => !v)}
            className="flex w-full items-center justify-between text-left hover:opacity-80 transition-opacity"
          >
            <span className="text-xs font-medium text-ink-soft">
              Attachments (optional)
            </span>
            <ChevronDown
              size={14}
              className={`text-ink-faint transition-transform ${attachmentsOpen ? "rotate-180" : ""}`}
            />
          </button>
          {attachmentsOpen && (
            <div className="mt-3">
              <AttachmentFields
                description={description}
                setDescription={(v) => { setDescription(v); setSaved(false); }}
                descriptionPlaceholder="Any notes for your instructor about this submission..."
                links={links}
                addLink={addLink}
                updateLink={updateLink}
                removeLink={removeLink}
                files={files}
                removeFile={removeFile}
                handleFileUpload={handleFileUpload}
                uploading={uploading}
              />
            </div>
          )}
        </div>
      ) : (
        <AttachmentFields
          description={description}
          setDescription={(v) => { setDescription(v); setSaved(false); }}
          descriptionPlaceholder="Describe what you worked on this week..."
          links={links}
          addLink={addLink}
          updateLink={updateLink}
          removeLink={removeLink}
          files={files}
          removeFile={removeFile}
          handleFileUpload={handleFileUpload}
          uploading={uploading}
        />
      )}

      {/* Error */}
      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={saving || !hasContent}
        className={buttonClass("dark", "md")}
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
        <div className="mt-5 pt-4 border-t border-rule-soft space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare size={14} className="text-ink-faint" />
            <h3 className="text-xs font-semibold text-ink-faint uppercase tracking-wide">
              Instructor Feedback
            </h3>
          </div>
          {feedback.map((fb) => (
            <div
              key={fb.id}
              className="border border-rule-soft bg-neutral-50 p-3"
            >
              <p className="text-sm text-ink">{fb.comment}</p>
              <p className="text-[11px] text-ink-faint mt-1">
                {fb.reviewer_name} · {new Date(fb.created_at).toLocaleDateString()}
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

function AttachmentFields({
  description,
  setDescription,
  descriptionPlaceholder,
  links,
  addLink,
  updateLink,
  removeLink,
  files,
  removeFile,
  handleFileUpload,
  uploading,
}: {
  description: string;
  setDescription: (v: string) => void;
  descriptionPlaceholder: string;
  links: SubmissionLink[];
  addLink: () => void;
  updateLink: (index: number, field: keyof SubmissionLink, value: string) => void;
  removeLink: (index: number) => void;
  files: SubmissionFile[];
  removeFile: (index: number) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
}) {
  return (
    <>
      {/* Description */}
      <div className="mb-4">
        <label className="text-xs font-medium text-ink-soft mb-1 block">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={descriptionPlaceholder}
          rows={3}
          className="w-full border border-rule bg-neutral-50 px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none resize-none"
        />
      </div>

      {/* Links */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-ink-soft">Links</label>
          <button
            type="button"
            onClick={addLink}
            className="inline-flex items-center gap-1 text-xs font-medium text-ink-soft hover:text-ink transition-colors"
          >
            <Plus size={12} />
            Add Link
          </button>
        </div>
        {links.length === 0 && (
          <p className="text-[11px] text-ink-faint">No links added yet</p>
        )}
        <div className="space-y-2">
          {links.map((link, i) => (
            <div key={i} className="flex gap-2 items-start">
              <LinkIcon size={14} className="mt-2.5 text-ink-faint shrink-0" />
              <input
                type="url"
                value={link.url}
                onChange={(e) => updateLink(i, "url", e.target.value)}
                placeholder="https://..."
                className="flex-1 border border-rule bg-neutral-50 px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
              />
              <input
                type="text"
                value={link.label}
                onChange={(e) => updateLink(i, "label", e.target.value)}
                placeholder="Label (optional)"
                className="w-32 sm:w-40 border border-rule bg-neutral-50 px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeLink(i)}
                className="mt-2 text-ink-faint hover:text-red-400 transition-colors shrink-0"
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
          <label className="text-xs font-medium text-ink-soft">Files</label>
          <label className={`inline-flex items-center gap-1 text-xs font-medium cursor-pointer transition-colors ${uploading ? "text-ink-faint" : "text-ink-soft hover:text-ink"}`}>
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
          <p className="text-[11px] text-ink-faint">No files uploaded yet</p>
        )}
        <div className="space-y-2">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2 border border-rule-soft bg-neutral-50 px-3 py-2"
            >
              <FileText size={14} className="text-ink-faint shrink-0" />
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-sm text-ink hover:text-ink truncate"
              >
                {file.name}
              </a>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="text-ink-faint hover:text-red-400 transition-colors shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
