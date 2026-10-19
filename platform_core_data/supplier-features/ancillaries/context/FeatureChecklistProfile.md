# Feature Checklist Profile — Ancillaries

<!-- Sourced FROM this Feature's approved shared context — never invented independently of it. This
     Profile is Feature-level: it does not bind to one shared scope's name, so a Supplier renderer
     resolves it from the Feature root regardless of how many shared scopes the Feature accumulates
     later. Every source used is listed below with its own revision. When a source changes, this
     Profile is updated in the same review, not left stale.

     Every row here is CAPABILITY-GATED. No row asserts that any Supplier supports any capability.
     A row's applicability is decided by that Supplier's own §5c capability matrix, governed by
     CapabilityModel.md. Rendering carries Source Status through unchanged — it never promotes an
     Open, Provisional, or Provided item to Confirmed or Verified. -->

**Feature:** Ancillaries (`ancillaries`)
**Canonical location:** `platform_core_data/supplier-features/ancillaries/context/FeatureChecklistProfile.md`
**Status:** Draft — pending approval (merge of two approved/draft lines; re-approval needed)
**Revision:** 3 — merges rev 2 Approved 2026-09-25 (resolved OQ-ANC-01…08/11) with the 2026-09-27 cabin × bundle and seat-eligibility rows
**Last Updated:** 2026-10-08

### Sources

| Source | Path | Revision | What it contributed |
|---|---|---|---|
| Shared baseline context | `shared/ancillaries-baseline/context/ProjectContext.md` | rev 3 (Approved 2026-09-25) | §A, §B, §C, §D rows and the `ANC-xx` IDs (now `ANC-01`…`ANC-53`) |
| Feature-level capability model (not a shared scope) | `context/CapabilityModel.md` | rev 1 | The capability gate every row below depends on; injected separately into §5c |
| Feature-level operational knowledge (not a shared scope) | `context/ExecutionFlow_HappyPath.md` | rev 7 | How to execute — referenced by Suppliers via `SupplierChecklist.md` §3c, never duplicated. Rev 2 added §3.1 cabin × bundle coverage; rev 7 adds §15.5 portal rules and §16, the run pre-flight and speed playbook (every Ancillaries run reads §16 first; `CLAUDE.md` points there) |
| Feature-level saved booking script (Portal) | `context/SetupBooking_Script.md` | rev 1 | The proven one-call search → passengers → step 2 script, with no credential. Referenced by Suppliers, never copied; change only its parameter block |
| Human decision (not a shared scope) | Mohanad Dawood, 2026-09-27, in session (run-006) | — | The cabin × bundle rows below, and the answer to OQ-ANC-06. No `ANC-xx` ID yet: to be added to the shared baseline context's §6 at its next Stage 1 review |

**ID scheme used below:** `ANC-01` … `ANC-41`, the canonical series issued by the shared baseline
context §6. No Traceability Matrix exists yet — no Test Design has run for this Feature.

**Capability gate notation:** a row marked `[gated: <Capability>]` applies to a Supplier **only**
where that Supplier's §5c matrix records the capability as `Supported`. It does not apply, and
generates no expected result, where the capability is `Unsupported`, `To Be Discovered`, `Blocked`,
or `N/A`.

## A. Feature-Specific Test Data Rows

<!-- INJECTED INTO SupplierChecklist.md §5b -->

