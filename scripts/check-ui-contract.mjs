import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DATA_FILES } from "../src/game/load-game-data.mjs";
import { createGameServer } from "./serve-game.mjs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");
const read = (...segments) => fs.readFileSync(path.join(projectRoot, ...segments), "utf8");
const html = read("public", "index.html");
const app = read("public", "app.mjs");
const css = read("public", "styles.css");
const routes = read("src", "app", "routes.mjs");
const application = read("src", "game", "game-application.mjs");
const pagePresenter = read("src", "game", "page-presenter.mjs");
const mainlineSystem = read("src", "simulation", "life-mainline-system.mjs");
const youthMainlineSystem = read("src", "simulation", "youth-mainline-payoff-system.mjs");
const browserPlatform = read("public", "browser-platform.mjs");

const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
const appIds = new Set([...app.matchAll(/\bbyId\("([^"]+)"\)/g)].map((match) => match[1]));
for (const id of appIds) {
  assert.ok(htmlIds.has(id), `app.mjs 引用了页面中不存在的 #${id}`);
}
for (const screen of [
  "loading", "start", "new-life", "game", "random-event", "quarter-result",
  "year-review", "person-detail", "ending", "error",
]) {
  assert.ok(htmlIds.has(`${screen}-screen`), `缺少 ${screen} 页面`);
}

assert.match(html, /name="viewport"/);
assert.match(html, /人生轨迹/);
assert.match(html, /没有走的路|没有走过的历程/);
assert.match(html, /本年账本/);
assert.match(html, /本年季度进度/);
assert.match(html, /data-route="scene"/);
assert.match(html, /data-route="map"/);
assert.match(html, /data-route="character"/);
assert.match(html, /data-route="relations"/);
assert.match(html, /data-route="records"/);
assert.match(html, /href="\/public\/styles\.css"/);
assert.match(html, /src="\/public\/app\.mjs"/);
assert.match(html, /rel="manifest" href="\/public\/manifest\.webmanifest"/);
assert.match(css, /width:\s*min\(100%,\s*470px\)/);
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /focus-visible/);
assert.match(app, /rotateRecoverableSave\(\{/);
assert.match(app, /restoreFirstValidSave\(\{/);
assert.match(app, /people-life:active:v5/);
assert.match(app, /people-life:backup:v5/);
assert.match(app, /registerProductionServiceWorker/);
assert.match(app, /LEGACY_SAVE_KEYS/);
assert.match(app, /people-life:ui:v1/);
assert.match(app, /buildPageViewModels/);
assert.match(app, /submitLifeChoice/);
assert.match(app, /routeForPending/);
assert.match(app, /quarter-progress-list/);
assert.match(app, /renderQuarterPlan/);
assert.match(app, /selectedIds/);
assert.match(app, /renderInterests/);
assert.match(app, /renderChildhoodExperience/);
assert.match(app, /renderChildhoodGrowth/);
assert.match(app, /renderMainline/);
assert.match(app, /renderLifeDirections/);
assert.match(app, /renderEndingMainline/);
assert.match(app, /renderYouthPayoffReview/);
assert.match(app, /replayDebugToTarget/);
assert.match(app, /people-life:debug:v1/);
assert.ok(htmlIds.has("confirm-plan-button"));
assert.ok(htmlIds.has("plan-intensity-list"));
assert.match(app, /actionIntensityDrafts/);
assert.match(app, /type:\s*"quarter\.plan"/);
assert.ok(htmlIds.has("interest-list"));
assert.ok(htmlIds.has("childhood-experience-list"));
assert.ok(htmlIds.has("childhood-growth-list"));
assert.ok(htmlIds.has("childhood-memory-list"));
assert.ok(htmlIds.has("debug-panel"));
assert.ok(htmlIds.has("debug-drawer-toggle"));
assert.ok(htmlIds.has("debug-jump-button"));
assert.ok(htmlIds.has("debug-event-diagnostics"));
assert.ok(htmlIds.has("main-navigation"));
assert.ok(htmlIds.has("world-map-board"));
assert.ok(htmlIds.has("map-location-panel"));
assert.ok(htmlIds.has("character-status-panel"));
assert.ok(htmlIds.has("character-growth-panel"));
assert.ok(htmlIds.has("character-life-panel"));
assert.ok(htmlIds.has("character-state-row"));
assert.ok(htmlIds.has("records-timeline-panel"));
assert.ok(htmlIds.has("records-profile-panel"));
assert.ok(htmlIds.has("settings-dialog"));
assert.ok(htmlIds.has("random-event-screen"));
assert.ok(htmlIds.has("quarter-result-screen"));
assert.ok(htmlIds.has("year-review-screen"));
assert.ok(htmlIds.has("person-detail-screen"));
assert.ok(htmlIds.has("action-pool-card"));
assert.ok(htmlIds.has("action-pool-categories"));
assert.ok(htmlIds.has("action-pool-next"));
assert.ok(htmlIds.has("quarter-impact-list"));
assert.ok(htmlIds.has("latest-growth-list"));
assert.ok(htmlIds.has("mainline-card"));
assert.ok(htmlIds.has("mainline-quest-list"));
assert.ok(htmlIds.has("life-direction-list"));
assert.ok(htmlIds.has("chapter-history-list"));
assert.ok(htmlIds.has("year-review-mainline-list"));
assert.ok(htmlIds.has("ending-mainline-card"));
assert.ok(htmlIds.has("mainline-event-evidence"));
assert.ok(htmlIds.has("youth-payoff-review-card"));
assert.ok(htmlIds.has("youth-payoff-chain-list"));
assert.ok(htmlIds.has("life-stage-card"));
assert.ok(htmlIds.has("life-stage-canvas"));
assert.ok(htmlIds.has("life-stage-action-list"));
assert.ok(htmlIds.has("life-stage-confirm"));
assert.ok(htmlIds.has("quarter-result-visual"));
assert.ok(htmlIds.has("game-toast"));
assert.match(application, /applySessionChoice/);
assert.match(application, /runLifeSession/);
assert.match(routes, /MAIN_ROUTES/);
assert.match(routes, /parseRouteHash/);
assert.match(pagePresenter, /buildPageViewModels/);
assert.match(pagePresenter, /groupTimeline/);
assert.match(browserPlatform, /localStorage/);
assert.match(app, /untraveledPaths:\s*view\.lifeReview\.untraveledPaths/);
assert.match(app, /那一生没有走/);
assert.match(app, /button\.disabled = option\.available === false/);
assert.match(css, /\.option-button:disabled/);
assert.match(css, /\.quarter-progress-list/);
assert.match(css, /\.timeline-quarter-details/);
assert.match(css, /\.activity-option\.selected/);
assert.match(css, /\.interest-meter/);
assert.match(css, /\.childhood-experience-item/);
assert.match(css, /\.childhood-growth-meter/);
assert.match(css, /\.debug-panel/);
assert.match(css, /\.debug-drawer-toggle/);
assert.match(css, /\.main-navigation/);
assert.match(css, /\.flow-screen/);
assert.match(css, /\.person-list-button/);
assert.match(css, /\.action-pool-card/);
assert.match(css, /\.option-impact-list/);
assert.match(css, /\.impact-item/);
assert.match(css, /\.impact-item\.mainline/);
assert.match(css, /\.mainline-quest/);
assert.match(css, /\.life-direction-card/);
assert.match(css, /\.ending-mainline-card/);
assert.match(css, /\.mainline-event-evidence/);
assert.match(css, /\.youth-payoff-review-card/);
assert.match(app, /actionDrafts/);
assert.match(app, /renderImpactList/);
assert.match(app, /filteredActivities/);
assert.match(app, /LifeStageRenderer/);
assert.match(app, /lifeStageSceneFor/);
assert.match(app, /lifeStageCopyFor/);
assert.match(app, /dataset\.lifeStage/);
assert.match(css, /\.life-stage-card/);
assert.match(css, /\.life-stage-action\.selected/);
assert.match(css, /\.quarter-result-visual/);
assert.match(css, /\.game-toast/);
assert.match(app, /showGameToast/);
assert.match(mainlineSystem, /buildLifeMainline/);
assert.match(mainlineSystem, /mainlineLinksForOption/);
assert.match(mainlineSystem, /survival/);
assert.match(mainlineSystem, /development/);
assert.match(mainlineSystem, /aspiration/);
assert.match(mainlineSystem, /youthMainlinePayoffReview/);
assert.match(youthMainlineSystem, /handleYouthMainlineOpportunity/);
assert.match(youthMainlineSystem, /buildUnlockedMainlineActivities/);
assert.match(youthMainlineSystem, /recordYouthMainlineFollowThrough/);

for (const relativePath of Object.values(DATA_FILES)) {
  const absolutePath = path.join(projectRoot, ...relativePath.split("/"));
  assert.ok(fs.existsSync(absolutePath), `游戏数据文件不存在：${relativePath}`);
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(absolutePath, "utf8")));
}

const server = createGameServer(projectRoot);
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const address = server.address();
const port = address.port;

try {
  const paths = [
    "/",
    "/public/styles.css",
    "/public/app.mjs",
    "/public/browser-platform.mjs",
    "/public/life-stage-renderer.mjs",
    "/public/assets/life-stage/primary-1984-base.webp",
    "/public/assets/life-stage/player-1984.webp",
    "/public/assets/life-stage/action-study.webp",
    "/public/assets/life-stage/action-play.webp",
    "/public/assets/life-stage/action-family.webp",
    "/public/assets/game-shell/title-1978.webp",
    "/public/assets/game-shell/growth-room.webp",
    "/public/assets/game-shell/relations-courtyard.webp",
    "/public/assets/game-shell/timeline-road.webp",
    "/public/assets/game-shell/memory-room.webp",
    "/public/vendor/phosphor/style.css",
    "/public/vendor/phosphor/Phosphor-Duotone.woff2",
    "/src/app/routes.mjs",
    "/src/game/game-application.mjs",
    "/src/game/page-presenter.mjs",
    "/src/game/game-engine.mjs",
    "/src/simulation/life-mainline-system.mjs",
    "/src/simulation/youth-mainline-payoff-system.mjs",
    "/data/calibration/adult_life_1992_2025.json",
    "/data/childhood_play_content.json",
    "/data/youth_mainline_payoffs.json",
  ];
  for (const requestPath of paths) {
    const response = await fetch(`http://127.0.0.1:${port}${requestPath}`);
    assert.equal(response.status, 200, `${requestPath} 应返回200`);
    assert.ok((await response.arrayBuffer()).byteLength > 0, `${requestPath} 不应为空`);
  }
} finally {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

console.log(JSON.stringify({
  ok: true,
  htmlElementCount: htmlIds.size,
  referencedElementCount: appIds.size,
  dataFileCount: Object.keys(DATA_FILES).length,
  httpResourcesChecked: 26,
  checks: [
    "dom_id_contract",
    "vertical_viewport_and_layout",
    "keyboard_focus_and_reduced_motion",
    "save_and_choice_wiring",
    "five_main_page_routes_and_flow_screens",
    "application_presenter_and_platform_boundaries",
    "annual_ledger_surface",
    "childhood_process_growth_and_memory_surfaces",
    "all_life_stages_canvas_scene_and_action_visuals",
    "whole_game_scene_assets_and_local_icon_font",
    "collapsible_debug_drawer",
    "dynamic_life_mainline_quests_directions_and_ending_surfaces",
    "youth_payoff_event_and_age_18_causal_review_surfaces",
    "cross_life_untraveled_path_gallery",
    "unavailable_operation_disabled_state",
    "data_file_presence_and_json",
    "local_http_resources",
  ],
}, null, 2));
