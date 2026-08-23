import {
  clamp,
  createSeededRandom,
  randomInt,
  roundTo,
  standardNormal,
  weightedChoice,
} from "./random.mjs";
import { handleAnnualOperation, handleYearReview } from "./annual-operation-system.mjs";
import { updateSocialCharacters } from "./social-character-system.mjs";

const STAT_KEYS = ["health", "wealth", "mood", "ability", "relationships"];

/** @param {unknown} value */
function clone(value) {
  return structuredClone(value);
}

/** @param {number} value */
function score(value) {
  return Math.round(clamp(value, 0, 100));
}

/** @param {any} calibration @param {number} year */
export function getChildhoodYearReference(calibration, year) {
  const reference = calibration.observations.yearlyHouseholdReferences.find(
    (entry) => entry.year === year,
  );
  if (!reference) throw new RangeError(`儿童阶段缺少 ${year} 年家庭统计参考`);
  return reference;
}

/** @param {any} calibration @param {number} year */
export function getPrimaryEnrollmentReference(calibration, year) {
  const anchors = calibration.observations.primarySchoolEnrollmentAnchors;
  const before = [...anchors].reverse().find((entry) => entry.year <= year) ?? anchors[0];
  const after = anchors.find((entry) => entry.year >= year) ?? anchors.at(-1);
  if (before.year === after.year) return before.rate;
  const progress = (year - before.year) / (after.year - before.year);
  return before.rate + (after.rate - before.rate) * progress;
}

/** @param {any} calibration @param {number} year @param {"urban" | "rural"} residence */
export function getImmunizationContactProbability(calibration, year, residence) {
  const proxy = calibration.assumptions.immunizationContact.coverageProxy;
  const startYear = Number(Object.keys(proxy).at(0));
  const endYear = Number(Object.keys(proxy).at(-1));
  const progress = clamp((year - startYear) / (endYear - startYear), 0, 1);
  return proxy[String(startYear)][residence]
    + (proxy[String(endYear)][residence] - proxy[String(startYear)][residence]) * progress;
}

/** @param {() => number} random @param {number} lambda */
function poisson(random, lambda) {
  const limit = Math.exp(-lambda);
  let product = 1;
  let count = 0;
  do {
    count += 1;
    product *= random();
  } while (product > limit);
  return count - 1;
}

/** @param {any} record @param {string} type @param {Record<string, unknown>} data */
function addFact(record, type, data) {
  const fact = {
    id: `${record.calendarYear}-age-${record.age}-${type}-${record.facts.length + 1}`,
    type,
    ...data,
  };
  record.facts.push(fact);
  return fact;
}

/**
 * @param {any} state
 * @param {any} record
 * @param {string} stat
 * @param {number} nextValue
 * @param {string} sourceFactId
 * @param {string} reason
 */
function setStat(state, record, stat, nextValue, sourceFactId, reason) {
  if (!STAT_KEYS.includes(stat)) throw new Error(`未知属性：${stat}`);
  const entry = state.visibleStats[stat];
  const before = entry.value;
  const after = score(nextValue);
  if (before === after) return;
  entry.value = after;
  entry.basis = reason;
  entry.status = "derived_from_childhood_fact";
  record.statChanges.push({ stat, before, after, delta: after - before, sourceFactId, reason });
}

/**
 * @param {any} state
 * @param {any} record
 * @param {string} stat
 * @param {number} delta
 * @param {string} sourceFactId
 * @param {string} reason
 */
function changeStat(state, record, stat, delta, sourceFactId, reason) {
  setStat(state, record, stat, state.visibleStats[stat].value + delta, sourceFactId, reason);
}

/** @param {any} state @param {number} year */
function updateMemberAges(state, year) {
  for (const member of state.household.members) {
    if (!Number.isInteger(member.birthYear)) {
      member.birthYear = state.birthYear - member.ageAtBirth;
    }
    member.currentAge = Math.max(0, year - member.birthYear);
    member.joinedHouseholdYear ??= state.birthYear;
  }
}

