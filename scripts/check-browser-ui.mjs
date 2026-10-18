import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DATA_FILES } from "../src/game/load-game-data.mjs";
import { replayDebugToTarget } from "../src/game/debug-tools.mjs";
import { createGameServer } from "./serve-game.mjs";

async function loadPlaywright() {
  try { return await import("playwright"); } catch {
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

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const screenshotDirectory = path.join(projectRoot, "artifacts", "ui-regression");
const gameData = Object.fromEntries(Object.entries(DATA_FILES).map(([key, relativePath]) => [
  key,
  JSON.parse(fs.readFileSync(path.join(projectRoot, relativePath), "utf8")),
]));
const formalAge6Fixture = replayDebugToTarget(gameData, {
  seed: "age6-formal-save",
  birthYear: 1978,
  targetAge: 6,
  targetPoint: "q1",
  mortality: false,
  routePreset: "balanced",
  familyPreset: "natural",
  pressurePreset: "ordinary",
  randomMode: "normal",
  forcedEventId: null,
});
const formalAge6Session = structuredClone(formalAge6Fixture.session);
delete formalAge6Session.debug;
const forcedEventAge6Session = structuredClone(formalAge6Fixture.session);
forcedEventAge6Session.debug.randomEvents = {
  mode: "forced",
  forcedEventId: "rainy_day_inside",
  activationYear: 1984,
  activationQuarter: 1,
};
fs.mkdirSync(screenshotDirectory, { recursive: true });
const server = createGameServer(projectRoot);
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const port = server.address().port;
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ headless: true, executablePath: browserExecutable() });
const baseUrl = `http://127.0.0.1:${port}`;

async function seedFormalSession(targetPage, savedSession) {
  await targetPage.goto(`${baseUrl}/#/title`, { waitUntil: "networkidle" });
  await targetPage.evaluate(() => localStorage.clear());
  await targetPage.evaluate((value) => {
    localStorage.setItem("people-life:active:v5", JSON.stringify(value));
    localStorage.setItem("people-life:ui:v1", JSON.stringify({ route: "life", params: {} }));
  }, savedSession);
  await targetPage.goto(`${baseUrl}/?restore=1#/life`, { waitUntil: "networkidle" });
  await targetPage.locator("#game-screen").waitFor({ state: "visible" });
}

async function addDistinctModuleActions(targetPage, minimum = 2) {
  const selected = [];
  const modules = targetPage.locator("#simulator-module-list .simulator-module");
  for (let index = 0; index < await modules.count() && selected.length < minimum; index += 1) {
    await modules.nth(index).scrollIntoViewIfNeeded();
    await modules.nth(index).click();
    const rows = targetPage.locator("#life-action-drawer .simulator-action-row:not(.unavailable)");
    let added = null;
    for (let rowIndex = 0; rowIndex < await rows.count(); rowIndex += 1) {
      const row = rows.nth(rowIndex);
      const toggle = row.locator(".simulator-action-toggle");
      if (await toggle.isEnabled() && (await toggle.textContent()).includes("加入")) {
        added = {
          actionId: await row.getAttribute("data-action-id"),
          moduleId: await row.getAttribute("data-module-id"),
        };
        await toggle.click();
        break;
      }
    }
    await targetPage.locator("#life-action-drawer-done").click();
    if (added) selected.push(added);
  }
  assert.ok(selected.length >= minimum, `正式季度至少应能从不同模块加入${minimum}项行动`);
  assert.equal(new Set(selected.map((entry) => entry.actionId)).size, selected.length, "正式季度行动 ID 不得重复");
  assert.equal(new Set(selected.map((entry) => entry.moduleId)).size, selected.length, "正式季度至少两项行动必须来自不同模块");
  const primary = targetPage.locator("#simulator-primary-action");
  assert.equal(await primary.isVisible(), true, "达到最少行动数后固定季度按钮必须出现");
  assert.equal(await primary.isDisabled(), false, "不同模块的普通草案应可提交");
  const draft = await targetPage.evaluate(() => JSON.parse(localStorage.getItem("people-life:quarter-draft:v1")));
  assert.match(draft?.eventId ?? "", /^quarter:1984:Q[13]$/, "正式草案必须绑定当前稳定 eventId");
  assert.deepEqual(
    new Set(draft.allocations.map((entry) => entry.actionId)),
    new Set(selected.map((entry) => entry.actionId)),
    "正式草案必须保存实际加入的 actionId",
  );
  await primary.click();
  return { selected, eventId: draft.eventId };
}

