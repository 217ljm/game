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

/** @param {unknown} value */
function clone(value) {
  return structuredClone(value);
}

/** @param {number} probability */
function logit(probability) {
  const bounded = clamp(probability, 0.0001, 0.9999);
  return Math.log(bounded / (1 - bounded));
}

/** @param {number} value */
function logistic(value) {
  return 1 / (1 + Math.exp(-value));
}

/** @param {number} value */
function score(value) {
  return Math.round(clamp(value, 0, 100));
}

/**
 * @param {any[]} anchors
 * @param {number} year
 * @param {string} field
 */
function interpolateAnchors(anchors, year, field) {
  const before = [...anchors].reverse().find((entry) => entry.year <= year) ?? anchors[0];
  const after = anchors.find((entry) => entry.year >= year) ?? anchors.at(-1);
  if (before.year === after.year) return before[field];
  const progress = (year - before.year) / (after.year - before.year);
  return before[field] + (after[field] - before[field]) * progress;
}

/** @param {any} calibration @param {number} year */
export function getPrimaryYearReference(calibration, year) {
  const reference = calibration.observations.yearlyHouseholdReferences.find(
    (entry) => entry.year === year,
  );
  if (!reference) throw new RangeError(`小学阶段缺少 ${year} 年家庭统计参考`);
  return reference;
}

/** @param {any} calibration @param {number} year */
export function getPrimaryEnrollmentRate(calibration, year) {
  return interpolateAnchors(
    calibration.observations.primaryEnrollmentRateAnchors,
    year,
    "rate",
  );
}

/** @param {any} calibration @param {number} year */
export function getPrimaryDropoutRate(calibration, year) {
  return interpolateAnchors(
    calibration.observations.annualDropoutOrNonRetentionAnchors,
    year,
    "rate",
  );
}

/** @param {any} calibration @param {number} year */
export function getPrimaryToJuniorProgressionRate(calibration, year) {
  return interpolateAnchors(
    calibration.observations.primaryToJuniorProgressionAnchors,
    year,
    "rate",
  );
}

