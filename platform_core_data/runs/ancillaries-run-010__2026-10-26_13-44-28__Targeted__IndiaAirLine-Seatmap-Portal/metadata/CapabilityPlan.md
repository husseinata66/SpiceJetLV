# Capability Plan — ancillaries / air-india

<!-- capability-binding: {"run":"ancillaries-run-010__2026-10-26_13-44-28__Targeted__IndiaAirLine-Seatmap-Portal","feature":"ancillaries","supplier":"air-india","capabilities":"61576e47dfc7b38f94a531c93b7651f7e3f3905daec43ccfebc5cacb4d046c94","suite":"7bcab756ec4d2e4dbf16637ae995832f84ece04fa2ef0e17eec9ae21c149f6f1","suitePath":"TestCases_AncillariesSeatMap.xlsx"} -->

| Bound to | Value |
|---|---|
| Run | `ancillaries-run-010__2026-10-26_13-44-28__Targeted__IndiaAirLine-Seatmap-Portal` |
| Feature | `ancillaries` |
| Supplier | `air-india` |
| Capability fingerprint | `61576e47dfc7b38f…` |
| Suite fingerprint | `7bcab756ec4d2e4d…` |

Generated 2026-10-26T12:06:13.958Z by `platform_core/tools/capability_gate` from `platform_core_data/supplier-features/ancillaries/shared/ancillaries-baseline/test_design/TestCases_AncillariesSeatMap.xlsx`.
Only the cases under **Will run** are executed. Excluded cases are reported with their reason and
kept out of executable scope and pass rate (manual-execution-skill §4.2).

## Supplier capabilities

| Capability | Value |
|---|---|
| Hold | Not Supported |
| Pay after Hold | Not Supported |
| Meal | Supported |
| Baggage | Supported |
| Seat | Supported |
| Bundle | Supported |

Supplier rules: None

## Will run (104)

`TC-SM-NAV-001`, `TC-SM-NAV-002`, `TC-SM-NAV-002b`, `TC-SM-NAV-003`, `TC-SM-NAV-005`, `TC-SM-RND-001`, `TC-SM-RND-002`, `TC-SM-RND-003`, `TC-SM-RND-005`, `TC-SM-RND-006`, `TC-SM-RND-007`, `TC-SM-RND-010`, `TC-SM-STA-002`, `TC-SM-STA-004`, `TC-SM-STA-005`, `TC-SM-STA-006`, `TC-SM-SEL-001`, `TC-SM-SEL-002`, `TC-SM-SEL-003`, `TC-SM-SEL-006`, `TC-SM-SEL-007`, `TC-SM-SEL-008`, `TC-SM-SEL-009`, `TC-SM-SEL-010`, `TC-SM-SEL-012`, `TC-SM-MPX-002`, `TC-SM-MPX-004`, `TC-SM-MPX-006`, `TC-SM-MPX-007`, `TC-SM-PRC-001`, `TC-SM-PRC-002`, `TC-SM-PRC-003`, `TC-SM-PRC-003b`, `TC-SM-PRC-004`, `TC-SM-BND-002`, `TC-SM-BND-003`, `TC-SM-BND-004`, `TC-SM-BND-005`, `TC-SM-GEN-003`, `TC-SM-PER-001`, `TC-SM-PER-002`, `TC-SM-PER-004`, `TC-SM-PER-007`, `TC-SM-NEG-003`, `TC-SM-NEG-004`, `TC-SM-NEG-006`, `TC-SM-A11Y-001`, `TC-SM-A11Y-002`, `TC-SM-PAX-001`, `TC-SM-PAX-003`, `TC-SM-PAX-004`, `TC-SM-PAX-006`, `TC-SM-PAX-007`, `TC-SM-FRC-001`, `TC-SM-FRC-002`, `TC-SM-FRC-003`, `TC-SM-FRC-005`, `TC-SM-ERR-001`, `TC-SM-ERR-002`, `TC-SM-ERR-004`, `TC-SM-ERR-005`, `TC-SM-EXR-001`, `TC-SM-EXR-002`, `TC-SM-EXR-003`, `TC-SM-EXR-004`, `TC-SM-EXR-005`, `TC-SM-EXR-007`, `TC-SM-RTP-001`, `TC-SM-RTP-003`, `TC-SM-RTP-004`, `TC-SM-MCT-003`, `TC-SM-MCT-004`, `TC-SM-MCT-007`, `TC-SM-MCT-005`, `TC-SM-MCT-006`, `TC-SM-RTP-005`, `TC-SM-CNF-001`, `TC-SM-CNF-002`, `TC-SM-CNF-003`, `TC-SM-CNF-004`, `TC-SM-CNF-007`, `TC-SM-CNF-008`, `TC-SM-CNF-010`, `TC-SM-CNF-011`, `TC-SM-CNF-012`, `TC-SM-CNF-015`, `TC-SM-CNF-016`, `TC-SM-CNF-017`, `TC-SM-CNF-018`, `TC-SM-PAX-008`, `TC-SM-PRC-005`, `TC-ML-001`, `TC-ML-002`, `TC-ML-003`, `TC-ML-004`, `TC-ML-005`, `TC-BG-001`, `TC-BG-002`, `TC-BG-003`, `TC-BG-005`, `TC-RPT-001`, `TC-RPT-002`, `TC-RPT-003`, `TC-RPT-004`

