// Tiny chainable PostgREST stand-in for pure unit tests. Every filter returns
// the builder; awaiting it (or maybeSingle/single) resolves whatever the
// per-table resolver returns. Records every call for assertions.
export type Call = { table: string; op: string; args: unknown[] };
export type Resolver = (table: string, op: string, filters: Record<string, unknown>) => unknown;

export function makeSupabase(resolve: Resolver, calls: Call[] = []) {
  function from(table: string) {
    let op = "select";
    const filters: Record<string, unknown> = {};
    const q: Record<string, unknown> = {};
    const chain = () => q;
    for (const m of ["is", "ilike", "or", "limit", "order", "range", "not", "gte", "lte", "gt", "lt", "neq"]) {
      q[m] = chain;
    }
    q.in = (col: string, v: unknown) => {
      filters[col] = v;
      return q;
    };
    q.eq = (col: string, v: unknown) => {
      filters[col] = v;
      return q;
    };
    for (const m of ["select", "insert", "update", "upsert", "delete"]) {
      q[m] = (...args: unknown[]) => {
        if (m !== "select" || op === "select") op = m;
        calls.push({ table, op: m, args });
        return q;
      };
    }
    const out = () => ({ ...(resolve(table, op, filters) as object) });
    q.maybeSingle = async () => out();
    q.single = async () => out();
    q.then = (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) =>
      Promise.resolve(out()).then(ok, bad);
    return q;
  }
  return { from, calls };
}
