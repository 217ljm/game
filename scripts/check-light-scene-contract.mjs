import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  LIGHT_SCENE_CONTRACT_VERSION,
  SCENE_CUE_TYPES,
  createActionCues,
  createEventCues,
  createSceneRuntimePort,
  createSceneRuntimeState,
  mapEventChoiceToCommand,
  mapSceneActionToCommand,
  normalizeLocalSceneIntent,
  skipSceneCues,
  validateLightSceneContent,
  validateSceneRuntimeState,
} from "../src/game/light-scene-contract.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const contentPath = path.join(projectRoot, "data", "gameplay", "light_scene_yard_1984.json");
const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));
const moduleSource = fs.readFileSync(path.join(projectRoot, "src", "game", "light-scene-contract.mjs"), "utf8");
const ids = (items) => new Set(items.map((item) => item.id));
const expectSet = (actual, expected, label) => assert.deepEqual([...actual].sort(), [...new Set(expected)].sort(), label);

console.log("【1/8】校验纯模块边界与唯一内容源...");
assert.equal(moduleSource.includes("Math.random"), false);
assert.equal(moduleSource.match(/document\.|window\.|localStorage|sessionStorage/g), null);
assert.equal(validateLightSceneContent(content), true);

console.log("【2/8】校验三舞台、9节点、4角色精确ID...");
expectSet(ids(content.stages), ["gate", "yard", "home"], "stage ID必须与canonical JSON一致");
expectSet(ids(content.nodes), ["schoolbag", "gate_call", "partner", "stone_table", "marbles", "bicycle_shed", "caregiver", "bowls", "homework"], "node ID必须与canonical JSON一致");
expectSet(ids(content.characters), ["player_child", "partner_xiaoyu", "older_child_asha", "caregiver_mother"], "character ID必须与canonical JSON一致");
assert.equal(content.stages.length, 3);
assert.equal(content.nodes.length, 9);
assert.equal(content.characters.length, 4);
assert.equal(content.timeAndEnergy.totalSlots, 9);

console.log("【3/8】校验4主动作精确ID与JSON时间消耗...");
expectSet(ids(content.actions), ["join_marbles", "practice_writing", "inspect_bicycle", "set_table"], "主动作ID必须与canonical JSON一致");
for (const action of content.actions) {
  const command = mapSceneActionToCommand(content, action.id);
  assert.equal(command.type, "quarter.plan");
  assert.equal(command.allocations.length, 1);
  assert.equal(command.allocations[0].actionId, action.coreActionId);
  assert.equal(command.allocations[0].intensity, action.corePlan.intensity);
  assert.equal(command.allocations[0].timeSlots, action.corePlan.timeSlots);
}

console.log("【4/8】校验事件与3个事件选择命令...");
assert.equal(content.event.id, "marble_to_shed");
expectSet(ids(content.event.choices), ["help_search", "ask_first", "go_home"], "event choice ID必须与canonical JSON一致");
assert.equal(content.event.choices.length, 3);
for (const choice of content.event.choices) {
  const command = mapEventChoiceToCommand(content, choice.id);
  assert.deepEqual(command, { type: "event.choose", eventId: "marble_to_shed", optionId: choice.id });
}

console.log("【5/8】校验动作processCues与事件sequence构造...");
const actionCues = createActionCues(content, "join_marbles");
assert.deepEqual(actionCues.map((cue) => cue.type), content.actions.find((action) => action.id === "join_marbles").processCues.map((cue) => cue.type));
assert.equal(actionCues.every((cue) => SCENE_CUE_TYPES.includes(cue.type) && cue.skipSafe), true);
const eventCues = createEventCues(content, "help_search");
assert.equal(eventCues.length, content.event.sequence.length + content.event.choices.find((choice) => choice.id === "help_search").processCues.length);
assert.deepEqual(eventCues.slice(0, content.event.sequence.length).map((cue) => cue.type), content.event.sequence.map((cue) => cue.type));

console.log("【6/8】校验runtime工厂、9格状态和非法输入回退...");
const state = createSceneRuntimeState(content, { reducedMotion: true });
assert.equal(state.schemaVersion, LIGHT_SCENE_CONTRACT_VERSION);
assert.equal(state.contentId, content.id);
assert.equal(state.usedTimeSlots, 0);
assert.equal(validateSceneRuntimeState(content, state), true);
assert.throws(() => validateSceneRuntimeState(content, { ...state, usedTimeSlots: 10 }), /usedTimeSlots/);
assert.deepEqual(normalizeLocalSceneIntent(content, null), { type: "scene.focus", nodeId: "schoolbag" });
assert.deepEqual(normalizeLocalSceneIntent(content, { type: "scene.focus", nodeId: "missing" }), { type: "scene.focus", nodeId: "schoolbag" });
assert.deepEqual(normalizeLocalSceneIntent(content, { type: "scene.transition", targetStageId: "missing" }), { type: "scene.transition", targetStageId: "gate" });
assert.equal(mapSceneActionToCommand(content, "missing"), null);
assert.equal(mapEventChoiceToCommand(content, "missing"), null);
const restoredState = createSceneRuntimeState(content, {
  stageId: "home",
  focusedNodeId: "bowls",
  usedTimeSlots: 6,
  completedActionIds: ["join_marbles", "join_marbles", "missing"],
  eventChoiceIds: ["help_search", "ask_first"],
});
assert.deepEqual(restoredState.completedActionIds, ["join_marbles"]);
assert.deepEqual(restoredState.eventChoiceIds, ["help_search"]);
assert.equal(validateSceneRuntimeState(content, restoredState), true);

