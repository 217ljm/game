import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createGameServer } from "./serve-game.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactDir = path.join(projectRoot, "artifacts", "ui-regression");
fs.mkdirSync(artifactDir, { recursive: true });

async function loadPlaywright() {
  try { return await import("playwright"); } catch {
    const candidates = [process.env.PEOPLE_LIFE_PLAYWRIGHT_PATH, path.join(os.homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright", "index.mjs")].filter(Boolean);
    const modulePath = candidates.find((candidate) => fs.existsSync(candidate));
    if (!modulePath) throw new Error("未找到 Playwright；可通过 PEOPLE_LIFE_PLAYWRIGHT_PATH 指定 index.mjs");
    return import(pathToFileURL(modulePath).href);
  }
}

function browserExecutable() {
  const candidates = [process.env.PEOPLE_LIFE_BROWSER_PATH, "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"].filter(Boolean);
  const executable = candidates.find((candidate) => fs.existsSync(candidate));
  if (!executable) throw new Error("未找到 Edge 或 Chrome；可通过 PEOPLE_LIFE_BROWSER_PATH 指定浏览器");
  return executable;
}

const ENTRY = "/public/light-scene/";
const CHECKPOINT_KEY = "people-life:light-scene:yard-1984:v1";
const TOTAL_SLOTS = 9;
const report = { ok: true, entry: ENTRY, viewports: [], motionModes: [], eventChoices: [], setTable: null, blockers: [], screenshots: [] };

function summary(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;
  return {
    stageId: snapshot.stageId ?? snapshot.runtimeState?.stageId ?? null,
    focusedNodeId: snapshot.focusedNodeId ?? snapshot.runtimeState?.focusedNodeId ?? null,
    usedTimeSlots: snapshot.usedTimeSlots ?? snapshot.runtimeState?.usedTimeSlots ?? null,
    completedActionIds: [...(snapshot.completedActionIds ?? snapshot.runtimeState?.completedActionIds ?? [])],
    eventChoiceIds: [...(snapshot.eventChoiceIds ?? snapshot.runtimeState?.eventChoiceIds ?? [])],
    actorStates: snapshot.actorStates ?? snapshot.runtimeState?.actorStates ?? {},
    propStates: snapshot.propStates ?? snapshot.runtimeState?.propStates ?? {},
    commandJournal: snapshot.commandJournal ?? snapshot.journal ?? [],
    eventTriggered: snapshot.eventTriggered === true,
    eventResolved: snapshot.eventResolved === true,
    motionMode: snapshot.motion?.mode ?? snapshot.motionMode ?? null,
  };
}

async function readRuntime(page) {
  return page.evaluate(async () => {
    const api = globalThis.__LIGHT_SCENE_RUNTIME__;
    if (!api) return null;
    let value;
    if (typeof api.getSnapshot === "function") value = await api.getSnapshot();
    else if (typeof api.snapshot === "function") value = await api.snapshot();
    else if (typeof api.getState === "function") value = await api.getState();
    else value = api.snapshot ?? api.state ?? api;
    return value && typeof value === "object" ? value : null;
  });
}

async function waitForRuntime(page, predicate, label, timeout = 7000) {
  const deadline = Date.now() + timeout;
  let last = null;
  while (Date.now() < deadline) {
    last = summary(await readRuntime(page));
    if (last && predicate(last)) return last;
    await page.waitForTimeout(25);
  }
  throw new Error(`等待运行时状态超时：${label}；最近状态=${JSON.stringify(last)}`);
}

async function waitForStableVisual(page, predicate, label, timeout = 7000) {
  const deadline = Date.now() + timeout;
  let previous = null;
  let last = null;
  while (Date.now() < deadline) {
    last = await page.evaluate(() => ({
      animations: document.getAnimations().filter((animation) => ["running", "pending"].includes(animation.playState)).length,
      speechVisible: document.querySelector(".scene-speech")?.getAttribute("data-visible") === "true",
      speechText: document.querySelector("[data-speech-text]")?.textContent ?? "",
      eventVisible: document.querySelector("[data-event-layer]")?.getAttribute("data-visible") === "true",
      stage: document.querySelector("[data-light-scene-stage-shell]")?.getAttribute("data-scene-state") ?? "",
      time: document.querySelector(".time-copy strong")?.textContent ?? "",
      used: document.querySelectorAll(".time-slots i.used").length,
    }));
    if (predicate(last) && last.animations === 0) {
      const signature = JSON.stringify(last);
      if (signature === previous) return last;
      previous = signature;
    } else previous = null;
    await page.waitForTimeout(25);
  }
  throw new Error(`等待演出稳定超时：${label}；最近DOM=${JSON.stringify(last)}`);
}

async function waitForReady(page, label, expectedStage = "gate") {
  await page.locator("[data-light-scene-stage-shell][data-ready=true]").waitFor({ state: "visible", timeout: 7000 });
  const expected = expectedStage ?? (await waitForRuntime(page, (state) => Boolean(state.stageId), `${label} 运行时`)).stageId;
  await waitForRuntime(page, (state) => state.stageId === expected, `${label} 运行时`);
  await waitForStableVisual(page, (dom) => dom.stage === expected, `${label} 稳定`);
}

function visibleStageSelector(stageId) { return `.stage-layer[data-stage-id="${stageId}"][aria-hidden="false"]`; }

async function assertLayout(page, label) {
  const layout = await page.evaluate(() => ({
    viewport: { width: window.innerWidth, height: window.innerHeight },
    htmlHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    htmlVerticalOverflow: document.documentElement.scrollHeight > window.innerHeight,
    bodyHorizontalOverflow: document.body.scrollWidth > window.innerWidth,
    bodyVerticalOverflow: document.body.scrollHeight > window.innerHeight,
    stageVisible: Boolean(document.querySelector("[data-light-scene-stage-shell]")),
    actionBarVisible: Boolean(document.querySelector("[data-context-action-bar]")),
  }));
  assert.equal(layout.htmlHorizontalOverflow, false, `${label}: html 横向溢出`);
  assert.equal(layout.bodyHorizontalOverflow, false, `${label}: body 横向溢出`);
  assert.equal(layout.htmlVerticalOverflow, false, `${label}: html 纵向溢出`);
  assert.equal(layout.bodyVerticalOverflow, false, `${label}: body 纵向溢出`);
  assert.equal(layout.stageVisible, true, `${label}: 主舞台不可见`);
  assert.equal(layout.actionBarVisible, true, `${label}: 动作条不可见`);
  return layout;
}

async function bootPage(browser, port, viewport, label) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
  page.on("requestfailed", (request) => errors.push(`requestfailed: ${request.url()} ${request.failure()?.errorText ?? ""}`));
  page.on("response", (response) => { if (response.status() >= 400) errors.push(`http ${response.status()}: ${response.url()}`); });
  await page.goto(`http://127.0.0.1:${port}${ENTRY}`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  try { await waitForReady(page, label); } catch (error) { report.blockers.push({ label, reason: error.message }); }
  if (errors.length) report.blockers.push({ label, runtime: [...new Set(errors)] });
  return { context, page, errors };
}

async function screenshot(page, name) {
  const target = path.join(artifactDir, `light-scene-g1-${name}.png`);
  await page.screenshot({ path: target, fullPage: true });
  report.screenshots.push(target);
}

async function domState(page) {
  return page.evaluate(() => ({
    actors: [...document.querySelectorAll("[data-character-id]")].map((element) => ({ id: element.dataset.characterId, pose: element.dataset.pose ?? "" })),
    props: [...document.querySelectorAll("[data-scene-node]")].map((element) => ({ id: element.dataset.nodeId, state: element.dataset.state ?? "" })),
    speech: { visible: document.querySelector(".scene-speech")?.getAttribute("data-visible") === "true", text: document.querySelector("[data-speech-text]")?.textContent ?? "" },
  }));
}

function attrsFor(items, id, key) { return items.filter((item) => item.id === id).map((item) => item[key]).sort(); }

function assertDomStateMap(pageState, runtimeState, label) {
  for (const id of Object.keys(runtimeState.actorStates)) assert.ok(pageState.actors.some((item) => item.id === id), `${label}: actorStates ${id} 没有对应 DOM`);
  for (const id of Object.keys(runtimeState.propStates)) assert.ok(pageState.props.some((item) => item.id === id), `${label}: propStates ${id} 没有对应 DOM`);
}

function assertDomChanged(before, after, { actorId = "player_child", propId, npcId }, label) {
  assert.notDeepEqual(attrsFor(after.actors, actorId, "pose"), attrsFor(before.actors, actorId, "pose"), `${label}: 主角 data-pose 操作前后未变化`);
  assert.notDeepEqual(attrsFor(after.props, propId, "state"), attrsFor(before.props, propId, "state"), `${label}: 物件 ${propId} data-state 操作前后未变化`);
  assert.notDeepEqual(attrsFor(after.actors, npcId, "pose"), attrsFor(before.actors, npcId, "pose"), `${label}: NPC ${npcId} data-pose 操作前后未变化`);
}

async function assertTimeDom(page, state, label) {
  const expectedText = `放学后 ${Math.max(0, TOTAL_SLOTS - state.usedTimeSlots) * 5} 分钟`;
  await waitForStableVisual(page, (dom) => dom.time === expectedText && dom.used === state.usedTimeSlots, `${label} 时间和9格状态`);
  const time = await page.evaluate(() => ({ text: document.querySelector(".time-copy strong")?.textContent ?? "", used: document.querySelectorAll(".time-slots i.used").length, total: document.querySelectorAll(".time-slots i").length }));
  assert.equal(time.text, expectedText, `${label}: 时间文案与快照不一致`);
  assert.equal(time.used, state.usedTimeSlots, `${label}: used 格数与快照不一致`);
  assert.equal(time.total, TOTAL_SLOTS, `${label}: 时间格总数不为9`);
}

async function selectStage(page, stageId, label = stageId) {
  await page.locator(`.stage-tabs button[data-stage-id="${stageId}"]`).click();
  await page.locator(visibleStageSelector(stageId)).waitFor({ state: "visible" });
  await waitForRuntime(page, (state) => state.stageId === stageId, `${label} 舞台状态`);
  await waitForStableVisual(page, (dom) => dom.stage === stageId, `${label} 舞台演出稳定`);
}

async function focusNode(page, nodeId, label = nodeId) {
  await page.locator(`[data-scene-node][data-node-id="${nodeId}"]`).click();
  await waitForRuntime(page, (state) => state.focusedNodeId === nodeId, `${label} 聚焦`);
  await page.locator(`[data-scene-action][data-action-id]`).first().waitFor({ state: "visible" }).catch(() => {});
}

async function doAction(page, actionId, actionContext, label = actionId) {
  const before = summary(await readRuntime(page));
  const beforeDom = await domState(page);
  const button = page.locator(`[data-scene-action="action"][data-action-id="${actionId}"]`).first();
  await button.waitFor({ state: "visible" });
  assert.equal(await button.isDisabled(), false, `${label}: ${actionId} 不应被禁用`);
  await button.click();
  const after = await waitForRuntime(page, (state) => state.completedActionIds.includes(actionId), `${label} 完成 ${actionId}`);
  await waitForStableVisual(page, (dom) => dom.speechVisible && dom.speechText.length > 0, `${label} ${actionId} 演出稳定`);
  const afterDom = await domState(page);
  assert.ok(after.usedTimeSlots > before.usedTimeSlots, `${label}: ${actionId} 未消耗时间`);
  assert.equal(after.commandJournal.length, before.commandJournal.length + 1, `${label}: ${actionId} journal 未只增加一次`);
  assertDomChanged(beforeDom, afterDom, actionContext, `${label} ${actionId}`);
  assertDomStateMap(afterDom, after, `${label} ${actionId}`);
  await assertTimeDom(page, after, `${label} ${actionId}`);
  return { before, after, beforeDom, afterDom };
}

async function triggerMarbleEvent(page, label) {
  await page.locator("[data-event-layer][data-visible=true]").waitFor({ state: "visible" });
  await waitForStableVisual(page, (dom) => dom.eventVisible && dom.speechText.length > 0, `${label} 弹珠事件稳定`);
}

async function runMainFlow(page, label) {
  await assertLayout(page, `${label} 初始布局`);
  assert.equal(await page.locator("[data-main-stage]").count(), 3, `${label}: 应有3个舞台`);
  assert.equal(await page.locator("[data-scene-node]").count(), 9, `${label}: 应有9个节点`);
  assert.equal(await page.locator(".time-slots i").count(), 9, `${label}: 应有9格时间`);
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement?.matches("button,select,input,summary")), true, `${label}: 键盘首焦点不在可交互控件`);
  const initial = summary(await readRuntime(page));
  const initialDom = await domState(page);
  assert.ok(initial, `${label}: 缺少 window.__LIGHT_SCENE_RUNTIME__ 只读状态 API`);
  assert.equal(initial.stageId, "gate", `${label}: 初始舞台应为 gate`);
  assertDomStateMap(initialDom, initial, `${label} 初始`);
  await assertTimeDom(page, initial, `${label} 初始`);
  await screenshot(page, `${label}-initial`);

  await selectStage(page, "yard", `${label} 院中`);
  await focusNode(page, "partner", `${label} 伙伴`);
  const join = await doAction(page, "join_marbles", { propId: "marbles", npcId: "partner_xiaoyu" }, label);
  assert.equal(join.after.usedTimeSlots, 2, `${label}: 加入弹珠应使用2格`);
  assert.equal(join.after.eventTriggered, true, `${label}: 加入弹珠未触发事件标记`);
  await triggerMarbleEvent(page, label);
  await screenshot(page, `${label}-event`);

  const eventBefore = join.after;
  await page.locator("[data-event-choice=help_search]").click();
  const eventAfter = await waitForRuntime(page, (state) => state.eventChoiceIds.includes("help_search"), `${label} help_search`);
  await waitForStableVisual(page, (dom) => !dom.eventVisible && dom.speechText.length > 0, `${label} help_search 演出稳定`);
  assert.equal(eventAfter.usedTimeSlots, 3, `${label}: help_search 应再使用1格`);
  assert.equal(eventAfter.commandJournal.length, eventBefore.commandJournal.length + 1, `${label}: help_search journal 未只增加一次`);
  assert.equal(eventAfter.commandJournal.filter((entry) => entry.kind === "event-choice" && entry.choiceId === "help_search").length, 1, `${label}: help_search journal 重复记录`);
  await assertTimeDom(page, eventAfter, `${label} help_search`);

  await selectStage(page, "yard", `${label} 第二段院中`);
  await focusNode(page, "stone_table", `${label} 石桌`);
  const practice = await doAction(page, "practice_writing", { propId: "homework", npcId: "caregiver_mother" }, label);
  assert.equal(practice.after.usedTimeSlots, 6, `${label}: 练字后应使用6格`);
  await focusNode(page, "bicycle_shed", `${label} 车棚`);
  const inspect = await doAction(page, "inspect_bicycle", { propId: "bicycle_shed", npcId: "older_child_asha" }, label);
  assert.equal(inspect.after.usedTimeSlots, 8, `${label}: 四段行动后应使用8格`);

  await focusNode(page, "bicycle_shed", `${label} 重复车棚`);
  const repeatedBefore = summary(await readRuntime(page));
  const repeatedButton = page.locator("[data-scene-action=action][data-action-id=inspect_bicycle]");
  assert.equal(await repeatedButton.isDisabled(), true, `${label}: 重复行动没有拒绝/禁用`);
  assert.match(await repeatedButton.getAttribute("aria-disabled"), /true/, `${label}: 重复行动缺少 aria-disabled=true`);
  assert.match(await repeatedButton.textContent(), /已完成/, `${label}: 重复行动没有已完成反馈`);
  assert.deepEqual(summary(await readRuntime(page)), repeatedBefore, `${label}: 重复行动改变了快照`);
  await assertTimeDom(page, inspect.after, `${label} 最终`);
  await screenshot(page, `${label}-after-action`);

  const checkpointRaw = await page.evaluate((key) => localStorage.getItem(key), CHECKPOINT_KEY);
  assert.ok(checkpointRaw, `${label}: 未写入 checkpoint`);
  const checkpoint = JSON.parse(checkpointRaw);
  assert.equal(checkpoint.runtimeState.usedTimeSlots, 8, `${label}: checkpoint 未保存 used=8`);
  assert.deepEqual(checkpoint.runtimeState.completedActionIds, inspect.after.completedActionIds, `${label}: checkpoint action 与快照不一致`);
  assert.deepEqual(checkpoint.runtimeState.eventChoiceIds, inspect.after.eventChoiceIds, `${label}: checkpoint event 与快照不一致`);
  const recoveredExpected = summary(await readRuntime(page));
  await page.reload({ waitUntil: "networkidle" });
  await waitForReady(page, `${label} 合法 checkpoint 恢复`, null);
  const recovered = await waitForRuntime(page, (state) => state.completedActionIds.includes("inspect_bicycle") && state.usedTimeSlots === 8, `${label} 刷新恢复`);
  assert.deepEqual(recovered, recoveredExpected, `${label}: 刷新后 scene state 不一致`);
  await assertTimeDom(page, recovered, `${label} 恢复`);
  assert.equal(await page.locator("[data-light-scene-stage-shell]").getAttribute("data-scene-state"), recovered.stageId, `${label}: 恢复舞台 DOM 与快照不一致`);
  await screenshot(page, `${label}-recovered`);

  await page.evaluate((key) => localStorage.setItem(key, "{not-valid-json"), CHECKPOINT_KEY);
  await page.reload({ waitUntil: "networkidle" });
  await waitForReady(page, `${label} 损坏 checkpoint`);
  const degraded = await waitForRuntime(page, (state) => state.usedTimeSlots === 0 && state.completedActionIds.length === 0 && state.eventChoiceIds.length === 0, `${label} 损坏 checkpoint 降级`);
  assert.equal(degraded.stageId, "gate", `${label}: 损坏 checkpoint 未回退到初始舞台`);
  await assertTimeDom(page, degraded, `${label} 损坏降级`);
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: CHECKPOINT_KEY, value: checkpointRaw });
  await page.reload({ waitUntil: "networkidle" });
  await waitForReady(page, `${label} 再次恢复`, null);
  await waitForRuntime(page, (state) => state.usedTimeSlots === 8 && state.completedActionIds.includes("inspect_bicycle"), `${label} 恢复合法 checkpoint`);
  await selectStage(page, "home", `${label} 资源不足家中`);
  await focusNode(page, "bowls", `${label} 碗筷`);
  const setTable = page.locator("[data-scene-action=action][data-action-id=set_table]");
  assert.equal(await setTable.isDisabled(), true, `${label}: 8格时3格家务动作应禁用`);
  assert.match(await setTable.getAttribute("aria-disabled"), /true/, `${label}: 资源不足动作缺少 aria-disabled=true`);
  return { state: recovered, checkpoint };
}

