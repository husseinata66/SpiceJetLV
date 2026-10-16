// Self-Healing E2E fixture: a disposable application, a REAL automation suite (node:test) against
// it, and a runner that executes the suite and writes 5A/5H results files from what actually ran.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// ---------------------------------------------------------------------------------------------
// The application under test — disposable, outside the data root. TC-LOGIN-002 hits a REAL defect:
// an expired reset link is accepted (200) instead of rejected (410).
// ---------------------------------------------------------------------------------------------
const APP = `// Disposable "login" application under test.
exports.renderLocked = () => '<main><div data-testid="lock-banner" class="banner">Account locked</div></main>';
exports.resetLinkStatus = (ageMinutes) => (ageMinutes > 3000 ? 410 : 200); // DEFECT: should expire after 30 minutes
exports.accountStatus = (failures) => (failures >= 5 ? 'Locked' : 'Active');
exports.sessionTimeoutMinutes = () => 30;
`;

// ---------------------------------------------------------------------------------------------
// The automation suite — lives in the module's automation working copy (what 5H may repair).
// Every check is recorded to the framework's assertion log (ASSERT_LOG), the source of the results'
// assertion records. The LoginPage locator is stale: the app renders data-testid="lock-banner".
// ---------------------------------------------------------------------------------------------
const SUITE = {
  'support/check.js': `// Records each assertion (the framework's assertion log), then asserts it.
const fs = require('fs');
const assert = require('node:assert/strict');
exports.check = (tc, id, expected, actual, how = 'equals') => {
  const ok = how === 'equals' ? actual === expected : String(actual).includes(String(expected));
  fs.appendFileSync(process.env.ASSERT_LOG, JSON.stringify({ tc, id, expected, actual, check: how, result: ok ? 'pass' : 'fail' }) + '\\n');
  if (how === 'equals') assert.equal(actual, expected); else assert.ok(ok, \`\${actual} does not contain \${expected}\`);
};
`,
  'support/session.js': `// Shared helper: used by more than one test.
exports.minutesToMs = (m) => m * 60 * 1000;
exports.fromMs = (ms) => ms / 60000;
`,
  'pages/LoginPage.js': `const app = require(process.env.APP_PATH);
class LocatorNotFound extends Error { constructor(sel) { super('locator ' + sel + ' not found'); this.code = 'LOCATOR_NOT_FOUND'; } }
exports.LocatorNotFound = LocatorNotFound;
exports.bannerText = () => {
  const html = app.renderLocked();
  const m = html.match(/<div id="banner"[^>]*>([^<]*)</);
  if (!m) throw new LocatorNotFound('#banner');
  return m[1];
};
`,
  'tests/login.test.js': `const test = require('node:test');
const app = require(process.env.APP_PATH);
const { check } = require('../support/check');
const { bannerText } = require('../pages/LoginPage');
const session = require('../support/session');
const only = (process.env.TESTS || '').split(',').filter(Boolean);
const t = (id, fn) => test(id, { skip: Boolean(only.length && !only.includes(id)) }, fn);

t('TC-LOGIN-001', () => { check('TC-LOGIN-001', 'A1', 'Account locked', bannerText()); });
t('TC-LOGIN-002', () => { check('TC-LOGIN-002', 'A1', 410, app.resetLinkStatus(31)); });
t('TC-LOGIN-003', () => { check('TC-LOGIN-003', 'A1', 'Locked', app.accountStatus(5)); });
t('TC-LOGIN-004', () => { check('TC-LOGIN-004', 'A1', 30, session.fromMs(session.minutesToMs(app.sessionTimeoutMinutes()))); });
`,
};

/** The approved Stage 3 suite (structured assertions) for these four cases. */
const CASES = [
  ['TC-LOGIN-001', 'The lock banner reads "Account locked".', 'A1', '`Account locked`', 'AC-1'],
  ['TC-LOGIN-002', 'An expired reset link (31 minutes) is rejected with HTTP `410`.', 'A1', '`410`', 'AC-2'],
  ['TC-LOGIN-003', 'After five failures the account status is `Locked`.', 'A1', '`Locked`', 'AC-3'],
  ['TC-LOGIN-004', 'The session times out after `30` minutes.', 'A1', '`30`', 'AC-4'],
];
const header = (title, status) => `# ${title}\n\n| Field | Value |\n|---|---|\n| Status | ${status} |\n`;
const suiteMd = (status) => `${header('Test Cases — login', status)}\n## Test Cases\n\n${CASES.map(([id, exp, aid, val, req]) => `### ${id} — ${id}\n\n**Objective:** o.\n\n**Preconditions:** p.\n\n**Test Data:** None.\n\n**Steps:**\n\n1. s.\n\n**Expected Result:** ${exp}\n\n**Assertions:**\n\n| Assertion ID | Expected | Expected Source | Check | Requirement |\n|---|---|---|---|---|\n| ${aid} | ${val} | Expected Result | equals | ${req} |\n\n**Priority:** P1\n\n**Tags:** Atomic\n\n**Review:** Approved\n\n**Automation:** Approved\n`).join('\n')}`;
const matrixMd = (status) => `${header('Traceability Matrix — login', status)}\n| Test Case ID | Requirement Reference | Discovery Reference | Finding Reference | Evidence Reference | Acceptance Criteria Reference | Run Scope Reference | Risk Level | Risk Statement | Validation Status |\n|---|---|---|---|---|---|---|---|---|---|\n${CASES.map(([id, , , , req]) => `| ${id} | PC §3 / ${req} | N/A | N/A | N/A | N/A | Module | Medium | r | Traced |`).join('\n')}\n`;

