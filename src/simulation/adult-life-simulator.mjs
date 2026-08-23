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

function clone(value) {
  return structuredClone(value);
}

function score(value) {
  return Math.round(clamp(value, 0, 100));
}

function logit(probability) {
  const bounded = clamp(probability, 0.0001, 0.9999);
  return Math.log(bounded / (1 - bounded));
}

function logistic(value) {
  return 1 / (1 + Math.exp(-value));
}

function interpolate(anchors, year, field) {
  const usable = anchors.filter((entry) => Number.isFinite(entry[field]));
  const before = [...usable].reverse().find((entry) => entry.year <= year) ?? usable[0];
  const after = usable.find((entry) => entry.year >= year) ?? usable.at(-1);
  if (before.year === after.year) return before[field];
  const progress = (year - before.year) / (after.year - before.year);
  return before[field] + (after[field] - before[field]) * progress;
}

function sourceIdsFromAnchor(anchor) {
  return anchor.sourceIds ?? [anchor.sourceId];
}

function surroundingAnchors(anchors, year) {
  const before = [...anchors].reverse().find((entry) => entry.year <= year) ?? anchors[0];
  const after = anchors.find((entry) => entry.year >= year) ?? anchors.at(-1);
  return [...new Set([...sourceIdsFromAnchor(before), ...sourceIdsFromAnchor(after)])];
}

export function getAdultEconomicReference(calibration, year, residence) {
  const incomeAnchors = calibration.observations.residentIncomeReferenceAnchors;
  const wageAnchors = calibration.observations.urbanUnitWageAnchors;
  const projection = year > calibration.scope.historicalDataThrough;
  let residentIncome;
  let nonPrivateWage;
  let privateWage;
  let residentSourceIds;
  let wageSourceIds;
  if (!projection) {
    residentIncome = interpolate(incomeAnchors, year, residence);
    nonPrivateWage = interpolate(wageAnchors, year, "nonPrivate");
    const privateObserved = wageAnchors.filter((entry) => Number.isFinite(entry.private));
    privateWage = year < privateObserved[0].year
      ? nonPrivateWage * 0.70
      : interpolate(privateObserved, year, "private");
    residentSourceIds = surroundingAnchors(incomeAnchors, year);
    wageSourceIds = surroundingAnchors(wageAnchors, year);
  } else {
    const scenario = calibration.scenarios.baselineAfter2025;
    const years = year - calibration.scope.historicalDataThrough;
    const incomeBase = incomeAnchors.at(-1)[residence];
    const wageBase = wageAnchors.at(-1);
    residentIncome = incomeBase * (1 + scenario.annualNominalIncomeGrowth) ** years;
    nonPrivateWage = wageBase.nonPrivate * (1 + scenario.annualNominalWageGrowth) ** years;
    privateWage = wageBase.private * (1 + scenario.annualNominalWageGrowth) ** years;
    residentSourceIds = [incomeAnchors.at(-1).sourceId];
    wageSourceIds = sourceIdsFromAnchor(wageBase);
  }
  return {
    year,
    residence,
    residentIncomePerPersonYuan: roundTo(residentIncome, 2),
    urbanNonPrivateUnitAverageWageYuan: roundTo(nonPrivateWage, 2),
    urbanPrivateUnitAverageWageYuan: roundTo(privateWage, 2),
    privateWageUsesNonPrivateProxy: !projection
      && year < wageAnchors.find((entry) => Number.isFinite(entry.private)).year,
    dataStatus: projection ? "scenario" : "observation_or_interpolation",
    scenarioId: projection ? calibration.scenarios.baselineAfter2025.id : null,
    residentSourceIds,
    wageSourceIds,
  };
}

export function getAdultEmploymentStructure(calibration, year) {
  const anchors = calibration.observations.employmentSectorAnchors;
  if (year <= anchors.at(-1).year) {
    return {
      year,
      primary: roundTo(interpolate(anchors, year, "primary"), 4),
      secondary: roundTo(interpolate(anchors, year, "secondary"), 4),
      tertiary: roundTo(interpolate(anchors, year, "tertiary"), 4),
      dataStatus: "observation_or_interpolation",
      sourceIds: surroundingAnchors(anchors, year),
      referenceYearIfCarriedForward: null,
    };
  }
  if (year <= calibration.scope.historicalDataThrough) {
    const latest = anchors.at(-1);
    return {
      year,
      primary: latest.primary,
      secondary: latest.secondary,
      tertiary: latest.tertiary,
      dataStatus: "latest_observation_carried_forward",
      sourceIds: [latest.sourceId],
      referenceYearIfCarriedForward: latest.year,
    };
  }
  const scenario = calibration.scenarios.baselineAfter2025;
  const latest = anchors.at(-1);
  const progress = clamp((year - latest.year) / (2045 - latest.year), 0, 1);
  const values = Object.fromEntries(
    ["primary", "secondary", "tertiary"].map((field) => [
      field,
      latest[field]
        + (scenario.employmentSectorSharesBy2045[field] - latest[field]) * progress,
    ]),
  );
  return {
    year,
    primary: roundTo(values.primary, 4),
    secondary: roundTo(values.secondary, 4),
    tertiary: roundTo(values.tertiary, 4),
    dataStatus: "scenario",
    sourceIds: [latest.sourceId],
    scenarioId: scenario.id,
    referenceYearIfCarriedForward: null,
  };
}

export function estimateRetirementAge(birthProfile, educationRank, employmentForm) {
  const birthYear = birthProfile.person.birthYear;
  if (["self_employment", "family_economic_activity"].includes(employmentForm)) {
    return {
      age: 65,
      category: "self_or_family_economic_activity_scenario",
      basedOnBirthYearOnly: false,
      exactBirthMonthRuleApplied: false,
    };
  }
  if (birthProfile.person.sex === "male") {
    return {
      age: 63,
      category: "male_employee_original_age_60",
      basedOnBirthYearOnly: true,
      exactBirthMonthRuleApplied: false,
    };
  }
  if (educationRank >= 4) {
    const delayedMonths = clamp(((birthYear + 55 - 2025) * 12) / 4, 0, 36);
    return {
      age: Math.ceil(55 + delayedMonths / 12),
      category: "female_employee_original_age_55_proxy",
      basedOnBirthYearOnly: true,
      exactBirthMonthRuleApplied: false,
    };
  }
  const delayedMonths = clamp(((birthYear + 50 - 2025) * 12) / 2, 0, 60);
  return {
    age: Math.ceil(50 + delayedMonths / 12),
    category: "female_employee_original_age_50_proxy",
    basedOnBirthYearOnly: true,
    exactBirthMonthRuleApplied: false,
  };
}

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

function addFact(record, type, data) {
  const fact = {
    id: `${record.calendarYear}-age-${record.age}-${type}-${record.facts.length + 1}`,
    type,
    ...data,
  };
  record.facts.push(fact);
  return fact;
}

function setStat(state, record, stat, nextValue, factId, reason) {
  if (!STAT_KEYS.includes(stat)) throw new Error(`未知属性：${stat}`);
  const before = state.visibleStats[stat].value;
  const after = score(nextValue);
  if (before === after) return;
  state.visibleStats[stat].value = after;
  state.visibleStats[stat].basis = reason;
  state.visibleStats[stat].status = "derived_from_adult_life_fact";
  record.statChanges.push({
    stat,
    before,
    after,
    delta: after - before,
    sourceFactId: factId,
    reason,
  });
}

function changeStat(state, record, stat, delta, factId, reason) {
  setStat(state, record, stat, state.visibleStats[stat].value + delta, factId, reason);
}

function addSources(state, ids) {
  for (const id of ids) state.usedObservationSourceIds.add(id);
}

function educationRankFromYouth(youth) {
  const highest = youth.education.highestCompleted;
  if (youth.ending.id === "entered_regular_higher_education") return 2;
  if (highest === "vocational_secondary") return 3;
  if (highest === "academic_senior") return 2;
  if (highest === "junior_secondary") return 1;
  return 0;
}

function normalizeCarriedJob(job, personId) {
  if (!job) return null;
  return {
    ...clone(job),
    id: job.id ?? `carried-job-${personId}`,
    positionLevel: "entry",
    yearsInJob: 0,
    endYear: null,
    endReason: null,
    annualizedIncomeYuan:
      job.annualizedPersonalCashIncomeYuan ?? job.annualizedIncomeYuan ?? 0,
    annualIncomeThisYearYuan: 0,
  };
}

function chooseHigherField(random) {
  return weightedChoice(random, [
    { value: "engineering", weight: 1.25 },
    { value: "business_and_management", weight: 1.1 },
    { value: "health_and_education", weight: 1.0 },
    { value: "science_and_technology", weight: 0.75 },
    { value: "social_science", weight: 0.85 },
  ]);
}

function makeInitialState(birthProfile, youth, calibration, seed, random) {
  const enteredHigherEducation = youth.ending.id === "entered_regular_higher_education";
  const educationRank = educationRankFromYouth(youth);
  const carriedJob = normalizeCarriedJob(youth.ending.job, birthProfile.person.id);
  const employmentForm = carriedJob?.employmentForm ?? "employee";
  const retirement = estimateRetirementAge(
    birthProfile,
    enteredHigherEducation ? 4 : educationRank,
    employmentForm,
  );
  const higherLevel = random() < calibration.assumptions.higherEducation.undergraduateShare
    ? "undergraduate"
    : "short_cycle";
  const higherYears = higherLevel === "undergraduate"
    ? calibration.assumptions.higherEducation.undergraduateYears
    : calibration.assumptions.higherEducation.shortCycleYears;
  return {
    schemaVersion: 1,
    seed,
    personId: birthProfile.person.id,
    birthYear: birthProfile.person.birthYear,
    sex: birthProfile.person.sex,
    residence: birthProfile.person.residence,
    status: "in_progress",
    currentAge: youth.ending.age + 1,
    historicalDataThrough: calibration.scope.historicalDataThrough,
    originHousehold: clone(youth.household),
    education: {
      highestCompleted: youth.education.highestCompleted,
      educationRank,
      expenseMultiplier: 1,
      educationExpenseThisYearYuan: 0,
      partTimeIncomeThisYearYuan: 0,
      higher: enteredHigherEducation
        ? {
            status: "enrolled",
            entryYear: youth.ending.intendedEntryYear ?? youth.ending.calendarYear + 1,
            currentYear: 1,
            prescribedYears: higherYears,
            level: higherLevel,
            field: chooseHigherField(random),
            institutionName: null,
            locality: null,
            completedYears: 0,
            repeatedYears: 0,
            graduationYear: null,
            finalLearningProgressScore: null,
          }
        : null,
    },
    employment: {
      status: carriedJob
        ? (carriedJob.employmentForm === "employee" ? "employed" : carriedJob.employmentForm)
        : "not_started",
      currentJob: carriedJob,
      history: carriedJob ? [clone(carriedJob)] : [],
      searchAttempts: [],
      promotions: 0,
      totalYearsWorked: 0,
      plannedChangeNextYear: false,
      jobSearchContacts: 0,
      careerSkillHours: 0,
      preferredSkillDirection: carriedJob?.skillDirection ?? null,
      promotionLogOddsBonus: 0,
      retirement,
      retirementAge: retirement.age,
      delayedRetirementUntilAge: null,
      retiredYear: null,
      lastFullYearIncomeYuan: carriedJob?.annualizedIncomeYuan ?? 0,
    },
    routine: {
      studyHoursPerWeek: enteredHigherEducation ? 18 : 0,
      partTimeHoursPerWeek: 0,
      socialHoursPerWeek: 6,
      workHoursDelta: 0,
      exerciseHoursPerWeek: 1,
      relationshipHoursPerWeek: 0,
      familyCareHoursPerWeek: 0,
    },
    family: {
      relationshipStatus: "single",
      partner: null,
      child: null,
      originMembers: youth.household.members
        .filter((member) => member.relation !== "self")
        .map((member) => ({
          id: member.id,
          relation: member.relation,
          sex: member.sex,
          birthYear: member.birthYear ?? birthProfile.person.birthYear - member.ageAtBirth,
          alive: true,
          deathYear: null,
        })),
      relationshipQuality: null,
      familyCareCashShare: 0,
      childDecision: null,
    },
    housing: {
      tenure: youth.household.housing.tenure,
      arrangement: "living_with_origin_family",
      locality: birthProfile.person.locality,
      floorAreaSquareMeters: youth.household.housing.floorAreaSquareMeters,
      annualRentYuan: 0,
      assetValueYuan: 0,
      mortgageDebtYuan: 0,
      mortgageAnnualPaymentYuan: 0,
      mortgageYearsRemaining: 0,
      movedFromBirthResidence: false,
      purchaseYear: null,
      pendingAction: null,
    },
    finance: {
      openingSavingsKnown: false,
      liquidSavingsYuan: 0,
      unsecuredDebtYuan: 0,
      housingAssetValueYuan: 0,
      housingDebtYuan: 0,
      netWorthYuan: 0,
      cumulativePersonalIncomeYuan: 0,
      savingRateAdjustment: 0,
      pendingAnnualOperationExpenseYuan: 0,
      lastAnnualRecord: null,
    },
    health: {
      chronicEventCount: 0,
      medicalCheckCompleted: false,
      lastSeriousEventYear: null,
    },
    visibleStats: clone(youth.visibleStats),
    characterModel: clone(youth.characterModel),
    socialNetwork: clone(youth.socialNetwork ?? []),
    interests: clone(youth.interests ?? {}),
    childhoodGrowth: clone(youth.childhoodGrowth ?? null),
    youthMainlinePayoffs: clone(youth.youthMainlinePayoffs ?? null),
    randomEventHistory: clone(youth.randomEventHistory ?? []),
    annualRecords: [],
    priorDecisions: [...clone(youth.priorDecisions), ...clone(youth.decisions)],
    decisions: [],
    triggeredEventIds: new Set(),
    ending: null,
    usedObservationSourceIds: new Set(),
    usedAssumptionIds: new Set(),
    usedScenarioIds: new Set(),
  };
}

