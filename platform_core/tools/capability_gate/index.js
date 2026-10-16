// Capability gate — which test cases a Supplier can actually run.
//
// Suppliers differ: flynas has no Hold, another Supplier may have no meals. A case that needs a
// capability the Supplier lacks would only fail, so it is EXCLUDED before execution and reported
// with its reason, never run and never counted as a failure (manual-execution-skill §4.2).
//
// Inputs are the case's `Requires` and `Supplier Rule` columns and the Supplier's recorded
// `capabilities` / `supplierRules` (supplier.json, written only through module_manager's CLI).
// `Unknown` is treated as Not Supported — a human decision (2026-09-27): nothing is guessed.

'use strict';

const fs = require('fs');
const path = require('path');

const { SUPPLIER_CAPABILITIES, emptyCapabilities } = require('../module_manager/supplierRegistry');
const { parseTestCases } = require('../test_suite_export/parseTestCases');
const { readWorkbook } = require('../test_suite_export/readWorkbook');

class CapabilityGateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CapabilityGateError';
  }
}

const LABEL_TO_KEY = new Map();
for (const c of SUPPLIER_CAPABILITIES) {
  LABEL_TO_KEY.set(c.label.toLowerCase(), c.key);
  LABEL_TO_KEY.set(c.key.toLowerCase(), c.key);
  LABEL_TO_KEY.set(c.flag.toLowerCase(), c.key);
}
const KEY_TO_LABEL = new Map(SUPPLIER_CAPABILITIES.map((c) => [c.key, c.label]));

/**
 * `Requires` cell -> what the case needs.
 *   "None"                    -> runs for every Supplier
 *   "Seat"                    -> needs Seat
 *   "Hold + Pay after Hold"   -> needs both (also `,` or `;`)
 *   "Not Hold" / "!Hold"      -> runs only for a Supplier WITHOUT Hold (checks it is absent)
 * @returns {{declared: boolean, required: string[], forbidden: string[], invalid: string[]}}
 */
function parseRequires(text) {
  const raw = String(text ?? '').trim();
  const out = { declared: raw !== '', required: [], forbidden: [], invalid: [] };
  if (!raw || raw.toLowerCase() === 'none') return out;
  for (const part of raw.split(/\s*[+,;]\s*/)) {
    const token = part.trim();
    if (!token) continue;
    const negated = /^(not\s+|!)/i.test(token);
    const name = token.replace(/^(not\s+|!)/i, '').trim().toLowerCase();
    const key = LABEL_TO_KEY.get(name);
    if (!key) { out.invalid.push(token); continue; }
    (negated ? out.forbidden : out.required).push(key);
  }
  return out;
}

/** A Supplier's capabilities with every unanswered one `Unknown`. */
function capabilitiesOf(supplier) {
  return { ...emptyCapabilities(), ...((supplier && supplier.capabilities) || {}) };
}

/**
 * One case's decision.
 * @param {{id: string, requires?: string, supplierRule?: string}} testCase
 * @param {object} supplier supplier.json contents
 * @returns {{id: string, decision: 'Run'|'Excluded', reasons: string[], warnings: string[]}}
 */
function evaluateCase(testCase, supplier) {
  const caps = capabilitiesOf(supplier);
  const need = parseRequires(testCase.requires);
  const reasons = [];
  const warnings = [];

  if (!need.declared) warnings.push(`${testCase.id}: no Requires value — treated as None`);
  if (need.invalid.length) {
    reasons.push(`Requires has unknown value(s): ${need.invalid.join(', ')}`);
  }
  for (const key of need.required) {
    const value = caps[key];
    if (value === 'Supported') continue;
    reasons.push(value === 'Unknown'
      ? `Needs ${KEY_TO_LABEL.get(key)} — Unknown for this supplier, treated as Not Supported`
      : `Needs ${KEY_TO_LABEL.get(key)} — Not Supported by this supplier`);
  }
  for (const key of need.forbidden) {
    if (caps[key] === 'Supported') {
      reasons.push(`Only for suppliers without ${KEY_TO_LABEL.get(key)} — this supplier supports it`);
    }
  }

  const rule = String(testCase.supplierRule ?? '').trim();
  if (rule && rule.toLowerCase() !== 'none') {
    const rules = Array.isArray(supplier && supplier.supplierRules) ? supplier.supplierRules : [];
    if (!supplier || !supplier.supplierRulesSetAt) {
      reasons.push(`Supplier rule "${rule}" — this supplier's own rules were never recorded`);
    } else if (!rules.includes(rule)) {
      reasons.push(`Supplier rule "${rule}" does not apply to this supplier`);
    }
  }

  return { id: testCase.id, decision: reasons.length ? 'Excluded' : 'Run', reasons, warnings };
}

/**
 * The whole suite's plan.
 * @param {object[]} cases @param {object} supplier
 * @returns {{run: object[], excluded: object[], warnings: string[], capabilities: object}}
 */
function planExecution(cases, supplier) {
  const run = [];
  const excluded = [];
  const warnings = [];
  for (const c of cases) {
    const d = { ...evaluateCase(c, supplier), title: c.title || '', review: c.review || '' };
    warnings.push(...d.warnings);
    (d.decision === 'Run' ? run : excluded).push(d);
  }
  // Reported, not decided here: the Review gate is its own step (manual-execution-skill §4.1).
  const awaitingReview = run.filter((c) => c.review && String(c.review).trim().toLowerCase() !== 'approved');
  return { run, excluded, awaitingReview, warnings, capabilities: capabilitiesOf(supplier) };
}

