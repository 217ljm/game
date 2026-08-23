import {
  applySessionChoice,
  createGameSession,
  runLifeSession,
} from "./game-engine.mjs";
import { diagnoseRandomEvents } from "../simulation/quarterly-random-event-system.mjs";
import { buildLifeMainline } from "../simulation/life-mainline-system.mjs";

export const DEBUG_SCHEMA_VERSION = 1;
export const DEBUG_KEY_AGES = [0, 1, 2, 3, 5, 6, 7, 9, 11, 12, 15, 16, 17, 18, 22, 30, 45, 60, 75];

export const DEBUG_ROUTE_PRESETS = [
  { id: "balanced", label: "自然均衡" },
  { id: "academic", label: "学业与升学" },
  { id: "vocational", label: "技能与中职" },
  { id: "early_work", label: "较早参加工作" },
];

export const DEBUG_FAMILY_PRESETS = [
  { id: "natural", label: "自然发展" },
  { id: "partnered_child", label: "伴侣与孩子" },
  { id: "independent", label: "单身独立生活" },
];

export const DEBUG_PRESSURE_PRESETS = [
  { id: "ordinary", label: "普通生活压力" },
  { id: "low_cash", label: "现金紧张倾向" },
  { id: "health_pressure", label: "健康压力倾向" },
  { id: "healthy_routine", label: "健康保护倾向" },
];

const STAGE_EVENT_CONFIGS = [
  ["childhood", "childhoodEvents", "童年关键事件"],
  ["primary", "primaryEvents", "小学关键事件"],
  ["adolescence", "adolescenceEvents", "青少年关键事件"],
  ["youth", "youthEvents", "高中/中职关键事件"],
  ["adult", "adultEvents", "成年关键事件"],
];

function clone(value) {
  return structuredClone(value);
}

function normalizedConfig(config = {}) {
  const targetAge = config.targetAge === "ending"
    ? "ending"
    : Math.max(0, Math.min(120, Number(config.targetAge ?? 0)));
  return {
    seed: String(config.seed || "debug-life"),
    birthYear: Number(config.birthYear ?? 1978),
    targetAge,
    targetPoint: String(config.targetPoint ?? "first"),
    mortality: Boolean(config.mortality),
    routePreset: String(config.routePreset ?? "balanced"),
    familyPreset: String(config.familyPreset ?? "natural"),
    pressurePreset: String(config.pressurePreset ?? "ordinary"),
    randomMode: String(config.randomMode ?? "normal"),
    forcedEventId: config.forcedEventId ? String(config.forcedEventId) : null,
  };
}

function recommendedRouteForEvent(eventId) {
  if (/vocational|training|skill|trade/.test(eventId)) return "vocational";
  if (/nonstudent|age16|job|work|career/.test(eventId)) return "early_work";
  if (/academic|higher|junior|primary/.test(eventId)) return "academic";
  return "balanced";
}

function recommendedFamilyForEvent(eventId) {
  if (/first_child|parent_care|partnership/.test(eventId)) return "partnered_child";
  return "natural";
}

export function debugStageEventCatalog(data) {
  const stageEvents = STAGE_EVENT_CONFIGS.flatMap(([stage, key, groupLabel]) => (
    (data[key]?.events ?? []).map((event) => ({
      id: event.id,
      label: event.title,
      prompt: event.prompt,
      stage,
      groupLabel,
      minAge: event.age ?? event.minAge ?? null,
      maxAge: event.age ?? event.maxAge ?? null,
      recommendedRoute: recommendedRouteForEvent(event.id),
      recommendedFamily: recommendedFamilyForEvent(event.id),
    }))
  ));
  const mainlineEvents = (data.youthMainlinePayoffs?.events ?? []).map((event) => ({
    id: event.id,
    label: event.title,
    prompt: event.scene,
    stage: event.stages[0],
    groupLabel: "0—18岁主线兑现事件",
    minAge: event.age,
    maxAge: event.age,
    recommendedRoute: recommendedRouteForEvent(event.id),
    recommendedFamily: recommendedFamilyForEvent(event.id),
  }));
  return [...mainlineEvents, ...stageEvents];
}