/** @param {any} state @param {any} calibration @param {number} year @param {() => number} random @param {any} record */
function maybeTransitionRuralWork(state, calibration, year, random, record) {
  if (state.residence !== "rural" || year <= state.birthYear) return;
  const shares = calibration.assumptions.ruralResponsibilityDiffusion.sharesByYear;
  const currentTarget = shares[String(year)];
  const previousTarget = shares[String(year - 1)] ?? 0;
  if (!Number.isFinite(currentTarget) || currentTarget <= previousTarget) return;

  const eligibleJobs = state.household.members
    .filter((member) => member.job?.sector === "primary")
    .map((member) => member.job)
    .filter((job) => job.employmentForm !== "household_responsibility");
  if (eligibleJobs.length === 0) return;

  state.usedAssumptionIds.add(calibration.assumptions.ruralResponsibilityDiffusion.id);
  if (year === 1983) {
    state.usedObservationSourceIds.add(
      calibration.observations.ruralHouseholdResponsibility1983.sourceId,
    );
  }
  const conditionalProbability = clamp(
    (currentTarget - previousTarget) / Math.max(0.0001, 1 - previousTarget),
    0,
    1,
  );
  if (random() >= conditionalProbability) return;

  for (const job of eligibleJobs) {
    job.unitType = "household_operation_on_collective_land";
    job.employmentForm = "household_responsibility";
  }
  addFact(record, "rural_work_form_changed", {
    memberCountAffected: eligibleJobs.length,
    from: "people_commune_or_collective_labor",
    to: "household_responsibility_on_collective_land",
    calibrationTargetShare: currentTarget,
  });
}

/** @param {number} age */
function motherAgeMultiplier(age) {
  if (age < 20) return 0.35;
  if (age <= 24) return 1.10;
  if (age <= 29) return 1.15;
  if (age <= 34) return 0.90;
  if (age <= 39) return 0.55;
  if (age <= 44) return 0.15;
  return 0;
}

/** @param {any} state @param {any} calibration @param {number} year @param {number} age @param {() => number} random @param {any} record */
function maybeAddSibling(state, calibration, year, age, random, record) {
  if (age === 0) return;
  const assumption = calibration.assumptions.siblingBirth;
  state.usedAssumptionIds.add(assumption.id);
  state.usedObservationSourceIds.add(calibration.observations.generalFertility1981.sourceId);
  if (state.household.members.length >= assumption.maximumCoResidents) return;

  const mother = state.household.members.find((member) => member.relation === "mother");
  if (!mother) return;
  const children = state.household.members.filter((member) =>
    ["self", "older_sibling", "younger_sibling"].includes(member.relation),
  ).length;
  const residenceMultiplier =
    state.residence === "urban" ? assumption.urbanMultiplier : assumption.ruralMultiplier;
  const childCountMultiplier = Math.max(0.35, 1 - Math.max(0, children - 1) * 0.18);
  const probability = clamp(
    calibration.observations.generalFertility1981.probability
      * motherAgeMultiplier(mother.currentAge)
      * residenceMultiplier
      * childCountMultiplier,
    0,
    0.20,
  );
  if (random() >= probability) return;

  const ratio = calibration.assumptions.siblingSexRatio.maleBirthsPer100FemaleBirths;
  const siblingSex = random() < ratio / (100 + ratio) ? "male" : "female";
  const sibling = {
    id: `member-${state.household.members.length + 1}-${year}`,
    relation: "younger_sibling",
    sex: siblingSex,
    ageAtBirth: -age,
    birthYear: year,
    joinedHouseholdYear: year,
    currentAge: 0,
    education: null,
    job: null,
    annualIncomeContributionYuan: 0,
  };
  state.household.members.push(sibling);
  state.household.coResidentSize = state.household.members.length;
  state.usedAssumptionIds.add(calibration.assumptions.siblingSexRatio.id);
  addFact(record, "younger_sibling_born", {
    memberId: sibling.id,
    sex: sibling.sex,
    motherAge: mother.currentAge,
    modeledAnnualProbability: roundTo(probability, 5),
  });
}

/** @param {any} state @param {any} calibration @param {number} year @param {number} age @param {() => number} random @param {any} record */
function maybeRecordImmunizationContact(state, calibration, year, age, random, record) {
  const observation = calibration.observations.immunizationProgram;
  if (
    year < observation.nationalStartYear
    || !calibration.assumptions.immunizationContact.eligibleAges.includes(age)
  ) return;

  state.usedAssumptionIds.add(calibration.assumptions.immunizationContact.id);
  for (const sourceId of observation.sourceIds) state.usedObservationSourceIds.add(sourceId);
  const probability = getImmunizationContactProbability(calibration, year, state.residence);
  if (random() >= probability) return;

  state.cumulativeFacts.immunizationContactCount += 1;
  addFact(record, "planned_immunization_contact", {
    contactNumber: state.cumulativeFacts.immunizationContactCount,
    programActiveSince: observation.nationalStartYear,
    modeledContactProbability: roundTo(probability, 4),
    note: "记录为接种服务接触，不推断具体疫苗剂次或完整免疫状态。",
  });
}

