// Phase 9.2 — adversarial regression tests: F-08 … F-17, F-20, F-21. Disposable data roots only.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const rs = require('../runState');
const gate = require('../stageGate');
const planner = require('../workflowPlanner');
const { createRun } = require('../createRun');
const { approverProblem } = require('../approverIdentity');
const { recordFixtureApproval, writeResults, FIXTURE_POLICY, ensureFixturePolicy } = require('./approvalFixture');
const moduleRegistry = require('../../module_manager/moduleRegistry');
const featureRegistry = require('../../module_manager/featureRegistry');
const supplierRegistry = require('../../module_manager/supplierRegistry');
const automationState = require('../../module_manager/automationState');

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const RM = path.join(__dirname, '..', 'cli.js');
const CG = path.join(__dirname, '..', '..', 'capability_gate', 'cli.js');
const T0 = new Date('2026-10-10T09:00:00Z');
let minute = 0;
const tick = () => new Date(T0.getTime() + (minute += 1) * 60000);
const expectCode = (fn, code) => assert.throws(fn, (err) => err.code === code, `expected ${code}`);

function workspace(extraRunJson = { modules: ['login'], moduleScope: 'single' }) {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'p92-'));
  const runsDir = path.join(dataRoot, 'runs');
  fs.mkdirSync(runsDir, { recursive: true });
  const folderName = extraRunJson === null ? null : createRun(runsDir, { scope: 'Module', target: 'Login', now: T0, extraRunJson }).folderName;
  return { dataRoot, runsDir, folderName };
}
const cleanup = (ws) => fs.rmSync(ws.dataRoot, { recursive: true, force: true });
const put = (ws, rel, text) => { const f = path.join(ws.dataRoot, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); return rel; };
const art = (status, body = 'Body.') => `# Artifact\n\n| Field | Value |\n|---|---|\n| Status | ${status} |\n\n${body}\n`;
const cli = (script, args, ws) => { const r = spawnSync(process.execPath, [script, ...args, ...(ws ? ['--runs-dir', ws.runsDir] : [])], { encoding: 'utf8' }); return { code: r.status, text: `${r.stdout}\n${r.stderr}`, out: r.stdout }; };
const CASE = (id) => `### ${id} — Case ${id}\n\n**Objective:** Check ${id}.\n\n**Preconditions:** A user exists.\n\n**Test Data:** None.\n\n**Steps:**\n\n1. Do it.\n\n**Expected Result:** It works.\n\n**Assertions:**\n\n| Assertion ID | Expected | Expected Source | Check | Requirement |\n|---|---|---|---|---|\n| A1 | It works | Expected Result | equals | AC-1 |\n\n**Priority:** P1\n\n**Tags:** Regression\n\n**Review:** Approved\n\n**Automation:** Approved\n`;
const SUITE = `## Test Cases\n\n${['TC-LOGIN-001', 'TC-LOGIN-002', 'TC-LOGIN-003'].map(CASE).join('\n')}`;
const PC = 'modules/login/context/ProjectContext.md';
const TC = 'modules/login/test_design/TestCases_Login.md';
const PREFLIGHT = (o = {}) => ({ stageId: '5A', environment: 'Staging', targetUrl: 'https://qa.example.test', executionType: 'browser', executionMode: 'Headless', operations: [{ action: 'READ', ownership: 'DedicatedTestData' }], confirmedBy: 'QA Lead', now: tick(), ...o });