async function settleVisibleEventIfNeeded(targetPage) {
  await targetPage.waitForFunction(() => {
    const event = document.querySelector("#random-event-screen");
    const result = document.querySelector("#quarter-result-screen");
    return (event && !event.hidden) || (result && !result.hidden);
  });
  if (await targetPage.locator("#random-event-screen").isVisible()) {
    const option = targetPage.locator("#random-event-option-list .option-button:not(:disabled)").first();
    const eventId = await targetPage.locator("#random-event-screen").getAttribute("data-event-id");
    await option.click();
    await targetPage.locator("#quarter-result-screen").waitFor({ state: "visible" });
    return eventId ?? "natural-event";
  }
  return null;
}

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  async function shot(name, target = null) {
    await page.evaluate(() => {
      document.body.classList.remove("debug-drawer-open");
      const toggle = document.querySelector("#debug-drawer-toggle");
      if (toggle) {
        toggle.setAttribute("aria-expanded", "false");
        toggle.style.visibility = "hidden";
        const label = toggle.querySelector("span");
        if (label) label.textContent = "开发工具";
      }
    });
    if (target) await page.locator(target).scrollIntoViewIfNeeded();
    else await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(120);
    await page.screenshot({ path: path.join(screenshotDirectory, `p0-p2-${name}-390.png`) });
    await page.locator("#debug-drawer-toggle").evaluate((element) => element.style.removeProperty("visibility"));
  }
  async function assertPhone(label) {
    assert.equal(pageErrors.length, 0, `${label} 出现 pageerror：${pageErrors.join(" | ")}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${label} 横向溢出`);
  }
  async function setDebug({ seed = "age6-rain", birthYear = 1978, targetAge = 6, targetPoint = "q1", randomMode = "normal", eventId = null } = {}) {
    const debugToggle = page.locator("#debug-drawer-toggle");
    if (await debugToggle.getAttribute("aria-expanded") !== "true") await debugToggle.click();
    await page.locator("#debug-seed").fill(seed);
    await page.locator("#debug-birth-year").selectOption(String(birthYear));
    await page.locator("#debug-target-age").fill(String(targetAge));
    await page.locator("#debug-target-point").selectOption(targetPoint);
    await page.locator("#debug-random-mode").selectOption(randomMode);
    if (eventId) await page.locator("#debug-event-select").selectOption(eventId);
    await page.locator("#debug-jump-button").click();
    await page.locator(targetPoint === "review" ? "#year-review-screen" : "#game-screen").waitFor({ state: "visible" });
    await page.waitForTimeout(30);
    if (await debugToggle.getAttribute("aria-expanded") === "true") await debugToggle.click();
  }
  async function armForcedEvent(eventId) {
    const debugToggle = page.locator("#debug-drawer-toggle");
    if (await debugToggle.getAttribute("aria-expanded") !== "true") await debugToggle.click();
    await page.locator("#debug-random-mode").selectOption("forced");
    await page.locator("#debug-event-select").selectOption(eventId);
    if (await debugToggle.getAttribute("aria-expanded") === "true") await debugToggle.click();
  }
  async function openModuleAndAdd(moduleIndex = 0) {
    const modules = page.locator("#simulator-module-list .simulator-module");
    assert.ok(await modules.count() >= 5, "主屏必须显示五个生活模块");
    await modules.nth(moduleIndex).click();
    const rows = page.locator("#life-action-drawer .simulator-action-row:not(.unavailable)");
    for (let index = 0; index < await rows.count(); index += 1) {
      const toggle = rows.nth(index).locator(".simulator-action-toggle");
      if (await toggle.isEnabled() && (await toggle.textContent()).includes("加入")) {
        await toggle.click();
        await closeDrawer();
        return true;
      }
    }
    await closeDrawer();
    return false;
  }
  async function closeDrawer() {
    if (await page.locator("#life-action-drawer").isVisible()) await page.locator("#life-action-drawer-done").click();
  }
  async function countAge6Actions() {
    let total = 0;
    const modules = page.locator("#simulator-module-list .simulator-module");
    for (let index = 0; index < await modules.count(); index += 1) {
      await modules.nth(index).click();
      total += await page.locator("#life-action-drawer .simulator-action-row").count();
      await closeDrawer();
    }
    return total;
  }
  async function planOneAndSubmit() {
    for (let index = 0; index < 5; index += 1) {
      if (await page.locator("#simulator-draft-list .simulator-draft-chip").count() >= 2) break;
      await openModuleAndAdd(index);
    }
    await closeDrawer();
    assert.ok(await page.locator("#simulator-draft-list .simulator-draft-chip").count() >= 2, "6岁季度计划至少需要两项行动");
    assert.equal(await page.locator("#simulator-primary-action").isDisabled(), false, "达到最小行动数且资源足够时主按钮应可用");
    await page.locator("#simulator-primary-action").click();
  }

  await page.goto(`${baseUrl}/?debug=1#/title`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("#start-screen").waitFor({ state: "visible" });
  await setDebug({ targetAge: 6, targetPoint: "q1" });
  assert.equal(await page.locator("#simulator-year").textContent(), "1984");
  assert.equal(await page.locator("#simulator-age").textContent(), "6岁");
  assert.match(await page.locator("#simulator-quarter").textContent(), /Q1/);
  assert.ok(await page.locator("#simulator-quarter-list .simulator-quarter-item").count() === 4);
  assert.equal(await page.locator("#main-navigation button").count(), 4, "正式底部导航必须只有四个主页面");
  assert.equal(await page.locator("#simulator-primary-action").isVisible(), false, "尚未达到最少行动数时不得用固定按钮覆盖模块");
  const initialModuleSafeArea = await page.evaluate(() => {
    const module = document.querySelector("#simulator-module-list .simulator-module");
    const navigation = document.querySelector("#main-navigation");
    if (!module || !navigation) return false;
    const moduleBox = module.getBoundingClientRect();
    const navigationBox = navigation.getBoundingClientRect();
    return moduleBox.top >= 0 && moduleBox.bottom <= navigationBox.top;
  });
  assert.equal(initialModuleSafeArea, true, "390×844 首屏模块首排必须完整位于底部导航上方");
  const firstModuleHit = await page.locator("#simulator-module-list .simulator-module").first().evaluate((element) => {
    const box = element.getBoundingClientRect();
    const target = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return target === element || element.contains(target);
  });
  assert.equal(firstModuleHit, true, "首个生活模块中心点不得被固定 CTA 或底部导航抢占");
  assert.ok(await countAge6Actions() >= 8, "主动季度至少应提供8个候选行动");
  await page.locator("#simulator-module-list .simulator-module").first().click();
  await page.locator("#life-action-drawer").waitFor({ state: "visible" });
  assert.match(await page.locator("#life-action-drawer-list").textContent(), /现在：/);
  assert.match(await page.locator("#life-action-drawer-list").textContent(), /长期：/);
  assert.match(await page.locator("#life-action-drawer-list").textContent(), /\d格.*\d精力/);
  await shot("action-drawer");
  await closeDrawer();
  await assertPhone("1984 Q1 主屏");
  await shot("age6-q1");

  // Deliberately over-allocate the draft at focus intensity; the primary action must block.
  for (let index = 0; index < 5; index += 1) await openModuleAndAdd(index);
  await page.locator("#simulator-module-list .simulator-module").first().click();
  const selectedRows = page.locator("#life-action-drawer .simulator-action-row.selected");
  for (let index = 0; index < await selectedRows.count(); index += 1) {
    const focus = selectedRows.nth(index).locator(".simulator-intensity-bar button", { hasText: "重点" });
    if (await focus.count()) await focus.click();
  }
  await closeDrawer();
  assert.equal(await page.locator("#simulator-primary-action").isDisabled(), true, "资源超限时不得允许提交");
  assert.match(await page.locator("#simulator-draft-note").textContent(), /时间|精力|现金/);
  await assertPhone("资源不足路径");
  await shot("resource-blocked", "#simulator-draft-note");

  // Refresh must keep the draft as UI state, while the simulation remains unchanged.
  const beforeRefresh = await page.locator("#simulator-draft-list").textContent();
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator("#simulator-draft-list").textContent(), beforeRefresh, "未提交草案刷新后应恢复");
  await assertPhone("草案刷新恢复");

  // Remove until a valid plan can be submitted, then check the three-month result surface.
  while (await page.locator("#simulator-primary-action").isDisabled()) {
    const chips = page.locator("#simulator-draft-list .simulator-draft-chip");
    assert.ok(await chips.count() > 0, "资源不足时应能通过草案移除恢复");
    await chips.first().getByRole("button", { name: "移除" }).click();
  }
  await planOneAndSubmit();
  if (await page.locator("#random-event-screen").isVisible()) await page.locator("#random-event-option-list .option-button:not(:disabled)").first().click();
  await page.locator("#quarter-result-screen").waitFor({ state: "visible" });
  assert.ok(await page.locator("#quarter-month-list .quarter-month-item").count() >= 3, "季度结果必须显示三个月执行");
  await shot("quarter-result");

  // Forced rainy-day event: interruption must resolve inside the same quarter.
  await setDebug({ targetAge: 6, targetPoint: "q1", randomMode: "normal" });
  await armForcedEvent("rainy_day_inside");
  await planOneAndSubmit();
  await page.locator("#random-event-screen").waitFor({ state: "visible" });
  assert.match(await page.locator("#random-event-screen").textContent(), /雨|室内|打断/);
  assert.ok(await page.locator("#random-event-option-list .option-button:not(:disabled)").count() >= 2, "打断事件必须在选择前显示至少两个具体选项");
  await shot("event-choice-rainy-day", "#random-event-screen");
  await page.locator("#random-event-option-list .option-button:not(:disabled)").first().click();
  await page.locator("#quarter-result-screen").waitFor({ state: "visible" });
  assert.equal(await page.locator("#game-toast").isVisible(), false, "事件结算正文不得被通用 toast 覆盖");
  assert.ok(await page.locator("#quarter-month-list .quarter-month-item").count() >= 3);
  await page.locator("#quarter-interruption-card").waitFor({ state: "visible" });
  assert.match(await page.locator("#quarter-interruption-card").textContent(), /持续降雨|受影响行动|受影响范围/);
  assert.match(await page.locator("#quarter-interruption-card").textContent(), /事件后剩余.*按调整后的计划继续/);
  const interruptionTiming = /事件前已执行(\d)个月；事件后剩余(\d)个月/.exec(
    await page.locator("#quarter-interruption-card").textContent(),
  );
  assert.ok(interruptionTiming, "事件结算必须区分事件前已执行月份和事件后剩余计划");
  assert.equal(Number(interruptionTiming[1]) + Number(interruptionTiming[2]), 2, "打断发生月之外的前后月份应合计2个月");
  await assertPhone("事件打断路径");
  await shot("event-interrupted", "#quarter-interruption-card");

  // A hidden forced-event fixture must still use the formal UI and survive a result-page reload.
  const forcedContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const forced = await forcedContext.newPage();
  const forcedErrors = [];
  forced.on("pageerror", (error) => forcedErrors.push(String(error)));
  await seedFormalSession(forced, forcedEventAge6Session);
  assert.equal(await forced.locator("#debug-drawer-toggle").isVisible(), false, "真人强制事件条件不得暴露调试 UI");
  const forcedPlan = await addDistinctModuleActions(forced);
  await forced.locator("#random-event-screen").waitFor({ state: "visible" });
  assert.match(await forced.locator("#random-event-screen").textContent(), /雨|室内|打断/);
  const forcedOptions = await forced.locator("#random-event-option-list .option-button:not(:disabled)").allTextContents();
  assert.ok(forcedOptions.length >= 2, "正式强制事件必须提供至少两个选择");
  await forced.screenshot({ path: path.join(screenshotDirectory, "p0-p2-formal-event-choice-390.png") });
  await forced.locator("#random-event-option-list .option-button:not(:disabled)").first().click();
  await forced.locator("#quarter-result-screen").waitFor({ state: "visible" });
  await forced.locator("#quarter-interruption-card").waitFor({ state: "visible" });
  assert.equal(await forced.locator("#game-toast").isVisible(), false, "正式事件结果不得被 toast 覆盖");
  const forcedResult = await forced.locator("#quarter-interruption-card").textContent();
  const forcedSave = await forced.evaluate(() => JSON.parse(localStorage.getItem("people-life:active:v5")));
  assert.equal(forcedSave.schemaVersion, 5);
  await forced.reload({ waitUntil: "networkidle" });
  await forced.locator("#quarter-result-screen").waitFor({ state: "visible" });
  assert.equal(await forced.locator("#quarter-interruption-card").textContent(), forcedResult, "事件选择后的正式存档刷新不得改变打断事实");
  assert.equal(forcedErrors.length, 0, `正式强制事件流程出现 pageerror：${forcedErrors.join(" | ")}`);
  await forced.screenshot({ path: path.join(screenshotDirectory, "p0-p2-formal-event-restore-390.png") });
  await forcedContext.close();

  // Formal (non-debug) Q1→Q2→Q3→Q4 flow: plans, results, review, age-up, records and people.
  const formalContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const formal = await formalContext.newPage();
  const formalErrors = [];
  formal.on("pageerror", (error) => formalErrors.push(String(error)));
  await seedFormalSession(formal, formalAge6Session);
  assert.equal(await formal.locator("#simulator-year").textContent(), "1984");
  assert.equal(await formal.locator("#simulator-age").textContent(), "6岁");
  const formalPoint = await formal.locator("#simulator-quarter-title").textContent();
  assert.equal(await formal.evaluate(() => JSON.parse(localStorage.getItem("people-life:active:v5")).schemaVersion), 5);
  await formal.reload({ waitUntil: "networkidle" });
  assert.equal(await formal.locator("#simulator-quarter-title").textContent(), formalPoint, "正式 v5 存档刷新后应恢复年龄6同一季度节点");

  const q1Plan = await addDistinctModuleActions(formal);
  await settleVisibleEventIfNeeded(formal);
  await formal.locator("#quarter-result-screen").waitFor({ state: "visible" });
  assert.match(await formal.locator("#quarter-result-title").textContent(), /Q1.*Q2|Q1—Q2/);
  assert.ok(await formal.locator("#quarter-month-list .quarter-month-item").count() >= 6, "Q1 计划与 Q2 自动延续必须各留下三个月事实");
  assert.equal(await formal.locator("#game-toast").isVisible(), false, "季度结果正文不得被 toast 覆盖");
  const q1ResultText = await formal.locator("#quarter-result-screen").textContent();
  await formal.reload({ waitUntil: "networkidle" });
  assert.equal(await formal.locator("#quarter-result-screen").textContent(), q1ResultText, "Q1–Q2 结果刷新后不得改变");
  await formal.locator("#quarter-result-continue").click();
  await formal.locator("#game-screen").waitFor({ state: "visible" });
  assert.match(await formal.locator("#simulator-quarter").textContent(), /Q3/);
  assert.match(await formal.locator("#simulator-quarter-title").textContent(), /Q3/);
  const q3Point = await formal.locator("#simulator-quarter-title").textContent();
  await formal.reload({ waitUntil: "networkidle" });
  assert.equal(await formal.locator("#simulator-quarter-title").textContent(), q3Point, "Q3 主动节点必须可从正式存档恢复");

  const q3Plan = await addDistinctModuleActions(formal);
  await settleVisibleEventIfNeeded(formal);
  await formal.locator("#quarter-result-screen").waitFor({ state: "visible" });
  const q34ResultTitles = [];
  let q34MonthCount = 0;
  for (let step = 0; step < 5; step += 1) {
    if (await formal.locator("#quarter-result-screen").isVisible()) {
      q34ResultTitles.push(await formal.locator("#quarter-result-title").textContent());
      q34MonthCount += await formal.locator("#quarter-month-list .quarter-month-item").count();
      await formal.locator("#quarter-result-continue").click();
    }
    await formal.waitForFunction(() => ["random-event-screen", "quarter-result-screen", "year-review-screen", "game-screen"]
      .some((id) => !document.getElementById(id)?.hidden));
    if (await formal.locator("#year-review-screen").isVisible()) break;
    if (await formal.locator("#random-event-screen").isVisible()) {
      await formal.locator("#random-event-option-list .option-button:not(:disabled)").first().click();
      await formal.locator("#quarter-result-screen").waitFor({ state: "visible" });
      continue;
    }
    if (await formal.locator("#game-screen").isVisible()) {
      assert.equal(await formal.locator("#life-simulator-main").isVisible(), false, "阶段关键选择出现时不得残留旧季度草案壳");
      assert.equal(await formal.locator("#event-card").isVisible(), true, "Q4 后的年龄阶段关键选择必须使用正式事件卡");
      assert.match(await formal.locator("#event-title").textContent(), /入学前的准备/);
      assert.ok(await formal.locator("#option-list .option-button:not(:disabled)").count() >= 2, "入学准备必须提供真实取舍选项");
      await formal.evaluate(() => window.scrollTo(0, 0));
      await formal.screenshot({ path: path.join(screenshotDirectory, "p0-p2-age6-school-preparation-390.png") });
      await formal.locator("#option-list .option-button:not(:disabled)").first().click();
      continue;
    }
  }
  assert.ok(q34ResultTitles.some((title) => /第三季度|Q3/.test(title)), "正式全年流程必须展示 Q3 结果");
  assert.ok(q34MonthCount >= 6, "Q3 计划与 Q4 自动延续必须各留下三个月事实");
  await formal.locator("#year-review-screen").waitFor({ state: "visible" });
  assert.match(await formal.locator("#year-review-title").textContent(), /1984/);
  assert.equal(await formal.locator("#game-toast").isVisible(), false, "年度回望正文不得被 toast 覆盖");
  await formal.evaluate(() => window.scrollTo(0, 0));
  await formal.screenshot({ path: path.join(screenshotDirectory, "p0-p2-q4-review-age6-390.png") });
  const reviewText = await formal.locator("#year-review-screen").textContent();
  await formal.reload({ waitUntil: "networkidle" });
  assert.equal(await formal.locator("#year-review-screen").textContent(), reviewText, "Q4 年度回望待确认状态必须可恢复");
  await formal.locator("#year-review-option-list .option-button:not(:disabled)").first().click();
  await formal.locator("#game-screen").waitFor({ state: "visible" });
  assert.equal(await formal.locator("#simulator-year").textContent(), "1985");
  assert.equal(await formal.locator("#simulator-age").textContent(), "7岁");
  assert.match(await formal.locator("#simulator-stage").textContent(), /小学/);
  assert.equal(await formal.locator("#game-toast").isVisible(), false, "7 岁入口不得被年度 toast 覆盖");
  await formal.reload({ waitUntil: "networkidle" });
  assert.equal(await formal.locator("#simulator-age").textContent(), "7岁", "Q4 增龄后的正式存档刷新必须仍为7岁");
  await formal.evaluate(() => window.scrollTo(0, 0));
  await formal.screenshot({ path: path.join(screenshotDirectory, "p0-p2-age7-primary-entry-390.png") });

  await formal.locator('#main-navigation [data-route="records"]').click();
  await formal.locator("#records-page").waitFor({ state: "visible" });
  const year1984 = formal.locator(".timeline-year-group", { hasText: "1984" }).first();
  await year1984.waitFor({ state: "visible" });
  assert.match(await year1984.locator(":scope > summary").textContent(), /4条季度记录/);
  if ((await year1984.getAttribute("open")) === null) await year1984.locator(":scope > summary").click();
  const quarterDetails = year1984.locator(".timeline-quarter-details");
  if ((await quarterDetails.getAttribute("open")) === null) await quarterDetails.locator("summary").click();
  assert.equal(await quarterDetails.locator("p").count(), 4, "记录页必须展开1984年四个季度事实");
  await formal.screenshot({ path: path.join(screenshotDirectory, "p0-p2-records-four-quarters-390.png") });

  await formal.locator('#main-navigation [data-route="character"]').click();
  await formal.locator("#character-page").waitFor({ state: "visible" });
  assert.ok(await formal.locator("#interest-list .interest-item").count() > 0, "全年行动后人物页必须显示兴趣积累");
  await formal.locator('#main-navigation [data-route="relations"]').click();
  await formal.locator("#relations-page").waitFor({ state: "visible" });
  assert.ok(await formal.locator("#people-list .person-list-button").count() >= 3, "年龄6切片后关系页必须保留至少3名持续人物");
  await formal.locator("#people-list .person-list-button").first().click();
  await formal.locator("#person-detail-screen").waitFor({ state: "visible" });
  assert.ok((await formal.locator("#person-memory").textContent()).trim().length > 0, "人物详情必须给出共同记忆或明确记录状态");
  await formal.screenshot({ path: path.join(screenshotDirectory, "p0-p2-person-memory-390.png") });

  assert.notEqual(q1Plan.eventId, q3Plan.eventId, "Q1 与 Q3 草案必须绑定不同稳定 eventId");
  assert.equal(formalErrors.length, 0, `正式存档流程出现 pageerror：${formalErrors.join(" | ")}`);
  assert.equal(await formal.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await formal.screenshot({ path: path.join(screenshotDirectory, "p0-p2-formal-save-restore-390.png") });
  await formalContext.close();

  const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const desktop = await desktopContext.newPage();
  const desktopErrors = [];
  desktop.on("pageerror", (error) => desktopErrors.push(String(error)));
  await desktop.emulateMedia({ reducedMotion: "reduce" });
  await desktop.goto(`${baseUrl}/#/title`, { waitUntil: "networkidle" });
  await desktop.evaluate(() => localStorage.clear());
  await desktop.evaluate((savedSession) => {
    localStorage.setItem("people-life:active:v5", JSON.stringify(savedSession));
  }, formalAge6Session);
  assert.equal(await desktop.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), true, "应覆盖 reduced-motion 浏览器流程");
  await desktop.goto(`${baseUrl}/?desktop=1#/life`, { waitUntil: "networkidle" });
  await desktop.locator("#game-screen").waitFor({ state: "visible" });
  assert.equal(await desktop.locator("#simulator-year").textContent(), "1984");
  assert.equal(await desktop.locator("#simulator-age").textContent(), "6岁");
  assert.equal(desktopErrors.length, 0, `1280x900 life 流程出现 pageerror：${desktopErrors.join(" | ")}`);
  assert.equal(await desktop.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, "1280x900 life 横向溢出");
  await desktop.screenshot({ path: path.join(screenshotDirectory, "p0-p2-life-desktop-1280x900.png") });
  await desktopContext.close();
  await context.close();
  console.log(JSON.stringify({
    ok: true,
    viewport: "390x844",
    screenshots: [
      "p0-p2-age6-q1-390.png", "p0-p2-resource-blocked-390.png", "p0-p2-quarter-result-390.png",
      "p0-p2-action-drawer-390.png", "p0-p2-event-choice-rainy-day-390.png", "p0-p2-event-interrupted-390.png",
      "p0-p2-formal-event-choice-390.png", "p0-p2-formal-event-restore-390.png",
      "p0-p2-age6-school-preparation-390.png", "p0-p2-q4-review-age6-390.png", "p0-p2-age7-primary-entry-390.png",
      "p0-p2-records-four-quarters-390.png", "p0-p2-person-memory-390.png",
      "p0-p2-formal-save-restore-390.png", "p0-p2-life-desktop-1280x900.png",
    ],
    checks: [
      "no_horizontal_overflow", "no_pageerror", "unobscured_module_hit_target", "action_drawer_immediate_and_long_term_feedback",
      "resource_shortage", "event_choice_before_resolution", "event_interruption", "formal_event_result_restore",
      "formal_q1_q2_q3_q4_flow", "age6_stage_event_surface", "q4_review_to_age7", "formal_v5_save_restore", "records_four_quarters",
      "persistent_people_and_memory", "interest_visibility", "reduced_motion", "desktop_life_1280x900",
    ],
  }, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
