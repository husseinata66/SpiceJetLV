// Contract drift detection — what differs between two API contracts, and how much it matters.
//
// FOUR KINDS OF COMPARISON, never confused (`mode`):
//   drift        approved → proposed (or two approved versions): what changes for a CONSUMER of the
//                API — the tests, the automation, the clients. Direction matters: a field a client must
//                SEND becoming required breaks it; a field it RECEIVES becoming required does not.
//   conformance  approved → observed traffic (mock or real): where the service's behaviour CONTRADICTS
//                the approved contract. An observation is never an obligation: a field absent from a
//                sample proves nothing unless the contract requires it; an observed value never
//                becomes an expected one.
//   supplier     a Feature's approved contract → one Supplier's approved contract: how that Supplier
//                differs. Reported for that Supplier only.
//   cross-source two APPROVED sources of one scope (e.g. an OpenAPI document and a Postman collection)
//                on the endpoints both describe: any difference is a contradiction a human resolves.
//
// EVERY DIFFERENCE carries the rule that produced it (RULES, below), so a classification is never an
// opinion: Breaking · Potentially breaking · Non-breaking · Unknown (insufficient evidence). A schema
// that cannot be resolved, a composition that cannot be matched member by member, a construct this
// comparison does not model, or a statement only one side makes is Unknown — never assumed compatible.
//
// NAMED SCHEMAS (model api-contract/2) are compared once per pair of names and direction; the result is
// reused at every place the pair occurs, so a change inside a shared schema is reported at each endpoint
// and field it reaches without re-walking it. A cycle is compared at its outermost occurrence.

const crypto = require('crypto');
const { canonical, mergeInferred, normPath, stripBase } = require('./normalize');

const CLASSIFICATIONS = Object.freeze(['Breaking', 'Potentially breaking', 'Non-breaking', 'Unknown']);
/** Severity order for the overall result: Unknown ranks above Potentially breaking — it cannot be shown safe. */
const RANK = Object.freeze({ Breaking: 4, Unknown: 3, 'Potentially breaking': 2, 'Non-breaking': 1 });
const RULES_VERSION = 'api-drift-rules/2';

const B = 'Breaking'; const P = 'Potentially breaking'; const N = 'Non-breaking'; const U = 'Unknown';
/**
 * The rules. `request` / `response` give the classification by direction; `any` for both.
 * `conformance` overrides for observed traffic.
 */
const RULES = Object.freeze({
  'EP-REMOVED': { any: B, text: 'An endpoint (method + path) is no longer in the contract — every caller of it breaks.' },
  'EP-ADDED': { any: N, text: 'A new endpoint — nothing that exists depends on it yet.' },
  'EP-DEPRECATED': { any: N, text: 'The endpoint is now marked deprecated — nothing breaks yet; its removal is announced.' },
  'EP-UNDOCUMENTED': { any: U, text: 'Observed traffic used an endpoint the approved contract does not define.' },
  'EP-UNSUPPORTED-CHANGED': { any: U, text: 'A construct this comparison does not model (callbacks, links) changed — compatibility cannot be determined mechanically.' },
  'WEBHOOK-REMOVED': { any: B, text: 'A webhook is gone — every subscriber to it stops receiving it.' },
  'WEBHOOK-ADDED': { any: N, text: 'A new webhook.' },
  'WEBHOOK-CHANGED': { any: U, text: 'A webhook changed; webhooks are not compared field by field.' },
  'AUTH-ADDED': { any: B, text: 'Authentication became required — unauthenticated callers are now refused.' },
  'AUTH-REMOVED': { any: P, conformance: B, text: 'Authentication is no longer required — a security relaxation; a test expecting 401/403 breaks. Observed: the service accepted a call without credentials that the contract says needs them.' },
  'AUTH-SCHEME-CHANGED': { any: B, text: 'The authentication scheme changed — existing credentials no longer fit.' },
  'AUTH-ALTERNATIVE-REMOVED': { any: B, text: 'One accepted way to authenticate is gone — callers using it are refused.' },
  'AUTH-ALTERNATIVE-ADDED': { any: N, text: 'A further accepted way to authenticate.' },
  'AUTH-SCOPES-ADDED': { any: B, text: 'More authorization scopes are required.' },
  'AUTH-SCOPES-REMOVED': { any: N, text: 'Fewer authorization scopes are required.' },
  'AUTH-UNKNOWN': { any: U, text: 'One side states the authentication requirement, the other states nothing.' },
  'ST-SUCCESS-REMOVED': { any: B, text: 'A success status code is gone — a caller (and an assertion) expecting it breaks.' },
  'ST-ERROR-REMOVED': { any: P, text: 'An error status code is gone — error handling that expects it may break.' },
  'ST-SUCCESS-ADDED': { any: P, text: 'A new success status code — a caller expecting only the old one may mis-handle it.' },
  'ST-ERROR-ADDED': { any: N, text: 'A new documented error status code.' },
  'ST-UNDOCUMENTED-SUCCESS': { any: B, text: 'Observed a success status code the approved contract does not define.' },
  'ST-UNDOCUMENTED-ERROR': { any: P, text: 'Observed an error status code the approved contract does not define.' },
  'PARAM-ADDED-REQUIRED': { any: B, text: 'A new required request parameter — callers that do not send it break.' },
  'PARAM-ADDED-OPTIONAL': { any: N, text: 'A new optional request parameter.' },
  'PARAM-ADDED-UNKNOWN': { any: U, text: 'A new request parameter whose obligation the source does not state.' },
  'PARAM-REMOVED': { any: P, text: 'A request parameter is gone — callers still sending it may be refused or silently ignored.' },
  'PARAM-BECAME-REQUIRED': { any: B, text: 'An optional request parameter became required.' },
  'PARAM-BECAME-OPTIONAL': { any: N, text: 'A required request parameter became optional.' },
  'BODY-ADDED-REQUIRED': { any: B, text: 'A required request body was introduced.' },
  'BODY-ADDED-OPTIONAL': { any: N, text: 'An optional request body was introduced.' },
  'BODY-REMOVED': { any: P, text: 'The request body is gone from the contract.' },
  'BODY-BECAME-REQUIRED': { any: B, text: 'The request body became required.' },
  'BODY-BECAME-OPTIONAL': { any: N, text: 'The request body became optional.' },
  'MEDIA-REMOVED': { request: B, response: P, text: 'A media type is gone — a caller sending it is refused; a caller asking for it may not get it.' },
  'MEDIA-ADDED': { any: N, text: 'A further media type.' },
  'RESP-BODY-REMOVED': { any: B, text: 'A response no longer has a body — everything read from it is gone.' },
  'RESP-BODY-ADDED': { any: N, text: 'A response gained a body.' },
  'HDR-REMOVED-REQUIRED': { any: B, text: 'A required response header is gone.' },
  'HDR-REMOVED-OPTIONAL': { any: P, text: 'An optional response header is gone.' },
  'HDR-ADDED': { any: N, text: 'A new response header.' },
  'HDR-BECAME-OPTIONAL': { any: P, text: 'A required response header became optional.' },
  'HDR-MISSING': { any: B, text: 'A response header the approved contract requires was absent from every observed response.' },
  'SC-TYPE-CHANGED': { any: B, text: 'A field\'s data type changed.' },
  'SC-TYPE-WIDENED': { request: N, response: B, text: 'integer → number: callers may send decimals; readers may receive them.' },
  'SC-TYPE-NARROWED': { request: B, response: N, text: 'number → integer: decimals a caller sends are refused.' },
  'SC-NULLABLE-ADDED': { request: N, response: B, conformance: B, text: 'A field may now be null — a reader that does not expect null breaks. Observed: null was returned for a field the contract says is never null.' },
  'SC-NULLABLE-REMOVED': { request: B, response: N, text: 'A field may no longer be null — callers sending null are refused.' },
  'SC-FIELD-ADDED-REQUIRED': { request: B, response: N, text: 'A new required field.' },
  'SC-FIELD-ADDED-OPTIONAL': { any: N, text: 'A new optional field.' },
  'SC-FIELD-ADDED-UNKNOWN': { request: U, response: N, text: 'A new field whose obligation the source does not state (an example shows presence, not obligation).' },
  'SC-FIELD-REMOVED-REQUIRED': { request: P, response: B, text: 'A required field is gone — every reader (and assertion) of it breaks.' },
  'SC-FIELD-REMOVED-OPTIONAL': { any: P, text: 'An optional field is gone.' },
  'SC-FIELD-REMOVED-UNKNOWN': { request: P, response: U, text: 'A field is gone from an example; whether it was ever required, the source does not state.' },
  'SC-BECAME-REQUIRED': { request: B, response: N, text: 'An optional field became required.' },
  'SC-BECAME-OPTIONAL': { request: N, response: B, text: 'A required field became optional — a reader that relies on it may find it missing.' },
  'SC-FIELD-MISSING': { any: B, text: 'A field the approved contract requires was absent from observed responses.' },
  'SC-FIELD-UNDOCUMENTED': { any: N, text: 'Observed a field the approved contract does not define (additive).' },
  'SC-FIELD-FORBIDDEN': { any: B, text: 'Observed a field the approved contract forbids (additionalProperties: false).' },
  'SC-ENUM-VALUE-REMOVED': { request: B, response: P, text: 'An enum value is gone — callers sending it are refused; an assertion expecting it may never pass.' },
  'SC-ENUM-VALUE-ADDED': { request: N, response: P, text: 'A new enum value — a reader handling a closed set may mis-handle it.' },
  'SC-ENUM-INTRODUCED': { request: B, response: N, text: 'A free value became a closed set.' },
  'SC-ENUM-DROPPED': { request: N, response: P, text: 'A closed set became a free value.' },
  'SC-ENUM-VIOLATION': { any: B, text: 'Observed a value outside the approved enum.' },
  'SC-CONSTRAINT-TIGHTENED': { request: B, response: N, text: 'A constraint tightened (minimum/maximum/length/items/uniqueness).' },
  'SC-CONSTRAINT-LOOSENED': { request: N, response: P, text: 'A constraint loosened — a reader may receive values it did not expect.' },
  'SC-CONSTRAINT-VIOLATION': { any: B, text: 'Observed a value that violates an approved constraint (length or pattern).' },
  'SC-PATTERN-CHANGED': { any: P, text: 'A field\'s pattern changed.' },
  'SC-FORMAT-CHANGED': { any: P, text: 'A field\'s format changed (e.g. date-time → date).' },
  'SC-VARIANT-ADDED': { request: N, response: P, text: 'A oneOf/anyOf alternative was added — a caller may send it; a reader may now receive a shape it does not handle.' },
  'SC-VARIANT-REMOVED': { request: B, response: P, text: 'A oneOf/anyOf alternative was removed — a caller sending it is refused; an assertion expecting it may never pass.' },
  'SC-VARIANTS-CHANGED': { any: U, text: 'A composition changed in a way that cannot be matched member by member (kind, discriminator, or unidentifiable members).' },
  'SC-UNSUPPORTED-CHANGED': { any: U, text: 'A schema keyword this comparison does not model (not, if/then/else, patternProperties, …) changed.' },
  'SC-EXTERNAL-REF': { any: U, text: 'The schema lives in another document, which this comparison does not read — its content is not verified, even when the reference is unchanged.' },
  'SC-UNRESOLVED': { any: U, text: 'A schema could not be resolved (broken $ref, recursive pointer, unsupported construct).' },
  'SC-INSUFFICIENT': { any: U, text: 'The evidence does not show enough to compare (e.g. an example held only null).' },
  'SRC-MISSING': { any: U, text: 'There is no approved contract to compare with.' },
  'SRC-ISSUE': { any: U, text: 'The source could not be read exactly at this point (see the version\'s issues).' },
});

