import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DATA_FILES } from "../src/game/load-game-data.mjs";
import { replayDebugToTarget } from "../src/game/debug-tools.mjs";
import { mapEventChoiceToCommand, mapSceneActionToCommand } from "../src/game/light-scene-contract.mjs";
import {
  aggregateSceneJournal,
  commitSceneJournalToLife,
  canCommitSceneJournalToLife,
} from "../src/game/light-scene-core-bridge.mjs";
import { resumeLife, validateGameSession } from "../src/game/game-application.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = Object.fromEntries(Object.entries(DATA_FILES).map(([key, relativePath]) => [
  key,
  JSON.parse(fs.readFileSync(path.join(projectRoot, relativePath), "utf8")),
]));
const content = JSON.parse(fs.readFileSync(path.join(projectRoot, "data", "gameplay", "light_scene_yard_1984.json"), "utf8"));

const config = {
  seed: "light-scene-urban-1",
  birthYear: 1978,
  targetAge: 6,
  targetPoint: "q3",
  mortality: false,
  routePreset: "balanced",
  familyPreset: "natural",
  pressurePreset: "ordinary",
  randomMode: "normal",
  forcedEventId: null,
};

function actionEntry(actionId) {
  const command = mapSceneActionToCommand(content, actionId);
  return {
    type: "quarter.plan",
    status: "success",
    actionId,
    command,
  };
}

function eventEntry(choiceId) {
  return {
    type: "event.choose",
    status: "success",
    command: mapEventChoiceToCommand(content, choiceId),
  };
}

function reached() {
  return replayDebugToTarget(data, config);
}

console.log("【1/7】重放到 1984 Q3，并确认四个场景映射均在 Core pending 可用...");
const outcome = reached();
const pending = outcome.result.pendingDecision;
assert.equal(pending.kind, "quarter_plan");
assert.equal(pending.calendarYear, 1984);
assert.equal(pending.age, 6);
assert.equal(pending.quarter, 3);
const mappings = content.actions.map((action) => action.coreActionId);
for (const coreActionId of mappings) {
  const option = pending.options.find((candidate) => candidate.id === coreActionId);
  assert.ok(option, `${coreActionId} 应在 pending.options 中`);
  assert.notEqual(option.available, false, `${coreActionId} 应可用`);
}

console.log("【2/7】聚合三项主行动，去重重复命令，并只保留场景事件到 sidecar...");
const journal = [
  actionEntry("join_marbles"),
  actionEntry("practice_writing"),
  actionEntry("inspect_bicycle"),
  actionEntry("join_marbles"),
  eventEntry("help_search"),
];
const aggregate = aggregateSceneJournal(journal, content);
assert.equal(aggregate.ok, true);
assert.deepEqual(aggregate.command.allocations.map((allocation) => allocation.actionId), [
  "child_play_nearby",
  "child_practice_symbols",
  "child_observe_neighborhood_work",
]);
assert.deepEqual(aggregate.completedActionIds, ["join_marbles", "practice_writing", "inspect_bicycle"]);
assert.deepEqual(aggregate.eventChoiceIds, ["help_search"]);
assert.equal(aggregate.command.allocations.length, 3);

console.log("【3/7】提交一次 Core quarter.plan，并验证 sceneRecords sidecar...");
const committed = commitSceneJournalToLife(data, outcome.session, outcome.result, journal, content);
assert.equal(committed.ok, true, committed.blocked?.reason);
assert.deepEqual(committed.command.allocations.map((allocation) => allocation.actionId), [
  "child_play_nearby",
  "child_practice_symbols",
  "child_observe_neighborhood_work",
]);
const quarterPlan = committed.session.quarterPlans[pending.eventId];
assert.ok(quarterPlan, "Core 应写入当前季度计划");
assert.deepEqual(quarterPlan.allocations.map((allocation) => allocation.actionId), committed.command.allocations.map((allocation) => allocation.actionId));
const record = committed.session.sceneRecords[content.id];
assert.ok(record, "应生成 sceneRecords sidecar");
assert.equal(record.schemaVersion, 1);
assert.deepEqual(record.completedActionIds, ["join_marbles", "practice_writing", "inspect_bicycle"]);
assert.deepEqual(record.eventChoiceIds, ["help_search"]);
assert.ok(record.longTermFactCandidates.includes("peer_cooperation_memory"));
assert.equal(committed.session.randomEventChoices?.marble_to_shed, undefined, "scene event 不应冒充旧 Core random event");
assert.deepEqual(committed.recovery, { validated: true, resumed: true });

console.log("【4/7】JSON roundtrip 与 resumeLife 恢复...");
const roundTrip = JSON.parse(JSON.stringify(committed.session));
validateGameSession(roundTrip);
const resumed = resumeLife(data, roundTrip);
assert.ok(resumed.result);
assert.deepEqual(resumed.session.sceneRecords[content.id], record);

console.log("【5/7】验证数量不足、错误年份、不可用 action 均结构化阻断...");
const insufficient = commitSceneJournalToLife(data, outcome.session, outcome.result, [actionEntry("join_marbles")], content);
assert.equal(insufficient.ok, false);
assert.equal(insufficient.blocked.code, "activity-count");
const wrongYear = commitSceneJournalToLife(data, outcome.session, { ...outcome.result, pendingDecision: { ...pending, calendarYear: 1983 } }, journal, content);
assert.equal(wrongYear.ok, false);
assert.equal(wrongYear.blocked.code, "pending-context");
const unavailablePending = {
  ...pending,
  options: pending.options.map((option) => option.id === "child_practice_symbols" ? { ...option, available: false } : option),
};
const unavailable = commitSceneJournalToLife(data, outcome.session, { ...outcome.result, pendingDecision: unavailablePending }, journal, content);
assert.equal(unavailable.ok, false);
assert.equal(unavailable.blocked.code, "unavailable-core-action");

console.log("【6/7】验证同输入确定性与 duplicate command 结果稳定...");
const committedAgain = commitSceneJournalToLife(data, outcome.session, outcome.result, journal, content);
assert.deepEqual(committedAgain, committed);
const eligibility = canCommitSceneJournalToLife(outcome.result, journal, content);
assert.equal(eligibility.ok, true);

console.log("【7/7】验证事件命令没有绕过 Core 提交入口...");
const onlyEvent = aggregateSceneJournal([eventEntry("help_search")], content);
assert.equal(onlyEvent.ok, true);
assert.deepEqual(onlyEvent.command, { type: "quarter.plan", allocations: [] });
const eventBlocked = commitSceneJournalToLife(data, outcome.session, outcome.result, [eventEntry("help_search")], content);
assert.equal(eventBlocked.ok, false);
assert.equal(eventBlocked.blocked.code, "activity-count");

console.log(JSON.stringify({
  ok: true,
  target: "1984-Q3-age6",
  mappedCoreActions: mappings,
  committedCoreActions: committed.command.allocations.map((allocation) => allocation.actionId),
  sceneRecord: record,
  recovery: committed.recovery,
}, null, 2));
