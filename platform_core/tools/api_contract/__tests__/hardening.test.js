// Phase 7.1 — coverage policy, YAML edge cases found in real specifications, Postman variants, opaque
// bodies, composition pairing, and impact precision.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { parseYaml } = require('../yaml');
const { normalizeContract } = require('../normalize');
const { compareContracts } = require('../diff');
const { parseContractSource, pathsRelated } = require('../impact');
const R = require('../registry');
const { NOW, USERS_YAML, baseDoc, fixture } = require('./contractFixture');

const SCOPE = 'modules/users';
const roots = (fx, m = 'users') => [{ label: m, dir: path.join(fx.root, 'modules', m), module: m }];
const approve = (fx) => R.importApproved(fx.root, SCOPE, { name: 'users-api', source: fx.source('users.yaml', USERS_YAML), approvedBy: 'API Owner', reason: 'v1', now: NOW });

// ---------------------------------------------------------------------------------------------
// YAML — constructs met in GitHub, Stripe and OAI specifications
// ---------------------------------------------------------------------------------------------

test('YAML: quoted scalars that wrap lines, escapes, flow collections on their own lines, block scalar indicators', () => {
  const y = parseYaml([
    'a: \'Comma-separated list of states. Can be any',
    '  combination of: `queued`, `done`.\'',
    'b: "line one',
    '',
    '  line two \\u00e9\\t\\"q\\""',
    'c: "joined \\',
    '   here"',
    'example:',
    '  {',
    '    "total": 2, # a comment in a flow mapping',
    '    "apis": [ { "k": "v: w" }, 3 ]',
    '  }',
    'lit: |+',
    '  keep',
    '',
    'fold: >-',
    '  one',
    '  two',
    '',
    '    indented',
    '  three',
    'clip: |2',
    '    two spaces kept',
    'empty:',
    'list:',
    '- x',
    '- "quoted: colon"',
    "'200':",
    '  description: ok',
    'url: https://example.test/a:b',
  ].join('\n'));
  assert.equal(y.a, 'Comma-separated list of states. Can be any combination of: `queued`, `done`.');
  assert.equal(y.b, 'line one\nline two é\t"q"');
  assert.equal(y.c, 'joined here');
  assert.deepEqual(y.example, { total: 2, apis: [{ k: 'v: w' }, 3] });
  assert.equal(y.lit, 'keep\n\n');
  assert.equal(y.fold, 'one two\n\n  indented\nthree');
  assert.equal(y.clip, '  two spaces kept\n');
  assert.equal(y.empty, null);
  assert.deepEqual(y.list, ['x', 'quoted: colon']);
  assert.equal(y['200'].description, 'ok');
  assert.equal(y.url, 'https://example.test/a:b');
  // YAML 1.2 core schema: `yes` is a string, `0x1F` a number, `.inf` infinity.
  assert.deepEqual(parseYaml('a: yes\nb: 0x1F\nc: .inf\nd: 1.0\ne: ~\n'), { a: 'yes', b: 31, c: Infinity, d: 1, e: null });
});

// ---------------------------------------------------------------------------------------------
// Postman variants and opaque bodies
// ---------------------------------------------------------------------------------------------

