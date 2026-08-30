---
name: anakin-io
description: Use for any Anakin.io API call - live web search, URL scraping to markdown, crawl/map a site, structured extraction, or Wire actions across 962 sites. Contains exact endpoints, the auth header, request/response field names, async polling, credit costs, verified SDK names, and the first-20-minutes gotchas.
---

# Anakin.io developer API

Web data API from Anakin Inc: scrape, crawl, map, search, and pre-built "Wire" actions.
Everything below was read off the live docs on 2026-08-30. Anything I could not confirm is
prefixed `UNVERIFIED:`.

## WHICH ANAKIN? (read this first)

There are two unrelated products under the anakin.io name:

| Surface | What it is | Use here? |
| --- | --- | --- |
| **anakin.io/docs — Search/Scrape/Crawl/Wire** | Web data API, base `https://api.anakin.io/v1`, key prefix `ak-`, credit-metered | **YES — this file** |
| Anakin AI "app builder" | Older no-code chatbot/AI-app product with its own app/chat API | NO. Different auth, different base URL. If a doc page talks about "apps", "chatbots" or "workflows you publish", you are on the wrong surface. |

Self-hosted OSS core: <https://github.com/Anakin-Inc/anakin>. MCP server: `https://mcp.anakin.io/mcp`.

## 1. Auth

```
X-API-Key: ak-your-key-here
```

