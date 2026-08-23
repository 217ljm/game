/**
 * 轻场景的引擎无关协议。
 *
 * 内容事实由调用方传入的 light_scene_yard_1984.json 提供，本模块不复制任何
 * 舞台、节点、角色或动作ID。SceneRuntime 只维护局部表现状态并生成稳定命令；
 * 真实人生事实仍由现有确定性 Core/Gateway 负责。
 */

export const LIGHT_SCENE_CONTRACT_VERSION = 1;
export const SCENE_CUE_TYPES = Object.freeze([
  "focus.node",
  "actor.pose",
  "actor.move-between-anchors",
  "prop.change",
  "npc.react",
  "transition",
  "show-result",
]);

const CUE_TYPE_SET = new Set(SCENE_CUE_TYPES);

function clone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) freeze(child);
  return value;
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label}必须是对象`);
  return value;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${label}必须是非空字符串`);
  return value;
}

function uniqueIds(items, label) {
  const ids = new Set();
  for (const item of items) {
    requireString(item?.id, `${label}id`);
    if (ids.has(item.id)) throw new Error(`${label}ID重复：${item.id}`);
    ids.add(item.id);
  }
  return ids;
}

function findStage(content, stageId) {
  return content.stages.find((stage) => stage.id === stageId) ?? content.stages[0];
}

function findNode(content, nodeId) {
  return content.nodes.find((node) => node.id === nodeId) ?? content.nodes[0];
}

function findAction(content, actionId) { return content.actions.find((action) => action.id === actionId) ?? null; }
function findChoice(content, choiceId) { return content.event.choices.find((choice) => choice.id === choiceId) ?? null; }

function safeString(value, fallback) { return typeof value === "string" && value.length > 0 ? value : fallback; }

function safeStageId(content, value) {
  return content.stages.some((stage) => stage.id === value) ? value : content.stages[0].id;
}

function safeNodeId(content, value) {
  return content.nodes.some((node) => node.id === value) ? value : content.nodes[0].id;
}

function safeInteger(value, fallback, min, max) {
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}

function mapIntensity(tier) {
  return ({ light: "trial", steady: "regular", focus: "focus" })[tier] ?? "trial";
}

function cueFromSpec(spec, context = {}, fallbackId) {
  const cue = requireObject(spec, "Cue");
  const type = CUE_TYPE_SET.has(cue.type) ? cue.type : "show-result";
  return freeze({
    cueId: safeString(cue.id, fallbackId),
    sceneId: safeString(context.sceneId, "light-scene"),
    type,
    text: typeof cue.text === "string" ? cue.text : "",
    durationMs: Number.isFinite(cue.durationMs) && cue.durationMs >= 0 ? cue.durationMs : 0,
    priority: type === "show-result" ? "key" : "normal",
    skipSafe: cue.skipSafe !== false,
    payload: freeze({
      ...(context && typeof context === "object" ? clone(context) : {}),
      sourceCueId: safeString(cue.id, fallbackId),
      sourceType: type,
    }),
  });
}

