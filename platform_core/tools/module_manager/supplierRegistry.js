// Supplier Registry — Suppliers (Travelport NDC, Sabre NDC, ...) registered under a Supplier Feature.
//
// See workflows_and_pipelines/pipeline/module_architecture.md, Supplier Features section.
//
// WHAT A SUPPLIER IS, AND WHY THIS IS ITS OWN FILE
//   Supplier Features → Feature (Import Booked PNR, Refund, Ancillaries, ...) → Supplier is a
//   supplier-specific scope under one Feature. It is DELIBERATELY never registered as a "feature" —
//   a Supplier is an independent entity with its own file (supplier.json), its own registry key
//   (`suppliers`), and its own error class (SupplierRegistryError). It structurally resembles
//   featureRegistry.js (same proposal → approval → stage-recording lifecycle, same stage vocabulary)
//   but does not call into it or reuse its `features[]` array — the two must never be mistaken for
//   each other, and reusing featureRegistry.js's shape by inheritance rather than by calling it is
//   what keeps that true.
//
// A Feature is itself implemented by REUSING moduleRegistry.js as-is (supplier-features/ passed as
// its `modulesDir`, the Feature slug as its module slug). This file therefore reads/writes the
// Feature's own module.json and its parent modules.json cache — via moduleRegistry.js's exported
// primitives, exactly as featureRegistry.js does for a plain module — but stores everything under
// the `suppliers` key instead of `features`, and every entity carries an explicit `feature` field
// rather than a bare `module` back-reference.
//
// SUPPLIER IDENTITY IS (feature, slug). "Travelport NDC" under Import Booked PNR and "Travelport
// NDC" under Ancillaries are two unrelated entities: separate folder, separate supplier.json,
// separate stage tracking, never merged because the name matches.
//
// STAGE INDEPENDENCE: a Supplier's `stages` map is its own, exactly as decision A requires for a
// standalone Feature — recordSupplierStage() never touches the parent Feature's (module's) stages.

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

/** Same stage vocabulary as a Feature/module — one answer to "is Stage 3 approved?" everywhere. */
const SUPPLIER_STAGES = MODULE_STAGES;

/** Mirrors FEATURE_STATUSES/MODULE_STATUSES — proposed, approved, superseded on the same terms. */
const SUPPLIER_STATUSES = ['Proposed', 'Active', 'Superseded', 'Archived'];

/**
 * What a Supplier can do, asked at intake (new_us_intake.md §12.2) and read by the capability gate
 * (platform_core/tools/capability_gate). Suppliers differ — flynas has no Hold — so a test case that
 * needs a capability the Supplier lacks is excluded, not run and failed.
 *
 * BOOKING ITSELF IS NOT LISTED. Every Supplier can book — that is what a Supplier is for (human
 * decision, Mohanad Dawood, 2026-09-28). A Supplier that could not book would not be registered, so a
 * `book` capability could only ever read `Supported` and would gate nothing. Whether a Book *button*
 * appears on a given screen is a UI question, not a Supplier capability.
 */
const SUPPLIER_CAPABILITIES = [
  { key: 'hold', label: 'Hold', flag: 'hold' },
  { key: 'payAfterHold', label: 'Pay after Hold', flag: 'pay-after-hold' },
  { key: 'meal', label: 'Meal', flag: 'meal' },
  { key: 'baggage', label: 'Baggage', flag: 'baggage' },
  { key: 'seat', label: 'Seat', flag: 'seat' },
  { key: 'bundle', label: 'Bundle', flag: 'bundle' },
];
const CAPABILITY_VALUES = ['Supported', 'Not Supported', 'Unknown'];

const SUPPLIERS_DIRNAME = 'suppliers';
const SUPPLIER_STATE_FILENAME = 'supplier.json';

class SupplierRegistryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SupplierRegistryError';
  }
}

/** @param {string} featureModulesDir - services/<service>/, passed as moduleRegistry's modulesDir */
/** @param {string} featureSlug */
function suppliersDir(featureModulesDir, featureSlug) {
  return path.join(featureModulesDir, featureSlug, SUPPLIERS_DIRNAME);
}

function supplierDir(featureModulesDir, featureSlug, supplierSlug) {
  return path.join(suppliersDir(featureModulesDir, featureSlug), supplierSlug);
}