async function runEventChoice(browser, port, choiceId) {
  const { context, page } = await bootPage(browser, port, { width: 390, height: 844 }, `event-${choiceId}`);
  try {
    await selectStage(page, "yard", `event-${choiceId} 院中`);
    await focusNode(page, "partner", `event-${choiceId} 伙伴`);
    await doAction(page, "join_marbles", { propId: "marbles", npcId: "partner_xiaoyu" }, `event-${choiceId}`);
    await triggerMarbleEvent(page, `event-${choiceId}`);
    const before = summary(await readRuntime(page));
    const choiceButton = page.locator(`[data-event-choice="${choiceId}"]`);
    assert.equal(await choiceButton.isDisabled(), false, `event-${choiceId}: 选择不可达`);
    await choiceButton.click();
    const expectedStage = choiceId === "go_home" ? "home" : "yard";
    await waitForRuntime(page, (state) => state.eventChoiceIds.includes(choiceId) && state.stageId === expectedStage, `event-${choiceId} 最终舞台`);
    await waitForStableVisual(page, (dom) => !dom.eventVisible && dom.stage === expectedStage && dom.speechVisible && dom.speechText.length > 0, `event-${choiceId} 反馈稳定`);
    // performChoice updates eventChoiceIds before its optional asynchronous
    // stage transition. Read again after the final-stage condition so reports
    // and assertions never use that intermediate (stale) snapshot.
    const after = summary(await readRuntime(page));
    assert.ok(after, `event-${choiceId}: 最终稳定 snapshot 缺失`);
    assert.equal(after.eventChoiceIds.length, 1, `event-${choiceId}: eventChoiceIds 不应重复`);
    assert.equal(after.commandJournal.filter((entry) => entry.kind === "event-choice" && entry.choiceId === choiceId).length, 1, `event-${choiceId}: journal 未只增加一次`);
    assert.equal(after.commandJournal.length, before.commandJournal.length + 1, `event-${choiceId}: journal 数量不符`);
    assert.equal(after.stageId, expectedStage, `event-${choiceId}: 目标舞台不符`);
    await assertTimeDom(page, after, `event-${choiceId}`);
    await screenshot(page, `mobile-event-${choiceId}`);
    report.eventChoices.push({ choiceId, ok: true, stageId: after.stageId, usedTimeSlots: after.usedTimeSlots });
  } catch (error) {
    report.ok = false;
    report.eventChoices.push({ choiceId, ok: false, error: error.message });
  } finally { await context.close(); }
}

