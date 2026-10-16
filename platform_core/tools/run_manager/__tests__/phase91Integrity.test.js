// Phase 9.1 — regression tests for the Phase 9 blocking findings in the Run Manager:
//   F-01 approval provenance · F-02 evidence-backed outcomes · F-03 execution evidence integrity ·
//   F-07 artifact path isolation. Every test uses a disposable data root.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const rs = require('../runState');
// Phase 9.2 (F-16): execution-stage starts are preceded by the operator's Safety Preflight (approvalFixture).
require('./approvalFixture').autoPreflight(rs);
const gate = require('../stageGate');
const { createRun } = require('../createRun');
const { checkResultsIntegrity } = require('../resultsIntegrity');
const { checkReportConsistency } = require('../reportIntegrity');
const { recordFixtureApproval, writeResults } = require('./approvalFixture');
const { writeVerifiedReport } = require('./reportFixture');
const automationState = require('../../module_manager/automationState');

const CLI = path.join(__dirname, '..', 'cli.js');
const T0 = new Date('2026-10-09T09:00:00Z');
let minute = 0;
const tick = () => new Date(T0.getTime() + (minute += 1) * 60000);
const expectCode = (fn, code) => assert.throws(fn, (err) => err.code === code, `expected ${code}`);

function workspace({ git = false } = {}) {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'p91-'));
  const runsDir = path.join(dataRoot, 'runs');
  fs.mkdirSync(runsDir, { recursive: true });
  if (git) {
    execFileSync('git', ['init', '-q'], { cwd: dataRoot });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dataRoot });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dataRoot });
    execFileSync('git', ['config', 'commit.gpgsign', 'false'], { cwd: dataRoot });
    execFileSync('git', ['config', 'core.autocrlf', 'false'], { cwd: dataRoot });
  }
  const { folderName } = createRun(runsDir, { scope: 'Module', target: 'Login', now: T0, extraRunJson: { modules: ['login'], moduleScope: 'single' } });
  return { dataRoot, runsDir, folderName };
}
const cleanup = (ws) => fs.rmSync(ws.dataRoot, { recursive: true, force: true });
const put = (ws, rel, text) => { const f = path.join(ws.dataRoot, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); return rel; };
const art = (status, body = 'Body.') => `# Artifact\n\n| Field | Value |\n|---|---|\n| Status | ${status} |\n\n${body}\n`;
const commit = (ws, msg = 'c') => { execFileSync('git', ['add', '-A'], { cwd: ws.dataRoot }); execFileSync('git', ['commit', '-qm', msg], { cwd: ws.dataRoot }); };
const cli = (ws, ...args) => { const r = spawnSync(process.execPath, [CLI, ...args, '--runs-dir', ws.runsDir], { encoding: 'utf8' }); return { code: r.status, text: `${r.stdout}\n${r.stderr}` }; };

const PC = 'modules/login/context/ProjectContext.md';
const TC = 'modules/login/test_design/TestCases_Login.md';
const CASE = (id) => `### ${id} — Case ${id}\n\n**Objective:** Check ${id}.\n\n**Preconditions:** A user exists.\n\n**Test Data:** None.\n\n**Steps:**\n\n1. Do it.\n\n**Expected Result:** It works.\n\n**Assertions:**\n\n| Assertion ID | Expected | Expected Source | Check | Requirement |\n|---|---|---|---|---|\n| A1 | It works | Expected Result | equals | AC-1 |\n\n**Priority:** P1\n\n**Tags:** Regression\n\n**Review:** Approved\n\n**Automation:** Approved\n`;
const SUITE = `## Test Cases\n\n${['TC-LOGIN-001', 'TC-LOGIN-002'].map(CASE).join('\n')}`;