export function createDebugGameSession(config = {}) {
  const value = normalizedConfig(config);
  const session = createGameSession({
    seed: value.seed,
    birthYear: value.birthYear,
    mortality: value.mortality,
  });
  session.debug = {
    schemaVersion: DEBUG_SCHEMA_VERSION,
    enabled: true,
    routePreset: value.routePreset,
    familyPreset: value.familyPreset,
    pressurePreset: value.pressurePreset,
    randomEvents: {
      mode: value.randomMode,
      forcedEventId: value.forcedEventId,
      activationYear: null,
      activationQuarter: null,
    },
    minimumSurvivalAge: value.mortality
      ? null
      : (value.targetAge === "ending" ? null : value.targetAge),
  };
  return session;
}

function optionSearchText(option) {
  return `${option.id} ${option.label ?? ""} ${option.description ?? ""} ${option.category ?? ""}`.toLowerCase();
}

function wordScore(text, words, points = 8) {
  return words.reduce((score, word) => score + (text.includes(word) ? points : 0), 0);
}

function optionPreferenceScore(option, config, index) {
  const text = optionSearchText(option);
  let score = 100 - index;
  const routeWords = {
    balanced: ["balance", "regular", "均衡", "规律"],
    academic: ["study", "school", "academic", "higher", "course", "junior", "symbol", "read", "学习", "升学", "课程", "阅读"],
    vocational: ["vocational", "skill", "practice", "training", "trade", "repair", "技能", "实训", "手艺", "修理"],
    early_work: ["work", "job", "employment", "production", "family_activity", "工作", "岗位", "生产", "求职"],
  };
  score += wordScore(text, routeWords[config.routePreset] ?? [], 9);
  if (config.familyPreset === "partnered_child") {
    score += wordScore(text, ["partnership_commit", "child_try", "family", "relationship", "parent_care", "伴侣", "孩子", "家人"], 16);
    score -= wordScore(text, ["remain_independent", "child_decline"], 25);
  } else if (config.familyPreset === "independent") {
    score += wordScore(text, ["remain_independent", "child_decline", "career", "renting", "独立", "工作"], 16);
    score -= wordScore(text, ["partnership_commit", "child_try"], 25);
  }
  if (config.pressurePreset === "low_cash") {
    score += (option.cashCostYuan ?? 0) > 0 ? 20 : 0;
    score += wordScore(text, ["expense", "purchase", "materials", "支出", "购房", "花费"], 12);
    score -= wordScore(text, ["save", "saving", "储蓄"], 14);
  } else if (config.pressurePreset === "health_pressure") {
    score += wordScore(text, ["overtime", "work", "exam_focus", "push_through", "hide", "household_work", "加班", "硬撑", "备考"], 12);
    score -= wordScore(text, ["health", "rest", "balance", "check", "运动", "休息", "体检"], 12);
  } else if (config.pressurePreset === "healthy_routine") {
    score += wordScore(text, ["health", "rest", "balance", "check", "active", "运动", "休息", "体检", "规律"], 14);
  }
  return score;
}

function chooseQuarterActivities(pending, config) {
  const activities = pending.options
    .filter((option) => option.available !== false && !option.isPlanControl)
    .map((option, index) => ({ option, score: optionPreferenceScore(option, config, index) }))
    .sort((left, right) => right.score - left.score);
  const selected = [];
  const preferredCount = Math.min(
    pending.maxActivities,
    Math.max(pending.minActivities, pending.age >= 3 ? 2 : 1),
  );
  for (const { option } of activities) {
    const hours = selected.reduce((sum, entry) => sum + entry.timeUseHoursPerWeek, 0)
      + option.timeUseHoursPerWeek;
    const cash = selected.reduce((sum, entry) => sum + (entry.cashCostYuan ?? 0), 0)
      + (option.cashCostYuan ?? 0);
    const timeSlots = selected.reduce((sum, entry) => sum + (entry.timeSlots ?? 2), 0)
      + (option.timeSlots ?? 2);
    const energy = selected.reduce((sum, entry) => sum + (entry.energyCost ?? 2), 0)
      + (option.energyCost ?? 2);
    if (hours > pending.weeklyDiscretionaryHours) continue;
    if (Number.isFinite(pending.availableCashYuan) && cash > pending.availableCashYuan) continue;
    if (
      Number.isFinite(pending.quarterBudget?.availableTimeSlots)
      && timeSlots > pending.quarterBudget.availableTimeSlots
    ) continue;
    if (
      Number.isFinite(pending.quarterBudget?.availableEnergy)
      && energy - pending.quarterBudget.availableEnergy > 3
    ) continue;
    selected.push(option);
    if (selected.length >= preferredCount) break;
  }
  if (selected.length < pending.minActivities) {
    throw new Error(`${pending.age}岁第${pending.quarter}季度无法形成合法调试计划`);
  }
  return selected.map((option) => option.id);
}

