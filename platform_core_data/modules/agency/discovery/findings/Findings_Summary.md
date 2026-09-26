# Findings Summary — `agency`

## run-006 — 2026-09-24 (current)

| Field | Value |
|---|---|
| Run Folder | `run-006__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch` |
| Findings raised by this run | 4 (FINDING-013 … FINDING-016). A fifth, FINDING-017, is filed in `branch` and has a second occurrence on AGN9780 |
| Earlier Findings re-checked | None. This run covers a different story (Auto Reissue). FINDING-001 … 012 are unchanged |
| Discovery Mode | Browser automation: **Browser Driver**, headed (Admin) · **Playwright direct login**, headed (Portal) |
| Generated | 2026-09-24 |

### Index — run-006

| ID | Title | Category | Severity | Confidence | Status | Occurrences | Module | Description (one line) |
|---|---|---|---|---|---|---|---|---|
| FINDING-013 | With Auto Reissue on and no credential, the screen shows "Required", not the specification's message | Requirement Gap | N/A | 97% | **Rejected — Confirmed Intended** (`PO-23`) | 1 | `agency` | The UI blocks the save with "Required". *"Select at least one eligible credential"* is the API's message. |
| FINDING-014 | An Agency is Inactive while its Auto Reissue change waits for approval | Observation | N/A | 96% | **Rejected — Confirmed Intended** (`PO-24`) | 3 | `agency` | Send For Approval → Inactive + Pending until approved. The edit form's Approve avoids it. |
| FINDING-015 | Top bar says "Ticketed Document" while the booking Status says "Booked" | Observation | N/A | 95% | **Rejected — Confirmed Intended** (`PO-24`) | 2 | `agency` | The eligibility condition is Status Booked, not the bar label. Same in Admin and the Portal. |
| FINDING-016 | On the Portal, the Reissue button shows without a lock | Observation | N/A | 90% | **Rejected — Confirmed Intended** (user, 2026-09-24) | 1 | `agency` | **No lock is needed on the Portal (intended).** Portal `lockedStatus 0`, with no lock control, still shows Reissue. In Admin it was seen only with the lock held. Annotated Q1a/Q1b. |

### Breakdown — run-006

**By Severity:** 0 Critical · 0 High · 0 Medium · 0 Low · 4 N/A
**By Category:** 1 Requirement Gap · 3 Observation · 0 Bug
**By Status:** 0 Confirmed · 0 Needs Human Review · 0 Duplicate · 4 Rejected (confirmed intended)
**By Module:** `agency` 4

### Evidence Packages — run-006

| Finding ID | Evidence Package | Evidence Files |
|---|---|---|
| FINDING-013 | `findings/FINDING-013_S2UiRequiredVsApiMessage/` | 2 |
| FINDING-014 | `findings/FINDING-014_InactiveWhilePendingApproval/` | 5 |
| FINDING-015 | `findings/FINDING-015_TicketedDocumentLabelVsBookedStatus/` | 3 |
| FINDING-016 | `findings/FINDING-016_PortalReissueShownWithoutLock/` (with the annotated copy) | 6 |

**Candidates closed before publishing:** Amadeus excluded from the picker (intended, `PO-21`), and the first Branch OFF check (a concurrent manual change; see the `branch` Findings Summary).

---

## run-004 — 2026-08-18 (retained, unchanged)

| Field | Value |
|---|---|
| Run Folder | `run-004__2026-08-17_14-35-25__UserStory__US-4222-UpdateAgency` |
| Findings raised by this run | 5 (FINDING-008 … FINDING-012) |
| run-001 Findings re-checked | 7 — outcomes in [`ReCheck_run-004.md`](ReCheck_run-004.md) |
| Discovery Mode | Browser automation — **Browser Driver**, headed |
| Generated | 2026-08-18 |

**run-001's seven Findings and their packages are unchanged.** run-004 re-checked each of them and recorded the outcome in `ReCheck_run-004.md`; where a re-check produced materially new information it raised its own Finding rather than editing run-001's.

### Index — run-004

