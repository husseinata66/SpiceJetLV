// Phase 3 — workflow selection, planning, safe auto-progression and smart resume.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const rs = require('../runState');
// Phase 9.2 (F-16): execution-stage starts are preceded by the operator's Safety Preflight (approvalFixture).
require('./approvalFixture').autoPreflight(rs);
const { writeVerifiedReport } = require('./reportFixture');
const planner = require('../workflowPlanner');
const { createRun, changeSupplierFeatureRunScope } = require('../createRun');
const { manifestPath } = require('../runManifest');
const automationState = require('../../module_manager/automationState');

const T0 = new Date('2026-10-08T09:00:00Z');
let clock = 0;
const tick = () => new Date(T0.getTime() + (clock += 1) * 60000);

function makeWorkspace(extraRunJson = { modules: ['login'], moduleScope: 'single' }) {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'planner-'));
  const runsDir = path.join(dataRoot, 'runs');
  fs.mkdirSync(runsDir, { recursive: true });
  const { folderName } = createRun(runsDir, { scope: 'Module', target: 'Login', now: T0, extraRunJson });
  return { dataRoot, runsDir, folderName };
}
const cleanup = (ws) => fs.rmSync(ws.dataRoot, { recursive: true, force: true });
const write = (ws, rel, status, body = 'Body.') => {
  const f = path.join(ws.dataRoot, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, `# Artifact\n\n| Field | Value |\n|---|---|\n| Status | ${status} |\n\n${body}\n`);
  return rel;
};
const next = (ws) => planner.nextStep(ws.runsDir, ws.folderName, { now: tick() }).next;
const plan = (ws, opts = {}) => planner.planWorkflow(ws.runsDir, ws.folderName, { now: tick(), ...opts });
const select = (ws, type, extra = {}) => rs.selectWorkflow(ws.runsDir, ws.folderName, { type, by: 'Lead', now: tick(), ...extra });
const expectCode = (fn, code) => assert.throws(fn, (err) => err.code === code, `expected ${code}`);

const { recordFixtureApproval } = require('./approvalFixture');

/** An upstream artifact approved THROUGH the run state model (a named, fingerprinted approval) — Phase 9.1, F-01. */
const writeApproved = (ws, rel, body) => { write(ws, rel, 'Approved', body); recordFixtureApproval(ws.dataRoot, rel); return rel; };

