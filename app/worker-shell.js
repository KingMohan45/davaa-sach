// ---------- Worker shell ----------
// Everything above this line is server.js verbatim. Below is the only part that differs from the
// Node process: no listener, no disk, and an isolate that can vanish between two requests.

// The warm store is the one piece of state that MUST outlive an isolate. If it does not, every
// cold request answers with an empty WHO/CDSCO index — and a degraded answer looks exactly like
// a working one, so it would never be noticed. KV is what makes "warm" a fact rather than a hope.
const WARM_KEY = "warm:v1";
let hydrated = false;

async function hydrateWarm(env) {
  if (hydrated || !env.WARM_KV) return;
  hydrated = true; // one attempt per isolate; a miss just leaves the in-memory defaults
  try {
    const stored = await env.WARM_KV.get(WARM_KEY, "json");
    if (!stored) return;
    for (const [k, v] of Object.entries(stored)) if (WARM[k] && v && v.md) WARM[k] = v;
  } catch (e) { console.error("warm hydrate failed:", e.message); }
}

async function persistWarm(env) {
  if (!env.WARM_KV) return;
  try { await env.WARM_KV.put(WARM_KEY, JSON.stringify(WARM)); } catch (e) { console.error("warm persist failed:", e.message); }
}

// Refresh in the background when the store is stale. Never on the request path.
async function refreshWarm(env, force) {
  const stale = force || WARM_SOURCES.some((s) => !WARM[s.key].md || Date.now() - WARM[s.key].at > WARM_MS);
  if (!stale) return;
  await warmAll(force);
  await persistWarm(env);
}

// /api/warm fills the store through server.js's own handler, which knows nothing about KV. Without
// this, a manual warm populates one isolate and dies with it — the store reads "warm" on the
// machine that did the work and cold everywhere else, which is indistinguishable from working.
async function persistAfterWarm(env, done) {
  await done;
  await persistWarm(env);
}

// res shim. Two modes: a buffered JSON reply, or (once res.set declares an event stream) a live
// stream, resolved to the client the moment the headers are declared so the first token is not
// held behind the last one.
function makeRes(resolve) {
  let status = 200, settled = false, writer = null;
  const enc = new TextEncoder();
  const res = {
    status(n) { status = n; return res; },
    json(obj) {
      if (settled) return res;
      settled = true;
      resolve(new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } }));
      return res;
    },
    set(headers) {
      const { readable, writable } = new TransformStream();
      writer = writable.getWriter();
      settled = true;
      resolve(new Response(readable, { status, headers }));
      return res;
    },
    flushHeaders() {},
    write(chunk) { if (writer) writer.write(enc.encode(chunk)); return true; },
    end() { if (writer) { try { writer.close(); } catch {} writer = null; } return res; },
  };
  return res;
}

async function handleApi(request, pathname) {
  const route = ROUTES.find(([m, p]) => m === request.method && p === pathname);
  if (!route) return null;
  const url = new URL(request.url);
  const req = { query: Object.fromEntries(url.searchParams), body: {} };
  if (request.method === "POST") {
    try { req.body = await request.json(); } catch { req.body = {}; }
  }
  let resolveResponse;
  const responsePromise = new Promise((r) => { resolveResponse = r; });
  const res = makeRes(resolveResponse);
  const done = (async () => {
    try { await route[2](req, res); }
    catch (e) {
      console.error("handler threw:", e && e.message);
      res.status(500).json({ error: String((e && e.message) || e) });
      res.end();
    }
  })();
  return { responsePromise, done };
}

export default {
  async fetch(request, env, ctx) {
    // The existing code reads process.env; Worker secrets arrive as bindings.
    for (const [k, v] of Object.entries(env)) if (typeof v === "string") process.env[k] = v;

    const url = new URL(request.url);
    const BASE = (env.BASE_PATH || "").replace(/\/+$/, "");

    // Mounted under a sub-path, "/doctorglobe" must become "/doctorglobe/" before the page loads:
    // every asset and link on it is relative, and without the trailing slash they resolve one
    // directory too high.
    if (BASE && url.pathname === BASE) return Response.redirect(url.origin + BASE + "/", 302);
    let p = url.pathname;
    if (BASE && p.startsWith(BASE + "/")) p = p.slice(BASE.length);
    if (p === "") p = "/";

    await hydrateWarm(env);
    ctx.waitUntil(refreshWarm(env).catch(() => {}));

    // /pitch is the short way to the pitch video. It is served from this deployment by default;
    // setting PITCH_URL points it at a hosted copy instead, with no redeploy.
    if ((p === "/pitch" || p === "/pitch/") && env.PITCH_URL) return Response.redirect(env.PITCH_URL, 302);

    const api = await handleApi(request, p);
    if (api) {
      ctx.waitUntil(p === "/api/warm" ? persistAfterWarm(env, api.done) : api.done);
      return api.responsePromise;
    }

    // Static assets. The asset server does its own html_handling redirects (/clinic.html ->
    // /clinic), and it only ever sees the prefix-stripped path, so any Location it emits points
    // outside the mount. Re-prefix it, or the mounted app bounces users to the bare domain.
    const assetRes = await env.ASSETS.fetch(new Request(url.origin + p, request));
    if (BASE && assetRes.status >= 300 && assetRes.status < 400) {
      const loc = assetRes.headers.get("location");
      if (loc) {
        const to = new URL(loc, url.origin);
        if (to.origin === url.origin && !to.pathname.startsWith(BASE + "/")) {
          const fixed = new Response(assetRes.body, assetRes);
          fixed.headers.set("location", BASE + to.pathname + to.search);
          return fixed;
        }
      }
    }
    return assetRes;
  },
};
