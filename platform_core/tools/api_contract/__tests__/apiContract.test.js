// Phase 7 — API contract drift detection & impact analysis: sources, drift rules, impact, governance,
// mock vs real, reporting, and the stage gate.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { parseYaml, YamlError } = require('../yaml');
const { normalizeContract } = require('../normalize');
const { compareContracts, RULES } = require('../diff');
const R = require('../registry');
const { markdown, model, writeReport } = require('../report');
const { renderReport } = require('../../report_builder');
const { NOW, USERS_YAML, baseDoc, CASES, suiteMd, fixture, evidence, getUser } = require('./contractFixture');

const SCOPE = 'modules/users';
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const rules = (a) => a.comparison.items.map((i) => `${i.rule}|${i.field || i.status || i.param || ''}|${i.classification}`);
const approve = (fx) => R.importApproved(fx.root, SCOPE, { name: 'users-api', source: fx.source('users.yaml', USERS_YAML), approvedBy: 'API Owner', reason: 'signed-off spec v1.0.0', now: NOW });
const propose = (fx, doc, file = 'users-v2.json') => R.registerVersion(fx.root, SCOPE, { name: 'users-api', role: 'proposed', source: fx.source(file, doc), by: 'Dev Lead', now: NOW });
const caseIds = (list) => list.map((e) => e.testCase);

// ---------------------------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------------------------

test('YAML reader: the OpenAPI subset is read; anchors, aliases, tags and multiple documents are refused', () => {
  const doc = parseYaml(USERS_YAML);
  assert.equal(doc.openapi, '3.0.3');
  assert.deepEqual(doc.paths['/users/{id}'].get['x-requirements'], ['REQ-12']);
  assert.deepEqual(doc.components.schemas.User.properties.status.enum, ['ACTIVE', 'LOCKED']);
  assert.equal(parseYaml('a: |\n  one\n  two\nb: >-\n  x\n  y\n').a, 'one\ntwo\n');
  assert.equal(parseYaml('b: >-\n  x\n  y\n').b, 'x y');
  assert.deepEqual(parseYaml('list:\n- a\n- b: 1\n  c: [x, "y z"]\n'), { list: ['a', { b: 1, c: ['x', 'y z'] }] });
  for (const bad of ['a: &x 1\nb: *x\n', 'a: !!str 1\n', 'a: 1\n---\nb: 2\n', 'a: 1\na: 2\n', '? complex\n: v\n']) {
    assert.throws(() => parseYaml(bad), YamlError, bad);
  }
});

test('contract sources: OpenAPI YAML/JSON, Swagger 2, Postman and HAR read into one model; secrets are never kept', () => {
  const oa = normalizeContract(USERS_YAML);
  assert.equal(oa.format, 'openapi-3');
  assert.equal(oa.evidence, 'specification');
  assert.equal(oa.basePath, '/v1');
  assert.deepEqual(Object.keys(oa.endpoints).sort(), ['GET /users/{}', 'POST /users']);
  assert.deepEqual(oa.endpoints['GET /users/{}'].auth, { required: true, alternatives: ['http:bearer'], schemes: ['http:bearer'], scopes: [] });
  assert.equal(oa.endpoints['POST /users'].auth.required, false);
  assert.deepEqual(oa.endpoints['GET /users/{}'].responses['200'].body, { $ref: 'User' }, 'a named schema stays named (model api-contract/2)');
  assert.deepEqual(oa.components.User.required, ['id', 'name', 'status']);
  assert.deepEqual(oa.endpoints['GET /users/{}'].requirements, ['REQ-12']);
  // The same document as JSON normalizes identically.
  assert.deepEqual(normalizeContract(JSON.stringify(baseDoc())), oa);

  const sw = normalizeContract(JSON.stringify({
    swagger: '2.0', info: { title: 's', version: '1' }, basePath: '/v1',
    paths: { '/users/{id}': { get: { parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }], responses: { 200: { schema: { $ref: '#/definitions/U' } } } } } },
    definitions: { U: { type: 'object', required: ['id'], properties: { id: { type: 'string' }, age: { type: 'integer', 'x-nullable': true } } } },
  }));
  assert.equal(sw.format, 'swagger-2');
  assert.equal(sw.endpoints['GET /users/{}'].responses['200'].body.$ref, 'U');
  assert.equal(sw.components.U.properties.age.nullable, true);

  const pm = normalizeContract(JSON.stringify({
    info: { name: 'Users', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
    auth: { type: 'bearer', bearer: [{ key: 'token', value: 'SECRET-TOKEN-123' }] },
    item: [{ name: 'Get user', request: { method: 'GET', header: [{ key: 'x-api-key', value: 'live-key-999' }], url: { raw: '{{baseUrl}}/users/:id', path: ['users', ':id'] } },
      response: [{ code: 200, body: '{"id":"1","name":"A","status":"ACTIVE"}' }] }],
  }));
  assert.equal(pm.format, 'postman-2');
  assert.equal(pm.evidence, 'example');
  assert.ok(pm.endpoints['GET /users/{}']);
  assert.equal(pm.endpoints['GET /users/{}'].auth.required, true);
  assert.ok(!JSON.stringify(pm).includes('SECRET-TOKEN-123') && !JSON.stringify(pm).includes('live-key-999'), 'credential values are never kept');

  const har = normalizeContract(JSON.stringify({ log: { entries: [{ request: { method: 'GET', url: 'https://x/v1/users/7', headers: [{ name: 'Authorization', value: 'Bearer zzz' }] }, response: { status: 200, headers: [], content: { text: '{"id":"7","status":"ACTIVE","email":"someone@example.com"}' } } }] } }));
  assert.equal(har.format, 'har');
  assert.equal(har.evidence, 'observed');
  const kept = JSON.stringify(har);
  assert.ok(!kept.includes('zzz'), 'auth header values are never kept');
  assert.throws(() => normalizeContract('{"hello": 1}'), /not a recognised contract source/);
  assert.throws(() => normalizeContract('a: &anchor 1'), /cannot be read as YAML/);
});

