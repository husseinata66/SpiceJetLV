# Supplier Feature Runner

Runs one **Setup Group** of one Supplier-Feature run in a real browser, end to end, and writes the
Markdown working log and the failure screenshots into that run. One command replaces running the
cases one tool call at a time through an agent, which spent most of a session's tokens on mechanics
(human decision, Mohanad Dawood, 2026-10-18).

```bash
node platform_core/tools/supplier_feature_runner/cli.js groups --run <run>
node platform_core/tools/supplier_feature_runner/cli.js run --run <run> --group 01 --headed
```

| Flag | |
|---|---|
| `--run` | Run folder name, its `run-NNN` prefix, or a path. Must be `scopeFamily: "supplier-feature"` with a `metadata/CapabilityPlan.md` |
| `--group` | Setup Group number from the suite's `Setup Group` column |
| `--headed` / `--headless` | **Required, every time.** Never assumed (CLAUDE.md standing rule) |
| `--app` | `Portal` / `Admin` — only when the run's `testingLayerScope` holds both. Never reaches outside that frozen scope |
| `--fresh-login` | Ignore the saved session |
| `--only TC-…,TC-…` | Run part of the group (steps still run in order) |
| `--login-timeout` | Seconds to wait for the human to log in (default 300) |

Exit: `0` everything passed or was not applicable · `2` something failed, was blocked or
inconclusive, or the run stopped early · `1` the runner could not start.

## What decides what

| Question | Answered by | Never by |
|---|---|---|
| Which cases run for this Supplier | the run's frozen `CapabilityPlan.md` (capability_gate) | the Supplier's name, or today's `supplier.json` |
| Which cases belong to the group | the suite's `Setup Group` column | a hand-kept list |
| How the booking flow moves, what each case checks | the Feature's runner module, `platform_core_data/supplier-features/<feature>/runner/` | this engine — it has no product knowledge |
| Which application | the run's `testingLayerScope` and `environment.<app>` | a default |

A case in the group that the Feature has no check for is reported **Not run — run it by hand**,
never silently dropped. A step that throws marks its own unrecorded cases **Blocked** with a
screenshot; a step marked `critical` stops the run, and every case not yet reached is Blocked.

## Login and credentials

The runner never reads, types or stores a password. With `--headed` it opens the application and
waits for **the human to log in** in that window; the session (cookies only) is saved to
`~/.agentic-qa/sessions/<feature>__<host>.json` — outside the repository — and reused until it
expires, which is also what lets `--headless` run. The Browser Driver's credentials file is not used.

## The click guard

The runner never books, holds or pays. The Feature module must export `actionGuard`
(`forbid` / `allow` patterns); without it the runner refuses to start. The guard is installed in the
page in the capture phase, so a refused click never reaches the application, whichever code issued
it. A refusal stops the run and is written in the log. Groups listed in the module's
`manualGroups` are refused outright. This is the runner's own invariant, not an authorization
policy: whether an action may run at all stays with `execution_safety`.

**Assisted groups** (`assisted: 'Book'` on the scenario) are for groups that must book. The runner
builds the booking up to the button and calls `ctx.humanGate({ allow, until, prompt })`: it shows a
red banner in the page, lets **only** the controls matching `allow` through the guard, and waits —
pressing nothing itself — until the page reaches `until` because the human pressed the button. The
guard closes again whatever happens; Hold, Pay and Save Quote stay refused while the gate is open
(tested). Assisted groups refuse `--headless`. Execution Safety forbids BOOK / PAYMENT /
WALLET_CHARGE for the runner absolutely; the gate is the human pressing it.

## Evidence

- Log: `runs/<run>/manual_execution/GroupResults_Group<NN>_<timestamp>.md` — a new file every
  execution, so an earlier one is never overwritten. The Markdown is the authoritative artifact.
- Screenshots: `runs/<run>/manual_execution/artifacts/failures/<Test Case ID>.png`, only for
  Failed / Blocked / Inconclusive, scrolled to the element that proves it. An existing file gets a
  timestamped sibling instead of being replaced.

## A Feature's runner module

`platform_core_data/supplier-features/<feature>/runner/index.js` exports:

| Export | |
|---|---|
| `apps` | `{ Portal: { startPath, isLoggedIn(page), ui }, … }` — one adapter per application |
| `actionGuard` | `{ forbid: [RegExp], allow: [RegExp] }` — required |
| `manualGroups` | `{ '17': 'reason', … }` — groups the runner must never run |
| `groups` | `{ '01': { steps: [{ name, cases, always?, critical?, run(ctx) }], notAutomated, assisted? } }` — `assisted: 'Book'` marks a group that stops for the human |
| `validateSettings(s)` | optional; settings come from `runner/settings.local.json` (git-ignored) |

`ctx` gives a step `page`, `ui`, `settings`, `credentialName`, `capabilities`, `rules`, a shared
`state`, `env(k, v)` for the log's environment table, `log(s)` for a progress line, `humanGate(…)`
(assisted groups only), and `pass / fail / check / na / inconclusive / blocked(caseId, evidence, shot?)`.
A setup step that stops (it belongs to no case) still saves a screenshot, named in the log's environment. `shot` is `{ locator }` (scrolled into view) or `{ fullPage: true }`.
Recording a case that the plan excluded is a no-op; when one case is recorded twice the worse result
wins.