async function runSetTable(browser, port) {
  const { context, page } = await bootPage(browser, port, { width: 390, height: 844 }, "set-table");
  try {
    await selectStage(page, "home", "set_table 家中");
    await focusNode(page, "bowls", "set_table 碗筷");
    const before = summary(await readRuntime(page));
    const beforeDom = await domState(page);
    const result = await doAction(page, "set_table", { propId: "bowls", npcId: "caregiver_mother" }, "set_table");
    assert.equal(result.after.usedTimeSlots, 3, "set_table: 应使用3格时间");
    assert.equal(result.after.completedActionIds.includes("set_table"), true, "set_table: 快照未完成");
    assert.equal(result.after.commandJournal.length, before.commandJournal.length + 1, "set_table: journal 未增加一次");
    assert.notDeepEqual(attrsFor(result.afterDom.props, "bowls", "state"), attrsFor(beforeDom.props, "bowls", "state"), "set_table: 碗筷 data-state 未变化");
    assert.notDeepEqual(attrsFor(result.afterDom.actors, "caregiver_mother", "pose"), attrsFor(beforeDom.actors, "caregiver_mother", "pose"), "set_table: 照护者 data-pose 未变化");
    await screenshot(page, "mobile-home-action");
    report.setTable = { ok: true, usedTimeSlots: result.after.usedTimeSlots, completedActionIds: result.after.completedActionIds };
  } catch (error) {
    report.ok = false;
    report.setTable = { ok: false, error: error.message };
  } finally { await context.close(); }
}

