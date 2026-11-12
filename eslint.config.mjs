import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Not application source. Walking these (public/zoom alone is ~96M of
    // vendored JS) is what crashed the heap on a bare `eslint`.
    "public/**",
    "archive/**",
    "demo/**",
    "docs/**",
    "supabase/**",
    "learnerpathwayassessmenttoolbuildpacket/**",
    "qr-codes/**",
    "coverage/**",
  ]),
]);

export default eslintConfig;
