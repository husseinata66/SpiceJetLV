// Safe module retirement (Phase 9.1, audit finding F-05).
//
// Retirement is the terminal step of promotion (pipeline.md §12.9/§12.10): the module's working copy is
// removed and the Workspace Automation Baseline becomes its single source of truth. It used to delete the
// working copy BEFORE the approval and assembly checks ran, so a refused promotion left the module with
// no working copy and no Promoted record. Now:
//
//   PRECONDITIONS — all proven before the first mutation, every failure reported at once:
//     the automation state is Approved, names its approver and has an Approved history entry; the module
//     was assembled (assembledAt); the working copy is exactly the approved revision; it is the module's
//     own tests_{Framework} package; byte-identity verification against the baseline passes; the owned
//     paths are declared, match files in the baseline, and collide with no other module (dry run).
//
//   THE OPERATION — journalled and reversible until the promotion is recorded:
//     1. write a journal (modules/{slug}/automation/.retirement_journal.json) with the prior ownership
//        manifest and automation state;
//     2. register ownership in the baseline;
//     3. MOVE the working copy aside (rename to tests_X.retiring-<stamp>) — nothing is deleted yet;
//     4. record Promoted (automationState.recordPromotion);
//     5. delete the moved-aside copy; remove the journal.
//   A failure in 2–4 rolls back: the ownership manifest and automation state are restored exactly, and the
//   working copy is moved back. A process that dies mid-way leaves the journal, and the next retire-module
//   refuses until `--recover` rolls it back (or, if Promoted was already recorded, finishes the cleanup).

const fs = require('fs');
const path = require('path');

const { verifyPromotion } = require('./promoteVerify');
const { registerModuleOwnership, ownershipPath, matchesPattern } = require('./baselineOwnership');
const { assertNotBaseline } = require('./cleanup');
const {
  readAutomationState, recordPromotion, automationRevision, automationStatePath,
} = require('../module_manager/automationState');

class RetirementSafetyError extends Error {
  constructor(message, code, detail) {
    super(message);
    this.name = 'RetirementSafetyError';
    this.code = code;
    this.detail = detail;
  }
}

const JOURNAL = '.retirement_journal.json';
const toPosix = (p) => String(p).split(path.sep).join('/');
const journalPath = (modulesDir, slug) => path.join(modulesDir, slug, 'automation', JOURNAL);
const readText = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } };

function listFiles(root) {
  const out = [];
  const walk = (d) => { let es = []; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } for (const e of es) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== '.git') walk(p); } else out.push(toPosix(path.relative(root, p))); } };
  walk(root);
  return out;
}

/**
 * Proves every retirement precondition without writing anything.
 * @returns {{ok: boolean, failures: string[], verification: object|null, state: object|null, revision: object|null}}
 */
