import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateBirthProfile } from "../src/simulation/birth-generator.mjs";
import { simulateChildhood } from "../src/simulation/childhood-simulator.mjs";
import { simulatePrimaryEducation } from "../src/simulation/primary-education-simulator.mjs";

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
const count = Number(readArgument("--count", "1"));
const seed = readArgument("--seed", "primary-demo");
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
    simulations.push({ profile, childhood, primary });
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
  outcomes: {},
  entryAge: {},
  schoolYears: { "5": 0, "6": 0 },
  schoolForms: {},
  totalRepeatedYears: 0,
  decisions: {},
  primaryGraduates: 0,
  enteredJuniorSecondary: 0,
  meanFinalStats: { health: 0, wealth: 0, mood: 0, ability: 0, relationships: 0 },
};

for (const { primary } of simulations) {
  const ending = primary.ending?.id ?? "unknown";
  summary.outcomes[ending] = (summary.outcomes[ending] ?? 0) + 1;
  if (primary.education.entryAge !== null) {
    const age = String(primary.education.entryAge);
    summary.entryAge[age] = (summary.entryAge[age] ?? 0) + 1;
  }
  if (primary.education.school) {
    const years = String(primary.education.school.prescribedYears);
    summary.schoolYears[years] += 1;
    const form = primary.education.school.form;
    summary.schoolForms[form] = (summary.schoolForms[form] ?? 0) + 1;
  }
  summary.totalRepeatedYears += primary.education.repeatedYears;
  if (primary.education.status === "graduated_primary") summary.primaryGraduates += 1;
  if (primary.ending?.id === "entered_junior_secondary") summary.enteredJuniorSecondary += 1;
  for (const decision of primary.decisions) {
    summary.decisions[decision.chosenOptionId] = (summary.decisions[decision.chosenOptionId] ?? 0) + 1;
  }
  for (const stat of Object.keys(summary.meanFinalStats)) {
    summary.meanFinalStats[stat] += primary.visibleStats[stat].value;
  }
}
summary.meanRepeatedYears = Math.round((summary.totalRepeatedYears / count) * 10000) / 10000;
summary.primaryGraduationShare = Math.round((summary.primaryGraduates / count) * 10000) / 10000;
summary.juniorTransitionShareAmongAll =
  Math.round((summary.enteredJuniorSecondary / count) * 10000) / 10000;
summary.juniorTransitionShareAmongGraduates =
  Math.round((summary.enteredJuniorSecondary / summary.primaryGraduates) * 10000) / 10000;
for (const stat of Object.keys(summary.meanFinalStats)) {
  summary.meanFinalStats[stat] = Math.round((summary.meanFinalStats[stat] / count) * 1000) / 1000;
}
console.log(JSON.stringify(summary, null, 2));
