// Self-Healing end-to-end regression suite (Phase 6.2; kept as a repeatable suite in Phase 7).
//
// Drives the REAL Run Manager / Module Manager / report_builder CLIs through the Stage 5H repair
// lifecycle, with a REAL node:test automation suite executed against a small disposable application
// (fixture.js). Everything happens in disposable data roots under the OS temp directory (or --workdir):
// no production credentials, no live data, never the project's data root. 5H is always started
// explicitly by a named person in the scenario — nothing here invokes it automatically.
//
// Usage:   npm run test:e2e:self-healing
//          node tests/e2e/self_healing/selfHealing.e2e.js [--workdir <dir>] [--keep]
// Output:  one line per scenario; e2e.results.json (scenario matrix, before/after assertions) and
//          e2e.trace.json (every command of the successful lifecycle, with its exit code) in the workdir.
// Exit:    0 = every scenario passed · 1 = at least one failed (or the harness itself broke)
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const F = require('./fixture');

const REPO = path.resolve(__dirname, '..', '..', '..').replace(/\\/g, '/');
const RM = `${REPO}/platform_core/tools/run_manager/cli.js`;
const MM = `${REPO}/platform_core/tools/module_manager/cli.js`;
const RB = `${REPO}/platform_core/tools/report_builder/cli.js`;
const repairPatch = require(`${REPO}/platform_core/tools/run_manager/repairPatch.js`);
const { parseAssertionRecords } = require(`${REPO}/platform_core/tools/run_manager/assertionEvidence.js`);
const argv = process.argv.slice(2);
const argOf = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const WORKDIR = path.resolve(argOf('--workdir') || fs.mkdtempSync(path.join(os.tmpdir(), 'selfheal-e2e-')));
const KEEP = argv.includes('--keep') || Boolean(argOf('--workdir'));
// The project's data root must never be a workspace.
if (path.resolve(WORKDIR).toLowerCase().startsWith(path.resolve(REPO, 'platform_core_data').toLowerCase())) {
  console.error('--workdir must not be inside platform_core_data/.');
  process.exit(1);
}
const trace = [];
const results = [];
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

/** Reads allowed; mutating self-created/dedicated test data allowed; shared data needs authorization. */
const E2E_POLICY = (environment) => ({
  policyId: 'e2e', policyVersion: 1, environment, environmentAliases: [], defaults: { '*': 'Forbidden' },
  categories: {
    read: { '*': 'Allowed' },
    mutation: { SelfCreated: 'Allowed', DedicatedTestData: 'Allowed', Shared: 'Approval Required', Unknown: 'Approval Required', ProductionLike: { decision: 'Forbidden', absolute: true } },
    approval: { SelfCreated: 'Allowed', Shared: 'Approval Required' },
    financial: { '*': { decision: 'Forbidden', absolute: true } }, booking: { '*': { decision: 'Forbidden', absolute: true } }, privileged: { '*': { decision: 'Forbidden', absolute: true } },
  },
});
/** The operator's Safety Preflight before an execution stage starts — through the real CLI. */
function preflight(ws, run, stage, step = 'preflight') {
  return ws.rm(step, 'state', 'preflight', stage, '--environment', ws.environment || 'QA', '--target-url', 'https://qa.example.test',
    '--execution-type', 'browser', '--execution-mode', 'Headless', '--operations', '[{"action":"READ","ownership":"DedicatedTestData"}]',
    '--confirmed-by', 'QA Lead', '--run', run);
}

