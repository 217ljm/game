import { clamp } from "./random.mjs";

export const QUARTER_TOTAL_TIME_SLOTS = 12;
export const QUARTER_BASE_ENERGY = 10;
export const QUARTER_MIN_ENERGY = 4;
export const QUARTER_MAX_ENERGY = 16;

export const ACTION_INTENSITIES = {
  trial: { id: "trial", label: "尝试一次", timeSlots: 1, energyMultiplier: 0.65 },
  regular: { id: "regular", label: "定期进行", timeSlots: 2, energyMultiplier: 1 },
  focus: { id: "focus", label: "重点投入", timeSlots: 4, energyMultiplier: 1.65 },
};

const CATEGORY_BASE_ENERGY = {
  recovery: 0,
  exploration: 1.5,
  entertainment: 1.5,
  social: 1.5,
  family: 2,
  learning: 2,
  finance: 2,
  health: 2.5,
  work: 2.5,
};

function rounded(value) {
  return Math.round(value * 100) / 100;
}

function healthValue(state) {
  return Number(state.visibleStats?.health?.value ?? state.characterModel?.attributes?.health ?? 70);
}

function moodValue(state) {
  return Number(state.characterModel?.state?.mood ?? state.visibleStats?.mood?.value ?? 50);
}

function healthModifier(value) {
  if (value >= 85) return 2;
  if (value >= 70) return 1;
  if (value >= 50) return 0;
  if (value >= 30) return -2;
  return -4;
}

function moodModifier(value) {
  if (value >= 80) return 1;
  if (value < 20) return -2;
  if (value < 40) return -1;
  return 0;
}

function deriveAvailableSlots(weeklyDiscretionaryHours) {
  if (!Number.isFinite(weeklyDiscretionaryHours)) return 6;
  return Math.round(clamp(Math.round(weeklyDiscretionaryHours / 5) + 2, 4, 8));
}

export function deriveQuarterObligations({
  obligationSlots,
  age = null,
  stage = null,
  state = {},
  context = {},
}) {
  let remaining = Math.max(0, Math.round(obligationSlots));
  const obligations = [];
  const add = (id, label, desiredSlots, source) => {
    const slots = Math.min(remaining, Math.max(0, Math.round(desiredSlots)));
    if (slots <= 0) return;
    obligations.push({ id, label, slots, source });
    remaining -= slots;
  };
  if (age != null && age <= 2) {
    add("infant_daily_care", "睡眠、进食、清洁与被照护", remaining, "年龄与日常生理需要");
    return obligations;
  }
  if (["enrolled_primary", "enrolled", "enrolled_junior"].includes(context.educationStatus)) {
    add("education", "上课、作业与通学", stage === "primary" ? 4 : 5, "当前在学事实");
  }
  if (context.employmentStatus === "employed" || state.employment?.currentJob) {
    const occupation = state.employment?.currentJob?.label
      ?? context.occupation
      ?? state.employment?.currentJob?.occupation;
    const careCount = Number(Boolean(context.hasChild)) + Math.min(1, context.olderParentCount ?? 0);
    add(
      "employment",
      occupation ? `${occupation}工作、排班与通勤` : "工作、排班与通勤",
      Math.max(2, 4 - careCount),
      "当前岗位、工时与居住事实",
    );
  }
  if (context.hasChild) add("childcare", "照顾孩子与家庭协作", 1, "已有子女事实");
  if ((context.olderParentCount ?? 0) > 0) {
    add("eldercare", "探望或照料年长父母", 1, "父母年龄与在世事实");
  }
  add("household", "睡眠、家务和不可自由支配的日常生活", remaining, "可支配时间反推");
  return obligations;
}

/**
 * 把现有具体工时事实投影为新的季度时间格和精力预算。
 * @param {{ state: any, weeklyDiscretionaryHours: number, burdenEnergyPenalty?: number }} input
 */
export function buildQuarterBudget({
  state,
  weeklyDiscretionaryHours,
  burdenEnergyPenalty = 0,
  age = null,
  stage = null,
  context = {},
}) {
  const availableTimeSlots = deriveAvailableSlots(weeklyDiscretionaryHours);
  const obligationSlots = QUARTER_TOTAL_TIME_SLOTS - availableTimeSlots;
  const obligations = deriveQuarterObligations({
    obligationSlots,
    age,
    stage,
    state,
    context,
  });
  const modifiers = [];
  const health = healthModifier(healthValue(state));
  const mood = moodModifier(moodValue(state));
  if (health !== 0) modifiers.push({ id: "health", amount: health, reason: "当前健康状态" });
  if (mood !== 0) modifiers.push({ id: "mood", amount: mood, reason: "当前心情状态" });

  const fatigue = Number(state.characterModel?.state?.fatigue ?? 0);
  if (fatigue >= 70) modifiers.push({ id: "fatigue_severe", amount: -3, reason: "持续疲劳" });
  else if (fatigue >= 40) modifiers.push({ id: "fatigue", amount: -1, reason: "已有疲劳" });

  const illnessCount = state.characterModel?.state?.illnessIds?.length ?? 0;
  const injuryCount = state.characterModel?.state?.injuryIds?.length ?? 0;
  if (illnessCount > 0) {
    modifiers.push({ id: "illness", amount: -Math.min(3, illnessCount), reason: "疾病影响" });
  }
  if (injuryCount > 0) {
    modifiers.push({ id: "injury", amount: -Math.min(3, injuryCount), reason: "伤势影响" });
  }
  const factualBurdenPenalty = age >= 12 && obligationSlots >= 7 ? 1 : 0;
  const totalBurdenPenalty = burdenEnergyPenalty + factualBurdenPenalty;
  if (totalBurdenPenalty > 0) {
    modifiers.push({
      id: "obligation_burden",
      amount: -Math.min(3, Math.round(totalBurdenPenalty)),
      reason: "工作、通勤或照护负担",
    });
  }

  const availableEnergy = Math.round(clamp(
    QUARTER_BASE_ENERGY + modifiers.reduce((sum, entry) => sum + entry.amount, 0),
    QUARTER_MIN_ENERGY,
    QUARTER_MAX_ENERGY,
  ));
  return {
    totalTimeSlots: QUARTER_TOTAL_TIME_SLOTS,
    obligationSlots,
    obligations,
    availableTimeSlots,
    baseEnergy: QUARTER_BASE_ENERGY,
    energyModifiers: modifiers,
    availableEnergy,
    spentEnergy: 0,
    overdraftEnergy: 0,
  };
}

