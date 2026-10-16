// Phase 9.5 — regression tests for the final re-audit's platform defects (R-01 … R-06, R-09, R-15), each from its
// original reproduction. Disposable data roots, projects and dummy credentials only; no browser is launched (every
// driver probe is refused before launch) and no real credential file is read.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync, execFileSync } = require('child_process');

const rs = require('../runState');
const tw = require('../targetWrites');
const fm = require('../fileMutation');
const kp = require('../knowledgePromotion');
const pf = require('../executionPreflight');
const { createRun } = require('../createRun');
const { FIXTURE_POLICY } = require('./approvalFixture');
const auth = require('../../execution_safety/authorizations');
const shared = require('../../automation_lifecycle/sharedAssets');
const { sanitizeKnowledge } = require('../repairGovernance');

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const TOOLS = path.join(REPO, 'platform_core', 'tools');
const T0 = new Date('2026-10-10T18:00:00Z');
let minute = 0;
const tick = () => new Date(T0.getTime() + (minute += 1) * 60000);
const ENV = FIXTURE_POLICY.environment;
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));
const rm = (...d) => d.forEach((x) => fs.rmSync(x, { recursive: true, force: true }));
const w = (abs, t) => { fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, t); return abs; };
const cli = (script, args) => { const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd: REPO }); return { code: r.status, out: r.stdout, err: r.stderr }; };
const meta = (runsDir, run) => JSON.parse(fs.readFileSync(rs.runJsonPath(runsDir, run), 'utf8'));

function dataRoot({ scopePaths = ['tests'] } = {}) {
  const root = tmp('p95r-'); const runsDir = path.join(root, 'runs'); fs.mkdirSync(runsDir);
  w(path.join(root, 'knowledge_base', 'execution_safety_policy.json'), JSON.stringify(FIXTURE_POLICY));
  const { folderName } = createRun(runsDir, { scope: 'Module', target: 'Login', now: tick(), scopePaths, extraRunJson: { modules: ['login'] } });
  return { root, runsDir, folderName };
}
function project() {
  const dir = tmp('p95r-proj-');
  w(path.join(dir, 'tests', 'a.spec.ts'), 'a\n');
  execFileSync('git', ['init', '-q'], { cwd: dir });
  return dir;
}
const register = (d, dir, kind = 'target') => tw.registerRoot(d.root, { kind, rootPath: dir, approvedBy: 'QA Lead', reason: 'disposable test project', now: tick() });
const src = (d, rel, t, run = d.folderName) => { w(path.join(d.runsDir, run, rel), t); return rel; };
const authorizeUpdate = (d, run = d.folderName) => auth.saveAuthorizations({ dataRoot: d.root, runFolder: run, authorizations: [auth.createAuthorization({ runId: run, action: 'UPDATE', ownership: 'Shared', environment: ENV, module: 'login', approvedAt: tick().toISOString(), approvedBy: 'Security Lead', policy: FIXTURE_POLICY })] });

// ---------------------------------------------------------------------------------------------
// R-01 — the browser session must be the one the preflight confirmed
// ---------------------------------------------------------------------------------------------

function livePreflight(d, stageId, mode = 'Headless') {
  rs.recordSafetyPreflight(d.runsDir, d.folderName, { stageId, environment: ENV, targetUrl: 'https://qa.example.test', executionType: 'browser', executionMode: mode, operations: [{ action: 'READ', ownership: 'DedicatedTestData' }], confirmedBy: 'QA Lead', now: tick() });
  rs._setTestHooks({ skipEntryGate: true });
  try { rs.startStage(d.runsDir, d.folderName, { stageId, invocationPath: 'Direct', now: tick() }); } finally { rs._setTestHooks({}); }
  return meta(d.runsDir, d.folderName).safetyPreflights.filter((p) => p.stageId === stageId).pop().id;
}

