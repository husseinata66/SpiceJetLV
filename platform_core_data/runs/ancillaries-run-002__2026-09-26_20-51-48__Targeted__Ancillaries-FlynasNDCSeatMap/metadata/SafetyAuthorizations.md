# Safety Authorizations — ancillaries-run-002__2026-09-26_20-51-48__Targeted__Ancillaries-FlynasNDCSeatMap

> Run-scoped human authorizations granted for this run, and this run only. The machine-readable
> source is `SafetyAuthorizations.json` beside this file; this document exists so a reviewer can
> read what was approved without parsing JSON.
>
> **None of these carries forward.** A future run asks fresh. None of them lifts a `Forbidden`
> policy rule — no run-scoped approval can.

_Last updated: 2026-09-26T18:03:00.115Z_

## Authorizations

| ID | Action | Ownership | Module | Scope | Approved by | Approved at | Cleanup |
|---|---|---|---|---|---|---|---|
| `AUTH-ANCILLARIES-CREATE-SelfCreated` | CREATE | SelfCreated | ancillaries | passenger details each case submits to its own flight offer (booking/add-pax), run-006 only | Mohanad Dawood | 2026-09-26T18:03:00.113Z | — |

## Human override of an absolute Forbidden (outside the authorization model)

This is **not** a run authorization. The tooling cannot lift a `Forbidden`, and this entry does not
pretend to. It records a direct decision by the human operator to set policy v1 aside for this run.

| Field | Value |
|---|---|
| Decision | BOOK and WALLET_CHARGE may be executed on Staging for run-006's booking-dependent cases (TC-SM-CNF-001/002/003/004/007/008/010/011/012/016/017, TC-SM-MCT-004/005) |
| Decided by | Mohanad Dawood (human operator), 2026-09-27, in session |
| Condition set by the operator | Before booking, the supplier credential's API key must start with `tt`, which marks it as staging |
| Condition verified | 2026-09-27 ~09:55 UTC, Admin → Master → Supplier → Supplier Credentials. `FLYNAS STG` (supplier FlyNasKSA, display name "flynas KSA"): X_API_KEY starts with `tt`. `FlyNas STG` (supplier FlyNas, display name "FlyNas Egy"): X_API_KEY starts with `tt`. Only the prefix was checked; no key value was read out or recorded. Nothing on either credential was edited or saved |
| Still Forbidden | CANCEL_BOOKING (not covered by the decision) — bookings made under this override are left in place |
| Policy file | `execution_safety_policy.json` is unchanged and still says Forbidden (absolute). If this becomes a standing rule, the policy itself needs a new version |

### Actions executed under this override (per-record audit)

Each `Book` press was approved separately by the operator in session, immediately before it happened.
Both bookings used the `flynas KSA` credential (`FLYNAS STG`), whose `tt` prefix is verified above.
Agency AGN9809 (Uplift2_Mohanad Dawood), Portal `http://192.168.1.70:9500`.

| # | Time (UTC) | Action | Record touched | Amount | Result | Approved by |
|---|---|---|---|---|---|---|
| 1 | 2026-09-27 10:52 | BOOK + WALLET_CHARGE | Order `AGN9809UPLUPLORD260927LVHJPU`, booking ref `NDCEG-BR-F260927oiZl2l`, PNR `VYHQKP` (round trip CAI–JED XY584 15/10 + XY565 20/10; Nader, Salma and Adam Helmy) | 20,737 EGP booked; wallet 175,140.868 → 154,405.508 (20,735.36 moved — see `TC-SM-CNF-010`) | Confirmed | Mohanad Dawood |
| 2 | 2026-09-27 11:52 | BOOK (charge attempted) | Order `AGN9809UPLUPLORD260927MHROPZ`, booking ref `NDCEG-BR-F260927M5bOws`, no PNR (one-way CAI–JED XY584 15/10; Tamer Gaber) | 8,476 EGP quoted; wallet unchanged at 154,405.508 | Failed at the airline (deliberate PDBG clash, `TC-SM-CNF-016`/`017`) | Mohanad Dawood |

Neither booking was cancelled or changed afterwards. Both remain on the staging agency account.
`TC-SM-CNF-015` and `TC-SM-CNF-018` needed no booking and were run without pressing `Book`.

## Policy this run was authorized against

| Field | Value |
|---|---|
| Policy ID | `ndc-admin-portal-stg` |
| Policy version | 1 |
| Policy hash | `sha256:374508eece1cebbb084334ce1bdbcefe` |

<!-- No credential, token, session identifier, or card value appears in this file, by design
     (execution safety §50). An approval names a role or an operator, never a secret. -->
