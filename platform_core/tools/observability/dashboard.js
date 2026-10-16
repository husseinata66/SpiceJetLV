// Observability — the read-only HTML dashboard.
//
// PRESENTATION ONLY. This file renders `ObservabilityMetrics.json` and computes nothing. There is no
// arithmetic here beyond turning a number into a bar width, and no metric is read from anywhere other
// than the canonical metrics object. If the dashboard and the Markdown report ever disagree, one of
// them has started calculating — and it will not be this one.
//
// NO DEPENDENCIES, NO NETWORK, NO BUILD STEP.
// The repository carries zero runtime dependencies (`"dependencies": {}`, enforced by
// scripts/verifyPackable.js), so a charting library was never an option, and a CDN <script> would
// make a QA artifact stop working the moment someone opened it offline or behind a proxy. Charts are
// plain HTML/CSS bars and one inline SVG donut. The output is a single self-contained file: open it
// with a double-click, no server, no internet.
//
// COLOUR CARRIES NO MEANING ON ITS OWN. Every status is also stated in text, and every bar has a
// numeric label. A red bar with no number would make the dashboard unreadable to anyone with a colour
// vision deficiency and unquotable in a report.

'use strict';

const { STAGES } = require('./schema');
const { isAvailable, formatDuration, formatRatio } = require('./formulas');
const { INSTRUMENTATION } = require('./aggregator');

/** HTML-escapes a value. Applied to EVERY interpolation without exception. */
function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const UNAVAILABLE_HTML = '<span class="unavail" title="Measured as unavailable — not zero">Unavailable</span>';

/** Renders a metric value. This is the one place `0` and `Unavailable` are told apart visually. */
function val(m, kind = 'count') {
  if (m === null || m === undefined) return UNAVAILABLE_HTML;
  if (typeof m !== 'object') return esc(m);
  if (!isAvailable(m)) return UNAVAILABLE_HTML;
  if (kind === 'duration') return esc(formatDuration(m));
  if (kind === 'ratio') return esc(formatRatio(m, 1));
  if (typeof m.value === 'boolean') return m.value ? 'Yes' : 'No';
  return esc(String(m.value));
}

/** The raw number, or null. Used for bar widths — never for display. */
const num = (m) => (m && m.available && Number.isFinite(m.value) ? m.value : null);

function kpi(label, m, kind = 'count', tone = 'neutral') {
  const unavailable = !(m && m.available);
  return `<div class="kpi ${unavailable ? 'kpi--unavail' : `kpi--${tone}`}">
      <div class="kpi__label">${esc(label)}</div>
      <div class="kpi__value">${val(m, kind)}</div>
    </div>`;
}

/**
 * A horizontal bar row. `max` scales the bar; the number is always printed beside it, so the bar is
 * an aid to comparison rather than the only way to read the value.
 */
function bar(label, value, max, tone, suffix = '') {
  if (value === null) {
    return `<div class="bar"><div class="bar__label">${esc(label)}</div>
      <div class="bar__track"><div class="bar__fill bar__fill--unavail" style="width:0%"></div></div>
      <div class="bar__value">${UNAVAILABLE_HTML}</div></div>`;
  }
  const pct = max > 0 ? Math.max(0.6, (value / max) * 100) : 0;
  return `<div class="bar"><div class="bar__label">${esc(label)}</div>
      <div class="bar__track"><div class="bar__fill bar__fill--${tone}" style="width:${pct.toFixed(2)}%"></div></div>
      <div class="bar__value">${esc(String(value))}${esc(suffix)}</div></div>`;
}

/** An inline SVG donut. Deterministic geometry — the same inputs always produce the same path data. */
function donut(segments) {
  const total = segments.reduce((n, s) => n + (s.value || 0), 0);
  if (!total) {
    return '<div class="donut-empty">No operations were evaluated.</div>';
  }
  const R = 52; const C = 2 * Math.PI * R;
  let offset = 0;
  const rings = segments.filter((s) => s.value > 0).map((s) => {
    const len = (s.value / total) * C;
    const el = `<circle class="donut__seg donut__seg--${s.tone}" r="${R}" cx="70" cy="70"
      stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}"
      stroke-dashoffset="${(-offset).toFixed(2)}"><title>${esc(s.label)}: ${s.value}</title></circle>`;
    offset += len;
    return el;
  }).join('');
  return `<div class="donut-wrap">
    <svg viewBox="0 0 140 140" class="donut" role="img" aria-label="Execution Safety decision distribution">
      <circle class="donut__bg" r="${R}" cx="70" cy="70"></circle>${rings}
      <text x="70" y="66" class="donut__total">${total}</text>
      <text x="70" y="82" class="donut__caption">operations</text>
    </svg>
    <ul class="legend">${segments.map((s) => `<li><span class="dot dot--${s.tone}"></span>${esc(s.label)}
      <strong>${s.value === null ? 'Unavailable' : s.value}</strong></li>`).join('')}</ul>
  </div>`;
}

