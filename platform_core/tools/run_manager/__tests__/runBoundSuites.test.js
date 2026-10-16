// PE-03 — run-bound Stage 3 suites. Several runs share one scope folder (`<root>/test_design/`); a run whose
// own Stage 3 is approved is bound to exactly the suites that approval recorded, and each suite is read with
// its own Traceability Matrix. A run without an approved Stage 3 of its own keeps the folder-wide rule.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const rs = require('../runState');
const gate = require('../stageGate');
const { createRun } = require('../createRun');
const { runBoundSuites, resolveSuiteMatrix } = require('../suiteBinding');
const { buildScopeItems } = require('../scopeApproval');
const { buildTraceGraph } = require('../traceGraph');
const { buildHistory } = require('../executionHistory');
const pf = require('../executionPreflight');
const fx = require('./approvalFixture');

const T0 = new Date('2026-10-11T09:00:00Z');
const at = (min) => new Date(T0.getTime() + min * 60000);
const SCOPE = { modules: ['shop'], moduleScope: 'single' };
const TD = 'modules/shop/test_design';
const PC = 'modules/shop/context/ProjectContext.md';

function header(status) { return `| Field | Value |\n|---|---|\n| Status | ${status} |\n`; }
function caseBlock(id, review = 'Approved') {
  return `### ${id} — ${id} works\n\n**Objective:** Verify ${id}.\n\n**Preconditions:** None.\n\n**Test Data:** None.\n\n**Steps:**\n\n1. Do it.\n\n` +
    `**Expected Result:** It works\n\n**Assertions:**\n\n| Assertion ID | Expected | Expected Source | Check | Requirement |\n|---|---|---|---|---|\n` +
    `| A1 | It works | Expected Result | equals | FR-1 |\n\n**Priority:** P1\n\n**Tags:** Atomic\n\n**Review:** ${review}\n\n**Automation:** Pending\n\n**Requires:** None\n`;
}
function writeSuite(ws, name, status, ids, review = 'Approved') {
  const rel = `${TD}/${name}`;
  const abs = path.join(ws.dataRoot, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `# Manual Test Suite — ${name}\n\n${header(status)}\n## Test Cases\n\n${ids.map((id) => caseBlock(id, review)).join('\n')}`);
  return rel;
}
function writeMatrix(ws, name, rows, status = 'Approved') {
  const rel = `${TD}/${name}`;
  const abs = path.join(ws.dataRoot, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `# Traceability Matrix\n\n${header(status)}\n| Test Case ID | Requirement Reference | Finding Reference |\n|---|---|---|\n${rows.map(([id, req]) => `| ${id} | ${req} | N/A |`).join('\n')}\n`);
  return rel;
}
const setStatus = (ws, rel, status) => {
  const abs = path.join(ws.dataRoot, rel);
  fs.writeFileSync(abs, fs.readFileSync(abs, 'utf8').replace(/^\| Status \| [^|]+\|$/m, `| Status | ${status} |`));
};
const meta = (ws, run) => JSON.parse(fs.readFileSync(path.join(ws.runsDir, run, 'metadata', 'run.json'), 'utf8'));
const root = (ws) => ({ label: 'shop', module: 'shop', dir: path.join(ws.dataRoot, 'modules', 'shop') });
const abs = (ws, rel) => path.join(ws.dataRoot, rel);
const gate4M = (ws, run) => gate.checkStageEntry(ws.runsDir, run, { stageId: '4M', invocationPath: 'Direct', now: at(900) });
const nonPreflight = (g) => g.blockers.filter((b) => !/^SAFETY_PREFLIGHT/.test(b));

function makeWorkspace() {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pe03-'));
  const runsDir = path.join(dataRoot, 'runs');
  fs.mkdirSync(runsDir, { recursive: true });
  return { dataRoot, runsDir };
}
const cleanup = (ws) => fs.rmSync(ws.dataRoot, { recursive: true, force: true });
let minute = 0;
const newRun = (ws, target) => createRun(ws.runsDir, { scope: 'Module', target, now: at(minute += 1), extraRunJson: SCOPE }).folderName;

