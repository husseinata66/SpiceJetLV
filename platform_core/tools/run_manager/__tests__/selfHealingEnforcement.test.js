// Phase 6.1 — Self-Healing enforcement hardening: the cumulative attempt limit and quarantine, applied-
// patch verification, classification evidence, environment verification, and shared-component impact.
// Real CLIs against disposable data roots (healFixture.js), plus the public API.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const heal = require('../repairGovernance');
const F = require('./healFixture');

const { H } = F;

// ---------------------------------------------------------------------------------------------
// 1. Cumulative attempt limit and quarantine
// ---------------------------------------------------------------------------------------------

test('three failed attempts across separate operations, with an interruption between them, quarantine the test; a fourth is refused', () => {
  const ws = F.workspace();
  try {
    const run = F.failedAutomationRun(ws);
    F.startHealing(ws, run);
    F.confirmAutomation(ws, run);
    F.failedAttempt(ws, run, 1, 1);
    F.failedAttempt(ws, run, 2, 2);
    assert.equal(H(ws, run, 'close', '--by', 'QA Lead').code, 0);
    // The session is interrupted; a human recovers the stage and opens a NEW operation.
    assert.equal(ws.rm('state', 'recover', '5H', '--by', 'QA Lead', '--reason', 'session closed', '--run', run).code, 0);
    assert.equal(ws.rm('state', 'start', '5H', '--invocation', 'Direct', '--by', 'QA Lead', '--run', run).code, 0);
    F.startHealing(ws, run, { start: false });
    F.confirmAutomation(ws, run);
    let rep = F.report(ws, run);
    assert.deepEqual(rep[1].tests[0].cumulative, { counted: 2, of: 3, unsuccessful: 2, windowStart: null, quarantined: false }, 'a new operation does not reset the count');
    F.failedAttempt(ws, run, 1, 3);
    // Quarantined at the third unsuccessful attempt — recorded on the run, with every attempt.
    const q = ws.meta(run).stages['5H'].repairQuarantine;
    assert.equal(q.length, 1);
    assert.deepEqual(q[0].attempts, ['RO-1#1 remaining', 'RO-1#2 remaining', 'RO-2#1 remaining']);
    const fourth = F.propose(ws, run, F.LOCATOR_FIX, 'attempt-4');
    assert.match(fourth.text, /QUARANTINED/);
    rep = F.report(ws, run);
    assert.equal(rep[1].tests[0].finalStatus, 'Quarantined — attempt limit reached');
    assert.equal(rep[0].tests[0].attempts.length + rep[1].tests[0].attempts.length, 3, 'the full history is kept');
    // Quarantine persists into a further operation in the same run — it is never reset silently.
    assert.equal(H(ws, run, 'close', '--by', 'QA Lead').code, 0);
    F.startHealing(ws, run, { start: false });
    F.confirmAutomation(ws, run);
    assert.match(F.propose(ws, run, F.LOCATOR_FIX, 'attempt-5').text, /QUARANTINED/);
  } finally { F.cleanup(ws); }
});

test('a new run inherits the count and the quarantine; a fresh budget is only a named, checked grant (new-run / changed-failure)', () => {
  const ws = F.workspace();
  try {
    const run1 = F.failedAutomationRun(ws);
    F.startHealing(ws, run1);
    F.confirmAutomation(ws, run1);
    for (let n = 1; n <= 3; n += 1) F.failedAttempt(ws, run1, n, n);
    assert.equal(H(ws, run1, 'close', '--by', 'QA Lead').code, 0);

    // A new run of the same module: still quarantined — nothing resets because the run is new.
    const run2 = F.laterRun(ws);
    F.startHealing(ws, run2);
    F.confirmAutomation(ws, run2);
    assert.match(F.propose(ws, run2, F.LOCATOR_FIX, 'r2-a1').text, /QUARANTINED[\s\S]*grant-budget/);
    // "changed-failure" is refused: the failure is the same one (same status and reason).
    assert.match(H(ws, run2, 'grant-budget', '--test', 'TC-LOGIN-001', '--basis', 'changed-failure', '--reason', 'r', '--by', 'QA Lead').text, /CHANGED_FAILURE_REQUIRED/);
    // A grant needs a name and a reason.
    assert.match(H(ws, run2, 'grant-budget', '--test', 'TC-LOGIN-001', '--basis', 'new-run', '--reason', 'r').text, /MISSING_FIELD/);
    // "new-run" is checked: every counted attempt was in another run.
    assert.equal(H(ws, run2, 'grant-budget', '--test', 'TC-LOGIN-001', '--basis', 'new-run', '--reason', 'the login page was rebuilt (release 4.2)', '--by', 'QA Lead').code, 0);
    assert.equal(F.propose(ws, run2, F.LOCATOR_FIX, 'r2-a1').code, 0);
    const t = F.report(ws, run2)[0].tests[0];
    assert.deepEqual([t.cumulative.counted, t.cumulative.quarantined], [1, false]);
    // The earlier record is intact: run 1's quarantine and attempts are untouched.
    assert.equal(ws.meta(run1).stages['5H'].repairQuarantine.length, 1);
    const g = ws.meta(run2).stages['5H'].repairBudgetGrants[0];
    assert.deepEqual([g.basis, g.by, g.supersedes.length, Boolean(g.afterQuarantine)], ['new-run', 'QA Lead', 3, true]);
  } finally { F.cleanup(ws); }
});