test('R-01: a Staging preflight never opens a PROD-credential session or another host — refused before any browser starts', async () => {
  const d = dataRoot();
  const credsDir = tmp('p95r-creds-');
  try {
    const id = livePreflight(d, '2');
    const creds = (environment, baseUrl) => w(path.join(credsDir, `${environment}-${Date.now()}-${Math.random()}.json`), JSON.stringify({ environment, username: 'dummy-user', password: 'dummy-not-a-secret', agencyCode: 'X', baseUrl }));
    const bd = require('../../browser_driver/driver');
    const pre = { runsDir: d.runsDir, run: d.folderName, stage: '2', id };
    // The original reproduction: env PROD under a Staging preflight.
    await assert.rejects(() => bd.launchAuthenticated({ env: 'PROD', headless: true, credentialsPath: creds('PROD', 'https://qa.example.test'), preflight: pre }), (e) => e.code === 'ENVIRONMENT_MISMATCH');
    await assert.rejects(() => bd.launchAuthenticated({ headless: true, credentialsPath: creds('Production', 'https://qa.example.test'), preflight: pre }), (e) => e.code === 'ENVIRONMENT_MISMATCH');
    await assert.rejects(() => bd.launchAuthenticated({ headless: true, credentialsPath: creds('STG', 'https://prod.example.test'), preflight: pre }), (e) => e.code === 'TARGET_MISMATCH');
    await assert.rejects(() => bd.launchAuthenticated({ headless: true, credentialsPath: creds('STG', 'http://qa.example.test'), preflight: pre }), (e) => e.code === 'TARGET_MISMATCH', 'scheme counts');
    // The same check, directly: the matching session passes (alias STG = Staging, same origin, any path).
    const record = pf.assertLivePreflight({ ...pre, headless: true });
    assert.equal(pf.assertSessionMatchesPreflight({ record, runsDir: d.runsDir, environment: 'STG', url: 'https://qa.example.test/login?x=1' }), true);
    assert.throws(() => pf.assertSessionMatchesPreflight({ record, runsDir: d.runsDir, environment: '', url: 'https://qa.example.test' }), (e) => e.code === 'ENVIRONMENT_MISMATCH');
    assert.throws(() => pf.assertSessionMatchesPreflight({ record, runsDir: d.runsDir, environment: 'STG', url: 'not a url' }), (e) => e.code === 'TARGET_MISMATCH');
    // Another run's preflight id, or the right id for a stage that is not running, is refused.
    const other = dataRoot();
    try {
      assert.throws(() => pf.assertLivePreflight({ runsDir: other.runsDir, run: other.folderName, stage: '2', id, headless: true }), (e) => e.code === 'PREFLIGHT_REQUIRED');
    } finally { rm(other.root); }
    // runSuite: environment and base URL must match too, and are handed to the suite.
    const cliP = require('../../browser_provider/providers/playwright_cli');
    const id4a = livePreflight(d, '4A', 'Headed');
    const p4 = { runsDir: d.runsDir, run: d.folderName, stage: '4A', id: id4a };
    assert.throws(() => cliP.runSuite({ suiteDir: os.tmpdir(), mode: 'headed', preflight: p4, environment: 'PROD', baseUrl: 'https://qa.example.test' }), (e) => e.code === 'ENVIRONMENT_MISMATCH');
    assert.throws(() => cliP.runSuite({ suiteDir: os.tmpdir(), mode: 'headed', preflight: p4, environment: 'STG', baseUrl: 'https://other.example.test' }), (e) => e.code === 'TARGET_MISMATCH');
    assert.throws(() => cliP.runSuite({ suiteDir: os.tmpdir(), mode: 'headed', preflight: p4 }), (e) => e.code === 'ENVIRONMENT_MISMATCH');
  } finally { rm(d.root, credsDir); }
});

// ---------------------------------------------------------------------------------------------
// R-02 — no access to .git by case, trailing dots/spaces, streams, junctions or canonical path
// ---------------------------------------------------------------------------------------------

test('R-02: .GIT, .git., ".git ", alternate data streams and a junction into .git are all refused; nothing reaches .git', () => {
  const dir = project();
  const outsideGit = path.join(dir, '.git');
  try {
    fs.symlinkSync(outsideGit, path.join(dir, 'tests', 'gitlink'), 'junction');
    const before = fs.readdirSync(path.join(outsideGit, 'hooks')).sort();
    for (const rel of ['.GIT/hooks/pre-commit', '.Git/config', '.git./hooks/pre-commit', '.git /hooks/pre-commit', 'tests/../.git/x', '.git::$INDEX_ALLOCATION/hooks/x', 'tests/a.ts:hidden', 'tests/gitlink/hooks/pre-commit', 'tests\\gitlink\\config']) {
      assert.throws(() => fm.resolveInside(dir, rel, 'p'), (e) => e.code === 'OUTSIDE_ROOT', rel);
    }
    assert.ok(fm.resolveInside(dir, 'tests/new.spec.ts', 'p'));
    // The original reproduction end to end: a run scoped to ".GIT".
    const d = dataRoot({ scopePaths: ['.GIT'] });
    try {
      register(d, dir);
      assert.throws(() => tw.planTargetWrite(d.runsDir, d.folderName, { rootId: 'TP-1', changes: [{ op: 'create', path: '.GIT/hooks/pre-commit', source: src(d, 'out/hook', '#!/bin/sh\n') }], environment: ENV, now: tick() }), (e) => e.code === 'PLAN_REFUSED' && /inside \.git/.test(e.message));
    } finally { rm(d.root); }
    assert.deepEqual(fs.readdirSync(path.join(outsideGit, 'hooks')).sort(), before, '.git untouched');
    // A root registered inside .git is refused too.
    assert.match(tw.unsafeRootReason(path.join(dir, '.GIT', 'hooks')) || '', /\.git/);
  } finally { rm(dir); }
});

