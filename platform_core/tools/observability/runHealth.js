// Run Health (Phase 8) — one observable view of a run, assembled from the AUTHORITATIVE sources only.
//
// WHY THIS EXISTS
// Workflow state, execution results, assertion coverage, repairs, contract drift and automation state are
// each owned by one tool. A view that recomputed any of them would be a second source of truth, and the
// two would drift apart. This module READS them and lays them side by side:
//
//   Workflow and stage state, approvals, revalidation, next action   run_manager/workflowPlanner
//   Test verdict                                                      run_manager/runState (recorded outcomes)
//   Execution results, first attempts, assertion coverage             run_manager/executionHistory
//   Repairs, attempts, quarantine, validation, knowledge promotion    run_manager/repairGovernance.repairReport
//   Contract health                                                   api_contract/registry.scopeStatus (= `status --json`)
//   Automation baseline and ownership state                           module_manager/automationState
//   Telemetry (ObservabilityEvents.jsonl)                             reconciled against history — history governs
//
// WHAT IT NEVER DOES
// It never changes a status, a verdict, an approval or a decision; never fills a gap with an estimate; and
// never combines the health dimensions into one figure. A source that cannot be read makes its dimension
// Unavailable — never clean. It writes nothing, except through writeRunHealth, and never into a run that is
// finished, cancelled or legacy.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { STATUSES, categoryOf } = require('../run_manager/testStatus');
const { mapStatus, categoryCounts } = require('./statusMap');

const SCHEMA = 'run-health/1';

class RunHealthError extends Error {
  constructor(message, code = 'RUN_HEALTH') { super(message); this.name = 'RunHealthError'; this.code = code; }
}

/**
 * What each health dimension measures — its source, numerator, denominator, and how missing and excluded
 * results are treated. Published (README, report) so a figure is never read without its definition.
 */
const HEALTH_DEFINITIONS = Object.freeze({
  application: {
    source: 'Execution History — each test\'s final status across all cycles (executionHistory.buildHistory)',
    numerator: 'Application Failure + Failed (Failed alone is reported as an unclassified failure)',
    denominator: 'Executed: every result that ran — the executable scope minus Blocked / Skipped / Not Executed',
    excluded: 'Excluded results are outside executable scope: never in the denominator, always reported',
    missing: 'No execution results → Unavailable (never "no defects")',
    states: 'failures · clean · unavailable',
  },
  automation: {
    source: 'Execution History (final statuses) + Stage 5H repair report + Module Manager automation state',
    numerator: 'Automation Failure + Quarantined; Automation Repaired and Flaky are reported apart — never as Passed',
    denominator: 'Executed (as above)',
    excluded: 'As above',
    missing: 'No execution results → Unavailable',
    states: 'failures · repaired · clean · unavailable',
  },
  environment: {
    source: 'Execution History (final statuses)',
    numerator: 'Environment Failure + Infrastructure Failure + Configuration Failure',
    denominator: 'Executed (as above)',
    excluded: 'As above',
    missing: 'No execution results → Unavailable',
    states: 'failures · clean · unavailable',
  },
  coverage: {
    source: 'Execution History — executable scope, final statuses, assertion evidence and assertion coverage',
    numerator: 'Executed; and, of the recorded passes, those verified by assertion evidence',
    denominator: 'Executable scope: every test in scope minus Excluded',
    excluded: 'Excluded is reported and kept out; Blocked / Skipped / Not Executed are in scope but not executed',
    missing: 'Unverified, Inconclusive, Quarantined and Unrecognized results, passes with no assertion records, and required assertions with no record all keep coverage incomplete',
    states: 'complete · incomplete · unavailable',
  },
  contract: {
    source: 'API Contract Tool — registry.scopeStatus for every scope of the run (the data `api_contract/cli.js status --json` prints)',
    numerator: 'Blockers and warnings exactly as the contract tool classifies them',
    denominator: 'The run\'s scopes (and, for a Supplier or shared scope, its Feature)',
    excluded: 'A scope with no registry and an optional policy is "not registered" — not clean',
    missing: 'A required policy with no approved contract is a blocker (the contract tool decides)',
    states: 'blocked · warnings · clean · not-registered · unavailable',
  },
  workflow: {
    source: 'Workflow Planner (planWorkflow / workflowStatus) — authoritative for the next action',
    numerator: 'Blocked stages, pending approvals, stages needing revalidation, pending human decisions',
    denominator: 'The stages of the selected workflow',
    excluded: 'Stages outside the selected workflow',
    missing: 'A legacy run (no run state model) → Unknown',
    states: 'blocked · needs-revalidation · awaiting-decision · in-progress · complete · not-selected · unknown',
  },
});

