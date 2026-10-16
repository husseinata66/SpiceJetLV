const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const rs = require('../runState');
// Phase 9.2 (F-16): execution-stage starts are preceded by the operator's Safety Preflight (approvalFixture).
require('./approvalFixture').autoPreflight(rs);
const { writeVerifiedReport } = require('./reportFixture');
const { recordResultsOutcome } = require('./approvalFixture');
const { createRun } = require('../createRun');
const { recordStage, readManifest, manifestPath } = require('../runManifest');
const { readArtifactApprovalStatus } = require('../artifactHeader');

const T0 = new Date('2026-10-08T09:00:00Z');
const at = (min) => new Date(T0.getTime() + min * 60000);

/** A data root with runs/ and one module artifact whose header status we control. */
function makeWorkspace() {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'runstate-'));
  const runsDir = path.join(dataRoot, 'runs');
  fs.mkdirSync(runsDir, { recursive: true });
  const { folderName } = createRun(runsDir, { scope: 'Module', target: 'Login', now: T0, extraRunJson: { modules: ['login'], moduleScope: 'single' } });
  return { dataRoot, runsDir, folderName };
}

/** Writes an artifact with a Markdown header table, the shape real module artifacts use. */
function writeArtifact(dataRoot, rel, status) {
  const file = path.join(dataRoot, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `# Artifact\n\n| Field | Value |\n|---|---|\n| Module | \`login\` |\n| Status | ${status} |\n\nBody.\n`);
  return rel;
}

const cleanup = (ws) => fs.rmSync(ws.dataRoot, { recursive: true, force: true });
const runJson = (ws) => JSON.parse(fs.readFileSync(rs.runJsonPath(ws.runsDir, ws.folderName), 'utf8'));

/** Drives one checkpointed stage from start to recorded approval. */
function passCheckpointedStage(ws, stageId, rel, minute) {
  writeArtifact(ws.dataRoot, rel, 'Pending Review');
  rs.startStage(ws.runsDir, ws.folderName, { stageId, invocationPath: 'Pipeline', now: at(minute) });
  // 4M is approved only with an outcome recorded from its results (Phase 9.1, F-02).
  if (stageId === '4M') recordResultsOutcome(rs, ws.runsDir, ws.folderName, '4M', [['TC-LOGIN-001', 'Failed']], { now: at(minute) });
  rs.requestApproval(ws.runsDir, ws.folderName, { stageId, artifacts: [rel], now: at(minute + 1) });
  writeArtifact(ws.dataRoot, rel, '**Approved** — Jane Reviewer, 2026-10-08');
  return rs.approveStage(ws.runsDir, ws.folderName, { stageId, approvedBy: 'Jane Reviewer', now: at(minute + 2) });
}

/** Writes and registers a stage output, so the no-checkpoint exit gate (complete) can pass. */
function registerOutput(ws, stageId) {
  const rel = `runs/${ws.folderName}/${stageId === '6A' ? 'reporting/Final_QA_Report.md' : 'execution/ExecutionResults.md'}`;
  // A 6A report must pass the reporting exit gate (Phase 5.6A): Markdown + model + HTML that agree.
  if (stageId === '6A') writeVerifiedReport(ws.runsDir, ws.folderName, path.join(ws.dataRoot, rel));
  // An execution stage completes only with an outcome recorded from its results (Phase 9.1, F-02).
  else if (stageId === '5A' || stageId === '5H') { recordResultsOutcome(rs, ws.runsDir, ws.folderName, stageId, [['TC-LOGIN-001', 'Failed']], { now: new Date(T0.getTime() + 1) }); return; } else writeArtifact(ws.dataRoot, rel, 'Complete');
  rs.recordStageArtifacts(ws.runsDir, ws.folderName, { stageId, artifacts: [rel], now: new Date(T0.getTime() + 1) });
}

// These tests exercise transitions, not the entry gate (stageGate.test.js covers it). The skip is a
// test-only hook: _setTestHooks refuses it outside the Node test runner.
rs._setTestHooks({ skipEntryGate: true });

const expectCode = (fn, code) => assert.throws(fn, (err) => err instanceof rs.RunStateError && err.code === code);

// ---------------------------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------------------------

test('stage IDs and names are the platform\'s canonical ones (observability/schema.js STAGES)', () => {
  const { STAGES } = require('../../observability/schema');
  assert.deepEqual([...rs.STAGE_IDS].sort(), Object.keys(STAGES).map(String).sort());
  for (const id of rs.STAGE_IDS) assert.equal(rs.STAGE_DEFINITIONS[id].name, STAGES[id]);
});

test('every stage status has a transition entry, and every target is a known status', () => {
  for (const s of rs.STAGE_STATUSES) {
    assert.ok(Array.isArray(rs.STAGE_TRANSITIONS[s]), `no transitions for ${s}`);
    for (const to of rs.STAGE_TRANSITIONS[s]) assert.ok(rs.STAGE_STATUSES.includes(to), `${s} → unknown ${to}`);
  }
});

