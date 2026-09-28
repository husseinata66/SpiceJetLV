# QA Assessment Report — run-007__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia

| Field | Value |
|---|---|
| Scope | Supplier Feature: `ancillaries` / Supplier: `air-india` |
| Produced by run | `run-007__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia` |
| Revision | 8 (revised 2026-09-27 — live browser automation upgraded FINDING-001, 002, 005, 006 via read-only exploration; a real test booking then upgraded FINDING-007, 008, 009, 010 the same way; FINDING-011/012 added closing the ANC-53 "reports" coverage gap flagged by the user ahead of Stage 3; FINDING-012 then reclassified Test Gap/Needs Human Review -> Bug/Confirmed after the user confirmed it's a defect in the Statement report itself; FINDING-013 through FINDING-017 added from user-supplied evidence of Admin's Booking-Mid Office cycle — see new §14, a provisional section pending a Project Context revision this run does not itself perform) |
| Project Context validated against | `platform_core_data/supplier-features/ancillaries/suppliers/air-india/context/ProjectContext.md` (rev 2, Approved 2026-09-25) — **§14's Admin scope is NOT yet reflected in this Project Context revision; see that section's caveat** |
| Discovery Mode(s) used | User-guided exploration (rev 1-3); Browser automation / Direct Observation added rev 4-6, once `credentials.json` and a working Portal login flow existed, and after explicit user authorization + staging confirmation for the booking step; rev 8 adds user-supplied Static Artifact/Human Observation evidence for Admin (§14) |
| Generated | 2026-09-26 (last updated 2026-09-27) |
| Status | Approved |
| Approved by | Ahmed Alhussieny |
| Approved on | 2026-09-28 |

## 1. Scope

Run Scope Type: **Feature** (Supplier Feature — `ancillaries` / `air-india`). Run Type: **User Story**. This run validated the live application against `ProjectContext.md` revision 2 (Approved 2026-09-25), covering AirIndia's Supported ancillary capabilities (Baggage, Meal, Bundle) and confirming Seat's Unsupported status.

## 2. Objectives

Verify the live Admin and Portal applications against the Project Context for AirIndia: the Admin precondition (Branch/Supplier/Credential configuration), the Portal booking flow (search, flight attribution, PAX Details, Bundles, Ancillaries), pricing/currency rules, wallet deduction timing, downstream reflection of ancillaries (booking confirmation and itinerary), passenger eligibility, and the post-booking change/removal rule. Also targeted: resolving open items carried from Stage 1 (AirIndia's Provider ID/code, Bundle's Application Level) where discoverable live.

## 3. Evidence Sources

| Discovery Mode | In-Scope Areas Covered | Why This Mode |
|---|---|---|
| User-guided exploration | All 9 declared in-scope areas (Admin Branch/Supplier config; Portal Flight Search, PAX Details, Bundles step, Ancillaries step, Payment, Booking Confirmation, Itinerary re-check, post-booking change attempt) | Original mode (rev 1-3): the Browser Driver required a human-created `credentials.json` that did not exist yet, and typing a credential value into the `playwright` MCP server is explicitly prohibited by the platform's own rule. The operator (Ahmed Alhussieny) drove the live Admin/Portal applications directly and reported back. |
| Browser automation (Direct Observation) | All 12 declared in-scope areas, now including Payment, Booking Confirmation, Itinerary re-check, post-booking change attempt, and Reports (FINDING-001, 002, 005, 006, 007, 008, 009, 010, 011, 012) | Added rev 4-6 (2026-09-27): the operator created `credentials.json` and made both Admin/Portal reachable; the Browser Profile/Driver were extended with a second login flow for Portal. Rev 4 stopped before the "Book" step per the standing safety rule. The operator then explicitly authorized proceeding and, asked again per that same rule, confirmed the environment was Staging; rev 5 completed a real test booking (Airline PNR Y1ZVFF) and verified Payment/Confirmation/Itinerary/post-booking behavior directly. Rev 6, prompted by the user ahead of Stage 3, closed the ANC-53 "reports" clause that rev 1-5's 100% coverage claim had not actually visited — Total Due to NDC and Sales confirmed correct against the real booking; Statement confirmed empty at the API level, deferred to Needs Human Review. |

