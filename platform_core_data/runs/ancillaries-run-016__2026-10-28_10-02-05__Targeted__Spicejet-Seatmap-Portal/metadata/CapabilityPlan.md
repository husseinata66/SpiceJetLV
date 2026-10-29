# Capability Plan — ancillaries / spicejet

<!-- capability-binding: {"run":"ancillaries-run-016__2026-10-28_10-02-05__Targeted__Spicejet-Seatmap-Portal","feature":"ancillaries","supplier":"spicejet","capabilities":"1ab216dfbbcc1d450f29506f8286ad08df5112b6f54ac5522619ce140f04ee3e","suite":"6bfad3452b4c78f2dd598ecb48a53033c81edb2b53844152726d49b4cfb2c6ee","suitePath":"TestCases_AncillariesSeatMap.xlsx"} -->

| Bound to | Value |
|---|---|
| Run | `ancillaries-run-016__2026-10-28_10-02-05__Targeted__Spicejet-Seatmap-Portal` |
| Feature | `ancillaries` |
| Supplier | `spicejet` |
| Capability fingerprint | `1ab216dfbbcc1d45…` |
| Suite fingerprint | `6bfad3452b4c78f2…` |

Generated 2026-10-28T13:08:49.259Z by `platform_core/tools/capability_gate` from `platform_core_data/supplier-features/ancillaries/shared/ancillaries-baseline/test_design/TestCases_AncillariesSeatMap.xlsx`.
Only the cases under **Will run** are executed. Excluded cases are reported with their reason and
kept out of executable scope and pass rate (manual-execution-skill §4.2).

## Supplier capabilities

| Capability | Value |
|---|---|
| Hold | Supported |
| Pay after Hold | Supported |
| Meal | Supported |
| Baggage | Supported |
| Seat | Supported |
| Bundle | Not Supported |

Supplier rules: no-leg-space-seat-inf

## Will run (107)

`TC-SM-NAV-001`, `TC-SM-NAV-002`, `TC-SM-NAV-002b`, `TC-SM-NAV-003`, `TC-SM-NAV-005`, `TC-SM-RND-001`, `TC-SM-RND-002`, `TC-SM-RND-003`, `TC-SM-RND-005`, `TC-SM-RND-006`, `TC-SM-RND-007`, `TC-SM-RND-010`, `TC-SM-STA-002`, `TC-SM-STA-004`, `TC-SM-STA-005`, `TC-SM-STA-006`, `TC-SM-SEL-001`, `TC-SM-SEL-002`, `TC-SM-SEL-003`, `TC-SM-SEL-006`, `TC-SM-SEL-007`, `TC-SM-SEL-008`, `TC-SM-SEL-009`, `TC-SM-SEL-010`, `TC-SM-SEL-012`, `TC-SM-MPX-002`, `TC-SM-MPX-004`, `TC-SM-MPX-006`, `TC-SM-MPX-007`, `TC-SM-PRC-002`, `TC-SM-PRC-003`, `TC-SM-PRC-003b`, `TC-SM-PRC-004`, `TC-SM-GEN-003`, `TC-SM-PER-001`, `TC-SM-PER-002`, `TC-SM-PER-004`, `TC-SM-PER-007`, `TC-SM-NEG-003`, `TC-SM-NEG-004`, `TC-SM-NEG-006`, `TC-SM-A11Y-001`, `TC-SM-A11Y-002`, `TC-SM-PAX-001`, `TC-SM-PAX-003`, `TC-SM-PAX-004`, `TC-SM-PAX-006`, `TC-SM-PAX-007`, `TC-SM-FRC-001`, `TC-SM-FRC-002`, `TC-SM-FRC-003`, `TC-SM-FRC-005`, `TC-SM-ERR-001`, `TC-SM-ERR-002`, `TC-SM-ERR-004`, `TC-SM-ERR-005`, `TC-SM-EXR-001`, `TC-SM-EXR-002`, `TC-SM-EXR-003`, `TC-SM-EXR-004`, `TC-SM-EXR-005`, `TC-SM-EXR-007`, `TC-SM-RTP-001`, `TC-SM-RTP-004`, `TC-SM-MCT-003`, `TC-SM-MCT-004`, `TC-SM-MCT-007`, `TC-SM-MCT-005`, `TC-SM-MCT-006`, `TC-SM-RTP-005`, `TC-SM-CNF-001`, `TC-SM-CNF-002`, `TC-SM-CNF-003`, `TC-SM-CNF-004`, `TC-SM-CNF-007`, `TC-SM-CNF-008`, `TC-SM-CNF-010`, `TC-SM-CNF-011`, `TC-SM-CNF-012`, `TC-SM-CNF-015`, `TC-SM-CNF-016`, `TC-SM-CNF-017`, `TC-SM-CNF-018`, `TC-SM-PAX-008`, `TC-SM-PRC-005`, `TC-ML-001`, `TC-ML-002`, `TC-ML-003`, `TC-ML-005`, `TC-BG-001`, `TC-BG-002`, `TC-BG-003`, `TC-BG-005`, `TC-HLD-005`, `TC-PAH-002`, `TC-PAH-003`, `TC-PAH-004`, `TC-SM-BND-006`, `TC-RPT-001`, `TC-RPT-002`, `TC-RPT-003`, `TC-RPT-004`, `TC-SM-LEG-001`, `TC-SM-LEG-002`, `TC-SM-LEG-003`, `TC-SM-LEG-004`, `TC-SM-LEG-005`

