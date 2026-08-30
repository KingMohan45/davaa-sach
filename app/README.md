# Davaa Sach — data sources, endpoints and architecture

Every claim below was verified live against the real APIs on 2026-08-30, not taken from docs.
Where a source was rejected, the measurement that rejected it is recorded, so nobody re-probes it.

---

## 1. What gets scraped, and by whom

**We do not run a scraper.** We POST a URL to Anakin's url-scraper; Anakin renders it on their
infrastructure and returns `{html, cleanedHtml, markdown, generatedJson}` in one response. No
headless browser here, no CSS selectors, nothing to fix when a regulator redesigns their site.

```
POST https://api.anakin.io/v1/url-scraper/scrape   {"url": "..."}
  -> 202 + job id  ->  poll GET /v1/url-scraper/{id} every 2s (max 15 attempts)
  -> status "completed"  ->  read data.markdown
```

### 1a. Pages we scrape (hardcoded, cached, shared across requests)

| # | URL | Used for | Size | Alert terms | Anakin time |
|---|---|---|---|---|---|
| 1 | `https://cdsco.gov.in/opencms/opencms/en/Alerts/` | India's NSQ / spurious-drug alert index — the regulator of record for use case 1 | 24,306 chars markdown | — | 1.0s (2.7s wall) |
| 2 | `https://www.who.int/teams/regulation-prequalification/incidents-and-SF/full-list-of-who-medical-product-alerts` | WHO falsified & substandard medical product alerts — the international authority for use case 2 | 39,936 chars | **780** | 1.0s (2.7s wall) |

Sample line proving source 2 carries real drug-level content, not navigation:

```
Medical Product Alert N°3/2026: Falsified DARZALEX (daratumumab)
```

Only WHO alert lines that **contain the drug name** are passed to the model (`whoLinesFor`), by
exact substring. Deliberately not embeddings: a fuzzy vector match on a drug name is a wrong answer
in a safety product, and a substring hit is its own citation.

### 1b. Pages we probed and REJECTED (do not re-probe these)

All of them scrape successfully — the failure is that their landing pages are navigation chrome,
not drug data. `status: completed` is not the same as usable.

| URL | Result | Why rejected |
|---|---|---|
| `recalls-rappels.canada.ca/en/search/site?...` | 5,419 chars, 52 terms | facet counts only: `"9859results available"`, `"6250results available"` |
| `gov.uk/drug-safety-update` | 28,002 chars, **11** terms | a topic menu (`Anaesthesia and intensive care`, `Cardiovascular disease...`) |
| `cdsco.gov.in/.../consumer/List-Of-Banned-Drugs` | 2,408 chars, 2 terms | the site's own header and nav bar; real list is in PDFs |
| `cdsco.gov.in/.../Drugs/Banned-Drugs/` | 160 chars | `"The requested resource was not found on the server."` |
| `tga.gov.au/safety/safety-alerts` | 3,131 chars, 6 terms | one paragraph of boilerplate |
| `ec.europa.eu/health/documents/community-register/...` | 1,610 chars, **0** terms | no usable content |
| `fda.gov/safety/recalls-market-withdrawals-safety-alerts` | 5,588 chars, 13 terms | real data is behind JS; **use the openFDA API instead** |

Per-drug regulator *search* URLs were also tried (with `nimesulide`) and are weak:
Health Canada 3 hits / 943 chars, MHRA 2 hits / 1,892 chars, **TGA 0 hits / 51 chars**.

**Conclusion: Anakin _search_ beats regulator page scraping for international bans**, because the
binding decisions live in documents those landing pages never list. Probed with `nimesulide`, it
returned five EMA referral documents on hepatotoxicity and EU restriction — none of which appear on
any regulator index page we scraped.

---

## 2. Anakin search (live, per drug, not cached across drugs)

`POST https://api.anakin.io/v1/search` — field is **`prompt`**, not `query`; results are
**top-level `results`**, not `data.results`.

| Query template | Used by |
|---|---|
| `"<drug>" CDSCO NSQ alert OR spurious drug India 2026` | use case 1 |
| `"<drug>" CDSCO NSQ alert OR banned OR withdrawn India` | use case 2 |
| `<drug> banned OR withdrawn OR suspended in which countries EMA WHO FDA regulatory action` | use case 2, international bans |
| `<drug> generic price India Jan Aushadhi` | use case 1, price fallback when Wire fails |

