# Safety Authorizations — agency+branch-run-003__2026-10-04_14-13-31__UserStory__AutoReissueCheckbox-ApprovedSuiteRerun

> Run-scoped human authorizations granted for this run, and this run only. The machine-readable
> source is `SafetyAuthorizations.json` beside this file; this document exists so a reviewer can
> read what was approved without parsing JSON.
>
> **None of these carries forward.** A future run asks fresh. None of them lifts a `Forbidden`
> policy rule — no run-scoped approval can.

_Last updated: 2026-10-04T11:16:51.391Z_

## Authorizations

| ID | Action | Ownership | Module | Scope | Approved by | Approved at | Cleanup |
|---|---|---|---|---|---|---|---|
| `AUTH-AGENCY-UPDATE-DedicatedTestData` | UPDATE | DedicatedTestData | agency | AGN9780 - Auto Reissue checkbox, credential selection and remark edits | mohamed.soliman@tildetech.ae | 2026-10-04T11:16:51.387Z | Required |
| `AUTH-AGENCY-SUBMIT-DedicatedTestData` | SUBMIT | DedicatedTestData | agency | AGN9780 - Send For Approval | mohamed.soliman@tildetech.ae | 2026-10-04T11:16:51.387Z | Required |
| `AUTH-AGENCY-APPROVE-DedicatedTestData` | APPROVE | DedicatedTestData | agency | AGN9780 - Approve from the edit form and the grid | mohamed.soliman@tildetech.ae | 2026-10-04T11:16:51.387Z | Required |
| `AUTH-BRANCH-UPDATE-DedicatedTestData` | UPDATE | DedicatedTestData | branch | BRN265 - Auto Reissue checkbox, credential selection and remark edits | mohamed.soliman@tildetech.ae | 2026-10-04T11:16:51.387Z | Required |
| `AUTH-BRANCH-SUBMIT-DedicatedTestData` | SUBMIT | DedicatedTestData | branch | BRN265 - Send For Approval | mohamed.soliman@tildetech.ae | 2026-10-04T11:16:51.387Z | Required |
| `AUTH-BRANCH-APPROVE-DedicatedTestData` | APPROVE | DedicatedTestData | branch | BRN265 - Approve from the grid | mohamed.soliman@tildetech.ae | 2026-10-04T11:16:51.387Z | Required |
| `AUTH-AGENCY-UPDATE-Shared` | UPDATE | Shared | agency | Master supplier NDCsbr and credential NDCSabre staging (313) - status only, restored to Active | mohamed.soliman@tildetech.ae | 2026-10-04T11:16:51.387Z | Required |
| `AUTH-AGENCY-CREATE-SelfCreated` | CREATE | SelfCreated | agency | Two new Agencies under BRN265 (TC-AGENCY-087, 088) | mohamed.soliman@tildetech.ae | 2026-10-04T11:16:51.387Z | — |
| `AUTH-BRANCH-CREATE-SelfCreated` | CREATE | SelfCreated | branch | One new Branch (TC-BR-107) | mohamed.soliman@tildetech.ae | 2026-10-04T11:16:51.387Z | — |
| `AUTH-AGENCY-APPROVE-SelfCreated` | APPROVE | SelfCreated | agency | Approving the two newly created Agencies from the grid | mohamed.soliman@tildetech.ae | 2026-10-04T11:16:51.387Z | — |
| `AUTH-BRANCH-APPROVE-SelfCreated` | APPROVE | SelfCreated | branch | Approving the newly created Branch from the grid | mohamed.soliman@tildetech.ae | 2026-10-04T11:16:51.387Z | — |
| `AUTH-AGENCY-SUBMIT-SelfCreated` | SUBMIT | SelfCreated | agency | Send For Approval on the two newly created Agencies | mohamed.soliman@tildetech.ae | 2026-10-04T11:16:51.387Z | — |
| `AUTH-BRANCH-SUBMIT-SelfCreated` | SUBMIT | SelfCreated | branch | Send For Approval on the newly created Branch | mohamed.soliman@tildetech.ae | 2026-10-04T11:16:51.387Z | — |

## Policy this run was authorized against

| Field | Value |
|---|---|
| Policy ID | `—` |
| Policy version | — |
| Policy hash | `sha256:f93996ef084ec361f30e6e0c52cc1b0e` |

<!-- No credential, token, session identifier, or card value appears in this file, by design
     (execution safety §50). An approval names a role or an operator, never a secret. -->
