// Per-owner run numbering (run_manager.md §5.1.1).
//
// Each Feature/module numbers its own runs — `reissue-run-003` is the third Reissue run whatever
// other Features did meanwhile — so parallel branches stop minting colliding run-006/run-007 folders.
// Existing runs move onto the convention only through the plan-then-apply rename in renameRuns.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  deriveRunOwner, normalizeRunOwner, formatRunIndex, nextRunIndex, generateRunFolderName,
  parseRunFolderName,
} = require('../runFolderName');
const { createRun, CreateRunError } = require('../createRun');
const { listRuns, setActiveRun, readActiveRun } = require('../activeRun');
const { resolveRunFolder, loadIndex } = require('../runFolderIndex');
const { planRefinement } = require('../runLineage');
const {
  planRunRenames, applyRunRenames, rewriteReferences, RenameRunsError,
} = require('../renameRuns');

const NOW = new Date(2026, 9, 8, 10, 0, 0);

function makeDataRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'run-owner-'));
  const runsDir = path.join(root, 'runs');
  fs.mkdirSync(runsDir, { recursive: true });
  return { root, runsDir };
}
const cleanup = (root) => fs.rmSync(root, { recursive: true, force: true });
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

/** Writes a run folder as an older branch would have: bare run-NNN, scope fields in run.json. */
function seedRun(runsDir, folderName, meta) {
  fs.mkdirSync(path.join(runsDir, folderName, 'metadata'), { recursive: true });
  fs.writeFileSync(
    path.join(runsDir, folderName, 'metadata', 'run.json'),
    JSON.stringify({ folderName, ...meta }, null, 2)
  );
  fs.writeFileSync(path.join(runsDir, folderName, 'metadata', 'RunManifest.md'), `# Run ${folderName}\n`);
}

const sf = (feature, extra = {}) => ({
  scopeFamily: 'supplier-feature', feature, supplier: null, sharedScope: null, ...extra,
});

// ── owner derivation ─────────────────────────────────────────────────────────────────────────────

test('deriveRunOwner reads the owner from run.json scope fields, never from the target text', () => {
  assert.equal(deriveRunOwner(sf('reissue', { sharedScope: 'reissue-flow' })), 'reissue');
  assert.equal(deriveRunOwner(sf('ancillaries', { supplier: 'air-india' })), 'ancillaries',
    'the Supplier is not part of the owner — runs are numbered per Feature');
  assert.equal(deriveRunOwner({ modules: ['agency'] }), 'agency');
  assert.equal(deriveRunOwner({ modules: ['branch', 'agency'] }), 'agency+branch', 'sorted, so order is irrelevant');
  assert.equal(deriveRunOwner({ modules: ['agency'], moduleFeature: 'bulk-export' }), 'agency.bulk-export');
  assert.equal(deriveRunOwner({ modules: ['agency', 'branch'], moduleScope: 'full-project' }), null);
  assert.equal(deriveRunOwner({ target: 'Ancillaries-AirIndia' }), null, 'nothing recorded → no owner');
  assert.equal(deriveRunOwner({}), null);
});

test('a classic Feature run must name exactly one parent module', () => {
  assert.throws(() => deriveRunOwner({ moduleFeature: 'bulk-export' }), TypeError);
  assert.throws(() => deriveRunOwner({ modules: ['agency', 'branch'], moduleFeature: 'x' }), TypeError);
});

test('normalizeRunOwner rejects a malformed owner instead of repairing it', () => {
  assert.equal(normalizeRunOwner(null), null);
  assert.equal(normalizeRunOwner('agency+branch'), 'agency+branch');
  for (const bad of ['Reissue', 'has space', 'trailing-', '-lead', 'a..b', 'a/b']) {
    assert.throws(() => normalizeRunOwner(bad), TypeError, bad);
  }
});

// ── naming ───────────────────────────────────────────────────────────────────────────────────────

test('formatRunIndex and parseRunFolderName round-trip the owner', () => {
  assert.equal(formatRunIndex(3, 'reissue'), 'reissue-run-003');
  assert.equal(formatRunIndex(3), 'run-003', 'unowned stays exactly as before');

  const p = parseRunFolderName('reissue-run-003__2026-10-04_17-23-43__UserStory__ReissueFlow');
  assert.equal(p.owner, 'reissue');
  assert.equal(p.index, 3);
  assert.equal(p.target, 'ReissueFlow');

  assert.equal(parseRunFolderName('agency+branch-run-001__2026-10-04_17-23-43__UserStory__X').owner, 'agency+branch');
  assert.equal(parseRunFolderName('agency.bulk-export-run-002__2026-10-04_17-23-43__Module__X').owner, 'agency.bulk-export');
  assert.equal(parseRunFolderName('dry-run-run-001__2026-10-04_17-23-43__Smoke__X').owner, 'dry-run',
    'an owner containing "-run" still parses');
  assert.equal(parseRunFolderName('run-006__2026-10-04_17-23-43__Smoke__X').owner, undefined);
});

