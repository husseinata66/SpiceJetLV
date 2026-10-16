// API contract drift report — the Markdown (authoritative) and the shared HTML design's model
// (report_builder, pipeline.md §17). It reports contracts, differences, reach and decisions; it never
// reports a test result: there is no executive summary of passes and failures, because none was run.

const fs = require('fs');
const path = require('path');

const TONE = { Breaking: 'fail', Unknown: 'blocked', 'Potentially breaking': 'warning', 'Non-breaking': 'neutral', Unchanged: 'neutral' };
const cell = (v) => String(v === undefined || v === null || v === '' ? '—' : v).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const where = (i) => [i.location, i.status ? `status ${i.status}` : null, i.param || null, i.field && i.field !== '$' ? i.field : null].filter(Boolean).join(' · ');
/** A difference inside a shared named schema reaches several endpoints; it is one item. */
const reach = (i) => (i.endpoints && i.endpoints.length > 1 ? ` (+${i.endpoints.length - 1} more endpoint${i.endpoints.length > 2 ? 's' : ''})` : '');
const assertionCell = (e) => [
  ...e.assertions.map((x) => `${x.assertionId} confirmed (${x.why})`),
  ...(e.potentialAssertions || []).map((x) => `${x.assertionId} potential${x.ambiguous ? ', ambiguous' : ''} (${x.why})`),
].join('; ') || '—';

/** Recommended next actions, derived only from what the analysis shows. */
function nextActions(a) {
  const out = [];
  const c = a.comparison;
  const serious = c.items.filter((i) => i.classification === 'Breaking' || i.classification === 'Unknown');
  if (c.unchanged) out.push('No action: the compared contracts do not differ in anything the contract states.');
  if (a.candidate.role === 'proposed' && !c.unchanged) {
    out.push(`Review the ${c.items.length} difference(s) of ${a.candidate.id} with the API owner, then accept it (whole, or per endpoint with --endpoints) or reject it — a named human decision on analysis ${a.id}.`);
    if (serious.length) out.push(`Until then, Stages 4M / 4A / 5A are blocked for the test cases this reaches (${serious.length} Breaking/Unknown difference(s)).`);
  }
  if (a.candidate.role === 'observed' && !['Unchanged', 'Non-breaking'].includes(c.classification)) {
    out.push(`Decide what ${a.candidate.id} (${(a.candidate.environment || {}).kind}) means: application defect, outdated contract, or environment issue (review-observed). The observed values are never adopted as expected results.`);
  }
  const reached = [...a.impact.confirmed, ...a.impact.potential];
  if (reached.length && !c.unchanged) out.push(`After a contract change is accepted, each reached test case gets its own decision (impact-decision): ${reached.map((e) => `${e.scope}:${e.testCase}`).join(', ')}. Any update is made at Stage 3 and re-approved there — this tool never edits a test case, an Expected Result or an Assertion ID.`);
  if (a.impact.potential.length) out.push(`Confirm or rule out the potential impact on ${a.impact.potential.map((e) => `${e.testCase}${e.ambiguous ? ' (ambiguous)' : ''}`).join(', ')} — something points at a changed endpoint, but no structured assertion proves the changed part is checked. Writing the endpoint and JSON path into the assertion's Expected Source (\`API contract GET /x 200 $.field\`) makes the link exact.`);
  if (a.impact.missing.length) out.push(`Trace or cover ${a.impact.missing.map((m) => m.endpoint).join(', ')}: no test case mentions ${a.impact.missing.length > 1 ? 'them' : 'it'}${a.policy && a.policy.mode === 'required' ? ' — under the required policy this blocks the whole scope' : ''}.`);
  const mockOnly = a.evidence.rows.filter((r) => r.mock.verdict === 'conforms' && r.real.verdict === 'not exercised');
  if (mockOnly.length) out.push(`Validate ${mockOnly.map((r) => r.endpoint).join(', ')} against the real service under the execution safety policy — mock conformance proves nothing about the real integration.`);
  const disagree = a.evidence.rows.filter((r) => r.disagreement);
  if (disagree.length) out.push(`Investigate the mock/real disagreement on ${disagree.map((r) => r.endpoint).join(', ')} — the mock may be outdated, or the service may have changed.`);
  return out;
}

