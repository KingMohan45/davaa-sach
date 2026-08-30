---
name: sarvam-ai
description: Invoke for ANY Sarvam.ai API call - Indian-language speech-to-text (saaras), text-to-speech (bulbul), translation (mayura/sarvam-translate), transliteration, chat/reasoning (sarvam-105b), or Document AI. Carries the exact auth header, base URL, endpoint paths, model + speaker ids, payload/response field names, language codes, audio format limits, rate limits and the first-20-minutes gotchas so none of it is re-derived.
---

# Sarvam.ai API - hackathon reference

Verified against the live docs on **2026-08-30**. Every non-obvious claim cites the page it came from.
Anything I could not pin to a doc page is prefixed `UNVERIFIED:` - do not treat those as fact.

> **The docs moved in mid-2026.** `saarika`, `mayura`-only, and `sarvam-m` are legacy/deprecated.
> Current defaults are `saaras:v3` (STT), `bulbul:v3` (TTS), `sarvam-105b` (chat).
> Source: https://docs.sarvam.ai/api-reference-docs/changelog

---

## 1. Auth - get this right first

**Base URL: `https://api.sarvam.ai`**

```
api-subscription-key: <YOUR_SARVAM_API_KEY>
```

- The header is `api-subscription-key`, **not** `Authorization`. This is the single most common 403.
  (https://docs.sarvam.ai/api/getting-started/quickstart, https://docs.sarvam.ai/api-reference-docs/authentication)
- `Authorization: Bearer <key>` **is also accepted**, and is the one to use when pointing OpenAI-compatible
  tooling at `https://api.sarvam.ai/v1`. The docs still recommend `api-subscription-key` as the primary form.
  (https://docs.sarvam.ai/api-reference-docs/authentication)
- **Auth failure returns `403 Forbidden`, not `401`.** Body carries `error.code`, e.g. `invalid_api_key_error`.
  If you are looking for a 401 in your error handling you will never catch it.
- Env var convention: **`SARVAM_API_KEY`**. Both SDKs read it if you do not pass the key explicitly.
  (https://docs.sarvam.ai/api/getting-started/sdks)

**Key creation:** https://dashboard.sarvam.ai → API Keys. Also referenced: `https://indus.sarvam.ai/key-management`
(URL noted per request; flow not fetched - `UNVERIFIED:` whether that path is the current console).
**The key is shown exactly once at creation.** Copy it immediately; it cannot be retrieved later, only deleted and regenerated.

**Free credits: ₹100 on signup, never expire, usable across every API.**
(https://docs.sarvam.ai/api/getting-started/ratelimits - note: reduced from ₹1,000 in May 2026 per the changelog.)

---

## 2. Endpoint table

| Method | Path | Content-Type | What it does |
|---|---|---|---|
| POST | `/speech-to-text` | `multipart/form-data` | Transcribe audio (saaras). REST is sync, **audio must be < 30 s**. |
| POST | `/speech-to-text-translate` | `multipart/form-data` | Indic audio → **English** text. Legacy (`saaras:v2.5`); prefer `/speech-to-text` with `mode=translate`. |
| POST | `/text-to-speech` | `application/json` | Text → **base64 audio** (bulbul). |
| POST | `/translate` | `application/json` | Text → text across 23 languages. |
| POST | `/transliterate` | `application/json` | Script conversion (e.g. `namaste` → `नमस्ते`). |
| POST | `/v1/chat/completions` | `application/json` | Chat / reasoning (`sarvam-105b`). OpenAI-shaped. |
| POST | `/v2/chat/completions` | `application/json` | Open-source models (GLM-5.2, Gemma 4 31B), beta, Aug 2026. |
| POST | `/doc-ai/v1/job/digitise` | `multipart/form-data` | Full-document OCR → md / html / json. **Async job.** |
| POST | `/doc-ai/v1/job/extract` | `multipart/form-data` | Schema-driven key-value extraction. **Async job.** |
| GET | `/doc-ai/v1/job/{job_id}/status` | - | Poll a Doc AI job. |
| GET | `/doc-ai/v1/job/{job_id}/download-url` | - | Fetch digitise output. |
| GET | `/doc-ai/v1/job/{job_id}/results` | - | Fetch extract output. |
| GET | `/speech-to-text/job/v1/{job_id}/status` | - | Poll a **batch** STT job (files up to 2 h, ≤ 20 files/job). |

Doc AI paths + fields: https://docs.sarvam.ai/api-reference-docs/document-intelligence
Batch STT status path: https://docs.sarvam.ai/api-reference-docs/speech-to-text/stt/job/status

`UNVERIFIED:` the batch-STT **initiate/upload/start/download** paths. The docs list them under
`/api-reference/speech-to-text/stt/job/initiate` but I did not fetch the page - read it before using batch.
`UNVERIFIED:` a language-detection endpoint exists (docs link `api-reference/text/identify-language.md`) but the
path on `api.sarvam.ai` was not confirmed. **For a 90-minute build, do not use batch or language-detection.**

**WebSocket streaming** exists for both STT (`saaras:v3-realtime`) and TTS. Out of scope for a 90-minute build -
use REST. (https://docs.sarvam.ai/api/api-guides-tutorials/speech-to-text/overview)

---

## 3. Models - exact ids

### Speech-to-text
| id | Notes |
|---|---|
| `saaras:v3` | **Default and recommended.** 23 languages (22 Indian + English). Supports `mode`. |
| `saaras:v4` | Added July 2026, adds "Global English". |
| `saaras:v3-realtime` | WebSocket streaming only. |
| `saaras:v2.5` | Default for the legacy `/speech-to-text-translate` endpoint. |
| `saarika:v2.5` | **Legacy/deprecated.** Migrate to `saaras:v3`. |

`mode` (saaras:v3 only): `transcribe` | `translate` | `verbatim` | `translit` | `codemix`.

### Text-to-speech
| id | Notes |
|---|---|
| `bulbul:v3` | **Current/stable** (promoted from beta Feb 2026). Default speaker `shubh`. 2500-char limit. |
| `bulbul:v2` | Still accepted. Default speaker `anushka`. 1500-char limit. |
| `bulbul:v1` | Deprecated 2025-04-30. Do not use. |

### Translation
| id | Notes |
|---|---|
| `sarvam-translate:v1` | **Recommended.** All 23 languages. 2000-char input limit. |
| `mayura:v1` | 11 languages. 1000-char input limit. **Only model that accepts `source_language_code: "auto"`.** |

### Chat / LLM
| id | Notes |
|---|---|
| `sarvam-105b` | Flagship, 128K context, reasoning + agentic. |
| `sarvam-105b-conversations` | Tuned for real-time conversational workloads. |
| `sarvam-m`, `sarvam-30b` | **Deprecated and actively rejected** by the API (June/July 2026). |
| `GLM-5.2`, `Gemma 4 31B` | Open-source, beta, via `/v2/chat/completions`. `UNVERIFIED:` exact id strings. |

### Document AI
`Sarvam Vision` - 3B VLM, 23 languages. Driven by the `/doc-ai/v1/job/*` endpoints, not by a `model` field.

Source for the model inventory: https://docs.sarvam.ai/api/getting-started/models

---

## 4. Speakers - the classic 400

Speaker names are **lowercase and case-sensitive**, and are **not interchangeable across model versions**.
A `bulbul:v2` speaker sent with `model: "bulbul:v3"` is a 400.

### `bulbul:v3` - 37 speakers (default: `shubh`)
**Male (23):** `shubh` `aditya` `rahul` `rohan` `amit` `dev` `ratan` `varun` `manan` `sumit` `kabir` `aayan` `ashutosh` `advait` `anand` `tarun` `sunny` `mani` `gokul` `vijay` `mohit` `rehan` `soham`

**Female (14):** `ritu` `priya` `neha` `pooja` `simran` `kavya` `ishita` `shreya` `roopa` `tanya` `shruti` `suhani` `kavitha` `rupali`

Docs rank them by critical error rate - **Tier 1 (best): `mani` (M, 0.00%), `priya` (F, 0.13%), `ishita` (F, 0.13%)**.
`varun` has a low CER but is Tier-2 **special-use**: the docs describe a "deep, dramatic villain/suspense character"
to be "reserved exclusively for thriller, drama, or suspense content" - do NOT pick varun for a normal app voice.
Safe defaults for a demo: `anushka`-equivalent female → `priya`; male → `shubh` (the default) or `mani`.
(https://docs.sarvam.ai/api-reference-docs/api-guides-tutorials/text-to-speech/how-to/change-the-speaker-voice)

### `bulbul:v2` - default `anushka`
**Female:** `anushka` `manisha` `vidya` `arya` - **Male:** `abhilash` `karun` `hitesh`

`UNVERIFIED:` the TTS reference page says v2 has **9** voices while the community/plugin docs consistently list
these **7**. If you need a v2 voice outside these 7, read the reference page rather than guessing.

---

## 5. Language codes

Note **`od-IN` for Odia, not `or-IN`** - that one costs people ten minutes.

**11-language set** (TTS `bulbul:*`, `mayura:v1`, transliterate, `sarvam-105b`):
`hi-IN` `bn-IN` `gu-IN` `kn-IN` `ml-IN` `mr-IN` `od-IN` `pa-IN` `ta-IN` `te-IN` `en-IN`

**23-language set** (STT `saaras:v3`, `sarvam-translate:v1`, Sarvam Vision) - the 11 above **plus**:
`as-IN` `brx-IN` `doi-IN` `kok-IN` `ks-IN` `mai-IN` `mni-IN` `ne-IN` `sa-IN` `sat-IN` `sd-IN` `ur-IN`

**Auto-detection, per endpoint (these differ - do not assume):**
| Endpoint | Auto value | Allowed? |
|---|---|---|
| `/speech-to-text` | `language_code: "unknown"` | Yes. Response returns detected `language_code` + `language_probability`. |
| `/translate` | `source_language_code: "auto"` | **Only with `mayura:v1`.** Sending `auto` with `sarvam-translate:v1` fails. |
| `/transliterate` | `source_language_code: "auto"` | Yes (listed in the enum). |
| `/text-to-speech` | - | No. `language_code` is required and explicit. |

Field naming is inconsistent across endpoints and this is a real source of 400s:
- `/text-to-speech` → **`language_code`** (verified against https://docs.sarvam.ai/api-reference/text-to-speech/convert)
- `/translate`, `/transliterate` → **`source_language_code` + `target_language_code`**
- `/speech-to-text` → **`language_code`** (form field)

---

## 6. Copy-paste snippets

House rule: single-line curl, no backslash continuations.

### Install
```
pip install sarvamai
npm install sarvamai
export SARVAM_API_KEY=sk_xxx
```

### 6.1 Speech-to-text (file → transcript)

**curl** (multipart; `file` is the form field):
```
curl -sS -X POST https://api.sarvam.ai/speech-to-text -H "api-subscription-key: $SARVAM_API_KEY" -F "file=@sample.wav" -F "model=saaras:v3" -F "language_code=unknown"
```
Response:
```json
{"request_id":"...","transcript":"...","language_code":"hi-IN","language_probability":0.98,"timestamps":null}
```

**Python:**
```python
import os
from sarvamai import SarvamAI

client = SarvamAI(api_subscription_key=os.environ["SARVAM_API_KEY"])
with open("sample.wav", "rb") as f:
    r = client.speech_to_text.transcribe(file=f, model="saaras:v3", language_code="unknown")
print(r.transcript, r.language_code)
```

**Node (raw fetch - no SDK needed, works on Node 18+):**
```js
import fs from "node:fs";
const fd = new FormData();
fd.append("file", new Blob([fs.readFileSync("sample.wav")]), "sample.wav");
fd.append("model", "saaras:v3");
fd.append("language_code", "unknown");
const r = await fetch("https://api.sarvam.ai/speech-to-text", { method: "POST", headers: { "api-subscription-key": process.env.SARVAM_API_KEY }, body: fd });
const j = await r.json();
console.log(j.transcript, j.language_code);
```
Do **not** set `Content-Type` manually on a `FormData` fetch - the boundary is generated for you and overriding it breaks the upload.

### 6.2 Text-to-speech (text → playable file)

**curl** (writes a wav; `.audios[0]` is base64):
```
curl -sS -X POST https://api.sarvam.ai/text-to-speech -H "api-subscription-key: $SARVAM_API_KEY" -H "Content-Type: application/json" -d '{"text":"नमस्ते, आप कैसे हैं?","language_code":"hi-IN","model":"bulbul:v3","speaker":"priya"}' | python3 -c "import sys,json,base64;open('out.wav','wb').write(base64.b64decode(json.load(sys.stdin)['audios'][0]))"
```

**Python:**
```python
import base64, os
from sarvamai import SarvamAI

client = SarvamAI(api_subscription_key=os.environ["SARVAM_API_KEY"])
r = client.text_to_speech.convert(text="नमस्ते, आप कैसे हैं?", language_code="hi-IN", model="bulbul:v3", speaker="priya")
open("out.wav", "wb").write(base64.b64decode("".join(r.audios)))
```

**Node (raw fetch):**
```js
const r = await fetch("https://api.sarvam.ai/text-to-speech", { method: "POST", headers: { "api-subscription-key": process.env.SARVAM_API_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ text: "नमस्ते, आप कैसे हैं?", language_code: "hi-IN", model: "bulbul:v3", speaker: "priya" }) });
const j = await r.json();
require("node:fs").writeFileSync("out.wav", Buffer.from(j.audios.join(""), "base64"));
```

### 6.3 Translate

**curl:**
```
curl -sS -X POST https://api.sarvam.ai/translate -H "api-subscription-key: $SARVAM_API_KEY" -H "Content-Type: application/json" -d '{"input":"Hello, how are you?","source_language_code":"en-IN","target_language_code":"ta-IN","model":"sarvam-translate:v1"}'
```
Response: `{"request_id":"...","translated_text":"...","source_language_code":"en-IN"}`

**Python:** `client.text.translate(input="Hello", source_language_code="en-IN", target_language_code="ta-IN", model="sarvam-translate:v1")`
**Node:** `await client.text.translate({ input: "Hello", source_language_code: "en-IN", target_language_code: "ta-IN", model: "sarvam-translate:v1" })`

### 6.4 Transliterate

```
curl -sS -X POST https://api.sarvam.ai/transliterate -H "api-subscription-key: $SARVAM_API_KEY" -H "Content-Type: application/json" -d '{"input":"namaste dost","source_language_code":"en-IN","target_language_code":"hi-IN"}'
```
Response: `{"request_id":"...","transliterated_text":"नमस्ते दोस्त","source_language_code":"en-IN"}`
Extra fields: `numerals_format` (`international`|`native`), `spoken_form` (bool), `spoken_form_numerals_language` (`english`|`native`).

### 6.5 Chat / LLM

**curl:**
```
curl -sS -X POST https://api.sarvam.ai/v1/chat/completions -H "api-subscription-key: $SARVAM_API_KEY" -H "Content-Type: application/json" -d '{"model":"sarvam-105b","messages":[{"role":"user","content":"Summarise this in Hindi: the train is delayed by two hours."}],"temperature":0.2,"max_tokens":512}'
```
Response is OpenAI-shaped: `.choices[0].message.content` (plus an optional `.message.reasoning_content`), `.usage.{prompt_tokens,completion_tokens,total_tokens}`.

**Python (Sarvam SDK):**
```python
r = client.chat.completions(model="sarvam-105b", messages=[{"role": "user", "content": "Say hi in one word"}])
print(r.choices[0].message.content)
```

**Node - reuse the OpenAI SDK** (fastest path if the team already knows it):
```js
import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.SARVAM_API_KEY, baseURL: "https://api.sarvam.ai/v1" });
const r = await client.chat.completions.create({ model: "sarvam-105b", messages: [{ role: "user", content: "Say hi in one word" }] });
console.log(r.choices[0].message.content);
```
The OpenAI SDK sends `Authorization: Bearer`, which Sarvam accepts. Useful extra params Sarvam adds:
`reasoning_effort` (`low`|`medium`|`high`, default `medium`) and `wiki_grounding` (bool).
The docs call it OpenAI-*shaped*, not a drop-in: expect model-name and response differences.

---

## 7. Audio formats, sizes, and turning a response into sound

### STT input (`/speech-to-text`, `/speech-to-text-translate`)
- **Transport:** `multipart/form-data`, field name `file`. Not base64 JSON.
- **Accepted:** WAV, MP3, AAC, AIFF, OGG, OPUS, FLAC, MP4/M4A, AMR, WMA, WebM, and raw PCM.
  Format is auto-detected **except PCM**, which needs `input_audio_codec` (`pcm_s16le` | `pcm_l16` | `pcm_raw`) **at 16 kHz only**.
- **Sample rate:** 16 kHz recommended. WebSocket streaming accepts only WAV/raw PCM at 16 kHz or 8 kHz.
- **Duration: REST is capped under 30 seconds.** Longer audio must go through the batch API (up to 2 hours, ≤ 20 files/job).
- **Max file size: `UNVERIFIED:` not stated on the REST reference page.** Doc AI's 200 MB cap does not apply here.

### TTS output (`/text-to-speech`)
- Response is **JSON with base64 audio**, not binary: `{"request_id": "...", "audios": ["<base64>"]}`.
  `audios` is an **array** - long text may split into chunks, so `join("")` before decoding.
- `output_audio_codec`: `wav` (default) | `mp3` | `linear16` | `mulaw` | `alaw` | `opus` | `flac` | `aac`.
- `speech_sample_rate`: `8000` | `16000` | `22050` | `24000` | `32000` | `44100` | `48000`. Default 24000 (v3), 22050 (v2).
- Text cap: **2500 chars (v3), 1500 chars (v2)**. Chunk longer text yourself and concatenate the audio.
- v2-only knobs: `pitch` (-0.75..0.75), `loudness` (0.3..3.0), `enable_preprocessing`. v3-only: `temperature` (0.01..2.0, default 0.6), `dict_id`.
- `pace`: **v3 `0.5-2.0`, v2 `0.3-3.0`** - a v2-legal `2.5` is a 400 on v3.

**Save to file - Python:** `open("out.wav","wb").write(base64.b64decode("".join(r["audios"])))`
**Save to file - Node:** `fs.writeFileSync("out.wav", Buffer.from(j.audios.join(""), "base64"))`

**Play in the browser** (given the base64 your server forwarded):
```js
// data URI - simplest
audioEl.src = "data:audio/wav;base64," + b64;
// or a Blob URL, better for big payloads
const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
audioEl.src = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
```
Match the MIME to `output_audio_codec` (`audio/wav`, `audio/mpeg` for mp3, `audio/ogg` for opus).

---

## 8. Rate limits, credits, timeouts

From https://docs.sarvam.ai/api/getting-started/ratelimits (Starter = pay-as-you-go, what a hackathon key is):

| API | Starter | Pro | Business |
|---|---|---|---|
| STT real-time REST | 60 req/min | 100 | 4,000 |
| STT WebSocket | 20 concurrent | 100 | 100 |
| STT batch | 20 req/min | 100 | 500 |
| TTS real-time REST | **60 req/min (30 for `bulbul:v3`)** | 200 | 1,000 |
| TTS WebSocket | 60 concurrent (30 for v3) | 200 | 1,000 |
| Translation | 60 req/min | 200 | 1,000 |
| Chat (default models) | 60 req/min | 200 | 1,000 |
| Chat `sarvam-105b` | **40 req/min** | 60 | 120 |
| Document Intelligence | **10 req/min (all plans)** | 10 | 10 |
| Vision real-time | 30 req/min (all plans) | 30 | 30 |

- Over the limit → **`429 Too Many Requests`**. Back off exponentially. WebSocket rejection uses close code `1003`.
- **`bulbul:v3` on Starter is 30 req/min - half the general TTS limit.** A demo that TTSs on every keystroke will 429.
- Free credits: **₹100**, non-expiring, shared across all APIs.
- **Request timeouts: not documented.** Set your own client timeout (30 s for REST STT/TTS is a sane starting point) - do not invent a documented value.
- Batch polling: poll no faster than your plan allows (≈ every 3 s on Starter's 20 req/min). The SDK's
  `wait_until_complete()` polls every 5 s. Webhooks are available via a `callback` param instead of polling.

---

## 9. GOTCHAS - the first 20 minutes

1. **`Authorization: Bearer` on a non-`/v1` endpoint.** `/text-to-speech`, `/translate`, `/speech-to-text` want
   `api-subscription-key: <key>`. Bearer is documented as accepted, but if you get a 403 on those paths, switch to
   `api-subscription-key` before debugging anything else.
2. **Auth failures are `403`, not `401`.** Your `if (res.status === 401)` branch will never fire.
3. **Invalid speaker → 400.** Speakers are lowercase, case-sensitive, and version-locked. `anushka` is v2-only;
   `shubh`/`priya`/`mani` are v3. Mixing them is the #1 TTS 400.
4. **`or-IN` is not a language code. Odia is `od-IN`.**
5. **`auto` is not universal.** `/translate` accepts `auto` **only for `mayura:v1`**; `/speech-to-text` uses the
   literal string **`unknown`**, not `auto`; `/text-to-speech` has no auto at all.
6. **Field name drift:** TTS uses `language_code`; translate/transliterate use `source_language_code` +
   `target_language_code`. Copying a field name across endpoints is a 400.
7. **TTS returns base64 JSON, not binary.** Writing `response.body` straight to `out.wav` gives you an unplayable
   file full of JSON. Decode `audios[0]` (or `audios.join("")`).
8. **REST STT rejects anything ≥ 30 s.** Trim/chunk client-side or move to batch. "It worked on my 8-second clip
   and broke on the real recording" is this.
9. **Wrong sample rate on PCM.** Raw PCM must be 16 kHz **and** carry `input_audio_codec`. Everything else is
   auto-detected - just send a wav/mp3 and stop tuning.
10. **CORS / browser calls: treat Sarvam as server-side only.** The docs say plainly "Never embed production keys
    in client-side widget code... Prefer server-side proxies for browser apps."
    (https://docs.sarvam.ai/api-reference-docs/authentication). Even if a preflight happened to pass, calling from
    browser JS ships your key to every visitor. **Build the proxy route in §10 - do not call `api.sarvam.ai` from
    the front-end.** `UNVERIFIED:` whether Sarvam sends permissive `Access-Control-Allow-Origin` headers; assume not.
11. **Payload too large.** TTS text > 2500 chars (v3) / 1500 (v2) → error. Doc AI: max **10 pages** per PDF/ZIP and
    **200 MB**. Chunk before sending.
12. **Don't set `Content-Type` on a multipart `fetch`.** Overriding it drops the boundary and the upload fails with
    a confusing 400/422.
13. **`sarvam-m` and `sarvam-30b` are actively rejected** by `/v1/chat/completions` (deprecated June/July 2026).
    Every blog post and tutorial older than mid-2026 uses `sarvam-m` - they are all wrong now. Use `sarvam-105b`.
14. **Doc AI is asynchronous.** `POST /doc-ai/v1/job/digitise` returns `{job_id, status}` - you must poll
    `/status` then hit `/download-url` or `/results`. There is no synchronous document endpoint, and Doc AI is
    rate-limited to **10 req/min on every plan**, so it is a poor fit for a live demo loop.
15. **`bulbul:v3` pace maxes at 2.0**, not v2's 3.0.
16. **Key is shown once.** Lose it and you regenerate, you do not recover it.

---

## 10. 90-MINUTE HACKATHON RECIPE

Minimum viable server-side pipeline: **audio or text in → Sarvam → text + playable audio out.**
Both routes below are one file, paste-and-run, and keep the key server-side (gotcha 10).

### Node - Express
```js
// npm i express multer   |   node >= 18   |   SARVAM_API_KEY in env
import express from "express";
import multer from "multer";

const KEY = process.env.SARVAM_API_KEY;
const H = { "api-subscription-key": KEY, "Content-Type": "application/json" };
const app = express();
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

async function sarvam(path, body) {
  const r = await fetch("https://api.sarvam.ai" + path, { method: "POST", headers: H, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(path + " " + r.status + " " + (await r.text()));
  return r.json();
}

// POST /voice  -> multipart field "audio" (optional) OR json {text, lang}
// returns { transcript, reply, audio_b64 }  (audio_b64 is base64 wav)
app.post("/voice", upload.single("audio"), async (req, res) => {
  try {
    const lang = (req.body && req.body.lang) || "hi-IN";
    let transcript = (req.body && req.body.text) || "";

    if (req.file) {
      const fd = new FormData();
      fd.append("file", new Blob([req.file.buffer]), req.file.originalname || "in.wav");
      fd.append("model", "saaras:v3");
      fd.append("language_code", "unknown");
      const sr = await fetch("https://api.sarvam.ai/speech-to-text", { method: "POST", headers: { "api-subscription-key": KEY }, body: fd });
      if (!sr.ok) throw new Error("stt " + sr.status + " " + (await sr.text()));
      transcript = (await sr.json()).transcript;
    }

    const chat = await sarvam("/v1/chat/completions", { model: "sarvam-105b", messages: [{ role: "user", content: transcript }], max_tokens: 300 });
    const reply = chat.choices[0].message.content;

    const speak = reply.slice(0, 2400); // bulbul:v3 caps at 2500 chars
    const tts = await sarvam("/text-to-speech", { text: speak, language_code: lang, model: "bulbul:v3", speaker: "priya" });

    res.json({ transcript, reply, audio_b64: tts.audios.join("") });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

app.listen(3000, () => console.log("http://localhost:3000/voice"));
```
Front-end plays it with: `audioEl.src = "data:audio/wav;base64," + json.audio_b64;`

### Python - FastAPI
```python
# pip install fastapi uvicorn python-multipart sarvamai   |   uvicorn app:app --reload
import os, base64
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form
from sarvamai import SarvamAI

client = SarvamAI(api_subscription_key=os.environ["SARVAM_API_KEY"])
app = FastAPI()

@app.post("/voice")
async def voice(audio: Optional[UploadFile] = File(None), text: str = Form(""), lang: str = Form("hi-IN")):
    transcript = text
    if audio is not None:
        stt = client.speech_to_text.transcribe(file=(audio.filename, await audio.read()), model="saaras:v3", language_code="unknown")
        transcript = stt.transcript

    chat = client.chat.completions(model="sarvam-105b", messages=[{"role": "user", "content": transcript}], max_tokens=300)
    reply = chat.choices[0].message.content

    tts = client.text_to_speech.convert(text=reply[:2400], language_code=lang, model="bulbul:v3", speaker="priya")
    return {"transcript": transcript, "reply": reply, "audio_b64": "".join(tts.audios)}
```

**Add translation in one line** anywhere in either route:
`client.text.translate(input=reply, source_language_code="auto", target_language_code=lang, model="mayura:v1")`
(`auto` requires `mayura:v1` - see gotcha 5).

**Demo-safety checklist:** clip audio under 30 s · speaker from the v3 list · `od-IN` not `or-IN` ·
throttle TTS (30 req/min on Starter) · key in env, never in the bundle.

---

## Sources
- https://docs.sarvam.ai/api/getting-started/quickstart
- https://docs.sarvam.ai/api/getting-started/sdks
- https://docs.sarvam.ai/api/getting-started/models
- https://docs.sarvam.ai/api/getting-started/ratelimits
- https://docs.sarvam.ai/api-reference-docs/authentication
- https://docs.sarvam.ai/api-reference/text-to-speech/convert
- https://docs.sarvam.ai/api-reference/speech-to-text/transcribe
- https://docs.sarvam.ai/api-reference/speech-to-text-translate/translate.md
- https://docs.sarvam.ai/api-reference/text/translate-text.md
- https://docs.sarvam.ai/api-reference/text/transliterate-text.md
- https://docs.sarvam.ai/api-reference/chat/chat-completions.md
- https://docs.sarvam.ai/api-reference-docs/models/bulbul
- https://docs.sarvam.ai/api-reference-docs/api-guides-tutorials/text-to-speech/how-to/change-the-speaker-voice
- https://docs.sarvam.ai/api-reference-docs/document-intelligence
- https://docs.sarvam.ai/api/api-guides-tutorials/speech-to-text/overview
- https://docs.sarvam.ai/api-reference-docs/changelog
- https://dashboard.sarvam.ai (key creation) · https://indus.sarvam.ai/key-management (URL noted, flow unverified)

---

## Code-mix + speaker-language matrix (verified 2026-08-30)

### Code-mix: real, in three APIs, three different spellings

| API | Param + exact value | Model constraint |
|---|---|---|
| `/speech-to-text` | form field `mode=codemix` (one word) | `saaras:v3` only. saaras:v3 also handles code-mixed AUDIO in every mode. |
| `/translate` | `"mode": "code-mixed"` (hyphenated) | **`mayura:v1` ONLY.** Full enum: `formal` \| `modern-colloquial` \| `classic-colloquial` \| `code-mixed`, default `formal`. **`sarvam-translate:v1` supports ONLY `formal`** and errors on the rest. (https://docs.sarvam.ai/api-reference/text/translate-text) |
| `/text-to-speech` | no param needed | Reference states verbatim: "Supports code-mixed text (English and Indic languages)". v3 normalizes English words/numerals automatically; on v2 set `enable_preprocessing: true` (v3 rejects/ignores that knob - it is auto-on). (https://docs.sarvam.ai/api-reference/text-to-speech/convert) |

Chat (`sarvam-105b`): no code-mix param; just send Hinglish in `messages` - it is trained on all 22 languages.
Gotcha: the value is `codemix` on STT but `code-mixed` on translate. Copying one to the other is a 400.
So "Dolo 650 safe hai kya?" works end to end: STT `mode=codemix` → sarvam-105b → bulbul:v3 speaks the mixed reply.

### Per-language speaker recommendations (bulbul:v3)

Source: https://docs.sarvam.ai/api-reference-docs/api-guides-tutorials/text-to-speech/how-to/change-the-speaker-voice
Any v3 speaker is ACCEPTED with any of the 11 languages (no 400), but the docs say "Not all speakers
perform equally across all languages" and publish per-language recommendations:

| Language | Male | Female | Demo pick |
|---|---|---|---|
| `hi-IN` | shubh, ashutosh | priya, suhani | `priya` |
| `kn-IN` | shubh, ratan | neha, ishita | `ishita` |
| `ta-IN` | ratan, rohan | ishita, ritu | `ishita` |
| `te-IN` | shubh, ratan | neha, priya | `priya` |
| `en-IN` | ratan | ishita | `ishita` |
| `bn-IN` | rehan | roopa, suhani | `roopa` |
| `mr-IN` | ratan | priya, ritu | `priya` |
| `gu-IN` | ratan | priya, ritu | `priya` |
| `pa-IN` | mani | roopa, suhani | `mani` |
| `ml-IN` | shubh | pooja | `pooja` |
| `od-IN` | shubh | ritu, pooja | `ritu` |

`priya` + `ishita` (both Tier-1 CER) cover hi/te + kn/ta between them - two speaker constants
cover a 4-language demo. Avoid `varun` outside thriller/suspense content (see §4).
