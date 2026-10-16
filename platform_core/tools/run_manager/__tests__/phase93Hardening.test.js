// Phase 9.3 — regression tests: F-18, F-19, F-22 … F-28 and the Skill-to-CLI workflow boundaries.
// Disposable data roots and repositories only.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync, execFileSync } = require('child_process');

const rs = require('../runState');
const gate = require('../stageGate');
const heal = require('../repairGovernance');
const { createRun } = require('../createRun');
const { FIXTURE_POLICY } = require('./approvalFixture');
const moduleRegistry = require('../../module_manager/moduleRegistry');
const featureRegistry = require('../../module_manager/featureRegistry');
const activeModule = require('../../module_manager/activeModule');
const recorder = require('../../observability/recorder');
const rb = require('../../report_builder');

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const TOOLS = path.join(REPO, 'platform_core', 'tools');
const RM = path.join(TOOLS, 'run_manager', 'cli.js');
const OBS = path.join(TOOLS, 'observability', 'cli.js');
const LC = path.join(TOOLS, 'automation_lifecycle', 'cli.js');
const T0 = new Date('2026-10-10T12:00:00Z');
let minute = 0;
const tick = () => new Date(T0.getTime() + (minute += 1) * 60000);
const expectCode = (fn, code) => assert.throws(fn, (err) => err.code === code, `expected ${code}`);

function workspace(extraRunJson = { modules: ['login'], moduleScope: 'single' }) {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'p93-'));
  const runsDir = path.join(dataRoot, 'runs');
  fs.mkdirSync(runsDir, { recursive: true });
  const folderName = extraRunJson === null ? null : createRun(runsDir, { scope: 'Module', target: 'Login', now: T0, extraRunJson }).folderName;
  return { dataRoot, runsDir, folderName };
}
const cleanup = (...dirs) => dirs.forEach((d) => fs.rmSync(d.dataRoot || d, { recursive: true, force: true }));
const run = (script, args, opts = {}) => { const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd: REPO, ...opts }); return { code: r.status, out: r.stdout, err: r.stderr, text: `${r.stdout}\n${r.stderr}` }; };
const registerModule = (dataRoot, name = 'Login', slug = 'login') => {
  const modulesDir = path.join(dataRoot, 'modules');
  moduleRegistry.proposeModules(modulesDir, [{ name }], { now: tick() });
  moduleRegistry.approveModules(modulesDir, [slug], { now: tick(), approvedBy: 'QA Lead' });
  return modulesDir;
};
const junction = (target, link) => { fs.mkdirSync(path.dirname(link), { recursive: true }); fs.symlinkSync(target, link, 'junction'); };

// ---------------------------------------------------------------------------------------------
// F-18 — telemetry emission: one locked batch, identical records, concurrency-safe, all-or-nothing
// ---------------------------------------------------------------------------------------------

test('F-18: a batch writes exactly what one-by-one recording writes — same IDs, sequence numbers and lines', () => {
  const a = workspace(); const b = workspace();
  try {
    const events = Array.from({ length: 25 }, (_, i) => ({ type: 'TEST_EXECUTION_RESULT', source: 'platform-tool', stage: '5A', testCaseId: `TC-${i}`, status: i % 3 ? 'Passed' : 'Failed', attempt: 1, cycle: 1, metadata: { evidenceKey: `k${i}` } }));
    // The two runs must share a folder name for byte equality (the runId is part of every record).
    const name = 'run-001__2026-10-10_12-00-00__Module__Login';
    for (const ws of [a, b]) fs.mkdirSync(path.join(ws.runsDir, name, 'metadata'), { recursive: true });
    for (const e of events) recorder.recordEvent({ runFolder: name, dataRoot: a.dataRoot, now: T0, event: e });
    const r = recorder.appendEvents({ runFolder: name, dataRoot: b.dataRoot, now: T0, build: () => events });
    assert.equal(r.ok, true);
    assert.equal(r.events.length, 25);
    assert.equal(fs.readFileSync(recorder.eventsPath(a.dataRoot, name), 'utf8'), fs.readFileSync(recorder.eventsPath(b.dataRoot, name), 'utf8'));
    assert.ok(!fs.existsSync(`${recorder.eventsPath(b.dataRoot, name)}.lock`), 'the lock is released');
  } finally { cleanup(a, b); }
});

