import assert from "node:assert/strict";
import { settleLifeQuarterProcess } from "../src/simulation/life-activity-process-system.mjs";

function runProcess() {
  const state = {
    socialNetwork: [{
      id: "peer-1",
      displayName: "林晓梅",
      roleId: "higher_peer",
      roleLabel: "同学",
      active: true,
      fictional: true,
      closeness: 52,
      familiarity: 50,
      trust: 48,
      sharedMemories: [],
    }],
    employment: { status: "not_started", currentJob: null },
    family: { partner: null, originMembers: [] },
  };
  const record = { calendarYear: 1996, age: 18, facts: [] };
  let factIndex = 0;
  const addFact = (target, type, payload) => {
    const fact = { id: `fact-${++factIndex}`, type, ...structuredClone(payload) };
    target.facts.push(fact);
    return fact;
  };
  const settlement = settleLifeQuarterProcess({
    state,
    record,
    stage: "adult",
    quarter: 1,
    plan: {
      activities: [{
        id: "higher_focus_coursework",
        label: "把课程里的难点真正弄懂",
        category: "learning",
        categoryLabel: "学习与求知",
        hoursPerWeek: 5,
        plannedHours: 65,
        executedHours: 52,
        executionRate: 0.8,
        interestTags: ["reading_language"],
      }, {
        id: "quarter_intentional_rest",
        label: "主动减量，好好休息",
        category: "recovery",
        categoryLabel: "休息与恢复",
        hoursPerWeek: 3,
        plannedHours: 39,
        executedHours: 39,
        executionRate: 1,
        interestTags: [],
      }],
    },
    context: {
      residence: "urban",
      educationStatus: "enrolled",
    },
    addFact,
  });
  return { state, record, settlement };
}

const first = runProcess();
const second = runProcess();
assert.deepEqual(first, second);
assert.equal(first.settlement.results.length, 2);
assert.ok(first.settlement.results.every((entry) => entry.process.length === 3));
assert.equal(first.settlement.results[0].actor.name, "林晓梅");
assert.equal(first.settlement.results[0].completionStatus, "partly_completed");
assert.equal(first.settlement.results[1].actor.roleLabel, "自己");
assert.equal(first.record.facts.filter((fact) => fact.type === "quarter_activity_process").length, 2);
assert.ok(first.state.socialNetwork[0].closeness > 52);
assert.equal(first.state.socialNetwork[0].sharedMemories.length, 1);
assert.match(first.state.socialNetwork[0].sharedMemories[0].title, /一起经历/);

console.log(JSON.stringify({
  ok: true,
  checks: [
    "deterministic_age_13_plus_activity_process",
    "real_setting_actor_three_steps_response_and_outcome",
    "named_npc_feedback",
    "partial_completion_from_month_execution",
    "shared_relationship_memory",
  ],
}, null, 2));
