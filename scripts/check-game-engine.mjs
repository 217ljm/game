import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SESSION_SCHEMA_VERSION,
  applySessionChoice,
  createGameSession,
  migrateGameSession,
  runLifeSession,
  validateGameSession,
} from "../src/game/game-engine.mjs";
import { buildTimeline, presentGame } from "../src/game/presenter.mjs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");
const readJson = (...segments) =>
  JSON.parse(fs.readFileSync(path.join(projectRoot, ...segments), "utf8"));
const data = {
  annualOperations: readJson("data", "annual_life_operations.json"),
  quarterlyLife: readJson("data", "quarterly_life_content.json"),
  timeline: readJson("data", "calibration", "timeline_1978_2026.json"),
  socialCharacters: readJson("data", "social_character_catalog.json"),
  birth: readJson("data", "calibration", "birth_1978_1982.json"),
  childhood: readJson("data", "calibration", "childhood_1978_1988.json"),
  childhoodEvents: readJson("data", "childhood_events.json"),
  primary: readJson("data", "calibration", "primary_education_1984_1996.json"),
  primaryEvents: readJson("data", "primary_education_events.json"),
  adolescence: readJson("data", "calibration", "adolescence_education_1986_2000.json"),
  adolescenceEvents: readJson("data", "adolescence_events.json"),
  youth: readJson("data", "calibration", "youth_entry_1992_2006.json"),
  youthEvents: readJson("data", "youth_entry_events.json"),
  entryJobs: readJson("data", "entry_job_catalog.json"),
  adult: readJson("data", "calibration", "adult_life_1992_2025.json"),
  adultEvents: readJson("data", "adult_life_events.json"),
  adultJobs: readJson("data", "adult_job_catalog.json"),
};

const initial = createGameSession({ seed: "engine-check", birthYear: 1979, mortality: false });
assert.equal(validateGameSession(initial), true);
const first = runLifeSession(data, initial);
assert.equal(first.status, "awaiting_choice");
assert.equal(first.pendingDecision.stage, "childhood");
assert.equal(first.pendingDecision.kind, "year_review");
assert.equal(first.pendingDecision.age, 0);
assert.equal(first.currentState.annualRecords.at(-1).quarterRecords.length, 4);
assert.ok(first.currentState.visibleStats.health.value >= 52);
assert.ok(
  first.currentState.annualRecords.at(-1).quarterRecords.every((quarter) => (
    quarter.activityIds.length === 0 && quarter.experience
  )),
  "0岁应由日常经历自动推进，不能要求玩家替照护者作管理决定",
);

const reformOpening = runLifeSession(
  data,
  createGameSession({ seed: "reform-opening-view", birthYear: 1978, mortality: false }),
);
assert.ok(
  presentGame(reformOpening, data).facts.some((line) => line.includes("改革开放")),
  "1978年出生的0岁回合必须显示改革开放时代节点",
);

const ageOneSession = applySessionChoice(
  initial,
  first.pendingDecision,
  "confirm_year_review",
);
const ageOnePending = runLifeSession(data, ageOneSession);
assert.equal(ageOnePending.pendingDecision.kind, "quarter_plan");
assert.equal(ageOnePending.pendingDecision.age, 1);
assert.equal(ageOnePending.pendingDecision.quarter, 3);
assert.equal(ageOnePending.pendingDecision.minActivities, 1);
assert.equal(ageOnePending.pendingDecision.maxActivities, 1);
assert.equal(ageOnePending.pendingDecision.quarterBudget.totalTimeSlots, 12);
assert.ok(ageOnePending.pendingDecision.quarterBudget.availableEnergy >= 4);
assert.ok(ageOnePending.pendingDecision.options
  .filter((option) => !option.isPlanControl)
  .every((option) => option.intensities.length === 3 && option.timeSlots >= 1));