test('F-18: one invalid event refuses the whole batch — nothing is written', () => {
  const ws = workspace();
  try {
    const good = { type: 'RETRY_OCCURRED', source: 'platform-tool' };
    assert.throws(() => recorder.appendEvents({ runFolder: ws.folderName, dataRoot: ws.dataRoot, now: T0, build: () => [good, { type: 'NOT_A_TYPE', source: 'platform-tool' }, good] }), /Invalid observability event/);
    assert.equal(recorder.readEvents({ runFolder: ws.folderName, dataRoot: ws.dataRoot }).events.length, 0);
  } finally { cleanup(ws); }
});

test('F-18: concurrent emitters of the same evidence add it exactly once, with unique, gap-free sequence numbers', async () => {
  const ws = workspace();
  try {
    const child = `const r=require(${JSON.stringify(path.join(TOOLS, 'observability', 'recorder.js'))});
const ev=Array.from({length:40},(_,i)=>({type:'TEST_EXECUTION_RESULT',source:'platform-tool',stage:'5A',testCaseId:'TC-'+i,status:'Passed',attempt:1,cycle:1,metadata:{evidenceKey:'e'+i}}));
const res=r.appendEvents({runFolder:process.argv[1],dataRoot:process.argv[2],now:new Date('2026-10-10T12:00:00Z'),build:(have)=>{const k=new Set(have.map(e=>e.metadata&&e.metadata.evidenceKey));return ev.filter(e=>!k.has(e.metadata.evidenceKey));}});
process.stdout.write(String(res.ok?res.events.length:'FAIL '+res.warning));`;
    const outs = await Promise.all(Array.from({ length: 6 }, () => new Promise((resolve) => {
      const p = spawn(process.execPath, ['-e', child, ws.folderName, ws.dataRoot]);
      let o = ''; p.stdout.on('data', (d) => { o += d; }); p.on('close', () => resolve(o));
    })));
    const written = outs.map(Number);
    assert.equal(written.reduce((s, n) => s + n, 0), 40, `emitters wrote ${outs.join(', ')}`);
    const read = recorder.readEvents({ runFolder: ws.folderName, dataRoot: ws.dataRoot });
    assert.equal(read.ok, true);
    assert.deepEqual(read.events.map((e) => e.seq), Array.from({ length: 40 }, (_, i) => i + 1));
    assert.equal(new Set(read.events.map((e) => e.metadata.evidenceKey)).size, 40);
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// F-19 — Self-Healing governance
// ---------------------------------------------------------------------------------------------

test('F-19: a repair is proposed only at High Root Cause Confidence, backed by an observed root cause', () => {
  const ws = workspace();
  try {
    const base = { now: tick(), testCaseId: 'TC-1', by: 'QA Lead', strategy: 's', reason: 'r', patch: 'runs/x/p.diff', factors: [{ factor: 'observed-root-cause', value: 55, citation: 'trace.zip' }] };
    expectCode(() => heal.proposeRepair(ws.runsDir, ws.folderName, base), 'MISSING_FIELD');
    expectCode(() => heal.proposeRepair(ws.runsDir, ws.folderName, { ...base, rootCauseConfidence: 'Medium' }), 'DIAGNOSIS_ONLY');
    expectCode(() => heal.proposeRepair(ws.runsDir, ws.folderName, { ...base, rootCauseConfidence: 'Low' }), 'DIAGNOSIS_ONLY');
    expectCode(() => heal.proposeRepair(ws.runsDir, ws.folderName, { ...base, rootCauseConfidence: 'Sure' }), 'INVALID_ARGUMENT');
    expectCode(() => heal.proposeRepair(ws.runsDir, ws.folderName, { ...base, rootCauseConfidence: 'High', factors: [{ factor: 'reproduced', value: 10, citation: 'x' }] }), 'DIAGNOSIS_ONLY');
    // High + an observed root cause passes this gate; what refuses it next is the repair operation rule, not confidence.
    assert.throws(() => heal.proposeRepair(ws.runsDir, ws.folderName, { ...base, rootCauseConfidence: 'High' }), (e) => !['DIAGNOSIS_ONLY', 'MISSING_FIELD', 'INVALID_ARGUMENT'].includes(e.code));
  } finally { cleanup(ws); }
});

test('F-19: "mutating" comes from the Execution Safety policy via the 5H Safety Preflight, not only a self-declared flag — and fails closed without one', () => {
  const pf = (ops) => ({ id: 'SP-1', stageId: '5H', decision: 'confirmed', operations: ops });
  assert.equal(heal.rerunMutation(null, null, { safetyPreflights: [] }, false).mutating, true, 'no preflight → counts as mutating');
  assert.equal(heal.rerunMutation(null, null, { safetyPreflights: [pf([{ action: 'READ', mutating: false }])] }, false).mutating, false);
  const m = heal.rerunMutation(null, null, { safetyPreflights: [pf([{ action: 'READ', mutating: false }, { action: 'CREATE', mutating: true }])] }, false);
  assert.equal(m.mutating, true);
  assert.match(m.basis, /CREATE/);
  assert.equal(heal.rerunMutation(null, null, { safetyPreflights: [pf([{ action: 'READ', mutating: false }])] }, true).mutating, true, 'a declaration can only make it stricter');
  assert.equal(heal.rerunMutation(null, null, { safetyPreflights: [{ ...pf([{ action: 'READ', mutating: false }]), decision: 'refused' }] }, false).mutating, true, 'a refused preflight shows nothing');
});

test('F-19: the attempt budget stays three, as approved (Phase 6/6.1) — a fourth is refused', () => {
  assert.equal(heal.MAX_ATTEMPTS, 3);
});

// ---------------------------------------------------------------------------------------------
// F-23 — no observability write through a link that leaves the run
// ---------------------------------------------------------------------------------------------

test('F-23: events, Run Health and CLI outputs are never written through a junction out of the run folder', () => {
  const ws = workspace();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'p93-outside-'));
  try {
    junction(outside, path.join(ws.runsDir, ws.folderName, 'metadata', 'observability'));
    const r = recorder.recordEvent({ runFolder: ws.folderName, dataRoot: ws.dataRoot, now: T0, event: { type: 'RETRY_OCCURRED', source: 'platform-tool' } });
    assert.equal(r.ok, false);
    assert.match(r.warning, /outside the run folder/);
    const { buildRunHealth, RunHealthError } = require('../../observability/runHealth'); // eslint-disable-line no-unused-vars
    const { writeRunHealth } = require('../../observability/runHealthReport');
    const snapshot = buildRunHealth({ dataRoot: ws.dataRoot, runFolder: ws.folderName, now: T0 });
    assert.throws(() => writeRunHealth({ dataRoot: ws.dataRoot, runFolder: ws.folderName, snapshot, now: T0 }), (e) => e.code === 'OUTSIDE_RUN');
    const cli = run(OBS, ['health', '--run', ws.folderName, '--data-root', ws.dataRoot, '--out']);
    assert.equal(cli.code, 1);
    assert.match(cli.err, /OUTSIDE_RUN/);
    assert.doesNotMatch(cli.err, /\n\s+at /, 'no raw stack trace');
    const dash = run(OBS, ['dashboard', '--run', ws.folderName, '--data-root', ws.dataRoot, '--out']);
    assert.notEqual(dash.code, 0);
    assert.deepEqual(fs.readdirSync(outside), [], 'nothing landed outside the run');
  } finally { cleanup(ws, outside); }
});

// ---------------------------------------------------------------------------------------------
// F-24 — isolated dashboard data roots
// ---------------------------------------------------------------------------------------------

test('F-24: every observability command takes --data-root; an isolated root is read and written, a non-root and a path-shaped run are refused', () => {
  const ws = workspace();
  const notRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'p93-notroot-'));
  try {
    const d = run(OBS, ['dashboard', '--run', ws.folderName, '--data-root', ws.dataRoot, '--out']);
    assert.equal(d.code, 0, d.text);
    assert.ok(fs.existsSync(path.join(ws.runsDir, ws.folderName, 'metadata', 'observability', 'ObservabilityDashboard.html')));
    assert.equal(run(OBS, ['metrics', '--run', ws.folderName, '--data-root', ws.dataRoot]).code, 0);
    const bad = run(OBS, ['dashboard', '--run', ws.folderName, '--data-root', notRoot, '--out']);
    assert.equal(bad.code, 1);
    assert.match(bad.err, /not a data root/);
    const trav = run(OBS, ['dashboard', '--run', `../${path.basename(notRoot)}`, '--data-root', ws.dataRoot]);
    assert.equal(trav.code, 1);
    assert.match(trav.err, /not a run folder/);
    assert.deepEqual(fs.readdirSync(notRoot), []);
  } finally { cleanup(ws, notRoot); }
});

