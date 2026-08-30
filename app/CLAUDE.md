# app/ — Davaa Sach server + UI (working notes)

Parent context: `../CLAUDE.md` (handoff). Full source/latency/rejection detail: **`README.md` in this
folder** — read that before touching evidence sources. This file is code-level contracts only.

## Run
- Start: `nohup node server.js > /tmp/davaa-server.log 2>&1 &` then `curl -s localhost:3000/api/health`
- Restart: `PID=$(lsof -nP -iTCP:3000 -sTCP:LISTEN -t | head -1); [ -n "$PID" ] && kill "$PID"` then start again. Kill by PORT only, never pkill patterns.
- Node 26, ESM, deps: express + dotenv only. Native fetch/FormData/Blob.
- **Never run a background request loop against this server while testing it.** A parallel warm loop caused `fetch failed` on both Anakin legs and cost a wrong diagnosis.

## Env (.env)
`SARVAM_API_KEY` and `ANAKIN_API_KEY` both set and verified live. `PORT` 3000.
Anakin key prefix is `ask_`, not the `ak-` the skill documents.

## Routes (the UI binds these field names — do not rename)

| Route | In | Out |
|---|---|---|
| `POST /api/stt` | `{audioBase64, mime?}` | `{transcript, drugLatin, detectedLang}` |
| `POST /api/check` | `{drug, lang}` | `{drug, verdict:"flagged"\|"clear"\|"unknown", reason, reasonLocal, priceNote, audioBase64, sources[], degraded[], cached?}` |
| `POST /api/prescription` | `{text, lang}` | `{drugs[], verdict:"stop"\|"caution"\|"ok", headline, headlineLocal, findings[], audioBase64, sources[], degraded[], timings{}}` |
| `POST /api/symptoms` | `{text, lang}` | `{summary, summaryLocal, urgency:"emergency"\|"see_doctor"\|"routine", options[], askYourDoctor[], audioBase64, degraded[]}` |
| `POST /api/interpret` | `{text, from, to, speaker:"patient"\|"doctor"}` | `{original, translated, clinical{complaint,duration,redFlags[],askBack[]}, audioBase64, timings{}}` |
| `GET /api/health` | — | `{sarvamKey, anakinKey}` |

`findings[]` items: `{drug, kind, severity:"high"\|"medium"\|"low", detail}`.

## Function map

- `anakinSearch(prompt, limit)` — POST `/v1/search`, field **`prompt`** not `query`, response **top-level `results[]`**. Cached.
- `anakinScrape(url)` — POST `/v1/url-scraper/scrape`, polls `/v1/url-scraper/{id}` on 202. Read `.markdown`. Cached.
- `anakinWire(actionId, params)` — POST `/v1/wire/task` with **`{action_id, params}`** (snake_case). **VERIFIED LIVE.** `WIRE_ACTION = "tmg_search"` on catalog `tata-1mg`; params `{query, per_page, city}`.
- `anakinFetchJson(url)` — fetches a JSON API **through** Anakin's scraper; parse the **`html`** field (`markdown` mangles escapes, `cleanedHtml` HTML-escapes quotes). Falls back to direct fetch and records `_via`.
- `openFdaLabel/openFdaRecalls(drugRaw)` — go through `anakinFetchJson`. Both call `drugStem()` first.
- `drugStem(d)` — strips strength/unit/form. **Load-bearing:** `"Warfarin 5 mg"` returns 0 openFDA hits, `"Warfarin"` returns 75. Without it a false "no US label" outranks a real boxed warning.
- `whoAlertIndex()` / `whoLinesFor(md, drug)` — one WHO scrape shared across a prescription; exact-substring line filter, deliberately not embeddings.
- `sarvamChat(messages, max_tokens, model)` — default `sarvam-105b`; **pass `"sarvam-105b-conversations"` for anything latency-sensitive** (measured 7.8s vs 43.5s, same verdict). Falls back to `reasoning_content` because 105b returns `content: null` when reasoning exhausts the budget.
- `extractJson(raw)` — last-balanced-object parser; handles fences and reasoning prose.
- `sarvamTranslate(input, target)` — en→indic. `sarvamTranslateTo(input, from, to)` — any pair; indic→indic routes via English.
- `sarvamTTS(text, lang)` — bulbul:v3. Speakers: `ishita` kn/ta, `priya` hi/te/en. All five pairs verified 200 + real audio.

## Cache
`cache/<sha1("<kind>:<input>")[:16]>.json`. Kinds: `scrape: search: wire: ajson: fdalabel: fdarecall: answer:v2:`.
**A degraded answer is never cached.** ~97% of cache bytes are base64 WAV. `cache/` belongs in `.gitignore`.
**Do not clear before a demo** — it is both demo speed (50s → 0.024s) and credit insurance.

## public/index.html
Single file, no framework, deck design system (deep green + `--sig` lime, Archivo Black, hard offset shadows), Three.js molecular lattice (guarded — page works if the CDN is blocked).

Four tabs: `p-check` · `p-rx` · `p-sym` · `p-int`. Each has its own pipeline strip whose final state is read from the server's `degraded[]`, never from a timer.

Traps already paid for, do not reintroduce:
- **`const` declared below its use site is a TDZ ReferenceError that kills every statement after it** while leaving hoisted `function` declarations defined — the symptom was empty `<select>`s and an unbound button with an empty console. Declare all the step arrays (`C`, `X`, `Y`, `I`) together, above `MICS`.
- One shared recorder across all four mics; `micStarting` guard, because `getUserMedia` is async and a second tap otherwise opens a second recorder.
- **Never set `lang` from `detectedLang`** — the pill is the user's chosen ANSWER language, and code-mixed speech detects as `en-IN`, which answers a Kannada user in English.
- Chunked `btoa` at 32768 — `String.fromCharCode(...bigArray)` blows the stack. Do not "simplify".
- Tab 1 takes `drugLatin` (name only); tabs 2–4 take `transcript` (the whole sentence).

## Prompt contracts
All four reasoning prompts demand minified JSON and are parsed by `extractJson`, with an honest
fallback that never prints the model's raw reasoning to the user. Voice personas are deliberately
specific (a doctor between patients; a worried 62-year-old in a pharmacy queue) — that sets pacing
and register far better than "plain spoken style".