const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } };
const canonical = (v) => (Array.isArray(v) ? `[${v.map(canonical).join(',')}]` : v && typeof v === 'object' ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}` : JSON.stringify(v === undefined ? null : v));

/** Runs one source reader; a failure is recorded, never hidden, and never turned into a value. */
function attempt(sources, name, fn) {
  try {
    const value = fn();
    sources.push({ name, status: value === null || value === undefined ? 'absent' : 'ok' });
    return value === undefined ? null : value;
  } catch (err) {
    sources.push({ name, status: 'error', detail: String(err.message).split('\n')[0] });
    return null;
  }
}

// ---------------------------------------------------------------------------------------------
// Dimensions
// ---------------------------------------------------------------------------------------------

function executionFigures(h) {
  if (!h) return null;
  const counts = h.counts || {};
  const cat = categoryCounts(counts);
  const total = Object.values(counts).reduce((n, v) => n + v, 0);
  const executable = total - cat['not-applicable'];
  const executed = executable - cat['not-run'];
  return { counts, categories: cat, total, executable, executed, firstAttemptCounts: h.firstAttemptCounts || {} };
}

function applicationHealth(ex) {
  if (!ex || !ex.total) return { state: 'unavailable', reason: 'no execution results recorded' };
  const classified = ex.counts['Application Failure'] || 0;
  const unclassified = ex.counts.Failed || 0;
  const failures = classified + unclassified;
  if (!ex.executed) return { state: 'unavailable', reason: 'nothing was executed', failures: 0, executed: 0 };
  return { state: failures ? 'failures' : 'clean', failures, classified, unclassified, executed: ex.executed };
}

function automationHealth(ex, repairs, automationState) {
  const base = { automationState };
  if (!ex || !ex.total) return { ...base, state: 'unavailable', reason: 'no execution results recorded' };
  const failures = ex.counts['Automation Failure'] || 0;
  const quarantined = ex.counts.Quarantined || 0;
  const repaired = ex.counts['Automation Repaired'] || 0;
  const flaky = ex.counts.Flaky || 0;
  const state = failures || quarantined ? 'failures' : repaired || flaky ? 'repaired' : 'clean';
  return { ...base, state, failures, quarantined, repaired, flaky, executed: ex.executed, repairOperations: repairs ? repairs.length : 0 };
}

function environmentHealth(ex) {
  if (!ex || !ex.total) return { state: 'unavailable', reason: 'no execution results recorded' };
  const failures = ex.categories['env-failure'];
  const by = Object.fromEntries(['Environment Failure', 'Infrastructure Failure', 'Configuration Failure'].map((s) => [s, ex.counts[s] || 0]));
  return { state: failures ? 'failures' : 'clean', failures, byStatus: by, executed: ex.executed };
}

function coverageHealth(ex, h) {
  if (!ex || !ex.total) return { state: 'unavailable', reason: 'no execution results recorded' };
  const as = h.assertionSummary || {};
  const cv = h.assertionCoverage || {};
  const unverified = ex.categories.unverified;
  const missingAssertions = (cv.missing || []).length;
  const unverifiedPasses = (as.unverified || 0) + (as.none || 0);
  const complete = ex.executable > 0 && ex.executed === ex.executable && !unverified && !missingAssertions && !unverifiedPasses && !(cv.partial || 0) && !(cv.unknown || 0);
  return {
    state: complete ? 'complete' : 'incomplete',
    executed: ex.executed, executable: ex.executable,
    notRun: ex.categories['not-run'], excluded: ex.categories['not-applicable'], unverified,
    assertions: { verified: as.verified || 0, unverified: as.unverified || 0, none: as.none || 0, inconclusive: as.inconclusive || 0, failed: as.failed || 0, contradiction: as.contradiction || 0 },
    assertionCoverage: { complete: cv.complete || 0, partial: cv.partial || 0, unknown: cv.unknown || 0, structured: cv.structured || 0, textual: cv.textual || 0, missing: missingAssertions },
    scopeBasis: h.scope ? h.scope.basis : 'not-recorded',
  };
}

function contractHealth(statuses) {
  if (!statuses) return { state: 'unavailable', reason: 'the contract tool could not be read' };
  const registered = statuses.filter((s) => s.registry || s.blockers.length);
  const blockers = statuses.reduce((n, s) => n + s.blockers.length, 0);
  const warnings = statuses.reduce((n, s) => n + s.warnings.length, 0);
  const decisions = statuses.reduce((n, s) => n + (s.decisionsPending || []).length, 0);
  const required = statuses.filter((s) => s.policy && s.policy.mode === 'required').map((s) => s.scope);
  let state = 'clean';
  if (blockers) state = 'blocked';
  else if (warnings) state = 'warnings';
  else if (!registered.length) state = 'not-registered';
  return { state, scopes: statuses.length, registered: registered.length, blockers, warnings, decisionsPending: decisions, requiredScopes: required };
}

function workflowHealth(w) {
  if (!w) return { state: 'unavailable', reason: 'the workflow planner could not be read' };
  if (w.legacy) return { state: 'unknown', reason: 'legacy run — no run state model; its workflow cannot be shown' };
  const blockedStages = w.stages.filter((s) => s.category === 'blocked' || s.status === 'Blocked' || s.status === 'Failed').map((s) => s.stageId);
  let state;
  if (w.workflowStatus === 'not-selected') state = 'not-selected';
  else if (w.next.action === 'resolve-blocked' || blockedStages.length) state = 'blocked';
  else if (w.revalidation.length) state = 'needs-revalidation';
  else if (w.next.humanDecision || w.approvals.pending.length) state = 'awaiting-decision';
  else if (w.workflowStatus === 'complete') state = 'complete';
  else state = 'in-progress';
  return { state, workflowStatus: w.workflowStatus, blockedStages, pendingApprovals: w.approvals.pending.length, revalidation: w.revalidation.length, nextAction: w.next.action, humanDecision: Boolean(w.next.humanDecision) };
}

// ---------------------------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------------------------

function workflowView(runsDir, runFolder, now) {
  // eslint-disable-next-line global-require
  const planner = require('../run_manager/workflowPlanner');
  const p = planner.planWorkflow(runsDir, runFolder, { now });
  if (p.runStatus === 'Unknown' || (p.stages || []).every((s) => s.status === 'Unknown')) return { legacy: true, stages: p.stages || [], testOutcome: p.testOutcome };
  const recovery = (p.stages || []).filter((s) => ['Running', 'Paused', 'Failed'].includes(s.status)).map((s) => ({
    stageId: s.stageId, status: s.status,
    action: s.status === 'Failed' ? `reopen it (state reopen ${s.stageId} --by "<name>" --reason "…") or start a new run` : s.status === 'Paused' ? 'resume the run' : `if the session that ran it is gone: state recover ${s.stageId} --by "<name>" --reason "…"`,
  }));
  return {
    legacy: false,
    workflow: p.workflow ? { type: p.workflow.type, stages: p.workflow.stages, selectedBy: p.workflow.selectedBy } : null,
    runStatus: p.runStatus,
    workflowStatus: p.workflowStatus,
    stages: (p.stages || []).map((s) => ({ stageId: s.stageId, name: s.name, status: s.status, category: s.category, ...(s.partialScope ? { partialScope: s.partialScope } : {}) })),
    approvals: p.approvals,
    revalidation: p.revalidation || [],
    partialScope: (p.approvals && p.approvals.partialScope) || [],
    recovery,
    next: { action: p.next.action, stageId: p.next.stageId || null, humanDecision: Boolean(p.next.humanDecision), reason: p.next.reason || null, command: p.next.command || null, blockers: p.next.blockers || [] },
    testOutcome: p.testOutcome,
  };
}

function historyView(runsDir, runFolder, stageId) {
  // eslint-disable-next-line global-require
  const { buildHistory, listCycles } = require('../run_manager/executionHistory');
  if (!listCycles(path.join(runsDir, runFolder), stageId).length) return null;
  const h = buildHistory(runsDir, runFolder, stageId);
  return {
    stageId, cycles: h.cycles.map((c) => ({ cycle: c.cycle, file: c.file, producedBy: c.producedBy, sha256: c.sha256, results: c.results })),
    counts: h.counts, firstAttemptCounts: h.firstAttemptCounts,
    tests: h.tests.map((t) => ({ testCaseId: t.testCaseId, firstStatus: t.firstStatus, finalStatus: t.finalStatus, cycles: (t.history || []).map((x) => x.status) })),
    unrecognized: h.unrecognized, unattributed: h.unattributed, conflicts: h.conflicts,
    assertionSummary: h.assertionSummary, assertionCoverage: { ...h.assertionCoverage, missing: h.assertionCoverage.missing || [] },
    evidenceIssues: h.evidenceIssues, scope: h.scope,
  };
}

function selfHealingView(runsDir, runFolder, h5h) {
  // eslint-disable-next-line global-require
  const { repairReport } = require('../run_manager/repairGovernance');
  const ops = repairReport(runsDir, runFolder);
  if (!ops.length) return null;
  const finalOf = (tc) => ((h5h && h5h.tests.find((t) => t.testCaseId === tc)) || {}).finalStatus || null;
  return {
    operations: ops.map((op) => ({
      id: op.id, status: op.status, invokedBy: op.invokedBy, environment: op.environment,
      environmentCheck: op.environmentCheck ? { status: op.environmentCheck.status, restricted: op.environmentCheck.restricted } : null,
      promotions: (op.promotions || []).map((p) => ({ test: p.testCaseId || p.test || null, status: p.status || (p.promotedAt ? 'promoted' : 'recorded'), by: p.by || p.approvedBy || null })),
      tests: op.tests.map((t) => ({
        testCaseId: t.testCaseId,
        recorded: t.recorded,
        classification: t.classification ? { class: t.classification.class || t.classification.classification || null, by: t.classification.by || null } : null,
        cumulative: t.cumulative,
        attempts: t.attempts.map((a) => ({ n: a.n, status: a.status, result: a.result || null, confidence: a.confidence ? { band: a.confidence.band, score: a.confidence.score } : null, approvedBy: a.approval ? a.approval.by || null : null, applied: a.applied ? Boolean(a.applied.verified) : false, before: a.beforeAfter ? a.beforeAfter.before : null, after: a.beforeAfter ? a.beforeAfter.after : null, regression: (a.regression || []).map((r) => `${r.testCaseId} ${r.status}`) })),
        repairStatus: t.finalStatus,
        executionStatus: finalOf(t.testCaseId),
      })),
    })),
    quarantine: (ops[0].quarantine || []).map((q) => ({ testCaseId: q.testCaseId, attempts: q.attempts, at: q.at || null })),
  };
}

function contractView(dataRoot, meta) {
  // eslint-disable-next-line global-require
  const { resolveScopeRoots } = require('../run_manager/stageGate');
  // eslint-disable-next-line global-require
  const R = require('../api_contract/registry');
  const { roots } = resolveScopeRoots(meta, dataRoot);
  const seen = new Set();
  const out = [];
  for (const root of roots) {
    for (const scope of R.scopesForRoot(dataRoot, root)) {
      if (seen.has(scope.rel)) continue;
      seen.add(scope.rel);
      const st = R.scopeStatus(dataRoot, scope); // the same record `api_contract/cli.js status --scope … --json` prints
      out.push(st);
    }
  }
  return out;
}

function automationStateView(dataRoot, meta) {
  // eslint-disable-next-line global-require
  const { readAutomationState } = require('../module_manager/automationState');
  const modules = Array.isArray(meta.modules) ? meta.modules : [];
  if (!modules.length) return null;
  return modules.map((m) => {
    const s = readAutomationState(path.join(dataRoot, 'modules'), m);
    return s ? { module: m, state: s.state || null, framework: s.framework || null, promoted: Boolean(s.promotion || s.promotedAt || s.state === 'Promoted'), baselineRef: s.baselineRef || null } : { module: m, state: null, note: 'no automation state recorded' };
  });
}

/**
 * Telemetry against execution history, per test — first attempt and final result, Automation Repaired
 * transitions, quarantine and unresolved failures, and what telemetry is missing or cannot attribute.
 * Execution history governs: every disagreement is listed, and none changes a count.
 *
 *   telemetry first attempt  the earliest event at attempt 1
 *   telemetry final          the latest platform `final` event (Phase 8.1 emission), else the latest event
 *   agree                    same canonical status; a LEGACY telemetry "Failed" agrees with any failure
 *                            category as an unclassified failure (it is never read as a specific one)
 */
function telemetryView(dataRoot, runFolder, history, stages) {
  // eslint-disable-next-line global-require
  const { readEvents } = require('./recorder');
  const r = readEvents({ dataRoot, runFolder });
  if (!r.exists) return { exists: false };
  const bare = (id) => String(id).replace(/^[^:]+:/, '');
  const results = r.events.filter((x) => x.type === 'TEST_EXECUTION_RESULT' && (!x.stage || !stages || stages.includes(String(x.stage))));
  const unattributed = results.filter((x) => !x.testCaseId).length;
  // Per source: a platform-emitted stream and a Skill-emitted one are compared with history separately, so
  // a disagreement in either is visible — one source never hides the other.
  const bySource = new Map();
  for (const e of results.filter((x) => x.testCaseId)) {
    const src = e.source || 'unknown';
    if (!bySource.has(src)) bySource.set(src, { first: new Map(), fin: new Map(), lastAny: new Map() });
    const m = bySource.get(src);
    const k = bare(e.testCaseId);
    if (e.attempt === 1 && (!m.first.has(k) || e.seq < m.first.get(k).seq)) m.first.set(k, e);
    if (!m.lastAny.has(k) || e.seq > m.lastAny.get(k).seq) m.lastAny.set(k, e);
    if (e.metadata && e.metadata.resultKind === 'final' && (!m.fin.has(k) || e.seq > m.fin.get(k).seq)) m.fin.set(k, e);
  }
  const hist = new Map(((history && history.tests) || []).map((t) => [bare(t.testCaseId), t]));
  // Phase 9.2, F-10: the platform's own events (platform-tool) carry the canonical status verbatim — including
  // the derived `Unverified`, which the input normaliser deliberately never accepts from a results file. They
  // are compared by canonical name. Every other source stays conservative: mapped through statusMap, where
  // an unknown status is Unrecognized and a legacy "Failed" is unclassified.
  const same = (telemetryStatus, historyStatus, src) => {
    if (src === 'platform-tool' && Object.prototype.hasOwnProperty.call(STATUSES, telemetryStatus) && telemetryStatus !== 'Unrecognized') {
      return telemetryStatus === historyStatus ? 'agree' : 'disagree';
    }
    const m = mapStatus(telemetryStatus, { source: 'telemetry' });
    if (m.status === historyStatus) return 'agree';
    if (m.unclassified && ['app-failure', 'auto-failure', 'env-failure'].includes(categoryOf(historyStatus))) return 'agree-unclassified';
    return 'disagree';
  };
  const allKeys = new Set([...bySource.values()].flatMap((m) => [...m.lastAny.keys()]));
  const out = {
    exists: true, events: r.events.length, problems: r.problems.length, foreign: r.foreign.length, unattributed,
    sources: [...bySource.keys()].sort(),
    final: { compared: 0, agree: 0, agreeUnclassified: 0, disagree: [] },
    firstAttempt: { compared: 0, agree: 0, agreeUnclassified: 0, disagree: [] },
    repairedTransitions: [], unresolved: [],
    historyOnly: [...hist.keys()].filter((k) => !allKeys.has(k)), firstAttemptMissing: [],
    telemetryOnly: [...allKeys].filter((k) => !hist.has(k)),
    legacyUnclassifiedFailures: [...bySource.values()].flatMap((m) => [...m.lastAny.values()]).filter((e) => mapStatus(e.status, { source: 'telemetry' }).unclassified && !(e.metadata && e.metadata.resultKind)).length,
  };
  for (const [src, m] of [...bySource.entries()].sort()) {
    for (const [k, t] of hist) {
      const fe = m.fin.get(k) || m.lastAny.get(k);
      if (!fe) continue;
      out.final.compared += 1;
      const v = same(fe.status, t.finalStatus, src);
      if (v === 'agree') out.final.agree += 1; else if (v === 'agree-unclassified') out.final.agreeUnclassified += 1;
      else out.final.disagree.push({ testCaseId: k, source: src, telemetry: fe.status, history: t.finalStatus });
      const f1 = m.first.get(k);
      if (!f1) { if (!out.firstAttemptMissing.includes(k)) out.firstAttemptMissing.push(k); } else {
        out.firstAttempt.compared += 1;
        const v1 = same(f1.status, t.firstStatus, src);
        if (v1 === 'agree') out.firstAttempt.agree += 1; else if (v1 === 'agree-unclassified') out.firstAttempt.agreeUnclassified += 1;
        else out.firstAttempt.disagree.push({ testCaseId: k, source: src, telemetry: f1.status, history: t.firstStatus });
      }
      if (t.finalStatus === 'Automation Repaired') {
        out.repairedTransitions.push({ testCaseId: k, source: src, history: `${t.firstStatus} → Automation Repaired`, telemetry: `${f1 ? f1.status : '—'} → ${fe.status}`, agrees: fe.status === 'Automation Repaired', ...(fe.status === 'Passed' ? { problem: 'telemetry counts a repaired test as Passed' } : {}) });
      }
      if (['app-failure', 'auto-failure', 'env-failure', 'unverified'].includes(categoryOf(t.finalStatus))) {
        out.unresolved.push({ testCaseId: k, source: src, history: t.finalStatus, telemetry: fe.status, ...(mapStatus(fe.status).category === 'pass' ? { problem: `telemetry shows a pass for a test that is ${t.finalStatus}` } : {}) });
      }
    }
  }
  // A first-attempt event missing from one source but present in another is not "missing".
  out.firstAttemptMissing = out.firstAttemptMissing.filter((k) => ![...bySource.values()].some((m) => m.first.has(k)));
  // Back-compatible summary fields.
  out.resultsCompared = out.final.compared;
  out.agree = out.final.agree + out.final.agreeUnclassified;
  out.disagree = out.final.disagree;
  return out;
}

// ---------------------------------------------------------------------------------------------
// The snapshot
// ---------------------------------------------------------------------------------------------

/**
 * The run's health, from its authoritative sources. Pure read.
 * @param {{dataRoot: string, runFolder: string, now: Date}} o
 */
function buildRunHealth({ dataRoot, runFolder, now }) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new RunHealthError('buildRunHealth requires an explicit valid `now` Date.', 'INVALID_ARGUMENT');
  const runsDir = path.join(dataRoot, 'runs');
  const runDir = path.join(runsDir, runFolder);
  if (!fs.existsSync(runDir)) throw new RunHealthError(`run ${runFolder} does not exist.`, 'NO_RUN');
  let meta = {};
  try { meta = JSON.parse(read(path.join(runDir, 'metadata', 'run.json')) || '{}'); } catch { meta = {}; }
  const legacy = meta.stateSchemaVersion === undefined;
  const sources = [];

  const workflow = attempt(sources, 'workflow (run_manager/workflowPlanner)', () => (legacy ? { legacy: true } : workflowView(runsDir, runFolder, now)));
  const stages = {};
  for (const id of ['4M', '5A', '5H']) {
    const hv = attempt(sources, `execution history ${id} (run_manager/executionHistory)`, () => historyView(runsDir, runFolder, id));
    if (hv) stages[id] = hv;
  }
  // Each branch's final view: manual = 4M; automation = 5H (every cycle, reruns included) when 5H ran, else 5A.
  const s5h = meta.stages && meta.stages['5H'] && meta.stages['5H'].status && meta.stages['5H'].status !== 'Not Started';
  const branches = [];
  if (stages['4M']) branches.push({ branch: 'manual', stage: '4M', history: stages['4M'] });
  const auto = (s5h && stages['5H']) || stages['5A'];
  if (auto) branches.push({ branch: 'automation', stage: auto.stageId, history: auto });
  const selfHealing = s5h ? attempt(sources, 'self-healing (run_manager/repairGovernance.repairReport)', () => selfHealingView(runsDir, runFolder, stages['5H'])) : null;
  const contracts = attempt(sources, 'contract health (api_contract/registry.scopeStatus)', () => (legacy && !meta.modules && !meta.scopeFamily ? [] : contractView(dataRoot, meta)));
  const automationState = attempt(sources, 'automation state (module_manager/automationState)', () => automationStateView(dataRoot, meta));
  const telemetry = attempt(sources, 'telemetry (observability/recorder)', () => telemetryView(dataRoot, runFolder, auto || stages['4M'], auto ? ['5A', '5H'] : ['4M']));
  // Execution evidence integrity (Phase 9.1, F-03): the recorded results must still match the fingerprints
  // their outcome was recorded from. A legacy run recorded none, so nothing can be compared.
  // eslint-disable-next-line global-require
  const { checkResultsIntegrity, integrityMessage } = require('../run_manager/resultsIntegrity');
  const evidence = legacy ? { state: 'not-recorded', checked: 0, modified: [], unrecorded: [] }
    : attempt(sources, 'execution evidence integrity (run_manager/resultsIntegrity)', () => checkResultsIntegrity(runsDir, runFolder, { meta, dataRoot }));

  const health = { byBranch: {} };
  for (const b of branches) {
    const ex = executionFigures(b.history);
    health.byBranch[b.branch] = {
      stage: b.stage,
      application: applicationHealth(ex),
      automation: automationHealth(ex, selfHealing && selfHealing.operations, b.branch === 'automation' ? automationState : null),
      environment: environmentHealth(ex),
      coverage: coverageHealth(ex, b.history),
      execution: ex,
    };
  }
  if (!branches.length) {
    const none = { state: 'unavailable', reason: 'no execution results recorded in this run' };
    health.byBranch.none = { stage: null, application: none, automation: { ...none, automationState }, environment: none, coverage: none, execution: null };
  }
  // Rewritten or removed results: every execution figure read from them is untrusted — never shown as a
  // state that could pass for clean (the figures themselves stay visible, so the change is inspectable).
  if (evidence && evidence.state === 'modified') {
    for (const h of Object.values(health.byBranch)) {
      for (const dim of ['application', 'automation', 'environment', 'coverage']) {
        h[dim] = { ...h[dim], computedState: h[dim].state, state: 'evidence-modified', reason: 'RESULTS_MODIFIED — recorded results were rewritten or removed' };
      }
    }
  }
  health.contract = contractHealth(contracts);
  health.workflow = workflowHealth(workflow);

  const verdict = workflow && !workflow.legacy ? workflow.testOutcome : { overall: legacy ? 'not-recorded' : 'unavailable', final: 'not-recorded', firstAttempt: 'not-recorded', byStage: {} };
  const snapshot = {
    schema: SCHEMA, run: runFolder, legacy,
    verdict: { overall: verdict.overall, final: verdict.final, firstAttempt: verdict.firstAttempt },
    sources, workflow, stages, branches: branches.map((b) => ({ branch: b.branch, stage: b.stage })),
    health, selfHealing, contracts, automationState, telemetry, evidence,
    notes: [
      ...(evidence && evidence.state === 'modified' ? [integrityMessage(evidence)] : []),
      ...(legacy ? ['Legacy run: it predates the run state model. Its workflow and verdict cannot be shown; execution is read from its immutable results files, and a recorded Passed with no assertion evidence is Unverified — verification is never claimed retroactively.'] : []),
      ...sources.filter((s) => s.status === 'error').map((s) => `${s.name} could not be read (${s.detail}) — the dimensions it feeds are Unavailable, not clean.`),
      ...(telemetry && telemetry.exists && telemetry.final.disagree.length ? [`Telemetry's final result disagrees with execution history for ${telemetry.final.disagree.length} test(s); execution history governs.`] : []),
      ...(telemetry && telemetry.exists && telemetry.firstAttempt.disagree.length ? [`Telemetry's first attempt disagrees with execution history for ${telemetry.firstAttempt.disagree.length} test(s); execution history governs.`] : []),
      ...(telemetry && telemetry.exists ? telemetry.repairedTransitions.filter((x) => x.problem).map((x) => `${x.testCaseId}: ${x.problem} — it is Automation Repaired in execution history.`) : []),
      ...(telemetry && telemetry.exists ? telemetry.unresolved.filter((x) => x.problem).map((x) => `${x.testCaseId}: ${x.problem} — execution history governs.`) : []),
      ...(telemetry && telemetry.exists && (telemetry.historyOnly.length || telemetry.unattributed) ? [`Telemetry is missing for ${telemetry.historyOnly.length} test(s) and cannot attribute ${telemetry.unattributed} event(s) — the run's telemetry is incomplete; execution history is unaffected.`] : []),
    ],
  };
  snapshot.figures = figuresOf(snapshot);
  snapshot.fingerprint = crypto.createHash('sha256').update(canonical({ ...snapshot, fingerprint: undefined })).digest('hex');
  return snapshot;
}

