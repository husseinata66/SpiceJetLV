const test = require('node:test');
const assert = require('node:assert/strict');

const {
  RunnerError, groupIdOf, parseCapabilityPlan, selectGroup, listGroups,
  guardTest, installGuard, guardConfig, renderLog, renderSummary, tallyText,
} = require('../index');
const { chooseApp } = require('../runner');
const { displayMode, parseArgs } = require('../cli');

const PLAN = `# Capability Plan — ancillaries / flynas-ndc

Generated 2026-10-17T23:38:29.366Z by \`platform_core/tools/capability_gate\` from \`platform_core_data/x/TestCases.xlsx\`.

## Supplier capabilities

| Capability | Value |
|---|---|
| Hold | Not Supported |
| Seat | Supported |
| Bundle | Supported |

Supplier rules: ladies-only-seats, business-cabin

## Will run (4)

\`TC-SM-NAV-001\`, \`TC-SM-NAV-002b\`, \`TC-ML-003\`, \`TC-SM-NEG-004\`

Of these, 1 are not yet approved at Review and will be excluded by the Review gate: \`TC-SM-NEG-004\`.

## Excluded — not supported by supplier (1)

| Test Case ID | Title | Reason |
|---|---|---|
| TC-SM-BND-006 | No fare packages | Only for suppliers without Bundle — this supplier supports it |
`;

const CASES = [
  { id: 'TC-SM-NAV-001', title: 'Two steps', setupGroup: '01 Default - 1 adult + 1 child + 1 infant' },
  { id: 'TC-SM-NAV-002b', title: 'Required twice', setupGroup: '01 Default - 1 adult + 1 child + 1 infant' },
  { id: 'TC-SM-BND-006', title: 'No packages', setupGroup: '01 Default' },
  { id: 'TC-SM-NEG-004', title: 'Unreviewed', setupGroup: '01 Default' },
  { id: 'TC-SM-PAX-099', title: 'Not planned', setupGroup: '01 Default' },
  { id: 'TC-ML-003', title: 'Meal', setupGroup: '2 Business' },
  { id: 'TC-SM-X-001', title: 'No group', setupGroup: '' },
];

const GUARD = {
  forbid: [/^(book|hold|pay|issue)\b/i, /^save quote\b/i, /^confirm (and )?(book|pay|hold)/i],
  allow: [/^book flight\b/i, /^book \d+[a-z] for \S/i],
};

test('groupIdOf reads the leading number and pads it', () => {
  assert.equal(groupIdOf('01 Default - 1 adult'), '01');
  assert.equal(groupIdOf('2 Business'), '02');
  assert.equal(groupIdOf(''), null);
  assert.equal(groupIdOf('Default'), null);
});

test('parseCapabilityPlan reads the frozen decision the gate wrote', () => {
  const plan = parseCapabilityPlan(PLAN);
  assert.equal(plan.source, 'platform_core_data/x/TestCases.xlsx');
  assert.deepEqual([...plan.willRun], ['TC-SM-NAV-001', 'TC-SM-NAV-002b', 'TC-ML-003', 'TC-SM-NEG-004']);
  assert.deepEqual([...plan.awaitingReview], ['TC-SM-NEG-004']);
  assert.equal(plan.excluded.get('TC-SM-BND-006'), 'Only for suppliers without Bundle — this supplier supports it');
  assert.deepEqual(plan.capabilities, { Hold: 'Not Supported', Seat: 'Supported', Bundle: 'Supported' });
  assert.deepEqual(plan.rules, ['ladies-only-seats', 'business-cabin']);
});

test('selectGroup keeps the group and marks what may not run, and why', () => {
  const sel = selectGroup(CASES, parseCapabilityPlan(PLAN), '01');
  const by = Object.fromEntries(sel.map((c) => [c.id, c]));
  assert.deepEqual(Object.keys(by), ['TC-SM-NAV-001', 'TC-SM-NAV-002b', 'TC-SM-BND-006', 'TC-SM-NEG-004', 'TC-SM-PAX-099']);
  assert.equal(by['TC-SM-NAV-001'].plan, 'run');
  assert.match(by['TC-SM-BND-006'].reason, /^Not supported by supplier/);
  assert.equal(by['TC-SM-NEG-004'].reason, 'Not approved at Review');
  assert.equal(by['TC-SM-PAX-099'].reason, "Not in this run's Capability Plan");
});

test('listGroups orders groups and skips cases without one', () => {
  const g = listGroups(CASES);
  assert.deepEqual([...g.keys()], ['01', '02']);
  assert.equal(g.get('01').label, 'Default - 1 adult + 1 child + 1 infant');
  assert.equal(g.get('01').ids.length, 5);
});

test('the guard refuses booking actions and allows their look-alikes', () => {
  const cfg = guardConfig(GUARD);
  for (const n of ['Book', 'Book Now', ' Hold ', 'Pay', 'Pay after Hold', 'Issue Ticket', 'Save Quote', 'Confirm and Book']) {
    assert.equal(guardTest(cfg, n), true, `should refuse "${n}"`);
  }
  for (const n of ['Book Flight ', 'Book 6A for Mohanad', 'Booking-Mid Office', 'Confirm 2 seats', 'Accept', 'Next', '']) {
    assert.equal(guardTest(cfg, n), false, `should allow "${n}"`);
  }
});

test('guardConfig refuses to run without a guard', () => {
  assert.throws(() => guardConfig(undefined), RunnerError);
  assert.throws(() => guardConfig({ forbid: [], allow: [] }), RunnerError);
});

