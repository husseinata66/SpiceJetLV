// Test helper — a disposable data root with a `users` module whose approved test cases exercise an API
// through structured assertions, plus the contract sources the tests compare. Not a test file.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseYaml } = require('../yaml');

const NOW = new Date('2026-10-09T10:00:00Z');

/** The approved contract, as an OpenAPI 3 YAML document (read through the platform's YAML reader). */
const USERS_YAML = `openapi: 3.0.3
info:
  title: Users API
  version: "1.0.0"
servers:
  - url: https://users.example.test/v1
paths:
  /users/{id}:
    get:
      operationId: getUser
      summary: Read one user
      x-requirements: [REQ-12]
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: The user
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          description: Not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
  /users:
    post:
      operationId: createUser
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name]
              properties:
                name: { type: string, maxLength: 80 }
                role: { type: string, enum: [admin, member] }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '400':
          description: Invalid
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
components:
  securitySchemes:
    bearerAuth: { type: http, scheme: bearer }
  schemas:
    User:
      type: object
      required: [id, name, status]
      properties:
        id: { type: string }
        name: { type: string }
        status:
          type: string
          enum: [ACTIVE, LOCKED]
        nickname: { type: string, nullable: true }
    Error:
      type: object
      required: [code, message]
      properties:
        code: { type: string }
        message: { type: string }
`;

const clone = (v) => JSON.parse(JSON.stringify(v));
/** The approved document as an object, to derive variants from. */
const baseDoc = () => clone(parseYaml(USERS_YAML));

const header = (title, status) => `# ${title}\n\n| Field | Value |\n|---|---|\n| Status | ${status} |\n`;
const CASES = [
  { id: 'TC-USR-001', title: 'Read a user', steps: '1. Send `GET /users/{id}` for an active user.', expected: 'HTTP `200`; status `ACTIVE`.', req: 'REQ-12', design: [['A1', '`ACTIVE`', 'API contract GET /users/{id} 200 $.status', 'equals', 'REQ-12'], ['A2', '`200`', 'API contract GET /users/{id} response code', 'equals', 'REQ-12']] },
  { id: 'TC-USR-002', title: 'Create a user', steps: '1. Send `POST /users` with a name.', expected: 'HTTP `201`.', req: 'REQ-14', design: [['A1', '`201`', 'API contract POST /users response code', 'equals', 'REQ-14']] },
  { id: 'TC-USR-003', title: 'Read a user — display', steps: '1. Call GET /users/{id} and show the name.', expected: 'The name is shown.', req: 'REQ-15', design: [['A1', 'the name is shown', 'Expected Result', 'present', 'REQ-15']] },
  { id: 'TC-USR-004', title: 'Profile page renders', steps: '1. Open the profile page.', expected: 'The page renders.', req: 'REQ-20', design: [['A1', 'the page renders', 'Expected Result', 'present', 'REQ-20']] },
  { id: 'TC-USR-005', title: 'Locked user', steps: '1. Read a locked user.', expected: 'status `LOCKED`.', req: 'REQ-16', design: [['A1', '`LOCKED`', 'API contract GET /users/{id} 200 $.status', 'equals', 'REQ-16']] },
];
const caseText = (c) => `### ${c.id} — ${c.title}\n\n**Objective:** o.\n\n**Preconditions:** p.\n\n**Test Data:** None.\n\n**Steps:**\n\n${c.steps}\n\n**Expected Result:** ${c.expected}\n\n**Assertions:**\n\n| Assertion ID | Expected | Expected Source | Check | Requirement |\n|---|---|---|---|---|\n${c.design.map((r) => `| ${r.join(' | ')} |`).join('\n')}\n\n**Priority:** P1\n\n**Tags:** API\n\n**Review:** Approved\n\n**Automation:** Approved\n`;
const suiteMd = (cases = CASES) => `${header('Test Cases — users', 'Approved')}\n## Test Cases\n\n${cases.map(caseText).join('\n')}`;
const matrixMd = (cases = CASES) => `${header('Traceability Matrix — users', 'Approved')}\n| Test Case ID | Requirement Reference | Discovery Reference | Finding Reference | Evidence Reference | Acceptance Criteria Reference | Run Scope Reference | Risk Level | Risk Statement | Validation Status |\n|---|---|---|---|---|---|---|---|---|---|\n${cases.map((c) => `| ${c.id} | ${c.req} | N/A | N/A | N/A | N/A | Module | Medium | r | Traced |`).join('\n')}\n`;

function fixture({ environment = 'QA' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apicontract-'));
  const src = fs.mkdtempSync(path.join(os.tmpdir(), 'apicontract-src-'));
  const fx = {
    root, src,
    put(rel, text) { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); return f; },
    read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); },
    /** A contract source OUTSIDE the data root (as a supplied file would be). */
    source(name, content) { const f = path.join(src, name); fs.writeFileSync(f, typeof content === 'string' ? content : JSON.stringify(content, null, 2)); return f; },
    cleanup() { fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(src, { recursive: true, force: true }); },
  };
  fx.put('modules/users/context/ProjectContext.md', `${header('Project Context — users', 'Approved')}\n| ID | Rule |\n|---|---|\n| REQ-12 | A user can be read |\n| REQ-14 | A user can be created |\n`);
  fx.put('modules/users/test_design/TestCases_users.md', suiteMd());
  fx.put('modules/users/test_design/TraceabilityMatrix.md', matrixMd());
  fs.mkdirSync(path.join(root, 'modules', 'orders', 'test_design'), { recursive: true });
  fs.mkdirSync(path.join(root, 'runs'), { recursive: true });
  if (environment) fx.put('knowledge_base/execution_safety_policy.json', JSON.stringify({ policyId: 'fixture', environment, environmentAliases: [] }));
  return fx;
}

/** Captured traffic in the platform's own exchange format. */
const evidence = (exchanges) => ({ kind: 'api-evidence', exchanges });
const getUser = (body, { status = 200, auth = true } = {}) => ({ method: 'GET', url: 'https://users.example.test/v1/users/42', status, requestHeaders: auth ? { Authorization: 'Bearer abc.def.ghi-secret' } : {}, responseBody: body });

module.exports = { NOW, USERS_YAML, baseDoc, clone, CASES, suiteMd, matrixMd, header, fixture, evidence, getUser };
