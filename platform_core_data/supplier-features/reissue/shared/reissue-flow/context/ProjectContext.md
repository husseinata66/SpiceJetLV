# Project Context — Reissue (business feature)

| Field | Value |
|---|---|
| Module | `reissue` (Supplier Feature) |
| Feature | `reissue-flow` (shared scope) — **the business feature** after the 2026-09-27 scope split |
| Sibling scope | `reissue-mapping` — the UI ↔ `ndc-core-service` ↔ supplier chain. **It gates this scope** (§1.2) |
| Source User Story | "Reissue - Auto Reissue flow from Itinerary" — `knowledge_base/requirements/user_stories/Reissue_Flow_From_Itinerary.md` (supplied by Mohamed Soliman, 2026-09-23), with clarifications CL-1 … CL-3 (2026-09-24) and the **Acceptance Criteria + Edge Cases supplied 2026-09-27** |
| Acceptance Criteria | `…/Reissue_Flow_From_Itinerary.md` §Acceptance Criteria — **37** Overall ACs (AC-01 … **AC-37**), 54 per-section ACs, 108 edge cases. Mapped in §7.1. Registered as the shared scope's `acceptanceCriteriaRef`. **`AC-37` was added 2026-10-04 by this scope's own finding (`DS-7`), not supplied with the rest** |
| Workflow reference | **`knowledge_base/requirements/specifications/Reissue_Feature_EndToEnd_Workflow.md`** (supplied 2026-10-04, with its three source files — prose `.docx`, diagram `.docx`, rendered flowchart `.pdf`). **Reference, not authority** — the User Story remains the authority on expected behaviour. It carries three items the story does not: see **DS-7** |
| Prerequisite story | `Auto_Reissue_Checkbox_Branch_Agency.md` — delivered by run-006 (Stage 4M 64/64 Passed; delivery Pending Review) |
| PRD Source | `platform_core_data/knowledge_base/PRD.md` |
| PRD sections this module derives from | **None directly.** The PRD has no Reissue / Re-shop / Exchange section; this scope is new to the PRD. Related sections only: §7.8 Search and booking (BMO-10 Pay & Book, BMO-14 booking retrieval), §7.7 Rule Engine (RUL-01 Service Charge), §7.13 Reports, §6.1 Maker–checker (XC-01), §13 GAP-9 (PNR Query has no coverage), §7.14 Portal (wallet) |
| Run Scope Type | User Story |
| Run Type | User Story (Supplier Feature · shared scope) |
| Target Environment | Admin `http://192.168.1.60` · Portal `http://192.168.1.60:9500` |
| Produced by run | Rev 1–3: `run-007__2026-09-26_17-10-56__UserStory__ReissueFlowFromItinerary`. **run-007 was retargeted to `reissue-mapping` on 2026-09-27**. Rev 6 onward: `run-009__2026-09-30_17-25-03__UserStory__ReissueFlowBusinessFeature`, **bound to this scope** (`scopeFamily: supplier-feature`, `feature: reissue`, `sharedScope: reissue-flow`) with the §1 layers frozen on it — see §2.2 |
| Revision | **13** (2026-10-04 — **`AC-37` added to the User Story** on the user's instruction: Terms & Conditions must be accepted before `Confirm & Charge`. **The first content ever added to that story that was not part of the original supply**, marked as such there. Overall ACs 36 → 37. Suite Revision 7 — the twenty-one new cases are now collected in §13, "Newly added test cases". Earlier the same day — Rev 12: **DS-7 confirmed and covered**: the user confirmed all three workflow-document controls exist on screen, and **nine cases were added** (suite Revision 6, 148 cases) — Terms & Conditions including the acceptance gate before `Confirm & Charge`, the **"Due Now"** label and its composition, and the wallet top-up recovery. **The story should gain an AC for the T&C gate at review.** Earlier the same day — Rev 11: **the End-to-End Workflow documents registered** in the knowledge base and cited here; **DS-7** raised for the three items they carry that the story does not — Terms & Conditions before Confirm & Charge, the **"Due Now"** label, and a wallet **top-up** loop. No test case written from them. Earlier the same day — Rev 10: **seven open questions answered by the user in one pass**: OQ-3, 7, 8, 9, 10, 11, 13 → **D-17 … D-23**. Six are commitments to supply, one is permission; §8 records what each does and does **not** unblock. Suite Revision 5. Earlier the same day — Rev 9: **DS-6 settled** by `PO-16`, which the sibling modules already held: no precedence between the Branch and Agency flags. **OQ-12 closed as D-15**: a supplier reprice cannot be forced, so AC-22 is accepted as untested. Suite Revision 4; twelve cases added at review the same day. Full history in §10.) |
| Target ref at write | `0000c1e9f51c4c17774a1a842608cd25d9ec2222` |
| Generated | 2026-09-27 |
| Status | **Rev 13 — Approved.** Approved by Mohamed Soliman, **2026-10-04**, covering this document only — Discovery (`QA_Assessment_Report.md`), the test suite (Revision 7, 148 cases) and the upstream `reissue-mapping` artifacts all remain **Pending Review**, so the §1.2 gate stays formally open. Rev 1/2 were approved on 2026-09-26, but against a User Story carrying **no** Acceptance Criteria and before the scope split; Rev 3 added the ACs; Rev 4 narrowed the scope to the business feature; Rev 5 recorded the shared UI layer; Rev 6 the mapping handover and this scope's Discovery status; Rev 7 brought that status up to date with run-009; Rev 8 recorded D-14; Rev 9–10 settled DS-6, OQ-12 and seven open questions; Rev 11–12 registered the End-to-End Workflow documents and covered DS-7; Rev 13 added AC-37 |

## 1. Scope Summary

The run covers the **Reissue flow started from the booking Itinerary** on Admin and Portal, for an eligible, online-booked flight:

```
Prerequisite → Eligibility → Search/Re-shop → Flight Results → Review & Pay ║ Exchange → Booking Confirmation & E-ticket → Itinerary → PNR Query
                         platform executes ────────────────────────────────╫──── user does Pay/Exchange by hand; platform verifies what follows
```

- **The platform drives the flow up to and including the Review & Pay screen, and stops there** (`D-1`).
- **The user does Pay / Exchange by hand** and gives the platform the new booking reference.
- **After that, the platform verifies read-only:**
  - Confirmation and E-ticket;
  - the new Order ID and booking reference;
  - the link to the original booking;
  - the original offer marked `Reissued`;
  - the change fee stored as a Service Charge;
  - the Itinerary, Reports and PNR Query.

Run Scope Type **User Story**. The scope is the **shared scope** `reissue-flow` (Supplier XOR Shared Scope, `ndc_execution_rules.md` §A5). The flow is executed with **Sabre (Sabre Staging)** as test data (`D-3`). Findings that only hold for Sabre are marked as supplier-specific; they are not generalised to the shared scope.

Testing layers **after the 2026-09-27 split**. These are frozen on the run that carries this scope
(§A3/§A4) — `run-009`, whose `testingLayerScope` matches this table:

| Layer | Status | Reason |
|---|---|---|
| UI | In Scope | The **behaviour** of every screen in the flow: appearance, navigation, validation, enable/disable, and whether a displayed value is the *right* value per the AC. **Shared with `reissue-mapping`**, which owns the same screens' **value provenance** — whether each number comes from the core field it should. See that scope's §1.1.1 for the boundary |
| E2E | In Scope | Up to Review & Pay by the platform; the rest verified after the user's manual Exchange |
| Regression | In Scope | Reports, PNR Query, Itinerary, Pay & Book cycle |
| API | **Moved out** | To `reissue-mapping`. This scope consumes the mapping's approved result; it does not re-verify request/response shape |
| Contract | **Moved out** | To `reissue-mapping` |
| Integration | **Moved out** | To `reissue-mapping` |
| DB | **Deferred** | No read-only DB access provided (intake, 2026-09-26) |
| Security | **Out of Scope** | Not selected by the user at intake, 2026-09-26 |
| Performance | **Out of Scope** | Not selected by the user at intake, 2026-09-26 |

## 1.1 Intake decisions (2026-09-26, Mohamed Soliman)

| ID | Decision | Consequence |
|---|---|---|
| **D-1** | **The platform tests up to Review & Pay. The user does Pay / Exchange by hand** and supplies the new booking reference. | No stage clicks Pay, Exchange or Confirm. Post-exchange ACs are verified read-only on the booking the user produces. |
| **D-2** | Layers: UI, E2E, Regression, API, Contract, Integration. | As §1's table. **Superseded by the 2026-09-27 split:** API, Contract and Integration moved to `reissue-mapping`; this scope keeps UI, E2E, Regression. |
| **D-3** | Supplier for execution: **Sabre (Sabre Staging)**. | Test bookings are made on a Sabre Staging credential. That credential has to be selected in the owning organisation's Auto Reissue credentials (D-14); the user has done this (D-5). |
| **D-5** | **Sabre Staging is already configured** by the user on BRN265 and AGN9780 (Sabre tab and Auto Reissue). The platform verifies it read-only. | OQ-1 closed; replaces the "not configured" note in §5.1. |
| **D-6** | **Exploration bookings already supplied:**<br>• `NDCEG-BR-F260924EAzzYT`: AGN9780, Sabre Staging, BOOKED (Agency);<br>• `NDCEG-BR-F260916ENYOeQ`: Branch booking.<br>More are asked for only when needed. | OQ-2 closed. Admin lookup: `/booking/search-booking` → Flight tab → Booking Reference → Search. |
| **D-7** | **Exchange fee already configured:** Branch **100**, Agency **50**. | OQ-4 closed. Expected change fee on an Agency booking = 50, on a Branch booking = 100 (Service Charge). Which one applies to an on-behalf booking: To Be Discovered. |
| **D-8** | **All Reports** are in Regression scope. | OQ-5 closed. Stage 2 lists every report under Reports (PRD §7.13) and the new/original booking's appearance in each. |
| **D-9** | **A negative fare difference must never appear.** If one is seen, it is a defect: **alert the user immediately.** | OQ-6 closed. ASM-R3 becomes a requirement. |
| **D-10** | **OQ-3 authorised:** the platform may lock the booking, click `Reissue`, select journeys/passengers, run Re-shop searches and open Review & Pay, **stopping before Pay/Exchange**. Scope: `NDCEG-BR-F260924EAzzYT` and `NDCEG-BR-F260916ENYOeQ` only; the lock is released at the end. | Recorded as a run-007 safety authorisation. Nothing past Review & Pay is ever clicked. |
| **D-11** | **The change fee is per passenger** (user, 2026-09-26, Stage 2). Infants included. | Expected fee = org fee × passenger count. Observed: Agency 50 × 3 = 150; Branch 100 × 4 = 400. |
| **D-12** | **"FARE HELD" on Review & Pay is app-side only**, not a supplier hold (user, 2026-09-26). | RSK-R2 closed for reaching Review & Pay. |
| **D-13** | Extra Branch booking supplied: `NDCEG-BR-F260926PwYMR2` (order `BRN265NDCORD2609269C3COS`). `NDCEG-BR-F260916ENYOeQ` is **not reissuable** ("the airline will not reissue this ticket"). | Branch path uses the new booking; the old one is the airline-refusal case. |
| **D-4** | Exchange Fees Rule Engine CRUD is **only a prerequisite**. | Its CRUD is not tested. A fee rule is configured (or found) only to test how the fee is applied: breakdown, Service Charge. |
| **D-14** | **The Itinerary `Reissue` button is displayed only when all six conditions hold** (user, 2026-10-01):<br>1. the **Auto Reissue checkbox** is on for the organisation that owns the booking (Agency or Branch);<br>2. the **credential the PNR was booked on** is among that organisation's selected **Auto Reissue credentials** in the credential picker;<br>3. the booking **Status is `Booked` and the Itinerary status bar reads "Ticketed Document"** — both;<br>4. the booking was made **online** (not offline / imported);<br>5. **on Admin**, the booking is **locked by the current user** — the Portal has no lock, so this condition does not apply there *(user, 2026-10-01)*;<br>6. the supplier is a **reissue-capable GDS** (CL-2).<br>If any one fails, **the button is not displayed**. | **Settles DS-2:** a credential outside the picker hides the button; there is no click-time refusal to test (agrees with `agency`/`branch` `PO-28` and the run-007 observation). **Amends CL-3 / `PO-24`:** the "Ticketed Document" bar **is** part of the condition, alongside Status `Booked`. Recorded in the module contexts as `PO-30`. Every *button-shown* case states all six as preconditions. |
| **D-15** | **A supplier reprice cannot be forced** (user, 2026-10-04). A price change is supplier behaviour the platform does not control; no stub or fault-injection path exists. | **Closes OQ-12 as an accepted decision, not an answered question.** AC-22 and edge cases 3.14, 4.6–4.8 are **formally accepted as untested**. TC-RFLOW-050, 064, 065, 066, 067, 068 stay Declared Gaps and are unchanged. The honest statement belongs in the Final QA Report: *if the Price Changed popup is broken, this suite will not find out* — it has never been observed once. **Standing instruction:** if the popup ever appears during any execution, capture evidence on the spot. |
| **D-16** | **There is no precedence between the Branch and Agency Auto Reissue flags** — restated here from **`PO-16`**, which already held it in the `agency` and `branch` contexts (product-owner standing confirmed 2026-09-24). Each organisation's own flag applies to that organisation; the Itinerary uses the flag of **the organisation that created the booking**. | **Settles DS-6.** Agrees with D-14 condition 1 ("the organisation that owns the booking", singular) and with specification §5 (`canAutoReissue` is true only when *the organisation that created the booking* has auto-reissue allowed) and §3 (*"enabling on branch does not enable for all agencies under this branch"*). **TC-RFLOW-004 gains a fixed expected result** — the button is not displayed — and leaves `Pending Confirmation`; it still needs the OQ-7 data. |
| **D-17** *(answers OQ-3)* | **The platform may run the entire Reissue flow and must stop before payment. The user pays by hand.** | Confirms D-1 rather than widening it. **Does not by itself authorise execution:** run-009 carries **no `SafetyAuthorizations.md`**, and D-10's grant named run-007 and two specific bookings. A run-009 grant naming the bookings must be written before anything is clicked. |
| **D-18** *(answers OQ-7)* | **The negative-path bookings will be supplied** — offline/imported, a non-reissue supplier, a round trip. | Nine cases open when the references arrive. **Three of the twelve never needed them:** TC-RFLOW-002, 003, 004 are reclassified NOT EXECUTED on `PO-25` — the organisation's own checkbox is toggled on a booking already held. |
| **D-19** *(answers OQ-8)* | **An unconfigured-exchange-fee scenario will be supplied.** | TC-RFLOW-006, 007, 008, 089 open on delivery. |
| **D-20** *(answers OQ-9)* | **Database credentials will be supplied.** | TC-RFLOW-077, 078, 080, 084, 086, 087 open on delivery — **subject to two conditions**. (a) The credentials **never enter this repository**; they belong in the git-ignored `credentials.json`, and access is used **read-only** whatever they permit. (b) The DB layer is `Deferred` and **frozen** on `run.json`; lifting it requires `run_manager/cli.js scope-change --approved-by "..." --reason "..."`, never a hand-edit. **Closes DS-3.** |
| **D-21** *(answers OQ-10)* | **A supplier failure cannot be forced, but real bookings that already failed will be supplied.** | **Opens part of the 21, not all.** Cases asserting the *outcome* of a failure — status `Booking Fail` / `Not Booked`, the original left usable, the error explaining itself, no money taken — are verifiable **read-only** on a supplied failed booking. Cases asserting *behaviour during* the failure — retry after timeout, duplicate submission not processed twice, a late response updating the existing transaction — remain unreproducible: a failed booking shows the end state, not the sequence. The split is made per case **when the references arrive**. |
| **D-22** *(answers OQ-11)* | **A low-balance wallet will be supplied.** | TC-RFLOW-056, 057 open on delivery. |
| **D-23** *(answers OQ-13)* | **A screenshot of the current application will be supplied.** | **Does not close AC-32.** A screenshot of the build is not an oracle for *"the agreed Reissue-specific UI"* — asserting the application matches a picture of itself cannot fail. It is recorded as a **visual-regression baseline** and TC-RFLOW-092 is written against it on that basis, but **AC-32's design-conformance half stays a Declared Gap**. Closing it needs the design agreed before the build, or a written statement of what the confirmation must show. If no design was ever produced, **the honest outcome is to withdraw that clause of AC-32** rather than carry a test that can only pass. |

## 1.2 The mapping gate

**Stage 3 (Test Design) for this scope does not start until `reissue-mapping` is approved.** Set by
the user on 2026-09-27: finish the mapping, then write the business feature's test cases.

> **Status, 2026-09-30.** The mapping scope has **finished** Stage 2 and Stage 3 — a Discovery report,
> 57 mapping-rule cases and 60 displayed-value cases. All of it reads **Pending Review**. The gate is
> therefore **substantively satisfied and formally open**: what it was for — knowing the chain is clean
> before asserting business rules on it — has been delivered (§1.3), while the human approval it names
> has not been held. Stage 3 here proceeds on that basis, stated rather than assumed, and every case
> traceable to a mapping result is re-traced if the mapping changes at review.

A business case asserting "the breakdown shows the fare difference per passenger type" proves nothing
while it is unknown whether the screen's `CHD` is Sabre's `CNN`. Clearing the chain first means every
later failure is a business failure.

**Nothing in the tooling enforces this.** The dependency lives in this section, in the mapping scope's
§1.2, and in the intake of the run that picks this scope up.

**What the gate hands over:** the approved field mapping (which core/supplier field backs each screen
value), the confirmed passenger-type correspondence, the rounding rule, and the answers to OQ-M1 …
OQ-M7. Several ACs here cannot be given a correct expected result until those land — see §7.1.

## 1.3 What the mapping scope handed over (2026-09-30)

`reissue-mapping` completed Stage 2 and Stage 3. Both artifacts read **Pending Review** — the gate in
§1.2 is **substantively satisfied but not yet formally approved**, and that distinction is carried
through every case this scope writes.

**The headline: the mapping is sound, and the defects are in the application.** Across 18 offers
aligned by flight signature, at two exchange rates, in two currencies, across one-way / round-trip /
multi-city, with parties up to 2 Adult + 2 Child + 2 Infant, **both hops returned zero value
mismatches**. That is the finding this scope was waiting for: a business case that fails now fails for
a business reason, not because the screen was reading the wrong field.

**What is now settled, and may be asserted as fact in a test case:**

| Handover | Consequence for this scope |
|---|---|
| Base fare, tax, penalty and total carry correctly Sabre → core → screen | AC-14, AC-16, AC-17 can assert business correctness directly |
| `CHD` on screen is Sabre's `CNN` — same codes, same counts | AC-16's per-passenger-type breakdown has a trustworthy denominator |
| Amount payable = core total at the configured rate **plus** the app-origin change fee | AC-19's expected result is arithmetic, not observation |
| The change fee is app-origin, per passenger, added **after** currency conversion | AC-17, AC-31 |
| The rule engine is **not** applied to a reissued ticket — the agency earns the change fee alone | A **confirmed behaviour**, never a defect. Any case asserting markup/discount/service charge on a reissue offer is wrong |
| The exchange rate is a multiplier; an old ticket keeps its issue-time rate | Prevents a false defect on "currently ticketed" amounts |
| Negative-base-fare offers are filtered out by the core service | **AC-15 holds by construction**, not by a filter this run evidenced — see the caveat below |
| `creditAgency` scopes the agency channel only; Admin and Portal bind different quantities under "Your Balance" **by design** | AC-20 must not be written as an Admin/Portal parity assertion |

**The caveat that must not be lost.** AC-15 ("negative prices are not returned") and D-9 are satisfied
**by a scope decision, not by evidence**: the core service does not provide a cheaper re-shop, so the
Refund path was never exercised at any layer. Sabre's own specification makes `Refund` a typed state
with negative examples. The mapping suite closes this from the only side available — TC-RMAP-056 and
TC-RMAP-057 assert non-negativity as a standing invariant on every offer, at offer level and per
passenger type. **This scope inherits that as a non-observation, never as proof.**

### 1.3.1 Mapping findings that are business defects on this scope's screens

Fourteen findings are live in `reissue-mapping`. They were found through a mapping lens but most are
**application-layer business defects**, and this scope's suite carries the regression case for each on
the screen where a user meets it. They are **not** re-raised here — one finding, one owner.

| Finding | What a user sees | This scope's ACs |
|---|---|---|
| Exchange voids six tickets and issues five — one passenger left with no valid travel document (**Critical**) | A confirmed, paid exchange where one traveller cannot board, and nothing on any screen says so | AC-24, AC-25, AC-32 |
| After a paid exchange the app holds no ticket number for any passenger | Confirmation and Itinerary show blanks — a partial failure rendered as a uniform blank | AC-32, AC-33 |
| The wallet is debited the rounded figure, not the agreed amount | Agreed 3,976.88, debited 3,977.00 — always in the agency's disfavour | AC-20, AC-31 |
| Sabre issues a ticket the application never stores — every even-numbered passenger | Missing ticket numbers, positionally | AC-24, AC-32 |
| Confirmation fare details do not sum — the total exceeds its own itemisation by the supplier penalty | The confirmation contradicts itself | AC-17, AC-32 |
| Supplier penalty merged into tax and shown to the customer as "Taxes" | A mislabelled charge on the customer-facing breakdown | **AC-17** — requires Supplier Penalty as its own component |
| The change fee disappears and its value reappears in `serviceCharges` | The fee is filed under the wrong heading | **AC-31** — requires it stored as a Service Charge, but as *itself* |
| Two Adult fare groups merged; the first group's per-passenger tax multiplied by the full count | A wrong per-passenger tax on a mixed party | **AC-16** |
| A filtered result is reported to the agent as an empty market | The agent is told there are no flights when there are | AC-14; Search/Re-shop edge cases |
| `book` returns 409 with no code, no cause and no next step | An opaque failure the agent cannot act on | **AC-25**; Exchange edge cases |
| One charge recorded three ways in one invoice; an unconverted supplier figure in `feeNTaxes` | Finance reports disagree with the booking | **AC-35** |
| Reissue History reads "2 Reissues" after one exchange | The history miscounts | **AC-27, AC-33** |
| Currently-ticketed total rounded on Review & Pay | Two defects under one label — a binding fault in EGP, a conversion fault in AED | AC-18 |
| Wallet rendered with 3 decimals on the dashboard, 2 on Review & Pay | Inconsistent money formatting | AC-20 |

**The generalisable control the Critical finding produced**, which belongs in this suite as a business
rule: *the application must verify per-passenger ticketing after every exchange and refuse to display
success until every passenger holds a live document.* Today it verifies nothing.

## 2. In Scope for This Module

| # | Area / Screen / Flow | Why in scope | Source |
|---|---|---|---|
| 1 | **Prerequisite:** the Branch/Agency Auto Reissue checkbox and credentials; an Exchange Fees rule | Controls whether the button is shown (D-14) and which fee applies. Used as setup only; already tested by run-006 | Story BR 1, 3; D-4; run-006 |
| 2 | **Eligibility:** the Itinerary `Reissue` button (Admin + Portal) | Shown only when all of these hold (**D-14**):<br>• the owning org's Auto Reissue checkbox on;<br>• the booking's credential selected in the org's Auto Reissue credential picker;<br>• status `Booked` **and** the status bar reads "Ticketed Document";<br>• booked online;<br>• on Admin only, booking locked by the current user (the Portal has no lock);<br>• supplier a reissue-capable GDS (CL-2).<br>If any fails, the button is **not displayed** — there is no click-time refusal (D-14 supersedes CL-1's message). | Story BR 1, 2, 5; CL-1 … CL-3; D-14 |
| 3 | **Journey / passenger selection** | Only eligible journeys and passengers can be selected | Story BR 4 |
| 4 | **Search / Re-shop** | Edit the selected journey's search criteria in the flight widget | Story BR 6 |
| 5 | **Flight Results** | Show the **fare difference**, not the total price. No negative fare or difference. Breakdown per passenger type | Story BR 7, 8, 9 |
| 6 | **Review & Pay** (displayed, **not submitted**) | Must show:<br>• the new flight;<br>• the old flight price;<br>• the fare difference;<br>• the wallet balance;<br>• the payment method;<br>• the fare breakdown;<br>• the change fee. | Story BR 10; D-1 |
| 7 | **Price-change popup** | Supplier reprice on offers that support Reprice. Observed only if it occurs up to Review & Pay | Story BR 11 |
| 8 | **Exchange outcome:** verified after the user's manual Exchange | Checks:<br>• Init/Persist → Call Supplier → Update with Supplier Status;<br>• new booking reference and Order ID;<br>• link to the original booking;<br>• original offer marked `Reissued`;<br>• fee stored as a Service Charge;<br>• **Sync is absent/disabled on the reissue offer** (AC-28, negative check only — see DS-5). | Story BR 12–16; D-1; AC-23 … AC-29, AC-31 |
| 9 | **Booking Confirmation & E-ticket, Itinerary** of the new booking | The flow's end states | Story flow |
| 10 | **Regression:** Reports, PNR Query | Keep the agreed existing behaviour | Story BR 17; PRD §7.13, §13 GAP-9 |
| ~~11~~ | ~~**API / Contract / Integration** of the observed calls~~ | **Moved to `reissue-mapping`** by the 2026-09-27 split: `actionsDetails.canAutoReissue`, Re-shop search, reprice, review, the `ndc-core-service` path and the Sabre round-trip. This scope consumes the mapping's approved result rather than re-deriving it | Scope split 2026-09-27 |

