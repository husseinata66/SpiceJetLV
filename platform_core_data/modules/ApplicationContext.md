# Application Context — NDC Admin Portal

| Field | Value |
|---|---|
| Scope | **The whole application**, as the relationships *between* modules. Not a summary of them |
| Created | 2026-08-18, by operator directive during run-004 |
| Revision | 4 |
| Status | **`Pending Review`** — run-006 Stage 4M appended §3.1 (2026-09-25). Not final until a human approves it |
| What the run-006 refresh changed | **Header only.** §1's module map is unchanged: `agency` and `branch` stay Active with the same stages on disk, and run-006 proposes no module. §2 is unchanged: run-006's Agency↔Branch Auto Reissue relationship (checkbox independent, reissue credentials bounded by the Branch — `agency` `PO-16`) is **asserted at intake, not yet proven**, so it is not promoted into the graph. It is recorded in both modules' §3.1 until a run observes it. §6 is unchanged, by reference |
| Lifecycle | Refreshed to `Draft` by **Stage 1** at run start · appended to by any stage that **proves** a cross-module fact · presented for approval by the branch's **terminal stage** (`6A` Reporting, or `4M` Manual Execution) · **final only once a human approves it** — see `module_architecture.md` §6.7.1 |
| Modules approved so far | `branch` (Active) · `agency` (Active) · `import-booked-pnr` (Active, with Feature `new-layer-contract`) — 16 more `Proposed` |
| Target Environment | `http://192.168.1.70` (Admin, STG) · `http://192.168.1.92:9500` (NDC Portal — no credentials configured) |
| PRD source | `platform_core_data/knowledge_base/PRD.md` — §11 (E2E), §7 (module areas), §6 (cross-cutting) |
| Anticipated by | `agency` Project Context `PO-11`, which deferred reflection coverage *"until an application-level Project Context exists"*. This is that document |

---

## 0. What this file is, and the one rule that keeps it honest

The pipeline has **no project-wide Project Context**, deliberately: a document that summarised the
per-module contexts would start disagreeing with them at the first edit, and nothing would then say
which is authoritative (`project-context-skill` §5). That objection is correct and this file does not
reopen it.

**This file holds only what no single module can hold.** A module's scope, its acceptance criteria,
its assumptions and its findings live in its own `context/ProjectContext.md` and are **linked here,
never copied**.

> **The rule:** if a statement belongs to one module, it belongs in that module's context.
> This file may only say things that are **about two or more modules at once**.

So: the dependency graph, the cross-module business rules, the end-to-end journeys, the fixture build
order, and the application-wide posture. Nothing else.

**How to tell this file has gone wrong:** if a paragraph here could be moved into a single module's
context without losing meaning, it was never application-level, and it is duplication waiting to drift.

---

## 1. Module map

Sixteen of nineteen modules are `Proposed` — named in the registry from the PRD, with no folder and no
work done. That is a statement of what exists, not a backlog commitment. `import-booked-pnr` is not
PRD-derived: it is an **existing application capability** the PRD's 2026-07-25 automation-derived
reconstruction does not cover, registered on 2026-09-01 during a New User Story intake (see its own
Project Context for why).

