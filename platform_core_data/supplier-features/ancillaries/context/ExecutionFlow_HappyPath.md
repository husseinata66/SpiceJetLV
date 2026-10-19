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
**Revision:** 7 — adds §16, the run pre-flight and speed playbook that consolidates every speed-up in one
place, and the saved `SetupBooking_Script.md` (human decision, Mohanad Dawood, 2026-10-17). Rev 6 added
§15.5 portal interaction rules proven live (same date). Rev 5 added §15 execution efficiency, including batched setup (same date). Rev 4 saved failure screenshots in each run's `failures/` folder and rev 3
limited screenshots to results that did not pass (both 2026-10-17); rev 2 added §3.1 cabin × bundle
coverage (2026-09-27)
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

## 15. Execution efficiency

*(Human decision, Mohanad Dawood, 2026-10-17.)* Every browser action is one AI round trip, and every
page read costs tokens. These rules keep an Ancillaries run fast and cheap without changing what is
tested or what evidence is kept.

### 15.0 Use the `playwright-ancillaries` server

Ancillaries runs drive the browser through the **`playwright-ancillaries`** MCP server
(`mcp__playwright-ancillaries__browser_*`), never the default `playwright` server. It is registered
in the repo-root `.mcp.json` with three extra flags that apply to this Feature only:

| Flag | Effect |
|---|---|
| `--snapshot-mode none` | No page snapshot is taken after every action. Read the page only when needed (§15.1) |
| `--image-responses omit` | A screenshot is still **saved to its file** (§11), but the image is not sent back into the conversation |
| `--console-level error` | Only console errors are returned, not every info and warning line |

Every other Feature, module and stage keeps the default `playwright` server, unchanged. Headed or
Headless is still asked before every execution; neither server forces it.

### 15.1 Read the page as little as possible

- **Locate an element with `browser_find`** (text or regex). It returns only the matching lines and
  the element's ref, not the whole page.
- **Take a full `browser_snapshot` only on a screen not yet seen in this run**, and scope it with
  `target` or `depth` where possible. Never read a whole snapshot file after every action.
- **Click by a unique selector** when one is known; that needs no snapshot at all.
- **Confirm an outcome with `browser_wait_for`** on the expected text, or with `browser_find`, not
  with a fresh snapshot.

### 15.2 One call per form

Fill each passenger's details in **one `browser_fill_form` call**, not one call per field.

### 15.3 One booking per shared setup

- Before executing, **group the in-scope cases by the setup they need**: passenger mix, trip type
  (one-way, return, multi-city), cabin, bundle. Build one booking per group and run every case of
  that group on it before building the next.
- **Where the suite has a `Setup Group` column, use it** instead of regrouping at run time. The
  SeatMap sheet has one: groups are numbered in run order and explained on its 'Before every test'
  tab. Within a group, change the fare package on step 1 rather than building a new booking.
- **Start a fresh booking only when a case needs one:** it changes or cancels the booking, it needs a
  different setup, or an earlier case left the booking in a state its precondition rules out.
- Record in each case's Notes which booking it ran on.

### 15.4 Batched setup — the one exception to the no-scripts rule

Steps that only **reach** the screen under test may run as **one `browser_run_code_unsafe` call**
instead of one call per step. For this Feature only, this overrides `manual-execution-skill` §2.1
(no scripts) and `platform_core/tools/mcp/README.md` §1.4 (run-code is read-only), within these
limits:

| | |
|---|---|
| 1 | **Setup only.** Search, pick the flight, fill passenger details, open Ancillaries or the seat map. A step the test case checks always runs as its own call, so it can be watched and judged |
| 2 | **Stops before anything that books, pays, or changes a booking.** §9 and every other mutating action stay single steps under the run's safety authorizations |
| 3 | **Stops at any unexpected dialog** (for example Price Update) and reports it; never accepts it on its own |
| 4 | **No credential** ever appears in the code (`mcp/README.md` §1.3). Log in first, the normal way |
| 5 | **Passed inline, never saved as a file.** It is not an artifact |
| 6 | **Returns a short result:** the screen it reached, the selected flight and its Supplier attribution (§4), and any error. Never a page snapshot |
| 7 | **If it fails, continue in single steps** from the last screen it reached. The failure is a setup problem, not a test result, until the single steps show otherwise |