class ContractDiffError extends Error {
  constructor(message, code = 'CONTRACT_DIFF') { super(message); this.name = 'ContractDiffError'; this.code = code; }
}

function classify(rule, direction, mode) {
  const r = RULES[rule];
  if (!r) throw new ContractDiffError(`Unknown drift rule ${rule}.`);
  if (mode === 'conformance' && r.conformance) return r.conformance;
  return r[direction] || r.any;
}
const isSuccess = (status) => /^2/.test(status);
const isError = (status) => /^[45]/.test(status) || status === 'DEFAULT';

// ---------------------------------------------------------------------------------------------
// Endpoint matching — observed concrete paths onto approved templates
// ---------------------------------------------------------------------------------------------

function matchTemplate(method, concrete, baseKeys) {
  const segs = concrete.split('/');
  let best = null;
  for (const k of baseKeys) {
    const [m, p] = [k.slice(0, k.indexOf(' ')), k.slice(k.indexOf(' ') + 1)];
    if (m !== method) continue;
    const ts = p.split('/');
    if (ts.length !== segs.length) continue;
    let wild = 0; let ok = true;
    for (let i = 0; i < ts.length; i += 1) {
      if (ts[i] === '{}') { if (!segs[i]) { ok = false; break; } wild += 1; } else if (ts[i] !== segs[i]) { ok = false; break; }
    }
    if (ok && (!best || wild < best.wild)) best = { key: k, wild };
  }
  return best ? best.key : null;
}

/** Observed endpoints, re-keyed onto the base contract's templates and merged per template. */
function collapseToTemplates(observed, base) {
  const keys = Object.keys(base.endpoints);
  const out = {};
  for (const [key, e] of Object.entries(observed.endpoints)) {
    const method = key.slice(0, key.indexOf(' '));
    let p = key.slice(key.indexOf(' ') + 1);
    if (base.basePath) p = stripBase(p, base.basePath);
    const target = matchTemplate(method, normPath(p), keys) || `${method} ${normPath(p)}`;
    const prev = out[target];
    if (!prev) { out[target] = { ...e, matchedFrom: [key] }; continue; }
    prev.matchedFrom.push(key);
    prev.samples = (prev.samples || 0) + (e.samples || 0);
    if (e.auth.required === true) prev.auth.required = true;
    else if (e.auth.required === false && prev.auth.required !== true) prev.auth.required = false;
    prev.auth.sent = prev.auth.sent || e.auth.sent;
    prev.auth.schemes = [...new Set([...prev.auth.schemes, ...e.auth.schemes])].sort();
    for (const [s, r] of Object.entries(e.responses)) {
      const pr = prev.responses[s];
      prev.responses[s] = pr ? { headers: { ...pr.headers, ...r.headers }, body: mergeInferred(pr.body, r.body), samples: (pr.samples || 0) + (r.samples || 0) } : r;
    }
  }
  return { ...observed, endpoints: out };
}

