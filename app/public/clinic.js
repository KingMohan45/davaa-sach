/* Davaa Sach — clinic. A dedicated surface for one doctor, one patient, one open microphone.
   Everything is a VISIT: turns belong to a visit, visits are the history, and the history is the
   left rail. Nothing here shares state with the tabbed page beyond the stored visits. */

const $ = (id) => document.getElementById(id);
const LANGS = [["hi-IN","हिन्दी Hindi"],["kn-IN","ಕನ್ನಡ Kannada"],["te-IN","తెలుగు Telugu"],["ta-IN","தமிழ் Tamil"],["en-IN","English"],["bn-IN","বাংলা Bengali"],["mr-IN","मराठी Marathi"],["gu-IN","ગુજરાતી Gujarati"],["ml-IN","മലയാളം Malayalam"],["od-IN","ଓଡ଼ିଆ Odia"],["pa-IN","ਪੰਜਾਬੀ Punjabi"]];
const LNAME = Object.fromEntries(LANGS);
const VKEY = "davaa.visits.v1";
const OLDKEY = "davaa.interpret.v2";   // the tabbed page's flat thread, imported once
const VAD_ON = 0.075;    // level at which we call it speech
const VAD_HANG = 700;    // silence that ends an utterance, ms
const SEG_MIN = 700;     // shorter than this is a cough, not a sentence
const SEG_MAX = 22000;   // REST STT is capped under 30s

// Audio is megabytes of base64 per turn. It lives in memory for the session and never in storage.
const iaudio = new Map();

let store = { visits: [], currentId: null };
let speaker = "patient";

/* ---------- storage ---------- */
function load() {
  try { const r = localStorage.getItem(VKEY); if (r) store = JSON.parse(r); } catch (e) {}
  if (!store || !Array.isArray(store.visits)) store = { visits: [], currentId: null };
  if (!store.visits.length) {
    // One-time import so a visit started on the tabbed page is not orphaned by the move here.
    try {
      const old = JSON.parse(localStorage.getItem(OLDKEY) || "[]").filter((t) => t && !t.sess && t.original);
      if (old.length) store.visits.push({ id: "v" + Date.now(), at: Date.now(), from: old[0].from, to: old[0].to, turns: old });
    } catch (e) {}
  }
  // An empty visit is a visit nobody had. Keep at most the newest one, or a reload loop leaves a
  // column of identical blank cards that look like lost consultations.
  store.visits = store.visits.filter((v) => v && Array.isArray(v.turns));
  const withTurns = store.visits.filter((v) => v.turns.length);
  const empty = store.visits.filter((v) => !v.turns.length);
  store.visits = (empty.length ? [empty[0]] : []).concat(withTurns);
  if (!store.visits.length) newVisit(true);
  if (!store.currentId || !byId(store.currentId)) store.currentId = store.visits[0].id;
}
function save() {
  try {
    const slim = { currentId: store.currentId, visits: store.visits.slice(0, 40).map((v) => ({ ...v, turns: v.turns.slice(-80) })) };
    localStorage.setItem(VKEY, JSON.stringify(slim));
  } catch (e) {}
}
const byId = (id) => store.visits.find((v) => v.id === id);
const cur = () => byId(store.currentId) || store.visits[0];
function newVisit(silent) {
  // Never stack blank visits: if the newest one was never used, reuse it.
  const top = store.visits[0];
  if (top && !top.turns.length) {
    top.at = Date.now(); top.from = $("ifrom") ? $("ifrom").value : top.from; top.to = $("ito") ? $("ito").value : top.to;
    store.currentId = top.id;
    if (!silent) { save(); paintAll(); }
    return top;
  }
  const v = { id: "v" + Date.now() + Math.random().toString(36).slice(2, 5), at: Date.now(),
    from: $("ifrom") ? $("ifrom").value : "hi-IN", to: $("ito") ? $("ito").value : "kn-IN", turns: [] };
  store.visits.unshift(v); store.currentId = v.id;
  if (!silent) { save(); paintAll(); }
  return v;
}

