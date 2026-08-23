import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DATA_FILES } from "../src/game/load-game-data.mjs";
import { runLifeSession } from "../src/game/game-engine.mjs";
import {
  DEBUG_KEY_AGES,
  advanceDebugSession,
  buildDebugReport,
  debugStageEventCatalog,
  nextDebugKeyAge,
  replayDebugToTarget,
  replayDebugToStageEvent,
} from "../src/game/debug-tools.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = Object.fromEntries(Object.entries(DATA_FILES).map(([key, relativePath]) => [
  key,
  JSON.parse(fs.readFileSync(path.join(projectRoot, relativePath), "utf8")),
]));

function baseConfig(overrides = {}) {
  return {
    seed: "debug-check",
    birthYear: 1978,
    targetAge: 3,
    targetPoint: "first",
    mortality: false,
    routePreset: "balanced",
    familyPreset: "natural",
    pressurePreset: "ordinary",
    randomMode: "normal",
    forcedEventId: null,
    ...overrides,
  };
}

const reached = [];
for (const age of DEBUG_KEY_AGES) {
  const outcome = replayDebugToTarget(data, baseConfig({
    seed: `debug-age-${age}`,
    targetAge: age,
    routePreset: age >= 16 ? "academic" : "balanced",
    familyPreset: age >= 30 ? "partnered_child" : "natural",
  }));
  assert.equal(outcome.result.status, "awaiting_choice", `${age}岁应停在可操作节点`);
  assert.equal(outcome.result.pendingDecision.age, age, `${age}岁调试跳转不能越过目标年龄`);
  assert.ok(outcome.report.steps <= 500);
  const inspectorReport = buildDebugReport(data, outcome.session, outcome.result, outcome.report);
  assert.equal(inspectorReport.mainline.quests.length, 3);
  assert.ok(inspectorReport.mainline.chapter.label.length > 0);
  assert.equal(outcome.session.debug.minimumSurvivalAge, age);
  const years = Object.values(outcome.result.stages)
    .flatMap((stage) => stage.annualRecords ?? [])
    .map((record) => record.calendarYear);
  assert.ok(years.includes(1978), `${age}岁调试档案必须保留出生年份记录`);
  if (age >= 3) assert.ok(Object.keys(outcome.result.currentState.interests ?? {}).length >= 1);
  if (age >= 30) {
    assert.ok(outcome.result.currentState.employment, `${age}岁需要可检查就业状态`);
    assert.ok(outcome.result.currentState.family, `${age}岁需要可检查家庭状态`);
  }
  reached.push({ age, stage: outcome.result.stage, kind: outcome.result.pendingDecision.kind });
}

const stageEventCatalog = debugStageEventCatalog(data);
assert.equal(stageEventCatalog.length, 32);
assert.equal(new Set(stageEventCatalog.map((entry) => entry.id)).size, 32);
for (const eventId of [
  "payoff_age6_someone_notices",
  "age_5_encounter_symbols",
  "primary_final_year_direction",
  "age16_next_direction",
  "vocational_final_year_connection",
  "first_child_decision",
  "retirement_transition",
]) {
  const eventOutcome = replayDebugToStageEvent(data, baseConfig({ seed: "debug-event-finder" }), eventId);
  assert.equal(eventOutcome.result.pendingDecision.eventId, eventId);
  assert.ok(eventOutcome.report.attempts >= 1);
  assert.ok(eventOutcome.report.searchedEvent.label);
}

const exactQuarter = replayDebugToTarget(data, baseConfig({
  seed: "debug-quarter",
  targetAge: 12,
  targetPoint: "q3",
}));
assert.equal(exactQuarter.result.pendingDecision.age, 12);
assert.ok((exactQuarter.result.pendingDecision.quarter ?? 4) >= 3);

const yearlyReview = replayDebugToTarget(data, baseConfig({
  seed: "debug-review",
  targetAge: 6,
  targetPoint: "review",
}));
assert.equal(yearlyReview.result.pendingDecision.kind, "year_review");
assert.equal(yearlyReview.result.pendingDecision.age, 6);

const forced = replayDebugToTarget(data, baseConfig({
  seed: "debug-forced-event",
  targetAge: 3,
  targetPoint: "review",
  randomMode: "forced",
  forcedEventId: "found_small_creature",
}));
assert.ok(
  forced.result.currentState.randomEventHistory.some((entry) => entry.eventId === "found_small_creature"),
  "符合条件的指定随机事件必须在目标年度出现",
);

const ineligible = replayDebugToTarget(data, baseConfig({
  seed: "debug-ineligible-event",
  targetAge: 3,
  targetPoint: "first",
  randomMode: "forced",
  forcedEventId: "coworker_after_work_invitation",
}));
const ineligibleReport = buildDebugReport(data, ineligible.session, ineligible.result);
const coworkerDiagnosis = ineligibleReport.randomEventDiagnostics.find(
  (entry) => entry.id === "coworker_after_work_invitation",
);
assert.equal(coworkerDiagnosis.eligible, false);
assert.ok(coworkerDiagnosis.reasons.some((reason) => reason.includes("年龄") || reason.includes("阶段")));

