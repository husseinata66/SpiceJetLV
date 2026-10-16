# Report Builder

One HTML report design for every stage that reports results.

A stage writes a **report model** (JSON), the builder renders it to a **single
self-contained HTML file** — inlined CSS and JS, no external asset, light and
dark theme, searchable and filterable test-case tree.

The HTML is produced **alongside** the stage's Markdown report, never instead of
it. Markdown stays the authoritative, diffable, traceable artifact. The HTML is
the shareable view for stakeholders.

## Use it

```bash
node platform_core/tools/report_builder/cli.js verify --model <artifact>.report.json   # the HTML is exactly what the model renders (Phase 9.3)
# build writes only inside the platform data root (or --data-root <a data root with runs/ and knowledge_base/>),
# or a registered report-output root; elsewhere use --stdout (Phase 9.5)
node platform_core/tools/report_builder/cli.js validate --model <model.json>
node platform_core/tools/report_builder/cli.js build    --model <model.json> --out <report.html>
node platform_core/tools/report_builder/cli.js schema
```

`validate` first, then `build`. `validate` exits `2` on a bad model and names the
exact path that is wrong (`statuses[0].tone: unknown tone "plaid"`). Exit `1` is
a usage or I/O failure, not a model failure.

`--out` defaults to the model's own path with `.report.json` → `.html`, so
`ManualQAReport.report.json` becomes `ManualQAReport.html` beside it.

`--model -` reads the model from stdin. `--stdout` (on `build`) writes the HTML
to stdout instead of a file. `--json` makes all three commands print a
machine-readable result instead of the human line — `{ok, out, bytes}` for
`build`, `{ok, title, statuses, categories, testCases, sections}` for
`validate`, `{ok, reference}` for `schema`.

`schema` emits no JSON Schema document despite the name: it prints this README,
which is the model reference, or — with `--json` — the path to it.

Programmatic use:

```js
const { renderReport } = require('platform_core/tools/report_builder');
const html = renderReport(model);   // throws ReportModelError on a bad model
```

## What the page gives the reader

| Region | Comes from |
|---|---|
| Title + status pill | `title`, `statusPill` |
| Run metadata card | `meta.fields`, `meta.runFields` |
| Executive summary — donut, stat cards, duration | `summary` (derived from the test cases when omitted) |
| Test-case tree — search, status filter, category filter, expand/collapse | `testCases` |
| Per case — rows, evidence, request/response, full test case | each case's `rows` / `evidence` / `exchanges` / `detail` |
| Findings, cleanup, notes | `sections` |

## Model reference

### Top level

```jsonc
{
  "title": "QA Execution Report",          // required — the <h1>
  "documentTitle": "Agency - QA Report",   // optional — the browser tab; defaults to title
  "statusPill": "COMPLETE",                // optional — pill beside the title
  "statusPillTone": "neutral",             // optional — defaults to "neutral"; "pass" (green) is refused unless outcomeVerdict is "all-passed"
  "outcomeVerdict": "failures",            // optional — the run's test verdict; "all-passed" must agree with the counts

  "statuses":  [ /* status */ ],           // optional — defaults to PASS/FAIL/BLOCKED
  "meta":      { /* meta */ },             // optional
  "summary":   { /* summary */ },          // optional; `null` removes the block entirely
  "testCases": { /* testCases */ },        // optional
  "sections":  [ /* section */ ]           // optional
}
```

### Tones

Every colour in the report comes from a **tone**, never a raw colour:

`pass` · `fail` · `blocked` · `warning` · `accent` · `neutral`

### `statuses`

The report's status vocabulary. Declare it when the stage does not use
PASS/FAIL/BLOCKED — a Stage 5A run may use `PASSED`/`ERROR`/`SKIPPED`.

```jsonc
[ { "key": "PASS", "label": "Passed", "tone": "pass" } ]
```

`key` is what a test case sets and what the status filter offers. `label` is the
human wording on the stat cards and legend; omit it and the `key` is used.
`tone` defaults to `neutral`. **A test case whose `status` is not
declared here is a validation error** — that is the point: a typo cannot
silently produce an uncoloured, unfilterable card.

### `meta`

```jsonc
{
  "fields":    [ /* field | [field, field] */ ],   // top block
  "runFields": [ /* field | [field, field] */ ]    // block below the divider
}
```