// A real suite (Stage 3's assertion contract) and real results (Phase 9.1, F-02): an execution stage is
// approved or completed only with an outcome recorded FROM ITS RESULTS.
const CASE_IDS = ['TC-LOGIN-001', 'TC-LOGIN-002'];
const CASE = (id) => `### ${id} — Case ${id}\n\n**Objective:** Check ${id}.\n\n**Preconditions:** A user exists.\n\n**Test Data:** None.\n\n**Steps:**\n\n1. Do it.\n\n**Expected Result:** It works.\n\n**Assertions:**\n\n| Assertion ID | Expected | Expected Source | Check | Requirement |\n|---|---|---|---|---|\n| A1 | It works | Expected Result | equals | AC-1 |\n\n**Priority:** P1\n\n**Tags:** Regression\n\n**Review:** Approved\n\n**Automation:** Approved\n`;
const SUITE_BODY = `## Test Cases\n\n${CASE_IDS.map(CASE).join('\n')}`;
const RESULTS_FILE = { '4M': 'manual_execution/ManualExecutionResults.md', '5A': 'execution/ExecutionResults.md', '5H': 'execution/ExecutionResults.rerun-1.md' };
/** Writes the stage's results (rows: [id, status]), registers them, and records the outcome from them. */
function recordResults(ws, id, rows = [['TC-LOGIN-001', 'Failed'], ['TC-LOGIN-002', 'Passed']]) {
  const rel = `runs/${ws.folderName}/${RESULTS_FILE[id]}`;
  const per = rows.map(([tc, st]) => `| ${tc} | s/${tc} | ${st} | 1 s | 1 | ${st === 'Passed' ? '—' : 'observed failure'} | — |`).join('\n');
  const asr = rows.filter(([, st]) => st === 'Passed').map(([tc]) => `| ${tc} | A1 | result | It works | Expected Result | It works | equals | ✅ | — |`).join('\n');
  const f = path.join(ws.dataRoot, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, `# Results\n\n## 3. Per-Test Results\n\n| Test Case ID | Automation Script ID | Status | Execution Time | Attempts | Failure Detail | Evidence Refs |\n|---|---|---|---|---|---|---|\n${per}\n${asr ? `\n### 3.1 Assertion Records\n\n| Test Case ID | Assertion ID | Assertion | Expected | Expected Source | Actual | Check | Result | Evidence |\n|---|---|---|---|---|---|---|---|---|\n${asr}\n` : ''}`);
  rs.recordStageArtifacts(ws.runsDir, ws.folderName, { stageId: id, artifacts: [rel], now: tick() });
  return rs.recordOutcomeFromResults(ws.runsDir, ws.folderName, { stageId: id, now: tick() });
}

const PC = 'modules/login/context/ProjectContext.md';
const QA = 'modules/login/discovery/QA_Assessment_Report.md';
const TC = 'modules/login/test_design/TestCases_Login.md';

/** Runs one checkpointed stage through start → request-approval → (header Approved) → approve. */
function approveStage(ws, id, rel, invocationPath = 'Pipeline', rows) {
  write(ws, rel, 'Pending Review', id === '3' ? SUITE_BODY : 'Body.');
  rs.startStage(ws.runsDir, ws.folderName, { stageId: id, invocationPath, now: tick() });
  if (id === '4M') recordResults(ws, id, rows);
  rs.requestApproval(ws.runsDir, ws.folderName, { stageId: id, artifacts: [rel], now: tick() });
  write(ws, rel, 'Approved', id === '3' ? SUITE_BODY : 'Body.');
  return rs.approveStage(ws.runsDir, ws.folderName, { stageId: id, approvedBy: 'Reviewer', now: tick() });
}
/** Runs a stage with no checkpoint (5A, 6A) through start → output → complete. */
function completeStage(ws, id, rel, invocationPath = 'Pipeline', rows) {
  rs.startStage(ws.runsDir, ws.folderName, { stageId: id, invocationPath, now: tick() });
  if (/Final_QA_Report(.rev-d+)?.md$/.test(rel)) writeVerifiedReport(ws.runsDir, ws.folderName, path.join(ws.dataRoot, rel));
  else if (id === '5A' || id === '5H') { recordResults(ws, id, rows); return rs.completeStage(ws.runsDir, ws.folderName, { stageId: id, now: tick() }); }
  else write(ws, rel, 'Complete');
  rs.recordStageArtifacts(ws.runsDir, ws.folderName, { stageId: id, artifacts: [rel], now: tick() });
  return rs.completeStage(ws.runsDir, ws.folderName, { stageId: id, now: tick() });
}

// ---------------------------------------------------------------------------------------------
// Workflow selection
// ---------------------------------------------------------------------------------------------

test('no workflow selected: the planner asks the human, offering the three workflows, and never picks one', () => {
  const ws = makeWorkspace();
  try {
    const n = next(ws);
    assert.equal(n.action, 'select-workflow');
    assert.equal(n.humanDecision, true);
    assert.equal(n.options.length, 3);
  } finally { cleanup(ws); }
});

test('the selection is recorded with its chooser; a change needs a reason and keeps the earlier choice', () => {
  const ws = makeWorkspace();
  try {
    expectCode(() => rs.selectWorkflow(ws.runsDir, ws.folderName, { type: 'full-manual', now: tick() }), 'MISSING_FIELD');
    expectCode(() => select(ws, 'full-everything'), 'INVALID_ARGUMENT');
    select(ws, 'full-manual');
    let wp = rs.readRunState(ws.runsDir, ws.folderName).workflowPlan;
    assert.deepEqual(wp.stages, ['1', '2', '3', '4M']);
    assert.equal(wp.selectedBy, 'Lead');
    expectCode(() => select(ws, 'full-automation'), 'MISSING_FIELD');
    select(ws, 'full-automation', { reason: 'automate instead' });
    wp = rs.readRunState(ws.runsDir, ws.folderName).workflowPlan;
    assert.deepEqual(wp.stages, ['1', '2', '3', '4A', '5A', '6A']);
    assert.equal(wp.history[0].type, 'full-manual');
    assert.match(fs.readFileSync(manifestPath(ws.runsDir, ws.folderName), 'utf8'), /workflow changed full-manual → full-automation/);
  } finally { cleanup(ws); }
});

test('5H is in neither Full workflow; it can only be chosen as a Specific Stage', () => {
  assert.ok(!rs.WORKFLOWS['full-manual'].includes('5H'));
  assert.ok(!rs.WORKFLOWS['full-automation'].includes('5H'));
  assert.ok(Object.isFrozen(rs.WORKFLOWS['full-automation']));
});

// ---------------------------------------------------------------------------------------------
// The three workflows, end to end
// ---------------------------------------------------------------------------------------------

test('Full Manual: each approval lets the planner name the next stage; completion is not a test verdict', () => {
  const ws = makeWorkspace();
  try {
    select(ws, 'full-manual');
    assert.deepEqual([next(ws).action, next(ws).stageId, next(ws).humanDecision], ['start', '1', false]);

    write(ws, PC, 'Pending Review');
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Pipeline', now: tick() });
    rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '1', artifacts: [PC], now: tick() });
    assert.equal(next(ws).action, 'await-approval', 'finishing is never approval');
    write(ws, PC, 'Approved');
    rs.approveStage(ws.runsDir, ws.folderName, { stageId: '1', approvedBy: 'BA', now: tick() });
    assert.deepEqual([next(ws).action, next(ws).stageId], ['start', '2'], 'the recorded approval lets the workflow move on');

    approveStage(ws, '2', QA);
    approveStage(ws, '3', TC);
    approveStage(ws, '4M', `runs/${ws.folderName}/manual_execution/ManualExecutionSummary.md`, 'Pipeline', [['TC-LOGIN-001', 'Failed'], ['TC-LOGIN-002', 'Blocked']]);

    const st = planner.workflowStatus(ws.runsDir, ws.folderName, { now: tick() });
    assert.equal(st.workflowStatus, 'complete');
    assert.equal(st.next.action, 'complete-run');
    assert.equal(st.testOutcome.overall, 'failures', 'failed tests are never presented as passing');
    assert.deepEqual(st.approvals.approved, ['1', '2', '3', '4M']);
    assert.equal(rs.completeRun(ws.runsDir, ws.folderName, { by: 'Lead', now: tick() }).state.status, 'Completed');
  } finally { cleanup(ws); }
});

