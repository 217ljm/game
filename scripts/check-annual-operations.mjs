import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  annualOperationKey,
  availableAnnualOperations,
  lifeStageQuarterCadence,
  quarterOperationKey,
} from "../src/simulation/annual-operation-system.mjs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");
const catalog = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "data", "annual_life_operations.json"), "utf8"),
);
const quarterlyLife = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "data", "quarterly_life_content.json"), "utf8"),
);
const stages = new Set(["childhood", "primary", "adolescence", "youth", "adult"]);
const stats = new Set(["health", "wealth", "mood", "ability", "relationships"]);
const ids = new Set();
let optionCount = 0;
let costConstrainedOptionCount = 0;

assert.equal(catalog.schemaVersion, 2);
assert.equal(catalog.rules.quartersPerYear, 4);
assert.equal(catalog.rules.weeksPerQuarter, 13);
assert.deepEqual(catalog.rules.automationModes, ["continue", "keep_year", "notify_only"]);
assert.ok(catalog.bands.length >= 10);
for (const band of catalog.bands) {
  assert.ok(!ids.has(band.id), `年度行动组ID重复：${band.id}`);
  ids.add(band.id);
  assert.ok(band.stages.length > 0 && band.stages.every((stage) => stages.has(stage)));
  assert.ok(Number.isInteger(band.minAge) && Number.isInteger(band.maxAge));
  assert.ok(band.minAge <= band.maxAge);
  assert.ok(band.title && band.prompt);
  assert.ok(Number.isFinite(band.weeklyDiscretionaryHours));
  assert.ok(band.weeklyDiscretionaryHours > 0 && band.weeklyDiscretionaryHours <= 40);
  if (band.extendsBand) assert.equal(typeof band.extendsBand, "string");
  if (band.when?.employmentStatusNotIn) {
    assert.ok(band.when.employmentStatusNotIn.every((value) => typeof value === "string" && value));
  }
  for (const [statePath, value] of Object.entries(band.stateDefaults ?? {})) {
    assert.ok(statePath.includes("."), `年度行动组基线路径无效：${band.id}/${statePath}`);
    assert.ok(Number.isFinite(value), `年度行动组基线不是数值：${band.id}/${statePath}`);
  }
  assert.ok(band.options.length >= 2);
  for (const option of band.options) {
    assert.ok(!ids.has(option.id), `年度行动选项ID重复：${option.id}`);
    ids.add(option.id);
    optionCount += 1;
    assert.ok(option.label && option.description && option.effectSummary);
    assert.ok(Number.isFinite(option.autoWeight) && option.autoWeight > 0);
    assert.ok(Number.isFinite(option.timeUseHoursPerWeek));
    assert.ok(option.timeUseHoursPerWeek >= 0 && option.timeUseHoursPerWeek <= 40);
    assert.ok(option.timeUseHoursPerWeek <= band.weeklyDiscretionaryHours);
    if (option.when?.residenceIn) {
      assert.ok(option.when.residenceIn.every((value) => ["urban", "rural"].includes(value)));
    }
    if (option.when?.occupationIn) {
      assert.ok(option.when.occupationIn.length > 0);
      assert.ok(option.when.occupationIn.every((value) => typeof value === "string" && value));
    }
    if (option.when?.hasChild != null) assert.equal(typeof option.when.hasChild, "boolean");
    if (option.when?.minimumOlderParentCount != null) {
      assert.ok(Number.isInteger(option.when.minimumOlderParentCount));
      assert.ok(option.when.minimumOlderParentCount >= 1);
    }
    if (option.when?.calendarYearMin != null) {
      assert.ok(Number.isInteger(option.when.calendarYearMin));
    }
    if (option.when?.calendarYearMax != null) {
      assert.ok(Number.isInteger(option.when.calendarYearMax));
    }
    if (option.when?.healthValueMin != null) {
      assert.ok(option.when.healthValueMin >= 0 && option.when.healthValueMin <= 100);
    }
    if (option.when?.healthValueMax != null) {
      assert.ok(option.when.healthValueMax >= 0 && option.when.healthValueMax <= 100);
    }
    if (option.cashCostReferenceShare != null) {
      costConstrainedOptionCount += 1;
      assert.ok(option.cashCostReferenceShare > 0 && option.cashCostReferenceShare <= 0.1);
      assert.ok(option.cashCostPurpose);
    }
    for (const [stat, delta] of Object.entries(option.statChanges ?? {})) {
      assert.ok(stats.has(stat), `未知属性：${stat}`);
      assert.ok(Number.isFinite(delta));
    }
    for (const delta of Object.values(option.stateDeltas ?? {})) {
      assert.ok(Number.isFinite(delta));
    }
  }
}
for (const band of catalog.bands.filter((entry) => entry.extendsBand)) {
  assert.ok(catalog.bands.some((entry) => entry.id === band.extendsBand), `年度行动继承未知分组：${band.id}`);
}

