# QA Assessment Report — reissue-flow (Stage 2)

| | |
|---|---|
| **Scope** | Supplier Features → `reissue` → Shared scope `reissue-flow` — **the business feature** |
| **Run** | `run-009__2026-09-30_17-25-03__UserStory__ReissueFlowBusinessFeature` |
| **Scope family** | `supplier-feature` · feature `reissue` · `sharedScope: reissue-flow` · `supplier: null` |
| **Upstream** | `context/ProjectContext.md` **Revision 6** |
| **Stage** | 2 — Explorer *(shared)* |
| **Checkpoint** | **Human Review Required** — this report is **Pending Review** |
| **Period** | 2026-09-26 → 2026-09-27 (run-007, before the scope split) · 2026-09-30 (run-009, this sweep) |
| **Layers in scope** | UI · E2E · Regression *(API, Contract, Integration moved to `reissue-mapping`; DB deferred; Security and Performance out)* |

## 1. What this report is, and why it exists late

This scope was explored first and written up last. Stage 2 ran against it on 2026-09-26/27 and
produced **85 evidence files** and one finding, and was then **retargeted to `reissue-mapping`** by the
scope split before its report was written. The registry has read `discovery: Not Started` ever since,
which understates what was gathered and overstates what was finished.

This report closes that. It covers three bodies of evidence:

1. **run-007's pre-split exploration of this scope** — eligibility, the credential rule, the re-shop
   widget, journey and passenger selection, Review & Pay, Portal parity, Itinerary time rendering.
2. **run-007's ten mapping scenarios**, which completed human-clicked exchanges end to end and are
   business evidence even though they were gathered under a mapping lens.
3. **run-009's targeted sweep of the two areas nobody had ever opened** — Reports and PNR Query.

**What this report does not do is re-derive the mapping.** That scope answered whether each displayed
value comes from the field it should; its verdict is that **both hops returned zero value
mismatches**. This report takes that as given and asks the business question instead: is the
behaviour right, is the label right, and does the flow hold together across screens.

## 2. Verdict

**The flow works. What it reports about itself is not reliable.**

Every screen in the story's path — Itinerary entry, eligibility, journey and passenger selection,
re-shop, results, Review & Pay, Confirmation — behaves and completes. Exchanges succeed and produce
valid new bookings. The defects are concentrated in what happens *after* the exchange: what the
application records, what it displays about the record, and what its reports say.

Three families, and the third is new to this report:

| Family | Where it lives | Nature |
|---|---|---|
| **Ticketing integrity** | Confirmation, Itinerary, PNR Query | Documents the supplier holds that the app does not — and in one case a passenger the supplier never ticketed at all |
| **Money reported inconsistently** | Review & Pay, PNR Query, Sales Report, wallet | One charge carrying up to **four** different values depending on where it is read |
| **Labels that change meaning without saying so** | PNR Query, Confirmation | A column that means *fare* on one booking and *fare difference* on the next |

## 3. What the Reports and PNR Query sweep found

This was the gap the sweep existed to close. D-8 put **all** reports in Regression scope and nobody
had opened one. **There are fourteen.** Full structure in `evidence/r009-reports-sweep.md`.

### 3.1 No report can identify a reissue — RPT-1

Not one of the fourteen has a Reissue filter, flag, or column. A reissue enters every financial
report as an ordinary new booking at its full new value. Finance Report's date selector offers
**Booking Date** or **Refund Date**; a reissue is neither. Only **Total Due** can be filtered by
Booking Reference at all.

**AC-35 requires that "Wallet, Finance and all related reports are reviewed for Reissue impact."
This is that review, and its answer is that the reports cannot see reissues as a category.** No AC
states they must, so this is raised as a **product question**, not a defect.

### 3.2 A reissue is counted as a second full sale — RPT-2

Sales Report returns the original and the reissue as adjacent, indistinguishable rows:
**410,755.19** and **348,235.19** — *758,990.38 of recorded sales for one journey sold once and
changed once*, where the economic event was a 62,520 fare increase plus a 114 change fee. Whether
gross-value counting is intended is a business ruling nobody has made.

### 3.3 One charge, three values on three screens — RPT-3

| Where | Value |
|---|---|
| Sales Report, `Sales Amount` | 410,755.**19** |
| PNR Query, Reissue History `Amount` | 410,755.**20** |
| PNR Query, Payment Info `Amount Received` | **410,756** |

