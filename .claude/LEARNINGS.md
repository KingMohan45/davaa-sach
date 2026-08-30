# Davaa Sach — learnings

Everything here was paid for once. Do not re-derive it.
Companions: root `CLAUDE.md` (handoff), `app/CLAUDE.md` (code contracts), `app/README.md` (sources
with measurements), `.claude/skills/{sarvam-ai,anakin-io}/SKILL.md` (endpoint reference).

---

## 1. `sarvam-translate:v1` needs NATIVE script. Romanized input mistranslates silently.

`"Do din se pet me tez dard hai"` (**stomach** pain) came back as **"terrible chest infection"**.
The same sentence in Devanagari gives *"severe stomach pain and vomiting"*. The consultation note
then faithfully recorded a chest infection, and the suggestions changed to antibiotics.

Nothing errored. The translation was fluent, confident and about a different organ.

Voice input was always fine because `saaras:v3` returns native script; **typed** input was not, and
the demo chips were romanized. Fix: `toNativeScript()` runs `/transliterate` whenever the text is
Latin-only and the language is not English. Verified both directions before and after.

**How to apply:** any indic-language text path that did not come from `saaras:v3` must be
transliterated first. When a translation looks plausible but clinically wrong, suspect the script
before the model.

**Amended 2026-08-30 — the transliterator was itself the next silent hop.** `/transliterate`
resolves a Roman spelling by SPELLING, not by meaning, and has no idea it is in a clinic:
`"Chaati me jalan hoti hai"` came back as **चाटी** (tongue-ish) instead of **छाती** (chest), and
every hop after it faithfully carried *"my tongue is burning at night"* into the doctor's language.
Fluent, confident, wrong organ, second time in the same pipeline for the same reason.

The fix is a `sarvam-105b-conversations` call that is TOLD it is a doctor visit and asked to output
the same sentence in the target script (`SCRIPT_NAME[lang]`), with `/transliterate` kept as the
fallback and a `looksLatin()` guard on the result. Same round trip as the transliterator it
replaced (~1.0s), and it fixes the class rather than one word.

**How to apply:** when a translation chain's output is wrong, walk it from the FIRST hop. A
normalisation step (transliterate, unicode-fold, slugify, romanise, autocorrect) is where meaning
is lost most cheaply and most silently, because every hop downstream is then perfectly correct
about the wrong input. And a normaliser that can be given DOMAIN CONTEXT usually should be: the
ambiguity is real, and only the context resolves it.

## 2. `sarvam-105b` is a reasoning model and is the wrong default

Measured A/B on the real prescription payload, identical prompt:

| model | wall | completion tokens | verdict |
|---|---|---|---|
| `sarvam-105b` (`reasoning_effort: low`, max 7000) | **43.5s** | 3,217 | caution |
| `sarvam-105b-conversations` (max 3000) | **7.8s** | 126 | caution |

Same verdict, 5.6x faster. The budget was going almost entirely into `reasoning_content` we discard.

It also **returns `content: null`** when reasoning exhausts `max_tokens`, which crashed the route
(`Cannot read properties of null`) and, once guarded, printed raw chain-of-thought to the user as
the verdict. `sarvamChat` now falls back to `reasoning_content` and never returns null, and an
unparseable verdict produces an honest message instead of the model's private thinking.

**How to apply:** default to `sarvam-105b-conversations` for anything latency-sensitive. Reserve
`sarvam-105b` for where deep reasoning actually changes the answer, and prove it does with an A/B.

## 3. openFDA indexes the drug NAME only

`"Warfarin 5 mg"` → **0** results. `"Warfarin"` → **75**. `"Aspirin 150"` → 0, `"Aspirin"` → 751.

The strength suffix produced a false *"no US label found"*, which the reviewer then ranked ABOVE a
real warfarin/aspirin bleeding-risk interaction and put in the headline. **A lookup miss had become
a safety finding.** With `drugStem()` stripping strength/unit/form, the same query surfaces the FDA
**boxed warning** — the strongest evidence available — and two `high` interaction findings.

**How to apply:** when a lookup returns empty, decide explicitly what empty MEANS before feeding it
to a model, and rank it. Absence of evidence is not evidence of safety, and it must never outrank a
positive finding.

## 4. Anakin can fetch JSON APIs — read `html`, not `markdown`

`POST /v1/url-scraper/scrape` on `api.fda.gov` works fine and lets every external byte enter through
one audited path. But of the three body fields:

- `markdown` — mangles it, `Invalid \escape` on parse
- `cleanedHtml` — HTML-escapes every quote (`&#34;`)
- **`html`** — clean, parseable JSON

`anakinFetchJson()` parses `html`, falls back to a direct fetch, and records `_via` so the path
taken is auditable instead of assumed.

## 5. Regulator landing pages are navigation chrome. Anakin **search** beats scraping them.

All eight scraped successfully — `status: completed` is not the same as usable:

| page | chars | alert terms | what it actually was |
|---|---|---|---|
| **WHO alerts index** | 39,936 | **780** | real drug-level content, the one worth scraping |
| MHRA drug-safety-update | 28,002 | 11 | a topic menu |
| Health Canada recalls | 5,419 | 52 | facet counts, `"9859results available"` |
| CDSCO Banned-Drugs | 2,408 | 2 | the site's own header |
| TGA safety-alerts | 3,131 | 6 | one paragraph of boilerplate |
| EMA register | 1,610 | **0** | nothing |

