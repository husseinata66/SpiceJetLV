#!/usr/bin/env node
// Automation Asset Lifecycle CLI. See workflows_and_pipelines/pipeline/pipeline.md §12.
//
// Usage — `--package` is the package being worked on: since 2026-07-29 that is the MODULE AUTOMATION
// PROJECT at platform_core_data/modules/{slug}/automation/tests_{Framework}/ (pipeline.md §12.1).
// `--run-package` is accepted as its pre-migration alias.
//
//   node platform_core/tools/automation_lifecycle/cli.js copy-in --baseline <path> --package <path>
//   node platform_core/tools/automation_lifecycle/cli.js plan-merge --baseline <path> --package <path> [--json]
//   node platform_core/tools/automation_lifecycle/cli.js merge --baseline <path> --package <path> \
//     --project <Name> --package-name <PackageName> --module <slug> --run-folder <RUN> [--apply]
//   node platform_core/tools/automation_lifecycle/cli.js cleanup --package <path> --plan <planJsonPath> \
//     [--scope build-only|all-accounted] [--apply]
//
// `cleanup` defaults to --scope build-only, which keeps a module project's SOURCE and removes only
// build/IDE output (pipeline.md §12.5). Pass --scope all-accounted only for a location meant to
// disappear after the merge.
//
// PROMOTION AS A TERMINAL MOVE (2026-08-17, user-mandated) — pipeline.md §12.5/§12.9/§12.10:
//
//   node .../cli.js resolve-root --module <slug> [--json]
//                                              # WHERE this module's code lives right now. Every
//                                              # stage asks this instead of building a path.
//   node .../cli.js verify-promotion --baseline <path> --package <path> [--json]
//                                              # byte-identity proof, required before retirement
//   node .../cli.js retire-module --module <slug> --baseline <path> --package <path> \
//     --owned <glob,glob> [--shared <glob,glob>] [--suite <file>] --by "<name>" [--apply]
//                                              # every precondition first (Approved + approver, assembled,
//                                              # exact approved revision, byte identity, ownership), then a
//                                              # journalled, rolled-back-on-failure retirement (Phase 9.1).
//   node .../cli.js retire-module --module <slug> --recover
//                                              # finish or roll back a retirement that did not complete
//   node .../cli.js check-retired --module <slug>
//                                              # asserts a retired directory has NOT come back
//   node .../cli.js check-ownership --module <slug> --baseline <path> [--paths a,b,c]
//                                              # classifies changed baseline paths as owned/shared/
//                                              # foreign; non-zero exit on any foreign path
//
// `--modules-dir` overrides where modules/ is looked for (defaults to platform_core_data/modules).

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { copyBaselineIntoModule, loadSnapshot, SNAPSHOT_FILENAME } = require('./baselineCopy');
const { computeMergePlan, assertSameWorkTree } = require('./mergePlan');
const { discoverRepo } = require('./gitUtils');

/**
 * The repository governing the baseline, with the package checked to be inside its work tree (Phase 9.3,
 * F-25) — before any git command reads the package. A package outside it is refused with MERGE_TOPOLOGY.
 */
function governedRepo(baseline, pkg) {
  if (typeof baseline !== 'string' || !baseline) throw Object.assign(new Error('--baseline <dir> is required.'), { code: 'INVALID_ARGUMENT' });
  const repo = discoverRepo(path.resolve(baseline), { execFileSync });
  if (repo.available) assertSameWorkTree(repo, baseline, pkg);
  return repo;
}
const { applyMerge } = require('./mergeApply');
const { cleanupPackage, retireModulePackage } = require('./cleanup');
const { resolveAutomationRoot, assertModuleDirRetired } = require('./automationRoot');
const { verifyPromotion, renderVerificationReport } = require('./promoteVerify');
const { registerModuleOwnership, readOwnership, classifyChangeset } = require('./baselineOwnership');
const { recordPromotion, readAutomationState, recordAssembly } = require('../module_manager/automationState');
const { evaluateMerge, writeMergeManifest } = require('./mergeSafety');
const { retireModule, recoverRetirement } = require('./retireModule');

const DEFAULT_MODULES_DIR = 'platform_core_data/modules';

function modulesDir(args) {
  return typeof args['modules-dir'] === 'string' ? args['modules-dir'] : DEFAULT_MODULES_DIR;
}

