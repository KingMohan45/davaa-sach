# Sponsor interests memo: Sarvam.ai + Anakin.io (verified 2026-08-30, ~20-min sweep)

Everything below was verified by fetching the cited page today unless marked UNVERIFIED.

---

## SARVAM.AI: what they publicly brag about

**The sovereign-AI story is THE story.** sarvam-105b launched Feb 2026 at the India AI Impact
Summit (New Delhi): trained from scratch **entirely in India on IndiaAI Mission compute**,
MoE architecture, 128K context, all 22 official Indian languages, launched alongside
sarvam-30b for real-time conversation. Coverage framing everywhere: "India's boldest sovereign
AI bet", full-stack sovereign platform (foundation models + voice agents deployed across
enterprise and government + a conversational platform past **140M conversations**).
Sources: business-standard.com sarvam-105b launch coverage; ycombinator/bvp/restofworld profiles.
(sarvam.ai/blogs itself returns 403 to fetchers; UNVERIFIED: exact blog-post titles.)

**Healthcare is a named deployment vertical.** Public case-study material (techresearchonline
case study; voice-agent ecosystem posts) describes Sarvam deploying "voice-enabled, multilingual
conversational agents that allow rural patients to access medical advice ... through WhatsApp and
low-bandwidth interfaces", models "fine-tuned for medical reasoning and symptom triage in local
languages", and a TTS brag that agents pronounce "Comprehensive Thyroid Profile with Anti-TPO
Antibodies test" correctly. Acceleration cited "for the government and enterprises in banking,
financial services, insurance and healthcare". A medicine-safety voice app is squarely inside
their own showcase narrative. (These are secondary/ecosystem sources quoting Sarvam material;
UNVERIFIED: exact first-party blog URL. Safe to SAY in a pitch, do not attribute a verbatim quote
to sarvam.ai without showing the source.)

**Code-mixing is a documented, first-party differentiator.** docs.sarvam.ai has a page literally
titled "Building for Indian Languages" (docs.sarvam.ai/api/getting-started/building-for-india)
acknowledging people mix English into every sentence.

### (a) Code-mix: WHICH API, exact params (all verified against docs.sarvam.ai)

| API | Code-mix support | Exact usage |
|---|---|---|
| STT `/speech-to-text` | YES, output mode | `model=saaras:v3`, form field `mode=codemix` (enum: `transcribe`\|`translate`\|`verbatim`\|`translit`\|`codemix`). saaras:v3 also handles code-mixed AUDIO in all modes. |
| Translate `/translate` | YES, but **mayura:v1 ONLY** | `"mode": "code-mixed"` (enum: `formal`\|`modern-colloquial`\|`classic-colloquial`\|`code-mixed`, default `formal`). **sarvam-translate:v1 supports ONLY `formal`** and rejects the rest. mayura:v1 caps at 1000 chars, 11 languages. Source: docs.sarvam.ai/api-reference/text/translate-text |
| TTS `/text-to-speech` | YES, native | Doc states verbatim: "Supports code-mixed text (English and Indic languages)". bulbul:v3 normalizes English words/numerals automatically (`enable_preprocessing` is a v2 knob; v3 auto-enables it). Source: docs.sarvam.ai/api-reference/text-to-speech/convert |
| Chat `sarvam-105b` | Implicit | Trained on 22 Indian languages; no dedicated code-mix param. Just send Hinglish. |

**Verdict: code-mix is REAL, not marketing.** Demo utterance "Dolo 650 safe hai kya?" is fully
supported end to end: saaras:v3 `mode=codemix` transcribes it, sarvam-105b reasons over it,
bulbul:v3 speaks a Hinglish verdict natively.

### (b) bulbul:v3 speaker-language matrix (verified)

Source: docs.sarvam.ai/api-reference-docs/api-guides-tutorials/text-to-speech/how-to/change-the-speaker-voice

All 37 speakers ACCEPT any of the 11 languages (the API will not 400 on the pairing), but the doc
says explicitly: "Not all speakers perform equally across all languages" and publishes a
per-language recommendation table. Use these for the demo:

| Language | Male | Female | Pick for demo |
|---|---|---|---|
| `hi-IN` | shubh, ashutosh | **priya**, suhani | `priya` (Tier-1 CER 0.13%) |
| `kn-IN` | shubh, ratan | neha, **ishita** | `ishita` (Tier-1 CER 0.13%) |
| `ta-IN` | ratan, rohan | **ishita**, ritu | `ishita` |
| `te-IN` | shubh, ratan | neha, **priya** | `priya` |

Tier-1 (lowest critical error rate): `mani` (0.00%), `priya` (0.13%), `ishita` (0.13%).
Trap: `varun` has a low CER but the doc reserves him for "thriller, drama, or suspense" content
(deep villain voice). Do NOT use varun for a medicine safety card.
Nice property: `priya` + `ishita` cover all four demo languages between them, both Tier-1.

### (c) Healthcare/civic quotes for the pitch

Safe formulations (paraphrase of their public positioning, not fabricated quotes):
- "Sarvam publicly deploys multilingual voice agents in healthcare, for rural patients over
  low-bandwidth channels, with models tuned for medical triage in local languages. Davaa Sach is
  exactly that shape: a medicine-safety agent for Bharat."