/** Upstream approved through the model, automation approved, a policy, and (optionally) a confirmed 5A preflight + start. */
function automationRun(ws, { start = true } = {}) {
  put(ws, PC, art('Approved', '| Target Environment | https://qa.example.test |')); put(ws, TC, art('Approved', SUITE));
  recordFixtureApproval(ws.dataRoot, [PC]); recordFixtureApproval(ws.dataRoot, [TC]);
  recordFixtureApproval(ws.dataRoot, [put(ws, 'modules/login/automation/AutomationPlan_Playwright.md', art('Approved'))]);
  const modulesDir = path.join(ws.dataRoot, 'modules');
  automationState.setAutomationState(modulesDir, 'login', 'Generated', { now: tick() });
  automationState.setAutomationState(modulesDir, 'login', 'Approved', { now: tick(), approvedBy: 'Automation Lead' });
  put(ws, 'knowledge_base/execution_safety_policy.json', JSON.stringify(FIXTURE_POLICY, null, 2)); // the project's own policy
  if (start) {
    rs.recordSafetyPreflight(ws.runsDir, ws.folderName, PREFLIGHT());
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '5A', invocationPath: 'Pipeline', now: tick() });
  }
}
const surefire = (cases) => `<?xml version="1.0"?>\n<testsuite name="Suite" tests="${cases.length}">\n${cases.map(([n, st]) => `<testcase name="${n}" classname="audit.LoginTest" time="1.0">${st === 'Failed' ? '<failure message="expected Wrong password"/>' : st === 'Skipped' ? '<skipped/>' : ''}</testcase>`).join('\n')}\n</testsuite>\n`;
function recordWithRaw(ws, rows, raw, { cite = true, file = 'execution/surefire/TEST-Suite.xml' } = {}) {
  put(ws, `runs/${ws.folderName}/${file}`, raw);
  const rel = writeResults(ws.dataRoot, ws.folderName, '5A', rows.map(([id, st]) => [id, st]));
  if (cite) fs.appendFileSync(path.join(ws.dataRoot, rel), `\n| Field | Value |\n|---|---|\n| Raw Framework Report | ${file} |\n`);
  rs.recordStageArtifacts(ws.runsDir, ws.folderName, { stageId: '5A', artifacts: [rel], now: tick() });
  return rs.recordOutcomeFromResults(ws.runsDir, ws.folderName, { stageId: '5A', now: tick() }).state.stages['5A'].outcome;
}
const final = (o, id) => o.tests.find((t) => t.testCaseId === id);

// =============================================================================================
// F-08 — framework evidence integrity
// =============================================================================================

test('F-08 (Phase 9 FW-3): a Passed contradicted by the Surefire XML is Failed, with a framework-contradiction conflict', () => {
  const ws = workspace();
  try {
    automationRun(ws);
    const o = recordWithRaw(ws, [['TC-LOGIN-001', 'Passed'], ['TC-LOGIN-002', 'Passed'], ['TC-LOGIN-003', 'Passed']],
      surefire([['TC_LOGIN_001_lockout', 'Passed'], ['TC_LOGIN_002_success', 'Passed'], ['TC_LOGIN_003_wrongExpectation', 'Failed']]));
    assert.equal(final(o, 'TC-LOGIN-003').final, 'Failed');
    assert.ok(o.conflicts.some((c) => c.kind === 'framework-contradiction' && c.testCaseId === 'TC-LOGIN-003'));
    assert.notEqual(o.verdict, 'all-passed');
    assert.equal(o.framework.verified, 2); assert.equal(o.framework.contradicted, 1);
  } finally { cleanup(ws); }
});

test('F-08: Playwright JSON — a failure overrides Passed; a skipped test is never a pass; an uncited report in a single-cycle run is still compared', () => {
  const ws = workspace();
  try {
    automationRun(ws);
    const pw = { config: {}, stats: {}, suites: [{ title: 'login.spec.ts', specs: [
      { title: 'TC-LOGIN-001 lockout', tests: [{ status: 'expected', results: [{ status: 'passed' }] }] },
      { title: 'TC-LOGIN-002 success', tests: [{ status: 'skipped', results: [{ status: 'skipped' }] }] },
      { title: 'TC-LOGIN-003 wrong', tests: [{ status: 'unexpected', results: [{ status: 'failed' }] }] },
    ] }] };
    const o = recordWithRaw(ws, [['TC-LOGIN-001', 'Passed'], ['TC-LOGIN-002', 'Passed'], ['TC-LOGIN-003', 'Passed']], JSON.stringify(pw), { cite: false, file: 'execution/raw/pw-report.json' });
    // A raw pass does not make a result Failed; whether it is a VERIFIED pass is still decided by its assertion evidence.
    assert.notEqual(final(o, 'TC-LOGIN-001').final, 'Failed');
    assert.equal(o.framework.verified, 1);
    assert.equal(final(o, 'TC-LOGIN-002').final, 'Unverified');
    assert.equal(final(o, 'TC-LOGIN-003').final, 'Failed');
  } finally { cleanup(ws); }
});