// ---------------------------------------------------------------------------------------------
// Valid transitions
// ---------------------------------------------------------------------------------------------

test('a new run starts inside the model: Preparing, revision 0, every stage Not Started', () => {
  const ws = makeWorkspace();
  try {
    const meta = runJson(ws);
    assert.equal(meta.stateSchemaVersion, rs.STATE_SCHEMA_VERSION);
    assert.equal(meta.stateRevision, 0);
    assert.equal(meta.status, 'Preparing');
    assert.equal(meta.statusHistory[0].to, 'Preparing');
    const state = rs.readRunState(ws.runsDir, ws.folderName);
    assert.equal(state.legacy, false);
    for (const id of rs.STAGE_IDS) assert.equal(state.stages[id].status, 'Not Started');
    assert.equal(state.stages['5A'].approval.status, 'Not Required');
  } finally { cleanup(ws); }
});

test('checkpointed stage: start → request approval → approve, recording every required field', () => {
  const ws = makeWorkspace();
  try {
    const rel = writeArtifact(ws.dataRoot, 'modules/login/context/ProjectContext.md', 'Pending Review');
    let res = rs.startStage(ws.runsDir, ws.folderName, { stageId: 1, invocationPath: 'Direct', instruction: 'login only', now: at(1) });
    assert.equal(res.state.status, 'Running');
    assert.equal(res.state.stages['1'].status, 'Running');

    res = rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '1', artifacts: [rel], now: at(2) });
    assert.equal(res.state.stages['1'].status, 'Waiting For Approval');
    assert.equal(res.state.stages['1'].approval.status, 'Pending Review');
    assert.equal(res.state.status, 'Waiting For Approval');

    writeArtifact(ws.dataRoot, rel, '**Approved** — Jane Reviewer');
    res = rs.approveStage(ws.runsDir, ws.folderName, { stageId: '1', approvedBy: 'Jane Reviewer', now: at(3) });
    const s = res.state.stages['1'];
    assert.equal(s.stageId, '1');
    assert.equal(s.status, 'Completed');
    assert.equal(s.startedAt, at(1).toISOString());
    assert.equal(s.completedAt, at(3).toISOString());
    assert.equal(s.approval.status, 'Approved');
    assert.equal(s.approval.approvedBy, 'Jane Reviewer');
    assert.equal(s.approval.approvedAt, at(3).toISOString());
    assert.equal(s.approval.headerEvidence[0].status, 'Approved');
    assert.equal(s.invocationPath, 'Direct');
    assert.deepEqual(s.artifacts.map((a) => [a.path, a.kind]), [[rel, 'checkpoint']]);
    assert.equal(s.history.length, 3);
    // Between stages the run is in progress, not waiting and not finished.
    assert.equal(res.state.status, 'Running');
    assert.equal(res.revision, 3);
  } finally { cleanup(ws); }
});

test('the Run Manifest mirrors each transition: ledger row, one history row each, Status row', () => {
  const ws = makeWorkspace();
  try {
    passCheckpointedStage(ws, '1', 'modules/login/context/ProjectContext.md', 1);
    const ledger = readManifest(ws.runsDir, ws.folderName).stages;
    assert.equal(ledger.length, 1);
    assert.equal(ledger[0].stage, 'Stage 1 — Project Context');
    assert.equal(ledger[0].checkpointStatus, 'Approved');
    assert.equal(ledger[0].reviewer, 'Jane Reviewer');
    assert.equal(ledger[0].invocationPath, 'Pipeline');
    const text = fs.readFileSync(manifestPath(ws.runsDir, ws.folderName), 'utf8');
    assert.equal((text.match(/Stage 1: /g) || []).length, 3, 'one history row per transition, no duplicates');
    assert.match(text, /^\| Status \| Running \|$/m);
  } finally { cleanup(ws); }
});

test('Full Manual path: 1 → 2 → 3 → 4M approved, then the run completes with finishedTime', () => {
  const ws = makeWorkspace();
  try {
    passCheckpointedStage(ws, '1', 'modules/login/context/ProjectContext.md', 1);
    passCheckpointedStage(ws, '2', 'modules/login/discovery/QA_Assessment_Report.md', 10);
    passCheckpointedStage(ws, '3', 'modules/login/test_design/TestCases_Login.md', 20);
    passCheckpointedStage(ws, '4M', `runs/${ws.folderName}/manual_execution/ManualQAReport.md`, 30);
    const res = rs.completeRun(ws.runsDir, ws.folderName, { by: 'Jane Reviewer', now: at(40) });
    assert.equal(res.state.status, 'Completed');
    assert.equal(res.state.finishedTime, at(40).toISOString());
    expectCode(() => rs.startStage(ws.runsDir, ws.folderName, { stageId: '4A', invocationPath: 'Direct', now: at(41) }), 'RUN_TERMINAL');
  } finally { cleanup(ws); }
});

