# Discovery Timeline — credential-routes-filter-run-001

| Field | Value |
|---|---|
| Module | `credential-routes-filter` |
| Produced by run | `credential-routes-filter-run-001__2026-10-17_11-35-16__UserStory__CredentialRoutesFilter-Update(US62039,US60737)` |
| Times | UTC, taken from the session's tool output. Where a step printed no time, its place in the order is exact and the time is the nearest logged one (marked `~`) |

| Time | Event |
|---|---|
| ~08:40 | Stage 2 started. Display mode Headless (user answer). Safety Preflight `SP-1` (STG, read-only) confirmed |
| ~08:41 | Login refused: credentials file has no `STG` entry. `SP-2` (`ODEYSYS`) refused — unknown environment. Stage 2 blocked |
| ~08:50 | User: environment is `UAT`. `UAT` added as a Staging alias in the safety policy. `SP-3` refused (before alias); `SP-4` (UAT, read-only, Headless) confirmed |
| ~09:08 | User added the `UAT` credentials entry. Stage 2 resumed |
| 09:11 | Login OK → `/dashboard` |
| 09:11 | Master menu opened → Flight / Supplier / Miscellaneous / Payment Gateway. Default page `/master/flight/airline` |
| ~09:12 | Supplier submenu read: Credential Routes Filter → `/master/supplier/credential-routes-filter` |
| ~09:13 | Navigate to Credential Routes Filter list. 2 rules shown (Galileo/GalileoLive, AirArbia/AirArabia Live). No HTTP or console errors |
| ~09:14 | Supplier filter opened: 74 suppliers listed |
| ~09:15 | View Galileo rule: WHITELIST, CAI→JED, 1 airline (EY Etihad) |
| ~09:15 | Edit Galileo rule (`/edit/277`), not saved: Airlines field shown, counter "1 / 150", supplier and credential disabled |
| ~09:16 | View AirArbia rule: WHITELIST, CAI→JED, 0 airlines |
| ~09:16 | Edit AirArbia rule (`/edit/280`), not saved: no Airlines field, counter "1 / 50" |
| ~09:18 | Add form: chose 12 suppliers one by one (no save). GDS-type → "/ 150" + Airlines; LCC-type → "/ 50", no Airlines |
| ~09:20 | Airport search checked: needs 3+ characters; "All Airports" offered before typing |
| ~09:21 | Route-limit draft probe (fill 50+ routes) refused by the session's permission check as a shared-data risk. Not retried |
| ~09:23 | Annotated evidence captured (first attempt drew no rectangles — selectors fixed, files replaced). FINDING-001 created (supplier names). FINDING-002 created (All Airports) |
| ~09:23 | Cancel on Add → `/dashboard` (2nd time). FINDING-003 created |
| ~09:25 | Airlines multi-select: options load from `gds-airlines?status=1`; select-all present |
| ~09:26 | FINDING-004 created (limit boundary and AC 2 not observable). Exploration ended |
| ~09:40 | Reviewer revision request recorded (state reject → restart). Safety Preflight `SP-7` (UAT, read-only, Headless) confirmed |
| ~09:42 | Cancel re-check: list → Add → Cancel ×2 and list → Edit → Cancel → back to the list. FINDING-003 explained (previous page) |
| ~09:44 | Cancel path check: `/add` opened by URL after Dashboard → Cancel → Dashboard (3 cases); from the list → list |
| ~09:44 | `main.*.js` read: supplier types LCC 0 / GDS 1 / Both 2; "All" option value -11 |
| ~09:46 | Form chunk `607.*.js` read: `maxRoutes = GDS ? 150 : 50`, at-limit and route-check messages, Supplier Change dialog, Airlines max 50, Save/Cancel = previous page |
| ~09:50 | Project Context change `CR-1` approved (impact `IA-5e60e97564c3`, no dependents); context → Revision 3. Exploration ended |
| ~10:05 | Reviewer revision request (verify "Both"). Stage 1 Rev 3 re-approved (reopen, impact `CR-2`). Safety Preflight `SP-10` confirmed |
| ~10:06 | `GET …/Supplier/supplier-with-cred`: 74 suppliers — 55 type 0, 10 type 1, 9 type 2 (Both) |
| ~10:08 | Add form, no save: ShuraTech, FlyEgypt, Spicejet, FlyAdealNDC → "/ 50", no Airlines; supplier "E" → "/ 150" + Airlines. Exploration ended |
