import "server-only";

import { getEveryProgramConfig } from "@/lib/programs";
import type { ProgramConfig, TrackConfig } from "@/lib/programs/types";
import type { createServiceClient } from "@/lib/supabase/server";
import { sendCertificateEmail, sendCertificatePdfToStaff } from "@/lib/email";
import { listDriveFileNames, uploadPdfToDrive } from "@/lib/google-drive";
import { loadCertificate } from "./data";
import { certificateFileName, renderCertificatePdf } from "./pdf";

type Svc = ReturnType<typeof createServiceClient>;

// Automatic certificates for tracks that opt in with `autoCertificate`.
// markVideoWatched calls autoIssueIfFinished the moment a learner marks the
// last video; the nightly sweep repeats the check for everyone (a missed
// email or a failed upload must not be permanent) and files any certificate
// on those tracks that is not in the Drive folder yet.

function autoTracks(): { program: ProgramConfig; track: TrackConfig }[] {
  return getEveryProgramConfig().flatMap((program) =>
    program.tracks.filter((t) => t.autoCertificate).map((track) => ({ program, track })),
  );
}

async function programId(svc: Svc, slug: string): Promise<string | null> {
  const { data } = await svc.from("programs").select("id").eq("slug", slug).maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

/** Learners (not staff, not test accounts) who have marked every week watched. */
async function finishedLearners(svc: Svc, track: TrackConfig, studentIds: string[]): Promise<string[]> {
  if (studentIds.length === 0) return [];
  const [{ data: watched }, { data: people }] = await Promise.all([
    svc
      .from("week_progress")
      .select("user_id, week_number")
      .eq("track_slug", track.slug)
      .in("user_id", studentIds)
      .not("video_watched_at", "is", null),
    svc.from("students").select("id, role, is_staff, is_test").in("id", studentIds),
  ]);
  const weeks = new Map<string, Set<number>>();
  for (const w of (watched ?? []) as { user_id: string; week_number: number }[]) {
    (weeks.get(w.user_id) ?? weeks.set(w.user_id, new Set()).get(w.user_id)!).add(w.week_number);
  }
  return ((people ?? []) as { id: string; role: string; is_staff: boolean | null; is_test: boolean | null }[])
    .filter((p) => p.role === "student" && !p.is_staff && !p.is_test)
    .filter((p) => Array.from({ length: track.totalWeeks }, (_, i) => i + 1).every((w) => weeks.get(p.id)?.has(w)))
    .map((p) => p.id);
}

/** File one certificate's PDF to the Drive folder. No-op when Drive is not set up. */
export async function fileCertificateToDrive(certificateId: string): Promise<{ ok: boolean; error?: string }> {
  const folderId = process.env.CERTIFICATES_DRIVE_FOLDER_ID;
  if (!folderId) return { ok: false, error: "CERTIFICATES_DRIVE_FOLDER_ID not set" };
  const cert = await loadCertificate(certificateId);
  if (!cert) return { ok: false, error: "certificate not found" };
  const bytes = await renderCertificatePdf(cert);
  const res = await uploadPdfToDrive({ name: certificateFileName(cert), bytes, folderId });
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

/** Email the PDF to CERTIFICATE_NOTIFY_EMAIL so a person knows a certificate
 *  was issued and can file it. Never blocks or fails the issue. */
async function copyToStaff(certificateId: string, programName: string, courseName: string): Promise<void> {
  const to = process.env.CERTIFICATE_NOTIFY_EMAIL;
  if (!to) return;
  try {
    const cert = await loadCertificate(certificateId);
    if (!cert) return;
    await sendCertificatePdfToStaff({
      to,
      studentName: cert.studentName,
      courseName,
      programName,
      fileName: certificateFileName(cert),
      pdf: await renderCertificatePdf(cert),
    });
  } catch (e) {
    console.error("[auto-certificate] staff copy failed", certificateId, e);
  }
}

/** Issue, email and file a certificate for a learner already known to have
 *  finished. Returns the new certificate id, or null when they already had one. */
async function issueFor(svc: Svc, program: ProgramConfig, track: TrackConfig, pid: string, studentId: string) {
  const { data: existing } = await svc
    .from("track_completions")
    .select("certificate_id")
    .eq("student_id", studentId)
    .eq("track_slug", track.slug)
    .eq("program_id", pid)
    .maybeSingle();
  // Already certified (by an admin or an earlier pass): never email twice.
  if (existing) return null;

  const { data: row, error } = await svc
    .from("track_completions")
    .insert({ student_id: studentId, track_slug: track.slug, program_id: pid })
    .select("certificate_id")
    .single<{ certificate_id: string }>();
  // A unique violation means a concurrent call issued it first; that call emails.
  if (error || !row) return null;

  const { data: student } = await svc
    .from("students")
    .select("first_name, email")
    .eq("id", studentId)
    .maybeSingle<{ first_name: string | null; email: string | null }>();
  if (student?.email) {
    try {
      await sendCertificateEmail({
        to: student.email,
        firstName: student.first_name ?? "",
        programName: program.name,
        courseName: track.certificateName ?? track.name,
        certificateUrl: `https://${program.domain}/certificate/${row.certificate_id}`,
      });
    } catch (e) {
      console.error("[auto-certificate] email failed", row.certificate_id, e);
    }
  }
  await copyToStaff(row.certificate_id, program.name, track.certificateName ?? track.name);
  if (process.env.CERTIFICATES_DRIVE_FOLDER_ID) {
    const filed = await fileCertificateToDrive(row.certificate_id);
    if (!filed.ok) console.error("[auto-certificate] drive filing failed", row.certificate_id, filed.error);
  }
  return row.certificate_id;
}

export async function autoIssueIfFinished(svc: Svc, studentId: string, trackSlug: string): Promise<void> {
  const match = autoTracks().find((t) => t.track.slug === trackSlug);
  if (!match) return;
  const [finished] = await finishedLearners(svc, match.track, [studentId]);
  if (!finished) return;
  const pid = await programId(svc, match.program.slug);
  if (pid) await issueFor(svc, match.program, match.track, pid, studentId);
}

export type AutoCertificateSweep = { issued: number; filed: number; errors: string[] };

export async function sweepAutoCertificates(svc: Svc): Promise<AutoCertificateSweep> {
  const out: AutoCertificateSweep = { issued: 0, filed: 0, errors: [] };
  const folderId = process.env.CERTIFICATES_DRIVE_FOLDER_ID;
  const onDrive = folderId ? await listDriveFileNames(folderId) : null;
  if (folderId && !onDrive) out.errors.push("could not list the Drive folder; skipped filing");

  for (const { program, track } of autoTracks()) {
    const pid = await programId(svc, program.slug);
    if (!pid) continue;
    const { data: enrolled } = await svc
      .from("student_tracks")
      .select("student_id")
      .eq("program_id", pid)
      .eq("track_slug", track.slug);
    const ids = [...new Set(((enrolled ?? []) as { student_id: string }[]).map((e) => e.student_id))];
    const justIssued = new Set<string>();
    for (const sid of await finishedLearners(svc, track, ids)) {
      const id = await issueFor(svc, program, track, pid, sid);
      if (id) {
        out.issued++;
        justIssued.add(id);
      }
    }

    if (!onDrive) continue;
    const { data: certs } = await svc
      .from("track_completions")
      .select("certificate_id")
      .eq("program_id", pid)
      .eq("track_slug", track.slug);
    for (const { certificate_id } of (certs ?? []) as { certificate_id: string }[]) {
      // issueFor above already filed the ones it just created.
      if (justIssued.has(certificate_id)) continue;
      if (onDrive.some((n) => n.includes(`(${certificate_id.slice(0, 8)})`))) continue;
      const res = await fileCertificateToDrive(certificate_id);
      if (res.ok) {
        out.filed++;
        onDrive.push(`(${certificate_id.slice(0, 8)})`);
      } else {
        out.errors.push(`${certificate_id}: ${res.error}`);
      }
    }
  }
  return out;
}
