// Workspace Merge — Step 3 of the Automation Asset Lifecycle (pipeline.md §12). Writes the plan
// computed by mergePlan.js into the Workspace Automation Baseline. Dry-run by default, exactly
// like platform_core/tools/run_manager/migrate.js's own --apply gating: the plan is always
// computed and returned; only `apply: true` performs any real filesystem/git mutation.

const fs = require('fs');
const path = require('path');
const {
  gitAdd, gitRm, gitMv, gitCommit, discoverRepo, assertSameRepo,
} = require('./gitUtils');

const LOCK_FILENAME = '.automation_lifecycle.lock';

/**
 * Atomically acquires a merge lock for `baselineAbsPath` — `{flag:'wx'}` fails if the file already
 * exists, which is what makes this safe against two merges racing on the same baseline (pipeline.md
 * §12 Step 3.3). No new dependency needed: this is a standard Node idiom for an exclusive-create lock.
 * @param {string} baselineAbsPath
 * @param {{fs?: object, now: Date}} deps
 * @returns {string} the lock file path (pass to releaseLock when done)
 */
function acquireLock(baselineAbsPath, deps) {
  const fsImpl = deps.fs || fs;
  const lockPath = path.join(baselineAbsPath, LOCK_FILENAME);
  try {
    // The baseline directory may not exist yet — a brand-new package's first-ever merge is
    // exactly this case (there is nothing to lock a race against yet, but the lock file still
    // needs somewhere to live).
    fsImpl.mkdirSync(baselineAbsPath, { recursive: true });
    fsImpl.writeFileSync(lockPath, `${deps.now.toISOString()}\n`, { flag: 'wx' });
  } catch (err) {
    if (err.code === 'EEXIST') {
      throw new Error(`Workspace Merge is locked: another merge is already in progress at ${lockPath}`);
    }
    throw err;
  }
  return lockPath;
}

/**
 * @param {string} lockPath
 * @param {{fs?: object}} [deps]
 */
function releaseLock(lockPath, { fs: fsImpl = fs } = {}) {
  if (fsImpl.existsSync(lockPath)) fsImpl.rmSync(lockPath);
}

/**
 * The commit message records **where the content came from** and **which run approved it**
 * (pipeline.md §12.4 step 4).
 *
 * Since 2026-07-29 the source is a module automation project, so `module` is included when known:
 * with several modules assembling into one baseline, "from run-007" alone no longer identifies which
 * module's suite a commit carries. The module segment is OMITTED rather than filled with a
 * placeholder when absent — a commit message claiming a module it does not know is worse than one
 * that simply does not mention it.
 *
 * @param {string} project
 * @param {string} packageName
 * @param {string} runFolder
 * @param {{added: string[], modified: string[], deleted: string[], renamed: object[]}} plan
 * @param {string} [module] - the source module's slug
 * @returns {string}
 */
function buildCommitMessage(project, packageName, runFolder, plan, module, approval) {
  // The message REPORTS the Module Manager's recorded approval (Phase 9.1, F-04); it is never itself proof
  // of one. Without a recorded approver it claims none.
  const approvedBy = approval && approval.approvedBy;
  const source = module
    ? `module ${module}${approvedBy ? `, Automation Approval by ${approvedBy}${approval.approvedAt ? ` at ${approval.approvedAt}` : ''}` : ''}, run ${runFolder}`
    : `${runFolder}`;
  return `Automation Merge: ${project}/${packageName} from ${source} `
    + `(+${plan.added.length}/~${plan.modified.length}/-${plan.deleted.length}/`
    + `→${plan.renamed.length})`;
}

/**
 * Applies (or, by default, only describes) the merge plan computed by mergePlan.js's
 * computeMergePlan(). Must never be called with unresolved conflicts still in `plan.conflicts` —
 * conflicts have to be resolved (or explicitly excluded from the plan) by the caller first, per
 * pipeline.md §12 Step 3's "never blindly overwrite" rule; this function refuses to proceed
 * otherwise rather than silently dropping or force-applying a conflicting file.
 *
 * Three write paths, decided by what git can actually guarantee:
 *   normal          files copied, staged, and committed
 *   no-git          files copied, nothing staged (`degradedMode: 'no-git'`) — reported, not implied
 *   stage-nothing   files copied, nothing staged, because the repository is read-only to us or
 *                   `git.commitBaseline` is false — the human commits
 *
 * @param {string} baselineAbsPath
 * @param {string} workingCopyAbsPath
 * @param {object} plan - from computeMergePlan()
 * @param {{project: string, packageName: string, runFolder: string, module?: string}} identity
 *   `module` is the source module's slug (pipeline.md §12.1); optional for pre-migration callers.
 * @param {{fs?: object, execFileSync: Function, now: Date, apply?: boolean, repo?: object,
 *          gitMode?: string, dataRoot?: string, commitBaseline?: boolean}} deps
 * @returns {{applied: boolean, committed: boolean, commitMessage: string,
 *   degradedMode: string|null, reason: string|null, touchedPaths: string[]}}
 */
