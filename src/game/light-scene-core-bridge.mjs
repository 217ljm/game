import {
  resumeLife,
  submitLifeChoice,
  validateGameSession,
} from "./game-application.mjs";

const SUCCESS_STATUSES = new Set(["success", "ok", "committed", "accepted"]);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function blocked(code, reason, details = {}) {
  return { ok: false, status: "blocked", blocked: { code, reason, details } };
}

function isSuccessfulEntry(entry) {
  if (!entry || entry.ok === false || entry.rejected === true || entry.success === false) return false;
  return !entry.status || SUCCESS_STATUSES.has(entry.status);
}

function contentIndex(content) {
  const actions = Array.isArray(content?.actions) ? content.actions : [];
  const bySceneId = new Map(actions.map((action) => [action.id, action]));
  const byCoreId = new Map(actions.map((action) => [action.coreActionId, action]));
  const choices = new Map((content?.event?.choices ?? []).map((choice) => [choice.id, choice]));
  return { actions, bySceneId, byCoreId, choices };
}

function normalizeCommand(command) {
  if (!command || typeof command !== "object") return null;
  if (command.type === "quarter.plan") {
    return {
      type: command.type,
      ...(command.quarterId ? { quarterId: command.quarterId } : {}),
      allocations: (Array.isArray(command.allocations) ? command.allocations : []).map((allocation) => ({
        actionId: allocation.actionId,
        ...(allocation.intensity ? { intensity: allocation.intensity } : {}),
        ...(allocation.timeSlots !== undefined ? { timeSlots: allocation.timeSlots } : {}),
      })),
    };
  }
  if (command.type === "event.choose") {
    return {
      type: command.type,
      eventId: command.eventId,
      optionId: command.optionId,
    };
  }
  return { type: command.type };
}

function journalEntryCommand(entry) {
  return normalizeCommand(entry?.command ?? (entry?.type ? entry : null));
}

/**
 * Convert successful scene commands into one deterministic Core quarter.plan.
 * Scene action IDs are only used for lookup; the emitted allocation IDs are
 * always canonical content `coreActionId`s.
 */
export function aggregateSceneJournal(journal, content) {
  if (!Array.isArray(journal)) return blocked("invalid-journal", "commandJournal 必须是数组");
  const { bySceneId, byCoreId, choices } = contentIndex(content);
  const allocations = [];
  const completedActionIds = [];
  const eventChoiceIds = [];
  const normalizedEntries = [];
  const seenCoreIds = new Set();

  for (const [index, entry] of journal.entries()) {
    const command = journalEntryCommand(entry);
    if (!command) return blocked("invalid-journal-entry", "commandJournal 包含无法识别的命令", { index });
    if (!isSuccessfulEntry(entry)) continue;

    if (command.type === "quarter.plan") {
      if (!Array.isArray(command.allocations) || command.allocations.length !== 1) {
        return blocked("invalid-quarter-command", "每个场景主行动必须对应一个 quarter.plan allocation", { index });
      }
      const allocation = command.allocations[0];
      const action = entry.actionId ? bySceneId.get(entry.actionId) : byCoreId.get(allocation.actionId);
      if (!action || !action.coreActionId) {
        return blocked("unknown-scene-action", "主行动没有映射到 canonical coreActionId", { index, actionId: entry.actionId, allocationActionId: allocation.actionId });
      }
      if (allocation.actionId !== action.coreActionId) {
        return blocked("core-action-mismatch", "command allocation 必须使用 canonical coreActionId", { index, expected: action.coreActionId, received: allocation.actionId });
      }
      normalizedEntries.push({ type: "quarter.plan", actionId: action.id, command: normalizeCommand(command) });
      if (!seenCoreIds.has(action.coreActionId)) {
        seenCoreIds.add(action.coreActionId);
        completedActionIds.push(action.id);
        allocations.push(clone(allocation));
      }
      continue;
    }

    if (command.type === "event.choose") {
      if (command.eventId !== content?.event?.id || !choices.has(command.optionId)) {
        return blocked("invalid-event-command", "event.choose 只能记录当前轻场景的有效选项", { index, eventId: command.eventId, optionId: command.optionId });
      }
      normalizedEntries.push({ type: "event.choose", choiceId: command.optionId, command: normalizeCommand(command) });
      if (!eventChoiceIds.includes(command.optionId)) eventChoiceIds.push(command.optionId);
      continue;
    }

    normalizedEntries.push({ type: command.type, command: normalizeCommand(command) });
  }

  const command = { type: "quarter.plan", allocations };
  const journalSummary = {
    schemaVersion: 1,
    entryCount: normalizedEntries.length,
    entries: normalizedEntries,
    quarterCoreActionIds: allocations.map((allocation) => allocation.actionId),
    eventChoiceIds: [...eventChoiceIds],
  };
  journalSummary.journalDigest = stableStringify(journalSummary);
  return {
    ok: true,
    command,
    allocations,
    completedActionIds,
    eventChoiceIds,
    journalSummary,
  };
}

