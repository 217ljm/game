import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DATA_FILES } from "../src/game/load-game-data.mjs";
import { buildTimeline, presentGame } from "../src/game/presenter.mjs";
import {
  buildChildhoodPlayActivities,
  childGrowthLevel,
  settleChildQuarter,
} from "../src/simulation/childhood-play-system.mjs";
import { createSeededRandom } from "../src/simulation/random.mjs";
import { replayDebugToTarget } from "../src/game/debug-tools.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = Object.fromEntries(Object.entries(DATA_FILES).map(([key, relativePath]) => [
  key,
  JSON.parse(fs.readFileSync(path.join(projectRoot, relativePath), "utf8")),
]));
const content = { ...data.quarterlyLife, childhoodPlay: data.childhoodPlay };
const play = data.childhoodPlay;

assert.equal(play.schemaVersion, 1);
assert.equal(Object.keys(play.growthPaths).length, 6);
assert.equal(play.milestones.length, 18);
assert.ok(play.activityPools.length >= 7);
const allOptions = play.activityPools.flatMap((pool) => pool.options);
assert.ok(allOptions.length >= 50);
assert.equal(new Set(allOptions.map((option) => option.id)).size, allOptions.length);
for (const option of allOptions) {
  assert.ok(option.id && option.label && option.description);
  assert.ok(option.hoursPerWeek > 0 && option.hoursPerWeek <= 12);
  assert.ok(option.category && option.interestTags?.length > 0);
  assert.ok(Object.keys(option.growthChanges ?? {}).length > 0);
  assert.ok(option.experience?.actorRole);
  assert.ok(option.experience?.process?.length >= 3);
  assert.ok(option.experience?.responses?.length >= 2);
  assert.ok(option.experience?.outcomes?.length >= 2);
  for (const pathId of Object.keys(option.growthChanges ?? {})) assert.ok(play.growthPaths[pathId]);
  for (const pathId of Object.keys(option.requiresGrowth ?? {})) assert.ok(play.growthPaths[pathId]);
}

const fakeState = {
  seed: "child-play-unit",
  personId: "person-unit",
  birthYear: 1978,
  residence: "urban",
  household: {
    members: [
      { id: "mother", relation: "mother" },
      { id: "father", relation: "father" },
    ],
  },
  socialNetwork: [],
  childhoodGrowth: null,
};
const makeRecord = (quarter) => ({
  calendarYear: 1981,
  age: 3,
  facts: [{ type: "child_illness_year_summary", symptomDays: 2 }],
  quarter,
});
const addFact = (record, type, payload) => {
  const fact = { id: `fact-${record.facts.length + 1}`, type, ...payload };
  record.facts.push(fact);
  return fact;
};
const preschool = buildChildhoodPlayActivities(content, fakeState, {
  stage: "childhood",
  age: 3,
  calendarYear: 1981,
  residence: "urban",
});
assert.ok(preschool.length >= 8);
const lockedStory = preschool.find((option) => option.id === "child_make_longer_story");
assert.equal(lockedStory.available, false);
assert.match(lockedStory.unavailableReason, /兴趣与探索/);
const baseActivities = preschool
  .filter((option) => ["child_imagination_world", "child_running_game"].includes(option.id))
  .map((option) => ({
    ...option,
    categoryLabel: data.quarterlyLife.categories[option.category],
    hoursPerWeek: option.hoursPerWeek,
    plannedHours: option.hoursPerWeek * 13,
    cashCostYuan: 0,
  }));
let reachedMilestones = [];
for (let quarter = 1; quarter <= 4; quarter += 1) {
  const record = makeRecord(quarter);
  const outcome = settleChildQuarter({
    state: fakeState,
    record,
    content,
    stage: "childhood",
    quarter,
    plan: { activities: baseActivities },
    context: { age: 3, calendarYear: 1981, residence: "urban" },
    socialCatalog: data.socialCharacters,
    random: createSeededRandom(`child-play-unit:${quarter}`),
    addFact,
  });
  assert.equal(outcome.results.length, 2);
  for (const result of outcome.results) {
    assert.ok(result.actor.name);
    assert.ok(result.setting && result.process.length >= 3);
    assert.ok(result.actualHours > 0 && result.actualHours <= result.plannedHours * 1.05);
    assert.ok(result.response && result.outcome);
  }
  reachedMilestones.push(...outcome.milestones.map((entry) => entry.id));
}
assert.ok(reachedMilestones.includes("exploration_first_question"));
assert.ok(reachedMilestones.includes("peer_known_face"));
assert.ok(fakeState.childhoodGrowth.memories.length >= 4);
assert.ok(fakeState.socialNetwork.some((person) => (
  person.roleId === "neighborhood_friend"
  && person.sharedMemories.length >= 1
  && Number.isFinite(person.trust)
)));
const unlockedPreschool = buildChildhoodPlayActivities(content, fakeState, {
  stage: "childhood",
  age: 3,
  calendarYear: 1981,
  residence: "urban",
});
assert.equal(unlockedPreschool.find((option) => option.id === "child_make_longer_story").available, true);
assert.equal(childGrowthLevel(0).id, "not_started");
assert.equal(childGrowthLevel(4).id, "started");
assert.equal(childGrowthLevel(12).id, "developing");
assert.equal(childGrowthLevel(24).id, "established");

