import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createGameServer } from "./serve-game.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const screenshotDirectory = path.join(projectRoot, "artifacts", "ui-regression");
fs.mkdirSync(screenshotDirectory, { recursive: true });

const SPIKES = [
  {
    id: "dom",
    label: "DOM SceneRuntime",
    urlPath: "/public/spikes/light-scene/dom/index.html",
    manifestPath: path.join(projectRoot, "public", "spikes", "light-scene", "dom", "spike-manifest.json"),
    screenshot: "light-scene-spike-dom.png",
  },
  {
    id: "phaser",
    label: "Phaser SceneRuntime",
    urlPath: "/public/spikes/light-scene/phaser/index.html",
    manifestPath: path.join(projectRoot, "public", "spikes", "light-scene", "phaser", "spike-manifest.json"),
    screenshot: "light-scene-spike-phaser.png",
  },
];

const VIEWPORTS = [
  { id: "mobile", width: 390, height: 844 },
  { id: "desktop", width: 1280, height: 900 },
];

const progress = (message) => {
  if (process.env.LIGHT_SCENE_VERBOSE === "1") console.error(`[light-scene-browser] ${message}`);
};

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    const candidates = [
      process.env.PEOPLE_LIFE_PLAYWRIGHT_PATH,
      path.join(os.homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright", "index.mjs"),
    ].filter(Boolean);
    const modulePath = candidates.find((candidate) => fs.existsSync(candidate));
    if (!modulePath) throw new Error("未找到Playwright；可通过PEOPLE_LIFE_PLAYWRIGHT_PATH指定index.mjs路径");
    return import(pathToFileURL(modulePath).href);
  }
}

function browserExecutable() {
  const candidates = [
    process.env.PEOPLE_LIFE_BROWSER_PATH,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ].filter(Boolean);
  const executable = candidates.find((candidate) => fs.existsSync(candidate));
  if (!executable) throw new Error("未找到Edge或Chrome；可通过PEOPLE_LIFE_BROWSER_PATH指定浏览器路径");
  return executable;
}

function readManifest(spike) {
  if (!fs.existsSync(spike.manifestPath)) {
    throw new Error(`${spike.label}清单不存在：${path.relative(projectRoot, spike.manifestPath)}`);
  }
  try {
    return JSON.parse(fs.readFileSync(spike.manifestPath, "utf8"));
  } catch (error) {
    throw new Error(`${spike.label}清单不是有效JSON：${error.message}`);
  }
}

async function visibleLocator(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count() && await locator.isVisible()) return locator;
  }
  return null;
}

async function visibleCount(page, selector) {
  return page.locator(selector).evaluateAll((entries) => entries.filter((entry) => {
    const style = getComputedStyle(entry);
    const box = entry.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0" && box.width > 0 && box.height > 0;
  }).length);
}

const selectors = {
  stage: [
    '[data-testid="main-stage"]',
    '[data-main-stage]',
    '[data-scene-stage]',
    '#scene-stage',
    '#main-stage',
    'canvas',
  ],
  actionBar: [
    '[data-testid="context-action-bar"]',
    '[data-context-action-bar]',
    '#context-action-bar',
    '[data-action-bar]',
    '[aria-label*="情境动作"]',
    '[aria-label*="动作"]',
  ],
  sceneNodes: [
    '[data-scene-node]',
    '[data-node-id]',
    '[data-testid^="scene-node-"]',
    'button[data-node]',
  ],
  accessibleObjects: [
    '[data-accessible-object]',
    '[data-accessible-object-list] [role="button"]',
    '#accessible-object-list [role="button"]',
    '#accessible-object-list button',
    '[data-object-list] [role="button"]',
  ],
  feedback: [
    '[data-scene-feedback]',
    '[data-scene-state]',
    '[data-feedback-state]',
    '[aria-live="polite"]',
    '[aria-live="assertive"]',
  ],
  reducedMotion: [
    '#motion-mode-select',
    '[data-motion-mode]',
    'select[name*="motion"]',
    '[data-action="reduce-motion"]',
    '[data-action="motion-off"]',
    'button:has-text("减少动态")',
    'button:has-text("减少动画")',
  ],
  partner: [
    '[data-node-id="partner"]',
    '[data-node-id="companion"]',
    '[data-scene-node="partner"]',
    '[data-person-id="partner"]',
    '[data-object-id="partner"]',
    '[aria-label*="伙伴"]',
    'button:has-text("伙伴")',
  ],
  marble: [
    '[data-node-id="marbles"]',
    '[data-node-id="marble"]',
    '[data-prop-id="marbles"]',
    '[data-prop-id="marble"]',
    '[data-object-id="marbles"]',
    '[aria-label*="弹珠"]',
    'button:has-text("弹珠")',
  ],
  joinPlay: [
    '[data-action-id="join-marbles"]',
    '[data-action-id="join-play"]',
    '[data-action="join-marbles"]',
    '[data-action="join-play"]',
    'button:has-text("加入弹珠")',
    'button:has-text("加入玩耍")',
    'button:has-text("加入")',
  ],
  marbleAction: [
    '[data-action-id="inspect-marbles"]',
    '[data-action-id="find-marbles"]',
    '[data-action-id="play-marbles"]',
    '[data-action="inspect-marbles"]',
    '[data-action="find-marbles"]',
    'button:has-text("找弹珠")',
    'button:has-text("看弹珠")',
    'button:has-text("玩弹珠")',
    'button:has-text("观察")',
  ],
};

