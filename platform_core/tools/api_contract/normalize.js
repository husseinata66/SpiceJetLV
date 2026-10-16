// Reads an API contract source — OpenAPI 3.x / Swagger 2.0 (JSON or YAML), a Postman Collection v2.x,
// captured request/response evidence (HAR, or the platform's own exchange list), or an already
// normalized contract — into ONE comparable model.
//
// WHY ONE MODEL
// Drift is only meaningful between like things. An OpenAPI document and a Postman collection describe
// the same API with different words; captured traffic describes it with examples. Each is read into the
// same shape, and each records HOW STRONG its statements are (`evidence`):
//   specification  — the document states it (required, types, enums, status codes)
//   example        — a sample request/response shows it (Postman examples): presence, not obligation
//   observed       — real or mock traffic shows it: what the service DID, never what it must do
// The comparison (diff.js) never reads an example or an observation as an obligation.
//
// MODEL api-contract/2 (Phase 7.1) — named schemas stay NAMED:
//   components: { <Name>: schema }      `#/components/schemas/*` and `#/definitions/*`
//   a reference inside a schema is      { $ref: '<Name>' }   (compared once per pair of names)
// Inlining every reference (api-contract/1) does not survive real specifications: Stripe's cross-linked
// schemas expand combinatorially. A version-1 model (all inlined) still compares — a reference is
// resolved where it meets an inlined schema.
//
// NOTHING IS SILENTLY FLATTENED
//   allOf          merged only when its members agree; a conflict keeps the composition, as `variants`
//   oneOf / anyOf  kept as `variants` (kind, members, discriminator) and compared member by member
//   not, if/then/else, patternProperties, prefixItems, unevaluated*, dependent*, $dynamicRef, …
//                  recorded as `unsupported` on the schema, with a fingerprint of the construct: a
//                  change to one is Unknown, never "no change"
//   callbacks, links, webhooks — recorded with fingerprints the same way
//   an external $ref — `unresolved`; never assumed equal to anything
//
// WHAT IS NEVER KEPT
// Header VALUES, credentials, cookies, query values and body values are not part of a contract and are
// never stored — only names, types and structure. Short string samples of observed leaf fields are
// kept (redacted) so an enum can be checked against real values; nothing else.

const crypto = require('crypto');
const { parseYaml } = require('./yaml');

const MODEL = 'api-contract/2';
const MODELS = Object.freeze(['api-contract/1', 'api-contract/2']);
const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
/** Headers that are transport, not contract — never compared. Auth headers are read as `auth`. */
const TRANSPORT_HEADERS = new Set([
  'accept', 'accept-encoding', 'accept-language', 'cache-control', 'connection', 'content-length',
  'content-type', 'host', 'origin', 'pragma', 'referer', 'user-agent', 'postman-token', 'date',
  'server', 'vary', 'etag', 'expires', 'last-modified', 'transfer-encoding', 'keep-alive', 'via',
  'access-control-allow-origin', 'access-control-allow-headers', 'access-control-allow-methods',
  'access-control-allow-credentials', 'access-control-expose-headers', 'strict-transport-security',
  'x-powered-by', 'x-request-id', 'x-correlation-id', 'set-cookie', 'cookie', 'sec-fetch-mode',
  'sec-fetch-site', 'sec-fetch-dest', 'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform', 'te', 'upgrade-insecure-requests',
]);
const AUTH_HEADERS = { authorization: 'http', 'proxy-authorization': 'http', 'x-api-key': 'apiKey:header:x-api-key', 'api-key': 'apiKey:header:api-key' };
const ID_RE = /\b(?!TC-)[A-Z]{2,7}-\d+[A-Za-z]?\b/g;
const SAMPLE_LIMIT = 10;
/** JSON Schema / OpenAPI keywords this comparison does not model. Recorded, fingerprinted, never dropped. */
const UNSUPPORTED_KEYWORDS = Object.freeze(['not', 'if', 'then', 'else', 'patternProperties', 'propertyNames', 'dependentSchemas', 'dependentRequired', 'dependencies', 'unevaluatedProperties', 'unevaluatedItems', 'prefixItems', 'contains', 'minContains', 'maxContains', '$dynamicRef', '$recursiveRef', 'contentSchema', 'additionalItems']);

class ContractSourceError extends Error {
  constructor(message, code = 'CONTRACT_SOURCE') { super(message); this.name = 'ContractSourceError'; this.code = code; }
}

/** Canonical JSON (sorted keys) — the basis of a normalized fingerprint. */
function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
  return JSON.stringify(v === undefined ? null : v);
}
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const fp = (v) => sha256(canonical(v)).slice(0, 16);
/** Same convention as run_manager consumedVersions.fingerprint: CRLF-normalized text. */
const sourceFingerprint = (text) => sha256(String(text).replace(/\r\n/g, '\n'));
const normalizedFingerprint = (model) => sha256(canonical(model));

/** `/users/{id}/` and `/users/:userId` → `/users/{}` — parameter names are not part of identity. */
function normPath(p) {
  let s = String(p || '/').trim();
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i, '').replace(/^\{\{[^}]+\}\}/, '').split('?')[0].split('#')[0];
  s = s.replace(/\{\{[^}]+\}\}/g, '{}').replace(/\{[^}/]*\}/g, '{}').replace(/(^|\/):[A-Za-z_][\w-]*/g, '$1{}');
  if (!s.startsWith('/')) s = `/${s}`;
  s = s.replace(/\/{2,}/g, '/');
  if (s.length > 1) s = s.replace(/\/$/, '');
  return s;
}
const keyOf = (method, p) => `${String(method).toUpperCase()} ${normPath(p)}`;
function stripBase(p, basePath) {
  if (!basePath || basePath === '/') return p;
  const b = normPath(basePath);
  const n = normPath(p);
  return n === b ? '/' : n.startsWith(`${b}/`) ? n.slice(b.length) : n;
}
const idsIn = (...texts) => [...new Set(texts.filter(Boolean).flatMap((t) => String(t).match(ID_RE) || []))].sort();

