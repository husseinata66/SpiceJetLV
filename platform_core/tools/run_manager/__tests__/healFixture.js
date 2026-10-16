// Test helper — a real automation run (1 → 2 → 3 → 4A → 5A) whose 5A recorded an automation failure, an
// application failure, an inconclusive result and a pass, driven through the real CLIs against a
// disposable data root; plus the human steps of a Stage 5H pass. Not a test file (no `.test.js`).
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const repairPatch = require('../repairPatch');

const TOOLS = path.resolve(__dirname, '..', '..');
const RM = path.join(TOOLS, 'run_manager', 'cli.js');
const MM = path.join(TOOLS, 'module_manager', 'cli.js');

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
const ORIGINAL_PAGE = "export class LoginPage {\n  readonly banner = this.page.locator('#banner');\n}\n";
const patch = (file, removed, added) => `--- a/${file}\n+++ b/${file}\n@@ -1,1 +1,1 @@\n${removed.map((l) => `-${l}`).join('\n')}\n${added.map((l) => `+${l}`).join('\n')}\n`;
const LOCATOR_FIX = patch(PAGE, ["  readonly banner = this.page.locator('#banner');"], ["  readonly banner = this.page.getByTestId('lock-banner');"]);
const HIGH = 'observed-root-cause:60:execution/artifacts/trace-tc1.zip;targets-root-cause:15:the locator is the failing step in the trace;reproduced:10:cycle 1 and a local rerun;static-check:5:tsc --noEmit clean';

