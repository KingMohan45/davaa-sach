# AI Engineer Mixer — 90-min Hackathon Ideation (Sarvam.ai + Anakin.io)

Research date: 2026-08-30, Bengaluru. Time-boxed research (~25 min).
Hard constraint: BOTH Sarvam (Indian-language STT/TTS/translate/doc-AI) AND Anakin (live web search / scrape / crawl) must be meaningful, visible, central.

**What I actually verified vs assumed is in the appendix at the bottom. Read it before trusting any source claim here.**

---

## Design principle I derived from the rubric

Sponsor API use (25%) is scored on *visible + central*, and Ideation (25%) on *well-defined user + problem*. That means the winning shape is:

> A named person who **cannot read the source data** (English, PDF, government-ese) asks a question **out loud in their language**, and the answer **did not exist yesterday** so no LLM can know it without a live fetch.

If the user could just read the page, Sarvam is lipstick. If the answer is in the model's weights, Anakin is lipstick. The idea must break *both* legs simultaneously.

Corroborating evidence on what gets punished — from the OpenAI "Build What Moves India" public-UX hackathon guidance (Aug 2026), which is the closest published rubric to this one:

- Judges explicitly discourage a *"generic 'AI chatbot on every page' without solving a concrete task completion problem"*.
- The friction is *"navigation and form design," not "lack of LLM wrappers."*
- AI additions should be **assistive** (field help, checklists, verdicts) **rather than open-ended chat interfaces** — one sample brief literally says *"Do not add a chatbot — fix the form flow only."*
- Rewarded: a **specific portal + specific user** ("Tax filer on mobile in Tier-2 city" beats "fix all gov websites"), a **before/after** demo, **Hindi/regional language** support, low-bandwidth, and a **hosted demo URL** because *"judges won't clone repos."*

Source: https://explainx.ai/blog/build-what-moves-india-openai-hackathon-public-websites-august-2026

**Direct implication for us: do not build a chat box.** Build a single-question → single-verdict-card flow. A verdict card with a citation is "assistive"; a chat window is the thing judges are on record disliking. Also: deploy it to a public URL, do not demo from localhost.

---

# Top 6 candidates

## 1. Davaa Sach — "Is the medicine in my hand safe, and am I being overcharged?"

**One-line pitch.** Speak the name and batch on your medicine strip in Kannada or Hindi and get a spoken verdict in the same language on whether that drug has been flagged by India's drug regulator as Not-of-Standard-Quality or spurious this month, plus what the generic costs.

**The user.** Lakshmi, 54, Bengaluru, speaks Kannada, reads very little English. A chemist just handed her a strip. The government publishes a monthly list of failed and fake drug batches — as an English PDF, on a portal she has never heard of. She is exactly the person the list is for and exactly the person who cannot use it.

**The live data source (verified).**
- `https://cdsco.gov.in/opencms/opencms/en/Alerts/` — **VERIFIED REACHABLE.** HTTP 200, `text/html`, 150 KB, **301 server-rendered `<tr>` rows**, no login, no captcha, no JS shell. Real parsed row titles include *"CDSCO NSQ ALERT FOR THE MONTH OF June 2025"*, *"List of spurious Drugs for the month of June-2025"*, *"Alert on theft of multiple drug products of M/s. Novo Nordisk during transit"*, each with a release date column.
- `https://cdsco.gov.in/opencms/opencms/en/Notifications/nsq-drugs/` — **VERIFIED REACHABLE.** HTTP 200, 97 KB, alert titles + dates present in the raw HTML (not JS-injected).
- `https://nppa.gov.in/` — **VERIFIED REACHABLE.** HTTP 200, 176 KB real HTML. Ceiling-price authority for the overcharge half.
- **Known limitation, stated plainly:** the batch-level detail lives in PDFs whose download links are `this.form.submit()` POSTs, so direct PDF URLs are **not** trivially derivable. Mitigation is designed in, not discovered later: Anakin's *live web search* leg picks up the many outlets that republish each month's NSQ list in HTML (Business Standard, PharmaTutor, ETV Bharat and others all carry the Feb/Mar/May 2026 lists — confirmed present in search results). So the index page gives authority + recency; the search leg gives the drug-level hit.