/** @param {any} state @param {any} calibration @param {number} age @param {() => number} random @param {any} record */
function simulateChildIllness(state, calibration, age, random, record) {
  const illnessAssumption = calibration.assumptions.childIllnessEpisodes;
  state.usedAssumptionIds.add(illnessAssumption.id);
  const episodeCount = poisson(random, illnessAssumption.meanEpisodesByAge[String(age)]);
  const contactMultiplier =
    state.cumulativeFacts.immunizationContactCount > 0
      ? calibration.assumptions.immunizationContact.severeIllnessRiskMultiplierAfterContact
      : 1;
  let severeEpisodeCount = 0;
  let symptomDays = 0;

  for (let index = 0; index < episodeCount; index += 1) {
    const severe = random() < illnessAssumption.baseSevereEpisodeProbability * contactMultiplier;
    if (severe) severeEpisodeCount += 1;
    symptomDays += randomInt(random, 2, 8) + (severe ? randomInt(random, 4, 10) : 0);
  }
  const caregiverWorkDaysLost = Math.min(30, Math.ceil(symptomDays * 0.55));
  const fact = addFact(record, "child_illness_year_summary", {
    episodeCount,
    severeEpisodeCount,
    symptomDays,
    caregiverWorkDaysLost,
    diagnosis: null,
  });
  return { episodeCount, severeEpisodeCount, symptomDays, caregiverWorkDaysLost, fact };
}

/** @param {any} state @param {number} caregiverWorkDaysLost */
function updateWorkMonthsAndCare(state, caregiverWorkDaysLost, random) {
  const earners = state.household.members.filter((member) => member.job);
  for (const member of earners) {
    const range = member.job.sector === "primary" ? [9, 12] : [11, 12];
    member.job.workMonthsThisYear = randomInt(random, range[0], range[1]);
    member.job.caregiverWorkDaysLost = 0;
  }
  if (caregiverWorkDaysLost <= 0) return;

  const mother = earners.find((member) => member.relation === "mother");
  const father = earners.find((member) => member.relation === "father");
  const caregiver = mother ?? father ?? earners[0];
  if (caregiver) caregiver.job.caregiverWorkDaysLost = caregiverWorkDaysLost;
}

/** @param {any} state @param {number} householdIncome */
function allocateHouseholdIncome(state, householdIncome, random) {
  const earners = state.household.members.filter((member) => member.job);
  const weights = earners.map((member) => {
    const careFactor = 1 - (member.job.caregiverWorkDaysLost ?? 0) / 300;
    return member.job.workMonthsThisYear * Math.max(0.70, careFactor) * (0.9 + random() * 0.2);
  });
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  let allocated = 0;

  for (const member of state.household.members) {
    member.annualIncomeContributionYuan = 0;
    if (member.job) member.job.annualIncomeContributionYuan = 0;
  }
  earners.forEach((member, index) => {
    const amount = index === earners.length - 1
      ? roundTo(householdIncome - allocated, 2)
      : roundTo((householdIncome * weights[index]) / totalWeight, 2);
    member.annualIncomeContributionYuan = amount;
    member.job.annualIncomeContributionYuan = amount;
    allocated += amount;
  });
}