function checkRetirement({ modulesDir, slug, baselineAbs, packageAbs, owned, shared, suite, promotedBy, execFileSync }) {
  const failures = [];
  const state = readAutomationState(modulesDir, slug);
  if (!promotedBy || !String(promotedBy).trim()) failures.push('--by must name the human promoting the module.');
  if (!Array.isArray(owned) || !owned.length) failures.push('--owned must declare the baseline paths this module owns.');
  if (fs.existsSync(journalPath(modulesDir, slug))) failures.push(`a previous retirement of "${slug}" did not finish (${toPosix(journalPath(modulesDir, slug))}) — run retire-module --recover first.`);
  if (!state) {
    failures.push(`Module "${slug}" has no automation state.`);
  } else {
    if (state.state !== 'Approved') failures.push(`Module "${slug}"'s automation is ${state.state}, not Approved — only an Approved module is promoted (pipeline.md §5.2).`);
    if (!(state.approvedBy && String(state.approvedBy).trim())) failures.push(`Module "${slug}"'s automation state names no approver.`);
    if (!(state.history || []).some((h) => h && h.state === 'Approved')) failures.push(`Module "${slug}"'s automation state has no recorded Approved entry.`);
    if (!state.assembledAt) failures.push(`Module "${slug}" has never been assembled into the baseline (no assembledAt) — merge it first (pipeline.md §12.4).`);
  }
  const expectedParent = path.resolve(modulesDir, slug, 'automation');
  if (!(path.dirname(path.resolve(packageAbs)) === expectedParent && /^tests_/.test(path.basename(packageAbs)))) {
    failures.push(`${toPosix(packageAbs)} is not module "${slug}"'s automation package (expected ${toPosix(expectedParent)}/tests_{Framework}).`);
  }
  try { assertNotBaseline(packageAbs, 'Module retirement'); } catch (err) { failures.push(err.message); }
  if (!fs.existsSync(packageAbs)) failures.push(`the working copy ${toPosix(packageAbs)} does not exist.`);

  // The exact approved revision.
  let revision = null;
  if (state && fs.existsSync(packageAbs)) {
    const name = path.basename(packageAbs);
    const approved = state.approvedRevision && state.approvedRevision.projects ? state.approvedRevision.projects[name] : null;
    const current = automationRevision(modulesDir, slug).projects[name] || null;
    revision = { approved, current };
    if (!approved) failures.push(`the Automation Approval of "${slug}" records no revision for ${name} — record the approval again so it covers an exact revision.`);
    else if (!current || current.sha256 !== approved.sha256) failures.push(`${name} has changed since it was approved — only the exact approved revision is retired.`);
    if (state.assembledRevision && approved && state.assembledRevision.sha256 !== approved.sha256) failures.push(`${name}: the revision merged into the baseline is not the approved revision.`);
  }

  // Byte identity with the baseline.
  let verification = null;
  try { verification = verifyPromotion(baselineAbs, packageAbs, { execFileSync }); } catch (err) { failures.push(`verification could not run: ${err.message}`); }
  if (verification && !verification.passed) failures.push(`byte-identity verification failed: ${verification.reason || `${verification.missing.length} missing, ${verification.differing.length} differing`}.`);

  // Ownership: declared paths exist in the baseline, and collide with no other module.
  if (Array.isArray(owned) && owned.length && fs.existsSync(baselineAbs)) {
    const files = listFiles(baselineAbs);
    for (const pattern of owned) if (!files.some((f) => matchesPattern(f, pattern))) failures.push(`--owned "${pattern}" matches no file in the baseline.`);
    try {
      registerModuleOwnership(baselineAbs, slug, { owned, shared, suite, now: new Date(), dryRun: true });
    } catch (err) { failures.push(err.message); }
  }
  return { ok: failures.length === 0, failures, verification, state, revision };
}

function writeJournal(modulesDir, slug, j) {
  fs.writeFileSync(journalPath(modulesDir, slug), `${JSON.stringify(j, null, 2)}\n`);
}

/** Restores ownership, automation state and the working copy from the journal. */
function rollback(modulesDir, slug, j) {
  const restored = [];
  if (j.steps.includes('ownership')) {
    if (j.ownershipBefore === null) { try { fs.rmSync(j.ownershipFile, { force: true }); } catch { /* none */ } } else fs.writeFileSync(j.ownershipFile, j.ownershipBefore);
    restored.push('ownership manifest');
  }
  if (j.steps.includes('promotion') && j.stateBefore !== null) {
    fs.writeFileSync(automationStatePath(modulesDir, slug), j.stateBefore);
    restored.push('automation state');
  }
  if (j.steps.includes('moved-aside') && fs.existsSync(j.asidePath) && !fs.existsSync(j.packagePath)) {
    fs.renameSync(j.asidePath, j.packagePath);
    restored.push('working copy');
  }
  try { fs.rmSync(journalPath(modulesDir, slug), { force: true }); } catch { /* best effort */ }
  return restored;
}

/**
 * Retires a module's working copy, or (apply: false) reports what would happen.
 * `inject` is a test-only failure-injection hook: inject(point) is called at every operation boundary.
 */
