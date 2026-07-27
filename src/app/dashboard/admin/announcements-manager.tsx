"use client";

import { useState, useTransition } from "react";
import { Megaphone, Trash as Trash2, Plus, CircleNotch as Loader2, PaperPlaneTilt as Send } from "@phosphor-icons/react";
import { createAnnouncement, deleteAnnouncement } from "./actions-misc";
import { humanizeSlug } from "@/lib/utils";

type Announcement = {
  id: string;
  message: string;
  track_slug: string | null;
  created_at: string;
  expires_at: string;
};

type Props = {
  announcements: Announcement[];
  tracks: { slug: string; name: string }[];
  programSlug: string;
};

export function AnnouncementsManager({ announcements: initial, tracks, programSlug }: Props) {
  const [announcements, setAnnouncements] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [trackSlug, setTrackSlug] = useState("");
  const [expiresHours, setExpiresHours] = useState(72);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCreate = async () => {
    if (!message.trim()) return;
    setSending(true);
    setError("");
    try {
      const expiresAt = new Date(Date.now() + expiresHours * 60 * 60 * 1000).toISOString();
      await createAnnouncement({
        programSlug,
        trackSlug: trackSlug || undefined,
        message: message.trim(),
        expiresAt,
      });
      // Add to local state optimistically
      setAnnouncements((prev) => [
        {
          id: crypto.randomUUID(),
          message: message.trim(),
          track_slug: trackSlug || null,
          created_at: new Date().toISOString(),
          expires_at: expiresAt,
        },
        ...prev,
      ]);
      setMessage("");
      setTrackSlug("");
      setShowForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create announcement");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  const trackName = (slug: string | null) => {
    if (!slug) return "All tracks";
    return tracks.find((t) => t.slug === slug)?.name ?? humanizeSlug(slug);
  };

  const expiresIn = (expiresAt: string) => {
    const hours = Math.round((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60));
    if (hours <= 0) return "Expired";
    if (hours < 24) return `${hours}h left`;
    return `${Math.round(hours / 24)}d left`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <Megaphone size={20} />
            Announcements
          </h2>
          <p className="text-sm text-ink-faint mt-0.5">
            Post updates to students. Track-specific announcements trigger email notifications.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-ink-soft"
        >
          <Plus size={16} />
          New announcement
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError("")} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="panel p-4 space-y-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What do you want to tell students?"
            rows={3}
            className="w-full rounded-lg border border-rule bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] resize-none"
          />
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-medium text-ink-soft">Track (optional)</label>
              <select
                value={trackSlug}
                onChange={(e) => setTrackSlug(e.target.value)}
                className="mt-1 block rounded-lg border border-rule bg-paper px-3 py-2 text-sm text-ink"
              >
                <option value="">All tracks (no email)</option>
                {tracks.map((t) => (
                  <option key={t.slug} value={t.slug}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-soft">Expires in</label>
              <select
                value={expiresHours}
                onChange={(e) => setExpiresHours(Number(e.target.value))}
                className="mt-1 block rounded-lg border border-rule bg-paper px-3 py-2 text-sm text-ink"
              >
                <option value={24}>24 hours</option>
                <option value={72}>3 days</option>
                <option value={168}>1 week</option>
                <option value={720}>30 days</option>
              </select>
            </div>
            <div className="flex-1" />
            <div className="flex gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-rule px-4 py-2 text-sm font-medium text-ink hover:bg-paper-tint transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!message.trim() || sending}
                className="flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-ink-soft disabled:opacity-50"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {trackSlug ? "Post & email" : "Post"}
              </button>
            </div>
          </div>
          {trackSlug && (
            <p className="text-xs text-ink-faint">
              📧 All students enrolled in <strong>{trackName(trackSlug)}</strong> will receive an email notification
              (unless they&apos;ve opted out).
            </p>
          )}
        </div>
      )}

      {/* Announcements list */}
      {announcements.length === 0 ? (
        <div className="panel p-8 text-center">
          <Megaphone size={32} className="mx-auto text-ink-faint mb-3" />
          <p className="text-sm text-ink-faint">No active announcements.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {announcements.map((a) => (
            <div key={a.id} className="panel flex items-start gap-3 p-4">
              <Megaphone size={16} className="mt-0.5 shrink-0 text-ink-faint" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink">{a.message}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                  <span className="rounded bg-paper-tint px-1.5 py-0.5">{trackName(a.track_slug)}</span>
                  <span>{expiresIn(a.expires_at)}</span>
                  <span>·</span>
                  <span>{new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(a.id)}
                disabled={deleting === a.id}
                className="shrink-0 rounded-lg p-2 text-ink-faint hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Delete announcement"
              >
                {deleting === a.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
