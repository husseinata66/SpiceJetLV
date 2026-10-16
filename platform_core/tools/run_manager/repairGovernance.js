// Repair governance — Stage 5H Self-Healing made safe, bounded, traceable and verified (Phase 6).
//
// WHY THIS EXISTS
// self-healing-skill states the rules of repair — human-invoked only, automation defects only, bounded
// attempts, evidence-derived confidence, never weaken an assertion, rerun before claiming success. Until
// now they were instructions. This module records a repair operation in the run state and refuses every
// step that breaks one of them, so a repair cannot reach "fixed" by skipping a rule.
//
// THE RECORD — run.json `stages['5H'].repairOperations[]`, one per human invocation, append-only:
//   invokedBy, reason, environment, scope (the failed tests named by the human, with their recorded
//   5A status and the fingerprint of the cycle that recorded it), classifications, attempts per test,
//   approvals, production access, knowledge promotions, and a log of every human decision.
//
// THE FLOW (cli.js state heal …), each step a recorded transition:
//   open        named human, explicit failed-automation scope, an environment            (§1, §8)
//   classify    confirm a test's failure class, with evidence                             (§2)
//   propose     an attempt: a patch, a strategy, evidence-cited confidence factors        (§3, §4, §5)
//   batch-approve / approve   the batch gate; plus per-repair approval for Medium/Low     (§4)
//   apply       records that an approved attempt was applied                              (§3)
//   validate    the rerun result, regression results, shared-component check              (§6)
//   prod-access a named human's approval of read-only diagnostics on production           (§8)
//   promote     verified repair knowledge, sanitized, with provenance                     (§7)
//   report      everything above, per test                                                (§9)
// It never edits code, never runs tests, and never invokes Stage 5H. It decides what may be recorded.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rs = require('./runState');

const { RunStateError } = rs;
const MAX_ATTEMPTS = 3;

/** Failure classes (§2). Only `automation` is ever eligible for a repair proposal. */
const CLASSES = Object.freeze(['application', 'automation', 'environment', 'infrastructure', 'test-data', 'unknown']);
const CLASS_OF_STATUS = Object.freeze({
  'Automation Failure': 'automation',
  'Application Failure': 'application',
  Failed: 'application',
  'Environment Failure': 'environment',
  'Infrastructure Failure': 'infrastructure',
  'Configuration Failure': 'infrastructure',
});
const FAILING = new Set([...Object.keys(CLASS_OF_STATUS), 'Inconclusive', 'Unrecognized', 'Unverified', 'Flaky', 'Blocked']);

// ---------------------------------------------------------------------------------------------
// Confidence (§4) — additive, cited, banded
// ---------------------------------------------------------------------------------------------

/** The evidence factors confidence is built from (self-healing-skill §9.2). */
const FACTORS = Object.freeze({
  'observed-root-cause': { min: 40, max: 60, label: 'root cause directly observed (log, trace, DOM, screenshot)' },
  'targets-root-cause': { min: 10, max: 15, label: 'the repair targets that observed root cause' },
  reproduced: { min: 10, max: 10, label: 'reproduced more than once with the same signature' },
  'kb-rule': { min: 15, max: 25, label: 'a confirmed Repair KB rule matches (scales with confirmations)' },
  'selector-verified': { min: 10, max: 10, label: 'a Selector Verification KB record, re-verified live' },
  'static-check': { min: 5, max: 5, label: 'statically verified (compiles / lints) before rerun' },
});
const BANDS = Object.freeze([{ band: 'High', min: 90 }, { band: 'Medium', min: 70 }, { band: 'Low', min: 0 }]);
const bandOf = (score) => BANDS.find((b) => score >= b.min).band;

/**
 * Confidence from cited evidence. Every factor needs a citation; a file it cites must exist inside the
 * run folder. No observed root cause → no base → the score is what the rest adds, which stays Low. A
 * novel pattern is capped at 60; nothing exceeds 95 before a rerun confirms it.
 * @param {Array<{factor: string, value?: number, citation: string}>} factors
 * @returns {{score: number, band: string, factors: object[], caps: string[]}}
 */
function computeConfidence(factors, { novel = false, runDir = null } = {}) {
  if (!Array.isArray(factors)) throw new RunStateError('Confidence needs its evidence factors.', 'MISSING_FIELD');
  // eslint-disable-next-line global-require
  const { checkEvidence } = require('./assertionEvidence');
  const out = [];
  const seen = new Set();
  for (const f of factors) {
    const def = FACTORS[f.factor];
    if (!def) throw new RunStateError(`Unknown confidence factor "${f.factor}". Known: ${Object.keys(FACTORS).join(', ')}.`, 'INVALID_ARGUMENT');
    if (seen.has(f.factor)) throw new RunStateError(`Confidence factor "${f.factor}" is given twice.`, 'INVALID_ARGUMENT');
    seen.add(f.factor);
    if (!f.citation || !String(f.citation).trim()) {
      throw new RunStateError(`Confidence factor "${f.factor}" has no citation — a percentage with no cited evidence is not a confidence value.`, 'UNCITED_FACTOR');
    }
    if (runDir) {
      const bad = checkEvidence(f.citation, { runDir, resultsDir: runDir }).filter((e) => e.status !== 'ok');
      if (bad.length) throw new RunStateError(`Confidence factor "${f.factor}" cites ${bad.map((b) => `"${b.ref}" (${b.status})`).join(', ')} — cited evidence must exist inside the run folder.`, 'UNCITED_FACTOR');
    }
    const value = f.value === undefined ? def.max : Number(f.value);
    if (!Number.isFinite(value) || value < def.min || value > def.max) {
      throw new RunStateError(`Confidence factor "${f.factor}" contributes ${def.min}${def.max !== def.min ? `–${def.max}` : ''}, not ${f.value}.`, 'INVALID_ARGUMENT');
    }
    out.push({ factor: f.factor, value, citation: String(f.citation).trim(), label: def.label });
  }
  let score = out.reduce((n, f) => n + f.value, 0);
  const caps = [];
  if (!seen.has('observed-root-cause')) caps.push('no observed root cause: no base contribution');
  if (novel && score > 60) { score = 60; caps.push('novel pattern: capped at 60'); }
  if (score > 95) { score = 95; caps.push('not rerun yet: capped at 95'); }
  return { score, band: bandOf(score), factors: out, caps };
}

// ---------------------------------------------------------------------------------------------
// Protected boundaries and assertion weakening (§5, §6) — read from the attempt's patch
// ---------------------------------------------------------------------------------------------

/** The files and lines a unified diff touches. */
function parsePatch(text) {
  const files = [];
  let cur = null;
  for (const line of String(text).replace(/\r\n?/g, '\n').split('\n')) {
    let m;
    if ((m = line.match(/^\+\+\+ (?:b\/)?(.+?)\s*$/))) {
      const p = m[1].trim();
      if (p === '/dev/null') { if (cur) cur.deleted = true; continue; }
      cur.path = p;
      continue;
    }
    if ((m = line.match(/^--- (?:a\/)?(.+?)\s*$/))) {
      cur = { path: m[1].trim() === '/dev/null' ? null : m[1].trim(), removed: [], added: [] };
      files.push(cur);
      continue;
    }
    if (!cur || line.startsWith('@@')) continue;
    if (line.startsWith('-')) cur.removed.push(line.slice(1));
    else if (line.startsWith('+')) cur.added.push(line.slice(1));
  }
  return files.filter((f) => f.path);
}

