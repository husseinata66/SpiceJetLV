# NDC — Requirement Source (pasted User Stories)

**This is not a comprehensive application PRD.** No full PRD exists yet for NDC (see `platform_core_data/onboarding.md`). This file exists solely to satisfy `agents/project_context_agent.md` §4's Required PRD input, per a **User Story** Run Scope with **Pasted text** Source (`pipeline/run_scope.md` §4.1). Its content is exactly the pasted user stories supplied across runs — nothing has been added, reworded, or "completed" beyond what was pasted. Originally created to serve RUN-20260710-001 (User Stories 1–2 below); extended 2026-07-18 to also serve RUN-20260718-001 (User Story 3 below, Create Agency); extended 2026-07-21 to also serve RUN-20260721-001 (User Story 4 below, Create Role).

Full originals, with cross-reference notes, live at:
- `platform_core_data/resources/docs/NDC US/Q2-CORE-WT1-T3002-066_White-Black-list-route-based.md`
- `platform_core_data/resources/docs/NDC US/T3087_Add-Airline-Whitelist-Blacklist-Credential-Route-Filter-Phase1.md`
- `platform_core_data/resources/requirements/user_stories/Create-Agency.md`
- `platform_core_data/resources/requirements/user_stories/Create-Role.md`

Extended 2026-08-03 to also serve the Branch module run (User Story 5 below, US 8605 — Create Branch).
Extended 2026-08-03 to also serve as the source explaining the Branch module's "Outstanding Threshold" field discovered during Stage 2 (User Story 6 below, US 51489 / Q3-INTE-CORE-049 / WT1-T3177 — Agency wallet Threshold option).
Extended 2026-08-04 to also serve the Branch module's Search & Update scope (User Story 7 below, US 8599 — [Admin] Search & Actions Branch; User Story 8 below, US 8606 — [Admin] Update Branch). Both were pasted together into run-003; US 8606 was supplied specifically so the edit-pen action in US 8599 resolves against a real requirement rather than a stub.
Extended 2026-10-17 to also serve the Credential Routes Filter module run (`credential-routes-filter-run-001`): User Story 9 below (US 62039 — Increase LCC Limitation) and User Story 10 below (US 60737 — Investigation). Both were pasted together. Both are enhancements to the screen described by User Stories 1–2.

---

## User Story 1 — Q2-CORE-WT1-T3002-066 — T3002 White / Black list route based

### Description

As an NDC Admin user, I want to apply filters on returned journeys based on supplier and supplier credentials at the route level (not only airport level), so that I can have better control over search results and ensure only valid and relevant v are displayed to agencies.

### Acceptance Criteria

- The system allows filtering of returned journeys based on supplier credentials.
- The filtering can be configured at the route level (origin–destination), not limited to airport-level filtering.
- Only journeys that match the configured supplier, credentials, and routes are displayed in the search results.
- The NDC Admin can manage (add, remove) route-level filtering rules.
- The applied filters ensure that agencies only see valid and supported journey options.
- The filtering reduces irrelevant or unsupported search results.
- It will be a one list and the end user choose is white or black list using the radio button.
- If select whitelist airports means all other are blacklisted and vice versa.

### Notes

- Route-level control provides more precise filtering compared to airport-level filtering.
- We need to first investigate the airport and supplier blacklists and whitelists to obtain a complete view, and determine whether any rules are being overridden or not properly applied.
- Need to take in consideration the black and white list approach which we have before implement it.

### We need to implement

- Implement an audit log to track system activities and changes.
- Provide a function to verify suppliers and identify the issue source across different system layers.
- Introduce a tag that serves as a reference for all routes. This tag must be applied exclusively to either the origin or the destination at the route level and cannot be used for both.

### Comments (confirmed current behavior, from prior investigation)

Based on the current behavior analysis, the filtering logic between Airport BlackList/WhiteList and Credential Routes WhiteList/BlackList is working with AND condition, not OR.

