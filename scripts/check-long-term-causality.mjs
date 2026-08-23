import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGameSession, runLifeSession } from "../src/game/game-engine.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

function branchWith(
  operationId,
  {
    seed = "long-term-causality-a",
    forcePartner = false,
    years = [2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014],
  } = {},
) {
  const session = createGameSession({
    seed,
    birthYear: 1980,
    mortality: false,
  });
  if (forcePartner) session.choices.adult.partnership_decision = "partnership_commit";
  const companionId = operationId === "adult_invest_in_work"
    ? "adult_save_and_plan"
    : "adult_invest_in_work";
  for (const year of years) assignWholeYear(session, year, [operationId, companionId]);
  return runLifeSession(data, session, { autoChoose: true });
}

function assignWholeYear(session, year, activityIds) {
  for (let quarter = 1; quarter <= 4; quarter += 1) {
    session.quarterPlans[`quarter:${year}:Q${quarter}`] = {
      activityIds: [...activityIds],
      controlMode: "select",
    };
  }
}

function adultRecord(result, year) {
  const record = result.stages.adult.annualRecords.find((entry) => entry.calendarYear === year);
  assert.ok(record, `缺少${year}年成年记录`);
  return record;
}

const savingLife = branchWith("adult_save_and_plan");
const relationshipLife = branchWith("adult_maintain_relationships");
const partneredSavingLife = branchWith("adult_save_and_plan", {
  seed: "relationship-causality",
  forcePartner: true,
});
const partneredRelationshipLife = branchWith("adult_maintain_relationships", {
  seed: "relationship-causality",
  forcePartner: true,
});
assert.equal(savingLife.status, "completed");
assert.equal(relationshipLife.status, "completed");

const checkpointYears = [2015, 2016, 2017, 2018, 2019, 2020];
const checkpointYear = checkpointYears.find((year) => (
  adultRecord(savingLife, year).endState.netWorthYuan
    !== adultRecord(relationshipLife, year).endState.netWorthYuan
)) ?? 2020;
const savingCheckpoint = adultRecord(savingLife, checkpointYear).endState;
const relationshipCheckpoint = adultRecord(relationshipLife, checkpointYear).endState;
const savingRelationshipCheckpoint = adultRecord(partneredSavingLife, 2016).endState;
const relationshipRelationshipCheckpoint = adultRecord(partneredRelationshipLife, 2016).endState;
assert.ok(savingCheckpoint.savingRateAdjustment > relationshipCheckpoint.savingRateAdjustment);
assert.notEqual(
  savingCheckpoint.netWorthYuan,
  relationshipCheckpoint.netWorthYuan,
  "连续储蓄与关系安排应在选择结束数年后的净资产上留下可计算差异",
);
assert.ok(
  (relationshipRelationshipCheckpoint.relationshipQuality ?? 0)
    > (savingRelationshipCheckpoint.relationshipQuality ?? 0),
  "连续维持关系应在选择结束数年后的伴侣关系质量上留下差异",
);
assert.ok(
  savingLife.stages.adult.annualRecords.some((record) =>
    record.facts.some((fact) => (
      fact.type === "annual_operation_echo" && fact.domain === "finance"
    ))
  ),
  "储蓄选择应形成多年因果回响事实",
);
assert.ok(
  partneredRelationshipLife.stages.adult.annualRecords.some((record) =>
    record.facts.some((fact) => (
      fact.type === "annual_operation_echo" && fact.domain === "relationships"
    ))
  ),
  "关系选择应形成多年因果回响事实",
);

const resetSession = createGameSession({
  seed: "annual-routine-reset",
  birthYear: 1980,
  mortality: false,
});
assignWholeYear(resetSession, 2005, ["adult_support_family", "adult_save_and_plan"]);
assignWholeYear(resetSession, 2006, ["adult_invest_in_work", "adult_save_and_plan"]);
const resetLife = runLifeSession(data, resetSession, { autoChoose: true });
const supportYear = adultRecord(resetLife, 2005).endState;
const workYear = adultRecord(resetLife, 2006).endState;
assert.equal(supportYear.routine.familyCareHoursPerWeek, 12);
assert.equal(
  workYear.routine.familyCareHoursPerWeek,
  3,
  "上一年照护时间不能残留为下一年的隐形安排",
);
assert.equal(workYear.routine.workHoursDelta, 5);

console.log(JSON.stringify({
  ok: true,
  checkpointYear,
  savingBranchNetWorthYuan: savingCheckpoint.netWorthYuan,
  relationshipBranchNetWorthYuan: relationshipCheckpoint.netWorthYuan,
  savingBranchRelationshipQuality: savingRelationshipCheckpoint.relationshipQuality,
  relationshipBranchRelationshipQuality: relationshipRelationshipCheckpoint.relationshipQuality,
  checks: [
    "same_seed_controlled_quarter_choice_branches",
    "post_choice_net_worth_difference",
    "post_choice_relationship_difference",
    "multi_year_echo_facts",
    "annual_routine_resets_before_new_choice",
  ],
}, null, 2));
