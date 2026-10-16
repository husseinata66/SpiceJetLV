// Active Run Pointer — the one place that answers "which run is the pipeline working on right now?"
//
// A project accumulates many runs under platform_core_data/runs/. Before this module, every stage
// resolved {{RUN_FOLDER}} from conversational context, so "continue the Leave run" and "start a new
// run" were indistinguishable to the tooling — and a stage could silently write Stage 5 output into
// a run whose Stage 3 belonged to something else.
//
// The pointer is deliberately STICKY: setActiveRun() rewrites it, and every later stage targets that
// run until it is switched again. It is a pointer, never a second copy of run state — the run's own
// metadata/run.json (run_manager.md §7) stays authoritative for the run's status, scope, and target.
// Fields duplicated here are a convenience cache for display, refreshed on every set.
//
// See workflows_and_pipelines/pipeline/run_manager.md §5.7.

const fs = require('fs');
const path = require('path');

const { resolveRunFolder, resolveRunFolderStrict } = require('./runFolderIndex');
const { parseRunFolderName } = require('./runFolderName');
const { withFileLock, writeFileAtomic } = require('./atomicFile');

// The pointer is rewritten on every activation and stage advance, often by concurrent processes (Phase 9.3,
// F-26): each read-modify-write holds this lock, and each write goes through a uniquely named temp file with
// the Windows rename retry. A fixed temp name made two writers share one file, and one crashed (EPERM) after
// its run had already been created.
const pointerLock = (runsDir) => `${activeRunPath(runsDir)}.lock`;

const ACTIVE_RUN_FILENAME = 'current_active_run.json';

// Bumped only on a breaking shape change, so a reader can fail loudly rather than misread an old file.
const ACTIVE_RUN_SCHEMA_VERSION = 1;

class ActiveRunError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ActiveRunError';
  }
}

/**
 * @param {string} runsDir
 * @returns {string} absolute path to the pointer file
 */
function activeRunPath(runsDir) {
  return path.join(runsDir, ACTIVE_RUN_FILENAME);
}

/**
 * Reads a run's own metadata/run.json, if it exists. Returns {} when absent or unparseable —
 * a missing/corrupt run.json must not make switching impossible, since the folder on disk is the
 * thing being pointed at, not its metadata.
 * @param {string} runsDir
 * @param {string} folderName
 * @returns {object}
 */
