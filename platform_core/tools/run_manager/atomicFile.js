// Atomic file writes and an exclusive per-run lock — the two guarantees the run state model needs.
//
// WHY THIS EXISTS
// run.json is now rewritten on every stage transition (runState.js), and the Run Manifest is
// rewritten alongside it. Two failure modes matter:
//   1. A PARTIAL WRITE — the process dies mid-write and leaves a truncated run.json. Every reader
//      after that sees a corrupt run. Fix: write a uniquely-named temp file in the same directory,
//      then rename it over the target. A rename within one directory is atomic on POSIX and Windows,
//      so a reader sees the old file or the new one, never half of either. activeRun.js and
//      moduleRegistry.js already use this idiom; this module is the shared, retry-hardened form.
//   2. A LOST UPDATE — two writers read the same run.json, each changes a different field, and the
//      second write silently discards the first. Fix: an exclusive lock file created with
//      `{flag: 'wx'}` (fails if it exists), held across the whole read-modify-write. Same idiom as
//      automation_lifecycle/mergeApply.js's merge lock, plus bounded waiting and stale-lock recovery
//      so a crashed holder cannot block a run forever.
//
// No new dependency: everything here is node:fs.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class LockError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'LockError';
    this.code = code;
  }
}

/** Blocks the current thread for `ms` milliseconds without spinning the CPU. */
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.max(0, ms));
}

/** Windows can refuse a rename while another process briefly holds the target open. */
const TRANSIENT_RENAME_CODES = new Set(['EPERM', 'EACCES', 'EBUSY']);

/**
 * Writes `content` to `file` atomically: unique temp file in the same directory, then rename.
 * A failed write leaves the original file untouched and removes its own temp file.
 * @param {string} file
 * @param {string} content
 * @param {{retries?: number}} [opts]
 */
function writeFileAtomic(file, content, { retries = 50 } = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  fs.writeFileSync(tmp, content, 'utf8');
  for (let attempt = 0; ; attempt += 1) {
    try {
      fs.renameSync(tmp, file);
      return;
    } catch (err) {
      if (!TRANSIENT_RENAME_CODES.has(err.code) || attempt >= retries) {
        try { fs.rmSync(tmp, { force: true }); } catch { /* best effort */ }
        throw err;
      }
      // Up to ~4 s in total: a reader, or an antivirus scan on Windows, can hold the file briefly.
      sleepSync(Math.min(5 + attempt * 5, 100));
    }
  }
}

/** JSON form of writeFileAtomic, in the platform's standard 2-space + trailing-newline shape. */
function writeJsonAtomic(file, value, opts) {
  writeFileAtomic(file, `${JSON.stringify(value, null, 2)}\n`, opts);
}

/**
 * True when `pid` names a live process. `process.kill(pid, 0)` sends no signal — it only checks. EPERM
 * means the process exists but belongs to someone else, which is still "alive".
 */
function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return true; // unknown holder: assume alive, fall back to age
  if (pid === process.pid) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

/** The lock file's record ({token, pid, at}), or null when it cannot be read. */
function readLockRecord(lockPath) {
  try {
    return JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Windows answers a create on a path whose previous file is still being deleted ("delete pending":
 * released by its holder while another process had it open) with access-denied, not EEXIST. It means
 * the lock was JUST released — busy for a moment, never fatal.
 */
const TRANSIENT_CREATE_CODES = new Set(['EPERM', 'EACCES', 'EBUSY']);

/** How long a lock judged dead must stay the SAME lock before it is removed (see withFileLock). */
const DEAD_HOLDER_CONFIRM_MS = 50;

/**
 * Runs `fn` while holding an exclusive lock on `lockPath`.
 *
 * - Waits (with jitter) up to `timeoutMs` for a held lock, then throws LockError LOCK_TIMEOUT.
 * - A lock whose holder process no longer exists is recovered at once: a writer that crashed mid-
 *   update must not block the run for minutes. (On this machine only — a pid is not meaningful
 *   across machines, which is why the age check below still exists.)
 * - A lock older than `staleMs` is treated as abandoned by a crashed holder. It is moved aside with
 *   an atomic rename first, so when two waiters both see it stale, only one of them removes it —
 *   the other's rename fails and it simply retries, instead of deleting a fresh lock.
 * - Release only removes the lock if it still carries this holder's token.
 *
 * @template T
 * @param {string} lockPath
 * @param {() => T} fn
 * @param {{timeoutMs?: number, staleMs?: number, now?: () => number}} [opts]
 * @returns {T}
 */
function withFileLock(lockPath, fn, { timeoutMs = 10000, staleMs = 120000, now = Date.now } = {}) {
  const token = `${process.pid}:${crypto.randomBytes(6).toString('hex')}`;
  const started = now();
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });

  for (;;) {
    try {
      fs.writeFileSync(lockPath, `${JSON.stringify({ token, pid: process.pid, at: new Date(now()).toISOString() })}\n`, { flag: 'wx' });
      break;
    } catch (err) {
      const busy = err.code === 'EEXIST' || TRANSIENT_CREATE_CODES.has(err.code);
      if (!busy) throw err;
      if (err.code === 'EEXIST') {
        let age = null;
        try { age = now() - fs.statSync(lockPath).mtimeMs; } catch { continue; } // released meanwhile
        const judged = readLockRecord(lockPath);
        const holder = judged ? judged.pid ?? null : null;
        let dead = holder !== null && !isProcessAlive(holder);
        // A dead holder is only believed when its lock is still THE SAME lock a moment later. Without
        // this, a waiter that read a lock just as its holder released it and exited (the file lingers
        // while still open on Windows) judges a dead pid — and then removes whatever lock is at the
        // path by then: the next holder's live lock. Two writers, one lost update. A released lock is
        // gone (or replaced, with a new token) after the pause; a crashed holder's lock is still there.
        if (dead) {
          sleepSync(DEAD_HOLDER_CONFIRM_MS);
          const again = readLockRecord(lockPath);
          dead = Boolean(again && judged && again.token === judged.token);
        }
        if ((age !== null && age > staleMs) || dead) {
          const aside = `${lockPath}.stale-${crypto.randomBytes(4).toString('hex')}`;
          try {
            fs.renameSync(lockPath, aside);
            const moved = readLockRecord(aside);
            if (judged && moved && moved.token !== judged.token) {
              // Not the lock that was judged stale (it changed between the check and the rename):
              // put the live lock back where its holder expects it, unless the path was taken again.
              try { fs.linkSync(aside, lockPath); } catch { /* path re-taken; nothing safe to restore */ }
            }
            fs.rmSync(aside, { force: true });
          } catch { /* another waiter recovered it first */ }
          continue;
        }
      }
      if (now() - started > timeoutMs) {
        throw new LockError(
          `Timed out after ${timeoutMs} ms waiting for ${lockPath}. Another process is updating this ` +
          'run. Retry; if no other process is running, the lock clears itself after ' +
          `${Math.round(staleMs / 1000)} s.`,
          'LOCK_TIMEOUT'
        );
      }
      sleepSync(5 + Math.floor(Math.random() * 20));
    }
  }

  try {
    return fn();
  } finally {
    try {
      const held = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      if (held.token === token) fs.rmSync(lockPath, { force: true });
    } catch { /* already gone, or replaced after being judged stale */ }
  }
}

module.exports = {
  LockError,
  isProcessAlive,
  sleepSync,
  writeFileAtomic,
  writeJsonAtomic,
  withFileLock,
};