function simulateAdultHealth(state, calibration, random, record) {
  state.usedAssumptionIds.add(calibration.assumptions.healthAndMortality.id);
  const assumption = calibration.assumptions.healthAndMortality;
  const ageMultiplier = 1 + Math.max(0, record.age - 40) * 0.012;
  const episodeCount = poisson(random, assumption.minorEpisodeMean * ageMultiplier);
  let symptomDays = 0;
  for (let index = 0; index < episodeCount; index += 1) {
    symptomDays += randomInt(random, 2, record.age >= 65 ? 11 : 7);
  }
  let chronicEvent = false;
  let chronicProbability = 0;
  if (record.age >= 45) {
    chronicProbability = clamp(
      assumption.chronicEventBaseAtAge45
        * Math.exp((record.age - 45) / 18)
        * (1 + state.health.chronicEventCount * 0.22)
        * (state.routine.exerciseHoursPerWeek >= 3 ? 0.72 : 1),
      0,
      0.38,
    );
    chronicEvent = random() < chronicProbability;
  }
  const fact = addFact(record, "adult_health_year_summary", {
    symptomEpisodeCount: episodeCount,
    symptomDays,
    chronicHealthEventOccurred: chronicEvent,
    modeledChronicEventProbability: roundTo(chronicProbability, 5),
    specificDiagnosis: null,
    exerciseHoursPerWeekAtStart: state.routine.exerciseHoursPerWeek,
  });
  if (chronicEvent) {
    state.health.chronicEventCount += 1;
    state.health.lastSeriousEventYear = record.calendarYear;
    changeStat(state, record, "health", -randomInt(random, 3, 7), fact.id, "本年发生未细分诊断的慢性健康事件");
    changeStat(state, record, "mood", -1, fact.id, "健康事件改变了本年的生活安排");
  } else if (symptomDays >= 14) {
    changeStat(state, record, "health", -1, fact.id, "本年症状天数较多");
  }
  if (record.age >= 55 && record.age % 3 === 0) {
    changeStat(state, record, "health", -1, fact.id, "年龄增长带来可见的身体变化");
  }
  return fact;
}

function findApplicableEvent(state, eventConfig, record) {
  return eventConfig.events.find((event) => {
    if (state.triggeredEventIds.has(event.id)) return false;
    const higher = state.education.higher;
    if (event.trigger === "on_higher_education_entry") {
      return higher?.status === "enrolled"
        && higher.currentYear === 1
        && record.calendarYear === higher.entryYear;
    }
    if (event.trigger === "before_higher_education_final_year") {
      return higher?.status === "enrolled" && higher.currentYear === higher.prescribedYears;
    }
    if (event.trigger === "age_range_employed") {
      return record.age >= event.minAge
        && record.age <= event.maxAge
        && state.employment.currentJob != null;
    }
    if (event.trigger === "age_range_not_migrated") {
      return record.age >= event.minAge
        && record.age <= event.maxAge
        && !state.housing.movedFromBirthResidence;
    }
    if (event.trigger === "age_range_single") {
      return record.age >= event.minAge
        && record.age <= event.maxAge
        && state.family.relationshipStatus === "single";
    }
    if (event.trigger === "age_range_housing") {
      return record.age >= event.minAge && record.age <= event.maxAge;
    }
    if (event.trigger === "age_range_partnered_no_child") {
      return record.age >= event.minAge
        && record.age <= event.maxAge
        && state.family.relationshipStatus === "partnered"
        && state.family.child == null
        && state.family.childDecision == null;
    }
    if (event.trigger === "age_range_parent_alive") {
      return record.age >= event.minAge
        && record.age <= event.maxAge
        && state.family.originMembers.some(
          (member) => ["mother", "father"].includes(member.relation) && member.alive,
        );
    }
    if (event.trigger === "age_range") {
      return record.age >= event.minAge && record.age <= event.maxAge;
    }
    if (event.trigger === "at_retirement_age_employed") {
      const effectiveAge = state.employment.delayedRetirementUntilAge
        ?? state.employment.retirementAge;
      return record.age >= effectiveAge && state.employment.currentJob != null;
    }
    if (event.trigger === "age_range_retired") {
      return record.age >= event.minAge
        && record.age <= event.maxAge
        && state.employment.status === "retired";
    }
    return false;
  });
}

function chooseEventOption(state, event, choices, autoChoose, random) {
  const requestedId = choices[event.id];
  if (requestedId) {
    const option = event.options.find((candidate) => candidate.id === requestedId);
    if (!option) throw new Error(`成年事件 ${event.id} 不存在选项 ${requestedId}`);
    return { option, selectionMode: "manual" };
  }
  if (!autoChoose) return null;
  return {
    option: weightedChoice(
      random,
      event.options.map((candidate) => ({
        value: candidate,
        weight: candidate.autoWeightByResidence?.[state.residence]
          ?? candidate.autoWeight
          ?? 1,
      })),
    ),
    selectionMode: "automatic",
  };
}

function wageReferenceForUnit(economic, unitType) {
  const privateTypes = new Set([
    "private_enterprise",
    "foreign_invested_enterprise",
    "individual_business",
  ]);
  if (privateTypes.has(unitType)) {
    return {
      amountYuan: economic.urbanPrivateUnitAverageWageYuan,
      field: "urbanPrivateUnitAverageWageYuan",
      exactScopeMatch: unitType === "private_enterprise" && !economic.privateWageUsesNonPrivateProxy,
    };
  }
  return {
    amountYuan: economic.urbanNonPrivateUnitAverageWageYuan,
    field: "urbanNonPrivateUnitAverageWageYuan",
    exactScopeMatch: ["state_owned_unit", "public_institution", "urban_collective_unit"].includes(unitType),
  };
}

function chooseUnitType(template, year, random) {
  return weightedChoice(
    random,
    template.unitTypes.map((value) => {
      let weight = 1;
      if (year < 1995 && ["private_enterprise", "foreign_invested_enterprise"].includes(value)) {
        weight *= 0.28;
      }
      if (year >= 1998 && ["private_enterprise", "foreign_invested_enterprise"].includes(value)) {
        weight *= 1.35;
      }
      if (year >= 1998 && value === "urban_collective_unit") weight *= 0.65;
      return { value, weight };
    }),
  );
}

function candidateTemplateWeight(template, state, structure, year) {
  let weight = template.baseWeight * structure[template.sector] * 3;
  if (template.skillDirections.includes(state.employment.preferredSkillDirection)) weight *= 1.65;
  if (state.education.educationRank >= 4 && template.minimumEducationRank >= 4) weight *= 1.55;
  if (year >= 2001 && ["manufacturing", "transport_and_warehousing"].includes(template.industry)) {
    weight *= 1.15;
  }
  if (state.residence === "rural" && template.id === "family_agricultural_operator") weight *= 1.45;
  return weight;
}

function makeAdultCandidate(state, calibration, template, year, availableMonths, random) {
  const economic = getAdultEconomicReference(calibration, year, state.residence);
  const structure = getAdultEmploymentStructure(calibration, year);
  const unitType = chooseUnitType(template, year, random);
  const [minimumMultiplier, maximumMultiplier] = template.incomeMultiplierRange;
  const multiplier = minimumMultiplier + random() * (maximumMultiplier - minimumMultiplier);
  let reference;
  if (["family_economic_activity", "self_employment"].includes(template.employmentForm)) {
    reference = {
      amountYuan: economic.residentIncomePerPersonYuan,
      field: "residentIncomePerPersonYuan",
      exactScopeMatch: false,
    };
  } else {
    reference = wageReferenceForUnit(economic, unitType);
  }
  const annualizedIncome = roundTo(reference.amountYuan * multiplier, 2);
  const educationMatch = state.education.educationRank >= template.minimumEducationRank;
  const skillMatch = template.skillDirections.includes(state.employment.preferredSkillDirection);
  let hiringLogOdds = logit(calibration.assumptions.career.jobSearchBaseHiringProbability);
  hiringLogOdds += Math.min(0.48, state.employment.jobSearchContacts * 0.022);
  hiringLogOdds += educationMatch ? 0.18 : -0.8;
  hiringLogOdds += skillMatch ? 0.28 : 0;
  if (template.minimumEducationRank >= 4 && state.education.educationRank < 4) hiringLogOdds -= 4;
  if (template.id === "family_agricultural_operator") hiringLogOdds += 0.85;
  const hiringProbability = logistic(hiringLogOdds);
  let contractProbability = template.contractProbability;
  if (year < 1995) contractProbability *= 0.65;
  if (year >= 2008 && template.employmentForm === "employee") contractProbability += 0.12;
  return {
    id: `adult-offer-${year}-${template.id}`,
    templateId: template.id,
    label: template.label,
    employerName: null,
    employerLocality: null,
    sector: template.sector,
    industry: template.industry,
    occupation: template.occupation,
    unitType,
    employmentForm: template.employmentForm,
    weeklyHours: randomInt(random, template.weeklyHoursRange[0], template.weeklyHoursRange[1]),
    availableWorkMonthsThisYear: availableMonths,
    annualizedIncomeYuan: annualizedIncome,
    personalIncomeThisYearYuan: roundTo(annualizedIncome * availableMonths / 12, 2),
    incomeReferenceMultiplier: roundTo(multiplier, 4),
    incomeReference: {
      field: reference.field,
      amountYuan: reference.amountYuan,
      exactScopeMatch: reference.exactScopeMatch,
      dataStatus: economic.dataStatus,
      scenarioId: economic.scenarioId,
    },
    contractProbability: roundTo(clamp(contractProbability, 0, 0.96), 5),
    hiringProbability: roundTo(hiringProbability, 5),
    educationMatch,
    skillMatch,
    opportunityWeight: roundTo(candidateTemplateWeight(template, state, structure, year), 6),
    nationalSectorShareReference: structure[template.sector],
    structureDataStatus: structure.dataStatus,
  };
}