function supplierStatePath(featureModulesDir, featureSlug, supplierSlug) {
  return path.join(supplierDir(featureModulesDir, featureSlug, supplierSlug), SUPPLIER_STATE_FILENAME);
}

/**
 * A Feature's registered Suppliers, from the AUTHORITATIVE source (the Feature's own module.json,
 * falling back to the registry cache — same precedence as resolveModule()/listFeatures()).
 * @param {string} featureModulesDir @param {string} featureSlug @param {object} [registry]
 * @returns {object[]}
 */
function listSuppliers(featureModulesDir, featureSlug, registry) {
  const reg = registry || readRegistry(featureModulesDir);
  const state = readModuleState(featureModulesDir, featureSlug);
  const entry = findModule(reg, featureSlug);
  const source = state || entry;
  if (!source) return [];
  return Array.isArray(source.suppliers) ? source.suppliers : [];
}

/** @returns {object|undefined} */
function findSupplier(featureModulesDir, featureSlug, supplierSlug, registry) {
  return listSuppliers(featureModulesDir, featureSlug, registry).find((s) => s.slug === supplierSlug);
}

/** @returns {boolean} */
function hasSuppliers(featureModulesDir, featureSlug) {
  return listSuppliers(featureModulesDir, featureSlug).length > 0;
}

/**
 * Writes a Feature's `suppliers[]` through both the Feature's own module.json (authoritative) and
 * the parent modules.json cache — same ordering guarantee as featureRegistry.js's persistFeatures().
 */
function persistSuppliers(featureModulesDir, featureSlug, suppliers, timestamp) {
  const registry = readRegistry(featureModulesDir);
  const entry = findModule(registry, featureSlug);
  const state = readModuleState(featureModulesDir, featureSlug);
  const base = { ...(entry || {}), ...(state || {}) };
  const updated = { ...base, suppliers, updatedAt: timestamp };

  if (fs.existsSync(path.join(featureModulesDir, featureSlug))) {
    writeModuleState(featureModulesDir, featureSlug, updated);
  }
  registry.modules = (registry.modules || []).map((m) => (m.slug === featureSlug ? updated : m));
  writeRegistry(featureModulesDir, registry);
  return updated;
}

/**
 * Asserts the parent Feature (registered as a "module" in featureModulesDir) exists and is usable
 * as a Supplier host.
 * @returns {object} the Feature's effective state
 */
function requireFeature(featureModulesDir, featureSlug, registry) {
  const reg = registry || readRegistry(featureModulesDir);
  const entry = findModule(reg, featureSlug);
  const state = readModuleState(featureModulesDir, featureSlug);
  if (!entry && !state) {
    throw new SupplierRegistryError(
      `No Feature "${featureSlug}" is registered, so a Supplier cannot be registered under it. ` +
      'Propose and approve the Feature first (`cli.js supplier-feature feature propose/approve`) — a separate, ' +
      'human-approved step, never a side effect of registering the Supplier.'
    );
  }
  return { ...(entry || {}), ...(state || {}) };
}

/**
 * requireFeature, and the Feature must be APPROVED (Active) — Phase 9.2, F-12. A Supplier is approved or
 * scaffolded only under an approved Supplier Feature; a still-Proposed (or Superseded/Archived) Feature has
 * no approved scope to put a Supplier in.
 */
function requireApprovedFeature(featureModulesDir, featureSlug, what) {
  const f = requireFeature(featureModulesDir, featureSlug);
  if (f.status !== 'Active') {
    throw new SupplierRegistryError(
      `${what} refused: Supplier Feature "${featureSlug}" is ${f.status || 'not approved'}, not approved (Active). ` +
      'Approve the Feature first (`cli.js supplier-feature feature approve`) — a separate, human-approved step.'
    );
  }
  return f;
}

/**
 * Registers a proposed Supplier under a Feature. Proposed, never scaffolded — same rule as every
 * other entity in this platform: a folder on disk reads as approval.
 *
 * @param {string} featureModulesDir
 * @param {string} featureSlug
 * @param {{name: string, slug?: string, description?: string}} supplier
 * @param {{now: Date}} opts
 * @returns {{supplier: object, created: boolean, feature: object}}
 */
