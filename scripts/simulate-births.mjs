import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateBirthProfile } from "../src/simulation/birth-generator.mjs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");
const calibration = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "data", "calibration", "birth_1978_1982.json"), "utf8"),
);

function readArgument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const count = Number(readArgument("--count", "1"));
const seed = readArgument("--seed", "demo");
const yearText = readArgument("--year", null);
const birthYear = yearText === null ? undefined : Number(yearText);

if (!Number.isInteger(count) || count < 1 || count > 1000000) {
  throw new RangeError("--count 必须是1至1000000之间的整数");
}

const profiles = Array.from({ length: count }, (_, index) =>
  generateBirthProfile(calibration, {
    seed: `${seed}-${index}`,
    ...(birthYear === undefined ? {} : { birthYear }),
  }),
);

if (count === 1) {
  console.log(JSON.stringify(profiles[0], null, 2));
  process.exit(0);
}

const summary = {
  count,
  years: {},
  residence: { urban: 0, rural: 0 },
  sex: { male: 0, female: 0 },
  mainEarnerSector: { primary: 0, secondary: 0, tertiary: 0 },
  urbanHousing: {},
  meanCoResidentSizeAtBirth: 0,
  incomeByYearAndResidence: {},
};

let householdSizeTotal = 0;
const incomeCells = new Map();

for (const profile of profiles) {
  const year = String(profile.person.birthYear);
  const residence = profile.person.residence;
  summary.years[year] = (summary.years[year] ?? 0) + 1;
  summary.residence[residence] += 1;
  summary.sex[profile.person.sex] += 1;
  summary.mainEarnerSector[profile.household.mainEarnerSector] += 1;
  householdSizeTotal += profile.household.coResidentSizeAtBirth;

  if (residence === "urban") {
    const tenure = profile.household.housing.tenure;
    summary.urbanHousing[tenure] = (summary.urbanHousing[tenure] ?? 0) + 1;
  }

  const cellKey = `${year}-${residence}`;
  const cell = incomeCells.get(cellKey) ?? { count: 0, sum: 0 };
  cell.count += 1;
  cell.sum += profile.household.finance.annualIncomePerPersonYuan;
  incomeCells.set(cellKey, cell);
}

summary.meanCoResidentSizeAtBirth = Math.round((householdSizeTotal / count) * 1000) / 1000;
for (const [cellKey, cell] of incomeCells) {
  summary.incomeByYearAndResidence[cellKey] = {
    count: cell.count,
    meanYuan: Math.round((cell.sum / cell.count) * 100) / 100,
  };
}

console.log(JSON.stringify(summary, null, 2));