test('Postman: _postman_schema, a collection without info, raw header strings — header values (Hawk, Bearer) are never kept', () => {
  const v20 = normalizeContract(JSON.stringify({ info: { name: 'x', _postman_schema: 'https://schema.getpostman.com/#2.0.0' }, item: [{ name: 'a', request: 'http://echo.example/status/200', response: [{ code: 200, header: 'Content-Type: application/json\r\nAuthorization: Hawk id="dh37fgj492je", mac="O2TFl"\r\nX-Trace: 1\r\n', body: 'not json' }] }] }));
  assert.equal(v20.format, 'postman-2');
  assert.ok(v20.endpoints['GET /status/200'].responses['200'].headers['x-trace']);
  assert.ok(!v20.endpoints['GET /status/200'].responses['200'].headers.authorization, 'an auth header is never a contract header');
  const noInfo = normalizeContract(JSON.stringify({ name: 'inherited', auth: { type: 'basic', basic: [{ key: 'password', value: 'hunter2' }] }, item: [{ name: 'b', request: { method: 'POST', url: 'https://x/post', header: [{ key: 'Authorization', value: 'Bearer eyJabc.def.ghi' }], body: { mode: 'raw', raw: 'plain text body' } } }] }));
  assert.equal(noInfo.format, 'postman-2');
  const kept = JSON.stringify([v20, noInfo]);
  for (const secret of ['dh37fgj492je', 'O2TFl', 'hunter2', 'eyJabc', 'plain text body', 'not json']) assert.ok(!kept.includes(secret), secret);
  assert.equal(noInfo.endpoints['POST /post'].auth.alternatives[0], 'http:bearer');
  // A non-JSON body keeps a fingerprint only: unchanged is unchanged; changed is Unknown.
  const same = compareContracts(noInfo, JSON.parse(JSON.stringify(noInfo)));
  assert.equal(same.classification, 'Unchanged');
  const changed = normalizeContract(JSON.stringify({ name: 'inherited', item: [{ name: 'b', request: { method: 'POST', url: 'https://x/post', header: [{ key: 'Authorization', value: 'Bearer x' }], body: { mode: 'raw', raw: 'another text body' } } }] }));
  assert.ok(compareContracts(noInfo, changed).items.some((i) => i.rule === 'SC-UNRESOLVED' && i.classification === 'Unknown'));
});

// ---------------------------------------------------------------------------------------------
// Composition pairing
// ---------------------------------------------------------------------------------------------

test('composition: same-typed anyOf members pair by their values (Stripe cancel_at); a renamed identical schema is the same member', () => {
  const doc = (third, extra = {}) => ({ openapi: '3.0.3', info: { title: 't', version: '1' }, paths: { '/s': { post: { requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { cancel_at: { anyOf: [{ type: 'integer', format: 'unix-time' }, { type: 'string', enum: [''] }, { type: 'string', enum: third }] } } } } } }, responses: { 200: { description: 'ok', content: { 'application/json': { schema: { $ref: extra.name || '#/components/schemas/Payer' } } } } } } } }, components: { schemas: { [(extra.name || '#/components/schemas/Payer').split('/').pop()]: { type: 'object', properties: { id: { type: 'string' } } } } } });
  const a = normalizeContract(JSON.stringify(doc(['max_period_end', 'min_period_end'])));
  const b = normalizeContract(JSON.stringify(doc(['max_billed_until', 'max_period_end', 'min_period_end'])));
  const d = compareContracts(a, b);
  assert.deepEqual(d.items.map((i) => `${i.rule}|${i.value}|${i.classification}`), ['SC-ENUM-VALUE-ADDED|max_billed_until|Non-breaking'], 'one enum value added to one member — not "cannot be told apart"');
  // Two members that share every feature cannot be paired reliably: Unknown.
  const tie = (x) => normalizeContract(JSON.stringify({ openapi: '3.0.3', info: { title: 't', version: '1' }, paths: { '/s': { get: { responses: { 200: { description: 'ok', content: { 'application/json': { schema: { oneOf: x } } } } } } } } }));
  const d2 = compareContracts(tie([{ type: 'object', properties: { a: { type: 'string' } } }, { type: 'object', properties: { a: { type: 'integer' } } }]), tie([{ type: 'object', properties: { a: { type: 'number' } } }, { type: 'object', properties: { a: { type: 'boolean' } } }]));
  assert.equal(d2.classification, 'Unknown');
  // Renamed component with the same definition is the same member (Stripe klarna_payer_details).
  const r1 = normalizeContract(JSON.stringify({ openapi: '3.0.3', info: { title: 't', version: '1' }, paths: { '/p': { get: { responses: { 200: { description: 'ok', content: { 'application/json': { schema: { anyOf: [{ $ref: '#/components/schemas/old_name' }, { type: 'string' }] } } } } } } } }, components: { schemas: { old_name: { type: 'object', properties: { x: { type: 'string' } } } } } }));
  const r2 = normalizeContract(JSON.stringify({ openapi: '3.0.3', info: { title: 't', version: '1' }, paths: { '/p': { get: { responses: { 200: { description: 'ok', content: { 'application/json': { schema: { anyOf: [{ $ref: '#/components/schemas/new_name' }, { type: 'string' }] } } } } } } } }, components: { schemas: { new_name: { type: 'object', properties: { x: { type: 'string' } } } } } }));
  assert.equal(compareContracts(r1, r2).classification, 'Unchanged');
});