The proven script for the Portal booking is saved in `SetupBooking_Script.md` (same folder): copy it,
change only its parameter block, run it. It stops at step 2 and carries no credential.

Proven on 2026-10-17 (OmanAir, CAI→JED, 2 adults, Economy): one batched call took the run from the
empty Flight Search form to the open seat map in **37 seconds** (**23.8 seconds** once §15.5 rule 1's
airport retry was added); the same setup done one action at a time took about 9m20s–9m46s. Use that shape for every Setup Group's booking.

### 15.5 Portal interaction rules (proven live, Ancillaries Portal)

These are how this Portal's widgets actually behave. Following them avoids the retries that cost
the most time.

1. **Airport From/To: type as soon as the dropdown opens, and search again instead of waiting.**
   Click the field and fill the IATA code immediately. If the matching option is not visible after
   3 s (the list shows "No results found"), clear the box and type the code again; repeat until it
   appears (cap 120 s). Waiting on an empty list can hang forever, and a long single wait fails the
   whole batch. With this retry, each airport took about 4 s instead of 20–60 s.
2. **Dates must be committed through the calendar.** A value typed into Flight Search Date, Date of
   Birth or Document Expiry looks set, then resets as soon as focus leaves. Open the calendar and
   click through: next month for the search date; year → previous/next decade → year → month →
   day for Date of Birth and Document Expiry.
3. **Fill fields one after another, never in parallel.** Filling First Name, Last Name and Document
   Number together (`Promise.all`) left First Name empty with "Required", and Next refused to
   continue. Sequential fills worked every time.
   **`browser_fill_form` is for plain textboxes only** (First Name, Last Name, Document Number).
   Title, Nationality and the other dropdowns are not native `<select>` elements, so its
   `combobox` type fails on them; use click → option click.
4. **Fill passengers with *Select passenger*, not by typing.** Typing a passenger means about 14
   calendar clicks (Date of Birth and Document Expiry) and took 8–10 s each; the saved-profile route
   took 1.3–1.5 s each. Each section (Adult, Child, Infant) has its own *Select passenger* and lists
   only profiles of that type. In the dialog: search the saved mobile number → **Pick** a row →
   **Confirm passenger** (Pick alone only marks the row; Escape or closing discards it) → then
   change the **Document Number**, never keep the saved one. The system silently refuses a second
   booking for the same name, date of birth and document. **Choose each profile by its real date
   of birth with a margin, not by the dialog's Age column** (it rounds). The booking age rules for
   every Ancillaries booking, in the Portal and in the Admin alike (human-supplied, Mohanad Dawood,
   2026-10-17): **Adult at least 12 years; Child at least 2 years
   and less than 12; Infant at least 1 day and less than 2 years.** Keep a margin from each edge
   (e.g. Child Layla ExrTest born 2017, Infant Youssef Dawood born 2025). A child one day short of
   2 made `add-pax` return **400 "CHD must be 2 years or older"**, and Next then did nothing visible
   (no message, no step 2) — if Next seems dead, read the `add-pax` response. The Infant's *Assigned to* then lists only
   the adults (pick one). Open a collapsed section by clicking its own tab; **Expand All** toggles
   and can collapse sections you need.
5. **Do not wait for the whole result list.** Wait for the first `Book Flight` button of the
   wanted fare and click it.
6. **Login in an Ancillaries run:** the human may give the Portal credentials in the conversation
   for that run, and the `playwright-ancillaries` server submits the login form with them in one
   call (took 1.3 s). This is the scoped exception in `platform_core/tools/mcp/README.md` §1.3: the
   values are used once, never written anywhere, and the human changes the password afterwards.
7. **Headed or Headless is the human's choice for every run** (CLAUDE.md). The browser's own
   per-action time is the same either way; the saving in §15 comes from fewer round trips and
   smaller replies, not from Headless.

## 16. Run pre-flight and speed playbook — read this first on every Ancillaries run

*(Human decision, Mohanad Dawood, 2026-10-17. Ancillaries only. This section collects every speed-up
proven on 2026-10-17; the detail is in §11 and §15 and in `SetupBooking_Script.md`. Nothing here
changes what is tested or what evidence is kept. Measured on OmanAir Group 01: the booking took about
30 s instead of about 9m46s, and each case took 0–3 s.)*

### 16.0 Run an automated Setup Group with the runner, not case by case

