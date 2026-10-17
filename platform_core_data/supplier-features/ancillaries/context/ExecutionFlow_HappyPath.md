# Execution Flow — Ancillaries — Happy Path

<!-- FEATURE-LEVEL operational knowledge. This is HOW to execute the shared Ancillaries flow across
     the Admin and Portal applications. It is referenced, never duplicated, by every Ancillaries
     Supplier run: a Supplier records only its own execution values in SupplierChecklist.md §3a/§3b/
     §3c plus its own evidence, and does not copy this procedure into its own context
     (ndc_execution_rules.md §A1).

     This flow is capability-gated throughout. It never states which ancillary types exist for a
     Supplier — that comes from that Supplier's own §5c capability matrix, governed by
     CapabilityModel.md. A step that touches a capability is skipped when the capability is not
     Supported for the Supplier under test.

     Import Booked PNR's Source/Target dual-ENVIRONMENT preparation model is NOT inherited. It is
     also NOT assumed that Admin and Portal share one environment — see §1. -->

**Feature:** Ancillaries (`ancillaries`)
**Canonical location:** `platform_core_data/supplier-features/ancillaries/context/ExecutionFlow_HappyPath.md`
**Status:** Draft — pending approval
**Revision:** 4 — §11 failure screenshots saved in each run's own `failures/` folder (human
decision, Mohanad Dawood, 2026-10-17). Rev 3 limited screenshots to results that did not pass
(2026-10-17); rev 2 added §3.1 cabin × bundle coverage (2026-09-27)
**Last Updated:** 2026-10-17
**Related:** `CapabilityModel.md` (same folder) — governs every capability gate below.
`FeatureChecklistProfile.md` (same folder) — the rows injected into a Supplier's Checklist.
Requirement IDs trace to `shared/ancillaries-baseline/context/ProjectContext.md` rev 1 §6.
**Source:** Business-supplied Ancillaries flow and its Admin/Portal responsibility split, recorded
2026-09-04.

## 0. Why this exists

The shared Ancillaries flow spans two applications and depends on configuration work that must happen
before the booking flow can be exercised at all. Without that configuration the Supplier under test
returns nothing, and the execution fails for a reason that has nothing to do with ancillaries. This
document records the order, the preconditions, and what must be captured, so a Supplier run executes
correctly on the first attempt.

It does **not** state what any Supplier supports. Every capability step is gated on that Supplier's
own verified capability matrix.

## 1. Application and environment model

Two applications, with a confirmed responsibility split (ANC-26, ProjectContext §4):

| Application | Owns |
|---|---|
| **Admin** | Configure/select the Branch · ensure the Supplier is assigned · ensure the correct Supplier Credential / PCC / Market is available |
| **Portal** | Search flights · select a flight from the Supplier under test · PAX Details · Ancillaries · booking · persistence and pricing validation |

```
ADMIN                                    PORTAL
Branch configuration                     Flight Search
Supplier assignment          ------>     Supplier flight selection
Credential / PCC / Market                PAX Details
                                         Ancillaries  (capability-gated)
                                         Booking
                                         Persisted booking / itinerary / fare breakdown
```

**Two rules about environments, both deliberate:**

1. **No dual-environment preparation model.** Import Booked PNR needs a separate Source environment
   because its input must be an already-ticketed offline booking. Ancillaries creates its booking
   inside its own flow, so `ndc_execution_rules.md` §C1 does not apply and no Supplier invents a
   Source environment. `SupplierChecklist.md` §3c's "Dual-environment execution required?" is
   answered **N/A** for this Feature.
2. **Admin and Portal are not assumed to share one environment.** Until OQ-ANC-08 is verified, record
   each application's environment, URL, access route, required role, and account **independently** —
   Admin details in `SupplierChecklist.md` §3a's Admin rows, Portal details in its Portal rows. Do
   not write one shared environment value across both, and do not assume one login works for both.
   If verification later shows they are the same, that is recorded as a finding with evidence, not
   assumed now.

Environment values are never hardcoded into a script, fixture, or reusable helper. They are resolved
from the Supplier's Checklist at execution time.

## 2. Step 1 — Admin: prepare the Supplier configuration

**Precondition for every Ancillaries execution.** Do not start the Portal flow until this passes.

1. Log in to the **Admin** application with a user able to configure a Branch. (ANC-14)
2. Navigate to **Branch**.
3. Select the Branch that will be used for testing. (ANC-14)
4. Select/configure the Supplier that this Supplier scope is testing — for example Travelport NDC,
   Sabre NDC, NDCGal, or another Supplier. Never a different Supplier than the scope under test.
   (ANC-15)