## 4. Modules Explored

| Module | Route(s) | Purpose | Discovery Mode |
|---|---|---|---|
| Admin app | `192.168.1.213/auth/login` → Branch → Product Access Details | Branch configuration; Supplier ("IndiaAirLine") and Credential ("IndiaAirLineStg") assignment | User-guided exploration |
| Portal app | `192.168.1.213:9500/auth/login` → Book Flight → booking wizard | Flight search/selection, passenger details, ancillary selection, payment, confirmation, itinerary | User-guided exploration |

**Shared UI components:** A 3-step booking wizard (**01 Passenger Info → 02 Bundles → 03 Ancillaries**) — reused across the booking flow. No selector/DOM catalogue was captured, per this skill's scope boundary (§5.15).

## 5. Observed Behaviour

| Module | Workflow / Rule | What Was Observed | Evidence Category | Finding ID(s) |
|---|---|---|---|---|
| Ancillaries / AirIndia | Supplier identity | App shows Supplier as "IndiaAirLine" / credential "IndiaAirLineStg", confirmed same entity as "AirIndia" | Direct Observation (corroborated by Human Observation + Static Artifact) | FINDING-001 |
| Ancillaries / AirIndia | Flight attribution (ANC-20) | Selected flight clearly labeled "IndiaAirLine ndc test" | Direct Observation (reproduced via live automation) | (recorded in Timeline; no dedicated Finding — unambiguous match) |
| Ancillaries / AirIndia | Application Level (ANC-48) | Meal offered per leg (Per Segment); Extra Baggage offered once per journey (Per Journey) | Direct Observation (corroborated by Human Observation + Static Artifact) | FINDING-002 |
| Ancillaries / AirIndia | Pricing contract (ANC-42…45) | Fare Breakdown: Base fare + Tax&Fees + Ancillaries&SSR = Total, no separate rule-engine line items visible | Human Observation + Static Artifact | FINDING-003 |
| Ancillaries / AirIndia | Baggage ancillary labeling | Extra Baggage's only line item reads "Special equipment Handling Fee" | Human Observation + Static Artifact | FINDING-004 |
| Ancillaries / AirIndia | Bundle structure and level | Bundle is a distinct wizard step ("02 Bundles"), offered once per journey (Per Journey) | Direct Observation (corroborated by Human Observation + Static Artifact) | FINDING-005 |
| Ancillaries / AirIndia | Eligibility (ANC-49) | Infant excluded from Baggage, Meal, and Bundle — no Infant passenger row exists at all on the Ancillaries step | Direct Observation (corroborated by Human Observation + Static Artifact) | FINDING-006 |
| Ancillaries / AirIndia | Wallet/payment timing (ANC-46) | Wallet balance unchanged through ancillary selection and Payment Details; reduced by the exact Total (24,122.0 EGP) only after confirmation | Direct Observation (corroborated by Human Observation + Static Artifact) | FINDING-007 |
| Ancillaries / AirIndia | Downstream reflection — confirmation (ANC-53) | Booking confirmation shows Baggage, Bundle, and Meal (per passenger/segment) with prices, on a real booking (Airline PNR Y1ZVFF) | Direct Observation (corroborated by Human Observation + Static Artifact) | FINDING-008 |
| Ancillaries / AirIndia | Downstream reflection — itinerary (ANC-53) | Itinerary (My Bookings) independently shows the same ancillaries per passenger/segment | Direct Observation (corroborated by Human Observation + Static Artifact) | FINDING-009 |
| Ancillaries / AirIndia | Post-booking lifecycle (ANC-52) | Ancillary change/removal blocked after booking confirmation — a full DOM scan of the real booking's detail page found zero change/cancel/remove/modify controls | Direct Observation (corroborated by Human Observation) | FINDING-010 |
| Ancillaries / AirIndia | Downstream reflection — reports (ANC-53) | Total Due to NDC and Sales reports both show the real booking with the exact 24,122.00 EGP total (Amount Payable To Ndc / Payable To Ndc / Sales Amount) | Direct Observation | FINDING-011 |
| Ancillaries / AirIndia | Downstream reflection — Statement report (ANC-53) | Statement report returns zero rows for this Branch/Agency under any filter, including a fully unfiltered wide date range at the API level — user confirmed this is a defect in the report itself, not a test-data/config gap | Direct Observation (corroborated by Human Observation — user confirmation) | FINDING-012 |