test('Full Automation: 4A → 5A → 6A, 5H is never proposed even after automation failures', () => {
  const ws = makeWorkspace();
  try {
    select(ws, 'full-automation');
    approveStage(ws, '1', PC);
    approveStage(ws, '2', QA);
    approveStage(ws, '3', TC);
    assert.deepEqual([next(ws).action, next(ws).stageId], ['start', '4A']);

    const plan4A = 'modules/login/automation/AutomationPlan_SHAFT.md';
    write(ws, plan4A, 'Pending Review');
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '4A', invocationPath: 'Pipeline', now: tick() });
    rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '4A', artifacts: [plan4A], now: tick() });
    write(ws, plan4A, 'Approved');
    const modulesDir = path.join(ws.dataRoot, 'modules');
    automationState.setAutomationState(modulesDir, 'login', 'Generated', { now: tick() });
    automationState.setAutomationState(modulesDir, 'login', 'Approved', { now: tick(), approvedBy: 'lead@example.com' });
    rs.approveStage(ws.runsDir, ws.folderName, { stageId: '4A', approvedBy: 'Lead', now: tick() });

    assert.deepEqual([next(ws).action, next(ws).stageId], ['start', '5A']);
    completeStage(ws, '5A', `runs/${ws.folderName}/execution/ExecutionResults.md`, 'Pipeline', [['TC-LOGIN-001', 'Passed'], ['TC-LOGIN-002', 'Automation Failure']]);

    const n = next(ws);
    assert.deepEqual([n.action, n.stageId], ['start', '6A'], 'automation failures never route the workflow into 5H');
    assert.doesNotMatch(JSON.stringify(n), /5H/);
    completeStage(ws, '6A', `runs/${ws.folderName}/reporting/Final_QA_Report.md`);
    const st = planner.workflowStatus(ws.runsDir, ws.folderName, { now: tick() });
    assert.equal(st.workflowStatus, 'complete');
    assert.equal(st.testOutcome.overall, 'failures');
    assert.equal(plan(ws).stages.find((s) => s.stageId === '5H').category, 'skipped');
  } finally { cleanup(ws); }
});

