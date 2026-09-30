# Project Context — Reissue (business feature)

| Field | Value |
|---|---|
| Module | `reissue` (Supplier Feature) |
| Feature | `reissue-flow` (shared scope) — **the business feature** after the 2026-09-27 scope split |
| Sibling scope | `reissue-mapping` — the UI ↔ `ndc-core-service` ↔ supplier chain. **It gates this scope** (§1.2) |
| Source User Story | "Reissue - Auto Reissue flow from Itinerary" — `knowledge_base/requirements/user_stories/Reissue_Flow_From_Itinerary.md` (supplied by Mohamed Soliman, 2026-09-23), with clarifications CL-1 … CL-3 (2026-09-24) and the **Acceptance Criteria + Edge Cases supplied 2026-09-27** |
| Acceptance Criteria | `…/Reissue_Flow_From_Itinerary.md` §Acceptance Criteria — 36 Overall ACs (AC-01 … AC-36), 53 per-section ACs, 100 edge cases. Mapped in §7.1. Registered as the shared scope's `acceptanceCriteriaRef` |
| Prerequisite story | `Auto_Reissue_Checkbox_Branch_Agency.md` — delivered by run-006 (Stage 4M 64/64 Passed; delivery Pending Review) |
| PRD Source | `platform_core_data/knowledge_base/PRD.md` |
| PRD sections this module derives from | **None directly.** The PRD has no Reissue / Re-shop / Exchange section; this scope is new to the PRD. Related sections only: §7.8 Search and booking (BMO-10 Pay & Book, BMO-14 booking retrieval), §7.7 Rule Engine (RUL-01 Service Charge), §7.13 Reports, §6.1 Maker–checker (XC-01), §13 GAP-9 (PNR Query has no coverage), §7.14 Portal (wallet) |
| Run Scope Type | User Story |
| Run Type | User Story (Supplier Feature · shared scope) |
| Target Environment | Admin `http://192.168.1.60` · Portal `http://192.168.1.60:9500` |
| Produced by run | Rev 1–3: `run-007__2026-09-26_17-10-56__UserStory__ReissueFlowFromItinerary`. **run-007 was retargeted to `reissue-mapping` on 2026-09-27**, so this scope still has **no run bound to it**. One must be created before Stage 3 writes — see §2.2 |
| Revision | **6** (2026-09-30 — **the mapping gate is substantively satisfied**: `reissue-mapping` finished Stage 2 and Stage 3 and its result is handed over in §1.3. Discovery status for *this* scope recorded in §2.1, including what was never explored. Full history in §10.) |
| Target ref at write | `0000c1e9f51c4c17774a1a842608cd25d9ec2222` |
| Generated | 2026-09-27 |
| Status | **Rev 6 — Pending Review.** Rev 1/2 **Approved** — Mohamed Soliman, 2026-09-26, but against a User Story carrying **no** Acceptance Criteria and before the scope split. Rev 3 added the ACs; Rev 4 narrowed the scope to the business feature; Rev 5 recorded the shared UI layer; Rev 6 records the mapping handover and this scope's Discovery status |

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
(§A3/§A4); since no run is bound yet, they are the intake position for the run that will be:

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
| **D-3** | Supplier for execution: **Sabre (Sabre Staging)**. | Test bookings are made on a Sabre Staging credential. That credential has to be selected in the owning organisation's Auto Reissue credentials (CL-1); the user has done this (D-5). |
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
| 1 | **Prerequisite:** the Branch/Agency Auto Reissue checkbox and credentials; an Exchange Fees rule | Controls whether the button is shown (CL-1) and which fee applies. Used as setup only; already tested by run-006 | Story BR 1, 3; D-4; run-006 |
| 2 | **Eligibility:** the Itinerary `Reissue` button (Admin + Portal) | Shown only when all of these hold (CL-1, CL-3):<br>• status `Booked`;<br>• booked online;<br>• booking locked by the current user;<br>• org flag on;<br>• supplier a reissue-capable GDS (CL-2).<br>The reissue is refused when the booking's credential is not among the org's selected credentials (CL-1 message). | Story BR 1, 2, 5; CL-1 … CL-3 |
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

**There is no `QA_Assessment_Report.md` for `reissue-flow`.** Stage 2 ran against this scope from
2026-09-26 to 2026-09-27 and produced **85 evidence files** and one finding, and was then retargeted to
`reissue-mapping` by the scope split before its report was written. The registry therefore reads
`discovery: Not Started` for this scope, which understates what exists and overstates what is
finished. Both halves of that matter.

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

**What the mapping scope's ten scenarios additionally exercised**, end to end and with **human-clicked
exchanges completed**: one-way, round-trip and multi-city; parties up to six passengers; two
currencies and two exchange rates; the rule engine through an exchange; confirmation, e-ticket and
itinerary on the resulting bookings. That evidence is business evidence even though it was gathered
under a mapping lens, and Stage 3 may cite it.