function table(headers, rows, emptyMessage) {
  if (!rows.length) return `<p class="empty">${esc(emptyMessage)}</p>`;
  return `<div class="tablewrap"><table>
    <thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}

function section(id, title, body, note) {
  return `<section id="${esc(id)}" class="card">
    <h2>${esc(title)}</h2>
    ${note ? `<p class="note">${note}</p>` : ''}
    ${body}
  </section>`;
}

const STYLES = `
:root{
  --bg:#f6f7f9; --panel:#fff; --ink:#151922; --muted:#5b6472; --line:#e2e6ec;
  --success:#1a7f5a; --warning:#a86a00; --failure:#b3261e; --blocked:#5b4bc4;
  --neutral:#3a6ea5; --unavail:#8a929e;
}
@media (prefers-color-scheme: dark){
  :root{ --bg:#0f1216; --panel:#171b21; --ink:#e7ebf0; --muted:#9aa4b2; --line:#262c35;
    --success:#3ecf8e; --warning:#e0a33a; --failure:#ff6b60; --blocked:#9c8cff;
    --neutral:#6aa9e9; --unavail:#78818e; }
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
  font:15px/1.55 ui-sans-serif,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.wrap{max-width:1180px;margin:0 auto;padding:28px 20px 64px}
h1{font-size:24px;margin:0 0 4px} h2{font-size:16px;margin:0 0 14px;letter-spacing:.01em}
h3{font-size:13px;margin:20px 0 8px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
a{color:var(--neutral)}
.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:20px;margin:16px 0}
.note{color:var(--muted);font-size:13px;margin:-6px 0 14px}
.empty{color:var(--muted);font-style:italic;margin:4px 0}
.banner{border-radius:12px;padding:14px 18px;margin:16px 0;border:1px solid var(--line);font-size:14px}
.banner--warn{background:color-mix(in srgb,var(--warning) 12%,transparent);border-color:var(--warning)}
.banner--info{background:color-mix(in srgb,var(--neutral) 12%,transparent);border-color:var(--neutral)}
.banner--fixture{background:color-mix(in srgb,var(--blocked) 14%,transparent);border-color:var(--blocked)}
.banner strong{display:block;margin-bottom:4px}
.meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px 22px;margin-top:12px}
.meta div{font-size:13px} .meta dt{color:var(--muted);font-size:12px} .meta dd{margin:2px 0 0;font-weight:600}
.status-pill{display:inline-block;padding:3px 11px;border-radius:999px;font-size:12px;font-weight:700;
  border:1px solid currentColor}
.status-pill--full{color:var(--success)} .status-pill--partial{color:var(--warning)}
.status-pill--none{color:var(--unavail)} .status-pill--historical{color:var(--blocked)}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(158px,1fr));gap:12px}
.kpi{background:var(--panel);border:1px solid var(--line);border-left:3px solid var(--neutral);
  border-radius:9px;padding:13px 15px}
