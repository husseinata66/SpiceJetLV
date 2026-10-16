// Duplicate detection and reuse — propose additions and updates, never a regenerated suite.
//
// WHY THIS EXISTS
// A new User Story often overlaps one already designed; a regenerated test suite renumbers cases and
// loses the approvals, automation and execution history tied to their IDs; a "new" finding is often
// one already raised. The Module Manager's `inspect-scope` already reports overlap by story number and
// name (new_us_intake.md §5) — and a number alone proves nothing (CLAUDE.md). This module adds the
// content comparison, and plans a suite update that keeps every existing ID.
//
// Similarity is a candidate, never a verdict: it is reported with its score and evidence for a human
// to decide. Nothing here merges, renumbers or deletes anything.

const fs = require('fs');
const path = require('path');

const STOP = new Set(('the a an and or of to in on for with is are be as by at it this that from not no when then '
  + 'shall should must can will into than also each any all its their which who has have was were been').split(' '));

/** Content words of a text, lowercased; formatting, IDs and numbers removed. */
function tokens(text) {
  return new Set(String(text || '').toLowerCase()
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\b(tc|finding|us|ac|po)-[a-z0-9-]*\d+\b/g, ' ')
    .match(/[a-z][a-z]{2,}/g)?.filter((w) => !STOP.has(w)) || []);
}

function jaccard(a, b) {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  return inter / (a.size + b.size - inter);
}