| ID | Title | Category | Requirement Disposition | Severity | Confidence | Status | Occurrences | Module | Description (one line) |
|---|---|---|---|---|---|---|---|---|---|
| FINDING-008 | PCC section is present; one tab per supplier inherited from the parent Branch | Requirement Gap | Re-opens FINDING-002, **narrowed to two fields** — `Story Outdated / Requires Business Confirmation` *(row 2)* after the 2026-08-18 experiment | N/A | 99% | Needs Human Review | 1 | `agency` | Three of AC-9's controls exist per tab and the "filters" are the tabs; only `Search Supplier Credential PCC` and `Ticketing Supplier Credentials PCC` are absent. |
| FINDING-009 | `Manager Name *` carries a mandatory marker but is read-only | Observation | **`Story Outdated — Confirmed`** *(row 4)* — authored in the Supplier master, inherited read-only | N/A | 96% | Needs Human Review | 2 | `agency` | Editable in `Master → Supplier → Supplier`; read-only on both Branch and Agency, so AC-9's Manager Name message is not an Agency requirement. |
| FINDING-010 | Numeric and URL fields reject or accept input silently, with no format message | **Bug** | Numeric: **`Application Defect (candidate)`** *(row 5, PRD XC-20 `[V]`)* · URL: *(row 2)* | **Medium** | 92% | Needs Human Review | 2 | `agency` | `Credit limit *` discards letters with no message; `Company URL` accepts `not a url at all`. |
| FINDING-011 | Payment option list still renders person names and single letters | Observation | Not a requirement mismatch — master-data quality, pre-disposed by `APP-002` | N/A | 98% | Needs Human Review | 1 | `agency` | 29 options; the count moved 28 → 29 since run-001 with no action by this run. |
| FINDING-012 | `Blue Command Screen` is present, disabled, and documented nowhere | Requirement Gap | **Documented exception** — out of scope by decision, 2026-08-18 (with `Transfer Pnr Option` and `Enable Search Limit`) | N/A | 95% | Needs Human Review | 1 | `agency` | Disabled with the inline hint *"This option requires the Galileo supplier to be enabled"*. No test case in this run. |

### Breakdown — run-004

**By Severity:** 0 Critical · 0 High · **1 Medium** · 0 Low · 4 N/A
**By Category:** 2 Requirement Gap · 2 Observation · **1 Bug**
**By Status:** 0 Confirmed · 5 Needs Human Review · 0 Duplicate · 0 Rejected
**By Module:** `agency` 5

**Why one Finding is a `Bug` where run-001 raised none.** run-001's seven were all disagreements between two requirement sources, which §5.4 rates `N/A`. FINDING-010's numeric half is different in kind: PRD **XC-20** `[V]` states both the rejection *and* the message, no source supersedes it, and the message does not appear. That is an application falling short of a settled requirement, which is what `Bug` means here. It is still `Needs Human Review`, not `Confirmed` — Confidence is 92%, but §5.6 also requires the requirement to be unambiguous, and whether XC-20's platform-wide rule was meant to bind this form is exactly the judgement this stage must not make.

### Evidence Packages — run-004

| Finding ID | Evidence Package | Evidence Files |
|---|---|---|
| FINDING-008 | `findings/FINDING-008_PccSectionConditionallyRendered/` | 6 (metadata + 4 screenshots + dependency probe JSON) |
| FINDING-009 | `findings/FINDING-009_ManagerNameMandatoryButReadOnly/` | 3 (metadata + original and annotated screenshot) |
| FINDING-010 | `findings/FINDING-010_InputFormatMessagesAbsent/` | 4 (metadata + original and annotated screenshot + probe JSON) |
| FINDING-011 | `findings/FINDING-011_PaymentOptionDataPollutionRecheck/` | 3 (metadata + original and annotated screenshot) |
| FINDING-012 | `findings/FINDING-012_BlueCommandScreenDisabledUndocumented/` | 3 (metadata + original and annotated screenshot) |