async function captureFeedback(page) {
  return page.evaluate((feedbackSelectors) => {
    const elements = feedbackSelectors.flatMap((selector) => [...document.querySelectorAll(selector)]);
    const values = elements.map((element) => ({
      selector: element.id ? `#${element.id}` : element.tagName.toLowerCase(),
      text: (element.textContent ?? "").trim(),
      state: element.getAttribute("data-state") ?? element.getAttribute("data-feedback-state") ?? element.getAttribute("aria-live") ?? "",
    }));
    const stage = document.querySelector("[data-testid=main-stage], [data-main-stage], [data-scene-stage], #scene-stage, #main-stage");
    return JSON.stringify({
      values,
      bodyState: document.body.dataset.sceneState ?? document.body.dataset.feedbackState ?? "",
      stageState: stage?.getAttribute("data-state") ?? stage?.getAttribute("data-scene-state") ?? "",
      sceneVersion: window.__lightSceneFeedbackVersion ?? null,
      text: stage?.textContent?.trim() ?? "",
    });
  }, selectors.feedback);
}

async function waitForFeedbackChange(page, before, label) {
  await page.waitForFunction(({ selectors: feedbackSelectors, previous }) => {
    const elements = feedbackSelectors.flatMap((selector) => [...document.querySelectorAll(selector)]);
    const values = elements.map((element) => ({
      selector: element.id ? `#${element.id}` : element.tagName.toLowerCase(),
      text: (element.textContent ?? "").trim(),
      state: element.getAttribute("data-state") ?? element.getAttribute("data-feedback-state") ?? element.getAttribute("aria-live") ?? "",
    }));
    const stage = document.querySelector("[data-testid=main-stage], [data-main-stage], [data-scene-stage], #scene-stage, #main-stage");
    const current = JSON.stringify({
      values,
      bodyState: document.body.dataset.sceneState ?? document.body.dataset.feedbackState ?? "",
      stageState: stage?.getAttribute("data-state") ?? stage?.getAttribute("data-scene-state") ?? "",
      sceneVersion: window.__lightSceneFeedbackVersion ?? null,
      text: stage?.textContent?.trim() ?? "",
    });
    return current !== previous;
  }, { selectors: selectors.feedback, previous: before }, { timeout: 8000 }).catch((error) => {
    throw new Error(`${label}后未观察到NPC/物件反馈状态改变：${error.message}`);
  });
}

async function checkViewport(page, viewport, spike) {
  const overflow = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  if (overflow.documentWidth > overflow.viewportWidth + 1 || overflow.bodyWidth > overflow.viewportWidth + 1) {
    throw new Error(`${spike.label} ${viewport.id} 存在横向溢出：${JSON.stringify(overflow)}`);
  }
}

async function checkInitialSurface(page, spike, manifest) {
  const stage = await visibleLocator(page, selectors.stage);
  if (!stage) throw new Error(`${spike.label}没有可见主舞台入口（需要main-stage或canvas）`);
  const actionBar = await visibleLocator(page, selectors.actionBar);
  if (!actionBar) throw new Error(`${spike.label}没有可见情境动作条`);

  const sceneNodes = await visibleLocator(page, selectors.sceneNodes);
  const nodeCount = sceneNodes ? await visibleCount(page, selectors.sceneNodes.join(",")) : 0;
  const accessibleCount = await visibleCount(page, selectors.accessibleObjects.join(","));
  if (nodeCount < 4 && accessibleCount < 4) {
    throw new Error(`${spike.label}可见节点不足4个：sceneNodes=${nodeCount}, accessibleObjects=${accessibleCount}, manifestNodes=${manifest.nodes?.length ?? 0}`);
  }

  const focusable = page.locator('button:visible, a:visible, input:visible, select:visible, summary:visible, [tabindex]:not([tabindex="-1"]):visible').first();
  if (!await focusable.count()) throw new Error(`${spike.label}没有键盘可聚焦入口`);
  await focusable.focus();
  const focused = await page.evaluate((element) => element === document.activeElement || element.contains(document.activeElement), await focusable.elementHandle());
  if (!focused) throw new Error(`${spike.label}首个语义入口无法获得键盘焦点`);
}

async function checkReducedMotion(page, spike) {
  const control = await visibleLocator(page, selectors.reducedMotion);
  if (!control) throw new Error(`${spike.label}没有可用的减少动态入口`);
  const tagName = await control.evaluate((element) => element.tagName.toLowerCase());
  if (tagName === "select") {
    const options = await control.locator("option").evaluateAll((entries) => entries.map((entry) => entry.value));
    const target = options.includes("reduced") ? "reduced" : options.includes("off") ? "off" : null;
    if (!target) throw new Error(`${spike.label}动态选择器没有reduced或off选项`);
    await control.selectOption(target);
    await page.waitForFunction((value) => (
      document.body.dataset.motion === value
      || document.documentElement.dataset.motion === value
      || document.querySelector("select")?.value === value
    ), target, { timeout: 3000 });
  } else {
    await control.click();
    await page.waitForFunction(() => (
      document.body.dataset.motion === "reduced"
      || document.body.dataset.motion === "off"
      || document.documentElement.dataset.motion === "reduced"
      || document.documentElement.dataset.motion === "off"
      || document.body.classList.contains("motion-reduced")
      || document.body.classList.contains("motion-off")
    ), null, { timeout: 3000 });
  }
}