export function chooseDebugOption(pending, rawConfig = {}) {
  const config = normalizedConfig(rawConfig);
  if (pending.kind === "quarter_plan") return chooseQuarterActivities(pending, config);
  if (pending.kind === "year_review") return "confirm_year_review";
  const available = pending.options.filter((option) => option.available !== false);
  if (available.length === 0) throw new Error(`调试事件 ${pending.eventId} 没有可执行选项`);
  return [...available]
    .map((option, index) => ({ option, score: optionPreferenceScore(option, config, index) }))
    .sort((left, right) => right.score - left.score)[0].option.id;
}

function pendingAge(result) {
  return result.pendingDecision?.age
    ?? result.ending?.age
    ?? result.currentState?.currentAge
    ?? null;
}

function pendingQuarter(result) {
  return result.pendingDecision?.quarter ?? null;
}

function latestRecord(result) {
  return result.currentState?.annualRecords?.at(-1) ?? null;
}

function targetReached(result, config) {
  if (config.targetAge === "ending") return result.status === "completed";
  if (result.status === "completed") return true;
  const age = pendingAge(result);
  if (age == null || age < config.targetAge) return false;
  if (age > config.targetAge) return true;
  if (config.targetPoint === "first") return true;
  if (config.targetPoint === "review") return result.pendingDecision?.kind === "year_review";
  const targetQuarter = Number(/^q([1-4])$/.exec(config.targetPoint)?.[1]);
  if (!targetQuarter) return true;
  const quarter = pendingQuarter(result);
  if (quarter != null && quarter >= targetQuarter) return true;
  const completedQuarters = latestRecord(result)?.quarterRecords?.length ?? 0;
  return completedQuarters >= targetQuarter;
}

function applyOneDebugChoice(data, session, result, config, log) {
  const choice = chooseDebugOption(result.pendingDecision, config);
  log.push({
    age: result.pendingDecision.age,
    calendarYear: result.pendingDecision.calendarYear,
    quarter: result.pendingDecision.quarter ?? null,
    stage: result.stage,
    kind: result.pendingDecision.kind ?? "stage_event",
    eventId: result.pendingDecision.eventId,
    choice: clone(choice),
  });
  const nextSession = applySessionChoice(session, result.pendingDecision, choice);
  return {
    session: nextSession,
    result: runLifeSession(data, nextSession, { autoChoose: false }),
  };
}

function reachedDescription(result, config) {
  if (result.status === "completed") return `已到达人生结局（${result.lifeReview.ageAtDeath}岁）`;
  const pending = result.pendingDecision;
  const quarter = pending.quarter ? ` Q${pending.quarter}` : "";
  const kind = pending.kind === "year_review"
    ? "年度结算"
    : (pending.kind === "random_life_event" ? "随机事件" : (pending.kind === "quarter_plan" ? "季度计划" : "关键事件"));
  let note = "";
  const requestedQuarter = Number(/^q([1-4])$/.exec(config.targetPoint)?.[1]);
  if (requestedQuarter && pending.quarter && pending.quarter > requestedQuarter) {
    note = `；该年龄Q${requestedQuarter}不是主动节点，停在随后可操作的Q${pending.quarter}`;
  }
  return `${pending.age}岁${quarter} · ${kind}${note}`;
}

