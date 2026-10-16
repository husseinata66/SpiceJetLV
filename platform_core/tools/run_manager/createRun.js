// Run creation — the one code path that brings a run into existence.
//
// WHY THIS EXISTS
// Run creation used to be a prose checklist in each workflow's Step 1 ("allocate a name, prepare the
// workspace, write run.json, create the Run Manifest, activate"). Prose can be skipped: the code-state
// anchor (`targetRef`, run_manager.md §5.8) was written only because a spec line said to, so a run
// created any other way silently lost the ability to answer "has the app moved since?". `cli.js refine`
// was the only path that actually wrote it, and it did so with inline logic nothing else could reuse.
//
// This module makes the invariants STRUCTURAL rather than remembered:
//   - `targetRef` is captured here, always. A run cannot be created without an anchor attempt, and a
//     null anchor carries its reason (`targetRefReason`) instead of being silently absent.
//   - `metadata/` and `RunManifest.md` are created here, always — §6 says metadata/ is the one folder
//     every run has, and the Manifest is the orchestrator's own source of truth.
//   - Activation is a separate, explicit step (`activate: true`), because run_manager.md §5.7 Rule 3
//     makes the pointer the Run Manager's to write and §5.9 keeps creation and switching distinct.
//
// It does NOT create stage folders. A run only ever has folders for stages it actually reached
// (run_manager.md §6) — pre-creating them was the 2026-07-17 behaviour that revision removed.
//
// See workflows_and_pipelines/pipeline/run_manager.md §5.10.

const fs = require('fs');
const path = require('path');
const { assertApproverName } = require('../run_manager/approverIdentity');

const { generateRunFolderName, parseRunFolderName, deriveRunOwner } = require('./runFolderName');
const { captureTargetRef } = require('./targetRef');
const { setActiveRun } = require('./activeRun');
const { renderRunManifest } = require('./runManifest');
const { writeJsonAtomic } = require('./atomicFile');
const { initialRunState, withRunLock } = require('./runState');

class CreateRunError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CreateRunError';
  }
}

/** run.json fields whose value is a platform spec version we record rather than invent (§7). */
const UNVERSIONED = 'unversioned';

/** The one non-null `scopeFamily` this platform understands today (run_manager.md §7). */
const SUPPLIER_FEATURE_SCOPE = 'supplier-feature';

/**
 * Validates a run's scope-family ownership fields on a run.json object.
 *
 * See module_architecture.md, Supplier Features section, "run ownership scope exclusivity". A run may
 * carry four OPTIONAL fields — `scopeFamily`, `feature`, `supplier`, `sharedScope` — all defaulting
 * to `null`, exactly like `modules[]` is already an optional key elsewhere in this platform.
 *
 * `scopeFamily` is the DISCRIMINATOR, and it is deliberately a named family rather than an entity
 * identifier: `feature` already holds a Feature slug, so a boolean-ish `supplierFeature` field
 * sitting beside it would read as "which Supplier Feature" and invite exactly the wrong inference.
 * It follows the `moduleScope` convention already in run_manager.md §7 — a short string saying what
 * the scope IS, not which entity it names. It also leaves room for a future `scopeFamily: "module"`
 * without inventing a second discriminator.
 *
 * A `scopeFamily` of null means the classic module/Feature addressing system, which is what EVERY
 * run written before these fields existed means — so the function returns immediately, with no field
 * checked, and those runs stay entirely unaffected.
 *
 * Once a run IS Supplier-Feature-scoped, exactly two shapes are legal:
 *   - a Supplier run:      `supplier` set,   `sharedScope` null
 *   - a shared-scope run:  `supplier` null,  `sharedScope` set
 * A run naming BOTH or NEITHER is a contradiction — a run cannot be simultaneously supplier-specific
 * and cross-supplier, and one that names neither has not actually picked a scope. Both are rejected
 * here, mechanically, rather than left to a convention nothing enforces.
 *
 * @param {{scopeFamily?: string|null, feature?: string|null, supplier?: string|null,
 *          sharedScope?: string|null}} runJson
 * @throws {CreateRunError} when the run is Supplier-Feature-scoped and its fields are contradictory
 */
