// Baseline Ownership — which module owns which files inside the shared Workspace Automation
// Baseline. See workflows_and_pipelines/pipeline/pipeline.md §12.9.
//
// WHY THIS EXISTS. Before promotion, module isolation was physical: each module had its own
// tests_{Framework}/ directory, and one module's Stage 5H pass could not reach another's code
// because the code was not there. After promotion every module's classes live side by side in one
// baseline, so isolation has to be declared and enforced instead of assumed. This file is that
// declaration, and classifyPath() is that enforcement.
//
// The manifest lives at {baseline}/.baseline_ownership.json and is written at promotion time. It is
// tracked, reviewable, and deliberately readable: a human should be able to answer "who owns this
// file?" without running anything.
//
// THREE CLASSIFICATIONS, and the middle one is the interesting one:
//   owned   — the requesting module's own code. Edit freely.
//   shared  — whole-project surface (pom.xml, base page objects, auth fixtures, common utilities).
//             Editable, but §12.1's existing rule applies unchanged: the change is DECLARED in the
//             run's Decision Report, because it clears the whole-project gate rather than one
//             module's. classifyPath() reports it; it does not silently allow or silently block.
//   foreign — owned by a DIFFERENT module. A hard stop. This is the case the whole file exists for.
//
// An unlisted path is `unowned`, not `foreign`: a genuinely new file has no owner yet, and treating
// "new" as "someone else's" would make it impossible to add anything.

const fs = require('fs');
const path = require('path');

const OWNERSHIP_FILENAME = '.baseline_ownership.json';
const OWNERSHIP_SCHEMA_VERSION = 1;

class BaselineOwnershipError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BaselineOwnershipError';
  }
}

function toPosix(p) {
  return String(p).split(path.sep).join('/');
}

/**
 * Matches a POSIX-style relative path against one glob pattern.
 *
 * Deliberately supports only the three forms the manifest actually uses — `**`, `*`, and literals —
 * rather than pulling in a glob dependency for a file whose whole job is to be auditable by eye. `*`
 * stops at a path separator; `**` does not. Anchored at both ends, so `AdminPages/Admin/Branch`
 * never matches `Other/AdminPages/Admin/Branch`.
 *
 * @param {string} relPath
 * @param {string} pattern
 * @returns {boolean}
 */
function matchesPattern(relPath, pattern) {
  // Stands in for '**' while the single-'*' rule runs, so the two cannot interfere. Every regex
  // metacharacter is escaped by the first replace below, so this token can never be produced by a
  // caller's own pattern text.
  //
  // A printable string on purpose. An earlier version used a raw NUL byte here: it worked, but it
  // made git classify this whole module as BINARY — no line-level diff and no reviewable history,
  // for the one file whose stated job is to be auditable by eye.
  const DOUBLE_STAR = '\u0001DOUBLE_STAR\u0001';
  const escaped = toPosix(pattern)
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    // Order matters: '**' must be consumed before the single-'*' rule sees it, or '**' would become
    // two "not a slash" runs and stop matching across directories — the exact opposite of its job.
    .split('**').join(DOUBLE_STAR)
    .replace(/\*/g, '[^/]*')
    .split(DOUBLE_STAR).join('.*');
  return new RegExp(`^${escaped}$`).test(toPosix(relPath));
}

/**
 * @param {string} baselineAbsPath
 * @returns {string} absolute path to the manifest
 */
function ownershipPath(baselineAbsPath) {
  return path.join(baselineAbsPath, OWNERSHIP_FILENAME);
}

/**
 * Reads the manifest. Returns null when there is none — a baseline that has never had a module
 * promoted into it is a legitimate state, not an error.
 * @param {string} baselineAbsPath
 * @param {{fs?: object}} [deps]
 * @returns {object|null}
 */
function readOwnership(baselineAbsPath, deps = {}) {
  const fsImpl = deps.fs || fs;
  let raw;
  try {
    raw = fsImpl.readFileSync(ownershipPath(baselineAbsPath), 'utf8');
  } catch {
    return null;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new BaselineOwnershipError(`${OWNERSHIP_FILENAME} is not valid JSON: ${err.message}`);
  }
  if (parsed.schemaVersion !== undefined && parsed.schemaVersion > OWNERSHIP_SCHEMA_VERSION) {
    throw new BaselineOwnershipError(
      `${OWNERSHIP_FILENAME} declares schemaVersion ${parsed.schemaVersion}, but this tool ` +
      `understands ${OWNERSHIP_SCHEMA_VERSION}.`
    );
  }
  return parsed;
}

/**
 * Registers (or updates) one module's ownership claim.
 *
 * Overlap with an EXISTING module's claim is refused rather than merged. Two modules owning the same
 * file is precisely the ambiguity this manifest exists to remove: with an overlap in place,
 * classifyPath() would answer "owned" for both of them and the foreign-write guard would never fire.
 * A file that genuinely belongs to everyone is `shared`, which is a different list with a different
 * gate.
 *
 * @param {string} baselineAbsPath
 * @param {string} slug
 * @param {{owned: string[], shared?: string[], suite?: string, promotedAt: string,
 *          baselineRef?: string, now: Date, fs?: object}} opts
 * @returns {object} the written manifest
 */