.kpi--success{border-left-color:var(--success)} .kpi--warning{border-left-color:var(--warning)}
.kpi--failure{border-left-color:var(--failure)} .kpi--blocked{border-left-color:var(--blocked)}
.kpi--unavail{border-left-color:var(--unavail)}
.kpi__label{font-size:11.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
.kpi__value{font-size:23px;font-weight:700;margin-top:5px;font-variant-numeric:tabular-nums}
.unavail{color:var(--unavail);font-size:14px;font-weight:600;font-style:italic}
.bar{display:grid;grid-template-columns:minmax(120px,220px) 1fr minmax(92px,auto);
  gap:12px;align-items:center;margin:7px 0;font-size:13.5px}
.bar__track{background:color-mix(in srgb,var(--ink) 8%,transparent);border-radius:5px;height:19px;overflow:hidden}
.bar__fill{height:100%;border-radius:5px}
.bar__fill--success{background:var(--success)} .bar__fill--failure{background:var(--failure)}
.bar__fill--warning{background:var(--warning)} .bar__fill--blocked{background:var(--blocked)}
.bar__fill--neutral{background:var(--neutral)} .bar__fill--unavail{background:var(--unavail)}
.bar__value{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}
.bar__label{color:var(--muted);overflow-wrap:anywhere}
.donut-wrap{display:flex;gap:26px;align-items:center;flex-wrap:wrap}
.donut{width:150px;height:150px;transform:rotate(-90deg)}
.donut__bg{fill:none;stroke:color-mix(in srgb,var(--ink) 8%,transparent);stroke-width:16}
.donut__seg{fill:none;stroke-width:16}
.donut__seg--success{stroke:var(--success)} .donut__seg--warning{stroke:var(--warning)}
.donut__seg--failure{stroke:var(--failure)} .donut__seg--neutral{stroke:var(--neutral)}
.donut__total,.donut__caption{transform:rotate(90deg);transform-origin:70px 70px;text-anchor:middle;
  fill:var(--ink)}
.donut__total{font-size:22px;font-weight:700} .donut__caption{font-size:9px;fill:var(--muted)}
.legend{list-style:none;padding:0;margin:0;font-size:13.5px}
.legend li{margin:5px 0} .legend strong{margin-left:6px;font-variant-numeric:tabular-nums}
.dot{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:8px}
.dot--success{background:var(--success)} .dot--warning{background:var(--warning)}
.dot--failure{background:var(--failure)} .dot--neutral{background:var(--neutral)}
.tablewrap{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:13.5px;min-width:520px}
th,td{text-align:left;padding:8px 11px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--muted);font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;font-weight:600}
tbody tr:last-child td{border-bottom:none}
code{font:12.5px ui-monospace,SFMono-Regular,Consolas,monospace;
  background:color-mix(in srgb,var(--ink) 6%,transparent);padding:1px 5px;border-radius:4px}
