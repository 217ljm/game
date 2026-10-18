import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const screenshotDirectory = path.join(projectRoot, "artifacts", "ui-regression");
const viteBin = path.join(projectRoot, "node_modules", "vite", "bin", "vite.js");

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    const candidates = [
      process.env.PEOPLE_LIFE_PLAYWRIGHT_PATH,
      path.join(os.homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright", "index.mjs"),
    ].filter(Boolean);
    const modulePath = candidates.find((candidate) => fs.existsSync(candidate));
    if (!modulePath) throw new Error("未找到 Playwright；可通过 PEOPLE_LIFE_PLAYWRIGHT_PATH 指定 index.mjs");
    return import(pathToFileURL(modulePath).href);
  }
}

function chromeExecutable() {
  const candidates = [
    process.env.PEOPLE_LIFE_BROWSER_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ].filter(Boolean);
  const executable = candidates.find((candidate) => fs.existsSync(candidate));
  if (!executable) throw new Error("未找到 Google Chrome");
  return executable;
}

async function portOccupied(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    const finish = (occupied) => {
      socket.destroy();
      resolve(occupied);
    };
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.setTimeout(400, () => finish(false));
  });
}

async function findPort() {
  for (let port = 4185; port <= 4195; port += 1) {
    if (!(await portOccupied(port))) return port;
  }
  throw new Error("端口 4185-4195 均被占用；未终止任何未知进程");
}

