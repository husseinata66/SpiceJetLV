// Phase 8 — Run Health: unified statuses, health dimensions, workflow / Self-Healing / contract
// observability, Markdown / JSON / HTML consistency, and legacy compatibility. Real runs, driven through
// the real CLIs (run_manager/__tests__/healFixture.js), in disposable data roots.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const hf = require('../../run_manager/__tests__/healFixture');
const { buildRunHealth } = require('../runHealth');
const { writeRunHealth, checkRunHealth, markdown } = require('../runHealthReport');
const { mapStatus, statusTable } = require('../statusMap');
const { recordEvent } = require('../recorder');
const { validateEvent } = require('../schema');
const R = require('../../api_contract/registry');
const { checkReportConsistency, contractPosition } = require('../../run_manager/reportIntegrity');

const NOW = new Date('2026-10-09T12:00:00Z');
const fig = (s) => Object.fromEntries(s.figures);
const health = (ws, run) => buildRunHealth({ dataRoot: ws.root, runFolder: run, now: NOW });
const LOGIN_YAML = 'openapi: 3.0.3\ninfo: {title: login, version: "1"}\npaths:\n  /login:\n    post:\n      responses:\n        "200":\n          description: ok\n          content:\n            application/json:\n              schema: {type: object, required: [token], properties: {token: {type: string}}}\n';

/** A run whose 5A results are written by hand (statuses the fixture does not produce). */
function manualResultsRun(ws, rows, records = '') {
  const run = ws.rm('new', '--scope', 'Module', '--target', 'Login', '--modules', 'login', '--no-activate').text.match(/Created (\S+)/)[1];
  assert.equal(ws.rm('state', 'start', '5A', '--invocation', 'Pipeline', '--run', run).code, 0);
  const ER = ws.put(`runs/${run}/execution/ExecutionResults.md`, `| Test Case ID | Automation Script ID | Status | Execution Time | Attempts | Failure Detail | Evidence Refs |\n|---|---|---|---|---|---|---|\n${rows.map(([id, st]) => `| ${id} | s | ${st} | 1 s | 1 | — | — |`).join('\n')}\n${records}`);
  ws.rm('state', 'artifact', '5A', '--artifacts', ER, '--run', run);
  ws.rm('state', 'outcome', '5A', '--from-results', '--run', run);
  return run;
}

// ---------------------------------------------------------------------------------------------
// Unified status mapping
// ---------------------------------------------------------------------------------------------

test('status mapping: canonical statuses map to themselves; a legacy telemetry Failed stays an unclassified failure; unknown is never Passed', () => {
  assert.deepEqual(mapStatus('Automation Repaired'), { status: 'Automation Repaired', category: 'pass-repaired', raw: 'Automation Repaired', recognized: true, unclassified: false, reason: null });
  assert.equal(mapStatus('Failed', { source: 'telemetry' }).unclassified, true);
  assert.equal(mapStatus('Failed', { source: 'telemetry' }).status, 'Failed');
  for (const odd of ['Kinda OK', 'GREEN', 'Passed-ish?', '', 'Success']) {
    const m = mapStatus(odd);
    assert.notEqual(m.status, 'Passed', odd);
    assert.equal(m.category === 'pass', false, odd);
  }
  assert.equal(mapStatus('PASS').status, 'Passed', 'an exact synonym is the same status');
  const table = statusTable();
  for (const s of ['Passed', 'Failed', 'Application Failure', 'Automation Failure', 'Automation Repaired', 'Environment Failure', 'Infrastructure Failure', 'Configuration Failure', 'Blocked', 'Skipped', 'Excluded', 'Inconclusive', 'Quarantined', 'Unverified', 'Flaky', 'Not Executed']) {
    assert.ok(table.some((r) => r.status === s), s);
  }
  assert.ok(table.filter((r) => r.countsAsPass).every((r) => r.status === 'Passed'), 'only Passed counts as a pass');
  // Telemetry speaks the canonical vocabulary now; the original five stay valid; Unrecognized is refused.
  const ev = (status) => validateEvent({ eventId: 'evt-000001-00000000', schemaVersion: 1, seq: 1, timestamp: '2026-10-09T12:00:00.000Z', runId: 'r', type: 'TEST_EXECUTION_RESULT', source: 'skill', status, testCaseId: 'TC-1' });
  assert.equal(ev('Automation Repaired').valid, true);
  assert.equal(ev('Inconclusive').valid, true, 'an original-vocabulary status stays valid');
  assert.equal(ev('Unrecognized').valid, false);
  assert.equal(ev('Kinda OK').valid, false);
});

