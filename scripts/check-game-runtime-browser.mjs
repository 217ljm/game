import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    const candidates = [
      process.env.PEOPLE_LIFE_PLAYWRIGHT_PATH,
      path.join(
        os.homedir(),
        ".cache",
        "codex-runtimes",
        "codex-primary-runtime",
        "dependencies",
        "node",
        "node_modules",
        "playwright",
        "index.mjs",
      ),
    ].filter(Boolean);
    const modulePath = candidates.find((candidate) => fs.existsSync(candidate));
    if (!modulePath) {
      throw new Error("未找到 Playwright；可通过 PEOPLE_LIFE_PLAYWRIGHT_PATH 指定 index.mjs");
    }
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
  if (!executable) {
    throw new Error("未找到 Google Chrome；可通过 PEOPLE_LIFE_BROWSER_PATH 指定 chrome.exe");
  }
  return executable;
}

async function waitForServer(url, child) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode != null) throw new Error(`Vite 提前退出：${child.exitCode}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("等待正式游戏 Vite 服务超时");
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const screenshotDirectory = path.join(projectRoot, "artifacts", "ui-regression");
const viteBin = path.join(projectRoot, "node_modules", "vite", "bin", "vite.js");
fs.mkdirSync(screenshotDirectory, { recursive: true });
assert.ok(fs.existsSync(viteBin), "未安装 Vite，无法运行正式游戏浏览器检查");

const server = spawn(process.execPath, [viteBin, "--config", "apps/game/vite.config.ts"], {
  cwd: projectRoot,
  env: { ...process.env, NO_COLOR: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += String(chunk); });
server.stderr.on("data", (chunk) => { serverOutput += String(chunk); });

let browser;
try {
  const baseUrl = "http://127.0.0.1:4174/";
  await waitForServer(baseUrl, server);
  const { chromium } = await loadPlaywright();
  browser = await chromium.launch({ headless: true, executablePath: chromeExecutable() });

  for (const viewport of [
    { name: "phone", width: 390, height: 844 },
    { name: "desktop", width: 1280, height: 900 },
  ]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    const requestFailures = [];
    const httpErrors = [];
    page.on("pageerror", (error) => pageErrors.push(String(error)));
    page.on("requestfailed", (request) => requestFailures.push(`${request.method()} ${request.url()} · ${request.failure()?.errorText ?? "failed"}`));
    page.on("response", (response) => {
      if (response.status() >= 400) httpErrors.push(`${response.status()} ${response.url()}`);
    });
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    const canvas = page.locator("#game-root canvas");
    try {
      await canvas.waitFor({ state: "visible", timeout: 30_000 });
    } catch (error) {
      throw new Error([
        `${viewport.name} 正式游戏画布未出现：${error instanceof Error ? error.message : error}`,
        `pageerror: ${pageErrors.join(" | ") || "none"}`,
        `console error: ${consoleErrors.join(" | ") || "none"}`,
        `request failed: ${requestFailures.join(" | ") || "none"}`,
        `HTTP error: ${httpErrors.join(" | ") || "none"}`,
      ].join("\n"));
    }
    async function clickLogical(logicalX, logicalY) {
      const box = await canvas.boundingBox();
      assert.ok(box, "游戏画布不可用");
      await page.mouse.click(
        box.x + (logicalX / 390) * box.width,
        box.y + (logicalY / 844) * box.height,
      );
    }

    console.log(`[${viewport.name}] 等待主菜单就绪...`);
    await page.waitForFunction(() => {
      const diag = window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.();
      return diag?.protocol === "game-main-menu-v2" && diag?.loading === false;
    }, undefined, { timeout: 15_000 });
    console.log(`[${viewport.name}] 点击新游戏按钮...`);
    await clickLogical(195, 640);
    await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.stage === "EYES_OPENING", undefined, { timeout: 5_000 });
    console.log(`[${viewport.name}] 点击睁眼...`);
    await clickLogical(195, 420);
    await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.eyesOpened === true, undefined, { timeout: 5_000 });
    console.log(`[${viewport.name}] 推进对白...`);
    await clickLogical(195, 600);
    await page.waitForTimeout(100);
    await clickLogical(195, 600);
    await page.waitForTimeout(100);
    await clickLogical(195, 600);
    await page.waitForTimeout(100);
    console.log(`[${viewport.name}] 点击商量起名...`);
    await clickLogical(264, 711);
    await page.waitForFunction(() => {
      const d = window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.();
      return d?.stage === "NAMING";
    }, undefined, { timeout: 5_000 });
    console.log(`[${viewport.name}] 确认起名并进入生活界面...`);
    await clickLogical(195, 711);
    await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.protocol === "p1-life-screen-v1", undefined, { timeout: 15_000 });

    const dimensions = await canvas.evaluate((element) => ({
      width: element.width,
      height: element.height,
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
    }));
    assert.equal(dimensions.width, 390, `${viewport.name} 逻辑画布宽度错误`);
    assert.equal(dimensions.height, 844, `${viewport.name} 逻辑画布高度错误`);
    assert.ok(dimensions.clientWidth <= viewport.width, `${viewport.name} 画布横向溢出`);
    assert.ok(dimensions.clientHeight <= viewport.height, `${viewport.name} 画布纵向溢出`);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
      `${viewport.name} 页面横向溢出`,
    );

    const initial = await page.evaluate(() => window.__PEOPLE_LIFE_GAME__.getSnapshot());
    assert.equal(initial.protocol, "game-runtime-snapshot-v2");
    assert.equal(initial.calendarYear, 1979);
    assert.equal(initial.age, 1);
    assert.ok(initial.quarter >= 1);
    assert.equal(initial.modules.length, 5);
    assert.equal(initial.allocations.length, 0);

    const availableAction = initial.actionOptions.find((action) => action.available);
    assert.ok(availableAction, "P0 游戏壳应有可用行动");
    await page.evaluate((action) => {
      window.__PEOPLE_LIFE_GAME__.dispatch({ type: "module.open", moduleId: action.moduleId });
      window.__PEOPLE_LIFE_GAME__.dispatch({ type: "action.toggle", actionId: action.id });
    }, availableAction);
    await page.waitForFunction((actionId) => (
      window.__PEOPLE_LIFE_GAME__.getSnapshot().allocations.some((entry) => entry.id === actionId)
    ), availableAction.id);
    const afterAction = await page.evaluate(() => window.__PEOPLE_LIFE_GAME__.getSnapshot());
    assert.equal(afterAction.allocations.some((entry) => entry.id === availableAction.id), true, "行动选择后必须持续可见");

    const readyPlan = await page.evaluate(() => {
      const bridge = window.__PEOPLE_LIFE_GAME__;
      for (const action of bridge.getSnapshot().actionOptions) {
        const before = bridge.getSnapshot();
        if (before.advanceEnabled) break;
        if (!action.available || before.allocations.some((entry) => entry.id === action.id)) continue;
        bridge.dispatch({ type: "module.open", moduleId: action.moduleId });
        bridge.dispatch({ type: "action.toggle", actionId: action.id });
        const after = bridge.getSnapshot();
        if (after.resourceBlockReason) bridge.dispatch({ type: "action.toggle", actionId: action.id });
      }
      return bridge.getSnapshot();
    });
    assert.equal(readyPlan.advanceEnabled, true, "真实季度草案达到最少行动数后必须允许推进");
    assert.ok(
      readyPlan.resources.availableTimeSlots < initial.resources.availableTimeSlots
        || readyPlan.resources.availableEnergy < initial.resources.availableEnergy
        || readyPlan.resources.cashYuan < initial.resources.cashYuan,
      "季度草案必须即时反映真实资源变化",
    );

    await page.screenshot({
      path: path.join(screenshotDirectory, `game-p0-${viewport.name}-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });

    await page.evaluate(() => window.__PEOPLE_LIFE_GAME__.dispatch({ type: "quarter.advance" }));
    await page.waitForFunction(({ quarter, calendarYear }) => {
      const snapshot = window.__PEOPLE_LIFE_GAME__.getSnapshot();
      return snapshot.quarter !== quarter || snapshot.calendarYear !== calendarYear || snapshot.screen !== "life";
    }, { quarter: readyPlan.quarter, calendarYear: readyPlan.calendarYear });
    assert.equal(await page.evaluate(() => localStorage.getItem("people-life:game-development:v1") != null), true, "真实 Core 提交后必须写入独立开发存档");
    assert.equal(await page.evaluate(() => localStorage.getItem("people-life:active:v5")), null, "开发 fixture 不得覆盖正式 v5 存档");
    assert.deepEqual(pageErrors, [], `${viewport.name} pageerror：${pageErrors.join(" | ")}`);
    assert.deepEqual(consoleErrors, [], `${viewport.name} console error：${consoleErrors.join(" | ")}`);
    await context.close();
  }

  console.log(JSON.stringify({
    ok: true,
    browser: "Google Chrome",
    viewports: ["390x844", "1280x900"],
    checks: [
      "phaser_canvas_visible",
      "logical_canvas_390x844",
      "no_horizontal_overflow",
      "runtime_snapshot_contract",
      "five_game_modules",
      "selected_action_persists",
      "draft_resource_feedback",
      "gateway_quarter_plan_submit",
      "development_save_isolated_from_v5",
      "no_pageerror_or_console_error",
    ],
  }, null, 2));
} catch (error) {
  error.message += `\nVite output:\n${serverOutput}`;
  throw error;
} finally {
  if (browser) await browser.close();
  server.kill();
}
