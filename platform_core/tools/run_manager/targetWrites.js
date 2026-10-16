// Target / Reference Project writes — the Target Write Plan and the Target Write Ledger (Phase 9.4).
//
// WHY THIS EXISTS
// Stage 4A (and a Promoted-module or reference-project update) writes into a project the platform does not
// own: the human's own automation repository. Until now that was prose ("record every write in the Target
// Write Ledger"). Here a write into such a project happens only through four recorded steps:
//
//   register-root  a named human declares a permitted project root (kind: target | reference), once, in
//                  <data root>/knowledge_base/target_projects.json — never inside the platform or its data
//   plan           exact files and operations under that root, each with the fingerprint of what is there now
//                  and of the content to write (from a file inside this run's folder); checked for scope
//                  (the run's declared target scope paths), ownership (the root's .baseline_ownership.json,
//                  when it has one), and Execution Safety (the project policy and this run's authorizations)
//   approve        a named human approves THAT plan — the approval is bound to its fingerprint
//   apply          re-checks everything, then writes through fileMutation.js (journal + backups + rollback);
//                  every attempt — applied, rolled back, refused as stale, recovered — lands in the ledger
//
// EXECUTION SAFETY MAPPING (an interpretation of the existing policy, not a new policy): writing a new file is
// CREATE on SelfCreated data; replacing or deleting an existing file is UPDATE / DELETE on Shared data — in the
// environment the plan names explicitly (never defaulted). Forbidden is never lifted; Approval Required needs a
// named run authorization (SafetyAuthorizations.json), exactly as for application data.

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const rs = require('./runState');
const fm = require('./fileMutation');
const { writeJsonAtomic, writeFileAtomic, withFileLock } = require('./atomicFile');

const { RunStateError } = rs;
// Kinds of permitted root (Phase 9.5, R-03): target / reference projects take Target Write Plans; a
// platform-knowledge root may receive Platform Knowledge promotions; a report-output root may receive generated
// reports. Each kind is used only for its own purpose.
const ROOT_KINDS = Object.freeze(['target', 'reference', 'platform-knowledge', 'report-output']);
const WRITE_PLAN_KINDS = Object.freeze(['target', 'reference']);
const OPS = Object.freeze(['create', 'update', 'delete']);
const TOOL_ROOT = path.resolve(__dirname, '..', '..', '..');