/* ---------- language pickers ---------- */
for (const [sel, def] of [["ifrom","hi-IN"],["ito","kn-IN"]]) {
  for (const [v, label] of LANGS) {
    const o = document.createElement("option");
    o.value = v; o.textContent = label; if (v === def) o.selected = true;
    $(sel).appendChild(o);
  }
}
$("iswap").onclick = () => { const a = $("ifrom").value; $("ifrom").value = $("ito").value; $("ito").value = a; };
for (const s of ["ifrom","ito"]) $(s).onchange = () => { const v = cur(); v.from = $("ifrom").value; v.to = $("ito").value; save(); paintHistory(); };
// Speaker is a MANUAL control. Language auto-detection mis-attributed real consultations
// (code-mixed speech detects as en-IN), so the pills are the truth and the only automation left
// is the deterministic hand-over after each turn, which is what a consultation actually does.
function setSpeaker(w) {
  speaker = w;
  $("sp-pat").classList.toggle("on", w === "patient");
  $("sp-doc").classList.toggle("on", w === "doctor");
  $("int").placeholder = w === "patient" ? "or type what the patient said" : "or type what the doctor said";
}
$("sp-pat").onclick = () => setSpeaker("patient");
$("sp-doc").onclick = () => setSpeaker("doctor");

/* ---------- history rail ---------- */
function fmtWhen(ts) {
  const d = new Date(ts), now = new Date();
  const t = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return "today " + t;
  return d.toLocaleDateString([], { day: "2-digit", month: "short" }) + " " + t;
}
function paintHistory() {
  const list = $("vlist"); list.innerHTML = "";
  $("vcount").textContent = store.visits.length + (store.visits.length === 1 ? " visit" : " visits");
  for (const v of store.visits) {
    const b = document.createElement("button");
    b.className = "vis" + (v.id === store.currentId ? " on" : "");
    const t = document.createElement("div"); t.className = "vt";
    const l = document.createElement("span"); l.textContent = fmtWhen(v.at);
    const r = document.createElement("span"); r.textContent = v.turns.length + (v.turns.length === 1 ? " turn" : " turns");
    t.appendChild(l); t.appendChild(r); b.appendChild(t);
    const p = document.createElement("div"); p.className = "vp";
    const first = v.turns.find((x) => x.speaker === "patient") || v.turns[0];
    p.textContent = first ? first.original : "nothing said yet";
    b.appendChild(p);
    const lg = document.createElement("div"); lg.className = "vl";
    lg.textContent = (LNAME[v.from] || v.from) + "  ⇄  " + (LNAME[v.to] || v.to);
    b.appendChild(lg);
    b.onclick = () => { if (callOn) endCall(); store.currentId = v.id; $("ifrom").value = v.from; $("ito").value = v.to; save(); paintAll(); };
    list.appendChild(b);
  }
}
$("newvisit").onclick = () => { if (callOn) endCall(); newVisit(); };
$("i-del").onclick = () => {
  if (callOn) endCall();
  store.visits = store.visits.filter((v) => v.id !== store.currentId);
  if (!store.visits.length) newVisit(true);
  store.currentId = store.visits[0].id;
  save(); paintAll();
};
$("i-copy").onclick = async () => {
  const v = cur();
  const txt = [`Doctor Globe visit · ${fmtWhen(v.at)} · ${LNAME[v.from] || v.from} <-> ${LNAME[v.to] || v.to}`, ""]
    .concat(v.turns.map((t) => `${t.speaker === "patient" ? "Patient" : "Doctor"} (${LNAME[t.from] || t.from}): ${t.original}\n  -> ${t.translated || ""}`)).join("\n");
  try { await navigator.clipboard.writeText(txt); $("i-copy").textContent = "Copied"; setTimeout(() => ($("i-copy").textContent = "Copy visit"), 1400); }
  catch (e) { $("e4").textContent = "Clipboard blocked by the browser."; }
};