function proposeSupplier(featureModulesDir, featureSlug, supplier, opts = {}) {
  const { now } = opts;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new SupplierRegistryError('proposeSupplier requires an explicit valid `now` Date.');
  }
  if (!supplier || !supplier.name) {
    throw new SupplierRegistryError('proposeSupplier requires a supplier with a `name`.');
  }

  requireFeature(featureModulesDir, featureSlug);

  const existingSuppliers = listSuppliers(featureModulesDir, featureSlug);
  const derived = supplier.slug ? assertValidModuleSlug(supplier.slug) : generateModuleSlug(supplier.name);
  const sameName = supplier.slug
    ? null
    : existingSuppliers.find((s) => s.slug === derived && s.name === supplier.name);
  const slug = (supplier.slug || sameName)
    ? derived
    : uniqueModuleSlug(derived, existingSuppliers.map((s) => s.slug));

  const existing = existingSuppliers.find((s) => s.slug === slug);
  const timestamp = now.toISOString();

  const entry = existing
    ? {
      ...existing,
      name: supplier.name,
      description: supplier.description ?? existing.description ?? null,
      updatedAt: timestamp,
    }
    : {
      slug,
      name: supplier.name,
      description: supplier.description ?? null,
      // `feature` alone is what makes "the same Supplier name under two Features is two independent
      // entities" true — the Supplier's identity is (feature, slug), and always was. There is no
      // `service` field: the Service tier that once sat above the Feature no longer exists, and a
      // Feature's integration layer is the FEATURE's metadata, never copied down onto its Suppliers.
      feature: featureSlug,
      status: 'Proposed',
      createdAt: timestamp,
      updatedAt: timestamp,
      supersededBy: null,
      stages: emptyStages(),
    };

  const suppliers = existing
    ? existingSuppliers.map((s) => (s.slug === slug ? entry : s))
    : [...existingSuppliers, entry];

  const feature = persistSuppliers(featureModulesDir, featureSlug, suppliers, timestamp);
  return { supplier: entry, created: !existing, feature };
}

/**
 * Approves proposed Suppliers. `approvedBy` REQUIRED, never defaulted.
 * @param {string} featureModulesDir @param {string} featureSlug @param {string[]} slugs
 * @param {{now: Date, approvedBy: string}} opts
 * @returns {{approved: object[], feature: object}}
 */
function approveSuppliers(featureModulesDir, featureSlug, slugs = [], opts = {}) {
  requireApprovedFeature(featureModulesDir, featureSlug, 'Supplier approval');
  const { now, approvedBy } = opts;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new SupplierRegistryError('approveSuppliers requires an explicit valid `now` Date.');
  }
  if (approvedBy && String(approvedBy).trim()) assertApproverName(approvedBy, 'Supplier Features approval');
  if (!approvedBy || !String(approvedBy).trim()) {
    throw new SupplierRegistryError(
      'approveSuppliers requires `approvedBy` — an approval record with no approver is not an approval.'
    );
  }

  requireFeature(featureModulesDir, featureSlug);
  const suppliers = listSuppliers(featureModulesDir, featureSlug);
  const targets = slugs.length ? slugs : suppliers.filter((s) => s.status === 'Proposed').map((s) => s.slug);

  const timestamp = now.toISOString();
  const approved = [];
  const updatedSuppliers = suppliers.map((s) => {
    if (!targets.includes(s.slug)) return s;
    const next = { ...s, status: 'Active', approvedAt: timestamp, approvedBy, updatedAt: timestamp };
    approved.push(next);
    return next;
  });

  for (const slug of targets) {
    if (!suppliers.some((s) => s.slug === slug)) {
      throw new SupplierRegistryError(
        `No Supplier "${slug}" is registered under Feature "${featureSlug}", so it cannot be approved.`
      );
    }
  }

  const feature = persistSuppliers(featureModulesDir, featureSlug, updatedSuppliers, timestamp);
  return { approved, feature };
}

/**
 * Records a stage's progress against a SUPPLIER — never against the parent Feature.
 * @param {string} featureModulesDir @param {string} featureSlug @param {string} supplierSlug
 * @param {string} stage
 * @param {{status?: string, artifactPath?: string, lastRun?: string, targetRefAtWrite?: string,
 *          incrementRevision?: boolean}} update
 * @param {{now: Date}} opts
 * @returns {object} the updated Supplier entry
 */
