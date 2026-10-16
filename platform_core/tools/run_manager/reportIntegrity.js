// Report integrity — one report per revision, and the three renderings of it agree.
//
// WHY THIS EXISTS
// A Final QA Report is run evidence (pipeline.md §6 Rule 7b): once delivered it is never rewritten. A
// repair after it (reporting-skill §7A) produces `Final_QA_Report.rev-N.md`, never an edit of the first.
// And each report exists three times — Markdown (authoritative), its `.report.json` model, and the
// HTML built from that model (pipeline.md §17). If they disagree, a stakeholder reading the HTML is
// reading something the approved Markdown does not say.

const fs = require('fs');
const path = require('path');

const { normalizeStatus, STATUS_NAMES } = require('./testStatus');

/**
 * A report's status label, as a canonical status. Reading raw results never yields Unverified or
 * Unrecognized (those are conclusions, not recordable statuses), but a REPORT states them as counts — so
 * a label that names any canonical status exactly is that status.
 */
function reportStatus(label) {
  const exact = STATUS_NAMES.find((n) => n.toLowerCase() === String(label).trim().toLowerCase());
  if (exact) return { status: exact, recognized: true };
  return normalizeStatus(label);
}

/**
 * The paths the next Final QA Report must be written to: the first report if none exists yet, else
 * the next free revision. It never returns a path that already exists.
 * @returns {{revision: number, md: string, json: string, html: string, previous: string[]}}
 */
function reportRevisionPath(runsDir, folderName) {
  const dir = path.join(runsDir, folderName, 'reporting');
  let names = [];
  try { names = fs.readdirSync(dir); } catch { /* no report yet */ }
  const revisions = names.map((n) => n.match(/^Final_QA_Report\.rev-(\d+)\.md$/)).filter(Boolean).map((m) => Number(m[1]));
  const hasFirst = names.includes('Final_QA_Report.md');
  const revision = !hasFirst ? 0 : (revisions.length ? Math.max(...revisions) : 0) + 1;
  const base = revision === 0 ? 'Final_QA_Report' : `Final_QA_Report.rev-${revision}`;
  const previous = [
    ...(hasFirst ? ['Final_QA_Report.md'] : []),
    ...revisions.sort((a, b) => a - b).map((n) => `Final_QA_Report.rev-${n}.md`),
  ];
  return {
    revision,
    md: path.join(dir, `${base}.md`),
    json: path.join(dir, `${base}.report.json`),
    html: path.join(dir, `${base}.html`),
    previous,
  };
}

/**
 * The outcome a run's report must agree with: the most recently recorded execution outcome (4M, 5A or
 * 5H). A 5H outcome covers every cycle up to its reruns, so after self-healing it is the latest one.
 * Used by `state report-check` and by the 6A completion gate alike, so the two never disagree.
 * @returns {null|{stageId: string, outcome: object}}
 */
function authoritativeOutcome(meta) {
  let best = null;
  for (const id of ['4M', '5A', '5H']) {
    const o = meta?.stages?.[id]?.outcome;
    if (o && (!best || String(o.at) >= String(best.outcome.at))) best = { stageId: id, outcome: o };
  }
  return best;
}