function markdown(a, { generatedAt } = {}) {
  const c = a.comparison;
  const lines = [];
  lines.push(`# API Contract Drift — ${a.label}`, '');
  lines.push('| Field | Value |', '|---|---|');
  lines.push('| Status | Generated (not an approval) |');
  lines.push(`| Analysis | ${a.id} |`, `| Scope | ${a.scope} |`, `| Mode | ${a.mode} |`, `| Rules | ${c.rulesVersion} |`);
  lines.push(`| Overall classification | ${c.classification} |`);
  if (a.policy) lines.push(`| Contract validation | ${a.policy.mode} (${a.policy.source}${a.policy.by ? `, chosen by ${a.policy.by}` : ''}) |`);
  if (generatedAt) lines.push(`| Generated | ${generatedAt} |`);
  lines.push('', '## 1. Contract versions compared', '');
  lines.push('| Side | Version | Name | Role / status | Format | Source | Source SHA-256 | Normalized SHA-256 | Recorded |', '|---|---|---|---|---|---|---|---|---|');
  for (const [side, v] of [['Base', a.base], ['Candidate', a.candidate]]) {
    if (!v) { lines.push(`| ${side} | — | — | none (no approved contract) | — | — | — | — | — |`); continue; }
    lines.push(`| ${side} | ${v.id} | ${cell(v.name)} | ${v.role} / ${v.status}${v.environment ? ` (${v.environment.kind})` : ''} | ${v.format} | ${cell(v.source)} | ${v.sourceSha256 ? `\`${v.sourceSha256.slice(0, 16)}…\`` : 'derived'} | \`${v.normalizedSha256.slice(0, 16)}…\` | ${v.registeredAt} by ${cell(v.registeredBy)}${v.approval ? `; approved by ${cell(v.approval.by)}` : ''} |`);
  }
  lines.push('', '## 2. Drift classification', '');
  lines.push('| Breaking | Potentially breaking | Non-breaking | Unknown | Endpoints compared |', '|---|---|---|---|---|');
  lines.push(`| ${c.counts.Breaking} | ${c.counts['Potentially breaking']} | ${c.counts['Non-breaking']} | ${c.counts.Unknown} | ${c.endpointsCompared} |`);
  for (const n of a.notes) lines.push('', `> ${n}`);
  lines.push('', '## 3. Impacted endpoints and fields', '');
  if (!c.items.length) lines.push('No differences.');
  else {
    lines.push('| Classification | Rule | Endpoint | Where | Before | After | Item |', '|---|---|---|---|---|---|---|');
    for (const i of c.items) lines.push(`| ${i.classification} | ${i.rule} | \`${i.endpoint}\`${reach(i)} | ${cell(where(i))}${i.category ? ' (error structure)' : ''} | ${cell(i.before)} | ${cell(i.after)} | ${i.id} |`);
  }
  lines.push('', '## 4. Affected test cases and assertions', '');
  lines.push('| Grade | Scope | Test Case | Review | Endpoints | Assertions | Why |', '|---|---|---|---|---|---|---|');
  for (const e of [...a.impact.confirmed, ...a.impact.potential]) {
    lines.push(`| ${e.grade}${e.ambiguous ? ' (ambiguous — needs a human)' : ''} | ${e.scope} | ${e.testCase} | ${e.review} | ${e.endpoints.map((x) => `\`${x}\``).join(', ')} | ${cell(assertionCell(e))} | ${cell(e.via.join('; '))} |`);
  }
  if (!a.impact.confirmed.length && !a.impact.potential.length) lines.push('| — | — | none reached | — | — | — | — |');
  lines.push('', `Automation reached: ${a.impact.automation.map((x) => `${x.testCase} (${x.decision})`).join(', ') || 'none'}. Execution results under the earlier contract: ${a.impact.executions.length}. Reports: ${a.impact.reports.map((r) => `${r.run}/${r.file}`).join(', ') || 'none'}. Requirements declared by the contract: ${a.impact.requirements.map((r) => `${r.id} (${r.endpoint})`).join(', ') || 'none'}. Suppliers: ${a.impact.suppliers.join(', ') || '—'}.`);
  lines.push('', '## 5. Mock vs real evidence', '');
  if (!a.evidence.rows.length) lines.push('No observed evidence compared (or no approved contract to compare it with).');
  else {
    lines.push('| Endpoint | Mock | Real | Real validated | Note |', '|---|---|---|---|---|');
    for (const r of a.evidence.rows) lines.push(`| \`${r.endpoint}\` | ${r.mock.verdict}${r.mock.rules.length ? ` (${r.mock.rules.join(', ')})` : ''} | ${r.real.verdict}${r.real.rules.length ? ` (${r.real.rules.join(', ')})` : ''} | ${r.realValidated ? 'yes' : 'no'} | ${cell(r.note)} |`);
  }
  lines.push('', '## 6. Missing coverage', '');
  if (!a.impact.missing.length) lines.push('Every changed endpoint is mentioned by at least one test case.');
  for (const m of a.impact.missing) lines.push(`- \`${m.endpoint}\` — ${m.detail}`);
  lines.push('', '## 7. Human decisions required', '');
  if (!a.decisionsRequired.length) lines.push('None for this analysis.');
  for (const d of a.decisionsRequired) lines.push(`- **${d.kind}** — ${d.detail}`);
  lines.push('', '## 8. Recommended next actions', '');
  for (const n of nextActions(a)) lines.push(`- ${n}`);
  lines.push('');
  return lines.join('\n');
}

