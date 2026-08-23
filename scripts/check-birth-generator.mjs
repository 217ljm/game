import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  generateBirthProfile,
  getBirthResidenceShares,
  getExpectedBirthHouseholdSectorShares,
} from "../src/simulation/birth-generator.mjs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");
const calibration = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "data", "calibration", "birth_1978_1982.json"), "utf8"),
);
const sampleCount = Number(process.env.BIRTH_CHECK_COUNT ?? 100000);
const forbiddenAbstractLabels = ["教育资源：普通", "家庭负担：中等", "收入稳定性", "偏低", "偏高"];

function assertNear(actual, expected, tolerance, message) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message}: actual=${actual}, expected=${expected}, tolerance=${tolerance}`,
  );
}

const deterministicA = generateBirthProfile(calibration, { seed: "deterministic", birthYear: 1980 });
const deterministicB = generateBirthProfile(calibration, { seed: "deterministic", birthYear: 1980 });
assert.deepEqual(deterministicA, deterministicB, "同一种子必须生成相同档案");
assert.throws(
  () => generateBirthProfile(calibration, { seed: "invalid", birthYear: 1977 }),
  RangeError,
  "范围外年份必须被拒绝",
);

const yearCounts = new Map();
const yearResidenceCounts = new Map();
const yearSectorCounts = new Map();
const incomeCells = new Map();
const housingCounts = new Map();
let maleCount = 0;
let householdSizeTotal = 0;
let birthHealthScoreTotal = 0;
let infantRiskTotal = 0;
const birthHealthCategoryCounts = new Map();

for (let index = 0; index < sampleCount; index += 1) {
  const profile = generateBirthProfile(calibration, { seed: `validation-${index}` });
  const serialized = JSON.stringify(profile);
  for (const label of forbiddenAbstractLabels) {
    assert.equal(serialized.includes(label), false, `档案中不得出现人工社会标签：${label}`);
  }

  assert.equal(profile.household.members.length, profile.household.coResidentSizeAtBirth);
  const allocatedIncome = profile.household.members.reduce(
    (sum, member) => sum + member.annualIncomeContributionYuan,
    0,
  );
  assertNear(
    allocatedIncome,
    profile.household.finance.annualHouseholdIncomeYuan,
    0.02,
    "成员收入贡献必须与家庭收入核对",
  );
  assert.ok(profile.provenance.assumptionIds.length > 0, "档案必须保留假设来源");
  assert.ok(profile.provenance.unresolvedFields.length > 0, "未校准字段必须明确列出");
  const birthHealth = profile.person.healthAtBirth;
  assert.ok(birthHealth.reserveScore >= 52 && birthHealth.reserveScore <= 94);
  assert.equal(profile.visibleStats.health.value, birthHealth.reserveScore);
  assert.equal(profile.visibleStats.health.status, "calibrated_game_state");
  assert.ok(profile.visibleStats.health.basis.includes("不是临床评分"));
  assert.ok(Number.isFinite(birthHealth.modeledInfantMortalityProbability));
  assert.equal(profile.characterModel.version, 1);
  assert.equal(profile.characterModel.attributes.health, birthHealth.reserveScore);
  assert.ok(profile.characterModel.attributes.fitness >= 1 && profile.characterModel.attributes.fitness <= 4);
  assert.ok(profile.characterModel.attributes.intelligence >= 1 && profile.characterModel.attributes.intelligence <= 3);
  assert.ok(profile.characterModel.attributes.appearance >= 30 && profile.characterModel.attributes.appearance <= 70);
  assert.ok(profile.characterModel.attributes.social >= 0 && profile.characterModel.attributes.social <= 2);
  assert.ok(profile.characterModel.attributes.willpower >= 1 && profile.characterModel.attributes.willpower <= 4);
  birthHealthScoreTotal += birthHealth.reserveScore;
  infantRiskTotal += birthHealth.modeledInfantMortalityProbability;
  birthHealthCategoryCounts.set(
    birthHealth.categoryId,
    (birthHealthCategoryCounts.get(birthHealth.categoryId) ?? 0) + 1,
  );
  for (const sourceId of profile.provenance.observationSourceIds) {
    assert.ok(calibration.sources.some((source) => source.id === sourceId), `来源编号必须存在：${sourceId}`);
  }
  for (const assumptionId of profile.provenance.assumptionIds) {
    assert.ok(
      Object.values(calibration.assumptions).some((assumption) => assumption.id === assumptionId),
      `假设编号必须存在：${assumptionId}`,
    );
  }

  const year = profile.person.birthYear;
  const residence = profile.person.residence;
  const sector = profile.household.mainEarnerSector;
  const residenceKey = `${year}-${residence}`;
  const sectorKey = `${year}-${sector}`;
  yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1);
  yearResidenceCounts.set(residenceKey, (yearResidenceCounts.get(residenceKey) ?? 0) + 1);
  yearSectorCounts.set(sectorKey, (yearSectorCounts.get(sectorKey) ?? 0) + 1);
  householdSizeTotal += profile.household.coResidentSizeAtBirth;
  if (profile.person.sex === "male") maleCount += 1;

  const incomeCell = incomeCells.get(residenceKey) ?? { count: 0, sum: 0 };
  incomeCell.count += 1;
  incomeCell.sum += profile.household.finance.annualIncomePerPersonYuan;
  incomeCells.set(residenceKey, incomeCell);

  if (residence === "urban") {
    const tenure = profile.household.housing.tenure;
    housingCounts.set(tenure, (housingCounts.get(tenure) ?? 0) + 1);
  }
}

const yearWeights = calibration.observations.yearly.map((entry) => ({
  year: entry.year,
  weight: entry.population * entry.birthRatePerThousand,
}));
const totalYearWeight = yearWeights.reduce((sum, entry) => sum + entry.weight, 0);

for (const { year, weight } of yearWeights) {
  const yearCount = yearCounts.get(year) ?? 0;
  assertNear(yearCount / sampleCount, weight / totalYearWeight, 0.006, `${year}年出生权重`);

  const residenceExpected = getBirthResidenceShares(calibration, year);
  const urbanCount = yearResidenceCounts.get(`${year}-urban`) ?? 0;
  assertNear(urbanCount / yearCount, residenceExpected.urban, 0.015, `${year}年城镇出生占比`);

  const expectedSectors = getExpectedBirthHouseholdSectorShares(calibration, year);
  for (const sector of ["primary", "secondary", "tertiary"]) {
    const sectorCount = yearSectorCounts.get(`${year}-${sector}`) ?? 0;
    assertNear(sectorCount / yearCount, expectedSectors[sector], 0.016, `${year}年出生家庭主行业-${sector}`);
  }

  const observation = calibration.observations.yearly.find((entry) => entry.year === year);
  for (const residence of ["urban", "rural"]) {
    const cell = incomeCells.get(`${year}-${residence}`);
    const expectedIncome =
      residence === "urban" ? observation.urbanIncomePerPersonYuan : observation.ruralIncomePerPersonYuan;
    assertNear(cell.sum / cell.count, expectedIncome, expectedIncome * 0.025, `${year}年${residence}人均收入`);
  }
}

const expectedHouseholdMean = Object.entries(
  calibration.assumptions.householdSizeDistribution.values,
).reduce((sum, [size, share]) => sum + Number(size) * share, 0);
assertNear(householdSizeTotal / sampleCount, expectedHouseholdMean, 0.025, "共同居住人数均值");

const sexRatio = calibration.observations.birthSexRatio1982.value;
assertNear(maleCount / sampleCount, sexRatio / (100 + sexRatio), 0.006, "男性出生占比");
const birthHealthModel = calibration.assumptions.birthHealthReserve;
for (const category of birthHealthModel.categories) {
  assertNear(
    (birthHealthCategoryCounts.get(category.id) ?? 0) / sampleCount,
    category.share,
    0.008,
    `出生健康储备类别-${category.id}`,
  );
}
assert.ok(
  birthHealthScoreTotal / sampleCount >= 79 && birthHealthScoreTotal / sampleCount <= 84,
  "健康出生队列不应被显示成只有一半健康",
);
assertNear(
  infantRiskTotal / sampleCount,
  calibration.observations.infantMortality1981.probability,
  0.0015,
  "个体风险分层后的总体婴儿死亡率锚点",
);

const urbanHouseholdCount = [...housingCounts.values()].reduce((sum, value) => sum + value, 0);
const observedHousing = calibration.observations.urbanHousing1984;
assertNear(
  (housingCounts.get("public_rental") ?? 0) / urbanHouseholdCount,
  observedHousing.publicRentalShare,
  0.012,
  "城镇公房承租占比",
);
assertNear(
  (housingCounts.get("owner_occupied_private") ?? 0) / urbanHouseholdCount,
  observedHousing.ownerOccupiedShare,
  0.01,
  "城镇自有住房占比",
);

console.log(
  JSON.stringify(
    {
      ok: true,
      sampleCount,
      checks: [
        "seed_determinism",
        "year_weight",
        "birth_residence",
        "birth_household_sector",
        "income_mean",
        "household_size",
        "birth_sex_ratio",
        "calibrated_birth_health_reserve_distribution",
        "birth_health_visible_score_not_half_health",
        "absolute_lifetime_character_attributes",
        "stratified_infant_risk_reconciles_to_population_anchor",
        "urban_housing",
        "income_reconciliation",
        "no_abstract_social_labels",
        "provenance_present",
        "provenance_ids_resolve"
      ]
    },
    null,
    2,
  ),
);
