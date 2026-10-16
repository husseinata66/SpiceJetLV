// Module Registry — every module that exists, and where each one stands.
//
// See workflows_and_pipelines/pipeline/module_architecture.md §6.
//
// modules.json is BOTH the registry and the active-module pointer, because both are read together
// on every stage invocation and splitting them would create two files that must agree. The pointer
// half lives in activeModule.js; this module owns the registry half plus the shared read/write.
//
// The duplication rule, stated once and enforced here: a module's own module.json is AUTHORITATIVE;
// the copy in modules.json is a DISPLAY CACHE, refreshed on every recordStage(). Where they
// disagree, module.json wins. The registry exists so that listing N modules' state is one file read
// instead of N — the same bargain (and the same precedence) the Active Run pointer already makes
// with metadata/run.json (run_manager.md §5.7).

const fs = require('fs');
const path = require('path');
const { assertApproverName } = require('../run_manager/approverIdentity');

const {
  assertValidModuleSlug,
  generateModuleSlug,
  uniqueModuleSlug,
} = require('./moduleSlug');

const REGISTRY_FILENAME = 'modules.json';
const MODULE_STATE_FILENAME = 'module.json';

// Bumped only on a breaking shape change, so a reader can fail loudly rather than misread an old file.
const REGISTRY_SCHEMA_VERSION = 1;

/**
 * The stages that write into a Module Workspace, in pipeline order (module_architecture.md §5.1).
 * Stages 4M, 5A, and 6A are absent deliberately: their output is execution evidence and belongs to
 * the run that produced it (§9), never to the module.
 */
const MODULE_STAGES = ['context', 'discovery', 'test_design', 'automation', 'healing'];

/**
 * OPTIONAL per-module key holding standalone Features (featureRegistry.js, §5.5).
 *
 * Deliberately optional, and schemaVersion deliberately NOT bumped. An absent `features` key means
 * "this module has no registered standalone Features", which is exactly what every registry written
 * before Features existed means — so nothing migrates and every existing reader keeps working by
 * simply never looking at a key that is not there. A schemaVersion bump would instead make every
 * pre-existing registry unreadable until each reader was updated in lockstep, for no gain.
 *
 * A module's `stages` map always describes its CONSOLIDATED CRUD scope. Feature progress lives in
 * each Feature's own `stages` map and never rolls up (decision A).
 */
const MODULE_OPTIONAL_KEYS = ['features'];

/**
 * Artifact status vocabulary — deliberately IDENTICAL to the Run Manifest's (pipeline.md §7).
 * A parallel vocabulary would mean two answers to "is this approved?", which is the one question
 * every gate depends on.
 */
const STAGE_STATUSES = [
  'Not Started',
  'Draft',
  'Pending Review',
  'Pending Automation Approval',
  'Approved',
  'Rejected',
];

/**
 * A module's own lifecycle status. `Proposed` is the load-bearing one: Stage 1 may propose a module
 * derived from the PRD, but it is never scaffolded until a human approves it at the Stage 1 gate
 * (§6.4 #4). A module is never created silently.
 */
const MODULE_STATUSES = ['Proposed', 'Active', 'Superseded', 'Archived'];

/** What an activation MEANS — so a stage can tell "just Login" from "all five, Login first". */
const ACTIVE_SCOPES = ['single', 'multi', 'full-project'];

class ModuleRegistryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ModuleRegistryError';
  }
}

/**
 * @param {string} modulesDir
 * @returns {string} absolute path to modules.json
 */
function registryPath(modulesDir) {
  return path.join(modulesDir, REGISTRY_FILENAME);
}

/**
 * @param {string} modulesDir
 * @param {string} slug
 * @returns {string} absolute path to that module's own module.json
 */
function moduleStatePath(modulesDir, slug) {
  return path.join(modulesDir, slug, MODULE_STATE_FILENAME);
}