/** Splits a comma-separated CLI list, tolerating spaces and a trailing comma. */
function listArg(value) {
  if (typeof value !== 'string') return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

function requiredArg(args, name, why) {
  const value = args[name];
  if (typeof value !== 'string' || !value) {
    throw new Error(`Missing --${name} — ${why}`);
  }
  return value;
}

/**
 * Resolves the package PATH from `--run-package` (pre-migration) or `--package` (current).
 *
 * `--run-package` is checked FIRST on purpose. In the old `merge` spelling, `--package` carried the
 * package *name* while `--run-package` carried the path; preferring `--package` would hand a package
 * name to `fs` and fail somewhere with no connection to the mistake. When `--run-package` is present
 * it is unambiguously the path, so it wins.
 *
 * Missing is an explicit error rather than an `undefined` handed to `fs`, for the same reason.
 */
function packagePath(args) {
  const p = args['run-package'] || args.package;
  if (!p || p === true) {
    throw new Error(
      'Missing --package (the module automation project path, e.g. '
      + 'platform_core_data/modules/login/automation/tests_PW). --run-package is accepted as its '
      + 'pre-migration alias.'
    );
  }
  return p;
}

/**
 * Resolves the package NAME from `--package-name` (current) or `--package` (old spelling).
 *
 * `--package` only counts as a name when it is not also serving as the path — i.e. when
 * `--run-package` supplied the path. Returns undefined otherwise, which applyMerge() renders as a
 * missing segment rather than a wrong one.
 */
function packageName(args) {
  if (typeof args['package-name'] === 'string') return args['package-name'];
  if (args['run-package'] && typeof args.package === 'string') return args.package;
  return undefined;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i += 1;
      }
    }
  }
  return out;
}

function cmdCopyIn(args) {
  // Fail closed (Phase 9.4): a working copy is seeded only for a named module, into that module's own
  // automation/tests_{Framework} folder, never for a Promoted module, and never over existing files — cpSync
  // would otherwise overwrite whatever folder --package names (another module's copy, a target project).
  const slug = typeof args.module === 'string' ? args.module : null;
  if (!slug) throw Object.assign(new Error('copy-in requires --module <slug>: a working copy is always one module\'s.'), { code: 'INVALID_ARGUMENT' });
  const pkg = path.resolve(packagePath(args));
  const expected = path.resolve(modulesDir(args), slug, 'automation');
  if (path.dirname(pkg) !== expected || !/^tests_/.test(path.basename(pkg))) {
    throw Object.assign(new Error(`copy-in refused: ${pkg} is not module "${slug}"'s automation project (expected ${expected}${path.sep}tests_{Framework}).`), { code: 'OUTSIDE_MODULE' });
  }
  if (fs.existsSync(pkg) && fs.readdirSync(pkg).length) {
    throw Object.assign(new Error(`copy-in refused: ${pkg} already holds files — an existing working copy is never overwritten by a re-seed.`), { code: 'DESTINATION_NOT_EMPTY' });
  }
  const moduleState = readAutomationState(modulesDir(args), slug);
  const result = copyBaselineIntoModule(args.baseline, pkg, { execFileSync, now: new Date(), moduleState: moduleState ? { ...moduleState, module: slug } : undefined });
  console.log(JSON.stringify(result, null, 2));
}

function cmdPlanMerge(args) {
  const pkg = packagePath(args);
  const snapshotPath = path.join(path.dirname(pkg), SNAPSHOT_FILENAME);
  const snapshot = loadSnapshot(snapshotPath);
  const repo = governedRepo(args.baseline, pkg);
  const plan = computeMergePlan(args.baseline, pkg, snapshot, { execFileSync, repo });
  if (args.json) {
    console.log(JSON.stringify(plan, null, 2));
  } else {
    console.log(`Baseline: ${plan.baselinePath}`);
    console.log(`Dirty: ${plan.dirty.length ? plan.dirty.join('; ') : 'clean'}`);
    console.log(`Baseline moved since snapshot: ${plan.baselineMoved}`);
    console.log(`Added (${plan.added.length}): ${plan.added.join(', ') || '-'}`);
    console.log(`Modified (${plan.modified.length}): ${plan.modified.join(', ') || '-'}`);
    console.log(`Deleted (${plan.deleted.length}): ${plan.deleted.join(', ') || '-'}`);
    console.log(`Renamed (${plan.renamed.length}): ${plan.renamed.map((r) => `${r.from}->${r.to}`).join(', ') || '-'}`);
    console.log(`Conflicts (${plan.conflicts.length}): ${plan.conflicts.join(', ') || '-'}`);
    console.log(`Discarded/ignored (${plan.discardedIgnored.length}): ${plan.discardedIgnored.join(', ') || '-'}`);
  }
  return plan;
}

