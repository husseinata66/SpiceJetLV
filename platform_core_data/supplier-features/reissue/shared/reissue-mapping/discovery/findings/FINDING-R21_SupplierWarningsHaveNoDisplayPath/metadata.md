# FINDING-R21 — The core service carries a supplier `warnings` channel and the application has nowhere to show it

- **Finding ID:** FINDING-R21
- **Title:** `warnings` is present on every core reshop response and is **empty in every capture taken by this run**. It is the channel by which the supplier communicates conditions attached to an offer, and no screen in the reissue flow displays it. Its display path has therefore never executed
- **Category:** Defect candidate (Unsurfaced supplier communication / Untested path)
- **Severity (proposed):** **Medium, and honestly uncertain.** If the supplier only ever emits advisory text, this is Low. If it emits conditions that bear on whether an exchange is valid — fare-rule caveats, partial-fulfilment notices, penalty qualifications — then an agency is paying without seeing what the airline said, and it is High. **This run cannot tell which, because the array was empty in every capture.** The severity should be set once one non-empty `warnings` is seen
- **Status:** Pending Review (Stage 2, run-007)
- **Module / screen:** Reissue → all three steps; `POST /api/v1/reissue/reshop` → `warnings`
- **Found by:** Displayed-value mapping inventory gap §4.6, 2026-09-28. **Never raised as a numbered finding until now**
- **Re-confirmed:** run-007 scenario 10 — `warnings: []` on the full 18-offer response

## Observed

Every core reshop response carries a top-level `warnings` array. Across every capture in this run —
ten scenarios, two currencies, three trip types — it has been `[]`.

The application has no element on any reissue screen that would render its contents.

**So the field is not merely unused: the code path that would surface a warning has never run, and
would first run in production on a live booking.**

## Why an empty array is worth a finding

A value that is always empty in testing is the classic shape of an untested failure path. Two
possibilities, and this run cannot distinguish them:

1. **The supplier rarely or never populates it**, in which case the correct action is a decision to
   drop it, recorded — not silence.
2. **The supplier populates it under conditions this run never created** — an unusual fare rule, a
   partial availability, a penalty qualification. Every offer captured here was an ordinary add-collect
   on a single carrier.

The second is not unlikely: the run never exercised a refund, an even exchange, a multi-fare-group
party, or a non-Economy cabin — the exact circumstances a supplier is most likely to qualify.

## Sibling fields in the same condition

The inventory records four more core fields that never reach any screen:

| Field | Observed | Assessment |
|---|---|---|
| `warnings` | `[]` in every capture | **This finding** |
| `isRepriceRequired` | `false` on every offer | **Worth its own attention** — if it can ever be `true`, the agent is not told the offer must be repriced before payment |
| `haveBundles` | `null` | Likely out of scope for reissue |
| `canBeHeld` | `null` | Likely out of scope for reissue |
| `responseId` | used internally | Correctly not displayed |

`isRepriceRequired` deserves a decision alongside `warnings`: it is a boolean whose `true` branch has
never been observed, on a screen where the agent is about to spend money.

## Expected

Either the supplier's warnings are surfaced to the agent before payment, or a recorded decision
states that they are deliberately not surfaced and why. An always-empty channel with no display path
and no decision is neither.

## Actual

Present at core, empty in all testing, unsurfaced, undecided.

## Steps to reproduce

1. Run any reissue reshop and read the core response's top-level `warnings`.
2. Confirm it is `[]`.
3. Confirm no reissue screen contains any element that would render it if it were not.

## What would close this

**One non-empty `warnings` response.** Until then the severity above is a judgement, not a
measurement. Candidate conditions most likely to produce one are the same ones this run never
reached — a refund, a multi-fare-group party, a non-Economy cabin — which ties this finding to
Declared Gaps **G1**, **G2** and **G5**.

## Related

- **FINDING-R07** — a failed book call that tells the agent nothing. Same theme: the application has
  no channel for the supplier's own words.
- Declared Gaps **G1**, **G2**, **G5** — the untested conditions most likely to produce a warning.

## Evidence

- `discovery/evidence/s10-core-reshop-TTDMXL-B.json` — `warnings: []` alongside 18 offers
- `discovery/evidence/ReissueFlow_MappingInventory_s1_run-007.md` — gap §4.6
