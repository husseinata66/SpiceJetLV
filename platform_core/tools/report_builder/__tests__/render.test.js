const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { esc, renderReport } = require('../render');

const EXAMPLE = path.join(__dirname, '..', 'examples', 'example.report.json');

function render(overrides = {}) {
  return renderReport({
    title: 'QA Execution Report',
    testCases: {
      categories: [
        { key: 'positive', cases: [{ id: 'TC-01', title: 'A passing case', status: 'PASS' }] },
      ],
    },
    ...overrides,
  });
}

test('esc neutralises every HTML-significant character', () => {
  assert.equal(esc(`<a href="x">&'`), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
});

test('renderReport produces one self-contained document with inlined CSS and JS', () => {
  const html = render();
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /<title>QA Execution Report<\/title>/);
  assert.ok(html.includes('--paper:#F3F5F8'), 'stylesheet is inlined');
  assert.ok(html.includes("document.querySelectorAll('details.tc')"), 'script is inlined');
  assert.ok(!/<link\b|<script[^>]+src=/.test(html), 'no external asset is referenced');
  assert.match(html, /<\/body><\/html>\s*$/);
});

test('renderReport escapes model text rather than emitting it as markup', () => {
  const html = render({
    testCases: {
      categories: [{ key: 'positive', cases: [{ title: '<img src=x onerror=alert(1)>', status: 'PASS' }] }],
    },
  });
  assert.ok(!html.includes('<img src=x'), 'raw markup must not survive');
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
});

test('renderReport emits an html-typed value verbatim', () => {
  const html = render({
    testCases: {
      categories: [{
        key: 'positive',
        cases: [{ title: 'X', status: 'PASS', rows: [{ label: 'Ref', value: { html: '<b>US-4222</b>' } }] }],
      }],
    },
  });
  assert.ok(html.includes('<b>US-4222</b>'));
});

test('renderReport tags each case with data-status and a tone class for filtering', () => {
  const html = render({
    testCases: {
      categories: [{
        key: 'positive',
        cases: [
          { title: 'A', status: 'PASS' },
          { title: 'B', status: 'FAIL' },
        ],
      }],
    },
  });
  assert.ok(html.includes('<details class="tc tone-pass" data-status="PASS">'));
  assert.ok(html.includes('<details class="tc tone-fail" data-status="FAIL">'));
});

test('renderReport builds the donut gradient in declared status order and closes it at 100%', () => {
  const html = render({
    testCases: {
      categories: [{
        key: 'positive',
        cases: [
          { title: 'A', status: 'PASS' },
          { title: 'B', status: 'PASS' },
          { title: 'C', status: 'FAIL' },
          { title: 'D', status: 'BLOCKED' },
        ],
      }],
    },
  });
  assert.ok(html.includes(
    'conic-gradient(var(--good) 0% 50%, var(--critical) 50% 75%, var(--serious) 75% 100%)',
  ));
  assert.ok(html.includes('<div class="donut-pct">50%</div>'));
});

test('renderReport offers one status filter option per declared status', () => {
  const html = render({
    statuses: [
      { key: 'PASS', label: 'Passed', tone: 'pass' },
      { key: 'ERROR', label: 'Errored', tone: 'fail' },
    ],
    testCases: { categories: [{ key: 'flow', cases: [{ title: 'A', status: 'ERROR' }] }] },
  });
  assert.ok(html.includes('<option value="ERROR">ERROR</option>'));
  assert.ok(!html.includes('<option value="BLOCKED">'));
});

test('renderReport omits the test-case toolbar entirely when there are no test cases', () => {
  const html = renderReport({
    title: 'Findings only',
    summary: null,
    sections: [{ type: 'findings', title: 'Findings', items: [{ kind: 'Defect', body: 'Broken' }] }],
  });
  assert.ok(!html.includes('id="tcSearch"'));
  assert.ok(html.includes('<div class="finding tone-accent">'));
});