// ---------------------------------------------------------------------------------------------
// Health dimensions
// ---------------------------------------------------------------------------------------------

test('mixed application and automation failures: each dimension on its own, with its denominator; nothing green', (t) => {
  const ws = hf.workspace(); t.after(() => hf.cleanup(ws));
  const run = hf.failedAutomationRun(ws);
  const s = health(ws, run);
  const b = s.health.byBranch.automation;
  assert.equal(b.stage, '5A');
  assert.deepEqual([b.application.state, b.application.classified, b.application.unclassified, b.application.executed], ['failures', 1, 0, 4]);
  assert.deepEqual([b.automation.state, b.automation.failures], ['failures', 1]);
  assert.equal(b.environment.state, 'clean');
  assert.equal(b.coverage.state, 'incomplete', 'an Inconclusive result keeps coverage incomplete');
  assert.equal(b.coverage.unverified, 1);
  assert.equal(s.verdict.overall, 'failures');
  assert.equal(s.health.contract.state, 'not-registered');
  assert.equal(s.health.workflow.state, 'in-progress');
  assert.equal(s.workflow.next.action, 'start', 'the next action is the Workflow Planner\'s');
  assert.ok(!('overall' in s.health), 'there is no overall health figure');
  assert.ok(s.sources.every((x) => x.status !== 'error'));
});

test('missing assertions and unknown statuses: a Passed without assertion evidence is Unverified; an unknown status is Unrecognized — neither is a pass', (t) => {
  const ws = hf.workspace(); t.after(() => hf.cleanup(ws));
  hf.failedAutomationRun(ws);
  const run = manualResultsRun(ws, [['TC-LOGIN-001', 'Passed'], ['TC-LOGIN-002', 'Kinda OK'], ['TC-LOGIN-003', 'Passed'], ['TC-LOGIN-004', 'Excluded — not supported']],
    '\n### 3.1 Assertion Records\n\n| Test Case ID | Assertion ID | Assertion | Expected | Expected Source | Actual | Check | Result | Evidence |\n|---|---|---|---|---|---|---|---|---|\n| TC-LOGIN-003 | A1 | check | `Locked` | — | `Locked` | equals | ✅ | — |\n');
  const s = health(ws, run);
  const c = s.stages['5A'].counts;
  assert.equal(c.Passed, 1, 'only the evidenced pass is Passed');
  assert.equal(c.Unverified, 1, 'TC-LOGIN-001 recorded Passed with no assertion record');
  assert.equal(c.Unrecognized, 1);
  assert.equal(c.Excluded, 1);
  const cov = s.health.byBranch.automation.coverage;
  assert.equal(cov.state, 'incomplete');
  assert.equal(cov.excluded, 1);
  assert.equal(cov.executable, 3, 'Excluded is outside the denominator');
  assert.notEqual(s.verdict.overall, 'all-passed');
  assert.match(markdown(s), /Unrecognized statuses \(kept as written, never counted as passed\): TC-LOGIN-002 "Kinda OK"/);
});

// ---------------------------------------------------------------------------------------------
// Self-Healing
// ---------------------------------------------------------------------------------------------