export function inferDefaultIntensity(activity) {
  const hours = Number(activity.timeUseHoursPerWeek ?? activity.hoursPerWeek ?? 4);
  if (hours <= 3) return "trial";
  return "regular";
}

export function actionResourceCost(activity, intensityId = inferDefaultIntensity(activity), state = null) {
  const intensity = ACTION_INTENSITIES[intensityId] ?? ACTION_INTENSITIES.regular;
  const baseEnergy = CATEGORY_BASE_ENERGY[activity.category] ?? 2;
  let energyCost = baseEnergy * intensity.energyMultiplier;
  if (["health", "work"].includes(activity.category) && state) {
    const fitness = Number(state.characterModel?.attributes?.fitness ?? 40);
    if (fitness < 20) energyCost += 1;
    else if (fitness >= 70) energyCost -= 0.5;
  }
  const recoveryEnergy = activity.resourceEffect === "recovery"
    ? intensity.timeSlots
    : 0;
  return {
    intensity: intensity.id,
    label: intensity.label,
    timeSlots: intensity.timeSlots,
    energyCost: activity.resourceEffect === "recovery" ? 0 : Math.max(1, Math.round(energyCost)),
    recoveryEnergy,
  };
}

export function buildActionIntensities(activity, state = null) {
  return Object.values(ACTION_INTENSITIES).map((intensity) => ({
    ...intensity,
    ...actionResourceCost(activity, intensity.id, state),
  }));
}

export function defaultAllocationFor(activity, state = null) {
  const cost = actionResourceCost(activity, activity.defaultIntensity, state);
  return {
    actionId: activity.id,
    intensity: cost.intensity,
    timeSlots: cost.timeSlots,
    energyCost: cost.energyCost,
    recoveryEnergy: cost.recoveryEnergy,
  };
}

export function validateQuarterResourcePlan(allocations, activities, budget, options = {}) {
  if (!Array.isArray(allocations)) throw new Error("季度资源安排必须是数组");
  const normalized = allocations.map((allocation) => {
    const activity = activities.find((entry) => entry.id === allocation.actionId);
    if (!activity) throw new Error(`季度资源行动不存在：${allocation.actionId}`);
    const cost = actionResourceCost(activity, allocation.intensity, options.state);
    return { ...cost, actionId: activity.id };
  });
  const unique = new Set(normalized.map((entry) => entry.actionId));
  if (unique.size !== normalized.length) throw new Error("同一季度不能重复安排同一行动");
  const timeSlotsUsed = normalized.reduce((sum, entry) => sum + entry.timeSlots, 0);
  const energySpent = normalized.reduce((sum, entry) => sum + entry.energyCost, 0);
  const overdraftEnergy = Math.max(0, energySpent - budget.availableEnergy);
  if (timeSlotsUsed > budget.availableTimeSlots) {
    throw new Error(`已使用${timeSlotsUsed}个时间格，超过可用的${budget.availableTimeSlots}格`);
  }
  if (overdraftEnergy > 3) {
    throw new Error(`精力需要透支${overdraftEnergy}点，超过最多3点的安全上限`);
  }
  return {
    allocations: normalized,
    timeSlotsUsed,
    reservedTimeSlots: Math.max(0, budget.availableTimeSlots - timeSlotsUsed),
    energySpent,
    overdraftEnergy,
    energyRemaining: Math.max(0, budget.availableEnergy - energySpent),
  };
}

export function settleQuarterResourceState(state, resourcePlan) {
  const modelState = state.characterModel?.state;
  if (!modelState) return;
  modelState.quarterEnergy = resourcePlan.energyRemaining;
  if (resourcePlan.overdraftEnergy > 0) {
    modelState.fatigue = Math.min(100, modelState.fatigue + resourcePlan.overdraftEnergy * 12);
    modelState.stress = Math.min(100, modelState.stress + resourcePlan.overdraftEnergy * 7);
  } else {
    const recovery = 4 + resourcePlan.reservedTimeSlots * 2;
    modelState.fatigue = Math.max(0, modelState.fatigue - recovery);
    if (resourcePlan.reservedTimeSlots > 0) {
      modelState.stress = Math.max(0, modelState.stress - resourcePlan.reservedTimeSlots * 2);
    }
  }
}

export function resourceSummary(resourcePlan) {
  return {
    timeSlotsUsed: resourcePlan.timeSlotsUsed,
    reservedTimeSlots: resourcePlan.reservedTimeSlots,
    energySpent: rounded(resourcePlan.energySpent),
    energyRemaining: rounded(resourcePlan.energyRemaining),
    overdraftEnergy: rounded(resourcePlan.overdraftEnergy),
  };
}