function registerModuleOwnership(baselineAbsPath, slug, opts = {}) {
  const fsImpl = opts.fs || fs;
  const { owned, now } = opts;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new BaselineOwnershipError('registerModuleOwnership requires an explicit valid `now` Date.');
  }
  if (!Array.isArray(owned) || owned.length === 0) {
    throw new BaselineOwnershipError(
      `Module "${slug}" must declare at least one owned path — an ownership claim over nothing ` +
      'cannot scope a later edit.'
    );
  }

  const prior = readOwnership(baselineAbsPath, { fs: fsImpl }) || {
    schemaVersion: OWNERSHIP_SCHEMA_VERSION,
    baseline: toPosix(baselineAbsPath),
    modules: {},
    shared: [],
  };

  for (const [otherSlug, claim] of Object.entries(prior.modules || {})) {
    if (otherSlug === slug) continue;
    for (const pattern of owned) {
      const collision = (claim.owned || []).find(
        (existing) => existing === pattern
          || matchesPattern(pattern.replace(/\*+$/, ''), existing)
          || matchesPattern(existing.replace(/\*+$/, ''), pattern)
      );
      if (collision) {
        throw new BaselineOwnershipError(
          `Ownership collision: "${pattern}" claimed by module "${slug}" overlaps "${collision}", ` +
          `already owned by module "${otherSlug}". Two modules cannot own the same baseline path — ` +
          'a file that genuinely belongs to both is `shared`, which clears the whole-project gate ' +
          'instead (pipeline.md §12.1).'
        );
      }
    }
  }

  const next = {
    ...prior,
    schemaVersion: OWNERSHIP_SCHEMA_VERSION,
    modules: {
      ...(prior.modules || {}),
      [slug]: {
        owned: [...owned],
        ...(opts.suite ? { suite: opts.suite } : {}),
        promotedAt: opts.promotedAt || now.toISOString(),
        ...(opts.baselineRef ? { baselineRef: opts.baselineRef } : {}),
      },
    },
    shared: opts.shared ? [...opts.shared] : (prior.shared || []),
    updatedAt: now.toISOString(),
  };

  // `dryRun` (Phase 9.1, F-05): every check above, nothing written — so a retirement can prove the claim
  // is valid before its first mutation.
  if (!opts.dryRun) fsImpl.writeFileSync(ownershipPath(baselineAbsPath), `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}

/**
 * Classifies one baseline-relative path from the point of view of `slug`.
 *
 * `owner` is reported even for the foreign case on purpose: "you may not touch this" is far more
 * actionable when it also says whose it is.
 *
 * @param {object|null} manifest
 * @param {string} relPath - baseline-relative, POSIX separators
 * @param {string} slug - the module requesting the write
 * @returns {{classification: 'owned'|'shared'|'foreign'|'unowned', owner: string|null,
 *           pattern: string|null}}
 */
function classifyPath(manifest, relPath, slug) {
  const rel = toPosix(relPath);
  if (!manifest) return { classification: 'unowned', owner: null, pattern: null };

  for (const [otherSlug, claim] of Object.entries(manifest.modules || {})) {
    for (const pattern of claim.owned || []) {
      if (matchesPattern(rel, pattern)) {
        return {
          classification: otherSlug === slug ? 'owned' : 'foreign',
          owner: otherSlug,
          pattern,
        };
      }
    }
  }

  for (const pattern of manifest.shared || []) {
    if (matchesPattern(rel, pattern)) {
      return { classification: 'shared', owner: null, pattern };
    }
  }

  return { classification: 'unowned', owner: null, pattern: null };
}

/**
 * Classifies a whole changeset and decides whether it may proceed.
 *
 * `allowed` is false if and ONLY if something foreign is touched. Shared paths come back in their
 * own bucket for the caller to declare, not to block on — blocking them would make every legitimate
 * pom.xml bump impossible, and §12.1 already governs them through the Decision Report.
 *
 * @param {object|null} manifest
 * @param {string[]} relPaths
 * @param {string} slug
 * @returns {{allowed: boolean, owned: string[], shared: string[], unowned: string[],
 *           foreign: Array<{path: string, owner: string}>}}
 */
function classifyChangeset(manifest, relPaths, slug) {
  const result = { allowed: true, owned: [], shared: [], unowned: [], foreign: [] };
  for (const rel of relPaths) {
    const { classification, owner } = classifyPath(manifest, rel, slug);
    if (classification === 'foreign') {
      result.foreign.push({ path: toPosix(rel), owner });
      result.allowed = false;
    } else {
      result[classification].push(toPosix(rel));
    }
  }
  return result;
}

/**
 * Throws unless every path in `relPaths` is safe for `slug` to write.
 *
 * The message names each offending file and its owner, because "ownership violation" without the
 * list is a dead end for whoever has to fix it.
 *
 * @param {object|null} manifest
 * @param {string[]} relPaths
 * @param {string} slug
 * @returns {object} the classification, when it passes
 */
function assertWritable(manifest, relPaths, slug) {
  const classified = classifyChangeset(manifest, relPaths, slug);
  if (!classified.allowed) {
    const detail = classified.foreign.map((f) => `  ${f.path} (owned by "${f.owner}")`).join('\n');
    throw new BaselineOwnershipError(
      `Module "${slug}" attempted to write ${classified.foreign.length} file(s) owned by another ` +
      `module in the Workspace Automation Baseline:\n${detail}\n` +
      'Scope the change to this module and its genuinely shared dependencies (pipeline.md §12.9).'
    );
  }
  return classified;
}

module.exports = {
  OWNERSHIP_FILENAME,
  OWNERSHIP_SCHEMA_VERSION,
  BaselineOwnershipError,
  ownershipPath,
  readOwnership,
  registerModuleOwnership,
  matchesPattern,
  classifyPath,
  classifyChangeset,
  assertWritable,
};