assert.ok(ageOnePending.pendingDecision.options.every((option) => !option.label.includes("照护安排")));
const ageOneOptions = ageOnePending.pendingDecision.options.filter((option) => option.available);
assert.ok(ageOneOptions.length >= 2);
const focusedAgeOneSession = applySessionChoice(
  ageOneSession,
  ageOnePending.pendingDecision,
  {
    type: "quarter.plan",
    allocations: [{ actionId: ageOneOptions[0].id, intensity: "focus" }],
  },
);
assert.equal(
  focusedAgeOneSession.quarterPlans[ageOnePending.pendingDecision.eventId].allocations[0].intensity,
  "focus",
);
assert.throws(() => applySessionChoice(
  ageOneSession,
  ageOnePending.pendingDecision,
  {
    type: "quarter.plan",
    allocations: [{ actionId: ageOneOptions[0].id, intensity: "impossible" }],
  },
), /投入强度无效/);
const firstOptionSession = applySessionChoice(
  ageOneSession,
  ageOnePending.pendingDecision,
  [ageOneOptions[0].id],
);
const secondOptionSession = applySessionChoice(
  ageOneSession,
  ageOnePending.pendingDecision,
  [ageOneOptions[1].id],
);
const firstBranch = runLifeSession(data, firstOptionSession);
const secondBranch = runLifeSession(data, secondOptionSession);
assert.notEqual(
  firstBranch.currentState.annualRecords.at(-1).quarterRecords[2].operationId,
  secondBranch.currentState.annualRecords.at(-1).quarterRecords[2].operationId,
  "1岁的不同即时反应应形成不同的第一人称经历",
);

const serialized = JSON.stringify(firstOptionSession);
const restored = JSON.parse(serialized);
assert.equal(validateGameSession(restored), true);
assert.deepEqual(
  runLifeSession(data, restored),
  runLifeSession(data, firstOptionSession),
  "存档JSON往返后必须精确回放",
);