## 6. Confirmed Behaviour

| Requirement (Project Context §) | Confirmed Behaviour | Evidence Category | Finding ID(s) |
|---|---|---|---|
| §2 In Scope — ANC-20 (flight attribution) | Selected flight is clearly attributed to the Supplier under test | Human Observation + Static Artifact | *(Timeline, no dedicated Finding)* |
| §2 In Scope — ANC-48 (Application Level defaults) | Baggage=Per Journey, Meal=Per Segment, exactly as the platform default | Direct Observation | FINDING-002 |
| §2 In Scope — ANC-49 (eligibility default) | Infant excluded from all three Supported capabilities | Direct Observation | FINDING-006 |
| §2 In Scope — ANC-46 (wallet/payment timing) | No deduction until booking confirmation, then the exact total | Direct Observation | FINDING-007 |
| §2 In Scope — ANC-53 (downstream reflection) | Confirmed at booking-confirmation, itinerary, and reports (Total Due to NDC, Sales) levels, for Meal, Baggage, and Bundle. Statement report is **not** confirmed — see FINDING-012 (Bug, §9 Discovered Risks) | Direct Observation | FINDING-008, FINDING-009, FINDING-011 |
| §2 In Scope — ANC-52 (post-booking lifecycle) | Change/removal blocked after booking | Direct Observation (comprehensive DOM scan, zero matching controls) | FINDING-010 |
| §2 In Scope — ANC-50 (Bundle coexistence) | Bundle purchased alongside individually selected Meal/Baggage without conflict, priced separately then included in total | Direct Observation | FINDING-005, FINDING-008 |

## 7. Assumptions

<!-- No new inferred statements were introduced this run beyond what the Project Context already
     carried forward — see §6 Carried-Forward Assumptions & Risks in ProjectContext.md, addressed
     in the Gaps/Open Questions sections below. -->

| ID | Assumption | Why Inferred (not observed) | Evidence Category |
|---|---|---|---|
| RCH-001 | "Price for Infant: 0 EGP" in the Bundle step means Infant is excluded, not included at zero cost | The UI displays a price row rather than omitting Infant entirely; the operator's separate direct statement (not this UI row) is the actual basis for the exclusion conclusion | Assumption, corroborated by Human Observation (FINDING-006) |

## 8. Open Questions

<!-- OQ-D-001, 002, 003, and 005 were resolved 2026-09-26 (see the Findings they closed) and are
     retained here, marked Resolved, for traceability — the platform's convention throughout this
     project (e.g. shared baseline §8) is to keep a resolved item visible with its resolution
     rather than delete it. -->