export function generateAdultJobCandidates(
  state,
  calibration,
  jobCatalog,
  year,
  availableMonths,
  random,
) {
  const economic = getAdultEconomicReference(calibration, year, state.residence);
  const structure = getAdultEmploymentStructure(calibration, year);
  addSources(state, [...economic.residentSourceIds, ...economic.wageSourceIds, ...structure.sourceIds]);
  if (economic.scenarioId) state.usedScenarioIds.add(economic.scenarioId);
  if (structure.scenarioId) state.usedScenarioIds.add(structure.scenarioId);
  const eligible = jobCatalog.templates
    .filter((template) => template.minimumEducationRank <= state.education.educationRank)
    .filter((template) => template.residences.includes(state.residence))
    .map((template) => makeAdultCandidate(
      state,
      calibration,
      template,
      year,
      availableMonths,
      random,
    ));
  const candidates = [];
  const remaining = [...eligible];
  const candidateCount = Math.min(3, remaining.length);
  while (candidates.length < candidateCount) {
    const selected = weightedChoice(
      random,
      remaining.map((candidate) => ({ value: candidate, weight: candidate.opportunityWeight })),
    );
    candidates.push(selected);
    remaining.splice(remaining.findIndex((entry) => entry.id === selected.id), 1);
  }
  return candidates;
}

function createJobFromCandidate(state, candidate, year, random) {
  let contractType;
  if (["family_economic_activity", "self_employment"].includes(candidate.employmentForm)) {
    contractType = "not_applicable_self_or_family_operation";
  } else if (random() < candidate.contractProbability) {
    contractType = year >= 2008
      ? "written_labor_contract"
      : "written_contract_or_unit_employment_record";
  } else {
    contractType = "oral_or_no_written_contract_recorded";
  }
  return {
    id: `adult-job-${state.personId}-${year}-${candidate.templateId}-${state.employment.history.length + 1}`,
    startYear: year,
    startAge: year - state.birthYear,
    endYear: null,
    endReason: null,
    employerName: null,
    employerLocality: null,
    label: candidate.label,
    sector: candidate.sector,
    industry: candidate.industry,
    occupation: candidate.occupation,
    positionLevel: "entry",
    unitType: candidate.unitType,
    employmentForm: candidate.employmentForm,
    contractType,
    weeklyHours: candidate.weeklyHours,
    annualizedIncomeYuan: candidate.annualizedIncomeYuan,
    annualIncomeThisYearYuan: candidate.personalIncomeThisYearYuan,
    yearsInJob: 0,
    skillMatch: candidate.skillMatch,
    incomeReference: clone(candidate.incomeReference),
    incomeReferenceMultiplier: candidate.incomeReferenceMultiplier,
  };
}

function createPartner(state, calibration, jobCatalog, random, record) {
  state.usedAssumptionIds.add(calibration.assumptions.relationshipFormation.id);
  state.usedAssumptionIds.add(calibration.assumptions.partnerEconomics.id);
  const [minimumDifference, maximumDifference] =
    calibration.assumptions.relationshipFormation.partnerAgeDifferenceRange;
  const ageDifference = randomInt(random, minimumDifference, maximumDifference);
  const partnerEducationRank = clamp(
    state.education.educationRank + randomInt(random, -1, 1),
    0,
    4,
  );
  const temporary = {
    ...state,
    education: { ...state.education, educationRank: partnerEducationRank },
  };
  const candidates = jobCatalog.templates
    .filter((template) => template.minimumEducationRank <= partnerEducationRank)
    .filter((template) => template.residences.includes(state.residence));
  const template = weightedChoice(
    random,
    candidates.map((entry) => ({ value: entry, weight: entry.baseWeight })),
  );
  const candidate = makeAdultCandidate(
    temporary,
    calibration,
    template,
    record.calendarYear,
    12,
    random,
  );
  const partner = {
    id: `partner-${state.personId}-${record.calendarYear}`,
    relation: "partner",
    sex: state.sex === "male" ? "female" : "male",
    birthYear: state.birthYear + ageDifference,
    ageAtFormation: record.age - ageDifference,
    educationRank: partnerEducationRank,
    alive: true,
    deathYear: null,
    job: createJobFromCandidate(state, candidate, record.calendarYear, random),
    annualIncomeYuan: candidate.annualizedIncomeYuan,
  };
  state.family.relationshipStatus = "partnered";
  state.family.partner = partner;
  state.family.relationshipQuality = 68;
  state.routine.relationshipHoursPerWeek = Math.max(
    state.routine.relationshipHoursPerWeek,
    8,
  );
  return addFact(record, "partner_household_formed", {
    partnerId: partner.id,
    partnerBirthYear: partner.birthYear,
    partnerAgeAtFormation: partner.ageAtFormation,
    partnerEducationRank,
    partnerJob: clone(partner.job),
    relationshipQualityAtFormation: state.family.relationshipQuality,
    legalMarriageRegistration: null,
    ceremony: null,
  });
}

function createChild(state, calibration, random, record) {
  state.usedAssumptionIds.add(calibration.assumptions.fertilityAndChild.id);
  const probability = calibration.assumptions.fertilityAndChild.birthProbabilityAfterDecision;
  const born = random() < probability;
  const fact = addFact(record, "first_child_attempt_outcome", {
    attempted: true,
    childBorn: born,
    modeledBirthProbability: probability,
    medicalDetails: null,
    localFamilyPlanningEligibility: null,
  });
  state.family.childDecision = born ? "first_child_born" : "attempted_without_birth";
  if (born) {
    state.family.child = {
      id: `child-${state.personId}-${record.calendarYear}`,
      relation: "child",
      birthYear: record.calendarYear,
      sex: random() < 0.515 ? "male" : "female",
      alive: true,
      currentLifeStage: "infancy",
      relationshipWithPlayer: 62,
      supportYears: 0,
      highSupportYears: 0,
      independentSinceYear: null,
    };
    changeStat(state, record, "relationships", 3, fact.id, "家庭迎来一个孩子");
    changeStat(state, record, "mood", 2, fact.id, "孩子出生改变了家庭生活");
    if (
      state.sex === "female"
      && random() < calibration.assumptions.fertilityAndChild.postpartumHealthRiskProbability
    ) {
      changeStat(state, record, "health", -3, fact.id, "生育后的恢复影响本年健康");
    }
  } else {
    changeStat(state, record, "mood", -1, fact.id, "这次尝试没有迎来孩子");
  }
  return fact;
}

function applyEventOption(
  state,
  calibration,
  jobCatalog,
  event,
  option,
  selectionMode,
  random,
  record,
) {
  const fact = addFact(record, "adult_player_action", {
    eventId: event.id,
    optionId: option.id,
    selectedActionFields: Object.fromEntries(
      Object.entries(option).filter(([key]) => !["id", "label", "autoWeight", "autoWeightByResidence", "statEffects"].includes(key)),
    ),
  });
  for (const field of [
    "studyHoursPerWeek",
    "partTimeHoursPerWeek",
    "socialHoursPerWeek",
    "relationshipHoursPerWeek",
    "familyCareHoursPerWeek",
    "exerciseHoursPerWeek",
  ]) {
    if (option[field] != null) state.routine[field] = option[field];
  }
  if (option.workHoursDelta != null) state.routine.workHoursDelta += option.workHoursDelta;
  if (option.savingRateDelta != null) {
    state.finance.savingRateAdjustment += option.savingRateDelta;
  }
  if (option.expenseMultiplier != null) {
    state.education.expenseMultiplier = option.expenseMultiplier;
  }
  if (option.jobSearchContacts != null) {
    state.employment.jobSearchContacts += option.jobSearchContacts;
  }
  if (option.careerSkillHours != null) {
    state.employment.careerSkillHours += option.careerSkillHours;
  }
  if (option.promotionLogOddsBonus != null) {
    state.employment.promotionLogOddsBonus += option.promotionLogOddsBonus;
  }
  if (option.familyCareCashShare != null) {
    state.family.familyCareCashShare = option.familyCareCashShare;
  }
  if (option.medicalCheck) state.health.medicalCheckCompleted = true;
  if (option.medicalExpenseReferenceShare != null) {
    state.health.medicalExpenseReferenceShare = option.medicalExpenseReferenceShare;
  }
  if (option.migrationAction === "move_to_urban_rental") {
    state.residence = "urban";
    state.housing.tenure = "private_rental";
    state.housing.arrangement = "independent_rental_after_migration";
    state.housing.movedFromBirthResidence = true;
    state.housing.locality = null;
    state.employment.plannedChangeNextYear = true;
  }
  if (option.relationshipAction === "form_partner_household") {
    createPartner(state, calibration, jobCatalog, random, record);
  }
  if (option.relationshipAction === "remain_single") {
    state.family.relationshipStatus = "single_by_current_choice";
  }
  if (option.housingAction) state.housing.pendingAction = option.housingAction;
  if (option.childAction === "try_first_child") createChild(state, calibration, random, record);
  if (option.childAction === "decline_child") state.family.childDecision = "declined";
  if (option.careerAction === "seek_change") state.employment.plannedChangeNextYear = true;
  if (option.retirementAction === "retire_now") state.employment.retireAtEndOfYear = true;
  if (option.retirementAction === "delay_two_years") {
    state.employment.delayedRetirementUntilAge = record.age + 2;
  }
  for (const [stat, delta] of Object.entries(option.statEffects ?? {})) {
    changeStat(state, record, stat, delta, fact.id, `玩家在“${event.title}”中选择“${option.label}”`);
  }
  const decision = {
    eventId: event.id,
    calendarYear: record.calendarYear,
    age: record.age,
    selectedOptionId: option.id,
    selectedLabel: option.label,
    unchosenOptionIds: event.options
      .filter((candidate) => candidate.id !== option.id)
      .map((candidate) => candidate.id),
    unchosenOptions: event.options
      .filter((candidate) => candidate.id !== option.id)
      .map((candidate) => ({ id: candidate.id, label: candidate.label })),
    selectionMode,
    sourceFactId: fact.id,
  };
  record.decisions.push(decision);
  state.decisions.push(decision);
  state.triggeredEventIds.add(event.id);
  state.usedAssumptionIds.add(event.assumptionId);
  state.usedAssumptionIds.add(calibration.assumptions.adultChoices.id);
}

function handleConfiguredEvent(
  state,
  calibration,
  eventConfig,
  jobCatalog,
  choices,
  autoChoose,
  random,
  record,
) {
  const event = findApplicableEvent(state, eventConfig, record);
  if (!event) return true;
  const selected = chooseEventOption(state, event, choices, autoChoose, random);
  if (!selected) {
    state.status = "awaiting_choice";
    state.pendingDecision = {
      eventId: event.id,
      title: event.title,
      prompt: event.prompt,
      calendarYear: record.calendarYear,
      age: record.age,
      options: event.options.map((option) => ({ id: option.id, label: option.label })),
    };
    return false;
  }
  applyEventOption(
    state,
    calibration,
    jobCatalog,
    event,
    selected.option,
    selected.selectionMode,
    random,
    record,
  );
  return true;
}

