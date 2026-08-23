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

export function getAdolescenceYearReference(calibration, year) {
  const reference = calibration.observations.yearlyHouseholdReferences.find(
    (entry) => entry.year === year,
  );
  if (!reference) throw new RangeError(`青少年阶段缺少 ${year} 年家庭统计参考`);
  return reference;
}

export function getJuniorGrossEnrollmentRate(calibration, year) {
  return interpolateAnchors(
    calibration.observations.juniorGrossEnrollmentRateAnchors,
    year,
    "rate",
  );
}

export function getJuniorDropoutRate(calibration, year) {
  return interpolateAnchors(calibration.observations.juniorDropoutRateAnchors, year, "rate");
}

export function getJuniorToSeniorProgressionRate(calibration, year) {
  return interpolateAnchors(
    calibration.observations.juniorToSeniorProgressionAnchors,
    year,
    "rate",
  );
}

export function getJuniorStudentsPerTeacherReference(calibration, year) {
  return roundTo(
    interpolateAnchors(
      calibration.observations.juniorStudentsPerTeacherReference,
      year,
      "value",
    ),
    2,
  );
}

export function getSeniorVocationalShareReference(calibration, year) {
  return interpolateAnchors(
    calibration.observations.seniorStageVocationalShareAnchors,
    year,
    "rate",
  );
}

export function getStaffAverageWageReference(calibration, year) {
  return roundTo(
    interpolateAnchors(calibration.observations.staffAverageWageAnchors, year, "yuanPerYear"),
    2,
  );
}

