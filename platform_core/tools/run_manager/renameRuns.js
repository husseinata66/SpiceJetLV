// Run renaming onto per-owner sequences — moves existing runs into the `<owner>-run-NNN` convention.
//
// WHY THIS EXISTS
// Runs used to share one global `run-NNN` counter, so parallel branches each minted their own run-006,
// run-007, ... and the numbers collided the moment those branches met (run_manager.md §5.1.1). Runs are
// now numbered per Feature/module. This module brings EXISTING runs onto that convention — the one
// sanctioned exception to "a run folder is never renamed" (§5.6), and only on explicit human approval.
//
// Plan-then-apply, like runLineage.js: planRunRenames() is pure and writes nothing, so the exact
// mapping is shown and approved before applyRunRenames() touches the disk.
//
// What a rename does, and why each part is needed:
//   - the folder is renamed (fs.renameSync — git sees it as a rename once staged);
//   - every reference to the old name in the data root's text files is rewritten in ONE pass, so
//     links, manifests, lineage, and registry `lastRun` paths keep pointing at the right run;
//   - run.json gets the new folderName/index/runOwner plus a `renamedFrom` history entry;
//   - the Active Run pointer follows the run;
//   - `.run_folder_index.json` records { legacyName, renamedTo }, so the OLD name still resolves
//     through resolveRunFolder() — anything outside the data root that cites it keeps working.
//
// Runs with no owner (nothing recorded in run.json, and none assigned) are left exactly as they are.
// An owner is never guessed from a folder's target text: a classic run that recorded no modules[] only
// joins a sequence when a human assigns it one.

const fs = require('fs');
const path = require('path');

const {
  RUN_INDEX_RE, normalizeRunOwner, deriveRunOwner, formatRunIndex, parseRunFolderName,
} = require('./runFolderName');
const { INDEX_FILENAME, loadIndex, saveIndex, resolveRunFolder } = require('./runFolderIndex');
const { ACTIVE_RUN_FILENAME, runStartMillis } = require('./activeRun');

class RenameRunsError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RenameRunsError';
  }
}

/** Text files whose references to a run folder are rewritten. Anything else is reported, not touched. */
const TEXT_EXTENSIONS = new Set([
  '.md', '.json', '.jsonl', '.csv', '.txt', '.html', '.htm', '.yml', '.yaml', '.xml', '.log',
  '.js', '.ts', '.java', '.properties', '.feature',
]);