test('conformance through named schemas: writeOnly fields are never required in a response; readOnly ones never in a request', () => {
  const d = baseDoc();
  d.components.schemas.User.properties.password = { type: 'string', writeOnly: true };
  d.components.schemas.User.required.push('password');
  const approved = normalizeContract(JSON.stringify(d));
  const obs = normalizeContract(JSON.stringify({ kind: 'api-evidence', exchanges: [{ method: 'GET', url: 'https://users.example.test/v1/users/1', status: 200, requestHeaders: { Authorization: 'Bearer z' }, responseBody: { id: '1', name: 'A', status: 'ACTIVE' } }] }));
  const c = compareContracts(approved, obs, { mode: 'conformance' });
  assert.ok(!c.items.some((i) => i.rule === 'SC-FIELD-MISSING'), 'a writeOnly password is never in a response');
});

// ---------------------------------------------------------------------------------------------
// Impact precision — the structured Expected Source
// ---------------------------------------------------------------------------------------------

test('impact precision: the structured Expected Source is parsed; JSON paths relate only as same / ancestor / descendant', () => {
  assert.deepEqual(parseContractSource('API contract GET /users/{id} 200 $.status'), { endpoint: 'GET /users/{}', status: '200', field: '$.status' });
  assert.deepEqual(parseContractSource('`API contract` POST /v1/users 4XX $.error.code'), { endpoint: 'POST /v1/users', status: '4XX', field: '$.error.code' });
  assert.deepEqual(parseContractSource('API contract getUser $.name', { getUser: 'GET /users/{}' }), { endpoint: 'GET /users/{}', status: null, field: '$.name' });
  assert.equal(parseContractSource('API contract unknownOp', {}).endpoint, null);
  assert.equal(parseContractSource('Expected Result'), null);
  assert.equal(pathsRelated('$.customer', '$.customer.email'), true);
  assert.equal(pathsRelated('$.customer.email', '$.customer'), true);
  assert.equal(pathsRelated('$[].category<ref:Category>.name', '$[].category.name'), true, 'schema markers and array steps are not data');
  assert.equal(pathsRelated('$.tags[].name', '$.category.name'), false, 'a shared leaf name proves nothing');
});

// ---------------------------------------------------------------------------------------------
// Contract coverage policy
// ---------------------------------------------------------------------------------------------

test('policy: chosen by a named human, recorded with history; without a choice a scope is optional (Phase 7 behaviour)', (t) => {
  const fx = fixture(); t.after(() => fx.cleanup());
  const scope = R.resolveScope(fx.root, SCOPE);
  assert.deepEqual(R.effectivePolicy(fx.root, scope), { mode: 'optional', source: 'default', by: null, at: null, decision: null });
  assert.deepEqual(R.contractGate(fx.root, roots(fx)).blockers, [], 'no registry, no policy: untouched');
  assert.throws(() => R.setPolicy(fx.root, SCOPE, { mode: 'required', by: '', reason: 'r', now: NOW }), /--by is required/);
  assert.throws(() => R.setPolicy(fx.root, SCOPE, { mode: 'mandatory', by: 'QA Lead', reason: 'r', now: NOW }), /--mode must be/);
  R.setPolicy(fx.root, 'project', { mode: 'required', by: 'QA Manager', reason: 'every API scope is contract-validated', now: NOW });
  assert.equal(R.effectivePolicy(fx.root, scope).source, 'project');
  R.setPolicy(fx.root, SCOPE, { mode: 'optional', by: 'QA Lead', reason: 'users API not yet specified', now: NOW });
  assert.deepEqual([R.effectivePolicy(fx.root, scope).mode, R.effectivePolicy(fx.root, scope).source], ['optional', 'scope'], 'a scope overrides the project');
  R.setPolicy(fx.root, SCOPE, { mode: 'required', by: 'QA Lead', reason: 'spec delivered', now: NOW });
  const reg = R.readRegistry(scope);
  assert.deepEqual(reg.decisions.filter((d) => d.kind === 'policy').map((d) => `${d.previous}→${d.mode}`), ['null→optional', 'optional→required']);
  const project = JSON.parse(fx.read('knowledge_base/api_contract_policy.json'));
  assert.equal(project.history.length, 1);
  assert.equal(project.current.by, 'QA Manager');
});

