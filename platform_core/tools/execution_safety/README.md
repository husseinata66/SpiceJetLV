# Execution Safety

Deterministic answer to one question, asked before any action reaches the application under test:

> **Is this specific action authorized on this specific environment, against this type of data, for this run?**

```text
Allowed            execute
Approval Required  stop, ask a human, execute only within the approved scope
Forbidden          do not execute — and no approval changes that
```

**Governing principle: capability does not imply authorization.** That the UI exposes Delete, that
the credential can Approve, and that the automation exists to run are three facts about capability.
None of them is a permission.

---

## 1. Where this sits

Three independent governance concerns. This is the third.

```text
Review            Is the Test Case accepted?              test-design-skill §6.3
Automation        Should it be automated?                 test-design-skill §6.3.2
Execution Safety  May this action execute here and now?   ← this tool
```

They compose in one direction only. Safety runs **after** Test Case eligibility and can only narrow
it: `Allowed` never makes an unreviewed case executable, and `Review = Approved AND Automation =
Approved` authorizes *generation*, never *mutation*.

```text
Test Case eligibility  (Review / Automation)
        ↓
Execution Safety Preflight        ← non-mutating, whole-run, before anything starts
        ↓
Resolve required human approvals  ← one question per policy scope, not per test case
        ↓
per operation:  Safety Evaluator
        ↓
Allowed / Approval Required / Forbidden
        ↓
Execution
```

## 2. Ownership

```text
platform_core/tools/execution_safety/          the evaluator — reusable, project-agnostic, NO rules
platform_core_data/knowledge_base/
    execution_safety_policy.json               the project's policy — authoritative for evaluation
    execution_safety_policy.md                 the same policy, explained, with provenance per rule
platform_core_data/runs/{RUN}/metadata/
    SafetyAuthorizations.json / .md            run-scoped human approvals — inside the run folder
    SafetyPreflight.md                         what the run was going to do, before it did it
```

No project rule appears anywhere under `platform_core/`. This tool knows that `PAYMENT` is a
financial action; it does not know whether payments are permitted anywhere.

## 3. The model

### Actions — 23, deliberately not reduced to CRUD

| Category | Actions |
|---|---|
| `read` | `READ` `SEARCH` `DOWNLOAD` |
| `mutation` | `CREATE` `UPDATE` `DELETE` `UPLOAD` `OTHER_MUTATION` |
| `approval` | `SUBMIT` `APPROVE` `REJECT` |
| `notification` | `SEND_NOTIFICATION` |
| `booking` | `BOOK` `HOLD` `TICKET` `CANCEL_BOOKING` `VOID` |
| `financial` | `PAYMENT` `TOP_UP` `WALLET_CHARGE` `REFUND` |
| `privileged` | `CREDENTIAL_CHANGE` `ROLE_PERMISSION_CHANGE` |

`UPDATE Agency Name` and `PAYMENT` are both state-changing, and the entire reason this model exists
is that they must be governable differently. Likewise `BOOK`, `CANCEL_BOOKING` and `VOID` are
distinct business effects, never three flavours of `UPDATE` — permission to book has never implied
permission to cancel.

An **unrecognised verb becomes `OTHER_MUTATION`**, never a read, and is reported.

### Ownership — whose record is this?

| Class | Meaning |
|---|---|
| `SelfCreated` | Created by the current run, for this test |
| `DedicatedTestData` | A persistent record explicitly reserved for testing |
| `Shared` | Pre-existing, and other testers / developers / runs / integrations may depend on it |
| `ProductionLike` | Unusually high business impact or sensitivity. Applied only on evidence, never speculatively |
| `Unknown` | Ownership cannot be proven |

**`Unknown` must never silently become `SelfCreated`.** That inversion is the most dangerous mistake
this model can make: `SelfCreated` is the most permissive class, and `Unknown` is the one reached
when nothing can be proven. An invariant test asserts that no installed policy is ever more
permissive on `Unknown` than on `SelfCreated`, for any action.

An unrecognised or absent ownership value becomes `Unknown`, and is reported.

### Environments

`Local` `Development` `QA` `Test` `Staging` `PreProduction` `Production` `Unknown`