test('Specific Stage: only that stage is planned, invoked Direct, and the workflow completes with it', () => {
  const ws = makeWorkspace();
  try {
    writeApproved(ws, PC);
    writeApproved(ws, TC, SUITE_BODY);
    select(ws, 'specific-stage', { stageId: '4M' });
    const n = next(ws);
    assert.deepEqual([n.action, n.stageId], ['start', '4M']);
    assert.match(n.command, /--invocation "Direct"/);
    const p = plan(ws);
    assert.deepEqual(p.stages.filter((s) => s.category === 'skipped').map((s) => s.stageId), ['1', '2', '3', '4A', '5A', '5H', '6A']);

    approveStage(ws, '4M', `runs/${ws.folderName}/manual_execution/ManualExecutionSummary.md`, 'Direct');
    assert.equal(next(ws).action, 'complete-run');
    assert.equal(rs.completeRun(ws.runsDir, ws.folderName, { by: 'Lead', now: tick() }).state.status, 'Completed');
  } finally { cleanup(ws); }
});

test('Specific Stage with a degradable missing input: a human decision to run degraded, never a silent start', () => {
  const ws = makeWorkspace();
  try {
    select(ws, 'specific-stage', { stageId: '2' });
    const n = next(ws);
    assert.equal(n.action, 'run-degraded');
    assert.equal(n.humanDecision, true);
    assert.match(n.command, /Direct \(degraded\)/);
  } finally { cleanup(ws); }
});

