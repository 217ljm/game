import { buildChildhoodPlayActivities } from "./childhood-play-system.mjs";
import { buildUnlockedMainlineActivities } from "./youth-mainline-payoff-system.mjs";
import {
  buildActionIntensities,
  defaultAllocationFor,
  inferDefaultIntensity,
  resourceSummary,
} from "./quarter-resource-system.mjs";

function clone(value) {
  return structuredClone(value);
}

const CATEGORY_PATTERNS = [
  ["finance", /save|contract|terms|cash|finance|储蓄|支出/],
  ["health", /health|active|body|rest|balanced|protect|reduce_load|运动|休息/],
  ["family", /family|household|child|parent|care|家里|照护/],
  ["social", /peer|friend|relationship|social|community|contact|同学|朋友|关系/],
  ["work", /work|job|career|skill|practice|training|实训|技能|岗位/],
  ["learning", /study|schoolwork|course|curriculum|self_learning|symbols|basics|阅读|功课|学习/],
  ["entertainment", /play|leisure|interest|娱乐|游戏/],
  ["exploration", /observe|ask_about|compare|探索|观察/],
];

const INTEREST_PATTERNS = [
  ["reading_language", /study|schoolwork|course|curriculum|self_learning|symbols|basics|read|阅读|认字|功课/],
  ["numbers_logic", /plan|compare|contract|terms|save|算|数字|规划/],
  ["sports_movement", /play|active|health|body|运动|活动|玩/],
  ["nature_observation", /observe.*work|nearby|local|自然|附近|观察/],
  ["making_repair", /practical|skill|practice|household|制作|修理|实作/],
  ["social_organizing", /peer|friend|relationship|social|community|contact|family|同伴|朋友|关系/],
  ["practical_work", /work|job|career|training|skill|岗位|工作|实训/],
  ["storytelling_media", /play|interest|leisure|娱乐|故事|游戏/],
];

export const INTEREST_THRESHOLDS = [
  { id: "exposure", minScore: 1, label: "偶尔接触" },
  { id: "emerging", minScore: 18, label: "兴趣萌芽" },
  { id: "hobby", minScore: 45, label: "稳定爱好" },
  { id: "lasting", minScore: 80, label: "长期爱好" },
];

export function interestStage(score) {
  return [...INTEREST_THRESHOLDS].reverse().find((entry) => score >= entry.minScore)
    ?? { id: "none", minScore: 0, label: "尚未形成" };
}

function inferredCategory(id) {
  return CATEGORY_PATTERNS.find(([, pattern]) => pattern.test(id))?.[0] ?? "exploration";
}

function inferredInterestTags(id, category) {
  const tags = INTEREST_PATTERNS
    .filter(([, pattern]) => pattern.test(id))
    .map(([tag]) => tag);
  if (tags.length > 0) return [...new Set(tags)].slice(0, 2);
  const fallback = {
    learning: ["reading_language"],
    entertainment: ["storytelling_media"],
    social: ["social_organizing"],
    exploration: ["nature_observation"],
    family: ["social_organizing"],
    health: ["sports_movement"],
    work: ["practical_work"],
    finance: ["numbers_logic"],
  };
  return fallback[category] ?? [];
}

function activityHours(option) {
  if (Number.isFinite(option.hoursPerWeek)) return option.hoursPerWeek;
  return Math.max(2, Math.round((option.timeUseHoursPerWeek ?? 4) * 0.55));
}

function normalizeActivity(option, content) {
  const category = option.category ?? inferredCategory(option.id);
  const hoursPerWeek = activityHours(option);
  const activity = {
    ...clone(option),
    category,
    categoryLabel: content.categories?.[category] ?? category,
    interestTags: option.interestTags ?? inferredInterestTags(option.id, category),
    timeUseHoursPerWeek: hoursPerWeek,
    originalDirectionHoursPerWeek: option.timeUseHoursPerWeek ?? hoursPerWeek,
    cashCostYuan: option.cashCostYuan ?? 0,
    available: option.available !== false,
    resourceEffect: option.resourceEffect ?? null,
    baseAutoWeight: option.baseAutoWeight ?? option.autoWeight ?? 1,
  };
  activity.defaultIntensity = option.defaultIntensity ?? inferDefaultIntensity(activity);
  activity.intensities = buildActionIntensities(activity);
  const defaultAllocation = defaultAllocationFor(activity);
  activity.timeSlots = defaultAllocation.timeSlots;
  activity.energyCost = defaultAllocation.energyCost;
  return activity;
}