5. Verify the Supplier is **active/available** for the selected Branch. (ANC-15)
6. Verify the required Supplier Credential / PCC / configuration is **assigned to that Branch**.
   (ANC-16)
7. Where several credentials exist, choose deliberately and record exactly which one is used —
   for example Egypt, UAE, Saudi Arabia, or another configured market. **Never chosen arbitrarily.**
   (ANC-17)

If any of steps 4-7 cannot be satisfied, the execution is **Blocked**, not Failed. Record the blocker
and stop. A missing Supplier assignment is a configuration gap, not an Ancillaries defect.

### 2.1 Execution context record — mandatory (ANC-18)

The Supplier + Credential configuration used here **becomes part of the execution context**. Record,
as one linked record rather than scattered notes:

| Field | Note |
|---|---|
| Supplier | The Supplier under test |
| Supplier Credential | Exactly which one |
| PCC | Where applicable |
| Market / Country | e.g. Egypt, UAE, Saudi Arabia |
| Branch | The Branch configured above |
| Agency | If applicable |
| Admin environment | Recorded independently — §1 rule 2 |
| Portal environment | Recorded independently — §1 rule 2 |
| Executing user(s) | Admin user, and Portal user if different |

## 3. Step 2 — Portal: flight search

1. Open the **Portal** application, using the Portal access details recorded independently in §2.1.
2. Perform a valid flight search. (ANC-19)
3. Use a route and date consistent with the Supplier's own recorded test data. Availability may
   depend on route, cabin, or fare family — that dependency is a per-Supplier Discovery obligation
   (ANC-39), never assumed here.

### 3.1 Cabin × bundle coverage — every cabin, every bundle `[gated: Bundle]`

*(Added 2026-09-27, human decision — Mohanad Dawood. Applies to every Ancillaries Supplier.)*

Seat maps, seat prices and included services change completely with the cabin and the bundle. A result
on one bundle proves nothing for another. So the unit of coverage is **one cabin × one bundle**, and a
Supplier run is not complete until every combination the Supplier returns has been exercised.

1. **List the cabins.** From the search results, record every cabin class the Supplier returns for the
   route and date (e.g. Economy, Business). Pick at least one flight per cabin. Prefer one flight that
   sells several cabins on the same aircraft, so the cabins compare directly.
2. **List the bundles per cabin, live.** Open a fresh offer in each cabin and read the bundle list in
   PAX Details. Never assume one cabin's bundles from another, or one Supplier's from another. A cabin
   that offers a single bundle has a single combination.
3. **One fresh offer per combination.** Start each cabin × bundle from a new search result / new offer.
   Do not reuse one offer by going Prev and switching the bundle: that path has its own known defects
   (extras wiped, stuck wizard) and would contaminate every other result. Switching bundles on one offer
   is tested separately, as its own case.
4. **Run the same check set on every combination**, for the capabilities this Supplier supports
   (§5c):
   - the bundle's included services (baggage, meal, seat entitlement), as shown;
   - the seat map `[gated: Seat]`: seat count, free / paid / blocked counts, price tiers, cabin and
     section labels, and any seat attribute that implies a price (e.g. "Chargeable seat") versus the
     price shown;
   - assign one paid and one free seat where both exist, confirm, and check the seat line in the fare
     breakdown;
   - meal and extra-baggage options with prices `[gated: Meal]` `[gated: Baggage]`, including whether an
     option clashes with baggage the bundle already includes;
   - one booking per combination, **only** where booking is authorized for the environment
     (`execution_safety_policy.json`, or a recorded human decision), with the `Book` step approved
     each time.
5. **Do not repeat a combination already executed in the same run.** Its recorded result stands and is
   cited. A combination executed in an earlier run is evidence only, never a result for this run
   (`ndc_execution_rules.md` §A11).
6. **Record the cabin and bundle on every result**, and report coverage as a cabin × bundle table,
   marking each combination Executed, Not Executed (with reason) or Not Offered.

If the Supplier's §5c records Bundle as anything other than `Supported`, the matrix collapses to one
row per cabin; the cabin rule (step 1) still applies.

## 4. Step 3 — Portal: select a flight from the Supplier under test

1. Identify which results were returned by the Supplier under test.
2. Select one of those. (ANC-20)
3. **Capture evidence proving which Supplier returned the selected flight** — the result attribution
   in the UI, the network/API response, or whatever the application exposes. (ANC-20)

**Selecting a flight from another Supplier invalidates the execution.** It is not a defect and not a
partial pass: the run did not test the Supplier in scope. Discard and repeat with correct
attribution. This is the most common way an Ancillaries execution silently tests the wrong thing.