/** The base response an observed status is checked against: exact, then `2XX`, then `DEFAULT`. */
function responseFor(base, status) {
  if (base.responses[status]) return { key: status, r: base.responses[status] };
  const range = `${String(status)[0]}XX`;
  if (base.responses[range]) return { key: range, r: base.responses[range] };
  if (base.responses.DEFAULT) return { key: 'DEFAULT', r: base.responses.DEFAULT };
  return null;
}

// ---------------------------------------------------------------------------------------------
// The comparison
// ---------------------------------------------------------------------------------------------

const unresolved = (s) => s && (s.type === 'unknown' || s.unresolved);
const show = (v) => (v === undefined ? '—' : typeof v === 'string' ? v : JSON.stringify(v));
const CONSTRAINT_DIR = { minimum: 1, exclusiveMinimum: 1, minLength: 1, minItems: 1, minProperties: 1, maximum: -1, exclusiveMaximum: -1, maxLength: -1, maxItems: -1, maxProperties: -1 };
const asMember = (m) => (typeof m === 'string' ? JSON.parse(m) : m); // api-contract/1 kept members as canonical strings

/** Parses an auth alternative "scheme[scope scope] + scheme" into {schemes, scopes}. */
function altParts(alt) {
  const parts = String(alt).split(' + ');
  const schemes = parts.map((p) => p.replace(/\[.*\]$/, '')).sort();
  const scopes = [...new Set(parts.flatMap((p) => ((p.match(/\[(.*)\]$/) || [])[1] || '').split(' ').filter(Boolean)))].sort();
  return { key: schemes.join(' + '), scopes };
}

