import {
  applyQuarterInterestGrowth,
  applyYearlyInterestGrowth,
  applyActivityRepetitionMetadata,
  automaticallyChoosePlan,
  buildQuarterActivities,
  composeQuarterPlan,
  infantExperience,
  planLimits,
  validateQuarterPlan,
} from "./quarterly-life-system.mjs";
import { handleQuarterRandomEvent } from "./quarterly-random-event-system.mjs";
import { settleChildQuarter } from "./childhood-play-system.mjs";
import { createSeededRandom } from "./random.mjs";
import {
  handleYouthMainlineOpportunity,
  recordYouthMainlineFollowThrough,
} from "./youth-mainline-payoff-system.mjs";
import { applyQuarterCharacterGrowth } from "./character-attribute-system.mjs";
import {
  buildQuarterBudget,
  defaultAllocationFor,
  validateQuarterResourcePlan,
} from "./quarter-resource-system.mjs";
import {
  applyExecutionToActivities,
  applyQuarterMonthSettlement,
  simulateQuarterMonths,
} from "./quarter-month-simulator.mjs";
import { settleLifeQuarterProcess } from "./life-activity-process-system.mjs";

function clone(value) {
  return structuredClone(value);
}

function valueAtPath(target, path) {
  return path.split(".").reduce((value, key) => value?.[key], target);
}

function setAtPath(target, path, value) {
  const parts = path.split(".");
  let cursor = target;
  for (const key of parts.slice(0, -1)) {
    if (cursor[key] == null || typeof cursor[key] !== "object") cursor[key] = {};
    cursor = cursor[key];
  }
  cursor[parts.at(-1)] = value;
}

function matchesWhen(when = {}, context) {
  if (when.residenceIn && !when.residenceIn.includes(context.residence)) return false;
  if (when.pathIn && !when.pathIn.includes(context.path)) return false;
  if (when.occupationIn && !when.occupationIn.includes(context.occupation)) return false;
  if (when.industryIn && !when.industryIn.includes(context.industry)) return false;
  if (when.educationStatusIn && !when.educationStatusIn.includes(context.educationStatus)) {
    return false;
  }
  if (when.employmentStatusIn && !when.employmentStatusIn.includes(context.employmentStatus)) {
    return false;
  }
  if (when.employmentStatusNotIn && when.employmentStatusNotIn.includes(context.employmentStatus)) {
    return false;
  }
  if (when.relationshipStatusIn && !when.relationshipStatusIn.includes(context.relationshipStatus)) {
    return false;
  }
  if (when.hasChild != null && Boolean(context.hasChild) !== when.hasChild) return false;
  if (
    when.minimumOlderParentCount != null
    && (!Number.isFinite(context.olderParentCount)
      || context.olderParentCount < when.minimumOlderParentCount)
  ) return false;
  if (when.minAge != null && context.age < when.minAge) return false;
  if (when.maxAge != null && context.age > when.maxAge) return false;
  if (
    (when.calendarYearMin != null || when.calendarYearMax != null)
    && !Number.isFinite(context.calendarYear)
  ) return false;
  if (when.calendarYearMin != null && context.calendarYear < when.calendarYearMin) return false;
  if (when.calendarYearMax != null && context.calendarYear > when.calendarYearMax) return false;
  if (
    (when.healthValueMin != null || when.healthValueMax != null)
    && !Number.isFinite(context.healthValue)
  ) return false;
  if (when.healthValueMin != null && context.healthValue < when.healthValueMin) return false;
  if (when.healthValueMax != null && context.healthValue > when.healthValueMax) return false;
  return true;
}

function selectWeighted(random, options) {
  const total = options.reduce((sum, option) => sum + Math.max(0, option.autoWeight ?? 1), 0);
  if (total <= 0) return options[0];
  let point = random() * total;
  for (const option of options) {
    point -= Math.max(0, option.autoWeight ?? 1);
    if (point <= 0) return option;
  }
  return options.at(-1);
}

export function annualOperationKey(calendarYear) {
  return `annual:${calendarYear}`;
}

export function quarterOperationKey(calendarYear, quarter) {
  if (!Number.isInteger(quarter) || quarter < 1 || quarter > 4) {
    throw new RangeError(`季度必须是1至4，收到：${quarter}`);
  }
  return `quarter:${calendarYear}:Q${quarter}`;
}

const QUARTER_LABELS = ["第一季度", "第二季度", "第三季度", "第四季度"];
const CONTROL_PREFIX = "quarter-control:";

/**
 * 操作量按人生阶段变化。低龄儿童由家庭一次安排半年；青少年到普通成年每季可调整；
 * 退休后减少例行点击，但关键事件仍由各阶段模拟器单独打断。
 */