test('Automation Repaired after a successful 5H rerun: kept apart from Passed, with the whole repair trail', (t) => {
  const ws = hf.workspace(); t.after(() => hf.cleanup(ws));
  const run = hf.failedAutomationRun(ws);
  hf.startHealing(ws, run);
  hf.confirmAutomation(ws, run);
  assert.equal(hf.propose(ws, run, hf.LOCATOR_FIX, 'fix').code, 0);
  assert.equal(hf.H(ws, run, 'batch-approve', '--by', 'QA Lead').code, 0);
  hf.applyOnDisk(ws, hf.LOCATOR_FIX);
  assert.equal(hf.H(ws, run, 'apply', '--test', 'TC-LOGIN-001', '--attempt', '1', '--by', 'QA Lead').code, 0);
  const rr = hf.rerun(ws, run, 1, [['TC-LOGIN-001', 'Passed'], ['TC-LOGIN-004', 'Passed']]);
  const v = hf.H(ws, run, 'validate', '--test', 'TC-LOGIN-001', '--attempt', '1', '--rerun', rr, '--regression', `TC-LOGIN-004@${rr}`, '--by', 'QA Lead');
  assert.equal(v.code, 0, v.text);
  assert.equal(ws.rm('state', 'outcome', '5H', '--from-results', '--run', run).code, 0);
  const s = health(ws, run);
  const b = s.health.byBranch.automation;
  assert.equal(b.stage, '5H');
  assert.equal(s.stages['5H'].counts['Automation Repaired'], 1);
  assert.equal(s.stages['5H'].counts.Passed, 1, 'TC-LOGIN-004 only — the repaired test is not counted as Passed');
  assert.deepEqual([b.automation.state, b.automation.repaired, b.automation.failures], ['repaired', 1, 0]);
  const t1 = s.selfHealing.operations[0].tests.find((x) => x.testCaseId === 'TC-LOGIN-001');
  assert.equal(t1.classification.class, 'automation');
  assert.equal(t1.attempts[0].result, 'fixed');
  assert.deepEqual([t1.attempts[0].before, t1.attempts[0].after], ['Automation Failure', 'Passed']);
  assert.ok(t1.attempts[0].confidence && t1.attempts[0].confidence.band);
  assert.equal(t1.attempts[0].applied, true);
  assert.deepEqual(t1.attempts[0].regression, ['TC-LOGIN-004 Passed']);
  assert.equal(t1.executionStatus, 'Automation Repaired');
  assert.equal(fig(s)['repair.automationRepaired'], '1');
  // The first attempt still shows the original failure.
  assert.equal(s.stages['5H'].firstAttemptCounts['Automation Failure'], 1);
});

test('quarantined tests: three unsuccessful attempts — quarantine shown, counted against Automation Health, never as a pass', (t) => {
  const ws = hf.workspace(); t.after(() => hf.cleanup(ws));
  const run = hf.failedAutomationRun(ws);
  hf.startHealing(ws, run);
  hf.confirmAutomation(ws, run);
  for (let n = 1; n <= 3; n += 1) hf.failedAttempt(ws, run, n, n);
  assert.equal(ws.rm('state', 'outcome', '5H', '--from-results', '--run', run).code, 0);
  const s = health(ws, run);
  assert.deepEqual(s.selfHealing.quarantine.map((q) => q.testCaseId), ['TC-LOGIN-001']);
  const t1 = s.selfHealing.operations[0].tests.find((x) => x.testCaseId === 'TC-LOGIN-001');
  assert.equal(t1.cumulative.quarantined, true);
  assert.equal(t1.attempts.length, 3);
  assert.ok(['Quarantined', 'Automation Failure'].includes(t1.executionStatus));
  assert.equal(s.health.byBranch.automation.automation.state, 'failures');
  assert.equal(fig(s)['repair.quarantined'], '1');
});

// ---------------------------------------------------------------------------------------------
// Workflow
// ---------------------------------------------------------------------------------------------

test('stale evidence: an approved artifact edited after the run used it — shown as revalidation, from the Workflow Planner', (t) => {
  const ws = hf.workspace(); t.after(() => hf.cleanup(ws));
  const run = hf.failedAutomationRun(ws);
  const rel = 'modules/login/test_design/TestCases_login.md';
  ws.put(rel, ws.read(rel).replace('**Objective:** o.', '**Objective:** o (edited after approval).'));
  const s = health(ws, run);
  assert.ok(s.workflow.revalidation.length > 0);
  assert.ok(['needs-revalidation', 'blocked'].includes(s.health.workflow.state), s.health.workflow.state);
  assert.match(markdown(s), /stale evidence — Stage /);
});