function compareContracts(base, candidate, { mode = 'drift' } = {}) {
  if (!['drift', 'conformance', 'supplier', 'cross-source'].includes(mode)) throw new ContractDiffError(`Unknown comparison mode "${mode}".`);
  const items = [];
  const notes = [];
  const groups = new Map(); // named-schema difference (its memo entry) -> the one item reporting it
  const add = (it) => {
    const origin = it.origin;
    if (origin && groups.has(origin)) {
      const g = groups.get(origin);
      g.reach.add(it.endpoint);
      g.occurrences += 1;
      if (g.places.length < 20) g.places.push([it.endpoint, it.location, it.status, it.field].filter(Boolean).join(' '));
      return;
    }
    const classification = classify(it.rule, it.direction || 'any', mode);
    const body = { ...it, classification, rationale: RULES[it.rule].text };
    delete body.origin;
    for (const k of Object.keys(body)) if (body[k] === undefined) delete body[k];
    body.id = `DI-${crypto.createHash('sha256').update(`${it.rule}|${it.endpoint}|${it.location}|${it.status || ''}|${it.param || ''}|${it.field || ''}|${show(it.before)}|${show(it.after)}`).digest('hex').slice(0, 10)}`;
    if (origin) groups.set(origin, { item: body, reach: new Set([it.endpoint]), occurrences: 1, places: [[it.endpoint, it.location, it.status, it.field].filter(Boolean).join(' ')] });
    items.push(body);
  };
  const conformance = mode === 'conformance';
  const cand = conformance ? collapseToTemplates(candidate, base) : candidate;
  // Cross-source between a specification and an example/observation reads the weaker one as conformance.
  const crossConformance = mode === 'cross-source' && base.evidence === 'specification' && cand.evidence !== 'specification';
  const asConformance = conformance || crossConformance;
  const env = { base, cand, mode, asConformance, memo: new Map(), active: new Set() };

  const baseKeys = Object.keys(base.endpoints);
  const candKeys = Object.keys(cand.endpoints);
  const both = baseKeys.filter((k) => cand.endpoints[k]);
  if (mode === 'drift' || mode === 'supplier') {
    for (const k of baseKeys) if (!cand.endpoints[k]) add({ rule: 'EP-REMOVED', endpoint: k, location: 'endpoint', before: 'present', after: 'absent' });
    for (const k of candKeys) if (!base.endpoints[k]) add({ rule: 'EP-ADDED', endpoint: k, location: 'endpoint', before: 'absent', after: 'present' });
    const bw = base.webhooks || {}; const cw = cand.webhooks || {};
    for (const w of Object.keys(bw)) {
      if (!(w in cw)) add({ rule: 'WEBHOOK-REMOVED', endpoint: `WEBHOOK ${w}`, location: 'webhook', before: 'present', after: 'absent' });
      else if (bw[w] !== cw[w]) add({ rule: 'WEBHOOK-CHANGED', endpoint: `WEBHOOK ${w}`, location: 'webhook', before: bw[w], after: cw[w] });
    }
    for (const w of Object.keys(cw)) if (!(w in bw)) add({ rule: 'WEBHOOK-ADDED', endpoint: `WEBHOOK ${w}`, location: 'webhook', before: 'absent', after: 'present' });
  }
  if (conformance) {
    for (const k of candKeys) if (!base.endpoints[k]) add({ rule: 'EP-UNDOCUMENTED', endpoint: k, location: 'endpoint', before: 'not in the approved contract', after: `observed (${(cand.endpoints[k].matchedFrom || [k]).join(', ')})` });
    const unexercised = baseKeys.filter((k) => !cand.endpoints[k]);
    if (unexercised.length) notes.push(`${unexercised.length} approved endpoint(s) were not exercised by this evidence — no conclusion is drawn about them${unexercised.length <= 20 ? `: ${unexercised.join(', ')}` : ''}`);
  }
  const unmodelled = [...new Set([...(base.issues || []), ...(cand.issues || [])].map((i) => i.construct).filter(Boolean))];
  if (unmodelled.length) notes.push(`constructs not compared field by field (a change to them is Unknown): ${unmodelled.join(', ')}`);

  for (const k of both) {
    const b = base.endpoints[k];
    const c = cand.endpoints[k];
    if (!asConformance && !b.deprecated && c.deprecated) add({ rule: 'EP-DEPRECATED', endpoint: k, location: 'endpoint', before: 'active', after: 'deprecated' });
    if (!asConformance && canonical(b.unsupported || []) !== canonical(c.unsupported || [])) add({ rule: 'EP-UNSUPPORTED-CHANGED', endpoint: k, location: 'endpoint', before: (b.unsupported || []).map((u) => u.construct).join(', ') || 'none', after: (c.unsupported || []).map((u) => u.construct).join(', ') || 'none' });
    compareAuth(b.auth || { required: null }, c.auth || { required: null }, k, add, asConformance);

    // Request (never compared against observed traffic: the tests sent it, the contract did not).
    if (!asConformance) {
      const bp = b.request.params; const cp = c.request.params;
      for (const name of Object.keys(bp)) {
        if (!cp[name]) { add({ rule: 'PARAM-REMOVED', endpoint: k, location: 'request.param', param: name, direction: 'request', before: bp[name].required ? 'required' : 'optional', after: 'absent' }); continue; }
        const r0 = bp[name].required; const r1 = cp[name].required;
        if (r0 === false && r1 === true) add({ rule: 'PARAM-BECAME-REQUIRED', endpoint: k, location: 'request.param', param: name, direction: 'request', before: 'optional', after: 'required' });
        if (r0 === true && r1 === false) add({ rule: 'PARAM-BECAME-OPTIONAL', endpoint: k, location: 'request.param', param: name, direction: 'request', before: 'required', after: 'optional' });
        compareSchema(bp[name].schema, cp[name].schema, env, { add, endpoint: k, location: 'request.param', param: name, direction: 'request', field: '$' });
      }
      for (const name of Object.keys(cp)) {
        if (bp[name]) continue;
        const r = cp[name].required;
        add({ rule: r === true ? 'PARAM-ADDED-REQUIRED' : r === false ? 'PARAM-ADDED-OPTIONAL' : 'PARAM-ADDED-UNKNOWN', endpoint: k, location: 'request.param', param: name, direction: 'request', before: 'absent', after: r === true ? 'required' : r === false ? 'optional' : 'present' });
      }
      const bb = b.request.body; const cb = c.request.body;
      if (bb && !cb) add({ rule: 'BODY-REMOVED', endpoint: k, location: 'request.body', direction: 'request', before: 'body', after: 'none' });
      else if (!bb && cb) add({ rule: cb.required === true ? 'BODY-ADDED-REQUIRED' : cb.required === false ? 'BODY-ADDED-OPTIONAL' : 'PARAM-ADDED-UNKNOWN', endpoint: k, location: 'request.body', direction: 'request', before: 'none', after: 'body' });
      else if (bb && cb) {
        if (bb.required === false && cb.required === true) add({ rule: 'BODY-BECAME-REQUIRED', endpoint: k, location: 'request.body', direction: 'request', before: 'optional', after: 'required' });
        if (bb.required === true && cb.required === false) add({ rule: 'BODY-BECAME-OPTIONAL', endpoint: k, location: 'request.body', direction: 'request', before: 'required', after: 'optional' });
        compareMedia(bb.media, cb.media, { add, endpoint: k, location: 'request.body', direction: 'request' });
        compareSchema(bb.schema, cb.schema, env, { add, endpoint: k, location: 'request.body', direction: 'request', field: '$' });
      }
    }

    // Responses and status codes.
    if (asConformance) {
      for (const [status, cr] of Object.entries(c.responses)) {
        const m = responseFor(b, status);
        if (!m) { add({ rule: isSuccess(status) ? 'ST-UNDOCUMENTED-SUCCESS' : 'ST-UNDOCUMENTED-ERROR', endpoint: k, location: 'status', status, before: Object.keys(b.responses).join(', ') || 'none', after: status }); continue; }
        const category = isError(m.key) ? 'error-structure' : undefined;
        for (const [h, hd] of Object.entries(m.r.headers || {})) {
          if (hd.required && !(cr.headers || {})[h]) add({ rule: 'HDR-MISSING', endpoint: k, location: 'response.header', status, param: h, direction: 'response', category, before: 'required', after: 'absent' });
        }
        if (m.r.body && cr.body) compareSchema(m.r.body, cr.body, env, { add, endpoint: k, location: 'response.body', status, direction: 'response', field: '$', category });
        else if (m.r.body && !cr.body && isSuccess(status) && !unresolved(m.r.body)) add({ rule: 'SC-FIELD-MISSING', endpoint: k, location: 'response.body', status, direction: 'response', category, field: '$', before: 'a body', after: 'no body observed' });
      }
    } else {
      const bs = Object.keys(b.responses); const cs = Object.keys(c.responses);
      for (const s of bs) if (!c.responses[s]) add({ rule: isSuccess(s) ? 'ST-SUCCESS-REMOVED' : 'ST-ERROR-REMOVED', endpoint: k, location: 'status', status: s, before: s, after: cs.join(', ') || 'none' });
      for (const s of cs) if (!b.responses[s]) add({ rule: isSuccess(s) ? 'ST-SUCCESS-ADDED' : 'ST-ERROR-ADDED', endpoint: k, location: 'status', status: s, before: bs.join(', ') || 'none', after: s });
      for (const s of bs.filter((x) => c.responses[x])) {
        const br = b.responses[s]; const cr = c.responses[s];
        const category = isError(s) ? 'error-structure' : undefined;
        if (br.body && !cr.body) add({ rule: 'RESP-BODY-REMOVED', endpoint: k, location: 'response.body', status: s, direction: 'response', category, before: 'body', after: 'none' });
        else if (!br.body && cr.body) add({ rule: 'RESP-BODY-ADDED', endpoint: k, location: 'response.body', status: s, direction: 'response', category, before: 'none', after: 'body' });
        else if (br.body && cr.body) {
          compareMedia(br.media, cr.media, { add, endpoint: k, location: 'response.body', status: s, direction: 'response', category });
          compareSchema(br.body, cr.body, env, { add, endpoint: k, location: 'response.body', status: s, direction: 'response', field: '$', category });
        }
        if (canonical(br.unsupported || []) !== canonical(cr.unsupported || [])) add({ rule: 'EP-UNSUPPORTED-CHANGED', endpoint: k, location: 'response', status: s, before: (br.unsupported || []).map((u) => u.construct).join(', ') || 'none', after: (cr.unsupported || []).map((u) => u.construct).join(', ') || 'none' });
        for (const [h, hd] of Object.entries(br.headers || {})) {
          const ch = (cr.headers || {})[h];
          if (!ch) add({ rule: hd.required ? 'HDR-REMOVED-REQUIRED' : 'HDR-REMOVED-OPTIONAL', endpoint: k, location: 'response.header', status: s, param: h, direction: 'response', category, before: hd.required ? 'required' : 'optional', after: 'absent' });
          else if (hd.required === true && ch.required === false) add({ rule: 'HDR-BECAME-OPTIONAL', endpoint: k, location: 'response.header', status: s, param: h, direction: 'response', category, before: 'required', after: 'optional' });
        }
        for (const h of Object.keys(cr.headers || {})) if (!(br.headers || {})[h]) add({ rule: 'HDR-ADDED', endpoint: k, location: 'response.header', status: s, param: h, direction: 'response', category, before: 'absent', after: 'present' });
      }
    }
  }

  // Cross-source: a difference between two approved sources is a contradiction, whatever its size.
  // A named-schema difference reaching several endpoints is one item: `endpoints` lists them all.
  for (const g of groups.values()) {
    if (g.reach.size > 1 || g.occurrences > 1) {
      g.item.endpoints = [...g.reach].sort();
      g.item.occurrences = g.occurrences;
      g.item.places = g.places;
    }
  }
  const kept = mode === 'cross-source' ? items.filter((i) => i.rule !== 'SC-FIELD-UNDOCUMENTED' || !crossConformance) : items;
  const counts = Object.fromEntries(CLASSIFICATIONS.map((c) => [c, kept.filter((i) => i.classification === c).length]));
  const worst = kept.reduce((w, i) => (RANK[i.classification] > (RANK[w] || 0) ? i.classification : w), null);
  return {
    mode, rulesVersion: RULES_VERSION,
    endpointsCompared: both.length,
    unchanged: kept.length === 0,
    classification: worst || 'Unchanged',
    counts,
    items: kept.sort((x, y) => RANK[y.classification] - RANK[x.classification] || x.endpoint.localeCompare(y.endpoint) || String(x.field || '').localeCompare(String(y.field || ''))),
    notes,
  };
}

