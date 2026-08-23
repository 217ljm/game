import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateBirthProfile } from "../src/simulation/birth-generator.mjs";
import {
  applyQuarterCharacterGrowth,
  CORE_ATTRIBUTE_KEYS,
} from "../src/simulation/character-attribute-system.mjs";
import {
  actionResourceCost,
  buildQuarterBudget,
  defaultAllocationFor,
  deriveQuarterObligations,
  settleQuarterResourceState,
  validateQuarterResourcePlan,
} from "../src/simulation/quarter-resource-system.mjs";
import {
  applyExecutionToActivities,
  applyQuarterMonthSettlement,
  simulateQuarterMonths,
} from "../src/simulation/quarter-month-simulator.mjs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");
const calibration = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "data", "calibration", "birth_1978_1982.json"), "utf8"),
);

const profile = generateBirthProfile(calibration, {
  seed: "character-resource-foundation",
  birthYear: 1978,
});
const repeated = generateBirthProfile(calibration, {
  seed: "character-resource-foundation",
  birthYear: 1978,
});
assert.deepEqual(profile.characterModel, repeated.characterModel);
assert.deepEqual(Object.keys(profile.characterModel.attributes), CORE_ATTRIBUTE_KEYS);
assert.equal("agePercentile" in profile.characterModel, false);
assert.equal("ageNormalized" in profile.characterModel, false);

const state = {
  visibleStats: structuredClone(profile.visibleStats),
  characterModel: structuredClone(profile.characterModel),
};
state.visibleStats.mood.value = 85;
const budget = buildQuarterBudget({ state, weeklyDiscretionaryHours: 24 });
assert.equal(budget.totalTimeSlots, 12);
assert.ok(budget.availableTimeSlots >= 4 && budget.availableTimeSlots <= 8);
assert.ok(budget.availableEnergy >= 10 && budget.availableEnergy <= 16);
assert.equal(
  budget.obligationSlots + budget.availableTimeSlots,
  budget.totalTimeSlots,
);
const employedBudget = buildQuarterBudget({
  state,
  weeklyDiscretionaryHours: 18,
  age: 35,
  stage: "adult",
  context: {
    employmentStatus: "employed",
    occupation: "装配工",
    hasChild: true,
    olderParentCount: 1,
  },
});
assert.equal(
  employedBudget.obligations.reduce((sum, entry) => sum + entry.slots, 0),
  employedBudget.obligationSlots,
);
assert.ok(employedBudget.obligations.some((entry) => entry.id === "employment"));
assert.ok(employedBudget.obligations.some((entry) => entry.id === "childcare"));
assert.deepEqual(
  deriveQuarterObligations({ obligationSlots: 8, age: 1 }),
  [{
    id: "infant_daily_care",
    label: "睡眠、进食、清洁与被照护",
    slots: 8,
    source: "年龄与日常生理需要",
  }],
);

const learning = {
  id: "test_regular_learning",
  category: "learning",
  timeUseHoursPerWeek: 5,
  defaultIntensity: "regular",
  statChanges: { ability: 1 },
};
const social = {
  id: "test_social_activity",
  category: "social",
  timeUseHoursPerWeek: 3,
  defaultIntensity: "trial",
  statChanges: { relationships: 1 },
};
const allocations = [
  defaultAllocationFor(learning, state),
  defaultAllocationFor(social, state),
];
const plan = validateQuarterResourcePlan(allocations, [learning, social], budget, { state });
assert.equal(plan.allocations.length, 2);
assert.ok(plan.timeSlotsUsed <= budget.availableTimeSlots);
assert.ok(plan.overdraftEnergy <= 3);
settleQuarterResourceState(state, plan);
assert.equal(state.characterModel.state.quarterEnergy, plan.energyRemaining);

const normalMonthSimulation = simulateQuarterMonths({
  state,
  plan: { ...plan, activities: [
    { ...learning, label: "定期学习", plannedHours: 65 },
    { ...social, label: "见朋友", plannedHours: 39 },
  ] },
  budget,
  calendarYear: 1985,
  quarter: 1,
});
const repeatedMonthSimulation = simulateQuarterMonths({
  state,
  plan: { ...plan, activities: [
    { ...learning, label: "定期学习", plannedHours: 65 },
    { ...social, label: "见朋友", plannedHours: 39 },
  ] },
  budget,
  calendarYear: 1985,
  quarter: 1,
});
assert.deepEqual(normalMonthSimulation, repeatedMonthSimulation);
assert.equal(normalMonthSimulation.monthTicks.length, 3);
assert.deepEqual(normalMonthSimulation.monthTicks.map((entry) => entry.calendarMonth), [1, 2, 3]);
assert.equal(normalMonthSimulation.executionRate, 1);
assert.ok(normalMonthSimulation.monthTicks.every((entry) => entry.narrative.length > 0));