test('Specific Stage 5H is a human invocation: proposed Direct, never Pipeline', () => {
  const ws = makeWorkspace();
  try {
    writeApproved(ws, PC);
    write(ws, `runs/${ws.folderName}/execution/ExecutionResults.md`, 'Complete');
    select(ws, 'specific-stage', { stageId: '5H' });
    const n = next(ws);
    assert.deepEqual([n.action, n.stageId], ['start', '5H']);
    assert.match(n.command, /--invocation "Direct"/);
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Missing approvals and blocked stages
// ---------------------------------------------------------------------------------------------

test('a missing or pending upstream approval blocks: the planner reports the gate, it does not proceed', () => {
  const ws = makeWorkspace();
  try {
    write(ws, PC, 'Pending Review');
    select(ws, 'specific-stage', { stageId: '3' });
    const n = next(ws);
    assert.equal(n.action, 'resolve-blocked');
    assert.equal(n.humanDecision, true);
    assert.ok(n.blockers.some((b) => /Pending Review/.test(b)));
  } finally { cleanup(ws); }
});

test('a blocked stage stays the frontier until its cause is resolved; restarting goes through its gate', () => {
  const ws = makeWorkspace();
  try {
    select(ws, 'full-manual');
    approveStage(ws, '1', PC);
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '2', invocationPath: 'Pipeline', now: tick() });
    rs.blockStage(ws.runsDir, ws.folderName, { stageId: '2', reason: 'environment down', now: tick() });
    const n = next(ws);
    assert.deepEqual([n.action, n.stageId], ['resolve-blocked', '2']);
    assert.match(n.reason, /environment down/);
    assert.equal(plan(ws).stages.find((s) => s.stageId === '2').category, 'blocked');
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Partial approvals
// ---------------------------------------------------------------------------------------------

function partialProjectContext(ws) {
  const f = path.join(ws.dataRoot, PC);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, '# PC\n\n| Field | Value |\n|---|---|\n| Status | **Approved** — §1, §2. **`PO-30`: Pending Review** |\n\n## Approval Scope\n\n| Item | Status | Depends On | Affects |\n|---|---|---|---|\n| §1 | Approved | — | — |\n| §2 | Approved | — | — |\n| PO-30 | Pending | §2 | §2 |\n');
}

test('partial approval: a Mixed Stage 1 does not block the independent part — offered, chosen by a human, then planned past', () => {
  const ws = makeWorkspace();
  try {
    select(ws, 'full-manual');
    partialProjectContext(ws);
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Pipeline', now: tick() });
    rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '1', artifacts: [PC], now: tick() });
    rs.approveScope(ws.runsDir, ws.folderName, { artifact: PC, approvedBy: 'BA', now: tick() });

    let n = next(ws);
    assert.equal(n.action, 'await-approval', 'Stage 1 is still not fully approved');
    assert.deepEqual(n.partialOption.suggestedScope, ['§1'], 'only the item no pending item affects');
    assert.ok(n.options.some((o) => /--scope-items §1/.test(o)));

    // A human chooses the partial scope by name.
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '2', invocationPath: 'Pipeline', scopeItems: ['§1'], by: 'QA Lead', now: tick() });
    const p = plan(ws);
    assert.equal(p.stages.find((s) => s.stageId === '1').category, 'pending-approval-partial-in-use');
    assert.deepEqual([p.next.action, p.next.stageId], ['in-progress', '2']);
    assert.deepEqual(p.approvals.partialScope, ['2']);
    assert.notEqual(p.workflowStatus, 'complete', 'a partly approved stage never makes the workflow complete');
  } finally { cleanup(ws); }
});

test('partial approval: pending items are never accepted automatically — no suggestion without a recorded scope', () => {
  const ws = makeWorkspace();
  try {
    select(ws, 'full-manual');
    partialProjectContext(ws);
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Pipeline', now: tick() });
    rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '1', artifacts: [PC], now: tick() });
    const n = next(ws);
    assert.equal(n.action, 'await-approval');
    assert.equal(n.partialOption, undefined);
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Direct invocation and branch separation
// ---------------------------------------------------------------------------------------------

test('direct invocation still works outside the selected workflow, and does not change the plan', () => {
  const ws = makeWorkspace();
  try {
    select(ws, 'full-manual');
    approveStage(ws, '1', PC);
    writeApproved(ws, TC, SUITE_BODY);
    // The human invokes the Automation skill directly, outside the Manual workflow.
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '4A', invocationPath: 'Direct', now: tick() });
    const p = plan(ws);
    assert.equal(p.stages.find((s) => s.stageId === '4A').category, 'outside-workflow');
    assert.deepEqual([p.next.action, p.next.stageId], ['start', '2'], 'the Manual workflow carries on, unaffected');
  } finally { cleanup(ws); }
});

test('branch separation: Full Manual never plans an Automation stage, Full Automation never plans 4M', () => {
  for (const [type, forbidden] of [['full-manual', ['4A', '5A', '5H', '6A']], ['full-automation', ['4M', '5H']]]) {
    const ws = makeWorkspace();
    try {
      select(ws, type);
      const p = plan(ws);
      for (const id of forbidden) assert.equal(p.stages.find((s) => s.stageId === id).inWorkflow, false, `${type} must not include ${id}`);
    } finally { cleanup(ws); }
  }
});

// ---------------------------------------------------------------------------------------------
// Pause, resume, interruption
// ---------------------------------------------------------------------------------------------

