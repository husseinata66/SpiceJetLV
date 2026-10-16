# API Contract — drift detection & impact analysis

This tool finds API contract drift, judges how much it matters, and traces what it affects. Contract changes stay human decisions; it never edits a test case.

- **Owner:** Stage 2 (Explorer), which discovers what the system exposes.
- **Consumers:** Stage 3 (Test Design) and the execution entry gates of Stages 4M, 4A and 5A.
- **Not a Skill.** It is a capability the existing stages use. The canonical rule is [`pipeline.md`](../../../workflows_and_pipelines/pipeline/pipeline.md) §8.2.

```bash
node platform_core/tools/api_contract/cli.js <command> --scope <scope> [...] [--json] [--data-root <dir>]
```

`<scope>` is relative to the data root, and the Module Manager creates it (this tool never does). It is one of:

- `modules/<m>`
- `modules/<m>/features/<f>`
- `supplier-features/<F>`
- `supplier-features/<F>/suppliers/<S>`
- `supplier-features/<F>/shared/<SS>`

## 1. Contract sources and roles

| Source | Read as | Evidence strength |
|---|---|---|
| OpenAPI 3.0 / 3.1 (JSON or YAML) | specification | `specification`: states requirements, types, enums, status codes, auth |
| Swagger 2.0 (JSON or YAML) | specification | `specification` |
| Postman Collection v2.0 / v2.1 (with or without `info`, headers as a list or a raw string) | requests plus response examples | `example`: shows presence, never obligation |
| HAR, or `{"kind": "api-evidence", "exchanges": [...]}` | captured traffic | `observed`: what the service did, never what it must do |

Every source is read into one normalized model (`normalize.js`, model `api-contract/2`). Each endpoint is keyed `METHOD /path/{}`, and parameter names are not part of its identity.

**Named schemas stay named** (`components`; a reference is `{ "$ref": "Name" }`). Inlining every reference does not survive real specifications: Stripe's cross-linked schemas expand combinatorially. A version-1 snapshot (all inlined) still compares.

**Nothing is silently flattened:**

| Construct | How it is read |
|---|---|
| `allOf` | Merged when its members agree; a conflict keeps it as a composition |
| `oneOf` / `anyOf` | Kept as alternatives (members, discriminator) and compared member by member |
| `readOnly` / `writeOnly` | A request never carries a readOnly field; a response never carries a writeOnly one |
| OpenAPI 3.0 boolean `exclusiveMinimum` | Normalized to the 3.1 numeric bound |
| `not`, `if/then/else`, `patternProperties`, `prefixItems`, `unevaluated*`, `dependent*`, `$dynamicRef`, … | Recorded with a fingerprint: a change to one is **Unknown** |
| callbacks, links, webhooks | Recorded with a fingerprint: a change to one is **Unknown** |
| An external `$ref` (another file) | Unread: always **Unknown**, even when the reference is unchanged |
| A non-JSON body | Its structure is unreadable; only a fingerprint is kept, so unchanged stays unchanged and a change is **Unknown** |

Media types of request bodies and responses are compared too. Authentication is read as alternatives (OR) of scheme sets (AND), each with its scopes.

**Refused with a reason:**

- Postman v1 (`UNSUPPORTED_VERSION`);
- OpenAPI other than 3.x, and Swagger other than 2.0 (`UNSUPPORTED_VERSION`);
- a document with no paths and no webhooks (`EMPTY_CONTRACT`);
- anything else that is not a contract (`UNKNOWN_FORMAT`).

**Header values, credentials, cookies, query values and body values are never stored.** Only names, types and structure are kept. Short observed string values are redacted and kept, so an enum can be checked.

YAML is read by a built-in, character-level reader (`yaml.js`, no dependency, YAML 1.2 core schema). It reads:

- block and flow collections, including flow collections spanning lines;
- plain, single- and double-quoted scalars that wrap lines, with every escape;
- literal and folded block scalars with chomping and indentation indicators;
- comments.

It refuses anchors, aliases, tags, merge keys, complex keys, directives, multiple documents and tab indentation, and names the line, rather than guessing.

It is verified against real files. GitHub's 9.9 MB and Stripe's 6.6 MB YAML parse identically to the `yaml` library and to their authors' own JSON rendering. The one exception is an *example* value `0.16001e0`, which YAML 1.2 reads as a number and GitHub's YAML 1.1-based export kept as text. A mature parser was considered, but it would be a runtime dependency: the platform has none, and a parser that differed between machines would change fingerprints.

Every version has one of three roles:

| Role | How it is recorded | What it can never become |
|---|---|---|
| **approved** | Only by a named human: `import-approved` (an existing approved specification) or `accept` (a proposed version) | — |
| **proposed** | `register --role proposed` | Approved, without `accept` |
| **observed** | `register --role observed --environment mock\|real` | A contract, a proposal, or an expected result |

Captured traffic offered as a proposed or approved contract is refused (`OBSERVED_AS_CONTRACT`).

## 2. Where it is kept

```
<scope>/discovery/api_contracts/
    registry.json            versions, decisions, events. Written only by this tool, under a lock
    versions/<sha256>.json   each version's normalized model: content-addressed, never overwritten
    reports/                 ApiContractDrift_<CD-id>.md / .report.json / .html
```

Each version records:

- its source path;
- the source **SHA-256** (CRLF-normalized, as in `consumedVersions.js`);
- the **normalized SHA-256**;
- the snapshot;
- who registered it, and when;
- for observed evidence, whether it came from a mock or the real service.

A superseded version stays in the registry, and its snapshot stays on disk. Old comparisons stay reproducible (`analyze --base CV-1 --candidate CV-3`). A snapshot whose content no longer matches its fingerprint is refused (`SNAPSHOT_MISMATCH`), and nothing is substituted.

## 3. Drift detection

`analyze` compares a candidate with its base. There are four modes:

| Mode | When | What a difference means |
|---|---|---|
| `drift` | proposed vs approved, or approved vs approved | What changes for a **consumer** of the API (tests, automation, clients). Direction matters: request and response are classified differently |
| `conformance` | observed vs approved | Where behaviour **contradicts** the approved contract. A field missing from a sample proves nothing unless the contract requires it. Approved endpoints the traffic never exercised are noted, not judged |
| `supplier` | a Feature's approved contract vs one Supplier's | How that Supplier differs (`supplier-diff`) |
| `cross-source` | two approved contracts of one scope | Any difference is a **contradiction** a human resolves |

The comparison covers:

- endpoints and methods;
- request parameters (path, query, header) and bodies;
- response bodies, field by field;
- required and optional fields;
- types and nullability;
- enums and constraints (minimum/maximum, length, items, pattern, format, uniqueness, `additionalProperties`);
- status codes;
- response headers;
- authentication schemes and scopes;
- error response structures. A difference under a 4xx/5xx/default response is tagged `error-structure`.

## 4. Classification

| Classification | Meaning |
|---|---|
| **Breaking** | Something that works today stops working |
| **Potentially breaking** | It may break, depending on how a consumer uses it |
| **Non-breaking** | Additive or relaxing for consumers |
| **Unknown** | Insufficient evidence: an unresolved `$ref`, a changed oneOf/anyOf, an example that cannot show obligation, no approved contract. **Never assumed compatible** |

Each difference names the rule that produced it, so a classification is never an opinion. `cli.js rules` prints the full table, and the rules version (`api-drift-rules/2`) is part of every analysis.

**Accuracy is checked against independently justified expectations:**

- **The classification matrix** (`tests/contracts/classificationMatrix.js`, `npm run test:contracts:matrix`): 54 controlled changes to the real Swagger Petstore spec, each with its reason, across 15 areas.
- **Real version-to-version drift**, checked by hand against the raw specs: Kubernetes 1.29 → 1.30, GitHub REST, Stripe (`npm run test:contracts:external`).

**A difference inside a shared named schema is one item.** Its `endpoints` lists every endpoint it reaches, `field` is the shortest path, and `paths` gives up to 5 more. Replaying it at every path does not scale: Stripe went from 209,239 items to 1,059.

**oneOf / anyOf members are paired:**

1. by named schema or type;
2. within a shared type, identical members first;
3. then only a **mutual, unique** best match by enum values or property names;
4. a renamed schema with the identical definition is the same member.

Anything still ambiguous is `SC-VARIANTS-CHANGED` (Unknown).

The overall result is the most severe item, in the order Breaking > Unknown > Potentially breaking > Non-breaking. **Breaking and Unknown block; Potentially breaking warns.**

A sample of the rules:

| Rule | Request | Response |
|---|---|---|
| `EP-REMOVED` | Breaking | Breaking |
| `SC-FIELD-ADDED-REQUIRED` | Breaking | Non-breaking |
| `SC-FIELD-REMOVED-REQUIRED` | Potentially breaking | Breaking |
| `SC-TYPE-CHANGED` | Breaking | Breaking |
| `SC-NULLABLE-ADDED` | Non-breaking | Breaking |
| `SC-ENUM-VALUE-REMOVED` | Breaking | Potentially breaking |
| `ST-SUCCESS-REMOVED` | Breaking | Breaking |
| `AUTH-ADDED` | Breaking | Breaking |

