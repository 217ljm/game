import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateBirthProfile } from "../src/simulation/birth-generator.mjs";
import { simulateChildhood } from "../src/simulation/childhood-simulator.mjs";
import { simulatePrimaryEducation } from "../src/simulation/primary-education-simulator.mjs";
import { simulateAdolescence } from "../src/simulation/adolescence-simulator.mjs";
import { simulateYouthEntry } from "../src/simulation/youth-entry-simulator.mjs";
import {
  estimateRetirementAge,
  getAdultEconomicReference,
  getAdultEmploymentStructure,
  simulateAdultLife,
} from "../src/simulation/adult-life-simulator.mjs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");
const readJson = (...segments) =>
  JSON.parse(fs.readFileSync(path.join(projectRoot, ...segments), "utf8"));
const config = {
  birth: readJson("data", "calibration", "birth_1978_1982.json"),
  childhood: readJson("data", "calibration", "childhood_1978_1988.json"),
  childhoodEvents: readJson("data", "childhood_events.json"),
  primary: readJson("data", "calibration", "primary_education_1984_1996.json"),
  primaryEvents: readJson("data", "primary_education_events.json"),
  adolescence: readJson("data", "calibration", "adolescence_education_1986_2000.json"),
  adolescenceEvents: readJson("data", "adolescence_events.json"),
  youth: readJson("data", "calibration", "youth_entry_1992_2006.json"),
  youthEvents: readJson("data", "youth_entry_events.json"),
  entryJobs: readJson("data", "entry_job_catalog.json"),
};
const calibration = readJson("data", "calibration", "adult_life_1992_2025.json");
const events = readJson("data", "adult_life_events.json");
const jobs = readJson("data", "adult_job_catalog.json");
const sampleCount = Number(process.env.ADULT_LIFE_CHECK_COUNT ?? 5000);
const forbiddenLabels = [
  "教育资源：普通",
  "家庭负担：中等",
  "收入稳定性",
  "阶层：",
  "偏低",
  "偏高",
];

