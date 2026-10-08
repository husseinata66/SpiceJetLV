# QA Assessment Report — reissue-mapping (run-007, Stage 2)

| | |
|---|---|
| **Scope** | Supplier Features → `reissue` → Shared scope `reissue-mapping` |
| **Run** | `reissue-run-001__2026-09-26_17-10-56__UserStory__ReissueFlowFromItinerary` |
| **Scope family** | `supplier-feature` · feature `reissue` · `sharedScope: reissue-mapping` · `supplier: null` |
| **Upstream** | `context/ProjectContext.md` **Revision 12** |
| **Stage** | 2 — Explorer *(shared)* |
| **Checkpoint** | **Human Review Required** — this report is **Pending Review** |
| **Period** | 2026-09-26 → 2026-09-30 |
| **Layers in scope** | UI · API · Contract · Integration · E2E *(Regression out; DB deferred; Security and Performance out)* |

## 1. What was assessed

The question this scope exists to answer is **not** "does the reissue feature work". It is narrower and
harder: **for every value that appears on a reissue screen, does it still mean what the supplier meant?**

Two hops, three layers:

```
Sabre (CERT REST, PCC EZ4K)  →  ndc-core-service  →  Admin / Portal API  →  screen
            hop B                         hop A
```

ProjectContext §2.1–§2.3 enumerates **25 mapping rules** — 12 on hop A, 10 on hop B, 3 chain-level. Each
is assessed against three questions in order: is the value *carried*, does it still *mean* the same
thing, and is anything *returned but not displayed*.

**The oracle (§2.0, restated by the user 2026-09-28): there is no design document. The implemented UI is
the source of truth.** The consequence is deliberate and constraining — a value the app never returns
cannot be judged missing, so the defect rule the user set is: *raise a flag only when the value comes
back from the backend and is not displayed*. Under that oracle, "the screen ought to show X" is not a
finding. This report holds to that.

## 2. Verdict

**The mapping itself is sound. The application's arithmetic and record-keeping are not.**

Across 18 offers aligned by flight signature inside a single capture window, at two exchange rates, in
two currencies, across one-way / round-trip / multi-city, with parties of 2 Adult + 2 Child + 2 Infant,
**both hops returned zero value mismatches**. Base fare, tax, supplier penalty and total all carry
correctly from Sabre to core, and from core to the screen under the configured rate plus the app-origin
change fee.

Every defect found is therefore located **in the application layer**, not in the supplier or the
mapping. They cluster into three families:

| Family | Findings | Nature |
|---|---|---|
| **Rounding reaching money** | R02, R12, R15, **R18** | An exact value is rounded, the invoice records the rounded figure, and — newly proven — **the wallet is debited it** |
| **Ticketing integrity** | **R13**, R14, R06 | Documents the supplier holds that the app does not, and in one case a document the supplier never issued |
| **Attribution and labelling** | R03, R05, R04, R17, R11, R07, R08, **R19** | Correct totals filed under the wrong field, or presented in a way that misleads |
| **Undeclared or unsurfaced data** | **R20**, **R21** | Values the app invents with no declared source and no verification, and a supplier channel with nowhere to appear |
| **Authorization** | **R22** | A single unreproduced observation that eligibility was granted on an invalid credential |

## 3. Findings

**18 live, 3 withdrawn.** Full text in `findings/`. **Four were added on 2026-09-30** (R19–R22) when the displayed-value mapping inventory and the standing risk register were swept for items that had been identified but never raised as numbered findings. Process, scope, governance and test-data concerns that are **not** defect-shaped are in `CONCERNS_REGISTER.md` (36 entries).