test('changed failure fingerprint: a different failure in the same run may be given a fresh budget by a named human', () => {
  const ws = F.workspace();
  try {
    const run = F.failedAutomationRun(ws);
    F.startHealing(ws, run);
    F.confirmAutomation(ws, run);
    for (let n = 1; n <= 3; n += 1) F.failedAttempt(ws, run, n, n);
    assert.equal(H(ws, run, 'close', '--by', 'QA Lead').code, 0);
    // The 5H outcome now records a DIFFERENT failure for the test (the reruns' "lock-banner not found either").
    assert.equal(ws.rm('state', 'outcome', '5H', '--from-results', '--run', run).code, 0);
    F.startHealing(ws, run, { start: false });
    F.confirmAutomation(ws, run);
    assert.match(H(ws, run, 'grant-budget', '--test', 'TC-LOGIN-001', '--basis', 'new-run', '--reason', 'r', '--by', 'QA Lead').text, /NEW_RUN_REQUIRED/);
    assert.equal(H(ws, run, 'grant-budget', '--test', 'TC-LOGIN-001', '--basis', 'changed-failure', '--reason', 'a different locator now fails', '--by', 'QA Lead').code, 0);
    assert.equal(F.propose(ws, run, F.LOCATOR_FIX, 'after-grant').code, 0);
  } finally { F.cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// 2. Applied patch verification
// ---------------------------------------------------------------------------------------------

test('applied-patch verification: not applied, partially applied, a different change, unexpected files — all refused; a verified one is recorded with fingerprints', () => {
  const ws = F.workspace();
  try {
    const run = F.failedAutomationRun(ws);
    F.startHealing(ws, run);
    F.confirmAutomation(ws, run);
    const HELPER = 'modules/login/automation/tests_playwright/pages/BannerHelper.ts';
    ws.put(HELPER, "export const bannerId = '#banner';\n");
    const two = `${F.LOCATOR_FIX}${F.patch(HELPER, ["export const bannerId = '#banner';"], ["export const bannerId = 'lock-banner';"])}`;
    assert.equal(F.propose(ws, run, two, 'two-files').code, 0);
    assert.equal(H(ws, run, 'batch-approve', '--by', 'QA Lead').code, 0);
    const apply = () => H(ws, run, 'apply', '--test', 'TC-LOGIN-001', '--attempt', '1', '--by', 'QA Lead').text;
    // Nothing applied yet.
    assert.match(apply(), /PATCH_NOT_APPLIED/);
    // Only one of the two files.
    F.applyOnDisk(ws, F.LOCATOR_FIX);
    assert.match(apply(), /PATCH_PARTIAL[\s\S]*BannerHelper\.ts/);
    // A different change than the approved one.
    ws.put(HELPER, "export const bannerId = 'something-else';\n");
    assert.match(apply(), /PATCH_MISMATCH[\s\S]*BannerHelper\.ts/);
    // The approved change, plus a file the patch never named.
    ws.put(HELPER, "export const bannerId = 'lock-banner';\n");
    ws.put('modules/login/automation/tests_playwright/tests/login.spec.ts', 'test.skip("x", () => {});\n');
    assert.match(apply(), /UNEXPECTED_CHANGES[\s\S]*login\.spec\.ts/);
    fs.rmSync(path.join(ws.root, 'modules/login/automation/tests_playwright/tests/login.spec.ts'));
    // Exactly the approved patch: verified, with before/after fingerprints and the preserved original.
    assert.equal(H(ws, run, 'apply', '--test', 'TC-LOGIN-001', '--attempt', '1', '--by', 'QA Lead').code, 0);
    const a = F.report(ws, run)[0].tests[0].attempts[0];
    assert.equal(a.applied.verified, true);
    assert.equal(a.applied.files.length, 2);
    for (const f of a.applied.files) {
      assert.match(f.before, /^[0-9a-f]{64}$/);
      assert.notEqual(f.before, f.after);
      assert.equal(fs.readFileSync(path.join(ws.root, f.original), 'utf8').length > 0, true, 'the original is kept');
    }
    assert.equal(fs.readFileSync(path.join(ws.root, a.applied.files.find((f) => f.path === F.PAGE).original), 'utf8'), F.ORIGINAL_PAGE);
    // Changed again after verification: validation is refused.
    ws.put(F.PAGE, `${ws.read(F.PAGE)}// tweak\n`);
    const rr = F.rerun(ws, run, 1, [['TC-LOGIN-001', 'Passed']]);
    assert.match(H(ws, run, 'validate', '--test', 'TC-LOGIN-001', '--attempt', '1', '--rerun', rr, '--by', 'QA Lead').text, /PATCH_CHANGED_AFTER_APPLY/);
  } finally { F.cleanup(ws); }
});

test('a patch that does not apply to the files on disk, or touches a protected path, is refused at proposal', () => {
  const ws = F.workspace();
  try {
    const run = F.failedAutomationRun(ws);
    F.startHealing(ws, run);
    F.confirmAutomation(ws, run);
    assert.match(F.propose(ws, run, F.patch(F.PAGE, ['  a line that is not there'], ['  x']), 'stale').text, /PATCH_DOES_NOT_APPLY/);
    assert.match(F.propose(ws, run, F.patch('modules/login/test_design/TestCases_login.md', ['**Expected Result:** The banner reads "Account locked".'], ['**Expected Result:** The banner is shown.']), 'tc').text, /PROTECTED_BOUNDARY/);
    assert.match(F.propose(ws, run, F.patch('knowledge_base/execution_safety_policy.json', ['x'], ['y']), 'cfg').text, /PROTECTED_BOUNDARY/);
  } finally { F.cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// 3. Classification evidence, 4. environment
// ---------------------------------------------------------------------------------------------

test('classification evidence: free text, or a cited file that is not in the run, is refused; the recorded class is kept beside the new one', () => {
  const ws = F.workspace();
  try {
    const run = F.failedAutomationRun(ws);
    F.startHealing(ws, run, { tests: 'TC-LOGIN-001,TC-LOGIN-003' });
    const c = (cls, ev) => H(ws, run, 'classify', '--test', 'TC-LOGIN-001', '--class', cls, '--evidence', ev, '--by', 'QA Lead').text;
    assert.match(c('automation', 'the locator obviously changed'), /EVIDENCE_REQUIRED[\s\S]*names none/);
    assert.match(c('automation', 'execution/artifacts/dom-missing.html shows it'), /EVIDENCE_REQUIRED[\s\S]*missing/);
    assert.match(c('automation', '../../outside.log'), /EVIDENCE_REQUIRED[\s\S]*traversal/);
    F.confirmAutomation(ws, run);
    const cls = F.report(ws, run)[0].tests[0].classification;
    assert.equal(cls.previous.class, 'automation');
    assert.equal(cls.previous.source, 'recorded 5A status');
    assert.match(cls.evidenceFiles[0].sha256, /^[0-9a-f]{64}$/);
    // Unsupported: an Inconclusive (unknown) may be classified; an Application Failure may not become an environment failure here.
    const t3 = H(ws, run, 'classify', '--test', 'TC-LOGIN-003', '--class', 'environment', '--evidence', 'execution/artifacts/trace-tc1.zip: service 503', '--by', 'QA Lead');
    assert.equal(t3.code, 0, t3.text);
  } finally { F.cleanup(ws); }
  const ws2 = F.workspace();
  try {
    const run = F.failedAutomationRun(ws2);
    F.startHealing(ws2, run, { tests: 'TC-LOGIN-002' });
    assert.match(H(ws2, run, 'classify', '--test', 'TC-LOGIN-002', '--class', 'environment', '--evidence', 'execution/artifacts/trace-tc1.zip', '--by', 'QA Lead').text, /RECLASSIFICATION_REFUSED/);
  } finally { F.cleanup(ws2); }
});

test('environment: verified against the Run Configuration and the Project Context; unknown or inconsistent is restricted like production', () => {
  // The declared environment agrees with the Run Configuration: not restricted.
  let ws = F.workspace({ environment: 'Staging' });
  try {
    const run = F.failedAutomationRun(ws);
    F.startHealing(ws, run, { environment: 'Staging' });
    F.confirmAutomation(ws, run);
    assert.deepEqual([F.report(ws, run)[0].environmentCheck.status, F.report(ws, run)[0].environmentCheck.restricted], ['verified', false]);
    F.propose(ws, run, F.LOCATOR_FIX, 'a1'); H(ws, run, 'batch-approve', '--by', 'QA Lead'); F.applyOnDisk(ws, F.LOCATOR_FIX);
    H(ws, run, 'apply', '--test', 'TC-LOGIN-001', '--attempt', '1', '--by', 'QA Lead');
    const rr = F.rerun(ws, run, 1, [['TC-LOGIN-001', 'Passed']]);
    assert.equal(H(ws, run, 'validate', '--test', 'TC-LOGIN-001', '--attempt', '1', '--rerun', rr, '--by', 'QA Lead').code, 0);
  } finally { F.cleanup(ws); }

  // Declared QA, configured Staging: inconsistent — restricted; reruns need read-only approval; writes refused.
  ws = F.workspace({ environment: 'Staging' });
  try {
    const run = F.failedAutomationRun(ws);
    F.startHealing(ws, run, { environment: 'QA' });
    F.confirmAutomation(ws, run);
    const chk = F.report(ws, run)[0].environmentCheck;
    assert.deepEqual([chk.status, chk.restricted, chk.sources[0].environment], ['inconsistent', true, 'Staging']);
    F.propose(ws, run, F.LOCATOR_FIX, 'a1'); H(ws, run, 'batch-approve', '--by', 'QA Lead'); F.applyOnDisk(ws, F.LOCATOR_FIX);
    H(ws, run, 'apply', '--test', 'TC-LOGIN-001', '--attempt', '1', '--by', 'QA Lead');
    const rr = F.rerun(ws, run, 1, [['TC-LOGIN-001', 'Passed']]);
    assert.match(H(ws, run, 'validate', '--test', 'TC-LOGIN-001', '--attempt', '1', '--rerun', rr, '--by', 'QA Lead').text, /PRODUCTION_ACCESS_REQUIRED[\s\S]*inconsistent/);
    assert.match(H(ws, run, 'validate', '--test', 'TC-LOGIN-001', '--attempt', '1', '--rerun', rr, '--mutating', '--by', 'QA Lead').text, /PRODUCTION_WRITE_REFUSED/);
  } finally { F.cleanup(ws); }

  // No Run Configuration at all, and a Project Context naming Production: restricted either way.
  ws = F.workspace({ environment: null });
  try {
    const run = F.failedAutomationRun(ws);
    F.startHealing(ws, run, { environment: 'QA' });
    assert.deepEqual([F.report(ws, run)[0].environmentCheck.status, F.report(ws, run)[0].environmentCheck.restricted], ['unverified', true]);
    // API: a Project Context environment class is a source; a URL is not.
    const meta = ws.meta(run);
    ws.put('modules/login/context/ProjectContext.md', `${ws.read('modules/login/context/ProjectContext.md')}| Environment | Production |\n`);
    assert.equal(heal.verifyEnvironment(ws.root, meta, 'QA').status, 'inconsistent');
    ws.put('modules/login/context/ProjectContext.md', '# PC\n\n| Field | Value |\n|---|---|\n| Target Environment | https://qa.example.test |\n| Status | Approved |\n');
    assert.equal(heal.verifyEnvironment(ws.root, meta, 'QA').status, 'unverified');
  } finally { F.cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// 5. Shared components
// ---------------------------------------------------------------------------------------------

test('shared components from the baseline ownership manifest: another module\'s code refused; a shared change needs full regression, and a regression failure rejects it', () => {
  const ws = F.workspace();
  try {
    const run = F.failedAutomationRun(ws);
    const BASE = 'automation_baseline/playwright/tests_playwright';
    ws.put(`${BASE}/.baseline_ownership.json`, JSON.stringify({ schemaVersion: 1, modules: { login: { owned: ['pages/login/**'] }, branch: { owned: ['pages/branch/**'] } }, shared: ['lib/session.ts'] }));
    ws.put(`${BASE}/lib/session.ts`, 'export const timeoutMs = 5000;\n');
    ws.put(`${BASE}/pages/branch/BranchPage.ts`, 'export const x = 1;\n');
    F.startHealing(ws, run);
    F.confirmAutomation(ws, run);
    // Another module's code — refused by the manifest, not by a folder name.
    assert.match(F.propose(ws, run, F.patch(`${BASE}/pages/branch/BranchPage.ts`, ['export const x = 1;'], ['export const x = 2;']), 'foreign').text, /PROTECTED_BOUNDARY[\s\S]*owned by branch/);
    // A shared file the folder-name rule would not recognize: the manifest says it is shared.
    const SHARED_FIX = F.patch(`${BASE}/lib/session.ts`, ['export const timeoutMs = 5000;'], ["export const waitFor = 'networkidle';", 'export const timeoutMs = 5000;']);
    assert.equal(F.propose(ws, run, SHARED_FIX, 'shared').code, 0);
    H(ws, run, 'batch-approve', '--by', 'QA Lead');
    F.applyOnDisk(ws, SHARED_FIX);
    assert.equal(H(ws, run, 'apply', '--test', 'TC-LOGIN-001', '--attempt', '1', '--by', 'QA Lead').code, 0);
    const a = F.report(ws, run)[0].tests[0].attempts[0];
    assert.deepEqual(a.sharedBy, [{ path: `${BASE}/lib/session.ts`, by: 'baseline ownership manifest' }]);
    // Only the repaired test rerun: not enough — every test that passed before (TC-LOGIN-004) is required.
    const rr = F.rerun(ws, run, 1, [['TC-LOGIN-001', 'Passed'], ['TC-LOGIN-004', 'Environment Failure', 'session timed out']]);
    assert.match(H(ws, run, 'validate', '--test', 'TC-LOGIN-001', '--attempt', '1', '--rerun', rr, '--by', 'QA Lead').text, /VALIDATION_INCOMPLETE[\s\S]*missing: TC-LOGIN-004/);
    // With it: the regression failure rejects the repair.
    assert.equal(H(ws, run, 'validate', '--test', 'TC-LOGIN-001', '--attempt', '1', '--rerun', rr, '--regression', `TC-LOGIN-004@${rr}`, '--by', 'QA Lead').code, 0);
    const v = F.report(ws, run)[0].tests[0].attempts[0];
    assert.equal(v.result, 'regression-failed');
    assert.deepEqual(v.regression.map((r) => [r.testCaseId, r.status]), [['TC-LOGIN-004', 'Environment Failure']]);
  } finally { F.cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Phase 6.2 — gaps found by end-to-end validation with a real suite
// ---------------------------------------------------------------------------------------------

test('weakening through a custom assertion helper: a fallback that returns the approved value, or a catch that never rethrows, is refused', () => {
  const file = 'modules/login/automation/tests_node/pages/LoginPage.js';
  const fallback = heal.parsePatch(F.patch(file, ["  if (!m) throw new LocatorNotFound('#banner');"], ['  try {', "    if (!m) throw new LocatorNotFound('#banner');", '  } catch (e) {', "    return 'Account locked';", '  }']));
  const reasons = heal.weakeningOf(fallback, ['Account locked']);
  assert.ok(reasons.some((r) => /writes the approved expected value "Account locked"/.test(r)), reasons.join(' | '));
  assert.ok(reasons.some((r) => /adds an error handler that does not rethrow/.test(r)), reasons.join(' | '));
  // A handler that rethrows, and a locator change that leaves the approved value alone, are fine.
  const rethrow = heal.parsePatch(F.patch(file, ['  await page.click(sel);'], ['  try {', '    await page.click(sel);', '  } catch (e) {', "    throw new Error('click failed: ' + e.message);", '  }']));
  assert.deepEqual(heal.weakeningOf(rethrow, ['Account locked']), []);
  const locator = heal.parsePatch(F.patch(file, ['  const m = html.match(/<div id="banner"[^>]*>([^<]*)</);'], ['  const m = html.match(/<div data-testid="lock-banner"[^>]*>([^<]*)</);']));
  assert.deepEqual(heal.weakeningOf(locator, ['Account locked']), []);
});

test('evidence references: test-runner output formats (TAP, JSONL, TRX) are recognised as files', () => {
  const { extractEvidenceRefs } = require('../assertionEvidence');
  assert.deepEqual(extractEvidenceRefs('execution/artifacts/cycle-1.tap shows LOCATOR_NOT_FOUND; log execution/artifacts/cycle-1.assertions.jsonl; results/run.trx'),
    ['execution/artifacts/cycle-1.tap', 'execution/artifacts/cycle-1.assertions.jsonl', 'results/run.trx']);
});
