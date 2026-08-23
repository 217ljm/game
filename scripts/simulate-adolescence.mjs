import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateBirthProfile } from "../src/simulation/birth-generator.mjs";
import { simulateChildhood } from "../src/simulation/childhood-simulator.mjs";
import { simulatePrimaryEducation } from "../src/simulation/primary-education-simulator.mjs";
import { simulateAdolescence } from "../src/simulation/adolescence-simulator.mjs";

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
const count = Number(readArgument("--count", "1"));
const seed = readArgument("--seed", "adolescence-demo");
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
    simulations.push({ profile, childhood, primary, adolescence });
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
  startingPaths: { junior_student: 0, nonstudent: 0 },
  outcomes: {},
  juniorSchoolForms: {},
  juniorRepeatedYears: 0,
  decisions: {},
  juniorGraduates: 0,
  seniorStageEntries: 0,
  vocationalEntries: 0,
  academicSeniorEntries: 0,
  meanFinalStats: { health: 0, wealth: 0, mood: 0, ability: 0, relationships: 0 },
};

for (const { adolescence } of simulations) {
  const startingPath = adolescence.annualRecords[0]?.pathAtStart ?? "unknown";
  summary.startingPaths[startingPath] = (summary.startingPaths[startingPath] ?? 0) + 1;
  const ending = adolescence.ending?.id ?? "unknown";
  summary.outcomes[ending] = (summary.outcomes[ending] ?? 0) + 1;
  const schoolForm = adolescence.education.junior.school?.form;
  if (schoolForm) {
    summary.juniorSchoolForms[schoolForm] = (summary.juniorSchoolForms[schoolForm] ?? 0) + 1;
  }
  summary.juniorRepeatedYears += adolescence.education.junior.repeatedYears;
  if (adolescence.education.junior.status === "graduated_junior") {
    summary.juniorGraduates += 1;
  }
  if (
    ending === "entered_vocational_secondary"
    || ending === "entered_academic_senior_secondary"
  ) {
    summary.seniorStageEntries += 1;
  }
  if (ending === "entered_vocational_secondary") summary.vocationalEntries += 1;
  if (ending === "entered_academic_senior_secondary") summary.academicSeniorEntries += 1;
  for (const decision of adolescence.decisions) {
    summary.decisions[decision.selectedOptionId] =
      (summary.decisions[decision.selectedOptionId] ?? 0) + 1;
  }
  for (const stat of Object.keys(summary.meanFinalStats)) {
    summary.meanFinalStats[stat] += adolescence.visibleStats[stat].value;
  }
}
summary.meanJuniorRepeatedYears = round(summary.juniorRepeatedYears / count, 4);
summary.juniorGraduationShareAmongEntrants = round(
  summary.juniorGraduates / summary.startingPaths.junior_student,
  4,
);
summary.seniorTransitionShareAmongJuniorGraduates = round(
  summary.seniorStageEntries / summary.juniorGraduates,
  4,
);
summary.vocationalShareAmongSeniorEntries = round(
  summary.vocationalEntries / summary.seniorStageEntries,
  4,
);
for (const stat of Object.keys(summary.meanFinalStats)) {
  summary.meanFinalStats[stat] = round(summary.meanFinalStats[stat] / count, 3);
}
console.log(JSON.stringify(summary, null, 2));

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
