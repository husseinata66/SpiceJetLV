# Requirement Traceability Matrix — Reissue Flow

| Field | Value |
|---|---|
| Scope | `reissue-flow` (shared scope under feature `reissue`) |
| Suite | `TestCases_ReissueFlow.md` Revision 7 (2026-10-04 — the twenty-one new cases collected into §13; `AC-37` added to the story; nine cases from DS-7; seven open questions answered; DS-6 settled; OQ-12 closed) |
| Produced by run | `run-009__2026-09-30_17-25-03__UserStory__ReissueFlowBusinessFeature` |
| Generated | 2026-09-30 |
| Status | **Approved** — Mohamed Soliman, 2026-10-04 (Stage 3 Human Review gate held). Discovery (`QA_Assessment_Report.md`) and the upstream `reissue-mapping` artifacts remain **Pending Review** |

The requirement unit is an **Overall Acceptance Criterion** from the story, supported by its
per-section ACs and edge cases. Every AC has at least one case. **Coverage is not the same as
verifiability** — the Verifiable column is the honest half.

## 1. Overall Acceptance Criteria → test cases

| AC | Requirement (short) | Test cases | Verifiable today |
|---|---|---|---|
| **AC-01** | Configuration controlled through Branch and Agency CRUD | TC-RFLOW-001, 002, 003, 004 | **Partial** — the positive side only; all three negatives need data (OQ-7). **TC-RFLOW-004's expected result is now fixed** (D-16): no flag precedence |
| **AC-02** | Auto Reissue displayed per the configured flag | TC-RFLOW-001, 002, 003, 010, 012 | **Partial** — DS-2 settled by D-14; the positive side and the credential negative are verified, the disabled-org negatives need OQ-7 |
| **AC-03** | Exchange Fees applied only when configured | TC-RFLOW-005, 006, 048 | **Partial** — configured side yes; unconfigured needs OQ-8 |
| **AC-04** | User can select the applicable flight from Itinerary | TC-RFLOW-010 | Yes |
| **AC-05** | System validates Auto Reissue applicability | TC-RFLOW-011, 012, 013, 014, 015, 016 | **Partial** — OQ-7 (DS-2 settled by D-14) |
| **AC-06** | Journey selection follows eligibility | TC-RFLOW-025, 027 | Partial |
| **AC-07** | Passenger selection follows eligibility | TC-RFLOW-022, 023, 024, 028 | Partial — mixed-eligibility party needs OQ-7 |
| **AC-08** | All required passengers selected by default, Not Split | TC-RFLOW-020, 021 | Yes |
| **AC-09** | Only online-booked offers can be reissued | TC-RFLOW-014 | **No** — needs an offline booking (OQ-7) |
| **AC-10** | Selected journey editable through the flight widget | TC-RFLOW-029, 030 | Yes |
| **AC-11** | Date, Origin, Destination, Cabin Class handled | TC-RFLOW-030, 040 | **Partial** — cabin never varied (OQ-7) |
| **AC-12** | The old flight date cannot be selected | TC-RFLOW-031 | Yes — never asserted, but runnable |
| **AC-13** | Round Trip cannot become Multi-City | TC-RFLOW-033 | Yes — round-trip data now held |
| **AC-14** | Results display the fare difference payable | TC-RFLOW-041, 049 | Yes |
| **AC-15** | Negative prices are not returned | TC-RFLOW-042, 062 | **Non-observation only** — the Refund path is out of scope by decision, never exercised |
| **AC-16** | Fare breakdown per passenger type | TC-RFLOW-045, 060 | Yes — labelling ruling pending (OQ-F4) |
| **AC-17** | Breakdown carries Base Fare, Taxes, Supplier Penalty, WT Change Fees | TC-RFLOW-046, 047, 048 | **Partial** — a real supplier penalty has never been seen |
| **AC-18** | Review Page shows new flight data and old flight price | TC-RFLOW-051, 052 | Yes |
| **AC-19** | Payable difference in the right-top area | TC-RFLOW-053 | Yes |
| **AC-20** | Wallet balance displayed and checked | TC-RFLOW-054, 055, 056, 057 | **Partial** — the insufficient-balance check needs OQ-11 |
| **AC-21** | Wallet and Banque Masr available | TC-RFLOW-058, 121 | **Partial** — selection only; paying is Forbidden (D-1) |
| **AC-22** | Price Changed popup on supplier reprice | TC-RFLOW-050, 065, 066, 067, 068 | **No** — a reprice cannot be forced (OQ-12) |
| ~~AC-23~~ | Exchange follows Init/Persist → Supplier → Update | **Moved to `reissue-mapping`** — Integration, no business surface. The per-section obligation is retained as TC-RFLOW-077 | **No** — needs DB or logs (OQ-9) |
| **AC-24** | New Booking Reference and Order ID | TC-RFLOW-069, 070, 072, 082, 083 | Yes on the positive path |
| **AC-25** | Not Booked, Booking Fail, Booked supported | TC-RFLOW-073, 074, 075, 076 | **Partial** — only `Booked`; the two failure states need OQ-10 |
| **AC-26** | Prices stored as differences | TC-RFLOW-086 | **No** — DB `Deferred` (OQ-9, DS-3). Declared Gap |
| **AC-27** | Reissue History maintains the original relationship | TC-RFLOW-105, 115, 125 | **Partial** — forward link yes, backward link unruled (OQ-F3) |
| **AC-28** | Reissue offers cannot perform Sync | TC-RFLOW-090 | Yes — on the Itinerary, not PNR Query |
| **AC-29** | Original offer status becomes Reissued | TC-RFLOW-071, 114, 123 | Yes |
| **AC-30** | `TT_FLIGHT_BOOK` carries `IS_AUTO_REISSUE` | TC-RFLOW-087 | **No** — schema assertion, no UI surface (OQ-9, DS-3). Declared Gap |
| **AC-31** | Change fee stored as Service Charge | TC-RFLOW-088, 089, 120 | **Partial** — needs the fee and service charge set to different values |
| **AC-32** | Confirmation displays the Reissue offer in the Reissue-specific UI | TC-RFLOW-091, 092 | **Partial** — no design exists to check against (OQ-13) |
| **AC-33** | Itinerary displays Auto Reissue History | TC-RFLOW-100, 101, 102, 103, 105 | Yes — never opened, but runnable |
| **AC-34** | PNR Query displays the ticketed Reissue in History | TC-RFLOW-110, 111, 113 | **Yes — observed expected result captured (run-009)** |
| **AC-35** | Wallet, Finance and all related reports reviewed | TC-RFLOW-119, 120, 121, 123, 124, 125, 126 | **Partial** — structure captured; only Sales Report run |
| **AC-36** | Existing Reports and PNR Query behaviour unchanged | TC-RFLOW-118, 127 | **Yes — baseline captured (run-009)** |
| **AC-37** *(added to the story 2026-10-04 — not part of the 2026-09-27 supply)* | Terms & Conditions are displayed on Review & Pay and **must be accepted before `Confirm & Charge`**; displayed again on the Confirmation as information | TC-RFLOW-142, 143, 144, 145, 148 | **Yes** — all five runnable; TC-RFLOW-143 establishes the refusal and stops, so no payment is needed |

