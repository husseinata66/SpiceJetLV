# Execution Safety Policy — NDC Admin Portal / STG

> **This document explains the policy. [`execution_safety_policy.json`](execution_safety_policy.json) *is* the policy.**
>
> The JSON is authoritative for evaluation — it is what the evaluator loads, hashes, and decides
> from. This file is authoritative for *review*: it records where every rule came from, and it is
> what a reviewer reads before approving a change. Where the two disagree, the JSON is what runs and
> this document is the bug.

| Field | Value |
|---|---|
| Policy ID | `ndc-admin-portal-stg` |
| Version | 2 (2026-09-28, HD-SAFETY-006 — see §3.5) |
| Environment | **Staging** (aliases: `STG`, `staging`, `stg`, `STG_PORTAL`, `ANCILLARIES_STG`, `UAT` — added 2026-10-17 by Ahmed Ayman for `credential-routes-filter-run-001`: the user names the `http://192.168.1.70` Admin environment `UAT`; same shared-staging rules apply) |
| Effective from | **2026-08-07** |
| Evaluator | [`platform_core/tools/execution_safety/`](../../platform_core/tools/execution_safety/README.md) |
| Applies to | Runs created on or after 2026-08-07 — see [§6](#6-what-this-policy-does-not-cover) |

---

## 1. What this answers

```text
Review            Is the Test Case accepted?              test-design-skill §6.3
Automation        Should it be automated?                 test-design-skill §6.3.2
Execution Safety  May this action execute here and now?   ← this policy
```

Three independent concerns. `Review = Approved` and `Automation = Approved` mean a test case is
correct and worth automating; neither says anything about whether the operations inside it may run
against this environment. Equally, no decision in this policy can make an unreviewed case executable.

**Capability does not imply authorization.** That the UI exposes Delete, that the Super Admin
credential can Approve, and that the automation exists to run are three facts about capability.
None of them is a permission.

---

## 2. The standing decisions

Read across: the action, then whose record it is.

| Action | SelfCreated | DedicatedTestData | Shared | Unknown | ProductionLike |
|---|---|---|---|---|---|
| **READ / SEARCH / DOWNLOAD** | Allowed | Allowed | Allowed | Allowed | Allowed |
| **CREATE / UPDATE / UPLOAD¹ / OTHER_MUTATION** | Approval Required | Approval Required | Approval Required ² | Approval Required ² | **Forbidden** |
| **DELETE** | Approval Required | Approval Required | **Forbidden** | **Forbidden** | **Forbidden** |
| **SUBMIT / APPROVE / REJECT** | Approval Required | Approval Required | **Forbidden** | **Forbidden** | **Forbidden** |
| **SEND_NOTIFICATION** | **Forbidden** | **Forbidden** | **Forbidden** | **Forbidden** | **Forbidden** |
| **BOOK / HOLD / TICKET / CANCEL_BOOKING / VOID** | **Forbidden** | **Forbidden** | **Forbidden** | **Forbidden** | **Forbidden** |
| **PAYMENT / TOP_UP / WALLET_CHARGE / REFUND** | **Forbidden** | **Forbidden** | **Forbidden** | **Forbidden** | **Forbidden** |
| **CREDENTIAL_CHANGE / ROLE_PERMISSION_CHANGE** | **Forbidden** | **Forbidden** | **Forbidden** | **Forbidden** | **Forbidden** |

¹ `UPLOAD` is additionally **Forbidden** on `Shared` and `Unknown` — attaching a document to a record
this run does not own adds data another team did not put there and may not notice.
² **Cleanup required.** The original values must be captured *before* the change and restored after
it. The evaluator returns `cleanupRequired: true` on these, and the approval prompt states it.

**Nothing here is `Allowed` outright except reading.** Every mutation, without exception, reaches a
human before it happens — either as a scoped authorization for the run, or as a refusal.

Run `node platform_core/tools/execution_safety/cli.js summary` to print this table from the live
policy rather than from this document.

---

## 3. Where each rule came from

Every rule falls into exactly one of three provenance classes, and the distinction is not cosmetic:
a migrated rule reflects a decision someone already made, a human-decided rule reflects a decision
made on 2026-08-07, and a conservative default reflects **no decision at all** — just a fail-safe
holding position that a future reviewer may legitimately want to revisit.

### 3.1 Migrated from existing evidence

| Rule | Source |
|---|---|
| `READ` / `SEARCH` / `DOWNLOAD` on every ownership class → **Allowed** | [`run_configuration.md`](run_configuration.md) §Run-specific mutation override — run-003: *"Reading is unrestricted. Searching, filtering, paginating, and viewing pre-existing Branch rows is not mutation and is fully in scope."* |
| Ordinary mutation → **Approval Required**, never Allowed | [`run_configuration.md`](run_configuration.md) §Environment Constraints: *"Standing default is read-only — no data mutation is authorized unless a run-specific override below grants it."* Corroborated by the fact that all three runs to date required an explicit grant, including to create their own seed data |
| `UPDATE` on `Shared` → **cleanup required** | STG is *"a shared environment, not isolated — other testers/teams may have live data on it"* ([`run_configuration.md`](run_configuration.md) §Target Environment) |
| `APPROVE` / `REJECT` on `Shared` → **Forbidden, absolute** | [`modules/branch/context/ProjectContext.md`](../modules/branch/context/ProjectContext.md) §5: *"approve/reject changes the state of a record that may not be this effort's to change. A Branch pending approval on STG may belong to another team's in-flight work; approving or rejecting it is not reversible by re-running the test."* Plus run-003's Forbidden #2 |
| `DELETE` on `Shared` → **Forbidden, absolute** | run-003 override, Forbidden #2: *"Any mutation of a Branch record this run did not create — including editing, approving, rejecting, or deleting."* |
| `PAYMENT`, `TOP_UP`, `WALLET_CHARGE` → **Forbidden, absolute** | [`run_configuration.md`](run_configuration.md) — named verbatim in **all three** run-specific override limits: *"No bookings, payments, wallet charges, top-ups, holds, or ticketing are permitted, even in service of verifying a Reflection-area effect."* Never lifted by any grant |
| `BOOK`, `HOLD`, `TICKET` → **Forbidden, absolute** | Same three passages — *"bookings"*, *"holds"*, *"ticketing"* named verbatim |
| `Unknown` never treated as `SelfCreated` | [`run_configuration.md`](run_configuration.md): run-002's own records are *"treated as pre-existing (conservative reading)"* — the project's own precedent for handling unprovable ownership |

### 3.2 Human-decided, 2026-08-07

Recorded through the Human Decision Gate; each was genuinely unresolvable from existing evidence.

| ID | Decision | Effect on this policy |
|---|---|---|
| **HD-SAFETY-001** | Two tiers: ordinary mutation defaults to `Approval Required`; `Forbidden` is **absolute and no run authorization can ever lift it**. Financial, booking, and destructive shared-record prohibitions remain absolute | The whole shape of §2 — why `UPDATE Shared` is answerable and `PAYMENT` is not |
| **HD-SAFETY-002** | `DELETE` on `SelfCreated` requires scoped human approval | `actions.DELETE.SelfCreated` = `Approval Required`. `DELETE` appears in **none** of the three historical grants, so nothing permitted it and nothing prohibited it |
| **HD-SAFETY-003** | Approvals are class-scoped per (environment, module, action, ownership) for one run; every executed action still records the exact record touched | The authorization record shape, and why 12 identical operations cost one question |
| **HD-SAFETY-004** | JSON authoritative, Markdown companion for review, `run_configuration.md` references rather than duplicates | This pair of files |
| **HD-SAFETY-005** | Prospective only; run-003 is not migrated | §6 below |

### 3.3 Conservative defaults — fail-safe, not evidence

**No project document addresses any of these.** They are `Forbidden` because a risky operation with
no policy must fail closed, not because anyone decided they should be prohibited. Each is a
legitimate candidate for revisiting when a run actually needs it.

| Rule | Why this holding position |
|---|---|
| `REFUND` → Forbidden, absolute | Not named anywhere in the project. It moves money, so it is treated as financial |
| `CANCEL_BOOKING`, `VOID` → Forbidden, absolute | Not named anywhere. Distinct, irreversible business effects — permission to `BOOK` would never have included them, and no permission to `BOOK` exists here anyway |
| `CREDENTIAL_CHANGE` → Forbidden, absolute | Not addressed. This run uses **one** shared Super Admin account standing in for two actors ([`run_configuration.md`](run_configuration.md) §Credentials, 2026-08-04 directive); changing its credential would lock out the run and anyone else using it |
| `ROLE_PERMISSION_CHANGE` → Forbidden, absolute | Not addressed. Alters who can do what, for everyone, beyond the run that changed it |
| `SEND_NOTIFICATION` → Forbidden | Not addressed. An outbound notification leaves the environment and reaches real recipients; nothing recalls it |
| `UPLOAD` on `Shared` / `Unknown` → Forbidden | Not addressed. Informed by [`FINDING-004`](../modules/agency/discovery/findings/FINDING-004_NonPdfDocumentAttached/metadata.md), where a document attachment was a real mutation of an existing Agency record |
| Everything under `ProductionLike` except reading → Forbidden | **No STG record is currently classified `ProductionLike`**, so this class is unexercised. The label is not applied speculatively |
| `DedicatedTestData` treated like `SelfCreated` | **No STG record is currently designated `DedicatedTestData`.** Parity is a holding position, not a finding |
| `defaults.*` → Forbidden | The catch-all. An uncategorised operation on shared staging fails closed |

### 3.4 What is deliberately *not* here

**No module or entity overrides.** The evaluator supports both, and none is defined. No current
project document establishes a rule that differs per module, and inventing one to look complete
would be exactly the invented permission this policy must not contain.

The three historical per-module grants — run-001 (Agency), run-002 (Branch), run-003 (self-created
Branch only) — were **run authorizations, not standing policy**, and each states in its own text
that it *does not carry forward*. Converting one into a module override would turn a one-run
approval into a permanent permission.

### 3.5 Relaxed for Ancillaries/AirIndia, 2026-09-28

**HD-SAFETY-006.** A pure addition — every rule in §3.1–§3.3 is unchanged, and every ownership class
other than `SelfCreated` remains exactly as absolutely forbidden as it was in version 1.

**Context:** Stage 4M (Manual Execution) for the Ancillaries/AirIndia Supplier Feature run (`run-007`)
needs to actually complete real bookings, payments, and wallet deductions to execute its approved
test suite — 6 of its 26 executable test cases are end-to-end scenarios that only produce evidence by
completing a real booking cycle. Under version 1, `BOOK`/`PAYMENT`/`WALLET_CHARGE` were `Forbidden,
absolute` for every ownership class, which made those 6 cases — and everything depending on their
output (Confirmation, retrieve-endpoint, Search Booking, Costing, Reports checkpoints) — impossible to
execute at all.

**What changed:** `categories.booking`, `categories.financial`, and `actions.BOOK` / `actions.PAYMENT`
/ `actions.WALLET_CHARGE` each gained a new `SelfCreated` key, decision `Approval Required` (never
`Allowed`, and never `absolute`). A booking this run itself creates — a fresh test booking with test
passenger data, on `STG_PORTAL` (Portal) or `ANCILLARIES_STG` (Admin) — can now be authorized by a
run-scoped grant (`SafetyAuthorizations.json`, inside `runs/run-007…/metadata/`), same mechanism as
every other `Approval Required` decision in this policy. Every other ownership class (`Shared`,
`Unknown`, `DedicatedTestData`, `ProductionLike`) keeps the pre-existing `*` wildcard rule, unchanged —
still `Forbidden, absolute`, for booking/financial actions against anyone else's data. `HOLD`,
`TICKET`, `CANCEL_BOOKING`, `VOID`, `TOP_UP`, `REFUND` are untouched — still `Forbidden, absolute` for
every ownership class, since no approved test case in this run's scope needs them (Void/Cancel and
Top-Up were explicitly placed out of scope during Discovery).

