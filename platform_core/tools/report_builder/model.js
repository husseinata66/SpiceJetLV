'use strict';

/**
 * Report model normalisation and validation.
 *
 * The renderer never reads a raw model — it reads the normalised one this
 * module produces. Normalisation resolves the convenience shorthands (a bare
 * string where an object is allowed, an omitted summary that can be derived
 * from the test cases) so the renderer only ever handles one shape.
 */

const TONES = ['pass', 'fail', 'blocked', 'warning', 'accent', 'neutral'];

const DEFAULT_STATUSES = [
  { key: 'PASS', label: 'Passed', tone: 'pass' },
  { key: 'FAIL', label: 'Failed', tone: 'fail' },
  { key: 'BLOCKED', label: 'Blocked', tone: 'blocked' },
];

/** Category icons used when a category does not name its own. */
const DEFAULT_CATEGORY_ICONS = {
  positive: '✅',
  validation: '\u{1F50E}',
  boundary: '\u{1F4CF}',
  'business-rule': '⚖️',
  regression: '\u{1F501}',
  negative: '⛔',
  security: '\u{1F512}',
  integration: '\u{1F517}',
  flow: '\u{1F500}',
  performance: '⚡',
  usability: '\u{1F9ED}',
  accessibility: '♿',
};

class ReportModelError extends Error {}

function fail(path, message) {
  throw new ReportModelError(`${path}: ${message}`);
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function requireString(value, path) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(path, 'must be a non-empty string');
  }
  return value;
}

function optionalString(value, path) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string') fail(path, 'must be a string');
  return value;
}

function requireTone(value, path, fallback) {
  if (value === undefined || value === null) return fallback;
  if (!TONES.includes(value)) {
    fail(path, `unknown tone "${value}" — expected one of ${TONES.join(', ')}`);
  }
  return value;
}

function asArray(value, path) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) fail(path, 'must be an array');
  return value;
}

/** `"text"` | `{text}` | `{html}` -> `{text, html}`; exactly one side is set. */
function normalizeRich(value, path, { required = false } = {}) {
  if (value === undefined || value === null) {
    if (required) fail(path, 'is required');
    return null;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return { text: String(value), html: null };
  }
  if (!isPlainObject(value)) fail(path, 'must be a string or an object');
  const hasText = value.text !== undefined && value.text !== null;
  const hasHtml = value.html !== undefined && value.html !== null;
  if (hasText && hasHtml) fail(path, 'must set either "text" or "html", not both');
  if (!hasText && !hasHtml) {
    if (required) fail(path, 'must set "text" or "html"');
    return null;
  }
  if (hasHtml) return { text: null, html: requireString(value.html, `${path}.html`) };
  return { text: String(value.text), html: null };
}

function normalizeField(field, path) {
  if (!isPlainObject(field)) fail(path, 'must be an object');
  return {
    label: requireString(field.label, `${path}.label`),
    value: normalizeRich(field.value, `${path}.value`, { required: true }),
    // Tri-state on purpose: a meta field defaults to plain, a finding field
    // defaults to code-wrapped, and `mono` overrides either default explicitly.
    mono: field.mono === undefined || field.mono === null ? null : field.mono === true,
  };
}

function normalizeFields(list, path) {
  return asArray(list, path).map((field, i) => normalizeField(field, `${path}[${i}]`));
}

/**
 * A meta field list is ordered: each entry is either one field (its own line)
 * or an array of fields (one side-by-side row). Order is preserved as written,
 * so the model author controls the layout without a second parallel list.
 */
function normalizeMetaFields(list, path) {
  return asArray(list, path).map((entry, i) => {
    const p = `${path}[${i}]`;
    if (Array.isArray(entry)) {
      if (entry.length === 0) fail(p, 'row must hold at least one field');
      return { kind: 'row', fields: entry.map((f, j) => normalizeField(f, `${p}[${j}]`)) };
    }
    return { kind: 'field', field: normalizeField(entry, p) };
  });
}