**Totals:** **37** Overall ACs · **all covered by at least one case** · **13** fully verifiable today ·
16 partial · 7 not verifiable · 1 moved out.

**AC-37 is the only AC in this matrix that the story did not originally carry.** It was added on
2026-10-04 because the suite found a mandatory step on the payment path — accepting Terms & Conditions
before `Confirm & Charge` — with no Acceptance Criterion behind it. The finding came first; the AC
followed.

## 2. Edge cases → test cases

All 108 edge cases are covered. *(The story's groups sum to 108; ProjectContext §7.2 records 100 —
correct at review.)*

| Group | Edge cases | Test cases |
|---|---|---|
| 1. Prerequisites | 1.1–1.8 | TC-RFLOW-001 … 008 |
| 2. Eligibility | 2.1–2.14 | TC-RFLOW-014, 016, 017, 018, 019, 024, 025, 026, 027, 028, 020, 021, 022 |
| 3. Search / Re-shop | 3.1–3.18 | TC-RFLOW-031 … 040, 042, 043, 044, 045, 046, 047, 048, 050 |
| 4. Review & Pay | 4.1–4.15 | TC-RFLOW-055, 056, 057, 058, 059, 061, 062, 063, 064, 065, 066, 067, 068 |
| 5. Exchange | 5.1–5.18 | TC-RFLOW-069 … 090 |
| 6. Booking Confirmation | 6.1–6.8 | TC-RFLOW-091 … 099 |
| 7. Itinerary | 7.1–7.9 | TC-RFLOW-100 … 108, 015, 107 |
| 8. PNR Query | 8.1–8.9 | TC-RFLOW-110 … 118 |
| 9. Reports | 9.1–9.9 | TC-RFLOW-119 … 127 |

