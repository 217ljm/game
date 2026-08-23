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
  if (!executable) throw new Error("未找到Edge或Chrome；可通过PEOPLE_LIFE_BROWSER_PATH指定浏览器路径");
  return executable;
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));

  async function chooseActivities(count, intensityLabel = null) {
    const options = page.locator("#option-list .activity-option:not(:disabled)");
    assert.ok(await options.count() >= count, `至少需要${count}个可执行活动`);
    for (let index = 0; index < count; index += 1) await options.nth(index).click();
    assert.equal(await page.locator("#plan-intensity-list .plan-intensity-row").count(), count);
    if (intensityLabel) {
      await page.locator("#plan-intensity-list .plan-intensity-row").first()
        .getByRole("button", { name: new RegExp(intensityLabel) })
        .click();
    }
    assert.equal(await page.locator("#life-stage-intensity-list .plan-intensity-row").count(), count);
    if (intensityLabel) assert.ok(await page.locator("#life-stage-intensity-list .plan-intensity-choices button.active", { hasText: intensityLabel }).count());
    assert.match(await page.locator("#plan-budget-hours").textContent(), /格.*精力/);
    assert.equal(await page.locator("#confirm-plan-button").isEnabled(), true);
    await page.locator("#confirm-plan-button").click();
  }

  async function resolveRandomEventIfPresent() {
    if (await page.locator("#random-event-screen").isVisible()) {
      const option = page.locator("#random-event-option-list .option-button:not(:disabled)").first();
      assert.ok(await option.count(), "随机事件必须有可执行选择");
      await option.click();
    }
  }

  async function reachYearReview(limit = 12) {
    for (let index = 0; index < limit; index += 1) {
      if (await page.locator("#year-review-screen").isVisible()) return;
      if (await page.locator("#quarter-result-screen").isVisible()) {
        await page.locator("#quarter-result-continue").click();
      } else if (await page.locator("#random-event-screen").isVisible()) {
        await page.locator("#random-event-option-list .option-button:not(:disabled)").first().click();
      } else if (await page.locator("#game-screen").isVisible()) {
        if (await page.locator("#confirm-plan-button").isVisible()) await chooseActivities(1);
        else await page.locator("#option-list .option-button:not(:disabled)").first().click();
      }
      await page.waitForTimeout(30);
    }
    assert.fail(`在${limit}次交互内没有到达年度结算`);
  }

  await page.goto(`http://127.0.0.1:${port}/#/title`, { waitUntil: "networkidle" });
  await page.locator("#start-screen").waitFor({ state: "visible" });
  assert.equal(await page.locator("#header-title").textContent(), "1978—一生");
  assert.equal(await page.locator("#new-life-button").isVisible(), true);
  await page.screenshot({ path: path.join(screenshotDirectory, "multi-page-title.png"), fullPage: true });

  await page.locator("#new-life-button").click();
  await page.locator("#new-life-screen").waitFor({ state: "visible" });
  assert.equal(await page.locator("#header-title").textContent(), "人生起点");
  assert.equal(await page.locator("#header-back-button").isVisible(), true);
  await page.screenshot({ path: path.join(screenshotDirectory, "multi-page-new-life.png"), fullPage: true });
  await page.locator('input[name="birth-year"][value="1978"]').check({ force: true });
  await page.locator("#mortality-toggle").uncheck({ force: true });
  await page.locator("#start-button").click();

  await page.locator("#year-review-screen").waitFor({ state: "visible" });
  assert.equal(await page.locator("#header-title").textContent(), "年度回望");
  assert.match(await page.locator("#year-review-title").textContent(), /1978年/);
  assert.equal(await page.locator("#year-review-ledger-list > div").count(), 4);
  assert.match(await page.locator("#year-review-fact-list").textContent(), /出生健康基础.*不是临床/);
  assert.equal(await page.locator("#year-review-mainline-card").isVisible(), true);
  assert.equal(await page.locator("#year-review-mainline-list > div").count(), 3);
  assert.equal(await page.locator("#main-navigation").isVisible(), false);
  await page.screenshot({ path: path.join(screenshotDirectory, "multi-page-year-review.png"), fullPage: true });

  await page.locator("#year-review-option-list .option-button:not(:disabled)").first().click();
  await page.locator("#game-screen").waitFor({ state: "visible" });
  await page.waitForFunction(() => document.querySelector("#life-stage-action-list")?.classList.contains("ready"));
  assert.equal(await page.locator("#current-age").textContent(), "1岁");
  assert.equal(await page.locator("#current-year").textContent(), "1979");
  assert.equal(await page.locator("#main-navigation button").count(), 5);
  assert.match(await page.locator("#event-stage").textContent(), /1岁.*第三季度/);
  assert.match(await page.locator("#event-prompt").textContent(), /我只回应此刻能看到、听到和够到的事物/);
  assert.match(await page.locator("#quarter-progress-count").textContent(), /2 \/ 4/);
  assert.equal(await page.locator("#life-stage-card").isVisible(), true);
  assert.equal(await page.locator("#life-stage-card").getAttribute("data-life-stage"), "infant");
  assert.equal(await page.locator("#life-stage-action-list .life-stage-action").count(), 3);
  assert.equal(await page.locator("#life-stage-action-list img").count(), 0);
  assert.equal(await page.locator("#life-stage-action-list .life-stage-action-icon").count(), 3);
  await page.screenshot({ path: path.join(screenshotDirectory, "multi-page-life.png"), fullPage: true });
  await page.locator("#life-stage-more-actions").click();
  assert.equal(await page.locator("#action-pool-card").isVisible(), true);
  assert.equal(await page.locator("#mainline-card").isVisible(), false);
  assert.ok(await page.locator("#action-pool-categories button").count() >= 4);
  assert.ok(await page.locator("#option-list .activity-option").count() >= 6);
  assert.match(await page.locator("#option-list .activity-option").first().textContent(), /主线.*属性|主线.*兴趣/s);
  await page.locator("#action-pool-categories button", { hasText: "观察与探索" }).click();
  assert.ok(await page.locator("#option-list .activity-option").count() >= 2);
  await page.locator("#action-pool-categories button", { hasText: "全部" }).click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.locator("#life-stage-context-toggle").click();
  assert.equal(await page.locator("#mainline-card").isVisible(), true);
  assert.equal(await page.locator("#mainline-quest-list .mainline-quest").count(), 3);
  assert.match(await page.locator("#mainline-card").textContent(), /眼下要维持.*正在积累.*想要靠近/s);

  await chooseActivities(1, "重点投入");
  await page.waitForTimeout(30);
  await resolveRandomEventIfPresent();
  await page.locator("#quarter-result-screen").waitFor({ state: "visible" });
  assert.equal(await page.locator("#header-title").textContent(), "季度收获");
  assert.match(await page.locator("#quarter-result-meta").textContent(), /1979年.*1岁/);
  assert.ok((await page.locator("#quarter-result-plan").textContent()).length > 0);
  assert.equal(await page.locator("#quarter-impact-card").isVisible(), true);
  assert.match(await page.locator("#quarter-impact-list").textContent(), /人生主线/);
  assert.match(await page.locator("#quarter-impact-list").textContent(), /兴趣|属性/);
  assert.ok(await page.locator("#quarter-impact-list .impact-item").count() >= 1);
  assert.equal(await page.locator("#quarter-result-visual").isVisible(), true);
  assert.equal(await page.locator("#quarter-month-card").isVisible(), true);
  const resolvedMonthCount = await page.locator("#quarter-month-list .quarter-month-item").count();
  assert.ok(resolvedMonthCount >= 3 && resolvedMonthCount % 3 === 0);
  assert.match(await page.locator("#quarter-month-list").textContent(), /月.*已执行.*精力/s);
  if (await page.locator("#childhood-experience-card").isVisible()) {
    assert.match(await page.locator("#childhood-experience-list").textContent(), /实际.*小时/);
  }
  assert.equal(await page.locator("#main-navigation").isVisible(), false);
  await page.screenshot({ path: path.join(screenshotDirectory, "multi-page-quarter-result.png"), fullPage: true });

  await reachYearReview();
  assert.match(await page.locator("#year-review-title").textContent(), /1979年/);
  await page.locator("#year-review-option-list .option-button:not(:disabled)").first().click();
  await page.locator("#game-screen").waitFor({ state: "visible" });
  assert.equal(await page.locator("#current-age").textContent(), "2岁");

  await page.locator('#main-navigation button[data-route="map"]').click();
  await page.locator("#map-page").waitFor({ state: "visible" });
  await page.waitForTimeout(350);
  assert.equal(await page.locator("#world-map-board .world-map-node").count(), 6);
  assert.equal(await page.locator("#world-map-board .world-map-node.current").count(), 1);
  assert.ok(await page.locator("#world-map-board .world-map-node.locked").count() >= 2);
  assert.match(await page.locator("#map-location-panel").textContent(), /住处.*出行.*人物/s);
  await page.locator("#world-map-board .world-map-node").nth(1).click();
  assert.match(await page.locator("#map-location-panel").textContent(), /机会|同伴|邻里|周围/);
  await page.screenshot({ path: path.join(screenshotDirectory, "multi-page-map.png"), fullPage: true });

  await page.locator('#main-navigation button[data-route="character"]').click();
  await page.locator("#character-page").waitFor({ state: "visible" });
  await page.waitForTimeout(350);
  assert.equal(await page.locator("#header-title").textContent(), "我的人物");
  assert.equal(await page.locator("#stats-row .stat").count(), 6);
  assert.match(await page.locator("#stats-row").textContent(), /体能/);
  assert.match(await page.locator("#stats-row").textContent(), /智力/);
  assert.match(await page.locator("#stats-row").textContent(), /外表/);
  assert.match(await page.locator("#stats-row").textContent(), /社交/);
  assert.match(await page.locator("#stats-row").textContent(), /意志/);
  assert.equal(await page.locator("#character-state-row .character-state").count(), 4);
  assert.match(await page.locator("#character-state-row").textContent(), /心情.*压力.*疲劳.*身体状态/s);
  assert.equal(await page.locator("#character-portrait").getAttribute("data-age-band"), "child");
  assert.match(await page.locator("#character-portrait").evaluate((element) => getComputedStyle(element).backgroundImage), /character-age-atlas-v1\.webp/);
  const healthValue = Number(await page.locator("#stats-row .stat", { hasText: "健康" }).locator("strong").textContent());
  assert.ok(healthValue >= 52, "新生儿健康储备不应显示为默认半血");
  assert.equal(await page.locator("#latest-growth-card").isVisible(), true);
  assert.match(await page.locator("#latest-growth-list").textContent(), /兴趣|属性/);
  await page.screenshot({ path: path.join(screenshotDirectory, "multi-page-character.png"), fullPage: true });
  await page.locator('[data-character-tab="growth"]').click();
  assert.equal(await page.locator("#character-growth-panel").isVisible(), true);
  assert.ok(await page.locator("#life-direction-list .direction-item").count() >= 5);
  assert.match(await page.locator("#life-direction-list .direction-item").first().textContent(), /当前方向/);
  await page.locator('[data-character-tab="status"]').click();
  assert.match(page.url(), /#\/character$/);
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("#character-page").waitFor({ state: "visible" });
  assert.equal(await page.locator('#main-navigation button[data-route="character"]').getAttribute("aria-current"), "page");

  await page.locator('#main-navigation button[data-route="relations"]').click();
  await page.locator("#relations-page").waitFor({ state: "visible" });
  await page.waitForTimeout(350);
  assert.ok(await page.locator("#people-list .person-list-button").count() >= 1);
  await page.screenshot({ path: path.join(screenshotDirectory, "multi-page-relations.png"), fullPage: true });
  await page.locator("#people-list .person-list-button").first().click();
  await page.locator("#person-detail-screen").waitFor({ state: "visible" });
  await page.waitForTimeout(350);
  assert.equal(await page.locator("#header-title").textContent(), "共同记忆");
  assert.equal(await page.locator("#header-back-button").isVisible(), true);
  await page.screenshot({ path: path.join(screenshotDirectory, "multi-page-person.png"), fullPage: true });
  await page.locator("#header-back-button").click();
  await page.locator("#relations-page").waitFor({ state: "visible" });

  await page.locator('#main-navigation button[data-route="records"]').click();
  await page.locator("#records-page").waitFor({ state: "visible" });
  await page.waitForTimeout(350);
  assert.equal(await page.locator("#records-timeline-panel").isVisible(), true);
  assert.ok(await page.locator("#timeline-list .timeline-year-group").count() >= 2);
  assert.match(await page.locator("#timeline-list").textContent(), /季度明细/);
  await page.screenshot({ path: path.join(screenshotDirectory, "multi-page-records.png"), fullPage: true });

  await page.locator('[data-record-tab="profile"]').click();
  assert.equal(await page.locator("#records-profile-panel").isVisible(), true);
  assert.match(await page.locator("#archive-current-point").textContent(), /2岁/);
  assert.ok((await page.locator("#archive-seed").textContent()).startsWith("life-"));
  await page.locator("#open-settings-button").click();
  assert.equal(await page.locator("#settings-dialog").isVisible(), true);
  assert.match(await page.locator("#save-status").textContent(), /已自动保存/);
  assert.equal(await page.locator("#motion-mode-select").inputValue(), "full");
  assert.equal(await page.locator("#sound-toggle").isChecked(), true);
  assert.equal(await page.locator("#haptic-toggle").isChecked(), true);
  await page.locator("#motion-mode-select").selectOption("off");
  await page.locator("#sound-toggle").uncheck();
  await page.locator("#haptic-toggle").uncheck();
  assert.equal(await page.locator("body").getAttribute("data-motion"), "off");
  assert.equal(await page.locator("#character-portrait").evaluate((element) => getComputedStyle(element).animationName), "none");
  const disabledPresentation = await page.evaluate(() => JSON.parse(localStorage.getItem("people-life:presentation:v1")));
  assert.deepEqual(disabledPresentation, { schemaVersion: 1, motionMode: "off", soundEnabled: false, hapticEnabled: false });
  await page.screenshot({ path: path.join(screenshotDirectory, "multi-page-settings.png"), fullPage: true });
  await page.locator("#motion-mode-select").selectOption("full");
  await page.locator("#sound-toggle").check();
  await page.locator("#haptic-toggle").check();
  await page.locator("#close-settings-button").click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("people-life:active:v5")));
  assert.equal(saved.schemaVersion, 5);
  assert.ok(Object.values(saved.quarterPlans).some((plan) => (
    plan.allocations?.some((allocation) => allocation.intensity === "focus")
  )));
  assert.equal(saved.yearReviews["review:1978"], true);
  assert.equal(saved.yearReviews["review:1979"], true);
  assert.deepEqual(pageErrors, []);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator('#main-navigation button[data-route="records"]').click();
  await page.locator("#records-page").waitFor({ state: "visible" });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.screenshot({ path: path.join(screenshotDirectory, "multi-page-desktop-records.png"), fullPage: true });

  const debugPage = await browser.newPage({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const debugErrors = [];
  debugPage.on("pageerror", (error) => debugErrors.push(String(error)));
  async function setDebugDrawer(open) {
    const expanded = await debugPage.locator("#debug-drawer-toggle").getAttribute("aria-expanded") === "true";
    if (expanded !== open) {
      await debugPage.locator("#debug-drawer-toggle").click();
      await debugPage.waitForFunction((expected) => (
        document.body.classList.contains("debug-drawer-open") === expected
      ), open);
      await debugPage.waitForTimeout(320);
    }
  }
  await debugPage.goto(`http://127.0.0.1:${port}/?debug=1#/title`, { waitUntil: "networkidle" });
  assert.equal(await debugPage.locator("#debug-drawer-toggle").isVisible(), true);
  assert.equal(await debugPage.locator("#debug-drawer-toggle").getAttribute("aria-expanded"), "false");
  await setDebugDrawer(true);
  assert.equal(await debugPage.locator("#debug-quick-ages button").count(), 20);
  assert.equal(await debugPage.evaluate(() => localStorage.getItem("people-life:active:v5")), null);
  await debugPage.locator("#debug-quick-ages button", { hasText: "3岁" }).click();
  await debugPage.waitForFunction(() => document.querySelector("#current-age")?.textContent === "3岁", null, { timeout: 30000 });
  await setDebugDrawer(false);
  await debugPage.locator("#life-stage-more-actions").click();
  assert.equal(await debugPage.locator("#action-pool-next").isVisible(), true);
  const firstBatchAction = await debugPage.locator("#option-list .activity-option strong").first().textContent();
  await debugPage.locator("#action-pool-next").click();
  assert.notEqual(await debugPage.locator("#option-list .activity-option strong").first().textContent(), firstBatchAction);
  await setDebugDrawer(true);
  await debugPage.locator('#debug-quick-ages button[data-age="6"]').click();
  await debugPage.waitForFunction(() => document.querySelector("#current-age")?.textContent === "6岁", null, { timeout: 30000 });
  await setDebugDrawer(false);
  await debugPage.locator("#life-stage-card").waitFor({ state: "visible" });
  assert.match(await debugPage.locator("#life-stage-time").textContent(), /1984.*6岁/);
  assert.equal(await debugPage.locator("#life-stage-action-list .life-stage-action").count(), 3);
  assert.equal(await debugPage.locator("#scene-page").evaluate((element) => element.classList.contains("visual-stage-active")), true);
  assert.ok(await debugPage.locator("#life-stage-canvas").evaluate((canvas) => canvas.width > 300 && canvas.toDataURL().length > 1000));
  await debugPage.waitForFunction(() => [...document.querySelectorAll("#life-stage-action-list img")].every((image) => image.complete && image.naturalWidth > 0));
  await debugPage.waitForFunction(() => document.querySelector("#life-stage-action-list")?.classList.contains("ready"));
  await debugPage.locator("#life-stage-card").screenshot({ path: path.join(screenshotDirectory, "life-stage-age6-base.png") });
  const animationFrames = await debugPage.evaluate(() => new Promise((resolve) => {
    let count = 0;
    const started = performance.now();
    const tick = (time) => {
      count += 1;
      if (time - started >= 500) resolve(count);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
  assert.ok(animationFrames >= 15, `Canvas场景500ms内只绘制了${animationFrames}帧`);
  await debugPage.locator("#life-stage-action-list .life-stage-action").nth(0).click();
  await debugPage.locator("#life-stage-action-list .life-stage-action").nth(1).click();
  assert.equal(await debugPage.locator("#life-stage-confirm").isEnabled(), true);
  assert.notEqual(await debugPage.locator("#life-stage-card").getAttribute("data-scene"), "base");
  await debugPage.locator("#life-stage-confirm").evaluate((element) => element.scrollIntoView({ block: "center" }));
  await debugPage.waitForTimeout(80);
  const confirmBox = await debugPage.locator("#life-stage-confirm").boundingBox();
  const navigationBox = await debugPage.locator("#main-navigation").boundingBox();
  assert.ok(
    confirmBox && navigationBox && confirmBox.y + confirmBox.height <= navigationBox.y + 2,
    `季度主按钮不能被底部导航遮挡：buttonBottom=${confirmBox ? confirmBox.y + confirmBox.height : "missing"} navTop=${navigationBox?.y ?? "missing"}`,
  );
  await debugPage.locator("#life-stage-card").screenshot({ path: path.join(screenshotDirectory, "life-stage-age6.png") });
  await debugPage.locator("#life-stage-confirm").click();
  await debugPage.locator("#quarter-result-screen").waitFor({ state: "visible", timeout: 30000 });
  assert.equal(await debugPage.locator("#quarter-result-visual").isVisible(), true);
  assert.match(await debugPage.locator("#quarter-result-visual-caption").textContent(), /认字|数数|玩/);
  assert.ok(await debugPage.locator("#quarter-impact-list .impact-item").count() >= 3);
  await debugPage.locator("#quarter-result-visual").screenshot({ path: path.join(screenshotDirectory, "life-stage-age6-result.png") });
  await setDebugDrawer(true);
  await debugPage.locator("#debug-stage-event-select").selectOption("payoff_age6_someone_notices");
  await debugPage.locator("#debug-find-stage-event").click();
  await debugPage.locator("#random-event-screen").waitFor({ state: "visible", timeout: 30000 });
  await setDebugDrawer(false);
  assert.equal(await debugPage.locator("#header-title").textContent(), "人生事件");
  assert.match(await debugPage.locator("#random-event-eyebrow").textContent(), /过去做过的事.*机会与代价/);
  assert.equal(await debugPage.locator("#mainline-event-evidence").isVisible(), true);
  assert.match(await debugPage.locator("#mainline-event-evidence").textContent(), /当前连续方向.*累计约.*小时/s);
  assert.ok(await debugPage.locator("#random-event-option-list .gain-impact").count() >= 1);
  assert.ok(await debugPage.locator("#random-event-option-list .cost-impact").count() >= 1);
  await debugPage.screenshot({ path: path.join(screenshotDirectory, "multi-page-youth-mainline-event.png"), fullPage: true });
  await setDebugDrawer(true);
  await debugPage.locator('#debug-quick-ages button[data-age="18"]').click();
  await debugPage.waitForFunction(() => document.querySelector("#current-age")?.textContent === "18岁", null, { timeout: 30000 });
  await setDebugDrawer(false);
  await debugPage.locator("#life-stage-card").waitFor({ state: "visible" });
  assert.equal(await debugPage.locator("#life-stage-card").getAttribute("data-life-stage"), "adult");
  assert.match(await debugPage.locator("#life-stage-time").textContent(), /1996.*18岁/);
  assert.match(await debugPage.locator("#life-stage-action-list").textContent(), /本季新可能|爱好延续/);
  const adultConfirmBox = await debugPage.locator("#life-stage-confirm").boundingBox();
  const adultNavigationBox = await debugPage.locator("#main-navigation").boundingBox();
  assert.ok(
    adultConfirmBox && adultNavigationBox && adultConfirmBox.y + adultConfirmBox.height <= adultNavigationBox.y + 2,
    "390×844下推荐行动与季度提交按钮必须位于底部导航上方",
  );
  await debugPage.screenshot({ path: path.join(screenshotDirectory, "life-stage-age18.png"), fullPage: true });
  await debugPage.locator("#life-stage-action-list .life-stage-action").nth(0).click();
  await debugPage.locator("#life-stage-action-list .life-stage-action").nth(1).click();
  assert.equal(await debugPage.locator("#life-stage-confirm").isEnabled(), true);
  await debugPage.locator("#life-stage-confirm").click();
  if (await debugPage.locator("#random-event-screen").isVisible()) {
    await debugPage.locator("#random-event-option-list .option-button:not(:disabled)").first().click();
  }
  await debugPage.locator("#quarter-result-screen").waitFor({ state: "visible", timeout: 30000 });
  assert.equal(await debugPage.locator("#childhood-experience-card").isVisible(), true);
  const age18ExperienceItems = debugPage.locator("#childhood-experience-list .childhood-experience-item");
  assert.ok(await age18ExperienceItems.count() >= 2);
  assert.equal(await age18ExperienceItems.evaluateAll((entries) => entries.every((entry) => !entry.hasAttribute("open"))), true);
  assert.match(await age18ExperienceItems.locator("summary").first().textContent(), /实际.*小时.*：/s);
  assert.match(await debugPage.locator("#childhood-experience-list").textContent(), /实际.*小时.*对方回应/s);
  assert.ok(await debugPage.locator("#childhood-experience-list .experience-context").evaluateAll((entries) => (
    entries.some((entry) => !entry.textContent.includes("你自己"))
  )), "18岁季度过程至少应有一项具名NPC参与");
  if (await debugPage.locator("#quarter-unchosen-card").isVisible()) {
    assert.equal(await debugPage.locator("#quarter-unchosen-card").getAttribute("open"), null);
  }
  await debugPage.screenshot({ path: path.join(screenshotDirectory, "life-stage-age18-result.png"), fullPage: true });
  await setDebugDrawer(true);
  await debugPage.locator("#debug-quick-ages button", { hasText: "30岁" }).click();
  await debugPage.waitForFunction(() => document.querySelector("#current-age")?.textContent === "30岁", null, { timeout: 30000 });
  await setDebugDrawer(false);
  assert.equal(await debugPage.locator("#game-screen").isVisible(), true);
  assert.match(await debugPage.locator("#debug-status").textContent(), /30岁.*自动处理/);
  assert.match(await debugPage.locator("#mainline-chapter").textContent(), /第五章/);
  assert.equal(await debugPage.locator("#mainline-quest-list .mainline-quest").count(), 3);
  await debugPage.screenshot({ path: path.join(screenshotDirectory, "multi-page-mainline-age30.png"), fullPage: true });
  await debugPage.locator('#main-navigation button[data-route="character"]').click();
  await debugPage.locator("#character-page").waitFor({ state: "visible" });
  assert.equal(await debugPage.locator("#character-portrait").getAttribute("data-age-band"), "adult");
  await debugPage.locator('[data-character-tab="growth"]').click();
  assert.equal(await debugPage.locator("#chapter-history-list .chapter-history-item").count(), 4);
  assert.equal(await debugPage.locator("#youth-payoff-review-card").isVisible(), true);
  assert.equal(await debugPage.locator("#youth-payoff-chain-list > section").count(), 5);
  assert.match(await debugPage.locator("#youth-payoff-review-card").textContent(), /0—18岁主线复盘.*关键兑现.*此前依据/s);
  await debugPage.screenshot({ path: path.join(screenshotDirectory, "multi-page-youth-mainline-review.png"), fullPage: true });
  await debugPage.locator('#main-navigation button[data-route="scene"]').click();
  const debugSaved = await debugPage.evaluate(() => JSON.parse(localStorage.getItem("people-life:debug:v1")));
  assert.equal(debugSaved.debug.enabled, true);
  assert.equal(debugSaved.debug.minimumSurvivalAge, 30);
  await setDebugDrawer(true);
  await debugPage.locator('#debug-quick-ages button[data-age="60"]').click();
  await debugPage.waitForFunction(() => document.querySelector("#current-age")?.textContent === "60岁", null, { timeout: 30000 });
  await setDebugDrawer(false);
  await debugPage.locator('#main-navigation button[data-route="character"]').click();
  await debugPage.locator("#character-page").waitFor({ state: "visible" });
  assert.equal(await debugPage.locator("#character-portrait").getAttribute("data-age-band"), "elder");
  await debugPage.waitForTimeout(350);
  await debugPage.screenshot({ path: path.join(screenshotDirectory, "character-age60.png"), fullPage: true });
  await debugPage.locator('#main-navigation button[data-route="scene"]').click();
  await setDebugDrawer(true);
  await debugPage.locator("#debug-random-mode").selectOption("forced");
  await debugPage.locator("#debug-event-select").selectOption("unexpected_fever");
  for (let index = 0; index < 12 && !(await debugPage.locator("#random-event-screen").isVisible()); index += 1) {
    await debugPage.locator("#debug-next-node").click();
    await debugPage.waitForTimeout(80);
  }
  assert.equal(await debugPage.locator("#random-event-screen").isVisible(), true, "指定随机事件应在后续合法节点出现");
  await setDebugDrawer(false);
  assert.match(await debugPage.locator("#random-event-title").textContent(), /身体突然不舒服/);
  assert.match(await debugPage.locator("#random-event-stage").textContent(), /第\d季度/);
  assert.match(await debugPage.locator("#random-event-option-list").textContent(), /原计划预计完成70%/);
  assert.equal(await debugPage.locator("#main-navigation").isVisible(), false);
  await debugPage.screenshot({ path: path.join(screenshotDirectory, "multi-page-random-event-debug.png"), fullPage: true });
  await debugPage.locator("#random-event-option-list .option-button:not(:disabled)").first().click();
  await debugPage.locator("#quarter-result-screen").waitFor({ state: "visible", timeout: 30000 });
  assert.equal(await debugPage.locator("#quarter-month-card").isVisible(), true);
  assert.equal(await debugPage.locator("#quarter-month-list .quarter-month-item.interrupted").count(), 1);
  assert.match(await debugPage.locator("#quarter-month-list").textContent(), /发生变化/);
  assert.match(await debugPage.locator("#quarter-impact-list").textContent(), /突发事件.*身体突然不舒服.*健康-1/s);
  await debugPage.screenshot({ path: path.join(screenshotDirectory, "multi-page-month-interruption.png"), fullPage: true });
  await setDebugDrawer(true);
  await debugPage.locator("#debug-quick-ages button", { hasText: "结局" }).click({ timeout: 60000 });
  await debugPage.locator("#ending-screen").waitFor({ state: "visible", timeout: 60000 });
  await setDebugDrawer(false);
  assert.equal(await debugPage.locator("#ending-mainline-card").isVisible(), true);
  assert.match(await debugPage.locator("#ending-mainline-card").textContent(), /一生仍然守住.*曾经靠近又放下.*走过的人生章节/s);
  await debugPage.screenshot({ path: path.join(screenshotDirectory, "multi-page-mainline-ending.png"), fullPage: true });
  assert.equal(await debugPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  assert.deepEqual(debugErrors, []);
  await debugPage.close();

  console.log(JSON.stringify({
    ok: true,
    viewports: ["390x844", "1280x900"],
    screenshots: [
      "artifacts/ui-regression/multi-page-title.png",
      "artifacts/ui-regression/multi-page-new-life.png",
      "artifacts/ui-regression/multi-page-year-review.png",
      "artifacts/ui-regression/multi-page-life.png",
      "artifacts/ui-regression/multi-page-quarter-result.png",
      "artifacts/ui-regression/multi-page-map.png",
      "artifacts/ui-regression/multi-page-character.png",
      "artifacts/ui-regression/multi-page-relations.png",
      "artifacts/ui-regression/multi-page-person.png",
      "artifacts/ui-regression/multi-page-records.png",
      "artifacts/ui-regression/multi-page-settings.png",
      "artifacts/ui-regression/life-stage-age6-base.png",
      "artifacts/ui-regression/life-stage-age6.png",
      "artifacts/ui-regression/life-stage-age6-result.png",
      "artifacts/ui-regression/multi-page-mainline-age30.png",
      "artifacts/ui-regression/multi-page-youth-mainline-event.png",
      "artifacts/ui-regression/life-stage-age18.png",
      "artifacts/ui-regression/life-stage-age18-result.png",
      "artifacts/ui-regression/multi-page-youth-mainline-review.png",
      "artifacts/ui-regression/character-age60.png",
      "artifacts/ui-regression/multi-page-desktop-records.png",
      "artifacts/ui-regression/multi-page-random-event-debug.png",
      "artifacts/ui-regression/multi-page-month-interruption.png",
      "artifacts/ui-regression/multi-page-mainline-ending.png",
    ],
    checks: [
      "title_and_new_life_route",
      "year_review_flow_without_bottom_navigation",
      "scene_page_and_quarter_plan",
      "age_action_pool_category_filter_and_effect_preview",
      "dynamic_life_mainline_three_quests_and_action_links",
      "quarter_result_flow",
      "immediate_stat_interest_and_growth_feedback",
      "five_main_pages_and_active_navigation",
      "dynamic_world_map_locations_access_people_and_opportunities",
      "character_stats_and_birth_health_calibration",
      "emergent_directions_and_completed_chapter_reviews",
      "relationship_to_person_detail_and_back",
      "records_natural_year_timeline_and_profile_tabs",
      "settings_flow_save_identity",
      "presentation_motion_sound_haptic_persistence_and_character_age_portrait",
      "child_youth_adult_and_elder_character_visual_stages",
      "hash_route_refresh_recovery",
      "mobile_and_desktop_no_horizontal_overflow",
      "debug_independent_save_and_forced_random_event_flow",
      "forced_health_event_interrupts_month_execution",
      "age6_canvas_action_selection_and_visual_result",
      "age18_scene_month_actor_feedback_and_result_vertical_slice",
      "cross_quarter_action_variety_label_surface",
      "youth_mainline_event_evidence_gain_and_tradeoff_flow",
      "age_18_traceable_causal_review_surface",
      "ending_mainline_kept_laid_down_and_chapter_review",
      "no_page_errors",
    ],
  }, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
