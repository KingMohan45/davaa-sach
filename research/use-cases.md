# Davaa Sach — the four use cases, and why they are one engine

Everything below runs on the same pipeline: **speech in any Indian language → live regulator
evidence via Anakin → reasoning over that evidence → an answer spoken back in the user's language.**
No new infrastructure per use case, only a different question asked of the same evidence.

---

## 1. Patient: "is this medicine safe?" (`/api/check`)

Someone holds a strip and asks out loud. We check it against this month's CDSCO
Not-of-Standard-Quality and spurious-drug alerts and answer in their language, with the live
regulator link.

**Live proof:** `Telma 40` returns **flagged** — a genuine CDSCO spurious alert, corroborated by
The South First's May 2025 quality-surveillance report. `Dolo 650` returns **clear**, citing the
NSQ alerts page and the nine alerts it read. Cold 50s, cached 0.024s.

---

## 2. Doctor: "second-read what I am about to prescribe" (`/api/prescription`)

The doctor dictates the plan in ordinary speech. We extract the drugs and check the prescription
**as a set**, because the dangerous thing is often not any single drug but the combination, or the
match between the drug and the stated condition.

Four evidence streams per drug, in parallel:
- WHO falsified-medicine alert index (Anakin url-scraper, one scrape shared across the prescription)
- international regulatory action, by country (Anakin search)
- openFDA `drug/label` — `contraindications`, `drug_interactions`, `boxed_warning`
- openFDA `drug/enforcement` — recalls, with country and class
- CDSCO NSQ (Anakin search)

**Live proof, two different failure modes caught:**

| Input | Result |
|---|---|
| *"AFib patient, starting Warfarin 5 mg and also Aspirin 150 for chest pain"* | **stop** — high-severity interaction: combined anticoagulant and antiplatelet, major bleeding risk. The drugs are individually fine; the *decision* is the hazard. |
| *"Starting her on Nimesulide 100 and Pan 40 for the back pain"* | **caution** — Nimesulide restricted in Europe (EMA referral, hepatotoxicity), never US-approved, CDSCO-banned under 12 in India. Legal to prescribe here, and the doctor should know. |

Total 13.8s. It is a second reader, never an override: the prescribing decision stays the clinician's.

---

## 3. Patient: "here is what I am feeling" (`/api/symptoms`)

Symptoms in the patient's own words, code-mixed if that is how they speak. We restate them
clinically, name the **generic classes** approved for that problem (never a brand, never a dose),
flag anything under an international alert, set an urgency, and hand over three questions to ask
their doctor. Hard rails: it never prescribes and never tells anyone to skip a clinician, and it
escalates to `emergency` for cardiac, stroke, breathing, bleeding, or an infant with high fever.

---

## 4. Cross-border: the foreign patient and the Indian doctor

India treats roughly two million international patients a year, plus a large telemedicine load
from the Gulf, Africa, Bangladesh, Nepal and the diaspora. The consultation happens here; the
patient then goes home and has to actually obtain the medicine. Three things break at that border,
and all three are invisible from inside an Indian clinic:

1. **The drug is restricted where the patient lives.** This is not hypothetical: Nimesulide is
   ordinary practice in India and restricted across the EU for liver injury. A prescription written
   in Bengaluru can be unfillable, or unsafe to continue, in Frankfurt.
2. **The drug is simply not available there.** Different market, different approvals.
3. **The brand name means nothing there.** Indian brands rarely survive the border; the patient
   needs the generic and its local equivalent.

**This is the same engine with the country as a parameter.** We already resolve "which regulators
have acted on this drug, and how" — the ban search is per-country by construction. Adding the
patient's country turns that into: *is this dispensable where they live, and if not, what is the
therapeutically equivalent thing that is?* The generic name comes from the openFDA label we already
fetch; availability and the local brand come from one more Anakin search scoped to that country.

It is also the clearest commercial wedge in the set. Uses 1 to 3 are a public good. Use 4 is a
concrete operational problem that international-patient departments at Indian hospitals have today,
and getting it wrong means a patient flies home with a prescription they cannot fill.

---

## Why one engine covers all four

The expensive, hard part is the same every time: **getting trustworthy, current, regulator-grade
evidence about a drug, and delivering the answer to someone in a language they actually speak.**

- Anakin supplies evidence that cannot be in any model's weights — this month's alerts, this
  country's regulatory action, today's pharmacy listing.
- Sarvam removes the language barrier at both ends, in the code-mixed speech people actually use.
- The reasoning layer only ever *reads* that evidence. It is not asked to recall drug facts, which
  is exactly where a model would be least trustworthy and least auditable.

Change the question, not the plumbing.
