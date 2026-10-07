# Coverage Report — Reissue Flow Test Design

| Field | Value |
|---|---|
| Scope | `reissue-flow` (business feature) |
| Suite | `TestCases_ReissueFlow.md` Revision 7 (2026-10-04 — the twenty-one new cases collected into §13; `AC-37` added to the story; nine cases from DS-7; seven open questions answered; DS-6 settled; OQ-12 closed) |
| Total cases | 148 |
| Generated | 2026-09-30 |
| Status | **Approved** — Mohamed Soliman, 2026-10-04 (Stage 3 Human Review gate held). Discovery (`QA_Assessment_Report.md`) and the upstream `reissue-mapping` artifacts remain **Pending Review** |

## 1. The direct answer — what can actually be run

| State | Count | Share |
|---|---|---|
| **Executed in Discovery and behaving** | 28 | 19% |
| **Observed and failing** — a finding is open; the case states the requirement | 13 | 9% |
| **Partially executed** — positive path only | 18 | 12% |
| **Not executed** — runnable today with held data and access | 40 | 27% |
| **Not testable** — no data or access exists; Declared Gap | **47** | **32%** |
| **Pending Confirmation** — steps known, expected result unruled | 2 | 1% |

**99 of 148 cases can be run today** without anything new (executed, observed, partial, not-executed).
**47 cannot be run at all.** **2 can be run but not judged** — down from 3 on 2026-10-04, when **DS-6 was settled by `PO-16`** and TC-RFLOW-004 gained a fixed expected result.

*(Revision 3 added twelve cases: nine runnable, two not testable, one partial. **The five
inactive-airport cases are counted as runnable on the assumption that administration access to the
airport active/inactive flag is held in the test environment.** If it is not, they become Declared
Gaps and the runnable figure falls to 84.)*

## 1.1 Seven open questions answered — 2026-10-04, and what it actually buys

**The user answered OQ-3, 7, 8, 9, 10, 11 and 13 in one pass.** On paper that addresses 46 of the 45
remaining Not-Testable cases. **In practice almost none of them have moved yet, and two will not move
all the way.** The figures above are deliberately unchanged except for the three cases that needed
nothing supplied.

| # | Answer | Cases | Reality |
|---|---|---|---|
| **OQ-3** | The platform runs the whole flow, the user pays | *all* | **Permission given, artifact missing.** run-009 has no `SafetyAuthorizations.md`. **Nothing executes until one exists** |
| **OQ-7** | Bookings will be supplied | 9 | Committed, **not delivered** |
| **OQ-8** | Unconfigured-fee scenario will be supplied | 4 | Committed, not delivered |
| **OQ-9** | DB credentials will be supplied | 6 | Committed. Credentials never enter this repo; the frozen DB layer is lifted by `scope-change`, not by hand |
| **OQ-10** | Cannot force failures, but **real failed bookings** will be supplied | part of 21 | **Opens the *outcome* assertions read-only. Does not open *during-the-failure* behaviour** — retry, duplicate submission, late response. A failed booking shows the end state, not the sequence |
| **OQ-11** | Low-balance wallet will be supplied | 2 | Committed, not delivered |
| **OQ-13** | A **screenshot of the current build** | 1 | **Not an oracle.** The app cannot fail a comparison against a picture of itself. Recorded as a visual-regression baseline; AC-32's design half **stays a Declared Gap** |

**What moved today, and only this:** TC-RFLOW-002, 003 and 004 — reclassified NOT TESTABLE → NOT
EXECUTED because they never needed supplied data. `PO-25` records run-006 toggling an organisation's
own Auto Reissue checkbox on a booking it already held and watching the button follow. Not Testable
falls 47 → 45.

**The two that will not fully close.** OQ-10 and OQ-13 are *partial* answers, and the Final QA Report
should say so rather than counting them as resolved: part of the failure surface stays unreproducible,
and the Reissue confirmation's design conformance has no oracle unless a design is produced or that
clause of AC-32 is withdrawn.

## 2. The headline a reviewer needs

**The positive path is well covered. The failure behaviour is almost entirely unverified.**

Every case that cannot run is a *negative*, a *boundary*, or a *failure* case. Nothing blocked is
cosmetic:

| What cannot be tested | Cases | Why |
|---|---|---|
| Every supplier/system failure path — Not Booked, Booking Fail, timeouts, duplicate submission, missing reference, late response | 21 | No stub or fault injection on Sabre Staging (**OQ-10**) |
| Every configuration negative — disabled Branch, disabled Agency, flag precedence, offline booking, unlisted supplier | 11 | Test data not supplied (**OQ-7**) |
| The unconfigured exchange fee | 4 | Shared master data; needs a third org or an approved revert (**OQ-8**) |
| The Price Changed popup, entirely | 6 | A supplier reprice cannot be forced — **confirmed 2026-10-04 (D-15): it is supplier behaviour the platform does not control.** No longer an open question; **accepted as untested** |
| The insufficient wallet | 2 | No low-balance test wallet (**OQ-11**) |
| Both DB assertions | 2 | DB layer `Deferred`, no access (**OQ-9**) |
| A real supplier penalty; a non-Economy cabin | 2 | Never observed at anything but zero / Economy |
| The fare-hold countdown against a **shorter** supplier validity; a payment submitted at the instant of expiry | 2 | No offer with a sub-15-minute `validUntil` has been seen, and the expiry race needs a human-performed payment timed to the second (**CN-21**) |

**A suite that passes every runnable case would still tell you nothing about how this feature fails.**
That is the single most important thing on this page.

## 3. Acceptance Criteria coverage

All **37** Overall ACs are covered by at least one case. Verifiability is the honest measure:

**AC-37 is new — added to the story on 2026-10-04, not part of the original supply.** It exists because
this suite found a mandatory step on the payment path with no Acceptance Criterion behind it: accepting
Terms & Conditions before `Confirm & Charge`. **That is the clearest return this scope has produced so
far** — a requirements gap found by test design rather than a defect found by execution.

| | Count |
|---|---|
| Fully verifiable today | 13 |
| Partially verifiable | 18 |
| Not verifiable | 5 |
| Moved to `reissue-mapping` | 1 (AC-23) |

**The five not verifiable:** AC-09 (online-only, needs an offline booking) · AC-22 (price-change
popup) · AC-26 and AC-30 (both DB) · and AC-32's design conformance blocked on **OQ-13** — the latter
unfalsifiable by construction, since no design exists. **AC-02 and AC-05 moved to Partial on
2026-10-01:** D-14 settled DS-2, so their expected results are fixed; their negatives still need OQ-7.

## 4. Edge-case coverage

All **108** story edge cases are covered. *(ProjectContext §7.2 records 100; the story's own groups —
8 · 14 · 18 · 15 · 18 · 8 · 9 · 9 · 9 — sum to 108. Correct the context at review.)*

Coverage by group, and how much of each can run:

| Group | Edge cases | Runnable today |
|---|---|---|
| 1. Prerequisites | 8 | 2 |
| 2. Eligibility | 14 | 7 |
| 3. Search / Re-shop | 18 | 12 |
| 4. Review & Pay | 15 | 7 |
| 5. Exchange | 18 | **4** |
| 6. Booking Confirmation | 8 | 4 |
| 7. Itinerary | 9 | 6 |
| 8. PNR Query | 9 | **9** |
| 9. Reports | 9 | 5 |

**Exchange is the weakest group** — 4 of 18 — and it is where the money and the tickets are.
**PNR Query is the strongest** at 9 of 9, because run-009 swept it.

## 4.1 Twelve cases added at review that cover no AC and no edge case

**Revision 3 (2026-10-04) added twelve cases at the user's request.** They are counted in the totals
above but in neither §3 nor §4, because the story specifies neither area:

| Added | Area | Runnable |
|---|---|---|
| TC-RFLOW-128 … 132 | **Inactive airports** must not appear in the Reissue flight widget — by code, by name, after a mid-session deactivation, or by a pasted code — and must return when reactivated | 5, **if** administration access to the airport status flag is held |
| TC-RFLOW-133 … 139 | **The 15-minute FARE HELD countdown** on Review & Pay — its start value, that it runs, that a refresh does not reset it, that at zero the offer is unavailable, that expiry is recoverable, that it respects the supplier's own validity, and that it is enforced on submission | 5 of 7; TC-RFLOW-138 and 139 are Declared Gaps |

**The expiry rule came from the user on 2026-10-04: at zero, the offer is no longer available.** That
is the authority TC-RFLOW-135 asserts against — there is no AC for it. The screen's exact wording at
expiry was not specified and the case records what the screen does.

**Both areas were genuine holes.** §4 validated the Origin/Destination *combination* (TC-RFLOW-039)
but never either airport's *status*; `reissue-mapping` covered the countdown as a displayed value
(`TC-RMAPF-031`, `TC-RMAPX-060`, concern `CN-21`) but nothing covered its behaviour.