/** @param {any} calibration @param {number} year */
export function getStudentsPerTeacherReference(calibration, year) {
  return roundTo(
    interpolateAnchors(
      calibration.observations.primaryStudentsPerTeacherReference,
      year,
      "value",
    ),
    2,
  );
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

/** @param {any} state @param {any} record @param {string} stat @param {number} nextValue @param {string} factId @param {string} reason */
function setStat(state, record, stat, nextValue, factId, reason) {
  if (!STAT_KEYS.includes(stat)) throw new Error(`未知属性：${stat}`);
  const before = state.visibleStats[stat].value;
  const after = score(nextValue);
  if (before === after) return;
  state.visibleStats[stat].value = after;
  state.visibleStats[stat].basis = reason;
  state.visibleStats[stat].status = "derived_from_primary_fact";
  record.statChanges.push({ stat, before, after, delta: after - before, sourceFactId: factId, reason });
}

/** @param {any} state @param {any} record @param {string} stat @param {number} delta @param {string} factId @param {string} reason */
function changeStat(state, record, stat, delta, factId, reason) {
  setStat(state, record, stat, state.visibleStats[stat].value + delta, factId, reason);
}

/** @param {any} state @param {number} year */
function updateMemberAges(state, year) {
  for (const member of state.household.members) {
    member.birthYear ??= state.birthYear - member.ageAtBirth;
    member.currentAge = Math.max(0, year - member.birthYear);
  }
}

/** @param {any} state @param {number} annualHouseholdIncome @param {() => number} random */
function allocateHouseholdIncome(state, annualHouseholdIncome, random) {
  const earners = state.household.members.filter((member) => member.job);
  const weights = earners.map((member) => {
    const range = member.job.sector === "primary" ? [9, 12] : [11, 12];
    member.job.workMonthsThisYear = randomInt(random, range[0], range[1]);
    return member.job.workMonthsThisYear * (0.9 + random() * 0.2);
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

/** @param {any} state @param {any} calibration @param {number} age @param {any} reference @param {() => number} random @param {any} record @param {any} childhood */
function settleHouseholdYear(state, calibration, age, reference, random, record, childhood) {
  state.usedObservationSourceIds.add(reference.sourceId);
  state.usedAssumptionIds.add(calibration.assumptions.householdIncomeContinuation.id);
  const referenceIncome = state.residence === "urban"
    ? reference.urbanIncomePerPersonYuan
    : reference.ruralIncomePerPersonYuan;
  const engelCoefficient = state.residence === "urban"
    ? reference.urbanEngelCoefficient
    : reference.ruralEngelCoefficient;

  let annualHouseholdIncome;
  let reusedFromChildhood = false;
  if (age === 6) {
    annualHouseholdIncome = state.household.finance.annualHouseholdIncomeYuan;
    reusedFromChildhood = true;
  } else {
    const sigma = calibration.assumptions.householdIncomeContinuation.annualShockSigma[state.residence];
    const meanOneShock = Math.exp(-0.5 * sigma ** 2 + sigma * standardNormal(random));
    annualHouseholdIncome = roundTo(
      referenceIncome * state.household.members.length * state.incomeRelativeToReference * meanOneShock,
      2,
    );
    allocateHouseholdIncome(state, annualHouseholdIncome, random);
  }
  const incomePerPerson = roundTo(annualHouseholdIncome / state.household.members.length, 2);
  state.incomeRelativeToReference = incomePerPerson / referenceIncome;
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
  const priorFact = age === 6
    ? childhood.annualRecords.find((entry) => entry.age === 6)?.facts.find(
      (fact) => fact.type === "household_finance_settled",
    )
    : null;
  return addFact(record, "household_finance_settled", {
    annualHouseholdIncomeYuan: annualHouseholdIncome,
    annualIncomePerPersonYuan: incomePerPerson,
    referenceMeanPerPersonYuan: referenceIncome,
    incomeRelativeToReference: roundTo(state.incomeRelativeToReference, 4),
    foodExpenditureShareReference: engelCoefficient,
    coResidentSize: state.household.members.length,
    reusedFromChildhood,
    priorStageFactId: priorFact?.id ?? null,
  });
}

/** @param {any} state @param {any} calibration @param {any} financeFact @param {number} age @param {() => number} random @param {any} record @param {any} childhood */
function settleFoodNeed(state, calibration, financeFact, age, random, record, childhood) {
  if (age === 6) {
    const prior = childhood.annualRecords.find((entry) => entry.age === 6)?.facts.find(
      (fact) => fact.type === "food_need_shortfall",
    );
    return addFact(record, "food_need_shortfall", {
      months: prior?.months ?? 0,
      reusedFromChildhood: true,
      priorStageFactId: prior?.id ?? null,
    });
  }
  const monthlyProbability = clamp(
    0.02
      + Math.max(0, 0.9 - financeFact.incomeRelativeToReference) * 0.18
      + Math.max(0, financeFact.foodExpenditureShareReference - 0.55) * 0.20,
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
    reusedFromChildhood: false,
  });
}

/** @param {any} state @param {any} calibration @param {number} age @param {() => number} random @param {any} record @param {any} childhood */
function simulateSchoolAgeHealth(state, calibration, age, random, record, childhood) {
  state.usedAssumptionIds.add(calibration.assumptions.studentIllnessAbsence.id);
  if (age === 6) {
    const prior = childhood.annualRecords.find((entry) => entry.age === 6)?.facts.find(
      (fact) => fact.type === "child_illness_year_summary",
    );
    const symptomDays = prior?.symptomDays ?? 0;
    return addFact(record, "student_health_year_summary", {
      episodeCount: prior?.episodeCount ?? 0,
      severeEpisodeCount: prior?.severeEpisodeCount ?? 0,
      symptomDays,
      schoolAbsenceDays: Math.min(20, Math.ceil(symptomDays * 0.45)),
      diagnosis: null,
      reusedFromChildhood: true,
      priorStageFactId: prior?.id ?? null,
    });
  }
  const episodeCount = poisson(random, calibration.assumptions.studentIllnessAbsence.meanEpisodesPerYear);
  let severeEpisodeCount = 0;
  let symptomDays = 0;
  for (let index = 0; index < episodeCount; index += 1) {
    const severe = random() < calibration.assumptions.studentIllnessAbsence.severeEpisodeProbability;
    severeEpisodeCount += severe ? 1 : 0;
    symptomDays += randomInt(random, 2, 6) + (severe ? randomInt(random, 3, 8) : 0);
  }
  return addFact(record, "student_health_year_summary", {
    episodeCount,
    severeEpisodeCount,
    symptomDays,
    schoolAbsenceDays: Math.min(20, Math.ceil(symptomDays * 0.45)),
    diagnosis: null,
    reusedFromChildhood: false,
  });
}

/** @param {any} state @param {any} calibration @param {any} financeFact @param {any} foodFact @param {any} record */
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
    changeStat(state, record, "mood", -1, foodFact.id, "家庭食品安排影响在校体验");
  }
}

/** @param {any} calibration @param {number} year @param {"urban" | "rural"} residence */
function getSixYearProbability(calibration, year, residence) {
  const values = calibration.assumptions.schoolSystemDistribution.sixYearProbability;
  const anchors = Object.entries(values).map(([anchorYear, shares]) => ({
    year: Number(anchorYear),
    value: shares[residence],
  }));
  return interpolateAnchors(anchors, year, "value");
}

/** @param {any} calibration @param {number} year @param {"urban" | "rural"} residence */
function getSchoolFormShares(calibration, year, residence) {
  const assumption = calibration.assumptions.schoolFormDistribution;
  if (residence === "urban") return assumption.urban;
  const progress = clamp((year - 1984) / (1995 - 1984), 0, 1);
  return Object.fromEntries(
    Object.keys(assumption.rural1984).map((key) => [
      key,
      assumption.rural1984[key]
        + (assumption.rural1995[key] - assumption.rural1984[key]) * progress,
    ]),
  );
}

/** @param {() => number} random @param {Record<string, number>} shares */
function chooseShare(random, shares) {
  return weightedChoice(
    random,
    Object.entries(shares).map(([value, weight]) => ({ value, weight })),
  );
}

/** @param {any} state @param {any} calibration @param {number} year @param {() => number} random @param {any} record */
function createSchool(state, calibration, year, random, record) {
  state.usedAssumptionIds.add(calibration.assumptions.schoolSystemDistribution.id);
  state.usedAssumptionIds.add(calibration.assumptions.schoolFormDistribution.id);
  state.usedAssumptionIds.add(calibration.assumptions.instructionDays.id);
  state.usedObservationSourceIds.add(calibration.observations.schoolSystemHistory.sourceId);
  state.usedObservationSourceIds.add(calibration.observations.schoolFormsHistory.sourceId);
  for (const anchor of calibration.observations.primaryStudentsPerTeacherReference) {
    state.usedObservationSourceIds.add(anchor.sourceId);
  }

  const sixYearProbability = getSixYearProbability(calibration, year, state.residence);
  const prescribedYears = random() < sixYearProbability ? 6 : 5;
  const form = chooseShare(random, getSchoolFormShares(calibration, year, state.residence));
  const halfDay = form === "half_day_or_simple_class";
  const school = {
    id: `primary-school-${state.personId}-${year}`,
    entryYear: year,
    prescribedYears,
    form,
    instructionMode: halfDay ? "half_day_or_simple" : "full_day",
    annualInstructionDays: halfDay
      ? calibration.assumptions.instructionDays.halfDayOrSimple
      : calibration.assumptions.instructionDays.fullDay,
    studentsPerTeacherNationalReference: getStudentsPerTeacherReference(calibration, year),
    specificSchoolStudentTeacherRatio: null,
  };
  addFact(record, "primary_school_assigned", {
    ...school,
    sixYearSystemModeledProbability: roundTo(sixYearProbability, 4),
  });
  return school;
}

/** @param {any} state @param {any} calibration @param {number} year @param {number} age @param {any} financeFact @param {any} foodFact @param {() => number} random @param {any} record */
function attemptEnrollment(state, calibration, year, age, financeFact, foodFact, random, record) {
  const law = calibration.observations.compulsoryEducationLaw;
  state.usedAssumptionIds.add(calibration.assumptions.entryAgeDistribution.id);
  state.usedAssumptionIds.add(calibration.assumptions.individualEnrollmentProbability.id);
  state.usedObservationSourceIds.add(law.sourceId);
  for (const anchor of calibration.observations.primaryEnrollmentRateAnchors) {
    state.usedObservationSourceIds.add(anchor.sourceId);
  }

  if (age < state.targetEntryAge) {
    addFact(record, "primary_entry_not_attempted", {
      targetEntryAge: state.targetEntryAge,
      reason: "modeled_entry_age_not_reached",
    });
    return false;
  }
  const baseRate = age <= 7
    ? getPrimaryEnrollmentRate(calibration, year)
    : calibration.assumptions.individualEnrollmentProbability.lateEntryAnnualProbability;
  const preparationHours =
    state.priorCumulativeFacts.schoolPreparationHoursPerWeek
      ?? state.priorCumulativeFacts.selfPracticeHoursPerWeek
      ?? 0;
  const healthValue = state.visibleStats.health.value;
  const typicalHealthyReserveScore = 81;
  const probability = logistic(
    logit(baseRate)
      + Math.log(Math.max(0.2, financeFact.incomeRelativeToReference)) * 0.25
      - foodFact.months * 0.04
      + (healthValue - typicalHealthyReserveScore) * 0.015
      + preparationHours * 0.025
      + (age > 7 ? (age - 7) * 0.25 : 0),
  );
  const enrolled = random() < probability;
  const fact = addFact(record, "primary_enrollment_attempt", {
    enrolled,
    age,
    nationalEnrollmentRateReference: roundTo(baseRate, 4),
    modeledIndividualProbability: roundTo(probability, 5),
    inputIncomeRelativeToReference: financeFact.incomeRelativeToReference,
    inputFoodNeedShortfallMonths: foodFact.months,
    inputHealthValue: healthValue,
    inputPreparationHoursPerWeek: preparationHours,
  });
  if (!enrolled) return false;

  state.education.status = "enrolled_primary";
  state.education.entryYear = year;
  state.education.entryAge = age;
  state.education.currentGrade = 1;
  state.education.school = createSchool(state, calibration, year, random, record);
  changeStat(state, record, "relationships", 1, fact.id, "开始在小学形成新的日常关系");
  return true;
}

/** @param {any} state @param {any} event @param {any} option @param {"provided" | "automatic"} source @param {any} record */
function applyDecision(state, event, option, source, record) {
  const fact = addFact(record, "player_primary_action", {
    eventId: event.id,
    optionId: option.id,
    routineChanges: clone(option.routineChanges),
    annualFacts: clone(option.annualFacts ?? {}),
    transitionPreparationHours: option.transitionPreparationHours ?? 0,
    choiceSource: source,
  });
  state.routine = { ...state.routine, ...option.routineChanges };
  state.transitionPreparationHours += option.transitionPreparationHours ?? 0;
  for (const [stat, delta] of Object.entries(option.immediateStatEffects)) {
    changeStat(state, record, stat, delta, fact.id, `小学阶段选择：${option.label}`);
  }
  const decision = {
    eventId: event.id,
    calendarYear: record.calendarYear,
    age: record.age,
    grade: state.education.currentGrade,
    chosenOptionId: option.id,
    unchosenOptionIds: event.options.filter((candidate) => candidate.id !== option.id).map((candidate) => candidate.id),
    choiceSource: source,
    sourceFactId: fact.id,
  };
  state.decisions.push(decision);
  state.triggeredEventIds.add(event.id);
  record.decision = decision;
}

/** @param {any} event @param {any} state */
function eventMatches(event, state) {
  if (state.triggeredEventIds.has(event.id)) return false;
  if (event.trigger === "on_primary_entry") {
    return state.education.currentGrade === 1 && state.education.completedGrades === 0;
  }
  if (event.trigger === "before_grade") return state.education.currentGrade === event.grade;
  if (event.trigger === "before_final_grade") {
    return state.education.currentGrade === state.education.school.prescribedYears;
  }
  return false;
}

/** @param {any} state @param {any} eventConfig @param {Record<string, string>} choices @param {boolean} autoChoose @param {() => number} random @param {any} record */
function handleEducationEvent(state, eventConfig, choices, autoChoose, random, record) {
  const event = eventConfig.events.find((candidate) => eventMatches(candidate, state));
  if (!event) return true;
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
      title: event.title,
      prompt: event.prompt,
      calendarYear: record.calendarYear,
      age: record.age,
      grade: state.education.currentGrade,
      options: event.options.map((candidate) => ({ id: candidate.id, label: candidate.label })),
    };
    return false;
  }
  applyDecision(state, event, option, source, record);
  return true;
}

