# TC-ANC-009 — Execution log (Portal, live)

- **Executed:** 2026-10-03, ~23:44–23:52 UTC · Portal `STG_PORTAL` (`http://192.168.1.213:9500`) · Agency `AGN9808`.
- **Mechanism:** Playwright MCP, headed, existing storage-state session (still valid).
- **Context:** performed as part of the same live Passenger Details flow used for TC-ANC-015/018
  (one-way DEL-DXB, 25 Oct 2026, 2 Adult + 2 Infant, cheapest offer 17,322 EGP) — booking not yet
  finalized at the point this case's steps were exercised.
- **Proposed status: Passed.**

## Steps

| # | Step | Result | Detail |
|---|---|---|---|
| 1 | Enter Adult 1 and Adult 2 passenger details | Pass | TestAdultNine One, TestAdultTen One, both complete and valid |
| 2 | Assign Infant 1 to Adult 1 | Pass | Infant "TestInfantNine One" → Assigned to "TestAdultNine One", accepted without error |
| 3 | Assign Infant 2 to Adult 2 | Pass | Infant "TestInfantTen One" → Assigned to "TestAdultTen One" (final state), accepted |
| 4 | Attempt to also assign Infant 2 to Adult 1 | **Pass** | Before settling on step 3's final value, Infant 2's "Assigned to" dropdown was deliberately set to "TestAdultNine One" (already holding Infant 1). The field immediately showed a validation error: **"This adult already assigned!"** (screenshot `01_duplicate_infant_assignment_blocked.png`). The selection was then corrected to "TestAdultTen One" (distinct Adult), and the error cleared immediately. |

**Additional observation:** the "Assigned to" dropdown itself does **not** remove/disable an
already-assigned Adult from its option list (both Adults remained selectable options for Infant 2
throughout) — enforcement happens via a field-level validation message after selection, not by
narrowing the choices upfront.

## Disposition

Infant 1 and Infant 2 are each accepted against a distinct Adult, and the system explicitly blocks
(with a clear inline error) assigning a second Infant to an Adult already holding one — exactly this
case's stated Expected Result. This is a real, enforced platform rule, not merely a common airline
convention left unenforced (resolving this case's own Notes caveat).

**Proposed TC-ANC-009 status: Passed.**