function model(a) {
  const c = a.comparison;
  const sev = (cl) => ({ value: c.counts[cl], label: cl, tone: TONE[cl] });
  return {
    title: `API Contract Drift — ${a.label}`,
    documentTitle: `${a.label} - API Contract Drift`,
    statusPill: c.classification.toUpperCase(),
    statusPillTone: TONE[c.classification] || 'neutral',
    summary: null,
    meta: {
      fields: [
        [{ label: 'Scope', value: a.scope, mono: true }, { label: 'Mode', value: a.mode }],
        [{ label: 'Analysis', value: a.id, mono: true }, { label: 'Rules', value: c.rulesVersion, mono: true }],
        ...(a.policy ? [{ label: 'Contract validation', value: `${a.policy.mode} (${a.policy.source}${a.policy.by ? `, chosen by ${a.policy.by}` : ''})` }] : []),
      ],
      runFields: [a.base, a.candidate].map((v, k) => (v
        ? { label: k ? 'Candidate' : 'Base', value: `${v.id} ${v.name} — ${v.role}/${v.status}${v.environment ? ` (${v.environment.kind})` : ''} · ${v.format} · ${v.source} · normalized ${v.normalizedSha256.slice(0, 16)}…`, mono: true }
        : { label: k ? 'Candidate' : 'Base', value: 'none — no approved contract' })),
    },
    sections: [
      {
        type: 'findings', title: '2–3. Drift: endpoints and fields',
        badges: ['Breaking', 'Potentially breaking', 'Unknown', 'Non-breaking'].filter((k) => c.counts[k]).map(sev),
        emptyText: 'No differences.',
        items: c.items.map((i) => ({
          kind: i.classification, tone: TONE[i.classification], body: { text: `${i.endpoint}${reach(i)} — ${where(i)}: ${i.before} → ${i.after}` }, refs: `(${i.rule} · ${i.id})`,
          fields: [{ label: 'Rule', value: i.rule }, { label: 'Why', value: i.rationale, mono: false }, ...(i.category ? [{ label: 'Category', value: 'error response structure', mono: false }] : [])],
        })),
      },
      {
        type: 'findings', title: '4. Affected test cases and assertions',
        badges: [{ value: a.impact.confirmed.length, label: 'Confirmed', tone: 'fail' }, { value: a.impact.potential.length, label: 'Potential', tone: 'warning' }],
        emptyText: 'No test case is reached.',
        items: [...a.impact.confirmed, ...a.impact.potential].map((e) => ({
          kind: `${e.grade === 'confirmed' ? 'Confirmed' : 'Potential'} impact${e.ambiguous ? ' (ambiguous)' : ''}`, tone: e.grade === 'confirmed' ? 'fail' : 'warning',
          body: { text: `${e.scope}:${e.testCase} (Review ${e.review}) — ${e.endpoints.join(', ')}` },
          fields: [
            { label: 'Assertions', value: assertionCell(e), mono: false },
            { label: 'Why', value: e.via.join('; ') || '—', mono: false },
          ],
        })),
      },
      {
        type: 'notes', title: '5. Mock vs real evidence',
        emptyText: 'No observed evidence compared.',
        blocks: a.evidence.rows.length ? [{ kind: 'ul', items: a.evidence.rows.map((r) => `${r.endpoint} — mock: ${r.mock.verdict}${r.mock.rules.length ? ` (${r.mock.rules.join(', ')})` : ''}; real: ${r.real.verdict}${r.real.rules.length ? ` (${r.real.rules.join(', ')})` : ''}${r.note ? ` — ${r.note}` : ''}`) }] : [],
      },
      { type: 'notes', title: '6. Missing coverage', emptyText: 'Every changed endpoint is mentioned by at least one test case.', blocks: a.impact.missing.length ? [{ kind: 'ul', items: a.impact.missing.map((m) => `${m.endpoint} — ${m.detail}`) }] : [] },
      { type: 'notes', title: '7. Human decisions required', emptyText: 'None for this analysis.', blocks: a.decisionsRequired.length ? [{ kind: 'ul', items: a.decisionsRequired.map((d) => `${d.kind}: ${d.detail}`) }] : [] },
      { type: 'notes', title: '8. Recommended next actions', blocks: [{ kind: 'ul', items: nextActions(a) }] },
    ],
  };
}