## 5. Step 4 — Portal: PAX Details

Continue to PAX Details and enter valid passenger information as required. (ANC-21)

Ancillary availability may depend on passenger data being entered, or may only appear at this step.
That timing is a per-Supplier Discovery obligation (ANC-39). Where the Supplier's matrix already
records an availability timing value as `Provided`, verify it here rather than re-determining it
(ANC-22).

## 6. Step 5 — Portal: open Ancillaries and verify capabilities

1. Navigate to / open the Ancillaries section. (ANC-22)
2. Read the Supplier's **own** capability matrix — `SupplierChecklist.md` §5c — before interacting
   with anything.
3. **Verify what is already recorded**, rather than determining the capability set from scratch:

| Row state in §5c | What to do here |
|---|---|
| `Supported` + `Provided` | Verify the capability is actually exposed. On success, Source Status becomes `Verified` |
| `Unsupported` + `Provided` | Verify the absence. Do not treat the absence as a defect (ANC-05) |
| `To Be Discovered` | Determine it now, and record evidence |
| Live behavior differs from a Provided value | Apply the `CapabilityModel.md` §6 discrepancy record — Provided Value, Discovery Finding, Final Verified Value, Evidence, Change Reason. **Never a silent overwrite** (ANC-08) |
| An ancillary type not in the register at all | Record it as an observed Supplier-specific capability with evidence, and raise it through `CapabilityModel.md` §9. Do not add it to the Feature register unilaterally |

4. Record the **available** options before selecting anything (ANC-27) — what was offered, at what
   price, for which passenger, for which segment or journey.

## 7. Step 6 — Portal: select applicable ancillaries

**Interact only with capabilities that are Supported for this Supplier** (ANC-23). A capability that
is `Unsupported`, `To Be Discovered`, `Blocked`, or `N/A` is not exercised here.

Select according to the Supplier's **actual** application level, per capability (ANC-10, ANC-24) —
never a level borrowed from another Supplier (ANC-06):

```
Journey:  CAI -> DXB -> BKK
Segment 1: CAI -> DXB          Segment 2: DXB -> BKK

If Baggage is Per Journey  -> the selection applies to the whole journey
If Meal    is Per Segment  -> select independently per segment
If Seat    is Per Segment  -> select independently per segment
If Bundle  is Per Journey  -> the selection applies to the whole journey
```

Different capabilities inside one Supplier may use different levels, and that is legal (ANC-12). Do
not force one level across all capabilities for consistency.

### 7.1 Capture per selected ancillary (ANC-28, ANC-29, ANC-30)

Capture only what the Supplier actually exposes. A field not exposed is recorded as not exposed —
never fabricated, never treated as a missing requirement.

| Group | Fields |
|---|---|
| General | Ancillary type, code, description, Supplier, currency, price |
| Passenger | Passenger name/reference, passenger type |
| Flight association | Journey, segment, origin, destination, flight number |
| Baggage | Pieces, weight, unit, price |
| Meal | Meal code, meal description, price if applicable |
| Seat | Seat number, seat characteristics if available, price |
| Bundle | Bundle name, included services, price, restrictions |

## 8. Step 7 — Pricing capture (ANC-34, ANC-35)

Capture at three points, in order. Ancillary pricing is captured **separately** from the base flight
price.

| Point | Capture |
|---|---|
| Before ancillary selection | Flight / base total, currency |
| At selection | Each individual ancillary price, currency, and what it is priced per (passenger / segment / journey / quantity) |
| After ancillary selection | Updated booking total, currency |

```
base booking price  +  selected ancillary amounts  =  expected final booking amount
```

**Do not assume this arithmetic** (ANC-36). The confirmed pricing contract may include taxes, fees,
markup, commission, discounts, or bundle pricing — and that contract is currently **undefined**
(OQ-ANC-01). Until it is confirmed:

- Capture all three points fully.
- Report the difference as an observation.
- Do **not** raise a defect for an arithmetic mismatch on the strength of the simple formula alone.

## 9. Step 8 — Complete the booking

Continue through the remaining booking flow to completion (ANC-24). Capture the confirmation, the
resulting booking reference, and the relevant network/API evidence where available.

Whether ancillary selection triggers wallet or payment validation is **unknown** (OQ-ANC-02). Do not
assume a wallet check exists, and do not report its absence as a defect.

## 10. Step 9 — Post-selection and post-booking validation

Verify each selected ancillary along the chain, at every checkpoint the application exposes
(ANC-31):

```
Ancillary Selection UI
        |
        v
Fare Breakdown / Price Summary
        |
        v
Booking Request
        |
        v
Supplier Confirmation
        |
        v
Persisted Booking
        |
        v
Itinerary / Booking Details
```

