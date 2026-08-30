# Davaa Sach — AI Engineer Mixer 90-min sprint (2026-08-30)

**Self-contained handoff. Do NOT rely on any chat history — everything needed is in this file + the linked files in this folder.**
Predecessor: Fable 5 session (prep phase). You: successor (Opus 5). User is at the event.

## TL;DR — the one open task
App is BUILT and Sarvam-verified end-to-end. **Blocked on the Anakin API key only.** The moment the user gives it: (1) put it in `app/.env`, (2) run the Anakin verification sequence below, (3) drive one full `/api/check` live, (4) fix whatever the real Wire/scrape responses break (Wire request shape is the one unverified bet), (5) help user submit at **12:30 sharp** using `research/submission-draft.md`.

## Hard timeline (from event brief)
- 11:40 build start · **12:30 submission form opens — SUBMIT AN UGLY WORKING VERSION IMMEDIATELY** (doc allows improving until 1:00) · **1:00 PM sharp deadline** · winner ~1:30-2:00.
- Prize: Keychron keyboard for every member of winning team.
- Event: https://luma.com/ai-engineer-mixer — held at Anakin.io's office; judges unpublished, inferred Kunal Kushwaha (WeMakeDevs) + Anakin team. No Sarvam speaker on agenda.

## Current state (live-verified 2026-08-30 ~11:00)
| Thing | State | How verified |
|---|---|---|
| `app/server.js` | Complete Davaa Sach backend, syntax-clean | `node --check` + running |
| Server | RUNNING on http://localhost:3000, log `/tmp/davaa-server.log` | `lsof` pid + `/api/health` |
| `app/.env` | `SARVAM_API_KEY` set + WORKING; `ANAKIN_API_KEY` **EMPTY** | `/api/health` → `{"sarvamKey":true,"anakinKey":false}` |
| Sarvam translate | 200, real Kannada out | live curl |
| Sarvam chat `sarvam-105b` | 200, obeys strict-JSON prompts. It is a REASONING model (`reasoning_content` field) → few-sec latency per call | live curl |
| Sarvam TTS `bulbul:v3` | Valid PCM WAV 22kHz mono; speakers `ishita` (kn) + `priya` (hi, code-mixed text) both work | live curl + `file` magic |
| Sarvam STT `saaras:v3` `mode=codemix` | 200, 0.947 confidence, auto lang-detect | loopback: fed TTS wav back |
| `/api/stt` route (server's own) | PROVEN: wav in → transcript `"डोलो छः सौ पचास सेफ है क्या?..."` → `drugLatin: "Dolo 650"` → `detectedLang: hi-IN` | drove route with real audio |
| `/api/check` route | UNTESTED — first call is Anakin search, no key | blocked |
| Anakin (all of it) | ZERO live calls made. `app/cache/` empty | — |
| Browser mic flow | UNTESTED in real browser (MediaRecorder → webm → `/api/stt`); STT accepts WebM per skill. getUserMedia works on localhost (secure-context exempt) | code-verified only |
| Git | NOT a git repo. No commits anywhere. | `git rev-parse` fails |

## The moment the Anakin key arrives — exact sequence
```
cd /Users/kingmohan45/Documents/30thAug/app
```
1. Put key in `.env` (`ANAKIN_API_KEY=ak-...`), restart: `PID=$(lsof -nP -iTCP:3000 -sTCP:LISTEN -t | head -1); [ -n "$PID" ] && kill "$PID"; nohup node server.js > /tmp/davaa-server.log 2>&1 &` then `curl -s localhost:3000/api/health` → both true.
2. Smallest Anakin proof (3 credits): `curl -s -w "\nstatus=%{http_code}\n" -X POST https://api.anakin.io/v1/search -H "X-API-Key: $ANAKIN_API_KEY" -H "Content-Type: application/json" -d '{"prompt":"Dolo 650 CDSCO NSQ alert","limit":3}'` — expect top-level `results` array with `url/title/snippet/date` keys (NOT `data.results`).
3. **Verify the Wire bet BEFORE trusting `/api/check`'s price leg:** `curl -s -H "X-API-Key: $ANAKIN_API_KEY" "https://api.anakin.io/v1/wire/search?q=amazon"` and `curl -s -H "X-API-Key: $ANAKIN_API_KEY" https://api.anakin.io/v1/wire/catalog/amzn-in` — confirm action id `act_amzn_in_search_results_ssr` + its param names. **`anakinWire()` in server.js sends `{action, params}` — this request shape is an UNVERIFIED guess**; catalog/docs may say `actionId`/`inputs`. Fix `anakinWire()` to match reality. Fallback to plain search already wired (`.catch` → Jan Aushadhi search), so `/api/check` survives Wire being wrong — but fix it anyway, Wire is the judge play (event is AT Anakin's office; Wire is their pride: 962 sites/5255 actions, "470x cheaper").
4. Full flow: `curl -s -X POST localhost:3000/api/check -H "Content-Type: application/json" -d '{"drug":"Dolo 650","lang":"kn-IN"}' | python3 -m json.tool | head -40` — expect `{verdict, reason, reasonLocal, priceNote, audioBase64, sources[]}`. First run slow (scrape 202-polls + reasoning model); repeats fast (disk cache).
5. Open http://localhost:3000 in a real browser: click example chip "Dolo 650", then test 🎤 mic → speak "Dolo 650 safe hai kya" → input should fill with "Dolo 650" and auto-check.
6. Budget: Anakin free tier 300 credits; search=3, scrape=1, wire amzn-in=2. Everything cached to `app/cache/` keyed by input — demo repeats cost ZERO. Do not clear cache before demo.

