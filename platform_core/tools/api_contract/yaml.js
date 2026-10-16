// A YAML reader for API contracts (OpenAPI / Swagger written as YAML). No dependency.
//
// WHY THIS EXISTS
// The platform has no runtime dependency, and a parser that differed between machines would change a
// contract's normalized fingerprint — drift that is not there. An API description needs the YAML 1.2
// core: block mappings and sequences; plain, single- and double-quoted scalars, each of which may span
// lines; flow collections, which may span lines; literal and folded block scalars with chomping and
// indentation indicators; comments. This reads exactly that, character by character.
//
// Anything outside it — anchors, aliases, tags, merge keys, complex (`?`) keys, multiple documents,
// directives, tab indentation — is REFUSED with its line number, never guessed.
//
// Phase 7.1: verified against real specifications (GitHub REST, Stripe, OpenAPI examples, Swagger
// Petstore), whose parse must equal both their authors' own JSON rendering and a mature YAML library.

class YamlError extends Error {
  constructor(message, line) {
    super(line ? `YAML line ${line}: ${message}` : message);
    this.name = 'YamlError';
    this.code = 'YAML_UNSUPPORTED';
    this.line = line || null;
  }
}

const WS = (c) => c === ' ' || c === '\t';
const EOL = (c) => c === '\n' || c === undefined;
const FLOW = ',[]{}';

/** YAML 1.2 core-schema resolution of a plain scalar. */
function resolvePlain(s) {
  if (s === '' || s === '~' || s === 'null' || s === 'Null' || s === 'NULL') return null;
  if (s === 'true' || s === 'True' || s === 'TRUE') return true;
  if (s === 'false' || s === 'False' || s === 'FALSE') return false;
  if (/^[-+]?[0-9]+$/.test(s)) return Number(s);
  if (/^0o[0-7]+$/.test(s)) return parseInt(s.slice(2), 8);
  if (/^0x[0-9a-fA-F]+$/.test(s)) return parseInt(s.slice(2), 16);
  if (/^[-+]?(\.[0-9]+|[0-9]+(\.[0-9]*)?)([eE][-+]?[0-9]+)?$/.test(s)) return Number(s);
  if (/^[-+]?\.(inf|Inf|INF)$/.test(s)) return s.startsWith('-') ? -Infinity : Infinity;
  if (/^\.(nan|NaN|NAN)$/.test(s)) return NaN;
  return s;
}