function applyMerge(baselineAbsPath, workingCopyAbsPath, plan, identity, deps) {
  const fsImpl = deps.fs || fs;
  const apply = Boolean(deps.apply);
  const commitMessage = buildCommitMessage(
    identity.project, identity.packageName, identity.runFolder, plan, identity.module, identity.approval,
  );
  const degradedMode = plan.degradedMode || null;

  if (!apply) {
    return {
      applied: false, committed: false, commitMessage, degradedMode, reason: null, touchedPaths: [],
    };
  }

  // Without git there is no uncommitted-change concept, so isPathClean() reported vacuous
  // cleanliness and this check would be meaningless rather than protective. The plan already
  // carries the warning that says so.
  if (degradedMode !== 'no-git' && plan.dirty.length > 0) {
    throw new Error('Refusing to merge: baseline has uncommitted changes (pipeline.md §12 Step 3.1)');
  }
  if (plan.conflicts.length > 0) {
    throw new Error(`Refusing to merge: ${plan.conflicts.length} unresolved conflict(s) — resolve them first`);
  }

  const repo = deps.repo || (degradedMode === 'no-git' ? null : discoverRepo(baselineAbsPath, deps));

  // The boundary check, before anything is written: the baseline and every path we are about to
  // stage must live in the repository we hold. A Target Project path here raises RepoBoundaryError.
  const stageInGit = Boolean(repo && repo.available && repo.writable) && degradedMode !== 'no-git';
  if (stageInGit) assertSameRepo(repo, [baselineAbsPath]);

  const commitAllowed = stageInGit && deps.commitBaseline !== false;
  const reason = commitAllowed
    ? null
    : degradedMode === 'no-git' || !repo || !repo.available
      ? 'files written to the baseline but not committed — no git repository governs it'
      : 'files written to the baseline but not committed — commit them yourself, or the next run\'s '
        + 'dirty-baseline pre-check will block';

  const lockPath = acquireLock(baselineAbsPath, deps);
  const touchedPaths = [];

  try {
    for (const rel of plan.added.concat(plan.modified)) {
      const destAbs = path.join(baselineAbsPath, rel);
      fsImpl.mkdirSync(path.dirname(destAbs), { recursive: true });
      fsImpl.copyFileSync(path.join(workingCopyAbsPath, rel), destAbs);
      if (stageInGit) gitAdd(repo, destAbs, deps);
      touchedPaths.push(destAbs);
    }
    for (const rel of plan.deleted) {
      const destAbs = path.join(baselineAbsPath, rel);
      // `git rm` removes the working-tree file too; without git we unlink it ourselves so the
      // filesystem result is identical either way.
      if (stageInGit) {
        gitRm(repo, destAbs, deps);
      } else if (fsImpl.existsSync(destAbs)) {
        fsImpl.rmSync(destAbs);
      }
      touchedPaths.push(destAbs);
    }
    for (const { from, to } of plan.renamed) {
      const fromAbs = path.join(baselineAbsPath, from);
      const toAbs = path.join(baselineAbsPath, to);
      // git mv only relocates the tracked entry; detectRenames only ever matches on an exact
      // content hash, so the destination's content already equals the working copy's file —
      // nothing further to copy.
      if (stageInGit) {
        gitMv(repo, fromAbs, toAbs, deps);
      } else if (fsImpl.existsSync(fromAbs)) {
        fsImpl.mkdirSync(path.dirname(toAbs), { recursive: true });
        fsImpl.renameSync(fromAbs, toAbs);
      }
      touchedPaths.push(fromAbs, toAbs);
    }
    // Scoped to touchedPaths only — never a bare `git commit` — so unrelated changes already
    // staged/unstaged elsewhere in this repository are never swept into an automation-merge commit.
    if (commitAllowed && touchedPaths.length > 0) {
      gitCommit(repo, commitMessage, touchedPaths, deps);
    }
  } finally {
    releaseLock(lockPath, deps);
  }

  return {
    applied: true,
    committed: commitAllowed && touchedPaths.length > 0,
    commitMessage,
    degradedMode,
    reason,
    touchedPaths: touchedPaths.map((p) => p.split(path.sep).join('/')),
  };
}

module.exports = {
  LOCK_FILENAME, acquireLock, releaseLock, buildCommitMessage, applyMerge,
};