/** 校验唯一事实源的内容JSON。该函数不读取文件、不依赖DOM。 */
export function validateLightSceneContent(content) {
  requireObject(content, "轻场景内容");
  requireString(content.id, "内容id");
  if (!Number.isInteger(content.version) || content.version < 1) throw new RangeError("内容version非法");
  if (!Array.isArray(content.stages) || content.stages.length !== 3) throw new Error("内容必须包含3个舞台");
  if (!Array.isArray(content.nodes) || content.nodes.length < 4) throw new Error("内容至少需要4个节点");
  if (!Array.isArray(content.characters) || content.characters.length < 1) throw new Error("内容至少需要1个角色");
  if (!Array.isArray(content.actions) || content.actions.length < 2) throw new Error("内容至少需要2个主动作");
  const stageIds = uniqueIds(content.stages, "舞台");
  const nodeIds = uniqueIds(content.nodes, "节点");
  const characterIds = uniqueIds(content.characters, "角色");
  const actionIds = uniqueIds(content.actions, "动作");
  if (!content.timeAndEnergy || !Number.isInteger(content.timeAndEnergy.totalSlots) || content.timeAndEnergy.totalSlots <= 0) throw new Error("timeAndEnergy.totalSlots非法");
  if (!content.event || typeof content.event !== "object") throw new Error("缺少事件内容");
  requireString(content.event.id, "事件id");
  if (!Array.isArray(content.event.choices) || content.event.choices.length < 1) throw new Error("事件至少需要1个选择");
  uniqueIds(content.event.choices, "事件选择");

  for (const stage of content.stages) {
    if (!Array.isArray(stage.nodeIds)) throw new Error(`舞台${stage.id}缺少nodeIds`);
    for (const nodeId of stage.nodeIds) {
      if (!nodeIds.has(nodeId)) throw new Error(`舞台${stage.id}引用未知节点${nodeId}`);
      if (content.nodes.find((node) => node.id === nodeId).stageId !== stage.id) throw new Error(`节点${nodeId}与舞台归属不一致`);
    }
    for (const actionId of stage.availableActionIds ?? []) if (!actionIds.has(actionId)) throw new Error(`舞台${stage.id}引用未知动作${actionId}`);
  }
  for (const node of content.nodes) {
    for (const field of ["kind", "stageId", "anchorId", "label", "affordance"]) requireString(node[field], `节点${node.id}.${field}`);
    if (!stageIds.has(node.stageId)) throw new Error(`节点${node.id}引用未知舞台${node.stageId}`);
    for (const actionId of node.actionIds ?? []) if (!actionIds.has(actionId)) throw new Error(`节点${node.id}引用未知动作${actionId}`);
  }
  for (const character of content.characters) {
    requireString(character.role, `角色${character.id}.role`);
    requireString(character.label, `角色${character.id}.label`);
    if (!Array.isArray(character.visibleStates) || character.visibleStates.length === 0) throw new Error(`角色${character.id}缺少visibleStates`);
  }
  for (const action of content.actions) {
    requireString(action.stageId, `动作${action.id}.stageId`);
    requireString(action.nodeId, `动作${action.id}.nodeId`);
    if (!stageIds.has(action.stageId) || !nodeIds.has(action.nodeId)) throw new Error(`动作${action.id}引用的舞台或节点不存在`);
    if (!action.timeCost || !Number.isInteger(action.timeCost.slots) || action.timeCost.slots <= 0) throw new Error(`动作${action.id}时间消耗非法`);
    if (!Array.isArray(action.processCues) || action.processCues.length === 0) throw new Error(`动作${action.id}缺少processCues`);
    if (!Array.isArray(action.cueTypes) || action.cueTypes.length === 0) throw new Error(`动作${action.id}缺少cueTypes`);
    if (!action.cueTypes.includes("npc.react") || !action.cueTypes.includes("prop.change")) throw new Error(`动作${action.id}必须包含NPC和物件反馈`);
    if (action.skipSafe !== true) throw new Error(`动作${action.id}必须skipSafe=true`);
    for (const cue of action.processCues) {
      requireString(cue.id, `动作${action.id} Cue.id`);
      if (!CUE_TYPE_SET.has(cue.type)) throw new Error(`动作${action.id}包含未知Cue类型${cue.type}`);
    }
    for (const cueType of action.cueTypes) if (!CUE_TYPE_SET.has(cueType)) throw new Error(`动作${action.id}包含未知cueTypes${cueType}`);
    if (!characterIds.has(action.npcResponse?.characterId)) throw new Error(`动作${action.id}的npcResponse角色不存在`);
  }
  for (const choice of content.event.choices) {
    requireString(choice.label, `选择${choice.id}.label`);
    if (!Array.isArray(choice.processCues) || choice.processCues.length === 0) throw new Error(`选择${choice.id}缺少processCues`);
    for (const cueType of choice.processCues) if (!CUE_TYPE_SET.has(cueType)) throw new Error(`选择${choice.id}包含未知Cue类型${cueType}`);
  }
  if (!Array.isArray(content.event.sequence) || content.event.sequence.length === 0) throw new Error("事件缺少sequence");
  for (const cue of content.event.sequence) if (!CUE_TYPE_SET.has(cue.type)) throw new Error(`事件sequence包含未知Cue类型${cue.type}`);
  return true;
}

/** 将本地场景输入归一化；非法输入只回退到内容中的第一个合法舞台/节点。 */
export function normalizeLocalSceneIntent(content, input) {
  validateLightSceneContent(content);
  const defaultNodeId = content.nodes[0].id;
  if (!input || typeof input !== "object") return Object.freeze({ type: "scene.focus", nodeId: defaultNodeId });
  if (input.type === "scene.focus" || input.type === "scene.inspect") return Object.freeze({ type: input.type, nodeId: safeNodeId(content, input.nodeId) });
  if (input.type === "scene.transition") return Object.freeze({ type: input.type, targetStageId: safeStageId(content, input.targetStageId) });
  if (input.type === "scene.open-accessible-list" || input.type === "scene.skip-presentation") return Object.freeze({ type: input.type });
  return Object.freeze({ type: "scene.focus", nodeId: defaultNodeId, fallbackFrom: safeString(input.type, "invalid") });
}