### 2.1.1 Never explored — three named gaps

These are **not** covered by either scope's evidence. Cases for them are still designed, from the
Acceptance Criteria, but their expected results are written **without an observed screen** and must be
marked as such:

| Gap | ACs affected | Consequence for Stage 3 |
|---|---|---|
| **Reports** — no report was ever opened. D-8 put *all* reports in Regression scope; none was looked at | **AC-35**, AC-36, AC-31 | Case steps cannot name real report titles, columns or filters. Designed from the AC text, flagged `Expected result unverified — screen never observed` |
| **PNR Query** — appears only as a navigation item in captured page state, never opened | **AC-34**, AC-36 | As above |
| **The Price Changed popup** — never observed; a supplier reprice cannot be forced | **AC-22** | Designed as an opportunistic case; carries **OQ-12** |

### 2.1.2 Two open discrepancies that block an expected result

Stage 3 can write the **steps** for these cases but not their **expected result**, because what the
application is *supposed* to do was never settled:

- **DS-2 — hidden button, or shown-and-refused?** The story's clarification CL-1 says the Reissue
  button is shown and the reissue is refused on click with a named message. Observed on 2026-09-26:
  the button is **hidden** and no message is ever shown — reproduced with the exact prior run's setup,
  read as the lock holder, so the credential is not the cause. The application's behaviour changed
  after the prerequisite story was delivered and passed. The user could not say which is intended.
  **Affects AC-02, AC-05 and Eligibility edge cases.**
- **DS-6 — Branch/Agency flag precedence.** The story's own edge cases define a precedence
  ("Branch enabled but Agency disabled → unavailable for that Agency") that neither the clarification
  nor the prerequisite run states, and the combination was never tested. **Affects AC-03 and §1 ACs.**

Under the run's requirement-precedence rule the story remains the authority until contradicted by
evidence — so these cases are written to the story, and carry `Expected result: Pending Confirmation`
until a product decision lands. They are **not** dropped and **not** silently written to the observed
behaviour.

## 2.2 What Stage 3 needs before it writes

| Prerequisite | Status |
|---|---|
| Approved Project Context | **This document, Pending Review.** Same posture the mapping suite was authored under, and recorded rather than assumed |
| Approved Discovery | **Absent for this scope** — §2.1. Either a Discovery report is written from the evidence above, or the gate is waived on the record |
| Approved upstream mapping | Substantively delivered, **Pending Review** — §1.3 |
| **A run bound to this scope** | **Missing.** `run-007` belongs to `reissue-mapping`. A run must be created with `scopeFamily: supplier-feature`, `feature: reissue`, `sharedScope: reissue-flow`, and the testing layers of §1 frozen on it — UI, E2E, Regression in scope; API/Contract/Integration moved out; DB deferred; Security and Performance out |

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
| `agency`, `branch` | Their Auto Reissue flag and credentials decide whether the button is shown and whether the reissue is refused | run-006 (flag/button). This run covers the refusal at the moment of Reissue (CL-1) |
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
| ASM-R1 | Assumption | The `Reissue` button follows `actionsDetails.canAutoReissue`. The credential check (CL-1) runs only when Reissue is clicked | Eligibility | CL-1; PO-22; run-006 snapshot |
| ASM-R2 | Assumption | The exchange uses the same Init/Persist → Call Supplier → Update cycle as Pay & Book, so its states are observable in the Itinerary afterwards | Exchange outcome | Story BR 12; PRD BMO-10 |
| ASM-R3 | Requirement (D-9) | A negative fare difference must never appear. Seeing one is a defect, and the user is alerted immediately | Results | Story BR 8 |
| RSK-R1 | Risk | FINDING-017 (run-006): Reissue was still shown for a Branch booking whose credential (315) was not selected. The refusal may therefore only surface at click time | Eligibility | run-006 FINDING-017 |
| RSK-R2 | Risk | Reaching Review & Pay may already hold or persist something at the supplier (Init/Persist) | Safety | Story BR 12; OQ-3 |
| RSK-R3 | Risk | INV-1/INV-2 (run-006): a Branch save during an inactive-credential window can silently remove a supplier. Reissue prerequisites may drift between runs | Prerequisite | run-006 investigation |
| RSK-R4 | Risk | Without DB access, "relationship to original" and "Service Charge stored" depend on UI/API/Reports exposing them | Exchange outcome | run.json |

## 7. Traceability Anchor

