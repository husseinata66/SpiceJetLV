<!--
TEMPLATE — Single Test Case entry (Stage 3 — shared, divergence point)
Used INSIDE: platform_core_data/modules/{{MODULE_SLUG}}/test_design/TestCases_{{MODULE}}.md
Authority:  .claude/skills/test-design-skill/SKILL.md §6.1 (these fields, this order — "no more"),
            §6.0 (Lean Test Case Philosophy), §6.0.1 (Granularity Tier), §6.2

THE TEST CASE IS FOR EXECUTION, NOT ANALYSIS. Traceability, Risk, and categorization detail are
mandatory for the pipeline's traceability guarantee — but they are recorded in the Traceability
Matrix and Coverage Report (keyed by Test Case ID), NOT as inline fields here. Adding a Requirement
Reference / Risk / Category field to this block is a spec violation, not extra rigour.

ONE BUSINESS BEHAVIOUR PER TEST CASE. A case chaining unrelated actions must be split. When several
data sets each need their own pass/fail and evidence, write one case per data set — execution records
one result per (Test Case ID, Assertion ID), not per data set (§6.0).

Readability Check — apply before finalizing (§6.0):
  1. Can a new QA engineer execute it without help?
  2. Can it be understood in under 30 seconds?
  3. Is every step necessary?
  4. Is there any redundant wording?
  5. Does it verify only one business rule?
If any answer is "No", rewrite the case.

GOLDEN RULE: if removing a sentence does not change how the test is executed, remove it.