test('F-08: identity and count mismatches are conflicts; a Passed missing from an existing report is Unverified; no report is "no-report", never claimed', () => {
  const ws = workspace();
  try {
    automationRun(ws);
    const o = recordWithRaw(ws, [['TC-LOGIN-001', 'Passed'], ['TC-LOGIN-002', 'Passed']], surefire([['TC_LOGIN_001_a', 'Passed'], ['TC_LOGIN_009_x', 'Passed'], ['TC_LOGIN_010_y', 'Passed']]));
    assert.equal(final(o, 'TC-LOGIN-002').final, 'Unverified');
    const kinds = o.conflicts.map((c) => c.kind);
    assert.ok(kinds.includes('framework-identity-mismatch'));
    assert.ok(kinds.includes('framework-count-mismatch'));
    assert.equal(o.verdict, 'incomplete');
  } finally { cleanup(ws); }
  const ws2 = workspace();
  try {
    automationRun(ws2);
    const rel = writeResults(ws2.dataRoot, ws2.folderName, '5A', [['TC-LOGIN-001', 'Passed']]);
    rs.recordStageArtifacts(ws2.runsDir, ws2.folderName, { stageId: '5A', artifacts: [rel], now: tick() });
    const o = rs.recordOutcomeFromResults(ws2.runsDir, ws2.folderName, { stageId: '5A', now: tick() }).state.stages['5A'].outcome;
    assert.deepEqual([o.framework.reports, o.framework.verified, o.framework.noReport], [0, 0, 1]);
  } finally { cleanup(ws2); }
});

test('F-08: with several cycles an uncited raw report cannot be attributed — conflict, verdict capped', () => {
  const ws = workspace();
  try {
    automationRun(ws);
    put(ws, `runs/${ws.folderName}/execution/surefire/TEST-Suite.xml`, surefire([['TC_LOGIN_001_a', 'Failed']]));
    for (const [n, file] of [[1, undefined], [2, 'execution/ExecutionResults.rerun-1.md']]) {
      const rel = writeResults(ws.dataRoot, ws.folderName, '5A', [['TC-LOGIN-001', 'Passed']], { file });
      rs.recordStageArtifacts(ws.runsDir, ws.folderName, { stageId: '5A', artifacts: [rel], now: tick() });
      void n;
    }
    const o = rs.recordOutcomeFromResults(ws.runsDir, ws.folderName, { stageId: '5A', now: tick() }).state.stages['5A'].outcome;
    assert.ok(o.conflicts.some((c) => c.kind === 'framework-report-unattributed'));
    assert.notEqual(o.verdict, 'all-passed');
  } finally { cleanup(ws); }
});

// =============================================================================================
// F-09 / F-10
// =============================================================================================

test('F-09 (Phase 9 EV-1): an evidence file name with underscores verifies; traversal and outside paths are still refused', () => {
  const ws = workspace();
  try {
    automationRun(ws, { start: false });
    rs.recordSafetyPreflight(ws.runsDir, ws.folderName, PREFLIGHT({ stageId: '4M' }));
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '4M', invocationPath: 'Direct', now: tick() });
    put(ws, `runs/${ws.folderName}/manual_execution/raw/obs_TC_LOGIN_001.json`, '{"ok":true}');
    const rel = writeResults(ws.dataRoot, ws.folderName, '4M', [['TC-LOGIN-001', 'Passed']]);
    const abs = path.join(ws.dataRoot, rel);
    fs.writeFileSync(abs, fs.readFileSync(abs, 'utf8').replace('| equals | ✅ | — |', '| equals | ✅ | raw/obs_TC_LOGIN_001.json |'));
    rs.recordStageArtifacts(ws.runsDir, ws.folderName, { stageId: '4M', artifacts: [rel], now: tick() });
    const o = rs.recordOutcomeFromResults(ws.runsDir, ws.folderName, { stageId: '4M', now: tick() }).state.stages['4M'].outcome;
    assert.equal(final(o, 'TC-LOGIN-001').final, 'Passed', final(o, 'TC-LOGIN-001').reason);
    // The same cell spelled with the underscores stripped (the Phase 9 bug) names a file that does not exist.
    assert.ok(!fs.existsSync(path.join(ws.runsDir, ws.folderName, 'manual_execution', 'raw', 'obsTCLOGIN001.json')));
    const ae = require('../assertionEvidence');
    assert.equal(ae.resolveEvidenceRef('../../outside/a_b.json', { runDir: path.join(ws.runsDir, ws.folderName) }).status, 'traversal');
    assert.equal(ae.resolveEvidenceRef('C:/Windows/a_b.json', { runDir: path.join(ws.runsDir, ws.folderName) }).status, 'outside');
  } finally { cleanup(ws); }
});