test('nextRunIndex counts each owner separately', () => {
  const names = [
    'run-005__2026-09-01_11-41-40__UserStory__A',
    'reissue-run-001__2026-09-26_17-10-56__UserStory__B',
    'reissue-run-002__2026-09-30_17-25-03__UserStory__C',
    'ancillaries-run-006__2026-10-04_18-30-48__Targeted__D',
  ];
  assert.equal(nextRunIndex(names, 'reissue'), 3);
  assert.equal(nextRunIndex(names, 'ancillaries'), 7);
  assert.equal(nextRunIndex(names, 'seatmap'), 1, 'a new owner starts at 1');
  assert.equal(nextRunIndex(names), 6, 'the unowned sequence ignores owned folders');
});

test('generateRunFolderName puts the owner in the name and uses its counter', () => {
  const name = generateRunFolderName(
    { scope: 'UserStory', target: 'Reissue Flow', owner: 'reissue' },
    { now: NOW, existingNames: ['reissue-run-002__x__y__z', 'run-009__x__y__z'] }
  );
  assert.equal(name, 'reissue-run-003__2026-10-08_10-00-00__UserStory__ReissueFlow');
});

// ── creation ─────────────────────────────────────────────────────────────────────────────────────

test('createRun names a Supplier Feature run after its Feature and records runOwner', () => {
  const { root, runsDir } = makeDataRoot();
  seedRun(runsDir, 'run-011__2026-10-04_17-23-43__UserStory__Old', {});

  const res = createRun(runsDir, {
    scope: 'Targeted', target: 'Ancillaries-OmanAir', now: NOW,
    extraRunJson: sf('ancillaries', { supplier: 'oman-air' }),
  });
  assert.equal(res.folderName, 'ancillaries-run-001__2026-10-08_10-00-00__Targeted__Ancillaries-OmanAir');
  assert.equal(res.runJson.runOwner, 'ancillaries');
  assert.equal(res.runJson.index, 1);

  const second = createRun(runsDir, {
    scope: 'Targeted', target: 'Ancillaries-Flynas', now: NOW,
    extraRunJson: sf('ancillaries', { supplier: 'flynas-ndc' }),
  });
  assert.match(second.folderName, /^ancillaries-run-002__/);
  cleanup(root);
});

test('createRun names module and classic Feature runs after their module', () => {
  const { root, runsDir } = makeDataRoot();
  const a = createRun(runsDir, { scope: 'UserStory', target: 'X', now: NOW, extraRunJson: { modules: ['branch', 'agency'], moduleScope: 'multi' } });
  const b = createRun(runsDir, { scope: 'Module', target: 'Y', now: NOW, extraRunJson: { modules: ['agency'], moduleFeature: 'bulk-export' } });
  const c = createRun(runsDir, { scope: 'FullRun', target: 'Z', now: NOW });
  assert.match(a.folderName, /^agency\+branch-run-001__/);
  assert.match(b.folderName, /^agency\.bulk-export-run-001__/);
  assert.match(c.folderName, /^run-001__/, 'an unscoped run keeps the bare sequence');
  assert.equal(c.runJson.runOwner, null);
  cleanup(root);
});

test('createRun refuses a classic Feature run inside a Supplier Feature scope', () => {
  const { root, runsDir } = makeDataRoot();
  assert.throws(() => createRun(runsDir, {
    scope: 'Module', target: 'X', now: NOW,
    extraRunJson: { ...sf('reissue', { sharedScope: 'flow' }), moduleFeature: 'x' },
  }), CreateRunError);
  assert.deepEqual(fs.readdirSync(runsDir), [], 'nothing left behind');
  cleanup(root);
});

test('listRuns orders by start time across owners, not by index', () => {
  const { root, runsDir } = makeDataRoot();
  seedRun(runsDir, 'reissue-run-009__2026-09-01_10-00-00__UserStory__Old', { startedTime: '2026-09-01T10:00:00Z' });
  seedRun(runsDir, 'ancillaries-run-001__2026-10-01_10-00-00__Targeted__New', { startedTime: '2026-10-01T10:00:00Z' });
  const runs = listRuns(runsDir);
  assert.deepEqual(runs.map((r) => r.runOwner), ['ancillaries', 'reissue']);
  assert.equal(runs[0].sortTime, undefined, 'the sort key is not part of the result');
  cleanup(root);
});