**Example 1 — Airport vs. Credential Routes:**
- If airport CAI is configured as BlackList from the Airport module.
- Then from Credential Routes, any route From/To CAI is configured as WhiteList.
- Expected behavior: Searches containing CAI should still NOT return any results because the airport itself is already blocked from the Airport module.

This means:
- If any rule from either module is BlackList → route should not appear in search results.
- Route will only appear if both conditions allow it (WhiteList / supported).
- Therefore, there is no conflict between Airport filtering and Credential Routes filtering, and there is no need to add an additional flag to disable the Airport BlackList logic, since both modules complement each other and follow AND logic correctly.

**Example 2 — Restricted Airlines vs. Credential Routes:**
- The Restricted Airlines configuration inside the Supplier Credentials module works independently from the Credential Routes WhiteList/BlackList logic and does not create any conflict.
- If EgyptAir is added as a Restricted Airline for a supplier credential such as Galileo Egy.
- Then a specific route is configured as WhiteList from Credential Routes.
- When performing search on this route, results will still return normally.
- Expected behavior: Flights from all allowed airlines will appear. Only flights operated by EgyptAir will be excluded from the search results due to the Restricted Airlines configuration.
- This confirms that the Restricted Airlines logic only filters airline results after route validation and does not interfere with the Credential Routes filtering behavior.
- Therefore, there is no need to add an additional flag to disable the Restricted Airlines logic, since both functionalities operate independently without causing conflicts.

---

## User Story 2 — T3087 — Add Airline in Whitelist/Blacklist (Credential Route Filter CRUD) Phase 1

### Description

As an NDC Admin,
I want to configure airlines within Credential Route White/Black List rules for GDS suppliers ONLY,
So that route filtering can be applied to specific airlines returned by a selected GDS supplier on certain route.

Enhance the Credential Route Filter configuration in the Master Module by introducing airline-level filtering for White List and Black List rules.

When a user selects a supplier whose type is GDS, an additional Airlines multi-select dropdown shall be displayed. The dropdown shall allow the user to select one or more active airlines associated with the rule.

The configured airline filtering shall be applied after the supplier returns search results and before Rule Engine processing, aggregation, and result display.

The enhancement shall be supported in both Admin and Portal booking modules while retaining the current White List and Black List behavior for configurations that do not include airline filtering.

### Acceptance Criteria

**CRUD Operation Added Fields**
- A new Airlines multi-select dropdown is displayed when the selected supplier type is GDS.
- The Airlines dropdown is hidden for non-GDS suppliers.
- The Airlines dropdown displays active airlines.
- Users can select one or more airlines from the dropdown.
- Selected airlines are saved as part of the White List or Black List route configuration.
- Existing White List and Black List configurations continue to function without modification.

**Search Processing**
- Airline filtering is applied only to results returned by the configured GDS supplier.
- The filtering is executed after supplier results are received.
- The filtering is executed before: Rule Engine processing; Aggregation; Search result display.
- For White List rules, only configured airlines are allowed to proceed.
- For Black List rules, configured airlines are excluded from proceeding.
- Existing route filtering behavior remains unchanged when no airlines are configured.

**Scope**
- The filtering logic is applied consistently in both: Admin Booking Module; Portal Booking Module.

**Prerequisites**
- DBA consultation is required to determine and approve the maximum number of airline selections that can be stored, as the Airlines field supports multi-selection.
- Active airline data must be available and accessible for the population of the Airlines dropdown.

---

## User Story 3 — Create Agency (Admin — Agency Master Form)

**Full original:** `platform_core_data/resources/requirements/user_stories/Create-Agency.md`

### Description

As an Admin, I want to create agency including basic information, agency owner details, document uploads, bank accounts, payment settings, and product access credentials, so that agencies are properly configured and integrated into the NDC Admin version for operational efficiency and compliance.

### Acceptance Criteria

#### Agency Master Section