**Identity comes from authoritative run/project configuration, never from the URL.** A
`192.168.x.x` address is evidence of a private network, which is a different claim from "safe test
environment". A policy governs exactly one named environment and **refuses to decide** for any
other — evaluating a QA request against the Staging policy would answer a question nobody asked.

**The environment is never defaulted (Phase 9.3, F-22).** A request that names no environment is evaluated as `Unknown` — never as the policy's own environment — and the environment gate refuses it. `evaluate` and `preflight` take `--environment <env>`; `summary` describes the policy's own rules and says so.

## 4. Policy shape

```jsonc
{
  "policyId": "…", "policyVersion": 1, "environment": "Staging",
  "environmentAliases": ["STG"],

  "defaults":   { "*": "Forbidden", "ProductionLike": "Forbidden" },
  "categories": { "read": { "*": "Allowed" },
                  "mutation": { "Shared": { "decision": "Approval Required",
                                            "cleanupRequired": true,
                                            "source": "run_configuration.md §…" } },
                  "financial": { "*": { "decision": "Forbidden", "absolute": true } } },
  "actions":    { "DELETE": { "Shared": { "decision": "Forbidden", "absolute": true } } },
  "modules":    { "agency": { "actions":  { "UPDATE": { "Shared": "Approval Required" } },
                              "entities": { "AGN2": { "actions": { "UPDATE": { "Shared": "Forbidden" } } } } } }
}
```

A rule is either a bare decision string or an object with `decision`, `absolute`,
`cleanupRequired`, `reason`, `source`. **Scope depth is global → module → entity; entities do not
nest.** Module permissions stay scoped: *"mutation allowed in Agency"* never means *"mutation
allowed everywhere"*.

## 5. Decision precedence

Every applicable rule gets a **risk tier** = how precisely it names the risky thing:

```text
tier = (action axis: exact action 2 · category 1 · wildcard 0) + (ownership axis: exact 1 · wildcard 0)
```

Then, in order — each step returns immediately when it fires:

1. **An absolute prohibition wins outright.** No rule at any scope overrides it.
2. **A prohibition is never overridden by a vaguer permission.** A `Forbidden` beats any rule of
   *strictly lower* tier, at any scope.
3. **The narrowest scope wins** — entity > module > global.
4. **Within a scope, the highest tier wins.**
5. **On an exact tie, the most restrictive decision wins** — `Allowed` < `Approval Required` <
   `Forbidden`. Two equally specific rules that disagree are an authoring mistake, and the safe
   reading of a mistake is the strict one.

Step 2 is what makes the following resolve to `Forbidden`:

```text
global   DELETE   + Shared  = Forbidden        tier 3   ← wins
module   mutation + any     = Allowed          tier 1
```

Step 2 is deliberately surgical. An **equally specific** module rule *can* still override a global
prohibition — that is a deliberate, targeted statement by the policy author, and it is what module
overrides are for. Making a prohibition genuinely unliftable is what `absolute` is for, and it is
spelled out in the policy rather than emerging from precedence arithmetic.

## 6. Missing policy — the fail-safe

```text
mutating action, no rule     → Forbidden
read, no rule                → Approval Required
```

`No rule found → Allowed` appears nowhere in this tool. A read escalates rather than proceeding,
because reaching that branch means the policy is incomplete, and an incomplete policy is a reason to
ask a human. A **valid** policy never reaches the fallback at all: the schema requires
`defaults["*"]`.

A **malformed** policy throws with every problem listed. It is never partially applied — a policy
the loader half-understood would answer some questions correctly and silently drop the rules it
could not parse, which is exactly how a `Forbidden` goes missing.

## 7. Run-scoped authorization

An authorization is **class-scoped** per `(environment, module, action, ownership)`, for **one run**.

```text
Allow UPDATE of Shared agency records on Staging, for run-042?
    ✓ every Shared agency UPDATE in run-042 — 12 test cases, one question
    ✗ DELETE · PAYMENT · branch UPDATE · SelfCreated widened to Shared
    ✗ run-043, even for the identical action on the identical environment
```

