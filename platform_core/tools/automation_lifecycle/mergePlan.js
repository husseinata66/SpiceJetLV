// Workspace Merge Plan — computes what a Workspace Merge would do, per
// workflows_and_pipelines/pipeline/pipeline.md §12. Never mutates anything; mergeApply.js performs
// the writes this plan describes, gated behind an explicit `apply` flag.
//
// The classification below is a standard three-way merge (base/theirs/ours), not a naive two-way
// diff — see pipeline.md §12 Step 3 for why: once a *different* run has already merged into this
// same baseline since this run's Step-1 snapshot was taken, a plain "working copy vs. baseline now"
// diff cannot tell "the other run added this, we never saw it" apart from "we deleted this," and
// would silently delete the other run's already-merged work. Recording the baseline's content at
// snapshot time ("base") resolves that ambiguity.

const fs = require('fs');
const path = require('path');
const { hashContent, walkFiles } = require('./hashUtils');
const {
  getPathScopedRef, isPathClean, isIgnored, showFileAtRef, listFilesAtRef, discoverRepo, relInRepo,
} = require('./gitUtils');

/**
 * Builds a `relPath -> sha256` map for every non-ignored file under `dirAbsPath`, plus the list of
 * ignored paths found along the way (build output, IDE folders, report archives — real, confirmed
 * examples: tests_SHAFT ships its own nested .gitignore excluding target/, allure-results/,
 * execution-summary/, generatedReport*.zip). Ignored files are never part of the merge diff; they
 * are reported separately ("discardedIgnored") so their removal at Cleanup is a visible, accounted-
 * for decision rather than a silent side effect of a directory delete.
 * @param {object} repo GitRepo; when unavailable nothing is classified ignored.
 * @param {string} dirAbsPath
 * @param {{fs?: object, execFileSync: Function}} deps
 * @returns {{tracked: Map<string,string>, ignored: string[]}}
 */
function buildDiskSnapshot(repo, dirAbsPath, deps) {
  const fsImpl = deps.fs || require('fs');
  const tracked = new Map();
  const ignored = [];
  for (const absFile of walkFiles(dirAbsPath, { fs: fsImpl })) {
    const relFile = path.relative(dirAbsPath, absFile).split(path.sep).join('/');
    if (isIgnored(repo, absFile, deps)) {
      ignored.push(relFile);
      continue;
    }
    tracked.set(relFile, hashContent(fsImpl.readFileSync(absFile)));
  }
  return { tracked, ignored };
}

/**
 * Reconstructs the `relPath -> sha256` map for `absDirPath` as it existed at `ref` — only ever
 * needed on the conflict path (baseline has moved since this run's snapshot), since that's the
 * only time the current working tree no longer reflects the state a diff needs to compare against.
 * @param {object} repo GitRepo; when unavailable the map comes back empty.
 * @param {string} ref
 * @param {string} absDirPath
 * @param {{execFileSync: Function}} deps
 * @returns {Map<string,string>}
 */
function buildGitSnapshot(repo, ref, absDirPath, deps) {
  const map = new Map();
  if (!repo || !repo.available) return map;
  // Historical content is addressed by repository-relative path, so resolve once here and let
  // showFileAtRef take the already-relative form for each entry.
  const relDir = relInRepo(repo, absDirPath);
  for (const relFile of listFilesAtRef(repo, ref, absDirPath, deps)) {
    const content = showFileAtRef(repo, ref, `${relDir}/${relFile}`, deps);
    if (content !== null) map.set(relFile, hashContent(content));
  }
  return map;
}

/**
 * Pure three-way classification. `base`/`theirs`/`ours` are `relPath -> sha256` Maps:
 *   base   = baseline content at this run's Step-1 snapshot (or == theirs, if no prior baseline
 *            existed, or the baseline hasn't moved since the snapshot was taken)
 *   theirs = baseline content now (may have moved if another run merged in the meantime)
 *   ours   = this run's working copy content now
 *
 * Mirrors the standard base/theirs/ours merge rules used by every real merge tool — see
 * pipeline.md §12 Step 3 for the worked-through rationale behind each branch below.
 *
 * @param {{base: Map<string,string>, theirs: Map<string,string>, ours: Map<string,string>}} trees
 * @returns {{added: string[], modified: string[], deleted: string[], conflicts: string[]}}
 */
