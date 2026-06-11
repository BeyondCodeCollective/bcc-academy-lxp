/**
 * Copies Zoom Meeting SDK static assets from node_modules to public/zoom/
 * so they can be served as static files and loaded inside the zoom-frame iframe.
 * Runs as a prebuild step — keeps large binary files out of git.
 */
import { cpSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const src = resolve(root, "node_modules/@zoom/meetingsdk/dist");
const dest = resolve(root, "public/zoom");

mkdirSync(dest, { recursive: true });

// Component View SDK — self-contained webpack bundle, sets window.ZoomMtgEmbedded
// (zoom-meeting-embedded-ES5.min.js is the correct file; zoomus-websdk-embedded.umd.min.js
// incorrectly exports window.ReactWidgets and is NOT the SDK entry point)
cpSync(`${src}/zoom-meeting-embedded-ES5.min.js`, `${dest}/zoom-meeting-embedded.min.js`);

// Audio assets
cpSync(`${src}/lib/audio`, `${dest}/lib/audio`, { recursive: true });

// Image assets
if (existsSync(`${src}/lib/image`)) {
  cpSync(`${src}/lib/image`, `${dest}/lib/image`, { recursive: true });
}

// AV processing assets (WASM + workers) — self-hosted so we don't depend on
// source.zoom.us CDN, which is the most common cause of embed failures
cpSync(`${src}/lib/av`, `${dest}/lib/av`, { recursive: true });

// UI chunks (CSS + lazy JS) — needed for the Component View UI to render
cpSync(`${src}/ui`, `${dest}/ui`, { recursive: true });

console.log("✓ Zoom SDK assets copied to public/zoom/");