Conformance has its own rules. Each of these is Breaking:

| Rule | What was observed |
|---|---|
| `SC-ENUM-VIOLATION` | A value outside the approved enum |
| `SC-FIELD-MISSING` | A required field absent |
| `SC-NULLABLE-ADDED` | A null where the contract says never null |
| `AUTH-REMOVED` | A call without credentials succeeded |

## 5. Impact

Impact is traced through the existing traceability graph (`run_manager/traceGraph.rootGraph`). It adds the one missing link: which test cases and assertions exercise an endpoint.

| Grade | Means |
|---|---|
| **confirmed** | A structured assertion's **Expected Source** names the endpoint (by method and path, or by operationId) **and** the changed part: the same JSON path, an ancestor or descendant of it, the changed status code, or the changed enum value |
| **potential** | Something points at the endpoint without proving the changed part is checked. Either the case's text mentions it; or an assertion cites the endpoint but names no field (flagged **ambiguous**); or the case traces to a requirement the contract declares for the endpoint (`x-requirements`); or an unstructured Expected Source mentions it (**ambiguous**). A human confirms or rules each one out |
| **missing** | No test case mentions a changed endpoint. This is a coverage gap or untraced work, never "no impact" |

Write a contract-derived assertion so impact can be **confirmed** (test-design-skill §6.1). The Expected Source grammar is `API contract <METHOD> <path> [<status>] [<$.json.path>]`, or `API contract <operationId> [<status>] [<$.json.path>]`:

```
| A1 | `ACTIVE` | API contract GET /users/{id} 200 $.status | equals | REQ-12 |
| A2 | `Dogs`   | API contract findPetsByStatus 200 $[].category.name | equals | REQ-3 |
```

**An exact JSON path is authoritative.** `$.tags[].name` is not reached by a change to `$.category.name`, even though both end in `name`. A shared leaf name proves nothing. A requirement link alone is never confirmed: the case verifies the requirement, not necessarily the changed field.

The analysis also reports:

- the automation decisions of reached cases;
- execution results produced under the earlier contract;
- the reports of those runs;
- requirements the contract declares;
- the Suppliers reached. A Feature-level contract reaches every Supplier of the Feature.

## 6. Contract coverage policy (Phase 7.1)

Whether a scope **must** have a validated contract is a named human's choice, never inferred:

```bash
node platform_core/tools/api_contract/cli.js policy --scope modules/<m> --mode required|optional --by "<name>" --reason "..."
node platform_core/tools/api_contract/cli.js policy --scope project     --mode required|optional --by "<name>" --reason "..."
```

- **Where it is kept.** A scope's choice goes in its registry, as a `policy` decision. The project's goes in `knowledge_base/api_contract_policy.json`. Both keep full history.
- **Precedence.** A scope's own choice overrides the project's. With no choice at all the scope is **optional**, which is exactly the Phase 7 behaviour.

| Under **required** | Effect |
|---|---|
| No approved contract | **Blocks** the scope's API test cases: those with an `API contract` assertion or an `API` tag. A partial scope without them, and a scope with no API work under a project-wide policy, are not blocked. A scope that opted in itself is blocked even when no API case is identified |
| Breaking/Unknown drift on an endpoint **no case traces to** | Blocks the **whole** scope. Untraced is never read as unaffected. (Under optional, a partial scope of unreached cases still passes, as in Phase 7) |
| Unresolved Breaking/Unknown drift | Blocks the cases it reaches, as before |

## 7. Decisions and governance

Every decision names a person and a reason, rests on one analysis ID (`CD-…`), and is refused when that analysis is stale (`STALE_ANALYSIS`). The ID fingerprints:

- both versions' content;
- the rules;
- every difference;
- every reached case and assertion.

| Command | Decision |
|---|---|
| `accept --candidate CV-n --analysis CD-… [--endpoints "GET /a,…"]` | The proposal becomes the approved contract, whole or **per endpoint** (partial approval). A partial acceptance creates a derived approved version; the rest of the proposal stays pending. The old approved version is **superseded, never deleted**. A Feature-level change needs `--approved-suppliers` naming every Supplier |
| `reject --candidate CV-n` | The proposal is closed |
| `review-observed --observed CV-n --decision …` | `application-defect` · `contract-outdated` · `environment-issue` · `accepted-risk` · `conforms` (refused while it contradicts). **The observation is never adopted.** `contract-outdated` means a new proposal is registered and accepted |
| `impact-decision --acceptance CDEC-n --item TC-… --decision …` | For each approved case an accepted change reaches: `no-change-needed` · `update-required` (stays blocked) · `updated` · `retire`. `updated` is refused unless the case really changed and is Approved again at Stage 3 |
| `decide-contradiction --id CX-… --decision "…"` | Says which approved source governs |