/** Upstream 1 + 3 approved THROUGH the model, a module automation approval, and a started 5A. */
function automationReady(ws) {
  put(ws, PC, art('Approved')); put(ws, TC, art('Approved', SUITE));
  recordFixtureApproval(ws.dataRoot, [PC]); recordFixtureApproval(ws.dataRoot, [TC]);
  const plan = put(ws, 'modules/login/automation/AutomationPlan_Playwright.md', art('Approved'));
  recordFixtureApproval(ws.dataRoot, [plan]);
  const modulesDir = path.join(ws.dataRoot, 'modules');
  automationState.setAutomationState(modulesDir, 'login', 'Generated', { now: tick() });
  automationState.setAutomationState(modulesDir, 'login', 'Approved', { now: tick(), approvedBy: 'Automation Lead' });
  rs.startStage(ws.runsDir, ws.folderName, { stageId: '5A', invocationPath: 'Pipeline', now: tick() });
}
function results5A(ws, rows = [['TC-LOGIN-001', 'Passed'], ['TC-LOGIN-002', 'Failed']], file) {
  const rel = writeResults(ws.dataRoot, ws.folderName, '5A', rows, { file });
  rs.recordStageArtifacts(ws.runsDir, ws.folderName, { stageId: '5A', artifacts: [rel], now: tick() });
  return rel;
}

// =============================================================================================
// F-01 — approval provenance
// =============================================================================================

test('F-01: a forged Approved header (no recorded approval) blocks the downstream gate — API and CLI', () => {
  const ws = workspace();
  try {
    put(ws, PC, art('Approved'));
    const g = gate.checkStageEntry(ws.runsDir, ws.folderName, { stageId: '2', invocationPath: 'Pipeline', now: tick() });
    assert.equal(g.decision, 'blocked');
    assert.equal(g.checks.find((c) => c.artifact === PC).result, 'unrecorded');
    const r = cli(ws, 'state', 'start', '2', '--invocation', 'Pipeline', '--run', ws.folderName);
    assert.equal(r.code, 2, r.text);
    assert.match(r.text, /a header alone never authorizes a downstream stage/);
  } finally { cleanup(ws); }
});

test('F-01: a recorded named approval with a matching fingerprint proceeds; any later edit is `modified`, even with the header still Approved', () => {
  const ws = workspace();
  try {
    put(ws, PC, art('Approved'));
    recordFixtureApproval(ws.dataRoot, PC, { by: 'BA Reviewer' });
    const ok = gate.checkStageEntry(ws.runsDir, ws.folderName, { stageId: '2', invocationPath: 'Pipeline', now: tick() });
    assert.equal(ok.decision, 'proceed', ok.blockers.join('\n'));
    assert.equal(ok.checks.find((c) => c.artifact === PC).integrity, 'verified');
    put(ws, PC, art('Approved', 'Quietly edited after approval.'));
    const stale = gate.checkStageEntry(ws.runsDir, ws.folderName, { stageId: '2', invocationPath: 'Pipeline', now: tick() });
    assert.equal(stale.decision, 'blocked');
    assert.equal(stale.checks.find((c) => c.artifact === PC).result, 'modified');
  } finally { cleanup(ws); }
});

test('F-01: a recorded approval with no fingerprint cannot authorize (unverifiable)', () => {
  const ws = workspace();
  try {
    put(ws, PC, art('Approved'));
    recordFixtureApproval(ws.dataRoot, PC);
    const f = path.join(ws.runsDir, 'fixture-approvals', 'metadata', 'run.json');
    const meta = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const s of Object.values(meta.stages)) for (const e of s.approval.headerEvidence) e.sha256 = null;
    fs.writeFileSync(f, JSON.stringify(meta));
    const g = gate.checkStageEntry(ws.runsDir, ws.folderName, { stageId: '2', invocationPath: 'Pipeline', now: tick() });
    assert.equal(g.decision, 'blocked');
    assert.equal(g.checks.find((c) => c.artifact === PC).result, 'unverifiable');
  } finally { cleanup(ws); }
});

