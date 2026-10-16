// Phase 6 — Stage 5H Self-Healing safety and governance. Real CLIs as child processes against disposable
// data roots, through a real automation run (1 → 2 → 3 → 4A → 5A), plus the public API.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const heal = require('../repairGovernance');
const repairPatch = require('../repairPatch');

const TOOLS = path.resolve(__dirname, '..', '..');
const RM = path.join(TOOLS, 'run_manager', 'cli.js');
const MM = path.join(TOOLS, 'module_manager', 'cli.js');

// ---------------------------------------------------------------------------------------------
// Fixture: an automation run whose 5A recorded an automation failure, an application failure and an
// inconclusive result.
// ---------------------------------------------------------------------------------------------

const header = (title, status) => `# ${title}\n\n| Field | Value |\n|---|---|\n| Status | ${status} |\n`;
const table = (rows) => `**Assertions:**\n\n| Assertion ID | Expected | Expected Source | Check | Requirement |\n|---|---|---|---|---|\n${rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}\n\n`;
const CASES = [
  { id: 'TC-LOGIN-001', expected: 'The banner reads "Account locked".', design: [['A1', '`Account locked`', 'Expected Result', 'equals', 'AC-1']] },
  { id: 'TC-LOGIN-002', expected: 'The reset link is rejected with HTTP `410`.', design: [['A1', '`410`', 'Expected Result', 'equals', 'AC-2']] },
  { id: 'TC-LOGIN-003', expected: 'The account status is `Locked`.', design: [['A1', '`Locked`', 'Expected Result', 'equals', 'AC-3']] },
  { id: 'TC-LOGIN-004', expected: 'The user is signed out after `30` minutes.', design: [['A1', '`30`', 'Expected Result', 'equals', 'AC-4']] },
];
const caseText = (c) => `### ${c.id} — ${c.id}\n\n**Objective:** o.\n\n**Preconditions:** p.\n\n**Test Data:** None.\n\n**Steps:**\n\n1. s.\n\n**Expected Result:** ${c.expected}\n\n${table(c.design)}**Priority:** P1\n\n**Tags:** Atomic\n\n**Review:** Approved\n\n**Automation:** Approved\n`;
const suite = (status) => `${header('Test Cases', status)}\n## Test Cases\n\n${CASES.map(caseText).join('\n')}`;
const matrix = (status) => `${header('Traceability Matrix', status)}\n| Test Case ID | Requirement Reference | Discovery Reference | Finding Reference | Evidence Reference | Acceptance Criteria Reference | Run Scope Reference | Risk Level | Risk Statement | Validation Status |\n|---|---|---|---|---|---|---|---|---|---|\n${CASES.map((c) => `| ${c.id} | PC §3 | N/A | N/A | N/A | N/A | Module | Low | r | Traced |`).join('\n')}\n`;
const EXPECTED = { 'TC-LOGIN-001': '`Account locked`', 'TC-LOGIN-002': '`410`', 'TC-LOGIN-003': '`Locked`', 'TC-LOGIN-004': '`30`' };
/** An automated results file; Passed rows carry their verified A1 record. */
const results = (rows) => {
  const recs = rows.filter(([, st]) => st === 'Passed').map(([id]) => `| ${id} | A1 | check | ${EXPECTED[id]} | — | ${EXPECTED[id]} | equals | ✅ | — |`);
  return `| Test Case ID | Automation Script ID | Status | Execution Time | Attempts | Failure Detail | Evidence Refs |\n|---|---|---|---|---|---|---|\n${rows.map(([id, st, d = '—']) => `| ${id} | s | ${st} | 1 s | 1 | ${d} | — |`).join('\n')}\n\n### 3.1 Assertion Records\n\n| Test Case ID | Assertion ID | Assertion | Expected | Expected Source | Actual | Check | Result | Evidence |\n|---|---|---|---|---|---|---|---|---|\n${recs.join('\n')}\n`;
};
const PAGE = 'modules/login/automation/tests_playwright/pages/LoginPage.ts';
const patch = (file, removed, added) => `--- a/${file}\n+++ b/${file}\n@@ -1,1 +1,1 @@\n${removed.map((l) => `-${l}`).join('\n')}\n${added.map((l) => `+${l}`).join('\n')}\n`;
const LOCATOR_FIX = patch(PAGE, ["  readonly banner = this.page.locator('#banner');"], ["  readonly banner = this.page.getByTestId('lock-banner');"]);
const HIGH = 'observed-root-cause:60:execution/artifacts/trace-tc1.zip;targets-root-cause:15:the locator is the failing step in the trace;reproduced:10:cycle 1 and a local rerun;static-check:5:tsc --noEmit clean';
const MEDIUM = 'observed-root-cause:55:execution/artifacts/trace-tc1.zip;targets-root-cause:15:the locator is the failing step in the trace';

function workspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'heal-'));
  const ws = {
    root,
    runsDir: path.join(root, 'runs'),
    put(rel, text) { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); return rel; },
    read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); },
    rm(...args) { require('./approvalFixture').preflightBeforeCliStart(args, ws.runsDir); const r = spawnSync(process.execPath, [RM, ...args, '--runs-dir', ws.runsDir], { encoding: 'utf8' }); return { code: r.status, text: `${r.stdout}\n${r.stderr}`, out: r.stdout }; },
    mm(...args) { const r = spawnSync(process.execPath, [MM, ...args, '--modules-dir', path.join(root, 'modules')], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); },
    meta(run) { return JSON.parse(ws.read(`runs/${run}/metadata/run.json`)); },
  };
  fs.mkdirSync(ws.runsDir, { recursive: true });
  ws.mm('propose', '--name', 'Login');
  ws.mm('approve', 'login', '--by', 'Reviewer');
  ws.put('knowledge_base/execution_safety_policy.json', JSON.stringify({ policyId: 'fixture', environment: 'QA', environmentAliases: ['qa'] }));
  return ws;
}
const cleanup = (ws) => fs.rmSync(ws.root, { recursive: true, force: true });
const flip = (ws, rel) => ws.put(rel, ws.read(rel).replace('| Status | Pending Review |', '| Status | Approved |'));
function checkpoint(ws, run, id, files) {
  assert.equal(ws.rm('state', 'start', id, '--invocation', 'Pipeline', '--run', run).code, 0, `start ${id}`);
  for (const [rel, text] of files) ws.put(rel, text);
  ws.rm('state', 'request-approval', id, '--artifacts', files.map((f) => f[0]).join(','), '--run', run);
  for (const [rel] of files) flip(ws, rel);
  const ap = ws.rm('state', 'approve', id, '--approved-by', 'Reviewer', '--run', run);
  assert.equal(ap.code, 0, ap.text);
}
/** Through 5A: TC-001 Automation Failure, TC-002 Application Failure, TC-003 Inconclusive, TC-004 Passed. */
function failedAutomationRun(ws) {
  const run = ws.rm('new', '--scope', 'Module', '--target', 'Login', '--modules', 'login', '--no-activate').text.match(/Created (\S+)/)[1];
  ws.rm('state', 'workflow', 'full-automation', '--by', 'Lead', '--run', run);
  checkpoint(ws, run, '1', [['modules/login/context/ProjectContext.md', header('Project Context', 'Pending Review')]]);
  checkpoint(ws, run, '2', [['modules/login/discovery/QA_Assessment_Report.md', header('QA Assessment', 'Pending Review')]]);
  checkpoint(ws, run, '3', [['modules/login/test_design/TestCases_login.md', suite('Pending Review')], ['modules/login/test_design/TraceabilityMatrix.md', matrix('Pending Review')]]);
  assert.equal(ws.rm('state', 'start', '4A', '--invocation', 'Pipeline', '--run', run).code, 0);
  ws.put('modules/login/automation/AutomationPlan_Playwright.md', header('Automation Plan', 'Pending Review'));
  ws.put(PAGE, "export class LoginPage {\n  readonly banner = this.page.locator('#banner');\n}\n");
  ws.mm('automation', 'login', '--state', 'Generated', '--by', 'agent');
  ws.rm('state', 'request-approval', '4A', '--artifacts', 'modules/login/automation/AutomationPlan_Playwright.md', '--run', run);
  flip(ws, 'modules/login/automation/AutomationPlan_Playwright.md');
  ws.mm('automation', 'login', '--state', 'Approved', '--by', 'Automation Lead');
  assert.equal(ws.rm('state', 'approve', '4A', '--approved-by', 'Automation Lead', '--run', run).code, 0);
  assert.equal(ws.rm('state', 'start', '5A', '--invocation', 'Pipeline', '--run', run).code, 0);
  const ER = ws.put(`runs/${run}/execution/ExecutionResults.md`, results([['TC-LOGIN-001', 'Automation Failure', 'locator #banner not found'], ['TC-LOGIN-002', 'Application Failure', 'link accepted after expiry'], ['TC-LOGIN-003', 'Inconclusive', 'status cell empty'], ['TC-LOGIN-004', 'Passed']]));
  ws.put(`runs/${run}/execution/artifacts/trace-tc1.zip`, 'trace');
  ws.rm('state', 'artifact', '5A', '--artifacts', ER, '--run', run);
  assert.equal(ws.rm('state', 'outcome', '5A', '--from-results', '--run', run).code, 0);
  assert.equal(ws.rm('state', 'complete', '5A', '--run', run).code, 0);
  return run;
}
function startHealing(ws, run, { environment = 'QA', tests = 'TC-LOGIN-001,TC-LOGIN-002,TC-LOGIN-003' } = {}) {
  assert.equal(ws.rm('state', 'start', '5H', '--invocation', 'Direct', '--by', 'QA Lead', '--run', run).code, 0);
  const o = ws.rm('state', 'heal', 'open', '--tests', tests, '--environment', environment, '--reason', 'locator drift after the UI release', '--by', 'QA Lead', '--run', run);
  assert.equal(o.code, 0, o.text);
}
const H = (ws, run, ...args) => ws.rm('state', 'heal', ...args, '--run', run);
const confirmAutomation = (ws, run) => assert.equal(H(ws, run, 'classify', '--test', 'TC-LOGIN-001', '--class', 'automation', '--evidence', 'execution/artifacts/trace-tc1.zip: #banner absent, data-testid=lock-banner present', '--by', 'QA Lead').code, 0);
/** A 5H rerun file, registered as a 5H artifact. */
function rerun(ws, run, n, rows) {
  const rel = ws.put(`runs/${run}/execution/ExecutionResults.rerun-${n}.md`, results(rows));
  ws.rm('state', 'artifact', '5H', '--artifacts', rel, '--kind', 'output', '--run', run);
  return rel;
}
function proposeApplied(ws, run, patchText, factors = HIGH, n = 1) {
  const p = ws.put(`runs/${run}/self_healing/attempt-${n}.diff`, patchText);
  const r = H(ws, run, 'propose', '--root-cause-confidence', 'High', '--test', 'TC-LOGIN-001', '--strategy', 'replace the stale locator', '--reason', 'the trace shows #banner absent', '--patch', p, '--factors', factors, '--by', 'QA Lead');
  assert.equal(r.code, 0, r.text);
  assert.equal(H(ws, run, 'batch-approve', '--by', 'QA Lead').code, 0);
  applyOnDisk(ws, patchText);
  return p;
}
/** What a human does between approval and `heal apply`: write the approved patch to the files. */
function applyOnDisk(ws, patchText) {
  for (const file of repairPatch.parseUnifiedDiff(patchText)) {
    const abs = path.join(ws.root, file.path);
    const before = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
    const after = repairPatch.applyHunks(before, file);
    if (after === null) fs.rmSync(abs); else { fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, after); }
  }
}
const ORIGINAL_PAGE = "export class LoginPage {\n  readonly banner = this.page.locator('#banner');\n}\n";
const report = (ws, run) => JSON.parse(H(ws, run, 'report', '--json').out)[0];
const testOf = (rep, id) => rep.tests.find((t) => t.testCaseId === id);

