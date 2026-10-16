// Real-world API contract regression suite (Phase 7.1) — offline, part of `npm test`.
//
// Fixtures are published, versioned, licensed specifications (fixtures/SOURCES.json), committed byte for
// byte. Covers: provenance, parser compatibility, self-comparison, cross-format equivalence, malformed and
// unsupported inputs, contradictory contracts, version changes through the registry, impact precision on a
// real spec, and the drift classification accuracy matrix (classificationMatrix.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const TOOLS = path.resolve(__dirname, '..', '..', 'platform_core', 'tools');
const { parseYaml } = require(path.join(TOOLS, 'api_contract', 'yaml'));
const { normalizeContract } = require(path.join(TOOLS, 'api_contract', 'normalize'));
const { compareContracts } = require(path.join(TOOLS, 'api_contract', 'diff'));
const R = require(path.join(TOOLS, 'api_contract', 'registry'));
const { runMatrix } = require('./matrixRunner');

const FX = path.join(__dirname, 'fixtures');
const SOURCES = JSON.parse(fs.readFileSync(path.join(FX, 'SOURCES.json'), 'utf8'));
const read = (rel) => fs.readFileSync(path.join(FX, rel), 'utf8');
const norm = (rel) => normalizeContract(read(rel), { name: rel });
const NOW = new Date('2026-10-09T12:00:00Z');