function readRunMetadata(runsDir, folderName) {
  const file = path.join(runsDir, folderName, 'metadata', 'run.json');
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Which stage folders actually exist for a run, in pipeline order. A run only has folders for the
 * stages it reached (run_manager.md §6), so this is how "where did this run get to?" is answered
 * without trusting a status field that may be stale.
 * @param {string} runsDir
 * @param {string} folderName
 * @returns {string[]}
 */
const STAGE_FOLDERS = [
  'context',
  'discovery',
  'test_design',
  'manual_execution',
  'automation',
  'execution',
  'self_healing',
  'reporting',
];

/**
 * True when `folderName` is plausibly a run folder rather than an arbitrary directory that happens to
 * sit under runs/. Accepts either a parseable name (current or legacy convention) or the presence of
 * the metadata/ folder every run carries (run_manager.md §6) — the latter so a hand-renamed run is
 * still usable, and the former so a brand-new run with no metadata yet is too.
 * @param {string} runsDir
 * @param {string} folderName
 * @returns {boolean}
 */
function isRunFolder(runsDir, folderName) {
  const parsed = parseRunFolderName(folderName);
  if (parsed && parsed.format && parsed.format !== 'unknown') return true;
  try {
    return fs.statSync(path.join(runsDir, folderName, 'metadata')).isDirectory();
  } catch {
    return false;
  }
}

function detectStagesPresent(runsDir, folderName) {
  const runDir = path.join(runsDir, folderName);
  return STAGE_FOLDERS.filter((stage) => {
    try {
      return fs.statSync(path.join(runDir, stage)).isDirectory();
    } catch {
      return false;
    }
  });
}

/**
 * Lists every run folder on disk, newest-first by start time (runs with no readable start time sort
 * last, then alphabetically). Start time, not run index: each Feature/module numbers its own runs
 * (run_manager.md §5.1.1), so `ancillaries-run-002` and `reissue-run-007` have no index order between
 * them. Used by the CLI's `list` verb and by any agent that needs to offer a choice.
 * @param {string} runsDir
 * @returns {Array<{folderName: string, index: number|null, runOwner: string|null, scope: string|null, target: string|null, status: string|null, stagesPresent: string[]}>}
 */
function listRuns(runsDir) {
  let names = [];
  try {
    names = fs.readdirSync(runsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }

  const runs = names.map((folderName) => {
    const parsed = parseRunFolderName(folderName);
    const meta = readRunMetadata(runsDir, folderName);
    return {
      folderName,
      index: parsed.index ?? meta.index ?? null,
      runOwner: parsed.owner ?? meta.runOwner ?? null,
      scope: parsed.scope ?? meta.scope ?? null,
      target: parsed.target ?? meta.target ?? null,
      status: meta.status ?? null,
      stateModel: Boolean(meta.stateSchemaVersion),
      stagesPresent: detectStagesPresent(runsDir, folderName),
      // Sort key only, dropped before returning.
      sortTime: runStartMillis(parsed, meta),
    };
  });

  runs.sort((a, b) => {
    if (a.sortTime !== null && b.sortTime !== null && a.sortTime !== b.sortTime) return b.sortTime - a.sortTime;
    if (a.sortTime !== null && b.sortTime === null) return -1;
    if (b.sortTime !== null && a.sortTime === null) return 1;
    return a.folderName.localeCompare(b.folderName);
  });
  return runs.map(({ sortTime, ...run }) => run);
}

/**
 * A run's start time in epoch ms: run.json's startedTime (UTC ISO) when present, else the folder-name
 * timestamp read as local time — which is how formatTimestamp() wrote it.
 */
function runStartMillis(parsed, meta) {
  const fromMeta = meta.startedTime ? Date.parse(meta.startedTime) : NaN;
  if (Number.isFinite(fromMeta)) return fromMeta;
  const m = /^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/.exec(parsed.timestamp || '');
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime();
}

/**
 * Points the pipeline at `identifier`. Accepts a full folder name, a legacy Run ID, or anything else
 * resolveRunFolder() understands, so a human can type the short form.
 *
 * The target folder MUST exist: pointing at a run that isn't there would make every downstream
 * {{RUN_FOLDER}} resolution fail later, at a confusing place, instead of here.
 *
 * @param {string} runsDir
 * @param {string} identifier - folder name / legacy Run ID / resolvable alias
 * @param {{now: Date, setBy?: string, note?: string}} opts - `now` is required (never defaulted
 *        internally, matching generateRunFolderName's contract) so callers stay deterministic.
 * @returns {object} the pointer object written to disk
 */
function setActiveRun(runsDir, identifier, opts = {}) {
  if (!identifier) throw new ActiveRunError('An active run identifier is required.');

  const { now, setBy, note } = opts;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new ActiveRunError('setActiveRun requires an explicit valid `now` Date.');
  }

  const folderName = resolveRunFolder(runsDir, identifier);
  // An ambiguous identifier is reported as ambiguous, with the candidates, rather than as
  // "not found" — the user typed something real, it just matched more than one run (C7).
  if (!folderName) {
    const strict = resolveRunFolderStrict(runsDir, identifier);
    if (strict.ambiguous) {
      throw new ActiveRunError(
        `"${identifier}" matches ${strict.candidates.length} runs: ${strict.candidates.join(", ")}. ` +
        'Pass the full folder name.'
      );
    }
  }
  if (!folderName) {
    throw new ActiveRunError(
      `No run folder matches "${identifier}" under ${runsDir}. ` +
      'Run `cli.js list` to see available runs, or generate a new run folder name first.'
    );
  }

  // Existing-but-not-a-run is rejected as firmly as nonexistent. `runs/` also holds bookkeeping and,
  // in a hand-organized project, arbitrary directories; pointing the pipeline at one would send every
  // stage's output somewhere structurally meaningless. A directory qualifies when its name parses
  // under either naming convention, or when it carries the metadata/ folder every run has (§6).
  if (!isRunFolder(runsDir, folderName)) {
    throw new ActiveRunError(
      `"${folderName}" exists under ${runsDir} but is not a run folder: its name matches neither ` +
      'the current convention ([<owner>-]run-NNN__YYYY-MM-DD_HH-mm-ss__Scope__Target) nor the legacy ' +
      'RUN-YYYYMMDD-XXX form, and it has no metadata/ folder. Run `cli.js list` to see real runs.'
    );
  }

  return withFileLock(pointerLock(runsDir), () => {
  const previous = readActiveRun(runsDir);
  const previousFolder = previous?.activeRun?.folderName ?? null;
  const parsed = parseRunFolderName(folderName);
  const meta = readRunMetadata(runsDir, folderName);

  const pointer = {
    schemaVersion: ACTIVE_RUN_SCHEMA_VERSION,
    activeRun: {
      folderName,
      index: parsed.index ?? meta.index ?? null,
      runOwner: parsed.owner ?? meta.runOwner ?? null,
      scope: parsed.scope ?? meta.scope ?? null,
      target: parsed.target ?? meta.target ?? null,
      // Cached for display only — metadata/run.json remains authoritative (§7).
      status: meta.status ?? null,
      title: meta.title ?? null,
      startedTime: meta.startedTime ?? null,
      stagesPresent: detectStagesPresent(runsDir, folderName),
      path: `platform_core_data/runs/${folderName}`,
    },
    switchedAt: now.toISOString(),
    setBy: setBy || 'Run Manager',
    // Kept so a mis-switch is one command to undo; deliberately one level deep, not a full history.
    // Re-setting the run that is already active carries the prior value forward rather than recording
    // the run as its own predecessor — otherwise a redundant set would destroy the undo target.
    previousRun: previousFolder === folderName
      ? previous?.previousRun ?? null
      : previousFolder ?? null,
    ...(note ? { note } : {}),
  };

  fs.mkdirSync(runsDir, { recursive: true });
  writeActiveRun(runsDir, pointer);
  return pointer;
  });
}

/**
 * @param {string} runsDir
 * @param {object} pointer
 */
function writeActiveRun(runsDir, pointer) {
  // Write to a temp file then rename: rename is atomic on both POSIX and Windows (same directory), so
  // a concurrent reader sees either the old pointer or the new one, never a half-written file. Cheap
  // insurance for a file rewritten on every stage advance.
  const target = activeRunPath(runsDir);
  writeFileAtomic(target, `${JSON.stringify(pointer, null, 2)}\n`);
}

/**
 * Reads the pointer. Returns null when no run has been activated yet — an absent pointer is a
 * legitimate state (fresh install), not an error.
 * @param {string} runsDir
 * @returns {object|null}
 */
function readActiveRun(runsDir) {
  const file = activeRunPath(runsDir);
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new ActiveRunError(`${ACTIVE_RUN_FILENAME} is not valid JSON: ${err.message}`);
  }
  if (parsed.schemaVersion !== undefined && parsed.schemaVersion > ACTIVE_RUN_SCHEMA_VERSION) {
    throw new ActiveRunError(
      `${ACTIVE_RUN_FILENAME} declares schemaVersion ${parsed.schemaVersion}, but this tool ` +
      `understands ${ACTIVE_RUN_SCHEMA_VERSION}. Upgrade the platform rather than editing the file.`
    );
  }
  return parsed;
}

