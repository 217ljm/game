import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DATA_FILES } from "../src/game/load-game-data.mjs";
import {
  applySessionChoice,
  migrateGameSession,
  runLifeSession,
} from "../src/game/game-engine.mjs";
import { replayDebugToTarget } from "../src/game/debug-tools.mjs";
import { presentGame } from "../src/game/presenter.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = path.join(root, "data", "gameplay", "quarterly_age6_1984.json");
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const data = Object.fromEntries(Object.entries(DATA_FILES).map(([key, relativePath]) => [
  key,
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8")),
]));

assert.equal(registry.status, "frozen-for-implementation");
assert.equal(registry.contentVersion, "age6-1984-p2-v1");
assert.deepEqual(registry.slice, {
  id: "life.slice.1984.age6",
  birthYear: 1978,
  calendarYear: 1984,
  age: 6,
  stage: "childhood",
  activePlanningQuarters: [1, 2, 3, 4],
  continuationQuarters: [],
  yearReviewId: "review:1984",
  nextStage: "primary",
  nextAge: 7,
});

const moduleIds = registry.modules.map((module) => module.id);
assert.deepEqual(moduleIds, [
  "life.module.learning",
  "life.module.interests",
  "life.module.relationships",
  "life.module.family",
  "life.module.daily",
]);
assert.equal(new Set(moduleIds).size, moduleIds.length, "模块 ID 必须唯一");

const actionIds = registry.actions.map((action) => action.id);
assert.ok(actionIds.length >= 18, "年龄 6 注册表至少需要 18 个候选行动原型");
assert.equal(new Set(actionIds).size, actionIds.length, "行动 ID 必须唯一");
assert.ok(registry.actions.every((action) => moduleIds.includes(action.moduleId)));
for (const moduleId of moduleIds) {
  assert.ok(registry.actions.some((action) => action.moduleId === moduleId), `模块 ${moduleId} 没有行动`);
}

assert.deepEqual(registry.persistentRoleIds, ["caregiver", "neighborhood_friend", "primary_teacher"]);
assert.deepEqual(registry.randomEventIds, [
  "found_small_creature",
  "borrowed_picture_or_story_book",
  "neighborhood_game_invitation",
  "rainy_day_inside",
  "minor_play_injury",
  "radio_song_attention",
]);
assert.deepEqual(registry.interruptingEventIds, ["rainy_day_inside", "minor_play_injury"]);
assert.ok(registry.causalityEvidence.length >= 4);
assert.equal(registry.draftProtocol.id, "quarter-draft-v1");
assert.equal(registry.commandProtocol.quarterPlanType, "quarter.plan");
assert.deepEqual(registry.commandProtocol.intensityIds, ["trial", "regular", "focus"]);
assert.deepEqual(registry.commandProtocol.requiredFields, ["type", "eventId", "allocations"]);

const randomEventIndex = new Map(data.quarterlyLife.randomEvents.map((event) => [event.id, event]));
for (const eventId of registry.randomEventIds) {
  const event = randomEventIndex.get(eventId);
  assert.ok(event, `注册事件 ${eventId} 必须存在于季度事件内容`);
  assert.ok(event.stages.includes("childhood"), `${eventId} 必须适用于童年阶段`);
  assert.ok(event.minAge <= 6 && event.maxAge >= 6, `${eventId} 必须适用于6岁`);
}
for (const eventId of registry.interruptingEventIds) {
  assert.ok(randomEventIndex.get(eventId)?.interruption, `${eventId} 必须携带计划打断协议`);
}

assert.equal(DATA_FILES.quarterlyAge6, "data/gameplay/quarterly_age6_1984.json");
assert.equal(
  fs.existsSync(path.join(root, DATA_FILES.quarterlyAge6)),
  true,
  "年龄 6 注册表必须进入正式数据加载器",
);

const simulationDirectory = path.join(root, "src", "simulation");
const simulationFiles = fs.readdirSync(simulationDirectory).filter((file) => file.endsWith(".mjs"));
for (const file of simulationFiles) {
  const source = fs.readFileSync(path.join(simulationDirectory, file), "utf8");
  assert.equal(source.includes("quarterly_age6_1984"), false, `${file} 不得读取呈现注册表`);
}

