"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createLunchLearn, deleteLunchLearn, updateLunchLearn, type LunchLearnInput } from "../actions";

type Recording = {
  id: string;
  title: string;
  presenter: string;
  recording_url: string;
  description: string | null;
  recorded_at: string;
};

const blankInput: LunchLearnInput = {
  title: "",
  presenter: "",
  recording_url: "",
  description: "",
  recorded_at: new Date().toISOString().slice(0, 10),
};

export function LunchLearnAdmin({ recordings, embedded }: { recordings: Recording[]; embedded?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LunchLearnInput>(blankInput);
  const [error, setError] = useState<string | null>(null);

  const startEdit = (r: Recording) => {
    setEditingId(r.id);
    setForm({
      title: r.title,
      presenter: r.presenter,
      recording_url: r.recording_url,
      description: r.description ?? "",
      recorded_at: r.recorded_at,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(blankInput);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.title.trim() || !form.presenter.trim() || !form.recording_url.trim() || !form.recorded_at) {
      setError("Title, presenter, recording URL, and date are required.");
      return;
    }
    startTransition(async () => {
      try {
        if (editingId) {
          await updateLunchLearn(editingId, form);
        } else {
          await createLunchLearn(form);
        }
        cancelEdit();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this recording? This can't be undone.")) return;
    startTransition(async () => {
      try {
        await deleteLunchLearn(id);
        if (editingId === id) cancelEdit();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  };

  return (
    <div className={embedded ? "w-full" : "mx-auto w-full max-w-2xl md:max-w-4xl px-4 sm:px-5 py-10 md:py-14"}>
      {!embedded && (
        <>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-soft hover:text-ink mb-6"
          >
            ←
            Back to Lunch &amp; Learns
          </Link>

          <header className="mb-10">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-faint mb-3">
              Admin
            </p>
            <h1 className="text-3xl font-semibold text-ink tracking-[-0.02em]">
              Manage recordings
            </h1>
            <p className="mt-2 text-[14px] text-ink-soft">
              Paste a Google Drive share URL after a Lunch &amp; Learn session.
              Make sure the Drive file is shared so staff can view it.
            </p>
          </header>
        </>
      )}

      {embedded && (
        <p className="text-[14px] text-ink-soft mb-8">
          Paste a Google Drive share URL after a Lunch &amp; Learn session.
          Make sure the Drive file is shared so staff can view it.
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="border border-rule-soft bg-paper p-5 sm:p-6 mb-10"
      >
        <p className="text-[13px] font-semibold text-ink mb-4">
          {editingId ? "Edit recording" : "Add a recording"}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Title" required>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inputCls}
              placeholder="Intro to Notion"
            />
          </Field>
          <Field label="Presenter" required>
            <input
              type="text"
              value={form.presenter}
              onChange={(e) => setForm({ ...form, presenter: e.target.value })}
              className={inputCls}
              placeholder="Jane Smith"
            />
          </Field>
          <Field label="Recorded on" required>
            <input
              type="date"
              value={form.recorded_at}
              onChange={(e) => setForm({ ...form, recorded_at: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Google Drive URL" required>
            <input
              type="url"
              value={form.recording_url}
              onChange={(e) => setForm({ ...form, recording_url: e.target.value })}
              className={inputCls}
              placeholder="https://drive.google.com/file/d/..."
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description (optional)">
              <textarea
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className={`${inputCls} resize-y`}
                placeholder="What this session covered and who it's for."
              />
            </Field>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-[13px] text-red-600">{error}</p>
        )}

        <div className="mt-5 flex items-center gap-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-1.5 bg-ink text-paper text-[13px] font-semibold px-4 py-2.5 transition-colors hover:bg-ink-soft disabled:opacity-50"
          >
            {pending ? "Saving…" : editingId ? "Save changes" : "Add recording"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="text-[13px] text-ink-soft hover:text-ink"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <section>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-faint mb-4">
          All recordings ({recordings.length})
        </p>
        {recordings.length === 0 ? (
          <p className="text-[13px] text-ink-soft">
            No recordings yet. Add the first one above.
          </p>
        ) : (
          <ul className="border-y border-rule">
            {recordings.map((r, i) => (
              <li
                key={r.id}
                className={`grid grid-cols-[1fr_auto] items-center gap-x-4 px-1 py-4 ${
                  i > 0 ? "border-t border-rule-soft" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-ink truncate">{r.title}</p>
                  <p className="text-[12px] text-ink-soft mt-0.5">
                    {r.presenter} ·{" "}
                    {new Date(r.recorded_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(r)}
                    className="px-2.5 py-1.5 text-[12px] font-medium text-ink-soft hover:bg-paper-tint-soft hover:text-ink"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id)}
                    disabled={pending}
                    aria-label="Delete recording"
                    className="p-1.5 text-ink-faint hover:bg-paper-tint-soft hover:text-red-600 disabled:opacity-50"
                  >
                    🗑️
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const inputCls =
  "w-full border border-rule-soft bg-paper px-3 py-2 text-[14px] text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none focus:ring-0";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-ink-soft mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}