let lowClickSession = createGameSession({
  seed: "quarter-automation-check",
  birthYear: 1979,
  mortality: false,
});
let lowClickResult = runLifeSession(data, lowClickSession);
lowClickSession = applySessionChoice(
  lowClickSession,
  lowClickResult.pendingDecision,
  "confirm_year_review",
);
lowClickResult = runLifeSession(data, lowClickSession);
assert.equal(lowClickResult.pendingDecision.quarter, 3);
assert.equal(lowClickResult.currentState.annualRecords.at(-1).quarterRecords.length, 2);
assert.ok(
  lowClickResult.pendingDecision.options.filter((option) => !option.isPlanControl).length >= 6,
  "1岁行动池应覆盖社交、探索、语言、节奏与身体活动等至少6项行为",
);
const firstReaction = lowClickResult.pendingDecision.options.find((option) => option.available);
lowClickSession = applySessionChoice(
  lowClickSession,
  lowClickResult.pendingDecision,
  [firstReaction.id],
);
lowClickResult = runLifeSession(data, lowClickSession);
assert.equal(lowClickResult.pendingDecision.kind, "year_review");
const ageOneQuarters = lowClickResult.currentState.annualRecords.at(-1).quarterRecords;
assert.ok(ageOneQuarters.at(-1).interestChangesApplied);
assert.ok(Object.keys(ageOneQuarters.at(-1).interestChanges).length >= 1);
assert.ok(Object.keys(lowClickResult.currentState.interests).length >= 1);
assert.ok(ageOneQuarters.some((quarter) => Object.keys(quarter.statProgress ?? {}).length >= 1));
assert.ok(
  lowClickResult.currentState.annualRecords.at(-1).facts.some((fact) => fact.type === "quarter_growth_effects"),
  "前期季度行为应当场产生可追溯的属性和兴趣成长事实",
);
lowClickSession = applySessionChoice(
  lowClickSession,
  lowClickResult.pendingDecision,
  "confirm_year_review",
);
lowClickResult = runLifeSession(data, lowClickSession);
assert.equal(lowClickResult.pendingDecision.quarter, 1);
assert.ok(
  lowClickResult.pendingDecision.options.filter((option) => !option.isPlanControl).length >= 7,
  "2岁行动池应至少提供7项符合年龄的行为",
);
const ageTwoReaction = lowClickResult.pendingDecision.options.find((option) => option.available);
lowClickSession = applySessionChoice(
  lowClickSession,
  lowClickResult.pendingDecision,
  [ageTwoReaction.id],
);
lowClickResult = runLifeSession(data, lowClickSession);
assert.equal(lowClickResult.pendingDecision.quarter, 3);
const notifyOnly = lowClickResult.pendingDecision.options.find(
  (option) => option.controlMode === "notify_only",
);
assert.ok(notifyOnly, "半年安排的下一次确认必须提供只在不可执行时提醒模式");
lowClickSession = applySessionChoice(lowClickSession, lowClickResult.pendingDecision, notifyOnly.id);
assert.equal(lowClickSession.quarterAutomation.mode, "notify_only");
lowClickResult = runLifeSession(data, lowClickSession);
assert.equal(lowClickResult.pendingDecision.kind, "year_review");
assert.equal(lowClickResult.currentState.annualRecords.at(-1).quarterRecords.length, 4);
const invalidAutomationSession = structuredClone(lowClickSession);
invalidAutomationSession.quarterAutomation = {
  mode: "notify_only",
  activityIds: ["activity_that_does_not_exist"],
  allocations: [{ actionId: "activity_that_does_not_exist", intensity: "regular" }],
  stage: "childhood",
  startedYear: 1981,
  startedQuarter: 3,
};
const invalidAutomationNextYear = applySessionChoice(
  invalidAutomationSession,
  lowClickResult.pendingDecision,
  "confirm_year_review",
);
const invalidAutomationResult = runLifeSession(data, invalidAutomationNextYear);
assert.equal(invalidAutomationResult.pendingDecision.kind, "quarter_plan");
assert.equal(invalidAutomationResult.pendingDecision.planInvalidated, true);
assert.match(invalidAutomationResult.pendingDecision.interruptionReason, /持续计划已不可执行/);
lowClickSession = applySessionChoice(
  lowClickSession,
  lowClickResult.pendingDecision,
  "confirm_year_review",
);
lowClickResult = runLifeSession(data, lowClickSession);
assert.equal(lowClickResult.pendingDecision.kind, "quarter_plan");
assert.equal(lowClickResult.pendingDecision.age, 3);
assert.equal(lowClickResult.pendingDecision.quarter, 1);
const ageThreeActivity = lowClickResult.pendingDecision.options.find(
  (option) => option.available && !option.isPlanControl,
);
lowClickSession = applySessionChoice(
  lowClickSession,
  lowClickResult.pendingDecision,
  [ageThreeActivity.id],
);
lowClickResult = runLifeSession(data, lowClickSession);
while (!["year_review", "quarter_plan"].includes(lowClickResult.pendingDecision.kind)) {
  lowClickSession = applySessionChoice(
    lowClickSession,
    lowClickResult.pendingDecision,
    lowClickResult.pendingDecision.options[0].id,
  );
  lowClickResult = runLifeSession(data, lowClickSession);
}
assert.equal(lowClickResult.pendingDecision.quarter, 3);
const childNotifyOnly = lowClickResult.pendingDecision.options.find(
  (option) => option.controlMode === "notify_only",
);
lowClickSession = applySessionChoice(
  lowClickSession,
  lowClickResult.pendingDecision,
  childNotifyOnly.id,
);
lowClickResult = runLifeSession(data, lowClickSession);
while (!["year_review", "quarter_plan"].includes(lowClickResult.pendingDecision.kind)) {
  lowClickSession = applySessionChoice(
    lowClickSession,
    lowClickResult.pendingDecision,
    lowClickResult.pendingDecision.options[0].id,
  );
  lowClickResult = runLifeSession(data, lowClickSession);
}
assert.equal(lowClickResult.pendingDecision.kind, "year_review");
lowClickSession = applySessionChoice(
  lowClickSession,
  lowClickResult.pendingDecision,
  "confirm_year_review",
);
lowClickResult = runLifeSession(data, lowClickSession);
while (!["year_review", "quarter_plan"].includes(lowClickResult.pendingDecision.kind)) {
  lowClickSession = applySessionChoice(
    lowClickSession,
    lowClickResult.pendingDecision,
    lowClickResult.pendingDecision.options[0].id,
  );
  lowClickResult = runLifeSession(data, lowClickSession);
}
assert.equal(lowClickResult.pendingDecision.kind, "year_review");
assert.equal(lowClickResult.pendingDecision.age, 4);
assert.ok(
  lowClickResult.currentState.annualRecords.at(-1).quarterRecords
    .some((quarter) => quarter.source === "notify_only"),
  "普通年份应在无需点击季度行动的情况下自动推进至年度结算",
);

