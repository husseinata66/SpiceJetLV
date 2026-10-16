// Observability — the human-readable run report.
//
// This renders metrics. It does not compute them. Every number here came out of `aggregate()`, and
// if a number appears in this file that the aggregator did not produce, that is a bug — a report
// that does its own arithmetic is a second source of truth with a nicer font.
//
// SECTIONS APPEAR ONLY WHERE THERE IS EVIDENCE (§49), with one deliberate exception: §11 AI Usage is
// always rendered, precisely because it is unavailable. Hiding it would let a reader assume the
// question was never asked. Making the measurement boundary visible IS the report's job.

'use strict';

const { STAGES } = require('./schema');
const { isAvailable, formatDuration, formatRatio, formatCount, FORMULAS } = require('./formulas');
const { INSTRUMENTATION } = require('./aggregator');

const DASH = '—';

/** Renders any measured-or-unavailable value for a table cell. */
function cell(m, kind = 'count') {
  if (m === null || m === undefined) return DASH;
  if (typeof m !== 'object') return String(m);
  if (!isAvailable(m)) return '**Unavailable**';
  if (kind === 'duration') return formatDuration(m);
  if (kind === 'ratio') return formatRatio(m, 1);
  if (typeof m.value === 'boolean') return m.value ? 'Yes' : 'No';
  return formatCount(m);
}

