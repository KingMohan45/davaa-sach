// Davaa Sach — medicine safety verdict off live CDSCO data, spoken in Indian languages.
// Keys stay server-side. Endpoint shapes from .claude/skills/{sarvam-ai,anakin-io}/SKILL.md.
import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const app = express();
app.use(express.json({ limit: "25mb" })); // audio arrives as base64 JSON
app.use(express.static("public"));
app.get("/clinic", (_req, res) => res.sendFile(path.resolve("public/clinic.html")));

const SARVAM = "https://api.sarvam.ai";
const ANAKIN = "https://api.anakin.io/v1";
const sarvamHeaders = () => ({ "api-subscription-key": process.env.SARVAM_API_KEY, "Content-Type": "application/json" });
const anakinHeaders = () => ({ "X-API-Key": process.env.ANAKIN_API_KEY, "Content-Type": "application/json" });

const CACHE_DIR = "cache";
const cacheKey = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 16);
const cacheGet = (k) => { try { return JSON.parse(fs.readFileSync(path.join(CACHE_DIR, k + ".json"), "utf8")); } catch { return null; } };
const cachePut = (k, v) => { try { fs.writeFileSync(path.join(CACHE_DIR, k + ".json"), JSON.stringify(v)); } catch {} };

// ---------- Anakin ----------
async function anakinSearch(prompt, limit = 5) {
  const k = cacheKey("search:" + prompt);
  const hit = cacheGet(k);
  if (hit) return hit;
  const r = await fetch(`${ANAKIN}/search`, { method: "POST", headers: anakinHeaders(), body: JSON.stringify({ prompt, limit }) });
  if (!r.ok) throw new Error(`anakin search ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const data = await r.json(); // { results: [{url,title,snippet,date}] }
  cachePut(k, data);
  return data;
}

async function anakinScrape(url) {
  const k = cacheKey("scrape:" + url);
  const hit = cacheGet(k);
  if (hit) return hit;
  const r = await fetch(`${ANAKIN}/url-scraper/scrape`, { method: "POST", headers: anakinHeaders(), body: JSON.stringify({ url }) });
  if (!r.ok && r.status !== 202) throw new Error(`anakin scrape ${r.status}: ${(await r.text()).slice(0, 300)}`);
  let data = await r.json();
  for (let i = 0; i < 15 && data.status && !["completed", "failed"].includes(data.status); i++) {
    await new Promise((ok) => setTimeout(ok, 2000));
    const p = await fetch(`${ANAKIN}/url-scraper/${data.id}`, { headers: anakinHeaders() });
    data = await p.json();
  }
  if (data.status === "failed") throw new Error(`anakin scrape failed: ${data.error || "unknown"}`);
  cachePut(k, data);
  return data; // data.markdown
}

// Verified live against GET /v1/wire/catalog/tata-1mg: Tata 1mg (India's largest online
// pharmacy) is in the Wire catalog. Real Indian medicine prices beat an Amazon proxy.
const WIRE_ACTION = process.env.WIRE_ACTION || "tmg_search";

async function anakinWire(actionId, params) {
  const k = cacheKey("wire:" + actionId + JSON.stringify(params));
  const hit = cacheGet(k);
  if (hit) return hit;
  const r = await fetch(`${ANAKIN}/wire/task`, { method: "POST", headers: anakinHeaders(), body: JSON.stringify({ action_id: actionId, params }) });
  if (!r.ok && r.status !== 202) throw new Error(`wire ${r.status}: ${(await r.text()).slice(0, 300)}`);
  let data = await r.json();
  const jobId = data.id || data.jobId;
  for (let i = 0; i < 15 && jobId && data.status && !["completed", "failed"].includes(data.status); i++) {
    await new Promise((ok) => setTimeout(ok, 2000));
    const p = await fetch(`${ANAKIN}/wire/jobs/${jobId}`, { headers: anakinHeaders() });
    data = await p.json();
  }
  if (data.status === "failed") throw new Error(`wire failed: ${data.error || "unknown"}`);
  cachePut(k, data);
  return data;
}

// Fetch a JSON API THROUGH Anakin's url-scraper, so every external byte of evidence enters
// through one audited path. Verified live against api.fda.gov: the `html` field carries clean
// parseable JSON, while `markdown` mangles escapes and `cleanedHtml` HTML-escapes the quotes.
async function anakinFetchJson(url) {
  const k = cacheKey("ajson:" + url);
  const hit = cacheGet(k); if (hit) return hit;
  let out = null, via = "anakin";
  try {
    const r = await fetch(`${ANAKIN}/url-scraper/scrape`, { method: "POST", headers: anakinHeaders(), body: JSON.stringify({ url }) });
    if (!r.ok && r.status !== 202) throw new Error(`anakin json ${r.status}`);
    let d = await r.json();
    for (let i = 0; i < 12 && d.status && !["completed", "failed"].includes(d.status); i++) {
      await new Promise((ok) => setTimeout(ok, 2000));
      d = await (await fetch(`${ANAKIN}/url-scraper/${d.id}`, { headers: anakinHeaders() })).json();
    }
    const body = d.html || "";
    const a = body.indexOf("{"), b = body.lastIndexOf("}");
    if (a < 0 || b <= a) throw new Error("no json body in anakin response");
    out = JSON.parse(body.slice(a, b + 1));
  } catch (e) {
    // Never let the sponsor path take the feature down: fall back, but RECORD which path ran.
    console.error("anakin json fallback -> direct:", e.message);
    const r = await fetch(url);
    if (!r.ok) { const empty = { results: [], _via: "none" }; cachePut(k, empty); return empty; }
    out = await r.json(); via = "direct";
  }
  out._via = via;
  cachePut(k, out);
  return out;
}

// ---------- openFDA (public JSON API, no key) ----------
// drug/label carries the fields a prescription audit actually needs: contraindications,
// drug_interactions and boxed_warning. That is what makes "the assessment itself is wrong"
// checkable rather than a guess.
// openFDA indexes the drug NAME only: "Warfarin 5 mg" returns 0 hits, "Warfarin" returns 75.
// The strength suffix produced a FALSE "no US label" that then outranked a real bleeding risk.
const drugStem = (d) => String(d)
  .replace(/\b\d+(\.\d+)?\s*(mg|mcg|g|ml|iu|%)\b/gi, "")
  .replace(/\b(tablet|tab|cap|capsule|syrup|injection|sr|xr|er|dt)\b/gi, "")
  .replace(/\b\d+\b/g, "").replace(/\s+/g, " ").trim() || String(d);

async function openFdaLabel(drugRaw) {
  const drug = drugStem(drugRaw);
  const k = cacheKey("fdalabel:" + drug.toLowerCase());
  const hit = cacheGet(k); if (hit) return hit;
  const q = encodeURIComponent(`openfda.brand_name:"${drug}" OR openfda.generic_name:"${drug}"`);
  const d = await anakinFetchJson(`https://api.fda.gov/drug/label.json?search=${q}&limit=1`);
  cachePut(k, d); return d; // 404 -> {results:[]} = no label, not an error
}

async function openFdaRecalls(drugRaw) {
  const drug = drugStem(drugRaw);
  const k = cacheKey("fdarecall:" + drug.toLowerCase());
  const hit = cacheGet(k); if (hit) return hit;
  const q = encodeURIComponent(`product_description:"${drug}"`);
  const d = await anakinFetchJson(`https://api.fda.gov/drug/enforcement.json?search=${q}&limit=3`);
  cachePut(k, d); return d;
}

// WHO's falsified/substandard alert index — the international-ban authority. One scrape,
// cached, reused across every drug in a prescription.
// ---------- warm evidence store (the corpus that is the SAME for every question) ----------
// The CDSCO alerts index and the WHO falsified-medicine index do not depend on what the user
// asked, so scraping them on the request path taxed every single answer with a 202-poll. They
// are refreshed on a timer in the background instead, and the hot path only ever reads memory.
// A cold store degrades the answer (documented in the card), it never blocks it.
const WARM_MS = Number(process.env.WARM_MS || 30 * 60 * 1000);
const WARM_SOURCES = [
  { key: "cdsco", url: "https://cdsco.gov.in/opencms/opencms/en/Alerts/", cap: 3500 },
  { key: "who", url: "https://www.who.int/teams/regulation-prequalification/incidents-and-SF/full-list-of-who-medical-product-alerts", cap: 60000 },
];
const WARM = Object.fromEntries(WARM_SOURCES.map((s) => [s.key, { md: "", at: 0, chars: 0, error: null }]));
let warming = false;

async function warmAll(force) {
  if (warming) return WARM;
  warming = true;
  try {
    await Promise.all(WARM_SOURCES.map(async (src) => {
      const slot = WARM[src.key];
      if (!force && slot.md && Date.now() - slot.at < WARM_MS) return;
      try {
        // force bypasses the disk cache so a refresh actually re-reads the regulator.
        if (force) { try { fs.unlinkSync(path.join(CACHE_DIR, cacheKey("scrape:" + src.url) + ".json")); } catch {} }
        const page = await anakinScrape(src.url);
        const md = (page.markdown || "").slice(0, src.cap);
        if (md) { slot.md = md; slot.at = Date.now(); slot.chars = md.length; slot.error = null; }
        else slot.error = "empty markdown";
      } catch (e) { slot.error = String(e.message || e); console.error(`warm ${src.key} failed:`, slot.error); }
    }));
  } finally { warming = false; }
  return WARM;
}
// Read-only accessors. They NEVER await a network call, so no request ever waits on a scrape.
function warmMd(key) {
  const slot = WARM[key];
  if (!slot) return "";
  if (Date.now() - slot.at > WARM_MS) warmAll().catch(() => {}); // refresh behind the answer
  return slot.md || "";
}
function whoAlertIndex() { return warmMd("who"); }

// Pull only the WHO alert lines that mention this drug — the full index is ~40k chars and
// would drown the model, and a substring hit IS the citation.
function whoLinesFor(md, drug) {
  const needle = String(drug).toLowerCase().split(/\s+/)[0];
  if (!needle || needle.length < 4) return [];
  return md.split("\n").filter((l) => l.toLowerCase().includes(needle)).slice(0, 6);
}

// ---------- Sarvam ----------
const AUDIO_EXT = { webm: "webm", mp4: "mp4", "x-m4a": "m4a", m4a: "m4a", mpeg: "mp3", mp3: "mp3",
  ogg: "ogg", opus: "opus", wav: "wav", "x-wav": "wav", wave: "wav", aac: "aac", flac: "flac", amr: "amr" };
function audioExt(mime) {
  const sub = String(mime || "").split(";")[0].split("/")[1] || "webm";
  return AUDIO_EXT[sub.toLowerCase()] || "webm";
}

async function sarvamSTT(audioBuffer, mime) {
  if (!audioBuffer || audioBuffer.length < 2000) {
    throw new Error("recording too short - hold the mic button and speak for a second or two");
  }
  const fd = new FormData();
  const clean = String(mime || "audio/webm").split(";")[0]; // Sarvam wants a bare type, not ;codecs=opus
  fd.append("file", new Blob([audioBuffer], { type: clean }), `clip.${audioExt(clean)}`);
  fd.append("model", "saaras:v3");
  fd.append("language_code", "unknown"); // auto-detect
  fd.append("mode", "codemix"); // Hinglish/Kanglish etc — "Dolo 650 safe hai kya" transcribes clean
  const r = await fetch(`${SARVAM}/speech-to-text`, { method: "POST", headers: { "api-subscription-key": process.env.SARVAM_API_KEY }, body: fd });
  if (!r.ok) throw new Error(`sarvam stt ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json(); // { transcript, language_code, ... }
}

async function sarvamChat(messages, max_tokens = 7000, model = "sarvam-105b") {
  const r = await fetch(`${SARVAM}/v1/chat/completions`, { method: "POST", headers: sarvamHeaders(), body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens, reasoning_effort: "low" }) });
  if (!r.ok) throw new Error(`sarvam chat ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const data = await r.json();
  const msg = data.choices?.[0]?.message || {};
  // reasoning model: content is null when the budget went to reasoning_content — never return null
  const text = msg.content || msg.reasoning_content || "";
  if (!text) throw new Error("sarvam chat returned empty content");
  return text;
}

// The JSON may arrive fenced, or embedded in reasoning prose. Take the last balanced object.
function extractJson(raw) {
  const t = String(raw).replace(/```json?/gi, "").replace(/```/g, "");
  const start = t.indexOf("{");
  if (start < 0) return null;
  for (let end = t.lastIndexOf("}"); end > start; end = t.lastIndexOf("}", end - 1)) {
    try { return JSON.parse(t.slice(start, end + 1)); } catch {}
  }
  return null;
}

async function sarvamTranslate(input, target) {
  if (!input || target === "en-IN") return input;
  const r = await fetch(`${SARVAM}/translate`, { method: "POST", headers: sarvamHeaders(), body: JSON.stringify({ input, source_language_code: "en-IN", target_language_code: target, model: "sarvam-translate:v1" }) });
  if (!r.ok) throw new Error(`sarvam translate ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return (await r.json()).translated_text;
}

async function sarvamTransliterate(input, target) {
  const r = await fetch(`${SARVAM}/transliterate`, { method: "POST", headers: sarvamHeaders(), body: JSON.stringify({ input, source_language_code: "en-IN", target_language_code: target }) });
  if (!r.ok) throw new Error(`sarvam transliterate ${r.status}`);
  return (await r.json()).transliterated_text;
}

// Latin letters carrying a non-English language = romanized input the translator cannot read.
const looksLatin = (t) => !/[\u0900-\u0DFF]/.test(String(t)) && /[a-z]/i.test(String(t));
const SCRIPT_NAME = { "hi-IN": "Devanagari", "mr-IN": "Devanagari", "kn-IN": "Kannada", "te-IN": "Telugu",
  "ta-IN": "Tamil", "bn-IN": "Bengali", "gu-IN": "Gujarati", "ml-IN": "Malayalam", "od-IN": "Odia", "pa-IN": "Gurmukhi" };

// Romanized speech is ambiguous and a plain transliterator resolves it by SPELLING, not by
// meaning: "Chaati me jalan" came back as चाटी (tongue-ish) instead of छाती (chest), and every
// downstream hop then faithfully carried "my tongue is burning" into the doctor's language.
// The model is given the consultation context and picks the medically sensible word. It costs
// the same round trip the transliterator did, and the transliterator stays as the fallback.
async function toNativeScript(text, lang) {
  if (lang === "en-IN" || !looksLatin(text)) return text;
  const script = SCRIPT_NAME[lang];
  if (script) {
    try {
      const out = await sarvamChat([
        { role: "system", content: `You clean up speech typed in Roman letters before a translator reads it. Output the SAME sentence written in the native script of ${lang} (${script}), nothing else. It is a doctor visit, so pick the medically sensible word when a Roman spelling is ambiguous (chaati/seene = chest, pet = stomach, sar = head, gala = throat). Do not translate to English, do not explain. Output only the sentence in ${script}.` },
        { role: "user", content: String(text).slice(0, 600) },
      ], 300, "sarvam-105b-conversations");
      const clean = String(out || "").trim().split("\n")[0].trim();
      if (clean && !looksLatin(clean)) return clean;
    } catch (e) { console.error("script normalise skipped:", e.message); }
  }
  try { return await sarvamTransliterate(text, lang); }
  catch (e) { console.error("transliterate skipped:", e.message); return text; }
}

async function sarvamTranslateTo(input, source, target) {
  if (!input || source === target) return input;
  const r = await fetch(`${SARVAM}/translate`, { method: "POST", headers: sarvamHeaders(), body: JSON.stringify({ input, source_language_code: source, target_language_code: target, model: "sarvam-translate:v1" }) });
  if (!r.ok) throw new Error(`sarvam translate ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return (await r.json()).translated_text;
}

const SPEAKERS = { "hi-IN": "priya", "te-IN": "priya", "kn-IN": "ishita", "ta-IN": "ishita", "en-IN": "priya" };
async function sarvamTTS(text, language_code) {
  const speaker = SPEAKERS[language_code] || "shubh";
  const r = await fetch(`${SARVAM}/text-to-speech`, { method: "POST", headers: sarvamHeaders(), body: JSON.stringify({ text: String(text).slice(0, 2400), language_code, model: "bulbul:v3", speaker }) });
  if (!r.ok) throw new Error(`sarvam tts ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return (await r.json()).audios[0]; // base64 wav
}

// ---------- Routes ----------

// Voice in: { audioBase64, mime } -> { transcript, detectedLang }
app.post("/api/stt", async (req, res) => {
  try {
    const { audioBase64, mime = "audio/webm", fast } = req.body || {};
    if (!audioBase64) return res.status(400).json({ error: "audioBase64 required" });
    const out = await sarvamSTT(Buffer.from(audioBase64, "base64"), mime);
    // `fast` is the interim pass the mic fires WHILE the person is still speaking. It must never
    // pay for the drug-name extraction, which is an LLM round trip and would make each partial
    // land after the next one was already due.
    if (fast) return res.json({ transcript: out.transcript, drugLatin: out.transcript, detectedLang: out.language_code, partial: true });
    // codemix STT returns native script ("Dolo 650" -> Devanagari, numbers as words) — extract Latin drug name for web search
    let drugLatin = out.transcript;
    try {
      drugLatin = (await sarvamChat([
        { role: "system", content: "Extract the medicine/brand name and strength from the user text. Reply ONLY the name in Latin/English script with digits (e.g. Dolo 650). No other words." },
        { role: "user", content: out.transcript },
      ], 200, "sarvam-105b-conversations")).trim();
    } catch (e) { console.error("extract skipped:", e.message); }
    res.json({ transcript: out.transcript, drugLatin, detectedLang: out.language_code });
  } catch (e) { res.status(502).json({ error: String(e.message || e) }); }
});

// Core: { drug, lang } -> verdict card + audio + sources
app.post("/api/check", async (req, res) => {
  const { drug, lang = "kn-IN" } = req.body || {};
  if (!drug) return res.status(400).json({ error: "drug required" });
  // Whole-answer cache. The Anakin legs were already cached, but the Sarvam reasoning +
  // translate + TTS calls are the slow part and are not. Repeat asks must be instant.
  const answerKey = cacheKey("answer:v2:" + drug.toLowerCase().trim() + ":" + lang);
  const cachedAnswer = cacheGet(answerKey);
  if (cachedAnswer) return res.json({ ...cachedAnswer, cached: true });
  try {
    // 1. Live regulator evidence via Anakin
    const degraded = [];
    const wirePrice = anakinWire(WIRE_ACTION, { query: drug, per_page: 5, city: "Bengaluru" })
      .then((w) => ({ kind: "wire", data: w }))
      .catch((e) => { console.error("wire price fallback:", e.message); return anakinSearch(`${drug} generic price India Jan Aushadhi`, 3).then((s2) => ({ kind: "search", data: s2 })); })
      .catch((e) => { console.error("price leg down:", e.message); degraded.push("price"); return { kind: "search", data: { results: [] } }; });
    const [alertSearch, priceRes] = await Promise.all([
      anakinSearch(`"${drug}" CDSCO NSQ alert OR spurious drug India 2026`, 5)
        .catch((e) => { console.error("alert leg down:", e.message); degraded.push("alerts"); return { results: [] }; }),
      wirePrice,
    ]);
    const alerts = alertSearch.results || [];
    const prices = priceRes.kind === "search" ? (priceRes.data.results || []) : [];
    const wirePriceRaw = priceRes.kind === "wire" ? JSON.stringify(priceRes.data).slice(0, 2500) : "";

    // 2. Scrape CDSCO alerts index for month-level authority (cached after first hit)
    // Warm store, read from memory. No scrape on the request path.
    const cdscoMd = warmMd("cdsco");
    if (!cdscoMd) degraded.push("cdsco-index");

    // 3. Verdict from sarvam-105b, strict JSON
    const context = [
      cdscoMd && `CDSCO ALERTS INDEX:\n${cdscoMd}`,
      alerts.length && `LIVE SEARCH (alerts):\n${alerts.map((r) => `- ${r.title} | ${r.snippet} | ${r.url}`).join("\n")}`,
      wirePriceRaw && `TATA 1MG LIVE PHARMACY LISTINGS (via Anakin Wire):\n${wirePriceRaw}`,
      prices.length && `LIVE SEARCH (prices):\n${prices.map((r) => `- ${r.title} | ${r.snippet}`).join("\n")}`,
    ].filter(Boolean).join("\n\n").slice(0, 9000);
    const raw = await sarvamChat([
      { role: "system", content: 'You check Indian medicines against CDSCO regulator alerts. Reply ONLY minified JSON: {"verdict":"flagged"|"clear"|"unknown","reason":"<=40 words, cite which source","priceNote":"<=25 words generic price info or empty","speak":"<=45 words, spoken aloud to a 62-year-old parent holding the medicine strip in a pharmacy queue, who is worried and cannot read English. Calm, unhurried, no jargon, no numbers read as digits. Lead with the answer."}. "flagged" only if evidence names this drug in an NSQ/spurious list. "unknown" if evidence is thin.' },
      { role: "user", content: `Medicine: ${drug}\n\nEVIDENCE:\n${context || "(no evidence retrieved)"}` },
    ], 3000, "sarvam-105b-conversations");
    let card = extractJson(raw);
    if (!card || !["flagged", "clear", "unknown"].includes(card.verdict)) {
      console.error("verdict unparseable, raw head:", String(raw).slice(0, 160));
      card = { verdict: "unknown", reason: "Evidence was retrieved but could not be summarised into a verdict. Open the regulator links below.", priceNote: "", speak: "I found the government pages but could not read them clearly. Please check with your pharmacist." };
    }

    // 4. Local language + voice
    if (degraded.includes("alerts")) {
      card.reason = "Could not reach the live regulator feed just now, so this is unchecked - not a clean bill.";
      card.speak = "I could not check the government alert list right now. Please ask your pharmacist before taking this.";
    }
    const [reasonLocal, speakLocal] = await Promise.all([
      sarvamTranslate(card.reason, lang),
      sarvamTranslate(card.speak, lang),
    ]);
    let audioBase64 = null;
    try { audioBase64 = await sarvamTTS(speakLocal, lang); } catch (e) { console.error("tts skipped:", e.message); }

    const payload = {
      drug, verdict: degraded.includes("alerts") ? "unknown" : card.verdict,
      reason: degraded.includes("alerts") ? "Could not reach the live regulator feed just now, so this is unchecked - not a clean bill." : card.reason,
      reasonLocal, priceNote: card.priceNote, audioBase64, degraded,
      sources: [...alerts, ...prices].slice(0, 6).map((r) => ({ url: r.url, title: r.title })),
    };
    if (!degraded.length) cachePut(answerKey, payload); // never cache a degraded answer
    res.json(payload);
  } catch (e) { res.status(502).json({ error: String(e.message || e) }); }
});

// ============ USE CASE 2: prescription audit ============
// A doctor says what they are about to prescribe. We check every drug against WHO falsified
// alerts, US FDA recalls and CDSCO, AND check the SET for interactions and contraindications,
// because the prescribing decision itself can be the error.
app.post("/api/prescription", async (req, res) => {
  const { text, lang = "en-IN" } = req.body || {};
  if (!text) return res.status(400).json({ error: "text required" });
  const T0 = Date.now(); const timings = {}; const T = (n, t) => { timings[n] = Date.now() - t; };
  try {
    // 1. Pull the drug list out of free speech ("I'll start her on Augmentin 625 and Pan 40")
    const whoP = Promise.resolve(whoAlertIndex()); // warm store: resolves instantly
    const tExtract = Date.now();
    const listRaw = await sarvamChat([
      { role: "system", content: 'Extract every medicine mentioned. Reply ONLY a minified JSON array of strings, brand or generic name plus strength if stated, Latin script. Example: ["Augmentin 625","Pan 40"]. No other text.' },
      { role: "user", content: text },
    ], 1500, "sarvam-105b-conversations");
    T("extract", tExtract);
    let drugs = [];
    try { drugs = JSON.parse((listRaw.match(/\[[\s\S]*\]/) || ["[]"])[0]); } catch {}
    drugs = drugs.filter((d) => typeof d === "string" && d.trim()).slice(0, 6);
    if (!drugs.length) return res.json({ drugs: [], verdict: "unknown", reason: "No medicine name was recognised in that sentence.", findings: [], degraded: ["parse"] });

    // 2. Evidence per drug, in parallel. One WHO scrape shared across the whole prescription.
    const degraded = [];
    const tEv = Date.now();
    const whoMd = await whoP;
    if (!whoMd) degraded.push("who");
    const per = await Promise.all(drugs.map(async (d) => {
      const [label, recalls, cdsco, bans] = await Promise.all([
        openFdaLabel(d).catch(() => ({ results: [] })),
        openFdaRecalls(d).catch(() => ({ results: [] })),
        anakinSearch(`"${d}" CDSCO NSQ alert OR banned OR withdrawn India`, 3).catch(() => { degraded.push("cdsco"); return { results: [] }; }),
        anakinSearch(`${d} banned OR withdrawn OR suspended in which countries EMA WHO FDA regulatory action`, 4).catch(() => { degraded.push("bans"); return { results: [] }; }),
      ]);
      const L = (label.results || [])[0] || {};
      const pick = (f, n) => (L[f] ? String(L[f][0]).slice(0, n) : "");
      return {
        drug: d,
        noUsLabel: !(label.results || []).length, // absence is EVIDENCE, not silence
        bans: (bans.results || []).map((r) => ({ title: r.title, url: r.url, snippet: String(r.snippet || "").slice(0, 220) })),
        who: whoLinesFor(whoMd, d),
        contraindications: pick("contraindications", 700),
        interactions: pick("drug_interactions", 1200),
        boxed: pick("boxed_warning", 500),
        indications: pick("indications_and_usage", 500),
        recalls: (recalls.results || []).map((r) => ({ desc: String(r.product_description || "").slice(0, 120), why: String(r.reason_for_recall || "").slice(0, 120), country: r.country, cls: r.classification })),
        cdsco: (cdsco.results || []).map((r) => ({ title: r.title, url: r.url, snippet: String(r.snippet || "").slice(0, 200) })),
      };
    }));

    // 3. Review the prescription AS A SET, not drug by drug.
    const evidence = per.map((p) => [
      `### ${p.drug}`,
      p.who.length ? `WHO ALERTS MENTIONING IT:\n${p.who.join("\n")}` : "WHO alert index: no line names this drug.",
      p.noUsLabel ? "US FDA LABEL DATABASE: no label found. WEAK SIGNAL ONLY: it may mean the drug was never US-approved, or simply that this name is not how the US indexes it. Never make this the headline and never rank it above an interaction, a boxed warning or a regulator alert." : "",
      p.bans.length && `INTERNATIONAL REGULATORY ACTION SEARCH:\n${p.bans.map((b) => `- ${b.title} :: ${b.snippet}`).join("\n")}`,
      p.boxed && `FDA BOXED WARNING: ${p.boxed}`,
      p.contraindications && `CONTRAINDICATIONS: ${p.contraindications}`,
      p.interactions && `DRUG INTERACTIONS: ${p.interactions}`,
      p.indications && `APPROVED USE: ${p.indications}`,
      p.recalls.length && `FDA RECALLS: ${p.recalls.map((r) => `${r.desc} (${r.why}, ${r.country}, ${r.cls})`).join(" | ")}`,
      p.cdsco.length && `INDIA/CDSCO SEARCH: ${p.cdsco.map((c) => `${c.title} — ${c.snippet}`).join(" | ")}`,
    ].filter(Boolean).join("\n")).join("\n\n").slice(0, 14000);

    T("evidence", tEv);
    const tRev = Date.now();
    const raw = await sarvamChat([
      { role: "system", content: 'You are a clinical-safety second reader for a doctor in India. You do NOT prescribe and you do NOT overrule the doctor; you surface what the evidence says. Reply ONLY minified JSON: {"verdict":"stop"|"caution"|"ok","headline":"<=18 words naming the MOST clinically serious finding; an interaction or regulator ban outranks a missing database entry","findings":[{"drug":"","kind":"international_alert"|"recall"|"interaction"|"contraindication"|"assessment"|"none","severity":"high"|"medium"|"low","detail":"<=35 words, cite which source"}],"speak":"<=40 words, spoken to a 41-year-old physician with eleven patients still waiting, who has been interrupted by unhelpful software all morning. Lead with the decision. No preamble, no hedging, no restating the prescription. If nothing is wrong, say so in one line and stop."}. Use "stop" when a drug is named in a WHO falsified alert, is banned/suspended/withdrawn by ANY national regulator (EMA, FDA, MHRA, Health Canada, TGA), carries a boxed warning against this combination, or two prescribed drugs have a documented serious interaction. Absence of evidence is NOT evidence of safety: if the evidence says no US label was found, report that as kind "international_alert" severity "medium" naming the countries involved, never as "none". When a drug is restricted abroad but legal in India, say so plainly and name the country and the reason. Use "assessment" as the kind when the drug looks mismatched to the stated condition. If nothing is found, return verdict "ok" with one finding of kind "none".' },
      { role: "user", content: `The doctor said: "${text}"\n\nPrescribed: ${drugs.join(", ")}\n\nEVIDENCE:\n${evidence}` },
    ], 3000, "sarvam-105b-conversations");
    let out = extractJson(raw);
    if (!out || !["stop", "caution", "ok"].includes(out.verdict)) {
      console.error("prescription unparseable head:", String(raw).slice(0, 160));
      out = { verdict: "caution", headline: "Evidence was retrieved but could not be summarised. Read the sources below.", findings: [], speak: "I could not summarise the safety check. Please review the sources." };
    }
    T("review", tRev);
    const tVoice = Date.now();
    const [headlineLocal, speakLocal] = await Promise.all([
      sarvamTranslate(out.headline, lang), sarvamTranslate(out.speak, lang),
    ]);
    let audioBase64 = null;
    try { audioBase64 = await sarvamTTS(speakLocal, lang); } catch (e) { console.error("tts skipped:", e.message); }
    T("voice", tVoice); timings.total = Date.now() - T0;
    res.json({ drugs, verdict: out.verdict, headline: out.headline, headlineLocal, findings: out.findings || [], audioBase64, degraded, timings,
      sources: per.flatMap((p) => p.cdsco.map((c) => ({ url: c.url, title: c.title }))).slice(0, 6) });
  } catch (e) { res.status(502).json({ error: String(e.message || e) }); }
});