// ---------------------------------------------------------------------------------------------
// Schemas (specification)
// ---------------------------------------------------------------------------------------------

const CONSTRAINT_KEYS = ['minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'minLength', 'maxLength', 'pattern', 'minItems', 'maxItems', 'multipleOf', 'uniqueItems', 'minProperties', 'maxProperties'];

/** Resolves a local JSON pointer (`#/components/schemas/X`). */
function resolvePointer(doc, ref) {
  if (typeof ref !== 'string' || !ref.startsWith('#/')) return undefined;
  let cur = doc;
  for (const part of ref.slice(2).split('/').map((x) => decodeURIComponent(x).replace(/~1/g, '/').replace(/~0/g, '~'))) {
    if (cur === null || typeof cur !== 'object' || !(part in cur)) return undefined;
    cur = cur[part];
  }
  return cur;
}

/** The component name a `$ref` names, when it points at a whole named schema. */
function componentName(ref) {
  const m = typeof ref === 'string' && ref.match(/^#\/(?:components\/schemas|definitions)\/([^/]+)$/);
  return m ? decodeURIComponent(m[1]).replace(/~1/g, '/').replace(/~0/g, '~') : null;
}

/**
 * The schema reader for one document. Named schemas become `components`, referenced by name.
 * `issues` collects what cannot be compared exactly, each with where it is and what it is.
 */
function schemaReader(doc, issues) {
  const components = {};
  const inProgress = new Set();
  const raw = (doc.components && doc.components.schemas) || doc.definitions || {};
  const swagger2 = Boolean(doc.swagger);

  function component(name, at) {
    if (components[name] !== undefined || inProgress.has(name)) return;
    const target = raw[name];
    if (target === undefined) return;
    inProgress.add(name);
    components[name] = read(target, `#/${swagger2 ? 'definitions' : 'components/schemas'}/${name}`, []);
    inProgress.delete(name);
    return at;
  }

  /** One schema. `stack` holds non-component pointers being expanded (cycle guard). */
  function read(s, at, stack) {
    if (s === undefined || s === null) return null;
    if (typeof s === 'boolean') return s ? { type: 'any' } : { type: 'never' };
    if (typeof s !== 'object') return { type: 'unknown', unresolved: `not a schema at ${at}` };
    if (s.$ref !== undefined) {
      const name = componentName(s.$ref);
      const extra = {};
      if (s.nullable === true) extra.nullable = true;
      if (s.readOnly) extra.readOnly = true;
      if (s.writeOnly) extra.writeOnly = true;
      if (name && raw[name] !== undefined) { component(name, at); return { $ref: name, ...extra }; }
      if (typeof s.$ref === 'string' && !s.$ref.startsWith('#')) {
        issues.push({ at, construct: 'external-ref', detail: `$ref ${s.$ref} points outside this document — its schema is not read`, fingerprint: fp(s.$ref) });
        return { type: 'unknown', unresolved: s.$ref, external: true };
      }
      if (stack.includes(s.$ref)) return { type: 'unknown', unresolved: `recursive ${s.$ref}` };
      const target = resolvePointer(doc, s.$ref);
      if (target === undefined) {
        issues.push({ at, construct: 'broken-ref', detail: `$ref ${s.$ref} cannot be resolved inside this document`, fingerprint: fp(s.$ref) });
        return { type: 'unknown', unresolved: s.$ref };
      }
      return { ...read(target, at, [...stack, s.$ref]), ...extra };
    }
    const out = {};
    let type = s.type;
    let nullable = s.nullable === true || s['x-nullable'] === true;
    if (Array.isArray(type)) {
      if (type.includes('null')) nullable = true;
      const rest = type.filter((t) => t !== 'null');
      type = rest.length === 1 ? rest[0] : rest.length ? 'mixed' : 'null';
      if (rest.length > 1) out.types = [...rest].sort();
    }
    // Unsupported keywords: kept as fingerprints, never dropped.
    const unsupported = UNSUPPORTED_KEYWORDS.filter((k) => s[k] !== undefined).map((k) => ({ construct: k, fingerprint: fp(s[k]) }));
    if (s.discriminator) out.discriminator = fp(s.discriminator);
    for (const u of unsupported) issues.push({ at, construct: u.construct, detail: `"${u.construct}" is not compared field by field — any change to it is Unknown`, fingerprint: u.fingerprint });
    if (unsupported.length) out.unsupported = unsupported;

    if (Array.isArray(s.allOf)) {
      const members = s.allOf.map((m, k) => read(m, `${at}/allOf/${k}`, stack));
      const own = { ...s }; delete own.allOf;
      const hasOwn = Object.keys(own).some((k) => !['description', 'title', 'example', 'examples', 'nullable', 'x-nullable', 'readOnly', 'writeOnly', 'deprecated', 'externalDocs'].includes(k));
      if (hasOwn) members.push(read(own, at, stack));
      const merged = mergeAllOf(members, components, raw, component);
      if (merged.conflict) {
        issues.push({ at, construct: 'allOf', detail: `allOf members disagree (${merged.conflict}) — kept as a composition, compared as Unknown when it changes`, fingerprint: fp(s.allOf) });
        return { type: 'variants', variants: { kind: 'allOf', of: members }, ...(nullable ? { nullable: true } : {}) };
      }
      const res = merged.schema;
      if (nullable) res.nullable = true;
      if (s.readOnly) res.readOnly = true;
      if (s.writeOnly) res.writeOnly = true;
      if (unsupported.length) res.unsupported = [...(res.unsupported || []), ...unsupported];
      return res;
    }
    for (const kind of ['oneOf', 'anyOf']) {
      if (Array.isArray(s[kind])) {
        const members = s[kind].map((m, k) => read(m, `${at}/${kind}/${k}`, stack));
        const nonNull = members.filter((m) => m && m.type !== 'null');
        if (nonNull.length === 1 && members.length === 2) return { ...nonNull[0], nullable: true };
        out.variants = { kind, of: nonNull };
        if (nonNull.length !== members.length) nullable = true;
        type = type || 'variants';
      }
    }
    if (s.const !== undefined) out.enum = [typeof s.const === 'string' ? s.const : JSON.stringify(s.const)];
    if (!type) type = s.properties || s.additionalProperties !== undefined ? 'object' : s.items ? 'array' : s.enum || s.const !== undefined ? (typeof (s.enum ? s.enum.find((v) => v !== null) : s.const) === 'number' ? 'number' : 'string') : 'any';
    if (swagger2 && type === 'file') type = 'string';
    out.type = type;
    if (nullable) out.nullable = true;
    if (s.format) out.format = String(s.format);
    if (s.readOnly) out.readOnly = true;
    if (s.writeOnly) out.writeOnly = true;
    if (Array.isArray(s.enum)) {
      out.enum = s.enum.filter((v) => v !== null).map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).sort();
      if (s.enum.includes(null)) out.nullable = true;
    }
    const constraints = {};
    for (const k of CONSTRAINT_KEYS) if (s[k] !== undefined) constraints[k] = s[k];
    // OpenAPI 3.0 / Swagger 2 write exclusiveMinimum as a boolean beside minimum; 3.1 as the bound itself.
    for (const [ex, bound] of [['exclusiveMinimum', 'minimum'], ['exclusiveMaximum', 'maximum']]) {
      if (typeof constraints[ex] === 'boolean') {
        if (constraints[ex] && constraints[bound] !== undefined) { constraints[ex] = constraints[bound]; delete constraints[bound]; } else delete constraints[ex];
      }
    }
    if (Object.keys(constraints).length) out.constraints = constraints;
    if (type === 'object' || s.properties) {
      out.properties = {};
      for (const [k, v] of Object.entries(s.properties || {})) out.properties[k] = read(v, `${at}/properties/${k}`, stack);
      out.required = [...new Set(s.required || [])].sort();
      if (s.additionalProperties === false) out.additionalProperties = false;
      else if (s.additionalProperties && typeof s.additionalProperties === 'object' && Object.keys(s.additionalProperties).length) out.additionalProperties = read(s.additionalProperties, `${at}/additionalProperties`, stack);
    }
    if (type === 'array') out.items = Array.isArray(s.items) ? { type: 'unknown', unresolved: 'tuple items' } : (read(s.items, `${at}/items`, stack) || { type: 'any' });
    return out;
  }
  return { read, components, componentOf: component };
}

/** Merges allOf members (after following component references one level). */
function mergeAllOf(members, components, raw, component) {
  const deref = (m) => {
    if (m && m.$ref) { component(m.$ref); return components[m.$ref] || null; }
    return m;
  };
  const real = members.filter(Boolean).map(deref);
  if (real.some((m) => !m)) return { conflict: 'a member refers to a schema still being read (recursive allOf)' };
  if (real.length === 1 && members[0] && members[0].$ref) return { schema: { ...members[0] } };
  const out = { properties: {}, required: [] };
  const types = [...new Set(real.map((m) => m.type).filter((t) => t && t !== 'any'))];
  if (types.length > 1) return { conflict: `types ${types.join(' / ')}` };
  out.type = types[0] || 'any';
  let anyProps = false;
  for (const m of real) {
    if (m.variants || m.unresolved) return { conflict: 'a member is itself a composition or unresolved' };
    for (const [k, v] of Object.entries(m.properties || {})) {
      anyProps = true;
      if (out.properties[k] && canonical(out.properties[k]) !== canonical(v)) return { conflict: `property "${k}" is defined differently` };
      out.properties[k] = v;
    }
    out.required.push(...(m.required || []));
    if (m.enum) { if (out.enum) out.enum = out.enum.filter((x) => m.enum.includes(x)); else out.enum = [...m.enum]; }
    if (m.format) { if (out.format && out.format !== m.format) return { conflict: 'formats differ' }; out.format = m.format; }
    for (const [k, v] of Object.entries(m.constraints || {})) {
      out.constraints = out.constraints || {};
      if (out.constraints[k] !== undefined && canonical(out.constraints[k]) !== canonical(v)) return { conflict: `constraint ${k} differs` };
      out.constraints[k] = v;
    }
    if (m.additionalProperties === false) out.additionalProperties = false;
    if (m.items) { if (out.items && canonical(out.items) !== canonical(m.items)) return { conflict: 'items differ' }; out.items = m.items; }
    if (m.unsupported) out.unsupported = [...(out.unsupported || []), ...m.unsupported];
  }
  out.required = [...new Set(out.required)].sort();
  if (!anyProps && out.type !== 'object') { delete out.properties; delete out.required; }
  if (out.type === 'any' && anyProps) out.type = 'object';
  return { schema: out };
}

// ---------------------------------------------------------------------------------------------
// Schemas inferred from examples
// ---------------------------------------------------------------------------------------------

/** A schema inferred from one example value. Required-ness is never inferred — only presence. */
function inferSchema(v, sanitize) {
  if (v === null) return { type: 'null', nullable: true, inferred: true };
  if (Array.isArray(v)) {
    let items = null;
    for (const x of v) items = mergeInferred(items, inferSchema(x, sanitize));
    return { type: 'array', items: items || { type: 'any', inferred: true }, inferred: true };
  }
  if (typeof v === 'object') {
    const properties = {};
    for (const [k, x] of Object.entries(v)) properties[k] = inferSchema(x, sanitize);
    return { type: 'object', properties, present: Object.keys(v).sort(), inferred: true };
  }
  if (typeof v === 'boolean') return { type: 'boolean', inferred: true };
  if (typeof v === 'number') return { type: Number.isInteger(v) ? 'integer' : 'number', inferred: true };
  const s = String(v);
  const out = { type: 'string', inferred: true };
  if (s.length <= 40) {
    const clean = sanitize ? sanitize(s) : s;
    if (clean === s) out.samples = [s];
  }
  return out;
}

/** Merges two inferred schemas of the same location seen in different samples. */
function mergeInferred(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (a.type === 'unknown' || b.type === 'unknown') {
    // Something unreadable on either side stays unreadable — and keeps a fingerprint of both.
    return { type: 'unknown', unresolved: a.unresolved || b.unresolved || 'mixed body', opaque: fp([a.opaque || canonical(a), b.opaque || canonical(b)].sort()) };
  }
  const out = { inferred: true };
  const ta = a.type; const tb = b.type;
  const nullable = a.nullable || b.nullable || ta === 'null' || tb === 'null';
  if (ta === 'null') return { ...b, nullable: true };
  if (tb === 'null') return { ...a, nullable: true };
  if (ta === tb) out.type = ta;
  else if ([ta, tb].every((t) => t === 'integer' || t === 'number')) out.type = 'number';
  else { out.type = 'mixed'; out.types = [...new Set([...(a.types || [ta]), ...(b.types || [tb])])].sort(); }
  if (nullable) out.nullable = true;
  if (out.type === 'object') {
    out.properties = { ...(a.properties || {}) };
    for (const [k, v] of Object.entries(b.properties || {})) out.properties[k] = mergeInferred(out.properties[k], v);
    // A field counts as always present only when every sample had it.
    const pa = new Set(a.present || []); const pb = new Set(b.present || []);
    out.present = [...pa].filter((k) => pb.has(k)).sort();
    out.seen = [...new Set([...(a.seen || a.present || []), ...(b.seen || b.present || [])])].sort();
  }
  if (out.type === 'array') out.items = mergeInferred(a.items, b.items);
  if (out.type === 'string') {
    const s = [...new Set([...(a.samples || []), ...(b.samples || [])])];
    if (s.length && s.length <= SAMPLE_LIMIT) out.samples = s.sort();
    else if (s.length > SAMPLE_LIMIT) out.samplesTruncated = true;
  }
  return out;
}

/** A body that is not JSON: its structure cannot be read; only a fingerprint (never the text) is kept. */
const opaque = (text) => ({ type: 'unknown', unresolved: 'non-JSON body', opaque: fp(String(text)) });

function parseJsonBody(body) {
  if (body === undefined || body === null || body === '') return { ok: false };
  if (typeof body === 'object') return { ok: true, value: body };
  try { return { ok: true, value: JSON.parse(String(body)) }; } catch { return { ok: false, text: true }; }
}

// ---------------------------------------------------------------------------------------------
// OpenAPI 3.x / Swagger 2.0
// ---------------------------------------------------------------------------------------------

function securitySchemesOf(doc) {
  const defs = (doc.components && doc.components.securitySchemes) || doc.securityDefinitions || {};
  const out = {};
  for (const [name, d] of Object.entries(defs)) {
    if (!d || typeof d !== 'object') continue;
    if (d.type === 'http') out[name] = `http:${String(d.scheme || '').toLowerCase()}`;
    else if (d.type === 'basic') out[name] = 'http:basic';
    else if (d.type === 'apiKey') out[name] = `apiKey:${d.in}:${String(d.name || '').toLowerCase()}`;
    else if (d.type === 'oauth2') out[name] = `oauth2:${Object.keys(d.flows || {}).sort().join('+') || d.flow || ''}`;
    else if (d.type === 'openIdConnect') out[name] = 'openIdConnect';
    else out[name] = String(d.type);
  }
  return out;
}

/**
 * Authentication as alternatives: each alternative is a set of schemes required TOGETHER (AND); the
 * alternatives are OR. `{}` among them makes authentication optional.
 */
function authOf(requirements, schemes) {
  if (!Array.isArray(requirements)) return { required: false, alternatives: [], schemes: [], scopes: [] };
  const optional = !requirements.length || requirements.some((r) => r && !Object.keys(r).length);
  const alternatives = requirements.filter((r) => r && Object.keys(r).length)
    .map((r) => Object.entries(r).map(([k, sc]) => `${schemes[k] || `undefined:${k}`}${Array.isArray(sc) && sc.length ? `[${[...sc].map(String).sort().join(' ')}]` : ''}`).sort().join(' + '))
    .sort();
  const names = [...new Set(requirements.flatMap((r) => Object.keys(r || {})))];
  const scopes = [...new Set(requirements.flatMap((r) => Object.values(r || {}).flat()))].map(String).sort();
  return { required: !optional, alternatives: [...new Set(alternatives)], schemes: names.map((k) => schemes[k] || `undefined:${k}`).sort(), scopes };
}

const JSONISH = (k) => /json/i.test(k);
/** Media types and the schema of the JSON one (or the only one). */
function mediaOf(content, read, at) {
  const media = Object.keys(content || {}).sort();
  const pick = media.includes('application/json') ? 'application/json' : media.find(JSONISH) || (media.length === 1 ? media[0] : null);
  const m = pick ? content[pick] : null;
  return { media, schema: m && m.schema ? read(m.schema, at, []) : null, primary: pick };
}

function fromOpenApi(doc) {
  const issues = [];
  const swagger2 = Boolean(doc.swagger);
  const schemes = securitySchemesOf(doc);
  const reader = schemaReader(doc, issues);
  const read = reader.read;
  let basePath = swagger2 ? doc.basePath || '' : '';
  if (!swagger2 && Array.isArray(doc.servers) && doc.servers[0] && doc.servers[0].url) {
    basePath = String(doc.servers[0].url).replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i, '').replace(/\{[^}]*\}/g, '');
  }
  const deref = (o) => {
    let cur = o; const seen = new Set();
    while (cur && cur.$ref && !seen.has(cur.$ref)) {
      seen.add(cur.$ref);
      if (!String(cur.$ref).startsWith('#')) return { external: cur.$ref };
      cur = resolvePointer(doc, cur.$ref);
    }
    return cur;
  };
  const endpoints = {};
  for (const [p, rawItem] of Object.entries(doc.paths || {})) {
    const item = deref(rawItem);
    if (!item || typeof item !== 'object') continue;
    if (item.external) { issues.push({ at: p, construct: 'external-ref', detail: `path item ${p} is in another document (${item.external}) — not read`, fingerprint: fp(item.external) }); continue; }
    const shared = (item.parameters || []);
    for (const m of METHODS) {
      const op = item[m];
      if (!op) continue;
      const key = keyOf(m, p);
      const params = {};
      let body = null;
      const formData = [];
      for (const raw of [...shared, ...(op.parameters || [])]) {
        const prm = deref(raw);
        if (!prm || prm.external) { issues.push({ at: key, construct: prm && prm.external ? 'external-ref' : 'broken-ref', detail: `parameter ${raw && raw.$ref} cannot be read`, fingerprint: fp(raw) }); continue; }
        if (prm.in === 'body') { body = { required: prm.required === true, media: [...(op.consumes || doc.consumes || ['application/json'])].sort(), schema: read(prm.schema, `${key} body`, []) }; continue; }
        if (prm.in === 'formData') { formData.push(prm); continue; }
        const name = prm.in === 'header' ? String(prm.name).toLowerCase() : String(prm.name);
        if (prm.in === 'header' && (TRANSPORT_HEADERS.has(name) || AUTH_HEADERS[name])) continue;
        let ps;
        if (prm.schema) ps = read(prm.schema, `${key} ${prm.in}:${name}`, []);
        else if (prm.content) ps = mediaOf(prm.content, read, `${key} ${prm.in}:${name}`).schema;
        else ps = read({ type: prm.type, enum: prm.enum, format: prm.format, items: prm.items, ...Object.fromEntries(CONSTRAINT_KEYS.filter((k) => prm[k] !== undefined).map((k) => [k, prm[k]])) }, `${key} ${prm.in}:${name}`, []);
        // A later (operation-level) definition overrides a path-level one of the same name and location.
        params[`${prm.in}:${name}`] = { required: prm.in === 'path' ? true : prm.required === true, schema: ps, ...(prm.deprecated ? { deprecated: true } : {}) };
      }
      if (formData.length) {
        const properties = {}; const required = [];
        for (const f of formData) { properties[f.name] = read({ type: f.type === 'file' ? 'string' : f.type, format: f.type === 'file' ? 'binary' : f.format, enum: f.enum, items: f.items }, `${key} formData:${f.name}`, []); if (f.required) required.push(f.name); }
        body = { required: required.length > 0, media: [...(op.consumes || doc.consumes || ['multipart/form-data'])].sort(), schema: { type: 'object', properties, required: required.sort() } };
      }
      if (op.requestBody) {
        const rb = deref(op.requestBody);
        if (!rb || rb.external) { issues.push({ at: key, construct: 'external-ref', detail: 'requestBody cannot be read', fingerprint: fp(op.requestBody) }); body = { required: null, media: [], schema: { type: 'unknown', unresolved: 'requestBody' } }; } else {
          const md = mediaOf(rb.content, read, `${key} body`);
          body = { required: Boolean(rb.required), media: md.media, schema: md.schema };
        }
      }
      const responses = {};
      for (const [status, rawResp] of Object.entries(op.responses || {})) {
        const r = deref(rawResp);
        const st = String(status).toUpperCase();
        if (!r || r.external) { issues.push({ at: key, construct: r && r.external ? 'external-ref' : 'broken-ref', detail: `response ${status} cannot be read`, fingerprint: fp(rawResp) }); responses[st] = { headers: {}, media: [], body: { type: 'unknown', unresolved: (rawResp && rawResp.$ref) || 'response' } }; continue; }
        let schema = null; let media = [];
        if (swagger2) { schema = r.schema ? read(r.schema, `${key} ${status}`, []) : null; media = r.schema ? [...(op.produces || doc.produces || ['application/json'])].sort() : []; } else {
          const md = mediaOf(r.content, read, `${key} ${status}`);
          schema = md.schema; media = md.media;
        }
        const headers = {};
        for (const [h, hd0] of Object.entries(r.headers || {})) {
          const hd = deref(hd0);
          const name = h.toLowerCase();
          if (TRANSPORT_HEADERS.has(name)) continue;
          headers[name] = { required: Boolean(hd && hd.required), schema: read((hd && (hd.schema || (hd.type ? { type: hd.type } : null))) || null, `${key} ${status} header ${name}`, []) };
        }
        const resp = { headers, media, body: schema };
        if (r.links) { resp.unsupported = [{ construct: 'links', fingerprint: fp(r.links) }]; issues.push({ at: key, construct: 'links', detail: `response ${status} links are not compared field by field`, fingerprint: fp(r.links) }); }
        responses[st] = resp;
      }
      const sec = op.security !== undefined ? op.security : doc.security;
      const ep = {
        method: m.toUpperCase(), path: p, operationId: op.operationId || null,
        requirements: idsIn(...[].concat(op['x-requirements'] || op['x-requirement'] || []), op.summary, op.description),
        auth: authOf(sec, schemes),
        request: { params, body },
        responses,
      };
      if (op.deprecated) ep.deprecated = true;
      if (op.callbacks) { ep.unsupported = [{ construct: 'callbacks', fingerprint: fp(op.callbacks) }]; issues.push({ at: key, construct: 'callbacks', detail: 'callbacks are not compared field by field — a change to them is Unknown', fingerprint: fp(op.callbacks) }); }
      endpoints[key] = ep;
    }
  }
  const webhooks = {};
  for (const [name, w] of Object.entries(doc.webhooks || {})) {
    webhooks[name] = fp(w);
    issues.push({ at: `WEBHOOK ${name}`, construct: 'webhooks', detail: `webhook "${name}" is not compared field by field — a change to it is Unknown`, fingerprint: webhooks[name] });
  }
  const version = swagger2 ? '2.0' : String(doc.openapi);
  return {
    model: MODEL, format: swagger2 ? 'swagger-2' : 'openapi-3', specVersion: version, evidence: 'specification',
    title: (doc.info && doc.info.title) || null, apiVersion: (doc.info && doc.info.version != null) ? String(doc.info.version) : null,
    basePath: basePath && basePath !== '/' ? normPath(basePath) : '', endpoints, components: reader.components,
    ...(Object.keys(webhooks).length ? { webhooks } : {}), issues,
  };
}

