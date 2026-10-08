# FINDING-R19 — The supplier label on screen is read from a refundability field, while the correctly-named supplier field sits unused

- **Finding ID:** FINDING-R19
- **Title:** The results grid and Review & Pay display the supplier as `properties.refundableInfo` — a field named for **refundability** that carries a **supplier environment name**. The same object also carries a correctly-named `supplierName` and a null `refundable`
- **Category:** Defect (Data model / Field semantics)
- **Severity (proposed):** **Medium.** Nothing is mis-priced and the label happens to render something sensible today. The damage is that a field's name does not describe its contents, in an object where the correctly-named alternative already exists. Any consumer — a report, an integration, a future screen — that reads `refundableInfo` for its stated purpose gets a supplier environment name instead of refundability, and `refundable` is `null` so there is no second source to fall back to
- **Status:** Pending Review (Stage 2, run-007)
- **Module / screen:** Reissue → Step 1 results grid and Step 2 Review & Pay; `POST /v2/reissue/{ref}/search` → `offers[].properties`
- **Found by:** Displayed-value mapping inventory (row `R14`, inventory gap §4.1), 2026-09-28. **Never raised as a numbered finding until now** — the inventory recorded it as *"Proposed: raise as a finding. Not previously recorded anywhere."*
- **Re-confirmed:** run-007 scenario 10, 2026-09-30

## Observed

Every offer's `properties` object, captured on scenario 10:

```json
"properties": {
  "supplierName":   "Sabre",           <- correctly named, and NOT what the screen shows
  "refundableInfo": "Sabre Staging",   <- named for refundability, carries the supplier environment
  "refundable":     null,              <- the actual refundability value, empty
  "multiCarrier":   false,
  "withBaggage":    null,
  "supplierType":   null
}
```

The screen renders **"Sabre Staging"** — the value of `refundableInfo`.

So one field in this object is read for a purpose its name does not describe, while the field whose
name does describe that purpose is present, populated, and unused.

## Why it is a defect and not merely untidy

Three things compound:

1. **`supplierName` already exists and is correct.** This is not a case of a missing field being
   improvised — the right field is there and populated with `"Sabre"`.
2. **`refundable` is `null`.** If a consumer wants genuine refundability it has no source at all, and
   the one field whose name suggests it would supply a supplier environment string.
3. **The value carried is an environment name, not even a supplier name.** `"Sabre Staging"` names a
   credential environment. Displaying it to an agency exposes an internal environment label on a
   customer-facing flow.

## Expected

The supplier label is read from `properties.supplierName`. `refundableInfo` describes refundability,
or is removed if it has no meaning. A field's name matches its contents.

## Actual

The supplier label is read from `refundableInfo`, `supplierName` is unused, `refundable` is null, and
the rendered string is an environment name.

## Steps to reproduce

1. Run any reissue search on either channel.
2. In the response, read `offers[<any>].properties`.
3. Compare `supplierName`, `refundableInfo` and `refundable`.
4. Compare each against the supplier label rendered on the offer card and on Review & Pay.

## Open question for the product owner

**Is `"Sabre Staging"` intended to be visible to an agency at all?** It names a credential
environment. On a production environment the equivalent string is unknown to this run and should be
checked before this finding is closed — the defect may be larger or smaller there.

## Related

- **FINDING-R05**, **FINDING-R03** — the same family: a correct value filed under a field that means
  something else. This one differs in that the correctly-named field is present and simply not read.

## Evidence

- `discovery/evidence/s10-portal-search-TTDMXL.json` — `offers[].properties` on every offer
- `discovery/evidence/ReissueFlow_MappingInventory_s1_run-007.md` — row `R14` and gap §4.1, where it
  was first identified and explicitly proposed for raising