/** An empty registry — the legitimate state of a fresh install, not an error. */
function emptyRegistry() {
  return {
    schemaVersion: REGISTRY_SCHEMA_VERSION,
    derivedFrom: null,
    approvedAt: null,
    approvedBy: null,
    activeModules: [],
    activeScope: null,
    // True when the active selection happens to cover every approved module. REPORTED, never acted
    // on: `full-project` is an explicit intent (`use --all`), because it changes what Stage 5A
    // executes. See activeModule.js's deriveActiveScope for the full reasoning.
    spansEveryModule: false,
    // The optional standalone-Feature pointer (module_architecture.md §5.5). `null` means
    // consolidated module/CRUD scope, which is what EVERY registry written before Features existed
    // means — so an absent key reads correctly with no migration (decision B).
    activeFeature: null,
    previousActiveFeature: null,
    switchedAt: null,
    setBy: null,
    previousActiveModules: [],
    modules: [],
  };
}

/** Every stage slot, all `Not Started` — what a newly-registered module starts from. */
function emptyStages() {
  const stages = {};
  for (const stage of MODULE_STAGES) {
    stages[stage] = {
      status: 'Not Started',
      artifactPath: null,
      lastRun: null,
      lastUpdated: null,
      revisionCount: 0,
      targetRefAtWrite: null,
    };
  }
  return stages;
}

/**
 * Writes JSON atomically: temp file then rename. Rename is atomic on POSIX and Windows within one
 * directory, so a concurrent reader sees either the old file or the new one, never a half-written
 * one. Same reasoning as activeRun.js's writeActiveRun().
 * @param {string} file
 * @param {object} data
 */
function writeJsonAtomic(file, data) {
  // A uniquely named temp file plus the Windows rename retry (Phase 9.3, F-26): a fixed temp name let two
  // concurrent writers share one file, and the second rename failed (EPERM).
  // eslint-disable-next-line global-require
  require('../run_manager/atomicFile').writeJsonAtomic(file, data);
}

/**
 * Reads modules.json. Returns an empty registry when the file is absent — a fresh install has no
 * modules yet, and that is a state, not a failure. A malformed or too-new file DOES throw: silently
 * treating it as empty would lose every module on the next write.
 * @param {string} modulesDir
 * @returns {object}
 */
function readRegistry(modulesDir) {
  const file = registryPath(modulesDir);
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return emptyRegistry();
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new ModuleRegistryError(`${REGISTRY_FILENAME} is not valid JSON: ${err.message}`);
  }

  if (parsed.schemaVersion !== undefined && parsed.schemaVersion > REGISTRY_SCHEMA_VERSION) {
    throw new ModuleRegistryError(
      `${REGISTRY_FILENAME} declares schemaVersion ${parsed.schemaVersion}, but this tool ` +
      `understands ${REGISTRY_SCHEMA_VERSION}. Upgrade the platform rather than editing the file.`
    );
  }

  return { ...emptyRegistry(), ...parsed };
}

/**
 * @param {string} modulesDir
 * @param {object} registry
 */
function writeRegistry(modulesDir, registry) {
  writeJsonAtomic(registryPath(modulesDir), registry);
}

/**
 * Reads a module's own module.json — the AUTHORITATIVE record for that module. Returns null when
 * absent, which the callers treat as "fall back to the registry cache", never as "no module".
 * @param {string} modulesDir
 * @param {string} slug
 * @returns {object|null}
 */
function readModuleState(modulesDir, slug) {
  try {
    return JSON.parse(fs.readFileSync(moduleStatePath(modulesDir, slug), 'utf8'));
  } catch {
    return null;
  }
}

/**
 * @param {string} modulesDir
 * @param {string} slug
 * @param {object} state
 */
function writeModuleState(modulesDir, slug, state) {
  writeJsonAtomic(moduleStatePath(modulesDir, slug), state);
}

/**
 * Finds a module's registry entry by slug.
 * @param {object} registry
 * @param {string} slug
 * @returns {object|undefined}
 */
function findModule(registry, slug) {
  return (registry.modules || []).find((m) => m.slug === slug);
}

