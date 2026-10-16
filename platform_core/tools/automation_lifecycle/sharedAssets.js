// Shared automation assets — the one governed way to create, replace or delete a shared baseline file
// (Phase 9.4).
//
// A shared asset (pom.xml, base page objects, auth fixtures, common utilities — the `shared` patterns of
// .baseline_ownership.json) belongs to every module at once, so no single module's promotion may change it.
// A change to one is its own record — SAC-n — in <data root>/automation_shared_changes/:
//
//   plan     the path must be DECLARED shared; the record fixes what is there now (fingerprint), the exact
//            new content (copied into the record, fingerprinted), and an IMPACT ANALYSIS — every baseline
//            file that references the asset, and the modules that own them
//   approve  a named human approves THAT change, acknowledging the impact — bound to the record's fingerprint
//   apply    re-checks the approval and that the baseline still holds what was planned, then writes through
//            run_manager/fileMutation.js (journal, backup, rollback). Or: a module merge that carries exactly
//            the approved content consumes the approval instead (mergeSafety.js), once.
// Ordinary promotion never changes a shared file without such an approval.

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { readOwnership, classifyPath } = require('./baselineOwnership');
const fm = require('../run_manager/fileMutation');
const { writeJsonAtomic, withFileLock } = require('../run_manager/atomicFile');
const { assertApproverName } = require('../run_manager/approverIdentity');

class SharedAssetError extends Error {
  constructor(message, code) { super(message); this.name = 'SharedAssetError'; this.code = code; }
}
const OPERATIONS = Object.freeze(['create', 'replace', 'delete']);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'target', 'build', 'dist', 'out', '.idea', '.vscode', 'test-results', 'playwright-report', 'allure-results']);
const stable = (v) => (v === null || typeof v !== 'object' ? JSON.stringify(v)
  : Array.isArray(v) ? `[${v.map(stable).join(',')}]` : `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`);
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const posix = (p) => String(p).split(path.sep).join('/');

/**
 * R-03 (Phase 9.5): a shared-asset change writes only into the Workspace Automation Baseline of this data root —
 * <data root>/automation_baseline/<framework> (by real path). A folder elsewhere that carries its own
 * .baseline_ownership.json is not a baseline, whatever it declares.
 * @returns {string} the baseline's real path
 */
function assertWorkspaceBaseline(modulesDir, baselineAbs) {
  // eslint-disable-next-line global-require
  const { realPathOf } = require('../run_manager/pathBoundary');
  let real;
  try { real = fs.realpathSync.native(path.resolve(String(baselineAbs || ''))); } catch { throw new SharedAssetError(`Baseline ${baselineAbs} does not exist.`, 'NOT_A_BASELINE'); }
  const root = realPathOf(path.join(path.dirname(path.resolve(modulesDir)), 'automation_baseline'));
  const norm = (p) => (process.platform === 'win32' ? p.toLowerCase() : p);
  const rel = path.relative(norm(root), norm(real));
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new SharedAssetError(`${real} is not inside this data root's Workspace Automation Baseline (${root}) — shared assets change only there.`, 'NOT_A_BASELINE');
  }
  return real;
}

/** Where shared-change records live: beside modules/, in the data root. */
function changesDirFor(modulesDir) { return path.join(path.dirname(path.resolve(modulesDir)), 'automation_shared_changes'); }

function listChanges(changesDir) {
  let names = [];
  try { names = fs.readdirSync(changesDir).filter((n) => /^SAC-\d+\.json$/.test(n)); } catch { return []; }
  return names.map((n) => JSON.parse(fs.readFileSync(path.join(changesDir, n), 'utf8'))).sort((a, b) => Number(a.id.slice(4)) - Number(b.id.slice(4)));
}
function readChange(changesDir, id) {
  const f = path.join(changesDir, `${id}.json`);
  if (!/^SAC-\d+$/.test(String(id)) || !fs.existsSync(f)) throw new SharedAssetError(`No shared-asset change "${id}" in ${changesDir}.`, 'UNKNOWN_CHANGE');
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}
const save = (changesDir, rec) => writeJsonAtomic(path.join(changesDir, `${rec.id}.json`), rec);
const bodyOf = (r) => ({ path: r.path, operation: r.operation, baseline: r.baseline, beforeSha: r.beforeSha, afterSha: r.afterSha, impact: r.impact });