test('stages without a checkpoint (5A, 6A) complete directly, and 6A completion allows run completion', () => {
  const ws = makeWorkspace();
  try {
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '5A', invocationPath: 'Direct (degraded)', now: at(1) });
    registerOutput(ws, '5A'); rs.completeStage(ws.runsDir, ws.folderName, { stageId: '5A', now: at(2) });
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '6A', invocationPath: 'Pipeline', now: at(3) });
    expectCode(() => rs.completeStage(ws.runsDir, ws.folderName, { stageId: '6A', now: at(4) }), 'NO_OUTPUT');
    registerOutput(ws, '6A');
    const res = rs.completeStage(ws.runsDir, ws.folderName, { stageId: '6A', now: at(4) });
    assert.equal(res.state.stages['6A'].status, 'Completed');
    assert.equal(rs.completeRun(ws.runsDir, ws.folderName, { by: 'Ops', now: at(5) }).state.status, 'Completed');
  } finally { cleanup(ws); }
});

test('rejection keeps the feedback, blocks the stage, and the revised output passes the gate again', () => {
  const ws = makeWorkspace();
  try {
    const rel = writeArtifact(ws.dataRoot, 'modules/login/test_design/TestCases_Login.md', 'Pending Review');
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '3', invocationPath: 'Pipeline', now: at(1) });
    rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '3', artifacts: [rel], now: at(2) });
    let res = rs.rejectStage(ws.runsDir, ws.folderName, { stageId: '3', rejectedBy: 'QA Lead', feedback: 'missing negative cases', now: at(3) });
    assert.equal(res.state.stages['3'].status, 'Blocked');
    assert.equal(res.state.stages['3'].approval.status, 'Rejected');
    assert.equal(res.state.stages['3'].approval.feedback, 'missing negative cases');
    assert.equal(res.state.status, 'Blocked');
    assert.match(res.state.statusReason, /missing negative cases/);

    rs.startStage(ws.runsDir, ws.folderName, { stageId: '3', invocationPath: 'Pipeline', now: at(4) });
    rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '3', now: at(5) });
    writeArtifact(ws.dataRoot, rel, 'Approved');
    res = rs.approveStage(ws.runsDir, ws.folderName, { stageId: '3', approvedBy: 'QA Lead', now: at(6) });
    assert.equal(res.state.stages['3'].status, 'Completed');
    assert.equal(res.state.stages['3'].revisions, 1);
    assert.equal(res.state.stages['3'].attempts, 2);
  } finally { cleanup(ws); }
});

test('reopening an approved stage keeps the earlier approval and sends it through the gate again', () => {
  const ws = makeWorkspace();
  try {
    passCheckpointedStage(ws, '1', 'modules/login/context/ProjectContext.md', 1);
    const res = rs.reopenStage(ws.runsDir, ws.folderName, { stageId: '1', by: 'PO', reason: 'requirement changed', now: at(10) });
    const s = res.state.stages['1'];
    assert.equal(s.status, 'Running');
    assert.equal(s.approval.status, null);
    assert.equal(s.approval.previous.length, 1);
    assert.equal(s.approval.previous[0].approvedBy, 'Jane Reviewer');
    assert.equal(s.approval.previous[0].reopenReason, 'requirement changed');
  } finally { cleanup(ws); }
});

test('pause and resume: running stages pause with the run; resume point is explicit', () => {
  const ws = makeWorkspace();
  try {
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '2', invocationPath: 'Pipeline', now: at(1) });
    let res = rs.pauseRun(ws.runsDir, ws.folderName, { by: 'Tester', reason: 'end of day', now: at(2) });
    assert.equal(res.state.status, 'Paused');
    assert.equal(res.state.stages['2'].status, 'Paused');
    expectCode(() => rs.startStage(ws.runsDir, ws.folderName, { stageId: '2', invocationPath: 'Pipeline', now: at(3) }), 'RUN_PAUSED');

    res = rs.resumeRun(ws.runsDir, ws.folderName, { by: 'Tester', now: at(4) });
    assert.notEqual(res.state.status, 'Paused');
    assert.equal(res.state.stages['2'].status, 'Paused');
    res = rs.startStage(ws.runsDir, ws.folderName, { stageId: '2', invocationPath: 'Pipeline', now: at(5) });
    assert.equal(res.state.stages['2'].status, 'Running');
    assert.equal(res.state.stages['2'].resumes, 1);
    assert.equal(res.state.stages['2'].attempts, 1);
  } finally { cleanup(ws); }
});