/** @param {object} registry @returns {string[]} every registered slug */
function listSlugs(registry) {
  return (registry.modules || []).map((m) => m.slug);
}

/**
 * Reads a module's effective state: module.json where it exists, the registry cache otherwise.
 *
 * This is the function that implements the precedence rule, and every caller that needs a module's
 * real state goes through it rather than reading the registry directly.
 *
 * @param {string} modulesDir
 * @param {string} slug
 * @param {object} [registry] - pass an already-read registry to avoid re-reading it per module
 * @returns {object|null}
 */
function resolveModule(modulesDir, slug, registry) {
  const reg = registry || readRegistry(modulesDir);
  const entry = findModule(reg, slug);
  const state = readModuleState(modulesDir, slug);
  if (!entry && !state) return null;
  // module.json wins field-by-field, not wholesale: a registry entry may legitimately carry a field
  // a hand-created module.json omits, and dropping it would lose information for no benefit.
  return { ...(entry || {}), ...(state || {}) };
}

/**
 * Registers a module. Idempotent by slug: re-registering an existing module updates its descriptive
 * fields and leaves its stage progress untouched — re-running Stage 1 must never reset a module's
 * recorded Test Design status back to Not Started.
 *
 * @param {string} modulesDir
 * @param {{slug?: string, name: string, description?: string, status?: string, derivedFromSections?: string[]}} module
 * @param {{now: Date, registry?: object, persist?: boolean}} opts - `now` is required, never
 *        defaulted internally, matching every other tool in this platform.
 * @returns {{registry: object, entry: object, created: boolean}}
 */
function registerModule(modulesDir, module, opts = {}) {
  const { now, persist = true } = opts;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new ModuleRegistryError('registerModule requires an explicit valid `now` Date.');
  }
  if (!module || !module.name) {
    throw new ModuleRegistryError('registerModule requires a module with a `name`.');
  }

  const registry = opts.registry || readRegistry(modulesDir);
  const status = module.status || 'Active';
  if (!MODULE_STATUSES.includes(status)) {
    throw new ModuleRegistryError(
      `Unknown module status "${status}". Expected one of: ${MODULE_STATUSES.join(', ')}.`
    );
  }

  // An explicit slug is validated, never silently normalized: a caller passing "Flight_Search" as a
  // slug expects that folder, and quietly creating "flight-search" instead would surprise them later.
  const derived = module.slug
    ? assertValidModuleSlug(module.slug)
    : generateModuleSlug(module.name);

  // When the slug is derived from the name, the NAME is the module's identity. Stage 1 re-proposes
  // the whole decomposition on every pass, so re-registering "Login" must land on the login module
  // that already exists and update it — never create login-2 and orphan its recorded progress.
  //
  // A *different* name that happens to derive the same slug ("booking" vs. "Booking") is a genuine
  // collision, and takes the deterministic -2 suffix rather than silently absorbing the other
  // module's history.
  const sameName = module.slug
    ? null
    : (registry.modules || []).find((m) => m.slug === derived && m.name === module.name);
  const slug = (module.slug || sameName)
    ? derived
    : uniqueModuleSlug(derived, listSlugs(registry));

  const existing = findModule(registry, slug);
  const timestamp = now.toISOString();

  // `kind`/`integrationLayer` are minimal, explicit passthrough fields — not part of the plain-module
  // shape, but carried through when a caller supplies them so the Supplier Features layer can
  // register a Feature (which reuses this function wholesale, `supplier-features/` as `modulesDir`)
  // with `kind: 'supplier_feature'` and its declared `integrationLayer` on the entry, so it is never
  // mistaken for a plain module.
  //
  // `integrationLayer` records the technical/backend path a Supplier Feature is implemented through
  // (e.g. `'ndc-core-service'`) — deliberately a free-form nullable string, never a fixed enum, so a
  // Feature such as Ancillaries or Upselling is never forced toward NDC Core Service just because it
  // is Supplier-driven. It is METADATA, never hierarchy: the folder tree says nothing about it.
  //
  // Omitted entirely for every existing caller — agency/branch entries gain no keys.
  const entry = existing
    ? {
      ...existing,
      name: module.name,
      description: module.description ?? existing.description ?? null,
      status,
      ...(module.derivedFromSections ? { derivedFromSections: module.derivedFromSections } : {}),
      ...(module.kind !== undefined ? { kind: module.kind } : {}),
      ...(module.integrationLayer !== undefined ? { integrationLayer: module.integrationLayer } : {}),
      updatedAt: timestamp,
    }
    : {
      slug,
      name: module.name,
      description: module.description ?? null,
      status,
      derivedFromSections: module.derivedFromSections ?? [],
      ...(module.kind !== undefined ? { kind: module.kind } : {}),
      ...(module.integrationLayer !== undefined ? { integrationLayer: module.integrationLayer } : {}),
      createdAt: timestamp,
      updatedAt: timestamp,
      supersededBy: null,
      stages: emptyStages(),
    };

  registry.modules = existing
    ? registry.modules.map((m) => (m.slug === slug ? entry : m))
    : [...(registry.modules || []), entry];

  if (persist) {
    writeRegistry(modulesDir, registry);
    // module.json is only written for a module that actually exists on disk. A `Proposed` module has
    // no folder yet (§6.4 #4) — writing its state file would create the folder and thereby scaffold
    // a module no human has approved.
    if (fs.existsSync(path.join(modulesDir, slug))) {
      writeModuleState(modulesDir, slug, entry);
    }
  }

  return { registry, entry, created: !existing };
}

