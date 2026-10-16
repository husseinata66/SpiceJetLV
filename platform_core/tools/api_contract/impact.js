// Contract drift → what it reaches: requirements, test cases, structured assertions, automation,
// execution evidence, reports and Suppliers. Read-only.
//
// It reuses the traceability graph (run_manager/traceGraph.rootGraph) — the same Requirement → Test
// Case → Automation → Execution → Report chain the change-impact analysis follows — and adds the one
// link that chain does not carry: which test cases and assertions exercise an API endpoint.
//
// THREE GRADES, never merged:
//   confirmed  a structured assertion's Expected Source names the changed endpoint AND the changed part:
//              the same JSON path (or an ancestor / descendant of it), the changed status code, or the
//              changed enum value. Written as `API contract <METHOD> <path> [<status>] [<$.json.path>]`
//              (or `API contract <operationId> …`), it is parsed, not searched.
//   potential  something points at the endpoint but does not prove the changed part is checked: the
//              case's text mentions it; an assertion cites the endpoint but another field; the case
//              traces to a requirement the contract declares for the endpoint; an assertion names a
//              field with the same NAME at another path. Each says why, and the ambiguous ones are
//              flagged `ambiguous` — a human confirms or rules them out.
//   missing    a changed endpoint no test case mentions at all — the drift reaches nothing traceable,
//              which is a coverage gap or untraced work, never "no impact".
// Nothing here edits a test case, an assertion or automation.

const fs = require('fs');
const path = require('path');

const list = (dir) => { try { return fs.readdirSync(dir); } catch { return []; } };
const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const METHOD_RE = '(GET|PUT|POST|DELETE|PATCH|HEAD|OPTIONS|TRACE)';

/** A matcher for an endpoint key (`GET /users/{}`): with its method, and by path alone. */
function endpointMatcher(key) {
  const sp = key.indexOf(' ');
  const method = key.slice(0, sp);
  const p = key.slice(sp + 1);
  const segs = p.split('/').filter(Boolean).map((s) => (s === '{}' ? '(?:\\{[^}/\\s]*\\}|:[A-Za-z_][\\w-]*|[^/\\s`\'"|)?#]+)' : esc(s)));
  const pathRe = segs.length ? `/${segs.join('/')}` : '/';
  const tail = '(?![\\w/{:-])';
  return {
    withMethod: new RegExp(`\\b${method}\\s+[\`'"]?(?:[a-z]+://[^/\\s]+)?(?:/[\\w.-]+)*?${pathRe}${tail}`, 'i'),
    pathOnly: new RegExp(`(?:^|[\\s\`'"(])(?:[a-z]+://[^/\\s]+)?(?:/[\\w.-]+)*?${pathRe}${tail}`, 'i'),
    // A path-only mention is only meaningful for a path with a literal segment beyond the first.
    pathOnlyReliable: p.split('/').filter((x) => x && x !== '{}').length >= 2,
  };
}

/**
 * A structured Expected Source: `API contract <METHOD> <path> [<status>] [<$.json.path>]`, or
 * `API contract <operationId> [<status>] [<$.json.path>]`. Null when the source is not one.
 */
