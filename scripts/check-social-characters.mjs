import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");
const readJson = (name) => JSON.parse(
  fs.readFileSync(path.join(projectRoot, "data", name), "utf8"),
);
const catalog = readJson("social_character_catalog.json");
const annualCatalog = readJson("annual_life_operations.json");
const operationIds = new Set(
  annualCatalog.bands.flatMap((band) => band.options.map((option) => option.id)),
);

assert.equal(catalog.schemaVersion, 1);
assert.equal(catalog.contentStatus, "fictional_character_generation");
assert.ok(catalog.rules.description.includes("虚构"));
assert.ok(Number.isInteger(catalog.rules.maximumRecurringPeople));
assert.ok(catalog.rules.maximumRecurringPeople >= 4);
assert.ok(catalog.rules.minimumCloseness < catalog.rules.maximumCloseness);
assert.ok(catalog.rules.passiveAnnualDecay > 0);
assert.ok(catalog.rules.focusedContactIncrease > catalog.rules.passiveAnnualDecay);

assert.ok(catalog.surnamePool.length >= 10);
assert.equal(new Set(catalog.surnamePool).size, catalog.surnamePool.length);
for (const sex of ["female", "male"]) {
  assert.ok(catalog.givenNamePoolBySex[sex].length >= 8);
  assert.equal(
    new Set(catalog.givenNamePoolBySex[sex]).size,
    catalog.givenNamePoolBySex[sex].length,
  );
}

const requiredRoles = [
  "neighborhood_friend",
  "primary_peer",
  "primary_teacher",
  "junior_peer",
  "neighborhood_youth",
  "senior_peer",
  "higher_peer",
  "training_peer",
  "work_contact",
  "adult_friend",
];
assert.deepEqual(Object.keys(catalog.roles).sort(), [...requiredRoles].sort());
for (const [roleId, role] of Object.entries(catalog.roles)) {
  assert.ok(role.label, `人物角色缺少显示名称：${roleId}`);
  assert.ok(
    role.initialCloseness >= catalog.rules.minimumCloseness
      && role.initialCloseness <= catalog.rules.maximumCloseness,
    `人物角色初始亲近度越界：${roleId}`,
  );
  assert.ok((role.initialFamiliarity ?? role.initialCloseness) >= 0);
  assert.ok((role.initialTrust ?? role.initialCloseness) >= 0);
  if (role.birthYearOffsetMin != null || role.birthYearOffsetMax != null) {
    assert.ok(Number.isInteger(role.birthYearOffsetMin));
    assert.ok(Number.isInteger(role.birthYearOffsetMax));
    assert.ok(role.birthYearOffsetMin <= role.birthYearOffsetMax);
  }
}
assert.ok(catalog.temperamentPool.length >= 5);

assert.ok(catalog.focusedContactOperationIds.length >= 8);
assert.equal(
  new Set(catalog.focusedContactOperationIds).size,
  catalog.focusedContactOperationIds.length,
);
for (const operationId of catalog.focusedContactOperationIds) {
  assert.ok(operationIds.has(operationId), `人物系统引用未知年度行动：${operationId}`);
}

console.log(JSON.stringify({
  ok: true,
  roleCount: Object.keys(catalog.roles).length,
  possibleNameCount:
    catalog.surnamePool.length
    * Object.values(catalog.givenNamePoolBySex).reduce((total, names) => total + names.length, 0),
  focusedContactOperationCount: catalog.focusedContactOperationIds.length,
  checks: [
    "fictional_content_disclosure",
    "relationship_bounds",
    "unique_name_pools",
    "all_life_stage_roles",
    "childhood_personality_trust_and_teacher_role",
    "annual_operation_references",
  ],
}, null, 2));
