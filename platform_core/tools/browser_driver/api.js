// Browser Driver API — the ONLY surface agents/automation scripts should use.
//
// Agents must never call Playwright directly. They request an authenticated `BrowserDriver`
// session (`BrowserDriver.authenticate(...)`) and then use its operation-level methods —
// navigate/click/type/screenshot/annotatedScreenshot/extractText/extractTable/waitFor/captureNetwork.
//
// This module (like driver.js) is shared platform infrastructure ONLY — it contains no
// project-specific data itself. Locator knowledge is deliberately kept OUT of the Browser
// Profile (which stays small and stable — auth/browser-init only, see driver.js) and lives
// instead under the single project root, loaded on demand:
//   platform_core_data/knowledge_base/browser/screens/{ScreenName}.json      — one screen's locators
//   platform_core_data/knowledge_base/browser/components/{ComponentName}.json — shared/reusable locators
// Call `useScreen('ScreenName')` / `useComponent('ComponentName')` to load one into the active
// locator set; `click()`/`type()`/etc. then accept either a dotted key into that set (e.g.
// "nav.master", "addButton") or a literal Playwright selector as a fallback.
//
// Guardrails wired in by default:
//   - Any unexpected browser dialog (alert/confirm/prompt/beforeunload) is captured and DISMISSED
//     (never accepted, so a destructive confirmation is never silently confirmed) — check
//     `driver.takePendingDialog()` after any action and stop if one fired.
//   - Network requests/responses are captured continuously; `captureNetwork()` drains the buffer.

const fs = require('fs');
const path = require('path');
const { launchAuthenticated, projectBrowserDir, projectUiScreenshotsDir } = require('./driver');
const {
  OVERLAY_ID,
  validateRects,
  buildOverlayScript,
  buildCleanupScript,
  buildOverlayPayload,
  annotatedName,
} = require('./annotate');

function knowledgeFilePath(kind, name) {
  return path.join(projectBrowserDir(), kind, `${name}.json`);
}

function readKnowledgeFile(kind, name) {
  // kind: 'screens' | 'components'
  const filePath = knowledgeFilePath(kind, name);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `No ${kind.slice(0, -1)} definition "${name}". Expected: ${filePath}\n` +
      `Add it under platform_core_data/knowledge_base/browser/${kind}/ — see platform_core/tools/browser_driver/README.md.`
    );
  }
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  // Schema: { meta?: {...}, locators: {...} } — fall back to treating the whole file as locators
  // for any file that predates the meta/locators split.
  return parsed.locators ? parsed.locators : parsed;
}

function resolveLocator(locators, keyOrSelector) {
  const parts = keyOrSelector.split('.');
  let node = locators;
  for (const part of parts) {
    if (node && typeof node === 'object' && Object.prototype.hasOwnProperty.call(node, part)) {
      node = node[part];
    } else {
      node = undefined;
      break;
    }
  }
  if (typeof node === 'string') return node;
  return keyOrSelector; // not found in loaded Screen/Component knowledge — treat as a literal selector
}

class BrowserDriver {
  constructor({ browser, context, page, profile, env }) {
    this.browser = browser;
    this.context = context;
    this.page = page;
    this.profile = profile;
    this.env = env;
    this._locators = {}; // populated only via useScreen()/useComponent() — never from profile.json
    this._networkLog = [];
    this._pendingDialog = null;
    this._wireGuardrails();
  }

  /**
   * The only way to obtain a session. Never construct BrowserDriver directly.
   *
   * `headless` is REQUIRED — the human's explicit Headed/Headless choice for this launch (pipeline.md §6
   * Rule 11). No profile or per-stage default decides it any more (Phase 9.3): a missing choice is refused
   * with MODE_REQUIRED before anything is launched.
   */
  static async authenticate({ env, credentialsPath, headless, stage, app, preflight } = {}) {
    const { browser, context, page, profile, env: resolvedEnv } = await launchAuthenticated({
      env, credentialsPath, headless, stage, app, preflight,
    });
    return new BrowserDriver({ browser, context, page, profile, env: resolvedEnv });
  }

  _wireGuardrails() {
    this.page.on('dialog', async (dialog) => {
      this._pendingDialog = { type: dialog.type(), message: dialog.message(), time: Date.now() };
      // Never accept — accepting could confirm a destructive/production-risk action.
      await dialog.dismiss();
    });
    this.page.on('request', (req) => {
      this._networkLog.push({ kind: 'request', method: req.method(), url: req.url(), time: Date.now() });
    });
    this.page.on('response', (res) => {
      this._networkLog.push({ kind: 'response', status: res.status(), url: res.url(), time: Date.now() });
    });
  }