| Test Data Item | Why (Requirement ID) | Notes |
|---|---|---|
| Branch configured with the Supplier under test, active/available | ANC-14, ANC-15 | Precondition. Without it the execution is Blocked, not Failed |
| Supplier Credential / PCC / Market assigned to that Branch | ANC-16, ANC-17 | Record exactly which credential is used — never chosen arbitrarily |
| Admin user able to configure a Branch and assign a Supplier | ANC-14 | Actual role name To Be Discovered per Supplier |
| Portal user able to search, book, and select ancillaries | ANC-19, ANC-21 | May or may not be the same account as the Admin user — OQ-ANC-08 |
| A valid search route and date returning results from the Supplier under test | ANC-19, ANC-20 | Availability may depend on route / cabin / fare family — ANC-39, per-Supplier |
| A multi-segment journey (e.g. CAI to DXB to BKK) | ANC-10, ANC-11, ANC-12, ANC-13 | Required to tell Segment-level from Journey-level behavior. A single-segment route cannot distinguish them |
| Valid passenger data for the required passenger mix | ANC-21 | Passenger-type eligibility rules are Feature-level (OQ-ANC-06 answered 2026-09-27); Supplier-only rules are in each Supplier's `SupplierChecklist.md` §7c |
| A fare/cabin on which ancillaries are actually offered | ANC-39 | Which fares expose ancillaries is a per-Supplier Discovery obligation, never assumed |
| At least one flight **per cabin class** the Supplier returns, and the live bundle list for each cabin `[gated: Bundle]` | ANC-39; human decision 2026-09-27 | Drives the cabin × bundle matrix — `ExecutionFlow_HappyPath.md` §3.1. Prefer one flight selling several cabins on the same aircraft |
| Baggage-eligible booking `[gated: Baggage]` | ANC-23, ANC-29, ANC-37 | Only where Baggage is Supported for this Supplier |
| Meal-eligible booking `[gated: Meal]` | ANC-23, ANC-29, ANC-37 | Only where Meal is Supported for this Supplier |
| Seat-eligible booking `[gated: Seat]` | ANC-23, ANC-29, ANC-37 | Only where Seat is Supported. Exposing Seat claims no Seatmap scope — OQ-ANC-09 |
| Bundle-eligible booking `[gated: Bundle]` | ANC-23, ANC-29, ANC-37 | Only where Bundle is Supported. Exposing Bundle claims no Upselling scope — OQ-ANC-10 |
| A capability confirmed **Unsupported** for this Supplier | ANC-05 | Test data for the optional unsupported-capability confirmation case. Never a defect |
| Quantity/limit boundary data per supported capability | ANC-41 | Maximum baggage quantity, seat eligibility, bundle restrictions — values are per-Supplier, recorded from evidence, never invented |

## B. Feature-Specific Business / E2E Behavior Rows

<!-- INJECTED INTO SupplierChecklist.md §7b. Source Status is carried through unchanged. -->

