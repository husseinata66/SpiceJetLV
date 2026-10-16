const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const rs = require('../runState');
// Phase 9.2 (F-16): execution-stage starts are preceded by the operator's Safety Preflight (approvalFixture).
require('./approvalFixture').autoPreflight(rs);
const gate = require('../stageGate');
const { createRun } = require('../createRun');
const { manifestPath, readAppliedEventSeq } = require('../runManifest');
const moduleRegistry = require('../../module_manager/moduleRegistry');
const { recordFixtureApproval, writeResults } = require('./approvalFixture');

const T0 = new Date('2026-10-08T09:00:00Z');
const at = (min) => new Date(T0.getTime() + min * 60000);

function makeWorkspace(extraRunJson = { modules: ['login'], moduleScope: 'single' }) {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-'));
  const runsDir = path.join(dataRoot, 'runs');
  fs.mkdirSync(runsDir, { recursive: true });
  const { folderName } = createRun(runsDir, { scope: 'Module', target: 'Login', now: T0, extraRunJson });
  return { dataRoot, runsDir, folderName };
}
const cleanup = (ws) => fs.rmSync(ws.dataRoot, { recursive: true, force: true });

function writeArtifact(dataRoot, rel, status, body = 'Body.') {
  const file = path.join(dataRoot, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `# Artifact\n\n| Field | Value |\n|---|---|\n| Status | ${status} |\n\n${body}\n`);
  return rel;
}

/** An upstream artifact approved THROUGH the run state model (a named, fingerprinted approval). */
function writeApproved(ws, rel, body) {
  writeArtifact(ws.dataRoot, rel, 'Approved', body);
  recordFixtureApproval(ws.dataRoot, rel);
  return rel;
}

const PC = 'modules/login/context/ProjectContext.md';
const QA = 'modules/login/discovery/QA_Assessment_Report.md';
const TC = 'modules/login/test_design/TestCases_Login.md';

const check = (ws, stageId, invocationPath, extra = {}) => gate.checkStageEntry(ws.runsDir, ws.folderName, { stageId, invocationPath, now: at(50), ...extra });
const start = (ws, stageId, invocationPath, extra = {}) => rs.startStage(ws.runsDir, ws.folderName, { stageId, invocationPath, now: at(50), ...extra });
const expectCode = (fn, code) => assert.throws(fn, (err) => err.code === code);

/** Runs a checkpointed stage through the gated lifecycle and records the approval. */
function gatedStage(ws, stageId, rel, minute, invocationPath = 'Pipeline') {
  writeArtifact(ws.dataRoot, rel, 'Pending Review');
  rs.startStage(ws.runsDir, ws.folderName, { stageId, invocationPath, now: at(minute) });
  rs.requestApproval(ws.runsDir, ws.folderName, { stageId, artifacts: [rel], now: at(minute + 1) });
  writeArtifact(ws.dataRoot, rel, 'Approved');
  return rs.approveStage(ws.runsDir, ws.folderName, { stageId, approvedBy: 'Jane Reviewer', now: at(minute + 2) });
}

// ---------------------------------------------------------------------------------------------
// Missing upstream approval
// ---------------------------------------------------------------------------------------------

test('an upstream artifact whose header is Pending blocks the stage, and the block is recorded with its reason', () => {
  const ws = makeWorkspace();
  try {
    writeArtifact(ws.dataRoot, PC, 'Pending Review');
    const g = check(ws, '2', 'Pipeline');
    assert.equal(g.decision, 'blocked');
    assert.equal(g.checks[0].result, 'pending');

    assert.throws(() => start(ws, '2', 'Pipeline'), (err) => err.code === 'GATE_BLOCKED' && err.recorded === true);
    const s = rs.readRunState(ws.runsDir, ws.folderName).stages['2'];
    assert.equal(s.status, 'Blocked');
    assert.match(s.reason, /Pending Review/);
  } finally { cleanup(ws); }
});