function recordSupplierStage(featureModulesDir, featureSlug, supplierSlug, stage, update = {}, opts = {}) {
  const { now } = opts;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new SupplierRegistryError('recordSupplierStage requires an explicit valid `now` Date.');
  }
  if (!SUPPLIER_STAGES.includes(stage)) {
    throw new SupplierRegistryError(
      `Unknown supplier stage "${stage}". Expected one of: ${SUPPLIER_STAGES.join(', ')}.`
    );
  }
  if (update.status && !STAGE_STATUSES.includes(update.status)) {
    throw new SupplierRegistryError(
      `Unknown stage status "${update.status}". Expected one of: ${STAGE_STATUSES.join(', ')}.`
    );
  }

  requireFeature(featureModulesDir, featureSlug);
  const suppliers = listSuppliers(featureModulesDir, featureSlug);
  const existing = suppliers.find((s) => s.slug === supplierSlug);
  if (!existing) {
    throw new SupplierRegistryError(
      `No Supplier "${supplierSlug}" is registered under Feature "${featureSlug}". ` +
      `Run \`cli.js supplier-feature supplier list ${featureSlug}\` to see its registered Suppliers.`
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
    revisionCount: update.incrementRevision === false ? prior.revisionCount : (prior.revisionCount || 0) + 1,
  };

  const updated = { ...existing, stages, updatedAt: timestamp };
  const updatedSuppliers = suppliers.map((s) => (s.slug === supplierSlug ? updated : s));
  persistSuppliers(featureModulesDir, featureSlug, updatedSuppliers, timestamp);

  if (fs.existsSync(supplierDir(featureModulesDir, featureSlug, supplierSlug))) {
    writeJsonAtomic(supplierStatePath(featureModulesDir, featureSlug, supplierSlug), updated);
  }

  return updated;
}

/** `yes`/`no`/`unknown` (CLI shorthand) or the canonical value, case-insensitively. */
function normalizeCapabilityValue(raw) {
  const text = String(raw ?? '').trim().toLowerCase();
  const alias = { yes: 'Supported', y: 'Supported', no: 'Not Supported', n: 'Not Supported' };
  if (alias[text]) return alias[text];
  return CAPABILITY_VALUES.find((v) => v.toLowerCase() === text) || null;
}

/** Shared write path for capabilities and rules: update the entry, the registry, and supplier.json. */
function updateSupplierEntry(featureModulesDir, featureSlug, supplierSlug, mutate, now) {
  requireFeature(featureModulesDir, featureSlug);
  const suppliers = listSuppliers(featureModulesDir, featureSlug);
  const existing = suppliers.find((s) => s.slug === supplierSlug);
  if (!existing) {
    throw new SupplierRegistryError(
      `No Supplier "${supplierSlug}" is registered under Feature "${featureSlug}". ` +
      `Run \`cli.js supplier-feature supplier list ${featureSlug}\` to see its registered Suppliers.`
    );
  }
  const timestamp = now.toISOString();
  const updated = { ...mutate(existing, timestamp), updatedAt: timestamp };
  persistSuppliers(
    featureModulesDir, featureSlug, suppliers.map((s) => (s.slug === supplierSlug ? updated : s)), timestamp
  );
  if (fs.existsSync(supplierDir(featureModulesDir, featureSlug, supplierSlug))) {
    writeJsonAtomic(supplierStatePath(featureModulesDir, featureSlug, supplierSlug), updated);
  }
  return updated;
}

/**
 * Records what the Supplier supports. Merges over earlier answers; every change is appended to
 * `capabilityHistory`, never overwritten. A capability never answered reads as `Unknown`.
 * @param {Record<string,string>} values keyed by SUPPLIER_CAPABILITIES[].key
 * @param {{now: Date, setBy: string}} opts
 */