test('a failed stage blocks the run (not fails it), records the reason, and can be retried', () => {
  const ws = makeWorkspace();
  try {
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '5A', invocationPath: 'Pipeline', now: at(1) });
    let res = rs.failStage(ws.runsDir, ws.folderName, { stageId: '5A', reason: 'environment unreachable', now: at(2) });
    assert.equal(res.state.stages['5A'].status, 'Failed');
    assert.equal(res.state.stages['5A'].reason, 'environment unreachable');
    assert.equal(res.state.status, 'Blocked');
    res = rs.startStage(ws.runsDir, ws.folderName, { stageId: '5A', invocationPath: 'Pipeline', now: at(3) });
    assert.equal(res.state.stages['5A'].status, 'Running');
    assert.equal(res.state.stages['5A'].reason, null);
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Invalid transitions
// ---------------------------------------------------------------------------------------------

test('illegal transitions are refused and leave the state unchanged', () => {
  const ws = makeWorkspace();
  try {
    const before = runJson(ws);
    expectCode(() => rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '1', artifacts: ['x.md'], now: at(1) }), 'ILLEGAL_TRANSITION');
    expectCode(() => rs.approveStage(ws.runsDir, ws.folderName, { stageId: '1', approvedBy: 'Jane Reviewer', now: at(1) }), 'ILLEGAL_TRANSITION');
    expectCode(() => rs.failStage(ws.runsDir, ws.folderName, { stageId: '1', reason: 'x', now: at(1) }), 'ILLEGAL_TRANSITION');
    assert.deepEqual(runJson(ws), before);

    passCheckpointedStage(ws, '1', 'modules/login/context/ProjectContext.md', 1);
    expectCode(() => rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Direct', now: at(5) }), 'ILLEGAL_TRANSITION');
    expectCode(() => rs.reopenStage(ws.runsDir, ws.folderName, { stageId: '2', by: 'QA Lead', reason: 'y', now: at(5) }), 'ILLEGAL_TRANSITION');

    rs.startStage(ws.runsDir, ws.folderName, { stageId: '2', invocationPath: 'Pipeline', now: at(6) });
    expectCode(() => rs.startStage(ws.runsDir, ws.folderName, { stageId: '2', invocationPath: 'Pipeline', now: at(7) }), 'ILLEGAL_TRANSITION');
  } finally { cleanup(ws); }
});

test('finishing a checkpointed stage is never approval; a stage with no checkpoint never waits', () => {
  const ws = makeWorkspace();
  try {
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '4A', invocationPath: 'Pipeline', now: at(1) });
    expectCode(() => rs.completeStage(ws.runsDir, ws.folderName, { stageId: '4A', now: at(2) }), 'APPROVAL_REQUIRED');
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '5A', invocationPath: 'Pipeline', now: at(3) });
    expectCode(() => rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '5A', artifacts: ['r.md'], now: at(4) }), 'NO_CHECKPOINT');
  } finally { cleanup(ws); }
});

test('an open checkpoint cannot be blocked around — only approve or reject moves it', () => {
  const ws = makeWorkspace();
  try {
    const rel = writeArtifact(ws.dataRoot, 'modules/login/context/ProjectContext.md', 'Pending Review');
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Pipeline', now: at(1) });
    rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '1', artifacts: [rel], now: at(2) });
    expectCode(() => rs.blockStage(ws.runsDir, ws.folderName, { stageId: '1', reason: 'x', now: at(3) }), 'ILLEGAL_TRANSITION');
  } finally { cleanup(ws); }
});

test('the run cannot complete before a terminal stage is done, or while a stage is open', () => {
  const ws = makeWorkspace();
  try {
    passCheckpointedStage(ws, '1', 'modules/login/context/ProjectContext.md', 1);
    expectCode(() => rs.completeRun(ws.runsDir, ws.folderName, { by: 'x', now: at(5) }), 'TERMINAL_STAGE_NOT_DONE');
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '6A', invocationPath: 'Direct', now: at(6) });
    registerOutput(ws, '6A'); rs.completeStage(ws.runsDir, ws.folderName, { stageId: '6A', now: at(7) });
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '2', invocationPath: 'Direct', now: at(8) });
    expectCode(() => rs.completeRun(ws.runsDir, ws.folderName, { by: 'x', now: at(9) }), 'STAGES_OPEN');
  } finally { cleanup(ws); }
});