// ---------------------------------------------------------------------------------------------
// §1 Invocation safety
// ---------------------------------------------------------------------------------------------

test('no automatic 5H: the planner never proposes it; it starts only on a named Direct invocation; an operation names its failed scope', () => {
  const ws = workspace();
  try {
    const run = failedAutomationRun(ws);
    const next = JSON.parse(ws.rm('state', 'next', '--json', '--run', run).out).next;
    assert.doesNotMatch(JSON.stringify(next), /5H/);
    assert.notEqual(ws.rm('state', 'start', '5H', '--invocation', 'Pipeline', '--by', 'QA Lead', '--run', run).code, 0);
    assert.match(ws.rm('state', 'start', '5H', '--invocation', 'Direct', '--run', run).text, /MISSING_FIELD|named human/);
    assert.equal(ws.rm('state', 'start', '5H', '--invocation', 'Direct', '--by', 'QA Lead', '--run', run).code, 0);
    assert.match(H(ws, run, 'open', '--tests', 'TC-LOGIN-001', '--environment', 'QA', '--reason', 'r').text, /MISSING_FIELD/);
    assert.match(H(ws, run, 'open', '--environment', 'QA', '--reason', 'r', '--by', 'QA Lead').text, /names the failed automation tests/);
    assert.match(H(ws, run, 'open', '--tests', 'TC-LOGIN-004', '--environment', 'QA', '--reason', 'r', '--by', 'QA Lead').text, /only a failed result is in a repair scope/);
    assert.equal(H(ws, run, 'open', '--tests', 'TC-LOGIN-001', '--environment', 'QA', '--reason', 'r', '--by', 'QA Lead').code, 0);
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// §2 Failure classification
// ---------------------------------------------------------------------------------------------

test('classification: an application failure is refused (never reclassified as automation); unknown is blocked; automation is eligible once confirmed', () => {
  const ws = workspace();
  try {
    const run = failedAutomationRun(ws);
    startHealing(ws, run);
    const p = ws.put(`runs/${run}/self_healing/a.diff`, LOCATOR_FIX);
    // Not yet confirmed.
    assert.match(H(ws, run, 'propose', '--root-cause-confidence', 'High', '--test', 'TC-LOGIN-001', '--strategy', 's', '--reason', 'r', '--patch', p, '--factors', HIGH, '--by', 'QA Lead').text, /NOT_ELIGIBLE[\s\S]*not confirmed with evidence/);
    // Application defect: never reclassified, never repaired.
    assert.match(H(ws, run, 'classify', '--test', 'TC-LOGIN-002', '--class', 'automation', '--evidence', 'execution/artifacts/trace-tc1.zip looks flaky', '--by', 'QA Lead').text, /RECLASSIFICATION_REFUSED/);
    assert.match(H(ws, run, 'propose', '--root-cause-confidence', 'High', '--test', 'TC-LOGIN-002', '--strategy', 's', '--reason', 'r', '--patch', p, '--factors', HIGH, '--by', 'QA Lead').text, /NOT_ELIGIBLE[\s\S]*application/);
    // Unknown (recorded Inconclusive): blocked until a diagnosis establishes the class with evidence.
    assert.match(H(ws, run, 'propose', '--root-cause-confidence', 'High', '--test', 'TC-LOGIN-003', '--strategy', 's', '--reason', 'r', '--patch', p, '--factors', HIGH, '--by', 'QA Lead').text, /NOT_ELIGIBLE[\s\S]*unknown/);
    assert.equal(H(ws, run, 'classify', '--test', 'TC-LOGIN-003', '--class', 'test-data', '--evidence', 'execution/artifacts/trace-tc1.zip: the seeded account was unlocked by another run', '--by', 'QA Lead').code, 0);
    assert.match(H(ws, run, 'propose', '--root-cause-confidence', 'High', '--test', 'TC-LOGIN-003', '--strategy', 's', '--reason', 'r', '--patch', p, '--factors', HIGH, '--by', 'QA Lead').text, /NOT_ELIGIBLE[\s\S]*test-data/);
    // Classification needs evidence.
    assert.match(H(ws, run, 'classify', '--test', 'TC-LOGIN-001', '--class', 'automation', '--by', 'QA Lead').text, /MISSING_FIELD/);
    confirmAutomation(ws, run);
    assert.equal(H(ws, run, 'propose', '--root-cause-confidence', 'High', '--test', 'TC-LOGIN-001', '--strategy', 's', '--reason', 'r', '--patch', p, '--factors', HIGH, '--by', 'QA Lead').code, 0);
    const rep = report(ws, run);
    assert.equal(testOf(rep, 'TC-LOGIN-002').finalStatus, 'Application defect — unresolved, not repaired');
    assert.equal(testOf(rep, 'TC-LOGIN-003').finalStatus, 'Not eligible (test-data)');
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// §3 Attempts, §4 confidence
// ---------------------------------------------------------------------------------------------

test('three-attempt limit, persisted across an interrupted and resumed stage; a fourth attempt is refused', () => {
  const ws = workspace();
  try {
    const run = failedAutomationRun(ws);
    startHealing(ws, run);
    confirmAutomation(ws, run);
    for (let n = 1; n <= 3; n += 1) {
      proposeApplied(ws, run, LOCATOR_FIX, HIGH, n);
      assert.equal(H(ws, run, 'apply', '--test', 'TC-LOGIN-001', '--attempt', String(n), '--by', 'QA Lead').code, 0);
      const rr = rerun(ws, run, n, [['TC-LOGIN-001', 'Automation Failure', 'still not found']]);
      assert.equal(H(ws, run, 'validate', '--test', 'TC-LOGIN-001', '--attempt', String(n), '--rerun', rr, '--by', 'QA Lead').code, 0);
      ws.put(PAGE, ORIGINAL_PAGE); // rolled back to the restore point
      if (n === 2) {
        // The session dies; a human recovers and re-invokes the stage. The operation and its count persist.
        assert.equal(ws.rm('state', 'recover', '5H', '--by', 'QA Lead', '--reason', 'session closed', '--run', run).code, 0);
        assert.equal(ws.rm('state', 'start', '5H', '--invocation', 'Direct', '--by', 'QA Lead', '--run', run).code, 0);
        assert.equal(report(ws, run).tests[0].attempts.length, 2);
      }
    }
    const p4 = ws.put(`runs/${run}/self_healing/attempt-4.diff`, LOCATOR_FIX);
    const fourth = H(ws, run, 'propose', '--root-cause-confidence', 'High', '--test', 'TC-LOGIN-001', '--strategy', 's', '--reason', 'r', '--patch', p4, '--factors', HIGH, '--by', 'QA Lead');
    assert.match(fourth.text, /QUARANTINED|REPAIR_ATTEMPT_LIMIT/);
    const t = testOf(report(ws, run), 'TC-LOGIN-001');
    assert.deepEqual(t.attempts.map((a) => a.result), ['remaining', 'remaining', 'remaining']);
    assert.equal(t.finalStatus, 'Quarantined — attempt limit reached');
    assert.equal(t.attempts[0].beforeAfter.before, 'Automation Failure');
  } finally { cleanup(ws); }
});

test('confidence: evidence-cited and banded; Medium/Low need their own approval; High never skips the batch gate', () => {
  const ws = workspace();
  try {
    const run = failedAutomationRun(ws);
    startHealing(ws, run);
    confirmAutomation(ws, run);
    // An uncited factor, or a cited file that does not exist, is not evidence.
    const p = ws.put(`runs/${run}/self_healing/a.diff`, LOCATOR_FIX);
    assert.match(H(ws, run, 'propose', '--root-cause-confidence', 'High', '--test', 'TC-LOGIN-001', '--strategy', 's', '--reason', 'r', '--patch', p, '--factors', 'observed-root-cause:60:', '--by', 'QA Lead').text, /UNCITED_FACTOR/);
    assert.match(H(ws, run, 'propose', '--root-cause-confidence', 'High', '--test', 'TC-LOGIN-001', '--strategy', 's', '--reason', 'r', '--patch', p, '--factors', 'observed-root-cause:60:execution/artifacts/missing.zip', '--by', 'QA Lead').text, /UNCITED_FACTOR[\s\S]*missing/);
    // Medium: batch approval alone is not enough.
    assert.equal(H(ws, run, 'propose', '--root-cause-confidence', 'High', '--test', 'TC-LOGIN-001', '--strategy', 's', '--reason', 'r', '--patch', p, '--factors', MEDIUM, '--by', 'QA Lead').code, 0);
    assert.match(H(ws, run, 'apply', '--test', 'TC-LOGIN-001', '--attempt', '1', '--by', 'QA Lead').text, /APPROVAL_REQUIRED[\s\S]*batch/);
    assert.equal(H(ws, run, 'batch-approve', '--by', 'QA Lead').code, 0);
    assert.match(H(ws, run, 'apply', '--test', 'TC-LOGIN-001', '--attempt', '1', '--by', 'QA Lead').text, /APPROVAL_REQUIRED[\s\S]*Medium confidence \(70\)/);
    assert.equal(H(ws, run, 'approve', '--test', 'TC-LOGIN-001', '--attempt', '1', '--by', 'Automation Lead').code, 0);
    applyOnDisk(ws, LOCATOR_FIX);
    assert.equal(H(ws, run, 'apply', '--test', 'TC-LOGIN-001', '--attempt', '1', '--by', 'QA Lead').code, 0);
    const a = report(ws, run).tests[0].attempts[0];
    assert.deepEqual([a.confidence.score, a.confidence.band, a.approval.by], [70, 'Medium', 'Automation Lead']);
    // API: the bands, the caps.
    assert.deepEqual([heal.bandOf(90), heal.bandOf(89), heal.bandOf(70), heal.bandOf(69)], ['High', 'Medium', 'Medium', 'Low']);
    assert.equal(heal.computeConfidence([{ factor: 'observed-root-cause', value: 60, citation: 'x' }, { factor: 'targets-root-cause', citation: 'y' }, { factor: 'kb-rule', value: 25, citation: 'z' }]).score, 95);
    assert.equal(heal.computeConfidence([{ factor: 'observed-root-cause', value: 60, citation: 'x' }, { factor: 'targets-root-cause', citation: 'y' }], { novel: true }).score, 60);
    assert.equal(heal.computeConfidence([{ factor: 'targets-root-cause', citation: 'y' }, { factor: 'static-check', citation: 'z' }]).band, 'Low');
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// §5 Protected boundaries, §6 validation
// ---------------------------------------------------------------------------------------------

test('protected files are refused: approved test cases, Supplier rules, requirements, production configuration, application source', () => {
  const ws = workspace();
  try {
    const run = failedAutomationRun(ws);
    startHealing(ws, run);
    confirmAutomation(ws, run);
    const tryPatch = (file, name) => {
      const p = ws.put(`runs/${run}/self_healing/${name}.diff`, patch(file, ['old line'], ['new line']));
      return H(ws, run, 'propose', '--root-cause-confidence', 'High', '--test', 'TC-LOGIN-001', '--strategy', 's', '--reason', 'r', '--patch', p, '--factors', HIGH, '--by', 'QA Lead').text;
    };
    assert.match(tryPatch('modules/login/test_design/TestCases_login.md', 'tc'), /PROTECTED_BOUNDARY[\s\S]*Stage 3 artifact/);
    assert.match(tryPatch('supplier-features/ibp/suppliers/air/supplier.json', 'sup'), /PROTECTED_BOUNDARY[\s\S]*Supplier-specific business rules/);
    assert.match(tryPatch('modules/login/context/ProjectContext.md', 'pc'), /PROTECTED_BOUNDARY[\s\S]*requirements, findings/);
    assert.match(tryPatch('modules/login/automation/tests_playwright/config/application-prod.yml', 'prod'), /PROTECTED_BOUNDARY[\s\S]*production configuration/);
    assert.match(tryPatch('../webapp/src/auth/login.ts', 'app'), /PROTECTED_BOUNDARY[\s\S]*outside the automation code/);
    assert.match(tryPatch('modules/branch/automation/tests_playwright/pages/BranchPage.ts', 'other'), /PROTECTED_BOUNDARY[\s\S]*another module/);
    assert.equal(report(ws, run).tests[0].attempts.length, 0, 'a refused proposal is not an attempt');
  } finally { cleanup(ws); }
});

test('assertion weakening is refused: a weaker matcher, a changed or removed approved value, a removed assertion, a skip, a swallowed error', () => {
  const ws = workspace();
  try {
    const run = failedAutomationRun(ws);
    startHealing(ws, run);
    confirmAutomation(ws, run);
    const SPEC = 'modules/login/automation/tests_playwright/tests/login.spec.ts';
    const tryPatch = (name, removed, added) => {
      const p = ws.put(`runs/${run}/self_healing/${name}.diff`, patch(SPEC, removed, added));
      return H(ws, run, 'propose', '--root-cause-confidence', 'High', '--test', 'TC-LOGIN-001', '--strategy', 's', '--reason', 'r', '--patch', p, '--factors', HIGH, '--by', 'QA Lead').text;
    };
    assert.match(tryPatch('weak', ['  await expect(page.banner).toHaveText("Account locked");'], ['  await expect(page.banner).toContain("Account");']), /ASSERTION_WEAKENING[\s\S]*weaker one[\s\S]*approved expected value "Account locked"/);
    assert.match(tryPatch('removed', ['  await expect(page.banner).toHaveText("Account locked");'], ['  await page.banner.waitFor();']), /ASSERTION_WEAKENING[\s\S]*removes 1 assertion/);
    assert.match(tryPatch('skip', ["  test('locked account', async () => {"], ["  test.skip('locked account', async () => {"]), /ASSERTION_WEAKENING[\s\S]*skips verification/);
    assert.match(tryPatch('swallow', ['  await page.signIn();'], ['  await page.signIn().catch(() => {});']), /ASSERTION_WEAKENING[\s\S]*swallows an error/);
    // A synchronization fix that keeps the assertion intact is accepted.
    assert.doesNotMatch(tryPatch('sync', ['  await page.signIn();', '  await expect(page.banner).toHaveText("Account locked");'], ['  await page.signIn();', '  await page.banner.waitFor({ state: "visible" });', '  await expect(page.banner).toHaveText("Account locked");']), /ASSERTION_WEAKENING/);
  } finally { cleanup(ws); }
});

test('validation from result files only: a regression failure rejects the repair; shared components need regression; original evidence preserved', () => {
  const ws = workspace();
  try {
    const run = failedAutomationRun(ws);
    startHealing(ws, run);
    confirmAutomation(ws, run);
    // Attempt 1 passes its rerun, but breaks TC-LOGIN-004 in the regression run.
    proposeApplied(ws, run, LOCATOR_FIX, HIGH, 1);
    H(ws, run, 'apply', '--test', 'TC-LOGIN-001', '--attempt', '1', '--by', 'QA Lead');
    // A summary that says "fixed" is not a rerun.
    const summary = ws.put(`runs/${run}/execution/RepairSummary-claims.md`, '# Repair Summary\n\nTC-LOGIN-001 fixed.\n');
    assert.match(H(ws, run, 'validate', '--test', 'TC-LOGIN-001', '--attempt', '1', '--rerun', summary, '--by', 'QA Lead').text, /not a results cycle/);
    const rr1 = rerun(ws, run, 1, [['TC-LOGIN-001', 'Passed'], ['TC-LOGIN-004', 'Automation Failure', 'banner helper changed']]);
    assert.equal(H(ws, run, 'validate', '--test', 'TC-LOGIN-001', '--attempt', '1', '--rerun', rr1, '--regression', `TC-LOGIN-004@${rr1}`, '--by', 'QA Lead').code, 0);
    let t = testOf(report(ws, run), 'TC-LOGIN-001');
    assert.equal(t.attempts[0].result, 'regression-failed');
    assert.equal(t.attempts[0].beforeAfter.after, 'Passed');

    // Attempt 2 changes a shared helper: validating it without regression results is incomplete.
    ws.put(PAGE, ORIGINAL_PAGE); // attempt 1 rolled back
    const SHARED = 'modules/login/automation/tests_playwright/shared/waits.ts';
    ws.put(SHARED, 'export const settle = () => page.waitForTimeout(500);\n');
    proposeApplied(ws, run, patch(SHARED, ['export const settle = () => page.waitForTimeout(500);'], ["export const settle = () => page.waitForLoadState('networkidle');"]), HIGH, 2);
    assert.equal(H(ws, run, 'apply', '--test', 'TC-LOGIN-001', '--attempt', '2', '--by', 'QA Lead').code, 0);
    const rr2 = rerun(ws, run, 2, [['TC-LOGIN-001', 'Passed'], ['TC-LOGIN-004', 'Passed']]);
    assert.match(H(ws, run, 'validate', '--test', 'TC-LOGIN-001', '--attempt', '2', '--rerun', rr2, '--by', 'QA Lead').text, /VALIDATION_INCOMPLETE[\s\S]*shared component/);
    // The original failure evidence is never rewritten.
    const orig = ws.read(`runs/${run}/execution/ExecutionResults.md`);
    ws.put(`runs/${run}/execution/ExecutionResults.md`, orig.replace('Automation Failure', 'Passed'));
    assert.match(H(ws, run, 'validate', '--test', 'TC-LOGIN-001', '--attempt', '2', '--rerun', rr2, '--regression', `TC-LOGIN-004@${rr2}`, '--by', 'QA Lead').text, /RESULTS_MODIFIED/);
    ws.put(`runs/${run}/execution/ExecutionResults.md`, orig);
    assert.equal(H(ws, run, 'validate', '--test', 'TC-LOGIN-001', '--attempt', '2', '--rerun', rr2, '--regression', `TC-LOGIN-004@${rr2}`, '--by', 'QA Lead').code, 0);
    t = testOf(report(ws, run), 'TC-LOGIN-001');
    assert.equal(t.attempts[1].result, 'fixed');
    assert.deepEqual(t.attempts[1].sharedComponents, [SHARED]);
    assert.equal(t.finalStatus, 'Automation Repaired');
    // The execution history agrees: Automation Repaired (5H rerun after an Automation Failure), never Passed.
    assert.equal(ws.rm('state', 'outcome', '5H', '--from-results', '--run', run).code, 0);
    const o = ws.meta(run).stages['5H'].outcome;
    assert.equal(o.tests.find((x) => x.testCaseId === 'TC-LOGIN-001').final, 'Automation Repaired');
    assert.equal(o.tests.find((x) => x.testCaseId === 'TC-LOGIN-002').final, 'Application Failure', 'an application defect stays one');
    assert.equal(o.health.application.failures, 1);
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// §7 Knowledge, §8 production, §9 report
// ---------------------------------------------------------------------------------------------

test('knowledge: only a validated repair is promoted, sanitized, with provenance; an unverified one is refused', () => {
  const ws = workspace();
  try {
    const run = failedAutomationRun(ws);
    startHealing(ws, run);
    confirmAutomation(ws, run);
    proposeApplied(ws, run, LOCATOR_FIX, HIGH, 1);
    H(ws, run, 'apply', '--test', 'TC-LOGIN-001', '--attempt', '1', '--by', 'QA Lead');
    const body = 'Replaced #banner with getByTestId. Reproduced with token=sk_live_abc123XYZ, Authorization: Bearer eyJhbGciOiJIUzI1.eyJzdWIiOiIxMjM0.SflKxwRJSMeKKF2QT4\nreported by jane.doe@example.com, +971 50 123 4567';
    assert.match(H(ws, run, 'promote', '--test', 'TC-LOGIN-001', '--attempt', '1', '--title', 'Lock banner locator', '--body', body, '--by', 'QA Lead').text, /UNVERIFIED_KNOWLEDGE/);
    const rr = rerun(ws, run, 1, [['TC-LOGIN-001', 'Passed']]);
    assert.equal(H(ws, run, 'validate', '--test', 'TC-LOGIN-001', '--attempt', '1', '--rerun', rr, '--by', 'QA Lead').code, 0);
    assert.equal(H(ws, run, 'promote', '--test', 'TC-LOGIN-001', '--attempt', '1', '--title', 'Lock banner locator', '--body', body, '--by', 'QA Lead').code, 0);
    const kb = ws.read('knowledge/patterns/repair/REPAIR-001.md');
    for (const secret of ['sk_live_abc123XYZ', 'eyJhbGciOiJIUzI1', 'jane.doe@example.com', '50 123 4567']) assert.ok(!kb.includes(secret), `leaked ${secret}`);
    assert.match(kb, /\[REDACTED:credential\]/);
    assert.match(kb, /\| Status \| Verified — approved by QA Lead \|/);
    assert.match(kb, new RegExp(`\\| Source run \\| \`${run}\` \\|`));
    assert.match(kb, /Validated by \| `runs\/[^`]+ExecutionResults\.rerun-1\.md` \(Passed\)/);
    // API: the sanitizer on its own.
    const s = heal.sanitizeKnowledge('password: hunter2\nCookie: sid=abc\ncard 4111 1111 1111 1111');
    assert.ok(!/hunter2|sid=abc|4111 1111/.test(s.text));
  } finally { cleanup(ws); }
});

test('production: reruns need a named read-only access approval; mutating reruns are refused; read-write access cannot be approved', () => {
  const ws = workspace();
  try {
    const run = failedAutomationRun(ws);
    startHealing(ws, run, { environment: 'Production', tests: 'TC-LOGIN-001' });
    confirmAutomation(ws, run);
    proposeApplied(ws, run, LOCATOR_FIX, HIGH, 1);
    H(ws, run, 'apply', '--test', 'TC-LOGIN-001', '--attempt', '1', '--by', 'QA Lead');
    const rr = rerun(ws, run, 1, [['TC-LOGIN-001', 'Passed']]);
    assert.match(H(ws, run, 'validate', '--test', 'TC-LOGIN-001', '--attempt', '1', '--rerun', rr, '--by', 'QA Lead').text, /PRODUCTION_ACCESS_REQUIRED/);
    assert.match(H(ws, run, 'prod-access', '--scope', 'login page, read-only', '--by', 'Ops Lead').text, /PRODUCTION_WRITE_REFUSED/);
    assert.equal(H(ws, run, 'prod-access', '--scope', 'login page, read-only', '--read-only', '--by', 'Ops Lead').code, 0);
    assert.match(H(ws, run, 'validate', '--test', 'TC-LOGIN-001', '--attempt', '1', '--rerun', rr, '--mutating', '--by', 'QA Lead').text, /PRODUCTION_WRITE_REFUSED/);
    assert.equal(H(ws, run, 'validate', '--test', 'TC-LOGIN-001', '--attempt', '1', '--rerun', rr, '--by', 'QA Lead').code, 0);
    assert.equal(report(ws, run).environment, 'Production');
  } finally { cleanup(ws); }
});

test('report: classification, attempts, confidence evidence, files, before/after, regression, human decisions, final status', () => {
  const ws = workspace();
  try {
    const run = failedAutomationRun(ws);
    startHealing(ws, run);
    confirmAutomation(ws, run);
    proposeApplied(ws, run, LOCATOR_FIX, HIGH, 1);
    H(ws, run, 'apply', '--test', 'TC-LOGIN-001', '--attempt', '1', '--restore-point', 'abc1234', '--by', 'QA Lead');
    const rr = rerun(ws, run, 1, [['TC-LOGIN-001', 'Passed'], ['TC-LOGIN-004', 'Passed']]);
    H(ws, run, 'validate', '--test', 'TC-LOGIN-001', '--attempt', '1', '--rerun', rr, '--regression', `TC-LOGIN-004@${rr}`, '--by', 'QA Lead');
    assert.equal(H(ws, run, 'close', '--by', 'QA Lead').code, 0);
    const rep = report(ws, run);
    const t = testOf(rep, 'TC-LOGIN-001');
    assert.equal(rep.status, 'closed');
    assert.equal(t.classification.class, 'automation');
    assert.equal(t.attempts[0].confidence.band, 'High');
    assert.ok(t.attempts[0].confidence.factors.every((f) => f.citation));
    assert.deepEqual(t.attempts[0].filesChanged, [PAGE]);
    assert.deepEqual(t.attempts[0].beforeAfter, { before: 'Automation Failure', after: 'Passed', rerun: rr });
    assert.deepEqual(t.attempts[0].regression.map((r) => [r.testCaseId, r.status]), [['TC-LOGIN-004', 'Passed']]);
    assert.equal(t.attempts[0].applied.restorePoint, 'abc1234');
    assert.deepEqual(rep.decisions.map((d) => d.decision), ['opened', 'classified', 'proposed', 'batch-approved', 'applied', 'validated', 'closed']);
    assert.equal(t.finalStatus, 'Automation Repaired');
    const text = H(ws, run, 'report').text;
    assert.match(text, /TC-LOGIN-001 {2}recorded Automation Failure · class automation \(confirmed\) · Automation Repaired/);
    assert.match(text, /before Automation Failure → after Passed/);
  } finally { cleanup(ws); }
});
