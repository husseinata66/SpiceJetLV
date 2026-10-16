// Governed in-place baseline updates for a Promoted module (Phase 9.4) — the supported entry point to
// automationState.recordBaselineUpdate(), which until now had no command.
//
// After promotion a module's code lives only in the Workspace Automation Baseline, so a change to it (a Stage
// 4A extension, a Stage 5H repair) is made in place and then RECORDED as approved code. Two steps:
//
//   plan-baseline-update   the change is exactly the git difference between the module's recorded restore point
//                          (its current baselineRef — the last approved revision) and the commit holding the new
//                          code. Every changed path must be owned by this module (.baseline_ownership.json at that
//                          commit); a shared path needs an approved shared-asset change for exactly that content;
//                          anything foreign, unowned, or the ownership manifest itself is refused — an unrelated
//                          change is never recorded as this module's. The plan is a change manifest (BU-n.json)
//                          with each file's content fingerprint and a single fingerprint over all of it.
//   record-baseline-update a named human's approval of THAT manifest: re-derived from git and compared (a
//                          different diff, ownership or shared approval is refused), the module must still be at
//                          the plan's restore point (no other update since — the exact approved revision), and the
//                          baseline on disk must hold exactly the planned content. Then the Module Manager records
//                          it. The restore point and the command that returns to it are kept with the record.
// Re-running record after an interrupted run finishes the manifest; it never records twice.

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const { classifyPath } = require('./baselineOwnership');
const shared = require('./sharedAssets');
const automationState = require('../module_manager/automationState');
const { assertApproverName } = require('../run_manager/approverIdentity');
const { writeJsonAtomic, withFileLock } = require('../run_manager/atomicFile');

class BaselineUpdateError extends Error {
  constructor(message, code) { super(message); this.name = 'BaselineUpdateError'; this.code = code; }
}
const stable = (v) => (v === null || typeof v !== 'object' ? JSON.stringify(v)
  : Array.isArray(v) ? `[${v.map(stable).join(',')}]` : `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`);
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const posix = (p) => String(p).split(path.sep).join('/');

function gitIn(baseline) {
  return (...args) => execFileSync('git', args, { cwd: baseline, encoding: 'buffer', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28 });
}
const text = (b) => b.toString('utf8').trim();

