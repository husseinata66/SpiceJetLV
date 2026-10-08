# Discovery Coverage Summary — reissue-mapping (run-007, Stage 2)

- **Scope:** Supplier Features → `reissue` → Shared scope `reissue-mapping`
- **Upstream:** `context/ProjectContext.md` Revision 12
- **Unit of coverage:** a **(mapping rule × condition) pair** — never a booking and never a screen
  (ProjectContext §2.4, user decision 2026-09-27: *"we should design test cases that covered all the mapping"*)
- **Status:** Pending Review

> **Why the unit matters, restated because it governs every number below.** This run checked 17 offers
> × 2 bookings, twice, and still evidenced `penalty` only at zero. Thirty-four more offers on the same
> route would have added nothing. Coverage counted in bookings hides that; coverage counted in
> conditions makes it the first thing you see.

## 1. Mapping rules — hop A (core service → Admin/Portal API → UI)

| Rule | Subject | Coverage | Evidence |
|---|---|---|---|
| A1 | Additional base fare | **Verified** — equal on 17/17 ×2 bookings, and 18/18 on scenario 10 | s1, s10 |
| A2 | Additional tax & fees | **Verified as a value.** Roll-up composition now evidenced per tax code on s10 (ADT `XL 2.16 + E3 22.4 + IO 316.0 = 340.56`) | s10 |
| A3 | Supplier fee | **Verified, and RSK-M5 closed.** Previously zero-only; s10 carries a real penalty 1,306.80 AED / 13,068.00 EGP | s10 |
| A4 | DUE NOW / Amount payable | **Verified** — screen = core × ROE + change fee, on all 18 offers | s10 |
| A5 | Change fee | **Verified against configuration.** Exchange Fee rule "Dubai" = 25 Fixed Amount, By Pax → 25 × 6 = 150 | s10, Admin rule 1741 |
| A6 | Currently ticketed · Total | **Defect** — R02, reproduced at ROE 9 and at ROE 0.1 | s1, s10 |
| A7 | Breakdown per passenger type | **Verified** — per-type groups confirmed and summing, incl. 2 Adult + 2 Child + 2 Infant | s9, s10 |
| A8 | Result flight times | **Defect** — R01 (sibling scope). s10 sharpens it: the *search results* screen shows 06:10 correctly while *Itinerary* shows 08:10 for the same flight | s10 |
| A9 | Reissue availability | **Suspect — RSK-M3 open.** core answered 200 "changeable" for a nonsense credential | s1 |
| A10 | Wallet · Your Balance | **Closed.** Composition explained and confirmed intended; R16 withdrawn, R17 raised | wallet-OQM7 |
| A11 | Review & Pay lines | **Captured and now reconciled** on s10 — every line summed against its own total | s10 |
| A12 | Returned but not displayed | **Partially exercised.** The oracle's one catchable omission; no instance found where a core value was returned and silently dropped | all |

## 2. Mapping rules — hop B (Sabre → core service)

| Rule | Subject | Coverage | Evidence |
|---|---|---|---|
| B1 | `modifyPrice.baseDifference` | **Verified** — 17/17 ×2, 18/18 on s10 | s1, s10 |
| B2 | `modifyPrice.taxDifference` | **Verified** — same | s1, s10 |
| B3 | `modifyPrice.penalty` | **Verified with non-zero values.** DS-M4 resolved in the field map's favour | s10 |
| B4 | `modifyPrice.totalPayable` | **Confirmed straight mapping** for the current configuration | s1, s10 |
| B5 | Passenger-type codes | **Codes map.** Population equivalence still unconfirmed | s9, s10 |
| B6 | Segment departure times | **Supplier and core agree** — which localises R01's corruption to the app layer | s10 |
| B7 | `originalPaidAmount` | **Verified** exact at supplier and core | s1 |
| B8 | Ticket / coupon status | **Now formally mapped** on s10: original `Exchanged`, new ticket + EMD live, per traveler | s10 |
| B9 | **Negative differences** | **NEVER EXERCISED — Declared Gap G1.** The highest-risk unmapped path | — |
| B10 | Sabre fields core does not republish | Recorded for the contract owner; not a defect source under §2.0 | — |

## 3. Chain-level checks

| Check | Coverage |
|---|---|
| C1 — same offer count, same values end to end | **Verified.** 17/17 on two bookings twice; **18/18 aligned across all three layers** on s10 |
| C2 — Portal/Admin parity | **Verified.** Portal `totalPayable` = core + change fee |
| C3 — stability across polls | **Verified.** core values unchanged across repeated polls |

## 4. Conditions matrix (ProjectContext §2.4)