- "Every AI call in this app runs on models trained in India under the IndiaAI Mission."

---

## ANAKIN.IO: what they publicly brag about

Founded 2021, YC-backed, founders Rashmi Bala + Mohit Prateek (CEO), offices Austin + **Bengaluru**
(the hackathon is in their own city; say "built this on Wire a floor away from where Wire is built"
only if the venue actually is their office). Products: **Wire** (the flagship), URL Scraper, Crawl,
Search API, Agentic Research, Browser API, Map, Browser Sessions, Zero Touch.

Pride numbers, all from anakin.io / anakin.io/products/wire (fetched today):
- **"470x cheaper per call than browser agents ($0.001 vs $0.47)"**
- **962 sites, 5,255 actions** in the Wire catalog (homepage rounds to 940+/4,500+)
- **"Zero token waste ... no raw HTML ever reaches your model"** (structured JSON, typed schemas)
- <312ms p99 latency, 99.95% uptime (90d), 1T+ data points, SOC 2 Type II + ISO 27001
- 300 free credits, no card; page claims **read-only Wire actions need no signup** (worth testing
  before keys arrive)
- Long tail on request: "Tell us the site and the action ... usually ships within days"

### Wire catalog: Indian pharma verdict (catalog is PUBLIC, no key needed, anakin.io/catalog)

**NO Indian pharmacy sites.** 1mg / Tata 1mg, PharmEasy, Netmeds, Apollo, Truemeds, MedPlus: all
absent. No cdsco.gov.in either. But two directly usable Indian commerce sites EXIST:

| Site | Slug | Actions | The ones we need |
|---|---|---|---|
| Amazon India | `amzn-in` | 13 | `act_amzn_in_search_results_ssr` (params: `search_query`, optional `rh_filter`, `sort_order`; returns titles + INR prices + ratings; 2 credits/call). Also `act_amzn_in_product_detail_ssr` (by `asin`, 1 credit) and `act_amzn_in_product_collection_api` (batch ASINs, 2 credits). |
| Blinkit | `blinkit` | 9 | `act_blinkit_post_layout_search` (keyword search, returns product snippets + prices). `bli_product_details` / `act_blinkit_post_product_detail` for detail+price. |

Amazon.in sells OTC medicines (Dolo 650 etc.), Blinkit delivers them in minutes: both work for the
generic-vs-brand price comparison. Government/Legal category (53 sites) already includes Indian
government sites **RBI (`rbi`, 11 actions)** and **SEBI (`sebi`, 15 actions)**, so "Indian gov site
in Wire" is precedented; CDSCO is a natural catalog request.

For CDSCO alert data itself: use Anakin **Search API / URL Scraper / Crawl** (their other products)
against cdsco.gov.in, not Wire. Endpoints to hit the moment keys arrive:
`GET /v1/wire/catalog`, `GET /v1/wire/search?q=pharmacy` (confirm nothing shipped since this memo),
then `POST /v1/wire/task` with the action id, poll `GET /v1/wire/jobs/{id}`.

---

## INTERSECTION PLAYBOOK: 5 cheap, concrete plays

1. **Submission form, "Where you used Sarvam" field, paste this:** "Full Sarvam stack, 4 APIs:
   saaras:v3 STT with mode=codemix for Hinglish/Kanglish voice input; sarvam-105b (the IndiaAI
   Mission flagship) for the safety verdict reasoning over live CDSCO data; bulbul:v3 TTS speaking
   the verdict back using Sarvam's own per-language Tier-1 speakers (priya for hi/te, ishita for
   kn/ta); mayura:v1 translate with mode=code-mixed for the card text."

2. **Open the demo with the code-mixed utterance:** speak "Dolo 650 safe hai kya?" into the mic
   and say the words "code-mixed" out loud while it transcribes. It is a documented first-party
   differentiator (their docs have a whole Building-for-Indian-Languages page); judges from Sarvam
   know most teams never find `mode=codemix`.

3. **Sovereign-AI pitch line (one sentence, use verbatim):** "Every model in this pipeline is
   trained in India under the IndiaAI Mission, so a medicine-safety check for Bharat runs on
   sovereign AI end to end." Then one clause on their healthcare deployments: "Sarvam already
   ships voice agents for rural healthcare; we point that same stack at counterfeit and
   substandard medicines."

4. **Do the price comparison through Wire and quote their own numbers:** call
   `amzn-in / act_amzn_in_search_results_ssr` with the medicine name, show branded vs generic INR
   prices, and say "structured JSON through Anakin Wire: $0.001 a call instead of $0.47 for a
   browser agent, no raw HTML ever touched our model." Add Blinkit
   (`act_blinkit_post_layout_search`) as "and it can be at your door in 10 minutes."

5. **Turn the catalog gap into a compliment:** in the submission notes write "cdsco.gov.in and
   Tata 1mg are our first Wire catalog requests; Anakin ships long-tail sites in days, and RBI/SEBI
   show Indian gov sites already work in Wire. Until then we run CDSCO through Anakin Search +
   URL Scraper." Shows you know their whole product line, not just one endpoint.

Bonus demo insurance: the claim "read-only Wire actions need no signup" is on their Wire page;
test it before keys arrive, and keep a cached CDSCO JSON + one cached Amazon response as fallback
so the verdict card never blanks on stage.