test('F-10 (Phase 9): platform-emitted Unverified agrees with history; an unknown external status stays conservative', () => {
  const ws = workspace();
  try {
    automationRun(ws);
    const rel = writeResults(ws.dataRoot, ws.folderName, '5A', [['TC-LOGIN-001', 'Passed']], { expected: 'not the approved value' });
    rs.recordStageArtifacts(ws.runsDir, ws.folderName, { stageId: '5A', artifacts: [rel], now: tick() });
    const r = cli(RM, ['state', 'outcome', '5A', '--from-results', '--run', ws.folderName], ws);
    assert.equal(r.code, 0, r.text);
    const { buildRunHealth } = require('../../observability/runHealth');
    let h = buildRunHealth({ dataRoot: ws.dataRoot, runFolder: ws.folderName, now: tick() });
    assert.equal(h.telemetry.final.disagree.length, 0, JSON.stringify(h.telemetry.final.disagree));
    // A Skill writes "Unverified" itself: not canonical input — it stays a disagreement (Unrecognized).
    const { recordEvent } = require('../../observability/recorder');
    recordEvent({ runFolder: ws.folderName, dataRoot: ws.dataRoot, now: tick(), event: { type: 'TEST_EXECUTION_RESULT', source: 'skill', stage: '5A', testCaseId: 'TC-LOGIN-001', status: 'Unverified' } });
    h = buildRunHealth({ dataRoot: ws.dataRoot, runFolder: ws.folderName, now: tick() });
    assert.ok(h.telemetry.final.disagree.some((d) => d.source === 'skill'));
  } finally { cleanup(ws); }
});

// =============================================================================================
// F-11 … F-14 — registry and scope isolation
// =============================================================================================

test('F-11 (Phase 9 G-4): runs bind only to registered, Active scope — modules, Supplier Features and Suppliers (CLI)', () => {
  const ws = workspace(null);
  try {
    const modulesDir = path.join(ws.dataRoot, 'modules');
    const sfDir = path.join(ws.dataRoot, 'supplier-features');
    moduleRegistry.registerModule(modulesDir, { slug: 'login', name: 'Login', status: 'Active' }, { now: tick() });
    moduleRegistry.registerModule(modulesDir, { slug: 'pending', name: 'Pending', status: 'Proposed' }, { now: tick() });
    moduleRegistry.registerModule(modulesDir, { slug: 'old', name: 'Old', status: 'Superseded' }, { now: tick() });
    for (const [m, want] of [['ghost', /not registered/], ['pending', /Proposed, not approved/], ['old', /Superseded/]]) {
      const r = cli(RM, ['new', '--scope', 'Module', '--target', 'X', '--modules', m, '--no-activate'], ws);
      assert.equal(r.code, 1, r.text); assert.match(r.text, want);
    }
    assert.equal(cli(RM, ['new', '--scope', 'Module', '--target', 'X', '--modules', 'login', '--no-activate'], ws).code, 0);
    const r2 = cli(RM, ['new', '--scope', 'Feature', '--target', 'X', '--feature', 'nope', '--supplier', 'nobody', '--no-activate'], ws);
    assert.equal(r2.code, 1); assert.match(r2.text, /Supplier Feature "nope" is not registered/);
    moduleRegistry.registerModule(sfDir, { slug: 'seats', name: 'Seats', status: 'Active' }, { now: tick() });
    const r3 = cli(RM, ['new', '--scope', 'Feature', '--target', 'X', '--feature', 'seats', '--supplier', 'nobody', '--no-activate'], ws);
    assert.equal(r3.code, 1); assert.match(r3.text, /Supplier \(under "seats"\) "nobody" is not registered/);
    assert.equal(fs.readdirSync(ws.runsDir).filter((d) => !d.startsWith('.') && fs.statSync(path.join(ws.runsDir, d)).isDirectory()).length, 1, 'only the valid run was created');
  } finally { cleanup(ws); }
});

test('F-12 (Phase 9 G-5): a Supplier, or a shared scope, is never approved or scaffolded under a still-Proposed Supplier Feature', () => {
  const ws = workspace(null);
  try {
    const sfDir = path.join(ws.dataRoot, 'supplier-features');
    moduleRegistry.registerModule(sfDir, { slug: 'refund', name: 'Refund', status: 'Proposed' }, { now: tick() });
    supplierRegistry.proposeSupplier(sfDir, 'refund', { name: 'Test Air', slug: 'test-air' }, { now: tick() });
    assert.throws(() => supplierRegistry.approveSuppliers(sfDir, 'refund', ['test-air'], { now: tick(), approvedBy: 'Supplier PO' }), /not approved \(Active\)/);
    assert.throws(() => supplierRegistry.scaffoldSupplier(sfDir, 'refund', 'test-air', { now: tick() }), /not approved \(Active\)/);
    featureRegistry.proposeFeature(sfDir, 'refund', { name: 'Shared Baseline' }, { now: tick() });
    assert.throws(() => featureRegistry.approveFeatures(sfDir, 'refund', [], { now: tick(), approvedBy: 'Supplier PO' }), /not approved \(Active\)/);
    assert.equal(fs.existsSync(path.join(sfDir, 'refund', 'suppliers', 'test-air')), false);
    moduleRegistry.approveModules(sfDir, ['refund'], { now: tick(), approvedBy: 'Feature Owner' });
    supplierRegistry.approveSuppliers(sfDir, 'refund', ['test-air'], { now: tick(), approvedBy: 'Supplier PO' });
  } finally { cleanup(ws); }
});

