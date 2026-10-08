// Run Lineage — refining an earlier run without mutating it.
//
// THE PROBLEM
// A user builds their automation project across many runs. Months later they want to enhance
// something a previous run delivered. They need that run's context as the starting point — but the
// result must apply to the project's CURRENT state, not the state when that run executed.
//
// Editing the old run in place would be wrong twice over: it breaks the documented
// "runs/ — per-run, immutable once written" contract (platform_core_data/README.md), and it destroys
// the record of what that run actually concluded at the time, which is the only evidence its Final QA
// Report was ever true.
//
// THE MODEL — inherit + supersede (spec-kit calls this "flow-forward")
// Refining run-002 creates a NEW run that:
//   - records `inheritsFrom: run-002` and `supersedes: run-002` in its own metadata,
//   - references run-002's approved artifacts by path rather than copying them wholesale
//     (pipeline.md §7 "Cross-run reuse"),
//   - anchors itself to the target's CURRENT code state (targetRef, see targetRef.js), so its scope
//     is today's project,
//   - carries the drift report for run-002 -> now, so stages know which inherited findings are
//     suspect rather than assuming all of them still hold.
// run-002 is never written to.
//
// This also gives `{{PRIOR_RUN_FOLDER}}` its first actual resolver: it appears 4 times across the
// specs (pipeline.md §7, user_story_run.md, README) and until now nothing resolved it.
//
// See workflows_and_pipelines/pipeline/run_manager.md §5.9.

const fs = require('fs');
const path = require('path');

const { resolveRunFolder } = require('./runFolderIndex');
const { generateRunFolderName, parseRunFolderName, deriveRunOwner } = require('./runFolderName');
const { computeDrift } = require('./targetRef');

const LINEAGE_FILENAME = 'lineage.json';

class LineageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LineageError';
  }
}

/** Stage folders whose artifacts can be inherited, in pipeline order. */
const INHERITABLE_STAGES = ['context', 'discovery', 'test_design', 'manual_execution', 'automation'];

function readJsonOr(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

/**
 * Which stage artifacts a prior run actually has to offer, and whether each was approved.
 *
 * "Approved" is read from the artifact's own `status:` field, which is where approval lives since
 * `.vN` suffixes were retired (pipeline.md §7). An unapproved artifact is still listed — inheriting a
 * Pending Review artifact is a legitimate, declared choice; silently omitting it would hide the
 * option.
 *
 * @param {string} runsDir
 * @param {string} priorFolder
 * @returns {Array<{stage: string, files: string[], approved: boolean|null}>}
 */
function inspectInheritable(runsDir, priorFolder) {
  const out = [];
  for (const stage of INHERITABLE_STAGES) {
    const dir = path.join(runsDir, priorFolder, stage);
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name);
    } catch {
      continue; // stage never reached — not an error
    }
    if (!entries.length) continue;

    let approved = null;
    for (const name of entries.filter((n) => n.endsWith('.md'))) {
      let head;
      try {
        head = fs.readFileSync(path.join(dir, name), 'utf8').slice(0, 4000);
      } catch {
        continue;
      }
      const m = head.match(/^\|?\s*(?:\*\*)?[Ss]tatus(?:\*\*)?\s*\|?\s*(?:\|)?\s*([A-Za-z ]+?)\s*(?:\||$)/m);
      if (m) {
        const val = m[1].trim().toLowerCase();
        if (val.startsWith('approved')) approved = true;
        else if (approved === null) approved = false;
      }
    }
    out.push({ stage, files: entries, approved });
  }
  return out;
}

/**
 * Plans a refinement run derived from `priorIdentifier`. Pure: computes and returns, writes nothing.
 * Callers inspect the plan (and its drift report) before committing to it — the same
 * plan-then-apply split the automation lifecycle uses for merges.
 *
 * @param {string} runsDir
 * @param {string} priorIdentifier - prior run folder name / legacy Run ID
 * @param {{scope?: string, target?: string, now: Date, targetRoot?: string, scopePaths?: string[], execFileSync?: Function}} opts
 * @returns {object} the refinement plan
 */
