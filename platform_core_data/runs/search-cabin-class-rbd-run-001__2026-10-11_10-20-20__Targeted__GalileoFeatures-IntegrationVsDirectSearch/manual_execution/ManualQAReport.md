# Manual QA Report — Galileo Features: Search – Cabin Class & RBD (Integration vs Direct)

| Field | Value |
|---|---|
| Status | Pending Review |
| Run | `search-cabin-class-rbd-run-001__2026-10-11_10-20-20__Targeted__GalileoFeatures-IntegrationVsDirectSearch` |

## 1. Run Identification

| Field | Value |
|---|---|
| Scope | Supplier Feature `search-cabin-class-rbd` / Supplier `galileo` — **search only** |
| Run Scope / Run Type | Feature / Custom Scope — Integration vs Direct parity |
| Environment | http://192.168.1.210/ (Staging — assumed), Booking-Mid Office → Flight Search |
| Paths compared | **Integration** = branch `NDC1_Ahmed Ayman (BRN287)`, supplier `NDCGal`, credential `NdcGalileoSTG EGY` · **Direct** = branch `ahmed ayman (BRN632)`, supplier `Galileo`, credential `GalileoLiveSTAGING` |
| Execution window | 2026-10-11 08:45 – 09:12 UTC |
| Executed by | Claude (Stage 4M), Headed, two isolated browser sessions, user `ahmed ayman` |
| Suite | `TestCases_SearchCabinRBD_Galileo.md` rev 2 — 18 active cases, all Review = Approved |

## 2. Executive Summary

The same searches were run on both branches at the same time. Every returned flight and fare option was compared at **fare option × passenger type × segment** level. Prices were ignored.

- **Flights match on simple searches.** For one-way Economy, Business, mixed passengers, CAI→JED and every Economy/Business RBD filter, both branches return exactly the same flights. The segments, times, stops, Cabin, RBD and baggage allowance are the same too.
- **Two serious problems on the Integration branch.** It **ignores Premium Economy** and returns Economy instead. It also **ignores First Class** and returns Business instead. Direct handles both correctly. (DEF-01, DEF-02 — High)
- **Fare options differ everywhere.** Integration returns many more fare options per flight (higher fare brands), while Direct returns about one per flight. Every Direct option also exists on Integration with the same details, and there are no duplicates. (DEF-03)
- **Round-trip and Multi-City combinations differ.** Integration also stops at exactly 200 offers, which looks like a limit. (DEF-04)
- **Smaller items:**
  - the same cabin has different names on the two branches ("FirstClass" vs "First");
  - one Business product comes back in First cabin on both branches;
  - Direct returns one wrong leg-1 cabin in a mixed-cabin Multi-City search;
  - a Multi-City RBD form problem affects both branches. (DEF-05…08)
- **Baggage:** the allowance matches everywhere it was compared. Only the wording differs ("2 Pieces" vs "Number 2 Piece Allowed."). This is not reported as a functional mismatch.

## 3. Outcome Figures

| Status | Count | % of executable scope (18) |
|---|---|---|
| Passed | 4 | 22% |
| Failed | 13 | 72% |
| Blocked | 0 | 0% |
| Skipped | 0 | 0% |
| Not Executed | 0 | 0% |
| Inconclusive | 1 | 6% |
| Excluded | 0 | — |
| **Executable scope / Suite total** | **18 / 18** | Authorized coverage 100% |

**Passed:** TC-GSRCH-011 (Economy RBD Q/K/Y), 012 (Business RBD J/C), 013 (Cabin/RBD mismatch — the same "No Flights Found" on both), 020 (RBD Q+K).

**Inconclusive:** TC-GSRCH-001. Branch and supplier isolation are confirmed (all 5 assertions passed). But the case's reload expectation was wrong: the branch clears on reload, on both branches. This is a test design issue only.

**Failed:** TC-GSRCH-002, 003, 004, 005, 006, 007, 010, 015, 016, 017, 018, 019, 021.

## 4. Requirement Coverage