test('partial approval: a stage started on a proven partial scope is shown with its items', (t) => {
  // eslint-disable-next-line global-require
  const rs = require('../../run_manager/runState');
  require('../../run_manager/__tests__/approvalFixture').autoPreflight(rs); // the operator's Safety Preflight (Phase 9.2, F-16)
  // eslint-disable-next-line global-require
  const { createRun } = require('../../run_manager/createRun');
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rh-partial-'));
  t.after(() => fs.rmSync(dataRoot, { recursive: true, force: true }));
  const runsDir = path.join(dataRoot, 'runs');
  fs.mkdirSync(runsDir, { recursive: true });
  const T0 = new Date('2026-10-08T09:00:00Z');
  const at = (m) => new Date(T0.getTime() + m * 60000);
  const { folderName } = createRun(runsDir, { scope: 'Module', target: 'login', now: T0, extraRunJson: { modules: ['login'], moduleScope: 'single' } });
  const put = (rel, text) => { const f = path.join(dataRoot, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); return rel; };
  const pc = put('modules/login/context/ProjectContext.md', '# PC\n\n| Field | Value |\n|---|---|\n| Status | **Approved** — §1, §2. **`PO-30`: Pending Review** |\n\n## 1. Scope\n\nText.\n\n## Approval Scope\n\n| Item | Status | Depends On | Affects |\n|---|---|---|---|\n| §1 | Approved | — | — |\n| §2 | Approved | — | — |\n| AC-1 | Approved | §1 | — |\n| PO-30 | Pending | §2 | §2 |\n');
  const tcase = (id, review, req) => `### ${id} — t\n\n**Objective:** o.\n\n**Preconditions:** p.\n\n**Test Data:** None.\n\n**Steps:**\n\n1. s.\n\n**Expected Result:** It works.\n\n**Assertions:**\n\n| Assertion ID | Expected | Expected Source | Check | Requirement |\n|---|---|---|---|---|\n| A1 | It works | Expected Result | equals | AC-1 |\n\n**Priority:** P1\n\n**Tags:** Scenario\n\n**Review:** ${review}\n\n**Automation:** Approved\n`;
  const tc = put('modules/login/test_design/TestCases_Login.md', `# Suite\n\n| Field | Value |\n|---|---|\n| Status | **Approved** — Stage 3 gate. TC-003 reset to \`Pending\` |\n\n## Test Cases\n\n${tcase('TC-001', 'Approved')}\n${tcase('TC-002', 'Approved')}\n${tcase('TC-003', 'Pending')}`);
  put('modules/login/test_design/TraceabilityMatrix.md', '# T\n\n| Field | Value |\n|---|---|\n| Status | Approved |\n\n| Test Case ID | Requirement Reference | Discovery Reference | Finding Reference | Evidence Reference | Acceptance Criteria Reference | Run Scope Reference | Risk Level | Risk Statement | Validation Status |\n|---|---|---|---|---|---|---|---|---|---|\n| TC-001 | PC §1 / AC-1 | N/A | N/A | N/A | N/A | US | Low | x | ok |\n| TC-002 | PC §2 | N/A | N/A | N/A | N/A | US | Low | x | ok |\n| TC-003 | PC §2 / PO-30 | N/A | N/A | N/A | N/A | US | Low | x | ok |\n');
  rs.approveScope(runsDir, folderName, { artifact: pc, approvedBy: 'Jane Reviewer', now: at(1) });
  rs.approveScope(runsDir, folderName, { artifact: tc, approvedBy: 'Jane Reviewer', now: at(2) });
  rs.startStage(runsDir, folderName, { stageId: '4M', invocationPath: 'Direct', scopeItems: ['TC-001'], by: 'QA Lead', now: at(4) });
  const s = buildRunHealth({ dataRoot, runFolder: folderName, now: NOW });
  assert.ok(s.workflow.partialScope.includes('4M'));
  assert.deepEqual(s.workflow.stages.find((x) => x.stageId === '4M').partialScope, ['TC-001']);
  assert.match(markdown(s), /\| 4M .* \| TC-001 \|/);
  assert.equal(s.health.byBranch.none.coverage.state, 'unavailable', 'nothing executed yet: unavailable, never clean');
});