function validateRunScopeFamily(runJson = {}) {
  const scopeFamily = runJson.scopeFamily ?? null;
  const feature = runJson.feature ?? null;
  const supplier = runJson.supplier ?? null;
  const sharedScope = runJson.sharedScope ?? null;

  // Not a Supplier-Feature-scoped run — untouched, exactly as every run written before these fields
  // existed. A bare `feature` with no scopeFamily is caught below, not silently accepted.
  if (scopeFamily === null) {
    if (feature !== null || supplier !== null || sharedScope !== null) {
      throw new CreateRunError(
        'A run that sets `feature`, `supplier`, or `sharedScope` must declare its ' +
        `\`scopeFamily\` (expected "${SUPPLIER_FEATURE_SCOPE}"). Got scopeFamily=null with ` +
        `feature=${JSON.stringify(feature)}, supplier=${JSON.stringify(supplier)}, ` +
        `sharedScope=${JSON.stringify(sharedScope)}.`
      );
    }
    return;
  }

  if (scopeFamily !== SUPPLIER_FEATURE_SCOPE) {
    throw new CreateRunError(
      `Unknown \`scopeFamily\` ${JSON.stringify(scopeFamily)}. The only value this platform ` +
      `understands is "${SUPPLIER_FEATURE_SCOPE}" (or null for a classic module-scoped run).`
    );
  }
  if (!feature) {
    throw new CreateRunError(
      `A "${SUPPLIER_FEATURE_SCOPE}" run requires \`feature\` set to the Supplier Feature's slug. ` +
      `Got feature=${JSON.stringify(feature)}.`
    );
  }
  if (supplier !== null && sharedScope !== null) {
    throw new CreateRunError(
      `A "${SUPPLIER_FEATURE_SCOPE}" run must never set both \`supplier\` and \`sharedScope\` — a ` +
      'run is EITHER a Supplier run or a shared-scope run, never both. Got ' +
      `supplier=${JSON.stringify(supplier)}, sharedScope=${JSON.stringify(sharedScope)}.`
    );
  }
  if (supplier === null && sharedScope === null) {
    throw new CreateRunError(
      `A "${SUPPLIER_FEATURE_SCOPE}" run must pick EXACTLY ONE of \`supplier\` or \`sharedScope\` — ` +
      'neither is set.'
    );
  }
}

/**
 * Creates a run folder with its metadata, and optionally makes it the active run.
 *
 * @param {string} runsDir - absolute path to platform_core_data/runs
 * @param {object} opts
 * @param {string} opts.scope - canonical Run Scope (§5.2)
 * @param {string} opts.target - Module/UserStory/Feature this run targets (§5.3)
 * @param {Date} opts.now - explicit; never defaulted internally (matches generateRunFolderName)
 * @param {string} [opts.targetRoot] - Target Project root, for the code-state anchor (§5.8)
 * @param {string[]} [opts.scopePaths] - in-scope paths the anchor is scoped to
 * @param {Function} [opts.execFileSync] - injected for the anchor's git calls
 * @param {string} [opts.folderName] - pre-generated name; otherwise generated here
 * @param {string} [opts.workflow] - first_run / user_story_run / bug_fix_run / 'unversioned'
 * @param {string} [opts.createdBy]
 * @param {object} [opts.extraRunJson] - additional run.json fields (e.g. lineage on a refinement)
 * @param {boolean} [opts.activate=false] - write the Active Run pointer to this run
 * @param {boolean} [opts.manifest=true] - create metadata/RunManifest.md
 * @returns {{folderName: string, runDir: string, runJson: object, anchor: object, activated: boolean, manifestPath: string|null}}
 */