## 4.2 Nine more cases from the workflow documents — 2026-10-04

**Three workflow documents supplied by the user describe three controls the story never mentions, and
the user confirmed all three exist on screen.** Nine cases follow. They cover no AC and no edge case,
for the same reason as §4.1's twelve: the story does not specify them.

| Added | Control | Runnable |
|---|---|---|
| TC-RFLOW-142 … 145, 148 | **Terms & Conditions**, including **acceptance required before `Confirm & Charge`** | 5 — runnable; TC-RFLOW-143 stops at the refusal and never pays |
| TC-RFLOW-140, 141 | The payable amount is labelled **"Due Now"** and equals difference + supplier penalty + WT change fee | 2 — runnable on held data |
| TC-RFLOW-146, 147 | An insufficient wallet **offers a top-up and returns to the flow** | 0 today — both need **D-22**'s low-balance wallet, committed but undelivered |

**The T&C gate is the most significant gap this suite has closed since it was written.** It sits
directly on the payment path — both diagram forms show `… → Accept T&C → Confirm & Charge` — and
nothing in the original 127 cases, or in the story, touched it. **If the gate does not hold, users are
charged without agreeing to anything**, and no existing case would have found it.

## 5. What run-009's sweep bought

Before this run, AC-34, AC-35 and AC-36 had **no observed expected result** — Reports and PNR Query
had never been opened by either scope. After it:

- **PNR Query is fully specified** — structure, both bookings, the Reissue History columns, the empty
  state, and the `Ticket` column as a ticketing-failure signal. All nine of its edge cases are runnable.
- **All fourteen reports are enumerated** with their filters, which is AC-36's regression baseline.
- **Three new findings** and **four new open questions** (OQ-F1 … OQ-F4) that decide expected results
  rather than steps.

## 6. Priority profile

| Priority | Cases |
|---|---|
| P1 | 92 |
| P2 | 52 |
| P3 | 4 |

The P1 share is high (62%) because the story's ACs are themselves nearly all mandatory behaviour.

## 7. What to do first

1. ~~**Answer DS-2.**~~ **Done 2026-10-01 — D-14**: the button is hidden when any of six conditions
   fails. The eligibility cases now carry fixed expected results (§0.8 of the suite).
2. **Supply the OQ-7 test data.** Eleven cases, and it is the cheapest large unblock: an offline
   booking, an unlisted-supplier booking, a Reissue-disabled organisation, and a mixed-eligibility party.
3. **Note that OQ-12 is closed and will not reopen.** A supplier reprice cannot be forced (D-15), so the Price Changed popup — six cases, AC-22 — is accepted as untested. **If it is ever seen during any execution, capture evidence on the spot;** that is the only route to specifying it.
4. **Decide whether fault injection is possible (OQ-10).** Twenty-one cases — the whole failure
   surface — turn on this single answer. If it is not possible, the failure behaviour is formally
   accepted as untested and that should be a recorded decision, not a silence.
5. **Run the 31 not-executed cases** that need nothing new. They are pure profit against held data.
6. **Confirm administration access to the airport active/inactive flag.** Five cases (TC-RFLOW-128 to
   132) are counted as runnable on that assumption; without it they are Declared Gaps.
7. **Answer OQ-F1 … OQ-F4.** Each fixes an expected result, each is a short conversation.
8. **Set the exchange fee and the service charge to different values** before executing TC-RFLOW-088
   and TC-RFLOW-120 — otherwise neither can distinguish the two.

## 8. What this suite deliberately excludes

**Defect-regression cases, by the user's instruction of 2026-09-30.** Seventeen findings are open;
none has a regression case here. They belong in a regression suite assembled when fixes land, and
`TraceabilityMatrix.md` §6 maps each finding to the case that states the requirement it violates —
so the relationship is recoverable without the cases being present.

**Thirteen cases are expected to fail on today's build** for exactly that reason: the story requires
behaviour a finding says is missing. Their Notes say so. **That is a product failure being reported
by a specification case, not a regression test in disguise.**

## 9. Lifecycle

**Every case carries `Review: Pending` and `Automation: Pending`.** Stage 3 always writes `Pending`;
only a human reviewer may change either. Stage 4M consumes a case only when `Review = Approved`;
Stage 4A only when `Review = Approved` **and** `Automation = Approved`.

Generating this suite has approved nothing.