function normalizeStatuses(list, path) {
  const statuses = asArray(list, path);
  const resolved = statuses.length === 0
    ? DEFAULT_STATUSES.map((s) => ({ ...s }))
    : statuses.map((status, i) => {
      const p = `${path}[${i}]`;
      if (!isPlainObject(status)) fail(p, 'must be an object');
      const key = requireString(status.key, `${p}.key`);
      return {
        key,
        label: optionalString(status.label, `${p}.label`) || key,
        tone: requireTone(status.tone, `${p}.tone`, 'neutral'),
      };
    });

  const seen = new Set();
  for (const status of resolved) {
    if (seen.has(status.key)) fail(path, `duplicate status key "${status.key}"`);
    seen.add(status.key);
  }
  return resolved;
}

function normalizeHeaders(list, path) {
  return asArray(list, path).map((header, i) => {
    const p = `${path}[${i}]`;
    if (!isPlainObject(header)) fail(p, 'must be an object');
    const redacted = header.redacted === true;
    if (!redacted && header.value === undefined) {
      fail(`${p}.value`, 'is required unless the header is marked redacted');
    }
    return {
      name: requireString(header.name, `${p}.name`),
      value: redacted ? null : String(header.value),
      redacted,
    };
  });
}

function normalizeMessage(message, path) {
  if (message === undefined || message === null) return null;
  if (!isPlainObject(message)) fail(path, 'must be an object');
  return {
    line: optionalString(message.line, `${path}.line`),
    headers: normalizeHeaders(message.headers, `${path}.headers`),
    body: optionalString(message.body, `${path}.body`),
    bodyLabel: optionalString(message.bodyLabel, `${path}.bodyLabel`) || 'BODY',
  };
}

function normalizeExchanges(list, path) {
  return asArray(list, path).map((exchange, i) => {
    const p = `${path}[${i}]`;
    if (!isPlainObject(exchange)) fail(p, 'must be an object');
    const request = normalizeMessage(exchange.request, `${p}.request`);
    const response = normalizeMessage(exchange.response, `${p}.response`);
    if (!request && !response) fail(p, 'must carry a request, a response, or both');
    return {
      label: optionalString(exchange.label, `${p}.label`),
      requestTitle: optionalString(exchange.requestTitle, `${p}.requestTitle`) || 'Request',
      responseTitle: optionalString(exchange.responseTitle, `${p}.responseTitle`) || 'Response',
      request,
      response,
      notes: asArray(exchange.notes, `${p}.notes`).map((n, j) => requireString(n, `${p}.notes[${j}]`)),
    };
  });
}

function normalizeEvidence(evidence, path) {
  if (evidence === undefined || evidence === null) return null;
  if (typeof evidence === 'string') {
    return { summary: 'Evidence', body: { text: evidence, html: null } };
  }
  if (!isPlainObject(evidence)) fail(path, 'must be a string or an object');
  return {
    summary: optionalString(evidence.summary, `${path}.summary`) || 'Evidence',
    body: normalizeRich(evidence.body, `${path}.body`, { required: true }),
  };
}

function normalizeCaseDetail(detail, path) {
  if (detail === undefined || detail === null) return null;
  if (!isPlainObject(detail)) fail(path, 'must be an object');

  const steps = asArray(detail.steps, `${path}.steps`)
    .map((s, i) => normalizeRich(s, `${path}.steps[${i}]`, { required: true }));

  const blocks = [];
  const push = (heading, value) => {
    const rich = normalizeRich(value, `${path}.${heading}`);
    if (rich) blocks.push({ kind: 'text', heading, value: rich });
  };

  push('Preconditions', detail.preconditions);
  push('Test Data', detail.testData);
  if (steps.length > 0) blocks.push({ kind: 'steps', heading: 'Steps', steps });
  push('Expected Result', detail.expected);
  push('Priority', detail.priority);

  const tags = asArray(detail.tags, `${path}.tags`)
    .map((t, i) => requireString(t, `${path}.tags[${i}]`));
  if (tags.length > 0) {
    blocks.push({ kind: 'text', heading: 'Tags', value: { text: tags.join(', '), html: null } });
  }

  for (const extra of asArray(detail.extra, `${path}.extra`)) {
    const i = detail.extra.indexOf(extra);
    const p = `${path}.extra[${i}]`;
    if (!isPlainObject(extra)) fail(p, 'must be an object');
    blocks.push({
      kind: 'text',
      heading: requireString(extra.heading, `${p}.heading`),
      value: normalizeRich(extra.value, `${p}.value`, { required: true }),
    });
  }

  if (blocks.length === 0) return null;
  return {
    summary: optionalString(detail.summary, `${path}.summary`) || 'View Test Case',
    blocks,
  };
}

