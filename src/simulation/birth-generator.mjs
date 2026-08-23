import {
  clamp,
  createSeededRandom,
  randomInt,
  roundTo,
  standardNormal,
  weightedChoice,
} from "./random.mjs";
import { createBirthCharacterModel } from "./character-attribute-system.mjs";

const SECTORS = ["primary", "secondary", "tertiary"];

const SECTOR_LABELS = {
  primary: "第一产业",
  secondary: "第二产业",
  tertiary: "第三产业",
};

const JOB_DETAILS = {
  primary: [
    { value: ["crop_farming", "种植业劳动者"], weight: 0.72 },
    { value: ["livestock", "畜牧业劳动者"], weight: 0.13 },
    { value: ["forestry", "林业劳动者"], weight: 0.08 },
    { value: ["fishery", "渔业劳动者"], weight: 0.07 },
  ],
  secondary: [
    { value: ["manufacturing_worker", "制造业工人"], weight: 0.62 },
    { value: ["construction_worker", "建筑业工人"], weight: 0.23 },
    { value: ["mining_worker", "采矿业工人"], weight: 0.15 },
  ],
  tertiary: [
    { value: ["commerce_service", "商业与服务业劳动者"], weight: 0.31 },
    { value: ["transport_worker", "交通运输劳动者"], weight: 0.19 },
    { value: ["public_administration", "机关事业单位工作人员"], weight: 0.17 },
    { value: ["education_health", "教育或卫生工作人员"], weight: 0.17 },
    { value: ["other_service", "其他服务业劳动者"], weight: 0.16 },
  ],
};

/**
 * @typedef {Object} BirthGeneratorOptions
 * @property {string | number} [seed]
 * @property {number} [birthYear]
 */

/** @param {number} start @param {number} end @param {number} progress */
function lerp(start, end, progress) {
  return start + (end - start) * progress;
}

/** @param {Record<string, number>} values */
function normalizeShares(values) {
  const cleaned = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, clamp(value, 0, 1)]),
  );
  const total = Object.values(cleaned).reduce((sum, value) => sum + value, 0);
  return Object.fromEntries(Object.entries(cleaned).map(([key, value]) => [key, value / total]));
}

/** @param {any} calibration @param {number} year */
export function getYearObservation(calibration, year) {
  const observation = calibration.observations.yearly.find((entry) => entry.year === year);
  if (!observation) {
    throw new RangeError(`出生年份 ${year} 不在校准范围内`);
  }
  return observation;
}

/** @param {any} calibration @param {any} yearObservation */
function resolveBirthRates(calibration, yearObservation) {
  if (
    Number.isFinite(yearObservation.urbanBirthRatePerThousand) &&
    Number.isFinite(yearObservation.ruralBirthRatePerThousand)
  ) {
    return {
      urban: yearObservation.urbanBirthRatePerThousand,
      rural: yearObservation.ruralBirthRatePerThousand,
      basis: "observed",
    };
  }

  const previous = [...calibration.observations.yearly]
    .reverse()
    .find(
      (entry) =>
        entry.year < yearObservation.year &&
        Number.isFinite(entry.urbanBirthRatePerThousand) &&
        Number.isFinite(entry.ruralBirthRatePerThousand),
    );

  if (!previous) throw new Error("无法为缺项年份估算城乡出生率");

  const ratio = previous.urbanBirthRatePerThousand / previous.ruralBirthRatePerThousand;
  const urbanPopulationShare = yearObservation.urbanPopulationShare;
  const ruralRate =
    yearObservation.birthRatePerThousand /
    (urbanPopulationShare * ratio + (1 - urbanPopulationShare));

  return {
    urban: ruralRate * ratio,
    rural: ruralRate,
    basis: calibration.assumptions.birthResidence1982.id,
  };
}