// ---------------------------------------------------------------------------------------------
// Drift rules (the validation list)
// ---------------------------------------------------------------------------------------------

test('drift: added optional field → Non-breaking; removed required field → Breaking; changed type → Breaking', () => {
  const base = normalizeContract(USERS_YAML);
  const d1 = baseDoc(); d1.components.schemas.User.properties.email = { type: 'string' };
  const a1 = compareContracts(base, normalizeContract(JSON.stringify(d1)));
  assert.equal(a1.classification, 'Non-breaking');
  assert.ok(a1.items.every((i) => i.rule === 'SC-FIELD-ADDED-OPTIONAL'));

  const d2 = baseDoc(); delete d2.components.schemas.User.properties.status; d2.components.schemas.User.required = ['id', 'name'];
  const a2 = compareContracts(base, normalizeContract(JSON.stringify(d2)));
  assert.equal(a2.classification, 'Breaking');
  assert.ok(a2.items.some((i) => i.rule === 'SC-FIELD-REMOVED-REQUIRED' && i.field === '$.status' && i.endpoint === 'GET /users/{}' && i.classification === 'Breaking'));

  const d3 = baseDoc(); d3.components.schemas.User.properties.id = { type: 'integer' };
  const a3 = compareContracts(base, normalizeContract(JSON.stringify(d3)));
  assert.ok(a3.items.some((i) => i.rule === 'SC-TYPE-CHANGED' && i.field === '$.id' && i.before === 'string' && i.after === 'integer' && i.classification === 'Breaking'));
  // Direction matters: a new required field in a REQUEST breaks callers; in a RESPONSE it does not.
  const d4 = baseDoc();
  d4.paths['/users'].post.requestBody.content['application/json'].schema.required = ['name', 'role'];
  d4.components.schemas.User.properties.created = { type: 'string' }; d4.components.schemas.User.required.push('created');
  const a4 = compareContracts(base, normalizeContract(JSON.stringify(d4)));
  assert.ok(a4.items.some((i) => i.rule === 'SC-BECAME-REQUIRED' && i.direction === 'request' && i.classification === 'Breaking'));
  assert.ok(a4.items.some((i) => i.rule === 'SC-FIELD-ADDED-REQUIRED' && i.direction === 'response' && i.classification === 'Non-breaking'));
});

test('drift: changed enum, status code, authentication, nullability, constraints and error structure', () => {
  const base = normalizeContract(USERS_YAML);
  const d = baseDoc();
  d.components.schemas.User.properties.status.enum = ['ACTIVE', 'SUSPENDED'];
  d.paths['/users'].post.responses = { 200: d.paths['/users'].post.responses['201'], 400: d.paths['/users'].post.responses['400'] };
  d.paths['/users'].post.security = [{ bearerAuth: [] }];
  d.components.schemas.User.properties.name.nullable = true;
  d.paths['/users'].post.requestBody.content['application/json'].schema.properties.name.maxLength = 40;
  d.components.schemas.Error.properties.code = { type: 'integer' };
  const a = compareContracts(base, normalizeContract(JSON.stringify(d)));
  const has = (rule, cls, pred = () => true) => assert.ok(a.items.some((i) => i.rule === rule && i.classification === cls && pred(i)), `${rule} ${cls}: ${JSON.stringify(a.items.map((i) => [i.rule, i.classification, i.field, i.status]))}`);
  has('SC-ENUM-VALUE-REMOVED', 'Potentially breaking', (i) => i.value === 'LOCKED');
  has('SC-ENUM-VALUE-ADDED', 'Potentially breaking', (i) => i.value === 'SUSPENDED');
  has('ST-SUCCESS-REMOVED', 'Breaking', (i) => i.status === '201' && i.endpoint === 'POST /users');
  has('ST-SUCCESS-ADDED', 'Potentially breaking', (i) => i.status === '200');
  has('AUTH-ADDED', 'Breaking', (i) => i.endpoint === 'POST /users');
  has('SC-NULLABLE-ADDED', 'Breaking', (i) => i.field === '$.name' && i.direction === 'response');
  has('SC-CONSTRAINT-TIGHTENED', 'Breaking', (i) => i.direction === 'request' && /maxLength 80/.test(i.before));
  // Error is one named schema used by two error responses: ONE item, reaching both.
  has('SC-TYPE-CHANGED', 'Breaking', (i) => i.category === 'error-structure' && i.field === '$.code' && i.endpoints && i.endpoints.length === 2 && i.places.some((p) => / 404 /.test(p)) && i.places.some((p) => / 400 /.test(p)));
  // Unresolvable schemas and changed alternatives are Unknown — never assumed compatible.
  const u = baseDoc(); u.components.schemas.User.properties.address = { $ref: 'external.yaml#/Address' };
  const v = baseDoc(); v.components.schemas.User.properties.address = { $ref: 'external.yaml#/Address2' };
  const au = compareContracts(normalizeContract(JSON.stringify(u)), normalizeContract(JSON.stringify(v)));
  assert.ok(au.items.some((i) => i.rule === 'SC-EXTERNAL-REF' && i.classification === 'Unknown'));
  assert.equal(au.classification, 'Unknown');
  for (const id of Object.keys(RULES)) assert.ok(RULES[id].text && (RULES[id].any || RULES[id].request), id);
});

