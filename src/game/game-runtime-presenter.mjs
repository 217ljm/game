/**
 * Game Runtime presentation adapter.
 *
 * This module is deliberately free of DOM, storage, asset paths and RNG. It
 * turns an Engine/Gateway reply into a small, serialisable view for Phaser
 * and turns two such views into disposable presentation cues.
 */

const PROTOCOL = "game-runtime-snapshot-v2";
const CUE_TYPES = Object.freeze([
  "screen.enter",
  "action.scheduled",
  "action.resolve",
  "resource.delta",
  "person.react",
  "event.interrupt",
  "month.advance",
  "quarter.complete",
  "year.advance",
]);

const STAGE_LABELS = Object.freeze({
  childhood: "童年",
  primary: "小学阶段",
  adolescence: "青少年",
  youth: "升学与初职",
  adult: "成年人生",
});

const FAMILY_RELATION_LABELS = Object.freeze({
  mother: "母亲",
  father: "父亲",
  grandmother: "奶奶/外婆",
  grandfather: "爷爷/外公",
});

const INTEREST_STAGE_LABELS = Object.freeze({
  exposure: "偶尔接触",
  emerging: "兴趣萌芽",
  hobby: "稳定爱好",
  lasting: "长期爱好",
});

const MODULE_FALLBACKS = Object.freeze({
  learning: "life.module.learning",
  education: "life.module.learning",
  social: "life.module.relationships",
  relationships: "life.module.relationships",
  family: "life.module.family",
  household: "life.module.family",
  daily: "life.module.daily",
  health: "life.module.daily",
  recovery: "life.module.daily",
  entertainment: "life.module.interests",
  exploration: "life.module.interests",
  creative: "life.module.interests",
});

function copy(value) {
  if (value === undefined) return undefined;
  return structuredClone(value);
}

function finite(value, fallback = null) {
  return Number.isFinite(value) ? value : fallback;
}

function annualRecords(result) {
  const staged = Object.values(result?.stages ?? {}).flatMap((stage) => stage?.annualRecords ?? []);
  const current = Array.isArray(result?.currentState?.annualRecords) ? result.currentState.annualRecords : [];
  const byLifeYear = new Map();
  for (const record of [...staged, ...current]) {
    const key = `${record?.calendarYear ?? "unknown"}:age${record?.age ?? "unknown"}`;
    const existing = byLifeYear.get(key);
    if (!existing || (record?.quarterRecords?.length ?? 0) >= (existing?.quarterRecords?.length ?? 0)) {
      byLifeYear.set(key, record);
    }
  }
  return [...byLifeYear.values()].sort((left, right) => (
    finite(left?.calendarYear, 0) - finite(right?.calendarYear, 0)
    || finite(left?.age, 0) - finite(right?.age, 0)
  ));
}

function latestRecord(result) {
  return annualRecords(result).at(-1) ?? null;
}

function pendingQuarter(result) {
  const pending = result?.pendingDecision;
  return finite(pending?.quarter, null);
}

function currentLocator(result) {
  const pending = result?.pendingDecision;
  const record = latestRecord(result);
  const quarter = pendingQuarter(result)
    ?? record?.quarterRecords?.at(-1)?.quarter
    ?? null;
  return {
    calendarYear: finite(pending?.calendarYear, record?.calendarYear ?? result?.profile?.person?.birthYear ?? null),
    age: finite(pending?.age, record?.age ?? result?.currentState?.currentAge ?? null),
    quarter,
    monthInQuarter: finite(pending?.monthInQuarter, null),
  };
}

function stateResources(result) {
  const state = result?.currentState ?? {};
  const model = state.characterModel ?? {};
  const modelState = model.state ?? {};
  const finance = state.householdFinance ?? state.finance ?? result?.profile?.household?.finance ?? {};
  const visible = result?.profile?.visibleStats ?? {};
  const values = model.attributes ?? {};
  return {
    health: finite(values.health, visible.health?.value),
    mood: finite(modelState.mood, visible.mood?.value),
    stress: finite(modelState.stress, null),
    fatigue: finite(modelState.fatigue, null),
    energy: finite(modelState.quarterEnergy, null),
    cashYuan: finite(finance.cashSavingsYuan, finance.cashYuan ?? finance.cash ?? null),
    householdIncomeYuan: finite(finance.annualHouseholdIncomeYuan, null),
  };
}