Classify each selected ancillary at each checkpoint as exactly one of (ANC-32):

- **Exact Match**
- **Expected Normalization**
- **Missing**
- **Unexpected Difference**
- **Not Exposed / Not Verifiable**

Check, per checkpoint (ANC-33): correct passenger · correct segment/journey · correct ancillary type ·
quantity · price · currency · total booking price · persisted ancillary status.

A difference is a **defect only when it violates a confirmed contract or business requirement**. An
intentional normalization is not a defect. Where the governing rule is an Open Question, the
difference is recorded as an observation against that OQ — not as a defect and not as a pass.

Which downstream representations must reflect ancillaries is **undefined** (OQ-ANC-04). Verify what
is observable, record what is not, and do not treat an unlisted screen as a required one.

## 11. Evidence

Preserve, per execution: the Admin configuration used (§2.1) · Supplier attribution proof for the
selected flight (§4) · available ancillary options before selection (§6.4) · each selection with its
captured fields (§7.1) · all three pricing capture points (§8) · booking confirmation (§9) · the
checkpoint classifications (§10) · any capability discrepancy record (§6).

Admin evidence and Portal evidence are recorded as **one linked execution record**, not two
unconnected sets — the configuration in Admin is what makes the Portal result meaningful.

**Screenshots only for a result that did not pass** (human decision, Mohanad Dawood, 2026-10-17):

- **`Failed`, `Blocked`, `Inconclusive`** — one screenshot showing the state that proves the result.
- **Saved in the run's own failures folder:**
  `platform_core_data/runs/<run folder>/manual_execution/artifacts/failures/<Test Case ID>.png`.
  Always pass this full path as the screenshot `filename` — a bare name is saved in the repo root.
  The folder is created by the run's first failure screenshot, so a run with no failures has none.
- **`Passed`** — no screenshot. The items above are recorded as text, values, and network data in
  the result's Notes. A `Passed` case with no screenshot is not an evidence gap and needs no reason.
- **No working screenshots.** To check where the browser is, read the page with `browser_snapshot`;
  never save a screenshot just to look.

This applies to every Ancillaries Supplier run. It overrides, for this Feature only, the
`manual-execution-skill` §7 default of also capturing key steps.

## 12. What every execution must record

| | Fields |
|---|---|
| **Admin** | Environment, URL, user/role, Branch, Supplier, Credential, PCC, Market/Country, Agency |
| **Portal** | Environment, URL, user/role, search route and date, selected flight, **cabin and bundle** (§3.1), Supplier attribution evidence |
| **Coverage** | The cabin × bundle table (§3.1 step 6): every combination the Supplier returned, and its status |
| **Capabilities** | Per capability: Capability Result, Source Status, Application Level, evidence, any discrepancy record |
| **Selections** | Per selected ancillary: the §7.1 field set |
| **Pricing** | Base total before, each ancillary amount, updated total after, currency |
| **Result** | Booking result, checkpoint classifications (§10), blockers, observations against Open Questions |

Admin and Portal environment fields stay **separate rows** while OQ-ANC-08 is open (§1 rule 2).

## 13. Supplier independence

This execution model is shared across Ancillaries Suppliers. The configuration, capability set,
application levels, and test data are Supplier-specific.

```
Supplier A run -> configure Supplier A on the Branch -> search -> select a Supplier A flight
               -> exercise only Supplier A's supported capabilities, at Supplier A's levels

Supplier B run -> configure Supplier B on the Branch -> search -> select a Supplier B flight
               -> exercise only Supplier B's supported capabilities, at Supplier B's levels
```

Never use one Supplier's configuration, capability answers, or booking to validate another, unless a
test explicitly covers cross-Supplier behavior.

## 14. How this is inherited

This document is Feature-level. It is **referenced, never duplicated** (`ndc_execution_rules.md`
§A1):

- A Supplier's `SupplierChecklist.md` §3c records a pointer to this file's path, and answers
  "Dual-environment execution required?" as **N/A** for this Feature. §3a/§3b hold that Supplier's
  own Admin and Portal access details, recorded independently.
- Discovery, Manual Execution, and Automation read this file for **how** to execute, and record only
  their own execution evidence (§12) and their own capability findings.
- A Supplier-specific deviation — a different navigation path, an extra required field, a different
  availability timing — belongs in that Supplier's own Checklist or Discovery output, **not** as an
  edit to this file.
- The exception: if a deviation shows this procedure was wrong for **every** Supplier, this file is
  corrected in place, as a recorded revision. Never silently overwritten.