/** Derives the change (no write). Throws BaselineUpdateError listing every refusal. */
function deriveChange({ modulesDir, slug, baselineAbs, toRef }) {
  const refusals = [];
  const state = automationState.readAutomationState(modulesDir, slug);
  if (!state) throw new BaselineUpdateError(`Module "${slug}" has no automation state.`, 'NO_STATE');
  if (state.state !== 'Promoted') throw new BaselineUpdateError(`Module "${slug}" is ${state.state}, not Promoted — a module with its own working copy is approved and merged, not updated in place.`, 'NOT_PROMOTED');
  const from = state.baselineRef;
  if (!from) throw new BaselineUpdateError(`Module "${slug}" records no baselineRef — there is no approved restore point to measure a change from.`, 'NO_RESTORE_POINT');
  // R-03 (Phase 9.5): only the Workspace Automation Baseline of this data root.
  let baseline;
  try { baseline = shared.assertWorkspaceBaseline(modulesDir, baselineAbs); } catch (err) { throw new BaselineUpdateError(err.message, err.code); }
  const git = gitIn(baseline);
  let top;
  try { top = fs.realpathSync.native(text(git('rev-parse', '--show-toplevel'))); } catch { throw new BaselineUpdateError(`${baseline} is not inside a git repository — an in-place change is recorded against a commit.`, 'NO_GIT'); }
  const prefix = posix(path.relative(top, baseline));
  const commit = (ref, what) => { try { return text(git('rev-parse', '--verify', `${ref}^{commit}`)); } catch { throw new BaselineUpdateError(`${what} ${ref} is not a commit in the baseline's repository.`, 'UNKNOWN_REF'); } };
  const fromC = commit(from, 'The restore point');
  const toC = commit(toRef || 'HEAD', 'The new revision');
  if (fromC === toC) throw new BaselineUpdateError(`${toRef || 'HEAD'} is the restore point itself — there is no change to record.`, 'NO_CHANGE');
  try { git('merge-base', '--is-ancestor', fromC, toC); } catch { throw new BaselineUpdateError(`The restore point ${fromC.slice(0, 12)} is not an ancestor of ${toC.slice(0, 12)} — the change cannot be measured from the last approved revision.`, 'NOT_DESCENDANT'); }
  const spec = prefix ? [prefix] : ['.'];
  const raw = text(git('diff', '--name-status', '--no-renames', fromC, toC, '--', ...spec));
  const rows = raw ? raw.split('\n').map((l) => { const [st, ...p] = l.split('\t'); return { status: st[0], repoPath: p.join('\t') }; }) : [];
  if (!rows.length) throw new BaselineUpdateError('No baseline file changed between the restore point and the new revision.', 'NO_CHANGE');
  const strip = (p) => (prefix ? posix(p).slice(prefix.length + 1) : posix(p));
  let manifest = null;
  try { manifest = JSON.parse(git('show', `${toC}:${prefix ? `${prefix}/` : ''}.baseline_ownership.json`).toString('utf8')); } catch { refusals.push('the new revision has no readable .baseline_ownership.json — ownership cannot be proven'); }
  const files = []; const sharedUsed = [];
  for (const r of rows) {
    const rel = strip(r.repoPath);
    const entry = { path: rel, status: r.status, contentSha: null };
    if (r.status !== 'D') entry.contentSha = sha(git('show', `${toC}:${r.repoPath}`));
    files.push(entry);
    if (rel === '.baseline_ownership.json') { refusals.push('the ownership manifest itself changed — ownership changes are reviewed on their own, never inside a module update'); continue; }
    if (!manifest) continue;
    const c = classifyPath(manifest, rel, slug);
    if (c.classification === 'owned') continue;
    if (c.classification === 'shared') {
      const op = r.status === 'D' ? 'delete' : r.status === 'A' ? 'create' : 'replace';
      const rec = shared.findApproved(modulesDir, rel, { operation: op, afterSha: entry.contentSha });
      if (rec) { sharedUsed.push(rec.id); entry.sharedChange = rec.id; } else refusals.push(`${rel}: a shared asset changed with no approved shared-asset change for exactly this content (automation_lifecycle plan-shared-change)`);
      continue;
    }
    refusals.push(`${rel}: ${c.classification === 'foreign' ? `owned by module "${c.owner}"` : 'owned by no module'} — an unrelated or unowned change is never recorded as "${slug}"'s`);
  }
  if (refusals.length) {
    const err = new BaselineUpdateError(`Baseline update for "${slug}" refused — nothing recorded:\n  - ${refusals.join('\n  - ')}`, 'UPDATE_REFUSED');
    err.refusals = refusals;
    throw err;
  }
  const body = { module: slug, baseline: posix(baseline), from: fromC, to: toC, files };
  return { body, fingerprint: sha(stable(body)), sharedUsed, git, top, prefix };
}

const updatesDir = (modulesDir, slug) => path.join(modulesDir, slug, 'automation', 'baseline_updates');

/** Plans a baseline update; writes BU-n.json. */
function planBaselineUpdate({ modulesDir, slug, baselineAbs, toRef, reason, now }) {
  if (!String(reason || '').trim()) throw new BaselineUpdateError('A baseline update states what changed and why (--reason).', 'MISSING_FIELD');
  const d = deriveChange({ modulesDir, slug, baselineAbs, toRef });
  const dir = updatesDir(modulesDir, slug);
  fs.mkdirSync(dir, { recursive: true });
  return withFileLock(path.join(dir, '.lock'), () => {
    const n = fs.readdirSync(dir).filter((x) => /^BU-\d+\.json$/.test(x)).length + 1;
    const rec = { schema: 'baseline-update/1', id: `BU-${n}`, at: now.toISOString(), reason: String(reason).trim(), ...d.body, sharedChanges: d.sharedUsed, fingerprint: d.fingerprint, status: 'planned', approval: null,
      rollback: { restorePoint: d.body.from, command: `git -C "${d.body.baseline}" checkout ${d.body.from.slice(0, 12)} -- ${d.body.files.map((f) => `"${f.path}"`).join(' ')}` } };
    writeJsonAtomic(path.join(dir, `${rec.id}.json`), rec);
    return rec;
  });
}