function simulateHigherEducationYear(state, calibration, economic, healthFact, random, record) {
  state.usedAssumptionIds.add(calibration.assumptions.higherEducation.id);
  const higher = state.education.higher;
  const assumption = calibration.assumptions.higherEducation;
  const educationExpense = roundTo(
    economic.residentIncomePerPersonYuan
      * (higher.level === "undergraduate" ? 0.42 : 0.34)
      * (state.education.expenseMultiplier ?? 1),
    2,
  );
  state.education.educationExpenseThisYearYuan = educationExpense;
  const partTimeIncome = roundTo(
    economic.residentIncomePerPersonYuan
      * 0.38
      * clamp(state.routine.partTimeHoursPerWeek / 15, 0, 1.2),
    2,
  );
  const attendanceRate = clamp(
    0.94
      - healthFact.symptomDays / 260
      - Math.max(0, state.routine.partTimeHoursPerWeek - 10) * 0.004,
    0.55,
    0.99,
  );
  const learningProgressScore = score(
    45
      + (attendanceRate - 0.85) * 70
      + (state.routine.studyHoursPerWeek - 15) * 1.45
      + state.visibleStats.ability.value * 0.18
      + standardNormal(random) * 8,
  );
  const fact = addFact(record, "higher_education_year", {
    level: higher.level,
    field: higher.field,
    yearOfStudy: higher.currentYear,
    prescribedYears: higher.prescribedYears,
    studyHoursPerWeek: state.routine.studyHoursPerWeek,
    partTimeHoursPerWeek: state.routine.partTimeHoursPerWeek,
    socialHoursPerWeek: state.routine.socialHoursPerWeek,
    attendanceRate: roundTo(attendanceRate, 4),
    learningProgressScore,
    scoreMeaning: "game_internal_learning_progress_not_exam_score",
    educationCashExpenseYuan: educationExpense,
    partTimeIncomeYuan: partTimeIncome,
    institutionName: null,
  });
  state.education.partTimeIncomeThisYearYuan = partTimeIncome;
  higher.finalLearningProgressScore = learningProgressScore;
  changeStat(state, record, "ability", learningProgressScore >= 65 ? 3 : 2, fact.id, "本年高等教育课程形成能力积累");
  if (state.routine.socialHoursPerWeek >= 10) {
    changeStat(state, record, "relationships", 1, fact.id, "本年保持较多同学活动时间");
  }
  const exitProbability = logistic(
    logit(assumption.annualExitBase)
      + Math.max(0, 48 - learningProgressScore) * 0.035
      + Math.max(0, state.routine.partTimeHoursPerWeek - 14) * 0.045,
  );
  if (random() < exitProbability) {
    higher.status = "exited_before_completion";
    higher.exitYear = record.calendarYear;
    state.education.partTimeIncomeThisYearYuan = partTimeIncome;
    const exitFact = addFact(record, "higher_education_exit", {
      modeledExitProbability: roundTo(exitProbability, 5),
      completedYears: higher.completedYears,
      credentialCreated: false,
      reason: "individual_reason_not_observed",
    });
    changeStat(state, record, "mood", -2, exitFact.id, "高等教育在取得学历前结束");
    state.employment.status = "unemployed_searching";
    return { needsJobSearch: true, availableMonths: randomInt(random, 5, 8) };
  }
  if (higher.currentYear === higher.prescribedYears) {
    const graduationProbability = logistic(
      logit(assumption.annualCompletionProbabilityFinalYear)
        + (learningProgressScore - 58) * 0.018
        + (attendanceRate - 0.88),
    );
    const graduated = random() < graduationProbability;
    const graduationFact = addFact(record, "higher_education_graduation_outcome", {
      graduated,
      level: higher.level,
      field: higher.field,
      modeledGraduationProbability: roundTo(graduationProbability, 5),
      learningProgressScore,
      institutionName: null,
      credential: graduated
        ? (higher.level === "undergraduate" ? "ordinary_undergraduate_degree_level" : "ordinary_short_cycle_degree_level")
        : null,
    });
    if (graduated) {
      higher.status = "graduated";
      higher.graduationYear = record.calendarYear;
      higher.completedYears = higher.prescribedYears;
      state.education.highestCompleted = "regular_higher_education";
      state.education.educationRank = 4;
      state.employment.preferredSkillDirection = higher.field;
      state.employment.status = "unemployed_searching";
      changeStat(state, record, "ability", 4, graduationFact.id, "完成普通高等教育");
      return { needsJobSearch: true, availableMonths: randomInt(random, 4, 6) };
    }
    higher.repeatedYears += 1;
    return { needsJobSearch: false, availableMonths: 0 };
  }
  higher.completedYears += 1;
  higher.currentYear += 1;
  return { needsJobSearch: false, availableMonths: 0 };
}

function historicalSeparationContext(job, calibration, year) {
  const assumption = calibration.assumptions.historicalCareerShocks;
  let multiplier = 1;
  const exposureIds = [];
  if (
    year >= 1998
    && year <= 2002
    && ["state_owned_unit", "urban_collective_unit"].includes(job.unitType)
  ) {
    multiplier *= assumption.stateUnit1998To2002SeparationMultiplier;
    exposureIds.push("state_unit_restructuring_1998_2002");
  }
  if (
    year === 2008
    && ["private_enterprise", "foreign_invested_enterprise"].includes(job.unitType)
  ) {
    multiplier *= assumption.market2008SeparationMultiplier;
    exposureIds.push("market_employment_shock_2008");
  }
  if (
    year === 2020
    && ["retail_and_life_services", "small_business_and_services"].includes(job.industry)
  ) {
    multiplier *= assumption.contactService2020SeparationMultiplier;
    exposureIds.push("contact_service_disruption_2020");
  }
  return { multiplier, exposureIds };
}

function simulateCurrentJob(state, calibration, economic, random, record) {
  const job = state.employment.currentJob;
  if (!job || state.employment.status === "retired") {
    return { personalIncomeYuan: 0, needsJobSearch: state.employment.status === "unemployed_searching" };
  }
  state.usedAssumptionIds.add(calibration.assumptions.career.id);
  state.usedAssumptionIds.add(calibration.assumptions.historicalCareerShocks.id);
  const reference = ["self_employment", "family_economic_activity"].includes(job.employmentForm)
    ? {
        amountYuan: economic.residentIncomePerPersonYuan,
        field: "residentIncomePerPersonYuan",
        exactScopeMatch: false,
      }
    : wageReferenceForUnit(economic, job.unitType);
  const priorReference = job.lastReferenceAmountYuan
    ?? job.incomeReference?.amountYuan
    ?? reference.amountYuan;
  const referenceGrowth = clamp(reference.amountYuan / Math.max(1, priorReference), 0.72, 1.35);
  const sigma = calibration.assumptions.career.annualIndividualIncomeShockSigma;
  const incomeShock = Math.exp(-0.5 * sigma ** 2 + sigma * standardNormal(random));
  job.annualizedIncomeYuan = roundTo(
    Math.max(1, job.annualizedIncomeYuan)
      * referenceGrowth
      * (1.012 + Math.min(job.yearsInJob, 12) * 0.0015)
      * incomeShock,
    2,
  );
  job.lastReferenceAmountYuan = reference.amountYuan;
  job.weeklyHours = clamp(job.weeklyHours + state.routine.workHoursDelta, 32, 72);
  let separationProbability = calibration.assumptions.career.baseAnnualSeparationProbability;
  const historicalContext = historicalSeparationContext(job, calibration, record.calendarYear);
  separationProbability *= historicalContext.multiplier;
  separationProbability *= job.contractType?.startsWith("written") ? 0.76 : 1.22;
  separationProbability *= state.visibleStats.ability.value >= 65 ? 0.86 : 1;
  separationProbability = clamp(separationProbability, 0.006, 0.42);
  if (historicalContext.exposureIds.length > 0) {
    addFact(record, "historical_job_shock_exposure", {
      exposureIds: historicalContext.exposureIds,
      jobId: job.id,
      jobLabel: job.label,
      occupation: job.occupation,
      industry: job.industry,
      unitType: job.unitType,
      modeledSeparationMultiplier: roundTo(historicalContext.multiplier, 4),
      deterministicJobLoss: false,
      note: "时代环境只改变本模型中的岗位结束概率，不把群体事件直接判定为个人必然结果。",
    });
  }
  const separated = random() < separationProbability;
  const workMonths = separated ? randomInt(random, 2, 10) : 12;
  const income = roundTo(job.annualizedIncomeYuan * workMonths / 12, 2);
  job.annualIncomeThisYearYuan = income;
  job.workMonthsThisYear = workMonths;
  job.yearsInJob += workMonths / 12;
  const fact = addFact(record, "adult_job_year", {
    jobId: job.id,
    jobLabel: job.label,
    industry: job.industry,
    occupation: job.occupation,
    positionLevel: job.positionLevel,
    unitType: job.unitType,
    employmentForm: job.employmentForm,
    contractType: job.contractType,
    weeklyHours: job.weeklyHours,
    workMonths,
    annualizedIncomeYuan: job.annualizedIncomeYuan,
    personalIncomeThisYearYuan: income,
    incomeReference: {
      amountYuan: reference.amountYuan,
      field: reference.field,
      exactScopeMatch: reference.exactScopeMatch,
      dataStatus: economic.dataStatus,
      scenarioId: economic.scenarioId,
    },
    separatedAtEndOfWorkMonths: separated,
    modeledSeparationProbability: roundTo(separationProbability, 5),
  });
  state.employment.totalYearsWorked += workMonths / 12;
  state.employment.lastFullYearIncomeYuan = job.annualizedIncomeYuan;
  if (job.weeklyHours >= 58) {
    changeStat(state, record, "health", -1, fact.id, "本年工作周工时较长");
    changeStat(state, record, "mood", -1, fact.id, "本年工作挤占了休息时间");
  }
  const promotionProbability = logistic(
    logit(calibration.assumptions.career.baseAnnualPromotionProbability)
      + (state.visibleStats.ability.value - 55) * 0.018
      + state.employment.promotionLogOddsBonus
      + Math.min(0.42, state.employment.careerSkillHours / 900),
  );
  const promoted = !separated && random() < promotionProbability;
  if (promoted) {
    job.positionLevel = job.positionLevel === "entry"
      ? "experienced"
      : (job.positionLevel === "experienced" ? "senior_or_supervisory" : job.positionLevel);
    job.annualizedIncomeYuan = roundTo(job.annualizedIncomeYuan * 1.10, 2);
    state.employment.promotions += 1;
    const promotionFact = addFact(record, "career_promotion", {
      jobId: job.id,
      newPositionLevel: job.positionLevel,
      modeledPromotionProbability: roundTo(promotionProbability, 5),
      annualizedIncomeAfterPromotionYuan: job.annualizedIncomeYuan,
    });
    changeStat(state, record, "ability", 2, promotionFact.id, "岗位职责增加并形成新的工作经验");
    changeStat(state, record, "wealth", 1, promotionFact.id, "晋升改变了后续年化收入");
    state.employment.promotionLogOddsBonus *= 0.35;
    state.employment.careerSkillHours *= 0.65;
  }
  if (separated) {
    job.endYear = record.calendarYear;
    job.endReason = "employment_separation_or_business_exit";
    const separationFact = addFact(record, "employment_ended", {
      jobId: job.id,
      endYear: record.calendarYear,
      workMonthsThisYear: workMonths,
      specificReason: null,
      modeledSeparationProbability: roundTo(separationProbability, 5),
    });
    const historyJob = state.employment.history.find((entry) => entry.id === job.id);
    if (historyJob) Object.assign(historyJob, clone(job));
    state.employment.currentJob = null;
    state.employment.status = "unemployed_searching";
    changeStat(state, record, "mood", -2, separationFact.id, "本年工作关系或经营活动结束");
    return { personalIncomeYuan: income, needsJobSearch: true, availableMonths: 12 - workMonths };
  }
  return { personalIncomeYuan: income, needsJobSearch: false, availableMonths: 0 };
}