| Context Item | Section here | Source |
|---|---|---|
| Flow and business rules 1–17 | §2 | `Reissue_Flow_From_Itinerary.md` Description + Business Requirement |
| Credential refusal message | §2 row 2 | CL-1 |
| Reissue-capable suppliers | §2 row 2, §3 | CL-2 |
| `Booked` status + lock precondition | §2 row 2, §5 | CL-3 |
| Manual Pay/Exchange, layers, supplier, fees | §1.1 | Intake 2026-09-26 (D-1 … D-4) |
| Pay & Book cycle, retrieval | §2 row 8 | PRD §7.8 BMO-10, BMO-14 |
| Service Charge | §2 row 8 | PRD §7.7 RUL-01 |
| Reports / PNR Query | §2 row 10 | PRD §7.13; §13 GAP-9 |
| Layer scope | §1 | `run.json` `testingLayerScope` |
| **Acceptance Criteria AC-01 … AC-36** | **§7.1** | Story §Acceptance Criteria (supplied 2026-09-27) |
| **Edge Cases (100)** | **§7.2** | Story §Edge Cases & Expected Handling (supplied 2026-09-27) |

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
| AC-02 | Auto Reissue displayed in Itinerary per the configured flag | §2 row 2 | UI / API | **Yes** — but the *expected result* is blocked by **DS-2** (hidden vs. refused-on-click) |
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

The story supplies **100 edge cases** across 9 groups (Prerequisites 8 · Eligibility 14 · Search/Re-shop
18 · Review & Pay 15 · Exchange 18 · Booking Confirmation 8 · Itinerary 9 · PNR Query 9 · Reports 9).

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
| OQ-3 | **Authorisation:** may the platform click `Reissue`, run Re-shop searches and open Review & Pay (stopping before Pay)? Stage 2 will first check whether any of these steps writes a supplier hold. | §5 |
| OQ-4 | ~~Exchange Fees rule~~ — **Closed (D-7)** | — |
| OQ-5 | ~~Reports~~ — **Closed (D-8: all reports)**. PNR Query's expected behaviour is discovered in Stage 2 | §2 row 10 |
| OQ-6 | ~~Negative difference~~ — **Closed (D-9)** | — |
| **OQ-7** | **Negative-path test data.** AC-09 and AC-13 and edge cases 1.1–1.3, 2.2, 3.3 need bookings this run does not have: an **offline / imported** booking, a booking on a **non-reissue supplier** (Amadeus or an LCC, CL-2), a booking under an org with the Reissue flag **off**, and a **Round-Trip** booking. Can these be supplied, or are those ACs deferred? | §7.1 AC-09, AC-13; §2 rows 2, 4 |
| **OQ-8** | **Unconfigured Exchange Fees.** AC-03 and §3 AC-9 require the *absence* of a fee rule. D-7 has fees configured on both orgs, and removing one is a shared-master-data change. Use a third org, take a go-ahead + revert, or defer the negative? | §7.1 AC-03; §2 rows 5, 6 |
| **OQ-9** | **Read-only DB access.** AC-26 and AC-30 (and story §5.5 as a whole) are DB assertions. DB is `Deferred` on `run.json` for want of access. Grant read-only access and lift the layer via `run_manager/cli.js scope-change`, or accept them as Declared Gaps? | §1 layer table; §7.1 AC-26, AC-30; DS-3 |
| **OQ-10** | **Failure-path statuses.** AC-25 requires `Not Booked` and `Booking Fail`, and Exchange edge cases 2, 4–13, 18 require supplier failures, timeouts and duplicate submissions. These cannot be forced on Sabre Staging without a stub. Is a stub/fault-injection path available, or are they Not Testable this run? | §7.1 AC-25; §2 row 8 |
| **OQ-11** | **Insufficient wallet.** AC-20 and Review & Pay edge cases 2, 10 need a wallet that cannot cover the difference. Is a low-balance test wallet available, or is the negative deferred? | §7.1 AC-20; §2 row 6 |
| **OQ-12** | **Forced reprice.** AC-22 and edge cases 3.14, 4.6–4.8 need a supplier-side price change. Can one be forced, or is the popup observed opportunistically only? | §7.1 AC-22; §2 row 7 |
| **OQ-13** | **Reissue-specific UI design.** §6 AC-2 requires the confirmation to follow "the agreed Reissue-specific UI". No design reference was supplied. Which artifact is the expected result checked against? | §7.1 AC-32; §2 row 9 |

## 9. Discrepancies Between Sources

