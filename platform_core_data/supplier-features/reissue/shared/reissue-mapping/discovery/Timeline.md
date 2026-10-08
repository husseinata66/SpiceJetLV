# Discovery Timeline — reissue-mapping (run-007, Stage 2)

- **Scope:** Supplier Features → `reissue` → Shared scope `reissue-mapping`
- **Run:** `reissue-run-001__2026-09-26_17-10-56__UserStory__ReissueFlowFromItinerary`
- **Upstream:** `context/ProjectContext.md` **Revision 12** (status `Pending Review` — see the gate note in `QA_Assessment_Report.md` §7)
- **Period:** 2026-09-26 → 2026-09-30
- **Surfaces:** Admin `http://192.168.1.60` · Portal `http://192.168.1.60:9500` · core `ndc-core-service` · supplier Sabre CERT REST, PCC `EZ4K`
- **Status:** Pending Review

## Method

Every scenario is a **paired capture**: the supplier, the core service and the application surface are
read inside one narrow time window, because supplier prices move between calls. Offers are aligned
**by flight signature — carrier, flight number, departure datetime — never by array index**, since
each layer calls Sabre separately and receives a different ordering.

Two comparators were built for this and live in `../tools/`:

| Tool | What it answers |
|---|---|
| `compare_chain.js` | supplier → core → screen, field by field, for one offer |
| `compare_phases.js` | the same values across Search → Review → Confirmation, 17 fields per segment |

**No exchange was ever executed by the platform.** Every Pay / Exchange / Confirm click was performed
by the human after the agent reported the exact flight and amount — the execution-safety rule for this
scope (`execution_safety_policy.json`; `pipeline.md` §14).

## Scenarios

| # | Date | Booking · GDS PNR | Surface | Cur · ROE | Trip | What it was for |
|---|---|---|---|---|---|---|
| 1 | 09-26/27 | `NDCEG-BR-F260924EAzzYT` · `RGGMXP` | Admin + Portal | EGP | one way | First full chain; Admin/Portal parity; 17/17 offers twice |
| 2 | 09-28 | CAI→RUH 04 Dec | Admin | EGP | one way | Route variation |
| 3 / 3b | 09-28 | ticket `…9100` | — | EGP | one way | Ticket held by Sabre, absent from the app (**R06**) |
| 4 | 09-28 | ticket `…9105` (lead pax) | — | EGP | one way | **R06** on the *lead* passenger |
| 5 | 09-28 | CAI→JED 15 Dec | Portal | EGP | one way | All six ticket numbers present — control for R06 |
| 6 / 6b / 6c | 09-28/29 | `NDCEG-BR-F260928gssCFk` · `PUBPBJ` | Portal | AED · 9 | one way | Currency conversion (→ **R09 withdrawn**) |
| 7 | 09-29 | `QTZVXU` | Portal | AED · 9 | one way | Invoice rounding (**R15**) |
| 8 / 8b | 09-29 | `NDCEG-BR-F260929u1ptMk` · `QZTJRV` | Admin | AED · 9 | round trip | **Rule engine through an exchange**; markup 100, discount 50, service charge 25 |
| 9 | 09-29 | `NDCEG-BR-F2609294YODAr` · `RPTIYO` | Admin | AED · 9 | **multi city** | 6 pax (2+2+2); **R13**, **R14**; disproved R12's multi-city hypothesis |
| 10 | 09-30 | `NDCEG-BR-F260930LAlLPj` · `TTDMXL` | Portal | AED · **0.1** | one way | Rule engine + **new ROE 0.1**; full three-layer compare; **R18** |

## Sequence of events

**2026-09-26 — scope and first chain.** Run created. Project Context Rev 1. First supplier→core→screen
capture on `RGGMXP`. `FINDING-R01` (Itinerary times shifted) raised in the sibling `reissue-flow` scope.