/** Authentication: alternatives (OR) of scheme sets (AND), with scopes. */
function compareAuth(ba, ca, k, add, asConformance) {
  if (asConformance) {
    if (ba.required === true && ca.required === false) add({ rule: 'AUTH-REMOVED', endpoint: k, location: 'auth', before: 'required', after: 'a call without credentials succeeded' });
    return;
  }
  if (ba.required === null || ca.required === null) {
    if (ba.required !== ca.required) add({ rule: 'AUTH-UNKNOWN', endpoint: k, location: 'auth', before: show(ba.required), after: show(ca.required) });
    return;
  }
  const balt = ba.alternatives || (ba.schemes && ba.schemes.length ? [ba.schemes.join(' + ')] : []);
  const calt = ca.alternatives || (ca.schemes && ca.schemes.length ? [ca.schemes.join(' + ')] : []);
  if (!ba.required && ca.required) { add({ rule: 'AUTH-ADDED', endpoint: k, location: 'auth', before: balt.length ? `optional (${balt.join(' | ')})` : 'not required', after: `required (${calt.join(' | ') || 'unnamed scheme'})` }); return; }
  if (ba.required && !ca.required) { add({ rule: 'AUTH-REMOVED', endpoint: k, location: 'auth', before: `required (${balt.join(' | ')})`, after: calt.length ? `optional (${calt.join(' | ')})` : 'not required' }); return; }
  const bm = new Map(balt.map((a) => [altParts(a).key, altParts(a)]));
  const cm = new Map(calt.map((a) => [altParts(a).key, altParts(a)]));
  const removed = [...bm.keys()].filter((x) => !cm.has(x));
  const added = [...cm.keys()].filter((x) => !bm.has(x));
  if (ba.required && removed.length === 1 && added.length === 1 && bm.size === 1 && cm.size === 1) {
    add({ rule: 'AUTH-SCHEME-CHANGED', endpoint: k, location: 'auth', before: removed[0], after: added[0] });
  } else {
    for (const r of removed) add({ rule: 'AUTH-ALTERNATIVE-REMOVED', endpoint: k, location: 'auth', before: r, after: [...cm.keys()].join(' | ') || 'none' });
    for (const a of added) add({ rule: 'AUTH-ALTERNATIVE-ADDED', endpoint: k, location: 'auth', before: [...bm.keys()].join(' | ') || 'none', after: a });
  }
  for (const [key, b] of bm) {
    const c = cm.get(key);
    if (!c) continue;
    const more = c.scopes.filter((x) => !b.scopes.includes(x));
    const fewer = b.scopes.filter((x) => !c.scopes.includes(x));
    if (more.length) add({ rule: 'AUTH-SCOPES-ADDED', endpoint: k, location: 'auth', param: key, before: b.scopes.join(' ') || '—', after: more.join(' ') });
    if (fewer.length) add({ rule: 'AUTH-SCOPES-REMOVED', endpoint: k, location: 'auth', param: key, before: fewer.join(' '), after: c.scopes.join(' ') || '—' });
  }
}

function compareMedia(bm, cm, at) {
  if (!Array.isArray(bm) || !Array.isArray(cm)) return;
  for (const m of bm) if (!cm.includes(m)) at.add({ ...at, rule: 'MEDIA-REMOVED', param: m, before: bm.join(', '), after: cm.join(', ') || 'none', add: undefined });
  for (const m of cm) if (!bm.includes(m)) at.add({ ...at, rule: 'MEDIA-ADDED', param: m, before: bm.join(', ') || 'none', after: cm.join(', '), add: undefined });
}

// ---------------------------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------------------------

const deref = (model, s) => (s && s.$ref && model.components ? model.components[s.$ref] : s);
const flagOf = (model, s, flag) => Boolean(s && (s[flag] || (s.$ref && model.components && model.components[s.$ref] && model.components[s.$ref][flag])));
const bareName = (n) => String(n).replace(/^~[^~]+~/, '');
const memberKey = (m) => (m.$ref ? `ref:${bareName(m.$ref)}` : m.ref ? `ref:${bareName(m.ref)}` : `type:${m.type}${m.format ? `:${m.format}` : ''}`);

/** How many places one named-schema difference lists, per endpoint location, beside the shortest. */
const PATH_CAP = 5;

/**
 * A pair of named schemas, compared ONCE per (base name, candidate name, direction, nullability): its own
 * differences, plus markers for the named pairs nested in it. Returns the memo key, or null.
 */
function pairKey(b, c, env, direction) {
  const B0 = b.$ref ? deref(env.base, b) : b;
  const C0 = c.$ref ? deref(env.cand, c) : c;
  if (B0 === undefined || C0 === undefined) return null;
  const key = `${b.$ref ? `#${b.$ref}` : canonical(b)}|${c.$ref ? `#${c.$ref}` : canonical(c)}|${direction || 'any'}|${b.nullable ? 1 : 0}${c.nullable ? 1 : 0}`;
  if (!env.memo.has(key) && !env.active.has(key)) {
    const rel = [];
    env.active.add(key);
    compareSchemaInner({ ...B0, ...(b.nullable ? { nullable: true } : {}) }, { ...C0, ...(c.nullable ? { nullable: true } : {}) }, env, { direction, field: '$', collect: rel });
    env.active.delete(key);
    env.memo.set(key, rel);
  }
  return key;
}

/**
 * Compares one schema location; `loc.add` records each difference. A difference inside a named schema is
 * reported once per endpoint location, at the SHORTEST path that reaches it (breadth first), with up to
 * PATH_CAP further paths in `paths`. Replaying it at every path would grow exponentially on real,
 * densely cross-referenced specifications (Stripe).
 */
function compareSchema(b, c, env, loc) {
  if (!b || !c) return;
  const root = [];
  if (env.asConformance) conformSchema(b, c, env, { direction: loc.direction, field: '$', collect: root });
  else if (b.$ref || c.$ref) {
    const key = pairKey(b, c, env, loc.direction);
    if (!key) { emitAt(loc, { rule: 'SC-UNRESOLVED', field: '$', before: b.$ref ? `ref ${b.$ref}` : b.type, after: c.$ref ? `ref ${c.$ref}` : c.type }, '$', []); return; }
    root.push({ child: key, field: '$' });
  } else compareSchemaInner(b, c, env, { direction: loc.direction, field: '$', collect: root });
  // Breadth first: each named pair is expanded at its first (shortest) place; later places are listed.
  const queue = [{ entries: root, prefix: '$' }];
  const places = new Map();
  const pending = [];
  for (let q = 0; q < queue.length; q += 1) {
    const { entries, prefix } = queue[q];
    for (const e of entries) {
      const at = `${prefix}${(e.field || '$').slice(1)}`;
      if (!e.child) { pending.push([e, at, queue[q].also || [], q > 0]); continue; }
      const seen = places.get(e.child);
      if (seen) { if (seen.length < PATH_CAP) seen.push(at); continue; }
      const also = [];
      places.set(e.child, also);
      queue.push({ entries: env.memo.get(e.child) || [], prefix: at, also });
    }
  }
  // Emitted after the walk, when every further place of each named schema is known.
  for (const [e, at, also, inNamed] of pending) emitAt(loc, e, at, also, inNamed);
}

/** Records a relative difference at its absolute place, with the other places its named schema occurs. */
function emitAt(loc, it, field, also, inNamed) {
  const extra = {};
  // A difference inside a named schema is the SAME difference wherever the schema is used: its memo entry
  // identifies it, so compareContracts can report it once with every endpoint it reaches.
  if (inNamed) extra.origin = it;
  if (also && also.length) extra.paths = also.map((p) => `${p}${(it.field || '$').slice(1)}`).slice(0, PATH_CAP);
  loc.add({ endpoint: loc.endpoint, location: loc.location, status: loc.status, param: loc.param, direction: loc.direction, category: loc.category, ...it, ...extra, field });
}