/** @param {any} state @param {any} calibration @param {number} year @param {any} healthFact @param {any} foodFact @param {() => number} random @param {any} record */
function simulateSchoolYear(state, calibration, year, healthFact, foodFact, random, record) {
  state.usedAssumptionIds.add(calibration.assumptions.householdLaborTime.id);
  state.usedAssumptionIds.add(calibration.assumptions.learningProgress.id);
  state.usedAssumptionIds.add(calibration.assumptions.gradeProgression.id);
  state.usedAssumptionIds.add(calibration.assumptions.individualDropoutProbability.id);
  const school = state.education.school;
  school.studentsPerTeacherNationalReference = getStudentsPerTeacherReference(calibration, year);
  const baseHouseholdHours = calibration.assumptions.householdLaborTime.baseHoursPerWeek[state.residence];
  const routineHouseholdHours = state.routine.householdLaborHoursPerWeek ?? baseHouseholdHours;
  const householdLaborHoursPerWeek = roundTo(
    Math.max(0, routineHouseholdHours) + foodFact.months * 0.35,
    1,
  );
  const studyHoursPerWeek = state.routine.studyHoursPerWeek ?? 3;
  const peerHoursPerWeek = state.routine.peerHoursPerWeek ?? 3;
  const schoolConfidencePoints = state.childhoodGrowth?.paths?.school_confidence?.points ?? 0;
  const explorationPoints = state.childhoodGrowth?.paths?.interest_exploration?.points ?? 0;
  const childhoodGrowthLearningBonus = roundTo(
    Math.min(4, schoolConfidencePoints / 6) + Math.min(2, explorationPoints / 12),
    2,
  );
  const familyLaborAbsenceDays = Math.min(
    35,
    Math.max(0, Math.floor((householdLaborHoursPerWeek - 6) * 1.15 + foodFact.months * 0.5)),
  );
  const illnessAbsenceDays = healthFact.schoolAbsenceDays;
  const attendedDays = Math.max(
    0,
    school.annualInstructionDays - illnessAbsenceDays - familyLaborAbsenceDays,
  );
  const attendanceRate = attendedDays / school.annualInstructionDays;
  const learningProgressScore = score(
    50
      + (attendanceRate - 0.90) * 80
      + (studyHoursPerWeek - 4) * 2.3
      + state.visibleStats.ability.value * 0.18
      + childhoodGrowthLearningBonus
      - Math.max(0, householdLaborHoursPerWeek - 8) * 1.2
      + standardNormal(random) * calibration.assumptions.learningProgress.annualShockStandardDeviation,
  );
  const schoolYearFact = addFact(record, "primary_school_year_attendance_and_learning", {
    grade: state.education.currentGrade,
    schoolForm: school.form,
    prescribedInstructionDays: school.annualInstructionDays,
    attendedDays,
    illnessAbsenceDays,
    familyLaborAbsenceDays,
    attendanceRate: roundTo(attendanceRate, 4),
    studyHoursPerWeek,
    householdLaborHoursPerWeek,
    peerHoursPerWeek,
    learningProgressScore,
    childhoodGrowthLearningBonus,
    inputSchoolConfidencePoints: schoolConfidencePoints,
    inputInterestExplorationPoints: explorationPoints,
    scoreMeaning: "game_internal_learning_progress_not_standardized_exam_score",
    studentsPerTeacherNationalReference: school.studentsPerTeacherNationalReference,
    specificSchoolStudentTeacherRatio: school.specificSchoolStudentTeacherRatio,
  });

  if (learningProgressScore >= 75) {
    changeStat(state, record, "ability", 3, schoolYearFact.id, "本学年出勤和学习进展形成能力积累");
  } else if (learningProgressScore >= 60) {
    changeStat(state, record, "ability", 2, schoolYearFact.id, "本学年出勤和学习进展形成能力积累");
  } else if (learningProgressScore >= 45) {
    changeStat(state, record, "ability", 1, schoolYearFact.id, "本学年完成了可记录的学习积累");
  }
  if (peerHoursPerWeek >= 5) {
    changeStat(state, record, "relationships", 1, schoolYearFact.id, "本学年持续与同伴共同活动");
  }
  if (householdLaborHoursPerWeek >= 11) {
    changeStat(state, record, "mood", -1, schoolYearFact.id, "本学年家庭劳动占用较多课余时间");
  } else if (peerHoursPerWeek >= 5) {
    changeStat(state, record, "mood", 1, schoolYearFact.id, "本学年有较稳定的同伴活动时间");
  }
  if (healthFact.severeEpisodeCount > 0) {
    changeStat(state, record, "health", -1, healthFact.id, "本学年出现较重症状并产生病假");
  }

  const dropoutBase = getPrimaryDropoutRate(calibration, year);
  const dropoutProbability = logistic(
    logit(dropoutBase)
      + Math.max(0, 1 - state.incomeRelativeToReference) * 0.70
      + (1 - attendanceRate) * 2.5
      + Math.max(0, householdLaborHoursPerWeek - 8) * 0.06
      + Math.max(0, 45 - learningProgressScore) * 0.025
      - Math.max(0, learningProgressScore - 60) * 0.012,
  );
  for (const anchor of calibration.observations.annualDropoutOrNonRetentionAnchors) {
    state.usedObservationSourceIds.add(anchor.sourceId);
  }
  const exited = random() < dropoutProbability;
  const continuationFact = addFact(record, "primary_continuation_outcome", {
    continued: !exited,
    nationalDropoutOrNonRetentionReference: roundTo(dropoutBase, 4),
    modeledIndividualExitProbability: roundTo(dropoutProbability, 5),
    inputAttendanceRate: roundTo(attendanceRate, 4),
    inputLearningProgressScore: learningProgressScore,
    inputHouseholdLaborHoursPerWeek: householdLaborHoursPerWeek,
    inputIncomeRelativeToReference: roundTo(state.incomeRelativeToReference, 4),
  });
  if (exited) {
    state.education.status = "exited_primary_before_completion";
    state.status = "completed_stage";
    state.usedAssumptionIds.add(calibration.assumptions.noReentryAfterPrimaryExit.id);
    state.ending = {
      id: "exited_primary_before_completion",
      calendarYear: year,
      age: record.age,
      lastGradeAttended: state.education.currentGrade,
      completedGrades: state.education.completedGrades,
      sourceFactId: continuationFact.id,
      reentryModeled: false,
    };
    return;
  }

  const finalGrade = state.education.currentGrade === school.prescribedYears;
  if (finalGrade) {
    state.usedAssumptionIds.add(calibration.assumptions.graduationProbability.id);
    state.usedObservationSourceIds.add(calibration.observations.primaryGraduation1987.sourceId);
    const graduationBase = calibration.observations.primaryGraduation1987.rate;
    const graduationProbability = logistic(
      logit(graduationBase)
        + (attendanceRate - 0.9) * 1.6
        + (learningProgressScore - 55) * 0.018,
    );
    const graduated = random() < graduationProbability;
    const graduationFact = addFact(record, "primary_graduation_outcome", {
      graduated,
      nationalGraduationRate1987Reference: graduationBase,
      modeledIndividualProbability: roundTo(graduationProbability, 5),
      prescribedYears: school.prescribedYears,
      actualYearsSinceEntry: year - state.education.entryYear + 1,
      finalLearningProgressScore: learningProgressScore,
      finalAttendanceRate: roundTo(attendanceRate, 4),
    });
    if (graduated) {
      state.education.status = "graduated_primary";
      state.education.graduationYear = year;
      state.education.finalLearningProgressScore = learningProgressScore;
      state.education.completedGrades = school.prescribedYears;
      changeStat(state, record, "ability", 2, graduationFact.id, "完成小学规定年限并毕业");
      settleJuniorTransition(state, calibration, year, learningProgressScore, random, record, graduationFact);
      return;
    }
  }

  const repeatProbability = clamp(
    calibration.assumptions.gradeProgression.baseRepeatProbability
      + Math.max(0, 45 - learningProgressScore) * 0.008
      + Math.max(0, 0.86 - attendanceRate) * 0.8,
    0.01,
    0.45,
  );
  const repeated = random() < repeatProbability;
  const progressionFact = addFact(record, "primary_grade_progression", {
    gradeBefore: state.education.currentGrade,
    repeated,
    modeledRepeatProbability: roundTo(repeatProbability, 5),
    learningProgressScore,
    attendanceRate: roundTo(attendanceRate, 4),
  });
  if (repeated) {
    state.education.repeatedYears += 1;
  } else {
    state.education.completedGrades = Math.max(
      state.education.completedGrades,
      state.education.currentGrade,
    );
    state.education.currentGrade += 1;
    changeStat(state, record, "ability", 1, progressionFact.id, "完成本年级并进入下一年级");
  }
}