export function lifeStageQuarterCadence(age) {
  if (age === 0) {
    return {
      id: "newborn_observation",
      label: "出生经历自动推进",
      interactiveQuarters: [],
      continuationLabel: "家庭与环境继续形成经历",
    };
  }
  if (age === 1) {
    return {
      id: "toddler_one_reaction",
      label: "幼儿具体反应",
      interactiveQuarters: [3],
      continuationLabel: "日常体验继续发生",
    };
  }
  if (age === 2) {
    return {
      id: "toddler_half_year_reaction",
      label: "幼儿具体反应",
      interactiveQuarters: [1, 3],
      continuationLabel: "延续眼前喜欢做的事情",
    };
  }
  if (age <= 11) {
    return {
      id: "child_half_year",
      label: "儿童半年安排",
      interactiveQuarters: [1, 3],
      continuationLabel: "延续上一季度的日常安排",
    };
  }
  if (age <= 59) {
    return {
      id: age <= 17 ? "adolescent_quarterly" : "adult_quarterly",
      label: "季度安排",
      interactiveQuarters: [1, 2, 3, 4],
      continuationLabel: "延续上季度安排",
    };
  }
  return {
    id: "later_life_half_year",
    label: "晚年半年安排",
    interactiveQuarters: [1, 3],
    continuationLabel: "延续上一季度的生活安排",
  };
}

function controlOptionId(mode) {
  return `${CONTROL_PREFIX}${mode}`;
}

function criticalQuarterReason(stage, age, quarter) {
  if (quarter !== 1 && quarter !== 3) return null;
  if (age === 6 && quarter === 3) return "临近入学，原来的日常安排需要重新确认";
  if ([12, 16, 18, 22].includes(age) && quarter === 1) {
    return "进入新的学习或工作节点，需要重新确认安排";
  }
  if (age === 60 && quarter === 1) return "生活阶段发生变化，需要重新确认日常安排";
  if (stage === "adult" && age > 60 && age % 10 === 0 && quarter === 1) {
    return "年龄与家庭责任出现阶段性变化，需要重新确认安排";
  }
  return null;
}

export function yearReviewKey(calendarYear) {
  return `review:${calendarYear}`;
}

export function handleYearReview({
  state,
  record,
  stage,
  reviewedYears = {},
  autoChoose,
  enabled = true,
}) {
  if (!enabled || autoChoose || state.status === "ended") return true;
  const eventId = yearReviewKey(record.calendarYear);
  if (reviewedYears[eventId]) return true;
  state.status = "awaiting_choice";
  state.pendingDecision = {
    kind: "year_review",
    eventId,
    calendarYear: record.calendarYear,
    age: record.age,
    title: `${record.age}岁的年度结算`,
    prompt: record.quarterRecords?.length === 4
      ? `四个季度已经完成：${record.quarterRecords.map((quarter) => `Q${quarter.quarter}“${quarter.operationLabel}”`).join("、")}。家庭、教育、工作和现金事实也已按自然年汇总；确认后年龄才增加一岁。`
      : "这一年的行动、家庭、教育或工作事实已经完成结算。确认后，时间才会继续推进。",
    quarterSummary: clone(record.quarterRecords ?? []),
    options: [{
      id: "confirm_year_review",
      label: "确认这一年，继续人生",
      description: "本年事实会保存在年表和存档中。",
    }],
    stage,
  };
  return false;
}

export function findAnnualOperationBand(catalog, context) {
  return catalog.bands.find((band) => (
    band.stages.includes(context.stage)
    && context.age >= band.minAge
    && context.age <= band.maxAge
    && matchesWhen(band.when, context)
  )) ?? null;
}

function materializeAnnualOperationBand(catalog, band, seen = new Set()) {
  if (!band?.extendsBand) return band;
  if (seen.has(band.id)) throw new Error(`年度行动分组存在循环继承：${band.id}`);
  const nextSeen = new Set(seen).add(band.id);
  const base = catalog.bands.find((entry) => entry.id === band.extendsBand);
  if (!base) throw new Error(`年度行动基础分组不存在：${band.extendsBand}`);
  const materializedBase = materializeAnnualOperationBand(catalog, base, nextSeen);
  const optionIndex = new Map((materializedBase.options ?? []).map((option) => [option.id, option]));
  for (const option of band.options ?? []) optionIndex.set(option.id, option);
  return {
    ...materializedBase,
    ...band,
    stateDefaults: {
      ...(materializedBase.stateDefaults ?? {}),
      ...(band.stateDefaults ?? {}),
    },
    options: [...optionIndex.values()],
    inheritedFromBandId: materializedBase.id,
  };
}