const lower = buildChildhoodPlayActivities(content, fakeState, {
  stage: "primary",
  age: 8,
  calendarYear: 1986,
  residence: "urban",
  educationStatus: "enrolled_primary",
  grade: 2,
});
assert.ok(lower.some((option) => option.id === "primary_read_aloud_daily"));
assert.ok(!lower.some((option) => option.id === "primary_keep_question_notebook"));
const middle = buildChildhoodPlayActivities(content, fakeState, {
  stage: "primary",
  age: 9,
  calendarYear: 1987,
  residence: "urban",
  educationStatus: "enrolled_primary",
  grade: 3,
});
assert.ok(middle.some((option) => option.id === "primary_keep_question_notebook"));
assert.ok(!middle.some((option) => option.id === "primary_upper_plan_study"));
const twelve = buildChildhoodPlayActivities(content, fakeState, {
  stage: "adolescence",
  age: 12,
  calendarYear: 1990,
  residence: "urban",
  path: "junior_student",
});
assert.ok(twelve.some((option) => option.id === "age12_keep_close_friend"));

const replay = replayDebugToTarget(data, {
  seed: "child-play-full-replay",
  birthYear: 1978,
  targetAge: 12,
  targetPoint: "review",
  mortality: false,
  routePreset: "balanced",
  familyPreset: "natural",
  pressurePreset: "ordinary",
  randomMode: "normal",
  forcedEventId: null,
});
const childhoodRecords = replay.result.stages.childhood.annualRecords.filter((record) => record.age >= 3);
const primaryRecords = replay.result.stages.primary?.annualRecords ?? [];
const adolescenceRecords = replay.result.stages.adolescence?.annualRecords ?? [];
const playableRecords = [...childhoodRecords, ...primaryRecords, ...adolescenceRecords]
  .filter((record) => record.age >= 3 && record.age <= 12 && record.quarterRecords?.length === 4);
assert.ok(playableRecords.length >= 8);
assert.ok(playableRecords.every((record) => record.quarterRecords.every((quarter) => (
  quarter.activityResults?.length >= 1
  && quarter.activityResults.every((result) => result.sourceFactId && result.process.length >= 3)
))));
const schoolFacts = primaryRecords.flatMap((record) => record.facts)
  .filter((fact) => fact.type === "primary_school_year_attendance_and_learning");
assert.ok(schoolFacts.length >= 1);
assert.ok(schoolFacts.every((fact) => Number.isFinite(fact.childhoodGrowthLearningBonus)));
assert.ok(schoolFacts.some((fact) => fact.childhoodGrowthLearningBonus > 0));
assert.ok(replay.result.currentState.childhoodGrowth?.activityHistory.length > 20);
assert.ok(replay.result.currentState.childhoodGrowth?.reachedMilestoneIds.length >= 3);
assert.ok(replay.result.currentState.socialNetwork.some((person) => person.sharedMemories?.length > 0));

const view = presentGame(replay.result, data);
assert.ok(view.childhoodExperience?.results.length >= 1);
assert.ok(view.childhoodGrowth.length >= 2);
assert.ok(view.childhoodMemories.length >= 1);
const timeline = buildTimeline(replay.result);
assert.ok(timeline.some((entry) => entry.quarter && /实际经历/.test(entry.text)));
assert.ok(timeline.some((entry) => /成长节点/.test(entry.text)));

console.log(JSON.stringify({
  ok: true,
  activityPoolCount: play.activityPools.length,
  activityCount: allOptions.length,
  growthPathCount: Object.keys(play.growthPaths).length,
  milestoneCount: play.milestones.length,
  replayedPlayableYears: playableRecords.length,
  activityHistoryCount: replay.result.currentState.childhoodGrowth.activityHistory.length,
  reachedMilestoneCount: replay.result.currentState.childhoodGrowth.reachedMilestoneIds.length,
  recurringPeopleWithSharedMemories: replay.result.currentState.socialNetwork
    .filter((person) => person.sharedMemories?.length > 0).length,
  checks: [
    "content_schema_and_unique_activity_ids",
    "age_stage_school_status_and_grade_pools",
    "locked_activity_becomes_available_from_prior_growth",
    "quarter_process_actor_actual_hours_response_and_outcome",
    "six_growth_paths_and_eighteen_milestones",
    "named_recurring_childhood_people_and_shared_memories",
    "continuous_age_3_to_12_replay",
    "childhood_growth_feeds_primary_learning_calculation",
    "presenter_growth_experience_memory_and_timeline_surfaces"
  ]
}, null, 2));