/**
 * Corrects a Supplier Feature's declared `integrationLayer` AFTER it has been approved.
 *
 * WHY THIS EXISTS, AND WHY IT IS THIS NARROW
 *   `integrationLayer` is set at proposal time, but a Feature's backend can be identified (or
 *   corrected) later, and proposeModules() deliberately refuses to touch an entry that is no longer
 *   `Proposed` — re-proposing an Active Feature short-circuits into `alreadyPresent`. Without this
 *   function there is NO supported path to fix the field, and the only alternative would be a
 *   hand-edit of modules.json, which module_architecture.md §6.5 forbids outright.
 *
 *   It is deliberately NOT a general `update(slug, field, value)`. A generic field-setter would be
 *   an unaudited write channel into `stages` — the one part of an entry that must only ever move
 *   through recordStage() — so the mutation surface is exactly one field, named in the function.
 *
 * It changes nothing else: registerModule() is idempotent by slug and spreads the existing entry
 * first, so `stages`, `createdAt`, `approvedAt`/`approvedBy`, `supersededBy`, `features[]`, and
 * `suppliers[]` all survive byte-identically. `null` is a legal value (clears the declaration).
 *
 * @param {string} modulesDir
 * @param {string} slug
 * @param {string|null} integrationLayer
 * @param {{now: Date}} opts
 * @returns {object} the updated entry
 */
function setIntegrationLayer(modulesDir, slug, integrationLayer, opts = {}) {
  const { now } = opts;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new ModuleRegistryError('setIntegrationLayer requires an explicit valid `now` Date.');
  }
  if (integrationLayer !== null && typeof integrationLayer !== 'string') {
    throw new ModuleRegistryError(
      'setIntegrationLayer requires a string integration layer, or null to clear it.'
    );
  }

  const current = resolveModule(modulesDir, slug);
  if (!current) {
    throw new ModuleRegistryError(
      `No Feature "${slug}" is registered, so its integration layer cannot be set.`
    );
  }

  const { entry } = registerModule(modulesDir, {
    slug,
    name: current.name,
    description: current.description ?? null,
    status: current.status,
    integrationLayer,
  }, { now });
  return entry;
}