/**
 * Assertion records of a case (pipeline.md §11.4): what was checked, against which expected value, how,
 * and with what result. `result` is pass, fail, unchecked, or missing — a required assertion (Phase 5.8
 * contract) with no execution record, reported apart from a failed one (✅ / ❌ accepted). `id` is the
 * assertion's stable ID (A1, A2, …) when the case states its assertions. Optional on a case; a
 * report that claims all-passed needs them on every passing case (normalizeModel).
 */
function normalizeAssertions(list, path) {
  if (list === undefined || list === null) return null;
  return asArray(list, path).map((a, i) => {
    const p = `${path}[${i}]`;
    if (!isPlainObject(a)) fail(p, 'must be an object');
    const raw = requireString(a.result, `${p}.result`).trim().toLowerCase();
    const result = /^(✅|pass(ed)?)$/.test(raw) ? 'pass' : /^(❌|fail(ed)?)$/.test(raw) ? 'fail' : /^(unchecked|not checked)$/.test(raw) ? 'unchecked' : /^missing$/.test(raw) ? 'missing' : null;
    if (!result) fail(`${p}.result`, `"${a.result}" — expected pass, fail, unchecked or missing`);
    const id = optionalString(a.id, `${p}.id`);
    if (id && !/^A\d+$/.test(id)) fail(`${p}.id`, `"${id}" — an assertion ID is A1, A2, …`);
    return {
      id: id || null,
      assertion: requireString(a.assertion, `${p}.assertion`),
      expected: requireString(a.expected, `${p}.expected`),
      // A missing assertion has no observation: its Actual is shown as not recorded.
      actual: result === 'missing' ? (optionalString(a.actual, `${p}.actual`) || '—') : requireString(a.actual, `${p}.actual`),
      check: requireString(a.check, `${p}.check`),
      result,
      evidence: optionalString(a.evidence, `${p}.evidence`),
    };
  });
}

function normalizeCase(testCase, path, statusIndex) {
  if (!isPlainObject(testCase)) fail(path, 'must be an object');
  const status = requireString(testCase.status, `${path}.status`);
  if (!statusIndex.has(status)) {
    fail(`${path}.status`, `"${status}" is not declared in statuses[] (declared: ${[...statusIndex.keys()].join(', ')})`);
  }
  return {
    id: optionalString(testCase.id, `${path}.id`),
    title: requireString(testCase.title, `${path}.title`),
    status,
    rows: normalizeFields(testCase.rows, `${path}.rows`),
    statusLabel: optionalString(testCase.statusLabel, `${path}.statusLabel`),
    evidence: normalizeEvidence(testCase.evidence, `${path}.evidence`),
    assertions: normalizeAssertions(testCase.assertions, `${path}.assertions`),
    exchanges: normalizeExchanges(testCase.exchanges, `${path}.exchanges`),
    detail: normalizeCaseDetail(testCase.detail, `${path}.detail`),
  };
}