/** Records an approved, re-verified baseline update through the Module Manager. */
function recordGovernedBaselineUpdate({ modulesDir, slug, baselineAbs, id, approvedBy, run, now }) {
  const by = assertApproverName(approvedBy, `Baseline update ${id} of "${slug}"`);
  const dir = updatesDir(modulesDir, slug);
  const file = path.join(dir, `${id}.json`);
  if (!/^BU-\d+$/.test(String(id)) || !fs.existsSync(file)) throw new BaselineUpdateError(`No baseline update "${id}" for "${slug}".`, 'UNKNOWN_UPDATE');
  return withFileLock(path.join(dir, '.lock'), () => {
    const rec = JSON.parse(fs.readFileSync(file, 'utf8'));
    const body = { module: rec.module, baseline: rec.baseline, from: rec.from, to: rec.to, files: rec.files };
    if (sha(stable(body)) !== rec.fingerprint) throw new BaselineUpdateError(`${id} was edited after it was planned — plan it again.`, 'TAMPERED');
    if (rec.status === 'recorded') throw new BaselineUpdateError(`${id} is already recorded.`, 'ALREADY_RECORDED');
    const state = automationState.readAutomationState(modulesDir, slug);
    // Finishing an interrupted record: the Module Manager already holds it, the manifest does not say so yet.
    const last = (state && state.baselineUpdates || []).slice(-1)[0];
    if (state && state.baselineRef === rec.to && last && last.verification && last.verification.manifest === id) {
      rec.status = 'recorded'; rec.recordedAt = last.at; rec.approval = rec.approval || { by: last.approvedBy, at: last.at, fingerprint: rec.fingerprint };
      writeJsonAtomic(file, rec);
      return { record: rec, state, finished: true };
    }
    if (!state || state.baselineRef !== rec.from) {
      throw new BaselineUpdateError(`${id} was planned from restore point ${rec.from.slice(0, 12)}, but "${slug}" is now at ${state && state.baselineRef ? String(state.baselineRef).slice(0, 12) : 'no ref'} — another update was recorded since. Plan again from the current approved revision.`, 'STALE_UPDATE');
    }
    const d = deriveChange({ modulesDir, slug, baselineAbs, toRef: rec.to });
    if (d.fingerprint !== rec.fingerprint) throw new BaselineUpdateError(`${id} no longer matches the repository (the diff, the content or the ownership changed) — plan again.`, 'STALE_UPDATE');
    // The baseline on disk holds exactly the planned content.
    const drift = [];
    for (const f of rec.files) {
      const abs = path.join(rec.baseline, f.path);
      let now2 = null;
      try { now2 = sha(fs.readFileSync(abs)); } catch { now2 = null; }
      if (now2 !== f.contentSha) drift.push(f.path);
    }
    if (drift.length) throw new BaselineUpdateError(`The baseline on disk differs from the planned revision for: ${drift.join(', ')} — what is approved is what is recorded, nothing else.`, 'STALE_UPDATE');
    const stateNext = automationState.recordBaselineUpdate(modulesDir, slug, {
      now, approvedBy: by, baselineRef: rec.to, changedPaths: rec.files.map((f) => f.path), ...(run ? { run } : {}),
      verification: { manifest: id, fingerprint: rec.fingerprint, restorePoint: rec.from },
      verifyRef: (ref) => { try { d.git('rev-parse', '--verify', `${ref}^{commit}`); return true; } catch { return false; } },
      note: rec.reason,
    });
    if (rec.sharedChanges && rec.sharedChanges.length) shared.consume(modulesDir, rec.sharedChanges, `baseline update ${id} of ${slug}`);
    rec.status = 'recorded';
    rec.recordedAt = now.toISOString();
    rec.approval = { by, at: now.toISOString(), fingerprint: rec.fingerprint };
    writeJsonAtomic(file, rec);
    return { record: rec, state: stateNext, finished: false };
  });
}

module.exports = { BaselineUpdateError, deriveChange, planBaselineUpdate, recordGovernedBaselineUpdate, updatesDir };