function compareSchemaInner(b, c, env, ctx) {
  const { field } = ctx;
  const put = (extra) => ctx.collect.push({ field, ...extra });
  // A nested named pair is a marker (compared once, expanded breadth first); anything else recurses here.
  const sub = (bb, cc, f) => {
    if (!bb || !cc) return;
    if (bb.$ref || cc.$ref) {
      const key = pairKey(bb, cc, env, ctx.direction);
      if (!key) { ctx.collect.push({ rule: 'SC-UNRESOLVED', field: f, before: bb.$ref ? `ref ${bb.$ref}` : bb.type, after: cc.$ref ? `ref ${cc.$ref}` : cc.type }); return; }
      ctx.collect.push({ child: key, field: f });
      return;
    }
    compareSchemaInner(bb, cc, env, { ...ctx, field: f });
  };
  if (b.external || c.external) { put({ rule: 'SC-EXTERNAL-REF', before: b.unresolved || b.type, after: c.unresolved || c.type }); return; }
  if (unresolved(b) || unresolved(c)) {
    if (b.opaque && c.opaque && b.opaque === c.opaque) return; // the same unreadable (non-JSON) body on both sides
    if (canonical(b) !== canonical(c) || b.unresolved || c.unresolved) put({ rule: 'SC-UNRESOLVED', before: b.unresolved || b.type, after: c.unresolved || c.type });
    return;
  }
  if (env.asConformance) { conformSchema(b, c, env, ctx); return; }
  if (canonical(b.unsupported || []) !== canonical(c.unsupported || [])) put({ rule: 'SC-UNSUPPORTED-CHANGED', before: (b.unsupported || []).map((u) => u.construct).join(', ') || 'none', after: (c.unsupported || []).map((u) => u.construct).join(', ') || 'none' });
  if (b.variants || c.variants) { compareVariants(b, c, env, ctx, put, sub); return; }
  if (b.type === 'ref' || c.type === 'ref') {
    if (b.ref !== c.ref) put({ rule: 'SC-UNRESOLVED', before: `ref ${b.ref}`, after: `ref ${c.ref}` });
    return;
  }
  if (b.type === 'null' && c.type !== 'null') { put({ rule: 'SC-INSUFFICIENT', before: 'only null seen', after: c.type }); return; }
  if (c.type === 'null' && b.type !== 'null') {
    if (!b.nullable) put({ rule: 'SC-NULLABLE-ADDED', before: `${b.type}, not nullable`, after: 'null' });
    return;
  }
  if (b.type !== c.type) {
    if (b.type === 'integer' && c.type === 'number') put({ rule: 'SC-TYPE-WIDENED', before: b.type, after: c.type });
    else if (b.type === 'number' && c.type === 'integer') put({ rule: 'SC-TYPE-NARROWED', before: b.type, after: c.type });
    else if (b.type === 'any') put({ rule: 'SC-CONSTRAINT-TIGHTENED', before: 'any', after: c.type });
    else if (c.type === 'any') put({ rule: 'SC-CONSTRAINT-LOOSENED', before: b.type, after: 'any' });
    else put({ rule: 'SC-TYPE-CHANGED', before: b.type === 'mixed' ? b.types.join('|') : b.type, after: c.type === 'mixed' ? c.types.join('|') : c.type });
    return;
  }
  if (!b.nullable && c.nullable) put({ rule: 'SC-NULLABLE-ADDED', before: 'not nullable', after: 'nullable' });
  if (b.nullable && !c.nullable && !c.inferred) put({ rule: 'SC-NULLABLE-REMOVED', before: 'nullable', after: 'not nullable' });
  if ((b.format || null) !== (c.format || null) && !b.inferred && !c.inferred) put({ rule: 'SC-FORMAT-CHANGED', before: b.format || '—', after: c.format || '—' });
  if (!b.inferred && !c.inferred) {
    if (b.enum && c.enum) {
      for (const v of b.enum) if (!c.enum.includes(v)) put({ rule: 'SC-ENUM-VALUE-REMOVED', before: v, after: c.enum.join(', '), value: v });
      for (const v of c.enum) if (!b.enum.includes(v)) put({ rule: 'SC-ENUM-VALUE-ADDED', before: b.enum.join(', '), after: v, value: v });
    } else if (!b.enum && c.enum) put({ rule: 'SC-ENUM-INTRODUCED', before: 'free value', after: c.enum.join(', ') });
    else if (b.enum && !c.enum) put({ rule: 'SC-ENUM-DROPPED', before: b.enum.join(', '), after: 'free value' });
    const bc = b.constraints || {}; const cc = c.constraints || {};
    for (const key of [...new Set([...Object.keys(bc), ...Object.keys(cc)])]) {
      const x = bc[key]; const y = cc[key];
      if (canonical(x === undefined ? null : x) === canonical(y === undefined ? null : y)) continue;
      if (key === 'pattern') { put({ rule: 'SC-PATTERN-CHANGED', before: show(x), after: show(y) }); continue; }
      let tighter;
      if (CONSTRAINT_DIR[key]) {
        if (x === undefined) tighter = true;
        else if (y === undefined) tighter = false;
        else tighter = CONSTRAINT_DIR[key] > 0 ? y > x : y < x;
      } else if (key === 'uniqueItems') tighter = Boolean(y) && !x;
      else { put({ rule: 'SC-PATTERN-CHANGED', before: `${key} ${show(x)}`, after: `${key} ${show(y)}` }); continue; }
      put({ rule: tighter ? 'SC-CONSTRAINT-TIGHTENED' : 'SC-CONSTRAINT-LOOSENED', before: `${key} ${show(x)}`, after: `${key} ${show(y)}` });
    }
    if (b.additionalProperties !== false && c.additionalProperties === false) put({ rule: 'SC-CONSTRAINT-TIGHTENED', before: 'extra fields allowed', after: 'additionalProperties: false' });
    if (b.additionalProperties === false && c.additionalProperties !== false) put({ rule: 'SC-CONSTRAINT-LOOSENED', before: 'additionalProperties: false', after: 'extra fields allowed' });
    if (b.additionalProperties && typeof b.additionalProperties === 'object' && c.additionalProperties && typeof c.additionalProperties === 'object') sub(b.additionalProperties, c.additionalProperties, `${field}.*`);
  }
  if (b.type === 'object' && (b.properties || c.properties)) {
    // What a direction sees: a request never carries readOnly fields; a response never carries writeOnly ones.
    const hidden = (model, v) => (ctx.direction === 'request' && flagOf(model, v, 'readOnly')) || (ctx.direction === 'response' && flagOf(model, v, 'writeOnly'));
    const bp = Object.fromEntries(Object.entries(b.properties || {}).filter(([, v]) => !hidden(env.base, v)));
    const cp = Object.fromEntries(Object.entries(c.properties || {}).filter(([, v]) => !hidden(env.cand, v)));
    const breq = new Set((b.required || []).filter((k) => bp[k] || !(b.properties || {})[k]));
    const creq = new Set((c.required || []).filter((k) => cp[k] || !(c.properties || {})[k]));
    for (const k of Object.keys(bp)) {
      const f = `${field}.${k}`;
      if (!cp[k]) {
        if (c.properties === undefined) continue; // a free-form object says nothing about its fields
        const rule = b.inferred || c.inferred ? 'SC-FIELD-REMOVED-UNKNOWN' : breq.has(k) ? 'SC-FIELD-REMOVED-REQUIRED' : 'SC-FIELD-REMOVED-OPTIONAL';
        ctx.collect.push({ rule, field: f, before: b.inferred ? 'present' : breq.has(k) ? 'required' : 'optional', after: (c.properties || {})[k] ? `${ctx.direction === 'request' ? 'readOnly' : 'writeOnly'} (not ${ctx.direction === 'request' ? 'sent' : 'returned'})` : 'absent' });
        continue;
      }
      if (!b.inferred && !c.inferred) {
        if (!breq.has(k) && creq.has(k)) ctx.collect.push({ rule: 'SC-BECAME-REQUIRED', field: f, before: 'optional', after: 'required' });
        if (breq.has(k) && !creq.has(k)) ctx.collect.push({ rule: 'SC-BECAME-OPTIONAL', field: f, before: 'required', after: 'optional' });
      }
      sub(bp[k], cp[k], f);
    }
    for (const k of Object.keys(cp)) {
      if (bp[k] || b.properties === undefined) continue;
      const rule = b.inferred || c.inferred ? 'SC-FIELD-ADDED-UNKNOWN' : creq.has(k) ? 'SC-FIELD-ADDED-REQUIRED' : 'SC-FIELD-ADDED-OPTIONAL';
      ctx.collect.push({ rule, field: `${field}.${k}`, before: (b.properties || {})[k] ? `${ctx.direction === 'request' ? 'readOnly' : 'writeOnly'} before` : 'absent', after: c.inferred ? 'present' : creq.has(k) ? 'required' : 'optional' });
    }
  }
  if (b.type === 'array' && b.items && c.items) sub(b.items, c.items, `${field}[]`);
}

