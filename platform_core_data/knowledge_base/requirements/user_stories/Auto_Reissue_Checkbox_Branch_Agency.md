# [Admin] Reissue Feature Allowed checkbox — Branch and Agency CRUDs

**Source:** Plain Text (pasted) — supplied by the user (Mohamed Soliman) on 2026-09-23 and transcribed here verbatim in structure and wording.
**Work item ID:** none supplied
**Type:** User Story
**Recorded:** 2026-09-23
**Status:** Requirements input — not yet consumed by Stage 1.
**Related technical specification:** [`../specifications/Auto_Reissue_Checkbox_Documentation.md`](../specifications/Auto_Reissue_Checkbox_Documentation.md)
**Related story:** [`Reissue_Flow_From_Itinerary.md`](Reissue_Flow_From_Itinerary.md) — this checkbox is that story's configuration prerequisite ("Be controlled through the Reissue checkbox configured on Branch and Agency CRUD").

> **Transcription note.** This file is the *requirement as supplied*, not an interpretation of it. Wording
> and ordering are reproduced exactly as pasted. Clarifications the user gave afterwards are recorded
> separately under [Clarifications supplied at intake](#clarifications-supplied-at-intake), never merged
> into the story text. Resolving anything further is Stage 1's job (`pipeline.md` §6 Rule 4).

---

## Story

**As an** admin user,
**I want** to have a Reissue Feature Allowed checkbox in the Branch and Agency CRUDs,
**So that** the reissue feature can be enabled or disabled for each branch and agency, and the permission is correctly reflected across both the Portal and Admin.

## Description

Add a new Reissue Feature Allowed checkbox to the Branch and Agency CRUDs.

The implementation should:

- Add the checkbox to both Agency and Branch create/edit screens.
- Store and retrieve the selected value correctly.
- Apply the permission consistently across the Admin Portal and Agency Portal.
- Investigate and validate the impact of this new permission on all existing reissue-related functionality.
- Ensure that users belonging to a branch/agency where the reissue feature is not allowed cannot access or perform reissue actions.
- Ensure that when the permission is enabled, the relevant reissue functionality is available according to the existing reissue workflow.

---

## Acceptance Criteria

### Agency CRUD

- Add a Reissue Feature Allowed checkbox to the Agency Create/Edit screens.
- The checkbox value can be enabled or disabled.
- The selected value is saved and retrieved correctly when editing the agency.

### Branch CRUD

- Add a Reissue Feature Allowed checkbox to the Branch Create/Edit screens.
- The checkbox value can be enabled or disabled.
- The selected value is saved and retrieved correctly when editing the branch.

### Portal Impact

- Verify the impact of the Agency-level and Branch-level permission on the Portal.
- When the reissue permission is disabled, the related reissue functionality should not be available to the affected users.
- When the permission is enabled, the related reissue functionality should be available according to the existing business rules.

### Admin Impact

- Verify the impact of the new permission on Admin reissue-related screens and actions.
- Ensure that Admin users can correctly view and manage the reissue permission for both agencies and branches.
- Ensure that changing the permission does not negatively affect existing Admin functionality.

### Permission Precedence

- Define and implement the expected behavior when the Agency and Branch have different values.
- The system must consistently apply the final permission based on the agreed business rule.

### Regression & Validation

- Verify existing Agency and Branch CRUD functionality is not affected.
- Verify existing reissue functionality remains working for permitted users.
- Verify unauthorized users cannot access or execute reissue actions.

---

## Clarifications supplied at intake

Answers given by the user on 2026-09-23, verbatim in meaning. They are **user statements**, not
application observations — Stage 2 still verifies each against the live screens.

| # | Question | Answer (user, 2026-09-23) |
|---|---|---|
| CL-1 | What is the checkbox called? | The checkbox is named **Auto Reissue**. The button it controls on the Itinerary is called **Reissue**. |
| CL-2 | When Agency and Branch hold different values, which applies? | **The Branch checkbox does not affect the Agency checkbox — each works independently.** An Agency under a Branch **inherits the Branch's supplier credentials**; the Agency can still **customize** its supplier credentials in Agency CRUD, but **cannot be assigned a supplier credential that does not exist on its parent Branch**. |
| CL-3 | Is the credential selection that accompanies the checkbox in scope for UI, backend, or both? | **Both — backend and frontend.** |
| CL-4 | Which reissue does this story's checkbox govern? | **Auto-Reissue, as described in the technical specification** (`AUTO_REISSUE_ENABLED`, `reissueCredentials`, `canAutoReissue`). |

## Open Questions

None recorded at transcription. Stage 1 records any it finds in the module Project Contexts.