### Domains actually returned so far (counted across every cached run)

| hits | domain |
|---|---|
| 69 | cdsco.gov.in (`nsq-drugs`, `Alerts`, `Latest-Alerts`, `consumer/NSQ-Alerts`) |
| 23 | pharma.economictimes.indiatimes.com |
| 3 | indiapharmaoutlook.com |
| 3 | business-standard.com |
| 3 | thesouthfirst.com |
| 3 | nafdac.gov.ng (Nigeria's regulator — counterfeit Augmentin alert) |
| 1 | pharmeasy.in · janaushadhibhadohi.in · janaushadhidava.com · thenewsmill.com |

---

### Anakin surfaces in use

| # | Surface | What it fetches |
|---|---|---|
| 1 | `url-scraper` | CDSCO alerts index |
| 2 | `url-scraper` | WHO falsified-medicine alert index |
| 3 | `url-scraper` | openFDA `drug/label` JSON |
| 4 | `url-scraper` | openFDA `drug/enforcement` JSON |
| 5 | `search` | CDSCO NSQ / spurious, per drug |
| 6 | `search` | international bans and suspensions, per drug |
| 7 | `wire` | `tmg_search` on Tata 1mg |

## 3. Anakin Wire (typed action, not a scrape)

`POST /v1/wire/task` — fields are **`action_id`** and **`params`**.

- Action: **`tmg_search`**, catalog **`tata-1mg`** (India's largest online pharmacy).
- Params: `query` (required), `city`, `page`, `per_page`, `sort`, `types`, `fetch_eta`.
- We send `{ query: <drug>, per_page: 5, city: "Bengaluru" }`. 2 credits, async, poll `/v1/wire/jobs/{id}`.
- Fallback if Wire fails: plain Anakin search for Jan Aushadhi generic pricing.

Wire is preferred over scraping 1mg because 1mg is a React storefront; a typed action with named
parameters survives their next redeploy. Note the catalog also has `tmg_product_by_slug`,
`tmg_product_widgets`, `tmg_autocomplete`.

---

## 4. openFDA — fetched THROUGH Anakin's url-scraper

Every external byte of evidence enters through Anakin, including the JSON APIs. `anakinFetchJson()`
POSTs the openFDA URL to `/v1/url-scraper/scrape` and parses the response's **`html`** field, which
carries clean parseable JSON. Verified live: `markdown` mangles it (`Invalid \escape`) and
`cleanedHtml` HTML-escapes every quote (`&#34;`), so `html` is the only field to read for a JSON
endpoint. There is a direct-fetch fallback so the sponsor path can never take the feature down, and
each cached record carries `_via: "anakin" | "direct" | "none"` so the path taken is auditable
rather than assumed.

| Endpoint | Fields we read | Used for |
|---|---|---|
| `api.fda.gov/drug/label.json` | `contraindications`, `drug_interactions`, `boxed_warning`, `indications_and_usage`, `adverse_reactions` | the prescription audit — this is what makes an interaction check real rather than model-recalled |
| `api.fda.gov/drug/enforcement.json` | `product_description`, `reason_for_recall`, `country`, `classification` | recalls, with the country attached |

**Gotcha, found the hard way:** openFDA indexes the drug **name only**. `"Warfarin 5 mg"` returns
**0** results while `"Warfarin"` returns **75**; `"Aspirin 150"` returns 0, `"Aspirin"` returns 751.
The strength suffix produced a false *"no US label found"* which then outranked a genuine
warfarin/aspirin bleeding-risk interaction in the verdict. `drugStem()` strips strength, unit and
form before every lookup, and a missing label is now explicitly ranked as a weak signal.

---

## 5. Sarvam.ai

| Model | Endpoint | Used for |
|---|---|---|
| `saaras:v3`, `mode=codemix` | `/speech-to-text` | code-mixed speech ("Dolo 650 safe hai kya"), auto language detection |
| `sarvam-105b` | `/v1/chat/completions` | the use-case-1 verdict |
| `sarvam-105b-conversations` | `/v1/chat/completions` | drug extraction, prescription review, symptoms, interpreter |
| `sarvam-translate:v1` | `/translate` | verdict into kn/hi/te/ta, and indic↔indic via English |
| `bulbul:v3` | `/text-to-speech` | spoken answer; speakers `ishita` (kn/ta), `priya` (hi/te/en) |

Auth header is `api-subscription-key`. A bad key returns **403**, not 401.

**Measured model choice.** On the real prescription payload:

| model | wall | completion tokens | verdict |
|---|---|---|---|
| `sarvam-105b` (reasoning_effort low, max 7000) | **43.5s** | 3,217 | caution |
| `sarvam-105b-conversations` (max 3000) | **7.8s** | 126 | caution |

Same verdict, 5.6x faster. The reasoning budget was going almost entirely into `reasoning_content`
that we discard. `sarvam-105b` returns `content: null` when reasoning exhausts the budget, so
`sarvamChat` falls back to `reasoning_content` and never returns null.

**STT returns native script.** `mode=codemix` transcribes "Dolo 650" as "डोलो छः सौ पचास" — digits
as words — which would silently break an English web search. A `sarvam-105b-conversations` pass
extracts the Latin drug name (`drugLatin`) before anything reaches Anakin.

---

## 6. Endpoints

| Route | Input | Does |
|---|---|---|
| `POST /api/stt` | `{audioBase64, mime}` | saaras:v3 codemix → `{transcript, drugLatin, detectedLang}` |
| `POST /api/check` | `{drug, lang}` | use case 1: CDSCO + Wire price → verdict card + audio |
| `POST /api/prescription` | `{text, lang}` | use case 2: extract drugs → WHO + bans + openFDA + CDSCO → set-level review |
| `POST /api/symptoms` | `{text, lang}` | use case 3: symptoms → generic classes, urgency, questions to ask |
| `POST /api/interpret` | `{text, from, to, speaker}` | use case 4: cross-language consultation + clinical structuring |
| `GET /api/health` | — | `{sarvamKey, anakinKey}` |

---

## 7. Storage

**No database, no vector store, no RAG.** Anakin stores nothing for us — its response carries a
job `id` and a `cached` flag (ours came back `false`, a fresh fetch), and that is all.

All persistence is flat JSON on disk:

```
app/cache/<sha1("<kind>:<input>")[:16]>.json
```

| kind | key input |
|---|---|
| `scrape:` | the URL |
| `search:` | the search prompt |
| `wire:` | action id + params |
| `fdalabel:` / `fdarecall:` | stemmed drug name |
| `answer:v2:` | `<drug>:<lang>` — the whole rendered answer |

Reads are `readFileSync` in a try/catch returning `null`, so a corrupt or missing file just causes a
live call and never a crash. Cache is currently ~13 MB across ~31 files, of which **97% is base64
WAV audio** inside the answer files. Add `cache/` to `.gitignore` — it regenerates itself.

**A degraded answer is never cached**, so a transient outage cannot freeze a wrong "all clear".

---

## 8. Measured latency

| Path | Cold | Cached |
|---|---|---|
| `/api/check` | ~48–50s | **0.024s** |
| `/api/prescription` | **13.8s** (extract 1.2s · evidence 0.9s · review 7.2s · voice 5.4s) | — |
| `/api/interpret` | **5.4s** (translate 1.7s · clinical 2.0s · voice 1.7s) | — |
| Anakin scrape | 1.0–3.6s internal, 2.5–4.6s wall | — |
| Anakin search | 1–2s | — |

Anakin is never the bottleneck. Before the model switch, the single `sarvam-105b` review call was
**87%** of total time (54.2s of 62.5s).

---

## 9. Failure behaviour

Every external leg degrades rather than failing the request, and the response reports which legs
degraded in a `degraded[]` array that the UI renders. If the regulator leg is unreachable the answer
becomes *"unchecked — not a clean bill"*, never a green tick: an unavailable answer is never
presented as a safe one.

---

## 10. Run it

```
cd app && npm install && node server.js        # http://localhost:3000
```

`.env` needs `SARVAM_API_KEY` and `ANAKIN_API_KEY`. Keys are server-side only and never reach the
browser. `GET /api/health` reports which keys are loaded.