/**
 * The single accessor a stage should use to resolve {{RUN_FOLDER}}.
 *
 * Returns null rather than guessing when there is no pointer, or when the pointer names a folder
 * that no longer exists (deleted/renamed by hand). A stage that gets null must ask which run to use
 * — inventing one would scatter artifacts across unrelated runs, which is exactly the failure this
 * module exists to prevent.
 *
 * @param {string} runsDir
 * @returns {string|null} the on-disk run folder name
 */
function resolveActiveRunFolder(runsDir, opts = {}) {
  // Precedence, mirroring spec-kit's SPECIFY_FEATURE_DIRECTORY -> feature.json ordering:
  //   1. AGENTIC_TESTING_RUN_FOLDER env var (explicit, per-process override)
  //   2. current_active_run.json
  //   3. null — the caller asks; it never guesses
  //
  // The env var is what makes two concurrent sessions possible on different runs: each exports its
  // own value and neither touches the shared file. It is deliberately NON-PERSISTING — resolution is
  // a read, and a read must never mutate shared state. (spec-kit learned this the hard way: its
  // path-resolution call wrote through to feature.json, so a read-only `--paths-only` invocation
  // dirtied the tree and clobbered a deliberately pinned value.)
  const env = opts.env || process.env;
  const override = env.AGENTIC_TESTING_RUN_FOLDER;
  if (override) {
    const resolved = resolveRunFolder(runsDir, override);
    if (!resolved) return null; // an override naming a missing run is an error, not a fallback
    return resolved;
  }

  const pointer = readActiveRun(runsDir);
  const folderName = pointer?.activeRun?.folderName;
  if (!folderName) return null;
  return resolveRunFolder(runsDir, folderName);
}