| Field | Validation | Msg | Field Type | Status |
|---|---|---|---|---|
| Branch | Select a Branch from a pre-populated list | "Please select a valid Branch." | Drop Down | Mandatory |
| Agency Name | Must not be blank; Special characters allowed Validation | "Please enter a valid Agency Name." | Text Input | Mandatory |
| Country | Inherited when a branch is selected | N/A | Read Only | Mandatory |
| State | Select a State from a pre-populated list | "Please select a valid State." | Drop Down | Mandatory |
| City | Select a city from a pre-populated list | "Please select a valid City Name." | Drop Down | Mandatory |
| IATA Agency | Yes or No | N/A | Radio Button | Optional |
| Post Office Box | Must not be blank | "Please enter a valid City Post Office." | Numeric Input | Mandatory |
| Company URL | Special characters allowed | "Please enter a valid URL." | URL | Optional |
| Phone no. | Must not be blank; + Phone country code | "Please enter a valid phone no.." | Numeric Input | Mandatory |
| Address 1 | Must not be blank | "Please enter a valid Address." | Text & Numeric Input | Mandatory |
| Address 2 | N/A | N/A | Text & Numeric Input | Optional |

#### Agency Owner Details Section

| Field | Validation | Msg | Field Type | Status |
|---|---|---|---|---|
| Contact Person | Only Characters validation | "Please enter a valid Name." | Text Input | Mandatory |
| Email ID | Special characters allowed | "Please enter a valid email." | Char & Special Char | Mandatory |
| Phone No. | Must not be blank; + Phone country code | "Please enter a valid phone no." | Numeric Input | Mandatory |

#### Upload Document Details (Document Section)

| Field | Validation | Msg | Field Type | Status |
|---|---|---|---|---|
| Choose documents 1, 2, 3 | PDF Files | "Please Upload a valid file format." | Attachments | Mandatory |
| Contract Start Date | Must not be blank | "Please enter a valid Start Date." | Calendar Input | Mandatory |
| Contract End Date | Must not be blank | "Please enter a valid End Date." | Calendar Input | Mandatory |

Additional behavior: an "Upload" button attaches the chosen file; each document has its own Contract Start/End Date fields; multiple documents may be uploaded; uploaded document names are displayed; documents can be removed or updated.

#### Agency Logo Details (Agency Logo Section)

| Field | Validation | Msg | Field Type | Status |
|---|---|---|---|---|
| Logo | Image Type, Size 2MB | "Please Upload a valid file format." | Attachments | Mandatory |

Additional behavior: the logo can be uploaded (size-restricted) and is displayed for review before final submission.

#### Wonder Travel Sales Contact (Sales Contact Details Section)

| Field | Validation | Msg | Field Type | Status |
|---|---|---|---|---|
| Name | Only Characters validation | "Please enter a valid Name." | Text Input | Mandatory |
| Designation | Select a Designation from a pre-populated list | "Please Select a valid Designation." | Drop Down | Optional |
| Email ID | Special characters allowed | "Please enter a valid email." | Char & Special Char | Mandatory |
| Phone No. | Must not be blank; + Phone country code | "Please enter a valid phone no." | Numeric Input | Mandatory |

Additional behavior: default values are inherited from the Branch Contact Person, can be changed, and multiple Sales personnel can be added.

#### Bank Account Details Section

| Field | Validation | Msg | Field Type | Status |
|---|---|---|---|---|
| Account Number | Numeric Input Only | "Please enter a valid Bank No." | Numeric Input | Optional |
| Account Type | Select a Type from a pre-populated list | "Please Select a valid Account Type." | Drop Down | Optional |
| Bank Name | Only Characters validation | "Please enter a valid Bank Name." | Text Input | Optional |

Additional behavior: multiple bank accounts can be added.

#### Payment Settings Section