export function availableAnnualOperations(catalog, context) {
  const selectedBand = findAnnualOperationBand(catalog, context);
  if (!selectedBand) return { band: null, options: [] };
  const band = materializeAnnualOperationBand(catalog, selectedBand);
  return {
    band,
    options: band.options
      .filter((option) => matchesWhen(option.when, context))
      .map((option) => {
        const cashCostYuan = option.cashCostReferenceShare != null
          && Number.isFinite(context.cashReferenceYuan)
          ? Math.round(context.cashReferenceYuan * option.cashCostReferenceShare * 100) / 100
          : (option.cashCostYuan ?? 0);
        const unavailableReasons = [];
        if (option.timeUseHoursPerWeek > band.weeklyDiscretionaryHours) {
          unavailableReasons.push(`每周需要${option.timeUseHoursPerWeek}小时，超过可安排的${band.weeklyDiscretionaryHours}小时`);
        }
        if (
          Number.isFinite(context.affordableCashYuan)
          && cashCostYuan > context.affordableCashYuan
        ) {
          unavailableReasons.push(`需要${cashCostYuan}元，目前能用于本行动的现金为${Math.max(0, context.affordableCashYuan)}元`);
        }
        return {
          ...option,
          cashCostYuan,
          available: unavailableReasons.length === 0,
          unavailableReason: unavailableReasons.join("；") || null,
        };
      }),
  };
}

function recordAnnualOperationCashExpense(state, record, selected, fact, addFact) {
  const amount = selected.cashCostYuan ?? 0;
  state.annualOperationExpenseYuan = amount;
  if (state.household?.finance) {
    state.household.finance.annualOperationExpenseYuan = amount;
    state.household.finance.cashAfterAnnualOperationYuan = Math.round(
      Math.max(0, (
        state.household.finance.cashAfterEducationExpenseYuan
          ?? state.household.finance.annualHouseholdIncomeYuan
          ?? 0
      ) - amount) * 100,
    ) / 100;
  }
  if (state.finance) state.finance.pendingAnnualOperationExpenseYuan = amount;
  if (amount <= 0) return null;
  return addFact(record, "annual_operation_cash_expense", {
    operationId: selected.id,
    amountYuan: amount,
    purpose: selected.cashCostPurpose ?? selected.label,
    referenceShare: selected.cashCostReferenceShare ?? null,
    sourceAnnualOperationFactId: fact.id,
    fundingSource: state.finance
      ? "personal_or_household_annual_cashflow"
      : "origin_household_annual_cashflow",
  });
}

function applyLongTermEchoes(state, record, catalog, selected, addFact, changeStat) {
  const decisions = [...(state.priorDecisions ?? []), ...state.decisions]
    .filter((decision) => decision.decisionKind === "annual_operation");
  const selectedIds = selected.activityIds?.length ? selected.activityIds : [selected.id];
  for (const rule of catalog.longTermEchoRules ?? []) {
    if (!selectedIds.some((id) => rule.operationIds.includes(id))) continue;
    const related = decisions.filter((decision) => (
      (decision.chosenActivityIds ?? [decision.chosenOptionId])
        .some((id) => rule.operationIds.includes(id))
    ));
    if (!rule.thresholds.includes(related.length)) continue;
    const fact = addFact(record, "annual_operation_echo", {
      echoId: `${rule.id}:${related.length}`,
      domain: rule.domain,
      title: rule.title,
      description: rule.description,
      accumulatedYears: related.length,
      threshold: related.length,
      contributingOperationIds: related.flatMap(
        (decision) => decision.chosenActivityIds ?? [decision.chosenOptionId],
      ).filter((id) => rule.operationIds.includes(id)),
    });
    for (const [stat, delta] of Object.entries(rule.statChanges ?? {})) {
      changeStat(state, record, stat, delta, fact.id, `长期回响：${rule.title}`);
    }
    applyAnnualOperationStateEffects(state, rule);
    state.annualOperationEchoes ??= [];
    state.annualOperationEchoes.push({
      id: `${rule.id}:${related.length}`,
      calendarYear: record.calendarYear,
      age: record.age,
      sourceFactId: fact.id,
    });
  }
}

export function applyAnnualOperationStateEffects(state, option) {
  for (const [path, value] of Object.entries(option.stateAssignments ?? {})) {
    setAtPath(state, path, clone(value));
  }
  for (const [path, delta] of Object.entries(option.stateDeltas ?? {})) {
    const current = valueAtPath(state, path) ?? 0;
    if (!Number.isFinite(current) || !Number.isFinite(delta)) {
      throw new Error(`年度行动 ${option.id} 的数值变化路径无效：${path}`);
    }
    setAtPath(state, path, current + delta);
  }
}

function roundedMoney(value) {
  return Math.round(value * 100) / 100;
}

function roundedStatStep(value) {
  return value >= 0 ? Math.floor(value + 0.5) : Math.ceil(value - 0.5);
}

