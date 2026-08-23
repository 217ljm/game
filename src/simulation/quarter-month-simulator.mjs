import { clamp } from "./random.mjs";

const MONTH_SHARES = {
  regular: [1 / 3, 1 / 3, 1 / 3],
  focus: [0.28, 0.44, 0.28],
};

function rounded(value) {
  return Math.round(value * 100) / 100;
}

function stableIndex(seedText, size) {
  let hash = 2166136261;
  for (const character of String(seedText)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % size;
}

function allocationShares(allocation, seedText) {
  if (allocation.intensity !== "trial") {
    return MONTH_SHARES[allocation.intensity] ?? MONTH_SHARES.regular;
  }
  const result = [0, 0, 0];
  result[stableIndex(`${seedText}:${allocation.actionId}`, 3)] = 1;
  return result;
}

function interruptionAffects(interruption, activity) {
  const affected = interruption?.affectedCategories;
  if (!Array.isArray(affected) || affected.length === 0 || affected.includes("*")) return true;
  return affected.includes(activity?.category);
}

function monthExecutionRates(shares, interruption, activity) {
  if (!interruption || !interruptionAffects(interruption, activity)) return [1, 1, 1];
  const eventIndex = clamp((interruption.monthInQuarter ?? 2) - 1, 0, 2);
  const requested = clamp(interruption.executionRate ?? 0.85, 0.35, 1);
  const completedBefore = shares
    .slice(0, eventIndex)
    .reduce((sum, share) => sum + share, 0);
  const remainingShare = Math.max(0.0001, 1 - completedBefore);
  const achievableTarget = Math.max(completedBefore, requested);
  const laterRate = clamp((achievableTarget - completedBefore) / remainingShare, 0, 1);
  return shares.map((_, index) => (index < eventIndex ? 1 : laterRate));
}

function monthNarrative(tick) {
  if (tick.interruption) return `${tick.interruption.reason}，原计划在这个月被打断并按实际情况调整。`;
  if (tick.overdraftEnergy > 0) return `你维持了安排，但这个月透支了${tick.overdraftEnergy}点精力。`;
  if (tick.recoveryEnergy > 0.2) return "你在行动之外留出了恢复时间，疲劳没有继续堆积。";
  if (tick.actions.length === 0) return "这个月以固定生活和普通休息为主，没有额外安排。";
  return `本月继续推进${tick.actions.map((entry) => `“${entry.label}”`).join("、")}。`;
}

/**
 * 将一个季度计划确定性地拆成三个月执行记录。随机只用于“尝试一次”落在哪个月，
 * 相同种子、年份、季度和计划始终得到相同结果。
 */
export function simulateQuarterMonths({
  state,
  plan,
  budget,
  calendarYear,
  quarter,
  interruption = null,
}) {
  const activities = new Map((plan.activities ?? []).map((entry) => [entry.id, entry]));
  const seedText = `${state.seed}:quarter-months:${calendarYear}:Q${quarter}`;
  const activityExecutions = {};
  const monthlyActions = [[], [], []];

  for (const allocation of plan.allocations ?? []) {
    const activity = activities.get(allocation.actionId) ?? { id: allocation.actionId, label: allocation.actionId };
    const shares = allocationShares(allocation, seedText);
    const rates = monthExecutionRates(shares, interruption, activity);
    let executedShare = 0;
    for (let index = 0; index < 3; index += 1) {
      if (shares[index] <= 0) continue;
      const monthShare = shares[index] * rates[index];
      executedShare += monthShare;
      monthlyActions[index].push({
        actionId: allocation.actionId,
        label: activity.label,
        category: activity.category ?? null,
        intensity: allocation.intensity,
        plannedShare: rounded(shares[index]),
        executedShare: rounded(monthShare),
        timeSlots: rounded((allocation.timeSlots ?? 0) * monthShare),
        energyCost: rounded((allocation.energyCost ?? 0) * monthShare),
        recoveryEnergy: rounded((allocation.recoveryEnergy ?? 0) * monthShare),
        status: monthShare + 0.001 >= shares[index] ? "completed" : "partly_completed",
      });
    }
    activityExecutions[allocation.actionId] = {
      actionId: allocation.actionId,
      label: activity.label,
      plannedTimeSlots: allocation.timeSlots ?? 0,
      plannedEnergyCost: allocation.energyCost ?? 0,
      executionRate: rounded(executedShare),
      executedTimeSlots: rounded((allocation.timeSlots ?? 0) * executedShare),
      executedEnergyCost: rounded((allocation.energyCost ?? 0) * executedShare),
    };
  }

  const adjustedEnergy = Math.max(0, budget.availableEnergy + (interruption?.energyDelta ?? 0));
  const energyPerMonth = adjustedEnergy / 3;
  const reservedPerMonth = (plan.reservedTimeSlots ?? budget.availableTimeSlots) / 3;
  const ticks = monthlyActions.map((actions, index) => {
    const energySpent = rounded(actions.reduce((sum, entry) => sum + entry.energyCost, 0));
    const recoveryEnergy = rounded(
      actions.reduce((sum, entry) => sum + entry.recoveryEnergy, 0),
    );
    const availableEnergy = rounded(energyPerMonth + recoveryEnergy);
    const overdraftEnergy = rounded(Math.max(0, energySpent - availableEnergy));
    const eventHere = interruption && (interruption.monthInQuarter ?? 2) === index + 1
      ? {
          severity: interruption.severity ?? "minor",
          reason: interruption.reason ?? "临时情况改变了原计划",
        }
      : null;
    const tick = {
      monthInQuarter: index + 1,
      calendarMonth: (quarter - 1) * 3 + index + 1,
      obligationSlots: rounded((budget.obligationSlots ?? 0) / 3),
      discretionarySlots: rounded((budget.availableTimeSlots ?? 0) / 3),
      reservedTimeSlots: rounded(reservedPerMonth),
      energyAvailable: availableEnergy,
      energySpent,
      energyRemaining: rounded(Math.max(0, availableEnergy - energySpent)),
      overdraftEnergy,
      recoveryEnergy,
      actions,
      interruption: eventHere,
      status: eventHere
        ? "interrupted"
        : (overdraftEnergy > 0 ? "overdrawn" : (actions.length > 0 ? "active" : "resting")),
    };
    tick.narrative = monthNarrative(tick);
    return tick;
  });

  const executedEnergySpent = rounded(ticks.reduce((sum, tick) => sum + tick.energySpent, 0));
  const recoveryEnergy = rounded(ticks.reduce((sum, tick) => sum + tick.recoveryEnergy, 0));
  const usableEnergy = rounded(adjustedEnergy + recoveryEnergy);
  const overdraftEnergy = rounded(Math.max(0, executedEnergySpent - usableEnergy));
  const executedTimeSlots = rounded(Object.values(activityExecutions)
    .reduce((sum, entry) => sum + entry.executedTimeSlots, 0));
  const plannedTimeSlots = plan.timeSlotsUsed ?? 0;
  const executionRate = plannedTimeSlots > 0
    ? rounded(clamp(executedTimeSlots / plannedTimeSlots, 0, 1))
    : 1;
  const reservedTimeSlots = plan.reservedTimeSlots ?? budget.availableTimeSlots;
  const fatigueDelta = overdraftEnergy > 0
    ? overdraftEnergy * 12 + (interruption?.fatigueDelta ?? 0) - recoveryEnergy * 3
    : -(4 + reservedTimeSlots * 2 + recoveryEnergy * 4) + (interruption?.fatigueDelta ?? 0);
  const stressDelta = overdraftEnergy > 0
    ? overdraftEnergy * 7 + (interruption?.stressDelta ?? 0) - recoveryEnergy * 2
    : -(reservedTimeSlots * 2 + recoveryEnergy * 3) + (interruption?.stressDelta ?? 0);

  return {
    protocol: "quarter-months-v1",
    calendarYear,
    quarter,
    obligations: structuredClone(budget.obligations ?? []),
    plannedTimeSlots,
    executedTimeSlots,
    plannedEnergySpent: plan.energySpent ?? 0,
    executedEnergySpent,
    availableEnergy: adjustedEnergy,
    recoveryEnergy,
    energyRemaining: rounded(Math.max(0, usableEnergy - executedEnergySpent)),
    overdraftEnergy,
    executionRate,
    activityExecutions,
    interruption: interruption ? structuredClone(interruption) : null,
    settlement: {
      fatigueDelta: rounded(fatigueDelta),
      stressDelta: rounded(stressDelta),
      moodDelta: rounded((interruption?.moodDelta ?? 0) + (recoveryEnergy > 0 ? 1 : 0) - (overdraftEnergy > 0 ? 1 : 0)),
    },
    monthTicks: ticks,
  };
}

export function applyQuarterMonthSettlement(state, simulation) {
  const modelState = state.characterModel?.state;
  if (!modelState) return;
  modelState.quarterEnergy = simulation.energyRemaining;
  modelState.fatigue = clamp(modelState.fatigue + simulation.settlement.fatigueDelta, 0, 100);
  modelState.stress = clamp(modelState.stress + simulation.settlement.stressDelta, 0, 100);
  modelState.mood = clamp(modelState.mood + simulation.settlement.moodDelta, 0, 100);
}

export function applyExecutionToActivities(activities, simulation) {
  return (activities ?? []).map((activity) => {
    const execution = simulation.activityExecutions[activity.id];
    const executionRate = execution?.executionRate ?? 1;
    return {
      ...structuredClone(activity),
      executionRate,
      executedHours: rounded((activity.plannedHours ?? activity.hoursPerWeek * 13) * executionRate),
    };
  });
}
