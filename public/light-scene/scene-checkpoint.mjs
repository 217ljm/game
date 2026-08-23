/**
 * 轻场景独立检查点。
 * 不读取或覆盖旧的人生存档，只使用本场景专用key。
 */
import { validateSceneRuntimeState } from "../../src/game/light-scene-contract.mjs";

export const LIGHT_SCENE_CHECKPOINT_KEY = "people-life:light-scene:yard-1984:v1";
export const LIGHT_SCENE_CHECKPOINT_VERSION = 1;

function clone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function storageOrNull(storage) {
  if (storage && typeof storage.getItem === "function" && typeof storage.setItem === "function") return storage;
  try {
    if (typeof globalThis.localStorage !== "undefined") return globalThis.localStorage;
  } catch {
    return null;
  }
  return null;
}

function isPlainObject(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }

function canonicalFactIds(content) {
  return new Set([
    ...content.actions.flatMap((action) => action.longTermFactCandidates ?? []),
    ...content.event.choices.flatMap((choice) => choice.longTermFactCandidates ?? []),
  ]);
}

function validateJournal(commandJournal, content, runtimeState) {
  let expectedSequence = 1;
  for (const entry of commandJournal) {
    if (!isPlainObject(entry) || entry.sequence !== expectedSequence || (entry.kind !== "action" && entry.kind !== "event-choice") || !isPlainObject(entry.command)) throw new Error("commandJournal序列、kind或command非法");
    expectedSequence += 1;
    if (entry.kind === "action") {
      const action = content.actions.find((item) => item.id === entry.actionId);
      if (!action || entry.command.type !== "quarter.plan" || !Array.isArray(entry.command.allocations) || entry.command.allocations.length !== 1) throw new Error("action journal命令非法");
      if (entry.command.allocations[0].actionId !== action.coreActionId || entry.command.allocations[0].timeSlots !== action.corePlan?.timeSlots || entry.command.allocations[0].intensity !== action.corePlan?.intensity) throw new Error("action journal命令与内容不一致");
    } else {
      const choice = content.event.choices.find((item) => item.id === entry.choiceId);
      if (!choice || entry.command.type !== "event.choose" || entry.command.eventId !== content.event.id || entry.command.optionId !== choice.id) throw new Error("event-choice journal命令非法");
    }
    if (Object.keys(entry).some((key) => ["sequence", "kind", "actionId", "choiceId", "command"].includes(key) === false)) throw new Error("commandJournal包含非确定性字段");
    if (Object.keys(entry.command).some((key) => !["type", "quarterId", "allocations", "eventId", "optionId"].includes(key))) throw new Error("command包含未知字段");
  }
  const eventTriggeredByJournal = commandJournal.some((entry) => entry.kind === "action" && entry.actionId === content.event.trigger.afterActionId);
  if (runtimeState.eventChoiceIds.length > 0 && !eventTriggeredByJournal) throw new Error("事件选择存在但eventTriggered动作缺失");
  return eventTriggeredByJournal;
}

export function validateCheckpoint(checkpoint, content) {
  if (!isPlainObject(checkpoint)) throw new TypeError("轻场景检查点必须是对象");
  if (checkpoint.version !== LIGHT_SCENE_CHECKPOINT_VERSION) throw new RangeError("轻场景检查点版本不匹配");
  if (!content || typeof content.id !== "string" || checkpoint.contentId !== content.id) throw new RangeError("轻场景检查点内容不匹配");
  if (!Number.isInteger(checkpoint.contentVersion) || checkpoint.contentVersion !== content.version) throw new RangeError("轻场景检查点内容版本不匹配");
  if (!isPlainObject(checkpoint.runtimeState)) throw new TypeError("轻场景检查点缺少runtimeState");
  validateSceneRuntimeState(content, checkpoint.runtimeState);
  if (!Array.isArray(checkpoint.commandJournal)) throw new TypeError("轻场景检查点commandJournal非法");
  if (typeof checkpoint.eventTriggered !== "boolean" || typeof checkpoint.eventResolved !== "boolean") throw new TypeError("轻场景事件状态非法");
  const eventTriggeredByJournal = validateJournal(checkpoint.commandJournal, content, checkpoint.runtimeState);
  if (checkpoint.eventTriggered !== eventTriggeredByJournal) throw new Error("eventTriggered与commandJournal不一致");
  if (checkpoint.eventResolved !== (checkpoint.runtimeState.eventChoiceIds.length > 0)) throw new Error("eventResolved与runtimeState不一致");
  if (!Array.isArray(checkpoint.triggeredFactIds)) throw new TypeError("triggeredFactIds必须是数组");
  if (new Set(checkpoint.triggeredFactIds).size !== checkpoint.triggeredFactIds.length) throw new Error("triggeredFactIds必须去重");
  const knownFacts = canonicalFactIds(content);
  if (checkpoint.triggeredFactIds.some((factId) => typeof factId !== "string" || !knownFacts.has(factId))) throw new Error("triggeredFactIds包含非canonical事实");
  if (!isPlainObject(checkpoint.motion) || typeof checkpoint.motion.mode !== "string") throw new TypeError("轻场景motion状态非法");
  if (!isPlainObject(checkpoint.sound) || typeof checkpoint.sound.enabled !== "boolean") throw new TypeError("轻场景sound状态非法");
  return true;
}

export function createCheckpoint({ content, runtimeState, commandJournal = [], eventTriggered = false, eventResolved = false, motion = {}, sound = {}, triggeredFactIds = [] }) {
  if (!content || typeof content.id !== "string") throw new TypeError("创建检查点需要内容对象");
  const checkpoint = {
    version: LIGHT_SCENE_CHECKPOINT_VERSION,
    contentId: content.id,
    contentVersion: content.version,
    runtimeState: clone(runtimeState),
    commandJournal: clone(commandJournal),
    eventTriggered: Boolean(eventTriggered),
    eventResolved: Boolean(eventResolved),
    motion: { mode: motion.mode === "off" || motion.mode === "reduced" ? motion.mode : "full" },
    sound: { enabled: sound.enabled !== false },
    triggeredFactIds: Array.isArray(triggeredFactIds) ? [...new Set(triggeredFactIds)] : [],
  };
  validateCheckpoint(checkpoint, content);
  return checkpoint;
}

export function saveCheckpoint(checkpoint, content, storage) {
  validateCheckpoint(checkpoint, content);
  const target = storageOrNull(storage);
  if (!target) return false;
  try {
    target.setItem(LIGHT_SCENE_CHECKPOINT_KEY, JSON.stringify(checkpoint));
    return true;
  } catch {
    return false;
  }
}

export function loadCheckpoint(content, storage) {
  const target = storageOrNull(storage);
  if (!target) return null;
  let raw;
  try {
    raw = target.getItem(LIGHT_SCENE_CHECKPOINT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const checkpoint = JSON.parse(raw);
    validateCheckpoint(checkpoint, content);
    return checkpoint;
  } catch {
    try { target.removeItem(LIGHT_SCENE_CHECKPOINT_KEY); } catch { /* 存储不可写时静默降级 */ }
    return null;
  }
}

export function clearCheckpoint(storage) {
  const target = storageOrNull(storage);
  if (!target) return false;
  try {
    target.removeItem(LIGHT_SCENE_CHECKPOINT_KEY);
    return true;
  } catch {
    return false;
  }
}
