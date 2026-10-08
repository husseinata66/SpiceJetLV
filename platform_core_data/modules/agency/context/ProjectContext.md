# Project Context — Agency

| Field | Value |
|---|---|
| Module | `agency` |
| PRD Source | `platform_core_data/knowledge_base/PRD.md` |
| PRD sections this module derives from | **§7.2 (ORG-05 – ORG-10)** primary · §6 (XC-01 – XC-23) cross-cutting · §8 (data model) · §9.1–§9.2 (message catalogue) · §10 (file storage, environments) · §11 (E2E-04) · §13 (GAP-7, GAP-8) · §15 (OQ-1, OQ-2, OQ-7) |
| In-scope requirement | `knowledge_base/requirements/user_stories/US-4222_Admin_Update_Agency.md` (run-004) · **`knowledge_base/requirements/user_stories/Auto_Reissue_Checkbox_Branch_Agency.md` (run-006, Revision 5)** + its technical specification `knowledge_base/requirements/specifications/Auto_Reissue_Checkbox_Documentation.md` |
| Run Scope Type | **User Story** |
| Run Type | **User Story** |
| Pipeline branch | run-004: **Automation Pipeline** (1 → 2 → 3 → `4A` → `5A` → optional `5H` → `6A`) — **changed at Revision 3**; run-001 took the Manual branch. **run-006: not yet chosen — decided at the Stage 3 gate** (user, 2026-09-23) |
| Target Environment | run-004: `http://192.168.1.70` — STG, shared staging. **run-006: `http://192.168.1.60` (Admin) — shared; same mutation rules** (corrected by the user 2026-09-24: *"the task is not on 192.168.1.70"*). Wherever §4, §5 and §8.5 name `.70` for a run-006 action, read `.60` |
| Produced by run | `run-004__2026-08-17_14-35-25__UserStory__US-4222-UpdateAgency` (Revisions 3–4) · **`agency+branch-run-001__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch` (Revision 5)** |
| Revision | 5 <!-- rev 5, 2026-09-23: run-006 adds the Auto Reissue checkbox story (CRUD coverage across agency + branch). Additive only — see §0.3. --> |
| Target ref at write | `bc564a4` |
| Generated | 2026-08-17 · Revision 5: 2026-09-23 |
| Status | **Approved** — Revision 5, 2026-09-24. Revisions 1–4 keep their own approvals for everything §0.3 does not list as changed. **`PO-30` (2026-10-01): Pending Review.** |
| Approved by | **Stage 2 additions (`PO-21` … `PO-26`, run-006 target `.60`): Mohamed Soliman, 2026-09-24, at the Stage 2 review.** Revisions 1–2: Ahmed Ayman — Stage 1 Human Review gate, 2026-07-31. **Revision 3: Ahmed Ayman — Stage 1 Human Review gate, 2026-08-17**, after review of the full document and the twelve product-owner decisions at §1.2. **Revision 4: Ahmed Ayman — Stage 1 Human Review gate, 2026-08-18**, approving `PO-13`, `PO-14`, and the §5 mutation correction. **Revision 5: Mohamed Soliman (mohamed.soliman@tildetech.ae) — Stage 1 Human Review gate, 2026-09-24**, approving the Auto Reissue additions, confirming `PO-15` … `PO-20` as decisions with product-owner standing, and confirming that reissue-credential selection is an `UPDATE` of a supplier-credential selection, not a `CREDENTIAL_CHANGE` (§5, §8.5). |
| Revision 2 authored by | Ahmed Ayman (directive), 2026-07-31 — the application becomes the primary reference where US-4222 is clearly outdated; disposition taxonomy added at §1.1; Threshold fields confirmed as later enhancements |
| Revision 3 authored by | Stage 1, run-004, 2026-08-17 — see §0.1 for exactly what changed and what did not |
| Revision 4 authored by | Stage 1, run-004, 2026-08-18 — **two decisions taken during Stage 2** and written back here because §1.2 is where product-owner decisions live. See §0.2 |
| Revision 5 authored by | Stage 1, run-006, 2026-09-23 — **the Auto Reissue checkbox story added as new CRUD coverage**, with the user's intake answers recorded at §1.3. See §0.3 |
| Revision 5 amended | **2026-10-01 — `PO-30` added** (§1.3): the `Reissue` button's display rule, six conditions, all required (user, Mohamed Soliman). Consolidates `PO-28`; supersedes the first sentence of `PO-24`. §2's *Admin Itinerary `Reissue` button visibility* row and §7's matching row restated. **`PO-30` is `Pending Review`**; the rest of Revision 5 keeps its 2026-09-24 approval. |
| Revision 3 amended | 2026-08-17 — **twelve product-owner decisions applied** (§1.2) plus five document corrections. Still `Pending Review`; the decisions are recorded, the approval of the document is not yet given. |

## 0.1 What Revision 3 changed

This module was already Approved through Stage 3 from run-001. Revision 3 is **not** a rewrite. It is a
re-check of an existing context against a freshly supplied requirement, plus the things this new run
changes. Everything not listed here or in §1.2 is unchanged from Revision 2 and still carries its original
approval.

| # | Change | Why |
|---|---|---|
| 1 | **Requirement re-checked — no drift.** The AC pasted on 2026-08-17 is identical to the 2026-07-31 transcription across all 10 ACs, Dependencies, Expected Outcome, and Reflection. | The user asked for a re-check. §2's requirement rows therefore stand unaltered. |
| 2 | **Pipeline branch changed to Automation** (`4A` → `5A` → `6A`). | User decision at this gate, 2026-08-17. Rewrites §5's execution constraints; leaves §2 and §3 scope untouched. |
| 3 | **`execution_safety_policy.json` now governs.** run-004 was created after 2026-08-07, so run-001's prose mutation override no longer applies and the machine-readable policy decides. Mutation is narrowed to **self-created Agency records**, which pulls **Create Agency into scope as a means** (§2). | Approve and Reject on a pre-existing agency are `Forbidden (absolute)` and no grant can lift that. Creating the record under test is the only way US-4222's Approve/Reject criteria are executable at all. |
| 4 | **Twelve product-owner decisions applied** — recorded once at §1.2 and threaded through §2–§8. Nine of the module's open questions are closed, answered, or deferred; none is left labelled open after being decided. | Product owner, 2026-08-17. |
| 5 | **Role authorization removed as a test target.** No role-permission case, no maker-checker separation case, no self-approval authorization case is designed in this run. | Decision 1, 6, 9. Exact role authorization belongs to the future **Role CRUD** module. |

**A note on what "new run" means here.** run-004 is independent of run-001 and does not read, continue, or
modify run-001's run artifacts. It does edit *this* file, because a module's Project Context is durable and
edited in place by whichever run refines it (`pipeline.md` §7) — that is the module's file, not run-001's.
run-001's own folder is untouched.

## 0.2 What Revision 4 changed

Revision 4 is **not** a rewrite and **not** a re-scoping. It records two decisions the product owner took
on 2026-08-18, while Stage 2 was running, and corrects the one §5 row those decisions make wrong. Everything
not listed here is unchanged from Revision 3 and keeps its approval.

| # | Change | Why now |
|---|---|---|
| 1 | **`PO-13` added** — `Transfer Pnr Option`, `Blue Command Screen` and `Enable Search Limit` are out of scope by decision | Stage 2 found all three on the live form and none of them in any requirement. The product owner decided to exclude them rather than leave them undecided (§1.2, §3) |
| 2 | **`PO-14` added** — the dependency grant: the run may build, submit and approve a **Branch it created itself**, so it can seed its own Agencies under it | Stage 2 proved AC-9's PCC section only renders on an Agency whose parent Branch carries a supplier with a credential. Without this the story's AC-9 is untestable (§1.2, §5) |
| 3 | **§5's mutation row corrected — for Branch only** | The row said this run may not create or edit a Branch. `PO-14` changes that for **self-created** Branches. Supplier, Staff, Role, Payment Method and every other reference data stay excluded |
| 4 | **§3 gains a row** for the three controls `PO-13` excludes | So the exclusion is visible as a decision rather than as a silence |

**What Revision 4 deliberately did not change.** The scope of US-4222, the disposition taxonomy at §1.1,
`PO-1` … `PO-12`, the pipeline branch, the target environment, the credentials posture, and §6's assumptions
and risks are all untouched. **No requirement was added, removed or reinterpreted** — the story under test
is the same story.

**And one thing it does not do.** It does not grant anything. The run-scoped authorizations already exist,
recorded and evaluated, at
`platform_core_data/runs/run-004__2026-08-17_14-35-25__UserStory__US-4222-UpdateAgency/metadata/SafetyAuthorizations.json`
(`AUTH-BRANCH-CREATE` / `UPDATE` / `SUBMIT` / `APPROVE-SelfCreated`, approved by ahmed.ayman@tildetech.ae,
2026-08-18, verified against `platform_core/tools/execution_safety`). This document **cites** them so scope
and safety stop disagreeing; the grant itself lives where grants live.

## 0.3 What Revision 5 changed

Revision 5 is **additive**. It brings a second, independent User Story into this module — the **Auto
Reissue checkbox** (run-006) — and changes nothing that Revisions 1–4 established for US-4222. Everything
not listed here keeps its original approval.

| # | Change | Why |
|---|---|---|
| 1 | **New in-scope requirement:** `Auto_Reissue_Checkbox_Branch_Agency.md` + the technical specification `Auto_Reissue_Checkbox_Documentation.md` (the PDF, transcribed; save scenarios `S-1` … `S-10`) | Supplied by the user 2026-09-23. Routed at intake as **CRUD** coverage added to the existing `agency` and `branch` modules — **not** a Feature folder (user answer, 2026-09-23) |
| 2 | **§1.3 added** — six decisions `PO-15` … `PO-20` from the user's intake answers | §1.2's convention: decisions are stated once and cited everywhere else |
| 3 | **§2 gains the Auto Reissue rows**; §3 gains the exclusions this story creates; §3.1 gains the boundary to the `reissue` Supplier Feature | So the new scope is visible in the same tables as the old |
| 4 | **§5 gains run-006's grant** — create / update / submit / approve **self-created** Agency (and Branch) records only | Granted by the user 2026-09-23, recorded at `runs/run-006…/metadata/SafetyAuthorizations.json` and verified against the evaluator |
| 5 | **ASM-003 is refined, not reversed** (see `PO-16`); new items `ASM-019` … `ASM-022` and `RSK-011` … `RSK-014` in §6 | The PDF and the user's answers add facts about credentials that ASM-003's one-line statement did not cover |
| 6 | **§8.5 added** — run-006's own open items | Kept separate from §8.1–§8.4, which describe run-004 |

**What Revision 5 deliberately did not change.** US-4222's scope, `PO-1` … `PO-14`, the disposition
taxonomy at §1.1, run-004's pipeline branch, and every §6 entry that already existed (except the one-line
refinement note on ASM-003). **run-004's folder is not touched** — run-006 is a new, independent run.

**The two stories are separate scopes inside one module.** US-4222 (update flow) and the Auto Reissue
story (one new checkbox + credential selection) are designed, traced and reported separately. A test case
cites the story it belongs to; nothing from one is counted as coverage of the other.

## 0. How to read the requirement references in this document

Every row below cites the PRD requirement it derives from, by ID. **The ID alone is not the
explanation** — each citation in §2 also states, in plain words, what that requirement says, so this
document is reviewable without opening the PRD alongside it.

**ID shape:** `<GROUP>-<NN>`, e.g. `ORG-05`. IDs are stable and are never renumbered (PRD §0.2).

| Group | What it covers | PRD section |
|---|---|---|
| `ORG` | Organisation hierarchy — Company → Branch → **Agency** → Agent | §7.2 |
| `XC` | Cross-cutting rules that repeat across every Admin module — the approval workflow (`XC-01`–`XC-07`), search/filter/paginate/export (`XC-08`–`XC-16`), and the standard field-validation message vocabulary (`XC-17`–`XC-23`) | §6 |
| `SUP` | Suppliers and Supplier Credentials (PCCs), including the cascade down to Agency | §7.5 |
| `PAY` | Payment Method master data and the supported payment instruments | §7.6 |
| `IPN` | Import PNR | §7.9 |
| `RUL` | Rule Engine — markup, discount, service charge, and the rest | §7.7 |
| `BMO` | Booking Mid Office — search, booking, quotes, manual invoice | §7.8 |
| `RPT` | Reports | §7.13 |
| `PTL` | NDC Portal (agency-facing application) | §7.14 |
| `USM` | Agency user administration | §7.11 |
| `GEO` | Geography and currency master data | §7.3 |
| `AUTH` | Authentication, OTP, passwords | §4 |
| `E2E` | End-to-end business journeys | §11 |
| `GAP` | Requirements known to exist in the business backlog with **no** automation coverage | §13 |
| `OQ` | Open questions the business has not answered | §15 |
| `DEF` | Defects and hygiene issues found while deriving the PRD | §14 |
| `NFR` | Non-functional requirements | §12 |
| `ASM` / `RSK` | **This document's own** assumption and risk IDs (§6 below) — not PRD IDs |

**Evidence tags**, attached to each PRD requirement and carried forward here:

| Tag | Meaning | How a downstream stage must treat it |
|---|---|---|
| `[V]` Verified | An automated assertion pins the behaviour — expected message, state, or value. | Settled acceptance criterion. |
| `[O]` Observed | The action is performed and the flow depends on it, but nothing asserts the outcome. | **Unconfirmed** — probe it, never assume it. |
| `[I]` Inferred | Derived from locators, field names, or menu structure only — never exercised. | **Unconfirmed** — the field/screen exists; the rule does not necessarily. |

## 1. Scope Summary

