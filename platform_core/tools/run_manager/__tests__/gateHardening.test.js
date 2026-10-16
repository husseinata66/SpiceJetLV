// Phase 2.1 — gate hardening: partial approvals, approval history, the automation approval cross-check,
// bypass resistance, and append-only gate evidence.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const rs = require('../runState');
// Phase 9.2 (F-16): execution-stage starts are preceded by the operator's Safety Preflight (approvalFixture).
require('./approvalFixture').autoPreflight(rs);
const gate = require('../stageGate');
const { createRun } = require('../createRun');
const { manifestPath } = require('../runManifest');
const moduleRegistry = require('../../module_manager/moduleRegistry');
const automationState = require('../../module_manager/automationState');
const { recordFixtureApproval } = require('./approvalFixture');

const T0 = new Date('2026-10-08T09:00:00Z');
const at = (min) => new Date(T0.getTime() + min * 60000);
const SCOPE = { modules: ['login'], moduleScope: 'single' };

function makeWorkspace() {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harden-'));
  const runsDir = path.join(dataRoot, 'runs');
  fs.mkdirSync(runsDir, { recursive: true });
  const { folderName } = createRun(runsDir, { scope: 'Module', target: 'Login', now: T0, extraRunJson: SCOPE });
  return { dataRoot, runsDir, folderName, modulesDir: path.join(dataRoot, 'modules') };
}
const newRun = (ws, minute) => createRun(ws.runsDir, { scope: 'Module', target: 'Login', now: at(minute), extraRunJson: SCOPE }).folderName;
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
const TC = 'modules/login/test_design/TestCases_Login.md';
const PLAN = 'modules/login/automation/AutomationPlan_SHAFT.md';

const check = (ws, run, stageId, extra = {}) => gate.checkStageEntry(ws.runsDir, run, { stageId, invocationPath: 'Pipeline', now: at(500), ...extra });
const expectCode = (fn, code) => assert.throws(fn, (err) => err.code === code, `expected ${code}`);

function approveStage1(ws, run, minute) {
  writeArtifact(ws.dataRoot, PC, 'Pending Review');
  rs.startStage(ws.runsDir, run, { stageId: '1', invocationPath: 'Pipeline', now: at(minute) });
  rs.requestApproval(ws.runsDir, run, { stageId: '1', artifacts: [PC], now: at(minute + 1) });
  writeArtifact(ws.dataRoot, PC, 'Approved');
  rs.approveStage(ws.runsDir, run, { stageId: '1', approvedBy: 'Jane Reviewer', now: at(minute + 2) });
}

// ---------------------------------------------------------------------------------------------
// Partial approvals
// ---------------------------------------------------------------------------------------------

