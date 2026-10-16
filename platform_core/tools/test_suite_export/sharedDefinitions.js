// Shared Definitions — setup and validation rules written once per suite, referenced by many cases.
//
// WHY THIS EXISTS
// Cases that share setup or comparison logic were copying it into every case (test-design-skill §6.1b).
// A suite may instead hold one optional section:
//
//   ## Shared Definitions
//
//   ### SETUP-1 — Two parallel search sessions        reusable setup, cited from Preconditions
//   1. …
//
//   ### VR-01 — Search result parity                  reusable validation rule (comparison contract)
//   **Source:** SRCH-03, CMP-03                       where the rule comes from — never an observation
//   - VR-01.1 Flight count is equal.                  sub-checks a case's Assertions `Rule` column cites
//
// A case uses a definition by naming its ID anywhere in its own fields ("Preconditions: SETUP-1.",
// "Apply VR-01.", a `Rule` cell `VR-01.1`). Definitions may cite other definitions.
//
// WHAT IT GUARANTEES
//  - The text of every definition a case uses is attached to that case's record as `sharedDefinitions`,
//    so it is part of the case's material fingerprint (run_manager/assertionContract.js materialText).
//    Editing a rule therefore re-opens review for exactly the cases that use it.
//  - A case that uses no definition gets no such key, so existing suites fingerprint exactly as before.
//  - The section is exported as its own workbook sheet, so Excel readers see it too.

'use strict';

const SECTION_HEADING = /^##\s+Shared Definitions\s*$/i;
const SECTION_END = /^#{1,2}\s+/;
const DEF_HEADING = /^###\s+((?:SETUP|VR)-\d+)\s*(?:[—–-]\s*(.*))?$/;
const ANY_H3_OR_DEEPER = /^#{3,6}\s+/;
const SOURCE_LINE = /^\*\*Source:\*\*\s*(.*)$/i;
const REF = /\b((?:SETUP|VR)-\d+)(\.\d+)?\b/g;
const OBSERVATION_SOURCE = /\b(observ|actual|screenshot|captured|as seen)/i;

/** Fields of a case that may cite a definition. */
const CITING_FIELDS = ['objective', 'preconditions', 'testData', 'steps', 'expectedResult', 'notes', 'assertions'];

const stripComments = (s) => String(s ?? '').replace(/<!--[\s\S]*?-->/g, '');

/**
 * Every reference in a text: parent IDs (`VR-01`) and full sub-IDs (`VR-01.2`).
 * @returns {{ids: Set<string>, subIds: Set<string>}}
 */
function findReferences(text) {
  const ids = new Set();
  const subIds = new Set();
  for (const m of stripComments(text).matchAll(REF)) {
    ids.add(m[1]);
    if (m[2]) subIds.add(m[1] + m[2]);
  }
  return { ids, subIds };
}

/**
 * Parse the optional `## Shared Definitions` section.
 * @returns {{definitions: Array<{id: string, kind: 'Setup'|'Validation Rule', title: string, source: string,
 *            body: string, subIds: string[]}>, warnings: string[], present: boolean}}
 */