/** @param {any} state @param {any} calibration @param {any} reference @param {number} age @param {() => number} random @param {number} caregiverWorkDaysLost @param {any} record */
function settleHouseholdFinance(state, calibration, reference, age, random, caregiverWorkDaysLost, record) {
  state.usedAssumptionIds.add(calibration.assumptions.incomePersistence.id);
  state.usedAssumptionIds.add(calibration.assumptions.workMonthVariation.id);
  state.usedAssumptionIds.add(calibration.assumptions.caregiverWorkLoss.id);
  state.usedObservationSourceIds.add(reference.sourceId);
  updateWorkMonthsAndCare(state, caregiverWorkDaysLost, random);

  const referenceIncome = state.residence === "urban"
    ? reference.urbanIncomePerPersonYuan
    : reference.ruralIncomePerPersonYuan;
  const engelCoefficient = state.residence === "urban"
    ? reference.urbanEngelCoefficient
    : reference.ruralEngelCoefficient;
  let annualHouseholdIncome;

  if (age === 0) {
    annualHouseholdIncome = state.household.finance.annualHouseholdIncomeYuan;
  } else {
    const sigma = calibration.assumptions.incomePersistence.annualShockSigma[state.residence];
    const meanOneShock = Math.exp(-0.5 * sigma ** 2 + sigma * standardNormal(random));
    annualHouseholdIncome = roundTo(
      referenceIncome
        * state.birthCoResidentSize
        * state.birthIncomeRelativeToReference
        * meanOneShock,
      2,
    );
  }
  const incomePerPerson = roundTo(
    annualHouseholdIncome / state.household.members.length,
    2,
  );
  allocateHouseholdIncome(state, annualHouseholdIncome, random);
  state.household.coResidentSize = state.household.members.length;
  state.household.finance = {
    year: reference.year,
    currency: calibration.scope.currency,
    priceBasis: calibration.scope.priceBasis,
    incomeMeasureType: state.residence === "urban" ? "urban_disposable_income" : "rural_net_income",
    annualHouseholdIncomeYuan: annualHouseholdIncome,
    annualIncomePerPersonYuan: incomePerPerson,
    referenceMeanPerPersonYuan: referenceIncome,
    foodExpenditureShareReference: engelCoefficient,
    cashSavingsYuan: null,
    debtYuan: null,
  };
  return addFact(record, "household_finance_settled", {
    coResidentSize: state.household.members.length,
    annualHouseholdIncomeYuan: annualHouseholdIncome,
    annualIncomePerPersonYuan: incomePerPerson,
    referenceMeanPerPersonYuan: referenceIncome,
    incomeRelativeToReference: roundTo(incomePerPerson / referenceIncome, 4),
    incomeMeasureType: state.household.finance.incomeMeasureType,
    foodExpenditureShareReference: engelCoefficient,
  });
}

/** @param {any} state @param {any} calibration @param {any} financeFact @param {() => number} random @param {any} record */
function simulateNutritionShortfall(state, calibration, financeFact, random, record) {
  state.usedAssumptionIds.add(calibration.assumptions.nutritionShortfall.id);
  const incomeRatio = financeFact.incomeRelativeToReference;
  const engel = financeFact.foodExpenditureShareReference;
  const monthlyProbability = clamp(
    0.02 + Math.max(0, 0.9 - incomeRatio) * 0.18 + Math.max(0, engel - 0.55) * 0.20,
    0.01,
    0.32,
  );
  let months = 0;
  for (let month = 0; month < 12; month += 1) {
    if (random() < monthlyProbability) months += 1;
  }
  return addFact(record, "food_need_shortfall", {
    months,
    modeledMonthlyProbability: roundTo(monthlyProbability, 4),
    inputIncomeRelativeToReference: incomeRatio,
    inputFoodShareReference: engel,
  });
}

/** @param {any} state @param {any} calibration @param {number} age @param {() => number} random @param {any} record */
function simulateSurvival(state, calibration, age, random, record) {
  let deathProbability;
  if (age === 0) {
    deathProbability = state.healthAtBirth?.modeledInfantMortalityProbability
      ?? calibration.observations.infantMortality1981.probability;
    state.usedObservationSourceIds.add(calibration.observations.infantMortality1981.sourceId);
    if (state.birthYear !== 1981) {
      state.usedAssumptionIds.add(calibration.assumptions.infantMortalityProxy.id);
    }
  } else {
    deathProbability = calibration.assumptions.postInfancyMortality.annualProbability;
    state.usedAssumptionIds.add(calibration.assumptions.postInfancyMortality.id);
  }
  const died = random() < deathProbability;
  return addFact(record, "child_survival_outcome", {
    survivedYear: !died,
    modeledDeathProbability: deathProbability,
    populationCalibrationProbability: age === 0
      ? calibration.observations.infantMortality1981.probability
      : null,
    birthHealthRiskMultiplier: age === 0 ? state.healthAtBirth?.riskMultiplier ?? 1 : null,
    causeOfDeath: died ? "unresolved_in_current_model" : null,
  });
}

