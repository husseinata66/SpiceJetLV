# Capability Plan — ancillaries / flynas-ndc

Generated 2026-09-27T20:00:01.643Z by `platform_core/tools/capability_gate` from `C:/Users/Mohanad Dawood/Desktop/SeatMap/TESTCASES-SEATMAP-v7-simple.xlsx`.
Only the cases under **Will run** are executed. Excluded cases are reported with their reason and
kept out of executable scope and pass rate (manual-execution-skill §4.2).

## Supplier capabilities

| Capability | Value |
|---|---|
| Hold | Not Supported |
| Pay after Hold | Not Supported |
| Book | Supported |
| Meal | Supported |
| Baggage | Supported |
| Seat | Supported |
| Bundle | Supported |

Supplier rules: ladies-only-seats

## Will run (114)

`TC-SM-NAV-001`, `TC-SM-NAV-002`, `TC-SM-NAV-002b`, `TC-SM-NAV-003`, `TC-SM-NAV-005`, `TC-SM-RND-001`, `TC-SM-RND-002`, `TC-SM-RND-003`, `TC-SM-RND-005`, `TC-SM-RND-006`, `TC-SM-RND-007`, `TC-SM-RND-010`, `TC-SM-STA-002`, `TC-SM-STA-004`, `TC-SM-STA-005`, `TC-SM-STA-006`, `TC-SM-STA-007`, `TC-SM-SEL-001`, `TC-SM-SEL-002`, `TC-SM-SEL-003`, `TC-SM-SEL-006`, `TC-SM-SEL-007`, `TC-SM-SEL-008`, `TC-SM-SEL-009`, `TC-SM-SEL-010`, `TC-SM-SEL-012`, `TC-SM-MPX-002`, `TC-SM-MPX-004`, `TC-SM-MPX-006`, `TC-SM-MPX-007`, `TC-SM-PRC-001`, `TC-SM-PRC-002`, `TC-SM-PRC-003`, `TC-SM-PRC-003b`, `TC-SM-PRC-004`, `TC-SM-BND-002`, `TC-SM-BND-003`, `TC-SM-BND-004`, `TC-SM-BND-005`, `TC-SM-GEN-001`, `TC-SM-GEN-002`, `TC-SM-GEN-002b`, `TC-SM-GEN-003`, `TC-SM-GEN-004`, `TC-SM-GEN-005`, `TC-SM-PER-001`, `TC-SM-PER-002`, `TC-SM-PER-004`, `TC-SM-PER-007`, `TC-SM-NEG-003`, `TC-SM-NEG-004`, `TC-SM-NEG-006`, `TC-SM-A11Y-001`, `TC-SM-A11Y-002`, `TC-SM-CAB-001`, `TC-SM-CAB-002`, `TC-SM-CAB-003`, `TC-SM-CAB-004`, `TC-SM-CAB-005`, `TC-SM-CAB-007`, `TC-SM-PAX-001`, `TC-SM-PAX-003`, `TC-SM-PAX-004`, `TC-SM-PAX-006`, `TC-SM-PAX-007`, `TC-SM-FRC-001`, `TC-SM-FRC-002`, `TC-SM-FRC-003`, `TC-SM-FRC-005`, `TC-SM-ERR-001`, `TC-SM-ERR-002`, `TC-SM-ERR-004`, `TC-SM-ERR-005`, `TC-SM-EXR-001`, `TC-SM-EXR-002`, `TC-SM-EXR-003`, `TC-SM-EXR-004`, `TC-SM-EXR-005`, `TC-SM-EXR-007`, `TC-SM-RTP-001`, `TC-SM-RTP-003`, `TC-SM-RTP-004`, `TC-SM-MCT-003`, `TC-SM-MCT-004`, `TC-SM-MCT-007`, `TC-SM-MCT-005`, `TC-SM-MCT-006`, `TC-SM-RTP-005`, `TC-SM-CNF-001`, `TC-SM-CNF-002`, `TC-SM-CNF-003`, `TC-SM-CNF-004`, `TC-SM-CNF-007`, `TC-SM-CNF-008`, `TC-SM-CNF-010`, `TC-SM-CNF-011`, `TC-SM-CNF-012`, `TC-SM-CNF-015`, `TC-SM-CNF-016`, `TC-SM-CNF-017`, `TC-SM-CNF-018`, `TC-SM-PAX-008`, `TC-SM-PRC-005`, `TC-ML-001`, `TC-ML-002`, `TC-ML-003`, `TC-ML-004`, `TC-ML-005`, `TC-BG-001`, `TC-BG-002`, `TC-BG-003`, `TC-BG-004`, `TC-BG-005`, `TC-HLD-007`

Of these, 11 are not yet approved at Review and will be excluded by the Review gate: `TC-ML-001`, `TC-ML-002`, `TC-ML-003`, `TC-ML-004`, `TC-ML-005`, `TC-BG-001`, `TC-BG-002`, `TC-BG-003`, `TC-BG-004`, `TC-BG-005`, `TC-HLD-007`.

## Excluded — not supported by supplier (17)

| Test Case ID | Title | Reason |
|---|---|---|
| TC-SM-NAV-006 | A supplier with no seat selection shows no seat option | Only for suppliers without Seat — this supplier supports it |
| TC-BK-001 | A supplier that cannot book offers no 'Book' button | Only for suppliers without Book — this supplier supports it |
| TC-ML-006 | A supplier with no meals shows no meal choice | Only for suppliers without Meal — this supplier supports it |
| TC-BG-006 | A supplier with no extra baggage shows no baggage choice | Only for suppliers without Baggage — this supplier supports it |
| TC-HLD-001 | A 'Hold' option is offered for a supplier that supports holding | Needs Hold — Not Supported by this supplier |
| TC-HLD-002 | Holding creates a booking with a PNR and a payment deadline | Needs Hold — Not Supported by this supplier |
| TC-HLD-003 | Holding does not take money from the wallet | Needs Hold — Not Supported by this supplier |
| TC-HLD-004 | A held booking is shown as held in My Bookings and on the Dashboard | Needs Hold — Not Supported by this supplier |
| TC-HLD-005 | Seats, meals and bags chosen before holding are kept on the held booking | Needs Hold — Not Supported by this supplier |
| TC-HLD-006 | A held booking that passes its deadline can no longer be paid | Needs Hold — Not Supported by this supplier |
| TC-PAH-001 | A held booking can be paid before its deadline | Needs Hold — Not Supported by this supplier; Needs Pay after Hold — Not Supported by this supplier |
| TC-PAH-002 | Paying takes exactly the booking amount from the wallet | Needs Hold — Not Supported by this supplier; Needs Pay after Hold — Not Supported by this supplier |
| TC-PAH-003 | A price change between hold and payment is shown before paying | Needs Hold — Not Supported by this supplier; Needs Pay after Hold — Not Supported by this supplier |
| TC-PAH-004 | After payment the e-ticket is issued and matches the booking | Needs Hold — Not Supported by this supplier; Needs Pay after Hold — Not Supported by this supplier |
| TC-PAH-005 | A held booking cannot be paid twice | Needs Hold — Not Supported by this supplier; Needs Pay after Hold — Not Supported by this supplier |
| TC-PAH-006 | A supplier that holds but cannot pay later offers no pay option on a held booking | Needs Hold — Not Supported by this supplier |
| TC-SM-BND-006 | A supplier with no fare packages shows no package step | Only for suppliers without Bundle — this supplier supports it |
