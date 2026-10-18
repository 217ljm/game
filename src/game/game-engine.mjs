import { generateBirthProfile } from "../simulation/birth-generator.mjs";
import { simulateChildhood } from "../simulation/childhood-simulator.mjs";
import { simulatePrimaryEducation } from "../simulation/primary-education-simulator.mjs";
import { simulateAdolescence } from "../simulation/adolescence-simulator.mjs";
import { simulateYouthEntry } from "../simulation/youth-entry-simulator.mjs";
import { simulateAdultLife } from "../simulation/adult-life-simulator.mjs";

export const SESSION_SCHEMA_VERSION = 5;
export const QUARTER_CADENCE_PROFILE_IDS = Object.freeze({
  AGE6_1984_QUARTERLY: "age6-1984-quarterly-v1",
});
export const STAGE_ORDER = ["childhood", "primary", "adolescence", "youth", "adult"];
const STAGE_EVENT_CONFIG_KEYS = {
  childhood: "childhoodEvents",
  primary: "primaryEvents",
  adolescence: "adolescenceEvents",
  youth: "youthEvents",
  adult: "adultEvents",
};

function clone(value) {
  return structuredClone(value);
}

function normalizeQuarterCadenceProfile(value) {
  if (value == null) return null;
  if (value === QUARTER_CADENCE_PROFILE_IDS.AGE6_1984_QUARTERLY) return value;
  throw new RangeError(`不支持的季度节奏 profile：${value}`);
}

export function createGameSession(options = {}) {
  const seed = String(options.seed ?? "people-life-session");
  const birthYear = options.birthYear == null ? undefined : Number(options.birthYear);
  if (birthYear != null && (!Number.isInteger(birthYear) || birthYear < 1978 || birthYear > 1982)) {
    throw new RangeError("出生年份必须在1978至1982之间");
  }
  return {
    schemaVersion: SESSION_SCHEMA_VERSION,
    seed,
    ...(birthYear == null ? {} : { birthYear }),
    mortality: options.mortality ?? true,
    characterModelVersion: 1,
    quarterPlanProtocol: "resource-v1",
    quarterCadenceProfile: normalizeQuarterCadenceProfile(options.quarterCadenceProfile),
    quarterPlans: {},
    quarterAutomation: null,
    randomEventChoices: {},
    mainlineChoices: {},
    yearReviews: {},
    choices: Object.fromEntries(STAGE_ORDER.map((stage) => [stage, {}])),
  };
}

export function migrateGameSession(session) {
  if (!session || typeof session !== "object") return clone(session);
  const migrated = clone(session);
  if (migrated.schemaVersion === 1) {
    migrated.annualChoices = {};
    migrated.yearReviews = {};
    migrated.schemaVersion = 2;
  }
  if (migrated.schemaVersion === 2) {
    migrated.quarterChoices = {};
    for (const [key, operationId] of Object.entries(migrated.annualChoices ?? {})) {
      const match = /^annual:(\d+)$/.exec(key);
      if (!match || typeof operationId !== "string") continue;
      for (let quarter = 1; quarter <= 4; quarter += 1) {
        migrated.quarterChoices[`quarter:${match[1]}:Q${quarter}`] = operationId;
      }
    }
    delete migrated.annualChoices;
    migrated.quarterAutomation = null;
    migrated.schemaVersion = 3;
  }
  if (migrated.schemaVersion === 3) {
    migrated.quarterPlans = {};
    for (const [key, rawChoice] of Object.entries(migrated.quarterChoices ?? {})) {
      if (typeof rawChoice !== "string") continue;
      const match = /^quarter-control:([^:]+):(.+)$/.exec(rawChoice);
      migrated.quarterPlans[key] = {
        activityIds: [match?.[2] ?? rawChoice],
        controlMode: match?.[1] ?? "select",
      };
    }
    delete migrated.quarterChoices;
    if (migrated.quarterAutomation?.operationId) {
      migrated.quarterAutomation = {
        ...migrated.quarterAutomation,
        activityIds: [migrated.quarterAutomation.operationId],
      };
      delete migrated.quarterAutomation.operationId;
    }
    migrated.randomEventChoices = {};
    migrated.schemaVersion = 4;
  }
  if (migrated.schemaVersion === 4) {
    for (const plan of Object.values(migrated.quarterPlans ?? {})) {
      if (!Array.isArray(plan?.activityIds)) continue;
      plan.allocations ??= plan.activityIds.map((actionId) => ({
        actionId,
        intensity: "regular",
        timeSlots: 2,
      }));
    }
    if (migrated.quarterAutomation?.activityIds) {
      migrated.quarterAutomation.allocations ??= migrated.quarterAutomation.activityIds.map(
        (actionId) => ({ actionId, intensity: "regular", timeSlots: 2 }),
      );
    }
    migrated.characterModelVersion = 1;
    migrated.quarterPlanProtocol = "resource-v1";
    migrated.schemaVersion = SESSION_SCHEMA_VERSION;
  }
  if (migrated.schemaVersion === SESSION_SCHEMA_VERSION) {
    migrated.quarterCadenceProfile ??= null;
    migrated.quarterPlans ??= {};
    migrated.quarterAutomation ??= null;
    migrated.randomEventChoices ??= {};
    migrated.mainlineChoices ??= {};
    migrated.yearReviews ??= {};
    migrated.characterModelVersion ??= 1;
    migrated.quarterPlanProtocol ??= "resource-v1";
  }
  return migrated;
}

