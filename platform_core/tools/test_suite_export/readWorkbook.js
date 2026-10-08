// Minimal .xlsx READER — the inverse of xlsxWriter.js, and the narrowest one that works.
//
// WHY THIS EXISTS. The workbook is generated output (README.md, "The one rule this tool exists to
// enforce"), so for most columns reading it back would be pointless — the Markdown already holds the
// truth. The `Review` and `Automation` lifecycle columns are the sole exception: they record a HUMAN
// decision made AFTER generation, and a reviewer marks them where reviewing actually happens, which
// is the spreadsheet. Without a reader, that decision lives only in a file the next export silently
// overwrites. See importLifecycle.js for the policy; this module is only the parser.
//
// WHAT IT MUST TOLERATE. Our writer emits STORED (uncompressed) entries with `t="inlineStr"` cells
// and no sharedStrings part. The moment Excel, LibreOffice, or Google Sheets saves the file, that all
// changes: entries become DEFLATE, and strings usually move into `xl/sharedStrings.xml` referenced by
// `t="s"`. A reader that only understood our own output would fail on every file a human had actually
// touched — i.e. on exactly the files this tool is for. So both encodings are handled.
//
// It is deliberately NOT a general xlsx library: no styles, formulas, dates, or multi-sheet
// selection beyond "the first sheet". `platform_core/` must run on a clean install with no
// dependencies (test-design-skill/SKILL.md §9.1 #3), so this is written rather than installed.

'use strict';

const fs = require('fs');
const zlib = require('zlib');

class WorkbookReadError extends Error {}

const SIG_EOCD = 0x06054b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_LOCAL = 0x04034b50;

/**
 * Locate the End Of Central Directory record. It is at the end of the file, but may be followed by
 * a variable-length comment, so it is found by scanning backwards for its signature.
 */
function findEocd(buf) {
  const maxComment = 0xffff;
  const start = Math.max(0, buf.length - maxComment - 22);
  for (let i = buf.length - 22; i >= start; i -= 1) {
    if (buf.readUInt32LE(i) === SIG_EOCD) return i;
  }
  throw new WorkbookReadError('Not a ZIP/xlsx file: no End Of Central Directory record found.');
}

/**
 * Read the ZIP central directory into a name -> {offset, method, sizes} map.
 *
 * The central directory is used rather than scanning local headers, because a local header may
 * legitimately carry zeroed sizes with the real values in a trailing data descriptor — a shape some
 * writers produce and a naive local-header scan silently mis-reads.
 */
