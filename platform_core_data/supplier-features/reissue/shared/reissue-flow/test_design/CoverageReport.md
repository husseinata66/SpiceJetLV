# Coverage Report — Reissue Flow Test Design

| Field | Value |
|---|---|
| Scope | `reissue-flow` (business feature) |
| Suite | `TestCases_ReissueFlow.md` Revision 1 |
| Total cases | 127 |
| Generated | 2026-09-30 |
| Status | **Pending Review** |

## 1. The direct answer — what can actually be run

| State | Count | Share |
|---|---|---|
| **Executed in Discovery and behaving** | 27 | 21% |
| **Observed and failing** — a finding is open; the case states the requirement | 13 | 10% |
| **Partially executed** — positive path only | 17 | 13% |
| **Not executed** — runnable today with held data and access | 21 | 17% |
| **Not testable** — no data or access exists; Declared Gap | **45** | **35%** |
| **Pending Confirmation** — steps known, expected result unruled | 4 | 3% |

**57 of 127 cases can be run today** without anything new (executed, observed, partial, not-executed).
**45 cannot be run at all.** **4 can be run but not judged.**

## 2. The headline a reviewer needs

**The positive path is well covered. The failure behaviour is almost entirely unverified.**

Every case that cannot run is a *negative*, a *boundary*, or a *failure* case. Nothing blocked is
cosmetic:

| What cannot be tested | Cases | Why |
|---|---|---|
| Every supplier/system failure path — Not Booked, Booking Fail, timeouts, duplicate submission, missing reference, late response | 21 | No stub or fault injection on Sabre Staging (**OQ-10**) |
| Every configuration negative — disabled Branch, disabled Agency, flag precedence, offline booking, unlisted supplier | 11 | Test data not supplied (**OQ-7**) |
| The unconfigured exchange fee | 4 | Shared master data; needs a third org or an approved revert (**OQ-8**) |
| The Price Changed popup, entirely | 6 | A supplier reprice cannot be forced (**OQ-12**) |
| The insufficient wallet | 2 | No low-balance test wallet (**OQ-11**) |
| Both DB assertions | 2 | DB layer `Deferred`, no access (**OQ-9**) |
| A real supplier penalty; a non-Economy cabin | 2 | Never observed at anything but zero / Economy |

**A suite that passes every runnable case would still tell you nothing about how this feature fails.**
That is the single most important thing on this page.

## 3. Acceptance Criteria coverage

All **36** Overall ACs are covered by at least one case. Verifiability is the honest measure:

| | Count |
|---|---|
| Fully verifiable today | 12 |
| Partially verifiable | 16 |
| Not verifiable | 7 |
| Moved to `reissue-mapping` | 1 (AC-23) |

**The seven not verifiable:** AC-09 (online-only, needs an offline booking) · AC-22 (price-change
popup) · AC-26 and AC-30 (both DB) · plus AC-02 and AC-05 blocked on **DS-2**, and AC-32's design
conformance blocked on **OQ-13** — the latter unfalsifiable by construction, since no design exists.

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
| P1 | 82 |
| P2 | 43 |
| P3 | 2 |

The P1 share is high (65%) because the story's ACs are themselves nearly all mandatory behaviour.

## 7. What to do first

1. **Answer DS-2.** It blocks the feature's entry point — AC-02 and AC-05 — and it is a product
   decision, not a test-data problem. One answer unblocks the eligibility cases.
2. **Supply the OQ-7 test data.** Eleven cases, and it is the cheapest large unblock: an offline
   booking, an unlisted-supplier booking, a Reissue-disabled organisation, and a mixed-eligibility party.
3. **Decide whether fault injection is possible (OQ-10).** Twenty-one cases — the whole failure
   surface — turn on this single answer. If it is not possible, the failure behaviour is formally
   accepted as untested and that should be a recorded decision, not a silence.
4. **Run the 21 not-executed cases** that need nothing new. They are pure profit against held data.
5. **Answer OQ-F1 … OQ-F4.** Each fixes an expected result, each is a short conversation.
6. **Set the exchange fee and the service charge to different values** before executing TC-RFLOW-088
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