*(Human decision, Mohanad Dawood, 2026-10-18: an agent driving 60 cases one call at a time spent
about 20% of a session's tokens in 30 minutes.)* When the group is automated, execute it with **one
command** — no agent in the loop:

```bash
node platform_core/tools/supplier_feature_runner/cli.js groups --run <run>          # what is automated
node platform_core/tools/supplier_feature_runner/cli.js run --run <run> --group 01 --headed
```

It reads the run's `CapabilityPlan.md`, so each Supplier gets only its own cases; it waits for the
human to log in (no credential is ever typed or stored by it); it never presses Book, Hold, Pay or
Save Quote; and it writes the working log and the failure screenshots of §16.4 into the run. Groups
**14–17 are manual** (they book, hold or pay — human decision, 2026-10-18) and the runner refuses
them. The checks live in `../runner/` (`group01.js` and the Portal adapter `portal.js`); Admin gets
its own adapter after its live verification pass. Use §16.1–§16.5 below only for a group that is not
automated yet, or to fix a check the runner reports as Blocked. Full reference:
`platform_core/tools/supplier_feature_runner/README.md`.

**In the runner today: Groups 01–16** (01–16 verified live on Flynas, 2026-10-18/19).
Groups 14–16 are **assisted** — run them `--headed`; the runner stops at Book with a red banner and **the human
presses Book**, then it does every read-only check below by itself. **Group 17** (hold, then pay) stays manual;
**18** (live connection) and **19** (two sessions) are not automated. Route, credential and date settings the
human supplies live in `../runner/settings.local.json` (`multiCity`, `multiCityAircraft`, `nonEgp`, `booking`,
`clash`). Lessons every group (and any hand-run) inherits, each found live:

- **A bundle dropdown re-picked on the option already chosen clears itself.** Stop at the first match
  and never re-click the selected option. Clicking a PrimeNG dropdown trigger twice closes it.
- **Step-1 passenger sections, step-2 passenger cards and journey bundle headers are collapsible
  accordions.** Read the ancestor's `aria-expanded` before clicking — clicking an open one closes it.
- **Passengers are picked by criteria (age, gender), never by a fixed name** — resolve them from the
  saved profiles (a slot's dialog only offers profiles already of that type; paginate only when page 1
  has no match). Search dates stay 2–3 days from today.
- **Round-trip / multi-city forms:** click the visible field wrapper (the inputs are zero-size and
  read-only), then type the code; the return/next leg pre-fills. Use `Search` with `{exact:true}`.
- **The Portal allows one tab per session** ("Multiple Tabs Detected"). Do every check in the one tab.
- **A sold-out class makes Next do nothing, with no message** (`ssr-quote` 400, "requested class of
  service is sold out") — read the response before assuming a selector problem.
- **Read the whole page before recording an absence.** (A confirmation page's "Extra Baggage" card sits
  below the passenger table; reporting it missing was wrong.)

- **Match report rows by this booking's own keys** — PNR on the Statement report, the invoice on the Sales report
  (read from the Booking report row, right AFTER the booking reference) — never by amount: two bookings on one day
  can cost exactly the same. The Statement report says "Latest updated Date & Time is: …" after a search; a
  booking made after that time cannot be listed yet.
- **The Itinerary (My Bookings → the order → Itinerary Details) lists ancillaries per JOURNEY**, with each leg of
  a connecting journey labelled by its route inside the section. Its side panel's "N Booked Seats" is a
  passenger count (a known bug), not a seat count.

**Groups 14–16 — what the assisted run does (and what to do by hand if the runner can't).** The agent builds the booking and stops before **Book**, takes a
pre-Book snapshot (route, passengers, package, extras, quoted total, wallet) into the run's
`manual_execution/GroupResults_Group<NN>_working.md`, and the **human presses Book** — `BOOK`, `PAYMENT` and
`WALLET_CHARGE` are absolutely Forbidden on Staging (`execution_safety_policy.json`). Everything after is
read-only: confirmation page, e-ticket, My Bookings, Dashboard, the wallet (re-read it — the first read can be
stale), Sales / Booking / Statement reports (the **Statement report updates hourly**, so recheck it before
calling RPT-002). The same passengers on the same flight twice is refused as a duplicate; shift the date.
Put every group of a Supplier in **one run**.

### 16.1 Before the first action

1. **Use the `playwright-ancillaries` server** (§15.0), maximized (`playwright-ancillaries.config.json`;
   never `browser_resize` — a forced size cuts the page off). The config alone did not maximize the
   window (1053×799 on a 1536×864 screen), so also run this once per browser session:
   `const c = await page.context().newCDPSession(page); const {windowId} = await c.send('Browser.getWindowForTarget'); await c.send('Browser.setWindowBounds', {windowId, bounds: {windowState: 'maximized'}});`
   If `page` in `browser_run_code_unsafe` is `about:blank` after a reconnect, `page.goto` first.
   **Ask Headed or Headless for the run.**
2. **Run the capability gate** (`capability_gate/cli.js plan --run <run>`) and treat its exclusions as
   final. Also mark a case **Not Applicable up front** when what it checks cannot exist for the Supplier
   even though the gate let it through (for example the bundle cases NAV-002 and NAV-002b on a Supplier
   with no fare packages: the sheet tags them `Requires: Seat` only; record the tag gap).
3. **Group the cases by `Setup Group`** and build one booking per group (§15.3). Extract the group's
   runnable cases and steps **once** into a working file; do not re-read the sheet per case.
4. **Log in once.** The human logs in, or gives the credentials for that run under the scoped
   exception (§15.5 rule 6, one call, about 1.3 s). Never type them into any other call.
5. **Check the screen before acting** and cap every wait at 5–10 s. A stuck script that waits 30 s per
   step cost minutes; a quick state read costs nothing.

### 16.2 Building the booking

6. **One call, from `SetupBooking_Script.md`** (about 30 s to step 2): airports retyped until found,
   dates through the calendar, first fare only, passengers from saved profiles (Pick → Confirm
   passenger → fresh Document Number), infant linked, ages checked, Next. **The saved script is the
   no-bundle (OmanAir) shape.** For a Supplier with fare bundles (Flynas) it needs three changes: pick
   the card by the Supplier's connection name from its `SupplierChecklist.md` (never the other
   connection, e.g. never "Fly Nas KSA …"), press **Accept** on the "Price Update" pop-up that appears
   after Book Flight with an infant, and choose a bundle in "Select Bundle" on step 1 before Next.
   **The Portal may move the searched date** to the nearest one with flights (30 Nov became 23 Oct);
   record the date actually used.
7. **Passenger ages** (Portal and Admin): Adult at least 12 years; Child at least 2 and less than 12;
   Infant at least 1 day and less than 2 years — profiles chosen with a margin (§15.5 rule 4).

### 16.3 Running the cases

8. **Batch several cases per call.** Read only the values each case expects and return one compact
   result per case with its time. Never take a full-page snapshot to read one value (`browser_find`
   or a scoped read).
9. **Do not repeat a combination already executed in the run** (§3.1 step 5).
10. **Only press what the case itself says.** Next, Select Seat and Confirm are part of cases; **Book,
    Hold and Pay never are** without a recorded authorization. Tell the human before any step that
    changes what is on screen, if they are watching or timing.
11. **After a mistake, recover the state; do not rebuild.** Close a stuck dialog with Escape, open a
    collapsed section by its own tab, never use *Expand All*. Check each result with a read that can
    actually fail (a pattern that never matches reports a false failure).

### 16.4 Evidence and results

12. **Screenshots only for Failed, Blocked and Inconclusive** (§11), full path
    `runs/<run>/manual_execution/artifacts/failures/<Test Case ID>.png`. **Open each one and check it
    shows the proof** (the first PAX-006 shot had the panel collapsed and proved nothing).
13. **Record as you go** in the run folder's working log (case, result, time, evidence). The final
    report is built with `report_builder` from a model, never hand-written HTML (CLAUDE.md, Reports).

### 16.5 What cost the most time on 2026-10-17 (avoid)

| Cost | Instead |
|---|---|
| One action per round trip with a full snapshot each time | One batched call, §16.2 |
| Typing each passenger, about 14 calendar clicks each | Saved profiles, about 1.5 s each |
| Waiting for an empty airport list | Retype every 3 s |
| Typed dates, which reset silently | Calendar clicks |
| Parallel field fills (left First Name empty) | One field after another |
| 30 s default waits stacked on a missing section | Check the state, cap at 5–10 s |
| Out-of-range passenger age, which makes Next do nothing visible | Check ages before Next |
| `browser_resize`, which cut the page off | The maximized config |
| Rebuilding the booking after a small mistake | Recover the state |