test('unchanged contract: the same contract in another format is Unchanged — no drift, no blocker, nothing to accept', (t) => {
  const fx = fixture(); t.after(() => fx.cleanup());
  approve(fx);
  const v = propose(fx, baseDoc(), 'users-same.json'); // JSON instead of YAML: a different source, the same contract
  const a = R.analyzeContract(fx.root, SCOPE, { candidate: v.id });
  assert.equal(a.comparison.unchanged, true);
  assert.equal(a.comparison.classification, 'Unchanged');
  assert.notEqual(a.base.sourceSha256, a.candidate.sourceSha256, 'different source bytes');
  assert.equal(a.base.normalizedSha256, a.candidate.normalizedSha256, 'the same normalized contract');
  assert.deepEqual(R.scopeStatus(fx.root, SCOPE).blockers, []);
  assert.throws(() => R.acceptVersion(fx.root, SCOPE, { candidate: v.id, analysisId: a.id, by: 'API Owner', reason: 'r', now: NOW }), /UNCHANGED|nothing to accept/);
  assert.equal(R.rejectVersion(fx.root, SCOPE, { candidate: v.id, by: 'API Owner', reason: 'identical', now: NOW }).version.status, 'rejected');
});

// ---------------------------------------------------------------------------------------------
// Impact
// ---------------------------------------------------------------------------------------------

test('impact: a removed required field is CONFIRMED for the assertions that cite it, potential for mentions, missing for untraced endpoints', (t) => {
  const fx = fixture(); t.after(() => fx.cleanup());
  approve(fx);
  const d = baseDoc(); delete d.components.schemas.User.properties.status; d.components.schemas.User.required = ['id', 'name'];
  d.paths['/users/{id}'].delete = { responses: { 204: { description: 'gone' } } }; // added: Non-breaking, not "impact"
  d.paths['/users'].get = { responses: { 200: { description: 'list' } } };
  const v = propose(fx, d);
  const a = R.analyzeContract(fx.root, SCOPE, { candidate: v.id });
  assert.equal(a.comparison.classification, 'Breaking');
  const c1 = a.impact.confirmed.find((e) => e.testCase === 'TC-USR-001');
  assert.ok(c1, JSON.stringify(a.impact));
  assert.deepEqual([...new Set(c1.assertions.map((x) => x.assertionId))], ['A1'], 'A1 cites $.status; A2 (the response code) is not reached by a field change');
  assert.ok(caseIds(a.impact.confirmed).includes('TC-USR-005'), 'TC-USR-005 asserts $.status too');
  assert.ok(caseIds(a.impact.potential).includes('TC-USR-003'), 'TC-USR-003 only mentions the endpoint');
  assert.ok(!caseIds([...a.impact.confirmed, ...a.impact.potential]).includes('TC-USR-004'), 'an unrelated case is not reached');
  assert.ok(caseIds(a.impact.potential).includes('TC-USR-002'), 'POST /users returns the same User schema: reached, but its assertion checks the code, not the field');
  assert.deepEqual(a.impact.requirements.map((r) => r.id), ['REQ-12'], 'the contract declares REQ-12 for the endpoint');
  assert.equal(a.impact.missing.length, 0, 'every Breaking endpoint is traced');
  // Status-code change: confirmed through the assertion that checks the code.
  const s = baseDoc(); s.paths['/users'].post.responses = { 200: s.paths['/users'].post.responses['201'] };
  fx.source('users-v3.json', s);
  const v3 = R.registerVersion(fx.root, SCOPE, { name: 'users-api', role: 'proposed', source: path.join(fx.src, 'users-v3.json'), by: 'Dev Lead', now: NOW });
  const a3 = R.analyzeContract(fx.root, SCOPE, { candidate: v3.id });
  const c2 = a3.impact.confirmed.find((e) => e.testCase === 'TC-USR-002');
  assert.ok(c2 && c2.assertions.some((x) => /status 201/.test(x.why)), JSON.stringify(a3.impact));
  // An endpoint no case mentions is missing traceability, never "no impact".
  const m = baseDoc(); m.paths['/admin/audit'] = { get: { responses: { 200: { description: 'x' } } } };
  R.rejectVersion(fx.root, SCOPE, { candidate: v.id, by: 'API Owner', reason: 'superseded by the next proposal', now: NOW });
  R.rejectVersion(fx.root, SCOPE, { candidate: v3.id, by: 'API Owner', reason: 'r', now: NOW });
  R.acceptVersion(fx.root, SCOPE, { candidate: propose(fx, m, 'users-audit.json').id, analysisId: R.analyzeContract(fx.root, SCOPE, { candidate: 'CV-4' }).id, by: 'API Owner', reason: 'audit endpoint added', now: NOW });
  const gone = baseDoc(); gone.paths['/admin/audit'] = { get: { responses: { 200: { description: 'x' } } } }; delete gone.paths['/admin/audit'];
  const v5 = propose(fx, gone, 'users-noaudit.json');
  const a5 = R.analyzeContract(fx.root, SCOPE, { candidate: v5.id });
  assert.ok(a5.comparison.items.some((i) => i.rule === 'EP-REMOVED' && i.endpoint === 'GET /admin/audit'));
  assert.deepEqual(a5.impact.missing.map((x) => x.endpoint), ['GET /admin/audit']);
});

// ---------------------------------------------------------------------------------------------
// Governance
// ---------------------------------------------------------------------------------------------

