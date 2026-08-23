import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateBirthProfile } from "../src/simulation/birth-generator.mjs";
import {
  getImmunizationContactProbability,
  simulateChildhood,
} from "../src/simulation/childhood-simulator.mjs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");
const readJson = (...segments) =>
  JSON.parse(fs.readFileSync(path.join(projectRoot, ...segments), "utf8"));
const birthCalibration = readJson("data", "calibration", "birth_1978_1982.json");
const calibration = readJson("data", "calibration", "childhood_1978_1988.json");
const events = readJson("data", "childhood_events.json");
const sampleCount = Number(process.env.CHILDHOOD_CHECK_COUNT ?? 50000);
const forbiddenLabels = ["教育资源：普通", "家庭负担：中等", "收入稳定性", "偏低", "偏高"];

function assertNear(actual, expected, tolerance, message) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message}: actual=${actual}, expected=${expected}, tolerance=${tolerance}`,
  );
}

function assertSimulationIntegrity(simulation) {
  const serialized = JSON.stringify(simulation);
  for (const label of forbiddenLabels) {
    assert.equal(serialized.includes(label), false, `儿童档案不得出现人工社会标签：${label}`);
  }
  for (const record of simulation.annualRecords) {
    const factIds = new Set(record.facts.map((fact) => fact.id));
    assert.equal(record.calendarYear, simulation.birthYear + record.age, "年龄与年份必须连续对应");
    assert.ok(Number.isInteger(record.endState.coResidentSize) && record.endState.coResidentSize >= 3);
    for (const change of record.statChanges) {
      assert.ok(factIds.has(change.sourceFactId), `属性变化必须引用事实：${change.sourceFactId}`);
    }
    const financeFact = record.facts.find((fact) => fact.type === "household_finance_settled");
    assert.ok(financeFact, "每个已推进年份必须有家庭财务结算");
  }
  const latestIncome = simulation.household.members.reduce(
    (sum, member) => sum + member.annualIncomeContributionYuan,
    0,
  );
  assertNear(
    latestIncome,
    simulation.household.finance.annualHouseholdIncomeYuan,
    0.03,
    "家庭成员收入贡献必须与最新家庭账本相符",
  );
  const calibrationAssumptionIds = Object.values(calibration.assumptions).map((entry) => entry.id);
  const eventAssumptionIds = events.events.map((event) => event.assumptionId);
  for (const assumptionId of simulation.provenance.assumptionIds) {
    assert.ok(
      [...calibrationAssumptionIds, ...eventAssumptionIds].includes(assumptionId),
      `儿童阶段假设编号必须可解析：${assumptionId}`,
    );
  }
  for (const sourceId of simulation.provenance.observationSourceIds) {
    assert.ok(calibration.sources.some((source) => source.id === sourceId), `儿童阶段来源必须可解析：${sourceId}`);
  }
}

const deterministicProfile = generateBirthProfile(birthCalibration, {
  seed: "childhood-determinism-birth",
  birthYear: 1980,
});
const deterministicA = simulateChildhood(deterministicProfile, calibration, events, {
  seed: "childhood-determinism",
  mortality: false,
});
const deterministicB = simulateChildhood(deterministicProfile, calibration, events, {
  seed: "childhood-determinism",
  mortality: false,
});
assert.deepEqual(deterministicA, deterministicB, "相同出生档案与儿童阶段种子必须可复现");
assert.equal(deterministicA.status, "completed_stage");
assert.deepEqual(deterministicA.annualRecords.map((record) => record.age), [0, 1, 2, 3, 4, 5, 6]);
assertSimulationIntegrity(deterministicA);

const manualChoice = simulateChildhood(deterministicProfile, calibration, events, {
  seed: "childhood-manual",
  mortality: false,
  choices: {
    age_3_adults_are_busy: "play_with_nearby_children",
    age_5_encounter_symbols: "copy_and_guess",
    age_6_school_preparation: "practice_symbols",
  },
});
assert.deepEqual(
  manualChoice.decisions.map((decision) => decision.chosenOptionId),
  ["play_with_nearby_children", "copy_and_guess", "practice_symbols"],
  "提供的玩家选择必须被执行",
);
assert.ok(manualChoice.decisions.every((decision) => decision.unchosenOptionIds.length === 2));

const awaitingChoice = simulateChildhood(deterministicProfile, calibration, events, {
  seed: "childhood-awaiting",
  mortality: false,
  autoChoose: false,
});
assert.equal(awaitingChoice.status, "awaiting_choice");
assert.equal(awaitingChoice.pendingDecision.eventId, "age_3_adults_are_busy");

let infantDeaths = 0;
let postInfancyExposure = 0;
let postInfancyDeaths = 0;
let siblingBirths = 0;
let eligibleRuralPrimarySurvivors = 0;
let ruralPrimaryResponsibilityAtEnd = 0;
const contactCells = new Map();
const noSiblingAge6IncomeRatios = [];

for (let index = 0; index < sampleCount; index += 1) {
  const profile = generateBirthProfile(birthCalibration, { seed: `childhood-check-birth-${index}` });
  const simulation = simulateChildhood(profile, calibration, events, {
    seed: `childhood-check-run-${index}`,
  });
  assertSimulationIntegrity(simulation);
  const infantRecord = simulation.annualRecords[0];
  if (!infantRecord.facts.find((fact) => fact.type === "child_survival_outcome").survivedYear) {
    infantDeaths += 1;
  }
  for (const record of simulation.annualRecords.filter((entry) => entry.age > 0)) {
    postInfancyExposure += 1;
    const survived = record.facts.find((fact) => fact.type === "child_survival_outcome").survivedYear;
    if (!survived) postInfancyDeaths += 1;
  }
  for (const record of simulation.annualRecords) {
    const eligible = calibration.assumptions.immunizationContact.eligibleAges.includes(record.age);
    if (eligible) {
      const key = `${record.calendarYear}-${simulation.residence}`;
      const cell = contactCells.get(key) ?? { exposure: 0, contacts: 0 };
      cell.exposure += 1;
      if (record.facts.some((fact) => fact.type === "planned_immunization_contact")) cell.contacts += 1;
      contactCells.set(key, cell);
    }
    siblingBirths += record.facts.filter((fact) => fact.type === "younger_sibling_born").length;
  }
  if (simulation.status === "completed_stage" && profile.person.residence === "rural") {
    const father = simulation.household.members.find((member) => member.relation === "father");
    if (profile.household.mainEarnerSector === "primary" && father?.job?.sector === "primary") {
      eligibleRuralPrimarySurvivors += 1;
      if (father.job.employmentForm === "household_responsibility") {
        ruralPrimaryResponsibilityAtEnd += 1;
      }
    }
  }
  if (
    simulation.status === "completed_stage"
    && !simulation.annualRecords.some((record) =>
      record.facts.some((fact) => fact.type === "younger_sibling_born"),
    )
  ) {
    noSiblingAge6IncomeRatios.push(
      simulation.household.finance.annualIncomePerPersonYuan
        / simulation.household.finance.referenceMeanPerPersonYuan,
    );
  }
}

assertNear(
  infantDeaths / sampleCount,
  calibration.observations.infantMortality1981.probability,
  0.0025,
  "婴儿死亡率锚点",
);
assertNear(
  postInfancyDeaths / postInfancyExposure,
  calibration.assumptions.postInfancyMortality.annualProbability,
  0.0007,
  "1至6岁年度死亡概率",
);
assert.ok(siblingBirths > sampleCount * 0.10, "弟妹出生事实应在批量模拟中实际发生");
assert.ok(siblingBirths < sampleCount * 0.60, "弟妹出生频率不得失控");
assert.ok(eligibleRuralPrimarySurvivors > sampleCount * 0.35);
assert.ok(
  ruralPrimaryResponsibilityAtEnd / eligibleRuralPrimarySurvivors > 0.98,
  "到儿童阶段末，符合条件的农村第一产业家庭应接近责任制扩散锚点",
);

for (const [key, cell] of contactCells) {
  if (cell.exposure < 120) continue;
  const [yearText, residence] = key.split("-");
  const expected = getImmunizationContactProbability(calibration, Number(yearText), residence);
  assertNear(cell.contacts / cell.exposure, expected, 0.055, `${key}计划免疫接触概率`);
}

const meanNoSiblingRatio =
  noSiblingAge6IncomeRatios.reduce((sum, value) => sum + value, 0) / noSiblingAge6IncomeRatios.length;
assertNear(meanNoSiblingRatio, 1, 0.06, "无新增弟妹家庭在6岁时的平均相对收入位置");

console.log(
  JSON.stringify(
    {
      ok: true,
      sampleCount,
      infantDeathRate: round(infantDeaths / sampleCount, 5),
      postInfancyAnnualDeathRate: round(postInfancyDeaths / postInfancyExposure, 5),
      siblingBirths,
      ruralResponsibilityShareAtStageEnd: round(
        ruralPrimaryResponsibilityAtEnd / eligibleRuralPrimarySurvivors,
        5,
      ),
      meanNoSiblingAge6IncomeRatio: round(meanNoSiblingRatio, 4),
      checks: [
        "seed_determinism",
        "manual_choices",
        "awaiting_choice",
        "unchosen_branch_memory",
        "year_age_continuity",
        "fact_backed_stat_changes",
        "income_reconciliation",
        "infant_mortality_calibration",
        "post_infancy_mortality_assumption",
        "sibling_birth_bounds",
        "rural_work_transition",
        "immunization_contact_diffusion",
        "income_persistence",
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
