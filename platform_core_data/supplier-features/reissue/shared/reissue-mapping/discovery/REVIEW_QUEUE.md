# Review Queue — reissue-mapping (run-007)

Everything awaiting a decision, in priority order, with **who decides** and **what closing it looks
like**. Ordered by consequence if left undecided, not by severity label.

- **Scope:** Supplier Features → `reissue` → shared scope `reissue-mapping`
- **Compiled:** 2026-09-30
- **Position:** 21 findings (2 approved · 16 pending · 3 withdrawn) · 44 concerns · 117 test cases, all `Review: Pending`

---

## Already approved — no action needed here

| ID | Disposition |
|---|---|
| **R13** | **Approved 2026-09-30 as a supplier defect.** The missing document is Sabre's. The application residue — declaring "Exchange confirmed" without verifying per-passenger ticketing — stays open (see P1-3 below) |
| **R14** | **Approved 2026-09-30.** Cause confirmed in the source; reported to development; awaiting fix |

| ID | Withdrawn |
|---|---|
| ~~R09~~ | Currency conversion — behaviour correct |
| ~~R10~~ | Reissue controls lock-gated — by design |
| ~~R16~~ | Admin wallet credit line — `creditAgency` scopes the agency channel only |

---

## P0 — Act today, no review required

These are not decisions. They are outstanding actions with a real risk of loss.

> **No passenger is exposed anywhere in this scope.** All bookings are CERT fixture data with fabricated names. Earlier wording to the contrary is corrected in R13 and R14.

| # | Action | Owner | Why it cannot wait |
|---|---|---|---|
| ~~P0-1~~ | ~~Issue a valid ticket to passenger EMAD EID~~ **WITHDRAWN 2026-09-30 — test data.** Every booking in this scope is CERT fixture data and the passenger is fabricated | — | **No person is affected and there is nothing to issue.** The wording that described a passenger unable to board was overstated and is corrected in R13 |
| **P0-2** | **Raise the fulfilment failure with Sabre** — five documents issued for six passengers, new-ticket sequence `392, [393 absent], 394–397` | Supplier management | Approved as a supplier defect. Nothing in the application will prevent a recurrence |
| **P0-3** | **Commit run-007 to git** — 34 uncommitted entries | Whoever holds the repo | Five days of work, 21 finding folders and 187 evidence files exist only in an uncommitted working tree |

---

## P1 — Blocks everything downstream

Until these are settled, approving anything else bakes in a known inconsistency.

| # | Decision | Decider | What closing it looks like |
|---|---|---|---|
| **P1-1** | **Approve Project Context Revision 13, or amend it first.** Currently `Pending Review` | Product owner | A `status: Approved` on the context. Everything below inherits from it |
| **P1-2** | **Re-trace Stage 2 and Stage 3 artifacts from Revision 12 to Revision 13.** Every artifact cites **12**; the context is at **13** (Itinerary brought into cross-screen scope, §1.1.2; a non-negativity invariant added) | QA | All artifacts cite 13, and any case affected by §1.1.2 or the new invariant is re-checked. **Reported as stale, never silently regenerated** |
| **P1-3** | **Decide the application residue of R13** — the app declared "Exchange confirmed" with a passenger unticketed. Not fixed by R14's change; a separate code path | Product owner | Either a defect for development, or a recorded decision that success may be declared without per-passenger verification |
| **P1-4** | **Reconcile the two ledgers on Stage 1.** The run manifest says `Approved`; `feature.json` says `Pending Review` | QA / platform | One answer, whichever is right |
| **P1-5** | **Confirm the active run pointer.** It now reads `run-009 … ReissueFlowBusinessFeature`; reissue-mapping's stages were recorded against run-007 | QA | Confirmation that the switch was intended before any further stage is recorded |

---

## P2 — Findings pending review, money first

Ordered by financial and customer exposure, not by severity word.

| # | Finding | Severity | The decision |
|---|---|---|---|
| **P2-1** | **R18** — the wallet is debited 3,977.00 against an agreed 3,976.88 | High | Real money, always against the agency, invisible because wallet *and* invoice record the same wrong figure. **Also decide whether to spend another exchange (~4,000 AED) to confirm it** — measured once |
| **P2-2** | **R12** — confirmation fare details do not sum; the total exceeds its own itemisation by the supplier penalty | High | The document an agent quotes and an accountant reconciles contradicts itself |
| **P2-3** | **R06** — Sabre issues a ticket the application never stores; positional, every even-numbered passenger, four bookings | High | Distinct from R14: this is loss **on booking**, not on reissue write-back |
| **P2-4** | **R15** — one charge recorded three ways in one invoice; `feeNTaxes` carries an unconverted supplier figure | Medium | Includes an open question: is `feeNTaxes` *meant* to be supplier-currency? |
| **P2-5** | **R02** — currently-ticketed total rounded on Review & Pay | Low | Same root as R18. Fixing R18 may or may not fix this; confirm they are treated together |