## Architecture (what's in app/server.js)
Browser mic → webm(base64 JSON, chunked btoa) → `POST /api/stt` → Sarvam `saaras:v3 mode=codemix` (returns NATIVE script) → `sarvam-105b` extracts Latin drug name → UI auto-fires `POST /api/check` → parallel: Anakin search (CDSCO alerts) + Anakin scrape (cdsco.gov.in/opencms/opencms/en/Alerts/ — verified server-rendered, 301 table rows, no JS wall) + Anakin Wire `amzn-in` price (fallback plain search) → `sarvam-105b` strict-JSON verdict `{verdict: flagged|clear|unknown, reason, priceNote, speak}` → `sarvam-translate:v1` to user lang → `bulbul:v3` TTS (per-lang speaker map: hi/te=`priya`, kn/ta=`ishita`, fallback `shubh`) → red/green/amber card + audio + source links. Keys server-side only. Every external call disk-cached (`cache/<sha1-16>.json`).

## Decisions + rationale (do not re-litigate)
1. **Idea = Davaa Sach** (user locked it). Only candidate where user physically cannot read the source (English regulatory PDFs) AND answer cannot be in model weights (this month's NSQ list) → both sponsors structurally load-bearing. Alternates preserved in `research/ideas/` (sach-ya-jhooth = fallback if CDSCO turns hostile; sarkari-deadline third).
2. **Languages: kn default + hi/te/ta + en** (user instruction, extended from kn-only).
3. **Verdict CARD, not a chatbox** — found Indian-hackathon judging guidance explicitly penalising "generic AI chatbot on every page"; a single red/green verdict card is the differentiator.
4. **Wire for price, not scrape** — judging research: Wire is Anakin's proudest product and event is at their office. No Indian pharmacy in Wire catalog (verified: 1mg/PharmEasy/Netmeds/Apollo absent) → `amzn-in` is the pharma-price proxy. Submission line: "cdsco.gov.in + Tata 1mg are our first Wire catalog requests."
5. **No deploy** — event doc explicitly accepts local demo. Agents disagreed (generic guidance says "judges won't clone repos") — resolved toward THIS event's own doc. localhost is fine; deploy only if time is spare after everything works.
6. **Submit at 12:30 sharp, polish till 1:00** — rubric math: Ideation 25% + Originality 20% = 45%, Working Product only 10%. The idea + form text carry more points than polish. Submission form fields map ~1:1 to rubric — the two "Where you used X" fields ARE the Sponsor-API 25%.
7. **Demo opener = code-mixed utterance** "Dolo 650 safe hai kya?" — Sarvam's documented differentiator (they benchmark code-mix vs ElevenLabs). Say "code-mixed" out loud to judges.
8. **sarvam-105b, NOT sarvam-m** — sarvam-m/sarvam-30b are deprecated and actively rejected; pre-mid-2026 tutorials are all wrong.

## Gotchas already hit or pre-verified (numbered, each with fix)
1. **codemix STT returns NATIVE script** — "Dolo 650" → "डोलो छः सौ पचास" (digits as words). Would silently break English web search. FIXED: `sarvam-105b` extraction step in `/api/stt` returns `drugLatin`. PROVEN live.
2. **Sarvam TTS returns base64 JSON** `{"audios":["..."]}` — never write body to .wav directly. Server returns `audios[0]`; UI plays `data:audio/wav;base64,`.
3. **Sarvam auth = `api-subscription-key` header**; failure is **403 not 401**. Speakers lowercase + version-locked (v2 names like `anushka` = 400 on v3). `varun` is a Tier-2 villain/thriller voice — do not use.
4. **Anakin search: field `prompt` (not `query`), response top-level `results` (not `data.results`)**, max limit 20. Scrape endpoint is `POST /v1/url-scraper/scrape` (not `/v1/scrape`), no `formats` param — response always carries `markdown/html/cleanedHtml`, read `markdown`. 202 = still processing → poll `GET /v1/url-scraper/{id}` until `completed|failed`. `402 insufficient_credits` is routinely misread as auth failure.
5. **`limit` truncation for LLM context**: markdown slices at 8k chars/page, 24k joined — token blowup otherwise.
6. **Shell cwd drift burned the predecessor twice** — `cd app` failed silently mid-session and files landed in the wrong dir; a stray old server on :3000 masked it. ALWAYS absolute paths; kill by port (`lsof -nP -iTCP:3000 -sTCP:LISTEN -t`), never pkill patterns.
7. **sarvam-105b is a reasoning model** — burns tokens on `reasoning_content`, few-sec latency. Fine for verdict + extraction; don't add more chat calls to the hot path.
8. **Browser btoa on big audio**: `String.fromCharCode(...bigArray)` blows the stack — UI already chunks at 32768. Don't "simplify" it back.
9. **STT hard cap 30s** per request (REST); UI auto-stops mic at 25s.
10. **TTS char caps**: v3 = 2500 (server slices 2400). Translate input cap 2500/1500 — verdict text is short, fine.
11. CDSCO batch-level PDFs sit behind `this.form.submit()` POST forms — BY DESIGN we cite the alerts INDEX + live search hits, not batch numbers. This is in the submission's limitations line; don't burn time trying to scrape the PDFs.
12. Sarvam free credits ₹100 (non-expiring), rate limits: most 60/min, bulbul:v3 = 30/min, sarvam-105b = 40/min. Anakin: 60/min search+scrape, 20/min Wire.

## File map (everything that exists, all under /Users/kingmohan45/Documents/30thAug/)
- `CLAUDE.md` — this file.
- `app/server.js` — whole backend (~180 lines). `app/public/index.html` — whole UI. `app/.env` — Sarvam key SET, Anakin EMPTY. `app/cache/` — response cache (empty until Anakin runs).
- `.claude/skills/sarvam-ai/SKILL.md` (523 lines) — every endpoint/model/speaker/limit, URL-cited, codemix + speaker-matrix section at end. `.claude/skills/anakin-io/SKILL.md` (623 lines) — same for Anakin incl. Wire + credit table. Both auto-load as skills; trust them over memory, they were researched from live docs TODAY.
- `research/wemakedevs-judging.md` (343) — rubric analysis; the actual challenge doc (world-readable Google Doc) is linked inside.
- `research/ideation.md` (223) — 6 candidates + kill list (Agmarknet/JanAushadhi = JS shells; eRaktKosh blocked; pmjay timeout — verified, do NOT retry). `research/ideas/*.md` — one file per idea.
- `research/sponsor-interests.md` (146) — sponsor pride points + intersection playbook + Wire catalog findings.
- `research/submission-draft.md` (43) — **PASTE-READY submission form answers + 2-min demo script + judge Q&A ammo.** Team names need filling.
- `/tmp/tts_kn.wav`, `/tmp/tts_hi.wav` — test audio (ephemeral; regenerate via skill's TTS curl if needed).

## Hard rules for this project
- Keys stay server-side / in `.env` only. `.env` is gitignored (folder isn't even a repo — if user asks to push, `git init` + check `.gitignore` FIRST).
- Personal event project → NO Jira, NO /pr-complete, NO work-repo machinery. Learnings stay in THIS folder.
- Don't clear `app/cache/` before the demo — cached responses ARE the demo-speed + credit insurance.
- Submit at 12:30 even if imperfect; improve after. 1:00 PM is hard.
- If CDSCO or Anakin misbehaves at demo time: cache already holds successful runs after first test — demo from cache is legitimate (it went through the real APIs).

## Continuation prompt for successor (user: paste this if starting fresh)
> Open /Users/kingmohan45/Documents/30thAug and read CLAUDE.md fully before acting (you have zero chat history; that file is the handoff). App is built and Sarvam-verified; server should be running on localhost:3000 (restart command in CLAUDE.md). Task: the Anakin API key is arriving — follow "The moment the Anakin key arrives" section exactly (verify Wire request shape before trusting it), drive one full /api/check live, fix real-response divergences, browser-test the mic, then help me submit at 12:30 using research/submission-draft.md.