const stable = (v) => (v === null || typeof v !== 'object' ? JSON.stringify(v)
  : Array.isArray(v) ? `[${v.map(stable).join(',')}]` : `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const posix = (p) => String(p).replace(/\\/g, '/');
const norm = (p) => (process.platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p));
const within = (root, p) => { const r = path.relative(norm(root), norm(p)); return r === '' || (!r.startsWith('..') && !path.isAbsolute(r)); };

function rootsFile(dataRoot) { return path.join(dataRoot, 'knowledge_base', 'target_projects.json'); }
function readRoots(dataRoot) {
  try { return JSON.parse(fs.readFileSync(rootsFile(dataRoot), 'utf8')); } catch { return { schema: 'target-projects/1', roots: [] }; }
}

/**
 * Registers a permitted project root (named human). Refused inside the platform, its data root, or around them.
 * @returns {object} the root record
 */
function registerRoot(dataRoot, { kind, rootPath, approvedBy, reason, now }) {
  rs.assertDate(now, 'registerRoot');
  const by = rs.requireApprover(approvedBy, 'approvedBy', 'registerRoot', 'a project root the platform may write into is declared by a named human');
  if (!ROOT_KINDS.includes(kind)) throw new RunStateError(`Root kind must be one of ${ROOT_KINDS.join(', ')}.`, 'INVALID_ARGUMENT');
  const why = rs.requireText(reason, 'reason', 'registerRoot', 'say which project this is and why it may be written');
  let real;
  try { real = fs.realpathSync.native(path.resolve(String(rootPath || ''))); } catch { throw new RunStateError(`Project root ${rootPath} does not exist.`, 'MISSING_ARTIFACT'); }
  if (!fs.statSync(real).isDirectory()) throw new RunStateError(`Project root ${rootPath} is not a folder.`, 'INVALID_ARGUMENT');
  for (const [name, p] of [['the platform', TOOL_ROOT], ['the platform data root', dataRoot]]) {
    if (within(p, real) || within(real, p)) throw new RunStateError(`Project root ${real} is inside, or contains, ${name} (${p}) — the platform never registers itself as a target.`, 'OUTSIDE_ROOT');
  }
  const unsafe = unsafeRootReason(real);
  if (unsafe) throw new RunStateError(`Project root ${real} refused: ${unsafe}. Register the project's own folder.`, 'UNSAFE_ROOT');
  if (WRITE_PLAN_KINDS.includes(kind) && !fs.existsSync(path.join(real, '.git'))) {
    throw new RunStateError(`Project root ${real} is not the top of a git work tree (no .git) — a target or reference project is registered at its repository root, where every change stays reviewable and recoverable.`, 'UNSAFE_ROOT');
  }
  return withFileLock(`${rootsFile(dataRoot)}.lock`, () => {
    const reg = readRoots(dataRoot);
    const dup = reg.roots.find((r) => norm(r.path) === norm(real) && r.kind === kind);
    if (dup) throw new RunStateError(`${real} is already registered as ${dup.id} (${kind}).`, 'ALREADY_REGISTERED');
    const rec = { id: `TP-${reg.roots.length + 1}`, kind, path: real, approvedBy: by, reason: why, at: now.toISOString() };
    reg.roots.push(rec);
    writeJsonAtomic(rootsFile(dataRoot), reg);
    return rec;
  });
}

/**
 * Why `real` is too broad or too sensitive to be a writable root, or null (Phase 9.5, R-09): a drive or file-system
 * root; a system folder (or inside one); the user's home folder, an ancestor of it, or one of its broad folders;
 * the temp folder itself; anything inside a .git folder.
 */
function unsafeRootReason(real) {
  const r = path.resolve(real);
  if (path.dirname(r) === r) return 'a drive or file-system root';
  if (r.split(path.sep).some((s) => s.replace(/[. ]+$/, '').toLowerCase() === '.git')) return 'inside a .git folder';
  const env = process.env;
  const system = [env.SystemRoot, env.windir, env.ProgramFiles, env['ProgramFiles(x86)'], env.ProgramW6432, env.ProgramData, env.CommonProgramFiles, env['CommonProgramFiles(x86)'],
    ...(process.platform === 'win32' ? [] : ['/bin', '/boot', '/dev', '/etc', '/lib', '/lib64', '/opt', '/proc', '/root', '/sbin', '/srv', '/sys', '/usr', '/var', '/System', '/Library', '/Applications', '/private'])].filter(Boolean);
  for (const s of system) if (within(s, r)) return `a system folder (${s})`;
  const home = os.homedir();
  if (within(r, home)) return `the home folder or one of its ancestors (${home})`;
  for (const n of ['Desktop', 'Documents', 'Downloads', 'OneDrive', 'AppData', 'Library', 'Pictures', 'Music', 'Videos']) {
    if (norm(r) === norm(path.join(home, n))) return `a broad personal folder (${path.join(home, n)})`;
  }
  if (norm(r) === norm(os.tmpdir()) || norm(r) === norm(path.dirname(os.tmpdir()))) return 'the temp folder itself';
  return null;
}

/** Is `abs` (by real path) inside a registered root of one of `kinds`? Returns the root record or null. */
function permittedRootFor(dataRoot, abs, kinds) {
  // eslint-disable-next-line global-require
  const { realPathOf } = require('./pathBoundary');
  const real = realPathOf(path.resolve(abs));
  return readRoots(dataRoot).roots.find((x) => kinds.includes(x.kind) && within(x.path, real) && !unsafeRootReason(x.path)) || null;
}