test('governance: approval only by a named decision; observed traffic is never a contract; accepting never edits a test case', (t) => {
  const fx = fixture(); t.after(() => fx.cleanup());
  assert.throws(() => R.registerVersion(fx.root, SCOPE, { name: 'users-api', role: 'approved', source: fx.source('a.yaml', USERS_YAML), by: 'x', now: NOW }), /named human decision/);
  assert.throws(() => R.importApproved(fx.root, SCOPE, { name: 'users-api', source: fx.source('a.yaml', USERS_YAML), approvedBy: '', reason: 'r', now: NOW }), /approved-by/);
  const traffic = fx.source('traffic.json', evidence([getUser({ id: '42', name: 'A', status: 'ACTIVE' })]));
  assert.throws(() => R.registerVersion(fx.root, SCOPE, { name: 'users-api', role: 'proposed', source: traffic, by: 'x', now: NOW }), /OBSERVED|observed behaviour/);
  assert.throws(() => R.importApproved(fx.root, SCOPE, { name: 'users-api', source: traffic, approvedBy: 'x', reason: 'r', now: NOW }), /never an approved contract/);
  assert.throws(() => R.registerVersion(fx.root, 'modules/nope', { name: 'users-api', role: 'proposed', source: traffic, by: 'x', now: NOW }), /Module Manager/);
  approve(fx);
  assert.throws(() => approve(fx), /APPROVED_EXISTS|already has an approved version/);

  const suite = path.join(fx.root, 'modules/users/test_design/TestCases_users.md');
  const before = sha(suite);
  const d = baseDoc(); delete d.components.schemas.User.properties.status; d.components.schemas.User.required = ['id', 'name'];
  const v = propose(fx, d);
  const a = R.analyzeContract(fx.root, SCOPE, { candidate: v.id });
  // A decision on a stale analysis is refused: the test cases it reaches changed since.
  fx.put('modules/users/test_design/TestCases_users.md', suiteMd(CASES.map((c) => (c.id === 'TC-USR-003' ? { ...c, steps: '1. Open the user page.' } : c))));
  assert.throws(() => R.acceptVersion(fx.root, SCOPE, { candidate: v.id, analysisId: a.id, by: 'API Owner', reason: 'r', now: NOW }), /STALE|stale/);
  fx.put('modules/users/test_design/TestCases_users.md', suiteMd());
  assert.throws(() => R.acceptVersion(fx.root, SCOPE, { candidate: v.id, analysisId: a.id, by: '', reason: 'r', now: NOW }), /--by is required/);
  const r = R.acceptVersion(fx.root, SCOPE, { candidate: v.id, analysisId: a.id, by: 'API Owner', reason: 'status moved to /users/{id}/state', now: NOW });
  assert.equal(sha(suite), before, 'the approved suite is byte-identical — Expected Results and Assertion IDs untouched');
  assert.deepEqual(r.pendingImpact.map((e) => e.testCase).sort(), ['TC-USR-001', 'TC-USR-002', 'TC-USR-003', 'TC-USR-005']);
  const reg = R.readRegistry(R.resolveScope(fx.root, SCOPE));
  assert.equal(reg.versions.find((x) => x.id === 'CV-1').status, 'superseded');
  assert.equal(reg.versions.find((x) => x.id === r.version.id).approval.by, 'API Owner');

  // Each reached case needs its own named decision; the gate blocks until then.
  const blocked = () => R.scopeStatus(fx.root, SCOPE).blockers.filter((b) => b.kind === 'impact-undecided').map((b) => b.affected[0]);
  assert.deepEqual(blocked().sort(), ['users|TC-USR-001', 'users|TC-USR-002', 'users|TC-USR-003', 'users|TC-USR-005']);
  assert.throws(() => R.decideImpact(fx.root, SCOPE, { acceptance: r.decision, item: 'TC-USR-001', decision: 'updated', by: 'QA Lead', reason: 'r', now: NOW }), /CASE_NOT_UPDATED|unchanged since/);
  R.decideImpact(fx.root, SCOPE, { acceptance: r.decision, item: 'TC-USR-003', decision: 'no-change-needed', by: 'QA Lead', reason: 'reads the name only', now: NOW });
  R.decideImpact(fx.root, SCOPE, { acceptance: r.decision, item: 'TC-USR-002', decision: 'no-change-needed', by: 'QA Lead', reason: 'checks the response code only', now: NOW });
  R.decideImpact(fx.root, SCOPE, { acceptance: r.decision, item: 'TC-USR-001', decision: 'update-required', by: 'QA Lead', reason: 'A1 must read the new state endpoint', now: NOW });
  assert.deepEqual(blocked().sort(), ['users|TC-USR-001', 'users|TC-USR-005'], 'update-required keeps the case blocked');
  // The update happens at Stage 3 (a human edits and re-approves); only then can "updated" be recorded.
  fx.put('modules/users/test_design/TestCases_users.md', suiteMd(CASES.map((c) => (c.id === 'TC-USR-001' ? { ...c, design: [['A1', '`ACTIVE`', 'API contract GET /users/{id}/state 200 $.state', 'equals', 'REQ-12'], c.design[1]] } : c))));
  R.decideImpact(fx.root, SCOPE, { acceptance: r.decision, item: 'TC-USR-001', decision: 'updated', by: 'QA Lead', reason: 'A1 rewritten at Stage 3 and re-approved', now: NOW });
  R.decideImpact(fx.root, SCOPE, { acceptance: r.decision, item: 'TC-USR-005', decision: 'retire', by: 'QA Lead', reason: 'locked users are covered by the state endpoint', now: NOW });
  assert.deepEqual(blocked(), []);
  const dec = R.readRegistry(R.resolveScope(fx.root, SCOPE)).decisions.find((x) => x.id === r.decision);
  assert.equal(dec.impactDecisions.length, 5, 'the decision history keeps every step, including update-required');
});

