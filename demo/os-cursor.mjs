// Real macOS cursor control via `cliclick`, so Screen Studio's auto-zoom + cursor
// effects follow the automation. Playwright finds elements (CSS-px coords); we map
// those to macOS screen points using the live window position and move/click the
// REAL cursor. (Screen points == CSS px on macOS, incl. Retina — no DPR math.)
import { execFileSync } from "node:child_process";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cli(arg) {
  try { execFileSync("cliclick", [arg], { stdio: ["ignore", "ignore", "ignore"] }); return true; }
  catch { return false; }
}

export function cliclickAvailable() {
  try { execFileSync("cliclick", ["p"], { stdio: ["ignore", "pipe", "ignore"] }); return true; }
  catch { return false; }
}

function currentPos() {
  try {
    const out = execFileSync("cliclick", ["p"], { encoding: "utf8" });
    const m = out.match(/(-?\d+)\s*,\s*(-?\d+)/);
    if (m) return { x: +m[1], y: +m[2] };
  } catch {}
  return null;
}

// Browser content area's top-left in screen points (window pos + chrome height).
async function contentOffset(page) {
  return page.evaluate(() => ({
    x: window.screenX,
    y: window.screenY + (window.outerHeight - window.innerHeight),
  }));
}

// Move the real cursor to (x,y) screen points, interpolated so there's a path
// for Screen Studio to smooth and zoom along.
export async function osMoveScreen(x, y, { steps = 28, stepMs = 16 } = {}) {
  const start = currentPos() ?? { x, y };
  const dx = x - start.x;
  const dy = y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  // perpendicular unit vector → gentle bow off the straight line (human-ish)
  const nx = -dy / len;
  const ny = dx / len;
  const arc = Math.min(36, len * 0.07);
  // easeInOutCubic: accelerate then decelerate, like a hand-moved cursor
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const p = ease(t);
    const bow = Math.sin(p * Math.PI) * arc;
    const ix = Math.round(start.x + dx * p + nx * bow);
    const iy = Math.round(start.y + dy * p + ny * bow);
    cli(`m:${ix},${iy}`);
    await sleep(stepMs);
  }
}

async function elementScreenPoint(page, locator) {
  const box = await locator.boundingBox();
  if (!box) return null;
  const off = await contentOffset(page);
  return {
    x: Math.round(off.x + box.x + box.width / 2),
    y: Math.round(off.y + box.y + box.height / 2),
  };
}

/** Move the real cursor to an element (no click). */
export async function pointAt(page, locator, opts) {
  const p = await elementScreenPoint(page, locator);
  if (p) await osMoveScreen(p.x, p.y, opts);
  return p;
}

/** Move to an element and real-click it. */
export async function clickAt(page, locator, opts) {
  const p = await pointAt(page, locator, opts);
  if (p) { await sleep(140); cli(`c:${p.x},${p.y}`); await sleep(120); }
  return p;
}