| ID | Open Question | Rect | Why the Answer Matters | What Would Resolve It | Original | Annotated | Project Context Ref |
|---|---|---|---|---|---|---|---|
| OQ-D-001 | **Resolved 2026-09-26** — Is "Special equipment Handling Fee" AirIndia's standard baggage ancillary label? | Q1 (closed) | — | Answered: it's one of several selectable options in a "Choose a baggage" dropdown, alongside "+5Kgs Xtra-Carry-On" | `findings/FINDING-004_BaggageLabelUnclear/pax_details_fare_breakdown.png` | `findings/FINDING-004_BaggageLabelUnclear/baggage_dropdown_options.png` (resolves Q1) | `SupplierChecklist.md` §5b, §5c |
| OQ-D-002 | **Resolved 2026-09-26** — Are rule-engine markup/discount/service-fee adjustments (ANC-44) ever shown as separate Fare Breakdown line items? | — | — | Answered: Markup folds into Base Fare by design; Service Charge/Discount should show separately but aren't configured yet for this Branch/Credential (a test-data gap, see FINDING-003) | `findings/FINDING-003_RuleEngineNotVisible/pax_details_fare_breakdown.png` | — | Shared baseline ANC-44 |
| OQ-D-003 | **Resolved 2026-09-26** — Do DB, Security, and Performance testing layers apply to AirIndia? | — | — | Answered: "not for now" — deferred, not in scope currently | — | — | `SupplierChecklist.md` §2b, §12 |
| OQ-D-004 | **Resolved 2026-09-26** — What is the destructive-action policy for this internal test environment? | — | — | Answered: irreversible actions (e.g. completing a real booking) are permitted only when the credential and environment are confirmed Staging. **Correction (2026-09-26, same day):** a credential's *name* (e.g. "IndiaAirLineStg") is not sufficient proof of this — a name can say "Stg" and still be Production, or vice versa. The rule is: **always ask the user to explicitly confirm staging before performing any irreversible/destructive action, every time** — never infer it from a credential or environment name | — | — | `ProjectContext.md` §5 |
| OQ-D-005 | **Resolved 2026-09-26** — Which specific ancillary type was attempted for post-booking change/removal, and what exact UI response indicated the block? | — | — | Answered: no ancillary control (add/change/remove) exists at all post-booking, for any type — see FINDING-010 | — | — | Shared baseline ANC-52 |

## 9. Discovered Risks

| ID | Risk | Business Risk | Technical Risk | Finding ID(s) |
|---|---|---|---|---|
| RISK-001 | Supplier name mismatch (now resolved) | Wrong-Supplier validation if the mapping had gone unconfirmed | No recorded mapping between platform slug and app-internal name, until this run | FINDING-001 |
| RISK-002 | Service Charge/Discount not configured (resolved to a test-data gap, not a defect) | Until configured, pricing coverage for these two rule-engine components is untestable for AirIndia | None — Markup's folding into Base Fare is confirmed by design | FINDING-003 |
| RISK-004 | Weak evidence for post-booking immutability | None beyond normal QA rigor | A Regression-test candidate is being seeded from Human-Observation-only evidence, though now more precisely described | FINDING-010 |
| RISK-005 | Statement report has zero data for this Branch/Agency — confirmed a defect in the report itself (2026-09-27, user confirmation), not a test-data/config gap | Agencies/agents cannot reconcile Total Payable or Wallet Balance via Statement report for any transaction on this Branch/Agency | Statement report's backend query path returns no rows under any input, while sibling reports (Total Due to NDC, Sales) drawing from related transaction data return correct results | FINDING-012 |

## 10. Coverage

| Area / Module | Coverage Status | Discovery Mode | Notes |
|---|---|---|---|
| Admin — Branch config | Covered | User-guided exploration | FINDING-001 |
| Admin — Supplier/Credential assignment | Covered | Direct Observation (+ User-guided exploration) | FINDING-001 |
| Portal — Flight Search & selection | Covered | Direct Observation (+ User-guided exploration) | ANC-19/20 confirmed |
| Portal — Passenger Details / Ancillaries step | Covered | Direct Observation (+ User-guided exploration) | FINDING-002, 003, 004 |
| Portal — Bundles step | Covered | Direct Observation (+ User-guided exploration) | FINDING-005, 006 |
| Portal — Payment Details | Covered | Direct Observation (+ User-guided exploration) | FINDING-007 |
| Portal — Booking Confirmation | Covered | Direct Observation (+ User-guided exploration) | FINDING-008 |
| Portal — Itinerary / My Bookings re-check | Covered | Direct Observation (+ User-guided exploration) | FINDING-009 |
| Portal — post-booking change/removal attempt | Covered | Direct Observation (+ User-guided exploration) | FINDING-010 |
| Portal — Reports: Total Due to NDC | Covered | Direct Observation | FINDING-011 |
| Portal — Reports: Sales | Covered | Direct Observation | FINDING-011 |
| Portal — Reports: Statement | Covered (visited; confirmed defect — report returns no data) | Direct Observation | FINDING-012 |

