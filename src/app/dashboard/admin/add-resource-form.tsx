"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CATEGORY_LABELS } from "@/lib/utils";
import { CheckCircle } from "lucide-react";

const CATEGORIES = [
  "course_materials",
  "recordings",
  "career_prep",
  "program_info",
] as const;

export function AddResourceForm({ cohortId }: { cohortId: string }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("resources").insert({
      cohort_id: cohortId,
      title,
      description: description || null,
      url: url || null,
      category,
    });

    if (insertError) {
      setError("Failed to add resource. Please try again.");
      setLoading(false);
      return;
    }

    setTitle("");
    setDescription("");
    setUrl("");
    setCategory(CATEGORIES[0]);
    setSuccess(true);
    setLoading(false);
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-border p-4"
    >
      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="description"
          className="mb-1 block text-sm font-medium"
        >
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="url" className="mb-1 block text-sm font-medium">
          URL
        </label>
        <input
          id="url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="category" className="mb-1 block text-sm font-medium">
          Category
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {success && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle size={16} />
          Resource added successfully
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {loading ? "Adding..." : "Add Resource"}
      </button>
    </form>
  );
}