for (const rule of catalog.longTermEchoRules) {
  assert.ok(rule.id && rule.title && rule.description && rule.domain);
  assert.ok(rule.thresholds.length > 0);
  assert.ok(rule.thresholds.every((threshold, index, all) => (
    Number.isInteger(threshold)
    && threshold > 1
    && (index === 0 || threshold > all[index - 1])
  )));
  assert.ok(rule.operationIds.length > 0);
  assert.ok(rule.operationIds.every((id) => ids.has(id)), `长期回响引用未知行动：${rule.id}`);
}

const coverageContexts = [];
for (let age = 0; age <= 6; age += 1) coverageContexts.push({ stage: "childhood", age });
for (let age = 7; age <= 15; age += 1) {
  coverageContexts.push({ stage: "primary", age, educationStatus: "enrolled_primary" });
  coverageContexts.push({ stage: "primary", age, educationStatus: "not_enrolled" });
}
for (let age = 7; age <= 19; age += 1) {
  coverageContexts.push({ stage: "adolescence", age, path: "junior_student" });
  coverageContexts.push({ stage: "adolescence", age, path: "nonstudent" });
}
for (let age = 14; age <= 25; age += 1) {
  coverageContexts.push({ stage: "youth", age, path: "academic_senior" });
  coverageContexts.push({ stage: "youth", age, path: "job_search" });
}
for (const age of [16, 18, 22, 35, 45, 60, 80, 100]) {
  coverageContexts.push({
    stage: "adult",
    age,
    educationStatus: age <= 35 ? "enrolled" : null,
    employmentStatus: "employed",
    relationshipStatus: "single",
  });
  coverageContexts.push({
    stage: "adult",
    age,
    educationStatus: null,
    employmentStatus: age >= 45 ? "retired" : "unemployed_searching",
    relationshipStatus: "partnered",
  });
}

for (const context of coverageContexts) {
  context.residence ??= "urban";
  context.calendarYear ??= 2000;
  context.healthValue ??= 60;
  const result = availableAnnualOperations(catalog, context);
  assert.ok(result.band, `缺少年度行动组：${JSON.stringify(context)}`);
  assert.ok(result.options.length >= 2, `年度行动不足：${JSON.stringify(context)}`);
}

const phaseContext = (age, employmentStatus = "employed") => ({
  stage: "adult",
  age,
  residence: "urban",
  calendarYear: 1978 + age,
  healthValue: 72,
  educationStatus: null,
  employmentStatus,
  relationshipStatus: "single",
  affordableCashYuan: 100000,
  cashReferenceYuan: 10000,
});
const phase22 = availableAnnualOperations(catalog, phaseContext(22));
const phase30 = availableAnnualOperations(catalog, phaseContext(30));
const phase48 = availableAnnualOperations(catalog, phaseContext(48));
const phase65 = availableAnnualOperations(catalog, phaseContext(65));
assert.equal(phase22.band.id, "adult_emerging_life_18_24");
assert.equal(phase30.band.id, "adult_building_life_25_39");
assert.equal(phase48.band.id, "adult_responsibility_life_40_59");
assert.equal(phase65.band.id, "adult_later_working_life_60_plus");
for (const phase of [phase22, phase30, phase48, phase65]) {
  assert.equal(phase.band.inheritedFromBandId, "adult_general_year");
  assert.ok(phase.options.some((option) => option.id === "adult_invest_in_work"));
  assert.ok(phase.options.length >= 12);
}
assert.ok(phase22.options.some((option) => option.id === "young_adult_run_own_daily_life"));
assert.ok(phase30.options.some((option) => option.id === "adult_build_home_routine"));
assert.ok(phase48.options.some((option) => option.id === "midlife_restore_personal_interest"));
assert.ok(phase65.options.some((option) => option.id === "later_worker_prepare_retirement_routine"));
const retired65 = availableAnnualOperations(catalog, phaseContext(65, "retired"));
assert.equal(retired65.band.id, "adult_retired_year");
assert.ok(retired65.options.some((option) => option.id === "retired_sort_family_memories"));

