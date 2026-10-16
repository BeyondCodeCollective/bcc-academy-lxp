// Self-reported fields stay separate: no geocoding, ZIP truncation, or inferred
// city/state crosswalk. Conflicting profiles count as missing, not two people.
export type MvpGeographyProfile = { id: string; location: string | null; zip: string | null; state: string | null };
export function calculateMvpGeography(profiles: MvpGeographyProfile[]) {
  const distribution = (field: "location" | "zip" | "state") => {
    const values = new Map<string, Set<string>>();
    for (const profile of profiles) {
      const set = values.get(profile.id) ?? new Set<string>();
      set.add(profile[field]?.trim() ?? "");
      values.set(profile.id, set);
    }
    const counts = new Map<string, number>();
    let missingCount = 0;
    for (const set of values.values()) {
      const label = [...set][0];
      if (set.size !== 1 || !label) { missingCount++; continue; }
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return { respondentCount: values.size - missingCount, missingCount,
      groups: [...counts].sort(([a], [b]) => a.localeCompare(b, "en-US")).map(([label, count]) => ({ label, count })) };
  };
  return { unit: "Unique current learners", source: "Self-reported profile fields",
    locations: distribution("location"), postalCodes: distribution("zip"), states: distribution("state"),
    verifiedCities: null, unavailableReason: "No verified city field or geographic crosswalk is available." };
}
