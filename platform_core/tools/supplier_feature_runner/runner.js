'use strict';
// Supplier Feature Runner — the browser half. Runs one Setup Group of one Supplier-Feature run:
// reads the run's frozen Capability Plan, runs the feature's scenario for that group, and writes the
// Markdown working log and the failure screenshots into the run. README.md.

const fs = require('fs');
const os = require('os');
const path = require('path');

const { loadCases } = require('../capability_gate');
const {
  RunnerError, STATUS, SEVERITY, NEEDS_SCREENSHOT, parseCapabilityPlan, selectGroup, listGroups,
  guardTest, installGuard, guardConfig, durationText, renderLog, renderSummary,
} = require('./index');

const read = (f) => fs.readFileSync(f, 'utf8');
const stamp = (d) => d.toISOString().replace(/\.\d+Z$/, '').replace('T', '_').replace(/:/g, '-');

function resolveRunDir(arg, runsDir) {
  if (!arg) throw new RunnerError('--run is required (a run folder name, its "run-NNN" prefix, or a path).');
  if (fs.existsSync(arg) && fs.statSync(arg).isDirectory()) return path.resolve(arg);
  const hits = fs.existsSync(runsDir) ? fs.readdirSync(runsDir).filter((d) => d === arg || d.startsWith(`${arg}__`)) : [];
  if (hits.length !== 1) {
    throw new RunnerError(hits.length ? `"${arg}" matches ${hits.length} runs: ${hits.join(', ')}` : `No run "${arg}" under ${runsDir}.`);
  }
  return path.join(runsDir, hits[0]);
}

/** Everything that does not need a browser: run, plan, suite, feature module, the group's cases. */
function prepare({ runArg, group, dataRoot, repoRoot }) {
  const runDir = resolveRunDir(runArg, path.join(dataRoot, 'runs'));
  const run = JSON.parse(read(path.join(runDir, 'metadata', 'run.json')));
  if (run.scopeFamily !== 'supplier-feature' || !run.feature || !run.supplier) {
    throw new RunnerError(`${run.folderName} is not a Supplier-Feature run bound to one Supplier (scopeFamily/feature/supplier).`);
  }
  const planFile = path.join(runDir, 'metadata', 'CapabilityPlan.md');
  if (!fs.existsSync(planFile)) {
    throw new RunnerError(`No Capability Plan in ${run.folderName}. Run first: node platform_core/tools/capability_gate/cli.js plan --run ${run.folderName} …`);
  }
  const plan = parseCapabilityPlan(read(planFile));
  if (!plan.source) throw new RunnerError('The Capability Plan does not name its suite file.');
  const suite = [path.resolve(repoRoot, plan.source), path.resolve(dataRoot, plan.source)].find((f) => fs.existsSync(f));
  if (!suite) throw new RunnerError(`Suite file not found: ${plan.source}`);
  const cases = loadCases(suite);

  const featureDir = path.join(dataRoot, 'supplier-features', run.feature, 'runner');
  if (!fs.existsSync(path.join(featureDir, 'index.js'))) {
    throw new RunnerError(`Feature "${run.feature}" has no runner module (${path.relative(repoRoot, featureDir)}/index.js).`);
  }
  const feature = require(featureDir);
  const groups = listGroups(cases);
  if (group == null) return { runDir, run, plan, cases, feature, featureDir, groups };

  const id = String(group).padStart(2, '0');
  if (feature.manualGroups && feature.manualGroups[id]) {
    throw new RunnerError(`Group ${id} is manual by human decision (${feature.manualGroups[id]}). The runner never runs it.`);
  }
  const scenario = feature.groups && feature.groups[id];
  if (!scenario) {
    throw new RunnerError(`Group ${id} has no automated scenario yet. Automated groups: ${Object.keys(feature.groups || {}).join(', ') || 'none'}.`);
  }
  if (!groups.has(id)) throw new RunnerError(`The suite has no Setup Group ${id}.`);
  return { runDir, run, plan, cases, feature, featureDir, groups, id, scenario, selected: selectGroup(cases, plan, id) };
}

function loadSettings(featureDir, feature, supplier) {
  const file = path.join(featureDir, 'settings.local.json');
  if (!fs.existsSync(file)) {
    throw new RunnerError(`Missing ${file}. Copy settings.example.json next to it and fill it in (it is git-ignored).`);
  }
  const all = JSON.parse(read(file));
  // `suppliers.<slug>` overlays the shared settings for that Supplier's runs (a route one Supplier flies and
  // another does not, its own credential and ROE…). Objects merge one level deep; everything else replaces.
  const { suppliers, ...settings } = all;
  const own = (suppliers || {})[supplier] || {};
  for (const [k, v] of Object.entries(own)) {
    settings[k] = v && typeof v === 'object' && !Array.isArray(v) && settings[k] && typeof settings[k] === 'object' ? { ...settings[k], ...v } : v;
  }
  if (typeof feature.validateSettings === 'function') feature.validateSettings(settings);
  return settings;
}