function chooseAdultCandidate(candidates, decisionId, choices, autoChoose, random) {
  const requested = choices[decisionId];
  if (requested) {
    const candidate = candidates.find(
      (entry) => entry.id === requested || entry.templateId === requested,
    );
    if (!candidate) throw new Error(`成年求职事件 ${decisionId} 不存在候选 ${requested}`);
    return { candidate, selectionMode: "manual" };
  }
  if (!autoChoose) return null;
  return {
    candidate: weightedChoice(
      random,
      candidates.map((candidate) => ({
        value: candidate,
        weight: candidate.opportunityWeight * candidate.hiringProbability,
      })),
    ),
    selectionMode: "automatic",
  };
}

function handleAdultJobSearch(
  state,
  calibration,
  jobCatalog,
  choices,
  autoChoose,
  random,
  record,
  availableMonths,
) {
  if (availableMonths < 2) return { ready: true, incomeYuan: 0 };
  const attemptNumber = state.employment.searchAttempts.filter(
    (attempt) => attempt.year === record.calendarYear,
  ).length + 1;
  const decisionId = `adult_job_opportunity_${record.calendarYear}_${attemptNumber}`;
  const candidates = generateAdultJobCandidates(
    state,
    calibration,
    jobCatalog,
    record.calendarYear,
    availableMonths,
    random,
  );
  const opportunityFact = addFact(record, "adult_job_candidates_generated", {
    decisionId,
    educationRank: state.education.educationRank,
    careerSkillHours: state.employment.careerSkillHours,
    jobSearchContacts: state.employment.jobSearchContacts,
    candidates: clone(candidates),
    employerNamesUnknownWithoutLocality: true,
  });
  const selected = chooseAdultCandidate(candidates, decisionId, choices, autoChoose, random);
  if (!selected) {
    state.status = "awaiting_choice";
    state.pendingDecision = {
      eventId: decisionId,
      title: "这一年出现的工作机会",
      prompt: "这些岗位的行业、单位性质、工时和收入不同。你先尝试哪一个？",
      calendarYear: record.calendarYear,
      age: record.age,
      options: candidates.map((candidate) => ({
        id: candidate.id,
        templateId: candidate.templateId,
        label: candidate.label,
        industry: candidate.industry,
        occupation: candidate.occupation,
        unitType: candidate.unitType,
        weeklyHours: candidate.weeklyHours,
        personalIncomeThisYearYuan: candidate.personalIncomeThisYearYuan,
      })),
    };
    return { ready: false, incomeYuan: 0 };
  }
  const choiceFact = addFact(record, "adult_job_candidate_selected", {
    decisionId,
    selectedCandidate: clone(selected.candidate),
    unchosenCandidates: candidates
      .filter((candidate) => candidate.id !== selected.candidate.id)
      .map((candidate) => clone(candidate)),
  });
  const decision = {
    eventId: decisionId,
    calendarYear: record.calendarYear,
    age: record.age,
    selectedOptionId: selected.candidate.id,
    selectedTemplateId: selected.candidate.templateId,
    unchosenOptionIds: candidates
      .filter((candidate) => candidate.id !== selected.candidate.id)
      .map((candidate) => candidate.id),
    unchosenCandidates: candidates
      .filter((candidate) => candidate.id !== selected.candidate.id)
      .map((candidate) => clone(candidate)),
    selectionMode: selected.selectionMode,
    sourceFactId: choiceFact.id,
    opportunityFactId: opportunityFact.id,
  };
  record.decisions.push(decision);
  state.decisions.push(decision);
  const hired = random() < selected.candidate.hiringProbability;
  const outcomeFact = addFact(record, "adult_job_application_outcome", {
    candidateId: selected.candidate.id,
    hired,
    modeledHiringProbability: selected.candidate.hiringProbability,
    specificRejectionReason: hired ? null : "not_observed",
  });
  state.employment.searchAttempts.push({
    year: record.calendarYear,
    candidateId: selected.candidate.id,
    hired,
    sourceFactId: outcomeFact.id,
  });
  state.employment.jobSearchContacts += randomInt(random, 2, 5);
  if (!hired) {
    changeStat(state, record, "mood", -1, outcomeFact.id, "这次具体岗位申请没有形成录用");
    return { ready: true, incomeYuan: 0 };
  }
  const job = createJobFromCandidate(state, selected.candidate, record.calendarYear, random);
  state.employment.currentJob = job;
  state.employment.history.push(clone(job));
  state.employment.status = job.employmentForm === "employee"
    ? "employed"
    : job.employmentForm;
  state.employment.lastFullYearIncomeYuan = job.annualizedIncomeYuan;
  const workFact = addFact(record, "adult_job_started", {
    ...clone(job),
    applicationOutcomeFactId: outcomeFact.id,
    nationalAverageWageAssignedDirectlyToPerson: false,
    laborRelationshipCreated: job.employmentForm === "employee",
  });
  changeStat(state, record, "ability", job.skillMatch ? 2 : 1, workFact.id, "在新的具体岗位开始积累经验");
  changeStat(state, record, "mood", 1, workFact.id, "求职形成了新的工作安排");
  return { ready: true, incomeYuan: job.annualIncomeThisYearYuan };
}

function settlePlannedCareerChange(state, record) {
  if (!state.employment.plannedChangeNextYear || !state.employment.currentJob) return;
  const job = state.employment.currentJob;
  job.endYear = record.calendarYear;
  job.endReason = "player_planned_change_at_year_end";
  const fact = addFact(record, "planned_job_change_prepared", {
    jobId: job.id,
    currentJobEndsAtYearEnd: true,
    jobSearchStartsNextYear: true,
  });
  const historyJob = state.employment.history.find((entry) => entry.id === job.id);
  if (historyJob) Object.assign(historyJob, clone(job));
  state.employment.currentJob = null;
  state.employment.status = "unemployed_searching";
  state.employment.plannedChangeNextYear = false;
  changeStat(state, record, "ability", 1, fact.id, "为下一年的转岗准备了技能和联系");
}

function individualMortalityProbability(age, healthValue, calibration, sexMultiplier = 1) {
  const assumption = calibration.assumptions.healthAndMortality;
  const baseline = assumption.mortalityBaseAtAge30
    * Math.exp((age - 30) * Math.log(2) / assumption.mortalityDoublingYears);
  // 健康现在表示“身体储备”而不是以50为健康新生儿的中点；78.5约等于进入成人期时
  // 队列的加权典型值。死亡基线本身已经按年龄校准，只让偏离典型储备的部分修正风险。
  const healthReference = assumption.typicalHealthyReserveScore ?? 78.5;
  const healthMultiplier = Math.exp((healthReference - healthValue) / 30);
  return clamp(baseline * healthMultiplier * sexMultiplier, 0.00003, 0.56);
}

function updateOriginFamily(state, calibration, random, record) {
  const facts = [];
  for (const member of state.family.originMembers.filter((entry) => entry.alive)) {
    const age = record.calendarYear - member.birthYear;
    const probability = individualMortalityProbability(
      age,
      48,
      calibration,
      member.sex === "male" ? 1.12 : 0.92,
    );
    if (age >= 45 && random() < probability) {
      member.alive = false;
      member.deathYear = record.calendarYear;
      const fact = addFact(record, "origin_family_member_death", {
        memberId: member.id,
        relation: member.relation,
        ageAtDeath: age,
        modeledAnnualProbability: roundTo(probability, 6),
        specificCause: null,
      });
      facts.push(fact);
      if (["mother", "father"].includes(member.relation)) {
        changeStat(state, record, "mood", -4, fact.id, "父母之一在本年去世");
        changeStat(state, record, "relationships", -2, fact.id, "原生家庭的重要关系结束");
      }
    }
  }
  return facts;
}

function childLifeStage(age) {
  if (age <= 2) return "infancy";
  if (age <= 5) return "early_childhood";
  if (age <= 11) return "primary_school_age";
  if (age <= 14) return "junior_secondary_age";
  if (age <= 17) return "senior_secondary_age";
  if (age <= 22) return "youth_transition";
  return "adult_independent_life";
}

function updateOriginFamilyCare(state, record) {
  const parents = state.family.originMembers.filter((member) => (
    member.alive && ["mother", "father"].includes(member.relation)
  ));
  if (parents.length === 0) return null;
  const parentAges = parents.map((member) => ({
    memberId: member.id,
    relation: member.relation,
    age: record.calendarYear - member.birthYear,
  }));
  const olderParentCount = parentAges.filter((parent) => parent.age >= 65).length;
  const fact = addFact(record, "origin_family_support_year", {
    parentAges,
    livingParentCount: parents.length,
    olderParentCount,
    familyCareHoursPerWeek: state.routine.familyCareHoursPerWeek,
    specificCareNeedKnown: false,
  });
  if (
    olderParentCount > 0
    && state.routine.familyCareHoursPerWeek >= 10
    && record.calendarYear % 3 === 0
  ) {
    changeStat(state, record, "relationships", 1, fact.id, "持续给年长父母留出照护和陪伴时间");
  }
  return fact;
}