## 2.1 Discovery status for this scope — read before Stage 3

**This scope's Discovery report now exists:** `discovery/QA_Assessment_Report.md`, written by
`run-009` on 2026-09-30, **Pending Review**. Stage 2 first ran against this scope from 2026-09-26 to
2026-09-27 and produced **85 evidence files** and one finding (FINDING-R01), and was then retargeted to
`reissue-mapping` by the scope split before its report was written. run-009 wrote that report from the
evidence below, added a targeted sweep of Reports and PNR Query (§2.1.1), and raised three new
proposed findings (F01 … F03). The registry now reads `discovery: Pending Review`.

**What was actually explored here** — `discovery/evidence/`:

| Area | Evidence | Story section |
|---|---|---|
| Credential rule and the Reissue button's visibility | `cl1-*` (16 files) — setup, swap, revert, read-as-lock-holder | §2 Eligibility |
| Configuration and reissue entry point | `d1-*` — Branch and Agency edit screens, panel lock, entry after click | §1, §2 |
| Re-shop widget and results, Admin and Portal, Branch and Agency | `d2-*`, `d2b-*` | §3 Search / Re-shop |
| Journey and passenger selection, Review & Pay, validation errors | `d3-*` (15 files) — selection, ticked/unticked, no-selection error, review, search timeout | §3, §4 |
| Portal end-to-end flow | `p-*`, `p2-*` — widget, selection, results, review, itinerary, error | §3, §4, §7 |
| Itinerary time rendering across zones | `tz-*` | §7; FINDING-R01 |
| Supplier and core chain | `sabre-*`, `core-*`, `cmp-*` | handed to `reissue-mapping` |
| Reports (all fourteen) and PNR Query — run-009 sweep, 2026-09-30 | `r009-*` | §7 Regression; AC-34, AC-35, AC-36 |