test('missing invocation path, reasons and names are refused', () => {
  const ws = makeWorkspace();
  try {
    expectCode(() => rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', now: at(1) }), 'MISSING_FIELD');
    expectCode(() => rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Auto', now: at(1) }), 'INVALID_ARGUMENT');
    expectCode(() => rs.blockStage(ws.runsDir, ws.folderName, { stageId: '1', now: at(1) }), 'MISSING_FIELD');
    expectCode(() => rs.pauseRun(ws.runsDir, ws.folderName, { now: at(1) }), 'MISSING_FIELD');
    expectCode(() => rs.cancelRun(ws.runsDir, ws.folderName, { by: 'x', now: at(1) }), 'MISSING_FIELD');
    expectCode(() => rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Direct' }), 'INVALID_ARGUMENT');
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Missing approval — the header is authoritative
// ---------------------------------------------------------------------------------------------

test('approval needs a named approver', () => {
  const ws = makeWorkspace();
  try {
    const rel = writeArtifact(ws.dataRoot, 'modules/login/context/ProjectContext.md', 'Approved');
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Pipeline', now: at(1) });
    rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '1', artifacts: [rel], now: at(2) });
    expectCode(() => rs.approveStage(ws.runsDir, ws.folderName, { stageId: '1', now: at(3) }), 'MISSING_FIELD');
    expectCode(() => rs.approveStage(ws.runsDir, ws.folderName, { stageId: '1', approvedBy: '   ', now: at(3) }), 'MISSING_FIELD');
  } finally { cleanup(ws); }
});

test('approval is refused when the artifact header does not read Approved, and nothing changes', () => {
  const ws = makeWorkspace();
  try {
    const rel = writeArtifact(ws.dataRoot, 'modules/login/context/ProjectContext.md', 'Pending Review');
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Pipeline', now: at(1) });
    rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '1', artifacts: [rel], now: at(2) });
    const before = runJson(ws);
    expectCode(() => rs.approveStage(ws.runsDir, ws.folderName, { stageId: '1', approvedBy: 'Jane', now: at(3) }), 'APPROVAL_NOT_IN_HEADER');
    assert.deepEqual(runJson(ws), before);
  } finally { cleanup(ws); }
});

test('approval is refused when a checkpoint artifact is missing or has no status header', () => {
  const ws = makeWorkspace();
  try {
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '2', invocationPath: 'Pipeline', now: at(1) });
    // Exit gate: approval cannot even be requested for an artifact that does not exist.
    expectCode(() => rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '2', artifacts: ['modules/login/discovery/missing.md'], now: at(2) }), 'MISSING_ARTIFACT');

    const noHeader = path.join(ws.dataRoot, 'modules/login/discovery/plain.md');
    fs.mkdirSync(path.dirname(noHeader), { recursive: true });
    fs.writeFileSync(noHeader, '# Findings\n\nApproved by everyone, honestly.\n');
    // Phase 5.7 (finding #8): an artifact with no Status header is never a checkpoint — its approval could
    // never be verified — so approval is not even requested for it.
    expectCode(() => rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '2', artifacts: ['modules/login/discovery/plain.md'], now: at(3) }), 'INVALID_CHECKPOINT');
    expectCode(() => rs.recordStageArtifacts(ws.runsDir, ws.folderName, { stageId: '2', artifacts: [{ path: 'modules/login/discovery/plain.md', kind: 'checkpoint' }], now: at(3) }), 'INVALID_CHECKPOINT');

    // Present (with a header) when approval was requested, gone by the time the reviewer decides: refused.
    const withHeader = writeArtifact(ws.dataRoot, 'modules/login/discovery/QA_Assessment_Report.md', 'Pending Review');
    rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '2', artifacts: [withHeader], now: at(4) });
    fs.rmSync(path.join(ws.dataRoot, withHeader));
    expectCode(() => rs.approveStage(ws.runsDir, ws.folderName, { stageId: '2', approvedBy: 'Jane Reviewer', now: at(5) }), 'APPROVAL_NOT_IN_HEADER');
  } finally { cleanup(ws); }
});

test('requesting approval needs a checkpoint artifact to check the header of', () => {
  const ws = makeWorkspace();
  try {
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Pipeline', now: at(1) });
    expectCode(() => rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '1', now: at(2) }), 'MISSING_FIELD');
  } finally { cleanup(ws); }
});

test('a Run Manifest row reading "Approved" never makes a stage approved', () => {
  const ws = makeWorkspace();
  try {
    // Phase 5.7 (finding #9): on a state-model run the Manifest-only record is refused outright.
    assert.throws(() => recordStage(ws.runsDir, ws.folderName, { stage: 'Stage 1 — Project Context', checkpointStatus: 'Approved', reviewer: 'Someone', now: at(1) }),
      (e) => e.code === 'MANIFEST_ONLY_REFUSED');
    const state = rs.readRunState(ws.runsDir, ws.folderName);
    assert.equal(state.stages['1'].status, 'Not Started');
    assert.notEqual(state.stages['1'].approval.status, 'Approved');
    assert.equal(rs.verifyStageApproval(ws.runsDir, ws.folderName, '1').verified, false);
  } finally { cleanup(ws); }
});

test('verifyStageApproval re-reads headers: an approval goes unverified when its header moves', () => {
  const ws = makeWorkspace();
  try {
    const rel = 'modules/login/context/ProjectContext.md';
    passCheckpointedStage(ws, '1', rel, 1);
    assert.equal(rs.verifyStageApproval(ws.runsDir, ws.folderName, '1', { dataRoot: ws.dataRoot }).verified, true);
    writeArtifact(ws.dataRoot, rel, 'Pending Review');
    const res = rs.verifyStageApproval(ws.runsDir, ws.folderName, '1', { dataRoot: ws.dataRoot });
    assert.equal(res.verified, false);
    assert.match(res.reason, /Pending Review/);
  } finally { cleanup(ws); }
});