console.log("【7/8】校验端口动作、事件选择与状态边界...");
const port = createSceneRuntimePort(content, { reducedMotion: true });
const before = port.getState();
assert.deepEqual(port.getActionAvailability("join_marbles"), { available: true, reason: null, remainingSlots: 9, costSlots: 2 });
const prepared = port.prepareAction("join_marbles");
assert.equal(prepared.rejected, false);
assert.equal(prepared.state.usedTimeSlots, content.actions.find((action) => action.id === "join_marbles").timeCost.slots);
assert.deepEqual(prepared.command, mapSceneActionToCommand(content, "join_marbles"));
const afterFirstAction = port.getState();
const repeated = port.prepareAction("join_marbles");
assert.equal(repeated.rejected, true);
assert.equal(repeated.reason, "already-completed");
assert.equal(repeated.command, null);
assert.deepEqual(repeated.cues, []);
assert.deepEqual(repeated.state, afterFirstAction);
const eventPrepared = port.prepareEventChoice("help_search");
assert.equal(eventPrepared.rejected, false);
assert.deepEqual(eventPrepared.command, mapEventChoiceToCommand(content, "help_search"));
assert.equal(eventPrepared.state.usedTimeSlots, 3);
assert.deepEqual(port.getEventChoiceAvailability("ask_first"), { available: false, reason: "event-resolved", remainingSlots: 6, costSlots: 1 });
const repeatedEvent = port.prepareEventChoice("ask_first");
assert.equal(repeatedEvent.rejected, true);
assert.equal(repeatedEvent.reason, "event-resolved");
assert.equal(port.prepareAction("missing").rejected, true);
assert.equal(before.usedTimeSlots, 0);
const boundaryPort = createSceneRuntimePort(content, { usedTimeSlots: 8 });
assert.deepEqual(boundaryPort.getActionAvailability("practice_writing"), { available: false, reason: "insufficient-time", remainingSlots: 1, costSlots: 3 });
const boundaryBefore = boundaryPort.getState();
const insufficient = boundaryPort.prepareAction("practice_writing");
assert.equal(insufficient.rejected, true);
assert.equal(insufficient.reason, "insufficient-time");
assert.equal(insufficient.command, null);
assert.deepEqual(insufficient.cues, []);
assert.deepEqual(insufficient.state, boundaryBefore);
const fullPort = createSceneRuntimePort(content, { usedTimeSlots: 9 });
assert.deepEqual(fullPort.getEventChoiceAvailability("ask_first"), { available: false, reason: "insufficient-time", remainingSlots: 0, costSlots: 1 });
assert.deepEqual(fullPort.getEventChoiceAvailability("go_home"), { available: true, reason: null, remainingSlots: 0, costSlots: 0 });

console.log("【8/8】校验skip保序、payload与命令不变...");
const commandBefore = mapSceneActionToCommand(content, "join_marbles");
const cuesBefore = createActionCues(content, "join_marbles");
const skipped = skipSceneCues(cuesBefore);
assert.deepEqual(skipped.map((cue) => cue.type), cuesBefore.map((cue) => cue.type));
assert.deepEqual(skipped.map((cue) => cue.payload), cuesBefore.map((cue) => cue.payload));
assert.ok(skipped.every((cue) => cue.durationMs === 0 && cue.skipped === true));
assert.deepEqual(mapSceneActionToCommand(content, "join_marbles"), commandBefore);

console.log(JSON.stringify({
  ok: true,
  contract: "light-scene-contract-v1",
  contentId: content.id,
  stages: content.stages.length,
  nodes: content.nodes.length,
  characters: content.characters.length,
  actions: content.actions.length,
  eventChoices: content.event.choices.length,
  totalSlots: content.timeAndEnergy.totalSlots,
  deterministic: true,
  domFree: true,
  canonicalContentSource: "data/gameplay/light_scene_yard_1984.json",
}, null, 2));
console.log("\n✅ 轻场景G1上游合同检查全部通过。");
