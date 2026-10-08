# Safety Authorizations — agency+branch-run-002__2026-09-27_12-13-13__UserStory__AutoReissueCheckbox-ReissueButtonCredentialRule

> Run-scoped human authorizations granted for this run, and this run only. The machine-readable
> source is `SafetyAuthorizations.json` beside this file; this document exists so a reviewer can
> read what was approved without parsing JSON.
>
> **None of these carries forward.** A future run asks fresh. None of them lifts a `Forbidden`
> policy rule — no run-scoped approval can.

_Last updated: 2026-09-27T10:53:29.641Z_

## Authorizations

| ID | Action | Ownership | Module | Scope | Approved by | Approved at | Cleanup |
|---|---|---|---|---|---|---|---|
| `AUTH-AGENCY-UPDATE-DedicatedTestData` | UPDATE | DedicatedTestData | agency | AGN9780 — Auto Reissue checkbox and reissue-credential selection | mohamed.soliman@tildetech.ae | 2026-09-27T09:20:00.000Z | Required |
| `AUTH-AGENCY-SUBMIT-DedicatedTestData` | SUBMIT | DedicatedTestData | agency | AGN9780 — Send For Approval (TC-AGENCY-085) | mohamed.soliman@tildetech.ae | 2026-09-27T09:20:00.000Z | Required |
| `AUTH-AGENCY-APPROVE-DedicatedTestData` | APPROVE | DedicatedTestData | agency | AGN9780 — edit-form Approve, to make a change live (PO-24) | mohamed.soliman@tildetech.ae | 2026-09-27T09:20:00.000Z | Required |
| `AUTH-AGENCY-REJECT-DedicatedTestData` | REJECT | DedicatedTestData | agency | AGN9780 — rejecting the pending change raised by TC-AGENCY-085 | mohamed.soliman@tildetech.ae | 2026-09-27T09:20:00.000Z | Required |
| `AUTH-BRANCH-UPDATE-DedicatedTestData` | UPDATE | DedicatedTestData | branch | BRN265 — Auto Reissue checkbox and reissue-credential selection | mohamed.soliman@tildetech.ae | 2026-09-27T09:20:00.000Z | Required |
| `AUTH-BRANCH-APPROVE-DedicatedTestData` | APPROVE | DedicatedTestData | branch | BRN265 — edit-form Approve, to make a change live (PO-24) | mohamed.soliman@tildetech.ae | 2026-09-27T09:20:00.000Z | Required |
| `AUTH-BOOKING-UPDATE-DedicatedTestData` | UPDATE | DedicatedTestData | booking | lock / unlock on NDCEG-BR-F260924EAzzYT, NDCEG-BR-F260926PwYMR2, NDCEG-BR-F251103CdegUo, NDCEG-BR-F251014N1oohh, NDCEG-BR-F2609242aZ6EJ | mohamed.soliman@tildetech.ae | 2026-09-27T09:20:00.000Z | Required |
| `AUTH-AGENCY-UPDATE-DedicatedTestData-ProductAccess` | UPDATE | DedicatedTestData | agency | AGN9780 — Product Access: attach/detach supplier NDCsbr + credential 313, and the Auto Reissue selection [315] <-> [313] | mohamed.soliman@tildetech.ae | 2026-09-27T10:05:00.000Z | Required |
| `AUTH-BRANCH-UPDATE-DedicatedTestData-ProductAccess` | UPDATE | DedicatedTestData | branch | BRN265 — Product Access: attach/detach supplier NDCsbr + credential 313, and the Auto Reissue selection [315] <-> [313] | mohamed.soliman@tildetech.ae | 2026-09-27T10:05:00.000Z | Required |

## Policy this run was authorized against

| Field | Value |
|---|---|
| Policy ID | `ndc-admin-portal-stg` |
| Policy version | 1 |
| Policy hash | `sha256:374508eece1cebbb084334ce1bdbcefe` |

<!-- No credential, token, session identifier, or card value appears in this file, by design
     (execution safety §50). An approval names a role or an operator, never a secret. -->
