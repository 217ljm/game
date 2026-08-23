import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  restoreFirstValidSave,
  rotateRecoverableSave,
} from "../src/app/save-recovery.mjs";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    has: (key) => values.has(key),
    read: (key, fallback = null) => values.has(key) ? structuredClone(values.get(key)) : fallback,
    write: (key, value) => values.set(key, structuredClone(value)),
    remove: (key) => values.delete(key),
    value: (key) => values.get(key),
  };
}

const restore = (value) => {
  if (!value || value.schemaVersion !== 5 || !value.seed) throw new Error("invalid save");
  return structuredClone(value);
};
const validA = { schemaVersion: 5, seed: "life-a", node: 1 };
const validB = { schemaVersion: 5, seed: "life-b", node: 2 };

const primaryFirst = memoryStorage({ primary: validA, backup: validB });
const primaryResult = restoreFirstValidSave({
  storage: primaryFirst,
  keys: ["primary", "backup"],
  restore,
});
assert.equal(primaryResult.sourceKey, "primary");
assert.equal(primaryResult.session.seed, "life-a");
assert.deepEqual(primaryResult.damagedKeys, []);

const backupFallback = memoryStorage({ primary: { broken: true }, backup: validB });
const backupResult = restoreFirstValidSave({
  storage: backupFallback,
  keys: ["primary", "backup"],
  restore,
});
assert.equal(backupResult.sourceKey, "backup");
assert.equal(backupResult.session.seed, "life-b");
assert.deepEqual(backupResult.damagedKeys, ["primary"]);
assert.equal(backupFallback.has("primary"), false);

const allBroken = memoryStorage({ primary: { broken: 1 }, backup: { broken: 2 } });
const emptyResult = restoreFirstValidSave({ storage: allBroken, keys: ["primary", "backup"], restore });
assert.equal(emptyResult.session, null);
assert.equal(allBroken.has("primary"), false);
assert.equal(allBroken.has("backup"), false);

const rotating = memoryStorage({ primary: validA });
rotateRecoverableSave({
  storage: rotating,
  primaryKey: "primary",
  backupKey: "backup",
  nextValue: validB,
  restore,
});
assert.deepEqual(rotating.value("backup"), validA);
assert.deepEqual(rotating.value("primary"), validB);

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const app = fs.readFileSync(path.resolve(currentDirectory, "..", "public", "app.mjs"), "utf8");
assert.match(app, /people-life:backup:v5/);
assert.match(app, /people-life:debug-backup:v1/);
assert.match(app, /restoreFirstValidSave/);
assert.match(app, /rotateRecoverableSave/);
assert.match(app, /主存档异常，已从上一次有效进度恢复/);
assert.match(app, /platform\.storage\.remove\(BACKUP_SAVE_KEY\)/);

console.log(JSON.stringify({
  ok: true,
  checks: [
    "valid_primary_save_wins",
    "corrupt_primary_falls_back_to_last_valid_backup",
    "only_damaged_entries_are_removed",
    "previous_valid_primary_rotates_to_backup_before_write",
    "formal_and_debug_saves_use_separate_backup_keys",
    "ending_removes_active_and_backup_saves",
  ],
}, null, 2));