/** @param {any} calibration @param {number} year */
export function getBirthResidenceShares(calibration, year) {
  const observation = getYearObservation(calibration, year);
  const rates = resolveBirthRates(calibration, observation);
  const urbanBirths = observation.urbanPopulationShare * rates.urban;
  const ruralBirths = (1 - observation.urbanPopulationShare) * rates.rural;
  const total = urbanBirths + ruralBirths;

  return {
    urban: urbanBirths / total,
    rural: ruralBirths / total,
    rates,
  };
}

/** @param {any} calibration @param {number} year */
export function getEmploymentSectorTarget(calibration, year) {
  const anchors = calibration.observations.employmentSectorAnchors;
  const before = [...anchors].reverse().find((entry) => entry.year <= year) ?? anchors[0];
  const after = anchors.find((entry) => entry.year >= year) ?? anchors.at(-1);
  const span = after.year - before.year;
  const progress = span === 0 ? 0 : (year - before.year) / span;

  return normalizeShares(
    Object.fromEntries(
      SECTORS.map((sector) => [sector, lerp(before[sector], after[sector], progress)]),
    ),
  );
}

/** @param {any} calibration @param {number} year */
function getRuralSectorShares(calibration, year) {
  const assumption = calibration.assumptions.parentSectorByResidence;
  const progress = clamp((year - 1978) / 4, 0, 1);
  return normalizeShares(
    Object.fromEntries(
      SECTORS.map((sector) => [
        sector,
        lerp(assumption.rural1978[sector], assumption.rural1982[sector], progress),
      ]),
    ),
  );
}

/** @param {any} calibration @param {number} year @param {"urban" | "rural"} residence */
export function getParentSectorShares(calibration, year, residence) {
  const ruralShares = getRuralSectorShares(calibration, year);
  if (residence === "rural") return ruralShares;

  const target = getEmploymentSectorTarget(calibration, year);
  const urbanPopulationShare = getYearObservation(calibration, year).urbanPopulationShare;
  const ruralPopulationShare = 1 - urbanPopulationShare;

  return normalizeShares(
    Object.fromEntries(
      SECTORS.map((sector) => [
        sector,
        (target[sector] - ruralPopulationShare * ruralShares[sector]) / urbanPopulationShare,
      ]),
    ),
  );
}

/** @param {any} calibration @param {number} year */
export function getExpectedBirthHouseholdSectorShares(calibration, year) {
  const residence = getBirthResidenceShares(calibration, year);
  const urban = getParentSectorShares(calibration, year, "urban");
  const rural = getParentSectorShares(calibration, year, "rural");
  return normalizeShares(
    Object.fromEntries(
      SECTORS.map((sector) => [
        sector,
        residence.urban * urban[sector] + residence.rural * rural[sector],
      ]),
    ),
  );
}

/** @param {() => number} random @param {Record<string, number>} shares */
function chooseFromShares(random, shares) {
  return weightedChoice(
    random,
    Object.entries(shares).map(([value, weight]) => ({ value, weight })),
  );
}

/** @param {() => number} random @param {any} calibration */
function chooseBirthYear(random, calibration) {
  return weightedChoice(
    random,
    calibration.observations.yearly.map((entry) => ({
      value: entry.year,
      weight: entry.population * (entry.birthRatePerThousand / 1000),
    })),
  );
}

/** @param {() => number} random @param {any} calibration */
function chooseHouseholdSize(random, calibration) {
  const distribution = calibration.assumptions.householdSizeDistribution.values;
  return Number(chooseFromShares(random, distribution));
}

/** @param {() => number} random @param {number} referenceMean @param {number} cv */
function sampleIncomePerPerson(random, referenceMean, cv) {
  const sigma = Math.sqrt(Math.log(cv ** 2 + 1));
  const meanCorrection = -(sigma ** 2) / 2;
  return referenceMean * Math.exp(meanCorrection + sigma * standardNormal(random));
}

/**
 * @param {() => number} random
 * @param {any} calibration
 * @param {number} year
 * @param {"urban" | "rural"} residence
 * @param {string} sector
 */