function approveStage1(ws, run) {
  if (!fs.existsSync(abs(ws, PC))) { fs.mkdirSync(path.dirname(abs(ws, PC)), { recursive: true }); fs.writeFileSync(abs(ws, PC), `# Context\n\n${header('Pending Review')}\n| ID | Requirement |\n|---|---|\n| FR-1 | It works |\n| FR-2 | It also works |\n`); }
  setStatus(ws, PC, 'Pending Review');
  rs.startStage(ws.runsDir, run, { stageId: '1', invocationPath: 'Pipeline', now: at(minute += 1) });
  rs.requestApproval(ws.runsDir, run, { stageId: '1', artifacts: [PC], now: at(minute += 1) });
  setStatus(ws, PC, 'Approved');
  rs.approveStage(ws.runsDir, run, { stageId: '1', approvedBy: 'Jane Reviewer', now: at(minute += 1) });
}
/** Stage 3 of `run`: checkpoint suites (+ outputs); approved when `approve`. */
function stage3(ws, run, { suites, outputs = [], approve = true }) {
  rs.startStage(ws.runsDir, run, { stageId: '3', invocationPath: 'Direct (degraded)', now: at(minute += 1) });
  if (outputs.length) rs.recordStageArtifacts(ws.runsDir, run, { stageId: '3', artifacts: outputs, kind: 'output', now: at(minute += 1) });
  rs.requestApproval(ws.runsDir, run, { stageId: '3', artifacts: suites, now: at(minute += 1) });
  if (approve) {
    for (const s of suites) setStatus(ws, s, 'Approved');
    rs.approveStage(ws.runsDir, run, { stageId: '3', approvedBy: 'Jane Reviewer', now: at(minute += 1) });
  }
}

/**
 * Two runs, one folder: run A's suite (TC-1, TC-2) is still Waiting For Approval with the legacy
 * TraceabilityMatrix.md; run B's companion suite (TC-1, TC-3 — TC-1 deliberately shared) is approved with its
 * own TraceabilityMatrix_B.md.
 */
function twoRuns() {
  const ws = makeWorkspace();
  ws.A = newRun(ws, 'Alpha');
  ws.B = newRun(ws, 'Beta');
  approveStage1(ws, ws.A);
  ws.suiteA = writeSuite(ws, 'TestCases_Shop.md', 'Pending Review', ['TC-1', 'TC-2']);
  ws.tmA = writeMatrix(ws, 'TraceabilityMatrix.md', [['TC-1', 'FR-1'], ['TC-2', 'FR-1']]);
  stage3(ws, ws.A, { suites: [ws.suiteA], outputs: [ws.tmA], approve: false });
  approveStage1(ws, ws.B);
  ws.suiteB = writeSuite(ws, 'TestCases_Shop_Companion.md', 'Pending Review', ['TC-1', 'TC-3']);
  ws.tmB = writeMatrix(ws, 'TraceabilityMatrix_Companion.md', [['TC-1', 'FR-2'], ['TC-3', 'FR-2']]);
  stage3(ws, ws.B, { suites: [ws.suiteB], outputs: [ws.tmB] });
  return ws;
}

test('T1 — another run\'s pending suite in the same folder does not block a run bound to its own approved suite', () => {
  const ws = twoRuns();
  try {
    const g = gate4M(ws, ws.B);
    assert.deepEqual(nonPreflight(g), [], `unexpected blockers: ${nonPreflight(g).join(' | ')}`);
    assert.ok(g.checks.some((c) => c.stage === '3' && c.result === 'ok' && c.artifact === ws.suiteB), 'its own suite is checked and passes');
    const nb = g.checks.find((c) => c.result === 'not-bound');
    assert.ok(nb && nb.unboundArtifact === ws.suiteA, 'the other run\'s suite is listed as not bound');
    assert.equal(nb.artifact, undefined, 'an unbound suite carries no `artifact`, so it is never recorded as consumed');
    // Run A itself is still blocked — its own Stage 3 is waiting.
    assert.ok(gate4M(ws, ws.A).blockers.some((b) => /Stage 3 is Waiting For Approval/.test(b)));
  } finally { cleanup(ws); }
});

test('T2 — a bound suite edited after its approval still blocks (no weakening)', () => {
  const ws = twoRuns();
  try {
    fs.appendFileSync(abs(ws, ws.suiteB), '\nEdited after approval.\n');
    const g = gate4M(ws, ws.B);
    assert.ok(nonPreflight(g).some((b) => b.includes('TestCases_Shop_Companion.md')), `expected a blocker for the edited suite: ${nonPreflight(g).join(' | ')}`);
  } finally { cleanup(ws); }
});

test('T3 — a run whose own Stage 3 is Waiting For Approval stays blocked', () => {
  const ws = twoRuns();
  try {
    const C = newRun(ws, 'Gamma');
    approveStage1(ws, C);
    const s = writeSuite(ws, 'TestCases_Shop_Gamma.md', 'Pending Review', ['TC-9']);
    stage3(ws, C, { suites: [s], approve: false });
    const g = gate4M(ws, C);
    assert.ok(g.blockers.some((b) => /Stage 3 is Waiting For Approval in this run/.test(b)));
    assert.equal(runBoundSuites(meta(ws, C), root(ws), { dataRoot: ws.dataRoot }).basis, 'folder-fallback');
  } finally { cleanup(ws); }
});