/** Every baseline file that mentions the asset (by file name, or by name without its extension), with its owner. */
function impactOf(baselineAbs, rel, manifest) {
  const name = path.basename(rel);
  const stem = name.replace(/\.[^.]+$/, '');
  const needles = [...new Set([rel, name, stem].filter((s) => s && s.length >= 3))];
  const refs = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name)); continue; }
      const abs = path.join(dir, e.name);
      const r = posix(path.relative(baselineAbs, abs));
      if (r === rel || r === '.baseline_ownership.json') continue;
      let text;
      try { if (fs.statSync(abs).size > 1024 * 1024) continue; text = fs.readFileSync(abs, 'utf8'); } catch { continue; }
      if (needles.some((n) => new RegExp(`(^|[^A-Za-z0-9_])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z0-9_]|$)`).test(text))) {
        const c = classifyPath(manifest, r, null);
        refs.push({ path: r, owner: c.owner || (c.classification === 'shared' ? '(shared)' : '(unowned)') });
      }
    }
  }(baselineAbs));
  const modules = [...new Set(refs.map((x) => x.owner).filter((o) => !o.startsWith('(')))].sort();
  return { referencedBy: refs.sort((a, b) => a.path.localeCompare(b.path)), modulesAffected: modules, declaredModules: Object.keys((manifest && manifest.modules) || {}).sort() };
}

/**
 * Plans a shared-asset change. The path must be declared shared; the content is copied into the record.
 * @returns {object} the SAC record
 */
function planSharedChange({ modulesDir, baselineAbs, relPath, operation, sourceFile, reason, now }) {
  if (!(now instanceof Date)) throw new SharedAssetError('planSharedChange requires `now`.', 'INVALID_ARGUMENT');
  if (!OPERATIONS.includes(operation)) throw new SharedAssetError(`Operation must be one of ${OPERATIONS.join(', ')}.`, 'INVALID_ARGUMENT');
  if (!String(reason || '').trim()) throw new SharedAssetError('A shared-asset change states why (--reason).', 'MISSING_FIELD');
  const baseline = assertWorkspaceBaseline(modulesDir, baselineAbs);
  const abs = fm.resolveInside(baseline, relPath, 'shared asset path');
  const rel = posix(path.relative(baseline, abs));
  const manifest = readOwnership(baseline);
  if (!manifest) throw new SharedAssetError(`The baseline has no ownership manifest (.baseline_ownership.json) — nothing is declared shared, so nothing can change as shared.`, 'NOT_SHARED');
  const c = classifyPath(manifest, rel, null);
  if (c.classification !== 'shared') {
    throw new SharedAssetError(`${rel} is ${c.classification === 'foreign' || c.owner ? `owned by module "${c.owner}"` : 'not declared shared'} — only a path the ownership manifest declares shared changes through this path.`, 'NOT_SHARED');
  }
  const beforeSha = fm.fileSha(abs);
  if (operation === 'create' && beforeSha) throw new SharedAssetError(`${rel} already exists — use replace.`, 'INVALID_ARGUMENT');
  if (operation !== 'create' && !beforeSha) throw new SharedAssetError(`${rel} does not exist — nothing to ${operation}.`, 'INVALID_ARGUMENT');
  let content = null;
  if (operation !== 'delete') {
    try { content = fs.readFileSync(path.resolve(String(sourceFile || ''))); } catch { throw new SharedAssetError(`--source ${sourceFile} cannot be read — the new content is part of what is approved.`, 'MISSING_ARTIFACT'); }
  }
  const changesDir = changesDirFor(modulesDir);
  fs.mkdirSync(changesDir, { recursive: true });
  return withFileLock(path.join(changesDir, '.lock'), () => {
    const id = `SAC-${listChanges(changesDir).length + 1}`;
    if (content) fs.writeFileSync(path.join(changesDir, `${id}.content`), content);
    const rec = {
      schema: 'shared-asset-change/1', id, at: now.toISOString(), path: rel, operation, baseline: posix(baseline), pattern: c.pattern,
      beforeSha, afterSha: content ? sha(content) : null, reason: String(reason).trim(), impact: impactOf(baseline, rel, manifest),
      status: 'planned', approval: null, appliedAt: null, consumedBy: null,
    };
    rec.fingerprint = sha(stable(bodyOf(rec)));
    save(changesDir, rec);
    return rec;
  });
}

