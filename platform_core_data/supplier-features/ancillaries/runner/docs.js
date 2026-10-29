'use strict';
// Ancillaries runner — dummy passport Document Numbers, regenerated for every passenger on every run
// (human decisions, Hussein, 2026-10-28: never reuse a document number — a booking fails when one already
// belongs to an existing booking — and use 10 characters mixing letters and digits only).
//
// Every number issued is appended to a history file OUTSIDE the repository
// (~/.agentic-qa/used-document-numbers.txt), so a number is never issued twice, across runs and sessions.
//
// Note: Air Cairo's confirmed rule (run-003) wants a capital A + 8 digits; this shape does not satisfy it.
// Re-introduce a per-Supplier shape before running Air Cairo again.

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I / O, so a number is never misread as 1 / 0
const DIGITS = '23456789';
const ALL = LETTERS + DIGITS;
const LENGTH = 10;
const HISTORY = path.join(os.homedir(), '.agentic-qa', 'used-document-numbers.txt');

let used = null;
function history() {
  if (used) return used;
  try { used = new Set(fs.readFileSync(HISTORY, 'utf8').split(/\r?\n/).filter(Boolean)); } catch { used = new Set(); }
  return used;
}

const pick = (chars) => chars[crypto.randomInt(0, chars.length)];

/** One fresh number: 10 characters, at least one letter and one digit, never issued before. */
function docNumber() {
  const seen = history();
  for (;;) {
    const chars = Array.from({ length: LENGTH }, () => pick(ALL));
    chars[crypto.randomInt(0, LENGTH)] = pick(LETTERS); // guarantee a letter …
    let d; do { d = crypto.randomInt(0, LENGTH); } while (/[A-Z]/.test(chars[d]) && chars.filter((x) => /[A-Z]/.test(x)).length === 1);
    chars[d] = pick(DIGITS); // … and a digit, without removing the only letter
    const n = chars.join('');
    if (!/[A-Z]/.test(n) || !/\d/.test(n) || seen.has(n)) continue;
    seen.add(n);
    try { fs.mkdirSync(path.dirname(HISTORY), { recursive: true }); fs.appendFileSync(HISTORY, `${n}\n`); } catch { /* the in-memory set still prevents repeats in this run */ }
    return n;
  }
}

/** `n` fresh, distinct Document Numbers. */
const freshDocs = (n) => Array.from({ length: n }, docNumber);

module.exports = { freshDocs, docNumber, HISTORY };