function createRun(runsDir, opts = {}) {
  const {
    scope, target, now, targetRoot, scopePaths = [], execFileSync,
    workflow, createdBy, extraRunJson = {}, activate = false, manifest = true,
  } = opts;

  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new CreateRunError('createRun requires an explicit valid `now` Date.');
  }
  if (!scope && !opts.folderName) {
    throw new CreateRunError('createRun requires a `scope` (or a pre-generated `folderName`).');
  }
  // Validated BEFORE any folder is created — a rejected ownership shape must leave nothing behind,
  // exactly like every other createRun() validation failure.
  validateRunScopeFamily(extraRunJson);
  // Phase 9.2, F-11: the run binds only to registered, eligible (Active) scope. The CLI (`new`) always asks
  // for this; a library caller opts in, so fixtures that model a run without a registry keep working.
  if (opts.requireRegisteredScope) {
    // eslint-disable-next-line global-require
    const problems = require('./scopeRegistration').runScopeProblems(path.dirname(runsDir), extraRunJson);
    if (problems.length) {
      throw new CreateRunError(`Run not created — its scope is not registered and approved: ${problems.join('; ')}. ` +
        'Register and approve it through the Module Manager first (module_manager/cli.js propose/approve, supplier-feature ...).');
    }
  }
  if (extraRunJson.moduleFeature && extraRunJson.scopeFamily) {
    throw new CreateRunError(
      '`moduleFeature` names a classic module Feature and cannot be combined with a ' +
      `\`scopeFamily\` run (got scopeFamily=${JSON.stringify(extraRunJson.scopeFamily)}).`
    );
  }

  // The owner decides which per-Feature/per-module counter the run joins (run_manager.md §5.1.1).
  // It comes from the scope fields run.json records, never from the target text.
  let runOwner;
  try {
    runOwner = deriveRunOwner(extraRunJson);
  } catch (err) {
    throw new CreateRunError(err.message);
  }

  // Naming and claiming the folder happen under one exclusive lock on the runs folder (Phase 9.3, F-26).
  // Without it, two creations in the same second listed the same folders, picked the same next number,
  // and one was refused ("already exists") — or, had both passed the existence check, shared a folder.
  // Serialized, the second creation sees the first one's folder and takes the next number. The claim itself
  // is an atomic, non-recursive mkdir: it fails if the folder exists, lock or no lock.
  fs.mkdirSync(runsDir, { recursive: true });
  const { withFileLock } = require('./atomicFile'); // eslint-disable-line global-require
  const { folderName, runDir } = withFileLock(path.join(runsDir, '.run-create.lock'), () => {
    let existingNames = [];
    try {
      existingNames = fs.readdirSync(runsDir, { withFileTypes: true })
        .filter((e) => e.isDirectory()).map((e) => e.name);
    } catch { /* fresh runs dir */ }
    const name = opts.folderName
      || generateRunFolderName({ scope, target, owner: runOwner }, { existingNames, now });
    const dir = path.join(runsDir, name);
    try {
      fs.mkdirSync(dir);
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      throw new CreateRunError(
        `Run folder ${name} already exists. Run creation never overwrites an existing run — ` +
        'a run folder is immutable once written (run_manager.md §6).'
      );
    }
    return { folderName: name, runDir: dir };
  });

  // metadata/ is the one folder every run has (§6). Stage folders are created by the stages
  // themselves, when they actually write — never pre-created here.
  fs.mkdirSync(path.join(runDir, 'metadata'), { recursive: true });

  // The anchor is captured unconditionally. When there is no target root or no git, the result carries
  // targetRef: null WITH a stated reason — an unversioned target is not an unchanged one (§5.8), and
  // that distinction only survives if the reason is recorded at creation.
  const anchor = (targetRoot && execFileSync)
    ? captureTargetRef(targetRoot, { scopePaths, capturedAt: now, execFileSync })
    : {
      targetRef: null,
      targetRefScope: scopePaths,
      targetRefCapturedAt: now.toISOString(),
      targetRepoRoot: null,
      targetRefReason: targetRoot
        ? 'no execFileSync provided — the code-state anchor could not be captured'
        : 'no Target Project root resolved — the code-state anchor could not be captured',
    };

  const parsed = parseRunFolderName(folderName);
  const runJson = {
    folderName,
    index: parsed.index ?? null,
    runOwner: parsed.owner ?? runOwner ?? null,
    scope: scope ?? parsed.scope ?? null,
    target: target ?? parsed.target ?? null,
    workflow: workflow || UNVERSIONED,
    ...anchor,
    createdBy: createdBy || 'Run Manager',
    startedTime: now.toISOString(),
    // Run state model (runState.js, run_manager.md §8.1): status, statusHistory, stages{}, revision.
    // Every run created from here on is inside the model; runs created before it read as Unknown.
    ...initialRunState({ now, createdBy: createdBy || 'Run Manager' }),
    // Supplier Features run-ownership fields — optional, default null, zero impact on any classic
    // module-scoped run (see validateRunScopeFamily's header). `testingLayerScope` and `scopeHistory`
    // are part of the same optional surface: harmless on every classic run, and the frozen-scope/
    // history model (changeSupplierFeatureRunScope, below) only ever activates once `scopeFamily` is
    // set.
    scopeFamily: null,
    feature: null,
    supplier: null,
    sharedScope: null,
    testingLayerScope: null,
    scopeHistory: [],
    ...extraRunJson,
  };
  validateRunScopeFamily(runJson);
  writeJson(path.join(runDir, 'metadata', 'run.json'), runJson);

  let manifestPath = null;
  if (manifest) {
    manifestPath = path.join(runDir, 'metadata', 'RunManifest.md');
    fs.writeFileSync(manifestPath, renderRunManifest({ runJson, now }), 'utf8');
  }

  let activated = false;
  if (activate) {
    setActiveRun(runsDir, folderName, {
      now,
      setBy: createdBy || 'Run Manager',
      note: workflow ? `created by ${workflow}` : undefined,
    });
    activated = true;
  }

  return { folderName, runDir, runJson, anchor, activated, manifestPath };
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

