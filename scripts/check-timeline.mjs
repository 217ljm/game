import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const timeline = JSON.parse(fs.readFileSync(
  path.join(projectRoot, "data", "calibration", "timeline_1978_2026.json"),
  "utf8",
));
const sourceIds = new Set(timeline.sources.map((source) => source.id));
const periodIds = new Set();

assert.equal(timeline.schemaVersion, 1);
assert.ok(timeline.eraPeriods.length >= 8);
for (const period of timeline.eraPeriods) {
  assert.ok(!periodIds.has(period.id), `时代时期ID重复：${period.id}`);
  periodIds.add(period.id);
  assert.ok(Number.isInteger(period.startYear) && Number.isInteger(period.endYear));
  assert.ok(period.startYear <= period.endYear);
  assert.ok(period.label && period.description);
  assert.ok(period.sourceIds.length > 0);
  assert.ok(period.sourceIds.every((sourceId) => sourceIds.has(sourceId)));
}

for (let year = timeline.scope.historicalStartYear; year <= timeline.scope.historicalDataThrough; year += 1) {
  const matching = timeline.eraPeriods.filter((period) => (
    year >= period.startYear && year <= period.endYear
  ));
  assert.equal(matching.length, 1, `${year}年必须且只能匹配一个时代时期`);
}
for (const milestone of timeline.policyMilestones) {
  assert.ok(sourceIds.has(milestone.sourceId), `时代节点引用未知来源：${milestone.id}`);
}
assert.ok(!timeline.eraPeriods.some((period) => period.endYear > 2025));

console.log(JSON.stringify({
  ok: true,
  eraPeriodCount: timeline.eraPeriods.length,
  historicalYearCoverage: timeline.scope.historicalDataThrough
    - timeline.scope.historicalStartYear + 1,
  policyMilestoneCount: timeline.policyMilestones.length,
  checks: [
    "official_source_references",
    "continuous_non_overlapping_historical_periods",
    "policy_milestone_sources",
    "no_scenario_year_presented_as_history",
  ],
}, null, 2));