Per-drug regulator *search* URLs are also weak (TGA returned **51 chars**). What worked: one Anakin
**search** for `nimesulide banned withdrawn suspended` returned five EMA referral documents on
hepatotoxicity — none of which appear on any regulator index page.

**How to apply:** measure content, not HTTP status. Count domain-signal terms in the markdown before
wiring a source in. And for "is this banned anywhere", search beats scraping, because the binding
decisions live in documents the landing pages never list.

## 6. Anakin Wire: the skill's example action ids are not real

Body fields **are** `action_id` + `params` as documented. But the documented ids
(`amazon.search_products`) do not exist. Real ids look like `am_bestsellers`,
`act_amazon_pl_product_detail_ssr`, `tmg_search`.

**Tata 1mg IS in the catalog** (`tmg_search`, slug `tata-1mg`, params `query`/`city`/`per_page`),
contradicting an earlier session's note that no Indian pharmacy was available. Always resolve ids
from `GET /v1/wire/search?q=` or `GET /v1/wire/catalog/{slug}` before writing the call.

## 7. Latency lives in the model, not in Anakin

Instrumenting the stages before optimizing anything:

```
extract 3399ms | evidence 1368ms | review 54241ms | voice 3473ms | total 62484ms
```

**Review was 87%.** Anakin scrape is 1.0–3.6s internal, 2.5–4.6s wall; search is 1–2s. Every
instinct to "parallelize the fetches" would have bought nothing.

Second win after the model swap: the output chain (translate → TTS) and the clinical read run
concurrently instead of in sequence. `/api/interpret` went ~7s → **2.7s**.

**Superseded 2026-08-30:** there is no longer a shared English pivot. `sarvam-translate:v1` goes
indic-to-indic in one hop, so the listener's chain and the clinical read now start at the *same*
moment rather than one waiting on the other, and a **doctor's** turn never pays for an English
pivot at all (nothing structures an instruction). Measured `hi-IN -> kn-IN` patient turn:
`script 1.0s | outAndClinical 2.5-3.6s | total 3.5-4.6s` including TTS.

**How to apply:** instrument stages and return the timings in the response body before touching
anything. The UI then shows them too, which is its own demo asset.

## 8. Cache the whole answer, and never cache a degraded one

Per-call caching left the Sarvam legs uncached, so a repeat question still took ~50s. Caching the
rendered answer keyed on `<drug>:<lang>` took a repeat to **0.024s** — a 1400x gap, and it is what
makes the demo survive a bad room.

A degraded answer (any evidence leg unreachable) is **never** cached, so a transient outage cannot
freeze a wrong "all clear" into the store.

## 9. A corpus that is identical for every question does not belong on the request path

The CDSCO alerts index and the WHO falsified-medicine index do not depend on what the user asked,
yet both were scraped inside `/api/check`, so **every** answer paid an Anakin 202-poll for bytes
that were the same as the previous caller's. The disk cache hid it from the second request onward,
which is exactly why it survived: the only person who ever felt it was the first user after a cold
start, and at a demo that is the judge.

They are now a warm store — refreshed at boot and on a `WARM_MS` timer, read from memory by
`warmMd(key)`, which **never awaits a network call**. A cold store degrades the answer (it pushes
`cdsco-index` onto `degraded`) and never blocks it. `GET /api/health` reports each source's size
and age, `POST /api/warm {force:true}` re-reads past the disk cache.

Boot receipt: `cdsco=3500 who=39936` chars, both ~3s after listen.

**How to apply:** for each fetch on a request path, ask *does this response depend on the request?*
If not, it is a background refresh with a memory read in front of it. And make the accessor
structurally incapable of blocking (return the slot, fire the refresh, never `await` it), because a
"cache with a fallback fetch" quietly becomes a request-path fetch again the moment it expires.

## 10. Driving the debug browser over raw CDP: two traps that read as "the browser is broken"

Both cost a call each while verifying the chat UI, and **both were already written down** in
`~/.claude/skills/test-ui/SKILL.md` §11 — running that skill's `ensure-browser.sh` is not the same
as reading the section that covers the client you are about to hand-roll.

1. **`websocket.create_connection(WS)` fails with `Handshake status 403 Forbidden`** — Chrome
   rejects the `Origin` header the python client sends by default. Fix is
   `create_connection(WS, timeout=30, suppress_origin=True)`. The error text points at
   `--remote-allow-origins`, i.e. at relaunching the browser, which is the wrong fix.
2. **`export BU_CDP_WS=...` does not survive to the next Bash call.** Shell state is not persisted
   between tool calls, so the variable was empty and `websocket` reported `ValueError: url is
   invalid` — which reads as a malformed endpoint, not as an empty variable. Resolve the WS URL in
   the SAME command that uses it:
   `WS=$(curl -s http://127.0.0.1:9333/json/version | python3 -c "import sys,json;print(json.load(sys.stdin)['webSocketDebuggerUrl'])")`.

Also: macOS python3 is PEP-668 managed, so `pip install websocket-client` is refused. Use a venv
(`python3 -m venv /tmp/cdpvenv`), do not reach for `--break-system-packages`.

**The probe that actually settles a half-wired page** (from the TDZ entry in root `CLAUDE.md`):
`typeof <someConst>` vs `typeof <someFunction>` — consts die at a throw, function declarations are
hoisted and survive, so the pair locates a dead line that leaves no console error.
