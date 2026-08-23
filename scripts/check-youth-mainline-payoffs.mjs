import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { routeForPending, ROUTES } from "../src/app/routes.mjs";
import { DATA_FILES } from "../src/game/load-game-data.mjs";
import {
  applySessionChoice,
  createGameSession,
  runLifeSession,
} from "../src/game/game-engine.mjs";
import { presentGame } from "../src/game/presenter.mjs";
import { buildLifeMainline } from "../src/simulation/life-mainline-system.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = Object.fromEntries(Object.entries(DATA_FILES).map(([key, relativePath]) => [
  key,
  JSON.parse(fs.readFileSync(path.join(projectRoot, relativePath), "utf8")),
]));

const expectedEventIds = data.youthMainlinePayoffs.events.map((event) => event.id);
const directionActivities = Object.fromEntries(Object.entries(data.youthMainlinePayoffs.directions)
  .map(([id, direction]) => [id, direction.activityId]));

function chooseQuarterPlan(pending, preferredActivityId = null) {
  const available = pending.options.filter((option) => option.available !== false && !option.isPlanControl);
  const ranked = [...available].sort((left, right) => (
    Number(right.id === preferredActivityId) - Number(left.id === preferredActivityId)
  ));
  const selected = [];
  let hours = 0;
  let cash = 0;
  for (const option of ranked) {
    if (selected.length >= pending.maxActivities) break;
    const optionHours = option.timeUseHoursPerWeek ?? 0;
    const optionCash = option.cashCostYuan ?? 0;
    if (hours + optionHours > pending.weeklyDiscretionaryHours) continue;
    if (Number.isFinite(pending.availableCashYuan) && cash + optionCash > pending.availableCashYuan) continue;
    selected.push(option.id);
    hours += optionHours;
    cash += optionCash;
    if (selected.length >= pending.minActivities && selected.includes(preferredActivityId)) break;
  }
  assert.ok(selected.length >= pending.minActivities, `${pending.eventId}应有合法季度行动组合`);
  return selected;
}

let session = createGameSession({
  seed: "youth-mainline-payoff-check",
  birthYear: 1978,
  mortality: false,
});
let result = null;
const seenEvents = [];
const selectedPayoffOptions = [];
const followedActivities = new Set();
const pendingFollowThrough = new Set();
let unavailableOptionCount = 0;

for (let step = 0; step < 700; step += 1) {
  result = runLifeSession(data, session, { autoChoose: false });
  if (result.status === "completed") break;
  const pending = result.pendingDecision;
  if (seenEvents.length === expectedEventIds.length && pending.age >= 18) break;

  let choice;
  if (pending.kind === "mainline_event") {
    assert.equal(routeForPending(pending), ROUTES.RANDOM_EVENT);
    assert.equal(pending.age, data.youthMainlinePayoffs.events.find((event) => event.id === pending.eventId).age);
    assert.ok(pending.evidence.totalHours >= 0);
    assert.ok(pending.options.every((option) => option.gains.length === 1 && option.costs.length === 1));
    unavailableOptionCount += pending.options.filter((option) => option.available === false).length;
    assert.ok(pending.options.filter((option) => option.available === false)
      .every((option) => option.unavailableReason.length > 0));

    const view = presentGame(result, data);
    assert.equal(view.pending.kind, "mainline_event");
    assert.ok(view.pending.options.every((option) => (
      option.effects.gains.length === 1 && option.effects.costs.length === 1
    )));

    const selected = pending.options.find((option) => (
      option.available !== false && !["pause", "personal"].includes(option.kind)
    )) ?? pending.options.find((option) => option.available !== false);
    assert.ok(selected, `${pending.eventId}至少要有一个现实可执行选项`);
    choice = selected.id;
    seenEvents.push(pending.eventId);
    selectedPayoffOptions.push({
      eventId: pending.eventId,
      optionId: selected.id,
      directionId: pending.directionId,
      gain: selected.gain,
      tradeoff: selected.tradeoff,
    });
    if (!["pause", "personal"].includes(selected.kind)) {
      pendingFollowThrough.add(directionActivities[pending.directionId]);
    }
  } else if (pending.kind === "quarter_plan") {
    const preferred = [...pendingFollowThrough].find((activityId) => (
      pending.options.some((option) => option.id === activityId && option.available !== false)
    ));
    choice = chooseQuarterPlan(pending, preferred);
    if (preferred && choice.includes(preferred)) {
      followedActivities.add(preferred);
      pendingFollowThrough.delete(preferred);
    }
  } else {
    choice = pending.options.find((option) => option.available !== false).id;
  }
  session = applySessionChoice(session, pending, choice);
}

assert.ok(result, "应生成可检查的人生状态");
assert.deepEqual(seenEvents, expectedEventIds, "五个关键年龄必须按时间顺序进入主线兑现事件");
assert.ok(unavailableOptionCount >= 1, "至少应有一条道路因缺少真实前史而不可执行");
assert.ok(followedActivities.size >= 1, "解锁后的行动必须能够重新进入后续季度行动池");

const payoff = result.currentState.youthMainlinePayoffs;
assert.ok(payoff);
assert.equal(payoff.outcomes.length, expectedEventIds.length);
assert.ok(Object.values(payoff.followThrough).some((count) => count >= 1));
assert.ok(payoff.outcomes.every((outcome) => outcome.gain && outcome.tradeoff && outcome.evidence));
assert.ok(payoff.outcomes.some((outcome) => outcome.personId));

const payoffFacts = Object.values(result.stages).flatMap((stage) => stage.annualRecords ?? [])
  .flatMap((record) => record.facts ?? []);
assert.equal(payoffFacts.filter((fact) => fact.type === "youth_mainline_opportunity").length, 5);
assert.ok(payoffFacts.some((fact) => fact.type === "youth_mainline_follow_through"));
assert.ok(payoffFacts.some((fact) => fact.type === "youth_mainline_delayed_echo"));

const mainline = buildLifeMainline(result);
assert.ok(mainline.youthPayoffReview);
assert.equal(mainline.youthPayoffReview.chain.length, 5);
assert.equal(mainline.youthPayoffReview.opportunityCount, 5);
assert.ok(mainline.youthPayoffReview.followThroughQuarterCount >= 1);
assert.ok(mainline.youthPayoffReview.recurringPeople.length >= 1);

console.log(JSON.stringify({
  ok: true,
  events: selectedPayoffOptions,
  unlockedActivitiesUsed: [...followedActivities],
  unavailableOptionCount,
  review: {
    summary: mainline.youthPayoffReview.summary,
    dominantDirection: mainline.youthPayoffReview.dominantDirectionLabel,
    followThroughQuarterCount: mainline.youthPayoffReview.followThroughQuarterCount,
    recurringPeople: mainline.youthPayoffReview.recurringPeople.map((person) => person.name),
  },
  checks: [
    "five_age_gated_payoff_events",
    "actual_history_evidence",
    "conditional_unavailable_paths",
    "gain_and_tradeoff_on_every_choice",
    "unlocked_actions_return_to_quarter_pool",
    "follow_through_and_delayed_echo_facts",
    "recurring_people_from_shared_experience",
    "age_18_traceable_causal_review",
  ],
}, null, 2));