/** @param {any} state @param {any} record @param {any} financeFact @param {any} nutritionFact @param {any} illness */
function applyAnnualFactEffects(state, record, financeFact, nutritionFact, illness) {
  const wealthTarget = 50 + 20 * Math.log(financeFact.incomeRelativeToReference);
  setStat(
    state,
    record,
    "wealth",
    wealthTarget,
    financeFact.id,
    "由本年家庭人均收入相对同年同城乡参考值重算",
  );
  if (nutritionFact.months >= 3) {
    const delta = -Math.min(3, Math.ceil(nutritionFact.months / 3));
    changeStat(state, record, "health", delta, nutritionFact.id, "食品需要未充分满足月份影响健康");
    changeStat(state, record, "mood", -1, nutritionFact.id, "家庭食品安排紧张影响幼年体验");
  }
  if (illness.severeEpisodeCount > 0) {
    changeStat(
      state,
      record,
      "health",
      -Math.min(3, illness.severeEpisodeCount * 2),
      illness.fact.id,
      "本年出现较重症状事件",
    );
  } else if (
    illness.episodeCount === 0
    && state.visibleStats.health.value < (state.healthAtBirth?.reserveScore ?? 81)
  ) {
    const recovery = addFact(record, "year_without_recorded_child_illness", { recoveredHealthPoint: 1 });
    changeStat(state, record, "health", 1, recovery.id, "本年无已记录幼儿病程，长期影响部分恢复");
  }
}

/** @param {any} state @param {any} calibration @param {number} year @param {any} record */
function addEducationContext(state, calibration, year, record) {
  const law = calibration.observations.compulsoryEducationLaw;
  const nextYear = year + 1;
  const enrollmentReference = getPrimaryEnrollmentReference(calibration, nextYear);
  state.usedObservationSourceIds.add(law.sourceId);
  const enrollmentAnchors = calibration.observations.primarySchoolEnrollmentAnchors;
  for (const anchor of enrollmentAnchors) {
    if (anchor.year <= nextYear) state.usedObservationSourceIds.add(anchor.sourceId);
  }
  addFact(record, "school_entry_context_prepared", {
    nextCalendarYear: nextYear,
    compulsoryEducationLawEffective: year >= Number(law.effective.slice(0, 4)),
    ordinaryEntryAgeUnder1986Law: law.ordinaryEntryAge,
    deferredEntryAgeWhereConditionsInsufficient: law.deferredEntryAgeWhereConditionsInsufficient,
    nextYearNationalPrimaryEnrollmentRateReference: roundTo(enrollmentReference, 4),
    individualEnrollmentDecided: false,
  });
}

/** @param {any} state @param {any} event @param {any} option @param {"provided" | "automatic"} source @param {any} record */
function applyDecision(state, event, option, source, record) {
  const decisionFact = addFact(record, "player_childhood_action", {
    eventId: event.id,
    optionId: option.id,
    actionFacts: clone(option.facts),
    choiceSource: source,
  });
  for (const [key, value] of Object.entries(option.facts)) {
    state.cumulativeFacts[key] = (state.cumulativeFacts[key] ?? 0) + value;
  }
  for (const [stat, delta] of Object.entries(option.statEffects)) {
    changeStat(state, record, stat, delta, decisionFact.id, `幼年选择：${option.label}`);
  }
  const decision = {
    eventId: event.id,
    age: event.age,
    chosenOptionId: option.id,
    unchosenOptionIds: event.options.filter((candidate) => candidate.id !== option.id).map((candidate) => candidate.id),
    choiceSource: source,
    sourceFactId: decisionFact.id,
  };
  state.decisions.push(decision);
  record.decision = decision;
}

/**
 * 从出生档案模拟到6岁。choices使用事件ID映射选项ID；autoChoose=false时会在首个缺少选择的事件处返回等待状态。
 * @param {any} birthProfile
 * @param {any} calibration
 * @param {any} eventConfig
 * @param {{ seed?: string | number, choices?: Record<string, string>, annualChoices?: Record<string, string>, annualOperationCatalog?: any, autoChoose?: boolean, mortality?: boolean }} [options]
 */
