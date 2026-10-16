// API contract registry — the versions of a scope's API contract, and every human decision about them.
//
// WHERE IT LIVES — beside the scope's Discovery output, because Stage 2 (Explorer) owns discovering what
// the system exposes:   <scope>/discovery/api_contracts/
//     registry.json              every version and decision (written ONLY by this tool, under a lock)
//     versions/<sha256>.json     each version's normalized model — content-addressed, never overwritten
//     reports/                   drift reports (report.js)
// A scope is a module, a module Feature, a Supplier-Feature Feature, a Supplier or a shared scope — the
// same roots the run state model gates (run_manager/stageGate.resolveScopeRoots). No scope is created
// here: the Module Manager creates scopes.
//
// THREE ROLES, never confused:
//   approved   the contract tests are designed against. Recorded only by a named human decision —
//              importing an existing approved specification, or accepting a proposed version.
//   proposed   a contract someone supplied as the next version (a new OpenAPI file, an updated
//              collection). Pending until a named human accepts it (whole, or endpoint by endpoint) or
//              rejects it.
//   observed   captured request/response traffic, from a MOCK or the REAL service. Evidence of
//              behaviour — never a contract, never a proposal, never an expected result. A named human
//              reviews a contradiction it shows (application defect, outdated contract, environment).
//
// Nothing here edits a test case, an Expected Result, an Assertion ID or an approval. Accepting a
// contract change records which approved test cases it reaches; each then needs its own named decision.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { withFileLock, writeJsonAtomic, writeFileAtomic } = require('../run_manager/atomicFile');
const N = require('./normalize');
const D = require('./diff');
const { analyzeContractImpact, caseFingerprint, graphRootsFor } = require('./impact');

const SCHEMA = 'api-contract-registry/1';
const REL_DIR = path.join('discovery', 'api_contracts');
const ROLES = Object.freeze(['approved', 'proposed', 'observed']);
const OBSERVED_DECISIONS = Object.freeze(['application-defect', 'contract-outdated', 'environment-issue', 'accepted-risk', 'conforms']);
const IMPACT_DECISIONS = Object.freeze(['no-change-needed', 'update-required', 'updated', 'retire']);
const RESOLVING_IMPACT = new Set(['no-change-needed', 'updated', 'retire']);
const SERIOUS = new Set(['Breaking', 'Unknown']);
const POLICY_MODES = Object.freeze(['optional', 'required']);
const PROJECT_POLICY = path.join('knowledge_base', 'api_contract_policy.json');
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

class ContractError extends Error {
  constructor(message, code = 'API_CONTRACT') { super(message); this.name = 'ContractError'; this.code = code; }
}
const list = (dir) => { try { return fs.readdirSync(dir); } catch { return []; } };
const toPosix = (p) => p.replace(/\\/g, '/');
function requireText(v, field, why) {
  if (typeof v !== 'string' || !v.trim()) throw new ContractError(`--${field} is required${why ? ` — ${why}` : ''}.`, 'MISSING_FIELD');
  return v.trim();
}
function assertDate(now) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new ContractError('an explicit valid `now` Date is required.', 'INVALID_ARGUMENT');
  return now.toISOString();
}

// ---------------------------------------------------------------------------------------------
// Scopes
// ---------------------------------------------------------------------------------------------

/**
 * A scope from its data-root-relative path: `modules/<m>`, `modules/<m>/features/<f>`,
 * `supplier-features/<F>`, `supplier-features/<F>/suppliers/<S>`, `supplier-features/<F>/shared/<SS>`.
 */