**What the mapping scope's ten scenarios additionally exercised**, end to end and with **human-clicked
exchanges completed**: one-way, round-trip and multi-city; parties up to six passengers; two
currencies and two exchange rates; the rule engine through an exchange; confirmation, e-ticket and
itinerary on the resulting bookings. That evidence is business evidence even though it was gathered
under a mapping lens, and Stage 3 may cite it.

### 2.1.1 Never explored — three named gaps, two since closed

Rev 6 named three areas neither scope's evidence covered. run-009 closed the first two on 2026-09-30;
the third remains open. Cases for an open gap are still designed from the Acceptance Criteria, but
their expected results are written **without an observed screen** and must be marked as such:

| Gap | ACs affected | Status / consequence for Stage 3 |
|---|---|---|
| **Reports** — D-8 put *all* reports in Regression scope | **AC-35**, AC-36, AC-31 | **Closed by run-009.** All fourteen reports opened; filter structures captured as AC-36's baseline. No report can identify a reissue (RPT-1) and Sales Report counts a reissue as a second full sale (RPT-2) — both raised as product questions, not defects. Discovery report §3 |
| **PNR Query** | **AC-34**, AC-36 | **Closed by run-009.** Both bookings shown stacked, original `Reissued`, new `Booked` — AC-34's expected result is observed. PNR Query has no Sync action on any booking, so AC-28's negative check belongs on the Itinerary. Discovery report §3.5 |
| **The Price Changed popup** — never observed; a supplier reprice cannot be forced | **AC-22** | **Still open.** Designed as an opportunistic case; carries **OQ-12** |

