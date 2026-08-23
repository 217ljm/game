import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateBirthProfile } from "../src/simulation/birth-generator.mjs";
import { simulateChildhood } from "../src/simulation/childhood-simulator.mjs";
import { simulatePrimaryEducation } from "../src/simulation/primary-education-simulator.mjs";
import {
  getJuniorDropoutRate,
  getJuniorToSeniorProgressionRate,
  simulateAdolescence,
} from "../src/simulation/adolescence-simulator.mjs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");
const readJson = (...segments) =>
  JSON.parse(fs.readFileSync(path.join(projectRoot, ...segments), "utf8"));
const birthCalibration = readJson("data", "calibration", "birth_1978_1982.json");
const childhoodCalibration = readJson("data", "calibration", "childhood_1978_1988.json");
const childhoodEvents = readJson("data", "childhood_events.json");
const primaryCalibration = readJson("data", "calibration", "primary_education_1984_1996.json");
const primaryEvents = readJson("data", "primary_education_events.json");
const calibration = readJson(
  "data",
  "calibration",
  "adolescence_education_1986_2000.json",
);
const events = readJson("data", "adolescence_events.json");
const sampleCount = Number(process.env.ADOLESCENCE_CHECK_COUNT ?? 30000);
const forbiddenLabels = [
  "教育资源：普通",
  "家庭负担：中等",
  "收入稳定性",
  "成绩优秀",
  "偏低",
  "偏高",
];