test('pause → the plan says resume (a human decision); resume → the paused stage restarts through its gate', () => {
  const ws = makeWorkspace();
  try {
    select(ws, 'full-manual');
    write(ws, PC, 'Pending Review');
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Pipeline', now: tick() });
    rs.pauseRun(ws.runsDir, ws.folderName, { by: 'Tester', reason: 'end of day', now: tick() });
    let n = next(ws);
    assert.equal(n.action, 'resume-run');
    assert.equal(n.humanDecision, true);
    rs.resumeRun(ws.runsDir, ws.folderName, { by: 'Tester', now: tick() });
    n = next(ws);
    assert.deepEqual([n.action, n.stageId], ['start', '1']);
    assert.equal(rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Pipeline', now: tick() }).state.stages['1'].resumes, 1);
  } finally { cleanup(ws); }
});

test('an interrupted stage: the planner cannot tell, so it asks; recovery marks it Failed and the retry is gated', () => {
  const ws = makeWorkspace();
  try {
    select(ws, 'full-manual');
    write(ws, PC, 'Pending Review');
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Pipeline', now: tick() });
    const n = next(ws);
    assert.equal(n.action, 'in-progress');
    assert.equal(n.humanDecision, true);
    assert.ok(n.options.some((o) => /state recover 1/.test(o)));

    expectCode(() => rs.recoverStage(ws.runsDir, ws.folderName, { stageId: '1', reason: 'session closed', now: tick() }), 'MISSING_FIELD');
    const r = rs.recoverStage(ws.runsDir, ws.folderName, { stageId: '1', by: 'Tester', reason: 'session closed', now: tick() });
    assert.equal(r.state.stages['1'].status, 'Failed');
    assert.match(r.state.stages['1'].reason, /Interrupted: session closed/);
    assert.equal(next(ws).action, 'resolve-blocked');
    const again = rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Pipeline', now: tick() });
    assert.equal(again.state.stages['1'].attempts, 2);
    assert.equal(again.state.stages['1'].entryGateHistory.length, 2, 'both entries are kept as evidence');
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Smart resume: changed upstream, scope, environment
// ---------------------------------------------------------------------------------------------

test('changed upstream: an approved artifact edited later invalidates its stage and everything after it — a human decides', () => {
  const ws = makeWorkspace();
  try {
    select(ws, 'full-manual');
    approveStage(ws, '1', PC);
    approveStage(ws, '2', QA);
    write(ws, PC, 'Approved', 'Requirement changed after approval.');
    const p = plan(ws);
    assert.equal(p.next.action, 'revalidate');
    assert.equal(p.next.stageId, '1');
    assert.deepEqual(p.next.affected, ['1', '2']);
    assert.ok(p.revalidation.some((i) => i.stageId === '1' && i.kind === 'approval-invalidated'));
    assert.ok(p.revalidation.some((i) => i.stageId === '2' && i.kind === 'upstream-changed'));
    assert.equal(p.stages.find((s) => s.stageId === '3').category, 'not-started', 'stages not yet reached are not affected');

    // Re-executing only the affected stage, through its gate; the earlier approval is kept.
    write(ws, PC, 'Pending Review', 'Requirement changed after approval.');
    const re = rs.reopenStage(ws.runsDir, ws.folderName, { stageId: '1', by: 'BA', reason: 'requirement changed', now: tick() });
    assert.equal(re.state.stages['1'].approval.previous.length, 1);
  } finally { cleanup(ws); }
});

test('changed scope: a scope change after a stage completed is reported for that stage', () => {
  const ws = makeWorkspace({ scopeFamily: 'supplier-feature', feature: 'ancillaries', supplier: 'air-india', sharedScope: null });
  try {
    select(ws, 'full-manual');
    approveStage(ws, '1', 'supplier-features/ancillaries/suppliers/air-india/context/ProjectContext.md');
    changeSupplierFeatureRunScope(ws.runsDir, ws.folderName, { now: tick(), approvedBy: 'PO', reason: 'add a testing layer', changes: { testingLayerScope: ['api'] } });
    const p = plan(ws);
    assert.ok(p.revalidation.some((i) => i.stageId === '1' && i.kind === 'scope-changed'));
    assert.equal(p.next.action, 'revalidate');
  } finally { cleanup(ws); }
});

test('changed environment: target code that moved since the anchor flags completed execution stages', () => {
  const ws = makeWorkspace();
  const targetRef = require('../targetRef');
  const original = targetRef.computeDrift;
  try {
    writeApproved(ws, PC);
    writeApproved(ws, TC, SUITE_BODY);
    select(ws, 'specific-stage', { stageId: '4M' });
    approveStage(ws, '4M', `runs/${ws.folderName}/manual_execution/ManualExecutionSummary.md`, 'Direct');
    const file = rs.runJsonPath(ws.runsDir, ws.folderName);
    fs.writeFileSync(file, JSON.stringify({ ...JSON.parse(fs.readFileSync(file, 'utf8')), targetRef: 'a'.repeat(40) }, null, 2));
    targetRef.computeDrift = () => ({ status: 'moved', commitsSince: 3, summary: 'moved' });
    const p = plan(ws, { targetRoot: ws.dataRoot, execFileSync: () => '' });
    assert.ok(p.revalidation.some((i) => i.stageId === '4M' && i.kind === 'environment-changed'));
  } finally { targetRef.computeDrift = original; cleanup(ws); }
});

test('impact unknown: a stage with no entry-gate evidence is never assumed unaffected', () => {
  const ws = makeWorkspace();
  try {
    select(ws, 'full-manual');
    write(ws, PC, 'Pending Review');
    rs._setTestHooks({ skipEntryGate: true });
    try {
      rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Pipeline', now: tick() });
    } finally { rs._setTestHooks({}); }
    rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '1', artifacts: [PC], now: tick() });
    write(ws, PC, 'Approved');
    rs.approveStage(ws.runsDir, ws.folderName, { stageId: '1', approvedBy: 'BA', now: tick() });
    const p = plan(ws);
    assert.ok(p.revalidation.some((i) => i.kind === 'impact-unknown'));
    assert.equal(p.next.action, 'revalidate');
    assert.equal(p.next.humanDecision, true);
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Completion, outcome and approval are reported apart
// ---------------------------------------------------------------------------------------------

test('test verdicts are never better than the evidence', () => {
  assert.equal(rs.testVerdict(null), 'not-recorded');
  assert.equal(rs.testVerdict({ Passed: 10 }), 'all-passed');
  assert.equal(rs.testVerdict({ Passed: 10, Failed: 1 }), 'failures');
  assert.equal(rs.testVerdict({ Passed: 10, 'Environment Failure': 1 }), 'failures');
  assert.equal(rs.testVerdict({ Passed: 10, Blocked: 1 }), 'incomplete');
  assert.equal(rs.testVerdict({ Passed: 9, 'Automation Repaired': 1 }), 'passed-after-repair');
  assert.equal(rs.testVerdict({ Excluded: 4, Skipped: 2 }), 'nothing-executed');
  assert.equal(planner.combineVerdicts(['all-passed', 'failures']), 'failures', 'a later repair never hides a first-attempt failure');
  const ws = makeWorkspace();
  try {
    expectCode(() => rs.recordOutcome(ws.runsDir, ws.folderName, { stageId: '3', counts: { Passed: 1 }, now: tick() }), 'INVALID_ARGUMENT');
    expectCode(() => rs.recordOutcome(ws.runsDir, ws.folderName, { stageId: '4M', counts: { Pass: 1 }, now: tick() }), 'INVALID_ARGUMENT');
  } finally { cleanup(ws); }
});

test('F-02: an execution stage is never approved without an outcome from its results — typed counts do not substitute', () => {
  const ws = makeWorkspace();
  try {
    writeApproved(ws, PC);
    writeApproved(ws, TC, SUITE_BODY);
    select(ws, 'specific-stage', { stageId: '4M' });
    const SUM = `runs/${ws.folderName}/manual_execution/ManualExecutionSummary.md`;
    write(ws, SUM, 'Pending Review');
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '4M', invocationPath: 'Direct', now: tick() });
    rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '4M', artifacts: [SUM], now: tick() });
    write(ws, SUM, 'Approved');
    expectCode(() => rs.approveStage(ws.runsDir, ws.folderName, { stageId: '4M', approvedBy: 'Reviewer', now: tick() }), 'OUTCOME_NOT_FROM_RESULTS');
    // Typed counts are diagnostics: recorded, never a pass, never enough to approve.
    const typed = rs.recordOutcome(ws.runsDir, ws.folderName, { stageId: '4M', counts: { Passed: 3 }, now: tick() }).state.stages['4M'].outcome;
    assert.equal(typed.verdict, 'incomplete');
    assert.equal(typed.claimedVerdict, 'all-passed');
    assert.equal(typed.verified, false);
    expectCode(() => rs.approveStage(ws.runsDir, ws.folderName, { stageId: '4M', approvedBy: 'Reviewer', now: tick() }), 'OUTCOME_NOT_FROM_RESULTS');
    const st = planner.workflowStatus(ws.runsDir, ws.folderName, { now: tick() });
    assert.notEqual(st.workflowStatus, 'complete');
    assert.notEqual(st.testOutcome.overall, 'all-passed');
  } finally { cleanup(ws); }
});

test('the run cannot be completed before every stage of its workflow is done', () => {
  const ws = makeWorkspace();
  try {
    select(ws, 'full-manual');
    approveStage(ws, '1', PC);
    expectCode(() => rs.completeRun(ws.runsDir, ws.folderName, { by: 'Lead', now: tick() }), 'WORKFLOW_NOT_COMPLETE');
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Historical runs, the CLI
// ---------------------------------------------------------------------------------------------

test('historical runs: planned as Unknown with no next step, and never written', () => {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'legacy-plan-'));
  const runsDir = path.join(dataRoot, 'runs');
  try {
    const meta = path.join(runsDir, 'run-001__legacy', 'metadata');
    fs.mkdirSync(meta, { recursive: true });
    fs.writeFileSync(path.join(meta, 'run.json'), JSON.stringify({ folderName: 'run-001__legacy', status: 'Preparing' }));
    const before = fs.readFileSync(path.join(meta, 'run.json'), 'utf8');
    const p = planner.planWorkflow(runsDir, 'run-001__legacy', { now: tick() });
    assert.equal(p.legacy, true);
    assert.equal(p.next.action, 'none');
    assert.ok(p.stages.every((s) => s.status === 'Unknown'));
    expectCode(() => rs.selectWorkflow(runsDir, 'run-001__legacy', { type: 'full-manual', by: 'QA Lead', now: tick() }), 'LEGACY_RUN');
    assert.equal(fs.readFileSync(path.join(meta, 'run.json'), 'utf8'), before);
  } finally { fs.rmSync(dataRoot, { recursive: true, force: true }); }
});

test('CLI: workflow, next exit codes (0 start / 3 decision / 4 done), plan and status', () => {
  const ws = makeWorkspace();
  try {
    const cli = path.resolve(__dirname, '../cli.js');
    const run = (...a) => spawnSync(process.execPath, [cli, 'state', ...a, '--run', ws.folderName, '--runs-dir', ws.runsDir], { encoding: 'utf8' });
    assert.equal(run('next').status, 3, 'no workflow yet: a decision');
    assert.equal(run('workflow', 'full-manual', '--by', 'Lead').status, 0);
    assert.equal(run('next').status, 0, 'Stage 1 may start');
    assert.match(run('plan').stdout, /Workflow: full-manual/);
    const status = JSON.parse(run('status', '--json').stdout);
    assert.equal(status.workflow.type, 'full-manual');
    assert.equal(status.testOutcome.overall, 'not-recorded');
  } finally { cleanup(ws); }
});
