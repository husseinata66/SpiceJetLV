# Discovery Snapshot — Credential Routes Filter: Add and Edit form

| Field | Value |
|---|---|
| Module | `credential-routes-filter` |
| Produced by run | `credential-routes-filter-run-001__2026-10-17_11-35-16__UserStory__CredentialRoutesFilter-Update(US62039,US60737)` |
| Screen / State | `/master/supplier/credential-routes-filter/add` and `/edit/{id}` (same form) — states: GDS supplier, LCC supplier |
| Discovery Mode | Browser automation — Browser Driver, Headless (`SP-4`) |
| Environment | `http://192.168.1.70` (UAT), account `odeysysadmin` |
| Captured | 2026-10-17 |
| Build | **Current baseline** — the US 62039 / US 60737 change is not deployed |
| Safety | **Nothing was saved.** Forms were opened, a supplier/credential was chosen, then Cancel or close. No Save, no Delete |

## 1. Purpose

Create or change one route filter rule: supplier, supplier credential, White/Black list mode, an
optional list of airlines (GDS suppliers only), and a list of routes (origin → destination).

## 2. Entry Points

| From | Action | Result |
|---|---|---|
| List | "Add Routes Filter" | `/add`, empty form |
| List | Pencil on a row | `/edit/277` (Galileo), `/edit/280` (AirArbia) |

## 3. Structure

| Region / Section | Type | Notes |
|---|---|---|
| Header | Title + subtitle | "Edit Routes Filter" / "The routes a supplier credential is allowed to serve." |
| Configuration | Form section | Supplier \*, Supplier Credentials \*, **Airlines (GDS only)**, Whitelist / Blacklist radio |
| Add Routes | Form section | Origin, Destination (airport search), Add button |
| Routes | List + counter | Added routes, then a counter **"n / max"** |
| Footer | Buttons | Cancel, Save Configuration |

## 4. Interactive Elements

| Element | Type | Label / Accessible Name | Locator | Required? | Notes |
|---|---|---|---|---|---|
| Supplier | Dropdown with filter | "Supplier \*" | by label | Yes | **Disabled on Edit** |
| Supplier Credentials | Dropdown | "Supplier Credentials \*" | by label | Yes | **Disabled on Edit**. Options depend on the supplier |
| Airlines | Multi-select with select-all | "Airlines" | by label | No | **Shown only for GDS-type suppliers.** Options load from active GDS airlines (`GET …/airline/gds-airlines?status=1`) |
| Whitelist / Blacklist | Radio pair | "Whitelist", "Blacklist" | by label | — | One mode per rule |
| Origin | Airport search dropdown | "Search airport (IATA or name)" | by placeholder | — | Needs 3+ characters. Searches **active** airports. Offers **"All Airports"** before typing |
| Destination | Airport search dropdown | "Search airport (IATA or name)" | by placeholder | — | Same as Origin |
| Add | Button | "Add" | by name | — | **Disabled** until Origin and Destination are both chosen |
| Cancel | Button | "Cancel" | by name | — | Goes **back to the previous page** — from the list it returns to the list (FINDING-003, explained) |
| Save Configuration | Button | "Save Configuration" | by name | — | **Not clicked** |

## 5. Observed Validation & Business Rules

| Field / Action | Observed Behaviour | Trigger | Finding ID (if raised) |
|---|---|---|---|
| **Route limit — GDS-type supplier** | Counter shows **"/ 150"**. Seen for Galileo, Amadeus, Sabre, NDCGal, TravelportNdc, AmadeusNDC, AmdNDC, NDCsbr | Supplier chosen on Add; Galileo rule on Edit ("1 / 150") | FINDING-001 (naming) |
| **Route limit — LCC-type supplier** | Counter shows **"/ 50"**. Seen for AirArbia, FlyDubai, TravelFusion, EmiratesNdc | Supplier chosen on Add; AirArbia rule on Edit ("1 / 50") | — |
| **Airlines field** | Present for every GDS-type supplier above. **Absent** for every LCC-type supplier above | Supplier chosen | — |
| What happens at the limit (50th/51st route) | **Not observed live.** Code: Add blocked with "Maximum {max} routes reached." (§5.1) | — | FINDING-004 |
| Edit — supplier and credential | Both disabled. A rule cannot be moved to another supplier/credential | Edit open | — |
| Add button | Disabled while Origin or Destination is empty | Form state | — |
| "All Airports" | Offered as an Origin/Destination option | Opening the airport dropdown | FINDING-002 |