function interestContinuationActivities(state, content, context) {
  const entries = Object.values(state.interests ?? {})
    .filter((entry) => entry.score >= 18)
    .sort((left, right) => right.score - left.score)
    .slice(0, context.age < 12 ? 2 : 3);
  return entries.map((entry) => {
    const stage = interestStage(entry.score);
    const label = content.interestDomains?.[entry.id] ?? entry.id;
    return normalizeActivity({
      id: `continue_interest_${entry.id}`,
      label: stage.id === "hobby" || stage.id === "lasting"
        ? `继续投入我的${label}爱好`
        : `再试试我感兴趣的${label}`,
      description: `这不是凭空出现的新选项；你过去已投入约${Math.round(entry.totalHours)}小时，当前处于“${stage.label}”。`,
      category: ["sports_movement"].includes(entry.id)
        ? "health"
        : (["social_organizing"].includes(entry.id) ? "social" : "entertainment"),
      hoursPerWeek: stage.id === "lasting" ? 5 : 3,
      interestTags: [entry.id],
      statChanges: entry.id === "sports_movement"
        ? { health: 1, mood: 1 }
        : { ability: 1, mood: 1 },
      autoWeight: 1 + entry.score / 100,
      effectSummary: `延续${label}，可能发展为更稳定的爱好`,
    }, content);
  });
}

export function buildQuarterActivities({ options, content, state, context }) {
  if (context.age <= 2) {
    return (content.infantReactions?.[String(context.age)] ?? [])
      .map((option) => normalizeActivity(option, content));
  }
  const result = options.map((option) => normalizeActivity(option, content));
  for (const activity of buildChildhoodPlayActivities(content, state, context)) {
    if (!result.some((option) => option.id === activity.id)) {
      result.push(normalizeActivity(activity, content));
    }
  }
  const leisure = (content.eraLeisure ?? []).find((entry) => (
    context.calendarYear >= entry.minYear
    && context.calendarYear <= entry.maxYear
    && context.age >= entry.minAge
    && context.age <= entry.maxAge
  ));
  if (leisure && !result.some((option) => option.id === leisure.id)) {
    result.push(normalizeActivity({ ...leisure, autoWeight: 0.7, available: true }, content));
  }
  for (const activity of interestContinuationActivities(state, content, context)) {
    if (!result.some((option) => option.id === activity.id)) result.push(activity);
  }
  for (const activity of buildUnlockedMainlineActivities(state, content.mainlinePayoffs, context)) {
    if (!result.some((option) => option.id === activity.id)) {
      result.push(normalizeActivity(activity, content));
    }
  }
  if (context.age >= 3 && !result.some((option) => option.id === "quarter_intentional_rest")) {
    result.push(normalizeActivity({
      id: "quarter_intentional_rest",
      label: context.age <= 11 ? "留出安静休息和发呆的时间" : "主动减量，好好休息",
      description: "休息会占用时间格，但不消耗精力，并帮助降低疲劳与压力。",
      category: "recovery",
      hoursPerWeek: 3,
      defaultIntensity: "trial",
      resourceEffect: "recovery",
      statChanges: { mood: 1 },
      autoWeight: 0.55,
      effectSummary: "恢复精力，降低疲劳与压力",
    }, content));
  }
  return result;
}

function completedQuarterHistory(priorDecisions, quarterRecords) {
  const previousYears = (priorDecisions ?? [])
    .filter((decision) => decision.decisionKind === "annual_operation")
    .flatMap((decision) => (decision.quarterOperations ?? []).map((quarter) => ({
      ...quarter,
      calendarYear: decision.calendarYear,
    })));
  return [...previousYears, ...(quarterRecords ?? [])]
    .filter((quarter) => Array.isArray(quarter.activityIds));
}

/**
 * 重复行动仍可由玩家选择，并继续积累兴趣与长期回响；这里只调整自动推荐顺序。
 * 普通行动连续出现会逐步降权，已形成的爱好则被视为有意义的延续。
 */
