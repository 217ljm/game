import { ensureSocialCharacter, recordSharedActivity } from "./social-character-system.mjs";
import { createSeededRandom } from "./random.mjs";

function clone(value) {
  return structuredClone(value);
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function interestStageId(score) {
  if (score >= 80) return "lasting";
  if (score >= 45) return "hobby";
  if (score >= 18) return "emerging";
  if (score >= 1) return "exposure";
  return "none";
}

function applyPayoffInterestChanges(state, changes, content, calendarYear) {
  state.interests ??= {};
  for (const [id, delta] of Object.entries(changes ?? {})) {
    const interest = state.interests[id] ?? {
      id,
      label: content.interestDomains?.[id] ?? id,
      score: 0,
      totalHours: 0,
      firstExposureYear: calendarYear,
      lastActiveYear: null,
      stageId: "none",
    };
    interest.score = clamp(Number(interest.score ?? 0) + Number(delta), 0, 100);
    interest.stageId = interestStageId(interest.score);
    interest.lastActiveYear = calendarYear;
    state.interests[id] = interest;
  }
}

function valueAtPath(target, path) {
  return path.split(".").reduce((value, key) => value?.[key], target);
}

function addAtPath(target, path, delta) {
  const parts = path.split(".");
  let cursor = target;
  for (const key of parts.slice(0, -1)) {
    if (cursor[key] == null || typeof cursor[key] !== "object") cursor[key] = {};
    cursor = cursor[key];
  }
  const key = parts.at(-1);
  cursor[key] = Number(cursor[key] ?? 0) + Number(delta ?? 0);
}

function ensurePayoffState(state) {
  state.youthMainlinePayoffs ??= {
    schemaVersion: 1,
    outcomes: [],
    unlockedActivityIds: [],
    followThrough: {},
    preparationCredits: {
      transition: 0,
      academic: 0,
      vocational: 0,
      employment: 0,
      contacts: 0,
    },
    laidDownDirections: [],
  };
  return state.youthMainlinePayoffs;
}

function pathPoints(state, ids = []) {
  return ids.reduce(
    (sum, id) => sum + Number(state.childhoodGrowth?.paths?.[id]?.points ?? 0),
    0,
  );
}

export function youthDirectionSignals(state, content) {
  const directions = Object.entries(content?.directions ?? {}).map(([id, direction]) => {
    const interests = direction.interestIds
      .map((interestId) => state.interests?.[interestId])
      .filter(Boolean);
    const currentScore = interests.reduce((sum, entry) => sum + Math.max(0, entry.score ?? 0), 0);
    const totalHours = interests.reduce((sum, entry) => sum + Math.max(0, entry.totalHours ?? 0), 0);
    const growth = pathPoints(state, direction.growthIds);
    const score = clamp(
      currentScore * 0.48
      + Math.log10(totalHours + 1) * 13
      + growth * 0.62,
    );
    const evidenceInterest = [...interests]
      .sort((left, right) => (right.totalHours ?? 0) - (left.totalHours ?? 0))[0];
    const evidenceGrowth = direction.growthIds
      .map((growthId) => state.childhoodGrowth?.paths?.[growthId])
      .filter(Boolean)
      .sort((left, right) => right.points - left.points)[0];
    return {
      id,
      label: direction.label,
      score: Math.round(score),
      currentScore: Math.round(currentScore),
      totalHours: Math.round(totalHours),
      growthPoints: growth,
      primaryInterestId: evidenceInterest?.id ?? direction.interestIds[0],
      primaryInterestLabel: evidenceInterest?.label ?? direction.interestIds[0],
      lastActivityLabel: evidenceInterest?.lastActivityLabel
        ?? evidenceGrowth?.lastActivityLabel
        ?? null,
      direction,
    };
  });
  return directions.sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}

function trustedPerson(state) {
  return [...(state.socialNetwork ?? [])]
    .filter((person) => person.active)
    .sort((left, right) => (
      (right.trust ?? right.closeness ?? 0) - (left.trust ?? left.closeness ?? 0)
    ))[0] ?? null;
}

function optionAvailability(option, state, signal, event, content) {
  const reasons = [];
  if (option.requiresDirectionScore != null && signal.score < option.requiresDirectionScore) {
    reasons.push(`过去相关投入不足：当前${signal.score}/100，需要${option.requiresDirectionScore}`);
  }
  const health = Number(state.visibleStats?.health?.value ?? 0);
  if (option.minimumHealth != null && health < option.minimumHealth) {
    reasons.push(`当前健康${health}/100，无法再增加这项固定负担`);
  }
  const familyGrowth = pathPoints(state, ["family_participation"]);
  if (option.requiresFamilyGrowth != null && familyGrowth < option.requiresFamilyGrowth) {
    reasons.push(`过去家庭参与${familyGrowth}点，尚不足以进行这次协商`);
  }
  if (option.directionIn && !option.directionIn.includes(signal.id)) {
    reasons.push(`当前最有连续性的方向是“${signal.label}”，这条入口缺少对应前史`);
  }
  const ability = Number(state.visibleStats?.ability?.value ?? 0);
  if (option.minimumAbility != null && ability < option.minimumAbility) {
    reasons.push(`当前认知能力${ability}/100，需要至少${option.minimumAbility}`);
  }
  const person = trustedPerson(state);
  const trust = Number(person?.trust ?? person?.closeness ?? 0);
  if (option.minimumTrustedPerson != null && trust < option.minimumTrustedPerson) {
    reasons.push(`没有信任达到${option.minimumTrustedPerson}/100、能说明共同经历的人`);
  }
  return {
    available: reasons.length === 0,
    unavailableReason: reasons.join("；") || null,
  };
}

function presentationOption(option, state, signal, event, content) {
  const availability = optionAvailability(option, state, signal, event, content);
  return {
    ...clone(option),
    ...availability,
    description: `${option.gain}。代价：${option.tradeoff}。`,
    effectSummary: `得到：${option.gain}；代价：${option.tradeoff}`,
    directionId: signal.id,
    directionLabel: signal.label,
    gains: [option.gain],
    costs: [option.tradeoff],
  };
}

function chooseAutomatic(options, signal) {
  return options.find((option) => option.available && ["deepen", "study_entry", "skill_entry"].includes(option.kind))
    ?? options.find((option) => option.available && ["share", "negotiate", "social_entry"].includes(option.kind))
    ?? options.find((option) => option.available);
}

function resolvePersonRole(event, state) {
  if (event.personRoleId === "junior_peer" && state.path !== "junior_student") {
    return event.fallbackPersonRoleId ?? "neighborhood_youth";
  }
  if (event.personRoleId === "training_peer" && state.education?.senior?.status !== "enrolled") {
    return event.fallbackPersonRoleId ?? "neighborhood_youth";
  }
  return event.personRoleId;
}

function applyGrowth(state, signal, amount, record, event, option, addFact) {
  if (!amount || !state.childhoodGrowth?.paths) return [];
  const changed = [];
  for (const growthId of signal.direction.growthIds.slice(0, 2)) {
    const path = state.childhoodGrowth.paths[growthId];
    if (!path) continue;
    path.points += amount;
    path.lastActiveYear = record.calendarYear;
    path.lastActivityLabel = `${event.chapterLabel}：${option.label}`;
    changed.push({ id: growthId, label: path.label, delta: amount, pointsAfter: path.points });
  }
  if (changed.length > 0) {
    addFact(record, "youth_mainline_growth_payoff", {
      eventId: event.id,
      optionId: option.id,
      changes: changed,
    });
  }
  return changed;
}

function applyPreparation(state, payoff, signal, option) {
  const credits = payoff.preparationCredits;
  const directionDeltas = signal.direction.preparationDeltas ?? {};
  for (const [path, delta] of Object.entries(directionDeltas)) {
    if (valueAtPath(state, path) != null) addAtPath(state, path, delta);
    else if (path === "transitionPreparationHours") credits.transition += delta;
    else if (path === "preparation.academicHours") credits.academic += delta;
    else if (path === "preparation.vocationalHours") credits.vocational += delta;
    else if (path === "preparation.employmentHours") credits.employment += delta;
  }

  if (option.kind === "study_entry") {
    if (state.preparation) state.preparation.academicHours += 160;
    else if (state.higherEducationPreparationHours != null) state.higherEducationPreparationHours += 160;
    else credits.academic += 160;
  }
  if (option.kind === "skill_entry") {
    if (state.preparation) {
      state.preparation.vocationalHours += 160;
      state.preparation.employmentHours += 80;
    } else if (state.workReadiness) {
      state.workReadiness.jobSearchContacts += 2;
      state.workReadiness.skillDirection ??= signal.id;
    } else {
      credits.vocational += 160;
      credits.employment += 80;
    }
  }
  if (option.kind === "social_entry") {
    if (state.workReadiness) state.workReadiness.jobSearchContacts += 3;
    else if (state.preparation) state.preparation.employmentHours += 100;
    else credits.contacts += 3;
  }
}

function choosePivotSignal(signals, primary) {
  return signals.find((entry) => entry.id !== primary.id && entry.score < 55)
    ?? signals.find((entry) => entry.id !== primary.id)
    ?? primary;
}

function unlockDirectionActivity(payoff, signal) {
  const activityId = signal.direction.activityId;
  if (!activityId || payoff.unlockedActivityIds.includes(activityId)) return null;
  payoff.unlockedActivityIds.push(activityId);
  return activityId;
}

function applyOpportunity({
  state,
  record,
  event,
  option,
  signal,
  signals,
  content,
  socialCatalog,
  addFact,
  changeStat,
}) {
  const payoff = ensurePayoffState(state);
  const direction = option.kind === "pivot" ? choosePivotSignal(signals, signal) : signal;
  const primaryInterestId = direction.primaryInterestId ?? direction.direction.interestIds[0];
  const interestGain = Number(option.interestGain ?? 0);
  const interestChanges = interestGain === 0 ? {} : { [primaryInterestId]: interestGain };
  applyPayoffInterestChanges(state, interestChanges, content, record.calendarYear);
  const growthChanges = applyGrowth(
    state,
    direction,
    Number(option.growthGain ?? 0),
    record,
    event,
    option,
    addFact,
  );
  const fact = addFact(record, "youth_mainline_opportunity", {
    eventId: event.id,
    chapterLabel: event.chapterLabel,
    title: event.title,
    scene: event.scene,
    age: record.age,
    quarter: event.quarter,
    directionId: direction.id,
    directionLabel: direction.label,
    directionScoreBefore: signal.score,
    selectedOptionId: option.id,
    selectedLabel: option.label,
    gain: option.gain,
    tradeoff: option.tradeoff,
    interestChanges,
    growthChanges,
  });
  for (const [stat, delta] of Object.entries(option.statChanges ?? {})) {
    changeStat(state, record, stat, delta, fact.id, `${event.chapterLabel}：${option.label}`);
  }
  applyPreparation(state, payoff, direction, option);

  let unlockedActivityId = null;
  if (!["pause", "personal"].includes(option.kind)) {
    unlockedActivityId = unlockDirectionActivity(payoff, direction);
  }
  if (["pause", "personal"].includes(option.kind)) {
    if (!payoff.laidDownDirections.some((entry) => entry.directionId === signal.id && entry.eventId === event.id)) {
      payoff.laidDownDirections.push({
        directionId: signal.id,
        directionLabel: signal.label,
        eventId: event.id,
        calendarYear: record.calendarYear,
        age: record.age,
        reason: option.tradeoff,
      });
    }
  }

  const needsPerson = ["share", "negotiate", "social_entry", "deepen", "skill_entry", "study_entry"].includes(option.kind);
  let person = null;
  if (needsPerson) {
    const roleId = resolvePersonRole(event, state);
    person = ensureSocialCharacter({
      state,
      record,
      catalog: socialCatalog,
      roleId,
      random: createSeededRandom(`${state.seed}:payoff-person:${event.id}`),
      addFact,
    });
    if (person) {
      recordSharedActivity({
        person,
        record,
        activityId: event.id,
        activityLabel: `${event.chapterLabel}：${option.label}`,
        quarter: event.quarter,
        response: `${person.displayName}记住了你选择“${option.label}”，但没有保证结果一定成功。`,
        closenessChange: option.kind === "share" || option.kind === "social_entry" ? 4 : 2,
        trustChange: option.kind === "negotiate" || option.kind === "social_entry" ? 4 : 2,
        addFact,
      });
      fact.personId = person.id;
      fact.personName = person.displayName;
      fact.personRoleLabel = person.roleLabel;
    }
  }
  fact.unlockedActivityId = unlockedActivityId;

  const outcome = {
    eventId: event.id,
    chapterLabel: event.chapterLabel,
    calendarYear: record.calendarYear,
    age: record.age,
    quarter: event.quarter,
    directionId: direction.id,
    directionLabel: direction.label,
    directionScoreBefore: signal.score,
    evidence: signal.lastActivityLabel
      ? `此前最近相关行动：${signal.lastActivityLabel}`
      : `此前相关兴趣累计约${signal.totalHours}小时`,
    selectedOptionId: option.id,
    selectedLabel: option.label,
    gain: option.gain,
    tradeoff: option.tradeoff,
    unlockedActivityId,
    personId: person?.id ?? null,
    personName: person?.displayName ?? null,
    sourceFactId: fact.id,
  };
  payoff.outcomes.push(outcome);
  payoff.outcomes = payoff.outcomes.slice(-(content.rules?.maximumOutcomeMemories ?? 12));

  const decision = {
    decisionKind: "youth_mainline_opportunity",
    eventId: event.id,
    calendarYear: record.calendarYear,
    age: record.age,
    selectedOptionId: option.id,
    selectedLabel: option.label,
    directionId: direction.id,
    directionLabel: direction.label,
    sourceFactId: fact.id,
    unchosenOptions: event.choices
      .filter((entry) => entry.id !== option.id)
      .map((entry) => ({
        id: entry.id,
        label: entry.label,
        description: `${entry.gain}。代价：${entry.tradeoff}。`,
        gain: entry.gain,
        tradeoff: entry.tradeoff,
      })),
  };
  state.decisions.push(decision);
  if (Array.isArray(record.decisions)) record.decisions.push(decision);
  else record.decision ??= decision;

  for (const previous of payoff.outcomes.slice(0, -1)) {
    const followThrough = payoff.followThrough[previous.unlockedActivityId] ?? 0;
    if (followThrough <= 0 && previous.directionId !== direction.id) continue;
    addFact(record, "youth_mainline_delayed_echo", {
      sourceEventId: previous.eventId,
      sourceYear: previous.calendarYear,
      sourceAge: previous.age,
      currentEventId: event.id,
      yearsSince: record.calendarYear - previous.calendarYear,
      directionLabel: previous.directionLabel,
      followThroughCount: followThrough,
      text: followThrough > 0
        ? `你后来实际继续了${followThrough}个季度，这段经历因此进入了新的机会。`
        : "相同方向再次出现，使早年的经历没有完全中断。",
    });
  }
}

export function handleYouthMainlineOpportunity({
  state,
  record,
  stage,
  quarter,
  content,
  choices = {},
  autoChoose,
  socialCatalog,
  addFact,
  changeStat,
}) {
  if (!content || record.age > 17) return true;
  const event = (content.events ?? []).find((candidate) => (
    candidate.age === record.age
    && candidate.quarter === quarter
    && candidate.stages.includes(stage)
  ));
  if (!event) return true;
  const payoff = ensurePayoffState(state);
  if (payoff.outcomes.some((outcome) => outcome.eventId === event.id)) return true;
  const signals = youthDirectionSignals(state, content);
  const signal = signals[0];
  const options = event.choices.map((option) => presentationOption(option, state, signal, event, content));
  const providedOptionId = choices[event.id];
  let selected = providedOptionId
    ? options.find((option) => option.id === providedOptionId)
    : null;
  if (providedOptionId && !selected) throw new Error(`0～18岁主线事件${event.id}不存在选项${providedOptionId}`);
  if (selected && !selected.available) {
    throw new Error(`0～18岁主线事件${event.id}选项当前不可执行：${selected.unavailableReason}`);
  }
  if (!selected && autoChoose) selected = chooseAutomatic(options, signal);
  if (!selected) {
    state.status = "awaiting_choice";
    state.pendingDecision = {
      kind: "mainline_event",
      eventId: event.id,
      calendarYear: record.calendarYear,
      age: record.age,
      quarter,
      quarterLabel: `第${quarter}季度`,
      chapterLabel: event.chapterLabel,
      title: event.title,
      prompt: `${event.scene} 过去的记录显示，“${signal.label}”目前最有连续性（${signal.score}/100）${signal.lastActivityLabel ? `，最近来自“${signal.lastActivityLabel}”` : ""}。`,
      directionId: signal.id,
      directionLabel: signal.label,
      evidence: {
        score: signal.score,
        totalHours: signal.totalHours,
        currentInterestScore: signal.currentScore,
        growthPoints: signal.growthPoints,
        lastActivityLabel: signal.lastActivityLabel,
      },
      options,
    };
    return false;
  }
  applyOpportunity({
    state,
    record,
    event,
    option: selected,
    signal,
    signals,
    content,
    socialCatalog,
    addFact,
    changeStat,
  });
  return true;
}

export function recordYouthMainlineFollowThrough({ state, record, quarterRecord, addFact }) {
  const payoff = state.youthMainlinePayoffs;
  if (!payoff) return [];
  const unlocked = new Set(payoff.unlockedActivityIds ?? []);
  const used = (quarterRecord.activities ?? []).filter((activity) => unlocked.has(activity.id));
  for (const activity of used) {
    payoff.followThrough[activity.id] = (payoff.followThrough[activity.id] ?? 0) + 1;
    addFact(record, "youth_mainline_follow_through", {
      quarter: quarterRecord.quarter,
      activityId: activity.id,
      activityLabel: activity.label,
      totalQuarterCount: payoff.followThrough[activity.id],
      sourceEventId: payoff.outcomes.find((outcome) => outcome.unlockedActivityId === activity.id)?.eventId ?? null,
    });
  }
  return used.map((activity) => activity.id);
}

export function buildUnlockedMainlineActivities(state, content, context) {
  const payoff = state.youthMainlinePayoffs;
  if (!payoff || context.age > 18) return [];
  const unlocked = new Set(payoff.unlockedActivityIds ?? []);
  return Object.entries(content?.directions ?? {})
    .filter(([, direction]) => unlocked.has(direction.activityId))
    .map(([directionId, direction]) => ({
      id: direction.activityId,
      label: direction.activityLabel,
      description: direction.activityDescription,
      category: direction.activityCategory,
      hoursPerWeek: context.age <= 11 ? 4 : 6,
      interestTags: clone(direction.interestIds.slice(0, 2)),
      growthChanges: Object.fromEntries(direction.growthIds.slice(0, 2).map((id) => [id, 1])),
      statChanges: clone(direction.statChanges),
      stateDeltas: Object.fromEntries(
        Object.entries(direction.preparationDeltas ?? {})
          .filter(([path]) => valueAtPath(state, path) != null),
      ),
      effectSummary: `这是过去主线事件兑现出的后续行动；继续投入会进入之后的机会判断`,
      autoWeight: 1.45,
      mainlineOpportunity: true,
      mainlineDirectionId: directionId,
    }));
}

export function applyStoredPayoffCredits(state) {
  const credits = state.youthMainlinePayoffs?.preparationCredits;
  if (!credits) return;
  if (state.transitionPreparationHours != null && credits.transition > 0) {
    state.transitionPreparationHours += credits.transition;
    credits.transition = 0;
  }
  if (state.preparation) {
    state.preparation.academicHours += credits.academic;
    state.preparation.vocationalHours += credits.vocational;
    state.preparation.employmentHours += credits.employment;
    credits.academic = 0;
    credits.vocational = 0;
    credits.employment = 0;
  }
  if (state.higherEducationPreparationHours != null && credits.academic > 0) {
    state.higherEducationPreparationHours += credits.academic;
    credits.academic = 0;
  }
  if (state.workReadiness && credits.contacts > 0) {
    state.workReadiness.jobSearchContacts += credits.contacts;
    credits.contacts = 0;
  }
}

export function youthMainlinePayoffReview(state) {
  const payoff = state.youthMainlinePayoffs;
  if (!payoff || (payoff.outcomes ?? []).length === 0) return null;
  const outcomes = payoff.outcomes;
  const directionCounts = new Map();
  for (const outcome of outcomes) {
    const entry = directionCounts.get(outcome.directionId) ?? {
      id: outcome.directionId,
      label: outcome.directionLabel,
      count: 0,
    };
    entry.count += 1;
    directionCounts.set(outcome.directionId, entry);
  }
  const dominant = [...directionCounts.values()].sort((left, right) => right.count - left.count)[0];
  const usedActivities = Object.entries(payoff.followThrough ?? {})
    .filter(([, count]) => count > 0)
    .map(([activityId, count]) => ({ activityId, count }));
  return {
    title: "从出生到成年入口：这些年不是白白经过",
    summary: `共有${outcomes.length}次早期经历进入后续机会判断；“${dominant.label}”被兑现${dominant.count}次。`,
    dominantDirectionId: dominant.id,
    dominantDirectionLabel: dominant.label,
    opportunityCount: outcomes.length,
    takenCount: outcomes.filter((outcome) => outcome.unlockedActivityId).length,
    laidDownCount: payoff.laidDownDirections?.length ?? 0,
    followThroughQuarterCount: usedActivities.reduce((sum, entry) => sum + entry.count, 0),
    recurringPeople: [...new Map(outcomes
      .filter((outcome) => outcome.personId)
      .map((outcome) => [outcome.personId, { id: outcome.personId, name: outcome.personName }])).values()],
    chain: outcomes.map((outcome) => ({
      calendarYear: outcome.calendarYear,
      age: outcome.age,
      chapterLabel: outcome.chapterLabel,
      evidence: outcome.evidence,
      directionLabel: outcome.directionLabel,
      choice: outcome.selectedLabel,
      gain: outcome.gain,
      tradeoff: outcome.tradeoff,
      followedThrough: outcome.unlockedActivityId
        ? payoff.followThrough[outcome.unlockedActivityId] ?? 0
        : 0,
      personName: outcome.personName,
    })),
    laidDown: clone(payoff.laidDownDirections ?? []),
  };
}