function makeJob(random, calibration, year, residence, sector) {
  const [occupationCode, occupationLabel] = weightedChoice(random, JOB_DETAILS[sector]);
  let unitType;
  let employmentForm;
  const evidence = [
    calibration.assumptions.jobDetails.id,
    calibration.assumptions.parentSectorByResidence.id,
    calibration.observations.employmentSectorAnchors[0].sourceId,
  ];

  if (residence === "rural" && sector === "primary") {
    const adoptionShare = calibration.assumptions.ruralResponsibilityAdoption.sharesByYear[String(year)];
    const householdResponsibility = random() < adoptionShare;
    unitType = householdResponsibility ? "household_operation_on_collective_land" : "people_commune_collective";
    employmentForm = householdResponsibility ? "household_responsibility" : "collective_member_labor";
    evidence.push(
      calibration.assumptions.ruralResponsibilityAdoption.id,
      calibration.observations.ruralHouseholdResponsibility1983.sourceId,
    );
  } else if (residence === "rural") {
    unitType = weightedChoice(random, [
      { value: "commune_or_brigade_enterprise", weight: 0.70 },
      { value: "local_state_or_collective_unit", weight: 0.25 },
      { value: "household_business", weight: 0.05 },
    ]);
    employmentForm = unitType === "household_business" ? "household_self_employment" : "collective_or_unit_work";
  } else {
    unitType = weightedChoice(random, [
      { value: "state_work_unit", weight: 0.72 },
      { value: "urban_collective_unit", weight: 0.278 },
      { value: "nonpublic_business", weight: 0.002 },
    ]);
    employmentForm = unitType === "nonpublic_business" ? "nonpublic_employment" : "unit_employment";
    evidence.push(calibration.observations.urbanPublicOrCollectiveEmploymentShare1978.sourceId);
  }

  const monthRange = sector === "primary" ? [9, 12] : [11, 12];
  return {
    sector,
    sectorLabel: SECTOR_LABELS[sector],
    occupationCode,
    occupationLabel,
    unitType,
    employmentForm,
    workMonthsThisYear: randomInt(random, monthRange[0], monthRange[1]),
    annualIncomeContributionYuan: 0,
    evidence: [...new Set(evidence)],
  };
}

/** @param {() => number} random @param {number} year @param {number} month */
function chooseBirthDay(random, year, month) {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return randomInt(random, 1, days);
}

/** @param {number} index @param {string} relation @param {string} sex @param {number} age */
function makeMember(index, relation, sex, age) {
  return {
    id: `member-${index}`,
    relation,
    sex,
    ageAtBirth: age,
    education: null,
    job: null,
    annualIncomeContributionYuan: 0,
  };
}

/**
 * @param {() => number} random
 * @param {number} householdSize
 * @param {"male" | "female"} playerSex
 * @param {"urban" | "rural"} residence
 * @param {number} maleProbability
 */
function makeHouseholdMembers(random, householdSize, playerSex, residence, maleProbability) {
  const motherAge = 20 + Math.floor(((random() + random()) / 2) * 16);
  const fatherAge = Math.max(20, motherAge + randomInt(random, -1, 7));
  const members = [
    makeMember(1, "self", playerSex, 0),
    makeMember(2, "mother", "female", motherAge),
    makeMember(3, "father", "male", fatherAge),
  ];
  let siblingCount = 0;
  let grandparentCount = 0;

  while (members.length < householdSize) {
    const canAddSibling = siblingCount < 3 && motherAge >= 18 + siblingCount * 2;
    const siblingProbability = residence === "rural" ? 0.64 : 0.50;
    const addSibling = canAddSibling && (grandparentCount >= 2 || random() < siblingProbability);

    if (addSibling) {
      const maxAge = Math.max(1, Math.min(12, motherAge - 17));
      members.push(
        makeMember(
          members.length + 1,
          "older_sibling",
          random() < maleProbability ? "male" : "female",
          randomInt(random, 1, maxAge),
        ),
      );
      siblingCount += 1;
    } else {
      const grandparentRoles = [
        ["maternal_grandmother", "female", motherAge],
        ["paternal_grandmother", "female", fatherAge],
        ["maternal_grandfather", "male", motherAge],
        ["paternal_grandfather", "male", fatherAge],
      ];
      const [relation, sex, childAge] = grandparentRoles[grandparentCount % grandparentRoles.length];
      members.push(
        makeMember(members.length + 1, relation, sex, childAge + randomInt(random, 20, 33)),
      );
      grandparentCount += 1;
    }
  }

  return members;
}

