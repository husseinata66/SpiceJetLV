# Capability Model — Ancillaries

<!-- FEATURE-LEVEL. This file defines the MODEL: capability register, dimensions, allowed values,
     interpretation rules, evidence rules, the Provided-to-Verified lifecycle, and the Test Design
     gate. It contains NO Supplier answers, and it must never be edited to record one.

     A Supplier's answers live in that Supplier's own rendered SupplierChecklist.md §5c. Answers flow
     DOWN only — from this model into a Supplier instance. A Supplier answer is never written back up
     into this file. The single exception is a new capability TYPE found in the field, which is added
     to the register in §1 by the propose/approve procedure in §9 — never silently.

     Its presence at the Feature root is what activates the generic Supplier Checklist's conditional
     §5c injection point (new_us_intake.md §12.2a). A Feature with no capability-driven Supplier
     variation has no such file, and its rendered Checklists omit §5c entirely. -->

**Feature:** Ancillaries (`ancillaries`)
**Canonical location:** `platform_core_data/supplier-features/ancillaries/context/CapabilityModel.md`
**Status:** Approved
**Revision:** 1
**Last Updated:** 2026-09-23
**Source:** `shared/ancillaries-baseline/context/ProjectContext.md` rev 2 (Approved 2026-09-23) —
ANC-01 … ANC-13, ANC-37 … ANC-41, plus ANC-48/ANC-49 (platform-wide application-level and
eligibility defaults, subject to per-Supplier verification per ANC-13). Every rule below traces to
one of those requirement IDs.

## 0. What this file is, and is not

| | |
|---|---|
| **Is** | The capability model — dimensions, allowed values, status vocabulary, rules, and the gate Test Design reads |
| **Is not** | A record of what any Supplier supports. It holds no answers, no credentials, no routes, no evidence |
| **Read by** | The Supplier Checklist renderer (§7), Discovery (§5, §6), Test Design (§8) |
| **Edited when** | The model itself changes, or a new capability type is registered (§9). Never to record a Supplier fact |

## 1. Capability register

Four capability types are known today (ANC-02):

| Capability | Registered | Note |
|---|---|---|
| Baggage | Yes | |
| Meal | Yes | |
| Seat | Yes | Exposing Seat here claims no ownership of the Seatmap business scope — OQ-ANC-09, open by decision |
| Bundle | Yes | Exposing Bundle here claims no ownership of the Upselling business scope — OQ-ANC-10, open by decision |

The register is **extensible**. A type found in the field is added through §9 — never invented here,
and never added by editing a single Supplier's Checklist alone.

**No Supplier is assumed to support any registered capability.** The register says what the Feature
can describe, not what any Supplier does (ANC-01, ANC-06).

## 2. Dimensions and allowed values

One row per capability, per Supplier, in that Supplier's own §5c instance.

| Dimension | Allowed values | Who may fill it |
|---|---|---|
| **Capability Result** | Supported · Unsupported · To Be Discovered · Blocked · N/A | Intake (as Provided) or Discovery |
| **Source Status** | Provided · Discovered · Verified · Pending Verification · Conflicting Evidence | Whoever last wrote the value |
| UI visible | Yes · No · To Be Discovered · N/A | Intake or Discovery |
| API data available | Yes · No · To Be Discovered · N/A | Intake or Discovery |
| Price available | Yes · No · To Be Discovered · N/A | Intake or Discovery |
| Currency returned | Yes · No · To Be Discovered · N/A | Intake or Discovery |
| Passenger association | Yes · No · To Be Discovered · N/A | Intake or Discovery |
| Flight association | Segment · Journey · Both · None · To Be Discovered | Intake or Discovery |
| **Application level** | Per Passenger · Per Segment · Per Journey · Booking-wide · Mixed · To Be Discovered | Intake or Discovery |
| Pricing basis | Per passenger · Per segment · Per journey · Per quantity · Mixed · To Be Discovered | Intake or Discovery |
| Availability timing | Free text, plus one Source Status value | Discovery (ANC-39) |
| Restrictions | Free text, evidence required | Discovery (ANC-41) |
| Evidence ref | Path or artifact reference | Whoever wrote the value |