test('a refinement run stays in the prior run\'s sequence', () => {
  const { root, runsDir } = makeDataRoot();
  seedRun(runsDir, 'reissue-run-002__2026-09-30_17-25-03__UserStory__Flow', { ...sf('reissue', { sharedScope: 'flow' }), runOwner: 'reissue' });
  const plan = planRefinement(runsDir, 'reissue-run-002__2026-09-30_17-25-03__UserStory__Flow', { now: NOW });
  assert.match(plan.newRunFolder, /^reissue-run-003__/);
  assert.equal(plan.owner, 'reissue');
  cleanup(root);
});

// ── renaming existing runs ───────────────────────────────────────────────────────────────────────

/** The merged state of the three branches, in miniature. */
function seedMergedBranches(runsDir) {
  seedRun(runsDir, 'run-005__2026-09-01_11-41-40__UserStory__Base', {});
  seedRun(runsDir, 'run-006__2026-09-23_22-36-43__UserStory__AutoReissue', { startedTime: '2026-09-23T19:36:43Z', scopeFamily: null });
  seedRun(runsDir, 'run-007__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia', { startedTime: '2026-09-23T18:18:44Z', ...sf('ancillaries', { supplier: 'air-india' }) });
  seedRun(runsDir, 'run-006__2026-09-26_20-51-48__Targeted__Ancillaries-Flynas', { startedTime: '2026-09-26T17:51:48Z', ...sf('ancillaries', { supplier: 'flynas-ndc' }) });
  seedRun(runsDir, 'run-007__2026-09-26_17-10-56__UserStory__ReissueFlow', { startedTime: '2026-09-26T14:10:56Z', ...sf('reissue', { sharedScope: 'reissue-mapping' }) });
  seedRun(runsDir, 'run-011__2026-10-04_17-23-43__UserStory__ReissueExec', { startedTime: '2026-10-04T14:23:43Z', ...sf('reissue', { sharedScope: 'reissue-flow' }) });
}

test('planRunRenames numbers each Feature chronologically and leaves unowned runs alone', () => {
  const { root, runsDir } = makeDataRoot();
  seedMergedBranches(runsDir);
  const before = fs.readdirSync(runsDir).sort();

  const plan = planRunRenames(runsDir);
  const map = Object.fromEntries(plan.renames.map((r) => [r.from, r.to]));
  assert.equal(map['run-007__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia'], 'ancillaries-run-001__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia');
  assert.equal(map['run-006__2026-09-26_20-51-48__Targeted__Ancillaries-Flynas'], 'ancillaries-run-002__2026-09-26_20-51-48__Targeted__Ancillaries-Flynas');
  assert.equal(map['run-007__2026-09-26_17-10-56__UserStory__ReissueFlow'], 'reissue-run-001__2026-09-26_17-10-56__UserStory__ReissueFlow');
  assert.equal(map['run-011__2026-10-04_17-23-43__UserStory__ReissueExec'], 'reissue-run-002__2026-10-04_17-23-43__UserStory__ReissueExec');
  assert.deepEqual(plan.unowned.map((u) => u.folderName).sort(), [
    'run-005__2026-09-01_11-41-40__UserStory__Base',
    'run-006__2026-09-23_22-36-43__UserStory__AutoReissue',
  ]);
  assert.deepEqual(plan.errors, []);
  assert.deepEqual(fs.readdirSync(runsDir).sort(), before, 'planning writes nothing');
  cleanup(root);
});

test('--assign gives an unscoped classic run an owner; a bad assignment fails the plan', () => {
  const { root, runsDir } = makeDataRoot();
  seedMergedBranches(runsDir);
  const plan = planRunRenames(runsDir, { assign: { 'run-006__2026-09-23_22-36-43__UserStory__AutoReissue': 'agency+branch' } });
  const hit = plan.renames.find((r) => r.from.startsWith('run-006__2026-09-23_22'));
  assert.equal(hit.to, 'agency+branch-run-001__2026-09-23_22-36-43__UserStory__AutoReissue');
  assert.equal(hit.ownerSource, 'assigned');

  assert.equal(planRunRenames(runsDir, { assign: { 'no-such-run': 'agency' } }).errors.length, 1);
  assert.equal(planRunRenames(runsDir, { assign: { 'run-005__2026-09-01_11-41-40__UserStory__Base': 'Bad Owner' } }).errors.length, 1);
  cleanup(root);
});