/**
 * Records a stage's progress against a module — the ONLY sanctioned way a stage updates the
 * registry. A stage never hand-edits modules.json (§6.5 #3).
 *
 * Writes module.json first, then refreshes the registry cache from it, so the authoritative file is
 * never the stale one if the process dies between the two writes.
 *
 * @param {string} modulesDir
 * @param {string} slug
 * @param {string} stage - one of MODULE_STAGES
 * @param {{status: string, artifactPath?: string, lastRun?: string, targetRefAtWrite?: string,
 *          incrementRevision?: boolean}} update
 * @param {{now: Date}} opts
 * @returns {object} the module's updated authoritative state
 */
function recordStage(modulesDir, slug, stage, update = {}, opts = {}) {
  const { now } = opts;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new ModuleRegistryError('recordStage requires an explicit valid `now` Date.');
  }
  if (!MODULE_STAGES.includes(stage)) {
    throw new ModuleRegistryError(
      `Unknown module stage "${stage}". Expected one of: ${MODULE_STAGES.join(', ')}. ` +
      'Execution stages (manual_execution, execution, reporting) write to the run folder, not the module.'
    );
  }
  if (update.status && !STAGE_STATUSES.includes(update.status)) {
    throw new ModuleRegistryError(
      `Unknown stage status "${update.status}". Expected one of: ${STAGE_STATUSES.join(', ')}.`
    );
  }

  const registry = readRegistry(modulesDir);
  const entry = findModule(registry, slug);
  const state = readModuleState(modulesDir, slug);
  if (!entry && !state) {
    throw new ModuleRegistryError(
      `No module "${slug}" is registered. Run \`cli.js list\` to see registered modules.`
    );
  }

  const base = { ...(entry || {}), ...(state || {}) };
  const stages = { ...emptyStages(), ...(base.stages || {}) };
  const prior = stages[stage] || emptyStages()[stage];
  const timestamp = now.toISOString();

  stages[stage] = {
    ...prior,
    status: update.status ?? prior.status,
    artifactPath: update.artifactPath ?? prior.artifactPath,
    lastRun: update.lastRun ?? prior.lastRun,
    targetRefAtWrite: update.targetRefAtWrite ?? prior.targetRefAtWrite,
    lastUpdated: timestamp,
    // The in-place-edit equivalent of a version number (pipeline.md §7): the artifact keeps one
    // path forever, so "how many times has it been revised" is the only version signal there is.
    revisionCount: update.incrementRevision === false
      ? prior.revisionCount
      : (prior.revisionCount || 0) + 1,
  };

  const updated = { ...base, stages, updatedAt: timestamp };

  writeModuleState(modulesDir, slug, updated);
  registry.modules = (registry.modules || []).map((m) => (m.slug === slug ? updated : m));
  writeRegistry(modulesDir, registry);

  return updated;
}

/**
 * Records Stage 1's proposed module decomposition (§6.4).
 *
 * Every proposal lands with `status: Proposed` and is NOT scaffolded — a human approves it at Stage
 * 1's existing Human Review gate, and approveModules() then activates and scaffolds. This is what
 * makes "a module is never created silently" true mechanically rather than by convention.
 *
 * Re-proposing is safe and expected: a later run whose PRD has changed re-proposes, and modules
 * already Active are left exactly as they are rather than being reset to Proposed.
 *
 * @param {string} modulesDir
 * @param {Array<{name: string, description?: string, derivedFromSections?: string[]}>} proposals
 * @param {{now: Date, prdPath?: string, prdSha256?: string}} opts
 * @returns {{registry: object, proposed: object[], alreadyPresent: object[]}}
 */