**Roll-up:** 12 Covered · 0 Partial · 0 Blocked · 0 Unreachable — 100% of the declared in-scope surface (see `Coverage_Summary.md`, rev 2). "Covered" for Statement means the screen was visited and queried exhaustively, not that its data was verified — see FINDING-012/GAP-006.

## 11. Gaps

| ID | Gap Type | Description | Project Context Ref | Finding ID(s) |
|---|---|---|---|---|
| GAP-001 | Absent (now resolved) | Provider ID/code mapping between the platform's "AirIndia" and the app's "IndiaAirLine"/"IndiaAirLineStg" was undocumented before this run | `SupplierChecklist.md` §1 | FINDING-001 |
| GAP-002 | Extends (now resolved) | Bundle's Application Level had no platform default and no AirIndia-specific value; this run establishes it as Per Journey (Discovered) | `SupplierChecklist.md` §5c | FINDING-005 |
| GAP-003 | Absent (now resolved) | The application's Extra Baggage option set (piece-based "Special equipment Handling Fee", weight-based "+5Kgs Xtra-Carry-On") was undocumented before this run | `SupplierChecklist.md` §5b | FINDING-004 |
| GAP-004 | Absent (now resolved, but blocked on configuration) | Markup folds into Base Fare by design (documented); Service Charge/Discount visibility cannot be verified until configured for this Branch/Credential | Shared baseline ANC-44 | FINDING-003 |
| GAP-005 | Extends (informational) | The live app's own "Ancillaries" terminology (step 03, "Meals and baggage") excludes Bundle, which the platform's Capability Model treats as one of the four Ancillaries capabilities — a naming/navigation distinction, not a defect | `CapabilityModel.md` §1 | FINDING-002, FINDING-005 |
| GAP-006 | Absent (resolved 2026-09-27 — confirmed a defect, not a test-data/config gap) | Statement report (`/reports/statement`) returns zero rows for this Branch/Agency under any filter, confirmed at the API level with a fully unfiltered wide date range. User reviewed directly and confirmed this is an issue in the report itself | Shared baseline ANC-53 | FINDING-012 |

## 12. Recommendations

| ID | Recommendation | Rationale | Finding ID(s) |
|---|---|---|---|
| REC-001 | Record AirIndia's confirmed app-internal identity ("IndiaAirLine" / "IndiaAirLineStg") in `SupplierChecklist.md` §1 during the next Stage 1 revision | Closes GAP-001 | FINDING-001 |
| REC-002 | Record Bundle's Application Level as Per Journey, Source Status Discovered, in `SupplierChecklist.md` §5c | Closes GAP-002 | FINDING-005 |
| REC-003 | Record the confirmed Extra Baggage option set (piece-based and weight-based options) in `SupplierChecklist.md` §5b/§6 | Closes GAP-003 | FINDING-004 |
| REC-004 | Configure Service Charge and/or Discount for AirIndia's test Branch/Credential, then re-verify they appear in the Fare Breakdown | Closes GAP-004 once configuration exists | FINDING-003 |
| REC-005 | Optionally capture a screenshot of the post-booking view (showing no ancillary controls) in a future pass, to move FINDING-010 to fuller confidence — not a blocker | Strengthens FINDING-010's evidence quality | FINDING-010 |
| REC-006 | Record the confirmed Environment Constraint in `ProjectContext.md` §5: irreversible actions (e.g. completing a real booking) are permitted only when the credential/environment is confirmed Staging. **This confirmation must be an explicit ask to the user every time, never inferred from a credential/environment name** (a "Stg"-named credential is not proof — it could still be Production) | Resolves OQ-D-004 | — |
| REC-007 | Record "DB/Security/Performance layers: not in scope for now" as the formal Testing Layer Scope decision for AirIndia in `SupplierChecklist.md` §2b during the next Stage 1 revision | Resolves OQ-D-003 | — |
| REC-008 | Escalate the Statement report defect to the engineering team (confirmed 2026-09-27, not a test-data gap). For Test Design: write Statement report test cases now, using the same six-checkpoint/downstream-reflection model as FINDING-011's Total Due/Sales cases, but hold their execution in a **Pending/Blocked status** until the defect is fixed — per the user's explicit instruction, do not execute them against the currently-broken report | Closes GAP-006 | FINDING-012 |

