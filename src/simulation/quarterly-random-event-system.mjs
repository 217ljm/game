import { createSeededRandom } from "./random.mjs";
import { applyDirectInterestChanges } from "./quarterly-life-system.mjs";
import { applyChildRandomEventGrowth } from "./childhood-play-system.mjs";

function clone(value) {
  return structuredClone(value);
}

export function randomLifeEventKey(calendarYear, quarter, eventId) {
  return `random:${calendarYear}:Q${quarter}:${eventId}`;
}

function eventConditionReasons(event, context, history = []) {
  const reasons = [];
  if (!event.stages.includes(context.stage)) reasons.push(`人生阶段需为${event.stages.join("/")}`);
  if (context.age < event.minAge || context.age > event.maxAge) {
    reasons.push(`年龄需在${event.minAge}～${event.maxAge}岁`);
  }
  if (event.calendarYearMin != null && context.calendarYear < event.calendarYearMin) {
    reasons.push(`最早在${event.calendarYearMin}年出现`);
  }
  if (event.calendarYearMax != null && context.calendarYear > event.calendarYearMax) {
    reasons.push(`最晚在${event.calendarYearMax}年出现`);
  }
  const when = event.when ?? {};
  if (when.residenceIn && !when.residenceIn.includes(context.residence)) {
    reasons.push(`居住条件需为${when.residenceIn.join("/")}`);
  }
  if (when.pathIn && !when.pathIn.includes(context.path)) {
    reasons.push(`人生路径需为${when.pathIn.join("/")}`);
  }
  if (when.educationStatusIn && !when.educationStatusIn.includes(context.educationStatus)) {
    reasons.push(`教育状态需为${when.educationStatusIn.join("/")}`);
  }
  if (when.employmentStatusIn && !when.employmentStatusIn.includes(context.employmentStatus)) {
    reasons.push(`就业状态需为${when.employmentStatusIn.join("/")}`);
  }
  if (when.relationshipStatusIn && !when.relationshipStatusIn.includes(context.relationshipStatus)) {
    reasons.push(`关系状态需为${when.relationshipStatusIn.join("/")}`);
  }
  if (when.hasChild != null && Boolean(context.hasChild) !== when.hasChild) {
    reasons.push(when.hasChild ? "需要已有孩子" : "需要尚无孩子");
  }
  if (when.minimumOlderParentCount != null
    && (context.olderParentCount ?? 0) < when.minimumOlderParentCount) {
    reasons.push(`至少需要${when.minimumOlderParentCount}位65岁以上在世父母`);
  }
  if (when.selectedCategoryIn
    && !context.selectedCategories?.some((category) => when.selectedCategoryIn.includes(category))) {
    reasons.push(`本季活动需包含${when.selectedCategoryIn.join("/")}`);
  }
  if (!cooldownReady(event, history, context.calendarYear)) {
    reasons.push(`仍在${event.cooldownYears ?? "永久"}年冷却期内`);
  }
  return reasons;
}

export function diagnoseRandomEvents(content, context, history = []) {
  return (content.randomEvents ?? []).map((event) => {
    const reasons = eventConditionReasons(event, context, history);
    return {
      id: event.id,
      title: event.title,
      eligible: reasons.length === 0,
      reasons,
      ageRange: [event.minAge, event.maxAge],
      stages: [...event.stages],
    };
  });
}

function eventChance(content, age) {
  return content.rules?.randomEventChanceByAge?.find(
    (entry) => age >= entry.minAge && age <= entry.maxAge,
  )?.chance ?? 0;
}

function cooldownReady(event, history, calendarYear) {
  const previous = [...history]
    .reverse()
    .find((entry) => entry.eventId === event.id);
  if (!previous) return true;
  return calendarYear - previous.calendarYear >= (event.cooldownYears ?? Number.POSITIVE_INFINITY);
}

function chooseWeighted(random, entries) {
  const total = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight ?? 1), 0);
  let point = random() * total;
  for (const entry of entries) {
    point -= Math.max(0, entry.weight ?? 1);
    if (point <= 0) return entry;
  }
  return entries.at(-1);
}

function eligibleEvents(content, context, history) {
  return (content.randomEvents ?? []).filter(
    (event) => eventConditionReasons(event, context, history).length === 0,
  );
}