function W(name, { environment = 'QA' } = {}) {
  const base = path.join(WORKDIR, 'ws', name).replace(/\\/g, '/');
  fs.rmSync(base, { recursive: true, force: true });
  const ws = {
    name, root: `${base}/data`, app: `${base}/app/loginApp.js`,
    put(rel, t) { const f = path.join(this.root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return rel; },
    read(rel) { return fs.readFileSync(path.join(this.root, rel), 'utf8'); },
    cmd(tool, args, step) {
      const r = spawnSync(process.execPath, [tool, ...args], { encoding: 'utf8', cwd: REPO });
      const out = `${r.stdout}\n${r.stderr}`.trim();
      trace.push({ ws: name, step, cmd: `${path.basename(path.dirname(tool))}/${path.basename(tool)} ${args.filter((a) => !a.includes(base)).join(' ')}`, exit: r.status, out: out.split('\n').filter((l) => !/^\s+(\d|4|5|6)[AMH]? +Stage/.test(l)).slice(0, 6).join(' | ').slice(0, 400) });
      return { code: r.status, text: out, out: r.stdout };
    },
    rm(step, ...a) { return this.cmd(RM, [...a, '--runs-dir', `${this.root}/runs`], step); },
    mm(step, ...a) { return this.cmd(MM, [...a, '--modules-dir', `${this.root}/modules`], step); },
    meta(run) { return JSON.parse(this.read(`runs/${run}/metadata/run.json`)); },
  };
  fs.mkdirSync(`${ws.root}/runs`, { recursive: true });
  fs.mkdirSync(path.dirname(ws.app), { recursive: true });
  fs.writeFileSync(ws.app, F.APP);
  for (const [rel, text] of Object.entries(F.SUITE)) ws.put(`${F.AUTO}/${rel}`, text);
  // A complete Execution Safety policy for the workspace's environment (Phase 9.2: the Safety Preflight evaluates it).
  if (environment) ws.put('knowledge_base/execution_safety_policy.json', JSON.stringify(E2E_POLICY(environment)));
  ws.environment = environment;
  ws.mm('setup', 'propose', '--name', 'Login');
  ws.mm('setup', 'approve', 'login', '--by', 'Reviewer');
  return ws;
}
const flip = (ws, rel) => ws.put(rel, ws.read(rel).replace('| Status | Pending Review |', '| Status | Approved |'));
function checkpoint(ws, run, id, files) {
  ws.rm(`stage ${id}`, 'state', 'start', id, '--invocation', 'Pipeline', '--run', run);
  for (const [rel, t] of files) ws.put(rel, t);
  ws.rm(`stage ${id}`, 'state', 'request-approval', id, '--artifacts', files.map((x) => x[0]).join(','), '--run', run);
  for (const [rel] of files) flip(ws, rel);
  const r = ws.rm(`stage ${id}`, 'state', 'approve', id, '--approved-by', 'Reviewer', '--run', run);
  if (r.code !== 0) throw new Error(`approve ${id}: ${r.text}`);
}
const H = (ws, run, step, ...a) => ws.rm(step, 'state', 'heal', ...a, '--run', run);
const record = (r) => { results.push(r); console.log(`[${r.result.padEnd(4)}] ${r.id} ${r.scenario}${r.result !== 'Pass' ? `\n        actual: ${r.actual}` : ''}`); };

/** Steps 1–2: a run through 4A, then 5A executes the suite FOR REAL and its evidence is registered. */
function executedRun(ws) {
  const run = ws.rm('setup', 'new', '--scope', 'Module', '--target', 'Login', '--modules', 'login', '--no-activate').text.match(/Created (\S+)/)[1];
  ws.rm('setup', 'state', 'workflow', 'full-automation', '--by', 'QA Lead', '--run', run);
  checkpoint(ws, run, '1', [['modules/login/context/ProjectContext.md', F.header('Project Context — login', 'Pending Review')]]);
  checkpoint(ws, run, '2', [['modules/login/discovery/QA_Assessment_Report.md', F.header('QA Assessment — login', 'Pending Review')]]);
  checkpoint(ws, run, '3', [['modules/login/test_design/TestCases_login.md', F.suiteMd('Pending Review')], ['modules/login/test_design/TraceabilityMatrix.md', F.matrixMd('Pending Review')]]);
  ws.rm('stage 4A', 'state', 'start', '4A', '--invocation', 'Pipeline', '--run', run);
  ws.put('modules/login/automation/AutomationPlan_Node.md', F.header('Automation Plan — login', 'Pending Review'));
  ws.mm('stage 4A', 'automation', 'login', '--state', 'Generated', '--by', 'agent');
  ws.rm('stage 4A', 'state', 'request-approval', '4A', '--artifacts', 'modules/login/automation/AutomationPlan_Node.md', '--run', run);
  flip(ws, 'modules/login/automation/AutomationPlan_Node.md');
  ws.mm('stage 4A', 'automation', 'login', '--state', 'Approved', '--by', 'Automation Lead');
  ws.rm('stage 4A', 'state', 'approve', '4A', '--approved-by', 'Automation Lead', '--run', run);
  preflight(ws, run, '5A', '5A');
  ws.rm('5A', 'state', 'start', '5A', '--invocation', 'Pipeline', '--run', run);
  const exec = F.runSuite(ws.root, ws.app, run, 'ExecutionResults');           // ← actual execution
  ws.rm('5A', 'state', 'artifact', '5A', '--artifacts', exec.file, '--run', run);
  ws.rm('5A', 'state', 'outcome', '5A', '--from-results', '--run', run);
  ws.rm('5A', 'state', 'complete', '5A', '--run', run);
  return { run, exec };
}
const PAGE = `${F.AUTO}/pages/LoginPage.js`;
/** Proposes a repair of LoginPage.js changing the stale locator to `locatorSource`. */
function proposeLocator(ws, run, n, locatorSource, step) {
  const before = ws.read(PAGE);
  const after = before.replace(/html\.match\(\/[^/]+\/\)/, `html.match(${locatorSource})`);
  const patch = ws.put(`runs/${run}/self_healing/attempt-${n}.diff`, F.diffOf(PAGE, before, after));
  const r = H(ws, run, step, 'propose', '--root-cause-confidence', 'High', '--test', 'TC-LOGIN-001', '--strategy', 'replace the stale #banner locator', '--reason', 'TAP: LOCATOR_NOT_FOUND for #banner; the page renders data-testid="lock-banner"',
    '--patch', patch, '--factors', 'observed-root-cause:60:execution/artifacts/ExecutionResults.tap;targets-root-cause:15:the locator is the failing call in the TAP stack;reproduced:10:execution/artifacts/ExecutionResults.assertions.jsonl has no TC-LOGIN-001 record;static-check:5:node --check pages/LoginPage.js', '--by', 'QA Lead');
  return { r, patch, before, after };
}
const applyOnDisk = (ws, patchRel) => {
  for (const file of repairPatch.parseUnifiedDiff(ws.read(patchRel))) {
    const abs = path.join(ws.root, file.path);
    fs.writeFileSync(abs, repairPatch.applyHunks(fs.readFileSync(abs, 'utf8'), file));
  }
};
const report = (ws, run) => JSON.parse(H(ws, run, 'report', 'report', '--json').out);

// =============================================================================================
// E2E-1: the successful repair lifecycle, steps 1–12
// =============================================================================================
let S = null;
{
  const ws = W('success');
  const { run, exec } = executedRun(ws);
  const o5a = ws.meta(run).stages['5A'].outcome;
  const cycle1Sha = sha(path.join(ws.root, exec.file));
  // 3. explicit, named invocation
  preflight(ws, run, '5H', '3 invoke');
  const s5h = ws.rm('3 invoke', 'state', 'start', '5H', '--invocation', 'Direct', '--by', 'QA Lead', '--run', run);
  const open = H(ws, run, '3 open', 'open', '--tests', 'TC-LOGIN-001,TC-LOGIN-002', '--environment', 'QA', '--reason', 'TC-LOGIN-001 fails on a stale locator after the UI release', '--by', 'QA Lead');
  // 4. classification, with the real execution evidence
  const cls = H(ws, run, '4 classify', 'classify', '--test', 'TC-LOGIN-001', '--class', 'automation', '--evidence', `${exec.tap.replace(`runs/${run}/`, '')} shows LOCATOR_NOT_FOUND for #banner`, '--by', 'QA Lead');
  // 5. proposal with documented confidence
  const p = proposeLocator(ws, run, 1, '/<div data-testid="lock-banner"[^>]*>([^<]*)</', '5 propose');
  // 6. approvals (High confidence: the batch gate only)
  const ba = H(ws, run, '6 approve', 'batch-approve', '--by', 'QA Lead');
  // 7. apply the approved patch to the disposable working copy
  applyOnDisk(ws, p.patch);
  // 8. verify against the disk
  const ap = H(ws, run, '8 verify', 'apply', '--test', 'TC-LOGIN-001', '--attempt', '1', '--restore-point', 'working-copy@before-attempt-1', '--by', 'QA Lead');
  // 9. execute the repaired test and the regression tests — for real
  const rerun = F.runSuite(ws.root, ws.app, run, 'ExecutionResults.rerun-1');
  // 10. register the immutable 5H rerun results
  ws.rm('10 register', 'state', 'artifact', '5H', '--artifacts', rerun.file, '--kind', 'output', '--run', run);
  // 11. validate, then update the execution outcome
  const val = H(ws, run, '11 validate', 'validate', '--test', 'TC-LOGIN-001', '--attempt', '1', '--rerun', rerun.file, '--regression', `TC-LOGIN-003@${rerun.file},TC-LOGIN-004@${rerun.file}`, '--by', 'QA Lead');
  const o5h = ws.rm('11 outcome', 'state', 'outcome', '5H', '--from-results', '--run', run);
  const out = ws.meta(run).stages['5H'].outcome;
  const fin = (id) => out.tests.find((t) => t.testCaseId === id);
  const rep = report(ws, run)[0];
  const t1 = rep.tests.find((x) => x.testCaseId === 'TC-LOGIN-001');
  record({
    id: 'E2E-1', scenario: 'Successful repair lifecycle with actual execution (steps 1–11)',
    expected: '5A really fails TC-LOGIN-001 (automation) and TC-LOGIN-002 (application); the locator repair is classified, proposed, approved, applied, verified on disk, rerun for real with regression, validated fixed; TC-LOGIN-001 reads Automation Repaired, TC-LOGIN-002 stays an Application Failure, cycle 1 unchanged',
    actual: `5A real run exit ${exec.exit}: ${exec.results.map((x) => `${x.id} ${x.status}`).join(', ')} (verdict ${o5a.verdict}); 5H start ${s5h.code}, open ${open.code}, classify ${cls.code}, propose ${p.r.code} (${t1.attempts[0].confidence.band} ${t1.attempts[0].confidence.score}), batch ${ba.code}, verify ${ap.code} (verified=${t1.attempts[0].applied && t1.attempts[0].applied.verified}); rerun real exit ${rerun.exit}: ${rerun.results.map((x) => `${x.id} ${x.status}`).join(', ')}; validate ${val.code} → ${t1.attempts[0].result}; 5H outcome ${o5h.code}: TC-001 ${fin('TC-LOGIN-001').final}, TC-002 ${fin('TC-LOGIN-002').final}, verdict ${out.verdict}; cycle-1 sha unchanged=${sha(path.join(ws.root, exec.file)) === cycle1Sha}`,
    result: (exec.results.find((x) => x.id === 'TC-LOGIN-001').status === 'Automation Failure' && exec.results.find((x) => x.id === 'TC-LOGIN-002').status === 'Application Failure'
      && t1.attempts[0].result === 'fixed' && fin('TC-LOGIN-001').final === 'Automation Repaired' && fin('TC-LOGIN-002').final === 'Application Failure' && sha(path.join(ws.root, exec.file)) === cycle1Sha) ? 'Pass' : 'Fail',
  });
  S = { ws, run, exec, rerun, out, o5a, cycle1Sha };
}

// =============================================================================================
// E2E-1 step 12: the Final QA Report — built from the recorded outcome and the rerun's assertion records
// =============================================================================================
{
  const { ws, run, rerun, out } = S;
  ws.rm('12 report', 'state', 'start', '6A', '--invocation', 'Direct', '--run', run);
  const rp = JSON.parse(ws.rm('12 report', 'state', 'report-path', '--json', '--run', run).out);
  const recs = parseAssertionRecords(ws.read(rerun.file));
  const key = (s) => s.toUpperCase().replace(/[^A-Z]+/g, '_');
  const tone = { Passed: 'pass', 'Automation Repaired': 'warning', 'Application Failure': 'fail' };
  const counts = Object.entries(out.counts).filter(([, v]) => v > 0);
  const model = {
    title: 'Final QA Report — login', statusPill: 'COMPLETE', statusPillTone: 'neutral', outcomeVerdict: out.verdict,
    statuses: counts.map(([s]) => ({ key: key(s), label: s, tone: tone[s] || 'warning' })),
    summary: { counts: counts.map(([s, v]) => ({ status: key(s), value: v })) },
    testCases: {
      categories: [{
        key: 'positive', name: 'Login',
        cases: out.tests.map((t) => ({
          id: t.testCaseId, title: t.testCaseId, status: key(t.final),
          rows: [{ label: 'Cycles', value: t.cycles.join(' → ') }, ...(t.reason ? [{ label: 'Reason', value: t.reason }] : [])],
          assertions: recs.filter((r) => r.testCaseId === t.testCaseId).map((r) => ({ id: r.assertionId, assertion: r.assertion, expected: r.expected.replace(/`/g, ''), actual: r.actual.replace(/`/g, ''), check: r.check, result: r.result === '✅' ? 'pass' : 'fail', evidence: r.evidence })),
        })),
      }],
    },
  };
  fs.mkdirSync(path.dirname(rp.json), { recursive: true });
  fs.writeFileSync(rp.json, JSON.stringify(model, null, 2));
  fs.writeFileSync(rp.md, `# Final QA Report — ${run}\n\n## 3. Statistics\n\n| Status | Count |\n|---|---|\n${counts.map(([s, v]) => `| ${s} | ${v} |`).join('\n')}\n`);
  const build = ws.cmd(RB, ['build', '--model', rp.json, '--out', rp.html, '--data-root', ws.root], '12 report');
  const rel = (p) => p.replace(/\\/g, '/').replace(`${ws.root}/`, '');
  const check = ws.rm('12 report', 'state', 'report-check', '--model', rel(rp.json), '--md', rel(rp.md), '--html', rel(rp.html), '--run', run);
  ws.rm('12 report', 'state', 'artifact', '6A', '--artifacts', rel(rp.md), '--run', run);
  const done = ws.rm('12 report', 'state', 'complete', '6A', '--run', run);
  // A report that calls the repaired test "Passed" is refused.
  const lie = { ...model, statuses: [{ key: 'PASSED', label: 'Passed', tone: 'pass' }, { key: 'APPLICATION_FAILURE', label: 'Application Failure', tone: 'fail' }], summary: { counts: [{ status: 'PASSED', value: 3 }, { status: 'APPLICATION_FAILURE', value: 1 }] }, testCases: undefined };
  const lieFile = rp.json.replace('Final_QA_Report.report.json', 'lie.report.json');
  fs.writeFileSync(lieFile, JSON.stringify(lie));
  const lieCheck = ws.rm('12 report', 'state', 'report-check', '--model', rel(lieFile), '--run', run);
  const html = fs.readFileSync(rp.html, 'utf8');
  const st = JSON.parse(ws.rm('12 report', 'state', 'status', '--json', '--run', run).out);
  record({
    id: 'E2E-1/12', scenario: 'Final QA Report after the repair: Automation Repaired kept apart from Passed; renderings agree; 6A completes',
    expected: 'Counts = recorded outcome (Passed 2, Automation Repaired 1, Application Failure 1); report-check passes; 6A completes; a report calling the repaired test Passed is refused',
    actual: `counts ${JSON.stringify(out.counts)}; build ${build.code}; report-check exit ${check.code}; complete 6A exit ${done.code}; HTML shows "Automation Repaired"=${/Automation Repaired/.test(html)} and assertion table=${/class="assertions"/.test(html)}; "repaired = Passed" report-check exit ${lieCheck.code} (${lieCheck.text.split('\n')[0].slice(0, 120)}); workflow ${st.workflowStatus}, overall ${st.testOutcome.overall}`,
    result: (check.code === 0 && done.code === 0 && lieCheck.code === 2 && out.counts['Automation Repaired'] === 1 && /Automation Repaired/.test(html)) ? 'Pass' : 'Fail',
  });
  // N-7: the original failure remains visible after the successful repair.
  const h = JSON.parse(ws.rm('N-7', 'state', 'history', '5H', '--json', '--run', run).out);
  const t1 = h.tests.find((t) => t.testCaseId === 'TC-LOGIN-001');
  const o5a = ws.meta(run).stages['5A'].outcome;
  record({
    id: 'N-7', scenario: 'The original failure stays visible after a successful repair',
    expected: 'Cycle 1 (ExecutionResults.md) byte-identical; 5A outcome still records the Automation Failure; history shows 1:Automation Failure → 2:Passed; first-attempt counts keep the failure',
    actual: `cycle-1 sha unchanged=${sha(path.join(ws.root, S.exec.file)) === S.cycle1Sha}; 5A outcome TC-001=${o5a.tests.find((t) => t.testCaseId === 'TC-LOGIN-001').final}; history ${t1.history.map((x) => `${x.cycle}:${x.status}`).join(' → ')}; final ${t1.finalStatus}; first-attempt ${JSON.stringify(h.firstAttemptCounts)}`,
    result: (sha(path.join(ws.root, S.exec.file)) === S.cycle1Sha && o5a.tests.find((t) => t.testCaseId === 'TC-LOGIN-001').final === 'Automation Failure' && t1.history.map((x) => x.status).join() === 'Automation Failure,Passed') ? 'Pass' : 'Fail',
  });
  S.before = recs; // for the before/after table
}

// =============================================================================================
// E2E-2: the unsuccessful lifecycle — three real attempts that do not fix it → quarantine
// =============================================================================================
{
  const ws = W('unsuccessful');
  const { run } = executedRun(ws);
  preflight(ws, run, '5H', 'setup');
  ws.rm('setup', 'state', 'start', '5H', '--invocation', 'Direct', '--by', 'QA Lead', '--run', run);
  H(ws, run, 'open', 'open', '--tests', 'TC-LOGIN-001', '--environment', 'QA', '--reason', 'stale locator', '--by', 'QA Lead');
  H(ws, run, 'classify', 'classify', '--test', 'TC-LOGIN-001', '--class', 'automation', '--evidence', 'execution/artifacts/ExecutionResults.tap LOCATOR_NOT_FOUND', '--by', 'QA Lead');
  const wrong = ['/<div class="lock"[^>]*>([^<]*)</', '/<span data-testid="lock-banner"[^>]*>([^<]*)</', '/<div name="banner"[^>]*>([^<]*)</'];
  const outcomes = [];
  for (let n = 1; n <= 3; n += 1) {
    if (n === 3) { // the session is interrupted and the operation reopened
      H(ws, run, 'close', 'close', '--by', 'QA Lead');
      ws.rm('interrupt', 'state', 'recover', '5H', '--by', 'QA Lead', '--reason', 'session lost', '--run', run);
      preflight(ws, run, '5H', 'resume');
      ws.rm('resume', 'state', 'start', '5H', '--invocation', 'Direct', '--by', 'QA Lead', '--run', run);
      H(ws, run, 'reopen', 'open', '--tests', 'TC-LOGIN-001', '--environment', 'QA', '--reason', 'continue', '--by', 'QA Lead');
      H(ws, run, 'classify', 'classify', '--test', 'TC-LOGIN-001', '--class', 'automation', '--evidence', 'execution/artifacts/ExecutionResults.tap LOCATOR_NOT_FOUND', '--by', 'QA Lead');
    }
    const p = proposeLocator(ws, run, n, wrong[n - 1], `attempt ${n}`);
    H(ws, run, `attempt ${n}`, 'batch-approve', '--by', 'QA Lead');
    applyOnDisk(ws, p.patch);
    const k = n === 3 ? 1 : n;
    H(ws, run, `attempt ${n}`, 'apply', '--test', 'TC-LOGIN-001', '--attempt', String(k), '--by', 'QA Lead');
    const rr = F.runSuite(ws.root, ws.app, run, `ExecutionResults.rerun-${n}`, { tests: ['TC-LOGIN-001'] }); // ← actual execution
    ws.rm(`attempt ${n}`, 'state', 'artifact', '5H', '--artifacts', rr.file, '--kind', 'output', '--run', run);
    H(ws, run, `attempt ${n}`, 'validate', '--test', 'TC-LOGIN-001', '--attempt', String(k), '--rerun', rr.file, '--by', 'QA Lead');
    outcomes.push(`${rr.results[0].status}`);
    ws.put(PAGE, p.before); // rolled back
  }
  const fourth = proposeLocator(ws, run, 4, '/<div data-testid="lock-banner"[^>]*>([^<]*)</', 'attempt 4');
  const q = ws.meta(run).stages['5H'].repairQuarantine || [];
  const rep = report(ws, run);
  record({
    id: 'E2E-2', scenario: 'Unsuccessful lifecycle: three real attempts fail (one after an interruption) → quarantine; a 4th — even the right fix — is refused',
    expected: 'Each real rerun still fails; validation records "remaining"; the third unsuccessful attempt quarantines the test across operations; the fourth proposal is refused',
    actual: `real reruns: ${outcomes.join(', ')}; results ${rep.flatMap((op) => op.tests[0].attempts.map((a) => a.result)).join(', ')}; quarantine ${q.length} (${(q[0] || {}).attempts})`.slice(0, 400) + `; 4th: ${fourth.r.text.match(/[A-Z_]{6,}/)}`,
    result: (outcomes.every((x) => x === 'Automation Failure') && q.length === 1 && /QUARANTINED/.test(fourth.r.text)) ? 'Pass' : 'Fail',
  });
  record({ id: 'N-5', scenario: 'A quarantined test cannot silently receive another attempt', expected: 'QUARANTINED, with the record intact', actual: `4th proposal: ${fourth.r.text.split('\n').find((l) => /QUARANTINED/.test(l)) ? 'QUARANTINED' : fourth.r.text.slice(0, 80)}; quarantine records ${q.length}`, result: /QUARANTINED/.test(fourth.r.text) && q.length === 1 ? 'Pass' : 'Fail' });
}

// =============================================================================================
// Negative scenarios with the real suite
// =============================================================================================
{
  const ws = W('negative');
  const { run } = executedRun(ws);
  preflight(ws, run, '5H', 'setup');
  ws.rm('setup', 'state', 'start', '5H', '--invocation', 'Direct', '--by', 'QA Lead', '--run', run);
  H(ws, run, 'open', 'open', '--tests', 'TC-LOGIN-001,TC-LOGIN-002', '--environment', 'QA', '--reason', 'r', '--by', 'QA Lead');
  // N-1 application failure cannot be healed as automation
  const c2 = H(ws, run, 'N-1', 'classify', '--test', 'TC-LOGIN-002', '--class', 'automation', '--evidence', 'execution/artifacts/ExecutionResults.tap: maybe the test is wrong', '--by', 'QA Lead');
  const TEST = `${F.AUTO}/tests/login.test.js`;
  const before = ws.read(TEST);
  const p2 = ws.put(`runs/${run}/self_healing/n1.diff`, F.diffOf(TEST, before, before.replace("check('TC-LOGIN-002', 'A1', 410,", "check('TC-LOGIN-002', 'A1', 200,")));
  const pr2 = H(ws, run, 'N-1', 'propose', '--root-cause-confidence', 'High', '--test', 'TC-LOGIN-002', '--strategy', 'accept 200', '--reason', 'r', '--patch', p2, '--factors', 'observed-root-cause:60:execution/artifacts/ExecutionResults.tap', '--by', 'QA Lead');
  record({ id: 'N-1', scenario: 'An application failure cannot be healed as an automation failure (real defect: expired link accepted)', expected: 'Reclassification refused; a repair proposal for it refused', actual: `classify → ${(c2.text.match(/[A-Z_]{8,}/) || [c2.code])[0]}; propose → ${(pr2.text.match(/[A-Z_]{8,}/) || [pr2.code])[0]}`, result: /RECLASSIFICATION_REFUSED/.test(c2.text) && /NOT_ELIGIBLE/.test(pr2.text) ? 'Pass' : 'Fail' });

  // N-2 weakening the assertion of TC-LOGIN-001 (expected value changed / check loosened)
  H(ws, run, 'classify', 'classify', '--test', 'TC-LOGIN-001', '--class', 'automation', '--evidence', 'execution/artifacts/ExecutionResults.tap LOCATOR_NOT_FOUND', '--by', 'QA Lead');
  const weak = ws.put(`runs/${run}/self_healing/weak.diff`, F.diffOf(TEST, before, before.replace("check('TC-LOGIN-001', 'A1', 'Account locked', bannerText());", "check('TC-LOGIN-001', 'A1', 'Account', (() => { try { return bannerText(); } catch { return 'Account'; } })(), 'contains');")));
  const pw = H(ws, run, 'N-2', 'propose', '--root-cause-confidence', 'High', '--test', 'TC-LOGIN-001', '--strategy', 'tolerate', '--reason', 'r', '--patch', weak, '--factors', 'observed-root-cause:60:execution/artifacts/ExecutionResults.tap', '--by', 'QA Lead');
  record({ id: 'N-2', scenario: 'A patch that weakens the assertion (value loosened, error swallowed) is refused', expected: 'ASSERTION_WEAKENING, naming the removed approved value', actual: (pw.text.split('\n').find((l) => /ASSERTION_WEAKENING/.test(l)) || pw.text).slice(0, 260), result: /ASSERTION_WEAKENING/.test(pw.text) && /Account locked/.test(pw.text) ? 'Pass' : 'Fail' });

  // N-2b the SAME approved value kept, but the locator error swallowed with a fallback: the test can never fail.
  {
    const wb = W('bypass');
    const rb = executedRun(wb).run;
    preflight(wb, rb, '5H', 'setup');
    wb.rm('setup', 'state', 'start', '5H', '--invocation', 'Direct', '--by', 'QA Lead', '--run', rb);
    H(wb, rb, 'open', 'open', '--tests', 'TC-LOGIN-001', '--environment', 'QA', '--reason', 'r', '--by', 'QA Lead');
    H(wb, rb, 'classify', 'classify', '--test', 'TC-LOGIN-001', '--class', 'automation', '--evidence', 'execution/artifacts/ExecutionResults.tap LOCATOR_NOT_FOUND', '--by', 'QA Lead');
    const PAGE_BEFORE = wb.read(PAGE);
    const NL = String.fromCharCode(10);
    const from = ["  if (!m) throw new LocatorNotFound('#banner');", '  return m[1];'].join(NL);
    const to = ['  try {', "    if (!m) throw new LocatorNotFound('#banner');", '    return m[1];', '  } catch (e) {', "    return 'Account locked';", '  }'].join(NL);
    if (!PAGE_BEFORE.includes(from)) throw new Error('bypass anchor');
    const bypass = wb.put(`runs/${rb}/self_healing/bypass.diff`, F.diffOf(PAGE, PAGE_BEFORE, PAGE_BEFORE.replace(from, to)));
    const pb = H(wb, rb, 'N-2b', 'propose', '--root-cause-confidence', 'High', '--test', 'TC-LOGIN-001', '--strategy', 'fallback text', '--reason', 'r', '--patch', bypass, '--factors', 'observed-root-cause:60:execution/artifacts/ExecutionResults.tap', '--by', 'QA Lead');
    const firstCode = pb.text.split(NL).find((l) => /[A-Z_]{8,}:/.test(l));
    record({ id: 'N-2b', scenario: 'A patch that keeps the approved value but swallows the failure with a fallback (the test can never fail) is refused', expected: 'ASSERTION_WEAKENING (error swallowed / verification bypassed)', actual: (firstCode || `exit ${pb.code}: proposal ACCEPTED`).slice(0, 220), result: /ASSERTION_WEAKENING/.test(pb.text) ? 'Pass' : 'Fail' });
  }

  // N-3 an unapplied, then a modified, patch cannot be validated
  const p = proposeLocator(ws, run, 1, '/<div data-testid="lock-banner"[^>]*>([^<]*)</', 'N-3');
  H(ws, run, 'N-3', 'batch-approve', '--by', 'QA Lead');
  const notApplied = H(ws, run, 'N-3', 'apply', '--test', 'TC-LOGIN-001', '--attempt', '1', '--by', 'QA Lead');
  const valEarly = H(ws, run, 'N-3', 'validate', '--test', 'TC-LOGIN-001', '--attempt', '1', '--rerun', `runs/${run}/execution/ExecutionResults.md`, '--by', 'QA Lead');
  applyOnDisk(ws, p.patch);
  ws.put(PAGE, `${ws.read(PAGE)}// an unreviewed extra line\n`);
  const modified = H(ws, run, 'N-3', 'apply', '--test', 'TC-LOGIN-001', '--attempt', '1', '--by', 'QA Lead');
  ws.put(PAGE, p.after);
  const ok = H(ws, run, 'N-3', 'apply', '--test', 'TC-LOGIN-001', '--attempt', '1', '--by', 'QA Lead');
  ws.put(PAGE, `${p.after}// changed after verification\n`);
  const rr = F.runSuite(ws.root, ws.app, run, 'ExecutionResults.rerun-1');
  ws.rm('N-3', 'state', 'artifact', '5H', '--artifacts', rr.file, '--kind', 'output', '--run', run);
  const valAfter = H(ws, run, 'N-3', 'validate', '--test', 'TC-LOGIN-001', '--attempt', '1', '--rerun', rr.file, '--regression', `TC-LOGIN-003@${rr.file},TC-LOGIN-004@${rr.file}`, '--by', 'QA Lead');
  const code = (r) => (r.text.match(/[A-Z_]{8,}/) || [String(r.code)])[0];
  record({ id: 'N-3', scenario: 'An unapplied or modified patch cannot be validated', expected: 'apply refuses the unapplied and the modified patch; validate refuses before a verified apply and after the files changed', actual: `unapplied apply → ${code(notApplied)}; validate before apply → ${code(valEarly)}; modified apply → ${code(modified)}; exact apply → ${ok.code}; changed-after-verify validate → ${code(valAfter)}`, result: /PATCH_NOT_APPLIED/.test(notApplied.text) && valEarly.code !== 0 && /PATCH_MISMATCH/.test(modified.text) && ok.code === 0 && /PATCH_CHANGED_AFTER_APPLY/.test(valAfter.text) ? 'Pass' : 'Fail' });
}

{
  // N-4 a real regression failure (a shared helper change breaks TC-LOGIN-004) prevents success
  const ws = W('regression');
  const { run } = executedRun(ws);
  preflight(ws, run, '5H', 'setup');
  ws.rm('setup', 'state', 'start', '5H', '--invocation', 'Direct', '--by', 'QA Lead', '--run', run);
  H(ws, run, 'open', 'open', '--tests', 'TC-LOGIN-001', '--environment', 'QA', '--reason', 'r', '--by', 'QA Lead');
  H(ws, run, 'classify', 'classify', '--test', 'TC-LOGIN-001', '--class', 'automation', '--evidence', 'execution/artifacts/ExecutionResults.tap LOCATOR_NOT_FOUND', '--by', 'QA Lead');
  const SES = `${F.AUTO}/support/session.js`;
  const pageBefore = ws.read(PAGE);
  const sesBefore = ws.read(SES);
  const pageAfter = pageBefore.replace(/html\.match\(\/[^/]+\/\)/, 'html.match(/<div data-testid="lock-banner"[^>]*>([^<]*)</)');
  const sesAfter = sesBefore.replace('exports.fromMs = (ms) => ms / 60000;', 'exports.fromMs = (ms) => Math.round(ms / 1000); // "normalised" to seconds');
  const patch = ws.put(`runs/${run}/self_healing/shared.diff`, F.diffOf(PAGE, pageBefore, pageAfter) + F.diffOf(SES, sesBefore, sesAfter));
  const pr = H(ws, run, 'N-4', 'propose', '--root-cause-confidence', 'High', '--test', 'TC-LOGIN-001', '--strategy', 'locator + shared helper tidy-up', '--reason', 'r', '--patch', patch, '--factors', 'observed-root-cause:60:execution/artifacts/ExecutionResults.tap;targets-root-cause:15:x;reproduced:10:y;static-check:5:z', '--by', 'QA Lead');
  H(ws, run, 'N-4', 'batch-approve', '--by', 'QA Lead');
  applyOnDisk(ws, patch);
  const ap = H(ws, run, 'N-4', 'apply', '--test', 'TC-LOGIN-001', '--attempt', '1', '--by', 'QA Lead');
  const rr = F.runSuite(ws.root, ws.app, run, 'ExecutionResults.rerun-1');       // ← actual execution
  ws.rm('N-4', 'state', 'artifact', '5H', '--artifacts', rr.file, '--kind', 'output', '--run', run);
  const partial = H(ws, run, 'N-4', 'validate', '--test', 'TC-LOGIN-001', '--attempt', '1', '--rerun', rr.file, '--by', 'QA Lead');
  const full = H(ws, run, 'N-4', 'validate', '--test', 'TC-LOGIN-001', '--attempt', '1', '--rerun', rr.file, '--regression', `TC-LOGIN-003@${rr.file},TC-LOGIN-004@${rr.file}`, '--by', 'QA Lead');
  const a = report(ws, run)[0].tests[0].attempts[0];
  record({ id: 'N-4', scenario: 'A real regression failure (shared helper change breaks TC-LOGIN-004) prevents repair success', expected: 'Shared component detected; validation without full regression refused; with it, TC-LOGIN-001 passes but TC-LOGIN-004 fails → regression-failed', actual: `propose ${pr.code}, shared=${JSON.stringify(a.sharedBy)}; apply ${ap.code}; real rerun: ${rr.results.map((x) => `${x.id} ${x.status}`).join(', ')}; validate w/o regression → ${(partial.text.match(/[A-Z_]{8,}/) || [partial.code])[0]}; with → ${full.code}: ${a.result}, regression ${a.regression.map((r) => `${r.testCaseId} ${r.status}`).join(', ')}`, result: /VALIDATION_INCOMPLETE/.test(partial.text) && a.result === 'regression-failed' && rr.results.find((x) => x.id === 'TC-LOGIN-004').status !== 'Passed' ? 'Pass' : 'Fail' });
}

{
  // N-6 production restrictions cannot be bypassed (declared QA, configured Production)
  const ws = W('production', { environment: 'Production' });
  const { run } = executedRun(ws);
  preflight(ws, run, '5H', 'setup');
  ws.rm('setup', 'state', 'start', '5H', '--invocation', 'Direct', '--by', 'QA Lead', '--run', run);
  H(ws, run, 'open', 'open', '--tests', 'TC-LOGIN-001', '--environment', 'QA', '--reason', 'claims QA', '--by', 'QA Lead');
  H(ws, run, 'classify', 'classify', '--test', 'TC-LOGIN-001', '--class', 'automation', '--evidence', 'execution/artifacts/ExecutionResults.tap LOCATOR_NOT_FOUND', '--by', 'QA Lead');
  const p = proposeLocator(ws, run, 1, '/<div data-testid="lock-banner"[^>]*>([^<]*)</', 'N-6');
  H(ws, run, 'N-6', 'batch-approve', '--by', 'QA Lead');
  applyOnDisk(ws, p.patch);
  H(ws, run, 'N-6', 'apply', '--test', 'TC-LOGIN-001', '--attempt', '1', '--by', 'QA Lead');
  const rr = F.runSuite(ws.root, ws.app, run, 'ExecutionResults.rerun-1', { tests: ['TC-LOGIN-001'] });
  ws.rm('N-6', 'state', 'artifact', '5H', '--artifacts', rr.file, '--kind', 'output', '--run', run);
  const v1 = H(ws, run, 'N-6', 'validate', '--test', 'TC-LOGIN-001', '--attempt', '1', '--rerun', rr.file, '--by', 'QA Lead');
  const rw = H(ws, run, 'N-6', 'prod-access', '--scope', 'login page', '--by', 'Ops Lead');
  const ro = H(ws, run, 'N-6', 'prod-access', '--scope', 'login page, read-only', '--read-only', '--by', 'Ops Lead');
  const mut = H(ws, run, 'N-6', 'validate', '--test', 'TC-LOGIN-001', '--attempt', '1', '--rerun', rr.file, '--mutating', '--by', 'QA Lead');
  const v2 = H(ws, run, 'N-6', 'validate', '--test', 'TC-LOGIN-001', '--attempt', '1', '--rerun', rr.file, '--by', 'QA Lead');
  const chk = report(ws, run)[0].environmentCheck;
  const code = (r) => (r.text.match(/[A-Z_]{8,}/) || [String(r.code)])[0];
  record({ id: 'N-6', scenario: 'Production restrictions cannot be bypassed by declaring another environment', expected: 'Declared QA vs configured Production → inconsistent, restricted; rerun without read-only approval refused; read-write approval refused; mutating refused; read-only approval then allows validation', actual: `environment ${chk.declared} ${chk.status} (sources ${chk.sources.map((s) => s.environment).join(',')}), restricted=${chk.restricted}; validate → ${code(v1)}; read-write access → ${code(rw)}; read-only → ${ro.code}; mutating → ${code(mut)}; validate → ${v2.code}`, result: chk.restricted && /PRODUCTION_ACCESS_REQUIRED/.test(v1.text) && /PRODUCTION_WRITE_REFUSED/.test(rw.text) && ro.code === 0 && /PRODUCTION_WRITE_REFUSED/.test(mut.text) && v2.code === 0 ? 'Pass' : 'Fail' });
}

record({ id: 'N-8', scenario: 'Reporting distinguishes Automation Repaired from Passed', expected: 'See E2E-1/12: counts carry Automation Repaired separately; a report merging it into Passed is refused', actual: (results.find((r) => r.id === 'E2E-1/12') || {}).actual || 'n/a', result: (results.find((r) => r.id === 'E2E-1/12') || {}).result || 'Fail' });

// Before/After assertion results of the successful repair (from the real assertion logs).
const beforeRecs = fs.readFileSync(path.join(S.ws.root, `runs/${S.run}/execution/artifacts/ExecutionResults.assertions.jsonl`), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const afterRecs = fs.readFileSync(path.join(S.ws.root, `runs/${S.run}/execution/artifacts/ExecutionResults.rerun-1.assertions.jsonl`), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const beforeAfter = F.CASES.map(([id]) => ({ id, before: beforeRecs.find((r) => r.tc === id) || null, after: afterRecs.find((r) => r.tc === id) || null }));

fs.writeFileSync(path.join(WORKDIR, 'e2e.results.json'), JSON.stringify({ results, beforeAfter, success: { run: S.run, outcome5A: S.o5a.counts, outcome5H: S.out.counts } }, null, 1));
fs.writeFileSync(path.join(WORKDIR, 'e2e.trace.json'), JSON.stringify(trace.filter((t) => t.ws === 'success'), null, 1));
const tally = {}; for (const r of results) tally[r.result] = (tally[r.result] || 0) + 1;
const EXPECTED_SCENARIOS = 12;
console.log('TOTAL', results.length, JSON.stringify(tally));
const ok = results.length === EXPECTED_SCENARIOS && results.every((r) => r.result === 'Pass');
if (results.length !== EXPECTED_SCENARIOS) console.error(`expected ${EXPECTED_SCENARIOS} scenarios, ran ${results.length}`);
console.log(`results: ${WORKDIR}${path.sep}e2e.results.json${KEEP || !ok ? " (workspaces kept)" : ""}`);
if (!KEEP && ok) fs.rmSync(path.join(WORKDIR, "ws"), { recursive: true, force: true });
process.exitCode = ok ? 0 : 1;