// ---------------------------------------------------------------------------------------------
// R-03 — shared assets, knowledge and report output only to permitted roots
// ---------------------------------------------------------------------------------------------

test('R-03: a folder with its own ownership file is not a baseline; knowledge and reports go only to permitted roots', () => {
  const d = dataRoot();
  const side = tmp('p95r-side-');
  try {
    // The original reproduction: shared-asset commands aimed at an arbitrary folder declaring shared ['**'].
    w(path.join(side, 'src', 'app.ts'), 'original\n');
    w(path.join(side, '.baseline_ownership.json'), JSON.stringify({ schemaVersion: 1, modules: {}, shared: ['**'] }));
    const s = w(path.join(tmp('p95r-src-'), 'app.ts'), 'replaced\n');
    assert.throws(() => shared.planSharedChange({ modulesDir: path.join(d.root, 'modules'), baselineAbs: side, relPath: 'src/app.ts', operation: 'replace', sourceFile: s, reason: 'r', now: tick() }), (e) => e.code === 'NOT_A_BASELINE');
    assert.equal(fs.readFileSync(path.join(side, 'src', 'app.ts'), 'utf8'), 'original\n');
    // Knowledge: an unregistered --platform-dir is refused (before anything else is read).
    assert.throws(() => kp.proposePromotion({ runsDir: d.runsDir, folderName: d.folderName, entryId: 'REPAIR-001', platformDir: side, by: 'QA Lead', now: tick() }), (e) => e.code === 'NOT_PERMITTED_ROOT');
    assert.throws(() => kp.reviewPromotion({ runsDir: d.runsDir, id: 'KP-1', decision: 'approve', by: 'Platform Owner', reason: 'r', platformDir: side, now: tick() }), (e) => e.code === 'NOT_PERMITTED_ROOT');
    // Reports: --out outside the data root (and every report-output root) is refused; inside, or registered, is fine.
    const model = w(path.join(d.root, 'runs', 'r.report.json'), JSON.stringify({ title: 'R', testCases: { categories: [{ key: 'k', cases: [{ title: 'A', status: 'PASS' }] }] } }));
    const RB = path.join(TOOLS, 'report_builder', 'cli.js');
    const out = cli(RB, ['build', '--model', model, '--out', path.join(side, 'new.html'), '--data-root', d.root]);
    assert.equal(out.code, 1); assert.match(out.err, /outside the platform data root/);
    assert.ok(!fs.existsSync(path.join(side, 'new.html')));
    assert.equal(cli(RB, ['build', '--model', model, '--data-root', d.root]).code, 0);
    assert.equal(cli(RB, ['build', '--model', model, '--out', path.join(side, 'new.html'), '--data-root', side]).code, 1, 'a fake data root is not one');
    execFileSync('git', ['init', '-q'], { cwd: side });
    register(d, side, 'report-output');
    assert.equal(cli(RB, ['build', '--model', model, '--out', path.join(side, 'reports', 'r.html'), '--data-root', d.root]).code, 0);
    // Observability --out-dir: outside the data root refused.
    const o = cli(path.join(TOOLS, 'observability', 'cli.js'), ['health', '--run', d.folderName, '--data-root', d.root, '--out', '--out-dir', tmp('p95r-out-')]);
    assert.equal(o.code, 1); assert.match(o.err, /outside the data root/);
  } finally { rm(d.root, side); }
});

// ---------------------------------------------------------------------------------------------
// R-04 — two runs, the same target file, applied concurrently: never a lost update
// ---------------------------------------------------------------------------------------------