test('a header that records an approval AND an open item is Mixed, and blocks (the agency/branch shapes)', () => {
  const ws = makeWorkspace();
  try {
    const shapes = [
      '**Approved** — Revision 5, 2026-09-24. **`PO-30` (2026-10-01): Pending Review** for one item',
      '**`PO-30` (2026-10-01) — Pending Review**; everything else as below. **Approved** — Stage 2 additions',
      '**Approved** — Stage 3 gate. Revision 5: TC-076 … 085 reset to `Pending`',
    ];
    for (const status of shapes) {
      writeArtifact(ws.dataRoot, PC, status);
      const g = check(ws, ws.folderName, '2');
      assert.equal(g.decision, 'blocked', status);
      assert.equal(g.checks[0].result, 'mixed', status);
    }
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Approval history: a header edited by hand is not a recorded approval
// ---------------------------------------------------------------------------------------------

test('an approval withdrawn by a reopen stays withdrawn when the header still reads Approved', () => {
  const ws = makeWorkspace();
  try {
    approveStage1(ws, ws.folderName, 1);
    rs.reopenStage(ws.runsDir, ws.folderName, { stageId: '1', by: 'PO', reason: 'requirement changed', now: at(10) });
    const other = newRun(ws, 20);
    const g = check(ws, other, '2');
    assert.equal(g.decision, 'blocked');
    assert.equal(g.checks[0].result, 'withdrawn');
    assert.match(g.checks[0].detail, /withdrawn by PO/);
  } finally { cleanup(ws); }
});

test('a recorded rejection is not overridden by flipping the header to Approved', () => {
  const ws = makeWorkspace();
  try {
    writeArtifact(ws.dataRoot, PC, 'Pending Review');
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Pipeline', now: at(1) });
    rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '1', artifacts: [PC], now: at(2) });
    rs.rejectStage(ws.runsDir, ws.folderName, { stageId: '1', rejectedBy: 'BA', feedback: 'wrong scope', now: at(3) });
    writeArtifact(ws.dataRoot, PC, 'Approved'); // edited by hand, no decision recorded
    const g = check(ws, newRun(ws, 10), '2');
    assert.equal(g.checks[0].result, 'rejected');
    assert.match(g.checks[0].detail, /rejected by BA/);
  } finally { cleanup(ws); }
});

test('an approval still open in another run is not satisfied by the header alone', () => {
  const ws = makeWorkspace();
  try {
    writeArtifact(ws.dataRoot, PC, 'Pending Review');
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Pipeline', now: at(1) });
    rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '1', artifacts: [PC], now: at(2) });
    writeArtifact(ws.dataRoot, PC, 'Approved');
    const g = check(ws, newRun(ws, 10), '2');
    assert.equal(g.checks[0].result, 'pending');
    assert.equal(g.checks[0].integrity, 'open-review');
  } finally { cleanup(ws); }
});

test('F-01: an artifact approved outside the run state model is blocked, and the block names the legacy attestation route', () => {
  const ws = makeWorkspace();
  try {
    writeArtifact(ws.dataRoot, PC, 'Approved'); // approved before the run state model existed
    const g = check(ws, ws.folderName, '2');
    assert.equal(g.decision, 'blocked');
    assert.equal(g.checks[0].result, 'unrecorded');
    assert.notEqual(g.checks[0].integrity, 'verified');
    assert.ok(g.blockers.some((b) => /attest-legacy-approval/.test(b)));

    expectCode(() => rs.startStage(ws.runsDir, ws.folderName, { stageId: '2', invocationPath: 'Pipeline', now: at(1) }), 'GATE_BLOCKED');
    assert.equal(rs.readRunState(ws.runsDir, ws.folderName).stages['2'].status, 'Blocked');
  } finally { cleanup(ws); }
});

