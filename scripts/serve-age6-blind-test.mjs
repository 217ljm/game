import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGameServer } from "./serve-game.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

function argument(name, fallback = null) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

const batchArgument = argument("batch");
if (!batchArgument) throw new Error("请通过 --batch 指定盲测批次目录");
const batchRoot = path.resolve(projectRoot, batchArgument);
const allowedRoot = path.resolve(projectRoot, "artifacts", "playtest", "age6-p2-v1");
if (path.dirname(batchRoot) !== allowedRoot) throw new Error("批次必须位于 artifacts/playtest/age6-p2-v1/ 下");

const manifestPath = path.join(batchRoot, "manifest.json");
if (!fs.existsSync(manifestPath)) throw new Error("盲测批次缺少 manifest.json");
const manifest = readJson(manifestPath);
if (manifest.status !== "scheduled") throw new Error(`批次状态 ${manifest.status ?? "missing"} 不允许启动真人会话`);
const releasePath = path.join(projectRoot, "dist", "release-info.json");
if (!fs.existsSync(releasePath)) throw new Error("缺少已冻结的 dist/release-info.json");
const release = readJson(releasePath);
if (release.contentSha256 !== manifest.buildFingerprint?.releaseContentSha256) {
  throw new Error("当前 dist 与批次候选指纹不同；不得启动真人会话");
}

const host = argument("host", "127.0.0.1");
const port = Number(argument("port", "4173"));
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("--port 必须是 1—65535 的整数");
const loopbackHosts = new Set(["127.0.0.1", "::1", "localhost"]);
if (!loopbackHosts.has(host) && !args.includes("--allow-lan")) {
  throw new Error("非本机监听必须显式添加 --allow-lan；只在受信任局域网中使用");
}

function advertisedHosts() {
  if (loopbackHosts.has(host)) return [host];
  if (host !== "0.0.0.0" && host !== "::") return [host];
  const addresses = Object.values(os.networkInterfaces()).flat()
    .filter((entry) => entry && entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address);
  return addresses.length > 0 ? addresses : ["<本机局域网IP>"];
}

const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), "people-life-age6-blind-host-"));
fs.cpSync(path.join(projectRoot, "dist"), path.join(stagingRoot, "dist"), { recursive: true });
for (const directory of ["src", "data", "public"]) {
  fs.cpSync(path.join(projectRoot, "dist", directory), path.join(stagingRoot, directory), { recursive: true });
}
fs.cpSync(path.join(projectRoot, "public", "playtest"), path.join(stagingRoot, "public", "playtest"), { recursive: true });

function cleanupStaging() {
  const tempRoot = path.resolve(os.tmpdir());
  const resolved = path.resolve(stagingRoot);
  if (path.dirname(resolved) === tempRoot && path.basename(resolved).startsWith("people-life-age6-blind-host-")) {
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}

const server = createGameServer(stagingRoot);
server.once("error", (error) => {
  cleanupStaging();
  console.error(`盲测主持服务启动失败：${error.message}`);
  process.exitCode = 1;
});
server.listen(port, host, () => {
  const hosts = advertisedHosts();
  const participants = manifest.assignments.map((assignment) => ({
    participantId: assignment.participantId,
    launchUrls: hosts.map((entry) => `http://${entry}:${port}${assignment.launchPath}`),
    facilitatorOnlyConditions: {
      draft: assignment.draftCondition,
      event: assignment.eventCondition,
      motion: assignment.motionMode,
      sound: assignment.sound,
      saveRestoreTask: assignment.saveRestoreTask,
      recordsTask: assignment.recordsTask,
    },
    recordStatus: fs.existsSync(path.join(batchRoot, "records", `${assignment.participantId}.json`)) ? "exists" : "not_started",
  }));
  console.log(JSON.stringify({
    ok: true,
    status: "serving-facilitator-launches",
    batchId: manifest.batchId,
    releaseContentSha256: release.contentSha256,
    bind: { host, port, lanExplicitlyAllowed: args.includes("--allow-lan") },
    isolatedStaging: true,
    privacyWarning: "分组条件仅供主持人查看，不得向参与者展示本终端输出或 manifest。",
    participants,
  }, null, 2));
  console.log("按 Ctrl+C 停止主持服务。");
});

function close() {
  server.close(() => {
    cleanupStaging();
    process.exit(0);
  });
}
process.once("SIGINT", close);
process.once("SIGTERM", close);
process.once("exit", cleanupStaging);
