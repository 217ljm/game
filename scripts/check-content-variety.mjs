import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyActivityRepetitionMetadata } from "../src/simulation/quarterly-life-system.mjs";
import { diagnoseRandomEvents } from "../src/simulation/quarterly-random-event-system.mjs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");
const content = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "data", "quarterly_life_content.json"), "utf8"),
);

const activities = [
  { id: "routine_action", label: "普通行动", available: true, autoWeight: 1 },
  { id: "fresh_action", label: "新行动", available: true, autoWeight: 1 },
  { id: "returning_action", label: "隔季行动", available: true, autoWeight: 1 },
  { id: "continue_interest_reading_language", label: "继续阅读爱好", available: true, autoWeight: 1.2 },
];
const annotated = applyActivityRepetitionMetadata(activities, {
  priorDecisions: [{
    decisionKind: "annual_operation",
    calendarYear: 1999,
    quarterOperations: [
      { quarter: 1, activityIds: ["routine_action", "returning_action"] },
      { quarter: 2, activityIds: ["routine_action"] },
    ],
  }],
  quarterRecords: [{ quarter: 3, activityIds: ["routine_action"] }],
});
const byId = new Map(annotated.map((entry) => [entry.id, entry]));
assert.equal(byId.get("routine_action").repetitionStatus, "established_routine");
assert.equal(byId.get("routine_action").consecutiveQuarters, 3);
assert.equal(byId.get("routine_action").available, true, "重复行动必须仍可由玩家选择");
assert.equal(byId.get("routine_action").repetitionDoesNotBlockSelection, true);
assert.ok(byId.get("routine_action").recommendationScore < byId.get("fresh_action").recommendationScore);
assert.equal(byId.get("fresh_action").repetitionLabel, "本季新可能");
assert.equal(byId.get("returning_action").repetitionLabel, "隔季再做");
assert.equal(byId.get("continue_interest_reading_language").repetitionStatus, "interest_continuation");
assert.equal(byId.get("continue_interest_reading_language").repetitionLabel, "爱好延续");
assert.ok(byId.get("continue_interest_reading_language").recommendationScore > 1.2);

const eventContext = {
  stage: "childhood",
  age: 6,
  calendarYear: 1982,
  residence: "urban",
  selectedCategories: ["exploration"],
};
const recentHistory = [{ eventId: "found_small_creature", calendarYear: 1980 }];
const cooling = diagnoseRandomEvents(content, eventContext, recentHistory)
  .find((event) => event.id === "found_small_creature");
assert.equal(cooling.eligible, false);
assert.ok(cooling.reasons.some((reason) => reason.includes("冷却期")));
const cooledDown = diagnoseRandomEvents(
  content,
  { ...eventContext, calendarYear: 1986 },
  recentHistory,
).find((event) => event.id === "found_small_creature");
assert.equal(cooledDown.eligible, true);

console.log(JSON.stringify({
  ok: true,
  checks: [
    "ordinary_repetition_lowers_recommendation_without_blocking_choice",
    "new_and_returning_actions_receive_distinct_player_facing_labels",
    "interest_continuation_remains_a_positive_recommendation",
    "random_event_cooldown_blocks_short_term_repetition_and_expires",
  ],
}, null, 2));
