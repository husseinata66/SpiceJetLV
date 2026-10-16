// Governed file mutation — the one engine every controlled write outside a run's own folder goes through
// (Phase 9.4): Target/Reference Project writes, shared automation asset changes, Platform Knowledge promotion.
//
// WHAT IT GUARANTEES, for a list of approved changes under one permitted root:
//   - CONTAINMENT: every path is relative, has no `..`, is not inside `.git/`, and its REAL path (through any
//     symbolic link or junction) stays inside the root's real path. Checked before anything is touched.
//   - NO STALE WRITE: each change carries the fingerprint of what it expects to find (null = must not exist).
//     If the file on disk is not exactly that, nothing is written (STALE_TARGET) — an approval covers the
//     state it was given for, never a state that changed since.
//   - RECOVERABLE: a journal is written BEFORE the first write, and every file about to be replaced or
//     deleted is backed up. Any failure part-way restores every touched file and marks the journal
//     rolled-back. A process killed mid-way leaves the journal `in-progress`; `recoverJournal` restores it,
//     and callers refuse new work while one is open.
// It decides nothing about WHETHER a change may happen — callers check approval, ownership and safety first.

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { writeFileAtomic, writeJsonAtomic } = require('./atomicFile');
const { realPathOf } = require('./pathBoundary');

class FileMutationError extends Error {
  constructor(message, code) { super(message); this.name = 'FileMutationError'; this.code = code; }
}

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
/** The fingerprint of a file, or null when it does not exist. */
function fileSha(abs) {
  try { return sha256(fs.readFileSync(abs)); } catch (err) { if (err.code === 'ENOENT') return null; throw err; }
}

const testHooks = {};
/** Test-only (Node test runner), like runState._setTestHooks: lets a test interrupt an apply after file N. */
function _setTestHooks(h = {}) {
  if (!process.env.NODE_TEST_CONTEXT) throw new FileMutationError('_setTestHooks is available only under the Node test runner.', 'TEST_ONLY');
  for (const k of Object.keys(testHooks)) delete testHooks[k];
  Object.assign(testHooks, h);
}

/**
 * Resolves `rel` under `root` and proves it stays there (lexically and by real path).
 * @returns {string} the absolute path
 */
function resolveInside(root, rel, what = 'path') {
  const raw = String(rel ?? '').trim().replace(/\\/g, '/');
  if (!raw) throw new FileMutationError(`An empty ${what} is not a path.`, 'OUTSIDE_ROOT');
  if (path.isAbsolute(raw) || /^[A-Za-z]:/.test(raw)) throw new FileMutationError(`${what} "${rel}" must be relative to its root, not absolute.`, 'OUTSIDE_ROOT');
  const parts = raw.split('/');
  if (parts.includes('..')) throw new FileMutationError(`${what} "${rel}" contains a ".." segment — refused.`, 'OUTSIDE_ROOT');
  // Repository internals are never written (Phase 9.5, R-02). Windows compares names case-insensitively and
  // strips trailing dots and spaces (".GIT", ".git.", ".git " all name .git); a ":" names an alternate data
  // stream (".git::$INDEX_ALLOCATION"). The canonical real path is checked below as well, which also catches an
  // 8.3 short name (GIT~1) and a junction or symbolic link that leads into a .git folder.
  if (parts.some((p) => p.includes(':'))) throw new FileMutationError(`${what} "${rel}" names an alternate data stream or a drive — refused.`, 'OUTSIDE_ROOT');
  const isGit = (seg) => seg.replace(/[. ]+$/, '').toLowerCase() === '.git';
  if (parts.some(isGit)) throw new FileMutationError(`${what} "${rel}" is inside .git — repository internals are never written.`, 'OUTSIDE_ROOT');
  const absRoot = path.resolve(root);
  const abs = path.resolve(absRoot, raw);
  const inside = (r, p) => { const x = path.relative(r, p); return x !== '' && !x.startsWith('..') && !path.isAbsolute(x); };
  if (!inside(absRoot, abs)) throw new FileMutationError(`${what} "${rel}" resolves outside ${absRoot}.`, 'OUTSIDE_ROOT');
  const norm = (p) => (process.platform === 'win32' ? p.toLowerCase() : p);
  const realRoot = realPathOf(absRoot);
  const realAbs = realPathOf(abs);
  if (!inside(norm(realRoot), norm(realAbs))) {
    throw new FileMutationError(`${what} "${rel}" escapes ${absRoot} through a symbolic link or junction (it resolves to ${realAbs}).`, 'OUTSIDE_ROOT');
  }
  if (path.relative(realRoot, realAbs).split(path.sep).some(isGit)) {
    throw new FileMutationError(`${what} "${rel}" resolves into a .git folder (${realAbs}) — repository internals are never written.`, 'OUTSIDE_ROOT');
  }
  return abs;
}