function resourceView(result, budget) {
  const state = result?.currentState ?? {};
  const modelState = state.characterModel?.state ?? {};
  const finance = state.householdFinance ?? state.finance ?? result?.profile?.household?.finance ?? {};
  const missing = [];
  const number = (value, key) => {
    if (Number.isFinite(value)) return value;
    missing.push(key);
    return 0;
  };
  return {
    resources: {
      availableTimeSlots: number(budget?.availableTimeSlots, "availableTimeSlots"),
      totalTimeSlots: number(budget?.totalTimeSlots, "totalTimeSlots"),
      availableEnergy: number(budget?.availableEnergy, "availableEnergy"),
      maxEnergy: number(budget?.availableEnergy ?? modelState.quarterEnergy, "maxEnergy"),
      cashYuan: number(finance.cashSavingsYuan ?? finance.cashYuan ?? finance.cash, "cashYuan"),
    },
    missing,
  };
}

function monthFromResult(result) {
  const quarter = latestRecord(result)?.quarterRecords?.at(-1);
  return quarter?.monthTicks?.at(-1)?.monthInQuarter
    ?? quarter?.monthSimulation?.monthTicks?.at(-1)?.monthInQuarter
    ?? null;
}

function moodView(result) {
  const state = result?.currentState?.characterModel?.state ?? {};
  const mood = finite(state.mood, 50);
  if ((state.stress ?? 0) >= 60) return "worried";
  if ((state.fatigue ?? 0) >= 60) return "tired";
  if (mood >= 70) return "happy";
  return "calm";
}

function responseText(result, pending) {
  return pending?.prompt
    ?? latestRecord(result)?.quarterRecords?.at(-1)?.experience
    ?? "这一季度的生活正在展开。";
}

function visualKey(result, age) {
  const sex = result?.profile?.person?.sex === "female" ? "female" : "male";
  const band = age <= 11 ? "child" : age <= 24 ? "youth" : age <= 59 ? "adult" : "elder";
  return `character.${band}.${sex}`;
}

function identity(result, locator) {
  const person = result?.profile?.person ?? {};
  return {
    personId: person.id ?? null,
    name: person.name ?? null,
    sex: person.sex ?? null,
    residence: result?.currentState?.residence ?? person.residence ?? null,
    stage: result?.stage ?? null,
    stageLabel: STAGE_LABELS[result?.stage] ?? result?.stage ?? null,
    age: locator.age,
    calendarYear: locator.calendarYear,
  };
}

function actionView(option, registered, draftEntry, budget) {
  const action = registered?.get(option?.id) ?? {};
  const unavailableReason = option?.unavailableReason ?? option?.resourceBlockedReason ?? null;
  const allocation = draftEntry ?? null;
  const timeSlots = finite(option?.timeSlots, finite(allocation?.timeSlots, null));
  const energyCost = finite(option?.energyCost, finite(allocation?.energyCost, null));
  const cashCostYuan = finite(option?.cashCostYuan, null);
  const blockedBy = [];
  if (option?.available === false || unavailableReason) blockedBy.push(unavailableReason ?? "当前不可执行");
  if (budget && finite(budget.availableTimeSlots) != null && timeSlots != null && timeSlots > budget.availableTimeSlots) blockedBy.push("时间不足");
  if (budget && finite(budget.availableEnergy) != null && energyCost != null && energyCost > budget.availableEnergy + 3) blockedBy.push("精力不足");
  if (budget && finite(budget.availableCashYuan) != null && cashCostYuan != null && cashCostYuan > budget.availableCashYuan) blockedBy.push("现金不足");
  const roleLabels = { caregiver: "照看者", neighborhood_friend: "附近同伴", primary_teacher: "老师" };
  return {
    id: option?.id ?? action.id ?? null,
    label: option?.label ?? option?.text ?? action.label ?? option?.id ?? action.id ?? null,
    description: option?.description ?? action.description ?? null,
    moduleId: action.moduleId ?? option?.moduleId ?? MODULE_FALLBACKS[option?.category] ?? null,
    targetRoleId: action.targetRoleId ?? option?.targetRoleId ?? null,
    available: blockedBy.length === 0,
    blockedBy,
    costs: { timeSlots, energy: energyCost, cashYuan: cashCostYuan },
    intensity: allocation?.intensity ?? null,
    selected: Boolean(allocation),
    targetLabel: roleLabels[action.targetRoleId ?? option?.targetRoleId] ?? "",
  };
}

