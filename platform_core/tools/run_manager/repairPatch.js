// Repair patches — what an attempt's unified diff does to the files it names (Phase 6.1).
//
// WHY THIS EXISTS
// Phase 6 recorded that an approved repair was "applied" on a human's word. A repair can only be validated
// when the code that ran IS the approved patch — no more, no less. This module reads a unified diff into
// hunks, computes the exact content each file must have after it, and compares the files on disk:
// before-content, after-content, a partial application, a different change, or changes the patch never
// mentioned. It never writes a source file: applying a patch is a human's (or the Skill's) action.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const normalize = (t) => String(t).replace(/\r\n?/g, '\n');
const sha = (text) => crypto.createHash('sha256').update(normalize(text)).digest('hex');

/**
 * Files and hunks of a unified diff. `before` / `after` are the file's paths (null for /dev/null).
 * @returns {Array<{path: string, created: boolean, deleted: boolean, hunks: Array<{oldStart: number, lines: Array<{t: ' '|'-'|'+', s: string}>}>}>}
 */
function parseUnifiedDiff(text) {
  const out = [];
  let cur = null;
  let hunk = null;
  const strip = (p) => p.replace(/^[ab]\//, '').replace(/\t.*$/, '').trim();
  // The newline ending the last line is not a blank context line.
  for (const line of normalize(text).replace(/\n+$/, '').split('\n')) {
    let m;
    if ((m = line.match(/^--- (.+)$/))) {
      cur = { before: m[1].trim() === '/dev/null' ? null : strip(m[1]), after: null, hunks: [] };
      out.push(cur);
      hunk = null;
      continue;
    }
    if (cur && (m = line.match(/^\+\+\+ (.+)$/)) && !hunk) {
      cur.after = m[1].trim() === '/dev/null' ? null : strip(m[1]);
      continue;
    }
    if (cur && (m = line.match(/^@@ -(\d+)(?:,\d+)? \+\d+(?:,\d+)? @@/))) {
      hunk = { oldStart: Number(m[1]), lines: [] };
      cur.hunks.push(hunk);
      continue;
    }
    if (!hunk || line.startsWith('\\')) continue;
    const t = line[0];
    if (t === ' ' || t === '-' || t === '+') hunk.lines.push({ t, s: line.slice(1) });
    else if (line === '') hunk.lines.push({ t: ' ', s: '' });
  }
  return out.filter((f) => f.before || f.after).map((f) => ({
    path: f.after || f.before, created: !f.before, deleted: !f.after, hunks: f.hunks,
  }));
}

/**
 * The content a file must have once the hunks are applied to `before` (null when the file is new).
 * Each hunk's old lines (context and removed) are found in order, from the previous hunk on — at its
 * stated line first, else anywhere after. Throws when a hunk does not match: the patch does not apply.
 */
function applyHunks(before, file) {
  if (file.deleted) return null;
  const lines = before === null ? [] : normalize(before).split('\n');
  const trailing = before !== null && normalize(before).endsWith('\n');
  if (trailing) lines.pop();
  const out = [];
  let pos = 0;
  for (const h of file.hunks) {
    const old = h.lines.filter((l) => l.t !== '+').map((l) => l.s);
    const fits = (at) => old.every((s, i) => lines[at + i] === s);
    let at = Math.max(pos, h.oldStart - 1);
    if (!old.length) at = before === null ? 0 : Math.max(pos, h.oldStart);
    else if (!fits(at)) {
      at = -1;
      for (let i = pos; i + old.length <= lines.length; i += 1) if (fits(i)) { at = i; break; }
      if (at === -1) throw new Error(`hunk @@ -${h.oldStart} does not match ${file.path}`);
    }
    out.push(...lines.slice(pos, at));
    for (const l of h.lines) if (l.t !== '-') out.push(l.s);
    pos = at + old.length;
  }
  out.push(...lines.slice(pos));
  return `${out.join('\n')}${trailing || before === null ? '\n' : ''}`;
}

/**
 * The expected before/after fingerprint of every file a patch names, from the files on disk now.
 * @returns {Array<{path: string, created: boolean, deleted: boolean, before: string|null, after: string|null, beforeText: string|null}>}
 */
function planPatch(dataRoot, files) {
  return files.map((f) => {
    const abs = path.resolve(dataRoot, f.path);
    let before = null;
    try { before = fs.readFileSync(abs, 'utf8'); } catch { /* new file */ }
    if (before === null && !f.created) throw new Error(`${f.path} does not exist, but the patch edits it`);
    if (before !== null && f.created) throw new Error(`${f.path} already exists, but the patch creates it`);
    const after = applyHunks(before, f);
    return { path: f.path, created: f.created, deleted: f.deleted, before: before === null ? null : sha(before), after: after === null ? null : sha(after), beforeText: before };
  });
}

/** Fingerprint of a file on disk now, or null when it does not exist. */
function onDisk(dataRoot, rel) {
  try { return sha(fs.readFileSync(path.resolve(dataRoot, rel), 'utf8')); } catch { return null; }
}

const SKIP_DIRS = new Set(['.git', 'node_modules', 'target', 'build', 'dist', 'out', 'test-results', 'allure-results', 'allure-report', 'playwright-report', '.gradle', '.idea']);

/** Every file under a root (data-root relative), with its fingerprint — the scope a repair may touch. */
function treeFingerprints(dataRoot, rootRel) {
  const out = {};
  const walk = (dir) => {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name)); continue; }
      const abs = path.join(dir, e.name);
      try { out[path.relative(dataRoot, abs).replace(/\\/g, '/')] = sha(fs.readFileSync(abs)); } catch { /* unreadable */ }
    }
  };
  walk(path.resolve(dataRoot, rootRel));
  return out;
}

/**
 * Compares the files on disk with a recorded plan, and the scope roots with their recorded trees.
 * @returns {{state: 'applied'|'not-applied'|'partial'|'mismatch', applied: string[], notApplied: string[], mismatched: string[], unexpected: string[]}}
 */
function verifyApplied(dataRoot, plan, trees) {
  const applied = [];
  const notApplied = [];
  const mismatched = [];
  for (const f of plan) {
    const now = onDisk(dataRoot, f.path);
    if (now === f.after) applied.push(f.path);
    else if (now === f.before) notApplied.push(f.path);
    else mismatched.push(f.path);
  }
  const patched = new Set(plan.map((f) => f.path));
  const unexpected = [];
  for (const [root, before] of Object.entries(trees || {})) {
    const now = treeFingerprints(dataRoot, root);
    for (const k of new Set([...Object.keys(before), ...Object.keys(now)])) {
      if (!patched.has(k) && before[k] !== now[k]) unexpected.push(k);
    }
  }
  let state = 'applied';
  if (mismatched.length) state = 'mismatch';
  else if (notApplied.length && applied.length) state = 'partial';
  else if (notApplied.length) state = 'not-applied';
  return { state, applied, notApplied, mismatched, unexpected };
}

module.exports = { sha, parseUnifiedDiff, applyHunks, planPatch, onDisk, treeFingerprints, verifyApplied };