// ============ USE CASE 5: live duplex consultation ============
// Both parties keep talking. Every utterance is transcribed with auto language detection,
// appended to a running transcript, and spoken to the other party in their language. After each
// PATIENT turn the whole transcript so far is re-read into a clinical note plus candidate
// medication classes, and every candidate is checked against the cached WHO alert index.
app.post("/api/consult", async (req, res) => {
  const { text: rawText, toLang = "en-IN", fromLang = "hi-IN", speaker = "patient", transcript = [] } = req.body || {};
  if (!rawText) return res.status(400).json({ error: "text required" });
  const T0 = Date.now(); const timings = {};
  try {
    // A) translate for the other party, and speak it
    const tTr = Date.now();
    const text = await toNativeScript(rawText, fromLang);
    const enPivot = fromLang === "en-IN" ? Promise.resolve(text) : sarvamTranslateTo(text, fromLang, "en-IN");
    const translateP = (async () => {
      const en = await enPivot; // shared, so the pivot is computed exactly once per turn
      const out = toLang === "en-IN" ? en : (fromLang === toLang ? text : await sarvamTranslate(en, toLang));
      let audio = null;
      try { audio = await sarvamTTS(out, toLang); } catch (e) { console.error("tts skipped:", e.message); }
      return { out, en, audio };
    })();

    // B) re-read the WHOLE conversation into a note. Only worth doing on a patient turn.
    const notePromise = speaker !== "patient" ? Promise.resolve(null) : (async () => {
      const thisEn = await enPivot; // English pivot of the current turn
      const convo = [...transcript, { speaker, text, en: thisEn }]
        .map((t) => `${t.speaker === "patient" ? "PATIENT" : "DOCTOR"}: ${t.en || t.text}`)
        .join("\n").slice(0, 6000);
      const raw = await sarvamChat([
        { role: "system", content: 'You keep a live consultation note for a doctor while a patient talks. You are given the whole conversation so far and must RE-READ ALL OF IT each time, not just the last line. Reply ONLY minified JSON: {"complaint":"<=16 words, chief complaint in clinical English","duration":"<=6 words or empty","negatives":["relevant thing the patient has DENIED or that is absent", ...],"redFlags":["finding needing urgent care", ...],"suggestions":[{"name":"GENERIC drug or class, never a brand, never a dose","whatFor":"<=12 words","caution":"<=14 words or empty"}],"askBack":["<=12 word question the doctor should ask next", ...up to 3]}. Suggestions are candidates for the DOCTOR to consider, at most 4, and must be plausible for the stated complaint. Never state a dose. If the complaint is still too vague to suggest anything, return an empty suggestions array and put the missing information in askBack.' },
        { role: "user", content: convo },
      ], 2500, "sarvam-105b-conversations");
      return extractJson(raw);
    })();

    const [tr, note] = await Promise.all([translateP, notePromise]);
    timings.turn = Date.now() - tTr;

    // C) safety pass on the suggestions, against the WHO index we already hold cached
    let flagged = [];
    if (note && Array.isArray(note.suggestions) && note.suggestions.length) {
      const whoMd = await whoAlertIndex();
      flagged = note.suggestions
        .map((sg) => ({ name: sg.name, who: whoLinesFor(whoMd, sg.name) }))
        .filter((x) => x.who.length);
    }
    timings.total = Date.now() - T0;
    res.json({ speaker, original: text, fromLang, toLang, translated: tr.out, en: tr.en, audioBase64: tr.audio, note, flagged, timings });
  } catch (e) { res.status(502).json({ error: String(e.message || e) }); }
});