export function replayDebugToTarget(data, rawConfig = {}, startingSession = null) {
  const config = normalizedConfig(rawConfig);
  let session = startingSession ? clone(startingSession) : createDebugGameSession(config);
  session.debug ??= createDebugGameSession(config).debug;
  session.debug.routePreset = config.routePreset;
  session.debug.familyPreset = config.familyPreset;
  session.debug.pressurePreset = config.pressurePreset;
  const currentRandomDebug = session.debug.randomEvents ?? {};
  const sameRandomMode = currentRandomDebug.mode === config.randomMode
    && currentRandomDebug.forcedEventId === config.forcedEventId;
  session.debug.randomEvents = {
    mode: config.randomMode,
    forcedEventId: config.forcedEventId,
    activationYear: sameRandomMode ? currentRandomDebug.activationYear ?? null : null,
    activationQuarter: sameRandomMode ? currentRandomDebug.activationQuarter ?? null : null,
  };
  session.debug.minimumSurvivalAge = config.mortality
    ? null
    : (config.targetAge === "ending" ? session.debug.minimumSurvivalAge ?? null : config.targetAge);
  let result = runLifeSession(data, session, { autoChoose: false });
  const choiceLog = [];
  let steps = 0;
  while (!targetReached(result, config)) {
    if (result.status === "completed") break;
    ({ session, result } = applyOneDebugChoice(data, session, result, config, choiceLog));
    steps += 1;
    if (steps > 1800) throw new Error("调试回放超过1800个节点，可能存在无法推进的循环");
  }
  const warnings = [];
  if (config.targetAge !== "ending" && result.status === "completed" && result.lifeReview.ageAtDeath < config.targetAge) {
    warnings.push(`人物在${result.lifeReview.ageAtDeath}岁结束，未能到达${config.targetAge}岁；关闭死亡后可继续测试。`);
  }
  return {
    session,
    result,
    report: {
      config,
      steps,
      reached: reachedDescription(result, config),
      warnings,
      choiceLog,
    },
  };
}

function eventSearchAttempt(data, config, eventId, catalogEntry, attempt) {
  const session = createDebugGameSession(config);
  let result = runLifeSession(data, session, { autoChoose: false });
  let currentSession = session;
  const choiceLog = [];
  let steps = 0;
  while (result.status === "awaiting_choice") {
    if (result.pendingDecision.eventId === eventId) {
      return { session: currentSession, result, choiceLog, steps };
    }
    const age = pendingAge(result);
    if (catalogEntry.maxAge != null && age > catalogEntry.maxAge + 2) break;
    if (catalogEntry.stage !== "adult" && STAGE_EVENT_CONFIGS.findIndex(([stage]) => stage === result.stage)
      > STAGE_EVENT_CONFIGS.findIndex(([stage]) => stage === catalogEntry.stage)) break;
    ({ session: currentSession, result } = applyOneDebugChoice(
      data,
      currentSession,
      result,
      config,
      choiceLog,
    ));
    steps += 1;
    if (steps > 700) break;
  }
  return {
    session: currentSession,
    result,
    choiceLog,
    steps,
    failedAt: result.status === "completed"
      ? `人生于${result.lifeReview.ageAtDeath}岁结束`
      : `${pendingAge(result)}岁 ${result.pendingDecision?.eventId ?? result.status}`,
    attempt,
  };
}

export function replayDebugToStageEvent(data, rawConfig, eventId) {
  const catalogEntry = debugStageEventCatalog(data).find((entry) => entry.id === eventId);
  if (!catalogEntry) throw new Error(`关键事件目录中不存在：${eventId}`);
  const base = normalizedConfig(rawConfig);
  const routeOrder = [...new Set([
    catalogEntry.recommendedRoute,
    base.routePreset,
  ])];
  const familyOrder = [...new Set([
    catalogEntry.recommendedFamily,
    base.familyPreset,
  ])];
  const failures = [];
  let attempt = 0;
  for (const routePreset of routeOrder) {
    for (const familyPreset of familyOrder) {
      for (let seedVariant = 0; seedVariant < 8; seedVariant += 1) {
        const config = {
          ...base,
          seed: `${base.seed}:find:${eventId}:${seedVariant}`,
          targetAge: catalogEntry.maxAge ?? "ending",
          routePreset,
          familyPreset,
          randomMode: "normal",
          forcedEventId: null,
        };
        const outcome = eventSearchAttempt(data, config, eventId, catalogEntry, attempt);
        attempt += 1;
        if (outcome.result.pendingDecision?.eventId === eventId) {
          return {
            session: outcome.session,
            result: outcome.result,
            report: {
              config,
              steps: outcome.steps,
              reached: `${outcome.result.pendingDecision.age}岁 · ${catalogEntry.groupLabel} · ${catalogEntry.label}`,
              warnings: attempt > 1 ? [`尝试${attempt}条合法前史后找到该事件。`] : [],
              choiceLog: outcome.choiceLog,
              searchedEvent: clone(catalogEntry),
              attempts: attempt,
            },
          };
        }
        if (failures.length < 8) failures.push(outcome.failedAt);
      }
    }
  }
  throw new Error(
    `未能为“${catalogEntry.label}”找到合法前史。已尝试${attempt}条种子/路线；停止点示例：${failures.join("、")}`,
  );
}