test('the header reader takes only the leading status word and never guesses Approved', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hdr-'));
  try {
    const w = (name, text) => { const f = path.join(dir, name); fs.writeFileSync(f, text); return f; };
    assert.equal(readArtifactApprovalStatus(w('a.md', '| Status | **Approved** — Jane, then TC-1 reset to Pending |\n')).status, 'Mixed', 'a partial approval is not an approval');
    assert.equal(readArtifactApprovalStatus(w('a2.md', '| Status | **Approved** — Jane, Stage 3 gate |\n')).status, 'Approved');
    assert.equal(readArtifactApprovalStatus(w('a3.md', '| Status | Approved <!-- Pending Review / Approved --> |\n')).status, 'Approved', 'template guidance comments are ignored');
    assert.equal(readArtifactApprovalStatus(w('b.md', '| Status | Pending Automation Approval |\n')).status, 'Pending Automation Approval');
    assert.equal(readArtifactApprovalStatus(w('c.md', '---\nname: x\nstatus: "Approved"\n---\n')).status, 'Approved');
    assert.equal(readArtifactApprovalStatus(w('d.md', '| Status | Looks approved to me |\n')).status, 'Unknown');
    assert.equal(readArtifactApprovalStatus(w('f.md', '# Repair Summary\n\n**Status:** Pending Automation Approval <!-- x -->\n')).status, 'Pending Automation Approval');
    assert.equal(readArtifactApprovalStatus(w('g.md', '| Status | Count | % of scope |\n')).status, 'Unknown', 'a results-count table is not an approval header');
    assert.equal(readArtifactApprovalStatus(w('e.md', 'status: Approved\n')).status, 'Unknown', 'status: outside frontmatter is prose');
    assert.equal(readArtifactApprovalStatus(w('.module_automation_state.json', '{"state":"Promoted"}')).status, 'Approved');
    assert.equal(readArtifactApprovalStatus(path.join(dir, 'nope.md')).source, 'unreadable');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------------------------------------
// Unknown stage IDs
// ---------------------------------------------------------------------------------------------

test('unknown stage IDs are refused; case and numeric forms normalize', () => {
  for (const bad of ['4', '7A', 'X', '', null, undefined, 9]) {
    expectCode(() => rs.normalizeStageId(bad), 'UNKNOWN_STAGE');
  }
  assert.equal(rs.normalizeStageId(1), '1');
  assert.equal(rs.normalizeStageId('4m'), '4M');
  const ws = makeWorkspace();
  try {
    expectCode(() => rs.startStage(ws.runsDir, ws.folderName, { stageId: '4', invocationPath: 'Direct', now: at(1) }), 'UNKNOWN_STAGE');
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Historical run compatibility
// ---------------------------------------------------------------------------------------------

function writeLegacyRun(runsDir, folderName, runJsonValue, manifestText) {
  fs.mkdirSync(path.join(runsDir, folderName, 'metadata'), { recursive: true });
  const file = path.join(runsDir, folderName, 'metadata', 'run.json');
  fs.writeFileSync(file, JSON.stringify(runJsonValue, null, 2));
  if (manifestText) fs.writeFileSync(path.join(runsDir, folderName, 'metadata', 'RunManifest.md'), manifestText);
  return file;
}

test('historical runs read as Unknown — never Completed or Approved — whatever they recorded', () => {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'legacy-'));
  const runsDir = path.join(dataRoot, 'runs');
  try {
    const manifest = '# Run Manifest\n\n## 2. Stage Ledger\n\n| Stage | Artifact | Timestamp | Checkpoint Status | Reviewer | Revisions | Invocation Path | Run-Scoped Instruction |\n|---|---|---|---|---|---|---|---|\n| Stage 1 | x | t | Approved | Jane | 0 | Pipeline | — |\n';
    const cases = [
      ['run-001__legacy-preparing', { folderName: 'run-001__legacy-preparing', status: 'Preparing' }, manifest],
      ['run-002__legacy-inprogress', { folderName: 'run-002__legacy-inprogress', status: 'In Progress' }, null],
      ['run-003__legacy-nostatus', { folderName: 'run-003__legacy-nostatus' }, null],
    ];
    for (const [folder, json, man] of cases) {
      writeLegacyRun(runsDir, folder, json, man);
      const state = rs.readRunState(runsDir, folder);
      assert.equal(state.legacy, true);
      assert.equal(state.status, 'Unknown');
      assert.equal(state.recordedStatus, json.status ?? null);
      for (const id of rs.STAGE_IDS) {
        assert.equal(state.stages[id].status, 'Unknown');
        assert.equal(state.stages[id].approval.status, 'Unknown');
      }
    }
    // The old ledger is shown for information, but it approves nothing.
    const withLedger = rs.readRunState(runsDir, 'run-001__legacy-preparing');
    assert.equal(withLedger.manifestLedger[0].checkpointStatus, 'Approved');
    assert.equal(withLedger.stages['1'].approval.status, 'Unknown');
    assert.equal(rs.verifyStageApproval(runsDir, 'run-001__legacy-preparing', '1').verified, false);
  } finally { fs.rmSync(dataRoot, { recursive: true, force: true }); }
});

test('historical runs are never written: every write is refused and the files stay byte-identical', () => {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'legacy-'));
  const runsDir = path.join(dataRoot, 'runs');
  try {
    const folder = 'reissue-run-003__legacy';
    const file = writeLegacyRun(runsDir, folder, { folderName: folder, status: 'Preparing', stages: 'not ours' }, '# Run Manifest\n');
    const metaDir = path.dirname(file);
    const snapshot = () => fs.readdirSync(metaDir).sort().map((n) => [n, fs.readFileSync(path.join(metaDir, n), 'utf8')]);
    const before = snapshot();
    const writes = [
      () => rs.startStage(runsDir, folder, { stageId: '1', invocationPath: 'Direct', now: at(1) }),
      () => rs.blockStage(runsDir, folder, { stageId: '1', reason: 'x', now: at(1) }),
      () => rs.pauseRun(runsDir, folder, { by: 'x', now: at(1) }),
      () => rs.cancelRun(runsDir, folder, { by: 'x', reason: 'y', now: at(1) }),
    ];
    for (const w of writes) expectCode(w, 'LEGACY_RUN');
    assert.deepEqual(snapshot(), before, 'no file added, removed, or changed — the lock file is gone too');
  } finally { fs.rmSync(dataRoot, { recursive: true, force: true }); }
});

test('a run from a newer schema is refused rather than misread', () => {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'future-'));
  const runsDir = path.join(dataRoot, 'runs');
  try {
    writeLegacyRun(runsDir, 'run-009__future', { folderName: 'run-009__future', stateSchemaVersion: 99, status: 'Running', stages: {} });
    expectCode(() => rs.readRunState(runsDir, 'run-009__future'), 'UNSUPPORTED_SCHEMA');
  } finally { fs.rmSync(dataRoot, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------------------------------------
// Persistence and recovery
// ---------------------------------------------------------------------------------------------

test('state persists to disk and is read back identically by a separate process', async () => {
  const ws = makeWorkspace();
  try {
    passCheckpointedStage(ws, '1', 'modules/login/context/ProjectContext.md', 1);
    const local = rs.readRunState(ws.runsDir, ws.folderName);
    const script = `const rs=require(${JSON.stringify(path.resolve(__dirname, '../runState.js'))});` +
      `process.stdout.write(JSON.stringify(rs.readRunState(${JSON.stringify(ws.runsDir)},${JSON.stringify(ws.folderName)})))`;
    const out = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['-e', script]);
      let buf = '';
      child.stdout.on('data', (d) => { buf += d; });
      child.on('error', reject);
      child.on('exit', (code) => (code === 0 ? resolve(buf) : reject(new Error(`child exited ${code}`))));
    });
    assert.deepEqual(JSON.parse(out), JSON.parse(JSON.stringify(local)));
  } finally { cleanup(ws); }
});