| Field | Validation | Msg | Field Type | Status |
|---|---|---|---|---|
| Invoice Generation | Select an invoice from a pre-populated list | "Please select a valid Invoice Generation Type." | Drop Down | Mandatory |
| Credit Limit | Must not be blank | "Please enter a valid Credit Limit." | Numeric Input | Mandatory |
| Top Up limit | Must not be blank | "Please enter a valid Top Up Limit." | Numeric Input | Mandatory |
| Target | Numeric Input Only | "Please enter a valid Target." | Numeric Input | Optional |
| Set Month | Select a month from a pre-populated list | "Please select a valid Month." | Drop Down | Optional |
| Set Year | Select a year from a pre-populated list | "Please select a valid Year." | Drop Down | Optional |
| Credit Terms (Days) | Must not be blank | "Please enter a valid Number of days." | Numeric Input | Mandatory |
| Reaching Percentage | Numeric Input Only | "Please enter a valid Percentage." | Numeric Input | Optional |
| Warning Prompt (Days) | Numeric Input Only | "Please enter a valid Number of days." | Numeric Input | Optional |
| Credit Agency | N/A | N/A | Check Box | Optional |
| Payment Options | Multiple Select validations | N/A | Check Boxes | Mandatory |

Additional behavior: multiple payment options (Cash, Wallet, Credit Card, etc.) must be selectable.

#### Product Access Details Section

| Field | Validation | Msg | Field Type | Status |
|---|---|---|---|---|
| Product | Multi Select | N/A | Check Boxes | Mandatory |
| Status Column | Multi Select | N/A | Check Boxes | Mandatory |
| Supplier Name | Read Only | N/A | Text Field | N/A |
| Credential name | Must not be blank | N/A | Drop Down | Mandatory |
| Product Name | Read Only | N/A | Text Field | N/A |
| Description | Must not be blank | N/A | Text Field | Mandatory |

Additional behavior: the Product Access details segment is inherited from Branch (Agency is a subset, Branch is the parent) — populated once a branch is selected.

#### Airline Supplier Credential (PCC) Section

Filter: Amadeus PCC, Galileo PCC, Sabre PCC.

| Field | Validation | Msg | Field Type | Status |
|---|---|---|---|---|
| Search Supplier Credential PCC | Multi Select | "Please select a valid PCC Type." | Check Boxes | Mandatory |
| Ticketing Supplier Credentials PCC | Multi Select | N/A | Check Boxes | Optional |
| Generic Supplier PCC | Select a supplier PCC from a pre-populated list | "Please Select a valid Supplier PCC." | Drop Down | Mandatory |
| Manager Name | Must not be blank | "Please enter a valid Manager Name." | Text Field | Mandatory |
| Supplier Credential Description | Must not be blank | "Please enter a valid description" | Text Field | Mandatory |

Additional behavior: default values are inherited from Supplier & Branch.

#### Import PNR Option Segment

- The user should be able to toggle the "Import PNR Option," which determines if this option will be displayed on the agency portal.

### Dependencies

- Branch CRUD
- Supplier CRUD
- Payment Method

### Expected Outcome

The user must be able to submit the agency information for approval or save it as a draft, with options to approve, reject, or cancel.

### Reflection

- Rule Engine Module
- Search & Booking Module
- NDC Portal Screens
- Reports Module (Agency Wallet, Total Due to NDC)

---

## User Story 4 — Create Role (Admin — Role Management)

**Full original:** `platform_core_data/resources/requirements/user_stories/Create-Role.md`

### Description

As an OdesysesAdmin & Admin, I want to Create and manage roles with granular permissions for each module, sub-module, and their respective functionalities, So that I can ensure users have appropriate access levels while maintaining system security and usability.

### Acceptance Criteria

**Role Name:**
- Must be a text field.
- Allows only normal characters (no special characters or numbers).
- Must be unique; duplication of names is not allowed.
- Validation Message: If the role name is invalid or duplicated, a friendly message should appear: "Role Name already exists, Please Enter another Role Name."
- At least one segment or authority check box has to be selected. Validation message: "One authorization at least must be selected."

**Modules and Sub-Modules:**
- The system must display all primary modules as segments, including: Dashboard, Admin, Master, Rule Engine, Settings, User Management, Booking Mid Office, Profile, Reports.
- Each module must have smaller segments for sub-modules with an option to "Select All" checkbox. Behavior: Select all checkboxes (View, Edit, Approval) for all Rows "Sub-Tabs".
- Example — Admin: Company, Branch, Agency, Staff.

