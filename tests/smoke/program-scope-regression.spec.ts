import { test, expect } from "@playwright/test";
import { admin } from "./helpers/supabase";
import { resolveProgramScope } from "../../src/lib/programs/scope";

/**
 * Regression tests to ensure each program scopes to its own program_id
 * in resolveProgramScope and Survey Insights
 */

// Programs that should each have their own isolated scope
const PROGRAM_SLUGS = [
  "catalyst",           // Main hub program
  "atg",                // Beyond the Game
  "beyond-code-centers", // AI Literacy program
  "forte",              // Upskill Bahamas
];

test.describe("Program Scope Regression Tests", () => {
  test("each program resolves to exactly one distinct program_id", async () => {
    const svc = admin();

    // Get all program IDs from the database
    const { data: programs, error: progErr } = await svc.from("programs").select("id, slug");
    expect(progErr, progErr?.message).toBeNull();

    const programMap = new Map((programs ?? []).map(p => [p.slug, p.id]));

    // Test each program slug resolves to exactly one program_id
    const programScopes = new Map<string, string[]>();

    for (const slug of PROGRAM_SLUGS) {
      const scope = await resolveProgramScope(slug);

      // Each program should resolve to exactly one program_id
      expect(scope.ids, `Program '${slug}' should resolve to exactly one program_id`).toHaveLength(1);

      // Store the resolved program_id for this slug
      programScopes.set(slug, scope.ids);
    }

    // Verify that each program has a unique program_id
    const programIds = Array.from(programScopes.values()).flat();
    const uniqueProgramIds = [...new Set(programIds)];

    expect(
      programIds.length,
      "Each program should have a unique program_id"
    ).toBe(uniqueProgramIds.length);

    // Also verify that each program_id matches what's in the database
    for (const [slug, ids] of programScopes.entries()) {
      const expectedId = programMap.get(slug);
      expect(expectedId, `Program '${slug}' not found in database`).toBeDefined();
      expect(ids[0], `Program '${slug}' resolved to wrong program_id`).toBe(expectedId);
    }
  });

  test("program scopes are isolated - no cross-program leakage", async () => {
    // Test that resolving scopes for different programs returns different IDs
    const scopes = new Map<string, string[]>();

    for (const slug of PROGRAM_SLUGS) {
      const scope = await resolveProgramScope(slug);
      scopes.set(slug, scope.ids);
    }

    // Verify no program shares the same program_id
    const scopeEntries = Array.from(scopes.entries());

    for (let i = 0; i < scopeEntries.length; i++) {
      for (let j = i + 1; j < scopeEntries.length; j++) {
        const [slug1, ids1] = scopeEntries[i];
        const [slug2, ids2] = scopeEntries[j];

        expect(
          ids1[0],
          `Programs '${slug1}' and '${slug2}' should have different program_ids`
        ).not.toBe(ids2[0]);
      }
    }
  });

  test("survey insights scope isolation", async () => {
    const svc = admin();

    // Get all program IDs from the database for verification
    const { data: programs, error: progErr } = await svc.from("programs").select("id, slug");
    expect(progErr, progErr?.message).toBeNull();

    const programMap = new Map((programs ?? []).map(p => [p.slug, p.id]));

    // For each program, verify that survey responses are scoped correctly
    for (const slug of PROGRAM_SLUGS) {
      const scope = await resolveProgramScope(slug);
      const programId = scope.ids[0];
      const expectedDbId = programMap.get(slug);

      // Verify the resolved program_id matches what's in the database
      expect(programId, `Resolved program_id for '${slug}' should match database`).toBe(expectedDbId);

      // Verify the scope contains only the expected program_id
      expect(scope.slugs, `Scope slugs for '${slug}' should contain only the program slug`).toEqual([slug]);
      expect(scope.ids, `Scope ids for '${slug}' should contain only the program id`).toEqual([programId]);
    }
  });

  test("legacy catalyst aggregation is properly disabled", async () => {
    // Test that Catalyst no longer aggregates other programs
    const catalystScope = await resolveProgramScope("catalyst");

    // Catalyst should resolve to exactly one program_id (its own)
    expect(catalystScope.ids, "Catalyst should resolve to exactly one program_id").toHaveLength(1);

    // Verify that Catalyst doesn't include other program IDs
    const otherScopes = [];
    for (const slug of ["atg", "beyond-code-centers", "forte"]) {
      const scope = await resolveProgramScope(slug);
      otherScopes.push(...scope.ids);
    }

    // Catalyst program_id should not overlap with other program_ids
    expect(
      otherScopes,
      "Catalyst program_id should not overlap with other program_ids"
    ).not.toContain(catalystScope.ids[0]);
  });
});