function cmdMerge(args) {
  const pkg = packagePath(args);
  const snapshotPath = path.join(path.dirname(pkg), SNAPSHOT_FILENAME);
  const snapshot = loadSnapshot(snapshotPath);
  const repo = governedRepo(args.baseline, pkg);
  const plan = computeMergePlan(args.baseline, pkg, snapshot, { execFileSync, repo });
  // Phase 9.1, F-04: every precondition is proven, and the full proposed change set out, BEFORE any write —
  // approval provenance, the exact approved revision, the module's own package, ownership, target paths.
  const slug = typeof args.module === 'string' ? args.module : undefined;
  const dir = modulesDir(args);
  const stamp = new Date();
  const manifest = evaluateMerge({ modulesDir: dir, slug, packageAbs: pkg, baselineAbs: args.baseline, plan, runFolder: args['run-folder'] || null, now: stamp });
  if (!args.apply) {
    console.log(JSON.stringify({ plan, manifest, result: { applied: false, reason: manifest.safe ? 'dry run — pass --apply to merge' : 'dry run — the merge would be refused' } }, null, 2));
    return { plan, manifest };
  }
  if (!manifest.safe) {
    console.error(`MERGE_UNSAFE: refusing to merge — ${manifest.refusals.length} precondition(s) failed; nothing was written:\n${manifest.refusals.map((r) => `  - ${r}`).join('\n')}`);
    console.log(JSON.stringify({ manifest }, null, 2));
    process.exitCode = 1;
    return { plan, manifest };
  }
  const manifestFile = writeMergeManifest(dir, slug, manifest, stamp);
  const result = applyMerge(
    args.baseline,
    pkg,
    plan,
    {
      project: args.project,
      packageName: packageName(args),
      // The source module's slug, recorded in the assembly commit message (pipeline.md §12.4 step 4).
      module: slug,
      runFolder: args['run-folder'],
      approval: manifest.approval,
    },
    { execFileSync, now: stamp, apply: true },
  );
  // The assembly is recorded by the Module Manager, with the revision that was merged and the manifest
  // that described it — so a later retirement can prove what is in the baseline.
  const assembled = recordAssembly(dir, slug, { now: stamp, mergeSummaryPath: manifestFile.split(path.sep).join('/'), assembledRevision: manifest.revision.approved });
  // Shared-asset approvals this merge used are consumed — each covers one change, once (Phase 9.4).
  // eslint-disable-next-line global-require
  if ((manifest.sharedApprovals || []).length) require('./sharedAssets').consume(dir, manifest.sharedApprovals, `merge of ${slug}`);
  console.log(JSON.stringify({ plan, manifest: { ...manifest, file: manifestFile }, result, assembledAt: assembled.assembledAt }, null, 2));
  return { plan, manifest, result };
}

/**
 * `all-accounted` deletes working-copy files on the strength of a merge plan. It is accepted only for the
 * merge that was actually applied (Phase 9.3, workflow enforcement): the module's automation state records an
 * assembly (written only by a governed `merge --apply`, after Automation Approval and every merge
 * precondition), and every path it would delete is one that assembly's recorded merge manifest took into the
 * baseline. A plan file alone — which anyone can write — never authorizes a deletion. `build-only` (discarded,
 * regenerable build output) needs none of this.
 */