/* ---------- bar meter, shared by the mic and by playback ---------- */
function barMeter(canvas, getLevel, opts) {
  const o = opts || {}, col = o.color || "#CEFF32", gap = 3, w = o.barW || 3;
  const hist = []; let raf = null;
  (function loop() {
    raf = requestAnimationFrame(loop);
    const W = canvas.width = canvas.clientWidth * devicePixelRatio;
    const H = canvas.height = canvas.clientHeight * devicePixelRatio;
    if (!W || !H) return;
    const g = canvas.getContext("2d"), step = (w + gap) * devicePixelRatio, n = Math.floor(W / step);
    hist.push(getLevel()); while (hist.length > n) hist.shift();
    g.clearRect(0, 0, W, H);
    for (let i = 0; i < hist.length; i++) {
      const x = W - (hist.length - i) * step;
      const h = Math.max(2 * devicePixelRatio, hist[i] * H * 0.92);
      g.fillStyle = col;
      g.fillRect(x, (H - h) / 2, w * devicePixelRatio, h);
    }
  })();
  return { stop: () => cancelAnimationFrame(raf) };
}
function levelFrom(an) {
  const buf = new Uint8Array(an.frequencyBinCount);
  return () => {
    an.getByteTimeDomainData(buf);
    let peak = 0;
    for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128) / 128);
    return Math.min(1, peak * 1.7);
  };
}

/* ---------- playback ---------- */
let nowPlaying = null;
function playTurn(btn, id) {
  if (nowPlaying) { nowPlaying.pause(); nowPlaying = null; }
  const b64 = iaudio.get(id); if (!b64) return;
  const a = new Audio("data:audio/wav;base64," + b64);
  nowPlaying = a;
  let ctx = null, meter = null;
  btn.classList.add("playing");
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const an = ctx.createAnalyser(); an.fftSize = 512;
    ctx.createMediaElementSource(a).connect(an); an.connect(ctx.destination);
    meter = barMeter(btn.querySelector("canvas"), levelFrom(an), { color: "#1A1A17" });
  } catch (e) {}
  const done = () => {
    btn.classList.remove("playing");
    if (meter) meter.stop();
    if (ctx) ctx.close().catch(() => {});
    if (nowPlaying === a) nowPlaying = null;
  };
  a.onended = done; a.onerror = done;
  a.play().catch(done);
}

/* ---------- thread ---------- */
function bubble(t) {
  const wrap = document.createElement("div");
  wrap.className = "msg " + t.speaker; wrap.dataset.id = t.id;
  const who = document.createElement("div"); who.className = "who";
  who.textContent = (t.speaker === "patient" ? "Patient" : "Doctor") + " · " + (LNAME[t.from] || t.from);
  const bub = document.createElement("div"); bub.className = "bub";
  const said = document.createElement("div"); said.className = "said";
  said.textContent = t.original || "\u{1F399} …";
  if (!t.original) said.style.opacity = ".55";
  bub.appendChild(said);
  if (t.error) {
    bub.classList.add("fail");
    const box = document.createElement("div"); box.className = "loading";
    const p = document.createElement("span"); p.className = "stagelab"; p.style.color = "var(--reject)"; p.style.marginLeft = "0";
    p.textContent = t.error; box.appendChild(p); bub.appendChild(box);
  } else if (t.translated) {
    const xl = document.createElement("div"); xl.className = "xl"; xl.textContent = t.translated; bub.appendChild(xl);
  } else if (t.stage) {
    const box = document.createElement("div"); box.className = "loading";
    const d = document.createElement("span"); d.className = "dots"; d.innerHTML = "<i></i><i></i><i></i>";
    const lab = document.createElement("span"); lab.className = "stagelab"; lab.textContent = t.stage;
    box.appendChild(d); box.appendChild(lab); bub.appendChild(box);
    bub.appendChild(Object.assign(document.createElement("div"), { className: "shimmer" }));
    bub.appendChild(Object.assign(document.createElement("div"), { className: "shimmer s2" }));
  }
  wrap.appendChild(who); wrap.appendChild(bub);
  if (iaudio.has(t.id)) {
    const tools = document.createElement("div"); tools.className = "mtools";
    const b = document.createElement("button"); b.className = "player";
    b.innerHTML = '<span class="ic">&#9654;</span><span class="plab"></span><canvas></canvas>';
    b.querySelector(".plab").textContent = "play " + (LNAME[t.to] || t.to);
    b.onclick = () => playTurn(b, t.id);
    tools.appendChild(b); wrap.appendChild(tools);
  }
  return wrap;
}
function paintThread(scroll) {
  const th = $("ithread"), v = cur();
  th.innerHTML = "";
  if (!v.turns.length) {
    const e = document.createElement("div"); e.className = "empty";
    e.textContent = "Press START. The microphone stays open for the whole visit and each sentence is sent at the pause after it.";
    th.appendChild(e);
  } else for (const t of v.turns) th.appendChild(bubble(t));
  if (scroll !== false) th.scrollTop = th.scrollHeight;
}
function repaint(t) {
  const old = $("ithread").querySelector('.msg[data-id="' + t.id + '"]');
  if (!old) return paintThread();
  old.replaceWith(bubble(t));
  $("ithread").scrollTop = $("ithread").scrollHeight;
}