test('applyRunRenames renames, rewrites references, moves the pointer, and keeps old names resolvable', () => {
  const { root, runsDir } = makeDataRoot();
  seedMergedBranches(runsDir);
  const oldExec = 'run-011__2026-10-04_17-23-43__UserStory__ReissueExec';
  const newExec = 'reissue-run-002__2026-10-04_17-23-43__UserStory__ReissueExec';
  const oldFlow = 'run-007__2026-09-26_17-10-56__UserStory__ReissueFlow';

  // A registry entry and a lineage record cite the runs; a near-miss name must not be touched.
  fs.mkdirSync(path.join(root, 'supplier-features'), { recursive: true });
  const registry = path.join(root, 'supplier-features', 'modules.json');
  fs.writeFileSync(registry, JSON.stringify({
    lastRun: `runs/${oldExec}/manual_execution`,
    nearMiss: `${oldExec}__2`,
  }));
  fs.writeFileSync(path.join(runsDir, oldExec, 'metadata', 'lineage.json'), JSON.stringify({ inheritsFrom: oldFlow }));
  fs.writeFileSync(path.join(runsDir, oldExec, 'metadata', 'events.jsonl'), `{"run":"${oldExec}"}\n`);
  setActiveRun(runsDir, oldExec, { now: NOW });

  const plan = planRunRenames(runsDir);
  assert.throws(() => applyRunRenames(runsDir, plan, { now: NOW, approvedBy: '', reason: 'x' }), RenameRunsError);
  const res = applyRunRenames(runsDir, plan, { now: NOW, approvedBy: 'Ahmed Ayman', reason: 'per-Feature numbering' });

  assert.equal(res.renamed.length, 4);
  assert.ok(fs.existsSync(path.join(runsDir, newExec)));
  assert.ok(!fs.existsSync(path.join(runsDir, oldExec)));

  const reg = readJson(registry);
  assert.equal(reg.lastRun, `runs/${newExec}/manual_execution`);
  assert.equal(reg.nearMiss, `${oldExec}__2`, 'a longer name that merely starts with the old one is untouched');
  assert.equal(readJson(path.join(runsDir, newExec, 'metadata', 'lineage.json')).inheritsFrom,
    'reissue-run-001__2026-09-26_17-10-56__UserStory__ReissueFlow');
  assert.equal(fs.readFileSync(path.join(runsDir, newExec, 'metadata', 'events.jsonl'), 'utf8'),
    `{"run":"${newExec}"}\n`, 'JSON Lines event logs are rewritten too');

  const meta = readJson(path.join(runsDir, newExec, 'metadata', 'run.json'));
  assert.equal(meta.folderName, newExec);
  assert.equal(meta.index, 2);
  assert.equal(meta.runOwner, 'reissue');
  assert.equal(meta.renamedFrom[0].folderName, oldExec, 'history keeps the old name');
  assert.equal(meta.renamedFrom[0].approvedBy, 'Ahmed Ayman');

  const pointer = readActiveRun(runsDir);
  assert.equal(pointer.activeRun.folderName, newExec);
  assert.equal(pointer.activeRun.runOwner, 'reissue');
  assert.equal(pointer.activeRun.index, 2);

  assert.equal(resolveRunFolder(runsDir, oldExec), newExec, 'the old name still resolves');
  assert.ok(loadIndex(runsDir).some((e) => e.legacyName === oldExec && e.renamedTo === newExec));

  assert.deepEqual(planRunRenames(runsDir).renames, [], 're-planning after apply is a no-op');

  // Running the rewrite again (e.g. to pick up files added later) must not rewrite the history.
  rewriteReferences(root, res.renamed);
  assert.equal(readJson(path.join(runsDir, newExec, 'metadata', 'run.json')).renamedFrom[0].folderName, oldExec,
    'a repeated rewrite never turns "renamed from X" into "renamed from itself"');
  cleanup(root);
});

test('applyRunRenames refuses a plan with errors or one gone stale', () => {
  const { root, runsDir } = makeDataRoot();
  seedMergedBranches(runsDir);
  const bad = planRunRenames(runsDir, { assign: { 'no-such-run': 'agency' } });
  assert.throws(() => applyRunRenames(runsDir, bad, { now: NOW, approvedBy: 'QA Lead', reason: 'r' }), RenameRunsError);

  const plan = planRunRenames(runsDir);
  fs.rmSync(path.join(runsDir, plan.renames[0].from), { recursive: true });
  assert.throws(() => applyRunRenames(runsDir, plan, { now: NOW, approvedBy: 'QA Lead', reason: 'r' }), /no longer exists/);
  assert.ok(fs.existsSync(path.join(runsDir, plan.renames[1].from)), 'nothing renamed before the check failed');
  cleanup(root);
});
