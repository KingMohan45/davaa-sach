# Davaa Sach · दवा सच · ಔಷಧಿ ಸತ್ಯ

**Speak a medicine name, or your symptoms, in your own Indian language. Get an answer read from
this month's regulator data, spoken back to you.**

Verdicts in **Kannada, Hindi, Telugu, Tamil and English**. The consultation and interpreter modes
cross **eleven** Indian languages, adding **Punjabi**, Bengali, Marathi, Gujarati, Malayalam and Odia.

Built at the AI Engineer Mixer, Bangalore, 2026-08-30, on Sarvam.ai and Anakin.io.

India's drug regulator publishes its Not-of-Standard-Quality and spurious-drug list every month, as
English PDFs and HTML tables. The people most at risk from a fake medicine cannot read them. A drug
restricted in Europe for liver injury can still be ordinary practice on an Indian prescription pad.
And in any Indian hospital, the patient and the doctor frequently do not share a language.

Same engine, five questions.

---

## What it does

| | Who | Question | Live proof |
|---|---|---|---|
| **1** | Patient | Is this medicine flagged? | `Telma 40` → **FLAGGED**, live CDSCO spurious alert, corroborated by a May 2025 quality-surveillance report. `Dolo 650` → **CLEAR**. |
| **2** | Doctor | Second-read what I am about to prescribe | *"AFib patient, Warfarin 5 mg and also Aspirin 150"* → **STOP**, `high` interaction citing the **FDA boxed warning**. Individually fine drugs; the decision is the hazard. |
| **3** | Patient | Here is what I feel | Generic classes approved for the complaint, an urgency, and the questions to ask. Never a prescription, never a dose. |
| **4** | Clinic | We do not share a language | Hindi patient → Kannada doctor in **2.7s**, plus a structured complaint with red flags. |
| **5** | Clinic | Live consultation room | Both parties keep talking. Running transcript with auto language detection, and a consultation note that re-reads the whole conversation on every patient turn. |

**Use case 2 catches two genuinely different failures.** A drug that is dangerous *in combination*
(warfarin + aspirin), and a drug that is legal here but restricted abroad — *"Nimesulide restricted
in Europe (EMA referral, hepatotoxicity); never US-approved; CDSCO-banned under 12 in India."*

**Use case 5 accumulates.** Turn one: *"abdominal pain with vomiting"* → antiemetic, analgesic.
Turn two adds fever and blood in the vomit: the note rewrites itself to *"severe abdominal pain with
hematemesis"*, red-flags both, swaps the candidates to antiemetic (*avoid if perforation suspected*),
antipyretic and IV fluids, and starts asking about NSAID use, ulcers and melena.

---

## Why these two sponsors are load-bearing, not decorative

**Remove Anakin and there is no answer at all.** The facts are this month's — a model cannot have
them in its weights, and the reasoning layer is never asked to recall a drug fact, only to read one.

**Remove Sarvam and there is no user.** The person who needs this most speaks Kannada or Bhojpuri,
may not read at all, and asks in code-mixed speech: *"Dolo 650 safe hai kya?"* — English drug name
inside a Hindi question.

---

## Tech stack

**Runtime** — Node 26, Express, ESM. Two dependencies: `express` and `dotenv`. Native `fetch`,
`FormData`, `Blob`. No build step, no framework, no database.

**Frontend** — one `index.html`. Vanilla JS, Three.js molecular lattice (guarded, the page works
fully if the CDN is blocked), `MediaRecorder` for voice, `AudioContext` analyser for the live
waveform. Five tabs, each with a pipeline strip whose final state is read from the server's own
`degraded[]` array rather than from a timer.

**Evidence — Anakin.io, seven surfaces**

| Surface | Fetches |
|---|---|
| `url-scraper` | `cdsco.gov.in` alerts index |
| `url-scraper` | WHO falsified-medicine alert index (39,936 chars, 780 alert terms) |
| `url-scraper` | openFDA `drug/label` JSON |
| `url-scraper` | openFDA `drug/enforcement` JSON |
| `search` | CDSCO NSQ / spurious, per drug |
| `search` | bans and suspensions by any national regulator, per drug |
| `wire` | `tmg_search` on the **Tata 1mg** catalog |