Of these, 2 are not yet approved at Review and will be excluded by the Review gate: `TC-SM-NEG-004`, `TC-SM-EXR-007`.

## Excluded — not supported by supplier (20)

| Test Case ID | Title | Reason |
|---|---|---|
| TC-SM-STA-007 | Women-only seats are marked clearly | Supplier rule "ladies-only-seats" does not apply to this supplier |
| TC-SM-GEN-001 | A women-only seat is refused to a male passenger | Supplier rule "ladies-only-seats" does not apply to this supplier |
| TC-SM-GEN-002 | A women-only seat is offered to a female passenger | Supplier rule "ladies-only-seats" does not apply to this supplier |
| TC-SM-GEN-002b | The hidden seat data matches what is shown on screen | Supplier rule "ladies-only-seats" does not apply to this supplier |
| TC-SM-GEN-004 | Each passenger sees their own seats in a mixed group | Supplier rule "ladies-only-seats" does not apply to this supplier |
| TC-SM-GEN-005 | Female titles are 'Ms' and 'Mrs', for children as well as adults | Supplier rule "ladies-only-seats" does not apply to this supplier |
| TC-SM-CAB-001 | The same flight gives a different map in each cabin | Supplier rule "business-cabin" does not apply to this supplier |
| TC-SM-CAB-002 | The fare package decides WHICH seats are offered, not only their price | Supplier rule "business-cabin" does not apply to this supplier |
| TC-SM-CAB-003 | 'Not offered' sections can be told apart from single taken seats | Supplier rule "business-cabin" does not apply to this supplier |
| TC-SM-CAB-004 | The Business row has its middle seats blocked | Supplier rule "business-cabin" does not apply to this supplier |
| TC-SM-CAB-005 | Packages, meals and bags change with the cabin | Supplier rule "business-cabin" does not apply to this supplier |
| TC-SM-CAB-007 | A two-cabin aircraft shows both cabins properly | Supplier rule "business-cabin" does not apply to this supplier |
| TC-SM-NAV-006 | A supplier with no seat selection shows no seat option | Only for suppliers without Seat — this supplier supports it |
| TC-ML-006 | A supplier with no meals shows no meal choice | Only for suppliers without Meal — this supplier supports it |
| TC-BG-006 | A supplier with no extra baggage shows no baggage choice | Only for suppliers without Baggage — this supplier supports it |
| TC-HLD-005 | Seats, meals and bags chosen before holding are kept on the held booking | Needs Hold — Not Supported by this supplier |
| TC-PAH-002 | Paying takes exactly the booking amount from the wallet | Needs Hold — Not Supported by this supplier; Needs Pay after Hold — Not Supported by this supplier |
| TC-PAH-003 | A price change between hold and payment is shown before paying | Needs Hold — Not Supported by this supplier; Needs Pay after Hold — Not Supported by this supplier |
| TC-PAH-004 | After payment the e-ticket is issued and matches the booking | Needs Hold — Not Supported by this supplier; Needs Pay after Hold — Not Supported by this supplier |
| TC-SM-BND-006 | A supplier with no fare packages shows no package step | Only for suppliers without Bundle — this supplier supports it |
