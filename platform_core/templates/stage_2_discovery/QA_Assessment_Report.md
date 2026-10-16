<!--
TEMPLATE — QA Assessment Report (Stage 2 — shared)
Renders to: platform_core_data/modules/{{MODULE_SLUG}}/discovery/QA_Assessment_Report.md
Authority:  .claude/skills/explorer-skill/SKILL.md §19 (Standard Output Contract — this exact
            section order), §9 Outputs #4, §12 Artifacts

The 13 sections below are the authoritative structure. Order is mandatory: Test Design (and any
future consumer) must never parse free-form prose to extract what it needs.

Findings are NEVER restated in full prose here — reference them by ID. Full detail lives only in
that Finding's own metadata.md (see findings/FINDING_metadata.md).
-->

# QA Assessment Report — {{RUN_FOLDER}}

| Field | Value |
|---|---|
| Module | `{{MODULE_SLUG}}` |
| Produced by run | `{{RUN_FOLDER}}` |
| Revision | {{REVISION_COUNT}} <!-- in-place edits since creation; this artifact belongs to the module, not the run --> |
| Project Context validated against | `modules/{{MODULE_SLUG}}/context/ProjectContext.md` |
| Discovery Mode(s) used | {{DISCOVERY_MODES}} |
| Generated | {{TIMESTAMP}} |
| Status | {{STATUS}} <!-- Pending Review / Approved --> |

## 1. Scope

<!-- The Run Scope Type/Source and Run Type this run used (§16), and which Project Context this run
     validated against. -->

{{SCOPE}}

## 2. Objectives

<!-- What this run set out to verify, derived from the Project Context Scope Summary and the Run
     Scope's specific target (an Epic/Feature/Story/Bug description, or the full in-scope module
     list for Entire Project). -->

{{OBJECTIVES}}

## 3. Evidence Sources

<!-- Every Discovery Mode (§8.1) actually used this run, which in-scope areas each covered, and why
     (§8.3). A lower-priority mode substituted for a higher one must be disclosed here, never
     silently. Modes: 1 Browser automation, 2 Existing screenshots/recordings, 3 Documentation,
     4 User-guided exploration, 5 Static artifacts, 6 APIs, 7 Other static records. -->

| Discovery Mode | In-Scope Areas Covered | Why This Mode |
|---|---|---|
| {{MODE}} | {{AREAS}} | {{REASON}} |

## 4. Modules Explored

<!-- Sitemap/route structure, business modules and their purpose, and reusable UI components shared
     across modules. -->

| Module | Route(s) | Purpose | Discovery Mode |
|---|---|---|---|
| {{MODULE}} | {{ROUTES}} | {{PURPOSE}} | {{MODE}} |

**Shared UI components:** {{SHARED_COMPONENTS}}

## 5. Observed Behaviour

<!-- User workflows and business rules/validation behaviour ACTUALLY WITNESSED, stated factually.
     No inference here — inferred statements belong in §7 Assumptions. -->

| Module | Workflow / Rule | What Was Observed | Evidence Category | Finding ID(s) |
|---|---|---|---|---|
| {{MODULE}} | {{WORKFLOW}} | {{OBSERVATION}} | {{EVIDENCE_CATEGORY}} | {{FINDING_IDS}} |

## 6. Confirmed Behaviour

<!-- The SUBSET of §5 explicitly validated against a clearly documented Project Context requirement
     and found to MATCH. Ambiguous or contradicted items belong in §11 Gaps, not here. -->

| Requirement (Project Context §) | Confirmed Behaviour | Evidence Category | Finding ID(s) |
|---|---|---|---|
| {{REQUIREMENT}} | {{BEHAVIOUR}} | {{EVIDENCE_CATEGORY}} | {{FINDING_IDS}} |

## 7. Assumptions

<!-- Every inferred statement not directly observed (§4 Core Philosophy Principle 3), each tagged
     with its Evidence Category (§17). An assumption presented as an observation is a spec violation. -->

| ID | Assumption | Why Inferred (not observed) | Evidence Category |
|---|---|---|---|
| {{ASSUMPTION_ID}} | {{STATEMENT}} | {{WHY_INFERRED}} | {{EVIDENCE_CATEGORY}} |

## 8. Open Questions

<!-- Every candidate that could not be validated/reproduced and has no other supporting evidence
     (§5.1 step 2), PLUS every carried-forward Project Context Assumption/Risk left genuinely
     unresolved by this run.

     ANNOTATED EVIDENCE (§5.11.1). An Open Question about something VISIBLE — a field, control,
     message, column, icon, section, value, or behaviour on screen — must cite the annotated
     screenshot and the rectangle label that marks it. "A field on the Payment Settings form is
     unclear" is not answerable; "Q2 on payment_settings.annotated.png" is.

     A question about something non-visual (a business rule, a missing requirement, an
     authorization model) has nothing to box, and its Evidence columns read "—".

     Where no live page was available (§5.11.3), the Annotated column carries the verbatim
       Annotated evidence not capturable — Discovery Mode: <mode>
     and the question itself describes the location as precisely as the evidence allows. The
     question and its impact stay mandatory either way. -->