**Tab Management within Sub-Modules:**
- Each sub-module (e.g., Company) must have a grid listing its specific tabs, such as: Operating Countries, Role, Department, Advanced Pop-Up.

**Permissions Using Checkboxes:**
- Each row in the tab grid must include the following permission checkboxes: View, Edit, Approval.
- Checkbox Behavior: The "View" checkbox can be selected independently. If the "Edit" checkbox is ticked, the "View" checkbox is automatically selected. If the "Approval" checkbox is ticked, the "View" checkbox is automatically selected.

**Action Buttons:**
- Two buttons must be displayed at the bottom of the screen: "Submit for Approval" (Initiates the process to save and submit the role for approval) and "Cancel" (Clears the inputs or exits the role creation process without saving & navigates to the Search Role Screen).

### Dependency

N/A

### Reflection

- Search Role
- Update Role
- STUFF CRUD

---

## User Story 5 — US 8605 — [Admin] Create Branch

### Description

As a System Administrator, I want to add a new branch with required details, contact information, sales configurations, and product access settings, So that the branch can operate efficiently within the system and adhere to business rules.

### Acceptance Criteria

#### Branch Details

- The system shall automatically set the brand as "NDC" (backend configuration, no dropdown on UI). (Mandatory)
- The user must select the Operating Country from a searchable dropdown that supports alphabetic input. (Mandatory)
- The user must enter a Branch Name (free text, alphanumeric input only). (Mandatory)
- The Country field shall be auto-filled based on the selected Operating Country. (Mandatory)
- The State dropdown shall dynamically populate based on the selected Country. (Mandatory)
- The City dropdown shall dynamically populate based on the selected State. (Mandatory)
- The user must enter Address 1 (free text, all character input). (Mandatory)
- The user may enter Address 2 (free text, all character input). (Optional)
- The user must enter a Post Office Box — input is alphanumeric and has a max length of 8 characters. (Mandatory)
- The user must enter a Phone Number, selecting a country code from a dropdown and entering a numeric input. (Mandatory)
- The user may enter a PAN Number, Service Tax Number, and ABTA Number. Inputs are alphanumeric, and values are in uppercase. (Optional)

#### Branch Email Configuration

- The user must enter a Branch Email ID (free text, all character input). (Mandatory)
- The user must enter an Email Password (free text, all character input & has a max length of 15 characters). (Mandatory)

#### Branch Contact Info

- The user must enter a Contact Name (free text; input accepts alphabets, spaces, and a single dot (.)). (Mandatory)
- The user must enter an Email ID (free text, all character input). (Mandatory)
- The user must enter a Phone Number (country code dropdown + numeric input). (Mandatory)
- The system shall automatically set the Designation as "ADMIN" (backend configuration, no user input). (Mandatory)
- The user must select a Department from a multi-select dropdown. (Mandatory)
- The user must be able to add multiple contact persons using an "Add" button. (Optional)

#### Branch Sales Configuration

- The user may enter a Target Amount (free text, numeric input). (Optional)
- The user may set a Month (dropdown). (Optional)
- The user may set a Year (dropdown). (Optional)
- The user may click "Add Target" to set multiple targets, but only after entering Target Amount, Month, and Year. (Optional)
- The user must enter a Credit Limit (numeric input only). It has a max length of 15 characters. (Mandatory)
- The user must enter a Top-Up Limit (numeric input only). (Mandatory)
- The user must enter Credit Terms (Days) (numeric input only). **It has a max length of 7 digits.** (Mandatory) <!-- 7-digit cap added 2026-08-10 per business clarification; see FINDING-016 -->
- The user may enter a Reaching Percentage (free text, input allows numeric values with up to 3 decimal places and must not be greater than 100%). (Optional)
- The user may enter a Warning Prompt (Days) (free text, numeric input, max length 11, and should be less than Credit Terms (Days)). (Optional) <!-- CONFLICT (FINDING-016): unreachable given Credit Terms' 7-digit cap — needs a requirements decision -->