| Requirement | Cases | Verification state |
|---|---|---|
| SRCH-01 Branch confirmed | 001 | **Verified** (isolation and supplier routing correct) |
| SRCH-02 Same criteria on both paths | all | **Verified** — the request payloads are identical per case (`searchCriteria` in each `*.integration.json` / `*.direct.json`) |
| SRCH-03 Same availability / count | 002–007, 011–021 | **Failed** — flights match on one-way searches but differ on round-trip, Multi-City, Premium and First; fare options differ everywhere |
| SRCH-04/05/06 Airline, flight number, times, segments, stops | 002–007, 015, 016 | **Verified** for every matched flight (0 stop differences) |
| SRCH-07 Same Cabin | 002–007, 013, 015–017 | **Failed** — DEF-01, DEF-02, DEF-05, DEF-07 |
| SRCH-08 Same RBD (fare option × passenger type × segment) | 002–007, 013, 015–017, 021 | **Failed** only in DEF-07 (1 segment); otherwise 0 differences in every matched fare option |
| SRCH-09 Same baggage | 002–007, 015–017 | **Verified** by allowance (0 differences); wording differs (observation) |
| SRCH-10 Cabin filter | 010, 017 | **Failed** — DEF-01, DEF-02, DEF-06, DEF-07 |
| SRCH-11 RBD filter | 011, 012, 018–021 | **Partly verified** — Economy and Business RBDs pass on both. First and Premium RBDs fail on Integration. Multi-City per-leg RBD is blocked on both (DEF-08) |

## 5. Defect Register

| Defect | Title | Severity | Priority | Category | Cases |
|---|---|---|---|---|---|
| DEF-01 | Integration ignores Premium Economy and returns Economy | High | P1 | Business Rule | 006, 010, 019 |
| DEF-02 | Integration ignores First Class and returns Business | High | P1 | Business Rule | 007, 010, 018 |
| DEF-03 | Integration returns more fare options per flight than Direct | Medium | P2 | Data Integrity | 002, 003, 004, 005, 015, 016 |
| DEF-04 | Round-trip / Multi-City combinations differ; Integration stops at 200 offers | Medium | P2 | Data Integrity | 003, 016, 017 |
| DEF-05 | Cabin named "FirstClass" (Integration) vs "First" (Direct) | Low | P3 | Data Integrity | 005 |
| DEF-06 | Business search returns one First-cabin product (both paths) | Low | P3 | Business Rule | 010 |
| DEF-07 | Direct returns a leg-1 segment as Business in mixed-cabin Multi-City | Medium | P2 | Data Integrity | 017 |
| DEF-08 | Multi-City search silently does nothing with RBD on some legs only (both paths) | Medium | P2 | Validation | 021 |

The full write-ups are in `ManualExecutionResults.md` §3.3.

## 6. Integration vs Direct — Detailed Comparison

**How to read this table.** A **flight** is matched by its segments: flight number, route, and departure and arrival date-time. It is never matched by list position. Inside a matched flight, **fare options** are matched by fare brand, then compared per passenger type and segment. "Differences" counts Cabin, RBD or baggage-allowance mismatches inside matched fare options.