details{margin-top:12px} summary{cursor:pointer;color:var(--muted);font-size:13px;padding:5px 0}
summary:hover{color:var(--ink)}
.funnel{display:flex;flex-direction:column;gap:6px}
.tag{font-size:11px;padding:2px 7px;border-radius:4px;border:1px solid currentColor;font-weight:600}
.hstate{font-weight:700} .hstate--failure{color:var(--failure)} .hstate--warning{color:var(--warning)} .hstate--neutral{color:inherit} .hstate--unavail{color:var(--unavail)}
.tag--incomplete{color:var(--warning)} .tag--completed{color:var(--success)}
footer{color:var(--muted);font-size:12.5px;margin-top:26px;line-height:1.7}
@media print{ body{background:#fff} .card{break-inside:avoid} }
`;

/**
 * Renders the run's dashboard.
 *
 * @param {object} metrics - the canonical ObservabilityMetrics object; the ONLY data source
 * @param {{now: Date, fixture?: boolean, historical?: object|null, reportPath?: string}} opts
 * @returns {string} a complete, self-contained HTML document
 */
/** Dimension state → presentation tone. No state is ever shown green: health is not one figure. */
const HEALTH_TONE = { failures: 'failure', blocked: 'failure', 'evidence-modified': 'failure', incomplete: 'warning', repaired: 'warning', warnings: 'warning', 'needs-revalidation': 'warning', 'awaiting-decision': 'warning', 'in-progress': 'neutral', unavailable: 'unavail', unknown: 'unavail', 'not-registered': 'unavail', 'not-selected': 'unavail', clean: 'neutral', complete: 'neutral' };

/**
 * The authoritative Run Health panel — rendered from a runHealth snapshot exactly as it is (state words and
 * figures); nothing is computed here. Without a snapshot it says so, and is never green.
 */
function healthPanel(health, healthReport) {
  if (!health) {
    return section('verified-health', 'Verified Execution Health (authoritative)', `<p class="empty"><strong>Unavailable.</strong>
      ${esc((healthReport && healthReport.reason) || 'The Run Health view could not be read for this run.')} The telemetry below is not a
      substitute for it.</p>`, 'Source: observability health — workflow planner, execution history, repair report, API contract tool, module manager.');
  }
  const dims = [];
  for (const [b, h] of Object.entries(health.health.byBranch)) {
    for (const d of ['application', 'automation', 'environment', 'coverage']) dims.push([`${d[0].toUpperCase()}${d.slice(1)} (${b})`, h[d].state]);
  }
  dims.push(['Contract', health.health.contract.state], ['Workflow', health.health.workflow.state]);
  const link = healthReport && healthReport.revision
    ? `<a href="${esc(healthReport.revision)}.html">${esc(healthReport.revision)}</a> — ${healthReport.current ? 'current' : '<strong>stale</strong>: the authoritative sources changed after it was written'}`
    : 'none written yet — <code>observability health --out</code>';
  return section('verified-health', 'Verified Execution Health (authoritative)', `
    <p><strong>Test verdict (recorded):</strong> ${esc(health.verdict.overall)} — final ${esc(health.verdict.final)}, first attempt ${esc(health.verdict.firstAttempt)}.
      There is no overall health figure; each dimension stands on its own.</p>
    ${table(['Dimension', 'State'], dims.map(([d, st]) => [esc(d), `<span class="hstate hstate--${HEALTH_TONE[st] || 'unavail'}">${esc(st)}</span>`]), '')}
    <p class="note">Run Health report: ${link}. Snapshot <code>${esc(health.fingerprint.slice(0, 16))}</code>.</p>
    <details><summary>Figures (as the Run Health report states them)</summary>
      <ul class="health-figures">${health.figures.map(([k, v]) => `<li data-figure="${esc(k)}">${esc(k)}: ${esc(v)}</li>`).join('')}</ul></details>`,
  'Read from the authoritative sources by <code>observability health</code> — never recomputed here. The telemetry sections below show what was instrumented; where they disagree, execution history governs.');
}

function renderDashboard(metrics, { now, fixture = false, historical = null, reportPath = 'ObservabilityReport.md', health = null, healthReport = null } = {}) {
  if (!metrics || typeof metrics !== 'object' || !metrics.runId || !metrics.instrumentation) {
    throw new Error('renderDashboard requires a canonical metrics object (runId + instrumentation). '
      + 'It renders metrics; it never reconstructs them.');
  }
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error('renderDashboard requires an explicit valid `now` Date.');
  }

  const inst = metrics.instrumentation;
  const F = metrics.formulas;
  const H = [];

  // ── Banners ───────────────────────────────────────────────────────────────────────────────
  if (fixture) {
    H.push(`<div class="banner banner--fixture"><strong>Fixture / Example — not real run telemetry</strong>
      Rendered from a synthetic event stream to demonstrate the format. No run produced these numbers.</div>`);
  }
  if (historical) {
    H.push(`<div class="banner banner--info"><strong>Historical Derived Metrics</strong>
      ${esc(historical.banner)}</div>`);
  }
  if (inst.status === INSTRUMENTATION.NONE) {
    H.push(`<div class="banner banner--info"><strong>Not Instrumented</strong>
      This run recorded no observability telemetry and none is invented for it. Stage timings, tool
      calls and human decision counts are unavailable, not zero.</div>`);
  } else if (inst.status === INSTRUMENTATION.PARTIAL) {
    H.push(`<div class="banner banner--warn"><strong>Partially Instrumented — this is not a complete picture</strong>
      <ul>${inst.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>`);
  }

  // ── Header ────────────────────────────────────────────────────────────────────────────────
  const pillClass = {
    [INSTRUMENTATION.FULL]: 'full', [INSTRUMENTATION.PARTIAL]: 'partial',
    [INSTRUMENTATION.NONE]: 'none', [INSTRUMENTATION.HISTORICAL]: 'historical',
  }[inst.status] || 'none';

  const meta = [
    ['Run ID', `<code>${esc(metrics.runId)}</code>`],
    ['Scope / Target', `${esc(metrics.run.scope || '—')} / ${esc(metrics.run.target || '—')}`],
    ['Environment', esc(metrics.run.environment || '—')],
    ['Workflow', esc(metrics.run.workflow || '—')],
    ['Started', esc(metrics.run.startedTime || '—')],
    ['Completed', esc(metrics.run.finishedTime || 'Not recorded')],
    ['Total duration', val(metrics.run.durationMs, 'duration')],
    ['Instrumentation', `<span class="status-pill status-pill--${pillClass}">${esc(inst.status)}</span>`],
    ['Schema version', `v${esc(metrics.schemaVersion)}`],
    ['Events recorded', `${inst.eventCount} <span class="unavail" style="font-style:normal">`
      + `(${inst.bySource['platform-tool']} tool · ${inst.bySource.skill} skill)</span>`],
  ];

  const header = `<header>
    <h1>Observability — ${esc(metrics.run.folderName)}</h1>
    <p class="note">Read-only view of <code>ObservabilityMetrics.json</code>. Presentation only —
      the JSON metrics and <a href="${esc(reportPath)}">the Markdown report</a> remain authoritative.</p>
    <dl class="meta">${meta.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>
  </header>`;

  // ── KPI cards ─────────────────────────────────────────────────────────────────────────────
  const kpis = `<div class="kpis">
    ${kpi('Total Duration', metrics.run.durationMs, 'duration')}
    ${kpi('Test Cases in Scope', metrics.testDesign.totalCases)}
    ${kpi('Review Approved', metrics.testDesign.review.approved, 'count', 'success')}
    ${kpi('Automation Approved', metrics.testDesign.automation.approved, 'count', 'success')}
    ${kpi('Tests Executed', metrics.execution.executed)}
    ${kpi('Passed (telemetry)', metrics.execution.passed, 'count', healthIsClean(health) ? 'success' : 'neutral')}
    ${kpi('Failed (telemetry)', metrics.execution.failed, 'count', 'failure')}
    ${kpi('Blocked', metrics.execution.blocked, 'count', 'blocked')}
    ${kpi('Human Decisions', metrics.humanDecisions.requested)}
    ${kpi('Safety Blocks', metrics.safety.blocks, 'count', 'blocked')}
    ${kpi('Tool Failures', metrics.tools.totals.failed, 'count', 'failure')}
    ${kpi('Retries', metrics.tools.totals.retries, 'count', 'warning')}
    ${kpi('First-Pass Automation', F.FIRST_PASS_AUTOMATION_SUCCESS, 'ratio', 'success')}
    ${kpi('Repair Cycles', metrics.repair.cycles, 'count', 'warning')}
  </div>`;

  // ── Stage durations ───────────────────────────────────────────────────────────────────────
  const stageRows = Object.values(metrics.stages);
  const stageMax = Math.max(0, ...stageRows.map((s) => num(s.durationMs) || 0));
  const stageBars = stageRows.length
    ? stageRows.map((s) => {
      const d = num(s.durationMs);
      if (d === null) {
        return `<div class="bar"><div class="bar__label">${esc(s.name)}</div>
          <div class="bar__track"><div class="bar__fill bar__fill--unavail" style="width:0%"></div></div>
          <div class="bar__value"><span class="tag tag--incomplete">Incomplete</span></div></div>`;
      }
      const pct = stageMax > 0 ? Math.max(0.6, (d / stageMax) * 100) : 0;
      return `<div class="bar"><div class="bar__label">${esc(s.name)}</div>
        <div class="bar__track"><div class="bar__fill bar__fill--neutral" style="width:${pct.toFixed(2)}%"></div></div>
        <div class="bar__value">${esc(formatDuration(s.durationMs))}</div></div>`;
    }).join('')
    : '<p class="empty">No stage was instrumented in this run. Stage durations are unavailable, not zero.</p>';

  const unreached = Object.keys(STAGES).filter((id) => !metrics.stages[id]).map((id) => STAGES[id]);

  // ── Governance ────────────────────────────────────────────────────────────────────────────
  const td = metrics.testDesign;
  const revMax = Math.max(0, ...['approved', 'rejected', 'pending'].map((k) => num(td.review[k]) || 0));
  const autMax = Math.max(0, ...['approved', 'rejected', 'pending'].map((k) => num(td.automation[k]) || 0));
  const governance = `
    <h3>Review</h3>
    ${bar('Approved', num(td.review.approved), revMax, 'success')}
    ${bar('Rejected', num(td.review.rejected), revMax, 'failure')}
    ${bar('Pending', num(td.review.pending), revMax, 'warning')}
    <h3>Automation</h3>
    ${bar('Approved', num(td.automation.approved), autMax, 'success')}
    ${bar('Rejected', num(td.automation.rejected), autMax, 'failure')}
    ${bar('Pending', num(td.automation.pending), autMax, 'warning')}
    <p class="note" style="margin-top:14px">Acceptance rate ${val(F.TC_ACCEPTANCE_RATE, 'ratio')}
      &nbsp;·&nbsp; <code>${esc(F.TC_ACCEPTANCE_RATE.expression)}</code>. Human acceptance, not correctness.</p>
    <p class="note">${esc(td.provenanceNote || '')}</p>`;

  // ── Execution ─────────────────────────────────────────────────────────────────────────────
  const ex = metrics.execution;
  const exMax = Math.max(0, ...['passed', 'failed', 'skipped', 'blocked'].map((k) => num(ex[k]) || 0));
  const execution = `
    ${bar('Passed', num(ex.passed), exMax, healthIsClean(health) ? 'success' : 'neutral')}
    ${bar('Failed', num(ex.failed), exMax, 'failure')}
    ${bar('Skipped', num(ex.skipped), exMax, 'warning')}
    ${bar('Blocked', num(ex.blocked), exMax, 'blocked')}
    <p class="note" style="margin-top:12px">Of the blocked total, ${val(ex.blockedBySafety)} were blocked by
      <strong>Execution Safety policy</strong> — never executed, and never counted as an application,
      automation, or environment failure. Pass rate ${val(F.EXECUTION_PASS_RATE, 'ratio')}.</p>`;

  // ── Automation funnel — every stage shown, unavailable ones included ──────────────────────
  const funnelSteps = [
    ['Approved Test Cases', td.automation.approved], ['Automation Selected', metrics.automation.selected],
    ['Generated', metrics.automation.generated], ['Compiled', metrics.automation.compilePassed],
    ['Executed', ex.executed], ['First-Pass Passed', ex.firstAttempt.passed], ['Final Passed', ex.passed],
  ];
  const funnelMax = Math.max(0, ...funnelSteps.map(([, m]) => num(m) || 0));
  const funnel = `<div class="funnel">${funnelSteps
    .map(([label, m]) => bar(label, num(m), funnelMax, 'neutral')).join('')}</div>
    <p class="note" style="margin-top:12px">No step is skipped. A step the platform could not measure is shown
      as <em>Unavailable</em> rather than inferred from the steps around it.</p>`;

  // ── Human governance ──────────────────────────────────────────────────────────────────────
  const hd = metrics.humanDecisions;
  const catRows = Object.entries(hd.byCategory)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([c, v]) => [esc(c), String(v.requested), String(v.resolved), String(v.pending)]);
  const governanceHuman = `<div class="kpis" style="margin-bottom:16px">
      ${kpi('Requested', hd.requested)} ${kpi('Resolved', hd.resolved, 'count', 'success')}
      ${kpi('Pending', hd.pending, 'count', 'warning')}
      ${kpi('Per Stage', F.HUMAN_DECISIONS_PER_STAGE, 'ratio')}
    </div>
    ${table(['Category', 'Requested', 'Resolved', 'Pending'], catRows,
    'No Human Decision was recorded for this run.')}
    <p class="note" style="margin-top:12px">${esc(hd.interpretation)} Categories come from the recorded
      event, never inferred from free text.</p>`;

  // ── Safety ────────────────────────────────────────────────────────────────────────────────
  const sf = metrics.safety;
  const safety = `${donut([
    { label: 'Allowed', value: num(sf.allowed) || 0, tone: 'success' },
    { label: 'Approval Required', value: num(sf.approvalRequired) || 0, tone: 'warning' },
    { label: 'Forbidden', value: num(sf.forbidden) || 0, tone: 'failure' },
  ])}
    <div class="kpis" style="margin-top:18px">
      ${kpi('Pre-Authorized', sf.preAuthorized)} ${kpi('Blocked by Safety', sf.blocks, 'count', 'blocked')}
      ${kpi('Cleanup Required', sf.cleanupRequired, 'count', 'warning')}
      ${kpi('Cleanup Completed', sf.cleanupCompleted, 'count', 'success')}
      ${kpi('Cleanup Rate', F.CLEANUP_COMPLETION_RATE, 'ratio')}
    </div>
    <p class="note" style="margin-top:14px">Policy
      ${sf.policyId ? `<code>${esc(sf.policyId)}</code> v${esc(sf.policyVersion)}` : '—'}
      ${sf.policyHash ? ` · <code>${esc(sf.policyHash)}</code>` : ''}.
      Consumed from Execution Safety evidence and never re-evaluated. A high block count means the
      policy did its job.</p>
    ${table(['Authorization', 'Action', 'Ownership', 'Module', 'Approved by', 'Approved at'],
    sf.authorizations.map((a) => [`<code>${esc(a.authorizationId)}</code>`, esc(a.action),
      esc(a.ownership), esc(a.module || '—'), esc(a.approvedBy || '—'), esc(a.approvedAt || '—')]),
    'No scoped authorization was granted for this run.')}`;

  // ── Tools ─────────────────────────────────────────────────────────────────────────────────
  const tt = metrics.tools.totals;
  const toolMax = Math.max(0, ...metrics.tools.byTool.map((x) => x.calls));
  const tools = `<div class="kpis" style="margin-bottom:16px">
      ${kpi('Total Calls', tt.calls)} ${kpi('Succeeded', tt.succeeded, 'count', 'success')}
      ${kpi('Failed', tt.failed, 'count', 'failure')} ${kpi('Retries', tt.retries, 'count', 'warning')}
      ${kpi('Timeouts', tt.timeouts, 'count', 'warning')}
      ${kpi('Failure Rate', F.TOOL_FAILURE_RATE, 'ratio')}
    </div>
    ${metrics.tools.byTool.length
    ? metrics.tools.byTool.map((x) => bar(x.tool, x.calls, toolMax, x.failed > 0 ? 'failure' : 'neutral',
      x.failed ? ` (${x.failed} failed)` : '')).join('')
    : '<p class="empty">No tool activity was recorded. Only tools actually observed are listed.</p>'}`;

  // ── Validation ────────────────────────────────────────────────────────────────────────────
  const vv = metrics.validation;
  const validation = `<div class="kpis">
      ${kpi('Validation Runs', vv.runs)} ${kpi('Passed', vv.passed, 'count', 'success')}
      ${kpi('Failed', vv.failed, 'count', 'failure')}
      ${kpi('Failure Rate', F.VALIDATION_FAILURE_RATE, 'ratio')}
    </div>
    ${vv.byKind.length ? table(['Kind', 'Passed', 'Failed'],
    vv.byKind.map((k) => [`<code>${esc(k.kind)}</code>`, String(k.passed), String(k.failed)]), '') : ''}`;

  // ── Repair / rework ───────────────────────────────────────────────────────────────────────
  const rp = metrics.repair;
  const repair = `<div class="kpis">
      ${kpi('Repair Cycles', rp.cycles)} ${kpi('Attempts', rp.attempts)}
      ${kpi('Successes', rp.successes, 'count', 'success')}
      ${kpi('Tests Repaired', rp.testsRepaired, 'count', 'success')}
      ${kpi('Remaining Failures', rp.remainingFailures, 'count', 'failure')}
      ${kpi('Artifacts Re-edited', rp.rework.artifactsUpdatedAfterCreation, 'count', 'warning')}
      ${kpi('Human Corrections', rp.rework.humanCorrections)}
    </div>
    <p class="note" style="margin-top:14px">Explicit counters only — there is no <em>Rework Score</em>,
      because no defensible formula for one exists. Human corrections are unavailable: a git diff
      proves a change, not its author.</p>`;

  // ── AI usage — always shown ───────────────────────────────────────────────────────────────
  const ai = `<div class="kpis">
      ${kpi('Token Usage', metrics.aiUsage.tokens.total)}
      ${kpi('Cost', metrics.aiUsage.cost.total)}
      ${kpi('Provider', metrics.aiUsage.provider)}
      ${kpi('Model', metrics.aiUsage.model)}
    </div>
    <p class="note" style="margin-top:14px"><strong>Reason:</strong> ${esc(metrics.aiUsage.reason)}</p>
    <p class="note">No token count is estimated from text length and no cost is computed from hardcoded
      pricing. This section is shown rather than hidden so the measurement boundary stays visible.</p>`;

  // ── Detail tables ─────────────────────────────────────────────────────────────────────────
  const detail = `
    <details><summary>Stage details</summary>${table(['Stage', 'Started', 'Completed', 'Duration', 'Status'],
    stageRows.map((s) => [esc(s.name), esc(s.startedAt), esc(s.completedAt || '—'),
      val(s.durationMs, 'duration'),
      `<span class="tag tag--${s.status === 'Incomplete' ? 'incomplete' : 'completed'}">${esc(s.status)}</span>`]),
    'No stage telemetry.')}</details>

    <details><summary>Human Decisions</summary>${table(['ID', 'Category', 'Requested', 'Resolved', 'Latency', 'Status'],
    hd.entries.map((d) => [`<code>${esc(d.decisionId)}</code>`, esc(d.category), esc(d.requestedAt),
      esc(d.resolvedAt || '—'), val(d.latencyMs, 'duration'), esc(d.status)]),
    'No Human Decision was recorded.')}</details>

    <details><summary>Tool activity</summary>${table(['Tool', 'Calls', 'Success', 'Failure', 'Retries'],
    metrics.tools.byTool.map((x) => [`<code>${esc(x.tool)}</code>`, String(x.calls), String(x.succeeded),
      String(x.failed), String(x.retries)]), 'No tool activity was recorded.')}</details>

    <details><summary>Execution results</summary>${table(['Test ID', 'Status', 'Attempt', 'Cycle', 'Classification'],
    ex.byTest.map((x) => [`<code>${esc(x.testCaseId || '—')}</code>`, esc(x.status),
      esc(x.attempt ?? '—'), esc(x.cycle ?? '—'), esc(x.classification || '—')]),
    'No test execution result was recorded.')}</details>`;

  // ── Trends ────────────────────────────────────────────────────────────────────────────────
  const trends = `<p class="empty">Trend data unavailable — requires multiple instrumented runs.</p>
    <p class="note">The metrics schema is versioned and stable across runs, so run duration, human
      decisions, acceptance rate, first-pass success, retry rate, tool failure rate, safety blocks and
      repair cycles will all be comparable once more than one instrumented run exists. No trend is
      fabricated from a single data point.</p>`;

  // ── Historical ────────────────────────────────────────────────────────────────────────────
  const historicalSection = historical ? section('historical', 'Historical Derived Metrics', `
    <div class="kpis">
      ${kpi('Duration', historical.run.durationMs, 'duration')}
      ${kpi('Execution Cycles', historical.execution.cyclesObserved)}
      ${kpi('Tests (Surefire)', historical.execution.tests)}
      ${kpi('Failures', historical.execution.failures, 'count', 'failure')}
      ${kpi('Skipped', historical.execution.skipped, 'count', 'warning')}
      ${kpi('Runner Seconds', historical.execution.runnerSeconds)}
    </div>
    <h3>Not recoverable for this run</h3>
    ${table(['Metric', 'Why'], Object.entries(historical.notInstrumented)
    .map(([k, v]) => [`<code>${esc(k)}</code>`, esc(v.reason)]), '')}
    <h3>Limitations</h3><ul>${historical.limitations.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`,
  `Source: ${esc(historical.execution.source || 'run artifacts')}. These are facts read from immutable
    artifacts, not telemetry, and are kept apart from instrumented metrics so the coverage difference
    stays visible.`) : '';

  const body = [
    header,
    ...H,
    healthPanel(health, healthReport),
    `<section class="card"><h2>Telemetry Summary <span class="note" style="font-weight:400">— instrumented events, not verified execution health</span></h2>${kpis}</section>`,
    section('stages', 'Stage Duration', stageBars
      + (unreached.length ? `<p class="note" style="margin-top:14px">Not reached by this run:
        ${esc(unreached.join(' · '))}. A stage with no bar was never started — that is different from a
        stage that took no time.</p>` : ''),
    'Measured timing only. A stage that opened and never closed is marked <strong>Incomplete</strong> and receives no duration.'),
    section('governance', 'Test Case Governance', governance,
      'Review and Automation are independent decisions and are never merged into a single lifecycle status.'),
    section('execution', 'Execution Results', execution),
    section('funnel', 'Automation Funnel', funnel),
    section('human', 'Human Governance', governanceHuman),
    section('safety', 'Execution Safety', safety),
    section('tools', 'Tool Reliability', tools),
    section('validation', 'Platform Validation', validation,
      'Platform validation only. A failing application test is a QA result, not a validation failure — the two are never summed.'),
    section('repair', 'Repair / Rework', repair),
    section('ai', 'AI Usage', ai),
    historicalSection,
    section('trends', 'Trends', trends),
    section('detail', 'Detail Tables', detail),
    `<footer>Generated ${esc(now.toISOString())} from <code>ObservabilityMetrics.json</code>
      (schema v${esc(metrics.schemaVersion)}, ${inst.eventCount} events).<br>
      Self-contained: no external scripts, styles, fonts or network access. Presentation layer only —
      it renders canonical metrics and computes nothing.</footer>`,
  ].join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Observability — ${esc(metrics.runId)}</title>${health ? `\n<meta name="run-health-fingerprint" content="${esc(health.fingerprint)}">` : ''}
<style>${STYLES}</style>
</head>
<body><div class="wrap">
${body}
</div></body>
</html>
`;
}

/** Green only when the authoritative view says every dimension is clean and the verdict is all-passed. */
function healthIsClean(health) {
  if (!health || health.verdict.overall !== 'all-passed') return false;
  if (health.evidence && health.evidence.state === 'modified') return false;
  const states = [...Object.values(health.health.byBranch).flatMap((h) => ['application', 'automation', 'environment', 'coverage'].map((d) => h[d].state)), health.health.contract.state, health.health.workflow.state];
  return states.every((x) => ['clean', 'complete', 'not-registered'].includes(x));
}

module.exports = { renderDashboard, healthIsClean, HEALTH_TONE, esc, val, donut, bar, STYLES };
