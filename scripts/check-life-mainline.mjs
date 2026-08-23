import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DATA_FILES } from "../src/game/load-game-data.mjs";
import {
  applySessionChoice,
  createGameSession,
  runLifeSession,
} from "../src/game/game-engine.mjs";
import { presentGame } from "../src/game/presenter.mjs";
import {
  buildLifeMainline,
  lifeMainlineTimelineEntries,
} from "../src/simulation/life-mainline-system.mjs";
import { replayDebugToTarget } from "../src/game/debug-tools.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = Object.fromEntries(Object.entries(DATA_FILES).map(([key, relativePath]) => [
  key,
  JSON.parse(fs.readFileSync(path.join(projectRoot, relativePath), "utf8")),
]));

const chapterAtAge = new Map([
  [1, "first_world"],
  [7, "school_and_home"],
  [13, "choosing_a_direction"],
  [18, "entering_society"],
  [30, "building_a_life"],
  [45, "keeping_and_changing"],
  [60, "later_years"],
  [75, "later_years"],
]);

const reached = [];
for (const [age, chapterId] of chapterAtAge) {
  const outcome = replayDebugToTarget(data, {
    seed: `mainline-age-${age}`,
    birthYear: 1978,
    targetAge: age,
    targetPoint: "first",
    mortality: false,
    routePreset: age >= 16 ? "academic" : "balanced",
    familyPreset: age >= 30 ? "partnered_child" : "natural",
    pressurePreset: "ordinary",
    randomMode: "normal",
    forcedEventId: null,
  });
  const mainline = buildLifeMainline(outcome.result);
  const view = presentGame(outcome.result, data);
  assert.equal(mainline.chapter.id, chapterId, `${age}岁应进入正确人生章节`);
  assert.deepEqual(mainline.quests.map((quest) => quest.type), ["survival", "development", "aspiration"]);
  assert.ok(mainline.quests.every((quest) => (
    quest.metrics.length >= 2
    && quest.progress >= 0
    && quest.progress <= 100
    && quest.nextHint.length > 0
  )));
  assert.equal(mainline.directions.length, 6);
  assert.ok(mainline.directions.every((direction, index, entries) => (
    index === 0 || entries[index - 1].score >= direction.score
  )));
  assert.equal(mainline.completedChapters.length, [...chapterAtAge.values()]
    .filter((id, index, ids) => ids.indexOf(id) === index)
    .filter((id) => {
      const chapter = mainline.completedChapters.find((entry) => entry.id === id);
      return chapter != null;
    }).length);
  assert.equal(view.mainline.chapter.id, chapterId);
  if (view.pending?.kind === "quarter_plan") {
    const actionable = view.pending.options.filter((option) => !option.isPlanControl && option.available !== false);
    assert.ok(actionable.some((option) => option.effects.mainline.length > 0));
  }
  reached.push({ age, chapter: mainline.chapter.label, direction: mainline.primaryDirection.label });
}

function choosePlan(pending, preferredInterests) {
  const available = pending.options.filter((option) => option.available !== false && !option.isPlanControl);
  const ranked = [...available].sort((left, right) => {
    const leftMatch = (left.interestTags ?? []).some((id) => preferredInterests.includes(id)) ? 1 : 0;
    const rightMatch = (right.interestTags ?? []).some((id) => preferredInterests.includes(id)) ? 1 : 0;
    return rightMatch - leftMatch;
  });
  const chosen = [];
  let hours = 0;
  let cash = 0;
  for (const option of ranked) {
    if (chosen.length >= pending.maxActivities) break;
    if (hours + option.timeUseHoursPerWeek > pending.weeklyDiscretionaryHours) continue;
    if (Number.isFinite(pending.availableCashYuan) && cash + (option.cashCostYuan ?? 0) > pending.availableCashYuan) continue;
    chosen.push(option.id);
    hours += option.timeUseHoursPerWeek;
    cash += option.cashCostYuan ?? 0;
    if (chosen.length >= pending.minActivities && (option.interestTags ?? []).some((id) => preferredInterests.includes(id))) break;
  }
  assert.ok(chosen.length >= pending.minActivities);
  return chosen.length === 1 && pending.minActivities === 1 ? chosen[0] : chosen;
}

function playToAge(seed, targetAge, preferredInterests) {
  let session = createGameSession({ seed, birthYear: 1978, mortality: false });
  for (let step = 0; step < 900; step += 1) {
    const result = runLifeSession(data, session);
    if (result.status === "completed" || (result.pendingDecision?.age ?? 0) >= targetAge) return result;
    const pending = result.pendingDecision;
    const choice = pending.kind === "quarter_plan"
      ? choosePlan(pending, preferredInterests)
      : pending.options.find((option) => option.available !== false).id;
    session = applySessionChoice(session, pending, choice);
  }
  throw new Error("人生主线分支重放超过安全步数");
}

const knowledgeBranch = buildLifeMainline(playToAge(
  "mainline-controlled-branch",
  12,
  ["reading_language", "numbers_logic", "nature_observation"],
));
const relationshipBranch = buildLifeMainline(playToAge(
  "mainline-controlled-branch",
  12,
  ["social_organizing"],
));
const knowledgeScore = knowledgeBranch.directions.find((entry) => entry.id === "understanding").score;
const relationshipKnowledgeScore = relationshipBranch.directions.find((entry) => entry.id === "understanding").score;
const relationshipScore = relationshipBranch.directions.find((entry) => entry.id === "belonging").score;
const knowledgeRelationshipScore = knowledgeBranch.directions.find((entry) => entry.id === "belonging").score;
assert.ok(knowledgeScore > relationshipKnowledgeScore, "持续求知行为应提高理解与求知方向");
assert.ok(relationshipScore > knowledgeRelationshipScore, "持续交往行为应提高关系与共同生活方向");

const ending = runLifeSession(
  data,
  createGameSession({ seed: "mainline-ending", birthYear: 1978, mortality: false }),
  { autoChoose: true },
);
const endingMainline = buildLifeMainline(ending);
assert.equal(ending.status, "completed");
assert.ok(endingMainline.ending);
assert.ok(endingMainline.ending.kept.length >= 1);
assert.ok(endingMainline.completedChapters.length >= 6);
assert.ok(endingMainline.youthPayoffReview);
assert.equal(endingMainline.youthPayoffReview.opportunityCount, 5);
assert.equal(
  lifeMainlineTimelineEntries(endingMainline).length,
  endingMainline.completedChapters.length + 1,
);
assert.ok(endingMainline.completedChapters.every((chapter) => chapter.evidence.length >= 4));

console.log(JSON.stringify({
  ok: true,
  reached,
  controlledBranches: {
    knowledgeScore,
    relationshipKnowledgeScore,
    relationshipScore,
    knowledgeRelationshipScore,
  },
  endingDirection: endingMainline.primaryDirection.label,
  completedChapterCount: endingMainline.completedChapters.length,
  checks: [
    "seven_age_based_life_chapters",
    "survival_development_and_aspiration_quests",
    "fact_backed_progress_metrics",
    "action_cards_link_to_current_mainline",
    "repeated_behavior_changes_emergent_direction",
    "completed_chapter_causal_reviews",
    "ending_kept_and_laid_down_review",
    "mainline_timeline_entries",
    "age_18_causal_payoff_review",
  ],
}, null, 2));