/** oneOf / anyOf (and an allOf kept as a composition): matched member by member, or Unknown. */
function compareVariants(b, c, env, ctx, put, sub) {
  const { field } = ctx;
  const bv = b.variants || null; const cv = c.variants || null;
  if (bv && cv && bv.kind !== cv.kind) { put({ rule: 'SC-VARIANTS-CHANGED', before: bv.kind, after: cv.kind }); return; }
  const kind = (bv || cv).kind;
  if (kind === 'allOf') { if (canonical(b) !== canonical(c)) put({ rule: 'SC-VARIANTS-CHANGED', before: 'allOf composition', after: 'changed' }); return; }
  if ((b.discriminator || null) !== (c.discriminator || null)) { put({ rule: 'SC-VARIANTS-CHANGED', before: 'discriminator', after: 'changed discriminator' }); return; }
  const strip = (x) => { const y = { ...x }; delete y.variants; delete y.discriminator; delete y.nullable; return y.type === 'variants' ? null : y; };
  const bm = bv ? bv.of.map(asMember) : [strip(b)].filter((x) => x && x.type !== 'any');
  const cm = cv ? cv.of.map(asMember) : [strip(c)].filter((x) => x && x.type !== 'any');
  if (!bm.length || !cm.length) {
    if (canonical(bm) !== canonical(cm)) put({ rule: 'SC-VARIANTS-CHANGED', before: `${kind} of ${bm.length}`, after: `${kind} of ${cm.length}` });
    return;
  }
  const m = matchMembers(bm, cm, env);
  if (!m) {
    put({ rule: 'SC-VARIANTS-CHANGED', before: `${kind} of ${bm.length}`, after: `${kind} of ${cm.length} (members cannot be paired reliably)` });
    return;
  }
  if (!b.nullable && c.nullable) put({ rule: 'SC-NULLABLE-ADDED', before: 'not nullable', after: 'nullable' });
  if (b.nullable && !c.nullable) put({ rule: 'SC-NULLABLE-REMOVED', before: 'nullable', after: 'not nullable' });
  const label = (x, n, list) => { const k = memberKey(x); return list.filter((y) => memberKey(y) === k).length > 1 ? `${k}#${n + 1}` : k; };
  for (const [i, j] of m.pairs) sub(bm[i], cm[j], `${field}<${label(bm[i], i, bm)}>`);
  for (const i of m.removed) put({ rule: 'SC-VARIANT-REMOVED', field: `${field}<${label(bm[i], i, bm)}>`, before: memberKey(bm[i]) + (bm[i].enum ? ` [${bm[i].enum.join(', ')}]` : ''), after: cm.map(memberKey).join(', ') });
  for (const j of m.added) put({ rule: 'SC-VARIANT-ADDED', field: `${field}<${label(cm[j], j, cm)}>`, before: bm.map(memberKey).join(', '), after: memberKey(cm[j]) + (cm[j].enum ? ` [${cm[j].enum.join(', ')}]` : '') });
}

/** What tells one same-typed member from another: its enum values and property names. */
function memberFeatures(x, model) {
  const d = x.$ref ? deref(model, x) || {} : x;
  return new Set([...(d.enum || []).map((v) => `e:${v}`), ...Object.keys(d.properties || {}).map((p) => `p:${p}`), ...(d.required || []).map((p) => `r:${p}`)]);
}

/**
 * Pairs base members with candidate members: by key (a named schema, or a type) when the key is unique on
 * both sides; within a key shared by several members, identical members first, then each remaining one
 * only to its MUTUAL, UNIQUE best match by shared enum values / property names. Returns null when any
 * member cannot be paired, added or removed with certainty.
 */
function matchMembers(bm, cm, env) {
  const pairs = []; const removed = []; const added = [];
  const groups = new Map();
  bm.forEach((x, i) => { const k = memberKey(x); if (!groups.has(k)) groups.set(k, { b: [], c: [] }); groups.get(k).b.push(i); });
  cm.forEach((x, j) => { const k = memberKey(x); if (!groups.has(k)) groups.set(k, { b: [], c: [] }); groups.get(k).c.push(j); });
  for (const g of groups.values()) {
    if (g.b.length <= 1 && g.c.length <= 1) {
      if (g.b.length && g.c.length) pairs.push([g.b[0], g.c[0]]);
      else if (g.b.length) removed.push(g.b[0]); else added.push(g.c[0]);
      continue;
    }
    let lb = [...g.b]; let lc = [...g.c];
    for (const i of [...lb]) {
      const j = lc.find((x) => canonical(cm[x]) === canonical(bm[i]));
      if (j !== undefined) { pairs.push([i, j]); lb = lb.filter((x) => x !== i); lc = lc.filter((x) => x !== j); }
    }
    if (!lb.length || !lc.length) { removed.push(...lb); added.push(...lc); continue; }
    const fb = new Map(lb.map((i) => [i, memberFeatures(bm[i], env.base)]));
    const fc = new Map(lc.map((j) => [j, memberFeatures(cm[j], env.cand)]));
    const sim = (i, j) => { const a = fb.get(i); const c = fc.get(j); const inter = [...a].filter((x) => c.has(x)).length; const uni = new Set([...a, ...c]).size; return uni ? inter / uni : 0; };
    const best = (from, to, score) => {
      const out = new Map();
      for (const x of from) {
        const scores = to.map((y) => [y, score(x, y)]).sort((p, q) => q[1] - p[1]);
        if (!scores.length || scores[0][1] === 0) { out.set(x, null); continue; }
        if (scores.length > 1 && scores[1][1] === scores[0][1]) return null; // a tie: not reliable
        out.set(x, scores[0][0]);
      }
      return out;
    };
    const bb = best(lb, lc, (i, j) => sim(i, j));
    const cb = best(lc, lb, (j, i) => sim(i, j));
    if (!bb || !cb) return null;
    for (const i of lb) {
      const j = bb.get(i);
      if (j === null) { removed.push(i); continue; }
      if (cb.get(j) !== i) return null; // not mutual
      pairs.push([i, j]);
    }
    for (const j of lc) if (cb.get(j) === null) added.push(j); else if (!pairs.some((p) => p[1] === j)) return null;
  }
  // The same definition under another name — a renamed named schema, or a schema that was inline on one side
  // and named on the other — is the same member, not a removal plus an addition.
  const definition = (model, x) => { const d = { ...(x.$ref ? deref(model, x) || {} : x) }; delete d.nullable; return canonical(d); };
  for (const i of [...removed]) {
    const def = definition(env.base, bm[i]);
    const same = added.filter((j) => definition(env.cand, cm[j]) === def);
    if (same.length === 1) { pairs.push([i, same[0]]); removed.splice(removed.indexOf(i), 1); added.splice(added.indexOf(same[0]), 1); }
  }
  return { pairs, removed, added };
}

