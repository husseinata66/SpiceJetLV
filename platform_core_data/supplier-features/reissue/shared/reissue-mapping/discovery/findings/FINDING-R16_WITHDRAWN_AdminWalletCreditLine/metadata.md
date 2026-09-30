# FINDING-R16 — WITHDRAWN — Admin's "Your Balance" includes the credit line; this is intended system behaviour

- **Finding ID:** FINDING-R16
- **Status:** **WITHDRAWN 2026-09-30**, the day it was raised, on the product owner's statement
- **Original title:** Admin's "Your Balance" adds a 9,999,999 credit line to the wallet that the Portal does not, on an agency flagged as not a credit agency
- **Withdrawn because:** the `creditAgency` checkbox governs the **agency-facing channel only**. It
  is not intended to constrain what Admin displays. Admin showing top-up + credit limit, while the
  Portal shows top-up only, is **system behaviour**
- **Authority:** user / product owner, 2026-09-30
- **Supersedes nothing. Superseded by:** ProjectContext §2.5, *Confirmed behaviours — not defects*

## What was measured — this part stands and is still useful

The arithmetic is correct and is retained as the **answer to OQ-M7**, which it does settle:

```
GET /odeysysadmin/Admin2/agency/10961  ->  paymentSetting
    creditLimit:   9999999
    creditAgency:  false

GET /odeysysportal/v2/financial/financial-details
    { "walletBalance": 8405996.2, "topUpBalance": 8405996.2,
      "creditLimit": null, "currencyCode": "EGP" }
```

```
Admin  "Your Balance"  =  topUpBalance + creditLimit   ( = 18,710,204.20 on 2026-09-27 )
Portal "Your Balance"  =  topUpBalance                 ( =  8,710,205.20 )
Difference             =  9,999,999.00  =  paymentSetting.creditLimit, exactly
```

Same agency on both sides: Portal `agentId` 10961 = Admin agency id 10961 = `AGN9780`.

**So the mapping rule is now known**, and that is worth keeping even though the finding is void:
the two channels bind different quantities by design, and the Portal's payload carries
`creditLimit: null` because the credit line is not exposed to the agency channel.

## What I got wrong

I treated **`creditAgency: false`** as meaning "this agency has no credit line, therefore including
it anywhere is wrong". That inference was mine, from the field name — the finding said so, but it
still drove the severity and the whole framing.

The flag does not mean what I assumed. It scopes **who sees the credit**, not **whether it exists**.
The credit line of 9,999,999 is real; the Portal simply does not show it to the agency.

I also argued a fallback position — that even if the difference were intended, one label over two
quantities is a defect regardless. That was the stronger half of the finding and I still think the
labelling is worth a product decision, **but it is a product-language opinion, not a defect**, and
the oracle for this scope is the implemented behaviour. Raising it as a defect was wrong. It is
recorded below as an observation for whoever owns the wording, with no defect status attached.

## Retained as an observation, not a defect

Admin and the Portal print different quantities under the wording "Your Balance". That is intended.
Whether the two channels should use different wording is a product decision for the owner, and no
finding is open against it.

## What is NOT withdrawn

**FINDING-R17 stands.** The Portal rendering the same value as `8,405,996.200` on the dashboard and
with two decimals on Review & Pay is an inconsistency *within one channel*, on one quantity, and is
untouched by this withdrawal — the credit-line rule says nothing about decimal places.

## Evidence

- `discovery/evidence/wallet-OQM7-reproduction.json` — retained; the measurements are sound and are
  the record of how OQ-M7 was answered
