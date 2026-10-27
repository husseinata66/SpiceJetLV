# Approved Scope — AirSMCairo Seat Map (Portal)

| | |
|---|---|
| Run | `ancillaries-run-012__2026-10-27_13-42-05__Targeted__AirSMCairo-Seatmap-Portal` |
| Feature / Supplier | Ancillaries / AirSMCairo (`air-sm-cairo`), credential `AirSMCairoStg` (cards show "AirSMCairoSTG") |
| Platform | NDC Portal, env 70 |
| Checklist | `platform_core_data/supplier-features/ancillaries/shared/ancillaries-baseline/test_design/TestCases_AncillariesSeatMap.xlsx` — unchanged |
| Approved by | Mohanad Dawood, 2026-10-27 |

Capabilities and rules: as registered (Hold, Pay after Hold, Meal, Baggage, Seat supported; Bundle not supported; no supplier rules). Multi-city is supported.

## Excluded (human decision, 2026-10-27)

| Case | Why |
|---|---|
| TC-SM-SEL-003 | Excluded for now, by the human. It may still run; its result stays out of executable scope and pass rate. |

## Supplier-specific handling (human decisions, 2026-10-27)

- TC-SM-NAV-001: step 1 is Add Passengers and step 2 is Ancillaries; with no Bundle, step 1 is titled "Passenger Info".
- TC-SM-RND-005 / TC-SM-STA-005: the seat map's sections differ from supplier to supplier; a map with no section headers makes these Not Applicable.
- TC-SM-PRC-004: the total is rounded by design.

## Execution

Groups 01–13 headless. Groups 14–17 are assisted (headed, the human presses Book / Hold / Pay).

## Deferred for now (human decision, Mohanad Dawood, 2026-10-27)

| Groups | What | Why |
|---|---|---|
| 10, 11, 15 | Multi-city (cases TC-SM-MCT-*, TC-SM-RTP-003/005 and the multi-city booking cases) | Skipped for now by the human. The CAI→JED→RUH→DMM chain returned no flights, and the real legs are not known. Not run, not failed, not counted in the pass rate; to be revisited. |
| 12 | Non-EGP credential (ROE) | Skipped for now by the human. Not run, not failed, not counted in the pass rate; to be revisited. |

## Not applicable for this supplier

| Group | Why |
|---|---|
| 16 | The clash case needs a fare package that includes checked baggage. AirSMCairo has no fare packages (Bundle Not Supported). |