// ---------------------------------------------------------------------------------------------
// API contract health
// ---------------------------------------------------------------------------------------------

test('contract health is read from the API Contract Tool: drift blockers, missing required contract, mock-only evidence — none reinterpreted', (t) => {
  const ws = hf.workspace(); t.after(() => hf.cleanup(ws));
  const run = hf.failedAutomationRun(ws);
  const src = path.join(ws.root, '..', `${path.basename(ws.root)}-login.yaml`);
  fs.writeFileSync(src, LOGIN_YAML); t.after(() => fs.rmSync(src, { force: true }));
  // Missing required contract.
  R.setPolicy(ws.root, 'modules/login', { mode: 'required', by: 'QA Lead', reason: 'login API is contract-first', now: NOW });
  let s = health(ws, run);
  assert.equal(s.health.contract.state, 'blocked');
  assert.ok(s.contracts[0].blockers.some((b) => b.kind === 'contract-missing'));
  assert.deepEqual(s.health.contract.requiredScopes, ['modules/login']);
  // Approved, with mock-only evidence.
  R.importApproved(ws.root, 'modules/login', { name: 'login-api', source: src, approvedBy: 'API Owner', reason: 'v1', now: NOW });
  const mock = `${src}.mock.json`; fs.writeFileSync(mock, JSON.stringify({ kind: 'api-evidence', exchanges: [{ method: 'POST', url: 'https://x/login', status: 200, responseBody: { token: 'abc' } }] })); t.after(() => fs.rmSync(mock, { force: true }));
  R.registerVersion(ws.root, 'modules/login', { name: 'login-api', role: 'observed', environment: 'mock', source: mock, by: 'QA', now: NOW });
  s = health(ws, run);
  assert.equal(s.health.contract.state, 'clean');
  assert.deepEqual(s.contracts[0].contracts[0].evidence.mockOnly, ['POST /login'], 'mock conformance is never real validation');
  assert.equal(s.contracts[0].contracts[0].evidence.realConforms, 0);
  // Breaking drift: the contract tool's own classification and counts.
  const v2 = `${src}.v2.yaml`; fs.writeFileSync(v2, LOGIN_YAML.replace('token: {type: string}', 'token: {type: integer}')); t.after(() => fs.rmSync(v2, { force: true }));
  R.registerVersion(ws.root, 'modules/login', { name: 'login-api', role: 'proposed', source: v2, by: 'Dev', now: NOW });
  s = health(ws, run);
  const st = R.scopeStatus(ws.root, 'modules/login');
  assert.equal(s.health.contract.state, 'blocked');
  assert.deepEqual(s.contracts[0].drift, st.drift, 'exactly what `status --json` reports');
  assert.equal(s.contracts[0].drift.find((d) => d.role === 'proposed').counts.Breaking, 1);
  assert.ok(s.contracts[0].decisionsPending.some((d) => d.kind === 'contract-acceptance'));
  assert.equal(fig(s)['contract.blockers'], String(st.blockers.length));
  assert.match(markdown(s), /BLOCKER: CV-3 \(proposed login-api\) carries 1 Breaking\/Unknown difference/);
});

// ---------------------------------------------------------------------------------------------
// Telemetry and legacy compatibility
// ---------------------------------------------------------------------------------------------