## 5.1 Rules read from the screen's front-end code (revision 2026-10-17)

Read from the JavaScript the app served to the browser (chunk `607.*.js`, form component; `main.*.js` shared enums). **Evidence Category: System Response** (re-readable in this run). **These are what the code says, not live observations.** The live counter values in §5 agree with them.

| Rule | What the code does |
|---|---|
| Max routes | `maxRoutes = (supplier type == GDS) ? 150 : 50`. Supplier types in code: **LCC = 0, GDS = 1, Both = 2** — so a **"Both"** supplier gets **50**. **Live check:** ShuraTech, FlyEgypt, Spicejet, FlyAdealNDC (type 2) → "/ 50", no Airlines. API: 9 suppliers are type 2 |
| Airlines field | Loaded and shown only when supplier type == **GDS** (not "Both"). **Max 50 airlines can be selected** (`selectionLimit: 50`). Saved airlineIds are sent only for GDS; LCC sends `[]` |
| Add at the limit | Add is blocked and shows **"Maximum {max} routes reached."** when routes ≥ max. The counter shows "{count} / {max}" |
| Too many routes (e.g. after a supplier change) | Flag `isRoutesReachedLimit` → **Save disabled**; message **"Maximum routes for this supplier is {max}"** |
| Supplier change GDS → LCC with routes | Confirm dialog **"Supplier Change"**: limit drops **150 → 50**, routes over 50 **are removed** on Confirm |
| "All Airports" | Value `-11` (shared "All" option default `allOptionsValue = -11`). **"All → All" is refused:** "Cannot add All — All route." |
| Same origin and destination | Refused: "Origin and destination cannot be the same." |
| Duplicate route | Refused: "This route already exists." |
| Route already covered by an "All" route | Refused with a message naming the covering route |
| Adding an "All" route that covers existing ones | Existing covered routes are removed: "Removed {routes} and added {route}." |
| No supplier/credential yet | "Please select a supplier and supplier credential." |
| Save checks | Needs a credential, ≥ 1 route, a mode, and not over the limit. Messages: "Please select a mode.", "Please add at least one route." |
| Save result | "Configuration saved successfully" (Add) / "Configuration updated successfully" (Edit), then **back to the previous page** |
| Cancel | **Back to the previous page** (`location.back()`) |
| Save payload | `{ blacklistMode, routes:[{origin,destination}], supplierType, airlineIds }` |
| Edit — airline list | Edit loads active **and inactive** GDS airlines (so an inactive saved airline still shows); Add loads active only |
| Delete | Confirm dialog, then "{Supplier} - {Credential} Deleted successfully" |

## 6. States Observed

| State | How Reached | What Differs |
|---|---|---|
| Add — empty | "Add Routes Filter" | "No routes added yet." No counter, no Airlines field |
| Add/Edit — GDS supplier | Choose Galileo (etc.) | Airlines multi-select appears; counter "/ 150" |
| Add/Edit — LCC supplier | Choose AirArbia (etc.) | No Airlines field; counter "/ 50" |

## 7. System Responses

| Type | Observation |
|---|---|
| Airport search | `POST …/Master2/airport/searchWithNameOrCode?text=…&status=1` — a search call, no data change |
| Airline list | `GET …/Master2/airline/gds-airlines?status=1` |
| HTTP errors | None |
| Non-GET calls other than airport search | None (no save was sent) |

## 9. Missing Items

| Missing Item | Reason |
|---|---|
| Behaviour at the route limit (live) | Filling 50+ draft routes on the shared environment was refused by the session's permission check. Covered instead by reading the code (§5.1) |
| Airline option list contents | The multi-select panel showed names (e.g. "U.S. Air", "IndiGo Airlines"), but the filter probe returned 0 matches through the automation — the options use a different element than expected. Not a product claim |
| Save-time validation messages | Save was not clicked (no mutation grant, `PO-CRF-7`) |

## 10. Findings Raised From This Screen

| Finding ID | Category | Severity |
|---|---|---|
| FINDING-001 | Observation | N/A |
| FINDING-002 | Observation | N/A |
| FINDING-003 | UX Issue | Low |
| FINDING-004 | Test Gap | N/A |
