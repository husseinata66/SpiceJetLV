# Reports and PNR Query — navigation inventory (run-009, Stage 2)

Captured from the Admin side menu, `http://192.168.1.60`, logged in as Mohamed Soliman, 2026-09-30.

**D-8 put "all Reports" in Regression scope. This is the first time the list has been enumerated.
There are fourteen.**

| # | Report | Route |
|---|---|---|
| 1 | Total Due Report | `/reports/total-ndc` |
| 2 | Agency Wallet Report | `/reports/agency-wallet` |
| 3 | Sales Report | `/reports/sales` |
| 4 | Sync. PNR Report | `/reports/sync` |
| 5 | Booking Report | `/reports/booking` |
| 6 | Quotation Report | `/reports/quotation` |
| 7 | Finance Report | `/reports/financial` |
| 8 | Statement Report | `/reports/statement` |
| 9 | Released PNR Report | `/reports/release` |
| 10 | AR Ledger Report | `/reports/ar-ledger` |
| 11 | Wallet History Report | `/reports/wallet-history` |
| 12 | Daily Sales Report | `/reports/daily-sales` |
| 13 | Import PNR Report | `/reports/pnr` |
| 14 | Transfer PNR Report | `/reports/transfer-pnr` |

**Outside the Reports group, in scope for this story:**

| Screen | Route | Story section |
|---|---|---|
| PNR Query | `/pnr-query` | §8 — AC-34, AC-36 |
| Search Booking | `/booking/search-booking` | Booking lookup used throughout |
| Exchange Fees (Rule Engine) | `/rule-engine/exchange-fees` | §1 prerequisite — D-4, D-7 |
| Service Charge (Rule Engine) | `/rule-engine/service-charge` | AC-31 — the fee is stored as a Service Charge |
| Credential Rate of Exchange | `/master/miscellaneous/roe-per-cred` | The ROE behind the currency findings |

## Test data used for this sweep

| Role | Original | New (reissued) | Order | GDS PNR | Shape |
|---|---|---|---|---|---|
| **Clean** | `NDCEG-BR-F260930LAlLPj` | `NDCEG-BR-F260930Vrf576` | `AGN10030NDCNDCORD2609306TCU5L` | `TTDMXL` | Portal, agency AGN10030, AED at ROE 0.1, 2 Adult + 2 Child + 2 Infant. All six travellers hold a live ticket and an EMD |
| **Broken** | `NDCEG-BR-F2609294YODAr` | `NDCEG-BR-F260929i2znhr` | `BRN503NDCORD260929KWPIEA` | `RPTIYO` | Admin, multi-city CAI→RUH→DMM, AED, 2 Adult + 2 Child + 2 Infant. Traveller 2 holds a spent ticket and no replacement — the Critical finding |

Sweeping both answers a question a single booking cannot: **does any report surface the
missing ticket, or do all fourteen show the broken exchange as successful?**