function getPendingCoreActionSet(pending) {
  return new Map((Array.isArray(pending?.options) ? pending.options : []).map((option) => [option.id, option]));
}

function validateCommitGate(result, aggregate) {
  const pending = result?.pendingDecision;
  if (!pending || pending.kind !== "quarter_plan") {
    return blocked("pending-kind", "当前 Core pending 不是 quarter_plan", { kind: pending?.kind ?? null });
  }
  if (pending.calendarYear !== 1984 || pending.age !== 6 || pending.quarter !== 3) {
    return blocked("pending-context", "轻场景只允许提交 1984 年、6 岁、第三季度", {
      calendarYear: pending.calendarYear,
      age: pending.age,
      quarter: pending.quarter,
    });
  }
  const options = getPendingCoreActionSet(pending);
  for (const coreActionId of aggregate.allocations.map((allocation) => allocation.actionId)) {
    const option = options.get(coreActionId);
    if (!option || option.available === false || option.isPlanControl) {
      return blocked("unavailable-core-action", "场景行动映射后的 Core action 不在当前 pending 可用选项中", { coreActionId });
    }
  }
  const count = aggregate.allocations.length;
  const min = Number(pending.minActivities ?? pending.minOptions ?? 0);
  const max = Number(pending.maxActivities ?? pending.maxOptions ?? Infinity);
  if (count < min || count > max) {
    return blocked("activity-count", "去重后的主行动数量不符合当前季度的 min/max", { count, min, max });
  }
  if (!count) return blocked("activity-count", "至少需要一个成功的主行动", { count, min, max });
  return { ok: true };
}

function createSceneRecord(content, aggregate) {
  const longTermFactCandidates = [];
  const addFacts = (facts = []) => {
    for (const fact of facts) if (fact && !longTermFactCandidates.includes(fact)) longTermFactCandidates.push(fact);
  };
  for (const actionId of aggregate.completedActionIds) addFacts(content.actions.find((action) => action.id === actionId)?.longTermFactCandidates);
  for (const choiceId of aggregate.eventChoiceIds) addFacts(content.event?.choices?.find((choice) => choice.id === choiceId)?.longTermFactCandidates);
  return {
    schemaVersion: 1,
    contentId: content.id,
    contentVersion: content.version,
    completedActionIds: [...aggregate.completedActionIds],
    coreActionIds: aggregate.allocations.map((allocation) => allocation.actionId),
    eventChoiceIds: [...aggregate.eventChoiceIds],
    longTermFactCandidates,
    commandJournalSummary: clone(aggregate.journalSummary),
  };
}

/**
 * Commit a light-scene journal to the existing life Core exactly once.
 * event.choose commands are deliberately kept in the scene sidecar and are
 * never submitted as legacy Core choices.
 */
export function commitSceneJournalToLife(data, session, result, journal, content) {
  const aggregate = aggregateSceneJournal(journal, content);
  if (!aggregate.ok) return { ...aggregate, session, result };
  const gate = validateCommitGate(result, aggregate);
  if (!gate.ok) return { ...gate, session, result, command: aggregate.command };
  try {
    validateGameSession(session);
    const committed = submitLifeChoice(data, session, result, aggregate.command);
    const nextSession = clone(committed.session);
    const sceneRecord = createSceneRecord(content, aggregate);
    nextSession.sceneRecords = { ...(nextSession.sceneRecords ?? {}), [content.id]: sceneRecord };
    validateGameSession(nextSession);
    resumeLife(data, nextSession);
    return {
      ok: true,
      status: "committed",
      command: aggregate.command,
      completedActionIds: aggregate.completedActionIds,
      eventChoiceIds: aggregate.eventChoiceIds,
      sceneRecord,
      session: nextSession,
      result: committed.result,
      recovery: { validated: true, resumed: true },
    };
  } catch (error) {
    return blocked("commit-failed", "提交后存档未能通过 Core 校验或恢复检查", { message: error?.message ?? String(error) });
  }
}

export function canCommitSceneJournalToLife(result, journal, content) {
  const aggregate = aggregateSceneJournal(journal, content);
  if (!aggregate.ok) return aggregate;
  const gate = validateCommitGate(result, aggregate);
  return gate.ok ? { ok: true, command: aggregate.command } : gate;
}