const age6Start = replayDebugToTarget(data, {
  seed: "age6-persistent-people",
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
const residenceSlices = new Map();
for (let index = 0; index < 30 && residenceSlices.size < 2; index += 1) {
  const outcome = replayDebugToTarget(data, {
    seed: `age6-residence-${index}`,
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
  residenceSlices.set(outcome.result.profile.person.residence, outcome.result);
}
assert.deepEqual([...residenceSlices.keys()].sort(), ["rural", "urban"], "P2 检查必须覆盖城乡年龄6档案");
for (const [residence, sliceResult] of residenceSlices) {
  const candidates = sliceResult.pendingDecision.options.filter((option) => !option.isPlanControl);
  assert.ok(candidates.length >= 18, `${residence} 年龄6 Q1 至少需要18个候选行动`);
  assert.ok(candidates.filter((option) => option.available !== false).length >= 8, `${residence} 年龄6 Q1 至少需要8个可用行动`);
  const locked = candidates.find((option) => option.id === "child_make_learning_card");
  assert.equal(locked?.available, false, `${residence} 初始切片必须保留成长条件受限路径`);
  assert.ok(locked.unavailableReason || locked.unlockHint, `${residence} 锁定行动必须解释原因`);
}
const persistentActionIds = [
  "child_age6_ask_teacher_about_school",
  "child_age6_make_and_change_game_rules",
  "child_age6_tell_school_day_at_home",
];
for (const actionId of persistentActionIds) {
  const option = age6Start.result.pendingDecision.options.find((entry) => entry.id === actionId);
  assert.equal(option?.available, true, `年龄6 Q1 必须可执行 ${actionId}`);
}

function quarterPlanFor(pending, preferredIds = []) {
  const available = pending.options.filter((option) => option.available !== false && !option.isPlanControl);
  const preferred = preferredIds
    .map((id) => available.find((option) => option.id === id))
    .filter(Boolean);
  const selected = [...preferred];
  for (const option of available) {
    if (selected.some((entry) => entry.id === option.id)) continue;
    if (selected.length >= pending.minActivities) break;
    selected.push(option);
  }
  assert.ok(
    selected.length >= pending.minActivities,
    `Q${pending.quarter} 必须能形成至少 ${pending.minActivities} 项行动的计划`,
  );
  const bounded = selected.slice(0, Math.min(selected.length, pending.maxActivities));
  return {
    type: "quarter.plan",
    eventId: pending.eventId,
    allocations: bounded.map((option) => ({
      actionId: option.id,
      intensity: option.defaultIntensity ?? "trial",
    })),
  };
}

function resolveInterruptions(session, result) {
  let currentSession = session;
  let currentResult = result;
  while (
    currentResult.pendingDecision
    && !["quarter_plan", "year_review"].includes(currentResult.pendingDecision.kind)
  ) {
    const pending = currentResult.pendingDecision;
    assert.ok(
      pending.kind == null || ["random_life_event", "mainline_event"].includes(pending.kind),
      `年龄6季度中出现未覆盖的等待节点：${pending.kind}`,
    );
    const option = pending.options.find((entry) => entry.available !== false);
    assert.ok(option, `${pending.eventId} 必须至少有一个可执行事件选项`);
    currentSession = applySessionChoice(currentSession, pending, option.id);
    currentResult = runLifeSession(data, currentSession, { autoChoose: false });
  }
  return { session: currentSession, result: currentResult };
}

function startFormalAge6() {
  const start = replayDebugToTarget(data, {
    seed: "age6-persistent-people",
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
  start.session.quarterCadenceProfile = "age6-1984-quarterly-v1";
  start.result = runLifeSession(data, start.session, { autoChoose: false });
  assert.equal(start.session.quarterCadenceProfile, "age6-1984-quarterly-v1");
  assert.equal(start.result.pendingDecision?.quarter, 1);
  return start;
}

function runFormalAge6() {
  let replaySession = startFormalAge6().session;
  let replayResult = runLifeSession(data, replaySession, { autoChoose: false });
  const quarterSnapshots = [];
  for (let quarter = 1; quarter <= 4; quarter += 1) {
    assert.equal(replayResult.pendingDecision?.kind, "quarter_plan");
    assert.equal(replayResult.pendingDecision?.quarter, quarter);
    const preferred = quarter === 1 ? persistentActionIds : [];
    replaySession = applySessionChoice(
      replaySession,
      replayResult.pendingDecision,
      quarterPlanFor(replayResult.pendingDecision, preferred),
    );
    replayResult = runLifeSession(data, replaySession, { autoChoose: false });
    ({ session: replaySession, result: replayResult } = resolveInterruptions(replaySession, replayResult));
    const record = replayResult.currentState.annualRecords.at(-1);
    assert.equal(record.age, 6);
    assert.equal(record.quarterRecords.length, quarter, `Q${quarter} 后必须有 ${quarter} 条季度记录`);
    const quarterRecord = record.quarterRecords.at(-1);
    assert.equal(quarterRecord.quarter, quarter);
    assert.equal(quarterRecord.monthTicks?.length, 3, `Q${quarter} 必须产生连续三个月事实`);
    quarterSnapshots.push(structuredClone(quarterRecord));
    if (quarter < 4) {
      assert.equal(replayResult.pendingDecision?.kind, "quarter_plan");
      assert.equal(replayResult.pendingDecision?.quarter, quarter + 1);
    } else {
      assert.equal(replayResult.pendingDecision?.kind, "year_review");
      assert.deepEqual(
        replayResult.pendingDecision.quarterSummary.map((entry) => entry.quarter),
        [1, 2, 3, 4],
      );
    }
  }
  const review = replayResult.pendingDecision;
  replaySession = applySessionChoice(replaySession, review, "confirm_year_review");
  replayResult = runLifeSession(data, replaySession, { autoChoose: false });
  assert.equal(replayResult.pendingDecision?.age, 7, "确认1984年度回望后必须进入7岁");
  return { session: replaySession, result: replayResult, quarterSnapshots };
}

function runAge6Q1CausalBranch(primaryActionId) {
  let { session, result } = startFormalAge6();
  const pending = result.pendingDecision;
  const plan = quarterPlanFor(pending, [primaryActionId, "quarter_intentional_rest"]);
  assert.ok(plan.allocations.some((entry) => entry.actionId === primaryActionId));
  assert.ok(plan.allocations.some((entry) => entry.actionId === "quarter_intentional_rest"));
  session = applySessionChoice(session, pending, plan);
  result = runLifeSession(data, session, { autoChoose: false });
  ({ session, result } = resolveInterruptions(session, result));
  assert.equal(result.pendingDecision?.kind, "quarter_plan");
  assert.equal(result.pendingDecision?.quarter, 2);
  return { session, result };
}

const observationBranch = runAge6Q1CausalBranch("child_age6_draw_and_compare_objects");
const movementBranch = runAge6Q1CausalBranch("child_age6_run_jump_ball_game");
const interestScore = (branch, id) => branch.result.currentState.interests?.[id]?.score ?? 0;
assert.ok(
  interestScore(observationBranch, "visual_art") > interestScore(movementBranch, "visual_art"),
  "Q1 观察绘画必须在 Q2 留下更高的视觉艺术兴趣",
);
assert.ok(
  interestScore(movementBranch, "sports_movement") > interestScore(observationBranch, "sports_movement"),
  "Q1 跑跳游戏必须在 Q2 留下更高的运动兴趣",
);
assert.notDeepEqual(
  observationBranch.result.currentState.interests,
  movementBranch.result.currentState.interests,
  "同 seed 年龄6 Q1 的不同现实行动必须在 Q2 形成不同兴趣事实",
);

const formalRun = runFormalAge6();
const formalReplay = runFormalAge6();
assert.deepEqual(formalRun, formalReplay, "相同 seed 与季度命令序列必须产生完全相同结果");

const oldV5 = structuredClone(age6Start.session);
delete oldV5.quarterCadenceProfile;
assert.equal(migrateGameSession(oldV5).quarterCadenceProfile, null, "旧 v5 存档缺失 profile 时必须迁移为 null");

let replaySession = applySessionChoice(
  age6Start.session,
  age6Start.result.pendingDecision,
  {
    type: "quarter.plan",
    eventId: age6Start.result.pendingDecision.eventId,
    allocations: persistentActionIds.map((actionId) => ({ actionId, intensity: "trial" })),
  },
);
let replayResult = runLifeSession(data, replaySession, { autoChoose: false });
({ session: replaySession, result: replayResult } = resolveInterruptions(replaySession, replayResult));
assert.equal(replayResult.pendingDecision?.age, 6);
assert.equal(replayResult.pendingDecision?.kind, "quarter_plan");
assert.equal(replayResult.pendingDecision?.quarter, 3, "未带 profile 时 Q1 计划及 Q2 自动延续后应停在年龄6 Q3");
const age6View = presentGame(replayResult, data);
const presentRoleIds = new Set(age6View.people.map((person) => person.roleId).filter(Boolean));
for (const roleId of registry.persistentRoleIds) {
  assert.ok(presentRoleIds.has(roleId), `年龄6 切片缺少持续人物角色 ${roleId}`);
}
const age6Record = replayResult.currentState.annualRecords.at(-1);
assert.equal(age6Record.age, 6);
assert.equal(age6Record.quarterRecords.length, 2, "Q1 主动计划和 Q2 自动延续都应留下季度记录");
assert.ok(age6Record.quarterRecords.every((quarter) => quarter.monthTicks?.length === 3), "每个已结算季度必须有三个月执行记录");
assert.equal(age6Record.quarterRecords[1].controlMode, "automatic_continuation", "未带 profile 的 Q2 必须是自动延续");
assert.ok(
  replayResult.currentState.socialNetwork
    .filter((person) => ["neighborhood_friend", "primary_teacher"].includes(person.roleId))
    .every((person) => person.sharedMemories?.length > 0),
  "同伴与准老师必须留下可跨季度读取的共同记忆",
);

console.log(`P2 年龄6注册表与垂直切片检查通过：${actionIds.length} 个行动、${moduleIds.length} 个模块、${registry.randomEventIds.length} 个事件、${presentRoleIds.size} 个持续角色。`);