// ---------------------------------------------------------------------------------------------
// Postman Collection v2.x
// ---------------------------------------------------------------------------------------------

function postmanAuth(auth) {
  if (!auth) return null;
  const t = String(auth.type || '').toLowerCase();
  if (t === 'noauth') return { required: false, alternatives: [], schemes: [], scopes: [] };
  const one = (s) => ({ required: true, alternatives: [s], schemes: [s], scopes: [] });
  if (t === 'bearer' || t === 'jwt') return one('http:bearer');
  if (t === 'basic') return one('http:basic');
  if (t === 'digest') return one('http:digest');
  if (t === 'apikey') {
    const kv = Array.isArray(auth.apikey) ? Object.fromEntries(auth.apikey.map((x) => [x.key, x.value])) : (auth.apikey || {});
    return one(`apiKey:${kv.in || 'header'}:${String(kv.key || '').toLowerCase()}`);
  }
  if (t === 'oauth2') return one('oauth2:');
  return t ? one(t) : null;
}

/** Postman headers: an array of {key, value}, or one raw "Name: value\r\n…" string. Values are never kept. */
function postmanHeaders(h) {
  if (!h) return [];
  if (typeof h === 'string') return h.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => ({ key: l.split(':')[0].trim(), value: l.slice(l.indexOf(':') + 1).trim() }));
  return Array.isArray(h) ? h : [];
}