const AUTO = 'modules/login/automation/tests_node';

// ---------------------------------------------------------------------------------------------
// The runner — the 5A executor's role: run the suite for real, keep the raw output as evidence, and
// write one results file (never over an existing one) from the run and its assertion log.
// ---------------------------------------------------------------------------------------------
function runSuite(dataRoot, appPath, run, cycleName, { tests = [] } = {}) {
  const runDir = path.join(dataRoot, 'runs', run);
  const outFile = path.join(runDir, 'execution', `${cycleName}.md`);
  if (fs.existsSync(outFile)) throw new Error(`refusing to overwrite ${outFile}`);
  const artifacts = path.join(runDir, 'execution', 'artifacts');
  fs.mkdirSync(artifacts, { recursive: true });
  const assertLog = path.join(artifacts, `${cycleName}.assertions.jsonl`);
  fs.writeFileSync(assertLog, '');
  // A clean environment for the suite: a parent test runner's NODE_TEST_CONTEXT would make it skip its files.
  const childEnv = { ...process.env, APP_PATH: appPath, ASSERT_LOG: assertLog, TESTS: tests.join(',') };
  delete childEnv.NODE_TEST_CONTEXT;
  const t0 = Date.now();
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=tap', 'tests/login.test.js'], {
    cwd: path.join(dataRoot, AUTO), encoding: 'utf8', env: childEnv,
  });
  const tap = `${r.stdout}${r.stderr}`;
  const tapFile = path.join(artifacts, `${cycleName}.tap`);
  fs.writeFileSync(tapFile, tap);
  // Per test: ok / not ok, and on failure whether the automation or the application failed.
  const results = [];
  const blocks = tap.split(/\n(?=(?:not )?ok \d+ - )/);
  for (const b of blocks) {
    const m = b.match(/^(not )?ok \d+ - (TC-LOGIN-\d+)( # SKIP)?/m);
    if (!m || m[3]) continue;
    const failed = Boolean(m[1]);
    let status = 'Passed'; let detail = '—';
    if (failed) {
      const automation = /LOCATOR_NOT_FOUND|LocatorNotFound|Cannot find module|is not a function|TypeError|ReferenceError/.test(b);
      status = automation ? 'Automation Failure' : 'Application Failure';
      detail = ((b.match(/error: \|?-?\s*\n?\s*['"]?([^\n'"]+)/) || b.match(/message: ['"]?([^\n'"]+)/) || [])[1] || 'failed').trim().slice(0, 80).replace(/\|/g, '/');
    }
    results.push({ id: m[2], status, detail });
  }
  const recs = fs.readFileSync(assertLog, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const evidence = `artifacts/${cycleName}.tap`;
  const md = `# Execution Results — ${run} (${cycleName})\n\n| Field | Value |\n|---|---|\n| Execution Mode | Headless |\n| Runner | node --test (TAP), exit ${r.status}, ${Date.now() - t0} ms |\n\n## 3. Execution Results\n\n` +
    `| Test Case ID | Automation Script ID | Status | Execution Time | Attempts | Failure Detail | Evidence Refs |\n|---|---|---|---|---|---|---|\n` +
    results.map((x) => `| ${x.id} | tests/login.test.js | ${x.status} | — | 1 | ${x.detail} | ${evidence} |`).join('\n') +
    `\n\n### 3.1 Assertion Records\n\n| Test Case ID | Assertion ID | Assertion | Expected | Expected Source | Actual | Check | Result | Evidence |\n|---|---|---|---|---|---|---|---|---|\n` +
    recs.map((x) => `| ${x.tc} | ${x.id} | approved assertion | \`${x.expected}\` | — | \`${x.actual}\` | ${x.check} | ${x.result === 'pass' ? '✅' : '❌'} | ${evidence} |`).join('\n') + '\n';
  fs.writeFileSync(outFile, md);
  return { file: path.relative(dataRoot, outFile).replace(/\\/g, '/'), tap: path.relative(dataRoot, tapFile).replace(/\\/g, '/'), exit: r.status, results, assertions: recs };
}

/** Unified diff of one file (single whole-file hunk) — what a repair proposal carries. */
function diffOf(rel, before, after) {
  const a = before.replace(/\n$/, '').split('\n');
  const b = after.replace(/\n$/, '').split('\n');
  return `--- a/${rel}\n+++ b/${rel}\n@@ -1,${a.length} +1,${b.length} @@\n${a.map((l) => `-${l}`).join('\n')}\n${b.map((l) => `+${l}`).join('\n')}\n`;
}

module.exports = { APP, SUITE, CASES, AUTO, header, suiteMd, matrixMd, runSuite, diffOf };
