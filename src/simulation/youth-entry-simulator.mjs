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
import { applyStoredPayoffCredits } from "./youth-mainline-payoff-system.mjs";

const STAT_KEYS = ["health", "wealth", "mood", "ability", "relationships"];
const SKILL_DIRECTIONS = [
  "machine_operation",
  "electrical_maintenance",
  "garment_and_textile",
  "retail_service",
  "basic_accounting",
  "food_service",
  "logistics",
  "construction",
  "agricultural_production",
];

function clone(value) {
  return structuredClone(value);
}

function logit(probability) {
  const bounded = clamp(probability, 0.0001, 0.9999);
  return Math.log(bounded / (1 - bounded));
}

function logistic(value) {
  return 1 / (1 + Math.exp(-value));
}

function score(value) {
  return Math.round(clamp(value, 0, 100));
}

function interpolateAnchors(anchors, year, field) {
  const before = [...anchors].reverse().find((entry) => entry.year <= year) ?? anchors[0];
  const after = anchors.find((entry) => entry.year >= year) ?? anchors.at(-1);
  if (before.year === after.year) return before[field];
  const progress = (year - before.year) / (after.year - before.year);
  return before[field] + (after[field] - before[field]) * progress;
}

export function getYouthYearReference(calibration, year) {
  const reference = calibration.observations.yearlyHouseholdReferences.find(
    (entry) => entry.year === year,
  );
  if (!reference) throw new RangeError(`青年入口阶段缺少 ${year} 年家庭统计参考`);
  return reference;
}

export function getStaffWageReference(calibration, year) {
  const reference = calibration.observations.staffAverageWageReferences.find(
    (entry) => entry.year === year,
  );
  if (!reference) throw new RangeError(`青年入口阶段缺少 ${year} 年职工工资参考`);
  return reference;
}

export function getHigherEducationProgressionRate(calibration, year) {
  return interpolateAnchors(
    calibration.observations.highSchoolToRegularHigherEducationProgression,
    year,
    "rate",
  );
}

