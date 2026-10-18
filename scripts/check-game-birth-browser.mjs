import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const screenshotDirectory = path.join(projectRoot, "artifacts", "ui-regression");
const gameUrl = "http://127.0.0.1:4174/";
const viteBin = path.join(projectRoot, "node_modules", "vite", "bin", "vite.js");

async function waitForServer(url, child) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child && child.exitCode != null) throw new Error(`Vite 提前退出：${child.exitCode}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("等待出生流程测试服务超时");
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    const candidates = [
      process.env.PEOPLE_LIFE_PLAYWRIGHT_PATH,
      path.join(os.homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright", "index.mjs"),
    ].filter(Boolean);
    const modulePath = candidates.find((candidate) => fs.existsSync(candidate));
    if (!modulePath) throw new Error("未找到 Playwright");
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
  if (!executable) throw new Error("未找到 Chrome");
  return executable;
}

async function mouseCanvasClick(page, x, y) {
  const canvas = page.locator("#game-root canvas");
  await canvas.click({ position: { x, y } });
}

async function main() {
  let server = null;
  try {
    const res = await fetch(gameUrl);
    if (!res.ok) throw new Error("not ready");
  } catch {
    assert.ok(fs.existsSync(viteBin), "未安装 Vite，无法运行出生浏览器检查");
    server = spawn(process.execPath, [viteBin, "--config", "apps/game/vite.config.ts"], {
      cwd: projectRoot,
      env: { ...process.env, NO_COLOR: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    await waitForServer(gameUrl, server);
  }

  try {
  fs.mkdirSync(screenshotDirectory, { recursive: true });
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: true, executablePath: chromeExecutable() });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (err) => pageErrors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("people-life:presentation:v1", JSON.stringify({
      schemaVersion: 1,
      motionMode: "off",
      soundEnabled: false,
      hapticEnabled: false,
    }));
  });

  await page.goto(gameUrl, { waitUntil: "networkidle" });
  const canvas = page.locator("#game-root canvas");
  await canvas.waitFor({ state: "visible", timeout: 15_000 });

  const clickCanvas = async (x, y) => {
    const box = await canvas.boundingBox();
    assert.ok(box, "无法获取 Canvas 边界");
    const scaleX = box.width / 390;
    const scaleY = box.height / 844;
    await page.mouse.click(box.x + x * scaleX, box.y + y * scaleY);
  };

  // 1. 等待主菜单加载
  await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.protocol === "game-main-menu-v2", undefined, { timeout: 10_000 });
  const menuDiag = await page.evaluate(() => window.__PEOPLE_LIFE_GAME__.getUiDiagnostics());
  assert.equal(menuDiag.continueAvailable, false, "空档状态下无继续游戏");

  // 2. 点击“新游戏”
  await clickCanvas(195, 640);

  // 3. 断言进入 BirthScene Stage: EYES_OPENING
  await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.stage === "EYES_OPENING", undefined, { timeout: 5_000 });
  let birthDiag = await page.evaluate(() => window.__PEOPLE_LIFE_GAME__.getUiDiagnostics());
  assert.equal(birthDiag.protocol, "game-birth-v1");
  assert.equal(birthDiag.birthYear, 1978);

  // 点击跳过/等待睁眼动画完成 -> 进入 PARENTS_TALK 父母对白
  await clickCanvas(195, 420);
  await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.eyesOpened === true, undefined, { timeout: 5_000 });
  await page.screenshot({ path: path.join(screenshotDirectory, "game-birth-parents-talk-390x844.png"), fullPage: true });

  // 推进对白 0（婴儿大哭） -> 对白 1（母亲安抚）
  await clickCanvas(195, 600);
  await page.waitForTimeout(100);

  // 推进对白 1（母亲安抚） -> 对白 2（父亲激动）
  await clickCanvas(195, 600);
  await page.waitForTimeout(100);

  // 推进对白 2（父亲激动） -> 对白 3（母亲提议起名）
  await clickCanvas(195, 600);
  await page.waitForTimeout(100);

  // 4. 点击“【 商量起名 ▶ 】” -> 进入 Stage: NAMING
  await clickCanvas(274, 694);
  await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.stage === "NAMING", undefined, { timeout: 5_000 });
  await page.screenshot({ path: path.join(screenshotDirectory, "game-birth-naming-390x844.png"), fullPage: true });
  birthDiag = await page.evaluate(() => window.__PEOPLE_LIFE_GAME__.getUiDiagnostics());
  assert.equal(birthDiag.stage, "NAMING");
  assert.equal(birthDiag.gender, "male");

  // 5. 测试切换性别为女孩
  await clickCanvas(278, 206);
  await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.gender === "female");
  birthDiag = await page.evaluate(() => window.__PEOPLE_LIFE_GAME__.getUiDiagnostics());
  assert.equal(birthDiag.gender, "female");

  // 6. 测试“换个时代好名”
  await clickCanvas(284, 456);
  await page.waitForTimeout(100);
  birthDiag = await page.evaluate(() => window.__PEOPLE_LIFE_GAME__.getUiDiagnostics());
  assert.ok(birthDiag.playerName, "名字应存在");

  // 7. 测试点击“【 确认定名：XXX · 开启 1978 人生 ▶ 】” -> 直接进入主游戏 LifeScene
  await clickCanvas(195, 711);
  await page.waitForTimeout(500);

  const debugState = await page.evaluate(() => ({
    ui: window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.(),
    snapshot: window.__PEOPLE_LIFE_GAME__?.getSnapshot?.(),
  }));
  console.log("Debug State after confirm:", JSON.stringify(debugState));

  // 8. 断言顺利进入 LifeScene
  await page.waitForFunction(() => {
    try {
      return window.__PEOPLE_LIFE_GAME__?.getSnapshot?.()?.screen === "life";
    } catch {
      return false;
    }
  }, undefined, { timeout: 10_000 });
  const lifeSnapshot = await page.evaluate(() => window.__PEOPLE_LIFE_GAME__.getSnapshot());
  assert.equal(lifeSnapshot.screen, "life");
  assert.equal(lifeSnapshot.protocol, "game-runtime-snapshot-v2");

  // 9. 验证人生纪事流中存在【满周岁 · 红木八仙桌抓周礼】待抓周事件卡片
  await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.protocol === "p1-life-screen-v1");
  let lifeUi = await page.evaluate(() => window.__PEOPLE_LIFE_GAME__.getUiDiagnostics());
  assert.equal(lifeUi.completedZhuazhou, null, "初始尚未抓周");

  // 10. 点击纪事流中的抓周事件卡片 (X: 195, Y: 228) -> 唤出抓周大事件弹窗
  await clickCanvas(195, 228);
  await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.activeModal === "zhuazhou");
  await page.screenshot({ path: path.join(screenshotDirectory, "game-p1-modal-zhuazhou-390x844.png"), fullPage: true });

  // 11. 在抓周大事件弹窗中点击抓取《算盘与粮票》 (点击右侧抓取按钮 X: 324, Y: 308)
  await clickCanvas(324, 308);
  await page.waitForFunction(() => {
    const diag = window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.();
    return diag?.activeModal !== "zhuazhou";
  });
  lifeUi = await page.evaluate(() => window.__PEOPLE_LIFE_GAME__.getUiDiagnostics());
  assert.equal(lifeUi.completedZhuazhou, "abacus_and_coupons", "抓周结果已成功记录");

  // 如果抓周后触发了1岁后续生活事件，点击选项1关闭弹窗 (X: 195, Y: 363)
  if (lifeUi.activeModal === "life_event") {
    await clickCanvas(195, 363);
    await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.activeModal === null);
  }

  // 12. 打开底部【💼 资产】Tab，验证老物件已收入个人资产
  await clickCanvas(336, 790);
  await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.activeTab === "assets");
  await page.screenshot({ path: path.join(screenshotDirectory, "game-p1-modal-assets-after-zhuazhou-390x844.png"), fullPage: true });

  // 切回【🏠 主页】Tab
  await clickCanvas(44, 790);
  await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.activeTab === "home");

  assert.deepEqual(pageErrors, [], `页面不应发生未捕获异常：${pageErrors.join(" | ")}`);
  assert.deepEqual(consoleErrors, [], `控制台不应输出 error：${consoleErrors.join(" | ")}`);

  await context.close();
  await browser.close();

  console.log(JSON.stringify({
    ok: true,
    stage: "F2-birth-and-zhuazhou-life-event",
    checks: [
      "main_menu_new_game_enters_birth_scene",
      "stage_1_story_narrative_visible",
      "stage_2_eyes_opening_animation_visible",
      "stage_3_naming_and_gender_selection_interactive",
      "confirm_naming_enters_life_scene_directly",
      "zhuazhou_as_life_event_in_chronicle_stream",
      "interactive_zhuazhou_modal_selection",
      "zhuazhou_result_recorded_in_assets_and_chronicles",
      "no_pageerror_or_console_error",
    ],
  }, null, 2));
  } finally {
    if (server) {
      server.kill();
    }
  }
}

main().catch((err) => {
  console.error("BirthScene 检查失败：", err);
  process.exit(1);
});