- Key prefix is **`ak-`** (<https://anakin.io/docs/documentation/getting-started>).
- Env var everything reads: **`ANAKIN_API_KEY`** (SDKs and CLI both fall back to it).
- The gateway also accepts these aliases (<https://anakin.io/llms-full.txt>): `X-Api-Key`,
  `Api-Key`, `API-Key`, `X-Access-Key`, `Access-Key`, `apikey`, `api_key`, or `Authorization`
  with a `Bearer` / `ApiKey` prefix. **Use `X-API-Key` — it is the one in every official
  example.** `Authorization: Bearer ak-...` works but is the alias, not the documented form.

```bash
export ANAKIN_API_KEY="ak-your-key-here"
```

## 2. Base URL + endpoint table

Base: **`https://api.anakin.io/v1`**

| Method | Path | Purpose | Sync? |
| --- | --- | --- | --- |
| POST | `/v1/search` | Web search, returns results w/ snippets | **Sync** |
| POST | `/v1/url-scraper/scrape` | Scrape one URL, inline | **Sync** (~90s, may fall back to 202) |
| POST | `/v1/url-scraper` | Submit one scrape as a job | Async |
| POST | `/v1/url-scraper/batch` | Up to **10** URLs, returns job ids | Async |
| GET | `/v1/url-scraper/{id}` | Poll a scrape/batch job | - |
| POST | `/v1/crawl` | Recursive multi-page crawl | Async |
| GET | `/v1/crawl/{id}` | Poll crawl results | - |
| POST | `/v1/map` | Discover URLs on a site | Async |
| GET | `/v1/map/{id}` | Poll discovered URLs | - |
| POST | `/v1/agentic-search` | Multi-step research pipeline; optional `schema` for structured JSON | Async |
| GET | `/v1/agentic-search/{id}` | Poll research result | - |
| POST | `/v1/wire/task` | Run a pre-built site action | Async |
| GET | `/v1/wire/jobs/{id}` | Poll a Wire job | - |
| GET | `/v1/wire/catalog` | Browse all Wire sites | Sync |
| GET | `/v1/wire/catalog/{slug}` | Inspect one site's actions | Sync |
| GET | `/v1/wire/search` | Find a Wire action | Sync |
| GET | `/v1/wire/identities` | Manage stored credentials | Sync |
| POST | `/v1/browser-connect?save_session=name` | Create a browser session | Sync |
| GET/PATCH/DELETE | `/v1/sessions`, `/v1/sessions/{id}` | List / rename / delete sessions | Sync |

**There is no `/v1/extract` endpoint.** Structured extraction is a *parameter*, not a route -
see section 5.

### 2a. Search - `POST /v1/search`

Source: <https://anakin.io/docs/api-reference/search/search>

Request field is **`prompt`**, NOT `query`:

```json
{ "prompt": "latest AI developments 2024", "limit": 5 }
```

- `prompt` (string, required)
- `limit` (number) - default **5**, maximum **20**

**Response is top-level `results` - there is NO `data` wrapper.** Binding UI to
`data.results` will hand you `undefined`:

```json
{
  "id": "63385e99-3ef5-4667-84a7-e7b398ec8e06",
  "results": [
    {
      "url": "https://example.com/article",
      "title": "AI Developments 2024",
      "snippet": "Recent advancements in AI...",
      "date": "2024-01-15",
      "last_updated": "2024-01-20"
    }
  ]
}
```

Exact per-result keys: **`url`, `title`, `snippet`, `date`, `last_updated`**.
There is **no** `content`, no `markdown`, no `score`, no `publishedDate` on a search result -
`date` is the publication date and `date` / `last_updated` are documented as "when available",
so treat both as optional and guard for `undefined`. To get page *body* text you must scrape
the `url` (section 2b).

### 2b. Scrape - `POST /v1/url-scraper/scrape`

Source: <https://anakin.io/docs/api-reference/url-scraper/scrape>

Request body:

- `url` (string, **required**)
- `country` (string) - proxy country code, default `"us"`
- `useBrowser` (boolean) - headless Chrome, default `false`
- `generateJson` (boolean) - AI structured extraction, default `false`
- `sessionId` (string) - saved browser session, for authenticated scraping
- `waitForSelector` (string) - CSS selector to wait for
- `waitMs` (number) - max wait in ms
- `outputSchema` (JSON Schema object) - AI extraction schema, **max 50KB**
- `webhook_url` (string) - per-request webhook

200 response (note camelCase keys):

```json
{
  "id": "job_abc123xyz",
  "status": "completed",
  "url": "https://example.com",
  "jobType": "url_scraper",
  "country": "us",
  "html": "<html>...</html>",
  "cleanedHtml": "<div>...</div>",
  "markdown": "# Page content...",
  "generatedJson": { "data": {} },
  "cached": false,
  "error": null,
  "createdAt": "2024-01-01T12:00:00Z",
  "completedAt": "2024-01-01T12:00:05Z",
  "durationMs": 5000
}
```

Read `.markdown` for LLM input. `.generatedJson` is only populated when `generateJson: true`
or `outputSchema` was sent.

### 2c. Crawl / Map

`POST /v1/crawl` and `POST /v1/map`, both polled at `GET /v1/{crawl|map}/{id}`
(<https://anakin.io/llms-full.txt>). Crawl is documented as "recursive site crawls with depth,
filters, and per-page hooks" and bills 1 credit **per page**, so always cap it.

`UNVERIFIED:` the exact crawl/map request field names (`limit` / `maxPages` / `maxDepth` /
`includePaths` / `excludePaths`). The per-endpoint doc pages 404 at the guessable paths and
`llms.txt` does not enumerate them. The Node SDK's own examples use `client.map(url, { limit: 200 })`
and `client.crawl(url, { maxPages: 20 })` (<https://anakin.io/llms.mdx/docs/sdks/node>), and
Python uses `max_pages=20`, which suggests REST takes `limit` and `maxPages`. **Confirm with one
live call before wiring UI to crawl output.** For a 90-minute build, prefer search + scrape and
skip crawl entirely.

### 2d. Wire - `POST /v1/wire/task`

Source: <https://anakin.io/products/wire>. Catalog is **962 sites / 5,255 actions**.

```json
{ "action_id": "amazon.search_products", "params": { "query": "echo dot", "limit": 5 } }
```

Fields are **`action_id`** and **`params`** (snake_case here, unlike the camelCase scrape body).
Real action ids: `amazon.search_products`, `amazon.product_detail`, `amazon.reviews`,
`robinhood.place_order`. Discover more via `GET /v1/wire/search` or `GET /v1/wire/catalog/{slug}`.
Async: poll `GET /v1/wire/jobs/{id}`. Actions that act as a logged-in user need an identity
(`GET /v1/wire/identities`).

## 3. Async jobs and polling

Applies to `/v1/url-scraper`, `/batch`, `/crawl`, `/map`, `/agentic-search`, `/v1/wire/task`.

- Submit -> response carries an **`id`** and a **`status`**.
- Poll the matching `GET .../{id}` every 2-10s.
- `status` values: **`pending`**, **`processing`**, **`completed`**, **`failed`**.
- **Terminal: `completed` and `failed`.** Anything else, keep polling.
- HTTP `202` = accepted / still processing. HTTP `200` = done (or a sync success).
- **GET polling endpoints are not rate limited** (<https://anakin.io/llms-full.txt>), except
  Wire polling at 60/min - so poll freely, but back off on 429 anyway.
- Alternative to polling: pass `webhook_url`. Verify with the `X-Anakin-Signature: sha256=<hex>`
  header (HMAC-SHA256 over the raw body); dedupe on `X-Anakin-Delivery-Id`. Retries: up to 6
  attempts at 1 min, 5 min, 30 min, 2 h, 6 h. Not worth it in a hackathon - poll instead.

## 4. Errors

```json
{ "error": "error_code", "message": "Human-readable explanation" }
```

Codes: `invalid_request`, `unauthorized`, `insufficient_credits`, `rate_limit_exceeded`,
`not_found`, `server_error`.

| HTTP | Meaning | Retry? |
| --- | --- | --- |
| 400 / 422 | Bad input | No - fix the payload |
| 401 | Missing or invalid API key | No |
| 402 | Out of credits (`insufficient_credits`) | No - top up |
| 403 | Key valid, action not allowed | No |
| 404 | Job or session id does not exist | No |
| 409 | Conflict | No |
| 429 | Rate limited | Yes, exponential backoff |
| 500 / 502 / 503 | Server | Yes, exponential backoff |

## 5. Structured extraction (there is no `/v1/extract`)

Two ways, both parameters:

1. **On a scrape** - send `outputSchema` (JSON Schema, max 50KB) or `generateJson: true` to
   `/v1/url-scraper/scrape`; read the result from **`generatedJson`**. Costs 3 credits.
2. **On agentic search** - `POST /v1/agentic-search` accepts an optional `schema` field
   (JSON Schema object); the answer comes back as JSON matching it instead of free text
   (<https://anakin.io/blog>, changelog).

## 6. SDKs - both verified to exist, both ALPHA

| | Node | Python |
| --- | --- | --- |
| Package | `@anakin-io/sdk` | `anakin-sdk` |
| Verified | registry.npmjs.org - **exists**, v**0.1.0**, published 2026-04-28, Apache-2.0 | pypi.org - **exists**, v**0.1.0**, released 2026-04-28 |
| Runtime | Node **>=18** | Python **>=3.10** |
| Import name | `@anakin-io/sdk` | `anakin` (note: differs from the pip name) |

**Both are v0.1.x alpha and the docs say "Public API may change between minor versions until
v1.0."** There is exactly one published version of each, so there is no fallback if a method is
broken. **For a 90-minute build, use raw HTTP** (section 7) - it cannot drift, and the payloads
above are the contract. The SDK snippets are here as a convenience only.

Verified signatures (<https://anakin.io/llms.mdx/docs/sdks/node>, `.../python`):

```ts
import { Anakin } from '@anakin-io/sdk';
const client = new Anakin({ apiKey: 'ak-...' });
client.scrape(url, opts);              // Promise<Document>
client.map(url, opts);                 // Promise<MapResult>
client.crawl(url, opts);               // Promise<CrawlResult>
client.search(prompt, opts);           // Promise<SearchResult>
client.wire(actionId, params, opts);   // Promise<WireResult>
```

Client config object: `{ apiKey, timeoutMs, maxRetries, pollIntervalMs, pollMaxIntervalMs, pollTimeoutMs }`.
The SDK polls long-running jobs internally and resolves with the final result from a single `await`.

```python
from anakin import Anakin
client = Anakin(api_key="ak-...")            # or set ANAKIN_API_KEY
doc     = client.scrape("https://example.com", formats=["markdown"])
sitemap = client.map("https://example.com", limit=200)
crawl   = client.crawl("https://example.com", max_pages=20)
client.search(prompt)
client.wire(action_id, params)
```

**Discrepancy to know about:** the SDKs expose a `formats: ["markdown"]` option on `scrape`,
but the REST body documented at `/v1/url-scraper/scrape` has **no `formats` field** - the REST
response simply always carries `html`, `cleanedHtml`, `markdown`, and `generatedJson` as
separate keys. `UNVERIFIED:` whether the SDK's `formats` maps to a real REST param or is
client-side filtering. On raw HTTP, do not send `formats`; just read the key you want.

CLI (separate package, `anakin-cli`): `anakin login --api-key "ak-..."`, `anakin search "..."`,
`anakin scrape "https://example.com" -o page.md`, `anakin scrape-batch ... -o batch.json`,
`anakin research "..." -o report.json`. Flags: `--format markdown|json|raw`, `--browser`,
`--country CC`, `--session-id ID`, `--timeout SECS` (default **120**).

## 7. Copy-paste raw HTTP

Single-line curl, search:

```bash
curl -s -X POST https://api.anakin.io/v1/search -H "X-API-Key: $ANAKIN_API_KEY" -H "Content-Type: application/json" -d '{"prompt":"latest AI developments 2024","limit":5}'
```

Single-line curl, scrape:

```bash
curl -s -X POST https://api.anakin.io/v1/url-scraper/scrape -H "X-API-Key: $ANAKIN_API_KEY" -H "Content-Type: application/json" -d '{"url":"https://example.com"}'
```

Node, no SDK (Node >=18, global `fetch`):

```js
const BASE = 'https://api.anakin.io/v1';
const H = { 'X-API-Key': process.env.ANAKIN_API_KEY, 'Content-Type': 'application/json' };

async function anakin(path, body) {
  const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(`anakin ${r.status}: ${j.error} - ${j.message}`);
  return j;
}

export const search = (prompt, limit = 5) => anakin('/search', { prompt, limit });
export const scrape = (url, opts = {}) => anakin('/url-scraper/scrape', { url, ...opts });

// scrape can answer 202 (still processing) - poll it out
export async function scrapeSync(url, opts = {}, timeoutMs = 90000) {
  const first = await scrape(url, opts);
  if (first.status === 'completed' || first.status === 'failed') return first;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 2000));
    const r = await fetch(`${BASE}/url-scraper/${first.id}`, { headers: H });
    const j = await r.json();
    if (j.status === 'completed' || j.status === 'failed') return j;
  }
  throw new Error('anakin scrape timed out');
}
```

Python, no SDK (`pip install requests`):

```python
import os, time, requests

BASE = "https://api.anakin.io/v1"
H = {"X-API-Key": os.environ["ANAKIN_API_KEY"], "Content-Type": "application/json"}

def _post(path, body):
    r = requests.post(f"{BASE}{path}", headers=H, json=body, timeout=120)
    j = r.json()
    if not r.ok:
        raise RuntimeError(f"anakin {r.status_code}: {j.get('error')} - {j.get('message')}")
    return j

def search(prompt, limit=5):
    return _post("/search", {"prompt": prompt, "limit": limit})

def scrape_sync(url, timeout_s=90, **opts):
    job = _post("/url-scraper/scrape", {"url": url, **opts})
    if job.get("status") in ("completed", "failed"):
        return job
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        time.sleep(2)
        job = requests.get(f"{BASE}/url-scraper/{job['id']}", headers=H, timeout=30).json()
        if job.get("status") in ("completed", "failed"):
            return job
    raise TimeoutError("anakin scrape timed out")
```

## 8. Formats, cost, speed

The scrape response always carries all of these; pick the key, do not request a format:

| Key | What | Cost / speed |
| --- | --- | --- |
| **`markdown`** | Cleaned semantic markdown | **Cheapest + fastest + smallest. Default choice for LLM input.** |
| `cleanedHtml` | HTML with scripts/styles stripped | Same 1 credit, bigger payload |
| `html` | Raw HTML | Same 1 credit, largest payload, worst for tokens |
| `generatedJson` | AI-extracted structured data | 3 credits, adds an LLM round-trip |

There is no `links` or `screenshot` format on this API (that is a different vendor's shape).
Link discovery is the separate `/v1/map` endpoint; screenshots are the Browser API.

**Latency:** the inline scrape blocks up to **~90 seconds** before falling back to a 202
(<https://anakin.io/docs/api-reference/url-scraper/scrape>); the doc example shows
`durationMs: 5000`. The CLI defaults to a **120s** timeout. `UNVERIFIED:` typical search
latency - not documented; assume 1-5s and set your own client timeout.

## 9. Credits, plans, rate limits, timeouts

Per-request credits (<https://anakin.io/docs/documentation/pricing>):

| Operation | Credits |
| --- | --- |
| URL scrape | 1 |
| URL scrape + AI summary | 2 |
| URL scrape + AI JSON extraction | 3 |
| Batch scraping | 1 per URL |
| Crawl | **1 per page** |
| Map (URL discovery) | 1 |
| **Search API** | **3** |
| Agentic Search | 10 + 1 per URL |
| Browser API | 1 per 2 min |
| Wire action | varies per action |

- **JavaScript rendering costs nothing extra** - it is in the 1-credit base price. (The API
  reference's separate "browser rendering +1 / AI extraction +1" line is superseded by the
  pricing page's bundled numbers; if a bill disagrees, trust the pricing page.)
- **Credits are deducted only on success** - failed jobs are free
  (<https://anakin.io/docs/documentation/getting-started>).

Plans: **Starter free = 300 credits** (also the signup grant), Pro $9/mo = 3,000, Scale $29/mo
= 12,000, Enterprise custom/unlimited. 99.9% uptime SLA on Pro and Scale.

Rate limits (<https://anakin.io/docs/documentation/getting-started>, `llms-full.txt`):

| Scope | Limit |
| --- | --- |
| Scrape + search endpoints | **60 / min** |
| Wire tasks | **20 / min** |
| AI eval endpoints | **10 / min** |
| GET polling endpoints | Unlimited (Wire polling: 60/min) |

**Per-request server-side timeout: not documented.** Observable bound is the ~90s inline-scrape
block and the CLI's 120s default. Set an explicit client timeout; do not rely on a server one.

**Budget math for a hackathon:** the free 300 credits = ~100 search calls, or ~300 scrapes, or
about 60 runs of the recipe below (1 search @3 + 2 scrapes @1 = 5 credits/run). Cache (section
11) or you will burn it during rehearsal.

## 10. GOTCHAS - the first 20 minutes

1. **`prompt`, not `query`.** `POST /v1/search` takes `prompt`. Sending `query` gives a 400
   `invalid_request`.
2. **Results are `res.results`, NOT `res.data.results`.** No `data` wrapper anywhere in the
   search response. This is the single most likely 10-minute loss at demo time.
3. **A search result has no page text.** Keys are `url`, `title`, `snippet`, `date`,
   `last_updated`. If you need body content you must scrape the URL - that is the whole reason
   the recipe below has a second stage.
4. **`date` / `last_updated` are "when available".** Guard for `undefined` before formatting or
   sorting, or your list renders `Invalid Date`.
5. **CORS / never ship the key to the browser.** The key is a bearer credential with a real
   credit balance, and browser `fetch` to `api.anakin.io` is not a documented CORS-enabled
   flow. **Always call from your own server route** and let the browser talk to your backend.
   A key in client JS is scrapeable and drains your 300 credits.
6. **401 vs 403 vs 402.** `401 unauthorized` = header missing/typo'd/key wrong (check you sent
   `X-API-Key` and not `X-Api-key` in a case-sensitive proxy, and that `ANAKIN_API_KEY` is
   actually exported in the process running the server). `403` = key is fine, that action is
   not allowed for your plan. **`402 insufficient_credits` = you are out of money, not out of
   auth** - it is the one people misread as a broken key.
7. **Sites that block scraping.** You get a job that reaches `status: "failed"` with a populated
   `error` string, or thin/garbage `markdown`. Fixes in order: retry with
   `{"useBrowser": true}`, then a different `{"country": "de"}` proxy, then `sessionId` for
   login-walled pages. Credits are not charged on failure, so retrying is cheap. **Always code
   the failure branch** - `markdown` can come back empty on a 200.
8. **JS-rendered pages come back nearly empty.** Default `useBrowser` is `false`, so an SPA
   returns its shell. Send `{"useBrowser": true}` plus `waitForSelector` (preferred) or
   `waitMs`. JS rendering is free, so when in doubt turn it on - it only costs latency.
9. **429 / rate limit.** 60/min on scrape+search, 20/min on Wire. Scraping 10 search results
   in a `Promise.all` is fine; a loop over 100 is not. Serialize or chunk, and back off
   exponentially on 429. GET polls are unlimited, so poll freely.
10. **Empty `results` on a too-narrow prompt.** `results: []` is a valid 200, not an error.
    Long quoted phrases and `site:`-style operators produce nothing. Broaden the prompt, and
    render an explicit empty state rather than letting `.map()` yield a blank page.
11. **Markdown blobs blow up your LLM context.** A content-heavy page routinely yields tens of
    thousands of characters; two of them can exceed a small model's window and will cost real
    tokens either way. **Truncate to ~8,000 characters per page (~2k tokens) before sending
    anything to an LLM**, and cap the joined blob at ~24,000 characters. The recipe below does
    this. Never pipe `html` - it is several times larger than `markdown` for the same content.
12. **The inline scrape can answer 202, not 200.** On a slow site `/url-scraper/scrape` gives
    back `status: "processing"` and you must poll `GET /v1/url-scraper/{id}`. Code that assumes
    `.markdown` exists on the first response will `undefined` on exactly the slow pages you
    care about. Use `scrapeSync` above.
13. **Field-casing is inconsistent across endpoints.** Scrape uses camelCase (`useBrowser`,
    `waitForSelector`, `outputSchema`) but has a snake_case `webhook_url`; Wire uses
    `action_id`; search results use `last_updated`. Copy the exact key from this file rather
    than guessing the convention.
14. **SDKs are v0.1.0 alpha with one published version.** If `client.search()` misbehaves there
    is no older version to pin to. Drop to raw `fetch`/`requests` and keep moving.

## 11. 90-MINUTE HACKATHON RECIPE

`question -> search (top N) -> scrape top 2 URLs -> { sources[], combinedMarkdown }`,
with a local JSON file cache so re-demos are instant and free.

### Node / Express

```js
// server.js  -  node >=18, npm i express
import express from 'express';
import fs from 'node:fs';
import crypto from 'node:crypto';

const BASE = 'https://api.anakin.io/v1';
const H = { 'X-API-Key': process.env.ANAKIN_API_KEY, 'Content-Type': 'application/json' };
const CACHE_FILE = './.anakin-cache.json';
const MAX_CHARS = 8000;   // per page, keeps LLM cost sane
const cache = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : {};
const saveCache = () => fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
const key = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);

async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(`anakin ${r.status}: ${j.error} - ${j.message}`);
  return j;
}

async function scrapeSync(url) {
  let job = await post('/url-scraper/scrape', { url, useBrowser: true });
  const deadline = Date.now() + 90000;
  while (job.status !== 'completed' && job.status !== 'failed' && Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 2000));
    job = await (await fetch(`${BASE}/url-scraper/${job.id}`, { headers: H })).json();
  }
  return job;
}

const app = express();
app.use(express.json());

app.post('/api/research', async (req, res) => {
  const question = (req.body.question || '').trim();
  if (!question) return res.status(400).json({ error: 'question required' });

  const ck = key(question);
  if (cache[ck]) return res.json({ ...cache[ck], cached: true });

  try {
    const found = await post('/search', { prompt: question, limit: 5 });
    const results = found.results || [];                       // NOT found.data.results
    if (!results.length) return res.json({ sources: [], combinedMarkdown: '', note: 'no results' });

    const top = results.slice(0, 2);
    const scraped = await Promise.all(top.map(async r => {
      try {
        const doc = await scrapeSync(r.url);
        const md = doc.status === 'completed' ? (doc.markdown || '') : '';
        return { ...r, markdown: md.slice(0, MAX_CHARS), ok: !!md };
      } catch { return { ...r, markdown: '', ok: false }; }
    }));

    const payload = {
      question,
      sources: results.map(r => ({
        url: r.url, title: r.title, snippet: r.snippet,
        date: r.date ?? null, lastUpdated: r.last_updated ?? null,
      })),
      combinedMarkdown: scraped.filter(s => s.ok)
        .map(s => `## ${s.title}\nSource: ${s.url}\n\n${s.markdown}`)
        .join('\n\n---\n\n').slice(0, 24000),
    };
    cache[ck] = payload; saveCache();
    res.json({ ...payload, cached: false });
  } catch (e) { res.status(502).json({ error: String(e.message) }); }
});

app.listen(3000, () => console.log('http://localhost:3000'));
```

### Python / FastAPI

```python
# main.py  -  pip install fastapi uvicorn requests
import os, json, time, hashlib, pathlib
import requests
from fastapi import FastAPI
from pydantic import BaseModel

BASE = "https://api.anakin.io/v1"
H = {"X-API-Key": os.environ["ANAKIN_API_KEY"], "Content-Type": "application/json"}
CACHE = pathlib.Path(".anakin-cache.json")
MAX_CHARS = 8000
cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}

app = FastAPI()

class Q(BaseModel):
    question: str

def _post(path, body):
    r = requests.post(f"{BASE}{path}", headers=H, json=body, timeout=120)
    j = r.json()
    if not r.ok:
        raise RuntimeError(f"anakin {r.status_code}: {j.get('error')} - {j.get('message')}")
    return j

def scrape_sync(url, timeout_s=90):
    job = _post("/url-scraper/scrape", {"url": url, "useBrowser": True})
    deadline = time.time() + timeout_s
    while job.get("status") not in ("completed", "failed") and time.time() < deadline:
        time.sleep(2)
        job = requests.get(f"{BASE}/url-scraper/{job['id']}", headers=H, timeout=30).json()
    return job

@app.post("/api/research")
def research(q: Q):
    question = q.question.strip()
    if not question:
        return {"error": "question required"}
    ck = hashlib.sha1(question.encode()).hexdigest()[:16]
    if ck in cache:
        return {**cache[ck], "cached": True}

    found = _post("/search", {"prompt": question, "limit": 5})
    results = found.get("results", [])            # NOT found["data"]["results"]
    if not results:
        return {"sources": [], "combinedMarkdown": "", "note": "no results"}

    blobs = []
    for r in results[:2]:
        try:
            doc = scrape_sync(r["url"])
            md = doc.get("markdown", "") if doc.get("status") == "completed" else ""
        except Exception:
            md = ""
        if md:
            blobs.append(f"## {r['title']}\nSource: {r['url']}\n\n{md[:MAX_CHARS]}")

    payload = {
        "question": question,
        "sources": [{
            "url": r["url"], "title": r["title"], "snippet": r.get("snippet"),
            "date": r.get("date"), "lastUpdated": r.get("last_updated"),
        } for r in results],
        "combinedMarkdown": "\n\n---\n\n".join(blobs)[:24000],
    }
    cache[ck] = payload
    CACHE.write_text(json.dumps(cache, indent=2))
    return {**payload, "cached": False}
```

**Caching notes:** key on a hash of the normalised question; the JSON file survives restarts, so
rehearse the demo repeatedly for zero credits. Add `.anakin-cache.json` to `.gitignore` (it can
hold a lot of scraped text). Pre-warm every question you plan to demo *before* going on stage -
a cold run costs 5 credits and up to ~90s per scrape.

## Sources

- <https://anakin.io/docs/documentation/getting-started>
- <https://anakin.io/docs/api-reference/search/search>
- <https://anakin.io/docs/api-reference/url-scraper/scrape>
- <https://anakin.io/docs/sdks>, <https://anakin.io/llms.mdx/docs/sdks/node>, `.../python`
- <https://anakin.io/llms-full.txt> (full API reference dump - most complete single source)
- <https://anakin.io/docs/documentation/pricing>
- <https://anakin.io/products/wire>
- <https://github.com/Anakin-Inc/anakin-cli>, <https://github.com/Anakin-Inc/anakin>
- npm `@anakin-io/sdk` v0.1.0, PyPI `anakin-sdk` v0.1.0 (both verified present 2026-08-30)
