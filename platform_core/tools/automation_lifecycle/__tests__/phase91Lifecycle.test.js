// Phase 9.1 — regression tests for F-04 (workspace merge safety) and F-05 (safe module retirement).
// Every test builds a DISPOSABLE git repository holding a baseline and a modules/ folder.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const automationState = require('../../module_manager/automationState');
const moduleRegistry = require('../../module_manager/moduleRegistry');
const { retireModule, recoverRetirement, JOURNAL } = require('../retireModule');
const { ownershipPath } = require('../baselineOwnership');

const CLI = path.join(__dirname, '..', 'cli.js');
const T0 = new Date('2026-10-09T09:00:00Z');
let n = 0;
const tick = () => new Date(T0.getTime() + (n += 1) * 60000);

function repo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'p91-lc-'));
  const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' });
  git('init', '-q'); git('config', 'user.email', 't@example.com'); git('config', 'user.name', 'T'); git('config', 'commit.gpgsign', 'false'); git('config', 'core.autocrlf', 'false');
  // The baseline sits where a real one does — <data root>/automation_baseline/<framework> (shared-asset changes go only there, R-03).
  const base = path.join(root, 'automation_baseline', 'playwright'); const mods = path.join(root, 'modules');
  const w = (abs, text) => { fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, text); };
  w(path.join(base, 'tests', 'existing.spec.ts'), 'test("existing", () => {});\n');
  w(path.join(base, 'shared', 'TestBase.ts'), 'export class TestBase {}\n');
  moduleRegistry.registerModule(mods, { slug: 'login', name: 'Login', status: 'Active' }, { now: T0 });
  const pkg = path.join(mods, 'login', 'automation', 'tests_Playwright');
  // copy-in: the module project starts as a copy of the baseline, plus its own new file
  for (const rel of ['tests/existing.spec.ts', 'shared/TestBase.ts']) w(path.join(pkg, rel), fs.readFileSync(path.join(base, rel), 'utf8'));
  w(path.join(pkg, 'tests', 'login.spec.ts'), 'test("login", () => {});\n');
  git('add', '-A'); git('commit', '-qm', 'init');
  return { root, base, mods, pkg, git, w, commit: (m = 'c') => { git('add', '-A'); try { git('commit', '-qm', m); } catch { /* nothing */ } } };
}
const cleanup = (r) => fs.rmSync(r.root, { recursive: true, force: true });
const lc = (r, ...a) => { const x = spawnSync(process.execPath, [CLI, ...a, '--modules-dir', r.mods], { cwd: r.root, encoding: 'utf8' }); return { code: x.status, text: `${x.stdout}\n${x.stderr}`, out: x.stdout }; };
const merge = (r, extra = []) => lc(r, 'merge', '--baseline', r.base, '--package', r.pkg, '--project', 'Audit', '--package-name', 'login', '--module', 'login', '--run-folder', 'login-run-001', '--apply', ...extra);
const approve = (r) => { automationState.setAutomationState(r.mods, 'login', 'Generated', { now: tick() }); return automationState.setAutomationState(r.mods, 'login', 'Approved', { now: tick(), approvedBy: 'Automation Lead' }); };
const tree = (dir) => { const out = {}; const walk = (d) => { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else out[path.relative(dir, p)] = fs.readFileSync(p, 'utf8'); } }; walk(dir); return out; };
const commits = (r) => Number(r.git('rev-list', '--count', 'HEAD').trim());

// =============================================================================================
// F-04 — merge safety
// =============================================================================================

test('F-04 (Phase 9 G-9): a Generated module is never merged — refused before any write, baseline and history untouched', () => {
  const r = repo();
  try {
    automationState.setAutomationState(r.mods, 'login', 'Generated', { now: tick() });
    const before = tree(r.base); const c0 = commits(r);
    const m = merge(r);
    assert.equal(m.code, 1, m.text);
    assert.match(m.text, /MERGE_UNSAFE/);
    assert.match(m.text, /not Approved/);
    assert.deepEqual(tree(r.base), before);
    assert.equal(commits(r), c0, 'no commit was made');
  } finally { cleanup(r); }
});

