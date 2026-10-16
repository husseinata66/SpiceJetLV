// Feature Registry — standalone Features registered underneath a module.
//
// See workflows_and_pipelines/pipeline/module_architecture.md §5.5 and
// workflows_and_pipelines/pipeline/new_us_intake.md.
//
// WHAT A FEATURE IS, AND WHAT IT IS NOT
//   A standalone Feature is one capability, supplied as its own User Story, that lives inside a
//   parent module's business area without being part of that entity's CRUD package. It gets a folder
//   at modules/<module>/features/<feature>/ and its own independent stage tracking.
//
//   A CRUD area — Add/Create, Update, Search, Approve, Reject for the same entity — is NOT a Feature.
//   It stays in the consolidated module scope and gets no feature folder, however feature-shaped the
//   capability may sound. That classification is a HUMAN decision made at intake (new_us_intake.md
//   §4); this module records the answer and never infers it.
//
// STAGE INDEPENDENCE (decision A)
//   A Feature's `stages` map is its own. Module-level stages describe the consolidated CRUD scope;
//   feature-level stages describe that one Feature. recordFeatureStage() NEVER touches the parent
//   module's stage map, because a Feature reaching Test Design says nothing about whether the
//   module's CRUD suite did.
//
// SCHEMA COMPATIBILITY (decision B)
//   `features[]` is an OPTIONAL key on a module entry, and schemaVersion stays 1. An absent
//   `features` means "this module has no registered standalone Features" — which is the correct
//   reading of every registry written before this file existed. Nothing migrates, and every existing
//   reader keeps working because it simply never looks at a key that is not there.

const fs = require('fs');
const path = require('path');
const { assertApproverName } = require('../run_manager/approverIdentity');

const {
  MODULE_STAGES,
  STAGE_STATUSES,
  emptyStages,
  findModule,
  readModuleState,
  readRegistry,
  writeJsonAtomic,
  writeModuleState,
  writeRegistry,
} = require('./moduleRegistry');

const { assertValidModuleSlug, generateModuleSlug, uniqueModuleSlug } = require('./moduleSlug');

/**
 * A Feature's stages are the SAME set as a module's, deliberately. A Feature runs the same pipeline
 * against a narrower scope; giving it a parallel vocabulary would mean two answers to "is Stage 3
 * approved?", which is the one question every gate depends on.
 */
const FEATURE_STAGES = MODULE_STAGES;

/** Mirrors MODULE_STATUSES — a Feature is proposed, approved, and superseded on the same terms. */
const FEATURE_STATUSES = ['Proposed', 'Active', 'Superseded', 'Archived'];

/** The folder that holds a module's Features. Created on first scaffold, never eagerly (§5.5). */
const FEATURES_DIRNAME = 'features';

const FEATURE_STATE_FILENAME = 'feature.json';

class FeatureRegistryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FeatureRegistryError';
  }
}

/**
 * @param {string} modulesDir @param {string} moduleSlug
 * @param {string} [dirname] - the folder name to use instead of `features` (default). Generalized
 *   for the NDC Core Service layer's shared-scope entities, which register through this same file
 *   but live under `shared/` rather than `features/` (module_architecture.md, NDC section). Every
 *   existing caller omits this and gets byte-identical `features/` behavior.
 * @returns {string}
 */
function featuresDir(modulesDir, moduleSlug, dirname = FEATURES_DIRNAME) {
  return path.join(modulesDir, moduleSlug, dirname);
}

/** @param {string} modulesDir @param {string} moduleSlug @param {string} featureSlug @param {string} [dirname] */
function featureDir(modulesDir, moduleSlug, featureSlug, dirname = FEATURES_DIRNAME) {
  return path.join(featuresDir(modulesDir, moduleSlug, dirname), featureSlug);
}

/** @param {string} modulesDir @param {string} moduleSlug @param {string} featureSlug @param {string} [dirname] */
function featureStatePath(modulesDir, moduleSlug, featureSlug, dirname = FEATURES_DIRNAME) {
  return path.join(featureDir(modulesDir, moduleSlug, featureSlug, dirname), FEATURE_STATE_FILENAME);
}