| ID | Severity | Title | Status |
|---|---|---|---|
| **R13** | **Critical** | An exchange voids six tickets and issues five — one passenger left with no valid travel document | **Approved 2026-09-30** — supplier defect; app residue kept open |
| **R12** | **High** | Confirmation fare details do not sum — total exceeds its own itemisation by the supplier penalty | Pending Review |
| **R14** | **High** | After a paid exchange the app holds `ticketNo: null` for all six passengers | **Approved 2026-09-30** — cause confirmed in source, reported to development |
| **R18** | **High** | Wallet debited **3,977.00** against an agreed **3,976.88** | Pending Review |
| **R06** | **High** | Sabre issues a ticket the application never stores — positional: every even-numbered passenger | Pending Review |
| **R03** | Medium | Supplier penalty merged into `totalTax`, shown to the customer as "Taxes" | Pending Review |
| **R05** | Medium | `changeFee` disappears and its value reappears in `serviceCharges` | Pending Review |
| **R07** | Medium | `book` returns 409 *"the request could not be completed"* — no code, no cause, no next step | Pending Review |
| **R08** | Medium | Two Adult fare groups merged; the first group's per-passenger tax multiplied by the full count | Pending Review |
| **R11** | Medium | A filtered result is reported to the agent as an empty market | Pending Review |
| **R15** | Medium | One charge recorded three ways in one `invoiceInfo`; `feeNTaxes` holds an unconverted supplier figure | Pending Review · **corrected** |
| **R02** | Low | Currently-ticketed total rounded on Review & Pay | Pending Review · **root cause corrected** |
| **R04** | Low | Reissue History reads "2 Reissues" after one exchange | Pending Review |
| **R17** | Low | Wallet rendered with 3 decimals on the dashboard, 2 on Review & Pay | Pending Review |
| **R19** | Medium | Supplier badge read from `refundableInfo` while the correctly-named `supplierName` sits unused | Pending Review |
| **R20** | Medium | Every place and airline name is an unverified Portal-side lookup with no mapping rule | Pending Review |
| **R21** | Medium | The core `warnings` channel has no display path and has never been non-empty | Pending Review |
| **R22** | **High if confirmed — UNREPRODUCED** | Eligibility reported changeable on a nonsense credential | Pending Review |
| ~~R09~~ | — | Currency conversion | **Withdrawn** — behaviour correct |
| ~~R10~~ | — | Reissue controls lock-gated | **Withdrawn** — by design |
| ~~R16~~ | — | Admin wallet includes the credit line | **Withdrawn** — `creditAgency` scopes the agency channel only |

### The two that matter most

**R13 is the most serious thing this run found, and it was invisible from every screen.** After a fully
paid exchange the application's confirmation showed `null` for all six ticket numbers. Tested through
the UI alone, that logs as "display bug". Querying Sabre directly turned it into: five travelers hold a
new ticket and an EMD; **traveler 2 holds only his original ticket with both coupons `Exchanged`** — a
spent document and nothing else. The new-ticket sequence runs 392, [393 absent], 394, 395, 396, 397.
The agency paid for six passengers and received five sets of documents. In production this would be a passenger unable to board;
here it is CERT fixture data. **Nothing in the application would ever say so either way** — which is
the part that matters.

**R14 is why nobody would find out.** With all six numbers blank the screen looks uniformly empty —
there is no ragged edge to catch an agent's eye. A partial failure rendered as a uniform blank is worse
than either a correct display or an obvious error, because it removes the signal.

The generalisable control: **the application must verify per-passenger ticketing after every exchange
and refuse to display success until each passenger holds a live document.** Today it verifies nothing.

**R18 changed the character of the rounding family.** R02, R12 and R15 had all been assessed as
record-keeping faults. R15's severity note said so explicitly: *"No customer is over- or under-charged
— the wallet is debited the correct amount."* That was never measured. Scenario 10 measured it — wallet
before and after, from the API — and found the debit is the rounded figure. R15 is corrected in place
and R18 raised separately, because a wrong amount charged and an inconsistent record are different
defects with different fixes.

## 4. What was confirmed as correct

Recorded in ProjectContext §2.5 so no future run re-raises them:

| Behaviour | Confirmed |
|---|---|
| The rule engine is **not** applied to a reissued ticket — the agency earns the change fee alone | User, 2026-09-29 |
| The change fee is agency-configured and app-origin, added **after** currency conversion | User, 2026-09-28 |
| The rate of exchange is a **multiplier** on the supplier amount; an old ticket keeps its issue-time rate | User, 2026-09-29 |
| Offers with a negative base fare are filtered out by the core service | User, 2026-09-29 |
| The `creditAgency` checkbox scopes the **agency channel only**, never Admin | User, 2026-09-30 |

Scenario 10 verified all three rule-engine values against their configuration on the original ticket —
markup 600 = 100 × 6, discount 300 = 50 × 6, service charge 150 = 25 × 6 — and confirmed all three are
absent from the reissue offer, exactly as §2.5 requires.

## 5. Gap analysis — documented versus observed

| | |
|---|---|
| **Documented and observed to agree** | 17 of 25 mapping rules, under multiple conditions |
| **Documented, observed, and disagreeing** | 3 rules (A6, A8, A10) — each carries a finding |
| **Documented but never exercised** | **1 rule — B9, negative differences.** The highest-risk unmapped path |
| **Observed but not documented** | Two condition dimensions this run had to add to §2.4: **exchange rate** (more than one ROE) and **rule engine state** (original vs reissue). Neither was in the original coverage model |
| **Returned but not displayed (A12)** | Partially exercised; no instance found |