function buildDraft(result, session, draft, eventId) {
  const persisted = session?.quarterPlans?.[eventId] ?? null;
  const source = draft?.eventId === eventId ? draft : persisted;
  const allocations = Array.isArray(source?.allocations)
    ? source.allocations
    : (Array.isArray(source?.activityIds) ? source.activityIds.map((actionId) => ({ actionId, intensity: "regular" })) : []);
  return {
    eventId: eventId ?? null,
    allocations: copy(allocations),
    source: draft?.eventId === eventId ? "draft" : (persisted ? "session" : "none"),
    controlMode: source?.controlMode ?? null,
  };
}

function moduleViews(registry, actions) {
  const byModule = new Map();
  for (const entry of actions ?? []) {
    byModule.set(entry.moduleId, (byModule.get(entry.moduleId) ?? []).concat(entry));
  }
  return (registry?.modules ?? []).map((module) => ({
    id: module.id,
    label: module.label ?? module.id,
    description: module.description ?? null,
    actionIds: (byModule.get(module.id) ?? []).map((entry) => entry.id),
    availableCount: (byModule.get(module.id) ?? []).filter((entry) => entry.available).length,
    lockedCount: (byModule.get(module.id) ?? []).filter((entry) => !entry.available).length,
  }));
}

function peopleView(result) {
  const state = result?.currentState ?? {};
  const candidates = state.socialNetwork
    ?? state.people
    ?? state.socialCharacters
    ?? state.relationships
    ?? [];
  const source = Array.isArray(candidates) ? candidates : Object.values(candidates ?? {});
  const people = source.map((person) => ({
    id: person.id ?? person.roleId ?? null,
    roleId: person.roleId ?? person.role ?? null,
    label: person.displayName ?? person.name ?? person.label ?? person.roleLabel ?? null,
  }));
  const caregiver = (state.household?.members ?? []).find((member) => ["mother", "father"].includes(member.relation));
  if (caregiver && !people.some((person) => person.roleId === "caregiver")) {
    people.unshift({
      id: caregiver.id ?? "family-caregiver",
      roleId: "caregiver",
      label: FAMILY_RELATION_LABELS[caregiver.relation] ?? "照看你的人",
    });
  }
  return people;
}

function quarterNumber(value, fallback = 1) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 4 ? number : fallback;
}

function monthNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 3 ? number : fallback;
}

function latestCompletedQuarter(result) {
  const record = latestRecord(result);
  const quarter = [...(record?.quarterRecords ?? [])]
    .reverse()
    .find((entry) => (entry?.monthTicks?.length ?? entry?.monthSimulation?.monthTicks?.length ?? 0) === 3);
  return quarter ? { record, quarter } : null;
}

function runtimeQuarterKey(record, quarter) {
  if (!record || !quarter) return null;
  return `quarter:${record.calendarYear}:age${record.age}:Q${quarter.quarter}`;
}

function isRuntimeEventPending(pending) {
  if (!pending?.eventId || !Array.isArray(pending.options)) return false;
  if (["random_life_event", "mainline_event"].includes(pending.kind)) return true;
  // Older deterministic stage events predate the explicit `kind` field. They
  // are still real Core choices and must enter the event screen, not vanish.
  return pending.kind == null && pending.options.length > 0;
}

function eventView(result, pending) {
  if (!isRuntimeEventPending(pending)) return null;
  const currentQuarter = latestRecord(result)?.quarterRecords?.find((entry) => entry.quarter === pending.quarter);
  return {
    eventId: pending.eventId,
    eventTemplateId: pending.eventTemplateId ?? null,
    title: pending.title ?? "生活发生了变化",
    prompt: pending.prompt ?? "这件事打断了原来的节奏。",
    calendarYear: finite(pending.calendarYear, 0),
    age: finite(pending.age, 0),
    quarter: quarterNumber(pending.quarter),
    monthInQuarter: monthNumber(pending.monthInQuarter, 1),
    options: (pending.options ?? []).map((option) => ({
      id: option.id,
      label: option.label ?? option.text ?? option.id,
      description: option.description ?? "",
      effectSummary: option.effectSummary ?? null,
      planImpact: copy(option.planImpact ?? null),
    })),
    affectedActionIds: copy(currentQuarter?.activityIds ?? []),
    affectedActions: (currentQuarter?.activities ?? []).map((activity) => ({
      id: activity.id,
      label: activity.label ?? activity.id,
    })),
  };
}