/** A named human approves the change and its impact, bound to the record's fingerprint. */
function approveSharedChange({ modulesDir, id, approvedBy, fingerprint, now }) {
  const by = assertApproverName(approvedBy, `Shared-asset change ${id}`);
  const changesDir = changesDirFor(modulesDir);
  return withFileLock(path.join(changesDir, '.lock'), () => {
    const rec = readChange(changesDir, id);
    if (rec.status !== 'planned') throw new SharedAssetError(`${id} is ${rec.status}, not planned.`, 'ILLEGAL_TRANSITION');
    if (sha(stable(bodyOf(rec))) !== rec.fingerprint) throw new SharedAssetError(`${id}'s record was edited after it was planned — plan it again.`, 'TAMPERED');
    if (fingerprint && fingerprint !== rec.fingerprint) throw new SharedAssetError(`${id}'s fingerprint is ${rec.fingerprint.slice(0, 12)}, not the ${String(fingerprint).slice(0, 12)} reviewed.`, 'FINGERPRINT_MISMATCH');
    rec.approval = { by, at: now.toISOString(), fingerprint: rec.fingerprint, impactAcknowledged: rec.impact.modulesAffected };
    rec.status = 'approved';
    save(changesDir, rec);
    return rec;
  });
}

/** True approval check used by apply, merge and baseline updates. */
function assertUsable(changesDir, rec) {
  if (rec.status !== 'approved' || !rec.approval) throw new SharedAssetError(`${rec.id} is ${rec.status} — not an open approval.`, 'APPROVAL_REQUIRED');
  if (sha(stable(bodyOf(rec))) !== rec.fingerprint || rec.approval.fingerprint !== rec.fingerprint) throw new SharedAssetError(`${rec.id} no longer matches what was approved.`, 'TAMPERED');
  if (rec.afterSha) {
    let buf;
    try { buf = fs.readFileSync(path.join(changesDir, `${rec.id}.content`)); } catch { throw new SharedAssetError(`${rec.id}'s approved content is missing.`, 'TAMPERED'); }
    if (sha(buf) !== rec.afterSha) throw new SharedAssetError(`${rec.id}'s approved content was changed after approval.`, 'TAMPERED');
    return buf;
  }
  return null;
}

/** Applies an approved change to the baseline (journal + backup + rollback). */
function applySharedChange({ modulesDir, id, baselineAbs }) {
  const changesDir = changesDirFor(modulesDir);
  return withFileLock(path.join(changesDir, '.lock'), () => {
    const rec = readChange(changesDir, id);
    const content = assertUsable(changesDir, rec);
    const baseline = assertWorkspaceBaseline(modulesDir, baselineAbs);
    if (posix(baseline).toLowerCase() !== String(rec.baseline).toLowerCase()) throw new SharedAssetError(`${id} was planned for ${rec.baseline}, not ${posix(baseline)}.`, 'STALE_CHANGE');
    const c = classifyPath(readOwnership(baseline), rec.path, null);
    if (c.classification !== 'shared') throw new SharedAssetError(`${rec.path} is no longer declared shared.`, 'NOT_SHARED');
    const op = rec.operation === 'replace' ? 'update' : rec.operation;
    const dir = path.join(changesDir, id);
    fm.applyFileChanges({ root: baseline, changes: [{ op, path: rec.path, beforeSha: rec.beforeSha, content, afterSha: rec.afterSha }], journalFile: path.join(dir, 'journal.json'), backupDir: path.join(dir, 'backup'), label: `Shared-asset change ${id}` });
    rec.status = 'applied';
    rec.appliedAt = new Date().toISOString();
    save(changesDir, rec);
    return rec;
  });
}

/** An open approval that covers exactly this change of `relPath` (to `afterSha`, or a delete), or null. */
function findApproved(modulesDir, relPath, { operation, afterSha }) {
  const changesDir = changesDirFor(modulesDir);
  for (const rec of listChanges(changesDir)) {
    if (rec.path !== posix(relPath) || rec.status !== 'approved') continue;
    const opOk = operation === 'delete' ? rec.operation === 'delete' : rec.operation !== 'delete';
    if (!opOk || (operation !== 'delete' && rec.afterSha !== afterSha)) continue;
    try { assertUsable(changesDir, rec); return rec; } catch { /* not usable */ }
  }
  return null;
}

/** Marks approvals consumed by a merge or a baseline update — each approval covers one change, once. */
function consume(modulesDir, ids, by) {
  const changesDir = changesDirFor(modulesDir);
  withFileLock(path.join(changesDir, '.lock'), () => {
    for (const id of ids) {
      const rec = readChange(changesDir, id);
      if (rec.status !== 'approved') continue;
      rec.status = 'consumed';
      rec.consumedBy = { by, at: new Date().toISOString() };
      save(changesDir, rec);
    }
  });
}

module.exports = { assertWorkspaceBaseline, SharedAssetError, OPERATIONS, changesDirFor, listChanges, readChange, impactOf, planSharedChange, approveSharedChange, applySharedChange, findApproved, consume };
