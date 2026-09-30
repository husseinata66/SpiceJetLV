# Requirement Traceability Matrix — Reissue Flow

| Field | Value |
|---|---|
| Scope | `reissue-flow` (shared scope under feature `reissue`) |
| Suite | `TestCases_ReissueFlow.md` Revision 1 |
| Produced by run | `run-009__2026-09-30_17-25-03__UserStory__ReissueFlowBusinessFeature` |
| Generated | 2026-09-30 |
| Status | **Pending Review** |

The requirement unit is an **Overall Acceptance Criterion** from the story, supported by its
per-section ACs and edge cases. Every AC has at least one case. **Coverage is not the same as
verifiability** — the Verifiable column is the honest half.

## 1. Overall Acceptance Criteria → test cases

| AC | Requirement (short) | Test cases | Verifiable today |
|---|---|---|---|
| **AC-01** | Configuration controlled through Branch and Agency CRUD | TC-RFLOW-001, 002, 003, 004 | **Partial** — the positive side only; all three negatives need data (OQ-7) |
| **AC-02** | Auto Reissue displayed per the configured flag | TC-RFLOW-010, 012 | **Blocked on DS-2** — hidden vs shown-and-refused unruled |
| **AC-03** | Exchange Fees applied only when configured | TC-RFLOW-005, 006, 048 | **Partial** — configured side yes; unconfigured needs OQ-8 |
| **AC-04** | User can select the applicable flight from Itinerary | TC-RFLOW-010 | Yes |
| **AC-05** | System validates Auto Reissue applicability | TC-RFLOW-012, 013, 015, 016 | **Partial** — DS-2 and OQ-7 |
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

**Totals:** 36 Overall ACs · **all covered by at least one case** · 12 fully verifiable today ·
16 partial · 7 not verifiable · 1 moved out.

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

## 3. Clarifications and discrepancies → test cases

| Item | Statement | Case | State |
|---|---|---|---|
| **CL-1** | Credential not in the org's selection refuses the reissue with a named message | TC-RFLOW-012 | **DS-2 open** — observed behaviour contradicts it |
| **CL-2** | Supplier must be a GDS on the hard-coded list | TC-RFLOW-013 | Positive verified; negative needs OQ-7 |
| **CL-3** | Status `Booked`; booking locked by the current user | TC-RFLOW-011, 015 | Verified |
| **DS-2** | Button hidden vs shown-and-refused | TC-RFLOW-012 | **Pending Confirmation** |
| **DS-4** | "Banque Misr" vs "Banque Masr" | TC-RFLOW-058 | Expected result written against the application's own label |
| **DS-5** | AC-28 vs Sync being out of scope | TC-RFLOW-090 | Resolved — absence asserted, Sync never exercised |
| **DS-6** | Branch/Agency flag precedence | TC-RFLOW-004 | **Pending Confirmation** |
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
| **OQ-7** | Negative-path test data — offline booking, unlisted supplier, disabled org, mixed-eligibility party, non-Economy cabin, multiply-reissued booking | TC-RFLOW-002, 003, 004, 013, 014, 016, 019, 024, 026, 040, 104 |
| **OQ-8** | Unconfigured / invalid Exchange Fees | TC-RFLOW-006, 007, 008, 089 |
| **OQ-9** | Read-only DB access | TC-RFLOW-077, 078, 080, 084, 086, 087 |
| **OQ-10** | Failure-path statuses and fault injection | TC-RFLOW-017, 035, 036, 044, 061, 074, 075, 076, 078–085, 093, 094, 095, 096, 106, 108, 122 |
| **OQ-11** | Low-balance wallet | TC-RFLOW-056, 057 |
| **OQ-12** | Forced supplier reprice | TC-RFLOW-050, 064, 065, 066, 067, 068 |
| **OQ-13** | The agreed Reissue-specific UI design | TC-RFLOW-092 |
| **OQ-F1** | Should any report identify a reissue? | TC-RFLOW-125, 126 |
| **OQ-F2** | Is counting a reissue as a second full sale intended? | TC-RFLOW-124 |
| **OQ-F3** | Must Reissue History link backwards? | TC-RFLOW-105, 115 |
| **OQ-F4** | What should the reissue columns be labelled? | TC-RFLOW-060 |
| **DS-2** | Hidden button, or shown-and-refused? | TC-RFLOW-012 |
| **DS-6** | Branch/Agency flag precedence | TC-RFLOW-004 |

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