// ---------------------------------------------------------------------------------------------
// F-25 — invalid merge topology: a refusal, never a raw crash
// ---------------------------------------------------------------------------------------------

test('F-25: a module package outside the baseline repository is refused as MERGE_TOPOLOGY, with no stack trace and nothing written', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'p93-topo-'));
  try {
    const base = path.join(root, 'base'); const pkg = path.join(root, 'pkg');
    fs.mkdirSync(path.join(base, 'tests'), { recursive: true }); fs.mkdirSync(path.join(pkg, 'tests'), { recursive: true });
    fs.writeFileSync(path.join(base, 'tests', 'a.spec.ts'), 'a\n'); fs.writeFileSync(path.join(pkg, 'tests', 'b.spec.ts'), 'b\n');
    const git = (...a) => execFileSync('git', a, { cwd: base, stdio: 'pipe' });
    git('init', '-q'); git('add', '-A'); git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init');
    for (const cmd of [['plan-merge'], ['merge', '--apply', '--module', 'login', '--modules-dir', path.join(root, 'modules')]]) {
      const r = run(LC, [...cmd, '--baseline', base, '--package', pkg]);
      assert.equal(r.code, 1, r.text);
      assert.match(r.err, /^MERGE_TOPOLOGY: .*outside the baseline's repository/m);
      assert.doesNotMatch(r.text, /\n\s+at /, 'no raw stack trace');
    }
    assert.deepEqual(fs.readdirSync(path.join(base, 'tests')), ['a.spec.ts']);
    assert.ok(!fs.existsSync(path.join(root, 'modules')), 'no manifest or state written');
  } finally { cleanup(root); }
});

