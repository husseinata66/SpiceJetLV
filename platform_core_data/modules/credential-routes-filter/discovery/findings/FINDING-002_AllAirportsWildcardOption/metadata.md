# FINDING-002 — Origin/Destination offer an "All Airports" option

- **Finding ID:** FINDING-002
- **Title:** Origin/Destination offer an "All Airports" option
- **Category:** Observation
- **Severity:** N/A
- **Severity Reason:** Observation category — no defect is claimed.
- **Confidence Score:** 95%
- **Evidence Category:** Direct Observation
- **Status:** Rejected — intended (user, 2026-10-17): "All" is a real option. In the database it is stored as a special airport id (**-1 or -11**, the user is not sure which)
- **Business Risk:** One "All Airports" route may cover what would otherwise need many routes. This changes how the 50/150 route limit is felt by users.
- **Technical Risk:** If "All Airports" is sent to the supplier as a wildcard, AC 2's airline-in-request behaviour must also work for wildcard routes. Not defined anywhere.
- **Module:** `credential-routes-filter`
- **Workflow:** Add Routes Filter → Add Routes → Origin
- **Description:** Opening the Origin airport dropdown, before typing, shows one option: "All Airports".
- **Expected Behavior:** Not defined in Project Context. (§2 and US 1 describe routes as origin–destination pairs; nothing mentions an all-airports value.)
- **Actual Behavior:** "All Airports" is offered as an Origin value. Typed searches (3+ characters) return real airports, e.g. "CAI — Cairo International Airport".
- **Steps to Reproduce:** 1. Add Routes Filter. 2. Click Origin. 3. See "All Airports" before typing.
- **Investigation/Recovery Result:** Not applicable — static option. Seen in two sessions.
- **Investigation Notes:** Not selected or added to a route (no saving). Whether "All Airports" counts as 1 route toward the limit, and whether it works with AC 2, was not tested.
- **Occurrence Count:** 1
- **Unclear Items:**

  | Rect | What was observed | What exactly is unclear | The question | Why the answer matters | Original | Annotated |
  |---|---|---|---|---|---|---|
  | Q1 | "All Airports" option in Origin | Its meaning and how it counts | Does "All Airports" mean any airport, does it count as one route toward 50/150, and does AC 2 send the airline for such routes too? | Adds boundary and AC 2 test cases if supported | `origin_all_airports.png` | `origin_all_airports.annotated.png` |

- **Evidence Links:** `origin_all_airports.png`, `origin_all_airports.annotated.png`.
- **Recommendation:** Answered in part (Human Observation, user 2026-10-17): "All Airports" means any airport and is stored as a special id (-1 or -11). **Answered (user, 2026-10-17): one "All" route counts as 1 route** toward the 50/150 limit. **Still open:** whether AC 2 adds the airline for "All" routes. Stage 3 covers these as exploratory cases. Also from the user: the GDS limit is 150 **because of database performance**.