/**
 * Backfills the code-state anchor onto an existing run that has none.
 *
 * Runs created before §5.8 (or while git was unavailable) carry no `targetRef`, so drift reports
 * `unknown-no-anchor` forever. Backfilling anchors them to *now*, which is honest only if stated:
 * the recorded `targetRefBackfilled` flag and reason say the anchor is the code state at backfill
 * time, NOT at the run's execution — so nobody later mistakes it for evidence the run was verified
 * against that commit.
 *
 * @param {string} runsDir
 * @param {string} folderName
 * @param {{now: Date, targetRoot: string, scopePaths?: string[], execFileSync: Function, force?: boolean}} opts
 * @returns {{updated: boolean, reason: string, anchor: object|null}}
 */
function backfillTargetRef(runsDir, folderName, opts = {}) {
  const { now, targetRoot, scopePaths = [], execFileSync, force = false } = opts;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new CreateRunError('backfillTargetRef requires an explicit valid `now` Date.');
  }

  const file = path.join(runsDir, folderName, 'metadata', 'run.json');
  if (!fs.existsSync(file)) {
    return { updated: false, reason: `${folderName} has no readable metadata/run.json`, anchor: null };
  }
  // Same lock as the run state model, so a backfill never overwrites a concurrent state change.
  return withRunLock(runsDir, folderName, () => {
    let meta;
    try {
      meta = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return { updated: false, reason: `${folderName} has no readable metadata/run.json`, anchor: null };
    }

    if (meta.targetRef && !force) {
      return {
        updated: false,
        anchor: null,
        reason: `${folderName} already has targetRef ${String(meta.targetRef).slice(0, 7)} — ` +
          'refusing to overwrite a real anchor (pass force to replace it deliberately)',
      };
    }

    const anchor = captureTargetRef(targetRoot, { scopePaths, capturedAt: now, execFileSync });
    const next = {
      ...meta,
      ...anchor,
      // The honesty flag: this anchor describes the code at backfill time, not at execution time.
      targetRefBackfilled: true,
      targetRefReason:
        `${anchor.targetRefReason} — BACKFILLED at ${now.toISOString()}: this is the code state when ` +
        'the anchor was added, not when the run executed, so drift measured from it understates what ' +
        'actually changed since the run.',
    };
    writeJsonAtomic(file, next);
    return { updated: true, reason: 'anchor backfilled', anchor: next };
  });
}

/**
 * The frozen-scope fields — see changeSupplierFeatureRunScope's header.
 *
 * `scopeFamily` is deliberately NOT in this list. It is frozen absolutely, not frozen-but-changeable:
 * converting a classic module run into a Supplier-Feature run (or back) is not a scope CHANGE, it is
 * a different run. The retired Service-tier version of this list carried `service` here for exactly
 * that kind of re-pointing, which the new model has no equivalent of.
 */
const SCOPE_FREEZE_FIELDS = ['feature', 'supplier', 'sharedScope', 'testingLayerScope'];

/**
 * Changes the frozen scope of an EXISTING Supplier-Feature run — the one supported path to mutate
 * `feature` / `supplier` / `sharedScope` / `testingLayerScope` after creation
 * (module_architecture.md §11.5.1 "Run scope freeze", ndc_execution_rules.md §A4). Nothing else in
 * this platform writes those fields once a run exists, so a change made any other way is, by
 * construction, the silent mutation this function exists to prevent.
 *
 * Requires explicit human approval (`approvedBy`) and a non-empty `reason` — a scope change is never
 * inferred or automatic. The proposed new shape is re-validated with `validateRunScopeFamily()`, so a
 * change can never land the run in a shape `createRun()` itself would have refused (e.g. both
 * `supplier` and `sharedScope` set). Every change is APPENDED to `scopeHistory`, never overwritten —
 * the previous scope stays reconstructable.
 *
 * Refuses on a classic run (`scopeFamily` null): scope-freeze/history is a Supplier-Features concept,
 * and this function must never be the path by which an Agency/Branch/classic-module run gains fields
 * it never had before. This is the same guard the Service-tier version applied via `service`, moved
 * onto the discriminator that replaced it.
 *
 * @param {string} runsDir
 * @param {string} folderName
 * @param {object} opts
 * @param {Date} opts.now
 * @param {string} opts.approvedBy - the human who approved this change
 * @param {string} opts.reason - non-empty; why the scope is changing
 * @param {object} [opts.changes] - subset of SCOPE_FREEZE_FIELDS; omitted fields are unchanged
 * @returns {{updated: boolean, previous: object, next: object, historyEntry: object}}
 */
