# How to win the AI Engineer Mixer 90-Minute Build Sprint
**Research memo — compiled 2026-08-30. Time-boxed research (~25 min).**

> **Headline: there is a published rubric with explicit percentage weights, and it does not say what hackathon folklore says.** I found the actual challenge doc. Read the "Rubric" section below before anything else — it inverts the standard "the demo must run" advice.

---

## 0. The primary source (FACT — this is the whole ballgame)

The Luma page links a Google Doc titled **"AI Engineer Mixer Challenge"**. It is world-readable and I pulled it as plain text:

- Event page: https://luma.com/ai-engineer-mixer
- **Challenge doc: https://docs.google.com/document/d/132l_u2v_GOXswVySDP-ONb8gTzxLOcYZ0e5YaZJasGo/edit**
  (plain-text export: append `/export?format=txt` to the doc id path — returns HTTP 200, 9565 bytes, no auth)

Everything in sections 1, 2, 5 and 6 below is quoted from that doc unless marked otherwise. **This is a FACT source, not inference.**

---

## 1. Who is judging and what they optimise for

### Facts

| Fact | Evidence |
|---|---|
| Event is **"AI Engineer Mixer \| Giveaways Worth ₹50,000"**, Sunday morning, at the **Anakin office, 4th floor, 168 19th Main Rd, Sector 4, HSR Layout, Bengaluru 560102** | https://luma.com/ai-engineer-mixer |
| **302 people registered as going**; registration is approval-gated | https://luma.com/ai-engineer-mixer |
| Hosts listed: **WeMakeDevs**, **Anakin (anakinio)**, **Kunal Kushwaha**, **Aayush Sharma**, **Sachin Sharma** | https://luma.com/ai-engineer-mixer |
| Speakers before the sprint: **Kartikey Rawat** (Edge AI efficiency), **Vinayak Gavariya** (voice agents), **Aryan Bramhane** (website endpoint), **Ashwin Kumar Upala** (Voice AI intro) | https://luma.com/ai-engineer-mixer agenda |
| Sponsors are **Sarvam.ai** and **Anakin.io** — named as the two mandatory APIs in the challenge doc. The Luma page itself never names them as sponsors; the challenge doc does. | Challenge doc |
| Prize for the sprint: **a Keychron keyboard for ALL MEMBERS of the winning team** (the ₹50,000 is the broader event giveaway pool, not the sprint prize) | Challenge doc, verbatim: *"Prize and credits: ALL MEMBERS of the winning team get the Keychron keyboard."* |

### Named judges: NOT published — INFERENCE required

**The challenge doc does not name judges.** It says "judges" generically five times. My inference, flagged as such:

- **INFERENCE (high confidence):** the judging panel is drawn from the listed hosts — Kunal Kushwaha (WeMakeDevs), plus Anakin people (Aayush Sharma, Sachin Sharma, Aryan Bramhane, who also co-hosted the earlier Build-With-Anakin mini-hackathon: https://luma.com/w81h0ekt). The event is *in Anakin's own office*, so Anakin engineers are structurally present and invested.
- **INFERENCE (medium):** Sarvam is a sponsor-by-API but there is no evidence a Sarvam engineer is physically present. Aryan Bramhane's talk is on a "website endpoint" — Anakin's product. **No Sarvam speaker is on the agenda.** So the room's tacit expertise skews Anakin-heavy, but the rubric weights both equally.
- **INFERENCE (medium-high):** with ~300 attendees, a 30-minute judging window (1:00→1:30) and a submission *form*, judging is almost certainly **form-first / async triage**, not 300 stage pitches. Which means **your written form answers are the primary artifact**, and the live demo is a confirmation step for shortlisted teams. See §6.

---

## 2. The published rubric — VERBATIM, with weights (FACT)

From the challenge doc, section "Judging Rubric":

| Weight | Criterion | Verbatim text |
|---:|---|---|
| **25%** | Good Ideation | "The project has a clear, original, and useful idea with a well-defined user, problem." |
| **25%** | Sponsor API use | "Sarvam.ai and Anakin.io usage is meaningful, visible, and central to the value." |
| **20%** | Originality and usefulness | "The idea solves a real problem in a memorable way." |
| **10%** | User experience | "The UI is clear, polished, and easy to demo in two minutes." |
| **10%** | Technical clarity | "The team can explain the architecture, tradeoffs, and next steps." |
| **10%** | Working Product | "The demo runs, handles errors, and shows a complete user flow." |

### The three things this rubric tells you that folklore does not

1. **IDEA IS 45%** (Ideation 25 + Originality 20). **"Working Product" is 10%.** The idea is worth **4.5×** the working demo. A brilliant idea with a half-working demo beats a flawless CRUD app. This is the opposite of the standard 24-hour-hackathon heuristic.
2. **70% of your score is fixed before you write a line of code** — Ideation (25) + Sponsor API use (25) + Originality (20) are all decided by *which idea you pick and which API calls it implies*. Idea selection is the single highest-leverage 10 minutes of the sprint.
3. **Sponsor API use at 25% is tied with Ideation for the largest single criterion**, and the wording is a trap for wrappers: *"meaningful, **visible**, and **central to the value**"*. Not "used". Central. And visible — meaning the judge must *see* it happen.

### Cross-check: this matches WeMakeDevs' house style (FACT)

WeMakeDevs' flagship "AI Agents Assemble" hackathon publishes six unweighted dimensions — Potential Impact, Creativity & Originality, Technical Implementation, Learning & Growth, Aesthetics & UX, Presentation & Communication (https://archive.wemakedevs.org/hackathons/assemblehack25). Two of them explicitly reward sponsor tech: Creativity assesses *"how creatively **sponsor technologies** are applied"* and Technical Implementation reviews *"the quality of integration with **required sponsor technologies**."*

Their Zerops Challenge requires *"Zerops is **meaningfully involved** in how it is built, deployed, or operated"* and judges the main track on *"the idea, the execution, and how Zerops is used"* (https://www.wemakedevs.org/hackathons/zerops).

**Conclusion (FACT-backed):** across three separate WeMakeDevs events, sponsor-tech depth is an explicit, first-class criterion, and the word they keep reaching for is **"meaningful"**. This is a consistent house pattern, not a one-off.

---

## 3. The mandatory constraint most teams will get wrong (FACT)

Verbatim from the challenge doc:

> **"Mandatory: use both Sarvam.ai and Anakin.io."**

And the required build:

> "Your project should include: A working demo that runs locally or is deployed / One clear user flow from input to useful output / **Real API usage from Sarvam.ai and Anakin.io** / A visible result that judges can understand quickly / A short explanation of the user and problem"

**INFERENCE (high confidence):** in a 90-minute sprint, a large fraction of 300 attendees will bolt one API on as an afterthought — typically calling Sarvam translate on the final string and calling it "Indian language support". That is precisely the "wrapper" failure the 25% criterion is written to catch. **The single biggest differentiator available is a project where removing *either* API breaks the product.**

### Timings (FACT, with a documented contradiction)

| Source | Build window | Deadline | Winner |
|---|---|---|---|
| Challenge doc header | 11:30 AM – 1:00 PM | **1:00 PM sharp** | by 1:30 PM |
| Challenge doc timeline | 11:40 AM – 1:00 PM | "After 1:00 PM sharp, no project submissions will be accepted" | By 2:00 PM |
| Luma agenda | 11:40 AM – 1:40 PM | — | — |

The doc contradicts itself (and Luma) on start and on announcement time. **The one thing stated twice and both times with the word "sharp" is the 1:00 PM submission deadline.** Treat 1:00 PM as hard. Submission form opens 12:30 PM.

**Tactical read:** you have ~60 minutes of build (11:30→12:30) and 30 minutes of polish. **Submit a working-but-ugly version at 12:31**, then keep improving — the doc explicitly permits this: *"You can submit anytime after this, but your project can keep improving until 1:00 PM."* This makes a zero-submission disaster impossible.

---

## 4. The submission form IS the scoring sheet (FACT)

The doc lists exactly what you submit:

- Project name
- Team member names
- **One-sentence pitch**
- **Demo link or local demo instructions**
- GitHub repo, zip, or code link
- Which idea you chose, remixed, or created
- **Where you used Sarvam.ai**
- **Where you used Anakin.io**
- **One example input the judges should try**
- Any limitations judges should know

Map it against the rubric and the correspondence is nearly one-to-one:

| Form field | Feeds criterion | Weight |
|---|---|---|
| One-sentence pitch + "which idea" | Good Ideation, Originality | **45%** |
| "Where you used Sarvam.ai" / "Where you used Anakin.io" | Sponsor API use | **25%** |
| Demo link + example input | Working Product, UX | 20% |
| Repo + limitations | Technical clarity | 10% |

**INFERENCE (high):** the two "where did you use X" fields are the literal evidence a judge reads to score the 25% sponsor criterion. Writing "used Sarvam for translation" scores badly. Writing "Sarvam Saaras v3 STT takes the spoken Kannada question; Mayura translates the scraped English page into Kannada; Bulbul v3 speaks the verdict — the app has no text input path at all" scores well. **Write these two fields as if they are worth 25% of your score, because they are.**

Note also: **"One example input the judges should try"** implies judges may run your app themselves, unattended. A hardcoded happy path that works for exactly that input is legitimate and explicitly invited.

---

## 5. Winning-project patterns

### 5a. The doc's own worked examples of good vs bad scope (FACT — verbatim)

> - Not "AI for shopping", but **"compare one keyboard across three pages and give a Hindi voice recommendation."**
> - Not "AI travel app", but **"scrape one event page and nearby results, then make a local-language event companion."**
> - Not "AI research assistant", but **"turn five live links into a two-minute source-backed briefing."**

And the stated anatomy of a good 90-minute idea:

> "One specific user / One clear input / One useful output / One live data source or real user artifact / One visible AI transformation"

**This is the rubric restated as a build spec.** Note "**One visible AI transformation**" — the word *visible* appears in both the rubric's sponsor criterion and here. The organisers care that the AI step is *legible on screen*, not just happening.

### 5b. The five pre-blessed ideas (FACT)

The doc names five: **Speak-to-the-Web Explainer**, **Bengaluru Event Companion**, **Local Price Radar**, **Review Lens**, **Scheme Navigator**. Each comes with a "90-minute version" scope cut.

**INFERENCE (high confidence, and this is a real strategic fork):** picking a listed idea guarantees a clean 25% sponsor score (the API mapping is pre-designed for you) but caps "Originality" (20%) — because with 300 attendees, ideas 1 and 2 will be built dozens of times, and idea 2 (Event Companion) is the most obvious and will be the single most duplicated project in the room. Idea 5 (**Scheme Navigator** — government schemes in local language) is the *least* likely to be duplicated, has the strongest "real user" story, and maps most naturally to both APIs. **The optimal play is "remix two ideas", which the doc explicitly permits** — it preserves the pre-designed API mapping while clearing the originality bar.

### 5c. Comparable events and what actually won

| Project / event | Event | Why it won / what it did | Source |
|---|---|---|---|
| — (winners not published) | WeMakeDevs "AI Agents Assemble", $20k prizes, GSoC mentorship for all | Prize tracks are **sponsor-named** (Kestra/Cline/Oumi/Vercel/CodeRabbit awards), i.e. the money is allocated per-sponsor-tech, not per-quality | https://archive.wemakedevs.org/hackathons/assemblehack25 |
| — | WeMakeDevs Zerops Challenge | Requires live URL + public source + deployment staying up through judging; main track = "idea, execution, and how Zerops is used" | https://www.wemakedevs.org/hackathons/zerops |
| — | WeMakeDevs × Stream (Devpost) | Criteria: Creativity, Implementation of the Idea, Potential Impact | https://wemakedevs-stream.devpost.com/ |
| Oral-history archive (Thethi/Maithili) | Sarvam Epoch Buildathon | Consent-first archive preserving an elder's oral tradition, literal transcription + dataset building — a *culturally specific, narrow, human* story on Sarvam STT | Surfaced via GitHub `sarvam-ai` topic search |
| Screen-aware Android voice copilot (Hindi/Tamil/English) | Sarvam ecosystem | Accessibility framing, full Sarvam STT→LLM→TTS chain | GitHub `sarvam-ai` topic |
| Hinglish D2C support voice agent | Sarvam ecosystem | Real-time voice for Hindi/English/**Hinglish** calls — code-mix is the differentiator | GitHub `sarvam-ai` topic |
| 50 projects on the Sarvam track | Sarvam × HackCulture, Great Bengaluru Hackathon (4700 regs, 150 teams) | Sarvam ran a dedicated sponsor track and publicised the *track project count* | https://x.com/SarvamAI/status/1905165495042535889 |
| — (winners not published) | Sarvam BuildIn' Hours, Zo House Bengaluru — **12-hour** offline, 6,272 applied / 100 admitted, ₹5L pool, ₹5k credits per team | Four tracks: **Voice AI, Document Intelligence, Multilingual AI, AI Agents** — Sarvam's own taxonomy of what it wants built | https://smestreet.in/infocus/zo-house-bengaluru-hosts-sarvam-ais-buildin-hours-hackathon-6272-applied-in-48-hours-100-got-in-12391041 |
| — | Build With Anakin mini-hackathon, Bengaluru, May 2026, ₹20,000+ | Build on "Anakin's Universal Scraper and/or Wire"; hosts Tosh Kothari + **Aryan Bramhane** (also speaking at this mixer) | https://luma.com/w81h0ekt |

**Honest limitation:** I could **not** find a published list of named winning projects for any WeMakeDevs-run hackathon, nor for Sarvam BuildIn' Hours. Winner names do not appear on the archive pages, and I am not going to invent them. The pattern evidence above is drawn from criteria pages, sponsor track taxonomies, and the public project ecosystem — which is weaker evidence than a winners list, and I'm labelling it as such.

**Common thread across the Sarvam projects that *do* get publicised (INFERENCE, medium-high):** they are narrow, culturally specific, and use Sarvam for something an English-first model *cannot do* — code-mixed Hinglish, Maithili oral history, Kannada voice. None of them are "chatbot, but translated."

---

## 5.5 External evidence: what wins short hackathons (and where folklore is wrong)

I checked the standard "how to win a hackathon" claims against judge-authored and organiser-authored sources. Three of the six survive, one is outright unsupported, and one **does not apply to this event**.

| Claim | Verdict | Evidence |
|---|---|---|
| Judges spend 2–5 min per project | **SUPPORTED** | MLH's organiser guide budgets **4 min/project**: "2 minutes for presentation + demo, 1 minute for questions… 1 minute for judge travel", with "**3 rounds of judging per project**" — https://guide.mlh.com/general-information/judging-and-submissions/judging-plan |
| A narrow crisp story beats a broad platform | **STRONGLY SUPPORTED** (3 independent sources) | "The best projects do one thing really well rather than five things halfway"; "One clear 'oh, this is possible now' moment is much stronger than a tour of every feature" — https://blog.jetbrains.com/ai/2026/06/how-to-win-a-hackathon-notes-from-the-judging-table/ ; "the team that ships a working demo of a smaller idea beats the team that demos a broken version of a bigger one" — https://angelhack.com/blog/hackathon-tips-for-winners/ |
| The demo must run live or you lose | **MIXED — weaker than folklore** | Against: MLH's rules make Completion 1 of 4 criteria and explicitly say "It's okay if you didn't finish your hack… Completion is only one part of the judging criteria", and **code quality and pitch quality are explicitly NOT judged** — https://github.com/MLH/mlh-hackathon-rules/blob/master/Rules.md . For: "Judges can tell when you're talking around a feature that doesn't exist yet"; "**You have to be able to show something working within about 90 seconds**" (Jono Bacon) — JetBrains, URL above |
| Deployed public URL beats localhost | **NOT SUPPORTED** | No judge-authored source says this. The only assertive sources are vendor SEO content. No MLH or Devpost criterion mentions hosting. **And this event's own doc says "runs locally or is deployed" and accepts "local demo instructions".** Do not burn sprint minutes on deployment. |
| Pre-recorded video as fallback | **SUPPORTED as risk control, not as a scoring lever** | "Record the demo video twice, so you have a backup if the live demo fails" (AngelHack); "Have screenshots or videos of your project in case it breaks ten minutes before the demo" — https://www.nicksingh.com/posts/win-hackathons-a-how-to-guide |
| Judges reward visible sponsor-API use over general quality | **SUPPORTED for sponsor tracks; contested for grand prizes — but the caveat does NOT apply here** | For: "I'm looking for not just the use of the platform as a place to dump images and video, but a **deep use** of the APIs" (Cloudinary judge) — https://dev.to/cloudinary/how-to-win-a-hackathon-1377 . Against, generally: "Chasing API prizes can become a dangerous distraction… Simply integrating it isn't enough" (Nick Singh, URL above). **Why the caveat is void here:** there is one prize, sponsor use is 25% of its rubric, and both APIs are *mandatory*. The usual "don't chase sponsor prizes" advice assumes sponsor tracks are a side quest. At this event they are the main quest. |

### Where this event deliberately departs from MLH norms (FACT)

MLH's rules state code quality, pitch quality and idea novelty are **not** judged. **This event's rubric judges the opposite**: originality is 45% of the score and "the team can explain the architecture, tradeoffs, and next steps" is an explicit 10%. **Do not import generic hackathon advice here.** The published rubric is the authority and it is unusually idea-weighted.

### Judging format: science fair vs form triage (INFERENCE)

MLH-adjacent organiser guidance says stage presentation is "best for up to 100 participants. If you expect more than 100 participants, switch to a **science fair** set up." With 302 registered, both external norms and this event's own submission-form design point away from 300 stage pitches.

Two plausible formats, and **the correct strategy is the same for both**:
- **Form-first triage** (my higher-confidence read, given the 12:30 form and a 30-min window): your written form answers are the primary artifact; the demo confirms a shortlist.
- **Science-fair roaming**: MLH's model means you demo the *same thing 3+ times* to different judges, cold, with no stage control.

Either way: the screen must be self-explanatory without you, and your 30-second hook must be repeatable verbatim. Build for "a judge reads my form field, then glances at my screen", not "I deliver a narrative arc".

### What was NOT found (honest gap)

My researcher found **zero** judged-outcome writeups for hackathons in the 60–120 minute band. Every verifiable "how to win" source is written for 24–48h events. The 90-minute-specific guidance in this memo is therefore extrapolation from (a) this event's own published rubric and timeline, which is direct evidence, and (b) short-demo judging mechanics, which is analogous evidence. Flagging that seam honestly rather than dressing extrapolation as data.

Also discarded: several SEO/AI-generated blogs carrying precise-sounding stats ("teams with a non-coder are 2.5x more likely to place Top 3") with **no methodology**. Not cited, treat as fabricated.

---

## 6. Sponsor-judge psychology: "real use" vs "wrapper"

### What Sarvam is differentiated at (FACT — https://docs.sarvam.ai/)

| Model | What it does | The differentiator |
|---|---|---|
| **Saaras v3** (STT) | 23 languages (22 Indian + English) | Modes: transcribe / **translate** / verbatim / **transliterate** / **code-mix**. Real-time WebSocket streaming with "true partial transcripts, live mid-stream reconfiguration" |
| **Bulbul v3** (TTS) | 11 languages, 30+ voices | Handles **code-switching at the model level** — a Hinglish sentence generates in a single pass with no pause at the language boundary, no voice shift, no accent change |
| **Mayura** (translate) | 11 languages | Context preservation |
| **Sarvam-105B** (LLM) | 128K context, tool calling, structured output | "Tuned for Indic reasoning" |
| **Sarvam Vision** (doc AI) | 23-language OCR incl. handwritten | PDF/scan → JSON/CSV/Markdown/DOCX |

Sarvam's own positioning: models are *"trained and evaluated on Indian languages, accents, and code-mixed usage, **not adapted from an English-first baseline**"* (https://docs.sarvam.ai/). Bulbul v3 beat ElevenLabs and Cartesia in a Josh Talks blind eval, 20,000+ votes across 11 languages (https://www.sarvam.ai/blogs/bulbul-v3).

**So: what makes a Sarvam engineer say "that's real"** (INFERENCE, but tightly anchored to what they publish):
- ✅ **Code-mixed / Hinglish input or output** — this is the capability they benchmark against ElevenLabs and the thing OpenAI/Google demonstrably do worse. Using `code-mix` mode on Saaras or feeding Bulbul a raw Hinglish string is a one-line change that lands squarely on their proudest differentiator.
- ✅ **Voice in, voice out** — a full Saaras→LLM→Bulbul loop, not just TTS on the end.
- ✅ **A language that isn't Hindi.** Kannada (we're in Bengaluru), Tamil, Telugu, Marathi. Hindi is the default everyone reaches for; Kannada in a Bengaluru room is a *local* signal.
- ✅ **Sarvam Vision on a real Indian document** — a scanned government form, a handwritten note. Nobody will do this in 90 minutes and it maps to a whole BuildIn' Hours track ("Document Intelligence").
- ❌ **Wrapper tell:** English pipeline end-to-end, then `translate(final_answer, target='hi-IN')` as the last line. This uses one endpoint, is invisible in the UI, and is exactly "not central to the value".

### What Anakin is differentiated at (FACT)

Anakin.io is *"One API. The whole web."* — three distinct surfaces (https://anakin.io/):
- **Search API** — `POST https://api.anakin.io/v1/search`, params `prompt` + `limit` (default 5, max 20), returns AI-generated summary + structured results with citations, snippets, relevance scores, synchronous, **<312ms p99** (https://anakin.io/docs/api-reference/search/search)
- **URL Scraper / Crawl / Map** — any page → clean Markdown or JSON
- **Wire** — the flagship: **962+ sites, 5,255+ pre-built actions** with maintained typed schemas, e.g. `amazon.search_products`, `amazon.product_detail`, `amazon.reviews`; covers shopping, news (AP/BBC/CNBC/Reuters), finance (Robinhood), real estate, jobs, classifieds (https://anakin.io/products/wire)

Anakin's own pitch for Wire over naive scraping: *"every browser an agent doesn't open is a small miracle"* — **470× cheaper** than browser agents ($0.001 vs $0.47/call), zero wasted tokens because no raw HTML reaches the model (https://anakin.io/products/wire).

**So: what makes an Anakin engineer say "that's real"** (INFERENCE, anchored to their marketing):
- ✅ **Using Wire's structured actions, not just the URL scraper.** Wire is the product they are proudest of and the one that took 5,255 actions to build. A team that found `amazon.reviews` and used the typed schema will read as having actually explored the catalog. **Almost nobody in a 90-minute sprint will get past `scrape(url)`.** This is the cheapest available differentiation in the entire event.
- ✅ **Chaining Search → Scrape**, or Search → Wire: use Search to *find* the fresh sources, then Scrape/Wire to go *deep* on the top hits. That's two surfaces in one flow and it visibly demonstrates why the products are separate.
- ✅ **Showing the citations/source cards on screen.** The doc explicitly asks for "source display" in the core user flow, and the Search API returns citations natively — so surfacing them is free marks on both "visible" sponsor use and UX.
- ✅ Repeating their own efficiency framing back at them ("we used Wire instead of a browser agent — one typed call, no HTML in the context window") in the technical-clarity answer.
- ❌ **Wrapper tell:** one `scrape("https://...")` on a hardcoded URL, output dumped as raw markdown into an LLM prompt. That's the naive path Wire exists to replace, and they will recognise it instantly.

### The doc's own tips (FACT — these are organiser hints, treat as scoring hints)

> "Tip: If you add voice, **make the pipeline visible. Show the transcript, translated text, and playable audio.**"

> "Tip: Use Anakin.io on the server side only. Never put an API key in frontend code. **Cache one or two responses during the sprint so your demo stays fast.**"

The first tip is a direct instruction on how to satisfy the "visible" clause of the 25% criterion — render each stage of the chain as its own UI element. The second is explicit organiser permission to **pre-cache demo responses**. Take it: a cached response cannot rate-limit or time out at minute 88.

---

## 7. The 90-minute playbook: what is on screen at minute 88

### Time allocation (derived from the doc's own timeline)

| Clock | Minute | Do |
|---|---|---|
| 11:30–11:40 | 0–10 | **Pick the idea. Get both API keys. Do not code.** This is the 45%-of-score decision. Write the one-sentence pitch *first*; if it doesn't fit in one sentence, the idea is too big. |
| 11:40–12:05 | 10–35 | **"Make your first Sarvam and Anakin call work. Print real output before building the UI."** (verbatim from doc). Both APIs proven in a terminal before any HTML exists. **Cache the responses to JSON on disk as you go.** |
| 12:05–12:30 | 35–60 | Core flow: input → Anakin → Sarvam → visible result → source cards → error state. Single page. |
| **12:30** | **60** | **SUBMIT NOW.** Ugly-but-working. This is your insurance and the doc explicitly allows improving after. |
| 12:30–1:00 | 60–90 | Polish: loading states, one pre-filled example input, source cards, audio player, clean final screen. Re-submit / update. |
| **1:00 PM sharp** | 90 | Hard stop. |

### What must be on screen at minute 88

A **single page, already scrolled to the result**, showing — top to bottom, all at once, no scrolling required:

1. **The pre-filled example input** — the exact one you put in the submission form. Ideally a spoken Kannada/Hindi question with a visible "▶ replay my question" button.
2. **The Saaras transcript** in a labelled box: *"Heard (Kannada): …"* — proves STT ran.
3. **The Anakin source cards** — 3 cards, favicon + title + URL + snippet, labelled *"Live from the web via Anakin Search + Wire"*. Proves scraping ran, and proves it's *live* not hallucinated.
4. **The AI answer** in the local language, with inline citation markers pointing at those cards.
5. **A playable audio element**, already rendered, one click from speaking — Bulbul v3 output in the local language.
6. **A one-line architecture strip in the footer:** `voice → Saaras v3 → Anakin Search → Wire amazon.reviews → Sarvam-105B → Mayura → Bulbul v3`. This is your "technical clarity" 10% rendered as UI, and it lets a judge score the sponsor criterion without asking you a single question.

**The test:** a judge who walks past your laptop with the sound off, for four seconds, without talking to you, should be able to score Ideation, Sponsor use, and Working Product. If your screen requires you to narrate it, it fails the "visible result that judges can understand quickly" requirement.

### The 2-minute script (the doc says the idea must be explainable in two minutes)

- **0:00–0:20** — The user and the problem, one specific human. *"My mother reads Kannada. Every government scholarship page is in English PDF."* No market-size slide, no "in today's world".
- **0:20–1:10** — **Run the demo live from the pre-filled input.** Say what each on-screen box is as it fills. Let the audio play.
- **1:10–1:40** — The API chain, named by model: *"Saaras v3 for the code-mixed question, Anakin Wire for the structured page, Bulbul v3 for the Kannada answer."* Naming the actual models (not "Sarvam" and "Anakin") is the single strongest signal that you read their docs.
- **1:40–2:00** — One honest limitation and one next step. This is literally a form field and a rubric line ("tradeoffs, and next steps").

---

## 8. Anti-patterns that lose

| Anti-pattern | Why it loses | Evidence |
|---|---|---|
| **Bolting one API on at the end** (translate the final string; scrape one hardcoded URL) | Fails "meaningful, visible, and **central to the value**" — 25% of score | Rubric, verbatim |
| **Using only one sponsor API** | Disqualifying: *"Mandatory: use both Sarvam.ai and Anakin.io."* | Challenge doc |
| **Building "AI for X" (a platform)** | The doc pre-emptively names this failure three times: *"Not 'AI for shopping', but…"* | Challenge doc |
| **Building the Bengaluru Event Companion (idea 2)** | INFERENCE: the most obvious idea in a 300-person room; caps Originality (20%) through duplication | Inference |
| **Not submitting by 12:30 as insurance** | The 1:00 PM cutoff is stated twice as "sharp"; the doc explicitly permits improving after submitting | Challenge doc |
| **A live API call as the centrepiece of the demo** | Rate limits, cold starts, venue wifi at minute 88. The doc *itself* tells you to cache | Challenge doc tip, verbatim |
| **Invisible AI** — chain runs, only the final answer renders | Fails "visible", fails the doc's own tip to *"make the pipeline visible"* | Challenge doc tip |
| **API key in frontend code** | The doc explicitly warns against it; an Anakin engineer looking at your repo will see it | Challenge doc tip |
| **Hindi-only when you're in Bengaluru** | INFERENCE: Kannada is a free originality + local-relevance signal in this specific room | Inference |
| **Polishing UI before both API calls print real output** | The doc's timeline mandates the reverse order; UX is only 10% and Working Product only 10% | Challenge doc timeline |
| **A demo that needs narration to be legible** | Judging window is 30 min for up to ~300 registrants; judges will not sit with you | Inference from timings |
| **Chasing "Working Product" polish over idea sharpness** | It is 10%. Ideation + Originality is 45%. | Rubric, verbatim |

---

## 9. Confidence log

### FACT (with URL)
- Event details, hosts, 302 registered, agenda, venue — https://luma.com/ai-engineer-mixer
- **The full challenge doc including the six-criterion weighted rubric, mandatory dual-API rule, timeline, submission fields, five idea prompts, code starters, and organiser tips** — https://docs.google.com/document/d/132l_u2v_GOXswVySDP-ONb8gTzxLOcYZ0e5YaZJasGo/edit (fetched via `/export?format=txt`, HTTP 200, 9565 bytes)
- Sprint prize = Keychron keyboard for all winning team members — challenge doc
- WeMakeDevs AI Agents Assemble six judging dimensions, incl. two that explicitly name sponsor technologies — https://archive.wemakedevs.org/hackathons/assemblehack25
- WeMakeDevs Zerops Challenge requirements ("meaningfully involved", live URL, public source) — https://www.wemakedevs.org/hackathons/zerops
- WeMakeDevs × Stream criteria (Creativity, Implementation, Potential Impact) — https://wemakedevs-stream.devpost.com/
- Sarvam model surface, code-mix mode, Bulbul v3 code-switching, Josh Talks blind eval — https://docs.sarvam.ai/ , https://www.sarvam.ai/blogs/bulbul-v3
- Anakin Search API endpoint/params/schema/<312ms p99 — https://anakin.io/docs/api-reference/search/search
- Wire: 962+ sites, 5,255+ actions, 470× cheaper than browser agents, example actions — https://anakin.io/products/wire
- Sarvam BuildIn' Hours: 12h, 6,272 applied / 100 selected, ₹5L pool, ₹5k credits/team, four tracks — https://smestreet.in/infocus/zo-house-bengaluru-hosts-sarvam-ais-buildin-hours-hackathon-6272-applied-in-48-hours-100-got-in-12391041
- Sarvam × HackCulture Great Bengaluru Hackathon: 4700 regs, 150 teams, 50 Sarvam-track projects — https://x.com/SarvamAI/status/1905165495042535889
- Build With Anakin mini-hackathon, hosts Tosh Kothari + Aryan Bramhane — https://luma.com/w81h0ekt

- MLH judging plan: 4 min/project, 2 min demo, 3 rounds, science fair over 100 participants — https://guide.mlh.com/general-information/judging-and-submissions/judging-plan
- MLH rules: 4 equal criteria; code quality, pitch quality and novelty explicitly NOT judged; unfinished hacks still presented — https://github.com/MLH/mlh-hackathon-rules/blob/master/Rules.md
- "Show something working within about 90 seconds" (Jono Bacon); one flow beats a feature tour — https://blog.jetbrains.com/ai/2026/06/how-to-win-a-hackathon-notes-from-the-judging-table/
- Sponsor judge wants "deep use of the APIs", not a dumping ground — https://dev.to/cloudinary/how-to-win-a-hackathon-1377
- Backup demo video / screenshots as failure insurance — https://www.nicksingh.com/posts/win-hackathons-a-how-to-guide , https://angelhack.com/blog/hackathon-tips-for-winners/
- Devpost judging = 1-5 per criterion, up to six criteria — https://help.devpost.com/article/103-how-to-judge-an-online-hackathon

### INFERENCE (explicitly labelled, no URL)
- Judges are the listed hosts (Kunal Kushwaha + Anakin team). **Not published.**
- Judging is form-first/async given ~300 registrants and a 30-minute window.
- Idea 2 (Event Companion) will be the most duplicated; idea 5 (Scheme Navigator) the least.
- Most teams will use `scrape(url)` and never touch Wire, making Wire the cheapest differentiator.
- Kannada > Hindi as a local-relevance signal in a Bengaluru room.
- What "makes a sponsor engineer say it's real" is reasoned from each company's own marketing claims, not from any statement by a judge.

### COULD NOT FIND — stated plainly, not invented
- **No named judges** for this event anywhere.
- **No published list of winning projects** from any WeMakeDevs-run hackathon. The archive pages carry criteria and prizes but not winners.
- **No winners list for Sarvam BuildIn' Hours** or the Sarvam × HackCulture track.
- **No public statement by Sarvam or Anakin engineers** about what they reward in hackathon judging. Section 6's psychology is inference from product marketing.
- **No judged-outcome writeup exists for any 60-120 minute hackathon.** All verifiable "how to win" material targets 24-48h events; the 90-minute specifics here are extrapolation, flagged in §5.5.
- No source quantifies deployed-vs-localhost effect on scores; no source measures solo-builder win rate.
- Sarvam is **not named on the Luma page** at all; its sponsorship is established only by the challenge doc's mandatory-API rule. No Sarvam speaker is on the agenda.
- The doc's internal timing contradictions (build start 11:30 vs 11:40; announcement 1:30 vs 2:00 PM; Luma's 1:40 PM end) are unresolved. Only the 1:00 PM "sharp" deadline is stated consistently.
