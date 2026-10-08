# Safety Authorizations — run-006__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch

> Run-scoped human authorizations granted for this run, and this run only. The machine-readable
> source is `SafetyAuthorizations.json` beside this file; this document exists so a reviewer can
> read what was approved without parsing JSON.
>
> **None of these carries forward.** A future run asks fresh. None of them lifts a `Forbidden`
> policy rule — no run-scoped approval can.

_Last updated: 2026-09-25T13:34:37.100Z_

## Authorizations

| ID | Action | Ownership | Module | Scope | Approved by | Approved at | Cleanup |
|---|---|---|---|---|---|---|---|
| `AUTH-BRANCH-CREATE-SelfCreated` | CREATE | SelfCreated | branch | ONE new Branch for TC-BR-107 (RUN006_AR_Branch) on http://192.168.1.60 | mohamed.soliman@tildetech.ae | 2026-09-25T13:34:37.100Z | — |
| `AUTH-BRANCH-UPDATE-SelfCreated` | UPDATE | SelfCreated | branch | all SelfCreated records in branch for this run | mohamed.soliman@tildetech.ae | 2026-09-23T19:58:00.000Z | — |
| `AUTH-BRANCH-SUBMIT-SelfCreated` | SUBMIT | SelfCreated | branch | all SelfCreated records in branch for this run | mohamed.soliman@tildetech.ae | 2026-09-23T19:58:00.000Z | — |
| `AUTH-BRANCH-APPROVE-SelfCreated` | APPROVE | SelfCreated | branch | all SelfCreated records in branch for this run | mohamed.soliman@tildetech.ae | 2026-09-23T19:58:00.000Z | — |
| `AUTH-AGENCY-CREATE-SelfCreated` | CREATE | SelfCreated | agency | all SelfCreated records in agency for this run | mohamed.soliman@tildetech.ae | 2026-09-23T19:58:00.000Z | — |
| `AUTH-AGENCY-UPDATE-SelfCreated` | UPDATE | SelfCreated | agency | all SelfCreated records in agency for this run | mohamed.soliman@tildetech.ae | 2026-09-23T19:58:00.000Z | — |
| `AUTH-AGENCY-SUBMIT-SelfCreated` | SUBMIT | SelfCreated | agency | all SelfCreated records in agency for this run | mohamed.soliman@tildetech.ae | 2026-09-23T19:58:00.000Z | — |
| `AUTH-AGENCY-APPROVE-SelfCreated` | APPROVE | SelfCreated | agency | all SelfCreated records in agency for this run | mohamed.soliman@tildetech.ae | 2026-09-23T19:58:00.000Z | — |
| `AUTH-BRANCH-UPDATE-DedicatedTestData` | UPDATE | DedicatedTestData | branch | Branch BRN265 ("NDC2_Mohamed Soliman") on http://192.168.1.60 ONLY — designated as dedicated test data by its owner | mohamed.soliman@tildetech.ae | 2026-09-24T09:30:00.000Z | — |
| `AUTH-BRANCH-SUBMIT-DedicatedTestData` | SUBMIT | DedicatedTestData | branch | Branch BRN265 ("NDC2_Mohamed Soliman") on http://192.168.1.60 ONLY — designated as dedicated test data by its owner | mohamed.soliman@tildetech.ae | 2026-09-24T09:30:00.000Z | — |
| `AUTH-BRANCH-APPROVE-DedicatedTestData` | APPROVE | DedicatedTestData | branch | Branch BRN265 ("NDC2_Mohamed Soliman") on http://192.168.1.60 ONLY — designated as dedicated test data by its owner | mohamed.soliman@tildetech.ae | 2026-09-24T09:30:00.000Z | — |
| `AUTH-AGENCY-UPDATE-DedicatedTestData` | UPDATE | DedicatedTestData | agency | Agency AGN9780 "NDC2_Mohamed Soliman" (id 10961, under BRN265) on http://192.168.1.60 ONLY | mohamed.soliman@tildetech.ae | 2026-09-24T09:45:00.000Z | — |
| `AUTH-AGENCY-SUBMIT-DedicatedTestData` | SUBMIT | DedicatedTestData | agency | Agency AGN9780 "NDC2_Mohamed Soliman" (id 10961, under BRN265) on http://192.168.1.60 ONLY | mohamed.soliman@tildetech.ae | 2026-09-24T09:45:00.000Z | — |
| `AUTH-AGENCY-APPROVE-DedicatedTestData` | APPROVE | DedicatedTestData | agency | Agency AGN9780 "NDC2_Mohamed Soliman" (id 10961, under BRN265) on http://192.168.1.60 ONLY | mohamed.soliman@tildetech.ae | 2026-09-24T09:45:00.000Z | — |
| `AUTH-MASTER-SUPPLIER-UPDATE-Shared` | UPDATE | Shared | master-supplier | Status only (Active -> Inactive -> Active) of supplier credential "NDCSabre staging" (id 313) and supplier "NDCsbr" on http://192.168.1.60 ONLY — for TC-AGENCY-092/093, TC-BR-110/111 (and 070/075/105 inside the same inactive window) | mohamed.soliman@tildetech.ae | 2026-09-25T13:24:09.601Z | — |
| `AUTH-BOOKING-UPDATE-DedicatedTestData` | UPDATE | DedicatedTestData | booking | Lock status ONLY (take and release the Created By lock) of the user's test bookings NDCEG-BR-F260924EAzzYT, NDCEG-BR-F260916ENYOeQ, NDCEG-BR-F2609242aZ6EJ, NDCEG-BR-F251014N1oohh, NDCEG-BR-F251103CdegUo on http://192.168.1.60 | mohamed.soliman@tildetech.ae | 2026-09-25T13:34:37.100Z | — |

## Policy this run was authorized against

| Field | Value |
|---|---|
| Policy ID | `ndc-admin-portal-stg` |
| Policy version | 1 |
| Policy hash | `—` |

<!-- No credential, token, session identifier, or card value appears in this file, by design
     (execution safety §50). An approval names a role or an operator, never a secret. -->