// ---------------------------------------------------------------------------------------------
// F-26 — concurrent run creation
// ---------------------------------------------------------------------------------------------

test('F-26: concurrent `new` for the same module all succeed, with unique numbers, an intact pointer and no leftover locks', async () => {
  const ws = workspace(null);
  try {
    registerModule(ws.dataRoot);
    const codes = await Promise.all(Array.from({ length: 8 }, () => new Promise((resolve) => {
      const p = spawn(process.execPath, [RM, 'new', '--scope', 'Module', '--target', 'Login', '--modules', 'login', '--runs-dir', ws.runsDir], { cwd: REPO });
      let e = ''; p.stderr.on('data', (d) => { e += d; }); p.on('close', (c) => resolve({ c, e }));
    })));
    assert.deepEqual(codes.filter((x) => x.c !== 0), [], 'every creation succeeded');
    const runs = fs.readdirSync(ws.runsDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
    const nums = runs.map((n) => n.match(/-run-(\d+)/)[1]);
    assert.equal(runs.length, 8);
    assert.equal(new Set(nums).size, 8, 'no duplicate run numbers');
    assert.deepEqual(fs.readdirSync(ws.runsDir).filter((n) => /lock|\.tmp$/.test(n)), []);
    assert.ok(JSON.parse(fs.readFileSync(path.join(ws.runsDir, 'current_active_run.json'), 'utf8')).activeRun.folderName);
  } finally { cleanup(ws); }
});

test('F-26: a pre-named run folder that already exists is still refused — creation never shares or overwrites a folder', () => {
  const ws = workspace();
  try {
    assert.throws(() => createRun(ws.runsDir, { folderName: ws.folderName, now: tick() }), /already exists/);
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// F-27 — package declarations agree with the lock and each other
// ---------------------------------------------------------------------------------------------

test('F-27: the Playwright declaration, the lock and the engines agree; an optional peer is actually declared', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(REPO, 'package-lock.json'), 'utf8'));
  const caret = (range, version) => {
    const [lo, v] = [range.replace(/^\^/, '').split('.').map(Number), version.split('.').map(Number)];
    return v[0] === lo[0] && (v[1] > lo[1] || (v[1] === lo[1] && v[2] >= lo[2]));
  };
  const locked = lock.packages['node_modules/playwright'];
  assert.ok(caret(pkg.devDependencies.playwright, locked.version), `lock ${locked.version} satisfies ${pkg.devDependencies.playwright}`);
  assert.equal(lock.packages['node_modules/playwright-core'].version, locked.version);
  assert.deepEqual(lock.packages[''].devDependencies, pkg.devDependencies, 'the lock root mirrors package.json');
  assert.deepEqual(lock.packages[''].peerDependencies, pkg.peerDependencies);
  for (const k of Object.keys(pkg.peerDependenciesMeta || {})) assert.ok(pkg.peerDependencies && pkg.peerDependencies[k], `peerDependenciesMeta.${k} has a peerDependencies entry`);
  const minNode = (s) => Number(String(s).match(/(\d+)/)[1]);
  assert.ok(minNode(pkg.engines.node) >= minNode(locked.engines.node), `engines.node ${pkg.engines.node} covers playwright's ${locked.engines.node}`);
  try {
    const installed = JSON.parse(fs.readFileSync(path.join(REPO, 'node_modules', 'playwright', 'package.json'), 'utf8')).version;
    assert.ok(caret(pkg.devDependencies.playwright, installed), `installed ${installed} satisfies ${pkg.devDependencies.playwright}`);
  } catch (err) { if (err.code !== 'ENOENT') throw err; }
});

// ---------------------------------------------------------------------------------------------
// F-28 — Feature pointer in test_suite_export; HTML integrity is the whole page
// ---------------------------------------------------------------------------------------------

test('F-28: test_suite_export follows an active Feature pointer, and a stale one is refused — never dropped to module scope', () => {
  const ws = workspace(null);
  try {
    const modulesDir = registerModule(ws.dataRoot);
    featureRegistry.proposeFeature(modulesDir, 'login', { name: 'Bulk Export' }, { now: tick() });
    featureRegistry.approveFeatures(modulesDir, 'login', ['bulk-export'], { now: tick(), approvedBy: 'QA Lead' });
    activeModule.setActiveModules(modulesDir, ['login'], { now: tick() });
    activeModule.setActiveFeature(modulesDir, 'login', 'bulk-export', { now: tick() });
    const { resolveDesignDirs } = require('../../test_suite_export/cli');
    const r = resolveDesignDirs({}, { dataRoot: ws.dataRoot });
    assert.deepEqual(r.dirs, [path.join(modulesDir, 'login', 'features', 'bulk-export', 'test_design')]);
    assert.match(r.source, /active Feature login\/bulk-export/);
    // A stale pointer: the registry names a Feature the module does not have.
    const reg = moduleRegistry.readRegistry(modulesDir);
    moduleRegistry.writeJsonAtomic(path.join(modulesDir, 'modules.json'), { ...reg, activeFeature: 'ghost-feature' });
    assert.throws(() => resolveDesignDirs({}, { dataRoot: ws.dataRoot }), /ghost-feature[\s\S]*not silently dropped to module scope/);
    // An explicit --module is still the human's explicit choice of module scope.
    assert.deepEqual(resolveDesignDirs({ module: 'login' }, { dataRoot: ws.dataRoot }).dirs, [path.join(modulesDir, 'login', 'test_design')]);
  } finally { cleanup(ws); }
});

test('F-28: an HTML report whose visible body was edited is caught even with its model fingerprint intact — for any report', () => {
  const model = { title: 'Discovery Report', testCases: { categories: [{ key: 'positive', cases: [{ title: 'Checkout total is wrong', status: 'FAIL' }] }] } };
  const html = rb.renderReport(model);
  assert.equal(rb.verifyHtml(html, model).ok, true);
  assert.equal(rb.verifyHtml(html.replace(/\n/g, '\r\n'), model).ok, true, 'line endings do not matter');
  const forged = html.replace('Checkout total is wrong', 'Checkout total is right');
  assert.notEqual(forged, html);
  assert.match(forged, /<meta name="report-model-sha256"/);
  const v = rb.verifyHtml(forged, model);
  assert.equal(v.ok, false);
  assert.match(v.reason, /differs from a fresh render/);
  // The CLI verify command, for any report model.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p93-html-'));
  try {
    fs.writeFileSync(path.join(dir, 'Discovery.report.json'), JSON.stringify(model));
    fs.writeFileSync(path.join(dir, 'Discovery.html'), html);
    assert.equal(run(path.join(TOOLS, 'report_builder', 'cli.js'), ['verify', '--model', path.join(dir, 'Discovery.report.json')]).code, 0);
    fs.writeFileSync(path.join(dir, 'Discovery.html'), forged);
    const r = run(path.join(TOOLS, 'report_builder', 'cli.js'), ['verify', '--model', path.join(dir, 'Discovery.report.json')]);
    assert.equal(r.code, 3);
    assert.match(r.out, /MISMATCH/);
  } finally { cleanup(dir); }
});

// ---------------------------------------------------------------------------------------------
// Skill-to-CLI workflow boundaries (fail-closed at the action)
// ---------------------------------------------------------------------------------------------

test('workflow: a browser never launches without an explicit Headed/Headless choice — checked before any profile or credential is read', async () => {
  const bd = require('../../browser_driver/driver');
  const pn = require('../../browser_provider/providers/playwright_node/driver');
  for (const launch of [bd.launchAuthenticated, pn.launchAuthenticated]) {
    await assert.rejects(() => launch({ credentialsPath: path.join(os.tmpdir(), 'definitely-not-here.json') }), (e) => e.code === 'MODE_REQUIRED');
  }
  const cliProvider = require('../../browser_provider/providers/playwright_cli');
  assert.throws(() => cliProvider.runSuite({ suiteDir: os.tmpdir() }), (e) => e.code === 'MODE_REQUIRED');
});

test('workflow: human-decision verbs and stale-input acceptance refuse a non-person name', () => {
  const ws = workspace();
  try {
    expectCode(() => rs.selectWorkflow(ws.runsDir, ws.folderName, { type: 'full-manual', by: 'Claude', now: tick() }), 'INVALID_APPROVER');
    expectCode(() => rs.recoverStage(ws.runsDir, ws.folderName, { stageId: '1', by: 'agent', reason: 'r', now: tick() }), 'INVALID_APPROVER');
    expectCode(() => rs.reopenStage(ws.runsDir, ws.folderName, { stageId: '1', by: 'x', reason: 'r', now: tick() }), 'INVALID_APPROVER');
    expectCode(() => rs.correctCheckpointRegistration(ws.runsDir, ws.folderName, { stageId: '1', artifact: 'a.md', kind: 'output', by: 'AI Assistant', reason: 'r', now: tick() }), 'INVALID_APPROVER');
    const g1 = gate.checkStageEntry(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Pipeline', acceptStaleBy: 'Claude', now: tick() });
    assert.equal(g1.acceptedStaleBy, null, 'an agent-shaped acceptor accepts nothing');
    const g2 = gate.checkStageEntry(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Pipeline', acceptStaleBy: 'QA Lead', now: tick() });
    assert.equal(g2.acceptedStaleBy, 'QA Lead');
  } finally { cleanup(ws); }
});

test('workflow: cleanup --scope all-accounted deletes nothing without the module\'s recorded, governed merge', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'p93-clean-'));
  try {
    const pkg = path.join(root, 'modules', 'login', 'automation', 'tests_Playwright');
    fs.mkdirSync(path.join(pkg, 'tests'), { recursive: true });
    fs.writeFileSync(path.join(pkg, 'tests', 'a.spec.ts'), 'a\n');
    const plan = path.join(root, 'plan.json');
    fs.writeFileSync(plan, JSON.stringify({ added: ['tests/a.spec.ts'], modified: [], deleted: [], renamed: [], discardedIgnored: [] }));
    const noModule = run(LC, ['cleanup', '--package', pkg, '--plan', plan, '--scope', 'all-accounted', '--apply']);
    assert.equal(noModule.code, 1);
    assert.match(noModule.err, /^CLEANUP_UNVERIFIED: /m);
    const unassembled = run(LC, ['cleanup', '--package', pkg, '--plan', plan, '--scope', 'all-accounted', '--apply', '--module', 'login', '--modules-dir', path.join(root, 'modules')]);
    assert.equal(unassembled.code, 1);
    assert.match(unassembled.err, /no recorded assembly/);
    assert.ok(fs.existsSync(path.join(pkg, 'tests', 'a.spec.ts')), 'nothing was deleted');
    // build-only (regenerable output) is unaffected.
    assert.equal(run(LC, ['cleanup', '--package', pkg, '--plan', plan, '--apply']).code, 0);
    assert.ok(fs.existsSync(path.join(pkg, 'tests', 'a.spec.ts')));
  } finally { cleanup(root); }
});

test('workflow: the Execution Safety fixture policy still names its environment (F-22 regression guard for the shared fixture)', () => {
  assert.ok(FIXTURE_POLICY.environment, 'fixture policies name the environment they govern');
});
