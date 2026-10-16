<!--
TEMPLATE — Repair Confidence Report (BLOCK, embedded per failure)
Embedded in: platform_core_data/modules/{{MODULE_SLUG}}/healing/RepairSummary.md §3
Authority:   .claude/skills/self-healing-skill/SKILL.md §9.1 (format), §9.2 (deriving confidence),
             §7.1 (Root Cause Confidence gate)

This is a BLOCK, not a standalone document — one per proposed repair, embedded in the Repair Summary.

THE RULE: every percentage is built ADDITIVELY from the §9.2 factors below, and every contributing
factor must be named in Reasoning with its citation. A round number chosen because it "feels right"
is not a confidence value. If the factors cannot be evidenced, the honest output is a low number with
its reason — or a Diagnosis Strategy instead of a repair (§7.1).
-->

```
Repair Confidence Report

Test Case:             {{TEST_CASE_ID}}
Automation Script:     {{SCRIPT_ID}}
Classification:        {{CLASSIFICATION}}
Root Cause Confidence: {{ROOT_CAUSE_CONFIDENCE}}

Root Cause:
{{ROOT_CAUSE_ONE_LINE}}

Proposed Repair:
{{PROPOSED_REPAIR_ONE_LINE}}

Confidence:
{{CONFIDENCE}}%   Band: {{High | Medium | Low}}   <!-- High 90–100 · Medium 70–89 · Low < 70 — as computed by `state heal propose` from the cited factors; Medium/Low need their own named approval before apply -->

Reasoning:
- {{FACTOR_1}}
- {{FACTOR_2}}
- {{FACTOR_N}}

Regression Risk:
{{REGRESSION_RISK}} — {{RISK_REASON}}

Evidence:
{{BEFORE_STATE_REF}} / {{AFTER_STATE_REF}}
```

<!--
=============================================================================
§9.2 DERIVATION TABLE — the only permitted contributors
=============================================================================

| Factor                                                      | Contribution | Requires
|-------------------------------------------------------------|--------------|-------------------------
| Root cause directly OBSERVED (log timestamp, stack trace,   | Base 40–60%  | Cite the specific
|   screenshot, DOM snapshot) rather than inferred            |              |   evidence artifact
| Repair directly targets THAT observed root cause            | +10–15%      | State the causal link
|   (not an adjacent or speculative one)                      |              |   explicitly
| Failure reproduced more than once, same signature           | +10%         | Cite the occurrences
| A CONFIRMED Repair KB rule matches this exact pattern       | +15%,        | Cite Rule ID AND
|                                                             |  scaling     |   confirmation count
| Selector Verification KB supplies the replacement locator,  | +10%         | Cite the record and its
|   re-verified live                                          |              |   verification timestamp
| Fix statically verified (compiles / lints clean) pre-rerun  | +5%          | Cite the check performed
| Novel pattern, no prior confirmation anywhere               | CAP 60%      | — (overrides the sum)

CEILINGS:
  - Never above 95% before the repair is actually rerun and confirmed. The pre-rerun number is a
    PROPOSED confidence; the Evidence field distinguishes it from the confirmed outcome (§13).
  - Novel pattern caps the total at 60% regardless of what the other factors sum to.

GATE INTERACTION (§7.1):
  - Root Cause Confidence High   -> a repair may be proposed at all
  - Root Cause Confidence Medium -> propose DIAGNOSIS first; no repair on a guess
  - Root Cause Confidence Low    -> DIAGNOSIS ONLY; this block is not produced
-->