function readJournal(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

/**
 * Applies `changes` under `root`.
 * @param {{root: string, changes: Array<{op: 'create'|'update'|'delete', path: string, beforeSha: string|null,
 *          content?: Buffer|string, afterSha?: string}>, journalFile: string, backupDir: string, label?: string}} o
 * @returns {{state: 'applied', applied: object[]}}
 */
function applyFileChanges({ root, changes, journalFile, backupDir, label = 'change' }) {
  const prior = readJournal(journalFile);
  if (prior && (prior.state === 'in-progress' || prior.state === 'conflict')) {
    throw new FileMutationError(`${label}: an earlier apply was interrupted (${journalFile}) — recover it first; nothing new is written while it is open.`, 'INTERRUPTED');
  }
  if (prior && prior.state === 'applied') throw new FileMutationError(`${label} was already applied — a plan is applied once.`, 'ALREADY_APPLIED');
  // 1. Every check before any write.
  const planned = changes.map((c, i) => {
    if (!['create', 'update', 'delete'].includes(c.op)) throw new FileMutationError(`${label}: change ${i + 1} has unknown operation "${c.op}".`, 'INVALID_ARGUMENT');
    const abs = resolveInside(root, c.path, `${label} path`);
    const now = fileSha(abs);
    if (now !== (c.beforeSha ?? null)) {
      throw new FileMutationError(`${label}: ${c.path} is not what was approved — expected ${c.beforeSha ? c.beforeSha.slice(0, 12) : 'no file'}, found ${now ? now.slice(0, 12) : 'no file'}. Nothing was written; plan and approve again.`, 'STALE_TARGET');
    }
    if (c.op !== 'delete') {
      const buf = Buffer.isBuffer(c.content) ? c.content : Buffer.from(String(c.content ?? ''), 'utf8');
      if (c.afterSha && sha256(buf) !== c.afterSha) throw new FileMutationError(`${label}: the content for ${c.path} is not the approved content.`, 'STALE_SOURCE');
      return { ...c, abs, buf };
    }
    return { ...c, abs };
  });
  // 2. Journal first, then backups.
  fs.mkdirSync(backupDir, { recursive: true });
  const journal = { state: 'in-progress', label, root: path.resolve(root), startedAt: new Date().toISOString(), changes: planned.map((c, i) => ({ op: c.op, path: c.path, beforeSha: c.beforeSha ?? null, afterSha: c.op === 'delete' ? null : sha256(c.buf), backup: c.beforeSha ? `${i}.bak` : null, done: false })) };
  planned.forEach((c, i) => { if (c.beforeSha) fs.copyFileSync(c.abs, path.join(backupDir, `${i}.bak`)); });
  writeJsonAtomic(journalFile, journal);
  // 3. Apply; on any failure, restore what was touched.
  try {
    planned.forEach((c, i) => {
      if (c.op === 'delete') fs.rmSync(c.abs, { force: true });
      else writeFileAtomic(c.abs, c.buf);
      journal.changes[i].done = true;
      writeJsonAtomic(journalFile, journal);
      if (typeof testHooks.afterFile === 'function') testHooks.afterFile(i, c);
    });
  } catch (err) {
    restore(journal, backupDir);
    journal.state = 'rolled-back';
    journal.error = String(err.message).split('\n')[0];
    journal.endedAt = new Date().toISOString();
    writeJsonAtomic(journalFile, journal);
    throw new FileMutationError(`${label}: failed part-way (${journal.error}) — every touched file was restored; nothing remains changed.`, 'ROLLED_BACK');
  }
  journal.state = 'applied';
  journal.endedAt = new Date().toISOString();
  writeJsonAtomic(journalFile, journal);
  return { state: 'applied', applied: journal.changes };
}

function restore(journal, backupDir) {
  for (const c of [...journal.changes].reverse()) {
    const abs = resolveInside(journal.root, c.path, 'journal path');
    if (c.backup) {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.copyFileSync(path.join(backupDir, c.backup), abs);
    } else if (c.op === 'create') {
      fs.rmSync(abs, { force: true });
    }
  }
}

/**
 * Recovers an interrupted (`in-progress`) journal — never over another actor's work (Phase 9.5, R-05).
 *
 * Each file must still be in one of the two states the interrupted apply knows: its approved "before" state,
 * or exactly what the apply wrote. If any file is in neither, someone else changed it after the interruption:
 * nothing is restored, the journal becomes `conflict`, and each conflicting file's current content is kept as
 * evidence (in `evidenceDir`, never in committed run data). A named human then chooses:
 *   keep-current      undo only this apply's own writes; every conflicting file keeps the other actor's version
 *   restore-approved  put every file back to its approved "before" state (the other versions stay in evidence)
 * @returns {{state: string, recovered: boolean, conflicts?: object[]}}
 */
function recoverJournal({ journalFile, backupDir, evidenceDir, resolution } = {}) {
  const j = readJournal(journalFile);
  if (!j) return { state: 'none', recovered: false };
  if (j.state !== 'in-progress' && j.state !== 'conflict') return { state: j.state, recovered: false };
  const status = j.changes.map((c) => {
    const abs = resolveInside(j.root, c.path, 'journal path');
    const now = fileSha(abs);
    return { c, abs, now, ours: now === (c.op === 'delete' ? null : c.afterSha), approved: now === (c.beforeSha ?? null) };
  });
  const conflicts = status.filter((s) => !s.ours && !s.approved);
  if (conflicts.length && !resolution) {
    if (evidenceDir) {
      fs.mkdirSync(evidenceDir, { recursive: true });
      conflicts.forEach((s) => { if (s.now) fs.copyFileSync(s.abs, path.join(evidenceDir, `${j.changes.indexOf(s.c)}.current`)); });
    }
    j.state = 'conflict';
    j.conflicts = conflicts.map((s) => ({ path: s.c.path, found: s.now, expectedBefore: s.c.beforeSha ?? null, expectedOurs: s.c.op === 'delete' ? null : s.c.afterSha, evidence: s.now ? `${j.changes.indexOf(s.c)}.current` : null }));
    writeJsonAtomic(journalFile, j);
    return { state: 'conflict', recovered: false, conflicts: j.conflicts };
  }
  if (resolution && !['keep-current', 'restore-approved'].includes(resolution)) throw new FileMutationError(`Unknown resolution "${resolution}" — keep-current or restore-approved.`, 'INVALID_ARGUMENT');
  const conflicted = new Set(conflicts.map((s) => s.c.path));
  const toRestore = resolution === 'keep-current' ? { ...j, changes: j.changes.filter((c) => !conflicted.has(c.path)) } : j;
  restore(toRestore, backupDir);
  j.state = conflicts.length ? `recovered-${resolution}` : 'recovered';
  j.resolution = resolution || null;
  j.endedAt = new Date().toISOString();
  writeJsonAtomic(journalFile, j);
  return { state: j.state, recovered: true, conflicts: conflicts.map((s) => ({ path: s.c.path })) };
}

module.exports = { FileMutationError, sha256, fileSha, resolveInside, applyFileChanges, recoverJournal, readJournal, _setTestHooks };
