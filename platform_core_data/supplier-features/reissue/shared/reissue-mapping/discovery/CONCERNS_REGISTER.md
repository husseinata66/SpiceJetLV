# Concerns Register — reissue-mapping (run-007)

Everything raised during run-007 that is **not** a numbered finding, recorded so it is not lost
between sessions. Findings live in `findings/`; this file holds process, scope, governance, test-data
and environment concerns, plus items deliberately assessed as *not* defects.

- **Scope:** Supplier Features → `reissue` → shared scope `reissue-mapping`
- **Status:** For review alongside the Stage 2 and Stage 3 gates
- **Compiled:** 2026-09-30

---

## A. Governance and gates — needs a decision before approval

| # | Concern | Why it matters |
|---|---|---|
| **CN-1** | **Stage 2 consumed a Project Context reading `Pending Review`, not `Approved`.** Stage 2's own rule requires `Approved`. | The context was revised twelve times *during* discovery and the oracle itself was restated at Revision 12 — which is how it happened. The work is sound; the gate is formally open. **Approve Revision 12 retroactively, or re-baseline — a decision, not an oversight to wave through.** |
| **CN-2** | **Stage 3 was authored against two unapproved upstreams** — a `Pending Review` context and a `Pending Review` discovery report. | Both suites are **provisional**. If either upstream changes at review, affected cases must be re-traced before approval. Stated in both suite headers. |
| **CN-3** | **Two ledgers disagree about Stage 1.** The run manifest records `Stage 1 — Project Context: Approved`; the shared scope's `feature.json` records `context: Pending Review`. | One of them is wrong. Until reconciled, "is Stage 1 approved?" has two answers depending on which file is read. |
| **CN-4** | **Scope was extended on 2026-09-30 to include the Itinerary screen**, which the inventory had explicitly excluded on 2026-09-28 at the user's instruction. | Cross-screen consistency cases now cover Search, Review, Confirmation **and Itinerary**. `ProjectContext` still records the narrower scope and **should be revised to match before the suites are approved.** The change is the user's; recording it is not optional. |
| **CN-5** | **Nothing from run-007 is committed to git.** 34 uncommitted entries, including 21 finding folders, 187 evidence files, two comparator tools, five Stage 2 documents and six Stage 3 artifacts. | The entire run exists only as an uncommitted working tree. A single mistaken `git checkout` loses five days of work and the only record of a Critical finding. |

---

## B. Access and environment — blocking, and cheap to unblock

| # | Concern | Blocks |
|---|---|---|
| **CN-6** | **`logs/detail.log` has never been accessible in this run.** | The **cause** of six findings: R06, R07, R11, R13, R18, R22. Each records cause *not established* rather than a guess. **The single cheapest unblock available** — one access grant resolves causation for six. |
| **CN-7** | **No read-only DB access was ever provided** (deferred at intake, 2026-09-26). | Any assertion about what is *stored* versus what is *returned* rests on API responses alone. |
| **CN-8** | **Scenarios 1, 2, 5, 6 and 8b were never verified per-passenger against the supplier.** | The post-exchange fulfilment check did not exist until FINDING-R13 was found on scenario 9. Scenario 10 passed it. **Five `getBooking` calls outstanding — a Critical defect may already be sitting in a completed exchange.** |
| **CN-9** | ~~A stray Excel lock file is in `test_design/`~~ **RESOLVED 2026-09-30** — the workbook was closed and the `~$` lock file is gone; both suites re-exported cleanly. | Retained as a reminder: an open workbook makes the export fail with `EBUSY`, and a lock file must never be committed. |

---

## C. Test data — the constraint on coverage, not effort

| # | Concern | Consequence |
|---|---|---|
| **CN-10** | **The exchange fee and the rule-engine service charge are both configured at 25 per passenger** on the agency under test. | The two are **indistinguishable by amount** at the offer level, so FINDING-R05 could only be decided at the invoice. **Set them to different values** — a test-data fix, not a product change. |
| **CN-11** | **No booking exists whose re-shop is cheaper than the original ticket.** | The negative / refund path (rule B9) has **zero evidence** — the highest-risk unmapped path in the scope. Declared Gap G1. |
| **CN-12** | **No party has been seen that Sabre prices in several fare groups unalike.** | Leaves the known "first published fare applied to every passenger" risk unexercised — which is the exact shape of FINDING-R08, found by inspection rather than controlled data. Declared Gap G2. |
| **CN-13** | **All ten scenarios were Economy.** No non-Economy cabin has ever been through the chain. | Declared Gap G5. |
| **CN-14** | **Browser time zone was never varied.** | FINDING-R01's mechanism is *named* as a time-zone shift but has never been demonstrated across zones. Declared Gap G6. |
| **CN-15** | **No offer has been seen where Sabre emits an empty string** rather than `0` or an absent field. | Declared Gap G7. |