test('F-13 (Phase 9 G-6): a Capability Plan is bound to the run\'s Feature, Supplier and capability answers', () => {
  const ws = workspace({ scopeFamily: 'supplier-feature', feature: 'seats', supplier: 'alpha-air', sharedScope: null });
  try {
    const sfDir = path.join(ws.dataRoot, 'supplier-features');
    moduleRegistry.registerModule(sfDir, { slug: 'seats', name: 'Seats', status: 'Active' }, { now: tick() });
    for (const s of ['alpha-air', 'beta-air']) {
      supplierRegistry.proposeSupplier(sfDir, 'seats', { name: s, slug: s }, { now: tick() });
      supplierRegistry.approveSuppliers(sfDir, 'seats', [s], { now: tick(), approvedBy: 'Supplier PO' });
    }
    const suite = put(ws, 'supplier-features/seats/suppliers/alpha-air/test_design/TestCases_Seats.md', '# Suite\n\n| Test Case ID | Title | Requires |\n|---|---|---|\n| TC-SEAT-001 | Hold | Hold |\n');
    const plan = (supplier) => spawnSync(process.execPath, [CG, 'plan', '--suite', path.join(ws.dataRoot, suite), '--feature', 'seats', '--supplier', supplier, '--run', ws.folderName, '--runs-dir', ws.runsDir, '--supplier-features-dir', sfDir], { encoding: 'utf8' });
    const wrong = plan('beta-air');
    assert.equal(wrong.status, 1); assert.match(wrong.stderr, /bound to Supplier "alpha-air", not "beta-air"/);
    assert.equal(plan('alpha-air').status, 0);
    const gateCap = () => gate.checkStageEntry(ws.runsDir, ws.folderName, { stageId: '5A', invocationPath: 'Direct', now: tick() }).checks.find((c) => c.stage === 'capability');
    assert.equal(gateCap().result, 'ok');
    // The Supplier's capability answer changes after the plan: stale.
    supplierRegistry.setSupplierCapabilities(sfDir, 'seats', 'alpha-air', { hold: 'yes' }, { now: tick(), setBy: 'Supplier PO' });
    assert.equal(gateCap().result, 'stale');
  } finally { cleanup(ws); }
});

test('F-14 (Phase 9 S-3): a run cannot register another module\'s artifact as its checkpoint; its own scope and run folder are fine', () => {
  const ws = workspace();
  try {
    put(ws, 'modules/billing/context/ProjectContext.md', art('Pending Review'));
    put(ws, PC, art('Pending Review'));
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Direct (degraded)', now: tick() });
    expectCode(() => rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '1', artifacts: ['modules/billing/context/ProjectContext.md'], now: tick() }), 'OUT_OF_SCOPE');
    expectCode(() => rs.recordStageArtifacts(ws.runsDir, ws.folderName, { stageId: '1', artifacts: [{ path: 'modules/billing/context/ProjectContext.md', kind: 'checkpoint' }], now: tick() }), 'OUT_OF_SCOPE');
    rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '1', artifacts: [PC], now: tick() });
    assert.doesNotMatch(fs.readFileSync(rs.runJsonPath(ws.runsDir, ws.folderName), 'utf8'), /billing/);
  } finally { cleanup(ws); }
});

// =============================================================================================
// F-15 / F-20 — approver identity, module lifecycle
// =============================================================================================