function findRoot(dataRoot, id) {
  const r = readRoots(dataRoot).roots.find((x) => x.id === id);
  if (!r) throw new RunStateError(`No registered project root "${id}" — register it first (target_write/cli.js register-root).`, 'UNKNOWN_ROOT');
  return r;
}

/** Execution Safety for each file operation (see header). Returns {rows, refusals}. */
function safetyFor({ dataRoot, folderName, meta, environment, changes }) {
  // eslint-disable-next-line global-require
  const { evaluate } = require('../execution_safety/evaluator');
  // eslint-disable-next-line global-require
  const { loadPolicy, loadAuthorizations } = require('../execution_safety/policyLoader');
  const refusals = [];
  let policy = null;
  try { ({ policy } = loadPolicy({ dataRoot })); } catch (err) { refusals.push(`no readable Execution Safety policy (${String(err.message).split('\n')[0]}) — a target write is never evaluated without one`); }
  let auths = [];
  try { auths = loadAuthorizations({ dataRoot, runFolder: folderName }).authorizations; } catch { /* none */ }
  if (!String(environment || '').trim()) refusals.push('no environment was named for this write — it is never defaulted');
  const module = Array.isArray(meta.modules) && meta.modules.length === 1 ? meta.modules[0] : null;
  const rows = changes.map((c) => {
    const action = c.op === 'create' ? 'CREATE' : c.op === 'update' ? 'UPDATE' : 'DELETE';
    const ownership = c.op === 'create' ? 'SelfCreated' : 'Shared';
    if (!policy || !String(environment || '').trim()) return { path: c.path, action, ownership, decision: 'Not evaluated' };
    const r = evaluate({ policy, action, ownership, environment, module, runId: folderName, authorizations: auths });
    if (r.decision !== 'Allowed') refusals.push(`${c.op} ${c.path}: ${action} on ${ownership} in ${r.environment} is ${r.decision} — ${r.reason}${r.decision === 'Approval Required' ? ' (a named run authorization is needed first)' : ''}`);
    return { path: c.path, action, ownership, decision: r.decision, environment: r.environment, ...(r.satisfiedBy ? { authorizedBy: r.satisfiedBy.approvedBy } : {}) };
  });
  return { rows, refusals };
}

/** Builds the plan body (no write): scope, ownership, containment, fingerprints. */
function buildPlan({ runsDir, folderName, meta, root, changes, environment }) {
  const dataRoot = path.dirname(runsDir);
  const runDir = path.join(runsDir, folderName);
  const refusals = [];
  if (!Array.isArray(changes) || !changes.length) refusals.push('the plan names no change');
  const scope = (Array.isArray(meta.targetRefScope) ? meta.targetRefScope : []).map((s) => posix(s).replace(/^\.?\/+|\/+$/g, '')).filter(Boolean);
  if (!scope.length) refusals.push('the run declares no target scope paths (run_manager new --scope-paths a,b) — a target write is confined to the run\'s declared scope');
  // eslint-disable-next-line global-require
  const own = require('../automation_lifecycle/baselineOwnership');
  let manifest = null;
  try { manifest = own.readOwnership(root.path); } catch { manifest = null; }
  const modules = Array.isArray(meta.modules) ? meta.modules : [];
  const out = [];
  for (const [i, c] of (changes || []).entries()) {
    const label = `change ${i + 1}`;
    if (!c || !OPS.includes(c.op)) { refusals.push(`${label}: operation must be one of ${OPS.join(', ')}`); continue; }
    let abs;
    try { abs = fm.resolveInside(root.path, c.path, 'target path'); } catch (err) { refusals.push(`${label}: ${err.message}`); continue; }
    const rel = posix(path.relative(root.path, abs));
    if (scope.length && !scope.some((s) => rel === s || rel.startsWith(`${s}/`))) refusals.push(`${label}: ${rel} is outside the run's target scope (${scope.join(', ')})`);
    if (manifest) {
      const owners = modules.map((m) => own.classifyPath(manifest, rel, m));
      const cls = owners.find((o) => o.classification === 'owned') || owners[0] || own.classifyPath(manifest, rel, null);
      if (cls.classification === 'foreign') refusals.push(`${label}: ${rel} is owned by module "${cls.owner}" — never written for this run`);
      else if (cls.classification === 'shared') refusals.push(`${label}: ${rel} is a shared asset — shared files change only through the shared-asset path (automation_lifecycle plan-shared-change)`);
      else if (cls.classification === 'unowned' && c.op !== 'create') refusals.push(`${label}: ${rel} exists but no module owns it — an unrelated file is never replaced or deleted`);
    }
    const beforeSha = fm.fileSha(abs);
    if (c.op === 'create' && beforeSha) refusals.push(`${label}: ${rel} already exists — use update`);
    if (c.op !== 'create' && !beforeSha) refusals.push(`${label}: ${rel} does not exist — nothing to ${c.op}`);
    let afterSha = null; let source = null;
    if (c.op !== 'delete') {
      try {
        const src = fm.resolveInside(runDir, c.source, 'source file');
        afterSha = fm.fileSha(src);
        source = posix(path.relative(runDir, src));
        if (!afterSha) refusals.push(`${label}: source ${c.source} does not exist in the run folder`);
      } catch (err) { refusals.push(`${label}: the content comes from a file inside this run's folder — ${err.message}`); }
    }
    out.push({ op: c.op, path: rel, source, beforeSha, afterSha });
  }
  const safety = safetyFor({ dataRoot, folderName, meta, environment, changes: out });
  refusals.push(...safety.refusals);
  const body = { run: folderName, root: { id: root.id, kind: root.kind, path: root.path }, environment: String(environment || '').trim() || null, changes: out };
  return { body, safety: safety.rows, refusals, fingerprint: sha(stable(body)) };
}