function normalizeTestCases(testCases, path, statusIndex) {
  if (testCases === undefined || testCases === null) return null;
  if (!isPlainObject(testCases)) fail(path, 'must be an object');

  const categories = asArray(testCases.categories, `${path}.categories`).map((category, i) => {
    const p = `${path}.categories[${i}]`;
    if (!isPlainObject(category)) fail(p, 'must be an object');
    const key = requireString(category.key, `${p}.key`);
    const cases = asArray(category.cases, `${p}.cases`)
      .map((c, j) => normalizeCase(c, `${p}.cases[${j}]`, statusIndex));
    return {
      key,
      name: optionalString(category.name, `${p}.name`) || key,
      icon: optionalString(category.icon, `${p}.icon`) || DEFAULT_CATEGORY_ICONS[key] || '•',
      open: category.open !== false,
      cases,
    };
  });

  if (categories.length === 0) fail(`${path}.categories`, 'must list at least one category');

  const seen = new Set();
  for (const category of categories) {
    if (seen.has(category.key)) fail(`${path}.categories`, `duplicate category key "${category.key}"`);
    seen.add(category.key);
  }

  return {
    title: optionalString(testCases.title, `${path}.title`) || 'Test case results',
    searchPlaceholder: optionalString(testCases.searchPlaceholder, `${path}.searchPlaceholder`)
      || 'Search test cases...',
    noResultsText: optionalString(testCases.noResultsText, `${path}.noResultsText`)
      || 'No test cases match your search. Try a different keyword, or clear the search/filters above.',
    open: testCases.open !== false,
    categories,
  };
}

/** Count every case per status key, in the declared status order. */
function tallyStatuses(testCases, statuses) {
  const tally = new Map(statuses.map((s) => [s.key, 0]));
  let total = 0;
  for (const category of testCases.categories) {
    for (const testCase of category.cases) {
      tally.set(testCase.status, tally.get(testCase.status) + 1);
      total += 1;
    }
  }
  return { tally, total };
}

function normalizeSummary(summary, path, testCases, statuses, statusIndex) {
  if (summary === null) return null;
  const raw = summary === undefined ? {} : summary;
  if (!isPlainObject(raw)) fail(path, 'must be an object');

  const derived = testCases ? tallyStatuses(testCases, statuses) : null;

  let counts;
  if (raw.counts === undefined) {
    if (!derived) fail(`${path}.counts`, 'is required when the report has no test cases to derive it from');
    counts = statuses.map((status) => ({
      status: status.key,
      label: status.label,
      tone: status.tone,
      value: derived.tally.get(status.key),
    }));
  } else {
    counts = asArray(raw.counts, `${path}.counts`).map((count, i) => {
      const p = `${path}.counts[${i}]`;
      if (!isPlainObject(count)) fail(p, 'must be an object');
      const key = requireString(count.status, `${p}.status`);
      if (!statusIndex.has(key)) {
        fail(`${p}.status`, `"${key}" is not declared in statuses[]`);
      }
      const status = statusIndex.get(key);
      if (typeof count.value !== 'number') fail(`${p}.value`, 'must be a number');
      return {
        status: key,
        label: optionalString(count.label, `${p}.label`) || status.label,
        tone: requireTone(count.tone, `${p}.tone`, status.tone),
        value: count.value,
      };
    });
  }

  const countedTotal = counts.reduce((sum, c) => sum + c.value, 0);
  const total = raw.total === undefined || raw.total === null
    ? (derived ? derived.total : countedTotal)
    : raw.total;
  if (typeof total !== 'number') fail(`${path}.total`, 'must be a number');

  // The donut is a conic-gradient over the counts, so it needs a non-zero base.
  const donutBase = counts.reduce((sum, c) => sum + c.value, 0);
  let donut = null;
  if (raw.donut !== null && donutBase > 0) {
    const d = isPlainObject(raw.donut) ? raw.donut : {};
    const focusKey = optionalString(d.focus, `${path}.donut.focus`) || counts[0].status;
    if (!statusIndex.has(focusKey)) fail(`${path}.donut.focus`, `"${focusKey}" is not declared in statuses[]`);
    const focusCount = counts.find((c) => c.status === focusKey);
    const percent = d.percent === undefined || d.percent === null
      ? Math.round(((focusCount ? focusCount.value : 0) / donutBase) * 100)
      : d.percent;
    if (typeof percent !== 'number') fail(`${path}.donut.percent`, 'must be a number');
    donut = {
      percent,
      label: optionalString(d.label, `${path}.donut.label`) || `${focusKey.toLowerCase()} rate`,
      base: donutBase,
    };
  }

  return {
    title: optionalString(raw.title, `${path}.title`) || '1. Executive Summary',
    total,
    totalLabel: optionalString(raw.totalLabel, `${path}.totalLabel`) || 'Total Executed Test Cases',
    duration: optionalString(raw.duration, `${path}.duration`),
    durationLabel: optionalString(raw.durationLabel, `${path}.durationLabel`) || 'Execution Duration',
    counts,
    donut,
  };
}

