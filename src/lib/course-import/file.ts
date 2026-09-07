// Turns an uploaded file into an ImportSource for the course parser.
//
// PDF: passed to the model as raw bytes — Gemini reads PDFs natively (layout,
// tables, even scans), which beats any text extraction we could do here.
// DOCX/PPTX: both are zips of XML; the visible text lives in <w:t>/<a:t> runs.
// Pulling those runs out loses formatting but keeps every word, and the parser
// only needs the words. Slides are joined in order so a schedule spread across
// a deck still reads chronologically.

import JSZip from "jszip";
import type { ImportSource, SourceResult } from "./source";

export const MAX_FILE_BYTES = 15 * 1024 * 1024; // matches the UI copy: 15MB

const ACCEPTED = {
  pdf: [".pdf"],
  docx: [".docx"],
  pptx: [".pptx"],
} as const;

type FileKind = keyof typeof ACCEPTED | null;

function detectKind(fileName: string): FileKind {
  const lower = fileName.toLowerCase();
  for (const [kind, exts] of Object.entries(ACCEPTED)) {
    if (exts.some((ext) => lower.endsWith(ext))) return kind as FileKind;
  }
  return null;
}

/** Decode the XML entities that appear in Office text runs. */
function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}

/** Concatenate the text runs matching `runTag` (w:t for Word, a:t for
 *  PowerPoint), inserting breaks at paragraph boundaries so lines don't fuse
 *  into one unreadable blob. */
function extractRuns(xml: string, runTag: string, paraTag: string): string {
  const paras = xml.split(new RegExp(`</${paraTag}>`));
  const runRe = new RegExp(`<${runTag}[^>]*>([^<]*)</${runTag}>`, "g");
  return paras
    .map((p) => [...p.matchAll(runRe)].map((m) => decodeEntities(m[1])).join(""))
    .filter((line) => line.trim())
    .join("\n");
}

async function extractDocx(buf: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  const doc = zip.file("word/document.xml");
  if (!doc) return "";
  return extractRuns(await doc.async("string"), "w:t", "w:p");
}

async function extractPptx(buf: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  const slideNames = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const num = (n: string) => Number(n.match(/slide(\d+)\.xml$/)![1]);
      return num(a) - num(b);
    });
  const slides: string[] = [];
  for (const name of slideNames) {
    const xml = await zip.file(name)!.async("string");
    const text = extractRuns(xml, "a:t", "a:p");
    if (text.trim()) slides.push(text);
  }
  return slides.join("\n\n---\n\n");
}

export async function extractFileSource(
  fileName: string,
  buf: Buffer,
): Promise<SourceResult> {
  const kind = detectKind(fileName);
  if (!kind) {
    return {
      ok: false,
      needsPaste: true,
      error: "Only PDF, Word (.docx), and PowerPoint (.pptx) files are supported. Paste the text instead.",
    };
  }
  if (buf.byteLength > MAX_FILE_BYTES) {
    return { ok: false, error: "That file is over 15MB. Export a smaller version or paste the text." };
  }
  if (buf.byteLength === 0) {
    return { ok: false, error: "That file appears to be empty." };
  }

  if (kind === "pdf") {
    const source: ImportSource = {
      kind: "pdf",
      text: "",
      dataBase64: buf.toString("base64"),
      fileName,
    };
    return { ok: true, source };
  }

  let text: string;
  try {
    text = kind === "docx" ? await extractDocx(buf) : await extractPptx(buf);
  } catch {
    return {
      ok: false,
      needsPaste: true,
      error: "Could not read that file — it may be corrupted or an older Office format (.doc/.ppt). Paste the text instead.",
    };
  }

  if (!text.trim()) {
    return {
      ok: false,
      needsPaste: true,
      error: "No text found in that file. If it's mostly images, paste the details instead.",
    };
  }

  return { ok: true, source: { kind: "file", text, fileName } };
}