Every dimension carries its **own** Source Status. Capability Result may be `Verified` while
Application Level is still `Provided` — that is a normal mid-Discovery state, not an inconsistency.

**Render default, before any input:** `Capability Result = To Be Discovered`, `Source Status = —`.
`To Be Discovered` is the *absence* default only. It is never written over a value that intake
supplied (ANC-07).

## 3. The two-axis status model

Source Status and Capability Result answer different questions and are **never merged** (ANC-04):

- **Capability Result** — what is true about the capability.
- **Source Status** — how well we know it, and where it came from.

| Combination | Legal? | Meaning |
|---|---|---|
| Supported + Provided | Yes | Stated at intake, not yet verified against live behavior |
| Supported + Discovered | Yes | Found during Discovery, not supplied at intake |
| Supported + Verified | Yes | Confirmed against evidence |
| Supported + Pending Verification | Yes | Verification attempted or scheduled, not yet conclusive |
| Unsupported + Provided | Yes | Stated at intake; verifying the absence is still worthwhile |
| Unsupported + Verified | Yes | Confirmed absent |
| Blocked + any Source Status | Yes | Blocker reason mandatory |
| N/A + any Source Status | Yes | Reason mandatory |
| Any Result + Conflicting Evidence | Yes | **Requires** both a Provided Value and a Discovery Finding on the record (§6) |
| To Be Discovered + Verified | **No** | Contradiction — nothing was verified |
| To Be Discovered + Provided | **No** | If a human provided something, it is not To Be Discovered (ANC-07) |
| To Be Discovered + Discovered | **No** | Same contradiction |
| Any non-default value with `Source Status = —` | **No** | Every value states where it came from |

Worked example (ANC-04):

```
At Supplier intake:      Capability: Seat   Result: Supported   Source Status: Provided
After Discovery:         Capability: Seat   Result: Supported   Source Status: Verified
```

The Capability Result did not change. Only how well it is known changed.

## 4. Interpretation rules

1. **Per-capability independence.** Every capability is assessed and recorded on its own. Supporting
   Baggage says nothing about Meal, Seat, or Bundle (ANC-03).
2. **No cross-Supplier inference.** One Supplier's answers never populate, suggest, or default
   another Supplier's (ANC-06). Suppliers with the same name under different Features are unrelated
   entities (`module_architecture.md` §11.1).
3. **Application level is per capability.** A single global value per Supplier is not acceptable when
   capabilities differ. `Baggage = Journey, Meal = Segment, Seat = Segment, Bundle = Journey` is a
   normal recorded state (ANC-10, ANC-12).
4. **Unsupported is not a defect.** A capability confirmed Unsupported is a recorded capability fact.
   It is never raised as a product defect and never counted as a failure (ANC-05).
5. **Mixed requires detail.** `Mixed` is only acceptable with a note saying what varies and under
   which condition. `Mixed` alone is not an answer.
6. **Not exposed is an answer.** A dimension the Supplier does not expose is recorded as not exposed
   or `N/A` with a reason. It is never fabricated and never left blank (ANC-30).

## 5. The capability information flow

```
CapabilityModel.md (this file)      dimensions, allowed values, rules — NO answers
        |
        v  rendered into SupplierChecklist.md §5c
Supplier Checklist instance          one row per capability, unanswered
        |
        v  Supplier intake
Supplier-provided capability info    Source Status = Provided     <-- FIRST source of answers
        |
        v  Discovery
verify Provided values  |  resolve To Be Discovered  |  record evidence  |  record discrepancies
        |
        v
Verified Supplier Capability Matrix  (lives in the Supplier Checklist — not a separate file)
        |
        v
Test Design                          reads the final state, applies the §8 gate
```

**Discovery is not the first source of capability answers.** Intake is, whenever the human supplies
information (ANC-07). Discovery's job against an already-populated row is to **verify**, not to
re-determine from scratch (ANC-22).

Discovery's four obligations per row:

1. Verify Provided information where it can be verified.
2. Resolve `Unknown` / `To Be Discovered` values.
3. Record evidence for every value it writes or confirms.
4. Record discrepancies using §6 — never a silent overwrite.

## 6. Provided to Verified — the discrepancy record