export function applyActivityRepetitionMetadata(
  activities,
  { priorDecisions = [], quarterRecords = [] } = {},
) {
  const recentQuarters = completedQuarterHistory(priorDecisions, quarterRecords).slice(-3);
  return activities.map((activity) => {
    let consecutiveQuarters = 0;
    for (const quarter of [...recentQuarters].reverse()) {
      if (!quarter.activityIds.includes(activity.id)) break;
      consecutiveQuarters += 1;
    }
    const recentQuarterCount = recentQuarters.filter(
      (quarter) => quarter.activityIds.includes(activity.id),
    ).length;
    const interestContinuation = activity.id.startsWith("continue_interest_");
    let repetitionStatus = "new";
    let repetitionLabel = "本季新可能";
    let recommendationMultiplier = 1.12;
    if (interestContinuation) {
      repetitionStatus = "interest_continuation";
      repetitionLabel = "爱好延续";
      recommendationMultiplier = 1.08;
    } else if (consecutiveQuarters >= 2) {
      repetitionStatus = "established_routine";
      repetitionLabel = `已连续${consecutiveQuarters}季`;
      recommendationMultiplier = 0.62;
    } else if (consecutiveQuarters === 1) {
      repetitionStatus = "continued";
      repetitionLabel = "延续上季";
      recommendationMultiplier = 0.9;
    } else if (recentQuarterCount > 0) {
      repetitionStatus = "returning";
      repetitionLabel = "隔季再做";
      recommendationMultiplier = 0.96;
    }
    const baseAutoWeight = activity.baseAutoWeight ?? activity.autoWeight ?? 1;
    return {
      ...activity,
      baseAutoWeight,
      autoWeight: baseAutoWeight * recommendationMultiplier,
      recommendationScore: baseAutoWeight * recommendationMultiplier,
      repetitionStatus,
      repetitionLabel,
      recentQuarterCount,
      consecutiveQuarters,
      repetitionDoesNotBlockSelection: true,
    };
  });
}

export function planLimits(age, activityCount) {
  if (age === 0) return { minActivities: 0, maxActivities: 0 };
  if (age <= 2) return { minActivities: 1, maxActivities: 1 };
  if (age <= 5) return { minActivities: 1, maxActivities: Math.min(3, activityCount) };
  if (age <= 11) return { minActivities: 2, maxActivities: Math.min(3, activityCount) };
  return { minActivities: 2, maxActivities: Math.min(4, activityCount) };
}

function planQuarterCashCost(activity) {
  return Math.round(((activity.cashCostYuan ?? 0) / 4) * 100) / 100;
}

export function validateQuarterPlan(activityIds, activities, constraints) {
  if (!Array.isArray(activityIds)) throw new Error("季度生活安排必须是活动数组");
  const uniqueIds = [...new Set(activityIds)];
  if (uniqueIds.length !== activityIds.length) throw new Error("同一季度不能重复选择同一活动");
  if (uniqueIds.length < constraints.minActivities) {
    throw new Error(`这一阶段至少选择${constraints.minActivities}项具体活动`);
  }
  if (uniqueIds.length > constraints.maxActivities) {
    throw new Error(`这一阶段最多选择${constraints.maxActivities}项具体活动`);
  }
  const selected = uniqueIds.map((id) => {
    const activity = activities.find((entry) => entry.id === id);
    if (!activity) throw new Error(`季度活动不存在：${id}`);
    if (!activity.available) throw new Error(`季度活动当前不可执行：${activity.unavailableReason}`);
    return activity;
  });
  const hoursPerWeek = selected.reduce((sum, entry) => sum + entry.timeUseHoursPerWeek, 0);
  if (hoursPerWeek > constraints.weeklyDiscretionaryHours) {
    throw new Error(`已安排每周${hoursPerWeek}小时，超过可主动安排的${constraints.weeklyDiscretionaryHours}小时`);
  }
  const cashCostYuan = selected.reduce((sum, entry) => sum + planQuarterCashCost(entry), 0);
  if (
    Number.isFinite(constraints.availableCashYuan)
    && cashCostYuan > constraints.availableCashYuan + 0.001
  ) {
    throw new Error(`季度活动共需${cashCostYuan}元，超过可用于这些活动的${constraints.availableCashYuan}元`);
  }
  return selected;
}

function weightedObjectAverage(selected, key) {
  const paths = new Set(selected.flatMap((entry) => Object.keys(entry[key] ?? {})));
  const totalHours = selected.reduce((sum, entry) => sum + entry.timeUseHoursPerWeek, 0) || 1;
  return Object.fromEntries([...paths].map((path) => [
    path,
    selected.reduce(
      (sum, entry) => sum + (entry[key]?.[path] ?? 0) * entry.timeUseHoursPerWeek / totalHours,
      0,
    ),
  ]));
}

function weightedAssignments(selected) {
  const paths = new Set(selected.flatMap((entry) => Object.keys(entry.stateAssignments ?? {})));
  return Object.fromEntries([...paths].map((path) => {
    const withPath = selected.filter((entry) => Number.isFinite(entry.stateAssignments?.[path]));
    const weight = withPath.reduce((sum, entry) => sum + entry.timeUseHoursPerWeek, 0) || 1;
    return [path, withPath.reduce(
      (sum, entry) => sum + entry.stateAssignments[path] * entry.timeUseHoursPerWeek / weight,
      0,
    )];
  }));
}