/** Collects every unavailable metric with its reason, for §12. */
function collectUnavailable(node, prefix = '', out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Object.prototype.hasOwnProperty.call(node, 'available')) {
    if (node.available === false) out.push({ path: prefix, reason: node.reason || 'No reason recorded.' });
    return out;
  }
  for (const [k, v] of Object.entries(node)) {
    if (k === 'entries' || k === 'byTest' || k === 'suites') continue; // detail rows, reported in their own tables
    collectUnavailable(v, prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}

/**
 * Renders the run's Observability Report.
 *
 * @param {object} metrics - the output of aggregate()
 * @param {{now: Date, fixture?: boolean, dashboard?: string}} opts
 */
function renderReport(metrics, { now, fixture = false, dashboard = null } = {}) {
  if (!metrics) throw new Error('renderReport requires a metrics object.');
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error('renderReport requires an explicit valid `now` Date.');
  }
  const L = [];
  const p = (...lines) => L.push(...lines);
  const inst = metrics.instrumentation;

  p(`# Observability Report — ${metrics.runId}`, '');

  if (fixture) {
    p('> **FIXTURE / EXAMPLE — NOT REAL RUN TELEMETRY.**',
      '> This report was rendered from a synthetic event stream to demonstrate the format. No run',
      '> produced these numbers. The first genuinely instrumented run will replace it (HD-OBS-003).', '');
  }

  if (inst.status === INSTRUMENTATION.NONE) {
    p('> **Not Instrumented.** This run recorded no observability telemetry, and none is invented for',
      '> it. Observability applies to runs created after 2026-08-07 (HD-OBS-003). Facts that its',
      '> immutable artifacts still prove are available separately as **Historical Derived Metrics**',
      '> (`observability historical --run <run>`).', '');
  } else if (inst.status === INSTRUMENTATION.PARTIAL) {
    p('> **Partially Instrumented.** Some telemetry is missing, so this report is incomplete. It is',
      '> not presented as a full picture:', '',
      ...inst.reasons.map((r) => `> - ${r}`), '');
  }

  // ── 1. Run Summary ────────────────────────────────────────────────────────────────────────
  p('## 1. Run Summary', '', '| Field | Value |', '|---|---|',
    `| Run | \`${metrics.run.folderName}\` |`,
    `| Scope / Target | ${metrics.run.scope || DASH} / ${metrics.run.target || DASH} |`,
    `| Workflow | ${metrics.run.workflow || DASH} |`,
    `| Environment | ${metrics.run.environment || DASH} |`,
    `| Status | ${metrics.run.status || DASH} |`,
    `| Started | ${metrics.run.startedTime || DASH} |`,
    `| Completed | ${metrics.run.finishedTime || '_(not recorded)_'} |`,
    `| Total duration | ${cell(metrics.run.durationMs, 'duration')} |`,
    `| Instrumentation | **${inst.status}** |`,
    `| Events recorded | ${inst.eventCount} (${inst.bySource['platform-tool']} platform-tool · ${inst.bySource.skill} skill) |`,
    `| Schema version | ${metrics.schemaVersion} |`, '');

  p('**Provenance.** ' + inst.provenanceNote, '');

  // ── 2. Stage Timing ───────────────────────────────────────────────────────────────────────
  const stageRows = Object.values(metrics.stages);
  if (stageRows.length) {
    p('## 2. Stage Timing', '',
      '<!-- A stage never reached has no row. `Incomplete` means the stage opened and never closed:',
      '     it carries no duration, because none was measured. -->', '',
      '| Stage | Started | Completed | Duration | Status |', '|---|---|---|---|---|');
    for (const s of stageRows) {
      p(`| ${s.name} | ${s.startedAt} | ${s.completedAt || DASH} | ${cell(s.durationMs, 'duration')} | ${s.status === 'Incomplete' ? '**Incomplete**' : s.status} |`);
    }
    p('');
    const missing = Object.keys(STAGES).filter((id) => !metrics.stages[id]);
    if (missing.length) {
      p(`_Stages with no row were not reached by this run: ${missing.map((id) => STAGES[id]).join(' · ')}._`, '');
    }
  }

  if (metrics.skills.length) {
    p('### 2.1 Skill Timing', '',
      '<!-- A stage is not a skill: one stage may invoke several, so these are listed rather than',
      '     folded into the stage above. -->', '',
      '| Skill | Stage | Duration | Status |', '|---|---|---|---|');
    for (const s of metrics.skills) {
      p(`| \`${s.skill || DASH}\` | ${s.stage ? STAGES[s.stage] : DASH} | ${cell(s.durationMs, 'duration')} | ${s.status === 'Incomplete' ? '**Incomplete**' : s.status} |`);
    }
    p('');
  }

  // ── 3. Inputs / Outputs ───────────────────────────────────────────────────────────────────
  p('## 3. Inputs / Outputs', '', '| Metric | Value |', '|---|---|',
    `| Stages started | ${cell(metrics.stagesStarted)} |`,
    `| Test cases generated this run | ${cell(metrics.testDesign.generatedThisRun)} |`,
    `| Test cases in scope (all modules) | ${cell(metrics.testDesign.totalCases)} |`,
    `| Artifacts created | ${cell(metrics.repair.rework.artifactsUpdatedAfterCreation)} updated after creation |`, '');

  // ── 4. Tool Activity ──────────────────────────────────────────────────────────────────────
  const t = metrics.tools.totals;
  p('## 4. Tool Activity', '', '| Metric | Value |', '|---|---|',
    `| Tool calls | ${cell(t.calls)} |`,
    `| Succeeded | ${cell(t.succeeded)} |`,
    `| Failed | ${cell(t.failed)} |`,
    `| Incomplete (opened, never closed) | ${cell(t.incomplete)} |`,
    `| Retries | ${cell(t.retries)} |`,
    `| Timeouts | ${cell(t.timeouts)} |`,
    `| Tool failure rate | ${cell(metrics.formulas.TOOL_FAILURE_RATE, 'ratio')} |`, '');

  if (metrics.tools.byTool.length) {
    p('| Tool | Calls | Success | Failure | Retries |', '|---|---|---|---|---|');
    for (const x of metrics.tools.byTool) {
      p(`| \`${x.tool}\` | ${x.calls} | ${x.succeeded} | ${x.failed} | ${x.retries} |`);
    }
    p('', '_Only tools actually observed are listed. A tool with no row was not invoked, or was not instrumented._', '');
  }

  // ── 5. Human Decisions ────────────────────────────────────────────────────────────────────
  const hd = metrics.humanDecisions;
  p('## 5. Human Decisions', '', '| Metric | Value |', '|---|---|',
    `| Requested | ${cell(hd.requested)} |`,
    `| Resolved | ${cell(hd.resolved)} |`,
    `| Pending | ${cell(hd.pending)} |`,
    `| Per stage | ${cell(metrics.formulas.HUMAN_DECISIONS_PER_STAGE, 'ratio')} |`, '',
    `_${hd.interpretation}_`, '');

  if (hd.entries.length) {
    p('| ID | Category | Requested | Resolved | Latency | Status |', '|---|---|---|---|---|---|');
    for (const d of hd.entries) {
      p(`| \`${d.decisionId}\` | ${d.category} | ${d.requestedAt} | ${d.resolvedAt || DASH} | ${cell(d.latencyMs, 'duration')} | ${d.status} |`);
    }
    p('');
  }

  // ── 6. Test Design ────────────────────────────────────────────────────────────────────────
  const td = metrics.testDesign;
  p('## 6. Test Design Metrics', '',
    '<!-- Review and Automation are INDEPENDENT decisions and are never merged into one lifecycle',
    '     status. Derived from the module Case Index, not from telemetry. -->', '',
    '| Decision | Approved | Rejected | Pending |', '|---|---|---|---|',
    `| Review | ${cell(td.review.approved)} | ${cell(td.review.rejected)} | ${cell(td.review.pending)} |`,
    `| Automation | ${cell(td.automation.approved)} | ${cell(td.automation.rejected)} | ${cell(td.automation.pending)} |`, '',
    `**Test Case Acceptance Rate:** ${cell(metrics.formulas.TC_ACCEPTANCE_RATE, 'ratio')} `
    + `— \`${FORMULAS.find((f) => f.id === 'TC_ACCEPTANCE_RATE').expression}\``, '',
    '_Human acceptance, not factual correctness. A reviewer approving a case does not make it right._', '',
    `_${td.provenanceNote}_`, '');

  if (isAvailable(td.contradictions) && td.contradictions.value > 0) {
    p(`> ${td.contradictions.value} test case(s) carry \`Review: Rejected\` with \`Automation: Approved\`. `,
      '> Reported as a fact; resolving it is a governance decision, not observability\'s to make.', '');
  }

  // ── 7. Automation ─────────────────────────────────────────────────────────────────────────
  const a = metrics.automation;
  p('## 7. Automation Metrics', '',
    '<!-- Kept separate by lifecycle phase (§26). "Generated" and "Passed" are never collapsed into',
    '     one success number — building a test and the test passing are different achievements. -->', '',
    '| Phase | Value |', '|---|---|',
    `| Eligible (Automation Approved) | ${cell(a.eligible)} |`,
    `| Selected | ${cell(a.selected)} |`,
    `| Generated | ${cell(a.generated)} |`,
    `| Reused | ${cell(a.reused)} |`,
    `| Modified | ${cell(a.modified)} |`,
    `| Compile attempts | ${cell(a.compileAttempts)} |`,
    `| Compile passed / failed | ${cell(a.compilePassed)} / ${cell(a.compileFailed)} |`,
    `| First-pass success | ${cell(metrics.formulas.FIRST_PASS_AUTOMATION_SUCCESS, 'ratio')} |`, '');

  // ── 8. Execution ──────────────────────────────────────────────────────────────────────────
  const e = metrics.execution;
  p('## 8. Execution Metrics', '', '| Outcome | Count |', '|---|---|',
    `| Planned | ${cell(e.planned)} |`,
    `| Executed | ${cell(e.executed)} |`,
    `| Passed | ${cell(e.passed)} |`,
    `| Failed (every failure category) | ${cell(e.failed)} |`,
    ...(e.failures ? [`| — Application Failure / unclassified Failed | ${cell(e.failures.application)} / ${cell(e.failures.unclassified)} |`, `| — Automation / Environment failures | ${cell(e.failures.automation)} / ${cell(e.failures.environment)} |`] : []),
    ...(e.automationRepaired ? [`| Automation Repaired (not a clean pass) | ${cell(e.automationRepaired)} |`, `| Flaky | ${cell(e.flaky)} |`, `| Unverified (incl. Inconclusive, Quarantined, Unverified) | ${cell(e.unverified)} |`, `| Not Executed / Excluded | ${cell(e.notExecuted)} / ${cell(e.excluded)} |`] : []),
    `| Skipped | ${cell(e.skipped)} |`,
    `| Blocked | ${cell(e.blocked)} |`,
    `| Inconclusive | ${cell(e.inconclusive)} |`,
    `| — of which blocked by Execution Safety | ${cell(e.blockedBySafety)} |`,
    `| Pass rate | ${cell(metrics.formulas.EXECUTION_PASS_RATE, 'ratio')} |`,
    ...(metrics.formulas.VERIFIED_PASS_RATE ? [`| Verified pass rate (Passed / Executed) | ${cell(metrics.formulas.VERIFIED_PASS_RATE, 'ratio')} |`] : []), '',
    '_These are TELEMETRY figures. The authoritative execution outcome is Execution History — see `observability health`, which reconciles the two; where they disagree, execution history governs._', '',
    '_A test blocked by Execution Safety was never run. It is not a failure of the application, the '
    + 'automation, or the environment, and is never counted as one._', '');

  // ── 9. Repair / Rework ────────────────────────────────────────────────────────────────────
  const r = metrics.repair;
  p('## 9. Repair / Rework', '', '| Metric | Value |', '|---|---|',
    `| Repair cycles | ${cell(r.cycles)} |`,
    `| Repair attempts | ${cell(r.attempts)} |`,
    `| Repair successes | ${cell(r.successes)} |`,
    `| Tests repaired | ${cell(r.testsRepaired)} |`,
    `| Remaining failures | ${cell(r.remainingFailures)} |`,
    `| Repair success rate | ${cell(metrics.formulas.REPAIR_SUCCESS_RATE, 'ratio')} |`,
    `| Artifacts updated after creation | ${cell(r.rework.artifactsUpdatedAfterCreation)} |`,
    `| Validation failures | ${cell(r.rework.validationFailures)} |`,
    `| Human corrections | ${cell(r.rework.humanCorrections)} |`, '',
    '_Explicit counters only. There is no `reworkScore`, because no defensible formula for one exists._', '');

  // ── 10. Validation ────────────────────────────────────────────────────────────────────────
  const v = metrics.validation;
  p('## 10. Platform Validation', '',
    '<!-- PLATFORM validation, not application tests. A failing application test is a QA result; a',
    '     failing schema check is a platform problem. They are never summed. -->', '',
    '| Metric | Value |', '|---|---|',
    `| Validation runs | ${cell(v.runs)} |`,
    `| Passed | ${cell(v.passed)} |`,
    `| Failed | ${cell(v.failed)} |`,
    `| Failure rate | ${cell(metrics.formulas.VALIDATION_FAILURE_RATE, 'ratio')} |`, '');
  if (v.byKind.length) {
    p('| Kind | Passed | Failed |', '|---|---|---|');
    for (const k of v.byKind) p(`| \`${k.kind}\` | ${k.passed} | ${k.failed} |`);
    p('');
  }

  // ── 11. Safety ────────────────────────────────────────────────────────────────────────────
  const s = metrics.safety;
  p('## 11. Execution Safety Metrics', '',
    '<!-- CONSUMED from Execution Safety evidence, never recomputed (§44). Observability does not',
    '     hold a second opinion about whether an operation was allowed. -->', '',
    '| Metric | Value |', '|---|---|',
    `| Policy | ${s.policyId ? `\`${s.policyId}\` v${s.policyVersion}` : DASH} |`,
    `| Policy hash | ${s.policyHash ? `\`${s.policyHash}\`` : DASH} |`,
    `| Environment | ${s.environment || DASH} |`,
    `| Operations evaluated | ${cell(s.operationsEvaluated)} |`,
    `| Allowed | ${cell(s.allowed)} |`,
    `| Approval Required | ${cell(s.approvalRequired)} |`,
    `| Pre-authorized | ${cell(s.preAuthorized)} |`,
    `| Forbidden | ${cell(s.forbidden)} |`,
    `| Blocked | ${cell(s.blocks)} |`,
    `| Cleanup required / completed | ${cell(s.cleanupRequired)} / ${cell(s.cleanupCompleted)} |`,
    `| Cleanup completion rate | ${cell(metrics.formulas.CLEANUP_COMPLETION_RATE, 'ratio')} |`,
    `| Safety block rate | ${cell(metrics.formulas.SAFETY_BLOCK_RATE, 'ratio')} |`, '');

  if (s.authorizations.length) {
    p('| Authorization | Action | Ownership | Module | Approved by | Approved at |', '|---|---|---|---|---|---|');
    for (const x of s.authorizations) {
      p(`| \`${x.authorizationId}\` | ${x.action} | ${x.ownership} | ${x.module || DASH} | ${x.approvedBy || DASH} | ${x.approvedAt || DASH} |`);
    }
    p('');
  }
  p('_A high block count means the policy did its job. It is not a quality signal._', '');

  // ── 12. AI Usage — always rendered ────────────────────────────────────────────────────────
  p('## 12. AI Usage', '', '| Metric | Value |', '|---|---|',
    '| Token telemetry | **Unavailable** |',
    '| Cost telemetry | **Unavailable** |',
    `| Provider | ${cell(metrics.aiUsage.provider)} |`,
    `| Model | ${cell(metrics.aiUsage.model)} |`, '',
    `**Reason:** ${metrics.aiUsage.reason}`, '',
    '_No token count is estimated from text length, and no cost is computed from hardcoded pricing. '
    + 'This section is shown rather than hidden so the measurement boundary stays visible._', '');

  // ── 13. Unavailable Metrics ───────────────────────────────────────────────────────────────
  const gaps = collectUnavailable(
    {
      run: metrics.run, stages: metrics.stages, tools: metrics.tools.totals, validation: metrics.validation,
      humanDecisions: { requested: hd.requested, resolved: hd.resolved, pending: hd.pending },
      testDesign: td, automation: a, execution: e, repair: r, safety: s, formulas: metrics.formulas,
    },
  );
  p('## 13. Unavailable Metrics', '',
    '<!-- `0` and `Unavailable` are different claims and this section is where the second one is',
    '     accounted for. An unavailable metric always carries the reason it could not be measured. -->', '');
  if (!gaps.length) {
    p('_Every metric in this report was measured._', '');
  } else {
    p('| Metric | Why it could not be measured |', '|---|---|');
    for (const g of gaps) p(`| \`${g.path}\` | ${g.reason.replace(/\|/g, '\\|')} |`);
    p('');
  }

  // ── 14. Limitations ───────────────────────────────────────────────────────────────────────
  p('## 14. Measurement Limitations', '',
    '- **Skill-emitted telemetry is spec-compliance evidence, not machine-guaranteed.** Its presence '
    + 'is reliable; its absence proves nothing. Platform-tool events cannot be forgotten. The two '
    + 'counts are reported separately in §1 and are never added together as though equally certain.',
    '- **Per-operation automation telemetry does not exist.** Stage `5A` invokes an opaque external '
    + 'runner; the platform observes suite and per-test outcomes only.',
    '- **Human corrections cannot be attributed.** A git diff proves a change, not its author.',
    '- **Token and cost usage is unavailable** for the reason stated in §12.',
    '- **An incomplete span never becomes a duration.** It is reported as `Incomplete`.', '');

  if (metrics.integrity.problems.length) {
    p('## 15. Evidence Integrity', '',
      '_The following structural problems were found in this run\'s event stream. Metrics derived from '
      + 'a stream with problems are reported, but the stream is not certified complete._', '');
    for (const x of metrics.integrity.problems) p(`- ${x}`);
    p('');
  }

  if (dashboard) {
    p('---', '', `**Dashboard:** [\`${dashboard}\`](${dashboard}) — a read-only visual view of these same `
      + 'metrics. This Markdown report and `ObservabilityMetrics.json` remain authoritative; the '
      + 'dashboard is presentation only.', '');
  }

  p('---', '',
    '_Generated by `platform_core/tools/observability` at ' + now.toISOString() + ' from '
    + `\`ObservabilityEvents.jsonl\` (${inst.eventCount} events). Every number above is arithmetic over `
    + 'recorded evidence — no value was recalled, estimated, or inferred by a model._', '');

  return L.join('\n');
}

module.exports = { renderReport, collectUnavailable, cell };
