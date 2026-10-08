# FINDING-R20 — Every human-readable place and airline name on the reissue screens is produced by an unverified Portal-side lookup

- **Finding ID:** FINDING-R20
- **Title:** The core service sends bare IATA codes and carrier codes. Every airport name, city name, country name and airline name displayed on the reissue screens is produced by a Portal-side lookup that **no mapping rule covers, no test verifies, and nothing would notice if it were wrong**
- **Category:** Defect (Undeclared app-origin data / Missing verification)
- **Severity (proposed):** **Medium.** No incorrect name has been observed. The defect is structural: a whole class of customer-facing values is generated inside the application with no declared source and no check. A stale or wrong lookup entry would render **a correct code as the wrong city**, which is exactly the kind of error an agent reads past because the code beside it is right
- **Status:** Pending Review (Stage 2, run-007)
- **Module / screen:** Reissue → Step 1 results, Step 2 Review & Pay, Step 3 Confirmation
- **Found by:** Displayed-value mapping inventory (rows `R3`, `R9`, `V14`; gap §4.3), 2026-09-28. **Never raised as a numbered finding until now**
- **Re-confirmed:** run-007 scenario 10 — core carries no airport, city, country or airline name on any segment

## Observed

What the core service actually sends per segment:

```
origin: "CAI"                    <- a bare string
operatingCarrierCode: "SV"       <- a code
```

What the screen displays:

```
Cairo International Airport · Cairo · Egypt
Saudi Arabian
```

**None of those four strings exists anywhere in the core response.** They are produced inside the
Portal from the code.

## The affected values

| Inventory row | Displayed value | Core source |
|---|---|---|
| `R9` | Airport name, city name, country name | **absent from core entirely** |
| `R3` | Airline name on the offer card | core sends only `operatingCarrierCode` |
| `V14` | "Operated by" carrier on Review & Pay | same lookup |

The inventory groups these with three further undeclared derivations — the lowest-fare badge, the
"nonstop throughout" label and the sector count — under gap §4.3. **The names are the consequential
ones** and are the subject of this finding; the derived labels are recorded as a concern rather than
a defect because a wrong label is self-evident on screen while a wrong city name is not.

## Why this is raised as a defect rather than left as an observation

The scope's oracle (ProjectContext §2.0) says a value the app never returns cannot be judged missing.
**That is not the situation here.** These values *are* returned by the app and *are* displayed; they
simply have no declared provenance and no verification. The precedent for handling exactly this is
already set by the change fee, whose mapping rule states it is *"declared app-origin… must never be
assumed to come from core or the supplier."*

**Six displayed values carry the same risk and have no such declaration.** The asymmetry is the
defect: one app-origin value is declared and governed, the rest are not.

## What could go wrong, concretely

- A lookup table missing an entry renders a blank, or the raw code, or nothing — unverified which.
- A stale entry renders the wrong airport for a correct code. On a multi-airport city this is a
  passenger going to the wrong airport, and the code on screen would be right.
- Two screens using different lookup paths could disagree about the same code. **Never tested** —
  cross-screen name consistency is test case `TC-RMAPX-048` and has never been run.

## Expected

Every displayed value either maps to a supplier or core field, or is **declared app-origin** with its
source and rule recorded in the Project Context — as the change fee is. Declared app-origin values
are verified: the rendered name corresponds to the code the core service sent, and a code with no
lookup entry degrades to the code itself rather than to a blank or a wrong name.

## Actual

Six displayed values are app-origin and undeclared. The four name values have no verification of any
kind, on any screen, and no cross-screen consistency check.

## Steps to reproduce

1. Run a reissue search and capture the core response and the surface response together.
2. Search the core response for the airport name, city name, country name and airline name shown on
   the card. **None is present.**
3. Confirm the surface response carries them and that no mapping rule in ProjectContext §2.1 covers
   any of them.

## Not established

- **Where the lookup lives** and what it is keyed on — a Portal-side table, a master-data service, or
  a static asset. This decides whether it can drift from the supplier's own naming.
- **Behaviour for an unknown code.** No code without a lookup entry has been observed.
- **Whether all screens use the same lookup.** Untested.

## Related

- **FINDING-R19** — the supplier badge, the same family of undeclared or mis-sourced display values.
- Test cases `TC-RMAPF-003`, `TC-RMAPF-009`, `TC-RMAPF-033` (per-screen) and `TC-RMAPX-048`
  (cross-screen), all currently `NOT EXECUTED`.

## Evidence

- `discovery/evidence/s10-core-reshop-TTDMXL-B.json` — `flightSegments[]` carries bare codes only
- `discovery/evidence/s10-portal-search-TTDMXL.json` — `segments[].origin.airportName`, `.cityName`,
  `.countryName` and `operatingCarrier.name`, none of which appear at core
- `discovery/evidence/ReissueFlow_MappingInventory_s1_run-007.md` — rows `R3`, `R9`, `V14`, gap §4.3
