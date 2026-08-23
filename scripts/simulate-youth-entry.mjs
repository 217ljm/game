import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateBirthProfile } from "../src/simulation/birth-generator.mjs";
import { simulateChildhood } from "../src/simulation/childhood-simulator.mjs";
import { simulatePrimaryEducation } from "../src/simulation/primary-education-simulator.mjs";
import { simulateAdolescence } from "../src/simulation/adolescence-simulator.mjs";
import { simulateYouthEntry } from "../src/simulation/youth-entry-simulator.mjs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");
const readJson = (...segments) =>
  JSON.parse(fs.readFileSync(path.join(projectRoot, ...segments), "utf8"));

function readArgument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const birthCalibration = readJson("data", "calibration", "birth_1978_1982.json");
const childhoodCalibration = readJson("data", "calibration", "childhood_1978_1988.json");
const childhoodEvents = readJson("data", "childhood_events.json");
const primaryCalibration = readJson("data", "calibration", "primary_education_1984_1996.json");
const primaryEvents = readJson("data", "primary_education_events.json");
const adolescenceCalibration = readJson(
  "data",
  "calibration",
  "adolescence_education_1986_2000.json",
);
const adolescenceEvents = readJson("data", "adolescence_events.json");
const youthCalibration = readJson("data", "calibration", "youth_entry_1992_2006.json");
const youthEvents = readJson("data", "youth_entry_events.json");
const jobCatalog = readJson("data", "entry_job_catalog.json");
const count = Number(readArgument("--count", "1"));
const seed = readArgument("--seed", "youth-entry-demo");
const yearText = readArgument("--year", null);
const birthYear = yearText === null ? undefined : Number(yearText);

if (!Number.isInteger(count) || count < 1 || count > 100000) {
  throw new RangeError("--count 必须是1至100000之间的整数");
}

const simulations = [];
let candidateIndex = 0;
while (simulations.length < count) {
  const profile = generateBirthProfile(birthCalibration, {
    seed: `${seed}:birth:${candidateIndex}`,
    ...(birthYear === undefined ? {} : { birthYear }),
  });
  const childhood = simulateChildhood(profile, childhoodCalibration, childhoodEvents, {
    seed: `${seed}:childhood:${candidateIndex}`,
  });
  if (childhood.status === "completed_stage") {
    const primary = simulatePrimaryEducation(
      profile,
      childhood,
      primaryCalibration,
      primaryEvents,
      { seed: `${seed}:primary:${candidateIndex}` },
    );
    const adolescence = simulateAdolescence(
      profile,
      childhood,
      primary,
      adolescenceCalibration,
      adolescenceEvents,
      { seed: `${seed}:adolescence:${candidateIndex}` },
    );
    const youthEntry = simulateYouthEntry(
      profile,
      adolescence,
      youthCalibration,
      youthEvents,
      jobCatalog,
      { seed: `${seed}:youth-entry:${candidateIndex}` },
    );
    simulations.push({ profile, childhood, primary, adolescence, youthEntry });
  }
  candidateIndex += 1;
}

if (count === 1) {
  console.log(JSON.stringify({ conditionalOnSurvivalToAge6: true, ...simulations[0] }, null, 2));
  process.exit(0);
}

const summary = {
  count,
  childhoodCandidatesNeeded: candidateIndex,
  startingPaths: {},
  outcomes: {},
  jobs: {
    employee: 0,
    familyEconomicActivity: 0,
    bySector: {},
    byIndustry: {},
    byUnitType: {},
    byContractType: {},
    meanWeeklyHours: 0,
    meanFirstYearPersonalIncomeYuan: 0,
  },
  education: {
    academicSeniorStarted: 0,
    vocationalSecondaryStarted: 0,
    academicSeniorGraduated: 0,
    vocationalSecondaryGraduated: 0,
    enteredRegularHigherEducation: 0,
  },
  meanSearchAttempts: 0,
  meanFinalStats: { health: 0, wealth: 0, mood: 0, ability: 0, relationships: 0 },
};

let workEndingCount = 0;
for (const { youthEntry } of simulations) {
  const startingPath = youthEntry.entryPreparationPath;
  summary.startingPaths[startingPath] = (summary.startingPaths[startingPath] ?? 0) + 1;
  const ending = youthEntry.ending?.id ?? "unknown";
  summary.outcomes[ending] = (summary.outcomes[ending] ?? 0) + 1;
  const senior = youthEntry.education.senior;
  if (senior?.track === "academic_senior") summary.education.academicSeniorStarted += 1;
  if (senior?.track === "vocational_secondary") summary.education.vocationalSecondaryStarted += 1;
  if (senior?.track === "academic_senior" && senior.status === "graduated") {
    summary.education.academicSeniorGraduated += 1;
  }
  if (senior?.track === "vocational_secondary" && senior.status === "graduated") {
    summary.education.vocationalSecondaryGraduated += 1;
  }
  if (ending === "entered_regular_higher_education") {
    summary.education.enteredRegularHigherEducation += 1;
  }
  const job = youthEntry.ending?.job;
  if (job) {
    workEndingCount += 1;
    if (ending === "entered_family_economic_activity") summary.jobs.familyEconomicActivity += 1;
    else summary.jobs.employee += 1;
    for (const [group, key] of [
      ["bySector", job.sector],
      ["byIndustry", job.industry],
      ["byUnitType", job.unitType],
      ["byContractType", job.contractType],
    ]) {
      summary.jobs[group][key] = (summary.jobs[group][key] ?? 0) + 1;
    }
    summary.jobs.meanWeeklyHours += job.weeklyHours;
    summary.jobs.meanFirstYearPersonalIncomeYuan += job.annualIncomeContributionYuan;
  }
  summary.meanSearchAttempts += youthEntry.employment.searchAttempts.length;
  for (const stat of Object.keys(summary.meanFinalStats)) {
    summary.meanFinalStats[stat] += youthEntry.visibleStats[stat].value;
  }
}

summary.jobs.meanWeeklyHours = round(summary.jobs.meanWeeklyHours / workEndingCount, 2);
summary.jobs.meanFirstYearPersonalIncomeYuan = round(
  summary.jobs.meanFirstYearPersonalIncomeYuan / workEndingCount,
  2,
);
summary.meanSearchAttempts = round(summary.meanSearchAttempts / count, 4);
for (const stat of Object.keys(summary.meanFinalStats)) {
  summary.meanFinalStats[stat] = round(summary.meanFinalStats[stat] / count, 3);
}
console.log(JSON.stringify(summary, null, 2));

function round(value, digits) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