/**
 * @param {() => number} random
 * @param {any} calibration
 * @param {number} year
 * @param {"urban" | "rural"} residence
 * @param {any[]} members
 */
function assignJobs(random, calibration, year, residence, members) {
  const sectorShares = getParentSectorShares(calibration, year, residence);
  const mainSector = chooseFromShares(random, sectorShares);

  for (const member of members) {
    if (member.relation === "self" || member.relation === "older_sibling") continue;

    let economicallyActive = member.relation === "mother" || member.relation === "father";
    if (member.relation.includes("grand")) {
      const ageLimit = residence === "rural" ? 70 : 62;
      economicallyActive = member.ageAtBirth <= ageLimit && random() < (residence === "rural" ? 0.72 : 0.52);
    }
    if (!economicallyActive) continue;

    const useMainSector = member.relation === "father" || random() < (residence === "rural" ? 0.78 : 0.62);
    const sector = useMainSector ? mainSector : chooseFromShares(random, sectorShares);
    member.job = makeJob(random, calibration, year, residence, sector);
  }

  return mainSector;
}

/** @param {() => number} random @param {any[]} members @param {number} householdIncome */
function allocateIncome(random, members, householdIncome) {
  const earners = members.filter((member) => member.job);
  const weights = earners.map((member) => member.job.workMonthsThisYear * (0.8 + random() * 0.4));
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  let allocated = 0;

  earners.forEach((member, index) => {
    const contribution =
      index === earners.length - 1
        ? roundTo(householdIncome - allocated, 2)
        : roundTo((householdIncome * weights[index]) / weightTotal, 2);
    member.annualIncomeContributionYuan = contribution;
    member.job.annualIncomeContributionYuan = contribution;
    allocated += contribution;
  });
}

/** @param {() => number} random @param {any} calibration @param {"urban" | "rural"} residence */
function makeHousing(random, calibration, residence) {
  if (residence === "urban") {
    const observed = calibration.observations.urbanHousing1984;
    const tenure = weightedChoice(random, [
      { value: "public_rental", weight: observed.publicRentalShare },
      { value: "owner_occupied_private", weight: observed.ownerOccupiedShare },
      { value: "other_or_borrowed", weight: observed.otherShare },
    ]);
    return {
      tenure,
      provider: tenure === "public_rental" ? "work_unit_or_public_housing" : null,
      floorAreaSquareMeters: null,
      annualHousingCostYuan: null,
      evidence: [observed.sourceId, calibration.assumptions.housing.id],
    };
  }

  const familyHousingShare = calibration.assumptions.housing.ruralFamilyHousingShare;
  return {
    tenure: random() < familyHousingShare ? "family_house_on_collective_land" : "collective_or_borrowed_housing",
    provider: null,
    floorAreaSquareMeters: null,
    annualHousingCostYuan: null,
    evidence: [calibration.assumptions.housing.id],
  };
}

/** @param {number} value */
function score(value) {
  return Math.round(clamp(value, 0, 100));
}

