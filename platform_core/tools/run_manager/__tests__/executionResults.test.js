// Phase 4 — immutable execution history, the unified status model, outcome recording from results,
// the capability gate, and report integrity.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const rs = require('../runState');
// Phase 9.2 (F-16): execution-stage starts are preceded by the operator's Safety Preflight (approvalFixture).
require('./approvalFixture').autoPreflight(rs);
const history = require('../executionHistory');
const status = require('../testStatus');
const integrity = require('../reportIntegrity');
const { writeVerifiedReport } = require('./reportFixture');
const { fingerprintFile } = require('../artifactHeader');
const planner = require('../workflowPlanner');
const gate = require('../stageGate');
const { createRun } = require('../createRun');
const rb = require('../../report_builder');
const capabilityCli = require('../../capability_gate/cli');

const T0 = new Date('2026-10-08T09:00:00Z');
let clock = 0;
const tick = () => new Date(T0.getTime() + (clock += 1) * 60000);

// Stages are started without their entry gate here (stageGate.test.js covers gates); results are the subject.
rs._setTestHooks({ skipEntryGate: true });

function makeWorkspace(extra = { modules: ['login'], moduleScope: 'single' }) {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'results-'));
  const runsDir = path.join(dataRoot, 'runs');
  fs.mkdirSync(runsDir, { recursive: true });
  const { folderName } = createRun(runsDir, { scope: 'Module', target: 'Login', now: T0, extraRunJson: extra });
  return { dataRoot, runsDir, folderName, runDir: path.join(runsDir, folderName) };
}
const cleanup = (ws) => fs.rmSync(ws.dataRoot, { recursive: true, force: true });
const put = (ws, rel, text) => { const f = path.join(ws.dataRoot, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); return rel; };
const runRel = (ws, rel) => `runs/${ws.folderName}/${rel}`;

/**
 * Assertion records (pipeline.md §11.4) for the rows recorded as Passed — one verified comparison each,
 * its expected value taken from the consumed fixture suite (consume() below). A row whose fifth
 * element is `false` gets none, to test a Passed with nothing to verify it.
 */
function assertionRecords(rows) {
  const passed = rows.filter(([, st, , , withAssertions = true]) => st === 'Passed' && withAssertions !== false);
  if (!passed.length) return [];
  return ['', '### Assertion Records', '',
    '| Test Case ID | Assertion | Expected | Expected Source | Actual | Check | Result | Evidence |',
    '|---|---|---|---|---|---|---|---|',
    ...passed.map(([id]) => `| ${id} | Outcome shown | \`done\` | — | \`done\` | equals | ✅ | — |`)];
}
/** A Stage 5A results file in the template's shape (`Status (§17)` header as real files use). */
function results5A(rows) {
  return ['# Execution Results', '', '## 3. Execution Results', '',
    '| Test Case ID | Automation Script ID | Status (§17) | Execution Time | Attempts | Failure Detail | Evidence Refs |',
    '|---|---|---|---|---|---|---|',
    ...rows.map(([id, st, detail = '—', ev = '—']) => `| ${id} | \`s::${id}\` | **${st}** | 1 s | 1 | ${detail} | ${ev} |`), ...assertionRecords(rows), ''].join('\n');
}
/** A Stage 4M results file in the template's shape. */
function results4M(rows) {
  return ['# Manual Execution Results', '', '## 3. Per-Test Results', '',
    '| Test Case ID | Module | Status | Execution Time | Reason (non-Passed) | Evidence Refs |',
    '|---|---|---|---|---|---|',
    ...rows.map(([id, st, reason = '—', ev = '—']) => `| ${id} | login | ${st} | < 5 min | ${reason} | ${ev} |`), ...assertionRecords(rows), ''].join('\n');
}

/**
 * These stages start without their entry gate (results are the subject here), so nothing records what they
 * consumed. consume() writes the approved suite the results are verified against and the consumed-artifact
 * reference the gate would have written — a fixture, the way a gated start records it (Phase 5.7).
 */