let session = createGameSession({ seed: "interactive-complete", birthYear: 1980, mortality: false });
let result;
let choiceCount = 0;
const seenStages = new Set();
const quarterPrompts = [];
const reviewAges = [];
let unavailableAnnualOperationCount = 0;
let randomEventPromptCount = 0;
function chooseQuarterPlan(pending) {
  const available = pending.options.filter((option) => option.available !== false && !option.isPlanControl);
  const selected = [];
  for (const option of available) {
    const nextHours = selected.reduce((sum, entry) => sum + entry.timeUseHoursPerWeek, 0)
      + option.timeUseHoursPerWeek;
    const nextCash = selected.reduce((sum, entry) => sum + (entry.cashCostYuan ?? 0), 0)
      + (option.cashCostYuan ?? 0);
    if (nextHours > pending.weeklyDiscretionaryHours) continue;
    if (Number.isFinite(pending.availableCashYuan) && nextCash > pending.availableCashYuan) continue;
    selected.push(option);
    if (selected.length >= pending.minActivities) break;
  }
  assert.ok(selected.length >= pending.minActivities, "每个季度必须能组成合法的生活安排");
  return selected.map((option) => option.id);
}
while ((result = runLifeSession(data, session)).status === "awaiting_choice") {
  seenStages.add(result.pendingDecision.stage);
  if (result.pendingDecision.kind === "quarter_plan") {
    quarterPrompts.push({
      age: result.pendingDecision.age,
      quarter: result.pendingDecision.quarter,
    });
    unavailableAnnualOperationCount += result.pendingDecision.options.filter(
      (option) => option.available === false,
    ).length;
  } else if (result.pendingDecision.kind === "year_review") {
    reviewAges.push(result.pendingDecision.age);
  } else if (result.pendingDecision.kind === "random_life_event") {
    randomEventPromptCount += 1;
  }
  const choice = result.pendingDecision.kind === "quarter_plan"
    ? chooseQuarterPlan(result.pendingDecision)
    : result.pendingDecision.options.find((option) => option.available !== false).id;
  session = applySessionChoice(session, result.pendingDecision, choice);
  choiceCount += 1;
  assert.ok(choiceCount <= 620, "交互人生不应产生无限选择循环");
}
assert.equal(result.status, "completed");
assert.equal(result.stage, "adult");
assert.ok(choiceCount >= 200 && choiceCount <= 600);
for (const stage of ["childhood", "primary", "adolescence", "youth", "adult"]) {
  assert.ok(seenStages.has(stage), `交互人生必须在${stage}阶段出现选择`);
}
assert.ok(result.lifeReview.ageAtDeath >= 16);
for (let age = 0; age <= result.lifeReview.ageAtDeath; age += 1) {
  const quarters = quarterPrompts.filter((entry) => entry.age === age).map((entry) => entry.quarter);
  const expected = age === 0
    ? []
    : (age === 1
        ? [3]
        : (age <= 11 || age >= 60 ? [1, 3] : [1, 2, 3, 4]));
  assert.deepEqual(quarters, expected, `${age}岁的主动季度应符合阶段化操作量`);
}
assert.ok(randomEventPromptCount >= 1, "完整人生中应出现条件化随机生活事件");
assert.ok(
  unavailableAnnualOperationCount >= 1,
  "完整交互人生中应实际出现至少一个受现金或时间约束而不可执行的年度行动",
);
assert.deepEqual(
  reviewAges,
  Array.from({ length: result.lifeReview.ageAtDeath }, (_, age) => age),
  "除死亡当年外，每一岁都必须先完成年度结算才可继续",
);
assert.ok(result.lifeReview.untraveledPaths.length >= result.lifeReview.decisionCount);
assert.ok(result.lifeReview.decisionCount < choiceCount - reviewAges.length);
assert.deepEqual(
  new Set(result.lifeReview.untraveledPaths.map((entry) => entry.stage)),
  seenStages,
  "最终复盘必须汇总五个人生阶段的未选路径",
);
assert.ok(
  result.lifeReview.untraveledPaths.every((entry) => entry.unchosen.label),
  "最终复盘中的未选路径必须有可展示文本",
);
const finalAgain = runLifeSession(data, session);
assert.deepEqual(result, finalAgain, "完成后的同一存档必须得到相同结局");