test('F-04: an automation state hand-set to Approved (no approver, no history) is not approval provenance', () => {
  const r = repo();
  try {
    r.w(path.join(r.mods, 'login', 'automation', '.module_automation_state.json'), JSON.stringify({ state: 'Approved' }));
    const m = merge(r);
    assert.equal(m.code, 1);
    assert.match(m.text, /names no approver/);
    assert.match(m.text, /no Approved entry in its history/);
    assert.match(m.text, /recorded no revision/);
    assert.equal(fs.existsSync(path.join(r.base, 'tests', 'login.spec.ts')), false);
  } finally { cleanup(r); }
});

test('F-04: code changed after approval is not the approved revision — refused', () => {
  const r = repo();
  try {
    approve(r);
    r.w(path.join(r.pkg, 'tests', 'login.spec.ts'), 'test("login — edited after approval", () => {});\n');
    r.commit();
    const m = merge(r);
    assert.equal(m.code, 1);
    assert.match(m.text, /changed since it was approved/);
  } finally { cleanup(r); }
});

test('F-04: deleting an unrelated baseline file, or replacing one the module does not own, is refused; a declared shared file is replaced only with an approved shared-asset change (Phase 9.4)', () => {
  const r = repo();
  try {
    fs.rmSync(path.join(r.pkg, 'tests', 'existing.spec.ts')); // the package no longer carries it → the plan would delete it
    r.w(path.join(r.pkg, 'shared', 'TestBase.ts'), 'export class TestBase { changed = true }\n');
    approve(r); r.commit();
    const before = tree(r.base);
    const m = merge(r);
    assert.equal(m.code, 1);
    assert.match(m.text, /delete tests\/existing\.spec\.ts: an existing baseline file this module does not own/);
    assert.match(m.text, /replace shared\/TestBase\.ts: an existing baseline file this module does not own/);
    assert.deepEqual(tree(r.base), before, 'nothing deleted, nothing replaced');
    // declared shared (ownership manifest, reviewed and committed): still refused without an approved shared change
    r.w(ownershipPath(r.base), JSON.stringify({ schemaVersion: 1, modules: {}, shared: ['shared/**'] }));
    r.commit();
    const m2 = merge(r);
    assert.equal(m2.code, 1);
    assert.match(m2.text, /replace shared\/TestBase\.ts: a shared baseline file — it is replaced only through an approved shared-asset change/);
    assert.match(m2.text, /delete tests\/existing\.spec\.ts/);
    // An approved change for exactly this content covers the replacement (the deletion is still refused).
    // eslint-disable-next-line global-require
    const shared = require('../sharedAssets');
    const sac = shared.planSharedChange({ modulesDir: r.mods, baselineAbs: r.base, relPath: 'shared/TestBase.ts', operation: 'replace', sourceFile: path.join(r.pkg, 'shared', 'TestBase.ts'), reason: 'base class flag', now: tick() });
    shared.approveSharedChange({ modulesDir: r.mods, id: sac.id, approvedBy: 'Automation Lead', now: tick() });
    const m3 = merge(r);
    assert.equal(m3.code, 1);
    assert.doesNotMatch(m3.text, /replace shared\/TestBase\.ts/);
    assert.match(m3.text, /delete tests\/existing\.spec\.ts/);
  } finally { cleanup(r); }
});