test('the in-page guard stops a refused click before the app sees it', () => {
  const listeners = {};
  const refused = [];
  global.window = { addEventListener: (type, fn, capture) => { listeners[type] = { fn, capture }; }, __runnerRefused: (n) => refused.push(n) };
  try {
    installGuard(guardConfig(GUARD), guardTest);
    assert.equal(listeners.click.capture, true);
    const click = (text) => {
      const el = { innerText: text, getAttribute: () => null };
      const ev = { target: { closest: () => el }, stopped: false, prevented: false };
      ev.stopImmediatePropagation = () => { ev.stopped = true; };
      ev.preventDefault = () => { ev.prevented = true; };
      listeners.click.fn(ev);
      return ev;
    };
    const blocked = click('Book');
    assert.equal(blocked.stopped && blocked.prevented, true);
    assert.equal(click('Book 5D for Mohanad').stopped, false);
    assert.deepEqual(refused, ['Book']);
  } finally {
    delete global.window;
  }
});

test('a human gate lets only its own control through, and only while it is open', () => {
  const listeners = {};
  const refused = [];
  const pressed = [];
  global.window = {
    addEventListener: (type, fn) => { listeners[type] = { fn }; },
    __runnerRefused: (n) => refused.push(n),
    __runnerGatePressed: (n) => pressed.push(n),
  };
  try {
    installGuard(guardConfig(GUARD), guardTest);
    const click = (text) => {
      const el = { innerText: text, getAttribute: () => null };
      const ev = { target: { closest: () => el }, stopped: false };
      ev.stopImmediatePropagation = () => { ev.stopped = true; };
      ev.preventDefault = () => {};
      listeners.click.fn(ev);
      return ev.stopped;
    };
    assert.equal(click('Book'), true, 'closed gate: Book refused');
    global.window.__runnerHumanGate = ['^book$'];
    assert.equal(click('Book'), false, 'open gate: Book goes through');
    assert.equal(click('Hold'), true, 'open gate: Hold still refused');
    assert.equal(click('Save Quote'), true, 'open gate: Save Quote still refused');
    global.window.__runnerHumanGate = null;
    assert.equal(click('Book'), true, 'gate closed again: Book refused');
    assert.deepEqual(pressed, ['Book']);
    assert.deepEqual(refused, ['Book', 'Hold', 'Save Quote', 'Book']);
  } finally {
    delete global.window;
  }
});

test('chooseApp stays inside the run\'s frozen testingLayerScope', () => {
  const feature = { apps: { Portal: { ui: {} } } };
  const run = { folderName: 'run-1', feature: 'ancillaries', testingLayerScope: ['Portal'], environment: { portal: 'http://p' } };
  assert.equal(chooseApp(run, feature, null).baseUrl, 'http://p');
  assert.throws(() => chooseApp(run, feature, 'Admin'), /outside run-1's frozen testingLayerScope/);
  const both = { ...run, testingLayerScope: ['Portal', 'Admin'], environment: { portal: 'http://p', admin: 'http://a' } };
  assert.throws(() => chooseApp(both, feature, null), /Say --app/);
  assert.throws(() => chooseApp(both, feature, 'Admin'), /no Admin adapter yet/);
});

test('Headed/Headless must be said every time', () => {
  assert.throws(() => displayMode(parseArgs(['run'])), /Say --headed or --headless/);
  assert.throws(() => displayMode(parseArgs(['run', '--headed', '--headless'])), /Choose one/);
  assert.equal(displayMode(parseArgs(['run', '--headed'])), true);
  assert.equal(displayMode(parseArgs(['run', '--headless'])), false);
  assert.throws(() => parseArgs(['--group', '01', '--headfull']), /Unknown flag/);
});

test('renderLog writes the working log, excluded cases apart, and the guard line', () => {
  const model = {
    runFolder: 'run-099__x', feature: 'ancillaries', supplier: 'flynas-ndc', group: '01', groupLabel: 'Default',
    mode: 'Portal · Headed', startedAt: '2026-10-18T10:00:00.000Z', duration: '12m 03s',
    environment: [['Connection used', 'Fly Nas NDC EGY Staging']],
    results: [
      { id: 'TC-SM-NAV-001', status: 'Passed', sec: 0.4, evidence: 'Two steps.' },
      { id: 'TC-SM-PAX-007', status: 'Failed', sec: 2.1, evidence: '3 open | at once', screenshot: 'artifacts/failures/TC-SM-PAX-007.png' },
      { id: 'TC-SM-BND-006', status: 'Excluded', sec: null, evidence: 'Not supported by supplier' },
    ],
    refused: [], aborted: null,
  };
  const md = renderLog(model);
  assert.match(md, /^# Group 01 results — ancillaries \/ flynas-ndc \(run-099__x\)/);
  assert.match(md, /\| TC-SM-PAX-007 \| Failed \| 2\.1 s \| 3 open \\\| at once Screenshot: `artifacts\/failures\/TC-SM-PAX-007\.png`\. \|/);
  assert.match(md, /## Excluded before execution[\s\S]*\| TC-SM-BND-006 \| Not supported by supplier \|/);
  assert.match(md, /never pressed \(the click guard refused nothing\)/);
  assert.equal(tallyText(model.results), 'Passed 1 · Failed 1 · Excluded 1');
  const summary = renderSummary(model, 'platform_core_data/runs/run-099__x/manual_execution/log.md');
  assert.match(summary, /FAILED\s+TC-SM-PAX-007/);
  assert.doesNotMatch(summary, /TC-SM-NAV-001/);
});