/** 4个主动作稳定映射为quarter.plan；timeSlots严格来自JSON。 */
export function mapSceneActionToCommand(content, actionId, context = {}) {
  validateLightSceneContent(content);
  const action = findAction(content, actionId);
  if (!action) return null;
  return freeze({
    type: "quarter.plan",
    quarterId: safeString(context.quarterId, `${content.id}:quarter`),
    allocations: [{
      actionId: action.id,
      intensity: mapIntensity(action.timeCost.tier),
      timeSlots: action.timeCost.slots,
    }],
  });
}

/** 事件3个选择稳定映射为event.choose。 */
export function mapEventChoiceToCommand(content, choiceId) {
  validateLightSceneContent(content);
  const choice = findChoice(content, choiceId);
  if (!choice) return null;
  return freeze({ type: "event.choose", eventId: content.event.id, optionId: choice.id });
}

/** 从动作processCues生成表现Cue，原始顺序和payload均可重放。 */
export function createActionCues(content, actionId, context = {}) {
  validateLightSceneContent(content);
  const action = findAction(content, actionId);
  if (!action) return Object.freeze([]);
  return Object.freeze(action.processCues.map((cue, index) => cueFromSpec(cue, {
    sceneId: content.id,
    actionId: action.id,
    stageId: action.stageId,
    nodeId: action.nodeId,
    ...context,
  }, `cue:${action.id}:${index + 1}`)));
}

/** 从event sequence与choice processCues按顺序生成事件Cue。 */
export function createEventCues(content, choiceId, context = {}) {
  validateLightSceneContent(content);
  const choice = findChoice(content, choiceId);
  if (!choice) return Object.freeze([]);
  const sequence = content.event.sequence.map((cue) => cue);
  const choiceCues = choice.processCues.map((type, index) => ({ id: `choice_${choice.id}_${index + 1}`, type, text: choice.triggerText ?? "", durationMs: 450 }));
  return Object.freeze([...sequence, ...choiceCues].map((cue, index) => cueFromSpec(cue, {
    sceneId: content.id,
    eventId: content.event.id,
    choiceId: choice.id,
    stageId: content.event.stageId,
    ...context,
  }, `cue:${content.event.id}:${choice.id}:${index + 1}`)));
}

/** 跳过只改变表现时长与标记，保留顺序、类型、payload和命令之外的事实。 */
export function skipSceneCues(cues) {
  if (!Array.isArray(cues)) return Object.freeze([]);
  return Object.freeze(cues.map((cue) => freeze({ ...clone(cue), durationMs: 0, skipped: true })));
}

export function createSceneRuntimeState(content, options = {}) {
  validateLightSceneContent(content);
  const firstStage = content.stages[0];
  const stageId = safeStageId(content, options.stageId ?? firstStage.id);
  const stage = findStage(content, stageId);
  const focusedNodeId = safeNodeId(content, options.focusedNodeId ?? stage.nodeIds[0] ?? content.nodes[0].id);
  const totalSlots = content.timeAndEnergy.totalSlots;
  const actorStates = Object.fromEntries(content.characters.map((character) => [character.id, character.visibleStates[0]]));
  const propStates = Object.fromEntries(content.nodes.map((node) => [node.id, node.visualStates?.[0] ?? node.affordance]));
  return freeze({
    schemaVersion: LIGHT_SCENE_CONTRACT_VERSION,
    contentId: content.id,
    sceneId: content.timeAndEnergy.sceneId,
    stageId,
    focusedNodeId,
    usedTimeSlots: safeInteger(options.usedTimeSlots, 0, 0, totalSlots),
    actorStates,
    propStates,
    completedActionIds: [],
    eventChoiceIds: [],
    presentation: { reducedMotion: options.reducedMotion === true, skipped: false },
  });
}

function applyIntent(content, state, intent) {
  const normalized = normalizeLocalSceneIntent(content, intent);
  if (normalized.type === "scene.focus" || normalized.type === "scene.inspect") {
    const node = findNode(content, normalized.nodeId);
    return { ...state, stageId: node.stageId, focusedNodeId: node.id };
  }
  if (normalized.type === "scene.transition") {
    const stage = findStage(content, normalized.targetStageId);
    return { ...state, stageId: stage.id, focusedNodeId: stage.nodeIds[0] ?? content.nodes[0].id };
  }
  if (normalized.type === "scene.skip-presentation") return { ...state, presentation: { ...state.presentation, skipped: true } };
  return state;
}

function applyAction(content, state, actionId) {
  const action = findAction(content, actionId);
  if (!action) return state;
  const completedActionIds = state.completedActionIds.includes(action.id) ? state.completedActionIds : [...state.completedActionIds, action.id];
  return {
    ...state,
    stageId: action.stageId,
    focusedNodeId: action.nodeId,
    usedTimeSlots: state.usedTimeSlots + action.timeCost.slots,
    completedActionIds,
  };
}