| Module | Status | Stages on disk | Role in the application |
|---|---|---|---|
| `branch` | **Active** | context · discovery · test_design · automation · healing | Organisation layer under Company. Owns supplier routing and the configuration Agencies inherit |
| `agency` | **Active** | context · discovery · test_design | Organisation layer under Branch. The unit that books |
| `import-booked-pnr` | **Active** | features/`new-layer-contract`/context · test_design | **Existing** capability: importing an offline-booked, ticketed PNR into NDC as a manual booking — applies the Rule Engine at the original ticketing time and deducts the organization wallet. Distinct from `import-pnr` (below), which imports an *un-ticketed* PNR for online payment. Its Feature `new-layer-contract` covers the **new** `NDC_Core_service` integration path replacing NDC-INT for booking retrieval |
| `authentication` | Proposed | — | Admin and Portal login, OTP, lockout. Upstream of everything |
| `company` | Proposed | — | Departments, Top-Up Requests |
| `role-management` | Proposed | — | Roles and permission sets. **Owns the maker–checker authorization question every module defers to it** |
| `staff` | Proposed | — | Admin users; carries a Branch reference |
| `master-geography` | Proposed | — | Country / State / City / Operating Country cascades |
| `master-supplier` | Proposed | — | Suppliers, Supplier Credentials (PCCs), credential fields |
| `master-flight` | Proposed | — | Airlines, Airports, Deal Codes, BSP |
| `payment-gateway` | Proposed | — | Payment Methods — the source of every Payment Option list |
| `rule-engine` | Proposed | — | Markup, discount, service charge, scoped Country → Branch → Agency |
| `search-and-booking` | Proposed | — | Flight search, booking, quotes |
| `import-pnr` | Proposed | — | External PNR retrieval and ticketing |
| `travellers` | Proposed | — | Traveller profiles |
| `agency-user-administration` | Proposed | — | Agency users and owner activation |
| `admin-settings` · `reports` · `dashboard` · `portal-self-service` | Proposed | — | Settings, reporting, dashboards, the agency-facing Portal |

---

## 2. The dependency graph

**Read an arrow as "the target cannot be exercised correctly until the source is configured."** This is
the section that decides seeding order, regression blast radius, and what a failure actually means.

```
authentication ──────────────► everything (a session is a precondition, never a test target elsewhere)

master-geography ────────────► branch ────────────► agency
                                  │                    │
master-supplier ─────────────────►│                    │   supplier + credential cascade (BR-002, BR-006)
  (Supplier, Supplier Credential) │                    │
                                  ▼                    ▼
payment-gateway ─────────────► Payment Option lists on both (APP-002)

role-management ─────────────► the authorization half of every maker–checker workflow
                               (branch and agency both defer to it — neither tests it)

branch / agency ─────────────► rule-engine · reports · import-pnr · search-and-booking
                               (downstream consumers: they read organisation config, never define it)

agency ──────────────────────► agency-user-administration ────► portal-self-service
```

### 2.1 Inheritance, stated once for the whole application

The organisation hierarchy is **Company → Branch → Agency → Agent**, and configuration flows **down it
only**. Three consequences hold application-wide:

1. **A child can narrow what it inherits; it can never add to it.** An Agency ticks and unticks the
   suppliers its Branch carries and cannot introduce a new one (`BR-006`).
2. **A missing parent configuration is invisible at the child, not an error.** An Agency under a
   supplier-less Branch simply has no PCC section — no message, no empty state. A test that does not
   assert the parent's configuration first will report a **false absence** (`BR-008`, `agency`
   FINDING-008, and the original run-001 FINDING-002 which this explains).
3. **Master data is displayed read-only downstream.** `Manager Name` is authored in the Supplier
   master and is read-only on both Branch and Agency (`BR-007`). The same shape governs Payment
   Options, geography cascades, and credential fields.

**The general rule this yields, and it is the most reusable sentence in this document:**

> Before asserting that a field or a section is absent at one level, assert that the level above it is
> configured. Absence downstream is usually a statement about upstream.

---

## 3. Cross-module business rules

The rules that no single module owns, indexed in `../knowledge/INDEX.md` and cited by ID from module
artifacts. **Full text lives in the index; this table is the map of which modules each one binds.**