function sessionFileFor(feature, portal) {
  const host = new URL(portal).host.replace(/[^\w.-]/g, '_');
  // Outside the repository on purpose: it holds session cookies.
  return path.join(os.homedir(), '.agentic-qa', 'sessions', `${feature}__${host}.json`);
}

async function maximize(context, page) {
  try {
    const cdp = await context.newCDPSession(page);
    const { windowId } = await cdp.send('Browser.getWindowForTarget');
    await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'maximized' } });
  } catch (_) { /* --start-maximized already asked for it */ }
}

async function waitForLogin(page, adapter, { headed, timeoutSec, out }) {
  if (await adapter.isLoggedIn(page).catch(() => false)) return 'saved session';
  if (!headed) throw new RunnerError('Not logged in and running headless. Run once --headed and log in; the session is then reused.');
  out(`Log in in the browser window. Waiting up to ${timeoutSec} s…`);
  const deadline = Date.now() + timeoutSec * 1000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(2000);
    if (await adapter.isLoggedIn(page).catch(() => false)) return 'logged in by the human';
  }
  throw new RunnerError(`Nobody logged in within ${timeoutSec} s.`);
}

/**
 * Which application this execution drives (Portal, Admin, …). It must be inside the run's frozen
 * testingLayerScope — changing that is run_manager's scope-change, never a runner flag.
 */
function chooseApp(run, feature, requested) {
  const apps = feature.apps || {};
  const scope = run.testingLayerScope || [];
  const inScope = scope.filter((x) => Object.prototype.hasOwnProperty.call(apps, x) || /^(Portal|Admin)$/.test(x));
  const name = requested || (inScope.length === 1 ? inScope[0] : null);
  if (!name) throw new RunnerError(`Say --app (${inScope.join(' | ') || 'Portal | Admin'}): this run's scope is [${scope.join(', ')}].`);
  if (!scope.includes(name)) {
    throw new RunnerError(`${name} is outside ${run.folderName}'s frozen testingLayerScope [${scope.join(', ')}]. Change it only with run_manager scope-change.`);
  }
  if (!apps[name]) {
    throw new RunnerError(`The ${run.feature} runner has no ${name} adapter yet (available: ${Object.keys(apps).join(', ') || 'none'}).`);
  }
  const baseUrl = (run.environment || {})[name.toLowerCase()];
  if (!baseUrl) throw new RunnerError(`run.json environment has no "${name.toLowerCase()}" address.`);
  return { name, baseUrl, adapter: apps[name] };
}