function buildQuarterPromptOptions(activities, previous, interruptionReason) {
  const actionOptions = activities.map((option) => ({
    id: option.id,
    label: option.label,
    description: option.description,
    timeUseHoursPerWeek: option.timeUseHoursPerWeek,
    cashCostYuan: roundedMoney((option.cashCostYuan ?? 0) / 4),
    available: option.available,
    unavailableReason: option.unavailableReason,
    effectSummary: option.effectSummary,
    category: option.category,
    categoryLabel: option.categoryLabel,
    resourceEffect: option.resourceEffect ?? null,
    interestTags: clone(option.interestTags ?? []),
    defaultIntensity: option.defaultIntensity,
    intensities: clone(option.intensities ?? []),
    timeSlots: option.timeSlots,
    energyCost: option.energyCost,
    statChanges: clone(option.statChanges ?? {}),
    growthChanges: clone(option.growthChanges ?? {}),
    requiresGrowth: clone(option.requiresGrowth ?? {}),
    repetitionStatus: option.repetitionStatus ?? null,
    repetitionLabel: option.repetitionLabel ?? null,
    recentQuarterCount: option.recentQuarterCount ?? 0,
    consecutiveQuarters: option.consecutiveQuarters ?? 0,
    recommendationScore: option.recommendationScore ?? option.autoWeight ?? 1,
    isPlanControl: false,
    controlMode: "select",
  }));
  if (!previous?.activityIds?.length || interruptionReason) return actionOptions;
  const controls = [
    {
      id: controlOptionId("continue"),
      label: "延续上季度安排",
      description: `本季度继续“${previous.label}”，下季度仍可重新调整。`,
      timeUseHoursPerWeek: previous.timeUseHoursPerWeek,
      cashCostYuan: roundedMoney((previous.cashCostYuan ?? 0) / 4),
      available: true,
      effectSummary: "沿用已有节奏，减少重复规划",
      activityIds: clone(previous.activityIds),
      allocations: clone(previous.allocations ?? []),
      isPlanControl: true,
      controlMode: "continue",
    },
    {
      id: controlOptionId("keep_year"),
      label: "维持到年底，除非发生关键事件",
      description: `余下季度继续“${previous.label}”，若生活阶段或执行条件变化会中断。`,
      timeUseHoursPerWeek: previous.timeUseHoursPerWeek,
      cashCostYuan: roundedMoney((previous.cashCostYuan ?? 0) / 4),
      available: true,
      effectSummary: "余下普通季度快速结算",
      activityIds: clone(previous.activityIds),
      allocations: clone(previous.allocations ?? []),
      isPlanControl: true,
      controlMode: "keep_year",
    },
    {
      id: controlOptionId("notify_only"),
      label: "只在计划不可执行时提醒我",
      description: `持续沿用“${previous.label}”；换阶段、条件不再满足或关键节点到来时再询问。`,
      timeUseHoursPerWeek: previous.timeUseHoursPerWeek,
      cashCostYuan: roundedMoney((previous.cashCostYuan ?? 0) / 4),
      available: true,
      effectSummary: "跨年自动推进普通季度",
      activityIds: clone(previous.activityIds),
      allocations: clone(previous.allocations ?? []),
      isPlanControl: true,
      controlMode: "notify_only",
    },
  ];
  return [...controls, ...actionOptions];
}

function composeResourceQuarter({
  activityIds,
  suppliedAllocations,
  activities,
  constraints,
  state,
  allowEmpty = false,
}) {
  const selectedActivities = allowEmpty && activityIds.length === 0
    ? []
    : validateQuarterPlan(activityIds, activities, constraints);
  const allocations = activityIds.map((actionId) => {
    const supplied = suppliedAllocations?.find((entry) => entry.actionId === actionId);
    if (supplied) return supplied;
    return defaultAllocationFor(
      selectedActivities.find((entry) => entry.id === actionId),
      state,
    );
  });
  const resourcePlan = validateQuarterResourcePlan(
    allocations,
    selectedActivities,
    constraints.quarterBudget,
    { state },
  );
  return composeQuarterPlan(selectedActivities, {
    ...constraints,
    resourcePlan,
  });
}

function applyQuarterlyStateEffects(state, band, quarterSelections) {
  const assignments = new Map();
  for (const [path, value] of Object.entries(band.stateDefaults ?? {})) {
    assignments.set(path, Array(4).fill(value));
  }
  for (const [index, selected] of quarterSelections.entries()) {
    for (const [path, value] of Object.entries(selected.stateAssignments ?? {})) {
      if (!assignments.has(path)) {
        const current = valueAtPath(state, path);
        assignments.set(path, Array(4).fill(current));
      }
      assignments.get(path)[index] = value;
    }
  }
  for (const [path, values] of assignments) {
    const numeric = values.every(Number.isFinite);
    setAtPath(
      state,
      path,
      numeric ? values.reduce((sum, value) => sum + value, 0) / 4 : clone(values.at(-1)),
    );
  }
  for (const selected of quarterSelections) {
    const scaledDeltas = Object.fromEntries(
      Object.entries(selected.stateDeltas ?? {}).map(([path, value]) => [path, value / 4]),
    );
    applyAnnualOperationStateEffects(state, { id: selected.id, stateDeltas: scaledDeltas });
  }
}