const view = presentGame(result, data);
assert.equal(view.status, "completed");
assert.ok(view.lifeReview.title);
assert.equal(view.stats.length, 6);
assert.deepEqual(view.stats.map((entry) => entry.id), [
  "health", "fitness", "intelligence", "appearance", "social", "willpower",
]);
assert.equal(view.situation.length, 5);
assert.equal(view.yearLedger.length, 4);
assert.deepEqual(view.yearLedger.map((entry) => entry.id), [
  "time", "work_study", "family", "money",
]);
assert.deepEqual(view.situation.map((entry) => entry.id), [
  "education", "employment", "family", "housing", "finance",
]);
assert.ok(result.currentState.socialNetwork.length >= 2);
assert.ok(result.currentState.socialNetwork.every((person) => person.fictional === true));
assert.ok(view.people.length >= 2);
assert.ok(view.interests.length >= 1, "持续的季度活动应形成可展示的兴趣记录");
assert.ok(Object.keys(result.currentState.interests).length >= 1);
assert.ok(result.currentState.randomEventHistory.length >= 1);
assert.equal(result.currentState.characterModel.version, 1);
assert.deepEqual(Object.keys(result.currentState.characterModel.attributes), [
  "health", "fitness", "intelligence", "appearance", "social", "willpower",
]);
const allQuarterRecords = Object.values(result.stages).flatMap((stage) => (
  stage.annualRecords.flatMap((record) => record.quarterRecords ?? [])
));
assert.ok(allQuarterRecords.length > 0);
assert.ok(allQuarterRecords.every((quarter) => quarter.quarterBudget?.totalTimeSlots === 12));
assert.ok(allQuarterRecords.every((quarter) => quarter.monthTicks?.length === 3));
assert.ok(allQuarterRecords.every((quarter) => quarter.monthSimulation?.protocol === "quarter-months-v1"));
assert.ok(allQuarterRecords.every((quarter) => quarter.quarterBudget.obligations
  .reduce((sum, entry) => sum + entry.slots, 0) === quarter.quarterBudget.obligationSlots));
assert.ok(allQuarterRecords.every((quarter) => quarter.monthTicks.every((tick) => (
  Number.isInteger(tick.calendarMonth)
  && tick.actions.every((action) => Number.isFinite(action.executedShare))
  && typeof tick.narrative === "string"
))));
assert.ok(allQuarterRecords.every((quarter) => quarter.timeSlotsUsed <= quarter.quarterBudget.availableTimeSlots));
assert.ok(allQuarterRecords.every((quarter) => quarter.overdraftEnergy <= 3));
const ageEighteenRecord = result.stages.adult.annualRecords.find((record) => record.age === 18);
assert.ok(ageEighteenRecord?.quarterRecords.some((quarter) => quarter.activityResults?.length >= 2));
assert.ok(ageEighteenRecord?.quarterRecords.flatMap((quarter) => quarter.activityResults ?? [])
  .every((activity) => activity.process.length === 3 && activity.actor.name));
assert.ok(ageEighteenRecord?.facts.some((fact) => fact.type === "quarter_activity_process"));
assert.ok(
  Object.values(result.stages).some((stage) => stage.annualRecords.some((record) => (
    record.age >= 6
    && record.quarterRecords?.some((quarter) => quarter.activities?.length >= 2)
  ))),
  "学龄后同一季度应能同时发生学习、娱乐或生活等多项活动",
);
assert.ok(
  result.stages.adult.annualRecords.some((record) =>
    record.facts.some((fact) => fact.type === "origin_family_support_year")
  ),
  "成年阶段应按年记录仍在世父母与实际照护工时",
);
const timeline = buildTimeline(result);
assert.ok(timeline.length >= 10);
assert.ok(timeline.some((entry) => entry.quarter === 1));
for (const state of Object.values(result.stages)) {
  for (const record of state.annualRecords.filter((entry) => entry.annualOperation)) {
    assert.equal(record.quarterRecords.length, 4);
    assert.deepEqual(record.quarterRecords.map((entry) => entry.quarter), [1, 2, 3, 4]);
  }
}
const echoFacts = Object.values(result.stages).flatMap((stage) =>
  stage.annualRecords.flatMap((record) =>
    record.facts.filter((fact) => fact.type === "annual_operation_echo")
  )
);
assert.ok(echoFacts.length >= 3, "多年重复的年度行动必须形成长期回响事实");
assert.ok(echoFacts.every((fact) => fact.accumulatedYears >= 3));
const annualCashExpenses = Object.values(result.stages).flatMap((stage) =>
  stage.annualRecords.flatMap((record) =>
    record.facts.filter((fact) => fact.type === "annual_operation_cash_expense")
  )
);
assert.ok(annualCashExpenses.length >= 1, "需要现金的年度行动应产生具体人民币支出事实");
assert.ok(annualCashExpenses.every((fact) => fact.amountYuan > 0 && fact.purpose));
for (const record of result.stages.adult.annualRecords) {
  const expense = record.facts.find((fact) => fact.type === "annual_operation_cash_expense");
  const finance = record.facts.find((fact) => fact.type === "adult_household_finance");
  if (expense && finance) {
    assert.equal(finance.annualOperationExpenseYuan, expense.amountYuan);
  }
}
for (let index = 1; index < timeline.length; index += 1) {
  assert.ok(timeline[index].year >= timeline[index - 1].year);
}