Truncated, exact, and rounded up. `FINDING-R18` already establishes the **wallet is debited the
rounded-up figure** — the largest of the three. This sweep adds a fourth behaviour, truncation, in
the reporting layer, which no existing finding covers.

### 3.4 The ticketing failure IS visible from PNR Query — the most useful thing found

The mapping run concluded its Critical finding was "invisible from every screen" and reachable only
by querying Sabre directly. **On PNR Query it surfaces, in three places:**

1. Ticket Number **blank for passengers 2, 4 and 6** on the original booking — the positional
   even-numbered pattern — where Sabre holds real documents for all three.
2. Ticket Number **`N/A` for all six** on the reissued booking, where Sabre holds live tickets for
   five.
3. **Reissue History's `Ticket` column reads `N/A`** for the Reissue row. On the clean booking the
   same column carries a real ticket number.

**That third one is a detectable signal**, and the clean booking proves the column populates when
ticketing succeeds. It gives the control the mapping run recommended — *verify per-passenger
ticketing after every exchange* — a cheap UI-level acceptance check instead of a supplier API call.

### 3.5 AC-34 and AC-36 now have observed expected results

PNR Query returns **both bookings stacked**, original marked `Reissued` and new marked `Booked`, with
Reissue History on the original carrying eight columns. That is AC-34's expected result, captured.
The fourteen reports' filter structures are AC-36's regression baseline, captured.

**AC-28 cannot be tested here.** PNR Query offers `Void`, `Manual Reissue` and `Refund` and **no Sync
action at all** — on reissued and ordinary bookings alike. Sync's absence is a property of the
screen, not of the reissue. The AC-28 negative check belongs on the Itinerary, where Sync exists.

## 4. A correction this report makes about its own evidence

**During this sweep I recorded a serious defect that was not one, and the chain disproved it within
the hour.** It is kept here rather than deleted, because the reasoning is the point.

On the reissued booking, PNR Query shows `Net Basic` of **46701 for every passenger** — adult, child
and infant alike — where the original differentiates them (47637 / 35964 / 4671). Read as a fare,
that is an infant billed a tenfold overcharge, and that is how I first recorded it.

Tracing it through the captures already on disk:

- **Sabre** sent `priceDifference.baseFare: "5189.00"` on the **CNN** group — identical to the adult group;
- **core** carried `ADT = CHD = INF = 5189` on that offer (and differentiated correctly on others in the same response);
- **screen** shows 5189 × 9 = **46,701**, the configured rate of exchange, exactly.

**The mapping is faithful and nobody was overcharged.** The figure is a **price difference**, not a
price, and a difference can legitimately be identical across passenger types when everyone moves
between the same two flights.

**What survives is a labelling defect, and it is real.** `Net Basic` carries the passenger's *base
fare* on an ordinary booking and their *base fare difference* on a reissued one — same column, same
label, two quantities, switching on booking type, with nothing on screen to say which you are
reading. That is a right number under a wrong label: precisely the failure the sibling scope tests
key meaning for, and precisely what a value-equality check would never catch.

**The method lesson:** a value that looks wrong on a reissue screen must be traced before it is
raised, because on this feature half the figures are deltas and half are totals.

## 5. Findings

| ID | Severity | Title | Status |
|---|---|---|---|
| **FINDING-R01** | Medium | Itinerary flight times shifted by the browser time zone — the reissue results grid and confirmation render the same values correctly | Pending Review *(raised run-007)* |
| **FINDING-F01** | **Proposed High** | `Net Basic`/`Gross Basic` carry the fare *difference* on a reissued booking under a label that means fare | **New, this report** |
| **FINDING-F02** | **Proposed Medium** | One charge reported as three different values across Sales Report and PNR Query — truncated, exact and rounded up | **New, this report** |
| **FINDING-F03** | **Proposed Low** | Reissue History is populated only on the original booking; the reissue has no link back to what it replaced | **New, this report** |

**Fourteen further findings are live in `reissue-mapping`** and are not re-raised here — one finding,
one owner. ProjectContext §1.3.1 maps each onto the screens and ACs where a user meets it, and this
scope's suite carries the regression case for each on that screen.

## 6. Open questions this report raises