---

## D. Open product questions — behaviour observed, intent unconfirmed

| # | Question | Observed |
|---|---|---|
| **CN-16** | **Should infants be charged the change fee?** | They are — 25 each, per the By-Pax rule, on scenario 10. Behaving exactly as configured. **Whether that is intended was asked on 2026-09-30 and is unanswered.** |
| **CN-17** | **Is `feeNTaxes` meant to carry the supplier-currency figure?** | It does, at two very different exchange rates, inside an object labelled with the agency currency. If intended, it is merely undocumented and ambiguously named; if not, it is wrong by a factor of the rate. Part of FINDING-R15. |
| **CN-18** | **Is the negative-base-fare filter's predicate correct?** | Confirmed deployed and intended (ProjectContext §2.5). The **presentation** of a fully-filtered result as an empty market is FINDING-R11; the predicate itself has had no product review. |
| **CN-19** | **Should `"Sabre Staging"` — a credential environment name — be visible to an agency at all?** | It is rendered as the supplier badge. The production equivalent is unknown to this run. Part of FINDING-R19. |
| **CN-20** | **Are the six undeclared app-origin derivations intended to be undeclared?** | The change fee set the precedent that app-origin values are *declared*. The lowest-fare badge, nonstop-throughout label, sector count, fare-held countdown and the name lookups are not. Names are FINDING-R20; the derived labels are recorded here because a wrong label is self-evident on screen while a wrong city name is not. |

---

## E. Untested interactions — no defect observed, no test either

| # | Concern |
|---|---|
| **CN-21** | **The fare-held countdown and the supplier's offer validity are two separate clocks.** The app's hold token has its own expiry; Sabre quotes its own `validUntil` (20 minutes on scenario 10). Their interaction is untested — an offer expired at the supplier could still display as held. Test case `TC-RMAPF-031` / `TC-RMAPX-060`. |
| **CN-22** | **Sort and filter controls have never been tested.** Client-side reordering and filtering must not alter, lose or duplicate an offer. `TC-RMAPF-017`, `TC-RMAPF-018`. |
| **CN-23** | **`isRepriceRequired` is `false` on every offer ever captured.** Its `true` branch has never run, on a screen where the agent is about to pay. Recorded alongside FINDING-R21. |
| **CN-24** | **The invoice carries no per-passenger-type split at all**, so the per-type reconciliation that works on Review & Pay cannot be completed at the Confirmation. Worth a decision. `TC-RMAPX-056`. |
| **CN-25** | **Cabin at journey level has no core counterpart.** Core carries cabin only inside the fare; the Portal appears to lift it to journey level. A journey-level cabin is not well-defined when segments differ, and that case has never been rendered. `TC-RMAPF-012`. |

---

## F. Assessed and deliberately NOT raised as defects

Recorded so they are not re-investigated, and so the reasoning survives.

| # | Item | Assessment |
|---|---|---|
| **CN-26** | **Segment duration "100 vs 130 minutes"** recorded in the mapping inventory from scenario 1. | **Cleared 2026-09-30.** Re-checked on scenario 10 across **25 segments at all three layers — zero mismatches**. The scenario-1 note almost certainly compared segment duration against journey duration. Not a defect. |
| **CN-27** | **"18 flight options" shown with only 12 cards rendered.** | **Not a defect.** A `Show more (12 of 18)` control; all 18 reachable. Nearly reported before the control was found — **verify pagination before asserting loss.** |
| **CN-28** | **Identical base fares across Adult, Child and Infant fare groups.** | **Not a defect.** Sabre genuinely returned the same figure for all three groups. Checked before raising. |
| **CN-29** | **Renames across hop A** — `segmentRefIds`→`segmentReferenceIds`, `passengerFareBreakdown`→`passengerFareBreakdowns`, `flightTime`→`flightTimeInMinutes`, `fareDescription`→`fareType`+`serviceClass`. | Individually harmless. **Collectively they mean no field name can be assumed stable across the hop** — recorded for the contract owner, not raised. |
| **CN-30** | **Ticket-number sequence gaps** (e.g. a skipped number between issued tickets). | **Not by itself a defect.** Scenario 10 skipped a number with all six travelers correctly ticketed. The test is per traveler, never per sequence. |
| **CN-31** | **Admin showing a larger wallet balance than the Portal.** | **Intended.** The `creditAgency` flag scopes the agency channel only. FINDING-R16 was raised and withdrawn the same day. Recorded in ProjectContext §2.5. |

---

## G. Method concerns — how this run was conducted

