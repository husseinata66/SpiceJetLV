# `test_suite_export/` — Stage 3 Manual Test Suite → Excel

## Purpose

Renders each authored `TestCases_{Module}.md` in a module's `test_design/` folder into the matching
`TestCases_{Module}.xlsx`, so Stage 3 delivers both outputs
[`test-design-skill/SKILL.md`](../../../.claude/skills/test-design-skill/SKILL.md) §9 requires
(Outputs #1 Markdown and #2 Excel).

## The one rule this tool exists to enforce

§9: the Markdown and Excel suites are **"two renderings of one test case set — they must never
diverge in content."**

The only way to *guarantee* that is to derive one from the other. So:

- **The Markdown suite is the authored artifact.** The skill writes it, a reviewer reads it, git
  diffs it.
- **The workbook is generated output.** This tool parses the Markdown and writes the `.xlsx`.

Authoring both by hand makes non-divergence a matter of discipline rather than construction — and
when they do drift, Stage 4M silently executes against whichever one the tester happened to open.
Nothing downstream can detect that. Deriving the workbook makes the failure mode unreachable.

Re-run the tool after *any* edit to a suite document; the workbook is never hand-edited.

## Usage

```bash
# the normal call — export every suite in the ACTIVE MODULE's test_design/ folder
node platform_core/tools/test_suite_export/cli.js

node .../cli.js --module <slug>         # a specific module instead of the active one(s)
node .../cli.js --run <run-folder>      # a HISTORIC run folder (pre-2026-07-29 layout only)
node .../cli.js --dir <path>            # any folder holding TestCases_*.md
node .../cli.js --file <path/to/TestCases_Search.md>    # a single suite
node .../cli.js --file ... --sheet-name Navigation_NFR_BR
node .../cli.js --check                 # parse + report, write nothing (review/CI gate)
node .../cli.js --json                  # machine-readable result
```

| Exit code | Meaning |
|---|---|
| `0` | Exported; every case parsed cleanly |
| `1` | Error — no active module, unreadable path, or no suite documents found |
| `2` | Parsed **with warnings** (e.g. a case missing Expected Result), or `--check` found a problem |

Exit `2` is deliberate: a workflow step can gate on "did every case parse cleanly?" instead of
shipping a workbook with blank cells nobody notices until Stage 4M tries to execute it.

### What the default resolves to, and why it is the module

**The default target is the active MODULE, not the active run** (corrected 2026-08-01, platform
defect DREC-T04). The 2026-07-29 module-workspace migration moved Stage 3's output from
`runs/{run}/test_design/` to `modules/{module}/test_design/`, and this tool's default was left
behind — so the documented no-argument call could not find any module suite, and every export needed
an explicit `--dir`.

The migration is also *why* the module is the right default rather than a mechanical find-and-replace
of one path for another: the suite is **durable and owned by its module**, refined in place across
runs, while a run only records which revision of it was executed
([`module_architecture.md`](../../../workflows_and_pipelines/pipeline/module_architecture.md) §10.5).
Resolution follows what the artifact *is*.

Precedence, highest first:

| | Resolves to | Missing suite is |
|---|---|---|
| `--dir <path>` | that literal folder | an error |
| `--run <run-folder>` | `runs/{run}/test_design/` — **historic layout only** | an error, naming the module path instead |
| `--module <slug>` | `modules/{slug}/test_design/` (slug, display name, or unambiguous prefix) | an error |
| *(default)* | `modules/{slug}/test_design/` for **every** active module | **skipped**, per module |

**Neither pointer is ever guessed.** Modules come from the Active Module pointer via
[`module_manager`](../module_manager/) (`module_architecture.md` §6.5 #1), runs from the Active Run
pointer via [`run_manager`](../run_manager/). With nothing active, the tool reports how to set it
rather than falling back to "the only module" or "the newest" — the fallback that scatters one
module's artifacts across unrelated folders.

**A multi-module selection exports one workbook per module, never a merged one**, and a module that
has not reached Stage 3 yet is *skipped and reported* rather than aborting its siblings' export. That
is the one case where a folder holding no suite isn't an error: under a `multi` or `full-project`
pointer (`module_architecture.md` §9.1) it is an expected state. When the human named exactly one
target, it is an error, because they named something that isn't there.

## `--import-lifecycle` — the one inverse operation

```bash
node platform_core/tools/test_suite_export/cli.js --import-lifecycle          # apply
node platform_core/tools/test_suite_export/cli.js --import-lifecycle --check   # preview only
```

Pulls the reviewer's **`Review`** and **`Automation`** decisions out of the workbook and writes them
into the Markdown suite. `--module` / `--dir` / `--file` mean the same thing here as for an export.

**Why an inverse exists at all, given the rule above.** Every column obeys "the workbook is derived"
— *except* the two that do not describe the test case. `Review` and `Automation` record a **human
decision taken after generation** (`test-design-skill` §6.3), and the human takes it in the
spreadsheet, because that is where reviewing a 52-row suite actually happens. Without an import there
were only two outcomes, both bad:

1. The reviewer edits the workbook, and the next export **silently discards** the decisions — exactly
   the failure this tool exists to prevent, now aimed at the reviewer instead of the author.
2. The reviewer is told to hand-edit 52 Markdown blocks instead — so the review either does not
   happen, or happens in a file nothing reads.

So the direction of derivation is preserved and made explicit:

```
content    Markdown ──► Excel      (export — every column)
decisions  Markdown ◄── Excel      (import — Review and Automation only)
```

**The import is narrow on purpose.** A `Title`, `Steps`, or `Expected Result` edited in the workbook
is **not** imported and is still discarded on the next export. Those are derived content, and editing
them there is the mistake §9.1 prevents; a lifecycle decision is not.

**The workflow.** Export → review in Excel → `--import-lifecycle` → re-export. The last step matters:
until it runs, the workbook and the Markdown disagree, and Stage `4M` halts rather than guess which
one the reviewer meant (`manual-execution-skill` §4.1, §18).

Guarantees worth knowing: an unrecognised value (`Review: Maybe`) **warns and changes nothing**
rather than being coerced; casing is normalised (`approved` → `Approved`); a workbook row with no
matching Markdown case warns rather than inventing a test case; a workbook **older** than its
Markdown is flagged, since the review may have been made against superseded case text; and the rest
of the document is preserved line-for-line, so the diff shows only the decisions that moved.

## `--sync-index` — the Case Index is derived too

```bash
node platform_core/tools/test_suite_export/cli.js --sync-index          # apply
node platform_core/tools/test_suite_export/cli.js --sync-index --check   # preview only
```

A suite document opens with a **Case Index** repeating each case's Title, Tier, Priority, Tags,
Review, and Automation — a *second* record of facts the case bodies already state. Second records
drift, and this one drifted within minutes of the lifecycle columns existing: a reviewer's decisions
and a rewritten title landed in the bodies while the index still showed the superseded values, so the
document disagreed with itself about which cases were approved.

Same argument as §9.1, one level down: **the case body is authoritative, the index is rendered from
it.** Also recomputed, for the same reason a hand-maintained count is eventually a wrong count: the
header's `Total Test Cases`, the `Tier breakdown`, and the `Lifecycle breakdown` roll-up.

`Tier` is derived from Tags (the Granularity Tier, §6.0.1), checked most-specific first. Zeros are
shown in the roll-up rather than omitted — `0 Rejected` states that nothing was rejected, while an
absent entry reads as "not tracked", and at a review gate that difference matters.

**It runs automatically after `--import-lifecycle`**, since an import that left the index stale would
recreate the exact contradiction it exists to remove. Two things it deliberately does *not* do: an
index row whose case body no longer exists is **warned about, not deleted** (deleting it could
silently drop a case someone meant to restore), and a pipe inside a title is escaped rather than
allowed to break the table.

## Programmatic use

```js
const { exportSuiteDir, parseTestCases, buildWorkbook } = require('./platform_core/tools/test_suite_export');

const { results, warnings } = exportSuiteDir('platform_core_data/modules/<slug>/test_design');
```

`exportSuite` / `exportSuiteDir` are the primary surface. `parseTestCases`, `toRows`, and
`buildWorkbook` are exported for a caller assembling a workbook from records it already holds.

## Workbook structure

One sheet per module workbook, tab named for the module (`--sheet-name` overrides it — the reference
run's `TestCases_Navigation.md` groups NAV + NFR + BR and uses the tab `Navigation_NFR_BR`). Header
row frozen and bold; all columns text-typed and wrapped.

The columns are exactly `SKILL.md` §6.1's field list, in §6.1's order ("exactly these fields, in this
order — no more"):

| # | Column | Width |
|---|---|---|
| A | Test Case ID | 14 |
| B | Title | 40 |
| C | Objective | 45 |
| D | Preconditions | 30 |
| E | Test Data | 30 |
| F | Steps | 60 |
| G | Expected Result | 50 |
| H | Priority | 8 |
| I | Tags | 25 |
| J | Notes | 35 |
| K | **Review** | 12 |
| L | **Automation** | 12 |
| M | Requires | 22 |
| N | Supplier Rule | 20 |
| O | **Assertions** | 60 |

Column O (added 2026-10-09, Phase 5.8) carries the case's `**Assertions:**` table as written — its
structured assertions (test-design-skill §6.1a). Appended last, so no existing column moves; the lifecycle
import below reads only K and L, and is unaffected.

`FIELDS` in [`parseTestCases.js`](parseTestCases.js) is the single ordering authority for both the
columns and the per-case field extraction, so the two cannot fall out of step. Traceability, Risk,
and the Requirement/Discovery/Finding/Evidence references are deliberately **absent** — §6.2 puts
them in `TraceabilityMatrix.md`, keyed by Test Case ID, not on the execution-facing document.

### The Shared Definitions sheet

A suite with a `## Shared Definitions` section (test-design-skill §6.1b) gets a **second sheet**,
`Shared Definitions`, after the cases sheet: `ID · Type · Title · Source · Definition · Used By`. Sheet 1
is unchanged and is still the only sheet `--import-lifecycle` reads. A suite without the section
exports a byte-identical single-sheet workbook, as before.

Parsing lives in [`sharedDefinitions.js`](sharedDefinitions.js). A case citing `SETUP-n` / `VR-n` gets
the cited text attached as `sharedDefinitions` on its parsed record (not a column), so it is part of
the case's fingerprint: editing a rule re-opens review for exactly the cases that cite it. Warnings: a
cited ID or sub-check that is not defined, a definition no case uses, a rule with no `**Source:**` (or
one naming an observation), a duplicate ID, and a non-definition heading inside the section.

### The lifecycle columns — K and L

Added **2026-08-01**, user-mandated, and **purely additive**: columns A–J are unchanged in content,
name, and order. K and L sit last because they record decisions made *after* the case is written.

| Column | Records | Allowed values | Default |
|---|---|---|---|
| **Review** | The human review status of the case after Stage 3 | `Pending` · `Approved` · `Rejected` | `Pending` |
| **Automation** | Whether the approved case should be automated | `Pending` · `Approved` · `Rejected` | `Pending` |

How this tool treats them (`test-design-skill` §6.3 is the governing spec):

- **An omitted field exports as `Pending`, silently.** "No decision yet" is precisely what an absent
  value already says, so warning on it would fire against every suite written before this contract
  existed while telling a reader nothing. This is why neither column is in `REQUIRED_FIELDS`: a case
  with no review decision is *unreviewed*, not *unexecutable*.
- **An unrecognised value warns and exports as written.** `**Review:** Maybe` is someone recording a
  decision the lifecycle does not define; silently rewriting it to `Pending` would erase their
  intent, and dropping it would hide the error.
- **Casing is normalised** — `approved` and `Approved` are the same decision.
- **A contradictory *pair* warns, and neither value is touched** *(added 2026-08-07)*. See below.

This tool only reads and renders these values. **It never sets or advances them**, and neither does
any skill: only a human reviewer may move `Review` off `Pending` (§6.3.1). Stage `4A` consumes a case
only when `Review = Approved AND Automation = Approved`.

#### The two decisions are independent, and eligibility is derived

`Review` answers *"has this test case been reviewed and accepted?"*. `Automation` answers *"should
this accepted case be automated?"*. They are never merged into one status, and **no third field
stores the consequence** — it is computed, every time, from the pair:

| `Review` | `Automation` | Stage `4M` manual | Stage `4A` automation |
|---|---|---|---|
| `Pending` | `Pending` | ✗ | ✗ |
| `Pending` | `Approved` | ✗ | ✗ **inconsistent** |
| `Pending` | `Rejected` | ✗ | ✗ |
| `Approved` | `Pending` | ✓ | ✗ |
| `Approved` | `Approved` | ✓ | ✓ |
| `Approved` | `Rejected` | ✓ | ✗ *(manual by decision)* |
| `Rejected` | `Pending` | ✗ | ✗ |
| `Rejected` | `Approved` | ✗ | ✗ **inconsistent** |
| `Rejected` | `Rejected` | ✗ | ✗ |

Three exported helpers implement exactly this, so no consumer re-derives the rule:

```js
const { isManualEligible, isAutomationEligible, lifecycleInconsistency } =
  require('./platform_core/tools/test_suite_export/parseTestCases');
```

Note the two rows that matter most: `Approved` / `Rejected` is a **legitimate, common state** — an
accepted case that stays manual on purpose, never an automation coverage gap — and `Automation`
never affects manual eligibility in any row.

#### Inconsistent pairs

`Automation = Approved` with `Review ≠ Approved` is contradictory: one human said "automate this",
another said the case is not accepted. Both paths report it and **neither reconciles it**:

- `parseTestCases` emits an `INCONSISTENT lifecycle` warning, so `--check` exits `2`.
- `--import-lifecycle` emits the same warning on the *resulting* pair — including when the
  contradiction is formed by combining a workbook value with one already in the Markdown.

The reviewer's values are written exactly as recorded. Auto-resetting `Automation` would destroy one
reviewer's intent; auto-promoting `Review` would manufacture an approval nobody gave. The gate above
already keeps the case out of Stage `4A` on its own, so reporting is sufficient — resolving it is a
Human Decision (`test-design-skill` §6.3.4).

**Steps** are joined into one cell with ` | ` and **renumbered canonically** (`1. … | 2. …`). The
numbering is not decoration: Stage 4M records a result per step and a defect cites "failed at step 3",
so a joined cell that dropped its numbers makes that citation unresolvable. Renumbering also
normalizes a suite authored as an all-`1.` Markdown list.

Every other field keeps its line breaks, so a Test Data `| Field | Value |` table stays legible
rather than being collapsed onto one line.

## What the parser accepts

Both case-heading shapes in use, so promoting this behaviour into permanent tooling doesn't
invalidate suites already written either way:

```markdown
## TC-SR-001                          ### TC-SR-001 — Search returns results
**Title:** Search returns results     **Objective:** …
**Objective:** …
```

Fields are `**Label:**` markers matching the table above. Front matter, scope banners, `---` rules,
and a trailing `## Summary` are skipped. Fenced code inside a field is preserved verbatim — a `## `
or `**Label:**` inside a fence is content, not structure. An unrecognized `**Label:**` is treated as
prose emphasis and stays with the field it appears in, rather than being dropped.

Strict about structure, permissive about prose: what it cannot parse is **reported**, never silently
written as a blank cell. It warns on a missing required field (Title, Objective, Steps, Expected
Result, Priority, Tags), **a `Review` or `Automation` value outside `Pending`/`Approved`/`Rejected`**,
a duplicate field label, a duplicate Test Case ID, and a document with no cases at all. Superseded
`TestCases_{Module}.vN.md` copies are skipped loudly so they can't become shadow workbooks Stage 4M
executes by accident.

Note the deliberate asymmetry in that list: a **missing** lifecycle value is not a warning (it means
`Pending`), while an **unrecognised** one is. Absence carries a defined meaning; an undefined value
does not.

## Zero dependencies, by design

`platform_core/` must run on a clean `npm install`; the repo's `package.json` declares only an
*optional* `playwright` devDependency and no runtime dependencies.

The Stage 3 experiment that first produced these workbooks used the npm `xlsx` package via a
run-scoped throwaway script. Promoting that behaviour into permanent platform tooling meant it could
not carry a new hard dependency along with it, so [`xlsxWriter.js`](xlsxWriter.js) writes the
`.xlsx` directly: an `.xlsx` is a ZIP of XML parts, and the ZIP is emitted with STORED (uncompressed)
entries — valid per the ZIP spec and readable by Excel, LibreOffice, Google Sheets, and the npm
`xlsx` package alike, with no compression library needed either.

The writer's scope is deliberately narrow — one sheet, a header row, text cells, column widths — and
must not grow into a general-purpose spreadsheet library. Anything needing charts, formulas, or
multiple sheet types wants a real library and a dependency conversation first.

**Output is byte-reproducible.** ZIP entries carry a fixed timestamp (the 1980 ZIP epoch) rather than
wall-clock time, so regenerating an unchanged suite is a no-op in git — a real-content diff instead
of a timestamp diff on every Stage 3 re-run.

## Files

| File | Role |
|---|---|
| [`cli.js`](cli.js) | Command-line entry; resolves the active run, reports results, sets the exit code |
| [`exportSuites.js`](exportSuites.js) | `exportSuite` / `exportSuiteDir` — file discovery and orchestration |
| [`parseTestCases.js`](parseTestCases.js) | Markdown suite → structured records; owns the `FIELDS` contract |
| [`xlsxWriter.js`](xlsxWriter.js) | Dependency-free `.xlsx` writer — one sheet, plus optional extra sheets after it |
| [`sharedDefinitions.js`](sharedDefinitions.js) | `## Shared Definitions` parsing, case linking, the definitions sheet rows |
| [`readWorkbook.js`](readWorkbook.js) | `readWorkbook` / `WorkbookReadError` — the `.xlsx` reader the lifecycle import reads decisions with |
| [`importLifecycle.js`](importLifecycle.js) | `--import-lifecycle`: `importLifecycle` / `readDecisions` / `ImportError` |
| [`syncCaseIndex.js`](syncCaseIndex.js) | `--sync-index`: `syncCaseIndex` / `readCases` / `IndexSyncError` |
| [`crc32.js`](crc32.js) | CRC-32, required by every ZIP entry header |
| [`index.js`](index.js) | Programmatic surface |
| [`__tests__/`](__tests__/) | `node --test` — parser shapes, writer/ZIP structure, export behaviour |

```bash
npm test    # the repo-wide suite, which includes this tool's tests
```

## Rules

- **Never hand-edit a generated `.xlsx`.** Edit the Markdown suite and re-run the tool; a hand-edited
  workbook is exactly the divergence §9 prohibits, and the next export silently discards it.
- **Never treat a warning as cosmetic.** A missing Expected Result means an unexecutable test case
  reaching Stage 4M — fix the Markdown, not the workbook.
- **Never resolve a run folder here.** It comes from the Active Run pointer (§24); this tool never
  writes the pointer, and never falls back to "the newest run."
- **Never add a runtime dependency to this folder.** See *Zero dependencies* above.

## Related

- [`.claude/skills/test-design-skill/SKILL.md`](../../../.claude/skills/test-design-skill/SKILL.md) — the stage that calls this tool (§9 Outputs, §6.1 fields, §12 Artifacts)
- [`platform_core/templates/stage_3_test_design/`](../../templates/stage_3_test_design/) — the structure of the Markdown suite this tool parses
- [`run_manager/`](../run_manager/) — the Active Run pointer this tool resolves against
- [`platform_paths/`](../platform_paths/) — the two-root resolver used to locate `runs/`
