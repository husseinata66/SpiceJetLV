# TC-ANC-036 — Execution log (raw supplier API vs. Portal UI ancillary data parity)

- **Executed:** 2026-10-03, ~03:00–03:10 UTC · NDC integration service (`https://ndc-integration-stg-ne-3.azurewebsites.net`) direct API calls + Portal `STG_PORTAL` (`http://192.168.1.213:9500`) · Agency `AGN9808`.
- **Mechanism:** direct HTTPS calls (Node scratchpad script, never committed, deleted after use per the skill's "no persisted driver script" rule) against the NDC integration service's own Search/FareConfirm/AddPassenger/GetAncillary endpoints — the same API family as the already-used `Retrieve` endpoint (per `NDC-INT-ANC` Postman collection, `platform_core_data/supplier-features/ancillaries/NDC-INT-ANC🟢✈️✔ Copy.postman_collection.json`) — followed by a live Playwright MCP (headed) Portal search using identical criteria.
- **Safety:** read-only API calls (no Book/Hold/Commit endpoint called) + a non-finalized Portal booking flow (stopped at the Ancillaries step, nothing charged, no mutating action taken past PAX Details/Bundle selection which themselves are standard non-destructive flow navigation).
- **Proposed status: Passed.**

## Objective

Verify that the ancillary (Meal/Baggage) data the Portal UI displays during booking is retrieved
correctly from the supplier/integration layer — i.e. that the GetAncillary endpoint's raw catalog
(codes, descriptions, prices, per-passenger-type eligibility) is what the UI actually renders, with no
corruption, omission, or mismatch introduced between the API and the screen.

## Method

1. **Called the NDC integration service's own API chain directly**, bypassing the Admin/Portal UI
   entirely: `Search` → `FareConfirm` → `AddPassenger` → `GetAncillary`, using credentials/headers
   consistent with every other NDC integration service call made this run (same `x-api-key`/`Client-Id`
   pair used for the `Retrieve` endpoint throughout TC-ANC-022/023).
2. **Search criteria:** DEL→DXB, one-way, 20 Nov 2026, 1 Adult + 1 Child + 1 Infant — picked to be
   directly reproducible on the UI and to exercise the Infant-eligibility rule (ANC-49) at this deeper
   layer.
3. **Separately, searched the identical criteria live on the Portal UI**, matched the resulting offer by
   flight numbers and price, and navigated through PAX Details → Bundles → Ancillaries.
4. **Compared every Meal dropdown (both legs) and the Baggage dropdown** against the raw `GetAncillary`
   response's per-segment/per-journey ancillary catalog.

## Results

| # | Check | Result | Detail |
|---|---|---|---|
| 1 | Raw API chain completes end-to-end | **Pass** | All 4 calls returned HTTP 200: Search (20 offers), FareConfirm, AddPassenger, GetAncillary. Evidence: `01_Search_*.json` … `04_GetAncillary_*.json` (headers redacted) |
| 2 | Offer correlation between raw API and UI | **Pass** | Raw Search's first/cheapest offer: IX-1391 (DEL→LKO) + IX-193 (LKO→DXB), total 27,444 INR. Portal UI search with identical criteria returned the same flight numbers as its cheapest offer, priced **13,722 EGP = 27,444 INR × 0.5 (exact ROE match, no Markup — consistent with every other Portal finding this run)** |
| 3 | Infant excluded from ancillary eligibility at the raw API layer | **Pass** | `GetAncillary`'s `passengersAncillariesAvailabilty` object contains exactly 2 passenger keys (ADT, CHD) — the Infant passenger is absent entirely, confirming ANC-49's eligibility rule originates at the supplier/integration layer, not only as a UI-side filter. The Portal Ancillaries step independently confirmed the same: no card rendered for the Infant passenger |
| 4 | Meal dropdown, Leg 1 (IX-1391, DEL→LKO) | **Pass — 11/11 exact match** | Every code, description, and EGP price in the UI dropdown matches the raw catalog exactly (ROE 0.5): VSDB "Shondesh Tiramisu" 250→125, VQSB "Quinoa Salad" 400→200, VHRF/VHRB "Herb Roast Vegetable Roll" 0/400→0/200, VFSF/VFSB "Feta Vegetable Salad" 0/300→0/150, VFPF/VFPB "Seasonal Fresh Fruit Platter" 0/300→0/150, NCJF/NCJB "Chicken Junglee Sandwich" 0/400→0/200, CAKE 700→350 |
| 5 | Meal dropdown, Leg 2 (IX-193, LKO→DXB) | **Pass — 24/24 exact match** | A richer menu (includes alcohol/coffee/biryani items); every single code/description/price reconciles exactly against the raw catalog, same ROE conversion |
| 6 | Baggage dropdown (DEL-DXB, once per journey) | **Pass — 10/10 exact match** | SBHC/SBHB/SBHA, PBCB/PBCA, PBAD/PBAC/PBAB, BGHB/BGHA — every code/price reconciles exactly (e.g. SBHC 10,500→5,250 EGP, PBAB 6,800→3,400 EGP) |
| 7 | "Other"-category ancillaries correctly not surfaced | **Pass (observation, not a defect)** | The raw catalog also carries 8 "Other"-category SSRs (WCHS/WCHR/WCHC wheelchair assistance, UMNR unaccompanied minor, PVIP/AVIP express services, FRLK fare lock, BLND blind-passenger escort). None of these appear in the Meal or Baggage dropdowns — consistent with this project's established Meal/Baggage/Bundle-only Ancillaries scope (ANC-48), not an omission |

## Disposition

Every ancillary data point the Portal UI displays for this itinerary — for both passenger types
eligible to receive ancillaries, across both flight legs, and for the baggage journey — matches the
supplier/integration service's own raw `GetAncillary` response exactly: same codes, same descriptions,
same prices after the standard ROE 0.5 conversion, same Infant exclusion, same category scoping. No
discrepancy was found anywhere in this chain.

**Proposed TC-ANC-036 status: Passed.**

## Evidence

- `01_Search_request.json` / `01_Search_response.json` — raw Search call and response (headers redacted)
- `02_FareConfirm_request.json` / `02_FareConfirm_response.json`
- `03_AddPassenger_request.json` / `03_AddPassenger_response.json`
- `04_GetAncillary_request.json` / `04_GetAncillary_response.json` — the full ancillary catalog compared against the UI
- `05_ui_ancillaries_step.png` — Portal Ancillaries step, matching search criteria, Infant correctly excluded
- **Not captured:** video (MCP setup does not support session recording)