function renderLedger(folderName, meta) {
  const rows = (meta.targetWriteLedger || []).map((e) => `| ${e.at} | ${e.plan} | ${e.event} | ${e.root} | ${e.files} | ${e.by || '—'} | ${e.detail || ''} |`);
  const plans = (meta.targetWritePlans || []).map((p) => `| ${p.id} | ${p.status} | ${p.root.kind} ${p.root.id} | ${p.changes.length} | ${p.environment || '—'} | ${p.approval ? p.approval.by : '—'} | \`${p.fingerprint.slice(0, 12)}\` |`);
  return `# Target Write Ledger — ${folderName}\n\nRecorded by the Run Manager (\`target_write/cli.js\`). A write into a target or reference project happens only from an approved Target Write Plan whose fingerprint still matches; every attempt is recorded here.\n\n## Plans\n\n| Plan | Status | Root | Files | Environment | Approved by | Fingerprint |\n|---|---|---|---|---|---|---|\n${plans.join('\n')}\n\n## Ledger\n\n| At | Plan | Event | Root | Files | By | Detail |\n|---|---|---|---|---|---|---|\n${rows.join('\n')}\n`;
}
function writeLedgerDoc(runsDir, folderName, meta) {
  writeFileAtomic(path.join(runsDir, folderName, 'metadata', 'TargetWriteLedger.md'), renderLedger(folderName, meta));
}
const ledger = (meta, ts, plan, event, by, detail) => {
  meta.targetWriteLedger = [...(meta.targetWriteLedger || []), { at: ts, plan: plan.id, event, root: `${plan.root.kind}:${plan.root.path}`, files: plan.changes.length, by: by || null, ...(detail ? { detail } : {}) }];
};

