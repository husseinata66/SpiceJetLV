# FINDING-R10 — WITHDRAWN. Not a defect.

- **Finding ID:** FINDING-R10
- **Status:** **WITHDRAWN 2026-09-29.** The behaviour is correct and by design.
- **Original claim (wrong):** the Reissue control was absent on a booking whose API reported
  `canAutoReissue: true`, and the lock could not be taken
- **Raised and withdrawn:** the same day, run-007 scenario 8

## The behaviour is correct

The Reissue / Manual Reissue / Sync PNR / Release PNR controls are **gated on holding the booking
lock**. Take the lock and they appear. That is a deliberate workflow — an agent must claim the
booking before acting on it — not a fault.

Confirmed on the same booking, `NDCEG-BR-F260929u1ptMk` (order `BRN503NDCORD260929NWUZ06`):

| | Before (no controls) | After the lock was taken |
|---|---|---|
| `lockedStatus` | 0 | **1** |
| `lockedBy` | 0 | **13134** |
| `lockHolderName` | `""` | **"Mohamed Soliman"** |
| `canReleaseLock` | false | **true** |
| Controls rendered | Time Limit, History only | **Void/Cancel, Manual Reissue, Sync PNR, Release PNR, Reissue, Receive Payment** |

Everything else in `actionsDetails` is unchanged between the two states. `canAutoReissue: true`
means the booking *is* reissuable — which it is; it simply also has to be locked first.

## What I got wrong

Two mistakes, both mine:

1. **I read `canAutoReissue: true` as "the control should be visible now."** It is not a rendering
   instruction — it states the booking's eligibility. Visibility additionally requires the lock.
2. **I concluded the lock could not be taken** because I could not find the control. The Lock column
   in the search results rendered empty and I found no affordance on the detail page, so I reported
   it as unavailable. It is available — the user took the lock without difficulty. Absence of
   evidence in the places I looked was not evidence of absence.

**Lesson for this scope:** a control that is missing is not automatically a defect. Where an action
has a precondition — a lock, a credential, a status — the correct question is *what state does this
action require*, not *why is the button not here*. The earlier CL-1 / DS-2 observation on the Portal
(Reissue hidden when the booking's credential is not selected) is the same shape and should be
re-examined in that light rather than assumed to be a fault.

## What survives

Nothing as a finding. One note worth keeping for test design: **the reissue flow has a precondition
that no test had captured** — the booking must be locked by the acting user. Any automated reissue
test must take the lock first, or it will find no control and appear to fail.

## Evidence

- `discovery/evidence/s8-admin-itinerary-before.json` — unlocked, no controls
- `discovery/evidence/s8-admin-itinerary-locked.json` — locked by Mohamed Soliman, controls present