async function execute({ runArg, group, app = null, headed, freshLogin = false, only = null, loginTimeoutSec = 300, dataRoot, repoRoot, out = console.log }) {
  if (typeof headed !== 'boolean') throw new RunnerError('Say --headed or --headless. It is asked before every execution, never assumed.');
  const prep = prepare({ runArg, group, dataRoot, repoRoot });
  const { runDir, run, plan, feature, featureDir, id, scenario } = prep;
  if (scenario.assisted && !headed) {
    throw new RunnerError(`Group ${id} stops at ${scenario.assisted} for the human to press it in the window — it needs --headed.`);
  }
  const settings = loadSettings(featureDir, feature, run.supplier);
  const guard = guardConfig(feature.actionGuard);
  const target = chooseApp(run, feature, app);
  const credentialName = run.environment && run.environment.credentialName;
  if (!credentialName) throw new RunnerError('run.json environment must name the credentialName.');

  let selected = prep.selected;
  if (only && only.length) {
    const unknown = only.filter((c) => !selected.some((s) => s.id === c));
    if (unknown.length) throw new RunnerError(`Not in Group ${id}: ${unknown.join(', ')}`);
    selected = selected.filter((s) => only.includes(s.id));
  }
  const planned = new Map(selected.map((c) => [c.id, c]));
  const runnable = (cid) => planned.has(cid) && planned.get(cid).plan === 'run';

  const started = new Date();
  const failDir = path.join(runDir, 'manual_execution', 'artifacts', 'failures');
  fs.mkdirSync(failDir, { recursive: true });

  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: !headed, args: headed ? ['--start-maximized'] : [] });
  const sessionFile = sessionFileFor(run.feature, target.baseUrl);
  const context = await browser.newContext({
    viewport: headed ? null : { width: 1536, height: 864 },
    storageState: !freshLogin && fs.existsSync(sessionFile) ? sessionFile : undefined,
  });
  const refused = [];
  const gatePressed = [];
  await context.exposeFunction('__runnerRefused', (n) => { refused.push(n); });
  await context.exposeFunction('__runnerGatePressed', (n) => { gatePressed.push(n); });
  await context.addInitScript({ content: `(${installGuard})(${JSON.stringify(guard)}, ${guardTest});` });
  const page = await context.newPage();
  // A bit above the bare minimum: one run saw a plain seat-map click miss this when it was 10s,
  // on an otherwise identical booking — network jitter, not a selector problem.
  page.setDefaultTimeout(15000);
  if (headed) await maximize(context, page);

  const results = new Map();
  const environment = [];
  let mark = Date.now();
  let aborted = null;

  const shoot = async (cid, shot = {}) => {
    if (shot.path) return shot.path;
    let file = `${cid}.png`;
    if (fs.existsSync(path.join(failDir, file))) file = `${cid}__${stamp(new Date())}.png`; // never overwrite earlier evidence
    try {
      if (shot.locator) await shot.locator.evaluate((el) => el.scrollIntoView({ block: 'center' })).catch(() => {});
      await page.screenshot({ path: path.join(failDir, file), fullPage: !!shot.fullPage });
      return `artifacts/failures/${file}`;
    } catch (_) { return null; }
  };
  const record = async (cid, status, evidence, shot) => {
    if (!runnable(cid)) return;
    const sec = +((Date.now() - mark) / 1000).toFixed(1);
    mark = Date.now();
    const prev = results.get(cid);
    const r = prev || { id: cid, title: planned.get(cid).title, status, evidence: [], sec: 0, screenshot: null };
    if (prev && SEVERITY[status] > SEVERITY[prev.status]) r.status = status;
    r.evidence.push(evidence);
    r.sec = +(r.sec + sec).toFixed(1);
    if (NEEDS_SCREENSHOT.has(status) && !r.screenshot) r.screenshot = await shoot(cid, shot);
    results.set(cid, r);
  };
  const ctx = {
    headed, assistedStep: false, // a step marked `assisted` may call humanGate even in a group that is not (needs --headed)
    page, context, app: target.name, baseUrl: target.baseUrl, ui: target.adapter.ui, credentialName, settings, run,
    capabilities: plan.capabilities, rules: plan.rules, state: {},
    supported: (cap) => plan.capabilities[cap] === 'Supported',
    wants: (...cids) => cids.some(runnable),
    env: (k, v) => environment.push([k, v]),
    log: (s) => out(`  · ${s}`),
    pass: (cid, ev) => record(cid, STATUS.PASSED, ev),
    fail: (cid, ev, shot) => record(cid, STATUS.FAILED, ev, shot),
    check: (cid, ok, ev, shot) => record(cid, ok ? STATUS.PASSED : STATUS.FAILED, ev, shot),
    na: (cid, ev) => record(cid, STATUS.NA, ev),
    inconclusive: (cid, ev, shot) => record(cid, STATUS.INCONCLUSIVE, ev, shot),
    blocked: (cid, ev, shot) => record(cid, STATUS.BLOCKED, ev, shot),
    /**
     * Assisted groups only: the runner stops, lets ONLY the controls matching `allow` through the guard,
     * and waits — issuing no click of its own — until the page reaches `until` (a URL RegExp) because the
     * HUMAN pressed the control in the window. The guard closes again whatever happens. Execution Safety
     * forbids BOOK / PAYMENT / WALLET_CHARGE for the runner absolutely; this is the human pressing it.
     */
    // `until` is a URL RegExp (the page moves on), or — when the press happens on a popup and the URL stays put —
    // `untilFn` (a function evaluated IN the page, given `untilArg`) that turns true once the human has finished.
    humanGate: async ({ allow, until, untilFn, untilArg, prompt, timeoutSec = 900 }) => {
      if (!scenario.assisted && !ctx.assistedStep) throw new RunnerError('humanGate is only for groups, or steps, marked `assisted`.');
      gatePressed.length = 0;
      out(`\n>>> ${prompt}\n>>> Waiting up to ${Math.round(timeoutSec / 60)} min. The runner presses nothing while it waits.\n`);
      await page.evaluate(({ a, msg }) => {
        window.__runnerHumanGate = a;
        // A banner the human can see in the window (pointer-events: none — it never covers a control).
        const b = document.createElement('div');
        b.id = '__runnerGateBanner';
        b.textContent = `▶ ${msg}`;
        b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;padding:14px 20px;background:#b00020;color:#fff;font:600 18px/1.3 system-ui,sans-serif;text-align:center;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,.4)';
        document.body.appendChild(b);
      }, { a: allow.map((r) => (r instanceof RegExp ? r.source : String(r))), msg: prompt });
      try {
        if (untilFn) await page.waitForFunction(untilFn, untilArg, { timeout: timeoutSec * 1000, polling: 1500 });
        else await page.waitForURL(until, { timeout: timeoutSec * 1000 });
      } finally {
        await page.evaluate(() => { window.__runnerHumanGate = null; const b = document.getElementById('__runnerGateBanner'); if (b) b.remove(); }).catch(() => {});
      }
      const at = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
      environment.push(['Pressed by the human', `${gatePressed.join(', ') || '(the page moved on)'} · ${at}`]);
      return { pressed: [...gatePressed], at };
    },
  };

  try {
    environment.push(['Application', `${target.name} — ${target.baseUrl}`]);
    // A cold browser's very first navigation is slower than the short default used for every later
    // UI interaction; it gets its own margin instead of being timed with the rest.
    await page.goto(new URL(target.adapter.startPath || '/', target.baseUrl).href, { timeout: 45000 });
    environment.push(['Login', await waitForLogin(page, target.adapter, { headed, timeoutSec: loginTimeoutSec, out })]);
    fs.mkdirSync(path.dirname(sessionFile), { recursive: true });
    await context.storageState({ path: sessionFile });

    for (const step of scenario.steps) {
      if (!step.always && !step.cases.some(runnable)) continue;
      out(`${step.name}`);
      mark = Date.now();
      ctx.assistedStep = !!step.assisted;
      try {
        await step.run(ctx);
      } catch (err) {
        const msg = `Step "${step.name}" stopped: ${String((err && err.message) || err).split('\n')[0].slice(0, 220)}`;
        let shot = null;
        if (!step.cases.some(runnable)) { // a setup step belongs to no case — keep its picture anyway
          const where = await shoot(`Group${id}__stopped`, { fullPage: false });
          environment.push(['Stopped at', `${step.name} — ${where || 'no screenshot'}`]);
        }
        for (const cid of step.cases) {
          if (runnable(cid) && !results.has(cid)) {
            shot = shot || { path: await shoot(cid, { fullPage: false }) };
            await record(cid, STATUS.BLOCKED, msg, shot);
          }
        }
        if (step.critical) { aborted = msg; }
      }
      if (refused.length) aborted = `The guard refused "${refused.join('", "')}". The runner never books; stopped.`;
      if (aborted) break;
    }
  } catch (err) {
    aborted = aborted || String((err && err.message) || err).split('\n')[0];
  } finally {
    await context.storageState({ path: sessionFile }).catch(() => {});
    await browser.close().catch(() => {});
  }

  const finished = new Date();
  const ordered = selected.map((c) => {
    if (c.plan !== 'run') return { id: c.id, title: c.title, status: STATUS.EXCLUDED, evidence: c.reason, sec: null };
    const r = results.get(c.id);
    if (r) return { ...r, evidence: r.evidence.filter(Boolean).join(' ') };
    const why = aborted ? `Not reached: ${aborted}` : ((scenario.notAutomated || {})[c.id] || 'No automated check yet — run it by hand.');
    return { id: c.id, title: c.title, status: aborted ? STATUS.BLOCKED : STATUS.NOT_RUN, evidence: why, sec: null };
  });
  const model = {
    runFolder: run.folderName, feature: run.feature, supplier: run.supplier, group: id,
    groupLabel: prep.groups.get(id).label, mode: `${target.name} · ${headed ? 'Headed' : 'Headless'}`,
    startedAt: started.toISOString(), duration: durationText(finished - started),
    environment, results: ordered, refused, aborted,
  };
  const logFile = path.join(runDir, 'manual_execution', `GroupResults_Group${id}_${stamp(started)}.md`);
  fs.writeFileSync(logFile, renderLog(model));
  const rel = path.relative(repoRoot, logFile).replace(/\\/g, '/');
  out(renderSummary(model, rel));
  const bad = ordered.some((r) => NEEDS_SCREENSHOT.has(r.status));
  return { exitCode: aborted || bad ? 2 : 0, logFile, model };
}

module.exports = { execute, prepare, resolveRunDir, sessionFileFor, chooseApp };