## 2.1 Requirements with no AC and no edge case — added at review, 2026-10-04

**Twelve cases were added at the user's request on 2026-10-04 covering two areas the story does not
specify.** They trace to the instruction that asked for them, not to an AC — recorded here so the
authority behind each expected result is not lost.

| Requirement | Source | Test cases | Verifiable today |
|---|---|---|---|
| An **inactive** airport — one switched off by the administration active/inactive flag — is not offered in the Reissue flight widget's Origin or Destination, is not accepted if it is deactivated mid-session or pasted in as a code, and returns when reactivated | **User, 2026-10-04.** No AC; the story is silent on airport status | TC-RFLOW-128, 129, 130, 131, 132 | **Conditional** — yes if administration access to the airport status flag is held in the test environment; otherwise all five are Declared Gaps |
| The **FARE HELD countdown** on Review & Pay starts at **15 minutes**, decrements in real time, is not reset by a refresh or by re-opening the same offer, and **at zero the offer is no longer available** | **User, 2026-10-04** — the expiry rule is the user's own, and is the authority TC-RFLOW-135 asserts against | TC-RFLOW-133, 134, 135, 136, 137 | Yes — runnable on the clean reissue booking |
| The app's 15-minute hold never outlasts the supplier's own `validUntil`, and an expired offer is not charged even when payment is submitted at the instant of expiry | **User, 2026-10-04**, over concern **CN-21** from `reissue-mapping` | TC-RFLOW-138, 139 | **No** — no offer with a sub-15-minute supplier validity is held, and the expiry race needs a human-performed payment timed to the second. Declared Gaps |
| **Terms & Conditions** — **now `AC-37`, see §1.** Raised here first as `DS-7` from the End-to-End Workflow documents (2026-10-04) and confirmed on screen by the user; *"T&C" appeared nowhere in the story*, which was amended the same day | **`DS-7`** → **`AC-37`** | TC-RFLOW-142, 143, 144, 145, 148 | Yes — TC-RFLOW-143 establishes the refusal and stops, so no payment is needed |
| The payable amount is labelled **"Due Now"** and equals fare difference + supplier penalty + WT change fee | **`DS-7`** — workflow diagrams (`Sum Total Fees → Supplier+WT+Diff → Display Due Now`); user-confirmed | TC-RFLOW-140, 141 | Yes — runnable on held data |
| An **insufficient wallet offers a top-up** and returns to a payable state without restarting the Reissue | **`DS-7`** — workflow diagrams (`Insufficient → Top up wallet → re-check balance`); user-confirmed | TC-RFLOW-146, 147 | **No** — needs **D-22**'s low-balance wallet, committed but undelivered. The top-up itself is human-performed |

**What the screen does at zero was not specified, only that the offer becomes unavailable.** The
wording of the message, and whether the user is returned to Search automatically, are recorded by the
executor rather than asserted.

## 3. Clarifications and discrepancies → test cases