  /** Returns and clears any dialog captured since the last check — call after every action. */
  takePendingDialog() {
    const d = this._pendingDialog;
    this._pendingDialog = null;
    return d;
  }

  /** Loads a screen's locator definitions into the active set (merged, screen/component wins last-loaded). */
  useScreen(screenName) {
    this._locators = { ...this._locators, ...readKnowledgeFile('screens', screenName) };
    return this;
  }

  /** Loads a shared component's locator definitions into the active set. */
  useComponent(componentName) {
    this._locators = { ...this._locators, ...readKnowledgeFile('components', componentName) };
    return this;
  }

  resolve(keyOrSelector) {
    return resolveLocator(this._locators, keyOrSelector);
  }

  async navigate(pathOrUrl) {
    const isAbsolute = /^https?:\/\//i.test(pathOrUrl);
    const url = isAbsolute ? pathOrUrl : new URL(pathOrUrl, this.profile.defaultBaseUrl).toString();
    await this.page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
  }

  async click(keyOrSelector) {
    await this.page.click(this.resolve(keyOrSelector));
  }

  async type(keyOrSelector, text) {
    await this.page.fill(this.resolve(keyOrSelector), text);
  }

  async select(keyOrSelector, optionLabel) {
    await this.page.selectOption(this.resolve(keyOrSelector), { label: optionLabel });
  }

  async screenshot(name, opts = {}) {
    const outDir = opts.dir || process.cwd();
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const filePath = path.join(outDir, name.endsWith('.png') ? name : `${name}.png`);
    await this.page.screenshot({ path: filePath, fullPage: opts.fullPage !== false });
    return filePath;
  }

  /**
   * Discovery evidence for something this run could NOT understand: the original screenshot, plus an
   * annotated copy with a high-contrast rectangle around each unclear element.
   *
   * See .claude/skills/explorer-skill/SKILL.md §5.10–§5.12 and §11 rule 34. Required whenever
   * Discovery raises an Open Question, records an ambiguous UI observation, cannot determine a
   * control's purpose, or finds a mismatch it cannot yet classify — because a full-page screenshot
   * of a 45-field form does not tell a reviewer WHICH field the question is about.
   *
   * ORDER IS PART OF THE CONTRACT. The original is captured FIRST, before a single node is injected,
   * so the unmodified evidence exists on disk even if annotation then fails entirely. Capturing the
   * annotated copy first and "cleaning up afterwards" would mean a mid-capture failure leaves only a
   * marked-up image and no pristine one.
   *
   * CLEANUP IS GUARANTEED. Removal runs in a `finally`, so the overlay is gone whether the capture
   * succeeded, threw, or timed out. It is idempotent and swallows its own errors, so it can never
   * mask the original failure with a second one. A stray rectangle surviving into a LATER Finding's
   * evidence would be worse than no annotation at all — it would be a rectangle pointing at the
   * wrong question.
   *
   * @param {string} name - base evidence name, e.g. "failure" or "failure.png"
   * @param {Array<{selector: string, label: string, note?: string}>} rects - one per unclear item;
   *        every rect MUST carry a label (Q1, Q2, or the Open Question ID) that maps to a written
   *        question in the Finding
   * @param {{dir?: string, fullPage?: boolean}} [opts]
   * @returns {Promise<{originalPath: string, annotatedPath: string, drawn: object[], missing: string[]}>}
   *          `missing` names any label whose selector matched nothing — a missing rectangle is a
   *          missing question, so the caller must act on it rather than publishing silently.
   */
  async annotatedScreenshot(name, rects, opts = {}) {
    const validated = validateRects(rects);

    // 1. The pristine original, before anything is injected.
    const originalPath = await this.screenshot(name, opts);

    const outDir = opts.dir || process.cwd();
    const annotatedPath = path.join(outDir, annotatedName(name));

    let result = { drawn: [], missing: validated.map((r) => r.label) };
    try {
      // 2. Inject, capture, and — in the finally — always remove.
      result = await this.page.evaluate(buildOverlayScript(), buildOverlayPayload(validated));
      await this.page.screenshot({ path: annotatedPath, fullPage: opts.fullPage !== false });
    } finally {
      await this._removeAnnotationOverlay();
    }

    return { originalPath, annotatedPath, drawn: result.drawn, missing: result.missing };
  }