/** @param {any} state @param {any} calibration @param {number} year @param {number} finalScore @param {() => number} random @param {any} record @param {any} graduationFact */
function settleJuniorTransition(state, calibration, year, finalScore, random, record, graduationFact) {
  state.usedAssumptionIds.add(calibration.assumptions.juniorTransitionProbability.id);
  for (const anchor of calibration.observations.primaryToJuniorProgressionAnchors) {
    state.usedObservationSourceIds.add(anchor.sourceId);
  }
  const base = getPrimaryToJuniorProgressionRate(calibration, year);
  const probability = logistic(
    logit(base)
      + (finalScore - 55) * 0.020
      + (state.transitionPreparationHours - 72) / 110
      + Math.log(Math.max(0.2, state.incomeRelativeToReference)) * 0.15,
  );
  const enteredJuniorSecondary = random() < probability;
  const fact = addFact(record, "junior_secondary_transition_outcome", {
    enteredJuniorSecondary,
    intendedEntryYear: enteredJuniorSecondary ? year + 1 : null,
    nationalPrimaryToJuniorProgressionRateReference: roundTo(base, 4),
    modeledIndividualProbability: roundTo(probability, 5),
    finalLearningProgressScore: finalScore,
    transitionPreparationHours: state.transitionPreparationHours,
    incomeRelativeToReference: roundTo(state.incomeRelativeToReference, 4),
    primaryGraduationFactId: graduationFact.id,
  });
  state.status = "completed_stage";
  state.ending = {
    id: enteredJuniorSecondary ? "entered_junior_secondary" : "left_school_after_primary",
    calendarYear: year,
    age: record.age,
    sourceFactId: fact.id,
    primaryGraduated: true,
    enteredJuniorSecondary,
  };
}