/**
 * Writes the report beside the scope's contracts — `<scope>/discovery/api_contracts/reports/` (or `out`),
 * as ApiContractDrift_<CD-id>.md / .report.json / .html. An existing report is never overwritten: a
 * re-run with different content is written as .rev-N.
 */
function writeReport(dataRoot, scope, analysis, { out, now = new Date() } = {}) {
  // eslint-disable-next-line global-require
  const { renderReport } = require('../report_builder');
  const dir = out ? path.resolve(out) : path.join(scope.dir, 'discovery', 'api_contracts', 'reports');
  fs.mkdirSync(dir, { recursive: true });
  const md = markdown(analysis, { generatedAt: now.toISOString() });
  const m = model(analysis);
  const html = renderReport(m);
  let base = `ApiContractDrift_${analysis.id}`;
  for (let n = 2; fs.existsSync(path.join(dir, `${base}.md`)); n += 1) base = `ApiContractDrift_${analysis.id}.rev-${n}`;
  const files = { md: path.join(dir, `${base}.md`), json: path.join(dir, `${base}.report.json`), html: path.join(dir, `${base}.html`) };
  fs.writeFileSync(files.md, md);
  fs.writeFileSync(files.json, `${JSON.stringify(m, null, 2)}\n`);
  fs.writeFileSync(files.html, html);
  return files;
}

/**
 * A `sections` entry the Final QA Report model can carry (Stage 6A): the contract position of the run's
 * scopes — status only, never a test result.
 */
function finalReportSection(statuses) {
  const items = [];
  for (const s of statuses) {
    if (s.policy && s.policy.mode === 'required') items.push({ kind: 'Contract validation required', tone: 'accent', body: { text: `${s.scope}: contract validation is required (${s.policy.source}${s.policy.by ? `, chosen by ${s.policy.by}` : ''})` } });
    for (const b of s.blockers) items.push({ kind: 'Contract blocker', tone: 'blocked', body: { text: `${s.scope}: ${b.detail}` } });
    for (const w of s.warnings) items.push({ kind: 'Contract warning', tone: 'warning', body: { text: `${s.scope}: ${w.detail}` } });
  }
  return { type: 'findings', title: 'API contract position', emptyText: 'No API contract is registered for these scopes, or none has unresolved drift.', items };
}

module.exports = { markdown, model, writeReport, nextActions, finalReportSection };