export function simulateChildhood(birthProfile, calibration, eventConfig, options = {}) {
  const seed = String(options.seed ?? `${birthProfile.seed}:childhood`);
  const choices = options.choices ?? {};
  const autoChoose = options.autoChoose ?? true;
  const mortality = options.mortality ?? true;
  const household = clone(birthProfile.household);
  household.coResidentSize = household.members.length;
  const birthReference = getChildhoodYearReference(calibration, birthProfile.person.birthYear);
  const birthReferenceIncome = birthProfile.person.residence === "urban"
    ? birthReference.urbanIncomePerPersonYuan
    : birthReference.ruralIncomePerPersonYuan;
  const state = {
    schemaVersion: 1,
    seed,
    personId: birthProfile.person.id,
    birthYear: birthProfile.person.birthYear,
    residence: birthProfile.person.residence,
    healthAtBirth: clone(birthProfile.person.healthAtBirth),
    status: "in_progress",
    currentAge: -1,
    household,
    birthCoResidentSize: birthProfile.household.coResidentSizeAtBirth,
    birthIncomeRelativeToReference:
      birthProfile.household.finance.annualIncomePerPersonYuan / birthReferenceIncome,
    visibleStats: clone(birthProfile.visibleStats),
    characterModel: clone(birthProfile.characterModel),
    cumulativeFacts: { immunizationContactCount: 0 },
    interests: {},
    childhoodGrowth: null,
    youthMainlinePayoffs: null,
    randomEventHistory: [],
    socialNetwork: [],
    annualRecords: [],
    decisions: [],
    ending: null,
    usedObservationSourceIds: new Set(),
    usedAssumptionIds: new Set(),
  };

  for (let age = 0; age <= calibration.scope.endAge; age += 1) {
    const year = state.birthYear + age;
    const random = createSeededRandom(`${seed}:${year}:${age}`);
    const reference = getChildhoodYearReference(calibration, year);
    const record = {
      calendarYear: year,
      age,
      facts: [],
      statChanges: [],
      decision: null,
      endState: null,
    };
    state.currentAge = age;
    updateMemberAges(state, year);
    addFact(record, "year_context", {
      residence: state.residence,
      compulsoryEducationLawEffective:
        year >= Number(calibration.observations.compulsoryEducationLaw.effective.slice(0, 4)),
      plannedImmunizationProgramActive:
        year >= calibration.observations.immunizationProgram.nationalStartYear,
    });
    maybeTransitionRuralWork(state, calibration, year, random, record);
    maybeAddSibling(state, calibration, year, age, random, record);
    maybeRecordImmunizationContact(state, calibration, year, age, random, record);
    const illness = simulateChildIllness(state, calibration, age, random, record);
    const financeFact = settleHouseholdFinance(
      state,
      calibration,
      reference,
      age,
      random,
      illness.caregiverWorkDaysLost,
      record,
    );
    const nutritionFact = simulateNutritionShortfall(state, calibration, financeFact, random, record);
    const survivalFact = simulateSurvival(state, calibration, age, random, record);
    if (!mortality && !survivalFact.survivedYear) {
      survivalFact.survivedYear = true;
      survivalFact.causeOfDeath = null;
      survivalFact.mortalityApplicationDisabled = true;
    }
    state.usedAssumptionIds.add(calibration.assumptions.visibleStatEvolution.id);

    if (mortality && !survivalFact.survivedYear) {
      const fatalFact = addFact(record, "fatal_child_health_event", {
        category: age === 0 ? "fatal_infant_health_event" : "fatal_early_childhood_health_event",
        diagnosis: null,
        medicallyConfirmedCause: null,
        linkedStatisticalOutcomeFactId: survivalFact.id,
        note: "当前模型只校准死亡概率，尚无足够资料分配具体死因。",
      });
      setStat(state, record, "health", 0, fatalFact.id, "本年发生致死健康事件");
      state.status = "ended";
      state.ending = {
        id: "early_childhood_death",
        age,
        calendarYear: year,
        sourceFactId: fatalFact.id,
        causeOfDeath: survivalFact.causeOfDeath,
      };
      record.endState = snapshotEndState(state);
      state.annualRecords.push(record);
      break;
    }

    applyAnnualFactEffects(state, record, financeFact, nutritionFact, illness);
    if (age === 6) addEducationContext(state, calibration, year, record);

    const annualReady = handleAnnualOperation({
      state,
      record,
      catalog: options.annualOperationCatalog,
      content: options.quarterlyLifeContent,
      stage: "childhood",
      choices: options.annualChoices,
      autoChoose,
      random,
      addFact,
      changeStat,
      debugRandomEvents: options.debugRandomEvents,
      socialCharacterCatalog: options.socialCharacterCatalog,
      context: {
        residence: state.residence,
        healthValue: state.visibleStats.health.value,
        cashReferenceYuan: financeFact.referenceMeanPerPersonYuan,
        affordableCashYuan: nutritionFact.months > 0
          ? 0
          : financeFact.annualHouseholdIncomeYuan * 0.005,
      },
    });
    if (!annualReady) {
      record.endState = snapshotEndState(state);
      state.annualRecords.push(record);
      break;
    }
    if (age >= 3) {
      updateSocialCharacters({
        state,
        record,
        catalog: options.socialCharacterCatalog,
        roleId: "neighborhood_friend",
        operationId: record.annualOperation?.chosenOptionId,
        random: createSeededRandom(`${seed}:social:${year}:neighborhood_friend`),
        addFact,
      });
    }

    const event = eventConfig.events.find((candidate) => candidate.age === age);
    if (event) {
      state.usedAssumptionIds.add(event.assumptionId);
      const providedOptionId = choices[event.id];
      let option;
      let source;
      if (providedOptionId) {
        option = event.options.find((candidate) => candidate.id === providedOptionId);
        if (!option) throw new Error(`事件 ${event.id} 不存在选项 ${providedOptionId}`);
        source = "provided";
      } else if (autoChoose) {
        option = weightedChoice(
          random,
          event.options.map((candidate) => ({ value: candidate, weight: candidate.autoWeight })),
        );
        source = "automatic";
      } else {
        state.status = "awaiting_choice";
        state.pendingDecision = {
          eventId: event.id,
          age,
          title: event.title,
          prompt: event.prompt,
          options: event.options.map((candidate) => ({ id: candidate.id, label: candidate.label })),
        };
        record.endState = snapshotEndState(state);
        state.annualRecords.push(record);
        break;
      }
      applyDecision(state, event, option, source, record);
    }

    const reviewReady = handleYearReview({
      state,
      record,
      stage: "childhood",
      reviewedYears: options.reviewedYears,
      autoChoose,
      enabled: Boolean(options.annualOperationCatalog),
    });
    if (!reviewReady) {
      record.endState = snapshotEndState(state);
      state.annualRecords.push(record);
      break;
    }

    record.endState = snapshotEndState(state);
    state.annualRecords.push(record);
  }

  if (state.status === "in_progress" && state.currentAge === calibration.scope.endAge) {
    state.status = "completed_stage";
  }
  return serializeState(state);
}

