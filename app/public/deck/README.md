# Davaa Sach — pitch deck

Open **http://localhost:3000/deck/** (the app's own express server already serves it —
no second process, no build step).

18 slides. Keys: `←` `→` move · `F` full screen · `R` replay the cold open ·
`N` presenter notes (second window: timer, notes, next-slide peek) · `P` export PDF.

## Team photos (end credits, slide 18)

**Done — all four real photos are cropped and in place.** Originals are in `team/src/`,
crops are `team/{ashish,joshua,anil,mohan}.jpg`. All four detected a face
(`mode=face`, none fell back to a guess).

To replace a photo:

1. Drop the new original into `team/src/`, named exactly:
   `ashish.*`, `joshua.*`, `anil.*`, `mohan.*` (any of .jpg .jpeg .png .heic .webp)
2. Run `./team/make-team.sh`
3. Reload the deck.

`make-team.sh` runs `team/facecrop.swift` (compiled), which uses the macOS **Vision**
face detector to produce a 720×720 face-centred square per photo — the crop is measured,
not eyeballed. It prints a mode per photo:

- `mode=face` — a face was found and the crop is centred on it.
- `mode=fallback-portrait` — no face found; it used an upper-centre crop. **Check that one
  by eye**, it is a guess.

Tune the framing in `facecrop.swift`: `HEAD` (2.35) is how much wider than the face box the
crop goes, `EYELINE` (0.42) is where the face sits vertically.

## Things worth knowing before you present

- The Devanagari line in the cold open is the **verbatim** `saaras:v3` transcript of
  "Dolo 650 safe hai kya?" — the digits come back as Hindi words, which is exactly why the
  extraction step exists. Say the words "code-mixed" out loud when it types.
- Every Kannada / Hindi / Telugu / Tamil string came from `sarvam-translate:v1`, not from
  hand-typed entities. Verified rendering in the real four Anek faces, not a fallback.
- Slides are `min-height:100vh; overflow:hidden`, so anything taller than the viewport is
  CLIPPED rather than scrollable. Every slide was measured to fit at both 1440×810 and
  1280×720 (the size the PDF export renders at). If you add content, re-measure.
- Names/roles on the credits slide are four plain HTML blocks at the top of `#s17` — edit
  them there, nowhere else.