function readJsonOr(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function listRunFolders(runsDir) {
  try {
    return fs.readdirSync(runsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((name) => name !== '.git');
  } catch {
    return [];
  }
}

/**
 * Plans moving runs onto their owner's sequence. Pure: reads, computes, writes nothing.
 *
 * Owner per run, in priority order: an explicit `assign` entry (a human decision) → run.json's
 * `runOwner` → the scope fields run.json records (deriveRunOwner). A run whose name already carries
 * that owner is left alone and keeps its index. The rest of each owner's runs are numbered after the
 * highest index the owner already has, in start-time order — so the sequence reads chronologically.
 *
 * @param {string} runsDir
 * @param {{assign?: Object<string, string>}} [opts] - run identifier → owner, for runs whose run.json
 *   records no scope (e.g. classic runs created before `modules[]` existed)
 * @returns {{renames: object[], unchanged: object[], unowned: object[], errors: object[]}}
 */
function planRunRenames(runsDir, { assign = {} } = {}) {
  const errors = [];

  // Resolve assignment keys up front: a typo must fail the plan, never silently skip a run.
  const assigned = new Map();
  for (const [identifier, owner] of Object.entries(assign)) {
    const folder = resolveRunFolder(runsDir, identifier);
    if (!folder) {
      errors.push({ folderName: identifier, error: `--assign names a run that does not exist: "${identifier}"` });
      continue;
    }
    try {
      assigned.set(folder, normalizeRunOwner(owner));
    } catch (err) {
      errors.push({ folderName: folder, error: err.message });
    }
  }

  const runs = [];
  for (const folderName of listRunFolders(runsDir)) {
    const parsed = parseRunFolderName(folderName);
    const meta = readJsonOr(path.join(runsDir, folderName, 'metadata', 'run.json'), null);
    if (parsed.format !== 'new' && !meta) continue; // not a run folder

    let owner = null;
    let ownerSource = null;
    if (assigned.has(folderName)) {
      owner = assigned.get(folderName);
      ownerSource = 'assigned';
    } else if (meta && meta.runOwner) {
      owner = meta.runOwner;
      ownerSource = 'run.json runOwner';
    } else if (meta) {
      try {
        owner = deriveRunOwner(meta);
        ownerSource = 'run.json scope fields';
      } catch (err) {
        errors.push({ folderName, error: err.message });
        continue;
      }
    }

    runs.push({
      folderName,
      parsed,
      owner,
      ownerSource,
      startMillis: runStartMillis(parsed, meta || {}),
    });
  }

  const unowned = [];
  const unchanged = [];
  const toRename = [];
  for (const run of runs) {
    if (!run.owner) {
      unowned.push({ folderName: run.folderName });
    } else if (run.parsed.format === 'legacy') {
      errors.push({
        folderName: run.folderName,
        error: 'legacy RUN-YYYYMMDD-XXX folders are resolved through the compatibility index (§5.6), not renamed',
      });
    } else if (run.parsed.owner === run.owner) {
      unchanged.push({ folderName: run.folderName, owner: run.owner, index: run.parsed.index });
    } else {
      toRename.push(run);
    }
  }

  // Next free index per owner = one past the highest it already holds on runs that stay put.
  const highest = new Map();
  for (const u of unchanged) {
    highest.set(u.owner, Math.max(highest.get(u.owner) || 0, u.index || 0));
  }

  toRename.sort((a, b) => {
    if (a.startMillis !== null && b.startMillis !== null && a.startMillis !== b.startMillis) {
      return a.startMillis - b.startMillis;
    }
    return a.folderName.localeCompare(b.folderName);
  });

  const taken = new Set(listRunFolders(runsDir));
  const renames = [];
  for (const run of toRename) {
    const index = (highest.get(run.owner) || 0) + 1;
    highest.set(run.owner, index);

    // Only the prefix changes; timestamp, scope, target, and any __N dedupe suffix are kept verbatim.
    const prefixMatch = run.folderName.match(RUN_INDEX_RE);
    const body = prefixMatch ? run.folderName.slice(prefixMatch[0].length) : run.folderName;
    const newName = `${formatRunIndex(index, run.owner)}__${body}`;

    if (taken.has(newName)) {
      errors.push({ folderName: run.folderName, error: `target name already exists: ${newName}` });
      continue;
    }
    taken.add(newName);
    renames.push({
      from: run.folderName,
      to: newName,
      owner: run.owner,
      index,
      ownerSource: run.ownerSource,
    });
  }

  return { renames, unchanged, unowned, errors };
}

function collectTextFiles(dir, skip) {
  const out = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectTextFiles(full, skip));
    } else if (!skip.has(entry.name) && TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Rewrites every reference to a renamed folder under `root`, all mappings in ONE pass so a chain
 * (A→B while B→C) can never double-apply. A match must stand alone — not preceded or followed by a
 * name character — so renaming `run-006__…Branch` never touches `run-006__…Branch__2`, and an already
 * owner-prefixed `reissue-run-006__…` is never mistaken for the bare `run-006__…`.
 *
 * @returns {{filesChanged: string[], replacements: number}}
 */
function rewriteReferences(root, renames) {
  if (!renames.length) return { filesChanged: [], replacements: 0 };
  const map = new Map(renames.map((r) => [r.from, r.to]));
  const alternation = [...map.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp).join('|');
  const re = new RegExp(`(?<![A-Za-z0-9_-])(?:${alternation})(?![A-Za-z0-9_-])`, 'g');

  // The compatibility index must keep the OLD names — that is how they keep resolving. The Active Run
  // pointer is updated explicitly by applyRunRenames(), which also moves its index/runOwner.
  const files = collectTextFiles(root, new Set([INDEX_FILENAME, ACTIVE_RUN_FILENAME]));
  const filesChanged = [];
  let replacements = 0;
  for (const file of files) {
    let content;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    // A run.json's `renamedFrom` history records old names ON PURPOSE. It is lifted out before the
    // rewrite and put back after, so re-running a rewrite can never turn "renamed from X" into
    // "renamed from itself".
    let history = null;
    if (path.basename(file) === 'run.json') {
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed.renamedFrom)) history = parsed.renamedFrom;
      } catch { /* not valid JSON — rewritten as plain text */ }
    }

    let count = 0;
    let next = content.replace(re, (m) => {
      count += 1;
      return map.get(m);
    });
    if (count && history) {
      const parsed = JSON.parse(next);
      parsed.renamedFrom = history;
      next = `${JSON.stringify(parsed, null, 2)}\n`;
    }
    if (count) {
      fs.writeFileSync(file, next, 'utf8');
      filesChanged.push(file);
      replacements += count;
    }
  }
  return { filesChanged, replacements };
}

