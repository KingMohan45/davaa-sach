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

(Extracted from research/ideation.md — shortlist rationale + kill list live there.)
