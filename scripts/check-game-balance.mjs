import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGameSession, runLifeSession } from "../src/game/game-engine.mjs";
import { lifeStageQuarterCadence } from "../src/simulation/annual-operation-system.mjs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");
const readJson = (...segments) => JSON.parse(
  fs.readFileSync(path.join(projectRoot, ...segments), "utf8"),
);
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

const expectedCadence = new Map([
  [0, 1],
  [1, 2],
  [6, 3],
  [12, 5],
  [30, 5],
  [59, 5],
  [60, 3],
  [75, 3],
]);
for (const [age, expected] of expectedCadence) {
  const typicalInteractions = lifeStageQuarterCadence(age).interactiveQuarters.length + 1;
  assert.equal(typicalInteractions, expected, `${age}岁典型交互节奏不符合规范`);
  assert.ok(typicalInteractions <= 5);
}
const ages = Array.from({ length: 91 }, (_, age) => age);
const meanTypicalInteractions = ages.reduce(
  (sum, age) => sum + lifeStageQuarterCadence(age).interactiveQuarters.length + 1,
  0,
) / ages.length;
assert.ok(meanTypicalInteractions < 4.2);
assert.deepEqual(data.annualOperations.rules.automationModes, ["continue", "keep_year", "notify_only"]);

const result = runLifeSession(data, createGameSession({
  seed: "balance-auto-complete",
  birthYear: 1979,
  mortality: false,
}), { autoChoose: true });
assert.equal(result.status, "completed");
const quarterRecords = Object.values(result.stages)
  .flatMap((stage) => stage.annualRecords ?? [])
  .flatMap((record) => (record.quarterRecords ?? []).map((quarter) => ({
    ...quarter,
    calendarYear: record.calendarYear,
  })))
  .filter((quarter) => quarter.activityIds?.length > 0)
  .sort((left, right) => left.calendarYear - right.calendarYear || left.quarter - right.quarter);
let comparablePairs = 0;
let identicalPairs = 0;
let repeatedActivitySlots = 0;
let comparedActivitySlots = 0;
for (let index = 1; index < quarterRecords.length; index += 1) {
  const previous = new Set(quarterRecords[index - 1].activityIds);
  const current = new Set(quarterRecords[index].activityIds);
  comparablePairs += 1;
  if (previous.size === current.size && [...previous].every((id) => current.has(id))) identicalPairs += 1;
  comparedActivitySlots += current.size;
  repeatedActivitySlots += [...current].filter((id) => previous.has(id)).length;
}
const identicalAdjacentQuarterShare = identicalPairs / Math.max(1, comparablePairs);
const repeatedActivityShare = repeatedActivitySlots / Math.max(1, comparedActivitySlots);
assert.ok(quarterRecords.length >= 200);
assert.ok(identicalAdjacentQuarterShare < 0.55, `自动人生相邻季度完全重复率过高：${identicalAdjacentQuarterShare}`);
assert.ok(repeatedActivityShare < 0.8, `自动人生行动槽重复率过高：${repeatedActivityShare}`);

const decisionCount = result.lifeReview.decisionCount;
const livedYears = result.lifeReview.ageAtDeath + 1;
const averageChoicesPerYear = decisionCount / livedYears;
assert.ok(averageChoicesPerYear <= 6);
assert.ok(data.annualOperations.bands.length >= 15);
assert.ok(data.annualOperations.bands.reduce((sum, band) => sum + band.options.length, 0) >= 97);
assert.ok(data.quarterlyLife.randomEvents.length >= 26);

console.log(JSON.stringify({
  ok: true,
  meanTypicalInteractions: Math.round(meanTypicalInteractions * 100) / 100,
  automaticLife: {
    ageAtDeath: result.lifeReview.ageAtDeath,
    decisionCount,
    averageChoicesPerYear: Math.round(averageChoicesPerYear * 100) / 100,
    quarterRecordCount: quarterRecords.length,
    identicalAdjacentQuarterShare: Math.round(identicalAdjacentQuarterShare * 1000) / 1000,
    repeatedActivityShare: Math.round(repeatedActivityShare * 1000) / 1000,
  },
  checks: [
    "age_specific_typical_interactions_at_or_below_five",
    "whole_life_mean_typical_interactions_below_4_2",
    "three_click_reduction_automation_modes",
    "automatic_complete_life_content_repetition_thresholds",
    "whole_life_average_choice_count_at_or_below_six_per_year",
    "minimum_action_band_operation_and_event_content_counts",
  ],
}, null, 2));