Every external byte enters through Anakin, including the JSON APIs. We run no scraper of our own:
no headless browser, no CSS selectors, nothing to repair when a regulator redesigns their site.

**Language and reasoning — Sarvam.ai, six APIs**

| API | Role |
|---|---|
| `saaras:v3` `mode=codemix` | speech in, the way people actually speak |
| `sarvam-105b` | reads evidence into a verdict |
| `sarvam-105b-conversations` | the latency-sensitive paths |
| `sarvam-translate:v1` | eleven Indian languages, indic to indic via an English pivot |
| `/transliterate` | romanized input to native script, load-bearing (see below) |
| `bulbul:v3` | speaks the answer, because the person who needs this may not read |

---

## Three bugs worth knowing about

Each was invisible in code review and only appeared when the thing was actually driven.

**`"Warfarin 5 mg"` returns 0 openFDA results. `"Warfarin"` returns 75.** The strength suffix broke
the lookup, so the audit reported *"no US label found"* — and that false absence outranked a real
bleeding-risk interaction in the verdict. Absence of evidence had become evidence of safety.
`drugStem()` strips strength, unit and form, and a missing label is now explicitly a weak signal
that can never become the headline.

**`sarvam-translate:v1` needs native script.** Romanized Hindi is out of distribution:
*"Do din se pet me tez dard hai"* (stomach) translated to **"terrible chest infection"**, and the
consultation note faithfully recorded a chest infection. The same sentence in Devanagari gives
*"severe stomach pain"*. Voice input was always fine because `saaras:v3` returns native script;
typed input was not. Every text path now transliterates first.

**A `const` declared below its use site is a TDZ `ReferenceError`** that kills every statement after
it while leaving hoisted `function` declarations defined. The symptom was empty `<select>` elements
and an unbound button, with a completely clean console.

---

## Performance

Measured, not estimated. The stages were instrumented before anything was optimized.

| Path | Before | After |
|---|---|---|
| `/api/check`, cold | 50–80s | **9.4s** |
| `/api/check`, cached | — | **0.024s** |
| `/api/prescription` | 97s | **13.8s** |
| `/api/interpret` | ~7s | **2.7s** |
| Anakin scrape | 1.0–3.6s internal, 2.5–4.6s wall | unchanged |

Instrumenting showed a single `sarvam-105b` call was **87% of total time** (54.2s of 62.5s). An A/B
on the real payload gave `sarvam-105b` 43.5s / 3,217 completion tokens versus
`sarvam-105b-conversations` **7.8s / 126 tokens**, for the *same verdict* — the reasoning budget was
going almost entirely into `reasoning_content` that we discard. The rest came from running the
output chain and the clinical read concurrently instead of in sequence.

**Anakin was never the bottleneck.**

---

## Honesty properties

- If a source is unreachable the answer degrades to **"unchecked, not a clean bill"**, never to a
  green tick, and **a degraded answer is never cached**. An unavailable answer is never presented as
  a safe one.
- The UI reports which legs degraded, from the server's own `degraded[]`, so a failed leg shows as
  failed instead of quietly finishing green.
- Use case 3 never prescribes, never gives a dose, and escalates to `emergency` for cardiac, stroke,
  breathing, bleeding, or an infant with high fever.
- Use case 2 is a second reader. It surfaces what regulators and labels say; the prescribing
  decision stays the clinician's.
- WHO alert lines are matched by **exact substring**, deliberately not embeddings. A fuzzy vector
  match on a drug name is a wrong answer in a safety product, and a substring hit is its own citation.

---

## Run it

```
cd app && npm install && node server.js     # http://localhost:3000
```

`app/.env` needs `SARVAM_API_KEY` and `ANAKIN_API_KEY`. Keys stay server-side and never reach the
browser; `GET /api/health` reports which are loaded.

## Read more

- **[`app/README.md`](app/README.md)** — every source with the measurement behind it, including the
  seven regulator pages we probed and **rejected**, so nobody re-probes them. Endpoint contracts,
  storage model, latency table.
- **[`research/use-cases.md`](research/use-cases.md)** — the four use cases in depth, plus the
  cross-border case: an Indian doctor prescribing to a foreign patient who then has to fill it at home.
- **[`research/`](research/)** — ideation, the sponsor-intersection analysis, judging research.

Not medical advice. Always confirm with a pharmacist or doctor.
