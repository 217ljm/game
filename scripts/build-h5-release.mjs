import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");
const distRoot = path.resolve(projectRoot, "dist");

if (path.dirname(distRoot) !== projectRoot || path.basename(distRoot) !== "dist") {
  throw new Error(`拒绝清理未确认的发布目录：${distRoot}`);
}

fs.rmSync(distRoot, { recursive: true, force: true });
fs.mkdirSync(distRoot, { recursive: true });

const archivedRuntimeFiles = new Set([
  path.join(projectRoot, "src", "game", "light-scene-contract.mjs"),
  path.join(projectRoot, "src", "game", "light-scene-core-bridge.mjs"),
  path.join(projectRoot, "data", "gameplay", "light_scene_yard_1984.json"),
].map((entry) => path.resolve(entry)));
for (const directory of ["src", "data"]) {
  fs.cpSync(path.join(projectRoot, directory), path.join(distRoot, directory), {
    recursive: true,
    filter: (source) => !archivedRuntimeFiles.has(path.resolve(source)),
  });
}
const publicRoot = path.join(projectRoot, "public");
const developmentOnlyPublicRoots = [
  path.join(publicRoot, "light-scene"),
  path.join(publicRoot, "spikes"),
  path.join(publicRoot, "playtest"),
  path.join(publicRoot, "vendor", "phaser"),
];
fs.cpSync(publicRoot, path.join(distRoot, "public"), {
  recursive: true,
  filter: (source) => {
    const resolved = path.resolve(source);
    if (resolved === path.join(publicRoot, "index.html")) return false;
    return !developmentOnlyPublicRoots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`));
  },
});
fs.copyFileSync(path.join(projectRoot, "public", "index.html"), path.join(distRoot, "index.html"));
fs.copyFileSync(
  path.join(projectRoot, "public", "manifest.webmanifest"),
  path.join(distRoot, "manifest.webmanifest"),
);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

const filesBeforeMetadata = walk(distRoot);
const bytes = filesBeforeMetadata.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const digest = crypto.createHash("sha256");
for (const file of filesBeforeMetadata.sort()) {
  digest.update(path.relative(distRoot, file).replaceAll("\\", "/"));
  digest.update(fs.readFileSync(file));
}
const packageInfo = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
const generatedAt = process.env.SOURCE_DATE_EPOCH
  ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString()
  : new Date().toISOString();
const releaseInfo = {
  game: "1978—一生",
  format: "static-h5",
  version: packageInfo.version,
  generatedAt,
  entry: "index.html",
  routing: "hash",
  fileCount: filesBeforeMetadata.length + 1,
  bytes,
  contentSha256: digest.digest("hex"),
};
fs.writeFileSync(path.join(distRoot, "release-info.json"), `${JSON.stringify(releaseInfo, null, 2)}\n`);

console.log(JSON.stringify({ ok: true, distRoot, ...releaseInfo }, null, 2));
