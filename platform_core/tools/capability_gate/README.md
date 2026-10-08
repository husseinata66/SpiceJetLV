# `capability_gate/` — which cases a Supplier can run

Suppliers differ. flynas has no Hold and no Pay after Hold; another Supplier may sell no meals. A
test case that needs a capability the Supplier lacks would only fail, so this tool **excludes it
before execution** and records why. It is never run and never counted as a failure.

## Inputs

| Input | Where it comes from |
|---|---|
| The Supplier's capabilities | `supplier.json` → `capabilities`, written only by `module_manager/cli.js supplier-feature supplier capabilities` at intake |
| The Supplier's own rules | `supplier.json` → `supplierRules`, written only by `... supplier rules` (mirrors SupplierChecklist §7c, confirmed rules only) |
| Each case's needs | the suite's `Requires` and `Supplier Rule` columns (test-design-skill §6.1) |

Capabilities: **Hold · Pay after Hold · Meal · Baggage · Seat · Bundle**, each `Supported`, `Not
Supported` or `Unknown`. **`Unknown` is treated as Not Supported** (human decision, 2026-09-27).

**Pay after Hold depends on Hold** — it acts on a held booking, so it is Not Supported whenever Hold
is, enforced when the capability is recorded.

## `Requires` values

| Value | Runs when |
|---|---|
| `None` | always |
| `Seat` | the Supplier supports Seat |
| `Hold + Pay after Hold` (or `,` / `;`) | the Supplier supports every one listed |
| `Not Hold` (or `!Hold`) | the Supplier does **not** support Hold — checks the capability is absent |

A case with a `Supplier Rule` (e.g. `ladies-only-seats`) runs only for a Supplier whose recorded
rules include it. An unknown `Requires` value excludes the case rather than guessing. An empty
`Requires` is treated as `None` and reported as a warning.

## Usage

```bash
node platform_core/tools/capability_gate/cli.js plan \
  --suite <TestCases_X.md | sheet.xlsx> --feature ancillaries --supplier flynas-ndc \
  --run <run-folder>          # writes runs/<run>/metadata/CapabilityPlan.md
```

`--out <file.md>` writes elsewhere; `--json` prints the plan. Exit `0` ok · `1` error · `2` ok with
warnings.

## Where it sits

It is the first of three gates in Stage 4M/4A (manual-execution-skill §4.2):

```text
Capability gate  → Excluded — Not supported by supplier
Review gate      → Excluded — Pending / Rejected at Review
Safety gate      → Skipped — Execution Safety Policy (per action)
```

Excluded cases keep their row in every report and stay out of executable scope and pass rate.
