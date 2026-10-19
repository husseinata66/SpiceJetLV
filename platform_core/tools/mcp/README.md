# MCP Tools Layer

The platform's registration point and usage contract for the **MCP servers** that Skills may drive at runtime, alongside the in-repo JS engines (`platform_paths/`, `browser_driver/`, `run_manager/`, `automation_lifecycle/`, `init/`).

Two servers are registered, for two unrelated purposes:

| Server | Purpose | Consuming stages |
|---|---|---|
| **`playwright`** (`@playwright/mcp`) | Live, agent-driven browser interaction — a **second, selectable mode** alongside the Browser Driver engine | Stage 2 (Explorer), Stage 4M (Manual Execution), Stage 5 (Automation — selector verification only) |
| **`context7`** (`@upstash/context7-mcp`) | Version-accurate, up-to-date documentation for the **application-under-test's own stack and its automation framework's dependencies**, used as an implementation guideline | Stage 4A (Automation), Stage 6 (Automation Execution — repair loop only) |

Registration lives in the repo-root [`.mcp.json`](../../../.mcp.json). This folder holds **no server code** — the servers are fetched by `npx` at launch. Like every other `platform_core/tools/` member it contains zero project-specific data: which URL is driven, which stack is looked up, and which libraries matter are all resolved from `platform_core_data/` at call time.

---

## 1. Playwright MCP — a second, selectable browser mode

### 1.1 Two modes, one responsibility split

The platform now has **two** mechanisms for live browser access. They are peers, not a replacement pair, and a run may use both for different in-scope areas.

| | **Browser Driver** (`platform_core/tools/browser_driver/`) | **Playwright MCP** (`playwright` server) |
|---|---|---|
| Shape | Scripted — a JS `BrowserDriver` session called from a script | Interactive — the Skill calls `browser_*` tools turn by turn |
| Auth | **Automatic** — loads `platform_core_data/knowledge_base/credentials/credentials.json` by itself, never echoing values | **None built in** — see §1.3; must never be handed credential values |
| Locator knowledge | Reuses `platform_core_data/knowledge_base/browser/screens/` + `components/` via `useScreen()`/`useComponent()` | Accessibility-tree snapshots; no stored locator knowledge |
| Repeatability | High — deterministic, re-runnable, diff-friendly | Lower — exploratory, sequence depends on what the agent sees |
| Best at | Authenticated flows, known screens, repeated execution of designed test cases | First-contact exploration of an unknown screen, ad-hoc selector verification, reading the accessibility tree |
| Display mode | **Headless by default** — `browser.headless: true` in `platform_core_data/knowledge_base/browser/profile.json`; **except Stage 4M (Manual Execution), which is headed** via `browser.headlessByStage` (§1.1.1) | **Headless by default** — `--headless` in the repo-root `.mcp.json` |

### 1.1.1 Headless is the default for both mechanisms — except Stage 4M

Neither mechanism opens a visible browser window unless something explicitly asks for one. Headless is the configured *mechanism* default on both paths. **It is never the answer to the Headed/Headless question** *(clarified 2026-10-08)*: before every execution or live verification session, the stage confirms the mode with the human (`pipeline.md` §6 Rule 11) and passes the confirmed value explicitly (the `headless` argument, which outranks every configured value — see the resolution order below). If the confirmed mode cannot be provided — for example, headed was chosen but the MCP server still runs with `--headless` — the stage stops and asks again; it never falls back silently.

- **Browser Driver** — `platform_core_data/knowledge_base/browser/profile.json` sets `browser.headless: true`. Since Phase 9.3 that value is no longer read: `BrowserDriver.authenticate()` refuses to launch without an explicit `headless` argument (`MODE_REQUIRED`), so the confirmed answer is the only thing that decides the mode.
- **Playwright MCP** — the server is registered in `.mcp.json` with `--headless` (the server is *headed* by default without it, so the flag is required, not cosmetic).