THIS BLOCK IS PARSED, NOT ONLY READ. `platform_core/tools/test_suite_export/` renders these blocks
into TestCases_{{MODULE}}.xlsx (§9.1), so the field MARKERS below are a machine contract, not
formatting preference:

  - Every field starts at the beginning of a line as `**Label:**` — exactly the labels below, spelled
    and cased as written. A renamed or reformatted marker is not read, and its content silently
    lands in the previous field instead.
  - The case heading may be either `### {{TEST_CASE_ID}} — {{TITLE}}` (this template's form) or
    `## {{TEST_CASE_ID}}` with a separate `**Title:**` field. Both are supported; pick one per file.
  - Prose emphasis that is not a field (`**Important:** …`) stays with the field it appears in, so it
    is safe — but never invent a new `**Label:**` expecting it to become a column. The column list is
    §6.1's, and only §6.1's.

Run `cli.js --check` after authoring: it reports any case missing Title, Objective, Steps, Expected
Result, Priority, or Tags, and exits non-zero. A case that reaches Stage 4M with a blank Expected
Result is unexecutable, so that warning is never cosmetic.
-->

### {{TEST_CASE_ID}} — {{TITLE}}

<!-- Test Case ID: stable, unique, scoped per module. e.g. TC-LOGIN-001
     Title: short, specific, human-scannable. -->

**Objective:** {{OBJECTIVE}}
<!-- ONE sentence stating what this case verifies. Not a restatement of the requirement. -->

**Preconditions:** {{PRECONDITIONS}}
<!-- Only what is required IMMEDIATELY BEFORE execution. e.g. "User is logged in as Admin." -->

**Test Data:**
<!-- The specific input values the steps actually reference, kept minimal — never values the steps
     never use. For a negative test, include the exact boundary/invalid value being exercised (§7).
     OMIT THIS FIELD ENTIRELY when the case has no test data.

     Two forms, both exported correctly — pick by how many values there are:
       inline, for one or two values:   **Test Data:** Query: `wireless mouse`
       a table, for several:            the Field/Value table below
     A table keeps its line structure in the exported cell, so the Field↔Value pairing survives. -->

| Field | Value |
|---|---|
| {{FIELD}} | {{VALUE}} |

**Steps:**
<!-- ONE USER ACTION PER STEP. Steps carry actions only — verification belongs in Expected Result.
     "Click Save and verify the message appears" is two things: split it.
     Short, direct sentences. No jargon, no long paragraphs, no explaining obvious actions.

     Good: "1. Open the Agency page. 2. Click **Create Agency**. 3. Enter a valid Agency Name.
            4. Leave the Product Access section empty. 5. Click **Save**."
     Bad:  "Navigate to the Agency management module, ensuring all required prerequisites are
            satisfied before attempting to initiate the creation workflow…"

     Write each step on its own line as a numbered Markdown list item. The exporter joins them into
     one spreadsheet cell as `1. … | 2. …`, renumbering canonically — so one action per line is what
     makes "failed at step 3" resolvable when Stage 4M records a per-step result. -->

1. {{STEP}}

**Expected Result:**

1. [A1] {{EXPECTED_POINT}}
<!-- A NUMBERED LIST, one measurable verification point per line, each tagged with its Assertion ID
     (§6.1 Expected Result Rules). No paragraphs. Every point has exactly one Assertions row below.
     Name the exact value / message / status / count; quote UI text and values in `backticks`.
     Every point comes from a requirement, contract or confirmed business rule — never from what the
     system was observed doing.
     For a regression test derived from a Finding (§5.3), state the CORRECTED behaviour — never a
     restatement of the bug.

     UI:   1. [A1] The message `Product Access is required` is shown.
           2. [A2] The Agency is not saved.
     API:  1. [A1] Status code is `404`.
           2. [A2] `$.error.code` is `USER_NOT_FOUND`.
     Bad:  "The application should ideally validate according to the business rules and prevent the
            user from proceeding." -->

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | {{EXPECTED_VALUE}} | {{EXPECTED_SOURCE}} | {{CHECK}} | {{REQUIREMENT_REF}} |
<!-- REQUIRED on every NEW or MATERIALLY UPDATED case (Phase 5.8 — test-design-skill §6.1a). One row per
     verification point the Expected Result states, so execution records each one against its ID:
       Assertion ID    — A1, A2, … stable within this case. Never renumber; a removed assertion's ID is
                         not reused. (Test Case ID, Assertion ID) is the identity execution reports against.
       Expected        — the expected value or condition itself (`404`, count(A) = count(B), `Account
                         locked`) — never a description such as "number of flights"
       Expected Source — where the value comes from: a requirement ID (AC-3, FR-12, BR-4), an API
                         contract (`API contract GET /users/{id} 404 $.status`), `Test Data`, or a
                         platform artifact by path — never an observation. "Expected Result" is still
                         accepted but points back at this case; name the real source instead.
       Check           — equals · contains · matches <pattern> · within ±N · ≥ / ≤ / > / < · present ·
                         absent · not equals · classification = …
       Requirement     — the requirement it verifies (AC-3, PO-24, §2.4 …); must also appear in this
                         case's TraceabilityMatrix.md row
     One row per point that can fail on its own; never merge two such points, never add a row that
     always passes or fails with another. Sibling cases checking the same thing use the same rows.
     OPTIONAL 6th column `Rule`: the Shared Definition sub-check this row applies (e.g. VR-01.2, §6.1b).
     Add it only when the case cites a validation rule. -->
<!-- PRECONDITIONS / STEPS may cite Shared Definitions by ID ("SETUP-1.", "Apply VR-01.") instead of
     copying shared setup or comparison logic (§6.1b).
     Stage 3 approval is refused for a new or changed case without a valid table. An UNCHANGED legacy case
     needs none and is never rewritten to gain one. -->

**Priority:** {{PRIORITY}}
<!-- P1–P4 — how urgently this case should run relative to others. -->

**Tags:** {{TAGS}}
<!-- Short labels only, never a paragraph. MUST include the Granularity Tier (§6.0.1) on every case:
       Atomic     — a single business rule or validation
       Scenario   — one complete user workflow composed of several related business rules
       E2E        — an entire business journey spanning multiple screens or modules
     Plus, as applicable: Smoke, Regression, Negative-InvalidInputs, Blocked, Deferred.
     NOT AutomationCandidate — that tag is RETIRED (2026-08-01). The Automation field below is the
     single authoritative automation decision; a tag that could disagree with it no longer exists.
     Tags replace what used to be separate Category / Test Type / Automation-Candidate fields.

     An E2E case must state in its Objective that it spans multiple screens/modules, and never
     replaces the Atomic/Scenario cases covering the same ground — E2E is additive. -->

**Notes:** {{NOTES}}
<!-- OPTIONAL — genuinely helpful execution context only. NEVER move essential execution information
     (a step, a value, the actual expected outcome) into Notes to keep Steps short: that is hiding
     required content, not simplifying. NEVER traceability (Requirement / Discovery / Finding /
     Evidence references) — that lives in TraceabilityMatrix.md. Omit the field entirely when there is
     nothing to add. -->

**Review:** Pending
<!-- LIFECYCLE COLUMN (added 2026-08-01, user-mandated). The HUMAN review status of this test case
     after Stage 3 (Test Design).

     THE VALUE ABOVE IS LITERAL, NOT A PLACEHOLDER (made literal 2026-08-07). Stage 3 has exactly
     one legal value to write here, so offering a substitution slot would imply a choice it does
     not have. A human reviewer edits it afterwards — in the workbook, then `--import-lifecycle`.

     Allowed values: Pending | Approved | Rejected      Default: Pending

     THIS COLUMN GATES BOTH BRANCHES (revised 2026-08-01):
       Stage 4M (Manual Execution) executes a case only when Review = Approved.
       Stage 4A (Automation)       needs Review = Approved AND Automation = Approved.
     A non-approved case is not deleted or hidden — Stage 4M records it as `Excluded`, with reason
     `Pending Review` or `Rejected at Review`, and still reports it in every total, so a run can
     never read "3 of 3 passed" while the rest of the suite went unexamined.

     RULES:
       - Stage 3 ALWAYS generates a new case with `Pending`. It never writes any other value.
       - NO SKILL MAY CHANGE THIS VALUE. Only a human reviewer, or a review process a human
         explicitly requested, may move it to Approved or Rejected. A skill that advances its own
         review status has reviewed its own work, which is the one thing this column exists to
         prevent.
       - Omitting the field is equivalent to `Pending` — the exporter defaults it silently, because
         "no decision yet" is exactly what an absent value already says. An UNRECOGNISED value is a
         different matter and is reported as a warning.
       - A MATERIAL REWRITE OF THIS CASE RESETS THIS FIELD TO `Pending` (§6.3.1, added 2026-08-01).
         Mandatory, in BOTH directions:
             Approved --rewrite--> Pending      (never inherit an approval of superseded text)
             Rejected --rewrite--> Pending      (the rewrite IS the response to the rejection)
             anything ----------> Approved      NEVER, by any skill, for any reason
         Every permitted move goes TOWARD `Pending` — it only ever removes authorization. Material
         means Objective / Preconditions / Test Data / Steps / Expected Result changed; a typo in
         Notes does not. Record the prior verdict and the rewrite in Notes, and report it. -->

**Automation:** Pending
<!-- LIFECYCLE COLUMN (added 2026-08-01, user-mandated). Whether this approved case SHOULD be
     automated. THE VALUE ABOVE IS LITERAL, NOT A PLACEHOLDER — same reason as `Review`.

     Allowed values: Pending | Approved | Rejected      Default: Pending

       Pending  — no automation decision has been made yet
       Approved — the case is authorized for automation
       Rejected — the case stays manual, deliberately

     RULES:
       - Stage 3 ALWAYS generates a new case with `Pending`.
       - Stage `4A` (Automation) considers a case ONLY when BOTH are true:
             Review = Approved   AND   Automation = Approved
         Any other combination is out of scope for automation, including `Review = Pending` with
         `Automation = Approved` — an unreviewed case is not automatable no matter how it is marked.
       - Stage `4M` (Manual Execution) NEVER reads this column. `Automation = Rejected` means the
         case must be exercised by hand — a reason to run it manually, not a reason to skip it.
       - This column SUPERSEDES the retired advisory `AutomationCandidate` tag. There is now one
         authoritative automation decision per case, not a hint and a decision that can disagree.
       - AN INCONSISTENT PAIR IS REPORTED, NEVER RECONCILED (§6.3.4, added 2026-08-07).
         `Automation = Approved` with `Review != Approved` is a contradiction between two HUMAN
         decisions. The exporter and `--import-lifecycle` both warn (`--check` exits 2); NEITHER
         value is auto-corrected, because resetting Automation destroys one reviewer's intent and
         promoting Review manufactures an approval nobody gave. The 4A gate already excludes the
         case on its own, so resolving it is a Human Decision. -->

<!-- FIELD ORDER IS THE WORKBOOK'S COLUMN ORDER. Review and Automation are LAST, deliberately: they
     record decisions made AFTER the case is written. Everything above them is unchanged — the
     2026-08-01 change is additive, and no existing field was removed, renamed, or reordered. -->

<!-- NOT ON THIS BLOCK, STILL: Requirement / Discovery / Finding / Evidence References, Risk, and
     Category. Traceability remains in TraceabilityMatrix.md keyed by Test Case ID (§6.2), and the
     lifecycle columns do not change that. Adding a Related Requirements column here would duplicate
     the Matrix into the sheet and give the suite a second, drifting source of truth. -->