/** @param {any} state */
function snapshot(state) {
  return {
    stageStatus: state.status,
    educationStatus: state.education.status,
    currentGrade: state.education.currentGrade,
    completedGrades: state.education.completedGrades,
    coResidentSize: state.household.members.length,
    annualHouseholdIncomeYuan: state.household.finance.annualHouseholdIncomeYuan,
    annualIncomePerPersonYuan: state.household.finance.annualIncomePerPersonYuan,
    visibleStats: Object.fromEntries(STAT_KEYS.map((key) => [key, state.visibleStats[key].value])),
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
    status: state.status,
    currentAge: state.currentAge,
    household: state.household,
    education: state.education,
    routine: state.routine,
    transitionPreparationHours: state.transitionPreparationHours,
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
 * 从0～6岁结果推进到小学毕业、提前退出或14岁阶段上限。
 * @param {any} birthProfile
 * @param {any} childhood
 * @param {any} calibration
 * @param {any} eventConfig
 * @param {{ seed?: string | number, choices?: Record<string, string>, annualChoices?: Record<string, string>, annualOperationCatalog?: any, autoChoose?: boolean }} [options]
 */
export function simulatePrimaryEducation(
  birthProfile,
  childhood,
  calibration,
  eventConfig,
  options = {},
) {
  if (childhood.status !== "completed_stage") {
    throw new Error(`小学阶段要求已完成且存活的0～6岁状态，收到：${childhood.status}`);
  }
  const seed = String(options.seed ?? `${childhood.seed}:primary`);
  const choices = options.choices ?? {};
  const autoChoose = options.autoChoose ?? true;
  const household = clone(childhood.household);
  const endIncomeRatio =
    household.finance.annualIncomePerPersonYuan / household.finance.referenceMeanPerPersonYuan;
  const lawYear = Number(calibration.observations.compulsoryEducationLaw.effective.slice(0, 4));
  const age6Year = birthProfile.person.birthYear + 6;
  const entryRandom = createSeededRandom(`${seed}:entry-age`);
  const canUseAge6Rule = age6Year >= lawYear;
  const age6Share = calibration.assumptions.entryAgeDistribution
    .age6EntryShareByResidence[birthProfile.person.residence];
  const targetEntryAge = canUseAge6Rule && entryRandom() < age6Share ? 6 : 7;
  const state = {
    schemaVersion: 1,
    seed,
    personId: birthProfile.person.id,
    birthYear: birthProfile.person.birthYear,
    residence: birthProfile.person.residence,
    status: "in_progress",
    currentAge: 6,
    household,
    incomeRelativeToReference: endIncomeRatio,
    visibleStats: clone(childhood.visibleStats),
    characterModel: clone(childhood.characterModel),
    priorCumulativeFacts: clone(childhood.cumulativeFacts),
    socialNetwork: clone(childhood.socialNetwork ?? []),
    interests: clone(childhood.interests ?? {}),
    childhoodGrowth: clone(childhood.childhoodGrowth ?? null),
    youthMainlinePayoffs: clone(childhood.youthMainlinePayoffs ?? null),
    randomEventHistory: clone(childhood.randomEventHistory ?? []),
    priorDecisions: clone(childhood.decisions),
    targetEntryAge,
    education: {
      status: "not_enrolled",
      entryYear: null,
      entryAge: null,
      currentGrade: 0,
      completedGrades: 0,
      repeatedYears: 0,
      school: null,
      graduationYear: null,
      finalLearningProgressScore: null,
    },
    routine: {
      studyHoursPerWeek:
        childhood.cumulativeFacts.schoolPreparationHoursPerWeek
          ?? childhood.cumulativeFacts.selfPracticeHoursPerWeek
          ?? 2,
      householdLaborHoursPerWeek:
        childhood.cumulativeFacts.householdSkillPracticeHoursPerWeek
          ?? calibration.assumptions.householdLaborTime.baseHoursPerWeek[birthProfile.person.residence],
      peerHoursPerWeek: childhood.cumulativeFacts.peerPlayHoursPerWeek ?? 3,
    },
    transitionPreparationHours: 0,
    annualRecords: [],
    decisions: [],
    triggeredEventIds: new Set(),
    ending: null,
    usedObservationSourceIds: new Set(),
    usedAssumptionIds: new Set(),
  };
  applyStoredPayoffCredits(state);

  for (let age = 6; age <= calibration.scope.maximumStageAge; age += 1) {
    const year = state.birthYear + age;
    const random = createSeededRandom(`${seed}:${year}:${age}`);
    const reference = getPrimaryYearReference(calibration, year);
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
    addFact(record, "primary_year_context", {
      compulsoryEducationLawEffective: year >= lawYear,
      targetEntryAge: state.targetEntryAge,
      residence: state.residence,
    });
    const healthFact = simulateSchoolAgeHealth(state, calibration, age, random, record, childhood);
    const financeFact = settleHouseholdYear(
      state,
      calibration,
      age,
      reference,
      random,
      record,
      childhood,
    );
    const foodFact = settleFoodNeed(
      state,
      calibration,
      financeFact,
      age,
      random,
      record,
      childhood,
    );
    applyHouseholdStatEffects(state, calibration, financeFact, foodFact, record);

    if (state.education.status === "not_enrolled") {
      attemptEnrollment(state, calibration, year, age, financeFact, foodFact, random, record);
    }

    const annualReady = handleAnnualOperation({
      state,
      record,
      catalog: options.annualOperationCatalog,
      content: options.quarterlyLifeContent,
      stage: "primary",
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
        educationStatus: state.education.status,
        grade: state.education.currentGrade,
        schoolForm: state.education.school?.form ?? null,
        cashReferenceYuan: financeFact.referenceMeanPerPersonYuan,
        affordableCashYuan: foodFact.months > 0
          ? 0
          : financeFact.annualHouseholdIncomeYuan * 0.005,
      },
      skip: age === 6,
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
      roleId: state.education.status === "enrolled_primary"
        ? "primary_peer"
        : "neighborhood_friend",
      operationId: record.annualOperation?.chosenOptionId,
      createByDefault: state.education.status === "enrolled_primary"
        && state.education.currentGrade === 1
        && state.education.completedGrades === 0,
      random: createSeededRandom(`${seed}:social:${year}:${
        state.education.status === "enrolled_primary" ? "primary_peer" : "neighborhood_friend"
      }`),
      addFact,
    });

    if (state.education.status === "enrolled_primary") {
      const ready = handleEducationEvent(
        state,
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
      simulateSchoolYear(state, calibration, year, healthFact, foodFact, random, record);
    } else if (state.education.status === "not_enrolled") {
      addFact(record, "not_enrolled_in_primary_this_year", {
        age,
        householdLaborHoursPerWeek:
          calibration.assumptions.householdLaborTime.baseHoursPerWeek[state.residence]
            + foodFact.months * 0.35,
      });
    }

    const reviewReady = handleYearReview({
      state,
      record,
      stage: "primary",
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
    const fact = addFact(lastRecord, "primary_stage_age_limit_reached", {
      educationStatus: state.education.status,
      currentGrade: state.education.currentGrade,
      completedGrades: state.education.completedGrades,
    });
    state.ending = {
      id: state.education.status === "not_enrolled"
        ? "did_not_enter_primary_by_stage_end"
        : "primary_not_completed_by_age_14",
      calendarYear: lastRecord.calendarYear,
      age: lastRecord.age,
      sourceFactId: fact.id,
    };
    lastRecord.endState = snapshot(state);
  }
  return serializeState(state);
}