/**
 * Applies a plan from planRunRenames(). Requires a named approver and a reason — renaming a run is the
 * exception to run immutability (run_manager.md §5.6), so it is never applied silently.
 *
 * @param {string} runsDir
 * @param {object} plan - planRunRenames() output; refused if it carries errors
 * @param {{now: Date, approvedBy: string, reason: string, rewriteRoot?: string|null}} opts -
 *   `rewriteRoot` (default: the data root, runsDir's parent) is where references are rewritten;
 *   pass null to skip the rewrite and rely on the compatibility index alone
 * @returns {{renamed: object[], filesChanged: string[], replacements: number, activeRunUpdated: boolean}}
 */
function applyRunRenames(runsDir, plan, opts = {}) {
  const { now, approvedBy, reason } = opts;
  const rewriteRoot = opts.rewriteRoot === undefined ? path.dirname(runsDir) : opts.rewriteRoot;

  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new RenameRunsError('applyRunRenames requires an explicit valid `now` Date.');
  }
  if (!approvedBy || !String(approvedBy).trim()) {
    throw new RenameRunsError('applyRunRenames requires `approvedBy` — renaming a run is never applied silently.');
  }
  // The same approver rule as every approval (Phase 9.4; approverIdentity.js).
  // eslint-disable-next-line global-require
  const problem = require('./approverIdentity').approverProblem(approvedBy);
  if (problem) throw new RenameRunsError(`applyRunRenames: ${problem}. Name the human who approved the rename (a name is recorded, not authenticated).`);
  if (!reason || !String(reason).trim()) {
    throw new RenameRunsError('applyRunRenames requires a non-empty `reason`.');
  }
  if (plan.errors && plan.errors.length) {
    throw new RenameRunsError(
      `The plan has ${plan.errors.length} error(s); resolve them before applying:\n` +
      plan.errors.map((e) => `  ${e.folderName}: ${e.error}`).join('\n')
    );
  }

  // Verify the whole plan against the disk BEFORE the first rename, so a stale plan fails cleanly.
  for (const r of plan.renames) {
    if (!fs.existsSync(path.join(runsDir, r.from))) {
      throw new RenameRunsError(`Run "${r.from}" no longer exists — re-plan before applying.`);
    }
    if (fs.existsSync(path.join(runsDir, r.to))) {
      throw new RenameRunsError(`"${r.to}" already exists — re-plan before applying.`);
    }
  }

  for (const r of plan.renames) {
    fs.renameSync(path.join(runsDir, r.from), path.join(runsDir, r.to));
  }

  // References first, then run.json's history — the history records the OLD name on purpose, and the
  // rewrite pass would otherwise replace it.
  const { filesChanged, replacements } = rewriteRoot
    ? rewriteReferences(rewriteRoot, plan.renames)
    : { filesChanged: [], replacements: 0 };

  const renamedAt = now.toISOString();
  for (const r of plan.renames) {
    const file = path.join(runsDir, r.to, 'metadata', 'run.json');
    const meta = readJsonOr(file, null);
    if (!meta) continue;
    writeJson(file, {
      ...meta,
      folderName: r.to,
      index: r.index,
      runOwner: r.owner,
      renamedFrom: [
        ...(Array.isArray(meta.renamedFrom) ? meta.renamedFrom : []),
        {
          folderName: r.from, renamedAt, approvedBy: String(approvedBy), reason: String(reason),
          ownerSource: r.ownerSource,
        },
      ],
    });
  }

  // The Active Run pointer follows its run. Edited in place rather than re-set through setActiveRun(),
  // which would stamp a new switchedAt and make a rename look like a human switching runs.
  let activeRunUpdated = false;
  const pointerFile = path.join(runsDir, ACTIVE_RUN_FILENAME);
  const pointer = readJsonOr(pointerFile, null);
  if (pointer) {
    const byFrom = new Map(plan.renames.map((r) => [r.from, r]));
    const hit = pointer.activeRun && byFrom.get(pointer.activeRun.folderName);
    if (hit) {
      pointer.activeRun = {
        ...pointer.activeRun,
        folderName: hit.to,
        index: hit.index,
        runOwner: hit.owner,
        path: `platform_core_data/runs/${hit.to}`,
      };
      activeRunUpdated = true;
    }
    if (pointer.previousRun && byFrom.has(pointer.previousRun)) {
      pointer.previousRun = byFrom.get(pointer.previousRun).to;
      activeRunUpdated = true;
    }
    if (activeRunUpdated) writeJson(pointerFile, pointer);
  }

  const index = loadIndex(runsDir);
  for (const r of plan.renames) {
    index.push({
      legacyName: r.from, renamedTo: r.to, confidence: 'high', source: 'renameRuns', renamedAt,
    });
  }
  saveIndex(runsDir, index);

  return { renamed: plan.renames, filesChanged, replacements, activeRunUpdated };
}

module.exports = {
  RenameRunsError,
  planRunRenames,
  applyRunRenames,
  rewriteReferences,
};
