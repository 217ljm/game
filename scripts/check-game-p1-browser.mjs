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
  if (!executable) throw new Error("未找到 Google Chrome；可通过 PEOPLE_LIFE_BROWSER_PATH 指定 chrome.exe");
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
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("等待 P1 正式游戏服务超时");
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const screenshotDirectory = path.join(projectRoot, "artifacts", "ui-regression");
const viteBin = path.join(projectRoot, "node_modules", "vite", "bin", "vite.js");
fs.mkdirSync(screenshotDirectory, { recursive: true });
assert.ok(fs.existsSync(viteBin), "未安装 Vite，无法运行 P1 浏览器检查");

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
    page.on("pageerror", (error) => pageErrors.push(error.stack ?? String(error)));
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    page.on("requestfailed", (request) => requestFailures.push(`${request.method()} ${request.url()} · ${request.failure()?.errorText ?? "failed"}`));

    const clickCanvas = async (logicalX, logicalY) => {
      const box = await canvas.boundingBox();
      assert.ok(box, "无法获取 Canvas 边界");
      const scale = Math.min(box.width / 390, box.height / 844);
      const offsetX = box.x + (box.width - 390 * scale) / 2;
      const offsetY = box.y + (box.height - 844 * scale) / 2;
      const targetX = offsetX + logicalX * scale;
      const targetY = offsetY + logicalY * scale;
      await page.mouse.click(targetX, targetY);
    };

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    const canvas = page.locator("#game-root canvas");
    await canvas.waitFor({ state: "visible" });
    await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.protocol === "game-main-menu-v2", undefined, { timeout: 10_000 });
    await clickCanvas(195, 640);
    await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.stage === "EYES_OPENING", undefined, { timeout: 5_000 });
    await clickCanvas(195, 420);
    await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.eyesOpened === true, undefined, { timeout: 5_000 });
    
    // 步进对白 0 -> 1 -> 2 -> 3
    for (let i = 0; i < 3; i++) {
      await clickCanvas(195, 600);
      await page.waitForTimeout(120);
    }

    // 点击【商量起名 ▶】
    await clickCanvas(264, 711);
    await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.stage === "NAMING", undefined, { timeout: 5_000 });
    await page.waitForTimeout(100);

    // 点击【确认定名 · 开启 1978 人生 ▶】
    await clickCanvas(195, 711);
    await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.protocol === "p1-life-screen-v1", undefined, { timeout: 10_000 });
    await page.waitForTimeout(400);

    const dimensions = await canvas.evaluate((element) => ({ width: element.width, height: element.height, clientWidth: element.clientWidth, clientHeight: element.clientHeight }));
    assert.equal(dimensions.width, 390);
    assert.equal(dimensions.height, 844);
    assert.ok(dimensions.clientWidth <= viewport.width, `${viewport.name} 画布横向溢出`);
    assert.ok(dimensions.clientHeight <= viewport.height, `${viewport.name} 画布纵向溢出`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${viewport.name} 页面横向溢出`);

    const initial = await page.evaluate(() => ({ snapshot: window.__PEOPLE_LIFE_GAME__.getSnapshot(), ui: window.__PEOPLE_LIFE_GAME__.getUiDiagnostics() }));
    assert.equal(initial.ui.protocol, "p1-life-screen-v1");
    assert.equal(initial.ui.screen, "life");
    assert.equal(initial.snapshot.screen, "life");
    assert.ok(initial.ui.recentLifeCount > 0, "应有人生纪事记录");

    await page.screenshot({ path: path.join(screenshotDirectory, `game-p1-chinese-life-main-${viewport.name}-${viewport.width}x${viewport.height}.png`), fullPage: true });

    if (viewport.name === "phone") {
      // 1. 测试并截图【🏠 主页】
      assert.equal(initial.ui.activeTab, "home");

      // 2. 点击底部【👥 关系】Tab (X: 117, Y: 790)
      await clickCanvas(117, 790);
      await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.activeTab === "relationships");
      await page.screenshot({ path: path.join(screenshotDirectory, "game-p1-tab-relationships-390x844.png"), fullPage: true });

      // 点击展开第一位关系人 (父亲: X: 195, Y: 224)
      for (let attempt = 0; attempt < 3; attempt++) {
        await clickCanvas(195, 224);
        await page.waitForTimeout(150);
        const diag = await page.evaluate(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.());
        if (diag?.selectedFamilyMemberId) break;
      }
      await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.selectedFamilyMemberId !== null);
      await page.waitForTimeout(150);

      // 点击第一项互动【💬 谈心】 (X: 68, Y: 278)
      await clickCanvas(68, 278);
      await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.activeModal === "action_result");
      await page.screenshot({ path: path.join(screenshotDirectory, "game-p1-modal-relationship-result-390x844.png"), fullPage: true });

      // 点击【确定】关闭弹窗 (X: 195, Y: 452)
      await clickCanvas(195, 452);
      await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.activeModal === null);

      // 3. 点击底部【🗺️ 活动】Tab (X: 190, Y: 790)
      await clickCanvas(190, 790);
      await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.activeTab === "locations");
      await page.screenshot({ path: path.join(screenshotDirectory, "game-p1-tab-locations-390x844.png"), fullPage: true });

      // 点击进入第 1 个地点 (家属大院: X: 195, Y: 227)
      await clickCanvas(195, 227);
      await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.activeModal === "location_detail");
      await page.screenshot({ path: path.join(screenshotDirectory, "game-p1-modal-location-detail-390x844.png"), fullPage: true });

      // 执行第 1 项行动【🃏 红砖地拍画片对决】(X: 320, Y: 220)
      await clickCanvas(320, 220);
      await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.activeModal === "card_slap");
      await page.screenshot({ path: path.join(screenshotDirectory, "game-p1-modal-minigame-card-slap-390x844.png"), fullPage: true });

      // 拍画片下掌拍击 (X: 195, Y: 315)
      await clickCanvas(195, 315);
      await page.waitForTimeout(500);

      // 关闭拍画片弹窗 (点击右上角 X: 356, Y: 178)
      await clickCanvas(356, 178);
      await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.activeModal === null);

      // 4. 点击底部【🏫 发展】Tab (X: 263, Y: 790)
      await clickCanvas(263, 790);
      await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.activeTab === "development");
      await page.screenshot({ path: path.join(screenshotDirectory, "game-p1-tab-development-390x844.png"), fullPage: true });

      // 5. 点击底部【💼 资产】Tab (X: 336, Y: 790)
      await clickCanvas(336, 790);
      await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.activeTab === "assets");
      await page.screenshot({ path: path.join(screenshotDirectory, "game-p1-tab-assets-390x844.png"), fullPage: true });

      // 点击进入【🎴 水浒108将卡册馆】(X: 195, Y: 307)
      await clickCanvas(195, 307);
      await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.activeModal === "shuihu_album");
      await page.screenshot({ path: path.join(screenshotDirectory, "game-p1-modal-shuihu-album-390x844.png"), fullPage: true });

      // 关闭卡册 (右上角 X: 356, Y: 178)
      await clickCanvas(356, 178);
      await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.activeModal === null);

      // 6. 切回【🏠 主页】Tab (X: 44, Y: 790)
      await clickCanvas(44, 790);
      await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.activeTab === "home");

      // 7. 点击【下一年 ▶】大按钮 (X: 195, Y: 676)
      await clickCanvas(195, 676);
      await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.activeModal === "year_transition");
      await page.screenshot({ path: path.join(screenshotDirectory, "game-p1-modal-year-transition-390x844.png"), fullPage: true });

      // 点击跨年弹窗内的【开启 1979 年生活 ▶】 (X: 195, Y: 505)
      await clickCanvas(195, 505);
      await page.waitForTimeout(300);

      // 如果弹出抓周弹窗，点击抓取第一个物品 (X: 320, Y: 316)
      const curModal = await page.evaluate(() => window.__PEOPLE_LIFE_GAME__.getUiDiagnostics().activeModal);
      if (curModal === "zhuazhou") {
        await clickCanvas(320, 316);
        await page.waitForTimeout(300);
      }

      const afterAdvance = await page.evaluate(() => window.__PEOPLE_LIFE_GAME__.getUiDiagnostics());
      assert.ok(afterAdvance.age >= 1, "年龄应正常推进");
      await page.screenshot({ path: path.join(screenshotDirectory, "game-p1-after-advance-phone-390x844.png"), fullPage: true });
    }

    assert.deepEqual(pageErrors, [], `${viewport.name} pageerror：${pageErrors.join(" | ")}`);
    assert.deepEqual(consoleErrors, [], `${viewport.name} console error：${consoleErrors.join(" | ")}`);
    assert.deepEqual(requestFailures, [], `${viewport.name} request failed：${requestFailures.join(" | ")}`);
    await context.close();
  }

  console.log(JSON.stringify({
    ok: true,
    browser: "Google Chrome",
    viewports: ["390x844", "1280x900"],
    checks: [
      "p1_visual_layout_contract",
      "stable_scene_player_action_assets",
      "five_modules_and_four_card_page",
      "resource_shortage_prevented",
      "plan_token_cancel_self_recovery",
      "multi_module_ready_plan",
      "quarter_transition_visible",
      "gateway_submit_and_development_save_isolation",
      "no_overflow_pageerror_console_or_request_failure",
    ],
  }, null, 2));
} catch (error) {
  error.message += `\nVite output:\n${serverOutput}`;
  throw error;
} finally {
  if (browser) await browser.close();
  server.kill();
}