const automaticSession = createGameSession({
  seed: "automatic-complete",
  birthYear: 1982,
  mortality: false,
});
const automaticFirst = runLifeSession(data, automaticSession, { autoChoose: true });
const automaticSecond = runLifeSession(data, automaticSession, { autoChoose: true });
assert.equal(automaticFirst.status, "completed");
assert.deepEqual(automaticFirst, automaticSecond, "自动模式也必须按种子精确复现");

let crossGenerationLife = null;
for (let index = 0; index < 12 && !crossGenerationLife; index += 1) {
  const candidateSession = createGameSession({
    seed: `cross-generation-${index}`,
    birthYear: 1980,
    mortality: false,
  });
  candidateSession.choices.adult.partnership_decision = "partnership_commit";
  candidateSession.choices.adult.first_child_decision = "child_try";
  const candidate = runLifeSession(data, candidateSession, { autoChoose: true });
  if (candidate.currentState.family.child) crossGenerationLife = candidate;
}
assert.ok(crossGenerationLife, "固定共同生活和生育选择后应能形成可验收的跨代人生");
const child = crossGenerationLife.currentState.family.child;
assert.ok(child.supportYears >= 1);
assert.ok(child.currentLifeStage);
const childYearFacts = crossGenerationLife.stages.adult.annualRecords.flatMap((record) =>
  record.facts.filter((fact) => fact.type === "child_year")
);
assert.equal(childYearFacts.length, child.supportYears);
assert.ok(childYearFacts.every((fact) => Number.isFinite(fact.playerInteractionHoursPerWeek)));
assert.ok(childYearFacts.some((fact) => fact.lifeStage !== "infancy"));
assert.ok(
  crossGenerationLife.stages.adult.annualRecords.some((record) =>
    record.facts.some((fact) => fact.type === "child_life_stage_transition")
  ),
  "孩子年龄增长后应形成跨阶段事实",
);

let earlyDeath = null;
for (let index = 0; index < 500; index += 1) {
  const candidate = createGameSession({
    seed: `early-death-${index}`,
    birthYear: 1978 + (index % 5),
    mortality: true,
  });
  const outcome = runLifeSession(data, candidate, { autoChoose: true });
  if (outcome.stage === "childhood" && outcome.status === "completed") {
    earlyDeath = outcome;
    break;
  }
}
assert.ok(earlyDeath, "应能找到按历史校准在幼年结束的人生");
assert.equal(earlyDeath.lifeReview.archetypeId, "early_childhood_death");
assert.ok(earlyDeath.lifeReview.ageAtDeath <= 6);

const invalid = structuredClone(initial);
invalid.schemaVersion = 999;
assert.throws(() => validateGameSession(invalid), /不支持的存档版本/);
assert.throws(
  () => applySessionChoice(initial, first.pendingDecision, "not-an-option"),
  /无效选项/,
);

const legacy = structuredClone(initial);
legacy.schemaVersion = 1;
delete legacy.quarterPlans;
delete legacy.quarterAutomation;
delete legacy.randomEventChoices;
delete legacy.yearReviews;
const migrated = migrateGameSession(legacy);
assert.equal(migrated.schemaVersion, SESSION_SCHEMA_VERSION);
assert.deepEqual(migrated.quarterPlans, {});
assert.equal(migrated.quarterAutomation, null);
assert.deepEqual(migrated.randomEventChoices, {});
assert.deepEqual(migrated.yearReviews, {});
assert.equal(validateGameSession(migrated), true);