function fromPostman(doc, { basePath = '' } = {}) {
  const issues = [];
  const notes = [];
  const endpoints = {};
  const walk = (items, inheritedAuth) => {
    for (const it of items || []) {
      const auth = it.auth !== undefined ? postmanAuth(it.auth) : inheritedAuth;
      if (Array.isArray(it.item)) { walk(it.item, auth); continue; }
      const req = it.request;
      if (!req) continue;
      const method = String((typeof req === 'string' ? 'GET' : req.method) || 'GET').toUpperCase();
      const url = typeof req === 'string' ? req : req.url;
      let rawPath;
      const query = [];
      if (typeof url === 'string') {
        rawPath = url;
        const q = url.split('?')[1];
        if (q) for (const pair of q.split('&')) query.push({ key: decodeURIComponent(pair.split('=')[0]) });
      } else if (url) {
        rawPath = Array.isArray(url.path) ? `/${url.path.map((x) => (typeof x === 'string' ? x : x.value || '')).join('/')}` : (url.raw || '/');
        for (const q of url.query || []) if (!q.disabled) query.push({ key: q.key });
        if (!Array.isArray(url.query) && url.raw && url.raw.includes('?')) for (const pair of url.raw.split('?')[1].split('&')) query.push({ key: decodeURIComponent(pair.split('=')[0]) });
      } else rawPath = '/';
      const p = stripBase(normPath(rawPath), basePath);
      const key = keyOf(method, p);
      const params = {};
      for (const q of query) if (q.key) params[`query:${q.key}`] = { required: null, schema: { type: 'string', inferred: true } };
      let reqAuth = typeof req === 'object' && req.auth !== undefined ? postmanAuth(req.auth) : auth;
      for (const h of postmanHeaders(typeof req === 'object' && req.header)) {
        if (h.disabled) continue;
        const name = String(h.key || '').toLowerCase();
        if (AUTH_HEADERS[name]) {
          const v = String(h.value || '');
          const s = AUTH_HEADERS[name] === 'http' ? `http:${(v.match(/^(bearer|basic|digest|hawk)\b/i) || ['', 'unknown'])[1].toLowerCase()}` : AUTH_HEADERS[name];
          reqAuth = { required: true, alternatives: [s], schemes: [s], scopes: [] };
          continue;
        }
        if (TRANSPORT_HEADERS.has(name)) continue;
        params[`header:${name}`] = { required: null, schema: { type: 'string', inferred: true } };
      }
      let body = null;
      const b = typeof req === 'object' && req.body;
      if (b && b.mode === 'raw') {
        const j = parseJsonBody(b.raw);
        body = { required: null, schema: j.ok ? inferSchema(j.value) : opaque(b.raw) };
      } else if (b && (b.mode === 'urlencoded' || b.mode === 'formdata')) {
        const properties = Object.fromEntries((b[b.mode] || []).filter((x) => !x.disabled).map((x) => [x.key, { type: 'string', inferred: true }]));
        body = { required: null, schema: { type: 'object', properties, present: Object.keys(properties).sort(), inferred: true } };
      } else if (b && b.mode && b.mode !== 'none') {
        body = { required: null, schema: { type: 'unknown', unresolved: `${b.mode} body` } };
      }
      const responses = {};
      for (const ex of it.response || []) {
        const status = String(ex.code || (String(ex.status || '').match(/^\d{3}/) || ['UNKNOWN'])[0]);
        const j = parseJsonBody(ex.body);
        const schema = j.ok ? inferSchema(j.value) : (ex.body ? opaque(ex.body) : null);
        const prev = responses[status];
        const headers = { ...(prev ? prev.headers : {}) };
        for (const h of postmanHeaders(ex.header)) {
          const name = String(h.key || '').toLowerCase();
          if (!TRANSPORT_HEADERS.has(name) && !AUTH_HEADERS[name]) headers[name] = { required: null, schema: { type: 'string', inferred: true } };
        }
        responses[status] = { headers, body: prev ? mergeInferred(prev.body, schema) : schema };
      }
      const prev = endpoints[key];
      // A collection often holds several requests to one endpoint (variations): merged, and said so.
      if (prev) notes.push(`${key}: ${(prev.requestNames || []).length + 1} requests merged (${[...(prev.requestNames || []), it.name].filter(Boolean).join(' · ')})`);
      endpoints[key] = {
        method, path: p, operationId: it.name || null,
        requirements: idsIn(it.name, typeof req === 'object' ? (typeof req.description === 'string' ? req.description : req.description && req.description.content) : null),
        auth: reqAuth || { required: null, alternatives: [], schemes: [], scopes: [] },
        request: { params: { ...(prev ? prev.request.params : {}), ...params }, body: body || (prev ? prev.request.body : null) },
        responses: { ...(prev ? prev.responses : {}), ...responses },
        requestNames: [...(prev ? prev.requestNames || [] : []), it.name].filter(Boolean),
      };
    }
  };
  walk(doc.item, postmanAuth(doc.auth));
  for (const e of Object.values(endpoints)) delete e.requestNames;
  const info = doc.info || {};
  return {
    model: MODEL, format: 'postman-2', specVersion: '2.x', evidence: 'example',
    title: info.name || doc.name || null, apiVersion: info.version ? (typeof info.version === 'string' ? info.version : [info.version.major, info.version.minor, info.version.patch].filter((x) => x !== undefined).join('.')) : null,
    basePath: '', endpoints, components: {}, issues, ...(notes.length ? { notes } : {}),
  };
}