**Regression Test Candidates:** Baggage/Meal/Bundle selection and pricing across the six-checkpoint validation model (Selection UI → Fare Breakdown → Booking Request → Supplier Confirmation → Persisted Booking → Itinerary); wallet deduction timing; post-booking immutability of ancillaries; Infant exclusion from all three Supported capabilities; multi-segment Meal-per-leg vs. journey-level Baggage/Bundle behavior.

## 13. Inputs for Test Design

**Findings by ID:**

| Finding ID | Category | Status | Severity | Module |
|---|---|---|---|---|
| FINDING-001 | Requirement Gap | Rejected | N/A | Ancillaries / AirIndia |
| FINDING-002 | Observation | Confirmed | N/A | Ancillaries / AirIndia |
| FINDING-003 | Test Gap | Needs Human Review | N/A | Ancillaries / AirIndia |
| FINDING-004 | Observation | Rejected | N/A | Ancillaries / AirIndia |
| FINDING-005 | Observation | Confirmed | N/A | Ancillaries / AirIndia |
| FINDING-006 | Observation | Confirmed | N/A | Ancillaries / AirIndia |
| FINDING-007 | Observation | Confirmed | N/A | Ancillaries / AirIndia |
| FINDING-008 | Observation | Confirmed | N/A | Ancillaries / AirIndia |
| FINDING-009 | Observation | Confirmed | N/A | Ancillaries / AirIndia |
| FINDING-010 | Observation | Confirmed | N/A | Ancillaries / AirIndia |
| FINDING-011 | Observation | Confirmed | N/A | Ancillaries / AirIndia |
| FINDING-012 | Bug | Confirmed | Medium | Ancillaries / AirIndia |
| FINDING-013 | Observation | Needs Human Review | N/A | Ancillaries / AirIndia (Admin, provisional — §14) |
| FINDING-014 | Observation | Needs Human Review | N/A | Ancillaries / AirIndia (Admin, provisional — §14) |
| FINDING-015 | Observation | Needs Human Review | N/A | Ancillaries / AirIndia (Admin, provisional — §14) |
| FINDING-016 | Observation | Needs Human Review | N/A | Ancillaries / AirIndia (Admin, provisional — §14) |
| FINDING-017 | UX Issue | Needs Human Review | Low | Ancillaries / AirIndia (Admin, provisional — §14) |

**Assumption disposition** (from `ProjectContext.md` §6 Carried-Forward Assumptions & Risks):

| Assumption ID | Disposition | Basis |
|---|---|---|
| ANC-13-carry (Application Level defaults) | Confirmed | FINDING-002 |
| ANC-41-carry (eligibility default) | Confirmed | FINDING-006 |
| Bundle-level-gap | Confirmed (resolved via Discovery) | FINDING-005 |
| Provider-ID-gap | Confirmed (resolved via Discovery) | FINDING-001 |
| Testing-layer-gap | Unresolved | Not addressed this run — business/QA-lead decision (OQ-D-003) |