/* ---------- the note: the whole visit, not the last sentence ---------- */
function paintNote() {
  const el = $("note"), v = cur();
  el.innerHTML = "";
  const flags = [], asks = [];
  let complaint = null, duration = "";
  for (const t of v.turns) {
    const c = t.clinical; if (!c) continue;
    if (c.complaint && !complaint) { complaint = c.complaint; duration = c.duration || ""; }
    for (const f of c.redFlags || []) if (!flags.includes(f)) flags.push(f);
    for (const q of c.askBack || []) if (!asks.includes(q)) asks.push(q);
  }
  $("ncount").textContent = v.turns.length ? v.turns.length + " turns" : "";
  if (!complaint && !flags.length && !asks.length) {
    const e = document.createElement("div"); e.className = "empty";
    e.style.margin = "0"; e.style.textAlign = "left";
    e.textContent = "The note writes itself as the patient talks.";
    return el.appendChild(e);
  }
  const row = (label, build) => {
    const r = document.createElement("div"); r.className = "nrow";
    const l = document.createElement("div"); l.className = "nlab"; l.textContent = label;
    r.appendChild(l); build(r); el.appendChild(r);
  };
  if (complaint) row("chief complaint", (r) => {
    const d = document.createElement("div"); d.className = "nval";
    d.textContent = complaint + (duration ? "  ·  " + duration : ""); r.appendChild(d);
  });
  if (flags.length) row("red flags", (r) => {
    for (const f of flags) { const d = document.createElement("div"); d.className = "rfx"; d.textContent = f; r.appendChild(d); }
  });
  if (asks.length) row("ask next", (r) => {
    const u = document.createElement("ul");
    for (const q of asks.slice(-6)) { const li = document.createElement("li"); li.className = "qq"; li.textContent = q; u.appendChild(li); }
    r.appendChild(u);
  });
}
function paintAll() { paintHistory(); paintThread(); paintNote(); }