/**
 * A module's registered Features, from the AUTHORITATIVE source.
 *
 * Precedence is module.json over the registry cache, identical to resolveModule()'s rule — and the
 * `|| []` is what makes decision B work: a module entry written before Features existed has no
 * `features` key, and that reads as "none" rather than as an error.
 *
 * @param {string} modulesDir
 * @param {string} moduleSlug
 * @param {object} [registry]
 * @returns {object[]}
 */
function listFeatures(modulesDir, moduleSlug, registry) {
  const reg = registry || readRegistry(modulesDir);
  const state = readModuleState(modulesDir, moduleSlug);
  const entry = findModule(reg, moduleSlug);
  const source = state || entry;
  if (!source) return [];
  return Array.isArray(source.features) ? source.features : [];
}

/**
 * One Feature's entry, or undefined.
 * @param {string} modulesDir
 * @param {string} moduleSlug
 * @param {string} featureSlug
 * @param {object} [registry]
 * @returns {object|undefined}
 */
function findFeature(modulesDir, moduleSlug, featureSlug, registry) {
  return listFeatures(modulesDir, moduleSlug, registry).find((f) => f.slug === featureSlug);
}

/**
 * True when the module exists and holds at least one registered Feature. Used by callers that must
 * distinguish "a CRUD-only module" from "a module with Features", without treating the absence of a
 * `features` key as a problem.
 * @param {string} modulesDir
 * @param {string} moduleSlug
 * @returns {boolean}
 */
function hasFeatures(modulesDir, moduleSlug) {
  return listFeatures(modulesDir, moduleSlug).length > 0;
}

/**
 * Writes a module's `features[]` through BOTH records, module.json first.
 *
 * Order matters for the same reason recordStage()'s does: module.json is authoritative, so if the
 * process dies between the two writes the surviving authoritative file is the NEW one, never a stale
 * one that the cache then contradicts.
 *
 * @param {string} modulesDir
 * @param {string} moduleSlug
 * @param {object[]} features
 * @param {string} timestamp
 */
function persistFeatures(modulesDir, moduleSlug, features, timestamp) {
  const registry = readRegistry(modulesDir);
  const entry = findModule(registry, moduleSlug);
  const state = readModuleState(modulesDir, moduleSlug);
  const base = { ...(entry || {}), ...(state || {}) };
  const updated = { ...base, features, updatedAt: timestamp };

  if (fs.existsSync(path.join(modulesDir, moduleSlug))) {
    writeModuleState(modulesDir, moduleSlug, updated);
  }
  registry.modules = (registry.modules || []).map((m) => (m.slug === moduleSlug ? updated : m));
  writeRegistry(modulesDir, registry);
  return updated;
}

/**
 * Asserts the parent module exists and is usable as a Feature host.
 * @param {string} modulesDir
 * @param {string} moduleSlug
 * @param {object} [registry]
 * @returns {object} the module entry
 */
function requireModule(modulesDir, moduleSlug, registry) {
  const reg = registry || readRegistry(modulesDir);
  const entry = findModule(reg, moduleSlug);
  const state = readModuleState(modulesDir, moduleSlug);
  if (!entry && !state) {
    throw new FeatureRegistryError(
      `No module "${moduleSlug}" is registered, so a Feature cannot be registered under it. ` +
      'A Feature whose parent module does not exist has the module created FIRST (new_us_intake.md §3.2), ' +
      'which is a separate, human-approved step — never a side effect of registering the Feature.'
    );
  }
  return { ...(entry || {}), ...(state || {}) };
}

/**
 * Records a proposed standalone Feature under a module (new_us_intake.md §3).
 *
 * Proposed, never scaffolded — exactly the module rule (§6.4 #4), for the same reason: a folder on
 * disk reads as "this Feature exists", and no Feature exists until a human confirms the intake
 * classification and the proposed structure.
 *
 * @param {string} modulesDir
 * @param {string} moduleSlug
 * @param {{name: string, slug?: string, description?: string, sourceUserStory?: string,
 *          acceptanceCriteriaRef?: string}} feature
 * @param {{now: Date}} opts
 * @returns {{feature: object, created: boolean, module: object}}
 */