async function performAction(page, spike, targetSelectors, actionSelectors, actionLabel) {
  const target = await visibleLocator(page, targetSelectors);
  if (target) await target.click();
  const action = await visibleLocator(page, actionSelectors);
  if (!action) throw new Error(`${spike.label}找不到${actionLabel}入口`);
  const before = await captureFeedback(page);
  await action.click();
  await waitForFeedbackChange(page, before, `${spike.label}${actionLabel}`);
}

async function runSpike(browser, serverPort, spike) {
  const manifest = readManifest(spike);
  const result = {
    id: spike.id,
    label: spike.label,
    url: `http://127.0.0.1:${serverPort}${spike.urlPath}`,
    viewports: {},
    screenshot: path.relative(projectRoot, path.join(screenshotDirectory, spike.screenshot)),
    errors: [],
  };

  for (const viewport of VIEWPORTS) {
    progress(`${spike.id}:${viewport.id}:start`);
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const pageErrors = [];
    const consoleErrors = [];
    page.on("pageerror", (error) => pageErrors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    const checks = [];
    try {
      await page.goto(result.url, { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.waitForFunction(() => document.readyState === "interactive" || document.readyState === "complete", null, { timeout: 5000 });
      await page.locator(selectors.stage.join(",")).first().waitFor({ state: "visible", timeout: 10000 });
      await checkViewport(page, viewport, spike);
      progress(`${spike.id}:${viewport.id}:overflow-ok`);
      checks.push("no_horizontal_overflow");
      await checkInitialSurface(page, spike, manifest);
      progress(`${spike.id}:${viewport.id}:surface-ok`);
      checks.push("main_stage_action_bar_nodes_and_keyboard_entry");
      await checkReducedMotion(page, spike);
      progress(`${spike.id}:${viewport.id}:motion-ok`);
      checks.push("reduced_motion");

      if (viewport.id === "mobile") {
        await page.screenshot({
          path: path.join(screenshotDirectory, `light-scene-spike-${spike.id}-initial.png`),
          fullPage: false,
        });
        await performAction(page, spike, selectors.partner, selectors.joinPlay, "伙伴加入玩耍");
        progress(`${spike.id}:${viewport.id}:partner-ok`);
        checks.push("partner_join_play_feedback");
        await performAction(page, spike, selectors.marble, selectors.marbleAction, "弹珠互动");
        progress(`${spike.id}:${viewport.id}:marble-ok`);
        checks.push("marble_partner_feedback");
        await page.screenshot({ path: path.join(screenshotDirectory, spike.screenshot), fullPage: false });
      }

      if (pageErrors.length > 0) throw new Error(`页面错误：${pageErrors.join(" | ")}`);
      if (consoleErrors.length > 0) throw new Error(`控制台错误：${consoleErrors.join(" | ")}`);
      result.viewports[viewport.id] = { ok: true, width: viewport.width, height: viewport.height, checks };
      progress(`${spike.id}:${viewport.id}:complete`);
    } catch (error) {
      result.viewports[viewport.id] = {
        ok: false,
        width: viewport.width,
        height: viewport.height,
        checks,
        error: error.message,
        pageErrors,
        consoleErrors,
      };
      result.errors.push(`${viewport.id}：${error.message}`);
    } finally {
      await page.close();
    }
  }
  result.ok = result.errors.length === 0;
  return result;
}

const server = createGameServer(projectRoot);
const output = {
  ok: false,
  contract: "T0-light-scene-spike-browser-v1",
  viewports: VIEWPORTS.map(({ id, width, height }) => `${width}x${height}`),
  screenshots: SPIKES.map((spike) => path.relative(projectRoot, path.join(screenshotDirectory, spike.screenshot))),
  spikes: [],
  errors: [],
};

try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: true, executablePath: browserExecutable() });
  try {
    for (const spike of SPIKES) {
      try {
        const result = await runSpike(browser, port, spike);
        output.spikes.push(result);
        output.errors.push(...result.errors.map((error) => `${spike.label}：${error}`));
      } catch (error) {
        output.spikes.push({ id: spike.id, label: spike.label, ok: false, errors: [error.message], viewports: {} });
        output.errors.push(`${spike.label}：${error.message}`);
      }
    }
  } finally {
    await browser.close();
  }
} catch (error) {
  output.errors.push(error.message);
} finally {
  await new Promise((resolve) => server.close(() => resolve()));
}

output.ok = output.errors.length === 0 && output.spikes.length === SPIKES.length && output.spikes.every((spike) => spike.ok);
console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exitCode = 1;