test('F-04: a path owned by another module, or another module\'s package, is refused', () => {
  const r = repo();
  try {
    r.w(ownershipPath(r.base), JSON.stringify({ schemaVersion: 1, modules: { billing: { owned: ['tests/billing/**'] } }, shared: [] }));
    r.w(path.join(r.pkg, '.baseline_ownership.json'), fs.readFileSync(ownershipPath(r.base), 'utf8'));
    r.w(path.join(r.pkg, 'tests', 'billing', 'steal.spec.ts'), 'test("x", () => {});\n');
    approve(r); r.commit();
    const m = merge(r);
    assert.equal(m.code, 1);
    assert.match(m.text, /add tests\/billing\/steal\.spec\.ts: inside a path owned by module "billing"/);
    moduleRegistry.registerModule(r.mods, { slug: 'billing', name: 'Billing', status: 'Active' }, { now: T0 });
    const other = path.join(r.mods, 'billing', 'automation', 'tests_Playwright');
    r.w(path.join(other, 'x.ts'), 'x\n'); r.commit();
    const m2 = lc(r, 'merge', '--baseline', r.base, '--package', other, '--project', 'Audit', '--package-name', 'login', '--module', 'login', '--run-folder', 'r', '--apply');
    assert.equal(m2.code, 1);
    assert.match(m2.text, /is not module "login"'s automation project/);
  } finally { cleanup(r); }
});

test('F-04: an Approved, exact-revision, owned merge applies — manifest written first, commit names the recorded approver, assembly recorded', () => {
  const r = repo();
  try {
    const st = approve(r); r.commit();
    const dry = lc(r, 'merge', '--baseline', r.base, '--package', r.pkg, '--project', 'Audit', '--package-name', 'login', '--module', 'login', '--run-folder', 'login-run-001');
    assert.equal(dry.code, 0);
    assert.equal(JSON.parse(dry.out).manifest.safe, true);
    const m = merge(r);
    assert.equal(m.code, 0, m.text);
    assert.equal(fs.readFileSync(path.join(r.base, 'tests', 'login.spec.ts'), 'utf8'), 'test("login", () => {});\n');
    assert.equal(fs.readFileSync(path.join(r.base, 'tests', 'existing.spec.ts'), 'utf8'), 'test("existing", () => {});\n');
    const msg = r.git('log', '-1', '--format=%B');
    assert.match(msg, /Automation Approval by Automation Lead/);
    const manifests = fs.readdirSync(path.join(r.mods, 'login', 'automation', 'merge_manifests'));
    assert.equal(manifests.length, 1);
    const man = JSON.parse(fs.readFileSync(path.join(r.mods, 'login', 'automation', 'merge_manifests', manifests[0]), 'utf8'));
    assert.deepEqual(man.changes.added.map((x) => x.path), ['tests/login.spec.ts']);
    assert.deepEqual(man.changes.deleted, []);
    const after = automationState.readAutomationState(r.mods, 'login');
    assert.ok(after.assembledAt);
    assert.equal(after.assembledRevision.sha256, st.approvedRevision.projects.tests_Playwright.sha256);
  } finally { cleanup(r); }
});

// =============================================================================================
// F-05 — safe retirement
// =============================================================================================

function assembled(r) {
  approve(r); r.commit();
  const m = merge(r);
  assert.equal(m.code, 0, m.text);
  r.commit();
}
const retire = (r, o = {}) => retireModule({ modulesDir: r.mods, slug: 'login', baselineAbs: r.base, packageAbs: r.pkg, owned: ['tests/login.spec.ts'], promotedBy: 'Release Manager', now: tick(), apply: true, execFileSync, ...o });
const snapshotOf = (r) => ({ pkg: tree(r.pkg), ownership: fs.existsSync(ownershipPath(r.base)) ? fs.readFileSync(ownershipPath(r.base), 'utf8') : null, state: fs.readFileSync(automationState.automationStatePath(r.mods, 'login'), 'utf8') });

test('F-05 (Phase 9 G-10): a not-Approved, never-assembled module is refused BEFORE any mutation — working copy, ownership and state unchanged (CLI)', () => {
  const r = repo();
  try {
    automationState.setAutomationState(r.mods, 'login', 'Generated', { now: tick() });
    r.w(path.join(r.base, 'tests', 'login.spec.ts'), fs.readFileSync(path.join(r.pkg, 'tests', 'login.spec.ts'), 'utf8')); // verification would pass
    r.commit();
    const before = snapshotOf(r);
    const x = lc(r, 'retire-module', '--module', 'login', '--baseline', r.base, '--package', r.pkg, '--owned', 'tests/login.spec.ts', '--by', 'Reviewer', '--apply');
    assert.equal(x.code, 1);
    assert.match(x.text, /RETIREMENT_PRECONDITION/);
    assert.match(x.text, /not Approved/);
    assert.match(x.text, /never been assembled/);
    assert.deepEqual(snapshotOf(r), before);
  } finally { cleanup(r); }
});

test('F-05: an owned path that matches nothing, a revision changed after approval, or a failed byte-identity check is refused before any mutation', () => {
  const r = repo();
  try {
    assembled(r);
    const before = snapshotOf(r);
    assert.throws(() => retire(r, { owned: ['tests/nothing/**'] }), /matches no file in the baseline/);
    r.w(path.join(r.pkg, 'tests', 'login.spec.ts'), 'edited\n');
    assert.throws(() => retire(r), (e) => e.code === 'RETIREMENT_PRECONDITION' && /changed since it was approved/.test(e.message) && /byte-identity verification failed/.test(e.message));
    r.w(path.join(r.pkg, 'tests', 'login.spec.ts'), 'test("login", () => {});\n');
    assert.deepEqual(snapshotOf(r), before);
  } finally { cleanup(r); }
});

test('F-05: a valid retirement promotes the module; the journal and the moved-aside copy are gone', () => {
  const r = repo();
  try {
    assembled(r);
    const res = retire(r);
    assert.equal(res.state, 'Promoted');
    assert.equal(fs.existsSync(r.pkg), false);
    assert.equal(automationState.readAutomationState(r.mods, 'login').state, 'Promoted');
    assert.ok(JSON.parse(fs.readFileSync(ownershipPath(r.base), 'utf8')).modules.login);
    assert.equal(fs.existsSync(path.join(r.mods, 'login', 'automation', JOURNAL)), false);
    assert.deepEqual(fs.readdirSync(path.join(r.mods, 'login', 'automation')).filter((x) => /retiring/.test(x)), []);
  } finally { cleanup(r); }
});

for (const point of ['before-ownership', 'after-ownership', 'after-move-aside', 'after-promotion']) {
  test(`F-05 failure injection at "${point}": rolled back exactly — working copy, ownership manifest and automation state as before`, () => {
    const r = repo();
    try {
      assembled(r);
      const before = snapshotOf(r);
      assert.throws(() => retire(r, { inject: (p) => { if (p === point) throw new Error(`injected at ${p}`); } }), (e) => e.code === 'RETIREMENT_ROLLED_BACK');
      assert.deepEqual(snapshotOf(r), before);
      assert.equal(fs.existsSync(path.join(r.mods, 'login', 'automation', JOURNAL)), false);
      assert.deepEqual(fs.readdirSync(path.join(r.mods, 'login', 'automation')).filter((x) => /retiring/.test(x)), []);
      assert.equal(retire(r).state, 'Promoted', 'a clean retry succeeds');
    } finally { cleanup(r); }
  });
}

test('F-05 failure injection at "before-delete": Promoted is recorded, nothing is lost, and --recover finishes the cleanup', () => {
  const r = repo();
  try {
    assembled(r);
    assert.throws(() => retire(r, { inject: (p) => { if (p === 'before-delete') throw new Error('crash'); } }), /crash/);
    assert.equal(automationState.readAutomationState(r.mods, 'login').state, 'Promoted');
    const aside = fs.readdirSync(path.join(r.mods, 'login', 'automation')).filter((x) => /retiring/.test(x));
    assert.equal(aside.length, 1, 'the working copy was moved aside, not lost');
    const x = lc(r, 'retire-module', '--module', 'login', '--recover');
    assert.equal(x.code, 0, x.text);
    assert.match(x.text, /completed/);
    assert.deepEqual(fs.readdirSync(path.join(r.mods, 'login', 'automation')).filter((y) => /retiring/.test(y)), []);
  } finally { cleanup(r); }
});

test('F-05: a process killed mid-retirement leaves a journal; retirement is refused until --recover rolls it back', () => {
  const r = repo();
  try {
    assembled(r);
    const before = snapshotOf(r);
    const child = `
      const { execFileSync } = require('child_process');
      const { retireModule } = require(${JSON.stringify(path.join(__dirname, '..', 'retireModule'))});
      retireModule({ modulesDir: ${JSON.stringify(r.mods)}, slug: 'login', baselineAbs: ${JSON.stringify(r.base)}, packageAbs: ${JSON.stringify(r.pkg)},
        owned: ['tests/login.spec.ts'], promotedBy: 'RM', now: new Date('2026-10-10T00:00:00Z'), apply: true, execFileSync,
        inject: (p) => { if (p === 'after-move-aside') process.exit(9); } });`;
    const k = spawnSync(process.execPath, ['-e', child], { encoding: 'utf8' });
    assert.equal(k.status, 9);
    assert.equal(fs.existsSync(path.join(r.mods, 'login', 'automation', JOURNAL)), true);
    assert.equal(fs.existsSync(r.pkg), false, 'the copy was moved aside when the process died');
    assert.throws(() => retire(r), /did not finish/);
    const rec = recoverRetirement(r.mods, 'login');
    assert.equal(rec.action, 'rolled-back');
    assert.deepEqual(snapshotOf(r), before, 'working copy, ownership and state restored exactly');
  } finally { cleanup(r); }
});
