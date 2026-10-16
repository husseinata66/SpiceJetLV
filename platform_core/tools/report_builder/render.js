'use strict';

const fs = require('fs');
const path = require('path');

const { normalizeModel, modelFingerprint } = require('./model');
const { sanitizeHtml } = require('./sanitize');

const ASSETS_DIR = path.join(__dirname, 'assets');

/** Escape for text/attribute contexts. Every model value goes through this. */
function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** A normalised rich value: `{text}` is escaped, `{html}` is trusted verbatim. */
function rich(value) {
  if (!value) return '';
  // Rich text from a model is untrusted (it often comes from test evidence): sanitized, never verbatim (Phase 9.2, F-17).
  return value.html !== null ? sanitizeHtml(value.html) : esc(value.text);
}

function readAsset(name) {
  return fs.readFileSync(path.join(ASSETS_DIR, name), 'utf8').trimEnd();
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function renderField(field) {
  const value = field.mono
    ? `<span class="mono">${rich(field.value)}</span>`
    : rich(field.value);
  return `<div class="field"><span class="k">${esc(field.label)}</span><span class="v">${value}</span></div>`;
}

function renderFieldGroup(entries) {
  return entries.map((entry) => (
    entry.kind === 'row'
      ? `<div class="field-row">${entry.fields.map(renderField).join('\n')}</div>`
      : renderField(entry.field)
  )).join('\n');
}

function renderMetaCard(meta) {
  const primary = renderFieldGroup(meta.fields);
  const run = renderFieldGroup(meta.runFields);
  if (!primary && !run) return '';

  const blocks = [];
  if (primary) blocks.push(`<div class="fields">\n${primary}\n</div>`);
  if (run) blocks.push(`<div class="fields run-meta">\n${run}\n</div>`);
  return `<div class="meta-card dashboard-card">\n${blocks.join('\n')}\n</div>`;
}

/**
 * Build the donut's conic-gradient from the counts, in declared order, so the
 * ring segments always match the legend beneath it.
 */
function renderDonut(summary) {
  if (!summary.donut) return '';

  const stops = [];
  let cursor = 0;
  summary.counts.forEach((count, i) => {
    if (count.value <= 0) return;
    const start = cursor;
    cursor += (count.value / summary.donut.base) * 100;
    // Absorb rounding drift into the final visible segment.
    const end = i === summary.counts.length - 1 ? 100 : cursor;
    stops.push(`var(--${toneVar(count.tone)}) ${round(start)}% ${round(end)}%`);
  });
  if (stops.length === 0) return '';

  const legend = summary.counts.map((count) => (
    `<div class="litem"><span class="swatch tone-${count.tone}"></span>${esc(count.label)} `
    + `<span class="lcount">${esc(count.value)} / ${esc(summary.donut.base)}</span></div>`
  )).join('\n');

  return `<div class="donut-block">
<div class="donut" style="background:conic-gradient(${stops.join(', ')})">
<div class="donut-hole"><div class="donut-pct">${esc(summary.donut.percent)}%</div><div class="donut-sub">${esc(summary.donut.label)}</div></div>
</div>
<div class="donut-legend">
${legend}
</div>
</div>`;
}

function toneVar(tone) {
  switch (tone) {
    case 'pass': return 'good';
    case 'fail': return 'critical';
    case 'blocked': return 'serious';
    case 'warning': return 'warning';
    case 'accent': return 'accent';
    default: return 'line-strong';
  }
}

function round(n) {
  return Math.round(n * 100) / 100;
}

function renderSummary(summary) {
  if (!summary) return '';

  const cards = summary.counts.map((count) => (
    `<div class="scard dashboard-card"><div class="val tone-${count.tone}">${esc(count.value)}</div>`
    + `<div class="lbl">${esc(count.label)}</div></div>`
  )).join('\n');

  const stats = [
    `<div class="scard scard-total dashboard-card"><div class="val">${esc(summary.total)}</div><div class="lbl">${esc(summary.totalLabel)}</div></div>`,
    `<div class="summary-cards">\n${cards}\n</div>`,
  ];
  if (summary.duration) {
    stats.push(
      `<div class="scard scard-total dashboard-card"><div class="val">${esc(summary.duration)}</div>`
      + `<div class="lbl">${esc(summary.durationLabel)}</div></div>`,
    );
  }

  return `<h2 class="section-num">${esc(summary.title)}</h2>
<div class="summary-layout">
${renderDonut(summary)}
<div class="stats-block">
${stats.join('\n')}
</div>
</div>`;
}

function renderEvidence(evidence) {
  if (!evidence) return '';
  return `<details class="evidence"><summary>${esc(evidence.summary)}</summary>`
    + `<div class="ev-body">${rich(evidence.body)}</div></details>`;
}

function renderHeaders(headers) {
  if (headers.length === 0) return '';
  const lines = headers.map((header) => {
    const value = header.redacted
      ? '<span class="rr-redacted">[REDACTED]</span>'
      : esc(header.value);
    return `<div class="rr-h-line">${esc(header.name)}: ${value}</div>`;
  }).join('\n');
  return `<div class="rr-label">HEADERS</div>\n<div class="rr-box rr-headers-box">\n${lines}\n</div>`;
}

function renderMessage(message, title, extraTitleClass) {
  if (!message) return '';
  const parts = [`<div class="rr-title${extraTitleClass ? ` ${extraTitleClass}` : ''}">${esc(title)}</div>`];
  if (message.line) parts.push(`<div class="rr-line">${esc(message.line)}</div>`);
  const headers = renderHeaders(message.headers);
  if (headers) parts.push(headers);
  if (message.body) {
    parts.push(`<div class="rr-label">${esc(message.bodyLabel)}</div>`);
    parts.push(`<div class="rr-box rr-body-box"><pre>${esc(message.body)}</pre></div>`);
  }
  return parts.join('\n');
}

function renderExchanges(exchanges) {
  if (exchanges.length === 0) return '';
  const blocks = exchanges.map((exchange) => {
    const parts = [];
    if (exchange.label) parts.push(`<div class="rr-attempt-label">${esc(exchange.label)}</div>`);
    const request = renderMessage(exchange.request, exchange.requestTitle);
    if (request) parts.push(request);
    const response = renderMessage(
      exchange.response,
      exchange.responseTitle,
      request ? 'rr-response-title' : '',
    );
    if (response) parts.push(response);
    for (const note of exchange.notes) parts.push(`<div class="rr-note">${esc(note)}</div>`);
    return parts.join('\n');
  }).join('\n');
  return `<div class="tc-reqres-panel">\n${blocks}\n</div>`;
}

function renderCaseDetail(detail) {
  if (!detail) return '';
  const body = detail.blocks.map((block) => {
    const heading = `<div class="vtc-h">${esc(block.heading)}</div>`;
    if (block.kind === 'steps') {
      const steps = block.steps.map((step) => `<li>${rich(step)}</li>`).join('');
      return `${heading}<ol class="vtc-steps">${steps}</ol>`;
    }
    return `${heading}<div class="vtc-p">${rich(block.value)}</div>`;
  }).join('');

  return `<div class="view-tc-wrap"><details class="view-tc"><summary>${esc(detail.summary)}</summary>`
    + `<div class="view-tc-body">${body}</div></details></div>`;
}

const ASSERTION_MARK = { pass: '✅', fail: '❌', unchecked: 'Not checked', missing: 'Missing — not recorded' };

/** A case's assertion records (pipeline.md §11.4): one row per assertion. */
function renderAssertions(assertions) {
  if (!assertions || !assertions.length) return '';
  const withIds = assertions.some((a) => a.id);
  const rows = assertions.map((a) => `<tr class="as-${a.result}">${withIds ? `<td class="mono">${esc(a.id || '—')}</td>` : ''}<td>${esc(a.assertion)}</td><td class="mono">${esc(a.expected)}</td>`
    + `<td class="mono">${esc(a.actual)}</td><td>${esc(a.check)}</td><td>${ASSERTION_MARK[a.result]}</td><td>${esc(a.evidence || '—')}</td></tr>`).join('');
  return `<div class="assertions"><table><thead><tr>${withIds ? '<th>ID</th>' : ''}<th>Assertion</th><th>Expected</th><th>Actual</th><th>Check</th><th>Result</th><th>Evidence</th></tr></thead>`
    + `<tbody>${rows}</tbody></table></div>`;
}

function renderCase(testCase, statusIndex) {
  const status = statusIndex.get(testCase.status);
  const label = esc(testCase.statusLabel || status.key);
  const badge = `<span class="badge tone-${status.tone}">${label}</span>`;
  const id = testCase.id ? `<span class="mono">${esc(testCase.id)}</span> - ` : '';

  const parts = [
    `<details class="tc tone-${status.tone}" data-status="${esc(testCase.status)}">`,
    `<summary class="tc-head"><span><span class="chev"></span>${id}${esc(testCase.title)}</span>${badge}</summary>`,
  ];
  for (const row of testCase.rows) {
    parts.push(`<div class="row"><b>${esc(row.label)}:</b> ${rich(row.value)}</div>`);
  }
  parts.push(
    `<div class="row tc-status-row"><b>Status:</b> ${badge}<span class="tc-reqres-anchor"></span></div>`,
  );
  const assertions = renderAssertions(testCase.assertions);
  if (assertions) parts.push(assertions);
  const evidence = renderEvidence(testCase.evidence);
  if (evidence) parts.push(evidence);
  const exchanges = renderExchanges(testCase.exchanges);
  if (exchanges) parts.push(exchanges);
  const detail = renderCaseDetail(testCase.detail);
  if (detail) parts.push(detail);
  parts.push('</details>');
  return parts.join('\n');
}

function renderCategory(category, statuses, statusIndex) {
  const tally = new Map(statuses.map((s) => [s.key, 0]));
  for (const testCase of category.cases) tally.set(testCase.status, tally.get(testCase.status) + 1);

  const counts = statuses.map((status) => (
    `<span class="cc tone-${status.tone}">${tally.get(status.key)} ${esc(status.label.toLowerCase())}</span>`
  )).join('');

  const cases = category.cases.map((c) => renderCase(c, statusIndex)).join('\n');

  return `<details class="tc-category" data-cat="${esc(category.key)}"${category.open ? ' open' : ''}>
<summary><span class="cat-icon">${esc(category.icon)}</span><span class="cat-name">${esc(category.name)}</span><span class="cat-counts">${counts}</span><span class="cat-chev"></span></summary>
<div class="tc-category-body">
<div class="tc-cat-actions"><button type="button" class="tc-cat-expand">Expand all</button><button type="button" class="tc-cat-collapse">Collapse all</button></div>
${cases}
</div>
</details>`;
}

function renderTestCases(testCases, statuses) {
  if (!testCases) return '';
  const statusIndex = new Map(statuses.map((s) => [s.key, s]));

  const statusOptions = statuses
    .map((s) => `<option value="${esc(s.key)}">${esc(s.key)}</option>`)
    .join('\n');
  const categoryOptions = testCases.categories
    .map((c) => `<option value="${esc(c.key)}">${esc(c.name)}</option>`)
    .join('\n');
  const categories = testCases.categories
    .map((c) => renderCategory(c, statuses, statusIndex))
    .join('\n');

  return `<div class="tc-actions">
<button type="button" id="tcExpandAll">Expand all</button>
<button type="button" id="tcCollapseAll">Collapse all</button>
</div>
<details class="section-collapse tc-section"${testCases.open ? ' open' : ''}>
<summary>${esc(testCases.title)}</summary>
<div class="tc-toolbar dashboard-card">
<input type="search" id="tcSearch" placeholder="${esc(testCases.searchPlaceholder)}">
<select id="tcStatusFilter">
<option value="">All statuses</option>
${statusOptions}
</select>
<select id="tcCategoryFilter">
<option value="">All categories</option>
${categoryOptions}
</select>
<button type="button" id="tcResetFilters">Reset</button>
<span id="tcCount" class="tc-count"></span>
</div>
<div id="tcNoResults" class="tc-no-results js-hidden">${esc(testCases.noResultsText)}</div>
${categories}
</details>`;
}

function renderSectionSummary(section) {
  if (section.badges.length === 0) return `<summary>${esc(section.title)}</summary>`;

  const badges = section.badges.map((badge) => (
    `<span class="section-count-badge"><span class="scb-val tone-${badge.tone}">${esc(badge.value)}</span>`
    + `<span class="scb-lbl">${esc(badge.label)}</span></span>`
  )).join('');
  const wrapped = section.badges.length > 1
    ? `<span class="section-count-badges">${badges}</span>`
    : badges;
  return `<summary class="section-summary-flex">${esc(section.title)}${wrapped}</summary>`;
}

function renderFindingsBody(section) {
  if (section.items.length === 0) return `<div class="empty">${esc(section.emptyText)}</div>`;
  return section.items.map((item) => {
    const parts = [
      `<div class="finding tone-${item.tone}"><div class="kind">${esc(item.kind)}</div>`,
      rich(item.body) + (item.refs ? ` <span class="mono">${esc(item.refs)}</span>` : ''),
    ];
    for (const field of item.fields) {
      const value = field.mono === false ? rich(field.value) : `<code>${rich(field.value)}</code>`;
      parts.push(`<div class="fkv"><b>${esc(field.label)}:</b> ${value}</div>`);
    }
    const evidence = renderEvidence(item.evidence);
    if (evidence) parts.push(evidence);
    parts.push('</div>');
    return parts.join('\n');
  }).join('\n');
}

function renderCleanupBody(section) {
  if (section.items.length === 0) return `<div class="empty">${esc(section.emptyText)}</div>`;
  const items = section.items.map((item) => {
    const label = item.label ? `<b>${esc(item.label)}</b> - ` : '';
    const ref = item.ref ? `<span class="mono">${esc(item.ref)}</span> ` : '';
    const refIn = item.refIn ? `(<span class="mono">${esc(item.refIn)}</span>) ` : '';
    const sep = (ref || refIn) ? '- ' : '';
    return `<li>${label}${ref}${refIn}${sep}${rich(item.body)}</li>`;
  }).join('\n');
  const heading = section.heading ? `<b>${esc(section.heading)}</b>` : '';
  return `<div class="cleanup">${heading}<ul>\n${items}\n</ul></div>`;
}

function renderNotesBody(section) {
  if (section.blocks.length === 0) return `<div class="empty">${esc(section.emptyText)}</div>`;
  const blocks = section.blocks.map((block) => {
    if (block.kind === 'p') return `<p>${rich(block.value)}</p>`;
    const items = block.items.map((item) => `<li>${rich(item)}</li>`).join('\n');
    return `<${block.kind}>\n${items}\n</${block.kind}>`;
  }).join('\n');
  return `<div class="notes-block">\n${blocks}\n</div>`;
}

function renderSection(section) {
  let body;
  if (section.type === 'findings') body = renderFindingsBody(section);
  else if (section.type === 'cleanup') body = renderCleanupBody(section);
  else body = renderNotesBody(section);

  return `<details class="section-collapse" id="section-${esc(slug(section.title))}"${section.open ? ' open' : ''}>
${renderSectionSummary(section)}
${body}
</details>`;
}

function renderHeader(model) {
  const pill = model.statusPill
    ? `<div><span class="pill tone-${model.statusPill.tone}">${rich(model.statusPill.value)}</span></div>`
    : '';
  return `<div class="header"><div class="header-main">
<h1>${esc(model.title)}</h1>
</div>${pill}</div>`;
}

/**
 * Does `html` hold exactly what this builder renders from `rawModel`? (Phase 9.3, F-28.)
 *
 * Rendering is deterministic, so the whole document is compared with a fresh render — not only the
 * `report-model-sha256` meta tag, which proves what the page CLAIMS to be built from while its visible body
 * could have been edited by hand. Line endings are normalized (git may convert them). A page built by an
 * older report_builder also differs: it is reported as such, and the remedy is the same — rebuild it.
 * @returns {{ok: boolean, reason: string|null, firstDifference: number|null}}
 */
function verifyHtml(html, rawModel) {
  const norm = (s) => String(s).replace(/\r\n/g, '\n');
  const got = norm(html);
  let want;
  try { want = norm(renderReport(rawModel)); } catch (err) { return { ok: false, reason: `the model does not render (${err.message})`, firstDifference: null }; }
  if (got === want) return { ok: true, reason: null, firstDifference: null };
  let i = 0;
  while (i < got.length && i < want.length && got[i] === want[i]) i += 1;
  const tag = got.match(/<meta name="report-model-sha256" content="([0-9a-f]{64})">/);
  const claimed = tag && tag[1] === modelFingerprint(rawModel);
  return {
    ok: false,
    firstDifference: i,
    reason: claimed
      ? `its content differs from a fresh render of the model it names (from character ${i}) — edited by hand after it was built, or built by an older report_builder; rebuild it from the model`
      : 'it was not built from this model — rebuild it from the model',
  };
}

/**
 * Render a report model to a single self-contained HTML document.
 * The model is validated first; an invalid model throws ReportModelError.
 */
function renderReport(rawModel) {
  const model = normalizeModel(rawModel);

  const body = [
    renderHeader(model),
    renderMetaCard(model.meta),
    renderSummary(model.summary),
    renderTestCases(model.testCases, model.statuses),
    ...model.sections.map(renderSection),
  ].filter(Boolean).join('\n');

  // Content-Security-Policy (Phase 9.2, F-17): the one script that runs is the report's own, allowed by the
  // SHA-256 of its exact text; nothing loads from anywhere, nothing navigates a form, no base URL is taken.
  // Inline styles stay allowed (the summary donut), which cannot execute script; url() loads are blocked.
  const script = `
${readAsset('report.js')}
`;
  const scriptHash = require('crypto').createHash('sha256').update(script, 'utf8').digest('base64');
  const csp = `default-src 'none'; script-src 'sha256-${scriptHash}'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="report-model-sha256" content="${modelFingerprint(rawModel)}">
<title>${esc(model.documentTitle)}</title>
<style>
${readAsset('report.css')}
</style>
</head><body><div class="wrap">
${body}
</div><script>${script}</script>
</body></html>
`;
}

module.exports = { esc, renderReport, verifyHtml };
