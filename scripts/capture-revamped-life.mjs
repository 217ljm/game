import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const screenshotDirectory = path.join(projectRoot, "artifacts", "ui-regression");

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
  if (!executable) throw new Error("未找到 Google Chrome");
  return executable;
}

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ headless: true, executablePath: chromeExecutable() });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

await page.goto("http://127.0.0.1:4174/", { waitUntil: "networkidle" });
const canvas = page.locator("#game-root canvas");
await canvas.waitFor({ state: "visible" });

const clickCanvas = async (logicalX, logicalY) => {
  const box = await canvas.boundingBox();
  const scale = Math.min(box.width / 390, box.height / 844);
  const offsetX = box.x + (box.width - 390 * scale) / 2;
  const offsetY = box.y + (box.height - 844 * scale) / 2;
  await page.mouse.click(offsetX + logicalX * scale, offsetY + logicalY * scale);
};

// 检查当前界面状态
const diag = await page.evaluate(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.());
console.log("当前界面诊断:", JSON.stringify(diag));

if (diag?.protocol === "game-main-menu-v2") {
  // 点击“新游戏”
  await clickCanvas(195, 640);
  await page.waitForTimeout(600);
}

// 如果进入出生引导，点击跳过
for (let i = 0; i < 5; i++) {
  const cur = await page.evaluate(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.());
  if (cur?.screen === "life") break;
  // 点击右上角跳过或中心继续
  await clickCanvas(330, 48);
  await page.waitForTimeout(400);
  await clickCanvas(195, 700);
  await page.waitForTimeout(400);
}

await page.waitForTimeout(800);
const finalDiag = await page.evaluate(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.());
console.log("最终进入界面诊断:", JSON.stringify(finalDiag));

// 如果有弹窗，点击右上角关闭按钮
await clickCanvas(356, 80);
await page.waitForTimeout(500);

const finalCleanDiag = await page.evaluate(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.());
console.log("纯净界面诊断:", JSON.stringify(finalCleanDiag));

const screenshotPath = path.join(screenshotDirectory, "revamped-living-stage-390x844.png");
await page.screenshot({ path: screenshotPath });
console.log("成功保存纯净截图至:", screenshotPath);

await browser.close();