function proposeModules(modulesDir, proposals = [], opts = {}) {
  const { now, prdPath, prdSha256 } = opts;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new ModuleRegistryError('proposeModules requires an explicit valid `now` Date.');
  }

  let registry = readRegistry(modulesDir);
  const proposed = [];
  const alreadyPresent = [];

  for (const proposal of proposals) {
    const slug = proposal.slug
      ? assertValidModuleSlug(proposal.slug)
      : generateModuleSlug(proposal.name);
    const existing = findModule(registry, slug);

    if (existing && existing.status !== 'Proposed') {
      alreadyPresent.push(existing);
      continue;
    }

    const result = registerModule(
      modulesDir,
      { ...proposal, slug, status: 'Proposed' },
      { now, registry, persist: false }
    );
    registry = result.registry;
    proposed.push(result.entry);
  }

  registry.derivedFrom = prdPath
    ? { prdPath, prdSha256: prdSha256 ?? null, capturedAt: now.toISOString() }
    : registry.derivedFrom;

  writeRegistry(modulesDir, registry);
  return { registry, proposed, alreadyPresent };
}

/**
 * Approves proposed modules — the write side of Stage 1's Human Review gate (§6.4 #3).
 *
 * `approvedBy` is REQUIRED and never defaulted. An approval record naming nobody is not an approval,
 * and auto-filling it would let the pipeline manufacture the human decision it is supposed to wait
 * for — the same reasoning that forbids a fabricated Automation Approval in pipeline.md §12.6.
 *
 * @param {string} modulesDir
 * @param {string[]} slugs - which proposed modules to approve; empty means every Proposed module
 * @param {{now: Date, approvedBy: string}} opts
 * @returns {{registry: object, approved: object[]}}
 */
function approveModules(modulesDir, slugs = [], opts = {}) {
  const { now, approvedBy } = opts;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new ModuleRegistryError('approveModules requires an explicit valid `now` Date.');
  }
  if (approvedBy && String(approvedBy).trim()) assertApproverName(approvedBy, 'Module approval');
  if (!approvedBy || !String(approvedBy).trim()) {
    throw new ModuleRegistryError(
      'approveModules requires `approvedBy` — an approval record with no approver is not an approval.'
    );
  }

  const registry = readRegistry(modulesDir);
  const targets = slugs.length
    ? slugs
    : (registry.modules || []).filter((m) => m.status === 'Proposed').map((m) => m.slug);

  const approved = [];
  const timestamp = now.toISOString();

  // Phase 9.2, F-20: approval moves a Proposed module to Active — nothing else. A Superseded or Archived
  // module is never reactivated by a generic approval (module_architecture.md: refused activation); an
  // Active one is already approved and is left exactly as it is. Every check runs before anything changes.
  for (const slug of targets) {
    const entry = findModule(registry, slug);
    if (!entry) {
      throw new ModuleRegistryError(`No module "${slug}" is registered, so it cannot be approved.`);
    }
    if (entry.status !== 'Proposed' && entry.status !== 'Active') {
      throw new ModuleRegistryError(
        `Module "${slug}" is ${entry.status} — approval never reactivates a ${entry.status} module` +
        `${entry.supersededBy ? ` (superseded by ${entry.supersededBy})` : ''}. Propose a new module instead.`
      );
    }
  }
  for (const slug of targets) {
    const entry = findModule(registry, slug);
    if (entry.status === 'Active') continue;
    entry.status = 'Active';
    // Per-entity provenance (F-20): who approved THIS module, kept on the module itself.
    entry.approvedBy = approvedBy;
    entry.approvedAt = timestamp;
    entry.approvals = [...(entry.approvals || []), { approvedBy, approvedAt: timestamp }];
    entry.updatedAt = timestamp;
    approved.push(entry);
  }

  registry.approvedAt = timestamp;
  registry.approvedBy = approvedBy;
  writeRegistry(modulesDir, registry);

  return { registry, approved };
}