const versionTwo = structuredClone(initial);
versionTwo.schemaVersion = 2;
delete versionTwo.quarterPlans;
delete versionTwo.quarterAutomation;
delete versionTwo.randomEventChoices;
versionTwo.annualChoices = { "annual:1979": "child_play_nearby" };
const migratedVersionTwo = migrateGameSession(versionTwo);
assert.equal(migratedVersionTwo.schemaVersion, SESSION_SCHEMA_VERSION);
for (let quarter = 1; quarter <= 4; quarter += 1) {
  assert.deepEqual(
    migratedVersionTwo.quarterPlans[`quarter:1979:Q${quarter}`],
    {
      activityIds: ["child_play_nearby"],
      controlMode: "select",
      allocations: [{ actionId: "child_play_nearby", intensity: "regular", timeSlots: 2 }],
    },
  );
}
const versionThree = structuredClone(initial);
versionThree.schemaVersion = 3;
versionThree.quarterChoices = {
  "quarter:1980:Q1": "child_play_nearby",
  "quarter:1980:Q3": "quarter-control:keep_year:child_play_nearby",
};
delete versionThree.quarterPlans;
delete versionThree.randomEventChoices;
const migratedVersionThree = migrateGameSession(versionThree);
assert.deepEqual(
  migratedVersionThree.quarterPlans["quarter:1980:Q3"],
  {
    activityIds: ["child_play_nearby"],
    controlMode: "keep_year",
    allocations: [{ actionId: "child_play_nearby", intensity: "regular", timeSlots: 2 }],
  },
);
assert.deepEqual(migratedVersionThree.randomEventChoices, {});

const versionFour = structuredClone(initial);
versionFour.schemaVersion = 4;
delete versionFour.characterModelVersion;
delete versionFour.quarterPlanProtocol;
versionFour.quarterPlans = {
  "quarter:1981:Q1": { activityIds: ["child_play_nearby"], controlMode: "select" },
};
const migratedVersionFour = migrateGameSession(versionFour);
assert.equal(migratedVersionFour.schemaVersion, 5);
assert.equal(migratedVersionFour.characterModelVersion, 1);
assert.equal(migratedVersionFour.quarterPlanProtocol, "resource-v1");
assert.deepEqual(
  migratedVersionFour.quarterPlans["quarter:1981:Q1"].allocations,
  [{ actionId: "child_play_nearby", intensity: "regular", timeSlots: 2 }],
);

console.log(JSON.stringify({
  ok: true,
  interactiveChoiceCount: choiceCount,
  interactiveAgeAtDeath: result.lifeReview.ageAtDeath,
  interactiveArchetype: result.lifeReview.archetypeId,
  unavailableAnnualOperationCount,
  timelineHighlights: timeline.length,
  earlyDeathAge: earlyDeath.lifeReview.ageAtDeath,
  checks: [
    "session_schema_validation",
    "manual_pending_choices_across_all_stages",
    "calendar_year_era_context",
    "stage_based_quarterly_interaction_cadence",
    "four_quarter_records_per_completed_year",
    "year_review_before_time_advances",
    "live_time_or_cash_operation_constraints",
    "choice_counterfactual_effect",
    "json_save_roundtrip_determinism",
    "continue_keep_year_and_notify_only_quarter_automation",
    "invalid_automation_returns_to_player_with_reason",
    "v1_v2_and_v3_save_migration",
    "v4_to_v5_resource_save_migration",
    "absolute_six_attribute_character_model",
    "quarter_time_energy_and_three_month_ticks",
    "fact_backed_obligation_breakdown_and_actual_month_execution",
    "age_18_scene_actor_process_feedback_and_result",
    "player_selected_action_intensity",
    "calibrated_birth_health_reserve",
    "infant_first_person_reactions_without_caregiver_control",
    "multi_activity_quarter_plans",
    "interest_growth_and_random_life_events",
    "interactive_life_completion",
    "whole_life_untraveled_paths_with_labels",
    "multi_year_operation_echo_facts",
    "annual_operation_cash_expense_ledger",
    "cross_generation_parent_and_child_facts",
    "automatic_life_determinism",
    "early_childhood_death_completion",
    "presenter_and_timeline",
  ],
}, null, 2));
