# Safety Authorizations — reissue-run-003__2026-10-04_17-23-43__UserStory__ReissueFlowManualExecution

> Run-scoped human authorizations granted for this run, and this run only. The machine-readable
> source is `SafetyAuthorizations.json` beside this file; this document exists so a reviewer can
> read what was approved without parsing JSON.
>
> **None of these carries forward.** A future run asks fresh. None of them lifts a `Forbidden`
> policy rule — no run-scoped approval can.

_Last updated: 2026-10-07T11:31:22.058Z_

## Authorizations

| ID | Action | Ownership | Module | Scope | Approved by | Approved at | Cleanup |
|---|---|---|---|---|---|---|---|
| `AUTH-BOOKING-UPDATE-DedicatedTestData` | UPDATE | DedicatedTestData | booking | Bookings NDCEG-BR-F260926PwYMR2 (Admin, Branch BRN265) and NDCEG-BR-F260928XmO3Yx (Portal) ONLY. Permitted: take/release the Created By lock (Admin only), click Reissue, select journeys and passengers, run Re-shop searches, select an offer, and open Review & Pay including any reprice/offer call the app makes to reach it. The platform STOPS at Review & Pay. Pay, Exchange and Confirm & charge are NEVER clicked by the platform - the human performs them by hand after an explicit hand-off, and every post-exchange assertion is read-only. Granted by the user 2026-10-04 for the Stage 4M execution of the approved 148-case suite. Headed. | Extended 2026-10-07T11:31:22.058Z: also booking NDCEG-BR-F260929pbzn43 (order BRN503NDCORD260929SLZ7TU, Branch BRN503) for TC-RFLOW-090 ONLY - take the Created By lock, read which Itinerary actions are offered on a reissue offer, release the lock. No Reissue is initiated on it; nothing is clicked beyond lock/unlock (user instruction 2026-10-07). | mohamed.soliman@tildetech.ae | 2026-10-07T11:31:22.058Z | Required |
| `AUTH-BOOKING-READ-DedicatedTestData` | READ | DedicatedTestData | booking | Bookings NDCEG-BR-F260926PwYMR2 (Admin, Branch BRN265) and NDCEG-BR-F260928XmO3Yx (Portal) ONLY. Permitted: take/release the Created By lock (Admin only), click Reissue, select journeys and passengers, run Re-shop searches, select an offer, and open Review & Pay including any reprice/offer call the app makes to reach it. The platform STOPS at Review & Pay. Pay, Exchange and Confirm & charge are NEVER clicked by the platform - the human performs them by hand after an explicit hand-off, and every post-exchange assertion is read-only. Granted by the user 2026-10-04 for the Stage 4M execution of the approved 148-case suite. Headed. | mohamed.soliman@tildetech.ae | 2026-10-04T14:24:30.772Z | — |
| `AUTH-BRANCH-UPDATE-DedicatedTestData` | UPDATE | DedicatedTestData | branch | Branch BRN265 ONLY: toggle the Auto Reissue checkbox OFF and back ON for TC-RFLOW-002 and TC-RFLOW-004. Original state restored immediately after each case. No other Branch field is touched; no other Branch is touched. | mohamed.soliman@tildetech.ae | 2026-10-04T14:30:07.338Z | Required |
| `AUTH-BRANCH-SUBMIT-DedicatedTestData` | SUBMIT | DedicatedTestData | branch | Branch BRN265 ONLY: toggle the Auto Reissue checkbox OFF and back ON for TC-RFLOW-002 and TC-RFLOW-004. Original state restored immediately after each case. No other Branch field is touched; no other Branch is touched. | mohamed.soliman@tildetech.ae | 2026-10-04T14:30:07.338Z | Required |
| `AUTH-BRANCH-APPROVE-DedicatedTestData` | APPROVE | DedicatedTestData | branch | Branch BRN265 ONLY: toggle the Auto Reissue checkbox OFF and back ON for TC-RFLOW-002 and TC-RFLOW-004. Original state restored immediately after each case. No other Branch field is touched; no other Branch is touched. | mohamed.soliman@tildetech.ae | 2026-10-04T14:30:07.338Z | Required |
| `AUTH-AGENCY-UPDATE-DedicatedTestData` | UPDATE | DedicatedTestData | agency | Agency AGN9780 ONLY: toggle the Auto Reissue checkbox OFF and back ON for TC-RFLOW-003 and TC-RFLOW-004. Original state restored immediately after each case. No other Agency field is touched; no other Agency is touched. | mohamed.soliman@tildetech.ae | 2026-10-04T14:30:07.338Z | Required |
| `AUTH-AGENCY-SUBMIT-DedicatedTestData` | SUBMIT | DedicatedTestData | agency | Agency AGN9780 ONLY: toggle the Auto Reissue checkbox OFF and back ON for TC-RFLOW-003 and TC-RFLOW-004. Original state restored immediately after each case. No other Agency field is touched; no other Agency is touched. | mohamed.soliman@tildetech.ae | 2026-10-04T14:30:07.338Z | Required |
| `AUTH-AGENCY-APPROVE-DedicatedTestData` | APPROVE | DedicatedTestData | agency | Agency AGN9780 ONLY: toggle the Auto Reissue checkbox OFF and back ON for TC-RFLOW-003 and TC-RFLOW-004. Original state restored immediately after each case. No other Agency field is touched; no other Agency is touched. | mohamed.soliman@tildetech.ae | 2026-10-04T14:30:07.338Z | Required |
| `AUTH-RULE-ENGINE-UPDATE-DedicatedTestData` | UPDATE | DedicatedTestData | rule-engine | The Exchange Fees rule on the organisation under test ONLY: remove or invalidate the rule for TC-RFLOW-006, 007, 008, then restore it to Branch 100 / Agency 50 per passenger (D-7, D-11). No other rule type is touched. | mohamed.soliman@tildetech.ae | 2026-10-04T14:30:07.338Z | Required |
| `AUTH-RULE-ENGINE-SUBMIT-DedicatedTestData` | SUBMIT | DedicatedTestData | rule-engine | The Exchange Fees rule on the organisation under test ONLY: remove or invalidate the rule for TC-RFLOW-006, 007, 008, then restore it to Branch 100 / Agency 50 per passenger (D-7, D-11). No other rule type is touched. | mohamed.soliman@tildetech.ae | 2026-10-04T14:30:07.338Z | Required |
| `AUTH-RULE-ENGINE-APPROVE-DedicatedTestData` | APPROVE | DedicatedTestData | rule-engine | The Exchange Fees rule on the organisation under test ONLY: remove or invalidate the rule for TC-RFLOW-006, 007, 008, then restore it to Branch 100 / Agency 50 per passenger (D-7, D-11). No other rule type is touched. | mohamed.soliman@tildetech.ae | 2026-10-04T14:30:07.338Z | Required |
| `AUTH-AIRPORT-UPDATE-DedicatedTestData` | UPDATE | DedicatedTestData | airport | The airport active/inactive flag ONLY, on airports used by the two named test bookings, for TC-RFLOW-128 to 132. Each airport is reactivated immediately after the case that deactivated it. No other airport attribute is touched. | mohamed.soliman@tildetech.ae | 2026-10-04T14:30:07.338Z | Required |
| `AUTH-AIRPORT-SUBMIT-DedicatedTestData` | SUBMIT | DedicatedTestData | airport | The airport active/inactive flag ONLY, on airports used by the two named test bookings, for TC-RFLOW-128 to 132. Each airport is reactivated immediately after the case that deactivated it. No other airport attribute is touched. | mohamed.soliman@tildetech.ae | 2026-10-04T14:30:07.338Z | Required |
| `AUTH-AIRPORT-APPROVE-DedicatedTestData` | APPROVE | DedicatedTestData | airport | The airport active/inactive flag ONLY, on airports used by the two named test bookings, for TC-RFLOW-128 to 132. Each airport is reactivated immediately after the case that deactivated it. No other airport attribute is touched. | mohamed.soliman@tildetech.ae | 2026-10-04T14:30:07.338Z | Required |

## Policy this run was authorized against

| Field | Value |
|---|---|
| Policy ID | `ndc-admin-portal-stg` |
| Policy version | 1 |
| Policy hash | `—` |

<!-- No credential, token, session identifier, or card value appears in this file, by design
     (execution safety §50). An approval names a role or an operator, never a secret. -->