function normalizeBadges(list, path) {
  return asArray(list, path).map((badge, i) => {
    const p = `${path}[${i}]`;
    if (!isPlainObject(badge)) fail(p, 'must be an object');
    if (badge.value === undefined || badge.value === null) fail(`${p}.value`, 'is required');
    return {
      value: String(badge.value),
      label: requireString(badge.label, `${p}.label`),
      tone: requireTone(badge.tone, `${p}.tone`, 'accent'),
    };
  });
}

function normalizeFindingItems(list, path) {
  return asArray(list, path).map((item, i) => {
    const p = `${path}[${i}]`;
    if (!isPlainObject(item)) fail(p, 'must be an object');
    return {
      kind: requireString(item.kind, `${p}.kind`),
      tone: requireTone(item.tone, `${p}.tone`, 'accent'),
      body: normalizeRich(item.body, `${p}.body`, { required: true }),
      refs: optionalString(item.refs, `${p}.refs`),
      fields: normalizeFields(item.fields, `${p}.fields`),
      evidence: normalizeEvidence(item.evidence, `${p}.evidence`),
    };
  });
}

function normalizeCleanupItems(list, path) {
  return asArray(list, path).map((item, i) => {
    const p = `${path}[${i}]`;
    if (!isPlainObject(item)) fail(p, 'must be an object');
    return {
      label: optionalString(item.label, `${p}.label`),
      ref: optionalString(item.ref, `${p}.ref`),
      refIn: optionalString(item.refIn, `${p}.refIn`),
      body: normalizeRich(item.body, `${p}.body`, { required: true }),
    };
  });
}

function normalizeNoteBlocks(list, path) {
  return asArray(list, path).map((block, i) => {
    const p = `${path}[${i}]`;
    if (typeof block === 'string') return { kind: 'p', value: { text: block, html: null } };
    if (!isPlainObject(block)) fail(p, 'must be a string or an object');
    const kind = optionalString(block.kind, `${p}.kind`) || 'p';
    if (kind === 'ul' || kind === 'ol') {
      const items = asArray(block.items, `${p}.items`)
        .map((it, j) => normalizeRich(it, `${p}.items[${j}]`, { required: true }));
      if (items.length === 0) fail(`${p}.items`, 'must list at least one item');
      return { kind, items };
    }
    if (kind !== 'p') fail(`${p}.kind`, `unknown block kind "${kind}" — expected p, ul, or ol`);
    return { kind: 'p', value: normalizeRich(block.value, `${p}.value`, { required: true }) };
  });
}

function normalizeSections(list, path) {
  return asArray(list, path).map((section, i) => {
    const p = `${path}[${i}]`;
    if (!isPlainObject(section)) fail(p, 'must be an object');
    const type = requireString(section.type, `${p}.type`);
    const base = {
      type,
      title: requireString(section.title, `${p}.title`),
      open: section.open !== false,
      badges: normalizeBadges(section.badges, `${p}.badges`),
      emptyText: optionalString(section.emptyText, `${p}.emptyText`) || 'Nothing to report.',
    };

    if (type === 'findings') return { ...base, items: normalizeFindingItems(section.items, `${p}.items`) };
    if (type === 'cleanup') {
      return {
        ...base,
        heading: optionalString(section.heading, `${p}.heading`),
        items: normalizeCleanupItems(section.items, `${p}.items`),
      };
    }
    if (type === 'notes') return { ...base, blocks: normalizeNoteBlocks(section.blocks, `${p}.blocks`) };
    return fail(`${p}.type`, `unknown section type "${type}" — expected findings, cleanup, or notes`);
  });
}