/**
 * The figures every rendering must agree on — a flat, ordered list of `key: value`. Markdown, the JSON
 * model and the HTML each carry them, and checkRunHealth compares the three with a fresh snapshot.
 */
function figuresOf(s) {
  const f = [];
  const put = (k, v) => f.push([k, v === undefined || v === null ? '—' : String(v)]);
  put('verdict.overall', s.verdict.overall);
  put('verdict.final', s.verdict.final);
  put('verdict.firstAttempt', s.verdict.firstAttempt);
  if (s.evidence) {
    put('evidence.results', s.evidence.state);
    if (s.evidence.state === 'modified') put('evidence.modified', s.evidence.modified.length);
  }
  for (const [b, h] of Object.entries(s.health.byBranch)) {
    for (const dim of ['application', 'automation', 'environment', 'coverage']) put(`${b}.${dim}.state`, h[dim].state);
    if (h.execution) {
      put(`${b}.executed`, `${h.execution.executed}/${h.execution.executable}`);
      for (const st of Object.keys(STATUSES)) if (h.execution.counts[st]) put(`${b}.status.${st}`, h.execution.counts[st]);
    }
    if (h.coverage.assertions) {
      put(`${b}.assertions.verifiedPasses`, h.coverage.assertions.verified);
      put(`${b}.assertions.unverifiedPasses`, h.coverage.assertions.unverified + h.coverage.assertions.none);
      put(`${b}.assertions.missingRequired`, h.coverage.assertionCoverage.missing);
    }
  }
  if (s.selfHealing) {
    const tests = s.selfHealing.operations.flatMap((o) => o.tests);
    put('repair.operations', s.selfHealing.operations.length);
    put('repair.attempts', tests.reduce((n, t) => n + t.attempts.length, 0));
    put('repair.quarantined', s.selfHealing.quarantine.length);
    put('repair.automationRepaired', tests.filter((t) => t.executionStatus === 'Automation Repaired').length);
  }
  if (s.telemetry && s.telemetry.exists) {
    put('telemetry.finalDisagree', s.telemetry.final.disagree.length);
    put('telemetry.firstAttemptDisagree', s.telemetry.firstAttempt.disagree.length);
    put('telemetry.repairedShownAsPassed', s.telemetry.repairedTransitions.filter((x) => x.problem).length);
    put('telemetry.missingTests', s.telemetry.historyOnly.length);
    put('telemetry.unattributed', s.telemetry.unattributed);
  } else put('telemetry.present', 'no');
  put('contract.state', s.health.contract.state);
  put('contract.blockers', s.health.contract.blockers);
  put('contract.warnings', s.health.contract.warnings);
  put('contract.decisionsPending', s.health.contract.decisionsPending);
  put('workflow.state', s.health.workflow.state);
  put('workflow.next', s.workflow && !s.workflow.legacy ? s.workflow.next.action : 'unknown');
  put('workflow.blockers', s.workflow && !s.workflow.legacy ? s.workflow.next.blockers.length : '—');
  put('workflow.pendingApprovals', s.health.workflow.pendingApprovals);
  return f;
}

module.exports = { SCHEMA, HEALTH_DEFINITIONS, RunHealthError, buildRunHealth, figuresOf };
