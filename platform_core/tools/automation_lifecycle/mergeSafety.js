// Workspace merge safety (Phase 9.1, audit finding F-04).
//
// `merge --apply` writes one module's automation into the shared Workspace Automation Baseline. Before
// the first byte is written, every precondition is proven, and the complete proposed change is set out
// in a manifest a human can read:
//
//   1. Approval provenance — the Module Manager's record (.module_automation_state.json) is Approved,
//      names its approver, and carries an Approved entry in its own history (pipeline.md §5.2). A git
//      commit message, a plan header or a run folder name is never proof of approval.
//   2. The exact approved revision — the module project on disk is byte-for-byte the revision the
//      approval recorded (automationState.automationRevision). Code changed after approval is not
//      approved code.
//   3. The package is the module's own — modules/{slug}/automation/tests_{Framework}/, for the --module
//      named.
//   4. Ownership and target paths (baselineOwnership.js) — every path stays inside the baseline; nothing
//      owned by another module is added, replaced, renamed or deleted; an existing baseline file is
//      replaced or deleted only when this module owns it (or, for a replacement, it is declared shared).
//      An unrelated baseline file is never deleted or replaced.
//
// Any failure refuses the whole merge (MergeSafetyError) with every reason listed; nothing is written.

const fs = require('fs');
const path = require('path');

const { readOwnership, classifyPath } = require('./baselineOwnership');
const { readAutomationState, automationRevision } = require('../module_manager/automationState');

class MergeSafetyError extends Error {
  constructor(message, manifest) {
    super(message);
    this.name = 'MergeSafetyError';
    this.code = 'MERGE_UNSAFE';
    this.manifest = manifest;
  }
}

const toPosix = (p) => String(p).split(path.sep).join('/');
const insideDir = (root, p) => { const r = path.relative(root, p); return r !== '' && !r.startsWith('..') && !path.isAbsolute(r); };

/**
 * Proves the merge is safe, without writing. Returns the manifest (always), with `refusals` listing every
 * failed precondition; `safe` is true only when there are none.
 * @param {{modulesDir: string, slug: string, packageAbs: string, baselineAbs: string, plan: object, runFolder?: string, now: Date}} o
 */