test('F-15 (Phase 9 G-2): empty, one-character and agent-shaped approvers are refused everywhere; real names pass; nothing claims authentication', () => {
  for (const bad of ['', ' ', 'x', 'Claude', 'agent', 'AI Assistant', 'GPT-4', 'Copilot', 'bot', 'system', 'n/a']) assert.ok(approverProblem(bad), bad);
  for (const ok of ['QA Lead', 'Jane Reviewer', 'Ai Wong', 'PO', 'lead@example.com']) assert.equal(approverProblem(ok), null, ok);
  const ws = workspace();
  try {
    put(ws, PC, art('Pending Review'));
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Direct (degraded)', now: tick() });
    rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '1', artifacts: [PC], now: tick() });
    put(ws, PC, art('Approved'));
    for (const who of ['Claude', 'agent', 'x']) expectCode(() => rs.approveStage(ws.runsDir, ws.folderName, { stageId: '1', approvedBy: who, now: tick() }), 'INVALID_APPROVER');
    const modulesDir = path.join(ws.dataRoot, 'modules');
    moduleRegistry.registerModule(modulesDir, { slug: 'login', name: 'Login', status: 'Proposed' }, { now: tick() });
    assert.throws(() => moduleRegistry.approveModules(modulesDir, ['login'], { now: tick(), approvedBy: 'Claude' }), /AI agent/);
    automationState.setAutomationState(modulesDir, 'login', 'Generated', { now: tick() });
    assert.throws(() => automationState.setAutomationState(modulesDir, 'login', 'Approved', { now: tick(), approvedBy: 'agent' }), /AI agent/);
    const { createAuthorization } = require('../../execution_safety/authorizations');
    assert.throws(() => createAuthorization({ runId: 'r', action: 'UPDATE', approvedAt: T0.toISOString(), approvedBy: 'AI Assistant' }), /AI agent/);
    assert.equal(rs.approveStage(ws.runsDir, ws.folderName, { stageId: '1', approvedBy: 'Jane Reviewer', now: tick() }).state.stages['1'].status, 'Completed');
    assert.match(fs.readFileSync(path.join(__dirname, '..', 'approverIdentity.js'), 'utf8'), /IS NOT: authentication/);
  } finally { cleanup(ws); }
});

test('F-20: a Superseded or Archived module (or Feature) is never reactivated by approval; approval provenance is per entity', () => {
  const ws = workspace(null);
  try {
    const modulesDir = path.join(ws.dataRoot, 'modules');
    moduleRegistry.registerModule(modulesDir, { slug: 'a', name: 'A', status: 'Proposed' }, { now: tick() });
    moduleRegistry.registerModule(modulesDir, { slug: 'b', name: 'B', status: 'Proposed' }, { now: tick() });
    moduleRegistry.registerModule(modulesDir, { slug: 'old', name: 'Old', status: 'Superseded' }, { now: tick() });
    moduleRegistry.registerModule(modulesDir, { slug: 'gone', name: 'Gone', status: 'Archived' }, { now: tick() });
    assert.throws(() => moduleRegistry.approveModules(modulesDir, ['old'], { now: tick(), approvedBy: 'Reviewer A' }), /never reactivates a Superseded/);
    assert.throws(() => moduleRegistry.approveModules(modulesDir, ['gone'], { now: tick(), approvedBy: 'Reviewer A' }), /Archived/);
    moduleRegistry.approveModules(modulesDir, ['a'], { now: tick(), approvedBy: 'Reviewer A' });
    moduleRegistry.approveModules(modulesDir, ['b'], { now: tick(), approvedBy: 'Reviewer B' });
    moduleRegistry.approveModules(modulesDir, ['a'], { now: tick(), approvedBy: 'Reviewer C' }); // already Active: untouched
    const reg = moduleRegistry.readRegistry(modulesDir);
    const by = Object.fromEntries(reg.modules.map((m) => [m.slug, [m.status, m.approvedBy || null]]));
    assert.deepEqual(by, { a: ['Active', 'Reviewer A'], b: ['Active', 'Reviewer B'], old: ['Superseded', null], gone: ['Archived', null] });
  } finally { cleanup(ws); }
});

// =============================================================================================
// F-16 — Safety Preflight
// =============================================================================================

test('F-16 (Phase 9 G-7): an execution stage never starts without a confirmed preflight — gate, API, CLI and planner', () => {
  const ws = workspace();
  try {
    automationRun(ws, { start: false });
    const g = gate.checkStageEntry(ws.runsDir, ws.folderName, { stageId: '5A', invocationPath: 'Pipeline', now: tick() });
    assert.equal(g.decision, 'blocked'); assert.ok(g.blockers.some((b) => /^SAFETY_PREFLIGHT:/.test(b)));
    rs.selectWorkflow(ws.runsDir, ws.folderName, { type: 'specific-stage', stageId: '5A', by: 'QA Lead', now: tick() });
    assert.equal(planner.nextStep(ws.runsDir, ws.folderName, { now: tick() }).next.action, 'confirm-preflight');
    expectCode(() => rs.startStage(ws.runsDir, ws.folderName, { stageId: '5A', invocationPath: 'Pipeline', now: tick() }), 'GATE_BLOCKED');
    // A stage blocked at its gate never ran: its "results" are not evidence.
    const rel = writeResults(ws.dataRoot, ws.folderName, '5A', [['TC-LOGIN-001', 'Failed']]);
    void rel;
    expectCode(() => rs.recordOutcomeFromResults(ws.runsDir, ws.folderName, { stageId: '5A', now: tick() }), 'STAGE_NEVER_STARTED');
    const r = cli(RM, ['state', 'preflight', '5A', '--environment', 'Staging', '--target-url', 'https://qa.example.test', '--execution-type', 'browser', '--execution-mode', 'Headed', '--operations', '[{"action":"READ","ownership":"DedicatedTestData"}]', '--confirmed-by', 'QA Lead', '--run', ws.folderName], ws);
    assert.equal(r.code, 0, r.text); assert.match(r.text, /CONFIRMED/);
    assert.equal(rs.startStage(ws.runsDir, ws.folderName, { stageId: '5A', invocationPath: 'Pipeline', now: tick() }).state.stages['5A'].status, 'Running');
    assert.match(fs.readFileSync(path.join(ws.runsDir, ws.folderName, 'metadata', 'SafetyPreflight.md'), 'utf8'), /Headed/);
  } finally { cleanup(ws); }
});