function applyEventOutcome({
  state,
  record,
  content,
  event,
  selected,
  eventId,
  quarter,
  monthInQuarter,
  source,
  addFact,
  changeStat,
}) {
  const fact = addFact(record, "quarter_random_event", {
    eventTemplateId: event.id,
    eventId,
    quarter,
    monthInQuarter,
    title: event.title,
    scene: event.scene,
    selectedOptionId: selected.id,
    selectedLabel: selected.label,
    selectedDescription: selected.description,
    choiceSource: source,
  });
  for (const [stat, delta] of Object.entries(selected.statChanges ?? {})) {
    changeStat(state, record, stat, delta, fact.id, `随机事件：${event.title}`);
  }
  const transitions = applyDirectInterestChanges(
    state,
    selected.interestChanges,
    content,
    record.calendarYear,
  );
  for (const transition of transitions) {
    if (transition.after.id === "exposure") continue;
    addFact(record, "interest_stage_changed", {
      interestId: transition.interest.id,
      interestLabel: transition.interest.label,
      fromStage: transition.before.id,
      toStage: transition.after.id,
      stageLabel: transition.after.label,
      score: transition.interest.score,
      accumulatedHours: Math.round(transition.interest.totalHours),
      sourceRandomEventId: eventId,
    });
  }
  const childGrowth = applyChildRandomEventGrowth({
    state,
    record,
    content,
    event,
    selected,
    quarter,
    sourceFactId: fact.id,
    addFact,
  });
  const quarterRecord = record.quarterRecords?.find((entry) => entry.quarter === quarter);
  if (quarterRecord) {
    if (event.interruption) {
      quarterRecord.planInterruption = {
        eventId: event.id,
        monthInQuarter,
        severity: event.interruption.severity ?? "minor",
        reason: event.interruption.reason ?? event.title,
        affectedCategories: clone(event.interruption.affectedCategories ?? ["*"]),
        executionRate: selected.planImpact?.executionRate ?? 0.85,
        energyDelta: selected.planImpact?.energyDelta ?? 0,
        fatigueDelta: selected.planImpact?.fatigueDelta ?? 0,
        stressDelta: selected.planImpact?.stressDelta ?? 0,
        moodDelta: selected.planImpact?.moodDelta ?? 0,
        selectedOptionId: selected.id,
      };
    }
    quarterRecord.randomEventResults ??= [];
    quarterRecord.randomEventResults.push({
      eventId: event.id,
      title: event.title,
      scene: event.scene,
      selectedOptionId: selected.id,
      selectedLabel: selected.label,
      selectedDescription: selected.description,
      monthInQuarter,
      planImpact: clone(selected.planImpact ?? null),
      statChanges: clone(selected.statChanges ?? {}),
      interestChanges: clone(selected.interestChanges ?? {}),
      sourceFactId: fact.id,
      growthChanges: childGrowth.growthChanges,
    });
    quarterRecord.growthMilestones ??= [];
    quarterRecord.growthMilestones.push(...childGrowth.milestones);
  }
  state.randomEventHistory ??= [];
  state.randomEventHistory.push({
    eventId: event.id,
    decisionId: eventId,
    calendarYear: record.calendarYear,
    age: record.age,
    quarter,
    monthInQuarter,
    selectedOptionId: selected.id,
  });
  const decision = {
    decisionKind: "quarter_random_event",
    eventId,
    eventTemplateId: event.id,
    calendarYear: record.calendarYear,
    age: record.age,
    quarter,
    monthInQuarter,
    chosenOptionId: selected.id,
    selectedLabel: selected.label,
    unchosenOptions: event.options
      .filter((option) => option.id !== selected.id)
      .map((option) => ({
        id: option.id,
        label: option.label,
        description: option.description,
      })),
    choiceSource: source,
    sourceFactId: fact.id,
  };
  state.decisions.push(decision);
  if (Array.isArray(record.decisions)) record.decisions.push(decision);
  return { fact, decision };
}

/**
 * 返回 false 表示随机生活事件正在等待玩家回应。
 * 事件抽取使用独立季度种子，不受玩家点击顺序或自动计划抽样次数影响。
 */
export function handleQuarterRandomEvent({
  state,
  record,
  content,
  stage,
  quarter,
  plan,
  choices = {},
  autoChoose,
  context = {},
  addFact,
  changeStat,
  debugRandomEvents = null,
}) {
  if (!content || record.age <= 2) return true;
  state.randomEventHistory ??= [];
  const eventRandom = createSeededRandom(
    `${state.seed}:quarter-random-event:${record.calendarYear}:Q${quarter}`,
  );
  const chanceRoll = eventRandom();
  const monthRandom = createSeededRandom(
    `${state.seed}:quarter-random-event-month:${record.calendarYear}:Q${quarter}`,
  );
  const monthInQuarter = 1 + Math.floor(monthRandom() * 3);
  const eventContext = {
    ...context,
    stage,
    age: record.age,
    calendarYear: record.calendarYear,
    selectedCategories: plan.selectedCategories ?? [],
  };
  const eligible = eligibleEvents(content, eventContext, state.randomEventHistory);
  if (eligible.length === 0) return true;
  const activationYear = debugRandomEvents?.activationYear;
  const activationQuarter = debugRandomEvents?.activationQuarter ?? 1;
  const debugActive = !Number.isFinite(activationYear)
    || record.calendarYear > activationYear
    || (record.calendarYear === activationYear && quarter >= activationQuarter);
  const debugMode = debugActive ? (debugRandomEvents?.mode ?? "normal") : "normal";
  let event;
  if (debugMode === "forced") {
    event = eligible.find((entry) => entry.id === debugRandomEvents?.forcedEventId);
    if (!event) return true;
  } else {
    if (debugMode !== "frequent" && chanceRoll >= eventChance(content, record.age)) return true;
    event = chooseWeighted(eventRandom, eligible);
  }
  const eventId = randomLifeEventKey(record.calendarYear, quarter, event.id);
  const providedOptionId = choices[eventId];
  let selected;
  let source;
  if (providedOptionId) {
    selected = event.options.find((option) => option.id === providedOptionId);
    if (!selected) throw new Error(`随机事件 ${eventId} 不存在选项 ${providedOptionId}`);
    source = "provided";
  } else if (autoChoose) {
    selected = chooseWeighted(eventRandom, event.options.map((option) => ({
      ...option,
      weight: option.autoWeight ?? 1,
    })));
    source = "automatic";
  } else {
    state.status = "awaiting_choice";
    state.pendingDecision = {
      kind: "random_life_event",
      eventId,
      eventTemplateId: event.id,
      calendarYear: record.calendarYear,
      age: record.age,
      quarter,
      monthInQuarter,
      quarterLabel: `第${quarter}季度`,
      title: event.title,
      prompt: event.scene,
      options: event.options.map((option) => ({
        id: option.id,
        label: option.label,
        description: option.description,
        effectSummary: option.effectSummary ?? null,
        planImpact: clone(option.planImpact ?? null),
      })),
      debugRandomMode: debugMode,
    };
    return false;
  }
  applyEventOutcome({
    state,
    record,
    content,
    event,
    selected,
    eventId,
    quarter,
    monthInQuarter,
    source,
    addFact,
    changeStat,
  });
  return true;
}
