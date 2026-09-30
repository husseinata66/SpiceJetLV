# FINDING-R17 — The Portal renders the wallet balance with three decimal places on the dashboard and two on Review & Pay

- **Finding ID:** FINDING-R17
- **Title:** The same wallet balance, on the same channel, in the same session, is printed as `8,405,996.200` in the dashboard's `balance-amount` element and as a two-decimal figure on Review & Pay. EGP has two decimal places
- **Category:** Defect (Currency formatting inconsistency)
- **Severity (proposed):** **Low.** Nothing is mis-charged and no figure is wrong — 8,405,996.200 and 8,405,996.20 are the same number. The damage is that a currency amount is printed with a precision the currency does not have, differently in two places in one application, which makes screenshots of the wallet unreliable as evidence and invites the reader to wonder which one is rounded
- **Status:** Pending Review (Stage 2, run-007)
- **Module / screen:** Portal dashboard and sidebar wallet (`.balance-amount`); Reissue → step 2 Review & Pay, Payment method
- **Answers:** the decimals half of **OQ-M7**
- **Found by:** run-007, observed 2026-09-27, reproduced 2026-09-30
- **Agency:** `AGN9780` · `NDC2_Mohamed Soliman` · EGP

## Observed

`GET /odeysysportal/v2/financial/financial-details` at 2026-09-30 10:06:59Z returned:

```json
"walletBalance": 8405996.2,
"currencyCode":  "EGP"
```

The Portal dashboard prints that value in **two** places, both inside elements of class
`balance-amount`, both as:

```
8,405,996.200
```

The Review & Pay page prints the same quantity with two decimals. The original 2026-09-27 reading
showed the same split: sidebar `8,710,205.200`, page `8,710,205.20`.

So the three-decimal format is attached to the `balance-amount` component, not to the value and not
to the channel.

## It is formatting, not a wrong value

The service returns `8405996.2` — a number with one meaningful decimal digit. Both renderings are
faithful to it. This is **not** a member of the float-precision family recorded in FINDING-R12 and
FINDING-R15, where the stored value itself carried spurious digits (`170161.21`, `51932.801`). Here
the stored value is clean and only the display format varies.

That distinction matters for the fix: this one is a formatting pipe, those are arithmetic.

## Expected

A currency amount is rendered with that currency's decimal places, identically everywhere in the
application. EGP is two.

## Actual

Three decimals in the wallet component, two elsewhere, for one value.

## Steps to reproduce

1. Sign in to the Portal as `AGN9780`.
2. On `/dashboard`, read the wallet figure — three decimals.
3. Open any reissue to step 2 Review & Pay and read the wallet under Payment method — two decimals.
4. `GET /odeysysportal/v2/financial/financial-details` and compare both against `walletBalance`.

## Not established

- Whether the three-decimal format applies to every currency or only to those whose value happens to
  end in a single decimal digit. One currency (EGP) was measured. An AED agency's wallet would answer
  it; if the component has a hardcoded three-decimal pipe the format will be identical there.

## Related

- **FINDING-R16** — the same field's value differs between channels. Separate cause, separate fix,
  same screen element.
- **FINDING-R12**, **FINDING-R15** — spurious decimals that *are* in the stored value. Named here
  only to record that this finding is deliberately **not** one of them.

## Evidence

- `discovery/evidence/wallet-OQM7-reproduction.json` — the service payload and both rendered strings
  with the CSS class they were read from
- `discovery/evidence/CoreService_vs_Screen_run-007.md` — the 2026-09-27 sidebar/page split