test('a missing upstream the stage cannot run without blocks it, even when invoked directly as degraded', () => {
  const ws = makeWorkspace();
  try {
    // Test Design without a Project Context: no requirement set to trace to (test-design-skill §… "No Project Context").
    const g = check(ws, '3', 'Direct (degraded)');
    assert.equal(g.decision, 'blocked');
    assert.ok(g.blockers.some((b) => /Stage 1 output is absent/.test(b)));
    // Stage 5A with no approved automation: nothing to execute.
    assert.equal(check(ws, '5A', 'Direct (degraded)', { conditions: { environmentSupplied: true } }).decision, 'blocked');
  } finally { cleanup(ws); }
});

test('a completed stage is never treated as approved: its header still decides', () => {
  const ws = makeWorkspace();
  try {
    gatedStage(ws, '1', PC, 1);
    assert.equal(check(ws, '2', 'Pipeline').decision, 'proceed');
    writeArtifact(ws.dataRoot, PC, 'Pending Review'); // sent back for revision outside this run
    assert.equal(rs.readRunState(ws.runsDir, ws.folderName).stages['1'].status, 'Completed');
    const g = check(ws, '2', 'Pipeline');
    assert.equal(g.decision, 'blocked');
    assert.equal(g.checks[0].result, 'pending');
  } finally { cleanup(ws); }
});

test('an upstream stage still in progress in this run blocks, whatever is on disk', () => {
  const ws = makeWorkspace();
  try {
    writeArtifact(ws.dataRoot, PC, 'Approved');
    start(ws, '1', 'Pipeline');
    rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '1', artifacts: [PC], now: at(51) });
    const g = check(ws, '2', 'Pipeline');
    assert.equal(g.decision, 'blocked');
    assert.equal(g.checks[0].result, 'in-progress');
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Approved artifact modified after approval
// ---------------------------------------------------------------------------------------------

test('the header alone cannot show an edit after approval — the fingerprint does', () => {
  const ws = makeWorkspace();
  try {
    gatedStage(ws, '1', PC, 1);
    const recorded = rs.readRunState(ws.runsDir, ws.folderName).stages['1'].approval.headerEvidence[0];
    assert.match(recorded.sha256, /^[0-9a-f]{64}$/);

    writeArtifact(ws.dataRoot, PC, 'Approved', 'Body, quietly changed after the reviewer approved it.');
    const g = check(ws, '2', 'Pipeline');
    assert.equal(g.decision, 'blocked');
    assert.equal(g.checks[0].result, 'modified');
    assert.equal(g.checks[0].integrity, 'mismatch');
    assert.match(g.blockers[0], /changed after it was approved by Jane Reviewer/);
    assert.equal(rs.verifyStageApproval(ws.runsDir, ws.folderName, '1').verified, false);
  } finally { cleanup(ws); }
});

test('a line-ending-only change is not an edit', () => {
  const ws = makeWorkspace();
  try {
    gatedStage(ws, '1', PC, 1);
    const file = path.join(ws.dataRoot, PC);
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/\n/g, '\r\n'));
    assert.equal(check(ws, '2', 'Pipeline').decision, 'proceed');
  } finally { cleanup(ws); }
});