/** Records a Target Write Plan (refused plans are recorded too). Throws PLAN_REFUSED after recording a refusal. */
function planTargetWrite(runsDir, folderName, opts = {}) {
  const { now } = opts;
  rs.assertDate(now, 'planTargetWrite');
  const dataRoot = path.dirname(runsDir);
  const root = findRoot(dataRoot, opts.rootId);
  if (!WRITE_PLAN_KINDS.includes(root.kind)) throw new RunStateError(`${root.id} is a ${root.kind} root — Target Write Plans go only to target or reference projects.`, 'UNKNOWN_ROOT');
  let record;
  rs.applyChange(runsDir, folderName, opts, (meta, ts) => {
    const b = buildPlan({ runsDir, folderName, meta, root, changes: opts.changes, environment: opts.environment });
    record = { id: `TWP-${(meta.targetWritePlans || []).length + 1}`, at: ts, ...b.body, safety: b.safety, refusals: b.refusals, fingerprint: b.fingerprint, status: b.refusals.length ? 'refused' : 'planned', approval: null };
    meta.targetWritePlans = [...(meta.targetWritePlans || []), record];
    ledger(meta, ts, record, record.status === 'refused' ? 'plan-refused' : 'planned', opts.by, b.refusals.join('; ').slice(0, 400));
    writeLedgerDoc(runsDir, folderName, meta);
    return { by: opts.by || 'Run Manager', transition: `target write plan ${record.id} ${record.status} (${record.changes.length} file(s) under ${root.kind} ${root.id})` };
  });
  if (record.status === 'refused') {
    const err = new RunStateError(`Target Write Plan ${record.id} refused — nothing can be written:\n  - ${record.refusals.join('\n  - ')}`, 'PLAN_REFUSED');
    err.plan = record;
    throw err;
  }
  return record;
}

function planOf(meta, id) {
  const p = (meta.targetWritePlans || []).find((x) => x.id === id);
  if (!p) throw new RunStateError(`No Target Write Plan "${id}" in this run.`, 'UNKNOWN_PLAN');
  return p;
}

/** A named human approves exactly this plan (bound to its fingerprint). */
function approveTargetWrite(runsDir, folderName, opts = {}) {
  const { now } = opts;
  rs.assertDate(now, 'approveTargetWrite');
  const by = rs.requireApprover(opts.approvedBy, 'approvedBy', 'approveTargetWrite', 'a write into a project the platform does not own is approved by a named human');
  let out;
  rs.applyChange(runsDir, folderName, opts, (meta, ts) => {
    const p = planOf(meta, opts.planId);
    if (p.status !== 'planned') throw new RunStateError(`Plan ${p.id} is ${p.status}, not planned — only a planned (not refused, not yet applied) plan is approved.`, 'ILLEGAL_TRANSITION');
    if (opts.fingerprint && opts.fingerprint !== p.fingerprint) throw new RunStateError(`Plan ${p.id}'s fingerprint is ${p.fingerprint.slice(0, 12)}, not the ${String(opts.fingerprint).slice(0, 12)} you reviewed.`, 'FINGERPRINT_MISMATCH');
    p.approval = { by, at: ts, fingerprint: p.fingerprint };
    p.status = 'approved';
    ledger(meta, ts, p, 'approved', by);
    writeLedgerDoc(runsDir, folderName, meta);
    out = p;
    return { by, transition: `target write plan ${p.id} approved by ${by}` };
  });
  return out;
}

// The journal (fingerprints only) stays with the run. Backups and conflict evidence are copies of TARGET-project
// files, which may hold that project's secrets, so they live in <data root>/.recovery/ — kept out of committed
// run data (Phase 9.5, R-15) — and an apply is refused unless that folder is git-ignored.
const journalPaths = (runsDir, folderName, id) => {
  const recovery = path.join(path.dirname(runsDir), '.recovery', 'target_writes', folderName, id);
  return { journalFile: path.join(runsDir, folderName, 'target_writes', id, 'journal.json'), backupDir: path.join(recovery, 'backup'), evidenceDir: path.join(recovery, 'conflict-evidence') };
};

