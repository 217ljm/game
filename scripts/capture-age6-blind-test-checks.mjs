import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const batchIndex = args.indexOf("--batch");
if (batchIndex < 0 || !args[batchIndex + 1]) throw new Error("请通过 --batch 指定盲测批次目录");
const batchRoot = path.resolve(projectRoot, args[batchIndex + 1]);
const allowedRoot = path.resolve(projectRoot, "artifacts", "playtest", "age6-p2-v1");
if (path.dirname(batchRoot) !== allowedRoot) throw new Error("盲测批次必须位于 artifacts/playtest/age6-p2-v1/ 下");

const manifestPath = path.join(batchRoot, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const release = JSON.parse(fs.readFileSync(path.join(projectRoot, "dist", "release-info.json"), "utf8"));
if (release.contentSha256 !== manifest.buildFingerprint.releaseContentSha256) {
  throw new Error("当前 dist 与盲测批次候选指纹不同；不得把新构建的检查混入旧批次");
}

const npmCli = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
const useBundledNpmCli = fs.existsSync(npmCli);
const commands = [
  { command: "npm run check", args: ["run", "check"], log: "npm-run-check.log" },
  { command: "npm run ui:check", args: ["run", "ui:check"], log: "npm-run-ui-check.log" },
  { command: "npm run browser:check", args: ["run", "browser:check"], log: "npm-run-browser-check.log" },
  { command: "npm run h5:check", args: ["run", "h5:check"], log: "npm-run-h5-check.log" },
  {
    command: "npm run age6:blind:browser:check",
    args: ["run", "age6:blind:browser:check", "--", "--batch", path.relative(projectRoot, batchRoot)],
    log: "npm-run-age6-blind-browser-check.log",
  },
];
const checksDirectory = path.join(batchRoot, "checks");
fs.mkdirSync(checksDirectory, { recursive: true });
const evidence = [];

for (const entry of commands) {
  const startedAt = new Date().toISOString();
  const outcome = spawnSync(useBundledNpmCli ? process.execPath : "npm", useBundledNpmCli ? [npmCli, ...entry.args] : entry.args, {
    cwd: projectRoot,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024,
  });
  const exitCode = outcome.status ?? 1;
  const finishedAt = new Date().toISOString();
  const text = [
    `$ ${entry.command}`,
    `startedAt=${startedAt}`,
    `finishedAt=${finishedAt}`,
    `exitCode=${exitCode}`,
    "",
    outcome.stdout ?? "",
    outcome.stderr ?? "",
    outcome.error ? `spawnError=${outcome.error.code ?? "unknown"}: ${outcome.error.message}` : "",
  ].join("\n");
  const logPath = path.join(checksDirectory, entry.log);
  fs.writeFileSync(logPath, text);
  evidence.push({
    command: entry.command,
    exitCode,
    startedAt,
    finishedAt,
    logPath: path.relative(batchRoot, logPath).replaceAll("\\", "/"),
    logSha256: crypto.createHash("sha256").update(text).digest("hex"),
  });
  if (exitCode !== 0) {
    manifest.automationEvidence.checks = evidence;
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    throw new Error(`${entry.command} 失败；证据已写入 ${logPath}`);
  }
}

manifest.automationEvidence.checks = evidence;
manifest.automationEvidence.capturedAt = new Date().toISOString();
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  batchId: manifest.batchId,
  releaseContentSha256: release.contentSha256,
  checks: evidence,
}, null, 2));