function applyChoice(state, choiceId) {
  const eventChoiceIds = state.eventChoiceIds.includes(choiceId) ? state.eventChoiceIds : [...state.eventChoiceIds, choiceId];
  return { ...state, eventChoiceIds };
}

function actionAvailability(content, state, actionId) {
  const action = findAction(content, actionId);
  const remainingSlots = content.timeAndEnergy.totalSlots - state.usedTimeSlots;
  if (!action) return { available: false, reason: "unknown-action", remainingSlots, costSlots: 0 };
  const costSlots = action.timeCost.slots;
  if (state.completedActionIds.includes(action.id)) return { available: false, reason: "already-completed", remainingSlots, costSlots };
  if (remainingSlots < costSlots) return { available: false, reason: "insufficient-time", remainingSlots, costSlots };
  return { available: true, reason: null, remainingSlots, costSlots };
}

/** 最小引擎无关端口：返回命令给Gateway，不在本模块修改模拟事实。 */
export function createSceneRuntimePort(content, options = {}) {
  validateLightSceneContent(content);
  let state = createSceneRuntimeState(content, options);
  const listeners = new Set();
  const notify = (event) => { for (const listener of listeners) listener(clone(event)); };
  const update = (nextState, event) => { state = freeze(nextState); const result = { state: clone(state), ...event }; notify(result); return result; };
  return Object.freeze({
    getState() { return clone(state); },
    getStages() { return clone(content.stages); },
    getNodes(stageId) { return clone(content.nodes.filter((node) => !stageId || node.stageId === safeStageId(content, stageId))); },
    getCharacters() { return clone(content.characters); },
    getActions(nodeId) { return clone(content.actions.filter((action) => !nodeId || action.nodeId === safeNodeId(content, nodeId))); },
    getActionAvailability(actionId) { return freeze(actionAvailability(content, state, actionId)); },
    dispatchIntent(input) {
      const intent = normalizeLocalSceneIntent(content, input);
      return update(applyIntent(content, state, intent), { kind: "intent", intent, cues: [] });
    },
    prepareAction(actionId, context = {}) {
      const action = findAction(content, actionId);
      const availability = actionAvailability(content, state, actionId);
      if (!action || !availability.available) return { state: clone(state), command: null, cues: [], rejected: true, reason: availability.reason };
      return update(applyAction(content, state, action.id), {
        kind: "action",
        actionId: action.id,
        command: mapSceneActionToCommand(content, action.id, context),
        cues: createActionCues(content, action.id, context),
        rejected: false,
      });
    },
    prepareEventChoice(choiceId, context = {}) {
      const choice = findChoice(content, choiceId);
      if (!choice) return { state: clone(state), command: null, cues: [], rejected: true };
      return update(applyChoice(state, choice.id), {
        kind: "event-choice",
        choiceId: choice.id,
        command: mapEventChoiceToCommand(content, choice.id),
        cues: createEventCues(content, choice.id, context),
        rejected: false,
      });
    },
    skipPresentation(cues = []) {
      return update({ ...state, presentation: { ...state.presentation, skipped: true } }, { kind: "skip-presentation", cues: skipSceneCues(cues) });
    },
    subscribe(listener) {
      if (typeof listener !== "function") return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
}

export function validateSceneRuntimeState(content, state) {
  validateLightSceneContent(content);
  requireObject(state, "SceneRuntime状态");
  if (state.schemaVersion !== LIGHT_SCENE_CONTRACT_VERSION) throw new RangeError("SceneRuntime schemaVersion不匹配");
  if (state.contentId !== content.id) throw new RangeError("SceneRuntime contentId不匹配");
  if (state.sceneId !== content.timeAndEnergy.sceneId) throw new RangeError("SceneRuntime sceneId不匹配");
  if (!content.stages.some((stage) => stage.id === state.stageId)) throw new RangeError(`未知舞台：${state.stageId}`);
  if (!content.nodes.some((node) => node.id === state.focusedNodeId)) throw new RangeError(`未知节点：${state.focusedNodeId}`);
  if (!Number.isInteger(state.usedTimeSlots) || state.usedTimeSlots < 0 || state.usedTimeSlots > content.timeAndEnergy.totalSlots) throw new RangeError("usedTimeSlots超出内容定义范围");
  if (!Array.isArray(state.completedActionIds) || state.completedActionIds.some((id) => !content.actions.some((action) => action.id === id))) throw new RangeError("completedActionIds包含未知动作");
  if (!Array.isArray(state.eventChoiceIds) || state.eventChoiceIds.some((id) => !content.event.choices.some((choice) => choice.id === id))) throw new RangeError("eventChoiceIds包含未知选择");
  if (!state.presentation || typeof state.presentation.reducedMotion !== "boolean" || typeof state.presentation.skipped !== "boolean") throw new TypeError("presentation状态非法");
  return true;
}