  /**
   * Removes the annotation overlay. Idempotent, never throws.
   *
   * Separate and public-ish so a caller that annotated through some other path — or that suspects a
   * previous run died mid-capture — can guarantee a clean page before the next interaction.
   * @returns {Promise<boolean>} whether removal ran cleanly
   */
  async _removeAnnotationOverlay() {
    try {
      return await this.page.evaluate(buildCleanupScript(), OVERLAY_ID);
    } catch {
      // The page may be closed, navigated, or crashed. Cleanup failing here is not worth surfacing:
      // this method is called from a `finally`, and throwing would replace a real capture error with
      // a cleanup error. A navigated-away page has already discarded the overlay anyway.
      return false;
    }
  }

  async extractText(keyOrSelector) {
    return (await this.page.locator(this.resolve(keyOrSelector)).innerText()).trim();
  }

  /** Returns a table as an array of rows, each an array of cell strings (header row included). */
  async extractTable(keyOrSelector) {
    const sel = this.resolve(keyOrSelector);
    return this.page.locator(sel).evaluate((table) => {
      const rows = Array.from(table.querySelectorAll('tr'));
      return rows.map((row) =>
        Array.from(row.querySelectorAll('th,td')).map((cell) => cell.innerText.trim())
      );
    });
  }

  async waitFor(keyOrSelector, opts = {}) {
    await this.page.waitForSelector(this.resolve(keyOrSelector), opts);
  }

  /** Drains and returns everything captured since the last call (or since session start). */
  captureNetwork() {
    const log = this._networkLog;
    this._networkLog = [];
    return log;
  }

  /**
   * UI Knowledge Base baseline capture — ONE canonical, versioned screenshot per screen, distinct
   * from Discovery run evidence (which stays under artifacts/discovery/, per-run/temporary).
   *
   * Idempotent: if platform_core_data/knowledge_base/ui/screenshots/{screenName}.png already exists, this is a
   * no-op (never overwrites) unless `opts.refresh` is explicitly true — refreshing is a deliberate,
   * human-approved action, never automatic.
   *
   * Also creates/updates platform_core_data/knowledge_base/browser/screens/{screenName}.json's `meta` block
   * (screenName, navigationPath, lastVerified, screenshot, accessRoles, pageTitle) without
   * touching any existing `locators` in that file.
   *
   * @param {string} screenName
   * @param {object} [opts]
   * @param {string} [opts.navigationPath] - human-readable nav path, e.g. "Master → Flight → Airport"
   * @param {string[]} [opts.accessRoles] - which role(s) this baseline was captured under
   * @param {boolean} [opts.refresh] - explicitly allow overwriting an existing baseline
   * @returns {{ screenshotPath: string, created: boolean, meta: object }}
   */
  async captureBaseline(screenName, opts = {}) {
    const uiDir = projectUiScreenshotsDir();
    if (!fs.existsSync(uiDir)) fs.mkdirSync(uiDir, { recursive: true });
    const screenshotFile = `${screenName}.png`;
    const screenshotPath = path.join(uiDir, screenshotFile);

    const alreadyExists = fs.existsSync(screenshotPath);
    let created = false;
    if (!alreadyExists || opts.refresh) {
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      created = true;
    }

    const pageTitle = await this.page.title().catch(() => undefined);
    const today = new Date().toISOString().slice(0, 10);

    const screenFilePath = knowledgeFilePath('screens', screenName);
    let existing = { locators: {} };
    if (fs.existsSync(screenFilePath)) {
      const parsed = JSON.parse(fs.readFileSync(screenFilePath, 'utf8'));
      existing = parsed.locators ? parsed : { locators: parsed }; // migrate pre-meta/locators files
    } else {
      const dir = path.dirname(screenFilePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }

    const meta = {
      screenName,
      navigationPath: opts.navigationPath || (existing.meta && existing.meta.navigationPath) || '',
      lastVerified: today,
      screenshot: screenshotFile,
      accessRoles: opts.accessRoles || (existing.meta && existing.meta.accessRoles) || [],
      pageTitle: pageTitle || (existing.meta && existing.meta.pageTitle) || '',
    };

    const updated = { meta, locators: existing.locators || {} };
    fs.writeFileSync(screenFilePath, JSON.stringify(updated, null, 2) + '\n');

    return { screenshotPath, created, meta };
  }

  async close() {
    await this.browser.close();
  }
}

module.exports = { BrowserDriver };
