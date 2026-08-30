# 💊 Davaa Sach

Speak a medicine name in **Kannada, Hindi, Telugu or Tamil** — hear, in your own language, whether India's drug regulator (CDSCO) flagged it as **Not-of-Standard-Quality or spurious** this month, plus what it costs online right now.

Half of India can't read the regulator's English PDF alerts. Every month CDSCO flags real medicines as substandard or fake. The answer isn't in any model's weights — it's on the live web, in a language the user can't read. That's why both sponsor APIs are load-bearing, not decoration.

## How it works
`🎤 voice (code-mixed: "Dolo 650 safe hai kya?")` → **Sarvam saaras:v3** STT (`mode=codemix`) → **sarvam-105b** extracts the drug name → **Anakin Search** (this month's CDSCO alerts) + **Anakin URL Scraper** (cdsco.gov.in alerts index) + **Anakin Wire** (`amzn-in` typed action, live INR prices) → **sarvam-105b** strict-JSON verdict → **sarvam-translate** → **bulbul:v3** TTS → red/green verdict card, spoken aloud.

## Run
```
cd app
cp .env.example .env   # add SARVAM_API_KEY + ANAKIN_API_KEY
npm install
node server.js         # http://localhost:3000
```
Try: tap 🎤 and say "Dolo 650 safe hai kya?" — or click an example chip.

## Sponsor usage
- **Sarvam.ai (4 APIs):** saaras:v3 STT w/ code-mix · sarvam-105b reasoning · sarvam-translate:v1 · bulbul:v3 TTS (per-language speakers)
- **Anakin.io (3 surfaces):** Search API · URL Scraper (CDSCO) · Wire typed action for live prices

## Limitations
Regulatory-alert lookup, not medical advice. CDSCO batch-level PDFs sit behind POST forms — we cite the alert index + live search. Wire has no Indian pharmacy yet (Amazon.in proxy; 1mg requested).

Built in 90 minutes at the AI Engineer Mixer, Bengaluru (2026-08-30).