function setSupplierCapabilities(featureModulesDir, featureSlug, supplierSlug, values = {}, opts = {}) {
  const { now, setBy } = opts;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new SupplierRegistryError('setSupplierCapabilities requires an explicit valid `now` Date.');
  }
  if (setBy && String(setBy).trim()) assertApproverName(setBy, 'Supplier answer');
  if (!setBy || !String(setBy).trim()) {
    throw new SupplierRegistryError('setSupplierCapabilities requires `setBy` — who gave the answer.');
  }
  const known = new Set(SUPPLIER_CAPABILITIES.map((c) => c.key));
  const changes = {};
  for (const [key, raw] of Object.entries(values)) {
    if (!known.has(key)) {
      throw new SupplierRegistryError(
        `Unknown capability "${key}". Expected one of: ${[...known].join(', ')}.`
      );
    }
    const value = normalizeCapabilityValue(raw);
    if (!value) {
      throw new SupplierRegistryError(
        `Capability "${key}" is "${raw}" — expected one of: ${CAPABILITY_VALUES.join(', ')} (or yes/no).`
      );
    }
    changes[key] = value;
  }
  if (!Object.keys(changes).length) {
    throw new SupplierRegistryError('No capability values given.');
  }

  return updateSupplierEntry(featureModulesDir, featureSlug, supplierSlug, (existing, timestamp) => {
    const applied = { ...changes };
    // Only known capabilities survive a write: a key retired from the model (`book`, removed
    // 2026-09-28) is dropped here rather than lingering in supplier.json as a value nothing reads.
    const known = emptyCapabilities();
    const prior = Object.fromEntries(
      Object.entries(existing.capabilities || {}).filter(([k]) => k in known)
    );
    const capabilities = { ...known, ...prior, ...applied };

    // Pay after Hold is an action ON a held booking: with no Hold there is nothing to pay for later.
    // Asking for both at once in one command is a contradiction and is refused; otherwise Pay after
    // Hold simply follows Hold down, recorded in the history so the change is visible rather than
    // silent.
    if (capabilities.hold !== 'Supported' && capabilities.payAfterHold === 'Supported') {
      if (applied.payAfterHold === 'Supported') {
        throw new SupplierRegistryError(
          'Pay after Hold cannot be Supported while Hold is not — a booking must be held before it is '
          + 'paid later. Set Hold first, or leave Pay after Hold as Not Supported.'
        );
      }
      capabilities.payAfterHold = 'Not Supported';
      applied.payAfterHold = 'Not Supported';
    }

    const history = Array.isArray(existing.capabilityHistory) ? existing.capabilityHistory : [];
    return {
      ...existing,
      capabilities,
      capabilityHistory: [...history, { at: timestamp, by: String(setBy).trim(), changes: applied }],
    };
  }, now);
}

/**
 * Records which Supplier-specific rules (SupplierChecklist §7c) are confirmed for this Supplier, as
 * short slugs matching the test cases' `Supplier Rule` column. An empty list is a recorded "None".
 * @param {string[]} rules @param {{now: Date, setBy: string}} opts
 */
function setSupplierRules(featureModulesDir, featureSlug, supplierSlug, rules = [], opts = {}) {
  const { now, setBy } = opts;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new SupplierRegistryError('setSupplierRules requires an explicit valid `now` Date.');
  }
  if (setBy && String(setBy).trim()) assertApproverName(setBy, 'Supplier answer');
  if (!setBy || !String(setBy).trim()) {
    throw new SupplierRegistryError('setSupplierRules requires `setBy` — who gave the answer.');
  }
  const cleaned = [...new Set(rules.map((r) => String(r).trim()).filter(Boolean))];
  for (const r of cleaned) assertValidModuleSlug(r);
  return updateSupplierEntry(featureModulesDir, featureSlug, supplierSlug, (existing, timestamp) => ({
    ...existing,
    supplierRules: cleaned,
    supplierRulesSetAt: timestamp,
    supplierRulesSetBy: String(setBy).trim(),
  }), now);
}

/** Every capability `Unknown` — the value before intake has answered. */
function emptyCapabilities() {
  return Object.fromEntries(SUPPLIER_CAPABILITIES.map((c) => [c.key, 'Unknown']));
}

/**
 * A Supplier's effective state plus which stage folders exist on disk.
 * @returns {object|null}
 */
function resolveSupplier(featureModulesDir, featureSlug, supplierSlug) {
  const entry = findSupplier(featureModulesDir, featureSlug, supplierSlug);
  if (!entry) return null;
  const dir = supplierDir(featureModulesDir, featureSlug, supplierSlug);
  return {
    ...entry,
    onDisk: fs.existsSync(dir),
    stagesPresent: SUPPLIER_STAGES.filter((stage) => {
      try {
        return fs.statSync(path.join(dir, stage)).isDirectory();
      } catch {
        return false;
      }
    }),
  };
}