| # | Discrepancy | Handling |
|---|---|---|
| DS-1 | The story's flow includes Pay / Exchange; D-1 hands them to the user | Not a conflict in requirements: those ACs stay in scope, verified after the user's manual step (A6: the story remains the authority on expected behaviour) |
| DS-2 | **CL-1 against observed behaviour (Stage 2, 2026-09-26).** CL-1 says the button is shown and the reissue is refused on click with "No credential for this booking is assigned to your organisation". **Observed:** with BRN265's selection set to [277 GalileoLive] only, the Branch booking on 315 got `canAutoReissue: false` and **the Reissue button was hidden**; no message is ever shown. This also differs from run-006 FINDING-017, where the button was still shown. **Repeated 18:47–18:53 with the exact run-006 setup (BRN265 selection [313] only), read as the lock holder: still hidden.** So the credential used is not the cause: the app behaviour changed after run-006 (TC-BR-103 / TC-AGENCY-082 passed on 2026-09-25 against `PO-22`). The user could not say which behaviour is intended (2026-09-26); to be confirmed with the product owner/developer. Evidence: `discovery/evidence/cl1-*`. | **Pending Confirmation**: which behaviour is intended decides the Stage 3 expected result |

| DS-3 | **AC-26 / AC-30 and story §5.5 require DB verification; the DB layer is `Deferred`** (`run.json`, intake 2026-09-26 — no read-only access supplied). AC-30 is a schema assertion (`IS_AUTO_REISSUE` on `TT_FLIGHT_BOOK`) with no UI surface at all; AC-26 (difference-based storage) can be inferred from the displayed amounts but not proved. | Not a requirements conflict — a **scope constraint**. Both ACs stay in the suite and are recorded as **Declared Gaps** on the run manifest and in the Final QA Report. Lifting them requires read-only DB access and a `run_manager/cli.js scope-change` (**OQ-9**); the layer scope is frozen and is never edited by hand. |
| DS-4 | **"Banque Misr" (story §4.6) against "Banque Masr" (AC-21, §4.10, edge case 4.4).** The same payment method, two spellings, both in the supplied text. | Transcription-level, not behavioural. Both are kept verbatim in the story. Stage 3 writes the expected result against **the application's own label**, captured in Stage 2. |
| DS-5 | **AC-28 ("Reissue offers cannot perform Sync") against §3, which lists Sync PNR as Out of Scope.** | Not a conflict once separated: Sync PNR **as a feature** stays out of scope, while AC-28's **negative check** — that Sync is absent/disabled on a reissue offer — is **in scope**, carried on §2 row 8. Nothing is Sync-tested; only its absence is asserted. |
| DS-6 | **Story §1 edge cases 1–4 define a Branch/Agency flag precedence** ("Branch enabled but Agency disabled → the feature is unavailable for that Agency") that **neither CL-1 nor run-006 states**. CL-1 says only that the org checkbox controls whether the button is shown; run-006 tested each flag on its own org, never the combination. | **Pending Confirmation.** Under §A6 the story remains the authority on expected behaviour until contradicted by evidence, so AC-03/§1 AC-3 are written to the edge-case precedence. Stage 2 verifies the actual precedence on BRN265/AGN9780 before Stage 3 fixes the expected result. Interacts with **DS-2**, which is already open on the same button. |

---

## 10. Revision history

> Current status lives in the header table and in the sections above. Everything here is **history,
> not status**. Where a line here disagrees with a table above, the table wins.

| Rev | Date | Change |
|---|---|---|
| **6** | 2026-09-30 | **The mapping handover is recorded** (§1.3): both hops returned zero value mismatches, so a business failure from here is a business failure. Eight settled facts a case may now assert, the confirmed behaviours that must never be raised as defects, and the one caveat that must not be lost — AC-15 holds by a **scope decision**, not by evidence. §1.3.1 maps the fourteen live mapping findings onto the screens and ACs where a user meets them, without re-raising them here. **§2.1 records this scope's own Discovery status honestly**: 85 evidence files and one finding exist, no report was ever written, and the registry's `Not Started` both understates and overstates it. §2.1.1 names the three areas never explored — **Reports, PNR Query and the Price Changed popup**. §2.1.2 names the two discrepancies that block an expected result rather than a step — **DS-2** (hidden button vs shown-and-refused) and **DS-6** (flag precedence). §2.2 lists what Stage 3 still needs, including **a run bound to this scope**, which does not exist. §1.2 restated: the gate is substantively satisfied, formally open. |
| **5** | 2026-09-27 | UI recorded as **shared** with `reissue-mapping`, which owns value provenance on the same screens. |
| **4** | 2026-09-27 | **The scope split.** Layers narrowed to UI / E2E / Regression; API, Contract and Integration obligations moved to `reissue-mapping`. |
| **3** | 2026-09-27 | Acceptance Criteria supplied and mapped — §7.1 AC coverage map, §7.2 edge cases, OQ-7 … OQ-13, DS-3 … DS-6. |
| **2** | 2026-09-26 | Stage 2 decisions D-11 … D-13 — the change fee is per passenger, "FARE HELD" is app-side only, and a third Branch booking supplied. |
| **1** | 2026-09-26 | Created and **approved** by Mohamed Soliman — but against a User Story carrying no Acceptance Criteria, and before the scope split. |
