// Scope-aware partial approval — what is approved INSIDE an artifact whose header is `Mixed`.
//
// WHY THIS EXISTS
// A header like "Approved — Revision 5 … `PO-30` (2026-10-01): Pending Review" says part of the artifact
// is approved and part is not. Phase 2.1 made such a header (`Mixed`) block everything, because a
// header is free text and cannot say WHICH part. This module supplies the structured answer, so an
// independent approved part can proceed while the pending part stays blocked.
//
// WHERE ITEM STATUS COMES FROM — structured sources only, never header prose:
//   - Test Design: each test case's own `Review` / `Automation` fields (test-design-skill §6.3) — the
//     existing per-case decision, set only by a human reviewer. Its dependencies come from the
//     Traceability Matrix rows for that case (Requirement / Finding / Acceptance Criteria references).
//   - Project Context, Discovery (and any other artifact): an optional `## Approval Scope` table the
//     reviewer writes in the artifact itself:
//
//       ## Approval Scope
//       | Item  | Status   | Depends On | Affects        |
//       |-------|----------|------------|----------------|
//       | §2    | Approved | —          | —              |
//       | PO-24 | Approved | §2         | —              |
//       | PO-30 | Pending  | PO-24      | PO-24, §2.4    |
//
//     `Status` is Approved / Pending / Rejected. `Depends On` lists items this one needs. `Affects`
//     lists items an unresolved one changes — they cannot proceed while it is open. A reference to
//     another module is written `module:ID`.
//
// A PARTIAL APPROVAL IS ONLY EVIDENCE ONCE IT IS RECORDED. `cli.js state approve-scope` records, in the
// run's run.json, who approved the scope, when, every item's status and dependencies, and a fingerprint
// of every file it was read from. Any later edit to those files invalidates the record. The header still
// reads `Mixed`; the artifact as a whole is never approved by a scope record.
//
// It reads; recording is runState.js's job (approveScope).

const fs = require('fs');
const path = require('path');

const { fingerprintFile, readArtifactApprovalStatus } = require('./artifactHeader');

const ITEM_STATUSES = Object.freeze(['Approved', 'Pending', 'Rejected']);

class ScopeApprovalError extends Error {
  constructor(message, code = 'INVALID_SCOPE') {
    super(message);
    this.name = 'ScopeApprovalError';
    this.code = code;
  }
}

/** Which artifact an item ID belongs to, by its prefix. */
function kindOf(id) {
  if (/^TC-/i.test(id)) return 'test_design';
  if (/^FINDING-/i.test(id)) return 'discovery';
  return 'context';
}