test('telemetry is reconciled with execution history — history governs; a legacy Failed is an unclassified failure', (t) => {
  const ws = hf.workspace(); t.after(() => hf.cleanup(ws));
  const run = hf.failedAutomationRun(ws);
  const rec = (seq, tc, status) => assert.ok(recordEvent({ runFolder: run, dataRoot: ws.root, now: new Date(NOW.getTime() + seq * 1000), event: { type: 'TEST_EXECUTION_RESULT', source: 'skill', status, testCaseId: tc, attempt: 1 } }).ok);
  rec(1, 'TC-LOGIN-002', 'Failed');
  rec(2, 'TC-LOGIN-004', 'Passed');
  rec(3, 'TC-LOGIN-001', 'Passed'); // history says Automation Failure
  const s = health(ws, run);
  // Two sources (Phase 8.1): the platform's own events (emitted by `state outcome --from-results`, 4 tests)
  // and the Skill's 3 — each compared with history on its own; neither hides the other.
  assert.deepEqual(s.telemetry.sources, ['platform-tool', 'skill']);
  assert.equal(s.telemetry.resultsCompared, 7);
  assert.equal(s.telemetry.agree, 6, 'all 4 platform events, and the Skill\'s Failed (unclassified) and Passed');
  assert.deepEqual(s.telemetry.disagree, [{ testCaseId: 'TC-LOGIN-001', source: 'skill', telemetry: 'Passed', history: 'Automation Failure' }]);
  assert.equal(s.telemetry.final.agreeUnclassified, 1, 'a legacy Failed agrees only as an unclassified failure');
  assert.equal(s.telemetry.legacyUnclassifiedFailures, 1);
  assert.equal(s.stages['5A'].counts['Automation Failure'], 1, 'telemetry never overrides history');
  assert.ok(s.notes.some((n) => /execution history governs/.test(n)));
});

test('legacy run: read without rewriting, verification never claimed retroactively, and never written into', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rh-legacy-'));
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'rh-legacy-out-'));
  t.after(() => { fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(out, { recursive: true, force: true }); });
  const run = 'run-001__2026-07-01_10-00-00__Module__Legacy';
  const put = (rel, text) => { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); return f; };
  put(`runs/${run}/metadata/run.json`, JSON.stringify({ runId: 'RUN-1', status: 'Completed' }));
  const results = put(`runs/${run}/execution/ExecutionResults.md`, '| Test Case ID | Automation Script ID | Status | Execution Time | Attempts | Failure Detail | Evidence Refs |\n|---|---|---|---|---|---|---|\n| TC-1 | s | PASS | 1 s | 1 | — | — |\n| TC-2 | s | FAIL | 1 s | 1 | timeout | — |\n| TC-3 | s | Weird | 1 s | 1 | — | — |\n');
  const before = fs.readFileSync(results, 'utf8');
  const s = buildRunHealth({ dataRoot: root, runFolder: run, now: NOW });
  assert.equal(s.legacy, true);
  assert.equal(s.health.workflow.state, 'unknown');
  assert.equal(s.verdict.overall, 'not-recorded');
  const c = s.stages['5A'].counts;
  assert.equal(c.Passed || 0, 0, 'a legacy PASS without assertion evidence is not a verified pass');
  assert.equal(c.Unverified, 1);
  assert.equal(c.Failed, 1, 'a legacy FAIL is kept as an unclassified Failed');
  assert.equal(c.Unrecognized, 1);
  assert.equal(s.health.byBranch.automation.application.unclassified, 1);
  assert.ok(s.notes.some((n) => /Legacy run/.test(n)));
  assert.throws(() => writeRunHealth({ dataRoot: root, runFolder: run, snapshot: s }), /RUN_IMMUTABLE|historical run/);
  const files = writeRunHealth({ dataRoot: root, runFolder: run, snapshot: s, outDir: out });
  assert.ok(fs.existsSync(files.html));
  assert.equal(fs.readFileSync(results, 'utf8'), before, 'the legacy results are untouched');
  assert.deepEqual(fs.readdirSync(path.join(root, 'runs', run, 'metadata')), ['run.json'], 'nothing was written into the legacy run');
});

// ---------------------------------------------------------------------------------------------
// Reporting consistency
// ---------------------------------------------------------------------------------------------