/** @param {number} incomePerPerson @param {number} referenceMean */
function makeVisibleStats(incomePerPerson, referenceMean, birthHealth) {
  return {
    health: {
      value: birthHealth.reserveScore,
      basis: `依据1981年婴儿死亡率37.6‰校准的出生期健康基础；不是临床评分或诊断`,
      status: "calibrated_game_state",
    },
    wealth: {
      value: score(50 + 20 * Math.log(incomePerPerson / referenceMean)),
      basis: "同出生年份、同城乡口径的家庭人均收入相对值",
      status: "derived",
    },
    mood: { value: 50, basis: "出生时尚无个人经历", status: "neutral_baseline" },
    ability: { value: 0, basis: "教育、技能和经验尚未开始积累", status: "fact_based" },
    relationships: { value: 50, basis: "关系质量尚未通过互动形成", status: "neutral_baseline" },
  };
}

function makeBirthHealth(random, calibration) {
  const model = calibration.assumptions.birthHealthReserve;
  const category = weightedChoice(
    random,
    model.categories.map((entry) => ({ value: entry, weight: entry.share })),
  );
  const reserveScore = randomInt(random, category.scoreMin, category.scoreMax);
  const anchor = calibration.observations.infantMortality1981;
  return {
    reserveScore,
    categoryId: category.id,
    modeledInfantMortalityProbability: roundTo(
      anchor.probability * category.infantMortalityRiskMultiplier,
      6,
    ),
    riskMultiplier: category.infantMortalityRiskMultiplier,
    populationCalibrationProbability: anchor.probability,
    calibrationSourceId: anchor.sourceId,
    medicalDiagnosis: null,
    interpretation: "游戏中的出生期健康基础，不是阿普加评分、诊断或个体医学预测。",
  };
}

const RESIDENCE_LABELS = { urban: "城镇", rural: "乡村" };
const HOUSING_LABELS = {
  public_rental: "单位或公有住房承租",
  owner_occupied_private: "家庭自有城镇住房",
  other_or_borrowed: "其他或借住住房",
  family_house_on_collective_land: "集体土地上的家庭住房",
  collective_or_borrowed_housing: "集体安排或借住住房",
};

/** @param {any} profile */
function makeIntro(profile) {
  const { person, household } = profile;
  const mother = household.members.find((member) => member.relation === "mother");
  const father = household.members.find((member) => member.relation === "father");
  const measureLabel = household.finance.incomeMeasureType === "urban_disposable_income" ? "可支配收入" : "纯收入";
  return `${person.birthDate}，你出生在中国大陆的一户${RESIDENCE_LABELS[person.residence]}家庭。出生时共同居住${household.coResidentSizeAtBirth}人。父亲的工作是${father.job.occupationLabel}，母亲的工作是${mother.job.occupationLabel}。家庭当年模拟人均${measureLabel}${household.finance.annualIncomePerPersonYuan}元，住房事实为“${HOUSING_LABELS[household.housing.tenure]}”。`;
}

/**
 * 生成一份可回放、可追溯的出生档案。
 * @param {any} calibration
 * @param {BirthGeneratorOptions} [options]
 */