function proposeFeature(modulesDir, moduleSlug, feature, opts = {}) {
  const { now } = opts;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new FeatureRegistryError('proposeFeature requires an explicit valid `now` Date.');
  }
  if (!feature || !feature.name) {
    throw new FeatureRegistryError('proposeFeature requires a feature with a `name`.');
  }

  requireModule(modulesDir, moduleSlug);

  const existingFeatures = listFeatures(modulesDir, moduleSlug);
  const derived = feature.slug
    ? assertValidModuleSlug(feature.slug)
    : generateModuleSlug(feature.name);

  // Same identity rule as registerModule(): when the slug is derived from the name, re-proposing the
  // same NAME lands on the same Feature and updates it rather than minting feature-2 and orphaning
  // whatever progress the first one recorded.
  const sameName = feature.slug
    ? null
    : existingFeatures.find((f) => f.slug === derived && f.name === feature.name);
  const slug = (feature.slug || sameName)
    ? derived
    : uniqueModuleSlug(derived, existingFeatures.map((f) => f.slug));

  const existing = existingFeatures.find((f) => f.slug === slug);
  const timestamp = now.toISOString();

  const entry = existing
    ? {
      ...existing,
      name: feature.name,
      description: feature.description ?? existing.description ?? null,
      sourceUserStory: feature.sourceUserStory ?? existing.sourceUserStory ?? null,
      acceptanceCriteriaRef:
        feature.acceptanceCriteriaRef ?? existing.acceptanceCriteriaRef ?? null,
      updatedAt: timestamp,
    }
    : {
      slug,
      name: feature.name,
      description: feature.description ?? null,
      // The User Story this Feature was created from. This is what makes overlap detection possible
      // at intake (new_us_intake.md §5) without re-reading every context document.
      sourceUserStory: feature.sourceUserStory ?? null,
      acceptanceCriteriaRef: feature.acceptanceCriteriaRef ?? null,
      status: 'Proposed',
      createdAt: timestamp,
      updatedAt: timestamp,
      supersededBy: null,
      stages: emptyStages(),
    };

  const features = existing
    ? existingFeatures.map((f) => (f.slug === slug ? entry : f))
    : [...existingFeatures, entry];

  const module = persistFeatures(modulesDir, moduleSlug, features, timestamp);
  return { feature: entry, created: !existing, module };
}

/**
 * Approves proposed Features — the write side of the intake confirmation.
 *
 * `approvedBy` is REQUIRED and never defaulted, matching approveModules(). An approval naming nobody
 * is not an approval, and auto-filling it would let the tooling manufacture the human confirmation
 * that new_us_intake.md §6 exists to wait for.
 *
 * @param {string} modulesDir
 * @param {string} moduleSlug
 * @param {string[]} slugs - empty means every Proposed Feature under this module
 * @param {{now: Date, approvedBy: string}} opts
 * @returns {{approved: object[], module: object}}
 */
function approveFeatures(modulesDir, moduleSlug, slugs = [], opts = {}) {
  const { now, approvedBy } = opts;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new FeatureRegistryError('approveFeatures requires an explicit valid `now` Date.');
  }
  if (approvedBy && String(approvedBy).trim()) assertApproverName(approvedBy, 'Feature approval');
  if (!approvedBy || !String(approvedBy).trim()) {
    throw new FeatureRegistryError(
      'approveFeatures requires `approvedBy` — an approval record with no approver is not an approval.'
    );
  }

  requireModule(modulesDir, moduleSlug);
  const features = listFeatures(modulesDir, moduleSlug);
  const targets = slugs.length
    ? slugs
    : features.filter((f) => f.status === 'Proposed').map((f) => f.slug);

  const timestamp = now.toISOString();
  const approved = [];

  const updatedFeatures = features.map((f) => {
    if (!targets.includes(f.slug) || f.status !== 'Proposed') return f; // F-20: an Active Feature keeps its own approval record
    const next = { ...f, status: 'Active', approvedAt: timestamp, approvedBy, approvals: [...(f.approvals || []), { approvedBy, approvedAt: timestamp }], updatedAt: timestamp };
    approved.push(next);
    return next;
  });

  // Phase 9.2, F-12: a Feature (or a Supplier Feature's shared scope) is approved only under an APPROVED parent.
  {
    // eslint-disable-next-line global-require
    const { readRegistry: readParents } = require('./moduleRegistry');
    const parent = (readParents(modulesDir).modules || []).find((m) => m.slug === moduleSlug);
    if (parent && parent.status !== 'Active') {
      throw new FeatureRegistryError(`Approval refused: the parent "${moduleSlug}" is ${parent.status}, not approved (Active). Approve the parent first.`);
    }
  }
  // Phase 9.2, F-20: a Superseded or Archived Feature is never reactivated by approval.
  for (const slug of targets) {
    const f = features.find((x) => x.slug === slug);
    if (f && f.status !== 'Proposed' && f.status !== 'Active') {
      throw new FeatureRegistryError(`Feature "${slug}" under module "${moduleSlug}" is ${f.status} — approval never reactivates it. Propose a new Feature instead.`);
    }
  }
  for (const slug of targets) {
    if (!features.some((f) => f.slug === slug)) {
      throw new FeatureRegistryError(
        `No Feature "${slug}" is registered under module "${moduleSlug}", so it cannot be approved.`
      );
    }
  }

  const module = persistFeatures(modulesDir, moduleSlug, updatedFeatures, timestamp);
  return { approved, module };
}

