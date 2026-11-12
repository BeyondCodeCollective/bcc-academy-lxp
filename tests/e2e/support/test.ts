import { test as base, expect } from "@playwright/test";

/** Every test runs with all non-local network blocked: the app embeds third-party
 *  analytics/fonts, and the audit must never touch anything off localhost. */
export const blockedExternal: string[] = [];
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route(
      (url) => !["localhost", "127.0.0.1"].includes(url.hostname) && url.protocol.startsWith("http"),
      (route) => {
        blockedExternal.push(new URL(route.request().url()).hostname);
        return route.abort("blockedbyclient");
      },
    );
    await use(context);
  },
});
export { expect };
