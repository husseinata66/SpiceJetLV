'use strict';
// Supplier Feature Runner — the pure half: reading a run's frozen plan, choosing a Setup Group's
// cases, the click guard, and the Markdown working log. No browser here; see runner.js. README.md.

class RunnerError extends Error {}

const STATUS = {
  PASSED: 'Passed', FAILED: 'Failed', BLOCKED: 'Blocked', INCONCLUSIVE: 'Inconclusive',
  NA: 'Not Applicable', NOT_RUN: 'Not run', EXCLUDED: 'Excluded',
};
// One case can be recorded by several steps; the worst result wins.
const SEVERITY = { Failed: 5, Blocked: 4, Inconclusive: 3, Passed: 2, 'Not Applicable': 1 };
// pipeline rule: a screenshot only for results that did not pass (ExecutionFlow §16.4).
const NEEDS_SCREENSHOT = new Set(['Failed', 'Blocked', 'Inconclusive']);
const REPORT_ORDER = ['Passed', 'Failed', 'Blocked', 'Inconclusive', 'Not Applicable', 'Not run', 'Excluded'];

/** "01 Default - 1 adult + …" → "01". */
function groupIdOf(setupGroup) {
  const m = String(setupGroup || '').trim().match(/^(\d+)/);
  return m ? m[1].padStart(2, '0') : null;
}

/**
 * runs/<run>/metadata/CapabilityPlan.md, as written by capability_gate. It is the run's frozen
 * decision of what may run, so it is read rather than recomputed from today's supplier.json.
 */
