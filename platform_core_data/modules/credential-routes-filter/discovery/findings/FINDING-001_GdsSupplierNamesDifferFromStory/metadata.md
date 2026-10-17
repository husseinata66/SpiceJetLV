# FINDING-001 — Supplier names in the app do not match the names used in the stories and intake

- **Finding ID:** FINDING-001
- **Title:** Supplier names in the app do not match the names used in the stories and intake
- **Category:** Observation
- **Severity:** N/A
- **Severity Reason:** Observation category — no defect is claimed.
- **Confidence Score:** 95%
- **Evidence Category:** Direct Observation
- **Status:** Rejected — intended (user, 2026-10-17: the supplier names on this environment were entered this way on purpose; on Production the names are correct)
- **Business Risk:** If the names are mapped wrongly, AC 2 tests may target the wrong supplier, and a supplier that should get the new airline-in-request behaviour may be missed.
- **Technical Risk:** The app treats more suppliers as GDS (150 routes + Airlines field) than the intake list names, e.g. `AmdNDC`. AC 2 scope per supplier is therefore unclear.
- **Module:** `credential-routes-filter`
- **Workflow:** Add Routes Filter → choose Supplier
- **Description:** The stories say "Sabre ATPCO GDS" and "Amadeus GDS"; intake (`PO-CRF-10`) adds "Sabre NDC" and "Amadeus NDC". The app's Supplier list has no supplier with those exact names. It has `Sabre`, `NDCsbr`, `AmadeusNDC`, `AmdNDC` and `AmdNDCaaaa`. Every GDS-type name checked behaves as GDS (counter "/ 150", Airlines field shown).
- **Expected Behavior:** Project Context `PO-CRF-10` lists seven GDS suppliers by name: Galileo, Amadeus, Sabre ATPCO, NDCGal, Amadeus NDC, Sabre NDC, Travelport NDC. The Project Context does not define which app supplier records these names refer to.
- **Actual Behavior:** App names seen as GDS-type: Galileo, Amadeus, **Sabre**, NDCGal, **TravelportNdc**, **AmadeusNDC**, **AmdNDC**, **NDCsbr** (all "/ 150" + Airlines field). `AmdNDCaaaa` is also listed but was not opened.
- **Steps to Reproduce:** 1. Log in as Admin. 2. Master → Supplier → Credential Routes Filter → Add Routes Filter. 3. Open Supplier, type "NDC" (or "Sabre"). 4. Choose each one and look at the Routes counter and the Airlines field.
- **Investigation/Recovery Result:** Not applicable — deterministic list content. Checked in two separate sessions with the same result.
- **Investigation Notes:** 12 suppliers were chosen one by one (8 GDS-type, 4 LCC-type). Nothing was saved. `AmdNDCaaaa` was not chosen.
- **Occurrence Count:** 1
- **Unclear Items:**

  | Rect | What was observed | What exactly is unclear | The question | Why the answer matters | Original | Annotated |
  |---|---|---|---|---|---|---|
  | Q1 | Supplier `NDCsbr` (credentials "NDC Sabre Staging", "NDC Sabre UAE", "NDCSabreLive"), GDS-type | Whether this is the "Sabre NDC" of `PO-CRF-10` | Is `NDCsbr` the "Sabre NDC" supplier? | Decides the test data for the Sabre NDC row of the supplier matrix | `supplier_list_ndc.png` | `supplier_list_ndc.annotated.png` |
  | Q2 | Supplier `AmdNDC` (credential "AMD EGY STG"), GDS-type | It is a second Amadeus NDC supplier next to `AmadeusNDC` | Is `AmdNDC` also "Amadeus NDC", a test copy, or a separate supplier? | Decides whether it needs its own AC 1 / Airlines checks | `supplier_list_ndc.png` | `supplier_list_ndc.annotated.png` |
  | Q3 | Supplier `AmdNDCaaaa` | Looks like test data; type not checked | Should `AmdNDCaaaa` be ignored for this run? | Keeps test data off stray records | `supplier_list_ndc.png` | `supplier_list_ndc.annotated.png` |
  | Q4 | Supplier `AmadeusNDC` (credentials "AmadeusNDCEGY", "AmadeusNDCUAE"), GDS-type | Whether this is the "Amadeus NDC" of `PO-CRF-10` | Is `AmadeusNDC` the "Amadeus NDC" supplier? | Same as Q1 | `supplier_list_ndc.png` | `supplier_list_ndc.annotated.png` |
  | Q5 | Supplier `Sabre` (credentials SabreLive, SabreStaging, …), GDS-type. No supplier named "Sabre ATPCO" exists | Whether `Sabre` is the "Sabre ATPCO GDS" of AC 2 | Is `Sabre` the "Sabre ATPCO GDS" supplier in AC 2? | AC 2 names this supplier explicitly; its tests need the right record | `supplier_list_sabre.png` | `supplier_list_sabre.annotated.png` |

- **Evidence Links:** `supplier_list_ndc.png`, `supplier_list_ndc.annotated.png`, `supplier_list_sabre.png`, `supplier_list_sabre.annotated.png`. Per-supplier counter and Airlines results are recorded in `discovery/CredentialRoutesFilter_AddEdit.md` §5. Console/network not saved (no error fired).
- **Recommendation:** Resolved — environment naming only, not a defect. **Working test-data mapping for this environment** (inferred from credential names, correct me if wrong): Sabre ATPCO GDS → `Sabre` · Sabre NDC → `NDCsbr` · Amadeus NDC → `AmadeusNDC` · Travelport NDC → `TravelportNdc`. `AmdNDC` and `AmdNDCaaaa` are treated as extra test copies and not used as test data.