> **Open conflict (2026-08-10, FINDING-016 — Needs Human Review).** Credit Terms (Days)'s newly-confirmed 7-digit cap and Warning Prompt (Days)'s 11-digit cap cannot both be exercised: any Warning Prompt value long enough to reach 11+ digits necessarily exceeds the largest legal Credit Terms value (9999999), so the "should be less than Credit Terms (Days)" rule always fires first. Credit Terms is Mandatory and cannot be left blank to avoid the comparison. A decision is needed on whether Warning Prompt's 11-digit maximum remains a meaningful requirement.
- The user may select Payment Options (multi-select checkboxes). If Credit Card is selected, a Payment Gateway dropdown shall appear as mandatory. (Mandatory if Credit Card is selected)

#### Product Access Details

- The system shall set Flight as the default product (backend configuration, no selection by the user). (Mandatory)
- The grid shall include the following columns: Status, Supplier Name, Credential Name, Product Name, Description (free text, alphabetic input, enabled only when a supplier is selected). (Mandatory)
- If a GDS is selected in the grid, an additional grid shall appear with: Generic Supplier Credentials (PCC) (multi-select dropdown) (Mandatory); Manager Name (free text, alphabetic input) (Optional); Supplier Credentials Description (free text, alphabetic input) (Mandatory).
- Search Supplier Credentials PCC & Ticketing Supplier Credential PCC shall be removed from the UI and statically checked in the backend.

#### Import PNR

- The Import PNR checkbox is always checked.

#### Buttons & Actions

- Submit for Approval: Saves the updates and submits the branch for review. (Mandatory)
- Cancel: Clears unsaved changes or exits the process. (Mandatory)

### Dependency

- Country POS
- Department CRUD
- Payment Mode

### Reflection

- Search Branch
- Booking Module
- Staff CRUD
- Agency CRUD

---

## User Story 6 — 51489 / Q3-INTE-CORE-049 / WT1-T3177 — [Admin] Agency wallet Threshold option

### Description

As an Admin user, I want to configure a threshold value for each agency and manage threshold inheritance for child agencies, So that agencies can have threshold limits based on their region or agency level, allowing them to continue processing bookings according to their assigned business rules while reducing administrative effort.

### Business Value

- Support different threshold values by region or agency level.
- Allow agencies to continue processing bookings within their assigned threshold.
- Simplify threshold management across branch hierarchies.
- Reduce manual updates and administrative effort.

### Acceptance Criteria

#### 1. Agency Module

- Add a new Threshold field to the Agency CRUD screen.
- Allows administrators to increase or decrease the threshold for an individual agency.

#### 2. Branch Module

- Add a new Child Agencies Threshold Amount field.
- Allows administrators to define a default threshold for all child agencies under the branch.
- The configured threshold is automatically applied to child agencies that inherit the branch configuration.

#### 3. PNR Query

- Display the agency's configured Threshold.
- Type: Read-only.
- The value is for reference only and cannot be edited from the PNR Query screen.

#### 4. Branch Threshold Update

When the branch threshold is changed:

- The system checks for child agencies with manually modified (custom) thresholds.
- If any exist, display a confirmation popup.
- The popup should list all child agencies with custom thresholds.
- The administrator can review the affected agencies before confirming the update.
- It will be another section for the rest agencies to be able to review the reflected agencies with the new threshold value.

### Dependency

N/A (implied: Agency CRUD, Branch CRUD, PNR Query)

### Reflection

- PNR Query
- Agency CRUD

---

## User Story 7 — US 8599 — [Admin] Search & Actions Branch

### Description

As a Super Admin and admin, I want to search and manage branch records efficiently so that I can easily approve, update, and monitor branch details.

### Acceptance Criteria

#### Search & Filtering

- Branch Code — Text Input (Alphanumeric)
- Branch Name — Text Input (Alphabetic & Special Char)
- Country — Dropdown
- State — Dropdown (dependent on selected Country)
- City — Dropdown (dependent on selected State)
- Status — Radio Button options: Inactive; Active (Default selection); Both
- Search Button to execute a search with the applied Filtration

