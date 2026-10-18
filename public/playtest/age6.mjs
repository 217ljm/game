import { PRESENTATION_STORAGE_KEY } from "../../src/app/presentation-preferences.mjs";
import { replayDebugToTarget } from "../../src/game/debug-tools.mjs";
import { loadGameData } from "../../src/game/load-game-data.mjs";

const params = new URLSearchParams(location.search);
const status = document.querySelector("#status");
const batchId = params.get("batch") ?? "";
const participantId = params.get("participant") ?? "";
const draftCondition = params.get("draft") ?? "empty";
const eventCondition = params.get("event") ?? "natural";
const motionMode = params.get("motion") ?? "full";
const soundEnabled = params.get("sound") !== "off";
const expectedBuild = params.get("build") ?? "";
const allowedEvents = new Set(["natural", "rainy_day_inside", "minor_play_injury"]);
const resourceDraftActionIds = [
  "child_age6_ask_teacher_about_school",
  "child_age6_make_and_change_game_rules",
  "child_age6_draw_and_compare_objects",
  "child_age6_run_jump_ball_game",
  "child_age6_tell_school_day_at_home",
];

function fail(message) {
  document.body.dataset.state = "error";
  status.textContent = `测试准备失败：${message}。请交还主持人处理。`;
  throw new Error(message);
}

if (!/^[a-z0-9][a-z0-9-]{4,63}$/.test(batchId)) fail("批次编号无效");
if (!/^P0[1-8]$/.test(participantId)) fail("参与者编号无效");
if (!["empty", "resource_shortage"].includes(draftCondition)) fail("草案条件无效");
if (!allowedEvents.has(eventCondition)) fail("事件条件无效");
if (!["full", "reduced", "off"].includes(motionMode)) fail("动态效果条件无效");
if (!/^[a-f0-9]{64}$/.test(expectedBuild)) fail("候选构建指纹缺失");

try {
  const releaseResponse = await fetch(new URL("../../dist/release-info.json", location.href), { cache: "no-store" });
  if (!releaseResponse.ok) fail("没有找到已冻结的 H5 候选包");
  const release = await releaseResponse.json();
  if (release.contentSha256 !== expectedBuild) fail("主持入口与当前候选包指纹不一致");

  const data = await loadGameData(new URL("../../", import.meta.url));
  const fixture = replayDebugToTarget(data, {
    seed: "age6-blind-p2-v1",
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
  const session = structuredClone(fixture.session);
  const pending = fixture.result.pendingDecision;
  if (eventCondition === "natural") delete session.debug;
  else {
    session.debug.randomEvents = {
      mode: "forced",
      forcedEventId: eventCondition,
      activationYear: pending.calendarYear,
      activationQuarter: pending.quarter,
    };
  }

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith("people-life:")) localStorage.removeItem(key);
  }
  localStorage.setItem("people-life:active:v5", JSON.stringify(session));
  localStorage.setItem("people-life:ui:v1", JSON.stringify({ route: "life", params: {} }));
  localStorage.setItem(PRESENTATION_STORAGE_KEY, JSON.stringify({
    schemaVersion: 1,
    motionMode,
    soundEnabled,
    hapticEnabled: false,
  }));
  if (draftCondition === "resource_shortage") {
    const optionIds = new Set(pending.options.map((option) => option.id));
    if (!resourceDraftActionIds.every((actionId) => optionIds.has(actionId))) fail("资源受限草案与候选版本不兼容");
    localStorage.setItem("people-life:quarter-draft:v1", JSON.stringify({
      protocol: "quarter-draft-v1",
      eventId: pending.eventId,
      allocations: resourceDraftActionIds.map((actionId) => ({ actionId, intensity: "focus" })),
      updatedAt: Date.now(),
    }));
  }
  localStorage.setItem("people-life:blind-test-launch:v1", JSON.stringify({
    schemaVersion: 1,
    batchId,
    participantId,
    draftCondition,
    eventCondition,
    motionMode,
    soundEnabled,
    releaseContentSha256: release.contentSha256,
    initializedAt: new Date().toISOString(),
  }));

  const target = new URL("../../dist/", location.href);
  target.hash = "/life";
  location.replace(target.href);
} catch (error) {
  if (document.body.dataset.state !== "error") {
    document.body.dataset.state = "error";
    status.textContent = "测试准备失败。请交还主持人处理，不要自行刷新或改动设置。";
  }
  console.error(error);
}