function workspace({ environment = 'QA' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'heal61-'));
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
  if (environment) ws.put('knowledge_base/execution_safety_policy.json', JSON.stringify({ policyId: 'fixture', environment, environmentAliases: [] }));
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
const newRun = (ws) => ws.rm('new', '--scope', 'Module', '--target', 'Login', '--modules', 'login', '--no-activate').text.match(/Created (\S+)/)[1];
function recordExecution(ws, run, rows) {
  assert.equal(ws.rm('state', 'start', '5A', '--invocation', 'Pipeline', '--run', run).code, 0);
  const ER = ws.put(`runs/${run}/execution/ExecutionResults.md`, results(rows));
  ws.put(`runs/${run}/execution/artifacts/trace-tc1.zip`, 'trace');
  ws.rm('state', 'artifact', '5A', '--artifacts', ER, '--run', run);
  assert.equal(ws.rm('state', 'outcome', '5A', '--from-results', '--run', run).code, 0);
  assert.equal(ws.rm('state', 'complete', '5A', '--run', run).code, 0);
}
const FAILURES = [['TC-LOGIN-001', 'Automation Failure', 'locator #banner not found'], ['TC-LOGIN-002', 'Application Failure', 'link accepted after expiry'], ['TC-LOGIN-003', 'Inconclusive', 'status cell empty'], ['TC-LOGIN-004', 'Passed']];
/** Through 5A, with the failures above. */
function failedAutomationRun(ws) {
  const run = newRun(ws);
  ws.rm('state', 'workflow', 'full-automation', '--by', 'Lead', '--run', run);
  checkpoint(ws, run, '1', [['modules/login/context/ProjectContext.md', header('Project Context', 'Pending Review')]]);
  checkpoint(ws, run, '2', [['modules/login/discovery/QA_Assessment_Report.md', header('QA Assessment', 'Pending Review')]]);
  checkpoint(ws, run, '3', [['modules/login/test_design/TestCases_login.md', suite('Pending Review')], ['modules/login/test_design/TraceabilityMatrix.md', matrix('Pending Review')]]);
  assert.equal(ws.rm('state', 'start', '4A', '--invocation', 'Pipeline', '--run', run).code, 0);
  ws.put('modules/login/automation/AutomationPlan_Playwright.md', header('Automation Plan', 'Pending Review'));
  ws.put(PAGE, ORIGINAL_PAGE);
  ws.mm('automation', 'login', '--state', 'Generated', '--by', 'agent');
  ws.rm('state', 'request-approval', '4A', '--artifacts', 'modules/login/automation/AutomationPlan_Playwright.md', '--run', run);
  flip(ws, 'modules/login/automation/AutomationPlan_Playwright.md');
  ws.mm('automation', 'login', '--state', 'Approved', '--by', 'Automation Lead');
  assert.equal(ws.rm('state', 'approve', '4A', '--approved-by', 'Automation Lead', '--run', run).code, 0);
  recordExecution(ws, run, FAILURES);
  return run;
}
/** A later run of the same module, executing the same approved automation (5A through its gate). */
function laterRun(ws, rows = FAILURES) {
  const run = newRun(ws);
  recordExecution(ws, run, rows);
  return run;
}
const H = (ws, run, ...args) => ws.rm('state', 'heal', ...args, '--run', run);
function startHealing(ws, run, { environment = 'QA', tests = 'TC-LOGIN-001', start = true } = {}) {
  if (start) assert.equal(ws.rm('state', 'start', '5H', '--invocation', 'Direct', '--by', 'QA Lead', '--run', run).code, 0);
  const o = H(ws, run, 'open', '--tests', tests, '--environment', environment, '--reason', 'locator drift after the UI release', '--by', 'QA Lead');
  assert.equal(o.code, 0, o.text);
}
const confirmAutomation = (ws, run) => {
  const r = H(ws, run, 'classify', '--test', 'TC-LOGIN-001', '--class', 'automation', '--evidence', 'execution/artifacts/trace-tc1.zip: #banner absent, data-testid=lock-banner present', '--by', 'QA Lead');
  assert.equal(r.code, 0, r.text);
};
/** What a human does between approval and `heal apply`: write the approved patch to the files. */
function applyOnDisk(ws, patchText) {
  for (const file of repairPatch.parseUnifiedDiff(patchText)) {
    const abs = path.join(ws.root, file.path);
    const before = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
    const after = repairPatch.applyHunks(before, file);
    if (after === null) fs.rmSync(abs); else { fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, after); }
  }
}
/** A 5H rerun file, registered as a 5H artifact. */
function rerun(ws, run, n, rows) {
  const rel = ws.put(`runs/${run}/execution/ExecutionResults.rerun-${n}.md`, results(rows));
  ws.rm('state', 'artifact', '5H', '--artifacts', rel, '--kind', 'output', '--run', run);
  return rel;
}
/** Proposed and batch-approved; not applied. */
function propose(ws, run, patchText, name, { test = 'TC-LOGIN-001' } = {}) {
  const p = ws.put(`runs/${run}/self_healing/${name}.diff`, patchText);
  const r = H(ws, run, 'propose', '--root-cause-confidence', 'High', '--test', test, '--strategy', 'replace the stale locator', '--reason', 'the trace shows #banner absent', '--patch', p, '--factors', HIGH, '--by', 'QA Lead');
  return r;
}
/** One complete unsuccessful attempt: propose, approve, apply on disk, verify, rerun still failing, roll back. */
function failedAttempt(ws, run, n, rerunN) {
  const r = propose(ws, run, LOCATOR_FIX, `attempt-${rerunN}`);
  assert.equal(r.code, 0, r.text);
  assert.equal(H(ws, run, 'batch-approve', '--by', 'QA Lead').code, 0);
  applyOnDisk(ws, LOCATOR_FIX);
  assert.equal(H(ws, run, 'apply', '--test', 'TC-LOGIN-001', '--attempt', String(n), '--by', 'QA Lead').code, 0);
  const rr = rerun(ws, run, rerunN, [['TC-LOGIN-001', 'Automation Failure', 'lock-banner not found either']]);
  const v = H(ws, run, 'validate', '--test', 'TC-LOGIN-001', '--attempt', String(n), '--rerun', rr, '--by', 'QA Lead');
  assert.equal(v.code, 0, v.text);
  ws.put(PAGE, ORIGINAL_PAGE); // rolled back to the restore point
}
const report = (ws, run) => JSON.parse(H(ws, run, 'report', '--json').out);

module.exports = {
  TOOLS, header, patch, PAGE, ORIGINAL_PAGE, LOCATOR_FIX, HIGH, results,
  workspace, cleanup, failedAutomationRun, laterRun, startHealing, confirmAutomation, applyOnDisk, rerun, propose, failedAttempt, H, report,
};