test('provenance: every fixture is the original file — its fingerprint, source, pinned ref and license are recorded', () => {
  let n = 0;
  for (const src of SOURCES.sources) {
    assert.ok(fs.existsSync(path.join(FX, src.licenseFile)), `${src.id}: license file`);
    assert.ok(src.license && src.repository, src.id);
    for (const f of src.files) {
      const text = read(f.path);
      assert.equal(crypto.createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex'), f.sha256, `${f.path} changed — a fixture is never edited`);
      assert.match(f.ref, /^(tag|commit) /, `${f.path}: pinned`);
      assert.match(f.url, /^https:\/\/raw\.githubusercontent\.com\//);
      n += 1;
    }
  }
  assert.equal(n, 14);
});

// Parser compatibility: format, version, endpoints, and what is recorded as not compared field by field.
const EXPECTED = [
  ['oai-openapi-specification/v3.0/petstore.yaml', 'openapi-3', '3.0.0', 3, []],
  ['oai-openapi-specification/v3.0/petstore-expanded.yaml', 'openapi-3', '3.0.0', 4, []],
  ['oai-openapi-specification/v3.0/uspto.yaml', 'openapi-3', '3.0.1', 3, []],
  ['oai-openapi-specification/v3.0/link-example.yaml', 'openapi-3', '3.0.0', 6, ['links']],
  ['oai-openapi-specification/v3.0/callback-example.yaml', 'openapi-3', '3.0.0', 1, ['callbacks']],
  ['oai-openapi-specification/v3.0/api-with-examples.yaml', 'openapi-3', '3.0.0', 2, []],
  ['oai-openapi-specification/v2.0/petstore-expanded.json', 'swagger-2', '2.0', 4, []],
  ['oai-openapi-specification/v2.0/petstore-expanded.yaml', 'swagger-2', '2.0', 4, []],
  ['oai-openapi-specification/v2.0/uber.json', 'swagger-2', '2.0', 5, []],
  ['oai-openapi-specification/v3.1/webhook-example.yaml', 'openapi-3', '3.1.0', 0, ['webhooks']],
  ['swagger-petstore/openapi.yaml', 'openapi-3', '3.0.4', 19, []],
  ['postman-collection/nested-v2-collection.json', 'postman-2', '2.x', 1, []],
  ['newman/sample-collection.json', 'postman-2', '2.x', 2, []],
];

test('parser compatibility: OpenAPI 3.0/3.1, Swagger 2.0 (JSON and YAML) and Postman v2.x real files are read; unmodelled constructs are recorded, not dropped', () => {
  for (const [rel, format, version, endpoints, constructs] of EXPECTED) {
    const m = norm(rel);
    assert.equal(m.format, format, rel);
    assert.equal(m.specVersion, version, rel);
    assert.equal(Object.keys(m.endpoints).length, endpoints, rel);
    assert.deepEqual([...new Set(m.issues.map((i) => i.construct))].sort(), constructs, rel);
    for (const i of m.issues) assert.match(i.fingerprint, /^[0-9a-f]{16}$/, `${rel}: an unmodelled construct keeps a fingerprint`);
  }
  // Named schemas stay named; composition and references are kept.
  const sp = norm('swagger-petstore/openapi.yaml');
  // Only named schemas the API uses are read; Address and Customer are defined but no endpoint reaches them.
  assert.deepEqual(Object.keys(sp.components).sort(), ['ApiResponse', 'Category', 'Order', 'Pet', 'Tag', 'User']);
  assert.deepEqual(sp.endpoints['GET /pet/{}'].auth.alternatives, ['apiKey:header:api_key', 'oauth2:implicit[read:pets write:pets]']);
  assert.deepEqual(sp.endpoints['POST /pet'].request.body.media, ['application/json', 'application/x-www-form-urlencoded', 'application/xml']);
  assert.equal(sp.components.Pet.properties.category.$ref, 'Category');
  assert.deepEqual(norm('oai-openapi-specification/v3.1/webhook-example.yaml').webhooks && Object.keys(norm('oai-openapi-specification/v3.1/webhook-example.yaml').webhooks), ['newPet']);
});

test('the YAML reader agrees with JSON on real files, and an approved YAML spec and its JSON rendering are one contract', () => {
  const y = parseYaml(read('swagger-petstore/openapi.yaml'));
  assert.equal(y.openapi, '3.0.4');
  assert.equal(y.paths['/pet/findByStatus'].get.parameters[0].schema.default, 'available');
  // Multi-line flow mapping beginning on its own line (uspto) and block scalars are read.
  const u = parseYaml(read('oai-openapi-specification/v3.0/uspto.yaml'));
  assert.equal(u.paths['/'].get.responses['200'].content['application/json'].example.total, 2);
  const m = norm('swagger-petstore/openapi.yaml');
  assert.deepEqual(normalizeContract(JSON.stringify(y)), m);
});

test('self-comparison and cross-format: every real file is Unchanged against itself; Swagger 2.0 and OpenAPI 3.0 renderings of one API are one contract', () => {
  for (const [rel] of EXPECTED) {
    const m = norm(rel);
    assert.equal(compareContracts(m, JSON.parse(JSON.stringify(m))).classification, 'Unchanged', rel);
  }
  // The same API published by OAI in both formats (and the v2 JSON vs YAML, which differ only in prose).
  const v2 = norm('oai-openapi-specification/v2.0/petstore-expanded.json');
  assert.equal(compareContracts(v2, norm('oai-openapi-specification/v2.0/petstore-expanded.yaml')).classification, 'Unchanged');
  assert.equal(compareContracts(v2, norm('oai-openapi-specification/v3.0/petstore-expanded.yaml')).classification, 'Unchanged');
  assert.equal(compareContracts(v2, norm('oai-openapi-specification/v3.0/petstore-expanded.yaml'), { mode: 'cross-source' }).classification, 'Unchanged');
});

test('malformed and unsupported inputs are refused with a reason — never read as an empty or compatible contract', () => {
  const spec = read('swagger-petstore/openapi.yaml');
  const refuse = (text, re, why) => assert.throws(() => normalizeContract(text, { name: why }), re, why);
  const cut = spec.indexOf("'#/components/schemas/Pet'") + 5; // inside a quoted string
  refuse(spec.slice(0, cut), /cannot be read as YAML: YAML line \d+: unterminated single-quoted string/, 'truncated YAML');
  refuse(JSON.stringify(parseYaml(spec)).slice(0, 5000), /cannot be read as JSON/, 'truncated JSON');
  refuse(spec.replace('openapi: 3.0.4', 'openapi: 3.0.4\nx-anchor: &a 1\nx-alias: *a'), /anchors and aliases/, 'anchors');
  refuse(spec.replace('openapi: 3.0.4', 'openapi: 3.0.4\nx-tag: !!str 1'), /tags are not supported/, 'tags');
  refuse(spec.replace('openapi: 3.0.4', 'openapi: 3.0.4\nopenapi: 3.0.4'), /duplicate key/, 'duplicate key');
  refuse(spec.replace(/\n {2}\/pet:/, '\n\t/pet:'), /tab/, 'tab indentation');
  refuse(`${spec}\n---\nopenapi: 3.0.0\n`, /multiple YAML documents/, 'two documents');
  refuse(spec.replace('openapi: 3.0.4', 'openapi: 4.0.0'), /only OpenAPI 3\.x and Swagger 2\.0/, 'OpenAPI 4');
  refuse('swagger: "1.2"\napis: []\n', /only OpenAPI 3\.x and Swagger 2\.0/, 'Swagger 1.2');
  refuse('openapi: 3.0.0\ninfo: {title: t, version: "1"}\n', /no paths/, 'no paths');
  refuse(read('newman/v1-collection.json'), /Postman Collection v1/, 'Postman v1');
  refuse('{"name": "not a contract", "items": []}', /not a recognised contract source/, 'unknown JSON');
});

test('contradictory approved contracts: two real renderings agree; a contradicting one blocks until a human decides', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rw-contract-'));
  try {
    fs.mkdirSync(path.join(root, 'modules', 'pets', 'test_design'), { recursive: true });
    const scope = 'modules/pets';
    R.importApproved(root, scope, { name: 'pets-oas3', source: path.join(FX, 'oai-openapi-specification/v3.0/petstore-expanded.yaml'), approvedBy: 'API Owner', reason: 'OAI 3.0 rendering', now: NOW });
    R.importApproved(root, scope, { name: 'pets-swagger2', source: path.join(FX, 'oai-openapi-specification/v2.0/petstore-expanded.json'), approvedBy: 'API Owner', reason: 'OAI 2.0 rendering', now: NOW });
    const s = R.resolveScope(root, scope);
    assert.deepEqual(R.findContradictions(root, s, R.readRegistry(s)), [], 'the two renderings of one API do not contradict each other');
    const tampered = JSON.parse(read('oai-openapi-specification/v2.0/petstore-expanded.json'));
    tampered.definitions.NewPet.properties.tag = { type: 'integer' };
    const f = path.join(root, 'contradicting.json');
    fs.writeFileSync(f, JSON.stringify(tampered));
    R.importApproved(root, scope, { name: 'pets-team-copy', source: f, approvedBy: 'QA Lead', reason: 'team copy', now: NOW });
    const cx = R.findContradictions(root, s, R.readRegistry(s));
    assert.ok(cx.length >= 1 && cx.every((c) => c.items.some((i) => i.rule === 'SC-TYPE-CHANGED' && /\.tag$/.test(i.field))));
    assert.ok(R.scopeStatus(root, scope).blockers.some((b) => b.kind === 'contradiction'));
    for (const c of cx) R.decideContradiction(root, scope, { id: c.id, decision: 'the OAI renderings govern; the team copy is withdrawn', by: 'API Owner', now: NOW });
    assert.equal(R.scopeStatus(root, scope).blockers.length, 0);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

// A suite written against the real Petstore, with structured assertions — the precision checks.
const header = (t) => `# ${t}\n\n| Field | Value |\n|---|---|\n| Status | Approved |\n`;
const PET_CASES = [
  ['TC-PET-001', '1. Send GET /pet/{petId} for pet 10.', [['A1', '`available`', 'API contract GET /pet/{petId} 200 $.status', 'equals', 'REQ-1']], 'REQ-1'],
  ['TC-PET-002', '1. Find pets by status.', [['A1', '`available`', 'API contract findPetsByStatus 200 $[].status', 'equals', 'REQ-2']], 'REQ-2'],
  ['TC-PET-003', '1. Read the pet category.', [['A1', '`Dogs`', 'API contract GET /pet/{petId} 200 $.category.name', 'equals', 'REQ-3']], 'REQ-3'],
  ['TC-PET-004', '1. Read the pet name.', [['A1', '`doggie`', 'API contract GET /pet/{petId} 200 $.name', 'equals', 'REQ-4']], 'REQ-4'],
  ['TC-PET-005', '1. Send `GET /pet/{petId}` and look at the page.', [['A1', 'the page renders', 'Expected Result', 'present', 'REQ-5']], 'REQ-5'],
  ['TC-PET-006', '1. Read tag names.', [['A1', '`puppy`', 'API contract GET /pet/{petId} 200 $.tags[].name', 'equals', 'REQ-6']], 'REQ-6'],
  ['TC-PET-008', '1. Read a pet.', [['A1', 'the pet is returned', 'API contract GET /pet/{petId} 200', 'present', 'REQ-8']], 'REQ-8'],
  ['TC-PET-007', '1. Unrelated: store inventory.', [['A1', 'counts shown', 'API contract GET /store/inventory 200 $', 'present', 'REQ-7']], 'REQ-7'],
];
const suite = () => `${header('Test Cases — pets')}\n## Test Cases\n\n${PET_CASES.map(([id, steps, rows]) => `### ${id} — ${id}\n\n**Objective:** o.\n\n**Preconditions:** p.\n\n**Test Data:** None.\n\n**Steps:**\n\n${steps}\n\n**Expected Result:** e.\n\n**Assertions:**\n\n| Assertion ID | Expected | Expected Source | Check | Requirement |\n|---|---|---|---|---|\n${rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}\n\n**Priority:** P1\n\n**Tags:** API\n\n**Review:** Approved\n\n**Automation:** Approved\n`).join('\n')}`;
const matrix = () => `${header('Traceability Matrix — pets')}\n| Test Case ID | Requirement Reference | Discovery Reference | Finding Reference | Evidence Reference | Acceptance Criteria Reference | Run Scope Reference | Risk Level | Risk Statement | Validation Status |\n|---|---|---|---|---|---|---|---|---|---|\n${PET_CASES.map(([id, , , req]) => `| ${id} | ${req} | N/A | N/A | N/A | N/A | Module | Low | r | Traced |`).join('\n')}\n`;

test('version change on a real spec: impact is confirmed only through exact JSON paths (incl. operationId and nested shared schemas); other links are potential, ambiguous ones flagged', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rw-impact-'));
  try {
    const put = (rel, t) => { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
    put('modules/pets/test_design/TestCases_pets.md', suite());
    put('modules/pets/test_design/TraceabilityMatrix.md', matrix());
    const scope = 'modules/pets';
    R.importApproved(root, scope, { name: 'petstore', source: path.join(FX, 'swagger-petstore/openapi.yaml'), approvedBy: 'API Owner', reason: 'Petstore 1.0.29', now: NOW });
    const d = parseYaml(read('swagger-petstore/openapi.yaml'));
    d.components.schemas.Pet.properties.status.enum = ['available', 'pending']; // Pet.status loses `sold`
    d.components.schemas.Category.properties.name = { type: 'integer' }; // Category.name: string → integer (nested, shared)
    d.paths['/pet/{petId}'].get['x-requirements'] = ['REQ-5'];
    const v = R.registerVersion(root, scope, { name: 'petstore', role: 'proposed', source: put('petstore-next.json', JSON.stringify(d)), by: 'Dev Lead', now: NOW });
    const a = R.analyzeContract(root, scope, { candidate: v.id });
    const conf = Object.fromEntries(a.impact.confirmed.map((e) => [e.testCase, e]));
    const pot = Object.fromEntries(a.impact.potential.map((e) => [e.testCase, e]));
    assert.ok(conf['TC-PET-001'] && conf['TC-PET-001'].assertions.some((x) => x.assertionId === 'A1'), 'exact path $.status on GET /pet/{petId}');
    assert.ok(conf['TC-PET-002'] && conf['TC-PET-002'].endpoints.includes('GET /pet/findByStatus'), 'the operationId findPetsByStatus resolves to GET /pet/findByStatus, where $[].status changed');
    assert.ok(conf['TC-PET-003'] && /category\.name/.test(conf['TC-PET-003'].assertions[0].why), 'the nested shared Category.name change reaches $.category.name');
    assert.ok(!conf['TC-PET-004'] && !pot['TC-PET-004'], '$.name is a sibling of the changed fields — not reached');
    assert.ok(pot['TC-PET-005'] && pot['TC-PET-005'].via.some((x) => /REQ-5/.test(x)), 'a requirement link alone is potential, never confirmed');
    assert.ok(!conf['TC-PET-006'] && !pot['TC-PET-006'], '$.tags[].name is another field than $.category.name — an exact path is authoritative; a shared leaf name proves nothing');
    assert.ok(pot['TC-PET-008'] && pot['TC-PET-008'].ambiguous, 'an assertion on the endpoint that names no field is potential and ambiguous — a human decides');
    assert.ok(!conf['TC-PET-007'] && !pot['TC-PET-007'], 'another endpoint is not reached');
    // Accepting changes nothing in the suite; every reached approved case needs its own decision.
    const suiteFile = path.join(root, 'modules/pets/test_design/TestCases_pets.md');
    const before = fs.readFileSync(suiteFile, 'utf8');
    const r = R.acceptVersion(root, scope, { candidate: v.id, analysisId: a.id, by: 'API Owner', reason: 'Petstore 1.1', now: NOW });
    assert.equal(fs.readFileSync(suiteFile, 'utf8'), before);
    assert.ok(r.pendingImpact.map((e) => e.testCase).includes('TC-PET-001'));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('drift classification accuracy matrix: every independently justified expectation holds on the real Petstore spec', () => {
  const rows = runMatrix();
  const bad = rows.filter((x) => !x.ok);
  assert.deepEqual(bad.map((x) => `${x.id}: ${x.problems.join('; ')}`), []);
  assert.ok(rows.length >= 50);
  const areas = new Set(rows.map((x) => x.area));
  for (const a of ['Required/optional', 'Data types', 'Nullability', 'Constraints', 'Enums', 'Request parameters', 'Media types', 'Status codes', 'Error responses', 'Composition', 'Authentication', 'Endpoints', 'Unsupported construct', 'External reference', 'Unchanged']) assert.ok(areas.has(a), a);
  // Unsupported or unresolvable changes are never classified as safe.
  for (const r of rows.filter((x) => /Unsupported|External|Broken/.test(x.area))) assert.equal(r.actual, 'Unknown', r.id);
});