export function getEmploymentStructureReference(calibration, year) {
  const anchors = calibration.observations.employmentStructureAnchors;
  return {
    year,
    primary: roundTo(interpolateAnchors(anchors, year, "primary"), 4),
    secondary: roundTo(interpolateAnchors(anchors, year, "secondary"), 4),
    tertiary: roundTo(interpolateAnchors(anchors, year, "tertiary"), 4),
    urbanPrivateEmployeesTenThousands: roundTo(
      interpolateAnchors(anchors, year, "urbanPrivateEmployeesTenThousands"),
      1,
    ),
    urbanIndividualWorkersTenThousands: roundTo(
      interpolateAnchors(anchors, year, "urbanIndividualWorkersTenThousands"),
      1,
    ),
    ruralTownshipEnterpriseWorkersTenThousands: roundTo(
      interpolateAnchors(anchors, year, "ruralTownshipEnterpriseWorkersTenThousands"),
      1,
    ),
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
  state.visibleStats[stat].status = "derived_from_adolescence_fact";
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

function allocateHouseholdIncome(state, annualHouseholdIncome, random) {
  const earners = state.household.members.filter((member) => member.job);
  const weights = earners.map((member) => {
    const range = member.job.sector === "primary" ? [9, 12] : [10, 12];
    member.job.workMonthsThisYear = randomInt(random, range[0], range[1]);
    return member.job.workMonthsThisYear * (0.88 + random() * 0.24);
  });
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  let allocated = 0;
  for (const member of state.household.members) {
    member.annualIncomeContributionYuan = 0;
    if (member.job) member.job.annualIncomeContributionYuan = 0;
  }
  earners.forEach((member, index) => {
    const amount = index === earners.length - 1
      ? roundTo(annualHouseholdIncome - allocated, 2)
      : roundTo((annualHouseholdIncome * weights[index]) / totalWeight, 2);
    member.annualIncomeContributionYuan = amount;
    member.job.annualIncomeContributionYuan = amount;
    allocated += amount;
  });
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
  const annualHouseholdIncome = roundTo(
    referenceIncome * state.household.members.length * state.incomeRelativeToReference * meanOneShock,
    2,
  );
  allocateHouseholdIncome(state, annualHouseholdIncome, random);
  const incomePerPerson = roundTo(annualHouseholdIncome / state.household.members.length, 2);
  state.incomeRelativeToReference = incomePerPerson / referenceIncome;
  state.household.finance = {
    year: reference.year,
    currency: calibration.scope.currency,
    priceBasis: calibration.scope.priceBasis,
    incomeMeasureType: state.residence === "urban"
      ? "urban_disposable_income"
      : "rural_net_income",
    annualHouseholdIncomeYuan: annualHouseholdIncome,
    annualIncomePerPersonYuan: incomePerPerson,
    referenceMeanPerPersonYuan: referenceIncome,
    foodExpenditureShareReference: engelCoefficient,
    educationCashExpenseYuan: 0,
    cashAfterEducationExpenseYuan: annualHouseholdIncome,
    cashSavingsYuan: null,
    debtYuan: null,
  };
  return addFact(record, "adolescence_household_finance_settled", {
    annualHouseholdIncomeYuan: annualHouseholdIncome,
    annualIncomePerPersonYuan: incomePerPerson,
    referenceMeanPerPersonYuan: referenceIncome,
    incomeRelativeToReference: roundTo(state.incomeRelativeToReference, 4),
    foodExpenditureShareReference: engelCoefficient,
    coResidentSize: state.household.members.length,
    parentJobsCarriedForwardWithoutCareerTransition: true,
  });
}

function settleFoodNeed(state, financeFact, random, record) {
  const monthlyProbability = clamp(
    0.018
      + Math.max(0, 0.90 - financeFact.incomeRelativeToReference) * 0.17
      + Math.max(0, financeFact.foodExpenditureShareReference - 0.52) * 0.18,
    0.008,
    0.30,
  );
  let months = 0;
  for (let month = 0; month < 12; month += 1) {
    if (random() < monthlyProbability) months += 1;
  }
  return addFact(record, "adolescence_food_need_shortfall", {
    months,
    modeledMonthlyProbability: roundTo(monthlyProbability, 4),
  });
}

function simulateHealth(state, calibration, random, record) {
  state.usedAssumptionIds.add(calibration.assumptions.studentIllnessAbsence.id);
  const episodeCount = poisson(random, calibration.assumptions.studentIllnessAbsence.meanEpisodesPerYear);
  let severeEpisodeCount = 0;
  let symptomDays = 0;
  for (let index = 0; index < episodeCount; index += 1) {
    const severe = random() < calibration.assumptions.studentIllnessAbsence.severeEpisodeProbability;
    if (severe) severeEpisodeCount += 1;
    symptomDays += severe ? randomInt(random, 8, 18) : randomInt(random, 2, 7);
  }
  return addFact(record, "adolescent_health_year_summary", {
    symptomEpisodeCount: episodeCount,
    severeEpisodeCount,
    symptomDays,
    schoolAbsenceDays: Math.min(22, Math.ceil(symptomDays * 0.48)),
    diagnosis: null,
  });
}

function applyHouseholdStatEffects(state, calibration, financeFact, foodFact, record) {
  state.usedAssumptionIds.add(calibration.assumptions.visibleStatEvolution.id);
  setStat(
    state,
    record,
    "wealth",
    50 + 20 * Math.log(financeFact.incomeRelativeToReference),
    financeFact.id,
    "由本年家庭人均收入相对同年同城乡参考值重算",
  );
  if (foodFact.months >= 3) {
    changeStat(state, record, "health", -1, foodFact.id, "本年食品需要未充分满足月份影响健康");
    changeStat(state, record, "mood", -1, foodFact.id, "本年家庭食品安排影响日常体验");
  }
}

function getSchoolFormShares(calibration, year, residence) {
  const assumption = calibration.assumptions.schoolFormDistribution;
  if (residence === "urban") return assumption.urban;
  const progress = clamp((year - 1990) / 10, 0, 1);
  return Object.fromEntries(
    Object.keys(assumption.rural1990).map((key) => [
      key,
      assumption.rural1990[key]
        + (assumption.rural2000[key] - assumption.rural1990[key]) * progress,
    ]),
  );
}

function chooseShare(random, shares) {
  return weightedChoice(
    random,
    Object.entries(shares).map(([value, weight]) => ({ value, weight })),
  );
}

function createJuniorSchool(state, calibration, year, random, record) {
  state.usedAssumptionIds.add(calibration.assumptions.schoolFormDistribution.id);
  state.usedAssumptionIds.add(calibration.assumptions.instructionAndExpense.id);
  for (const anchor of calibration.observations.juniorStudentsPerTeacherReference) {
    state.usedObservationSourceIds.add(anchor.sourceId);
  }
  for (const anchor of calibration.observations.juniorGrossEnrollmentRateAnchors) {
    state.usedObservationSourceIds.add(anchor.sourceId);
  }
  const form = chooseShare(random, getSchoolFormShares(calibration, year, state.residence));
  const school = {
    id: `junior-school-${state.personId}-${year}`,
    entryYear: year,
    prescribedYears: calibration.assumptions.gradeProgressionAndGraduation.years,
    form,
    annualInstructionDays: calibration.assumptions.instructionAndExpense.instructionDays,
    studentsPerTeacherNationalReference: getJuniorStudentsPerTeacherReference(calibration, year),
    specificSchoolStudentTeacherRatio: null,
  };
  addFact(record, "junior_school_assigned", {
    ...school,
    nationalJuniorGrossEnrollmentRateReference: roundTo(
      getJuniorGrossEnrollmentRate(calibration, year),
      4,
    ),
  });
  return school;
}

function findApplicableEvent(state, eventConfig, record) {
  return eventConfig.events.find((event) => {
    if (state.triggeredEventIds.has(event.id) || event.path !== state.path) return false;
    if (event.trigger === "on_junior_entry") {
      return state.education.junior.currentGrade === 1
        && record.calendarYear === state.education.junior.entryYear;
    }
    if (event.trigger === "before_grade") {
      return state.education.junior.currentGrade === event.grade;
    }
    if (event.trigger === "before_final_grade") {
      return state.education.junior.currentGrade
        === state.education.junior.school.prescribedYears;
    }
    if (event.trigger === "on_nonstudent_path_entry") {
      return !state.nonstudent.entryDecisionHandled && record.age < 16;
    }
    if (event.trigger === "at_age") return record.age >= event.age;
    return false;
  });
}

function chooseEventOption(state, event, random, choices, autoChoose) {
  const requestedId = choices[event.id];
  if (requestedId) {
    const option = event.options.find((candidate) => candidate.id === requestedId);
    if (!option) throw new Error(`事件 ${event.id} 不存在选项 ${requestedId}`);
    return { option, selectionMode: "manual" };
  }
  if (!autoChoose) return null;
  const option = weightedChoice(
    random,
    event.options.map((candidate) => ({
      value: candidate,
      weight: candidate.autoWeightByResidence?.[state.residence] ?? candidate.autoWeight ?? 1,
    })),
  );
  return { option, selectionMode: "automatic" };
}

function applyEventOption(state, event, option, selectionMode, record) {
  const fact = addFact(record, "adolescence_player_action", {
    eventId: event.id,
    optionId: option.id,
    routineChanges: clone(option.routineChanges ?? null),
    nonstudentRoutineChanges: clone(option.nonstudentRoutineChanges ?? null),
    educationExpenseMultiplier: option.educationExpenseMultiplier ?? null,
    academicPreparationHours: option.academicPreparationHours ?? 0,
    vocationalPreparationHours: option.vocationalPreparationHours ?? 0,
    employmentPreparationHours: option.employmentPreparationHours ?? 0,
    preparationFacts: clone(option.preparationFacts ?? null),
    nextPath: option.nextPath ?? null,
    annualFacts: clone(option.annualFacts ?? null),
  });
  if (option.routineChanges) Object.assign(state.routine, option.routineChanges);
  if (option.nonstudentRoutineChanges) {
    Object.assign(state.nonstudent.routine, option.nonstudentRoutineChanges);
  }
  if (option.educationExpenseMultiplier != null) {
    state.educationExpenseMultiplier = option.educationExpenseMultiplier;
  }
  state.preparation.academicHours += option.academicPreparationHours ?? 0;
  state.preparation.vocationalHours += option.vocationalPreparationHours ?? 0;
  state.preparation.employmentHours += option.employmentPreparationHours ?? 0;
  if (option.preparationFacts) state.nonstudent.age16Preparation = clone(option.preparationFacts);
  if (option.nextPath) state.nextPath = option.nextPath;
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
  if (event.trigger === "on_nonstudent_path_entry") state.nonstudent.entryDecisionHandled = true;
  return fact;
}

function handleEvent(state, eventConfig, choices, autoChoose, random, record) {
  const event = findApplicableEvent(state, eventConfig, record);
  if (!event) return true;
  const selected = chooseEventOption(state, event, random, choices, autoChoose);
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
  applyEventOption(state, event, selected.option, selected.selectionMode, record);
  return true;
}

function settleEducationExpense(state, calibration, reference, financeFact, record) {
  const assumption = calibration.assumptions.instructionAndExpense;
  state.usedAssumptionIds.add(assumption.id);
  const referenceIncome = state.residence === "urban"
    ? reference.urbanIncomePerPersonYuan
    : reference.ruralIncomePerPersonYuan;
  const formMultiplier = assumption.schoolFormExpenseMultiplier[
    state.education.junior.school.form
  ];
  const amount = roundTo(
    referenceIncome
      * assumption.baseExpenseShareOfReferenceIncome[state.residence]
      * formMultiplier
      * state.educationExpenseMultiplier,
    2,
  );
  const shareOfHouseholdIncome = amount / financeFact.annualHouseholdIncomeYuan;
  state.household.finance.educationCashExpenseYuan = amount;
  state.household.finance.cashAfterEducationExpenseYuan = roundTo(
    financeFact.annualHouseholdIncomeYuan - amount,
    2,
  );
  const fact = addFact(record, "junior_education_cash_expense", {
    amountYuan: amount,
    shareOfAnnualHouseholdIncome: roundTo(shareOfHouseholdIncome, 5),
    expenseMultiplierFromChoice: state.educationExpenseMultiplier,
    schoolFormMultiplier: formMultiplier,
    referenceIncomePerPersonYuan: referenceIncome,
    includesExactLocalFeeSchedule: false,
  });
  if (shareOfHouseholdIncome >= 0.08) {
    changeStat(state, record, "wealth", -2, fact.id, "本年初中现金支出占家庭收入较高");
    changeStat(state, record, "mood", -1, fact.id, "本年教育现金支出增加家庭压力");
  } else if (shareOfHouseholdIncome >= 0.04) {
    changeStat(state, record, "wealth", -1, fact.id, "本年初中现金支出进入家庭账本");
  }
  return fact;
}

function moveToNonstudentPath(state, year, reasonFactId) {
  state.path = "nonstudent";
  state.nonstudent.entryYear = year + 1;
  state.nonstudent.entryReasonFactId = reasonFactId;
  state.nonstudent.entryDecisionHandled = false;
}

function settleSeniorTransition(state, calibration, year, learningScore, expenseFact, random, record, graduationFact) {
  state.usedAssumptionIds.add(calibration.assumptions.seniorTransitionProbability.id);
  state.usedAssumptionIds.add(calibration.assumptions.seniorTrackAllocation.id);
  for (const anchor of calibration.observations.juniorToSeniorProgressionAnchors) {
    state.usedObservationSourceIds.add(anchor.sourceId);
  }
  for (const anchor of calibration.observations.seniorStageVocationalShareAnchors) {
    state.usedObservationSourceIds.add(anchor.sourceId);
  }
  if (year >= Number(calibration.observations.vocationalEducationLaw.effective.slice(0, 4))) {
    state.usedObservationSourceIds.add(calibration.observations.vocationalEducationLaw.sourceId);
  }
  const base = getJuniorToSeniorProgressionRate(calibration, year);
  const combinedPreparation = state.preparation.academicHours + state.preparation.vocationalHours;
  const probability = logistic(
    logit(base)
      + (learningScore - 55) * 0.020
      + (combinedPreparation - 120) / 180
      + Math.log(Math.max(0.2, state.incomeRelativeToReference)) * 0.16
      - expenseFact.shareOfAnnualHouseholdIncome * 1.8,
  );
  const enteredSeniorStage = random() < probability;
  const vocationalReference = getSeniorVocationalShareReference(calibration, year);
  let track = null;
  let vocationalProbability = null;
  if (enteredSeniorStage) {
    vocationalProbability = logistic(
      logit(vocationalReference)
        + (state.preparation.vocationalHours - state.preparation.academicHours) / 120,
    );
    track = random() < vocationalProbability ? "vocational_secondary" : "academic_senior";
  }
  const fact = addFact(record, "senior_secondary_transition_outcome", {
    enteredSeniorStage,
    intendedEntryYear: enteredSeniorStage ? year + 1 : null,
    track,
    nationalJuniorToSeniorProgressionRateReference: roundTo(base, 4),
    modeledIndividualProbability: roundTo(probability, 5),
    seniorStageVocationalStudentShareReference: roundTo(vocationalReference, 4),
    modeledVocationalTrackProbability: vocationalProbability == null
      ? null
      : roundTo(vocationalProbability, 5),
    vocationalReferenceUsedAsEntrantApproximation: true,
    finalLearningProgressScore: learningScore,
    academicPreparationHours: state.preparation.academicHours,
    vocationalPreparationHours: state.preparation.vocationalHours,
    educationExpenseShareOfHouseholdIncome: expenseFact.shareOfAnnualHouseholdIncome,
    juniorGraduationFactId: graduationFact.id,
  });
  if (enteredSeniorStage) {
    state.status = "completed_stage";
    state.ending = {
      id: track === "vocational_secondary"
        ? "entered_vocational_secondary"
        : "entered_academic_senior_secondary",
      calendarYear: year,
      age: record.age,
      sourceFactId: fact.id,
      juniorGraduated: true,
      enteredSeniorStage: true,
      track,
    };
  } else {
    moveToNonstudentPath(state, year, fact.id);
  }
}

function simulateJuniorSchoolYear(
  state,
  calibration,
  reference,
  financeFact,
  healthFact,
  foodFact,
  random,
  record,
) {
  const school = state.education.junior.school;
  const expenseFact = settleEducationExpense(state, calibration, reference, financeFact, record);
  state.usedAssumptionIds.add(calibration.assumptions.learningProgress.id);
  state.usedAssumptionIds.add(calibration.assumptions.individualDropoutProbability.id);
  state.usedAssumptionIds.add(calibration.assumptions.gradeProgressionAndGraduation.id);
  const householdLaborHours = state.routine.householdLaborHoursPerWeek
    + Math.min(4, foodFact.months * 0.4);
  const familyLaborAbsenceDays = Math.min(
    38,
    Math.max(0, Math.floor((householdLaborHours - 7) * 1.05 + foodFact.months * 0.6)),
  );
  const illnessAbsenceDays = healthFact.schoolAbsenceDays;
  const expenseAbsenceDays = Math.min(
    16,
    Math.floor(expenseFact.shareOfAnnualHouseholdIncome * 90),
  );
  const attendedDays = Math.max(
    0,
    school.annualInstructionDays
      - familyLaborAbsenceDays
      - illnessAbsenceDays
      - expenseAbsenceDays,
  );
  const attendanceRate = attendedDays / school.annualInstructionDays;
  const learningProgressScore = score(
    48
      + (attendanceRate - 0.88) * 75
      + (state.routine.studyHoursPerWeek - 7) * 2.0
      + state.visibleStats.ability.value * 0.20
      - Math.max(0, householdLaborHours - 10) * 1.05
      + Math.min(2, state.routine.peerHoursPerWeek) * 0.35
      + standardNormal(random) * calibration.assumptions.learningProgress.annualShockStandardDeviation,
  );
  const schoolYearFact = addFact(record, "junior_school_year_attendance_and_learning", {
    grade: state.education.junior.currentGrade,
    schoolForm: school.form,
    prescribedInstructionDays: school.annualInstructionDays,
    attendedDays,
    illnessAbsenceDays,
    familyLaborAbsenceDays,
    educationExpenseAbsenceDays: expenseAbsenceDays,
    attendanceRate: roundTo(attendanceRate, 4),
    studyHoursPerWeek: state.routine.studyHoursPerWeek,
    householdLaborHoursPerWeek: roundTo(householdLaborHours, 2),
    peerHoursPerWeek: state.routine.peerHoursPerWeek,
    learningProgressScore,
    scoreMeaning: "game_internal_learning_progress_not_standardized_exam_score",
    studentsPerTeacherNationalReference: school.studentsPerTeacherNationalReference,
    specificSchoolStudentTeacherRatio: school.specificSchoolStudentTeacherRatio,
  });
  if (learningProgressScore >= 75) {
    changeStat(state, record, "ability", 3, schoolYearFact.id, "本学年出勤和学习形成较多能力积累");
  } else if (learningProgressScore >= 58) {
    changeStat(state, record, "ability", 2, schoolYearFact.id, "本学年出勤和学习形成能力积累");
  } else if (learningProgressScore >= 43) {
    changeStat(state, record, "ability", 1, schoolYearFact.id, "本学年完成可记录的学习积累");
  }
  if (state.routine.peerHoursPerWeek >= 6) {
    changeStat(state, record, "relationships", 1, schoolYearFact.id, "本学年持续与同伴共同学习或活动");
  }
  if (householdLaborHours >= 14) {
    changeStat(state, record, "mood", -1, schoolYearFact.id, "家庭劳动占用较多课余时间");
  }
  if (healthFact.severeEpisodeCount > 0) {
    changeStat(state, record, "health", -1, healthFact.id, "本年较重症状产生病假");
  }

  for (const anchor of calibration.observations.juniorDropoutRateAnchors) {
    state.usedObservationSourceIds.add(anchor.sourceId);
  }
  const dropoutBase = getJuniorDropoutRate(calibration, record.calendarYear);
  const dropoutProbability = logistic(
    logit(dropoutBase)
      + Math.max(0, 1 - state.incomeRelativeToReference) * 0.72
      + (1 - attendanceRate) * 2.6
      + Math.max(0, householdLaborHours - 9) * 0.055
      + Math.max(0, 45 - learningProgressScore) * 0.027
      + expenseFact.shareOfAnnualHouseholdIncome * 2.2
      - Math.max(0, learningProgressScore - 62) * 0.011,
  );
  const exited = random() < dropoutProbability;
  const continuationFact = addFact(record, "junior_continuation_outcome", {
    continued: !exited,
    nationalJuniorDropoutRateReference: roundTo(dropoutBase, 4),
    modeledIndividualExitProbability: roundTo(dropoutProbability, 5),
    inputAttendanceRate: roundTo(attendanceRate, 4),
    inputLearningProgressScore: learningProgressScore,
    inputHouseholdLaborHoursPerWeek: roundTo(householdLaborHours, 2),
    inputEducationExpenseShareOfHouseholdIncome: expenseFact.shareOfAnnualHouseholdIncome,
    inputIncomeRelativeToReference: roundTo(state.incomeRelativeToReference, 4),
  });
  if (exited) {
    state.education.junior.status = "exited_junior_before_completion";
    state.education.junior.lastGradeAttended = state.education.junior.currentGrade;
    state.usedAssumptionIds.add(calibration.assumptions.noJuniorReentry.id);
    moveToNonstudentPath(state, record.calendarYear, continuationFact.id);
    return;
  }

  const finalGrade = state.education.junior.currentGrade === school.prescribedYears;
  let failedFinalGraduation = false;
  if (finalGrade) {
    const assumption = calibration.assumptions.gradeProgressionAndGraduation;
    const assessmentFact = addFact(record, "junior_completion_assessment", {
      attended: true,
      assessmentForm: "local_graduation_or_admission_assessment_proxy",
      aggregatePerformanceIndex: learningProgressScore,
      standardizedExamScore: null,
      subjectScores: null,
      jurisdictionSpecificRules: null,
      interpretation: "game_internal_index_not_a_reconstructed_local_exam_score",
    });
    const graduationProbability = logistic(
      logit(assumption.baseGraduationProbability)
        + (attendanceRate - 0.90) * 1.6
        + (learningProgressScore - 55) * 0.018,
    );
    const graduated = random() < graduationProbability;
    const graduationFact = addFact(record, "junior_graduation_outcome", {
      graduated,
      modeledIndividualProbability: roundTo(graduationProbability, 5),
      prescribedYears: school.prescribedYears,
      actualYearsSinceEntry: record.calendarYear - state.education.junior.entryYear + 1,
      finalLearningProgressScore: learningProgressScore,
      finalAttendanceRate: roundTo(attendanceRate, 4),
      assessmentFactId: assessmentFact.id,
    });
    if (graduated) {
      state.education.junior.status = "graduated_junior";
      state.education.junior.graduationYear = record.calendarYear;
      state.education.junior.completedGrades = school.prescribedYears;
      state.education.junior.finalLearningProgressScore = learningProgressScore;
      changeStat(state, record, "ability", 2, graduationFact.id, "完成三年初中教育并毕业");
      settleSeniorTransition(
        state,
        calibration,
        record.calendarYear,
        learningProgressScore,
        expenseFact,
        random,
        record,
        graduationFact,
      );
      return;
    }
    failedFinalGraduation = true;
  }

  const repeatProbability = clamp(
    calibration.assumptions.gradeProgressionAndGraduation.baseRepeatProbability
      + Math.max(0, 44 - learningProgressScore) * 0.007
      + Math.max(0, 0.84 - attendanceRate) * 0.72,
    0.008,
    0.40,
  );
  const repeated = failedFinalGraduation || random() < repeatProbability;
  const progressionFact = addFact(record, "junior_grade_progression", {
    gradeBefore: state.education.junior.currentGrade,
    repeated,
    modeledRepeatProbability: roundTo(repeatProbability, 5),
    learningProgressScore,
    attendanceRate: roundTo(attendanceRate, 4),
  });
  if (repeated) {
    state.education.junior.repeatedYears += 1;
  } else if (!finalGrade) {
    state.education.junior.completedGrades = Math.max(
      state.education.junior.completedGrades,
      state.education.junior.currentGrade,
    );
    state.education.junior.currentGrade += 1;
    changeStat(state, record, "ability", 1, progressionFact.id, "完成本年级并进入下一年级");
  }
}

function simulateNonstudentYear(state, calibration, healthFact, random, record) {
  state.usedAssumptionIds.add(calibration.assumptions.under16NonStudentActivity.id);
  const employmentReference = getEmploymentStructureReference(calibration, record.calendarYear);
  const wageReference = getStaffAverageWageReference(calibration, record.calendarYear);
  for (const anchor of calibration.observations.employmentStructureAnchors) {
    state.usedObservationSourceIds.add(anchor.sourceId);
  }
  for (const anchor of calibration.observations.staffAverageWageAnchors) {
    state.usedObservationSourceIds.add(anchor.sourceId);
  }
  const childLaborRuleYear = Number(
    calibration.observations.childLaborRegulation1991.effective.slice(0, 4),
  );
  if (record.calendarYear >= childLaborRuleYear) {
    state.usedObservationSourceIds.add(
      calibration.observations.childLaborRegulation1991.sourceId,
    );
  }
  const activityFact = addFact(record, "nonstudent_annual_activity", {
    educationStatus: state.education.junior.status,
    householdLaborHoursPerWeek: state.nonstudent.routine.householdLaborHoursPerWeek,
    selfStudyHoursPerWeek: state.nonstudent.routine.selfStudyHoursPerWeek,
    skillPracticeHoursPerWeek: state.nonstudent.routine.skillPracticeHoursPerWeek,
    employmentRelationshipCreated: false,
    employer: null,
    laborContract: null,
    cashWageYuan: 0,
    activityNature: record.age < 16
      ? "family_housework_production_self_study_or_observation"
      : "preparation_before_next_stage",
    nationalEmploymentStructureReference: employmentReference,
    nationalStaffAverageWageReferenceYuan: wageReference,
    nationalAverageWageAssignedToPerson: false,
    childLaborRegulation1991Effective: record.calendarYear >= childLaborRuleYear,
    localizedPoorRuralAuxiliaryLaborExceptionModeled: false,
    under16EmploymentSuppressedByModel: record.age < 16,
  });
  state.nonstudent.cumulativeSelfStudyHours +=
    state.nonstudent.routine.selfStudyHoursPerWeek * 46;
  state.nonstudent.cumulativeSkillPracticeHours +=
    state.nonstudent.routine.skillPracticeHoursPerWeek * 46;
  if (state.nonstudent.routine.selfStudyHoursPerWeek >= 8) {
    changeStat(state, record, "ability", 2, activityFact.id, "本年保持固定自学时间");
  } else if (state.nonstudent.routine.skillPracticeHoursPerWeek >= 8) {
    changeStat(state, record, "ability", 2, activityFact.id, "本年持续观察和练习具体技能");
  } else if (state.nonstudent.routine.householdLaborHoursPerWeek >= 20) {
    changeStat(state, record, "ability", 1, activityFact.id, "本年持续参与家庭生产或家务");
  }
  if (state.nonstudent.routine.householdLaborHoursPerWeek >= 28) {
    changeStat(state, record, "health", -1, activityFact.id, "本年家庭劳动时间较长");
    changeStat(state, record, "relationships", 1, activityFact.id, "本年持续承担家庭事务");
  }
  if (healthFact.severeEpisodeCount > 0) {
    changeStat(state, record, "health", -1, healthFact.id, "本年较重症状影响日常活动");
  }
  if (record.age < calibration.scope.formalEmploymentMinimumAge) return;

  const laborLawYear = Number(calibration.observations.laborLaw.effective.slice(0, 4));
  state.usedObservationSourceIds.add(calibration.observations.laborLaw.sourceId);
  state.usedAssumptionIds.add(calibration.assumptions.age16PreparationOutcome.id);
  const preparationFact = addFact(record, "age16_next_stage_preparation", {
    chosenNextPath: state.nextPath,
    legalMinimumOrdinaryEmploymentAge: calibration.scope.formalEmploymentMinimumAge,
    laborLawEffectiveThisYear: record.calendarYear >= laborLawYear,
    trainingHours: state.nonstudent.age16Preparation?.trainingHours ?? 0,
    selfStudyHours: state.nonstudent.age16Preparation?.selfStudyHours ?? 0,
    jobSearchContacts: state.nonstudent.age16Preparation?.jobSearchContacts ?? 0,
    familyIntroductions: state.nonstudent.age16Preparation?.familyIntroductions ?? 0,
    employerSecured: false,
    wageSecuredYuan: null,
    nextStageMustResolveActualOpportunity: true,
  });
  const endingIds = {
    family_economic_activity: "prepared_for_family_economic_activity",
    entry_job_search: "prepared_for_entry_job_search",
    short_vocational_training: "prepared_for_short_vocational_training",
    continued_self_study: "continued_self_study_after_16",
  };
  state.status = "completed_stage";
  state.ending = {
    id: endingIds[state.nextPath] ?? "adolescent_direction_unresolved",
    calendarYear: record.calendarYear,
    age: record.age,
    sourceFactId: preparationFact.id,
    nextPath: state.nextPath,
    actualEmploymentCreated: false,
  };
}

function snapshot(state) {
  return {
    stageStatus: state.status,
    path: state.path,
    juniorStatus: state.education.junior.status,
    juniorGrade: state.education.junior.currentGrade,
    annualHouseholdIncomeYuan: state.household.finance.annualHouseholdIncomeYuan,
    educationCashExpenseYuan: state.household.finance.educationCashExpenseYuan,
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
    household: state.household,
    education: state.education,
    routine: state.routine,
    preparation: state.preparation,
    nonstudent: state.nonstudent,
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
 * 从小学结局推进到高中阶段入口，或生成16岁后的劳动/训练准备接口。
 */
export function simulateAdolescence(
  birthProfile,
  childhood,
  primary,
  calibration,
  eventConfig,
  options = {},
) {
  if (primary.status !== "completed_stage" || !primary.ending) {
    throw new Error(`青少年阶段要求已完成的小学状态，收到：${primary.status}`);
  }
  const seed = String(options.seed ?? `${primary.seed}:adolescence`);
  const choices = options.choices ?? {};
  const autoChoose = options.autoChoose ?? true;
  const household = clone(primary.household);
  const ending = primary.ending;
  const entersJunior = ending.id === "entered_junior_secondary";
  const startAge = ending.age + 1;
  const endIncomeRatio = household.finance.annualIncomePerPersonYuan
    / household.finance.referenceMeanPerPersonYuan;
  const state = {
    schemaVersion: 1,
    seed,
    personId: birthProfile.person.id,
    birthYear: birthProfile.person.birthYear,
    residence: birthProfile.person.residence,
    status: "in_progress",
    currentAge: startAge,
    path: entersJunior ? "junior_student" : "nonstudent",
    household,
    incomeRelativeToReference: endIncomeRatio,
    visibleStats: clone(primary.visibleStats),
    characterModel: clone(primary.characterModel),
    socialNetwork: clone(primary.socialNetwork ?? []),
    interests: clone(primary.interests ?? {}),
    childhoodGrowth: clone(primary.childhoodGrowth ?? null),
    youthMainlinePayoffs: clone(primary.youthMainlinePayoffs ?? null),
    randomEventHistory: clone(primary.randomEventHistory ?? []),
    education: {
      primaryEnding: clone(ending),
      junior: {
        status: entersJunior ? "enrolled_junior" : "not_enrolled_junior",
        entryYear: entersJunior ? ending.calendarYear + 1 : null,
        entryAge: entersJunior ? ending.age + 1 : null,
        currentGrade: entersJunior ? 1 : 0,
        completedGrades: 0,
        repeatedYears: 0,
        school: null,
        graduationYear: null,
        finalLearningProgressScore: null,
        lastGradeAttended: null,
      },
    },
    routine: {
      studyHoursPerWeek: Math.max(6, primary.routine.studyHoursPerWeek ?? 6),
      householdLaborHoursPerWeek: primary.routine.householdLaborHoursPerWeek ?? 7,
      peerHoursPerWeek: primary.routine.peerHoursPerWeek ?? 3,
    },
    educationExpenseMultiplier: 1,
    preparation: {
      academicHours: 0,
      vocationalHours: 0,
      employmentHours: 0,
    },
    nonstudent: {
      entryYear: entersJunior ? null : ending.calendarYear + 1,
      entryReasonFactId: ending.sourceFactId,
      entryDecisionHandled: false,
      routine: {
        householdLaborHoursPerWeek:
          calibration.assumptions.under16NonStudentActivity
            .baseHouseholdHoursPerWeek[birthProfile.person.residence],
        selfStudyHoursPerWeek:
          calibration.assumptions.under16NonStudentActivity
            .baseSelfStudyHoursPerWeek[birthProfile.person.residence],
        skillPracticeHoursPerWeek: 3,
      },
      cumulativeSelfStudyHours: 0,
      cumulativeSkillPracticeHours: 0,
      age16Preparation: null,
    },
    nextPath: null,
    annualRecords: [],
    priorDecisions: [...clone(primary.priorDecisions), ...clone(primary.decisions)],
    decisions: [],
    triggeredEventIds: new Set(),
    ending: null,
    usedObservationSourceIds: new Set(),
    usedAssumptionIds: new Set(),
  };
  applyStoredPayoffCredits(state);

  for (let age = startAge; age <= calibration.scope.maximumStageAge; age += 1) {
    const year = state.birthYear + age;
    const random = createSeededRandom(`${seed}:${year}:${age}`);
    const reference = getAdolescenceYearReference(calibration, year);
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
    addFact(record, "adolescence_year_context", {
      residence: state.residence,
      pathAtStart: state.path,
      formalEmploymentMinimumAge: calibration.scope.formalEmploymentMinimumAge,
      ordinaryEmploymentAgeReached: age >= calibration.scope.formalEmploymentMinimumAge,
    });
    const healthFact = simulateHealth(state, calibration, random, record);
    const financeFact = settleHouseholdYear(state, calibration, reference, random, record);
    const foodFact = settleFoodNeed(state, financeFact, random, record);
    applyHouseholdStatEffects(state, calibration, financeFact, foodFact, record);

    const annualReady = handleAnnualOperation({
      state,
      record,
      catalog: options.annualOperationCatalog,
      content: options.quarterlyLifeContent,
      stage: "adolescence",
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
        educationStatus: state.education.junior.status,
        cashReferenceYuan: financeFact.referenceMeanPerPersonYuan,
        affordableCashYuan: foodFact.months > 0
          ? 0
          : financeFact.annualHouseholdIncomeYuan * 0.005,
      },
    });
    if (!annualReady) {
      record.endState = snapshot(state);
      state.annualRecords.push(record);
      break;
    }
    updateSocialCharacters({
      state,
      record,
      catalog: options.socialCharacterCatalog,
      roleId: state.path === "junior_student" ? "junior_peer" : "neighborhood_youth",
      operationId: record.annualOperation?.chosenOptionId,
      createByDefault: state.path === "junior_student"
        && state.education.junior.currentGrade === 1
        && state.education.junior.completedGrades === 0,
      random: createSeededRandom(`${seed}:social:${year}:${
        state.path === "junior_student" ? "junior_peer" : "neighborhood_youth"
      }`),
      addFact,
    });

    if (state.path === "junior_student") {
      if (!state.education.junior.school) {
        state.education.junior.school = createJuniorSchool(state, calibration, year, random, record);
      }
      const ready = handleEvent(state, eventConfig, choices, autoChoose, random, record);
      if (!ready) {
        record.endState = snapshot(state);
        state.annualRecords.push(record);
        break;
      }
      simulateJuniorSchoolYear(
        state,
        calibration,
        reference,
        financeFact,
        healthFact,
        foodFact,
        random,
        record,
      );
    } else {
      const ready = handleEvent(state, eventConfig, choices, autoChoose, random, record);
      if (!ready) {
        record.endState = snapshot(state);
        state.annualRecords.push(record);
        break;
      }
      simulateNonstudentYear(state, calibration, healthFact, random, record);
    }

    const reviewReady = handleYearReview({
      state,
      record,
      stage: "adolescence",
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
    if (state.status === "completed_stage") break;
  }

  if (state.status === "in_progress") {
    state.status = "completed_stage";
    const lastRecord = state.annualRecords.at(-1);
    const fact = addFact(lastRecord, "adolescence_stage_age_limit_reached", {
      path: state.path,
      juniorStatus: state.education.junior.status,
      juniorGrade: state.education.junior.currentGrade,
      nextPath: state.nextPath,
    });
    state.ending = {
      id: state.path === "junior_student"
        ? "junior_not_completed_by_age_18"
        : "nonstudent_direction_unresolved_by_age_18",
      calendarYear: lastRecord.calendarYear,
      age: lastRecord.age,
      sourceFactId: fact.id,
    };
    lastRecord.endState = snapshot(state);
  }
  return serializeState(state);
}