test('renderReport redacts a header marked redacted and never prints its value', () => {
  const html = render({
    testCases: {
      categories: [{
        key: 'positive',
        cases: [{
          title: 'X',
          status: 'PASS',
          exchanges: [{
            request: {
              line: 'POST to https://example.internal/api',
              headers: [
                { name: 'x-api-key', value: 'super-secret-value', redacted: true },
                { name: 'Content-Type', value: 'application/json' },
              ],
            },
          }],
        }],
      }],
    },
  });
  assert.ok(!html.includes('super-secret-value'), 'the secret must not reach the document');
  assert.ok(html.includes('x-api-key: <span class="rr-redacted">[REDACTED]</span>'));
  assert.ok(html.includes('Content-Type: application/json'));
});

test('renderReport escapes a JSON body inside its <pre> block', () => {
  const html = render({
    testCases: {
      categories: [{
        key: 'positive',
        cases: [{
          title: 'X',
          status: 'PASS',
          exchanges: [{ response: { line: 'Status code 200', body: '{"note": "<b>a & b</b>"}' } }],
        }],
      }],
    },
  });
  assert.ok(html.includes('<pre>{&quot;note&quot;: &quot;&lt;b&gt;a &amp; b&lt;/b&gt;&quot;}</pre>'));
});

test('renderReport spaces the response title only when a request precedes it', () => {
  const withBoth = render({
    testCases: {
      categories: [{
        key: 'positive',
        cases: [{
          title: 'X',
          status: 'PASS',
          exchanges: [{ request: { line: 'GET /x' }, response: { line: 'Status code 200' } }],
        }],
      }],
    },
  });
  assert.ok(withBoth.includes('<div class="rr-title rr-response-title">Response</div>'));

  const responseOnly = render({
    testCases: {
      categories: [{
        key: 'positive',
        cases: [{ title: 'X', status: 'PASS', exchanges: [{ response: { line: 'Status code 200' } }] }],
      }],
    },
  });
  assert.ok(responseOnly.includes('<div class="rr-title">Response</div>'));
});

test('renderReport shows per-category counts for every declared status', () => {
  const html = render({
    testCases: {
      categories: [{
        key: 'positive',
        name: 'Positive',
        cases: [{ title: 'A', status: 'PASS' }, { title: 'B', status: 'FAIL' }],
      }],
    },
  });
  assert.ok(html.includes('<span class="cc tone-pass">1 passed</span>'));
  assert.ok(html.includes('<span class="cc tone-fail">1 failed</span>'));
  assert.ok(html.includes('<span class="cc tone-blocked">0 blocked</span>'));
});

test('renderReport renders an empty section as its empty text, not a blank block', () => {
  const html = render({
    sections: [{ type: 'findings', title: 'Findings', items: [], emptyText: 'No defects were found.' }],
  });
  assert.ok(html.includes('<div class="empty">No defects were found.</div>'));
});

test('renderReport code-wraps a finding field unless mono is disabled', () => {
  const html = render({
    sections: [{
      type: 'findings',
      title: 'Findings',
      items: [{
        kind: 'Defect',
        body: 'Broken',
        fields: [
          { label: 'Field', value: 'agency.name' },
          { label: 'Impact', value: 'Stale name shown.', mono: false },
        ],
      }],
    }],
  });
  assert.ok(html.includes('<b>Field:</b> <code>agency.name</code>'));
  assert.ok(html.includes('<b>Impact:</b> Stale name shown.'));
});

test('renderReport renders the example model end to end', () => {
  const model = JSON.parse(fs.readFileSync(EXAMPLE, 'utf8'));
  const html = renderReport(model);
  assert.ok(html.includes('TC-AGENCY-POS-01'));
  assert.ok(html.includes('Cleanup / follow-up'));
  assert.ok(html.includes('<span class="pill tone-neutral">COMPLETE</span>'), 'the example has failures, so its pill is not green');
  assert.ok(!html.includes('undefined'), 'no unresolved value leaked into the document');
});