Each entry is either **one field** (its own line) or an **array of fields** (one
side-by-side row). Order is preserved exactly as written.

A **field** is `{ "label": "Scope", "value": "...", "mono": false }`.

### Values: text vs. html

Anywhere a `value` / `body` / step is accepted, you may pass:

- a **string** — escaped, always safe;
- `{ "text": "..." }` — the same thing, spelled out;
- `{ "html": "<b>US-4222</b>" }` — **sanitized** (Phase 9.2, F-17, `sanitize.js`): formatting elements survive; scripts, event handlers, styles, embedded objects, forms and any `javascript:`/external-load URL are removed, and an element outside the allow-list is shown as text. Every report also carries a Content-Security-Policy that allows only its own script (by SHA-256) and loads nothing.

Use `html` only for markup you generated yourself. Never pass application
output, a captured response, or anything a tester typed through `html`.

### `summary`

Everything here is derived from the test cases when omitted, so most stages
supply only `duration`.

```jsonc
{
  "title": "1. Executive Summary",
  "total": 60,                 // defaults to the number of test cases
  "totalLabel": "Total Executed Test Cases",
  "duration": "4h 19m 28s",
  "durationLabel": "Execution Duration",
  "counts": [ { "status": "PASS", "value": 30 } ],   // defaults to the tally
  "donut": { "focus": "PASS", "percent": 50, "label": "pass rate" }
}
```

`total` may exceed the counted cases — a run that executed a subset of a larger
declared suite says so on the card while the donut still reflects what ran. Set
`"donut": null` to drop the ring; it is dropped automatically when nothing was
counted.

### `testCases`

```jsonc
{
  "title": "Test case results",
  "searchPlaceholder": "Search by ID, title, endpoint...",
  "noResultsText": "No test cases match your search...",   // optional
  "open": true,                                            // optional — block starts expanded
  "categories": [
    { "key": "positive", "name": "Positive", "icon": "✅", "open": true,
      "cases": [ /* case */ ] }
  ]
}
```

`key` drives the category filter and must be unique. `icon` defaults from the
key for the known categories — `positive`, `validation`, `boundary`,
`business-rule`, `regression`, `negative`, `security`, `integration`, `flow`,
`performance`, `usability`, `accessibility`. At least one category is required
once `testCases` is present.

### A test case

```jsonc
{
  "id": "TC-SEATMAP-POS-01",
  "title": "Verify a valid GetSeatMap call returns HTTP 200 ...",
  "status": "PASS",
  "statusLabel": "Passed (retry)",   // optional — overrides the status' own label on this card
  "rows": [ { "label": "Expected", "value": "..." } ],
  "evidence": "Live GetSeatMap response for GulfAir/KSA ...",
  "assertions": [ /* assertion — one per checked expectation */ ],
  "exchanges": [ /* exchange */ ],
  "detail": { /* detail */ }
}
```

`rows` are the always-visible lines inside the opened card — `Endpoint Name`,
`Request`, `Response`, `Expected`, `Actual`, `Screen`, `Blocker`, whatever the
stage reports. `Status:` is appended automatically.

`evidence` may also be `{ "summary": "Evidence (screenshots)", "body": "..." }`
when the default `Evidence` toggle wording is not the right one.

### `assertions` — what a pass was checked against

One entry per assertion the case's Expected Result makes (`pipeline.md` §11.4), copied from the
results file's assertion records — never written for the report:

```jsonc
{ "assertion": "New name persists", "expected": "Commercial Name = QA Travel Ltd",
  "actual": "Commercial Name = QA Travel Ltd", "check": "equals", "result": "pass", "evidence": "optional" }
```

`result` is `pass`, `fail` or `unchecked` (`✅` / `❌` accepted). Validation refuses a passing case
that carries a failed or unchecked assertion, and a model whose `outcomeVerdict` is `all-passed` while
a passing case records no assertions. A screenshot or a captured value is evidence, not proof of a pass.

### `exchanges` — request/response capture

Behind the card's *View req & response* toggle. One entry per call; use `label`
for `"Attempt 1 of 2 - GetSeatMap"` when a case made several.

