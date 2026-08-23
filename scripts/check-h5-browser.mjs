import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createGameServer } from "./serve-game.mjs";

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
  if (!executable) throw new Error("未找到Edge或Chrome");
  return executable;
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(projectRoot, "dist");
assert.ok(fs.existsSync(path.join(distRoot, "index.html")), "请先执行 npm run h5:build");
const server = createGameServer(distRoot);
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const port = server.address().port;
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ headless: true, executablePath: browserExecutable() });

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  const externalRequests = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname !== "127.0.0.1") externalRequests.push(request.url());
  });
  await page.goto(`http://127.0.0.1:${port}/#/title`, { waitUntil: "networkidle" });
  await page.locator("#start-screen").waitFor({ state: "visible" });
  assert.equal(await page.locator("#header-title").textContent(), "1978—一生");
  const manifestResponse = await page.request.get(`http://127.0.0.1:${port}/manifest.webmanifest`);
  assert.equal(manifestResponse.status(), 200);
  assert.match(manifestResponse.headers()["content-type"], /application\/manifest\+json/);

  await page.locator("#new-life-button").click();
  await page.locator("#new-life-screen").waitFor({ state: "visible" });
  await page.locator('input[name="birth-year"][value="1978"]').check({ force: true });
  await page.locator("#mortality-toggle").uncheck({ force: true });
  await page.locator("#start-button").click();
  await page.locator("#year-review-screen").waitFor({ state: "visible" });
  assert.match(await page.locator("#year-review-title").textContent(), /1978年/);
  assert.deepEqual(errors, []);
  assert.deepEqual(externalRequests, []);
  console.log(JSON.stringify({
    ok: true,
    viewport: "390x844",
    checks: [
      "dist_root_boots_in_real_browser",
      "manifest_served_with_correct_mime",
      "new_life_reaches_first_year_review",
      "no_page_errors_or_external_requests",
    ],
  }, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
