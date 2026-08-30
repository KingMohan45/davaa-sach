// server.js runs on Node (express, fs). The Worker runs the SAME code with a different shell.
// Rather than keep a second copy that silently drifts, this generates the Worker from server.js
// and ASSERTS every replacement matched exactly once — a shape change in server.js fails the
// build instead of shipping a half-ported worker.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, "server.js"), "utf8");

const cuts = [];
function replace(what, from, to) {
  const n = src.split(from).length - 1;
  if (n !== 1) throw new Error(`build-worker: "${what}" matched ${n} times, expected exactly 1`);
  cuts.push([from, to]);
}

// 1. The Node shell: express + fs + a disk cache, replaced by a route table and a Map.
replace("prelude", `import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const app = express();
app.use(express.json({ limit: "25mb" })); // audio arrives as base64 JSON
app.use(express.static("public"));
app.get("/clinic", (_req, res) => res.sendFile(path.resolve("public/clinic.html")));`,
`import crypto from "node:crypto";
import { Buffer } from "node:buffer";

// express shim: the handlers below are byte-identical to server.js, so the shell has to speak
// the same (req, res) dialect. Exact paths only, which is all the app uses.
const ROUTES = [];
const app = {
  use() {},
  get(p, h) { ROUTES.push(["GET", p, h]); },
  post(p, h) { ROUTES.push(["POST", p, h]); },
  listen() {},
};`);

// 2. The response cache. On Node it is a directory; in a Worker there is no disk, so it is the
//    isolate's memory. The WARM store (the part that must survive an isolate) goes to KV below.
replace("cache", `const CACHE_DIR = "cache";
const cacheKey = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 16);
const cacheGet = (k) => { try { return JSON.parse(fs.readFileSync(path.join(CACHE_DIR, k + ".json"), "utf8")); } catch { return null; } };
const cachePut = (k, v) => { try { fs.writeFileSync(path.join(CACHE_DIR, k + ".json"), JSON.stringify(v)); } catch {} };`,
`const MEM = new Map();
const cacheKey = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 16);
const cacheGet = (k) => (MEM.has(k) ? MEM.get(k) : null);
const cachePut = (k, v) => { MEM.set(k, v); };`);

// 3. force-refresh drops the cached scrape so the regulator is actually re-read.
replace("warm force unlink",
  `if (force) { try { fs.unlinkSync(path.join(CACHE_DIR, cacheKey("scrape:" + src.url) + ".json")); } catch {} }`,
  `if (force) MEM.delete(cacheKey("scrape:" + src.url));`);

// 4. The listener becomes the fetch handler; the setInterval becomes a waitUntil refresh.
replace("listener", `const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(\`Doctor Globe http://localhost:\${port}\`);
  warmAll().then(() => console.log("warm store ready:", Object.entries(WARM).map(([k, v]) => \`\${k}=\${v.chars}\`).join(" ")));
  setInterval(() => warmAll(true).catch(() => {}), WARM_MS);
});`, fs.readFileSync(path.join(here, "worker-shell.js"), "utf8"));

let out = src;
for (const [from, to] of cuts) out = out.replace(from, to);

// Prove the port landed: nothing Node-only may survive into the Worker.
for (const banned of ['from "fs"', 'from "path"', 'from "express"', "app.listen(", "fs.readFileSync", "fs.writeFileSync", "fs.unlinkSync", "setInterval("]) {
  if (out.includes(banned)) throw new Error(`build-worker: node-only construct survived: ${banned}`);
}
if (!out.includes("export default")) throw new Error("build-worker: no fetch handler emitted");

fs.mkdirSync(path.join(here, ".worker"), { recursive: true });
fs.writeFileSync(path.join(here, ".worker", "index.js"), out);
console.log(`built .worker/index.js (${out.split("\n").length} lines) from server.js (${src.split("\n").length} lines)`);