function assertNear(actual, expected, tolerance, message) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message}: actual=${actual}, expected=${expected}, tolerance=${tolerance}`,
  );
}

function makeLife(seed, birthYear = 1979) {
  const profile = generateBirthProfile(birthCalibration, { seed: `${seed}:birth`, birthYear });
  const childhood = simulateChildhood(profile, childhoodCalibration, childhoodEvents, {
    seed: `${seed}:childhood`,
    mortality: false,
  });
  const primary = simulatePrimaryEducation(
    profile,
    childhood,
    primaryCalibration,
    primaryEvents,
    { seed: `${seed}:primary` },
  );
  return { profile, childhood, primary };
}

function findLife(prefix, predicate) {
  for (let index = 0; index < 400; index += 1) {
    const life = makeLife(`${prefix}-${index}`, 1978 + (index % 5));
    if (predicate(life.primary)) return life;
  }
  throw new Error(`未找到测试人生：${prefix}`);
}

function assertIntegrity(adolescence) {
  const serialized = JSON.stringify(adolescence);
  for (const label of forbiddenLabels) {
    assert.equal(serialized.includes(label), false, `青少年档案不得出现人工等级标签：${label}`);
  }
  assert.equal(
    adolescence.status === "completed_stage" || adolescence.status === "awaiting_choice",
    true,
  );
  for (const record of adolescence.annualRecords) {
    assert.equal(record.calendarYear, adolescence.birthYear + record.age);
    assert.ok(record.calendarYear >= calibration.scope.startYear);
    assert.ok(record.calendarYear <= calibration.scope.endYear);
    const factIds = new Set(record.facts.map((fact) => fact.id));
    for (const change of record.statChanges) {
      assert.ok(factIds.has(change.sourceFactId), `属性变化必须引用同年事实：${change.sourceFactId}`);
    }
    const financeFact = record.facts.find(
      (fact) => fact.type === "adolescence_household_finance_settled",
    );
    assert.ok(financeFact, "青少年阶段每年必须有家庭财务结算");
    assert.ok(Number.isFinite(financeFact.annualHouseholdIncomeYuan));
    const expenseFact = record.facts.find(
      (fact) => fact.type === "junior_education_cash_expense",
    );
    if (expenseFact) {
      assert.ok(expenseFact.amountYuan > 0);
      assert.ok(expenseFact.amountYuan < financeFact.annualHouseholdIncomeYuan);
      assert.ok(expenseFact.shareOfAnnualHouseholdIncome > 0);
    }
    for (const schoolFact of record.facts.filter(
      (fact) => fact.type === "junior_school_year_attendance_and_learning",
    )) {
      assert.ok(Number.isInteger(schoolFact.attendedDays));
      assert.ok(schoolFact.attendedDays <= schoolFact.prescribedInstructionDays);
      assert.ok(schoolFact.learningProgressScore >= 0 && schoolFact.learningProgressScore <= 100);
      assert.equal(schoolFact.specificSchoolStudentTeacherRatio, null);
    }
    for (const assessmentFact of record.facts.filter(
      (fact) => fact.type === "junior_completion_assessment",
    )) {
      assert.equal(assessmentFact.standardizedExamScore, null);
      assert.equal(assessmentFact.subjectScores, null);
      assert.equal(assessmentFact.jurisdictionSpecificRules, null);
      assert.ok(assessmentFact.aggregatePerformanceIndex >= 0);
      assert.ok(assessmentFact.aggregatePerformanceIndex <= 100);
    }
    for (const activityFact of record.facts.filter(
      (fact) => fact.type === "nonstudent_annual_activity",
    )) {
      assert.equal(activityFact.employmentRelationshipCreated, false);
      assert.equal(activityFact.employer, null);
      assert.equal(activityFact.laborContract, null);
      assert.equal(activityFact.cashWageYuan, 0);
      assert.equal(activityFact.nationalAverageWageAssignedToPerson, false);
      if (record.age < 16) {
        assert.equal(
          activityFact.activityNature,
          "family_housework_production_self_study_or_observation",
        );
      }
    }
    for (const preparationFact of record.facts.filter(
      (fact) => fact.type === "age16_next_stage_preparation",
    )) {
      assert.equal(preparationFact.employerSecured, false);
      assert.equal(preparationFact.wageSecuredYuan, null);
      assert.equal(preparationFact.nextStageMustResolveActualOpportunity, true);
    }
  }
  const incomeSum = adolescence.household.members.reduce(
    (sum, member) => sum + member.annualIncomeContributionYuan,
    0,
  );
  assertNear(
    incomeSum,
    adolescence.household.finance.annualHouseholdIncomeYuan,
    0.04,
    "青少年阶段最终家庭收入必须与成员贡献核对",
  );
  if (adolescence.ending) {
    const endingRecord = adolescence.annualRecords.find(
      (record) => record.calendarYear === adolescence.ending.calendarYear,
    );
    assert.ok(endingRecord?.facts.some((fact) => fact.id === adolescence.ending.sourceFactId));
  }
  const sourceIds = new Set(calibration.sources.map((source) => source.id));
  const assumptionIds = new Set([
    ...Object.values(calibration.assumptions).map((entry) => entry.id),
    ...events.events.map((event) => event.assumptionId),
  ]);
  for (const sourceId of adolescence.provenance.observationSourceIds) {
    assert.ok(sourceIds.has(sourceId), `青少年来源编号必须可解析：${sourceId}`);
  }
  for (const assumptionId of adolescence.provenance.assumptionIds) {
    assert.ok(assumptionIds.has(assumptionId), `青少年假设编号必须可解析：${assumptionId}`);
  }
  for (const decision of adolescence.decisions) {
    const event = events.events.find((candidate) => candidate.id === decision.eventId);
    assert.ok(event);
    assert.equal(decision.unchosenOptionIds.length, event.options.length - 1);
  }
  assert.ok(
    adolescence.priorDecisions.every((decision) => decision.unchosenOptionIds.length >= 2),
    "幼年和小学阶段的未选择分支必须跨阶段保留",
  );
}

const juniorLife = findLife(
  "adolescence-junior",
  (primary) => primary.ending?.id === "entered_junior_secondary",
);
const nonstudentLife = findLife(
  "adolescence-nonstudent",
  (primary) => primary.ending?.id !== "entered_junior_secondary",
);

const deterministicA = simulateAdolescence(
  juniorLife.profile,
  juniorLife.childhood,
  juniorLife.primary,
  calibration,
  events,
  { seed: "adolescence-deterministic" },
);
const deterministicB = simulateAdolescence(
  juniorLife.profile,
  juniorLife.childhood,
  juniorLife.primary,
  calibration,
  events,
  { seed: "adolescence-deterministic" },
);
assert.deepEqual(deterministicA, deterministicB, "青少年阶段相同输入和种子必须可复现");
assertIntegrity(deterministicA);

const juniorChoices = {
  junior_entry_routine: "junior_entry_regular_study",
  junior_grade2_expense_arrangement: "grade2_keep_full_materials",
  junior_final_direction: "final_academic_senior_preparation",
};
const manualJunior = simulateAdolescence(
  juniorLife.profile,
  juniorLife.childhood,
  juniorLife.primary,
  calibration,
  events,
  { seed: "adolescence-manual-junior", choices: juniorChoices },
);
for (const decision of manualJunior.decisions.filter((decision) => juniorChoices[decision.eventId])) {
  assert.equal(decision.selectedOptionId, juniorChoices[decision.eventId]);
}

const nonstudentChoices = {
  nonstudent_early_direction: "nonstudent_observe_trade",
  age16_next_direction: "age16_short_training",
};
const manualNonstudent = simulateAdolescence(
  nonstudentLife.profile,
  nonstudentLife.childhood,
  nonstudentLife.primary,
  calibration,
  events,
  { seed: "adolescence-manual-nonstudent", choices: nonstudentChoices },
);
assert.equal(manualNonstudent.ending.id, "prepared_for_short_vocational_training");
for (const decision of manualNonstudent.decisions) {
  assert.equal(decision.selectedOptionId, nonstudentChoices[decision.eventId]);
}
assertIntegrity(manualNonstudent);

const awaitingJunior = simulateAdolescence(
  juniorLife.profile,
  juniorLife.childhood,
  juniorLife.primary,
  calibration,
  events,
  { seed: "adolescence-awaiting-junior", autoChoose: false },
);
assert.equal(awaitingJunior.status, "awaiting_choice");
assert.equal(awaitingJunior.pendingDecision.eventId, "junior_entry_routine");
const awaitingNonstudent = simulateAdolescence(
  nonstudentLife.profile,
  nonstudentLife.childhood,
  nonstudentLife.primary,
  calibration,
  events,
  { seed: "adolescence-awaiting-nonstudent", autoChoose: false },
);
assert.equal(awaitingNonstudent.status, "awaiting_choice");
assert.equal(awaitingNonstudent.pendingDecision.eventId, "nonstudent_early_direction");

let transitionCounterfactualFound = false;
let trackCounterfactualFound = false;
for (let index = 0; index < 300 && !(transitionCounterfactualFound && trackCounterfactualFound); index += 1) {
  const life = makeLife(`adolescence-counterfactual-${index}`, 1978 + (index % 5));
  if (life.primary.ending?.id !== "entered_junior_secondary") continue;
  const common = {
    junior_entry_routine: "junior_entry_regular_study",
    junior_grade2_expense_arrangement: "grade2_reuse_and_borrow",
  };
  const academic = simulateAdolescence(
    life.profile,
    life.childhood,
    life.primary,
    calibration,
    events,
    {
      seed: `adolescence-counterfactual-run-${index}`,
      choices: { ...common, junior_final_direction: "final_academic_senior_preparation" },
    },
  );
  const vocational = simulateAdolescence(
    life.profile,
    life.childhood,
    life.primary,
    calibration,
    events,
    {
      seed: `adolescence-counterfactual-run-${index}`,
      choices: { ...common, junior_final_direction: "final_vocational_exploration" },
    },
  );
  const work = simulateAdolescence(
    life.profile,
    life.childhood,
    life.primary,
    calibration,
    events,
    {
      seed: `adolescence-counterfactual-run-${index}`,
      choices: { ...common, junior_final_direction: "final_work_preparation" },
    },
  );
  const academicFact = academic.annualRecords.flatMap((record) => record.facts).find(
    (fact) => fact.type === "senior_secondary_transition_outcome",
  );
  const vocationalFact = vocational.annualRecords.flatMap((record) => record.facts).find(
    (fact) => fact.type === "senior_secondary_transition_outcome",
  );
  const workFact = work.annualRecords.flatMap((record) => record.facts).find(
    (fact) => fact.type === "senior_secondary_transition_outcome",
  );
  if (academicFact && workFact) {
    assert.ok(
      academicFact.modeledIndividualProbability > workFact.modeledIndividualProbability,
      "升学准备必须提高同一人生进入高中阶段的概率",
    );
    transitionCounterfactualFound = true;
  }
  if (academicFact?.enteredSeniorStage && vocationalFact?.enteredSeniorStage) {
    assert.ok(
      vocationalFact.modeledVocationalTrackProbability
        > academicFact.modeledVocationalTrackProbability,
      "职业方向准备必须提高同一人生进入职业教育的条件概率",
    );
    trackCounterfactualFound = true;
  }
}
assert.equal(transitionCounterfactualFound, true);
assert.equal(trackCounterfactualFound, true);

let completed = 0;
let juniorEntrants = 0;
let initialNonstudents = 0;
let juniorGraduates = 0;
let seniorEntries = 0;
let vocationalEntries = 0;
let academicEntries = 0;
let juniorExited = 0;
let repeats = 0;
let under16NonstudentYears = 0;
let age16PreparationFacts = 0;
const dropoutByYear = new Map();
const transitionByYear = new Map();
const choiceCounts = new Map();
const schoolForms = new Set();
const endingCounts = new Map();

for (let index = 0; index < sampleCount; index += 1) {
  const life = makeLife(`adolescence-check-${index}`, 1978 + (index % 5));
  const adolescence = simulateAdolescence(
    life.profile,
    life.childhood,
    life.primary,
    calibration,
    events,
    { seed: `adolescence-check-run-${index}` },
  );
  assertIntegrity(adolescence);
  completed += adolescence.status === "completed_stage" ? 1 : 0;
  const startedJunior = adolescence.annualRecords[0].pathAtStart === "junior_student";
  juniorEntrants += startedJunior ? 1 : 0;
  initialNonstudents += startedJunior ? 0 : 1;
  juniorGraduates += adolescence.education.junior.status === "graduated_junior" ? 1 : 0;
  juniorExited += adolescence.education.junior.status === "exited_junior_before_completion" ? 1 : 0;
  repeats += adolescence.education.junior.repeatedYears;
  const endingId = adolescence.ending?.id ?? "unknown";
  endingCounts.set(endingId, (endingCounts.get(endingId) ?? 0) + 1);
  if (endingId === "entered_vocational_secondary") {
    seniorEntries += 1;
    vocationalEntries += 1;
  }
  if (endingId === "entered_academic_senior_secondary") {
    seniorEntries += 1;
    academicEntries += 1;
  }
  if (adolescence.education.junior.school) {
    schoolForms.add(adolescence.education.junior.school.form);
  }
  for (const decision of adolescence.decisions) {
    choiceCounts.set(
      decision.selectedOptionId,
      (choiceCounts.get(decision.selectedOptionId) ?? 0) + 1,
    );
  }
  for (const record of adolescence.annualRecords) {
    const activityFact = record.facts.find((fact) => fact.type === "nonstudent_annual_activity");
    if (activityFact && record.age < 16) under16NonstudentYears += 1;
    if (record.facts.some((fact) => fact.type === "age16_next_stage_preparation")) {
      age16PreparationFacts += 1;
    }
    const continuationFact = record.facts.find(
      (fact) => fact.type === "junior_continuation_outcome",
    );
    if (continuationFact) {
      const cell = dropoutByYear.get(record.calendarYear) ?? {
        students: 0,
        exited: 0,
        probabilitySum: 0,
      };
      cell.students += 1;
      cell.exited += continuationFact.continued ? 0 : 1;
      cell.probabilitySum += continuationFact.modeledIndividualExitProbability;
      dropoutByYear.set(record.calendarYear, cell);
    }
    const transitionFact = record.facts.find(
      (fact) => fact.type === "senior_secondary_transition_outcome",
    );
    if (transitionFact) {
      const cell = transitionByYear.get(record.calendarYear) ?? {
        graduates: 0,
        entered: 0,
        probabilitySum: 0,
      };
      cell.graduates += 1;
      cell.entered += transitionFact.enteredSeniorStage ? 1 : 0;
      cell.probabilitySum += transitionFact.modeledIndividualProbability;
      transitionByYear.set(record.calendarYear, cell);
    }
  }
}

assert.equal(completed, sampleCount);
assert.ok(juniorEntrants > sampleCount * 0.50);
assert.ok(initialNonstudents > sampleCount * 0.15);
assert.ok(juniorGraduates / juniorEntrants > 0.68);
assert.ok(juniorGraduates / juniorEntrants < 0.90);
assert.ok(juniorExited > juniorEntrants * 0.08);
assert.ok(repeats > juniorEntrants * 0.02 && repeats < juniorEntrants * 0.20);
assert.ok(seniorEntries / juniorGraduates > 0.40 && seniorEntries / juniorGraduates < 0.72);
assert.ok(vocationalEntries > seniorEntries * 0.35);
assert.ok(academicEntries > seniorEntries * 0.30);
assert.ok(under16NonstudentYears > sampleCount * 0.25);
const preparationEndingCount = [
  "prepared_for_family_economic_activity",
  "prepared_for_entry_job_search",
  "prepared_for_short_vocational_training",
  "continued_self_study_after_16",
].reduce((sum, endingId) => sum + (endingCounts.get(endingId) ?? 0), 0);
assert.equal(age16PreparationFacts, preparationEndingCount);
assert.ok(
  (endingCounts.get("junior_not_completed_by_age_18") ?? 0) < sampleCount * 0.005,
  "18岁仍未完成初中的路径可以存在，但不得成为常见结果",
);
assert.ok(schoolForms.size >= 4);

for (const event of events.events) {
  for (const option of event.options) {
    assert.ok((choiceCounts.get(option.id) ?? 0) > 0, `自动模拟必须覆盖选项：${option.id}`);
  }
}

for (const [year, cell] of dropoutByYear) {
  if (cell.students < 250) continue;
  const observed = cell.exited / cell.students;
  const modeledMean = cell.probabilitySum / cell.students;
  const nationalReference = getJuniorDropoutRate(calibration, year);
  assertNear(observed, modeledMean, 0.025, `${year}年初中退出抽样与个体概率均值`);
  assertNear(modeledMean, nationalReference, 0.045, `${year}年初中退出概率与全国锚点`);
}

for (const [year, cell] of transitionByYear) {
  if (cell.graduates < 200) continue;
  const observed = cell.entered / cell.graduates;
  const modeledMean = cell.probabilitySum / cell.graduates;
  const nationalReference = getJuniorToSeniorProgressionRate(calibration, year);
  const samplingTolerance = Math.max(
    0.035,
    3 * Math.sqrt((modeledMean * (1 - modeledMean)) / cell.graduates),
  );
  assertNear(
    observed,
    modeledMean,
    samplingTolerance,
    `${year}年高中阶段升学抽样与个体概率均值`,
  );
  assertNear(modeledMean, nationalReference, 0.15, `${year}年高中阶段升学概率与全国锚点`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      sampleCount,
      juniorEntryShareFromPrimaryOutcomes: round(juniorEntrants / sampleCount, 4),
      juniorGraduationShareAmongEntrants: round(juniorGraduates / juniorEntrants, 4),
      juniorExitShareAmongEntrants: round(juniorExited / juniorEntrants, 4),
      meanJuniorRepeatedYearsAmongEntrants: round(repeats / juniorEntrants, 4),
      seniorTransitionShareAmongJuniorGraduates: round(seniorEntries / juniorGraduates, 4),
      vocationalShareAmongSeniorEntries: round(vocationalEntries / seniorEntries, 4),
      endingCounts: Object.fromEntries([...endingCounts].sort()),
      checks: [
        "seed_determinism",
        "manual_choices_on_both_paths",
        "awaiting_choice_on_both_paths",
        "unchosen_branch_memory_across_all_stages",
        "counterfactual_transition_effect",
        "counterfactual_track_effect",
        "year_age_continuity",
        "fact_backed_stat_changes",
        "income_reconciliation",
        "education_cash_expense",
        "junior_school_and_attendance",
        "junior_dropout_and_graduation_bounds",
        "senior_transition_calibration",
        "vocational_and_academic_tracks",
        "under16_no_formal_employment",
        "national_wage_not_assigned_to_person",
        "age16_preparation_not_fake_job",
        "no_abstract_social_labels",
        "provenance_ids_resolve"
      ]
    },
    null,
    2,
  ),
);

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