When live behavior differs from a Provided value, the Provided value is **kept**. The record appends
(ANC-08):

| Field | Rule |
|---|---|
| **Provided Value** | What intake recorded. Never altered, never deleted |
| **Discovery Finding** | What live behavior showed |
| **Final Verified Value** | The value Test Design consumes |
| **Evidence** | Path or reference to what proves the finding. Mandatory |
| **Change Reason** | Why the finding supersedes the Provided value. Mandatory |

Worked example:

```
Capability:            Baggage
Dimension:             Application Level
Provided Value:        Per Journey
Discovery Finding:     Per Segment
Final Verified Value:  Per Segment
Evidence:              discovery/evidence/<ref>
Change Reason:         Discovery observed independent per-segment baggage selection;
                       the provided value did not match live behavior
Source Status:         Verified
```

Baggage's Capability Result stays `Supported` throughout. Only the Application Level changed, and the
Provided value remains readable forever.

**When the finding is not conclusive**, set `Source Status = Conflicting Evidence`, keep both values
on the record, and leave `Final Verified Value` empty. An inconclusive conflict is never resolved by
picking the more convenient value.

## 7. Inheritance behavior

| Direction | Allowed? |
|---|---|
| This model into a Supplier Checklist §5c | Yes — the render step (`new_us_intake.md` §12.2a) |
| A Supplier answer back into this file | **No** — except a new capability type via §9 |
| One Supplier's answers into another Supplier | **No** (ANC-06) |
| A copy of this file into a Supplier folder | **No** — inheritance is by reference (`ndc_execution_rules.md` §A1) |

Rendering carries `Source Status` through **unchanged**. A `Provided` row never renders as `Verified`,
and a `To Be Discovered` row never renders as an answer — the same rule that already stops rendering
from promoting `Open` to `Confirmed` in the Feature Checklist Profile.

## 8. Test Design gate

Test Design reads the **final** state of each capability row (ANC-05, ANC-23):

| Final state | Test Design action |
|---|---|
| **Supported + Verified** | Generate applicable positive, negative, and boundary coverage |
| **Supported + Provided** (not yet verified) | May be designed. Each affected case carries a marked **verification dependency**, so an unverified assumption is visible in the suite |
| **Unsupported + Verified** | No normal positive coverage. Optionally one unsupported-capability confirmation case |
| **Unsupported + Provided** | Treat as Unsupported for coverage, and note that the absence is unverified |
| **To Be Discovered** | Invent no behavior. That capability's coverage stays blocked/pending |
| **Blocked** | Record the blocker. No executable case that requires the capability |
| **N/A** | No coverage required |
| **Conflicting Evidence** | No coverage for the conflicting dimension until it is resolved. Record it as blocked, not as a guess |

There is deliberately **no universal Ancillaries happy-path test case**. A Supplier supporting
Baggage + Meal + Seat + Bundle and one supporting Baggage + Meal produce different suites from the
same shared flow, with no edit to any Feature-level file (ANC-01).

## 9. Registering a new capability type

When a Supplier reveals an ancillary type not in §1:

1. The Supplier's own Checklist and Discovery output record it immediately, as an observed
   Supplier-specific capability with evidence. Work is not blocked.
2. Adding it to the §1 register is a **separate propose and approve step** against this file, with
   the evidence attached (ANC-02).
3. Only after approval does it render into other Suppliers' Checklists — as an unanswered row with
   `Capability Result = To Be Discovered`, never as Supported anywhere else (ANC-06).

A capability type is never added to the register by editing one Supplier's Checklist, and never
inferred from a Supplier's name or documentation alone.

## 10. Open boundary questions

| ID | Question | Status |
|---|---|---|
| OQ-ANC-09 | Ancillaries may expose Seat. This does not mean Ancillaries owns the Seatmap business scope | Open, deferred by decision until Seatmap is introduced |
| OQ-ANC-10 | Ancillaries may expose Bundle. This does not mean Ancillaries owns the Upselling business scope | Open, deferred by decision until Upselling is introduced |

Both are recorded here, not only in the Project Context, because the register in §1 is where the
overlap would otherwise be silently resolved by inclusion.