#### Search Result Grid

Displayed Columns:

- Branch Code
- Branch Name
- Country Name
- State
- City
- Approval Status
- Action Options

#### Actions & Functionalities

- Edit Branch: Clicking the edit pen icon navigates to the "Update Branch" page with pre-filled branch details.
- Approve/Reject Branch: Clicking the thumbs-up icon approves the branch, and clicking the thumbs-down icon rejects it.
- Pagination: Enables navigation through multiple search results when the number of records exceeds the default page size.

#### Business Rules

- The state and city dropdowns are dependent on the selected country and state, respectively.
- The default search status is "Active," but users can switch to "Inactive" or "Both."
- Approving or rejecting a branch updates its status accordingly.

### Dependency

- Create Branch
- Update Branch

### Reflection

- Agency CRUD
- Booking Admin
- Staff CRUD

---

## User Story 8 — US 8606 — [Admin] Update Branch

### Description

As a System Administrator, I want to update an existing branch with required details, contact information, sales configurations, and product access settings, So that the branch can operate efficiently within the system and adhere to business rules.

### Acceptance Criteria

#### Branch Details

- The system shall automatically set the brand as "NDC" (backend configuration, no dropdown on UI). (Mandatory)
- The user must select the Operating Country from a searchable dropdown that supports alphabetic input. (Mandatory)
- The user must enter a Branch Name (free text, alphanumeric input only). (Mandatory)
- The Country field shall be auto-filled based on the selected Operating Country. (Mandatory)
- The State dropdown shall dynamically populate based on the selected Country. (Mandatory)
- The City dropdown shall dynamically populate based on the selected State. (Mandatory)
- The user must enter Address 1 (free text, all character input). (Mandatory)
- The user may enter Address 2 (free text, all character input). (Optional)
- The user must enter a Post Office Box — input is alphanumeric and has a max length of 8 characters. (Mandatory)
- The user must enter a Phone Number, selecting a country code from a dropdown and entering a numeric input. (Mandatory)
- The user may enter a PAN Number, Service Tax Number, and ABTA Number. Inputs are alphanumeric, and values are in uppercase. (Optional)

#### Branch Email Configuration

- The user must enter a Branch Email ID (free text, all character input). (Mandatory)
- The user must enter an Email Password (free text, all character input & has a max length of 15 characters). (Mandatory)

#### Branch Contact Info

- The user must enter a Contact Name (free text; input accepts alphabets, spaces, and a single dot (.)). (Mandatory)
- The user must enter an Email ID (free text, all character input). (Mandatory)
- The user must enter a Phone Number (country code dropdown + numeric input). (Mandatory)
- The system shall automatically set the Designation as "ADMIN" (backend configuration, no user input). (Mandatory)
- The user must select a Department from a multi-select dropdown. (Mandatory)
- The user must be able to add multiple contact persons using an "Add" button. (Optional)

#### Branch Sales Configuration

- The user may enter a Target Amount (free text, numeric input). (Optional)
- The user may set a Month (dropdown). (Optional)
- The user may set a Year (dropdown). (Optional)
- The user may click "Add Target" to set multiple targets, but only after entering Target Amount, Month, and Year. (Optional)
- The user must enter a Credit Limit (numeric input only). It has a max length of 15 characters. (Mandatory)
- The user must enter a Top-Up Limit (numeric input only). (Mandatory)
- The user must enter Credit Terms (Days) (numeric input only). **It has a max length of 7 digits.** (Mandatory) <!-- 7-digit cap added 2026-08-10 per business clarification; see FINDING-016 -->
- The user may enter a Reaching Percentage (free text, input allows numeric values with up to 3 decimal places and must not be greater than 100%). (Optional)
- The user may enter a Warning Prompt (Days) (free text, numeric input, it has a max length of 11 number and should be less than Credit Terms (Days)). (Optional) <!-- CONFLICT (FINDING-016): unreachable given Credit Terms' 7-digit cap — needs a requirements decision -->