| Behavior | Inherited Requirement ID | Source Status |
|---|---|---|
| Admin: Branch selected and Supplier assigned before execution | ANC-14, ANC-15 | Confirmed |
| Admin: correct Supplier Credential / PCC / Market assigned and available | ANC-16 | Confirmed |
| Admin: the credential used is recorded exactly, never chosen arbitrarily | ANC-17 | Confirmed |
| Full execution context recorded (Supplier, Credential, PCC, Market, Branch, Agency, Environment, User) | ANC-18 | Confirmed |
| Admin and Portal access details recorded **independently** | ANC-26 | Confirmed as a rule; whether they share one environment is Open — OQ-ANC-08 |
| Portal: valid flight search performed | ANC-19 | Confirmed |
| Portal: selected flight is from the Supplier under test, with attribution evidence | ANC-20 | Confirmed |
| Portal: PAX Details entered with valid passenger information | ANC-21 | Confirmed |
| Ancillaries section opens, and intake-recorded capability information is **verified** there rather than re-determined | ANC-22 | Confirmed |
| A live-behavior difference from a Provided value produces a discrepancy record, never a silent overwrite | ANC-08, ANC-22 | Confirmed |
| Only Supported capabilities are exercised | ANC-23 | Confirmed |
| Available ancillary options recorded **before** selection | ANC-27 | Confirmed |
| Baggage selection behaves at this Supplier's recorded application level `[gated: Baggage]` | ANC-10, ANC-12, ANC-24 | Confirmed as a rule; the level itself is per-Supplier |
| Meal selection behaves at this Supplier's recorded application level `[gated: Meal]` | ANC-10, ANC-12, ANC-24 | Confirmed as a rule; the level itself is per-Supplier |
| Seat selection behaves at this Supplier's recorded application level `[gated: Seat]` | ANC-10, ANC-12, ANC-24 | Confirmed as a rule; the level itself is per-Supplier |
| Bundle selection behaves at this Supplier's recorded application level `[gated: Bundle]` | ANC-10, ANC-12, ANC-24 | Confirmed as a rule; the level itself is per-Supplier |
| Different capabilities may use different application levels within one Supplier | ANC-12 | Confirmed |
| A capability confirmed Unsupported is a recorded fact, not a product defect | ANC-05 | Confirmed |
| Booking flow completes after ancillary selection | ANC-24 | Confirmed |
| Selected ancillary data preserved through booking | ANC-25 | Confirmed |
| Selected ancillary data reflected in downstream booking details | ANC-25 | **Open** — the "where applicable" set is undefined (OQ-ANC-04). Do not assert an expected result for an unlisted screen |
| Validation across all six checkpoints (Selection UI, Fare Breakdown, Booking Request, Supplier Confirmation, Persisted Booking, Itinerary) | ANC-31 | Confirmed where the checkpoint is observable |
| Each selected ancillary classified per checkpoint using the five-value model | ANC-32 | Confirmed |
| Per-checkpoint checks: passenger, segment/journey, type, quantity, price, currency, total, persisted status | ANC-33 | Confirmed |
| Ancillary pricing captured separately from base flight price, at all three points | ANC-34, ANC-35 | Confirmed |
| Final booking amount validated against the confirmed pricing contract | ANC-36, ANC-42, ANC-43, ANC-44, ANC-45 | **Confirmed** — resolved 2026-09-23. Pricing contract: Supplier price × ROE, taxes/fees per offer, rule-engine markup/discount/service fee, ancillary+bundle added to total |
| Wallet or payment validation on ancillary selection | ANC-46 | **Confirmed** — resolved 2026-09-23. No deduction at selection; full deduction (incl. ancillaries/bundle) at booking confirmation |
| Change or removal of a selected ancillary, before or after booking | ANC-47, ANC-52 | **Confirmed** — resolved 2026-09-23/2026-09-25. Permitted before booking, per passenger, not mandatory for every passenger. **Not permitted after booking** |
| Currency handling when credential market currency differs from booking currency | ANC-28, ANC-33, ANC-42 | **Confirmed** — resolved 2026-09-23. ROE-based conversion: booking price = Supplier price × ROE |
| Bundle interaction with individually selected capabilities `[gated: Bundle]` | ANC-50 | **Confirmed** — resolved 2026-09-23. Bundle coexists with individually selected capabilities, no conflict; priced separately in the fare breakdown, then included in the total |
| Every bundle is exercised in every cabin class the Supplier returns — one fresh offer per cabin × bundle, same check set on each `[gated: Bundle]` | ANC-39; human decision 2026-09-27 | Confirmed (human decision). Procedure: `ExecutionFlow_HappyPath.md` §3.1. A combination already executed in the same run is not repeated |
| Seat eligibility rules (infants, children, exit rows, seat sets) apply to every Supplier; only Supplier-specific rules differ `[gated: Seat]` | ANC-21; human decision 2026-09-27 | Confirmed (human decision). Supplier-only rules (e.g. ladies-only seats) are recorded per Supplier in `SupplierChecklist.md` §7c, collected at intake |

**No universal happy-path row exists, deliberately.** A Supplier supporting Baggage + Meal + Seat +
Bundle and one supporting Baggage + Meal both inherit this table, and both produce different coverage
from it — because every capability row is gated (ANC-01). A composite "successful ancillary booking"
outcome is assembled per Supplier from its own Supported capabilities, never from this Feature's
register.

## C. Feature-Specific Error Rows

<!-- INJECTED INTO SupplierChecklist.md §8b -->