**Never done here:**

- updating an Expected Result;
- regenerating a test case;
- changing an Assertion ID or an approval;
- creating a scope.

The registry keeps every decision, including `update-required`, before the case was updated.

## 8. The stage gate

`run_manager/stageGate.checkStageEntry` calls `registry.contractGate` for Stages **4M, 4A and 5A**, the stages that consume approved test cases. These **block** the cases they reach:

- a pending proposal with Breaking or Unknown drift;
- unreviewed **real** evidence that contradicts the approved contract;
- a reached case with no resolving decision after an accepted change;
- an undecided contradiction between approved contracts.

The gate is scoped:

- **Its reach is limited.** Another module's or another Supplier's registry never blocks this scope.
- **A partial stage scope is not blocked** by a blocker that reaches none of its items (`--scope-items`).
- **No traceable case means the whole scope is blocked.** If a blocker reaches no traceable case at all, no part of the scope can be shown unaffected.
- **Mock contradictions and Potentially breaking drift only warn.**
- **A scope with no registry is untouched**, unless its policy (or the project's) is `required`.

`status --scope …` shows the same result, and exits 2 when something blocks.

## 9. Mock vs real

Observed evidence is always `mock` or `real`, never inferred.

| Real evidence must | Refused otherwise |
|---|---|
| be captured by a run and kept inside that run's folder | `EVIDENCE_OUTSIDE_RUN` |
| name the environment it was captured on, consistent with the execution safety policy and the run (`repairGovernance.verifyEnvironment`) | `ENVIRONMENT_INCONSISTENT` |
| not record state-changing calls against Production | `PRODUCTION_WRITE_EVIDENCE` |

The tool itself never calls an endpoint. Real access is the executing stage's job, under the Safety Preflight (`pipeline.md` §14).

The evidence matrix gives, per approved endpoint, the mock verdict and the real verdict separately:

- `realValidated` is true only when real traffic conforms;
- a conforming mock reads "mock only — not validated against the real service";
- a mock and a real service that differ are flagged as a **disagreement**.

## 10. Reports

`report` writes the Markdown (authoritative) and the shared HTML design (`report_builder`, `pipeline.md` §17) for one analysis. A rerun writes a `.rev-N`, never over an existing report. Sections:

1. Contract versions compared, with fingerprints
2. Drift classification
3. Impacted endpoints and fields
4. Affected test cases and assertions (confirmed or potential)
5. Mock vs real evidence
6. Missing coverage
7. Human decisions required
8. Recommended next actions

**No test result is reported.** The model has no pass/fail summary and no test cases, because nothing was executed.

`report.finalReportSection(statuses)` gives Stage 6A a `findings` section, "API contract position", which lists each scope's contract blockers and warnings.

## 11. Real-world validation

| Suite | Runs | What |
|---|---|---|
| `tests/contracts/realworld.test.js` | in `npm test`, offline | 14 committed, licensed, unmodified public fixtures (`tests/contracts/fixtures/SOURCES.json`): provenance, parser compatibility, self-comparison, Swagger 2.0 ⇄ OpenAPI 3.0 equivalence, malformed and unsupported inputs, contradictions, a real version change with impact precision, the classification matrix |
| `tests/contracts/external.js` | `npm run test:contracts:external`, needs network | GitHub REST, Stripe, Kubernetes and three credential-bearing Postman collections, fetched at pinned refs and verified by SHA-256 (`external.sources.json`). It never calls an API |

## 12. Limits

- **Impact grading depends on how assertions are written.** A case that names an endpoint only in prose is `potential`. Write the endpoint, and the JSON path, in the assertion's Expected Source.
- **Text mentions stay potential.** When a case's text mentions an endpoint, the tool cannot rule the case out mechanically.
- **Partial YAML support.** YAML outside the core subset is refused, not read. The reader is *more lenient* than strict YAML 1.2 in one place: an under-indented closing flow bracket (OAI's `api-with-examples.yaml`), whose meaning is unambiguous.
- **External `$ref`s are never followed.** They stay Unknown.
- **Some constructs are fingerprinted, not compared.** `not`, `if/then/else`, callbacks, links and webhooks are compared only by fingerprint.
- **Ambiguous compositions stay Unknown.** Composition members that cannot be paired with certainty are Unknown.
- **API cases under the required policy** are recognised by an `API contract` assertion or an `API` tag only.
- **Observed values are checked only for enums, length and pattern.** No other observed value is checked against constraints.
- **Automation code is not scanned.** Automation impact comes from the reached cases' Automation Decisions.
