<!--
TEMPLATE — Quarantine Register (Stage 5H — Self-Healing, OPTIONAL)
Renders to: platform_core_data/modules/{{MODULE_SLUG}}/healing/QuarantineRegister.md
Authority:  .claude/skills/self-healing-skill/SKILL.md §14, §14.1 (flakiness), §10.2

WHAT QUARANTINE IS: a test withdrawn from AUTOMATED REPAIR after repeated failed attempts, with its
full history intact, and referred to a human.

WHAT IT IS NOT: deletion, a skip, or a disabled test. The test REMAINS in the suite and REMAINS
reported (§8.1's prohibition on marking a failing test skipped stands). Stage 6A reports a
quarantined test as coverage that is NOT currently verified — never as passing, never omitted.

WHY IT EXISTS: a test that needs perpetual healing is telling you something about the test's design
or the application's stability that another patch will not fix. Continuing to patch it manufactures
a green suite and hides that evidence.
-->

# Quarantine Register — {{MODULE}}

**Module:** `{{MODULE_SLUG}}` · **Last updated by run:** `{{RUN_FOLDER}}`
**Attempt limit:** {{ATTEMPT_LIMIT}} <!-- three repair attempts per test; the 3rd unsuccessful attempt quarantines, a 4th is refused (§14, enforced by state heal) -->
**Counted across:** this module's whole history — every healing pass ever run against it

<!-- THIS REGISTER IS CUMULATIVE AND PER MODULE. It is edited in place across runs, not re-created per
     run, which is what makes "attempts" a meaningful count at all: a test that failed repair once in
     run-004 and twice in run-011 has three attempts, and resetting the count per run would let it be
     patched indefinitely without ever reaching the limit §14 exists to enforce. -->

## 1. Currently Quarantined

| Test Case | Script | Attempts | First seen | Last attempt | Current classification | Recommendation |
|---|---|---|---|---|---|---|
| {{TC_ID}} | {{SCRIPT_ID}} | {{ATTEMPTS}} | {{FIRST_RUN}} | {{LAST_RUN}} | {{CLASSIFICATION}} | {{RECOMMENDATION}} |

<!-- Recommendation is one of, and is never left generic:
       - Redesign the test (its design is the problem)
       - Re-verify with Discovery (the flow itself may have changed)
       - Investigate application stability (the app is intermittently wrong)
       - Accept as Known Automation Issue (documented, not repaired further)
-->

## 2. Attempt History

<!-- One block per quarantined test. The full record of what was tried, so a human inherits the
     reasoning rather than starting over — and so nobody proposes an already-failed strategy again. -->

### {{TC_ID}} — {{TEST_CASE_TITLE}}

| Attempt | Run | Strategy applied | Proposed conf. | Outcome |
|---|---|---|---|---|
| 1 | {{RUN_1}} | {{STRATEGY_1}} | {{CONF_1}}% | {{OUTCOME_1}} |
| 2 | {{RUN_2}} | {{STRATEGY_2}} | {{CONF_2}}% | {{OUTCOME_2}} |
| 3 | {{RUN_3}} | {{STRATEGY_3}} | {{CONF_3}}% | {{OUTCOME_3}} → **quarantined** |

**Pattern across attempts:** {{PATTERN}}
<!-- The judgment a human most needs: is this the same failure resisting every fix, or a different
     failure each time? The first suggests a wrong root-cause model; the second suggests instability. -->

**Root cause still unestablished?** {{ROOT_CAUSE_STATUS}}
**Evidence accumulated:** {{EVIDENCE_REFS}}

## 3. Flakiness Cases

<!-- §14.1 — a Flaky result is a genuine automation defect more often than not (a race, order
     dependence, shared state). REDUCING FAILURE FREQUENCY IS NOT A REPAIR: adding a retry or
     lengthening a timeout so a race loses less often leaves the defect in place and removes the
     signal that it exists. Where the root cause cannot be established, the honest outcome is a
     diagnosis record and, on repetition, quarantine. -->

| Test Case | Observed failure rate | Root cause established? | What was NOT done | Disposition |
|---|---|---|---|---|
| {{TC_ID}} | {{RATE}} | {{ROOT_CAUSE_ESTABLISHED}} | {{NOT_DONE}} <!-- e.g. "no retry added — would mask, not fix" --> | {{DISPOSITION}} |

## 4. Released from Quarantine

<!-- A test leaves quarantine only on a human decision backed by a real change — the test was
     redesigned, the application was fixed, or Discovery re-verified the flow. It never leaves
     because a later pass wants to try again. -->

| Test Case | Released in run | Why released | What changed |
|---|---|---|---|
| {{TC_ID}} | {{RELEASE_RUN}} | {{WHY}} | {{WHAT_CHANGED}} |

## 5. Reporting Obligation

Every test listed in §1 is reported by Stage `6A` as **coverage that is not currently verified**
(`reporting-skill` §7 rule 10) — never counted as passing, and never omitted from the coverage
figures. A quarantined test represents a requirement the suite is currently failing to verify, and
the Final QA Report must say so.