**Annotated evidence.** Every run-004 Finding that records something this run could not interpret carries a labelled rectangle around the specific control, plus the unmarked original beside it (§5.11.1). Five rectangles were requested and five were drawn — `Q1` Manager Name, `Q2` Payment option group, `Q3` Blue Command Screen, `Q4` PCC section, `Q5` Credit limit — with `Q6` (Company URL) captured in a second pass. No rectangle came back missing, and every rectangle maps to a written question in its Finding's **Unclear Items** table.

**Shared evidence** for run-004 lives once under `../evidence/run-004/` and is cited by path rather than copied into every package.

---

## run-001 — 2026-07-31 (superseded on FINDING-002 only; otherwise current)


| Field | Value |
|---|---|
| Module | `agency` |
| Run Folder | `run-001__2026-07-31_11-56-38__UserStory__US-4222UpdateAgency` |
| Total Findings | 7 |
| Generated | 2026-07-31 14:20 |

## Index

| ID | Title | Category | **Requirement Disposition** | Severity | Confidence | Status | Occurrences | Module | Description (one line) |
|---|---|---|---|---|---|---|---|---|---|
| FINDING-001 | Mandatory-field violations render `Required`, not US-4222's per-field messages | Requirement Gap | **Story Outdated — PRD-corroborated** *(row 1)* | N/A | 95% | Needs Human Review | 4 | `agency` | Four mandatory fields all rendered `Required`; the story specifies a distinct message for each of ~20 fields. |
| FINDING-002 | AC-9's entire Airline Supplier Credential (PCC) section absent from both forms | Requirement Gap | **Possible Application Defect / Possible Removed Feature** *(row 3 — NOT story-outdated)* | N/A | 90% | Needs Human Review | 1 | `agency` | Neither the update nor the create form contains the PCC section or any of its five named fields. |
| FINDING-003 | Mandatory Payment option control offers 28 choices, 23 of them person names or single letters | Observation | Not a requirement mismatch — environment / data quality | N/A | 98% | Needs Human Review | 2 | `agency` | Cash/Wallet/Credit Card/BANQUE MISR/Fawry followed by 21 given names plus `m` and `f`. |
| FINDING-004 | Document upload applies no file-type restriction; a `.png` is attached where AC-3 requires PDF | Observation | **Application Defect (candidate)** *(row 5)* | N/A | 90% | Needs Human Review | 1 | `agency` | The logo input restricts to `image/*`; the document input declares no `accept` at all. |
| FINDING-005 | Seven undocumented fields on the update form — later enhancements, two mandatory | Requirement Gap | **Story Outdated / Requires Business Confirmation** — `Outstanding Threshold` **Confirmed** *(row 4)*, `Remarks` **PRD-corroborated** *(row 1)*, other five *(row 2)* | N/A | 95% | Needs Human Review | 1 | `agency` | `Outstanding Threshold *` and `Remarks *` are mandatory and absent from US-4222 — both legitimate later functionality. |
| FINDING-006 | AC-5's `Designation` dropdown absent from the Sales Contact section on both forms | Requirement Gap | **Story Outdated / Requires Business Confirmation** *(row 2)* | N/A | 90% | Needs Human Review | 1 | `agency` | The section renders Name, Email ID, Phone Number and `Add` — no Designation control. |
| FINDING-007 | Segregation of duties unassessable — one identity, which sees Approve and Reject on the edit form | Test Gap | Not a requirement mismatch — coverage limitation *(the `Send For Approval` label difference is row 1)* | N/A | 95% | Needs Human Review | 1 | `agency` | Only `odeysysadmin` (Super Admin) is configured, so maker-vs-checker cannot be separated. |

### Requirement Disposition — what the column means

Added 2026-07-31 by user directive. **US-4222 is relatively old and the application has evolved since it was authored**, so the running application is now the primary reference *where the story is clearly outdated*. Every mismatch is still recorded as a Finding and stays fully traceable; what the directive changes is the disposition, never whether it is reported.

The taxonomy and the discriminator that assigns it live in `../context/ProjectContext.md` §1.1. In short: when the application and the story disagree, **the PRD decides** — corroborating the application means the story is outdated (row 1), silence means treat the application as the reference pending confirmation (row 2), and **corroborating the story means the opposite: escalate as a possible removed feature (row 3)**, never auto-disposition it as outdated.

