// Stage 3 Manual Test Suite export — renders each authored `TestCases_{Module}.md` into the
// matching `TestCases_{Module}.xlsx`, in the module workspace's `test_design/` folder. Which folder
// that is, is cli.js's decision — see its header; this module exports whatever folder it is handed.
//
// The workbook is DERIVED, never authored: see parseTestCases.js for why that is what actually
// enforces §9's "two renderings of one test case set — they must never diverge."

'use strict';

const fs = require('fs');
const path = require('path');

const { parseTestCases, toRows, FIELDS } = require('./parseTestCases');
const { buildWorkbook } = require('./xlsxWriter');
const { definitionRows, DEFINITION_COLUMN_WIDTHS } = require('./sharedDefinitions');

class ExportError extends Error {}

/** `TestCases_Search.md` -> `Search`. Only files matching this shape are suite documents. */
const SUITE_FILENAME = /^TestCases_(.+)\.md$/;

/**
 * Files that look like suites but are not the current authored one.
 *
 * Historic runs left `TestCases_Search.v1.md` alongside `TestCases_Search.md`. Exporting those too
 * would produce shadow workbooks that Stage 4 could execute against by accident, so they are skipped
 * loudly rather than silently included. `templates/README.md` §6 is explicit that git — not a `.vN`
 * suffix — is the version history.
 */
const VERSIONED_SUFFIX = /\.v\d+$/i;

/**
 * The sheet tab name for a module.
 *
 * Kept as the module name by default. A run may legitimately group several requirement groups into
 * one file (the reference run's `TestCases_Navigation.md` holds NAV + NFR + BR and used the tab name
 * `Navigation_NFR_BR`); `--sheet-name` covers that without making the default surprising.
 */
function defaultSheetName(moduleName) {
  return moduleName;
}

/**
 * Export one suite document.
 *
 * @param {string} markdownPath   Absolute path to `TestCases_{Module}.md`.
 * @param {object} [options]
 * @param {string} [options.sheetName]  Override the sheet tab name.
 * @param {boolean} [options.dryRun]    Parse and report; write nothing.
 * @param {Date}   [options.modified]   Omit for a byte-reproducible workbook.
 * @returns {{module: string, markdownPath: string, xlsxPath: string, caseCount: number,
 *            warnings: string[], written: boolean, bytes: number}}
 */
function exportSuite(markdownPath, options = {}) {
  const base = path.basename(markdownPath);
  const match = SUITE_FILENAME.exec(base);
  if (!match) {
    throw new ExportError(`Not a Manual Test Suite document: ${base} (expected TestCases_{Module}.md)`);
  }
  const moduleName = match[1];

  let markdown;
  try {
    markdown = fs.readFileSync(markdownPath, 'utf8');
  } catch (err) {
    throw new ExportError(`Cannot read ${markdownPath}: ${err.message}`);
  }

  const { cases, warnings, definitions, definitionUsage } = parseTestCases(markdown, { sourceLabel: base });
  const rows = toRows(cases);
  const defRows = definitionRows(definitions, definitionUsage);
  const xlsxPath = markdownPath.replace(/\.md$/, '.xlsx');

  let bytes = 0;
  if (!options.dryRun) {
    const buffer = buildWorkbook({
      sheetName: options.sheetName || defaultSheetName(moduleName),
      rows,
      columnWidths: FIELDS.map((f) => f.width),
      // Shared Definitions get their own sheet after the cases, so Excel readers see the setup and
      // rules a case cites. Sheet 1 stays the cases — the only sheet --import-lifecycle reads.
      ...(defRows ? { extraSheets: [{ sheetName: 'Shared Definitions', rows: defRows, columnWidths: DEFINITION_COLUMN_WIDTHS }] } : {}),
      ...(options.modified ? { modified: options.modified } : {}),
    });
    fs.writeFileSync(xlsxPath, buffer);
    bytes = buffer.length;
  }

  return {
    module: moduleName,
    markdownPath,
    xlsxPath,
    caseCount: cases.length,
    definitionCount: definitions.length,
    warnings,
    written: !options.dryRun,
    bytes,
  };
}

/**
 * Export every suite document in a `test_design/` folder.
 *
 * @param {string} designDir
 * @param {object} [options] Passed through to exportSuite, plus:
 * @param {Record<string,string>} [options.sheetNames] module -> sheet tab name.
 * @returns {{designDir: string, results: object[], skipped: string[], warnings: string[]}}
 */
function exportSuiteDir(designDir, options = {}) {
  if (!fs.existsSync(designDir) || !fs.statSync(designDir).isDirectory()) {
    throw new ExportError(`Not a directory: ${designDir}`);
  }

  const entries = fs.readdirSync(designDir).sort();
  const results = [];
  const skipped = [];

  for (const name of entries) {
    const match = SUITE_FILENAME.exec(name);
    if (!match) continue;
    if (VERSIONED_SUFFIX.test(match[1])) {
      skipped.push(`${name} (superseded .vN copy — git is the version history)`);
      continue;
    }
    results.push(exportSuite(path.join(designDir, name), {
      ...options,
      ...(options.sheetNames && options.sheetNames[match[1]]
        ? { sheetName: options.sheetNames[match[1]] }
        : {}),
    }));
  }

  if (!results.length) {
    throw new ExportError(
      `No TestCases_{Module}.md documents found in ${designDir}.\n`
      + 'Stage 3 authors the Markdown suites first; this tool renders them to Excel.'
    );
  }

  return {
    designDir,
    results,
    skipped,
    warnings: results.flatMap((r) => r.warnings),
  };
}

module.exports = { exportSuite, exportSuiteDir, ExportError, SUITE_FILENAME };
