# Project Context — Reissue

| Field | Value |
|---|---|
| Module | `reissue` (Supplier Feature) |
| Feature | `reissue-flow` (shared scope) |
| Source User Story | "Reissue - Auto Reissue flow from Itinerary" — `knowledge_base/requirements/user_stories/Reissue_Flow_From_Itinerary.md` (supplied by Mohamed Soliman, 2026-09-23), with clarifications CL-1 … CL-3 (2026-09-24) |
| Prerequisite story | `Auto_Reissue_Checkbox_Branch_Agency.md` — delivered by run-006 (Stage 4M 64/64 Passed; delivery Pending Review) |
| PRD Source | `platform_core_data/knowledge_base/PRD.md` |
| PRD sections this module derives from | **None directly.** The PRD has no Reissue / Re-shop / Exchange section; this scope is new to the PRD. Related sections only: §7.8 Search and booking (BMO-10 Pay & Book, BMO-14 booking retrieval), §7.7 Rule Engine (RUL-01 Service Charge), §7.13 Reports, §6.1 Maker–checker (XC-01), §13 GAP-9 (PNR Query has no coverage), §7.14 Portal (wallet) |
| Run Scope Type | User Story |
| Run Type | User Story (Supplier Feature · shared scope) |
| Target Environment | Admin `http://192.168.1.60` · Portal `http://192.168.1.60:9500` |
| Produced by run | `run-007__2026-09-26_17-10-56__UserStory__ReissueFlowFromItinerary` |
| Revision | 2 (Stage 2 decisions D-11 … D-13 — 2026-09-26; Rev 1 approved) |
| Target ref at write | `bc564a4c8364560b2664de5c4e64ad21c8b70925` |
| Generated | 2026-09-26 |
| Status | **Approved** — Mohamed Soliman, 2026-09-26 (Rev 1) |

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

Testing layers (frozen in `run.json`, §A3/§A4):

| Layer | Status | Reason |
|---|---|---|
| UI | In Scope | |
| E2E | In Scope | Up to Review & Pay by the platform; the rest verified after the user's manual Exchange |
| Regression | In Scope | Reports, PNR Query, Itinerary, Pay & Book cycle |
| API | In Scope | Observed Admin/Portal APIs (Itinerary `actionsDetails`, Re-shop, reprice, review) |
| Contract | In Scope | Request/response shape of the observed Re-shop / exchange APIs; `ndc-core-service` (§B3) |
| Integration | In Scope | Supplier round-trip through `ndc-core-service` (§B1) |
| DB | **Deferred** | No read-only DB access provided (intake, 2026-09-26) |
| Security | **Out of Scope** | Not selected by the user at intake, 2026-09-26 |
| Performance | **Out of Scope** | Not selected by the user at intake, 2026-09-26 |

## 1.1 Intake decisions (2026-09-26, Mohamed Soliman)

| ID | Decision | Consequence |
|---|---|---|
| **D-1** | **The platform tests up to Review & Pay. The user does Pay / Exchange by hand** and supplies the new booking reference. | No stage clicks Pay, Exchange or Confirm. Post-exchange ACs are verified read-only on the booking the user produces. |
| **D-2** | Layers: UI, E2E, Regression, API, Contract, Integration. | As §1's table. |
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
| 8 | **Exchange outcome:** verified after the user's manual Exchange | Checks:<br>• Init/Persist → Call Supplier → Update with Supplier Status;<br>• new booking reference and Order ID;<br>• link to the original booking;<br>• original offer marked `Reissued`;<br>• fee stored as a Service Charge. | Story BR 12–16; D-1 |
| 9 | **Booking Confirmation & E-ticket, Itinerary** of the new booking | The flow's end states | Story flow |
| 10 | **Regression:** Reports, PNR Query | Keep the agreed existing behaviour | Story BR 17; PRD §7.13, §13 GAP-9 |
| 11 | **API / Contract / Integration** of the observed calls | Covers:<br>• Itinerary `actionsDetails.canAutoReissue`;<br>• Re-shop search;<br>• reprice;<br>• review;<br>• the exchange result as seen after the manual step;<br>• the `ndc-core-service` path. | D-2; §B1, §B3 |

## 3. Out of Scope for This Module

| Area / Screen / Flow | Why out of scope | Covered by | Source |
|---|---|---|---|
| Clicking **Pay / Exchange / Confirm**, and any booking, payment or ticketing | Done by the user by hand. BOOK, PAYMENT and TICKET are Forbidden for the platform | User (manual), then verified read-only | D-1; execution safety |
| Creating the source bookings | The user books by hand ("do not book anything i will do it on myself") | User | User constraint |
| Exchange Fees Rule Engine **CRUD** | Prerequisite only | Not tested — out of this run's scope | D-4 |
| Branch/Agency Auto Reissue checkbox CRUD | Delivered and tested by run-006 | `agency`, `branch` (run-006) | Prerequisite story |
| **Manual Reissue**, Void/Cancel, Release PNR, Sync PNR | Other Itinerary actions, not this story | Not tested — out of this story | Story; run-006 snapshot |
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

## 8. Open Questions — Requires Run Configuration / Business Confirmation

| # | Question | Sections affected |
|---|---|---|
| OQ-1 | ~~Sabre Staging credential~~ — **Closed (D-5)** | — |
| OQ-2 | ~~Source bookings~~ — **Closed (D-6)** | — |
| OQ-3 | **Authorisation:** may the platform click `Reissue`, run Re-shop searches and open Review & Pay (stopping before Pay)? Stage 2 will first check whether any of these steps writes a supplier hold. | §5 |
| OQ-4 | ~~Exchange Fees rule~~ — **Closed (D-7)** | — |
| OQ-5 | ~~Reports~~ — **Closed (D-8: all reports)**. PNR Query's expected behaviour is discovered in Stage 2 | §2 row 10 |
| OQ-6 | ~~Negative difference~~ — **Closed (D-9)** | — |

## 9. Discrepancies Between Sources

| # | Discrepancy | Handling |
|---|---|---|
| DS-1 | The story's flow includes Pay / Exchange; D-1 hands them to the user | Not a conflict in requirements: those ACs stay in scope, verified after the user's manual step (A6: the story remains the authority on expected behaviour) |
| DS-2 | **CL-1 against observed behaviour (Stage 2, 2026-09-26).** CL-1 says the button is shown and the reissue is refused on click with "No credential for this booking is assigned to your organisation". **Observed:** with BRN265's selection set to [277 GalileoLive] only, the Branch booking on 315 got `canAutoReissue: false` and **the Reissue button was hidden**; no message is ever shown. This also differs from run-006 FINDING-017, where the button was still shown. **Repeated 18:47–18:53 with the exact run-006 setup (BRN265 selection [313] only), read as the lock holder: still hidden.** So the credential used is not the cause: the app behaviour changed after run-006 (TC-BR-103 / TC-AGENCY-082 passed on 2026-09-25 against `PO-22`). The user could not say which behaviour is intended (2026-09-26); to be confirmed with the product owner/developer. Evidence: `discovery/evidence/cl1-*`. | **Pending Confirmation**: which behaviour is intended decides the Stage 3 expected result |