export function validateGameSession(session) {
  if (session?.schemaVersion !== SESSION_SCHEMA_VERSION) {
    throw new Error(`不支持的存档版本：${session?.schemaVersion}`);
  }
  if (typeof session.seed !== "string" || session.seed.length === 0) {
    throw new Error("存档缺少随机种子");
  }
  if (session.characterModelVersion !== 1) {
    throw new Error("存档人物属性协议版本无效");
  }
  if (session.quarterPlanProtocol !== "resource-v1") {
    throw new Error("存档季度资源协议版本无效");
  }
  normalizeQuarterCadenceProfile(session.quarterCadenceProfile);
  if (!session.quarterPlans || typeof session.quarterPlans !== "object") {
    throw new Error("存档缺少逐季度生活安排");
  }
  if (session.quarterAutomation != null && typeof session.quarterAutomation !== "object") {
    throw new Error("存档中的季度自动推进设置无效");
  }
  if (!session.randomEventChoices || typeof session.randomEventChoices !== "object") {
    throw new Error("存档缺少随机生活事件记录");
  }
  if (!session.mainlineChoices || typeof session.mainlineChoices !== "object") {
    throw new Error("存档缺少0～18岁主线事件记录");
  }
  if (!session.yearReviews || typeof session.yearReviews !== "object") {
    throw new Error("存档缺少逐岁年度结算记录");
  }
  for (const stage of STAGE_ORDER) {
    if (!session.choices?.[stage] || typeof session.choices[stage] !== "object") {
      throw new Error(`存档缺少 ${stage} 选择记录`);
    }
  }
  return true;
}