| # | Question | Affects |
|---|---|---|
| **OQ-F1** | **Should any report be able to identify a reissue?** No AC requires it; AC-35 requires only that the impact be reviewed. A product ruling decides whether RPT-1 is a gap or the design | AC-35, AC-36 |
| **OQ-F2** | **Is counting a reissue as a second full sale intended?** Some operators count gross ticketed value; the report gives no way to net it | AC-35 |
| **OQ-F3** | **Must Reissue History link backwards** from the reissue to the original, or is the forward link sufficient? | AC-27, AC-33 |
| **OQ-F4** | **What should the reissue columns be labelled?** FINDING-F01 needs a product answer on whether the column changes label, gains a qualifier, or shows both quantities | AC-16, AC-17 |

**Carried unchanged from Stage 1**, all still open: OQ-3, OQ-7 … OQ-13 — negative-path test data,
unconfigured exchange fees, DB access, failure-path statuses, low-balance wallet, forced reprice, and
the absent Reissue-specific UI design.

## 7. Two discrepancies that block an expected result, not a step

Stage 3 can write these cases but cannot fix their expected result:

- **DS-2 — hidden button, or shown-and-refused?** CL-1 says the Reissue button is shown and the
  reissue refused on click with a named message. Observed: **hidden, no message** — reproduced with
  the prior run's exact setup, read as the lock holder, so the credential is not the cause. The
  behaviour changed after the prerequisite story passed. Affects AC-02, AC-05.
- **DS-6 — Branch/Agency flag precedence.** The story's edge cases define a precedence neither the
  clarification nor the prerequisite run states, and the combination was never tested. Affects AC-03.

Under the run's requirement-precedence rule the story is the authority until contradicted by
evidence, so these cases are written to the story and carry `Expected result: Pending Confirmation`.
They are not dropped, and not silently written to the observed behaviour.

## 8. Gap analysis

| | |
|---|---|
| **Explored and behaving** | Itinerary entry · eligibility · journey/passenger selection · re-shop widget · results · Review & Pay · Portal parity · Confirmation · Itinerary · **Reports (14) · PNR Query** |
| **Explored and defective** | Post-exchange ticket records · money reporting consistency · reissue column labelling · Itinerary time rendering |
| **Never exercised** | **The Price Changed popup** — a supplier reprice cannot be forced (OQ-12). **Failure-path statuses** `Not Booked` / `Booking Fail` (OQ-10). **Insufficient wallet** (OQ-11). **Offline / non-reissue-supplier negatives** (OQ-7). **Unconfigured exchange fee** (OQ-8) |
| **Not testable this run** | **AC-26, AC-30** — DB assertions, layer `Deferred`, no access (OQ-9). Declared Gaps on the manifest |
| **Executed only once** | Thirteen of the fourteen reports were opened and their filters captured but not run against the test bookings. Sales Report was run end to end |

## 9. Recommendation

1. **Proceed to Stage 3.** The Acceptance Criteria map in ProjectContext §7.1 — 25 fully verifiable,
   8 partial, 2 DB-blocked — plus this report's observed expected results for Reports and PNR Query
   are a sufficient basis. Nothing further needs discovering before cases can be written.
2. **Get a product ruling on OQ-F1, OQ-F2 and OQ-F4 before the suite is approved.** Each decides an
   expected result rather than a step, and each is cheap to answer.
3. **Adopt the Reissue History `Ticket` column as the post-exchange ticketing check.** It is the
   cheapest available detector for the Critical mapping finding and needs no supplier call.
4. **Settle DS-2 with the product owner.** It blocks the eligibility cases, which are the story's
   entry point.
5. **Supply the negative-path test data** (OQ-7, OQ-8, OQ-10, OQ-11) or accept those ACs as Declared
   Gaps on the record.

## 10. Artifacts

| | |
|---|---|
| `evidence/r009-reports-inventory.md` | The fourteen reports, their routes, and the test data used |
| `evidence/r009-reports-sweep.md` | Filter structure of all fourteen; Sales Report run end to end; RPT-1 … RPT-3 |
| `evidence/r009-pnrquery-observations.md` | PNR Query structure, both bookings, OBS-1 … OBS-8 including the corrected OBS-6 |
| `evidence/r009-pnrquery-*.png`, `r009-report-sales-BRN503.png` | Screen captures |
| `evidence/` (85 files from run-007) | Pre-split exploration: `cl1-*` credential rule · `d1-*` config and entry · `d2*-*` widget and results · `d3-*` selection, review, errors · `p*-*` Portal flow · `tz-*` time zones |
| `findings/FINDING-R01_*` | Itinerary time shift |
| `../../reissue-mapping/discovery/` | The sibling scope's report, ten scenarios and fourteen findings |