test('R-04: two runs\' approved plans for one target file applied at the same moment — exactly one applies, the other is stale (8 trials)', async () => {
  const d = dataRoot();
  const dir = project();
  try {
    register(d, dir);
    const { folderName: b } = createRun(d.runsDir, { scope: 'Module', target: 'Login', now: tick(), scopePaths: ['tests'], extraRunJson: { modules: ['login'] } });
    authorizeUpdate(d); authorizeUpdate(d, b);
    let lost = 0;
    for (let t = 0; t < 8; t++) {
      fs.writeFileSync(path.join(dir, 'tests', 'a.spec.ts'), `base ${t}\n`);
      const ids = [];
      for (const run of [d.folderName, b]) {
        const p = tw.planTargetWrite(d.runsDir, run, { rootId: 'TP-1', changes: [{ op: 'update', path: 'tests/a.spec.ts', source: src(d, `out/v${t}`, `${run.slice(0, 10)} ${t}\n`, run) }], environment: ENV, now: tick() });
        tw.approveTargetWrite(d.runsDir, run, { planId: p.id, approvedBy: 'QA Lead', now: tick() });
        ids.push([run, p.id]);
      }
      const codes = await Promise.all(ids.map(([run, id]) => new Promise((res) => spawn(process.execPath, [path.join(TOOLS, 'target_write', 'cli.js'), 'apply', '--run', run, '--plan', id, '--runs-dir', d.runsDir]).on('close', res))));
      if (codes.filter((c) => c === 0).length !== 1) lost += 1;
    }
    assert.equal(lost, 0, `trials where both (or neither) applied: ${lost}`);
  } finally { rm(d.root, dir); }
});

// ---------------------------------------------------------------------------------------------
// R-05 / R-15 — recovery never overwrites another actor's change; backups stay out of committed data
// ---------------------------------------------------------------------------------------------

async function interrupted(d, dir) {
  authorizeUpdate(d);
  const p = tw.planTargetWrite(d.runsDir, d.folderName, { rootId: 'TP-1', changes: [{ op: 'update', path: 'tests/a.spec.ts', source: src(d, 'out/a', 'mine\n') }, { op: 'create', path: 'tests/b.ts', source: src(d, 'out/b', 'b\n') }], environment: ENV, now: tick() });
  tw.approveTargetWrite(d.runsDir, d.folderName, { planId: p.id, approvedBy: 'QA Lead', now: tick() });
  const child = `const fm=require(${JSON.stringify(path.join(TOOLS, 'run_manager', 'fileMutation.js'))});fm._setTestHooks({afterFile:(i)=>{if(i===0)process.exit(9)}});require(${JSON.stringify(path.join(TOOLS, 'run_manager', 'targetWrites.js'))}).applyTargetWrite(process.argv[1],process.argv[2],{planId:process.argv[3],now:new Date()});`;
  const code = await new Promise((res) => spawn(process.execPath, ['-e', child, d.runsDir, d.folderName, p.id], { env: { ...process.env, NODE_TEST_CONTEXT: 'child-v8' } }).on('close', res));
  assert.equal(code, 9);
  return p;
}

test('R-05: after an interruption, a file someone else changed is never overwritten by recovery — conflict, evidence kept, a named human resolves', async () => {
  const d = dataRoot();
  const dir = project();
  try {
    register(d, dir);
    const p = await interrupted(d, dir);
    fs.writeFileSync(path.join(dir, 'tests', 'a.spec.ts'), 'a colleague\'s newer fix\n');
    const r1 = tw.recoverTargetWrite(d.runsDir, d.folderName, { planId: p.id, by: 'QA Lead', now: tick() });
    assert.equal(r1.state, 'conflict');
    assert.equal(fs.readFileSync(path.join(dir, 'tests', 'a.spec.ts'), 'utf8'), 'a colleague\'s newer fix\n', 'not overwritten');
    const evidence = path.join(d.root, '.recovery', 'target_writes', d.folderName, p.id, 'conflict-evidence', '0.current');
    assert.equal(fs.readFileSync(evidence, 'utf8'), 'a colleague\'s newer fix\n', 'their version kept as evidence');
    // While unresolved, nothing new is applied in this run.
    const q = tw.planTargetWrite(d.runsDir, d.folderName, { rootId: 'TP-1', changes: [{ op: 'create', path: 'tests/c.ts', source: src(d, 'out/c', 'c\n') }], environment: ENV, now: tick() });
    tw.approveTargetWrite(d.runsDir, d.folderName, { planId: q.id, approvedBy: 'QA Lead', now: tick() });
    assert.throws(() => tw.applyTargetWrite(d.runsDir, d.folderName, { planId: q.id, now: tick() }), (e) => e.code === 'INTERRUPTED');
    // keep-current: this apply's own writes are undone; the colleague's file is kept.
    const r2 = tw.recoverTargetWrite(d.runsDir, d.folderName, { planId: p.id, by: 'QA Lead', resolution: 'keep-current', now: tick() });
    assert.equal(r2.state, 'recovered-keep-current');
    assert.equal(fs.readFileSync(path.join(dir, 'tests', 'a.spec.ts'), 'utf8'), 'a colleague\'s newer fix\n');
    assert.ok(!fs.existsSync(path.join(dir, 'tests', 'b.ts')), 'our partial write undone');
    const ev = meta(d.runsDir, d.folderName).targetWriteLedger.filter((e) => e.plan === p.id).map((e) => e.event);
    assert.ok(ev.includes('recover-conflict') && ev.includes('recovered'));
  } finally { rm(d.root, dir); }
});