export function applySessionChoice(session, pendingDecision, optionId) {
  validateGameSession(session);
  if (!pendingDecision?.stage || !STAGE_ORDER.includes(pendingDecision.stage)) {
    throw new Error("等待选择缺少有效阶段");
  }
  const quarterPlanPayload = pendingDecision.kind === "quarter_plan"
    && optionId
    && typeof optionId === "object"
    && !Array.isArray(optionId)
    && optionId.type === "quarter.plan"
    ? optionId
    : null;
  if (quarterPlanPayload && typeof quarterPlanPayload.eventId !== "string") {
    throw new Error("季度计划缺少当前事件 ID");
  }
  if (quarterPlanPayload && quarterPlanPayload.eventId !== pendingDecision.eventId) {
    throw new Error(`季度计划事件不匹配：${quarterPlanPayload?.eventId ?? "missing"}`);
  }
  if (quarterPlanPayload && !Array.isArray(quarterPlanPayload.allocations)) {
    throw new Error("季度计划缺少行动投入分配");
  }
  const optionIds = quarterPlanPayload
    ? quarterPlanPayload.allocations.map((entry) => entry.actionId)
    : (Array.isArray(optionId) ? optionId : [optionId]);
  if (!optionIds.every((id) => pendingDecision.options.some((option) => option.id === id))) {
    throw new Error(`事件 ${pendingDecision.eventId} 存在无效选项`);
  }
  const next = clone(session);
  if (pendingDecision.kind === "quarter_plan") {
    if (Array.isArray(optionId) || quarterPlanPayload) {
      const unique = [...new Set(optionIds)];
      if (unique.length < pendingDecision.minActivities || unique.length > pendingDecision.maxActivities) {
        throw new Error(`这一季度需选择${pendingDecision.minActivities}至${pendingDecision.maxActivities}项活动`);
      }
      const selected = unique.map((id) => pendingDecision.options.find((option) => option.id === id));
      if (selected.some((option) => option.isPlanControl)) {
        throw new Error("季度延续控制不能与具体活动混合选择");
      }
      const hours = selected.reduce((sum, option) => sum + option.timeUseHoursPerWeek, 0);
      if (hours > pendingDecision.weeklyDiscretionaryHours) {
        throw new Error(`季度活动超过每周${pendingDecision.weeklyDiscretionaryHours}小时的可安排时间`);
      }
      const cash = selected.reduce((sum, option) => sum + (option.cashCostYuan ?? 0), 0);
      if (Number.isFinite(pendingDecision.availableCashYuan) && cash > pendingDecision.availableCashYuan) {
        throw new Error("季度活动超过当前可用现金");
      }
      const allocations = selected.map((option) => {
        const requested = quarterPlanPayload?.allocations.find((entry) => entry.actionId === option.id);
        const intensityId = requested?.intensity ?? option.defaultIntensity ?? "regular";
        const intensity = option.intensities?.find((entry) => entry.id === intensityId);
        if (quarterPlanPayload && !intensity) {
          throw new Error(`季度行动 ${option.id} 的投入强度无效：${intensityId}`);
        }
        return {
          actionId: option.id,
          intensity: intensityId,
          timeSlots: intensity?.timeSlots ?? option.timeSlots ?? 2,
          energyCost: intensity?.energyCost ?? option.energyCost ?? 2,
        };
      });
      const timeSlotsUsed = allocations.reduce((sum, entry) => sum + entry.timeSlots, 0);
      const energySpent = allocations.reduce((sum, entry) => sum + entry.energyCost, 0);
      if (
        Number.isFinite(pendingDecision.quarterBudget?.availableTimeSlots)
        && timeSlotsUsed > pendingDecision.quarterBudget.availableTimeSlots
      ) {
        throw new Error("季度活动超过当前可用时间格");
      }
      if (
        Number.isFinite(pendingDecision.quarterBudget?.availableEnergy)
        && energySpent - pendingDecision.quarterBudget.availableEnergy > 3
      ) {
        throw new Error("季度活动需要透支超过3点精力");
      }
      next.quarterPlans[pendingDecision.eventId] = {
        activityIds: unique,
        allocations,
        reservedTimeSlots: Math.max(
          0,
          (pendingDecision.quarterBudget?.availableTimeSlots ?? timeSlotsUsed) - timeSlotsUsed,
        ),
        controlMode: "select",
      };
      next.quarterAutomation = null;
    } else {
      const selected = pendingDecision.options.find((option) => option.id === optionId);
      if (!selected.isPlanControl) {
        if (pendingDecision.minActivities > 1) {
          throw new Error(`这一季度需组合选择至少${pendingDecision.minActivities}项活动`);
        }
        next.quarterPlans[pendingDecision.eventId] = {
          activityIds: [optionId],
          allocations: [{
            actionId: optionId,
            intensity: selected.defaultIntensity ?? "regular",
            timeSlots: selected.timeSlots ?? 2,
            energyCost: selected.energyCost ?? 2,
          }],
          controlMode: "select",
        };
        next.quarterAutomation = null;
      } else {
        next.quarterPlans[pendingDecision.eventId] = {
          activityIds: clone(selected.activityIds),
          allocations: clone(selected.allocations ?? []),
          controlMode: selected.controlMode,
        };
      }
      if (selected.controlMode === "notify_only") {
        next.quarterAutomation = {
          mode: "notify_only",
          activityIds: clone(selected.activityIds),
          allocations: clone(selected.allocations ?? []),
          stage: pendingDecision.stage,
          startedYear: pendingDecision.calendarYear,
          startedQuarter: pendingDecision.quarter,
        };
      }
    }
  } else if (pendingDecision.kind === "random_life_event") {
    next.randomEventChoices[pendingDecision.eventId] = optionId;
  } else if (pendingDecision.kind === "mainline_event") {
    const selected = pendingDecision.options.find((option) => option.id === optionId);
    if (selected?.available === false) {
      throw new Error(`主线事件选项当前不可执行：${selected.unavailableReason}`);
    }
    next.mainlineChoices[pendingDecision.eventId] = optionId;
  } else if (pendingDecision.kind === "year_review") {
    next.yearReviews[pendingDecision.eventId] = true;
  } else {
    next.choices[pendingDecision.stage][pendingDecision.eventId] = optionId;
  }
  return next;
}