function updatePartnerAndChild(state, calibration, economic, random, record) {
  const partner = state.family.partner;
  if (partner?.alive && state.family.relationshipStatus === "partnered") {
    const partnerAge = record.calendarYear - partner.birthYear;
    const priorReference = partner.job.lastReferenceAmountYuan
      ?? partner.job.incomeReference?.amountYuan
      ?? economic.urbanPrivateUnitAverageWageYuan;
    const wageReference = ["self_employment", "family_economic_activity"].includes(
      partner.job.employmentForm,
    )
      ? {
          amountYuan: economic.residentIncomePerPersonYuan,
          field: "residentIncomePerPersonYuan",
          exactScopeMatch: false,
        }
      : wageReferenceForUnit(economic, partner.job.unitType);
    const growth = clamp(wageReference.amountYuan / Math.max(1, priorReference), 0.75, 1.35);
    partner.job.annualizedIncomeYuan = roundTo(
      partner.job.annualizedIncomeYuan * growth * (0.98 + random() * 0.07),
      2,
    );
    partner.job.lastReferenceAmountYuan = wageReference.amountYuan;
    partner.annualIncomeYuan = partner.job.annualizedIncomeYuan;
    const qualityBefore = state.family.relationshipQuality;
    const qualityChange =
      (state.routine.relationshipHoursPerWeek >= 8 ? 1 : -1)
      + (state.finance.unsecuredDebtYuan > economic.residentIncomePerPersonYuan ? -1 : 0)
      + (state.routine.familyCareHoursPerWeek >= 10 ? -1 : 0)
      + randomInt(random, -1, 1);
    state.family.relationshipQuality = score(qualityBefore + qualityChange);
    const strainProbability = clamp(
      calibration.assumptions.relationshipFormation.annualRelationshipStrainBase
        + Math.max(0, 45 - state.family.relationshipQuality) * 0.006,
      0.005,
      0.25,
    );
    const separated = random() < strainProbability;
    const fact = addFact(record, "partner_relationship_year", {
      partnerId: partner.id,
      partnerAge,
      partnerOccupation: partner.job.occupation,
      partnerAnnualIncomeYuan: partner.annualIncomeYuan,
      relationshipHoursPerWeek: state.routine.relationshipHoursPerWeek,
      qualityBefore,
      qualityAfter: state.family.relationshipQuality,
      modeledSeparationProbability: roundTo(strainProbability, 5),
      separated,
    });
    const partnerDeathProbability = individualMortalityProbability(
      partnerAge,
      50,
      calibration,
      partner.sex === "male" ? 1.12 : 0.92,
    );
    if (random() < partnerDeathProbability) {
      partner.alive = false;
      partner.deathYear = record.calendarYear;
      state.family.relationshipStatus = "widowed";
      const deathFact = addFact(record, "partner_death", {
        partnerId: partner.id,
        partnerAgeAtDeath: partnerAge,
        modeledAnnualProbability: roundTo(partnerDeathProbability, 6),
        specificCause: null,
      });
      changeStat(state, record, "mood", -7, deathFact.id, "共同生活的伴侣在本年去世");
      changeStat(state, record, "relationships", -5, deathFact.id, "伴侣关系在本年结束");
    } else if (separated) {
      state.family.relationshipStatus = "separated";
      state.family.relationshipQuality = null;
      const separationFact = addFact(record, "partner_household_separated", {
        partnerId: partner.id,
        specificReason: null,
        relationshipYearFactId: fact.id,
      });
      changeStat(state, record, "mood", -4, separationFact.id, "共同生活关系结束");
      changeStat(state, record, "relationships", -3, separationFact.id, "伴侣离开共同生活家庭");
    } else if (qualityChange >= 1 && record.calendarYear % 4 === 0) {
      changeStat(state, record, "relationships", 1, fact.id, "本年持续投入伴侣关系时间");
    }
  }
  if (state.family.child) {
    const child = state.family.child;
    const childAge = record.calendarYear - child.birthYear;
    const previousLifeStage = child.currentLifeStage ?? null;
    const lifeStage = childLifeStage(childAge);
    const baseInteractionHours = childAge <= 12 ? 10 : (childAge <= 18 ? 6 : 2);
    const olderParentCount = state.family.originMembers.filter((member) => (
      member.alive
      && ["mother", "father"].includes(member.relation)
      && record.calendarYear - member.birthYear >= 65
    )).length;
    const careRecipientCount = 1 + olderParentCount;
    const childCareShareHours = state.routine.familyCareHoursPerWeek / careRecipientCount;
    const interactionHours = roundTo(clamp(
      baseInteractionHours + Math.max(0, childCareShareHours - 3) * 0.65,
      1,
      18,
    ), 2);
    child.currentLifeStage = lifeStage;
    child.supportYears = (child.supportYears ?? 0) + 1;
    if (interactionHours >= 12) child.highSupportYears = (child.highSupportYears ?? 0) + 1;
    child.relationshipWithPlayer = score(
      (child.relationshipWithPlayer ?? 60)
      + (interactionHours >= 12 ? 1 : (interactionHours <= 3 ? -1 : 0)),
    );
    if (lifeStage === "adult_independent_life" && child.independentSinceYear == null) {
      child.independentSinceYear = record.calendarYear;
    }
    const fact = addFact(record, "child_year", {
      childId: child.id,
      childAge,
      coResident: childAge <= 22,
      lifeStage,
      previousLifeStage,
      playerInteractionHoursPerWeek: interactionHours,
      familyCareHoursSharedWithOlderParents: olderParentCount > 0,
      relationshipWithPlayer: child.relationshipWithPlayer,
      accumulatedSupportYears: child.supportYears,
      accumulatedHighSupportYears: child.highSupportYears,
      educationStatus: childAge >= 6 && childAge <= 17
        ? "school_age_without_individual_enrollment_record"
        : null,
      childIndependentLifeNotSimulated: childAge > 22,
    });
    if (previousLifeStage && previousLifeStage !== lifeStage) {
      addFact(record, "child_life_stage_transition", {
        childId: child.id,
        childAge,
        from: previousLifeStage,
        to: lifeStage,
        sourceChildYearFactId: fact.id,
      });
    }
    if ([3, 6, 12, 15, 18, 23].includes(childAge)) {
      changeStat(state, record, "relationships", 1, fact.id, "孩子进入新的成长阶段");
    }
  }
}

function settleHousingAction(state, calibration, economic, estimatedIncome, record) {
  const action = state.housing.pendingAction;
  if (!action) return;
  state.usedAssumptionIds.add(calibration.assumptions.housing.id);
  if (action === "continue_renting") {
    state.housing.tenure = "private_rental";
    state.housing.arrangement = "independent_rental";
    addFact(record, "housing_choice_outcome", {
      action,
      result: "continued_or_started_private_rental",
      locality: null,
      specificRentMarketData: null,
    });
  } else if (action === "stay_or_return_family_housing") {
    state.housing.tenure = state.residence === "rural"
      ? "family_house_on_collective_land"
      : "living_with_origin_family";
    state.housing.arrangement = "family_housing";
    state.housing.annualRentYuan = 0;
    addFact(record, "housing_choice_outcome", {
      action,
      result: "family_housing_used",
      propertyOwnedByPlayer: false,
      locality: null,
    });
  } else if (action === "attempt_purchase") {
    const assumption = calibration.assumptions.housing;
    const annualIncomeBasis = Math.max(estimatedIncome, economic.residentIncomePerPersonYuan);
    const purchasePrice = roundTo(
      annualIncomeBasis * assumption.purchasePriceMultipleOfAnnualHouseholdIncome,
      2,
    );
    const downPayment = roundTo(purchasePrice * assumption.downPaymentShare, 2);
    const canPay = state.finance.liquidSavingsYuan >= downPayment;
    if (canPay) {
      const principal = purchasePrice - downPayment;
      const rate = assumption.mortgageAnnualRate;
      const years = assumption.mortgageYears;
      const payment = principal * rate / (1 - (1 + rate) ** (-years));
      state.finance.liquidSavingsYuan = roundTo(
        state.finance.liquidSavingsYuan - downPayment,
        2,
      );
      state.housing.tenure = "owner_occupied_mortgaged_home";
      state.housing.arrangement = "owner_occupied";
      state.housing.assetValueYuan = purchasePrice;
      state.housing.mortgageDebtYuan = roundTo(principal, 2);
      state.housing.mortgageAnnualPaymentYuan = roundTo(payment, 2);
      state.housing.mortgageYearsRemaining = years;
      state.housing.purchaseYear = record.calendarYear;
      addFact(record, "housing_choice_outcome", {
        action,
        result: "home_purchased_with_mortgage",
        purchasePriceYuan: purchasePrice,
        downPaymentYuan: downPayment,
        initialMortgagePrincipalYuan: roundTo(principal, 2),
        assumedAnnualMortgageRate: rate,
        assumedMortgageYears: years,
        annualPaymentYuan: roundTo(payment, 2),
        locality: null,
        floorAreaSquareMeters: null,
      });
    } else {
      addFact(record, "housing_choice_outcome", {
        action,
        result: "purchase_not_completed",
        requiredDownPaymentYuan: downPayment,
        availableLiquidSavingsYuan: state.finance.liquidSavingsYuan,
        shortfallYuan: roundTo(downPayment - state.finance.liquidSavingsYuan, 2),
        specificProperty: null,
      });
      state.housing.tenure = "private_rental";
      state.housing.arrangement = "independent_rental_after_purchase_shortfall";
    }
  }
  state.housing.pendingAction = null;
}

function settleMortgage(state, record) {
  if (state.housing.mortgageDebtYuan <= 0 || state.housing.mortgageYearsRemaining <= 0) {
    return 0;
  }
  const payment = Math.min(
    state.housing.mortgageAnnualPaymentYuan,
    state.housing.mortgageDebtYuan
      * (1 + 0.055),
  );
  const interest = state.housing.mortgageDebtYuan * 0.055;
  const principalPaid = Math.max(0, payment - interest);
  state.housing.mortgageDebtYuan = roundTo(
    Math.max(0, state.housing.mortgageDebtYuan - principalPaid),
    2,
  );
  state.housing.mortgageYearsRemaining -= 1;
  addFact(record, "mortgage_year", {
    paymentYuan: roundTo(payment, 2),
    interestYuan: roundTo(interest, 2),
    principalPaidYuan: roundTo(principalPaid, 2),
    endingMortgageDebtYuan: state.housing.mortgageDebtYuan,
    yearsRemaining: state.housing.mortgageYearsRemaining,
  });
  if (state.housing.mortgageDebtYuan === 0) {
    state.housing.tenure = "owner_occupied_debt_free_home";
  }
  return roundTo(payment, 2);
}