| Item | Statement | Case | State |
|---|---|---|---|
| ~~**CL-1**~~ | ~~Credential not in the org's selection refuses the reissue with a named message~~ — superseded by D-14 | — | Withdrawn |
| **CL-2** | Supplier must be a GDS on the hard-coded list | TC-RFLOW-013 | Positive verified; negative needs OQ-7 |
| **CL-3** *(amended by D-14)* | Status `Booked` **and** "Ticketed Document" bar; booking locked by the current user (Admin only — no lock on the Portal) | TC-RFLOW-011, 015 | Lock verified; the `Booked`-but-not-"Ticketed Document" negative needs OQ-7 |
| **D-14** | Reissue button displayed only when all six hold: org checkbox on · booking's credential in the picker · `Booked` + "Ticketed Document" · online · locked by current user · reissue-capable GDS | TC-RFLOW-010 (all six, positive); 002, 003 (checkbox); 012 (credential); 015 (status); 014 (online); 011 (lock); 013 (supplier) | Positive and credential/lock verified; checkbox, online, supplier and "Ticketed Document" negatives need OQ-7 |
| **DS-2** | Button hidden vs shown-and-refused | TC-RFLOW-012 | **Settled — D-14**: hidden |
| **DS-4** | "Banque Misr" vs "Banque Masr" | TC-RFLOW-058 | Expected result written against the application's own label |
| **DS-5** | AC-28 vs Sync being out of scope | TC-RFLOW-090 | Resolved — absence asserted, Sync never exercised |
| ~~**DS-6**~~ | Branch/Agency flag precedence | TC-RFLOW-004 | **Settled — D-16 (2026-10-04)**, restating `PO-16`: no precedence; the flag of the organisation **that created the booking** governs. Expected result fixed; OQ-7 data still needed |
| **D-1** | Platform stops at Review & Pay; the human pays | Every §8–§12 case | Enforced throughout |
| **D-9** | A negative difference must never appear | TC-RFLOW-042, 062 | Asserted; never exercised |
| **D-11** | The change fee is per passenger, infants included | TC-RFLOW-005, 048 | Verified |

## 4. Confirmed behaviours → assertion cases

Correct **by design** (ProjectContext §2.5 of the mapping scope, §1.3 here). A deviation is the
failure; none may ever be raised as a defect.

| Behaviour | Case |
|---|---|
| The rule engine does not apply to a reissued ticket — the agency earns the change fee alone | TC-RFLOW-060, 088 |
| The change fee is agency-configured, app-origin, added after conversion | TC-RFLOW-005, 048 |
| The exchange rate is a multiplier; an old ticket keeps its issue-time rate | TC-RFLOW-052 |
| Negative-base-fare offers are filtered by the core service | TC-RFLOW-042 |
| `creditAgency` scopes the agency channel only — Admin and Portal wallets differ **by design** | TC-RFLOW-054 |
| Reissue controls are lock-gated | TC-RFLOW-011 |

## 5. Open questions → the cases they block