export function getEmploymentStructureReference(calibration, year) {
  const anchors = calibration.observations.employmentStructureAnchors;
  return {
    year,
    primary: roundTo(interpolateAnchors(anchors, year, "primary"), 4),
    secondary: roundTo(interpolateAnchors(anchors, year, "secondary"), 4),
    tertiary: roundTo(interpolateAnchors(anchors, year, "tertiary"), 4),
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
  state.visibleStats[stat].status = "derived_from_youth_entry_fact";
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

function updateMemberAges(state, year) {
  for (const member of state.household.members) {
    member.birthYear ??= state.birthYear - member.ageAtBirth;
    member.currentAge = Math.max(0, year - member.birthYear);
  }
}

function getSelfMember(state) {
  const member = state.household.members.find((candidate) => candidate.relation === "self");
  if (!member) throw new Error("家庭成员中缺少 relation=self 的玩家本人记录");
  return member;
}

function allocateOriginalFamilyIncome(state, amount, random) {
  const self = getSelfMember(state);
  const earners = state.household.members.filter(
    (member) => member.relation !== "self" && member.job,
  );
  const weights = earners.map((member) => {
    const range = member.job.sector === "primary" ? [9, 12] : [10, 12];
    member.job.workMonthsThisYear = randomInt(random, range[0], range[1]);
    return member.job.workMonthsThisYear * (0.88 + random() * 0.24);
  });
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  for (const member of state.household.members) {
    member.annualIncomeContributionYuan = 0;
    if (member.job) member.job.annualIncomeContributionYuan = 0;
  }
  let allocated = 0;
  earners.forEach((member, index) => {
    const contribution = index === earners.length - 1
      ? roundTo(amount - allocated, 2)
      : roundTo((amount * weights[index]) / weightTotal, 2);
    member.annualIncomeContributionYuan = contribution;
    member.job.annualIncomeContributionYuan = contribution;
    allocated += contribution;
  });
  self.annualIncomeContributionYuan = 0;
  if (state.employment.currentJob) {
    self.job = clone(state.employment.currentJob);
    self.job.annualIncomeContributionYuan = 0;
  } else {
    delete self.job;
  }
}

function settleHouseholdYear(state, calibration, reference, random, record) {
  state.usedObservationSourceIds.add(reference.sourceId);
  state.usedAssumptionIds.add(calibration.assumptions.householdIncomeContinuation.id);
  state.usedAssumptionIds.add(calibration.assumptions.parentEmploymentContinuity.id);
  const referenceIncome = state.residence === "urban"
    ? reference.urbanIncomePerPersonYuan
    : reference.ruralIncomePerPersonYuan;
  const engelCoefficient = state.residence === "urban"
    ? reference.urbanEngelCoefficient
    : reference.ruralEngelCoefficient;
  const sigma = calibration.assumptions.householdIncomeContinuation
    .annualShockSigma[state.residence];
  const meanOneShock = Math.exp(-0.5 * sigma ** 2 + sigma * standardNormal(random));
  const originalFamilyIncome = roundTo(
    referenceIncome
      * state.household.members.length
      * state.familyIncomeRelativeToReference
      * meanOneShock,
    2,
  );
  allocateOriginalFamilyIncome(state, originalFamilyIncome, random);
  const familyIncomePerPerson = originalFamilyIncome / state.household.members.length;
  state.familyIncomeRelativeToReference = familyIncomePerPerson / referenceIncome;
  state.household.finance = {
    year: reference.year,
    currency: calibration.scope.currency,
    priceBasis: calibration.scope.priceBasis,
    incomeMeasureType: state.residence === "urban"
      ? "urban_disposable_income"
      : "rural_net_income",
    originalFamilyMemberIncomeYuan: originalFamilyIncome,
    playerPersonalIncomeYuan: 0,
    annualHouseholdIncomeYuan: originalFamilyIncome,
    annualIncomePerPersonYuan: roundTo(familyIncomePerPerson, 2),
    referenceMeanPerPersonYuan: referenceIncome,
    foodExpenditureShareReference: engelCoefficient,
    educationCashExpenseYuan: 0,
    cashAfterEducationExpenseYuan: originalFamilyIncome,
    cashSavingsYuan: null,
    debtYuan: null,
  };
  return addFact(record, "youth_household_finance_settled", {
    originalFamilyMemberIncomeYuan: originalFamilyIncome,
    playerPersonalIncomeYuan: 0,
    annualHouseholdIncomeYuan: originalFamilyIncome,
    annualIncomePerPersonYuan: roundTo(familyIncomePerPerson, 2),
    referenceMeanPerPersonYuan: referenceIncome,
    familyIncomeRelativeToReference: roundTo(state.familyIncomeRelativeToReference, 4),
    householdIncomeRelativeToReference: roundTo(familyIncomePerPerson / referenceIncome, 4),
    foodExpenditureShareReference: engelCoefficient,
    coResidentSize: state.household.members.length,
    playerIncomeIncludedAfterEmploymentFact: false,
  });
}

function addPlayerIncomeToHousehold(state, amount, financeFact) {
  const self = getSelfMember(state);
  const contribution = roundTo(amount, 2);
  self.annualIncomeContributionYuan = contribution;
  if (self.job) self.job.annualIncomeContributionYuan = contribution;
  const total = roundTo(
    state.household.finance.originalFamilyMemberIncomeYuan + contribution,
    2,
  );
  const perPerson = roundTo(total / state.household.members.length, 2);
  state.household.finance.playerPersonalIncomeYuan = contribution;
  state.household.finance.annualHouseholdIncomeYuan = total;
  state.household.finance.annualIncomePerPersonYuan = perPerson;
  state.household.finance.cashAfterEducationExpenseYuan = roundTo(
    total - state.household.finance.educationCashExpenseYuan,
    2,
  );
  financeFact.playerPersonalIncomeYuan = contribution;
  financeFact.annualHouseholdIncomeYuan = total;
  financeFact.annualIncomePerPersonYuan = perPerson;
  financeFact.householdIncomeRelativeToReference = roundTo(
    perPerson / financeFact.referenceMeanPerPersonYuan,
    4,
  );
  financeFact.playerIncomeIncludedAfterEmploymentFact = true;
}

function simulateHealth(state, calibration, random, record) {
  state.usedAssumptionIds.add(calibration.assumptions.healthEpisodes.id);
  const assumption = calibration.assumptions.healthEpisodes;
  const episodeCount = poisson(random, assumption.meanEpisodesPerYear);
  let severeEpisodeCount = 0;
  let symptomDays = 0;
  for (let index = 0; index < episodeCount; index += 1) {
    const severe = random() < assumption.severeEpisodeProbability;
    if (severe) severeEpisodeCount += 1;
    symptomDays += severe ? randomInt(random, 7, 18) : randomInt(random, 2, 7);
  }
  const fact = addFact(record, "youth_health_year_summary", {
    symptomEpisodeCount: episodeCount,
    severeEpisodeCount,
    symptomDays,
    absenceDays: Math.min(22, Math.ceil(symptomDays * 0.46)),
    diagnosis: null,
  });
  if (severeEpisodeCount > 0) {
    changeStat(state, record, "health", -1, fact.id, "本年较重症状影响学习或劳动");
  }
  return fact;
}

function applyFinanceStats(state, calibration, financeFact, record) {
  state.usedAssumptionIds.add(calibration.assumptions.visibleStatEvolution.id);
  setStat(
    state,
    record,
    "wealth",
    50 + 20 * Math.log(Math.max(0.05, financeFact.householdIncomeRelativeToReference)),
    financeFact.id,
    "由本年家庭总收入相对同年同城乡居民人均收入参考值重算",
  );
}

function getVocationalTypeShares(calibration, year) {
  const observations = calibration.observations.vocationalEntrantsBySchoolType;
  const fields = [
    "ordinarySpecializedSecondary",
    "vocationalHighSchool",
    "technicalWorkerSchool",
    "adultSpecializedSecondary",
  ];
  const values = Object.fromEntries(
    fields.map((field) => [field, interpolateAnchors(observations, year, field)]),
  );
  const total = Object.values(values).reduce((sum, value) => sum + value, 0);
  return Object.fromEntries(fields.map((field) => [field, values[field] / total]));
}

function selectSkillDirection(random, residence) {
  const weights = {
    machine_operation: 1.25,
    electrical_maintenance: 1.0,
    garment_and_textile: 1.0,
    retail_service: 0.9,
    basic_accounting: 0.65,
    food_service: 0.65,
    logistics: 0.55,
    construction: 0.7,
    agricultural_production: residence === "rural" ? 1.1 : 0.15,
  };
  return weightedChoice(
    random,
    SKILL_DIRECTIONS.map((value) => ({ value, weight: weights[value] })),
  );
}

function createSeniorSchool(state, calibration, year, random, record) {
  state.usedAssumptionIds.add(calibration.assumptions.seniorSchoolModel.id);
  const senior = state.education.senior;
  if (state.path === "academic_senior") {
    senior.school = {
      id: `academic-senior-${state.personId}-${year}`,
      track: "academic_senior",
      schoolType: "ordinary_senior_high_school",
      prescribedYears: calibration.assumptions.seniorSchoolModel.prescribedYears,
      specificSchoolName: null,
      locality: null,
    };
  } else {
    state.usedAssumptionIds.add(calibration.assumptions.vocationalSchoolTypeAllocation.id);
    for (const snapshot of calibration.observations.vocationalEntrantsBySchoolType) {
      state.usedObservationSourceIds.add(snapshot.sourceId);
    }
    const shares = getVocationalTypeShares(calibration, year);
    const schoolType = weightedChoice(
      random,
      Object.entries(shares).map(([value, weight]) => ({ value, weight })),
    );
    senior.skillDirection = selectSkillDirection(random, state.residence);
    senior.school = {
      id: `vocational-secondary-${state.personId}-${year}`,
      track: "vocational_secondary",
      schoolType,
      prescribedYears: calibration.assumptions.seniorSchoolModel.prescribedYears,
      specificSchoolName: null,
      locality: null,
    };
    if (year >= 1996) {
      state.usedObservationSourceIds.add("gov_vocational_education_law_1996");
    }
  }
  addFact(record, "senior_school_assigned", {
    ...clone(senior.school),
    skillDirection: senior.skillDirection,
    vocationalTypeNationalShares: state.path === "vocational_secondary"
      ? getVocationalTypeShares(calibration, year)
      : null,
    vocationalTypeShareUsedAsIndividualAllocationProxy:
      state.path === "vocational_secondary",
  });
}

function findApplicableEvent(state, eventConfig, record) {
  return eventConfig.events.find((event) => {
    if (state.triggeredEventIds.has(event.id) || event.path !== state.path) return false;
    if (event.trigger === "on_school_entry") {
      return state.education.senior.currentGrade === 1
        && record.calendarYear === state.education.senior.entryYear;
    }
    if (event.trigger === "before_final_grade") {
      return state.education.senior.currentGrade
        === state.education.senior.school.prescribedYears;
    }
    return false;
  });
}

function chooseConfiguredOption(state, event, random, choices, autoChoose) {
  const requestedId = choices[event.id];
  if (requestedId) {
    const option = event.options.find((candidate) => candidate.id === requestedId);
    if (!option) throw new Error(`事件 ${event.id} 不存在选项 ${requestedId}`);
    return { option, selectionMode: "manual" };
  }
  if (!autoChoose) return null;
  return {
    option: weightedChoice(
      random,
      event.options.map((candidate) => ({ value: candidate, weight: candidate.autoWeight ?? 1 })),
    ),
    selectionMode: "automatic",
  };
}

function applyConfiguredOption(state, calibration, event, option, selectionMode, record) {
  const fact = addFact(record, "youth_player_action", {
    eventId: event.id,
    optionId: option.id,
    studyHoursPerWeek: option.studyHoursPerWeek ?? null,
    practiceHoursPerWeek: option.practiceHoursPerWeek ?? null,
    householdLaborHoursPerWeek: option.householdLaborHoursPerWeek ?? null,
    peerHoursPerWeek: option.peerHoursPerWeek ?? null,
    expenseMultiplier: option.expenseMultiplier ?? null,
    higherEducationPreparationHours: option.higherEducationPreparationHours ?? 0,
    jobSearchContacts: option.jobSearchContacts ?? 0,
    familyIntroductions: option.familyIntroductions ?? 0,
  });
  for (const field of [
    "studyHoursPerWeek",
    "practiceHoursPerWeek",
    "householdLaborHoursPerWeek",
    "peerHoursPerWeek",
  ]) {
    if (option[field] != null) state.routine[field] = option[field];
  }
  if (option.expenseMultiplier != null) state.educationExpenseMultiplier = option.expenseMultiplier;
  state.higherEducationPreparationHours += option.higherEducationPreparationHours ?? 0;
  state.workReadiness.jobSearchContacts += option.jobSearchContacts ?? 0;
  state.workReadiness.familyIntroductions += option.familyIntroductions ?? 0;
  for (const [stat, delta] of Object.entries(option.immediateStatEffects ?? {})) {
    changeStat(state, record, stat, delta, fact.id, `玩家在“${event.title}”中选择“${option.label}”`);
  }
  const decision = {
    eventId: event.id,
    calendarYear: record.calendarYear,
    age: record.age,
    path: state.path,
    selectedOptionId: option.id,
    unchosenOptionIds: event.options
      .filter((candidate) => candidate.id !== option.id)
      .map((candidate) => candidate.id),
    selectionMode,
    sourceFactId: fact.id,
  };
  record.decision = decision;
  state.decisions.push(decision);
  state.triggeredEventIds.add(event.id);
  state.usedAssumptionIds.add(event.assumptionId);
  state.usedAssumptionIds.add(calibration.assumptions.eventChoices.id);
}

function handleConfiguredEvent(
  state,
  calibration,
  eventConfig,
  choices,
  autoChoose,
  random,
  record,
) {
  const event = findApplicableEvent(state, eventConfig, record);
  if (!event) return true;
  const selected = chooseConfiguredOption(state, event, random, choices, autoChoose);
  if (!selected) {
    state.status = "awaiting_choice";
    state.pendingDecision = {
      eventId: event.id,
      title: event.title,
      prompt: event.prompt,
      path: state.path,
      calendarYear: record.calendarYear,
      age: record.age,
      options: event.options.map((option) => ({ id: option.id, label: option.label })),
    };
    return false;
  }
  applyConfiguredOption(
    state,
    calibration,
    event,
    selected.option,
    selected.selectionMode,
    record,
  );
  return true;
}

function settleEducationExpense(state, calibration, reference, financeFact, record) {
  state.usedAssumptionIds.add(calibration.assumptions.educationExpense.id);
  const referenceIncome = state.residence === "urban"
    ? reference.urbanIncomePerPersonYuan
    : reference.ruralIncomePerPersonYuan;
  const track = state.path;
  const assumedAmount = roundTo(
    referenceIncome
      * calibration.assumptions.educationExpense.shareOfReferenceIncome[track][state.residence]
      * state.educationExpenseMultiplier,
    2,
  );
  const affordabilityCap = roundTo(financeFact.annualHouseholdIncomeYuan * 0.58, 2);
  const amount = Math.min(assumedAmount, affordabilityCap);
  const share = amount / financeFact.annualHouseholdIncomeYuan;
  state.household.finance.educationCashExpenseYuan = amount;
  state.household.finance.cashAfterEducationExpenseYuan = roundTo(
    financeFact.annualHouseholdIncomeYuan - amount,
    2,
  );
  const fact = addFact(record, "senior_education_cash_expense", {
    track,
    amountYuan: amount,
    assumedAmountBeforeAffordabilityCapYuan: assumedAmount,
    affordabilityCapApplied: amount < assumedAmount,
    shareOfAnnualHouseholdIncome: roundTo(share, 5),
    referenceIncomePerPersonYuan: referenceIncome,
    expenseMultiplierFromChoice: state.educationExpenseMultiplier,
    exactLocalFeeScheduleKnown: false,
  });
  if (share >= 0.10) {
    changeStat(state, record, "wealth", -2, fact.id, "本年高中阶段教育现金支出占家庭收入较高");
    changeStat(state, record, "mood", -1, fact.id, "本年教育支出明显占用家庭现金");
  } else if (share >= 0.05) {
    changeStat(state, record, "wealth", -1, fact.id, "本年高中阶段教育现金支出进入家庭总账");
  }
  return fact;
}

function educationRank(state) {
  if (state.education.highestCompleted === "vocational_secondary") return 3;
  if (state.education.highestCompleted === "academic_senior") return 2;
  if (state.education.highestCompleted === "junior_secondary") return 1;
  return 0;
}

function settleHigherEducationTransition(
  state,
  calibration,
  year,
  learningScore,
  expenseFact,
  random,
  record,
  graduationFact,
) {
  state.usedAssumptionIds.add(calibration.assumptions.higherEducationTransition.id);
  for (const observation of calibration.observations.highSchoolToRegularHigherEducationProgression) {
    state.usedObservationSourceIds.add(observation.sourceId);
  }
  const nationalRate = getHigherEducationProgressionRate(calibration, year);
  const preparationHours = state.higherEducationPreparationHours;
  const probability = logistic(
    logit(nationalRate)
      + (learningScore - 58) * 0.030
      + (preparationHours - 160) / 270
      + Math.log(Math.max(0.18, state.familyIncomeRelativeToReference)) * 0.13
      - expenseFact.shareOfAnnualHouseholdIncome * 1.1,
  );
  const entered = random() < probability;
  const fact = addFact(record, "regular_higher_education_transition_outcome", {
    enteredRegularHigherEducation: entered,
    intendedEntryYear: entered ? year + 1 : null,
    nationalHighSchoolGraduateProgressionRateReference: roundTo(nationalRate, 4),
    nationalMetricNumerator: "ordinary_higher_education_entrants",
    nationalMetricDenominator: "ordinary_senior_high_school_graduates",
    modeledIndividualProbability: roundTo(probability, 5),
    finalLearningProgressScore: learningScore,
    higherEducationPreparationHours: preparationHours,
    institution: null,
    program: null,
    admissionScore: null,
    graduationFactId: graduationFact.id,
  });
  if (entered) {
    state.status = "completed_stage";
    state.ending = {
      id: "entered_regular_higher_education",
      calendarYear: year,
      age: record.age,
      sourceFactId: fact.id,
      intendedEntryYear: year + 1,
      institution: null,
      program: null,
      actualEmploymentCreated: false,
    };
    return true;
  }
  state.path = "job_search";
  return false;
}

function simulateSeniorSchoolYear(
  state,
  calibration,
  reference,
  financeFact,
  healthFact,
  random,
  record,
) {
  const senior = state.education.senior;
  const expenseFact = settleEducationExpense(state, calibration, reference, financeFact, record);
  state.usedAssumptionIds.add(calibration.assumptions.seniorLearningAndCompletion.id);
  const assumption = calibration.assumptions.seniorLearningAndCompletion;
  const familyAbsenceDays = Math.min(
    45,
    Math.max(0, Math.floor((state.routine.householdLaborHoursPerWeek - 7) * 1.25)),
  );
  const expenseAbsenceDays = Math.min(18, Math.floor(expenseFact.shareOfAnnualHouseholdIncome * 80));
  const attendedDays = Math.max(
    0,
    calibration.assumptions.seniorSchoolModel.instructionDays
      - healthFact.absenceDays
      - familyAbsenceDays
      - expenseAbsenceDays,
  );
  const attendanceRate = attendedDays / calibration.assumptions.seniorSchoolModel.instructionDays;
  const vocational = state.path === "vocational_secondary";
  const learningScore = score(
    45
      + (attendanceRate - 0.86) * 74
      + (state.routine.studyHoursPerWeek - 10) * (vocational ? 1.2 : 1.65)
      + (vocational ? state.routine.practiceHoursPerWeek * 1.05 : 0)
      + state.visibleStats.ability.value * 0.19
      - Math.max(0, state.routine.householdLaborHoursPerWeek - 10) * 0.85
      + standardNormal(random) * assumption.annualShockStandardDeviation,
  );
  const schoolYearFact = addFact(record, "senior_school_year_attendance_and_learning", {
    track: state.path,
    schoolType: senior.school.schoolType,
    grade: senior.currentGrade,
    prescribedInstructionDays: calibration.assumptions.seniorSchoolModel.instructionDays,
    attendedDays,
    illnessAbsenceDays: healthFact.absenceDays,
    familyLaborAbsenceDays: familyAbsenceDays,
    educationExpenseAbsenceDays: expenseAbsenceDays,
    attendanceRate: roundTo(attendanceRate, 4),
    studyHoursPerWeek: state.routine.studyHoursPerWeek,
    practiceHoursPerWeek: vocational ? state.routine.practiceHoursPerWeek : 0,
    householdLaborHoursPerWeek: state.routine.householdLaborHoursPerWeek,
    learningProgressScore: learningScore,
    scoreMeaning: "game_internal_learning_progress_not_standardized_exam_score",
    skillDirection: senior.skillDirection,
  });
  senior.lastLearningProgressScore = learningScore;
  if (learningScore >= 72) {
    changeStat(state, record, "ability", 3, schoolYearFact.id, "本学年出勤、课程和练习形成较多能力积累");
  } else if (learningScore >= 55) {
    changeStat(state, record, "ability", 2, schoolYearFact.id, "本学年完成课程并形成能力积累");
  } else if (learningScore >= 40) {
    changeStat(state, record, "ability", 1, schoolYearFact.id, "本学年保留了可记录的学习积累");
  }
  if (state.routine.householdLaborHoursPerWeek >= 15) {
    changeStat(state, record, "relationships", 1, schoolYearFact.id, "本年持续承担较多家庭事务");
    changeStat(state, record, "mood", -1, schoolYearFact.id, "家庭劳动压缩了学习和休息时间");
  }

  const baseExit = vocational ? assumption.vocationalAnnualExitBase : assumption.academicAnnualExitBase;
  const exitProbability = logistic(
    logit(baseExit)
      + (1 - attendanceRate) * 3.0
      + Math.max(0, 46 - learningScore) * 0.030
      + expenseFact.shareOfAnnualHouseholdIncome * 2.0
      + Math.max(0, state.routine.householdLaborHoursPerWeek - 12) * 0.035,
  );
  const exited = random() < exitProbability;
  const continuationFact = addFact(record, "senior_school_continuation_outcome", {
    continued: !exited,
    track: state.path,
    modeledIndividualExitProbability: roundTo(exitProbability, 5),
    nationalAnnualExitRateReference: null,
    inputAttendanceRate: roundTo(attendanceRate, 4),
    inputLearningProgressScore: learningScore,
    inputEducationExpenseShareOfHouseholdIncome: expenseFact.shareOfAnnualHouseholdIncome,
  });
  if (exited) {
    senior.status = "exited_before_completion";
    senior.lastGradeAttended = senior.currentGrade;
    senior.exitYear = record.calendarYear;
    state.path = "job_search";
    state.workReadiness.jobSearchContacts += 2;
    state.workReadiness.skillDirection = senior.skillDirection;
    addFact(record, "senior_exit_to_work_search", {
      seniorContinuationFactId: continuationFact.id,
      searchBeginsInSameCalendarYear: true,
      completedCredential: false,
    });
    return { maySearchNow: true, availableWorkMonths: randomInt(random, 4, 7) };
  }

  const finalGrade = senior.currentGrade === senior.school.prescribedYears;
  if (finalGrade) {
    const baseGraduation = vocational
      ? assumption.vocationalFinalGraduationProbability
      : assumption.academicFinalGraduationProbability;
    const probability = logistic(
      logit(baseGraduation)
        + (attendanceRate - 0.88) * 1.5
        + (learningScore - 54) * 0.018,
    );
    const graduated = random() < probability;
    const graduationFact = addFact(record, "senior_graduation_outcome", {
      graduated,
      track: state.path,
      schoolType: senior.school.schoolType,
      modeledIndividualProbability: roundTo(probability, 5),
      prescribedYears: senior.school.prescribedYears,
      actualYearsSinceEntry: record.calendarYear - senior.entryYear + 1,
      finalLearningProgressScore: learningScore,
      standardizedExamScore: null,
      credentialName: graduated
        ? (vocational ? "secondary_vocational_completion_credential" : "ordinary_senior_high_school_completion")
        : null,
    });
    if (graduated) {
      senior.status = "graduated";
      senior.graduationYear = record.calendarYear;
      senior.completedGrades = senior.school.prescribedYears;
      state.education.highestCompleted = vocational
        ? "vocational_secondary"
        : "academic_senior";
      state.workReadiness.skillDirection = senior.skillDirection;
      changeStat(state, record, "ability", 3, graduationFact.id, "完成高中阶段教育并取得结业结果");
      if (!vocational) {
        const enteredHigherEducation = settleHigherEducationTransition(
          state,
          calibration,
          record.calendarYear,
          learningScore,
          expenseFact,
          random,
          record,
          graduationFact,
        );
        if (enteredHigherEducation) return { maySearchNow: false, availableWorkMonths: 0 };
      } else {
        state.path = "job_search";
      }
      return { maySearchNow: true, availableWorkMonths: randomInt(random, 4, 6) };
    }
  }

  const repeatProbability = clamp(
    assumption.baseRepeatProbability
      + Math.max(0, 43 - learningScore) * 0.007
      + Math.max(0, 0.82 - attendanceRate) * 0.65,
    0.008,
    0.42,
  );
  const repeated = finalGrade || random() < repeatProbability;
  const progressionFact = addFact(record, "senior_grade_progression", {
    gradeBefore: senior.currentGrade,
    repeated,
    modeledRepeatProbability: roundTo(repeatProbability, 5),
    learningProgressScore: learningScore,
    attendanceRate: roundTo(attendanceRate, 4),
  });
  if (repeated) {
    senior.repeatedYears += 1;
  } else {
    senior.completedGrades = Math.max(senior.completedGrades, senior.currentGrade);
    senior.currentGrade += 1;
    changeStat(state, record, "ability", 1, progressionFact.id, "完成本年级并进入下一年级");
  }
  return { maySearchNow: false, availableWorkMonths: 0 };
}

function unitTypeWeight(template, year) {
  if (template.id === "state_collective_factory_trainee") {
    if (year >= 1998 && year <= 2002) return 0.48;
    if (year > 2002) return 0.58;
    return 1.20;
  }
  if (year >= 2001 && [
    "township_light_manufacturing",
    "vocational_technical_operator",
    "warehouse_transport_helper",
  ].includes(template.id)) return 1.14;
  return 1;
}

function chooseUnitType(template, year, random) {
  const options = template.unitTypes.map((value) => {
    let weight = 1;
    if (year >= 1998 && value === "state_owned_unit") weight *= 0.58;
    if (year >= 1998 && value === "urban_collective_unit") weight *= 0.72;
    if (year >= 1995 && ["private_enterprise", "individual_business"].includes(value)) {
      weight *= 1.28;
    }
    return { value, weight };
  });
  return weightedChoice(random, options);
}

function wageReferenceForUnit(wageReference, unitType) {
  if (unitType === "state_owned_unit") {
    return { amount: wageReference.stateOwned, field: "stateOwned", scopeMatches: true };
  }
  if (unitType === "urban_collective_unit") {
    return { amount: wageReference.urbanCollective, field: "urbanCollective", scopeMatches: true };
  }
  if (["private_enterprise", "collective_service_unit"].includes(unitType)) {
    return { amount: wageReference.otherUnits, field: "otherUnits", scopeMatches: false };
  }
  return { amount: wageReference.all, field: "all", scopeMatches: false };
}

function templateEligibility(template, rank, residence) {
  return template.residences.includes(residence)
    && template.minimumEducationRanks.includes(rank);
}

function makeCandidate(
  state,
  calibration,
  template,
  year,
  availableMonths,
  employmentStructure,
  wageReference,
  random,
) {
  const unitType = chooseUnitType(template, year, random);
  const weeklyHours = randomInt(
    random,
    template.weeklyHoursRange[0],
    template.weeklyHoursRange[1],
  );
  const skillMatch = template.skillDirections.includes(state.workReadiness.skillDirection);
  let annualizedIncome = null;
  let personalCashIncome = null;
  let multiplier = null;
  let wageReferenceInfo = null;
  if (template.familyActivity) {
    const yearReference = getYouthYearReference(calibration, year);
    const residenceReference = state.residence === "urban"
      ? yearReference.urbanIncomePerPersonYuan
      : yearReference.ruralIncomePerPersonYuan;
    multiplier = calibration.assumptions.familyEconomicActivity
      .incomeReferenceMultipliers[state.residence]
      * (0.86 + random() * 0.28);
    annualizedIncome = roundTo(residenceReference * multiplier, 2);
    personalCashIncome = roundTo(annualizedIncome * availableMonths / 12, 2);
    wageReferenceInfo = {
      type: state.residence === "urban"
        ? "urban_disposable_income_per_person"
        : "rural_net_income_per_person",
      amountYuan: residenceReference,
      sourceId: yearReference.sourceId,
      statisticalScopeMatchesWork: false,
    };
  } else {
    const [minimumMultiplier, maximumMultiplier] = template.staffAverageWageMultiplierRange;
    multiplier = minimumMultiplier + random() * (maximumMultiplier - minimumMultiplier);
    const reference = wageReferenceForUnit(wageReference, unitType);
    annualizedIncome = roundTo(reference.amount * multiplier, 2);
    personalCashIncome = roundTo(annualizedIncome * availableMonths / 12, 2);
    wageReferenceInfo = {
      type: "urban_unit_staff_average_wage",
      field: reference.field,
      amountYuan: reference.amount,
      sourceId: wageReference.sourceId,
      statisticalScopeMatchesWork: reference.scopeMatches,
    };
  }
  let hiringLogOdds = logit(calibration.assumptions.offerAndHiring.baseHiringProbability);
  if (educationRank(state) >= 2) {
    hiringLogOdds += calibration.assumptions.offerAndHiring.seniorEducationLogOddsBonus;
  }
  if (skillMatch) {
    hiringLogOdds += calibration.assumptions.offerAndHiring.vocationalMatchLogOddsBonus;
  }
  hiringLogOdds += Math.min(0.34, state.workReadiness.jobSearchContacts * 0.025);
  hiringLogOdds += Math.min(
    0.76,
    state.workReadiness.familyIntroductions
      * calibration.assumptions.offerAndHiring.familyIntroductionLogOddsBonus,
  );
  if (template.familyActivity) hiringLogOdds += 1.55;
  if (template.id === "state_collective_factory_trainee" && year >= 1998) hiringLogOdds -= 0.72;
  const hiringProbability = logistic(hiringLogOdds);
  let contractProbability = template.contractProbability;
  if (year < 1995) contractProbability *= 0.72;
  if (skillMatch) contractProbability = clamp(contractProbability + 0.08, 0, 0.95);
  const sectorShare = employmentStructure[template.sector];
  const opportunityWeight = template.baseWeight
    * sectorShare * 3
    * unitTypeWeight(template, year)
    * (skillMatch ? 1.75 : 1)
    * (template.familyActivity && state.entryPreparationPath === "family_economic_activity" ? 2.4 : 1);
  return {
    id: `offer-${year}-${template.id}`,
    templateId: template.id,
    label: template.label,
    employerName: null,
    employerLocality: null,
    sector: template.sector,
    industry: template.industry,
    occupation: template.occupation,
    unitType,
    employmentForm: template.employmentForm,
    familyActivity: template.familyActivity,
    weeklyHours,
    availableWorkMonthsThisYear: availableMonths,
    annualizedPersonalCashIncomeYuan: annualizedIncome,
    personalCashIncomeThisYearYuan: personalCashIncome,
    incomeReferenceMultiplier: roundTo(multiplier, 4),
    wageOrIncomeReference: wageReferenceInfo,
    contractProbability: roundTo(contractProbability, 5),
    hiringProbability: roundTo(hiringProbability, 5),
    skillDirection: state.workReadiness.skillDirection,
    skillMatch,
    opportunityWeight: roundTo(opportunityWeight, 6),
    nationalSectorEmploymentShareReference: sectorShare,
    sectorReferenceUsedAsCandidateWeightNotIndividualAssignment: true,
  };
}

/**
 * 生成本年度三项可见工作候选；候选不是既成工作，须经玩家选择和录用结算。
 */
export function generateJobCandidates(
  state,
  calibration,
  jobCatalog,
  year,
  availableMonths,
  random,
) {
  state.usedAssumptionIds.add(calibration.assumptions.opportunityGeneration.id);
  state.usedAssumptionIds.add(calibration.assumptions.offerAndHiring.id);
  for (const anchor of calibration.observations.employmentStructureAnchors) {
    state.usedObservationSourceIds.add(anchor.sourceId);
  }
  state.usedObservationSourceIds.add("nbs_staff_statistics_scope");
  const employmentStructure = getEmploymentStructureReference(calibration, year);
  const wageReference = getStaffWageReference(calibration, year);
  state.usedObservationSourceIds.add(wageReference.sourceId);
  const rank = educationRank(state);
  const eligible = jobCatalog.templates
    .filter((template) => templateEligibility(template, rank, state.residence))
    .map((template) => makeCandidate(
      state,
      calibration,
      template,
      year,
      availableMonths,
      employmentStructure,
      wageReference,
      random,
    ));
  const candidates = [];
  const remaining = [...eligible];
  const count = Math.min(
    calibration.assumptions.opportunityGeneration.candidateCount,
    remaining.length,
  );
  while (candidates.length < count) {
    const selected = weightedChoice(
      random,
      remaining.map((candidate) => ({
        value: candidate,
        weight: candidate.opportunityWeight,
      })),
    );
    candidates.push(selected);
    remaining.splice(remaining.findIndex((candidate) => candidate.id === selected.id), 1);
  }
  return candidates;
}

function chooseJobCandidate(candidates, decisionId, choices, autoChoose, random) {
  const requestedId = choices[decisionId];
  if (requestedId) {
    const candidate = candidates.find(
      (entry) => entry.id === requestedId || entry.templateId === requestedId,
    );
    if (!candidate) throw new Error(`求职事件 ${decisionId} 不存在候选 ${requestedId}`);
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

function createJobFromCandidate(state, candidate, year, random) {
  let contractType;
  if (candidate.familyActivity) {
    contractType = "not_applicable_family_operation";
  } else if (random() < candidate.contractProbability) {
    contractType = year >= 1995
      ? "written_labor_contract_or_unit_employment_record"
      : "written_or_unit_employment_record";
  } else {
    contractType = "oral_or_no_written_contract_recorded";
  }
  return {
    id: `job-${state.personId}-${year}-${candidate.templateId}`,
    startYear: year,
    startAge: year - state.birthYear,
    employerName: candidate.employerName,
    employerLocality: candidate.employerLocality,
    label: candidate.label,
    sector: candidate.sector,
    industry: candidate.industry,
    occupation: candidate.occupation,
    unitType: candidate.unitType,
    employmentForm: candidate.employmentForm,
    contractType,
    weeklyHours: candidate.weeklyHours,
    workMonthsThisYear: candidate.availableWorkMonthsThisYear,
    annualizedPersonalCashIncomeYuan: candidate.annualizedPersonalCashIncomeYuan,
    annualIncomeContributionYuan: candidate.personalCashIncomeThisYearYuan,
    incomeReference: clone(candidate.wageOrIncomeReference),
    incomeReferenceMultiplier: candidate.incomeReferenceMultiplier,
    skillDirection: candidate.skillDirection,
    skillMatch: candidate.skillMatch,
  };
}

function handleJobSearch(
  state,
  calibration,
  jobCatalog,
  choices,
  autoChoose,
  random,
  record,
  financeFact,
  availableMonths,
) {
  const decisionId = `job_opportunity_${record.calendarYear}`;
  const candidates = generateJobCandidates(
    state,
    calibration,
    jobCatalog,
    record.calendarYear,
    availableMonths,
    random,
  );
  const opportunityFact = addFact(record, "concrete_job_candidates_generated", {
    decisionId,
    educationRank: educationRank(state),
    highestCompletedEducation: state.education.highestCompleted,
    jobSearchContacts: state.workReadiness.jobSearchContacts,
    familyIntroductions: state.workReadiness.familyIntroductions,
    candidates: clone(candidates),
    candidateCount: candidates.length,
    allCandidatesAreOffers: false,
    employerNamesUnresolvedBecauseLocalityIsUnknown: true,
  });
  const selected = chooseJobCandidate(candidates, decisionId, choices, autoChoose, random);
  if (!selected) {
    state.status = "awaiting_choice";
    state.pendingDecision = {
      eventId: decisionId,
      title: "这一年可以尝试的具体工作",
      prompt: "每项机会的行业、岗位、单位性质、工时和预计收入不同。你先尝试哪一个？",
      path: state.path,
      calendarYear: record.calendarYear,
      age: record.age,
      options: candidates.map((candidate) => ({
        id: candidate.id,
        templateId: candidate.templateId,
        label: candidate.label,
        sector: candidate.sector,
        occupation: candidate.occupation,
        unitType: candidate.unitType,
        weeklyHours: candidate.weeklyHours,
        personalCashIncomeThisYearYuan: candidate.personalCashIncomeThisYearYuan,
      })),
    };
    return false;
  }
  const choiceFact = addFact(record, "job_candidate_selected", {
    decisionId,
    selectedCandidateId: selected.candidate.id,
    selectedTemplateId: selected.candidate.templateId,
    selectedCandidate: clone(selected.candidate),
    unchosenCandidates: candidates
      .filter((candidate) => candidate.id !== selected.candidate.id)
      .map((candidate) => clone(candidate)),
  });
  const decision = {
    eventId: decisionId,
    calendarYear: record.calendarYear,
    age: record.age,
    path: state.path,
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
  record.decision = decision;
  state.decisions.push(decision);

  const hired = random() < selected.candidate.hiringProbability;
  const outcomeFact = addFact(record, "job_application_outcome", {
    candidateId: selected.candidate.id,
    templateId: selected.candidate.templateId,
    hired,
    modeledHiringProbability: selected.candidate.hiringProbability,
    employerName: null,
    rejectionReason: hired ? null : "specific_reason_not_observed",
  });
  state.employment.searchAttempts.push({
    year: record.calendarYear,
    candidateId: selected.candidate.id,
    templateId: selected.candidate.templateId,
    hired,
    sourceFactId: outcomeFact.id,
  });
  state.workReadiness.jobSearchContacts += randomInt(random, 2, 5);
  if (!hired) {
    changeStat(state, record, "mood", -1, outcomeFact.id, "这次具体岗位尝试没有形成录用");
    return true;
  }

  const job = createJobFromCandidate(state, selected.candidate, record.calendarYear, random);
  if (!selected.candidate.familyActivity && record.calendarYear >= 1995) {
    state.usedObservationSourceIds.add("gov_labor_law_1995");
  }
  state.employment.status = "employed";
  state.employment.currentJob = clone(job);
  state.employment.history.push(clone(job));
  const self = getSelfMember(state);
  self.job = clone(job);
  addPlayerIncomeToHousehold(
    state,
    job.annualIncomeContributionYuan,
    financeFact,
  );
  const employmentFact = addFact(record, "first_actual_work_started", {
    ...clone(job),
    laborRelationshipCreated: !selected.candidate.familyActivity,
    familyEconomicActivity: selected.candidate.familyActivity,
    nationalAverageWageAssignedDirectlyToPerson: false,
    householdFinanceFactId: financeFact.id,
    applicationOutcomeFactId: outcomeFact.id,
  });
  setStat(
    state,
    record,
    "wealth",
    50 + 20 * Math.log(Math.max(0.05, financeFact.householdIncomeRelativeToReference)),
    employmentFact.id,
    "首份实际劳动收入进入本年家庭总账后重算",
  );
  changeStat(state, record, "ability", job.skillMatch ? 2 : 1, employmentFact.id, "开始在具体岗位积累工作经验");
  if (job.weeklyHours >= 60) {
    changeStat(state, record, "health", -1, employmentFact.id, "首份工作每周工时较长");
    changeStat(state, record, "mood", -1, employmentFact.id, "首份工作每周工时压缩了休息时间");
  }
  if (job.employmentForm === "family_economic_activity") {
    changeStat(state, record, "relationships", 2, employmentFact.id, "开始持续参与家庭经济活动");
  }
  state.status = "completed_stage";
  state.ending = {
    id: selected.candidate.familyActivity
      ? "entered_family_economic_activity"
      : "entered_first_job",
    calendarYear: record.calendarYear,
    age: record.age,
    sourceFactId: employmentFact.id,
    jobId: job.id,
    job: clone(job),
    actualEmploymentCreated: !selected.candidate.familyActivity,
    actualEconomicActivityCreated: true,
  };
  return true;
}

function startFamilyEconomicActivity(
  state,
  calibration,
  jobCatalog,
  random,
  record,
  financeFact,
) {
  state.usedAssumptionIds.add(calibration.assumptions.familyEconomicActivity.id);
  const familyTemplates = jobCatalog.templates.filter(
    (template) => template.familyActivity
      && templateEligibility(template, educationRank(state), state.residence),
  );
  const preferred = state.residence === "rural"
    ? familyTemplates.find((template) => template.id === "family_crop_and_livestock")
    : familyTemplates.find((template) => template.id === "family_market_stall");
  const template = preferred ?? familyTemplates[0];
  const candidate = makeCandidate(
    state,
    calibration,
    template,
    record.calendarYear,
    12,
    getEmploymentStructureReference(calibration, record.calendarYear),
    getStaffWageReference(calibration, record.calendarYear),
    random,
  );
  candidate.hiringProbability = 1;
  const opportunityFact = addFact(record, "family_economic_activity_opportunity", {
    candidate: clone(candidate),
    source: "existing_family_activity_selected_in_prior_adolescence_decision",
    employer: null,
    laborContract: null,
  });
  const job = createJobFromCandidate(state, candidate, record.calendarYear, random);
  state.employment.status = "family_economic_activity";
  state.employment.currentJob = clone(job);
  state.employment.history.push(clone(job));
  getSelfMember(state).job = clone(job);
  addPlayerIncomeToHousehold(state, job.annualIncomeContributionYuan, financeFact);
  const workFact = addFact(record, "first_actual_work_started", {
    ...clone(job),
    laborRelationshipCreated: false,
    familyEconomicActivity: true,
    wageYuan: null,
    personalContributionToFamilyNetIncomeYuan: job.annualIncomeContributionYuan,
    opportunityFactId: opportunityFact.id,
    householdFinanceFactId: financeFact.id,
  });
  setStat(
    state,
    record,
    "wealth",
    50 + 20 * Math.log(Math.max(0.05, financeFact.householdIncomeRelativeToReference)),
    workFact.id,
    "个人对家庭经营净收入的贡献进入总账后重算",
  );
  changeStat(state, record, "ability", 2, workFact.id, "开始持续参与具体家庭生产或经营");
  changeStat(state, record, "relationships", 2, workFact.id, "与家人共同承担家庭经济活动");
  if (job.weeklyHours >= 60) changeStat(state, record, "health", -1, workFact.id, "家庭经济活动每周工时较长");
  state.status = "completed_stage";
  state.ending = {
    id: "entered_family_economic_activity",
    calendarYear: record.calendarYear,
    age: record.age,
    sourceFactId: workFact.id,
    jobId: job.id,
    job: clone(job),
    actualEmploymentCreated: false,
    actualEconomicActivityCreated: true,
  };
}

function simulateShortTraining(state, calibration, healthFact, random, record) {
  state.usedAssumptionIds.add(calibration.assumptions.trainingProgram.id);
  const assumption = calibration.assumptions.trainingProgram;
  state.training.skillDirection ??= selectSkillDirection(random, state.residence);
  const attendedHours = Math.max(
    80,
    assumption.shortProgramHours - healthFact.absenceDays * 4 - randomInt(random, 0, 42),
  );
  const probability = logistic(
    logit(assumption.baseCompletionProbability)
      + (attendedHours - assumption.shortProgramHours * 0.82) / 180
      + (state.visibleStats.ability.value - 45) * 0.012,
  );
  const completed = random() < probability;
  const fact = addFact(record, "short_vocational_training_outcome", {
    skillDirection: state.training.skillDirection,
    scheduledHours: assumption.shortProgramHours,
    attendedHours,
    scheduledMonths: assumption.shortProgramMonths,
    completed,
    credentialName: completed ? "non_degree_short_training_completion" : null,
    modeledCompletionProbability: roundTo(probability, 5),
    providerName: null,
    tuitionYuan: null,
  });
  state.training.status = completed ? "completed" : "not_completed";
  state.training.completedHours = attendedHours;
  state.workReadiness.skillDirection = state.training.skillDirection;
  if (completed) changeStat(state, record, "ability", 3, fact.id, "完成一段有具体小时数的短期技能训练");
  else changeStat(state, record, "ability", 1, fact.id, "短训未完成，但保留了已参加的练习小时");
  state.path = "job_search";
  return randomInt(random, 4, 6);
}

function simulateSelfStudyBridge(state, calibration, random, record) {
  state.usedAssumptionIds.add(calibration.assumptions.selfStudyBridge.id);
  const plannedHours = 420;
  const completedHours = randomInt(random, 260, 500);
  const fact = addFact(record, "continued_self_study_year", {
    plannedHours,
    completedHours,
    credentialCreated: false,
    educationLevelChanged: false,
    readingAndArithmeticPracticeIncluded: true,
  });
  if (completedHours >= 400) changeStat(state, record, "ability", 3, fact.id, "完成较多固定自学小时");
  else changeStat(state, record, "ability", 2, fact.id, "保持了一年的固定自学");
  state.workReadiness.jobSearchContacts += 2;
  state.path = "job_search";
  return randomInt(random, 3, 5);
}

function initialPathFromAdolescence(endingId) {
  const mapping = {
    entered_academic_senior_secondary: "academic_senior",
    entered_vocational_secondary: "vocational_secondary",
    prepared_for_family_economic_activity: "family_economic_activity",
    prepared_for_entry_job_search: "job_search",
    prepared_for_short_vocational_training: "short_training",
    continued_self_study_after_16: "self_study",
    junior_not_completed_by_age_18: "job_search",
    nonstudent_direction_unresolved_by_age_18: "job_search",
  };
  return mapping[endingId] ?? "job_search";
}

function highestEducationFromAdolescence(adolescence) {
  if (adolescence.education.junior.status === "graduated_junior") return "junior_secondary";
  if (adolescence.education.primaryEnding?.graduated) return "primary";
  return "primary_not_completed";
}

function snapshot(state) {
  return {
    stageStatus: state.status,
    path: state.path,
    seniorStatus: state.education.senior?.status ?? null,
    seniorGrade: state.education.senior?.currentGrade ?? null,
    trainingStatus: state.training.status,
    employmentStatus: state.employment.status,
    annualHouseholdIncomeYuan: state.household.finance.annualHouseholdIncomeYuan,
    playerPersonalIncomeYuan: state.household.finance.playerPersonalIncomeYuan,
    visibleStats: Object.fromEntries(STAT_KEYS.map((key) => [key, state.visibleStats[key].value])),
  };
}

function serializeState(state) {
  return {
    schemaVersion: state.schemaVersion,
    seed: state.seed,
    personId: state.personId,
    birthYear: state.birthYear,
    residence: state.residence,
    status: state.status,
    currentAge: state.currentAge,
    path: state.path,
    entryPreparationPath: state.entryPreparationPath,
    household: state.household,
    education: state.education,
    routine: state.routine,
    training: state.training,
    workReadiness: state.workReadiness,
    employment: state.employment,
    socialNetwork: state.socialNetwork,
    interests: state.interests,
    childhoodGrowth: state.childhoodGrowth,
    youthMainlinePayoffs: state.youthMainlinePayoffs,
    randomEventHistory: state.randomEventHistory,
    visibleStats: state.visibleStats,
    characterModel: state.characterModel,
    annualRecords: state.annualRecords,
    priorDecisions: state.priorDecisions,
    decisions: state.decisions,
    ...(state.pendingDecision ? { pendingDecision: state.pendingDecision } : {}),
    ending: state.ending,
    provenance: {
      observationSourceIds: [...state.usedObservationSourceIds].sort(),
      assumptionIds: [...state.usedAssumptionIds].sort(),
    },
  };
}

/**
 * 从青少年结局推进普通高中、中职、短训、自学桥接或首份具体工作。
 */
export function simulateYouthEntry(
  birthProfile,
  adolescence,
  calibration,
  eventConfig,
  jobCatalog,
  options = {},
) {
  if (adolescence.status !== "completed_stage" || !adolescence.ending) {
    throw new Error(`青年入口阶段要求已完成的青少年状态，收到：${adolescence.status}`);
  }
  const seed = String(options.seed ?? `${adolescence.seed}:youth-entry`);
  const choices = options.choices ?? {};
  const autoChoose = options.autoChoose ?? true;
  const household = clone(adolescence.household);
  const ending = adolescence.ending;
  const path = initialPathFromAdolescence(ending.id);
  const startsInSeniorSchool = ["academic_senior", "vocational_secondary"].includes(path);
  const previousIncomeRatio = household.finance.annualIncomePerPersonYuan
    / household.finance.referenceMeanPerPersonYuan;
  const adolescentPreparation = adolescence.nonstudent?.age16Preparation ?? {};
  const state = {
    schemaVersion: 1,
    seed,
    personId: birthProfile.person.id,
    birthYear: birthProfile.person.birthYear,
    residence: birthProfile.person.residence,
    status: "in_progress",
    currentAge: ending.age + 1,
    path,
    entryPreparationPath: ending.nextPath ?? path,
    household,
    familyIncomeRelativeToReference: previousIncomeRatio,
    visibleStats: clone(adolescence.visibleStats),
    characterModel: clone(adolescence.characterModel),
    socialNetwork: clone(adolescence.socialNetwork ?? []),
    interests: clone(adolescence.interests ?? {}),
    childhoodGrowth: clone(adolescence.childhoodGrowth ?? null),
    youthMainlinePayoffs: clone(adolescence.youthMainlinePayoffs ?? null),
    randomEventHistory: clone(adolescence.randomEventHistory ?? []),
    education: {
      adolescenceEnding: clone(ending),
      highestCompleted: highestEducationFromAdolescence(adolescence),
      senior: startsInSeniorSchool
        ? {
            status: "enrolled",
            track: path,
            entryYear: ending.calendarYear + 1,
            entryAge: ending.age + 1,
            currentGrade: 1,
            completedGrades: 0,
            repeatedYears: 0,
            school: null,
            skillDirection: null,
            graduationYear: null,
            exitYear: null,
            lastGradeAttended: null,
            lastLearningProgressScore: null,
          }
        : null,
    },
    routine: {
      studyHoursPerWeek: path === "academic_senior"
        ? calibration.assumptions.seniorSchoolModel.academicBaseStudyHoursPerWeek
        : 9,
      practiceHoursPerWeek: path === "vocational_secondary"
        ? calibration.assumptions.seniorSchoolModel.vocationalPracticeHoursPerWeek
        : 0,
      householdLaborHoursPerWeek: adolescence.routine?.householdLaborHoursPerWeek
        ?? adolescence.nonstudent?.routine?.householdLaborHoursPerWeek
        ?? 8,
      peerHoursPerWeek: adolescence.routine?.peerHoursPerWeek ?? 3,
    },
    educationExpenseMultiplier: 1,
    higherEducationPreparationHours: adolescence.preparation?.academicHours ?? 0,
    training: {
      status: path === "short_training" ? "planned" : "not_started",
      skillDirection: null,
      completedHours: 0,
    },
    workReadiness: {
      jobSearchContacts: adolescentPreparation.jobSearchContacts ?? 0,
      familyIntroductions: adolescentPreparation.familyIntroductions ?? 0,
      skillDirection: null,
    },
    employment: {
      status: "not_started",
      currentJob: null,
      history: [],
      searchAttempts: [],
    },
    annualRecords: [],
    priorDecisions: [...clone(adolescence.priorDecisions), ...clone(adolescence.decisions)],
    decisions: [],
    triggeredEventIds: new Set(),
    ending: null,
    usedObservationSourceIds: new Set(),
    usedAssumptionIds: new Set(),
  };
  applyStoredPayoffCredits(state);

  const startAge = ending.age + 1;
  for (let age = startAge; age <= calibration.scope.maximumStageAge; age += 1) {
    const year = state.birthYear + age;
    const random = createSeededRandom(`${seed}:${year}:${age}`);
    const reference = getYouthYearReference(calibration, year);
    const record = {
      calendarYear: year,
      age,
      pathAtStart: state.path,
      facts: [],
      statChanges: [],
      decision: null,
      endState: null,
    };
    state.currentAge = age;
    updateMemberAges(state, year);
    const milestones = calibration.observations.historicalMilestones.filter(
      (milestone) => milestone.year === year,
    );
    for (const milestone of milestones) state.usedObservationSourceIds.add(milestone.sourceId);
    addFact(record, "youth_year_context", {
      residence: state.residence,
      pathAtStart: state.path,
      historicalMilestones: clone(milestones),
      formalEmploymentMinimumAge: calibration.scope.formalEmploymentMinimumAge,
      ordinaryEmploymentAgeReached: age >= calibration.scope.formalEmploymentMinimumAge,
    });
    const healthFact = simulateHealth(state, calibration, random, record);
    const financeFact = settleHouseholdYear(state, calibration, reference, random, record);
    applyFinanceStats(state, calibration, financeFact, record);

    const annualReady = handleAnnualOperation({
      state,
      record,
      catalog: options.annualOperationCatalog,
      content: options.quarterlyLifeContent,
      stage: "youth",
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
        path: state.path,
        educationStatus: state.education.senior?.status ?? null,
        employmentStatus: state.employment.status,
        cashReferenceYuan: financeFact.referenceMeanPerPersonYuan,
        affordableCashYuan: financeFact.householdIncomeRelativeToReference < 0.85
          ? 0
          : financeFact.annualHouseholdIncomeYuan * 0.005,
      },
    });
    if (!annualReady) {
      record.endState = snapshot(state);
      state.annualRecords.push(record);
      break;
    }
    const socialRole = state.path === "academic_senior"
      ? "senior_peer"
      : (state.path === "vocational_secondary" || state.path === "short_training"
          ? "training_peer"
          : "work_contact");
    updateSocialCharacters({
      state,
      record,
      catalog: options.socialCharacterCatalog,
      roleId: socialRole,
      operationId: record.annualOperation?.chosenOptionId,
      createByDefault: ["academic_senior", "vocational_secondary"].includes(state.path)
        && state.education.senior?.currentGrade === 1
        && state.education.senior?.completedGrades === 0,
      random: createSeededRandom(`${seed}:social:${year}:${socialRole}`),
      addFact,
    });

    if (["academic_senior", "vocational_secondary"].includes(state.path)) {
      if (!state.education.senior.school) {
        createSeniorSchool(state, calibration, year, random, record);
      }
      const ready = handleConfiguredEvent(
        state,
        calibration,
        eventConfig,
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
      const schoolOutcome = simulateSeniorSchoolYear(
        state,
        calibration,
        reference,
        financeFact,
        healthFact,
        random,
        record,
      );
      if (
        schoolOutcome.maySearchNow
        && state.status === "in_progress"
        && age >= calibration.scope.formalEmploymentMinimumAge
      ) {
        handleJobSearch(
          state,
          calibration,
          jobCatalog,
          choices,
          autoChoose,
          random,
          record,
          financeFact,
          schoolOutcome.availableWorkMonths,
        );
      }
    } else if (state.path === "family_economic_activity") {
      if (age < calibration.scope.formalEmploymentMinimumAge) {
        throw new Error("家庭经济活动入口不应早于模型正式就业最低年龄");
      }
      startFamilyEconomicActivity(
        state,
        calibration,
        jobCatalog,
        random,
        record,
        financeFact,
      );
    } else if (state.path === "short_training") {
      const availableMonths = simulateShortTraining(state, calibration, healthFact, random, record);
      handleJobSearch(
        state,
        calibration,
        jobCatalog,
        choices,
        autoChoose,
        random,
        record,
        financeFact,
        availableMonths,
      );
    } else if (state.path === "self_study") {
      const availableMonths = simulateSelfStudyBridge(state, calibration, random, record);
      handleJobSearch(
        state,
        calibration,
        jobCatalog,
        choices,
        autoChoose,
        random,
        record,
        financeFact,
        availableMonths,
      );
    } else if (state.path === "job_search") {
      if (age < calibration.scope.formalEmploymentMinimumAge) {
        const preparationFact = addFact(record, "under16_work_preparation_only", {
          householdLaborHoursPerWeek: state.routine.householdLaborHoursPerWeek,
          skillPracticeHours: randomInt(random, 120, 280),
          jobSearchContactsAdded: 2,
          employerCreated: false,
          laborRelationshipCreated: false,
          laborContract: null,
          cashWageYuan: 0,
          ordinaryEmploymentSuppressedUntilAge: calibration.scope.formalEmploymentMinimumAge,
        });
        state.workReadiness.jobSearchContacts += 2;
        changeStat(state, record, "ability", 1, preparationFact.id, "未满16岁时只进行技能练习和求职准备");
      } else {
        handleJobSearch(
          state,
          calibration,
          jobCatalog,
          choices,
          autoChoose,
          random,
          record,
          financeFact,
          randomInt(random, 8, 12),
        );
      }
    } else {
      throw new Error(`青年入口阶段未知路径：${state.path}`);
    }

    const reviewReady = handleYearReview({
      state,
      record,
      stage: "youth",
      reviewedYears: options.reviewedYears,
      autoChoose,
      enabled: Boolean(options.annualOperationCatalog),
    });
    if (!reviewReady) {
      record.endState = snapshot(state);
      state.annualRecords.push(record);
      break;
    }

    record.endState = snapshot(state);
    state.annualRecords.push(record);
    if (["completed_stage", "awaiting_choice"].includes(state.status)) break;
  }

  if (state.status === "in_progress") {
    const lastRecord = state.annualRecords.at(-1);
    const fact = addFact(lastRecord, "youth_entry_age_limit_reached", {
      maximumStageAge: calibration.scope.maximumStageAge,
      educationStatus: state.education.senior?.status ?? null,
      highestCompletedEducation: state.education.highestCompleted,
      searchAttemptCount: state.employment.searchAttempts.length,
      actualEmploymentCreated: false,
    });
    state.status = "completed_stage";
    state.ending = {
      id: "no_job_or_higher_education_by_age_24",
      calendarYear: lastRecord.calendarYear,
      age: lastRecord.age,
      sourceFactId: fact.id,
      actualEmploymentCreated: false,
      actualEconomicActivityCreated: false,
    };
    lastRecord.endState = snapshot(state);
  }
  return serializeState(state);
}