/**
 * Creates a Supplier's folder skeleton and its supplier.json. Idempotent; never overwrites.
 * @param {string} featureModulesDir @param {string} featureSlug @param {string} supplierSlug
 * @param {{now: Date, dryRun?: boolean}} opts
 * @returns {{created: boolean, wrote: string[]}}
 */
function scaffoldSupplier(featureModulesDir, featureSlug, supplierSlug, opts = {}) {
  const { now, dryRun = false } = opts;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new SupplierRegistryError('scaffoldSupplier requires an explicit valid `now` Date.');
  }
  assertValidModuleSlug(featureSlug);
  assertValidModuleSlug(supplierSlug);
  requireApprovedFeature(featureModulesDir, featureSlug, 'Supplier scaffold');

  const dir = supplierDir(featureModulesDir, featureSlug, supplierSlug);
  const exists = fs.existsSync(dir);

  const createDirs = [];
  if (!exists) createDirs.push(dir);
  for (const stage of ['context', 'discovery']) {
    const stageDir = path.join(dir, stage);
    if (!fs.existsSync(stageDir)) createDirs.push(stageDir);
  }
  const stateFile = supplierStatePath(featureModulesDir, featureSlug, supplierSlug);
  const createFiles = fs.existsSync(stateFile) ? [] : [stateFile];

  if (dryRun) return { created: false, wrote: [], plan: { createDirs, createFiles } };

  const entry = findSupplier(featureModulesDir, featureSlug, supplierSlug);
  if (!entry) {
    throw new SupplierRegistryError(
      `No Supplier "${supplierSlug}" is registered under Feature "${featureSlug}". Register it before ` +
      'scaffolding.'
    );
  }
  if (entry.status === 'Proposed') {
    throw new SupplierRegistryError(
      `Supplier "${supplierSlug}" is still Proposed. Approve it before scaffolding — a scaffolded ` +
      'folder reads as an approved Supplier.'
    );
  }

  const wrote = [];
  for (const d of createDirs) {
    fs.mkdirSync(d, { recursive: true });
    wrote.push(d);
  }
  if (!fs.existsSync(stateFile)) {
    writeJsonAtomic(stateFile, entry);
    wrote.push(stateFile);
  }
  return { created: !exists, wrote };
}

/**
 * Every registered Supplier across every Feature under one service — flattened, mirroring
 * listAllFeatures(). Independent Supplier namespaces per Feature: "NDCGal" under Refund is a
 * different Supplier from "NDCGal" under Import Booked PNR.
 * @param {string} featureModulesDir @returns {object[]}
 */
function listAllSuppliers(featureModulesDir) {
  const registry = readRegistry(featureModulesDir);
  const out = [];
  for (const f of registry.modules || []) {
    for (const s of listSuppliers(featureModulesDir, f.slug, registry)) {
      out.push({ ...s, feature: f.slug, featureName: f.name });
    }
  }
  return out;
}

module.exports = {
  SUPPLIER_STAGES,
  SUPPLIER_STATUSES,
  SUPPLIERS_DIRNAME,
  SUPPLIER_STATE_FILENAME,
  SUPPLIER_CAPABILITIES,
  CAPABILITY_VALUES,
  SupplierRegistryError,
  normalizeCapabilityValue,
  emptyCapabilities,
  setSupplierCapabilities,
  setSupplierRules,
  suppliersDir,
  supplierDir,
  supplierStatePath,
  listSuppliers,
  listAllSuppliers,
  findSupplier,
  hasSuppliers,
  requireFeature,
  proposeSupplier,
  approveSuppliers,
  recordSupplierStage,
  resolveSupplier,
  scaffoldSupplier,
};

// Concurrency (Phase 9.4): each read-modify-write below holds the registry lock (registryLock.js).
require('./registryLock').lockExports(module.exports, ['proposeSupplier', 'approveSuppliers', 'recordSupplierStage', 'setSupplierCapabilities', 'setSupplierRules', 'scaffoldSupplier']);
