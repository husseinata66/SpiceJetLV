# Manual Test Suite — Reissue Flow (business feature)

| Field | Value |
|---|---|
| Scope | Supplier Features → `reissue` → shared scope `reissue-flow` |
| Scope family | `supplier-feature` · feature `reissue` · `sharedScope: reissue-flow` |
| Produced by run | `run-009__2026-09-30_17-25-03__UserStory__ReissueFlowBusinessFeature` |
| Revision | 2 (2026-10-01 — **D-14**, the Reissue button's six-condition display rule: §0.8 added; TC-RFLOW-001, 002, 003, 010, 011, 012, 013, 014, 015 revised. TC-RFLOW-012 leaves `Pending Confirmation` — DS-2 settled) |
| Run Scope Type / Run Type | Feature (shared scope) / User Story |
| Source User Story | `knowledge_base/requirements/user_stories/Reissue_Flow_From_Itinerary.md` |
| Project Context | `supplier-features/reissue/shared/reissue-flow/context/ProjectContext.md` (Revision 8, **Pending Review**) |
| Discovery | `.../discovery/QA_Assessment_Report.md` (**Pending Review**) |
| Total Test Cases | 127 |
| Generated | 2026-09-30 |
| Status | **Pending Review** — Stage 3 Human Review gate not yet held |

## 0. What this suite covers, and what it deliberately does not

The unit of coverage is a **business behaviour** — an Acceptance Criterion or a named edge case from
the story. Every case names what it covers in its **Notes**.

### 0.1 Regression cases for known defects are excluded — by instruction

**The user directed on 2026-09-30 that defect-regression cases be left out of this suite.** Seventeen
findings are open against this feature — fourteen in `reissue-mapping`, three in this scope's
Discovery — and each would otherwise carry a regression case here.

**They are excluded, not forgotten.** They live in their findings folders and belong in a regression
suite assembled when fixes land. What this suite contains is the **forward** specification: what the
feature must do, written from the story, not from what is currently broken.

**One consequence to be explicit about.** Several cases below will fail on today's build, because the
behaviour the story requires is the behaviour a finding says is missing. That is correct and
intended: a case fails because the product is wrong, not because the case is a regression test. Where
a case is known to fail today, its Notes say so and name the finding — **as context for the executor,
never as the case's purpose.**

### 0.2 Acceptance Criteria are the story's, not the mapping's

This scope asks whether the **behaviour** is right and the **label** says what the AC requires. It
does **not** re-verify that a displayed value traces to its core field — `reissue-mapping` owns that
and has delivered its result (ProjectContext §1.3). Where a case asserts an amount, it asserts the
**business** rule; the provenance behind it is already established.

### 0.3 How to read the Discovery column

| Value | Meaning | Count |
|---|---|---|
| `EXECUTED` | Observed in Stage 2 and behaving as the case expects | 28 |
| `OBSERVED-DEFECT` | Observed and **not** behaving as the story requires — a finding is open. Expected to fail today | 13 |
| `PARTIAL` | Observed on the positive path only; a named condition inside is unexercised | 17 |
| `NOT EXECUTED` | Never run, but runnable with the data and access held today | 21 |
| `NOT TESTABLE` | Never run and **no test data or access exists**. Declared Gap against the AC it covers | **45** |
| `PENDING CONFIRMATION` | Steps are known; the **expected result** is not, pending a product decision | 3 |

**Read the bottom two rows together before approving.** **45 of 127 cases — more than a third — cannot be run today** for want of test data or access, and they are not the trivial ones: they are the negative paths, the failure statuses, the insufficient wallet, the forced reprice, the non-Economy cabin, the real supplier penalty, and both DB assertions. **The feature’s positive path is well covered and its failure behaviour is almost entirely unverified.** Every one is a Declared Gap naming the open question that unblocks it; none is silently dropped.

### 0.4 Execution safety — absolute

**No case in this suite authorises anyone to click Pay, Exchange or Confirm & charge, or to call
`/exchange` or any ticketing endpoint.** Where a case requires a completed exchange, **a human
performs the payment** after the agent reports the exact flight and amount (D-1,
`execution_safety_policy.json`, `pipeline.md` §14). Every post-exchange assertion is read-only.

**Ask before every execution whether it runs Headed or Headless.** Never inferred, never carried over.

### 0.5 Lifecycle

**Every case carries `Review: Pending` and `Automation: Pending`.** Stage 3 always writes `Pending`;
only a human reviewer may change either. Stage 4M consumes a case only when `Review = Approved`;
Stage 4A only when `Review = Approved` **and** `Automation = Approved`. Generating this suite has
approved nothing.

### 0.6 A count correction

ProjectContext §7.2 records **100** edge cases. The story's own groups are
8 · 14 · 18 · 15 · 18 · 8 · 9 · 9 · 9, which sum to **108**. This suite covers 108; the Project
Context figure should be corrected at review.

### 0.7 Standing test data

| Role | Booking | Shape |
|---|---|---|
| **Clean reissue** | `NDCEG-BR-F260930LAlLPj` → `NDCEG-BR-F260930Vrf576` · PNR `TTDMXL` | Portal, agency AGN10030, AED at ROE 0.1, 2 Adult + 2 Child + 2 Infant, all six ticketed |
| **Broken reissue** | `NDCEG-BR-F2609294YODAr` → `NDCEG-BR-F260929i2znhr` · PNR `RPTIYO` | Admin, multi-city, 6 pax, traveller 2 holds a spent ticket and no replacement |
| **Reissuable, not yet reissued** | `NDCEG-BR-F260926PwYMR2` | Branch BRN265, Sabre Staging |
| **Airline refuses reissue** | `NDCEG-BR-F260916ENYOeQ` | **Do not use** — exchanged outside the app (C-5); its Itinerary is stale |

Prerequisite configuration in force: Branch exchange fee **100**, Agency exchange fee **50**, per
passenger (D-7, D-11). Sabre Staging configured on BRN265 and AGN9780 (D-5).

### 0.8 What "a reissuable booking" means in this suite

Wherever a case says **a reissuable booking**, all six conditions of **D-14** (ProjectContext §1.1,
user, 2026-10-01) hold, and the Reissue button is therefore displayed:

1. the **Auto Reissue checkbox** is on for the organisation that owns the booking (Agency or Branch);
2. the **credential the PNR was booked on** is selected in that organisation's Auto Reissue credential picker;
3. the booking **Status is `Booked` and the Itinerary status bar reads "Ticketed Document"**;
4. the booking was made **online** (not offline / imported);
5. **on Admin**, the booking is **locked by the current user** — the Portal has no lock, so on the Portal this condition does not apply *(user, 2026-10-01)*;
6. the supplier is a **reissue-capable GDS** — `NDCsbr`, `Sabre`, `TravelportNdc`, `Galileo` (CL-2).

If any one fails, **the button is not displayed** — there is no click-time refusal. A negative case
breaks exactly one condition and holds the other five.

---

## 1. Prerequisites — configuration that gates the feature

Story §1 · AC-01, AC-03 · edge cases 1.1–1.8

### TC-RFLOW-001 — Branch Reissue checkbox enabled makes Auto Reissue reachable for the Branch

**Objective:** Verify the Branch-level Reissue flag is honoured when it is on.

**Preconditions:** Branch BRN265 has the Reissue checkbox enabled and the booking's Sabre Staging credential selected under Auto Reissue credentials. A reissuable booking (§0.8) exists on that Branch.

**Test Data:** `NDCEG-BR-F260926PwYMR2`.

**Steps:**

1. Open Admin → Branch → BRN265 → edit, and confirm the Reissue checkbox is ticked. Read only; change nothing.
2. Open the booking's Itinerary and lock it as the current user.
3. Observe whether the Reissue action is offered on the booked flight.

**Expected Result:** The Reissue action is available on the Itinerary for a booking belonging to a Reissue-enabled Branch, subject to the remaining eligibility checks.

**Priority:** P1

**Tags:** Atomic, Positive, Configuration

**Notes:** Covers AC-01, AC-02 (story §1 AC-1), edge case 1.4. **Discovery: EXECUTED.** Observed run-007 (`evidence/d1-BRN265-edit.png`, `d1-config-and-reissue-entry.json`).

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-002 — Branch Reissue checkbox disabled prevents initiation for that Branch

**Objective:** Verify the negative side of the Branch flag.

**Preconditions:** A Branch with the Reissue checkbox **unticked**, carrying a booking that meets the other five D-14 conditions (§0.8). Changing a shared Branch's flag is master-data mutation — obtain a run-scoped grant and revert afterwards, or use a Branch already configured off.

**Test Data:** To be supplied — a Branch with Reissue off (**OQ-7**).

**Steps:**

1. Confirm the Branch's Reissue checkbox is unticked.
2. Open a booking on that Branch, lock it, and open the Itinerary.
3. Observe whether Auto Reissue is displayed.

**Expected Result:** Auto Reissue is **not displayed** in the Itinerary, and the Reissue flow cannot be initiated for any user or agent belonging to that Branch.

**Priority:** P1

**Tags:** Atomic, Negative, Configuration

**Notes:** Covers AC-01, AC-02, edge case 1.1. **Discovery: NOT TESTABLE.** Needs a Reissue-disabled Branch with a suitable booking — **OQ-7**. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-003 — Agency Reissue checkbox disabled prevents initiation for that Agency

**Objective:** Verify the Agency-level flag independently of the Branch.

**Preconditions:** An Agency with the Reissue checkbox unticked, under a Reissue-enabled Branch, carrying a booking that meets the other five D-14 conditions (§0.8).

**Test Data:** To be supplied (**OQ-7**).

**Steps:**

1. Confirm the Agency's Reissue checkbox is unticked while its parent Branch is ticked.
2. Open a booking belonging to that Agency, on Portal and on Admin.
3. Observe whether Auto Reissue is displayed for the affected booking.

**Expected Result:** Auto Reissue is not displayed or available for that Agency's booking on either surface.

**Priority:** P1

**Tags:** Atomic, Negative, Configuration

**Notes:** Covers AC-01, edge case 1.2. **Discovery: NOT TESTABLE** — **OQ-7**. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-004 — Branch enabled, Agency disabled: the feature is unavailable to the Agency

**Objective:** Verify the precedence the story states between the two flags.

**Preconditions:** Branch Reissue **on**, Agency Reissue **off**, both on the same booking's ownership chain.

**Test Data:** To be supplied (**OQ-7**).

**Steps:**

1. Set or find the Branch flag on and the Agency flag off.
2. Open the Agency's booking and attempt to initiate Reissue.

**Expected Result:** **Pending Confirmation.** The story's edge case 1.3 requires the feature be treated as unavailable for that Agency and initiation prevented. **Neither CL-1 nor the prerequisite run states this precedence, and the combination has never been tested** — see DS-6. Written to the story per the requirement-precedence rule; the expected result is fixed only when the product owner rules.

**Priority:** P1

**Tags:** Atomic, Negative, Configuration, Boundary

**Notes:** Covers AC-01, edge case 1.3. **Discovery: PENDING CONFIRMATION** — DS-6 open, and **OQ-7** for the data. Declared Gap on both counts.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-005 — Configured Exchange Fees are applied to the Reissue breakdown

**Objective:** Verify the fee configured in the Exchange Fees Rule Engine reaches the breakdown.

**Preconditions:** Exchange Fees configured: Branch 100, Agency 50, per passenger (D-7, D-11). A reissuable booking on each.

**Test Data:** Agency booking (fee 50) and Branch booking (fee 100).

**Steps:**

1. Read the configured fee at Admin → Rule Engine → Exchange Fees for the owning organisation. Change nothing.
2. Drive the Reissue flow to the results screen and open the fare breakdown.
3. Read the WT Change Fees component and the passenger count.

**Expected Result:** The breakdown shows the configured fee **multiplied by the passenger count** — 50 × n on the Agency booking, 100 × n on the Branch booking. Infants are included in the count.

**Priority:** P1

**Tags:** Atomic, Positive, Calculation

**Notes:** Covers AC-03, story §1 AC-4, edge cases 1.5 and 3.12. **Discovery: EXECUTED.** Observed run-007: Agency 50 × 3 = 150, Branch 100 × 4 = 400.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-006 — Unconfigured Exchange Fees are omitted without blocking the flow

**Objective:** Verify the fee's absence is handled as omission, not as an error.

**Preconditions:** An organisation with **no** Exchange Fees rule configured, carrying a reissuable booking. D-7 has fees configured on both orgs; removing one is shared master-data change.

**Test Data:** To be supplied — a third organisation, or an approved temporary removal with revert (**OQ-8**).

**Steps:**

1. Confirm no Exchange Fees rule applies to the organisation.
2. Drive the Reissue flow to the results screen and open the fare breakdown.

**Expected Result:** The flow continues normally. **No WT Change Fees line appears**, and the user is not blocked or warned because the configuration is missing. The payable difference equals the fare difference alone.

**Priority:** P1

**Tags:** Atomic, Negative, Configuration

**Notes:** Covers AC-03, story §1 AC-5, story §3 AC-9, edge cases 1.6 and 3.13. **Discovery: NOT TESTABLE** — **OQ-8**. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-007 — An invalid or incomplete Exchange Fees configuration does not produce a wrong fee

**Objective:** Verify the Rule Engine's validation prevents a partially-configured fee being applied.

**Preconditions:** An Exchange Fees rule saved in an invalid or incomplete state, if the Rule Engine permits one to be saved at all.

**Test Data:** To be supplied (**OQ-8**).

**Steps:**

1. Attempt to configure an Exchange Fees rule with a missing or invalid required value.
2. Observe whether the Rule Engine accepts it.
3. If it saves, drive the Reissue flow and read the breakdown.

**Expected Result:** Either the Rule Engine refuses the invalid configuration at save time, or the Reissue calculation is prevented rather than applying an incorrect fee. **An incorrect fee must never reach the breakdown.**

**Priority:** P2

**Tags:** Atomic, Negative, Boundary

**Notes:** Covers edge case 1.7. **Discovery: NOT TESTABLE** — **OQ-8**. Declared Gap. Note the story defers the mechanism to "the Rule Engine validation mechanism", so the case asserts the outcome, not the route to it.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-008 — Configuration is revalidated before the Exchange, not only at initiation

**Objective:** Verify a configuration change mid-flow cannot let a no-longer-permitted transaction through.

**Preconditions:** A Reissue flow open at Review & Pay. Authority to toggle the organisation's Reissue flag mid-flow, with revert.

**Test Data:** To be supplied (**OQ-7**, **OQ-8**).

**Steps:**

1. Initiate Reissue on an enabled organisation and drive to Review & Pay. Stop there.
2. With the flow still open, disable the organisation's Reissue flag.
3. Have the human attempt the Exchange.

**Expected Result:** The applicable configuration is validated again before the final Reissue/Exchange operation, and the transaction is refused because it is no longer permitted.

**Priority:** P2

**Tags:** E2E, Negative, Boundary, Timing

**Notes:** Covers edge case 1.8. **Discovery: NOT TESTABLE** — needs a mid-flow configuration change with approval, **OQ-7**/**OQ-8**. Declared Gap. The Exchange itself is performed by the human (D-1).

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-009 — Exchange Fees CRUD is a prerequisite, not part of this feature's scope

**Objective:** Record explicitly that the Rule Engine's own CRUD is out of scope, so its absence from this suite is deliberate.

**Preconditions:** None.

**Test Data:** None.

**Steps:**

1. Confirm at review that no case in this suite creates, edits or deletes an Exchange Fees rule.

**Expected Result:** The suite reads the fee configuration and never mutates it. Exchange Fees CRUD is covered by its own scope, not here (D-4).

**Priority:** P3

**Tags:** Documentation, Scope

**Notes:** Covers D-4. **Discovery: EXECUTED** — scope decision, recorded at intake 2026-09-26. Kept as a case so the exclusion is visible in the suite rather than only in the context.

**Review:** Pending

**Automation:** Pending

---

## 2. Eligibility — the Reissue entry point

Story §2 · AC-02, AC-04, AC-05, AC-09 · edge cases 2.1–2.14 · CL-2, CL-3 · **D-14** (the six-condition display rule, §0.8 — supersedes CL-1's click-time refusal)

### TC-RFLOW-010 — Auto Reissue is displayed in the Itinerary when every precondition holds

**Objective:** Verify the positive eligibility path end to end at the entry point.

**Preconditions:** All six D-14 conditions (§0.8): the owning organisation's Auto Reissue checkbox on; the booking's credential selected in that organisation's Auto Reissue credential picker; Status `Booked` **and** the status bar reads "Ticketed Document"; booked online; on Admin, booking **locked by the current user** (the Portal has no lock); the supplier a reissue-capable GDS.

**Test Data:** `NDCEG-BR-F260926PwYMR2` (Branch) and an AGN9780 Agency booking.

**Steps:**

1. Open the owning organisation's edit form; confirm Auto Reissue is ticked and the booking's credential is selected in the credential picker. Read only.
2. Open Admin → Booking → Search Booking → Flight tab, search by Booking Reference, open the booking.
3. Confirm Booking Information → Status reads `Booked` and the status bar reads "Ticketed Document".
4. Lock the booking as the current user.
5. Open the Itinerary and read the available actions on the booked flight.
6. On the Portal, open the Agency booking's Itinerary (no lock exists there) and read the actions.

**Expected Result:** The Reissue action is displayed and enabled on Admin once locked, and on the Portal without any lock. Selecting the flight starts the Eligibility phase.

**Priority:** P1

**Tags:** Atomic, Positive, Smoke

**Notes:** Covers AC-02, AC-04, story §2 AC-1, edge case 1.4, D-14. **Discovery: EXECUTED.** Observed run-007 on both Admin and Portal. **Rev 2, 2026-10-01** — preconditions and steps state all six D-14 conditions; the credential-picker and "Ticketed Document" checks were added as steps 1 and 3. Step 6 added: the lock is **Admin-only**, the Portal has no lock (user, 2026-10-01).

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-011 — On Admin, Reissue actions appear only while the booking is locked by the current user

**Objective:** Verify the Admin lock precondition from CL-3 / D-14 condition 5. Admin only — the Portal has no lock.

**Preconditions:** A booking that meets the other five D-14 conditions (§0.8), unlocked.

**Test Data:** `NDCEG-BR-F260926PwYMR2`.

**Steps:**

1. On Admin, open the booking's Itinerary **without** locking it. Read the available actions.
2. Lock the booking as the current user. Re-read the actions.
3. Release the lock at the end.

**Expected Result:** Reissue actions are absent or disabled while the booking is unlocked, and appear once the current user holds the lock. The lock is a precondition of the action, not of eligibility itself.

**Priority:** P1

**Tags:** Atomic, Positive, Negative, Security

**Notes:** Covers CL-3, D-14 condition 5. **Discovery: EXECUTED.** Confirmed run-007 and recorded as correct by design — the withdrawn finding on lock-gated controls established this is intended, not a defect. **Rev 2, 2026-10-01** — scoped to Admin: the user confirmed the lock exists only on Admin; the Portal has no lock.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-012 — A booking whose credential is not among the organisation's Auto Reissue credentials

**Objective:** Verify the credential condition of D-14 — the Reissue button is not displayed when the booking's credential is not selected in the organisation's credential picker.

**Preconditions:** An organisation whose Auto Reissue credential selection **excludes** the credential the booking was made on; the other five D-14 conditions hold (§0.8). Read as the lock holder.

**Test Data:** BRN265 with its Auto Reissue selection narrowed to a credential other than the booking's; booking on credential 313 or 315. Revert the selection afterwards.

**Steps:**

1. Note the booking's supplier credential.
2. Set the organisation's Auto Reissue credential selection to exclude it.
3. Lock the booking as the current user and open the Itinerary.
4. Read the Itinerary actions and record whether the Reissue button is displayed.
5. Restore the original credential selection, and confirm the button is displayed again (control).

**Expected Result:** With the booking's credential **not** selected, the Reissue button is **not displayed** (`actionsDetails.canAutoReissue: false`), and no Reissue can be initiated. With the selection restored, the button is displayed.

**Priority:** P1

**Tags:** Atomic, Negative, Boundary, Security

**Notes:** Covers AC-02, AC-05, D-14 condition 2. **Discovery: EXECUTED** — observed run-007 exactly as expected: button hidden, `canAutoReissue: false` (`evidence/cl1-*`, 16 files). **Rev 2, 2026-10-01** — expected result fixed under **D-14**, which settles **DS-2**: Rev 1 was `Pending Confirmation` between CL-1's "shown, refused on click" and the observed "hidden". CL-1's click-time message is no longer a test target.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-013 — Only a reissue-capable GDS supplier offers Reissue

**Objective:** Verify the supplier allow-list of CL-2.

**Preconditions:** Bookings on a supplier **not** on the list — Amadeus or any LCC — and one on a listed supplier.

**Test Data:** Listed: Sabre (held). Unlisted: to be supplied (**OQ-7**).

**Steps:**

1. Open a booking on an unlisted supplier that meets the other five D-14 conditions (§0.8), locked as the current user.
2. Read the Itinerary actions.
3. Repeat on a booking made through a listed supplier as the control.

**Expected Result:** Reissue is offered only on the listed suppliers — `NDCsbr`, `Sabre`, `TravelportNdc`, `Galileo`. On Amadeus and any LCC it is not offered.

**Priority:** P1

**Tags:** Atomic, Negative, Configuration

**Notes:** Covers AC-05, CL-2. **Discovery: PARTIAL** — the positive side holds on Sabre; the negative needs an unlisted-supplier booking, **OQ-7**. Declared Gap on the negative half.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-014 — An offline or imported booking cannot be reissued

**Objective:** Verify the online-booked restriction.

**Preconditions:** An offline or imported booking that meets the other five D-14 conditions (§0.8).

**Test Data:** To be supplied (**OQ-7**).

**Steps:**

1. Open the offline/imported booking, locked as the current user.
2. Read the Itinerary actions; attempt to initiate Reissue if anything is offered.

**Expected Result:** The Reissue flow cannot be initiated. The user remains in the current booking/Itinerary context, and no Reissue transaction is created.

**Priority:** P1

**Tags:** Atomic, Negative

**Notes:** Covers AC-09, story §2 AC-7 and AC-8, edge case 2.2. **Discovery: NOT TESTABLE** — **OQ-7**. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-015 — A booking that is not both Booked and "Ticketed Document" does not offer Reissue

**Objective:** Verify the status condition of D-14: Status `Booked` **and** the status bar "Ticketed Document", both required.

**Preconditions:** Bookings that meet the other five D-14 conditions (§0.8) but fail the status condition — status other than `Booked` (for example already `Reissued`, or cancelled), or `Booked` with a status bar other than "Ticketed Document" (for example not yet ticketed).

**Test Data:** `NDCEG-BR-F2609294YODAr` (now `Reissued`) as a negative; a `Booked` booking whose bar is not "Ticketed Document" to be supplied (**OQ-7**); `NDCEG-BR-F260926PwYMR2` as the control.

**Steps:**

1. Open a booking whose status is `Reissued`, locked as the current user. Record Booking Information → Status and the status bar, and read the Itinerary actions.
2. Repeat on a `Booked` booking whose status bar does **not** read "Ticketed Document".
3. Repeat on a booking with Status `Booked` **and** the bar "Ticketed Document" as the control.

**Expected Result:** Reissue is displayed only when Status is `Booked` **and** the status bar reads "Ticketed Document" (step 3). It is not displayed in steps 1 and 2. A booking already `Reissued` does not offer a further Reissue from the original.

**Priority:** P1

**Tags:** Atomic, Negative, Boundary

**Notes:** Covers AC-05, CL-3 as amended by D-14 condition 3, edge case 7.7. **Discovery: PARTIAL** — the `Reissued` negative and the positive control are observable on held data; a `Booked`-but-not-"Ticketed Document" booking and other non-`Booked` statuses are not (**OQ-7**, **OQ-10**). **Rev 2, 2026-10-01** — expected result changed under **D-14**: Rev 1 asserted the "Ticketed Document" bar was **not** the condition (CL-3 / `PO-24`); it now is, alongside Status `Booked`. Step 2 added for the new half of the condition.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-016 — A flight that is not eligible stops the flow with a clear message and no transaction

**Objective:** Verify the refusal path is explicit rather than silent.

**Preconditions:** A booking the airline will not reissue.

**Test Data:** `NDCEG-BR-F260916ENYOeQ` is documented as not reissuable — *"the airline will not reissue this ticket"* — but is **excluded from use** (C-5). An equivalent booking is needed.

**Steps:**

1. Select a flight that eligibility will refuse.
2. Observe the message and the resulting state.
3. Confirm no Reissue transaction was created.

**Expected Result:** The flow stops, the user is clearly told the selected flight cannot be reissued, and **no Reissue transaction is created**.

**Priority:** P1

**Tags:** Atomic, Negative

**Notes:** Covers edge case 2.1, story §2 AC-2. **Discovery: NOT TESTABLE** — the one known non-reissuable booking is barred by C-5; a replacement is needed (**OQ-7**). Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-017 — Eligibility failure or timeout stops the flow and permits a clean retry

**Objective:** Verify a service-level failure leaves no partial transaction.

**Preconditions:** A way to force the eligibility call to fail or time out — a stub, a fault-injection path, or network interruption.

**Test Data:** To be supplied (**OQ-10**).

**Steps:**

1. Initiate Reissue with the eligibility service failing or timing out.
2. Observe the error presented.
3. Retry and confirm the flow proceeds normally.
4. Confirm no partial Reissue transaction exists from the failed attempt.

**Expected Result:** The flow stops, an appropriate error is displayed, retry is possible, and **no partial Reissue transaction is created**.

**Priority:** P2

**Tags:** Atomic, Negative, Error Handling

**Notes:** Covers edge cases 2.12 and 2.11. **Discovery: NOT TESTABLE** — needs fault injection, **OQ-10**. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-018 — A stale eligibility response is revalidated before Search

**Objective:** Verify the flow does not proceed on outdated eligibility data.

**Preconditions:** An eligibility response allowed to age before continuing — by waiting, or by changing the booking's state between eligibility and search.

**Test Data:** Any reissuable booking.

**Steps:**

1. Complete the Eligibility phase and stop before Search.
2. Let the response age, or change the booking's lock or status in another session.
3. Continue to Search/Re-shop.

**Expected Result:** The relevant eligibility information is revalidated before continuing, so the search is not performed against stale eligibility.

**Priority:** P2

**Tags:** Atomic, Negative, Timing

**Notes:** Covers edge case 2.13. **Discovery: NOT EXECUTED** — runnable on held data; needs a defined staleness window, which discovery did not establish.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-019 — No eligible journey or passenger prevents continuation with a clear message

**Objective:** Verify the empty-eligibility case.

**Preconditions:** A booking where eligibility returns no selectable journey or passenger.

**Test Data:** To be supplied (**OQ-7**).

**Steps:**

1. Initiate Reissue on such a booking.
2. Observe the selection screen and any message.

**Expected Result:** Continuation is prevented and the user is told there is no eligible selection available for Reissue.

**Priority:** P2

**Tags:** Atomic, Negative, Boundary

**Notes:** Covers edge case 2.14. **Discovery: NOT TESTABLE** — **OQ-7**. Declared Gap.

**Review:** Pending

**Automation:** Pending

---

## 3. Journey and passenger selection

Story §2 · AC-06, AC-07, AC-08 · edge cases 2.3–2.11

### TC-RFLOW-020 — All required passengers are selected by default

**Objective:** Verify the default passenger selection rule.

**Preconditions:** A multi-passenger reissuable booking.

**Test Data:** A 6-passenger booking (2 Adult + 2 Child + 2 Infant) and a smaller party.

**Steps:**

1. Initiate Reissue and reach the passenger selection step.
2. Read the initial state of every passenger checkbox without changing anything.

**Expected Result:** **All required passengers are selected by default**, including infants. No passenger the eligibility response marks required is left unselected.

**Priority:** P1

**Tags:** Atomic, Positive

**Notes:** Covers AC-08, story §2 AC-5, edge case 2.7. **Discovery: EXECUTED.** Observed run-007 (`evidence/d3-*selection.png`).

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-021 — The default passenger selection is Not Split

**Objective:** Verify the Not Split default the story calls out explicitly.

**Preconditions:** A multi-passenger reissuable booking.

**Test Data:** The 6-passenger booking.

**Steps:**

1. Reach passenger selection and read the default state.
2. Attempt to deselect a subset of passengers so the party would be split.
3. Record whether the application permits the split and what it says.

**Expected Result:** The default state is **Not Split** — the whole required party moves together. A passenger combination that violates the eligibility result is prevented.

**Priority:** P1

**Tags:** Atomic, Positive, Boundary

**Notes:** Covers AC-08, story §2 AC-6, edge case 2.8. **Discovery: PARTIAL** — the default state was observed; the attempt to force a split was not.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-022 — A required passenger cannot be removed

**Objective:** Verify removal of a required passenger is refused or explained.

**Preconditions:** A booking whose eligibility marks all passengers required.

**Test Data:** The 6-passenger booking.

**Steps:**

1. Reach passenger selection.
2. Attempt to deselect a passenger the eligibility response marks required.
3. Attempt to continue.

**Expected Result:** Either the control refuses the deselection, or a validation message explains the passenger is required for the Reissue operation. Continuation without a required passenger is prevented.

**Priority:** P1

**Tags:** Atomic, Negative, Validation

**Notes:** Covers AC-07, edge case 2.9. **Discovery: PARTIAL** — the no-selection error was observed (`evidence/d3-branch-noselection.png`); removal of a *required* passenger specifically was not isolated.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-023 — Continuing with no passenger selected is refused

**Objective:** Verify the empty-selection validation.

**Preconditions:** A reissuable booking at the selection step.

**Test Data:** Any reissuable booking.

**Steps:**

1. Reach passenger selection and deselect every passenger, if the control allows it.
2. Attempt to continue to Search/Re-shop.

**Expected Result:** Continuation is refused with a validation message. No search is performed.

**Priority:** P1

**Tags:** Atomic, Negative, Validation

**Notes:** Covers AC-07, story §2 field-level validation. **Discovery: EXECUTED** — observed run-007 on both Branch and Agency paths (`evidence/d3-branch-noselection.png`, `d3-branch-error-0.png`).

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-024 — Only eligible passengers are offered for selection

**Objective:** Verify a mixed-eligibility party excludes the ineligible.

**Preconditions:** A booking where some passengers are eligible for reissue and others are not.

**Test Data:** To be supplied (**OQ-7**).

**Steps:**

1. Initiate Reissue on the mixed party and reach passenger selection.
2. Compare the passengers offered against the booking's full passenger list.

**Expected Result:** Only eligible passengers are available for selection. Ineligible passengers are not included in the Reissue operation and cannot be selected.

**Priority:** P2

**Tags:** Atomic, Negative, Boundary

**Notes:** Covers AC-07, edge case 2.10. **Discovery: NOT TESTABLE** — needs a mixed-eligibility party, **OQ-7**. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-025 — Journey selection follows the eligibility response, not the booking's full journey list

**Objective:** Verify journey selection is constrained by eligibility.

**Preconditions:** A multi-journey booking — round trip or multi-city.

**Test Data:** Round trip `QZTJRV`; multi-city `RPTIYO`.

**Steps:**

1. Initiate Reissue on the multi-journey booking.
2. Read which journeys are offered and which are preselected or locked.
3. Attempt to select a journey the eligibility response does not permit.

**Expected Result:** Journey selection follows the eligibility result. A journey selection eligibility does not permit is refused. **The passenger default does not imply all journeys are selected** — the story states this explicitly.

**Priority:** P1

**Tags:** Atomic, Positive, Negative, Boundary

**Notes:** Covers AC-06, story §2 AC-3, edge cases 2.3 and 2.7. **Discovery: PARTIAL** — multi-journey bookings were exercised in run-007 scenarios 8 and 9; the refusal of a non-permitted journey selection was not isolated.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-026 — When eligibility requires all journeys, a required journey cannot be removed

**Objective:** Verify the all-journeys-required case.

**Preconditions:** A booking whose eligibility response requires every journey.

**Test Data:** To be supplied — depends on supplier behaviour (**OQ-7**).

**Steps:**

1. Reach journey selection on such a booking.
2. Attempt to deselect one of the required journeys.

**Expected Result:** All applicable journeys are automatically selected or required, and the user is prevented from removing one.

**Priority:** P2

**Tags:** Atomic, Negative, Boundary

**Notes:** Covers edge case 2.4. **Discovery: NOT TESTABLE** — cannot be forced; depends on what eligibility returns, **OQ-7**. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-027 — When eligibility allows multiple journeys, the eligible ones can be chosen

**Objective:** Verify the permissive branch of journey selection.

**Preconditions:** A booking whose eligibility permits selecting among journeys.

**Test Data:** Round trip `QZTJRV`.

**Steps:**

1. Reach journey selection.
2. Select one eligible journey, then the other, then both, continuing after each.

**Expected Result:** The user can select the applicable eligible journeys according to the eligibility response, and each permitted combination proceeds to Search.

**Priority:** P2

**Tags:** Atomic, Positive

**Notes:** Covers edge case 2.5, AC-06. **Discovery: PARTIAL** — single-journey selection observed; the permutations were not swept.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-028 — A multi-passenger booking evaluates passenger eligibility per the eligibility response

**Objective:** Verify passenger eligibility is read from the response rather than assumed from the booking.

**Preconditions:** A booking with several passengers of mixed types.

**Test Data:** The 6-passenger booking (2 Adult + 2 Child + 2 Infant).

**Steps:**

1. Reach passenger selection.
2. Compare the passengers and types offered against the booking's manifest.

**Expected Result:** The passengers offered, their types and their required/optional state all follow the eligibility response. Infants appear and are treated as passengers for selection and for the change fee.

**Priority:** P2

**Tags:** Atomic, Positive

**Notes:** Covers AC-07, edge case 2.6. **Discovery: EXECUTED.** Observed run-007; infants confirmed included in the fee count (D-11).

**Review:** Pending

**Automation:** Pending

---

## 4. Search / Re-shop — the flight widget

Story §3 · AC-10, AC-11, AC-12, AC-13 · edge cases 3.1–3.6, 3.15–3.18

### TC-RFLOW-029 — The selected journey opens in the flight widget

**Objective:** Verify the journey returned from Eligibility is loaded into the widget.

**Preconditions:** Eligibility completed with a journey selected.

**Test Data:** Any reissuable booking.

**Steps:**

1. Complete Eligibility and continue to Search/Re-shop.
2. Read the widget's prefilled Date, Origin, Destination, Cabin Class and trip type against the selected journey.

**Expected Result:** The widget opens prefilled with the selected journey's criteria. Origin, Destination and trip type match the booking; the widget is editable.

**Priority:** P1

**Tags:** Atomic, Positive, Smoke

**Notes:** Covers AC-10, story §3 AC-1. **Discovery: EXECUTED.** Observed run-007 on Admin and Portal (`evidence/d2-widget.png`, `p-widget.png`).

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-030 — Date, Origin, Destination and Cabin Class can each be edited

**Objective:** Verify all four criteria are editable per normal flight-widget behaviour.

**Preconditions:** The widget open on a selected journey.

**Test Data:** Any reissuable booking; a second route such as CAI→RUH.

**Steps:**

1. Edit the Date to a valid future date and search.
2. Return, edit the Origin, and search.
3. Repeat for Destination and for Cabin Class.

**Expected Result:** Each of the four is editable and each edit produces a search against the edited criteria. Behaviour follows the normal flight-search widget.

**Priority:** P1

**Tags:** Atomic, Positive

**Notes:** Covers AC-10, AC-11, story §3 AC-2. **Discovery: PARTIAL** — date and route edits were exercised (scenario 2, CAI→RUH); **cabin class was never varied**, Declared Gap, **OQ-7**.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-031 — The old flight date cannot be selected

**Objective:** Verify the date restriction the story states twice.

**Preconditions:** The widget open on a journey whose original date is known.

**Test Data:** Any reissuable booking with a known original departure date.

**Steps:**

1. Open the date selector in the widget.
2. Attempt to select the journey's original date.
3. If the control permits it, attempt to run the search.

**Expected Result:** The old date is **disabled or unavailable** in the date selector, and a search using the old date is prevented.

**Priority:** P1

**Tags:** Atomic, Negative, Validation, Boundary

**Notes:** Covers AC-12, story §3 AC-3, edge case 3.1. **Discovery: NOT EXECUTED** — the datepicker state was captured (`reissue-mapping/discovery/evidence/s1-datepicker-state.png`) but the old-date restriction was not asserted. Runnable on held data.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-032 — A valid new date returns results

**Objective:** The positive control for the date restriction.

**Preconditions:** The widget open.

**Test Data:** Any reissuable booking.

**Steps:**

1. Select a valid future date other than the original.
2. Run the search.

**Expected Result:** The search is allowed and available flights for the selected date are returned.

**Priority:** P1

**Tags:** Atomic, Positive, Smoke

**Notes:** Covers edge case 3.2. **Discovery: EXECUTED.** Every run-007 scenario exercised this.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-033 — A Round Trip cannot be converted into Multi-City

**Objective:** Verify the trip-type restriction.

**Preconditions:** A Round Trip booking in the widget.

**Test Data:** Round trip `QZTJRV` (`NDCEG-BR-F260929u1ptMk`).

**Steps:**

1. Initiate Reissue on the Round Trip booking and reach the widget.
2. Attempt to change the trip type to Multi-City.

**Expected Result:** The conversion is prevented and the trip type remains Round Trip.

**Priority:** P1

**Tags:** Atomic, Negative, Validation, Boundary

**Notes:** Covers AC-13, story §3 AC-4, edge case 3.3. **Discovery: NOT EXECUTED** — a round-trip booking is now held (scenario 8), so this is runnable; the conversion attempt was never made.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-034 — No flights available shows a clear message and permits new criteria

**Objective:** Verify the empty-result state.

**Preconditions:** Search criteria that return nothing.

**Test Data:** An obscure route or a far-future date on a held booking.

**Steps:**

1. Search a route and date combination with no availability.
2. Read the message and the state of the widget.
3. Amend the criteria and search again.

**Expected Result:** A clear **No Flights Available** message is displayed, and the user can modify the search criteria and retry without losing the Reissue context.

**Priority:** P2

**Tags:** Atomic, Negative, Error Handling

**Notes:** Covers edge case 3.4. **Discovery: OBSERVED-DEFECT.** Run-007 observed a filtered result set reported to the agent as an empty market — the message appears when offers existed but were filtered. A finding is open; **this case asserts the story's requirement, not the defect**, and is expected to fail until the filtered/empty distinction is made.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-035 — A failed search permits retry without losing the Reissue context

**Objective:** Verify error recovery preserves state.

**Preconditions:** A way to make the search fail.

**Test Data:** To be supplied (**OQ-10**); a network interruption may suffice.

**Steps:**

1. Run a search that fails.
2. Read the error.
3. Retry the search.
4. Confirm the selected journey and passengers are still in context.

**Expected Result:** An appropriate error is displayed, retry is possible, and the selected Reissue context — journey and passengers — survives the failure.

**Priority:** P2

**Tags:** Atomic, Negative, Error Handling

**Notes:** Covers edge case 3.5. **Discovery: PARTIAL** — a search timeout was captured in run-007 (`evidence/d3-branch2-search-timeout.png`), but context preservation after it was not asserted.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-036 — A search timeout stops the attempt, notifies, and offers retry

**Objective:** Verify timeout handling specifically.

**Preconditions:** A search that exceeds the timeout.

**Test Data:** Observed naturally in run-007; otherwise **OQ-10**.

**Steps:**

1. Run a search that times out.
2. Observe whether the attempt is stopped, what the user is told, and whether retry is offered.

**Expected Result:** The current search attempt stops, the user is notified, and a retry option is provided.

**Priority:** P2

**Tags:** Atomic, Negative, Error Handling

**Notes:** Covers edge case 3.6. **Discovery: PARTIAL** — a timeout was observed; the notification and retry affordance were not assessed against the requirement.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-037 — A selected offer that becomes unavailable cannot be carried forward

**Objective:** Verify a stale offer is refused rather than used.

**Preconditions:** A results set where an offer can be made unavailable — by waiting past its validity, or by a supplier-side change.

**Test Data:** Any reissuable booking; timing dependent.

**Steps:**

1. Run a search and select an offer.
2. Let the offer become unavailable.
3. Attempt to continue to Review & Pay.

**Expected Result:** Continuation with the unavailable offer is prevented and the user is required to select another available result.

**Priority:** P2

**Tags:** Atomic, Negative, Timing

**Notes:** Covers edge case 3.15. **Discovery: NOT EXECUTED** — runnable but timing-dependent; no controlled way to expire an offer was established.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-038 — Changing the search criteria invalidates the previous results

**Objective:** Verify stale results are not carried as the active selection.

**Preconditions:** A completed search with results displayed.

**Test Data:** Any reissuable booking.

**Steps:**

1. Run a search and note the results.
2. Without selecting, change a search criterion — date, origin, destination or cabin.
3. Attempt to proceed using a result from the earlier search.

**Expected Result:** The previous results are no longer treated as the active selection. A new search is required before proceeding.

**Priority:** P2

**Tags:** Atomic, Negative, Timing

**Notes:** Covers edge case 3.16. **Discovery: NOT EXECUTED** — runnable on held data.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-039 — An invalid Origin/Destination combination is refused before submission

**Objective:** Verify criteria validation.

**Preconditions:** The widget open.

**Test Data:** Same airport as origin and destination; an unserved pair.

**Steps:**

1. Set Origin and Destination to the same airport. Attempt to search.
2. Set an unserved or invalid pair. Attempt to search.

**Expected Result:** The search criteria are validated and submission is prevented until valid criteria are provided.

**Priority:** P2

**Tags:** Atomic, Negative, Validation

**Notes:** Covers edge case 3.17. **Discovery: NOT EXECUTED** — runnable on held data.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-040 — A cabin class unavailable for the journey is prevented or returns only valid results

**Objective:** Verify cabin-class handling.

**Preconditions:** The widget open on a journey with a restricted cabin.

**Test Data:** A non-Economy cabin — **never exercised**, Declared Gap (**OQ-7**).

**Steps:**

1. Set the Cabin Class to a value unavailable for the selected journey.
2. Run the search.

**Expected Result:** Either the invalid selection is prevented, or the supplier returns only valid results. An unavailable cabin never produces a misleading result set.

**Priority:** P2

**Tags:** Atomic, Negative, Validation

**Notes:** Covers edge case 3.18, AC-11. **Discovery: NOT TESTABLE** — every run-007 scenario was Economy; no non-Economy cabin was ever exercised. Declared Gap, **OQ-7**.

**Review:** Pending

**Automation:** Pending

---

## 5. Flight results and the fare breakdown

Story §3 · AC-14, AC-15, AC-16, AC-17 · edge cases 3.7–3.14

### TC-RFLOW-041 — Results display the fare difference payable, not the total flight price

**Objective:** Verify the single most important pricing behaviour in the story.

**Preconditions:** A completed re-shop search with results.

**Test Data:** Any reissuable booking; compare against the original ticket's total.

**Steps:**

1. Note the original booking's paid total before searching.
2. Run the re-shop search and read each result's headline price.
3. Compare it against both the original total and the new flight's full price.

**Expected Result:** The displayed price is the **fare difference the user will pay**, not the new flight's total price and not the original total. The Reissue pricing concept is preserved throughout the results screen.

**Priority:** P1

**Tags:** Atomic, Positive, Calculation, Smoke

**Notes:** Covers AC-14, story §3 AC-5. **Discovery: EXECUTED.** Verified across 17 offers × 2 bookings in run-007 and re-verified in later scenarios. The mapping scope has confirmed the values carry faithfully (ProjectContext §1.3), so this case asserts the business rule alone.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-042 — No result carries a negative price or a negative difference

**Objective:** Verify the negative-price prohibition.

**Preconditions:** A completed re-shop search.

**Test Data:** Every held booking; every offer in every result set.

**Steps:**

1. Run re-shop searches across the held bookings and routes.
2. Read every offer's headline price and every component of its breakdown — base, taxes, supplier penalty, change fee — including per passenger type.
3. Record any negative value at any level.

**Expected Result:** **No negative price or negative difference appears anywhere** — not in a headline, not in a component, not per passenger type. **If one is seen it is a defect and must be reported immediately** (D-9).

**Priority:** P1

**Tags:** Atomic, Negative, Boundary, Calculation

**Notes:** Covers AC-15, story §3 AC-6, edge case 3.7. **Discovery: PARTIAL.** No negative was ever observed — but this holds **by a scope decision, not by evidence**: the core service does not provide a cheaper re-shop, so the Refund path was never exercised at any layer (OQ-M4, closed as out of scope). Sabre's own specification makes `Refund` a typed state with negative examples. **A pass here is a non-observation, never proof.** The sibling scope asserts the same invariant mechanically in TC-RMAP-056/057.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-043 — A zero fare difference is displayed as zero, not converted into something else

**Objective:** Verify the even-exchange boundary.

**Preconditions:** A re-shop returning a zero difference.

**Test Data:** To be supplied — never observed; worth attempting in the widget before declaring it ungettable.

**Steps:**

1. Search for a replacement priced identically to the original.
2. Read the headline price, the breakdown and what the screen offers as payable.

**Expected Result:** The result displays a **zero fare difference** where the business rules support it, without converting it into a negative or an otherwise incorrect amount. The change fee alone remains payable.

**Priority:** P2

**Tags:** Atomic, Boundary, Calculation

**Notes:** Covers edge case 3.8. **Discovery: NOT EXECUTED** — add-collect only has been observed. May be reachable in the widget without new data; attempt before declaring a gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-044 — An incomplete price breakdown makes the result unselectable

**Objective:** Verify a result cannot be carried forward without complete pricing.

**Preconditions:** A supplier response with an incomplete breakdown.

**Test Data:** To be supplied (**OQ-10**) — cannot be forced on Sabre Staging.

**Steps:**

1. Obtain a result whose breakdown is missing a required component.
2. Attempt to select it and continue.

**Expected Result:** The result is not selectable until the required pricing information is available and validated.

**Priority:** P2

**Tags:** Atomic, Negative, Validation

**Notes:** Covers edge case 3.9. **Discovery: NOT TESTABLE** — needs a malformed supplier response, **OQ-10**. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-045 — The fare breakdown is displayed per passenger type

**Objective:** Verify per-type breakdown on a mixed party.

**Preconditions:** A reissuable booking with several passenger types.

**Test Data:** The 6-passenger booking (2 Adult + 2 Child + 2 Infant).

**Steps:**

1. Run the re-shop search and open a result's fare breakdown.
2. Read the breakdown for each passenger type present.
3. Confirm each type's figures are distinguishable and labelled with the type.

**Expected Result:** The breakdown shows the difference amount **separately for each passenger type** — Adult, Child and Infant — each identified by its type.

**Priority:** P1

**Tags:** Atomic, Positive, Calculation

**Notes:** Covers AC-16, story §3 AC-7, edge case 3.10. **Discovery: EXECUTED.** Types and counts confirmed present in run-007; the mapping scope confirmed the per-type figures are per passenger rather than per group.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-046 — The breakdown contains Base Fare, Taxes, Supplier Penalty and WT Change Fees

**Objective:** Verify all four required components are present and separately identified.

**Preconditions:** A result with its breakdown open; an Exchange Fees rule configured.

**Test Data:** Agency booking (fee 50) and Branch booking (fee 100).

**Steps:**

1. Open a result's fare breakdown.
2. Locate each of: Base Fare difference · Taxes difference · Supplier Penalty · WT Change Fees.
3. Confirm each is its **own line**, labelled for what it is.

**Expected Result:** All four components are present and separately identified. **Supplier Penalty appears as its own component and is not folded into Taxes.**

**Priority:** P1

**Tags:** Atomic, Positive, Calculation

**Notes:** Covers AC-17, story §3 AC-8, edge case 3.11. **Discovery: OBSERVED-DEFECT.** Run-007 found the supplier penalty merged into `totalTax` and presented to the customer as "Taxes" on the confirmation. A finding is open. **This case asserts the story's requirement and is expected to fail until the components are separated** — it is the specification, not the regression test.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-047 — A supplier penalty is included in the breakdown when one exists

**Objective:** Verify the penalty component carries a real value, not only zero.

**Preconditions:** A fare carrying an actual supplier change penalty.

**Test Data:** To be supplied — **every observation to date has been zero** (**OQ-10** in the mapping scope).

**Steps:**

1. Re-shop a fare that carries a non-zero supplier change penalty.
2. Read the Supplier Penalty line in the breakdown and in the payable total.

**Expected Result:** The Supplier Penalty is included in the applicable Reissue breakdown at its actual value, and is reflected in the amount payable.

**Priority:** P1

**Tags:** Atomic, Positive, Calculation, Boundary

**Notes:** Covers AC-17, edge case 3.11. **Discovery: NOT TESTABLE** — the penalty has only ever been evidenced at zero, at supplier, core and screen alike. A zero proves nothing about how a real penalty is presented. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-048 — WT Change Fees are included when configured and excluded when not

**Objective:** Verify both sides of the fee rule at the results screen.

**Preconditions:** One organisation with a fee configured and one without.

**Test Data:** Configured: Agency 50, Branch 100. Unconfigured: to be supplied (**OQ-8**).

**Steps:**

1. On the configured organisation, open the breakdown and read the WT Change Fees line.
2. On the unconfigured organisation, repeat.

**Expected Result:** The fee appears at `configured amount × passenger count` where configured, and **no WT Change Fees line appears at all** where it is not — with the search continuing normally either way.

**Priority:** P1

**Tags:** Atomic, Positive, Negative, Calculation

**Notes:** Covers AC-03, AC-17, story §3 AC-9, edge cases 3.12 and 3.13. **Discovery: PARTIAL** — the configured side is verified; the unconfigured side is blocked on **OQ-8**. Declared Gap on the negative half.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-049 — Other flight details follow normal flight-search behaviour

**Objective:** Verify the result card is otherwise the standard one.

**Preconditions:** A re-shop result set, and a normal flight search for comparison.

**Test Data:** Any reissuable booking; the same route searched through normal flight search.

**Steps:**

1. Read a re-shop result card: carrier, flight number, times, duration, stops, cabin, baggage, fare rules.
2. Run the equivalent normal flight search and compare the non-pricing details.

**Expected Result:** Every non-pricing detail behaves as in normal flight search. Only the pricing is Reissue-specific.

**Priority:** P2

**Tags:** Atomic, Positive, Regression-of-behaviour

**Notes:** Covers AC-14 context, story §3 AC-10. **Discovery: NOT EXECUTED** — a side-by-side comparison against normal flight search was never made. Runnable on held data. *(This asserts the story's "behaves as normal" requirement; it is not a defect-regression case.)*

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-050 — A fare change between search and selection triggers a reprice where supported

**Objective:** Verify the reprice hand-off from the results screen.

**Preconditions:** An offer whose price changes supplier-side between search and selection, on an offer supporting Reprice.

**Test Data:** Cannot be forced (**OQ-12**).

**Steps:**

1. Run a search and leave the results open until the supplier price moves.
2. Select the affected offer and continue.

**Expected Result:** The selected offer is revalidated or repriced before payment when the offer supports Reprice. The user is never carried forward on a stale price.

**Priority:** P2

**Tags:** Atomic, Timing, Boundary

**Notes:** Covers AC-22, edge case 3.14. **Discovery: NOT TESTABLE** — a supplier reprice cannot be forced, **OQ-12**. Declared Gap. Observed opportunistically only.

**Review:** Pending

**Automation:** Pending

---

## 6. Review & Pay — displayed, never submitted

Story §4 · AC-18, AC-19, AC-20, AC-21 · edge cases 4.1–4.6, 4.10–4.15

> **Every case in this section stops at the Review & Pay screen.** Nothing here clicks Pay, Exchange
> or Confirm & charge. Where a case needs the payment to proceed, a human performs it (D-1).

### TC-RFLOW-051 — Review & Pay displays the new flight's data

**Objective:** Verify the new flight is presented completely.

**Preconditions:** A result selected and Review & Pay open.

**Test Data:** Any reissuable booking.

**Steps:**

1. Select a re-shop result and open Review & Pay.
2. Read the new flight block: carrier, flight numbers, every segment, dates, times, cabin, passengers.
3. Compare against the offer selected on the results screen.

**Expected Result:** All data for the newly selected flight is displayed, and it is the offer the user selected. It is presented as the selected Reissue flight.

**Priority:** P1

**Tags:** Atomic, Positive, Smoke

**Notes:** Covers AC-18, story §4 AC-1. **Discovery: EXECUTED.** Observed run-007 on Admin and Portal (`evidence/d3-review-0.png`, `p-review.png`).

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-052 — Review & Pay displays the old flight's price

**Objective:** Verify the comparison anchor is present.

**Preconditions:** Review & Pay open on a booking whose original paid total is known.

**Test Data:** Any reissuable booking; note the original total first.

**Steps:**

1. Note the original booking's paid total from the Itinerary or invoice.
2. Open Review & Pay and locate the old-price block.
3. Compare the displayed old price against the original total.

**Expected Result:** The old price for the flight being reissued is displayed, allowing the user to compare it with the new Reissue amount.

**Priority:** P1

**Tags:** Atomic, Positive

**Notes:** Covers AC-18, story §4 AC-2. **Discovery: OBSERVED-DEFECT.** Run-007 found the "currently ticketed" total rendered rounded rather than exact — two distinct faults under one label, a binding fault in EGP and a conversion fault in AED. A finding is open. **This case asserts that the old price is displayed and correct; it is expected to fail on the rounding until fixed.**

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-053 — The payable fare difference appears in the right-top area

**Objective:** Verify placement, which the story states explicitly.

**Preconditions:** Review & Pay open.

**Test Data:** Any reissuable booking.

**Steps:**

1. Open Review & Pay.
2. Locate the payable fare difference and record its position on the screen.
3. Compare the amount against the selected result's difference plus the change fee.

**Expected Result:** The payable fare difference is displayed **prominently in the right-top area**, and equals the selected offer's difference plus the applicable change fee.

**Priority:** P1

**Tags:** Atomic, Positive, Calculation

**Notes:** Covers AC-19, story §4 AC-3. **Discovery: EXECUTED.** Position and arithmetic both observed in run-007; the mapping scope confirmed amount payable = core total at rate plus the app-origin change fee.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-054 — The current wallet balance is displayed

**Objective:** Verify the wallet figure is present on Review & Pay.

**Preconditions:** Review & Pay open on both Admin and Portal.

**Test Data:** Agency AGN9780 on Portal; a Branch booking on Admin.

**Steps:**

1. Open Review & Pay on the Portal and read the displayed wallet balance.
2. Repeat on Admin.

**Expected Result:** The current wallet balance is displayed on both surfaces. **Admin and Portal legitimately bind different quantities under this label** — Admin includes the organisation's credit limit, the Portal does not — and that difference is by design and must never be raised as a defect (ProjectContext §1.3). The case asserts presence and correctness per channel, **not** parity between them.

**Priority:** P1

**Tags:** Atomic, Positive

**Notes:** Covers AC-20, story §4 AC-4. **Discovery: EXECUTED** for display. A separate finding is open on the Portal rendering three decimals on the dashboard and two on Review & Pay — a formatting defect, not a composition one.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-055 — A sufficient wallet balance permits continuation

**Objective:** The positive control for the balance check.

**Preconditions:** A wallet with more than the payable difference.

**Test Data:** Any held agency wallet with adequate balance.

**Steps:**

1. Open Review & Pay where the balance comfortably exceeds the payable amount.
2. Select Wallet as the payment method.
3. Observe whether the flow permits continuation. **Stop before paying.**

**Expected Result:** Wallet payment is offered and the user may continue to Exchange. No insufficiency warning appears.

**Priority:** P1

**Tags:** Atomic, Positive

**Notes:** Covers AC-20, edge case 4.1. **Discovery: EXECUTED.** Every run-007 scenario ran with a sufficient balance.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-056 — An insufficient wallet balance blocks Wallet payment and says so

**Objective:** Verify the negative side of the balance check — never exercised.

**Preconditions:** A wallet whose balance cannot cover the payable difference.

**Test Data:** To be supplied — a low-balance test wallet (**OQ-11**).

**Steps:**

1. Open Review & Pay where the balance is below the payable amount.
2. Select Wallet.
3. Attempt to continue.

**Expected Result:** Payment through Wallet is **prevented**, and the screen clearly states that the available balance is insufficient. Another supported payment method may be selected if available.

**Priority:** P1

**Tags:** Atomic, Negative, Boundary

**Notes:** Covers AC-20, story §4 AC-5, edge case 4.2. **Discovery: NOT TESTABLE** — **OQ-11**. Declared Gap. The wallet check is asserted only on its positive side today.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-057 — The wallet balance is revalidated immediately before payment

**Objective:** Verify the flow does not deduct against a stale balance.

**Preconditions:** A Review & Pay screen left open while the wallet balance changes in another session.

**Test Data:** A wallet that can be debited or topped up independently (**OQ-11**).

**Steps:**

1. Open Review & Pay with a sufficient balance and select Wallet.
2. In another session, reduce the wallet below the payable amount.
3. Have the human attempt the payment.

**Expected Result:** A final balance validation is performed before deduction. If the balance is now insufficient, payment is blocked rather than proceeding on the stale figure.

**Priority:** P1

**Tags:** E2E, Negative, Timing, Boundary

**Notes:** Covers edge cases 4.3 and 4.10. **Discovery: NOT TESTABLE** — **OQ-11**. Declared Gap. The payment itself is performed by the human (D-1).

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-058 — Wallet and Banque Masr are both offered as payment methods

**Objective:** Verify both supported methods are present.

**Preconditions:** Review & Pay open.

**Test Data:** Any reissuable booking.

**Steps:**

1. Open the payment-method control.
2. Record every option offered and its exact on-screen label.

**Expected Result:** Both **Wallet** and **Banque Masr** are available for selection. *(The story spells this "Banque Misr" in §4.6 and "Banque Masr" in AC-21 and §4.10 — DS-4. The expected result is written against the application's own label, captured at execution.)*

**Priority:** P1

**Tags:** Atomic, Positive

**Notes:** Covers AC-21, story §4 AC-6 and AC-7. **Discovery: PARTIAL** — the methods are observable on Review & Pay; **completing** a payment is Forbidden for the platform (D-1), so only selection is asserted.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-059 — Continuing with no payment method selected is refused

**Objective:** Verify the payment-method validation.

**Preconditions:** Review & Pay open with no method preselected, if the screen permits that state.

**Test Data:** Any reissuable booking.

**Steps:**

1. Open Review & Pay and ensure no payment method is selected.
2. Attempt to continue.

**Expected Result:** Continuation is prevented and the user is required to select a supported payment method.

**Priority:** P2

**Tags:** Atomic, Negative, Validation

**Notes:** Covers edge case 4.5. **Discovery: NOT EXECUTED** — runnable on held data; depends on whether a method is preselected by default.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-060 — The fare breakdown on Review & Pay is per passenger type and stays difference-based

**Objective:** Verify the breakdown survives the step from results to review.

**Preconditions:** Review & Pay open on a mixed-type party.

**Test Data:** The 6-passenger booking.

**Steps:**

1. Open the fare breakdown on Review & Pay.
2. Read each passenger type's figures.
3. Compare against the same breakdown on the results screen.
4. Confirm no line presents the **complete new flight amount** as the payable Reissue amount.

**Expected Result:** The breakdown is per passenger type, matches the results screen, and preserves the Reissue pricing concept. **The complete flight amount is never displayed as the payable Reissue amount** — the story forbids this explicitly.

**Priority:** P1

**Tags:** Atomic, Positive, Calculation

**Notes:** Covers AC-16, story §4 AC-8, story §4.7. **Discovery: EXECUTED** for structure. Note the separate labelling question raised in Discovery: on a reissued booking these columns carry the **difference** under labels that read as fare — a product ruling is pending (**OQ-F4**).

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-061 — A breakdown that disagrees with the selected result blocks payment

**Objective:** Verify an inconsistent breakdown is caught rather than paid.

**Preconditions:** A state where the breakdown and the selected result disagree.

**Test Data:** To be supplied (**OQ-10**) — cannot be produced on demand.

**Steps:**

1. Reach Review & Pay with a breakdown that does not reconcile to the selected result.
2. Attempt to continue to payment.

**Expected Result:** Payment is prevented and the pricing data must be recalculated or re-retrieved before the flow continues.

**Priority:** P2

**Tags:** Atomic, Negative, Validation

**Notes:** Covers edge case 4.13. **Discovery: NOT TESTABLE** — **OQ-10**. Declared Gap. Note a related finding is open on the confirmation screen, where the total exceeds its own itemisation by the supplier penalty.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-062 — A negative difference can never be paid

**Objective:** Verify the prohibition holds at the payment step, not only at results.

**Preconditions:** Review & Pay reached on any offer.

**Test Data:** Every held booking.

**Steps:**

1. Reach Review & Pay on each held booking.
2. Read the payable amount and every breakdown component, including per passenger type.
3. Record any negative value.

**Expected Result:** **No negative amount appears and payment using a negative Reissue amount is never possible.** A sighting is a defect and is reported immediately (D-9).

**Priority:** P1

**Tags:** Atomic, Negative, Boundary

**Notes:** Covers AC-15, edge case 4.14. **Discovery: PARTIAL** — as TC-RFLOW-042: never observed, but holding by scope decision rather than by evidence. A non-observation, not proof.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-063 — A zero difference does not request an incorrect positive amount

**Objective:** Verify the even-exchange case at the payment step.

**Preconditions:** A zero-difference offer taken to Review & Pay.

**Test Data:** To be supplied — never observed.

**Steps:**

1. Take a zero-difference offer to Review & Pay.
2. Read the payable amount and what the payment control offers.

**Expected Result:** The zero-difference case is handled by the supported payment/exchange flow, and **no incorrect positive payment amount is requested**. The change fee alone remains payable where one is configured.

**Priority:** P2

**Tags:** Atomic, Boundary, Calculation

**Notes:** Covers edge case 4.15. **Discovery: NOT EXECUTED** — depends on obtaining a zero-difference offer, as TC-RFLOW-043.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-064 — A fare change after Review & Pay opens is revalidated before payment

**Objective:** Verify stale pricing cannot be charged.

**Preconditions:** Review & Pay left open while the supplier price moves.

**Test Data:** Cannot be forced (**OQ-12**).

**Steps:**

1. Open Review & Pay and leave it idle until the supplier price changes.
2. Have the human attempt the payment.

**Expected Result:** The pricing is refreshed or revalidated before payment. **The user is never charged using stale pricing.**

**Priority:** P1

**Tags:** E2E, Negative, Timing

**Notes:** Covers edge case 4.6. **Discovery: NOT TESTABLE** — **OQ-12**. Declared Gap. Relevant context: run-007 confirmed "FARE HELD" on Review & Pay is app-side only, not a supplier hold (D-12), so the price can move underneath it.

**Review:** Pending

**Automation:** Pending

---

## 7. The Price Changed popup

Story §4.8 · AC-22 · edge cases 4.7, 4.8, 4.9

### TC-RFLOW-065 — A supplier price change on a Reprice-capable offer raises the Price Changed popup

**Objective:** Verify the popup appears when it should.

**Preconditions:** An offer that supports Reprice, whose price changes supplier-side.

**Test Data:** Cannot be forced (**OQ-12**).

**Steps:**

1. Select a Reprice-capable offer and reach Review & Pay.
2. Cause or await a supplier-side price change.
3. Attempt to continue.

**Expected Result:** The agreed **Price Changed popup** is displayed, and the user is informed the selected offer's price has changed **before** continuing.

**Priority:** P1

**Tags:** Atomic, Positive, Timing

**Notes:** Covers AC-22, story §4 AC-9, edge case 4.7. **Discovery: NOT TESTABLE** — a reprice cannot be forced; observed opportunistically only, and never seen. **OQ-12**. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-066 — Acknowledging the new price is required before continuing

**Objective:** Verify the popup is a gate, not a notification.

**Preconditions:** The Price Changed popup displayed.

**Test Data:** **OQ-12**.

**Steps:**

1. With the popup displayed, attempt to continue without acknowledging.
2. Acknowledge the updated amount and continue.

**Expected Result:** Continuation requires explicit acknowledgement of the updated amount. The amount carried forward is the new one.

**Priority:** P1

**Tags:** Atomic, Positive, Validation

**Notes:** Covers AC-22, edge case 4.7. **Discovery: NOT TESTABLE** — **OQ-12**. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-067 — Rejecting the new price stops the operation without charging

**Objective:** Verify the refusal path is safe.

**Preconditions:** The Price Changed popup displayed.

**Test Data:** **OQ-12**.

**Steps:**

1. With the popup displayed, reject the new price.
2. Observe where the user lands and whether any charge occurred.

**Expected Result:** The payment and exchange operation stops, the user returns to the appropriate previous step, and **no charge is made**.

**Priority:** P1

**Tags:** Atomic, Negative

**Notes:** Covers edge case 4.9. **Discovery: NOT TESTABLE** — **OQ-12**. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-068 — A price change on an offer that does not support Reprice is not applied silently

**Objective:** Verify the non-Reprice branch.

**Preconditions:** An offer that does **not** support Reprice, whose price changes.

**Test Data:** **OQ-12**.

**Steps:**

1. Select an offer without Reprice support and reach Review & Pay.
2. Cause or await a supplier-side price change.
3. Attempt to continue.

**Expected Result:** The offer is handled according to the supplier capability, and **an outdated price is never used silently**. The user is not charged an amount they were not shown.

**Priority:** P1

**Tags:** Atomic, Negative, Boundary

**Notes:** Covers edge case 4.8. **Discovery: NOT TESTABLE** — **OQ-12**, and requires an offer known not to support Reprice. Declared Gap.

**Review:** Pending

**Automation:** Pending

---

## 8. Exchange — performed by the human, verified read-only

Story §5 · AC-24 … AC-31 · edge cases 5.1–5.18

> **The platform never clicks Exchange.** Every case here either observes state the human's exchange
> produced, or asserts a rule about how the system must behave around it. D-1 and
> `execution_safety_policy.json` are absolute.

### TC-RFLOW-069 — A successful Reissue creates a new Booking Reference

**Objective:** Verify a new reference is issued and is genuinely new.

**Preconditions:** A completed exchange performed by the human.

**Test Data:** `NDCEG-BR-F260930LAlLPj` → `NDCEG-BR-F260930Vrf576`.

**Steps:**

1. Note the original booking reference before the exchange.
2. After the human completes the exchange, read the new booking reference from the confirmation.
3. Confirm it differs from the original and resolves to a real booking.

**Expected Result:** A new Booking Reference is created, distinct from the original, and addresses the reissued offer.

**Priority:** P1

**Tags:** E2E, Positive, Smoke

**Notes:** Covers AC-24, story §5 AC-2, edge case 5.3. **Discovery: EXECUTED.** Observed on every completed run-007 exchange.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-070 — A successful Reissue creates a new Order ID

**Objective:** Verify the Order ID counterpart.

**Preconditions:** A completed exchange.

**Test Data:** Order `AGN10030NDCNDCORD2609306TCU5L` against the original's order.

**Steps:**

1. Note the original Order ID.
2. Read the new Order ID after the exchange.
3. Confirm it differs and addresses the reissued offer.

**Expected Result:** A new Order ID is created and is associated with the Reissue offer.

**Priority:** P1

**Tags:** E2E, Positive

**Notes:** Covers AC-24, story §5 AC-3. **Discovery: EXECUTED.** Observed run-007.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-071 — The original offer's status becomes Reissued

**Objective:** Verify the original is retired correctly.

**Preconditions:** A completed exchange.

**Test Data:** `NDCEG-BR-F260930LAlLPj` (original) after its exchange.

**Steps:**

1. After the exchange, open the original booking on the Itinerary and in PNR Query.
2. Read its status.

**Expected Result:** The original offer's status is **Reissued** on every surface that shows it.

**Priority:** P1

**Tags:** E2E, Positive

**Notes:** Covers AC-29, story §5 AC-8, edge cases 5.3 and 7.4. **Discovery: EXECUTED.** Confirmed on both held reissued bookings.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-072 — Every passenger holds a live travel document after the exchange

**Objective:** Verify per-passenger ticketing actually completed — the control Discovery recommends.

**Preconditions:** A completed exchange on a multi-passenger booking.

**Test Data:** Clean `TTDMXL`; and any newly exchanged booking.

**Steps:**

1. After the exchange, open PNR Query on the GDS PNR.
2. Read the Ticket Number for **every** passenger on the reissued booking.
3. Read the `Ticket` column of the Reissue History row for the Reissue action.
4. Where supplier access is available, confirm each passenger holds a live ticket at the supplier.

**Expected Result:** **Every passenger holds a ticket number**, the Reissue History `Ticket` column is populated, and no passenger is left with only a spent document. The application does not present the exchange as successful unless this holds.

**Priority:** P1

**Tags:** E2E, Positive, Boundary

**Notes:** Covers AC-24, AC-25, story §5 AC-3, edge case 5.3. **Discovery: OBSERVED-DEFECT.** Two findings are open here — one where a passenger received no replacement document at all, one where all ticket numbers are blank on the record. Discovery established that the Reissue History `Ticket` column reads `N/A` on the broken booking and carries a real number on the clean one, making step 3 a cheap detector. **This case states the requirement the product does not yet meet.**

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-073 — The Reissue offer supports Booked status

**Objective:** Verify the positive status.

**Preconditions:** A completed, successful exchange.

**Test Data:** `NDCEG-BR-F260930Vrf576`.

**Steps:**

1. After a successful exchange, read the reissued offer's status.

**Expected Result:** The reissued offer's status is **Booked**.

**Priority:** P1

**Tags:** E2E, Positive

**Notes:** Covers AC-25, story §5 AC-4. **Discovery: EXECUTED.** Observed run-007.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-074 — The Reissue offer supports Not Booked status without marking the original Reissued

**Objective:** Verify the Not Booked path and its effect on the original.

**Preconditions:** A supplier response of Not Booked.

**Test Data:** Cannot be forced on Sabre Staging (**OQ-10**).

**Steps:**

1. Drive a Reissue where the supplier returns Not Booked.
2. Read the reissued offer's status and the original booking's status.

**Expected Result:** The Reissue offer remains **Not Booked**, and **the original booking is not incorrectly marked as successfully Reissued**.

**Priority:** P1

**Tags:** E2E, Negative, Boundary

**Notes:** Covers AC-25, edge cases 5.4 and 7.5. **Discovery: NOT TESTABLE** — needs a stub or fault injection, **OQ-10**. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-075 — The Reissue offer supports Booking Fail status and leaves the original usable

**Objective:** Verify the Booking Fail path.

**Preconditions:** A supplier response of Booking Fail.

**Test Data:** **OQ-10**.

**Steps:**

1. Drive a Reissue where the supplier returns Booking Fail.
2. Read the reissued offer's status and the original booking's status and availability.

**Expected Result:** The Reissue offer is marked **Booking Fail** and the original booking remains available according to its existing status.

**Priority:** P1

**Tags:** E2E, Negative, Boundary

**Notes:** Covers AC-25, edge case 5.5. **Discovery: NOT TESTABLE** — **OQ-10**. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-076 — A failed Exchange explains itself

**Objective:** Verify a failure is actionable rather than opaque.

**Preconditions:** An exchange that fails.

**Test Data:** Observed naturally in run-007; otherwise **OQ-10**.

**Steps:**

1. Drive a Reissue to an exchange that fails.
2. Read the message presented to the agent: does it carry a code, a cause, and a next step?

**Expected Result:** The failure information is persisted and the agent is told **what failed and what to do next**. The Reissue is not marked Booked without confirmed supplier success.

**Priority:** P1

**Tags:** E2E, Negative, Error Handling

**Notes:** Covers AC-25, edge case 5.6. **Discovery: OBSERVED-DEFECT.** Run-007 observed a 409 *"the request could not be completed"* carrying no code, no cause and no next step. A finding is open and its causation is blocked on log access. **This case asserts the requirement.**

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-077 — The Reissue transaction is persisted before the supplier is called

**Objective:** Verify the Init/Persist → Call Supplier → Update cycle's ordering.

**Preconditions:** Visibility of the transaction record before and after the supplier call — DB or service logs.

**Test Data:** **Not available** — DB is Deferred and `logs/detail.log` has never been accessible.

**Steps:**

1. Initiate an exchange and observe whether the Reissue transaction exists before the supplier call.
2. Observe the transaction being updated with the supplier status afterwards.

**Expected Result:** The transaction is persisted **before** the supplier is called, then updated according to the supplier's response.

**Priority:** P2

**Tags:** E2E, Integration, Boundary

**Notes:** Covers story §5 AC-1, edge case 5.1. **Discovery: NOT TESTABLE** — the cycle cannot be instrumented without DB or service logs (**OQ-9**). Note AC-23, the overall-AC form of this requirement, was **moved to `reissue-mapping`** as an Integration obligation with no business surface; this case retains the per-section obligation and is a Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-078 — A failed initialisation does not call the supplier

**Objective:** Verify the ordering holds on the failure path too.

**Preconditions:** An exchange whose initialisation fails.

**Test Data:** **OQ-10**.

**Steps:**

1. Force initialisation to fail.
2. Confirm no supplier call was made and read the error returned to the user.

**Expected Result:** The supplier is **not** called and an appropriate error is returned.

**Priority:** P2

**Tags:** E2E, Negative, Error Handling

**Notes:** Covers edge case 5.2. **Discovery: NOT TESTABLE** — **OQ-10**, and confirming "no supplier call" needs log access (**OQ-9**). Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-079 — A duplicate Exchange request is not processed twice

**Objective:** Verify duplicate protection.

**Preconditions:** A Reissue transaction where the exchange can be submitted twice — double-click, retry, or resubmission.

**Test Data:** **OQ-10**; and the human performs any submission (D-1).

**Steps:**

1. Have the human submit the exchange.
2. Attempt a second submission for the same Reissue transaction.
3. Read how many transactions and bookings resulted.

**Expected Result:** Duplicate processing for the same Reissue transaction or offer is **prevented**. Exactly one exchange occurs.

**Priority:** P1

**Tags:** E2E, Negative, Boundary

**Notes:** Covers edge cases 5.9 and 5.18. **Discovery: NOT TESTABLE** — a deliberate duplicate submission risks a real second exchange on a shared environment and was not attempted. Needs an explicit grant. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-080 — A late supplier response updates the existing transaction rather than creating a duplicate

**Objective:** Verify late responses reconcile.

**Preconditions:** A supplier response arriving after persistence.

**Test Data:** **OQ-10**.

**Steps:**

1. Drive an exchange where the supplier response is delayed past persistence.
2. Read how many Reissue transactions exist for the offer afterwards.

**Expected Result:** The existing persisted transaction is **updated**; no duplicate transaction is created.

**Priority:** P2

**Tags:** E2E, Negative, Timing

**Notes:** Covers edge case 5.8. **Discovery: NOT TESTABLE** — **OQ-10**, **OQ-9**. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-081 — A supplier timeout leaves the transaction traceable rather than assumed

**Objective:** Verify neither success nor failure is inferred from silence.

**Preconditions:** A supplier response that times out.

**Test Data:** **OQ-10**.

**Steps:**

1. Drive an exchange where the supplier times out.
2. Read the transaction's resulting state and whether it remains traceable for investigation.

**Expected Result:** The system does **not** assume failure or success. The transaction remains traceable and is handled by the applicable status or reconciliation mechanism.

**Priority:** P1

**Tags:** E2E, Negative, Timing, Boundary

**Notes:** Covers edge case 5.7. **Discovery: NOT TESTABLE** — **OQ-10**. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-082 — A missing new Booking Reference is not presented as a completed Reissue

**Objective:** Verify incompleteness is surfaced.

**Preconditions:** A successful supplier exchange that returns no booking reference.

**Test Data:** **OQ-10**.

**Steps:**

1. Drive an exchange where the reference is not returned.
2. Read what the confirmation presents and the transaction's state.

**Expected Result:** The Reissue is **not** presented as fully completed until the booking reference can be confirmed or retrieved, and the transaction remains traceable.

**Priority:** P1

**Tags:** E2E, Negative, Boundary

**Notes:** Covers edge case 5.10. **Discovery: NOT TESTABLE** — **OQ-10**. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-083 — A missing new Order ID does not create an incomplete successful record

**Objective:** The Order ID counterpart.

**Preconditions:** An exchange returning no Order ID.

**Test Data:** **OQ-10**.

**Steps:**

1. Drive an exchange where the Order ID is not returned.
2. Read the resulting record and whether it is flagged for reconciliation.

**Expected Result:** No incomplete successful Reissue record is created; the transaction is flagged for handling or reconciliation.

**Priority:** P2

**Tags:** E2E, Negative, Boundary

**Notes:** Covers edge case 5.11. **Discovery: NOT TESTABLE** — **OQ-10**. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-084 — A failure to create Reissue History does not lose the original relationship

**Objective:** Verify the relationship survives a history-write failure.

**Preconditions:** An exchange where the history record cannot be created.

**Test Data:** **OQ-10**.

**Steps:**

1. Drive an exchange where Reissue History creation fails.
2. Read whether the original/new relationship is still recoverable.

**Expected Result:** The relationship between original and new booking is **not lost**. The operation is treated as requiring persistence or reconciliation before it counts as complete.

**Priority:** P2

**Tags:** E2E, Negative, Boundary

**Notes:** Covers edge case 5.12. **Discovery: NOT TESTABLE** — **OQ-10**, **OQ-9**. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-085 — A failed original-status update is retried or reconciled, not abandoned

**Objective:** Verify the original does not silently stay un-retired.

**Preconditions:** An exchange where the original status update fails.

**Test Data:** **OQ-10**.

**Steps:**

1. Drive an exchange where the original's status update to `Reissued` fails.
2. Read both bookings' states and whether a retry or reconciliation occurs.

**Expected Result:** The new Reissue transaction remains traceable and the original's status update is retried or reconciled rather than the relationship being lost.

**Priority:** P2

**Tags:** E2E, Negative, Boundary

**Notes:** Covers edge case 5.13. **Discovery: NOT TESTABLE** — **OQ-10**. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-086 — Reissue prices are stored as differences, not total flight prices

**Objective:** Verify the difference-based persistence model.

**Preconditions:** Read-only DB access.

**Test Data:** **Not available** — DB layer is `Deferred`.

**Steps:**

1. After a completed exchange, read the reissued offer's stored price fields.
2. Compare them against the fare difference and against the new flight's total.

**Expected Result:** The stored prices are the **differences**, not the total actual flight prices.

**Priority:** P1

**Tags:** DB, Positive, Boundary

**Notes:** Covers AC-26, story §5 AC-5, edge case 5.14. **Discovery: NOT TESTABLE** — DB is `Deferred`, no read-only access supplied (**OQ-9**, **DS-3**). **Declared Gap on the run manifest and in the Final QA Report.** The amount can be inferred from the displayed figures but not proved.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-087 — TT_FLIGHT_BOOK carries IS_AUTO_REISSUE identifying a Reissue offer

**Objective:** Verify the schema addition.

**Preconditions:** Read-only DB access.

**Test Data:** **Not available.**

**Steps:**

1. Confirm the `IS_AUTO_REISSUE` column exists on `TT_FLIGHT_BOOK`.
2. Read its value on a reissued offer and on an ordinary booking.

**Expected Result:** The column exists and correctly identifies which offers are Reissue offers.

**Priority:** P2

**Tags:** DB, Schema, Positive

**Notes:** Covers AC-30, story §5 AC-9. **Discovery: NOT TESTABLE** — a schema assertion with **no UI surface at all**; DB `Deferred` (**OQ-9**, **DS-3**). Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-088 — The Reissue change fee is stored as a Service Charge

**Objective:** Verify the fee's storage classification.

**Preconditions:** A completed exchange on an organisation with a configured exchange fee.

**Test Data:** The clean reissued booking; its 114 change fee. **Configure the exchange fee and the service charge to different values first** so the two cannot be confused.

**Steps:**

1. After the exchange, read the change fee as recorded against the reissued booking — through the breakdown, the invoice, and Finance/Statement reports.
2. Confirm it is recorded as a Service Charge and carries the configured fee amount.

**Expected Result:** The Reissue change fee is stored as a **Service Charge**, at the configured amount × passenger count.

**Priority:** P1

**Tags:** E2E, Positive, Calculation

**Notes:** Covers AC-31, story §5 AC-10, edge cases 5.15 and 9.3. **Discovery: OBSERVED-DEFECT.** A finding is open: the change fee disappears from its own field and its value reappears in `serviceCharges` — the right value filed under the wrong heading. **The story requires it stored as a Service Charge, so this case and that finding are subtly different claims**; a product ruling on which field is authoritative would settle it. Confirming at the offer level also needs the fee and the service charge set to different values, which they are not today.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-089 — No Service Charge is created when no change fee exists

**Objective:** Verify the negative side of fee storage.

**Preconditions:** An organisation with no exchange fee configured, and a completed exchange.

**Test Data:** **OQ-8**.

**Steps:**

1. Complete an exchange on an organisation with no fee configured.
2. Read the recorded service charges against the reissued booking.

**Expected Result:** **No incorrect Service Charge is created.** The reissued booking carries no change fee and no service charge derived from one.

**Priority:** P2

**Tags:** E2E, Negative

**Notes:** Covers edge case 5.16. **Discovery: NOT TESTABLE** — **OQ-8**. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-090 — The Sync action is not available on a Reissue offer

**Objective:** Verify the Sync prohibition — a negative check only.

**Preconditions:** A reissued booking and an ordinary booking, both on the Itinerary.

**Test Data:** `NDCEG-BR-F260930Vrf576` (reissued) and an ordinary booked booking as the control.

**Steps:**

1. Open the **Itinerary** for the reissued offer and list every available action.
2. Open the Itinerary for an ordinary booking and list its actions.
3. Compare: is Sync present on the ordinary booking and absent on the reissue?

**Expected Result:** The Sync action is **not available** for the Reissue offer, while remaining available where it normally would be. **Sync itself is never exercised — only its absence is asserted** (DS-5).

**Priority:** P1

**Tags:** Atomic, Negative

**Notes:** Covers AC-28, story §5 AC-7, edge case 5.17, DS-5. **Discovery: NOT EXECUTED.** Discovery established this **cannot** be tested on PNR Query — that screen offers Void, Manual Reissue and Refund and **no Sync action at all**, on reissued and ordinary bookings alike, so absence there proves nothing. The case is therefore anchored on the Itinerary, where Sync exists. Runnable on held data.

**Review:** Pending

**Automation:** Pending

---

## 9. Booking Confirmation and E-ticket

Story §6 · AC-32 · edge cases 6.1–6.8

### TC-RFLOW-091 — A successful Reissue displays the new booking and E-ticket information

**Objective:** Verify the confirmation represents the reissued offer.

**Preconditions:** A completed exchange performed by the human.

**Test Data:** The clean reissued booking.

**Steps:**

1. After the exchange, read the Booking Confirmation page.
2. Confirm it shows the new booking reference, the new flight, every passenger, and the E-ticket information.
3. Confirm the data belongs to the **new** offer, not the original.

**Expected Result:** The new Reissue booking information and the applicable E-ticket information are displayed, and all of it belongs to the newly reissued offer.

**Priority:** P1

**Tags:** E2E, Positive, Smoke

**Notes:** Covers AC-32, story §6 AC-1 and AC-3, edge case 6.1. **Discovery: OBSERVED-DEFECT** on the ticket information — findings are open on blank ticket numbers and on the fare details not summing. The booking identity itself was correct. **This case asserts the story's requirement.**

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-092 — The confirmation follows the agreed Reissue-specific UI

**Objective:** Verify design conformance.

**Preconditions:** A completed exchange, and the agreed Reissue-specific design.

**Test Data:** **No design reference exists** — the user confirmed on 2026-09-28 that there is no design document.

**Steps:**

1. Open the Booking Confirmation for a reissued offer.
2. Compare it against an ordinary booking's confirmation.
3. Record what is Reissue-specific.

**Expected Result:** **Pending Confirmation.** The story requires the confirmation follow "the agreed Reissue-specific UI". No design artifact was ever supplied and the user has confirmed none exists, so there is nothing to check conformance against. The case records what the screen does; the expected result is fixed only if a design is supplied (**OQ-13**).

**Priority:** P2

**Tags:** Atomic, UI

**Notes:** Covers AC-32, story §6 AC-2. **Discovery: PENDING CONFIRMATION** — **OQ-13**. Declared Gap. Note the platform-wide oracle decision: with no design, the implemented UI is the source of truth, which makes design conformance unfalsifiable here by construction.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-093 — A Not Booked Reissue is not shown as a successful ticketed Reissue

**Objective:** Verify the confirmation does not overstate a failure.

**Preconditions:** A Reissue in Not Booked state.

**Test Data:** **OQ-10**.

**Steps:**

1. Reach the confirmation for a Not Booked Reissue.
2. Read what the page presents.

**Expected Result:** The transaction is **not** displayed as a successful ticketed Reissue.

**Priority:** P1

**Tags:** E2E, Negative, Boundary

**Notes:** Covers edge case 6.2. **Discovery: NOT TESTABLE** — **OQ-10**. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-094 — A Booking Fail Reissue shows the failed status

**Objective:** Verify the failure is stated plainly.

**Preconditions:** A Reissue in Booking Fail state.

**Test Data:** **OQ-10**.

**Steps:**

1. Reach the confirmation for a Booking Fail Reissue.
2. Read the status presented and how the flight is described.

**Expected Result:** The appropriate failed status is displayed and the flight is **not** represented as successfully reissued.

**Priority:** P1

**Tags:** E2E, Negative

**Notes:** Covers edge case 6.3. **Discovery: NOT TESTABLE** — **OQ-10**. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-095 — A booking reference without an E-ticket is not presented as final

**Objective:** Verify partial states are labelled honestly.

**Preconditions:** A Reissue where the booking succeeded but the E-ticket is not yet available.

**Test Data:** **OQ-10**; may occur naturally under supplier delay.

**Steps:**

1. Reach the confirmation in this state.
2. Read what is shown for booking status and for ticket information.

**Expected Result:** The booking status is displayed, and **incomplete ticket information is not presented as final**.

**Priority:** P1

**Tags:** E2E, Negative, Boundary

**Notes:** Covers edge case 6.4. **Discovery: OBSERVED-DEFECT** in substance — the known blank-ticket-number behaviour is exactly this state rendered as though complete. A finding is open. **This case states the requirement.**

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-096 — A failed E-ticket retrieval preserves the successful booking status

**Objective:** Verify a retrieval failure does not corrupt the booking state.

**Preconditions:** A successful Reissue whose E-ticket retrieval fails.

**Test Data:** **OQ-10**.

**Steps:**

1. Reach the confirmation where E-ticket retrieval fails.
2. Read the booking status and whether the ticket can be retried.

**Expected Result:** The successful booking status is preserved and the ticket information can be retrieved or retried according to existing booking behaviour.

**Priority:** P2

**Tags:** E2E, Negative, Error Handling

**Notes:** Covers edge case 6.5. **Discovery: NOT TESTABLE** — **OQ-10**. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-097 — Confirmation data never belongs to a different booking reference

**Objective:** Verify identity consistency on the confirmation.

**Preconditions:** A completed exchange.

**Test Data:** Both held reissued bookings.

**Steps:**

1. Read the booking reference shown on the confirmation.
2. Confirm every other datum on the page — flight, passengers, amounts, ticket numbers — belongs to that reference.

**Expected Result:** No mismatched booking information is displayed. All data is retrieved from the correct Reissue offer.

**Priority:** P1

**Tags:** E2E, Positive, Boundary

**Notes:** Covers edge case 6.6. **Discovery: NOT EXECUTED** as a deliberate identity check, though no mismatch was seen incidentally. Runnable on held data.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-098 — Refreshing the confirmation does not create a second Reissue

**Objective:** Verify idempotence at the confirmation step.

**Preconditions:** A completed exchange with the confirmation open.

**Test Data:** Any completed reissue; **the human performs the original exchange**.

**Steps:**

1. With the confirmation open after a completed exchange, refresh the page.
2. Read the booking reference and count the Reissue transactions for the original booking.

**Expected Result:** The existing Reissue transaction is retrieved. **No new Reissue is created** and no second booking appears.

**Priority:** P1

**Tags:** E2E, Negative, Boundary

**Notes:** Covers edge case 6.7. **Discovery: NOT EXECUTED** — runnable on an already-completed reissue with no risk, since refreshing does not initiate a charge.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-099 — Opening the old booking from the confirmation keeps it Reissued

**Objective:** Verify the original is not re-activated by navigation.

**Preconditions:** A completed exchange.

**Test Data:** `NDCEG-BR-F260930LAlLPj`.

**Steps:**

1. From the confirmation or history, open the original booking.
2. Read its status and the actions offered.

**Expected Result:** The old booking retains its **Reissued** status and relationship, and is not treated as a new active Reissue transaction.

**Priority:** P2

**Tags:** E2E, Positive, Boundary

**Notes:** Covers edge case 6.8, and overlaps TC-RFLOW-015. **Discovery: PARTIAL** — the Reissued status was confirmed; navigation from the confirmation specifically was not traced.

**Review:** Pending

**Automation:** Pending

---

## 10. Itinerary — the Auto Reissue History component

Story §7 · AC-33 · edge cases 7.1–7.9

### TC-RFLOW-100 — The Itinerary carries an Auto Reissue History component

**Objective:** Verify the new component exists.

**Preconditions:** A reissued booking open on the Itinerary.

**Test Data:** `NDCEG-BR-F260930LAlLPj`.

**Steps:**

1. Open the Itinerary for a booking that has been reissued.
2. Locate the Auto Reissue History component and record its columns.

**Expected Result:** A dedicated Auto Reissue History component is present in the Itinerary.

**Priority:** P1

**Tags:** Atomic, Positive, Smoke

**Notes:** Covers AC-33, story §7 AC-1. **Discovery: NOT EXECUTED** on the Itinerary specifically — the equivalent component was captured on PNR Query, where it carries Date · Action · Lead Pax · From · To · Ticket · Booking Ref · Amount. The Itinerary component was never opened. Runnable on held data.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-101 — The history shows the Reissue records for the current flight only

**Objective:** Verify scoping to the current flight.

**Preconditions:** A reissued booking, and another reissued booking on the same agency.

**Test Data:** Both held reissued bookings.

**Steps:**

1. Open the Auto Reissue History on one booking and record every row.
2. Confirm no row belongs to a different flight or booking.

**Expected Result:** Only the Auto Reissue history associated with the **current flight** is displayed. History belonging to other bookings never appears.

**Priority:** P1

**Tags:** Atomic, Positive, Boundary

**Notes:** Covers AC-33, story §7 AC-2, §7.5. **Discovery: NOT EXECUTED** on the Itinerary. Runnable on held data.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-102 — A flight with no Reissue history shows an empty state, not an error

**Objective:** Verify the empty case.

**Preconditions:** A booking never reissued.

**Test Data:** `NDCEG-BR-F260926PwYMR2`.

**Steps:**

1. Open the Itinerary for a booking with no Reissue history.
2. Read the Auto Reissue History component.

**Expected Result:** An appropriate **empty state** is displayed rather than an error or a blank region.

**Priority:** P2

**Tags:** Atomic, Negative, UI

**Notes:** Covers edge case 7.1. **Discovery: NOT EXECUTED** on the Itinerary. The PNR Query equivalent shows *"No data has been found!"*, so an empty state exists in that family of components. Runnable on held data.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-103 — A flight with one Reissue shows exactly one Reissue record

**Objective:** Verify the count is right on the simplest case.

**Preconditions:** A booking reissued exactly once.

**Test Data:** `NDCEG-BR-F260930LAlLPj` — reissued once.

**Steps:**

1. Open the Auto Reissue History.
2. Count the rows and identify each row's Action.

**Expected Result:** The corresponding Reissue record is displayed. A booking reissued **once** shows one Reissue row — alongside the original-booking row where the component includes it.

**Priority:** P1

**Tags:** Atomic, Positive, Boundary

**Notes:** Covers edge case 7.2. **Discovery: OBSERVED-DEFECT.** A finding is open where Reissue History reads "2 Reissues" after a single exchange — the component counting rows rather than reissues. On PNR Query the clean booking correctly showed two rows, one `Original booking` and one `Reissue`. **This case asserts the correct count.**

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-104 — A flight reissued more than once shows every Reissue record

**Objective:** Verify multiple reissues accumulate correctly.

**Preconditions:** A booking reissued twice or more.

**Test Data:** To be produced — requires a second exchange on an already-reissued booking, performed by the human (**OQ-7**).

**Steps:**

1. On a booking reissued more than once, open the Auto Reissue History.
2. Confirm every Reissue appears, in order, each with its own reference and amount.

**Expected Result:** All applicable Auto Reissue history records are displayed in the component.

**Priority:** P2

**Tags:** E2E, Positive, Boundary

**Notes:** Covers edge case 7.3. **Discovery: NOT TESTABLE** — no multiply-reissued booking exists, and producing one requires a second human-performed exchange. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-105 — The history makes the original-to-reissue relationship visible

**Objective:** Verify the relationship is legible, not merely stored.

**Preconditions:** A reissued booking.

**Test Data:** `NDCEG-BR-F260930LAlLPj` → `NDCEG-BR-F260930Vrf576`.

**Steps:**

1. Open the Auto Reissue History on the **original** booking and locate the link to the new one.
2. Open the Auto Reissue History on the **new** booking and look for a link back to the original.

**Expected Result:** The relationship between the original and the reissued offer is displayed, and the user can move between them.

**Priority:** P1

**Tags:** Atomic, Positive, Boundary

**Notes:** Covers AC-27, AC-33, story §7 AC-3, edge case 7.9. **Discovery: PARTIAL, and an open question.** On PNR Query the history is populated **only on the original**; the reissued booking's own history reads *"No data has been found!"* — there is no path back. Whether the backward link is required is **OQ-F3**, unruled. Step 2's expected result is Pending Confirmation.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-106 — A failed Reissue does not mark the original as Reissued in the Itinerary

**Objective:** Verify the Itinerary reflects failure honestly.

**Preconditions:** A Reissue that failed.

**Test Data:** **OQ-10**.

**Steps:**

1. After a failed Reissue, open the original booking's Itinerary.
2. Read its status and its Auto Reissue History.

**Expected Result:** The original booking is **not** incorrectly marked Reissued. The history retains the transaction according to its actual status without presenting it as a completed Reissue.

**Priority:** P1

**Tags:** E2E, Negative, Boundary

**Notes:** Covers edge cases 7.5 and 7.6. **Discovery: NOT TESTABLE** — **OQ-10**. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-107 — A further Reissue cannot be initiated from an already-Reissued original

**Objective:** Verify the lifecycle prevents reissuing a retired offer.

**Preconditions:** A booking whose status is `Reissued`.

**Test Data:** `NDCEG-BR-F2609294YODAr`.

**Steps:**

1. Open the Reissued original, locked as the current user.
2. Attempt to initiate Reissue from it.

**Expected Result:** Inappropriate duplicate Reissue initiation from the old, already-reissued source is **prevented** according to the Reissue lifecycle.

**Priority:** P1

**Tags:** Atomic, Negative, Boundary

**Notes:** Covers edge case 7.7, overlaps TC-RFLOW-015. **Discovery: NOT EXECUTED** — runnable on held data with no risk, since the assertion is that the flow cannot start.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-108 — A history that fails to load leaves the Itinerary usable

**Objective:** Verify graceful degradation.

**Preconditions:** A state where the history component's data cannot be loaded.

**Test Data:** **OQ-10**; network interruption may suffice.

**Steps:**

1. Open the Itinerary with the history endpoint failing.
2. Read whether the rest of the Itinerary remains usable and what the component shows.

**Expected Result:** The main Itinerary remains usable where possible; the history component shows an appropriate loading or error state and offers retry.

**Priority:** P3

**Tags:** Atomic, Negative, Error Handling

**Notes:** Covers edge case 7.8. **Discovery: NOT TESTABLE** — needs controlled failure, **OQ-10**. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-109 — Itinerary flight times match the supplier's own times

**Objective:** Verify the Itinerary renders times correctly, independent of the browser.

**Preconditions:** A booking whose supplier segment times are known.

**Test Data:** Any held booking with a captured supplier `getBooking`. Browser time zone set to UTC, Africa/Cairo and Asia/Dubai in turn.

**Steps:**

1. Read the supplier's segment departure and arrival times for the booking.
2. Open the Itinerary with the browser at UTC and read the displayed times.
3. Repeat with the browser at Africa/Cairo, then Asia/Dubai.
4. Compare all three against the supplier and against the reissue results grid.

**Expected Result:** The Itinerary displays the supplier's times, and they **do not change with the browser's time zone**.

**Priority:** P1

**Tags:** Atomic, Positive, Boundary

**Notes:** Covers story §7 general correctness and **FINDING-R01**, which is open in this scope: the Itinerary renders departures two hours later than the supplier's own PNR, while supplier and core agree and the reissue results grid and confirmation render the same values correctly. **Discovery: OBSERVED-DEFECT.** The cross-zone step has never been run, which is what would demonstrate the mechanism. *(This case asserts the correct behaviour; the cross-zone step is the unrun half.)*

**Review:** Pending

**Automation:** Pending

---

## 11. PNR Query

Story §8 · AC-34, AC-36 · edge cases 8.1–8.9

### TC-RFLOW-110 — PNR Query contains a Reissue History section

**Objective:** Verify the section exists and carries the agreed columns.

**Preconditions:** A reissued booking.

**Test Data:** PNR `TTDMXL`.

**Steps:**

1. Open Admin → PNR Query, search by PNR with Search About = Itinerary Details.
2. Locate the Reissue History section and record its columns.

**Expected Result:** A Reissue History section is present, carrying **Date · Action · Lead Pax · From · To · Ticket · Booking Ref · Amount**.

**Priority:** P1

**Tags:** Atomic, Positive, Smoke

**Notes:** Covers AC-34, story §8 AC-1. **Discovery: EXECUTED** (run-009). Columns captured in `evidence/r009-pnrquery-observations.md`.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-111 — A ticketed Reissue is displayed in the History section

**Objective:** Verify the ticketed reissue appears with its relationship.

**Preconditions:** A completed, ticketed Reissue.

**Test Data:** PNR `TTDMXL`.

**Steps:**

1. Search the PNR and read the Reissue History rows.
2. Confirm one row is the original booking and one is the Reissue, each with its own booking reference, ticket and amount.

**Expected Result:** The ticketed Reissue is displayed in the History section, and the relationship **Original Booking → Reissued Booking** is preserved and legible.

**Priority:** P1

**Tags:** Atomic, Positive

**Notes:** Covers AC-34, story §8 AC-2 and AC-3, edge case 8.2. **Discovery: EXECUTED** (run-009). Observed exactly: two rows, `Original booking` and `Reissue`, with references, tickets and amounts.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-112 — A booking with no Reissue history shows an empty state

**Objective:** Verify the empty case on PNR Query.

**Preconditions:** A booking never reissued.

**Test Data:** `NDCEG-BR-F260926PwYMR2`.

**Steps:**

1. Search the PNR of a never-reissued booking.
2. Read the Reissue History section.

**Expected Result:** An appropriate empty state is displayed.

**Priority:** P2

**Tags:** Atomic, Negative, UI

**Notes:** Covers edge case 8.1. **Discovery: EXECUTED** (run-009) — the reissued booking's own history section shows *"No data has been found!"*, confirming the empty state renders.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-113 — An unticketed Reissue is not displayed as ticketed

**Objective:** Verify the history distinguishes ticketed from not.

**Preconditions:** A Reissue that is not ticketed.

**Test Data:** The broken booking `RPTIYO`, whose Reissue row carries `Ticket: N/A`.

**Steps:**

1. Search the PNR of a booking whose reissue did not ticket cleanly.
2. Read the Reissue History row's `Ticket` column and how the row is presented.
3. Compare against the clean booking, where the column carries a real ticket number.

**Expected Result:** An unticketed Reissue is **not** incorrectly displayed as a ticketed Reissue. The story requires only ticketed Reissue records appear in this section.

**Priority:** P1

**Tags:** Atomic, Negative, Boundary

**Notes:** Covers edge case 8.4, story §8.6. **Discovery: OBSERVED-DEFECT.** Run-009 found the row **is** displayed with `Ticket: N/A` rather than withheld or flagged — and the same booking's passenger list shows `N/A` for all six where the supplier holds live tickets for five. Findings are open. **This case states the story's requirement**, and the `Ticket` column is the signal that makes it checkable.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-114 — Querying the original booking shows its Reissued status and relationship

**Objective:** Verify the original resolves correctly.

**Preconditions:** A reissued booking.

**Test Data:** `NDCEG-BR-F260930LAlLPj` via Booking Ref.

**Steps:**

1. Search PNR Query by the **original** booking reference.
2. Read its status and its Reissue History.

**Expected Result:** The original booking is shown with its **Reissued** status and its relationship to the new booking, and is not treated as the current active booking.

**Priority:** P1

**Tags:** Atomic, Positive

**Notes:** Covers edge case 8.5, AC-29. **Discovery: EXECUTED** (run-009). Both bookings return stacked, original marked `Reissued` and new marked `Booked`.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-115 — Querying the new booking shows its relationship to the original

**Objective:** Verify the reverse direction.

**Preconditions:** A reissued booking.

**Test Data:** `NDCEG-BR-F260930Vrf576` via Booking Ref.

**Steps:**

1. Search PNR Query by the **new** booking reference.
2. Read its details and look for its relationship to the original.

**Expected Result:** **Pending Confirmation.** The story requires the new booking's information and its relationship to the original to be displayed. **Observed: the reissued booking's own Reissue History is empty** — the relationship is recorded only on the original. Whether the backward link is required is **OQ-F3**.

**Priority:** P1

**Tags:** Atomic, Positive, Boundary

**Notes:** Covers edge case 8.6, AC-27. **Discovery: PENDING CONFIRMATION** — **OQ-F3**, raised by run-009. The finding on the missing backward link is open.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-116 — PNR Query opened immediately after an Exchange shows current data

**Objective:** Verify no stale read straight after the exchange.

**Preconditions:** A freshly completed exchange.

**Test Data:** The next human-performed exchange.

**Steps:**

1. Immediately after the human completes an exchange, open PNR Query on the GDS PNR.
2. Read the status of both bookings and the Reissue History.

**Expected Result:** The latest Reissue status and history are retrieved. **Stale booking information is not displayed.**

**Priority:** P2

**Tags:** E2E, Positive, Timing

**Notes:** Covers edge case 8.8. **Discovery: NOT EXECUTED** — the held bookings were queried well after their exchanges. Runnable on the next exchange.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-117 — Reissue history never shows an unrelated booking

**Objective:** Verify relationship integrity.

**Preconditions:** Several reissued bookings on the same agency.

**Test Data:** Both held reissued bookings.

**Steps:**

1. Query each reissued PNR in turn.
2. Confirm every history row belongs to that PNR's own original/reissue pair.

**Expected Result:** Unrelated bookings are **never** silently displayed as Reissue history. The relationship is validated and correctly persisted.

**Priority:** P1

**Tags:** Atomic, Negative, Boundary

**Notes:** Covers edge case 8.7. **Discovery: NOT EXECUTED** as a deliberate cross-check, though no contamination was seen incidentally. Runnable on held data.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-118 — Existing PNR Query behaviour is unchanged apart from the Reissue History addition

**Objective:** Verify the rest of the screen still works as before.

**Preconditions:** Baseline knowledge of PNR Query's structure.

**Test Data:** An ordinary booking and a reissued booking.

**Steps:**

1. On an ordinary booking, exercise each PNR Query control: Search About (Itinerary Details · Agency Information) and Get Itinerary Details By (PNR · Ticket No. · Booking Ref.).
2. Confirm each block renders: Lock Info · Agency User Info · Payment Info · Flight Info · Booking Info · Flight Legs · Passenger List · actions · Comments.
3. Repeat on a reissued booking.

**Expected Result:** Existing PNR Query behaviour is unchanged. The only difference on a reissued booking is the populated Reissue History section.

**Priority:** P2

**Tags:** Atomic, Positive

**Notes:** Covers AC-36, story §8 AC-4 and §8.9, edge case 8.9. **Discovery: EXECUTED** (run-009) — the full structure is captured in `evidence/r009-pnrquery-observations.md` as the baseline. *(This asserts the story's "unchanged" requirement against a captured baseline; it is not a defect-regression case.)*

**Review:** Pending

**Automation:** Pending

---

## 12. Reports — the affected-area review

Story §9 · AC-35, AC-36 · edge cases 9.1–9.9

> **The fourteen reports are enumerated in `discovery/evidence/r009-reports-sweep.md`** with their
> filters. That table is the baseline these cases assert against.

### TC-RFLOW-119 — A Wallet-paid Reissue appears correctly in the Wallet reports

**Objective:** Verify the wallet transaction is represented.

**Preconditions:** A Reissue paid from the wallet.

**Test Data:** The clean reissued booking, agency AGN10030.

**Steps:**

1. Note the wallet balance before and after the exchange, and the agreed payable amount.
2. Open Agency Wallet Report and Wallet History Report for the agency and period.
3. Locate the Reissue transaction and read its amount.

**Expected Result:** The Reissue wallet transaction appears in the wallet reports, and **the amount debited equals the amount the user agreed to pay**.

**Priority:** P1

**Tags:** E2E, Positive, Calculation

**Notes:** Covers AC-35, edge case 9.1. **Discovery: OBSERVED-DEFECT.** A finding is open: the wallet is debited the rounded figure, not the agreed one — 3,977.00 against an agreed 3,976.88, always in the agency's disfavour. **This case asserts the requirement.** Neither wallet report was run against the test bookings in discovery.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-120 — The Reissue change fee appears as a Service Charge in the financial reports

**Objective:** Verify the fee's representation downstream.

**Preconditions:** A completed Reissue with a configured change fee.

**Test Data:** The clean reissued booking. **Set the exchange fee and the service charge to different values first**, so the two are distinguishable.

**Steps:**

1. Open Finance Report and Statement Report for the branch, agency and period.
2. Locate the Reissue transaction and read its service-charge component.
3. Compare against the configured exchange fee × passenger count.

**Expected Result:** The change fee is represented as a **Service Charge** in the financial and reporting data, at the configured amount × passenger count.

**Priority:** P1

**Tags:** E2E, Positive, Calculation

**Notes:** Covers AC-31, AC-35, edge case 9.3. **Discovery: NOT EXECUTED** — Finance and Statement reports were opened and their filters captured but never run against the test bookings. Blocked from a clean read until the fee and the service charge differ (see TC-RFLOW-088).

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-121 — A Banque Masr Reissue payment is reflected per existing payment reporting

**Objective:** Verify the alternate payment method reaches the reports.

**Preconditions:** A Reissue paid via Banque Masr.

**Test Data:** **Not available** — every completed exchange used the wallet, and completing a card payment is Forbidden for the platform (D-1).

**Steps:**

1. After a human-performed Banque Masr payment, open the financial reports for the period.
2. Locate the Reissue transaction and read its payment method and amount.

**Expected Result:** The payment is reflected according to the existing payment and reporting behaviour.

**Priority:** P2

**Tags:** E2E, Positive

**Notes:** Covers AC-21, AC-35, edge case 9.2. **Discovery: NOT TESTABLE** — no Banque Masr Reissue payment exists and the platform may not make one. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-122 — A failed or unbooked Reissue is not reported as a completed booking

**Objective:** Verify failures do not inflate the reports.

**Preconditions:** A Reissue in Booking Fail or Not Booked state.

**Test Data:** **OQ-10**.

**Steps:**

1. After a failed Reissue, run Sales Report, Booking Report and Finance Report for the period.
2. Look for the failed Reissue.

**Expected Result:** The reports do **not** represent the failed Reissue as a completed successful booking. The transaction retains its actual status.

**Priority:** P1

**Tags:** E2E, Negative, Boundary

**Notes:** Covers edge cases 9.4 and 9.5. **Discovery: NOT TESTABLE** — **OQ-10**. Declared Gap.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-123 — Reports using booking status reflect the original's Reissued status

**Objective:** Verify status propagation into reporting.

**Preconditions:** A completed Reissue.

**Test Data:** `NDCEG-BR-F260930LAlLPj`.

**Steps:**

1. Run the reports that expose booking status — Booking Report and Total Due Report — for the period.
2. Locate the original booking and read its status.

**Expected Result:** Reports that use booking status show the original as **Reissued**, per the Reissue lifecycle.

**Priority:** P2

**Tags:** E2E, Positive

**Notes:** Covers AC-29, AC-35, edge case 9.6. **Discovery: NOT EXECUTED** — these reports were opened but not run against the test bookings.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-124 — A difference-based Reissue price is not reported as a total selling price

**Objective:** Verify report consumers do not misread the stored difference.

**Preconditions:** A completed Reissue whose difference and new-flight total are both known.

**Test Data:** The clean reissued booking — difference and change fee known.

**Steps:**

1. Run Sales Report, Finance Report and Daily Sales Report for the period.
2. Read the amount recorded against the Reissue.
3. Compare it against the fare difference, the change fee, and the new flight's full price.

**Expected Result:** The reported amount is interpreted correctly — a stored Reissue **difference** is never presented as the total flight selling price.

**Priority:** P1

**Tags:** E2E, Positive, Calculation, Boundary

**Notes:** Covers AC-26 context, AC-35, edge case 9.7. **Discovery: OBSERVED-DEFECT / OPEN QUESTION.** Run-009 found Sales Report carries the original and the reissue as adjacent, indistinguishable rows at their full amounts — 348,235.19 and 410,755.19 — totalling 758,990.38 for one journey sold once and changed once. Whether gross-value counting is intended is **OQ-F2**, unruled. The expected result is fixed when that question is answered.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-125 — The original-to-reissue relationship is traceable from report identifiers

**Objective:** Verify a report row can be tied back to the pair.

**Preconditions:** A completed Reissue.

**Test Data:** The clean reissued booking; invoices `INVNDC260930fBOeIH` and `INVNDC260930pt1thF`.

**Steps:**

1. Run a report that exposes the Reissue and note its identifiers — invoice number, order id, booking reference where available.
2. Using only those identifiers, attempt to reach both the original and the reissued booking.

**Expected Result:** The original/reissued relationship remains traceable using the available booking, order or payment identifiers.

**Priority:** P2

**Tags:** E2E, Positive, Boundary

**Notes:** Covers edge case 9.8, AC-27. **Discovery: PARTIAL.** Traceable in principle — Total Due is the only report filterable by Booking Reference; the rest require going via the invoice number. No report carries a Reissue indicator (**OQ-F1**).

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-126 — A Reissue transaction is never silently missing from the reports

**Objective:** Verify no transaction disappears.

**Preconditions:** A completed Reissue with a known amount and date.

**Test Data:** Both held reissued bookings.

**Steps:**

1. For each of the fourteen reports, run it for the branch, agency and period covering the Reissue.
2. Record whether the Reissue transaction appears, and under what identifier.
3. Where it does not appear, establish whether the report is simply out of that transaction's scope.

**Expected Result:** Every report whose subject covers the transaction shows it, or its absence is explicable by the report's scope. Traceability is preserved through the booking, payment and financial records; **no silent loss occurs**.

**Priority:** P1

**Tags:** E2E, Positive, Boundary

**Notes:** Covers AC-35, edge case 9.9. **Discovery: PARTIAL** — only Sales Report was run end to end; the other thirteen were opened and their filters captured. This case is the systematic sweep discovery deliberately left to execution.

**Review:** Pending

**Automation:** Pending

### TC-RFLOW-127 — Existing report behaviour is unchanged apart from the Reissue transactions appearing

**Objective:** Verify the reports themselves still work as before.

**Preconditions:** The captured baseline of all fourteen reports.

**Test Data:** Any branch and period with ordinary bookings.

**Steps:**

1. Open each of the fourteen reports and confirm its filters match the captured baseline.
2. Run each against a period containing only ordinary bookings and confirm it returns and renders normally.

**Expected Result:** Existing Reports behaviour is unchanged. The only Reissue effect is that Reissue transactions appear in the reports whose subject covers them.

**Priority:** P2

**Tags:** Atomic, Positive

**Notes:** Covers AC-36. **Discovery: EXECUTED** for structure (run-009) — all fourteen loaded and their filters were captured as the baseline in `evidence/r009-reports-sweep.md`. *(This asserts the story's "unchanged" requirement against that baseline; it is not a defect-regression case.)*

**Review:** Pending

**Automation:** Pending