function assertNear(actual, expected, tolerance, message) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message}: actual=${actual}, expected=${expected}, tolerance=${tolerance}`,
  );
}

function makeYouth(seed, birthYear = 1979) {
  const profile = generateBirthProfile(config.birth, { seed: `${seed}:birth`, birthYear });
  const childhood = simulateChildhood(profile, config.childhood, config.childhoodEvents, {
    seed: `${seed}:childhood`,
    mortality: false,
  });
  const primary = simulatePrimaryEducation(
    profile,
    childhood,
    config.primary,
    config.primaryEvents,
    { seed: `${seed}:primary` },
  );
  const adolescence = simulateAdolescence(
    profile,
    childhood,
    primary,
    config.adolescence,
    config.adolescenceEvents,
    { seed: `${seed}:adolescence` },
  );
  const youth = simulateYouthEntry(
    profile,
    adolescence,
    config.youth,
    config.youthEvents,
    config.entryJobs,
    { seed: `${seed}:youth` },
  );
  return { profile, childhood, primary, adolescence, youth };
}

function findYouth(prefix, predicate) {
  for (let index = 0; index < 4000; index += 1) {
    const life = makeYouth(`${prefix}-${index}`, 1978 + (index % 5));
    if (predicate(life.youth)) return life;
  }
  throw new Error(`未找到成年测试入口：${prefix}`);
}

const sourceIds = new Set(calibration.sources.map((source) => source.id));
const assumptionIds = new Set(Object.values(calibration.assumptions).map((entry) => entry.id));
const scenarioIds = new Set(Object.values(calibration.scenarios).map((entry) => entry.id));

function assertIntegrity(adult, allowPending = false) {
  const serialized = JSON.stringify(adult);
  for (const label of forbiddenLabels) {
    assert.equal(serialized.includes(label), false, `成年档案不得出现人工社会等级标签：${label}`);
  }
  assert.equal(
    adult.status === "completed_stage" || (allowPending && adult.status === "awaiting_choice"),
    true,
  );
  for (const sourceId of adult.provenance.observationSourceIds) {
    assert.ok(sourceIds.has(sourceId), `未登记的成年观察来源：${sourceId}`);
  }
  for (const assumptionId of adult.provenance.assumptionIds) {
    assert.ok(assumptionIds.has(assumptionId), `未登记的成年假设：${assumptionId}`);
  }
  for (const scenarioId of adult.provenance.scenarioIds) {
    assert.ok(scenarioIds.has(scenarioId), `未登记的未来情景：${scenarioId}`);
  }
  let previousYear = null;
  for (const record of adult.annualRecords) {
    assert.equal(record.calendarYear, adult.birthYear + record.age);
    if (previousYear != null) assert.equal(record.calendarYear, previousYear + 1);
    previousYear = record.calendarYear;
    assert.equal(
      record.dataStatus === (record.calendarYear > 2025 ? "scenario" : "observation_or_interpolation"),
      true,
    );
    const factIds = new Set(record.facts.map((fact) => fact.id));
    for (const change of record.statChanges) {
      assert.ok(factIds.has(change.sourceFactId), `成年属性变化必须引用同年事实：${change.sourceFactId}`);
    }
    const context = record.facts.find((fact) => fact.type === "adult_year_context");
    assert.ok(context);
    if (adult.status === "completed_stage" || record !== adult.annualRecords.at(-1)) {
      const finance = record.facts.find((fact) => fact.type === "adult_household_finance");
      assert.ok(finance, `完成结算的成年年份必须有家庭账：${record.calendarYear}`);
      assert.ok(Number.isFinite(finance.annualHouseholdCashIncomeYuan));
      assert.ok(Number.isFinite(finance.annualTotalExpenseYuan));
      assert.ok(Number.isFinite(finance.endingNetWorthYuan));
      if (record.calendarYear > 2025) assert.ok(finance.scenarioId);
    }
    for (const jobFact of record.facts.filter(
      (fact) => ["adult_job_year", "adult_job_started"].includes(fact.type),
    )) {
      assert.ok(jobFact.industry);
      assert.ok(jobFact.occupation);
      assert.ok(jobFact.unitType);
      assert.ok(jobFact.weeklyHours >= 32 && jobFact.weeklyHours <= 72);
      assert.ok(jobFact.annualizedIncomeYuan > 0);
      assert.equal(jobFact.employerName ?? null, null);
    }
    for (const candidateFact of record.facts.filter(
      (fact) => fact.type === "adult_job_candidates_generated",
    )) {
      assert.equal(
        candidateFact.candidates.length,
        3,
        `工作候选不足3项：year=${record.calendarYear}, rank=${candidateFact.educationRank}, residence=${adult.residence}`,
      );
      for (const candidate of candidateFact.candidates) {
        assert.ok(candidate.industry);
        assert.ok(candidate.occupation);
        assert.ok(candidate.unitType);
        assert.ok(candidate.annualizedIncomeYuan > 0);
        assert.ok(candidate.hiringProbability > 0 && candidate.hiringProbability <= 1);
      }
    }
    for (const decision of record.decisions) {
      assert.ok(factIds.has(decision.sourceFactId));
      assert.ok(decision.unchosenOptionIds.length >= 1);
    }
  }
  if (adult.status === "completed_stage") {
    assert.ok(adult.ending.age >= 16 && adult.ending.age <= calibration.scope.maximumAge);
    assert.ok(adult.ending.calendarYear > adult.birthYear);
    assert.ok(adult.lifeReview);
    assert.equal(adult.lifeReview.ageAtDeath, adult.ending.age);
    if (adult.ending.age >= 22) assert.ok(adult.lifeReview.decisionCount >= 1);
    assert.ok(adult.lifeReview.untraveledPaths.length >= adult.lifeReview.decisionCount);
    if (adult.ending.calendarYear > 2025) {
      assert.ok(adult.provenance.scenarioIds.length >= 1, "2026年后经历必须引用未来情景");
    }
    assert.equal(adult.finance.netWorthYuan, adult.lifeReview.finalNetWorthYuan);
    assert.equal(adult.employment.history.length, adult.lifeReview.jobCount);
    for (const job of adult.employment.history) {
      assert.ok(job.startYear);
      assert.ok(job.endYear <= adult.ending.calendarYear);
      assert.ok(job.endReason);
    }
  }
}

assert.equal(getAdultEconomicReference(calibration, 2015, "urban").residentIncomePerPersonYuan, 31195);
assert.equal(getAdultEconomicReference(calibration, 2020, "rural").residentIncomePerPersonYuan, 17131);
assert.equal(getAdultEconomicReference(calibration, 2025, "urban").urbanNonPrivateUnitAverageWageYuan, 129441);
assert.equal(getAdultEconomicReference(calibration, 2025, "urban").urbanPrivateUnitAverageWageYuan, 71590);
const projected2030 = getAdultEconomicReference(calibration, 2030, "urban");
assert.equal(projected2030.dataStatus, "scenario");
assert.equal(projected2030.scenarioId, "SCENARIO_BASELINE_2026_PLUS");
assert.ok(projected2030.residentIncomePerPersonYuan > 56502);
assertNear(getAdultEmploymentStructure(calibration, 2017).tertiary, 0.449, 1e-12, "2017第三产业就业占比");
assert.equal(getAdultEmploymentStructure(calibration, 2020).dataStatus, "latest_observation_carried_forward");
assert.equal(getAdultEmploymentStructure(calibration, 2030).dataStatus, "scenario");

const maleProfile = generateBirthProfile(config.birth, { seed: "retire-male", birthYear: 1978 });
maleProfile.person.sex = "male";
assert.equal(estimateRetirementAge(maleProfile, 2, "employee").age, 63);
const femaleProfile = structuredClone(maleProfile);
femaleProfile.person.sex = "female";
assert.equal(estimateRetirementAge(femaleProfile, 4, "employee").age, 57);
assert.equal(estimateRetirementAge(femaleProfile, 2, "employee").age, 52);
assert.equal(estimateRetirementAge(femaleProfile, 2, "self_employment").age, 65);

const workingLife = findYouth("manual-adult", (youth) => youth.ending.job != null);
const pendingAdult = simulateAdultLife(
  workingLife.profile,
  workingLife.youth,
  calibration,
  events,
  jobs,
  { seed: "manual-adult-life", autoChoose: false },
);
assert.equal(pendingAdult.status, "awaiting_choice");
assert.equal(pendingAdult.pendingDecision.options.length >= 2, true);
assertIntegrity(pendingAdult, true);
const manualOption = pendingAdult.pendingDecision.options[0].id;
const manualAdult = simulateAdultLife(
  workingLife.profile,
  workingLife.youth,
  calibration,
  events,
  jobs,
  {
    seed: "manual-adult-life",
    choices: { [pendingAdult.pendingDecision.eventId]: manualOption },
    autoChoose: true,
  },
);
assert.equal(manualAdult.decisions[0].selectedOptionId, manualOption);
assert.equal(manualAdult.decisions[0].selectionMode, "manual");
assertIntegrity(manualAdult);

const higherLife = findYouth(
  "manual-higher",
  (youth) => youth.ending.id === "entered_regular_higher_education",
);
let dynamicPending = null;
let dynamicSeed = null;
for (let index = 0; index < 80; index += 1) {
  const seed = `manual-higher-adult-${index}`;
  const result = simulateAdultLife(
    higherLife.profile,
    higherLife.youth,
    calibration,
    events,
    jobs,
    {
      seed,
      autoChoose: false,
      choices: {
        higher_education_entry_routine: "higher_focus_study",
        higher_education_final_direction: "higher_prepare_professional_job",
      },
    },
  );
  if (result.pendingDecision?.eventId.startsWith("adult_job_opportunity_")) {
    dynamicPending = result;
    dynamicSeed = seed;
    break;
  }
}
assert.ok(dynamicPending, "应找到高等教育后等待选择的具体工作机会");
assert.equal(dynamicPending.pendingDecision.options.length, 3);
assertIntegrity(dynamicPending, true);
const dynamicTemplate = dynamicPending.pendingDecision.options[0].templateId;
const dynamicManual = simulateAdultLife(
  higherLife.profile,
  higherLife.youth,
  calibration,
  events,
  jobs,
  {
    seed: dynamicSeed,
    autoChoose: true,
    choices: {
      higher_education_entry_routine: "higher_focus_study",
      higher_education_final_direction: "higher_prepare_professional_job",
      [dynamicPending.pendingDecision.eventId]: dynamicTemplate,
    },
  },
);
const dynamicDecision = dynamicManual.decisions.find(
  (decision) => decision.eventId === dynamicPending.pendingDecision.eventId,
);
assert.equal(dynamicDecision.selectedTemplateId, dynamicTemplate);
assert.equal(dynamicDecision.selectionMode, "manual");
assert.equal(dynamicDecision.unchosenCandidates.length, 2);
assertIntegrity(dynamicManual);

const deterministicFirst = simulateAdultLife(
  workingLife.profile,
  workingLife.youth,
  calibration,
  events,
  jobs,
  { seed: "adult-deterministic" },
);
const deterministicSecond = simulateAdultLife(
  workingLife.profile,
  workingLife.youth,
  calibration,
  events,
  jobs,
  { seed: "adult-deterministic" },
);
assert.deepEqual(deterministicFirst, deterministicSecond, "成年人生同一种子必须完全一致");

const counts = {
  totalAge: 0,
  before60: 0,
  age90Plus: 0,
  higherGraduates: 0,
  everPartnered: 0,
  children: 0,
  homePurchases: 0,
  retirements: 0,
  scenarios: 0,
  jobStarts: 0,
  jobIndustries: new Set(),
  archetypes: new Set(),
  eventIds: new Set(),
  totalDecisions: 0,
};

for (let index = 0; index < sampleCount; index += 1) {
  const life = makeYouth(`adult-batch-${index}`, 1978 + (index % 5));
  const adult = simulateAdultLife(
    life.profile,
    life.youth,
    calibration,
    events,
    jobs,
    { seed: `adult-batch-stage-${index}` },
  );
  assertIntegrity(adult);
  counts.totalAge += adult.ending.age;
  if (adult.ending.age < 60) counts.before60 += 1;
  if (adult.ending.age >= 90) counts.age90Plus += 1;
  if (adult.education.highestCompleted === "regular_higher_education") counts.higherGraduates += 1;
  if (adult.family.partner) counts.everPartnered += 1;
  if (adult.family.child) counts.children += 1;
  if (adult.housing.purchaseYear) counts.homePurchases += 1;
  if (adult.employment.retiredYear) counts.retirements += 1;
  if (adult.provenance.scenarioIds.length > 0) counts.scenarios += 1;
  counts.jobStarts += adult.employment.history.length;
  for (const job of adult.employment.history) counts.jobIndustries.add(job.industry);
  counts.archetypes.add(adult.lifeReview.archetypeId);
  for (const decision of adult.decisions) counts.eventIds.add(decision.eventId.split(/_\d{4}_/)[0]);
  counts.totalDecisions += adult.decisions.length;
}

const meanAge = counts.totalAge / sampleCount;
assert.ok(meanAge >= 77.5 && meanAge <= 82.5, `成年条件寿命均值应在校准范围：${meanAge}`);
assert.ok(counts.before60 / sampleCount >= 0.03 && counts.before60 / sampleCount <= 0.14);
assert.ok(counts.age90Plus / sampleCount >= 0.08 && counts.age90Plus / sampleCount <= 0.30);
assert.ok(counts.higherGraduates > sampleCount * 0.03);
assert.ok(counts.everPartnered > sampleCount * 0.45);
assert.ok(counts.children > sampleCount * 0.20 && counts.children < sampleCount * 0.70);
assert.ok(counts.homePurchases > sampleCount * 0.01);
assert.ok(counts.retirements > sampleCount * 0.50);
assert.ok(counts.scenarios > sampleCount * 0.98);
assert.ok(counts.jobStarts / sampleCount >= 2);
assert.ok(counts.jobIndustries.size >= 9);
assert.ok(counts.archetypes.size >= 4);
assert.ok(counts.totalDecisions / sampleCount >= 9);

console.log(JSON.stringify({
  sampleCount,
  meanAgeAtDeath: round(meanAge, 2),
  deathBefore60Share: round(counts.before60 / sampleCount, 4),
  age90PlusShare: round(counts.age90Plus / sampleCount, 4),
  higherGraduates: counts.higherGraduates,
  everPartnered: counts.everPartnered,
  childrenBorn: counts.children,
  homePurchases: counts.homePurchases,
  retirements: counts.retirements,
  meanJobCount: round(counts.jobStarts / sampleCount, 2),
  jobIndustryCount: counts.jobIndustries.size,
  archetypeCount: counts.archetypes.size,
  meanAdultDecisionCount: round(counts.totalDecisions / sampleCount, 2),
}, null, 2));

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