/**
 * True when a pointer exists but its run folder is gone — worth reporting distinctly from "no
 * pointer at all", since it means something was deleted out from under the pipeline.
 * @param {string} runsDir
 * @returns {boolean}
 */
function isActiveRunStale(runsDir) {
  const pointer = readActiveRun(runsDir);
  if (!pointer?.activeRun?.folderName) return false;
  return resolveRunFolder(runsDir, pointer.activeRun.folderName) === null;
}

/**
 * Removes the pointer entirely. Used when a project intentionally has no active run.
 * @param {string} runsDir
 * @returns {boolean} true if a pointer was removed, false if there was nothing to remove
 */
function clearActiveRun(runsDir) {
  const file = activeRunPath(runsDir);
  try {
    fs.unlinkSync(file);
    return true;
  } catch {
    return false;
  }
}

/**
 * Re-reads the pointed-at run's metadata and rewrites the cached fields, without changing which run
 * is active or the switchedAt stamp. Called after a stage advances so `status`/`stagesPresent` stay
 * truthful.
 * @param {string} runsDir
 * @returns {object|null} the refreshed pointer, or null if there is nothing to refresh
 */
function refreshActiveRun(runsDir) {
  if (!fs.existsSync(activeRunPath(runsDir))) return null;
  return withFileLock(pointerLock(runsDir), () => refreshActiveRunLocked(runsDir));
}

function refreshActiveRunLocked(runsDir) {
  const pointer = readActiveRun(runsDir);
  const folderName = pointer?.activeRun?.folderName;
  if (!folderName) return null;

  const resolved = resolveRunFolder(runsDir, folderName);
  if (!resolved) return pointer; // stale — surfaced by isActiveRunStale(), not silently repaired

  const meta = readRunMetadata(runsDir, resolved);
  const refreshed = {
    ...pointer,
    activeRun: {
      ...pointer.activeRun,
      status: meta.status ?? pointer.activeRun.status ?? null,
      title: meta.title ?? pointer.activeRun.title ?? null,
      stagesPresent: detectStagesPresent(runsDir, resolved),
    },
  };
  writeActiveRun(runsDir, refreshed);
  return refreshed;
}

module.exports = {
  ACTIVE_RUN_FILENAME,
  ACTIVE_RUN_SCHEMA_VERSION,
  ActiveRunError,
  STAGE_FOLDERS,
  isRunFolder,
  activeRunPath,
  listRuns,
  runStartMillis,
  setActiveRun,
  readActiveRun,
  resolveActiveRunFolder,
  isActiveRunStale,
  clearActiveRun,
  refreshActiveRun,
};