function readCentralDirectory(buf) {
  const eocd = findEocd(buf);
  const entryCount = buf.readUInt16LE(eocd + 10);
  let offset = buf.readUInt32LE(eocd + 16);

  if (entryCount === 0xffff || offset === 0xffffffff) {
    throw new WorkbookReadError(
      'This workbook uses ZIP64 extensions, which this minimal reader does not implement. '
      + 'Re-save it from the spreadsheet application, or edit the Markdown suite directly.'
    );
  }

  const entries = new Map();
  for (let i = 0; i < entryCount; i += 1) {
    if (buf.readUInt32LE(offset) !== SIG_CENTRAL) {
      throw new WorkbookReadError(`Corrupt central directory at entry ${i + 1}.`);
    }
    const method = buf.readUInt16LE(offset + 10);
    const compressedSize = buf.readUInt32LE(offset + 20);
    const nameLength = buf.readUInt16LE(offset + 28);
    const extraLength = buf.readUInt16LE(offset + 30);
    const commentLength = buf.readUInt16LE(offset + 32);
    const localOffset = buf.readUInt32LE(offset + 42);
    const name = buf.toString('utf8', offset + 46, offset + 46 + nameLength);

    entries.set(name, { method, compressedSize, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/** Inflate one entry. Method 0 = STORED (our writer), method 8 = DEFLATE (every other writer). */
function readEntry(buf, entry, name) {
  if (buf.readUInt32LE(entry.localOffset) !== SIG_LOCAL) {
    throw new WorkbookReadError(`Corrupt local header for "${name}".`);
  }
  const nameLength = buf.readUInt16LE(entry.localOffset + 26);
  const extraLength = buf.readUInt16LE(entry.localOffset + 28);
  const dataStart = entry.localOffset + 30 + nameLength + extraLength;
  const raw = buf.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.method === 0) return raw.toString('utf8');
  if (entry.method === 8) return zlib.inflateRawSync(raw).toString('utf8');
  throw new WorkbookReadError(
    `"${name}" uses unsupported ZIP compression method ${entry.method} (expected 0 or 8).`
  );
}

const XML_ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
};

function unescapeXml(text) {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    // &amp; is intentionally last: decoding it first would let "&amp;lt;" become "<".
    .replace(/&(lt|gt|quot|apos|amp);/g, (m) => XML_ENTITIES[m]);
}

/** Concatenated text of every <t> in a fragment — an <is>/<si> may hold several runs. */
function textOf(fragment) {
  let out = '';
  const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t(?:\s[^>]*)?\/>/g;
  let m;
  while ((m = re.exec(fragment)) !== null) out += unescapeXml(m[1] || '');
  return out;
}

/** `xl/sharedStrings.xml` -> an array indexed by the `t="s"` cell value. */
function parseSharedStrings(xml) {
  if (!xml) return [];
  const out = [];
  const re = /<si(?:\s[^>]*)?>([\s\S]*?)<\/si>|<si(?:\s[^>]*)?\/>/g;
  let m;
  while ((m = re.exec(xml)) !== null) out.push(textOf(m[1] || ''));
  return out;
}

/** `"K"` -> 10, `"AA"` -> 26. The inverse of xlsxWriter's columnName(). */
function columnIndex(letters) {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/**
 * Parse a worksheet into a dense row/column grid of strings.
 *
 * Cell references are honoured rather than assuming cells arrive in order and none are missing:
 * every spreadsheet application omits empty cells, so a positional read would shift `Review` into
 * `Notes` the moment a reviewer left one Notes cell blank — silently, and with plausible values.
 */
function parseSheet(xml, sharedStrings) {
  const rows = [];
  // The self-closing form is tried FIRST: `<row r="5" .../>` would otherwise match the opening-tag
  // alternative and swallow every following row up to the next `</row>`.
  const rowRe = /<row(?:\s([^>]*?))?\/>|<row(?:\s([^>]*))?>([\s\S]*?)<\/row>/g;
  let rowMatch;
  let sequentialRow = 0;

  while ((rowMatch = rowRe.exec(xml)) !== null) {
    const attrs = rowMatch[1] || rowMatch[2] || '';
    const body = rowMatch[3] || '';
    const rAttr = /\br="(\d+)"/.exec(attrs);
    const rowIndex = rAttr ? Number(rAttr[1]) - 1 : sequentialRow;
    sequentialRow = rowIndex + 1;

    const cells = [];
    // Self-closing first, for the same reason: a styled empty cell (`<c r="R2" s="5"/>`, written by
    // Excel and openpyxl for a blank formatted cell) would otherwise take the NEXT cell's value.
    const cellRe = /<c(?:\s([^>]*?))?\/>|<c(?:\s([^>]*))?>([\s\S]*?)<\/c>/g;
    let cellMatch;
    let sequentialCol = 0;

    while ((cellMatch = cellRe.exec(body)) !== null) {
      const cellAttrs = cellMatch[1] || cellMatch[2] || '';
      const cellBody = cellMatch[3] || '';
      const refAttr = /\br="([A-Z]+)\d+"/.exec(cellAttrs);
      const col = refAttr ? columnIndex(refAttr[1]) : sequentialCol;
      sequentialCol = col + 1;

      const typeAttr = /\bt="([^"]+)"/.exec(cellAttrs);
      const type = typeAttr ? typeAttr[1] : 'n';
      let text = '';

      if (type === 'inlineStr') {
        text = textOf(cellBody);
      } else if (type === 's') {
        const vMatch = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(cellBody);
        const idx = vMatch ? Number(unescapeXml(vMatch[1])) : NaN;
        text = Number.isInteger(idx) && sharedStrings[idx] !== undefined ? sharedStrings[idx] : '';
      } else {
        const vMatch = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(cellBody);
        // `t="str"` (formula result) and numeric cells both carry their value in <v>.
        text = vMatch ? unescapeXml(vMatch[1]) : textOf(cellBody);
      }

      cells[col] = text;
    }

    for (let i = 0; i < cells.length; i += 1) if (cells[i] === undefined) cells[i] = '';
    rows[rowIndex] = cells;
  }

  for (let i = 0; i < rows.length; i += 1) if (rows[i] === undefined) rows[i] = [];
  return rows;
}

/** The first sheet's part name, resolved through the workbook relationships where possible. */
function firstSheetPath(entries) {
  if (entries.has('xl/worksheets/sheet1.xml')) return 'xl/worksheets/sheet1.xml';
  for (const name of entries.keys()) {
    if (/^xl\/worksheets\/[^/]+\.xml$/.test(name)) return name;
  }
  throw new WorkbookReadError('No worksheet part found inside the workbook.');
}

/**
 * Read the first sheet of an .xlsx as a grid of strings.
 *
 * @param {string} xlsxPath
 * @returns {{rows: string[][], sheetPath: string}}
 */
function readWorkbook(xlsxPath) {
  let buf;
  try {
    buf = fs.readFileSync(xlsxPath);
  } catch (err) {
    throw new WorkbookReadError(`Cannot read ${xlsxPath}: ${err.message}`);
  }

  const entries = readCentralDirectory(buf);
  const sheetPath = firstSheetPath(entries);
  const shared = entries.has('xl/sharedStrings.xml')
    ? parseSharedStrings(readEntry(buf, entries.get('xl/sharedStrings.xml'), 'xl/sharedStrings.xml'))
    : [];

  return {
    rows: parseSheet(readEntry(buf, entries.get(sheetPath), sheetPath), shared),
    sheetPath,
  };
}

module.exports = { readWorkbook, WorkbookReadError, columnIndex, parseSharedStrings, parseSheet };