function settleAdultFinance(
  state,
  calibration,
  economic,
  incomeParts,
  record,
) {
  state.usedAssumptionIds.add(calibration.assumptions.adultFinance.id);
  state.usedAssumptionIds.add(calibration.assumptions.visibleStats.id);
  const partnerIncome = state.family.relationshipStatus === "partnered"
    ? (state.family.partner?.annualIncomeYuan ?? 0)
    : 0;
  const personIncome = roundTo(
    incomeParts.careerIncomeYuan
      + incomeParts.newJobIncomeYuan
      + (state.education.partTimeIncomeThisYearYuan ?? 0)
      + incomeParts.pensionIncomeYuan,
    2,
  );
  const householdIncomeBeforeSupport = personIncome + partnerIncome;
  const householdSize = 1
    + (state.family.relationshipStatus === "partnered" ? 1 : 0)
    + (state.family.child && record.calendarYear - state.family.child.birthYear <= 22 ? 1 : 0);
  const educationExpense = state.education.educationExpenseThisYearYuan ?? 0;
  const originFamilySupport = state.education.higher?.status === "enrolled"
    ? roundTo(Math.max(
        0,
        economic.residentIncomePerPersonYuan * 0.68 + educationExpense
          - householdIncomeBeforeSupport,
      ), 2)
    : 0;
  const totalIncome = roundTo(householdIncomeBeforeSupport + originFamilySupport, 2);
  settleHousingAction(state, calibration, economic, totalIncome, record);
  const baseShare = clamp(
    calibration.assumptions.adultFinance.baseLivingExpenseShare
      - state.finance.savingRateAdjustment,
    0.34,
    0.72,
  );
  const minimumLiving = economic.residentIncomePerPersonYuan
    * householdSize
    * calibration.assumptions.adultFinance.minimumExpenseShareOfResidentReference;
  const livingExpense = roundTo(Math.max(minimumLiving, totalIncome * baseShare), 2);
  const rent = state.housing.tenure === "private_rental"
    ? roundTo(
        Math.max(totalIncome, economic.residentIncomePerPersonYuan)
          * calibration.assumptions.housing.annualRentShareOfIncome,
        2,
      )
    : 0;
  state.housing.annualRentYuan = rent;
  const mortgagePayment = settleMortgage(state, record);
  const childExpense = state.family.child
    && record.calendarYear - state.family.child.birthYear <= 22
    ? roundTo(
        economic.residentIncomePerPersonYuan
          * calibration.assumptions.adultFinance.childExpenseShareOfResidentReference,
        2,
      )
    : 0;
  const parentCareExpense = roundTo(
    totalIncome * state.family.familyCareCashShare,
    2,
  );
  const medicalExpense = roundTo(
    economic.residentIncomePerPersonYuan
      * ((state.health.medicalExpenseReferenceShare ?? 0)
        + state.health.chronicEventCount * 0.035),
    2,
  );
  const annualOperationExpense = roundTo(
    state.finance.pendingAnnualOperationExpenseYuan ?? 0,
    2,
  );
  const totalExpense = roundTo(
    livingExpense
      + rent
      + mortgagePayment
      + childExpense
      + parentCareExpense
      + medicalExpense
      + educationExpense
      + annualOperationExpense,
    2,
  );
  let cashChange = totalIncome - totalExpense;
  let debtRepaid = 0;
  let debtAdded = 0;
  if (cashChange >= 0) {
    debtRepaid = Math.min(state.finance.unsecuredDebtYuan, cashChange);
    state.finance.unsecuredDebtYuan = roundTo(
      state.finance.unsecuredDebtYuan - debtRepaid,
      2,
    );
    state.finance.liquidSavingsYuan = roundTo(
      state.finance.liquidSavingsYuan + cashChange - debtRepaid,
      2,
    );
  } else {
    const fromSavings = Math.min(state.finance.liquidSavingsYuan, -cashChange);
    state.finance.liquidSavingsYuan = roundTo(
      state.finance.liquidSavingsYuan - fromSavings,
      2,
    );
    debtAdded = Math.max(0, -cashChange - fromSavings);
    state.finance.unsecuredDebtYuan = roundTo(
      state.finance.unsecuredDebtYuan + debtAdded,
      2,
    );
  }
  state.finance.housingAssetValueYuan = state.housing.assetValueYuan;
  state.finance.housingDebtYuan = state.housing.mortgageDebtYuan;
  state.finance.netWorthYuan = roundTo(
    state.finance.liquidSavingsYuan
      + state.finance.housingAssetValueYuan
      - state.finance.housingDebtYuan
      - state.finance.unsecuredDebtYuan,
    2,
  );
  state.finance.cumulativePersonalIncomeYuan = roundTo(
    state.finance.cumulativePersonalIncomeYuan + personIncome,
    2,
  );
  const fact = addFact(record, "adult_household_finance", {
    personCareerAndPensionIncomeYuan: personIncome,
    partnerIncomeYuan: roundTo(partnerIncome, 2),
    originFamilySupportYuan: originFamilySupport,
    annualHouseholdCashIncomeYuan: totalIncome,
    adultHouseholdSize: householdSize,
    livingExpenseYuan: livingExpense,
    rentYuan: rent,
    mortgagePaymentYuan: mortgagePayment,
    childExpenseYuan: childExpense,
    parentCareExpenseYuan: parentCareExpense,
    medicalExpenseYuan: medicalExpense,
    higherEducationExpenseYuan: educationExpense,
    annualOperationExpenseYuan: annualOperationExpense,
    annualTotalExpenseYuan: totalExpense,
    cashChangeBeforeDebtYuan: roundTo(cashChange, 2),
    debtRepaidYuan: roundTo(debtRepaid, 2),
    debtAddedYuan: roundTo(debtAdded, 2),
    endingLiquidSavingsYuan: state.finance.liquidSavingsYuan,
    endingUnsecuredDebtYuan: state.finance.unsecuredDebtYuan,
    housingAssetValueYuan: state.finance.housingAssetValueYuan,
    endingHousingDebtYuan: state.finance.housingDebtYuan,
    endingNetWorthYuan: state.finance.netWorthYuan,
    residentIncomePerPersonReferenceYuan: economic.residentIncomePerPersonYuan,
    referenceDataStatus: economic.dataStatus,
    scenarioId: economic.scenarioId,
    originFamilyEconomicsPooledAfterIndependence: false,
  });
  const wealthValue = 50 + 15 * Math.asinh(
    state.finance.netWorthYuan / Math.max(1, economic.residentIncomePerPersonYuan * 3),
  );
  setStat(state, record, "wealth", wealthValue, fact.id, "由流动储蓄、住房资产和实际债务形成的净资产重算");
  if (debtAdded > 0) {
    changeStat(state, record, "mood", -1, fact.id, "本年支出超过收入和可用储蓄，新增了债务");
  }
  state.finance.lastAnnualRecord = clone(fact);
  state.education.educationExpenseThisYearYuan = 0;
  state.education.partTimeIncomeThisYearYuan = 0;
  state.health.medicalExpenseReferenceShare = 0;
  return fact;
}

function settleAdultWellbeingContinuity(state, record) {
  const hadChronicEvent = record.facts.some(
    (fact) => fact.type === "adult_health_year_summary" && fact.chronicHealthEventOccurred,
  );
  const lostJob = record.facts.some((fact) => fact.type === "employment_ended");
  const lostClosePerson = record.facts.some(
    (fact) => ["partner_death", "origin_family_member_death"].includes(fact.type)
      && ["partner", "mother", "father"].includes(fact.relation ?? "partner"),
  );
  let protectiveConditions = 0;
  if (
    state.family.relationshipStatus === "partnered"
    && state.family.relationshipQuality >= 60
  ) protectiveConditions += 1;
  if (state.routine.socialHoursPerWeek >= 5) protectiveConditions += 1;
  if (state.routine.exerciseHoursPerWeek >= 2) protectiveConditions += 1;
  if (state.finance.unsecuredDebtYuan === 0) protectiveConditions += 1;
  if (state.employment.status === "retired") protectiveConditions += 1;
  const fact = addFact(record, "adult_wellbeing_continuity", {
    protectiveConditions,
    partneredWithQualityAtLeast60:
      state.family.relationshipStatus === "partnered"
      && state.family.relationshipQuality >= 60,
    socialHoursPerWeek: state.routine.socialHoursPerWeek,
    exerciseHoursPerWeek: state.routine.exerciseHoursPerWeek,
    unsecuredDebtYuan: state.finance.unsecuredDebtYuan,
    retired: state.employment.status === "retired",
    majorDisruptionThisYear: hadChronicEvent || lostJob || lostClosePerson,
  });
  if (
    !hadChronicEvent
    && !lostJob
    && !lostClosePerson
    && protectiveConditions >= 2
    && record.calendarYear % 2 === 0
  ) {
    changeStat(
      state,
      record,
      "mood",
      protectiveConditions >= 4 ? 2 : 1,
      fact.id,
      "本年稳定的关系、活动、健康习惯或财务状态形成日常恢复",
    );
  }
}

function pensionIncomeForYear(state, calibration, year) {
  if (state.employment.status !== "retired") return 0;
  const base = state.employment.pensionBaseAnnualYuan
    ?? state.employment.lastFullYearIncomeYuan
      * calibration.assumptions.retirement.pensionReplacementShare;
  const retiredYears = Math.max(0, year - state.employment.retiredYear);
  return roundTo(base * 1.025 ** retiredYears, 2);
}

function finalizeRetirementIfNeeded(state, calibration, record) {
  if (!state.employment.retireAtEndOfYear || !state.employment.currentJob) return;
  state.usedAssumptionIds.add(calibration.assumptions.retirement.id);
  state.usedObservationSourceIds.add("npc_gradual_retirement_2025");
  const job = state.employment.currentJob;
  job.endYear = record.calendarYear;
  job.endReason = "retirement";
  const historyJob = state.employment.history.find((entry) => entry.id === job.id);
  if (historyJob) Object.assign(historyJob, clone(job));
  state.employment.pensionBaseAnnualYuan = roundTo(
    state.employment.lastFullYearIncomeYuan
      * calibration.assumptions.retirement.pensionReplacementShare,
    2,
  );
  state.employment.currentJob = null;
  state.employment.status = "retired";
  state.employment.retiredYear = record.calendarYear;
  state.employment.retireAtEndOfYear = false;
  addFact(record, "retirement_started", {
    retirementYear: record.calendarYear,
    retirementAge: record.age,
    retirementAgeEstimate: clone(state.employment.retirement),
    estimatedAnnualPensionAtStartYuan: state.employment.pensionBaseAnnualYuan,
    pensionReplacementShareAssumption:
      calibration.assumptions.retirement.pensionReplacementShare,
    exactContributionHistoryKnown: false,
  });
}

function settlePlayerMortality(state, calibration, random, record, debugMinimumSurvivalAge = null) {
  const sexMultiplier = state.sex === "male" ? 1.13 : 0.90;
  let probability = individualMortalityProbability(
    record.age,
    state.visibleStats.health.value,
    calibration,
    sexMultiplier,
  );
  if (state.health.chronicEventCount > 0) {
    probability *= 1 + state.health.chronicEventCount * 0.12;
  }
  if (record.age >= calibration.scope.maximumAge) probability = 1;
  probability = clamp(probability, 0.00003, 1);
  const mortalitySuppressedForDebug = Number.isFinite(debugMinimumSurvivalAge)
    && record.age < debugMinimumSurvivalAge
    && record.age < calibration.scope.maximumAge;
  const died = !mortalitySuppressedForDebug && random() < probability;
  const fact = addFact(record, "adult_mortality_outcome", {
    died,
    modeledAnnualProbability: roundTo(probability, 7),
    age: record.age,
    healthValueAtSettlement: state.visibleStats.health.value,
    chronicHealthEventCount: state.health.chronicEventCount,
    specificCause: null,
    nationalLifeExpectancyReference: clone(calibration.observations.lifeExpectancyAtBirth),
    nationalLifeExpectancyAssignedAsPersonalDeathAge: false,
    mortalitySuppressedForDebug,
    debugMinimumSurvivalAge: mortalitySuppressedForDebug ? debugMinimumSurvivalAge : null,
  });
  state.usedObservationSourceIds.add(
    calibration.observations.lifeExpectancyAtBirth.sourceId,
  );
  if (died) {
    if (state.employment.currentJob) {
      state.employment.currentJob.endYear = record.calendarYear;
      state.employment.currentJob.endReason = "player_death";
      const historyJob = state.employment.history.find(
        (entry) => entry.id === state.employment.currentJob.id,
      );
      if (historyJob) Object.assign(historyJob, clone(state.employment.currentJob));
    }
    state.status = "completed_stage";
    state.ending = {
      id: record.age < 60 ? "death_before_age_60" : "death_after_age_60",
      calendarYear: record.calendarYear,
      age: record.age,
      sourceFactId: fact.id,
      specificCause: null,
    };
  }
  return died;
}

function relationshipSummary(state) {
  if (state.family.relationshipStatus === "partnered") return "partnered_at_death";
  if (state.family.relationshipStatus === "widowed") return "partner_died_before_player";
  if (state.family.relationshipStatus === "separated") return "partnership_ended";
  return "no_partner_household_at_end";
}

function chooseReviewArchetype(state) {
  const stats = state.visibleStats;
  if (state.ending.age < 60) return "unfinished_journey";
  if (
    state.employment.promotions >= 2
    && stats.ability.value >= 70
  ) return "skill_became_lifelong_work";
  if (
    ["partnered", "widowed"].includes(state.family.relationshipStatus)
    && stats.relationships.value >= 65
  ) return "a_long_road_with_company";
  if (stats.wealth.value >= 65 && stats.mood.value >= 65) return "unhurried_and_resourced";
  if (stats.wealth.value >= 68 && stats.mood.value < 43 && stats.relationships.value < 43) {
    return "busy_years_quiet_room";
  }
  return "ordinary_complete_life";
}

