import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(projectRoot, relativePath));

const requiredFiles = [
  "apps/game/index.html",
  "apps/game/vite.config.ts",
  "apps/game/tsconfig.json",
  "apps/game/src/main.ts",
  "apps/game/src/contracts.ts",
  "apps/game/src/game-shell.css",
  "apps/game/src/assets/asset-manifest.ts",
  "apps/game/src/assets/asset-loader.ts",
  "apps/game/src/runtime/create-game-runtime.ts",
  "apps/game/src/runtime/deferred-game-runtime-port.ts",
  "apps/game/src/runtime/create-gateway-runtime-port.ts",
  "apps/game/src/runtime/v5-browser-save.ts",
  "apps/game/src/screens/boot-scene.ts",
  "apps/game/src/screens/preload-scene.ts",
  "apps/game/src/screens/startup-scene.ts",
  "apps/game/src/screens/game-flow-scene.ts",
  "apps/game/src/screens/life-scene.ts",
  "apps/game/src/screens/main-menu-scene.ts",
  "apps/game/src/screens/menu-utility-scene.ts",
  "apps/game/src/screens/event-scene.ts",
  "apps/game/src/screens/quarter-execution-scene.ts",
  "apps/game/src/screens/quarter-result-scene.ts",
  "apps/game/src/screens/year-review-scene.ts",
  "apps/game/src/screens/age-entry-scene.ts",
  "apps/game/src/screens/records-scene.ts",
  "apps/game/src/ui/p2-screen-primitives.ts",
  "apps/game/src/presentation/game-presentation-director.ts",
  "apps/game/src/presentation/presentation-cue.ts",
  "apps/game/src/presentation/procedural-game-feedback.ts",
  "src/game/game-runtime-presenter.mjs",
];
for (const relativePath of requiredFiles) {
  assert.ok(exists(relativePath), `正式游戏运行时缺少 ${relativePath}`);
}

const packageInfo = JSON.parse(read("package.json"));
for (const dependency of ["phaser", "typescript", "vite"]) {
  assert.ok(packageInfo.devDependencies?.[dependency], `devDependencies 缺少 ${dependency}`);
}
for (const script of [
  "game:play",
  "game:build",
  "game:typecheck",
  "game:foundation:check",
  "game:browser:check",
  "game:startup:browser:check",
  "game:p1:browser:check",
  "game:p2:browser:check",
  "game:check",
]) {
  assert.ok(packageInfo.scripts?.[script], `package scripts 缺少 ${script}`);
}

const html = read("apps/game/index.html");
assert.match(html, /id="game-root"/);
assert.match(html, /type="module" src="\/src\/main\.ts"/);
assert.doesNotMatch(html, /<(?:form|article|nav|section)\b/i, "正式入口必须是薄游戏壳，不得复制网页页面");

const contracts = read("apps/game/src/contracts.ts");
assert.match(contracts, /GAME_WIDTH\s*=\s*390/);
assert.match(contracts, /GAME_HEIGHT\s*=\s*844/);
assert.match(contracts, /protocol:\s*"game-runtime-snapshot-v2"/);
for (const screen of ["life", "event", "quarter-execution", "quarter-result", "year-review", "age-entry", "records"]) {
  assert.ok(contracts.includes(`"${screen}"`), `P2 Runtime 状态缺少 ${screen}`);
}
for (const cue of [
  "screen.enter",
  "action.scheduled",
  "action.resolve",
  "resource.delta",
  "person.react",
  "event.interrupt",
  "month.advance",
  "quarter.complete",
  "year.advance",
]) {
  assert.ok(contracts.includes(`"${cue}"`), `表现协议缺少 ${cue}`);
}

const main = read("apps/game/src/main.ts");
assert.match(main, /createGatewayRuntimePort/);
assert.doesNotMatch(main, /createP0RuntimePort|mock/i, "正式入口不得接入假运行时端口");

const manifest = read("apps/game/src/assets/asset-manifest.ts");
assert.match(manifest, /AssetKey/);
assert.match(manifest, /fallback:\s*"procedural"/);

const runtimeFactory = read("apps/game/src/runtime/create-game-runtime.ts");
assert.match(runtimeFactory, /BootScene/);
assert.match(runtimeFactory, /PreloadScene/);
assert.match(runtimeFactory, /StartupScene/);
assert.match(runtimeFactory, /MainMenuScene/);
assert.match(runtimeFactory, /MenuUtilityScene/);
assert.match(runtimeFactory, /LifeScene/);