async function waitForServer(url, child, output) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode != null) throw new Error(`Vite 提前退出：${child.exitCode}\n${output()}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`等待启动界面服务超时\n${output()}`);
}

function health(page) {
  const pageErrors = [];
  const consoleErrors = [];
  const requestFailures = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("requestfailed", (request) => requestFailures.push(`${request.method()} ${request.url()} · ${request.failure()?.errorText ?? "failed"}`));
  return { pageErrors, consoleErrors, requestFailures };
}

async function waitForLife(page, timeout = 5_000) {
  await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.protocol === "p1-life-screen-v1", undefined, { timeout });
}

async function waitForMenu(page, timeout = 6_000) {
  await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.protocol === "game-main-menu-v2", undefined, { timeout });
}

async function waitForInteractiveMenu(page, timeout = 6_000) {
  await page.waitForFunction(() => {
    const diagnostics = window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.();
    return diagnostics?.protocol === "game-main-menu-v2" && diagnostics.utilityOpen === false && diagnostics.loading === false;
  }, undefined, { timeout });
}

async function canvasPoint(page, logicalX, logicalY) {
  const box = await page.locator("#game-root canvas").boundingBox();
  assert.ok(box, "游戏画布不可用");
  return {
    x: box.x + (logicalX / 390) * box.width,
    y: box.y + (logicalY / 844) * box.height,
  };
}

async function mouseCanvasClick(page, logicalX, logicalY) {
  const point = await canvasPoint(page, logicalX, logicalY);
  await page.mouse.click(point.x, point.y);
}

async function touchCanvasTap(page, logicalX, logicalY) {
  const point = await canvasPoint(page, logicalX, logicalY);
  await page.touchscreen.tap(point.x, point.y);
}

fs.mkdirSync(screenshotDirectory, { recursive: true });
assert.ok(fs.existsSync(viteBin), "未安装 Vite");
const port = await findPort();
const gameUrl = `http://127.0.0.1:${port}/`;
const server = spawn(process.execPath, [viteBin, "--config", "apps/game/vite.config.ts", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
  cwd: projectRoot,
  env: { ...process.env, NO_COLOR: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += String(chunk); });
server.stderr.on("data", (chunk) => { serverOutput += String(chunk); });

let browser;
try {
  await waitForServer(gameUrl, server, () => serverOutput);
  const { chromium } = await loadPlaywright();
  browser = await chromium.launch({ headless: true, executablePath: chromeExecutable() });

  const fullContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const fullPage = await fullContext.newPage();
  const fullHealth = health(fullPage);
  await fullPage.goto(gameUrl, { waitUntil: "domcontentloaded" });
  await fullPage.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.protocol === "game-startup-scene-v1");
  await fullPage.waitForFunction(() => window.__PEOPLE_LIFE_GAME__.getUiDiagnostics().phase === "hold");
  const diagnostics = await fullPage.evaluate(() => window.__PEOPLE_LIFE_GAME__.getUiDiagnostics());
  assert.equal(diagnostics.motion, "full");
  assert.equal(diagnostics.placeholderEmblem, true);
  assert.equal(diagnostics.writesCoreOrSave, false);
  assert.ok(diagnostics.emblemAlpha >= 0.98, "完整动效停留态徽记必须清晰可见");
  assert.ok(diagnostics.wordmarkAlpha >= 0.98, "完整动效停留态字标必须清晰可见");
  assert.deepEqual(await fullPage.evaluate(() => Object.keys(localStorage).filter((key) => key.includes("presentation-state"))), [], "启动界面不得创建表现存档");
  await fullPage.screenshot({ path: path.join(screenshotDirectory, "game-startup-hold-390x844.png"), fullPage: true });
  await waitForMenu(fullPage);
  await fullPage.waitForTimeout(520);
  const emptyMenu = await fullPage.evaluate(() => window.__PEOPLE_LIFE_GAME__.getUiDiagnostics());
  assert.equal(emptyMenu.canvasOnly, true);
  assert.equal(emptyMenu.backgroundTexture, "scene.title");
  assert.equal(emptyMenu.continueAvailable, false);
  assert.equal(emptyMenu.primaryAction, "new");
  assert.deepEqual(emptyMenu.utilities, ["save", "settings", "about"]);
  assert.deepEqual(emptyMenu.buttons.map(({ id, enabled }) => ({ id, enabled })), [
    { id: "new", enabled: true },
    { id: "continue", enabled: false },
  ]);
  await fullPage.screenshot({ path: path.join(screenshotDirectory, "game-main-menu-empty-390x844.png"), fullPage: true });

  const canvas = fullPage.locator("#game-root canvas");
  const canvasBox = await canvas.boundingBox();
  assert.ok(canvasBox, "390×844 首要视口必须有游戏画布");
  assert.equal(Math.round(canvasBox.width), 390, "390×844 视口下画布宽度不应发生意外缩放");
  assert.equal(Math.round(canvasBox.height), 844, "390×844 视口下画布高度不应发生意外缩放");
  await mouseCanvasClick(fullPage, 195, 774);
  await fullPage.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.protocol === "game-menu-utility-v1");
  const settingsBefore = await fullPage.evaluate(() => window.__PEOPLE_LIFE_GAME__.getUiDiagnostics());
  assert.equal(settingsBefore.mode, "settings");
  assert.equal(settingsBefore.settings.soundEnabled, true);
  await mouseCanvasClick(fullPage, 192, 353);
  await fullPage.waitForFunction(() => window.__PEOPLE_LIFE_GAME__.getUiDiagnostics().settings.soundEnabled === false);
  assert.equal(await fullPage.evaluate(() => JSON.parse(localStorage.getItem("people-life:presentation:v1") ?? "null")?.soundEnabled), false, "菜单设置必须持久化声音偏好");
  await fullPage.waitForTimeout(320);
  await fullPage.screenshot({ path: path.join(screenshotDirectory, "game-main-menu-settings-390x844.png"), fullPage: true });
  await mouseCanvasClick(fullPage, 347, 48);
  await waitForInteractiveMenu(fullPage);

  await mouseCanvasClick(fullPage, 88, 774);
  await fullPage.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.mode === "save");
  assert.equal(await fullPage.evaluate(() => window.__PEOPLE_LIFE_GAME__.getUiDiagnostics().saveAvailable), false);
  await mouseCanvasClick(fullPage, 347, 48);
  await waitForInteractiveMenu(fullPage);

  await mouseCanvasClick(fullPage, 302, 774);
  await fullPage.waitForTimeout(500);
  const aboutDiagnostics = await fullPage.evaluate(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.());
  assert.equal(aboutDiagnostics?.mode, "about", `关于入口点击后状态错误：${JSON.stringify(aboutDiagnostics)}`);
  await mouseCanvasClick(fullPage, 347, 48);
  await waitForInteractiveMenu(fullPage);
  await mouseCanvasClick(fullPage, 195, 640);
  await fullPage.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.stage === "EYES_OPENING", undefined, { timeout: 5_000 });
  await mouseCanvasClick(fullPage, 195, 420);
  await fullPage.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.eyesOpened === true, undefined, { timeout: 5_000 });
  await mouseCanvasClick(fullPage, 195, 600);
  await fullPage.waitForTimeout(60);
  await mouseCanvasClick(fullPage, 195, 600);
  await fullPage.waitForTimeout(60);
  await mouseCanvasClick(fullPage, 195, 600);
  await fullPage.waitForTimeout(60);
  await mouseCanvasClick(fullPage, 274, 694);
  await fullPage.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.stage === "NAMING", undefined, { timeout: 5_000 });
  await mouseCanvasClick(fullPage, 195, 711);
  await waitForLife(fullPage, 10_000);
  const initial = await fullPage.evaluate(() => window.__PEOPLE_LIFE_GAME__.getSnapshot());
  const ready = await fullPage.evaluate(() => {
    const bridge = window.__PEOPLE_LIFE_GAME__;
    for (const action of bridge.getSnapshot().actionOptions) {
      const before = bridge.getSnapshot();
      if (before.advanceEnabled) break;
      if (!action.available || before.allocations.some((entry) => entry.id === action.id)) continue;
      bridge.dispatch({ type: "module.open", moduleId: action.moduleId });
      bridge.dispatch({ type: "action.toggle", actionId: action.id });
      if (bridge.getSnapshot().resourceBlockReason) bridge.dispatch({ type: "action.toggle", actionId: action.id });
    }
    return bridge.getSnapshot();
  });
  assert.equal(ready.advanceEnabled, true, "新游戏必须进入可操作的正式游戏切片");
  await fullPage.evaluate(() => window.__PEOPLE_LIFE_GAME__.dispatch({ type: "quarter.advance" }));
  await fullPage.waitForFunction(({ quarter, calendarYear }) => {
    const snapshot = window.__PEOPLE_LIFE_GAME__.getSnapshot();
    return snapshot.quarter !== quarter || snapshot.calendarYear !== calendarYear || snapshot.screen !== "life";
  }, { quarter: initial.quarter, calendarYear: initial.calendarYear });
  assert.equal(await fullPage.evaluate(() => localStorage.getItem("people-life:game-development:v1") != null), true);
  assert.equal(await fullPage.evaluate(() => localStorage.getItem("people-life:active:v5")), null, "开发新游戏不得覆盖正式 v5");

  await fullPage.evaluate(() => localStorage.setItem("people-life:presentation:v1", JSON.stringify({ schemaVersion: 1, motionMode: "off", soundEnabled: false, hapticEnabled: false })));
  await fullPage.reload({ waitUntil: "domcontentloaded" });
  await waitForMenu(fullPage, 3_000);
  const resumableMenu = await fullPage.evaluate(() => window.__PEOPLE_LIFE_GAME__.getUiDiagnostics());
  assert.equal(resumableMenu.continueAvailable, true, "存在可恢复开发存档时继续游戏必须启用");
  assert.equal(resumableMenu.primaryAction, "continue", "有存档时继续游戏必须成为主操作");
  assert.match(resumableMenu.saveSummary?.label ?? "", /\d{4}年 · \d+岁 · Q[1-4]/, "主菜单必须显示年份年龄季度摘要");
  await fullPage.screenshot({ path: path.join(screenshotDirectory, "game-main-menu-continue-390x844.png"), fullPage: true });
  await mouseCanvasClick(fullPage, 195, 706);
  await fullPage.waitForFunction(() => window.__PEOPLE_LIFE_GAME__.getUiDiagnostics().confirmOpen === true);
  await fullPage.screenshot({ path: path.join(screenshotDirectory, "game-main-menu-new-confirm-390x844.png"), fullPage: true });
  await mouseCanvasClick(fullPage, 106, 468);
  await fullPage.waitForFunction(() => window.__PEOPLE_LIFE_GAME__.getUiDiagnostics().confirmOpen === false);
  await waitForInteractiveMenu(fullPage);
  await mouseCanvasClick(fullPage, 195, 640);
  await fullPage.waitForFunction(() => {
    try {
      return window.__PEOPLE_LIFE_GAME__.getSnapshot().protocol === "game-runtime-snapshot-v2";
    } catch {
      return false;
    }
  }, undefined, { timeout: 10_000 });
  assert.deepEqual(fullHealth.pageErrors, []);
  assert.deepEqual(fullHealth.consoleErrors, []);
  assert.deepEqual(fullHealth.requestFailures, []);
  await fullContext.close();

  const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const touchPage = await touchContext.newPage();
  const touchHealth = health(touchPage);
  await touchPage.addInitScript(() => {
    localStorage.setItem("people-life:presentation:v1", JSON.stringify({ schemaVersion: 1, motionMode: "off", soundEnabled: true, hapticEnabled: true }));
  });
  await touchPage.goto(gameUrl, { waitUntil: "domcontentloaded" });
  await waitForMenu(touchPage, 3_000);
  await touchCanvasTap(touchPage, 195, 774);
  await touchPage.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.protocol === "game-menu-utility-v1");
  assert.equal(await touchPage.evaluate(() => window.__PEOPLE_LIFE_GAME__.getUiDiagnostics().mode), "settings", "触摸点击必须进入设置页");
  await touchCanvasTap(touchPage, 347, 48);
  await waitForInteractiveMenu(touchPage);
  assert.deepEqual(touchHealth.pageErrors, []);
  assert.deepEqual(touchHealth.consoleErrors, []);
  assert.deepEqual(touchHealth.requestFailures, []);
  await touchContext.close();

  const reducedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const reducedPage = await reducedContext.newPage();
  const reducedHealth = health(reducedPage);
  const reducedStartedAt = Date.now();
  await reducedPage.goto(gameUrl, { waitUntil: "domcontentloaded" });
  await reducedPage.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.protocol === "game-startup-scene-v1");
  const reducedDiagnostics = await reducedPage.evaluate(() => window.__PEOPLE_LIFE_GAME__.getUiDiagnostics());
  assert.equal(reducedDiagnostics.motion, "reduced");
  await waitForMenu(reducedPage, 3_000);
  assert.ok(Date.now() - reducedStartedAt < 2_500, "减少动态模式不应长时间停留在启动界面");
  assert.deepEqual(reducedHealth.pageErrors, []);
  assert.deepEqual(reducedHealth.consoleErrors, []);
  assert.deepEqual(reducedHealth.requestFailures, []);
  await reducedContext.close();

  const offContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const offPage = await offContext.newPage();
  const offHealth = health(offPage);
  await offPage.addInitScript(() => {
    localStorage.setItem("people-life:presentation:v1", JSON.stringify({ schemaVersion: 1, motionMode: "off", soundEnabled: false, hapticEnabled: false }));
  });
  await offPage.goto(gameUrl, { waitUntil: "domcontentloaded" });
  await offPage.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.protocol === "game-startup-scene-v1");
  const offDiagnostics = await offPage.evaluate(() => window.__PEOPLE_LIFE_GAME__.getUiDiagnostics());
  assert.equal(offDiagnostics.motion, "off");
  assert.equal(offDiagnostics.emblemScale, 1);
  await waitForMenu(offPage, 2_000);
  assert.deepEqual(offHealth.pageErrors, []);
  assert.deepEqual(offHealth.consoleErrors, []);
  assert.deepEqual(offHealth.requestFailures, []);
  await offContext.close();

  console.log(JSON.stringify({
    ok: true,
    browser: "Google Chrome",
    viewports: ["390x844", "1280x900"],
    checks: [
      "startup_scene_visible_between_preload_and_gameflow",
      "placeholder_emblem_reveal_hold_exit",
      "automatic_transition_to_canvas_main_menu",
      "empty_save_continue_disabled",
      "new_game_enters_playable_slice",
      "development_save_refresh_continue_restore",
      "save_summary_and_continue_primary_hierarchy",
      "new_game_confirmation_with_existing_save",
      "save_settings_about_canvas_utilities",
      "chrome_native_mouse_and_touch_menu_input",
      "utility_close_reenables_menu_without_bottom_button_overlap",
      "presentation_settings_persist",
      "reduced_motion_short_fade",
      "motion_off_static_fast_path",
      "no_core_or_presentation_checkpoint_write",
      "no_pageerror_console_error_or_request_failure",
    ],
    screenshots: [
      "artifacts/ui-regression/game-startup-hold-390x844.png",
      "artifacts/ui-regression/game-main-menu-empty-390x844.png",
      "artifacts/ui-regression/game-main-menu-continue-390x844.png",
      "artifacts/ui-regression/game-main-menu-settings-390x844.png",
      "artifacts/ui-regression/game-main-menu-new-confirm-390x844.png",
    ],
  }, null, 2));
} catch (error) {
  error.message += `\nVite output:\n${serverOutput}`;
  throw error;
} finally {
  if (browser) await browser.close();
  server.kill();
}