function retireModule(o) {
  const { modulesDir, slug, baselineAbs, packageAbs, owned, shared, suite, promotedBy, baselineRef, note, now, apply, execFileSync, inject = () => {} } = o;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new RetirementSafetyError('retireModule requires an explicit valid `now` Date.', 'INVALID_ARGUMENT');
  const check = checkRetirement({ modulesDir, slug, baselineAbs, packageAbs, owned, shared, suite, promotedBy, execFileSync });
  if (!check.ok) {
    throw new RetirementSafetyError(`Retirement of "${slug}" refused — ${check.failures.length} precondition(s) failed; nothing was changed:\n${check.failures.map((f) => `  - ${f}`).join('\n')}`, 'RETIREMENT_PRECONDITION', check);
  }
  if (!apply) return { dryRun: true, check, wouldRetire: toPosix(packageAbs), ownedPaths: owned };

  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const j = {
    schema: 'retirement-journal/1', slug, startedAt: now.toISOString(), steps: [],
    packagePath: path.resolve(packageAbs), asidePath: `${path.resolve(packageAbs)}.retiring-${stamp}`,
    ownershipFile: ownershipPath(baselineAbs), ownershipBefore: readText(ownershipPath(baselineAbs)),
    stateBefore: readText(automationStatePath(modulesDir, slug)),
  };
  writeJournal(modulesDir, slug, j);
  let manifest; let promoted;
  try {
    inject('before-ownership');
    manifest = registerModuleOwnership(baselineAbs, slug, { owned, shared, suite, baselineRef, promotedAt: now.toISOString(), now });
    j.steps.push('ownership'); writeJournal(modulesDir, slug, j);
    inject('after-ownership');
    fs.renameSync(j.packagePath, j.asidePath);
    j.steps.push('moved-aside'); writeJournal(modulesDir, slug, j);
    inject('after-move-aside');
    j.steps.push('promotion'); writeJournal(modulesDir, slug, j);
    promoted = recordPromotion(modulesDir, slug, {
      now, baselinePath: toPosix(baselineAbs), ownedPaths: owned, retiredPath: toPosix(j.packagePath),
      verification: { passed: true, fileCount: check.verification.verifiedCount }, promotedBy, baselineRef, note,
    });
    inject('after-promotion');
  } catch (err) {
    // Promoted was not recorded (or the injected failure came right after it): undo everything.
    const restored = rollback(modulesDir, slug, j);
    const e = new RetirementSafetyError(`Retirement of "${slug}" failed and was rolled back (${restored.join(', ') || 'nothing had changed'}): ${err.message}`, 'RETIREMENT_ROLLED_BACK', { cause: err.message, restored });
    throw e;
  }
  // Promoted is recorded; the working copy is only a moved-aside duplicate of baseline content now.
  j.steps.push('promoted'); writeJournal(modulesDir, slug, j);
  inject('before-delete');
  fs.rmSync(j.asidePath, { recursive: true, force: true });
  fs.rmSync(journalPath(modulesDir, slug), { force: true });
  return { dryRun: false, retired: toPosix(j.packagePath), ownership: manifest.modules[slug], state: promoted.state, sourceOfTruth: promoted.sourceOfTruth };
}

/** Finishes or undoes an interrupted retirement from its journal. */
function recoverRetirement(modulesDir, slug) {
  const file = journalPath(modulesDir, slug);
  if (!fs.existsSync(file)) return { recovered: false, reason: 'no unfinished retirement' };
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const state = readAutomationState(modulesDir, slug);
  if (state && state.state === 'Promoted' && j.steps.includes('promotion')) {
    // Promoted was recorded: the baseline is the source of truth; finish removing the moved-aside copy.
    if (fs.existsSync(j.asidePath)) fs.rmSync(j.asidePath, { recursive: true, force: true });
    fs.rmSync(file, { force: true });
    return { recovered: true, action: 'completed', detail: 'Promoted was already recorded; the moved-aside working copy was removed' };
  }
  const restored = rollback(modulesDir, slug, j);
  return { recovered: true, action: 'rolled-back', restored };
}

module.exports = { RetirementSafetyError, JOURNAL, checkRetirement, retireModule, recoverRetirement };
