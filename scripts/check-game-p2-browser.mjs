import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const screenshotDirectory = path.join(projectRoot, "artifacts", "ui-regression");
const preferredGamePort = 4174;
let gamePort = preferredGamePort;
let gameUrl = `http://127.0.0.1:${gamePort}/`;
const viteBin = path.join(projectRoot, "node_modules", "vite", "bin", "vite.js");

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

function readDataPack() {
  const dataFiles = {
    quarterlyAge6: "data/gameplay/quarterly_age6_1984.json",
    annualOperations: "data/annual_life_operations.json",
    quarterlyLife: "data/quarterly_life_content.json",
    childhoodPlay: "data/childhood_play_content.json",
    youthMainlinePayoffs: "data/youth_mainline_payoffs.json",
    timeline: "data/calibration/timeline_1978_2026.json",
    socialCharacters: "data/social_character_catalog.json",
    birth: "data/calibration/birth_1978_1982.json",
    childhood: "data/calibration/childhood_1978_1988.json",
    childhoodEvents: "data/childhood_events.json",
    primary: "data/calibration/primary_education_1984_1996.json",
    primaryEvents: "data/primary_education_events.json",
    adolescence: "data/calibration/adolescence_education_1986_2000.json",
    adolescenceEvents: "data/adolescence_events.json",
    youth: "data/calibration/youth_entry_1992_2006.json",
    youthEvents: "data/youth_entry_events.json",
    entryJobs: "data/entry_job_catalog.json",
    adult: "data/calibration/adult_life_1992_2025.json",
    adultEvents: "data/adult_life_events.json",
    adultJobs: "data/adult_job_catalog.json",
  };
  return Object.fromEntries(Object.entries(dataFiles).map(([key, relative]) => [
    key,
    JSON.parse(fs.readFileSync(path.join(projectRoot, relative), "utf8")),
  ]));
}

function age6Session(data, { forcedEvent = null } = {}) {
  const { replayDebugToTarget } = globalThis.__AGE6_DEBUG_MODULES__;
  const replay = replayDebugToTarget(data, {
    seed: forcedEvent ? "game-p2-browser-forced-event" : "game-p2-browser-q1-q4",
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
  const session = structuredClone(replay.session);
  session.quarterCadenceProfile = "age6-1984-quarterly-v1";
  if (forcedEvent) {
    session.debug = {
      ...(session.debug ?? {}),
      randomEvents: {
        mode: "forced",
        forcedEventId: forcedEvent,
        activationYear: 1984,
        activationQuarter: 1,
      },
    };
  }
  return session;
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
    socket.setTimeout(500, () => finish(false));
  });
}

async function selectGamePort() {
  for (let candidate = preferredGamePort; candidate <= preferredGamePort + 10; candidate += 1) {
    if (!(await portOccupied(candidate))) return candidate;
  }
  throw new Error(`端口 ${preferredGamePort}-${preferredGamePort + 10} 均被占用；未终止任何未知进程。`);
}