/**
 * Records a stage's progress against a FEATURE — never against its parent module (decision A).
 *
 * The separation is the whole point: a Feature reaching `test_design: Approved` is a statement about
 * that Feature, and rolling it up into the module would claim the module's consolidated CRUD suite
 * was approved when nobody designed it.
 *
 * @param {string} modulesDir
 * @param {string} moduleSlug
 * @param {string} featureSlug
 * @param {string} stage
 * @param {{status?: string, artifactPath?: string, lastRun?: string, targetRefAtWrite?: string,
 *          incrementRevision?: boolean}} update
 * @param {{now: Date}} opts
 * @returns {object} the updated Feature entry
 */
function recordFeatureStage(modulesDir, moduleSlug, featureSlug, stage, update = {}, opts = {}) {
  const { now } = opts;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new FeatureRegistryError('recordFeatureStage requires an explicit valid `now` Date.');
  }
  if (!FEATURE_STAGES.includes(stage)) {
    throw new FeatureRegistryError(
      `Unknown feature stage "${stage}". Expected one of: ${FEATURE_STAGES.join(', ')}.`
    );
  }
  if (update.status && !STAGE_STATUSES.includes(update.status)) {
    throw new FeatureRegistryError(
      `Unknown stage status "${update.status}". Expected one of: ${STAGE_STATUSES.join(', ')}.`
    );
  }

  const dirname = opts.dirname || FEATURES_DIRNAME;

  requireModule(modulesDir, moduleSlug);
  const features = listFeatures(modulesDir, moduleSlug);
  const existing = features.find((f) => f.slug === featureSlug);
  if (!existing) {
    throw new FeatureRegistryError(
      `No Feature "${featureSlug}" is registered under module "${moduleSlug}". ` +
      `Run \`cli.js feature list ${moduleSlug}\` to see its registered Features.`
    );
  }

  const stages = { ...emptyStages(), ...(existing.stages || {}) };
  const prior = stages[stage] || emptyStages()[stage];
  const timestamp = now.toISOString();

  stages[stage] = {
    ...prior,
    status: update.status ?? prior.status,
    artifactPath: update.artifactPath ?? prior.artifactPath,
    lastRun: update.lastRun ?? prior.lastRun,
    targetRefAtWrite: update.targetRefAtWrite ?? prior.targetRefAtWrite,
    lastUpdated: timestamp,
    revisionCount: update.incrementRevision === false
      ? prior.revisionCount
      : (prior.revisionCount || 0) + 1,
  };

  const updated = { ...existing, stages, updatedAt: timestamp };
  const updatedFeatures = features.map((f) => (f.slug === featureSlug ? updated : f));
  persistFeatures(modulesDir, moduleSlug, updatedFeatures, timestamp);

  // The Feature's own feature.json, written only when the Feature is actually on disk — the same
  // rule registerModule() applies to module.json for a Proposed module.
  if (fs.existsSync(featureDir(modulesDir, moduleSlug, featureSlug, dirname))) {
    writeJsonAtomic(
      featureStatePath(modulesDir, moduleSlug, featureSlug, dirname),
      { ...updated, module: moduleSlug }
    );
  }

  return updated;
}