test('R-05: restore-approved puts the approved "before" state back — the other actor\'s version stays in evidence', async () => {
  const d = dataRoot();
  const dir = project();
  try {
    register(d, dir);
    const p = await interrupted(d, dir);
    fs.writeFileSync(path.join(dir, 'tests', 'a.spec.ts'), 'someone else\n');
    assert.equal(tw.recoverTargetWrite(d.runsDir, d.folderName, { planId: p.id, by: 'QA Lead', now: tick() }).state, 'conflict');
    assert.throws(() => tw.recoverTargetWrite(d.runsDir, d.folderName, { planId: p.id, by: 'QA Lead', resolution: 'whatever', now: tick() }), (e) => e.code === 'INVALID_ARGUMENT');
    tw.recoverTargetWrite(d.runsDir, d.folderName, { planId: p.id, by: 'QA Lead', resolution: 'restore-approved', now: tick() });
    assert.equal(fs.readFileSync(path.join(dir, 'tests', 'a.spec.ts'), 'utf8'), 'a\n');
    assert.equal(fs.readFileSync(path.join(d.root, '.recovery', 'target_writes', d.folderName, p.id, 'conflict-evidence', '0.current'), 'utf8'), 'someone else\n');
  } finally { rm(d.root, dir); }
});

test('R-15: target-file backups live in <data root>/.recovery, never in the run folder; an apply is refused if that folder would be committed', async () => {
  const d = dataRoot();
  const dir = project();
  try {
    register(d, dir);
    authorizeUpdate(d);
    const p = tw.planTargetWrite(d.runsDir, d.folderName, { rootId: 'TP-1', changes: [{ op: 'update', path: 'tests/a.spec.ts', source: src(d, 'out/a', 'mine\n') }], environment: ENV, now: tick() });
    tw.approveTargetWrite(d.runsDir, d.folderName, { planId: p.id, approvedBy: 'QA Lead', now: tick() });
    // The data root inside a git work tree that does NOT ignore .recovery/: refused, nothing written.
    execFileSync('git', ['init', '-q'], { cwd: d.root });
    assert.throws(() => tw.applyTargetWrite(d.runsDir, d.folderName, { planId: p.id, now: tick() }), (e) => e.code === 'BACKUP_NOT_IGNORED');
    assert.equal(fs.readFileSync(path.join(dir, 'tests', 'a.spec.ts'), 'utf8'), 'a\n');
    fs.writeFileSync(path.join(d.root, '.gitignore'), '.recovery/\n');
    tw.applyTargetWrite(d.runsDir, d.folderName, { planId: p.id, now: tick() });
    const runFiles = []; (function walk(x) { for (const e of fs.readdirSync(x, { withFileTypes: true })) { const q = path.join(x, e.name); if (e.isDirectory()) walk(q); else runFiles.push(q); } }(path.join(d.runsDir, d.folderName)));
    assert.ok(!runFiles.some((f) => /\.bak$/.test(f)), 'no backup in the run folder');
    assert.equal(fs.readFileSync(path.join(d.root, '.recovery', 'target_writes', d.folderName, p.id, 'backup', '0.bak'), 'utf8'), 'a\n');
    assert.ok(runFiles.some((f) => f.endsWith(path.join('target_writes', p.id, 'journal.json'))), 'the journal (fingerprints only) stays with the run');
  } finally { rm(d.root, dir); }
});