This run validates **one User Story — US-4222, [Admin] Update Agency** — against the NDC Admin Portal on
shared staging, through the **Automation Pipeline**. Its Run Scope Type is `User Story` and its Run Type is
`User Story`, which means downstream stages take the **narrowest and most literal** reading of scope: only
US-4222's own acceptance criteria are designed and automated, with no broader wandering into adjacent
Agency behaviour the story did not ask for.

The `agency` module is broader than this run. The module owns the whole agency lifecycle — create, update,
search, self-registration requests, agent login details (PRD §7.2, ORG-05 – ORG-10). **This run covers the
update flow and its approval outcome, and nothing else in the module.** §3 records what that leaves out.

**One exception, forced by the safety policy: Create Agency is exercised, but is not tested.** Approve and
Reject on an agency this run did not create are `Forbidden (absolute)`, so the only way US-4222's Approve
and Reject criteria are executable at all is against a record this run creates itself. Create Agency is
therefore **in scope as a means** — the same standing agency search already had in Revision 2 — and its own
acceptance criteria are **not** test targets. A defect found while creating a seed record is reported as an
observation against `agency`, never as a US-4222 result.

**Three requirement sources, and the rule for reconciling them** *(revised 2026-07-31, revision 2, by
explicit user directive — see §1.1)*. This replaces the original rule, which made US-4222 authoritative
outright.

| Source | Standing |
|---|---|
| **The running application** | **Primary reference where US-4222 is clearly outdated.** The story predates later enhancements; functionality has been added and changed since it was authored |
| **US-4222** | Business-authored, and the definition of *scope* for this run — but not automatically the definition of *correct behaviour* |
| **`PRD.md`** | Reverse-engineered from an automation suite, marked *Draft for business review*, every requirement tagged `[V]` verified / `[O]` observed / `[I]` inferred. Its role is now **the tie-breaker** (§1.1) |

**Every mismatch is still recorded as a Finding, fully traceable. Nothing is removed, ignored, or
silently reconciled** — what changes is the *disposition* assigned to it, not whether it is reported.

## 1.1 Requirement Disposition — the taxonomy and the discriminator

*(Added 2026-07-31 by user directive. Governs Stage 2 Findings and every Stage 3 expected result.)*

**The distinction that matters:** an *application defect* means the implementation violates current
intended behaviour; an *outdated requirement* means the implementation has legitimately evolved beyond
the original story. Collapsing the two in either direction is harmful — calling every mismatch a defect
generates noise against a working product, and calling every mismatch "story outdated" would convert a
**removed-feature regression into a documentation correction**, which is the more dangerous error and the
reason this section is a discriminator rather than a blanket rule.

**When the application and US-4222 disagree, the PRD decides which disposition applies:**

| # | What the PRD says | Disposition | Stage 3 treatment |
|---|---|---|---|
| 1 | **Corroborates the application** — a `[V]`-tagged requirement matches observed behaviour | `Story Outdated — PRD-corroborated` | Design to **observed behaviour**. Highest confidence: two sources agree the story is the outlier |
| 2 | **Silent** — neither confirms nor contradicts | `Story Outdated / Requires Business Confirmation` | Design to **observed behaviour**, and mark the expected result as resting on this directive rather than on a requirement |
| 3 | **Corroborates the story** — a requirement describes behaviour the application lacks | **`Possible Application Defect / Possible Removed Feature`** — **never** auto-dispositioned as story-outdated | Do **not** design to observed behaviour. Escalate; two independent sources expected the behaviour |
| 4 | **Superseded by explicit product-owner confirmation** | `Story Outdated — Confirmed` | Design to observed behaviour as settled. No open question remains |
| 5 | Application behaviour violates a rule **no source has superseded** | `Application Defect (candidate)` | Design the case to the requirement and let execution report the failure |

**Rows 3 and 5 are the load-bearing ones.** They are what stops "the application is the reference" from
becoming "the application is always right". A `[V]` tag on a PRD requirement means an automated assertion
once passed against that behaviour — so its absence from the UI is a change that someone should
consciously confirm, not a stale sentence to correct.

**Confirmed by the product owner, 2026-07-31:** the **Threshold-related fields are later enhancements**
and are expected to exist despite US-4222's silence. `Outstanding Threshold` is therefore disposition
row 4 — settled, not an open question.

Where the PRD is the only source for a behaviour, its evidence tag is still carried forward, so a
downstream stage never treats an `[O]`/`[I]` statement as settled acceptance criteria.

**One structural gap governs this whole context, stated once here:** the PRD contains **no requirement
describing the Agency *update* flow**. ORG-05 describes agency *creation*; XC-04 establishes only that the
maker–checker workflow applies to updates as well as creates. US-4222 is therefore the sole requirement for
the flow under test, and every PRD reference below is either cross-cutting (§6), structural (§8), or about
the *create* form whose sections the update form is assumed to mirror (ASM-002).

## 1.2 Product-owner decisions — 2026-08-17

**Stated once here, applied throughout.** Every decision below is a **product-owner answer**, not an
observation and not this stage's inference. Where a section further down acts on one, it cites `PO-n`.
Together they close or defer nine of the module's open questions; §6 records the disposition of each.

**A decision is not evidence.** `PO-7`, `PO-8`, `PO-10`, and `PO-12` describe how the application is
*intended* to behave. Stage 2 still observes each on the live Agency screens before Stage 3 asserts it — an
answer from the product owner settles *what to expect*, not *what is there*.

| ID | Decision | What it settles |
|---|---|---|
| **PO-1** | **`odeysysadmin` is approved as both the Admin actor and the Super Admin actor** for run-004, and is authorized to Create Agency test records, Update self-created ones, Send For Approval, Approve, and Reject. **Not** authorized: booking, ticketing, payments, wallet charges, top-ups, holds, refunds, voids, or similar commercial operations — restrictions for those arrive with their own modules. | Closes the §8 credential gap. Retires ASM-004 and ASM-015 as test targets. |
| **PO-2** | **Self-created records only.** Create / Update / Send For Approval / Approve / Reject act **only** on Agency records run-004 created. Shared and pre-existing Agency records are never mutated. The created Agency identifier is captured **immediately** and preserved in the execution evidence, so ownership stays provable. | Confirms the §5 mutation posture. Makes RSK-008's mitigation mandatory rather than advisory. |
| **PO-3** | **Retention accepted.** run-004 cannot delete its records, and self-created agencies may remain on STG. Minimize accumulation by **safely reusing a self-created record where test independence and validity allow it**, and **record how many Agency records each execution created**. **No cleanup through DELETE.** | Converts RSK-009 from an open risk into an accepted cost with two binding obligations. |
| **PO-4** | **Synthetic upload fixtures at a stable committed path** inside the automation test resources, containing **no real, private, production, customer, or sensitive information**. At least: a valid PDF · a valid supported image ≤ 2 MB · a non-PDF file · an image > 2 MB. Stage 3 identifies each; Stage `4A` places or references it by a **suite-resolvable path**. | Closes the §8 fixture gap. Retires RSK-004. |
| **PO-5** | **`Save as Draft` is out of scope.** Kept on record as a requirement discrepancy / future coverage item. **No test cases for it in this run.** | Settles ASM-008 as *Deferred*, not open. |
| **PO-6** | **"Role" in the Cancel open question means role-based authorization** — only certain roles may Approve or Reject. That question is **out of scope** for run-004 (Role CRUD owns it). **For the Agency update flow itself: Cancel discards unsaved Agency changes and exits without persisting them.** | Answers ASM-011 on both halves — the wording *and* the behaviour. |
| **PO-7** | **Existing documents and the Agency logo persist on Update.** They remain present when the Update form opens. **The user is not required to re-upload them on every update.** Re-upload is required only when adding, replacing, or updating that file. | Answers ASM-012. Changes AC-3/AC-4's expected behaviour on the update path. |
| **PO-8** | **The live form layout is the intended reference.** Product Access renders as a **table** with Status · Supplier Name · Credential Name · Product Name · Description. Products (`Flight`, `Others`) are selected by **product checkboxes**; suppliers (e.g. Galileo, SpiceJet) appear as **table rows**; Credential Name may be populated per applicable supplier row. For AC-9 and any PCC ambiguity, **Stage 2 observes and documents the exact live layout and controls** — no field is inferred from ambiguous row alignment in the written AC. | Answers ASM-013 by replacing a guess with an observation task. |
| **PO-9** | **No role coverage in run-004.** No role-permission cases, no self-approval authorization case. **The lack of a second account is neither a blocker nor a risk.** Assertions are limited to Agency **workflow behaviour and resulting state**, never to the correctness of the role authorization model. | Retires ASM-004, ASM-015, and RSK-003 outright. |
| **PO-10** | **Branch cannot be changed from inside the Agency Update form.** All coverage of changing Branch, and of re-inheriting Country / Product Access / Sales Contact / Supplier Credentials after such a change, is removed. **Stage 2 verifies Branch is non-editable / read-only and does not attempt to change it.** | Retires ASM-016 and rewrites the `branch` boundary in §3.1. |
| **PO-11** | **Reflection areas are impact-awareness boundaries only** for run-004 — Rule Engine, Search & Booking, NDC Portal, Reports, Top Up, and any other downstream module affected by Agency configuration. **No reflection-area test cases are created or executed.** Relationships are preserved as documented module boundaries and future full-project coverage. Revisited once enough modules are reviewed and an application-level Project Context exists. | Answers ASM-017 and confirms §3's existing exclusions as decided rather than provisional. |
| **PO-12** | **Observed behaviour sets the expected result for validation messages.** Stage 2 triggers each relevant validation **through a valid interaction**, captures the **exact displayed string including punctuation and capitalization**, does not rely on the older story wording alone, records every story-vs-application difference, and classifies it under §1.1. **Stage 3 designs expected results from the verified Stage 2 observations — never a blind exact-match against outdated or oddly punctuated US-4222 strings.** | Supersedes ASM-018. Turns ~45 fields' worth of contractual-copy risk into a Discovery obligation. |

| **PO-13** | **`Transfer Pnr Option`, `Blue Command Screen` and `Enable Search Limit` are out of scope for run-004.** They are discussed when the User Story for their own feature arrives. The Stage 2 observations stay on record (discovery `FINDING-012`) so that story starts from evidence rather than a blank page. | Same standing as `PO-5` — a **decision, not a deferral pending an answer**. No test case is designed, generated or executed for any of the three. Recorded in §3. |
| **PO-14** | **Dependency grant.** Where a record under test depends on other records the run can build itself, **the run builds them and runs the full maker–checker cycle on them**. Concretely: the run may `CREATE` / `UPDATE` / `SUBMIT` / `APPROVE` a **Branch it created itself** — `SelfCreated` only — so it can select that Branch's supplier and supplier credential, then create its Agencies underneath it. The operator's caveat, in their own words: **reserve nothing** unless told at the time. | Makes AC-9 testable at all. Stage 2 proved the `Airline Supplier credential (PCC)` section renders only on an Agency whose parent Branch carries a supplier with a credential (`BR-006`, `BR-008`), so the Branch is a **prerequisite of the thing under test**, not background. Rewrites one §5 row. |

**What `PO-14` does not touch, stated because a grant is read for what it permits and misread for what it does not.** The caveat matches what the safety policy already holds absolute, so nothing widened:

| Still `Forbidden (absolute)` — no grant lifts it | |
|---|---|
| `booking` — BOOK · HOLD · TICKET · CANCEL_BOOKING · VOID | `financial` — PAYMENT · TOP_UP · WALLET_CHARGE · REFUND |
| `privileged` — CREDENTIAL_CHANGE · ROLE_PERMISSION_CHANGE | **`APPROVE` / `REJECT` on a `Shared` or `Unknown` record** |

`DELETE` stays ungranted in every form, and `PO-3`'s retention obligations now cover **seeded Branches as
well as seeded Agencies**: reuse a self-created fixture wherever test independence allows, and record how
many of each an execution created.

**The ownership line is the whole grant.** Every permission above is `SelfCreated`. This is not a formality:
during Stage 2 on 2026-08-18 this platform **stopped rather than edit a Branch it did not own**, because it
could have submitted a change and then been unable to approve it — stranding a shared record in *Pending for
approval*. The human made that change instead. `PO-14` exists so the suite never depends on that happening again.

**One consequence worth stating plainly.** `PO-1`, `PO-6`, and `PO-9` together remove role authorization
from this run entirely. That is a deliberate narrowing, and it has a cost: **run-004 will not answer whether
a maker can approve their own Agency change** (PRD `OQ-1`). The workflow is tested; the governance around it
is not. That is Role CRUD's job, and this document no longer pretends otherwise.

## 1.3 Auto Reissue decisions — 2026-09-23 (run-006)

*(Added Revision 5.)* The answers the user (Mohamed Soliman) gave at run-006 intake, stated once and cited
as `PO-n` like §1.2. The same six decisions appear, unchanged, in the `branch` Project Context (Revision 9)
— one decision, recorded in both modules it governs, never re-worded differently in either.

**Standing of these answers.** They came from the requester at intake, and **their product-owner standing
was confirmed at the Stage 1 gate on 2026-09-24** (Mohamed Soliman). As §1.2 says, **a decision is not
evidence**: Stage 2 still observes each on the live screens before Stage 3 asserts it.