// ---------------------------------------------------------------------------------------------
// Captured evidence — HAR, or { "kind": "api-evidence", "exchanges": [ … ] }
// ---------------------------------------------------------------------------------------------

/**
 * Observed traffic. Paths stay concrete (`/users/42`) — they are matched to an approved contract's
 * templates when compared (diff.collapseToTemplates). Auth is read from what was SENT and what came
 * back: a 2xx without credentials proves auth was not enforced; a 401/403 without credentials proves it
 * is; credentials sent and accepted prove nothing about whether they were needed.
 */
function fromExchanges(exchanges, { basePath = '', sanitize = null, format = 'captured' } = {}) {
  const issues = [];
  const endpoints = {};
  for (const [n, x] of exchanges.entries()) {
    const method = String(x.method || '').toUpperCase();
    if (!method || (!x.url && !x.path)) { issues.push({ at: `exchange ${n + 1}`, detail: 'no method or URL — ignored' }); continue; }
    const p = stripBase(normPath(x.path || x.url), basePath);
    const key = keyOf(method, p);
    const reqHeaders = Object.fromEntries(Object.entries(x.requestHeaders || {}).map(([k, v]) => [k.toLowerCase(), v]));
    const resHeaders = Object.fromEntries(Object.entries(x.responseHeaders || {}).map(([k, v]) => [k.toLowerCase(), v]));
    const status = String(x.status || 'UNKNOWN');
    const authSent = Object.keys(reqHeaders).some((h) => AUTH_HEADERS[h]) || Boolean(x.authenticated);
    const code = Number(x.status);
    let authRequired = null;
    if (!authSent && code >= 200 && code < 300) authRequired = false;
    if (!authSent && (code === 401 || code === 403)) authRequired = true;
    const e = endpoints[key] || { method, path: p, operationId: null, requirements: [], auth: { required: null, alternatives: [], schemes: [], scopes: [], sent: false }, request: { params: {}, body: null }, responses: {}, samples: 0 };
    e.samples += 1;
    if (authSent) e.auth.sent = true;
    if (authRequired === true) e.auth.required = true;
    else if (authRequired === false && e.auth.required !== true) e.auth.required = false;
    for (const h of Object.keys(reqHeaders)) {
      if (AUTH_HEADERS[h]) { const s = AUTH_HEADERS[h] === 'http' ? `http:${(String(reqHeaders[h]).match(/^(bearer|basic|digest|hawk)\b/i) || ['', 'unknown'])[1].toLowerCase()}` : AUTH_HEADERS[h]; if (!e.auth.schemes.includes(s)) e.auth.schemes.push(s); continue; }
      if (!TRANSPORT_HEADERS.has(h)) e.request.params[`header:${h}`] = { required: null, schema: { type: 'string', inferred: true } };
    }
    const q = String(x.url || x.path || '').split('?')[1];
    for (const pair of q ? q.split('&') : []) e.request.params[`query:${decodeURIComponent(pair.split('=')[0])}`] = { required: null, schema: { type: 'string', inferred: true } };
    const rq = parseJsonBody(x.requestBody);
    if (rq.ok) e.request.body = { required: null, schema: mergeInferred(e.request.body && e.request.body.schema, inferSchema(rq.value, sanitize)) };
    const rs = parseJsonBody(x.responseBody);
    const prev = e.responses[status];
    const body = rs.ok ? inferSchema(rs.value, sanitize) : (x.responseBody ? opaque(x.responseBody) : null);
    const headers = { ...(prev ? prev.headers : {}) };
    for (const h of Object.keys(resHeaders)) if (!TRANSPORT_HEADERS.has(h)) headers[h] = { required: null, schema: { type: 'string', inferred: true }, seen: (prev && prev.headers[h] ? prev.headers[h].seen : 0) + 1 };
    e.responses[status] = { headers, body: prev ? mergeInferred(prev.body, body) : body, samples: (prev ? prev.samples : 0) + 1 };
    endpoints[key] = e;
  }
  for (const e of Object.values(endpoints)) { e.auth.schemes.sort(); e.auth.alternatives = [...e.auth.schemes]; }
  return { model: MODEL, format, specVersion: null, evidence: 'observed', title: null, apiVersion: null, basePath: '', endpoints, components: {}, issues };
}