/** Refuses when the recovery folder would be committed: inside a git work tree and not ignored there. */
function assertRecoveryIgnored(runsDir) {
  const dataRoot = path.dirname(runsDir);
  const dir = path.join(dataRoot, '.recovery');
  // eslint-disable-next-line global-require
  const { execFileSync } = require('child_process');
  let inRepo = false;
  try { execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: dataRoot, stdio: 'ignore' }); inRepo = true; } catch { inRepo = false; }
  if (!inRepo) return;
  try { execFileSync('git', ['check-ignore', '-q', path.join(dir, 'probe')], { cwd: dataRoot, stdio: 'ignore' }); } catch {
    throw new RunStateError(`${dir} is not git-ignored — target-file backups would be committed with the data. Add ".recovery/" to .gitignore first.`, 'BACKUP_NOT_IGNORED');
  }
}

/** One lock per target project, shared by every run of this data root (Phase 9.5, R-04). Kept in the data root, never in the target. */
function rootLockPath(runsDir, rootPath) {
  return path.join(path.dirname(runsDir), 'knowledge_base', '.locks', `target-${sha(norm(rootPath)).slice(0, 24)}.lock`);
}

/** Applies an approved plan after re-checking every binding; records the outcome in the ledger. */
function applyTargetWrite(runsDir, folderName, opts = {}) {
  rs.assertDate(opts.now, 'applyTargetWrite');
  assertRecoveryIgnored(runsDir);
  const meta0 = JSON.parse(fs.readFileSync(rs.runJsonPath(runsDir, folderName), 'utf8'));
  const p0 = planOf(meta0, opts.planId);
  // Revalidation and the write happen under the TARGET's lock: a second run's approved plan for the same file
  // waits, then finds the file changed and is refused as stale — never a lost update.
  return withFileLock(rootLockPath(runsDir, p0.root.path), () => applyTargetWriteLocked(runsDir, folderName, opts), { timeoutMs: 60000 });
}

function applyTargetWriteLocked(runsDir, folderName, opts = {}) {
  const { now } = opts;
  const dataRoot = path.dirname(runsDir);
  let plan; let changes;
  rs.applyChange(runsDir, folderName, opts, (meta, ts) => {
    const open = (meta.targetWritePlans || []).find((x) => x.status === 'applying' || x.status === 'conflict');
    if (open) throw new RunStateError(`Plan ${open.id} is still applying, or was interrupted — recover it first (target_write/cli.js recover).`, 'INTERRUPTED');
    plan = planOf(meta, opts.planId);
    if (plan.status !== 'approved' || !plan.approval) throw new RunStateError(`Plan ${plan.id} is ${plan.status} — only an approved plan is applied.`, 'APPROVAL_REQUIRED');
    // Re-check every binding: registered root, the run's current scope, ownership, safety, and the content.
    const root = findRoot(dataRoot, plan.root.id);
    if (norm(root.path) !== norm(plan.root.path)) throw new RunStateError(`Root ${root.id} now points elsewhere than when ${plan.id} was planned.`, 'STALE_PLAN');
    const now2 = buildPlan({ runsDir, folderName, meta, root, changes: plan.changes.map((c) => ({ op: c.op, path: c.path, source: c.source })), environment: plan.environment });
    const reasons = [];
    if (now2.fingerprint !== plan.approval.fingerprint) reasons.push('the files, the content or the environment differ from what was approved');
    // A changed target file or source shows up as a fingerprint difference; refusals (scope, ownership, safety) are named.
    const fresh = now2.refusals.filter((r) => !/already exists — use update|does not exist — nothing to/.test(r));
    reasons.push(...fresh);
    if (reasons.length) {
      plan.status = 'stale';
      ledger(meta, ts, plan, 'refused-stale', opts.by, reasons.join('; ').slice(0, 400));
      writeLedgerDoc(runsDir, folderName, meta);
      return { by: opts.by || 'Run Manager', transition: `target write plan ${plan.id} refused at apply — stale` , result: { refused: reasons } };
    }
    changes = plan.changes.map((c) => ({ ...c, content: c.op === 'delete' ? undefined : fs.readFileSync(path.join(runsDir, folderName, c.source)) }));
    plan.status = 'applying';
    ledger(meta, ts, plan, 'applying', opts.by);
    writeLedgerDoc(runsDir, folderName, meta);
    return { by: opts.by || 'Run Manager', transition: `target write plan ${plan.id} applying` };
  });
  if (plan.status === 'stale') {
    const latest = JSON.parse(fs.readFileSync(rs.runJsonPath(runsDir, folderName), 'utf8'));
    const e = (latest.targetWriteLedger || []).filter((x) => x.plan === plan.id).pop();
    throw new RunStateError(`Plan ${plan.id} not applied — it no longer matches its approval: ${e && e.detail}. Plan and approve again.`, 'STALE_PLAN');
  }
  const jp = journalPaths(runsDir, folderName, plan.id);
  let outcome; let failure = null;
  try {
    outcome = fm.applyFileChanges({ root: plan.root.path, changes, ...jp, label: `Target Write Plan ${plan.id}` });
  } catch (err) { failure = err; }
  rs.applyChange(runsDir, folderName, { now: new Date(now.getTime() + 1) }, (meta, ts) => {
    const p = planOf(meta, plan.id);
    if (failure) {
      p.status = failure.code === 'STALE_TARGET' ? 'stale' : 'rolled-back';
      ledger(meta, ts, p, failure.code === 'STALE_TARGET' ? 'refused-stale' : 'rolled-back', opts.by, String(failure.message).split('\n')[0]);
    } else {
      p.status = 'applied';
      p.appliedAt = ts;
      ledger(meta, ts, p, 'applied', opts.by, outcome.applied.map((c) => `${c.op} ${c.path}`).join(', ').slice(0, 400));
    }
    writeLedgerDoc(runsDir, folderName, meta);
    return { by: opts.by || 'Run Manager', transition: `target write plan ${p.id} ${p.status}` };
  });
  if (failure) throw new RunStateError(failure.message, failure.code === 'STALE_TARGET' ? 'STALE_PLAN' : failure.code || 'ROLLED_BACK');
  return { plan: plan.id, applied: outcome.applied };
}