| ID | Decision | What it settles |
|---|---|---|
| **PO-15** | **The checkbox is named `Auto Reissue`.** The story's "Reissue Feature Allowed" checkbox is this control. It is stored per organization as `TT_ORGANIZATION.AUTO_REISSUE_ENABLED`, default **unchecked**. The Itinerary button it governs is named **`Reissue`**. | Which control and which button the story means. Stage 2 captures the exact live labels (`PO-12` method); Stage 3 asserts what was captured. |
| **PO-16** | **Agency and Branch checkboxes are independent.** Turning Auto Reissue on or off on a Branch does **not** change the checkbox of any Agency under it, and the reverse. **Credentials:** an Agency **inherits its parent Branch's supplier credentials**; it may **customize** its own reissue-credential selection in Agency CRUD, but **cannot be assigned a supplier credential that does not exist on its parent Branch**. | Answers the story's **Permission Precedence** AC ("define the expected behavior when the Agency and Branch have different values"): there is no precedence — each organization's own value applies to that organization. Combined with the specification §5, **the Itinerary uses the flag of the organization that created the booking**. Refines ASM-003 (see §6). |
| **PO-17** | **Reissue-credential selection is in scope on both the UI and the backend.** The UI's credential selection that accompanies the checkbox is tested on the screen; the specification's API-only rules (`S-3` … `S-6`, marked *"Backend API validation through Postman"*) are tested against the API. | Which of `S-1` … `S-10` are UI cases and which are API cases. |
| **PO-18** | **This story's checkbox is Auto-Reissue as the specification describes it.** `AUTO_REISSUE_ENABLED`, `reissueCredentials`, the `autoReissueAllowed` supplier flag and `actionsDetails.canAutoReissue` are the technical source. | Removes the ambiguity between the story's generic "reissue feature" and the specification's "auto-reissue". |
| **PO-19** | **run-006 may create a new test Agency (and Branch) and edit, submit and approve only those.** It never edits, approves, rejects or deletes an Agency or Branch it did not create. **The platform never books anything** — every booking used by this run is made **manually by the user**, and the platform only *reads* the resulting Itinerary. | The run's mutation boundary (§5). Recorded as `AUTH-AGENCY-*-SelfCreated` / `AUTH-BRANCH-*-SelfCreated`. |
| **PO-20** | **Admin only for run-006.** Portal-side checks are designed and marked deferred; no Portal credential is provisioned. **The pipeline branch (Manual `4M` or Automation `4A`) is chosen at the Stage 3 gate.** | Where the story's **Portal Impact** AC stands in this run, and why the header's pipeline-branch field is blank. |

| **PO-21** *(added during Stage 2, 2026-09-24)* | **Where the Auto Reissue picker's options come from.** They come from the suppliers assigned in **Product Access**. **GDS suppliers — Galileo, Travelport, Amadeus, Sabre, NDCsbr** — can hold several credentials. Ticking one adds a **tab with its name** under *Airline Supplier credential (PCC)*: a multi-select, `id-Genericsuppliercredentials(PCC)`. **Every other supplier is an LCC.** An LCC's credential is chosen in its own Product Access row and **never** feeds the Auto Reissue picker. **Corrected by the user the same day:** being a GDS is necessary but not enough. A supplier supports reissue only if it is **also on a list hard-coded in the application, checked first: `NDCsbr`, `Sabre`, `TravelportNdc`, `Galileo`.** **Amadeus is a GDS but is not on that list, so it does not support reissue.** The picker therefore lists the tab-chosen credentials of assigned GDS suppliers that are on the hard-coded list (the `autoReissueAllowed` flag). | Explains the picker's contents and gives Test Design the rule to design against. **Observed 2026-09-24, unsaved forms:** AGN9780 Sabre tab "Sabre Staging" → picker `["Sabre Staging"]`. New Branch: LCC AirArabiaEgypt with row credential → picker empty. Galileo tab "GalileoLive" → picker `["GalileoLive"]`. Amadeus tab "Amadeus Live" → picker empty — **expected**; this is spec `S-9` in the UI. Credential flags: `37-supplier-credentials-autoReissueAllowed.json`. |