function harExchanges(doc) {
  return ((doc.log && doc.log.entries) || []).map((en) => ({
    method: en.request && en.request.method,
    url: en.request && en.request.url,
    status: en.response && en.response.status,
    requestHeaders: Object.fromEntries(((en.request && en.request.headers) || []).map((h) => [h.name, h.value])),
    responseHeaders: Object.fromEntries(((en.response && en.response.headers) || []).map((h) => [h.name, h.value])),
    requestBody: en.request && en.request.postData && en.request.postData.text,
    responseBody: en.response && en.response.content && en.response.content.text,
  }));
}

const POSTMAN_SCHEMA = /schema\.getpostman\.com/;
const isPostmanItem = (x) => x && typeof x === 'object' && ('request' in x || Array.isArray(x.item));

/** Which format a parsed document is. */
function detectFormat(doc) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return null;
  if (MODELS.includes(doc.model) && doc.endpoints) return 'normalized';
  if (typeof doc.openapi === 'string' && /^3\./.test(doc.openapi)) return 'openapi-3';
  if (String(doc.swagger) === '2.0') return 'swagger-2';
  if (doc.swagger !== undefined || doc.openapi !== undefined) return 'unsupported-openapi';
  if (doc.log && Array.isArray(doc.log.entries)) return 'har';
  if (doc.kind === 'api-evidence' && Array.isArray(doc.exchanges)) return 'captured';
  if (Array.isArray(doc.requests) && (Array.isArray(doc.order) || Array.isArray(doc.folders))) return 'postman-1';
  const info = doc.info || {};
  if (Array.isArray(doc.item) && (POSTMAN_SCHEMA.test(String(info.schema || '')) || POSTMAN_SCHEMA.test(String(info._postman_schema || '')) || info._postman_id || doc.item.some(isPostmanItem))) return 'postman-2';
  return null;
}