### 2.1.2 Two discrepancies that blocked an expected result — one settled, one open

Stage 3 could write the **steps** for these cases but not their **expected result**, because what the
application is *supposed* to do had not been settled:

- **DS-2 — hidden button, or shown-and-refused? — Settled by D-14 (2026-10-01).** The story's
  clarification CL-1 said the Reissue button is shown and the reissue refused on click with a named
  message; observed on 2026-09-26, the button is **hidden** and no message is ever shown. **D-14 rules
  the observed behaviour correct:** a booking whose credential is not in the org's picker gets no
  button. **AC-02, AC-05 and the Eligibility edge cases now have a fixed expected result.**
- **DS-6 — Branch/Agency flag precedence. Settled 2026-10-04 by D-16, restating `PO-16`.** There is
  **no precedence**: each organisation's own flag applies to that organisation, and the Itinerary uses
  the flag of **the organisation that created the booking**. The answer was never missing — `PO-16`
  held it in the `agency` and `branch` contexts from the Stage 1 gate of 2026-09-24, and
  specification §5 backs it independently. **This scope simply never picked it up.**
  **TC-RFLOW-004's expected result is now fixed** (the button is not displayed); it still needs the
  **OQ-7** data to run. **Affects AC-01, AC-03 and §1 ACs.**

**The lesson, recorded rather than left implicit.** DS-6 sat open here for a week while the sibling
modules already carried the answer. A question in this scope is not open until the `agency` and
`branch` contexts have been checked for it — their `PO-*` decisions govern the same checkbox this
scope depends on.

## 2.2 What Stage 3 needs before it writes

| Prerequisite | Status |
|---|---|
| Approved Project Context | **Satisfied — this document, Approved** by Mohamed Soliman, 2026-10-04. Stage 3 was written before that approval, under the same Pending-Review posture as the three rows below; the approval is recorded rather than backdated |
| Approved Discovery | **Written, Pending Review** — `discovery/QA_Assessment_Report.md` (run-009, 2026-09-30), §2.1 |
| Approved upstream mapping | Substantively delivered, **Pending Review** — §1.3 |
| A run bound to this scope | **Satisfied.** `run-009__2026-09-30_17-25-03__UserStory__ReissueFlowBusinessFeature`, created with `scopeFamily: supplier-feature`, `feature: reissue`, `sharedScope: reissue-flow`, and the testing layers of §1 frozen on it — UI, E2E, Regression in scope; API/Contract/Integration moved out; DB deferred; Security and Performance out |

