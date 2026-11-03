export function parseLearnerSort(params: { sortBy?: string | string[]; sortOrder?: string | string[] }) {
  const sortBy = params.sortBy === undefined || params.sortBy === "" ? "name" : params.sortBy;
  const sortOrder = params.sortOrder === undefined || params.sortOrder === "" ? "asc" : params.sortOrder;
  if (sortBy !== "name" && sortBy !== "email") throw new Error("Choose name or email sorting.");
  if (sortOrder !== "asc" && sortOrder !== "desc") throw new Error("Choose ascending or descending sorting.");
  return { sortBy, sortOrder };
}

type SortableLearner = { id: string; firstName: string | null; lastName: string | null; email: string | null };
// Sort the complete deduplicated roster before slicing a page. Missing values
// stay last in either direction. A binary ID comparison breaks every name/email
// tie independently of database batch order. Input records are not mutated.
export function sortLearners<T extends SortableLearner>(rows: T[], sorting: ReturnType<typeof parseLearnerSort>): T[] {
  const collator = new Intl.Collator("en-US", { sensitivity: "base", numeric: true });
  const direction = sorting.sortOrder === "asc" ? 1 : -1;
  const text = (a: string | null, b: string | null) => {
    const left = a?.trim() || ""; const right = b?.trim() || "";
    if (!left || !right) return left ? -1 : right ? 1 : 0;
    return direction * collator.compare(left, right);
  };
  return [...rows].sort((a, b) => {
    let compared: number;
    if (sorting.sortBy === "email") compared = text(a.email, b.email);
    else {
      const hasA = Boolean(a.lastName?.trim() || a.firstName?.trim());
      const hasB = Boolean(b.lastName?.trim() || b.firstName?.trim());
      compared = hasA !== hasB ? (hasA ? -1 : 1) : text(a.lastName, b.lastName) || text(a.firstName, b.firstName);
    }
    return compared || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  });
}