function assertCleanupAccounted(args, plan, scope) {
  if (scope !== 'all-accounted') return;
  const refuse = (why) => { throw Object.assign(new Error(`Cleanup refused, nothing deleted: ${why}`), { code: 'CLEANUP_UNVERIFIED' }); };
  const slug = typeof args.module === 'string' ? args.module : null;
  if (!slug) refuse('--scope all-accounted names the module whose applied merge it cleans up (--module <slug>).');
  const state = readAutomationState(modulesDir(args), slug);
  if (!state || !state.assembledAt || !state.lastMergeSummary) refuse(`module "${slug}" has no recorded assembly — its working copy was never merged into the baseline by a governed merge --apply.`);
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(path.resolve(state.lastMergeSummary), 'utf8')); } catch { refuse(`the recorded merge manifest ${state.lastMergeSummary} cannot be read.`); }
  if (!manifest.safe || !manifest.changes) refuse(`the recorded merge manifest ${state.lastMergeSummary} is not a safe, applied merge.`);
  const merged = new Set([
    ...manifest.changes.added.map((c) => c.path), ...manifest.changes.modified.map((c) => c.path),
    ...manifest.changes.deleted.map((c) => c.path), ...manifest.changes.renamed.map((c) => c.from),
  ]);
  const outside = [...(plan.added || []), ...(plan.modified || []), ...(plan.deleted || []), ...(plan.renamed || []).map((r) => r.from)].filter((p) => !merged.has(p));
  if (outside.length) refuse(`${outside.length} path(s) in the plan were not part of the recorded merge (${outside.slice(0, 5).join(', ')}${outside.length > 5 ? ', …' : ''}).`);
}

// ---- Phase 9.4: governed baseline updates (Promoted modules) and shared-asset changes ----
const str = (args, k) => (typeof args[k] === 'string' ? args[k] : undefined);
function needModule(args) {
  const slug = str(args, 'module');
  if (!slug) throw Object.assign(new Error('--module <slug> is required.'), { code: 'INVALID_ARGUMENT' });
  return slug;
}
function cmdPlanBaselineUpdate(args) {
  // eslint-disable-next-line global-require
  const bu = require('./baselineUpdate');
  const rec = bu.planBaselineUpdate({ modulesDir: modulesDir(args), slug: needModule(args), baselineAbs: str(args, 'baseline'), toRef: str(args, 'to'), reason: str(args, 'reason'), now: new Date() });
  console.log(JSON.stringify({ planned: rec.id, from: rec.from, to: rec.to, files: rec.files, sharedChanges: rec.sharedChanges, fingerprint: rec.fingerprint, next: `record-baseline-update --module ${rec.module} --baseline <dir> --update ${rec.id} --approved-by "<name>"` }, null, 2));
}
function cmdRecordBaselineUpdate(args) {
  // eslint-disable-next-line global-require
  const bu = require('./baselineUpdate');
  const r = bu.recordGovernedBaselineUpdate({ modulesDir: modulesDir(args), slug: needModule(args), baselineAbs: str(args, 'baseline'), id: str(args, 'update'), approvedBy: str(args, 'approved-by'), run: str(args, 'run-folder'), now: new Date() });
  console.log(JSON.stringify({ recorded: r.record.id, baselineRef: r.record.to, approvedBy: r.record.approval.by, restorePoint: r.record.rollback.restorePoint, rollback: r.record.rollback.command, finishedInterrupted: r.finished }, null, 2));
}
function cmdPlanSharedChange(args) {
  // eslint-disable-next-line global-require
  const sa = require('./sharedAssets');
  const rec = sa.planSharedChange({ modulesDir: modulesDir(args), baselineAbs: str(args, 'baseline'), relPath: str(args, 'path'), operation: str(args, 'operation'), sourceFile: str(args, 'source'), reason: str(args, 'reason'), now: new Date() });
  console.log(JSON.stringify({ planned: rec.id, path: rec.path, operation: rec.operation, impact: rec.impact, fingerprint: rec.fingerprint, next: `approve-shared-change --change ${rec.id} --approved-by "<name>" --fingerprint ${rec.fingerprint}` }, null, 2));
}
function cmdApproveSharedChange(args) {
  // eslint-disable-next-line global-require
  const sa = require('./sharedAssets');
  const rec = sa.approveSharedChange({ modulesDir: modulesDir(args), id: str(args, 'change'), approvedBy: str(args, 'approved-by'), fingerprint: str(args, 'fingerprint'), now: new Date() });
  console.log(JSON.stringify({ approved: rec.id, by: rec.approval.by, impactAcknowledged: rec.approval.impactAcknowledged }, null, 2));
}
function cmdApplySharedChange(args) {
  // eslint-disable-next-line global-require
  const sa = require('./sharedAssets');
  const rec = sa.applySharedChange({ modulesDir: modulesDir(args), id: str(args, 'change'), baselineAbs: str(args, 'baseline') });
  console.log(JSON.stringify({ applied: rec.id, path: rec.path, operation: rec.operation }, null, 2));
}
function cmdSharedChanges(args) {
  // eslint-disable-next-line global-require
  const sa = require('./sharedAssets');
  console.log(JSON.stringify(sa.listChanges(sa.changesDirFor(modulesDir(args))).map((r) => ({ id: r.id, path: r.path, operation: r.operation, status: r.status, approvedBy: r.approval ? r.approval.by : null })), null, 2));
}