---

## P3 — Findings pending review, attribution and behaviour

| # | Finding | Severity | The decision |
|---|---|---|---|
| **P3-1** | **R22** — eligibility reported changeable on a nonsense credential | High **if confirmed**, currently **unreproduced** | **Re-test before deciding.** The untested step that matters is a credential belonging to a *different agency* — that separates weak validation from credentials not being segregated |
| **P3-2** | **R03** — the supplier penalty is recorded as tax on the customer's document | Medium | The supplier books it as explicitly not tax |
| **P3-3** | **R05** — the change fee is written into `serviceCharges` | Medium | Reporting that sums service charges silently conflates the two |
| **P3-4** | **R07** — `book` returns 409 with no code, no cause, no next step | Medium | Cause blocked by `logs/detail.log` |
| **P3-5** | **R11** — a filtered result is presented to the agent as an empty market | Medium | Also asks whether the filter predicate itself has ever had product review |
| **P3-6** | **R08** — unlike fare groups merged; the first group's tax multiplied by the full count | Medium | **Cannot be re-tested** — no split-fare booking exists |
| **P3-7** | **R19** — the supplier badge is read from a refundability field | Medium | Plus: should a credential environment name be visible to an agency at all? |
| **P3-8** | **R20** — every place and airline name is an unverified Portal-side lookup | Medium | Structural: no wrong name has been seen, and nothing would catch one |
| **P3-9** | **R21** — the supplier `warnings` channel has no display path | Medium, **uncertain** | Severity cannot be set until one non-empty `warnings` is seen |
| **P3-10** | **R04** — Reissue History reads "2 Reissues" after one exchange | Low | Matters where penalties accumulate per exchange |
| **P3-11** | **R17** — the wallet renders 3 decimals in one place and 2 in another | Low | Cosmetic, but it makes wallet screenshots unreliable as evidence |

---

## P4 — Cheap unblocks, high return

Not decisions — work items that resolve several pending questions at once.

| # | Action | Unblocks |
|---|---|---|
| **P4-1** | **Obtain `logs/detail.log`** | The **cause** of six findings: R06, R07, R11, R13, R18, R22 |
| **P4-2** | **Five `getBooking` calls** on scenarios 1, 2, 5, 6, 8b | Whether a passenger in a completed exchange cannot board. *Note: all five were complete exchanges that stored 6 of 6, so under R14's confirmed mechanism none should have hit the guard — this verifies an inference rather than chasing a likely hit* |
| **P4-3** | **Set the exchange fee and the service charge to different values** | Makes R05 decidable at the offer level, not only at the invoice. Test-data change, not a product change |
| **P4-4** | **Obtain a booking whose re-shop is cheaper** | Rule `B9` — the refund/negative path, which has **zero evidence**. The largest hole in the scope |

---

## P5 — Open product questions

Behaviour observed and understood; only the intent is unconfirmed. None blocks a gate.

| # | Question | Raised |
|---|---|---|
| **P5-1** | Should infants be charged the change fee? They are, per the By-Pax rule | 2026-09-30, unanswered |
| **P5-2** | Is `feeNTaxes` meant to carry the supplier-currency figure? | Part of R15 |
| **P5-3** | Is the negative-base-fare filter's predicate correct? The behaviour is confirmed; the predicate has had no product review | Part of R11 |
| **P5-4** | Should `"Sabre Staging"` be visible to an agency? | Part of R19 |
| **P5-5** | Are the six undeclared app-origin derivations intended to stay undeclared? | Part of R20 |

---

## P6 — Stage 3 gate, after P1 clears

**117 test cases, every one `Review: Pending` and `Automation: Pending`.** Stage 4M consumes a case
only when `Review = Approved`; Stage 4A only when both are.

Do not approve these before **P1-1** and **P1-2** — they were authored against Revision 12 and two
unapproved upstreams, and approving them now would fix a known staleness in place.

| Suite | Cases | Note |
|---|---|---|
| `TestCases_ReissueMapping.md` | 57 | The 25 mapping rules against the conditions that break them |
| `TestCases_ReissueMappingDisplayedValues.md` | 60 | The 45 displayed values, plus 15 cross-screen consistency and calculation cases |

**29 cases are expected to fail** until their findings are fixed — that is their purpose. See
`../test_design/CoverageReport.md` §7 for what to re-run and what not to.

---

## Suggested order

1. **P0** — today, in parallel, no review needed
2. **P1-1** and **P1-2** — unblocks every approval below
3. **P2** — the money findings
4. **P4-1** and **P4-2** — cheap, and P4-1 improves several P3 decisions
5. **P3**, then **P5**
6. **P6** — the Stage 3 gate last