| Search | Flights Int / Dir | Only Int / Only Dir | Fare options Int / Dir | Fare options only Int / only Dir | Duplicates | Cabin·RBD·Baggage differences (matched options) | Cabins returned Int / Dir | RBDs returned Int / Dir |
|---|---|---|---|---|---|---|---|---|
| One-way CAI→DXB Economy | 34 / 34 | 0 / 0 | 64 / 34 | 30 / 0 | 0 | 0 in 34 | Economy / Economy | AEHKLMNQSTVWY / AEHLNQSTVWY |
| Round-trip CAI⇄DXB Economy | 111 / 98 | 13 / 0 | 200 / 98 | 83 / 5 | 0 | 0 in 93 | Economy / Economy | AEHKLMNOQSTVWX / AEHKLNOQSTV |
| CAI→DXB 2ADT+1CHD+1INF | 35 / 35 | 0 / 0 | 64 / 35 | 29 / 0 | 0 | 0 in 35 | Economy / Economy | AEHKLMNQSTVWY / AEHLNQSTVWY |
| CAI→DXB Business | 34 / 34 | 0 / 0 | 59 / 34 | 25 / 0 | 0 | 2 in 34 | Business, FirstClass / Business, First | CDIJKPSZ / CDIJKPSZ |
| CAI→DXB Premium Economy | 34 / 12 | 29 / 7 | 64 / 12 | 10 / 5 | 0 | none matched | Economy / PremiumEconomy | AEHKLMNQSTVWY / J |
| CAI→DXB First Class | 34 / 10 | 30 / 6 | 59 / 10 | 8 / 4 | 0 | none matched | Business, FirstClass / First | CDIJKPSZ / A |
| Economy RBD Q | 24 / 24 | 0 / 0 | 35 / 24 | 11 / 0 | 0 | 0 in 24 | Economy / Economy | Q / Q |
| Economy RBD K | 31 / 31 | 0 / 0 | 43 / 31 | 12 / 0 | 0 | 0 in 31 | Economy / Economy | K / K |
| Economy RBD Y | 35 / 35 | 0 / 0 | 49 / 35 | 14 / 0 | 0 | 0 in 35 | Economy / Economy | Y / Y |
| Business RBD J | 28 / 28 | 0 / 0 | 38 / 28 | 10 / 0 | 0 | 0 in 28 | Business / Business | J / J |
| Business RBD C | 29 / 29 | 0 / 0 | 39 / 29 | 10 / 0 | 0 | 0 in 29 | Business / Business | C / C |
| Economy + RBD J (mismatch) | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 | none matched | — / — | — / — |
| One-way CAI→JED Economy | 41 / 41 | 0 / 0 | 75 / 41 | 34 / 0 | 0 | 0 in 41 | Economy / Economy | AEHKNOQSTUVWX / AEHKNOQUVWX |
| Multi-City Economy | 136 / 122 | 14 / 0 | 200 / 122 | 64 / 0 | 0 | 0 in 122 | Economy / Economy | AKMNQSTUV / AKNQTUV |
| Multi-City Eco + Business | 65 / 61 | 4 / 0 | 65 / 61 | 0 / 0 | 0 | 2 in 61 | Business, Economy / Business, Economy | CDHJMQRSTVZ / CDHJMQRSTVZ |
| First RBD F | 0 / 10 | 0 / 10 | 0 / 10 | 0 / 0 | 0 | none matched | — / First | — / F |
| First RBD A | 1 / 10 | 1 / 10 | 1 / 10 | 0 / 0 | 0 | none matched | Business / First | A / A |
| Premium RBD J | 0 / 5 | 0 / 5 | 0 / 5 | 0 / 0 | 0 | none matched | — / PremiumEconomy | — / J |
| Economy RBD Q+K | 30 / 30 | 0 / 0 | 51 / 30 | 21 / 0 | 0 | 0 in 30 | Economy / Economy | KQ / KQ |
| Multi-City leg-1 RBD Q only | search not submitted | — | — | — | — | — | — | — |

### 6.1 Fare options (reviewer point 1)

- **Missing on Direct.** In every search with results, Integration has fare options that Direct does not have. For example, on CAI→DXB Economy there are 30 extra options on 30 of the 34 flights. They are higher fare brands of the same flight:
  - Emirates *Economy Flex* (K) next to *Economy Saver* (Q);
  - EgyptAir *Good Deal* (K) next to *Best Offer* (S);
  - flynas *VAL* (30 KG) next to *LIG* (20 KG);
  - Kuwait Airways *Saver* (T, 1 PC) next to *Zero* (V, 0 PC).
- **Missing on Integration.** This happens only in round-trip: 5 Emirates *Economy Flex* options (RBD L outbound / K return) exist only on Direct. Integration hit 200 offers in that search, so a result limit may explain it. This is not confirmed.
- **Duplicates.** None on either branch, in any search.
- **Matched options.** Every Direct fare option that has a same-brand match on Integration has the same Cabin, RBD and baggage allowance (0 differences), except DEF-07.
- These differences are **not** treated as equivalent. They are reported as DEF-03 and DEF-04.