function monthTickView(tick) {
  return {
    monthInQuarter: monthNumber(tick?.monthInQuarter, 1),
    calendarMonth: finite(tick?.calendarMonth, 1),
    status: ["active", "interrupted", "overdrawn", "resting"].includes(tick?.status)
      ? tick.status
      : "resting",
    narrative: tick?.narrative ?? "这个月按既定生活继续。",
    energyAvailable: finite(tick?.energyAvailable, 0),
    energySpent: finite(tick?.energySpent, 0),
    energyRemaining: finite(tick?.energyRemaining, 0),
    actions: (tick?.actions ?? []).map((action) => ({
      actionId: action.actionId,
      label: action.label ?? action.actionId,
      status: action.status === "partly_completed" ? "partly_completed" : "completed",
      executedShare: finite(action.executedShare, 0),
      energyCost: finite(action.energyCost, 0),
    })),
    interruption: tick?.interruption ? {
      severity: tick.interruption.severity ?? "minor",
      reason: tick.interruption.reason ?? "临时情况改变了原计划",
    } : null,
  };
}

function quarterExecutionView(result) {
  const completed = latestCompletedQuarter(result);
  if (!completed) return null;
  const { record, quarter } = completed;
  return {
    key: runtimeQuarterKey(record, quarter),
    calendarYear: finite(record.calendarYear, 0),
    age: finite(record.age, 0),
    quarter: quarterNumber(quarter.quarter),
    quarterLabel: quarter.label ?? `第${quarter.quarter}季度`,
    operationLabel: quarter.operationLabel ?? "这一季度的生活",
    activityIds: copy(quarter.activityIds ?? []),
    activities: (quarter.activities ?? []).map((activity) => ({ id: activity.id, label: activity.label ?? activity.id })),
    months: (quarter.monthTicks ?? quarter.monthSimulation?.monthTicks ?? []).map(monthTickView),
  };
}

function quarterResultView(result) {
  const completed = latestCompletedQuarter(result);
  if (!completed) return null;
  const { record, quarter } = completed;
  const relationshipChanges = (quarter.activityResults ?? []).filter((entry) => (
    entry?.relationshipChange != null
    || entry?.sharedMemory != null
    || entry?.personId != null
    || entry?.roleId != null
  ));
  return {
    key: runtimeQuarterKey(record, quarter),
    calendarYear: finite(record.calendarYear, 0),
    age: finite(record.age, 0),
    quarter: quarterNumber(quarter.quarter),
    operationLabel: quarter.operationLabel ?? "这一季度的生活",
    activityIds: copy(quarter.activityIds ?? []),
    activities: (quarter.activities ?? []).map((activity) => ({ id: activity.id, label: activity.label ?? activity.id })),
    executionRate: finite(quarter.executionRate, 1),
    executedTimeSlots: finite(quarter.executedTimeSlots ?? quarter.timeSlotsUsed, 0),
    plannedTimeSlots: finite(quarter.plannedTimeSlots, 0),
    energySpent: finite(quarter.executedEnergySpent ?? quarter.energySpent, 0),
    energyRemaining: finite(quarter.energyRemaining, 0),
    overdraftEnergy: finite(quarter.overdraftEnergy, 0),
    interestChanges: copy(quarter.interestChanges ?? {}),
    growthChanges: copy(quarter.growthChanges ?? {}),
    characterGrowth: copy(quarter.characterGrowth ?? {}),
    relationshipChanges: copy(relationshipChanges),
    randomEventResults: copy(quarter.randomEventResults ?? []),
    planInterruption: copy(quarter.planInterruption ?? null),
    activityResults: copy(quarter.activityResults ?? []),
  };
}

