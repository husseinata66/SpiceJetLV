# Self-Healing end-to-end regression suite

A repeatable, isolated check that the Stage 5H repair lifecycle still works end to end. It uses the real tools and real test execution.

```bash
npm run test:e2e:self-healing
node tests/e2e/self_healing/selfHealing.e2e.js --workdir <dir> --keep   # keep the workspaces to inspect
```

Exit `0` means all 12 scenarios passed. Exit `1` means at least one failed, or the harness itself broke. Each run writes two files to the workdir:

- `e2e.results.json`: the scenario matrix and the before/after assertion records.
- `e2e.trace.json`: every command in the successful lifecycle, with its exit code.

It is kept apart from `npm test` because it spawns a few hundred CLI processes and takes about a minute.

## What it exercises

| ID | Scenario |
|---|---|
| E2E-1 | Successful repair: a real 5A run, then classify → propose → approve → apply → verify on disk → real rerun with regression → validated `fixed` |
| E2E-1/12 | Final QA Report: Automation Repaired is kept apart from Passed, the report check passes and 6A completes; a report calling the repaired test Passed is refused |
| E2E-2 | Unsuccessful repair: three real attempts (one after an interruption) → quarantine; a fourth is refused |
| N-1 | An application failure cannot be healed as automation |
| N-2 / N-2b | Patches that weaken an assertion are refused: one removes the approved value, the other swallows the failure with a fallback |
| N-3 | An unapplied or modified patch cannot be validated |
| N-4 | A real regression from a shared-helper change prevents success |
| N-5 | A quarantined test gets no further attempt |
| N-6 | Production restrictions cannot be bypassed by declaring another environment |
| N-7 | The original failure stays visible after a successful repair |
| N-8 | Reporting distinguishes Automation Repaired from Passed |

## Isolation

- **Disposable workspaces only.** Every scenario builds its own data root under the OS temp directory (or `--workdir`). It holds a module, a run, and a small application with one deliberate defect, all in `fixture.js`. The suite refuses a `--workdir` inside `platform_core_data/`.
- **No credentials and no live system.** The application under test is a local Node module, and the automation suite is a `node:test` suite.
- **5H is never automatic.** Each scenario starts Stage 5H explicitly (`state start 5H --invocation Direct --by "QA Lead"`), as a named human would.
- **No production code here.** The fixture's runner plays the 5A executor: it runs the suite, keeps the TAP output and the assertion log as evidence, and writes one results file per cycle without ever overwriting one.

## Limits

The automation is a `node:test` suite, not a browser framework, so Playwright and Selenium specifics are not covered. The governance logic it checks is the same for every framework.