test('revisions after a completed run: modified blocks, and a re-approval in a later run verifies again', () => {
  const ws = makeWorkspace();
  try {
    approveStage1(ws, ws.folderName, 1);
    writeArtifact(ws.dataRoot, PC, 'Approved', 'Revised after run 1 approved it.');
    const later = newRun(ws, 20);
    assert.equal(check(ws, later, '2').checks[0].result, 'modified');

    // The revision goes through its gate again, in the later run.
    writeArtifact(ws.dataRoot, PC, 'Pending Review', 'Revised after run 1 approved it.');
    rs.startStage(ws.runsDir, later, { stageId: '1', invocationPath: 'Pipeline', now: at(21) });
    rs.requestApproval(ws.runsDir, later, { stageId: '1', artifacts: [PC], now: at(22) });
    writeArtifact(ws.dataRoot, PC, 'Approved', 'Revised after run 1 approved it.');
    // Phase 5: re-approving a changed, previously approved artifact needs an approved impact decision.
    expectCode(() => rs.approveStage(ws.runsDir, later, { stageId: '1', approvedBy: 'Jane Reviewer', now: at(23) }), 'IMPACT_ANALYSIS_REQUIRED');
    const analysis = require('../changeImpact').analyzeImpact(ws.runsDir, { artifact: PC, changed: ['§1'] });
    rs.recordImpactDecision(ws.runsDir, later, { analysis, decision: 'approved', by: 'PO', reason: 'revision reviewed', now: at(23) });
    rs.approveStage(ws.runsDir, later, { stageId: '1', approvedBy: 'Jane Reviewer', now: at(24) });
    const g = check(ws, later, '2');
    assert.equal(g.checks[0].integrity, 'verified');
    assert.equal(g.checks[0].approval.run, later);
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Automation approval cross-check
// ---------------------------------------------------------------------------------------------

function setUpAutomation(ws, { state, plan, cache }) {
  writeApproved(ws, PC);
  if (plan === 'Approved') writeApproved(ws, PLAN); else if (plan) writeArtifact(ws.dataRoot, PLAN, plan);
  const file = path.join(ws.modulesDir, 'login', 'automation', '.module_automation_state.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const history = state === 'Generated' ? [{ state, at: T0.toISOString() }] : [{ state: 'Approved', at: T0.toISOString() }, ...(state === 'Approved' ? [] : [{ state, at: T0.toISOString() }])];
  fs.writeFileSync(file, JSON.stringify({ state, approvedBy: state === 'Generated' ? null : 'lead@example.com', history }));
  if (cache) {
    moduleRegistry.registerModule(ws.modulesDir, { slug: 'login', name: 'Login', status: 'Active' }, { now: T0 });
    moduleRegistry.recordStage(ws.modulesDir, 'login', 'automation', { status: cache }, { now: T0 });
  }
}

test('cross-check: Module Manager says Promoted, the plan says Pending Review — blocked as a conflict (branch shape)', () => {
  const ws = makeWorkspace();
  try {
    setUpAutomation(ws, { state: 'Promoted', plan: 'Pending Review' });
    const g = check(ws, ws.folderName, '5A');
    assert.equal(g.decision, 'blocked');
    assert.ok(g.checks.some((c) => c.result === 'conflict' && /records automation Promoted/.test(c.detail)));
  } finally { cleanup(ws); }
});

test('cross-check: Module Manager says Promoted, the plan says "Superseded — regenerating" — blocked (agency shape)', () => {
  const ws = makeWorkspace();
  try {
    setUpAutomation(ws, { state: 'Promoted', plan: '**Superseded — regenerating.**' });
    const g = check(ws, ws.folderName, '5A');
    assert.ok(g.checks.some((c) => c.result === 'conflict' && /reads Unknown/.test(c.detail)));
  } finally { cleanup(ws); }
});

test('cross-check: the plan says Approved but the Module Manager never recorded the approval — blocked', () => {
  const ws = makeWorkspace();
  try {
    setUpAutomation(ws, { state: 'Generated', plan: 'Approved' });
    const g = check(ws, ws.folderName, '5A');
    assert.equal(g.decision, 'blocked');
    assert.ok(g.checks.some((c) => c.result === 'conflict' && /without the module's Automation Approval/.test(c.detail)));
  } finally { cleanup(ws); }
});

test('cross-check: agreeing records proceed; a stale module.json cache is a warning, never decisive', () => {
  const ws = makeWorkspace();
  try {
    setUpAutomation(ws, { state: 'Approved', plan: 'Approved', cache: 'Pending Automation Approval' });
    const g = check(ws, ws.folderName, '5A');
    assert.equal(g.decision, 'proceed', g.blockers.join('\n'));
    assert.ok(g.warnings.some((w) => /cache out of date/.test(w)));
  } finally { cleanup(ws); }
});

test('approving 4A needs the Module Manager\'s Automation Approval, recorded after the stage started', () => {
  const ws = makeWorkspace();
  try {
    writeApproved(ws, PC);
    writeApproved(ws, TC);
    // An approval from an earlier generation of the suite.
    automationState.setAutomationState(ws.modulesDir, 'login', 'Generated', { now: at(1) });
    automationState.setAutomationState(ws.modulesDir, 'login', 'Approved', { now: at(2), approvedBy: 'lead@example.com' });

    rs.startStage(ws.runsDir, ws.folderName, { stageId: '4A', invocationPath: 'Pipeline', now: at(10) });
    writeArtifact(ws.dataRoot, PLAN, 'Pending Review');
    rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '4A', artifacts: [PLAN], now: at(11) });
    writeArtifact(ws.dataRoot, PLAN, 'Approved');
    assert.throws(
      () => rs.approveStage(ws.runsDir, ws.folderName, { stageId: '4A', approvedBy: 'Lead', now: at(12) }),
      (err) => err.code === 'APPROVAL_CONFLICT' && /predates this stage/.test(err.message),
    );

    // The suite regenerated in this stage is approved in the Module Manager — now the records agree.
    automationState.setAutomationState(ws.modulesDir, 'login', 'Generated', { now: at(13) });
    automationState.setAutomationState(ws.modulesDir, 'login', 'Approved', { now: at(14), approvedBy: 'lead@example.com' });
    const res = rs.approveStage(ws.runsDir, ws.folderName, { stageId: '4A', approvedBy: 'Lead', now: at(15) });
    assert.equal(res.state.stages['4A'].status, 'Completed');
  } finally { cleanup(ws); }
});

test('approving 4A for a Promoted module needs a recorded baseline update after the stage started', () => {
  const ws = makeWorkspace();
  try {
    writeApproved(ws, PC);
    writeApproved(ws, TC);
    const file = path.join(ws.modulesDir, 'login', 'automation', '.module_automation_state.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ state: 'Promoted', approvedBy: 'lead', baselineRef: 'a'.repeat(40), baselineUpdates: [], history: [{ state: 'Approved', at: at(1).toISOString() }, { state: 'Promoted', at: at(1).toISOString() }] }));

    rs.startStage(ws.runsDir, ws.folderName, { stageId: '4A', invocationPath: 'Pipeline', now: at(10) });
    writeArtifact(ws.dataRoot, PLAN, 'Approved');
    rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '4A', artifacts: [PLAN], now: at(11) });
    expectCode(() => rs.approveStage(ws.runsDir, ws.folderName, { stageId: '4A', approvedBy: 'Lead', now: at(12) }), 'APPROVAL_CONFLICT');

    automationState.recordBaselineUpdate(ws.modulesDir, 'login', { now: at(13), changedPaths: ['a.java'], approvedBy: 'Lead', baselineRef: 'b'.repeat(40) });
    assert.equal(rs.approveStage(ws.runsDir, ws.folderName, { stageId: '4A', approvedBy: 'Lead', now: at(14) }).state.stages['4A'].status, 'Completed');
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Bypass resistance
// ---------------------------------------------------------------------------------------------

test('the public API has no gate skip and no data-root redirect', () => {
  const ws = makeWorkspace();
  try {
    expectCode(() => rs.startStage(ws.runsDir, ws.folderName, { stageId: '2', invocationPath: 'Pipeline', entryGate: false, now: at(1) }), 'INVALID_ARGUMENT');
    expectCode(() => rs.startStage(ws.runsDir, ws.folderName, { stageId: '2', invocationPath: 'Pipeline', dataRoot: os.tmpdir(), now: at(1) }), 'INVALID_ARGUMENT');
    assert.equal(rs.readRunState(ws.runsDir, ws.folderName).stages['2'].status, 'Not Started', 'nothing was recorded');
  } finally { cleanup(ws); }
});

test('test hooks are refused outside the Node test runner', () => {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const script = `try{require(${JSON.stringify(path.resolve(__dirname, '../runState.js'))})._setTestHooks({skipEntryGate:true});process.stdout.write('SET')}catch(e){process.stdout.write(e.code)}`;
  const r = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8', env });
  assert.equal(r.stdout, 'TEST_ONLY');
});

test('the CLI offers no way to skip the gate or set a hook', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../cli.js'), 'utf8');
  assert.doesNotMatch(src, /_setTestHooks|skipEntryGate|entryGate\s*:/);
});

test('a reopen passes the entry gate too', () => {
  const ws = makeWorkspace();
  try {
    approveStage1(ws, ws.folderName, 1);
    const QA = writeArtifact(ws.dataRoot, 'modules/login/discovery/QA_Assessment_Report.md', 'Pending Review');
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '2', invocationPath: 'Pipeline', now: at(10) });
    rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '2', artifacts: [QA], now: at(11) });
    writeArtifact(ws.dataRoot, QA, 'Approved');
    rs.approveStage(ws.runsDir, ws.folderName, { stageId: '2', approvedBy: 'QA Lead', now: at(12) });

    writeArtifact(ws.dataRoot, PC, 'Pending Review', 'sent back'); // upstream no longer approved
    assert.throws(
      () => rs.reopenStage(ws.runsDir, ws.folderName, { stageId: '2', by: 'QA Lead', reason: 'refine', now: at(20) }),
      (err) => err.code === 'GATE_BLOCKED',
    );
    const s2 = rs.readRunState(ws.runsDir, ws.folderName).stages['2'];
    assert.equal(s2.status, 'Completed', 'a blocked reopen changes nothing but the evidence');
    assert.equal(s2.entryGateHistory.at(-1).decision, 'blocked');
  } finally { cleanup(ws); }
});

test('a scoped run cannot be gated against another module\'s artifacts via --modules', () => {
  const ws = makeWorkspace();
  try {
    writeArtifact(ws.dataRoot, 'modules/other/context/ProjectContext.md', 'Approved');
    const g = check(ws, ws.folderName, '2', { modules: ['other'] });
    assert.equal(g.decision, 'blocked');
    assert.ok(g.blockers.some((b) => /scope override refused/.test(b)));
    assert.deepEqual(g.scope, ['login'], 'the run\'s own scope is still what is checked');

    const cli = path.resolve(__dirname, '../cli.js');
    const r = spawnSync(process.execPath, [cli, 'state', 'start', '2', '--invocation', 'Pipeline', '--modules', 'other', '--run', ws.folderName, '--runs-dir', ws.runsDir], { encoding: 'utf8' });
    assert.equal(r.status, 2);
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Gate evidence is appended, never overwritten
// ---------------------------------------------------------------------------------------------

test('repeated gate blocks keep every reason: gate history and stage history grow, nothing is replaced', () => {
  const ws = makeWorkspace();
  try {
    writeArtifact(ws.dataRoot, PC, 'Pending Review');
    expectCode(() => rs.startStage(ws.runsDir, ws.folderName, { stageId: '2', invocationPath: 'Pipeline', now: at(1) }), 'GATE_BLOCKED');
    writeArtifact(ws.dataRoot, PC, 'Rejected');
    expectCode(() => rs.startStage(ws.runsDir, ws.folderName, { stageId: '2', invocationPath: 'Pipeline', now: at(2) }), 'GATE_BLOCKED');

    const s = rs.readRunState(ws.runsDir, ws.folderName).stages['2'];
    assert.equal(s.status, 'Blocked');
    assert.equal(s.entryGateHistory.length, 2);
    assert.match(s.entryGateHistory[0].blockers.join(' '), /Pending Review/);
    assert.match(s.entryGateHistory[1].blockers.join(' '), /Rejected/);
    assert.match(s.reason, /Rejected/, 'the current reason is the latest');
    const reasons = s.history.map((h) => h.reason).join(' | ');
    assert.match(reasons, /Pending Review/, 'the earlier reason is still in the stage history');
    assert.match(reasons, /Rejected/);

    const manifest = fs.readFileSync(manifestPath(ws.runsDir, ws.folderName), 'utf8');
    assert.match(manifest, /Not Started → Blocked/);
    assert.match(manifest, /entry gate blocked again/);

    writeApproved(ws, PC);
    const res = rs.startStage(ws.runsDir, ws.folderName, { stageId: '2', invocationPath: 'Pipeline', now: at(3) });
    assert.equal(res.state.stages['2'].entryGateHistory.length, 3, 'the passing check is kept beside the blocked ones');
  } finally { cleanup(ws); }
});