export function composeQuarterPlan(selected, constraints) {
  if (selected.length === 0) {
    return {
      id: "infant_observation_only",
      label: "在家庭照护和日常感知中成长",
      description: "这个年龄没有被强行赋予不现实的家庭管理权。",
      activityIds: [],
      activities: [],
      timeUseHoursPerWeek: 0,
      cashCostYuan: 0,
      statChanges: {},
      allocations: [],
      timeSlotsUsed: 0,
      energySpent: 0,
      reservedTimeSlots: constraints.quarterBudget?.availableTimeSlots ?? 0,
      overdraftEnergy: 0,
      stateAssignments: {},
      stateDeltas: {},
      interestTags: [],
      effectSummary: "家庭与环境自动形成经历",
    };
  }
  const primary = [...selected].sort(
    (left, right) => right.timeUseHoursPerWeek - left.timeUseHoursPerWeek,
  )[0];
  const totalHours = selected.reduce((sum, entry) => sum + entry.timeUseHoursPerWeek, 0);
  return {
    id: primary.id,
    label: selected.map((entry) => entry.label).join("；"),
    description: "由同一季度中可以同时发生的具体生活活动组成。",
    activityIds: selected.map((entry) => entry.id),
    activities: selected.map((entry) => ({
      id: entry.id,
      label: entry.label,
      description: entry.description,
      category: entry.category,
      categoryLabel: entry.categoryLabel,
      hoursPerWeek: entry.timeUseHoursPerWeek,
      plannedHours: entry.timeUseHoursPerWeek * 13,
      cashCostYuan: planQuarterCashCost(entry),
      interestTags: clone(entry.interestTags ?? []),
      statChanges: clone(entry.statChanges ?? {}),
      effectSummary: entry.effectSummary ?? null,
      growthChanges: clone(entry.growthChanges ?? {}),
      defaultIntensity: entry.defaultIntensity,
      intensities: clone(entry.intensities ?? []),
      requiresGrowth: clone(entry.requiresGrowth ?? {}),
      experience: clone(entry.experience ?? null),
      resourceEffect: entry.resourceEffect ?? null,
      sourcePoolId: entry.sourcePoolId ?? null,
    })),
    timeUseHoursPerWeek: totalHours,
    unallocatedHoursPerWeek: Math.max(0, constraints.weeklyDiscretionaryHours - totalHours),
    cashCostYuan: selected.reduce((sum, entry) => sum + (entry.cashCostYuan ?? 0), 0),
    statChanges: weightedObjectAverage(selected, "statChanges"),
    stateAssignments: weightedAssignments(selected),
    stateDeltas: weightedObjectAverage(selected, "stateDeltas"),
    interestTags: [...new Set(selected.flatMap((entry) => entry.interestTags ?? []))],
    effectSummary: selected.map((entry) => entry.effectSummary).filter(Boolean).join("；"),
    selectedCategories: [...new Set(selected.map((entry) => entry.category))],
    autoWeight: selected.reduce((sum, entry) => sum + (entry.autoWeight ?? 1), 0),
    allocations: clone(constraints.resourcePlan?.allocations ?? selected.map((entry) => (
      defaultAllocationFor(entry)
    ))),
    ...(constraints.resourcePlan ? resourceSummary(constraints.resourcePlan) : {}),
    quarterBudget: clone(constraints.quarterBudget ?? null),
  };
}

export function automaticallyChoosePlan(activities, constraints, random) {
  const available = activities.filter((entry) => entry.available);
  const target = constraints.minActivities;
  const selected = [];
  const remaining = [...available];
  while (selected.length < target && remaining.length > 0) {
    const feasible = remaining.filter((candidate) => {
      const hours = selected.reduce((sum, entry) => sum + entry.timeUseHoursPerWeek, 0)
        + candidate.timeUseHoursPerWeek;
      const cash = selected.reduce((sum, entry) => sum + planQuarterCashCost(entry), 0)
        + planQuarterCashCost(candidate);
      return hours <= constraints.weeklyDiscretionaryHours
        && (!Number.isFinite(constraints.availableCashYuan) || cash <= constraints.availableCashYuan);
    });
    if (feasible.length === 0) break;
    const total = feasible.reduce((sum, entry) => sum + Math.max(0.01, entry.autoWeight ?? 1), 0);
    let point = random() * total;
    let picked = feasible.at(-1);
    for (const entry of feasible) {
      point -= Math.max(0.01, entry.autoWeight ?? 1);
      if (point <= 0) {
        picked = entry;
        break;
      }
    }
    selected.push(picked);
    remaining.splice(remaining.findIndex((entry) => entry.id === picked.id), 1);
  }
  if (selected.length < constraints.minActivities) {
    throw new Error("自动模式无法在季度时间与现金限制内形成足够的生活活动");
  }
  return selected;
}

