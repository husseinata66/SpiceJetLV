# Safety Authorizations — run-007__2026-09-26_17-10-56__UserStory__ReissueFlowFromItinerary

> Run-scoped human authorizations granted for this run, and this run only. The machine-readable
> source is `SafetyAuthorizations.json` beside this file; this document exists so a reviewer can
> read what was approved without parsing JSON.
>
> **None of these carries forward.** A future run asks fresh. None of them lifts a `Forbidden`
> policy rule — no run-scoped approval can.

_Last updated: 2026-09-26T20:10:59.620Z_

## Authorizations

| ID | Action | Ownership | Module | Scope | Approved by | Approved at | Cleanup |
|---|---|---|---|---|---|---|---|
| `AUTH-BOOKING-UPDATE-DedicatedTestData` | UPDATE | DedicatedTestData | booking | Bookings NDCEG-BR-F260924EAzzYT (AGN9780) and NDCEG-BR-F260916ENYOeQ (Branch) and NDCEG-BR-F260926PwYMR2 (Branch, order BRN265NDCORD2609269C3COS) ONLY: take/release the Created By lock, click Reissue, select journeys/passengers, run Re-shop searches, open Review & Pay (incl. any reprice/offer-selection call the app makes to reach it). Never Pay/Exchange/Confirm. | mohamed.soliman@tildetech.ae | 2026-09-26T14:50:04.851Z | Required |
| `AUTH-BRANCH-UPDATE-DedicatedTestData` | UPDATE | DedicatedTestData | branch | Branch BRN265 only: Product Access Galileo (add, then remove) and Auto Reissue credential selection (change, then restore to [315]) | Extended: also NDCsbr/313 (add, then remove) to repeat the run-006 [313] selection | mohamed.soliman@tildetech.ae | 2026-09-26T16:28:54.983Z | Required |
| `AUTH-BRANCH-SUBMIT-DedicatedTestData` | SUBMIT | DedicatedTestData | branch | Branch BRN265 only: Product Access Galileo (add, then remove) and Auto Reissue credential selection (change, then restore to [315]) | Extended: also NDCsbr/313 (add, then remove) to repeat the run-006 [313] selection | mohamed.soliman@tildetech.ae | 2026-09-26T16:28:54.983Z | Required |
| `AUTH-BRANCH-APPROVE-DedicatedTestData` | APPROVE | DedicatedTestData | branch | Branch BRN265 only: Product Access Galileo (add, then remove) and Auto Reissue credential selection (change, then restore to [315]) | Extended: also NDCsbr/313 (add, then remove) to repeat the run-006 [313] selection | mohamed.soliman@tildetech.ae | 2026-09-26T16:28:54.983Z | Required |
| `AUTH-AGENCY-UPDATE-DedicatedTestData` | UPDATE | DedicatedTestData | agency | Agency AGN9780 only: remove Galileo if it cascaded from BRN265; restore Sabre/315 and selection [315] | Extended: also NDCsbr/313 (add, then remove) to repeat the run-006 [313] selection | mohamed.soliman@tildetech.ae | 2026-09-26T16:28:54.983Z | Required |
| `AUTH-AGENCY-APPROVE-DedicatedTestData` | APPROVE | DedicatedTestData | agency | Agency AGN9780 only: remove Galileo if it cascaded from BRN265; restore Sabre/315 and selection [315] | Extended: also NDCsbr/313 (add, then remove) to repeat the run-006 [313] selection | mohamed.soliman@tildetech.ae | 2026-09-26T16:28:54.983Z | Required |
| `AUTH-CORESERVICE-READ-DedicatedTestData` | READ | DedicatedTestData | core-service-reissue | core-services staging /api/v1/reissue: providers, eligibility, reshop, reprice ONLY, for GDS PNRs RGGMXP (NDCEG-BR-F260924EAzzYT) and OOTKQP (NDCEG-BR-F260926PwYMR2). /exchange (incl. folder-5 refusal tests) FORBIDDEN; never run the collection as a whole. | mohamed.soliman@tildetech.ae | 2026-09-26T19:33:12.797Z | — |
| `AUTH-SABRE-READ-DedicatedTestData` | READ | DedicatedTestData | sabre-cert | Sabre CERT REST: /v2/auth/token, /v1/trip/orders/getBooking, /v1/offers/flightReshop ONLY, for PNRs RGGMXP and OOTKQP. /v1.1.0/exchange/booking and /v1/trip/orders/fulfillFlightTickets FORBIDDEN; never run the collection. | mohamed.soliman@tildetech.ae | 2026-09-26T20:10:59.619Z | — |

## Policy this run was authorized against

| Field | Value |
|---|---|
| Policy ID | `ndc-admin-portal-stg` |
| Policy version | 1 |
| Policy hash | `—` |

<!-- No credential, token, session identifier, or card value appears in this file, by design
     (execution safety §50). An approval names a role or an operator, never a secret. -->