### 6.2 Cabin Class (reviewer point 2)

| Cabin searched | Request (both branches) | Integration returned | Direct returned | Verdict |
|---|---|---|---|---|
| Economy | `cabinClass: 1` | Economy only, 34 flights | Economy only, 34 flights | Same |
| Premium Economy | `cabinClass: 2` | **Economy only**, 34 flights — identical to the Economy search | Premium Economy only, 12 flights, RBD J | **DEF-01** |
| Business | `cabinClass: 3` | Business, 34 flights (+1 product in `FirstClass`) | Business, 34 flights (+1 product in `First`) | Same flights; DEF-05, DEF-06 |
| First Class | `cabinClass: 4` | **Business**, 34 flights — identical to the Business search | First only, 10 flights, RBD A | **DEF-02** |

With RBD added: Premium + J → Integration "No Flights Found", Direct 5 flights. First + F → Integration "No Flights Found", Direct 10. First + A → Integration 1 flight in **Business**, Direct 10 in First.

Evidence for both branches (JSON + screenshots): `artifacts/E06_prem.*`, `artifacts/E07_first.*`, `artifacts/E19_premJ.*`, `artifacts/E17_firstF.*`, `artifacts/E18_firstA.*`.

### 6.3 Baggage (reviewer point 3)

The allowances (pieces / kilograms) are equal in every matched fare option and passenger type: **0 allowance differences**.

The text is worded differently on every option — for example "2 Pieces" vs "Number 2 Piece Allowed.", and "30 Kilograms" vs "30 Kilograms Allowed.". Carry-on reads "Check Fare Rule!" on Integration and is empty on Direct. This is recorded as an observation, **not** a functional mismatch.

### 6.4 RBD (reviewer point 4)

- RBD was compared for every matched fare option × passenger type × segment: **0 RBD differences**. The one exception is DEF-07 (segment ET600: Economy/V on Integration, Business/D on Direct).
- **RBD filters.** For Q, K, Y (Economy), J, C (Business) and Q+K, every returned segment has the selected RBD on both branches, and both branches return the same flights. First F/A and Premium J work on Direct only.
- **Fare Basis** is not returned by either branch, so it could not be used.

## 7. Assumptions & Risks Resolved

| Item | Resolution |
|---|---|
| A-01 Cabin Class and RBD offered on both branches | **Confirmed** |
| A-02 Availability moves between searches | **Mitigated** — the paired searches ran at the same moment on both branches. Availability does move between runs: CAI→JED returned 50/39 flights at validation and 41/41 at execution |

## 8. Known Limitations

- **Environment name assumed.** The Project Context does not name the environment for 192.168.1.210. It was recorded as Staging, because that is the only installed safety policy. Only read-only searches were run.
- **Browser mechanism.** The two sessions were driven by a throwaway local Playwright script (Headed, two separate browsers). The Playwright MCP server and the platform BrowserDriver were not used, because BrowserDriver has no profile or credentials for this host. The script is not kept.
- **Possible 200-offer limit on Integration** (round-trip, Multi-City). Every returned result was compared, but results beyond 200, if any, could not be seen.
- **DEF-07** was seen once (one itinerary, one run). Reproducibility is not confirmed.
- **TC-GSRCH-001's reload expectation** is a test-case wording issue. Stage 3 should update the case.

## 9. Recommendations

1. **DEF-01 and DEF-02 (P1):** check the Integration cabin mapping for Premium Economy (`2`) and First (`4`). Then re-run TC-GSRCH-006, 007, 010, 018 and 019.
2. **DEF-03:** decide which behaviour is intended — all fare families (as Integration does) or lowest fare only (as Direct does) — and align the other path.
3. **DEF-04:** confirm whether Integration limits results to 200 offers. If it does, raise or remove the limit for round-trip and Multi-City, then re-run TC-GSRCH-003, 016 and 017.
4. **DEF-08:** show a validation message, or allow RBD on only some of the Multi-City legs.
5. **Stage 3:** remove the reload sentence from TC-GSRCH-001's Expected Result.