| Error Case | Why (Requirement ID) |
|---|---|
| Supplier not assigned to the Branch | ANC-15. Execution is **Blocked**, not Failed — a configuration gap is not an Ancillaries defect |
| Required Supplier Credential / PCC / Market missing for the Branch | ANC-16. Blocked, same reasoning |
| Search returns no results from the Supplier under test | ANC-19, ANC-20. Cannot proceed; the run did not test the Supplier in scope |
| A flight from a different Supplier was selected | ANC-20. **Invalidates the execution.** Not a defect and not a partial pass — discard and repeat with correct attribution |
| Ancillaries section does not open, or exposes nothing | ANC-22. Record against the capability matrix. Where every capability is `Unsupported`, this is expected behavior, not an error |
| A capability recorded as Supported is not exposed live | ANC-08, ANC-22. Produces a discrepancy record; whether it is a defect depends on whether the Provided value was authoritative |
| A capability recorded as Unsupported **is** exposed live | ANC-08, ANC-22. Discrepancy record. Not a defect — the recorded value was incomplete |
| Selection rejected by a Supplier restriction (quantity, eligibility, passenger type, route, fare family) | ANC-41. Expected behavior where the restriction is confirmed. Restrictions are recorded from evidence, never invented, so an unconfirmed rejection is an observation first |
| Selected ancillary missing after booking | ANC-25, ANC-32. Classified as `Missing` at the failing checkpoint |
| Price or currency mismatch across checkpoints | ANC-33, ANC-36, ANC-42. Pricing contract is confirmed (ROE-based conversion, taxes/fees per offer, rule-engine adjustments) — a mismatch against that contract is now assessable as a defect candidate, not merely an observation |
| Supplier error or timeout during ancillary retrieval or booking | — | Flagged: no requirement defines an expected error contract for this Feature. Record the Supplier behavior as observed during Discovery. Do not assume a normalized error shape |

## D. Feature-Specific UI Notes

<!-- INJECTED INTO SupplierChecklist.md §12 context, alongside the Open Questions -->

| Note | Requirement ID |
|---|---|
| Execution spans two applications: Admin owns configuration, Portal owns the booking flow | ANC-26, ProjectContext §4 |
| Admin path: login, then Branch, then select the test Branch, then Supplier and Credential | ANC-14, ANC-15, ANC-16 |
| Portal path: Flight Search, flight selection, PAX Details, Ancillaries, booking, persisted booking | ANC-19 … ANC-25 |
| Admin and Portal URL, environment, role, and account are recorded as separate rows | ANC-26, OQ-ANC-08 |
| No Source/Target dual-environment preparation model applies to this Feature. `SupplierChecklist.md` §3c answers "Dual-environment execution required?" as **N/A** | ANC-26 |
| The exact Ancillaries screen field set is discovered live per Supplier, never assumed from another Supplier | ANC-22, ANC-37 |
| Ancillary availability timing (after flight selection / in PAX Details / after passenger data / fare- or cabin-dependent) is discovered, never assumed | ANC-39 |

---

## Open Questions carried from the shared context

<!-- Not new questions. These are the shared baseline context's own Open Questions (§8), carried here
     because they directly affect rows above. A Supplier Checklist's §12 references these rather than
     re-deriving them. Resolved items (OQ-ANC-01…08, OQ-ANC-11) are cited inline against the rows they
     resolved, in §A/§B/§C above, rather than repeated here — only genuinely open items remain below. -->

| Source | Question | Affects |
|---|---|---|
| ProjectContext §8, OQ-ANC-09 | Seat / Seatmap boundary — deferred by decision | §A and §B Seat rows |
| ProjectContext §8, OQ-ANC-10 | Bundle / Upselling boundary — deferred by decision | §A and §B Bundle rows |

**Resolved (2026-09-23/2026-09-25), cited inline above:** OQ-ANC-01 → ANC-42…ANC-45 · OQ-ANC-02 →
ANC-46 · OQ-ANC-03/03b → ANC-47, ANC-52 · OQ-ANC-04 → ANC-48, ANC-53 · OQ-ANC-05 → ANC-42 ·
OQ-ANC-06 → ANC-49 · OQ-ANC-07 → ANC-50 · OQ-ANC-08 → ANC-51 · OQ-ANC-11 → `integrationLayer` set to
`NDC-INT` (human decision, 2026-10-08; it was `ndc-core-service` on 2026-09-25). OQ-ANC-06 was
also answered independently on 2026-09-27 (Mohanad Dawood) — see the seat-eligibility row in §B.