**Where Sarvam is load-bearing.** Three surfaces, all visible on stage:
1. **Saaras v3 STT** — Kannada/Hindi speech in, English text out in one hop (`mode: translate`), so the query never has to be typed. This is the whole access story: the user cannot type a drug name in English.
2. **Bulbul v3 TTS** — the verdict is *spoken back* in Kannada. She is standing at a counter; reading is not an option.
3. **Mayura / Sarvam-Translate** — renders the on-screen verdict card in Kannada script for the family member she shows it to.
   *(Stretch, if time allows: Sarvam document/OCR parse on a photo of the strip to auto-extract brand + batch. Big demo beat. Cut it first if the clock runs out.)*

**Where Anakin is load-bearing.** The answer is a *this-month* fact that no model has in weights:
1. **Scrape** the CDSCO alerts index for the current month's alert set — authority + a real government citation on the card.
2. **Live search** for the specific drug/batch across NSQ republishers to get the drug-level hit.
3. **Live search** the current retail price of the brand vs its generic equivalent for the overcharge line.

**2-minute demo script.**
- 0:00 "This is a real medicine strip." Hold it up.
- 0:10 Tap mic, speak in Kannada: *"ನನಗೆ ಈ ಮಾತ್ರೆ ಕೊಟ್ಟಿದ್ದಾರೆ — Amoxicillin, batch XYZ. ಇದು ಸುರಕ್ಷಿತವೇ?"*
- 0:20 Screen shows the Sarvam transcript appearing in English. **Say "that is Sarvam."**
- 0:30 Screen shows two live fetches streaming: `cdsco.gov.in/…/Alerts/` and a live price search. **Say "that is Anakin, fetched three seconds ago."**
- 0:45 Verdict card: **red** — flagged in the July NSQ alert, with the government link and the date.
- 1:05 Phone speaks the Kannada verdict aloud. Let it play. Do not talk over it.
- 1:20 Second run on a clean drug: **green** card, plus "the generic costs ₹42 versus the ₹310 you paid."
- 1:45 One line: "The list is public. It has always been public. It has never been in her language, out loud, in three seconds."

**Build risk in 90 min: MEDIUM.** The index scrape is verified trivial. The risk is batch-level matching, which is why the search leg is the primary path and the scrape is the authority/citation layer. Hard-cap the PDF work at zero; do not attempt the form-POST.

**Differentiation vs the crowd.** Very high. It is not on the organisers' list of five. Nobody demos drug-safety at a mixer. It has stakes (counterfeit medicine), a government citation on screen, and a two-state demo (red/green) that reads instantly from the back of the room.

---

## 2. Sach ya Jhooth — verdict on a forwarded WhatsApp voice note

**One-line pitch.** Forward the voice note your uncle sent about a government payout or a job offer, and get a spoken, cited verdict on whether it is real.

**The user.** Ramesh, 41, Hindi-speaking driver in Bengaluru. He receives 15 forwards a day about schemes and jobs; several are advance-fee scams. He cannot verify a claim because verification means reading English news and a `.gov.in` page.

**Live data source.** Anakin live web search itself is the source, constrained to an official-domain allowlist (`*.gov.in`, `*.nic.in`, PIB) plus fact-check outlets. `https://www.pib.gov.in/allRel.aspx` — **VERIFIED REACHABLE**, HTTP 200, 141 KB real HTML, 41 KB visible text; PIB runs the government's own Fact Check unit, which makes it the perfect authority anchor.

**Sarvam load-bearing.** The input is *audio he did not write* — STT is not a convenience, it is the only way in. Saaras handles the Hindi/code-mix reality of a real forward. Bulbul speaks the verdict so he can forward *that* back to the group, which is the actual viral mechanic.

**Anakin load-bearing.** A scam claim is minted this week; it is definitionally not in weights. Search + scrape of the named official domain is the entire verification step.

**Demo.** Play a real-sounding Hindi voice forward out loud → transcript → live fetches → red "no such scheme, PIB Fact Check says X" card → spoken Hindi rebuttal you could forward back.

**Build risk: LOW.** No brittle scraper anywhere. This is the safest build on the list.

**Differentiation.** High on originality, but carries the *"it is a search wrapper"* perception risk that the OpenAI guidance above shows judges actively hunt for. Defend it with a structured verdict card, an explicit official-source allowlist, and a "what to do next" action — never a chat box.