function parseCapabilityPlan(md) {
  const ids = (s) => [...String(s).matchAll(/`(TC-[A-Z0-9-]*\d+[a-z]?)`/g)].map((m) => m[1]);
  const section = (title) => (String(md).split(new RegExp(`^## ${title}[^\\n]*\\n`, 'm'))[1] || '').split(/^## /m)[0];
  const tableRows = (s) => s.split('\n').map((r) => r.split('|').map((x) => x.trim())).filter((c) => c.length > 3);

  const excluded = new Map();
  for (const c of tableRows(section('Excluded'))) if (/^TC-/.test(c[1])) excluded.set(c[1], c[3] || '');
  const capabilities = {};
  for (const c of tableRows(section('Supplier capabilities'))) {
    if (c[1] && c[2] && !/^(Capability|-+)$/.test(c[1])) capabilities[c[1]] = c[2];
  }
  const reviewLine = (String(md).match(/not yet approved at Review[^\n]*/) || [''])[0];
  const rules = ((String(md).match(/^Supplier rules: ([^\n]+)/m) || [])[1] || '')
    .split(',').map((s) => s.trim()).filter((s) => s && !/^(none|—|-)$/i.test(s));
  return {
    source: (String(md).match(/ from `([^`]+\.(?:xlsx|md))`/) || [])[1] || null,
    willRun: new Set(ids(section('Will run'))),
    awaitingReview: new Set(ids(reviewLine.split(':').slice(1).join(':'))),
    excluded, capabilities, rules,
  };
}

/** Every case of one Setup Group, each marked with what the run's plan says about it. */
function selectGroup(cases, plan, groupId) {
  return cases.filter((c) => groupIdOf(c.setupGroup) === groupId).map((c) => {
    if (plan.excluded.has(c.id)) return { ...c, plan: 'excluded', reason: `Not supported by supplier — ${plan.excluded.get(c.id)}` };
    if (plan.awaitingReview.has(c.id)) return { ...c, plan: 'excluded', reason: 'Not approved at Review' };
    if (!plan.willRun.has(c.id)) return { ...c, plan: 'excluded', reason: "Not in this run's Capability Plan" };
    return { ...c, plan: 'run' };
  });
}

/** Setup Groups in sheet order: id → { label, ids }. */
function listGroups(cases) {
  const groups = new Map();
  for (const c of cases) {
    const id = groupIdOf(c.setupGroup);
    if (!id) continue;
    if (!groups.has(id)) groups.set(id, { label: String(c.setupGroup).split(/\r?\n/)[0].replace(/^\d+\s*/, ''), ids: [] });
    groups.get(id).ids.push(c.id);
  }
  return new Map([...groups].sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * The click guard's single rule, shared by the tests and the page (serialised into it by runner.js,
 * so it must stay self-contained). A control whose visible name matches `forbid` and not `allow` is
 * never pressed: the runner does not book, hold or pay (human decision, 2026-10-18).
 */
function guardTest(cfg, name) {
  const n = String(name || '').replace(/\s+/g, ' ').trim();
  if (!n) return false;
  if (cfg.allow.some((r) => new RegExp(r, 'i').test(n))) return false;
  return cfg.forbid.some((r) => new RegExp(r, 'i').test(n));
}

/**
 * Runs inside the page (capture phase, before the app's own handlers). Self-contained on purpose.
 * A human gate (`ctx.humanGate`, assisted groups only) sets `window.__runnerHumanGate` to the patterns
 * of the one control the HUMAN may press — e.g. Book — while the runner sits idle waiting; it is cleared
 * as soon as the page moves on. Everything else stays refused, gate or not.
 */
function installGuard(cfg, test) {
  const nameOf = (el) => (el.innerText || el.value || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
  const gateLets = (n) => Array.isArray(window.__runnerHumanGate) && window.__runnerHumanGate.some((r) => new RegExp(r, 'i').test(n));
  const stop = (e, el) => {
    const n = nameOf(el);
    if (!test(cfg, n)) return;
    if (gateLets(n)) {
      try { window.__runnerGatePressed(n); } catch (_) { /* binding missing: the press still goes through */ }
      return;
    }
    e.stopImmediatePropagation();
    e.preventDefault();
    try { window.__runnerRefused(n); } catch (_) { /* binding missing: the click is still refused */ }
  };
  window.addEventListener('click', (e) => {
    const el = e.target && e.target.closest
      ? e.target.closest('button, a, [role="button"], input[type="submit"], input[type="button"]') : null;
    if (el) stop(e, el);
  }, true);
  window.addEventListener('submit', (e) => { if (e.submitter) stop(e, e.submitter); }, true);
}

function guardConfig(guard) {
  if (!guard || !Array.isArray(guard.forbid) || !guard.forbid.length || !Array.isArray(guard.allow)) {
    throw new RunnerError('The feature runner must export actionGuard { forbid: [RegExp…], allow: [RegExp…] }. The runner never runs without it.');
  }
  const src = (r) => (r instanceof RegExp ? r.source : String(r));
  return { forbid: guard.forbid.map(src), allow: guard.allow.map(src) };
}

function tally(results) {
  const t = {};
  for (const r of results) t[r.status] = (t[r.status] || 0) + 1;
  return t;
}

function tallyText(results) {
  const t = tally(results);
  return REPORT_ORDER.filter((s) => t[s]).map((s) => `${s} ${t[s]}`).join(' · ');
}

function durationText(ms) {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
}

/** The working log. Markdown is the authoritative artifact; this is never an HTML report. */
function renderLog(m) {
  const cell = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  const shown = m.results.filter((r) => r.status !== STATUS.EXCLUDED);
  const excluded = m.results.filter((r) => r.status === STATUS.EXCLUDED);
  const lines = [
    `# Group ${m.group} results — ${m.feature} / ${m.supplier} (${m.runFolder})`,
    '',
    `Generated by \`platform_core/tools/supplier_feature_runner\` · ${m.mode} · started ${m.startedAt} · took ${m.duration}.`,
    `Setup Group ${m.group}: ${m.groupLabel}. Working log, not the final report.`,
    '',
    '## Environment as it actually behaved',
    '',
    '| Item | Observed |',
    '|---|---|',
    ...m.environment.map(([k, v]) => `| ${cell(k)} | ${cell(v)} |`),
    '',
    '## Results',
    '',
    '| Case | Result | Time | Evidence |',
    '|---|---|---|---|',
    ...shown.map((r) => `| ${r.id} | ${r.status} | ${r.sec == null ? '–' : `${r.sec} s`} | ${cell(r.evidence)}${r.screenshot ? ` Screenshot: \`${r.screenshot}\`.` : ''} |`),
    '',
  ];
  if (excluded.length) {
    lines.push('## Excluded before execution', '', '| Case | Reason |', '|---|---|',
      ...excluded.map((r) => `| ${r.id} | ${cell(r.evidence)} |`), '');
  }
  lines.push('## Tally', '', tallyText(m.results), '',
    m.refused.length
      ? `**Stopped:** the runner tried to press ${m.refused.map((n) => `"${n}"`).join(', ')} and the guard refused it. Nothing was booked.`
      : 'Book, Hold, Pay and Save Quote were never pressed (the click guard refused nothing).',
    '');
  if (m.aborted) lines.push(`**Run stopped early:** ${m.aborted}`, '');
  return lines.join('\n');
}

/** What the CLI prints — kept short on purpose: this is what a person or an agent reads. */
function renderSummary(m, logPath) {
  const notPassed = m.results.filter((r) => NEEDS_SCREENSHOT.has(r.status));
  return [
    `${m.runFolder} · ${m.feature}/${m.supplier} · Group ${m.group} · ${m.mode} · ${m.duration}`,
    tallyText(m.results),
    ...notPassed.map((r) => `${r.status.toUpperCase().padEnd(12)} ${r.id}  ${String(r.evidence).slice(0, 140)}${r.screenshot ? `  [${r.screenshot}]` : ''}`),
    ...(m.aborted ? [`STOPPED      ${m.aborted}`] : []),
    `Log: ${logPath}`,
  ].join('\n');
}

module.exports = {
  RunnerError, STATUS, SEVERITY, NEEDS_SCREENSHOT,
  groupIdOf, parseCapabilityPlan, selectGroup, listGroups,
  guardTest, installGuard, guardConfig,
  tally, tallyText, durationText, renderLog, renderSummary,
};
