import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateBirthProfile } from "../src/simulation/birth-generator.mjs";
import { simulateChildhood } from "../src/simulation/childhood-simulator.mjs";
import { simulatePrimaryEducation } from "../src/simulation/primary-education-simulator.mjs";
import { simulateAdolescence } from "../src/simulation/adolescence-simulator.mjs";
import {
  getEmploymentStructureReference,
  getHigherEducationProgressionRate,
  getStaffWageReference,
  simulateYouthEntry,
} from "../src/simulation/youth-entry-simulator.mjs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");
const readJson = (...segments) =>
  JSON.parse(fs.readFileSync(path.join(projectRoot, ...segments), "utf8"));
const birthCalibration = readJson("data", "calibration", "birth_1978_1982.json");
const childhoodCalibration = readJson("data", "calibration", "childhood_1978_1988.json");
const childhoodEvents = readJson("data", "childhood_events.json");
const primaryCalibration = readJson("data", "calibration", "primary_education_1984_1996.json");
const primaryEvents = readJson("data", "primary_education_events.json");
const adolescenceCalibration = readJson(
  "data",
  "calibration",
  "adolescence_education_1986_2000.json",
);
const adolescenceEvents = readJson("data", "adolescence_events.json");
const calibration = readJson("data", "calibration", "youth_entry_1992_2006.json");
const events = readJson("data", "youth_entry_events.json");
const jobCatalog = readJson("data", "entry_job_catalog.json");
const sampleCount = Number(process.env.YOUTH_ENTRY_CHECK_COUNT ?? 15000);
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
  const adolescence = simulateAdolescence(
    profile,
    childhood,
    primary,
    adolescenceCalibration,
    adolescenceEvents,
    { seed: `${seed}:adolescence` },
  );
  return { profile, childhood, primary, adolescence };
}

function findLife(prefix, predicate) {
  for (let index = 0; index < 2500; index += 1) {
    const life = makeLife(`${prefix}-${index}`, 1978 + (index % 5));
    if (predicate(life.adolescence)) return life;
  }
  throw new Error(`未找到测试人生：${prefix}`);
}

const sourceIds = new Set(calibration.sources.map((source) => source.id));
const assumptionIds = new Set(Object.values(calibration.assumptions).map((entry) => entry.id));

function assertIntegrity(youth) {
  const serialized = JSON.stringify(youth);
  for (const label of forbiddenLabels) {
    assert.equal(serialized.includes(label), false, `青年入口档案不得出现人工等级标签：${label}`);
  }
  assert.equal(
    youth.status === "completed_stage" || youth.status === "awaiting_choice",
    true,
  );
  for (const sourceId of youth.provenance.observationSourceIds) {
    assert.ok(sourceIds.has(sourceId), `未登记的观察来源：${sourceId}`);
  }
  for (const assumptionId of youth.provenance.assumptionIds) {
    assert.ok(assumptionIds.has(assumptionId), `未登记的假设：${assumptionId}`);
  }
  for (const record of youth.annualRecords) {
    assert.equal(record.calendarYear, youth.birthYear + record.age);
    assert.ok(record.calendarYear >= calibration.scope.startYear);
    assert.ok(record.calendarYear <= calibration.scope.endYear);
    const factIds = new Set(record.facts.map((fact) => fact.id));
    for (const change of record.statChanges) {
      assert.ok(factIds.has(change.sourceFactId), `属性变化必须引用同年事实：${change.sourceFactId}`);
    }
    const financeFact = record.facts.find(
      (fact) => fact.type === "youth_household_finance_settled",
    );
    assert.ok(financeFact, "青年入口阶段每年必须有家庭财务结算");
    assert.ok(financeFact.originalFamilyMemberIncomeYuan > 0);
    assert.ok(financeFact.annualHouseholdIncomeYuan > 0);
    const expense = record.facts.find(
      (fact) => fact.type === "senior_education_cash_expense",
    );
    if (expense) {
      assert.ok(expense.amountYuan > 0);
      assert.ok(expense.amountYuan < financeFact.annualHouseholdIncomeYuan);
      assert.equal(expense.exactLocalFeeScheduleKnown, false);
    }
    for (const opportunity of record.facts.filter(
      (fact) => fact.type === "concrete_job_candidates_generated",
    )) {
      assert.equal(opportunity.candidates.length, 3);
      for (const candidate of opportunity.candidates) {
        assert.ok(candidate.sector);
        assert.ok(candidate.industry);
        assert.ok(candidate.occupation);
        assert.ok(candidate.unitType);
        assert.ok(candidate.weeklyHours >= 40 && candidate.weeklyHours <= 70);
        assert.ok(candidate.personalCashIncomeThisYearYuan > 0);
        assert.ok(candidate.hiringProbability > 0 && candidate.hiringProbability <= 1);
        assert.equal(candidate.employerName, null);
      }
    }
    for (const workFact of record.facts.filter(
      (fact) => fact.type === "first_actual_work_started",
    )) {
      assert.ok(record.age >= 16, "不得在16岁前创建普通劳动或家庭经济活动入口");
      assert.ok(workFact.industry);
      assert.ok(workFact.occupation);
      assert.ok(workFact.unitType);
      assert.ok(workFact.weeklyHours >= 40 && workFact.weeklyHours <= 70);
      assert.ok(workFact.annualIncomeContributionYuan > 0);
      if (workFact.familyEconomicActivity) {
        assert.equal(workFact.laborRelationshipCreated, false);
        assert.equal(workFact.contractType, "not_applicable_family_operation");
      }
    }
  }
  const memberIncomeSum = youth.household.members.reduce(
    (sum, member) => sum + (member.annualIncomeContributionYuan ?? 0),
    0,
  );
  assertNear(
    memberIncomeSum,
    youth.household.finance.annualHouseholdIncomeYuan,
    0.011,
    "最后一年成员收入贡献之和必须等于家庭总收入",
  );
  if (youth.ending?.job) {
    const self = youth.household.members.find((member) => member.relation === "self");
    assert.equal(self.job.id, youth.ending.job.id);
    assert.equal(youth.employment.currentJob.id, youth.ending.job.id);
    assert.ok(youth.household.finance.playerPersonalIncomeYuan > 0);
    assert.ok(youth.ending.job.sector);
    assert.ok(youth.ending.job.occupation);
    assert.ok(youth.ending.job.unitType);
  }
}