function normalizeMeta(meta, path) {
  const raw = meta === undefined || meta === null ? {} : meta;
  if (!isPlainObject(raw)) fail(path, 'must be an object');

  return {
    fields: normalizeMetaFields(raw.fields, `${path}.fields`),
    runFields: normalizeMetaFields(raw.runFields, `${path}.runFields`),
  };
}

/**
 * Validate a raw report model and return the normalised form the renderer takes.
 * Throws ReportModelError with a JSON-path-ish message on the first problem.
 */
function normalizeModel(model) {
  if (!isPlainObject(model)) fail('model', 'must be an object');

  const statuses = normalizeStatuses(model.statuses, 'statuses');
  const statusIndex = new Map(statuses.map((s) => [s.key, s]));
  const testCases = normalizeTestCases(model.testCases, 'testCases', statusIndex);
  const title = requireString(model.title, 'title');
  const summary = normalizeSummary(model.summary, 'summary', testCases, statuses, statusIndex);
  const outcomeVerdict = optionalString(model.outcomeVerdict, 'outcomeVerdict');

  // A green indicator is a claim that every test passed. It is never the default (revised 2026-10-08:
  // the default was "pass", which painted a run with failures green), and it is refused unless the
  // model declares an `outcomeVerdict` of "all-passed" that its own counts do not contradict.
  const statusPill = (() => {
    const pill = normalizeRich(model.statusPill, 'statusPill');
    if (!pill) return null;
    return { value: pill, tone: requireTone(model.statusPillTone, 'statusPillTone', 'neutral') };
  })();
  if (outcomeVerdict === 'all-passed' && summary) {
    const notPassed = summary.counts.filter((c) => c.value > 0 && !/^(pass(ed)?|excluded)$/i.test(String(c.label).trim()));
    if (notPassed.length) {
      fail('outcomeVerdict', `is "all-passed", but the report counts ${notPassed.map((c) => `${c.value} ${c.label}`).join(', ')}`);
    }
  }
  // A passing case shows that each assertion was validated (pipeline.md §11.4): one carrying a failed or
  // unchecked assertion is not a pass, and a report claiming all-passed shows the assertions of every
  // passing case — a screenshot or a captured value is not proof.
  if (testCases) {
    testCases.categories.forEach((category, ci) => category.cases.forEach((c, i) => {
      const p = `testCases.categories[${ci}].cases[${i}]`;
      if (statusIndex.get(c.status).tone !== 'pass') return;
      const bad = (c.assertions || []).filter((a) => a.result !== 'pass');
      if (bad.length) fail(`${p}.assertions`, `the case is a pass, but assertion "${bad[0].assertion}" is ${bad[0].result}`);
      if (outcomeVerdict === 'all-passed' && !(c.assertions || []).length) {
        fail(`${p}.assertions`, 'outcomeVerdict is "all-passed", but this passing case records no assertions — its pass is not shown to be verified');
      }
    }));
  }
  if (statusPill && statusPill.tone === 'pass' && outcomeVerdict !== 'all-passed') {
    fail('statusPillTone', `is "pass" (green), but outcomeVerdict is ${outcomeVerdict ? `"${outcomeVerdict}"` : 'not declared'} — a green indicator needs an all-passed outcome`);
  }

  return {
    title,
    documentTitle: optionalString(model.documentTitle, 'documentTitle') || title,
    statusPill,
    outcomeVerdict: outcomeVerdict || null,
    meta: normalizeMeta(model.meta, 'meta'),
    summary,
    statuses,
    testCases,
    sections: normalizeSections(model.sections, 'sections'),
  };
}

/**
 * Fingerprint of a report model, embedded in the HTML it renders, so a reader can confirm the HTML was
 * built from the JSON beside it and not an older or edited one. Canonical form: JSON.stringify of the
 * parsed model.
 */
function modelFingerprint(model) {
  // eslint-disable-next-line global-require
  return require('crypto').createHash('sha256').update(JSON.stringify(model)).digest('hex');
}

module.exports = {
  DEFAULT_CATEGORY_ICONS,
  DEFAULT_STATUSES,
  ReportModelError,
  TONES,
  normalizeModel,
  modelFingerprint,
};