test('Markdown / JSON / HTML: written once per revision, carry the same figures, never green; a tampered or stale report is caught', (t) => {
  const ws = hf.workspace(); t.after(() => hf.cleanup(ws));
  const run = hf.failedAutomationRun(ws);
  const files = writeRunHealth({ dataRoot: ws.root, runFolder: run, snapshot: health(ws, run) });
  let r = checkRunHealth({ dataRoot: ws.root, runFolder: run });
  assert.deepEqual([r.ok, r.problems, r.stale], [true, [], []]);
  const m = JSON.parse(fs.readFileSync(files.model, 'utf8'));
  assert.notEqual(m.statusPillTone, 'pass');
  assert.equal(m.summary, null, 'no pass/fail donut: the figures are the authoritative ones, not a new tally');
  // A second write is a new revision; the first is never overwritten.
  const first = fs.readFileSync(files.md, 'utf8');
  const second = writeRunHealth({ dataRoot: ws.root, runFolder: run, snapshot: health(ws, run) });
  assert.equal(second.revision, 'RunHealth.rev-2');
  assert.equal(fs.readFileSync(files.md, 'utf8'), first);
  // Tampering with one rendering is a mismatch.
  fs.writeFileSync(second.md, fs.readFileSync(second.md, 'utf8').replace('| automation.status.Application Failure | 1 |', '| automation.status.Application Failure | 0 |'));
  r = checkRunHealth({ dataRoot: ws.root, runFolder: run });
  assert.equal(r.consistent, false);
  assert.ok(r.problems.some((p) => /Application Failure/.test(p)));
  // A green pill is refused.
  const m2 = JSON.parse(fs.readFileSync(files.model, 'utf8')); m2.statusPillTone = 'pass';
  fs.writeFileSync(files.model, JSON.stringify(m2));
  assert.ok(checkRunHealth({ dataRoot: ws.root, runFolder: run, revision: 'RunHealth' }).problems.some((p) => /never green/.test(p)));
  // A change in an authoritative source after writing makes the report stale.
  fs.writeFileSync(files.model, JSON.stringify(m));
  R.setPolicy(ws.root, 'modules/login', { mode: 'required', by: 'QA Lead', reason: 'r', now: NOW });
  r = checkRunHealth({ dataRoot: ws.root, runFolder: run, revision: 'RunHealth' });
  assert.equal(r.consistent, true);
  assert.equal(r.current, false);
  assert.ok(r.stale.some((x) => /contract\.blockers: report "0", now "1"/.test(x)));
});

test('Final QA Report check: the contract position it states must match the contract tool; no green while a contract blocker is open', (t) => {
  const ws = hf.workspace(); t.after(() => hf.cleanup(ws));
  const run = hf.failedAutomationRun(ws);
  R.setPolicy(ws.root, 'modules/login', { mode: 'required', by: 'QA Lead', reason: 'r', now: NOW });
  const contract = contractPosition(path.join(ws.root, 'runs'), run);
  assert.equal(contract.blockers, 1);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rh-qa-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const model = (items, tone = 'neutral') => ({ title: 'Final QA Report', statusPill: 'DONE', statusPillTone: tone, outcomeVerdict: 'all-passed', statuses: [{ key: 'PASSED', label: 'Passed', tone: 'pass' }], summary: { counts: [{ status: 'PASSED', value: 1 }] }, sections: [{ type: 'findings', title: 'API contract position', items }] });
  const check = (m) => { const f = path.join(dir, `m${Math.random()}.json`); fs.writeFileSync(f, JSON.stringify(m)); return checkReportConsistency({ json: f, outcome: { counts: { Passed: 1 }, verdict: 'all-passed' }, contract }); };
  assert.ok(check(model([])).issues.some((i) => /states 0 API contract blocker\(s\), but the contract tool reports 1/.test(i)));
  assert.ok(check(model([{ kind: 'Contract blocker', tone: 'blocked', body: { text: 'x' } }], 'pass')).issues.some((i) => /green indicator while 1 API contract blocker/.test(i)));
  assert.deepEqual(check(model([{ kind: 'Contract blocker', tone: 'blocked', body: { text: 'x' } }])).issues, []);
});