/** Restores an interrupted apply (journal in-progress) and records it. */
function recoverTargetWrite(runsDir, folderName, opts = {}) {
  const { now } = opts;
  rs.assertDate(now, 'recoverTargetWrite');
  const by = rs.requireApprover(opts.by, 'by', 'recoverTargetWrite', 'a human confirms the interrupted write is not still running');
  const meta0 = JSON.parse(fs.readFileSync(rs.runJsonPath(runsDir, folderName), 'utf8'));
  const p0 = planOf(meta0, opts.planId);
  const r = withFileLock(rootLockPath(runsDir, p0.root.path), () => fm.recoverJournal({ ...journalPaths(runsDir, folderName, p0.id), resolution: opts.resolution }), { timeoutMs: 60000 });
  rs.applyChange(runsDir, folderName, opts, (meta, ts) => {
    const p = planOf(meta, p0.id);
    if (r.state === 'conflict') p.status = 'conflict';
    else if (p.status === 'applying' || p.status === 'conflict') p.status = r.recovered ? 'recovered' : (r.state === 'applied' ? 'applied' : 'rolled-back');
    const detail = r.conflicts && r.conflicts.length ? `changed by someone else after the interruption: ${r.conflicts.map((c) => c.path).join(', ')}${r.state === 'conflict' ? ' — nothing restored; their versions kept as evidence; choose --resolution keep-current | restore-approved' : ` — resolved: ${opts.resolution}`}` : null;
    ledger(meta, ts, p, r.state === 'conflict' ? 'recover-conflict' : r.recovered ? 'recovered' : `recover-noop (${r.state})`, by, detail);
    writeLedgerDoc(runsDir, folderName, meta);
    return { by, transition: `target write plan ${p.id} recovery: ${r.state}` };
  });
  return r;
}

module.exports = { ROOT_KINDS, WRITE_PLAN_KINDS, unsafeRootReason, permittedRootFor, registerRoot, readRoots, rootsFile, planTargetWrite, approveTargetWrite, applyTargetWrite, recoverTargetWrite, renderLedger };
