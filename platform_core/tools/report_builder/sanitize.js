// HTML sanitizer for report models (Phase 9.2, audit finding F-17).
//
// A report model may carry rich text as `{ "html": "..." }`. That text often originates in test evidence —
// captured application output, error messages, a page's markup — so it is untrusted. Rendering it verbatim
// let an `onerror=` handler or a <script> run when a reviewer opened the report.
//
// Allow-list, not block-list: only formatting elements survive, with only harmless attributes. Everything
// executable or able to load or navigate is removed — script/style/iframe/object/embed/svg/math/template/
// form elements with their content; every on* handler; style attributes; any URL that is not http(s),
// mailto, a fragment or a relative path. An element outside the list is escaped and shown as text, so
// nothing a tester wrote is silently lost. Text keeps its entities; stray < and > are escaped.
// Defense in depth: every generated page also carries a Content-Security-Policy (render.js).

const ALLOWED = new Set([
  'a', 'abbr', 'b', 'blockquote', 'br', 'code', 'del', 'div', 'em', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'ins',
  'kbd', 'li', 'mark', 'ol', 'p', 'pre', 's', 'small', 'span', 'strong', 'sub', 'sup', 'table', 'tbody', 'td',
  'tfoot', 'th', 'thead', 'tr', 'u', 'ul',
]);
const VOID = new Set(['br', 'hr']);
// Removed together with everything inside them.
const DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'svg', 'math',
  'template', 'noscript', 'textarea', 'select', 'option', 'button', 'form', 'input', 'title', 'head', 'xmp', 'noembed', 'noframes', 'plaintext']);
const ATTRS = { a: new Set(['href', 'title']), td: new Set(['colspan', 'rowspan']), th: new Set(['colspan', 'rowspan', 'scope']), abbr: new Set(['title']) };
const GLOBAL_ATTRS = new Set(['class', 'title']);

const escText = (s) => String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => String(s).replace(/&(?![a-zA-Z]+;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** A URL is kept only when it cannot execute: http(s), mailto, a fragment, or a scheme-less relative path. */
function safeUrl(raw) {
  // Entity-decode and strip control characters/whitespace the way a browser does before reading a scheme.
  const decoded = String(raw).replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/&#(\d+);?/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&colon;/gi, ':').replace(/&tab;|&newline;/gi, '');
  const compact = decoded.replace(/[\u0000- \u007f-\u009f]+/g, '');
  const scheme = compact.match(/^([a-z][a-z0-9+.-]*):/i);
  if (scheme) return ['http', 'https', 'mailto'].includes(scheme[1].toLowerCase()) ? decoded.trim() : null;
  if (/^\/\//.test(compact)) return null; // protocol-relative: an external load in disguise
  return decoded.trim();
}

function parseAttrs(src) {
  const out = [];
  const re = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(src))) out.push([m[1].toLowerCase(), m[2] ?? m[3] ?? m[4] ?? '']);
  return out;
}

/**
 * Sanitizes an untrusted HTML fragment.
 * @param {string} html
 * @returns {string}
 */
function sanitizeHtml(html) {
  const s = String(html ?? '');
  const out = [];
  const open = [];
  const tagRe = /<!--[\s\S]*?(?:-->|$)|<!\[CDATA\[[\s\S]*?(?:\]\]>|$)|<!?\/?([a-zA-Z][a-zA-Z0-9:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  let last = 0;
  let m;
  let dropping = null; // the element whose content is being dropped
  while ((m = tagRe.exec(s))) {
    if (!dropping) out.push(escText(s.slice(last, m.index)));
    last = tagRe.lastIndex;
    const whole = m[0];
    if (whole.startsWith('<!--') || whole.startsWith('<![CDATA[') || whole.startsWith('<!')) continue; // comments, doctype, CDATA: removed
    const name = (m[1] || '').toLowerCase();
    const closing = whole.startsWith('</');
    if (dropping) {
      if (closing && name === dropping) dropping = null;
      continue;
    }
    if (DROP_WITH_CONTENT.has(name)) {
      if (!closing && !/\/\s*>$/.test(whole)) dropping = name;
      continue;
    }
    if (!ALLOWED.has(name)) { out.push(escText(whole)); continue; }
    if (closing) {
      const at = open.lastIndexOf(name);
      if (at !== -1) { while (open.length > at) out.push(`</${open.pop()}>`); }
      continue;
    }
    const kept = [];
    for (const [k, v] of parseAttrs(m[2] || '')) {
      if (k.startsWith('on') || k === 'style' || k === 'src' || k === 'srcset' || k === 'formaction' || k === 'xmlns' || k.includes(':')) continue;
      if (!(GLOBAL_ATTRS.has(k) || (ATTRS[name] && ATTRS[name].has(k)))) continue;
      if (k === 'href') { const u = safeUrl(v); if (u === null) continue; kept.push(`href="${escAttr(u)}"`); kept.push('rel="noopener noreferrer"'); continue; }
      if ((k === 'colspan' || k === 'rowspan') && !/^\d{1,3}$/.test(v)) continue;
      kept.push(`${k}="${escAttr(v)}"`);
    }
    out.push(`<${name}${kept.length ? ` ${kept.join(' ')}` : ''}>`);
    if (!VOID.has(name)) open.push(name);
  }
  if (!dropping) out.push(escText(s.slice(last)));
  while (open.length) out.push(`</${open.pop()}>`);
  return out.join('');
}

module.exports = { sanitizeHtml, safeUrl };