assert.equal(annualOperationKey(1978), "annual:1978");
assert.notEqual(annualOperationKey(1978), annualOperationKey(1979));
assert.equal(quarterOperationKey(1978, 1), "quarter:1978:Q1");
assert.equal(quarterOperationKey(1978, 4), "quarter:1978:Q4");
assert.throws(() => quarterOperationKey(1978, 5), /季度必须/);
assert.deepEqual(lifeStageQuarterCadence(0).interactiveQuarters, []);
assert.deepEqual(lifeStageQuarterCadence(1).interactiveQuarters, [3]);
assert.deepEqual(lifeStageQuarterCadence(2).interactiveQuarters, [1, 3]);
assert.deepEqual(lifeStageQuarterCadence(3).interactiveQuarters, [1, 3]);
assert.deepEqual(lifeStageQuarterCadence(11).interactiveQuarters, [1, 3]);
assert.deepEqual(lifeStageQuarterCadence(12).interactiveQuarters, [1, 2, 3, 4]);
assert.deepEqual(lifeStageQuarterCadence(59).interactiveQuarters, [1, 2, 3, 4]);
assert.deepEqual(lifeStageQuarterCadence(60).interactiveQuarters, [1, 3]);
assert.equal(quarterlyLife.schemaVersion, 1);
assert.ok(Object.keys(quarterlyLife.categories).length >= 7);
assert.ok(Object.keys(quarterlyLife.interestDomains).length >= 8);
assert.ok(quarterlyLife.infantExperiences["0"].length >= 3);
assert.ok(quarterlyLife.infantReactions["1"].length >= 2);
assert.ok(quarterlyLife.infantReactions["2"].length >= 3);
assert.ok(quarterlyLife.eraLeisure.length >= 4);
assert.ok(quarterlyLife.randomEvents.length >= 12);
for (const event of quarterlyLife.randomEvents) {
  assert.ok(event.id && event.title && event.scene);
  assert.ok(event.stages.length >= 1);
  assert.ok(event.minAge >= 3 && event.maxAge >= event.minAge);
  assert.ok(event.options.length >= 2);
  assert.ok(event.options.every((option) => option.id && option.label && option.description));
}
assert.ok(costConstrainedOptionCount >= 8);
const constrainedAdult = availableAnnualOperations(catalog, {
  stage: "adult",
  age: 40,
  employmentStatus: "employed",
  relationshipStatus: "single",
  cashReferenceYuan: 10000,
  affordableCashYuan: 0,
});
assert.ok(constrainedAdult.options.filter((option) => option.available).length >= 2);
assert.ok(constrainedAdult.options.some((option) => !option.available));
assert.ok(constrainedAdult.options.some((option) => option.unavailableReason?.includes("现金")));
const idsFor = (context) => new Set(
  availableAnnualOperations(catalog, {
    cashReferenceYuan: 10000,
    affordableCashYuan: 10000,
    ...context,
  }).options.map((option) => option.id),
);
const ruralChildIds = idsFor({ stage: "childhood", age: 4, residence: "rural", calendarYear: 1982, healthValue: 55 });
const urbanChildIds = idsFor({ stage: "childhood", age: 4, residence: "urban", calendarYear: 1982, healthValue: 55 });
assert.ok(ruralChildIds.has("child_observe_household_work"));
assert.ok(!ruralChildIds.has("child_observe_neighborhood_work"));
assert.ok(urbanChildIds.has("child_observe_neighborhood_work"));
assert.ok(!urbanChildIds.has("child_observe_household_work"));
const adult2007 = idsFor({ stage: "adult", age: 40, residence: "urban", calendarYear: 2007, healthValue: 70, employmentStatus: "employed", relationshipStatus: "single" });
const adult2020LowHealth = idsFor({ stage: "adult", age: 40, residence: "rural", calendarYear: 2020, healthValue: 40, employmentStatus: "employed", relationshipStatus: "single" });
assert.ok(adult2007.has("adult_compare_urban_commute_jobs"));
assert.ok(!adult2007.has("adult_review_contract_and_benefits"));
assert.ok(!adult2007.has("adult_reduce_load_for_health"));
assert.ok(adult2020LowHealth.has("adult_improve_local_family_work"));
assert.ok(adult2020LowHealth.has("adult_review_contract_and_benefits"));
assert.ok(adult2020LowHealth.has("adult_reduce_load_for_health"));
const adultWithFamilyAndPhysicalJob = idsFor({
  stage: "adult",
  age: 48,
  residence: "rural",
  calendarYear: 2028,
  healthValue: 55,
  employmentStatus: "employed",
  relationshipStatus: "partnered",
  occupation: "construction_worker",
  industry: "construction",
  hasChild: true,
  olderParentCount: 1,
});
const adultWithoutFamilyOrJob = idsFor({
  stage: "adult",
  age: 48,
  residence: "rural",
  calendarYear: 2028,
  healthValue: 55,
  employmentStatus: "unemployed_searching",
  relationshipStatus: "single",
  occupation: null,
  industry: null,
  hasChild: false,
  olderParentCount: 0,
});
for (const id of [
  "adult_time_with_child",
  "adult_care_older_parents",
  "adult_protect_body_in_physical_work",
]) assert.ok(adultWithFamilyAndPhysicalJob.has(id));
for (const id of [
  "adult_time_with_child",
  "adult_care_older_parents",
  "adult_protect_body_in_physical_work",
]) assert.ok(!adultWithoutFamilyOrJob.has(id));
const youth1994 = idsFor({ stage: "youth", age: 16, path: "job_search", residence: "rural", calendarYear: 1994, healthValue: 50 });
const youth1995 = idsFor({ stage: "youth", age: 17, path: "job_search", residence: "rural", calendarYear: 1995, healthValue: 50 });
assert.ok(!youth1994.has("youth_compare_work_terms"));
assert.ok(youth1995.has("youth_compare_work_terms"));
const teenStudentLife = idsFor({ stage: "adolescence", age: 14, path: "junior_student", residence: "urban", calendarYear: 1992, healthValue: 70 });
const teenNonstudentLife = idsFor({ stage: "adolescence", age: 14, path: "nonstudent", residence: "rural", calendarYear: 1992, healthValue: 70 });
const youthSchoolLife = idsFor({ stage: "youth", age: 17, path: "academic_senior", residence: "urban", calendarYear: 1995, healthValue: 70 });
const higherLife = idsFor({ stage: "adult", age: 20, educationStatus: "enrolled", employmentStatus: "student", residence: "urban", calendarYear: 1998, healthValue: 70, relationshipStatus: "single" });
for (const pool of [teenStudentLife, teenNonstudentLife, youthSchoolLife, higherLife]) assert.ok(pool.size >= 8);
assert.ok(teenStudentLife.has("teen_follow_music_story_or_screen"));
assert.ok(teenStudentLife.has("teen_regular_sport_and_outdoor_time"));
assert.ok(teenNonstudentLife.has("nonstudent_keep_peer_leisure"));
assert.ok(teenNonstudentLife.has("nonstudent_make_personal_project"));
assert.ok(youthSchoolLife.has("youth_school_cultural_interest"));
assert.ok(youthSchoolLife.has("youth_school_keep_sport"));
assert.ok(higherLife.has("higher_manage_independent_daily_life"));
assert.ok(higherLife.has("higher_explore_city_and_culture"));
const forbidden = ["教育资源：普通", "家庭负担：中等", "收入稳定性偏低"];
const serialized = JSON.stringify(catalog);
for (const label of forbidden) assert.ok(!serialized.includes(label));

console.log(JSON.stringify({
  ok: true,
  bandCount: catalog.bands.length,
  optionCount,
  costConstrainedOptionCount,
  coverageContextCount: coverageContexts.length,
  checks: [
    "unique_ids",
    "age_and_stage_bounds",
    "option_metadata_and_time_bounds",
    "annual_routine_baseline_shapes",
    "stat_and_state_effect_shapes",
    "long_term_echo_rules",
    "life_stage_context_coverage",
    "adult_age_phase_band_inheritance_and_distinct_life_content",
    "adolescent_youth_and_higher_education_whole_life_variety",
    "calendar_year_and_quarter_operation_keys",
    "life_stage_interaction_cadence",
    "infant_first_person_experiences",
    "interest_domains_and_era_leisure",
    "conditional_random_event_content",
    "quarter_automation_modes",
    "cash_affordability_constraints",
    "region_era_health_job_and_family_context_candidates",
    "no_abstract_social_labels",
  ],
}, null, 2));