export function advanceDebugSession(data, currentSession, currentResult, rawConfig, mode) {
  const config = normalizedConfig(rawConfig);
  let session = clone(currentSession);
  let result = currentResult ?? runLifeSession(data, session, { autoChoose: false });
  const startAge = pendingAge(result);
  const startQuarter = pendingQuarter(result) ?? 4;
  const log = [];
  let steps = 0;
  do {
    if (result.status === "completed") break;
    ({ session, result } = applyOneDebugChoice(data, session, result, config, log));
    steps += 1;
    if (mode === "node") break;
    const age = pendingAge(result);
    const quarter = pendingQuarter(result);
    if (mode === "quarter" && (age > startAge || result.pendingDecision?.kind === "year_review" || (quarter != null && quarter > startQuarter))) break;
    if (mode === "year" && age > startAge) break;
    if (steps > 500) throw new Error("调试推进超过500个节点，可能存在无法推进的循环");
  } while (true);
  return {
    session,
    result,
    report: {
      config,
      steps,
      reached: reachedDescription(result, config),
      warnings: [],
      choiceLog: log,
    },
  };
}

export function nextDebugKeyAge(age) {
  return DEBUG_KEY_AGES.find((entry) => entry > age) ?? "ending";
}

function currentEventContext(result) {
  const state = result.currentState ?? {};
  const age = pendingAge(result) ?? 0;
  const calendarYear = result.pendingDecision?.calendarYear
    ?? latestRecord(result)?.calendarYear
    ?? (result.profile?.person?.birthYear ?? 1978) + age;
  const educationStatus = state.education?.status
    ?? state.education?.junior?.status
    ?? state.education?.senior?.status
    ?? state.education?.higher?.status
    ?? null;
  const originMembers = state.family?.originMembers ?? [];
  const lastQuarter = latestRecord(result)?.quarterRecords?.at(-1);
  return {
    stage: result.stage,
    age,
    calendarYear,
    residence: state.residence ?? result.profile?.person?.residence ?? null,
    path: state.path ?? null,
    educationStatus,
    employmentStatus: state.employment?.status ?? null,
    relationshipStatus: state.family?.relationshipStatus ?? null,
    hasChild: Boolean(state.family?.child),
    olderParentCount: originMembers.filter((member) => (
      member.alive
      && ["mother", "father"].includes(member.relation)
      && calendarYear - member.birthYear >= 65
    )).length,
    selectedCategories: [...new Set(
      (lastQuarter?.activities ?? []).map((activity) => activity.category).filter(Boolean),
    )],
  };
}

function summarizeAnnualRecords(result) {
  return Object.fromEntries(Object.entries(result.stages ?? {}).map(([stage, state]) => [stage, {
    count: state.annualRecords?.length ?? 0,
    firstYear: state.annualRecords?.[0]?.calendarYear ?? null,
    lastYear: state.annualRecords?.at(-1)?.calendarYear ?? null,
  }]));
}