/**
 * Reads a contract source's text into the normalized model.
 * @param {string} text
 * @param {{name?: string, basePath?: string, sanitize?: (s: string) => string}} [opts]
 * @returns {object} the model; `issues` lists what could not be read exactly
 */
function normalizeContract(text, opts = {}) {
  let doc;
  const body = String(text).replace(/^﻿/, '');
  const looksJson = /^\s*[[{]/.test(body);
  try {
    doc = looksJson ? JSON.parse(body) : parseYaml(body);
  } catch (err) {
    throw new ContractSourceError(`${opts.name || 'the source'} cannot be read as ${looksJson ? 'JSON' : 'YAML'}: ${err.message}`, 'UNREADABLE_SOURCE');
  }
  const format = detectFormat(doc);
  if (format === 'postman-1') throw new ContractSourceError(`${opts.name || 'the source'} is a Postman Collection v1 — only v2.0 / v2.1 are read. Export it again from Postman as v2.1.`, 'UNSUPPORTED_VERSION');
  if (format === 'unsupported-openapi') throw new ContractSourceError(`${opts.name || 'the source'} declares ${doc.openapi ? `openapi ${doc.openapi}` : `swagger ${doc.swagger}`} — only OpenAPI 3.x and Swagger 2.0 are read.`, 'UNSUPPORTED_VERSION');
  if (!format) {
    throw new ContractSourceError(
      `${opts.name || 'the source'} is not a recognised contract source (OpenAPI 3.x, Swagger 2.0, Postman Collection v2.x, HAR, ` +
      'or {"kind": "api-evidence", "exchanges": [...]}).', 'UNKNOWN_FORMAT'
    );
  }
  if (format === 'normalized') return doc;
  if (format === 'openapi-3' || format === 'swagger-2') {
    if (!doc.paths && !doc.webhooks) throw new ContractSourceError(`${opts.name || 'the source'} has no paths (and no webhooks) — nothing to compare.`, 'EMPTY_CONTRACT');
    return fromOpenApi(doc);
  }
  if (format === 'postman-2') return fromPostman(doc, opts);
  return fromExchanges(format === 'har' ? harExchanges(doc) : doc.exchanges, { ...opts, format });
}

module.exports = {
  MODEL, MODELS, TRANSPORT_HEADERS, UNSUPPORTED_KEYWORDS, ContractSourceError,
  canonical, sourceFingerprint, normalizedFingerprint, normPath, keyOf, stripBase, componentName,
  inferSchema, mergeInferred, detectFormat, normalizeContract,
};