function evaluateMerge({ modulesDir, slug, packageAbs, baselineAbs, plan, runFolder = null, now }) {
  const refusals = [];
  const manifest = {
    schema: 'automation-merge-manifest/1',
    generatedAt: now instanceof Date ? now.toISOString() : null,
    module: slug || null,
    runFolder,
    baseline: toPosix(path.resolve(baselineAbs)),
    package: toPosix(path.resolve(packageAbs)),
    approval: null,
    revision: null,
    changes: { added: [], modified: [], deleted: [], renamed: [] },
    refusals,
    safe: false,
  };

  // 1. Approval provenance
  if (!slug) refusals.push('--module is required: a merge is always the merge of one named module.');
  const state = slug ? readAutomationState(modulesDir, slug) : null;
  if (slug && !state) refusals.push(`Module "${slug}" has no automation state in ${toPosix(modulesDir)} — nothing approved to merge.`);
  if (state) {
    const named = state.approvedBy && String(state.approvedBy).trim();
    const inHistory = (state.history || []).some((h) => h && h.state === 'Approved');
    manifest.approval = { state: state.state, approvedBy: state.approvedBy || null, approvedAt: state.approvedAt || null, recordedInHistory: inHistory };
    if (state.state !== 'Approved') refusals.push(`Module "${slug}"'s automation is ${state.state}, not Approved — only an Approved module project is merged into the baseline (pipeline.md §5.2).`);
    if (!named) refusals.push(`Module "${slug}"'s automation state names no approver — an approval that names nobody is not an approval.`);
    if (!inHistory) refusals.push(`Module "${slug}"'s automation state has no Approved entry in its history — the approval was not recorded by the Module Manager.`);
  }

  // 3. The package is this module's own project
  const expectedParent = slug ? path.resolve(modulesDir, slug, 'automation') : null;
  if (slug && !(path.dirname(path.resolve(packageAbs)) === expectedParent && /^tests_/.test(path.basename(packageAbs)))) {
    refusals.push(`The package ${toPosix(packageAbs)} is not module "${slug}"'s automation project (expected ${toPosix(expectedParent)}/tests_{Framework}).`);
  }

  // 2. The exact approved revision
  if (state) {
    const now2 = slug ? automationRevision(modulesDir, slug) : null;
    const pkgName = path.basename(packageAbs);
    const approved = state.approvedRevision || null;
    const approvedPkg = approved && approved.projects ? approved.projects[pkgName] : null;
    const currentPkg = now2 && now2.projects ? now2.projects[pkgName] : null;
    manifest.revision = { approved: approvedPkg || null, current: currentPkg || null };
    if (!approved) refusals.push(`Module "${slug}"'s Automation Approval recorded no revision (approved before Phase 9.1) — record the approval again so it covers an exact revision (module_manager automation ${slug} --state Approved --by "<name>").`);
    else if (!approvedPkg) refusals.push(`The approval for "${slug}" does not cover ${pkgName} — it was not part of the approved revision.`);
    else if (!currentPkg || currentPkg.sha256 !== approvedPkg.sha256) refusals.push(`${pkgName} has changed since it was approved (approved revision ${approvedPkg.sha256.slice(0, 12)}…, ${approvedPkg.fileCount} files; now ${currentPkg ? `${currentPkg.sha256.slice(0, 12)}…, ${currentPkg.fileCount} files` : 'missing'}) — only the exact approved revision is merged.`);
  }

  // 4. Ownership and target paths
  const ownership = readOwnership(baselineAbs);
  const base = path.resolve(baselineAbs);
  const cls = (rel) => classifyPath(ownership, rel, slug);
  const pathOk = (rel) => {
    const abs = path.resolve(base, rel);
    if (String(rel).replace(/\\/g, '/').split('/').includes('..') || !insideDir(base, abs)) { refusals.push(`${rel}: resolves outside the baseline — refused.`); return false; }
    return true;
  };
  // Shared assets (Phase 9.4): a merge creates, replaces or deletes a shared file ONLY when an approved
  // shared-asset change (sharedAssets.js, SAC-n) covers exactly that change — the same path, the same new
  // content. Ordinary promotion never overwrites a shared file on its own authority. Used approvals are
  // listed so the merge consumes them, once.
  // eslint-disable-next-line global-require
  const shared = require('./sharedAssets');
  manifest.sharedApprovals = [];
  const pkgSha = (rel) => { try { return require('crypto').createHash('sha256').update(fs.readFileSync(path.join(packageAbs, rel))).digest('hex'); } catch { return null; } }; // eslint-disable-line global-require
  const sharedCovered = (rel, operation) => {
    const rec = shared.findApproved(modulesDir, toPosix(rel), { operation, afterSha: operation === 'delete' ? null : pkgSha(rel) });
    if (rec) manifest.sharedApprovals.push(rec.id);
    return rec;
  };
  for (const rel of plan.added || []) {
    const c = cls(rel);
    manifest.changes.added.push({ path: rel, classification: c.classification, owner: c.owner });
    if (pathOk(rel) && c.classification === 'foreign') refusals.push(`add ${rel}: inside a path owned by module "${c.owner}".`);
    else if (pathOk(rel) && c.classification === 'shared' && !sharedCovered(rel, 'create')) refusals.push(`add ${rel}: a declared shared path — a shared asset is created only through an approved shared-asset change (automation_lifecycle plan-shared-change / approve-shared-change) for exactly this content.`);
  }
  for (const rel of plan.modified || []) {
    const c = cls(rel);
    manifest.changes.modified.push({ path: rel, classification: c.classification, owner: c.owner });
    if (!pathOk(rel)) continue;
    if (c.classification === 'foreign') refusals.push(`replace ${rel}: owned by module "${c.owner}".`);
    else if (c.classification === 'shared' && !sharedCovered(rel, 'replace')) refusals.push(`replace ${rel}: a shared baseline file — it is replaced only through an approved shared-asset change for exactly this content (automation_lifecycle plan-shared-change), never by a module's promotion.`);
    else if (c.classification === 'unowned') refusals.push(`replace ${rel}: an existing baseline file this module does not own and that is not declared shared — an unrelated baseline file is never replaced.`);
  }
  for (const rel of plan.deleted || []) {
    const c = cls(rel);
    manifest.changes.deleted.push({ path: rel, classification: c.classification, owner: c.owner });
    if (!pathOk(rel)) continue;
    if (c.classification === 'shared' && sharedCovered(rel, 'delete')) continue;
    if (c.classification !== 'owned') refusals.push(`delete ${rel}: ${c.classification === 'foreign' ? `owned by module "${c.owner}"` : c.classification === 'shared' ? 'a shared baseline file' : 'an existing baseline file this module does not own'} — only a file this module owns is ever deleted.`);
  }
  for (const r of plan.renamed || []) {
    const from = cls(r.from); const to = cls(r.to);
    manifest.changes.renamed.push({ from: r.from, to: r.to, classification: from.classification, owner: from.owner });
    if (!pathOk(r.from) || !pathOk(r.to)) continue;
    if (from.classification !== 'owned') refusals.push(`rename ${r.from} → ${r.to}: the source is ${from.classification === 'foreign' ? `owned by module "${from.owner}"` : 'not owned by this module'}.`);
    if (to.classification === 'foreign') refusals.push(`rename ${r.from} → ${r.to}: the destination is owned by module "${to.owner}".`);
  }
  if ((plan.conflicts || []).length) refusals.push(`${plan.conflicts.length} unresolved merge conflict(s): ${plan.conflicts.join(', ')}.`);
  if ((plan.dirty || []).length && plan.degradedMode !== 'no-git') refusals.push('the baseline has uncommitted changes.');

  manifest.safe = refusals.length === 0;
  return manifest;
}

/** Writes the manifest beside the module's automation state, before any baseline write. */
function writeMergeManifest(modulesDir, slug, manifest, now) {
  const dir = path.join(modulesDir, slug, 'automation', 'merge_manifests');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `MergeManifest_${(manifest.runFolder || 'run').replace(/[^\w.-]+/g, '_')}_${now.toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
  return file;
}

/** evaluateMerge, throwing MergeSafetyError with every refusal when it is not safe. */
function assertMergeSafe(o) {
  const manifest = evaluateMerge(o);
  if (!manifest.safe) {
    throw new MergeSafetyError(`Refusing to merge — ${manifest.refusals.length} precondition(s) failed; nothing was written:\n${manifest.refusals.map((r) => `  - ${r}`).join('\n')}`, manifest);
  }
  return manifest;
}

module.exports = { MergeSafetyError, evaluateMerge, assertMergeSafe, writeMergeManifest };