**Disposition summary:**

| Disposition | Findings | Meaning for Stage 3 |
|---|---|---|
| `Story Outdated — PRD-corroborated` (row 1) | FINDING-001, plus `Remarks` in 005 and the `Send For Approval` label in 007 | Design to observed behaviour. Settled |
| `Story Outdated — Confirmed` (row 4) | `Outstanding Threshold` in FINDING-005 | Design to observed behaviour. Settled by the product owner |
| `Story Outdated / Requires Business Confirmation` (row 2) | FINDING-006, plus five fields in FINDING-005 | Design to observed behaviour, labelled as resting on the directive |
| **`Possible Application Defect / Possible Removed Feature`** (row 3) | **FINDING-002** | **Do not design to observed behaviour. Blocked on DOQ-02** |
| `Application Defect (candidate)` (row 5) | FINDING-004 | Design to the requirement; let execution report the outcome |
| Not a requirement mismatch | FINDING-003, FINDING-007 | Unaffected by the directive |

**Two of the seven are not "story outdated", and that is the point of the discriminator.** FINDING-002 and FINDING-004 both describe the application falling short of something no source superseded — a section two `[V]`-tagged PRD requirements describe, and a data-integrity rule on contract documents. Dispositioning either as outdated specification would convert a possible regression into a documentation correction.

## Breakdown

**By Severity:** 0 Critical · 0 High · 0 Medium · 0 Low · 7 N/A

**By Category:** 4 Requirement Gap · 2 Observation · 1 Test Gap

**By Status:** 0 Confirmed · 7 Needs Human Review · 0 Duplicate · 0 Rejected

**By Module:** `agency` 7

**Note on the severity and status distribution — this is a deliberate outcome, not an omission.** No Finding is `Confirmed` and none carries a Critical/High/Medium/Low severity, and the reason is structural rather than a judgment that nothing serious was found. Every Finding in this run is a disagreement between two requirement sources, or a limitation of this run's own coverage — not an application misbehaving against a settled requirement. §5.4 assigns `N/A` automatically to `Requirement Gap`, `Observation` and `Test Gap`, and §5.6 reserves `Confirmed` for observations that contradict a *clearly documented* requirement with no plausible alternative explanation. Here the Project Context deliberately carries **both** sides of each conflict forward (US-4222 as authoritative, the PRD's `[V]`/`[O]`/`[I]` tags alongside it), so "which source is right" is a human decision this stage is required not to make. The impact of each Finding is stated in its **Business Risk** field, which is where the weight of FINDING-001 and FINDING-005 in particular is recorded — both of them materially affect what Stage 3 can design.

## Evidence Packages

| Finding ID | Evidence Package | Evidence Files |
|---|---|---|
| FINDING-001 | `findings/FINDING-001_ValidationMessageMismatch/` | 4 (metadata + 2 screenshots + observed messages) |
| FINDING-002 | `findings/FINDING-002_MissingPccSection/` | 4 (metadata + 2 screenshots + full section inventory) |
| FINDING-003 | `findings/FINDING-003_PaymentOptionDataPollution/` | 3 (metadata + screenshot + rendered option list) |
| FINDING-004 | `findings/FINDING-004_NonPdfDocumentAttached/` | 3 (metadata + screenshot + file-input accept attributes) |
| FINDING-005 | `findings/FINDING-005_UndocumentedMandatoryFields/` | 4 (metadata + 2 screenshots + app-marked mandatory list) |
| FINDING-006 | `findings/FINDING-006_MissingDesignationField/` | 2 (metadata + screenshot) |
| FINDING-007 | `findings/FINDING-007_ApprovalControlsOnMakerForm/` | 3 (metadata + screenshot + button inventory) |

**Shared evidence** referenced by several Findings is held once under `../evidence/` rather than copied into each package: `agency_update_form_fullpage.png`, `agency_list.png`, `session_console.log`, `session_network_summary.txt`.
