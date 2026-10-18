import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(projectRoot, "dist");
const requiredFiles = [
  "index.html",
  "manifest.webmanifest",
  "release-info.json",
  "public/app.mjs",
  "public/styles.css",
  "public/service-worker.js",
  "public/assets/icons/app-icon.svg",
  "public/assets/life-stage/character-age-atlas-v1.webp",
  "src/game/game-engine.mjs",
  "src/app/save-recovery.mjs",
  "data/annual_life_operations.json",
  "data/quarterly_life_content.json",
];
for (const relative of requiredFiles) {
  assert.ok(fs.existsSync(path.join(distRoot, relative)), `发布包缺少 ${relative}`);
}

for (const forbidden of ["docs", "scripts", "artifacts", "node_modules", ".git"]) {
  assert.ok(!fs.existsSync(path.join(distRoot, forbidden)), `发布包不应包含 ${forbidden}`);
}
for (const forbidden of [
  "public/light-scene",
  "public/spikes",
  "public/playtest",
  "public/vendor/phaser",
  "src/game/light-scene-contract.mjs",
  "src/game/light-scene-core-bridge.mjs",
  "data/gameplay/light_scene_yard_1984.json",
]) {
  assert.ok(!fs.existsSync(path.join(distRoot, forbidden)), `发布包不应包含开发期原型 ${forbidden}`);
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

const files = walk(distRoot);
const totalBytes = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
assert.ok(totalBytes < 25 * 1024 * 1024, `H5 包体超过 25MB：${totalBytes}`);

const indexHtml = fs.readFileSync(path.join(distRoot, "index.html"), "utf8");
assert.match(indexHtml, /viewport-fit=cover/);
assert.match(indexHtml, /\/public\/manifest\.webmanifest/);
assert.match(indexHtml, /type="module" src="\/public\/app\.mjs"/);
assert.doesNotMatch(indexHtml, /https?:\/\//);

const manifest = JSON.parse(fs.readFileSync(path.join(distRoot, "manifest.webmanifest"), "utf8"));
assert.equal(manifest.display, "standalone");
assert.equal(manifest.orientation, "portrait-primary");
assert.equal(manifest.start_url, "/#/title");
assert.ok(manifest.icons.some((icon) => icon.purpose.includes("maskable")));

const releaseInfo = JSON.parse(fs.readFileSync(path.join(distRoot, "release-info.json"), "utf8"));
assert.equal(releaseInfo.format, "static-h5");
assert.equal(releaseInfo.routing, "hash");
assert.match(releaseInfo.contentSha256, /^[a-f0-9]{64}$/);

const textExtensions = new Set([".html", ".css", ".mjs", ".js", ".json", ".webmanifest", ".svg"]);
const externalRuntimeReferences = files
  .filter((file) => textExtensions.has(path.extname(file)))
  .flatMap((file) => {
    const text = fs.readFileSync(file, "utf8");
    return /(?:src|href)=["']https?:\/\//i.test(text) || /@import\s+url\(["']?https?:\/\//i.test(text)
      ? [path.relative(distRoot, file)]
      : [];
  });
assert.deepEqual(externalRuntimeReferences, [], `存在外部运行时资源：${externalRuntimeReferences.join(", ")}`);

console.log(JSON.stringify({
  ok: true,
  fileCount: files.length,
  totalBytes,
  totalMegabytes: Math.round(totalBytes / 1024 / 1024 * 100) / 100,
  checks: [
    "static_h5_required_files",
    "development_only_directories_excluded",
    "hash_route_root_entry",
    "portrait_standalone_manifest_and_maskable_icon",
    "no_external_runtime_asset_dependency",
    "package_below_25mb",
    "release_manifest_sha256",
  ],
}, null, 2));
