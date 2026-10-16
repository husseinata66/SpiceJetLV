// Phase 9.4 — controlled mutation boundaries: adversarial tests. Disposable data roots, projects and git
// repositories only; no real target/reference project, baseline or Platform Knowledge folder is touched.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn, spawnSync, execFileSync } = require('child_process');

const rs = require('../runState');
const tw = require('../targetWrites');
const fm = require('../fileMutation');
const kp = require('../knowledgePromotion');
const { assertLivePreflight } = require('../executionPreflight');
const { createRun } = require('../createRun');
const { FIXTURE_POLICY } = require('./approvalFixture');
const auth = require('../../execution_safety/authorizations');
const automationState = require('../../module_manager/automationState');
const moduleRegistry = require('../../module_manager/moduleRegistry');
const shared = require('../../automation_lifecycle/sharedAssets');
const bu = require('../../automation_lifecycle/baselineUpdate');

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const TOOLS = path.join(REPO, 'platform_core', 'tools');
const TW = path.join(TOOLS, 'target_write', 'cli.js');
const LC = path.join(TOOLS, 'automation_lifecycle', 'cli.js');
const T0 = new Date('2026-10-10T15:00:00Z');
let minute = 0;
const tick = () => new Date(T0.getTime() + (minute += 1) * 60000);
const expectCode = (fn, code) => assert.throws(fn, (err) => err.code === code, `expected ${code}`);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));
const rm = (...d) => d.forEach((x) => fs.rmSync(x, { recursive: true, force: true }));
const w = (abs, text) => { fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, text); return abs; };
const cli = (script, args) => { const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd: REPO }); return { code: r.status, out: r.stdout, err: r.stderr, text: `${r.stdout}\n${r.stderr}` }; };
const ENV = FIXTURE_POLICY.environment;

/** A data root with the fixture policy, one run scoped to module login with target scope `tests`, a target project. */
function targetWorkspace({ ownership = null } = {}) {
  const dataRoot = tmp('p94-'); const runsDir = path.join(dataRoot, 'runs'); fs.mkdirSync(runsDir);
  w(path.join(dataRoot, 'knowledge_base', 'execution_safety_policy.json'), JSON.stringify(FIXTURE_POLICY));
  const { folderName } = createRun(runsDir, { scope: 'Module', target: 'Login', now: T0, scopePaths: ['tests'], extraRunJson: { modules: ['login'] } });
  const target = tmp('p94-target-');
  w(path.join(target, 'tests', 'existing.spec.ts'), 'existing\n');
  w(path.join(target, 'src', 'app.ts'), 'app\n');
  if (ownership) w(path.join(target, '.baseline_ownership.json'), JSON.stringify(ownership));
  execFileSync('git', ['init', '-q'], { cwd: target }); // a registered target root is a git work tree (R-09)
  const src = (rel, text) => { w(path.join(runsDir, folderName, rel), text); return rel; };
  const root = tw.registerRoot(dataRoot, { kind: 'target', rootPath: target, approvedBy: 'QA Lead', reason: 'disposable test project', now: tick() });
  return { dataRoot, runsDir, folderName, target, src, root };
}
const authorize = (ws, action, ownership) => auth.saveAuthorizations({ dataRoot: ws.dataRoot, runFolder: ws.folderName, authorizations: [auth.createAuthorization({ runId: ws.folderName, action, ownership, environment: ENV, module: 'login', approvedAt: tick().toISOString(), approvedBy: 'Security Lead', policy: FIXTURE_POLICY })] });
const plan = (ws, changes, o = {}) => tw.planTargetWrite(ws.runsDir, ws.folderName, { rootId: ws.root.id, changes, environment: ENV, now: tick(), ...o });
const meta = (ws) => JSON.parse(fs.readFileSync(rs.runJsonPath(ws.runsDir, ws.folderName), 'utf8'));
const tree = (dir) => { const out = {}; (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isSymbolicLink()) continue; if (e.isDirectory()) walk(p); else out[path.relative(dir, p)] = fs.readFileSync(p, 'utf8'); } }(dir)); return out; };

// ---------------------------------------------------------------------------------------------
// Target / Reference Project writes
// ---------------------------------------------------------------------------------------------

test('target roots: registered by a named human only, never the platform, its data root, or a missing folder', () => {
  const ws = targetWorkspace();
  try {
    expectCode(() => tw.registerRoot(ws.dataRoot, { kind: 'target', rootPath: ws.target, approvedBy: 'Claude', reason: 'r', now: tick() }), 'INVALID_APPROVER');
    expectCode(() => tw.registerRoot(ws.dataRoot, { kind: 'target', rootPath: REPO, approvedBy: 'QA Lead', reason: 'r', now: tick() }), 'OUTSIDE_ROOT');
    expectCode(() => tw.registerRoot(ws.dataRoot, { kind: 'target', rootPath: ws.dataRoot, approvedBy: 'QA Lead', reason: 'r', now: tick() }), 'OUTSIDE_ROOT');
    expectCode(() => tw.registerRoot(ws.dataRoot, { kind: 'target', rootPath: path.join(ws.target, 'nope'), approvedBy: 'QA Lead', reason: 'r', now: tick() }), 'MISSING_ARTIFACT');
    expectCode(() => tw.registerRoot(ws.dataRoot, { kind: 'production', rootPath: ws.target, approvedBy: 'QA Lead', reason: 'r', now: tick() }), 'INVALID_ARGUMENT');
    expectCode(() => tw.planTargetWrite(ws.runsDir, ws.folderName, { rootId: 'TP-99', changes: [], environment: ENV, now: tick() }), 'UNKNOWN_ROOT');
  } finally { rm(ws.dataRoot, ws.target); }
});