test('a later run sees an approval recorded by an earlier run, and its fingerprint', () => {
  const ws = makeWorkspace();
  try {
    gatedStage(ws, '1', PC, 1);
    const { folderName: second } = createRun(ws.runsDir, { scope: 'Module', target: 'Login', now: at(30), extraRunJson: { modules: ['login'], moduleScope: 'single' } });
    let g = gate.checkStageEntry(ws.runsDir, second, { stageId: '2', invocationPath: 'Pipeline', now: at(31) });
    assert.equal(g.decision, 'proceed');
    assert.equal(g.checks[0].integrity, 'verified');
    writeArtifact(ws.dataRoot, PC, 'Approved', 'edited');
    g = gate.checkStageEntry(ws.runsDir, second, { stageId: '2', invocationPath: 'Pipeline', now: at(32) });
    assert.equal(g.checks[0].result, 'modified');
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Rejected and stale artifacts
// ---------------------------------------------------------------------------------------------

test('a Rejected or unrecognizable upstream header blocks', () => {
  const ws = makeWorkspace();
  try {
    writeArtifact(ws.dataRoot, PC, 'Rejected — missing scope');
    assert.equal(check(ws, '2', 'Pipeline').checks[0].result, 'rejected');
    writeArtifact(ws.dataRoot, PC, 'looks fine');
    assert.equal(check(ws, '2', 'Pipeline').checks[0].result, 'unverifiable');
  } finally { cleanup(ws); }
});

test('a stale upstream blocks unless a named human accepts it, and the acceptance is recorded', () => {
  const ws = makeWorkspace();
  try {
    const modulesDir = path.join(ws.dataRoot, 'modules');
    moduleRegistry.registerModule(modulesDir, { slug: 'login', name: 'Login', status: 'Active' }, { now: T0 });
    moduleRegistry.recordStage(modulesDir, 'login', 'context', { status: 'Approved' }, { now: at(1) });
    moduleRegistry.recordStage(modulesDir, 'login', 'test_design', { status: 'Approved' }, { now: at(2) });
    moduleRegistry.recordStage(modulesDir, 'login', 'context', { status: 'Approved' }, { now: at(3) }); // revised after the suite
    writeApproved(ws, PC);
    writeApproved(ws, TC);

    const g = check(ws, '4M', 'Pipeline');
    assert.equal(g.decision, 'blocked');
    assert.ok(g.checks.some((c) => c.stage === '3' && c.result === 'stale'));

    const res = start(ws, '4M', 'Pipeline', { acceptStaleBy: 'QA Lead' });
    const recorded = res.state.stages['4M'].entryGate;
    assert.equal(recorded.decision, 'proceed');
    assert.equal(recorded.acceptedStaleBy, 'QA Lead');
    assert.ok(recorded.checks.some((c) => c.result === 'stale-accepted'));
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Degraded-mode boundaries
// ---------------------------------------------------------------------------------------------

test('a degradable missing input proceeds only as Direct (degraded), never as Pipeline or plain Direct', () => {
  const ws = makeWorkspace();
  try {
    assert.equal(check(ws, '2', 'Pipeline').decision, 'blocked');
    assert.equal(check(ws, '2', 'Direct').decision, 'blocked');
    const g = check(ws, '2', 'Direct (degraded)');
    assert.equal(g.decision, 'degraded');
    assert.equal(g.gaps.length, 1);

    const res = start(ws, '2', 'Direct (degraded)');
    assert.equal(res.state.stages['2'].entryGate.decision, 'degraded');
    assert.equal(res.state.stages['2'].invocationPath, 'Direct (degraded)');
  } finally { cleanup(ws); }
});

test('a conditional degraded path opens only when its condition is declared', () => {
  const ws = makeWorkspace();
  try {
    // 4A without an approved suite: degraded only when the invocation names the test cases.
    assert.equal(check(ws, '4A', 'Direct (degraded)').decision, 'blocked');
    assert.equal(check(ws, '4A', 'Direct (degraded)', { conditions: { namedTestCases: true } }).decision, 'degraded');
    // 5H without 5A results: degraded only on the suite's own reports.
    assert.equal(check(ws, '5H', 'Direct (degraded)', { conditions: { environmentSupplied: true } }).decision, 'blocked');
    assert.equal(check(ws, '5H', 'Direct (degraded)', { conditions: { environmentSupplied: true, externalReports: true } }).decision, 'degraded');
    expectCode(() => check(ws, '5H', 'Direct', { conditions: { madeUp: true } }), 'INVALID_ARGUMENT');
  } finally { cleanup(ws); }
});

test('6A may report on a partial run, declared as degraded', () => {
  const ws = makeWorkspace();
  try {
    const g = check(ws, '6A', 'Direct (degraded)');
    assert.equal(g.decision, 'degraded');
    assert.ok(g.gaps.some((x) => /Stage 5A absent/.test(x)));
  } finally { cleanup(ws); }
});

test('Self-Healing never starts as a pipeline step, whatever its inputs', () => {
  const ws = makeWorkspace();
  try {
    writeApproved(ws, PC);
    writeArtifact(ws.dataRoot, `runs/${ws.folderName}/execution/ExecutionResults.md`, 'Complete');
    const g = check(ws, '5H', 'Pipeline');
    assert.equal(g.decision, 'blocked');
    assert.ok(g.blockers.some((b) => /explicit human invocation/.test(b)));
    assert.equal(check(ws, '5H', 'Direct').decision, 'proceed');
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Direct invocation and branch separation
// ---------------------------------------------------------------------------------------------

test('a direct invocation with approved inputs proceeds, and the path is recorded', () => {
  const ws = makeWorkspace();
  try {
    writeApproved(ws, PC);
    writeApproved(ws, TC);
    const res = start(ws, '4M', 'Direct', { instruction: 'smoke cases only' });
    const s = res.state.stages['4M'];
    assert.equal(s.status, 'Running');
    assert.equal(s.invocationPath, 'Direct');
    assert.equal(s.instruction, 'smoke cases only');
    assert.equal(s.entryGate.decision, 'proceed');
  } finally { cleanup(ws); }
});

test('neither branch requires the other: 4M and 4A gates never read each other\'s output', () => {
  for (const [stage, req] of Object.entries(gate.STAGE_REQUIREMENTS)) {
    const ups = req.upstream.map((u) => u.stage);
    if (stage === '4M') assert.ok(!ups.some((u) => ['4A', '5A', '5H', '6A'].includes(u)));
    if (['4A', '5A', '5H', '6A'].includes(stage)) assert.ok(!ups.includes('4M'));
  }
});

// ---------------------------------------------------------------------------------------------
// Stage lifecycle, gated end to end
// ---------------------------------------------------------------------------------------------

test('gated lifecycle 1 → 2 → 3: each start passes its gate and records the evidence it checked', () => {
  const ws = makeWorkspace();
  try {
    gatedStage(ws, '1', PC, 1);
    gatedStage(ws, '2', QA, 10);
    const res = gatedStage(ws, '3', TC, 20);
    const s3 = res.state.stages['3'];
    assert.equal(s3.status, 'Completed');
    assert.equal(s3.entryGate.decision, 'proceed');
    assert.deepEqual(s3.entryGate.checks.map((c) => [c.stage, c.result, c.integrity]), [['1', 'ok', 'verified'], ['2', 'ok', 'verified']]);
  } finally { cleanup(ws); }
});

test('the automation branch end to end: 5A and 6A complete only with their output registered', () => {
  const ws = makeWorkspace();
  try {
    writeApproved(ws, PC);
    const state = path.join(ws.dataRoot, 'modules/login/automation/.module_automation_state.json');
    fs.mkdirSync(path.dirname(state), { recursive: true });
    fs.writeFileSync(state, JSON.stringify({ state: 'Approved', approvedBy: 'Automation Lead', history: [{ state: 'Approved', at: '2026-10-08T09:00:00.000Z' }] }));
    start(ws, '5A', 'Pipeline');
    expectCode(() => rs.completeStage(ws.runsDir, ws.folderName, { stageId: '5A', now: at(51) }), 'NO_OUTPUT');
    const results = writeResults(ws.dataRoot, ws.folderName, '5A', [['TC-LOGIN-001', 'Failed']]);
    rs.recordStageArtifacts(ws.runsDir, ws.folderName, { stageId: '5A', artifacts: [results], now: at(52) });
    // Registered output is not enough: an execution stage completes only with an outcome from its results (F-02).
    expectCode(() => rs.completeStage(ws.runsDir, ws.folderName, { stageId: '5A', now: at(53) }), 'OUTCOME_NOT_FROM_RESULTS');
    rs.recordOutcomeFromResults(ws.runsDir, ws.folderName, { stageId: '5A', now: at(53) });
    rs.completeStage(ws.runsDir, ws.folderName, { stageId: '5A', now: at(53) });

    const g = check(ws, '6A', 'Pipeline');
    assert.ok(g.checks.some((c) => c.stage === '5A' && c.result === 'ok'));
  } finally { cleanup(ws); }
});

test('an automation state that is not Approved blocks 5A', () => {
  const ws = makeWorkspace();
  try {
    writeArtifact(ws.dataRoot, PC, 'Approved');
    const state = path.join(ws.dataRoot, 'modules/login/automation/.module_automation_state.json');
    fs.mkdirSync(path.dirname(state), { recursive: true });
    fs.writeFileSync(state, JSON.stringify({ state: 'Generated' }));
    const g = check(ws, '5A', 'Pipeline');
    assert.equal(g.decision, 'blocked');
    assert.equal(g.checks.find((c) => c.stage === '4A').result, 'pending');
  } finally { cleanup(ws); }
});

test('a run with no resolvable scope blocks a stage that needs module input, and --modules resolves it', () => {
  const ws = makeWorkspace({});
  try {
    writeApproved(ws, PC);
    const g = check(ws, '2', 'Pipeline');
    assert.equal(g.decision, 'blocked');
    assert.ok(g.blockers.some((b) => /scope unresolved/.test(b)));
    // The override names the scope, so it gets the registry rule a run's own scope gets (Phase 9.3):
    // an unregistered module is refused; once registered and approved, the override resolves it.
    const unregistered = check(ws, '2', 'Pipeline', { modules: ['login'] });
    assert.equal(unregistered.decision, 'blocked');
    assert.ok(unregistered.blockers.some((b) => /scope override refused: .*login/.test(b)));
    // eslint-disable-next-line global-require
    const reg = require('../../module_manager/moduleRegistry');
    const modulesDir = path.join(ws.dataRoot, 'modules');
    reg.proposeModules(modulesDir, [{ name: 'Login' }], { now: T0 });
    reg.approveModules(modulesDir, ['login'], { now: T0, approvedBy: 'QA Lead' });
    assert.equal(check(ws, '2', 'Pipeline', { modules: ['login'] }).decision, 'proceed');
  } finally { cleanup(ws); }
});

test('Supplier-Feature runs resolve to their Supplier or shared scope folder', () => {
  const meta = { scopeFamily: 'supplier-feature', feature: 'ancillaries', supplier: 'air-india', sharedScope: null };
  const { roots } = gate.resolveScopeRoots(meta, '/data');
  assert.equal(roots[0].dir, path.join('/data', 'supplier-features', 'ancillaries', 'suppliers', 'air-india'));
  const shared = gate.resolveScopeRoots({ ...meta, supplier: null, sharedScope: 'baseline' }, '/data');
  assert.equal(shared.roots[0].dir, path.join('/data', 'supplier-features', 'ancillaries', 'shared', 'baseline'));
  const feature = gate.resolveScopeRoots({ modules: ['agency'], moduleFeature: 'bulk-export' }, '/data');
  assert.equal(feature.roots[0].dir, path.join('/data', 'modules', 'agency', 'features', 'bulk-export'));
});

// ---------------------------------------------------------------------------------------------
// Manifest reconciliation after failure
// ---------------------------------------------------------------------------------------------

const historyRows = (ws) => fs.readFileSync(manifestPath(ws.runsDir, ws.folderName), 'utf8').split(/\r?\n/).filter((l) => /^\| \d+ \|/.test(l));

test('a failed Manifest write loses nothing: run.json keeps the event and the next change replays it once', () => {
  const ws = makeWorkspace();
  try {
    writeArtifact(ws.dataRoot, PC, 'Approved');
    rs._setTestHooks({ beforeManifestWrite: () => { throw new Error('disk full (injected)'); } });
    let res;
    try {
      res = start(ws, '1', 'Pipeline');
    } finally { rs._setTestHooks({}); }
    assert.equal(res.manifest.synced, false);
    assert.equal(res.state.stages['1'].status, 'Running', 'run.json is authoritative and was written');
    assert.equal(rs.readRunState(ws.runsDir, ws.folderName).manifest.pendingEvents, 1);

    res = rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '1', artifacts: [PC], now: at(51) });
    assert.equal(res.manifest.synced, true);
    assert.equal(res.manifest.replayed, 1);
    const rows = historyRows(ws);
    assert.equal(rows.length, 3, 'created + the missed start + request-approval');
    assert.match(rows[1], /Not Started → Running/);
    assert.match(rows[2], /Waiting For Approval/);
    assert.equal(rs.readRunState(ws.runsDir, ws.folderName).manifest.pendingEvents, 0);
  } finally { cleanup(ws); }
});

test('reconcile replays missed events once, and is a no-op when repeated', () => {
  const ws = makeWorkspace();
  try {
    writeArtifact(ws.dataRoot, PC, 'Approved');
    rs._setTestHooks({ beforeManifestWrite: () => { throw new Error('injected'); } });
    try {
      start(ws, '1', 'Pipeline');
      rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '1', artifacts: [PC], now: at(51) });
    } finally { rs._setTestHooks({}); }
    assert.equal(rs.readRunState(ws.runsDir, ws.folderName).manifest.pendingEvents, 2);

    const first = rs.reconcileManifest(ws.runsDir, ws.folderName, { now: at(52) });
    assert.equal(first.before, 0);
    assert.equal(first.after, 2);
    const once = historyRows(ws);
    const second = rs.reconcileManifest(ws.runsDir, ws.folderName, { now: at(53) });
    assert.equal(second.manifest.synced, true);
    assert.deepEqual(historyRows(ws), once, 'no duplicate history on retry');
    assert.equal(once.length, 3);
  } finally { cleanup(ws); }
});

test('a failure before run.json is written changes nothing anywhere', () => {
  const ws = makeWorkspace();
  try {
    writeArtifact(ws.dataRoot, PC, 'Approved');
    const runJsonBefore = fs.readFileSync(rs.runJsonPath(ws.runsDir, ws.folderName), 'utf8');
    const manifestBefore = fs.readFileSync(manifestPath(ws.runsDir, ws.folderName), 'utf8');
    rs._setTestHooks({ beforeRunJsonWrite: () => { throw new Error('crash (injected)'); } });
    try {
      assert.throws(() => start(ws, '1', 'Pipeline'), /injected/);
    } finally { rs._setTestHooks({}); }
    assert.equal(fs.readFileSync(rs.runJsonPath(ws.runsDir, ws.folderName), 'utf8'), runJsonBefore);
    assert.equal(fs.readFileSync(manifestPath(ws.runsDir, ws.folderName), 'utf8'), manifestBefore);
    assert.equal(fs.existsSync(rs.runLockPath(ws.runsDir, ws.folderName)), false, 'the lock is released on failure');
  } finally { cleanup(ws); }
});

test('a process killed between the two writes leaves a recoverable run: dead lock reclaimed at once, Manifest caught up', async () => {
  const ws = makeWorkspace();
  try {
    writeArtifact(ws.dataRoot, PC, 'Approved');
    const mod = JSON.stringify(path.resolve(__dirname, '../runState.js'));
    const script = `const rs=require(${mod});rs._setTestHooks({afterRunJsonWrite:()=>process.exit(9)});` +
      `rs.startStage(${JSON.stringify(ws.runsDir)},${JSON.stringify(ws.folderName)},{stageId:'1',invocationPath:'Pipeline',now:new Date()});`;
    const code = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['-e', script]);
      child.on('error', reject);
      child.on('exit', resolve);
    });
    assert.equal(code, 9, 'the child died mid-change');
    assert.equal(fs.existsSync(rs.runLockPath(ws.runsDir, ws.folderName)), true, 'it died holding the lock');
    assert.equal(rs.readRunState(ws.runsDir, ws.folderName).stages['1'].status, 'Running');
    assert.equal(readAppliedEventSeq(ws.runsDir, ws.folderName), 0);

    const t = Date.now();
    const res = rs.reconcileManifest(ws.runsDir, ws.folderName, { now: at(51), lock: { timeoutMs: 3000 } });
    assert.ok(Date.now() - t < 2000, 'a dead holder\'s lock is reclaimed without waiting out the stale window');
    assert.equal(res.after, 1);
    assert.equal(historyRows(ws).length, 2);
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Backward compatibility
// ---------------------------------------------------------------------------------------------

test('F-01: a header that reads Approved with no recorded approval never authorizes a downstream stage', () => {
  const ws = makeWorkspace();
  try {
    writeArtifact(ws.dataRoot, PC, '**Approved** — approved before the run state model existed');
    const g = check(ws, '2', 'Pipeline');
    assert.equal(g.decision, 'blocked');
    assert.equal(g.checks[0].result, 'unrecorded');
    assert.equal(g.checks[0].integrity, 'unrecorded');
    assert.ok(g.blockers.some((b) => /a header alone never authorizes a downstream stage/.test(b)));
    assert.ok(g.blockers.some((b) => /attest-legacy-approval/.test(b)), 'the blocker names the only legacy route');
  } finally { cleanup(ws); }
});

test('historical runs: the gate refuses them as LEGACY_RUN and never writes to them', () => {
  const ws = makeWorkspace();
  try {
    const legacy = 'run-001__legacy';
    const meta = path.join(ws.runsDir, legacy, 'metadata');
    fs.mkdirSync(meta, { recursive: true });
    fs.writeFileSync(path.join(meta, 'run.json'), JSON.stringify({ folderName: legacy, status: 'Preparing', modules: ['login'] }));
    const before = fs.readdirSync(meta);
    expectCode(() => gate.checkStageEntry(ws.runsDir, legacy, { stageId: '2', invocationPath: 'Pipeline', now: at(1) }), 'LEGACY_RUN');
    expectCode(() => rs.startStage(ws.runsDir, legacy, { stageId: '2', invocationPath: 'Pipeline', now: at(1) }), 'LEGACY_RUN');
    assert.deepEqual(fs.readdirSync(meta), before);
    // Scanning for recorded approvals reads historical runs without failing on them.
    assert.equal(gate.findRecordedApproval(ws.runsDir, path.join(ws.dataRoot, PC)), null);
  } finally { cleanup(ws); }
});

test('a Manifest written before the events marker existed is treated as showing none, and gains the marker', () => {
  const ws = makeWorkspace();
  try {
    const file = manifestPath(ws.runsDir, ws.folderName);
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/^<!-- run-state-events-applied: \d+ -->\r?\n/m, ''));
    assert.equal(readAppliedEventSeq(ws.runsDir, ws.folderName), 0);
    writeArtifact(ws.dataRoot, PC, 'Approved');
    start(ws, '1', 'Pipeline');
    assert.equal(readAppliedEventSeq(ws.runsDir, ws.folderName), 1);
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------------------------

test('CLI: `state gate` and `state start` exit 2 when blocked, 0 when they proceed', () => {
  const ws = makeWorkspace();
  try {
    const cli = path.resolve(__dirname, '../cli.js');
    const run = (...a) => spawnSync(process.execPath, [cli, 'state', ...a, '--run', ws.folderName, '--runs-dir', ws.runsDir], { encoding: 'utf8' });
    let r = run('gate', '2', '--invocation', 'Pipeline');
    assert.equal(r.status, 2);
    assert.match(r.stdout, /BLOCKED/i);
    r = run('start', '2', '--invocation', 'Pipeline');
    assert.equal(r.status, 2);
    assert.match(r.stderr, /recorded as Blocked/);
    r = run('start', '2', '--invocation', 'Direct (degraded)');
    assert.equal(r.status, 0, r.stderr);
    r = run('reconcile');
    assert.equal(r.status, 0, r.stderr);
  } finally { cleanup(ws); }
});
