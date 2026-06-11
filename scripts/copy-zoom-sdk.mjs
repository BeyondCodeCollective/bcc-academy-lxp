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

// UMD bundle (Component View)
cpSync(`${src}/zoomus-websdk-embedded.umd.min.js`, `${dest}/zoomus-websdk-embedded.umd.min.js`);

// React 18 vendor files (isolated from app React 19)
mkdirSync(`${dest}/lib/vendor`, { recursive: true });
cpSync(`${src}/lib/vendor/react.min.js`, `${dest}/lib/vendor/react.min.js`);
cpSync(`${src}/lib/vendor/react-dom.min.js`, `${dest}/lib/vendor/react-dom.min.js`);

// Other vendor deps the SDK needs
const otherVendor = ["redux.min.js", "redux-thunk.min.js", "lodash.min.js"];
for (const f of otherVendor) {
  if (existsSync(`${src}/lib/vendor/${f}`)) {
    cpSync(`${src}/lib/vendor/${f}`, `${dest}/lib/vendor/${f}`);
  }
}

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