Stage 3 has since written on this basis: `test_design/TestCases_ReissueFlow.md` **Revision 7, 148
cases, Pending Review** — 127 at first writing, plus **twelve added at the user's review on
2026-10-04** (five on inactive airports in the flight widget, seven on the 15-minute FARE HELD
countdown on Review & Pay) and **nine more the same day** from DS-7 (Terms & Conditions, the "Due
Now" label, the wallet top-up); the twenty-one are collected in suite §13. This context is now
**Approved**, but Discovery and the upstream mapping above are still **Pending Review**, so a change
to either at review is still re-traced into the suite.

## 3. Out of Scope for This Module

| Area / Screen / Flow | Why out of scope | Covered by | Source |
|---|---|---|---|
| Clicking **Pay / Exchange / Confirm**, and any booking, payment or ticketing | Done by the user by hand. BOOK, PAYMENT and TICKET are Forbidden for the platform | User (manual), then verified read-only | D-1; execution safety |
| Creating the source bookings | The user books by hand ("do not book anything i will do it on myself") | User | User constraint |
| Exchange Fees Rule Engine **CRUD** | Prerequisite only | Not tested — out of this run's scope | D-4 |
| Branch/Agency Auto Reissue checkbox CRUD | Delivered and tested by run-006 | `agency`, `branch` (run-006) | Prerequisite story |
| **Manual Reissue**, Void/Cancel, Release PNR, Sync PNR | Other Itinerary actions, not this story. **Exception:** AC-28 puts the *absence* of Sync on a reissue offer back in scope as a negative check — the Sync action itself is still never exercised (DS-5) | Not tested — out of this story | Story; run-006 snapshot; AC-28 |
| Offline / imported bookings | Only online-booked offers are supported. Their **negative** check (no `Reissue`) stays **in scope** | Negative check in §2 row 2 | Story BR 5 |
| Non-reissue suppliers: Amadeus, all LCCs | Not on the list (CL-2). Only the negative (button hidden) is in scope | §2 row 2 | CL-2 |
| Supplier-specific reissue behaviour of NDCsbr, Galileo, TravelportNdc | This is a shared-scope run on Sabre Staging. Supplier runs come later | Future Supplier runs under `reissue` | §A5; D-3 |
| DB verification | Deferred: no DB access | — | run.json |
| Security, Performance | Not selected | — | run.json |

## 3.1 Module Boundaries

| Related module | Interaction | Verified by |
|---|---|---|
| `agency`, `branch` | Their Auto Reissue flag and selected credentials decide whether the button is shown (D-14; `PO-28`, `PO-30` there) | run-006 / run-008 (flag/button). This run covers the full six-condition rule at the entry point |
| Rule Engine (Exchange Fees, Service Charge) | Fee rule → change fee in the breakdown → stored as a Service Charge | This run (effect only) |
| Booking Mid Office / Itinerary | Entry point. Source and new booking; lock (CL-3) | This run |
| Reports, PNR Query | Must keep existing behaviour for the original and new booking | This run (Regression) |
| Portal wallet | Wallet balance shown on Review & Pay | This run (display only) |
| `ndc-core-service` | Integration layer of the `reissue` Feature (registry) | This run (Integration / Contract, §B) |

## 4. Roles & Credentials Required

| Role | Permissions / purpose | Credential source | Source |
|---|---|---|---|
| Admin operator (`ADMIN_60`) | Open the Itinerary, lock, Reissue → Review & Pay; read Reports / PNR Query | `knowledge_base/credentials/credentials.json` (runtime) | run-006 |
| Admin super-user (`ADMIN_60_SUPER`, odeysysadmin) | Only if a credential status must change (not planned) | same | run-006 |
| Portal agent AGN9780 (`PORTAL_60`) | Portal Itinerary Reissue → Review & Pay | same | PO-25 |
| The user (Mohamed Soliman) | Makes the source bookings; does Pay / Exchange by hand | — | D-1 |

## 5. Environment Constraints

| Constraint | Implication for downstream stages | Source |
|---|---|---|
| Shared `.60` environment; real Sabre Staging supplier calls | Re-shop searches hit the supplier. Keep them minimal and reuse results where possible | D-3 |
| **Stop at Review & Pay** | Every script ends on the Review & Pay screen. No stage clicks Pay, Exchange or Confirm. `execution_safety` must classify the Review & Pay submit as PAYMENT/BOOK (Forbidden) | D-1 |
| Clicking **Reissue** and running Re-shop searches is now needed | These were forbidden in run-006. **Stage 2 needs a new authorisation** from the user for this run. What they write (session, draft or hold) is To Be Discovered | OQ-3 | ~~Authorisation~~ — **Closed (D-10)** | — |
| Lock the booking; release it at the end | Lock/unlock is a write (`lockUnLock`); same grant pattern as run-006 | CL-3; run-006 |
| Shared master data (org flags, credentials, fee rules) | Change only with the user's go-ahead, and revert immediately | Standing user rule |
| Test organisations | BRN265 and AGN9780. A new org only after asking | Standing user rule |
| Headed or headless | Ask before every execution | Standing user rule |
| No DB access | DB-side assertions (relationship, `Reissued` flag, Service Charge row) must be proved via UI/API/Reports | run.json |

## 5.1 Supplier run intake (`ndc_execution_rules.md` §A2)

| Field | Value |
|---|---|
| Feature / scope | `reissue` / shared `reissue-flow` |
| Supplier | Shared scope: none bound (§A5). Execution supplier is **Sabre, credential "Sabre Staging"** (D-3) |
| Integration layer | `ndc-core-service` (as registered) |
| Target Environment | Admin `http://192.168.1.60`, Portal `http://192.168.1.60:9500` |
| Source Environment | `N/A` |
| Provider ID | `To Be Discovered` |
| Credential / PCC / market | Sabre / Sabre Staging. Configured by the user on BRN265 and AGN9780 (D-5). Credential id `To Be Discovered` (read-only check) |
| Testing Layer Scope | §1 table |
| Known test data | BRN265, AGN9780 (Auto Reissue on, 7 credentials, Approved). run-006 bookings: NDCEG-BR-F2609242aZ6EJ (on-behalf), NDCEG-BR-F251014N1oohh (agency, on hold), NDCEG-BR-F251103CdegUo (branch, on hold). Suitability for reissue (online, `Booked`, Sabre Staging): `To Be Discovered`. **Exploration bookings: `NDCEG-BR-F260924EAzzYT` (AGN9780, Sabre Staging, BOOKED), `NDCEG-BR-F260916ENYOeQ` (Branch)** (D-6) |
| Known blockers | None known |
| Inherited Feature artifacts | `reissue` Feature context: none (Not Started). Prerequisite artifacts: run-006 `agency`/`branch` contexts, `BookingItinerary_Admin/Portal_run-006.md` |

## 6. Carried-Forward Assumptions & Risks

| ID | Type | Statement (meaning preserved) | Affected | Source |
|---|---|---|---|---|
| ASM-R1 | Assumption | The `Reissue` button follows `actionsDetails.canAutoReissue`. ~~The credential check (CL-1) runs only when Reissue is clicked~~ — **superseded by D-14**: the credential is checked before the button is rendered | Eligibility | CL-1; ~~PO-22~~; D-14; run-006 snapshot |
| ASM-R2 | Assumption | The exchange uses the same Init/Persist → Call Supplier → Update cycle as Pay & Book, so its states are observable in the Itinerary afterwards | Exchange outcome | Story BR 12; PRD BMO-10 |
| ASM-R3 | Requirement (D-9) | A negative fare difference must never appear. Seeing one is a defect, and the user is alerted immediately | Results | Story BR 8 |
| RSK-R1 | Risk | FINDING-017 (run-006): Reissue was still shown for a Branch booking whose credential (315) was not selected. ~~The refusal may therefore only surface at click time~~ — **Closed by D-14**: hidden is the required behaviour, and run-007 observed it | Eligibility | run-006 FINDING-017; D-14 |
| RSK-R2 | Risk | Reaching Review & Pay may already hold or persist something at the supplier (Init/Persist) | Safety | Story BR 12; OQ-3 |
| RSK-R3 | Risk | INV-1/INV-2 (run-006): a Branch save during an inactive-credential window can silently remove a supplier. Reissue prerequisites may drift between runs | Prerequisite | run-006 investigation |
| RSK-R4 | Risk | Without DB access, "relationship to original" and "Service Charge stored" depend on UI/API/Reports exposing them | Exchange outcome | run.json |

## 7. Traceability Anchor

| Context Item | Section here | Source |
|---|---|---|
| Flow and business rules 1–17 | §2 | `Reissue_Flow_From_Itinerary.md` Description + Business Requirement |
| Reissue button display rule (six conditions) | §1.1, §2 row 2 | D-14 (supersedes CL-1's click-time refusal) |
| Reissue-capable suppliers | §2 row 2, §3 | CL-2 |
| `Booked` + "Ticketed Document" status, lock precondition | §2 row 2, §5 | CL-3 as amended by D-14 |
| Manual Pay/Exchange, layers, supplier, fees | §1.1 | Intake 2026-09-26 (D-1 … D-4) |
| Pay & Book cycle, retrieval | §2 row 8 | PRD §7.8 BMO-10, BMO-14 |
| Service Charge | §2 row 8 | PRD §7.7 RUL-01 |
| Reports / PNR Query | §2 row 10 | PRD §7.13; §13 GAP-9 |
| Layer scope | §1 | `run.json` `testingLayerScope` |
| **Acceptance Criteria AC-01 … AC-36** | **§7.1** | Story §Acceptance Criteria (supplied 2026-09-27) |
| **Edge Cases (100)** | **§7.2** | Story §Edge Cases & Expected Handling (supplied 2026-09-27) |
| **End-to-End Workflow** — flow, pricing chain, screen-level summary | §9 DS-7 | `specifications/Reissue_Feature_EndToEnd_Workflow.md` + three source files (supplied 2026-10-04). **Reference only** |

## 7.1 Acceptance Criteria coverage map

Every Overall AC, where this context places it, and whether the **layer scope** (§1) and **D-1** (the
platform stops at Review & Pay) allow it to be verified. That column is a statement about *the run*,
not about the requirement: a `No` is a declared gap, never a dropped AC.

**Reading the Layer column after the 2026-09-27 split.** Where a row reads `UI / API`, the API half
now belongs to **`reissue-mapping`** and is not re-derived here: this scope asserts the **UI/business**
half against the mapping's approved result. Seven ACs depend on that handover — **AC-05, AC-14, AC-15,
AC-16, AC-17, AC-22, AC-23** — and are listed in the mapping context's §7. **AC-23 has moved out
entirely**: the Init/Persist → Call Supplier → Update cycle is an Integration obligation with no
business-feature surface.

| AC | Requirement (short) | Covered by | Layer | Verifiable in run-007 |
|---|---|---|---|---|
| AC-01 | Reissue configuration controlled through Branch and Agency CRUD | §2 row 1; §3 | UI | **Yes** — read-only prerequisite check. The CRUD itself was delivered by run-006 |
| AC-02 | Auto Reissue displayed in Itinerary per the configured flag | §2 row 2 | UI / API | **Yes** — expected result fixed by **D-14** (DS-2 settled: hidden when any condition fails) |
| AC-03 | Exchange Fees applied only when configured | §2 rows 5, 6 | UI | **Partial** — the positive side holds (D-7). The unconfigured negative needs the fee rule removed on a shared org → **OQ-8** |
| AC-04 | User can select the applicable flight from Itinerary | §2 rows 2, 3 | UI | Yes |
| AC-05 | System validates Auto Reissue applicability | §2 row 2 | UI / API | Yes — `actionsDetails.canAutoReissue` plus core-service eligibility (ASM-R1) |
| AC-06 | Journey selection follows eligibility | §2 row 3 | UI / API | Yes |
| AC-07 | Passenger selection follows eligibility | §2 row 3 | UI / API | Yes |
| AC-08 | All required passengers selected by default, Not Split | §2 row 3 | UI | Yes |
| AC-09 | Only online-booked offers can be reissued | §2 row 2; §3 | UI | **Partial** — the positive side holds. The negative needs an offline / imported booking → **OQ-7** |
| AC-10 | Selected journey editable through the flight widget | §2 row 4 | UI | Yes |
| AC-11 | Date, Origin, Destination, Cabin Class in the Re-shop criteria | §2 row 4 | UI | Yes |
| AC-12 | The old flight date cannot be selected | §2 row 4 | UI | Yes |
| AC-13 | Round Trip cannot be changed into Multi-City | §2 row 4 | UI | Yes — needs a Round-Trip source booking; trip types of the current bookings are `To Be Discovered` → **OQ-7** |
| AC-14 | Results display the fare difference payable by the user | §2 row 5 | UI / API | Yes — already evidenced for run-007's offers (`CoreService_vs_Screen_run-007.md`) |
| AC-15 | Negative prices are not returned | §2 row 5; ASM-R3 | UI / API | Yes — D-9 makes any sighting a defect, reported immediately |
| AC-16 | Fare breakdown displayed per passenger type | §2 row 5 | UI | Yes — D-11 confirms the fee is per passenger |
| AC-17 | Breakdown contains Base Fare, Taxes, Supplier Penalty, configured WT Change Fees | §2 row 5 | UI | Yes |
| AC-18 | Review Page shows new flight data and the old flight price | §2 row 6 | UI | Yes |
| AC-19 | Payable fare difference shown in the right-top area | §2 row 6 | UI | Yes |
| AC-20 | Wallet balance displayed and checked against the required amount | §2 row 6 | UI | **Partial** — the display holds. The insufficient-balance check needs a low-balance wallet → **OQ-11** |
| AC-21 | Wallet and Banque Masr available as payment methods | §2 row 6 | UI | **Partial** — the methods are observable on Review & Pay; *completing* a payment is Forbidden for the platform (D-1) |
| AC-22 | Supplier price change triggers the Price Changed popup when Reprice is supported | §2 row 7 | UI / API | **Partial** — opportunistic only; a reprice cannot be forced → **OQ-12** |
| AC-23 | Exchange follows Init/Persist → Call Supplier → Update Supplier Status | **`reissue-mapping`** | Integration | **Moved out** by the 2026-09-27 split — an Integration obligation with no business-feature surface. Still **Partial** there: inferred from observable end states, the cycle is not instrumented without DB or service logs |
| AC-24 | Reissue creates a new Booking Reference and Order ID | §2 row 8 | UI / API | Yes — read-only, after the user's manual Exchange (D-1) |
| AC-25 | Statuses Not Booked, Booking Fail, Booked are supported | §2 row 8 | UI | **Partial** — `Booked` yes. The two failure states cannot be forced on Sabre Staging → **OQ-10** |
| AC-26 | Reissue prices stored as **differences**, not total flight prices | — *(new, no §2 row)* | **DB** | **No** — DB is `Deferred` (`run.json`). → **OQ-9**, **DS-3** |
| AC-27 | Reissue History maintains the relation to the original booking | §2 rows 8, 9 | UI / DB | **Partial** — the UI link is checkable; the History **table** is not (RSK-R4) |
| AC-28 | Reissue offers cannot perform the Sync action | §2 row 8 *(negative check)* | UI | Yes — see **DS-5**: Sync PNR returns to scope as a negative check only |
| AC-29 | Original offer status becomes Reissued | §2 row 8 | UI | Yes |
| AC-30 | `TT_FLIGHT_BOOK` contains `IS_AUTO_REISSUE` | — *(new, no §2 row)* | **DB / schema** | **No** — DB is `Deferred`, and this is a schema assertion with no UI surface. → **OQ-9**, **DS-3** |
| AC-31 | Reissue change fee stored as Service Charge | §2 row 8 | UI / Reports | **Partial** — observable only through Reports and the breakdown (RSK-R4) |
| AC-32 | Booking Confirmation shows the Reissue offer in the Reissue-specific UI | §2 row 9 | UI | Yes — read-only after the manual Exchange. The "agreed design" has no supplied reference → **OQ-13** |
| AC-33 | Itinerary shows Auto Reissue History for the current flight | §2 row 9 | UI | Yes |
| AC-34 | PNR Query shows the ticketed Reissue in the History section | §2 row 10 | UI | Yes (D-8) |
| AC-35 | Wallet, Finance and all related reports reviewed for Reissue impact | §2 row 10 | UI | Yes (D-8) |
| AC-36 | Existing Reports and PNR Query behaviour unchanged otherwise | §2 row 10 | Regression | Yes |

**Totals (this scope, after the split):** 25 fully verifiable · 8 partial · **2 not verifiable**
(AC-26, AC-30 — both DB) · **1 moved out** (AC-23 → `reissue-mapping`). The two DB ACs must be carried
as **Declared Gaps** on the run manifest and in the Final QA Report; they are not removed from the
suite.

**Per-section ACs.** The 53 per-section ACs are subsumed by the map above except where they add a
distinct obligation:

| Per-section AC | Adds | Handling |
|---|---|---|
| §2 AC-8 — an offline-booked offer must not proceed | The explicit negative behind AC-09 | Needs offline test data → **OQ-7** |
| §3 AC-9 — WT Change Fees ignored when unconfigured | The explicit negative behind AC-03 | Needs the fee rule removed → **OQ-8** |
| §3 AC-10 — other flight details follow normal flight-search behaviour | A regression obligation on the Re-shop result card | §2 row 5; Regression layer |
| §5 AC-5 … AC-10 — DB persistence model | The storage rules behind AC-26 … AC-31 | §5.5 of the story; **OQ-9** / **DS-3** |
| §6 AC-2 — Reissue-specific confirmation UI | A design conformance check with no supplied design | **OQ-13** |
| §8 AC-4 — existing PNR Query behaviour unchanged | The explicit regression behind AC-36 | §2 row 10 |

## 7.2 Edge Cases

The story supplies **108 edge cases** across 9 groups (Prerequisites 8 · Eligibility 14 · Search/Re-shop
18 · Review & Pay 15 · Exchange 18 · Booking Confirmation 8 · Itinerary 9 · PNR Query 9 · Reports 9).

*(**Corrected 2026-10-04.** This section read **100** from Revision 3 onward, but the nine group
figures it lists have always summed to **108** — the total was simply wrong, not the groups. Stage 3
flagged it when it covered all 108; suite §0.6 and the Coverage Report §4 carry the same correction.)*

They are **Stage 3 input**, not Stage 1 scope decisions: Stage 1 records them, and Test Design turns
each into a case with its expected handling. Stage 1's only judgement here is which of them the run's
constraints put out of reach — those are raised as **OQ-7, OQ-8, OQ-10, OQ-11, OQ-12** and are
concentrated in the failure/negative paths (supplier failures, timeouts, duplicate submissions,
insufficient wallet, missing configuration). Every edge case beyond those constraints is reachable
under the current scope.

## 8. Open Questions — Requires Run Configuration / Business Confirmation

| # | Question | Sections affected |
|---|---|---|
| OQ-1 | ~~Sabre Staging credential~~ — **Closed (D-5)** | — |
| OQ-2 | ~~Source bookings~~ — **Closed (D-6)** | — |
| ~~OQ-3~~ | ~~Authorisation~~ — **Answered 2026-10-04 (D-17): yes, the whole flow; the user pays by hand.** **Still needs the artifact:** run-009 has no `SafetyAuthorizations.md`, and D-10's grant named run-007 and two bookings. **Nothing executes until a run-009 grant naming its bookings is written** | §5 |
| OQ-4 | ~~Exchange Fees rule~~ — **Closed (D-7)** | — |
| OQ-5 | ~~Reports~~ — **Closed (D-8: all reports)**. PNR Query's expected behaviour is discovered in Stage 2 | §2 row 10 |
| OQ-6 | ~~Negative difference~~ — **Closed (D-9)** | — |
| ~~**OQ-7**~~ *(answered — D-18: will be supplied; awaiting delivery; TC-RFLOW-002/003/004 never needed it, `PO-25`)* | **Negative-path test data.** AC-09 and AC-13 and edge cases 1.1–1.3, 2.2, 3.3 need bookings this run does not have: an **offline / imported** booking, a booking on a **non-reissue supplier** (Amadeus or an LCC, CL-2), a booking under an org with the Reissue flag **off**, and a **Round-Trip** booking. Can these be supplied, or are those ACs deferred? | §7.1 AC-09, AC-13; §2 rows 2, 4 |
| ~~**OQ-8**~~ *(answered — D-19: will be supplied; awaiting delivery)* | **Unconfigured Exchange Fees.** AC-03 and §3 AC-9 require the *absence* of a fee rule. D-7 has fees configured on both orgs, and removing one is a shared-master-data change. Use a third org, take a go-ahead + revert, or defer the negative? | §7.1 AC-03; §2 rows 5, 6 |
| ~~**OQ-9**~~ *(answered — D-20: credentials will be supplied. Two conditions: never in this repository, and the frozen DB layer is lifted by `scope-change`, not by hand)* | **Read-only DB access.** AC-26 and AC-30 (and story §5.5 as a whole) are DB assertions. DB is `Deferred` on `run.json` for want of access. Grant read-only access and lift the layer via `run_manager/cli.js scope-change`, or accept them as Declared Gaps? | §1 layer table; §7.1 AC-26, AC-30; DS-3 |
| **OQ-10** *(partly answered — D-21: failures cannot be forced, but **real failed bookings will be supplied**. Outcome assertions open read-only; during-the-failure behaviour stays unreproducible)* | **Failure-path statuses.** AC-25 requires `Not Booked` and `Booking Fail`, and Exchange edge cases 2, 4–13, 18 require supplier failures, timeouts and duplicate submissions. These cannot be forced on Sabre Staging without a stub. Is a stub/fault-injection path available, or are they Not Testable this run? | §7.1 AC-25; §2 row 8 |
| ~~**OQ-11**~~ *(answered — D-22: a low-balance wallet will be supplied; awaiting delivery)* | **Insufficient wallet.** AC-20 and Review & Pay edge cases 2, 10 need a wallet that cannot cover the difference. Is a low-balance test wallet available, or is the negative deferred? | §7.1 AC-20; §2 row 6 |
| ~~**OQ-12**~~ | ~~**Forced reprice.**~~ — **Closed 2026-10-04 (D-15): it cannot be forced.** A supplier price change is supplier behaviour the platform does not control. AC-22 and edge cases 3.14, 4.6–4.8 are **accepted as untested**; six cases stay Declared Gaps, observed opportunistically only | §7.1 AC-22; §2 row 7 |
| **OQ-13** *(partly answered — D-23: a **screenshot of the current build** will be supplied. Useful as a visual-regression baseline, but **not an oracle** — AC-32's design-conformance half stays a Declared Gap)* | **Reissue-specific UI design.** §6 AC-2 requires the confirmation to follow "the agreed Reissue-specific UI". No design reference was supplied. Which artifact is the expected result checked against? | §7.1 AC-32; §2 row 9 |

## 9. Discrepancies Between Sources

| # | Discrepancy | Handling |
|---|---|---|
| DS-1 | The story's flow includes Pay / Exchange; D-1 hands them to the user | Not a conflict in requirements: those ACs stay in scope, verified after the user's manual step (A6: the story remains the authority on expected behaviour) |
| DS-2 | **CL-1 against observed behaviour (Stage 2, 2026-09-26).** CL-1 says the button is shown and the reissue is refused on click with "No credential for this booking is assigned to your organisation". **Observed:** with BRN265's selection set to [277 GalileoLive] only, the Branch booking on 315 got `canAutoReissue: false` and **the Reissue button was hidden**; no message is ever shown. This also differs from run-006 FINDING-017, where the button was still shown. **Repeated 18:47–18:53 with the exact run-006 setup (BRN265 selection [313] only), read as the lock holder: still hidden.** So the credential used is not the cause: the app behaviour changed after run-006 (TC-BR-103 / TC-AGENCY-082 passed on 2026-09-25 against `PO-22`). The user could not say which behaviour is intended (2026-09-26); to be confirmed with the product owner/developer. Evidence: `discovery/evidence/cl1-*`. | **Settled — D-14 (user, 2026-10-01).** The observed behaviour is the intended one: the button is **not displayed** when the booking's credential is not in the org's picker. CL-1's click-time refusal is not a test target. Agrees with `PO-28` in `agency`/`branch` (2026-09-27) |

| ~~DS-3~~ *(**closing — D-20**, 2026-10-04: DB credentials will be supplied. The layer is lifted by `run_manager/cli.js scope-change`, never by hand; access is used read-only)* | **AC-26 / AC-30 and story §5.5 require DB verification; the DB layer is `Deferred`** (`run.json`, intake 2026-09-26 — no read-only access supplied). AC-30 is a schema assertion (`IS_AUTO_REISSUE` on `TT_FLIGHT_BOOK`) with no UI surface at all; AC-26 (difference-based storage) can be inferred from the displayed amounts but not proved. | Not a requirements conflict — a **scope constraint**. Both ACs stay in the suite and are recorded as **Declared Gaps** on the run manifest and in the Final QA Report. Lifting them requires read-only DB access and a `run_manager/cli.js scope-change` (**OQ-9**); the layer scope is frozen and is never edited by hand. |
| DS-4 | **"Banque Misr" (story §4.6) against "Banque Masr" (AC-21, §4.10, edge case 4.4).** The same payment method, two spellings, both in the supplied text. | Transcription-level, not behavioural. Both are kept verbatim in the story. Stage 3 writes the expected result against **the application's own label**, captured in Stage 2. |
| DS-5 | **AC-28 ("Reissue offers cannot perform Sync") against §3, which lists Sync PNR as Out of Scope.** | Not a conflict once separated: Sync PNR **as a feature** stays out of scope, while AC-28's **negative check** — that Sync is absent/disabled on a reissue offer — is **in scope**, carried on §2 row 8. Nothing is Sync-tested; only its absence is asserted. |
| ~~DS-6~~ | **Story §1 edge cases 1–4 define a Branch/Agency flag precedence** ("Branch enabled but Agency disabled → the feature is unavailable for that Agency") that neither CL-1 nor run-006 states. CL-1 says only that the org checkbox controls whether the button is shown; run-006 tested each flag on its own org, never the combination. | **Settled — D-16 (2026-10-04), restating `PO-16`.** There is **no precedence**: each organisation's own flag applies to that organisation, and the Itinerary uses the flag of **the organisation that created the booking**. The story's edge case 1.3 is *consistent* with this, not in conflict — the Agency owns the booking and its own flag is off, so the button is hidden. Backed independently by specification §5 (`canAutoReissue` requires *the organisation that created the booking* to have auto-reissue allowed) and §3 (*"enabling on branch does not enable for all agencies under this branch"*). **`PO-16` carried this answer from 2026-09-24; this scope did not pick it up until 2026-10-04.** TC-RFLOW-004's expected result is fixed; the OQ-7 data is still outstanding. |
| **DS-7** | **The End-to-End Workflow documents (2026-10-04) describe three controls the User Story never mentions.** (1) **Terms & Conditions must be accepted before `Confirm & Charge`** on Review & Pay, and are displayed again on the Confirmation screen — both diagram forms show `… → Accept T&C → Confirm & Charge` explicitly, and the prose document lists T&C among Review & Pay's controls. *"T&C" and "Terms" appear **nowhere** in `Reissue_Flow_From_Itinerary.md`.* (2) The payable difference is named **"Due Now"** on both the results screen and Review & Pay. (3) An **insufficient wallet offers a top-up and returns to the flow** (`Insufficient → Top up wallet → re-check balance`). | **Confirmed and covered — 2026-10-04.** The user confirmed **all three controls exist on screen**, which is what turned them into cases; a workflow document alone would not have (§A6 — the story is the authority, and it is **silent** here rather than contradicting). **Nine cases added:** TC-RFLOW-142, 143, 144, 145, 148 for Terms & Conditions — **143 is the gate**, establishing that payment is refused without acceptance and stopping there; TC-RFLOW-140, 141 for the **"Due Now"** label and its composition (difference + supplier penalty + WT change fee); TC-RFLOW-146, 147 for the wallet **top-up** recovery, both Declared Gaps until **D-22**'s low-balance wallet arrives, with the top-up itself human-performed. **Consequence for the story: it is incomplete, not wrong.** The ACs should be amended at review to carry the T&C gate — a mandatory step on the payment path with no Acceptance Criterion behind it. |

---

## 10. Revision history

> Current status lives in the header table and in the sections above. Everything here is **history,
> not status**. Where a line here disagrees with a table above, the table wins.

| Rev | Date | Change |
|---|---|---|
| **13** | 2026-10-04 | **`AC-37` added to the User Story**, on the user's instruction, after `DS-7` established that **accepting Terms & Conditions before `Confirm & Charge` is a mandatory step on the payment path with no Acceptance Criterion behind it**. The story gains **`AC-37`** and a new **§4.9 Terms & Conditions**, both marked as added 2026-10-04 and **not part of the 2026-09-27 supply** — the first content ever added to that file that the requester did not supply. **Overall ACs 36 → 37**; §7.1, the Traceability Matrix and the Coverage Report follow. The five T&C cases now cite an AC instead of none. Separately, the suite moves to **Revision 7**: the twenty-one cases added today are collected into **§13, "Newly added test cases"**, grouped 13.1–13.6 and kept in numeric order, with TC-RFLOW-001…127 untouched and nothing renumbered. |
| **12** | 2026-10-04 | **`DS-7` confirmed and covered.** The user confirmed that **all three controls the workflow documents describe — Terms & Conditions, the "Due Now" label, and the wallet top-up route — exist on screen.** That confirmation is what authorised cases: the documents are reference, not authority, and the story is **silent** on all three rather than contradicting them. **Nine cases added** (suite Revision 6, 139 → 148): `TC-RFLOW-142`–`145` and `148` for T&C, `140`–`141` for "Due Now", `146`–`147` for the top-up. **`TC-RFLOW-143` is the significant one** — both diagram forms place `Accept T&C` directly before `Confirm & Charge`, making it a **mandatory gate on the payment path that had no coverage and no AC**. It establishes the refusal and stops; no payment is made (D-1). `146`/`147` are Declared Gaps until **D-22**'s wallet arrives, and the top-up is human-performed. **Action for review: the User Story should gain an Acceptance Criterion for the T&C gate** — it is a required step on the money path that the story never specified. |
| **11** | 2026-10-04 | **The End-to-End Workflow documents are registered and cited.** Three files supplied by the user — a prose `.docx`, the same flow drawn in a diagram `.docx`, and that flowchart rendered as an image-only `.pdf` (no extractable text; read as an image). All three are kept in `knowledge_base/requirements/specifications/` beside a consolidated `Reissue_Feature_EndToEnd_Workflow.md`, following the precedent of `Auto_Reissue_Checkbox_Documentation`. **They are reference, not authority** — no module, Feature or run was created, and no test case was written from them. **They agree with the story almost everywhere** (prerequisites, eligibility, re-shop constraints, breakdown components, the exchange cycle, `IS_AUTO_REISSUE`, Service Charge, Itinerary history, PNR Query, affected reports). **DS-7** records the three things they carry that the story does not: **T&C accepted before `Confirm & Charge`**, the **"Due Now"** label, and a wallet **top-up loop** on insufficient balance. Header and §7 cite the new reference. |
| **10** | 2026-10-04 | **Seven open questions answered by the user in one pass — `D-17` … `D-23`.** **OQ-3** (D-17): the platform may run the whole flow and stops before payment, the user pays — but run-009 still has **no `SafetyAuthorizations.md`**, so nothing executes until one naming its bookings is written. **OQ-7, OQ-8, OQ-11** (D-18, D-19, D-22): the negative-path bookings, the unconfigured-fee scenario and a low-balance wallet **will be supplied** — committed, not delivered, so the cases stay Declared Gaps until the references arrive. **OQ-9** (D-20): DB credentials will be supplied, closing **DS-3**, under two conditions — they never enter this repository, and the frozen DB layer is lifted by `scope-change`, never by hand. **OQ-10** (D-21): failures cannot be forced, but **real failed bookings** will be supplied, which opens the *outcome* assertions read-only while *during-the-failure* behaviour stays unreproducible. **OQ-13** (D-23): a **screenshot of the current build** will be supplied — a visual-regression baseline, **not an oracle**, so AC-32's design-conformance half stays a Declared Gap. Separately, **TC-RFLOW-002 and 003 move NOT TESTABLE → NOT EXECUTED** on `PO-25` — no Reissue-disabled booking was ever needed. Suite at Revision 5; Not Testable 47 → 45. |
| **9** | 2026-10-04 | **Two questions answered at review, and a stale count corrected.** **D-16 settles DS-6** by restating **`PO-16`** — no precedence between the Branch and Agency Auto Reissue flags; each organisation's own flag applies to itself, and the Itinerary uses the flag of the organisation **that created the booking**. `PO-16` has held this since the Stage 1 gate of **2026-09-24** and the specification backs it (§5, §3); **this scope never picked it up**, and §2.1.2 now records that as a lesson rather than leaving it implicit. TC-RFLOW-004 gains a fixed expected result and leaves `Pending Confirmation` — the suite now carries two, not three. **D-15 closes OQ-12**: a supplier reprice **cannot** be forced (user), so AC-22 and edge cases 3.14, 4.6–4.8 are **accepted as untested** rather than awaiting an answer; the six cases are unchanged and stay Declared Gaps, with a standing instruction to capture evidence if the Price Changed popup is ever seen. §1.1, §2.1.2, §8 OQ-12, §9 DS-6 updated. Suite at Revision 4 (139 cases — twelve added at review the same day; §2.2's "127" corrected). |
| **8** | 2026-10-01 | **D-14 — the Reissue button's display rule** (user): six conditions, all required — org checkbox on; the booking's credential in the org's picker; Status `Booked` **and** "Ticketed Document" bar; online; locked by the current user (**Admin only** — the Portal has no lock); reissue-capable GDS. **DS-2 settled** (hidden, not refused on click). **CL-3 / `PO-24` amended**: the "Ticketed Document" bar is now part of the condition. §1.1, §2 row 2, §2.1.2, §3.1, §6 ASM-R1 and RSK-R1, §7, §7.1 AC-02, §9 DS-2/DS-6 updated. Mirrored in `agency`/`branch` as `PO-30`. |
| **7** | 2026-10-01 | **Status only — no decision, scope, layer or AC mapping changed.** Rev 6 was written just before run-009 picked this scope up, so three of its statements went stale the same day. Header, §1 and §2.2: run-009 is now the run **bound to this scope**. §2.1 and §2.2: this scope's **Discovery report exists** (run-009, Pending Review), with three new proposed findings F01 … F03. §2.1.1: **Reports and PNR Query were explored** by run-009's sweep; only the Price Changed popup remains unobserved. §2.2 notes Stage 3 has been written (127 cases, Pending Review). |
| **6** | 2026-09-30 | **The mapping handover is recorded** (§1.3): both hops returned zero value mismatches, so a business failure from here is a business failure. Eight settled facts a case may now assert, the confirmed behaviours that must never be raised as defects, and the one caveat that must not be lost — AC-15 holds by a **scope decision**, not by evidence. §1.3.1 maps the fourteen live mapping findings onto the screens and ACs where a user meets them, without re-raising them here. **§2.1 records this scope's own Discovery status honestly**: 85 evidence files and one finding exist, no report was ever written, and the registry's `Not Started` both understates and overstates it. §2.1.1 names the three areas never explored — **Reports, PNR Query and the Price Changed popup**. §2.1.2 names the two discrepancies that block an expected result rather than a step — **DS-2** (hidden button vs shown-and-refused) and **DS-6** (flag precedence). §2.2 lists what Stage 3 still needs, including **a run bound to this scope**, which does not exist. §1.2 restated: the gate is substantively satisfied, formally open. |
| **5** | 2026-09-27 | UI recorded as **shared** with `reissue-mapping`, which owns value provenance on the same screens. |
| **4** | 2026-09-27 | **The scope split.** Layers narrowed to UI / E2E / Regression; API, Contract and Integration obligations moved to `reissue-mapping`. |
| **3** | 2026-09-27 | Acceptance Criteria supplied and mapped — §7.1 AC coverage map, §7.2 edge cases, OQ-7 … OQ-13, DS-3 … DS-6. |
| **2** | 2026-09-26 | Stage 2 decisions D-11 … D-13 — the change fee is per passenger, "FARE HELD" is app-side only, and a third Branch booking supplied. |
| **1** | 2026-09-26 | Created and **approved** by Mohamed Soliman — but against a User Story carrying no Acceptance Criteria, and before the scope split. |