test('F-01: a Mixed (partial) header is not an approval; a hand-set Module Manager "Approved" with no approver is a conflict', () => {
  const ws = workspace();
  try {
    put(ws, PC, art('**Approved** — §1. **`PO-30`: Pending Review**'));
    const g = gate.checkStageEntry(ws.runsDir, ws.folderName, { stageId: '2', invocationPath: 'Pipeline', now: tick() });
    assert.equal(g.decision, 'blocked');
    // automation state written by hand: Approved, no approver, no history
    put(ws, PC, art('Approved')); recordFixtureApproval(ws.dataRoot, PC);
    put(ws, TC, art('Approved', SUITE)); recordFixtureApproval(ws.dataRoot, TC);
    put(ws, 'modules/login/automation/.module_automation_state.json', JSON.stringify({ state: 'Approved' }));
    const g5 = gate.checkStageEntry(ws.runsDir, ws.folderName, { stageId: '5A', invocationPath: 'Pipeline', now: tick() });
    assert.equal(g5.decision, 'blocked');
    assert.ok(g5.blockers.some((b) => /no named approver/.test(b)), g5.blockers.join('\n'));
  } finally { cleanup(ws); }
});

function legacyFixture(ws, { reference = true } = {}) {
  const legacy = 'run-001__2026-07-31_11-56-38__UserStory__Legacy';
  put(ws, `runs/${legacy}/metadata/run.json`, JSON.stringify({ folderName: legacy, status: 'Completed', modules: ['login'] }));
  put(ws, `runs/${legacy}/metadata/RunManifest.md`, `# Run Manifest\n\n| Stage | Status | Artifact |\n|---|---|---|\n| 1 | Approved by Jane Reviewer | ${reference ? `\`${PC}\`` : '`elsewhere.md`'} |\n`);
  put(ws, PC, art('Approved'));
  return legacy;
}

test('F-01: legacy approval is carried forward only by a named attestation backed by committed legacy evidence; the historical run is untouched', () => {
  const ws = workspace({ git: true });
  try {
    const legacy = legacyFixture(ws);
    commit(ws, 'history');
    const legacyBefore = fs.readFileSync(path.join(ws.runsDir, legacy, 'metadata', 'run.json'), 'utf8');
    const attest = (o = {}) => rs.attestLegacyApproval(ws.runsDir, ws.folderName, { artifact: PC, legacyRun: legacy, approvedBy: 'Jane Reviewer', reason: 'approved in run-001 (Stage 1)', now: tick(), ...o });
    expectCode(() => attest({ approvedBy: '' }), 'MISSING_FIELD');
    expectCode(() => attest({ legacyRun: ws.folderName }), 'NOT_LEGACY');
    expectCode(() => attest({ legacyRun: '../x' }), 'INVALID_ARGUMENT');
    const res = attest();
    assert.equal(res.legacyApproval.legacyRun, legacy);
    assert.match(res.legacyApproval.evidence.file, /RunManifest\.md$/);
    expectCode(() => attest(), 'ALREADY_ATTESTED');
    const g = gate.checkStageEntry(ws.runsDir, ws.folderName, { stageId: '2', invocationPath: 'Pipeline', now: tick() });
    assert.equal(g.decision, 'proceed', g.blockers.join('\n'));
    assert.equal(g.checks.find((c) => c.artifact === PC).integrity, 'legacy-attested');
    // An edit after attestation makes it stale, like any modified approval.
    put(ws, PC, art('Approved', 'edited after attestation'));
    assert.equal(gate.checkStageEntry(ws.runsDir, ws.folderName, { stageId: '2', invocationPath: 'Pipeline', now: tick() }).checks.find((c) => c.artifact === PC).result, 'modified');
    assert.equal(fs.readFileSync(path.join(ws.runsDir, legacy, 'metadata', 'run.json'), 'utf8'), legacyBefore, 'the historical run is never written');
  } finally { cleanup(ws); }
});

test('F-01: attestation is refused without committed provenance, without a reference, for an uncommitted artifact, or over recorded history', () => {
  const ws = workspace({ git: true });
  try {
    const legacy = legacyFixture(ws);
    const attest = (o = {}) => () => rs.attestLegacyApproval(ws.runsDir, ws.folderName, { artifact: PC, legacyRun: legacy, approvedBy: 'Jane Reviewer', reason: 'r', now: tick(), ...o });
    expectCode(attest(), 'PROVENANCE_UNVERIFIABLE'); // nothing committed yet
    commit(ws);
    put(ws, PC, art('Approved', 'uncommitted change'));
    expectCode(attest(), 'PROVENANCE_UNVERIFIABLE');
    commit(ws);
    fs.appendFileSync(path.join(ws.runsDir, legacy, 'metadata', 'RunManifest.md'), '\n| 2 | forged | x |\n');
    expectCode(attest(), 'PROVENANCE_UNVERIFIABLE');
    execFileSync('git', ['checkout', '--', '.'], { cwd: ws.dataRoot });
    // a legacy run that never names the artifact
    const other = 'run-002__legacy-other';
    put(ws, `runs/${other}/metadata/run.json`, JSON.stringify({ folderName: other, status: 'Completed' }));
    put(ws, `runs/${other}/metadata/RunManifest.md`, '# Manifest\n\nNothing here.\n');
    commit(ws);
    expectCode(attest({ legacyRun: other }), 'NO_LEGACY_EVIDENCE');
    // recorded history (a rejection) is never laundered
    put(ws, PC, art('Pending Review')); commit(ws);
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Pipeline', now: tick() });
    rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '1', artifacts: [PC], now: tick() });
    rs.rejectStage(ws.runsDir, ws.folderName, { stageId: '1', rejectedBy: 'BA', feedback: 'no', now: tick() });
    put(ws, PC, art('Approved')); commit(ws);
    expectCode(attest(), 'RECORDED_HISTORY_EXISTS');
    // and the data root without git cannot attest at all
    const plain = workspace();
    try {
      const l2 = legacyFixture(plain);
      expectCode(() => rs.attestLegacyApproval(plain.runsDir, plain.folderName, { artifact: PC, legacyRun: l2, approvedBy: 'Jane Reviewer', reason: 'r', now: tick() }), 'PROVENANCE_UNVERIFIABLE');
    } finally { cleanup(plain); }
  } finally { cleanup(ws); }
});

// =============================================================================================
// F-02 — evidence-backed outcomes
// =============================================================================================

test('F-02: typed counts are unverified diagnostics — never a pass verdict, never enough to approve 4M or complete 5A (Phase 9 G-3)', () => {
  const ws = workspace();
  try {
    put(ws, PC, art('Approved')); put(ws, TC, art('Approved', SUITE));
    recordFixtureApproval(ws.dataRoot, [PC]); recordFixtureApproval(ws.dataRoot, [TC]);
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '4M', invocationPath: 'Pipeline', now: tick() });
    const r = cli(ws, 'state', 'outcome', '4M', '--passed', '3', '--run', ws.folderName);
    assert.equal(r.code, 0, r.text);
    assert.match(r.text, /UNVERIFIED/);
    const o = rs.readRunState(ws.runsDir, ws.folderName).stages['4M'].outcome;
    assert.deepEqual([o.verdict, o.claimedVerdict, o.verified, o.basis], ['incomplete', 'all-passed', false, 'typed']);
    const SUM = put(ws, `runs/${ws.folderName}/manual_execution/ManualExecutionSummary.md`, art('Pending Review'));
    rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '4M', artifacts: [SUM], now: tick() });
    put(ws, SUM, art('Approved'));
    expectCode(() => rs.approveStage(ws.runsDir, ws.folderName, { stageId: '4M', approvedBy: 'QA Lead', now: tick() }), 'OUTCOME_NOT_FROM_RESULTS');
    // A green report against typed counts never verifies.
    const md = path.join(ws.dataRoot, `runs/${ws.folderName}/reporting/Final_QA_Report.md`);
    writeVerifiedReport(ws.runsDir, ws.folderName, md, { counts: { Passed: 3 }, verdict: 'all-passed' });
    const chk = checkReportConsistency({ md, json: md.replace(/\.md$/, '.report.json'), html: md.replace(/\.md$/, '.html'), outcome: o, requireOutcome: true, requireVerdict: true });
    assert.equal(chk.ok, false);
  } finally { cleanup(ws); }
});

test('F-02: from results, a Passed without verified assertion evidence is Unverified and the verdict is never all-passed', () => {
  const ws = workspace();
  try {
    automationReady(ws);
    const rel = writeResults(ws.dataRoot, ws.folderName, '5A', [['TC-LOGIN-001', 'Passed']], { expected: 'Something else' });
    rs.recordStageArtifacts(ws.runsDir, ws.folderName, { stageId: '5A', artifacts: [rel], now: tick() });
    const o = rs.recordOutcomeFromResults(ws.runsDir, ws.folderName, { stageId: '5A', now: tick() }).state.stages['5A'].outcome;
    assert.notEqual(o.verdict, 'all-passed');
    assert.equal(o.tests[0].final, 'Unverified');
  } finally { cleanup(ws); }
});

// =============================================================================================
// F-03 — execution evidence integrity
// =============================================================================================

test('F-03 (Phase 9 DI-1): results rewritten after the outcome and before completion — completion refused RESULTS_MODIFIED', () => {
  const ws = workspace();
  try {
    automationReady(ws);
    const rel = results5A(ws);
    rs.recordOutcomeFromResults(ws.runsDir, ws.folderName, { stageId: '5A', now: tick() });
    put(ws, rel, fs.readFileSync(path.join(ws.dataRoot, rel), 'utf8').replace('| Failed |', '| Passed |'));
    expectCode(() => rs.completeStage(ws.runsDir, ws.folderName, { stageId: '5A', now: tick() }), 'RESULTS_MODIFIED');
    expectCode(() => rs.recordOutcomeFromResults(ws.runsDir, ws.folderName, { stageId: '5A', now: tick() }), 'RESULTS_MODIFIED');
  } finally { cleanup(ws); }
});

test('F-03 (Phase 9 DI-2): results rewritten after 5A completed — verify, every entry gate, Run Health, the dashboard, telemetry and the Final QA Report all report it', () => {
  const ws = workspace();
  try {
    automationReady(ws);
    const rel = results5A(ws);
    rs.recordOutcomeFromResults(ws.runsDir, ws.folderName, { stageId: '5A', now: tick() });
    rs.completeStage(ws.runsDir, ws.folderName, { stageId: '5A', now: tick() });
    assert.equal(rs.verifyStageApproval(ws.runsDir, ws.folderName, '5A').verified, true);
    const original = fs.readFileSync(path.join(ws.dataRoot, rel), 'utf8');
    const forged = original.replace('| Failed |', '| Passed |');
    put(ws, rel, forged);

    const v = rs.verifyStageApproval(ws.runsDir, ws.folderName, '5A');
    assert.equal(v.verified, false); assert.equal(v.current, false); assert.equal(v.code, 'RESULTS_MODIFIED');
    const r = cli(ws, 'state', 'verify', '5A', '--run', ws.folderName);
    assert.equal(r.code, 2); assert.match(r.text, /RESULTS_MODIFIED/);

    for (const id of ['6A', '5H']) {
      const g = gate.checkStageEntry(ws.runsDir, ws.folderName, { stageId: id, invocationPath: 'Direct', now: tick() });
      assert.equal(g.decision, 'blocked'); assert.ok(g.blockers.some((b) => /RESULTS_MODIFIED/.test(b)), id);
    }
    const integ = checkResultsIntegrity(ws.runsDir, ws.folderName);
    assert.equal(integ.state, 'modified'); assert.equal(integ.modified[0].kind, 'rewritten');

    // Run Health
    const { buildRunHealth } = require('../../observability/runHealth');
    const h = buildRunHealth({ dataRoot: ws.dataRoot, runFolder: ws.folderName, now: tick() });
    assert.equal(h.evidence.state, 'modified');
    assert.equal(h.health.byBranch.automation.application.state, 'evidence-modified');
    assert.ok(h.notes.some((n) => /RESULTS_MODIFIED/.test(n)));
    assert.ok(h.figures.some(([k, val]) => k === 'evidence.results' && val === 'modified'));
    const { healthIsClean } = require('../../observability/dashboard');
    assert.equal(healthIsClean({ ...h, verdict: { overall: 'all-passed' } }), false);
    // Telemetry is never emitted from rewritten results
    const { emitExecutionTelemetry } = require('../../observability/emitExecution');
    assert.equal(emitExecutionTelemetry({ dataRoot: ws.dataRoot, runFolder: ws.folderName, stageId: '5A', now: tick() }).refused, 'RESULTS_MODIFIED');

    // Final QA Report verification
    const md = path.join(ws.dataRoot, `runs/${ws.folderName}/reporting/Final_QA_Report.md`);
    writeVerifiedReport(ws.runsDir, ws.folderName, md, { counts: { Passed: 1, Failed: 1 } });
    const chk = checkReportConsistency({ md, json: md.replace(/.md$/, '.report.json'), html: md.replace(/.md$/, '.html'), evidence: checkResultsIntegrity(ws.runsDir, ws.folderName) });
    assert.equal(chk.ok, false);
    assert.ok(chk.issues.some((i) => /RESULTS_MODIFIED/.test(i)));
    const rc = cli(ws, 'state', 'report-check', '--run', ws.folderName, '--md', md, '--model', md.replace(/.md$/, '.report.json'), '--html', md.replace(/.md$/, '.html'));
    assert.equal(rc.code, 2); assert.match(rc.text, /RESULTS_MODIFIED/);
    // restoring the exact recorded content restores trust; the forged content never does
    put(ws, rel, original);
    assert.equal(rs.verifyStageApproval(ws.runsDir, ws.folderName, '5A').verified, true);
    void forged;
  } finally { cleanup(ws); }
});

test('F-03: a removed results file is reported as removed; restoring the exact recorded content restores integrity; nothing is ever rewritten by the check', () => {
  const ws = workspace();
  try {
    automationReady(ws);
    const rel = results5A(ws);
    rs.recordOutcomeFromResults(ws.runsDir, ws.folderName, { stageId: '5A', now: tick() });
    const abs = path.join(ws.dataRoot, rel);
    const original = fs.readFileSync(abs, 'utf8');
    fs.rmSync(abs);
    const integ = checkResultsIntegrity(ws.runsDir, ws.folderName);
    assert.equal(integ.modified[0].kind, 'removed');
    assert.equal(fs.existsSync(abs), false, 'the check never recreates evidence');
    fs.writeFileSync(abs, original);
    assert.equal(checkResultsIntegrity(ws.runsDir, ws.folderName).state, 'intact');
    rs.completeStage(ws.runsDir, ws.folderName, { stageId: '5A', now: tick() });
  } finally { cleanup(ws); }
});

test('F-03: a results cycle written after the outcome makes it stale — completion refused OUTCOME_STALE until re-recorded', () => {
  const ws = workspace();
  try {
    automationReady(ws);
    results5A(ws);
    rs.recordOutcomeFromResults(ws.runsDir, ws.folderName, { stageId: '5A', now: tick() });
    results5A(ws, [['TC-LOGIN-002', 'Passed']], 'execution/ExecutionResults.rerun-1.md');
    expectCode(() => rs.completeStage(ws.runsDir, ws.folderName, { stageId: '5A', now: tick() }), 'OUTCOME_STALE');
    rs.recordOutcomeFromResults(ws.runsDir, ws.folderName, { stageId: '5A', now: tick() });
    rs.completeStage(ws.runsDir, ws.folderName, { stageId: '5A', now: tick() });
  } finally { cleanup(ws); }
});

// =============================================================================================
// F-07 — artifact path isolation
// =============================================================================================

test('F-07 (Phase 9 S-1b): relative traversal, embedded .., absolute outside paths and junction escapes are refused everywhere; nothing is recorded or copied', () => {
  const ws = workspace();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'p91-outside-'));
  try {
    fs.writeFileSync(path.join(outside, 'evil.md'), art('Approved', 'OUTSIDE-CONTENT'));
    // a junction inside the data root that points outside it
    const link = path.join(ws.dataRoot, 'modules', 'login', 'context', 'linked');
    fs.mkdirSync(path.dirname(link), { recursive: true });
    fs.symlinkSync(outside, link, 'junction');
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Direct (degraded)', now: tick() });
    const rel = path.relative(ws.dataRoot, path.join(outside, 'evil.md')).split(path.sep).join('/');
    for (const p of [rel, `modules/login/${rel}`, path.join(outside, 'evil.md'), 'modules/login/context/linked/evil.md']) {
      expectCode(() => rs.recordStageArtifacts(ws.runsDir, ws.folderName, { stageId: '1', artifacts: [p], now: tick() }), 'OUTSIDE_DATA_ROOT');
      expectCode(() => rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '1', artifacts: [p], now: tick() }), 'OUTSIDE_DATA_ROOT');
      expectCode(() => rs.approveScope(ws.runsDir, ws.folderName, { artifact: p, approvedBy: 'Reviewer A', now: tick() }), 'OUTSIDE_DATA_ROOT');
    }
    const r = cli(ws, 'state', 'artifact', '1', '--artifacts', path.join(outside, 'evil.md'), '--run', ws.folderName);
    assert.equal(r.code, 1); assert.match(r.text, /OUTSIDE_DATA_ROOT/);
    const meta = fs.readFileSync(rs.runJsonPath(ws.runsDir, ws.folderName), 'utf8');
    assert.doesNotMatch(meta, /evil\.md/);
    const copied = [];
    const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isSymbolicLink()) continue; if (e.isDirectory()) walk(p); else if (fs.readFileSync(p, 'utf8').includes('OUTSIDE-CONTENT')) copied.push(p); } };
    walk(ws.runsDir);
    assert.deepEqual(copied, [], 'external content is never copied into run metadata');
  } finally { cleanup(ws); fs.rmSync(outside, { recursive: true, force: true }); }
});

test('F-07: an outside checkpoint recorded before the boundary existed is refused at approval, never snapshotted, and never consumed downstream', () => {
  const ws = workspace();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'p91-outside-'));
  try {
    const evil = path.join(outside, 'evil.md');
    fs.writeFileSync(evil, art('Approved', 'OUTSIDE-CONTENT'));
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Direct (degraded)', now: tick() });
    put(ws, PC, art('Pending Review'));
    rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '1', artifacts: [PC], now: tick() });
    // simulate a pre-9.1 run.json that already recorded an outside checkpoint
    const f = rs.runJsonPath(ws.runsDir, ws.folderName);
    const meta = JSON.parse(fs.readFileSync(f, 'utf8'));
    meta.stages['1'].artifacts.push({ path: evil.split(path.sep).join('/'), kind: 'checkpoint', recordedAt: T0.toISOString() });
    fs.writeFileSync(f, JSON.stringify(meta, null, 2));
    put(ws, PC, art('Approved'));
    expectCode(() => rs.approveStage(ws.runsDir, ws.folderName, { stageId: '1', approvedBy: 'BA', now: tick() }), 'OUTSIDE_DATA_ROOT');
    assert.equal(fs.existsSync(path.join(ws.runsDir, ws.folderName, 'metadata', 'approved')) && fs.readdirSync(path.join(ws.runsDir, ws.folderName, 'metadata', 'approved')).length, false);
    // an approval record (fixture) naming the outside file is never consumed by a gate
    recordFixtureApproval(ws.dataRoot, [PC]);
    const fx = path.join(ws.runsDir, 'fixture-approvals', 'metadata', 'run.json');
    const fm = JSON.parse(fs.readFileSync(fx, 'utf8'));
    Object.values(fm.stages)[0].approval.headerEvidence.push({ path: evil, status: 'Approved', sha256: 'x' });
    fs.writeFileSync(fx, JSON.stringify(fm));
    const refs = (rs.readRunState(ws.runsDir, ws.folderName).moduleArtifactRefs || []).map((x) => x.artifact);
    assert.ok(!refs.some((x) => /evil/.test(x)));
  } finally { cleanup(ws); fs.rmSync(outside, { recursive: true, force: true }); }
});