test('a crashed write leaves run.json intact: a stray temp file is ignored and the next write succeeds', () => {
  const ws = makeWorkspace();
  try {
    const file = rs.runJsonPath(ws.runsDir, ws.folderName);
    fs.writeFileSync(`${file}.12345.deadbeef.tmp`, '{"truncated": ');
    assert.equal(rs.readRunState(ws.runsDir, ws.folderName).status, 'Preparing');
    const res = rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Pipeline', now: at(1) });
    assert.equal(res.state.stages['1'].status, 'Running');
    assert.doesNotThrow(() => JSON.parse(fs.readFileSync(file, 'utf8')));
  } finally { cleanup(ws); }
});

test('a corrupt run.json is reported, never treated as legacy and never overwritten', () => {
  const ws = makeWorkspace();
  try {
    const file = rs.runJsonPath(ws.runsDir, ws.folderName);
    fs.writeFileSync(file, '{ not json');
    expectCode(() => rs.readRunState(ws.runsDir, ws.folderName), 'CORRUPT_RUN_JSON');
    expectCode(() => rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Pipeline', now: at(1) }), 'CORRUPT_RUN_JSON');
    assert.equal(fs.readFileSync(file, 'utf8'), '{ not json');
  } finally { cleanup(ws); }
});

test('a lock abandoned by a crashed holder is recovered; a live lock times out cleanly', () => {
  const ws = makeWorkspace();
  try {
    const lock = rs.runLockPath(ws.runsDir, ws.folderName);
    fs.writeFileSync(lock, '{"token":"crashed"}');
    const old = new Date(Date.now() - 10 * 60 * 1000);
    fs.utimesSync(lock, old, old);
    const res = rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Pipeline', now: at(1) });
    assert.equal(res.state.stages['1'].status, 'Running');
    assert.equal(fs.existsSync(lock), false);

    fs.writeFileSync(lock, '{"token":"alive"}');
    assert.throws(
      () => rs.blockStage(ws.runsDir, ws.folderName, { stageId: '2', reason: 'x', now: at(2), lock: { timeoutMs: 100 } }),
      (err) => err.code === 'LOCK_TIMEOUT'
    );
    assert.equal(fs.readFileSync(lock, 'utf8'), '{"token":"alive"}', 'another holder\'s lock is never removed');
    fs.rmSync(lock);
  } finally { cleanup(ws); }
});

test('expectedRevision refuses to act on a state that moved since it was read', () => {
  const ws = makeWorkspace();
  try {
    const { revision } = rs.readRunState(ws.runsDir, ws.folderName);
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Pipeline', now: at(1), expectedRevision: revision });
    expectCode(
      () => rs.blockStage(ws.runsDir, ws.folderName, { stageId: '2', reason: 'x', now: at(2), expectedRevision: revision }),
      'REVISION_CONFLICT'
    );
  } finally { cleanup(ws); }
});

test('createRun\'s in-place updaters wait for the run lock instead of writing over a state change', async () => {
  const ws = makeWorkspace();
  try {
    const lock = rs.runLockPath(ws.runsDir, ws.folderName);
    fs.writeFileSync(lock, '{"token":"held-by-test"}');
    const HOLD_MS = 600;
    const createRunPath = JSON.stringify(path.resolve(__dirname, '../createRun.js'));
    const script = `const {backfillTargetRef}=require(${createRunPath});const t=Date.now();` +
      `const r=backfillTargetRef(${JSON.stringify(ws.runsDir)},${JSON.stringify(ws.folderName)},` +
      `{now:new Date(),targetRoot:${JSON.stringify(ws.dataRoot)},execFileSync:()=>{throw new Error('no git')}});` +
      'process.stdout.write(JSON.stringify({waited:Date.now()-t,updated:r.updated}))';
    const child = spawn(process.execPath, ['-e', script]);
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    const done = new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`child exited ${code}`))));
    });
    setTimeout(() => fs.rmSync(lock, { force: true }), HOLD_MS);
    await done;
    const res = JSON.parse(out);
    assert.ok(res.waited >= HOLD_MS - 100, `the updater waited for the lock (waited ${res.waited} ms)`);
    assert.equal(res.updated, true);
    const meta = runJson(ws);
    assert.equal(meta.targetRefBackfilled, true);
    assert.equal(meta.stateSchemaVersion, rs.STATE_SCHEMA_VERSION, 'state fields survive the backfill');
    assert.equal(fs.existsSync(lock), false);
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Concurrent updates
// ---------------------------------------------------------------------------------------------