test('F-16: never inferred, never defaulted — unknown or missing environment, browser without a mode, an uncovered environment and an invalid confirmer are refused and recorded', () => {
  const ws = workspace();
  try {
    automationRun(ws, { start: false });
    const refused = (o, re) => assert.throws(() => rs.recordSafetyPreflight(ws.runsDir, ws.folderName, PREFLIGHT(o)), (e) => e.code === 'PREFLIGHT_REFUSED' && re.test(e.message), String(re));
    refused({ environment: '' }, /never inferred from the URL and never defaulted/);
    refused({ environment: 'UAT' }, /not a known environment/);
    refused({ environment: 'Production' }, /no policy covers Production — Production execution is refused/);
    refused({ executionMode: undefined }, /explicit mode — Headed or Headless/);
    refused({ executionMode: 'Auto' }, /explicit mode/);
    refused({ confirmedBy: 'Claude' }, /AI agent/);
    refused({ targetUrl: 'javascript:alert(1)' }, /not an http\(s\) URL/);
    refused({ targetUrl: 'https://prod.example.com' }, /not the run scope's declared target/);
    refused({ operations: [] }, /no intended test operations/);
    // Non-browser execution never needs a mode.
    rs.recordSafetyPreflight(ws.runsDir, ws.folderName, PREFLIGHT({ executionType: 'api', executionMode: undefined }));
    const trail = rs.readRunState(ws.runsDir, ws.folderName).safetyPreflights || JSON.parse(fs.readFileSync(rs.runJsonPath(ws.runsDir, ws.folderName), 'utf8')).safetyPreflights;
    assert.equal(trail.length, 10); assert.equal(trail.filter((x) => x.decision === 'refused').length, 9);
  } finally { cleanup(ws); }
});

test('F-16: mutating operations — allowed where the policy permits, Approval Required needs a named run authorization, Forbidden is never lifted', () => {
  const ws = workspace();
  try {
    automationRun(ws, { start: false });
    rs.recordSafetyPreflight(ws.runsDir, ws.folderName, PREFLIGHT({ operations: [{ action: 'CREATE', ownership: 'SelfCreated' }, { action: 'READ', ownership: 'Shared' }] }));
    const pf = () => rs.recordSafetyPreflight(ws.runsDir, ws.folderName, PREFLIGHT({ operations: [{ action: 'UPDATE', ownership: 'Shared', module: 'login' }] }));
    assert.throws(pf, /needs a run authorization/);
    const { createAuthorization, saveAuthorizations } = require('../../execution_safety/authorizations');
    saveAuthorizations({ dataRoot: ws.dataRoot, runFolder: ws.folderName, now: tick(), authorizations: [createAuthorization({ runId: ws.folderName, action: 'UPDATE', ownership: 'Shared', module: 'login', environment: 'Staging', approvedAt: T0.toISOString(), approvedBy: 'Test Manager' })] });
    const ok = pf().safetyPreflight;
    assert.equal(ok.decision, 'confirmed'); assert.equal(ok.operations[0].mutating, true); assert.equal(ok.operations[0].authorizedBy, 'Test Manager');
    assert.throws(() => rs.recordSafetyPreflight(ws.runsDir, ws.folderName, PREFLIGHT({ operations: [{ action: 'DELETE', ownership: 'Shared' }] })), /Forbidden/);
    assert.throws(() => rs.recordSafetyPreflight(ws.runsDir, ws.folderName, PREFLIGHT({ operations: [{ action: 'READ', ownership: 'DedicatedTestData', module: 'billing' }] })), /outside the run's scope/);
  } finally { cleanup(ws); }
});

test('F-16: the preflight is bound — a changed policy, suite or authorization makes it stale at the gate and at completion', () => {
  const ws = workspace();
  try {
    automationRun(ws);
    const rel = writeResults(ws.dataRoot, ws.folderName, '5A', [['TC-LOGIN-001', 'Failed']]);
    rs.recordStageArtifacts(ws.runsDir, ws.folderName, { stageId: '5A', artifacts: [rel], now: tick() });
    rs.recordOutcomeFromResults(ws.runsDir, ws.folderName, { stageId: '5A', now: tick() });
    const pol = path.join(ws.dataRoot, 'knowledge_base', 'execution_safety_policy.json');
    fs.writeFileSync(pol, JSON.stringify({ ...FIXTURE_POLICY, policyVersion: 2 }, null, 2));
    expectCode(() => rs.completeStage(ws.runsDir, ws.folderName, { stageId: '5A', now: tick() }), 'PREFLIGHT_STALE');
    rs.recordSafetyPreflight(ws.runsDir, ws.folderName, PREFLIGHT());
    rs.completeStage(ws.runsDir, ws.folderName, { stageId: '5A', now: tick() });
    // A suite change invalidates the next execution stage's preflight before it starts.
    rs.recordSafetyPreflight(ws.runsDir, ws.folderName, PREFLIGHT({ stageId: '5H' }));
    put(ws, TC, art('Approved', `${SUITE}\n<!-- edited -->`));
    const g = gate.checkStageEntry(ws.runsDir, ws.folderName, { stageId: '5H', invocationPath: 'Direct', by: 'QA Lead', now: tick() });
    assert.ok(g.blockers.some((b) => /stale — bound input\(s\) changed since it was confirmed: suites/.test(b)), g.blockers.join('\n'));
  } finally { cleanup(ws); }
});

// =============================================================================================
// F-17 / F-21
// =============================================================================================

test('F-17 (Phase 9 S-4): report HTML never carries executable markup from a model; a CSP allows only the report\'s own script, by hash', () => {
  const { renderReport } = require('../../report_builder');
  const html = renderReport({ title: 'Probe', statusPill: 'COMPLETE', statusPillTone: 'neutral', statuses: [{ key: 'PASSED', label: 'Passed', tone: 'pass' }], summary: { counts: [{ status: 'PASSED', value: 1 }] },
    sections: [{ type: 'notes', title: 'Captured', blocks: ['<script>alert("t")</script>', { kind: 'p', value: { html: '<img src=x onerror=alert(1)><b onclick="x()">kept</b><a href="javascript:alert(1)">j</a><svg onload=alert(2)></svg>' } }] }] });
  // No executable element or handler survives as MARKUP (an escaped, inert "&lt;img … onerror=" text is fine).
  assert.doesNotMatch(html, /<img|<svg|<iframe|<a [^>]*href="javascript:/i);
  assert.doesNotMatch(html.replace(/<script>[\s\S]*?<\/script>/, ''), /<[a-z][^>]*\son[a-z]+\s*=/i);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /<b>kept<\/b>/);
  const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
  assert.ok(csp, 'CSP present');
  assert.match(csp[1], /default-src 'none'/);
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const hash = crypto.createHash('sha256').update(script, 'utf8').digest('base64');
  assert.ok(csp[1].includes(`'sha256-${hash}'`), 'the CSP hash is the exact inline script');
  assert.equal((html.match(/<script>/g) || []).length, 1, 'exactly one script — the report\'s own');
});

test('F-21: the package entry point exists and runs; the packaging guard passes and still refuses project data that would ship', () => {
  assert.ok(fs.existsSync(path.join(REPO, 'bin', 'agentic-testing.js')));
  const help = spawnSync(process.execPath, [path.join(REPO, 'bin', 'agentic-testing.js'), '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0); assert.match(help.stdout, /agentic-testing/);
  const guard = spawnSync(process.execPath, [path.join(REPO, 'scripts', 'verifyPackable.js')], { encoding: 'utf8', cwd: REPO });
  assert.equal(guard.status, 0, guard.stdout + guard.stderr);
  const src = fs.readFileSync(path.join(REPO, 'scripts', 'verifyPackable.js'), 'utf8');
  assert.match(src, /const wouldPublish = \(rel\)/);
  assert.match(src, /if \(!Array\.isArray\(pkg\.files\) \|\| !pkg\.files\.length\) return true;/, 'without files[] every listed file is still checked');
});