/* ---------- one turn, streamed ---------- */
// Re-entrant on purpose: in a hands-free visit the next sentence starts before the previous
// turn's voice has rendered, and a single in-flight guard would drop speech on the floor.
let iOpen = 0;
function startTurn(text, sp, stage) {
  const v = cur();
  const from = sp === "patient" ? $("ifrom").value : $("ito").value;
  const to = sp === "patient" ? $("ito").value : $("ifrom").value;
  const turn = { id: "t" + Date.now() + Math.random().toString(36).slice(2, 6), speaker: sp, from, to,
    original: text, translated: "", clinical: null, stage: stage || "reading the script", visitId: v.id };
  v.turns.push(turn);
  paintThread(); paintHistory();
  return turn;
}
function dropTurn(turn) {
  const v = byId(turn.visitId); if (!v) return;
  v.turns = v.turns.filter((t) => t.id !== turn.id);
  if (store.currentId === turn.visitId) { paintThread(); paintHistory(); }
}
function interpret(spokenText, who, existing) {
  const text = (spokenText || $("int").value).trim(); if (!text) { if (existing) dropTurn(existing); return; }
  iOpen++; $("e4").textContent = ""; $("heard").textContent = "";
  const sp = who || speaker;
  const turn = existing || startTurn(text, sp);
  const visitId = turn.visitId;
  turn.original = text; turn.stage = "reading the script";
  const from = turn.from, to = turn.to;
  $("int").value = "";
  if (store.currentId === visitId) { repaint(turn); paintHistory(); }
  // typed path hands the mic over too, same as voice
  if (!existing && $("iauto").checked) setSpeaker(sp === "patient" ? "doctor" : "patient");

  const qs = new URLSearchParams({ text, from, to, speaker: sp });
  const es = new EventSource("/api/interpret/stream?" + qs.toString());
  let closed = false;
  // A visit can be switched while a turn is in flight; only touch the DOM if it is still on screen.
  const showing = () => store.currentId === visitId;
  const finish = () => { if (closed) return; closed = true; es.close(); iOpen--; save(); };

  es.addEventListener("script", (m) => {
    turn.original = JSON.parse(m.data).original || turn.original; turn.stage = "translating";
    if (showing()) repaint(turn);
  });
  es.addEventListener("translated", (m) => {
    turn.translated = JSON.parse(m.data).translated || ""; turn.stage = "";
    if (showing()) repaint(turn);
    save();
  });
  es.addEventListener("clinical", (m) => {
    turn.clinical = JSON.parse(m.data).clinical || null;
    if (showing()) { repaint(turn); paintNote(); }
    save();
  });
  es.addEventListener("audio", (m) => {
    const d = JSON.parse(m.data); if (!d.audioBase64) return;
    iaudio.set(turn.id, d.audioBase64);
    if (showing()) repaint(turn);
    queueSpeak(d.audioBase64);
  });
  es.addEventListener("done", () => { if (showing()) paintHistory(); finish(); });
  es.addEventListener("error", (m) => {
    let msg = "stream dropped";
    try { msg = JSON.parse(m.data).error || msg; } catch (e) {}
    turn.stage = ""; turn.error = msg; $("e4").textContent = msg;
    if (showing()) repaint(turn);
    finish();
  });
  es.onerror = () => { if (!closed) { turn.stage = ""; turn.error = turn.error || "connection lost"; if (showing()) repaint(turn); finish(); } };
}
$("go4").onclick = () => interpret();
$("int").addEventListener("keydown", (e) => { if (e.key === "Enter") interpret(); });
document.querySelectorAll(".hint .ex").forEach((e) => { e.onclick = () => { $("int").value = e.textContent; interpret(); }; });

/* ---------- one voice at a time ---------- */
const speakQ = []; let speaking = false;
function queueSpeak(b64) { speakQ.push(b64); drainSpeak(); }
function drainSpeak() {
  if (speaking || !speakQ.length) return;
  speaking = true;
  const a = new Audio("data:audio/wav;base64," + speakQ.shift());
  const done = () => { speaking = false; drainSpeak(); };
  a.onended = done; a.onerror = done;
  a.play().catch(done);
}

/* ---------- hands-free: the mic opens once and stays open ----------
   A WebM stream only decodes from its own header, so each utterance is a fresh MediaRecorder over
   the SAME open getUserMedia stream: the recorder restarts at every pause, the microphone never
   closes and the browser never re-prompts. */
let callOn = false, iStream = null, iCtx = null, iAn = null, iMeter = null, iTick = null, iStarting = false;
let segRec = null, segChunks = [], segVoiced = false, segStart = 0;
let vadRaf = null, lastVoice = 0, callStart = 0;

function fmtClock(ms) {
  const s = Math.floor(ms / 1000);
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}
async function sttBlob(blob, fast) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  if (buf.length < 2200) return null;
  let bin = "";
  for (let i = 0; i < buf.length; i += 32768) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 32768));
  const r = await fetch("/api/stt", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audioBase64: btoa(bin), mime: blob.type || "audio/webm", fast: Boolean(fast) }) });
  const d = await r.json(); if (!r.ok) throw new Error(d.error || r.status);
  return d;
}
function setState(txt, cls) {
  $("livestate").textContent = txt;
  $("livebar").classList.toggle("hot", cls === "hot");
  $("livebar").classList.toggle("cut", cls === "cut");
}
function newSegment() {
  if (!callOn || !iStream) return;
  segChunks = []; segVoiced = false; segStart = Date.now();
  const CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus", "audio/ogg"];
  const picked = CANDIDATES.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
  segRec = picked ? new MediaRecorder(iStream, { mimeType: picked }) : new MediaRecorder(iStream);
  const mime = segRec.mimeType || "audio/webm";
  segRec.ondataavailable = (e) => { if (e.data && e.data.size) segChunks.push(e.data); };
  segRec.onstop = () => {
    const chunks = segChunks, voiced = segVoiced;
    segChunks = [];
    if (callOn) newSegment();              // reopen instantly, no gap in the conversation
    if (!voiced || !chunks.length) return; // silence is not a turn
    sendSegment(new Blob(chunks, { type: mime }));
  };
  segRec.start(400);
}
function cutSegment() { if (segRec && segRec.state === "recording") segRec.stop(); }