function pendingForStage(stage, state) {
  return {
    stage,
    ...clone(state.pendingDecision),
  };
}

function buildOptionLabelIndex(data) {
  const index = new Map();
  for (const key of Object.values(STAGE_EVENT_CONFIG_KEYS)) {
    for (const event of data[key]?.events ?? []) {
      for (const option of event.options ?? []) {
        index.set(option.id, option.label ?? option.text ?? option.id);
      }
    }
  }
  return index;
}

function normalizeUnchosenOption(option, labelIndex) {
  if (typeof option === "string") {
    return { id: option, label: labelIndex.get(option) ?? option };
  }
  const copy = clone(option);
  const id = copy.id ?? copy.templateId;
  return {
    ...copy,
    ...(copy.label ? {} : { label: labelIndex.get(id) ?? id ?? "另一条没有选择的路" }),
  };
}

function collectWholeLifeChoices(profile, stages, data) {
  const labelIndex = buildOptionLabelIndex(data);
  const decisions = [];
  const untraveledPaths = [];
  for (const [stage, state] of Object.entries(stages)) {
    for (const decision of state.decisions ?? []) {
      decisions.push(decision);
      const options = decision.unchosenOptions
        ?? decision.unchosenCandidates
        ?? decision.unchosenOptionIds
        ?? [];
      for (const option of options) {
        untraveledPaths.push({
          stage,
          decisionYear: decision.calendarYear ?? profile.person.birthYear + decision.age,
          decisionAge: decision.age,
          eventId: decision.eventId,
          unchosen: normalizeUnchosenOption(option, labelIndex),
        });
      }
    }
  }
  return { decisionCount: decisions.length, untraveledPaths };
}

function makeEarlyDeathReview(profile, childhood, data) {
  const wholeLifeChoices = collectWholeLifeChoices(profile, { childhood }, data);
  return {
    archetypeId: "early_childhood_death",
    birthYear: profile.person.birthYear,
    deathYear: childhood.ending.calendarYear,
    ageAtDeath: childhood.ending.age,
    highestCompletedEducation: "none",
    jobYears: 0,
    jobCount: 0,
    jobHistory: [],
    promotionCount: 0,
    retiredYear: null,
    relationshipSummary: "life_ended_in_early_childhood",
    childBorn: false,
    finalHousingTenure: childhood.household.housing.tenure,
    finalLiquidSavingsYuan: null,
    finalHousingAssetValueYuan: null,
    finalDebtYuan: null,
    finalNetWorthYuan: null,
    finalStats: Object.fromEntries(
      Object.entries(childhood.visibleStats).map(([key, entry]) => [key, entry.value]),
    ),
    ...wholeLifeChoices,
    historicalYearsExperienced: {
      first: profile.person.birthYear,
      last: childhood.ending.calendarYear,
    },
    scenarioYearsExperienced: 0,
  };
}

/**
 * 每次从种子与已保存选择重放。autoChoose=false时停在下一个未回答事件。
 */