| # | Question | Blocks |
|---|---|---|
| ~~**OQ-7**~~ *(D-18 — will be supplied; awaiting delivery. TC-RFLOW-002, 003, 004 never needed it — `PO-25`)* | Negative-path test data — offline booking, unlisted supplier, disabled org, mixed-eligibility party, non-Economy cabin, multiply-reissued booking | TC-RFLOW-002, 003, 004, 013, 014, 015, 016, 019, 024, 026, 040, 104 |
| ~~**OQ-8**~~ *(D-19 — will be supplied; awaiting delivery)* | Unconfigured / invalid Exchange Fees | TC-RFLOW-006, 007, 008, 089 |
| ~~**OQ-9**~~ *(D-20 — credentials will be supplied; never stored in this repo, layer lifted by `scope-change`)* | Read-only DB access | TC-RFLOW-077, 078, 080, 084, 086, 087 |
| **OQ-10** *(D-21 — partly answered: real failed bookings will be supplied. Outcome assertions open read-only; during-the-failure behaviour stays unreproducible)* | Failure-path statuses and fault injection | TC-RFLOW-017, 035, 036, 044, 061, 074, 075, 076, 078–085, 093, 094, 095, 096, 106, 108, 122 |
| ~~**OQ-11**~~ *(D-22 — will be supplied; awaiting delivery)* | Low-balance wallet | TC-RFLOW-056, 057 |
| ~~**OQ-12**~~ | Forced supplier reprice — **closed as D-15 (2026-10-04): it cannot be forced.** Accepted as untested, no longer awaiting an answer | TC-RFLOW-050, 064, 065, 066, 067, 068 |
| **OQ-13** *(D-23 — partly answered: a screenshot of the current build. A visual-regression baseline, **not an oracle**; AC-32's design half stays a Declared Gap)* | The agreed Reissue-specific UI design | TC-RFLOW-092 |
| **OQ-F1** | Should any report identify a reissue? | TC-RFLOW-125, 126 |
| **OQ-F2** | Is counting a reissue as a second full sale intended? | TC-RFLOW-124 |
| **OQ-F3** | Must Reissue History link backwards? | TC-RFLOW-105, 115 |
| **OQ-F4** | What should the reissue columns be labelled? | TC-RFLOW-060 |
| **CN-21** *(from `reissue-mapping`)* | The app's fare-hold countdown and the supplier's offer validity are two separate clocks; their interaction is unverified, and no offer with a sub-15-minute `validUntil` has been observed | TC-RFLOW-138, 139 |
| **OQ-A1** *(new, 2026-10-04)* | Is administration access to the airport **active/inactive** flag available in the test environment? Five cases are counted as runnable on the assumption that it is | TC-RFLOW-128, 129, 130, 131, 132 |
| ~~**DS-2**~~ | ~~Hidden button, or shown-and-refused?~~ — answered by D-14 (hidden), 2026-10-01 | TC-RFLOW-012 |
| ~~**DS-6**~~ | Branch/Agency flag precedence — **settled by D-16 (`PO-16`)** | TC-RFLOW-004 |

## 6. Findings — context only, no regression cases

**Defect-regression cases are excluded from this suite by the user's instruction (2026-09-30).** The
seventeen open findings are listed here so the relationship is traceable, and because thirteen cases
are **expected to fail today** where the story's requirement is what a finding says is missing.

| Finding (scope) | Case stating the requirement it violates |
|---|---|
| Passenger left with no travel document *(mapping, Critical)* | TC-RFLOW-072 |
| All ticket numbers blank after exchange *(mapping, High)* | TC-RFLOW-072, 091, 095 |
| Wallet debited the rounded amount *(mapping, High)* | TC-RFLOW-119 |
| Ticket number lost from the booking record *(mapping, High)* | TC-RFLOW-072 |
| Confirmation fare details do not sum *(mapping, High)* | TC-RFLOW-091 |
| Supplier penalty presented as tax *(mapping, Medium)* | TC-RFLOW-046 |
| Change fee written into the service-charge field *(mapping, Medium)* | TC-RFLOW-088 |
| Opaque 409 on book *(mapping, Medium)* | TC-RFLOW-076 |
| Fare groups collapsed, per-passenger tax wrong *(mapping, Medium)* | TC-RFLOW-045 |
| Filtered result reported as an empty market *(mapping, Medium)* | TC-RFLOW-034 |
| Invoice records one charge three ways *(mapping, Medium)* | TC-RFLOW-120 |
| Currently-ticketed total rounded *(mapping, Low)* | TC-RFLOW-052 |
| Reissue History counts rows not reissues *(mapping, Low)* | TC-RFLOW-103 |
| Portal wallet renders three decimals *(mapping, Low)* | TC-RFLOW-054 |
| Itinerary times shifted by browser time zone *(this scope, Medium)* | TC-RFLOW-109 |
| Reissue columns carry the difference under a fare label *(this scope, proposed High)* | TC-RFLOW-060 |
| One charge reported three ways across screens *(this scope, proposed Medium)* | TC-RFLOW-124 |
| Reissue History has no backward link *(this scope, proposed Low)* | TC-RFLOW-105, 115 |