**2026-09-27 — the scope split.** `reissue-flow` divided into this **mapping** scope (UI ↔ core ↔
supplier) and a separate business-feature scope. Recorded through `run_manager/cli.js scope-change`,
approved by Mohamed Soliman, appended to `run.json.scopeHistory`. Testing layers narrowed; E2E restored
the same day for the human-clicked Exchange. Portal/Admin parity re-proven headless. **OQ-M7** opened
(wallet balance by channel).

**2026-09-28 — ticket-number integrity and currency.** R06 found and reproduced across scenarios 3, 3b
and 4, including on a lead passenger. Scenario 5 captured as a control where all six are present.
Currency work began on the AED agency; `R09` raised then **withdrawn** — the rate of exchange is a
multiplier, confirmed by the user. R02, R03, R04, R05, R07, R08, R12 raised.

**2026-09-29 — the rule engine, and the day three claims were falsified.**
- `R10` **withdrawn**: reissue controls are lock-gated by design.
- `R11`'s "RUH is a connection point" hypothesis **superseded** — coincidence, not cause. The real cause
  confirmed as a newly deployed negative-base-fare filter, with the deploy window pinned between
  13:18:43Z and 13:35:28Z from this run's own captures.
- `R02`'s root cause **corrected**: in EGP `totalOfferAmount` is exact (a binding fault); in AED it is
  itself already rounded (a conversion fault). Two defects under one label; re-pointing the binding
  fixes only one.
- Scenario 8b ran the rule engine through an exchange. The user confirmed the rule engine is **not**
  applied to a reissued ticket — recorded in ProjectContext §2.5 as a confirmed behaviour.
- **A calculation error on scenario 5's confirmation was missed by the agent and caught by the user.**
  The honest cause: occurrences were being recorded without re-deriving the arithmetic. A sweep of
  every prior finding followed; it is what produced R02's correction. Recorded here because it is a
  method failure, not a tooling one.
- Scenario 9 (multi-city, 6 pax): querying **Sabre directly** — not the screen — revealed `R13`, a
  passenger with no ticket at all, and `R14`, all six ticket numbers lost. R15 raised. R06 escalated
  from "sporadic" to **positional**: every even-numbered passenger.

**2026-09-30 — wallet, and money.**
- **OQ-M7 closed.** The Admin/Portal gap is the agency's configured `creditLimit` (9,999,999) to the
  cent. `R16` raised, then **withdrawn the same day** on the user's statement that the `creditAgency`
  checkbox scopes the agency channel only. Confirmed independently on scenario 10's agency, where
  `creditAgency: true` and the Portal *does* return the credit. `R17` (3-decimal rendering) stands.
- Scenario 10: all 18 offers aligned across all three layers with **zero mismatches** at both hops;
  markup, discount and service charge each verified against configuration; ROE 0.1 verified from
  `currencyRate` in the payload.
- **`R18`** found by reading the wallet from the API before and after a paid exchange: agreed 3,976.88,
  debited 3,977.00. This **falsified FINDING-R15's own severity note**, which had asserted the wallet is
  debited correctly — a claim never measured when written. R15 corrected in place.
- The standing post-exchange supplier check introduced by R13 **passed** on scenario 10: all six
  travelers hold a live ticket and an EMD.

## Withdrawals and corrections — the audit trail

| What | Outcome |
|---|---|
| `R09` currency conversion | **Withdrawn** — behaviour correct |
| `R10` reissue controls lock-gated | **Withdrawn** — by design |
| `R16` Admin wallet credit line | **Withdrawn** same day — `creditAgency` scopes the agency channel only |
| `R06` Critical escalation | **Withdrawn** — scenario 6 exchanged successfully with a number missing |
| `R11` RUH-connection hypothesis | **Superseded** — retained as a record of the reasoning |
| `R02` root cause | **Corrected** — EGP and AED fail for different reasons |
| `R12` multi-city hypothesis | **Disproved** by scenario 9 |
| `R15` "wallet debited correctly" | **Falsified** by scenario 10 → `R18` |

Three findings were raised and withdrawn, and four claims were falsified by later evidence. They are
kept, not deleted, because a withdrawn finding is the record of what was checked.