> **Open conflict (2026-08-10, FINDING-016 — Needs Human Review).** Same conflict as US 5 §Branch Sales Configuration: Credit Terms (Days)'s 7-digit cap and Warning Prompt (Days)'s 11-digit cap cannot both be exercised, since any Warning Prompt value reaching 11+ digits necessarily exceeds the largest legal Credit Terms value. A requirements decision is needed.
- The user may select Payment Options (multi-select checkboxes). If Credit Card is selected, a Payment Gateway dropdown shall appear as mandatory. (Mandatory if Credit Card is selected)

#### Product Access Details

- The system shall set Flight as the default product (backend configuration, no selection by the user). (Mandatory)
- The grid shall include the following columns: Status, Supplier Name, Credential Name, Product Name, Description (free text, alphabetic input, enabled only when a supplier is selected). (Mandatory)
- If a GDS is selected in the grid, an additional grid shall appear with: Generic Supplier Credentials (PCC) (multi-select dropdown) (Mandatory); Manager Name (free text, alphabetic input) (Optional); Supplier Credentials Description (free text, alphabetic input) (Mandatory).
- Search Supplier Credentials PCC & Ticketing Supplier Credential PCC shall be removed from UI and statically checked in the backend.

#### Import PNR

- If the Import PNR checkbox is always checked.

#### Buttons & Actions

- The user must enter Remarks (free text, all character input) before clicking any action button. (Mandatory)
- Submit for Approval: Saves the updates and submits the branch for review. (Mandatory)
- Approve: Approves the branch update request. (Mandatory)
- Reject: Rejects the branch update request. (Mandatory)
- Cancel: Clears unsaved changes or exits the process. (Mandatory)

### Dependency

- Add Branch
- Country POS
- Department CRUD
- Payment Mode

### Reflection

- Search Branch
- Booking Module
- Staff CRUD
- Agency CRUD

---

## User Story 9 — US 62039 — Q4-CORE-WT1-T3224-043 — Credential Routes Filter – Task Modification - Increase LCC Limitation

### Description

As an Admin user,
I want to enhance the Credential Routes Filter by increasing the supported LCC route limit and applying airline filtering to search requests,
so that I have greater control over supplier route configurations and can ensure that search results are limited to the configured airlines and routes.

### Acceptance Criteria

**Application Details**

| Item | Detail |
|---|---|
| CRUD | Credential Routes Filter |
| Navigation Path | Master → Supplier → Credential Routes Filter |
| Change Type | Enhancement to an existing module (not a new feature) |

**1. Route Limit Increase**

The maximum number of routes supported for LCC suppliers will be increased from 50 to 150, aligning it with the existing GDS limit.

---

## User Story 10 — US 60737 — Q4-CORE-WT1-T3224-043 — Credential Routes Filter – Task Modification - Investigation

### Description

*(No description text was supplied with this story. Only its Acceptance Criteria were pasted.)*

### Acceptance Criteria

**Application Details**

| Item | Detail |
|---|---|
| Application | Credential Routes Filter |
| Navigation Path | Master → Supplier → Credential Routes Filter |
| Change Type | Enhancement to an existing module (not a new feature) |

**2. Airline Filtering in Supplier Requests**

The configured airline will be included in the search request before it is sent to the supplier, so that only results for that airline are returned.
This applies to the following suppliers:

- Galileo GDS
- Travelport NDC
- Sabre ATPCO GDS
- Amadeus GDS

**4. Deprecation Flags (Admin)**

On/off flags will be introduced to control the visibility of the Preferred Airline CRUD screens.

- Default state: ON, until the business completes the data migration.
- After migration: The business will switch the flags OFF, and the Preferred Airline screens will be hidden.
- Deprecation Path: Deployment → Flags ON (default) → Business migrates data → Admin switches flags OFF → Screens hidden

*(Intake note, 2026-10-17: across the two stories the Acceptance Criteria are numbered 1, 2 and 4. The user confirmed there is no AC 3.)*