test('T4 — legacy: a run with no Stage 3 of its own keeps the folder-wide rule, visibly', () => {
  const ws = twoRuns();
  try {
    const D = newRun(ws, 'Delta');
    approveStage1(ws, D);
    const b = runBoundSuites(meta(ws, D), root(ws), { dataRoot: ws.dataRoot });
    assert.equal(b.basis, 'folder-fallback');
    assert.equal(b.suites.length, 2, 'both suites in the folder');
    const g = gate4M(ws, D);
    assert.ok(nonPreflight(g).some((b2) => b2.includes('TestCases_Shop.md') && /Pending Review/.test(b2)), 'the pending suite still blocks a legacy run');
    assert.ok(g.checks.some((c) => c.result === 'folder-fallback' && /no Stage 3 of its own/.test(c.detail)), 'the fallback is stated in the diagnostics');
  } finally { cleanup(ws); }
});

test('T5 — executable scope and outcome contain only the bound suite\'s cases', () => {
  const ws = twoRuns();
  fx.autoPreflight(rs);
  try {
    rs.startStage(ws.runsDir, ws.B, { stageId: '4M', invocationPath: 'Direct', now: at(minute += 1) });
    const sc = meta(ws, ws.B).stages['4M'].entryGate.executableScope;
    assert.equal(sc.basis, 'approved-suite');
    assert.deepEqual(sc.cases, ['TC-1', 'TC-3']);
    assert.deepEqual(sc.suites, [ws.suiteB]);
    assert.equal(sc.suiteBinding[0].basis, 'run-approved');
    assert.deepEqual(sc.suiteBinding[0].unbound, [ws.suiteA]);
    fx.recordResultsOutcome(rs, ws.runsDir, ws.B, '4M', [['TC-1', 'Passed'], ['TC-3', 'Passed']], { now: at(minute += 1) });
    const h = buildHistory(ws.runsDir, ws.B, '4M');
    assert.deepEqual(h.identity.suites, [ws.suiteB], 'expected values come only from the bound suite');
    assert.deepEqual(h.tests.map((t) => t.testCaseId).sort(), ['TC-1', 'TC-3']);
    assert.ok(!h.conflicts.some((c) => /outside-approved-scope|ambiguous/.test(c.kind)), JSON.stringify(h.conflicts));
    assert.ok(!h.tests.some((t) => t.testCaseId === 'TC-2'), 'run A\'s case never appears in run B');
  } finally { cleanup(ws); }
});

test('T6 — the preflight binding follows the bound suite, not another run\'s files', () => {
  const ws = twoRuns();
  try {
    const facts = () => pf.scopeFacts(meta(ws, ws.B), ws.dataRoot).suites;
    const before = JSON.stringify(facts());
    assert.ok(facts().every((s) => !s.path.endsWith('/TestCases_Shop.md') && !s.path.endsWith('/TraceabilityMatrix.md')), 'run A\'s files are not part of run B\'s binding');
    fs.appendFileSync(abs(ws, ws.suiteA), '\nRun A edits its own suite.\n');
    fs.appendFileSync(abs(ws, ws.tmA), '\n');
    assert.equal(JSON.stringify(facts()), before, 'run A\'s edits do not move run B\'s binding');
    fs.appendFileSync(abs(ws, ws.suiteB), '\nRun B\'s suite changes.\n');
    assert.notEqual(JSON.stringify(facts()), before, 'a change to the bound suite does');
    // Legacy run: every Markdown file in the folder, as before.
    const D = newRun(ws, 'Delta');
    assert.equal(pf.scopeFacts(meta(ws, D), ws.dataRoot).suites.length, 4);
  } finally { cleanup(ws); }
});

test('T7 — a case ID present in both suites resolves to the bound suite only', () => {
  const ws = twoRuns();
  try {
    const items = buildScopeItems(abs(ws, ws.suiteB), { runsDir: ws.runsDir, preferMeta: meta(ws, ws.B) }).items;
    assert.deepEqual(items['TC-1'].dependsOn, ['FR-2'], 'TC-1 of the companion suite traces through its own matrix');
    const g = buildTraceGraph(ws.runsDir, ws.B);
    assert.equal(g.graphs[0].testCases['TC-1'].suite, 'TestCases_Shop_Companion.md');
    assert.equal(g.graphs[0].testCases['TC-2'], undefined, 'run A\'s case is not in run B\'s trace');
  } finally { cleanup(ws); }
});