function parseContractSource(source, operationIds = {}) {
  const s = String(source || '').replace(/[`*]/g, '').trim();
  const m = s.match(new RegExp(`^api contract\\s+(?:${METHOD_RE}\\s+(\\S+)|([A-Za-z_][\\w.-]*))(.*)$`, 'i'));
  if (!m) return null;
  // eslint-disable-next-line global-require
  const { keyOf } = require('./normalize');
  let endpoint = null;
  if (m[1]) endpoint = keyOf(m[1], m[2]);
  else if (operationIds[m[3]]) endpoint = operationIds[m[3]];
  else return { endpoint: null, operationId: m[3], status: null, field: null };
  const rest = m[4] || '';
  const status = (rest.match(/(?:^|\s)([1-5]\d\d|[1-5]XX|default)(?=\s|$)/i) || [])[1] || null;
  const field = (rest.match(/(?:^|\s)(\$[^\s]*)/) || [])[1] || null;
  return { endpoint, status: status ? status.toUpperCase() : null, field };
}

/** `$.a<ref:X>.b[]<type:object#2>.c` → ['a', 'b', 'c'] — the data path, without schema markers. */
const pathSegs = (f) => String(f || '$').replace(/<[^>]*>/g, '').replace(/\[\]/g, '').replace(/^\$\.?/, '').split('.').filter(Boolean);
/** Same field, or one is an ancestor of the other (an assertion on `$.customer` is reached by `$.customer.email`). */
function pathsRelated(a, b) {
  const x = pathSegs(a); const y = pathSegs(b);
  const n = Math.min(x.length, y.length);
  for (let i = 0; i < n; i += 1) if (x[i] !== y[i]) return false;
  return true;
}

/** Every scope root whose test cases a registry's contract reaches. */
function graphRootsFor(dataRoot, scope) {
  if (scope.family === 'feature') {
    const base = path.join(dataRoot, 'supplier-features', scope.feature);
    return [
      ...list(path.join(base, 'suppliers')).map((s) => ({ label: `${scope.feature}/${s}`, dir: path.join(base, 'suppliers', s), module: null })),
      ...list(path.join(base, 'shared')).map((s) => ({ label: `${scope.feature}/shared/${s}`, dir: path.join(base, 'shared', s), module: null })),
    ];
  }
  return [scope.root];
}

/** Test cases of a root, with their text and structured assertions. */
function casesOf(root) {
  // eslint-disable-next-line global-require
  const { parseTestCases } = require('../test_suite_export/parseTestCases');
  // eslint-disable-next-line global-require
  const { parseDesignAssertions } = require('../run_manager/assertionContract');
  const out = [];
  const dir = path.join(root.dir, 'test_design');
  for (const n of list(dir).filter((x) => /^TestCases_.+\.md$/.test(x))) {
    const { cases } = parseTestCases(read(path.join(dir, n)) || '', { sourceLabel: n });
    for (const c of cases) {
      // `sharedDefinitions`: the SETUP/VR text this case cites (test_suite_export/sharedDefinitions.js) —
      // an endpoint named only in a shared rule still reaches the case that uses it.
      const text = [c.title, c.objective, c.preconditions, c.testData, c.steps, c.expectedResult, c.notes, c.sharedDefinitions].map((v) => (Array.isArray(v) ? v.join('\n') : v || '')).join('\n');
      out.push({ id: c.id, suite: `test_design/${n}`, review: c.review, automation: c.automation, tags: Array.isArray(c.tags) ? c.tags.join(', ') : c.tags || '', text, assertions: c.assertions ? parseDesignAssertions(c.assertions).rows : [] });
    }
  }
  return out;
}

/**
 * Whether one design assertion is reached by a drift item, and how firmly.
 * @returns {null | {grade: 'confirmed'|'potential', why: string, ambiguous?: boolean}}
 */
function assertionHit(row, item, endpoint, m, operationIds) {
  const parsed = parseContractSource(row.source, operationIds);
  const statusOf = (x) => String(x || '').toUpperCase();
  if (parsed && parsed.endpoint) {
    if (parsed.endpoint !== endpoint) return null;
    // The endpoint is the assertion's: now the part.
    if (['endpoint', 'auth', 'source', 'webhook'].includes(item.location)) return { grade: 'confirmed', why: `cites ${endpoint}, whose ${item.location === 'auth' ? 'authentication' : 'existence'} changed` };
    if (item.location === 'status') {
      const codes = [item.status, item.before, item.after].filter(Boolean).flatMap((s) => String(s).match(/\b[1-5]\d\d\b/g) || []);
      const hit = codes.find((c) => statusOf(parsed.status) === c || new RegExp(`(^|[^\\d])${c}([^\\d]|$)`).test(row.expected));
      return hit ? { grade: 'confirmed', why: `checks status ${hit}` } : { grade: 'potential', why: `cites ${endpoint}; its status codes changed` };
    }
    if (parsed.status && item.status && statusOf(parsed.status) !== statusOf(item.status) && !(parsed.status.endsWith('XX') && statusOf(item.status)[0] === parsed.status[0])) return null; // another response
    if (item.value !== undefined && new RegExp(`(^|[^\\w])${esc(String(item.value))}([^\\w]|$)`).test(row.expected)) {
      if (!parsed.field || !item.field || pathsRelated(parsed.field, item.field) || (item.paths || []).some((p) => pathsRelated(parsed.field, p))) return { grade: 'confirmed', why: `expects ${item.value}` };
    }
    if (item.field && item.field !== '$' && parsed.field) {
      const fields = [item.field, ...(item.paths || [])];
      const exact = fields.find((f) => pathsRelated(parsed.field, f));
      if (exact) return { grade: 'confirmed', why: `checks ${parsed.field.replace(/^\$\.?/, '') || 'the body'}${pathSegs(exact).join('.') !== pathSegs(parsed.field).join('.') ? ` (changed: ${pathSegs(exact).join('.')})` : ''}` };
      // An exact JSON path is authoritative: another path — even one ending in the same field name — is
      // another field, and is not reached. (A shared leaf name proves nothing.)
      return null;
    }
    if (item.param) return { grade: 'potential', why: `cites ${endpoint}; its ${item.param} changed` };
    if (!parsed.field) return { grade: 'potential', why: `cites ${endpoint} without naming a field; ${item.field && item.field !== '$' ? item.field : item.location} changed`, ambiguous: true };
    return null;
  }
  // Unstructured Expected Source: only a mention — never a confirmation.
  if (m.withMethod.test(row.source) || (m.pathOnlyReliable && m.pathOnly.test(row.source))) return { grade: 'potential', why: `mentions ${endpoint} in an unstructured Expected Source`, ambiguous: true };
  return null;
}

/**
 * The reach of a comparison's items within the scope's roots.
 * @param {string} dataRoot
 * @param {object} scope       registry.resolveScope(...)
 * @param {object} comparison  diff.compareContracts(...)
 * @param {{endpoints?: Record<string, object>}} [opts]  endpoint definitions (declared requirements, operationIds)
 */
function analyzeContractImpact(dataRoot, scope, comparison, { endpoints = {} } = {}) {
  // eslint-disable-next-line global-require
  const { rootGraph } = require('../run_manager/traceGraph');
  // eslint-disable-next-line global-require
  const { endpointsOf } = require('./diff');
  const runsDir = path.join(dataRoot, 'runs');
  const roots = graphRootsFor(dataRoot, scope);
  const out = { roots: roots.map((r) => r.label), confirmed: [], potential: [], missing: [], requirements: [], automation: [], executions: [], reports: [], suppliers: [] };
  const operationIds = {};
  for (const [k, e] of Object.entries(endpoints)) if (e && e.operationId) operationIds[e.operationId] = k;
  const items = comparison.items.filter((i) => i.endpoint && i.endpoint !== '*' && i.classification !== 'Non-breaking');
  const byEndpoint = new Map();
  for (const it of items) for (const ep of endpointsOf(it)) byEndpoint.set(ep, [...(byEndpoint.get(ep) || []), it]);
  const reached = new Map(); // `${scope}|${tc}` -> entry

  for (const root of roots) {
    let graph = null;
    try { graph = rootGraph(runsDir, root); } catch { graph = null; }
    const cases = casesOf(root);
    for (const [ep, its] of byEndpoint) {
      const m = endpointMatcher(ep);
      const declared = (endpoints[ep] && endpoints[ep].requirements) || [];
      for (const r of declared) if (!out.requirements.some((x) => x.id === r && x.endpoint === ep)) out.requirements.push({ id: r, endpoint: ep, source: 'contract' });
      for (const c of cases) {
        const key = `${root.label}|${c.id}`;
        const gtc = graph && graph.testCases[c.id];
        const viaReq = declared.filter((r) => gtc && (gtc.dependsOn || []).includes(r));
        const hits = [];
        for (const it of its) {
          for (const row of c.assertions) {
            const h = assertionHit(row, it, ep, m, operationIds);
            if (h) hits.push({ assertionId: row.id, item: it.id, rule: it.rule, ...h });
          }
        }
        const confirmedHits = hits.filter((h) => h.grade === 'confirmed');
        const mentions = m.withMethod.test(c.text) ? 'method and path' : (m.pathOnlyReliable && m.pathOnly.test(c.text)) ? 'path only' : null;
        if (!hits.length && !viaReq.length && !mentions) continue;
        const grade = confirmedHits.length ? 'confirmed' : 'potential';
        const prev = reached.get(key) || { scope: root.label, testCase: c.id, suite: c.suite, review: c.review, automation: c.automation, grade, endpoints: [], assertions: [], potentialAssertions: [], via: [], items: [], ambiguous: false };
        if (grade === 'confirmed') prev.grade = 'confirmed';
        if (!prev.endpoints.includes(ep)) prev.endpoints.push(ep);
        for (const h of confirmedHits) if (!prev.assertions.some((a) => a.assertionId === h.assertionId && a.item === h.item)) prev.assertions.push({ assertionId: h.assertionId, item: h.item, rule: h.rule, why: h.why });
        for (const h of hits.filter((x) => x.grade === 'potential')) {
          if (!prev.potentialAssertions.some((a) => a.assertionId === h.assertionId && a.item === h.item)) prev.potentialAssertions.push({ assertionId: h.assertionId, item: h.item, rule: h.rule, why: h.why, ...(h.ambiguous ? { ambiguous: true } : {}) });
          if (h.ambiguous) prev.ambiguous = true;
        }
        for (const r of viaReq) if (!prev.via.includes(`traces to ${r}, which the contract declares for ${ep}`)) prev.via.push(`traces to ${r}, which the contract declares for ${ep}`);
        if (mentions && !prev.via.includes(`mentions ${ep} (${mentions})`)) { prev.via.push(`mentions ${ep} (${mentions})`); if (mentions === 'path only') prev.ambiguous = true; }
        prev.items = [...new Set([...prev.items, ...(confirmedHits.length ? confirmedHits.map((h) => h.item) : its.map((i) => i.id))])];
        prev.automationDecision = gtc ? gtc.automationDecision : null;
        prev.executions = gtc ? gtc.executions : [];
        reached.set(key, prev);
      }
    }
    if (graph) {
      for (const e of [...reached.values()].filter((x) => x.scope === root.label)) {
        if (e.automationDecision && !/manual/i.test(e.automationDecision)) out.automation.push({ scope: e.scope, testCase: e.testCase, decision: e.automationDecision });
        for (const x of e.executions || []) out.executions.push({ scope: e.scope, testCase: e.testCase, ...x });
      }
      for (const r of graph.reports) if (out.executions.some((x) => x.run === r.run) && !out.reports.some((y) => y.run === r.run && y.file === r.file)) out.reports.push(r);
    }
  }
  for (const e of reached.values()) {
    delete e.executions;
    if (e.grade === 'confirmed') e.ambiguous = false;
    (e.grade === 'confirmed' ? out.confirmed : out.potential).push(e);
  }
  for (const ep of byEndpoint.keys()) {
    if (![...reached.values()].some((e) => e.endpoints.includes(ep))) {
      out.missing.push({ endpoint: ep, items: byEndpoint.get(ep).map((i) => i.id), serious: byEndpoint.get(ep).some((i) => i.classification === 'Breaking' || i.classification === 'Unknown'), detail: `no test case in ${roots.map((r) => r.label).join(', ') || 'this scope'} mentions ${ep} — the change reaches nothing traceable (a coverage gap, or untraced tests)` });
    }
  }
  if (scope.family === 'feature') out.suppliers = list(path.join(dataRoot, 'supplier-features', scope.feature, 'suppliers'));
  else if (scope.family === 'supplier') out.suppliers = [scope.supplier];
  out.confirmed.sort((a, b) => a.testCase.localeCompare(b.testCase));
  out.potential.sort((a, b) => a.testCase.localeCompare(b.testCase));
  return out;
}

/** A test case's text as it is now, for "was it really updated" checks. */
function caseFingerprint(dataRoot, scope, root, testCaseId) {
  const r = graphRootsFor(dataRoot, scope).find((x) => x.label === root) || scope.root;
  // eslint-disable-next-line global-require
  const { parseTestCases } = require('../test_suite_export/parseTestCases');
  // eslint-disable-next-line global-require
  const { materialText } = require('../run_manager/assertionContract');
  const dir = path.join(r.dir, 'test_design');
  for (const n of list(dir).filter((x) => /^TestCases_.+\.md$/.test(x))) {
    const c = parseTestCases(read(path.join(dir, n)) || '', { sourceLabel: n }).cases.find((x) => x.id === testCaseId);
    if (c) return { material: require('crypto').createHash('sha256').update(materialText(c)).digest('hex'), review: c.review }; // eslint-disable-line global-require
  }
  return null;
}

module.exports = { endpointMatcher, parseContractSource, pathsRelated, graphRootsFor, casesOf, analyzeContractImpact, caseFingerprint };