| # | Concern |
|---|---|
| **CN-32** | **A calculation error on scenario 5's confirmation was missed by the agent and caught by the user (2026-09-29).** The cause was not tooling: occurrences were being recorded without re-deriving the arithmetic behind them. The sweep that followed produced FINDING-R02's root-cause correction. **Recorded because a discovery report that hides how its own evidence was weakened is worth less than one that does not.** |
| **CN-33** | **Three findings were raised and withdrawn** (R09, R10, R16) and **four claims were falsified by later evidence** — R06's Critical escalation, R11's connection-point hypothesis, R12's multi-city hypothesis, and R15's "the wallet is debited the correct amount". All are retained rather than deleted: a withdrawn finding is the record of what was checked. |
| **CN-34** | **FINDING-R22 was observed once and never reproduced**, then sat as a risk line for nine scenarios. A security-adjacent observation should have been captured to its own evidence file the moment it was seen; the original request/response pair was not preserved. |
| **CN-35** | **Offer alignment by array index produces false mismatches.** Each layer calls Sabre separately and receives a different ordering. **An index-based comparison must never be used to raise a finding** — `TC-RMAP-050` exists to document this. |
| **CN-36** | **`responseId` must be extracted programmatically.** A hand-transcribed 758-character token was rejected as an invalid signature — an execution error that looked briefly like a defect. |
| **CN-37** | **A traceability break was introduced and fixed on 2026-09-30.** When the displayed-value suite was rewritten to remove specimen values, the `FINDING-Rxx` references were stripped along with them — leaving 16 of the 29 failing cases with no statement of which defect they belonged to. **Caught by the user asking why 29 failing cases had produced only 22 findings.** Restored, and the finding map now lives in the generator so it regenerates with the suite. |
| **CN-38** | **`CoverageReport.md` and `TraceabilityMatrix.md` were stale for part of 2026-09-30** — generated against the 57-case suite before the 60-case displayed-value suite existed, so they described 57 of 117 cases while presenting themselves as complete. **Both are now generated by parsing the suites on disk** rather than hand-maintained, so they cannot silently drift again. Regenerate after any suite change. |
| **CN-39** | **Case counts were misreported as 55 twice** before being checked against the exporter, which reports **57**. The generator's own tally was trusted instead of the authoritative tool. |
| **CN-40** | **`FINDING-R13` was reassessed on 2026-09-30 at the product owner's direction.** The *supplier fulfilment* failure — Sabre not issuing one ticket — is **not an application defect**, is understood to occur randomly, and is to be raised with the supplier. What remains with the application is narrower and still stands: it declared *"Exchange confirmed"* and took full payment **without verifying that each passenger holds a live document**, and the uniform blank ticket column made the one genuinely unticketed passenger indistinguishable from five correctly ticketed ones. **One occurrence in roughly seven exchanges — too small a sample to characterise a rate, and this scope does not claim it is systematic.** |
| **CN-41** | **The five outstanding `getBooking` calls now have a different purpose.** They are no longer about attributing fault to the application. They answer: *is there a passenger in an already-completed exchange who cannot board and nobody knows?* **If the supplier fails randomly, that possibility is higher, not lower** — which makes the check more valuable under the reassessment, not less. |
| **CN-42** | ~~Leading hypothesis for `FINDING-R14`~~ **CONFIRMED 2026-09-30 by the developer, in the source.** An explicit condition in the **reissue flow** (absent from direct book) suppresses the ticket-number update whenever the count returned by the core service does not match the passenger count. The competing pre-existing-gap explanation is **eliminated**. |
| **CN-43** | ~~The cheapest outstanding experiment: exchange a booking with missing numbers under complete fulfilment~~ **NO LONGER REQUIRED** — the developer's confirmation settles what the experiment was designed to separate. Do not spend an exchange on it. |
| **CN-44** | **Warning on how `FINDING-R14` must not be fixed.** The count check is defensible in intent: with five documents and six passengers, a positional join could **assign the wrong ticket to the wrong passenger**, which is worse than storing nothing. **Removing or relaxing the condition would turn an invisible gap into invisible corruption.** The supported fix is to join on the supplier's `travelerIndex` — present on every document and already proven sufficient in this run — store every number that joins, and mark the passenger that does not. |
| **CN-45** | **Severity wording across R13, R14 and the review queue overstated the exposure.** It described a passenger who "cannot board" and was "the only party with real exposure". **Every booking in this scope is Sabre CERT fixture data with fabricated names** — no person is or was affected. Corrected 2026-09-30 in all artifacts. The defect class is unchanged and severities are retained as an assessment of the behaviour **in production**, which is the only basis on which a CERT observation can be rated. **Lesson: a finding written from a test environment must say so, in the finding.** |