test('policy required: a missing approved contract blocks the API cases of the scope; a partial scope without them, and non-API scopes, are not blocked', (t) => {
  const fx = fixture(); t.after(() => fx.cleanup());
  R.setPolicy(fx.root, 'project', { mode: 'required', by: 'QA Manager', reason: 'r', now: NOW });
  const g = R.contractGate(fx.root, roots(fx));
  assert.equal(g.blockers.length, 1);
  assert.match(g.blockers[0], /REQUIRED .* has no approved API contract/);
  assert.match(g.blockers[0], /TC-USR-001/);
  // TC-USR-003/004 have no API-contract assertion, but all cases are tagged API in the fixture: tag counts.
  fx.put('modules/orders/test_design/TestCases_orders.md', '# Test Cases — orders\n\n| Field | Value |\n|---|---|\n| Status | Approved |\n\n## Test Cases\n\n### TC-ORD-001 — UI only\n\n**Objective:** o.\n\n**Steps:**\n\n1. Open the page.\n\n**Expected Result:** shown.\n\n**Priority:** P1\n\n**Tags:** UI\n\n**Review:** Approved\n\n**Automation:** Approved\n');
  assert.deepEqual(R.contractGate(fx.root, roots(fx, 'orders')).blockers, [], 'a project-wide policy reaches only scopes with API work');
  // A scope that opts in itself is blocked even when no API case is identified.
  R.setPolicy(fx.root, 'modules/orders', { mode: 'required', by: 'QA Lead', reason: 'orders API is contract-first', now: NOW });
  assert.equal(R.contractGate(fx.root, roots(fx, 'orders')).blockers.length, 1);
  // Approving a contract clears the missing-contract blocker.
  approve(fx);
  assert.deepEqual(R.contractGate(fx.root, roots(fx)).blockers, []);
});

test('policy required: untraced Breaking drift blocks the WHOLE scope; under the optional policy the Phase 7 behaviour is unchanged', (t) => {
  const fx = fixture(); t.after(() => fx.cleanup());
  approve(fx);
  // Breaking drift on GET /users/{id} (traced) AND on a new required header of an endpoint no case mentions.
  const d = baseDoc();
  d.components.schemas.User.properties.id = { type: 'integer' };
  d.paths['/users/{id}/avatar'] = { get: { responses: { 200: { description: 'png' } } } };
  const base = baseDoc(); base.paths['/users/{id}/avatar'] = { get: { responses: { 200: { description: 'png' } } } };
  // The approved v1 has no avatar endpoint: it is added by a first, Non-breaking acceptance.
  const v0 = R.registerVersion(fx.root, SCOPE, { name: 'users-api', role: 'proposed', source: fx.source('v1b.json', base), by: 'Dev', now: NOW });
  R.acceptVersion(fx.root, SCOPE, { candidate: v0.id, analysisId: R.analyzeContract(fx.root, SCOPE, { candidate: v0.id }).id, by: 'API Owner', reason: 'avatar endpoint', now: NOW });
  d.paths['/users/{id}/avatar'].get.parameters = [{ name: 'size', in: 'query', required: true, schema: { type: 'integer' } }];
  const v2 = R.registerVersion(fx.root, SCOPE, { name: 'users-api', role: 'proposed', source: fx.source('v2.json', d), by: 'Dev', now: NOW });
  const a = R.analyzeContract(fx.root, SCOPE, { candidate: v2.id });
  assert.ok(a.impact.missing.some((m) => m.endpoint === 'GET /users/{}/avatar' && m.serious));
  // Optional (legacy): the partial scope of an unreached case passes, as in Phase 7.
  assert.deepEqual(R.contractGate(fx.root, roots(fx), { scopeItems: ['TC-USR-004'] }).blockers, []);
  // Required: untraced is never "unaffected" — the same partial scope is blocked.
  R.setPolicy(fx.root, SCOPE, { mode: 'required', by: 'QA Lead', reason: 'r', now: NOW });
  const g = R.contractGate(fx.root, roots(fx), { scopeItems: ['TC-USR-004'] });
  assert.equal(g.blockers.length, 1);
  assert.match(g.blockers[0], /avatar reach no traceable test case \(contract validation is required\)/);
});