test('target plan: traversal, absolute, .git, junction escape, out-of-scope, missing environment and a Forbidden delete are refused — recorded, nothing written', () => {
  const ws = targetWorkspace();
  const outside = tmp('p94-outside-');
  try {
    fs.symlinkSync(outside, path.join(ws.target, 'tests', 'linked'), 'junction');
    const s = ws.src('out/new.spec.ts', 'new\n');
    const before = tree(ws.target);
    const cases = [
      [[{ op: 'create', path: '../escape.ts', source: s }], /"\.\." segment/],
      [[{ op: 'create', path: path.join(ws.target, 'tests', 'abs.ts'), source: s }], /must be relative/],
      [[{ op: 'create', path: 'tests/.git/hooks/pre-commit', source: s }], /inside \.git/],
      [[{ op: 'create', path: 'tests/linked/evil.ts', source: s }], /symbolic link or junction/],
      [[{ op: 'update', path: 'src/app.ts', source: s }], /outside the run's target scope/],
      [[{ op: 'create', path: 'tests/a.ts', source: '../../../etc/passwd' }], /inside this run's folder/],
      [[{ op: 'delete', path: 'tests/existing.spec.ts' }], /DELETE on Shared .* is Forbidden/],
      [[{ op: 'update', path: 'tests/existing.spec.ts', source: s }], /needs a run authorization|Approval Required/],
    ];
    for (const [changes, re] of cases) {
      assert.throws(() => plan(ws, changes), (e) => e.code === 'PLAN_REFUSED' && re.test(e.message), String(re));
    }
    assert.throws(() => plan(ws, [{ op: 'create', path: 'tests/n.ts', source: s }], { environment: undefined }), /never defaulted/);
    assert.deepEqual(tree(ws.target), before, 'nothing written to the target');
    assert.deepEqual(fs.readdirSync(outside), []);
    const m = meta(ws);
    assert.ok(m.targetWritePlans.length >= cases.length && m.targetWritePlans.every((p) => p.status === 'refused'), 'refusals are recorded');
    assert.match(fs.readFileSync(path.join(ws.runsDir, ws.folderName, 'metadata', 'TargetWriteLedger.md'), 'utf8'), /plan-refused/);
  } finally { rm(ws.dataRoot, ws.target, outside); }
});

test('target ownership: another module\'s file and a shared file are refused; an unowned existing file is never replaced', () => {
  const ws = targetWorkspace({ ownership: { schemaVersion: 1, modules: { login: { owned: ['tests/login/**'] }, billing: { owned: ['tests/billing/**'] } }, shared: ['tests/shared/**'] } });
  try {
    w(path.join(ws.target, 'tests', 'billing', 'b.spec.ts'), 'b\n'); w(path.join(ws.target, 'tests', 'shared', 'Base.ts'), 'base\n');
    authorize(ws, 'UPDATE', 'Shared');
    const s = ws.src('out/x.ts', 'x\n');
    assert.throws(() => plan(ws, [{ op: 'update', path: 'tests/billing/b.spec.ts', source: s }]), /owned by module "billing"/);
    assert.throws(() => plan(ws, [{ op: 'update', path: 'tests/shared/Base.ts', source: s }]), /shared asset/);
    assert.throws(() => plan(ws, [{ op: 'update', path: 'tests/existing.spec.ts', source: s }]), /no module owns it/);
    assert.equal(plan(ws, [{ op: 'create', path: 'tests/login/new.spec.ts', source: s }]).status, 'planned');
  } finally { rm(ws.dataRoot, ws.target); }
});

test('target apply: only an approved plan, approved by a person, for exactly the reviewed fingerprint — once', () => {
  const ws = targetWorkspace();
  try {
    const p = plan(ws, [{ op: 'create', path: 'tests/new.spec.ts', source: ws.src('out/new.spec.ts', 'new\n') }]);
    expectCode(() => tw.applyTargetWrite(ws.runsDir, ws.folderName, { planId: p.id, now: tick() }), 'APPROVAL_REQUIRED');
    expectCode(() => tw.approveTargetWrite(ws.runsDir, ws.folderName, { planId: p.id, approvedBy: 'agent', now: tick() }), 'INVALID_APPROVER');
    expectCode(() => tw.approveTargetWrite(ws.runsDir, ws.folderName, { planId: p.id, approvedBy: 'QA Lead', fingerprint: 'f'.repeat(64), now: tick() }), 'FINGERPRINT_MISMATCH');
    tw.approveTargetWrite(ws.runsDir, ws.folderName, { planId: p.id, approvedBy: 'QA Lead', fingerprint: p.fingerprint, now: tick() });
    const r = tw.applyTargetWrite(ws.runsDir, ws.folderName, { planId: p.id, now: tick() });
    assert.equal(r.applied.length, 1);
    assert.equal(fs.readFileSync(path.join(ws.target, 'tests', 'new.spec.ts'), 'utf8'), 'new\n');
    expectCode(() => tw.applyTargetWrite(ws.runsDir, ws.folderName, { planId: p.id, now: tick() }), 'APPROVAL_REQUIRED');
    const events = meta(ws).targetWriteLedger.filter((e) => e.plan === p.id).map((e) => e.event);
    assert.deepEqual(events, ['planned', 'approved', 'applying', 'applied']);
  } finally { rm(ws.dataRoot, ws.target); }
});

test('target apply: a stale approval is refused — the target or the source changed after approval — and nothing is written', () => {
  const ws = targetWorkspace();
  try {
    authorize(ws, 'UPDATE', 'Shared');
    const s = ws.src('out/existing.spec.ts', 'changed\n');
    const p1 = plan(ws, [{ op: 'update', path: 'tests/existing.spec.ts', source: s }]);
    tw.approveTargetWrite(ws.runsDir, ws.folderName, { planId: p1.id, approvedBy: 'QA Lead', now: tick() });
    fs.writeFileSync(path.join(ws.target, 'tests', 'existing.spec.ts'), 'someone else\n');
    expectCode(() => tw.applyTargetWrite(ws.runsDir, ws.folderName, { planId: p1.id, now: tick() }), 'STALE_PLAN');
    assert.equal(fs.readFileSync(path.join(ws.target, 'tests', 'existing.spec.ts'), 'utf8'), 'someone else\n');
    const p2 = plan(ws, [{ op: 'update', path: 'tests/existing.spec.ts', source: s }]);
    tw.approveTargetWrite(ws.runsDir, ws.folderName, { planId: p2.id, approvedBy: 'QA Lead', now: tick() });
    fs.writeFileSync(path.join(ws.runsDir, ws.folderName, s), 'swapped after approval\n');
    expectCode(() => tw.applyTargetWrite(ws.runsDir, ws.folderName, { planId: p2.id, now: tick() }), 'STALE_PLAN');
    assert.equal(fs.readFileSync(path.join(ws.target, 'tests', 'existing.spec.ts'), 'utf8'), 'someone else\n');
    assert.deepEqual(meta(ws).targetWritePlans.map((p) => p.status), ['stale', 'stale']);
  } finally { rm(ws.dataRoot, ws.target); }
});

test('target apply: a failure part-way rolls every touched file back; a killed apply is refused until recovered, then restored', async () => {
  const ws = targetWorkspace();
  try {
    authorize(ws, 'UPDATE', 'Shared');
    const changes = [{ op: 'update', path: 'tests/existing.spec.ts', source: ws.src('out/1.ts', 'one\n') }, { op: 'create', path: 'tests/second.ts', source: ws.src('out/2.ts', 'two\n') }];
    const before = tree(ws.target);
    const p = plan(ws, changes);
    tw.approveTargetWrite(ws.runsDir, ws.folderName, { planId: p.id, approvedBy: 'QA Lead', now: tick() });
    fm._setTestHooks({ afterFile: (i) => { if (i === 0) throw new Error('disk full (simulated)'); } });
    try { expectCode(() => tw.applyTargetWrite(ws.runsDir, ws.folderName, { planId: p.id, now: tick() }), 'ROLLED_BACK'); } finally { fm._setTestHooks({}); }
    assert.deepEqual(tree(ws.target), before, 'rolled back');
    assert.equal(meta(ws).targetWritePlans.find((x) => x.id === p.id).status, 'rolled-back');
    // A process killed after the first file: the journal stays in-progress.
    const p2 = plan(ws, changes);
    tw.approveTargetWrite(ws.runsDir, ws.folderName, { planId: p2.id, approvedBy: 'QA Lead', now: tick() });
    const child = `const fm=require(${JSON.stringify(path.join(TOOLS, 'run_manager', 'fileMutation.js'))});fm._setTestHooks({afterFile:(i)=>{if(i===0)process.exit(9)}});
require(${JSON.stringify(path.join(TOOLS, 'run_manager', 'targetWrites.js'))}).applyTargetWrite(process.argv[1],process.argv[2],{planId:process.argv[3],now:new Date()});`;
    const code = await new Promise((res) => spawn(process.execPath, ['-e', child, ws.runsDir, ws.folderName, p2.id], { env: { ...process.env, NODE_TEST_CONTEXT: 'child-v8' } }).on('close', res));
    assert.equal(code, 9);
    assert.equal(fs.readFileSync(path.join(ws.target, 'tests', 'existing.spec.ts'), 'utf8'), 'one\n', 'the first file was written before the kill');
    expectCode(() => tw.applyTargetWrite(ws.runsDir, ws.folderName, { planId: p2.id, now: tick() }), 'INTERRUPTED');
    const p3 = plan(ws, [{ op: 'create', path: 'tests/third.ts', source: ws.src('out/3.ts', '3\n') }]);
    tw.approveTargetWrite(ws.runsDir, ws.folderName, { planId: p3.id, approvedBy: 'QA Lead', now: tick() });
    expectCode(() => tw.applyTargetWrite(ws.runsDir, ws.folderName, { planId: p3.id, now: tick() }), 'INTERRUPTED');
    expectCode(() => tw.recoverTargetWrite(ws.runsDir, ws.folderName, { planId: p2.id, by: 'bot', now: tick() }), 'INVALID_APPROVER');
    assert.equal(tw.recoverTargetWrite(ws.runsDir, ws.folderName, { planId: p2.id, by: 'QA Lead', now: tick() }).recovered, true);
    assert.deepEqual(tree(ws.target), before, 'restored to the approved "before" state');
    assert.ok(meta(ws).targetWriteLedger.some((e) => e.plan === p2.id && e.event === 'recovered'));
  } finally { fm._setTestHooks({}); rm(ws.dataRoot, ws.target); }
});

test('target apply: two processes applying the same approved plan — exactly one writes', async () => {
  const ws = targetWorkspace();
  try {
    const p = plan(ws, [{ op: 'create', path: 'tests/race.ts', source: ws.src('out/race.ts', 'race\n') }]);
    tw.approveTargetWrite(ws.runsDir, ws.folderName, { planId: p.id, approvedBy: 'QA Lead', now: tick() });
    const outs = await Promise.all([0, 1, 2].map(() => new Promise((res) => {
      const c = spawn(process.execPath, [TW, 'apply', '--run', ws.folderName, '--plan', p.id, '--runs-dir', ws.runsDir], { cwd: REPO });
      c.on('close', res);
    })));
    assert.equal(outs.filter((c) => c === 0).length, 1, `exit codes ${outs}`);
    assert.equal(meta(ws).targetWriteLedger.filter((e) => e.event === 'applied').length, 1);
  } finally { rm(ws.dataRoot, ws.target); }
});

test('target CLI: the documented flow works end to end, and a refused plan exits 1 with its reasons', () => {
  const ws = targetWorkspace();
  try {
    const ch = w(path.join(ws.dataRoot, 'changes.json'), JSON.stringify([{ op: 'create', path: 'tests/cli.ts', source: ws.src('out/cli.ts', 'cli\n') }]));
    const bad = w(path.join(ws.dataRoot, 'bad.json'), JSON.stringify([{ op: 'create', path: '../x.ts', source: 'out/cli.ts' }]));
    const r0 = cli(TW, ['plan', '--run', ws.folderName, '--root', ws.root.id, '--changes', bad, '--environment', ENV, '--runs-dir', ws.runsDir]);
    assert.equal(r0.code, 1); assert.match(r0.err, /PLAN_REFUSED/);
    const r1 = cli(TW, ['plan', '--run', ws.folderName, '--root', ws.root.id, '--changes', ch, '--environment', ENV, '--runs-dir', ws.runsDir]);
    assert.equal(r1.code, 0, r1.text);
    const id = r1.out.match(/Plan (TWP-\d+)/)[1];
    assert.equal(cli(TW, ['apply', '--run', ws.folderName, '--plan', id, '--runs-dir', ws.runsDir]).code, 1);
    assert.equal(cli(TW, ['approve', '--run', ws.folderName, '--plan', id, '--approved-by', 'QA Lead', '--runs-dir', ws.runsDir]).code, 0);
    assert.equal(cli(TW, ['apply', '--run', ws.folderName, '--plan', id, '--runs-dir', ws.runsDir]).code, 0);
    assert.ok(fs.existsSync(path.join(ws.target, 'tests', 'cli.ts')));
    assert.equal(cli(TW, ['plan', '--run', '../../x', '--root', ws.root.id, '--changes', ch, '--environment', ENV, '--runs-dir', ws.runsDir]).code, 1);
  } finally { rm(ws.dataRoot, ws.target); }
});

// ---------------------------------------------------------------------------------------------
// Baseline updates (Promoted modules) and shared assets — disposable git baselines
// ---------------------------------------------------------------------------------------------

function baselineRepo() {
  const root = tmp('p94-base-');
  const base = path.join(root, 'automation_baseline', 'playwright'); // <data root>/automation_baseline/<framework> (R-03)
  const modulesDir = path.join(root, 'modules');
  const git = (...a) => execFileSync('git', a, { cwd: base, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  w(path.join(base, '.baseline_ownership.json'), JSON.stringify({ schemaVersion: 1, modules: { login: { owned: ['tests/login/**'] }, billing: { owned: ['tests/billing/**'] } }, shared: ['shared/**'] }));
  w(path.join(base, 'tests', 'login', 'a.spec.ts'), 'import { Base } from "../../shared/Base";\nlogin a\n');
  w(path.join(base, 'tests', 'billing', 'b.spec.ts'), 'import { Base } from "../../shared/Base";\nbilling b\n');
  w(path.join(base, 'shared', 'Base.ts'), 'export class Base {}\n');
  w(path.join(base, 'other', 'readme.txt'), 'unowned\n');
  git('init', '-q'); git('add', '-A'); git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'c1');
  const c1 = git('rev-parse', 'HEAD');
  w(automationState.automationStatePath(modulesDir, 'login'), JSON.stringify({ module: 'login', state: 'Promoted', sourceOfTruth: 'baseline', baselineRef: c1, history: [{ state: 'Promoted', at: T0.toISOString() }] }));
  const commit = (msg) => { git('add', '-A'); git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', msg); return git('rev-parse', 'HEAD'); };
  return { root, base, modulesDir, git, c1, commit };
}

test('baseline update: an owned change is planned and recorded by a named human, with its restore point; never twice', () => {
  const b = baselineRepo();
  try {
    w(path.join(b.base, 'tests', 'login', 'a.spec.ts'), 'login a v2\n');
    const c2 = b.commit('login v2');
    const p = bu.planBaselineUpdate({ modulesDir: b.modulesDir, slug: 'login', baselineAbs: b.base, reason: 'selector repair', now: tick() });
    assert.deepEqual(p.files.map((f) => f.path), ['tests/login/a.spec.ts']);
    assert.equal(p.from, b.c1); assert.equal(p.to, c2);
    assert.throws(() => bu.recordGovernedBaselineUpdate({ modulesDir: b.modulesDir, slug: 'login', baselineAbs: b.base, id: p.id, approvedBy: 'Claude', now: tick() }), /AI agent|not a person/);
    const r = bu.recordGovernedBaselineUpdate({ modulesDir: b.modulesDir, slug: 'login', baselineAbs: b.base, id: p.id, approvedBy: 'Automation Lead', now: tick() });
    assert.equal(r.state.baselineRef, c2);
    const last = r.state.baselineUpdates.slice(-1)[0];
    assert.equal(last.approvedBy, 'Automation Lead');
    assert.equal(last.previousBaselineRef, b.c1, 'restore point kept');
    assert.match(r.record.rollback.command, new RegExp(`checkout ${b.c1.slice(0, 12)}`));
    expectCode(() => bu.recordGovernedBaselineUpdate({ modulesDir: b.modulesDir, slug: 'login', baselineAbs: b.base, id: p.id, approvedBy: 'Automation Lead', now: tick() }), 'ALREADY_RECORDED');
  } finally { rm(b.root); }
});

test('baseline update: another module\'s file, an unowned file, the ownership manifest, or an unapproved shared change in the diff refuses the whole update', () => {
  for (const [rel, text, re] of [
    ['tests/billing/b.spec.ts', 'billing changed\n', /owned by module "billing"/],
    ['other/readme.txt', 'changed\n', /owned by no module/],
    ['.baseline_ownership.json', JSON.stringify({ schemaVersion: 1, modules: { login: { owned: ['**'] } }, shared: [] }), /ownership manifest itself changed/],
    ['shared/Base.ts', 'export class Base { x = 1 }\n', /shared asset changed with no approved shared-asset change/],
  ]) {
    const b = baselineRepo();
    try {
      w(path.join(b.base, 'tests', 'login', 'a.spec.ts'), 'login a v2\n');
      w(path.join(b.base, rel), text);
      b.commit('mixed');
      assert.throws(() => bu.planBaselineUpdate({ modulesDir: b.modulesDir, slug: 'login', baselineAbs: b.base, reason: 'r', now: tick() }), (e) => e.code === 'UPDATE_REFUSED' && re.test(e.message), String(re));
      assert.ok(!fs.existsSync(bu.updatesDir(b.modulesDir, 'login')) || !fs.readdirSync(bu.updatesDir(b.modulesDir, 'login')).some((f) => f.endsWith('.json')), 'nothing planned');
    } finally { rm(b.root); }
  }
});

test('baseline update: stale approvals are refused — the restore point moved, the disk drifted, or the manifest was edited — and an interrupted record finishes once', () => {
  const b = baselineRepo();
  try {
    w(path.join(b.base, 'tests', 'login', 'a.spec.ts'), 'v2\n');
    b.commit('v2');
    const p1 = bu.planBaselineUpdate({ modulesDir: b.modulesDir, slug: 'login', baselineAbs: b.base, reason: 'r', now: tick() });
    const p2 = bu.planBaselineUpdate({ modulesDir: b.modulesDir, slug: 'login', baselineAbs: b.base, reason: 'r', now: tick() });
    // Drift on disk after planning.
    fs.writeFileSync(path.join(b.base, 'tests', 'login', 'a.spec.ts'), 'uncommitted edit\n');
    expectCode(() => bu.recordGovernedBaselineUpdate({ modulesDir: b.modulesDir, slug: 'login', baselineAbs: b.base, id: p1.id, approvedBy: 'Automation Lead', now: tick() }), 'STALE_UPDATE');
    fs.writeFileSync(path.join(b.base, 'tests', 'login', 'a.spec.ts'), 'v2\n');
    // A hand-edited manifest.
    const f2 = path.join(bu.updatesDir(b.modulesDir, 'login'), `${p2.id}.json`);
    const rec2 = JSON.parse(fs.readFileSync(f2, 'utf8'));
    fs.writeFileSync(f2, JSON.stringify({ ...rec2, files: [...rec2.files, { path: 'tests/billing/b.spec.ts', status: 'M', contentSha: 'x' }] }));
    expectCode(() => bu.recordGovernedBaselineUpdate({ modulesDir: b.modulesDir, slug: 'login', baselineAbs: b.base, id: p2.id, approvedBy: 'Automation Lead', now: tick() }), 'TAMPERED');
    fs.writeFileSync(f2, JSON.stringify(rec2));
    // p1 recorded; p2 (same restore point) is now stale.
    bu.recordGovernedBaselineUpdate({ modulesDir: b.modulesDir, slug: 'login', baselineAbs: b.base, id: p1.id, approvedBy: 'Automation Lead', now: tick() });
    expectCode(() => bu.recordGovernedBaselineUpdate({ modulesDir: b.modulesDir, slug: 'login', baselineAbs: b.base, id: p2.id, approvedBy: 'Automation Lead', now: tick() }), 'STALE_UPDATE');
    // Interrupted: the Module Manager recorded it, the manifest was not updated — re-running finishes it, once.
    const f1 = path.join(bu.updatesDir(b.modulesDir, 'login'), `${p1.id}.json`);
    const rec1 = JSON.parse(fs.readFileSync(f1, 'utf8'));
    fs.writeFileSync(f1, JSON.stringify({ ...rec1, status: 'planned', approval: null }));
    const fin = bu.recordGovernedBaselineUpdate({ modulesDir: b.modulesDir, slug: 'login', baselineAbs: b.base, id: p1.id, approvedBy: 'Automation Lead', now: tick() });
    assert.equal(fin.finished, true);
    assert.equal(automationState.readAutomationState(b.modulesDir, 'login').baselineUpdates.length, 1, 'recorded once');
  } finally { rm(b.root); }
});

test('shared assets: only a declared shared path; impact analysis names the dependent modules; approval by a person; apply checks staleness; merge/update consume it once', () => {
  const b = baselineRepo();
  try {
    const src = w(path.join(b.root, 'Base.v2.ts'), 'export class Base { v = 2 }\n');
    assert.throws(() => shared.planSharedChange({ modulesDir: b.modulesDir, baselineAbs: b.base, relPath: 'tests/billing/b.spec.ts', operation: 'replace', sourceFile: src, reason: 'r', now: tick() }), (e) => e.code === 'NOT_SHARED');
    assert.throws(() => shared.planSharedChange({ modulesDir: b.modulesDir, baselineAbs: b.base, relPath: '../shared/Base.ts', operation: 'replace', sourceFile: src, reason: 'r', now: tick() }), /"\.\." segment/);
    const sac = shared.planSharedChange({ modulesDir: b.modulesDir, baselineAbs: b.base, relPath: 'shared/Base.ts', operation: 'replace', sourceFile: src, reason: 'add v', now: tick() });
    assert.deepEqual(sac.impact.modulesAffected, ['billing', 'login']);
    expectCode(() => shared.applySharedChange({ modulesDir: b.modulesDir, id: sac.id, baselineAbs: b.base }), 'APPROVAL_REQUIRED');
    assert.throws(() => shared.approveSharedChange({ modulesDir: b.modulesDir, id: sac.id, approvedBy: 'x', now: tick() }), /not a name/);
    // The approved content cannot be swapped after approval.
    shared.approveSharedChange({ modulesDir: b.modulesDir, id: sac.id, approvedBy: 'Automation Lead', fingerprint: sac.fingerprint, now: tick() });
    const content = path.join(shared.changesDirFor(b.modulesDir), `${sac.id}.content`);
    fs.writeFileSync(content, 'export class Base { evil = true }\n');
    expectCode(() => shared.applySharedChange({ modulesDir: b.modulesDir, id: sac.id, baselineAbs: b.base }), 'TAMPERED');
    fs.writeFileSync(content, fs.readFileSync(src));
    // Stale: the baseline file changed after approval.
    fs.writeFileSync(path.join(b.base, 'shared', 'Base.ts'), 'export class Base { other = 1 }\n');
    assert.throws(() => shared.applySharedChange({ modulesDir: b.modulesDir, id: sac.id, baselineAbs: b.base }), /not what was approved/);
    // Restore the exact approved bytes (git checkout would apply CRLF conversion on Windows — a real change).
    fs.writeFileSync(path.join(b.base, 'shared', 'Base.ts'), 'export class Base {}\n');
    shared.applySharedChange({ modulesDir: b.modulesDir, id: sac.id, baselineAbs: b.base });
    assert.equal(fs.readFileSync(path.join(b.base, 'shared', 'Base.ts'), 'utf8'), 'export class Base { v = 2 }\n');
    assert.equal(shared.readChange(shared.changesDirFor(b.modulesDir), sac.id).status, 'applied');
    // A baseline update carrying exactly an approved shared change consumes it; without one it is refused (above).
    // A different length from v2, so git's stat cache always sees the change (same size + same second = "nothing to commit").
    const src3 = w(path.join(b.root, 'Base.v3.ts'), 'export class Base { version = 3 }\n');
    b.commit('shared v2');
    automationState.recordBaselineUpdate(b.modulesDir, 'login', { now: tick(), approvedBy: 'Automation Lead', baselineRef: b.git('rev-parse', 'HEAD'), changedPaths: ['shared/Base.ts'] });
    const sac3 = shared.planSharedChange({ modulesDir: b.modulesDir, baselineAbs: b.base, relPath: 'shared/Base.ts', operation: 'replace', sourceFile: src3, reason: 'v3', now: tick() });
    shared.approveSharedChange({ modulesDir: b.modulesDir, id: sac3.id, approvedBy: 'Automation Lead', now: tick() });
    fs.copyFileSync(src3, path.join(b.base, 'shared', 'Base.ts'));
    b.commit('shared v3');
    const p = bu.planBaselineUpdate({ modulesDir: b.modulesDir, slug: 'login', baselineAbs: b.base, reason: 'v3', now: tick() });
    assert.deepEqual(p.sharedChanges, [sac3.id]);
    bu.recordGovernedBaselineUpdate({ modulesDir: b.modulesDir, slug: 'login', baselineAbs: b.base, id: p.id, approvedBy: 'Automation Lead', now: tick() });
    assert.equal(shared.readChange(shared.changesDirFor(b.modulesDir), sac3.id).status, 'consumed');
  } finally { rm(b.root); }
});

test('baseline / shared CLI: record-baseline-update and the shared-change verbs fail closed with one-line errors', () => {
  const b = baselineRepo();
  try {
    const r1 = cli(LC, ['record-baseline-update', '--module', 'login', '--baseline', b.base, '--update', 'BU-9', '--approved-by', 'Automation Lead', '--modules-dir', b.modulesDir]);
    assert.equal(r1.code, 1); assert.match(r1.err, /^UNKNOWN_UPDATE: /m); assert.doesNotMatch(r1.text, /\n\s+at /);
    const r2 = cli(LC, ['plan-shared-change', '--baseline', b.base, '--path', 'tests/login/a.spec.ts', '--operation', 'delete', '--reason', 'r', '--modules-dir', b.modulesDir]);
    assert.equal(r2.code, 1); assert.match(r2.err, /^NOT_SHARED: /m);
    w(path.join(b.base, 'tests', 'login', 'a.spec.ts'), 'v2\n'); b.commit('v2');
    const r3 = cli(LC, ['plan-baseline-update', '--module', 'login', '--baseline', b.base, '--reason', 'v2', '--modules-dir', b.modulesDir]);
    assert.equal(r3.code, 0, r3.text);
    const id = JSON.parse(r3.out).planned;
    assert.equal(cli(LC, ['record-baseline-update', '--module', 'login', '--baseline', b.base, '--update', id, '--approved-by', 'Automation Lead', '--modules-dir', b.modulesDir]).code, 0);
  } finally { rm(b.root); }
});

// ---------------------------------------------------------------------------------------------
// Platform Knowledge promotion
// ---------------------------------------------------------------------------------------------

function knowledgeWorkspace(content, { result = 'fixed', withSha = true } = {}) {
  const dataRoot = tmp('p94-kp-'); const runsDir = path.join(dataRoot, 'runs'); fs.mkdirSync(runsDir);
  const platformDir = tmp('p94-platform-');
  // A disposable Platform Knowledge folder is used only once a named human registers it (R-03).
  tw.registerRoot(dataRoot, { kind: 'platform-knowledge', rootPath: platformDir, approvedBy: 'Platform Owner', reason: 'disposable test knowledge folder', now: tick() });
  const { folderName } = createRun(runsDir, { scope: 'Module', target: 'Login', now: T0, extraRunJson: { modules: ['login'] } });
  const file = 'knowledge/patterns/repair/REPAIR-001.md';
  w(path.join(dataRoot, file), content);
  // A run.json 5H record as heal promote leaves it (fixture: a validated attempt and its promotion).
  const m = JSON.parse(fs.readFileSync(rs.runJsonPath(runsDir, folderName), 'utf8'));
  m.stages['5H'] = { ...(m.stages['5H'] || {}), repairOperations: [{ id: 'RO-1', attempts: { 'TC-LOGIN-001': [{ n: 1, strategy: 'replace locator', result, status: result === 'fixed' ? 'validated' : 'rejected', patch: { sha256: 'p'.repeat(64) }, validation: { rerun: `runs/${folderName}/execution/ExecutionResults.rerun-1.md`, by: 'QA Lead' } }] }, promotions: [{ id: 'REPAIR-001', file, ...(withSha ? { sha256: sha(content) } : {}), testCaseId: 'TC-LOGIN-001', attempt: 1, by: 'QA Lead' }] }] };
  fs.writeFileSync(rs.runJsonPath(runsDir, folderName), JSON.stringify(m, null, 2));
  return { dataRoot, runsDir, folderName, platformDir, file };
}
const GOOD = '# REPAIR-001 — Wait for the banner before asserting\n\nA locator raced the render; wait for the element to be attached.\n';

test('knowledge: only a validated, unmodified, secret-free project entry is proposed; review by a person; apply writes a new file once; verify catches edits and unapproved files', () => {
  const k = knowledgeWorkspace(GOOD);
  try {
    const prop = (o = {}) => kp.proposePromotion({ runsDir: k.runsDir, folderName: k.folderName, entryId: 'REPAIR-001', platformDir: k.platformDir, by: 'QA Lead', now: tick(), ...o });
    expectCode(() => prop({ entryId: 'REPAIR-999' }), 'UNKNOWN_SOURCE');
    const e = prop();
    expectCode(() => kp.applyPromotion({ id: e.id, runsDir: k.runsDir, platformDir: k.platformDir, now: tick() }), 'APPROVAL_REQUIRED');
    expectCode(() => kp.reviewPromotion({ runsDir: k.runsDir, id: e.id, decision: 'approve', by: 'ChatGPT', reason: 'r', platformDir: k.platformDir, now: tick() }), 'INVALID_APPROVER');
    kp.reviewPromotion({ runsDir: k.runsDir, id: e.id, decision: 'approve', by: 'Platform Owner', reason: 'framework-level timing pattern', fingerprint: e.fingerprint, platformDir: k.platformDir, now: tick() });
    const a = kp.applyPromotion({ id: e.id, runsDir: k.runsDir, platformDir: k.platformDir, now: tick() });
    const written = fs.readFileSync(path.join(k.platformDir, a.target), 'utf8');
    assert.match(written, /approved by Platform Owner/);
    assert.ok(written.endsWith(GOOD));
    expectCode(() => kp.applyPromotion({ id: e.id, runsDir: k.runsDir, platformDir: k.platformDir, now: tick() }), 'APPROVAL_REQUIRED');
    assert.equal(kp.verifyKnowledge({ platformDir: k.platformDir }).ok, true);
    fs.appendFileSync(path.join(k.platformDir, a.target), 'edited by hand\n');
    w(path.join(k.platformDir, kp.GOVERNED, 'REPAIR-777.md'), 'unapproved\n');
    const v = kp.verifyKnowledge({ platformDir: k.platformDir });
    assert.equal(v.ok, false);
    assert.ok(v.issues.some((i) => /modified after it was approved/.test(i)) && v.issues.some((i) => /REPAIR-777.*not in the promotion ledger/.test(i)));
    const r = cli(path.join(TOOLS, 'knowledge_promotion', 'cli.js'), ['verify', '--platform-dir', k.platformDir]);
    assert.equal(r.code, 2);
  } finally { rm(k.dataRoot, k.platformDir); }
});

test('knowledge: an unverified repair, a missing fingerprint, an edited source and secret-shaped content are refused; a source edited after approval is not applied', () => {
  const cases = [
    [knowledgeWorkspace(GOOD, { result: 'remaining' }), 'UNVERIFIED_KNOWLEDGE'],
    [knowledgeWorkspace(GOOD, { withSha: false }), 'NO_FINGERPRINT'],
    [knowledgeWorkspace(`${GOOD}\nLogin with password: Hunter2xyz! and token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJlMTIzNDU2\n`), 'SECRET_FOUND'],
  ];
  try {
    for (const [k, code] of cases) expectCode(() => kp.proposePromotion({ runsDir: k.runsDir, folderName: k.folderName, entryId: 'REPAIR-001', platformDir: k.platformDir, by: 'QA Lead', now: tick() }), code);
    const k = knowledgeWorkspace(GOOD);
    cases.push([k]);
    fs.appendFileSync(path.join(k.dataRoot, k.file), 'tampered\n');
    expectCode(() => kp.proposePromotion({ runsDir: k.runsDir, folderName: k.folderName, entryId: 'REPAIR-001', platformDir: k.platformDir, by: 'QA Lead', now: tick() }), 'SOURCE_MODIFIED');
    fs.writeFileSync(path.join(k.dataRoot, k.file), GOOD);
    const e = kp.proposePromotion({ runsDir: k.runsDir, folderName: k.folderName, entryId: 'REPAIR-001', platformDir: k.platformDir, by: 'QA Lead', now: tick() });
    kp.reviewPromotion({ runsDir: k.runsDir, id: e.id, decision: 'approve', by: 'Platform Owner', reason: 'r', platformDir: k.platformDir, now: tick() });
    fs.appendFileSync(path.join(k.dataRoot, k.file), 'after approval\n');
    expectCode(() => kp.applyPromotion({ id: e.id, runsDir: k.runsDir, platformDir: k.platformDir, now: tick() }), 'SOURCE_MODIFIED');
    assert.ok(!fs.existsSync(path.join(k.platformDir, kp.GOVERNED)) || fs.readdirSync(path.join(k.platformDir, kp.GOVERNED)).length === 0, 'nothing written');
  } finally { for (const [k] of cases) rm(k.dataRoot, k.platformDir); }
});

// ---------------------------------------------------------------------------------------------
// Execution boundaries, registry concurrency, other public writers
// ---------------------------------------------------------------------------------------------

test('live browser activity: a launch needs the stage\'s confirmed browser preflight in the same mode; Stages 2 and 4A can record one; nothing is read first', async () => {
  const ws = targetWorkspace();
  try {
    const bd = require('../../browser_driver/driver');
    const pn = require('../../browser_provider/providers/playwright_node/driver');
    for (const launch of [bd.launchAuthenticated, pn.launchAuthenticated]) {
      await assert.rejects(() => launch({ headless: true, credentialsPath: path.join(os.tmpdir(), 'nope.json') }), (e) => e.code === 'PREFLIGHT_REQUIRED');
      await assert.rejects(() => launch({ headless: true, preflight: { runsDir: ws.runsDir, run: ws.folderName, stage: '2' } }), (e) => e.code === 'PREFLIGHT_REQUIRED');
    }
    expectCode(() => rs.recordSafetyPreflight(ws.runsDir, ws.folderName, { stageId: '1', environment: ENV, targetUrl: 'https://qa.example.test', executionType: 'browser', executionMode: 'Headless', operations: [{ action: 'READ', ownership: 'DedicatedTestData' }], confirmedBy: 'QA Lead', now: tick() }), 'PREFLIGHT_REFUSED');
    const ids = {};
    for (const stageId of ['2', '4A']) {
      rs.recordSafetyPreflight(ws.runsDir, ws.folderName, { stageId, environment: ENV, targetUrl: 'https://qa.example.test', executionType: 'browser', executionMode: 'Headless', operations: [{ action: 'READ', ownership: 'DedicatedTestData' }], confirmedBy: 'QA Lead', now: tick() });
      const id = meta(ws).safetyPreflights.filter((p) => p.stageId === stageId).pop().id;
      ids[stageId] = id;
      // R-01 (Phase 9.5): the exact preflight, for a stage that is actually running.
      assert.throws(() => assertLivePreflight({ runsDir: ws.runsDir, run: ws.folderName, stage: stageId, id, headless: true }), (e) => e.code === 'STAGE_NOT_RUNNING');
      rs._setTestHooks({ skipEntryGate: true });
      try { rs.startStage(ws.runsDir, ws.folderName, { stageId, invocationPath: 'Direct', now: tick() }); } finally { rs._setTestHooks({}); }
      assert.equal(assertLivePreflight({ runsDir: ws.runsDir, run: ws.folderName, stage: stageId, id, headless: true }).stageId, stageId);
      assert.throws(() => assertLivePreflight({ runsDir: ws.runsDir, run: ws.folderName, stage: stageId, id, headless: false }), (e) => e.code === 'MODE_MISMATCH');
      assert.throws(() => assertLivePreflight({ runsDir: ws.runsDir, run: ws.folderName, stage: stageId, id: 'SP-999', headless: true }), (e) => e.code === 'PREFLIGHT_REQUIRED');
    }
    await assert.rejects(() => bd.launchAuthenticated({ headless: false, preflight: { runsDir: ws.runsDir, run: ws.folderName, stage: '2', id: ids['2'] } }), (e) => e.code === 'MODE_MISMATCH');
    const cliProvider = require('../../browser_provider/providers/playwright_cli');
    assert.throws(() => cliProvider.runSuite({ suiteDir: os.tmpdir(), mode: 'headed' }), (e) => e.code === 'PREFLIGHT_REQUIRED');
    assert.throws(() => cliProvider.runSuite({ suiteDir: os.tmpdir(), mode: 'headed', preflight: { runsDir: ws.runsDir, run: ws.folderName, stage: '4A', id: ids['4A'] } }), (e) => e.code === 'MODE_MISMATCH');
  } finally { rm(ws.dataRoot, ws.target); }
});

test('registry concurrency: ten processes proposing modules at once — no proposal is lost', async () => {
  const root = tmp('p94-reg-');
  try {
    const modulesDir = path.join(root, 'modules');
    const child = `require(${JSON.stringify(path.join(TOOLS, 'module_manager', 'moduleRegistry.js'))}).proposeModules(process.argv[1],[{name:'Module '+process.argv[2]}],{now:new Date()});`;
    const codes = await Promise.all(Array.from({ length: 10 }, (_, i) => new Promise((res) => spawn(process.execPath, ['-e', child, modulesDir, String.fromCharCode(65 + i)]).on('close', res))));
    assert.deepEqual(codes, Array(10).fill(0));
    const reg = moduleRegistry.readRegistry(modulesDir);
    assert.equal(reg.modules.length, 10, `registered: ${reg.modules.map((m) => m.slug).join(', ')}`);
    assert.deepEqual(fs.readdirSync(root).filter((n) => /lock/.test(n)), []);
  } finally { rm(root); }
});

test('other public writers fail closed: copy-in never overwrites or re-seeds a Promoted module; report build never clobbers a non-report file; rename-runs needs a person', () => {
  const root = tmp('p94-misc-');
  try {
    const base = path.join(root, 'baseline'); w(path.join(base, 'x.ts'), 'x\n');
    const mods = path.join(root, 'modules');
    const victim = w(path.join(root, 'project', 'src', 'keep.ts'), 'keep\n');
    const r1 = cli(LC, ['copy-in', '--baseline', base, '--package', path.join(root, 'project'), '--module', 'login', '--modules-dir', mods]);
    assert.equal(r1.code, 1); assert.match(r1.err, /OUTSIDE_MODULE/);
    assert.equal(cli(LC, ['copy-in', '--baseline', base, '--package', path.join(mods, 'login', 'automation', 'tests_Playwright'), '--modules-dir', mods]).code, 1, '--module required');
    w(path.join(mods, 'login', 'automation', 'tests_Playwright', 'mine.ts'), 'mine\n');
    const r2 = cli(LC, ['copy-in', '--baseline', base, '--package', path.join(mods, 'login', 'automation', 'tests_Playwright'), '--module', 'login', '--modules-dir', mods]);
    assert.equal(r2.code, 1); assert.match(r2.err, /DESTINATION_NOT_EMPTY/);
    w(automationState.automationStatePath(mods, 'billing'), JSON.stringify({ module: 'billing', state: 'Promoted', sourceOfTruth: 'baseline', baselineRef: 'abc1234', history: [] }));
    const r3 = cli(LC, ['copy-in', '--baseline', base, '--package', path.join(mods, 'billing', 'automation', 'tests_Playwright'), '--module', 'billing', '--modules-dir', mods]);
    assert.equal(r3.code, 1); assert.match(r3.err, /Promoted/);
    assert.equal(fs.readFileSync(victim, 'utf8'), 'keep\n');
    fs.mkdirSync(path.join(root, 'runs'), { recursive: true }); fs.mkdirSync(path.join(root, 'knowledge_base'), { recursive: true });
    const model = w(path.join(root, 'r.report.json'), JSON.stringify({ title: 'R', testCases: { categories: [{ key: 'k', cases: [{ title: 'A', status: 'PASS' }] }] } }));
    const RB = path.join(TOOLS, 'report_builder', 'cli.js');
    assert.equal(cli(RB, ['build', '--model', model, '--out', victim, '--data-root', root]).code, 1, 'not an .html file');
    const page = w(path.join(root, 'project', 'index.html'), '<html>hand-written</html>');
    assert.equal(cli(RB, ['build', '--model', model, '--out', page, '--data-root', root]).code, 1, 'not generated by report_builder');
    assert.equal(fs.readFileSync(page, 'utf8'), '<html>hand-written</html>');
    assert.equal(cli(RB, ['build', '--model', model, '--data-root', root]).code, 0);
    assert.equal(cli(RB, ['build', '--model', model, '--data-root', root]).code, 0, 'its own report is rebuilt');
    const { applyRunRenames } = require('../renameRuns');
    assert.throws(() => applyRunRenames(path.join(root, 'runs'), { renames: [], errors: [], unowned: [] }, { now: tick(), approvedBy: 'automation', reason: 'r' }), /placeholder|not a person|AI agent|not a name/);
  } finally { rm(root); }
});