---

## 3. Sarkari Deadline — spoken alerts on jobs, exams and admission counselling

**One-line pitch.** Say your qualification and district out loud; hear this week's real government job notices, exam dates and counselling deadlines in your language, with the closing date first.

**The user.** Manjunath, 22, first-generation graduate in Tumakuru. His family misses counselling rounds because notices are English PDFs posted with four days' notice.

**Live data sources (verified).** `https://www.ncs.gov.in/Pages/default.aspx` — **VERIFIED**, HTTP 200, 287 KB, 158 KB visible text. `https://cetonline.karnataka.gov.in/kea/` — **VERIFIED**, HTTP 200, 89 KB real HTML. `https://www.pib.gov.in/allRel.aspx` — **VERIFIED**.

**Sarvam.** STT for the query, TTS for a deadline read aloud, translate for the notice title. **Anakin.** Deadlines change weekly; a stale answer is a missed exam.

**Build risk: LOW-MEDIUM.** **Differentiation: MEDIUM** — adjacent to suggested idea #5 (Scheme Navigator), so it inherits some crowding. The defensible twist is *deadline-first ordering* ("closes in 4 days") rather than eligibility Q&A.

---

## 4. Namma Nudi Civic — Bengaluru civic notices, spoken in Kannada

**One-line pitch.** Ask in Kannada whether your area has a power cut, water shutdown or route diversion tomorrow.

**The user.** A Bengaluru household that finds out about a scheduled BESCOM outage after the fridge has already warmed up.

**Live sources (verified).** `https://bescom.karnataka.gov.in/` — **VERIFIED**, HTTP 200, 286 KB real HTML. `https://mybmtc.karnataka.gov.in/info-2/Bus+Routes/en` — **VERIFIED**, HTTP 200, 263 KB, and notably **serves Kannada natively** (`lang_name = "kn"`, Kannada title in the raw HTML), which is a nice on-brand detail.

**Sarvam.** Genuinely load-bearing for the Kannada-first user. **Anakin.** Outage notices are same-week only.

**Build risk: MEDIUM.** Notice content is often buried in PDFs/tenders rather than clean HTML — the pages are reachable, the *structured notices* are not verified. **Differentiation: MEDIUM-HIGH**, but overlaps suggested idea #2 (Bengaluru Event Companion) in the judges' mental model.

---

## 5. Bill Sach — pharmacy-bill overcharge checker

**One-line pitch.** Photograph your pharmacy bill, hear in your language exactly which line items were billed above the government ceiling price.

**The user.** Anyone discharged from a private hospital in Bengaluru holding a five-page itemised bill.

**Live source.** `https://nppa.gov.in/` — **VERIFIED REACHABLE**, HTTP 200, 176 KB real HTML.

**Sarvam.** This is the strongest *document-AI* showcase on the list — OCR/parse the bill, then TTS the finding. **Anakin.** Live ceiling-price + current retail lookup per line item.

**Build risk: HIGH** in 90 minutes — bill OCR plus per-line-item matching plus price lookup is three hard things. **Best used as the stretch feature of idea #1, not as a standalone build.**

---

## 6. Mandi Radar — crop price, voice-first

**One-line pitch.** A farmer asks in Kannada what his crop is fetching in nearby markets today.

**Status: DOWNGRADED — the obvious source is dead.** `https://agmarknet.gov.in/SearchCmmMkt.aspx` returned **1 KB and the literal string "Agmarknet 2.0 — You need to enable JavaScript to run this app."** It is now a React shell. Any team that picked this from the classic-idea list will discover that at minute 40.

Salvageable only via live search over eNAM/news republishers rather than the official portal — which weakens the "authoritative source" story badly. **Build risk: HIGH. Do not pick this.**

---

# Ranked shortlist

### #1 — Davaa Sach (medicine safety + price)

Scored against the six rubric lines:

| Rubric line | Weight | Score | Why |
|---|---|---|---|
| Good ideation | 25% | **9/10** | One named user, one sentence, life-safety stakes. The problem is provably real: CDSCO flagged 168 medicines in March 2026 and 194 plus 4 spurious in February 2026. The list exists and is unusable by the people who need it. |
| Sponsor API use | 25% | **10/10** | Three visible Sarvam surfaces (STT, TTS, translate; OCR as stretch) and three visible Anakin surfaces (gov scrape, NSQ search, price search). Remove either sponsor and the product ceases to exist — that is the test. |
| Originality + usefulness | 20% | **9/10** | Not on the suggested list, not a category anyone demos, and genuinely useful the same day. |
| User experience | 10% | **8/10** | Mic → red-or-green card → spoken answer. Reads from the back of the room in two seconds. No chat box, per the judging evidence. |
| Technical clarity | 10% | **9/10** | Trivially diagrammable: voice → Sarvam → entity → Anakin ×2 → verdict → Sarvam. Five boxes. |
| Working product | 10% | **7/10** | The medium-risk line. Index scrape verified trivial; batch matching is the real work. Mitigated by making search the primary path. |

**Why it beats the five suggested ideas.** Speak-to-the-Web Explainer and Bengaluru Event Companion will each be built by several teams, and both are *generic* — no named user, and the AI layer is exactly the "chatbot on every page" shape the published guidance says judges penalise. Local Price Radar and Review Lens are commerce conveniences where voice is a nicety, not an unlock — the user could have read the page. Scheme Navigator is the closest in spirit but is crowded, and myScheme is a Next.js app whose scheme list is client-fetched, so those teams inherit a scraping problem they have not priced in. Davaa Sach is the only one where the user *physically cannot* consume the source (English regulatory PDF) and the answer *cannot* be in weights (this month's list).

### #2 — Sach ya Jhooth (WhatsApp voice-note verifier)
Take this if the team is unfamiliar with the sponsor APIs or is short a person. It is the lowest-risk build here and has the loudest demo. It trades a little "real data" credibility for near-certain working-product marks. Pick it deliberately, not by drifting into it at minute 50.

### #3 — Sarkari Deadline (jobs / exams / counselling)
Solid, verified sources, obvious user. Loses to the top two on originality because of adjacency to Scheme Navigator. Its one defensible twist is deadline-first ordering.

---

# Kill list — looks great, will fail in 90 minutes

| Idea | Killer | Evidence |
|---|---|---|
| Mandi / agri prices via Agmarknet | **JS shell** | `agmarknet.gov.in/SearchCmmMkt.aspx` → 1 KB, *"Agmarknet 2.0 — You need to enable JavaScript to run this app."* **Verified.** |
| Jan Aushadhi generic-medicine price list | **JS shell** | `janaushadhi.gov.in/ProductList.aspx` → 4 KB, *"JANAUSHADHI — You need to enable JavaScript to run this app."* **Verified.** |
| Blood-bank availability (eRaktKosh) | **Session/token guard** | `eraktkosh.mohfw.gov.in/…/nearbyBB.cnt` → 252 bytes, *"Error Name: This Activity/Values Not Allowed."* **Verified.** |
| Ayushman Bharat hospital finder | **Unreachable** | `www.pmjay.gov.in` → connection timed out after 18 s. **Verified.** |
| RTO / e-challan status | **Host does not resolve + captcha** | `site.parivahan.gov.in` → *"Could not resolve host."* Challan lookup is captcha-gated. **Verified (DNS); captcha assumed from known behaviour.** |
| eCourts case status | **Per-query captcha** | Assumed, not fetched. Well-documented captcha on every search. |
| EPFO / PF passbook | **Login wall** | Assumed. Requires UAN + OTP. Non-starter. |
| IRCTC / PNR | **Auth + aggressive bot blocking** | Assumed. Do not spend a minute on it. |
| BBMP property tax | **Captcha / OTP** | Assumed, not fetched. |
| myScheme scheme list | **Client-fetched data** | `myscheme.gov.in/search` → 65 KB but the server-rendered text is largely FAQ JSON-LD; the scheme list is fetched client-side. **Partially verified.** Also the most crowded idea. |
| CDSCO batch-level PDFs | **Form-POST download links** | Row download links are `this.form.submit()`, so PDF URLs are not derivable. **Verified.** Route around it; do not fight it. |
| Anything needing a dataset you must first assemble | **No time** | 90 minutes. If step one is "build a dataset," stop. |

---

# Verified-source appendix

Every row below was fetched with `curl -sSL` and a real desktop User-Agent, and inspected for status, content-type, byte size, script count and visible text. "Real HTML" means the content was present in the raw response, not injected by JavaScript.

| URL | Status | Type / size | Verdict |
|---|---|---|---|
| `https://cdsco.gov.in/opencms/opencms/en/Alerts/` | 200 | text/html, 150 KB | **REAL HTML — 301 `<tr>` rows parsed, real alert titles + dates. Primary source for #1.** |
| `https://cdsco.gov.in/opencms/opencms/en/Notifications/nsq-drugs/` | 200 | text/html, 97 KB | **REAL HTML — NSQ alert titles + dates server-rendered.** |
| `https://www.pib.gov.in/allRel.aspx` | 200 | text/html, 141 KB | **REAL HTML** — 41 KB visible text. |
| `https://cetonline.karnataka.gov.in/kea/` | 200 | text/html, 89 KB | **REAL HTML** — 46 KB visible text, only 2 scripts. |
| `https://www.ncs.gov.in/Pages/default.aspx` | 200 | text/html, 287 KB | **REAL HTML** — 158 KB visible text. |
| `https://bescom.karnataka.gov.in/` | 200 | text/html, 286 KB | **REAL HTML** — 104 KB visible text. |
| `https://mybmtc.karnataka.gov.in/info-2/Bus+Routes/en` | 200 | text/html, 263 KB | **REAL HTML**, serves Kannada natively. |
| `https://nppa.gov.in/` | 200 | text/html, 176 KB | **REAL HTML** — 64 KB visible text. |
| `https://www.myscheme.gov.in/search` | 200 | text/html, 65 KB | **PARTIAL** — server text is mostly FAQ JSON-LD; scheme list client-fetched. |
| `https://agmarknet.gov.in/SearchCmmMkt.aspx` | 200 | text/html, 1 KB | **DEAD — JS shell.** |
| `https://janaushadhi.gov.in/ProductList.aspx` | 200 | text/html, 4 KB | **DEAD — JS shell.** |
| `https://eraktkosh.mohfw.gov.in/BLDAHIMS/bloodbank/nearbyBB.cnt` | 200 | text/html, 252 B | **DEAD — activity-not-allowed guard.** |
| `https://www.pmjay.gov.in/` | — | timeout 18 s | **DEAD — unreachable.** |
| `https://site.parivahan.gov.in/` | — | DNS failure | **DEAD — host does not resolve.** |
| `https://cdsco.gov.in/opencms/opencms/en/Drugs/Drug-Alerts/` | 404 | — | Dead path; the live paths are the two CDSCO rows above. |

**Assumed, not fetched** (stated so no one treats them as verified): eCourts captcha, EPFO login wall, IRCTC bot-blocking, BBMP captcha, and the exact Anakin capability surface (whether it renders JS pages). If Anakin does render JS, several kill-list entries become viable — but do not design assuming it.

**Sarvam model names**, confirmed from `docs.sarvam.ai` via search: **Saaras v3** (STT, 23 languages, `mode: transcribe|translate|verbatim|translit|codemix`), **Bulbul v3** (TTS, 11 languages, 30+ speakers), **Mayura** / **Sarvam-Translate** (translation). Note Saarika v1/v2 and Bulbul v1 are **deprecated** — use Saarika v2.5 or Saaras v3, and Bulbul v3. Do not copy an old tutorial's model string.

---

## Sources
- https://explainx.ai/blog/build-what-moves-india-openai-hackathon-public-websites-august-2026
- https://www.business-standard.com/industry/news/cdsco-flags-4-spurious-drugs-194-fail-quality-tests-feb-2026-126032301221_1.html
- https://www.etvbharat.com/en/health/cdsco-detects-168-not-of-standard-quality-and-spurious-medicines-in-march-enn26042103333
- https://www.pharmatutor.org/pharma-news/2026/cdsco-flags-157-drug-samples-as-not-of-standard-quality-2-declared-spurious-in-may-2026
- https://docs.sarvam.ai/api/getting-started/models
- https://docs.sarvam.ai/api-reference-docs/models/bulbul
- https://docs.sarvam.ai/api-reference-docs/models/saaras