function parseYaml(text) {
  const s = String(text).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  let i = 0;
  const lineOf = (p) => { let n = 1; for (let k = 0; k < p && k < s.length; k += 1) if (s[k] === '\n') n += 1; return n; };
  const fail = (msg, p = i) => { throw new YamlError(msg, lineOf(p)); };
  const lineStart = (p) => { let k = p; while (k > 0 && s[k - 1] !== '\n') k -= 1; return k; };
  const col = (p) => p - lineStart(p);

  /** Skips spaces, newlines and comments. A tab used as indentation is refused. */
  function skipSpace() {
    for (;;) {
      while (i < s.length && (s[i] === ' ' || s[i] === '\n' || (s[i] === '\t' && !atIndent(i)))) i += 1;
      if (s[i] === '\t') fail('tab indentation is not valid YAML');
      if (s[i] === '#' && (i === 0 || WS(s[i - 1]) || s[i - 1] === '\n')) { while (i < s.length && s[i] !== '\n') i += 1; continue; }
      return;
    }
  }
  function atIndent(p) { const ls = lineStart(p); for (let k = ls; k < p; k += 1) if (s[k] !== ' ' && s[k] !== '\t') return false; let k = p; while (s[k] === '\t' || s[k] === ' ') k += 1; return !EOL(s[k]) && s[k] !== '#'; }
  /** Skips spaces (not newlines) and a trailing comment on the current line. */
  function skipInline() {
    while (WS(s[i])) i += 1;
    if (s[i] === '#' && (i === 0 || WS(s[i - 1]))) while (i < s.length && s[i] !== '\n') i += 1;
  }
  const refuseSpecial = () => {
    const c = s[i];
    if (c === '&' || c === '*') fail(`anchors and aliases are not supported ("${s.slice(i, i + 20).split('\n')[0]}")`);
    if (c === '!') fail('tags are not supported');
    if (c === '%') fail('directives are not supported');
    if ((c === '?' ) && (WS(s[i + 1]) || EOL(s[i + 1]))) fail('complex mapping keys are not supported');
    if (c === '@' || c === '`') fail(`"${c}" cannot start a plain scalar`);
  };
  const isSeqDash = (p) => s[p] === '-' && (WS(s[p + 1]) || EOL(s[p + 1]));

  // ---- quoted scalars (may span lines; line breaks fold) ----
  function foldBreaks(raw) {
    // raw: text between the quotes, with real newlines. A line break folds to a space, an empty line to "\n";
    // whitespace around a break is dropped.
    const lines = raw.split('\n');
    if (lines.length === 1) return raw;
    let out = lines[0].replace(/[ \t]+$/, '');
    let empties = 0;
    for (let k = 1; k < lines.length; k += 1) {
      const t = k === lines.length - 1 ? lines[k].replace(/^[ \t]+/, '') : lines[k].trim();
      if (t === '' && k < lines.length - 1) { empties += 1; continue; }
      out += empties ? '\n'.repeat(empties) : ' ';
      empties = 0;
      out += t;
    }
    return out;
  }
  function singleQuoted() {
    const start = i; i += 1;
    let raw = '';
    for (;;) {
      if (i >= s.length) fail('unterminated single-quoted string', start);
      if (s[i] === "'") { if (s[i + 1] === "'") { raw += "\u0000"; i += 2; continue; } i += 1; break; }
      raw += s[i]; i += 1;
    }
    return foldBreaks(raw).replace(/\u0000/g, "'");
  }
  function doubleQuoted() {
    const start = i; i += 1;
    // Split on raw newlines first (folding), keeping escapes intact; an escaped newline joins lines.
    let out = '';
    let segment = '';
    const pieces = [];
    for (;;) {
      if (i >= s.length) fail('unterminated double-quoted string', start);
      const c = s[i];
      if (c === '"') { i += 1; break; }
      if (c === '\\') {
        const e = s[i + 1];
        const map = { 0: '\0', a: '\x07', b: '\b', t: '\t', '\t': '\t', n: '\n', v: '\v', f: '\f', r: '\r', e: '\x1b', ' ': ' ', '"': '"', '/': '/', '\\': '\\', N: '\u0085', _: ' ', L: ' ', P: ' ' };
        if (e === '\n') { // escaped line break: join, dropping the next line's leading whitespace
          i += 2; while (WS(s[i])) i += 1; continue;
        }
        if (e in map) { segment += `\u0001${map[e]}\u0002`; i += 2; continue; }
        const len = e === 'x' ? 2 : e === 'u' ? 4 : e === 'U' ? 8 : 0;
        if (!len) fail(`unknown escape \\${e}`);
        const hex = s.slice(i + 2, i + 2 + len);
        if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length !== len) fail('bad hex escape');
        segment += `\u0001${String.fromCodePoint(parseInt(hex, 16))}\u0002`; i += 2 + len; continue;
      }
      if (c === '\n') { pieces.push(segment); segment = ''; i += 1; continue; }
      segment += c; i += 1;
    }
    pieces.push(segment);
    // Fold the raw line breaks (escaped characters are protected from trimming), then unprotect.
    const protectedTrim = (t, left, right) => {
      let r = t;
      if (right) r = r.replace(/[ \t]+$/, '');
      if (left) r = r.replace(/^[ \t]+/, '');
      return r;
    };
    if (pieces.length === 1) out = pieces[0];
    else {
      out = protectedTrim(pieces[0], false, true);
      let empties = 0;
      for (let k = 1; k < pieces.length; k += 1) {
        const last = k === pieces.length - 1;
        const t = protectedTrim(pieces[k], true, !last);
        if (t === '' && !last) { empties += 1; continue; }
        out += empties ? '\n'.repeat(empties) : ' ';
        empties = 0;
        out += t;
      }
    }
    return out.replace(/\u0001([\s\S]{1,2}?)\u0002/g, '$1');
  }

  // ---- block scalars ----
  function blockScalar(parentIndent) {
    const start = i;
    const folded = s[i] === '>';
    i += 1;
    let chomp = 'clip'; let explicit = null;
    for (let k = 0; k < 2; k += 1) {
      if (s[i] === '-') { chomp = 'strip'; i += 1; } else if (s[i] === '+') { chomp = 'keep'; i += 1; } else if (/[1-9]/.test(s[i] || '')) { explicit = Number(s[i]); i += 1; }
    }
    skipInline();
    if (!EOL(s[i])) fail('a block scalar header must end its line', start);
    if (s[i] === '\n') i += 1;
    // Collect raw lines until a non-empty line at or below the parent's indentation.
    const raw = [];
    let p = i;
    while (p < s.length) {
      let e = s.indexOf('\n', p); if (e === -1) e = s.length;
      const line = s.slice(p, e);
      if (line.trim() !== '' && line.match(/^ */)[0].length <= parentIndent) break;
      raw.push(line); p = e + 1;
    }
    i = Math.min(p, s.length);
    if (p > s.length) i = s.length;
    let ind = explicit !== null ? parentIndent + explicit : null;
    if (ind === null) { const first = raw.find((l) => l.trim() !== ''); ind = first ? first.match(/^ */)[0].length : parentIndent + 1; }
    const lines = raw.map((l) => (l.trim() === '' && l.length <= ind ? '' : l.slice(ind)));
    // Trailing empty lines belong to chomping, not content.
    let end = lines.length; while (end > 0 && lines[end - 1] === '') end -= 1;
    const content = lines.slice(0, end);
    const trailing = lines.length - end;
    let body;
    if (!folded) body = content.join('\n');
    else {
      body = '';
      for (let k = 0; k < content.length; k += 1) {
        const cur = content[k];
        if (k === 0) { body = cur; continue; }
        if (cur === '') { body += '\n'; continue; }
        let j = k - 1; while (j >= 0 && content[j] === '') j -= 1;
        const blanks = k - 1 - j;
        const more = (l) => /^[ \t]/.test(l);
        if (j < 0) { body += cur; continue; }
        if (blanks === 0) body += more(content[j]) || more(cur) ? '\n' : ' ';
        else if (more(content[j]) || more(cur)) body += '\n';
        body += cur;
      }
    }
    if (!content.length) return chomp === 'keep' ? '\n'.repeat(trailing) : '';
    if (chomp === 'strip') return body;
    if (chomp === 'keep') return `${body}\n${'\n'.repeat(trailing)}`;
    return `${body}\n`;
  }

  // ---- plain scalars ----
  /** A plain scalar in block context; continuation lines more indented than `parentIndent` fold. */
  function plainBlock(parentIndent) {
    const start = i;
    let out = '';
    let first = true;
    for (;;) {
      let line = '';
      while (i < s.length && s[i] !== '\n') {
        if (s[i] === ':' && (WS(s[i + 1]) || EOL(s[i + 1]))) break;
        if (s[i] === '#' && WS(s[i - 1])) break;
        line += s[i]; i += 1;
      }
      line = line.replace(/[ \t]+$/, '');
      if (first) out = line; else out += line;
      first = false;
      if (s[i] === ':' ) { if (out === '') fail('empty plain scalar', start); return out; } // caller decides (a key)
      skipInline();
      // Continuation: the next non-empty line, more indented than the parent, not a comment.
      let p = i; let empties = 0;
      while (s[p] === '\n') {
        let q = p + 1; while (s[q] === ' ') q += 1;
        if (s[q] === '\n') { empties += 1; p = q; continue; }
        if (q >= s.length || (q - (p + 1)) <= parentIndent || s[q] === '#' || (isSeqDash(q) && q - (p + 1) <= parentIndent)) return out;
        i = q;
        out += empties ? '\n'.repeat(empties) : ' ';
        empties = 0;
        p = -1;
        break;
      }
      if (p !== -1) return out;
    }
  }
  /** A plain scalar inside a flow collection. */
  function plainFlow() {
    let out = '';
    while (i < s.length) {
      const c = s[i];
      if (FLOW.includes(c)) break;
      if (c === ':' && (WS(s[i + 1]) || EOL(s[i + 1]) || FLOW.includes(s[i + 1]))) break;
      if (c === '#' && WS(s[i - 1])) break;
      if (c === '\n') { out = `${out.replace(/[ \t]+$/, '')} `; i += 1; while (WS(s[i]) || s[i] === '\n') i += 1; continue; }
      out += c; i += 1;
    }
    return out.trim();
  }

  // ---- flow collections ----
  function flowSkip() {
    for (;;) {
      while (WS(s[i]) || s[i] === '\n') i += 1;
      if (s[i] === '#') { while (i < s.length && s[i] !== '\n') i += 1; continue; }
      return;
    }
  }
  function flowValue() {
    flowSkip();
    refuseSpecial();
    if (s[i] === '[') return flowSeq();
    if (s[i] === '{') return flowMap();
    if (s[i] === '"') return doubleQuoted();
    if (s[i] === "'") return singleQuoted();
    return resolvePlain(plainFlow());
  }
  function flowSeq() {
    const start = i; i += 1;
    const out = [];
    for (;;) {
      flowSkip();
      if (i >= s.length) fail('unterminated flow sequence', start);
      if (s[i] === ']') { i += 1; return out; }
      const v = flowValue();
      flowSkip();
      if (s[i] === ':') { i += 1; out.push({ [String(v)]: flowValue() }); flowSkip(); } else out.push(v);
      if (s[i] === ',') { i += 1; continue; }
      if (s[i] === ']') { i += 1; return out; }
      fail('malformed flow sequence');
    }
  }
  function flowMap() {
    const start = i; i += 1;
    const out = {};
    for (;;) {
      flowSkip();
      if (i >= s.length) fail('unterminated flow mapping', start);
      if (s[i] === '}') { i += 1; return out; }
      refuseSpecial();
      const k = s[i] === '"' ? doubleQuoted() : s[i] === "'" ? singleQuoted() : resolvePlain(plainFlow());
      flowSkip();
      let v = null;
      if (s[i] === ':') { i += 1; flowSkip(); v = s[i] === ',' || s[i] === '}' ? null : flowValue(); flowSkip(); }
      const key = keyString(k);
      if (Object.prototype.hasOwnProperty.call(out, key)) fail(`duplicate key "${key}"`);
      out[key] = v;
      if (s[i] === ',') { i += 1; continue; }
      if (s[i] === '}') { i += 1; return out; }
      fail('malformed flow mapping');
    }
  }
  const keyString = (k) => (k === null ? '' : String(k));

  // ---- block structure ----
  /** A key at the cursor, if the cursor starts `key:` — returns its string, or null (cursor unchanged). */
  function tryKey() {
    const save = i;
    let k;
    if (s[i] === '"' || s[i] === "'") {
      k = s[i] === '"' ? doubleQuoted() : singleQuoted();
      while (WS(s[i])) i += 1;
    } else if (s[i] === '[' || s[i] === '{') {
      i = save; return null;
    } else {
      // A plain key stops at ": " on the same line.
      let t = '';
      while (i < s.length && s[i] !== '\n') {
        if (s[i] === ':' && (WS(s[i + 1]) || EOL(s[i + 1]))) break;
        if (s[i] === '#' && WS(s[i - 1])) break;
        t += s[i]; i += 1;
      }
      k = t.trim() === '' ? undefined : resolvePlain(t.trim());
    }
    if (k !== undefined && s[i] === ':' && (WS(s[i + 1]) || EOL(s[i + 1]))) { i += 1; return keyString(k); }
    i = save;
    return null;
  }

  /** The value after `key:` or after `- `, at the cursor (same line), owned by a node at `indent`. */
  function valueAfter(indent, { inSequence = false } = {}) {
    skipInline();
    if (EOL(s[i])) {
      // On the next lines: a more-indented node, or (for a mapping value) a sequence at the same indent.
      const save = i;
      skipSpace();
      if (i >= s.length) return null;
      const c = col(i);
      if (c > indent) return node(c);
      if (!inSequence && c === indent && isSeqDash(i)) return sequence(indent);
      i = save;
      return null;
    }
    refuseSpecial();
    if (s[i] === '|' || s[i] === '>') return blockScalar(indent);
    if (s[i] === '"' || s[i] === "'") {
      const at = i;
      const q = s[i] === '"' ? doubleQuoted() : singleQuoted();
      skipInline();
      if (s[i] === ':' && (WS(s[i + 1]) || EOL(s[i + 1]))) { i = at; return mapping(col(at)); } // `- "k": v`
      if (!EOL(s[i])) fail('unexpected text after a quoted scalar');
      return q;
    }
    if (s[i] === '[' || s[i] === '{') {
      const v = s[i] === '[' ? flowSeq() : flowMap();
      skipInline();
      if (!EOL(s[i])) fail('unexpected text after a flow collection');
      return v;
    }
    if (isSeqDash(i)) { if (!inSequence) fail('a sequence cannot start on the same line as its key'); return sequence(col(i)); }
    const at = i;
    if (tryKey() !== null) { i = at; return mapping(col(at)); } // `- key: value` (compact mapping in a sequence)
    const v = plainBlock(indent);
    if (s[i] === ':') fail('a mapping cannot start on the same line as its key');
    return resolvePlain(v);
  }

  function node(indent) {
    skipSpace();
    if (i >= s.length) return null;
    refuseSpecial();
    if (isSeqDash(i)) return sequence(col(i));
    if (s[i] === '[' || s[i] === '{' || s[i] === '|' || s[i] === '>' ) return valueAfter(indent - 1);
    const at = i;
    if (tryKey() !== null) { i = at; return mapping(col(at)); }
    if (s[i] === '"' || s[i] === "'") return valueAfter(indent - 1);
    return resolvePlain(plainBlock(indent - 1));
  }

  function sequence(indent) {
    const out = [];
    for (;;) {
      skipSpace();
      if (i >= s.length) break;
      const c = col(i);
      if (c < indent) break;
      if (c > indent) fail('unexpected indentation in a sequence');
      if (!isSeqDash(i)) break;
      i += 1;
      out.push(valueAfter(indent, { inSequence: true }));
    }
    return out;
  }

  function mapping(indent) {
    const out = {};
    for (;;) {
      skipSpace();
      if (i >= s.length) break;
      const c = col(i);
      if (c < indent) break;
      if (c > indent) fail('unexpected indentation');
      if (isSeqDash(i)) break;
      if (s.startsWith('---', i) && c === 0 && (EOL(s[i + 3]) || WS(s[i + 3]))) fail('multiple YAML documents are not supported');
      if (s.startsWith('...', i) && c === 0) fail('document end markers are not supported');
      refuseSpecial();
      const key = tryKey();
      if (key === null) fail(`expected "key: value", found "${s.slice(i, i + 40).split('\n')[0]}"`);
      if (key === '<<') fail('merge keys (<<) are not supported');
      if (Object.prototype.hasOwnProperty.call(out, key)) fail(`duplicate key "${key}"`);
      out[key] = valueAfter(indent);
    }
    return out;
  }

  // ---- document ----
  skipSpace();
  if (s.startsWith('%', i)) fail('directives are not supported');
  if (s.startsWith('---', i) && (EOL(s[i + 3]) || WS(s[i + 3]))) { i += 3; }
  skipSpace();
  if (i >= s.length) return null;
  const value = node(col(i));
  skipSpace();
  if (s.startsWith('---', i)) fail('multiple YAML documents are not supported');
  if (s.startsWith('...', i)) fail('document end markers are not supported');
  if (i < s.length) fail(`unexpected content "${s.slice(i, i + 40).split('\n')[0]}"`);
  return value;
}

module.exports = { parseYaml, YamlError };
