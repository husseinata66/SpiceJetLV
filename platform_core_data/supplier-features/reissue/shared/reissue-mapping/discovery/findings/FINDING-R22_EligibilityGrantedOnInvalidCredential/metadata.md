# FINDING-R22 — The core service reported a booking changeable when asked with a nonsense credential

- **Finding ID:** FINDING-R22
- **Title:** A reissue eligibility/reshop call made with a **deliberately invalid supplier credential** returned `200` and reported the booking as changeable, rather than rejecting the credential
- **Category:** Defect candidate (Authorization / Input validation) — security-adjacent
- **Severity (proposed):** **High if confirmed, and currently UNCONFIRMED.** If a credential is not validated before an availability answer is given, the answer cannot be trusted to belong to that credential's inventory, and the boundary between agency credentials is in question. **Recorded at High to ensure it is re-tested, not because High has been demonstrated**
- **Status:** **Pending Review — and explicitly UNREPRODUCED.** See "What is actually known" below
- **Module / screen:** `POST /api/v1/reissue/reshop` / eligibility path
- **Found by:** run-007 scenario 1, 2026-09-26/27, recorded as risk **RSK-M3** in ProjectContext §6
- **Raised as a finding:** 2026-09-30

## What is actually known — read this before acting

This is a **single observation from scenario 1 that was never repeated**. It was recorded as a risk
rather than a finding at the time and then not returned to across nine further scenarios.

**What was observed:** a call carrying a nonsense credential value returned `200` and described the
booking as changeable.

**What was NOT established:**

- Whether the credential was actually reaching the supplier, or whether the response was served from a
  cached or previously-validated context in the same session.
- Whether the offers returned were real supplier offers for that credential, or a replay.
- Whether the same call from a clean session behaves the same way.
- Whether any later, paid operation would also have accepted the bad credential — **nothing was
  booked or paid on it.**

**This finding is raised to force a re-test, not to assert a proven vulnerability.** Stating it as
proven would overclaim from one unreproduced observation; leaving it as a buried risk line after ten
scenarios would be worse, because nobody would look at it again.

## Why it matters if it is real

Credential validation is the boundary between one agency's supplier access and another's. An
availability answer given without validating the credential is an answer whose provenance is unknown.
The reissue flow then prices and, eventually, pays against that answer.

## Expected

A call carrying an invalid or unknown supplier credential is rejected with an authentication or
authorization error **before** any availability answer is produced. No `200`, no offer set, no
eligibility verdict.

## Actual

`200`, with the booking reported as changeable.

## Steps to reproduce — the priority action

1. Start a **clean session** with no prior successful call for the booking.
2. Call the eligibility / reshop path with a credential value that does not exist.
3. Record the status code and the full body.
4. Repeat with a credential that exists but belongs to a **different agency**.
5. If either returns `200`, compare the offer set against one obtained with the correct credential —
   identical offers would indicate the credential is ignored rather than merely mis-validated.

> Step 4 is the one that matters most and was never performed. It distinguishes "validation is weak"
> from "credentials are not segregated", which are very different problems.

## Not established

Everything about the cause. `logs/detail.log` — never accessible in this run — would show whether the
credential reached the supplier at all. This is the **sixth** finding that log blocks.

## Related

- **RSK-M3** in ProjectContext §6, where this has sat as a risk since 2026-09-26.
- Test case `TC-RMAP-028`, written against this and currently unexecuted.
- **Declared Gap G8** — `logs/detail.log`.

## Evidence

- run-007 scenario 1 capture set. **The original request/response pair for the nonsense-credential
  call was not preserved as a standalone evidence file** — which is itself a lesson: a security-
  adjacent observation should have been captured to its own file at the moment it was seen.