// ============ USE CASE 4: consultation interpreter ============
// A migrant patient and a doctor with no shared language, which is the ordinary case in any
// Indian tertiary hospital. Translate the utterance BOTH ways and, when the patient is speaking,
// surface the clinical content so the doctor does not have to reconstruct it from a translation.
app.post("/api/interpret", async (req, res) => {
  const { text: rawText, from = "hi-IN", to = "kn-IN", speaker = "patient" } = req.body || {};
  if (!rawText) return res.status(400).json({ error: "text required" });
  const T0 = Date.now(); const timings = {};
  try {
    const tTr = Date.now();
    const text = await toNativeScript(rawText, from);
    timings.script = Date.now() - tTr;

    // The listener's chain and the doctor's clinical read no longer share an English pivot.
    // sarvam-translate:v1 goes indic-to-indic directly, so the two legs start at the SAME
    // moment instead of one waiting on the other. On a Hindi -> Kannada turn that is one
    // whole round trip off the wall clock, and it is also the better translation (one hop,
    // not two).
    const tOut = Date.now();
    const speakChain = (async () => {
      const translated = from === to ? text : await sarvamTranslateTo(text, from, to);
      let audio = null;
      try { audio = await sarvamTTS(translated, to); } catch (e) { console.error("tts skipped:", e.message); }
      return { translated, audio };
    })();

    // Only the patient's turn needs clinical structuring; the doctor's turn is an instruction,
    // so a doctor turn never pays for the English pivot at all.
    const clinicalP = speaker !== "patient" ? Promise.resolve(null) : (async () => {
      const en = from === "en-IN" ? text : await sarvamTranslateTo(text, from, "en-IN");
      const raw = await sarvamChat([
        { role: "system", content: 'You help a doctor understand a patient who does not share their language. Reply ONLY minified JSON: {"complaint":"<=14 words chief complaint in clinical English","duration":"<=6 words or empty","redFlags":["urgent finding", ...],"askBack":["<=12 word follow-up question the doctor should ask, phrased for the patient", ...up to 3]}. Never diagnose and never name a medicine.' },
        { role: "user", content: `Patient said: "${en}"` },
      ], 1500, "sarvam-105b-conversations");
      return extractJson(raw);
    })();

    const [out, clinical] = await Promise.all([speakChain, clinicalP]);
    const translated = out.translated, audioBase64 = out.audio;
    timings.outAndClinical = Date.now() - tOut; timings.total = Date.now() - T0;
    res.json({ original: text, translated, from, to, speaker, clinical, audioBase64, timings });
  } catch (e) { res.status(502).json({ error: String(e.message || e) }); }
});