export function infantExperience(content, age, calendarYear, quarter, seedText) {
  const entries = content.infantExperiences?.[String(age)] ?? [];
  if (entries.length === 0) return null;
  let hash = 2166136261;
  for (const character of `${seedText}:${calendarYear}:Q${quarter}`) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return entries[Math.abs(hash) % entries.length];
}

export function applyQuarterInterestGrowth({ state, record, quarterRecord, content, addFact }) {
  state.interests ??= {};
  if (quarterRecord.interestChangesApplied) return clone(quarterRecord.interestChanges ?? {});
  const changes = {};
  for (const activity of quarterRecord.activities ?? []) {
    const tags = activity.interestTags ?? [];
    for (const tag of tags) {
      const current = state.interests[tag] ?? {
        id: tag,
        label: content.interestDomains?.[tag] ?? tag,
        score: 0,
        totalHours: 0,
        firstExposureYear: record.calendarYear,
        lastActiveYear: null,
        stageId: "none",
      };
      const beforeStage = interestStage(current.score);
      const executionRate = activity.executionRate ?? 1;
      const allocatedHours = (activity.executedHours ?? activity.plannedHours) / Math.max(1, tags.length);
      const gain = Math.max(0, Math.round(
        activity.hoursPerWeek * 1.5 * executionRate / Math.max(1, tags.length),
      ));
      if (gain <= 0) continue;
      current.score = Math.min(100, current.score + gain);
      current.totalHours += allocatedHours;
      current.lastActiveYear = record.calendarYear;
      current.lastActivityLabel = activity.label;
      const afterStage = interestStage(current.score);
      current.stageId = afterStage.id;
      state.interests[tag] = current;
      changes[tag] = (changes[tag] ?? 0) + gain;
      if (beforeStage.id !== afterStage.id && afterStage.id !== "exposure") {
        addFact(record, "interest_stage_changed", {
          interestId: tag,
          interestLabel: current.label,
          fromStage: beforeStage.id,
          toStage: afterStage.id,
          stageLabel: afterStage.label,
          score: current.score,
          accumulatedHours: Math.round(current.totalHours),
          sourceActivityId: activity.id,
          quarter: quarterRecord.quarter,
        });
      }
    }
  }
  quarterRecord.interestChanges = changes;
  quarterRecord.interestChangesApplied = true;
  return clone(changes);
}

export function applyYearlyInterestGrowth({ state, record, quarterRecords, content, addFact }) {
  state.interests ??= {};
  for (const quarter of quarterRecords) {
    applyQuarterInterestGrowth({ state, record, quarterRecord: quarter, content, addFact });
  }
  const activeTags = new Set(
    quarterRecords.flatMap((quarter) => (quarter.activities ?? []).flatMap((activity) => activity.interestTags ?? [])),
  );
  for (const interest of Object.values(state.interests)) {
    if (activeTags.has(interest.id) || interest.lastActiveYear === record.calendarYear) continue;
    const beforeStage = interestStage(interest.score);
    interest.score = Math.max(0, interest.score - (interest.score >= 18 ? 3 : 1));
    const afterStage = interestStage(interest.score);
    interest.stageId = afterStage.id;
    if (beforeStage.id !== afterStage.id) {
      addFact(record, "interest_stage_changed", {
        interestId: interest.id,
        interestLabel: interest.label,
        fromStage: beforeStage.id,
        toStage: afterStage.id,
        stageLabel: afterStage.label,
        score: interest.score,
        accumulatedHours: Math.round(interest.totalHours),
        reason: "这一年没有继续投入，兴趣逐渐淡化",
      });
    }
  }
}

export function applyDirectInterestChanges(state, changes, content, calendarYear) {
  state.interests ??= {};
  const transitions = [];
  for (const [tag, delta] of Object.entries(changes ?? {})) {
    const current = state.interests[tag] ?? {
      id: tag,
      label: content.interestDomains?.[tag] ?? tag,
      score: 0,
      totalHours: 0,
      firstExposureYear: calendarYear,
      lastActiveYear: null,
      stageId: "none",
    };
    const before = interestStage(current.score);
    current.score = Math.max(0, Math.min(100, current.score + delta));
    current.lastActiveYear = calendarYear;
    const after = interestStage(current.score);
    current.stageId = after.id;
    state.interests[tag] = current;
    if (before.id !== after.id) transitions.push({ interest: current, before, after });
  }
  return transitions;
}