| ID | Open Question | Rect | Why the Answer Matters | What Would Resolve It | Original | Annotated | Project Context Ref |
|---|---|---|---|---|---|---|---|
| {{OQ_ID}} | {{QUESTION}} | {{RECT_LABEL}} | {{WHY_IT_MATTERS}} | {{RESOLUTION_PATH}} | `{{ORIGINAL_PATH}}` | `{{ANNOTATED_PATH}}` | {{CONTEXT_REF}} |

## 9. Discovered Risks

<!-- Business/technical risk observations surfaced during exploration. Reference Findings by ID. -->

| ID | Risk | Business Risk | Technical Risk | Finding ID(s) |
|---|---|---|---|---|
| {{RISK_ID}} | {{RISK}} | {{BUSINESS_RISK}} | {{TECHNICAL_RISK}} | {{FINDING_IDS}} |

## 10. Coverage

<!-- Roll-up from Coverage_Summary.md (§7), including the Discovery Mode per entry. The detailed
     tracker stays in its own artifact; this is the summary view. -->

| Area / Module | Coverage Status | Discovery Mode | Notes |
|---|---|---|---|
| {{AREA}} | {{STATUS}} <!-- Covered / Partial / Blocked / Unreachable --> | {{MODE}} | {{NOTES}} |

**Roll-up:** {{COVERED_COUNT}} Covered · {{PARTIAL_COUNT}} Partial · {{BLOCKED_COUNT}} Blocked · {{UNREACHABLE_COUNT}} Unreachable

## 11. Gaps

<!-- Every place observed application behaviour CONTRADICTS, EXTENDS, or is ABSENT FROM the Project
     Context. Ambiguous items from §5 land here rather than in §6 Confirmed Behaviour. -->

| ID | Gap Type | Description | Project Context Ref | Finding ID(s) |
|---|---|---|---|---|
| {{GAP_ID}} | {{GAP_TYPE}} <!-- Contradicts / Extends / Absent --> | {{DESCRIPTION}} | {{CONTEXT_REF}} | {{FINDING_IDS}} |

## 12. Recommendations

<!-- Suggestions for the human reviewer, including Regression Test Candidates (areas worth a
     regression test — NOT designed test cases, which are Stage 3's authority) and every Finding
     whose Category is `Recommendation`. Suggestions only, never directives. -->

| ID | Recommendation | Rationale | Finding ID(s) |
|---|---|---|---|
| {{REC_ID}} | {{RECOMMENDATION}} | {{RATIONALE}} | {{FINDING_IDS}} |

**Regression Test Candidates:** {{REGRESSION_CANDIDATES}}

## 13. Inputs for Test Design

<!-- The explicit handoff package (§22). Stage 3 reads this section to confirm it has everything it
     needs; every Finding referenced must have a populated Expected Behavior field citing a specific
     Project Context section, since that citation is what lets Test Design fill its own mandatory
     Requirement Reference and Discovery Reference without re-deriving them. -->

**Findings by ID:**

| Finding ID | Category | Status | Severity | Module |
|---|---|---|---|---|
| {{FINDING_ID}} | {{CATEGORY}} | {{STATUS}} | {{SEVERITY}} | {{MODULE}} |

**Assumption disposition:**

| Assumption ID | Disposition | Basis |
|---|---|---|
| {{ASSUMPTION_ID}} | {{DISPOSITION}} <!-- Confirmed / Refuted / Unresolved --> | {{BASIS}} |

**Requirement Gaps needing a coverage decision:**

| Gap ID | Requirement | Decision Needed From Test Design |
|---|---|---|
| {{GAP_ID}} | {{REQUIREMENT}} | {{DECISION_NEEDED}} |

**Handoff confirmation:** {{HANDOFF_CONFIRMATION}}
<!-- State explicitly that every input .claude/skills/test-design-skill/SKILL.md §4 declares it
     needs is present and specific — or name precisely what is absent. -->

## Approval Scope (optional — only for a partial approval)

<!-- Leave this section OUT unless the reviewer approves only PART of this artifact. Most artifacts
     never need it: a whole-artifact approval is the Status header alone, exactly as before.

     Use it when the Status header records both approved and open items (it then reads "Mixed" to the
     platform, and no stage may consume the artifact). Listing the items lets a stage consume an
     approved, INDEPENDENT part — workflows_and_pipelines/pipeline/pipeline.md §5.3.2 "Scope-aware
     partial approval". The reviewer writes it; no stage ever fills it in or changes a Status.

     Item       — an ID the Traceability Matrix cites: a section (§2, §2.4), a requirement or decision
                  (AC-3, PO-24), a finding (FINDING-012). Another module's item: module:ID.
     Status     — Approved | Pending | Rejected
     Depends On — items this one needs (— for none)
     Affects    — for a Pending/Rejected item: what it changes; those items cannot proceed while it is open

     The table only takes effect once recorded:
       node platform_core/tools/run_manager/cli.js state approve-scope --artifact <this file> --approved-by "<reviewer>"
     Any later edit to this file invalidates that record. -->

| Item | Status | Depends On | Affects |
|---|---|---|---|
| {{ITEM_ID}} | {{Approved / Pending / Rejected}} | {{DEPENDS_ON}} | {{AFFECTS}} |