// Same pipeline as /api/interpret, streamed. The point is that the doctor should not stare at a
// spinner while the audio renders: the native-script text lands first, the translation next, the
// clinical read and the voice whenever they finish. Each stage is painted the moment it exists.
// EventSource is a GET, which is why the turn arrives as query params.
app.get("/api/interpret/stream", async (req, res) => {
  const { text: rawText, from = "hi-IN", to = "kn-IN", speaker = "patient" } = req.query || {};
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.flushHeaders && res.flushHeaders();
  const T0 = Date.now();
  const send = (event, data) => { res.write(`event: ${event}\ndata: ${JSON.stringify({ ...data, at: Date.now() - T0 })}\n\n`); };
  if (!rawText) { send("error", { error: "text required" }); return res.end(); }
  try {
    const text = await toNativeScript(rawText, from);
    send("script", { original: text });

    const speakChain = (async () => {
      const translated = from === to ? text : await sarvamTranslateTo(text, from, to);
      send("translated", { translated });
      let audio = null;
      try { audio = await sarvamTTS(translated, to); } catch (e) { console.error("tts skipped:", e.message); }
      if (audio) send("audio", { audioBase64: audio });
      else send("audio", { audioBase64: null, error: "voice unavailable" });
      return translated;
    })();

    const clinicalP = speaker !== "patient" ? Promise.resolve(null) : (async () => {
      const en = from === "en-IN" ? text : await sarvamTranslateTo(text, from, "en-IN");
      const raw = await sarvamChat([
        { role: "system", content: 'You help a doctor understand a patient who does not share their language. Reply ONLY minified JSON: {"complaint":"<=14 words chief complaint in clinical English","duration":"<=6 words or empty","redFlags":["urgent finding", ...],"askBack":["<=12 word follow-up question the doctor should ask, phrased for the patient", ...up to 3],"suggestions":[{"name":"generic drug or class commonly used for this, e.g. paracetamol / proton pump inhibitor","whatFor":"<=6 words"}, ...up to 3]}. suggestions are for the DOCTOR, generic names or classes only, never brands, never doses. askBack must not name medicines.' },
        { role: "user", content: `Patient said: "${en}"` },
      ], 1500, "sarvam-105b-conversations");
      const cl = extractJson(raw);
      // The cross-border screen: every candidate the model floats is checked against the WHO
      // falsified/substandard product alert index, read from the warm store (never the network).
      // A hit ships the matching alert lines as the receipt, not just a boolean.
      const whoMd = whoAlertIndex();
      const flagged = [];
      for (const sg of (cl && cl.suggestions) || []) {
        const words = String(sg.name).toLowerCase().split(/\s+/).filter((w) => w.length >= 5);
        const lines = whoMd ? whoMd.split("\n").filter((l) => { const ll = l.toLowerCase(); return words.some((w) => ll.includes(w)); }).slice(0, 2) : [];
        if (lines.length) flagged.push({ name: sg.name, lines });
      }
      send("clinical", { clinical: cl, flagged,
        evidence: { whoChars: WARM.who.chars, whoAgeSec: WARM.who.at ? Math.round((Date.now() - WARM.who.at) / 1000) : null } });
      return cl;
    })();

    await Promise.all([speakChain, clinicalP.catch((e) => { console.error("clinical skipped:", e.message); send("clinical", { clinical: null }); })]);
    send("done", { total: Date.now() - T0 });
  } catch (e) {
    send("error", { error: String(e.message || e) });
  }
  res.end();
});