// ---------------------------------------------------------------------------------------------
// R-06 — private keys never pass the Platform Knowledge secret scan
// ---------------------------------------------------------------------------------------------

test('R-06: private-key blocks (PEM, OpenSSH, encrypted, PGP, truncated, PuTTY) are detected — and never echoed', () => {
  const blocks = [
    '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA1x\n-----END RSA PRIVATE KEY-----',
    '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAA\n-----END OPENSSH PRIVATE KEY-----',
    '-----BEGIN ENCRYPTED PRIVATE KEY-----\nMIIFHDBOBgkqhkiG9w0BBQ0w\n-----END ENCRYPTED PRIVATE KEY-----',
    '-----BEGIN PGP PRIVATE KEY BLOCK-----\nlQOYBF\n-----END PGP PRIVATE KEY BLOCK-----',
    'notes: -----BEGIN EC PRIVATE KEY-----\nMHcCAQEEI (cut off)',
    'PuTTY-User-Key-File-3: ssh-ed25519',
  ];
  for (const b of blocks) {
    const r = sanitizeKnowledge(`# Note\n\n${b}\n`);
    assert.ok(r.redactions['private-key'] > 0, b.slice(0, 40));
    assert.doesNotMatch(r.text, /MIIE|b3BlbnNz|MIIFHD|lQOYBF|MHcCAQ/);
  }
  // Through propose: refused with the kind only.
  const d = dataRoot();
  const platformDir = tmp('p95r-platform-');
  try {
    register(d, platformDir, 'platform-knowledge');
    const file = 'knowledge/patterns/repair/REPAIR-001.md';
    const content = `# REPAIR-001\n\n${blocks[0]}\n`;
    w(path.join(d.root, file), content);
    const m = meta(d.runsDir, d.folderName);
    m.stages['5H'] = { ...(m.stages['5H'] || {}), repairOperations: [{ id: 'RO-1', attempts: { 'TC-1': [{ n: 1, result: 'fixed', status: 'validated', patch: { sha256: 'p' }, validation: { rerun: 'x', by: 'QA Lead' } }] }, promotions: [{ id: 'REPAIR-001', file, sha256: require('crypto').createHash('sha256').update(content).digest('hex'), testCaseId: 'TC-1', attempt: 1, by: 'QA Lead' }] }] };
    fs.writeFileSync(rs.runJsonPath(d.runsDir, d.folderName), JSON.stringify(m));
    assert.throws(() => kp.proposePromotion({ runsDir: d.runsDir, folderName: d.folderName, entryId: 'REPAIR-001', platformDir, by: 'QA Lead', now: tick() }), (e) => e.code === 'SECRET_FOUND' && /private-key/.test(e.message) && !/MIIE/.test(e.message));
  } finally { rm(d.root, platformDir); }
});

// ---------------------------------------------------------------------------------------------
// R-09 — only validated project roots are registered
// ---------------------------------------------------------------------------------------------

test('R-09: drive roots, system folders, the home folder and its broad folders, the temp folder, .git and non-repositories are refused', () => {
  const d = dataRoot();
  const notRepo = tmp('p95r-plain-');
  try {
    const refused = [path.parse(process.cwd()).root, process.env.SystemRoot || 'C:/Windows', path.join(process.env.SystemRoot || 'C:/Windows', 'System32'), process.env.ProgramFiles, os.homedir(), path.join(os.homedir(), 'Desktop'), os.tmpdir()].filter((p) => p && fs.existsSync(p));
    for (const p of refused) {
      assert.throws(() => register(d, p), (e) => ['UNSAFE_ROOT', 'OUTSIDE_ROOT'].includes(e.code), p);
    }
    assert.throws(() => register(d, notRepo), (e) => e.code === 'UNSAFE_ROOT' && /not the top of a git work tree/.test(e.message));
    const repo = project();
    try {
      assert.throws(() => register(d, path.join(repo, '.git')), (e) => e.code === 'UNSAFE_ROOT');
      assert.equal(register(d, repo).kind, 'target');
      // A report-output or platform-knowledge root need not be a repository, but is still checked for breadth.
      assert.equal(register(d, notRepo, 'report-output').kind, 'report-output');
      assert.throws(() => register(d, os.homedir(), 'report-output'), (e) => ['UNSAFE_ROOT', 'OUTSIDE_ROOT'].includes(e.code));
    } finally { rm(repo); }
  } finally { rm(d.root, notRepo); }
});
