import "server-only";
import { Sandbox } from "@vercel/sandbox";

// The hosted lab: one named, persistent Vercel Sandbox per (learner, track).
// The instructor runs every hands-on step here so the learner installs
// nothing. The SDK resumes a persistent sandbox by name; its filesystem
// survives between sessions, so the agent a learner built on Tuesday is still
// there on Thursday.
//
// Auth: OIDC on Vercel (automatic). Locally, `vercel env pull` provides
// VERCEL_OIDC_TOKEN. See src/lib/instructor/README.md.

export const LAB_ROOT = "/vercel/sandbox/course";

// Public, synthetic course material. Pinned to main; the seed script points at
// the same repo so lesson text and lab files can't drift apart.
const COURSE_TARBALL =
  "https://codeload.github.com/youngfonz/course-builder/tar.gz/refs/heads/main";
const COURSE_DIR_IN_TARBALL = "course-builder-main/forward-deploy-course";

// A sandbox idles out after this long without a command. Sessions are about an
// hour; a generous window means one reconnect per session at most.
const LAB_TIMEOUT_MS = 90 * 60 * 1000;
// Any single command. Long enough for `pip install`, short enough that a
// runaway loop can't hold a function open.
export const COMMAND_TIMEOUT_MS = 90 * 1000;
// Output we keep per command. The model summarises; it doesn't need 2 MB of
// CSV echoed back.
const MAX_OUTPUT_CHARS = 12_000;

export function labName(studentId: string, trackSlug: string): string {
  // Sandbox names are short identifiers; keep it predictable and unique.
  return `lab-${trackSlug}-${studentId.replace(/-/g, "").slice(0, 24)}`;
}

export async function getLab(studentId: string, trackSlug: string): Promise<Sandbox> {
  return Sandbox.getOrCreate({
    name: labName(studentId, trackSlug),
    persistent: true,
    timeout: LAB_TIMEOUT_MS,
    resources: { vcpus: 1 },
    tags: { app: "bcc-academy", feature: "instructor-lab", track: trackSlug },
    onCreate: async (sandbox) => {
      // Fresh lab: lay down the course folder once. Later sessions find it.
      await sandbox.runCommand("sh", [
        "-c",
        `mkdir -p ${LAB_ROOT} && curl -fsSL "${COURSE_TARBALL}" | tar xz -C ${LAB_ROOT} --strip-components=2 "${COURSE_DIR_IN_TARBALL}" && mkdir -p ${LAB_ROOT}/output ${LAB_ROOT}/mine`,
      ]);
    },
  });
}

export type LabRun = {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  truncated: boolean;
};

function clip(s: string): { text: string; truncated: boolean } {
  if (s.length <= MAX_OUTPUT_CHARS) return { text: s, truncated: false };
  return { text: s.slice(0, MAX_OUTPUT_CHARS) + "\n…[truncated]", truncated: true };
}

/** Run one shell command inside the course folder. Never sudo. */
export async function runInLab(sandbox: Sandbox, command: string): Promise<LabRun> {
  // The array form is the only one that takes a timeout, and it has no cwd, so
  // the course folder is entered inside the shell.
  const result = await sandbox.runCommand("sh", ["-c", `cd ${LAB_ROOT} && ${command}`], {
    timeoutMs: COMMAND_TIMEOUT_MS,
  });
  const [out, err] = await Promise.all([result.stdout(), result.stderr()]);
  const o = clip(out);
  const e = clip(err);
  return {
    command,
    exitCode: result.exitCode,
    stdout: o.text,
    stderr: e.text,
    truncated: o.truncated || e.truncated,
  };
}

// Paths the instructor may touch. Everything lives under the course folder;
// no reaching into the VM.
export function labPath(relative: string): string | null {
  const cleaned = relative.replace(/^\/+/, "");
  if (!cleaned || cleaned.split("/").some((seg) => seg === "..")) return null;
  return `${LAB_ROOT}/${cleaned}`;
}

export async function readLabFile(sandbox: Sandbox, relative: string): Promise<string> {
  const p = labPath(relative);
  if (!p) throw new Error("Path must stay inside the course folder.");
  const text = await sandbox.fs.readFile(p, "utf8");
  const c = clip(text);
  return c.text;
}

export async function writeLabFile(
  sandbox: Sandbox,
  relative: string,
  content: string,
): Promise<void> {
  const p = labPath(relative);
  if (!p) throw new Error("Path must stay inside the course folder.");
  const dir = p.slice(0, p.lastIndexOf("/"));
  await sandbox.runCommand("mkdir", ["-p", dir]);
  await sandbox.fs.writeFile(p, content);
}