function consume(ws, id) {
  const meta = JSON.parse(fs.readFileSync(path.join(ws.runDir, 'metadata', 'run.json'), 'utf8'));
  const { roots } = gate.resolveScopeRoots(meta, ws.dataRoot);
  const ids = ['TC-1', 'TC-2', 'TC-3', 'TC-4', 'TC-5', 'TC-6', 'TC-7', 'TC-9', 'TC-10', 'TC-012'];
  const cases = ids.map((tc) => `### ${tc} — ${tc}\n\n**Objective:** o.\n\n**Preconditions:** p.\n\n**Test Data:** None.\n\n**Steps:**\n\n1. s.\n\n**Expected Result:** Outcome \`done\` is shown.\n\n**Priority:** P1\n\n**Tags:** t\n\n**Review:** Approved\n\n**Automation:** Approved\n`).join('\n');
  for (const root of roots) {
    const rel = path.relative(ws.dataRoot, path.join(root.dir, 'test_design', 'TestCases_fixture.md')).replace(/\\/g, '/');
    put(ws, rel, `# Test Cases\n\n| Field | Value |\n|---|---|\n| Status | Approved |\n\n${cases}`);
    meta.moduleArtifactRefs = [...(meta.moduleArtifactRefs || []), { stage: id, artifact: rel, upstreamStage: '3', sha256: fingerprintFile(path.join(ws.dataRoot, rel)), at: new Date().toISOString() }];
  }
  fs.writeFileSync(path.join(ws.runDir, 'metadata', 'run.json'), JSON.stringify(meta, null, 2));
}
function start(ws, id) {
  rs.startStage(ws.runsDir, ws.folderName, { stageId: id, invocationPath: 'Direct', ...(id === '5H' ? { by: 'QA Lead' } : {}), now: tick() });
  if (id === '4M' || id === '5A') consume(ws, id);
}
function register(ws, id, rel) { rs.recordStageArtifacts(ws.runsDir, ws.folderName, { stageId: id, artifacts: [rel], now: tick() }); }
const recordFrom = (ws, id) => rs.recordOutcomeFromResults(ws.runsDir, ws.folderName, { stageId: id, by: 'Run Manager', now: tick() });
const expectCode = (fn, code) => assert.throws(fn, (err) => err.code === code, `expected ${code}`);

// ---------------------------------------------------------------------------------------------
// The status model
// ---------------------------------------------------------------------------------------------

test('status model: every status has one meaning and category; synonyms keep the raw text; unknown is never a pass', () => {
  assert.deepEqual(status.normalizeStatus('PASS'), { status: 'Passed', raw: 'PASS', reason: null, recognized: true });
  assert.equal(status.normalizeStatus('Application Failure').status, 'Application Failure', 'never read as a bare Failure');
  const ex = status.normalizeStatus('Excluded — Not supported by supplier (Seat)');
  assert.equal(ex.status, 'Excluded');
  assert.match(ex.reason, /Not supported by supplier/);
  for (const raw of ['Error', 'Pending', 'Green']) assert.equal(status.normalizeStatus(raw).status, 'Unrecognized', raw);
  assert.equal(status.categoryOf('Automation Failure'), 'auto-failure');
  assert.equal(status.categoryOf('Environment Failure'), 'env-failure');
  assert.equal(status.categoryOf('Excluded'), 'not-applicable');
  for (const s of status.STATUS_NAMES) assert.ok(rs.OUTCOME_STATUSES.includes(s), `${s} is recordable`);
});

// ---------------------------------------------------------------------------------------------
// History: reruns, immutability
// ---------------------------------------------------------------------------------------------

test('multiple reruns: cycle 1, then rerun-N in numeric order (rerun-10 after rerun-2); every cycle kept per test', () => {
  const ws = makeWorkspace();
  try {
    put(ws, runRel(ws, 'execution/ExecutionResults.md'), results5A([['TC-1', 'Automation Failure'], ['TC-2', 'Passed']]));
    put(ws, runRel(ws, 'execution/ExecutionResults.rerun-10.md'), results5A([['TC-1', 'Passed']]));
    put(ws, runRel(ws, 'execution/ExecutionResults.rerun-2.md'), results5A([['TC-1', 'Automation Failure']]));
    const cycles = history.listCycles(ws.runDir, '5A');
    assert.deepEqual(cycles.map((c) => c.rerun), [null, 2, 10]);
    const h = history.buildHistory(ws.runsDir, ws.folderName, '5A');
    const t1 = h.tests.find((t) => t.testCaseId === 'TC-1');
    assert.deepEqual(t1.history.map((x) => `${x.cycle}:${x.status}`), ['1:Automation Failure', '2:Automation Failure', '3:Passed']);
    assert.equal(t1.firstStatus, 'Automation Failure');
  } finally { cleanup(ws); }
});

