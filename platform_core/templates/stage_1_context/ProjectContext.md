<!--
TEMPLATE — Project Context (Stage 1 — shared)
Renders to: platform_core_data/modules/{{MODULE_SLUG}}/context/ProjectContext.md
Authority:  .claude/skills/project-context-skill/SKILL.md §3 (what to extract), §7 (rules), §8 (this structure)

Section order below is mandatory. Every extracted item cites the PRD section it came from (§7 rule 5).
Never introduce scope, features, or constraints absent from the PRD or run configuration (§7 rule 2).
A missing/unreadable PRD is a HALT, not a degraded run (§7 rule 1).
Missing run configuration → run degraded: mark affected sections
`Open Question — Requires Run Configuration`, never guess values.

ONE FILE PER MODULE. This template renders once for EACH module in scope, into that module's own
folder — a full-project or multi-module invocation produces several of these, never one combined
document. There is no project-wide Project Context; the union of these files IS the project context
(pipeline.md §4, Stage 1).

FEATURE SCOPE. The SAME template renders a standalone Feature's context, to
modules/{{MODULE_SLUG}}/features/{{FEATURE_SLUG}}/context/ProjectContext.md — a Feature context is a
Project Context with a narrower scope, not a different document, and a second template would drift
from this one. Fill the two optional Feature rows below when rendering at Feature scope and OMIT them
entirely at module/CRUD scope. Which scope applies is decided at intake, never inferred
(new_us_intake.md; module_architecture.md §5.5).

AT CRUD SCOPE, ONE FILE COVERS EVERY SUPPLIED CRUD AREA — Add/Create, Update, Search, Approve, Reject
for the entity — with §7 tracing each area back to its own User Story. Never one context per area.

DURABLE, EDITED IN PLACE. This file belongs to its MODULE, not to the run that first wrote it. A
later run refining this module's context re-opens THIS file and edits it; it never writes a second
copy anywhere (pipeline.md §7). `revisionCount` below is the in-place-edit equivalent of a version.
-->

# Project Context — {{MODULE}}

| Field | Value |
|---|---|
| Module | `{{MODULE_SLUG}}` |
| Feature | `{{FEATURE_SLUG}}` <!-- OPTIONAL — Feature scope only. OMIT this row at module/CRUD scope; an empty row reads as "there is a Feature and nobody named it" --> |
| Source User Story | {{SOURCE_USER_STORY}} <!-- OPTIONAL — Feature scope only. The story this Feature was created from; matches `sourceUserStory` in the registry --> |
| PRD Source | `platform_core_data/knowledge_base/PRD.md` |
| PRD sections this module derives from | {{PRD_SECTIONS}} <!-- the decomposition's own traceability (pipeline.md §8) --> |
| Run Scope Type | {{RUN_SCOPE_TYPE}} <!-- Entire Project / Epic / Feature / User Story / Bug — run_scope.md §3 --> |
| Run Type | {{RUN_TYPE}} <!-- run_scope.md §5 --> |
| Target Environment | {{APP_URL}} |
| Produced by run | `{{RUN_FOLDER}}` <!-- the invocation that produced THIS revision --> |
| Revision | {{REVISION_COUNT}} <!-- in-place edits since creation --> |
| Target ref at write | `{{TARGET_REF}}` <!-- the Target Project commit this revision describes (run_manager.md §5.8) --> |
| Generated | {{TIMESTAMP}} |
| Status | {{STATUS}} <!-- Draft / Pending Review / Approved / Rejected — AUTHORITATIVE; modules.json only caches it --> |

## 1. Scope Summary

<!-- A concise statement of what this pipeline run covers. Include the Run Scope Type and Run Type
     named above — downstream stages read their strategy from here (test-design §16, explorer §16). -->

{{SCOPE_SUMMARY}}

## 2. In Scope for This Module

<!-- The functional areas, screens, and flows THIS module covers. Explicit list — silence about an
     area is NOT sufficient; every area the PRD attributes to this module appears here or in §3. -->

| Area / Screen / Flow | Why in scope | PRD Reference |
|---|---|---|
| {{AREA}} | {{IN_SCOPE_REASON}} | {{PRD_SECTION}} |