test('partial approval scope: accept one endpoint of a proposal; the rest stays pending; a partial stage scope is not blocked by unrelated drift', (t) => {
  const fx = fixture(); t.after(() => fx.cleanup());
  approve(fx);
  const d = baseDoc();
  d.paths['/users'].post.responses = { 200: d.paths['/users'].post.responses['201'] }; // POST: Breaking
  delete d.components.schemas.User.properties.status; d.components.schemas.User.required = ['id', 'name']; // GET (and POST body): Breaking
  const v = propose(fx, d);
  const a = R.analyzeContract(fx.root, SCOPE, { candidate: v.id });
  const roots = [{ label: 'users', dir: path.join(fx.root, 'modules', 'users'), module: 'users' }];
  assert.ok(R.contractGate(fx.root, roots).blockers.length, 'the whole scope is blocked by pending Breaking drift');
  assert.deepEqual(R.contractGate(fx.root, roots, { scopeItems: ['TC-USR-004'] }).blockers, [], 'a partial scope of an unreached case is not blocked');
  assert.ok(R.contractGate(fx.root, roots, { scopeItems: ['TC-USR-001'] }).blockers.length, 'a reached case stays blocked');
  assert.throws(() => R.acceptVersion(fx.root, SCOPE, { candidate: v.id, analysisId: a.id, by: 'API Owner', reason: 'r', endpoints: ['DELETE /users/{id}'], now: NOW }), /not changed/);
  const r = R.acceptVersion(fx.root, SCOPE, { candidate: v.id, analysisId: a.id, by: 'API Owner', reason: 'GET change agreed; POST still under discussion', endpoints: ['GET /users/{id}'], now: NOW });
  assert.equal(r.partial, true);
  const reg = R.readRegistry(R.resolveScope(fx.root, SCOPE));
  assert.equal(reg.versions.find((x) => x.id === v.id).status, 'partially-accepted');
  const approved = R.loadModel(fx.root, reg.versions.find((x) => x.id === r.version.id));
  // The accepted endpoint takes the proposal's User under its own namespace; POST keeps the approved User.
  const getBody = approved.endpoints['GET /users/{}'].responses['200'].body;
  assert.equal(getBody.$ref, `~${v.id}~User`);
  assert.ok(!approved.components[getBody.$ref].properties.status, 'GET now follows the proposal');
  assert.ok(approved.endpoints['POST /users'].responses['201'], 'POST keeps the approved behaviour');
  assert.equal(approved.endpoints['POST /users'].responses['201'].body.$ref, 'User');
  assert.ok(approved.components.User.properties.status, 'the shared User the unaccepted endpoint uses is unchanged');
  const rest = R.analyzeContract(fx.root, SCOPE, { candidate: v.id });
  assert.deepEqual([...new Set(rest.comparison.items.map((i) => i.endpoint))], ['POST /users'], 'only the unaccepted endpoint still differs');
  assert.equal(rest.base.id, r.version.id);
});

// ---------------------------------------------------------------------------------------------
// Missing / contradictory contracts, history
// ---------------------------------------------------------------------------------------------