/** @param {any} state */
function snapshotEndState(state) {
  return {
    alive: state.status !== "ended",
    coResidentSize: state.household.members.length,
    annualHouseholdIncomeYuan: state.household.finance.annualHouseholdIncomeYuan,
    annualIncomePerPersonYuan: state.household.finance.annualIncomePerPersonYuan,
    visibleStats: Object.fromEntries(
      STAT_KEYS.map((key) => [key, state.visibleStats[key].value]),
    ),
  };
}

/** @param {any} state */
function serializeState(state) {
  return {
    schemaVersion: state.schemaVersion,
    seed: state.seed,
    personId: state.personId,
    birthYear: state.birthYear,
    residence: state.residence,
    healthAtBirth: state.healthAtBirth,
    status: state.status,
    currentAge: state.currentAge,
    household: state.household,
    visibleStats: state.visibleStats,
    characterModel: state.characterModel,
    cumulativeFacts: state.cumulativeFacts,
    interests: state.interests,
    childhoodGrowth: state.childhoodGrowth,
    youthMainlinePayoffs: state.youthMainlinePayoffs,
    randomEventHistory: state.randomEventHistory,
    socialNetwork: state.socialNetwork,
    annualRecords: state.annualRecords,
    decisions: state.decisions,
    ...(state.pendingDecision ? { pendingDecision: state.pendingDecision } : {}),
    ending: state.ending,
    provenance: {
      observationSourceIds: [...state.usedObservationSourceIds].sort(),
      assumptionIds: [...state.usedAssumptionIds].sort(),
    },
  };
}
