// Run Health renderings — Markdown (authoritative rendering), the shared HTML design's model
// (report_builder, pipeline.md §17) and its HTML — all from ONE snapshot, plus the check that they agree
// with each other and with the authoritative sources now.
//
// Every rendering carries the snapshot's `figures` (runHealth.figuresOf): the verdict, every status count,
// assertion coverage, repair outcomes, contract health and workflow blockers. checkRunHealth reads them back
// from all three and compares them with a fresh snapshot. A report is never green: the health dimensions
// are shown apart and the status pill states the recorded test verdict in words.
//
// Revisions are immutable: a report is written once (RunHealth.md, then RunHealth.rev-2.md, …) and never
// overwritten. Nothing is written into a run that is finished, cancelled or legacy — that would modify a
// historical run; such a run's health is read, or written to a directory outside it.

const fs = require('fs');
const path = require('path');

const { HEALTH_DEFINITIONS, RunHealthError, buildRunHealth } = require('./runHealth');

const TONE = { failures: 'fail', blocked: 'blocked', incomplete: 'warning', repaired: 'warning', warnings: 'warning', 'needs-revalidation': 'warning', 'awaiting-decision': 'accent', unavailable: 'neutral', unknown: 'neutral', 'not-registered': 'neutral', 'not-selected': 'neutral', 'in-progress': 'accent', clean: 'neutral', complete: 'neutral' };
const VERDICT_TONE = { failures: 'fail', incomplete: 'warning', 'not-recorded': 'neutral', 'nothing-executed': 'warning', 'passed-after-repair': 'warning', 'passed-with-flaky': 'warning', 'all-passed': 'neutral', unavailable: 'neutral' };
const cell = (v) => String(v === undefined || v === null || v === '' ? '—' : v).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const FIGURES_TITLE = 'Figures (consistency check)';

function dimRows(s) {
  const rows = [];
  for (const [b, h] of Object.entries(s.health.byBranch)) {
    const a = h.application; const au = h.automation; const e = h.environment; const c = h.coverage;
    rows.push([`Application Health (${b})`, a.state, a.executed !== undefined ? `${a.failures || 0} failure(s) of ${a.executed} executed — ${a.classified || 0} classified Application Failure, ${a.unclassified || 0} unclassified Failed` : a.reason]);
    rows.push([`Automation Health (${b})`, au.state, au.executed !== undefined ? `${au.failures} Automation Failure, ${au.quarantined} Quarantined, ${au.repaired} Automation Repaired, ${au.flaky} Flaky — of ${au.executed} executed` : au.reason]);
    rows.push([`Environment Health (${b})`, e.state, e.executed !== undefined ? `${e.failures} of ${e.executed} executed (${Object.entries(e.byStatus).map(([k, v]) => `${k} ${v}`).join(', ')})` : e.reason]);
    rows.push([`Coverage Health (${b})`, c.state, c.executable !== undefined ? `${c.executed}/${c.executable} executed; ${c.notRun} not run; ${c.excluded} excluded; ${c.unverified} unverified; passes verified by assertions ${c.assertions.verified}, unverified ${c.assertions.unverified + c.assertions.none}; required assertions without a record ${c.assertionCoverage.missing}` : c.reason]);
  }
  const k = s.health.contract;
  rows.push(['Contract Health', k.state, k.reason || `${k.blockers} blocker(s), ${k.warnings} warning(s), ${k.decisionsPending} pending decision(s) across ${k.scopes} scope(s); required: ${k.requiredScopes.join(', ') || 'none'}`]);
  const w = s.health.workflow;
  rows.push(['Workflow Health', w.state, w.reason || `${w.workflowStatus}; next: ${w.nextAction}${w.humanDecision ? ' (Human Decision)' : ''}; ${w.blockedStages.length} blocked stage(s), ${w.pendingApprovals} pending approval(s), ${w.revalidation} revalidation issue(s)`]);
  return rows;
}