**The one standing exception: Stage 4M, Manual Execution, runs headed as its normal behaviour** (`.claude/skills/manual-execution-skill/SKILL.md` §11.1). That stage exists so a human can watch each authored Step execute against the live application and judge timing, transient, and visual-state behaviour in real time — observation a post-hoc screenshot does not preserve. It is expressed as configuration, not skill discipline: `browser.headlessByStage` in the profile maps `manual_execution` to `false`, and the stage selects it by passing `stage: 'manual_execution'` to `authenticate()`. **Resolution precedence: explicit `headless` argument > `headlessByStage[stage]` > `browser.headless`.** A stage not named in the map is unaffected and stays headless.

Because the Playwright MCP server's `--headless` is fixed at process start, the Stage 4M exception applies to the Browser Driver only — which is that stage's default and strongly-preferred mechanism anyway. Making the MCP fallback headed requires a human to drop the flag from `.mcp.json` and restart the server.

Outside that exception, headed mode remains a **local debugging opt-in for a human operator**: pass `BrowserDriver.authenticate({ headless: false })` for a one-off driver run, or drop `--headless` from `.mcp.json` and restart the MCP server. Because a headless run captures screenshots, DOM, accessibility tree, console, and network exactly as a headed one does, running headless costs no evidence and changes no Evidence Category or Confidence ceiling under `explorer-skill/SKILL.md` §17–§18 — what a headed Stage 4 adds is live human observation, not richer artifacts.

### 1.2 Mode Selection Rule

**The Browser Driver remains the default for any authenticated flow and for any screen that already has Screen/Component Knowledge.** Playwright MCP is selected when:

1. The screen is **unknown** — no `screens/{name}.json` exists yet, and the point of the visit is to discover its structure (Stage 2 first-contact exploration); or
2. The need is a **one-off accessibility-tree or selector check** during generation (Stage 4A §17), where authoring a script would cost more than the check is worth; or
3. The Browser Driver is **unavailable or failing** for a reason unrelated to the application (e.g. no `profile.json` yet), and discovery would otherwise fall to a lower-priority Discovery Mode.

A Skill must **never** choose Playwright MCP merely because it is more convenient than writing a driver script for a screen the driver already knows how to reach. Whichever mode is used is recorded on every discovery snapshot, Finding, and Coverage entry exactly as `explorer-skill/SKILL.md` §8.3 already requires — "Browser automation" is no longer a sufficient label by itself; the mode entry names **which** of the two.

### 1.3 Credentials — the hard boundary

The Browser Driver's credential rules (`../browser_driver/README.md` §4) are **not relaxed** by this server's existence, and one rule is new and absolute:

> **A credential value must never be typed into, passed to, or echoed by a Playwright MCP tool call.** MCP tool arguments and results are conversation-visible; `browser_type(..., text: "<password>")` writes a secret into the transcript, which is exactly what rule 7 of the Browser Driver README forbids.

Therefore, for any flow behind a login:

- **Authenticate with `BrowserDriver.authenticate()`**, which fills the login form in-process and drops the credentials from memory immediately.
- Use Playwright MCP only for **post-login, already-authenticated** exploration, or for **unauthenticated** surfaces (public pages, the login screen's own structure — never its submission with real values).
- If a Playwright MCP session would require typing a credential to proceed, that is a **stop** — switch to the Browser Driver for that step rather than typing the secret.

**Exception — Ancillaries Supplier runs only (human decision, Mohanad Dawood, 2026-10-17).** In an Ancillaries Supplier run, and only there, the `playwright-ancillaries` server may submit the Portal login form with credentials the human gives in that conversation, because the Browser Driver cannot share its session with the MCP browser. Conditions, all mandatory:

- The human supplies the values **for that run**, in that conversation; they are never remembered, never carried to another run, and never read from anywhere else.
- The values appear **only** in that one login call. They are never written to a file, a run folder, a report, a test-data file, a log, a commit, or any document, and never repeated in a reply.
- Because the transcript still contains them, the human is told to **change the password afterwards**.
- It applies to no other Feature, module, stage, or server (the default `playwright` server keeps the absolute rule above), and it never lifts a `Forbidden` in `execution_safety_policy.json`.

### 1.4 Read-mostly, never destructive

Every constraint the consuming Skill already carries applies unchanged — the Explorer's "Not permitted" list (`explorer-skill/SKILL.md` §10) and the Project Context's Environment Constraints govern MCP tool calls exactly as they govern driver calls. Specifically:

- `browser_run_code_unsafe` and `browser_evaluate` are **not** used to mutate application state, only to read it — and `browser_run_code_unsafe` requires the same explicit authorization any destructive action would.
- **One narrow exception, added 2026-08-17 (user-mandated): a transient, self-removing, view-only annotation overlay during Discovery evidence capture** (`explorer-skill/SKILL.md` §5.11.1–§5.11.2). Discovery must mark *which* element it could not understand, and drawing that rectangle means touching the rendered page. The overlay is permitted **only** while every one of these holds:

  | | |
  |---|---|
  | 1 | Changes **no application data and no application state** |
  | 2 | Triggers **no input, submission, navigation, or business behaviour** |
  | 3 | Contains **only visual annotation elements** |
  | 4 | Is **removed immediately** after the annotated screenshot is captured |
  | 5 | Is **also removed through a guaranteed cleanup path if capture fails** (`finally`) |
  | 6 | Is **never present during any later interaction or evidence capture** |

  The original screenshot is captured **before** the overlay is injected, so pristine evidence exists on disk even if annotation then fails. `platform_core/tools/browser_driver/annotate.js` enforces (2) mechanically by giving every injected node `pointer-events: none`, and (4)–(6) by scoping the whole overlay to one container id removed in a `finally` that swallows its own errors.

  **This does not widen the rule.** A view-layer overlay that submits nothing and is gone before the next action is the same class of act as scrolling or resizing the viewport, both already permitted. Anything that writes to the application — a value typed, a form submitted, a request issued — remains forbidden exactly as before.
- An unexpected dialog is reported and escalated, never blind-accepted — mirroring `takePendingDialog()`'s contract.
- Stage 4A may drive this server **only** for selector verification. Executing a generated suite through it is a specification violation of `automation-skill/SKILL.md` §17's "never for running the suite."

### 1.5 Discovery tooling is still not automation tooling

`automation-skill/SKILL.md` §6's v4 rule stands and is reinforced here: that this server exists, is registered, and was used for Discovery carries **zero weight** in the Framework Decision Gate. A project whose framework is SHAFT generates SHAFT (Java/TestNG/Allure) even though every Discovery snapshot in the run came from Playwright MCP.

---

## 2. Context7 MCP — version-accurate docs as an implementation guideline

### 2.1 The problem it solves

Automation code generated from model memory drifts from the stack it must actually run on: an API removed two minor versions ago, a config key renamed, an assertion helper that never existed in the pinned version. Stage 5 must not guess at a dependency's surface when the authoritative, version-specific documentation can be fetched.

### 2.2 What gets looked up — the project's own stack, extracted from the project

The libraries queried are **not** a fixed list and **not** inferred from what the platform itself happens to use. They are extracted, per run, from the application-under-test and its automation project:

1. **Source code** — dependency manifests and lockfiles in the resolved automation project and, where available, in the application under test: `package.json` + `package-lock.json`/`yarn.lock`/`pnpm-lock.yaml`, `pom.xml`, `build.gradle`(`.kts`), `requirements.txt`, `Pipfile.lock`, `pyproject.toml`/`poetry.lock`, `*.csproj`, `Gemfile.lock`, `go.mod`, `composer.lock`, plus framework config files (`playwright.config.*`, `testng.xml`, `cypress.config.*`, `pytest.ini`, SHAFT's `src/main/resources/properties/`).
2. **Documentation** — the project's own stated stack: `platform_core_data/knowledge_base/architecture.md` ("Technology Stack"), `automation_framework.md`, `run_configuration.md`, `onboarding.md`, and the approved Project Context's Technology Stack section.

**The lockfile wins on version.** A manifest range (`^1.61.1`) is a constraint; the lockfile's resolved version is the fact. Where both exist, the pinned lockfile version is what gets documented — querying docs for a version the suite will not run against defeats the purpose. Where only a range exists, the resolved-version field records the range and flags it as unpinned.

The shared extractor for step 1 is [`stack_docs/`](stack_docs/) — a `platform_core/tools/` engine with zero project data, which walks a given root and emits the `{ ecosystem, library, version, source, pinned }` list (`detectStack.js`), plus the planned Context7 query set (`planQueries.js`) and the project/test-directory detection that composes both (`detectProject.js`, `detectTestDirs.js`). Two separate CLIs front it: `cli.js` — the stack + query plan, with `--root`/`--json`/`--all`/`--max-libraries`/`--max-concepts` — and `detectCli.js`, the full project detection, with `--root`/`--json`/`--all`/`--max-depth`/`--plan`. `index.js` re-exports `detectStack` and `planQueries` only; `detectProject`/`detectTestDirs` are required from their own modules. Step 2 is a read of `platform_core_data/`, performed by the Skill.

### 2.3 The lookup contract

For each library in the extracted set that is **material to how automation is written** (see §2.4):

1. `resolve-library-id` with the library name **plus the concrete question** — never the name alone.
2. Select the match by the global rule already in force (`~/.claude/rules/context7.md`): exact name match, description relevance, snippet count, source reputation, benchmark score. **Prefer a version-specific library ID whenever the resolved version is pinned** — that is the entire point of extracting versions.
3. `query-docs` with the selected ID and the **full question**, scoped to one concept per call. Multiple distinct concepts (fixtures, then network mocking, then reporters) are separate calls with the same ID; a combined query dilutes ranking and returns shallow results for each.
4. Record every query and its outcome in the Stack Documentation Context artifact (§2.5).

If `resolve-library-id` returns nothing credible for a library, or the pinned version predates any documented version, that is recorded as a **documentation gap** on that library — not silently dropped, and not backfilled from model memory presented as fetched fact.

### 2.4 Scope — material dependencies only

Query the dependencies whose API surface the generated code actually touches:

- The **test framework and runner** (Playwright, SHAFT, Selenium, TestNG, JUnit, pytest, Cypress, REST Assured, Appium, …)
- **Assertion, fixture, and reporting** libraries (Allure, expect/chai, pytest plugins)
- **Direct helpers the generated code imports** (HTTP clients, data/faker libraries, Excel/CSV readers, date libraries)
- The **application's own framework** only where it changes how the suite must be written (e.g. an Angular app's zone/stability behavior affecting waits, a known selector convention)

Do **not** query transitive dependencies the generated code never imports, build-only plugins with no test-facing API, or the platform's own tooling. Breadth is not the goal — correctness against pinned versions is.

### 2.5 Output — the Stack Documentation Context artifact

Stage 4A writes one artifact per module, before code generation begins:

`platform_core_data/modules/{module}/automation/StackDocumentationContext_{Framework}.md`

It records, at minimum:

| Field | Content |
|---|---|
| Detected Stack | Ecosystem, language, build tool, test framework — with the file each was detected from |
| Dependency Table | Library · resolved version · pinned? · manifest/lockfile source · Context7 library ID used · queried? |
| Queries Performed | Library ID + the exact question asked, one row per `query-docs` call |
| Guidelines Extracted | The concrete, version-specific rules the fetched docs establish for this run's generation (e.g. "web-first assertions via `expect(locator)`; `page.waitForTimeout` is discouraged in 1.61") |
| Conflicts | Where fetched documentation contradicts an existing convention in `automation_framework.md` or the existing automation project — surfaced, never silently resolved |
| Documentation Gaps | Libraries with no credible Context7 match or no docs for the pinned version |

**This artifact is a guideline input, not an authority that overrides approved project standards.** Where fetched docs and `platform_core_data/knowledge_base/automation_framework.md` disagree (e.g. Context7 shows an idiomatic Playwright layout that contradicts the SHAFT Pages/Locators/Tests/Data layering), the **approved project framework governs** and the conflict is recorded in the Conflicts row and surfaced in the Automation Plan's Assumptions/Risks — resolved by a human, exactly as `automation_framework.md`'s Gap Resolution Rule requires. Context7 never licenses redesigning an approved framework.

### 2.6 When it runs

- **Stage 4A (Automation)** — mandatory, after the Framework Decision Gate resolves the framework (so the right stack is looked up) and before any code generation. A pinned-version stack with zero queries performed is an incomplete Automation Plan.
- **Stage 5H (Self-Healing)** — only inside the repair reasoning loop, and only when a failure's diagnosis points at a **framework/dependency API question** ("is this locator API valid in the pinned version?"). Re-queries reuse this run's artifact rather than re-fetching what it already records.
- **Never** in Stages 1–4 or 7. Requirement analysis, discovery, test design, manual execution, and reporting have no dependency-API questions to resolve; a doc lookup there is out of scope.

### 2.7 Determinism and cost

Fetched documentation is **not** part of the traceability chain (`Requirement → … → Automation Script`) — it informs *how* a script is written, never *what* is tested or *why*. It therefore never appears as justification for a coverage decision, a Finding, or a test case's existence. Cache within the run: query once per library-concept pair, reuse the artifact, and let Stage 5A's repair loop read it instead of re-fetching.

---

## 3. Setup

Both servers are launched by `npx` from [`.mcp.json`](../../../.mcp.json) — no install step is committed. Node.js and network access to the npm registry are the only prerequisites.

- **Playwright MCP** needs browsers present: `npx playwright install chromium`. `--isolated` keeps each session in a fresh profile, so no browser state leaks between runs.
- **Context7** reads an optional `CONTEXT7_API_KEY` from the environment for higher rate limits; it works unauthenticated at a lower limit. **Set it in the environment, never in `.mcp.json`** — the file is committed. It is referenced there as `${CONTEXT7_API_KEY}` and resolves to empty when unset.

Approve both servers once per machine (`claude mcp` / `/mcp` in an interactive session) — a project-scoped `.mcp.json` requires explicit user approval before its servers start, by design.

## 4. What does NOT belong here

- **Server implementations or vendored packages** — both servers are fetched at launch; this folder is registration plus contract only.
- **Project-specific URLs, selectors, credentials, or stack facts** — `platform_core_data/` owns all of those (`platform_core/README.md`, "Zero Project-Specific Data").
- **Fetched documentation content.** Doc text belongs in the module's Stack Documentation Context artifact under `platform_core_data/modules/{module}/automation/`, never cached into `platform_core/`. Promoting a durable, cross-project framework lesson learned this way goes through the normal Promotion Workflow into `platform_core/knowledge/patterns/framework_patterns/` — human-approved, never automatic.

## 5. Related

- [`../browser_driver/README.md`](../browser_driver/README.md) — the peer browser mode, its credential rules, and Screen/Component Knowledge.
- [`stack_docs/`](stack_docs/) — the stack/dependency extractor backing §2.2.
- [`../../README.md`](../../README.md) — the `platform_core/` layer contract this folder sits under.
- `.claude/skills/explorer-skill/SKILL.md` §8.1, §10 — Discovery Modes and allowed tools.
- `.claude/skills/automation-skill/SKILL.md` §6, §17, §34 — framework detection, allowed tools, and the Stack Documentation step.
- [`../../../docs/USER_GUIDE.md` §4](../../../docs/USER_GUIDE.md#4-browser-and-mcp-setup) — the operator-facing setup: approving the project-scoped `.mcp.json`, installing browsers, the optional `CONTEXT7_API_KEY`, and how the version-pinned doc lookup is used at Stage 4A.
