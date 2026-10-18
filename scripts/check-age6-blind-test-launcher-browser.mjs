import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createGameServer } from "./serve-game.mjs";

async function loadPlaywright() {
  try { return await import("playwright"); } catch {
    const candidates = [
      process.env.PEOPLE_LIFE_PLAYWRIGHT_PATH,
      path.join(os.homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright", "index.mjs"),
    ].filter(Boolean);
    const modulePath = candidates.find((candidate) => fs.existsSync(candidate));
    if (!modulePath) throw new Error("未找到 Playwright；可通过 PEOPLE_LIFE_PLAYWRIGHT_PATH 指定 index.mjs 路径");
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
  if (!executable) throw new Error("未找到 Edge 或 Chrome；可通过 PEOPLE_LIFE_BROWSER_PATH 指定浏览器路径");
  return executable;
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const batchIndex = args.indexOf("--batch");
if (batchIndex < 0 || !args[batchIndex + 1]) throw new Error("请通过 --batch 指定盲测批次目录");
const batchRoot = path.resolve(projectRoot, args[batchIndex + 1]);
const allowedRoot = path.resolve(projectRoot, "artifacts", "playtest", "age6-p2-v1");
assert.equal(path.dirname(batchRoot), allowedRoot, "批次必须位于 artifacts/playtest/age6-p2-v1/ 下");

const manifest = JSON.parse(fs.readFileSync(path.join(batchRoot, "manifest.json"), "utf8"));
const assignment = manifest.assignments.find((entry) => entry.draftCondition === "resource_shortage" && entry.eventCondition !== "natural");
assert.ok(assignment, "盲测批次必须包含资源不足与隐藏强制事件组合分组");
const release = JSON.parse(fs.readFileSync(path.join(projectRoot, "dist", "release-info.json"), "utf8"));
assert.equal(release.contentSha256, manifest.buildFingerprint.releaseContentSha256, "当前候选包必须与盲测 manifest 指纹一致");

const screenshotDirectory = path.join(projectRoot, "artifacts", "ui-regression");
fs.mkdirSync(screenshotDirectory, { recursive: true });
const server = createGameServer(projectRoot);
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const port = server.address().port;
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ headless: true, executablePath: browserExecutable() });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "zh-CN", hasTouch: true, isMobile: true });
const page = await context.newPage();
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));

try {
  const launchUrl = `http://127.0.0.1:${port}${assignment.launchPath}`;
  await page.goto(launchUrl, { waitUntil: "networkidle" });
  await page.waitForURL((url) => url.pathname.endsWith("/dist/") && url.hash === "#/life", { timeout: 30_000 });
  await page.locator("#game-screen").waitFor({ state: "visible" });

  assert.equal(new URL(page.url()).searchParams.has("debug"), false, "正式参与者页面不得带 debug 参数");
  assert.equal(await page.locator("#debug-panel").isVisible(), false, "正式参与者页面不得显示调试面板");
  assert.equal(await page.locator("#debug-drawer-toggle").isVisible(), false, "正式参与者页面不得显示调试入口");
  assert.equal(await page.locator("#simulator-draft-list .simulator-draft-chip").count(), 5, "资源不足分组必须恢复预置草案");
  assert.equal(await page.locator("#simulator-primary-action").isVisible(), true, "资源不足分组必须显示固定季度按钮");
  assert.equal(await page.locator("#simulator-primary-action").isDisabled(), true, "资源不足草案不得提交");
  assert.match(await page.locator("#simulator-draft-note").textContent(), /时间|精力|现金/, "资源不足原因必须对玩家可见");

  const storage = await page.evaluate(() => ({
    launch: JSON.parse(localStorage.getItem("people-life:blind-test-launch:v1")),
    session: JSON.parse(localStorage.getItem("people-life:active:v5")),
    draft: JSON.parse(localStorage.getItem("people-life:quarter-draft:v1")),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));
  assert.equal(storage.launch?.batchId, manifest.batchId);
  assert.equal(storage.launch?.participantId, assignment.participantId);
  assert.equal(storage.launch?.releaseContentSha256, release.contentSha256);
  assert.equal(storage.launch?.draftCondition, "resource_shortage");
  assert.equal(storage.launch?.eventCondition, assignment.eventCondition);
  assert.equal(storage.session?.debug?.randomEvents?.forcedEventId, assignment.eventCondition, "隐藏强制事件必须只写入测试存档");
  assert.equal(storage.draft?.eventId, "quarter:1984:Q1", "预置草案必须绑定正式 Q1 稳定 eventId");
  assert.equal(storage.overflow, false, "390×844 主持入口结果页不得横向溢出");
  assert.deepEqual(pageErrors, [], `主持入口不得产生 pageerror：${pageErrors.join("；")}`);

  const screenshotName = "p0-p2-blind-launcher-resource-390.png";
  await page.screenshot({ path: path.join(screenshotDirectory, screenshotName), fullPage: true });
  console.log(JSON.stringify({
    ok: true,
    batchId: manifest.batchId,
    participantId: assignment.participantId,
    releaseContentSha256: release.contentSha256,
    screenshot: screenshotName,
    checks: [
      "launcher_redirects_to_formal_dist_life",
      "candidate_fingerprint_matches",
      "debug_ui_hidden",
      "resource_shortage_draft_restored",
      "forced_event_stored_without_debug_query",
      "no_horizontal_overflow_or_pageerror",
    ],
  }, null, 2));
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