| **PO-22** *(Stage 2, 2026-09-24 — **SUPERSEDED by `PO-28`, 2026-09-27**)* | ~~**The checkbox controls only whether the `Reissue` button is shown.**~~ The selected *Auto Reissue Credentials* are enforced **when the reissue is attempted**. When the user clicks **Reissue** on a booking whose credential is not among the organization's selected reissue credentials, **the reissue** is refused with **"No credential for this booking is assigned to your organisation"**. **Making a booking is never affected** — any assigned credential can still be booked on. | ~~Explains the Stage 2 observation that booking `NDCEG-BR-F260916ENYOeQ` (credential 315 "Sabre Staging") shows the button while BRN265's selection is only 313. **Expected, not a defect.**~~ **Withdrawn 2026-09-27:** the product owner states the credential is part of the *display* condition, not only the click-time check. See `PO-28`. |
| **PO-23** *(Stage 2, 2026-09-24)* | **Two correct messages for "on with no credential" (`S-2`).** The UI blocks the save and shows **"Required"** under the picker. **"Select at least one eligible credential"** is the **API's** message, returned only when such a request reaches the server. | Stage 3 asserts "Required" on the screen and the specification's text on the API case. Neither is a wording defect. |
| **PO-24** *(Stage 2, 2026-09-24 — **first sentence SUPERSEDED by `PO-30`, 2026-10-01**)* | ~~**The Itinerary condition is Status `Booked`** (Booking Information and passenger rows), **not** the "Ticketed Document" label in the top status bar.~~ **An organization is Inactive while its change is Pending for approval — normal behaviour.** The edit form's own **Approve** button saves and approves in one step and avoids that state. | ~~Stage 3 designs to Status `Booked`~~ — **since 2026-10-01 the status condition is Status `Booked` **and** the "Ticketed Document" bar (`PO-30`)**. Stage 3 may use the edit form's **Approve** where a case does not test the maker–checker path itself. The Inactive-while-pending and edit-form **Approve** statements still stand. |
| **PO-25** *(Stage 2, 2026-09-24 — supersedes `PO-20`'s "Admin only")* | **The Portal is in scope.** The user supplied a Portal login for AGN9780 (stored only in the git-ignored `credentials.json`, key `PORTAL_60`, `http://192.168.1.60:9500`). **Observed 13:11–13:13 in one session order:** AGN9780 OFF → Portal `canAutoReissue: false`, no `Reissue` button · ON → `true`, **`Reissue` shown** · OFF → `false`, hidden. **Portal differences from Admin:** the button shows **without a lock** (`lockedStatus 0`), and **Manual Reissue is not offered on the Portal** (`canManualReissue: false`). **No lock on the Portal is intended** (user, 2026-09-24: *"there is no need of lock on the portal"*). The lock is an Admin-only precondition. Path: `/myBooking` → Search → the **Order Id** link opens `/myBooking/booking-details/{orderId}`. | The story's **Portal Impact** AC is now covered by observation, not deferred. The pipeline branch is still chosen at Stage 3. |
| **PO-26** *(Stage 2, 2026-09-24 — user statement, not yet observed)* | **Booking visibility follows the hierarchy.** An **Agency's Portal login cannot see its parent Branch's bookings**. **A Branch can see its Agencies' bookings** and **can book on behalf of an Agency**. | Portal Reissue cases use **Agency-created** bookings only. A Branch-created booking is never expected on an Agency's Portal. **Answered by the user the same day:** a booking made by Admin/Branch **on behalf of an Agency belongs to that Agency**, so **the Agency's Auto Reissue checkbox** controls the `Reissue` button, on both Admin and the Portal. The Branch's checkbox does not. (Spec §5's *"the organization that created the booking"* means the organization the booking belongs to.) |
| **PO-27** *(Stage 3, 2026-09-25 — user statement; **approved by Mohamed Soliman 2026-09-25**)* | **The Branch is the supplier ceiling for its Agencies.** The Branch is the parent of the Agency, so the Agency inherits the Branch's suppliers, and **the suppliers assigned to an Agency can only be ones its Branch has**. The reverse doesn't hold: **a Branch can have suppliers that are not assigned to its Agency**, because Branch and Agency each have their own CRUD. | Extends `PO-16` from credentials to suppliers. Stage 3 tests both directions (TC-AGENCY-091, TC-BR-109). |
| **PO-28** *(Stage 3 amendment, 2026-09-27 — product owner; **supersedes `PO-22`**; **consolidated into `PO-30` as its condition (2), 2026-10-01**)* | **The `Reissue` button's display has two conditions, both required.** (1) The **Auto Reissue checkbox** is on for the organization the booking belongs to (Admin/Agency or Branch, per `PO-16` / `PO-26`), **and** (2) the organization's **selected Auto Reissue credential** matches **the credential the PNR was booked on**. If either fails, the button is **not displayed**. The click-time refusal *"No credential for this booking is assigned to your organisation"* therefore is **not** the only credential gate — the credential is checked before the button is rendered. | Corrects `PO-22`, which held the button independent of the selection. Confirmed by run-007 Discovery `DS-2`: `reissue-flow/discovery/evidence/cl1-check.json` — Branch booking on `ticketPccId 315` with BRN265's selection swapped to 313 only returns `actionsDetails.canAutoReissue: false` and no button. Stage 3 inverts TC-AGENCY-082 / TC-BR-103 and makes "the selection contains the booking's credential" an explicit precondition of every *button-shown* case. |
| **PO-29** *(Stage 4M, 2026-09-27 — user decision)* | **`Manual Reissue` is out of scope for this story.** The Auto Reissue checkbox story covers the `Reissue` button only. No test case asserts whether `Manual Reissue` is shown, hidden, or offered under any condition, and behaviour observed about it is recorded as an observation, never as a pass/fail criterion. | Removes the *"Manual Reissue is still shown"* clause from TC-AGENCY-077 and TC-AGENCY-081 (and TC-BR-102), and closes run-008's DEF-R008-01 / DEF-R008-02 as **out of scope** rather than as defects. The behaviour they recorded — the Itinerary not offering `Manual Reissue` to the lock holder while the API reports `canManualReissue: true` — is kept in the run-008 results as an observation for whoever owns that control. |
| **PO-30** *(2026-10-01 — user; consolidates `PO-28`, supersedes `PO-24`'s status sentence; **Pending Review**)* | **The Itinerary `Reissue` button is displayed only when all six conditions hold.** (1) The **Auto Reissue checkbox** is on for the organization that owns the booking (Agency or Branch, per `PO-16` / `PO-26`); (2) the **credential the PNR was booked on** is among that organization's selected **Auto Reissue credentials** in the credential picker (`PO-28`, restated); (3) the booking **Status is `Booked` and the Itinerary status bar reads "Ticketed Document"** — both required; (4) the booking was made **online** (not offline / imported); (5) **on Admin**, the booking is **locked by the current user** — the Portal has no lock, so (5) does not apply there (`PO-25`); (6) the supplier is a **reissue-capable GDS** — `NDCsbr`, `Sabre`, `TravelportNdc`, `Galileo` (`PO-21`); not Amadeus, not an LCC. **If any one fails, the button is not displayed** — there is no click-time refusal message to test. | Replaces `PO-28`'s two conditions with the full rule, and supersedes `PO-24`'s first sentence: the "Ticketed Document" bar **is** part of the condition, alongside Status `Booked` (FINDING-015 stays a closed historical record). `PO-24`'s Inactive-while-pending and edit-form **Approve** statements still stand. The same rule is recorded as **D-14** in the `reissue-flow` Project Context (Rev 8). Stage 3 states all six as preconditions of every *button-shown* case, and each *button-hidden* case leaves exactly one condition unmet. Condition (4), (5) on Admin, and (6) gain their own cases (TC-AGENCY-095, 096, 097). **Condition (5) is Admin-only — confirmed by the user, 2026-10-01:** the lock exists only on Admin; the Portal has no lock (`PO-25` stands). TC-AGENCY-079 / 081 expect the button on the Portal without a lock. |

**What these decisions do not settle** — carried to §8.5 rather than guessed:

- Which suppliers on STG have `autoReissueAllowed = true`. `S-9` and `S-10` both depend on it.
- What the UI does when the checkbox is on and a credential selection is invalid. The specification states API messages only.
- Whether the Admin Itinerary is reachable for a booking the user makes under the run's test Agency. The user supplies the booking references.

## 2. In Scope for This Module

| Area / Screen / Flow | Why in scope | PRD Reference — ID **and what it says** |
|---|---|---|
| **Agency Master section** — Branch, Agency Name, Country (read-only, inherited), State, City, IATA flag, Post Office Box, Company URL, Phone, Address 1/2 | US-4222 AC-1 — 11 fields with per-field validation, message, type, and mandatory/optional status | **ORG-05** `[V]` — *"An Agency is created under a Branch; the form spans Agency Master (branch, name, country inherited from branch, state, city, IATA flag, PO box, company URL, phone, address 1/2), …"* · **XC-17–XC-20** `[V]` — the platform-wide validation message vocabulary: `"Required"` for a missing mandatory field, and the standard email / phone / numeric-only messages |
| **Agency Owner Details section** — Contact Person, Email ID, Phone No. | US-4222 AC-2 | **ORG-05** `[V]` — lists *Agency Owner Details* as a section of the form · **XC-18** `[V]` — email errors read `"Please enter a valid email"` · **XC-19** `[V]` — phone errors read `"Please enter valid phone number"` |
| **Upload Document Details** — documents 1–3 (PDF), per-document Contract Start / End Date, Browse, Upload, multiple documents, displayed names, remove/update | US-4222 AC-3 — including the six behavioural rules. **`PO-7` changes the update-path expectation:** documents already stored on the agency **remain present** when the form opens, and re-upload is **not** required on every update — only when adding, replacing, or updating a file. AC-3's "Mandatory" describes the create-time rule, not a per-update obligation. | **ORG-05** `[V]` — *"Document uploads with per-document Contract Start/End dates"* · **§10** (file storage) — records that document upload is required in at least six flows, and that **the PDF constraint comes from the business story, not from automation** · **`PO-7`** |
| **Agency Logo** — image type, ≤ 2 MB, preview before submission | US-4222 AC-4. **`PO-7` applies identically:** an existing logo persists on the Update form and is not re-uploaded unless it is being replaced. | **ORG-05** `[V]` — lists *Agency Logo* as a section · **§10** (file storage) — *"image ≤ 2 MB"* is likewise **story-sourced, unverified by automation** · **`PO-7`** |
| **Wonder Travel Sales Contact** — Name, Designation, Email, Phone; defaults inherited from Branch Contact Person; changeable; multiple sales personnel | US-4222 AC-5 | **ORG-05** `[V]` — lists *Sales Contact* as a section · **ORG-03** `[V]` — defines the Branch and its *owner Name / Email / Phone*, i.e. the fields these defaults are inherited **from** |
| **Bank Account Details** — Account Number, Account Type, Bank Name; multiple accounts | US-4222 AC-6 | **ORG-05** `[V]` — lists *Bank Accounts* as a section of the form |
| **Payment Settings** — Invoice Generation, Credit Limit, Top Up limit, Target, Set Month, Set Year, Credit Terms (Days), Reaching Percentage, Warning Prompt (Days), Credit Agency, Payment Options | US-4222 AC-7 — 11 fields | **ORG-06** `[V]` — *"Agency Payment Settings capture Invoice Generation frequency, Credit Limit, Top-Up Limit, and Credit Terms (days)"* — note it covers **only those four**; the other seven fields have no PRD requirement at all · **PAY-03** `[V]` — the supported instruments are Cash, Wallet, Credit Card, Bank Transfer, plus the Banque Misr and Fawry gateways |
| **Product Access Details** — **a table** with columns Status · Supplier Name · Credential Name · Product Name · Description. Products (`Flight`, `Others`) are chosen by **product checkboxes**; suppliers (e.g. Galileo, SpiceJet) appear as **rows**; Credential Name may be populated per applicable supplier row. Inherited from Branch. | US-4222 AC-8. **`PO-8`: the live layout is the intended reference**, and it is a table — not the flat field list the AC's table implies. | **ORG-05** `[V]` — lists *Product Access* as a section · **SUP-05** `[V]` — *"Credentials cascade: a credential configured at supplier level must be visible/assignable at Branch and at Agency level"* — this is the mechanism that populates the section · **`PO-8`** |
| **Airline Supplier Credential (PCC)** — Amadeus / Galileo / Sabre filters, Search Supplier Credential PCC, Ticketing Supplier Credentials PCC, Generic Supplier PCC, Manager Name, Supplier Credential Description; defaults inherited from Supplier & Branch | US-4222 AC-9. **`PO-8`: Stage 2 must observe and document the exact live layout and available controls before Stage 3 designs anything here.** No field is inferred from the ambiguous row alignment in the written AC — that inference is explicitly prohibited. | **ORG-07** `[V]` — *"An agency is assigned one or more supplier PCCs (e.g. `Galileo Live UAE`), inherited from Supplier & Branch"* · **SUP-05** `[V]` — the same cascade as above · **`PO-8`** |
| **Import PNR toggle** — controls whether the option appears on the agency portal | US-4222 AC-10 | **ORG-05** `[V]` — the toggle is part of the agency form · **IPN-05** `[V]` — *"Import PNR must be explicitly enabled for the organisation"*; a Branch/Agency with it closed is refused with the exact message `"Selected Organization does not support import pnr functionality"` — i.e. **this toggle has an observable downstream consequence** |
| **Submit for Approval** — saves the update and submits it for review, record enters *Pending for approval* | US-4222 Expected Outcome | **XC-01** `[V]` — *"Creating or updating a governed record does not publish it; the maker clicks Send for Approval and the record enters state 'Pending for approval'"* · **XC-04** `[V]` — *"The workflow applies to updates as well as creates"* — **the one PRD requirement that confirms an update path exists at all** · **§9.2** — the literal status string is `Pending for approval` |
| **Cancel** — **discards unsaved Agency changes and exits without persisting them** | US-4222 Expected Outcome, as **settled by `PO-6`**. The story's stray *"role update process"* wording is a reference to role-based authorization, not to this behaviour, and does not qualify it. | **GEO-09** `[V]` — an update *"can be cancelled without persisting"* (Rate of Exchange) · **SUP-10** `[V]` — *"Cancelling a Flight Search Limitation edit must not persist the change"*. Neither is about Agency: together they establish cancel-must-not-persist as a **platform-wide pattern** · **`PO-6`** |
| **Approve** — the record is finalized and the change applied | US-4222 Expected Outcome. **Performed as `odeysysadmin` (`PO-1`).** **Scope limit (`PO-9`): the assertion is on the Agency workflow behaviour and the resulting record state — never on *which role is permitted* to approve.** | **XC-02** `[V]` — *"A checker Approves (thumbs-up) or Rejects (thumbs-down) the pending record"* · **XC-03** `[V]` — *"Approval and rejection both accept a free-text Remarks entry, captured as the audit reason"* · **`PO-1`, `PO-9`** |
| **Reject** — the record is declined with a reason | US-4222 Expected Outcome. **Performed as `odeysysadmin` (`PO-1`); same scope limit as Approve (`PO-9`).** | **XC-02**, **XC-03** `[V]` — as above; the story's *"provide a reason for rejection"* maps onto XC-03's Remarks field · **`PO-1`, `PO-9`** |
| **Locating the agency to update** (agency search / grid navigation) | In scope **as a means only** — reaching the record under test. Its own search semantics are not a test target of this run. | **ORG-08** `[V]` — *"Agencies are searchable, including an Active-only search"* |
| **Creating the agency under test** (Create Agency flow) | *(Added Revision 3.)* In scope **as a means only** — seeding a run-owned, run-tagged record so the Approve and Reject criteria are executable at all. **Its own acceptance criteria are not test targets**; a defect seen here is an observation, not a US-4222 result. | **ORG-05** `[V]` — the create form and its sections. Scope basis is the run-004 mutation grant, not the story. |
| **Field-level validation and messages for every field above** | US-4222 states an exact message per field. **`PO-12` changes where the expected result comes from:** Stage 2 triggers each validation through a valid interaction and captures the exact displayed string, punctuation and capitalization included; **Stage 3 designs expected results from those verified observations**, not from a blind exact-match against the story. Every story-vs-application difference is recorded and classified under §1.1. | **§9.1** — the catalogue of literal, product-owned validation strings · **GAP-7** — *"The Create-Agency story specifies ~45 fields with exact validation and message per field… only the happy path is automated; no negative field-level coverage"* — i.e. **this run is the first verification of those messages** · **`PO-12`** |
| **Branch field is read-only on the Update form** | *(Added by `PO-10`.)* Branch **cannot be changed** from inside Agency Update. Stage 2 **verifies it is non-editable and does not attempt to change it.** This is a *confirmation* case, not an inheritance-behaviour case. | **ORG-05** `[V]` — Branch is part of the agency form · **`PO-10`** |

**Added at Revision 5 — the Auto Reissue checkbox story (run-006).** The PRD predates this requirement and
has **no** reissue requirement at all. Every row below therefore rests on the story, the technical
specification, and `PO-15` … `PO-20`. The PRD column cites only the cross-cutting rules the rows use.

| Area / Screen / Flow | Why in scope | Source — ID **and what it says** |
|---|---|---|
| **Auto Reissue checkbox on Create Agency and Update Agency** — present, default **unchecked**, can be switched on and off | Story AC *Agency CRUD* 1–2. `PO-15` names the control | Story AC *Agency CRUD*; spec §1 — *"stored per organization … `AUTO_REISSUE_ENABLED`. Its default is unchecked (`0`)"*; `PO-15` |
| **Saved value is retrieved when the Agency is edited** — the Update form shows what was saved, and the Agency GET returns `autoReissueEnabled` and `reissueCredentials` | Story AC *Agency CRUD* 3 | Story AC *Agency CRUD*; spec §4 — `GET /Admin2/agency/{agencyId}` returns both, plus the supplier-credential list with its `autoReissueAllowed` flag |
| **Reissue-credential selection (UI)** — when Auto Reissue is on, the user picks one or more supplier credentials; only credentials **mapped to this Agency** and whose supplier supports auto-reissue are eligible | `PO-17` puts the UI in scope. `PO-16` sets the eligible set | Spec §3 `S-1`, `S-2`, `S-7`, `S-8`, `S-9`, `S-10`; `PO-16`, `PO-17` |
| **Agency credential set is bounded by the parent Branch** — the Agency inherits the Branch's supplier credentials, may customize its reissue selection, and **cannot** be given a credential its Branch does not have | `PO-16` — the user's answer to the story's precedence AC. **Not in the specification.** It is the one rule here that only the user's answer supports | `PO-16`; spec `S-8` (*"Each auto-reissue credential must be mapped to this organization"*) is the nearest backend rule; ORG-07 `[V]`, SUP-05 `[V]` (the inheritance mechanism) |
| **Backend save rules through the API** — `S-3` (Off + credentials on update → the list is replaced by existing valid selections), `S-4` (missing `credentialId`), `S-5` (unknown or inactive credential), `S-6` (duplicate IDs) | `PO-17` — backend in scope; the specification marks these four *"Backend API validation through Postman"* | Spec §2 (`POST/PUT /Admin2/agency/...`), §3 `S-3` … `S-6` |
| **Turning Auto Reissue off keeps the saved credentials** — turning it back on returns them | Spec `S-7`. A persistence rule the story's "saved and retrieved correctly" does not state | Spec §3 `S-7` |
| **Read-time clean-up of invalid credentials** — on every read, a selected credential that has become inactive, unmapped or unsupported is removed; **the checkbox itself stays on** even if none remain | Spec §4. A direct consequence of "retrieved correctly" | Spec §4. See RSK-012 — reaching this state needs a change the run may not be allowed to make |
| **Agency and Branch are independent** — changing the parent Branch's checkbox does not change this Agency's checkbox | `PO-16`; spec §3 closing line | Spec §3 — *"Agency and branch selections are independent; enabling on branch does not enable for all agencies under this branch"*; `PO-16` |
| **Admin Itinerary `Reissue` button visibility** for a booking made under this Agency — *(rule restated 2026-10-01, `PO-30`)* shown only when **all six** hold: (1) the owning organization's Auto Reissue checkbox is on; (2) the PNR's booking credential is among its selected Auto Reissue credentials; (3) Status `Booked` **and** the status bar reads "Ticketed Document"; (4) the booking was made online, not offline / imported; (5) on Admin, the booking is locked by the current user (no lock on the Portal); (6) the supplier is a reissue-capable GDS (`NDCsbr`, `Sabre`, `TravelportNdc`, `Galileo`). **Not displayed** if any one fails | Story AC *Admin Impact* and *Regression & Validation* 3. **Booking is made manually by the user** (`PO-19`); the platform only reads the Itinerary. ~~**Admin only** (`PO-20`)~~ — the Portal is in scope since `PO-25` | Spec §5 — `actionsDetails.canAutoReissue`; `PO-30` (consolidates `PO-28`, amends `PO-24`); `PO-19`, `PO-21`, `PO-25` |
| **Admin can view and manage the permission** — the checkbox and credential selection are visible and editable on the Agency form | Story AC *Admin Impact* 2 | Story AC *Admin Impact* |
| **Regression — existing Agency CRUD is unaffected** — Create and Update still save and submit as before when the checkbox is untouched (default off) | Story AC *Regression & Validation* 1 and *Admin Impact* 3. **Narrowest reading:** a smoke check that the existing create and update paths still work. Not a re-run of US-4222's field matrix | Story AC *Regression & Validation*; XC-01, XC-04 `[V]` (maker–checker still applies) |
| **Maker–checker on the new field** — an Auto Reissue change goes through Send For Approval → *Pending for approval* → Approve before it takes effect | The field lives on a governed record, so XC-01/XC-04 apply to it like any other field. **Performed only on self-created Agencies** (`PO-19`) | XC-01, XC-04 `[V]`; §9.2 (`Pending for approval`) |

## 3. Out of Scope for This Module

| Area / Screen / Flow | Why out of scope | Covered by | PRD Reference |
|---|---|---|---|
| **Create Agency as a *tested* flow** — its field validation, its messages, its own acceptance criteria | US-4222 is an *update* story. Creation is the same module's concern but a different flow and a different story (User Story 3 in `PRD_UserStories.md`). **Revision 3 narrows this exclusion rather than removing it:** the create form is now *exercised* to seed a record (§2), but nothing about it is *asserted*. Exercised ≠ tested. | `agency` — **different run scope** | ORG-05 |
| **Agency search as a feature** — filters, Active-only search, pagination, empty state | Not named by US-4222. Used only to reach the record under test (§2). | `agency` — different run scope | ORG-08, XC-08 – XC-16 |
| **Agency self-registration requests** (New / In-progress queue) | Not named by US-4222. | `agency` — different run scope | ORG-09 |
| **Agent Login Details search** | Not named by US-4222. | `agency` — different run scope | ORG-10 |
| **`Transfer Pnr Option` · `Blue Command Screen` · `Enable Search Limit`** | **Decided out of scope by `PO-13`**, 2026-08-18. All three exist on the live Agency form and appear in no acceptance criterion and no PRD requirement. `Blue Command Screen` additionally renders disabled with the inline hint *"This option requires the Galileo supplier to be enabled"*. They are discussed when the User Story for their own feature arrives; the Stage 2 evidence is kept so that story starts from an observation. | Nobody in this run — **recorded exclusion, deferred to a future story** | none; observed in discovery `FINDING-012`; `PO-13` |
| **Save as Draft** | **Decided out of scope by `PO-5`**, not merely undecided. US-4222's Expected Outcome names only Submit for Approval / Cancel / Approve / Reject; PRD GAP-8 says the backlog specifies draft-save. The discrepancy **stays on record** as a future coverage item (ASM-008, now *Deferred*). **No test cases in this run.** | Nobody in this run — **recorded discrepancy, deferred** | GAP-8; `PO-5` |
| **Role authorization and role-permission coverage** — which roles may Approve or Reject, whether maker and checker must be different identities, self-approval authorization | **Removed as a test target by `PO-1`, `PO-6`, and `PO-9`.** run-004 asserts Agency **workflow behaviour and resulting state** only, never the correctness of the role authorization model. `odeysysadmin` is the approved actor for every required action; the single account is **neither a blocker nor a risk**. | **Role CRUD module** (future) | XC-06, OQ-1, OQ-2; `PO-1`, `PO-6`, `PO-9` |
| **Branch CRUD** (a named dependency of the story) | The story lists Branch CRUD as a *dependency* — the Agency form consumes branch data. Testing Branch itself is another module's job. | `branch` | ORG-03, ORG-04 |
| **Supplier / Supplier Credential CRUD** (a named dependency) | Same: consumed here as pre-existing data. | `master-supplier` | SUP-01 – SUP-07 |
| **Payment Method master data** (a named dependency) | The Payment Options checkboxes consume it; configuring it is elsewhere. | `payment-gateway` | PAY-01, PAY-02 |
| **Reflection — all five areas, and any other downstream module affected by Agency configuration** | **Settled by `PO-11`: impact-awareness boundaries only.** No reflection-area test case is created or executed in run-004. This is a **decision, not a deferral pending an answer** — the earlier "impact-awareness or in scope?" question (ASM-017) is closed. The relationships are preserved as documented module boundaries (§3.1) and as future full-project coverage, to be revisited once enough modules are reviewed and an application-level Project Context exists. | Each area's own module; **full-project execution only** | US-4222 Reflection; `PO-11` |
| ↳ **Rule Engine** | Verifying an agency-scoped rule's price effect requires flight search and fare reading. | `rule-engine` | RUL-03, RUL-13 |
| ↳ **Search & Booking** | Additionally blocked: no booking or payment action is authorized (§5, `Forbidden (absolute)`). | `search-and-booking` | BMO-01, BMO-14 |
| ↳ **NDC Portal screens** | Portal is a separate application (`http://192.168.1.92:9500`) with no credentials configured for this run. | `portal-self-service` | §1 (two applications), AUTH-24, PTL-01 |
| ↳ **Reports** | Agency Wallet / AR Ledger / Total Due would show the effect of a credit-limit change. | `reports` | RPT-01, RPT-04, RPT-10 |
| ↳ **Top Up submodule** | Additionally blocked: no wallet charge or top-up is authorized (§5, `Forbidden (absolute)`). | `company` (Admin Top-Up Request) and `portal-self-service` (Portal top-up) | ORG-13, PTL-01 – PTL-07 |
| **Agency Owner activation → Portal login** (E2E-04's second half) | Not named by US-4222; owned by the module that manages agency users. | `agency-user-administration` | USM-09, AUTH-30, E2E-04 |
| **Non-functional requirements** — performance, accessibility, concurrency, multi-browser, localisation/RTL | The PRD states these are not derivable and largely absent; nothing in US-4222 states one. | **Not tested — out of project scope for this run** | §12 (NFR-01 – NFR-06 and the "Missing" row), OQ-4, OQ-5 |
| **The Reissue flow itself** — Eligibility, Re-shop, results, Review & Pay, Exchange, confirmation, PNR Query *(Revision 5)* | This story only adds the **switch** that allows reissue. What happens after the `Reissue` button is pressed is the separate Reissue story | Supplier Feature **`reissue`**, shared scope **`reissue-flow`** | `Reissue_Flow_From_Itinerary.md` |
| **Making any booking** *(Revision 5)* | `PO-19`: **the platform never books.** Bookings used to observe the Itinerary button are made manually by the user. `BOOK` stays `Forbidden (absolute)` | The user, manually — outside the platform | `PO-19`; `execution_safety_policy.json` |
| **Portal-side impact of Auto Reissue** — the Portal Itinerary's `Reissue` button *(Revision 5)* | `PO-20`: **Admin only** in run-006. No Portal credential is provisioned. Cases are designed and marked `Deferred / Requires Portal Access` | `portal-self-service` — deferred | Story AC *Portal Impact*; spec §5 (*"Both Admin and Portal itinerary responses expose …"*); `PO-20` |
| **Changing a Supplier's own auto-reissue support**, or a supplier credential's active status *(Revision 5)* | Needed to produce `S-5` (inactive credential), `S-9` (unsupported supplier) and read-time clean-up **by changing the supplier**. Supplier and credential records are shared reference data, and changing them is not granted | Nobody in this run. Test these states only where STG **already** has such a credential; otherwise `Deferred / Requires Authorization` (RSK-012) | spec §3, §4 |
| **Exchange Fees Rule Engine** *(Revision 5)* | Named in the Reissue flow story, not in the checkbox story | `rule-engine` (Proposed) via the `reissue-flow` scope | `Reissue_Flow_From_Itinerary.md` |

### 3.1 Module Boundaries

| Related module | Interaction | Verified by |
|---|---|---|
| `branch` | **Inheritance from the agency's Branch.** Country is read-only and inherited (AC-1); Sales Contact defaults inherit from the Branch Contact Person (AC-5); Product Access is populated from Branch (AC-8); Airline Supplier Credential defaults inherit from Supplier & Branch (AC-9). **`PO-10`: Branch cannot be changed from inside the Agency Update form.** All re-inheritance-after-Branch-change coverage is removed; Stage 2 verifies Branch is read-only and **does not attempt to change it**. The inherited *values* are still observed on the form. | **this module** — for the inherited values as displayed, and for Branch being non-editable. Whether Branch's own data is correct is `branch`'s concern. |
| `master-supplier` | **Credential cascade.** A supplier credential configured at supplier level must be assignable at Agency level (SUP-05, `[V]`, verified by `setReflectionOnAgency`). The PCC section consumes it. | **this module** for "the credential appears and can be selected"; `master-supplier` for the cascade's own correctness; **full-project execution only** for the end-to-end cascade Supplier → Branch → Agency (E2E-03). |
| `payment-gateway` | Payment Options checkboxes (AC-7) are drawn from Payment Method master data (PAY-01). **The authoritative option set is Master → Payment Gateway → Payment Method's Active entries** (ASM-014, answered) — it is not a fixed list, so a test reads the master rather than hardcoding a count. | **this module** for selectability; `payment-gateway` for the master data. |
| `import-pnr` | The Import PNR toggle (AC-10) is the switch IPN-05 reads: a disabled organisation is refused with *"Selected Organization does not support import pnr functionality"*. | **this module** for the toggle's persistence; **`import-pnr`** for the refusal behaviour it causes; **full-project execution only** for toggle → refused import. |
| `rule-engine` | Rules are scoped Country POS → Branch → **Agency** (RUL-03). An agency's identity is a rule dimension. | **`rule-engine`**, and only a full-project execution shows an agency change altering a rule's reach. |
| `reports` | Credit Limit / Top-Up Limit / Credit Terms set here surface in Agency Wallet, AR Ledger, and Total Due to NDC (RPT-01, RPT-04, RPT-10). | **`reports`** — not verified by this run. |
| `agency-user-administration` | Agency Owner Details captured here (AC-2) are the user record that module administers; owner activation gates Portal login (AUTH-30, USM-09). | **`agency-user-administration`** — not verified by this run. |
| `company` | Credit limits set here bound the Top-Up Requests that module processes (ORG-13). | **`company`** — not verified by this run. |
| `authentication` | An `odeysysadmin` session is a precondition for reaching the form. | **`authentication`** — assumed working, not a test target. Stage 2 confirms login succeeds before anything else, as an environment check rather than a test case. |
| **Role CRUD** *(future module, not yet proposed)* | Owns the question `PO-9` removed from this run: which roles may Approve or Reject, and whether maker and checker must be different identities (XC-06, PRD `OQ-1`, `OQ-2`). | **Role CRUD** — **explicitly not verified by run-004.** The boundary is recorded so the gap stays visible rather than looking like coverage. |
| `branch` — **Auto Reissue** *(Revision 5)* | Two different relationships, kept apart. **Checkbox: independent** — a Branch's Auto Reissue value never changes its Agencies' values (`PO-16`, spec §3). **Credentials: inherited and bounded** — the Agency's eligible reissue credentials are those of its parent Branch; it may narrow or customize the selection, never extend beyond it (`PO-16`) | **this module** for the Agency side of both. `branch` for the Branch's own checkbox. A case that changes the Branch and then checks the Agency needs a **self-created** Branch (`PO-19`) |
| **Supplier Feature `reissue`** (`supplier-features/reissue/`, shared scope `reissue-flow`) *(Revision 5)* | This checkbox is the Reissue flow's **prerequisite**: the flow story says it must *"be controlled through the Reissue checkbox configured on Branch and Agency CRUD"*. The `Reissue` button this module's setting controls is where that flow starts | **this module** for the setting and the button's visibility. **`reissue-flow`** for everything after the button is pressed. A separate registry (`supplier-features/modules.json`) — never merged with this module |
| `master-supplier` — **auto-reissue support** *(Revision 5)* | Whether a supplier allows auto-reissue (`autoReissueAllowed`) decides which credentials are eligible (`S-9`) and whether the button shows (spec §5 condition 3; `PO-30` condition 6) | **this module** reads the flag; **`master-supplier`** owns it. Not changed by this run |

## 4. Roles & Credentials Required

> **Corrected at Revision 3.** An earlier draft of this section said the credentials file was *absent*
> while §8 said it existed. **The file exists** — `platform_core_data/knowledge_base/credentials/credentials.json`,
> created 2026-08-03, git-ignored. What is **not** yet established is that the credentials in it still work
> on this environment: they have **not been re-verified in run-004**. **Stage 2 verifies login before
> anything else** and reports a blocker if it fails. Existing ≠ verified, and this document no longer
> conflates the two.

**One account, both actors (`PO-1`).** `odeysysadmin` is the approved actor for every Admin-side Agency
operation this run needs. There is no second identity, and **none is needed** — `PO-9` states plainly that
the single account is neither a blocker nor a risk, because role authorization is not being tested.

| Role / actor | Authorized for, in this run | Credential source | PRD Reference |
|---|---|---|---|
| **`odeysysadmin`** — standing in as **both Admin and Super Admin** (`PO-1`) | **Create** Agency test records · **Update** self-created Agency records · **Send For Approval** · **Approve** · **Reject**. Also: navigate Admin → Agency, open a record, edit every section, and Cancel. | `knowledge_base/credentials/credentials.json` — **exists (2026-08-03), git-ignored, resolved at runtime, not yet re-verified in run-004** | §2 (Actors), AUTH-01, XC-02 |
| **`odeysysadmin` — explicitly NOT authorized for** | Booking, ticketing, payments, wallet charges, top-ups, holds, refunds, voids, or similar commercial operations. Restrictions for those arrive with their own modules. | — | `PO-1`; `execution_safety_policy.json` (all `Forbidden (absolute)`) |
| Agency Owner / Agent (Portal) | **Not required.** Portal-side reflection is out of scope (`PO-11`, §3). | — | AUTH-24, PTL-01 |
| **`odeysysadmin` — run-006** *(Revision 5)* | Create a test Agency · set Auto Reissue on/off and choose reissue credentials on it · Send For Approval · Approve · read it back · open the Admin Itinerary of bookings the user made under it (read only). **Only on records run-006 created** (`PO-19`). | `knowledge_base/credentials/credentials.json` — **not re-verified in run-006**; Stage 2 verifies login first | `PO-19`; `AUTH-AGENCY-*-SelfCreated` |
| **The user (manual booker)** — run-006 *(Revision 5)* | Makes every booking this run observes, **by hand, outside the platform** (`PO-19`), under the run's test Agency, and supplies the booking references. | Not a platform credential. The platform never logs in as the booker and never books | `PO-19` |
| Agency Owner / Agent (Portal) — run-006 | **Not required.** Admin only (`PO-20`). | — | `PO-20` |

**What this section deliberately no longer claims.** Revision 2 said a Super Admin was *required as a
separate checker* because "a maker may not approve their own change". That was an `[I]`-tagged inference,
never asserted, and `PO-9` removes it as a test target. **run-004 does not test who is allowed to approve.**
It uses an approved account to drive the workflow and asserts the workflow's behaviour and resulting state.

**No credential value appears in this artifact, and none may be written into any downstream artifact,
tool call, or report.**

## 5. Environment Constraints

> **Revised at Revision 3 (2026-08-17).** The Manual-branch rows are gone — this run takes the Automation
> branch — and the prose mutation override is replaced by the machine-readable policy. run-004 was created
> after 2026-08-07, so **`knowledge_base/execution_safety_policy.json` decides what may execute**, evaluated
> through `platform_core/tools/execution_safety/`. A stage does not interpret prose to decide; it calls the
> evaluator. The rows below state the consequences a test designer needs to know, not a second rulebook.

| Constraint | Implication for downstream stages | Source |
|---|---|---|
| **Shared staging, not isolated** — other testers and teams hold live data on `http://192.168.1.70` | Never assume a record you did not create is stable. Every ownership classification (`SelfCreated` vs `Shared`) is a real distinction with different permissions, not bookkeeping. | run configuration; `execution_safety_policy.json` |
| **Mutation is limited to records this run creates — Agencies, and now the Branch they depend on.** `CREATE / UPDATE / SUBMIT / APPROVE / REJECT SelfCreated` on **agency** (grant of 2026-08-17) and `CREATE / UPDATE / SUBMIT / APPROVE SelfCreated` on **branch** (`PO-14`, grant of 2026-08-18). | Stage `4A` and Stage `5A` **build their own Branch**, select its supplier and supplier credential, submit and approve it, then create their tagged Agencies under it and act on those. They still may **not** create or edit a **Supplier, Staff, Role, Payment Method, or any other reference data** — reading it to populate a dropdown remains fine. **The Branch exception is narrow and is about ownership, not about Branches:** a Branch this run did not create is untouchable exactly as before. | run configuration; `PO-14`; `{{RUN_FOLDER}}/metadata/SafetyAuthorizations.json` |
| **Why the Branch had to become creatable, rather than borrowed** | AC-9's `Airline Supplier credential (PCC)` section renders **only** on an Agency whose parent Branch carries a supplier with a credential selected (`BR-006`, `BR-008`, both from Stage 2 observation). Seeding an Agency under an arbitrary Branch produces no PCC section, and a test would then report a **false absence** — the exact failure that produced run-001's FINDING-002. | Stage 2 Discovery, 2026-08-18; discovery `FINDING-008` |
| **`APPROVE Shared` and `REJECT Shared` are `Forbidden (absolute)`.** No human grant can lift an absolute Forbidden; the evaluator refuses it. | This is **why** Create Agency is in scope as a means (§1, §2). A test case that would approve a pre-existing agency is not designed — it is redesigned to act on a self-created one. | `execution_safety_policy.json` |
| **`DELETE` is not authorized in any form** — absolute for `Shared`/`Unknown`, and not requested for `SelfCreated`. **`PO-3` accepts this** rather than working around it. | Records this run creates are **left in place**, tagged. **No cleanup through DELETE**, and no test case ends by deleting its fixture. Two binding obligations replace cleanup: **reuse a self-created record wherever test independence and validity allow**, and **record how many Agency records each execution created**. | `execution_safety_policy.json`; run-004 grant; `PO-3` |
| **The created Agency identifier is captured immediately** (`PO-2`) and preserved in the execution evidence | Ownership must stay provable for the life of the record. Capture happens **at creation, before any other action** — not reconstructed afterwards from a grid. Without it, an Approve cannot be shown to have acted on an authorized record. | `PO-2`; RSK-008 |
| **No bookings, payments, wallet charges, top-ups, holds, ticketing, refunds, or voids** — `Forbidden (absolute)`, even to verify a Reflection-area effect | Downstream-effect verification is limited to searching and reading. Any case needing a booking or a charge is designed in full and marked `Deferred / Requires Authorization`. | `execution_safety_policy.json` |
| **Headed vs Headless is asked immediately before every execution** — including reruns, verification runs, and regression runs | The Automation branch does not fix the mode the way `4M` did. It is **never inferred** from the previous run and never assumed from this document. | user standing instruction |
| **Every selector must be verified live** against the running application before Stage `4A` emits it | Stage `4A` uses the headless Playwright MCP server to confirm each locator, and consults the shared Selector Verification and Repair knowledge before generating. No locator is written from a snapshot alone. | `pipeline.md` (Stage `4A`) |
| **The automation framework is fixed, not chosen** — the SHAFT structure in `knowledge_base/automation_framework.md` | Stage `4A` follows that structure. It does not select, propose, or invent a framework, and does not copy `modules/branch/automation/` as a template. | user standing instruction; `automation_framework.md` |
| **Destructive negative cases are deferred, not asked about** — account lockout, brute force, and equivalents | Design the case, mark it `Deferred / Requires Dedicated Environment`, state why, continue. Never ask, never silently drop. Directly relevant: AUTH-11 locks an account after three failed OTP attempts. | `pipeline.md` §5.5; run configuration |
| **Upload fixtures are synthetic and committed** (`PO-4`) — at a stable path inside the automation test resources, containing **no real, private, production, customer, or sensitive information**. At minimum: a valid PDF · a valid supported image ≤ 2 MB · a non-PDF file · an image > 2 MB. | **Stage 3 identifies each required fixture by name and purpose; Stage `4A` places or references it by a suite-resolvable path.** A scratchpad file will not do — an automated rerun cannot depend on a file deleted after the session. **This is a change from Revision 2**, which sent them to the scratchpad because only a human was going to use them. The synthetic-content rule is not optional: these files are committed to the repository. | US-4222 AC-3, AC-4; §10 (file storage); `PO-4` |
| **Plain HTTP on a LAN address** | Reachable only from inside the network. Reachability is unverified for this run — Stage 2 confirms it first. If browser navigation times out, probe over raw HTTP before declaring a blocker: on `branch` run-003 an apparent outage was local tooling, not the application. | §10 (reference environments); run configuration; `branch` reuse item R-4 |
| **One account covers both actors** — `odeysysadmin` is approved as Admin and Super Admin (`PO-1`) | **Neither a blocker nor a risk** (`PO-9`). No role-permission case, no maker-checker separation case, and no self-approval authorization case is designed. Assertions cover **Agency workflow behaviour and resulting state only**, never the correctness of the role authorization model. | run configuration — Credentials; `PO-1`, `PO-9` |
| **Expected results for validation messages come from Stage 2 observation, not from the story** (`PO-12`) | Stage 2 triggers each validation **through a valid interaction** (see `branch` reuse R-1 — a scripted `.value` assignment does not trigger real validation), captures the exact displayed string with punctuation and capitalization, and records every story-vs-application difference under §1.1. Stage 3 designs from those observations. **No blind exact-match against outdated US-4222 strings.** | `PO-12`; §9.1 |
| **Branch is read-only on the Update form and must not be changed** (`PO-10`) | Stage 2 **verifies** non-editability; it does not attempt an edit. No re-inheritance-after-Branch-change coverage exists in this run. | `PO-10` |

**run-006 (Revision 5).** run-004's grants do not carry forward. run-006 has its own, evaluated against
the same policy on 2026-09-23:

| Constraint | Implication for downstream stages | Source |
|---|---|---|
| **Mutation limited to self-created Agency and Branch records** — `CREATE / UPDATE / SUBMIT / APPROVE SelfCreated` on `agency` and on `branch` | The run builds its own test Branch, then its own test Agency under it, and changes Auto Reissue and credential selection **only** on those. The evaluator returns `UPDATE SelfCreated agency` → **Allowed**, `UPDATE Shared agency` → **Approval Required** (not granted), `APPROVE Shared branch` → **Forbidden**. **`REJECT` is not granted** — no case in this story needs it | `PO-19`; `runs/run-006…/metadata/SafetyAuthorizations.json` (approved by mohamed.soliman@tildetech.ae, 2026-09-23) |
| **Choosing reissue credentials is an `UPDATE` of the run's own Agency, not a `CREDENTIAL_CHANGE`** | The policy's `CREDENTIAL_CHANGE` class is about changing an **account's login credential** (`execution_safety_policy.md`: *"changing its credential would lock out the run and anyone else using it"*). Selecting which supplier credentials an organization may reissue with is a field on the organization record. **Confirmed at the Stage 1 gate, 2026-09-24**, in the reviewer's words: *"all you need to change the selection of credential and it is the supplier credential not login credentials"*. No login credential is ever changed | `execution_safety_policy.md`; reviewer confirmation 2026-09-24 |
| **The platform never books** — `BOOK` is `Forbidden (absolute)` (evaluator: `BOOK SelfCreated agency` → **Forbidden**) | Every booking this run observes is made **manually by the user** (`PO-19`). The platform opens the Admin Itinerary **read only**. A case needing a booking that does not exist yet waits for the user's reference. It is never worked around | `PO-19`; `execution_safety_policy.json` |
| **API cases send requests only against the run's own Agency** | `S-3` … `S-6` are backend requests. `PUT` against a record the run did not create is an `UPDATE Shared` and is not granted | `PO-17`, `PO-19` |
| **Retention and ownership rules carry over unchanged** — no `DELETE`; capture the test Agency's ID at creation; record how many records each execution created | Same obligations as `PO-2`/`PO-3`, applied to run-006's own records | `PO-2`, `PO-3` (method); run-006 grant |
| **Headed vs Headless is asked before every execution** | Unchanged standing rule | user standing instruction |

## 6. Carried-Forward Assumptions & Risks

| ID | Type | Statement (meaning preserved) | Affected Module(s) | PRD Reference |
|---|---|---|---|---|
| ASM-001 | Assumption | The PRD was **reverse-engineered from an automation suite**, is marked *Draft for business review*, and is **not business-approved**. Every requirement carries `[V]` verified / `[O]` observed / `[I]` inferred; `[O]` and `[I]` must be **probed, never treated as settled acceptance criteria**. Where automation and business intent disagree, business intent wins. | all | §0, §0.1, §17 |
| ASM-002 | Assumption | **The PRD contains no requirement describing the Agency *update* flow.** ORG-05 describes creation; XC-04 establishes only that the maker–checker workflow covers updates. The update form's section list is *assumed* to mirror the create form's. US-4222 is the sole requirement for the flow under test. | `agency` | ORG-05, XC-04 |
| ASM-003 | Assumption | Agency PCCs are **inherited from Supplier & Branch** — an agency does not define credentials of its own. **Refined at Revision 5 (`PO-16`):** the Agency still defines no credential *of its own*, but it **may customize which inherited credentials it selects** — within the set its parent Branch holds, never beyond it. | `agency`, `master-supplier`, `branch` | ORG-07 `[V]`, SUP-05 `[V]`; `PO-16` |
| ASM-004 | ~~Assumption~~ **Retired — Out of Scope (`PO-9`)** | **"Self-approval is assumed prohibited but never proven."** Retired as a test target. `PO-1` approves `odeysysadmin` for both actors; `PO-9` removes role-permission and self-approval authorization cases from this run. **run-004 does not test who may approve.** The underlying question (XC-06, PRD `OQ-1`) is real and stays open **for the Role CRUD module** — it is not answered here and must not be reported as covered. | Role CRUD (future) | XC-06 `[I]`, OQ-1; `PO-1`, `PO-9` |
| ASM-005 | Assumption | **Credit enforcement behaviour is unspecified.** What actually happens at the credit limit, the top-up limit, the reaching-percentage threshold, and past credit terms in days is configured everywhere and exercised nowhere. Setting these fields is testable; their *effect* is not. | `agency`, `company`, `reports` | OQ-7 |
| ASM-006 | ~~Assumption~~ **Deferred to Role CRUD (`PO-9`)** | **The complete approval matrix is unknown** — which record types require approval, and which role approves each. Still true, still unanswered, but **no longer this run's concern**: run-004 asserts workflow behaviour, not the authorization model. Carried as a documented boundary (§3.1) so the gap stays visible. | Role CRUD (future) | OQ-2; `PO-9` |
| ASM-007 | Assumption | **The agency field-level validation matrix has no existing coverage.** The business story specifies ~45 fields with an exact validation and message each; only the happy path was ever automated, with no negative field-level coverage. This run is the first verification of those messages. | `agency` | GAP-7 |
| ASM-008 | ~~Open Question~~ **Deferred — Future Coverage (`PO-5`)** | **Draft-save discrepancy.** The backlog specifies "submit for approval **or save as draft**"; draft save was never automated; US-4222's Expected Outcome does not mention a draft. **`PO-5` puts `Save as Draft` out of scope for run-004 and directs that the discrepancy stay on record as a future coverage item.** No test cases in this run. The discrepancy is **deferred, not resolved** — nobody has established whether the form has a draft option. | `agency` | GAP-8; `PO-5` |
| ASM-009 | Assumption | The **PDF-only** document constraint and the **image ≤ 2 MB** logo constraint come from the business story, **not** from automation — no automated check pins either. | `agency` | §10 (file storage) |
| ASM-010 | Assumption | Reference test data in the source suite **hardcodes environment-specific records** (e.g. branch `AboBakrTravel (BRN471)`) and past dates. Any such record named in a test case must be re-confirmed to exist on the current environment rather than assumed. | all | DEF-6 |
| ASM-011 | ~~Open Question~~ **Answered (`PO-6`)** | **Story OQ #1** — "Cancel: clears unsaved changes or exits the **role** update process." **Answered on both halves.** The word *role* refers to **role-based authorization** (only certain roles may Approve or Reject), not to a Role-story copy-paste — and that question is out of scope for run-004 (Role CRUD owns it). **For the Agency update flow: Cancel discards unsaved Agency changes and exits without persisting them.** That is the behaviour Stage 3 designs to. | `agency` | US-4222 Open Questions; `PO-6` |
| ASM-012 | ~~Open Question~~ **Answered (`PO-7`)** | **Story OQ #2/#3** — must documents and the logo be re-uploaded on every update? **No.** Files already stored on an agency **remain present** when the Update form opens. Re-upload is required **only when adding, replacing, or updating** that file. AC-3's and AC-4's "Mandatory" describes the create-time rule, inherited by this form — not a per-update obligation. §2's AC-3 and AC-4 rows carry the revised expectation. | `agency` | US-4222 Open Questions; `PO-7` |
| ASM-013 | ~~Open Question~~ **Converted to a Stage 2 observation task (`PO-8`)** | **Story OQ #4** — the AC-9 table's ambiguous "Filter" column alignment. **Not answered by re-reading the AC, and deliberately so:** `PO-8` makes the **live form layout the intended reference** and **prohibits inferring separate fields from ambiguous row alignment**. Stage 2 **observes and documents the exact live layout and available controls** for AC-9 and every PCC-related ambiguity; Stage 3 designs from that record. Known shape for the adjacent Product Access section: a table of Status · Supplier Name · Credential Name · Product Name · Description, with product checkboxes and per-supplier rows. | `agency` | US-4222 Open Questions; `PO-8` |
| ASM-014 | ~~Open Question~~ **Answered (Revision 3)** | **Story OQ #5** — "Payment Options (e.g. Cash, Wallet, Credit Card, etc.)" gives no authoritative complete set. **It does have one:** the checkbox list is sourced from **Master → Payment Gateway → Payment Method**, and its size (~34 Active entries, Online/Offline) is intended cross-module reflection. Confirmed on the Branch form and dispositioned by the module owner. **The count is not fixed** — it tracks whatever is Active in that master, so a test must read the master rather than hardcode a number, and must re-observe the list on the Agency form before asserting it. | `agency`, `payment-gateway` | `knowledge/business/rules/APP-002`; `branch` reuse R-9; PAY-03 |
| ASM-015 | ~~Open Question~~ **Deferred to Role CRUD (`PO-9`)** | **Story OQ #6** — "authorized users (e.g. supervisors)" for Approve/Reject: which role(s), and must the approver differ from the maker? **Out of scope for run-004.** `odeysysadmin` performs both sides under `PO-1`; no case asserts who is *permitted* to. The question remains genuinely unanswered and belongs to Role CRUD. | Role CRUD (future) | US-4222 Open Questions; OQ-1, OQ-2; `PO-9` |
| ASM-016 | ~~Open Question~~ **Retired (`PO-10`)** | **Story OQ #7** — does changing `Branch` re-inherit and overwrite Country, Product Access, and Sales Contact? **The question does not arise: Branch cannot be changed from inside the Agency Update form.** All coverage of Branch change and post-change re-inheritance is removed. Stage 2 **verifies Branch is non-editable / read-only and does not attempt to change it** (§2, §3.1, §5). | `agency`, `branch` | US-4222 Open Questions; `PO-10` |
| ASM-017 | ~~Open Question~~ **Answered (`PO-11`)** | **Story OQ #8** — are the Reflection areas in scope, or impact awareness only? **Impact awareness only, for run-004** — Rule Engine, Search & Booking, NDC Portal, Reports, Top Up, and any other downstream module affected by Agency configuration. **No reflection-area test cases are created or executed.** Relationships stay recorded as module boundaries (§3.1) and future full-project coverage, revisited once enough modules are reviewed and an application-level Project Context exists. This is a **decision**, not a pending answer. | `agency` + the named modules | US-4222 Reflection; `PO-11` |
| ASM-018 | ~~Open Question~~ **Superseded by method (`PO-12`)** | **Story OQ #9** — are the oddly punctuated strings (`"Please enter a valid phone no.."`, `"Please enter a valid description"`) what the application actually renders? **No longer a question to answer up front — it is a Discovery obligation.** Stage 2 triggers each validation through a valid interaction, captures the exact displayed message including punctuation and capitalization, records every story-vs-application difference, and classifies it under §1.1. **Stage 3 designs expected results from those verified observations, never a blind exact-match against the story.** | `agency` | US-4222 Open Questions; §9.1; `PO-12` |
| RSK-001 | **Risk — rewritten (Revision 3)** | **Concurrent modification.** *No longer about picking a shared agency:* run-004 acts **only on records it creates** (`PO-2`), so no other team's agency is selected, read as a baseline, or modified. **The residual exposure is narrower and real:** the **shared reference data** a self-created agency depends on — Branch, Supplier, Payment Method, Country/State/City — can change mid-run and shift what the form offers. Mitigation: capture the reference values the record was created with, and re-read rather than assume when a dropdown's contents matter to an assertion. **Do not "prefer a low-traffic agency" — do not select an existing agency at all.** | `agency` | run configuration; `PO-2` |
| RSK-002 | **Risk — rewritten (Revision 3)** | **Commercial configuration on shared staging.** *No longer about editing a live agency's settings:* Credit Limit, Payment Options, and PCCs are changed **only on run-004's own records**, so no other tester's agency configuration is altered and **no restore step is needed or performed.** **The residual exposure:** a self-created agency is still a real, visible record on shared staging — it appears in other people's searches and, once approved, is live configuration in its own right. Mitigation: the run-tag makes it identifiable as test data (`PO-2`), and its count is recorded per execution (`PO-3`). **The "restore original values after each mutating case" instruction from Revision 2 is withdrawn — there are no original values to restore.** | `agency` | RUL-03, SUP-05; run configuration; `PO-2`, `PO-3` |
| RSK-003 | ~~Risk~~ **Retired (`PO-9`)** | **"Approve/Reject may be unexecutable with one identity."** Retired outright. `PO-9` states the single account is **neither a blocker nor a risk**, and `PO-1` approves `odeysysadmin` for both sides of the workflow. The identity-count concern is gone; RSK-008 (record ownership) is the risk that actually governs Approve and Reject. | `agency` | XC-06, OQ-1; `PO-1`, `PO-9` |
| RSK-004 | ~~Risk~~ **Closed by decision (`PO-4`)** | **"Upload negative paths need deliberately bad fixtures."** Closed: `PO-4` directs that synthetic fixtures be created at a stable committed path — a valid PDF, a valid image ≤ 2 MB, a non-PDF, and an image > 2 MB. **Closed by a decision, not by the files existing yet**; §8 tracks the outstanding work. Two conditions ride with it: the content must be **synthetic and non-sensitive** (they are committed to the repository), and the path must be **suite-resolvable** (`PO-4`, §5). | `agency` | US-4222 AC-3, AC-4; `PO-4` |
| RSK-005 | Risk | **Non-functional requirements are absent from the PRD** — no availability, capacity, response-time, retention, PCI-DSS, GDPR/passport-handling, audit-log, or accessibility requirement exists to test against. This run makes no non-functional claim. | all | §12 ("Missing" row) |
| RSK-006 | Risk | **No audit log exists to verify the change trail.** `Rule History` exists for rules; a general audit log is a known gap. An agency update's audit trail can therefore only be observed as approval state, not as a log entry. | `agency` | GAP-4 |
| RSK-007 | Risk | **`[O]`/`[I]`-tagged behaviour may not exist as described.** Several Agency-adjacent statements are inferred from locators or field names alone. A test case built on one may fail because the requirement was never real — that is a requirements defect, not necessarily a product defect, and must be classified as such. | `agency` | §0.1, §0.3 |
| RSK-008 | **Risk — mitigation now mandatory (`PO-2`)** | **An untagged self-created record is indistinguishable from a shared one after the fact.** The grant's boundary is "records this run created". Without a captured, run-tagged identifier a later Approve cannot prove it acted on an authorized record — and Approve on a shared record is `Forbidden (absolute)`. **`PO-2` makes the mitigation a directive rather than advice:** capture the identifier **immediately at creation**, before any other action, and **preserve it in the execution evidence**. | `agency` | run-004 mutation grant; `PO-2` |
| RSK-009 | **Risk — accepted, with two obligations (`PO-3`)** | **Records accumulate and are never cleaned up.** `DELETE` is not authorized in any form, so every agency this run creates stays on shared staging permanently, and every rerun adds more. **`PO-3` accepts this explicitly.** Two binding obligations replace cleanup: **(1)** reuse a self-created record **where test independence and test validity allow it** — reuse never at the cost of a valid test; **(2)** **record how many Agency records each execution created**. **No cleanup through DELETE.** An accepted cost, recorded — not a defect to fix silently, and not a reason to skip a test. | `agency` | `execution_safety_policy.json`; run-004 grant; `PO-3` |
| RSK-010 | Risk | *(New, Revision 3.)* **Automation-branch drift risk on a form of ~45 fields.** Stage `4A` verifies every selector live, but the Agency form is built on PrimeNG widgets whose DOM shape differs from their apparent control (`p-dropdown`, `p-calendar`, `p-multiselect`). A locator written against the hidden native input rather than the wrapper compiles, runs, and silently does nothing. Mitigation: apply the shared PrimeNG repair patterns (REP-004 … REP-009) **before** generating, not after the first failure. | `agency` | `knowledge/patterns/repair/`; `branch` reuse R-8 |
| ASM-019 | Assumption | *(Revision 5.)* **The UI's credential picker is not described anywhere.** The specification gives the API body and the API messages. It does not say whether the picker is a multi-select, a checkbox list or a table, whether it appears only when Auto Reissue is on, or what the UI shows when `S-2` / `S-8` / `S-9` is rejected. Stage 2 observes the live control and the messages it shows (`PO-12` method). Stage 3 designs from that observation, never from the API messages alone. | `agency` | spec §2, §3; `PO-17` |
| ASM-020 | Assumption | *(Revision 5.)* **The specification's endpoints are abbreviated** (`POST/PUT /Admin2/agency/...`). The full path, the rest of the request body, and the authentication the API expects are not stated. Stage 2 reads them from the Admin application's own network traffic while saving a self-created Agency. Nothing is guessed. | `agency` | spec §2 |
| ASM-021 | Assumption | *(Revision 5.)* **"Mapped to this organization" (`S-8`) and "exists on the parent Branch" (`PO-16`) are assumed to be the same set for an Agency.** The specification says a credential must be mapped to the organization. The user says an Agency cannot hold one its Branch lacks. If the two sets can differ on STG, Stage 2 reports it as a Finding rather than choosing one. | `agency`, `branch` | spec `S-8`; `PO-16` |
| ASM-022 | Assumption | *(Revision 5.)* **`BOOKED` in spec §5 is assumed to be the Itinerary's displayed booking status.** A booking in another state (ticketed, cancelled, pending) must hide the button. Which statuses a manual booking can reach on STG depends on what the user books. **Refined 2026-10-01 by `PO-30`:** the condition is Status `Booked` **and** the "Ticketed Document" status bar, both. | `agency` | spec §5; `PO-19` |
| RSK-011 | Risk | *(Revision 5.)* **Itinerary cases depend on bookings the platform cannot make.** Every Admin Impact case needs a `BOOKED` booking under the run's test Agency, made manually by the user (`PO-19`). Without the booking reference, those cases stay `Blocked — Awaiting User Booking`. That is not a failure, and not a reason to book. **Order matters:** the test Agency must exist and be approved **before** the user books under it. | `agency` | `PO-19`; spec §5 |
| RSK-012 | Risk | *(Revision 5.)* **Several specification states can only be reached by changing shared reference data.** An inactive credential (`S-5`), a supplier that does not support auto-reissue (`S-9`), and read-time clean-up after a credential becomes invalid (spec §4) each need a supplier or credential to *be* in that state. **This run may not change Supplier or credential records.** Mitigation: first look for credentials already in that state on STG (read only). Otherwise, test the API form where the request can carry the condition (`S-5` with an unknown ID), and mark the rest `Deferred / Requires Authorization`. | `agency`, `master-supplier` | spec §3, §4; §5 of this document |
| RSK-013 | Risk | *(Revision 5.)* **A saved-but-unapproved change may not be what the Itinerary reads.** The Agency is maker–checker governed (XC-01, XC-04). Whether `canAutoReissue` uses the approved value or the pending value is not stated. Test Design must check the button **after Approve**, and treat "after Send For Approval, before Approve" as a separate, explicitly labelled observation. | `agency` | XC-01, XC-04; spec §5 |
| RSK-014 | Risk | *(Revision 5.)* **Regression scope can silently grow.** *"Verify existing Agency CRUD functionality is not affected"* could be read as re-running all of US-4222. The narrowest-reading rule for a User Story run applies: a small smoke set on create and update with the checkbox untouched. Anything wider is a disclosed human decision at the Stage 3 gate, never a default. | `agency` | `test-design-skill` §16; story AC *Regression & Validation* |
## 6.1 Knowledge reused from the `branch` module

*(Added Revision 3, on user direction, 2026-08-17.)*

Reusable knowledge, patterns, conventions, and validated solutions from `branch` are carried into this run.
**Branch-specific test data, selectors, assumptions, defects, and artifacts are not.** Nothing was copied
into this module; every item is cited by its `modules/branch/…` path and read from there.

**The rule applied:** a *method* transfers; a *fact about Branch* does not. The full item-by-item record,
including what was deliberately excluded and why, is at
[`runs/run-004…/metadata/BranchKnowledgeReuse.md`](../../../runs/run-004__2026-08-17_14-35-25__UserStory__US-4222-UpdateAgency/metadata/BranchKnowledgeReuse.md).

| Ref | Reused | Effect here |
|---|---|---|
| R-1 | Max-length probes must drive **real keystrokes**, never assign `element.value` — a scripted assignment bypasses HTML `maxlength` and reports a false "no cap". | Applies to seven Agency numeric fields. On `branch` this method defect produced three false findings. |
| R-2 | Read a pre-filled Update form by **polling**, not one fixed-delay sample. | US-4222 is an update story; ~45 fields are read pre-filled. The highest-value transfer in this list. |
| R-3 | Probe PrimeNG **widget-aware**; a native `input`/`select` scan under-reports controls that are present. | Agency's form is dense with PrimeNG dropdowns, calendars, and multi-selects. |
| R-4 | On a navigation timeout, probe over **raw HTTP** before raising a blocker. | Decides whether a Stage 2 environment blocker is real. |
| R-5 | **Record rejected finding candidates** — a dismissed candidate is a result, not an absence of one. | Adopted as this run's Discovery convention. |
| R-6 | A **Create-screen disposition does not automatically transfer to Update** (stored value ≠ form default). Where it cannot transfer, record *not comparable*. | AC-10's Import PNR toggle is exactly this shape. |
| R-7 | ~~One account **is** the self-approval configuration.~~ **Superseded by `PO-9`.** | **No longer applied.** The method was sound, but `PO-9` removes self-approval authorization from this run's scope entirely, so there is nothing here for it to enable. RSK-003 is retired and ASM-004 is deferred to Role CRUD. Retained in the table so the reuse record stays complete and its withdrawal is visible. |
| R-8 | PrimeNG interaction patterns — wrapper not hidden input; filter-then-select with exact-prefix match on `"Name (Code)"`; `p-calendar` needs keystrokes; a repeatable "Add" creates a second required row; poll for post-submit navigation. | Platform-scope patterns (REP-004 … REP-009), mandatory reading for Stage `4A`. See RSK-010. |
| R-9 | Payment Options are sourced from **Master → Payment Gateway → Payment Method**; the long list is intended. | Answers ASM-014. Also **pre-disposes** this module's existing `FINDING-003_PaymentOptionDataPollution` — Stage 2 re-checks it against APP-002 rather than re-raising it. |
| R-10 | Phone fields expect the **national number only**, no literal `+` prefix, despite the AC's wording. | Applies to all three US-4222 phone fields. A known AC-vs-application mismatch, not a new finding. |
| R-11 | The submit control reads **"Send For Approval"**, not "Submit for Approval" — module owner confirmed the AC is stale. | US-4222's Expected Outcome says "Submit for Approval". Disposition **row 1** under §1.1. **`PO-12` governs how this resolves on Agency:** Stage 2 captures the button's actual label; Stage 3 asserts what was captured. The Branch answer is a prior, not the expected result. |

### The Agency / Branch evidence boundary

**Strict separation, restated because Revision 3 leans on Branch more than any prior revision.**

| | |
|---|---|
| **What crosses** | **Methodology only** — how to probe, how to read, how to avoid a known false result. Plus application-domain facts already promoted to the shared `knowledge/` tree (`APP-002`, `BR-005`), which are citable precisely because they are no longer Branch's private observations. |
| **What never crosses** | Branch test data, selectors, page objects, findings, assumptions, risks, artifacts, and mutation grants. None is copied into `modules/agency/`; each reused item is cited by its `modules/branch/…` path and read from there. |
| **The standing rule** | **Every item in the table above is re-observed on the Agency screens before any test asserts it.** A fact confirmed on Branch is a **strong prior about this application** — never evidence about this form. |
| **Where evidence lands** | Agency evidence in `modules/agency/discovery/evidence/`; Branch evidence stays in `modules/branch/`. A Stage 2 Finding for Agency cites **Agency** evidence. A Branch citation may appear as *context for why we looked*, never as the proof. |

**The failure this prevents:** carrying a Branch conclusion into an Agency report would produce a finding —
or worse, a *passing* test — that no one ever observed on the Agency screens. Under `PO-12` that is already
prohibited for validation messages; this subsection extends the same discipline to every reused item.

## 7. Traceability Anchor

| Context Item | Section here | PRD Reference |
|---|---|---|
| Agency form section list (Master, Owner, Documents, Logo, Sales Contact, Bank Accounts, Payment Settings, Product Access, PCC, Import PNR) | §2 | ORG-05 `[V]` |
| Payment Settings fields (Invoice Generation, Credit Limit, Top-Up Limit, Credit Terms) | §2 | ORG-06 `[V]` |
| PCC inheritance from Supplier & Branch | §2, §3.1 | ORG-07 `[V]`, SUP-05 `[V]` |
| Locating an agency (search) | §2 | ORG-08 `[V]` |
| Maker–checker: Send for Approval → *Pending for approval* → Approve/Reject with Remarks, on updates as well as creates | §2 | XC-01 – XC-04 `[V]` |
| Cancel must not persist | §2 | GEO-09, SUP-10 `[V]` |
| Platform validation vocabulary (`Required`, email, phone, numeric-only) and success/empty-state strings | §2, ASM-018 | XC-17 – XC-22, §9.1, §9.2 |
| Import PNR toggle and the refusal it causes | §2, §3.1 | ORG-05, IPN-05 `[V]` |
| Document / logo upload constraints | §2, ASM-009 | §10 |
| Actor: `odeysysadmin` as both Admin and Super Admin | §4 | §2 (Actors), XC-02; `PO-1` |
| Role authorization excluded from this run | §3, §3.1, ASM-004, ASM-006, ASM-015 | XC-06, OQ-1, OQ-2; `PO-1`, `PO-6`, `PO-9` |
| Branch read-only on the Update form | §2, §3.1, §5, ASM-016 | ORG-05; `PO-10` |
| Existing documents and logo persist on Update | §2 (AC-3, AC-4), ASM-012 | §10; `PO-7` |
| Product Access renders as a table; PCC layout observed, not inferred | §2 (AC-8, AC-9), ASM-013 | ORG-05, ORG-07, SUP-05; `PO-8` |
| Validation expected results derive from Stage 2 observation | §2, §5, ASM-018 | §9.1; `PO-12` |
| Reflection areas are impact-awareness boundaries only | §3, §3.1, ASM-017 | US-4222 Reflection; `PO-11` |
| Target environment `http://192.168.1.70` | §5 | §10 (reference environments) |
| Agency data model (credit limit, invoice frequency, payment options, documents + contract dates, logo, bank accounts, PCCs, import-PNR flag) | §2 | §8 |
| Agency onboarding → Portal access (boundary, out of scope) | §3, §3.1 | E2E-04 |
| Field-level validation matrix has no prior coverage | ASM-007 | GAP-7 |
| Draft-save discrepancy | §3, ASM-008 | GAP-8 |
| Credit enforcement behaviour unspecified (still open) | ASM-005 | OQ-7 |
| Absent non-functional requirements | §3, RSK-005 | §12 |
| **Auto Reissue checkbox on Create/Update Agency; default off** *(Rev 5)* | §2 | Story AC *Agency CRUD*; spec §1; `PO-15` |
| **Saved value retrieved on edit and on GET** *(Rev 5)* | §2 | Story AC *Agency CRUD* 3; spec §4 |
| **Reissue-credential selection — UI and API rules `S-1` … `S-10`** *(Rev 5)* | §2, ASM-019, ASM-020, RSK-012 | spec §2, §3; `PO-17` |
| **Agency credentials bounded by the parent Branch** *(Rev 5)* | §2, §3.1, ASM-003, ASM-021 | `PO-16`; spec `S-8`; ORG-07, SUP-05 |
| **Agency and Branch checkboxes independent (Permission Precedence)** *(Rev 5)* | §1.3, §2, §3.1 | Story AC *Permission Precedence*; spec §3; `PO-16` |
| **Admin Itinerary `Reissue` button — `canAutoReissue`; six display conditions** *(Rev 5; rule restated 2026-10-01)* | §1.3 `PO-30`, §2, ASM-022, RSK-011, RSK-013 | Story AC *Admin Impact*, *Regression & Validation*; spec §5; `PO-19`, `PO-20`, `PO-30` |
| **Portal impact — deferred** *(Rev 5)* | §3 | Story AC *Portal Impact*; `PO-20` |
| **Existing Agency CRUD not affected (smoke)** *(Rev 5)* | §2, RSK-014 | Story AC *Regression & Validation* 1 |
| **Reissue flow is a different scope** *(Rev 5)* | §3, §3.1 | `Reissue_Flow_From_Itinerary.md` → `supplier-features/reissue/shared/reissue-flow/` |
| **run-006 mutation grant and no-booking rule** *(Rev 5)* | §4, §5 | `PO-19`; `runs/run-006…/metadata/SafetyAuthorizations.json` |

## 8. Open Questions — Requires Run Configuration

*(Rewritten at Revision 3, then again after the §1.2 decisions.)*

### 8.1 Closed

| Was missing / open | Now |
|---|---|
| Admin credentials | ✅ `credentials/credentials.json` **exists** (2026-08-03). ⚠️ **Not re-verified in run-004** — Stage 2 verifies login before anything else and reports a blocker if it fails. *Existing is not verified; §4 no longer says otherwise.* |
| Admin-actor confirmation | ✅ **Granted for run-004 by `PO-1`.** `odeysysadmin` is approved as both Admin and Super Admin. No longer inherited from run-003's directive. |
| A second identity for Approve/Reject | ✅ Not needed and **not a risk** (`PO-9`). RSK-003 retired. |
| Which agency record to update | ✅ Moot — this run **creates** its own records (`PO-2`). |
| Upload fixtures — *should they exist and where* | ✅ **Decided by `PO-4`.** Synthetic, non-sensitive, at a stable committed path in the automation test resources. The *decision* is closed; the *work* is tracked at §8.3. |
| Record retention / cleanup | ✅ **Accepted by `PO-3`**, with reuse-where-valid and per-execution record counts. No DELETE. |

### 8.2 Story Open Questions — **count corrected**

Revision 3 said *"seven"* and listed **eight** IDs. The correct figure after the §1.2 decisions is neither:

> **Zero of US-4222's nine story Open Questions remain open for run-004.**

| Disposition | Count | IDs |
|---|---|---|
| **Answered** | 4 | ASM-011 (`PO-6`) · ASM-012 (`PO-7`) · ASM-014 (`APP-002`) · ASM-017 (`PO-11`) |
| **Retired — the question no longer arises** | 1 | ASM-016 (`PO-10`) |
| **Converted to a Stage 2 observation task** | 2 | ASM-013 (`PO-8`) · ASM-018 (`PO-12`) |
| **Deferred, still genuinely unanswered** | 2 | ASM-008 → future coverage (`PO-5`) · ASM-015 → Role CRUD (`PO-9`) |

**"Deferred" is not "answered."** ASM-008 and ASM-015, plus ASM-004 and ASM-006, are open questions that
**someone still has to answer — just not in this run, and not by this module.** They are recorded so the
gap stays visible and is never reported as coverage.

### 8.3 Outstanding work — decided, not yet done

Not questions. Tracked here so nothing decided quietly fails to happen.

| Item | Owner | Sections |
|---|---|---|
| **Build the four synthetic upload fixtures.** Valid PDF · valid supported image ≤ 2 MB · non-PDF file · image > 2 MB. Synthetic and non-sensitive — they are committed. | Stage 3 identifies each by name and purpose; Stage `4A` places them and wires a suite-resolvable path. | §5, RSK-004, `PO-4` |
| **Verify `odeysysadmin` can log in** on `http://192.168.1.70`. | Stage 2, before any other action. | §4, §5 |
| **Observe and document the live AC-8 / AC-9 layout and controls.** | Stage 2. Stage 3 designs from that record, never from the AC's row alignment. | §2, ASM-013, `PO-8` |
| **Capture every validation message exactly as displayed**, via a valid interaction. | Stage 2. Stage 3 derives expected results from it. | §2, §5, ASM-018, `PO-12` |
| **Verify Branch is read-only** on the Update form — without attempting to change it. | Stage 2. | §2, §3.1, ASM-016, `PO-10` |

### 8.4 Still requires a human decision

Two items, neither blocking Stage 1 approval.

| # | Decision needed | Why it is yours, and my recommendation |
|---|---|---|
| 1 | **Where exactly the upload fixtures live.** `PO-4` says "within the automation test resources"; `agency` has no automation package yet, so no such folder exists to put them in. | A repo-structure call, so I recommend rather than default. **Recommendation:** `platform_core_data/automation_baseline/shaft/tests_SHAFT/src/test/resources/testDataFiles/agency/uploads/` — `testDataFiles/` is the SHAFT baseline's existing test-resource root, so the path is suite-resolvable on day one and needs no new convention. **Confirm or name a different path**; Stage `4A` needs it settled before it writes the upload steps. |
| 2 | **Whether to register a `Role CRUD` module now.** Four items are deferred to it — ASM-004, ASM-006, ASM-015, and RSK-003's underlying question — and it does not exist in `modules.json`. | Only Stage 1 may *propose* a module and only you may approve one. **Recommendation: not yet.** Proposing it now would be a placeholder with no requirement behind it; the deferrals are already recorded as a `Role CRUD` boundary in §3.1, which keeps the gap visible without asserting a module exists. **Say so if you would rather it be proposed at this gate.** |

### 8.5 run-006 — Auto Reissue *(Revision 5)*

**Closed at intake (2026-09-23):** the checkbox's name (`PO-15`), Agency vs Branch precedence (`PO-16`), UI
and backend both in scope (`PO-17`), Auto-Reissue as the technical source (`PO-18`), the mutation grant and
the no-booking rule (`PO-19`), Admin only (`PO-20`).

**Outstanding work — decided, not yet done:**

| Item | Owner | Sections |
|---|---|---|
| **Verify `odeysysadmin` can log in** on `http://192.168.1.70` | Stage 2, first | §4 |
| **Observe the Auto Reissue checkbox and the credential picker** on the live Create and Update Agency forms: exact labels, default, when the picker appears, what it lists, and what the UI shows on each rejection | Stage 2 | §2, ASM-019, `PO-12` method |
| **Capture the real save / read endpoints and body** from the Admin application's own traffic while saving the run's test Agency | Stage 2 | ASM-020 |
| **List which STG supplier credentials have `autoReissueAllowed = true`**, and whether any credential is already inactive or unsupported, **read only** | Stage 2 | RSK-012, spec §4 |
| **Create and approve the run's test Branch, then its test Agency** — *before* the user books | Stage 2 (fixture) or Stage 3/`4M`/`4A` — decided at Stage 3 | RSK-011, `PO-19` |
| **User makes the manual bookings** under the run's test Agency and supplies the booking references | The user | RSK-011, `PO-19` |

**Resolved at the Stage 1 gate, 2026-09-24 (Mohamed Soliman):**

| # | Decision | Resolution |
|---|---|---|
| 1 | Is selecting reissue credentials an `UPDATE`, not a `CREDENTIAL_CHANGE`? | **Confirmed.** *"all you need to change the selection of credential and it is the supplier credential not login credentials."* Credential-selection cases are executable on the run's own records (§5) |
| 2 | Do `PO-15` … `PO-20` carry product-owner authority? | **Confirmed** |
| 3 | Revision 5 approval | **Approved** |

**Raised and closed during Stage 2 (2026-09-24):** `Amadeus Live` (278) has `autoReissueAllowed: false`. **Intended.** Amadeus is not on the hard-coded reissue list (`NDCsbr`, `Sabre`, `TravelportNdc`, `Galileo`) — `PO-21` as corrected by the user.

**Still requires a human decision:** the **pipeline branch for run-006** (Manual `4M` or Automation `4A`), asked at the Stage 3 gate (`PO-20`).
