import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateBirthProfile } from "../src/simulation/birth-generator.mjs";
import { simulateChildhood } from "../src/simulation/childhood-simulator.mjs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");

function readJson(...segments) {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, ...segments), "utf8"));
}

function readArgument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const birthCalibration = readJson("data", "calibration", "birth_1978_1982.json");
const childhoodCalibration = readJson("data", "calibration", "childhood_1978_1988.json");
const eventConfig = readJson("data", "childhood_events.json");
const count = Number(readArgument("--count", "1"));
const seed = readArgument("--seed", "childhood-demo");
const yearText = readArgument("--year", null);
const birthYear = yearText === null ? undefined : Number(yearText);

if (!Number.isInteger(count) || count < 1 || count > 200000) {
  throw new RangeError("--count 必须是1至200000之间的整数");
}

const simulations = [];
for (let index = 0; index < count; index += 1) {
  const profile = generateBirthProfile(birthCalibration, {
    seed: `${seed}:birth:${index}`,
    ...(birthYear === undefined ? {} : { birthYear }),
  });
  simulations.push({
    profile,
    childhood: simulateChildhood(profile, childhoodCalibration, eventConfig, {
      seed: `${seed}:childhood:${index}`,
    }),
  });
}

if (count === 1) {
  console.log(JSON.stringify(simulations[0], null, 2));
  process.exit(0);
}

const summary = {
  count,
  completedStage: 0,
  earlyChildhoodDeaths: 0,
  deathsByAge: {},
  youngerSiblingBirths: 0,
  ruralWorkFormChanges: 0,
  immunizationContacts: 0,
  decisions: {},
  age6SurvivorMeanStats: {
    health: 0,
    wealth: 0,
    mood: 0,
    ability: 0,
    relationships: 0,
  },
};
let age6Survivors = 0;

for (const { childhood } of simulations) {
  if (childhood.status === "completed_stage") {
    summary.completedStage += 1;
    age6Survivors += 1;
    for (const stat of Object.keys(summary.age6SurvivorMeanStats)) {
      summary.age6SurvivorMeanStats[stat] += childhood.visibleStats[stat].value;
    }
  } else if (childhood.ending?.id === "early_childhood_death") {
    summary.earlyChildhoodDeaths += 1;
    const age = String(childhood.ending.age);
    summary.deathsByAge[age] = (summary.deathsByAge[age] ?? 0) + 1;
  }
  for (const record of childhood.annualRecords) {
    for (const fact of record.facts) {
      if (fact.type === "younger_sibling_born") summary.youngerSiblingBirths += 1;
      if (fact.type === "rural_work_form_changed") summary.ruralWorkFormChanges += 1;
      if (fact.type === "planned_immunization_contact") summary.immunizationContacts += 1;
    }
  }
  for (const decision of childhood.decisions) {
    summary.decisions[decision.chosenOptionId] =
      (summary.decisions[decision.chosenOptionId] ?? 0) + 1;
  }
}

for (const stat of Object.keys(summary.age6SurvivorMeanStats)) {
  summary.age6SurvivorMeanStats[stat] =
    Math.round((summary.age6SurvivorMeanStats[stat] / age6Survivors) * 1000) / 1000;
}
console.log(JSON.stringify(summary, null, 2));
