import assert from "node:assert/strict";
import { buildWorldMapView } from "../src/game/world-map-presenter.mjs";

function makeResult(age, overrides = {}) {
  return {
    profile: { person: { residence: overrides.residence ?? "urban" } },
    currentState: {
      residence: overrides.residence ?? "urban",
      education: overrides.education ?? {},
      employment: overrides.employment ?? { status: "not_started", currentJob: null },
    },
  };
}

function makeGame(age, people = []) {
  return { age, year: 1978 + age, people };
}

const toddler = buildWorldMapView(makeResult(2), makeGame(2, [
  { name: "母亲", role: "原生家庭", detail: "共同生活" },
]));
assert.equal(toddler.locations.length, 6);
assert.equal(toddler.locations.find((entry) => entry.id === "home").status, "current");
assert.equal(toddler.locations.find((entry) => entry.id === "school").status, "locked");
assert.equal(toddler.locations.find((entry) => entry.id === "work").status, "locked");
assert.match(toddler.locations.find((entry) => entry.id === "neighborhood").statusLabel, /陪同/);

const student = buildWorldMapView(makeResult(18, {
  residence: "rural",
  education: { higher: { status: "enrolled" } },
}), makeGame(18, [
  { name: "林晓梅", role: "同学", detail: "同校同学" },
]));
assert.equal(student.locations.find((entry) => entry.id === "school").status, "open");
assert.equal(student.locations.find((entry) => entry.id === "school").label, "当前就读院校");
assert.equal(student.locations.find((entry) => entry.id === "work").status, "open");
assert.match(student.title, /乡村生活圈.*1996年/);

const worker = buildWorldMapView(makeResult(30, {
  employment: {
    status: "employed",
    currentJob: { label: "机械厂装配工" },
  },
}), makeGame(30, [
  { name: "周师傅", role: "同事", detail: "机械厂同事" },
]));
const workplace = worker.locations.find((entry) => entry.id === "work");
assert.equal(workplace.label, "机械厂装配工");
assert.match(workplace.travel, /通勤占用/);
assert.ok(workplace.people.includes("周师傅"));

console.log(JSON.stringify({
  ok: true,
  checks: [
    "age_gated_location_access",
    "residence_and_education_specific_map",
    "employment_specific_workplace_and_people",
    "location_travel_people_opportunities_contract",
  ],
}, null, 2));