/** Paths a repair may never touch, whatever else allows it (§5). */
const PROTECTED = Object.freeze([
  { re: /(^|\/)test_design\//, why: 'a Stage 3 artifact (approved test cases, expected results, structured assertions)' },
  { re: /(^|\/)TestCases_[^/]*\.(md|xlsx)$/, why: 'an approved test suite' },
  { re: /(^|\/)(context|discovery)\//, why: 'a Stage 1–2 artifact (requirements, findings)' },
  { re: /(^|\/)knowledge_base\//, why: 'business requirements / project knowledge base' },
  { re: /(^|\/)supplier-features\/.*\/(supplier\.json|SupplierChecklist\.md|rules?[^/]*)$/i, why: 'Supplier-specific business rules' },
  { re: /(^|\/)(AutomationPlan_[^/]*|AutomationDecisionReport[^/]*)\.md$/, why: 'an approved Stage 4A artifact' },
  { re: /(^|\/)\.module_automation_state\.json$/, why: 'the Module Manager\'s approval record' },
  { re: /(^|\/)(modules|feature)\.json$/, why: 'Module Manager registry data' },
  { re: /(^|\/)\.env(\.|$)|(^|\/)[^/]*(prod|production)[^/]*\.(json|ya?ml|properties|conf|ini|env|xml|toml)$|(^|\/)config\/prod/i, why: 'production configuration' },
  { re: /(^|\/)runs\//, why: 'run evidence (immutable)' },
]);

/** Where a repair may write: the run's module automation projects, or the Workspace Automation Baseline. */
function allowedRoot(p, modules) {
  const rel = p.replace(/\\/g, '/');
  if (rel.startsWith('/') || /^[a-z]:\//i.test(rel) || rel.split('/').includes('..')) return false;
  return modules.some((m) => rel.startsWith(`modules/${m}/automation/`)) || rel.startsWith('automation_baseline/');
}

const ASSERT_RE = /\b(assert\w*|expect\s*\(|should\b|verify\w*\s*\(|softly\.|Assertions\.)/i;
const SKIP_RE = /(@Disabled|@Ignore\b|\b(test|it|describe)\.skip\b|\bx(it|describe|test)\s*\(|enabled\s*=\s*false|\bpending\s*\(|\.fixme\s*\(|\bskipTest\b|SkipException|Assume\.assume|\btest\.fail\s*\()/;
const SWALLOW_RE = /catch\s*(\([^)]*\))?\s*\{\s*\}|\.catch\s*\(\s*\(\s*\w*\s*\)\s*=>\s*(\{\s*\}|undefined|null)\s*\)/;
const STRONG_RE = /\b(toBe|toEqual|toStrictEqual|toHaveText|toHaveValue|assertEquals|isEqualTo|assertSame|toHaveURL|toHaveCount)\s*\(/;
const WEAK_RE = /\b(toContain|toBeTruthy|toBeDefined|toBeGreaterThan\(\s*0|assertNotNull|isNotNull|isNotEmpty|assertTrue\s*\(\s*true|toMatch\(\s*\/\.\*\/|not\.toBeNull)\b/;
const literals = (line) => [...String(line).matchAll(/"([^"\n]{2,})"|'([^'\n]{2,})'|`([^`\n]{2,})`/g)].map((m) => m[1] || m[2] || m[3]);

/**
 * What a patch would do to verification: removed assertions, added skips or swallowed errors, a strong
 * matcher replaced by a weak one, an asserted value changed, or an approved expected value removed.
 * @param {object[]} files parsePatch()
 * @param {string[]} protectedValues approved expected values (structured assertions, quoted literals)
 * @returns {string[]} reasons — empty when the patch keeps verification as strong as it was
 */
function weakeningOf(files, protectedValues = []) {
  const reasons = [];
  for (const f of files) {
    const removedAsserts = f.removed.filter((l) => ASSERT_RE.test(l));
    const addedAsserts = f.added.filter((l) => ASSERT_RE.test(l));
    if (addedAsserts.length < removedAsserts.length) reasons.push(`${f.path}: removes ${removedAsserts.length - addedAsserts.length} assertion(s)`);
    for (const l of f.added) {
      if (SKIP_RE.test(l)) reasons.push(`${f.path}: skips verification (${l.trim().slice(0, 60)})`);
      if (SWALLOW_RE.test(l)) reasons.push(`${f.path}: swallows an error (${l.trim().slice(0, 60)})`);
    }
    if (removedAsserts.some((l) => STRONG_RE.test(l)) && addedAsserts.some((l) => WEAK_RE.test(l))) {
      reasons.push(`${f.path}: replaces an exact assertion with a weaker one`);
    }
    const kept = new Set(addedAsserts.flatMap(literals));
    for (const v of new Set(removedAsserts.flatMap(literals))) {
      if (!kept.has(v)) reasons.push(`${f.path}: changes an asserted value ("${v}")`);
    }
    const before = f.removed.join('\n');
    const after = f.added.join('\n');
    for (const v of protectedValues) {
      if (v && before.includes(v) && !after.includes(v)) reasons.push(`${f.path}: removes the approved expected value "${v}"`);
      // Writing the approved value into the automation's own code (a fallback, a default, a stub) makes
      // the test supply its own expected result — whatever the helper that asserts it is called (Phase 6.2).
      if (v && after.includes(v) && !before.includes(v)) reasons.push(`${f.path}: writes the approved expected value "${v}" into the automation — the test would supply its own result`);
    }
    // An added error handler that never rethrows can turn any failure into a pass — not only an empty
    // catch: a catch that returns a fallback does the same (Phase 6.2, found by end-to-end validation).
    // The rethrow must be inside the handler itself: its block, from the catch to the brace that closes it.
    f.added.forEach((l, i) => {
      if (!/\bcatch\s*(\(|\{)|\.catch\s*\(/.test(l)) return;
      let depth = 0;
      let opened = false;
      let rethrows = false;
      for (let j = i; j < f.added.length; j += 1) {
        const line = j === i ? l.slice(l.search(/catch/)) : f.added[j];
        if (/\bthrow\b|\breject\s*\(/.test(line)) rethrows = true;
        for (const ch of line) {
          if (ch === '{' || ch === '(') { depth += 1; opened = true; }
          if (ch === '}' || ch === ')') depth -= 1;
        }
        if (opened && depth <= 0) break;
      }
      if (!rethrows) reasons.push(`${f.path}: adds an error handler that does not rethrow — a failure could be swallowed`);
    });
  }
  return [...new Set(reasons)];
}

const SHARED_RE = /(^|\/)(shared|common|base|core|utils?|helpers?|components?|fixtures|support)\//i;

// ---------------------------------------------------------------------------------------------
// Phase 6.1 — cumulative attempts, failure fingerprints, environment, ownership
// ---------------------------------------------------------------------------------------------

/** What a failure looks like: its recorded status and reason. A changed fingerprint is a different failure. */
const failureFingerprint = (t) => crypto.createHash('sha256').update(`${t.final}|${String(t.reason || '').replace(/\s+/g, ' ').trim()}`).digest('hex').slice(0, 16);

const sameScope = (a, b) => {
  if (a.scopeFamily || b.scopeFamily) return a.scopeFamily === b.scopeFamily && a.feature === b.feature && (a.supplier || a.sharedScope) === (b.supplier || b.sharedScope);
  const ma = Array.isArray(a.modules) ? a.modules : [];
  const mb = Array.isArray(b.modules) ? b.modules : [];
  return ma.some((m) => mb.includes(m));
};

/**
 * Every repair attempt, quarantine and budget grant for a test, across every repair operation of this
 * run AND of every other run of the same module / Supplier scope (inside the run state model). The budget
 * window opens at the latest recorded grant; there is no other way to open it.
 * @returns {{attempts: object[], quarantines: object[], grants: object[], windowStart: string|null, inWindow: object[], unsuccessful: object[], quarantine: object|null}}
 */
function attemptHistory(runsDir, folderName, meta, testCaseId) {
  const runs = [];
  try {
    for (const e of fs.readdirSync(runsDir, { withFileTypes: true })) {
      if (!e.isDirectory() || e.name === folderName) continue;
      try {
        const m = JSON.parse(fs.readFileSync(path.join(runsDir, e.name, 'metadata', 'run.json'), 'utf8'));
        if (m.stateSchemaVersion && sameScope(m, meta)) runs.push([e.name, m]);
      } catch { /* not a run */ }
    }
  } catch { /* no runs dir */ }
  runs.push([folderName, meta]);
  const attempts = [];
  const quarantines = [];
  const grants = [];
  for (const [run, m] of runs) {
    const s = (m.stages || {})['5H'] || {};
    for (const op of s.repairOperations || []) {
      const fp = (op.scope.find((x) => x.testCaseId === testCaseId) || {}).failureFingerprint || null;
      for (const a of (op.attempts || {})[testCaseId] || []) attempts.push({ run, operation: op.id, n: a.n, at: a.at, status: a.status, result: a.result, failureFingerprint: fp });
    }
    for (const q of s.repairQuarantine || []) if (q.testCaseId === testCaseId) quarantines.push({ run, ...q });
    for (const g of s.repairBudgetGrants || []) if (g.testCaseId === testCaseId) grants.push({ run, ...g });
  }
  const byTime = (x, y) => (x.at < y.at ? -1 : x.at > y.at ? 1 : 0);
  attempts.sort(byTime); quarantines.sort(byTime); grants.sort(byTime);
  const windowStart = grants.length ? grants[grants.length - 1].at : null;
  const inWindow = attempts.filter((a) => !windowStart || a.at > windowStart);
  const unsuccessful = inWindow.filter((a) => a.result && a.result !== 'fixed');
  const q = quarantines.filter((x) => !windowStart || x.at > windowStart);
  return { attempts, quarantines, grants, windowStart, inWindow, unsuccessful, quarantine: q.length ? q[q.length - 1] : null };
}

/**
 * The declared environment against the approved configuration: the Run Configuration (the project's
 * execution_safety_policy.json `environment`, with its aliases), an environment the run records, and an
 * environment class the Project Context names. A URL is never evidence of an environment class. With no
 * source, or one that disagrees, the environment is RESTRICTED — treated like production.
 */
function verifyEnvironment(dataRoot, meta, declaredRaw) {
  // eslint-disable-next-line global-require
  const { normalizeEnvironment } = require('../execution_safety/schema');
  let policy = null;
  try { policy = JSON.parse(fs.readFileSync(path.join(dataRoot, 'knowledge_base', 'execution_safety_policy.json'), 'utf8')); } catch { /* none */ }
  const declared = normalizeEnvironment(declaredRaw, policy).environment;
  const sources = [];
  if (policy && policy.environment) sources.push({ source: 'knowledge_base/execution_safety_policy.json', environment: normalizeEnvironment(policy.environment, policy).environment });
  if (meta.environment) sources.push({ source: 'run.json environment', environment: normalizeEnvironment(meta.environment, policy).environment });
  try {
    // eslint-disable-next-line global-require
    const { resolveScopeRoots } = require('./stageGate');
    for (const root of resolveScopeRoots(meta, dataRoot).roots) {
      const pc = path.join(root.dir, 'context', 'ProjectContext.md');
      let text = '';
      try { text = fs.readFileSync(pc, 'utf8'); } catch { continue; }
      const m = text.match(/^\|\s*(?:Environment|Target Environment|Environment Class)\s*\|\s*([^|\n]+?)\s*\|/im);
      if (!m || /:\/\//.test(m[1])) continue;
      const env = normalizeEnvironment(m[1].replace(/[`*]/g, ''), policy);
      if (env.recognised) sources.push({ source: path.relative(dataRoot, pc).replace(/\\/g, '/'), environment: env.environment });
    }
  } catch { /* no scope */ }
  const disagree = sources.filter((s) => s.environment !== declared);
  const status = !sources.length ? 'unverified' : disagree.length ? 'inconsistent' : 'verified';
  const restricted = status !== 'verified' || declared === 'Production' || declared === 'Unknown';
  return { declared, status, restricted, sources };
}

/**
 * Whether each changed path is a shared automation component, and that none is another module's code:
 * the Workspace Automation Baseline's `.baseline_ownership.json` (automation_lifecycle/baselineOwnership)
 * decides for baseline files — `shared`, or `foreign` (refused); folder names are the fallback where no
 * ownership metadata covers a path.
 * @returns {{shared: Array<{path: string, by: string}>, foreign: Array<{path: string, owner: string}>}}
 */
function ownershipOf(dataRoot, files, modules) {
  // eslint-disable-next-line global-require
  const { readOwnership, classifyPath } = require('../automation_lifecycle/baselineOwnership');
  const shared = [];
  const foreign = [];
  for (const f of files) {
    let classified = null;
    if (f.startsWith('automation_baseline/')) {
      // The manifest sits at the baseline project's root: the nearest ancestor holding one.
      let dir = path.dirname(path.resolve(dataRoot, f));
      const stop = path.resolve(dataRoot, 'automation_baseline');
      while (dir.startsWith(stop) && !fs.existsSync(path.join(dir, '.baseline_ownership.json'))) dir = path.dirname(dir);
      const manifest = dir.startsWith(stop) ? readOwnership(dir) : null;
      if (manifest) {
        const rel = path.relative(dir, path.resolve(dataRoot, f)).replace(/\\/g, '/');
        const res = modules.map((m) => classifyPath(manifest, rel, m));
        if (res.some((r) => r.classification === 'owned')) classified = 'owned';
        else if (res.some((r) => r.classification === 'foreign')) { foreign.push({ path: f, owner: res.find((r) => r.classification === 'foreign').owner }); continue; }
        else if (res.some((r) => r.classification === 'shared')) { shared.push({ path: f, by: 'baseline ownership manifest' }); continue; }
      }
    }
    if (!classified && SHARED_RE.test(f)) shared.push({ path: f, by: 'folder name' });
  }
  return { shared, foreign };
}

/** The root a changed file belongs to: its module's automation folder, or its baseline project. */
function scopeRootOf(dataRoot, f) {
  const m = f.match(/^(modules\/[^/]+\/automation)\//);
  if (m) return m[1];
  const parts = f.split('/');
  return parts.length > 2 ? parts.slice(0, 3).join('/') : parts.slice(0, 2).join('/');
}

// ---------------------------------------------------------------------------------------------
// Knowledge Base sanitization (§7)
// ---------------------------------------------------------------------------------------------

const SECRET_PATTERNS = Object.freeze([
  // Private keys (Phase 9.5, R-06): a whole PEM/PGP block (RSA, EC, DSA, OPENSSH, ENCRYPTED, PGP ... BLOCK), a
  // header whose block was cut off, and PuTTY key files. Reported by kind and count only, never by content.
  ['private-key', /-----BEGIN [A-Z0-9 ]*PRIVATE KEY(?: BLOCK)?-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY(?: BLOCK)?-----/g],
  ['private-key', /-----BEGIN [A-Z0-9 ]*PRIVATE KEY(?: BLOCK)?-----[\s\S]*?(?=\n[ \t]*\n|$)/g], // cut-off block: up to a blank line or the end
  ['private-key', /PuTTY-User-Key-File-\d+:[^\n]*/g],
  ['authorization', /\b(authorization|proxy-authorization)\s*[:=]\s*[^\n]+/gi],
  ['bearer-token', /\bbearer\s+[A-Za-z0-9._~+/=-]{8,}/gi],
  ['jwt', /\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}/g],
  ['aws-key', /\bAKIA[0-9A-Z]{16}\b/g],
  ['credential', /\b(api[_-]?key|secret|token|password|passwd|pwd|client[_-]?secret|access[_-]?key)\b(\s*["']?\s*[:=]\s*)["']?[^\s"',;]+/gi],
  ['cookie', /\b(set-)?cookie\s*:\s*[^\n]+/gi],
  ['email', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g],
  ['card-number', /\b(?:\d[ -]?){13,16}\b/g],
  ['phone', /\+?\d[\d\s().-]{8,}\d/g],
]);

/**
 * Removes credentials, tokens and personal data from text that may become knowledge.
 * @returns {{text: string, redactions: Record<string, number>}}
 */
function sanitizeKnowledge(text) {
  let out = String(text ?? '');
  const redactions = {};
  for (const [kind, re] of SECRET_PATTERNS) {
    out = out.replace(re, (m, k, sep) => {
      redactions[kind] = (redactions[kind] || 0) + 1;
      return kind === 'credential' ? `${k}${sep}[REDACTED:${kind}]` : `[REDACTED:${kind}]`;
    });
  }
  return { text: out, redactions };
}

// ---------------------------------------------------------------------------------------------
// The record
// ---------------------------------------------------------------------------------------------

function currentOp(stage) {
  const ops = (stage && stage.repairOperations) || [];
  const op = ops[ops.length - 1];
  if (!op || op.status !== 'open') throw new RunStateError('No open repair operation. A named human opens one: state heal open --by "<name>" --tests … --environment … --reason "…".', 'NO_REPAIR_OPERATION');
  return op;
}
function stage5H(meta) {
  const s = meta.stages && meta.stages['5H'];
  if (!s || s.status === 'Not Started') throw new RunStateError('Stage 5H has not started. It starts only on an explicit human invocation: state start 5H --invocation Direct.', 'ILLEGAL_TRANSITION');
  if (s.invocationPath === 'Pipeline') throw new RunStateError('Stage 5H never runs as a pipeline step (pipeline.md §3.6).', 'ILLEGAL_TRANSITION');
  return s;
}
const decide = (op, ts, by, decision, detail) => { op.decisions.push({ at: ts, by, decision, ...(detail ? { detail } : {}) }); };
function attemptOf(op, testCaseId, n) {
  const list = op.attempts[testCaseId] || [];
  const a = list.find((x) => x.n === Number(n));
  if (!a) throw new RunStateError(`${testCaseId} has no attempt ${n} in this repair operation.`, 'NO_ATTEMPT');
  return a;
}
function inScope(op, testCaseId) {
  const t = op.scope.find((x) => x.testCaseId === testCaseId);
  if (!t) throw new RunStateError(`${testCaseId} is not in this repair operation's scope (${op.scope.map((x) => x.testCaseId).join(', ')}).`, 'OUT_OF_SCOPE');
  return t;
}
function isProductionLike(env) {
  return env === 'Production' || env === 'Unknown';
}

/**
 * Is the repair rerun mutating? (Phase 9.3, F-19.) Decided by the Execution Safety policy, not only by the
 * caller: the Stage 5H Safety Preflight evaluated every intended operation against the policy and recorded
 * whether each one mutates. A declared `--mutating` can only make it stricter. With no confirmed 5H preflight
 * nothing shows the rerun is read-only, so it counts as mutating (fail-closed) — a restricted environment
 * then refuses it.
 * @returns {{mutating: boolean, basis: string, preflight: string|null}}
 */
function rerunMutation(runsDir, folderName, meta, declared) {
  const records = (meta.safetyPreflights || []).filter((r) => r.stageId === '5H');
  const pf = [...records].reverse().find((r) => r.decision === 'confirmed') || null;
  if (!pf) {
    return { mutating: true, basis: declared ? 'declared mutating' : 'no confirmed Stage 5H Safety Preflight shows the rerun is read-only', preflight: null };
  }
  const ops = (pf.operations || []).filter((o) => o.mutating).map((o) => o.action);
  if (ops.length) return { mutating: true, basis: `the Stage 5H Safety Preflight ${pf.id} records mutating operation(s): ${[...new Set(ops)].join(', ')}`, preflight: pf.id };
  if (declared) return { mutating: true, basis: 'declared mutating', preflight: pf.id };
  return { mutating: false, basis: `the Stage 5H Safety Preflight ${pf.id} records read-only operations only`, preflight: pf.id };
}

/**
 * Opens a repair operation (§1, §8): a named human, an explicit list of failed tests from this run's
 * latest 5A (or 5H) outcome, the environment the reruns would use, and a reason.
 */
function openRepairOperation(runsDir, folderName, opts = {}) {
  const { now } = opts;
  rs.assertDate(now, 'openRepairOperation');
  const by = rs.requireApprover(opts.by, 'by', 'openRepairOperation', 'Self-Healing is invoked by a named human, never automatically');
  const reason = rs.requireText(opts.reason, 'reason', 'openRepairOperation');
  const tests = [...new Set((opts.tests || []).map((x) => String(x).trim()).filter(Boolean))];
  if (!tests.length) throw new RunStateError('A repair operation names the failed automation tests it covers (--tests TC-…); it never widens to "all failures" by itself.', 'MISSING_FIELD');
  // eslint-disable-next-line global-require
  const { normalizeEnvironment } = require('../execution_safety/schema');
  const env = normalizeEnvironment(opts.environment).environment;
  return rs.applyChange(runsDir, folderName, opts, (meta, ts) => {
    const stage = stage5H(meta);
    const ops = stage.repairOperations || [];
    if (ops.length && ops[ops.length - 1].status === 'open') throw new RunStateError('A repair operation is already open in this run; resume it, or close it first.', 'OPERATION_OPEN');
    const source = ['5H', '5A'].map((id) => meta.stages[id] && meta.stages[id].outcome).find(Boolean);
    if (!source || !source.tests) throw new RunStateError('No recorded execution outcome to repair from — record Stage 5A\'s outcome first (state outcome 5A --from-results).', 'NO_RESULTS');
    const scope = tests.map((id) => {
      const t = source.tests.find((x) => x.testCaseId === id);
      if (!t) throw new RunStateError(`${id} has no result in the recorded outcome.`, 'OUT_OF_SCOPE');
      if (!FAILING.has(t.final)) throw new RunStateError(`${id} reads ${t.final} — only a failed result is in a repair scope.`, 'OUT_OF_SCOPE');
      const cycle = (source.cycles || []).find((c) => String(t.cycles[t.cycles.length - 1]).startsWith(`${c.cycle}:`)) || (source.cycles || [])[0];
      return {
        testCaseId: id, recorded: t.final, recordedClass: CLASS_OF_STATUS[t.final] || 'unknown',
        ...(t.reason ? { recordedReason: t.reason } : {}), failureFingerprint: failureFingerprint(t),
        evidence: cycle ? { file: cycle.file, sha256: cycle.sha256 } : null,
      };
    });
    const environmentCheck = verifyEnvironment(path.dirname(runsDir), meta, opts.environment);
    const op = {
      id: `RO-${ops.length + 1}`, status: 'open', invokedBy: by, invokedAt: ts, reason, environment: env, environmentCheck,
      scope, classifications: {}, attempts: {}, batchApprovals: [], productionAccess: [], promotions: [], decisions: [],
    };
    for (const t of scope) op.classifications[t.testCaseId] = { class: t.recordedClass, confirmed: false, source: 'recorded 5A status' };
    decide(op, ts, by, 'opened', `${tests.join(', ')} on ${env}: ${reason}`);
    stage.repairOperations = [...ops, op];
    return { stageId: '5H', by, reason, transition: `Stage 5H: repair operation ${op.id} opened by ${by} for ${tests.join(', ')} (${env})` };
  });
}

/**
 * Confirms (or corrects) a test's failure class, with evidence (§2). An application defect is never
 * reclassified as an automation defect here — that is a different workflow's decision (a new Stage 5A
 * classification), so it is refused. Automation → anything else is allowed and stops repair for it.
 */
function classifyFailure(runsDir, folderName, opts = {}) {
  const { now, testCaseId } = opts;
  rs.assertDate(now, 'classifyFailure');
  const by = rs.requireText(opts.by, 'by', 'classifyFailure');
  const evidence = rs.requireText(opts.evidence, 'evidence', 'classifyFailure', 'a classification is backed by cited evidence');
  if (!CLASSES.includes(opts.class)) throw new RunStateError(`Failure class is one of: ${CLASSES.join(', ')}.`, 'INVALID_ARGUMENT');
  // Evidence is a file inside this run — a trace, a log, a DOM snapshot — never an explanation alone.
  // eslint-disable-next-line global-require
  const { checkEvidence } = require('./assertionEvidence');
  const runDir = path.join(runsDir, folderName);
  const refs = checkEvidence(evidence, { runDir, resultsDir: runDir });
  if (!refs.length) throw new RunStateError(`A classification cites evidence files inside this run (a trace, log, DOM snapshot …): "${evidence}" names none — an explanation alone is not verified evidence.`, 'EVIDENCE_REQUIRED');
  const bad = refs.filter((r) => r.status !== 'ok');
  if (bad.length) throw new RunStateError(`Classification evidence ${bad.map((r) => `"${r.ref}" (${r.status})`).join(', ')} — every cited file must exist inside this run.`, 'EVIDENCE_REQUIRED');
  return rs.applyChange(runsDir, folderName, opts, (meta, ts) => {
    const op = currentOp(stage5H(meta));
    const t = inScope(op, testCaseId);
    // Supported reclassifications. A recorded automation or unknown failure may be classified as anything
    // the evidence shows. An application failure stays one here; an environment or infrastructure failure
    // may be refined among the non-defect classes — neither ever becomes an automation (or application)
    // defect inside Self-Healing: that is the execution record's correction to make.
    const allowed = {
      automation: CLASSES, unknown: CLASSES,
      application: ['application'],
      environment: ['environment', 'infrastructure', 'test-data', 'unknown'],
      infrastructure: ['environment', 'infrastructure', 'test-data', 'unknown'],
      'test-data': ['test-data', 'environment', 'unknown'],
    }[t.recordedClass] || ['unknown'];
    if (!allowed.includes(opts.class)) {
      throw new RunStateError(
        `${testCaseId} was recorded as ${t.recorded} (${t.recordedClass}). Self-Healing does not reclassify it as ${opts.class}` +
        `${opts.class === 'automation' ? ' — that would turn a finding into a repair' : ''}. If the recorded class is wrong, a human corrects it ` +
        'in the execution record (a new Stage 5A classification), not here.',
        'RECLASSIFICATION_REFUSED'
      );
    }
    const prior = op.classifications[testCaseId];
    op.classifications[testCaseId] = { class: opts.class, confirmed: true, by, at: ts, evidence, evidenceFiles: refs.map((r) => ({ ref: r.ref, sha256: require('./repairPatch').sha(fs.readFileSync(r.path)) })), previous: prior };
    decide(op, ts, by, 'classified', `${testCaseId}: ${prior.class} → ${opts.class} (${evidence})`);
    return { stageId: '5H', by, transition: `Stage 5H: ${testCaseId} classified ${opts.class}${prior.class !== opts.class ? ` (was ${prior.class})` : ''}` };
  });
}

/** Approved expected values for a test: its structured assertions and quoted Expected Result values. */
function protectedValuesFor(runsDir, folderName, meta, testCaseId) {
  try {
    // eslint-disable-next-line global-require
    const { suiteIndex } = require('./executionHistory');
    // eslint-disable-next-line global-require
    const { requiredLiterals } = require('./assertionEvidence');
    const idx = suiteIndex(meta, path.dirname(runsDir), path.join(runsDir, folderName), '5A');
    const id = testCaseId.includes(':') ? testCaseId.split(':').pop() : testCaseId;
    const tc = [...idx.cases.entries()].find(([k]) => k === testCaseId || k.endsWith(`:${id}`));
    if (!tc) return [];
    const strip = (v) => String(v).replace(/[`"“”]/g, '').trim();
    return [...new Set([...(tc[1].design || []).map((d) => strip(d.expected)), ...requiredLiterals(tc[1].expectedResult)].filter((v) => v.length >= 2))];
  } catch { return []; }
}

/**
 * Proposes a repair attempt (§3–§5): only for a confirmed automation defect, at most three per test in
 * this operation, a patch confined to automation code that keeps verification as strong as it was, and
 * a confidence built from cited evidence.
 */
function proposeRepair(runsDir, folderName, opts = {}) {
  const { now, testCaseId } = opts;
  rs.assertDate(now, 'proposeRepair');
  const by = rs.requireText(opts.by, 'by', 'proposeRepair');
  const strategy = rs.requireText(opts.strategy, 'strategy', 'proposeRepair');
  const reason = rs.requireText(opts.reason, 'reason', 'proposeRepair', 'each attempt records why this change addresses the root cause');
  const patchRef = rs.requireText(opts.patch, 'patch', 'proposeRepair', 'the attempted change is a patch (unified diff) inside the run folder');
  // Root Cause Confidence gate (pipeline.md §5.6 rule 4, self-healing-skill §2.1 rule 3 and §7.1 — Phase 9.3,
  // F-19): only a High root-cause confidence may propose a repair. Medium or Low permits diagnosis only,
  // which changes nothing and is never recorded as an attempt. This is a separate, earlier judgment from
  // the repair-confidence band below (whose Medium/Low still need their own named approval at apply).
  const rootCause = String(opts.rootCauseConfidence ?? '').trim();
  if (!rootCause) {
    throw new RunStateError('proposeRepair requires `rootCauseConfidence` (High | Medium | Low) — state why the failure is understood before proposing to change code (self-healing-skill §7.1).', 'MISSING_FIELD');
  }
  const rcBand = ['High', 'Medium', 'Low'].find((b) => b.toLowerCase() === rootCause.toLowerCase());
  if (!rcBand) throw new RunStateError(`Root Cause Confidence "${rootCause}" is not High, Medium or Low.`, 'INVALID_ARGUMENT');
  if (rcBand !== 'High') {
    throw new RunStateError(`Repair refused — Root Cause Confidence is ${rcBand}. Below High, the only permitted action is diagnosis (gather evidence, change nothing); a repair now would be a guess (pipeline.md §5.6 rule 4, self-healing-skill §7.1). Propose the repair once diagnosis makes the root cause High.`, 'DIAGNOSIS_ONLY');
  }
  // "High" means the evidence directly explains the failure (§7.1) — the root cause was OBSERVED, not
  // inferred. A High claim without the cited observed-root-cause factor contradicts itself.
  if (!(opts.factors || []).some((f) => f && f.factor === 'observed-root-cause')) {
    throw new RunStateError('Repair refused — Root Cause Confidence High needs the observed root cause cited (factor observed-root-cause: the log, trace, DOM snapshot or screenshot that shows it). An inferred cause is Medium at most: diagnose first (self-healing-skill §7.1, §9.2).', 'DIAGNOSIS_ONLY');
  }
  const dataRoot = path.dirname(runsDir);
  const runDir = path.join(runsDir, folderName);
  return rs.applyChange(runsDir, folderName, opts, (meta, ts) => {
    const op = currentOp(stage5H(meta));
    inScope(op, testCaseId);
    const cls = op.classifications[testCaseId];
    if (cls.class !== 'automation') {
      throw new RunStateError(`${testCaseId} is classified ${cls.class}${cls.confirmed ? '' : ' (recorded, not yet confirmed)'} — only a confirmed automation defect is eligible for a repair proposal.`, 'NOT_ELIGIBLE');
    }
    if (!cls.confirmed) throw new RunStateError(`${testCaseId}'s automation classification is not confirmed with evidence yet (state heal classify).`, 'NOT_ELIGIBLE');
    const prior = op.attempts[testCaseId] || [];
    if (prior.some((a) => a.result === 'fixed')) throw new RunStateError(`${testCaseId} is already repaired and validated in this operation.`, 'ALREADY_REPAIRED');
    // The budget is cumulative (Phase 6.1): every operation of this run, and of every earlier run of the
    // same scope, counts — since the last recorded budget grant, and only that.
    const hist = attemptHistory(runsDir, folderName, meta, testCaseId);
    if (hist.quarantine) {
      throw new RunStateError(`${testCaseId} is quarantined (run ${hist.quarantine.run}, ${hist.quarantine.at}: ${hist.quarantine.reason}). No further repair is proposed for it; a fresh budget is a named human's recorded decision (state heal grant-budget).`, 'QUARANTINED');
    }
    if (hist.inWindow.length >= MAX_ATTEMPTS) {
      throw new RunStateError(`${testCaseId} has had ${hist.inWindow.length} repair attempts (${hist.inWindow.map((a) => `${a.run === folderName ? '' : `${a.run} `}${a.operation}#${a.n}`).join(', ')}); a fourth is refused. Quarantine it and refer it to a human (self-healing-skill §14).`, 'REPAIR_ATTEMPT_LIMIT');
    }
    if (prior.some((a) => ['proposed', 'approved', 'applied'].includes(a.status))) throw new RunStateError(`${testCaseId} has an attempt still in progress — validate or abandon it first.`, 'ATTEMPT_OPEN');
    // The patch — inside the run folder, read once and fingerprinted.
    const patchFile = path.resolve(dataRoot, patchRef);
    if (path.relative(runDir, patchFile).startsWith('..')) throw new RunStateError(`The patch must be inside this run folder (${patchRef}).`, 'OUTSIDE_RUN');
    let patchText;
    try { patchText = fs.readFileSync(patchFile, 'utf8'); } catch { throw new RunStateError(`Patch ${patchRef} not found.`, 'MISSING_ARTIFACT'); }
    // eslint-disable-next-line global-require
    const rp = require('./repairPatch');
    const diff = rp.parseUnifiedDiff(patchText);
    const files = diff.map((f) => ({ path: f.path, removed: f.hunks.flatMap((h) => h.lines.filter((l) => l.t === '-').map((l) => l.s)), added: f.hunks.flatMap((h) => h.lines.filter((l) => l.t === '+').map((l) => l.s)) }));
    if (!files.length) throw new RunStateError(`Patch ${patchRef} changes no file.`, 'INVALID_ARGUMENT');
    const modules = Array.isArray(meta.modules) ? meta.modules : [];
    const protectedHits = [];
    for (const f of files) {
      const hit = PROTECTED.find((p) => p.re.test(f.path));
      if (hit) protectedHits.push(`${f.path} — ${hit.why}`);
      else if (!allowedRoot(f.path, modules)) protectedHits.push(`${f.path} — outside the automation code a repair may change (application source, configuration, or another module)`);
    }
    if (protectedHits.length) {
      throw new RunStateError(`Repair refused — it would change protected files: ${protectedHits.join('; ')}. Such a change belongs to its owning workflow (Stage 3, the requirement owner, the Supplier rules, or the application team), never to Self-Healing.`, 'PROTECTED_BOUNDARY');
    }
    const weakening = weakeningOf(files, protectedValuesFor(runsDir, folderName, meta, testCaseId));
    if (weakening.length) {
      throw new RunStateError(`Repair refused — it weakens or skips verification: ${weakening.join('; ')}. A repair changes how the test interacts with the application, never what it asserts (self-healing-skill §8.1).`, 'ASSERTION_WEAKENING');
    }
    // Ownership: another module's baseline code is refused; shared components are declared from the
    // baseline ownership manifest where it covers the path, from folder names otherwise.
    const owner = ownershipOf(dataRoot, files.map((f) => f.path), modules);
    if (owner.foreign.length) {
      throw new RunStateError(`Repair refused — it would change another module's code: ${owner.foreign.map((x) => `${x.path} (owned by ${x.owner})`).join(', ')} (baseline ownership manifest).`, 'PROTECTED_BOUNDARY');
    }
    const confidence = computeConfidence(opts.factors || [], { novel: Boolean(opts.novel), runDir });
    // The patch must apply to the files as they are now; the exact expected result of each is recorded,
    // the original content is kept, and every file of the automation scope it touches is fingerprinted
    // so a change the patch does not name is detectable later.
    let plan;
    try { plan = rp.planPatch(dataRoot, diff); } catch (err) {
      throw new RunStateError(`Patch ${patchRef} does not apply to the files on disk: ${err.message}.`, 'PATCH_DOES_NOT_APPLY');
    }
    for (const f of plan) {
      if (f.beforeText === null) continue;
      const keep = path.join(runDir, 'self_healing', 'originals', `${f.before}.txt`);
      if (!fs.existsSync(keep)) { fs.mkdirSync(path.dirname(keep), { recursive: true }); fs.writeFileSync(keep, f.beforeText); }
    }
    const roots = [...new Set(plan.map((f) => scopeRootOf(dataRoot, f.path)))];
    const trees = Object.fromEntries(roots.map((r) => [r, rp.treeFingerprints(dataRoot, r)]));
    const attempt = {
      n: prior.length + 1, budgetSlot: hist.inWindow.length + 1, status: 'proposed', at: ts, by, strategy, reason, rootCauseConfidence: rcBand,
      patch: {
        file: path.relative(dataRoot, patchFile).replace(/\\/g, '/'), sha256: crypto.createHash('sha256').update(patchText.replace(/\r\n/g, '\n')).digest('hex'),
        files: files.map((f) => f.path),
        plan: plan.map(({ beforeText, ...rest }) => ({ ...rest, ...(rest.before ? { original: `runs/${folderName}/self_healing/originals/${rest.before}.txt` } : {}) })),
        scopeTrees: trees,
      },
      sharedComponents: owner.shared.map((x) => x.path), sharedBy: owner.shared, confidence, approval: null, applied: null, validation: null, result: null,
    };
    op.attempts[testCaseId] = [...prior, attempt];
    decide(op, ts, by, 'proposed', `${testCaseId} attempt ${attempt.n}: ${strategy} — confidence ${confidence.score} (${confidence.band})`);
    return { stageId: '5H', by, transition: `Stage 5H: ${testCaseId} repair attempt ${attempt.n}/${MAX_ATTEMPTS} proposed (${confidence.band} ${confidence.score})` };
  });
}

/** The batch gate (self-healing-skill §6.2): one named approval of the proposed attempts it lists. */
function batchApprove(runsDir, folderName, opts = {}) {
  const { now } = opts;
  rs.assertDate(now, 'batchApprove');
  const by = rs.requireApprover(opts.by, 'by', 'batchApprove', 'the batch gate is answered by a named human; silence is not approval');
  return rs.applyChange(runsDir, folderName, opts, (meta, ts) => {
    const op = currentOp(stage5H(meta));
    const covered = Object.entries(op.attempts).flatMap(([tc, list]) => list.filter((a) => a.status === 'proposed').map((a) => ({ testCaseId: tc, n: a.n })));
    if (!covered.length) throw new RunStateError('No proposed attempt to approve.', 'NOTHING_TO_APPROVE');
    op.batchApprovals.push({ at: ts, by, covers: covered });
    decide(op, ts, by, 'batch-approved', covered.map((c) => `${c.testCaseId}#${c.n}`).join(', '));
    return { stageId: '5H', by, transition: `Stage 5H: repair batch approved by ${by} (${covered.length} attempt(s))` };
  });
}

/** The individual approval a Medium or Low confidence repair needs, besides the batch gate (§4). */
function approveRepair(runsDir, folderName, opts = {}) {
  const { now, testCaseId } = opts;
  rs.assertDate(now, 'approveRepair');
  const by = rs.requireApprover(opts.by, 'by', 'approveRepair', 'a Medium or Low confidence repair is approved by a named human, explicitly');
  return rs.applyChange(runsDir, folderName, opts, (meta, ts) => {
    const op = currentOp(stage5H(meta));
    const a = attemptOf(op, testCaseId, opts.attempt);
    if (a.status !== 'proposed') throw new RunStateError(`${testCaseId} attempt ${a.n} is ${a.status}, not proposed.`, 'ILLEGAL_TRANSITION');
    a.approval = { by, at: ts, band: a.confidence.band };
    decide(op, ts, by, 'repair-approved', `${testCaseId}#${a.n} (${a.confidence.band} ${a.confidence.score})`);
    return { stageId: '5H', by, transition: `Stage 5H: ${testCaseId} attempt ${a.n} approved by ${by} (${a.confidence.band})` };
  });
}

/**
 * Records that an attempt was applied (§3). Refused unless the batch gate covered it and — for Medium
 * or Low confidence — a named human approved it on its own. High confidence never skips the batch gate.
 */
function applyRepair(runsDir, folderName, opts = {}) {
  const { now, testCaseId } = opts;
  rs.assertDate(now, 'applyRepair');
  const by = rs.requireText(opts.by, 'by', 'applyRepair');
  return rs.applyChange(runsDir, folderName, opts, (meta, ts) => {
    const op = currentOp(stage5H(meta));
    const a = attemptOf(op, testCaseId, opts.attempt);
    if (a.status !== 'proposed') throw new RunStateError(`${testCaseId} attempt ${a.n} is ${a.status}, not proposed.`, 'ILLEGAL_TRANSITION');
    const batched = op.batchApprovals.some((b) => b.covers.some((c) => c.testCaseId === testCaseId && c.n === a.n));
    if (!batched) throw new RunStateError(`${testCaseId} attempt ${a.n} is not covered by a batch approval (state heal batch-approve) — no code changes before the gate is answered.`, 'APPROVAL_REQUIRED');
    if (a.confidence.band !== 'High' && !a.approval) {
      throw new RunStateError(`${testCaseId} attempt ${a.n} is ${a.confidence.band} confidence (${a.confidence.score}) — it needs its own explicit approval (state heal approve --test ${testCaseId} --attempt ${a.n} --by "<name>").`, 'APPROVAL_REQUIRED');
    }
    // What is on disk must be exactly the approved patch: every file it names at its expected content,
    // and nothing else in the automation scope changed (Phase 6.1). Nothing is applied here.
    // eslint-disable-next-line global-require
    const v = require('./repairPatch').verifyApplied(path.dirname(runsDir), a.patch.plan, a.patch.scopeTrees);
    if (v.state === 'not-applied') throw new RunStateError(`${testCaseId} attempt ${a.n}: the approved patch is not applied — ${v.notApplied.join(', ')} still hold their original content.`, 'PATCH_NOT_APPLIED');
    if (v.state === 'partial') throw new RunStateError(`${testCaseId} attempt ${a.n}: the approved patch is only partly applied — applied ${v.applied.join(', ')}; not applied ${v.notApplied.join(', ')}.`, 'PATCH_PARTIAL');
    if (v.state === 'mismatch') throw new RunStateError(`${testCaseId} attempt ${a.n}: ${v.mismatched.join(', ')} differ from both the original and the approved patch — what is on disk is not what was approved.`, 'PATCH_MISMATCH');
    if (v.unexpected.length) throw new RunStateError(`${testCaseId} attempt ${a.n}: files the approved patch does not name changed in the automation scope — ${v.unexpected.join(', ')}. Only the approved change may be applied.`, 'UNEXPECTED_CHANGES');
    a.status = 'applied';
    a.applied = {
      at: ts, by, verified: true, ...(opts.restorePoint ? { restorePoint: opts.restorePoint } : {}),
      files: a.patch.plan.map((f) => ({ path: f.path, before: f.before, after: f.after, ...(f.original ? { original: f.original } : {}) })),
    };
    decide(op, ts, by, 'applied', `${testCaseId}#${a.n}`);
    return { stageId: '5H', by, transition: `Stage 5H: ${testCaseId} attempt ${a.n} applied` };
  });
}

/**
 * Validates an applied attempt from RESULT FILES, never from a summary (§6): the original failure
 * evidence is unchanged; the repaired test passes (verified) in a 5H rerun; every regression test passes
 * (verified) in 5H reruns; a change to a shared component is covered by regression tests beyond the
 * repaired one. A rerun on a production(-like) environment needs a recorded read-only access approval,
 * and a mutating rerun there is refused (§8).
 */
function validateRepair(runsDir, folderName, opts = {}) {
  const { now, testCaseId } = opts;
  rs.assertDate(now, 'validateRepair');
  const by = rs.requireText(opts.by, 'by', 'validateRepair');
  const rerun = rs.requireText(opts.rerun, 'rerun', 'validateRepair', 'a repair is validated by rerunning the repaired test');
  const regression = (opts.regression || []).map(String);
  const dataRoot = path.dirname(runsDir);
  // eslint-disable-next-line global-require
  const { buildHistory } = require('./executionHistory');
  // eslint-disable-next-line global-require
  const { fingerprintFile } = require('./artifactHeader');
  return rs.applyChange(runsDir, folderName, opts, (meta, ts) => {
    const op = currentOp(stage5H(meta));
    const t = inScope(op, testCaseId);
    const a = attemptOf(op, testCaseId, opts.attempt);
    if (a.status !== 'applied') throw new RunStateError(`${testCaseId} attempt ${a.n} is ${a.status}; only an applied attempt is validated.`, 'ILLEGAL_TRANSITION');
    // Only a VERIFIED application is validated, and the code must still be what was verified.
    if (!a.applied || !a.applied.verified) throw new RunStateError(`${testCaseId} attempt ${a.n}: the applied patch has not been verified against the files on disk.`, 'PATCH_NOT_VERIFIED');
    // eslint-disable-next-line global-require
    const { onDisk } = require('./repairPatch');
    const drifted = a.applied.files.filter((x) => onDisk(dataRoot, x.path) !== x.after).map((x) => x.path);
    if (drifted.length) throw new RunStateError(`${testCaseId} attempt ${a.n}: ${drifted.join(', ')} changed after the patch was verified — the rerun would not be of the approved code.`, 'PATCH_CHANGED_AFTER_APPLY');
    const check = op.environmentCheck || { status: 'unverified', restricted: true, declared: op.environment, sources: [] };
    const mut = rerunMutation(runsDir, folderName, meta, opts.mutating);
    if (isProductionLike(op.environment) || check.restricted) {
      const why = isProductionLike(op.environment) ? op.environment : `${op.environment}, ${check.status} against the approved configuration`;
      if (mut.mutating) throw new RunStateError(`Refused: a mutating rerun on a restricted environment (${why}) — ${mut.basis}. Self-Healing never writes to production, nor to an environment it cannot verify is not production.`, 'PRODUCTION_WRITE_REFUSED');
      if (!op.productionAccess.some((p) => p.readOnly)) throw new RunStateError(`Reruns on a restricted environment (${why}) need a named human's read-only access approval first (state heal prod-access).`, 'PRODUCTION_ACCESS_REQUIRED');
    }
    // The original failure evidence must still be what it was.
    if (t.evidence && t.evidence.sha256 && fingerprintFile(path.resolve(dataRoot, t.evidence.file)) !== t.evidence.sha256) {
      throw new RunStateError(`The original failure evidence ${t.evidence.file} has changed since the operation opened — it is never rewritten.`, 'RESULTS_MODIFIED');
    }
    const hist = buildHistory(runsDir, folderName, '5H');
    const fileRel = (p) => path.relative(dataRoot, path.resolve(dataRoot, p)).replace(/\\/g, '/');
    const resultIn = (file, id) => {
      const entry = hist.tests.find((x) => x.testCaseId === id || x.id === id);
      return entry ? entry.history.filter((h) => h.file === fileRel(file)).pop() : null;
    };
    const ensure5H = (file) => {
      const c = hist.cycles.find((x) => x.file === fileRel(file));
      if (!c) throw new RunStateError(`${file} is not a results cycle of this run.`, 'MISSING_ARTIFACT');
      if (c.producedBy !== '5H') throw new RunStateError(`${file} is not registered as a Stage 5H rerun (state artifact 5H --artifacts …) — only a repair rerun validates a repair.`, 'NOT_A_RERUN');
    };
    ensure5H(rerun);
    for (const r of new Set(regression.map((x) => x.split('@')[1]).filter(Boolean))) ensure5H(r);
    const after = resultIn(rerun, testCaseId);
    if (!after) throw new RunStateError(`${rerun} has no result for ${testCaseId}.`, 'NO_RESULTS');
    // Regression entries: "TC-ID@runs/.../ExecutionResults.rerun-N.md"
    const reg = regression.map((spec) => {
      const [id, file] = spec.split('@');
      if (!file) throw new RunStateError(`Regression entry "${spec}" names its rerun file: TC-ID@<path>.`, 'INVALID_ARGUMENT');
      const r = resultIn(file, id);
      return { testCaseId: id, file: fileRel(file), status: r ? r.effective : 'not recorded', raw: r ? r.raw : null };
    });
    const regressionOthers = reg.filter((r) => r.testCaseId !== testCaseId);
    if (a.sharedComponents.length) {
      // A shared component can break any test that uses it: every test that passed before the repair is
      // rerun as regression, not a sample (Phase 6.1).
      const source = ['5A'].map((id) => meta.stages[id] && meta.stages[id].outcome).find(Boolean);
      const required = ((source && source.tests) || []).filter((x) => x.testCaseId !== testCaseId && (x.first === 'Passed' || x.final === 'Passed')).map((x) => x.testCaseId);
      const missing = required.filter((id) => !regressionOthers.some((r) => r.testCaseId === id));
      if (!regressionOthers.length || missing.length) {
        throw new RunStateError(`${testCaseId} attempt ${a.n} changes shared component(s) ${a.sharedBy.map((x) => `${x.path} (${x.by})`).join(', ')} — its validation needs regression results for every test that passed before the repair${missing.length ? `; missing: ${missing.join(', ')}` : ''}, not only the repaired test.`, 'VALIDATION_INCOMPLETE');
      }
    }
    const regressionFailed = reg.filter((r) => r.status !== 'Passed');
    let result;
    if (after.effective !== 'Passed') result = 'remaining';
    else if (regressionFailed.length) result = 'regression-failed';
    else result = 'fixed';
    a.status = result === 'fixed' ? 'validated' : 'rejected';
    a.result = result;
    a.validation = {
      at: ts, by, rerun: fileRel(rerun),
      before: { status: t.recorded, evidence: t.evidence },
      after: { status: after.effective, raw: after.raw, assertions: after.assertions ? after.assertions.state : null },
      regression: reg, environment: op.environment,
      mutating: { declared: Boolean(opts.mutating), derived: mut.mutating, basis: mut.basis, preflight: mut.preflight },
      originalEvidencePreserved: true,
    };
    decide(op, ts, by, 'validated', `${testCaseId}#${a.n}: ${result}${regressionFailed.length ? ` (regression: ${regressionFailed.map((r) => `${r.testCaseId} ${r.status}`).join(', ')})` : ''}`);
    // The third unsuccessful attempt in the budget window quarantines the test — recorded on the run,
    // never removed (Phase 6.1).
    if (result !== 'fixed') {
      const h = attemptHistory(runsDir, folderName, meta, testCaseId);
      if (h.unsuccessful.length >= MAX_ATTEMPTS && !h.quarantine) {
        const stage = meta.stages['5H'];
        const q = { testCaseId, at: ts, operation: op.id, by, attempts: h.unsuccessful.map((x) => `${x.run === folderName ? '' : `${x.run} `}${x.operation}#${x.n} ${x.result}`), reason: `${h.unsuccessful.length} unsuccessful repair attempts` };
        stage.repairQuarantine = [...(stage.repairQuarantine || []), q];
        decide(op, ts, by, 'quarantined', `${testCaseId}: ${q.attempts.join(', ')}`);
      }
    }
    return { stageId: '5H', by, transition: `Stage 5H: ${testCaseId} attempt ${a.n} validated — ${result}` };
  });
}

/** A named human's approval of read-only diagnostics on a production(-like) environment (§8). */
function approveProductionAccess(runsDir, folderName, opts = {}) {
  const { now } = opts;
  rs.assertDate(now, 'approveProductionAccess');
  const by = rs.requireApprover(opts.by, 'by', 'approveProductionAccess', 'production access is a named human decision');
  const scope = rs.requireText(opts.scope, 'scope', 'approveProductionAccess', 'say exactly what may be read');
  if (opts.readOnly !== true) throw new RunStateError('Only read-only diagnostics can be approved; Self-Healing never writes to production.', 'PRODUCTION_WRITE_REFUSED');
  return rs.applyChange(runsDir, folderName, opts, (meta, ts) => {
    const op = currentOp(stage5H(meta));
    op.productionAccess.push({ at: ts, by, scope, readOnly: true, environment: op.environment });
    decide(op, ts, by, 'production-access', `read-only on ${op.environment}: ${scope}`);
    return { stageId: '5H', by, transition: `Stage 5H: read-only ${op.environment} diagnostics approved by ${by}` };
  });
}

/**
 * A fresh repair budget for one test — never automatic, never a deletion (Phase 6.1). A named human
 * grants it, with a reason, on one of two bases the record can check:
 *   changed-failure — the failure in this operation is not the one the counted attempts addressed: its
 *                     fingerprint (recorded status + reason) differs from theirs;
 *   new-run         — every counted attempt was made in another run (this run starts from a new execution).
 * Earlier attempts and quarantines stay on record; the grant only opens a new window after them.
 */
function grantRepairBudget(runsDir, folderName, opts = {}) {
  const { now, testCaseId } = opts;
  rs.assertDate(now, 'grantRepairBudget');
  const by = rs.requireApprover(opts.by, 'by', 'grantRepairBudget', 'a fresh repair budget is a named human decision');
  const reason = rs.requireText(opts.reason, 'reason', 'grantRepairBudget');
  if (!['changed-failure', 'new-run'].includes(opts.basis)) throw new RunStateError('A budget grant has a basis: changed-failure or new-run.', 'INVALID_ARGUMENT');
  return rs.applyChange(runsDir, folderName, opts, (meta, ts) => {
    const stage = stage5H(meta);
    const op = currentOp(stage);
    const t = inScope(op, testCaseId);
    const h = attemptHistory(runsDir, folderName, meta, testCaseId);
    if (!h.inWindow.length) throw new RunStateError(`${testCaseId} has no counted repair attempt — there is no budget to renew.`, 'NOTHING_TO_GRANT');
    const counted = [...new Set(h.inWindow.map((a) => a.failureFingerprint).filter(Boolean))];
    if (opts.basis === 'changed-failure' && counted.includes(t.failureFingerprint)) {
      throw new RunStateError(`${testCaseId}'s failure now (${t.failureFingerprint}) is the one its counted attempts addressed — a fresh budget for the same failure is refused.`, 'CHANGED_FAILURE_REQUIRED');
    }
    if (opts.basis === 'new-run' && h.inWindow.some((a) => a.run === folderName)) {
      throw new RunStateError(`${testCaseId} was already attempted in this run — "new-run" applies only when every counted attempt was in an earlier run.`, 'NEW_RUN_REQUIRED');
    }
    const grant = {
      testCaseId, at: ts, by, reason, basis: opts.basis, operation: op.id,
      failureFingerprint: t.failureFingerprint, countedFingerprints: counted,
      supersedes: h.inWindow.map((a) => `${a.run === folderName ? '' : `${a.run} `}${a.operation}#${a.n}`),
      ...(h.quarantine ? { afterQuarantine: { run: h.quarantine.run, at: h.quarantine.at } } : {}),
    };
    stage.repairBudgetGrants = [...(stage.repairBudgetGrants || []), grant];
    decide(op, ts, by, 'budget-granted', `${testCaseId} (${opts.basis}): ${reason}`);
    return { stageId: '5H', by, reason, transition: `Stage 5H: fresh repair budget for ${testCaseId} granted by ${by} (${opts.basis})` };
  });
}

/**
 * Writes verified repair knowledge (§7): only for an attempt validated as fixed, approved by a named
 * human, sanitized, with its provenance. Unverified suggestions never become knowledge.
 * Written to the project knowledge layer: <dataRoot>/knowledge/patterns/repair/REPAIR-NNN.md.
 */
function promoteRepairKnowledge(runsDir, folderName, opts = {}) {
  const { now, testCaseId } = opts;
  rs.assertDate(now, 'promoteRepairKnowledge');
  const by = rs.requireApprover(opts.by, 'by', 'promoteRepairKnowledge', 'knowledge is promoted by a named human');
  const title = rs.requireText(opts.title, 'title', 'promoteRepairKnowledge');
  const body = rs.requireText(opts.body, 'body', 'promoteRepairKnowledge');
  const dataRoot = path.dirname(runsDir);
  return rs.applyChange(runsDir, folderName, opts, (meta, ts) => {
    const op = currentOp(stage5H(meta));
    const a = attemptOf(op, testCaseId, opts.attempt);
    if (a.result !== 'fixed') {
      throw new RunStateError(`${testCaseId} attempt ${a.n} is ${a.result || a.status} — only a repair validated as fixed by its rerun becomes knowledge. Unverified suggestions are never authoritative.`, 'UNVERIFIED_KNOWLEDGE');
    }
    const dir = path.join(dataRoot, 'knowledge', 'patterns', 'repair');
    fs.mkdirSync(dir, { recursive: true });
    const n = fs.readdirSync(dir).filter((x) => /^REPAIR-\d+\.md$/.test(x)).length + 1;
    const id = `REPAIR-${String(n).padStart(3, '0')}`;
    const t = sanitizeKnowledge(title);
    const b = sanitizeKnowledge(body);
    const redactions = Object.entries({ ...t.redactions }).concat(Object.entries(b.redactions));
    const text = `# ${id} — ${t.text}\n\n| Field | Value |\n|---|---|\n| Status | Verified — approved by ${by} |\n| Confirmed by | 1 execution |\n| Source run | \`${folderName}\` |\n| Repair operation | ${op.id} |\n| Test case | ${testCaseId} |\n| Attempt | ${a.n} — ${a.strategy} |\n| Patch | \`${a.patch.file}\` (${a.patch.sha256.slice(0, 12)}) |\n| Validated by | \`${a.validation.rerun}\` (${a.validation.after.status}) |\n| Confidence (pre-rerun) | ${a.confidence.score} (${a.confidence.band}) |\n| Promoted | ${ts} |\n\n## What happened\n\n${b.text}\n\n## Evidence\n\n${a.confidence.factors.map((f) => `- ${f.label}: ${sanitizeKnowledge(f.citation).text}`).join('\n')}\n`;
    const file = path.join(dir, `${id}.md`);
    // eslint-disable-next-line global-require
    require('./atomicFile').writeFileAtomic(file, text);
    // The entry's fingerprint (Phase 9.4): a Platform Knowledge promotion proves its source is exactly what was written here.
    op.promotions.push({ at: ts, by, id, file: path.relative(dataRoot, file).replace(/\\/g, '/'), sha256: crypto.createHash('sha256').update(text).digest('hex'), testCaseId, attempt: a.n, redactions: Object.fromEntries(redactions) });
    decide(op, ts, by, 'promoted', `${id} from ${testCaseId}#${a.n}`);
    return { stageId: '5H', by, transition: `Stage 5H: verified repair knowledge ${id} promoted by ${by}` };
  });
}

/** Closes the operation; every test's final repair status is fixed at this point. */
function closeRepairOperation(runsDir, folderName, opts = {}) {
  const { now } = opts;
  rs.assertDate(now, 'closeRepairOperation');
  const by = rs.requireText(opts.by, 'by', 'closeRepairOperation');
  return rs.applyChange(runsDir, folderName, opts, (meta, ts) => {
    const op = currentOp(stage5H(meta));
    const open = Object.entries(op.attempts).flatMap(([tc, l]) => l.filter((a) => ['proposed', 'applied'].includes(a.status)).map((a) => `${tc}#${a.n}`));
    if (open.length) throw new RunStateError(`Attempts still open: ${open.join(', ')} — validate or abandon them first.`, 'ATTEMPT_OPEN');
    op.status = 'closed';
    op.closedAt = ts;
    op.closedBy = by;
    decide(op, ts, by, 'closed');
    return { stageId: '5H', by, transition: `Stage 5H: repair operation ${op.id} closed by ${by}` };
  });
}

/** A test's final repair status (§9). */
function finalStatusOf(op, t, hist) {
  const cls = op.classifications[t.testCaseId];
  const list = op.attempts[t.testCaseId] || [];
  if (list.some((a) => a.result === 'fixed')) return 'Automation Repaired';
  if (hist && hist.quarantine) return 'Quarantined — attempt limit reached';
  if (cls.class === 'application') return 'Application defect — unresolved, not repaired';
  if (cls.class !== 'automation') return `Not eligible (${cls.class})`;
  if (!cls.confirmed) return 'Not eligible (automation class not confirmed)';
  if (list.length >= MAX_ATTEMPTS) return 'Unresolved — attempt limit reached (quarantine)';
  if (list.some((a) => ['proposed', 'applied'].includes(a.status))) return 'In progress';
  if (list.length) return 'Unresolved — attempts failed';
  return 'No repair attempted';
}

/** The report (§9): per test, everything recorded. Pure read. */
function repairReport(runsDir, folderName) {
  const meta = JSON.parse(fs.readFileSync(rs.runJsonPath(runsDir, folderName), 'utf8'));
  const s5 = (meta.stages && meta.stages['5H']) || {};
  const ops = s5.repairOperations || [];
  return ops.map((op) => ({
    id: op.id, status: op.status, invokedBy: op.invokedBy, invokedAt: op.invokedAt, reason: op.reason, environment: op.environment,
    environmentCheck: op.environmentCheck || null,
    quarantine: s5.repairQuarantine || [], budgetGrants: s5.repairBudgetGrants || [],
    tests: op.scope.map((t) => { const hist = attemptHistory(runsDir, folderName, meta, t.testCaseId); return ({
      testCaseId: t.testCaseId,
      recorded: t.recorded,
      classification: op.classifications[t.testCaseId],
      attempts: (op.attempts[t.testCaseId] || []).map((a) => ({
        n: a.n, strategy: a.strategy, reason: a.reason, status: a.status, result: a.result,
        confidence: a.confidence, filesChanged: a.patch.files, sharedComponents: a.sharedComponents,
        approval: a.approval, applied: a.applied, sharedBy: a.sharedBy || [],
        beforeAfter: a.validation ? { before: a.validation.before.status, after: a.validation.after.status, rerun: a.validation.rerun } : null,
        regression: a.validation ? a.validation.regression : [],
      })),
      cumulative: { counted: hist.inWindow.length, of: MAX_ATTEMPTS, unsuccessful: hist.unsuccessful.length, windowStart: hist.windowStart, quarantined: Boolean(hist.quarantine) },
      finalStatus: finalStatusOf(op, t, hist),
    }); }),
    batchApprovals: op.batchApprovals, productionAccess: op.productionAccess, promotions: op.promotions, decisions: op.decisions,
  }));
}

module.exports = {
  MAX_ATTEMPTS, CLASSES, FACTORS, BANDS,
  bandOf, computeConfidence, parsePatch, weakeningOf, sanitizeKnowledge, PROTECTED,
  openRepairOperation, classifyFailure, proposeRepair, batchApprove, approveRepair, applyRepair,
  validateRepair, approveProductionAccess, grantRepairBudget, promoteRepairKnowledge, closeRepairOperation, repairReport,
  attemptHistory, verifyEnvironment, ownershipOf, failureFingerprint, rerunMutation,
};