/** A story's comparable parts: its title, its narrative, and each acceptance criterion. */
function storyParts(text) {
  const t = String(text).replace(/\r\n?/g, '\n');
  const title = (t.match(/^#\s+(.+)$/m) || [])[1] || '';
  const number = (title.match(/\bUS-?(\d+)\b/i) || t.match(/\bWork item ID:\**\s*(\d+)/i) || [])[1] || null;
  const acs = [...t.matchAll(/^#{2,4}\s+(AC-\d+[^\n]*)\n([\s\S]*?)(?=^#{2,4}\s|$(?![\s\S]))/gm)].map((m) => ({ id: m[1].split(/\s/)[0], title: m[1], text: m[2] }));
  return { title, number, tokens: tokens(t), acs };
}

/**
 * Existing stories that overlap a new one, by content. A shared number alone is reported as such and
 * never makes a duplicate.
 * @returns {Array<{file: string, score: number, sameNumber: boolean, overlappingCriteria: object[], verdict: string}>}
 */
function findDuplicateStories(storyText, storiesDir, { threshold = 0.35 } = {}) {
  const incoming = storyParts(storyText);
  const out = [];
  for (const n of (fs.existsSync(storiesDir) ? fs.readdirSync(storiesDir) : []).filter((x) => x.endsWith('.md'))) {
    const existing = storyParts(fs.readFileSync(path.join(storiesDir, n), 'utf8'));
    const score = jaccard(incoming.tokens, existing.tokens);
    const overlappingCriteria = [];
    for (const a of incoming.acs) {
      for (const b of existing.acs) {
        const s = jaccard(tokens(a.text), tokens(b.text));
        if (s >= 0.5) overlappingCriteria.push({ incoming: a.id, existing: b.id, score: Number(s.toFixed(2)) });
      }
    }
    const sameNumber = Boolean(incoming.number && existing.number && incoming.number === existing.number);
    if (score < threshold && !overlappingCriteria.length && !sameNumber) continue;
    out.push({
      file: n, score: Number(score.toFixed(2)), sameNumber, overlappingCriteria,
      verdict: score >= threshold || overlappingCriteria.length
        ? 'overlap candidate — compare scope and Acceptance Criteria; a human decides'
        : 'same number only — numbers prove nothing; the content differs',
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Existing findings whose title or description overlaps a new one. */
function findDuplicateFindings(text, findingsDir, { threshold = 0.4 } = {}) {
  const incoming = tokens(text);
  const out = [];
  for (const n of (fs.existsSync(findingsDir) ? fs.readdirSync(findingsDir) : []).filter((x) => /^FINDING-\d+/.test(x))) {
    const meta = path.join(findingsDir, n, 'metadata.md');
    const body = fs.existsSync(meta) ? fs.readFileSync(meta, 'utf8') : n.replace(/[_-]/g, ' ');
    const score = Math.max(jaccard(incoming, tokens(body)), jaccard(incoming, tokens(n.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' '))));
    if (score >= threshold) out.push({ id: n.match(/^FINDING-\d+/)[0], folder: n, score: Number(score.toFixed(2)) });
  }
  return out.sort((a, b) => b.score - a.score);
}

const caseText = (c) => [c.title, c.objective, c.preconditions, c.steps, c.expectedResult].join(' ');
const CASE_FIELDS = ['title', 'objective', 'preconditions', 'testData', 'steps', 'expectedResult', 'priority', 'tags'];

/**
 * Plans an update of an existing suite from a proposed one — keeping every existing ID.
 *   unchanged          same ID, same content
 *   update             same ID, changed content (its Review resets per test-design-skill §6.3.1)
 *   reuse-existing-id  a proposed new case that duplicates an existing one — keep the existing ID
 *   new                no match — gets the next free ID after the existing ones, never a reused one
 *   not-in-proposal    an existing case the proposal omits — NEVER deleted silently; a human decides
 * @returns {{entries: object[], nextIds: string[], summary: object}}
 */
function planSuiteUpdate(existingMarkdown, proposedMarkdown, { threshold = 0.6 } = {}) {
  // eslint-disable-next-line global-require
  const { parseTestCases } = require('../test_suite_export/parseTestCases');
  const existing = parseTestCases(existingMarkdown).cases;
  const proposed = parseTestCases(proposedMarkdown).cases;
  const byId = new Map(existing.map((c) => [c.id, c]));
  const entries = [];
  const claimed = new Set();
  for (const p of proposed) {
    const e = byId.get(p.id);
    if (e) {
      claimed.add(p.id);
      const changedFields = CASE_FIELDS.filter((f) => String(e[f] ?? '').trim() !== String(p[f] ?? '').trim());
      entries.push(changedFields.length
        ? { action: 'update', id: p.id, changedFields, note: 'content changed — its Review returns to Pending (test-design-skill §6.3.1)' }
        : { action: 'unchanged', id: p.id });
      continue;
    }
    let best = null;
    for (const c of existing) {
      const s = jaccard(tokens(caseText(p)), tokens(caseText(c)));
      if (!best || s > best.score) best = { id: c.id, score: s };
    }
    if (best && best.score >= threshold) {
      claimed.add(best.id);
      entries.push({ action: 'reuse-existing-id', proposedId: p.id, id: best.id, score: Number(best.score.toFixed(2)), note: `duplicates ${best.id} — keep ${best.id} and its approvals, automation and history` });
    } else {
      entries.push({ action: 'new', proposedId: p.id });
    }
  }
  for (const e of existing) {
    if (!claimed.has(e.id)) entries.push({ action: 'not-in-proposal', id: e.id, note: 'kept — removing a case removes coverage, which only a human decides' });
  }
  // New IDs continue the existing numbering; an existing ID is never reused for a different case.
  const prefix = (existing[0]?.id || proposed[0]?.id || 'TC-').replace(/\d+$/, '');
  const width = ((existing[0]?.id || '').match(/\d+$/) || ['000'])[0].length;
  let max = Math.max(0, ...existing.map((c) => Number((c.id.match(/\d+$/) || [0])[0])));
  const nextIds = [];
  for (const en of entries.filter((x) => x.action === 'new')) {
    max += 1;
    en.id = `${prefix}${String(max).padStart(width, '0')}`;
    nextIds.push(en.id);
  }
  const summary = {};
  for (const en of entries) summary[en.action] = (summary[en.action] || 0) + 1;
  return { entries, nextIds, summary };
}

module.exports = {
  tokens,
  jaccard,
  findDuplicateStories,
  findDuplicateFindings,
  planSuiteUpdate,
};