| Dimension | Required values | Covered | Not covered |
|---|---|---|---|
| **Charge type** | Add collect · Even · **Refund** | Add collect | **Even**, **Refund** |
| **Sign** | positive · zero · **negative** | positive, zero | **negative** |
| **Penalty** | zero · **non-zero** · `totalTaxOnFee` non-zero | zero, **non-zero (s10)** | `totalTaxOnFee` non-zero |
| **Empty/null form** | Sabre empty string vs `0` vs absent | `0`, and absent (s10 offer 1 omits `totalFee` entirely) | empty string |
| **PTC mix** | ADT · ADT+CHD · ADT+CHD+INF · **multiple ADT in different fare groups** | all three mixes | **multiple ADT priced unalike** |
| **Tax lists** | codes present for one type and not another · **`XT` negative** | asymmetric codes (s10 Infant lacks `IO` and `S4`) | **`XT` negative** |
| **Fare groups** | one · **several priced unalike** · differing currency | one | **several unalike**, differing currency |
| **Trip type** | one-way · round trip · multi-city | **all three** | — |
| **Cabin / route** | at least one beyond CAI→JED Economy | CAI→RUH, CAI→MED→JED | non-Economy cabin |
| **Rounding** | exact vs `…RoundedUp` · the float artefact | **all three** | — |
| **Time zone** | browser at UTC · Africa/Cairo · Asia/Dubai | browser default only | **UTC, explicit Cairo / Dubai** |
| **Absence** | a core field the design omits · a designed field the screen lacks | partial | — |
| **Exchange rate** *(dimension added by this run)* | more than one ROE | **9 and 0.1** | — |
| **Rule engine** *(dimension added by this run)* | markup · discount · service charge, on the original and on the reissue | **all three, both states** | — |

## 5. Declared Gaps — conditions with no test data

Per §2.4 a condition with no data is **Not Testable** and is recorded as a Declared Gap against the
rule it would have covered. It is never quietly dropped and never reported as covered.

| Gap | Rule left uncovered | Needs | Question |
|---|---|---|---|
| **G1** | **B9**, A1, A2 | A booking whose re-shop is **cheaper** — a Refund / negative difference | **OQ-M4** |
| **G2** | A7, B5, and the "first published fare applied to all passengers" risk | A party Sabre splits into **several fare groups priced unalike** | **OQ-M10 / OQ-M15** |
| **G3** | A2, the index-alignment risk | A fare carrying a **negative `XT`** tax | **OQ-M15** |
| **G4** | A3, B3 | A fare with **`totalTaxOnFee` non-zero** | **OQ-M15** |
| **G5** | A1–A4, B1–B4 | A **non-Economy cabin** | **OQ-M15** |
| **G6** | A8, B6 | Browser at **UTC** and at explicit **Africa/Cairo** / **Asia/Dubai**. R01's mechanism is inferred, not demonstrated across zones | **OQ-M2** |
| **G7** | A3, B3 | Sabre returning an **empty string** rather than `0` or an absent field | §1 q3 |
| **G8** | — | **`logs/detail.log`**, never accessible in this run. Blocks the *cause* of R06, R07, R11, R13 and R18 — five findings recorded with cause **not established** | — |
| **G9** | B8 | Per-passenger supplier verification for scenarios **1, 2, 5, 6, 8b**, which predate the R13 check. s9 failed that check, s10 passed it; those five are **unverified either way** | — |

**G8 and G9 are the two that most constrain what Stage 3 can assert.** G8 means five findings name a
symptom without a mechanism. G9 means the R13 fulfilment defect may be sitting undetected in five
already-completed exchanges.

## 6. Honest coverage position

**Deliberately not expressed as a percentage.** ProjectContext §2.4 defines full coverage as every rule
in §2.1–§2.3 covered against every condition that could break it. That is not the case here, and a
single figure would obscure which half is missing.

| | Count |
|---|---|
| Mapping rules defined (A + B + C) | **25** |
| Rules with verified, paired, multi-condition evidence | **17** |
| Rules verified but carrying a named residual unknown | **4** (A2 composition, A9 suspect, A12 partial, B5 population) |
| Rules carrying a raised defect | **3** (A6, A8, A10) |
| Rules **never exercised** | **1** (B9) |
| Conditions in §2.4 fully covered | **6 of 13**, plus the 2 dimensions this run added |
| Declared Gaps | **9** |

**What is strong — the value-mapping spine.** Both hops were re-verified offer-by-offer under
flight-signature alignment: 18 offers inside one capture window, two currencies at two exchange rates,
one-way and round-trip and multi-city, parties of 2 Adult + 2 Child + 2 Infant — and returned **zero
value mismatches**. Where the chain is wrong, it is wrong in the *application*, not in the mapping
from the supplier. That is a genuinely useful result and it is the main thing discovery established.

**What is weak.** The negative / refund path has never been touched at all (B9). Multi-fare-group
pricing has never been seen, which leaves the known "first published fare applied to every passenger"
risk unexercised. Five of the ten scenarios were never checked for the R13 fulfilment defect.

## 7. Verdict for Stage 3

**The mapping is not finished being tested.** Discovery established that the mapping is correct
*wherever it was exercised*; it did not exercise every path. The residual risk sits in paths never
run rather than in paths found wanting — which is exactly the shape a sampled discovery cannot close
and that designed test cases exist to close.

Stage 3 is therefore **required** for this scope (§2.4), and its suite must carry one case per
(rule × condition) pair, with the nine Declared Gaps written in as **Not Testable** rows tied to the
question blocking each, never omitted.
