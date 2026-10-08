# Safety Authorizations — ancillaries-run-001__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia

> Run-scoped human authorizations granted for this run, and this run only. The machine-readable
> source is `SafetyAuthorizations.json` beside this file; this document exists so a reviewer can
> read what was approved without parsing JSON.
>
> **None of these carries forward.** A future run asks fresh. None of them lifts a `Forbidden`
> policy rule — no run-scoped approval can.

_Last updated: 2026-09-28T00:00:00.000Z_

## Authorizations

| ID | Action | Ownership | Module | Scope | Approved by | Approved at | Cleanup |
|---|---|---|---|---|---|---|---|
| `AUTH-PLATFORM-BOOK-SELFCREATED` | BOOK | SelfCreated | — | Bookings this run itself creates on STG_PORTAL (Portal) or ANCILLARIES_STG (Admin) -- test passenger data only, per HD-SAFETY-006 | Ahmed Alhussieny | 2026-09-28T00:00:00.000Z | — |
| `AUTH-PLATFORM-PAYMENT-SELFCREATED` | PAYMENT | SelfCreated | — | Bookings this run itself creates on STG_PORTAL (Portal) or ANCILLARIES_STG (Admin) -- test passenger data only, per HD-SAFETY-006 | Ahmed Alhussieny | 2026-09-28T00:00:00.000Z | — |
| `AUTH-PLATFORM-WALLET_CHARGE-SELFCREATED` | WALLET_CHARGE | SelfCreated | — | Bookings this run itself creates on STG_PORTAL (Portal) or ANCILLARIES_STG (Admin) -- test passenger data only, per HD-SAFETY-006 | Ahmed Alhussieny | 2026-09-28T00:00:00.000Z | — |
| `AUTH-PLATFORM-UPDATE-SELFCREATED` | UPDATE | SelfCreated | — | Changing/removing a selected ancillary before booking is finalized (TC-ANC-009, TC-ANC-018) | Ahmed Alhussieny | 2026-09-28T00:00:00.000Z | — |

## Policy this run was authorized against

| Field | Value |
|---|---|
| Policy ID | `ndc-admin-portal-stg` |
| Policy version | 2 |
| Policy hash | `sha256:28fd9c73b561997058e000dcd32079d5` |

<!-- No credential, token, session identifier, or card value appears in this file, by design
     (execution safety §50). An approval names a role or an operator, never a secret. -->
