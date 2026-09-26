# Auto-Reissue Checkbox — technical documentation

**Source:** PDF `auto-reissue-checkbox-documentation (3).pdf`, supplied by the user (Mohamed Soliman) on 2026-09-23. The original is kept beside this file as [`Auto_Reissue_Checkbox_Documentation.pdf`](Auto_Reissue_Checkbox_Documentation.pdf).
**Type:** Technical specification (development documentation)
**Recorded:** 2026-09-23
**Governs:** [`../user_stories/Auto_Reissue_Checkbox_Branch_Agency.md`](../user_stories/Auto_Reissue_Checkbox_Branch_Agency.md)

> **Transcription note.** A faithful Markdown transcription of the PDF's three pages, so the content can be
> diffed, cited by section, and read without the PDF. Wording, field names, endpoints, and error messages
> are reproduced exactly. Nothing is added; where the PDF abbreviates an endpoint (`...`) it stays abbreviated.

---

## 1. Storage

The checkbox is stored per organization (either an agency or a branch) as
`TT_ORGANIZATION.AUTO_REISSUE_ENABLED`. Its default is unchecked (`0`).

## 2. Create and update

For creation and update scenarios, configuration is available through:

- Agency: `POST/PUT /Admin2/agency/...`
- Branch: `POST/PUT /Master2/Branch/...`

The request fields are:

```json
{
  "autoReissueEnabled": true,
  "reissueCredentials": [
    { "credentialId": 289 },
    { "credentialId": 320 }
  ]
}
```

## 3. Save scenarios

| # | Checkbox | Selected credentials | Behavior |
|---|---|---|---|
| S-1 | Off | No credentials selected | Saves/gets organization with auto-reissue disabled. |
| S-2 | On | No credentials selected | Rejected: `Select at least one eligible credential`. |
| S-3 | Off | One or more credentials on update *(Backend API validation through Postman)* | The submitted list is replaced with the organization's existing valid selections. |
| S-4 | On | Credential object without `credentialId` *(Backend API validation through Postman)* | Rejected: `Every auto-reissue credential must have an ID`. |
| S-5 | On | Unknown or inactive credential *(Backend API validation through Postman)* | Rejected: `Every auto-reissue credential must exist and be active`. |
| S-6 | On | Duplicate credential IDs *(Backend API validation through Postman)* | Rejected: `Auto-reissue credentials must not contain duplicates`. |
| S-7 | Turned Off after it was On | No credentials selected | The previously saved credentials are not deleted; when later turned on, previously saved credentials are returned. |
| S-8 | On | Active credential not mapped to that agency/branch | Rejected: `Each auto-reissue credential must be mapped to this organization`. |
| S-9 | On | Supplier does not support auto-reissue | Rejected: `This supplier does not support auto-reissue`. |
| S-10 | On | At least one active, mapped, supported credential | Intended successful case. |

Agency and branch selections are independent; enabling on branch does not enable for all agencies under this branch.

*(Row IDs `S-1` … `S-10` are added by this transcription for citation only; the PDF's rows are unnumbered.)*

## 4. Read / edit scenarios

- Agency GET: `GET /Admin2/agency/{agencyId}`
- Branch GET: `GET /Master2/Branch/{branchId}/details`

Both return:

- `autoReissueEnabled`
- `reissueCredentials`
- A supplier credential list with `autoReissueAllowed` flag

On every read, the previously selected credentials that became invalid (supplier disabled later or removed from the agency/branch) are automatically deleted if they are inactive, no longer mapped to the organization, or now unsupported by the supplier.

The organization checkbox itself is not automatically turned off if this leaves no selected credentials.

## 5. Itinerary auto-reissue button visibility

Both Admin and Portal itinerary responses expose:

`actionsDetails.canAutoReissue`

It is `true` only when all conditions are met:

1. The flight booking status is `BOOKED`.
2. The organization that created the booking has auto-reissue allowed
3. The supplier is allowed for auto-reissue

It is `false` otherwise.
