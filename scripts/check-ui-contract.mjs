import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DATA_FILES } from "../src/game/load-game-data.mjs";
import { createGameServer } from "./serve-game.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...segments) => fs.readFileSync(path.join(projectRoot, ...segments), "utf8");
const html = read("public", "index.html");
const app = read("public", "app.mjs");
const css = read("public", "styles.css");
const routes = read("src", "app", "routes.mjs");
const application = read("src", "game", "game-application.mjs");
const pagePresenter = read("src", "game", "page-presenter.mjs");
const presenter = read("src", "game", "presenter.mjs");
const browserPlatform = read("public", "browser-platform.mjs");
const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
const appIds = new Set([...app.matchAll(/\bbyId\("([^"]+)"\)/g)].map((match) => match[1]));

for (const id of appIds) assert.ok(htmlIds.has(id), `app.mjs 引用了页面中不存在的 #${id}`);
for (const id of [
  "loading-screen", "start-screen", "new-life-screen", "game-screen", "random-event-screen",
  "quarter-result-screen", "year-review-screen", "person-detail-screen", "ending-screen", "error-screen",
  "life-simulator-main", "simulator-year", "simulator-age", "simulator-quarter", "simulator-stage",
  "simulator-time", "simulator-energy", "simulator-cash", "simulator-responsibility-list",
  "simulator-quarter-list", "simulator-draft-list", "simulator-recent-list", "simulator-module-list",
  "simulator-primary-action", "life-action-drawer", "life-action-drawer-list", "life-action-drawer-close",
  "life-action-drawer-done", "quarter-interruption-card", "quarter-interruption-list",
  "confirm-plan-button", "plan-intensity-list", "debug-panel",
]) assert.ok(htmlIds.has(id), `缺少冻结主流程元素 #${id}`);

assert.match(html, /name="viewport"/);
assert.match(html, /data-route="life"/);
assert.doesNotMatch(html, /data-route="map"/);
assert.doesNotMatch(html, /data-route="scene"/);
assert.doesNotMatch(app, /LifeStageRenderer|lifeStageSceneFor|lifeStageCopyFor/);
assert.doesNotMatch(app, /world-map-board|map-location-panel/);
assert.match(html, /data-route="character"/);
assert.match(html, /data-route="relations"/);
assert.match(html, /data-route="records"/);
assert.match(html, /href="\/public\/styles\.css"/);
assert.match(html, /src="\/public\/app\.mjs"/);

assert.match(css, /width:\s*min\(100%,\s*470px\)/);
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /focus-visible/);
assert.match(css, /\.simulator-module-list|\.life-action-drawer/);
assert.match(css, /\.simulator-primary-action\s*\{[^}]*position:\s*fixed/s);
assert.match(css, /\.simulator-primary-action\[hidden\]/);
assert.match(css, /\.main-navigation\s*\{[^}]*grid-template-columns:\s*repeat\(4,/s);
assert.match(css, /\.simulator-quarter-list|\.quarter-progress-list/);
assert.match(css, /\.option-button:disabled/);
assert.match(app, /people-life:active:v5/);
assert.match(app, /people-life:backup:v5/);
assert.match(app, /restoreFirstValidSave\(\{/);
assert.match(app, /rotateRecoverableSave\(\{/);
assert.match(app, /buildPageViewModels/);
assert.match(app, /type:\s*"quarter\.plan"/);
assert.match(app, /eventId/);
assert.match(app, /selectedIds|actionIntensityDrafts/);
assert.match(app, /primary\.hidden\s*=\s*selected\.length\s*</);
assert.match(app, /life-simulator-main"\)\.hidden\s*=\s*!quarterPlan/);
assert.match(app, /event-card"\)\.hidden\s*=\s*!pending\s*\|\|\s*quarterPlan/);
assert.match(app, /hideGameToast/);
assert.match(app, /people-life:debug:v1/);
assert.match(application, /applySessionChoice/);
assert.match(application, /runLifeSession/);
assert.match(routes, /MAIN_ROUTES/);
assert.match(routes, /parseRouteHash/);
assert.match(pagePresenter, /buildPageViewModels/);
assert.match(pagePresenter, /age6/);
assert.match(presenter, /buildAge6SliceView/);
assert.match(browserPlatform, /localStorage/);

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
const port = server.address().port;
try {
  for (const requestPath of [
    "/", "/public/styles.css", "/public/app.mjs", "/public/browser-platform.mjs",
    "/src/app/routes.mjs", "/src/game/game-application.mjs", "/src/game/page-presenter.mjs",
    "/src/game/presenter.mjs", "/src/game/game-engine.mjs", "/data/gameplay/quarterly_age6_1984.json",
  ]) {
    const response = await fetch(`http://127.0.0.1:${port}${requestPath}`);
    assert.equal(response.status, 200, `${requestPath} 应返回200`);
    assert.ok((await response.arrayBuffer()).byteLength > 0, `${requestPath} 不应为空`);
  }
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

console.log(JSON.stringify({
  ok: true,
  contract: "p0-p2-life-hud-quarter-draft-v1",
  htmlElementCount: htmlIds.size,
  referencedElementCount: appIds.size,
  dataFileCount: Object.keys(DATA_FILES).length,
  checks: [
    "life_route_without_scene_map_navigation",
    "life_hud_resources_obligations_quarter_track",
    "multi_action_draft_and_event_id_command",
    "age6_registry_and_presenter_viewmodel",
    "v5_formal_debug_save_restore_wiring",
    "data_file_presence_and_local_http_resources",
  ],
}, null, 2));