test('missing or contradictory contracts: no approved contract is Unknown; two approved sources that disagree block until decided', (t) => {
  const fx = fixture(); t.after(() => fx.cleanup());
  const obs = R.registerVersion(fx.root, SCOPE, { name: 'users-api', role: 'observed', environment: 'mock', source: fx.source('mock.json', evidence([getUser({ id: '1', name: 'A', status: 'ACTIVE' })])), by: 'QA', now: NOW });
  const a = R.analyzeContract(fx.root, SCOPE, { candidate: obs.id });
  assert.equal(a.comparison.classification, 'Unknown');
  assert.equal(a.comparison.items[0].rule, 'SRC-MISSING');
  const first = propose(fx, baseDoc(), 'first.json');
  const af = R.analyzeContract(fx.root, SCOPE, { candidate: first.id });
  assert.ok(af.comparison.items.every((i) => i.rule === 'EP-ADDED'), 'a first proposal: every endpoint is new');
  assert.equal(af.base, null);
  R.acceptVersion(fx.root, SCOPE, { candidate: first.id, analysisId: af.id, by: 'API Owner', reason: 'first approval', now: NOW });
  // A Postman collection approved for the same scope disagrees with the OpenAPI contract.
  const pm = { info: { name: 'Users', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' }, item: [{ name: 'Get', request: { method: 'GET', url: { raw: '{{baseUrl}}/users/:id', path: ['users', ':id'] }, header: [{ key: 'Authorization', value: 'Bearer {{t}}' }] }, response: [{ code: 200, body: '{"id": 42, "name": "A", "status": "ACTIVE"}' }] }] };
  R.importApproved(fx.root, SCOPE, { name: 'users-collection', source: fx.source('users.postman.json', pm), approvedBy: 'QA Lead', reason: 'team collection', now: NOW });
  const st = R.scopeStatus(fx.root, SCOPE);
  const cx = st.blockers.find((b) => b.kind === 'contradiction');
  assert.ok(cx, JSON.stringify(st));
  const found = R.findContradictions(fx.root, R.resolveScope(fx.root, SCOPE), R.readRegistry(R.resolveScope(fx.root, SCOPE)));
  assert.ok(found[0].items.some((i) => i.rule === 'SC-TYPE-CHANGED' && i.field === '$.id'), 'the collection returns id as a number');
  R.decideContradiction(fx.root, SCOPE, { id: found[0].id, decision: 'OpenAPI governs; the collection example is fixed', by: 'API Owner', now: NOW });
  assert.equal(R.scopeStatus(fx.root, SCOPE).blockers.filter((b) => b.kind === 'contradiction').length, 0);
});

test('history: every version and decision is preserved with its fingerprints; old versions stay comparable; a tampered snapshot is refused', (t) => {
  const fx = fixture(); t.after(() => fx.cleanup());
  const first = approve(fx).version;
  const d = baseDoc(); d.components.schemas.User.properties.email = { type: 'string' };
  const v = propose(fx, d);
  const r = R.acceptVersion(fx.root, SCOPE, { candidate: v.id, analysisId: R.analyzeContract(fx.root, SCOPE, { candidate: v.id }).id, by: 'API Owner', reason: 'email added', now: NOW });
  const scope = R.resolveScope(fx.root, SCOPE);
  const reg = R.readRegistry(scope);
  const old = reg.versions.find((x) => x.id === first.id);
  assert.equal(old.status, 'superseded');
  assert.equal(old.supersededBy, r.version.id);
  assert.ok(fs.existsSync(path.join(fx.root, old.snapshot)), 'the superseded version\'s content is kept');
  assert.match(old.sourceSha256, /^[0-9a-f]{64}$/);
  assert.match(old.normalizedSha256, /^[0-9a-f]{64}$/);
  // The historical comparison is reproducible from the kept versions.
  const h = R.analyzeContract(fx.root, SCOPE, { base: first.id, candidate: r.version.id });
  assert.deepEqual(rules(h), ['SC-FIELD-ADDED-OPTIONAL|$.email|Non-breaking'], 'one change to the shared User — one item');
  assert.deepEqual(h.comparison.items[0].endpoints, ['GET /users/{}', 'POST /users']);
  assert.deepEqual(reg.decisions.map((x) => x.kind), ['import-approved', 'accept']);
  assert.ok(reg.events.length >= 3);
  // The source file changing afterwards changes nothing recorded.
  fs.writeFileSync(path.join(fx.src, 'users.yaml'), 'openapi: 3.0.3\ninfo: {title: changed, version: "9"}\npaths: {}\n');
  assert.equal(R.loadModel(fx.root, old).apiVersion, '1.0.0');
  fs.writeFileSync(path.join(fx.root, old.snapshot), '{"model":"api-contract/1","endpoints":{}}');
  assert.throws(() => R.loadModel(fx.root, old), /SNAPSHOT|no longer matches/);
});

// ---------------------------------------------------------------------------------------------
// Mock vs real
// ---------------------------------------------------------------------------------------------

test('mock vs real: kept apart; a passing mock never validates the real service; real violations block until reviewed', (t) => {
  const fx = fixture(); t.after(() => fx.cleanup());
  approve(fx);
  const run = 'users-run-001';
  fx.put(`runs/${run}/metadata/run.json`, JSON.stringify({ stateSchemaVersion: 1, modules: ['users'], environment: 'QA' }));
  const mock = R.registerVersion(fx.root, SCOPE, { name: 'users-api', role: 'observed', environment: 'mock', source: fx.source('mock.json', evidence([getUser({ id: '1', name: 'A', status: 'ACTIVE' }), { method: 'POST', url: 'https://users.example.test/v1/users', status: 201, requestBody: { name: 'A' }, responseBody: { id: '2', name: 'A', status: 'ACTIVE' } }])), by: 'QA', now: NOW });
  assert.equal(R.analyzeContract(fx.root, SCOPE, { candidate: mock.id }).comparison.classification, 'Unchanged', 'the mock conforms');
  let m = R.analyzeContract(fx.root, SCOPE, { candidate: mock.id }).evidence.rows;
  assert.ok(m.every((r) => r.realValidated === false), 'conformance of a mock is never real validation');
  assert.match(m.find((r) => r.endpoint === 'GET /users/{}').note, /mock only/);

  // Real evidence must sit in the run that captured it, on a consistent environment.
  const outside = fx.source('real.json', evidence([getUser({ id: '42', name: 'B', status: 'DELETED' })]));
  assert.throws(() => R.registerVersion(fx.root, SCOPE, { name: 'users-api', role: 'observed', environment: 'real', run, declared: 'QA', source: outside, by: 'QA', now: NOW }), /inside the run/);
  assert.throws(() => R.registerVersion(fx.root, SCOPE, { name: 'users-api', role: 'observed', source: outside, by: 'QA', now: NOW }), /mock\|real/);
  const inRun = fx.put(`runs/${run}/execution/artifacts/api_capture.json`, JSON.stringify(evidence([getUser({ id: '42', name: 'B', status: 'DELETED' }), getUser({ id: '43', name: 'C', status: 'ACTIVE' }, { auth: false })])));
  assert.throws(() => R.registerVersion(fx.root, SCOPE, { name: 'users-api', role: 'observed', environment: 'real', run, declared: 'Production', source: inRun, by: 'QA', now: NOW }), /ENVIRONMENT_INCONSISTENT|disagrees/);
  const real = R.registerVersion(fx.root, SCOPE, { name: 'users-api', role: 'observed', environment: 'real', run, declared: 'QA', source: inRun, by: 'QA', now: NOW });
  assert.equal(real.environment.check.status, 'verified');
  const ar = R.analyzeContract(fx.root, SCOPE, { candidate: real.id });
  assert.ok(ar.comparison.items.some((i) => i.rule === 'SC-ENUM-VIOLATION' && i.value === 'DELETED' && i.classification === 'Breaking'));
  assert.ok(ar.comparison.items.some((i) => i.rule === 'AUTH-REMOVED' && i.classification === 'Breaking'), 'an unauthenticated call succeeded');
  assert.ok(ar.comparison.notes.some((n) => /POST \/users/.test(n)), 'an unexercised endpoint is noted, not judged');
  m = ar.evidence.rows.find((r) => r.endpoint === 'GET /users/{}');
  assert.equal(m.disagreement, true, 'the mock conforms where the real service does not');
  assert.equal(m.realValidated, false);
  assert.ok(!JSON.stringify(R.loadModel(fx.root, real)).includes('abc.def.ghi-secret'), 'the captured credential is not kept');
  // The observation never changes the approved contract.
  const approvedNow = R.activeApproved(R.readRegistry(R.resolveScope(fx.root, SCOPE)), 'users-api');
  assert.equal(approvedNow.id, 'CV-1');
  const st = R.scopeStatus(fx.root, SCOPE);
  assert.ok(st.blockers.some((b) => b.kind === 'real-contract-violation'), 'unreviewed real violations block');
  assert.ok(!st.blockers.some((b) => b.version === mock.id));
  assert.throws(() => R.reviewObserved(fx.root, SCOPE, { observed: real.id, analysisId: ar.id, decision: 'conforms', by: 'QA Lead', reason: 'r', now: NOW }), /cannot be recorded/);
  R.reviewObserved(fx.root, SCOPE, { observed: real.id, analysisId: ar.id, decision: 'application-defect', by: 'QA Lead', reason: 'DELETED is not a valid status; auth not enforced — raised as defects', now: NOW });
  assert.equal(R.scopeStatus(fx.root, SCOPE).blockers.length, 0);
  assert.equal(R.activeApproved(R.readRegistry(R.resolveScope(fx.root, SCOPE)), 'users-api').id, 'CV-1', 'still the approved contract');
});

test('mock vs real: state-changing real evidence against Production is refused', (t) => {
  const fx = fixture({ environment: 'Production' }); t.after(() => fx.cleanup());
  approve(fx);
  const run = 'users-run-002';
  fx.put(`runs/${run}/metadata/run.json`, JSON.stringify({ stateSchemaVersion: 1, modules: ['users'], environment: 'Production' }));
  const write = fx.put(`runs/${run}/execution/artifacts/prod.json`, JSON.stringify(evidence([{ method: 'POST', url: 'https://users.example.test/v1/users', status: 201, responseBody: { id: '1', name: 'x', status: 'ACTIVE' } }])));
  assert.throws(() => R.registerVersion(fx.root, SCOPE, { name: 'users-api', role: 'observed', environment: 'real', run, declared: 'Production', source: write, by: 'QA', now: NOW }), /PRODUCTION_WRITE_EVIDENCE|Production/);
  const read = fx.put(`runs/${run}/execution/artifacts/prod-read.json`, JSON.stringify(evidence([getUser({ id: '1', name: 'x', status: 'ACTIVE' })])));
  const v = R.registerVersion(fx.root, SCOPE, { name: 'users-api', role: 'observed', environment: 'real', run, declared: 'Production', source: read, by: 'QA', now: NOW });
  assert.equal(v.environment.check.restricted, true);
});

// ---------------------------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------------------------

test('supplier-specific differences: one Supplier differs from its Feature; drift in one Supplier never blocks another', (t) => {
  const fx = fixture(); t.after(() => fx.cleanup());
  for (const s of ['sup-a', 'sup-b']) fs.mkdirSync(path.join(fx.root, 'supplier-features', 'pnr', 'suppliers', s, 'test_design'), { recursive: true });
  const F = 'supplier-features/pnr';
  R.importApproved(fx.root, F, { name: 'pnr-api', source: fx.source('pnr.yaml', USERS_YAML), approvedBy: 'API Owner', reason: 'Feature contract', now: NOW });
  const noNick = baseDoc(); delete noNick.components.schemas.User.properties.nickname; noNick.components.schemas.User.properties.status.enum = ['ACTIVE'];
  R.importApproved(fx.root, `${F}/suppliers/sup-a`, { name: 'pnr-api', source: fx.source('pnr-a.json', noNick), approvedBy: 'API Owner', reason: 'sup-a contract', now: NOW });
  R.importApproved(fx.root, `${F}/suppliers/sup-b`, { name: 'pnr-api', source: fx.source('pnr-b.yaml', USERS_YAML), approvedBy: 'API Owner', reason: 'sup-b contract', now: NOW });
  const a = R.supplierDifferences(fx.root, `${F}/suppliers/sup-a`, 'pnr-api');
  assert.equal(a.comparison.mode, 'supplier');
  assert.ok(a.comparison.items.some((i) => i.rule === 'SC-FIELD-REMOVED-OPTIONAL' && i.field === '$.nickname' && i.supplier === 'sup-a'));
  assert.ok(a.comparison.items.some((i) => i.rule === 'SC-ENUM-VALUE-REMOVED' && i.value === 'LOCKED'));
  assert.equal(R.supplierDifferences(fx.root, `${F}/suppliers/sup-b`, 'pnr-api').comparison.unchanged, true);
  // A Breaking proposal for sup-a blocks sup-a's roots only.
  const d = baseDoc(); d.components.schemas.User.properties.id = { type: 'integer' };
  R.registerVersion(fx.root, `${F}/suppliers/sup-a`, { name: 'pnr-api', role: 'proposed', source: fx.source('pnr-a2.json', d), by: 'Dev', now: NOW });
  const root = (s) => [{ label: `pnr/${s}`, dir: path.join(fx.root, 'supplier-features', 'pnr', 'suppliers', s), module: null }];
  assert.ok(R.contractGate(fx.root, root('sup-a')).blockers.length);
  assert.deepEqual(R.contractGate(fx.root, root('sup-b')).blockers, []);
  // A Feature-level change reaches every Supplier, and is accepted only by naming each one.
  const fv = R.registerVersion(fx.root, F, { name: 'pnr-api', role: 'proposed', source: fx.source('pnr-f2.json', d), by: 'Dev', now: NOW });
  const fa = R.analyzeContract(fx.root, F, { candidate: fv.id });
  assert.deepEqual(fa.impact.suppliers, ['sup-a', 'sup-b']);
  assert.throws(() => R.acceptVersion(fx.root, F, { candidate: fv.id, analysisId: fa.id, by: 'API Owner', reason: 'r', approvedSuppliers: ['sup-a'], now: NOW }), /SUPPLIER_APPROVAL_REQUIRED|each one/);
  R.acceptVersion(fx.root, F, { candidate: fv.id, analysisId: fa.id, by: 'API Owner', reason: 'agreed with both', approvedSuppliers: ['sup-a', 'sup-b'], now: NOW });
});

// ---------------------------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------------------------

test('reporting: versions, classification, impacted fields, cases and assertions, mock vs real, missing coverage, decisions, next actions — no test results', (t) => {
  const fx = fixture(); t.after(() => fx.cleanup());
  approve(fx);
  R.registerVersion(fx.root, SCOPE, { name: 'users-api', role: 'observed', environment: 'mock', source: fx.source('mock.json', evidence([getUser({ id: '1', name: 'A', status: 'ACTIVE' })])), by: 'QA', now: NOW });
  const d = baseDoc(); delete d.components.schemas.User.properties.status; d.components.schemas.User.required = ['id', 'name'];
  d.paths['/reports'] = { get: { responses: { 200: { description: 'x' } } } };
  const v = propose(fx, d);
  const a = R.analyzeContract(fx.root, SCOPE, { candidate: v.id });
  const md = markdown(a);
  for (const h of ['## 1. Contract versions compared', '## 2. Drift classification', '## 3. Impacted endpoints and fields', '## 4. Affected test cases and assertions', '## 5. Mock vs real evidence', '## 6. Missing coverage', '## 7. Human decisions required', '## 8. Recommended next actions']) assert.ok(md.includes(h), h);
  assert.match(md, /SC-FIELD-REMOVED-REQUIRED/);
  assert.match(md, /TC-USR-001 \| Approved/);
  assert.match(md, /A1 confirmed \(checks status\)/);
  assert.match(md, /mock only — not validated against the real service/);
  assert.match(md, new RegExp(a.base.normalizedSha256.slice(0, 16)));
  assert.match(md, /contract-acceptance/);
  const m = model(a);
  assert.equal(m.summary, null, 'no pass/fail summary — nothing was executed');
  assert.equal(m.testCases, undefined);
  const html = renderReport(m);
  assert.match(html, /API Contract Drift/);
  const files = writeReport(fx.root, R.resolveScope(fx.root, SCOPE), a, { now: NOW });
  assert.ok(fs.existsSync(files.md) && fs.existsSync(files.html) && fs.existsSync(files.json));
  const again = writeReport(fx.root, R.resolveScope(fx.root, SCOPE), a, { now: NOW });
  assert.notEqual(again.md, files.md, 'an existing report is never overwritten');
});

test('CLI: register → analyze (exit 2 on Breaking) → accept → status, with --data-root', (t) => {
  const { spawnSync } = require('child_process'); // eslint-disable-line global-require
  const fx = fixture(); t.after(() => fx.cleanup());
  const CLI = path.join(__dirname, '..', 'cli.js');
  const run = (...args) => { const r = spawnSync(process.execPath, [CLI, ...args, '--data-root', fx.root], { encoding: 'utf8' }); return { code: r.status, text: `${r.stdout}${r.stderr}`, out: r.stdout }; };
  assert.equal(run('import-approved', '--scope', SCOPE, '--name', 'users-api', '--source', fx.source('u.yaml', USERS_YAML), '--approved-by', 'API Owner', '--reason', 'v1').code, 0);
  const d = baseDoc(); d.components.schemas.User.properties.id = { type: 'integer' };
  assert.equal(run('register', '--scope', SCOPE, '--name', 'users-api', '--role', 'proposed', '--source', fx.source('u2.json', d), '--by', 'Dev').code, 0);
  const an = run('analyze', '--scope', SCOPE, '--json');
  assert.equal(an.code, 2, an.text);
  const id = JSON.parse(an.out).id;
  assert.equal(run('status', '--scope', SCOPE).code, 2);
  assert.equal(run('accept', '--scope', SCOPE, '--candidate', 'CV-2', '--analysis', 'CD-000000000000', '--by', 'API Owner', '--reason', 'r').code, 1);
  const ok = run('accept', '--scope', SCOPE, '--candidate', 'CV-2', '--analysis', id, '--by', 'API Owner', '--reason', 'ids are numeric now');
  assert.equal(ok.code, 0, ok.text);
  assert.match(ok.text, /need a decision/);
  assert.equal(run('rules').code, 0);
  assert.equal(run('register', '--scope', SCOPE, '--name', 'users-api', '--role', 'approved', '--source', fx.source('u3.yaml', USERS_YAML), '--by', 'x').code, 1);
});

// ---------------------------------------------------------------------------------------------
// The stage gate (run_manager/stageGate.checkStageEntry), on a real approved run
// ---------------------------------------------------------------------------------------------

test('stage gate: unresolved Breaking drift blocks 5A for the affected module only; a decision clears it', (t) => {
  // eslint-disable-next-line global-require
  const hf = require('../../run_manager/__tests__/healFixture');
  const ws = hf.workspace(); t.after(() => hf.cleanup(ws));
  hf.failedAutomationRun(ws); // 1 → 2 → 3 → 4A approved for module `login`, 5A executed once
  const run = ws.rm('new', '--scope', 'Module', '--target', 'Login', '--modules', 'login', '--no-activate').text.match(/Created (\S+)/)[1];
  const gate = () => ws.rm('state', 'gate', '5A', '--invocation', 'Pipeline', '--run', run);
  assert.equal(gate().code, 0, 'no contract registered: the gate is unchanged');
  const src = path.join(ws.root, '..', `${path.basename(ws.root)}-login.yaml`);
  fs.writeFileSync(src, USERS_YAML);
  t.after(() => fs.rmSync(src, { force: true }));
  R.importApproved(ws.root, 'modules/login', { name: 'login-api', source: src, approvedBy: 'API Owner', reason: 'v1', now: NOW });
  assert.equal(gate().code, 0, 'an approved contract with nothing pending blocks nothing');
  // Another module's drift never blocks this one.
  fs.mkdirSync(path.join(ws.root, 'modules', 'billing'), { recursive: true });
  const d = baseDoc(); d.components.schemas.User.properties.id = { type: 'integer' };
  const dsrc = `${src}.v2.json`; fs.writeFileSync(dsrc, JSON.stringify(d)); t.after(() => fs.rmSync(dsrc, { force: true }));
  R.importApproved(ws.root, 'modules/billing', { name: 'billing-api', source: src, approvedBy: 'API Owner', reason: 'v1', now: NOW });
  R.registerVersion(ws.root, 'modules/billing', { name: 'billing-api', role: 'proposed', source: dsrc, by: 'Dev', now: NOW });
  assert.equal(gate().code, 0, 'billing drift does not block login');
  // The same drift in login blocks — and, reaching no traceable case, no part of the scope is shown unaffected.
  const v = R.registerVersion(ws.root, 'modules/login', { name: 'login-api', role: 'proposed', source: dsrc, by: 'Dev', now: NOW });
  const g = gate();
  assert.equal(g.code, 2, g.text);
  assert.match(g.text, /API contract \(modules\/login\)/);
  assert.match(g.text, /reaches no traceable test case/);
  R.rejectVersion(ws.root, 'modules/login', { candidate: v.id, by: 'API Owner', reason: 'the id stays a string', now: NOW });
  assert.equal(gate().code, 0, 'a named rejection clears it');
});