async function sendSegment(blob) {
  setState("transcribing", "cut");
  // The utterance is attributed to whoever the pill says, CAPTURED NOW — the hand-over below
  // must not re-label an utterance that is still in flight.
  const who = speaker;
  // Paint the bubble immediately, before STT answers. The wait is ~1s of transcription and it
  // used to be a wait on nothing; now the turn is on screen from the moment the pause cut it.
  const turn = startTurn("", who, "transcribing");
  if ($("iauto").checked) setSpeaker(who === "patient" ? "doctor" : "patient");
  try {
    const d = await sttBlob(blob, false);
    const val = d && (d.transcript || d.drugLatin || "");
    if (!val) { dropTurn(turn); setState(callOn ? "listening" : "ended", ""); return; }
    setState(callOn ? "listening" : "ended", "");
    interpret(val, who, turn);
  } catch (e) {
    dropTurn(turn);
    setState(callOn ? "listening" : "ended", "");
    $("e4").textContent = "STT: " + String(e.message || e);
  }
}
function vadLoop() {
  vadRaf = requestAnimationFrame(vadLoop);
  if (!iAn) return;
  const buf = new Uint8Array(iAn.frequencyBinCount);
  iAn.getByteTimeDomainData(buf);
  let peak = 0;
  for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128) / 128);
  const now = Date.now();
  if (peak > VAD_ON) { lastVoice = now; if (!segVoiced) { segVoiced = true; setState("hearing you", "hot"); } }
  const dur = now - segStart;
  if (segVoiced && now - lastVoice > VAD_HANG && dur > SEG_MIN) cutSegment();
  else if (segVoiced && dur > SEG_MAX) cutSegment();
  else if (!segVoiced && dur > 12000) { segChunks = []; segStart = now; } // never bank silence
}
async function startCall() {
  if (iStarting || callOn) return;
  try {
    iStarting = true;
    iStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    callOn = true; callStart = Date.now();
    $("cbar").classList.add("live"); $("mic4").classList.add("rec"); $("mic4").textContent = "LIVE";
    $("live").classList.add("on"); $("e4").textContent = ""; setState("listening", "");
    // A visit that already has turns is finished; a new one starts here.
    if (cur().turns.length) newVisit();
    iTick = setInterval(() => ($("livetime").textContent = fmtClock(Date.now() - callStart)), 200);
    iCtx = new (window.AudioContext || window.webkitAudioContext)();
    iAn = iCtx.createAnalyser(); iAn.fftSize = 512;
    iCtx.createMediaStreamSource(iStream).connect(iAn);
    iMeter = barMeter($("livewave"), levelFrom(iAn), { color: "#CEFF32" });
    lastVoice = 0; vadLoop(); newSegment();
    iStarting = false;
  } catch (e) {
    iStarting = false; callOn = false; $("cbar").classList.remove("live");
    $("e4").textContent = "Mic: " + String(e.message || e);
  }
}
function endCall() {
  if (!callOn) return;
  callOn = false;
  cutSegment();                    // the last utterance is still sent
  cancelAnimationFrame(vadRaf); clearInterval(iTick);
  if (iMeter) { iMeter.stop(); iMeter = null; }
  if (iCtx) { iCtx.close().catch(() => {}); iCtx = null; }
  iAn = null;
  if (iStream) { iStream.getTracks().forEach((t) => t.stop()); iStream = null; }
  $("cbar").classList.remove("live"); $("mic4").classList.remove("rec"); $("mic4").textContent = "START";
  $("live").classList.remove("on");
  save(); paintHistory();
}
$("mic4").onclick = () => (callOn ? endCall() : startCall());
$("stop4").onclick = endCall;
addEventListener("beforeunload", () => { if (callOn) endCall(); });

load();
$("ifrom").value = cur().from || "hi-IN";
$("ito").value = cur().to || "kn-IN";
paintAll();