test('T8 — a run whose Stage 3 approved several suites is bound to all of them', () => {
  const ws = twoRuns();
  fx.autoPreflight(rs);
  try {
    const E = newRun(ws, 'Epsilon');
    approveStage1(ws, E);
    const s1 = writeSuite(ws, 'TestCases_Shop_E1.md', 'Pending Review', ['TC-11']);
    const s2 = writeSuite(ws, 'TestCases_Shop_E2.md', 'Pending Review', ['TC-12']);
    stage3(ws, E, { suites: [s1, s2] });
    const b = runBoundSuites(meta(ws, E), root(ws), { dataRoot: ws.dataRoot });
    assert.equal(b.basis, 'run-approved');
    assert.deepEqual(b.suites.map((f) => path.basename(f)).sort(), ['TestCases_Shop_E1.md', 'TestCases_Shop_E2.md']);
    assert.equal(b.unbound.length, 2);
    assert.deepEqual(nonPreflight(gate4M(ws, E)), []);
    rs.startStage(ws.runsDir, E, { stageId: '4M', invocationPath: 'Direct', now: at(minute += 1) });
    assert.deepEqual(meta(ws, E).stages['4M'].entryGate.executableScope.cases, ['TC-11', 'TC-12']);
  } finally { cleanup(ws); }
});

test('T9 — each suite is read with the matrix its run recorded', () => {
  const ws = twoRuns();
  try {
    const mB = resolveSuiteMatrix(ws.runsDir, abs(ws, ws.suiteB), { preferMeta: meta(ws, ws.B), preferRun: ws.B });
    assert.equal(path.basename(mB.file), 'TraceabilityMatrix_Companion.md');
    assert.equal(mB.basis, 'recorded-by-run');
    const mA = resolveSuiteMatrix(ws.runsDir, abs(ws, ws.suiteA));
    assert.equal(path.basename(mA.file), 'TraceabilityMatrix.md');
    assert.equal(mA.basis, 'recorded');
    const g = buildTraceGraph(ws.runsDir, ws.B);
    assert.deepEqual(g.graphs[0].testCases['TC-3'].dependsOn, ['FR-2']);
    assert.equal(g.graphs[0].matrices[0].matrix, 'TraceabilityMatrix_Companion.md');
    assert.ok(!g.gaps.some((x) => x.kind === 'traceability-matrix-ambiguous'));
  } finally { cleanup(ws); }
});

test('matrix ambiguity is reported, never resolved by guessing', () => {
  const ws = twoRuns();
  try {
    // An unrecorded suite in a folder that holds two matrices.
    const loose = writeSuite(ws, 'TestCases_Shop_Loose.md', 'Approved', ['TC-21']);
    const r = resolveSuiteMatrix(ws.runsDir, abs(ws, loose));
    assert.equal(r.basis, 'ambiguous');
    assert.equal(r.file, null);
    const items = buildScopeItems(abs(ws, loose)).items;
    assert.equal(items['TC-21'].dependsOn, null, 'no matrix decided → dependencies unknown, not borrowed');
    assert.equal(buildScopeItems(abs(ws, loose)).matrix.basis, 'ambiguous');
    // Two runs recorded the same suite with different matrices.
    const F = newRun(ws, 'Zeta');
    approveStage1(ws, F);
    const tmF = writeMatrix(ws, 'TraceabilityMatrix_Zeta.md', [['TC-1', 'FR-1']]);
    stage3(ws, F, { suites: [ws.suiteB], outputs: [tmF], approve: false });
    const amb = resolveSuiteMatrix(ws.runsDir, abs(ws, ws.suiteB));
    assert.equal(amb.basis, 'ambiguous');
    assert.match(amb.detail, /TraceabilityMatrix_Companion\.md/);
    assert.match(amb.detail, /TraceabilityMatrix_Zeta\.md/);
    // The selected run's own record still decides for that run.
    assert.equal(path.basename(resolveSuiteMatrix(ws.runsDir, abs(ws, ws.suiteB), { preferMeta: meta(ws, ws.B) }).file), 'TraceabilityMatrix_Companion.md');
    // The folder-wide trace (impact analysis) reports the ambiguity as a gap.
    const D = newRun(ws, 'Delta');
    const g = buildTraceGraph(ws.runsDir, D);
    assert.ok(g.gaps.some((x) => x.kind === 'traceability-matrix-ambiguous' && x.item === 'TestCases_Shop_Loose.md'));
  } finally { cleanup(ws); }
});

test('legacy fallback: one TraceabilityMatrix.md and no records behaves exactly as before', () => {
  const ws = makeWorkspace();
  try {
    const s = writeSuite(ws, 'TestCases_Shop.md', 'Approved', ['TC-1']);
    writeMatrix(ws, 'TraceabilityMatrix.md', [['TC-1', 'FR-1']]);
    const r = resolveSuiteMatrix(ws.runsDir, abs(ws, s));
    assert.equal(r.basis, 'legacy-default');
    assert.deepEqual(buildScopeItems(abs(ws, s)).items['TC-1'].dependsOn, ['FR-1']);
    const L = newRun(ws, 'Legacy');
    const b = runBoundSuites(meta(ws, L), root(ws), { dataRoot: ws.dataRoot });
    assert.equal(b.basis, 'folder-fallback');
    assert.deepEqual(b.suites, [abs(ws, s)]);
  } finally { cleanup(ws); }
});