function cmdCleanup(args) {
  const plan = JSON.parse(fs.readFileSync(args.plan, 'utf8'));
  assertCleanupAccounted(args, plan, typeof args.scope === 'string' ? args.scope : 'build-only');
  const result = cleanupPackage(packagePath(args), plan, {
    apply: Boolean(args.apply),
    // Undefined falls through to cleanup.js's own safe default ('build-only'), so the default lives
    // in exactly one place rather than being restated here.
    scope: typeof args.scope === 'string' ? args.scope : undefined,
  });
  console.log(JSON.stringify(result, null, 2));
}

function cmdResolveRoot(args) {
  const slug = requiredArg(args, 'module', 'resolution is per module.');
  const resolved = resolveAutomationRoot(slug, {
    modulesDir: modulesDir(args),
    baselineRoot: args.baseline || 'platform_core_data/automation_baseline',
    framework: typeof args.framework === 'string' ? args.framework : undefined,
  });
  if (args.json) {
    console.log(JSON.stringify(resolved, null, 2));
    return resolved;
  }
  console.log(`Module:        ${resolved.slug}`);
  console.log(`State:         ${resolved.state}`);
  console.log(`Source of truth: ${resolved.mode === 'baseline' ? 'Workspace Automation Baseline' : 'module workspace'}`);
  console.log(`Root:          ${resolved.root}`);
  console.log(`Exists:        ${resolved.exists}`);
  if (resolved.mode === 'baseline') {
    console.log(`Owned paths:   ${resolved.ownedPaths.join(', ') || '(none declared)'}`);
    console.log(`Module suite:  ${resolved.suite || '(none)'}`);
  }
  return resolved;
}

function cmdVerifyPromotion(args) {
  const report = verifyPromotion(args.baseline, packagePath(args), { execFileSync });
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(renderVerificationReport(report));
  }
  // A failed verification must be visible to a shell script, not just to a reader.
  if (!report.passed) process.exitCode = 1;
  return report;
}

/**
 * verify -> register ownership -> retire the working copy -> record Promoted.
 *
 * Ordered so nothing irreversible happens before its own precondition is proven, and so a dry run
 * exercises every check except the delete. Ownership is registered BEFORE the deletion on purpose:
 * if the process dies between the two, the baseline still knows who owns what, whereas a deletion
 * with no ownership record would leave code in the baseline that no module can claim.
 */
function cmdRetireModule(args) {
  const slug = requiredArg(args, 'module', 'retirement is per module.');
  const dir = modulesDir(args);
  // Phase 9.1, F-05: a retirement that did not finish is recovered first — rolled back, or completed if
  // Promoted was already recorded. Nothing else runs while a journal is open.
  if (args.recover) {
    const r = recoverRetirement(dir, slug);
    console.log(JSON.stringify(r, null, 2));
    return r;
  }
  const baseline = requiredArg(args, 'baseline', 'the baseline path is what gets verified against.');
  const pkg = packagePath(args);
  const owned = listArg(args.owned);
  const apply = Boolean(args.apply);
  if (owned.length === 0) {
    throw new Error(
      'Missing --owned — the baseline paths this module owns. Without them the module cannot be ' +
      'located inside the shared baseline afterwards (pipeline.md §12.9).'
    );
  }
  const promotedBy = requiredArg(args, 'by', 'an unattributed promotion record is not a record.');
  try {
    // Every precondition — approval, assembly, exact approved revision, byte identity, ownership — is
    // proven before the first mutation; the operation itself is journalled and rolled back on failure.
    const result = retireModule({
      modulesDir: dir, slug, baselineAbs: baseline, packageAbs: pkg, owned, promotedBy,
      shared: listArg(args.shared).length ? listArg(args.shared) : undefined,
      suite: typeof args.suite === 'string' ? args.suite : undefined,
      baselineRef: typeof args['baseline-ref'] === 'string' ? args['baseline-ref'] : undefined,
      note: typeof args.note === 'string' ? args.note : undefined,
      now: new Date(), apply, execFileSync,
    });
    if (result.check && result.check.verification) console.log(renderVerificationReport(result.check.verification));
    console.log(JSON.stringify(result.dryRun ? { dryRun: true, wouldRetire: result.wouldRetire, ownedPaths: result.ownedPaths } : result, null, 2));
    return result;
  } catch (err) {
    if (err.name !== 'RetirementSafetyError') throw err;
    console.error(`${err.code}: ${err.message}`);
    console.error('The module working copy is untouched.');
    process.exitCode = 1;
    return { refused: err.code, detail: err.detail };
  }
}