/**
 * Marks a module superseded by another. A module is never renamed or deleted on disk — other
 * artifacts cite its path, exactly as they cite a legacy run folder's name (run_manager.md §5.6).
 * Both stay readable; only the claim about which is current changes.
 * `bySlug` and `opts.externalSupersededBy` are mutually exclusive: a module is superseded either by
 * a sibling in THIS SAME `modules/` registry (`bySlug`, resolved and validated here), or by an
 * entity that lives outside it entirely — e.g. a module promoted into the Supplier Features layer's
 * `supplier-features/` tree (`opts.externalSupersededBy`, an opaque repo-relative reference string
 * this registry cannot resolve or validate, because it does not own that path).
 *
 * @param {string} modulesDir
 * @param {string} slug
 * @param {string|null} bySlug - a sibling module slug in this registry, or `null` when superseded
 *   externally (pass `opts.externalSupersededBy` in that case)
 * @param {{now: Date, externalSupersededBy?: string}} opts
 * @returns {object} the registry
 */
function supersedeModule(modulesDir, slug, bySlug, opts = {}) {
  const { now, externalSupersededBy } = opts;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new ModuleRegistryError('supersedeModule requires an explicit valid `now` Date.');
  }
  if (!bySlug && !externalSupersededBy) {
    throw new ModuleRegistryError(
      'supersedeModule requires either `bySlug` (a sibling module in this registry) or ' +
      '`opts.externalSupersededBy` (a reference string for an entity outside this registry).'
    );
  }
  const registry = readRegistry(modulesDir);
  const entry = findModule(registry, slug);
  if (!entry) throw new ModuleRegistryError(`No module "${slug}" is registered.`);
  if (bySlug && !findModule(registry, bySlug)) {
    throw new ModuleRegistryError(`No module "${bySlug}" is registered to supersede "${slug}".`);
  }

  entry.status = 'Superseded';
  entry.supersededBy = bySlug || null;
  // Kept as a SEPARATE field from `supersededBy` rather than overloading it with a foreign-registry
  // path: every existing reader of `supersededBy` assumes a sibling slug it can look up in THIS
  // registry, and a reference string in that field would silently break that assumption.
  entry.supersededByExternal = externalSupersededBy || null;
  entry.updatedAt = now.toISOString();

  writeRegistry(modulesDir, registry);
  if (fs.existsSync(path.join(modulesDir, slug))) writeModuleState(modulesDir, slug, entry);
  return registry;
}

/**
 * Every module with its effective state and which stage folders actually exist on disk.
 *
 * `stagesPresent` is deliberately computed from the filesystem rather than read from the status
 * fields: it answers "where did this module actually get to?" without trusting a field that may be
 * stale, exactly as detectStagesPresent() does for runs (run_manager.md §5.7).
 *
 * @param {string} modulesDir
 * @returns {Array<object>}
 */
function listModules(modulesDir) {
  const registry = readRegistry(modulesDir);
  return (registry.modules || []).map((entry) => {
    const resolved = resolveModule(modulesDir, entry.slug, registry) || entry;
    return {
      ...resolved,
      stagesPresent: MODULE_STAGES.filter((stage) => {
        try {
          return fs.statSync(path.join(modulesDir, entry.slug, stage)).isDirectory();
        } catch {
          return false;
        }
      }),
      onDisk: fs.existsSync(path.join(modulesDir, entry.slug)),
    };
  });
}

module.exports = {
  REGISTRY_FILENAME,
  MODULE_STATE_FILENAME,
  REGISTRY_SCHEMA_VERSION,
  MODULE_STAGES,
  MODULE_OPTIONAL_KEYS,
  STAGE_STATUSES,
  MODULE_STATUSES,
  ACTIVE_SCOPES,
  ModuleRegistryError,
  registryPath,
  moduleStatePath,
  emptyRegistry,
  emptyStages,
  writeJsonAtomic,
  readRegistry,
  writeRegistry,
  readModuleState,
  writeModuleState,
  findModule,
  listSlugs,
  resolveModule,
  registerModule,
  setIntegrationLayer,
  recordStage,
  proposeModules,
  approveModules,
  supersedeModule,
  listModules,
};

// Concurrency (Phase 9.4): each read-modify-write below holds the registry lock (registryLock.js).
require('./registryLock').lockExports(module.exports, ['registerModule', 'proposeModules', 'approveModules', 'recordStage', 'supersedeModule']);
