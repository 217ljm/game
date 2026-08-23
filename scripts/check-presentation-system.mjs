import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CHARACTER_ATLAS_URL,
  buildCharacterVisualView,
  characterAgeBand,
  characterAtlasCell,
  characterEraBand,
} from "../src/game/character-visual-presenter.mjs";
import {
  MOTION_MODES,
  PRESENTATION_STORAGE_KEY,
  motionDuration,
  normalizePresentationPreferences,
} from "../src/app/presentation-preferences.mjs";
import {
  isHapticEnabled,
  isSoundEnabled,
  setHapticEnabled,
  setSoundEnabled,
} from "../public/sound-haptic-service.mjs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");
const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

assert.deepEqual(MOTION_MODES, ["full", "reduced", "off"]);
assert.equal(PRESENTATION_STORAGE_KEY, "people-life:presentation:v1");
assert.deepEqual(normalizePresentationPreferences(null), {
  schemaVersion: 1,
  motionMode: "full",
  soundEnabled: true,
  hapticEnabled: true,
});
assert.equal(normalizePresentationPreferences(null, { prefersReducedMotion: true }).motionMode, "reduced");
assert.equal(normalizePresentationPreferences({ motionMode: "invalid" }).motionMode, "full");
assert.equal(normalizePresentationPreferences({ soundEnabled: false, hapticEnabled: false }).soundEnabled, false);
assert.equal(motionDuration(680, "full"), 680);
assert.equal(motionDuration(680, "reduced"), 408);
assert.equal(motionDuration(680, "off"), 0);

assert.equal(characterAgeBand(0).column, 0);
assert.equal(characterAgeBand(11).column, 0);
assert.equal(characterAgeBand(12).column, 1);
assert.equal(characterAgeBand(24).column, 1);
assert.equal(characterAgeBand(25).column, 2);
assert.equal(characterAgeBand(59).column, 2);
assert.equal(characterAgeBand(60).column, 3);
assert.equal(characterAtlasCell(18, "male").row, 0);
assert.equal(characterAtlasCell(18, "female").row, 1);
assert.equal(characterEraBand(1978).id, "reform_beginning");
assert.equal(characterEraBand(1996).id, "opening_accelerates");
assert.equal(characterEraBand(2024).id, "connected_life");
assert.equal(characterEraBand(2025).id, "future_scenario");
const visual = buildCharacterVisualView({
  profile: { person: { sex: "female", residence: "urban" } },
  currentState: { residence: "rural" },
}, 40, 2018);
assert.equal(visual.atlasUrl, CHARACTER_ATLAS_URL);
assert.equal(visual.cell.column, 2);
assert.equal(visual.cell.row, 1);
assert.equal(visual.residence, "rural");

setSoundEnabled(false);
setHapticEnabled(false);
assert.equal(isSoundEnabled(), false);
assert.equal(isHapticEnabled(), false);
setSoundEnabled(true);
setHapticEnabled(true);

const html = read("public/index.html");
const app = read("public/app.mjs");
const renderer = read("public/life-stage-renderer.mjs");
const sound = read("public/sound-haptic-service.mjs");
const css = read("public/styles.css");
for (const id of ["character-portrait", "motion-mode-select", "sound-toggle", "haptic-toggle"]) {
  assert.ok(html.includes(`id="${id}"`), `缺少表现设置控件：${id}`);
}
assert.match(app, /platform\.storage\.write\(PRESENTATION_STORAGE_KEY/);
assert.match(app, /playFeedback\("choice", "medium"\)/);
assert.match(app, /playFeedback\("stamp", "medium"\)/);
assert.match(app, /playFeedbackOnce\(`quarter-result:/);
assert.match(app, /--month-delay/);
assert.match(app, /renderCharacterPortrait\(view\.visual\)/);
assert.match(renderer, /initialKeys = \["base", "characterAtlas"\]/);
assert.match(renderer, /IntersectionObserver/);
assert.match(renderer, /this\.motionDisabled/);
assert.match(sound, /type === "warning"/);
assert.match(css, /body\[data-motion="off"\]/);
assert.match(css, /portrait-breathe/);
assert.match(css, /month-tick-enter/);

const assetRoot = path.join(projectRoot, "public", "assets");
const imageFiles = fs.readdirSync(assetRoot, { recursive: true })
  .filter((entry) => /\.(?:webp|png)$/i.test(entry));
const oversized = imageFiles.map((entry) => ({
  entry,
  bytes: fs.statSync(path.join(assetRoot, entry)).size,
})).filter((entry) => entry.bytes > 450 * 1024);
assert.deepEqual(oversized, [], `单张美术资源超过450KB：${JSON.stringify(oversized)}`);
const initialAssetBytes = [
  "life-stage/primary-1984-base.webp",
  "life-stage/character-age-atlas-v1.webp",
].reduce((sum, entry) => sum + fs.statSync(path.join(assetRoot, entry)).size, 0);
assert.ok(initialAssetBytes < 1.8 * 1024 * 1024);

console.log(JSON.stringify({
  ok: true,
  imageAssetCount: imageFiles.length,
  initialAssetBytes,
  checks: [
    "motion_full_reduced_off_normalization_and_duration",
    "sound_and_haptic_independent_switches",
    "age_sex_era_character_visual_mapping",
    "settings_storage_and_ui_wiring",
    "choice_commit_result_and_warning_feedback_wiring",
    "lazy_scene_asset_loading_and_canvas_motion_stop_contract",
    "character_portrait_surface",
    "single_asset_and_initial_preload_budgets",
  ],
}, null, 2));