function parseSharedDefinitions(markdown, { sourceLabel } = {}) {
  const src = sourceLabel ? `${sourceLabel}: ` : '';
  const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');
  const definitions = [];
  const warnings = [];
  let inSection = false;
  let present = false;
  let inFence = false;
  let current = null;

  const flush = () => {
    if (!current) return;
    const body = stripComments(current.lines.join('\n')).replace(/^\s*\n|\n\s*$/g, '').trim();
    const sourceLine = body.split('\n').map((l) => l.trim()).find((l) => SOURCE_LINE.test(l));
    const source = sourceLine ? sourceLine.replace(SOURCE_LINE, '$1').trim() : '';
    const own = [...findReferences(body).subIds].filter((s) => s.startsWith(`${current.id}.`));
    definitions.push({ id: current.id, kind: current.id.startsWith('VR-') ? 'Validation Rule' : 'Setup', title: current.title, source, body, subIds: own });
    current = null;
  };

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (!inFence && SECTION_HEADING.test(line)) {
      flush();
      if (present) warnings.push(`${src}more than one "## Shared Definitions" section — keep one`);
      inSection = true;
      present = true;
      continue;
    }
    if (!inSection) continue;
    if (!inFence && SECTION_END.test(line)) { flush(); inSection = false; continue; }
    const def = inFence ? null : DEF_HEADING.exec(line);
    if (def) {
      flush();
      current = { id: def[1], title: (def[2] || '').trim(), lines: [] };
      continue;
    }
    if (!inFence && ANY_H3_OR_DEEPER.test(line)) {
      flush();
      warnings.push(`${src}Shared Definitions: "${line.trim()}" is not a definition heading — use "### SETUP-n — Title" or "### VR-n — Title"`);
      continue;
    }
    if (current) current.lines.push(line);
  }
  flush();

  const seen = new Set();
  for (const d of definitions) {
    if (seen.has(d.id)) warnings.push(`${src}Shared Definitions: duplicate ID ${d.id} — IDs must be unique`);
    seen.add(d.id);
    if (!d.title) warnings.push(`${src}${d.id}: no title — write "### ${d.id} — Title"`);
    if (!d.body) warnings.push(`${src}${d.id}: empty definition`);
    if (d.kind === 'Validation Rule') {
      if (!d.source) warnings.push(`${src}${d.id}: no **Source:** line — a validation rule names the requirement, contract or business rule it comes from`);
      else if (OBSERVATION_SOURCE.test(d.source)) warnings.push(`${src}${d.id}: Source "${d.source}" names an observation — a rule comes from a requirement, contract or business rule`);
    }
  }
  return { definitions, warnings, present };
}

/** The definitions a text uses, including the ones those definitions use in turn. Sorted by ID. */
function resolveUsed(text, byId) {
  const used = new Set();
  const queue = [...findReferences(text).ids];
  while (queue.length) {
    const id = queue.shift();
    if (used.has(id) || !byId.has(id)) continue;
    used.add(id);
    for (const next of findReferences(byId.get(id).body).ids) if (!used.has(next)) queue.push(next);
  }
  return [...used].sort().map((id) => byId.get(id));
}

/** Canonical text of a definition, as attached to a case's record and fingerprinted. */
const definitionText = (d) => `### ${d.id} — ${d.title}\n${d.body}`;

/**
 * Attach used definitions to each case and report broken references. Mutates the case records: a case
 * that uses at least one definition gets `sharedDefinitions` (their canonical text); others are untouched.
 * @returns {{usedBy: Map<string, string[]>, warnings: string[]}}
 */
function linkCases(cases, definitions, { sourceLabel } = {}) {
  const src = sourceLabel ? `${sourceLabel}: ` : '';
  const byId = new Map();
  for (const d of definitions) if (!byId.has(d.id)) byId.set(d.id, d);
  const usedBy = new Map(definitions.map((d) => [d.id, []]));
  const warnings = [];
  for (const c of cases) {
    const text = CITING_FIELDS.map((k) => c[k] || '').join('\n');
    const refs = findReferences(text);
    for (const id of refs.ids) if (!byId.has(id)) warnings.push(`${src}${c.id}: cites ${id}, which is not defined in Shared Definitions`);
    for (const sub of refs.subIds) {
      const parent = sub.replace(/\.\d+$/, '');
      if (byId.has(parent) && !byId.get(parent).subIds.includes(sub)) warnings.push(`${src}${c.id}: cites ${sub}, which ${parent} does not define`);
    }
    const used = resolveUsed(text, byId);
    if (!used.length) continue;
    c.sharedDefinitions = used.map(definitionText).join('\n\n');
    for (const d of used) usedBy.get(d.id).push(c.id);
  }
  for (const [id, ids] of usedBy) if (!ids.length) warnings.push(`${src}${id}: defined but not used by any case`);
  return { usedBy, warnings };
}

/** Workbook rows for the Shared Definitions sheet (header first), or null when there are none. */
function definitionRows(definitions, usedBy) {
  if (!definitions.length) return null;
  return [
    ['ID', 'Type', 'Title', 'Source', 'Definition', 'Used By'],
    ...definitions.map((d) => [d.id, d.kind, d.title, d.source, d.body, ((usedBy && usedBy.get(d.id)) || []).join(', ')]),
  ];
}

const DEFINITION_COLUMN_WIDTHS = [12, 16, 32, 26, 80, 30];

module.exports = {
  parseSharedDefinitions,
  linkCases,
  findReferences,
  resolveUsed,
  definitionText,
  definitionRows,
  DEFINITION_COLUMN_WIDTHS,
  CITING_FIELDS,
};
