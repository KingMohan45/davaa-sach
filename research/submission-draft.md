# Submission form draft — Davaa Sach (paste-ready, edit team names)

**Project name:** Davaa Sach (दवा सच / ಔಷಧಿ ಸತ್ಯ)

**Team members:** Mohan Kumar R, Ashish Kumar, Joshua Premkumar, Anil Dandina

**One-sentence pitch:** Speak a medicine name in Kannada, Hindi, Telugu, Tamil or English and hear, in your own language, whether India's drug regulator flagged it as Not-of-Standard-Quality or spurious this month — plus what it costs on Tata 1mg right now.

**Demo:** local — `cd app && node server.js` → http://localhost:3000 (keys in .env). No deploy needed per event doc.

**Idea chosen/remixed/created:** Created. The user physically cannot read the source (English CDSCO regulatory tables and PDFs) and the answer cannot be in any model's weights (this month's NSQ list). Both sponsors are structurally load-bearing, not decorative.

**Where we used Sarvam.ai (4 APIs):**
- `saaras:v3` speech-to-text with `mode=codemix` — handles genuinely code-mixed queries like "Dolo 650 safe hai kya?", where the drug name is English and the question is not. Verified live: 0.947 confidence, auto language detection.
- `sarvam-105b` — turns live regulator evidence into a strict-JSON red/green/amber verdict that must cite which source it used.
- `sarvam-translate:v1` — the verdict into kn/hi/te/ta.
- `bulbul:v3` TTS with per-language speakers (ishita for kn/ta, priya for hi/te/en). All five language and speaker pairs verified live returning real audio.

Remove Sarvam and the user cannot ask, cannot read the answer, and cannot hear it. Dead product.

**Where we used Anakin.io (3 surfaces):**
- **Search API** — live `"<drug>" CDSCO NSQ alert` lookup. Returns this month's alert pages, which are not in any model's training data.
- **URL Scraper** — `cdsco.gov.in/.../Alerts/` scraped to markdown and fed to the model as regulator-of-record evidence. The verdict quotes it: *"CDSCO NSQ Alerts page lists 9 alerts from Aug 2025 onward; none name Dolo 650."*
- **Wire** — `tmg_search` on the **Tata 1mg** catalog (India's largest online pharmacy), a typed action returning structured JSON for live INR pharmacy listings. Two credits, no raw HTML anywhere near the model, no scraper to maintain when 1mg reships their frontend.

Remove Anakin and there is no live regulator data and no price. Dead product.

**What the judges will see:** the UI shows a **live pipeline strip** naming which sponsor API is executing at each moment (saaras → Anakin search+Wire → 105b → bulbul), and its final state is read from the server's own `degraded[]` field, so a failed leg reports as failed rather than quietly finishing green.

**Example input for judges — show BOTH verdicts, that is the point:**
- `Telma 40` -> **FLAGGED (red)**. Live CDSCO spurious-drug alert, corroborated by The South First's May 2025 quality-surveillance report. This is a real counterfeit, found live, not a seeded example.
- `Dolo 650` -> **CLEAR (green)**. "CDSCO NSQ Alerts page lists 9 alerts from Aug 2025 onward; none name Dolo 650."

Showing both proves the system discriminates rather than rubber-stamping. Then tap the mic and say "Dolo 650 safe hai kya?" for the code-mixed path.

**Limitations (stated honestly):**
- CDSCO batch-level PDFs sit behind `this.form.submit()` POST forms, so we cite the alert index and live search hits, not individual batch numbers.
- This is a regulatory-alert lookup, not medical advice, and the UI says so.
- The verdict is model-mediated: it can answer "could not confirm" when the evidence is thin, and it does, rather than guessing "safe".
- Our first Wire catalog request is cdsco.gov.in itself, so the regulator becomes a typed action rather than a scrape.

---

# 2-minute demo script

1. **(10s)** "Every month India's drug regulator flags real medicines as substandard or fake. It publishes that list as English PDFs. Half the country cannot read it. Davaa Sach: speak the medicine, hear the truth."
2. **(30s)** Tap mic, say **"Dolo 650 safe hai kya?"** Call out *code-mixed* explicitly — English drug name inside a Hindi question, which is Sarvam's documented differentiator. Watch the pipeline strip light up saaras → Anakin → 105b → bulbul.
3. **(40s)** Type `Telma 40` first -> the card lands RED, citing a live CDSCO spurious alert for a real medicine. Then `Dolo 650` -> green. Verdict card lands. Reason cites the live CDSCO alerts page and counts the alerts it read. Kannada line below it. Voice plays via bulbul:v3. Source chips are live cdsco.gov.in links — click one.
4. **(20s)** Price line: "live Tata 1mg pharmacy listings through Anakin Wire — a typed action, structured JSON, two credits, and no HTML ever reaches the model."
5. **(20s)** Close: "Every model in this pipeline is Indian, built under the IndiaAI Mission. The data is regulator data no model has in its weights. Remove either sponsor and the product is dead."

**If the mic mis-hears the drug name** (an event room is loud), type it and hit Check. Both paths hit the identical `/api/check`, and typed input is the safer live demo.

# Judge Q&A ammo

- **Architecture:** browser mic → webm → `saaras:v3` codemix → a `sarvam-105b` pass that extracts the Latin drug name (codemix STT returns native script: "Dolo 650" comes back as "डोलो छः सौ पचास", which would silently break an English web search) → parallel Anakin search + CDSCO scrape + Wire `tmg_search` → `sarvam-105b` strict-JSON verdict → `sarvam-translate:v1` → `bulbul:v3` → verdict card + audio. Keys never leave the server.
- **Speed:** cold answer ~50s (a scrape, a Wire job and three Sarvam calls), cached answer **0.035s** — measured, a 1400x gap. Every external call is disk-cached, which also protects the 300-credit budget.
- **Failure behaviour:** if a leg is unreachable the answer degrades to "unchecked — not a clean bill" rather than a green tick, and never gets cached. An unavailable answer is never presented as a safe one.
- **Why Wire and not a scraper:** 1mg is a React storefront. Wire gives a typed action with named parameters (`query`, `city`, `per_page`) that survives their next redeploy.
- **Next steps:** cdsco.gov.in as a Wire catalog action, a WhatsApp voice-note bot for people who will never open a web app, and batch-number OCR from a strip photo via Sarvam Doc AI.
