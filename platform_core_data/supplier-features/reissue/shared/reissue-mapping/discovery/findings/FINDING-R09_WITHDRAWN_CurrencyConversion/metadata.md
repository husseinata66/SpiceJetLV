# FINDING-R09 — WITHDRAWN. Not a defect.

- **Finding ID:** FINDING-R09
- **Status:** **WITHDRAWN 2026-09-29.** The behaviour is correct. No defect exists.
- **Original claim (wrong):** the AED currency conversion on the reissue was inverted / the rate was
  stored as its reciprocal
- **Raised:** 2026-09-28 · **Withdrawn:** 2026-09-29, both on run-007 scenario 6

## The behaviour is correct

The intended rate is **1 EGP = 9 AED** (user, 2026-09-29). The conversion is therefore
**EGP × 9 = AED**, which is exactly what the application does:

| | |
|---|---|
| core `modifyPrice.totalPayable` | 11,548.80 EGP |
| × RoE 9 | 103,939.20 AED |
| + change fee | 150.00 AED |
| **Portal / screen** | **104,089.20 AED** ✓ **correct** |

The old price is equally correct on its own rate: 31,346.80 EGP × **0.1** = **3,134.68 AED**, using
the 0.1 in force when it was issued. New rates apply to new prices (user), so the two blocks
carrying different rates is intended behaviour.

**Nothing in the chain is wrong.** The logic multiplies by the configured rate consistently, the
rate-versioning design works, the configuration field is labelled correctly, and the stored value is
what was intended.

## How the error was made, and corrected

Two wrong assumptions, each corrected by the user:

1. **First version:** claimed the code multiplied where it should divide. Withdrawn when the user
   confirmed the convention is multiply, and that the old rate was 0.1 — under which the
   application is internally consistent.
2. **Second version:** accepted multiply, but assumed "the rate is 9" meant *9 EGP per Dirham*, so
   the multiplier should have been ≈0.111 and 9 was its reciprocal. Withdrawn when the user stated
   plainly: **1 EGP = 9 AED**.

The root mistake was mine throughout: I reasoned from real-world EGP/AED rates (~13 EGP per Dirham)
and treated 104,089 AED as implausible for a six-passenger exchange. **The real-world rate is not
the system's rate**, and a configured rate needs no external justification. The arithmetic was never
in dispute — only my assumption about which direction the pair was defined in.

**Lesson for this scope:** a currency conversion can only be verified against the **configured**
rate and its stated direction. Plausibility against real-world rates is not evidence, and
"the number looks too big" is not a defect.

## The one real observation that survives

The wallet refused payment:

> *"Wallet is blocked. Please contact support."* · *"Your balance limit does not allow you to pay."*

Wallet 46,865.00 AED against a 104,089.20 AED charge. **This is simply insufficient funds** — correct
behaviour, and the second sentence states the real reason accurately. Recorded only so the
observation is not later mistaken for evidence of a pricing fault.

Not raised as a finding.

## Evidence retained

The scenario-6 captures remain valid as chain evidence — supplier, core and Portal agreed on every
non-monetary value, 29 offers at each layer, and the change fee applied correctly at 25 per
passenger (150.00 AED for six):

- `discovery/evidence/s6-core-reshop-PUBPBJ.json` / `s6b-core-reshop-PUBPBJ.json`
- `discovery/evidence/s6-portal-search-PUBPBJ.json` / `s6b-portal-search-PUBPBJ.json`
- `discovery/evidence/s6-sabre-getBooking-PUBPBJ-before.json`
- `discovery/evidence/s6b-review-and-pay-AED.png`
- `discovery/evidence/s6-capture-window.json`

**Scenario 6 still stands as the AED/currency coverage case** — it demonstrates the conversion works
correctly for a non-EGP agency. It also carries the third occurrence of **FINDING-R06** (ticket
`0654859779133` missing for a Child passenger), which is unaffected by this withdrawal.