Of these, 2 are not yet approved at Review and will be excluded by the Review gate: `TC-SM-NEG-004`, `TC-SM-EXR-007`.

## Excluded — not supported by supplier (22)

| Test Case ID | Title | Reason |
|---|---|---|
| TC-SM-STA-007 | Women-only seats are marked clearly | Supplier rule "ladies-only-seats" does not apply to this supplier |
| TC-SM-PRC-001 | A seat included in the fare package costs nothing | Needs Bundle — Not Supported by this supplier |
| TC-SM-BND-002 | Changing the fare package recalculates the seats | Needs Bundle — Not Supported by this supplier |
| TC-SM-BND-003 | Each flight uses its own fare package | Needs Bundle — Not Supported by this supplier |
| TC-SM-BND-004 | Fare package names are never blank or repeated | Needs Bundle — Not Supported by this supplier |
| TC-SM-BND-005 | What the package promises about seats is what you get | Needs Bundle — Not Supported by this supplier |
| TC-SM-GEN-001 | A women-only seat is refused to a male passenger | Supplier rule "ladies-only-seats" does not apply to this supplier |
| TC-SM-GEN-002 | A women-only seat is offered to a female passenger | Supplier rule "ladies-only-seats" does not apply to this supplier |
| TC-SM-GEN-002b | The hidden seat data matches what is shown on screen | Supplier rule "ladies-only-seats" does not apply to this supplier |
| TC-SM-GEN-004 | Each passenger sees their own seats in a mixed group | Supplier rule "ladies-only-seats" does not apply to this supplier |
| TC-SM-GEN-005 | Female titles are 'Ms' and 'Mrs', for children as well as adults | Supplier rule "ladies-only-seats" does not apply to this supplier |
| TC-SM-CAB-001 | The same flight gives a different map in each cabin | Supplier rule "business-cabin" does not apply to this supplier |
| TC-SM-CAB-002 | The fare package decides WHICH seats are offered, not only their price | Needs Bundle — Not Supported by this supplier; Supplier rule "business-cabin" does not apply to this supplier |
| TC-SM-CAB-003 | 'Not offered' sections can be told apart from single taken seats | Supplier rule "business-cabin" does not apply to this supplier |
| TC-SM-CAB-004 | The Business row has its middle seats blocked | Supplier rule "business-cabin" does not apply to this supplier |
| TC-SM-CAB-005 | Packages, meals and bags change with the cabin | Needs Bundle — Not Supported by this supplier; Supplier rule "business-cabin" does not apply to this supplier |
| TC-SM-CAB-007 | A two-cabin aircraft shows both cabins properly | Supplier rule "business-cabin" does not apply to this supplier |
| TC-SM-RTP-003 | Each journey's fare package sets that journey's seat prices | Needs Bundle — Not Supported by this supplier |
| TC-SM-NAV-006 | A supplier with no seat selection shows no seat option | Only for suppliers without Seat — this supplier supports it |
| TC-ML-004 | The meal list is separate from what the bundle includes | Needs Bundle — Not Supported by this supplier |
| TC-ML-006 | A supplier with no meals shows no meal choice | Only for suppliers without Meal — this supplier supports it |
| TC-BG-006 | A supplier with no extra baggage shows no baggage choice | Only for suppliers without Baggage — this supplier supports it |