const clean = (s) => String(s ?? '').replace(/<!--[\s\S]*?-->/g, '').replace(/[*`_]/g, '').trim();
const isNone = (s) => !s || /^(—|-|–|none|n\/a)$/i.test(s.trim());
const splitList = (s) => (isNone(s) ? [] : s.split(/[,;]+/).map((x) => clean(x)).filter(Boolean));

function cells(line) {
  const parts = line.split('|');
  return parts.slice(1, parts.length - 1).map((c) => c.trim());
}

/**
 * Reads the `## Approval Scope` table from an artifact's text. Returns null when there is none.
 * Throws when it exists but is malformed — a scope that cannot be read exactly is not a scope.
 * @returns {null|Record<string, {status: string, dependsOn: string[], affects: string[]}>}
 */
function parseApprovalScopeTable(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  const start = lines.findIndex((l) => /^#{2,4}\s+(?:\d+(?:\.\d+)*\.?\s+)?Approval Scope\b/i.test(l));
  if (start === -1) return null;
  let i = start + 1;
  while (i < lines.length && !/^\|/.test(lines[i])) {
    if (/^#{1,4}\s/.test(lines[i])) throw new ScopeApprovalError('The "Approval Scope" section has no table.');
    i += 1;
  }
  const header = cells(lines[i] || '').map((h) => clean(h).toLowerCase());
  const col = (name) => header.findIndex((h) => h === name);
  const iItem = col('item');
  const iStatus = col('status');
  if (iItem === -1 || iStatus === -1) {
    throw new ScopeApprovalError('The "Approval Scope" table needs at least the columns Item and Status.');
  }
  const iDeps = col('depends on');
  const iAffects = col('affects');
  const items = {};
  for (i += 2; i < lines.length && /^\|/.test(lines[i]); i += 1) {
    const row = cells(lines[i]);
    const id = clean(row[iItem]);
    if (!id) continue;
    const statusRaw = clean(row[iStatus]);
    const status = ITEM_STATUSES.find((s) => statusRaw.toLowerCase().startsWith(s.toLowerCase()));
    if (!status) throw new ScopeApprovalError(`Approval Scope item ${id}: status "${statusRaw}" is not one of ${ITEM_STATUSES.join(' / ')}.`);
    if (items[id]) throw new ScopeApprovalError(`Approval Scope lists ${id} twice.`);
    items[id] = {
      status,
      dependsOn: iDeps === -1 ? [] : splitList(row[iDeps]),
      affects: iAffects === -1 ? [] : splitList(row[iAffects]),
    };
  }
  if (!Object.keys(items).length) throw new ScopeApprovalError('The "Approval Scope" table has no rows.');
  return items;
}

/**
 * The approval-bearing dependencies one Traceability Matrix row states for a test case.
 * Project Context items: `PC §n` sections and requirement/decision IDs (PO-, AC-, BR-, …).
 * Discovery items: FINDING- IDs. PRD / spec / user-story references are not pipeline artifacts —
 * requirements enter the pipeline through the Project Context — so they are kept as `external`.
 */
function dependenciesFromTraceRow(row) {
  const deps = new Set();
  const covers = new Set();
  const external = [];
  for (const cell of [row.requirement, row.acceptance, row.finding]) {
    for (const segment of String(cell || '').split(/\s\/\s|;/)) {
      const seg = clean(segment);
      if (!seg || isNone(seg)) continue;
      if (/^(PRD|spec|specification|US-|User Story|QA)\b/i.test(seg)) { external.push(seg); continue; }
      if (/^PC\b/i.test(seg)) for (const m of seg.matchAll(/§\s?(\d+(?:\.\d+)*)/g)) deps.add(`§${m[1]}`);
      // `module:ID` names another module's item and keeps its qualifier; a bare ID is the same module's.
      for (const m of seg.matchAll(/(?:\b([a-z][a-z0-9-]*):)?\b([A-Z]{2,7}-\d+[A-Za-z]?)\b/g)) {
        if (!/^TC-/.test(m[2])) deps.add(m[1] ? `${m[1]}:${m[2]}` : m[2]);
      }
      for (const id of expandRanges(seg)) covers.add(id);
    }
  }
  for (const d of deps) covers.add(d);
  return { dependsOn: [...deps], external, covers: [...covers] };
}

/**
 * Same-prefix ID ranges a row writes in short form — `SRCH-02…09`, `CMP-1...3`, `AC-3–5` (en dash, no
 * spaces) — expanded to every ID they name. A spaced dash ("AC-1 — 11 fields") is a description, not a
 * range. Only `covers` uses this (the assertion-requirement trace check); `dependsOn` keeps its existing
 * reading, so no other consumer's behaviour changes. Capped, so a typo cannot explode.
 */
function expandRanges(text) {
  const out = [];
  for (const m of String(text).matchAll(/\b([A-Z]{2,7})-(\d+)(?:\s*(?:…|\.\.\.?)\s*|–)(?:\1-)?(\d+)\b/g)) {
    const [from, to] = [Number(m[2]), Number(m[3])];
    if (!(to > from) || to - from > 200) continue;
    for (let n = from; n <= to; n += 1) out.push(`${m[1]}-${String(n).padStart(m[2].length, '0')}`);
  }
  return out;
}

/** Reads the Traceability Matrix rows of every `| Test Case ID | Requirement Reference | … |` table. */
function parseTraceability(text) {
  const out = {};
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\|\s*Test Case ID\s*\|/i.test(lines[i])) continue;
    const header = cells(lines[i]).map((h) => clean(h).toLowerCase());
    const at = (n) => header.findIndex((h) => h.startsWith(n));
    const idx = { requirement: at('requirement reference'), finding: at('finding reference'), acceptance: at('acceptance criteria reference') };
    for (i += 2; i < lines.length && /^\|/.test(lines[i]); i += 1) {
      const row = cells(lines[i]);
      const id = clean(row[0]);
      if (!/^TC-/.test(id)) continue;
      const d = dependenciesFromTraceRow({
        requirement: row[idx.requirement], finding: idx.finding === -1 ? '' : row[idx.finding], acceptance: idx.acceptance === -1 ? '' : row[idx.acceptance],
      });
      const prev = out[id] || { dependsOn: [], external: [], covers: [] };
      out[id] = {
        dependsOn: [...new Set([...prev.dependsOn, ...d.dependsOn])],
        external: [...prev.external, ...d.external],
        covers: [...new Set([...prev.covers, ...d.covers])],
      };
    }
  }
  return out;
}

/**
 * With no run records to consult: the legacy `TraceabilityMatrix.md` only when it is the folder's only
 * matrix. Several matrices and nothing to decide between them → none (reported, never guessed).
 */
function folderMatrix(file) {
  const dir = path.dirname(file);
  let all = [];
  try { all = fs.readdirSync(dir).filter((n) => /^TraceabilityMatrix.*\.md$/.test(n)); } catch { all = []; }
  if (all.length === 1 && all[0] === 'TraceabilityMatrix.md') {
    return { file: path.join(dir, 'TraceabilityMatrix.md'), basis: 'legacy-default', detail: 'TraceabilityMatrix.md — the folder\'s only matrix (legacy behaviour)' };
  }
  if (all.length > 1) return { file: null, basis: 'ambiguous', detail: `the folder holds ${all.length} matrices (${all.join(', ')}) and no run record decides which belongs to ${path.basename(file)}` };
  return { file: null, basis: 'none', detail: `no Traceability Matrix for ${path.basename(file)}` };
}

/**
 * Builds the item map for an artifact, from its structured source. Pure apart from reading files.
 * @param {string} file - absolute path of the artifact
 * @param {object} [opts]
 * @param {{file: string|null, basis: string, detail: string}} [opts.matrix] - the suite's matrix, already
 *        resolved (suiteBinding.resolveSuiteMatrix). A null file means none could be decided: no
 *        dependencies are read, so none are trusted.
 * @param {string} [opts.runsDir] - resolve the matrix from the runs' Stage 3 records (with opts.preferMeta)
 * @returns {{kind: 'scope-table'|'test-cases', items: object, sources: string[], matrix?: object}}
 */
function buildScopeItems(file, opts = {}) {
  const text = fs.readFileSync(file, 'utf8');
  if (/^TestCases_.+\.md$/.test(path.basename(file))) {
    // eslint-disable-next-line global-require
    const { parseTestCases, LIFECYCLE_VALUES } = require('../test_suite_export/parseTestCases');
    const { cases } = parseTestCases(text, { sourceLabel: path.basename(file) });
    if (!cases.length) throw new ScopeApprovalError(`${path.basename(file)} has no test cases to scope.`);
    // PE-03: the matrix that belongs to THIS suite — never another suite's matrix that shares the folder.
    // eslint-disable-next-line global-require
    const { resolveSuiteMatrix } = require('./suiteBinding');
    const matrix = opts.matrix
      || (opts.runsDir ? resolveSuiteMatrix(opts.runsDir, file, { preferMeta: opts.preferMeta || null, preferRun: opts.preferRun || null })
        : folderMatrix(file));
    const tmFile = matrix.file;
    const trace = tmFile && fs.existsSync(tmFile) ? parseTraceability(fs.readFileSync(tmFile, 'utf8')) : {};
    const items = {};
    for (const c of cases) {
      const review = (LIFECYCLE_VALUES || ITEM_STATUSES).find((v) => v.toLowerCase() === String(c.review).trim().toLowerCase());
      const automation = (LIFECYCLE_VALUES || ITEM_STATUSES).find((v) => v.toLowerCase() === String(c.automation).trim().toLowerCase());
      const t = trace[c.id];
      items[c.id] = {
        // A value outside Pending / Approved / Rejected is not a decision this tool can read — it is
        // held as Pending, never as Approved.
        status: review || 'Pending',
        automation: automation || 'Pending',
        ...(review ? {} : { note: `Review value "${c.review}" is not Pending/Approved/Rejected` }),
        dependsOn: t ? t.dependsOn : null, // null = no traceability row: dependencies unknown
        affects: [],
        ...(t && t.external.length ? { external: t.external } : {}),
      };
    }
    return { kind: 'test-cases', items, sources: tmFile && fs.existsSync(tmFile) ? [file, tmFile] : [file], matrix };
  }
  const items = parseApprovalScopeTable(text);
  if (!items) {
    throw new ScopeApprovalError(
      `${path.basename(file)} has no "## Approval Scope" table. A partial approval needs the reviewer to state, ` +
      'item by item, what is Approved, Pending and Rejected — the Status header alone cannot say which part.',
      'NO_SCOPE_TABLE'
    );
  }
  return { kind: 'scope-table', items, sources: [file] };
}

function summarize(items) {
  const s = { approved: 0, pending: 0, rejected: 0 };
  for (const it of Object.values(items)) s[it.status.toLowerCase()] += 1;
  return s;
}

function samePath(a, b) {
  const na = path.resolve(a);
  const nb = path.resolve(b);
  return process.platform === 'win32' ? na.toLowerCase() === nb.toLowerCase() : na === nb;
}

/**
 * The most recent scope approval recorded for `absPath` in any run inside the model, with whether it
 * still holds: every file it was read from must still match its fingerprint, and the artifact header
 * must still read `Mixed` (a header that moved to Approved / Pending / Rejected is a new decision).
 * @returns {null|{record: object, run: string, verified: boolean, reason: string}}
 */
function findScopeApproval(runsDir, absPath, { dataRoot } = {}) {
  const root = dataRoot || path.dirname(runsDir);
  let latest = null;
  let entries = [];
  try {
    entries = fs.readdirSync(runsDir, { withFileTypes: true }).filter((e) => e.isDirectory());
  } catch {
    return null;
  }
  for (const e of entries) {
    let meta;
    try {
      meta = JSON.parse(fs.readFileSync(path.join(runsDir, e.name, 'metadata', 'run.json'), 'utf8'));
    } catch {
      continue;
    }
    if (!meta.stateSchemaVersion) continue;
    for (const rec of meta.scopeApprovals || []) {
      if (!samePath(path.resolve(root, rec.artifact), absPath)) continue;
      if (!latest || rec.at > latest.record.at) latest = { record: rec, run: e.name };
    }
  }
  if (!latest) return null;
  const changed = Object.entries(latest.record.fingerprints || {})
    .filter(([rel, sha]) => fingerprintFile(path.resolve(root, rel)) !== sha)
    .map(([rel]) => rel);
  if (changed.length) {
    return { ...latest, verified: false, reason: `changed since the scope was approved (${changed.join(', ')}) — approve the scope again` };
  }
  const header = readArtifactApprovalStatus(absPath).status;
  if (header !== 'Mixed') {
    return { ...latest, verified: false, reason: `the header now reads ${header}, not Mixed — the recorded partial scope no longer describes it` };
  }
  return { ...latest, verified: true, reason: `scope approved by ${latest.record.approvedBy} at ${latest.record.at} (run ${latest.run})` };
}

module.exports = {
  ITEM_STATUSES,
  ScopeApprovalError,
  kindOf,
  parseApprovalScopeTable,
  dependenciesFromTraceRow,
  parseTraceability,
  buildScopeItems,
  summarize,
  findScopeApproval,
};