function yearReviewView(result, pending) {
  if (pending?.kind !== "year_review") return null;
  const quarterSummary = (pending.quarterSummary ?? []).map((quarter) => ({
    quarter: quarterNumber(quarter.quarter),
    label: quarter.label ?? `第${quarter.quarter}季度`,
    operationLabel: quarter.operationLabel ?? "普通生活",
    activityIds: copy(quarter.activityIds ?? []),
    executionRate: finite(quarter.executionRate, 1),
  }));
  const record = latestRecord(result);
  const highlights = [...new Set([
    ...quarterSummary.map((quarter) => `Q${quarter.quarter} · ${quarter.operationLabel}`),
    ...(record?.facts ?? []).slice(-2).map((fact) => fact.title ?? fact.description).filter(Boolean),
  ])].slice(0, 5);
  return {
    eventId: pending.eventId,
    calendarYear: finite(pending.calendarYear, 0),
    completedAge: finite(pending.age, 0),
    nextAge: finite(pending.age, 0) + 1,
    title: pending.title ?? `${pending.age}岁的年度回望`,
    prompt: pending.prompt ?? "四个季度的生活已经成为这一年。",
    confirmOptionId: "confirm_year_review",
    quarterSummary,
    highlights,
    unchosenPaths: copy(record?.annualOperation?.unchosenOptions ?? []),
  };
}

function ageEntryView(result, locator, registry, flow) {
  const from = flow?.ageEntryFrom;
  if (!from || flow?.screen !== "age-entry") return null;
  const people = peopleView(result);
  const pendingActions = (result?.pendingDecision?.options ?? []).filter((option) => !option.isPlanControl);
  return {
    key: `age-entry:${locator.calendarYear}:age${locator.age}`,
    from: { calendarYear: finite(from.calendarYear, locator.calendarYear - 1), age: finite(from.age, locator.age - 1) },
    to: { calendarYear: locator.calendarYear, age: locator.age },
    identityLabel: `${locator.age}岁 · ${STAGE_LABELS[result.stage] ?? result.stage ?? "人生"}`,
    unlockedModuleIds: (registry?.modules ?? []).map((module) => module.id),
    unlockedModules: (registry?.modules ?? []).map((module) => ({ id: module.id, label: module.label ?? module.id })),
    actionIds: pendingActions.map((option) => option.id),
    actions: pendingActions.map((option) => ({ id: option.id, label: option.label ?? option.id })),
    persistentPeople: people.map((person) => person.roleId).filter(Boolean),
    people: people.filter((person) => person.roleId).map((person) => ({ roleId: person.roleId, label: person.label ?? person.roleId })),
  };
}

function recordsView(result) {
  const record = [...annualRecords(result)]
    .reverse()
    .find((entry) => (entry?.quarterRecords?.length ?? 0) > 0)
    ?? latestRecord(result);
  const quarters = (record?.quarterRecords ?? []).slice(-4).map((quarter) => {
    const relationshipChanges = Array.isArray(quarter.relationshipChanges)
      ? quarter.relationshipChanges
      : Object.values(quarter.relationshipChanges ?? {});
    return {
      key: runtimeQuarterKey(record, quarter) ?? `quarter:${record?.calendarYear ?? 0}:Q${quarterNumber(quarter.quarter)}`,
      quarter: quarterNumber(quarter.quarter),
      label: quarter.label ?? `第${quarter.quarter}季度`,
      operationLabel: quarter.operationLabel ?? "这一季度的生活",
      executionRate: finite(quarter.executionRate, 1),
      activityIds: copy(quarter.activityIds ?? []),
      activities: (quarter.activities ?? []).map((activity) => ({ id: activity.id, label: activity.label ?? activity.id })),
      months: (quarter.monthTicks ?? quarter.monthSimulation?.monthTicks ?? []).map(monthTickView),
      eventCount: (quarter.randomEventResults ?? []).length,
      interruptionReason: quarter.planInterruption?.reason ?? null,
      interestCount: Object.keys(quarter.interestChanges ?? {}).length,
      growthCount: Object.keys(quarter.growthChanges ?? {}).length + Object.keys(quarter.characterGrowth ?? {}).length,
      relationshipCount: relationshipChanges.length,
      resources: {
        executedTimeSlots: finite(quarter.executedTimeSlots ?? quarter.timeSlotsUsed, 0),
        plannedTimeSlots: finite(quarter.plannedTimeSlots, 0),
        energySpent: finite(quarter.executedEnergySpent ?? quarter.energySpent, 0),
        energyRemaining: finite(quarter.energyRemaining, 0),
      },
    };
  });
  const interests = Object.values(result?.currentState?.interests ?? {})
    .filter((interest) => finite(interest?.score, 0) > 0)
    .sort((left, right) => finite(right?.score, 0) - finite(left?.score, 0))
    .slice(0, 6)
    .map((interest) => ({
      id: interest.id,
      label: interest.label ?? interest.id,
      score: finite(interest.score, 0),
      stageLabel: INTEREST_STAGE_LABELS[interest.stageId] ?? "刚刚接触",
    }));
  return {
    calendarYear: finite(record?.calendarYear, 0),
    age: finite(record?.age, 0),
    title: record ? `${record.calendarYear} · ${record.age}岁生活记录` : "生活记录",
    quarters,
    people: peopleView(result).map((person) => ({
      id: person.id ?? null,
      roleId: person.roleId ?? null,
      label: person.label ?? person.roleId ?? "熟悉的人",
    })),
    interests,
  };
}