```jsonc
{
  "label": "Attempt 1 of 2 - GetSeatMap",
  "request": {
    "line": "POST to https://host/api/V2/SeatMap/Seat",
    "headers": [
      { "name": "x-api-key", "redacted": true },
      { "name": "Content-Type", "value": "application/json" }
    ],
    "body": "{\n  \"supplier\": \"GulfAir\"\n}"
  },
  "response": { "line": "Status code 200", "body": "{ ... }" },
  "notes": [ "Response headers were not captured for this call." ]
}
```

An exchange must carry a `request`, a `response`, or both. `requestTitle` /
`responseTitle` override the `Request` / `Response` headings, and a message's
`bodyLabel` overrides the `BODY` label above its body.

**`"redacted": true` is how a secret is handled.** The value never reaches the
document — the page prints `[REDACTED]`. A header with no `value` and no
`redacted` is a validation error, so a credential cannot be omitted by accident
and read as absent. Bodies are escaped and rendered in a scrollable `<pre>`.

Excerpt a very large capture and say so in `notes`, exactly as the reference
report does — a 227KB body helps nobody.

### `detail` — the *View Test Case* panel

```jsonc
{
  "preconditions": "AddPassenger completed; offer IDs available.",
  "testData": "GulfAir/KSA, BAH-RUH 2026-10-15",
  "steps": [ "AddPassenger", "GetSeatMap", "Inspect the raw response." ],
  "expected": "HTTP 200; all four top-level fields present and non-null.",
  "priority": "P1",
  "tags": [ "smoke", "regression" ],
  "extra": [ { "heading": "Notes", "value": "..." } ]
}
```

Rendered in that order regardless of key order in the JSON. Omit the panel and
it does not appear — as it also does when every key is empty. `summary`
overrides the toggle's own `View Test Case` wording.

### `sections`

Three types, all collapsible, all optional, rendered in the order given. Every
type accepts `badges`, `emptyText`, and `"open": false` to start collapsed.

**`findings`** — defects and open questions.

```jsonc
{
  "type": "findings",
  "title": "Findings",
  "badges": [ { "value": 11, "label": "Defects", "tone": "blocked" } ],
  "items": [
    {
      "kind": "Defect",              // the label above the item
      "tone": "blocked",             // defaults to "accent"
      "body": "GetSeatMap returns an occupied seat tagged cellCategory=\"Aisle\" ...",
      "refs": "(TC-SEATMAP-VAL-06)", // mono, appended to the body
      "fields": [
        { "label": "Field", "value": "seatMapDetails...cellCategory" },
        { "label": "Impact", "value": "Clients will drop the seat.", "mono": false }
      ],
      "evidence": "Live GetSeatMap response, row 8."
    }
  ]
}
```

A finding field is code-wrapped by default; `"mono": false` turns that off for
prose such as `Impact`.

**`cleanup`** — live artifacts and follow-up left behind by the run.

```jsonc
{
  "type": "cleanup",
  "title": "Cleanup / follow-up",
  "heading": "Live artifacts left behind this run (10):",
  "items": [
    { "label": "Needs Void/Cancel", "ref": "RWNRYI", "refIn": "TC-BOOK-POS-03",
      "body": "Real booking created and ticketed via direct Book." }
  ]
}
```

**`notes`** — free prose and lists.

```jsonc
{
  "type": "notes",
  "title": "Notes",
  "blocks": [ "A paragraph.", { "kind": "ul", "items": [ "One", "Two" ] } ]
}
```

An empty `items`/`blocks` renders `emptyText` rather than a blank block, so
"no defects were found" is stated rather than implied.

## Rules

- **The Markdown report is still written.** The HTML never replaces it.
- **Never hand-write the HTML.** Every report goes through this builder, so one
  fix to the design reaches every stage.
- **Never hand-edit a generated `.html`.** Edit the model and rebuild.
- **Redact through `"redacted": true`**, never by typing a placeholder into a
  header value — that is a convention the tool cannot enforce.
- **`html` values are for markup you generated.** Everything captured from the
  application goes through `text`.
- Run `validate` before `build` in any automated flow, and surface its message
  as-is — it already names the path that is wrong.

## Files

| | |
|---|---|
| `cli.js` | `build` · `validate` · `schema` |
| `model.js` | validation and normalisation — the single source of truth for the shape |
| `render.js` | normalised model → HTML |
| `assets/report.css` | the design system |
| `assets/report.js` | search, filters, expand/collapse, req/res toggles |
| `examples/example.report.json` | a complete, runnable model |
| `__tests__/` | `npm test` covers these |