| ID | Rule, in one line | Binds |
|---|---|---|
| `BR-002` | Branch Supplier Routing scopes flight-search results and is inherited by child Agencies | branch · agency · search-and-booking |
| `BR-003` | Credential selection differs by supplier type — LCC inline, GDS in a separate section | branch · master-supplier |
| `BR-004` | GDS returns many airlines; LCC returns mostly itself, multi-carrier still possible | search-and-booking · master-supplier |
| `BR-005` | Phone fields expect the national number only — no literal `+` prefix, despite the ACs | branch · agency · travellers |
| `BR-006` | Agency supplier access is inherited from the parent Branch — check/uncheck only, never add | **branch · agency** |
| `BR-007` | `Manager Name` is authored in the Supplier master, read-only everywhere downstream | master-supplier · branch · agency |
| `BR-008` | The PCC section renders one tab per inherited supplier, three controls each | branch · agency · master-supplier |
| `APP-001` | Operating Country = Country × Currency, a distinct entity from Country | master-geography · branch |
| `APP-002` | Payment Option lists are sourced from Payment Gateway → Payment Method | payment-gateway · branch · agency |
| `BR-001` | Contact person strips Arabic script by design, preserves Latin/CJK | branch · agency |

**Cross-cutting requirement families** — PRD §6, applying to every governed record in the application,
and therefore never re-derived per module: `XC-01`–`XC-07` the maker–checker workflow ·
`XC-08`–`XC-16` search, filter, paginate, export · `XC-17`–`XC-23` the literal validation-message
vocabulary (`Required`, `Please enter a valid email`, and the rest).

### 3.1 Proven by run-006 (2026-09-25, Stage 4M) — pending approval

Facts observed live on `http://192.168.1.60`, each with its evidence in `runs/run-006…/manual_execution/`. No new rule ID is minted here; `knowledge/INDEX.md` is unchanged until approval.

