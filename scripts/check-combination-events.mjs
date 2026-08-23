import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { diagnoseRandomEvents } from "../src/simulation/quarterly-random-event-system.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const content = JSON.parse(fs.readFileSync(path.join(projectRoot, "data", "quarterly_life_content.json"), "utf8"));
const ids = content.randomEvents.map((event) => event.id);
assert.equal(new Set(ids).size, ids.length);
assert.ok(content.randomEvents.length >= 26);

const diagnosisFor = (context) => new Map(
  diagnoseRandomEvents(content, {
    residence: "urban",
    path: null,
    educationStatus: null,
    employmentStatus: null,
    relationshipStatus: "single",
    hasChild: false,
    olderParentCount: 0,
    selectedCategories: [],
    ...context,
  }, []).map((entry) => [entry.id, entry]),
);

const teen = diagnosisFor({ stage: "adolescence", age: 14, calendarYear: 1992 });
assert.equal(teen.get("adolescent_body_changes_notice").eligible, true);
assert.equal(teen.get("friend_may_move_away").eligible, true);
assert.equal(teen.get("work_family_same_evening").eligible, false);

const sandwichFamily = diagnosisFor({
  stage: "adult",
  age: 45,
  calendarYear: 2023,
  employmentStatus: "employed",
  relationshipStatus: "partnered",
  hasChild: true,
  olderParentCount: 1,
  selectedCategories: ["work", "family"],
});
for (const eventId of [
  "work_family_same_evening",
  "workplace_orders_slow_down",
  "parents_and_child_need_help_together",
  "partner_asks_for_real_time",
]) assert.equal(sandwichFamily.get(eventId).eligible, true, `${eventId} 应在组合事实成立时可触发`);

const singleUnemployed = diagnosisFor({
  stage: "adult",
  age: 45,
  calendarYear: 2023,
  employmentStatus: "unemployed_searching",
  relationshipStatus: "single",
  hasChild: false,
  olderParentCount: 1,
});
assert.equal(singleUnemployed.get("work_family_same_evening").eligible, false);
assert.equal(singleUnemployed.get("workplace_orders_slow_down").eligible, false);
assert.equal(singleUnemployed.get("parents_and_child_need_help_together").eligible, false);
assert.equal(singleUnemployed.get("partner_asks_for_real_time").eligible, false);

for (const eventId of [
  "adolescent_body_changes_notice",
  "friend_may_move_away",
  "work_family_same_evening",
  "workplace_orders_slow_down",
  "parents_and_child_need_help_together",
  "partner_asks_for_real_time",
]) {
  const event = content.randomEvents.find((entry) => entry.id === eventId);
  assert.ok(event.scene.length >= 20);
  assert.ok(event.options.length >= 3);
  assert.ok(event.options.every((option) => option.label && option.description));
}

console.log(JSON.stringify({
  ok: true,
  randomEventCount: content.randomEvents.length,
  checks: [
    "adolescent_body_and_friend_change_events",
    "employment_child_and_parent_combination_eligibility",
    "partner_relationship_condition",
    "ineligible_combination_diagnostics",
    "choice_tradeoffs_and_concrete_scenes",
  ],
}, null, 2));