function classifyChanges({ base, theirs, ours }) {
  const added = [];
  const modified = [];
  const deleted = [];
  const conflicts = [];

  const allPaths = new Set([...theirs.keys(), ...ours.keys()]);

  for (const p of allPaths) {
    const inBase = base.has(p);
    const inTheirs = theirs.has(p);
    const inOurs = ours.has(p);
    const baseHash = base.get(p);
    const theirsHash = theirs.get(p);
    const oursHash = ours.get(p);

    if (inTheirs && inOurs) {
      if (theirsHash === oursHash) continue; // unchanged, nothing to do
      if (!inBase) { conflicts.push(p); continue; } // both independently introduced this path, differently
      if (baseHash === theirsHash) { modified.push(p); continue; } // only we changed it
      if (baseHash === oursHash) continue; // only the other run changed it — already reflected in baseline, leave alone
      conflicts.push(p); // both changed it, differently
      continue;
    }

    if (inTheirs && !inOurs) {
      if (!inBase) continue; // the other run added this after our snapshot; unrelated to us
      if (baseHash === theirsHash) { deleted.push(p); continue; } // unchanged since base, and we don't have it -> we deleted it
      conflicts.push(p); // the other run modified it AND we don't have it at all -> ambiguous, ask a human
      continue;
    }

    if (!inTheirs && inOurs) {
      if (!inBase) { added.push(p); continue; } // brand new file we introduced
      if (baseHash === oursHash) continue; // we never touched it; the other run deleted it -> respect that deletion
      conflicts.push(p); // we changed it AND the other run deleted it
    }
  }

  return { added, modified, deleted, conflicts };
}

/**
 * Reclassifies exact-content-match Added/Deleted pairs as Renamed. This is intentionally an exact
 * hash match only (not git's fuzzy similarity-index rename detection) — a renamed-and-modified
 * file will show up as one Delete + one Add rather than a Rename. That's a stated, acceptable
 * limitation (pipeline.md §12 Step 3), not a data-loss risk: the content is still fully accounted
 * for, just under a less precise label.
 * @param {{added: string[], deleted: string[]}} changes
 * @param {{theirs: Map<string,string>, ours: Map<string,string>}} trees
 * @returns {{added: string[], deleted: string[], renamed: {from: string, to: string}[]}}
 */
function detectRenames({ added, deleted }, { theirs, ours }) {
  const renamed = [];
  const remainingAdded = [...added];
  const remainingDeleted = [];

  for (const delPath of deleted) {
    const delHash = theirs.get(delPath);
    const matchIdx = remainingAdded.findIndex((addPath) => ours.get(addPath) === delHash);
    if (matchIdx >= 0) {
      renamed.push({ from: delPath, to: remainingAdded[matchIdx] });
      remainingAdded.splice(matchIdx, 1);
    } else {
      remainingDeleted.push(delPath);
    }
  }

  return { added: remainingAdded, deleted: remainingDeleted, renamed };
}

/** The exact wording reproduced in the Merge Summary and automation_promotion.md (pipeline.md §12.4). */
const NO_GIT_WARNING =
  'Baseline is not under git control — three-way conflict detection is unavailable; concurrent-run ' +
  'conflicts cannot be detected. (pipeline.md §12.4)';

/**
 * Full merge plan for one (baseline, working copy) pair. Read-only — computes and returns the
 * plan; mergeApply.js performs the writes.
 *
 * @param {string} baselineAbsPath
 * @param {string} workingCopyAbsPath
 * @param {{baselineRef: string|null, gitAvailable?: boolean, repoRoot?: string|null}|null} snapshot
 *   from baselineCopy.js's Step-1 snapshot, or null if none was ever recorded (treated the same as
 *   "baseline unchanged" — see baselineMoved)
 * @param {{fs?: object, execFileSync: Function, repo?: object, gitMode?: string,
 *          dataRoot?: string}} deps
 *   `repo` is the GitRepo governing the baseline; omitted, it is discovered from the baseline path.
 * @returns {object} the Merge Plan — see pipeline.md §12 Step 3 for field meanings
 */
class MergeTopologyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MergeTopologyError';
    this.code = 'MERGE_TOPOLOGY';
  }
}

/**
 * Topology (Phase 9.3, F-25): the working copy is read through the baseline's repository (ignore rules, tracked
 * state), so it must live inside that repository's work tree — outside it, git can only fail half-way through.
 * The CLI calls this with the REAL repository before planning; throws MergeTopologyError unless both paths
 * exist and sit inside `repo.root`.
 */