function cmdCheckRetired(args) {
  const slug = requiredArg(args, 'module', 'the check is per module.');
  const result = assertModuleDirRetired(slug, {
    modulesDir: modulesDir(args),
    framework: typeof args.framework === 'string' ? args.framework : undefined,
  });
  console.log(result.message);
  if (!result.ok) process.exitCode = 1;
  return result;
}

function cmdCheckOwnership(args) {
  const slug = requiredArg(args, 'module', 'ownership is judged from one module\'s point of view.');
  const baseline = requiredArg(args, 'baseline', 'the manifest lives in the baseline.');
  const manifest = readOwnership(baseline);
  let paths = listArg(args.paths);

  // With no explicit list, judge what has actually changed in the baseline right now — the check a
  // stage runs after editing, when the question is "did I stay in my lane?".
  if (paths.length === 0) {
    const porcelain = execFileSync('git', ['status', '--porcelain', '--', baseline], { encoding: 'utf8' });
    paths = porcelain.split('\n').map((l) => l.slice(3).trim()).filter(Boolean)
      .map((p) => path.relative(path.resolve(baseline), path.resolve(p)).split(path.sep).join('/'))
      .filter((p) => p && !p.startsWith('..'));
  }

  const result = classifyChangeset(manifest, paths, slug);
  console.log(JSON.stringify(result, null, 2));
  if (!result.allowed) {
    console.error(
      `OWNERSHIP VIOLATION: ${result.foreign.length} path(s) belong to another module. ` +
      'Scope the change to this module and its genuinely shared dependencies (pipeline.md §12.9).'
    );
    process.exitCode = 1;
  }
  return result;
}

function main() {
  const [sub, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  switch (sub) {
    case 'copy-in':
      cmdCopyIn(args);
      break;
    case 'plan-merge':
      cmdPlanMerge(args);
      break;
    case 'merge':
      cmdMerge(args);
      break;
    case 'cleanup':
      cmdCleanup(args);
      break;
    case 'resolve-root':
      cmdResolveRoot(args);
      break;
    case 'verify-promotion':
      cmdVerifyPromotion(args);
      break;
    case 'retire-module':
      cmdRetireModule(args);
      break;
    case 'check-retired':
      cmdCheckRetired(args);
      break;
    case 'check-ownership':
      cmdCheckOwnership(args);
      break;
    case 'plan-baseline-update': cmdPlanBaselineUpdate(args); break;
    case 'record-baseline-update': cmdRecordBaselineUpdate(args); break;
    case 'plan-shared-change': cmdPlanSharedChange(args); break;
    case 'approve-shared-change': cmdApproveSharedChange(args); break;
    case 'apply-shared-change': cmdApplySharedChange(args); break;
    case 'shared-changes': cmdSharedChanges(args); break;
    default:
      console.error(
        'Usage: cli.js <copy-in|plan-merge|merge|cleanup|resolve-root|verify-promotion|'
        + 'retire-module|check-retired|check-ownership|plan-baseline-update|record-baseline-update|'
        + 'plan-shared-change|approve-shared-change|apply-shared-change|shared-changes> [options]'
      );
      process.exitCode = 1;
  }
}

if (require.main === module) {
  // No command ends in a raw stack trace (Phase 9.3, F-25): a refusal or an unexpected error is reported
  // as one line with its code, and the exit code says it failed. Nothing is retried or swallowed.
  try {
    main();
  } catch (err) {
    const first = String(err && err.message ? err.message : err).split('\n').filter((l) => l.trim()).slice(0, 3).join(' — ');
    console.error(`${err && err.code && typeof err.code === 'string' ? err.code : 'ERROR'}: ${first}`);
    if (process.env.AGENTIC_DEBUG) console.error(err && err.stack);
    process.exitCode = 1;
  }
}

module.exports = { parseArgs };