/** Status counts from the first `| Status | Count |` table in a Markdown report. */
function markdownCounts(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  const i = lines.findIndex((l) => /^\|\s*\**Status\**\s*\|\s*\**Count\**\s*\|/i.test(l));
  if (i === -1) return null;
  const out = {};
  for (let j = i + 2; j < lines.length && /^\|/.test(lines[j]); j += 1) {
    const [label, value] = lines[j].split('|').slice(1, 3).map((c) => c.replace(/[*`]/g, '').trim());
    const n = Number(value);
    const s = reportStatus(label);
    if (s.recognized && Number.isFinite(n)) out[s.status] = (out[s.status] || 0) + n;
  }
  return out;
}

/**
 * Checks that a report's Markdown, JSON model and HTML agree with each other and with the recorded
 * test outcome:
 *   - the HTML was rendered from exactly this JSON (its embedded model fingerprint matches);
 *   - the JSON's status counts and the Markdown's `| Status | Count |` table equal the outcome counts,
 *     status by status (statuses with a zero count may be omitted);
 *   - a green indicator is shown only for an all-passed outcome; the JSON's declared verdict matches.
 * Strict mode (the 6A completion gate) adds:
 *   requireOutcome — a report that counts any result needs a recorded outcome to be checked against;
 *   requireVerdict — the model must declare `outcomeVerdict`, so its verdict can be compared.
 * @param {{md?: string, json: string, html?: string, outcome?: {counts: object, verdict: string},
 *          requireOutcome?: boolean, requireVerdict?: boolean}} paths
 * @returns {{ok: boolean, issues: string[]}}
 */
/**
 * The contract position of a run's scopes, read from the API Contract Tool (registry.scopeStatus — the data
 * `api_contract/cli.js status --json` prints). Null when the run names no scope or the tool cannot be read.
 */
function contractPosition(runsDir, folderName) {
  try {
    // eslint-disable-next-line global-require
    const { resolveScopeRoots } = require('./stageGate');
    // eslint-disable-next-line global-require
    const R = require('../api_contract/registry');
    const dataRoot = path.dirname(runsDir);
    const meta = JSON.parse(fs.readFileSync(path.join(runsDir, folderName, 'metadata', 'run.json'), 'utf8'));
    const { roots } = resolveScopeRoots(meta, dataRoot);
    const seen = new Set(); const statuses = [];
    for (const root of roots) for (const sc of R.scopesForRoot(dataRoot, root)) { if (!seen.has(sc.rel)) { seen.add(sc.rel); statuses.push(R.scopeStatus(dataRoot, sc)); } }
    return { blockers: statuses.reduce((n, x) => n + x.blockers.length, 0), warnings: statuses.reduce((n, x) => n + x.warnings.length, 0), statuses };
  } catch { return null; }
}

function checkReportConsistency({ md, json, html, outcome, contract = null, evidence = null, requireOutcome = false, requireVerdict = false }) {
  // eslint-disable-next-line global-require
  const rb = require('../report_builder');
  const issues = [];
  // Execution evidence integrity (Phase 9.1, F-03): a report is never verified against an outcome whose
  // recorded results have since been rewritten or removed (resultsIntegrity.js).
  if (evidence && evidence.state === 'modified') {
    // eslint-disable-next-line global-require
    issues.push(require('./resultsIntegrity').integrityMessage(evidence));
  }
  let model;
  try {
    model = JSON.parse(fs.readFileSync(json, 'utf8'));
  } catch (err) {
    return { ok: false, issues: [`${path.basename(json)}: cannot be read as JSON (${err.message})`] };
  }
  let normalized;
  try {
    normalized = rb.normalizeModel(model);
  } catch (err) {
    issues.push(`${path.basename(json)}: not a valid report model — ${err.message}`);
  }

  if (html) {
    const text = fs.existsSync(html) ? fs.readFileSync(html, 'utf8') : null;
    const m = text && text.match(/<meta name="report-model-sha256" content="([0-9a-f]{64})">/);
    if (!text) issues.push(`${path.basename(html)}: missing — rebuild it from ${path.basename(json)}`);
    else if (!m) issues.push(`${path.basename(html)}: carries no model fingerprint — rebuild it with report_builder`);
    else if (m[1] !== rb.modelFingerprint(model)) issues.push(`${path.basename(html)}: was not built from the current ${path.basename(json)} — rebuild it`);
    else {
      // The meta tag only says which model the page claims; the page itself must be exactly what that model
      // renders (Phase 9.3, F-28) — a hand edit to the visible body is caught, not only a missing tag.
      const v = rb.verifyHtml(text, model);
      if (!v.ok) issues.push(`${path.basename(html)}: ${v.reason}`);
    }
  }

  const zeroless = (c) => Object.fromEntries(Object.entries(c || {}).filter(([, v]) => v > 0));
  const expected = outcome ? zeroless(outcome.counts) : null;
  const same = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

  if (normalized && normalized.summary) {
    const jsonCounts = {};
    for (const c of normalized.summary.counts) {
      const s = reportStatus(c.label);
      const key = s.recognized ? s.status : c.label;
      jsonCounts[key] = (jsonCounts[key] || 0) + c.value;
    }
    if (expected && !same(zeroless(jsonCounts), expected)) {
      issues.push(`${path.basename(json)}: counts ${JSON.stringify(zeroless(jsonCounts))} differ from the recorded outcome ${JSON.stringify(expected)}`);
    }
    if (outcome && normalized.outcomeVerdict && normalized.outcomeVerdict !== outcome.verdict) {
      issues.push(`${path.basename(json)}: declares outcomeVerdict "${normalized.outcomeVerdict}", but the recorded outcome is "${outcome.verdict}"`);
    }
    if (normalized.statusPill && normalized.statusPill.tone === 'pass' && (!outcome || outcome.verdict !== 'all-passed')) {
      issues.push(`${path.basename(json)}: shows a green indicator, but the outcome is ${outcome ? `"${outcome.verdict}"` : 'unknown'}`);
    }
    // A green indicator also claims complete verification: not while some pass is shown to cover only
    // part of its Expected Result (assertionCoverage, Phase 5.7).
    const cov = outcome && outcome.assertionCoverage;
    if (normalized.statusPill && normalized.statusPill.tone === 'pass' && cov && (cov.partial || cov.unknown)) {
      issues.push(`${path.basename(json)}: shows a green indicator, but assertion coverage is incomplete — ${cov.partial} pass(es) cover part of their Expected Result, ${cov.unknown} cannot be measured`);
    }
    if (requireOutcome && !outcome && Object.keys(zeroless(jsonCounts)).length) {
      issues.push(`${path.basename(json)}: counts ${JSON.stringify(zeroless(jsonCounts))}, but this run has no recorded test outcome to verify them against — record it first (state outcome <4M|5A|5H> --from-results)`);
    }
    if (requireVerdict && outcome && !normalized.outcomeVerdict) {
      issues.push(`${path.basename(json)}: declares no outcomeVerdict — set it to the recorded verdict "${outcome.verdict}"`);
    }
  }

  // Contract health (Phase 8): what the report states must be what the contract tool says now, and a
  // report is never green while a contract blocker is unresolved.
  if (normalized && contract) {
    const sec = (model.sections || []).find((x) => /^API contract position$/i.test(String(x.title || '')));
    if (sec) {
      const stated = (sec.items || []).filter((it) => /contract blocker/i.test(String(it.kind || ''))).length;
      if (stated !== contract.blockers) issues.push(`${path.basename(json)}: states ${stated} API contract blocker(s), but the contract tool reports ${contract.blockers} now — rebuild the section from \`api_contract/cli.js status --json\``);
    }
    if (normalized.statusPill && normalized.statusPill.tone === 'pass' && contract.blockers) issues.push(`${path.basename(json)}: shows a green indicator while ${contract.blockers} API contract blocker(s) are unresolved`);
  }

  if (md) {
    const text = fs.existsSync(md) ? fs.readFileSync(md, 'utf8') : null;
    if (!text) issues.push(`${path.basename(md)}: missing`);
    else if (expected) {
      const mdCounts = markdownCounts(text);
      if (!mdCounts) issues.push(`${path.basename(md)}: has no | Status | Count | table to check`);
      else if (!same(zeroless(mdCounts), expected)) issues.push(`${path.basename(md)}: counts ${JSON.stringify(zeroless(mdCounts))} differ from the recorded outcome ${JSON.stringify(expected)}`);
    }
  }
  return { ok: issues.length === 0, issues };
}

module.exports = {
  reportRevisionPath,
  authoritativeOutcome,
  markdownCounts,
  checkReportConsistency,
  contractPosition,
};