/**
 * A Feature's effective state plus which of its stage folders exist on disk.
 * @param {string} modulesDir
 * @param {string} moduleSlug
 * @param {string} featureSlug
 * @param {string} [dirname] - see featuresDir()
 * @returns {object|null}
 */
function resolveFeature(modulesDir, moduleSlug, featureSlug, dirname = FEATURES_DIRNAME) {
  const entry = findFeature(modulesDir, moduleSlug, featureSlug);
  if (!entry) return null;
  const dir = featureDir(modulesDir, moduleSlug, featureSlug, dirname);
  return {
    ...entry,
    module: moduleSlug,
    onDisk: fs.existsSync(dir),
    stagesPresent: FEATURE_STAGES.filter((stage) => {
      try {
        return fs.statSync(path.join(dir, stage)).isDirectory();
      } catch {
        return false;
      }
    }),
  };
}

/**
 * Every registered Feature across every module, flattened — the sweep that intake's existing-scope
 * inspection runs before proposing anything (new_us_intake.md §5).
 * @param {string} modulesDir
 * @returns {Array<object>}
 */
function listAllFeatures(modulesDir) {
  const registry = readRegistry(modulesDir);
  const out = [];
  for (const m of registry.modules || []) {
    for (const f of listFeatures(modulesDir, m.slug, registry)) {
      out.push({ ...f, module: m.slug, moduleName: m.name });
    }
  }
  return out;
}

/**
 * Finds registered scope that may already cover a supplied User Story.
 *
 * Deliberately returns CANDIDATES, never a verdict. Intake rule #9 is explicit that overlap is not
 * decided from a story number alone — the business scope and acceptance criteria have to be compared
 * by a human. So this reports what looked similar and why, and the caller asks.
 *
 * @param {string} modulesDir
 * @param {{userStory?: string, name?: string, moduleSlug?: string}} query
 * @returns {{features: object[], modules: object[]}}
 */
function findScopeOverlap(modulesDir, query = {}) {
  const wantedStory = query.userStory ? normalizeStoryId(query.userStory) : null;
  const wantedName = query.name ? String(query.name).toLowerCase().trim() : null;
  const registry = readRegistry(modulesDir);

  const features = listAllFeatures(modulesDir).filter((f) => {
    const byStory = wantedStory && normalizeStoryId(f.sourceUserStory) === wantedStory;
    const byName = wantedName && String(f.name || '').toLowerCase().trim() === wantedName;
    const bySlug = wantedName && f.slug === generateModuleSlug(wantedName);
    return Boolean(byStory || byName || bySlug);
  });

  const modules = (registry.modules || []).filter((m) => {
    if (query.moduleSlug && m.slug === query.moduleSlug) return true;
    if (!wantedName) return false;
    return m.slug === generateModuleSlug(wantedName)
      || String(m.name || '').toLowerCase().trim() === wantedName;
  });

  return { features, modules };
}

/**
 * Normalizes a story reference for comparison: "US 4222", "US-4222", "us4222" all compare equal.
 * Used ONLY to surface a candidate for human comparison — never to conclude two stories are the same.
 * @param {*} value
 * @returns {string|null}
 */
function normalizeStoryId(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
  return str || null;
}

module.exports = {
  FEATURE_STAGES,
  FEATURE_STATUSES,
  FEATURES_DIRNAME,
  FEATURE_STATE_FILENAME,
  FeatureRegistryError,
  featuresDir,
  featureDir,
  featureStatePath,
  listFeatures,
  listAllFeatures,
  findFeature,
  hasFeatures,
  requireModule,
  proposeFeature,
  approveFeatures,
  recordFeatureStage,
  resolveFeature,
  findScopeOverlap,
  normalizeStoryId,
};

// Concurrency (Phase 9.4): each read-modify-write below holds the registry lock (registryLock.js).
require('./registryLock').lockExports(module.exports, ['proposeFeature', 'approveFeatures', 'recordFeatureStage']);