function makeLifeReview(state) {
  const jobYears = roundTo(state.employment.totalYearsWorked, 1);
  const jobHistory = state.employment.history.map((job) => ({
    jobId: job.id,
    startYear: job.startYear,
    endYear: job.endYear,
    industry: job.industry,
    occupation: job.occupation,
    unitType: job.unitType,
    highestPositionLevel: job.positionLevel,
  }));
  const untraveledPaths = state.decisions.flatMap((decision) =>
    (decision.unchosenOptions ?? decision.unchosenCandidates ?? decision.unchosenOptionIds ?? [])
      .map((option) => ({
        decisionYear: decision.calendarYear,
        decisionAge: decision.age,
        eventId: decision.eventId,
        unchosen: clone(option),
      })),
  );
  return {
    archetypeId: chooseReviewArchetype(state),
    birthYear: state.birthYear,
    deathYear: state.ending.calendarYear,
    ageAtDeath: state.ending.age,
    highestCompletedEducation: state.education.highestCompleted,
    higherEducation: state.education.higher
      ? {
          status: state.education.higher.status,
          level: state.education.higher.level,
          field: state.education.higher.field,
          graduationYear: state.education.higher.graduationYear,
        }
      : null,
    jobYears,
    jobCount: jobHistory.length,
    jobHistory,
    promotionCount: state.employment.promotions,
    retiredYear: state.employment.retiredYear,
    relationshipSummary: relationshipSummary(state),
    childBorn: state.family.child != null,
    finalHousingTenure: state.housing.tenure,
    finalLiquidSavingsYuan: state.finance.liquidSavingsYuan,
    finalHousingAssetValueYuan: state.finance.housingAssetValueYuan,
    finalDebtYuan: roundTo(
      state.finance.unsecuredDebtYuan + state.finance.housingDebtYuan,
      2,
    ),
    finalNetWorthYuan: state.finance.netWorthYuan,
    finalStats: Object.fromEntries(
      STAT_KEYS.map((key) => [key, state.visibleStats[key].value]),
    ),
    decisionCount: state.decisions.length,
    untraveledPaths,
    historicalYearsExperienced: {
      first: state.annualRecords[0]?.calendarYear ?? null,
      last: Math.min(state.ending.calendarYear, state.historicalDataThrough),
    },
    scenarioYearsExperienced: Math.max(
      0,
      state.ending.calendarYear - state.historicalDataThrough,
    ),
  };
}

function snapshot(state) {
  return {
    stageStatus: state.status,
    educationStatus: state.education.higher?.status ?? state.education.highestCompleted,
    employmentStatus: state.employment.status,
    currentJobId: state.employment.currentJob?.id ?? null,
    relationshipStatus: state.family.relationshipStatus,
    relationshipQuality: state.family.relationshipQuality,
    childAge: state.family.child
      ? state.currentAge - (state.family.child.birthYear - state.birthYear)
      : null,
    housingTenure: state.housing.tenure,
    liquidSavingsYuan: state.finance.liquidSavingsYuan,
    netWorthYuan: state.finance.netWorthYuan,
    savingRateAdjustment: state.finance.savingRateAdjustment,
    routine: clone(state.routine),
    visibleStats: Object.fromEntries(STAT_KEYS.map((key) => [key, state.visibleStats[key].value])),
  };
}

function serializeState(state) {
  return {
    schemaVersion: state.schemaVersion,
    seed: state.seed,
    personId: state.personId,
    birthYear: state.birthYear,
    sex: state.sex,
    residence: state.residence,
    status: state.status,
    currentAge: state.currentAge,
    historicalDataThrough: state.historicalDataThrough,
    originHousehold: state.originHousehold,
    education: state.education,
    employment: state.employment,
    routine: state.routine,
    family: state.family,
    socialNetwork: state.socialNetwork,
    interests: state.interests,
    childhoodGrowth: state.childhoodGrowth,
    youthMainlinePayoffs: state.youthMainlinePayoffs,
    randomEventHistory: state.randomEventHistory,
    housing: state.housing,
    finance: state.finance,
    health: state.health,
    visibleStats: state.visibleStats,
    characterModel: state.characterModel,
    annualRecords: state.annualRecords,
    priorDecisions: state.priorDecisions,
    decisions: state.decisions,
    ...(state.pendingDecision ? { pendingDecision: state.pendingDecision } : {}),
    ending: state.ending,
    ...(state.lifeReview ? { lifeReview: state.lifeReview } : {}),
    provenance: {
      observationSourceIds: [...state.usedObservationSourceIds].sort(),
      assumptionIds: [...state.usedAssumptionIds].sort(),
      scenarioIds: [...state.usedScenarioIds].sort(),
    },
  };
}

/**
 * 从普通高校入口或首份实际工作推进到死亡，并生成人生复盘。
 */
export function simulateAdultLife(
  birthProfile,
  youth,
  calibration,
  eventConfig,
  jobCatalog,
  options = {},
) {
  if (youth.status !== "completed_stage" || !youth.ending) {
    throw new Error(`成年阶段要求已完成的青年入口状态，收到：${youth.status}`);
  }
  const seed = String(options.seed ?? `${youth.seed}:adult-life`);
  const choices = options.choices ?? {};
  const autoChoose = options.autoChoose ?? true;
  const initializationRandom = createSeededRandom(`${seed}:initialization`);
  const state = makeInitialState(
    birthProfile,
    youth,
    calibration,
    seed,
    initializationRandom,
  );
  state.usedAssumptionIds.add(calibration.assumptions.retirement.id);
  const startAge = youth.ending.age + 1;

  for (let age = startAge; age <= calibration.scope.maximumAge; age += 1) {
    const year = state.birthYear + age;
    const random = createSeededRandom(`${seed}:${year}:${age}`);
    const economic = getAdultEconomicReference(calibration, year, state.residence);
    addSources(state, [...economic.residentSourceIds, ...economic.wageSourceIds]);
    if (economic.scenarioId) {
      state.usedScenarioIds.add(economic.scenarioId);
      state.usedAssumptionIds.add(calibration.assumptions.futureScenarioUse.id);
    }
    const milestones = calibration.observations.policyMilestones.filter(
      (milestone) => milestone.year === year,
    );
    addSources(state, milestones.map((milestone) => milestone.sourceId));
    const record = {
      calendarYear: year,
      age,
      dataStatus: economic.dataStatus,
      facts: [],
      statChanges: [],
      decisions: [],
      endState: null,
    };
    state.currentAge = age;
    addFact(record, "adult_year_context", {
      residence: state.residence,
      dataStatus: economic.dataStatus,
      scenarioId: economic.scenarioId,
      policyMilestones: clone(milestones),
      residentIncomePerPersonReferenceYuan: economic.residentIncomePerPersonYuan,
      urbanNonPrivateUnitAverageWageReferenceYuan:
        economic.urbanNonPrivateUnitAverageWageYuan,
      urbanPrivateUnitAverageWageReferenceYuan:
        economic.urbanPrivateUnitAverageWageYuan,
    });
    const healthFact = simulateAdultHealth(state, calibration, random, record);
    updateOriginFamily(state, calibration, random, record);

    const annualReady = handleAnnualOperation({
      state,
      record,
      catalog: options.annualOperationCatalog,
      content: options.quarterlyLifeContent,
      stage: "adult",
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
        educationStatus: state.education.higher?.status ?? null,
        employmentStatus: state.employment.status,
        relationshipStatus: state.family.relationshipStatus,
        occupation: state.employment.currentJob?.occupation ?? null,
        industry: state.employment.currentJob?.industry ?? null,
        hasChild: Boolean(state.family.child),
        olderParentCount: state.family.originMembers.filter((member) => (
          member.alive
          && ["mother", "father"].includes(member.relation)
          && year - member.birthYear >= 65
        )).length,
        cashReferenceYuan: economic.residentIncomePerPersonYuan,
        affordableCashYuan: Math.max(
          0,
          state.finance.liquidSavingsYuan * 0.05
            + Math.max(
              0,
              (state.finance.lastAnnualRecord?.annualHouseholdCashIncomeYuan ?? 0)
                - (state.finance.lastAnnualRecord?.annualTotalExpenseYuan ?? 0),
            ) * 0.25
            - state.finance.unsecuredDebtYuan * 0.05,
        ),
      },
    });
    if (!annualReady) {
      record.endState = snapshot(state);
      state.annualRecords.push(record);
      break;
    }
    const adultSocialRole = state.education.higher?.status === "enrolled"
      ? "higher_peer"
      : (state.employment.currentJob ? "work_contact" : "adult_friend");
    updateSocialCharacters({
      state,
      record,
      catalog: options.socialCharacterCatalog,
      roleId: adultSocialRole,
      operationId: record.annualOperation?.chosenOptionId,
      createByDefault: state.education.higher?.status === "enrolled"
        && state.education.higher.currentYear === 1,
      random: createSeededRandom(`${seed}:social:${year}:${adultSocialRole}`),
      addFact,
    });

    const ready = handleConfiguredEvent(
      state,
      calibration,
      eventConfig,
      jobCatalog,
      choices,
      autoChoose,
      random,
      record,
    );
    if (!ready) {
      record.endState = snapshot(state);
      state.annualRecords.push(record);
      break;
    }

    let careerIncomeYuan = 0;
    let newJobIncomeYuan = 0;
    let needsJobSearch = false;
    let availableMonths = 0;
    if (state.education.higher?.status === "enrolled") {
      const higherOutcome = simulateHigherEducationYear(
        state,
        calibration,
        economic,
        healthFact,
        random,
        record,
      );
      needsJobSearch = higherOutcome.needsJobSearch;
      availableMonths = higherOutcome.availableMonths;
    } else if (state.employment.status !== "retired") {
      const careerOutcome = simulateCurrentJob(state, calibration, economic, random, record);
      careerIncomeYuan = careerOutcome.personalIncomeYuan;
      needsJobSearch = careerOutcome.needsJobSearch
        || (!state.employment.currentJob && state.employment.status !== "retired");
      availableMonths = careerOutcome.availableMonths ?? 12;
    }
    if (needsJobSearch) {
      const search = handleAdultJobSearch(
        state,
        calibration,
        jobCatalog,
        choices,
        autoChoose,
        random,
        record,
        Math.max(availableMonths, state.employment.searchAttempts.length === 0 ? 6 : 10),
      );
      if (!search.ready) {
        record.endState = snapshot(state);
        state.annualRecords.push(record);
        break;
      }
      newJobIncomeYuan = search.incomeYuan;
    }

    updateOriginFamilyCare(state, record);
    updatePartnerAndChild(state, calibration, economic, random, record);
    const pensionIncomeYuan = pensionIncomeForYear(state, calibration, year);
    settleAdultFinance(
      state,
      calibration,
      economic,
      { careerIncomeYuan, newJobIncomeYuan, pensionIncomeYuan },
      record,
    );
    settleAdultWellbeingContinuity(state, record);
    settlePlannedCareerChange(state, record);
    finalizeRetirementIfNeeded(state, calibration, record);
    const died = settlePlayerMortality(
      state,
      calibration,
      random,
      record,
      options.debugMinimumSurvivalAge,
    );
    if (!died) {
      const reviewReady = handleYearReview({
        state,
        record,
        stage: "adult",
        reviewedYears: options.reviewedYears,
        autoChoose,
        enabled: Boolean(options.annualOperationCatalog),
      });
      if (!reviewReady) {
        record.endState = snapshot(state);
        state.annualRecords.push(record);
        break;
      }
    }
    record.endState = snapshot(state);
    state.annualRecords.push(record);
    if (died) break;
  }

  if (state.status === "in_progress") {
    throw new Error("成年人生在最大年龄后仍未形成死亡结局");
  }
  if (state.status === "completed_stage") {
    if (state.employment.currentJob) {
      const historyJob = state.employment.history.find(
        (entry) => entry.id === state.employment.currentJob.id,
      );
      if (historyJob) Object.assign(historyJob, clone(state.employment.currentJob));
    }
    state.lifeReview = makeLifeReview(state);
  }
  return serializeState(state);
}