## 3. Out of Scope for This Module

<!-- Equally mandatory (§7 rule 3). Two kinds of exclusion belong here, and they are DIFFERENT facts:

     (a) Owned by ANOTHER module — name that module's slug. This is what defines the boundary
         between two modules, and it is the only place that boundary is written down in prose.
     (b) Out of scope for the PROJECT — not tested by anyone, per the PRD or run configuration.

     Recording (a) as (b) would silently claim a behaviour is untested when another module covers it. -->

| Area / Screen / Flow | Why out of scope | Covered by | PRD Reference |
|---|---|---|---|
| {{AREA}} | {{OUT_OF_SCOPE_REASON}} | {{OWNING_MODULE_SLUG}} <!-- another module's slug, or "Not tested — out of project scope" --> | {{PRD_SECTION}} |

## 3.1 Module Boundaries

<!-- OPTIONAL — omit whole when this module has no interaction with another.

     Where this module's behaviour depends on, or is depended on by, another module. This is what a
     full-project execution exercises and a module-scoped one cannot (module_architecture.md §9.1),
     so naming the interaction here is how a reviewer knows what a single-module run leaves unverified. -->

| Related module | Interaction | Verified by |
|---|---|---|
| {{RELATED_MODULE_SLUG}} | {{INTERACTION}} | {{VERIFIED_BY}} <!-- this module / the other module / full-project execution only --> |

## 4. Roles & Credentials Required

<!-- Drawn from the PRD's User Roles section plus the run configuration's {{ROLE}} keys.
     NEVER write a credential VALUE here. Reference the role and where the value is resolved from:
     platform_core_data/knowledge_base/credentials/credentials.json (git-ignored, human-created).
     No username, password, token, or secret may ever appear in this artifact. -->

| Role | Permissions / purpose | Credential source | PRD Reference |
|---|---|---|---|
| {{ROLE}} | {{ROLE_PURPOSE}} | `knowledge_base/credentials/credentials.json` (resolved at runtime) | {{PRD_SECTION}} |

## 5. Environment Constraints

<!-- e.g. "Shared public demo — no destructive actions" vs "Isolated test environment — full CRUD
     permitted". Downstream stages gate mutating actions on this section, so state it in
     actionable terms, not as a general caution. -->

| Constraint | Implication for downstream stages | Source |
|---|---|---|
| {{CONSTRAINT}} | {{IMPLICATION}} | {{SOURCE}} <!-- PRD §N or run configuration key --> |

## 6. Carried-Forward Assumptions & Risks

<!-- Every PRD `> Assumption` and Risk entry relevant to an in-scope module, carried forward
     verbatim in MEANING (§7 rule 4) — never diluted or reworded away from its original caveat.
     Stage 2 probes these; Stage 3 designs an explicitly tagged assumption-based test per entry;
     Stage 6A resolves each as confirmed / refuted / still unverified. Keep IDs stable. -->

| ID | Type | Statement (meaning preserved) | Affected Module(s) | PRD Reference |
|---|---|---|---|---|
| {{ASSUMPTION_ID}} | Assumption | {{STATEMENT}} | {{MODULES}} | {{PRD_SECTION}} |
| {{RISK_ID}} | Risk | {{STATEMENT}} | {{MODULES}} | {{PRD_SECTION}} |

## 7. Traceability Anchor

<!-- The PRD section reference for every item in §1–§6, so any downstream claim can be traced back
     to the source document without re-reading the PRD (which only this stage may read). -->

| Context Item | Section here | PRD Reference |
|---|---|---|
| {{ITEM}} | §{{SECTION}} | {{PRD_SECTION}} |

## 8. Open Questions — Requires Run Configuration

<!-- OPTIONAL — include only in a degraded run (SKILL.md §12). List every absent run-configuration
     key and which sections above are consequently unresolved. Omit this section entirely when the
     run configuration was complete. Never substitute a guessed value for a listed gap. -->

| Missing Key | Sections Affected |
|---|---|
| {{MISSING_KEY}} | {{AFFECTED_SECTIONS}} |

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
