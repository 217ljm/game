import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentPath = path.join(projectRoot, "data", "gameplay", "light_scene_yard_1984.json");
const contractPath = path.join(projectRoot, "src", "game", "light-scene-contract.mjs");
const errors = [];

const relative = (absolutePath) => path.relative(projectRoot, absolutePath);
const fail = (message) => errors.push(message);

function readJson(absolutePath, label) {
  if (!fs.existsSync(absolutePath)) {
    fail(`${label}缺失：${relative(absolutePath)}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    fail(`${label}无法解析：${relative(absolutePath)}（${error.message}）`);
    return null;
  }
}

function requiredString(value, label) {
  if (typeof value !== "string" || value.length === 0) fail(`${label}必须是非空字符串`);
}

function requiredArray(value, label, length = null) {
  if (!Array.isArray(value)) {
    fail(`${label}必须是数组`);
    return [];
  }
  if (length !== null && value.length !== length) fail(`${label}必须恰好${length}项，实际为${value.length}`);
  return value;
}

function requiredNumber(value, label, predicate = (candidate) => Number.isFinite(candidate)) {
  if (typeof value !== "number" || !predicate(value)) fail(`${label}数值不符合合同：${value}`);
}

function uniqueIds(items, label) {
  const ids = [];
  for (const item of items) {
    requiredString(item?.id, `${label}条目id`);
    if (item?.id && ids.includes(item.id)) fail(`${label}存在重复id：${item.id}`);
    if (item?.id) ids.push(item.id);
  }
  return ids;
}

function sameIds(actual, expected, label) {
  const actualSet = [...new Set(actual)].sort();
  const expectedSet = [...new Set(expected)].sort();
  if (JSON.stringify(actualSet) !== JSON.stringify(expectedSet)) {
    fail(`${label}ID不完全一致：实际=${JSON.stringify(actualSet)}，期望=${JSON.stringify(expectedSet)}`);
  }
}

// G1内容合同不得带入表现/模拟范围扩张字段。只扫描字段名，避免把
// acceptance.forbidden里的说明文字误判为实现字段。
const forbiddenField = /^(?:x|y|z|coordinate|coordinates|physics|formula|equation|simulation|freeMovement|openWorld|largeMap|pathfinding|collision|navmesh|joystick|gamepad|cards?|actionCards?|scrollableActionList)$/i;
function scanForbiddenFields(value, location = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanForbiddenFields(entry, `${location}[${index}]`));
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (forbiddenField.test(key)) fail(`禁止字段 ${location}.${key}；G1不得加入坐标、模拟公式、大地图、卡片、物理或寻路`);
    scanForbiddenFields(nested, `${location}.${key}`);
  }
}

function checkTextLimits(content) {
  const limits = content?.textLimits;
  if (!limits || typeof limits !== "object") {
    fail("content.textLimits缺失");
    return;
  }
  requiredNumber(limits.nodeLabelChars?.min, "textLimits.nodeLabelChars.min", (value) => Number.isInteger(value) && value >= 0);
  requiredNumber(limits.nodeLabelChars?.max, "textLimits.nodeLabelChars.max", (value) => Number.isInteger(value) && value <= 5);
  requiredNumber(limits.actionLabelChars?.min, "textLimits.actionLabelChars.min", (value) => Number.isInteger(value) && value >= 0);
  requiredNumber(limits.actionLabelChars?.max, "textLimits.actionLabelChars.max", (value) => Number.isInteger(value) && value <= 7);
  requiredNumber(limits.bubbleChars, "textLimits.bubbleChars", (value) => Number.isInteger(value) && value <= 24);
  requiredNumber(limits.transitionChars, "textLimits.transitionChars", (value) => Number.isInteger(value) && value <= 18);
  requiredNumber(limits.quarterSummaryChars, "textLimits.quarterSummaryChars", (value) => Number.isInteger(value) && value <= 80);
}

function checkContent(content) {
  const indexes = { stageIds: [], nodeIds: [], characterIds: [], actionIds: [], eventId: null };
  if (!content) return indexes;
  if (content.version !== 1) fail(`content.version必须为1，实际为${content.version}`);
  requiredString(content.id, "content.id");
  requiredString(content.title, "content.title");
  checkTextLimits(content);

  const stages = requiredArray(content.stages, "content.stages", 3);
  indexes.stageIds = uniqueIds(stages, "content.stages");
  const stageNodeIds = [];
  const stageActionIds = [];
  for (const stage of stages) {
    requiredString(stage.label, `舞台${stage.id ?? "未知"}.label`);
    const nodeIds = requiredArray(stage.nodeIds, `舞台${stage.id ?? "未知"}.nodeIds`);
    const actionIds = requiredArray(stage.availableActionIds, `舞台${stage.id ?? "未知"}.availableActionIds`);
    stageNodeIds.push(...nodeIds);
    stageActionIds.push(...actionIds);
  }

  const nodes = requiredArray(content.nodes, "content.nodes");
  indexes.nodeIds = uniqueIds(nodes, "content.nodes");
  for (const node of nodes) {
    const label = `节点${node.id ?? "未知"}`;
    for (const field of ["kind", "stageId", "anchorId", "label"]) requiredString(node[field], `${label}.${field}`);
    if (node.stageId && !indexes.stageIds.includes(node.stageId)) fail(`${label}.stageId不存在：${node.stageId}`);
    if (node.id && !stageNodeIds.includes(node.id)) fail(`${label}未被任何stage.nodeIds引用`);
  }
  sameIds(stageNodeIds, indexes.nodeIds, "stage.nodeIds与flat nodes");

  const characters = requiredArray(content.characters, "content.characters", 4);
  indexes.characterIds = uniqueIds(characters, "content.characters");
  const roles = new Set(characters.map((character) => character.role));
  for (const character of characters) {
    requiredString(character.role, `人物${character.id ?? "未知"}.role`);
    requiredString(character.label, `人物${character.id ?? "未知"}.label`);
  }
  for (const role of ["player", "peer", "older_peer", "caregiver"]) if (!roles.has(role)) fail(`人物角色缺失：${role}`);

  const timeAndEnergy = content.timeAndEnergy;
  requiredNumber(timeAndEnergy?.totalSlots, "timeAndEnergy.totalSlots", (value) => value === 9);
  const tiers = ["light", "steady", "focus"];
  for (const [index, tierId] of tiers.entries()) {
    const tier = timeAndEnergy?.costTiers?.[tierId];
    if (!tier) {
      fail(`timeAndEnergy.costTiers缺少${tierId}`);
      continue;
    }
    const cost = tier.timeSlots ?? tier.tier;
    requiredNumber(cost, `timeAndEnergy.costTiers.${tierId}`, (value) => value === index + 1);
  }

  const actions = requiredArray(content.actions, "content.actions", 4);
  indexes.actionIds = uniqueIds(actions, "content.actions");
  for (const action of actions) {
    const label = `行动${action.id ?? "未知"}`;
    requiredString(action.label, `${label}.label`);
    requiredString(action.nodeId, `${label}.nodeId`);
    if (action.nodeId && !indexes.nodeIds.includes(action.nodeId)) fail(`${label}.nodeId不存在：${action.nodeId}`);
    requiredNumber(action.timeCost?.slots, `${label}.timeCost.slots`, (value) => Number.isInteger(value) && value >= 1 && value <= 9);
    const cues = requiredArray(action.processCues, `${label}.processCues`);
    if (!cues.some((cue) => cue?.type === "actor.pose" || cue?.type === "actor.move-between-anchors")) fail(`${label}.processCues缺少actor动作`);
    if (!cues.some((cue) => cue?.type === "prop.change")) fail(`${label}.processCues缺少prop.change`);
    if (!cues.some((cue) => cue?.type === "npc.react")) fail(`${label}.processCues缺少npc.react`);
    if (requiredArray(action.longTermFactCandidates, `${label}.longTermFactCandidates`).length < 1) fail(`${label}至少需要一个长期事实候选`);
  }
  sameIds(stageActionIds, indexes.actionIds, "stage.availableActionIds与content.actions");

  const event = content.event;
  if (!event || typeof event !== "object") {
    fail("content.event缺失；G1必须只有一个动态弹珠事件");
  } else {
    requiredString(event.id, "content.event.id");
    indexes.eventId = event.id;
    if (!/marble|弹珠/i.test(`${event.id} ${event.label ?? ""}`)) fail("content.event必须是弹珠动态事件");
    const choices = requiredArray(event.choices, "content.event.choices", 3);
    uniqueIds(choices, "content.event.choices");
    for (const choice of choices) {
      requiredString(choice.label, `事件选项${choice.id ?? "未知"}.label`);
      requiredArray(choice.processCues, `事件选项${choice.id ?? "未知"}.processCues`);
      requiredArray(choice.longTermFactCandidates, `事件选项${choice.id ?? "未知"}.longTermFactCandidates`);
    }
  }
  const ripples = requiredArray(content.ripples, "content.ripples", 3);
  uniqueIds(ripples, "content.ripples");
  return indexes;
}

async function checkProtocol(content, indexes) {
  if (!fs.existsSync(contractPath)) {
    fail(`协议模块缺失：${relative(contractPath)}`);
    return;
  }
  let protocol;
  try {
    protocol = await import(pathToFileURL(contractPath).href);
  } catch (error) {
    fail(`协议模块无法动态import：${error.message}`);
    return;
  }
  if (typeof protocol.validateLightSceneContent !== "function") {
    fail("协议模块缺少validateLightSceneContent导出");
  } else {
    try {
      protocol.validateLightSceneContent(content);
    } catch (error) {
      fail(`协议内容校验失败：${error.message}`);
    }
  }
  if (protocol.LIGHT_SCENE_CONTRACT_VERSION !== content?.version) fail(`协议版本与内容version不一致：${protocol.LIGHT_SCENE_CONTRACT_VERSION} ≠ ${content?.version}`);
  let port;
  try {
    if (typeof protocol.createSceneRuntimePort !== "function") throw new Error("缺少createSceneRuntimePort导出");
    port = protocol.createSceneRuntimePort(content);
    const state = protocol.createSceneRuntimeState(content);
    if (typeof protocol.validateSceneRuntimeState !== "function") throw new Error("缺少validateSceneRuntimeState导出");
    protocol.validateSceneRuntimeState(content, state);
  } catch (error) {
    fail(`协议运行时契约校验失败：${error.message}`);
  }
  if (!port) return;
  sameIds(port.getStages().map((stage) => stage.id), indexes.stageIds, "协议运行时舞台ID与内容");
  sameIds(port.getNodes().map((node) => node.id), indexes.nodeIds, "协议运行时节点ID与内容");
  sameIds(port.getCharacters().map((character) => character.id), indexes.characterIds, "协议运行时角色ID与内容");
  sameIds(port.getActions().map((action) => action.id), indexes.actionIds, "协议运行时动作ID与内容");
  for (const node of port.getNodes()) {
    const contentNode = content?.nodes?.find((candidate) => candidate.id === node.id);
    if (!contentNode) continue;
    if (node.stageId !== contentNode.stageId) fail(`节点${node.id}的协议stageId与内容不一致：${node.stageId} ≠ ${contentNode.stageId}`);
    if (node.anchorId !== contentNode.anchorId) fail(`节点${node.id}的协议anchorId与内容不一致：${node.anchorId} ≠ ${contentNode.anchorId}`);
  }
  for (const action of port.getActions()) {
    const contentAction = content?.actions?.find((candidate) => candidate.id === action.id);
    if (!contentAction) continue;
    if (action.nodeId !== contentAction.nodeId) fail(`动作${action.id}的协议nodeId与内容不一致：${action.nodeId} ≠ ${contentAction.nodeId}`);
    const protocolTimeSlots = action.timeSlots ?? action.timeCost?.slots;
    if (protocolTimeSlots !== contentAction.timeCost?.slots) fail(`动作${action.id}的协议timeSlots与内容不一致：${protocolTimeSlots} ≠ ${contentAction.timeCost?.slots}`);
    const command = protocol.mapSceneActionToCommand(content, action.id);
    if (command?.allocations?.[0]?.actionId !== action.id) fail(`动作${action.id}的协议命令ID未保持一致`);
    if (command?.allocations?.[0]?.timeSlots !== contentAction.timeCost?.slots) fail(`动作${action.id}的协议命令timeSlots未保持一致`);
    const cues = protocol.createActionCues(content, action.id);
    if (!Array.isArray(cues) || cues.length === 0) fail(`动作${action.id}协议未生成Cue`);
    const cueTypes = new Set(cues.map((cue) => cue.type));
    for (const requiredCue of ["actor.pose", "prop.change", "npc.react"]) if (!cueTypes.has(requiredCue)) fail(`动作${action.id}协议Cue缺少${requiredCue}`);
  }
  for (const choice of content.event.choices) {
    const command = protocol.mapEventChoiceToCommand(content, choice.id);
    if (command?.eventId !== indexes.eventId || command?.optionId !== choice.id) fail(`事件选择${choice.id}协议命令ID未保持一致`);
    const cues = protocol.createEventCues(content, choice.id);
    if (!Array.isArray(cues) || cues.length === 0) fail(`事件选择${choice.id}协议未生成Cue`);
  }
}

const content = readJson(contentPath, "G1院落内容JSON");
scanForbiddenFields(content, "content");
const indexes = checkContent(content);
await checkProtocol(content, indexes);

const output = {
  ok: errors.length === 0,
  contract: "G1-light-scene-yard-content-v2",
  files: { content: relative(contentPath), protocol: relative(contractPath) },
  expected: {
    stages: 3,
    characters: 4,
    roles: ["player", "peer", "older_peer", "caregiver"],
    actions: 4,
    timeSlots: 9,
    costTiers: [1, 2, 3],
    eventChoices: 3,
    ripples: 3,
    textLimits: { nodeLabelMax: 5, actionLabelMax: 7, bubble: 24, transition: 18, quarterSummary: 80 },
  },
  observed: {
    stages: content?.stages?.length ?? 0,
    nodes: content?.nodes?.length ?? 0,
    characters: content?.characters?.length ?? 0,
    actions: content?.actions?.length ?? 0,
    timeSlots: content?.timeAndEnergy?.totalSlots ?? null,
    eventChoices: content?.event?.choices?.length ?? 0,
    ripples: content?.ripples?.length ?? 0,
  },
  errors,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exitCode = 1;