/** Observed values against an approved schema: only contradictions are reported. */
function conformSchema(b0, c, env, ctx) {
  const b = b0.$ref ? { ...deref(env.base, b0), ...(b0.nullable ? { nullable: true } : {}) } : b0;
  const { field } = ctx;
  const put = (extra) => ctx.collect.push({ field, ...extra });
  if (!b || b.type === 'unknown') { put({ rule: b && b.external ? 'SC-EXTERNAL-REF' : 'SC-UNRESOLVED', before: b ? b.unresolved : 'missing', after: 'observed' }); return; }
  if (b.type === 'any' || b.type === 'ref') return; // nothing a sample can contradict mechanically
  if (c.type === 'null' || c.nullable) {
    if (!b.nullable) put({ rule: 'SC-NULLABLE-ADDED', before: `${b.type}, never null`, after: 'null observed' });
    if (c.type === 'null') return;
  }
  if (b.variants) {
    if (b.variants.kind === 'allOf') { put({ rule: 'SC-VARIANTS-CHANGED', before: 'allOf composition', after: 'observed value not checked against it' }); return; }
    const members = b.variants.of.map(asMember).map((m) => (m.$ref ? deref(env.base, m) : m)).filter(Boolean);
    const fits = members.filter((m) => m.type === 'any' || m.type === c.type || (m.type === 'number' && c.type === 'integer') || m.type === 'variants');
    if (!fits.length) { put({ rule: 'SC-TYPE-CHANGED', before: `${b.variants.kind} of ${members.map((m) => m.type).join('|')}`, after: `${c.type} observed` }); return; }
    const results = fits.map((m) => { const out = []; conformSchema(m, c, env, { ...ctx, collect: out }); return out; });
    const clean = results.find((r) => r.every((x) => classify(x.rule, ctx.direction || 'any', 'conformance') === 'Non-breaking'));
    if (clean) { ctx.collect.push(...clean); return; }
    if (results.length === 1) { ctx.collect.push(...results[0]); return; }
    put({ rule: 'SC-VARIANTS-CHANGED', before: `${b.variants.kind} of ${fits.length} candidate shapes`, after: 'the observed value fits none of them cleanly' });
    return;
  }
  const ok = (bt, ct) => bt === ct || (bt === 'number' && ct === 'integer') || bt === 'any';
  if (c.type === 'mixed' ? c.types.some((t) => !ok(b.type, t)) : !ok(b.type, c.type)) {
    put({ rule: 'SC-TYPE-CHANGED', before: b.type === 'mixed' ? b.types.join('|') : b.type, after: `${c.type === 'mixed' ? c.types.join('|') : c.type} observed` });
    return;
  }
  if (b.enum && c.samples) for (const v of c.samples) if (!b.enum.includes(v)) put({ rule: 'SC-ENUM-VIOLATION', before: b.enum.join(', '), after: v, value: v });
  const k = b.constraints || {};
  for (const v of c.samples || []) {
    if ((k.maxLength !== undefined && v.length > k.maxLength) || (k.minLength !== undefined && v.length < k.minLength)) put({ rule: 'SC-CONSTRAINT-VIOLATION', before: `length ${k.minLength ?? 0}..${k.maxLength ?? '∞'}`, after: `length ${v.length}` });
    if (k.pattern) { let re = null; try { re = new RegExp(k.pattern, 'u'); } catch { /* not a JS pattern */ } if (re && !re.test(v)) put({ rule: 'SC-CONSTRAINT-VIOLATION', before: `pattern ${k.pattern}`, after: 'a value outside it' }); }
  }
  if (b.type === 'object' && b.properties && c.properties) {
    const visible = Object.keys(b.properties).filter((n) => !flagOf(env.base, b.properties[n], 'writeOnly'));
    const req = new Set(b.required || []);
    const always = new Set(c.present || Object.keys(c.properties));
    for (const name of visible) {
      const f = `${field}.${name}`;
      if (req.has(name) && !always.has(name)) ctx.collect.push({ rule: 'SC-FIELD-MISSING', field: f, before: 'required', after: c.properties[name] ? 'absent from some responses' : 'absent' });
      if (c.properties[name]) conformSchema(b.properties[name], c.properties[name], env, { ...ctx, field: f });
    }
    for (const name of Object.keys(c.properties)) {
      if (b.properties[name]) continue;
      ctx.collect.push({ rule: b.additionalProperties === false ? 'SC-FIELD-FORBIDDEN' : 'SC-FIELD-UNDOCUMENTED', field: `${field}.${name}`, before: 'not in the contract', after: 'observed' });
    }
  }
  if (b.type === 'array' && b.items && c.items) conformSchema(b.items, c.items, env, { ...ctx, field: `${field}[]` });
}

/** The comparison for a scope that has no approved contract — honest, never a pass. */
function missingBaseline(candidateLabel) {
  const it = { rule: 'SRC-MISSING', endpoint: '*', location: 'source', before: 'no approved contract', after: candidateLabel, classification: U, rationale: RULES['SRC-MISSING'].text };
  it.id = `DI-${crypto.createHash('sha256').update(`SRC-MISSING|${candidateLabel}`).digest('hex').slice(0, 10)}`;
  return { mode: 'none', rulesVersion: RULES_VERSION, endpointsCompared: 0, unchanged: false, classification: U, counts: { Breaking: 0, 'Potentially breaking': 0, 'Non-breaking': 0, Unknown: 1 }, items: [it], notes: ['nothing can be concluded until a contract is approved for this scope'] };
}

/** Every endpoint a difference reaches (one, or all of a shared named schema's). */
const endpointsOf = (item) => [...new Set([item.endpoint, ...(item.endpoints || [])])];

module.exports = { endpointsOf, CLASSIFICATIONS, RANK, RULES, RULES_VERSION, ContractDiffError, classify, matchTemplate, collapseToTemplates, compareContracts, missingBaseline };