function resolveScope(dataRoot, scopeArg, { mustExist = true } = {}) {
  const rel = toPosix(String(scopeArg || '')).replace(/^\.?\/+|\/+$/g, '').replace(/^platform_core_data\//, '');
  let m; let s;
  if ((m = rel.match(/^modules\/([^/]+)\/features\/([^/]+)$/))) s = { family: 'module', module: m[1], moduleFeature: m[2], label: `${m[1]}/${m[2]}` };
  else if ((m = rel.match(/^modules\/([^/]+)$/))) s = { family: 'module', module: m[1], label: m[1] };
  else if ((m = rel.match(/^supplier-features\/([^/]+)\/suppliers\/([^/]+)$/))) s = { family: 'supplier', feature: m[1], supplier: m[2], label: `${m[1]}/${m[2]}` };
  else if ((m = rel.match(/^supplier-features\/([^/]+)\/shared\/([^/]+)$/))) s = { family: 'shared', feature: m[1], sharedScope: m[2], label: `${m[1]}/shared/${m[2]}` };
  else if ((m = rel.match(/^supplier-features\/([^/]+)$/))) s = { family: 'feature', feature: m[1], label: m[1] };
  else throw new ContractError(`"${scopeArg}" is not a scope. Use modules/<m>[/features/<f>] or supplier-features/<F>[/suppliers/<S> | /shared/<SS>].`, 'UNKNOWN_SCOPE');
  const dir = path.join(dataRoot, rel);
  if (mustExist && !fs.existsSync(dir)) throw new ContractError(`${rel} does not exist. Scopes are created by the Module Manager — none is created here.`, 'SCOPE_NOT_FOUND');
  return { ...s, rel, dir, root: { label: s.label, dir, module: s.module || null } };
}

/** The scope (and, for a Supplier or shared scope, its Feature) whose registries gate a stage root. */
function scopesForRoot(dataRoot, root) {
  const rel = toPosix(path.relative(dataRoot, root.dir));
  const out = [];
  try { out.push(resolveScope(dataRoot, rel, { mustExist: false })); } catch { return out; }
  const m = rel.match(/^supplier-features\/([^/]+)\/(suppliers|shared)\//);
  if (m) out.push(resolveScope(dataRoot, `supplier-features/${m[1]}`, { mustExist: false }));
  return out;
}

const registryFile = (scope) => path.join(scope.dir, REL_DIR, 'registry.json');
const emptyRegistry = (scope) => ({ schema: SCHEMA, scope: scope.rel, versions: [], decisions: [], events: [] });

function readRegistry(scope) {
  const f = registryFile(scope);
  if (!fs.existsSync(f)) return emptyRegistry(scope);
  let reg;
  try { reg = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (err) {
    throw new ContractError(`${toPosix(path.relative(path.dirname(path.dirname(path.dirname(scope.dir))), f))} is unreadable (${err.message}). It is written only by this tool; restore it from version control.`, 'REGISTRY_CORRUPT');
  }
  if (reg.schema !== SCHEMA) throw new ContractError(`${f} is not an ${SCHEMA} registry.`, 'REGISTRY_CORRUPT');
  return reg;
}

function mutate(scope, fn) {
  const f = registryFile(scope);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  return withFileLock(`${f}.lock`, () => {
    const reg = readRegistry(scope);
    const result = fn(reg);
    writeJsonAtomic(f, reg);
    return result;
  });
}

/** Writes a normalized model content-addressed; an existing snapshot is never overwritten. */
function writeSnapshot(dataRoot, scope, model) {
  const sha = N.normalizedFingerprint(model);
  const abs = path.join(scope.dir, REL_DIR, 'versions', `${sha}.json`);
  if (fs.existsSync(abs)) {
    if (N.normalizedFingerprint(JSON.parse(fs.readFileSync(abs, 'utf8'))) !== sha) throw new ContractError(`snapshot ${abs} does not match its name — it was altered.`, 'SNAPSHOT_MISMATCH');
  } else {
    writeFileAtomic(abs, `${JSON.stringify(model, null, 2)}\n`);
  }
  return { sha, rel: toPosix(path.relative(dataRoot, abs)) };
}

function loadModel(dataRoot, version) {
  const abs = path.join(dataRoot, version.snapshot);
  let model;
  try { model = JSON.parse(fs.readFileSync(abs, 'utf8')); } catch {
    throw new ContractError(`${version.id}'s snapshot ${version.snapshot} is missing — the version cannot be read, and nothing is substituted.`, 'SNAPSHOT_MISSING');
  }
  if (N.normalizedFingerprint(model) !== version.normalizedSha256) throw new ContractError(`${version.id}'s snapshot ${version.snapshot} no longer matches its recorded fingerprint.`, 'SNAPSHOT_MISMATCH');
  return model;
}

const activeApproved = (reg, name) => reg.versions.find((v) => v.role === 'approved' && v.name === name && v.status === 'active') || null;
const byId = (reg, id) => {
  const v = reg.versions.find((x) => x.id === id);
  if (!v) throw new ContractError(`${id} is not a version in this scope (${reg.versions.map((x) => x.id).join(', ') || 'none registered'}).`, 'NO_VERSION');
  return v;
};
const EMPTY = Object.freeze({ model: N.MODEL, format: 'normalized', evidence: 'specification', title: null, apiVersion: null, basePath: '', endpoints: {}, components: {}, issues: [] });

/**
 * One endpoint of `from`, imported into `into` with every named schema it reaches (transitively) copied
 * under a namespace (`~CV-n~Name`), so the endpoint keeps the candidate's schemas while every other endpoint
 * keeps the approved ones — a partial acceptance never changes an endpoint it did not accept.
 */
function importEndpoint(into, from, ep, ns) {
  const rename = (n) => `~${ns}~${String(n).replace(/^~[^~]+~/, '')}`;
  const todo = [];
  const rewrite = (v) => {
    if (Array.isArray(v)) return v.map(rewrite);
    if (v && typeof v === 'object') {
      const out = {};
      for (const [k, x] of Object.entries(v)) {
        if (k === '$ref' && typeof x === 'string') { out[k] = rename(x); todo.push(x); } else out[k] = rewrite(x);
      }
      return out;
    }
    return v;
  };
  into.components = into.components || {};
  into.endpoints[ep] = rewrite(from.endpoints[ep]);
  const done = new Set();
  while (todo.length) {
    const n = todo.pop();
    if (done.has(n)) continue;
    done.add(n);
    if ((from.components || {})[n] !== undefined) into.components[rename(n)] = rewrite(from.components[n]);
  }
}

function sourceOf(dataRoot, file) {
  const abs = path.resolve(file);
  const rel = toPosix(path.relative(dataRoot, abs));
  return rel.startsWith('..') || path.isAbsolute(rel) ? `external:${path.basename(abs)}` : rel;
}

function readSource(dataRoot, scope, source, { name, basePath, observed }) {
  const abs = path.isAbsolute(source) ? source : path.resolve(source);
  let text;
  try { text = fs.readFileSync(abs, 'utf8'); } catch { throw new ContractError(`${source} cannot be read.`, 'MISSING_SOURCE'); }
  // eslint-disable-next-line global-require
  const sanitize = observed ? (s) => require('../run_manager/repairGovernance').sanitizeKnowledge(s).text : null;
  const model = N.normalizeContract(text, { name: path.basename(abs), basePath, sanitize });
  return { abs, text, model, sourceRel: sourceOf(dataRoot, abs) };
}

function versionRecord(reg, base) {
  return { id: `CV-${reg.versions.length + 1}`, ...base };
}

// ---------------------------------------------------------------------------------------------
// Recording versions
// ---------------------------------------------------------------------------------------------

/**
 * Registers a proposed contract or observed evidence. Never an approved one.
 * @param {object} o {name, role: 'proposed'|'observed', source, by, now, reason?, basePath?,
 *                    environment?: 'mock'|'real', run?, declared?}
 */
function registerVersion(dataRoot, scopeArg, o = {}) {
  const at = assertDate(o.now);
  const scope = resolveScope(dataRoot, scopeArg);
  const by = requireText(o.by, 'by', 'every version records who supplied it');
  const name = requireText(o.name, 'name');
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(name)) throw new ContractError(`"${name}" is not a contract name (lower-case letters, digits, . _ -).`, 'INVALID_ARGUMENT');
  if (o.role === 'approved') throw new ContractError('An approved contract is recorded only by a named human decision: `import-approved` for an existing approved specification, or `accept` for a proposed version.', 'ROLE_REFUSED');
  if (!['proposed', 'observed'].includes(o.role)) throw new ContractError('--role must be proposed or observed.', 'INVALID_ARGUMENT');
  const src = readSource(dataRoot, scope, requireText(o.source, 'source'), { name, basePath: o.basePath, observed: o.role === 'observed' });
  if (o.role === 'proposed' && src.model.evidence === 'observed') {
    throw new ContractError('Captured traffic is observed behaviour, never a proposed contract — register it with --role observed. Observed behaviour never becomes an expected result.', 'OBSERVED_AS_CONTRACT');
  }
  if (o.role === 'observed' && src.model.evidence !== 'observed') {
    throw new ContractError(`${src.model.format} is a contract document, not captured traffic — register it with --role proposed.`, 'NOT_OBSERVED_EVIDENCE');
  }
  let environment = null;
  if (o.role === 'observed') {
    if (!['mock', 'real'].includes(o.environment)) throw new ContractError('--environment mock|real is required for observed evidence — a mock and the real service are never mixed up.', 'ENVIRONMENT_REQUIRED');
    environment = { kind: o.environment };
    if (o.environment === 'real') environment = { ...environment, ...realEvidenceCheck(dataRoot, src, o) };
    else if (o.run) environment.run = o.run;
  }
  const snap = writeSnapshot(dataRoot, scope, src.model);
  return mutate(scope, (reg) => {
    const dup = reg.versions.find((v) => v.name === name && v.role === o.role && v.normalizedSha256 === snap.sha && !['rejected', 'superseded'].includes(v.status) && (o.role !== 'observed' || (v.environment || {}).kind === o.environment));
    if (dup) throw new ContractError(`This content is already registered as ${dup.id} (${dup.role}, ${dup.status}).`, 'DUPLICATE_VERSION');
    const base = o.role === 'proposed' ? activeApproved(reg, name) : null;
    const v = versionRecord(reg, {
      name, role: o.role, status: o.role === 'proposed' ? 'pending' : 'recorded',
      format: src.model.format, evidence: src.model.evidence, title: src.model.title, apiVersion: src.model.apiVersion,
      source: src.sourceRel, sourceSha256: N.sourceFingerprint(src.text), normalizedSha256: snap.sha, snapshot: snap.rel,
      endpoints: Object.keys(src.model.endpoints).length, issues: src.model.issues,
      ...(o.basePath ? { basePath: o.basePath } : {}),
      ...(o.role === 'proposed' ? { proposedAgainst: base ? base.id : null } : {}),
      ...(environment ? { environment } : {}),
      registeredAt: at, registeredBy: by, ...(o.reason ? { reason: o.reason } : {}),
    });
    reg.versions.push(v);
    reg.events.push({ at, by, event: `registered ${v.id} (${v.role}${environment ? `, ${environment.kind}` : ''}) from ${v.source}` });
    return v;
  });
}

/**
 * Real-service evidence must come from a run, inside that run's folder, on a verified environment —
 * the execution safety policy decides, this only refuses what it forbids.
 */
function realEvidenceCheck(dataRoot, src, o) {
  const run = requireText(o.run, 'run', 'real-service evidence comes from a run, and is kept in its folder');
  const runDir = path.join(dataRoot, 'runs', run);
  let meta;
  try { meta = JSON.parse(fs.readFileSync(path.join(runDir, 'metadata', 'run.json'), 'utf8')); } catch {
    throw new ContractError(`run ${run} has no metadata/run.json.`, 'NO_RUN');
  }
  if (!toPosix(src.abs).toLowerCase().startsWith(`${toPosix(runDir).toLowerCase()}/`)) {
    throw new ContractError(`real-service evidence must be inside the run that captured it (runs/${run}/…) — it is execution evidence of that run.`, 'EVIDENCE_OUTSIDE_RUN');
  }
  // eslint-disable-next-line global-require
  const { verifyEnvironment } = require('../run_manager/repairGovernance');
  const declared = o.declared || meta.environment;
  if (!declared) throw new ContractError('--declared <environment> is required: name the environment the evidence was captured on.', 'ENVIRONMENT_REQUIRED');
  const check = verifyEnvironment(dataRoot, meta, declared);
  if (check.status === 'inconsistent') {
    throw new ContractError(`the declared environment (${check.declared}) disagrees with ${check.sources.map((s) => `${s.source}: ${s.environment}`).join('; ')} — resolve the environment before recording real evidence.`, 'ENVIRONMENT_INCONSISTENT');
  }
  const writes = Object.values(src.model.endpoints).filter((e) => MUTATING.has(e.method)).map((e) => `${e.method} ${e.path}`);
  const production = check.declared === 'Production' || check.sources.some((s) => s.environment === 'Production');
  if (production && writes.length) {
    throw new ContractError(`the evidence records state-changing calls (${writes.slice(0, 3).join(', ')}) against Production — refused by the execution safety policy (pipeline.md §14).`, 'PRODUCTION_WRITE_EVIDENCE');
  }
  return { run, declared: check.declared, check: { status: check.status, restricted: check.restricted, sources: check.sources }, mutatingCalls: writes.length };
}

/** Records an EXISTING approved specification as the scope's approved contract. A named human decision. */
function importApproved(dataRoot, scopeArg, o = {}) {
  const at = assertDate(o.now);
  const scope = resolveScope(dataRoot, scopeArg);
  const by = requireText(o.approvedBy, 'approved-by', 'an approved contract is a human decision');
  const reason = requireText(o.reason, 'reason', 'say where the approval comes from');
  const name = requireText(o.name, 'name');
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(name)) throw new ContractError(`"${name}" is not a contract name.`, 'INVALID_ARGUMENT');
  const src = readSource(dataRoot, scope, requireText(o.source, 'source'), { name, basePath: o.basePath });
  if (src.model.evidence === 'observed') throw new ContractError('Captured traffic is observed behaviour and is never an approved contract.', 'OBSERVED_AS_CONTRACT');
  const snap = writeSnapshot(dataRoot, scope, src.model);
  return mutate(scope, (reg) => {
    const active = activeApproved(reg, name);
    if (active) throw new ContractError(`${name} already has an approved version (${active.id}). A new version is proposed (register --role proposed) and accepted by a named human — the approved one is never replaced directly.`, 'APPROVED_EXISTS');
    const decisionId = `CDEC-${reg.decisions.length + 1}`;
    const v = versionRecord(reg, {
      name, role: 'approved', status: 'active', format: src.model.format, evidence: src.model.evidence, title: src.model.title, apiVersion: src.model.apiVersion,
      source: src.sourceRel, sourceSha256: N.sourceFingerprint(src.text), normalizedSha256: snap.sha, snapshot: snap.rel,
      endpoints: Object.keys(src.model.endpoints).length, issues: src.model.issues, ...(o.basePath ? { basePath: o.basePath } : {}),
      registeredAt: at, registeredBy: by, approval: { by, at, reason, basis: 'existing approved specification', decision: decisionId },
    });
    reg.versions.push(v);
    reg.decisions.push({ id: decisionId, kind: 'import-approved', at, by, reason, version: v.id, sourceSha256: v.sourceSha256, normalizedSha256: v.normalizedSha256 });
    reg.events.push({ at, by, event: `recorded ${v.id} as the approved ${name} contract (${decisionId})` });
    return { version: v, decision: decisionId };
  });
}

// ---------------------------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------------------------

const ref = (v) => (v ? {
  id: v.id, name: v.name, role: v.role, status: v.status, format: v.format, evidence: v.evidence, apiVersion: v.apiVersion,
  source: v.source, sourceSha256: v.sourceSha256, normalizedSha256: v.normalizedSha256, snapshot: v.snapshot,
  registeredAt: v.registeredAt, registeredBy: v.registeredBy, ...(v.environment ? { environment: v.environment } : {}), ...(v.approval ? { approval: v.approval } : {}),
} : null);

/** Conformance of every observation of `name` to the approved model, per endpoint — mock and real apart. */
function evidenceMatrix(dataRoot, reg, name, baseModel) {
  const rows = Object.keys(baseModel.endpoints).sort().map((endpoint) => ({ endpoint, mock: { versions: [], verdict: 'not exercised', rules: [] }, real: { versions: [], verdict: 'not exercised', rules: [] } }));
  const extra = [];
  for (const v of reg.versions.filter((x) => x.role === 'observed' && x.name === name)) {
    let model;
    try { model = loadModel(dataRoot, v); } catch { continue; }
    const kind = (v.environment || {}).kind === 'real' ? 'real' : 'mock';
    const cmp = D.compareContracts(baseModel, model, { mode: 'conformance' });
    const exercised = new Set(Object.keys(D.collapseToTemplates(model, baseModel).endpoints));
    for (const row of rows) {
      if (!exercised.has(row.endpoint)) continue;
      const cell = row[kind];
      cell.versions.push(v.id);
      const bad = cmp.items.filter((i) => i.endpoint === row.endpoint && i.classification !== 'Non-breaking');
      for (const b of bad) if (!cell.rules.includes(b.rule)) cell.rules.push(b.rule);
      cell.verdict = cell.rules.length ? 'violations' : 'conforms';
    }
    for (const i of cmp.items.filter((x) => x.rule === 'EP-UNDOCUMENTED')) extra.push({ endpoint: i.endpoint, kind, version: v.id });
  }
  for (const row of rows) {
    row.realValidated = row.real.verdict === 'conforms';
    row.disagreement = row.mock.verdict !== 'not exercised' && row.real.verdict !== 'not exercised'
      && (row.mock.verdict !== row.real.verdict || row.mock.rules.slice().sort().join() !== row.real.rules.slice().sort().join());
    row.note = row.disagreement ? 'the mock and the real service disagree — the mock passing proves nothing about the real integration'
      : row.mock.verdict === 'conforms' && row.real.verdict === 'not exercised' ? 'mock only — not validated against the real service'
        : null;
  }
  return { rows, undocumented: extra };
}

function defaultCandidate(reg) {
  const pending = reg.versions.filter((v) => v.role === 'proposed' && ['pending', 'partially-accepted'].includes(v.status));
  if (pending.length === 1) return pending[0];
  throw new ContractError(pending.length ? `several proposed versions are pending (${pending.map((v) => v.id).join(', ')}) — name one with --candidate.` : 'name the version to analyse with --candidate CV-n.', 'CANDIDATE_REQUIRED');
}

/**
 * The comparison of a candidate version with its base, its impact, and the mock/real evidence. Pure read.
 * The `id` (CD-…) fingerprints everything a decision would rest on — both versions' content, the rules,
 * every difference and every reached test case and assertion — so a decision is refused if any of it
 * changed since (STALE_ANALYSIS).
 * @param {{candidate?: string, base?: string}} [o]
 */
function analyzeContract(dataRoot, scopeArg, o = {}) {
  const scope = typeof scopeArg === 'string' ? resolveScope(dataRoot, scopeArg) : scopeArg;
  const reg = readRegistry(scope);
  const cand = o.candidate ? byId(reg, o.candidate) : defaultCandidate(reg);
  const candModel = loadModel(dataRoot, cand);
  let baseV = o.base ? byId(reg, o.base) : activeApproved(reg, cand.name);
  if (baseV && baseV.id === cand.id) baseV = null;
  const mode = cand.role === 'observed' ? 'conformance' : 'drift';
  const notes = [];
  let baseModel = null;
  let comparison;
  if (baseV) {
    baseModel = loadModel(dataRoot, baseV);
    comparison = D.compareContracts(baseModel, candModel, { mode });
  } else if (mode === 'drift') {
    baseModel = EMPTY;
    comparison = D.compareContracts(EMPTY, candModel, { mode });
    notes.push(`${cand.name} has no approved version yet: every endpoint of ${cand.id} is new, and its first approval is a named human decision (accept).`);
  } else {
    comparison = D.missingBaseline(`${cand.id} (observed)`);
    notes.push(`${cand.name} has no approved contract: observed behaviour cannot be judged, and is never adopted as the contract.`);
  }
  const impact = analyzeContractImpact(dataRoot, scope, comparison, { endpoints: { ...(baseModel ? baseModel.endpoints : {}), ...candModel.endpoints } });
  const evidence = baseModel && baseV ? evidenceMatrix(dataRoot, reg, cand.name, baseModel) : { rows: [], undocumented: [] };
  const digest = {
    scope: scope.rel, mode, rules: D.RULES_VERSION,
    base: baseV ? [baseV.id, baseV.normalizedSha256] : null, candidate: [cand.id, cand.normalizedSha256],
    items: comparison.items.map((i) => i.id),
    confirmed: impact.confirmed.map((e) => `${e.scope}|${e.testCase}|${e.assertions.map((a) => `${a.assertionId}:${a.item}`).join(',')}`),
    potential: impact.potential.map((e) => `${e.scope}|${e.testCase}`),
    missing: impact.missing.map((m) => m.endpoint),
  };
  const analysis = {
    id: `CD-${crypto.createHash('sha256').update(N.canonical(digest)).digest('hex').slice(0, 12)}`,
    scope: scope.rel, label: scope.label, family: scope.family, mode,
    base: ref(baseV), candidate: ref(cand), comparison, impact, evidence, notes: [...notes, ...comparison.notes],
    policy: effectivePolicy(dataRoot, scope, reg),
  };
  analysis.decisionsRequired = decisionsRequired(analysis);
  return analysis;
}

function decisionsRequired(a) {
  const out = [];
  const serious = a.comparison.items.filter((i) => SERIOUS.has(i.classification));
  const c = a.candidate;
  if (c.role === 'proposed' && ['pending', 'partially-accepted'].includes(c.status) && !a.comparison.unchanged) {
    out.push({ kind: 'contract-acceptance', detail: `accept (whole, or --endpoints) or reject ${c.id}: \`api_contract/cli.js accept --scope ${a.scope} --candidate ${c.id} --analysis ${a.id} --by "<name>" --reason "..."\`${a.family === 'feature' && a.impact.suppliers.length ? ` --approved-suppliers ${a.impact.suppliers.join(',')}` : ''}` });
    const reached = [...a.impact.confirmed, ...a.impact.potential].filter((e) => /^approved$/i.test(String(e.review)));
    if (reached.length && serious.length + a.comparison.counts['Potentially breaking'] > 0) out.push({ kind: 'impacted-artifacts', detail: `after acceptance, each reached approved test case needs a named decision (impact-decision): ${reached.map((e) => e.testCase).join(', ')}` });
  }
  if (c.role === 'observed' && c.status === 'recorded' && !['Unchanged', 'Non-breaking'].includes(a.comparison.classification)) {
    out.push({ kind: 'observed-review', detail: `review ${c.id} (${(c.environment || {}).kind}): \`review-observed --scope ${a.scope} --observed ${c.id} --analysis ${a.id} --decision ${OBSERVED_DECISIONS.filter((d) => d !== 'conforms').join('|')} --by "<name>" --reason "..."\`` });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Human decisions
// ---------------------------------------------------------------------------------------------

/**
 * Accepts a proposed version — whole, or only `endpoints` — as the new approved contract. The old
 * approved version is superseded, never deleted. Refused when the analysis it rests on is stale.
 * @param {object} o {candidate, analysisId, by, reason, now, endpoints?: string[], approvedSuppliers?: string[]}
 */
function acceptVersion(dataRoot, scopeArg, o = {}) {
  const at = assertDate(o.now);
  const scope = resolveScope(dataRoot, scopeArg);
  const by = requireText(o.by, 'by', 'accepting a contract is a human decision');
  const reason = requireText(o.reason, 'reason');
  requireText(o.analysisId, 'analysis', 'a decision rests on a specific analysis (analyze prints its CD- id)');
  const a = analyzeContract(dataRoot, scope, { candidate: requireText(o.candidate, 'candidate') });
  if (a.id !== o.analysisId) throw new ContractError(`analysis ${o.analysisId} is stale — the versions, the rules or the test cases they reach changed since. The current analysis is ${a.id}; review it before deciding.`, 'STALE_ANALYSIS');
  if (a.candidate.role !== 'proposed' || !['pending', 'partially-accepted'].includes(a.candidate.status)) throw new ContractError(`${a.candidate.id} is ${a.candidate.role} / ${a.candidate.status} — only a pending proposed version can be accepted.`, 'NOT_PENDING');
  if (a.comparison.unchanged && a.base) throw new ContractError(`${a.candidate.id} does not differ from the approved ${a.base.id} in anything the contract states — there is nothing to accept. Reject it to close it.`, 'UNCHANGED_CONTRACT');
  const changed = [...new Set(a.comparison.items.flatMap(D.endpointsOf).filter((e) => e && e !== '*'))];
  const selected = o.endpoints && o.endpoints.length ? o.endpoints.map((e) => `${e.trim().split(/\s+/)[0].toUpperCase()} ${N.normPath(e.trim().split(/\s+/).slice(1).join(' '))}`) : changed;
  const notChanged = selected.filter((e) => !changed.includes(e));
  if (notChanged.length) throw new ContractError(`${notChanged.join(', ')} ${notChanged.length > 1 ? 'are' : 'is'} not changed by ${a.candidate.id}. Changed: ${changed.join(', ')}.`, 'ENDPOINT_NOT_CHANGED');
  if (scope.family === 'feature') {
    const missing = a.impact.suppliers.filter((s) => !(o.approvedSuppliers || []).includes(s));
    if (missing.length) throw new ContractError(`a Feature-level contract reaches every Supplier of ${scope.feature} (${a.impact.suppliers.join(', ')}); each is independent — name each one this change is approved for. Missing: ${missing.join(', ')} (--approved-suppliers).`, 'SUPPLIER_APPROVAL_REQUIRED');
  }
  const reg0 = readRegistry(scope);
  const cand = byId(reg0, a.candidate.id);
  const candModel = loadModel(dataRoot, cand);
  const baseV = a.base ? byId(reg0, a.base.id) : null;
  const partial = selected.length < changed.length;
  let model;
  if (partial) {
    const base = baseV ? loadModel(dataRoot, baseV) : EMPTY;
    model = JSON.parse(JSON.stringify({ ...base, format: 'normalized', issues: [...(base.issues || [])] }));
    for (const ep of selected) {
      if (candModel.endpoints[ep]) importEndpoint(model, candModel, ep, cand.id);
      else delete model.endpoints[ep];
    }
    model.derivedFrom = { base: baseV ? baseV.id : null, candidate: cand.id, endpoints: [...selected].sort() };
  } else model = candModel;
  const snap = writeSnapshot(dataRoot, scope, model);
  const reached = [...a.impact.confirmed, ...a.impact.potential].filter((e) => e.endpoints.some((ep) => selected.includes(ep)));
  const pendingImpact = reached.map((e) => {
    const fp = caseFingerprint(dataRoot, scope, e.scope, e.testCase);
    return { scope: e.scope, testCase: e.testCase, grade: e.grade, review: e.review, endpoints: e.endpoints.filter((ep) => selected.includes(ep)), assertions: e.assertions.map((x) => x.assertionId), via: e.via, material: fp ? fp.material : null };
  }).filter((e) => /^approved$/i.test(String(e.review)) || e.grade === 'confirmed');
  const items = a.comparison.items.filter((i) => D.endpointsOf(i).some((e) => selected.includes(e)));
  return mutate(scope, (reg) => {
    const c = byId(reg, cand.id);
    if (!['pending', 'partially-accepted'].includes(c.status)) throw new ContractError(`${c.id} was decided meanwhile (${c.status}).`, 'NOT_PENDING');
    const active = activeApproved(reg, c.name);
    if ((active ? active.id : null) !== (baseV ? baseV.id : null)) throw new ContractError('the approved version changed meanwhile — analyse again.', 'STALE_ANALYSIS');
    const decisionId = `CDEC-${reg.decisions.length + 1}`;
    const v = versionRecord(reg, {
      name: c.name, role: 'approved', status: 'active', format: partial ? 'normalized' : c.format, evidence: partial && baseV ? baseV.evidence : c.evidence,
      title: c.title, apiVersion: partial && baseV ? baseV.apiVersion : c.apiVersion,
      source: partial ? `derived:${baseV ? baseV.id : 'none'}+${c.id}` : c.source, sourceSha256: partial ? null : c.sourceSha256,
      normalizedSha256: snap.sha, snapshot: snap.rel, endpoints: Object.keys(model.endpoints).length, issues: model.issues || [],
      approvedFrom: c.id, supersedes: baseV ? baseV.id : null, partial, acceptedEndpoints: [...selected].sort(),
      registeredAt: at, registeredBy: by, approval: { by, at, reason, analysis: a.id, decision: decisionId, basis: partial ? 'partial acceptance of a proposed version' : 'acceptance of a proposed version' },
    });
    if (active) Object.assign(active, { status: 'superseded', supersededBy: v.id, supersededAt: at });
    reg.versions.push(v);
    c.acceptedEndpoints = [...new Set([...(c.acceptedEndpoints || []), ...selected])].sort();
    c.status = partial ? 'partially-accepted' : 'accepted';
    reg.decisions.push({
      id: decisionId, kind: partial ? 'accept-partial' : 'accept', at, by, reason, analysis: a.id,
      candidate: c.id, base: baseV ? baseV.id : null, approved: v.id, endpoints: [...selected].sort(),
      classification: items.reduce((w, i) => (D.RANK[i.classification] > (D.RANK[w] || 0) ? i.classification : w), null) || 'Unchanged',
      counts: Object.fromEntries(D.CLASSIFICATIONS.map((k) => [k, items.filter((i) => i.classification === k).length])),
      items: items.map((i) => ({ id: i.id, rule: i.rule, classification: i.classification, endpoint: i.endpoint, ...(i.endpoints ? { endpoints: i.endpoints } : {}), field: i.field || null, status: i.status || null })),
      ...(o.approvedSuppliers && o.approvedSuppliers.length ? { approvedSuppliers: o.approvedSuppliers } : {}),
      pendingImpact, impactDecisions: [],
    });
    reg.events.push({ at, by, event: `${decisionId}: accepted ${partial ? `${selected.length} endpoint(s) of ` : ''}${c.id} as ${v.id}${active ? `, superseding ${active.id}` : ''}` });
    return { version: v, decision: decisionId, pendingImpact, partial };
  });
}

function rejectVersion(dataRoot, scopeArg, o = {}) {
  const at = assertDate(o.now);
  const scope = resolveScope(dataRoot, scopeArg);
  const by = requireText(o.by, 'by', 'rejecting a contract is a human decision');
  const reason = requireText(o.reason, 'reason');
  return mutate(scope, (reg) => {
    const c = byId(reg, requireText(o.candidate, 'candidate'));
    if (c.role !== 'proposed' || !['pending', 'partially-accepted'].includes(c.status)) throw new ContractError(`${c.id} is ${c.role} / ${c.status} — only a pending proposed version can be rejected.`, 'NOT_PENDING');
    const decisionId = `CDEC-${reg.decisions.length + 1}`;
    c.status = 'rejected';
    reg.decisions.push({ id: decisionId, kind: 'reject', at, by, reason, candidate: c.id, acceptedEarlier: c.acceptedEndpoints || [] });
    reg.events.push({ at, by, event: `${decisionId}: rejected ${c.id}` });
    return { decision: decisionId, version: c };
  });
}

/** A named human's verdict on what observed behaviour that contradicts the approved contract means. */
function reviewObserved(dataRoot, scopeArg, o = {}) {
  const at = assertDate(o.now);
  const scope = resolveScope(dataRoot, scopeArg);
  const by = requireText(o.by, 'by', 'a contradiction between behaviour and contract is a human decision');
  const reason = requireText(o.reason, 'reason');
  if (!OBSERVED_DECISIONS.includes(o.decision)) throw new ContractError(`--decision must be one of ${OBSERVED_DECISIONS.join(', ')}.`, 'INVALID_ARGUMENT');
  const a = analyzeContract(dataRoot, scope, { candidate: requireText(o.observed, 'observed') });
  if (a.id !== requireText(o.analysisId, 'analysis')) throw new ContractError(`analysis ${o.analysisId} is stale — the current analysis is ${a.id}.`, 'STALE_ANALYSIS');
  if (a.candidate.role !== 'observed') throw new ContractError(`${a.candidate.id} is not observed evidence.`, 'INVALID_ARGUMENT');
  if (o.decision === 'conforms' && !['Unchanged', 'Non-breaking'].includes(a.comparison.classification)) throw new ContractError(`${a.candidate.id} contradicts the approved contract (${a.comparison.classification}) — "conforms" cannot be recorded for it.`, 'CONTRADICTS_CONTRACT');
  return mutate(scope, (reg) => {
    const v = byId(reg, a.candidate.id);
    if (v.status !== 'recorded') throw new ContractError(`${v.id} was already reviewed (${v.review ? v.review.decision : v.status}).`, 'ALREADY_REVIEWED');
    const decisionId = `CDEC-${reg.decisions.length + 1}`;
    v.status = 'reviewed';
    v.review = { decision: o.decision, by, at, reason, analysis: a.id, decisionId };
    reg.decisions.push({
      id: decisionId, kind: 'observed-review', at, by, reason, observed: v.id, environment: (v.environment || {}).kind, decision: o.decision, analysis: a.id,
      classification: a.comparison.classification, counts: a.comparison.counts,
      ...(o.decision === 'contract-outdated' ? { followUp: 'Observed behaviour is NOT adopted. If the contract really is outdated, a proposed version is registered and accepted by a named human; the tests keep the approved Expected values until then.' } : {}),
      ...(o.decision === 'application-defect' ? { followUp: 'The approved contract stands; the failures this behaviour causes are Application Failures.' } : {}),
    });
    reg.events.push({ at, by, event: `${decisionId}: reviewed ${v.id} — ${o.decision}` });
    return { decision: decisionId, version: v };
  });
}

/** One reached test case's decision after a contract change was accepted. Never edits the case. */
function decideImpact(dataRoot, scopeArg, o = {}) {
  const at = assertDate(o.now);
  const scope = resolveScope(dataRoot, scopeArg);
  const by = requireText(o.by, 'by', 'each impacted artifact is decided by a named human');
  const reason = requireText(o.reason, 'reason');
  if (!IMPACT_DECISIONS.includes(o.decision)) throw new ContractError(`--decision must be one of ${IMPACT_DECISIONS.join(', ')}.`, 'INVALID_ARGUMENT');
  const reg0 = readRegistry(scope);
  const dec = reg0.decisions.find((d) => d.id === o.acceptance && /^accept/.test(d.kind));
  if (!dec) throw new ContractError(`${o.acceptance} is not a contract acceptance in this scope.`, 'NO_DECISION');
  const matches = dec.pendingImpact.filter((e) => e.testCase === o.item && (!o.caseScope || e.scope === o.caseScope));
  if (!matches.length) throw new ContractError(`${o.item} is not among the test cases ${dec.id} reaches (${dec.pendingImpact.map((e) => e.testCase).join(', ') || 'none'}).`, 'NOT_IMPACTED');
  if (matches.length > 1) throw new ContractError(`${o.item} is reached in several scopes (${matches.map((m) => m.scope).join(', ')}) — name one with --case-scope.`, 'AMBIGUOUS_CASE');
  const entry = matches[0];
  let material = null;
  if (o.decision === 'updated') {
    const fp = caseFingerprint(dataRoot, scope, entry.scope, entry.testCase);
    if (!fp) throw new ContractError(`${entry.testCase} is no longer in its suite — record "retire" if it was retired.`, 'NO_CASE');
    if (fp.material === entry.material) throw new ContractError(`${entry.testCase} is unchanged since the contract change was accepted — "updated" records a Test Design update that happened, it never stands in for one.`, 'CASE_NOT_UPDATED');
    if (!/^approved$/i.test(String(fp.review))) throw new ContractError(`${entry.testCase}'s update is not approved yet (Review: ${fp.review}) — a human approves it at Stage 3 first.`, 'CASE_NOT_APPROVED');
    material = fp.material;
  }
  return mutate(scope, (reg) => {
    const d = reg.decisions.find((x) => x.id === dec.id);
    d.impactDecisions.push({ scope: entry.scope, testCase: entry.testCase, decision: o.decision, by, at, reason, ...(material ? { material } : {}) });
    reg.events.push({ at, by, event: `${d.id}: ${entry.scope}:${entry.testCase} — ${o.decision}` });
    return { acceptance: d.id, testCase: entry.testCase, decision: o.decision, resolved: RESOLVING_IMPACT.has(o.decision) };
  });
}

/** Unresolved reached cases of an acceptance decision. */
function openImpact(dec) {
  return (dec.pendingImpact || []).filter((e) => {
    const last = (dec.impactDecisions || []).filter((x) => x.testCase === e.testCase && x.scope === e.scope).pop();
    return !last || !RESOLVING_IMPACT.has(last.decision);
  });
}

/** Differences between two APPROVED contracts of one scope on the endpoints both describe. */
function findContradictions(dataRoot, scope, reg) {
  const active = reg.versions.filter((v) => v.role === 'approved' && v.status === 'active');
  const out = [];
  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      let [a, b] = [active[i], active[j]];
      if (a.evidence !== 'specification' && b.evidence === 'specification') [a, b] = [b, a];
      let ma; let mb;
      try { ma = loadModel(dataRoot, a); mb = loadModel(dataRoot, b); } catch { continue; }
      const cmp = D.compareContracts(ma, mb, { mode: 'cross-source' });
      if (cmp.unchanged) continue;
      const id = `CX-${crypto.createHash('sha256').update(`${a.normalizedSha256}|${b.normalizedSha256}|${cmp.items.map((x) => x.id).join(',')}`).digest('hex').slice(0, 10)}`;
      const decision = reg.decisions.find((d) => d.kind === 'contradiction' && d.contradiction === id) || null;
      out.push({ id, versions: [a.id, b.id], names: [a.name, b.name], classification: cmp.classification, counts: cmp.counts, items: cmp.items, decision });
    }
  }
  return out;
}

function decideContradiction(dataRoot, scopeArg, o = {}) {
  const at = assertDate(o.now);
  const scope = resolveScope(dataRoot, scopeArg);
  const by = requireText(o.by, 'by', 'two approved contracts that contradict each other are reconciled by a human');
  const decision = requireText(o.decision, 'decision', 'say which source governs, and what changes');
  const reg0 = readRegistry(scope);
  const cx = findContradictions(dataRoot, scope, reg0).find((c) => c.id === o.id);
  if (!cx) throw new ContractError(`${o.id} is not a current contradiction in ${scope.rel}.`, 'NO_CONTRADICTION');
  return mutate(scope, (reg) => {
    const id = `CDEC-${reg.decisions.length + 1}`;
    reg.decisions.push({ id, kind: 'contradiction', contradiction: cx.id, versions: cx.versions, at, by, decision, classification: cx.classification });
    reg.events.push({ at, by, event: `${id}: contradiction ${cx.id} decided` });
    return { decision: id, contradiction: cx.id };
  });
}


// ---------------------------------------------------------------------------------------------
// Contract coverage policy (Phase 7.1) — explicit, human-selected, per project and per scope
// ---------------------------------------------------------------------------------------------

/**
 * The policy in force for a scope: the scope's own (recorded in its registry), else the project's
 * (knowledge_base/api_contract_policy.json), else `optional` — the Phase 7 behaviour, unchanged.
 */
function effectivePolicy(dataRoot, scope, reg = null) {
  const r = reg || (fs.existsSync(registryFile(scope)) ? readRegistry(scope) : null);
  if (r && r.policy) return { mode: r.policy.mode, source: 'scope', by: r.policy.by, at: r.policy.at, decision: r.policy.decision };
  const p = readProjectPolicy(dataRoot);
  if (p) return { mode: p.mode, source: 'project', by: p.by, at: p.at, decision: p.decision };
  return { mode: 'optional', source: 'default', by: null, at: null, decision: null };
}

function readProjectPolicy(dataRoot) {
  const f = path.join(dataRoot, PROJECT_POLICY);
  if (!fs.existsSync(f)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    return j.current || null;
  } catch (err) {
    throw new ContractError(`${PROJECT_POLICY} is unreadable (${err.message}).`, 'POLICY_CORRUPT');
  }
}

/**
 * Records a named human's choice of policy for a scope (or, with scopeArg 'project', the whole project).
 * Every change is kept; nothing is inferred and nothing changes without a decision.
 */
function setPolicy(dataRoot, scopeArg, o = {}) {
  const at = assertDate(o.now);
  const by = requireText(o.by, 'by', 'the contract coverage policy is a human decision');
  const reason = requireText(o.reason, 'reason');
  if (!POLICY_MODES.includes(o.mode)) throw new ContractError(`--mode must be ${POLICY_MODES.join(' or ')}.`, 'INVALID_ARGUMENT');
  if (scopeArg === 'project') {
    const f = path.join(dataRoot, PROJECT_POLICY);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    return withFileLock(`${f}.lock`, () => {
      let j = { schema: 'api-contract-policy/1', current: null, history: [] };
      if (fs.existsSync(f)) j = JSON.parse(fs.readFileSync(f, 'utf8'));
      const rec = { mode: o.mode, by, at, reason, decision: `PP-${j.history.length + 1}`, previous: j.current ? j.current.mode : null };
      j.current = rec;
      j.history.push(rec);
      writeJsonAtomic(f, j);
      return { scope: 'project', ...rec };
    });
  }
  const scope = resolveScope(dataRoot, scopeArg);
  return mutate(scope, (reg) => {
    const decisionId = `CDEC-${reg.decisions.length + 1}`;
    const previous = reg.policy ? reg.policy.mode : null;
    reg.policy = { mode: o.mode, by, at, reason, decision: decisionId };
    reg.decisions.push({ id: decisionId, kind: 'policy', at, by, reason, mode: o.mode, previous });
    reg.events.push({ at, by, event: `${decisionId}: contract validation ${o.mode} (was ${previous || 'not set'})` });
    return { scope: scope.rel, mode: o.mode, decision: decisionId, previous };
  });
}

/** The approved test cases of a scope that exercise an API (an `API contract` assertion, or an API tag). */
function apiCasesOf(dataRoot, scope) {
  // eslint-disable-next-line global-require
  const { casesOf } = require('./impact');
  const out = [];
  for (const root of graphRootsFor(dataRoot, scope)) {
    let cases = [];
    try { cases = casesOf(root); } catch { cases = []; }
    for (const c of cases) {
      const api = c.assertions.some((a) => /^api contract\b/i.test(String(a.source || ''))) || /(^|[\s,;|])api([\s,;|]|$)/i.test(String(c.tags || ''));
      if (api) out.push(`${root.label}|${c.id}`);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Status and the stage gate
// ---------------------------------------------------------------------------------------------

/**
 * What blocks, and what only warns, in one scope's contract registry. Each blocker names the test cases
 * it affects (`affected`, as `<scope label>|<TC>`), so a partial scope that excludes them is not blocked.
 */
function scopeStatus(dataRoot, scopeArg) {
  const scope = typeof scopeArg === 'string' ? resolveScope(dataRoot, scopeArg) : scopeArg;
  const out = { scope: scope.rel, label: scope.label, registry: fs.existsSync(registryFile(scope)), blockers: [], warnings: [], versions: [], policy: null, contracts: [], drift: [], decisionsPending: [] };
  out.policy = effectivePolicy(dataRoot, scope, out.registry ? (() => { try { return readRegistry(scope); } catch { return null; } })() : null);
  const required = out.policy.mode === 'required';
  if (!out.registry) {
    if (required) {
      const api = apiCasesOf(dataRoot, scope);
      // Project-wide "required" reaches a scope only when it has API work; a scope's own "required" always.
      if (api.length || out.policy.source === 'scope') {
        out.blockers.push({ kind: 'contract-missing', affected: api, detail: `contract validation is REQUIRED (${out.policy.source} policy, ${out.policy.by}) and ${scope.rel} has no approved API contract` });
        out.decisionsPending.push({ kind: 'contract-missing', detail: `import-approved --scope ${scope.rel} … (or a named human changes the policy)` });
      }
    }
    return out;
  }
  let reg;
  try { reg = readRegistry(scope); } catch (err) {
    out.blockers.push({ kind: 'registry-unreadable', detail: err.message, affected: [] });
    return out;
  }
  out.versions = reg.versions.map((v) => ({ id: v.id, name: v.name, role: v.role, status: v.status, environment: v.environment ? v.environment.kind : null }));
  if (required && !reg.versions.some((v) => v.role === 'approved' && v.status === 'active')) {
    out.blockers.push({ kind: 'contract-missing', affected: apiCasesOf(dataRoot, scope), detail: `contract validation is REQUIRED (${out.policy.source} policy, ${out.policy.by}) and ${scope.rel} has no approved API contract` });
  }
  const reach = (a) => [...a.impact.confirmed, ...a.impact.potential].map((e) => `${e.scope}|${e.testCase}`);
  for (const v of reg.versions) {
    const pendingProposal = v.role === 'proposed' && ['pending', 'partially-accepted'].includes(v.status);
    const unreviewed = v.role === 'observed' && v.status === 'recorded';
    if (!pendingProposal && !unreviewed) continue;
    let a;
    try { a = analyzeContract(dataRoot, scope, { candidate: v.id }); } catch (err) {
      out.blockers.push({ kind: 'unreadable-version', version: v.id, detail: `${v.id}: ${err.message}`, affected: [] });
      continue;
    }
    const serious = a.comparison.items.filter((i) => SERIOUS.has(i.classification));
    const potentially = a.comparison.items.filter((i) => i.classification === 'Potentially breaking');
    const missing = a.impact.missing.filter((m) => m.serious).map((m) => m.endpoint);
    // Under a REQUIRED policy, a Breaking/Unknown change that reaches no traceable case blocks the whole scope:
    // untraced is never read as unaffected. Under the optional policy, the Phase 7 behaviour stands.
    const base = { version: v.id, analysis: a.id, classification: a.comparison.classification, counts: a.comparison.counts, affected: required && missing.length ? [] : reach(a), missing, suppliers: a.impact.suppliers, ...(required && missing.length ? { untraced: true } : {}) };
    out.drift.push({ version: v.id, name: v.name, role: v.role, environment: v.environment ? v.environment.kind : null, analysis: a.id, classification: a.comparison.classification, counts: a.comparison.counts, missingTraceability: a.impact.missing.map((m) => m.endpoint) });
    for (const d of a.decisionsRequired) out.decisionsPending.push({ kind: d.kind, version: v.id, detail: d.detail });
    if (pendingProposal) {
      if (serious.length) out.blockers.push({ ...base, kind: 'pending-contract-change', detail: `${v.id} (proposed ${v.name}) carries ${serious.length} Breaking/Unknown difference(s) from the approved contract and awaits a named decision (accept or reject)${base.untraced ? ` — ${missing.join(', ')} reach no traceable test case (contract validation is required)` : ''}` });
      else if (potentially.length) out.warnings.push({ ...base, kind: 'pending-contract-change', detail: `${v.id} (proposed ${v.name}) carries ${potentially.length} potentially breaking difference(s) and awaits a decision` });
    } else if (!['Unchanged', 'Non-breaking'].includes(a.comparison.classification)) {
      const kind = (v.environment || {}).kind;
      if (kind === 'real' && serious.length) out.blockers.push({ ...base, kind: 'real-contract-violation', detail: `real-service evidence ${v.id} contradicts the approved ${v.name} contract (${serious.length} Breaking/Unknown) and has not been reviewed` });
      else out.warnings.push({ ...base, kind: kind === 'real' ? 'real-contract-difference' : 'mock-contract-violation', detail: `${kind} evidence ${v.id} differs from the approved ${v.name} contract (${a.comparison.classification}) — review it${kind === 'mock' ? '; a mock is not the real service' : ''}` });
    }
  }
  for (const d of reg.decisions.filter((x) => /^accept/.test(x.kind))) {
    for (const e of openImpact(d)) {
      out.blockers.push({ kind: 'impact-undecided', acceptance: d.id, affected: [`${e.scope}|${e.testCase}`], detail: `${e.scope}:${e.testCase} is reached by the contract change accepted in ${d.id} (${e.endpoints.join(', ')}) and has no resolving decision yet (impact-decision)` });
    }
  }
  // Per contract: its versions, and what mock and real evidence show (evidenceMatrix — the same verdicts
  // the drift report gives).
  for (const name of [...new Set(reg.versions.map((v) => v.name))].sort()) {
    const mine = reg.versions.filter((v) => v.name === name);
    const approvedV = activeApproved(reg, name);
    let evidence = null;
    if (approvedV) {
      try {
        const m = evidenceMatrix(dataRoot, reg, name, loadModel(dataRoot, approvedV));
        evidence = {
          endpoints: m.rows.length,
          mockConforms: m.rows.filter((r) => r.mock.verdict === 'conforms').length,
          mockViolations: m.rows.filter((r) => r.mock.verdict === 'violations').length,
          realConforms: m.rows.filter((r) => r.real.verdict === 'conforms').length,
          realViolations: m.rows.filter((r) => r.real.verdict === 'violations').length,
          mockOnly: m.rows.filter((r) => r.mock.verdict === 'conforms' && r.real.verdict === 'not exercised').map((r) => r.endpoint),
          disagreements: m.rows.filter((r) => r.disagreement).map((r) => r.endpoint),
          notExercised: m.rows.filter((r) => r.mock.verdict === 'not exercised' && r.real.verdict === 'not exercised').length,
        };
      } catch (err) { evidence = { error: err.message }; }
    }
    out.contracts.push({
      name,
      approved: approvedV ? approvedV.id : null,
      superseded: mine.filter((v) => v.role === 'approved' && v.status === 'superseded').map((v) => v.id),
      proposedPending: mine.filter((v) => v.role === 'proposed' && ['pending', 'partially-accepted'].includes(v.status)).map((v) => v.id),
      observed: { mock: mine.filter((v) => v.role === 'observed' && (v.environment || {}).kind === 'mock').length, real: mine.filter((v) => v.role === 'observed' && (v.environment || {}).kind === 'real').length, unreviewed: mine.filter((v) => v.role === 'observed' && v.status === 'recorded').map((v) => v.id) },
      evidence,
    });
  }
  for (const d of reg.decisions.filter((x) => /^accept/.test(x.kind))) {
    for (const e of openImpact(d)) out.decisionsPending.push({ kind: 'impact-decision', acceptance: d.id, detail: `${e.scope}:${e.testCase} — impact-decision --acceptance ${d.id} --item ${e.testCase}` });
  }
  for (const cx of findContradictions(dataRoot, scope, reg)) {
    if (cx.decision) continue;
    out.decisionsPending.push({ kind: 'contradiction', detail: `decide-contradiction --id ${cx.id}` });
    const entry = { kind: 'contradiction', contradiction: cx.id, affected: [], detail: `approved contracts ${cx.versions.join(' and ')} contradict each other (${cx.classification}, ${cx.items.length} difference(s)) — a human decides which governs (decide-contradiction --id ${cx.id})` };
    if (cx.items.some((i) => SERIOUS.has(i.classification))) out.blockers.push(entry); else out.warnings.push(entry);
  }
  return out;
}

/**
 * The contract part of a stage entry gate, for the run's scope roots. A blocker counts for a root only
 * when it affects that root's cases — or when nothing traceable shows it does not (no reached case at
 * all). A partial scope (`scopeItems`) is blocked only by blockers that touch its items.
 */
function contractGate(dataRoot, roots, { scopeItems = [] } = {}) {
  const out = { blockers: [], warnings: [], checked: [] };
  const seen = new Set();
  const inItems = (affected) => !scopeItems.length || affected.some((a) => { const tc = a.split('|')[1]; return scopeItems.some((x) => x === tc || x.endsWith(`:${tc}`)); });
  for (const root of roots) {
    for (const [n, scope] of scopesForRoot(dataRoot, root).entries()) {
      const key = `${root.label}|${scope.rel}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // No registry and no REQUIRED policy: the scope is untouched (Phase 7 behaviour).
      if (!fs.existsSync(registryFile(scope)) && effectivePolicy(dataRoot, scope).mode !== 'required') continue;
      const st = scopeStatus(dataRoot, scope);
      out.checked.push(scope.rel);
      for (const b of st.blockers) {
        // A missing contract is judged on the root's own scope only — a Supplier may hold its own contract.
        if (b.kind === 'contract-missing' && n > 0) continue;
        const mine = b.affected.filter((a) => a.split('|')[0] === root.label);
        const fromFeature = scope.family === 'feature';
        const reachesNothing = !b.affected.length;
        const label = `API contract (${scope.rel})`;
        if (fromFeature && !mine.length && !reachesNothing) { out.warnings.push(`${label}: ${b.detail} — affects other scopes of ${scope.feature}, not ${root.label}`); continue; }
        if (!inItems(fromFeature ? mine : b.affected) && !reachesNothing) { out.warnings.push(`${label}: ${b.detail} — outside the requested scope`); continue; }
        out.blockers.push(`${label}: ${b.detail}${reachesNothing ? ' — it reaches no traceable test case, so no part of the scope can be shown unaffected' : ` (affects ${(fromFeature ? mine : b.affected).map((a) => a.replace('|', ':')).join(', ')})`}`);
      }
      for (const w of st.warnings) out.warnings.push(`API contract (${scope.rel}): ${w.detail}`);
    }
  }
  return out;
}

/** A Supplier's approved contract against its Feature's approved contract of the same name. */
function supplierDifferences(dataRoot, scopeArg, name) {
  const scope = resolveScope(dataRoot, scopeArg);
  if (scope.family !== 'supplier') throw new ContractError('Supplier differences are read from a Supplier scope (supplier-features/<F>/suppliers/<S>).', 'INVALID_ARGUMENT');
  const featureScope = resolveScope(dataRoot, `supplier-features/${scope.feature}`, { mustExist: false });
  const sv = activeApproved(readRegistry(scope), name);
  const fv = activeApproved(readRegistry(featureScope), name);
  if (!sv || !fv) return { scope: scope.rel, name, supplier: scope.supplier, available: false, detail: `${!fv ? `${featureScope.rel} has no approved ${name}` : ''}${!fv && !sv ? '; ' : ''}${!sv ? `${scope.rel} has no approved ${name}` : ''}`, comparison: D.missingBaseline(name) };
  const comparison = D.compareContracts(loadModel(dataRoot, fv), loadModel(dataRoot, sv), { mode: 'supplier' });
  for (const i of comparison.items) i.supplier = scope.supplier;
  return { scope: scope.rel, name, supplier: scope.supplier, available: true, feature: ref(fv), supplierVersion: ref(sv), comparison };
}

module.exports = {
  SCHEMA, ROLES, OBSERVED_DECISIONS, IMPACT_DECISIONS, POLICY_MODES, ContractError,
  effectivePolicy, setPolicy, readProjectPolicy, apiCasesOf, importEndpoint,
  resolveScope, scopesForRoot, registryFile, readRegistry, loadModel, activeApproved,
  registerVersion, importApproved, analyzeContract, evidenceMatrix,
  acceptVersion, rejectVersion, reviewObserved, decideImpact, openImpact,
  findContradictions, decideContradiction, scopeStatus, contractGate, supplierDifferences, graphRootsFor,
};