Nine Declared Gaps are enumerated in `Coverage_Summary.md` §5. Two are not about test data and deserve
naming here:

- **`logs/detail.log` has never been accessible.** It blocks the *cause* of five findings — R06, R07,
  R11, R13, R18. Each is recorded with cause **not established** rather than with a guess. For R13 it
  would very likely distinguish "the supplier failed to issue" from "the app's request omitted the
  traveler", which decides who fixes it.
- **Scenarios 1, 2, 5, 6 and 8b were never checked per-passenger against the supplier.** That check did
  not exist until R13 was found on scenario 9. Scenario 10 passed it. Those five are unverified either
  way and **should be re-verified** — five `getBooking` calls.

## 6. Method, and one method failure worth recording

**Paired capture.** Supplier, core and screen read in one narrow window, because supplier prices move.
**Alignment by flight signature, never by index** — each layer calls Sabre separately and receives a
different ordering; comparing offer[0] to offer[0] compares different flights. Two comparators were
built for this and live in `../tools/`.

**The platform never clicked Pay, Exchange or Confirm.** Every payment was performed by the human after
the agent reported the exact flight and amount, per `execution_safety_policy.json`.

**Querying the supplier directly is what found the worst defect.** R13 was unreachable from any screen
and any application payload. This is now a standing check for this scope.

**The method failure.** On 2026-09-29 a calculation error on scenario 5's confirmation screen was
missed by the agent and caught by the user. The cause was not tooling: occurrences were being recorded
without re-deriving the arithmetic behind them. The sweep that followed is what produced R02's root-
cause correction. It is recorded here because a discovery report that hides how its own evidence was
weakened is less useful than one that does not.

**Three findings were raised and withdrawn; four claims were falsified by later evidence** (R06's
Critical escalation, R11's connection-point hypothesis, R12's multi-city hypothesis, R15's
wallet-is-correct claim). All are retained rather than deleted — a withdrawn finding is the record of
what was checked.

## 7. Gate note — read before approving

**This stage consumed a Project Context whose `status:` reads `Pending Review`, not `Approved`.** Stage
2's own rule requires `Approved`. The context was revised twelve times *during* discovery — the oracle
itself was restated at Revision 12 — which is how it happened, and the work is sound regardless. But the
gate is formally open, and whether to approve Revision 12 retroactively or to re-baseline is a decision
for the reviewer, not something this report should assume.

## 8. Recommendation

1. **Raise R13's partial fulfilment with Sabre.** ~~Act operationally~~ — **corrected 2026-09-30: every
   booking in this scope is CERT fixture data and the passenger is fabricated, so no person is affected
   and there is nothing to issue.** The defect class stands: an exchange that takes full payment,
   receives partial fulfilment and reports success.
2. **Treat R18 as a live financial defect**, not a rounding nuisance. It is small per booking, always in
   the agency's disfavour, and invisible because wallet and invoice agree on the wrong number.
3. **Obtain `logs/detail.log`.** It is the single cheapest unblock available — five findings gain a
   mechanism.
4. **Re-verify scenarios 1, 2, 5, 6, 8b** per-passenger against Sabre. Five calls; the R13 defect may
   already be sitting in a completed exchange.
5. **Proceed to Stage 3 — it is required, and the mapping is not finished being tested.** Discovery
   established the mapping is correct *wherever exercised*; the residual risk is in paths never run
   (B9 above all). That is precisely what a sampled discovery cannot close.
6. **Supply the test data for the nine Declared Gaps**, or accept them as Not Testable on the record.

## 9. Artifacts

| | |
|---|---|
| `DiscoverySnapshot.md` | What the reissue mapping chain is, as observed |
| `Coverage_Summary.md` | Rule × condition coverage, conditions matrix, nine Declared Gaps |
| `Timeline.md` | Ten scenarios, chronology, withdrawals and corrections |
| `findings/` | 21 folders — 18 live, 3 withdrawn |
| `CONCERNS_REGISTER.md` | 36 process, scope, governance, test-data and method concerns; includes items assessed and deliberately **not** raised |
| `evidence/` | 187 files — paired captures, comparisons, capture windows |
| `../tools/` | `compare_chain.js`, `compare_phases.js` |