export function buildDebugReport(data, session, result, extra = {}) {
  const state = result?.currentState ?? {};
  const mainline = result ? buildLifeMainline(result) : null;
  const context = result ? currentEventContext(result) : null;
  const eventDiagnostics = context
    ? diagnoseRandomEvents(data.quarterlyLife, context, state.randomEventHistory ?? [])
    : [];
  return {
    generatedAt: new Date().toISOString(),
    debugSchemaVersion: DEBUG_SCHEMA_VERSION,
    location: typeof location === "undefined" ? null : location.href,
    extra: clone(extra),
    session: clone(session),
    reached: result ? {
      status: result.status,
      stage: result.stage,
      age: pendingAge(result),
      calendarYear: result.pendingDecision?.calendarYear ?? latestRecord(result)?.calendarYear ?? null,
      pendingDecision: clone(result.pendingDecision ?? null),
    } : null,
    profile: result ? {
      person: clone(result.profile.person),
      householdAtBirth: {
        size: result.profile.household.coResidentSizeAtBirth,
        mainEarnerSector: result.profile.household.mainEarnerSector,
        housing: clone(result.profile.household.housing),
        finance: clone(result.profile.household.finance),
      },
    } : null,
    currentState: result ? {
      visibleStats: clone(state.visibleStats ?? {}),
      characterModel: clone(state.characterModel ?? null),
      education: clone(state.education ?? null),
      employment: clone(state.employment ?? null),
      family: clone(state.family ?? null),
      housing: clone(state.housing ?? state.household?.housing ?? null),
      finance: clone(state.finance ?? state.household?.finance ?? null),
      health: clone(state.health ?? null),
      interests: clone(state.interests ?? {}),
      childhoodGrowth: clone(state.childhoodGrowth ?? null),
      youthMainlinePayoffs: clone(state.youthMainlinePayoffs ?? null),
      socialNetwork: clone(state.socialNetwork ?? []),
      randomEventHistory: clone(state.randomEventHistory ?? []),
      latestRecord: clone(latestRecord(result)),
    } : null,
    mainline: clone(mainline),
    stageCoverage: result ? summarizeAnnualRecords(result) : {},
    randomEventContext: context,
    randomEventDiagnostics: eventDiagnostics,
    contentCoverage: {
      annualBands: data.annualOperations.bands.length,
      annualActivities: data.annualOperations.bands.reduce((sum, band) => sum + band.options.length, 0),
      interestDomains: Object.keys(data.quarterlyLife.interestDomains).length,
      childhoodActivityPools: data.childhoodPlay?.activityPools?.length ?? 0,
      childhoodActivities: data.childhoodPlay?.activityPools?.reduce(
        (sum, pool) => sum + pool.options.length,
        0,
      ) ?? 0,
      childhoodGrowthPaths: Object.keys(data.childhoodPlay?.growthPaths ?? {}).length,
      childhoodMilestones: data.childhoodPlay?.milestones?.length ?? 0,
      randomEvents: data.quarterlyLife.randomEvents.length,
      youthMainlinePayoffEvents: data.youthMainlinePayoffs?.events?.length ?? 0,
      stageEvents: [data.childhoodEvents, data.primaryEvents, data.adolescenceEvents, data.youthEvents, data.adultEvents]
        .reduce((sum, config) => sum + config.events.length, 0),
      stageEventCatalog: debugStageEventCatalog(data),
    },
  };
}

export function debugInspectorSummary(report) {
  if (!report.reached) return "尚未生成调试人生。";
  const state = report.currentState;
  const stats = Object.entries(state.characterModel?.attributes ?? state.visibleStats ?? {})
    .map(([id, entry]) => `${id}:${typeof entry === "object" ? entry.value : entry}`)
    .join(" · ");
  const interests = Object.values(state.interests ?? {})
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
    .map((entry) => `${entry.label ?? entry.id} ${entry.score}`)
    .join("、") || "尚无";
  const eligible = report.randomEventDiagnostics.filter((entry) => entry.eligible);
  const mainline = report.mainline;
  const childhoodGrowth = Object.values(state.childhoodGrowth?.paths ?? {})
    .filter((entry) => entry.points > 0)
    .map((entry) => `${entry.label} ${entry.points}点/${entry.levelLabel}`)
    .join("、") || "尚无";
  return [
    `节点：${report.reached.calendarYear ?? "—"}年 · ${report.reached.age ?? "—"}岁 · ${report.reached.stage}`,
    `等待：${report.reached.pendingDecision?.kind ?? report.reached.status}`,
    `属性：${stats || "无"}`,
    `教育：${JSON.stringify(state.education)}`,
    `就业：${JSON.stringify(state.employment)}`,
    `家庭：${JSON.stringify(state.family)}`,
    `财务：${JSON.stringify(state.finance)}`,
    `兴趣：${interests}`,
    `人生主线：${mainline?.chapter?.label ?? "尚无"} · ${mainline?.directionStatus ?? "方向尚未形成"}`,
    `当前课题：${mainline?.quests?.map((quest) => `${quest.typeLabel}${quest.progress}%`).join(" · ") ?? "尚无"}`,
    `3～12岁成长线：${childhoodGrowth}`,
    `0～18岁主线兑现：${state.youthMainlinePayoffs?.outcomes?.length ?? 0}次机会 · ${mainline?.youthPayoffReview?.followThroughQuarterCount ?? 0}个季度延续`,
    `人物：${state.socialNetwork.length}人 · 随机事件记录：${state.randomEventHistory.length}条`,
    `当前条件可触发事件：${eligible.map((entry) => entry.title).join("、") || "无"}`,
  ].join("\n");
}