export function generateBirthProfile(calibration, options = {}) {
  const seed = options.seed ?? "people-life-default-seed";
  const random = createSeededRandom(seed);
  const birthYear = options.birthYear ?? chooseBirthYear(random, calibration);
  const yearObservation = getYearObservation(calibration, birthYear);
  const birthResidenceShares = getBirthResidenceShares(calibration, birthYear);
  const residence = random() < birthResidenceShares.urban ? "urban" : "rural";
  const sexRatio = calibration.observations.birthSexRatio1982.value;
  const maleProbability = sexRatio / (100 + sexRatio);
  const sex = random() < maleProbability ? "male" : "female";
  const month = randomInt(random, 1, 12);
  const day = chooseBirthDay(random, birthYear, month);
  const householdSize = chooseHouseholdSize(random, calibration);
  const members = makeHouseholdMembers(random, householdSize, sex, residence, maleProbability);
  const mainEarnerSector = assignJobs(random, calibration, birthYear, residence, members);
  const referenceMean =
    residence === "urban"
      ? yearObservation.urbanIncomePerPersonYuan
      : yearObservation.ruralIncomePerPersonYuan;
  const cv =
    residence === "urban"
      ? calibration.assumptions.incomeDistribution.urbanCoefficientOfVariation
      : calibration.assumptions.incomeDistribution.ruralCoefficientOfVariation;
  const incomePerPerson = roundTo(sampleIncomePerPerson(random, referenceMean, cv), 2);
  const householdIncome = roundTo(incomePerPerson * householdSize, 2);
  allocateIncome(random, members, householdIncome);
  const housing = makeHousing(random, calibration, residence);
  const birthHealth = makeBirthHealth(random, calibration);
  const characterModel = createBirthCharacterModel({
    random: createSeededRandom(`${seed}:character-model`),
    birthHealth,
  });

  const profile = {
    schemaVersion: 1,
    seed: String(seed),
    person: {
      id: `person-${birthYear}-${Math.floor(random() * 0xffffffff).toString(16).padStart(8, "0")}`,
      birthDate: `${birthYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      birthYear,
      sex,
      country: calibration.scope.country,
      residence,
      province: null,
      locality: null,
      hukouCategory: null,
      healthAtBirth: birthHealth,
    },
    household: {
      id: `household-${birthYear}-${Math.floor(random() * 0xffffffff).toString(16).padStart(8, "0")}`,
      coResidentSizeAtBirth: householdSize,
      members,
      mainEarnerSector,
      housing,
      finance: {
        year: birthYear,
        currency: calibration.scope.currency,
        priceBasis: calibration.scope.priceBasis,
        incomeMeasureType: residence === "urban" ? "urban_disposable_income" : "rural_net_income",
        annualHouseholdIncomeYuan: householdIncome,
        annualIncomePerPersonYuan: incomePerPerson,
        referenceMeanPerPersonYuan: referenceMean,
        foodExpenditureShareReference:
          residence === "urban"
            ? yearObservation.urbanEngelCoefficient
            : yearObservation.ruralEngelCoefficient,
        cashSavingsYuan: null,
        debtYuan: null,
      },
    },
    visibleStats: makeVisibleStats(incomePerPerson, referenceMean, birthHealth),
    characterModel,
    provenance: {
      observationSourceIds: [
        ...new Set([
          ...yearObservation.sourceIds,
          calibration.observations.birthSexRatio1982.sourceId,
          calibration.observations.infantMortality1981.sourceId,
          calibration.observations.householdMeanSize1982.sourceId,
          ...members.flatMap((member) => member.job?.evidence ?? []).filter((id) => !id.startsWith("A")),
          ...housing.evidence.filter((id) => !id.startsWith("A")),
        ]),
      ],
      assumptionIds: [
        ...new Set([
        ...(birthYear === 1982 ? [] : [calibration.assumptions.birthSexRatioProxy.id]),
        ...(birthResidenceShares.rates.basis === "observed" ? [] : [birthResidenceShares.rates.basis]),
        calibration.assumptions.householdSizeDistribution.id,
        calibration.assumptions.parentAges.id,
        calibration.assumptions.incomeDistribution.id,
        calibration.assumptions.parentSectorByResidence.id,
        calibration.assumptions.jobDetails.id,
        calibration.assumptions.housing.id,
        calibration.assumptions.householdComposition.id,
        calibration.assumptions.initialVisibleStats.id,
        calibration.assumptions.birthDateWithinYear.id,
        calibration.assumptions.birthHealthReserve.id,
        ...members.flatMap((member) => member.job?.evidence ?? []).filter((id) => id.startsWith("A")),
        ]),
      ],
      unresolvedFields: [
        "person.province",
        "person.locality",
        "person.hukouCategory",
        "household.members[*].education",
        "household.housing.floorAreaSquareMeters",
        "household.housing.annualHousingCostYuan",
        "household.finance.cashSavingsYuan",
        "household.finance.debtYuan"
      ],
    },
  };

  profile.introduction = makeIntro(profile);
  return profile;
}