**No authorization ever lifts a `Forbidden`.** It only ever satisfies an `Approval Required`. One
that tries is ignored and reported, so an operator who wrote it sees why it did nothing.

Two independent mechanisms prevent cross-run leakage, and both are tested:

1. The store lives **inside the run folder**, so run B never reads run A's file.
2. Every record carries its own `runId`, re-checked on load *and* in the evaluator — so a **copied**
   file authorizes nothing either.

Nothing granted this way becomes project policy. A future run asks fresh.

**No secret is ever written.** `createAuthorization()` drops any field outside its fixed schema, so
a caller cannot smuggle a credential into an approval record even by accident.

## 8. Usage

### From a Skill

```js
const safety = require('platform_core/tools/execution_safety');

const { policy, policyHash } = safety.loadPolicy();
const { authorizations } = safety.loadAuthorizations({ runFolder });

// Whole-run, before anything starts.
const plan = safety.preflight({ policy, operations, runId: runFolder, authorizations });
fs.writeFileSync(safety.preflightPath(null, runFolder), safety.renderPreflightDoc(plan, { policyHash }));

for (const group of plan.pendingApprovals) {
  // One question per scope. The Skill may recommend; the human decides.
  console.log(safety.renderApprovalPrompt({ result: group, affectedCases: group.testCaseIds.length }));
}

// Per operation, at the point of action.
const decision = safety.evaluate({
  policy, action: 'UPDATE', ownership: 'Shared', module: 'agency',
  runId: runFolder, targetId: 'AGN2', authorizations,
});
if (decision.decision !== 'Allowed') { /* record Skipped, reason: Execution Safety Policy */ }
```

### From the command line

```bash
node platform_core/tools/execution_safety/cli.js evaluate \
     --action UPDATE --ownership Shared --module agency

node platform_core/tools/execution_safety/cli.js validate
node platform_core/tools/execution_safety/cli.js summary
node platform_core/tools/execution_safety/cli.js preflight --operations ops.json --environment <env> --run <folder> --out
```

Common flags on every subcommand: `--file <path>` for a policy other than the project's own,
`--run <folder>` so that run's scoped authorizations are consulted, and `--json`.

**Exit codes** — a caller branches on the decision without parsing prose:

```text
0  Allowed / valid       2  Approval Required
1  error                 3  Forbidden
```

Every subcommand is read-only. The one exception is `preflight --out`, which writes that run's own
preflight record and nothing else.

## 9. What this tool must never do

- execute a browser action, click anything, or touch the application under test
- make a business decision, or decide what a test case means
- infer a human authorization that was not explicitly granted
- read, hold, or emit a credential
- contain a project-specific rule

**The browser boundary.** `browser_provider` and `browser_driver` are actuators. Business
authorization is decided here and passed down; it is never decided inside the driver.

```text
Execution Skill → Execution Safety → authorized operation → Browser Provider
```

## 10. Reporting a block

A policy block is a **policy decision, not a test result**. It reuses the existing execution
taxonomy and never invents a status:

```text
Skipped   reason: Execution Safety Policy
```

It is **never** reported as `Application Failure`, `Automation Failure`, or `Environment Failure` —
none of those things happened. The blocked case still appears in every total, so a run can never
read "3 of 3 passed" while the rest of the suite was never permitted to run.

## 11. Files

```text
schema.js          the vocabulary, and the policy validator
evaluator.js       evaluate() and explain() — pure, deterministic
policyLoader.js    locating, loading, hashing the policy and a run's authorizations
authorizations.js  building, rendering, and persisting run-scoped approvals
preflight.js       the whole-run, non-mutating footprint
cli.js             read-only command line
index.js           the public surface
__tests__/         evaluator · preflight · authorizations · installedPolicy · integration · cli
```

`installedPolicy.test.js` asserts **invariants**, not expected values — it never hardcodes one
project's permissions into `platform_core/`. It checks properties that must hold for any policy:
every operation resolves to an explainable decision, high-risk actions are never `Allowed`, `Unknown`
is never more permissive than `SelfCreated`, `DELETE` is never more permissive than `UPDATE`, no
authorization lifts a `Forbidden`, no secret appears in the file, and every rule carries a `source`.