async function waitForServer(url, child, output) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode != null) {
      throw new Error(`正式游戏 Vite 提前退出：${child.exitCode}\n${output()}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`等待正式游戏服务超时\n${output()}`);
}

function collectPageHealth(page) {
  const pageErrors = [];
  const consoleErrors = [];
  const requestFailures = [];
  const httpErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => requestFailures.push(
    `${request.method()} ${request.url()} · ${request.failure()?.errorText ?? "failed"}`,
  ));
  page.on("response", (response) => {
    if (response.status() >= 400) httpErrors.push(`${response.status()} ${response.url()}`);
  });
  return { pageErrors, consoleErrors, requestFailures, httpErrors };
}

async function installFixture(page, session, { reducedMotion = false, muted = false } = {}) {
  await page.addInitScript(({ savedSession, reduced, soundEnabled }) => {
    const marker = "people-life:game-p2-browser-initialized:v1";
    if (window.localStorage.getItem(marker) === "1") return;
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith("people-life:")) window.localStorage.removeItem(key);
    }
    window.localStorage.setItem("people-life:active:v5", JSON.stringify(savedSession));
    window.localStorage.setItem("people-life:presentation:v1", JSON.stringify({
      schemaVersion: 1,
      motionMode: reduced ? "reduced" : "full",
      soundEnabled,
      hapticEnabled: false,
    }));
    window.localStorage.setItem(marker, "1");
  }, { savedSession: session, reduced: reducedMotion, soundEnabled: !muted });
}

async function openGame(page) {
  await page.goto(gameUrl, { waitUntil: "networkidle" });
  const canvas = page.locator("#game-root canvas");
  await canvas.waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForFunction(() => Boolean(window.__PEOPLE_LIFE_GAME__?.getSnapshot));
  await enterFromMenu(page, canvas);
  await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.protocol === "p1-life-screen-v1", undefined, { timeout: 10_000 });
  await page.waitForTimeout(150);
  return canvas;
}

async function enterFromMenu(page, canvas) {
  await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.protocol === "game-main-menu-v2", undefined, { timeout: 10_000 });
  const menu = await page.evaluate(() => window.__PEOPLE_LIFE_GAME__.getUiDiagnostics());
  assert.equal(menu.continueAvailable, true, "正式 v5 fixture 必须在主菜单启用继续游戏");
  await canvas.click({ position: { x: 195, y: 640 } });
  await page.waitForFunction(() => {
    try {
      return window.__PEOPLE_LIFE_GAME__.getSnapshot().protocol === "game-runtime-snapshot-v2";
    } catch {
      return false;
    }
  }, undefined, { timeout: 10_000 });
}

async function assertViewport(page, canvas, label) {
  const dimensions = await canvas.evaluate((element) => ({
    width: element.width,
    height: element.height,
    clientWidth: element.clientWidth,
    clientHeight: element.clientHeight,
  }));
  assert.equal(dimensions.width, 390, `${label} 逻辑画布宽度必须为390`);
  assert.equal(dimensions.height, 844, `${label} 逻辑画布高度必须为844`);
  assert.ok(dimensions.clientWidth <= await page.evaluate(() => window.innerWidth), `${label} 画布横向溢出`);
  assert.ok(dimensions.clientHeight <= await page.evaluate(() => window.innerHeight), `${label} 画布纵向溢出`);
  const overflow = await page.evaluate(() => ({
    horizontal: document.documentElement.scrollWidth > window.innerWidth,
    vertical: document.documentElement.scrollHeight > window.innerHeight,
  }));
  assert.equal(overflow.horizontal, false, `${label} 页面横向溢出`);
  assert.equal(overflow.vertical, false, `${label} 页面纵向溢出`);
}

async function waitForScreen(page, screen) {
  await page.waitForFunction((expected) => window.__PEOPLE_LIFE_GAME__?.getSnapshot()?.screen === expected, screen, { timeout: 15_000 });
}

async function snapshot(page) {
  return page.evaluate(() => window.__PEOPLE_LIFE_GAME__.getSnapshot());
}

async function chooseTwoModules(page) {
  const selection = await page.evaluate(() => {
    const bridge = window.__PEOPLE_LIFE_GAME__;
    const clear = () => {
      for (const allocation of [...bridge.getSnapshot().allocations]) {
        bridge.dispatch({ type: "action.toggle", actionId: allocation.id });
      }
    };
    const initial = bridge.getSnapshot();
    const candidates = initial.actionOptions.filter((action) => action.available);
    for (const first of candidates) {
      bridge.dispatch({ type: "module.open", moduleId: first.moduleId });
      bridge.dispatch({ type: "action.toggle", actionId: first.id });
      if (!bridge.getSnapshot().allocations.some((entry) => entry.id === first.id)) continue;
      for (const second of candidates) {
        if (second.id === first.id || second.moduleId === first.moduleId) continue;
        const currentOption = bridge.getSnapshot().actionOptions.find((action) => action.id === second.id);
        if (!currentOption?.available) continue;
        bridge.dispatch({ type: "module.open", moduleId: second.moduleId });
        bridge.dispatch({ type: "action.toggle", actionId: second.id });
        const next = bridge.getSnapshot();
        const modules = [...new Set(next.allocations.map((entry) => entry.moduleId))];
        if (next.allocations.length >= 2 && modules.length >= 2 && next.advanceEnabled) {
          return {
            actionIds: next.allocations.map((entry) => entry.id),
            moduleIds: modules,
            resources: next.resources,
          };
        }
        clear();
        bridge.dispatch({ type: "module.open", moduleId: first.moduleId });
        bridge.dispatch({ type: "action.toggle", actionId: first.id });
      }
      clear();
    }
    return null;
  });
  assert.ok(selection, "每季必须能安排至少两项、且来自两个不同模块");
  assert.ok(selection.actionIds.length >= 2);
  assert.ok(selection.moduleIds.length >= 2);
  return selection;
}

async function screenshot(page, name) {
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(screenshotDirectory, name), fullPage: false });
}

async function selectFirstEventOption(page) {
  await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.protocol === "game-p2-event-v1", undefined, { timeout: 5_000 });
  const event = await snapshot(page);
  assert.equal(event.screen, "event");
  assert.ok(event.event?.eventId, "事件必须有稳定 eventId");
  assert.ok(event.event?.title, "事件必须有标题");
  assert.ok(event.event?.monthInQuarter >= 1 && event.event?.monthInQuarter <= 3, "事件必须标记发生月份");
  assert.ok((event.event?.options?.length ?? 0) >= 2, "事件至少需要两个可选回应");
  const option = event.event.options.find((entry) => entry.id);
  assert.ok(option, "事件必须有可选项");
  await page.locator("#game-root canvas").click({ position: { x: 195, y: 410 } });
  return { eventId: event.event.eventId, optionId: option.id, monthInQuarter: event.event.monthInQuarter };
}

async function completeQuarter(page, quarter, { takeScreenshots = false, screenshotState = {} } = {}) {
  const before = await snapshot(page);
  assert.equal(before.screen, "life", `Q${quarter} 必须从 life 屏开始`);
  assert.equal(before.calendarYear, 1984);
  assert.equal(before.age, 6);
  assert.equal(before.quarter, quarter);
  const selection = await chooseTwoModules(page);
  const planned = await snapshot(page);
  assert.equal(planned.allocations.length >= 2, true);
  assert.equal(new Set(planned.allocations.map((entry) => entry.moduleId)).size >= 2, true);
  await page.evaluate(() => window.__PEOPLE_LIFE_GAME__.dispatch({ type: "quarter.advance" }));
  try {
    await page.waitForFunction(() => {
      const screen = window.__PEOPLE_LIFE_GAME__?.getSnapshot()?.screen;
      return screen !== "life";
    }, undefined, { timeout: 15_000 });
  } catch (error) {
    const stalled = await snapshot(page);
    throw new Error(`Q${quarter} 提交后仍停留在 ${stalled.screen}（当前 ${stalled.calendarYear}/Q${stalled.quarter}，advanceEnabled=${stalled.advanceEnabled}，allocations=${stalled.allocations.length}，pending=${stalled.core?.pendingKind ?? "无"}/${stalled.core?.pendingEventId ?? "无"}，resourceBlockReason=${stalled.resourceBlockReason ?? "无"}）`, { cause: error });
  }

  let eventChoice = null;
  if ((await snapshot(page)).screen === "event") {
    if (takeScreenshots && !screenshotState.event) {
      await screenshot(page, "game-p2-event-390x844.png");
      screenshotState.event = true;
    }
    eventChoice = await selectFirstEventOption(page);
  }
  try {
    await waitForScreen(page, "quarter-execution");
  } catch (error) {
    const stalled = await snapshot(page);
    const ui = await page.evaluate(() => window.__PEOPLE_LIFE_GAME__.getUiDiagnostics());
    throw new Error(`Q${quarter} 未观察到 quarter-execution，当前 screen=${stalled.screen}，ui=${ui?.protocol ?? "无"}，eventChoice=${eventChoice?.optionId ?? "无"}`, { cause: error });
  }
  const execution = await snapshot(page);
  assert.equal(execution.quarterExecution?.quarter, quarter);
  assert.equal(execution.quarterExecution?.months?.length, 3, `Q${quarter} 必须有三个月 tick`);
  if (takeScreenshots && !screenshotState.execution) {
    await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics()?.visibleMonthCount === 3);
    await screenshot(page, "game-p2-execution-390x844.png");
    screenshotState.execution = true;
  }
  await page.evaluate(() => window.__PEOPLE_LIFE_GAME__.dispatch({ type: "quarter.execution.skip" }));
  await waitForScreen(page, "quarter-result");
  const result = await snapshot(page);
  assert.equal(result.quarterResult?.quarter, quarter);
  assert.equal(result.quarterExecution?.months?.length, 3, `Q${quarter} 结果仍须保留三个月事实`);
  if (takeScreenshots && !screenshotState.result) {
    await screenshot(page, "game-p2-result-390x844.png");
    screenshotState.result = true;
  }
  const resultBeforeReload = JSON.stringify({
    screen: result.screen,
    key: result.quarterResult?.key,
    quarter: result.quarterResult?.quarter,
    activities: result.quarterResult?.activityIds,
    months: result.quarterExecution?.months,
  });
  await page.reload({ waitUntil: "networkidle" });
  const reloadedCanvas = page.locator("#game-root canvas");
  await reloadedCanvas.waitFor({ state: "visible", timeout: 30_000 });
  await enterFromMenu(page, reloadedCanvas);
  await waitForScreen(page, "quarter-result");
  const resultAfterReload = await snapshot(page);
  assert.equal(JSON.stringify({
    screen: resultAfterReload.screen,
    key: resultAfterReload.quarterResult?.key,
    quarter: resultAfterReload.quarterResult?.quarter,
    activities: resultAfterReload.quarterResult?.activityIds,
    months: resultAfterReload.quarterExecution?.months,
  }), resultBeforeReload, `Q${quarter} 结果刷新后不得改变`);
  await page.evaluate(() => window.__PEOPLE_LIFE_GAME__.dispatch({ type: "quarter.result.continue" }));
  return { selection, eventChoice, result: resultAfterReload };
}

async function runResourceShortage(page) {
  const canvas = await openGame(page);
  await assertViewport(page, canvas, "资源不足路径");
  const outcome = await page.evaluate(() => {
    const bridge = window.__PEOPLE_LIFE_GAME__;
    const initial = bridge.getSnapshot();
    const candidates = initial.actionOptions.filter((action) => action.available);
    let blocked = null;
    for (const action of candidates) {
      if (bridge.getSnapshot().allocations.some((entry) => entry.id === action.id)) continue;
      bridge.dispatch({ type: "module.open", moduleId: action.moduleId });
      bridge.dispatch({ type: "action.toggle", actionId: action.id });
      const next = bridge.getSnapshot();
      blocked = next.actionOptions.find((entry) => !entry.available && /时间|精力|现金/.test(entry.unavailableReason ?? ""));
      if (blocked) return {
        allocations: next.allocations.map((entry) => entry.id),
        blocked: { id: blocked.id, reason: blocked.unavailableReason },
        resourceBlockReason: next.resourceBlockReason,
      };
    }
    return { allocations: bridge.getSnapshot().allocations.map((entry) => entry.id), blocked: null, resourceBlockReason: bridge.getSnapshot().resourceBlockReason };
  });
  assert.ok(outcome.blocked || outcome.resourceBlockReason, "必须真实进入资源不足/不可安排路径");
  assert.ok(outcome.allocations.length >= 1, "资源不足路径应保留已安排行动供玩家调整");
  await screenshot(page, "game-p2-resource-blocked-390x844.png");
  const recovered = await page.evaluate(() => {
    const bridge = window.__PEOPLE_LIFE_GAME__;
    const first = bridge.getSnapshot().allocations[0];
    if (first) bridge.dispatch({ type: "action.toggle", actionId: first.id });
    const next = bridge.getSnapshot();
    return { allocationCount: next.allocations.length, resourceBlockReason: next.resourceBlockReason };
  });
  assert.equal(recovered.resourceBlockReason, null, "取消行动后资源不足状态必须能恢复");
  return { blocked: outcome.blocked, recovered };
}

async function runForcedEvent(page, session) {
  const health = collectPageHealth(page);
  await installFixture(page, session);
  const canvas = await openGame(page);
  await assertViewport(page, canvas, "强制事件路径");
  await chooseTwoModules(page);
  await page.evaluate(() => window.__PEOPLE_LIFE_GAME__.dispatch({ type: "quarter.advance" }));
  await waitForScreen(page, "event");
  const eventBefore = await snapshot(page);
  assert.equal(eventBefore.event?.eventTemplateId, "rainy_day_inside");
  assert.ok(eventBefore.event.title && eventBefore.event.monthInQuarter >= 1 && eventBefore.event.monthInQuarter <= 3);
  assert.ok(eventBefore.event.options.length >= 2);
  await screenshot(page, "game-p2-event-390x844.png");
  const choice = await selectFirstEventOption(page);
  await waitForScreen(page, "quarter-execution");
  const debugBeforeReload = await page.evaluate(() => JSON.parse(localStorage.getItem("people-life:active:v5") ?? "null")?.debug?.randomEvents);
  assert.equal(debugBeforeReload?.forcedEventId, "rainy_day_inside", "正式 v5 强制事件 fixture 必须保留 debug.randomEvents");
  await page.reload({ waitUntil: "networkidle" });
  const reloadedCanvas = page.locator("#game-root canvas");
  await reloadedCanvas.waitFor({ state: "visible", timeout: 30_000 });
  await enterFromMenu(page, reloadedCanvas);
  await waitForScreen(page, "quarter-execution");
  const execution = await snapshot(page);
  assert.equal(execution.quarterExecution?.months?.length, 3);
  await page.evaluate(() => window.__PEOPLE_LIFE_GAME__.dispatch({ type: "quarter.execution.skip" }));
  await waitForScreen(page, "quarter-result");
  const result = await snapshot(page);
  assert.equal(result.quarterResult?.planInterruption?.eventId, "rainy_day_inside");
  assert.equal(result.quarterResult?.planInterruption?.selectedOptionId, choice.optionId);
  assert.ok(result.quarterResult?.randomEventResults?.some((entry) => entry.selectedOptionId === choice.optionId));
  assert.deepEqual(health.pageErrors, [], `强制事件 pageerror：${health.pageErrors.join(" | ")}`);
  assert.deepEqual(health.consoleErrors, [], `强制事件 console error：${health.consoleErrors.join(" | ")}`);
  assert.deepEqual(health.requestFailures, [], `强制事件 request failed：${health.requestFailures.join(" | ")}`);
  assert.deepEqual(health.httpErrors, [], `强制事件 HTTP error：${health.httpErrors.join(" | ")}`);
  return { eventBefore, choice, result };
}

async function runDesktopReduced(page, session) {
  const health = collectPageHealth(page);
  await installFixture(page, session, { reducedMotion: true, muted: true });
  const canvas = await openGame(page);
  await assertViewport(page, canvas, "1280x900 reduced motion");
  const initial = await snapshot(page);
  assert.equal(initial.screen, "life");
  const ui = await page.evaluate(() => window.__PEOPLE_LIFE_GAME__.getUiDiagnostics());
  assert.equal(ui.reducedMotion, true, "reduced motion 必须进入正式画布偏好");
  const presentation = await page.evaluate(() => JSON.parse(localStorage.getItem("people-life:presentation:v1") ?? "null"));
  assert.equal(presentation.motionMode, "reduced");
  assert.equal(presentation.soundEnabled, false);
  await screenshot(page, "game-p2-desktop-reduced-1280x900.png");
  await chooseTwoModules(page);
  await page.evaluate(() => window.__PEOPLE_LIFE_GAME__.dispatch({ type: "quarter.advance" }));
  await page.waitForFunction(() => ["event", "quarter-execution", "quarter-result"].includes(window.__PEOPLE_LIFE_GAME__?.getSnapshot()?.screen));
  if ((await snapshot(page)).screen === "event") await selectFirstEventOption(page);
  await waitForScreen(page, "quarter-execution");
  await waitForScreen(page, "quarter-result");
  assert.deepEqual(health.pageErrors, [], `1280x900 pageerror：${health.pageErrors.join(" | ")}`);
  assert.deepEqual(health.consoleErrors, [], `1280x900 console error：${health.consoleErrors.join(" | ")}`);
  assert.deepEqual(health.requestFailures, [], `1280x900 request failed：${health.requestFailures.join(" | ")}`);
  assert.deepEqual(health.httpErrors, [], `1280x900 HTTP error：${health.httpErrors.join(" | ")}`);
}

async function runMainYear(page, session) {
  const health = collectPageHealth(page);
  await installFixture(page, session);
  const canvas = await openGame(page);
  await assertViewport(page, canvas, "390x844 Q1-Q4");
  const initial = await snapshot(page);
  assert.equal(initial.protocol, "game-runtime-snapshot-v2");
  assert.equal(initial.calendarYear, 1984);
  assert.equal(initial.age, 6);
  assert.equal(initial.quarter, 1);
  assert.equal(initial.modules.length, 5);
  await screenshot(page, "game-p2-initial-390x844.png");
  const screenshotState = { event: false, execution: false, result: false };
  const quarterResults = [];
  const selections = [];
  for (let quarter = 1; quarter <= 4; quarter += 1) {
    const outcome = await completeQuarter(page, quarter, { takeScreenshots: true, screenshotState });
    quarterResults.push(outcome.result);
    selections.push(outcome.selection);
    if (quarter < 4) {
      await waitForScreen(page, "life");
      const next = await snapshot(page);
      assert.equal(next.quarter, quarter + 1, `Q${quarter} 后必须进入 Q${quarter + 1}`);
      assert.equal(next.age, 6);
    }
  }
  await waitForScreen(page, "year-review");
  const reviewBeforeReload = await snapshot(page);
  assert.equal(reviewBeforeReload.yearReview?.quarterSummary?.length, 4, "年度回望必须汇总四季度");
  assert.deepEqual(reviewBeforeReload.yearReview.quarterSummary.map((entry) => entry.quarter), [1, 2, 3, 4]);
  await screenshot(page, "game-p2-year-review-390x844.png");
  const reviewKey = JSON.stringify({ screen: reviewBeforeReload.screen, eventId: reviewBeforeReload.yearReview.eventId, nextAge: reviewBeforeReload.yearReview.nextAge, quarters: reviewBeforeReload.yearReview.quarterSummary });
  await page.reload({ waitUntil: "networkidle" });
  const reviewReloadCanvas = page.locator("#game-root canvas");
  await reviewReloadCanvas.waitFor({ state: "visible", timeout: 30_000 });
  await enterFromMenu(page, reviewReloadCanvas);
  await waitForScreen(page, "year-review");
  const reviewAfterReload = await snapshot(page);
  assert.equal(JSON.stringify({ screen: reviewAfterReload.screen, eventId: reviewAfterReload.yearReview.eventId, nextAge: reviewAfterReload.yearReview.nextAge, quarters: reviewAfterReload.yearReview.quarterSummary }), reviewKey, "年度回望刷新后不得改变");
  await page.evaluate(() => window.__PEOPLE_LIFE_GAME__.dispatch({ type: "year.confirm", eventId: window.__PEOPLE_LIFE_GAME__.getSnapshot().yearReview.eventId }));
  await waitForScreen(page, "age-entry");
  const ageEntryBeforeReload = await snapshot(page);
  assert.equal(ageEntryBeforeReload.ageEntry?.from.age, 6);
  assert.equal(ageEntryBeforeReload.ageEntry?.to.age, 7);
  assert.equal(ageEntryBeforeReload.age, 7, "确认年度回望后年龄必须变为7");
  await screenshot(page, "game-p2-age7-390x844.png");
  await page.reload({ waitUntil: "networkidle" });
  const ageReloadCanvas = page.locator("#game-root canvas");
  await ageReloadCanvas.waitFor({ state: "visible", timeout: 30_000 });
  await enterFromMenu(page, ageReloadCanvas);
  await waitForScreen(page, "age-entry");
  const ageEntryAfterReload = await snapshot(page);
  assert.equal(ageEntryAfterReload.ageEntry?.key, ageEntryBeforeReload.ageEntry?.key, "确认后刷新不得丢失7岁入口");
  await page.evaluate(() => window.__PEOPLE_LIFE_GAME__.dispatch({ type: "age-entry.continue" }));
  await waitForScreen(page, "life");
  const age7 = await snapshot(page);
  assert.equal(age7.age, 7);
  assert.equal(age7.calendarYear, 1985);
  assert.equal(age7.screen, "life");
  assert.equal(age7.records?.quarters?.length, 4, "记录数据必须保留1984四季度事实");
  assert.ok((age7.records?.people?.length ?? 0) >= 3, "记录数据必须保留至少3个持续人物/照看者");
  await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics?.()?.protocol === "p1-life-screen-v1", undefined, { timeout: 5_000 });
  const lifeCanvas = page.locator("#game-root canvas");
  await lifeCanvas.click({ position: { x: 62, y: 260 } });
  await waitForScreen(page, "records");
  const recordsDiagnostics = await page.evaluate(() => window.__PEOPLE_LIFE_GAME__.getUiDiagnostics());
  assert.equal(recordsDiagnostics.protocol, "game-p2-records-v1");
  assert.equal(recordsDiagnostics.quarterCount, 4);
  assert.equal(recordsDiagnostics.selectedQuarter, 4);
  assert.equal(recordsDiagnostics.monthCount, 3);
  assert.ok(recordsDiagnostics.peopleCount >= 3);
  await screenshot(page, "game-p2-records-390x844.png");
  await lifeCanvas.click({ position: { x: 146, y: 118 } });
  await page.waitForFunction(() => window.__PEOPLE_LIFE_GAME__?.getUiDiagnostics()?.selectedQuarter === 2);
  const q2RecordsDiagnostics = await page.evaluate(() => window.__PEOPLE_LIFE_GAME__.getUiDiagnostics());
  assert.equal(q2RecordsDiagnostics.monthCount, 3, "记录页 Q2 必须能展开三个月事实");
  await lifeCanvas.click({ position: { x: 355, y: 32 } });
  await waitForScreen(page, "life");
  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem("people-life:active:v5") ?? "null"));
  assert.equal(persisted?.schemaVersion, 5);
  assert.equal(persisted?.quarterCadenceProfile, "age6-1984-quarterly-v1");
  const planKeys = Object.keys(persisted?.quarterPlans ?? {}).filter((key) => /^quarter:1984:Q[1-4]$/.test(key)).sort();
  assert.deepEqual(planKeys, ["quarter:1984:Q1", "quarter:1984:Q2", "quarter:1984:Q3", "quarter:1984:Q4"]);
  for (const selection of selections) {
    assert.ok(selection.actionIds.length >= 2);
    assert.ok(selection.moduleIds.length >= 2);
  }
  assert.equal(screenshotState.execution, true, "必须生成季度执行截图");
  assert.equal(screenshotState.result, true, "必须生成季度结果截图");
  assert.deepEqual(health.pageErrors, [], `390x844 Q1-Q4 pageerror：${health.pageErrors.join(" | ")}`);
  assert.deepEqual(health.consoleErrors, [], `390x844 Q1-Q4 console error：${health.consoleErrors.join(" | ")}`);
  assert.deepEqual(health.requestFailures, [], `390x844 Q1-Q4 request failed：${health.requestFailures.join(" | ")}`);
  assert.deepEqual(health.httpErrors, [], `390x844 Q1-Q4 HTTP error：${health.httpErrors.join(" | ")}`);
  return { initial, quarterResults, age7, planKeys, recordsDiagnostics };
}

async function main() {
  assert.ok(fs.existsSync(viteBin), "未安装 Vite，无法运行 P2 Chrome 检查");
  gamePort = await selectGamePort();
  gameUrl = `http://127.0.0.1:${gamePort}/`;
  fs.mkdirSync(screenshotDirectory, { recursive: true });
  const [{ replayDebugToTarget }] = await Promise.all([import("../src/game/debug-tools.mjs")]);
  globalThis.__AGE6_DEBUG_MODULES__ = { replayDebugToTarget };
  const data = readDataPack();
  const normalSession = age6Session(data);
  const forcedSession = age6Session(data, { forcedEvent: "rainy_day_inside" });
  const server = spawn(process.execPath, [viteBin, "--config", "apps/game/vite.config.ts", "--port", String(gamePort), "--strictPort"], {
    cwd: projectRoot,
    env: { ...process.env, NO_COLOR: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverOutput = "";
  server.stdout.on("data", (chunk) => { serverOutput += String(chunk); });
  server.stderr.on("data", (chunk) => { serverOutput += String(chunk); });
  let browser;
  const contexts = [];
  try {
    await waitForServer(gameUrl, server, () => serverOutput);
    const { chromium } = await loadPlaywright();
    browser = await chromium.launch({ headless: true, executablePath: chromeExecutable() });

    const phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    contexts.push(phoneContext);
    const phonePage = await phoneContext.newPage();
    const mainResult = await runMainYear(phonePage, normalSession);

    const resourceContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    contexts.push(resourceContext);
    const resourcePage = await resourceContext.newPage();
    await installFixture(resourcePage, normalSession);
    const resourceResult = await runResourceShortage(resourcePage);

    const eventContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    contexts.push(eventContext);
    const eventPage = await eventContext.newPage();
    const forcedResult = await runForcedEvent(eventPage, forcedSession);

    const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    contexts.push(desktopContext);
    const desktopPage = await desktopContext.newPage();
    await desktopPage.emulateMedia({ reducedMotion: "reduce" });
    await runDesktopReduced(desktopPage, normalSession);

    console.log(JSON.stringify({
      ok: true,
      browser: "Google Chrome",
      server: gameUrl,
      viewports: ["390x844", "1280x900"],
      q1ToQ4: {
        quarterPlans: mainResult.planKeys,
        quarterResults: mainResult.quarterResults.map((result) => ({ quarter: result.quarterResult.quarter, monthTicks: result.quarterExecution.months.length })),
        age7: { year: mainResult.age7.calendarYear, age: mainResult.age7.age },
      },
      resourceShortage: resourceResult,
      forcedEvent: {
        eventId: forcedResult.eventBefore.event.eventTemplateId,
        monthInQuarter: forcedResult.eventBefore.event.monthInQuarter,
        selectedOptionId: forcedResult.choice.optionId,
        planInterruption: forcedResult.result.quarterResult.planInterruption,
      },
      screenshots: [
        "game-p2-initial-390x844.png",
        "game-p2-event-390x844.png",
        "game-p2-execution-390x844.png",
        "game-p2-result-390x844.png",
        "game-p2-year-review-390x844.png",
        "game-p2-age7-390x844.png",
        "game-p2-records-390x844.png",
        "game-p2-resource-blocked-390x844.png",
        "game-p2-desktop-reduced-1280x900.png",
      ],
      checks: [
        "formal_v5_age6_fixture_without_debug_query",
        "q1_q2_q3_q4_two_actions_from_two_modules",
        "three_month_ticks_each_quarter",
        "event_before_choice_reload_and_plan_interruption",
        "quarter_result_reload",
        "year_review_reload",
        "year_confirm_reload_and_age7_entry",
        "records_scene_q1_to_q4_three_month_facts",
        "session_quarterPlans_q1_to_q4",
        "resource_shortage_and_recovery",
        "reduced_motion_muted",
        "390x844_and_1280x900_no_overflow_pageerror_console_or_request_failure",
      ],
    }, null, 2));
  } catch (error) {
    if (error instanceof Error) error.message += `\nVite output:\n${serverOutput}`;
    throw error;
  } finally {
    for (const context of contexts.reverse()) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    if (server.exitCode == null) server.kill();
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
}
