const test = require('node:test');
const assert = require('node:assert/strict');

const { parseSheet } = require('../readWorkbook');

test('a styled empty cell (self-closing) does not take the next cell\'s value', () => {
  const xml = '<sheetData>'
    + '<row r="1"><c r="A1" t="inlineStr"><is><t>Code</t></is></c><c r="B1" s="3"/>'
    + '<c r="C1" t="inlineStr"><is><t>Review</t></is></c></row>'
    + '<row r="2" s="1"/>'
    + '<row r="3"><c r="A3" t="s"><v>0</v></c><c r="B3" s="3"/><c r="C3" t="s"><v>1</v></c></row>'
    + '</sheetData>';
  const rows = parseSheet(xml, ['TC-1', 'Approved']);
  assert.deepEqual(rows[0], ['Code', '', 'Review']);
  assert.deepEqual(rows[1], []);
  assert.deepEqual(rows[2], ['TC-1', '', 'Approved']);
});
