## 5. Bill Sach — pharmacy-bill overcharge checker

**One-line pitch.** Photograph your pharmacy bill, hear in your language exactly which line items were billed above the government ceiling price.

**The user.** Anyone discharged from a private hospital in Bengaluru holding a five-page itemised bill.

**Live source.** `https://nppa.gov.in/` — **VERIFIED REACHABLE**, HTTP 200, 176 KB real HTML.

**Sarvam.** This is the strongest *document-AI* showcase on the list — OCR/parse the bill, then TTS the finding. **Anakin.** Live ceiling-price + current retail lookup per line item.

**Build risk: HIGH** in 90 minutes — bill OCR plus per-line-item matching plus price lookup is three hard things. **Best used as the stretch feature of idea #1, not as a standalone build.**

---

(Extracted from research/ideation.md — shortlist rationale + kill list live there.)
