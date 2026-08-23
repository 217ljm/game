import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateBirthProfile } from "../src/simulation/birth-generator.mjs";
import { simulateChildhood } from "../src/simulation/childhood-simulator.mjs";
import { simulatePrimaryEducation } from "../src/simulation/primary-education-simulator.mjs";
import { simulateAdolescence } from "../src/simulation/adolescence-simulator.mjs";
import { simulateYouthEntry } from "../src/simulation/youth-entry-simulator.mjs";
import { simulateAdultLife } from "../src/simulation/adult-life-simulator.mjs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");
const readJson = (...segments) =>
  JSON.parse(fs.readFileSync(path.join(projectRoot, ...segments), "utf8"));

function readArgument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const config = {
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
const count = Number(readArgument("--count", "1"));
const seed = readArgument("--seed", "full-life-demo");
const yearText = readArgument("--year", null);
const birthYear = yearText == null ? undefined : Number(yearText);

if (!Number.isInteger(count) || count < 1 || count > 20000) {
  throw new RangeError("--count 必须是1至20000之间的整数");
}

function simulate(index) {
  const profile = generateBirthProfile(config.birth, {
    seed: `${seed}:birth:${index}`,
    ...(birthYear == null ? {} : { birthYear }),
  });
  const childhood = simulateChildhood(profile, config.childhood, config.childhoodEvents, {
    seed: `${seed}:childhood:${index}`,
    mortality: false,
  });
  const primary = simulatePrimaryEducation(
    profile,
    childhood,
    config.primary,
    config.primaryEvents,
    { seed: `${seed}:primary:${index}` },
  );
  const adolescence = simulateAdolescence(
    profile,
    childhood,
    primary,
    config.adolescence,
    config.adolescenceEvents,
    { seed: `${seed}:adolescence:${index}` },
  );
  const youth = simulateYouthEntry(
    profile,
    adolescence,
    config.youth,
    config.youthEvents,
    config.entryJobs,
    { seed: `${seed}:youth:${index}` },
  );
  const adult = simulateAdultLife(
    profile,
    youth,
    config.adult,
    config.adultEvents,
    config.adultJobs,
    { seed: `${seed}:adult:${index}` },
  );
  return { profile, childhood, primary, adolescence, youth, adult };
}

const lives = Array.from({ length: count }, (_, index) => simulate(index));
if (count === 1) {
  console.log(JSON.stringify(lives[0], null, 2));
  process.exit(0);
}

const summary = {
  count,
  meanAgeAtDeath: 0,
  ageAtDeath: { before60: 0, from60To79: 0, from80To89: 0, age90Plus: 0 },
  archetypes: {},
  higherEducationCompleted: 0,
  everPartnered: 0,
  childrenBorn: 0,
  everPurchasedHousing: 0,
  meanJobCount: 0,
  meanDecisionCount: 0,
  meanFinalStats: { health: 0, wealth: 0, mood: 0, ability: 0, relationships: 0 },
};

for (const { adult } of lives) {
  const review = adult.lifeReview;
  summary.meanAgeAtDeath += review.ageAtDeath;
  if (review.ageAtDeath < 60) summary.ageAtDeath.before60 += 1;
  else if (review.ageAtDeath < 80) summary.ageAtDeath.from60To79 += 1;
  else if (review.ageAtDeath < 90) summary.ageAtDeath.from80To89 += 1;
  else summary.ageAtDeath.age90Plus += 1;
  summary.archetypes[review.archetypeId] = (summary.archetypes[review.archetypeId] ?? 0) + 1;
  if (review.highestCompletedEducation === "regular_higher_education") {
    summary.higherEducationCompleted += 1;
  }
  if (adult.family.partner) summary.everPartnered += 1;
  if (adult.family.child) summary.childrenBorn += 1;
  if (adult.housing.purchaseYear) summary.everPurchasedHousing += 1;
  summary.meanJobCount += review.jobCount;
  summary.meanDecisionCount += review.decisionCount;
  for (const stat of Object.keys(summary.meanFinalStats)) {
    summary.meanFinalStats[stat] += review.finalStats[stat];
  }
}

summary.meanAgeAtDeath = round(summary.meanAgeAtDeath / count, 2);
summary.meanJobCount = round(summary.meanJobCount / count, 2);
summary.meanDecisionCount = round(summary.meanDecisionCount / count, 2);
for (const stat of Object.keys(summary.meanFinalStats)) {
  summary.meanFinalStats[stat] = round(summary.meanFinalStats[stat] / count, 2);
}
console.log(JSON.stringify(summary, null, 2));

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