export function buildGameRuntimeSnapshot({ result, session = null, registry = null, draft = null, activeModuleId = null, flow = null } = {}) {
  if (!result || typeof result !== "object") throw new TypeError("buildGameRuntimeSnapshot 需要 Engine result。");
  const locator = currentLocator(result);
  const pending = result.pendingDecision ?? null;
  const eventId = pending?.eventId ?? null;
  const budget = pending?.quarterBudget ?? pending;
  const registered = new Map((registry?.actions ?? []).map((action) => [action.id, action]));
  // Plan-control options belong to the Core command protocol. They must never be
  // presented as ordinary life-action cards or mixed into a quarter allocation.
  const pendingOptions = pending?.kind === "quarter_plan"
    ? (pending.options ?? []).filter((option) => !option.isPlanControl)
    : [];
  const currentDraft = buildDraft(result, session, draft, eventId);
  const actions = pendingOptions.map((option) => {
    const allocation = currentDraft.allocations.find((entry) => entry.actionId === option.id);
    return actionView(option, registered, allocation, budget);
  });
  const resources = stateResources(result);
  const resourceContract = resourceView(result, budget);
  const resourceBlocking = {
    active: actions.filter((action) => !action.available).map((action) => ({ id: action.id, reasons: copy(action.blockedBy) })),
    availableTimeSlots: finite(budget?.availableTimeSlots, null),
    availableEnergy: finite(budget?.availableEnergy, null),
    availableCashYuan: finite(budget?.availableCashYuan, null),
  };
  const contractActions = actions.map((action) => ({
    id: action.id,
    moduleId: action.moduleId ?? "",
    label: action.label ?? action.id,
    targetLabel: action.targetLabel ?? "",
    timeSlots: action.costs.timeSlots ?? 0,
    energyCost: action.costs.energy ?? 0,
    cashCostYuan: action.costs.cashYuan ?? 0,
    intensity: action.intensity ?? "regular",
    available: action.available,
    unavailableReason: action.blockedBy.length ? action.blockedBy.join("；") : null,
  }));
  const allocations = contractActions.filter((action) => actions.find((entry) => entry.id === action.id)?.selected).map((action) => ({ ...action, selected: true }));
  const usedTimeSlots = allocations.reduce((sum, action) => sum + action.timeSlots, 0);
  const usedEnergy = allocations.reduce((sum, action) => sum + action.energyCost, 0);
  const usedCashYuan = allocations.reduce((sum, action) => sum + action.cashCostYuan, 0);
  const remainingTimeSlots = resourceContract.resources.availableTimeSlots - usedTimeSlots;
  const remainingEnergy = resourceContract.resources.availableEnergy - usedEnergy;
  const remainingCashYuan = resourceContract.resources.cashYuan - usedCashYuan;
  const draftBlockReasons = [
    remainingTimeSlots < 0 ? "本季度时间不足，请先取消或降低一项投入。" : null,
    remainingEnergy < -3 ? "本季度精力不足，请先调整计划。" : null,
    remainingCashYuan < 0 ? "本季度可用现金不足，请先调整计划。" : null,
    pending?.maxActivities != null && allocations.length > pending.maxActivities ? `本季度最多安排 ${pending.maxActivities} 项行动。` : null,
  ].filter(Boolean);
  const resourcesAfterDraft = {
    ...resourceContract.resources,
    availableTimeSlots: Math.max(0, remainingTimeSlots),
    availableEnergy: Math.max(0, remainingEnergy),
    cashYuan: Math.max(0, remainingCashYuan),
  };
  const actionOptionsAfterDraft = contractActions.map((action) => {
    if (allocations.some((allocation) => allocation.id === action.id)) return action;
    const reasons = [
      action.unavailableReason,
      action.timeSlots > Math.max(0, remainingTimeSlots) ? "剩余时间不足" : null,
      action.energyCost > remainingEnergy + 3 ? "剩余精力不足" : null,
      action.cashCostYuan > Math.max(0, remainingCashYuan) ? "可用现金不足" : null,
      pending?.maxActivities != null && allocations.length >= pending.maxActivities ? `本季度最多安排 ${pending.maxActivities} 项` : null,
    ].filter(Boolean);
    return {
      ...action,
      available: action.available && reasons.length === 0,
      unavailableReason: reasons[0] ?? null,
    };
  });
  const coreScreen = pending?.kind === "year_review"
    ? "year-review"
    : (isRuntimeEventPending(pending) ? "event" : "life");
  const screen = flow?.screen ?? coreScreen;
  const identityData = identity(result, locator);
  const recentLife = [
    latestRecord(result)?.quarterRecords?.at(-1)?.experience,
    latestRecord(result)?.quarterRecords?.at(-1)?.operationLabel,
  ].filter((entry) => typeof entry === "string" && entry.length > 0).slice(0, 4);
  const diagnostics = {
    monthInQuarter: monthFromResult(result),
    missingResources: [...new Set([...resourceContract.missing, ...(resources.cashYuan == null ? ["cashYuan"] : [])])],
    source: "core-result",
    readOnly: true,
  };
  const core = {
    status: result.status === "completed" ? "completed" : "awaiting_choice",
    stage: result.stage ?? null,
    pendingKind: ["quarter_plan", "random_life_event", "mainline_event", "year_review"].includes(pending?.kind)
      ? pending.kind
      : (isRuntimeEventPending(pending) ? "mainline_event" : null),
    pendingEventId: pending?.eventId ?? null,
    calendarYear: locator.calendarYear ?? 0,
    age: locator.age ?? 0,
    quarter: quarterNumber(locator.quarter),
    monthInQuarter: monthNumber(pending?.monthInQuarter, null),
  };
  const event = eventView(result, pending);
  const quarterExecution = quarterExecutionView(result);
  const quarterResult = quarterResultView(result);
  const yearReview = yearReviewView(result, pending);
  const ageEntry = ageEntryView(result, locator, registry, flow);
  const records = recordsView(result);
  return {
    protocol: PROTOCOL,
    screen,
    core,
    calendarYear: locator.calendarYear ?? 0,
    age: locator.age ?? 0,
    quarter: locator.quarter ?? 1,
    identityLabel: `${locator.age ?? 0}岁 · ${STAGE_LABELS[result.stage] ?? result.stage ?? "人生"}`,
    playerName: identityData.name ?? "你",
    playerVisualKey: visualKey(result, locator.age ?? 0),
    playerMood: moodView(result),
    playerResponse: responseText(result, pending),
    resources: resourcesAfterDraft,
    recentLife,
    modules: (registry?.modules ?? []).map((module) => {
      const view = moduleViews(registry, actions).find((entry) => entry.id === module.id);
      return { id: module.id, label: module.label ?? module.id, iconKey: `module.${module.id.split(".").at(-1)}`, availableCount: view?.availableCount ?? 0, lockedCount: view?.lockedCount ?? 0 };
    }),
    actionOptions: actionOptionsAfterDraft,
    allocations,
    activeModuleId: activeModuleId ?? registry?.modules?.[0]?.id ?? null,
    advanceEnabled: pending?.kind === "quarter_plan"
      && allocations.length >= (pending.minActivities ?? 1)
      && allocations.length <= (pending.maxActivities ?? Number.POSITIVE_INFINITY)
      && draftBlockReasons.length === 0,
    resourceBlockReason: draftBlockReasons[0] ?? null,
    event,
    quarterExecution,
    quarterResult,
    yearReview,
    ageEntry,
    records,
    diagnostics,
  };
}