// ============ USE CASE 3: symptoms -> what is commonly used, and what to ask ============
// Deliberately NOT a prescription. It names drug CLASSES that are approved for the described
// problem, flags anything under an international alert, and always routes to a clinician.
app.post("/api/symptoms", async (req, res) => {
  const { text, lang = "kn-IN" } = req.body || {};
  if (!text) return res.status(400).json({ error: "text required" });
  try {
    const degraded = [];
    const cond = await sarvamChat([
      { role: "system", content: 'A patient describes symptoms in their own words, possibly code-mixed. Reply ONLY minified JSON: {"summary":"<=20 words clinical restatement","candidates":["generic drug or class name", ...up to 3],"redFlags":["symptom that needs urgent care", ...]} . candidates must be GENERIC names or classes (e.g. "paracetamol","proton pump inhibitor"), never brand names, never doses.' },
      { role: "user", content: text },
    ], 2000, "sarvam-105b-conversations");
    const c = extractJson(cond) || { summary: text.slice(0, 120), candidates: [], redFlags: [] };
    const cands = (c.candidates || []).filter((x) => typeof x === "string").slice(0, 3);

    const whoMd = await whoAlertIndex();
    if (!whoMd) degraded.push("who");
    const per = await Promise.all(cands.map(async (d) => {
      const label = await openFdaLabel(d).catch(() => ({ results: [] }));
      const L = (label.results || [])[0] || {};
      const pick = (f, n) => (L[f] ? String(L[f][0]).slice(0, n) : "");
      return { drug: d, who: whoLinesFor(whoMd, d), indications: pick("indications_and_usage", 400),
        contraindications: pick("contraindications", 400), boxed: pick("boxed_warning", 300) };
    }));

    const evidence = per.map((p) => [`### ${p.drug}`,
      p.who.length ? `WHO ALERT LINES: ${p.who.join(" | ")}` : "WHO alert index: not named.",
      p.boxed && `BOXED WARNING: ${p.boxed}`,
      p.indications && `APPROVED USE: ${p.indications}`,
      p.contraindications && `DO NOT USE IF: ${p.contraindications}`,
    ].filter(Boolean).join("\n")).join("\n\n").slice(0, 9000);

    const raw = await sarvamChat([
      { role: "system", content: 'You help a person in India understand their options before seeing a doctor. You NEVER prescribe, NEVER give a dose, and NEVER tell anyone to skip a doctor. Reply ONLY minified JSON: {"summary":"<=20 words","urgency":"emergency"|"see_doctor"|"routine","options":[{"name":"generic name or class","whatItIsFor":"<=18 words","cautionFlag":"<=18 words or empty"}],"askYourDoctor":["<=12 word question", ...up to 3],"speak":"<=40 words, spoken to a 62-year-old who is worried, standing in a pharmacy queue, holding a phone in one hand and a medicine strip in the other, and who has already been talked down to once today. Calm and unhurried. Say plainly this is not a prescription and a doctor or pharmacist must confirm."}. Set urgency "emergency" if the described symptoms could be a heart attack, stroke, breathing difficulty, severe bleeding or a child under 2 with high fever.' },
      { role: "user", content: `Patient said: "${text}"\n\nClinical restatement: ${c.summary}\nRed flags noted: ${(c.redFlags || []).join(", ") || "none"}\n\nEVIDENCE:\n${evidence}` },
    ], 3000, "sarvam-105b-conversations");
    let out = extractJson(raw);
    if (!out || !out.options) {
      out = { summary: c.summary, urgency: "see_doctor", options: [], askYourDoctor: [], speak: "I could not check this safely. Please see a doctor or pharmacist." };
    }
    const [summaryLocal, speakLocal] = await Promise.all([
      sarvamTranslate(out.summary, lang), sarvamTranslate(out.speak, lang),
    ]);
    let audioBase64 = null;
    try { audioBase64 = await sarvamTTS(speakLocal, lang); } catch (e) { console.error("tts skipped:", e.message); }
    res.json({ ...out, summaryLocal, audioBase64, degraded });
  } catch (e) { res.status(502).json({ error: String(e.message || e) }); }
});

app.get("/api/health", (_req, res) => res.json({
  sarvamKey: Boolean(process.env.SARVAM_API_KEY),
  anakinKey: Boolean(process.env.ANAKIN_API_KEY),
  warm: Object.fromEntries(Object.entries(WARM).map(([k, v]) => [k, { chars: v.chars, ageSec: v.at ? Math.round((Date.now() - v.at) / 1000) : null, error: v.error }])),
}));

// Manual re-read of the regulator corpus, for a demo or an ops nudge. Force skips the disk cache.
app.post("/api/warm", async (req, res) => {
  const w = await warmAll(Boolean((req.body || {}).force));
  res.json(Object.fromEntries(Object.entries(w).map(([k, v]) => [k, { chars: v.chars, error: v.error }])));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Doctor Globe http://localhost:${port}`);
  warmAll().then(() => console.log("warm store ready:", Object.entries(WARM).map(([k, v]) => `${k}=${v.chars}`).join(" ")));
  setInterval(() => warmAll(true).catch(() => {}), WARM_MS);
});