test('immutable original evidence: an edited or deleted recorded cycle is refused; a new rerun file is accepted', () => {
  const ws = makeWorkspace();
  try {
    start(ws, '5A');
    const orig = put(ws, runRel(ws, 'execution/ExecutionResults.md'), results5A([['TC-1', 'Application Failure', 'button missing']]));
    register(ws, '5A', orig);
    const first = recordFrom(ws, '5A').state.stages['5A'].outcome;
    assert.equal(first.cycles[0].file, orig);

    // A rerun is a new file: fine.
    register(ws, '5A', put(ws, runRel(ws, 'execution/ExecutionResults.rerun-1.md'), results5A([['TC-1', 'Application Failure', 'still missing']])));
    assert.equal(recordFrom(ws, '5A').state.stages['5A'].outcome.cycles.length, 2);

    // Rewriting the original to look better is refused.
    put(ws, orig, results5A([['TC-1', 'Passed']]));
    expectCode(() => recordFrom(ws, '5A'), 'RESULTS_MODIFIED');
    fs.rmSync(path.join(ws.dataRoot, orig));
    expectCode(() => recordFrom(ws, '5A'), 'RESULTS_MODIFIED');
  } finally { cleanup(ws); }
});

test('a completed stage\'s outputs are written once: overwriting the first report is refused, a rev-N is accepted', () => {
  const ws = makeWorkspace();
  try {
    start(ws, '6A');
    const first = runRel(ws, 'reporting/Final_QA_Report.md');
    writeVerifiedReport(ws.runsDir, ws.folderName, path.join(ws.dataRoot, first), { heading: '# Report v1' });
    register(ws, '6A', first);
    rs.completeStage(ws.runsDir, ws.folderName, { stageId: '6A', now: tick() });

    rs.reopenStage(ws.runsDir, ws.folderName, { stageId: '6A', by: 'Lead', reason: 'Stage 5H ran after the report', now: tick() });
    put(ws, first, '# Report rewritten\n');
    expectCode(() => rs.completeStage(ws.runsDir, ws.folderName, { stageId: '6A', now: tick() }), 'OUTPUT_OVERWRITTEN');

    put(ws, first, '# Report v1\n'); // restored exactly
    const rp = integrity.reportRevisionPath(ws.runsDir, ws.folderName);
    assert.equal(rp.revision, 1);
    assert.match(rp.md, /Final_QA_Report\.rev-1\.md$/);
    const rev1 = runRel(ws, 'reporting/Final_QA_Report.rev-1.md');
    writeVerifiedReport(ws.runsDir, ws.folderName, path.join(ws.dataRoot, rev1), { heading: '# Report revision 1' });
    register(ws, '6A', rev1);
    assert.equal(rs.completeStage(ws.runsDir, ws.folderName, { stageId: '6A', now: tick() }).state.stages['6A'].status, 'Completed');
    assert.equal(fs.readFileSync(path.join(ws.dataRoot, first), 'utf8'), '# Report v1\n', 'the first report is untouched');
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Flaky, repaired, quarantined
// ---------------------------------------------------------------------------------------------

test('flaky: failed, then passed in a rerun nothing repaired — Flaky, never a clean pass', () => {
  const ws = makeWorkspace();
  try {
    start(ws, '5A');
    register(ws, '5A', put(ws, runRel(ws, 'execution/ExecutionResults.md'), results5A([['TC-1', 'Automation Failure', 'timeout']])));
    register(ws, '5A', put(ws, runRel(ws, 'execution/ExecutionResults.rerun-1.md'), results5A([['TC-1', 'Passed']])));
    const o = recordFrom(ws, '5A').state.stages['5A'].outcome;
    assert.deepEqual(o.counts, { Flaky: 1 });
    assert.equal(o.verdict, 'passed-with-flaky');
    assert.equal(o.firstAttemptVerdict, 'failures');
  } finally { cleanup(ws); }
});

test('a 5H rerun pass with NO governed repair is never Automation Repaired (Phase 9.3) — Flaky, named, and never a clean verdict; 5A keeps its failure', () => {
  // The governed path — propose → approve → apply → validate, then Automation Repaired — is covered by
  // selfHealing.test.js and the Self-Healing E2E. Here the rerun is only registered as a 5H artifact.
  const ws = makeWorkspace();
  try {
    start(ws, '5A');
    register(ws, '5A', put(ws, runRel(ws, 'execution/ExecutionResults.md'), results5A([['TC-1', 'Automation Failure', 'locator moved'], ['TC-2', 'Passed']])));
    recordFrom(ws, '5A');
    start(ws, '5H');
    register(ws, '5H', put(ws, runRel(ws, 'execution/ExecutionResults.rerun-1.md'), results5A([['TC-1', 'Passed']])));
    const o5H = recordFrom(ws, '5H').state.stages['5H'].outcome;
    assert.equal(o5H.tests.find((x) => x.testCaseId === 'TC-1').final, 'Flaky');
    assert.ok(!('Automation Repaired' in o5H.counts));
    assert.ok(o5H.conflicts.some((c) => c.kind === 'repair-not-governed' && /TC-1/.test(c.detail)));
    assert.notEqual(o5H.verdict, 'passed-after-repair');
    assert.notEqual(o5H.verdict, 'all-passed');
    assert.equal(o5H.firstAttemptVerdict, 'failures');
    // 5A's own outcome is its own cycles only — a later stage never rewrites what 5A recorded.
    assert.equal(rs.readRunState(ws.runsDir, ws.folderName).stages['5A'].outcome.verdict, 'failures');
  } finally { cleanup(ws); }
});

test('a Repair Summary alone proves nothing, and an application failure that later "passes" is a conflict', () => {
  const ws = makeWorkspace();
  try {
    put(ws, 'modules/login/healing/RepairSummary.md', '# Repair Summary\n\nTC-1 fixed. TC-2 fixed.\n');
    start(ws, '5A');
    register(ws, '5A', put(ws, runRel(ws, 'execution/ExecutionResults.md'), results5A([['TC-1', 'Automation Failure'], ['TC-2', 'Application Failure', 'wrong total']])));
    start(ws, '5H');
    register(ws, '5H', put(ws, runRel(ws, 'execution/ExecutionResults.rerun-1.md'), results5A([['TC-2', 'Passed']])));
    const o = recordFrom(ws, '5H').state.stages['5H'].outcome;
    assert.equal(o.tests.find((t) => t.testCaseId === 'TC-1').final, 'Automation Failure', 'no rerun result → still failing, whatever the summary says');
    assert.equal(o.conflicts[0].kind, 'application-failure-later-passed');
    assert.notEqual(o.verdict, 'passed-after-repair');
  } finally { cleanup(ws); }
});

test('quarantined: a test in the Quarantine Register reads Quarantined — not verified, never a pass', () => {
  const ws = makeWorkspace();
  try {
    put(ws, 'modules/login/healing/QuarantineRegister.md', '# Quarantine Register\n\n## 1. Currently Quarantined\n\n| Test Case | Script | Attempts |\n|---|---|---|\n| TC-1 | s | 3 |\n\n## 2. Attempt History\n');
    start(ws, '5A');
    register(ws, '5A', put(ws, runRel(ws, 'execution/ExecutionResults.md'), results5A([['TC-1', 'Passed'], ['TC-2', 'Passed']])));
    const o = recordFrom(ws, '5A').state.stages['5A'].outcome;
    assert.deepEqual(o.counts, { Quarantined: 1, Passed: 1 });
    assert.equal(o.verdict, 'incomplete');
    assert.ok(o.sources.quarantineRegisters.length === 1);
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Capability gate
// ---------------------------------------------------------------------------------------------

const SUPPLIER_RUN = { scopeFamily: 'supplier-feature', feature: 'ancillaries', supplier: 'air-india', sharedScope: null };
const capabilityPlan = (ids) => `# Capability Plan\n\n## Will run (1)\n\n\`TC-1\`\n\n## Excluded — not supported by supplier (${ids.length})\n\n| Test Case ID | Title | Reason |\n|---|---|---|\n${ids.map((id) => `| ${id} | t | Requires Seat; supplier: Not Supported |`).join('\n')}\n`;

test('capability exclusions: excluded cases read Excluded, stay out of the denominator, and executing one is a conflict', () => {
  const ws = makeWorkspace(SUPPLIER_RUN);
  try {
    put(ws, runRel(ws, 'metadata/CapabilityPlan.md'), capabilityPlan(['TC-3', 'TC-4']));
    start(ws, '5A');
    register(ws, '5A', put(ws, runRel(ws, 'execution/ExecutionResults.md'), results5A([['TC-1', 'Passed'], ['TC-4', 'Failed', 'seat map absent']])));
    const o = recordFrom(ws, '5A').state.stages['5A'].outcome;
    assert.equal(o.tests.find((t) => t.testCaseId === 'TC-3').final, 'Excluded');
    assert.match(o.tests.find((t) => t.testCaseId === 'TC-3').reason, /Not supported by supplier/);
    // Phase 5.6B (finding #7): an excluded case recorded anyway is still Excluded — never an application
    // failure, outside the denominator — and the recorded result is kept as evidence, with a conflict.
    assert.equal(o.health.coverage.notApplicable, 2);
    assert.equal(o.health.coverage.executable, 1, 'Excluded is outside the executable denominator');
    assert.equal(o.health.application.failures, 0);
    assert.equal(o.conflicts.find((c) => c.testCaseId === 'TC-4').kind, 'unsupported-capability-executed');
    const tc4 = o.tests.find((t) => t.testCaseId === 'TC-4');
    assert.equal(tc4.final, 'Excluded');
    assert.deepEqual(tc4.cycles, ['1:Failed'], 'the recorded status is kept in the history');
    assert.equal(o.verdict, 'incomplete');
  } finally { cleanup(ws); }
});

test('capability gate: a Supplier run cannot start 5A without its Capability Plan', () => {
  const ws = makeWorkspace(SUPPLIER_RUN);
  try {
    const g = gate.checkStageEntry(ws.runsDir, ws.folderName, { stageId: '5A', invocationPath: 'Direct', now: tick() });
    assert.ok(g.blockers.some((b) => /capability plan missing/.test(b)));
    // Phase 9.2 (F-13): a plan merely being present is not enough — a hand-written, unbound plan blocks.
    put(ws, runRel(ws, 'metadata/CapabilityPlan.md'), capabilityPlan([]));
    const g2 = gate.checkStageEntry(ws.runsDir, ws.folderName, { stageId: '5A', invocationPath: 'Direct', now: tick() });
    assert.ok(!g2.blockers.some((b) => /capability plan missing/.test(b)));
    assert.ok(g2.blockers.some((b) => /carries no binding/.test(b)), g2.blockers.join('\n'));
    // A plan generated for THIS run's registered Supplier is bound and accepted.
    const sfDir = path.join(ws.dataRoot, 'supplier-features');
    require('../../module_manager/moduleRegistry').registerModule(sfDir, { slug: 'ancillaries', name: 'Ancillaries', status: 'Active' }, { now: tick() });
    const sr = require('../../module_manager/supplierRegistry');
    sr.proposeSupplier(sfDir, 'ancillaries', { name: 'Air India', slug: 'air-india' }, { now: tick() });
    sr.approveSuppliers(sfDir, 'ancillaries', ['air-india'], { now: tick(), approvedBy: 'Supplier PO' });
    const suite = put(ws, 'supplier-features/ancillaries/suppliers/air-india/test_design/TestCases_AirIndia.md', '# suite\n');
    capabilityCli.main(['plan', '--suite', path.join(ws.dataRoot, suite), '--feature', 'ancillaries', '--supplier', 'air-india', '--run', ws.folderName, '--runs-dir', ws.runsDir, '--supplier-features-dir', sfDir]);
    const g3 = gate.checkStageEntry(ws.runsDir, ws.folderName, { stageId: '5A', invocationPath: 'Direct', now: tick() });
    assert.ok(g3.checks.some((c) => c.stage === 'capability' && c.result === 'ok'), JSON.stringify(g3.checks.filter((c) => c.stage === 'capability')));
  } finally { cleanup(ws); }
});

test('capability CLI: `plan --run <run>` resolves Feature, Supplier and suite from the run (the documented form)', () => {
  const ws = makeWorkspace(SUPPLIER_RUN);
  try {
    const suite = put(ws, 'supplier-features/ancillaries/suppliers/air-india/test_design/TestCases_AirIndia.md', '# suite\n');
    const filled = capabilityCli.fillFromRun({ _: ['plan'], run: ws.folderName }, ws.dataRoot);
    assert.deepEqual([filled.feature, filled.supplier, path.relative(ws.dataRoot, filled.suite).replace(/\\/g, '/')], ['ancillaries', 'air-india', suite]);
    put(ws, 'supplier-features/ancillaries/suppliers/air-india/test_design/TestCases_Other.md', '# second\n');
    assert.throws(() => capabilityCli.fillFromRun({ _: ['plan'], run: ws.folderName }, ws.dataRoot), /found 2 TestCases_/);
  } finally { cleanup(ws); }
  const classic = makeWorkspace();
  try {
    assert.throws(() => capabilityCli.fillFromRun({ _: ['plan'], run: classic.folderName }, classic.dataRoot), /not a Supplier-Feature run/);
  } finally { cleanup(classic); }
});

// ---------------------------------------------------------------------------------------------
// Missing evidence, mixed outcomes, dependencies
// ---------------------------------------------------------------------------------------------

test('missing evidence: a Passed with no assertion records reads Unverified; no results file or no table records nothing', () => {
  const ws = makeWorkspace();
  try {
    start(ws, '4M');
    expectCode(() => recordFrom(ws, '4M'), 'NO_RESULTS');
    put(ws, runRel(ws, 'manual_execution/ManualExecutionResults.md'), '# Manual Execution Results\n\nAll good.\n');
    expectCode(() => recordFrom(ws, '4M'), 'NO_RESULTS');
    put(ws, runRel(ws, 'manual_execution/ManualExecutionResults.md'), results4M([['TC-1', 'Passed'], ['TC-2', 'Passed', '—', '—', false]]));
    const o = recordFrom(ws, '4M').state.stages['4M'].outcome;
    assert.deepEqual(o.counts, { Passed: 1, Unverified: 1 });
    assert.equal(o.verdict, 'incomplete');
  } finally { cleanup(ws); }
});

test('mixed outcomes: health reported apart; a blocked test names its dependency and is not a failure', () => {
  const ws = makeWorkspace();
  try {
    start(ws, '5A');
    register(ws, '5A', put(ws, runRel(ws, 'execution/ExecutionResults.md'), results5A([
      ['TC-1', 'Application Failure', 'total wrong'],
      ['TC-2', 'Automation Failure', 'stale locator'],
      ['TC-3', 'Environment Failure', 'API down'],
      ['TC-4', 'Blocked — depends on TC-1', 'depends on TC-1'],
      ['TC-5', 'Application Failure', 'depends on TC-1 — order not created'],
      ['TC-6', 'Passed'],
      ['TC-7', 'Error'],
    ])));
    const o = recordFrom(ws, '5A').state.stages['5A'].outcome;
    assert.equal(o.health.application.failures, 2);
    assert.equal(o.health.application.independentFailures, 1, 'TC-5 failed because TC-1 did — not an independent defect');
    assert.equal(o.health.automation.failures, 1);
    assert.equal(o.health.environment.failures, 1);
    assert.deepEqual(o.blocked[0].blockedBy, ['TC-1']);
    assert.deepEqual(o.dependentFailures, [{ testCaseId: 'TC-5', dependsOn: ['TC-1'] }]);
    assert.equal(o.counts.Unrecognized, 1);
    assert.equal(o.unrecognized[0].raw, 'Error');
    assert.equal(o.verdict, 'failures');
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Manual and Automation result formats
// ---------------------------------------------------------------------------------------------

test('result formats: the 4M template table, the numbered "Test Case / Observed" variant, and the 5A table all parse', () => {
  const tmpl = history.parseResultsTable(results4M([['TC-1', 'Passed'], ['TC-2', 'Excluded — Not supported by supplier']]));
  assert.deepEqual(tmpl.map((r) => r.status), ['Passed', 'Excluded']);
  const numbered = history.parseResultsTable('| # | Test Case | Module | Expected | Observed | Status |\n|---|---|---|---|---|---|\n| 1 | **TC-9** | m | shown | **shown** | **Passed** (exploratory) |\n| 2 | TC-10 | m | hidden | — | Passed |\n');
  assert.deepEqual(numbered.map((r) => [r.testCaseId, r.status, Boolean(r.evidence)]), [['TC-9', 'Passed', true], ['TC-10', 'Passed', false]]);
  const auto = history.parseResultsTable(results5A([['TC-1', 'Automation Failure', 'x']]));
  assert.equal(auto[0].reason, 'x');
  // Tables that are not per-test results are skipped (evidence inventory, roll-ups).
  assert.deepEqual(history.parseResultsTable('| Test Case ID | Evidence Type | Path |\n|---|---|---|\n| TC-1 | Screenshot | a.png |\n'), []);
});

// ---------------------------------------------------------------------------------------------
// Report integrity
// ---------------------------------------------------------------------------------------------

function reportModel(counts, extra = {}) {
  return {
    title: 'Final QA Report',
    statuses: Object.keys(counts).map((k) => ({ key: k.toUpperCase().replace(/ /g, '_'), label: k, tone: k === 'Passed' ? 'pass' : 'fail' })),
    summary: { counts: Object.entries(counts).map(([k, v]) => ({ status: k.toUpperCase().replace(/ /g, '_'), value: v })) },
    ...extra,
  };
}

test('report revisions: the first report, then rev-1, rev-2 — never a path that exists', () => {
  const ws = makeWorkspace();
  try {
    assert.match(integrity.reportRevisionPath(ws.runsDir, ws.folderName).md, /Final_QA_Report\.md$/);
    put(ws, runRel(ws, 'reporting/Final_QA_Report.md'), 'x');
    assert.match(integrity.reportRevisionPath(ws.runsDir, ws.folderName).md, /rev-1\.md$/);
    put(ws, runRel(ws, 'reporting/Final_QA_Report.rev-1.md'), 'x');
    const rp = integrity.reportRevisionPath(ws.runsDir, ws.folderName);
    assert.equal(rp.revision, 2);
    assert.deepEqual(rp.previous, ['Final_QA_Report.md', 'Final_QA_Report.rev-1.md']);
    assert.ok(!fs.existsSync(rp.md));
  } finally { cleanup(ws); }
});

test('report agreement: Markdown, JSON and HTML must agree with each other and the recorded outcome', () => {
  const ws = makeWorkspace();
  try {
    const outcome = { counts: { Passed: 8, Failed: 2 }, verdict: 'failures' };
    const model = reportModel(outcome.counts, { statusPill: 'COMPLETE', outcomeVerdict: 'failures' });
    const json = path.join(ws.dataRoot, put(ws, runRel(ws, 'reporting/Final_QA_Report.report.json'), JSON.stringify(model)));
    const html = path.join(ws.dataRoot, put(ws, runRel(ws, 'reporting/Final_QA_Report.html'), rb.renderReport(model)));
    const md = path.join(ws.dataRoot, put(ws, runRel(ws, 'reporting/Final_QA_Report.md'), '# Report\n\n| Status | Count |\n|---|---|\n| Passed | 8 |\n| Failed | 2 |\n| Blocked | 0 |\n'));
    assert.deepEqual(integrity.checkReportConsistency({ md, json, html, outcome }), { ok: true, issues: [] });

    fs.writeFileSync(json, JSON.stringify(reportModel({ Passed: 10 }, { outcomeVerdict: 'failures' })));
    const r = integrity.checkReportConsistency({ md, json, html, outcome });
    assert.ok(r.issues.some((i) => /was not built from the current/.test(i)), 'HTML from a different model');
    assert.ok(r.issues.some((i) => /counts .* differ from the recorded outcome/.test(i)));
    fs.writeFileSync(md, '| Status | Count |\n|---|---|\n| Passed | 10 |\n');
    assert.ok(integrity.checkReportConsistency({ md, json: json, outcome }).issues.some((i) => /Final_QA_Report\.md: counts/.test(i)));
  } finally { cleanup(ws); }
});

test('no green success indicator on an unknown or failing outcome', () => {
  // The default is no longer green.
  assert.equal(rb.normalizeModel(reportModel({ Passed: 1 }, { statusPill: 'DONE' })).statusPill.tone, 'neutral');
  // Green needs a declared all-passed verdict…
  assert.throws(() => rb.normalizeModel(reportModel({ Passed: 1 }, { statusPill: 'DONE', statusPillTone: 'pass' })), /outcomeVerdict is not declared/);
  assert.throws(() => rb.normalizeModel(reportModel({ Passed: 1, Blocked: 1 }, { statusPill: 'DONE', statusPillTone: 'pass', outcomeVerdict: 'incomplete' })), /needs an all-passed outcome/);
  // …that its own counts do not contradict.
  assert.throws(() => rb.normalizeModel(reportModel({ Passed: 3, Failed: 1 }, { outcomeVerdict: 'all-passed' })), /counts 1 Failed/);
  assert.equal(rb.normalizeModel(reportModel({ Passed: 3, Excluded: 2 }, { statusPill: 'DONE', statusPillTone: 'pass', outcomeVerdict: 'all-passed' })).statusPill.tone, 'pass');
});

// ---------------------------------------------------------------------------------------------
// Historical compatibility
// ---------------------------------------------------------------------------------------------

test('historical runs: their legacy results read as cycle 1 + reruns, unattributed recoveries kept as recorded, never written', () => {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'legacy-results-'));
  const runsDir = path.join(dataRoot, 'runs');
  try {
    const run = 'run-003__legacy';
    const meta = path.join(runsDir, run, 'metadata');
    fs.mkdirSync(meta, { recursive: true });
    fs.writeFileSync(path.join(meta, 'run.json'), JSON.stringify({ folderName: run, status: 'Preparing' }));
    const exec = path.join(runsDir, run, 'execution');
    fs.mkdirSync(exec);
    fs.writeFileSync(path.join(exec, 'ExecutionResults.md'), results5A([['TC-1', 'Automation Failure']]));
    fs.writeFileSync(path.join(exec, 'ExecutionResults.rerun-1.md'), results5A([['TC-1', 'Passed', '— (fixed by REPAIR-1)']]));
    const snapshot = () => fs.readdirSync(exec).map((n) => fs.readFileSync(path.join(exec, n), 'utf8')).join('|');
    const before = snapshot();
    const h = history.buildHistory(runsDir, run, '5A');
    assert.equal(h.cycles.length, 2);
    // A legacy run records no consumed suite version, so its rerun pass cannot be verified (Phase 5.7) —
    // and a free-text "fixed by" note is never a recorded repair either way.
    assert.equal(h.tests[0].finalStatus, 'Unverified');
    assert.notEqual(h.tests[0].finalStatus, 'Automation Repaired', 'a free-text "fixed by" note is not a recorded repair');
    assert.deepEqual(h.tests[0].history.map((x) => x.status), ['Automation Failure', 'Passed'], 'the recorded statuses are kept');
    expectCode(() => rs.recordOutcomeFromResults(runsDir, run, { stageId: '5A', now: tick() }), 'LEGACY_RUN');
    assert.equal(snapshot(), before);
  } finally { fs.rmSync(dataRoot, { recursive: true, force: true }); }
});