| Fact | Binds | Evidence |
|---|---|---|
| **A supplier added to a Branch is added to its existing Agencies automatically** — ticked, with the Branch's PCC credential — with no edit on the Agency. Strengthens `BR-006` from "may be inherited" to "is propagated" | branch · agency | `artifacts/setup-BRN265-after-NDCsbr.json`, TC-BR-109 correction note (15:10–15:11 UTC) |
| **The Agency's Auto Reissue picker offers only the Agency's own PCC credentials** (a subset of its Branch's); the Branch may hold more (`PO-27`) | branch · agency | TC-AGENCY-074, TC-AGENCY-091, TC-BR-109 |
| **Auto Reissue flags are independent per organisation, and the Itinerary `Reissue` button follows the organisation that owns the booking** — Agency, Branch and on-behalf (Agency) bookings, on Admin and the Portal | branch · agency · booking (Itinerary) · portal | TC-AGENCY-076 … 083, TC-BR-100 … 104 |
| **An inactive Supplier does not remove its credential from Auto Reissue selections** — the credential stays saved and offered on Branch and Agency (decision pending) | master-supplier · branch · agency | TC-AGENCY-093, TC-BR-111 |
| **Supplier "Deactivate" acts on one click with no confirmation**, for every organisation using the supplier | master-supplier · all orgs | `artifacts/incident-NDCsbr-accidental-deactivation.json` |

**Diff since the last approved revision (3):** the header status and this §3.1. §1, §2, §4–§10 are unchanged.

---

## 4. End-to-end journeys

PRD §11 defines eight. Each spans modules, so **no module can own one** — which is exactly why they
need this document. Coverage status is stated plainly, including where it is zero.

| ID | Journey | Modules it crosses | Coverage today |
|---|---|---|---|
| `E2E-01` | Commercial rule → live price | rule-engine → search-and-booking | **None** — needs flight search |
| `E2E-02` | Role → user → enforced access | role-management → staff → authentication | **None** — role-management not started |
| `E2E-03` | **Credential cascade:** supplier credential → Branch → Agency → edit → reflect | master-supplier → **branch → agency** | **Partial, and newly evidenced.** run-004 observed the Branch → Agency half directly on 2026-08-18 (`BR-006`, `BR-008`). The supplier-master → Branch half is not yet exercised |
| `E2E-04` | Agency onboarding → Portal access | **agency** → agency-user-administration → portal-self-service | **First hop only.** Portal has no configured credentials |
| `E2E-05` | Wallet funding: Portal top-up → Admin approval | portal-self-service → company | **None** — financial actions are `Forbidden (absolute)` |
| `E2E-06` | Quote to booking | search-and-booking | **None** — booking is `Forbidden (absolute)` |
| `E2E-07` | Import external PNR to ticket | import-pnr → search-and-booking | **None** — ticketing is `Forbidden (absolute)` |
| `E2E-08` | Portal agent → own markup | portal-self-service → rule-engine | **None** |

**Four of the eight are blocked by safety policy, not by effort** (`E2E-05` … `E2E-08` all require
booking, ticketing or financial operations, which are `Forbidden (absolute)` on this environment and
which no grant can lift). That is a **standing environmental limit**, and it should be read as such
rather than re-discovered by each module in turn.

**How an E2E journey will actually execute.** Not by chaining module suites: `activeScope:
full-project` runs the **assembled baseline** as one system (`module_architecture.md` §9.1), which is
the only mechanism in this platform that exercises cross-module interaction. A module reaching
`Approved` is what makes it eligible for assembly. Full-project scope is **never derived** from a
selection covering every module — it is set by explicit human intent (`cli.js use --all`).

---

## 5. Fixture build order

The order in which records must exist for a scenario to be exercisable at all. **Derived from §2, and
the practical reason this document was worth writing.**

```
1. authentication      a session                       (precondition, never a fixture)
2. master-geography    Country / State / City          reference data — read, never created by a run
3. master-supplier     Supplier + Supplier Credential  reference data — read, never created by a run
4. payment-gateway     Payment Methods                 reference data — read, never created by a run
5. branch              a Branch, WITH a supplier and its credential selected   ← run-created (agency PO-14)
6. agency              Agencies under that Branch                              ← run-created
7. agency-user-admin   the agency owner, activated
8. portal-self-service the owner's Portal session
```

**Step 5 carries the lesson of run-004.** An Agency seeded under a Branch with no supplier makes AC-9
of US-4222 untestable, and the failure presents as "the section does not exist" rather than as "the
fixture is wrong". `agency` `PO-14` grants the run the right to build its own Branch — `SelfCreated`
only — precisely so this step is under the suite's control instead of borrowed.

**Steps 2–4 are read-only for every run.** Reference data is consumed to populate dropdowns and is
never created or edited by the platform.

---

## 6. Application-wide posture

Stated once here **by reference**, because these are properties of the environment and the account,
not of any module. The authoritative copies are cited; nothing is restated in a way that could drift.

| Concern | Where it is authoritative | The short version |
|---|---|---|
| Execution safety | `knowledge_base/execution_safety_policy.json` | Read is unrestricted. Mutation needs a run-scoped grant. **Approve / Reject on a record the run did not create is `Forbidden (absolute)`** — no grant lifts it. Booking, financial and privileged operations likewise |
| Run-scoped grants | `runs/{run}/metadata/SafetyAuthorizations.json` | Per run, never carried forward. A future run asks fresh |
| Actors | each module's Project Context §4 | One account, `odeysysadmin`, standing in as Admin and Super Admin. **The application therefore cannot demonstrate maker–checker separation**, and every module defers that to `role-management` |
| Environment | `knowledge_base/run_configuration.md` | Shared staging on a LAN address. Other testers hold live data on it; no record is a stable fixture unless this platform created it |
| Retention | `agency` `PO-3` | `DELETE` is not authorized in any form. Seeded records persist and accumulate; reuse is preferred to re-seeding |
| Display mode | user standing instruction | Headed vs Headless is asked immediately before **every** execution. Never inferred, never carried over |

---

## 7. What this file must never contain

Written as a rule rather than a hope, because the failure mode is gradual.

| Never | Because |
|---|---|
| A module's scope, ACs, or in/out-of-scope lists | That is the module's context. Copying it creates two answers to one question |
| A module's findings, or their dispositions | They live in `modules/{m}/discovery/findings/` and change without notice |
| Test cases, expected results, or selectors | Stages 3 and 4A own those, and selectors are verified live at generation |
| A metric, count, or percentage | Derived values drift the moment their source moves. Link to the source instead |
| A cross-module rule's full text | It lives in `knowledge/INDEX.md` with an ID. Here, only which modules it binds |

---

## 8. How this file is kept current

It is **not** regenerated, and it is not maintained on a schedule. It is edited when one of five things
happens, and each has an obvious trigger:

| Trigger | Edit |
|---|---|
| A module moves `Proposed` → `Active` | §1 module map |
| A new cross-module rule is recorded in `knowledge/INDEX.md` | §3, one row: the ID and which modules it binds |
| Discovery or execution proves a dependency that was assumed | §2 graph, and §5 if the build order changes |
| An E2E journey gains or loses coverage | §4, with the honest status |
| A safety or environment posture changes | §6, by reference |

**A module's own revision never obliges an edit here.** If `agency`'s context gains a new assumption,
this file is untouched — that assumption is `agency`'s. Only a change in the *relationship* between
modules reaches this document. That asymmetry is what stops it becoming a second copy of everything.

---

## 9. Status of this document, stated plainly

**Revision 1 is honest about being early.** Two modules of eighteen are active, so §2's graph is
richest where work has happened (`branch` → `agency`) and thin elsewhere — the arrows involving
`rule-engine` or `reports` are read from the PRD, **not observed**. They are stated as dependencies the
PRD asserts, and should be treated as unverified until a run exercises them.

**The specification gap is closed.** When this file was written on 2026-08-18 it was an artifact no
stage was instructed to read. That has been fixed in the same session:

| Document | What it now says |
|---|---|
| `module_architecture.md` §6.7 | Defines this file, its governing rule, its lifecycle and its six rules |
| `project-context-skill` §5, §3.3 | Amends the "no project-wide context" sentence, and makes **Stage 1 refresh this file at run start** |
| `test-design-skill` §4, `automation-skill` §4 | Read it — for the fixture build order and upstream dependencies. Explicitly **not** a licence to widen scope |
| `reporting-skill` §4.1, `manual-execution-skill` §4.1 | The branch's terminal stage appends what the run proved, presents the diff, and sets `Pending Review` |

## 10. Lifecycle

| Moment | Status | Who acts |
|---|---|---|
| A run is created | `Draft — refreshed for {run}` | **Stage 1** refreshes §1, §2 and §6 against reality and records what changed |
| Stages 2 … 5 | `Draft` | Any stage that **proves** a cross-module dependency, adds a cross-module rule, or moves an E2E journey's coverage appends to it |
| After the terminal stage — `6A` or `4M` | `Pending Review` | That stage presents the diff of what this run changed |
| A human approves | `Approved — {run}` | Final for that cycle. The next run reopens it as `Draft` |

**Why approval sits at the end.** What a run learns about the relationships *between* modules is mostly
discovered while it executes — run-004's Branch → Agency cascade was proven at Stage 2 and again after a
live Branch change, not written at Stage 1. Approving this file before the run has run would approve
last week's understanding of the application.

**No stage ever marks it `Approved`**, and a run that taught the map nothing says so and leaves it alone
— an edit invented to look productive is worse than no edit, because the next reader cannot tell which
lines were learned and which were filler.

**Cycle history:** `run-004` recorded three cross-module facts (`BR-006`, `BR-007`, `BR-008`) and moved
`E2E-03` from no coverage to partial before this refresh.

**Current cycle:** `Draft`, refreshed for `run-005` — §1's module map updated to add `import-booked-pnr`
(registered via intake, not PRD-derived; an existing capability the PRD does not cover). No
cross-module dependency has been *proven* yet in this cycle; §2's graph is unchanged.

**One dependency asserted but not yet proven, recorded here because it spans modules.** The
`import-booked-pnr` capability depends on an integration layer for supplier/GDS booking retrieval, and
that dependency is being changed: **NDC Integration (NDC-INT) → `NDC_Core_service`**. The historical
flow also touches `rule-engine` (rules applied at the original offline ticketing time, not import
time) and organization wallet handling. None of this has been observed by a run — it comes from
historical documentation supplied 2026-09-01 and is stated as asserted, not verified. It becomes
`Pending Review` when run-005 reaches its branch's terminal stage.