function assertSameWorkTree(repo, baselineAbsPath, workingCopyAbsPath) {
  const real = (p, what) => {
    try { return fs.realpathSync.native(path.resolve(p)); } catch {
      throw new MergeTopologyError(`The ${what} ${p} does not exist — nothing to merge. Nothing was read or written.`);
    }
  };
  const norm = (p) => (process.platform === 'win32' ? p.toLowerCase() : p);
  const root = norm(real(repo.root, 'baseline repository root'));
  const within = (p) => { const r = path.relative(root, norm(p)); return r === '' || (!r.startsWith('..') && !path.isAbsolute(r)); };
  const base = real(baselineAbsPath, 'baseline');
  const wc = real(workingCopyAbsPath, 'module package');
  if (!within(base)) throw new MergeTopologyError(`The baseline ${baselineAbsPath} is not inside its repository work tree ${repo.root}. Nothing was read or written.`);
  if (!within(wc)) {
    throw new MergeTopologyError(
      `The module package ${workingCopyAbsPath} is outside the baseline's repository (${repo.root}). A Workspace ` +
      'Merge reads the package through that repository (ignore rules, tracked state), so both must be in the same ' +
      'work tree — the module working copy under platform_core_data/modules/<module>/automation and the baseline under ' +
      'automation_baseline/ (pipeline.md §12). Nothing was read or written.'
    );
  }
}

function computeMergePlan(baselineAbsPath, workingCopyAbsPath, snapshot, deps) {
  const repo = deps.repo || discoverRepo(baselineAbsPath, deps);
  const warnings = [];
  const conflicts = [];
  let degradedMode = null;

  if (!repo.available) {
    degradedMode = 'no-git';
    warnings.push(NO_GIT_WARNING, repo.reason);
  }

  // Git protected this baseline when the run started but does not now — the snapshot's refs cannot
  // be verified, so a merge would silently lose whichever side it guessed wrong about. Hard block.
  if (snapshot && snapshot.gitAvailable === true && !repo.available) {
    conflicts.push('git-protection-lost');
    warnings.push(
      'This run\'s snapshot was taken with git available, but git is unavailable now — the baseline ' +
        'refs recorded at Step 1 cannot be verified. Refusing to guess; restore git access (or ' +
        're-run Working Copy Creation) before merging. (pipeline.md §12.4)',
    );
  }

  // A different repository than the one the snapshot was taken against: the baseline was moved
  // between repositories mid-run, so its recorded ref belongs to a history this repo does not have.
  if (snapshot && snapshot.repoRoot && repo.root && snapshot.repoRoot !== repo.root) {
    conflicts.push('repo-identity-changed');
    warnings.push(
      `The baseline's repository changed mid-run: the snapshot recorded ${snapshot.repoRoot}, but ` +
        `${repo.root} governs it now. Its recorded ref belongs to a different history.`,
    );
  }

  const dirty = isPathClean(repo, baselineAbsPath, deps) ? [] : ['baseline has uncommitted changes'];

  const currentRef = getPathScopedRef(repo, baselineAbsPath, deps);
  const snapshotRef = snapshot ? snapshot.baselineRef : null;
  const baselineMoved = Boolean(snapshotRef) && currentRef !== snapshotRef;

  const { tracked: theirs, ignored: theirsIgnored } = buildDiskSnapshot(repo, baselineAbsPath, deps);
  const { tracked: ours, ignored: oursIgnored } = buildDiskSnapshot(repo, workingCopyAbsPath, deps);

  const base = baselineMoved && snapshotRef
    ? buildGitSnapshot(repo, snapshotRef, baselineAbsPath, deps)
    : theirs; // unchanged (or first-ever promotion): base == theirs is the correct degenerate case

  const classified = classifyChanges({ base, theirs, ours });
  const { added, deleted, renamed } = detectRenames(classified, { theirs, ours });

  return {
    // Reported relative to the repository when there is one, else absolute — either way it names the
    // baseline unambiguously in the Merge Summary.
    baselinePath: repo.available
      ? relInRepo(repo, baselineAbsPath)
      : path.resolve(baselineAbsPath).split(path.sep).join('/'),
    baselineAbsPath: path.resolve(baselineAbsPath).split(path.sep).join('/'),
    repo: { root: repo.root, mode: repo.mode, available: repo.available, reason: repo.reason },
    degradedMode,
    warnings,
    currentRef,
    snapshotRef,
    baselineMoved,
    dirty,
    added,
    modified: classified.modified,
    deleted,
    renamed,
    conflicts: conflicts.concat(classified.conflicts),
    discardedIgnored: oursIgnored,
    baselineIgnored: theirsIgnored,
  };
}

module.exports = {
  MergeTopologyError,
  assertSameWorkTree,
  buildDiskSnapshot,
  buildGitSnapshot,
  classifyChanges,
  detectRenames,
  computeMergePlan,
  NO_GIT_WARNING,
};