assert.equal(getStaffWageReference(calibration, 1992).all, 2711);
assert.equal(getStaffWageReference(calibration, 2006).stateOwned, 22112);
assertNear(getHigherEducationProgressionRate(calibration, 1999), 0.638, 1e-12, "1999升学率");
assertNear(getHigherEducationProgressionRate(calibration, 2006), 0.751, 1e-12, "2006升学率");
assertNear(
  getEmploymentStructureReference(calibration, 2004).tertiary,
  0.306,
  1e-12,
  "2004第三产业就业结构",
);

assert.ok(jobCatalog.templates.length >= 10);
for (const template of jobCatalog.templates) {
  assert.ok(template.id);
  assert.ok(template.sector);
  assert.ok(template.industry);
  assert.ok(template.occupation);
  assert.equal(template.unitTypes.length > 0, true);
  if (template.familyActivity) {
    assert.equal(template.employmentForm, "family_economic_activity");
    assert.equal(template.contractProbability, 0);
  } else {
    assert.equal(template.staffAverageWageMultiplierRange.length, 2);
  }
}

const academicLife = findLife(
  "manual-academic",
  (adolescence) => adolescence.ending.id === "entered_academic_senior_secondary",
);
const academicPending = simulateYouthEntry(
  academicLife.profile,
  academicLife.adolescence,
  calibration,
  events,
  jobCatalog,
  { seed: "manual-academic-youth", autoChoose: false },
);
assert.equal(academicPending.status, "awaiting_choice");
assert.equal(academicPending.pendingDecision.eventId, "academic_senior_entry_routine");
assert.equal(academicPending.pendingDecision.options.length, 3);
const academicChosen = simulateYouthEntry(
  academicLife.profile,
  academicLife.adolescence,
  calibration,
  events,
  jobCatalog,
  {
    seed: "manual-academic-youth",
    choices: { academic_senior_entry_routine: "academic_exam_focus" },
    autoChoose: true,
  },
);
assert.equal(academicChosen.decisions[0].selectedOptionId, "academic_exam_focus");
assert.equal(academicChosen.decisions[0].selectionMode, "manual");
assertIntegrity(academicChosen);

const jobLife = findLife(
  "manual-job",
  (adolescence) => adolescence.ending.id === "prepared_for_entry_job_search",
);
const jobPending = simulateYouthEntry(
  jobLife.profile,
  jobLife.adolescence,
  calibration,
  events,
  jobCatalog,
  { seed: "manual-job-youth", autoChoose: false },
);
assert.equal(jobPending.status, "awaiting_choice");
assert.ok(jobPending.pendingDecision.eventId.startsWith("job_opportunity_"));
assert.equal(jobPending.pendingDecision.options.length, 3);
const requestedTemplate = jobPending.pendingDecision.options[0].templateId;
const manualJob = simulateYouthEntry(
  jobLife.profile,
  jobLife.adolescence,
  calibration,
  events,
  jobCatalog,
  {
    seed: "manual-job-youth",
    choices: { [jobPending.pendingDecision.eventId]: requestedTemplate },
    autoChoose: true,
  },
);
assert.equal(manualJob.decisions[0].selectedTemplateId, requestedTemplate);
assert.equal(manualJob.decisions[0].selectionMode, "manual");
assert.equal(manualJob.decisions[0].unchosenCandidates.length, 2);
assertIntegrity(manualJob);

const familyLife = findLife(
  "family-work",
  (adolescence) => adolescence.ending.id === "prepared_for_family_economic_activity",
);
const familyYouth = simulateYouthEntry(
  familyLife.profile,
  familyLife.adolescence,
  calibration,
  events,
  jobCatalog,
  { seed: "family-work-youth" },
);
assert.equal(familyYouth.ending.id, "entered_family_economic_activity");
assert.equal(familyYouth.ending.job.contractType, "not_applicable_family_operation");
assertIntegrity(familyYouth);