function dominantQuarterSelection(selections) {
  const counts = new Map();
  for (const selected of selections) counts.set(selected.id, (counts.get(selected.id) ?? 0) + 1);
  return selections.reduce((best, selected) => (
    (counts.get(selected.id) ?? 0) > (counts.get(best.id) ?? 0) ? selected : best
  ), selections[0]);
}

/**
 * 在当前年度事实结算后暂停，要求玩家选定这一年的主要行动方向。
 * 返回false表示已经写入pendingDecision，调用方应保存本年记录并停止推进。
 */
export function handleAnnualOperation({
  state,
  record,
  catalog,
  content,
  stage,
  choices = {},
  autoChoose,
  random,
  addFact,
  changeStat,
  context = {},
  skip = false,
  debugRandomEvents = null,
  socialCharacterCatalog = null,
}) {
  if (!catalog || skip) return true;
  if (!content) throw new Error("季度生活系统缺少内容配置");
  const fullContext = {
    stage,
    age: record.age,
    calendarYear: record.calendarYear,
    ...context,
  };
  const { band, options } = availableAnnualOperations(catalog, fullContext);
  if (!band) {
    throw new Error(`${stage}阶段${record.age}岁没有季度生活内容`);
  }
  let activities = buildQuarterActivities({ options, content, state, context: fullContext });
  const selectableActivities = activities.filter((option) => option.available);
  const limits = planLimits(record.age, selectableActivities.length);
  if (selectableActivities.length < limits.minActivities) {
    throw new Error(`${stage}阶段${record.age}岁受时间或现金约束后没有足够的具体生活活动`);
  }

  const cadence = lifeStageQuarterCadence(record.age);
  const quarterSelections = [];
  const quarterRecords = [];
  let previous = null;
  let keepToYearEnd = null;
  const automation = choices.__automation ?? null;
  const randomEventChoices = choices.__randomEventChoices ?? {};
  const mainlineChoices = choices.__mainlineChoices ?? {};
  const availableCashYuan = activities.some((option) => option.cashCostYuan > 0)
    && Number.isFinite(fullContext.affordableCashYuan)
    ? roundedMoney(Math.max(0, fullContext.affordableCashYuan) / 4)
    : null;
  const constraints = {
    ...limits,
    weeklyDiscretionaryHours: band.weeklyDiscretionaryHours,
    availableCashYuan,
  };

  for (let quarter = 1; quarter <= 4; quarter += 1) {
    activities = applyActivityRepetitionMetadata(activities, {
      priorDecisions: [...(state.priorDecisions ?? []), ...(state.decisions ?? [])],
      quarterRecords,
    });
    const eventId = quarterOperationKey(record.calendarYear, quarter);
    const interactive = cadence.interactiveQuarters.includes(quarter);
    let interruptionReason = criticalQuarterReason(stage, record.age, quarter);
    const supplied = choices[eventId];
    const quarterBudget = buildQuarterBudget({
      state,
      weeklyDiscretionaryHours: band.weeklyDiscretionaryHours,
      burdenEnergyPenalty: fullContext.quarterBurdenEnergyPenalty ?? 0,
      age: record.age,
      stage,
      context: fullContext,
    });
    const quarterConstraints = { ...constraints, quarterBudget };
    let selected;
    let source;
    let controlMode = null;

    if (supplied) {
      const activityIds = Array.isArray(supplied.activityIds)
        ? supplied.activityIds
        : (typeof supplied === "string" ? [supplied] : []);
      selected = composeResourceQuarter({
        activityIds,
        suppliedAllocations: supplied.allocations,
        activities,
        constraints: quarterConstraints,
        state,
      });
      controlMode = supplied.controlMode ?? "select";
      source = controlMode === "select" ? "provided" : controlMode;
      if (controlMode === "keep_year") keepToYearEnd = selected;
    } else if (keepToYearEnd && !interruptionReason) {
      try {
        selected = composeResourceQuarter({
          activityIds: keepToYearEnd.activityIds,
          suppliedAllocations: keepToYearEnd.allocations,
          activities,
          constraints: quarterConstraints,
          state,
        });
        source = "maintain_to_year_end";
        controlMode = "keep_year";
      } catch (error) {
        interruptionReason = `维持到年底的计划已不可执行：${error.message}`;
      }
    } else if (!interactive && previous?.activityIds?.length) {
      try {
        selected = composeResourceQuarter({
          activityIds: previous.activityIds,
          suppliedAllocations: previous.allocations,
          activities,
          constraints: quarterConstraints,
          state,
        });
        source = record.age <= 2 ? "development_continuation" : "stage_continuation";
        controlMode = "automatic_continuation";
      } catch (error) {
        interruptionReason = `上一季度的安排已不可继续：${error.message}`;
      }
    } else if (!interactive && record.age <= 1) {
      selected = composeResourceQuarter({
        activityIds: [],
        suppliedAllocations: [],
        activities,
        constraints: quarterConstraints,
        state,
        allowEmpty: true,
      });
      source = "age_appropriate_observation";
      controlMode = "automatic_observation";
    } else if (
      automation?.mode === "notify_only"
      && automation.stage === stage
      && !interruptionReason
    ) {
      try {
        selected = composeResourceQuarter({
          activityIds: automation.activityIds ?? [],
          suppliedAllocations: automation.allocations,
          activities,
          constraints: quarterConstraints,
          state,
        });
        source = "notify_only";
        controlMode = "notify_only";
      } catch (error) {
        selected = null;
        interruptionReason = `持续计划已不可执行：${error.message}`;
      }
    }

    if (!selected && autoChoose) {
      const automaticActivities = automaticallyChoosePlan(activities, constraints, random);
      try {
        selected = composeResourceQuarter({
          activityIds: automaticActivities.map((entry) => entry.id),
          suppliedAllocations: null,
          activities,
          constraints: quarterConstraints,
          state,
        });
      } catch {
        selected = composeResourceQuarter({
          activityIds: automaticActivities.map((entry) => entry.id),
          suppliedAllocations: automaticActivities.map((entry) => ({
            actionId: entry.id,
            intensity: "trial",
          })),
          activities,
          constraints: quarterConstraints,
          state,
        });
      }
      source = "automatic";
      controlMode = "automatic";
    }

    if (!selected) {
      state.status = "awaiting_choice";
      record.quarterRecords = quarterRecords;
      const promptOptions = buildQuarterPromptOptions(activities, previous, interruptionReason);
      state.pendingDecision = {
        kind: "quarter_plan",
        eventId,
        calendarYear: record.calendarYear,
        age: record.age,
        quarter,
        quarterLabel: QUARTER_LABELS[quarter - 1],
        cadenceId: cadence.id,
        cadenceLabel: cadence.label,
        completedQuarterCount: quarterRecords.length,
        title: record.age <= 2
          ? "眼前的什么吸引了我"
          : `${QUARTER_LABELS[quarter - 1]}，我怎样生活`,
        prompt: interruptionReason
          ? `${interruptionReason}。只选择这个年龄的我真正能做的事情。`
          : (record.age <= 2
              ? "家庭决定照护条件；我只回应此刻能看到、听到和够到的事物。"
              : "学习、娱乐、朋友和家庭生活可以同时发生。请在同一页组合这一季真正会做的具体活动。"),
        interruptionReason,
        planInvalidated: Boolean(interruptionReason && /不可执行|不可继续/.test(interruptionReason)),
        weeklyDiscretionaryHours: band.weeklyDiscretionaryHours,
        quarterBudget: clone(quarterBudget),
        resourceRules: {
          totalTimeSlots: 12,
          maximumEnergyOverdraft: 3,
          intensities: ["trial", "regular", "focus"],
        },
        availableCashYuan,
        minActivities: limits.minActivities,
        maxActivities: limits.maxActivities,
        unallocatedTimeMeaning: content.rules.unallocatedTimeMeaning,
        previousPlan: previous ? {
          id: previous.id,
          label: previous.label,
          activityIds: clone(previous.activityIds),
        } : null,
        options: promptOptions,
      };
      return false;
    }

    const quarterCashCostYuan = roundedMoney((selected.cashCostYuan ?? 0) / 4);
    quarterSelections.push(selected);
    const quarterRecord = {
      quarter,
      label: QUARTER_LABELS[quarter - 1],
      weeks: 13,
      operationId: selected.id,
      operationLabel: selected.label,
      activityIds: clone(selected.activityIds),
      activities: clone(selected.activities),
      allocations: clone(selected.allocations ?? []),
      quarterBudget: clone(selected.quarterBudget ?? quarterBudget),
      timeSlotsUsed: selected.timeSlotsUsed ?? 0,
      reservedTimeSlots: selected.reservedTimeSlots ?? quarterBudget.availableTimeSlots,
      energySpent: selected.energySpent ?? 0,
      energyRemaining: selected.energyRemaining ?? quarterBudget.availableEnergy,
      overdraftEnergy: selected.overdraftEnergy ?? 0,
      plannedTimeSlots: selected.timeSlotsUsed ?? 0,
      plannedEnergySpent: selected.energySpent ?? 0,
      monthTicks: [],
      description: selected.description,
      timeUseHoursPerWeek: selected.timeUseHoursPerWeek,
      plannedHours: selected.timeUseHoursPerWeek * 13,
      unallocatedHoursPerWeek: selected.unallocatedHoursPerWeek
        ?? band.weeklyDiscretionaryHours,
      cashCostYuan: quarterCashCostYuan,
      effectSummary: selected.effectSummary,
      source,
      controlMode,
      quickSettled: !["provided", "automatic"].includes(source),
      experience: record.age <= 2
        ? infantExperience(content, record.age, record.calendarYear, quarter, state.seed)
        : null,
    };
    quarterRecords.push(quarterRecord);
    record.quarterRecords = quarterRecords;
    const randomReady = handleQuarterRandomEvent({
      state,
      record,
      content,
      stage,
      quarter,
      plan: selected,
      choices: randomEventChoices,
      autoChoose,
      context: fullContext,
      addFact,
      changeStat,
      debugRandomEvents,
    });
    if (!randomReady) return false;
    const monthSimulation = simulateQuarterMonths({
      state,
      plan: selected,
      budget: selected.quarterBudget ?? quarterBudget,
      calendarYear: record.calendarYear,
      quarter,
      interruption: quarterRecord.planInterruption ?? null,
    });
    quarterRecord.monthSimulation = clone(monthSimulation);
    quarterRecord.monthTicks = clone(monthSimulation.monthTicks);
    quarterRecord.activities = applyExecutionToActivities(selected.activities, monthSimulation);
    quarterRecord.executedTimeSlots = monthSimulation.executedTimeSlots;
    quarterRecord.timeSlotsUsed = monthSimulation.executedTimeSlots;
    quarterRecord.executedEnergySpent = monthSimulation.executedEnergySpent;
    quarterRecord.energySpent = monthSimulation.executedEnergySpent;
    quarterRecord.energyRemaining = monthSimulation.energyRemaining;
    quarterRecord.overdraftEnergy = monthSimulation.overdraftEnergy;
    quarterRecord.executionRate = monthSimulation.executionRate;
    quarterRecord.quarterBudget.spentEnergy = monthSimulation.executedEnergySpent;
    quarterRecord.quarterBudget.overdraftEnergy = monthSimulation.overdraftEnergy;
    const executedPlan = {
      ...selected,
      activities: quarterRecord.activities,
      executionRate: monthSimulation.executionRate,
    };
    const childSettlement = settleChildQuarter({
      state,
      record,
      content,
      stage,
      quarter,
      plan: executedPlan,
      context: fullContext,
      socialCatalog: socialCharacterCatalog,
      random: createSeededRandom(`${state.seed}:child-play:${record.calendarYear}:Q${quarter}`),
      addFact,
    });
    const lifeProcessSettlement = settleLifeQuarterProcess({
      state,
      record,
      stage,
      quarter,
      plan: executedPlan,
      context: fullContext,
      addFact,
    });
    quarterRecord.activityResults = [
      ...childSettlement.results,
      ...lifeProcessSettlement.results,
    ];
    quarterRecord.growthMilestones = childSettlement.milestones;
    quarterRecord.growthChanges = clone(childSettlement.growthChanges ?? {});
    quarterRecord.interestChanges = applyQuarterInterestGrowth({
      state,
      record,
      quarterRecord,
      content,
      addFact,
    });
    quarterRecord.characterGrowth = applyQuarterCharacterGrowth({
      state,
      age: record.age,
      quarter,
      activities: quarterRecord.activities,
      allocations: selected.allocations,
    });
    applyQuarterMonthSettlement(state, monthSimulation);
    quarterRecord.statProgress = Object.fromEntries(
      Object.entries(selected.statChanges ?? {}).map(([stat, delta]) => [
        stat,
        delta * monthSimulation.executionRate / 4,
      ]),
    );
    state.quarterlyStatResiduals ??= {};
    quarterRecord.statChanges = {};
    for (const [stat, progress] of Object.entries(quarterRecord.statProgress)) {
      const accumulated = (state.quarterlyStatResiduals[stat] ?? 0) + progress;
      const applied = roundedStatStep(accumulated);
      state.quarterlyStatResiduals[stat] = accumulated - applied;
      if (applied !== 0) quarterRecord.statChanges[stat] = applied;
    }
    const growthFact = addFact(record, "quarter_growth_effects", {
      quarter,
      activityIds: clone(selected.activityIds),
      activityLabels: selected.activities.map((activity) => activity.label),
      statChanges: clone(quarterRecord.statChanges),
      statProgress: clone(quarterRecord.statProgress),
      interestChanges: clone(quarterRecord.interestChanges),
      growthChanges: clone(quarterRecord.growthChanges),
      characterGrowth: clone(quarterRecord.characterGrowth),
      resourceSummary: {
        timeSlotsUsed: quarterRecord.timeSlotsUsed,
        reservedTimeSlots: quarterRecord.reservedTimeSlots,
        energySpent: quarterRecord.energySpent,
        energyRemaining: quarterRecord.energyRemaining,
        overdraftEnergy: quarterRecord.overdraftEnergy,
        executionRate: quarterRecord.executionRate,
        recoveryEnergy: monthSimulation.recoveryEnergy,
      },
      monthTicks: clone(quarterRecord.monthTicks),
      planInterruption: clone(quarterRecord.planInterruption ?? null),
    });
    for (const [stat, delta] of Object.entries(quarterRecord.statChanges)) {
      changeStat(state, record, stat, delta, growthFact.id, `第${quarter}季度生活积累：${selected.label}`);
    }
    quarterRecord.mainlineFollowThrough = recordYouthMainlineFollowThrough({
      state,
      record,
      quarterRecord,
      addFact,
    });
    const mainlineReady = handleYouthMainlineOpportunity({
      state,
      record,
      stage,
      quarter,
      content: content.mainlinePayoffs,
      choices: mainlineChoices,
      autoChoose,
      socialCatalog: socialCharacterCatalog,
      addFact,
      changeStat,
    });
    if (!mainlineReady) return false;
    previous = selected;
  }

  record.quarterRecords = quarterRecords;
  const selected = dominantQuarterSelection(quarterSelections);
  const distinctActivities = [...new Map(
    quarterRecords.flatMap((quarter) => quarter.activities ?? [])
      .map((activity) => [activity.id, activity]),
  ).values()];
  const averageWeeklyHours = Math.round(
    quarterSelections.reduce((sum, option) => sum + option.timeUseHoursPerWeek, 0) / 4 * 10,
  ) / 10;
  const totalCashCostYuan = roundedMoney(
    quarterSelections.reduce((sum, option) => sum + (option.cashCostYuan ?? 0) / 4, 0),
  );
  const summaryLabel = distinctActivities.length > 0
    ? distinctActivities.map((activity) => activity.label).join("、")
    : "在家庭照护和感知中度过这一年";
  const fact = addFact(record, "annual_operation", {
    operationId: selected.id,
    label: summaryLabel,
    description: "由四个季度的实际安排汇总形成。",
    lifeStage: stage,
    timeUseHoursPerWeek: averageWeeklyHours,
    plannedHoursThisYear: quarterRecords.reduce((sum, item) => sum + item.plannedHours, 0),
    cashCostYuan: totalCashCostYuan,
    effectSummary: "四个季度的学习、娱乐、交往和普通生活分别产生影响",
    choiceSource: "quarterly_aggregate",
    quarterOperationIds: quarterSelections.map((option) => option.id),
  });
  applyQuarterlyStateEffects(state, band, quarterSelections);
  recordAnnualOperationCashExpense(state, record, {
    ...selected,
    id: `quarterly:${record.calendarYear}`,
    label: summaryLabel,
    cashCostYuan: totalCashCostYuan,
    cashCostPurpose: [...new Set(quarterSelections
      .filter((option) => (option.cashCostYuan ?? 0) > 0)
      .map((option) => option.cashCostPurpose ?? option.label))].join("、"),
  }, fact, addFact);
  applyYearlyInterestGrowth({
    state,
    record,
    quarterRecords,
    content,
    addFact,
  });

  const annualEventId = annualOperationKey(record.calendarYear);
  const decision = {
    decisionKind: "annual_operation",
    eventId: annualEventId,
    calendarYear: record.calendarYear,
    age: record.age,
    chosenOptionId: selected.id,
    chosenActivityIds: distinctActivities.map((activity) => activity.id),
    selectedLabel: summaryLabel,
    quarterOperations: clone(quarterRecords),
    unchosenOptions: activities
      .filter((option) => !quarterRecords.some((quarter) => quarter.activityIds.includes(option.id)))
      .map((option) => ({
        id: option.id,
        label: option.label,
        description: option.description,
        timeUseHoursPerWeek: option.timeUseHoursPerWeek,
        cashCostYuan: option.cashCostYuan ?? 0,
        available: option.available,
        unavailableReason: option.unavailableReason,
        effectSummary: option.effectSummary,
      })),
    choiceSource: "quarterly_aggregate",
    sourceFactId: fact.id,
  };
  state.decisions.push(decision);
  record.annualOperation = decision;
  if (Array.isArray(record.decisions)) record.decisions.push(decision);
  applyLongTermEchoes(state, record, catalog, selected, addFact, changeStat);
  return true;
}