const interruptedMonthSimulation = simulateQuarterMonths({
  state,
  plan: { ...plan, activities: [
    { ...learning, label: "定期学习", plannedHours: 65 },
    { ...social, label: "见朋友", plannedHours: 39 },
  ] },
  budget,
  calendarYear: 1985,
  quarter: 1,
  interruption: {
    eventId: "test_fever",
    monthInQuarter: 2,
    severity: "major",
    reason: "发热使安排降速",
    affectedCategories: ["*"],
    executionRate: 0.65,
    energyDelta: -2,
    fatigueDelta: 3,
  },
});
assert.ok(interruptedMonthSimulation.executionRate < 1);
assert.equal(interruptedMonthSimulation.monthTicks[1].status, "interrupted");
assert.ok(interruptedMonthSimulation.executedTimeSlots < interruptedMonthSimulation.plannedTimeSlots);
const executedActivities = applyExecutionToActivities([
  { ...learning, label: "定期学习", plannedHours: 65 },
  { ...social, label: "见朋友", plannedHours: 39 },
], interruptedMonthSimulation);
assert.ok(executedActivities.every((entry) => entry.executedHours <= entry.plannedHours));

const rest = {
  id: "quarter_intentional_rest",
  label: "主动休息",
  category: "recovery",
  resourceEffect: "recovery",
  timeUseHoursPerWeek: 3,
  defaultIntensity: "focus",
};
const restAllocation = defaultAllocationFor(rest, state);
assert.equal(restAllocation.energyCost, 0);
assert.equal(restAllocation.recoveryEnergy, 4);
const restPlan = validateQuarterResourcePlan([restAllocation], [rest], budget, { state });
const restSimulation = simulateQuarterMonths({
  state,
  plan: { ...restPlan, activities: [{ ...rest, plannedHours: 39 }] },
  budget,
  calendarYear: 1985,
  quarter: 2,
});
const fatigueBeforeRest = 60;
state.characterModel.state.fatigue = fatigueBeforeRest;
applyQuarterMonthSettlement(state, restSimulation);
assert.ok(restSimulation.recoveryEnergy > 0);
assert.ok(state.characterModel.state.fatigue < fatigueBeforeRest);

const focusCost = actionResourceCost({ ...learning, category: "health" }, "focus", state);
assert.equal(focusCost.timeSlots, 4);
assert.ok(focusCost.energyCost >= 3);
assert.throws(
  () => validateQuarterResourcePlan([
    { actionId: learning.id, intensity: "focus" },
    { actionId: social.id, intensity: "focus" },
    { actionId: "third", intensity: "focus" },
  ], [learning, social, { ...learning, id: "third" }], budget, { state }),
  /时间格|透支/,
);

const before = structuredClone(state.characterModel.attributes);
let lastGrowth;
for (let quarter = 0; quarter < 16; quarter += 1) {
  lastGrowth = applyQuarterCharacterGrowth({
    state,
    age: 6 + Math.floor(quarter / 4),
    quarter: (quarter % 4) + 1,
    activities: [learning, social],
    allocations,
  });
}
assert.ok(state.characterModel.attributes.intelligence > before.intelligence);
assert.ok(state.characterModel.attributes.social > before.social);
assert.ok(lastGrowth.experience.intelligence > 0);
assert.ok(lastGrowth.experience.social > 0);
assert.ok(CORE_ATTRIBUTE_KEYS.every((key) => (
  state.characterModel.attributes[key] >= 0 && state.characterModel.attributes[key] <= 100
)));

console.log(JSON.stringify({
  ok: true,
  checks: [
    "deterministic_birth_character_model",
    "absolute_zero_to_one_hundred_attributes_without_age_normalization",
    "quarter_time_slot_budget",
    "quarter_energy_modifiers",
    "fact_backed_quarter_obligations",
    "action_intensity_costs",
    "deterministic_three_month_execution",
    "event_interruption_reduces_actual_execution",
    "intentional_rest_recovers_energy_and_fatigue",
    "resource_overcommit_rejected",
    "quarter_fatigue_settlement",
    "residual_attribute_growth",
  ],
}, null, 2));