/** Cases from a Stage 3 Markdown suite (the authoritative form). */
function loadCasesFromMarkdown(file) {
  const { cases } = parseTestCases(fs.readFileSync(file, 'utf8'), { sourceLabel: path.basename(file) });
  return cases.map((c) => ({
    id: c.id, title: c.title, requires: c.requires, supplierRule: c.supplierRule, review: c.review,
  }));
}

/**
 * Cases from a workbook's first sheet. Accepts the generated suite header (`Test Case ID`, `Title`)
 * and a supplied sheet's (`Code`, `Test name`).
 */
function loadCasesFromWorkbook(file) {
  const { rows } = readWorkbook(file);
  const headerIndex = rows.findIndex((r) => r.includes('Test Case ID') || r.includes('Code'));
  if (headerIndex === -1) {
    throw new CapabilityGateError(`${path.basename(file)} has no "Test Case ID" or "Code" header row.`);
  }
  const header = rows[headerIndex];
  const col = (...names) => {
    for (const n of names) { const i = header.indexOf(n); if (i !== -1) return i; }
    return -1;
  };
  const idCol = col('Test Case ID', 'Code');
  const titleCol = col('Title', 'Test name');
  const reqCol = col('Requires');
  const ruleCol = col('Supplier Rule');
  const reviewCol = col('Review');
  if (reqCol === -1) {
    throw new CapabilityGateError(
      `${path.basename(file)} has no "Requires" column — tag every case with the capabilities it needs first.`
    );
  }
  return rows.slice(headerIndex + 1)
    .filter((r) => r[idCol] && String(r[idCol]).trim())
    .map((r) => ({
      id: String(r[idCol]).trim(),
      title: titleCol === -1 ? '' : r[titleCol],
      requires: r[reqCol],
      supplierRule: ruleCol === -1 ? '' : r[ruleCol],
      review: reviewCol === -1 ? '' : r[reviewCol],
    }));
}

function loadCases(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.xlsx') return loadCasesFromWorkbook(file);
  if (ext === '.md') return loadCasesFromMarkdown(file);
  throw new CapabilityGateError(`Unsupported suite file "${file}" — expected .md or .xlsx.`);
}

/** The plan as the Markdown written to runs/<run>/metadata/CapabilityPlan.md. */
function renderPlan(plan, meta) {
  const lines = [
    `# Capability Plan — ${meta.feature} / ${meta.supplier}`,
    '',
    // Machine-readable binding (Phase 9.2, F-13): the exact run, Feature, Supplier, capability answers and
    // suite this plan was computed for. The entry gate refuses a plan whose binding does not match.
    ...(meta.binding ? [`<!-- capability-binding: ${JSON.stringify(meta.binding)} -->`, '',
      '| Bound to | Value |', '|---|---|',
      `| Run | \`${meta.binding.run || '—'}\` |`, `| Feature | \`${meta.binding.feature}\` |`, `| Supplier | \`${meta.binding.supplier}\` |`,
      `| Capability fingerprint | \`${meta.binding.capabilities.slice(0, 16)}…\` |`, `| Suite fingerprint | \`${String(meta.binding.suite || '—').slice(0, 16)}…\` |`, ''] : []),
    `Generated ${meta.generatedAt} by \`platform_core/tools/capability_gate\` from \`${meta.suite}\`.`,
    'Only the cases under **Will run** are executed. Excluded cases are reported with their reason and',
    'kept out of executable scope and pass rate (manual-execution-skill §4.2).',
    '',
    '## Supplier capabilities',
    '',
    '| Capability | Value |',
    '|---|---|',
    ...SUPPLIER_CAPABILITIES.map((c) => `| ${c.label} | ${plan.capabilities[c.key]} |`),
    '',
    `Supplier rules: ${meta.rules}`,
    '',
    `## Will run (${plan.run.length})`,
    '',
    plan.run.map((c) => `\`${c.id}\``).join(', ') || '(none)',
    '',
    ...(plan.awaitingReview.length ? [
      `Of these, ${plan.awaitingReview.length} are not yet approved at Review and will be excluded by the Review `
      + `gate: ${plan.awaitingReview.map((c) => `\`${c.id}\``).join(', ')}.`,
      '',
    ] : []),
    `## Excluded — not supported by supplier (${plan.excluded.length})`,
    '',
    '| Test Case ID | Title | Reason |',
    '|---|---|---|',
    ...plan.excluded.map((c) => `| ${c.id} | ${String(c.title).replace(/\|/g, '/')} | ${c.reasons.join('; ')} |`),
  ];
  if (plan.warnings.length) {
    lines.push('', `## Warnings (${plan.warnings.length})`, '', ...plan.warnings.map((w) => `- ${w}`));
  }
  return `${lines.join('\n')}\n`;
}

/**
 * The capability fingerprint of a Supplier (Phase 9.2, F-13): its recorded capability answers and Supplier
 * rules, canonically ordered. A plan made before either changed is stale.
 */
function capabilityFingerprint(supplier) {
  // eslint-disable-next-line global-require
  const crypto = require('crypto');
  const caps = capabilitiesOf(supplier);
  const canonical = JSON.stringify({ capabilities: SUPPLIER_CAPABILITIES.map((c) => [c.key, caps[c.key]]), rules: [...((supplier && supplier.supplierRules) || [])].sort() });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

const BINDING_RE = /<!--\s*capability-binding:\s*(\{[\s\S]*?\})\s*-->/;
/** The binding a plan file carries, or null (a plan written before Phase 9.2, or by hand). */
function readPlanBinding(text) {
  const m = String(text || '').match(BINDING_RE);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

module.exports = {
  capabilityFingerprint,
  readPlanBinding,
  CapabilityGateError,
  parseRequires,
  capabilitiesOf,
  evaluateCase,
  planExecution,
  loadCases,
  loadCasesFromMarkdown,
  loadCasesFromWorkbook,
  renderPlan,
};