function changeSupplierFeatureRunScope(runsDir, folderName, opts = {}) {
  const { now, approvedBy, reason, changes = {} } = opts;

  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new CreateRunError('changeSupplierFeatureRunScope requires an explicit valid `now` Date.');
  }
  if (approvedBy && String(approvedBy).trim()) assertApproverName(approvedBy, 'Scope change');
  if (!approvedBy || !String(approvedBy).trim()) {
    throw new CreateRunError(
      'changeSupplierFeatureRunScope requires `approvedBy` — a scope change must be attributed to ' +
      'the human who approved it, never applied silently.'
    );
  }
  if (!reason || !String(reason).trim()) {
    throw new CreateRunError('changeSupplierFeatureRunScope requires a non-empty `reason`.');
  }

  const unknownKeys = Object.keys(changes).filter((k) => !SCOPE_FREEZE_FIELDS.includes(k));
  if (unknownKeys.length) {
    throw new CreateRunError(
      `changeSupplierFeatureRunScope only accepts changes to ${SCOPE_FREEZE_FIELDS.join(', ')}. ` +
      `Got unknown key(s): ${unknownKeys.join(', ')}.`
    );
  }

  const file = path.join(runsDir, folderName, 'metadata', 'run.json');
  if (!fs.existsSync(file)) {
    throw new CreateRunError(`No readable metadata/run.json for run "${folderName}".`);
  }
  // Same lock as the run state model, so a scope change never overwrites a concurrent state change.
  return withRunLock(runsDir, folderName, () => {
    let meta;
    try {
      meta = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      throw new CreateRunError(`No readable metadata/run.json for run "${folderName}".`);
    }

    if (meta.scopeFamily === null || meta.scopeFamily === undefined) {
      throw new CreateRunError(
        `Run "${folderName}" is not Supplier-Feature-scoped (\`scopeFamily\` is null) — scope-freeze/` +
        'history does not apply to a classic module-scoped run.'
      );
    }

    const previous = {};
    const next = {};
    for (const f of SCOPE_FREEZE_FIELDS) {
      previous[f] = meta[f] ?? null;
      next[f] = Object.prototype.hasOwnProperty.call(changes, f) ? changes[f] : previous[f];
    }

    // Re-validate the full XOR/both-set invariant against the PROPOSED new shape. `scopeFamily` is read
    // from the existing run rather than from `next` — it is not changeable here, but the validator needs
    // it to know which rules apply. `testingLayerScope` is opaque to this check.
    validateRunScopeFamily({ ...next, scopeFamily: meta.scopeFamily });
    // Phase 9.2, F-11: a scope change binds only to registered, eligible scope too (the CLI always asks).
    if (opts.requireRegisteredScope) {
      // eslint-disable-next-line global-require
      const problems = require('./scopeRegistration').runScopeProblems(path.dirname(runsDir), { ...next, scopeFamily: meta.scopeFamily });
      if (problems.length) throw new CreateRunError(`Scope change refused — the new scope is not registered and approved: ${problems.join('; ')}.`);
    }

    const historyEntry = {
      changedAt: now.toISOString(),
      approvedBy: String(approvedBy),
      reason: String(reason),
      previous,
      next,
    };

    const updated = {
      ...meta,
      ...next,
      scopeHistory: [...(Array.isArray(meta.scopeHistory) ? meta.scopeHistory : []), historyEntry],
    };
    writeJsonAtomic(file, updated);

    return { updated: true, previous, next, historyEntry };
  });
}

module.exports = {
  CreateRunError,
  SUPPLIER_FEATURE_SCOPE,
  createRun,
  backfillTargetRef,
  validateRunScopeFamily,
  changeSupplierFeatureRunScope,
  SCOPE_FREEZE_FIELDS,
};