function markdown(s, { generatedAt } = {}) {
  const L = [];
  L.push(`# Run Health — ${s.run}`, '', '| Field | Value |', '|---|---|');
  L.push('| Status | Generated (a read of the authoritative sources — not an approval, not a verdict of its own) |');
  L.push(`| Test verdict (recorded) | ${s.verdict.overall} — final ${s.verdict.final}, first attempt ${s.verdict.firstAttempt} |`);
  L.push(`| Snapshot | ${s.fingerprint} |`);
  if (generatedAt) L.push(`| Generated | ${generatedAt} |`);
  L.push('', '> There is no overall health figure. Each dimension below is reported on its own, with its source and denominator.');
  for (const n of s.notes) L.push('', `> ${n}`);
  L.push('', '## 1. Health dimensions', '', '| Dimension | State | Detail |', '|---|---|---|');
  for (const [d, st, det] of dimRows(s)) L.push(`| ${d} | ${st} | ${cell(det)} |`);
  L.push('', '## 2. Execution status (canonical)', '');
  for (const b of s.branches) {
    const h = s.stages[b.stage];
    L.push(`**${b.branch} — Stage ${b.stage}** (${h.cycles.length} cycle(s): ${h.cycles.map((c) => c.file.split('/').pop()).join(', ')})`, '');
    L.push('| Status | Final | First attempt |', '|---|---|---|');
    const names = [...new Set([...Object.keys(h.counts), ...Object.keys(h.firstAttemptCounts)])];
    for (const n of names) L.push(`| ${n} | ${h.counts[n] || 0} | ${h.firstAttemptCounts[n] || 0} |`);
    if (h.unrecognized.length) L.push('', `Unrecognized statuses (kept as written, never counted as passed): ${h.unrecognized.map((u) => `${u.testCaseId} "${u.raw}"`).join('; ')}`);
    if (h.unattributed.length) L.push('', `Unattributed results: ${h.unattributed.map((u) => u.testCaseId).join(', ')}`);
    L.push('');
  }
  if (!s.branches.length) L.push('No execution results are recorded in this run.', '');
  L.push('## 3. Workflow', '');
  if (!s.workflow || s.workflow.legacy) L.push('Unknown — legacy run (no run state model).');
  else {
    const w = s.workflow;
    L.push(`Workflow: ${w.workflow ? `${w.workflow.type} (${w.workflow.stages.join(' → ')}), selected by ${w.workflow.selectedBy}` : 'not selected'} · run ${w.runStatus} · ${w.workflowStatus}`, '');
    L.push('| Stage | Status | State | Partial scope |', '|---|---|---|---|');
    for (const st of w.stages) L.push(`| ${st.stageId} ${st.name} | ${st.status} | ${st.category} | ${st.partialScope ? st.partialScope.join(', ') : '—'} |`);
    L.push('', `Approvals — approved: ${w.approvals.approved.join(', ') || '—'}; pending: ${w.approvals.pending.join(', ') || '—'}; needs revalidation: ${w.approvals.needsRevalidation.join(', ') || '—'}; partial scope: ${w.partialScope.join(', ') || '—'}`);
    for (const r of w.revalidation) L.push(`- stale evidence — Stage ${r.stageId}: ${r.kind} — ${r.detail}`);
    for (const r of w.recovery) L.push(`- recovery — Stage ${r.stageId} is ${r.status}: ${r.action}`);
    L.push('', `**Next permitted action (Workflow Planner):** ${w.next.action}${w.next.stageId ? ` (Stage ${w.next.stageId})` : ''}${w.next.humanDecision ? ' — HUMAN DECISION' : ''} — ${w.next.reason || ''}`);
    if (w.next.command) L.push('', `\`${w.next.command}\``);
    for (const b of w.next.blockers) L.push(`- blocker: ${b}`);
  }
  L.push('', '## 4. Self-Healing', '');
  if (!s.selfHealing) L.push('Stage 5H has not run in this run.');
  else {
    L.push('| Operation | Test | Classification | Attempts (cumulative) | Confidence · approval · applied | Before → After | Regression | Repair result | Execution status |', '|---|---|---|---|---|---|---|---|---|');
    for (const op of s.selfHealing.operations) {
      for (const t of op.tests) {
        const at = t.attempts;
        L.push(`| ${op.id} | ${t.testCaseId} | ${t.classification ? t.classification.class : '—'} | ${at.length} (${t.cumulative.counted}/${t.cumulative.of}${t.cumulative.quarantined ? ', QUARANTINED' : ''}) | ${cell(at.map((a) => `#${a.n} ${a.confidence ? `${a.confidence.band} ${a.confidence.score}` : '—'} · ${a.approvedBy || 'unapproved'} · ${a.applied ? 'verified' : 'not verified'}`).join('; '))} | ${cell(at.map((a) => `${a.before || '—'} → ${a.after || '—'}`).join('; '))} | ${cell(at.flatMap((a) => a.regression).join('; '))} | ${t.repairStatus} | ${t.executionStatus || '—'} |`);
      }
    }
    L.push('', `Quarantined: ${s.selfHealing.quarantine.map((q) => q.testCaseId).join(', ') || 'none'}. Knowledge promotions: ${s.selfHealing.operations.flatMap((o) => o.promotions).map((p) => `${p.test} ${p.status}`).join(', ') || 'none'}. A test that passed only after a repair is **Automation Repaired**, never Passed.`);
  }
  L.push('', '## 5. API contract health (from the API Contract Tool)', '');
  if (!s.contracts || !s.contracts.length) L.push('No scope of this run has a contract registry or a contract policy.');
  for (const c of s.contracts || []) {
    L.push(`**${c.scope}** — policy ${c.policy.mode} (${c.policy.source}${c.policy.by ? `, ${c.policy.by}` : ''})${c.registry ? '' : ' — no registry'}`, '');
    for (const k of c.contracts || []) L.push(`- ${k.name}: approved ${k.approved || 'none'}${k.superseded.length ? ` (superseded ${k.superseded.join(', ')})` : ''}; proposed pending ${k.proposedPending.join(', ') || 'none'}; observed mock ${k.observed.mock}, real ${k.observed.real}${k.evidence && !k.evidence.error ? `; evidence: mock conforms ${k.evidence.mockConforms}, mock violations ${k.evidence.mockViolations}, real conforms ${k.evidence.realConforms}, real violations ${k.evidence.realViolations}, mock-only ${k.evidence.mockOnly.length}, disagreements ${k.evidence.disagreements.length}` : ''}`);
    for (const d of c.drift || []) L.push(`- drift ${d.version} (${d.role}${d.environment ? `, ${d.environment}` : ''}): ${d.classification} — Breaking ${d.counts.Breaking}, Potentially breaking ${d.counts['Potentially breaking']}, Unknown ${d.counts.Unknown}, Non-breaking ${d.counts['Non-breaking']}`);
    for (const b of c.blockers) L.push(`- BLOCKER: ${b.detail}`);
    for (const w of c.warnings) L.push(`- warning: ${w.detail}`);
    for (const d of c.decisionsPending || []) L.push(`- decision pending (${d.kind}): ${d.detail}`);
    L.push('');
  }
  L.push('## 6. Automation baseline (Module Manager)', '');
  if (!s.automationState) L.push('No module scope.');
  for (const a of s.automationState || []) L.push(`- ${a.module}: ${a.state || 'no automation state recorded'}${a.framework ? ` · ${a.framework}` : ''}${a.promoted ? ' · promoted to the baseline' : ''}`);
  L.push('', '## 7. Telemetry reconciliation', '');
  const t = s.telemetry;
  if (!t || !t.exists) L.push('No telemetry stream for this run.');
  else {
    const dl = (list) => list.map((d) => `${d.testCaseId} (${d.source}): telemetry ${d.telemetry}, history ${d.history}`).join('; ');
    L.push(`${t.events} event(s). Execution history governs; nothing below changes a count.`, '', '| Comparison | Compared | Agree | Agree as unclassified failure | Disagree |', '|---|---|---|---|---|');
    L.push(`| Final result | ${t.final.compared} | ${t.final.agree} | ${t.final.agreeUnclassified} | ${t.final.disagree.length}${t.final.disagree.length ? ` — ${cell(dl(t.final.disagree))}` : ''} |`);
    L.push(`| First attempt | ${t.firstAttempt.compared} | ${t.firstAttempt.agree} | ${t.firstAttempt.agreeUnclassified} | ${t.firstAttempt.disagree.length}${t.firstAttempt.disagree.length ? ` — ${cell(dl(t.firstAttempt.disagree))}` : ''} |`);
    L.push('');
    for (const x of t.repairedTransitions) L.push(`- Automation Repaired — ${x.testCaseId} (${x.source}): history ${x.history}; telemetry ${x.telemetry}${x.problem ? ` — **${x.problem}**` : ''}`);
    for (const x of t.unresolved) L.push(`- unresolved — ${x.testCaseId} (${x.source}): history ${x.history}; telemetry ${x.telemetry}${x.problem ? ` — **${x.problem}**` : ''}`);
    L.push(`- missing telemetry: ${t.historyOnly.join(', ') || 'none'}; no first-attempt event: ${t.firstAttemptMissing.join(', ') || 'none'}; unattributed events: ${t.unattributed}; telemetry for unknown tests: ${t.telemetryOnly.join(', ') || 'none'}; corrupt lines: ${t.problems}; legacy unclassified Failed: ${t.legacyUnclassifiedFailures}`);
  }
  L.push('', '## 8. Sources', '', '| Source | Read |', '|---|---|');
  for (const x of s.sources) L.push(`| ${x.name} | ${x.status}${x.detail ? ` — ${cell(x.detail)}` : ''} |`);
  L.push('', '## 9. Definitions', '', '| Dimension | Source | Numerator | Denominator | Excluded | Missing |', '|---|---|---|---|---|---|');
  for (const [k, d] of Object.entries(HEALTH_DEFINITIONS)) L.push(`| ${k} | ${cell(d.source)} | ${cell(d.numerator)} | ${cell(d.denominator)} | ${cell(d.excluded)} | ${cell(d.missing)} |`);
  L.push('', `## ${FIGURES_TITLE}`, '', '| Figure | Value |', '|---|---|');
  for (const [k, v] of s.figures) L.push(`| ${k} | ${cell(v)} |`);
  L.push('');
  return L.join('\n');
}

function model(s) {
  return {
    title: `Run Health — ${s.run}`,
    documentTitle: `${s.run} - Run Health`,
    // The pill states the RECORDED verdict in words. It is never green: health is not one figure.
    statusPill: `TEST VERDICT: ${String(s.verdict.overall).toUpperCase()}`,
    statusPillTone: VERDICT_TONE[s.verdict.overall] || 'neutral',
    outcomeVerdict: s.verdict.overall === 'unavailable' ? undefined : s.verdict.overall,
    summary: null,
    meta: { fields: [[{ label: 'Run', value: s.run, mono: true }, { label: 'Snapshot', value: s.fingerprint.slice(0, 16), mono: true }], { label: 'Verdict', value: `${s.verdict.overall} (final ${s.verdict.final}, first attempt ${s.verdict.firstAttempt})` }] },
    sections: [
      { type: 'findings', title: 'Health dimensions — reported apart, never combined', items: dimRows(s).map(([d, st, det]) => ({ kind: `${d}: ${st}`, tone: TONE[st] || 'neutral', body: { text: det || '—' } })) },
      { type: 'notes', title: 'Workflow (Workflow Planner)', blocks: s.workflow && !s.workflow.legacy ? [`Next permitted action: ${s.workflow.next.action}${s.workflow.next.humanDecision ? ' — HUMAN DECISION' : ''}`, { kind: 'ul', items: [...s.workflow.stages.map((x) => `${x.stageId} ${x.name}: ${x.status} (${x.category})`), ...s.workflow.revalidation.map((r) => `stale evidence — ${r.stageId}: ${r.detail}`), ...s.workflow.next.blockers.map((b) => `blocker: ${b}`), ...s.workflow.recovery.map((r) => `recovery — ${r.stageId}: ${r.action}`)] }] : ['Unknown — legacy run (no run state model).'] },
      { type: 'notes', title: 'API contract health (API Contract Tool)', emptyText: 'No contract registry or policy for this run\'s scopes.', blocks: (s.contracts || []).length ? [{ kind: 'ul', items: s.contracts.flatMap((c) => [`${c.scope}: policy ${c.policy.mode}; ${c.blockers.length} blocker(s); ${c.warnings.length} warning(s)`, ...c.blockers.map((b) => `BLOCKER — ${b.detail}`)]) }] : [] },
      { type: 'notes', title: 'Notes', emptyText: 'None.', blocks: s.notes.length ? [{ kind: 'ul', items: s.notes }] : [] },
      { type: 'notes', title: FIGURES_TITLE, blocks: [{ kind: 'ul', items: s.figures.map(([k, v]) => `${k}: ${v}`) }] },
    ],
  };
}

/** The Run Health files of a run (latest revision last). */
function listRevisions(dir) {
  let names = [];
  try { names = fs.readdirSync(dir); } catch { return []; }
  return names.filter((n) => /^RunHealth(\.rev-\d+)?\.md$/.test(n)).sort((a, b) => (Number((a.match(/rev-(\d+)/) || [0, 1])[1]) - Number((b.match(/rev-(\d+)/) || [0, 1])[1]))).map((n) => n.replace(/\.md$/, ''));
}

/**
 * Writes RunHealth[.rev-N].md / .report.json / .html / .snapshot.json. Never overwrites a revision; never
 * writes into a finished, cancelled or legacy run (use `outDir` outside it).
 */
function writeRunHealth({ dataRoot, runFolder, snapshot, outDir, now = new Date() }) {
  // eslint-disable-next-line global-require
  const { renderReport } = require('../report_builder');
  const runDir = path.join(dataRoot, 'runs', runFolder);
  const dir = path.resolve(outDir || path.join(runDir, 'metadata', 'observability'));
  const lexicallyInside = (dir.toLowerCase() + path.sep).startsWith(path.resolve(runDir).toLowerCase() + path.sep);
  // F-23 (Phase 9.3): "inside the run" is decided by the REAL path. A target spelled inside the run that a
  // junction or symbolic link sends elsewhere is refused; an --out-dir spelled outside that really lands in
  // the run is still bound by the historical-run rule below.
  // eslint-disable-next-line global-require
  const { runWriteEscape } = require('./recorder');
  const escape = runWriteEscape(dataRoot, runFolder, dir);
  if (lexicallyInside && escape) throw new RunHealthError(`Run Health not written: ${escape}.`, 'OUTSIDE_RUN');
  const inside = lexicallyInside || !escape;
  let runStatus = null;
  try { runStatus = JSON.parse(fs.readFileSync(path.join(runDir, 'metadata', 'run.json'), 'utf8')).status || null; } catch { /* legacy */ }
  if (inside && (snapshot.legacy || ['Completed', 'Cancelled', 'Failed'].includes(runStatus))) {
    throw new RunHealthError(`${runFolder} is ${snapshot.legacy ? 'a legacy run' : runStatus} — writing into it would modify a historical run. Read its health, or write it elsewhere (--out-dir <dir>).`, 'RUN_IMMUTABLE');
  }
  fs.mkdirSync(dir, { recursive: true });
  const existing = listRevisions(dir);
  const base = existing.length ? `RunHealth.rev-${existing.length + 1}` : 'RunHealth';
  const m = model(snapshot);
  const files = { md: path.join(dir, `${base}.md`), model: path.join(dir, `${base}.report.json`), html: path.join(dir, `${base}.html`), snapshot: path.join(dir, `${base}.snapshot.json`) };
  for (const f of Object.values(files)) if (fs.existsSync(f)) throw new RunHealthError(`${f} exists — a revision is never overwritten.`, 'REVISION_EXISTS');
  if (inside) {
    for (const f of Object.values(files)) {
      const why = runWriteEscape(dataRoot, runFolder, f);
      if (why) throw new RunHealthError(`Run Health not written: ${why}.`, 'OUTSIDE_RUN');
    }
  }
  fs.writeFileSync(files.md, markdown(snapshot, { generatedAt: now.toISOString() }));
  fs.writeFileSync(files.model, `${JSON.stringify(m, null, 2)}\n`);
  fs.writeFileSync(files.html, renderReport(m));
  fs.writeFileSync(files.snapshot, `${JSON.stringify(snapshot, null, 2)}\n`);
  return { ...files, revision: base };
}

// ---------------------------------------------------------------------------------------------
// The consistency check
// ---------------------------------------------------------------------------------------------

const decodeHtml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'").replace(/&amp;/g, '&');

function figuresFromMarkdown(md) {
  const start = md.indexOf(`## ${FIGURES_TITLE}`);
  if (start === -1) return null;
  const rows = md.slice(start).split(/\r?\n/).filter((l) => /^\|/.test(l)).slice(2);
  return rows.map((l) => { const c = l.split('|').slice(1, -1).map((x) => x.trim().replace(/\\\|/g, '|')); return [c[0], c[1]]; });
}
function figuresFromModel(m) {
  const sec = (m.sections || []).find((x) => x.title === FIGURES_TITLE);
  if (!sec) return null;
  return sec.blocks[0].items.map((it) => { const i = it.indexOf(': '); return [it.slice(0, i), it.slice(i + 2)]; });
}
function figuresFromHtml(html) {
  const at = html.indexOf(FIGURES_TITLE);
  if (at === -1) return null;
  const items = [...html.slice(at).matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((x) => decodeHtml(x[1].replace(/<[^>]+>/g, '')).trim());
  return items.filter((t) => /^[A-Za-z0-9_.][A-Za-z0-9_. ]*: /.test(t)).map((t) => { const i = t.indexOf(': '); return [t.slice(0, i), t.slice(i + 2)]; });
}
const asMap = (list) => new Map(list || []);

/**
 * Checks a Run Health report: the Markdown, the JSON model and the HTML carry the same figures, and those
 * figures are what the authoritative sources say now. A green status pill is refused outright.
 * @returns {{ok: boolean, problems: string[], stale: string[], revision: string|null}}
 */
function checkRunHealth({ dataRoot, runFolder, dir, revision, now = new Date() }) {
  const d = path.resolve(dir || path.join(dataRoot, 'runs', runFolder, 'metadata', 'observability'));
  const rev = revision || listRevisions(d).pop();
  if (!rev) throw new RunHealthError(`no Run Health report in ${d}.`, 'NO_REPORT');
  const problems = [];
  const md = fs.readFileSync(path.join(d, `${rev}.md`), 'utf8');
  const m = JSON.parse(fs.readFileSync(path.join(d, `${rev}.report.json`), 'utf8'));
  const html = fs.readFileSync(path.join(d, `${rev}.html`), 'utf8');
  const fm = asMap(figuresFromMarkdown(md)); const fj = asMap(figuresFromModel(m)); const fh = asMap(figuresFromHtml(html));
  if (!fm.size) problems.push('the Markdown carries no figures');
  if (!fj.size) problems.push('the JSON model carries no figures');
  if (!fh.size) problems.push('the HTML carries no figures');
  for (const k of new Set([...fm.keys(), ...fj.keys(), ...fh.keys()])) {
    const vals = [fm.get(k), fj.get(k), fh.get(k)];
    if (new Set(vals.map(String)).size > 1) problems.push(`${k}: Markdown "${vals[0]}", JSON "${vals[1]}", HTML "${vals[2]}"`);
  }
  if (m.statusPillTone === 'pass') problems.push('the status pill is green — a Run Health report is never green');
  const fresh = buildRunHealth({ dataRoot, runFolder, now });
  const stale = [];
  for (const [k, v] of fresh.figures) if (fm.has(k) && fm.get(k) !== v) stale.push(`${k}: report "${fm.get(k)}", now "${v}"`);
  for (const [k] of fresh.figures) if (!fm.has(k)) stale.push(`${k}: not in the report, now "${asMap(fresh.figures).get(k)}"`);
  for (const k of fm.keys()) if (!asMap(fresh.figures).has(k)) stale.push(`${k}: in the report, no longer a figure`);
  return { ok: problems.length === 0 && stale.length === 0, consistent: problems.length === 0, current: stale.length === 0, problems, stale, revision: rev };
}

/**
 * Whether a dashboard shows the Run Health view the authoritative sources give now: its embedded figures
 * and snapshot fingerprint against a fresh snapshot. A dashboard with no Run Health panel is reported.
 */
function checkDashboard({ html, snapshot }) {
  const problems = [];
  const fp = (html.match(/<meta name="run-health-fingerprint" content="([0-9a-f]{64})">/) || [])[1];
  if (!fp) return { ok: false, problems: ['the dashboard carries no Run Health view (render it with the current observability cli)'] };
  const shown = new Map([...html.matchAll(/<li data-figure="([^"]+)">([\s\S]*?)<\/li>/g)].map((m) => { const k = decodeHtml(m[1]); const t = decodeHtml(m[2]); return [k, t.slice(k.length + 2)]; }));
  const now = new Map(snapshot.figures);
  for (const [k, v] of now) if (shown.get(k) !== v) problems.push(`${k}: dashboard "${shown.has(k) ? shown.get(k) : '—'}", Run Health now "${v}"`);
  for (const k of shown.keys()) if (!now.has(k)) problems.push(`${k}: on the dashboard, no longer a Run Health figure`);
  if (fp !== snapshot.fingerprint && !problems.length) problems.push('the dashboard was rendered from an earlier Run Health snapshot');
  if (/class="kpi kpi--success"[^>]*>[\s\S]{0,200}Passed \(telemetry\)/.test(html) && snapshot.verdict.overall !== 'all-passed') problems.push('telemetry Passed is shown green while the recorded verdict is not all-passed');
  return { ok: problems.length === 0, problems };
}

module.exports = { markdown, model, writeRunHealth, checkRunHealth, checkDashboard, listRevisions, FIGURES_TITLE };