**Requirement Gaps needing a coverage decision:**

| Gap ID | Requirement | Decision Needed From Test Design |
|---|---|---|
| GAP-004 | Service Charge/Discount pricing components | Whether to design test cases against Service Charge/Discount now (deferring their execution until configured) or wait for configuration before writing them — both are reasonable; Test Design's call |

**Explicit Test Design instruction (not a gap needing a decision — the decision has been made):** GAP-006 (Statement report) is **resolved** — the user confirmed 2026-09-27 this is a defect in the report itself, not a test-data gap. Per the user's direct instruction: Test Design **must** write Statement report test cases now (same six-checkpoint/downstream-reflection model as FINDING-011's Total Due/Sales cases), and **must** hold their execution in a **Pending/Blocked** status until the defect is fixed — do not execute against the currently-broken report. This now covers **both Portal and Admin** (FINDING-012's Admin corroboration, §14).

## 14. Admin Scope (Findings from User-Supplied Evidence — Project Context now Approved, Findings themselves still evidence-tier-capped)

**Read this section's caveat before treating anything below as equivalent in weight to §1-13.** As of 2026-09-28, Admin's Booking-Mid Office cycle **is** formally declared in Project Context — the shared `ancillaries-baseline` Project Context rev 4 (Approved 2026-09-28) added ANC-54…ANC-58 (Admin's own booking cycle, shared rule engine, three-component wallet, own Reports set, Agency/Agent selection), and AirIndia's own Project Context rev 3 (Approved 2026-09-28) references them in its own §2/§3. **What remains open is evidence tier, not scope.** Every Finding below still rests on user-supplied screenshots + narrated steps (Human Observation + Static Artifact), and per the Confidence Model (§18), that evidence category can never reach `Confirmed`, no matter how internally consistent the figures are — regardless of Project Context now backing the requirement. Every Finding below is `Needs Human Review` for exactly that reason, not because of any doubt about what was observed, and not for lack of a traceable requirement anymore.

| Finding ID | What it covers | Status | Why it matters |
|---|---|---|---|
| FINDING-013 | Admin's Booking-Mid Office cycle (search -> PAX Details -> Bundle -> Ancillaries -> Payment -> Confirmation) produces correct, fully-reconciling pricing for a real booking, mirroring Portal's own six-checkpoint model | Needs Human Review (90%) | Establishes Admin's booking cycle works the same way Portal's does, for at least one scenario |
| FINDING-014 | Admin's Fare Details explicitly itemizes Service Charge (+75 EGP) and Discount (-150 EGP) as separate rows — Portal's FINDING-003 never showed these, attributed to "not configured" | Needs Human Review (85%) | Since the rule engine is shared (not channel-exclusive, per the user), this may mean FINDING-003's "not configured" explanation needs re-checking, or that configuration is genuinely per-Branch/Agency — unresolved either way |
| FINDING-015 | Admin's wallet shows three components (Your Balance / Credit Balance / Top Up Balance) vs. Portal's single figure; deduction still reduces Top Up Balance by the exact booking total | Needs Human Review (88%) | A genuine architectural difference Test Design needs to know about when asserting wallet figures on Admin |
| FINDING-016 | Admin's Total Due to NDC, Agency Wallet, Sales, AR Ledger, and Wallet History reports all correctly reflect a real booking (mutually cross-corroborating) | Needs Human Review (92%) | Extends FINDING-011's Portal report-reflection confirmation to Admin's own report set (Daily Sales explicitly excluded from scope by the user — never evidenced, not to be pursued) |
| FINDING-017 | Wallet History Report's Credit/Debit column labeling reads as inverted from standard accounting convention (figures themselves are correct) | Needs Human Review (82%, UX Issue, Low) | A product/labeling decision, not a data defect — worth a decision before Test Design writes assertions against specific column names |

**Also corroborated this session via Admin evidence (not new Findings, existing ones updated):** FINDING-006 (Infant exclusion — Admin's booking confirmation shows the same exclusion pattern, Occurrence Count now 3) and FINDING-012 (Statement report defect — reproduced on Admin too, Occurrence Count now 2, confirming one underlying defect affects both channels).

**Explicitly out of scope, per the user (2026-09-27) — do not pursue as test-worthy items or Findings:** the Markup / Send Quotation / Save Quote controls on Admin's search-results screen; Banque Misr as a payment method beyond noting it exists; the "Void/Cancel" link on Admin's booking detail page (visually different from Portal's confirmed zero post-booking controls in FINDING-010, but explicitly ruled out of scope); Daily Sales Report.

**Before Stage 3/4 treats this section's Findings as `Confirmed`-equivalent:** re-verify FINDING-013 through FINDING-017 live (browser automation, or the agreed retrieve-endpoint-only approach — see Testing Approach note below) — the Project Context grounding is now in place (ANC-54…ANC-58, both revisions Approved 2026-09-28), so only the evidence tier is left to close.

**Testing approach agreed for AirIndia (2026-09-27, applies to both Admin and Portal going forward):** run the full booking cycle normally through the system UI, then verify correctness via the supplier's **retrieve endpoint** only (Postman) — no pre-booking parallel search/offer-matching step (a deliberate simplification from the parallel-validation model used for other Suppliers). Accepted trade-off: this cannot independently verify rule-engine/ROE math against a raw pre-booking baseline, nor verify that the full ancillary *availability* set shown pre-selection is accurate — only that what was *selected* persisted correctly. The user confirmed they have Postman/API access for AirIndia's NDC connection (resolving `SupplierChecklist.md` §3b's "To Be Discovered" rows, not yet updated in that file).

**Handoff confirmation:** All 5 Open Questions raised during this run were resolved before approval (OQ-D-001 through OQ-D-005); the one remaining action item, GAP-004 (Service Charge/Discount configuration), is a test-data/configuration task, not an unresolved question blocking Test Design. Every input `.claude/skills/test-design-skill/SKILL.md` §4 declares it needs is present: the Discovery Report (`discovery/*.md`, `Timeline.md`, `Coverage_Summary.md`), this QA Assessment Report (with Gaps §11 and Coverage §10), the Findings Summary plus every Finding's `metadata.md` (each with a populated Expected Behavior field citing a specific `ANC-xx` requirement or Project Context section), Evidence Packages cited by reference, and Regression Test Candidates (§12). Every Finding's Status (`Rejected`, `Confirmed`, or `Needs Human Review`) and Evidence Category unambiguously maps to Test Design's Finding Disposition model — `Rejected`/low-corroboration findings toward Documented exception or Exploratory, `Needs Human Review` toward Exploratory test, `Confirmed` `Bug` findings toward Regression test (held Pending where noted), per `test-design-skill/SKILL.md` §5.3. As of rev 7 (2026-09-27), live browser automation upgraded 7 of 8 original Observation Findings (FINDING-001, 002, 005, 006, 007, 008, 009, 010 — 8 total including the Requirement Gap) to `Confirmed` status via Direct Observation, including a real test booking (Airline PNR Y1ZVFF, Booking Reference NDCEG-BR-F260926mlLT19) completed only after the user explicitly authorized proceeding and re-confirmed Staging per the standing safety rule. FINDING-003 (a test-data/configuration gap, not a live-automation-reachability question) remains at `Needs Human Review`, which is expected, not a gap in this report. Rev 6-7 closed the ANC-53 "reports" coverage gap the user flagged ahead of Stage 3: FINDING-011 (Total Due to NDC and Sales, `Confirmed`) and FINDING-012 (Statement report — reclassified rev 7 from `Test Gap`/`Needs Human Review` to `Bug`/`Confirmed`/Medium after the user's direct confirmation; test cases required now, execution held Pending — see above and REC-008).
