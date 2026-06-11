/**
 * Copies Zoom Meeting SDK static assets from node_modules to public/zoom/
 * so they can be served as static files and loaded inside the zoom-frame iframe.
 * Runs as a prebuild step — keeps large binary files out of git.
 */
import { cpSync, mkdirSync, existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const src = resolve(root, "node_modules/@zoom/meetingsdk/dist");
const dest = resolve(root, "public/zoom");

mkdirSync(dest, { recursive: true });

// Client View SDK — the full-page web client (window.ZoomMtg). Unlike the
// Component View it fills the page with a responsive layout (no floating
// window) and supports enforceMultipleVideos, which the Component View's
// init() silently drops in 6.1.0. The bundle filename is versioned.
const { version } = JSON.parse(
  readFileSync(resolve(root, "node_modules/@zoom/meetingsdk/package.json"), "utf8")
);
cpSync(`${src}/zoom-meeting-${version}.min.js`, `${dest}/zoom-meeting.min.js`);

// Vendor globals — the bundle declares these as webpack externals, so they
// must load before it: React 18, ReactDOM, Redux, Redux-Thunk, Lodash
mkdirSync(`${dest}/lib/vendor`, { recursive: true });
for (const f of ["react.min.js", "react-dom.min.js", "redux.min.js", "redux-thunk.min.js", "lodash.min.js"]) {
  cpSync(`${src}/lib/vendor/${f}`, `${dest}/lib/vendor/${f}`);
}

// In-meeting chat module — loaded at runtime from lib/
cpSync(`${src}/lib/webim.min.js`, `${dest}/lib/webim.min.js`);

// Audio assets
cpSync(`${src}/lib/audio`, `${dest}/lib/audio`, { recursive: true });

// Image assets
if (existsSync(`${src}/lib/image`)) {
  cpSync(`${src}/lib/image`, `${dest}/lib/image`, { recursive: true });
}

// Language packs (client view i18n)
if (existsSync(`${src}/lib/lang`)) {
  cpSync(`${src}/lib/lang`, `${dest}/lib/lang`, { recursive: true });
}

// AV processing assets (WASM + workers) — self-hosted so we don't depend on
// source.zoom.us CDN, which is the most common cause of embed failures
cpSync(`${src}/lib/av`, `${dest}/lib/av`, { recursive: true });

// UI chunks (CSS + lazy JS) — loaded on demand by the SDK at runtime
cpSync(`${src}/ui`, `${dest}/ui`, { recursive: true });

console.log("✓ Zoom SDK assets copied to public/zoom/");