export function runLifeSession(data, session, options = {}) {
  validateGameSession(session);
  const autoChoose = options.autoChoose ?? false;
  const profile = generateBirthProfile(data.birth, {
    seed: `${session.seed}:birth`,
    ...(session.birthYear == null ? {} : { birthYear: session.birthYear }),
  });
  const stages = {};
  const quarterlyLifeContent = {
    ...data.quarterlyLife,
    childhoodPlay: data.childhoodPlay ?? data.quarterlyLife?.childhoodPlay ?? null,
    mainlinePayoffs: data.youthMainlinePayoffs ?? data.quarterlyLife?.mainlinePayoffs ?? null,
  };
  const quarterChoices = {
    ...session.quarterPlans,
    __automation: session.quarterAutomation,
    __quarterCadenceProfile: session.quarterCadenceProfile ?? null,
    __randomEventChoices: session.randomEventChoices,
    __mainlineChoices: session.mainlineChoices,
  };
  const childhood = simulateChildhood(profile, data.childhood, data.childhoodEvents, {
    seed: `${session.seed}:childhood`,
    choices: session.choices.childhood,
    annualChoices: quarterChoices,
    reviewedYears: session.yearReviews,
    annualOperationCatalog: data.annualOperations,
    quarterlyLifeContent,
    socialCharacterCatalog: data.socialCharacters,
    debugRandomEvents: session.debug?.randomEvents ?? null,
    autoChoose,
    mortality: session.mortality,
  });
  stages.childhood = childhood;
  if (childhood.status === "awaiting_choice") {
    return {
      status: "awaiting_choice",
      stage: "childhood",
      profile,
      stages,
      currentState: childhood,
      pendingDecision: pendingForStage("childhood", childhood),
    };
  }
  if (childhood.status === "ended") {
    return {
      status: "completed",
      stage: "childhood",
      profile,
      stages,
      currentState: childhood,
      ending: clone(childhood.ending),
      lifeReview: makeEarlyDeathReview(profile, childhood, data),
    };
  }

  const primary = simulatePrimaryEducation(
    profile,
    childhood,
    data.primary,
    data.primaryEvents,
    {
      seed: `${session.seed}:primary`,
      choices: session.choices.primary,
      annualChoices: quarterChoices,
      reviewedYears: session.yearReviews,
      annualOperationCatalog: data.annualOperations,
      quarterlyLifeContent,
      socialCharacterCatalog: data.socialCharacters,
      debugRandomEvents: session.debug?.randomEvents ?? null,
      autoChoose,
    },
  );
  stages.primary = primary;
  if (primary.status === "awaiting_choice") {
    return {
      status: "awaiting_choice",
      stage: "primary",
      profile,
      stages,
      currentState: primary,
      pendingDecision: pendingForStage("primary", primary),
    };
  }

  const adolescence = simulateAdolescence(
    profile,
    childhood,
    primary,
    data.adolescence,
    data.adolescenceEvents,
    {
      seed: `${session.seed}:adolescence`,
      choices: session.choices.adolescence,
      annualChoices: quarterChoices,
      reviewedYears: session.yearReviews,
      annualOperationCatalog: data.annualOperations,
      quarterlyLifeContent,
      socialCharacterCatalog: data.socialCharacters,
      debugRandomEvents: session.debug?.randomEvents ?? null,
      autoChoose,
    },
  );
  stages.adolescence = adolescence;
  if (adolescence.status === "awaiting_choice") {
    return {
      status: "awaiting_choice",
      stage: "adolescence",
      profile,
      stages,
      currentState: adolescence,
      pendingDecision: pendingForStage("adolescence", adolescence),
    };
  }

  const youth = simulateYouthEntry(
    profile,
    adolescence,
    data.youth,
    data.youthEvents,
    data.entryJobs,
    {
      seed: `${session.seed}:youth`,
      choices: session.choices.youth,
      annualChoices: quarterChoices,
      reviewedYears: session.yearReviews,
      annualOperationCatalog: data.annualOperations,
      quarterlyLifeContent,
      socialCharacterCatalog: data.socialCharacters,
      debugRandomEvents: session.debug?.randomEvents ?? null,
      autoChoose,
    },
  );
  stages.youth = youth;
  if (youth.status === "awaiting_choice") {
    return {
      status: "awaiting_choice",
      stage: "youth",
      profile,
      stages,
      currentState: youth,
      pendingDecision: pendingForStage("youth", youth),
    };
  }

  const adult = simulateAdultLife(
    profile,
    youth,
    data.adult,
    data.adultEvents,
    data.adultJobs,
    {
      seed: `${session.seed}:adult`,
      choices: session.choices.adult,
      annualChoices: quarterChoices,
      reviewedYears: session.yearReviews,
      annualOperationCatalog: data.annualOperations,
      quarterlyLifeContent,
      socialCharacterCatalog: data.socialCharacters,
      debugRandomEvents: session.debug?.randomEvents ?? null,
      debugMinimumSurvivalAge: session.debug?.minimumSurvivalAge ?? null,
      autoChoose,
    },
  );
  stages.adult = adult;
  if (adult.status === "awaiting_choice") {
    return {
      status: "awaiting_choice",
      stage: "adult",
      profile,
      stages,
      currentState: adult,
      pendingDecision: pendingForStage("adult", adult),
    };
  }
  const wholeLifeChoices = collectWholeLifeChoices(profile, stages, data);
  const lifeReview = {
    ...clone(adult.lifeReview),
    ...wholeLifeChoices,
  };
  const completedAdult = {
    ...adult,
    lifeReview,
  };
  stages.adult = completedAdult;
  return {
    status: "completed",
    stage: "adult",
    profile,
    stages,
    currentState: completedAdult,
    ending: clone(adult.ending),
    lifeReview,
  };
}
