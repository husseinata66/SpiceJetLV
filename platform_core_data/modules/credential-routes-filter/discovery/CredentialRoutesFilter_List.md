# Discovery Snapshot — Credential Routes Filter: List and View

| Field | Value |
|---|---|
| Module | `credential-routes-filter` |
| Produced by run | `credential-routes-filter-run-001__2026-10-17_11-35-16__UserStory__CredentialRoutesFilter-Update(US62039,US60737)` |
| Screen / State | List page `/master/supplier/credential-routes-filter`, plus the View (eye) popup |
| Discovery Mode | Browser automation — Browser Driver, Headless (`SP-4`) |
| Environment | `http://192.168.1.70` (UAT), account `odeysysadmin` |
| Captured | 2026-10-17 |
| Build | The US 62039 / US 60737 change is **not deployed**. This is the **current baseline** |

## 1. Purpose

Lists the route filter rules. One row is one rule for one **supplier + supplier credential**.

## 2. Entry Points

| From | Action | Result |
|---|---|---|
| Side menu | Master → Supplier → Credential Routes Filter | Opens this list |
| Direct URL | `/master/supplier/credential-routes-filter` | Opens this list |

## 3. Structure

| Region / Section | Type | Notes |
|---|---|---|
| Header | Title + subtitle | "Credential Routes Filter" / "Search and manage route filters per supplier credential." |
| Toolbar | Button | "Add Routes Filter" |
| Search panel | Two dropdowns + button | Supplier, Supplier Credential, Search |
| Results grid | Table | Columns: **Supplier · Credential Name · Actions**. **No Status or Approval Status column** |
| Pager | Text + page-size dropdown | "Showing 2 results of 2 results", Show 10 results |
| View popup | Dialog | "Routes Filter — {Supplier} ({Credential})", mode (WHITELIST/BLACKLIST), Origin/Destination table, Airlines table with search box |

## 4. Interactive Elements

| Element | Type | Label / Accessible Name | Locator | Required? | Notes |
|---|---|---|---|---|---|
| Add Routes Filter | Button | "Add Routes Filter" | by name | — | Opens `/add` |
| Supplier | Dropdown with filter | "Select supplier" | by label | No | 74 suppliers listed |
| Supplier Credential | Dropdown | "Select credential" | by label | No | — |
| Search | Button | "Search" | by name | — | — |
| View | Icon button (eye) | — | row action | — | Opens the View popup |
| Edit | Icon button (pencil) | — | row action | — | Opens `/edit/{id}` |
| Delete | Icon button (trash) | — | row action | — | **Not clicked** (out of scope, mutating) |
| Airline search (View popup) | Text box | "Search by airline code or name..." | by placeholder | — | — |

## 5. Observed Validation & Business Rules

| Field / Action | Observed Behaviour | Trigger | Finding ID (if raised) |
|---|---|---|---|
| Existing data | 2 rules: **Galileo / GalileoLive** (WHITELIST, CAI→JED, 1 airline: EY Etihad) and **AirArbia / AirArabia Live** (WHITELIST, CAI→JED, 0 airlines) | Page load, View | — |
| View popup | Shows "N configured airlines". For the LCC rule: "0 configured airlines", "No airlines found" | View click | — |

## 6. States Observed

| State | How Reached | What Differs |
|---|---|---|
| List with 2 rules | Page load | — |
| View — GDS rule | Eye on Galileo row | Airlines table has 1 row |
| View — LCC rule | Eye on AirArbia row | Airlines table empty |

## 7. System Responses

| Type | Observation |
|---|---|
| HTTP errors | None (no 4xx/5xx while on this page) |
| Console errors | None captured |

## 9. Missing Items

| Missing Item | Reason |
|---|---|
| Screenshots | Not taken: nothing on this page raised a Finding (`pipeline.md` §11.4) |

## 10. Findings Raised From This Screen

None.