**Environment identity:** `STG_PORTAL` (the Portal app, `http://192.168.1.213:9500`) and
`ANCILLARIES_STG` (the Admin app for this Feature specifically, `http://192.168.1.213`, distinct from
the original project's Admin app at `192.168.1.70`) were added as aliases of `Staging`, per explicit
user confirmation (2026-09-28) that both are genuine test/staging systems — not production, not
connected to a live payment gateway or real supplier ticketing — following the standing project rule
that an environment's safety is never inferred from its name alone.

**Provenance:** User-approved 2026-09-28, in response to the Stage 4M preflight reporting `BOOK` and
`financial` actions as `Forbidden, absolute` and blocking all 6 E2E test cases. The user was shown the
exact JSON diff before approving. Per §7 rule 6 below, this relaxation is recorded here as a Human
Decision, not an engineering one.

---

## 4. Precedence — which rule wins

Full algorithm in the [evaluator README](../../platform_core/tools/execution_safety/README.md#5-decision-precedence). In short, in order:

1. **An absolute prohibition wins outright** — no rule at any scope overrides it.
2. **A prohibition is never overridden by a vaguer permission.** A `Forbidden` beats any rule of
   strictly lower risk tier, at any scope. *"Mutation is allowed in Agency"* can never come to mean
   *"deleting other people's Agency records is allowed in Agency"*.
3. The narrowest scope wins — entity > module > global.
4. Within a scope, the more specific rule wins — `UPDATE`+`Shared` beats `mutation`+any.
5. On an exact tie, the **most restrictive** decision wins.

And independently of all five: **no run-scoped authorization ever lifts a `Forbidden`.** An
authorization only ever satisfies an `Approval Required`. One that tries is ignored and reported.

---

## 5. Run-scoped authorization

A human authorization covers **one run**, one environment, one module, one action, one ownership
class. It is stored at `platform_core_data/runs/{RUN_FOLDER}/metadata/SafetyAuthorizations.json`
with a Markdown companion — inside the run folder, so it cannot outlive it.

```text
Allow UPDATE of Shared agency records on Staging, for run-042?
    ✓ covers   every Shared agency UPDATE in run-042
    ✗ not      DELETE · PAYMENT · branch UPDATE · SelfCreated-only grants widened to Shared
    ✗ not      run-043, even for the identical action
```

Twelve test cases sharing one scope cost **one** question, not twelve. The approval is class-wide;
the audit trail stays per-record, because every executed action records the exact record it touched.

Nothing granted this way becomes project policy. A future run asks fresh.

---

## 6. What this policy does not cover

**It is prospective.** It takes effect **2026-08-07** and governs runs created on or after that date.

`run-001`, `run-002`, and `run-003` executed under the prose grants recorded in
[`run_configuration.md`](run_configuration.md), which remain the authoritative record of what those
runs were authorized to do. They were **not** evaluated by this mechanism, and no artifact of theirs
has been rewritten to suggest otherwise (HD-SAFETY-005).

`run-003` is still active at the time of writing and continues under its prose grant. Its narrowing
to *self-created Branch records only* is **narrower than this policy** in one respect — this policy
permits `UPDATE` on `Shared` subject to approval, while run-003's grant forbids it outright for
Branch. A run authorization can always be narrower than the policy; it can never be wider.

---

## 7. Changing this policy

1. Edit `execution_safety_policy.json`.
2. Give every new or changed rule a `source` — migrated evidence, a human decision, or an explicit
   *"conservative default"*. A rule with no source is a rule somebody invented, and the test suite
   fails on it.
3. Bump `policyVersion`.
4. Run `node platform_core/tools/execution_safety/cli.js validate` and `npm test`.
5. Update §3 of this document with the provenance.
6. A **relaxation** — anything moving toward `Allowed` — is a Human Decision, never an engineering
   one (`pipeline.md` §5.5: *"Executing any destructive or irreversible operation"*).
