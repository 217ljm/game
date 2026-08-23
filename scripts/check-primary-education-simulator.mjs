import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateBirthProfile } from "../src/simulation/birth-generator.mjs";
import { simulateChildhood } from "../src/simulation/childhood-simulator.mjs";
import {
  getPrimaryToJuniorProgressionRate,
  simulatePrimaryEducation,
} from "../src/simulation/primary-education-simulator.mjs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");
const readJson = (...segments) =>
  JSON.parse(fs.readFileSync(path.join(projectRoot, ...segments), "utf8"));
const birthCalibration = readJson("data", "calibration", "birth_1978_1982.json");
const childhoodCalibration = readJson("data", "calibration", "childhood_1978_1988.json");
const childhoodEvents = readJson("data", "childhood_events.json");
const calibration = readJson("data", "calibration", "primary_education_1984_1996.json");
const events = readJson("data", "primary_education_events.json");
const sampleCount = Number(process.env.PRIMARY_CHECK_COUNT ?? 40000);
const forbiddenLabels = ["教育资源：普通", "家庭负担：中等", "收入稳定性", "成绩优秀", "偏低", "偏高"];

function assertNear(actual, expected, tolerance, message) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message}: actual=${actual}, expected=${expected}, tolerance=${tolerance}`,
  );
}

function makeSurvivor(seed, birthYear) {
  const profile = generateBirthProfile(birthCalibration, { seed: `${seed}:birth`, birthYear });
  const childhood = simulateChildhood(profile, childhoodCalibration, childhoodEvents, {
    seed: `${seed}:childhood`,
    mortality: false,
  });
  assert.equal(childhood.status, "completed_stage");
  return { profile, childhood };
}

function assertIntegrity(primary) {
  const serialized = JSON.stringify(primary);
  for (const label of forbiddenLabels) {
    assert.equal(serialized.includes(label), false, `小学档案不得出现人工等级标签：${label}`);
  }
  assert.equal(primary.status === "completed_stage" || primary.status === "awaiting_choice", true);
  for (const record of primary.annualRecords) {
    assert.equal(record.calendarYear, primary.birthYear + record.age, "小学阶段年份与年龄必须对应");
    assert.ok(record.calendarYear >= calibration.scope.startYear);
    assert.ok(record.calendarYear <= calibration.scope.endYear);
    const factIds = new Set(record.facts.map((fact) => fact.id));
    for (const change of record.statChanges) {
      assert.ok(factIds.has(change.sourceFactId), `属性变化必须引用同年事实：${change.sourceFactId}`);
    }
    const financeFact = record.facts.find((fact) => fact.type === "household_finance_settled");
    assert.ok(financeFact, "每年必须有家庭财务结算");
    assert.ok(Number.isFinite(financeFact.annualHouseholdIncomeYuan));
    assert.ok(Number.isFinite(financeFact.annualIncomePerPersonYuan));
    for (const schoolFact of record.facts.filter(
      (fact) => fact.type === "primary_school_year_attendance_and_learning",
    )) {
      assert.ok(Number.isInteger(schoolFact.attendedDays));
      assert.ok(schoolFact.attendedDays <= schoolFact.prescribedInstructionDays);
      assert.ok(schoolFact.learningProgressScore >= 0 && schoolFact.learningProgressScore <= 100);
      assert.equal(schoolFact.specificSchoolStudentTeacherRatio, null);
    }
  }
  const incomeSum = primary.household.members.reduce(
    (sum, member) => sum + member.annualIncomeContributionYuan,
    0,
  );
  assertNear(
    incomeSum,
    primary.household.finance.annualHouseholdIncomeYuan,
    0.04,
    "小学阶段最终家庭收入必须与成员贡献核对",
  );
  if (primary.ending) {
    const endingRecord = primary.annualRecords.find(
      (record) => record.calendarYear === primary.ending.calendarYear,
    );
    assert.ok(endingRecord?.facts.some((fact) => fact.id === primary.ending.sourceFactId));
  }
  const sourceIds = new Set(calibration.sources.map((source) => source.id));
  const assumptionIds = new Set([
    ...Object.values(calibration.assumptions).map((entry) => entry.id),
    ...events.events.map((event) => event.assumptionId),
  ]);
  for (const sourceId of primary.provenance.observationSourceIds) {
    assert.ok(sourceIds.has(sourceId), `小学来源编号必须可解析：${sourceId}`);
  }
  for (const assumptionId of primary.provenance.assumptionIds) {
    assert.ok(assumptionIds.has(assumptionId), `小学假设编号必须可解析：${assumptionId}`);
  }
}

const deterministicInput = makeSurvivor("primary-deterministic", 1979);
const deterministicA = simulatePrimaryEducation(
  deterministicInput.profile,
  deterministicInput.childhood,
  calibration,
  events,
  { seed: "primary-deterministic-run" },
);
const deterministicB = simulatePrimaryEducation(
  deterministicInput.profile,
  deterministicInput.childhood,
  calibration,
  events,
  { seed: "primary-deterministic-run" },
);
assert.deepEqual(deterministicA, deterministicB, "小学阶段相同输入和种子必须可复现");
assertIntegrity(deterministicA);

const manualChoices = {
  primary_entry_time_arrangement: "entry_regular_practice",
  primary_grade3_busy_season: "grade3_protect_attendance",
  primary_final_year_direction: "final_prepare_junior",
};
const manual = simulatePrimaryEducation(
  deterministicInput.profile,
  deterministicInput.childhood,
  calibration,
  events,
  { seed: "primary-manual-run", choices: manualChoices },
);
assert.ok(manual.decisions.length >= 1);
for (const decision of manual.decisions) {
  assert.equal(decision.chosenOptionId, manualChoices[decision.eventId]);
  assert.equal(decision.unchosenOptionIds.length, 2);
}

const awaiting = simulatePrimaryEducation(
  deterministicInput.profile,
  deterministicInput.childhood,
  calibration,
  events,
  { seed: "primary-awaiting-run", autoChoose: false },
);
assert.equal(awaiting.status, "awaiting_choice");
assert.equal(awaiting.pendingDecision.eventId, "primary_entry_time_arrangement");
assert.ok(awaiting.priorDecisions.every((decision) => decision.unchosenOptionIds.length === 2));

let counterfactualFound = false;
for (let index = 0; index < 120 && !counterfactualFound; index += 1) {
  const input = makeSurvivor(`primary-counterfactual-${index}`, 1978);
  const common = {
    primary_entry_time_arrangement: "entry_regular_practice",
    primary_grade3_busy_season: "grade3_protect_attendance",
  };
  const prepare = simulatePrimaryEducation(input.profile, input.childhood, calibration, events, {
    seed: `primary-counterfactual-run-${index}`,
    choices: { ...common, primary_final_year_direction: "final_prepare_junior" },
  });
  const practical = simulatePrimaryEducation(input.profile, input.childhood, calibration, events, {
    seed: `primary-counterfactual-run-${index}`,
    choices: { ...common, primary_final_year_direction: "final_learn_practical_tasks" },
  });
  if (
    prepare.decisions.some((decision) => decision.eventId === "primary_final_year_direction")
    && practical.decisions.some((decision) => decision.eventId === "primary_final_year_direction")
  ) {
    assert.equal(prepare.transitionPreparationHours, 120);
    assert.equal(practical.transitionPreparationHours, 24);
    const prepareFact = prepare.annualRecords.flatMap((record) => record.facts).find(
      (fact) => fact.type === "junior_secondary_transition_outcome",
    );
    const practicalFact = practical.annualRecords.flatMap((record) => record.facts).find(
      (fact) => fact.type === "junior_secondary_transition_outcome",
    );
    if (prepareFact && practicalFact) {
      assert.ok(
        prepareFact.modeledIndividualProbability > practicalFact.modeledIndividualProbability,
        "集中准备初中的选择必须提高同一人生的升学概率",
      );
      counterfactualFound = true;
    }
  }
}
assert.equal(counterfactualFound, true, "必须找到可比较的毕业年反事实路径");

let completed = 0;
let enteredByAge7 = 0;
let everEntered = 0;
let fiveYearSchools = 0;
let sixYearSchools = 0;
let halfDaySchools = 0;
let repeats = 0;
let exitedBeforeCompletion = 0;
let graduates = 0;
let juniorEntries = 0;
const transitionByYear = new Map();
const choiceCounts = new Map();

for (let index = 0; index < sampleCount; index += 1) {
  const birthYear = 1978 + (index % 5);
  const input = makeSurvivor(`primary-check-${index}`, birthYear);
  const primary = simulatePrimaryEducation(
    input.profile,
    input.childhood,
    calibration,
    events,
    { seed: `primary-check-run-${index}` },
  );
  assertIntegrity(primary);
  completed += primary.status === "completed_stage" ? 1 : 0;
  if (primary.education.entryAge !== null) {
    everEntered += 1;
    if (primary.education.entryAge <= 7) enteredByAge7 += 1;
  }
  if (primary.education.school?.prescribedYears === 5) fiveYearSchools += 1;
  if (primary.education.school?.prescribedYears === 6) sixYearSchools += 1;
  if (primary.education.school?.form === "half_day_or_simple_class") halfDaySchools += 1;
  repeats += primary.education.repeatedYears;
  exitedBeforeCompletion += primary.ending?.id === "exited_primary_before_completion" ? 1 : 0;
  if (primary.education.status === "graduated_primary") {
    graduates += 1;
    const year = primary.education.graduationYear;
    const cell = transitionByYear.get(year) ?? { graduates: 0, entered: 0, probabilitySum: 0 };
    cell.graduates += 1;
    const transitionFact = primary.annualRecords.flatMap((record) => record.facts).find(
      (fact) => fact.type === "junior_secondary_transition_outcome",
    );
    cell.entered += transitionFact.enteredJuniorSecondary ? 1 : 0;
    cell.probabilitySum += transitionFact.modeledIndividualProbability;
    transitionByYear.set(year, cell);
  }
  if (primary.ending?.id === "entered_junior_secondary") juniorEntries += 1;
  for (const decision of primary.decisions) {
    choiceCounts.set(decision.chosenOptionId, (choiceCounts.get(decision.chosenOptionId) ?? 0) + 1);
  }
}

assert.equal(completed, sampleCount);
assert.ok(everEntered / sampleCount > 0.99, "绝大多数儿童应在阶段上限前实际入学");
assert.ok(enteredByAge7 / sampleCount > 0.94, "到7岁累计入学比例应接近当期全国高入学率");
assert.ok(fiveYearSchools > sampleCount * 0.30 && sixYearSchools > sampleCount * 0.20);
assert.ok(halfDaySchools > sampleCount * 0.04, "历史存在的半日制或简易教学形式必须实际出现");
assert.ok(repeats > sampleCount * 0.04 && repeats < sampleCount * 0.25);
assert.ok(exitedBeforeCompletion > sampleCount * 0.08 && exitedBeforeCompletion < sampleCount * 0.24);
assert.ok(graduates > sampleCount * 0.70);
assert.ok(juniorEntries > sampleCount * 0.50);
for (const event of events.events) {
  for (const option of event.options) {
    assert.ok((choiceCounts.get(option.id) ?? 0) > sampleCount * 0.08, `自动模拟应覆盖选项：${option.id}`);
  }
}

for (const [year, cell] of transitionByYear) {
  if (cell.graduates < 300) continue;
  const observed = cell.entered / cell.graduates;
  const modeledMean = cell.probabilitySum / cell.graduates;
  const nationalReference = getPrimaryToJuniorProgressionRate(calibration, year);
  assertNear(observed, modeledMean, 0.045, `${year}年升初中抽样结果与个体概率均值`);
  assertNear(modeledMean, nationalReference, 0.13, `${year}年升初中概率与全国锚点`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      sampleCount,
      enteredByAge7Share: round(enteredByAge7 / sampleCount, 4),
      everEnteredShare: round(everEntered / sampleCount, 4),
      fiveYearSchoolShare: round(fiveYearSchools / everEntered, 4),
      sixYearSchoolShare: round(sixYearSchools / everEntered, 4),
      halfDayOrSimpleClassShare: round(halfDaySchools / everEntered, 4),
      meanRepeatedYears: round(repeats / sampleCount, 4),
      primaryGraduationShare: round(graduates / sampleCount, 4),
      juniorTransitionShareAmongGraduates: round(juniorEntries / graduates, 4),
      checks: [
        "seed_determinism",
        "manual_choices",
        "awaiting_choice",
        "unchosen_branch_memory_across_stages",
        "counterfactual_long_term_choice_effect",
        "year_age_continuity",
        "fact_backed_stat_changes",
        "income_reconciliation",
        "entry_age_distribution",
        "five_and_six_year_systems",
        "school_form_distribution",
        "attendance_and_learning_facts",
        "repeat_and_exit_bounds",
        "primary_graduation",
        "junior_transition_calibration",
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
