// Minimal local impersonation of Supabase (GoTrue + PostgREST) for E2E.
// Listens on localhost only. Fake data only. No outbound network.
import http from "node:http";
import { FIXTURES, USERS } from "./fixtures.mjs";

const PORT = Number(process.env.STUB_PORT || 54399);
const log = [];

function tokenUser(req) {
  const auth = req.headers["authorization"] || "";
  const t = auth.replace(/^Bearer\s+/i, "");
  return USERS.find((u) => u.token === t) || null;
}

function parseFilters(url) {
  const out = [];
  for (const [k, v] of url.searchParams) {
    if (["select", "order", "limit", "offset", "on_conflict", "columns"].includes(k)) continue;
    const m = /^(eq|neq|in|is|gte|lte|gt|lt|like|ilike|not|or)\.(.*)$/.exec(v);
    if (m) out.push({ col: k, op: m[1], val: m[2] });
  }
  return out;
}
function matches(row, f) {
  const cell = row[f.col];
  const s = cell === null || cell === undefined ? null : String(cell);
  switch (f.op) {
    case "eq": return s === f.val;
    case "neq": return s !== f.val;
    case "in": return f.val.replace(/^\(|\)$/g, "").split(",").map((x) => x.replace(/^"|"$/g, "")).includes(s);
    case "is": return f.val === "null" ? s === null : String(cell) === f.val;
    case "gte": return s !== null && s >= f.val;
    case "lte": return s !== null && s <= f.val;
    case "gt": return s !== null && s > f.val;
    case "lt": return s !== null && s < f.val;
    default: return true;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks).toString();
  const send = (code, obj, headers = {}) => {
    res.writeHead(code, { "content-type": "application/json", ...headers });
    res.end(obj === undefined ? "" : JSON.stringify(obj));
  };
  if (url.pathname === "/__log") return send(200, log);
  if (url.pathname === "/__reset") { log.length = 0; return send(200, { ok: true }); }
  const user = tokenUser(req);
  log.push(`${req.method} ${url.pathname}${url.search.slice(0, 120)}`);

  if (url.pathname === "/auth/v1/user") {
    if (!user) return send(401, { code: 401, msg: "invalid JWT" });
    return send(200, { id: user.id, aud: "authenticated", role: "authenticated", email: user.email, app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" });
  }
  if (url.pathname.startsWith("/auth/v1/")) {
    if (url.pathname.endsWith("/otp") || url.pathname.endsWith("/verify")) return send(200, {});
    if (url.pathname.endsWith("/token")) return send(400, { error: "invalid_grant", error_description: "stub" });
    if (url.pathname.endsWith("/logout")) return send(204);
    return send(200, {});
  }
  if (url.pathname.startsWith("/rest/v1/rpc/")) return send(200, null);
  if (url.pathname.startsWith("/rest/v1/")) {
    const table = url.pathname.slice("/rest/v1/".length);
    if (req.method !== "GET" && req.method !== "HEAD") {
      log.push(`WRITE ${req.method} ${table} ${body.slice(0, 200)}`);
      let parsed = []; try { parsed = JSON.parse(body || "[]"); } catch {}
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return send(req.method === "POST" ? 201 : 200, (req.headers.prefer || "").includes("return=representation") ? arr : undefined);
    }
    let rows = (FIXTURES(user)[table] || []).slice();
    for (const f of parseFilters(url)) rows = rows.filter((r) => matches(r, f));
    const lim = url.searchParams.get("limit"); if (lim) rows = rows.slice(0, Number(lim));
    const accept = req.headers.accept || "";
    const total = rows.length;
    const hdr = { "content-range": `0-${Math.max(total - 1, 0)}/${total}` };
    if (req.method === "HEAD") { res.writeHead(200, hdr); return res.end(); }
    if (accept.includes("vnd.pgrst.object")) {
      if (rows.length !== 1) return send(406, { code: "PGRST116", details: `The result contains ${rows.length} rows`, hint: null, message: "JSON object requested, multiple (or no) rows returned" });
      return send(200, rows[0], hdr);
    }
    return send(200, rows, hdr);
  }
  send(404, { error: "stub: unknown path" });
});
server.listen(PORT, "127.0.0.1", () => console.log(`supabase stub on ${PORT}`));