async function runMotionMode(browser, port, mode) {
  const { context, page } = await bootPage(browser, port, { width: 390, height: 844 }, `motion-${mode}`);
  try {
    await page.locator("#scene-motion-mode").selectOption(mode);
    await waitForRuntime(page, (state) => state.motionMode === mode, `motion-${mode} mode`);
    await selectStage(page, "yard", `motion-${mode} 院中`);
    await focusNode(page, "partner", `motion-${mode} 伙伴`);
    const before = summary(await readRuntime(page));
    const beforeDom = await domState(page);
    await page.locator("[data-scene-action=action][data-action-id=join_marbles]").click();
    await page.locator("#scene-skip").click();
    const after = await waitForRuntime(page, (state) => state.completedActionIds.includes("join_marbles"), `motion-${mode} join_marbles`);
    await waitForStableVisual(page, (dom) => dom.speechVisible && dom.speechText.length > 0, `motion-${mode} 反馈稳定`);
    const afterDom = await domState(page);
    assert.equal(after.commandJournal.length, before.commandJournal.length + 1, `motion-${mode}: skip 改写 journal`);
    assertDomChanged(beforeDom, afterDom, { propId: "marbles", npcId: "partner_xiaoyu" }, `motion-${mode}`);
    await assertTimeDom(page, after, `motion-${mode}`);
    report.motionModes.push({ mode, ok: true, usedTimeSlots: after.usedTimeSlots, journalLength: after.commandJournal.length });
  } catch (error) {
    report.ok = false;
    report.motionModes.push({ mode, ok: false, error: error.message });
  } finally { await context.close(); }
}

const server = createGameServer(projectRoot);
await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
const port = server.address().port;
let browser = null;
try {
  const { chromium } = await loadPlaywright();
  browser = await chromium.launch({ headless: true, executablePath: browserExecutable() });
  for (const [label, viewport] of [["mobile", { width: 390, height: 844 }], ["desktop", { width: 1280, height: 900 }]]) {
    const run = await bootPage(browser, port, viewport, label);
    try {
      const flow = await runMainFlow(run.page, label);
      report.viewports.push({ label, viewport, ok: true, finalState: flow.state, checkpointUsedTimeSlots: flow.checkpoint.runtimeState.usedTimeSlots });
    } catch (error) {
      report.ok = false;
      report.viewports.push({ label, viewport, ok: false, error: error.message });
    } finally { await run.context.close(); }
  }
  for (const choiceId of ["help_search", "ask_first", "go_home"]) await runEventChoice(browser, port, choiceId);
  await runSetTable(browser, port);
  for (const mode of ["full", "reduced", "off"]) await runMotionMode(browser, port, mode);
} catch (error) {
  report.ok = false;
  report.blockers.push({ code: "browser-launch", reason: error.message });
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

if (report.blockers.length) report.ok = false;
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