function cue(type, id, priority, payload) {
  return { id, type, priority, payload: copy(payload ?? {}) };
}

function allocationKey(snapshot) {
  return JSON.stringify((snapshot?.allocations ?? []).map((entry) => ({ id: entry.id, intensity: entry.intensity, timeSlots: entry.timeSlots })).sort((a, b) => String(a.id).localeCompare(String(b.id))));
}

function resourceDelta(previous, next) {
  const ids = new Set([...Object.keys(previous?.resources ?? {}), ...Object.keys(next?.resources ?? {})]);
  return [...ids].map((id) => ({ id, from: previous?.resources?.[id] ?? null, to: next?.resources?.[id] ?? null, delta: (typeof previous?.resources?.[id] === "number" && typeof next?.resources?.[id] === "number") ? next.resources[id] - previous.resources[id] : null })).filter((entry) => entry.from !== entry.to);
}

export function mapGameRuntimeCues(previousSnapshot, nextSnapshot, context = {}) {
  if (!nextSnapshot || nextSnapshot.protocol !== PROTOCOL) return [];
  const previous = previousSnapshot?.protocol === PROTOCOL ? previousSnapshot : null;
  const cues = [];
  if (!previous) cues.push(cue("screen.enter", "screen:enter", "key", { screen: context.screen ?? "life" }));
  if (previous && allocationKey(previous) !== allocationKey(nextSnapshot)) {
    cues.push(cue("action.scheduled", `action:scheduled:${nextSnapshot.calendarYear}:${nextSnapshot.quarter}`, "normal", { allocations: nextSnapshot.allocations }));
  }
  const beforeQuarter = previous?.quarter;
  const afterQuarter = nextSnapshot.quarter;
  if (previous && JSON.stringify(previous.recentLife) !== JSON.stringify(nextSnapshot.recentLife)) {
    cues.push(cue("action.resolve", `action:resolve:${afterQuarter ?? "x"}`, "key", { recentLife: nextSnapshot.recentLife }));
  }
  const deltas = previous ? resourceDelta(previous, nextSnapshot) : [];
  if (deltas.length) cues.push(cue("resource.delta", `resource:delta:${nextSnapshot.calendarYear ?? "x"}:${afterQuarter ?? "x"}`, "normal", { deltas }));
  if (previous && previous.playerResponse !== nextSnapshot.playerResponse) cues.push(cue("person.react", `person:react:${nextSnapshot.calendarYear}:${afterQuarter ?? "x"}`, "normal", { response: nextSnapshot.playerResponse, mood: nextSnapshot.playerMood }));
  if (previous && nextSnapshot.screen === "event" && previous.screen !== "event") cues.push(cue("event.interrupt", `event:interrupt:${nextSnapshot.calendarYear}:${afterQuarter ?? "x"}`, "key", { screen: nextSnapshot.screen, response: nextSnapshot.playerResponse }));
  const beforeMonth = previous?.diagnostics?.monthInQuarter;
  const afterMonth = nextSnapshot?.diagnostics?.monthInQuarter;
  if (previous && beforeQuarter === afterQuarter && afterMonth != null && beforeMonth !== afterMonth) cues.push(cue("month.advance", `month:advance:${nextSnapshot.calendarYear}:${afterQuarter}:${afterMonth}`, "ambient", { monthInQuarter: afterMonth }));
  if (previous && beforeQuarter !== afterQuarter && afterQuarter != null) cues.push(cue("quarter.complete", `quarter:complete:${previous.calendarYear}:${beforeQuarter ?? "x"}`, "key", { completedQuarter: beforeQuarter, nextQuarter: afterQuarter }));
  if (previous && (previous.calendarYear !== nextSnapshot.calendarYear || previous.age !== nextSnapshot.age)) cues.push(cue("year.advance", `year:advance:${nextSnapshot.calendarYear}:${nextSnapshot.age}`, "key", { from: { calendarYear: previous.calendarYear, age: previous.age }, to: { calendarYear: nextSnapshot.calendarYear, age: nextSnapshot.age } }));
  return cues.filter((entry) => CUE_TYPES.includes(entry.type));
}

export { CUE_TYPES, PROTOCOL };