const deterministicFirst = simulateYouthEntry(
  academicLife.profile,
  academicLife.adolescence,
  calibration,
  events,
  jobCatalog,
  { seed: "deterministic-youth" },
);
const deterministicSecond = simulateYouthEntry(
  academicLife.profile,
  academicLife.adolescence,
  calibration,
  events,
  jobCatalog,
  { seed: "deterministic-youth" },
);
assert.deepEqual(deterministicFirst, deterministicSecond, "同一种子必须得到完全相同的青年入口结果");

const counts = {
  startingPaths: {},
  outcomes: {},
  academicStarted: 0,
  academicGraduated: 0,
  vocationalStarted: 0,
  vocationalGraduated: 0,
  higherEducationEntries: 0,
  workEndings: 0,
  familyWorkEndings: 0,
  employeeEndings: 0,
  writtenContractEndings: 0,
  industries: new Set(),
  sectors: new Set(),
  unitTypes: new Set(),
  totalWeeklyHours: 0,
};

for (let index = 0; index < sampleCount; index += 1) {
  const life = makeLife(`batch-${index}`, 1978 + (index % 5));
  const youth = simulateYouthEntry(
    life.profile,
    life.adolescence,
    calibration,
    events,
    jobCatalog,
    { seed: `batch-youth-${index}` },
  );
  assertIntegrity(youth);
  assert.equal(youth.status, "completed_stage");
  const startingPath = youth.entryPreparationPath;
  counts.startingPaths[startingPath] = (counts.startingPaths[startingPath] ?? 0) + 1;
  counts.outcomes[youth.ending.id] = (counts.outcomes[youth.ending.id] ?? 0) + 1;
  const senior = youth.education.senior;
  if (senior?.track === "academic_senior") {
    counts.academicStarted += 1;
    if (senior.status === "graduated") counts.academicGraduated += 1;
  }
  if (senior?.track === "vocational_secondary") {
    counts.vocationalStarted += 1;
    if (senior.status === "graduated") counts.vocationalGraduated += 1;
  }
  if (youth.ending.id === "entered_regular_higher_education") {
    counts.higherEducationEntries += 1;
  }
  if (youth.ending.job) {
    counts.workEndings += 1;
    if (youth.ending.id === "entered_family_economic_activity") counts.familyWorkEndings += 1;
    if (youth.ending.id === "entered_first_job") counts.employeeEndings += 1;
    if (youth.ending.job.contractType.startsWith("written")) counts.writtenContractEndings += 1;
    counts.industries.add(youth.ending.job.industry);
    counts.sectors.add(youth.ending.job.sector);
    counts.unitTypes.add(youth.ending.job.unitType);
    counts.totalWeeklyHours += youth.ending.job.weeklyHours;
  }
}

for (const expectedPath of [
  "academic_senior",
  "vocational_secondary",
  "family_economic_activity",
  "entry_job_search",
  "short_vocational_training",
  "continued_self_study",
]) {
  assert.ok(counts.startingPaths[expectedPath] > 0, `批量样本应覆盖入口：${expectedPath}`);
}
assert.ok(counts.academicStarted > sampleCount * 0.05);
assert.ok(counts.vocationalStarted > sampleCount * 0.05);
assert.ok(counts.academicGraduated / counts.academicStarted > 0.72);
assert.ok(counts.academicGraduated / counts.academicStarted < 0.99);
assert.ok(counts.vocationalGraduated / counts.vocationalStarted > 0.68);
assert.ok(counts.vocationalGraduated / counts.vocationalStarted < 0.99);
assert.ok(counts.higherEducationEntries > sampleCount * 0.01);
assert.ok(counts.workEndings > sampleCount * 0.70);
assert.ok(counts.familyWorkEndings > sampleCount * 0.10);
assert.ok(counts.employeeEndings > sampleCount * 0.05);
assert.ok(counts.writtenContractEndings > sampleCount * 0.01);
assert.ok(counts.industries.size >= 8);
assert.equal(counts.sectors.size, 3);
assert.ok(counts.unitTypes.size >= 7);
const meanHours = counts.totalWeeklyHours / counts.workEndings;
assert.ok(meanHours >= 48 && meanHours <= 62);

console.log(JSON.stringify({
  sampleCount,
  startingPaths: counts.startingPaths,
  outcomes: counts.outcomes,
  academicGraduationShare: round(counts.academicGraduated / counts.academicStarted, 4),
  vocationalGraduationShare: round(counts.vocationalGraduated / counts.vocationalStarted, 4),
  higherEducationShareAmongAcademicGraduates: round(
    counts.higherEducationEntries / counts.academicGraduated,
    4,
  ),
  workEndings: counts.workEndings,
  familyWorkEndings: counts.familyWorkEndings,
  employeeEndings: counts.employeeEndings,
  writtenContractEndings: counts.writtenContractEndings,
  industryCount: counts.industries.size,
  sectorCount: counts.sectors.size,
  unitTypeCount: counts.unitTypes.size,
  meanFirstWorkWeeklyHours: round(meanHours, 2),
}, null, 2));

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