const frequent = replayDebugToTarget(data, baseConfig({
  seed: "debug-frequent-event",
  targetAge: 12,
  targetPoint: "review",
  randomMode: "frequent",
}));
assert.ok(frequent.result.currentState.randomEventHistory.length >= 2);

const futureOnlyBase = replayDebugToTarget(data, baseConfig({
  seed: "debug-future-random",
  targetAge: 12,
  targetPoint: "review",
  randomMode: "normal",
}));
const futureOnlySession = structuredClone(futureOnlyBase.session);
futureOnlySession.debug.randomEvents = {
  mode: "frequent",
  forcedEventId: null,
  activationYear: 1978 + 13,
  activationQuarter: 1,
};
const replayedBeforeActivation = runLifeSession(data, futureOnlySession, { autoChoose: false });
assert.equal(replayedBeforeActivation.pendingDecision.eventId, futureOnlyBase.result.pendingDecision.eventId);
assert.deepEqual(
  replayedBeforeActivation.currentState.randomEventHistory,
  futureOnlyBase.result.currentState.randomEventHistory,
  "运行中开启高频或指定事件不能改写激活节点以前的历史",
);

const academic = replayDebugToTarget(data, baseConfig({
  seed: "debug-route-compare",
  targetAge: 18,
  routePreset: "academic",
}));
const earlyWork = replayDebugToTarget(data, baseConfig({
  seed: "debug-route-compare",
  targetAge: 18,
  routePreset: "early_work",
}));
assert.notDeepEqual(
  academic.session.choices,
  earlyWork.session.choices,
  "教育就业预设必须通过不同的正常选择形成不同前史",
);

const partnered = replayDebugToTarget(data, baseConfig({
  seed: "debug-family-compare",
  targetAge: 40,
  familyPreset: "partnered_child",
}));
assert.equal(partnered.session.choices.adult.partnership_decision, "partnership_commit");
assert.equal(partnered.session.choices.adult.first_child_decision, "child_try");
assert.ok(partnered.result.currentState.family.partner);

const independent = replayDebugToTarget(data, baseConfig({
  seed: "debug-family-compare",
  targetAge: 40,
  familyPreset: "independent",
}));
assert.equal(independent.session.choices.adult.partnership_decision, "partnership_remain_independent");
assert.equal(Boolean(independent.result.currentState.family.partner), false);

const nextNode = advanceDebugSession(
  data,
  yearlyReview.session,
  yearlyReview.result,
  baseConfig({ targetAge: 6 }),
  "node",
);
assert.equal(nextNode.report.steps, 1);
assert.notEqual(nextNode.result.pendingDecision.eventId, yearlyReview.result.pendingDecision.eventId);
assert.equal(nextDebugKeyAge(3), 5);
assert.equal(nextDebugKeyAge(75), "ending");

const ending = replayDebugToTarget(data, baseConfig({
  seed: "debug-ending",
  targetAge: "ending",
}));
assert.equal(ending.result.status, "completed");
assert.ok(ending.result.lifeReview.ageAtDeath >= 16);

const report = buildDebugReport(data, partnered.session, partnered.result, { test: true });
assert.equal(report.debugSchemaVersion, 1);
assert.ok(report.contentCoverage.annualActivities >= 50);
assert.ok(report.contentCoverage.childhoodActivities >= 50);
assert.equal(report.contentCoverage.childhoodGrowthPaths, 6);
assert.equal(report.contentCoverage.childhoodMilestones, 18);
assert.ok(report.contentCoverage.randomEvents >= 15);
assert.ok(report.contentCoverage.stageEvents >= 20);
assert.ok(report.stageCoverage.adult.count >= 1);
assert.equal(report.extra.test, true);

console.log(JSON.stringify({
  ok: true,
  keyAgeCount: DEBUG_KEY_AGES.length,
  reached,
  forcedEventHistoryCount: forced.result.currentState.randomEventHistory.length,
  frequentEventHistoryCount: frequent.result.currentState.randomEventHistory.length,
  endingAge: ending.result.lifeReview.ageAtDeath,
  checks: [
    "all_key_ages_reached_with_continuous_history",
    "exact_quarter_and_year_review_targets",
    "adult_survival_suppressed_only_until_debug_target",
    "forced_eligible_random_event",
    "ineligible_event_reason_diagnostics",
    "frequent_random_event_mode",
    "runtime_random_debug_mode_is_future_only",
    "education_and_work_route_presets",
    "partnered_child_and_independent_family_presets",
    "single_node_advance_and_next_key_age",
    "complete_life_ending_target",
    "critical_event_catalog_and_legal_history_finder",
    "exportable_debug_report_content",
    "life_mainline_chapter_direction_and_quest_report",
  ],
}, null, 2));
