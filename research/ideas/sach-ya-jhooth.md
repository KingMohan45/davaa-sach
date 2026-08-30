## 2. Sach ya Jhooth — verdict on a forwarded WhatsApp voice note

**One-line pitch.** Forward the voice note your uncle sent about a government payout or a job offer, and get a spoken, cited verdict on whether it is real.

**The user.** Ramesh, 41, Hindi-speaking driver in Bengaluru. He receives 15 forwards a day about schemes and jobs; several are advance-fee scams. He cannot verify a claim because verification means reading English news and a `.gov.in` page.

**Live data source.** Anakin live web search itself is the source, constrained to an official-domain allowlist (`*.gov.in`, `*.nic.in`, PIB) plus fact-check outlets. `https://www.pib.gov.in/allRel.aspx` — **VERIFIED REACHABLE**, HTTP 200, 141 KB real HTML, 41 KB visible text; PIB runs the government's own Fact Check unit, which makes it the perfect authority anchor.

**Sarvam load-bearing.** The input is *audio he did not write* — STT is not a convenience, it is the only way in. Saaras handles the Hindi/code-mix reality of a real forward. Bulbul speaks the verdict so he can forward *that* back to the group, which is the actual viral mechanic.

**Anakin load-bearing.** A scam claim is minted this week; it is definitionally not in weights. Search + scrape of the named official domain is the entire verification step.

**Demo.** Play a real-sounding Hindi voice forward out loud → transcript → live fetches → red "no such scheme, PIB Fact Check says X" card → spoken Hindi rebuttal you could forward back.

**Build risk: LOW.** No brittle scraper anywhere. This is the safest build on the list.

**Differentiation.** High on originality, but carries the *"it is a search wrapper"* perception risk that the OpenAI guidance above shows judges actively hunt for. Defend it with a structured verdict card, an explicit official-source allowlist, and a "what to do next" action — never a chat box.

---

(Extracted from research/ideation.md — shortlist rationale + kill list live there.)