const startupScene = read("apps/game/src/screens/startup-scene.ts");
assert.match(startupScene, /game-startup-scene-v1/);
assert.match(startupScene, /placeholderEmblem:\s*true/);
assert.match(startupScene, /MOTION_LEVEL_REGISTRY_KEY/);
assert.doesNotMatch(startupScene, /GameRuntimePort|localStorage|sessionStorage|quarter\.plan/, "启动过场不得读取 Core 或存档");

const mainMenuScene = read("apps/game/src/screens/main-menu-scene.ts");
assert.match(mainMenuScene, /game-main-menu-v2/);
assert.match(mainMenuScene, /新游戏/);
assert.match(mainMenuScene, /继续游戏/);
assert.doesNotMatch(mainMenuScene, /localStorage|sessionStorage|quarter\.plan/, "主菜单 Scene 不得读取存档或提交 Core 命令");

const menuUtilityScene = read("apps/game/src/screens/menu-utility-scene.ts");
assert.match(menuUtilityScene, /game-menu-utility-v1/);
for (const label of ["存档", "设置", "关于", "声音", "震动反馈"]) assert.ok(menuUtilityScene.includes(label), `主菜单辅助页缺少 ${label}`);
assert.doesNotMatch(menuUtilityScene, /localStorage|sessionStorage|quarter\.plan/, "菜单辅助 Scene 不得读取存档或提交 Core 命令");
for (const scene of ["GameFlowScene", "EventScene", "QuarterExecutionScene", "QuarterResultScene", "YearReviewScene", "AgeEntryScene", "RecordsScene"]) {
  assert.ok(runtimeFactory.includes(scene), `P2 Runtime 缺少 ${scene}`);
}

for (const key of ["player.childNeutral", "action.study", "action.play", "action.family"]) {
  assert.ok(manifest.includes(`"${key}"`), `正式素材清单缺少稳定素材 ${key}`);
}

const lifeScene = read("apps/game/src/screens/life-scene.ts");
assert.match(lifeScene, /p1-life-screen-v1/);
assert.match(lifeScene, /GamePresentationDirector/);

const tsconfig = JSON.parse(read("apps/game/tsconfig.json"));
assert.equal(tsconfig.compilerOptions?.strict, true, "正式游戏 TypeScript 必须启用 strict");
assert.equal(tsconfig.compilerOptions?.noEmit, true, "类型检查不得写入旁路产物");

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

const runtimeFiles = walk(path.join(projectRoot, "apps", "game", "src"))
  .filter((file) => file.endsWith(".ts"));
const runtimeText = runtimeFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
assert.doesNotMatch(runtimeText, /public\/(?:app\.mjs|styles\.css|index\.html)/, "正式游戏不得导入旧 DOM 主屏");
assert.doesNotMatch(runtimeText, /light-scene|light_scene/i, "正式游戏不得导入旧轻场景");
assert.doesNotMatch(runtimeText, /\b(?:pathfinding|hotspot|moveTo|Phaser\.Physics|physics\.add)\b/i, "P0 不得接入移动、热点或物理");

const presenter = read("src/game/game-runtime-presenter.mjs");
assert.match(presenter, /buildGameRuntimeSnapshot/);
assert.match(presenter, /mapGameRuntimeCues/);
assert.doesNotMatch(presenter, /\b(?:window|document|localStorage|sessionStorage)\b\s*[.\[]|from\s+["']phaser["']/);
assert.doesNotMatch(presenter, /Math\.random\s*\(/);

const simulationText = walk(path.join(projectRoot, "src", "simulation"))
  .filter((file) => file.endsWith(".mjs"))
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");
assert.doesNotMatch(simulationText, /\b(?:window|document|localStorage|sessionStorage)\b\s*[.\[]|from\s+["']phaser["']/);

console.log(JSON.stringify({
  ok: true,
  checks: [
    "thin_game_entry",
    "vite_typescript_phaser_dependencies",
    "strict_runtime_contract",
    "fixed_390x844_logical_canvas",
    "no_legacy_dom_or_light_scene_import",
    "no_movement_hotspot_or_physics",
    "pure_presentation_mapper",
    "simulation_renderer_independence",
  ],
  runtimeFileCount: runtimeFiles.length,
}, null, 2));
