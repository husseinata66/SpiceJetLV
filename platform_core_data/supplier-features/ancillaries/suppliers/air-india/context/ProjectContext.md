# Project Context — Ancillaries / AirIndia

| Field | Value |
|---|---|
| Module (Supplier Feature) | `ancillaries` |
| Supplier | `air-india` (AirIndia) — an independent entity, not a "Feature" (`new_us_intake.md` §12.1) |
| Integration Layer | `ndc-core-service` (Feature metadata, set 2026-09-23 on this Supplier's onboarding evidence — not an owner) |
| Shared baseline consumed | `platform_core_data/supplier-features/ancillaries/shared/ancillaries-baseline/context/ProjectContext.md` (rev 4, Approved 2026-09-28 — adds ANC-54…ANC-58, Admin's own booking cycle) |
| Supplier Checklist consumed | `platform_core_data/supplier-features/ancillaries/suppliers/air-india/context/SupplierChecklist.md` (rev 1, Draft — the intake artifact this document distills) |
| Run Scope Type | Feature (Supplier Feature — `new_us_intake.md` §12) |
| Run Type | User Story |
| Target Environment | Admin + Portal, one internal test environment, two URLs — see §4 (values held out of version control) |
| Produced by run | `run-007__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia` |
| Revision | 3 (2026-09-28 — adds Admin's Booking-Mid Office scope for AirIndia, referencing the shared baseline's new ANC-54…ANC-58) |
| Target ref at write | `bc564a4c8364560b2664de5c4e64ad21c8b70925` |
| Generated | 2026-09-23 (revised 2026-09-25, 2026-09-28) |
| Status | Approved |
| Approved by | Ahmed Alhussieny |
| Approved on | 2026-09-28 (rev 3) |

## 1. Scope Summary

This is the Project Context for testing **Ancillaries** — Baggage, Meal, and Bundle selection during
booking — for the Supplier **AirIndia**, an NDC source connected through the platform's
`ndc-core-service` integration layer. AirIndia supports three of the four known Ancillaries
capabilities today: **Baggage**, **Meal**, and **Bundle** (Bundle added 2026-09-25, correcting the
initial "Baggage and Meal only" intake). **Seat** is recorded as Unsupported for AirIndia at this
time (`SupplierChecklist.md` §5c) — this is a normal capability fact (ANC-05), not a gap.

Execution spans two applications — Admin (Supplier/credential configuration) and Portal (search,
booking, ancillary selection) — per the shared baseline §4 and ANC-26. This run uses the **manual
execution pipeline** (Stage 1 → 2 → 3 → 4M); no automation branch is in scope for this task.

## 2. In Scope for This Supplier Scope

| Area / Screen / Flow | Why in scope | Source |
|---|---|---|
| Admin: Branch configuration, Supplier assignment, Credential/PCC/Market assignment for AirIndia | Precondition for every Ancillaries execution | ANC-14…ANC-18 |
| Portal: flight search, flight selection attributed to AirIndia, PAX Details | Required to reach the Ancillaries section | ANC-19…ANC-21 |
| Baggage selection, at AirIndia's Application Level (platform default: Per Journey) | Supported capability | ANC-48, `SupplierChecklist.md` §5c |
| Meal selection, at AirIndia's Application Level (platform default: Per Segment) | Supported capability | ANC-48, `SupplierChecklist.md` §5c |
| Bundle selection, Application Level To Be Discovered (no platform default exists for Bundle) | Supported capability, added 2026-09-25 | `SupplierChecklist.md` §5c |
| Bundle coexistence with individually selected capabilities, no conflict, priced separately then included in total | Confirmed | ANC-50 |
| Pricing: ROE-based currency conversion, taxes/fees per offer, rule-engine markup/discount/service fee, ancillary+bundle amounts added to total | Confirmed pricing contract (resolves the former OQ-ANC-01) | ANC-42…ANC-45 |
| No wallet/payment deduction at selection; full deduction at booking confirmation | Confirmed | ANC-46 |
| Change/removal of a selected ancillary before booking, per passenger. **Not permitted after booking** | Confirmed | ANC-47, ANC-52 |
| Booking confirmation, itinerary, and reports all reflect selected ancillaries and their prices | Confirmed | ANC-53 |
| Admin's own booking cycle (Booking-Mid Office): search -> flight selection (optionally for a chosen Agency/Agent) -> PAX Details -> Bundle -> Ancillaries -> Payment -> confirmation, mirroring Portal's flow through the same shared rule engine | Confirmed for AirIndia 2026-09-27/28 (user-supplied evidence — see `discovery/QA_Assessment_Report.md` §14, FINDING-013) | ANC-54, ANC-55 |
| Admin's three-component wallet (Your Balance / Credit Balance / Top Up Balance), distinct from Portal's single balance | Confirmed for AirIndia 2026-09-27/28 | ANC-56 |
| Admin's own Reports for price verification: Total Due to NDC, Agency Wallet, Sales, AR Ledger Report, Wallet History Report, Statement | Confirmed for AirIndia 2026-09-27/28 (Statement confirmed broken — see FINDING-012) | ANC-57 |
| Admin's Agency/Agent selection at search time, supplying that booking's wallet | Confirmed for AirIndia 2026-09-27/28 | ANC-58 |
| Six-checkpoint validation (Selection UI, Fare Breakdown, Booking Request, Supplier Confirmation, Persisted Booking, Itinerary) for Baggage, Meal, and Bundle | Confirmed | ANC-31…ANC-36 |
| Passenger eligibility: Adult and Child only (platform default) | Confirmed | ANC-49 |
| UI, API, Contract, Integration, E2E, Regression testing layers | Explicitly named at AirIndia intake | `SupplierChecklist.md` §2b |

## 3. Out of Scope for This Supplier Scope

| Area / Screen / Flow | Why out of scope | Covered by | Source |
|---|---|---|---|
| Seat selection for AirIndia | Confirmed Unsupported at this time — not a defect (ANC-05) | Not tested for AirIndia today — may re-enter scope if AirIndia's support changes | `SupplierChecklist.md` §5c |
| Seatmap ownership boundary | Ancillaries exposing Seat (for a Supplier that supports it) does not claim Seatmap's business scope | Deferred — OQ-ANC-09, not registered today | Shared baseline §3.1 |
| Upselling ownership boundary | Ancillaries exposing Bundle (for a Supplier that supports it) does not claim Upselling's business scope | Deferred — OQ-ANC-10, not registered today | Shared baseline §3.1 |
| DB, Security, Performance testing layers | Not named among the layers given at AirIndia intake; not confirmed as a deliberate exclusion | Deferred pending clarification, not assigned elsewhere | `SupplierChecklist.md` §2b |
| Import Booked PNR's Source/Target dual-environment model | Explicitly not inherited by Ancillaries | N/A — Ancillaries creates its booking inside its own flow | ANC-26, ANC-51 |
| Admin's Markup / Send Quotation / Save Quote controls | Named and deliberately excluded, not overlooked | Not tested for AirIndia — mid-office quoting tools, not Ancillaries verification | Shared baseline §3 |
| Admin's "Void/Cancel" post-booking control | Named and deliberately excluded — its presence does not reopen ANC-52 | Not tested for AirIndia | Shared baseline §3 |
| Admin's Daily Sales Report | Never evidenced, explicitly excluded | Not tested for AirIndia | Shared baseline §3 |
| Banque Misr payment method | Noted as existing alongside Wallet, not itself in scope | Not tested for AirIndia | Shared baseline §3 |

## 3.1 Supplier/Feature Boundaries

| Related scope | Interaction | Verified by |
|---|---|---|
| `ancillaries` shared baseline (`shared/ancillaries-baseline`) | Source of every `ANC-xx` requirement this document cites; AirIndia's capability matrix and environment details are supplier-specific additions on top of it | This Supplier's own Discovery/Test Design |
| `import-booked-pnr` (`ndc-core-service` integration layer) | Shares the same integration layer as this Supplier, now that `ndc-core-service` is set on the Ancillaries Feature — no functional dependency confirmed beyond the shared backend path | Not verified; noted for awareness only |

## 4. Roles & Credentials Required

<!-- No credential VALUE appears in this document, per this template's own rule and the platform's
     credentials convention (platform_core_data/knowledge_base/credentials/README.md). AirIndia's
     actual Admin/Portal URLs and login details were supplied directly by Ahmed Alhussieny during
     Supplier intake (2026-09-23) and were deliberately kept out of version control on his decision —
     obtain them from him directly when executing. -->

| Role | Permissions / purpose | Credential source | Source |
|---|---|---|---|
| Admin user | Configure Branch, assign AirIndia and its Credential/PCC/Market | Held by Ahmed Alhussieny — not stored in this repository | `SupplierChecklist.md` §3a |
| Portal (Agency) user | Search, book, and select ancillaries | Held by Ahmed Alhussieny — not stored in this repository | `SupplierChecklist.md` §3a |

## 5. Environment Constraints

| Constraint | Implication for downstream stages | Source |
|---|---|---|
| Internal-only test environment (private network) | Lower exposure risk than a public/shared environment, but destructive-action policy is still To Be Discovered — treat as unconfirmed until Discovery states otherwise | `SupplierChecklist.md` §3a, intake 2026-09-23 |
| Admin and Portal are the same environment/tenant but two separate URLs and credential sets | Discovery and Test Design must record Admin and Portal access independently, never merge them | ANC-26, ANC-51 |

## 6. Carried-Forward Assumptions & Risks

| ID | Type | Statement (meaning preserved) | Affected Scope | Source |
|---|---|---|---|---|
| ANC-13-carry | Assumption | Application Level (Baggage=Journey, Meal=Segment) is a platform-wide **default**; Discovery must still verify AirIndia's actual behavior — a deviation is a recorded discrepancy, not silently overridden | air-india | ANC-13, ANC-48 |
| ANC-41-carry | Assumption | Adult/Child-only eligibility is a platform-wide **default**; Discovery must still verify AirIndia's actual restriction rules | air-india | ANC-41, ANC-49 |
| Bundle-level-gap | Assumption | Bundle's Application Level has no platform-wide default (unlike Baggage/Meal under ANC-48) — Discovery must establish it for AirIndia directly, not assume one | air-india | `SupplierChecklist.md` §5c |
| Provider-ID-gap | Risk | AirIndia's Provider ID/code was not supplied at intake — §3b (API/Integration) and parts of §1 (Identity) stay To Be Discovered until Discovery resolves it | air-india | `SupplierChecklist.md` §1, §3b |
| Testing-layer-gap | Risk | DB, Security, and Performance layer applicability for AirIndia is unconfirmed — recorded Deferred, not Out of Scope, pending clarification | air-india | `SupplierChecklist.md` §2b |

## 7. Traceability Anchor

| Context Item | Section here | Source |
|---|---|---|
| Capability matrix (Baggage/Meal/Bundle Supported; Seat Unsupported) | §1, §2, §3 | `SupplierChecklist.md` §5c |
| Pricing, currency, lifecycle, post-booking, and downstream-representation rules | §2 | ANC-42…ANC-53 |
| Application-level and eligibility defaults | §2, §6 | ANC-48, ANC-49 |
| Environment architecture (same tenant, two URLs) | §3, §5 | ANC-51 |
| Integration layer | header | ANC-11 resolution, `module.json` |
| Admin's own booking cycle, wallet, and reports (§2, new 2026-09-28) | §2 | ANC-54…ANC-58 (shared baseline rev 4, draft) |

## 8. Open Questions

| # | Open Question | Sections Affected | Source |
|---|---|---|---|
| 1 | AirIndia's Provider ID/code | §4 (Roles), Traceability | `SupplierChecklist.md` §1 |
| 2 | Do DB, Security, and Performance testing layers apply to AirIndia? | §2, §3, §6 | `SupplierChecklist.md` §12 |
| 3 | Bundle's Application Level for AirIndia (no platform default exists) | §2, §6 | `SupplierChecklist.md` §5c |
| 4 | Destructive-action policy for this internal test environment | §5 | Not yet stated at intake |

**Resolved 2026-09-25:** after-booking change/removal → Not permitted (ANC-52). Downstream
screens/reports → booking confirmation, itinerary, and reports (ANC-53).

These are normal Discovery obligations (ANC-37…ANC-41), not blockers — the Supplier Checklist's own
Intake Decision (§13) records "Ready for Discovery."