function planRefinement(runsDir, priorIdentifier, opts = {}) {
  const { scope, target, now, targetRoot, scopePaths = [], execFileSync } = opts;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new LineageError('planRefinement requires an explicit valid `now` Date.');
  }

  const priorFolder = resolveRunFolder(runsDir, priorIdentifier);
  if (!priorFolder) {
    throw new LineageError(
      `No run folder matches "${priorIdentifier}" under ${runsDir}. ` +
      'Run `cli.js list` to see available runs.'
    );
  }

  const priorMeta = readJsonOr(path.join(runsDir, priorFolder, 'metadata', 'run.json'), {});
  const priorParsed = parseRunFolderName(priorFolder);

  // Default the new run's identity to the prior run's, so a refinement stays recognizably about the
  // same thing unless the caller deliberately re-scopes it.
  const newScope = scope || priorParsed.scope || priorMeta.scope || 'Targeted';
  const newTarget = target || priorParsed.target || priorMeta.target || 'Refinement';

  let existingNames = [];
  try {
    existingNames = fs.readdirSync(runsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory()).map((e) => e.name);
  } catch { /* fresh runs dir */ }

  // A refinement belongs to the same Feature/module as the run it refines, so it joins that owner's
  // sequence (run_manager.md §5.1.1). Older runs that predate owners stay unowned.
  let owner = priorMeta.runOwner ?? priorParsed.owner ?? null;
  if (!owner) {
    try {
      owner = deriveRunOwner(priorMeta);
    } catch (err) {
      throw new LineageError(`Cannot tell which Feature/module "${priorFolder}" belongs to: ${err.message}`);
    }
  }
  const newFolder = generateRunFolderName(
    { scope: newScope, target: newTarget, owner },
    { existingNames, now }
  );

  // Drift is the whole point: it tells the new run which inherited conclusions are suspect.
  let drift = null;
  if (targetRoot && execFileSync) {
    drift = computeDrift(
      targetRoot,
      {
        targetRef: priorMeta.targetRef ?? null,
        targetRefScope: priorMeta.targetRefScope ?? scopePaths,
        targetRefCapturedAt: priorMeta.targetRefCapturedAt ?? null,
      },
      { execFileSync }
    );
  }

  return {
    priorRunFolder: priorFolder,
    newRunFolder: newFolder,
    scope: newScope,
    target: newTarget,
    owner: owner ?? null,
    plannedAt: now.toISOString(),
    inheritable: inspectInheritable(runsDir, priorFolder),
    drift,
    priorTargetRef: priorMeta.targetRef ?? null,
    priorStartedTime: priorMeta.startedTime ?? null,
  };
}

/**
 * Writes the lineage record into an already-created refinement run folder.
 *
 * Separate from planRefinement so the run folder's creation stays the Run Manager's job
 * (run_manager.md §4) — this records the relationship, it does not create runs.
 *
 * @param {string} runsDir
 * @param {object} plan - from planRefinement
 * @param {{reason?: string, setBy?: string}} opts
 * @returns {object} the lineage record written
 */
function writeLineage(runsDir, plan, opts = {}) {
  const newDir = path.join(runsDir, plan.newRunFolder);
  if (!fs.existsSync(newDir)) {
    throw new LineageError(
      `Refinement run folder ${plan.newRunFolder} does not exist yet. ` +
      'Create the run folder first (Run Manager §6), then record its lineage.'
    );
  }

  const record = {
    schemaVersion: 1,
    runFolder: plan.newRunFolder,
    // The resolver {{PRIOR_RUN_FOLDER}} never had.
    inheritsFrom: plan.priorRunFolder,
    // `supersedes` is the reader-facing claim: this run's conclusions replace the prior run's for the
    // scope they share. The prior run is NOT modified — it stays valid as of its own targetRef.
    supersedes: plan.priorRunFolder,
    priorRunPath: `platform_core_data/runs/${plan.priorRunFolder}`,
    inheritedArtifacts: plan.inheritable.map((i) => ({
      stage: i.stage,
      approved: i.approved,
      // Referenced by path, never copied (pipeline.md §7 Cross-run reuse). A stage that needs to
      // evolve one copies it into this run once, at that point.
      path: `platform_core_data/runs/${plan.priorRunFolder}/${i.stage}`,
      files: i.files,
    })),
    drift: plan.drift,
    recordedAt: plan.plannedAt,
    setBy: opts.setBy || 'Run Manager',
    ...(opts.reason ? { reason: opts.reason } : {}),
  };

  fs.mkdirSync(path.join(newDir, 'metadata'), { recursive: true });
  fs.writeFileSync(
    path.join(newDir, 'metadata', LINEAGE_FILENAME),
    `${JSON.stringify(record, null, 2)}\n`,
    'utf8'
  );
  return record;
}

/**
 * Reads a run's lineage record, or null when the run is not a refinement.
 * @param {string} runsDir
 * @param {string} folderName
 * @returns {object|null}
 */
function readLineage(runsDir, folderName) {
  return readJsonOr(path.join(runsDir, folderName, 'metadata', LINEAGE_FILENAME), null);
}

/**
 * Resolves {{PRIOR_RUN_FOLDER}} for a run — the folder its inherited artifacts live in.
 * Returns null for a run with no lineage (the common case: a run that inherits nothing).
 * @param {string} runsDir
 * @param {string} folderName
 * @returns {string|null}
 */
function resolvePriorRunFolder(runsDir, folderName) {
  const lineage = readLineage(runsDir, folderName);
  if (!lineage?.inheritsFrom) return null;
  return resolveRunFolder(runsDir, lineage.inheritsFrom);
}

/**
 * The full inheritance chain, newest-first: [thisRun, itsParent, itsGrandparent, ...].
 * Cycle-guarded — a hand-edited lineage.json could otherwise loop forever.
 * @param {string} runsDir
 * @param {string} folderName
 * @returns {string[]}
 */
function lineageChain(runsDir, folderName) {
  const chain = [];
  const seen = new Set();
  let cursor = resolveRunFolder(runsDir, folderName) || folderName;
  while (cursor && !seen.has(cursor)) {
    chain.push(cursor);
    seen.add(cursor);
    cursor = resolvePriorRunFolder(runsDir, cursor);
  }
  return chain;
}

module.exports = {
  LINEAGE_FILENAME,
  LineageError,
  INHERITABLE_STAGES,
  inspectInheritable,
  planRefinement,
  writeLineage,
  readLineage,
  resolvePriorRunFolder,
  lineageChain,
};