test('concurrent updates from separate processes are all kept — no lost update, no torn file', async () => {
  const ws = makeWorkspace();
  try {
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '2', invocationPath: 'Pipeline', now: at(1) });
    const base = rs.readRunState(ws.runsDir, ws.folderName).revision;
    const WORKERS = 4;
    const EACH = 8;
    const modulePath = JSON.stringify(path.resolve(__dirname, '../runState.js'));
    const run = (w) => new Promise((resolve, reject) => {
      const script = `const rs=require(${modulePath});` +
        `for(let i=0;i<${EACH};i++){rs.recordStageArtifacts(${JSON.stringify(ws.runsDir)},${JSON.stringify(ws.folderName)},` +
        `{stageId:'2',artifacts:['evidence/w${w}-'+i+'.png'],now:new Date(),lock:{timeoutMs:60000}});}`;
      const child = spawn(process.execPath, ['-e', script]);
      let err = '';
      child.stderr.on('data', (d) => { err += d; });
      child.on('error', reject);
      child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`worker ${w} exited ${code}: ${err}`))));
    });
    await Promise.all(Array.from({ length: WORKERS }, (_, w) => run(w)));

    const state = rs.readRunState(ws.runsDir, ws.folderName);
    assert.equal(state.stages['2'].artifacts.length, WORKERS * EACH, 'every artifact from every process is present');
    assert.equal(state.revision, base + WORKERS * EACH, 'every write was applied exactly once');
    const leftovers = fs.readdirSync(path.dirname(rs.runJsonPath(ws.runsDir, ws.folderName))).filter((n) => /\.tmp$|\.lock$/.test(n));
    assert.deepEqual(leftovers, []);
    const ledger = readManifest(ws.runsDir, ws.folderName).stages;
    assert.equal(ledger.length, 1, 'the manifest still has exactly one row for the stage');
  } finally { cleanup(ws); }
});
