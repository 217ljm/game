import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

function argument(name, fallback = null) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function git(...gitArgs) {
  try {
    return execFileSync("git", gitArgs, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 16 * 1024 * 1024,
    }).trim();
  } catch {
    return null;
  }
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

const batchId = argument("batch-id");
const participantCount = Number(argument("participants", "6"));
if (!batchId || !/^[a-z0-9][a-z0-9-]{4,63}$/.test(batchId)) {
  throw new Error("必须提供安全的 --batch-id，例如 age6-p2-20260824-b01");
}
if (!Number.isInteger(participantCount) || participantCount < 5 || participantCount > 8) {
  throw new Error("--participants 必须是 5～8 的整数");
}

const releaseInfoPath = path.join(projectRoot, "dist", "release-info.json");
if (!fs.existsSync(releaseInfoPath)) throw new Error("请先运行 npm run h5:build，冻结实际候选包");
const releaseInfo = readJson(releaseInfoPath);
if (!/^[a-f0-9]{64}$/.test(releaseInfo.contentSha256 ?? "")) throw new Error("H5 候选包缺少合法 contentSha256");

const publicRoot = path.join(projectRoot, "public");
const ignoredPublicRoots = ["light-scene", "spikes", "playtest", path.join("vendor", "phaser")]
  .map((relative) => path.resolve(publicRoot, relative));
const runtimeFiles = [
  ...walk(path.join(projectRoot, "src")),
  ...walk(path.join(projectRoot, "data")),
  ...walk(publicRoot).filter((file) => !ignoredPublicRoots.some((root) => file === root || file.startsWith(`${root}${path.sep}`))),
  path.join(projectRoot, "package.json"),
  path.join(projectRoot, "package-lock.json"),
];
const releaseMtime = fs.statSync(releaseInfoPath).mtimeMs;
const newerRuntime = runtimeFiles.filter((file) => fs.statSync(file).mtimeMs > releaseMtime + 5);
if (newerRuntime.length > 0) {
  throw new Error(`H5 候选包早于当前正式运行文件；请重新运行 npm run h5:build。首个较新文件：${path.relative(projectRoot, newerRuntime[0])}`);
}

const outputRoot = path.resolve(projectRoot, "artifacts", "playtest", "age6-p2-v1", batchId);
const allowedRoot = path.resolve(projectRoot, "artifacts", "playtest", "age6-p2-v1");
if (path.dirname(outputRoot) !== allowedRoot) throw new Error(`拒绝在盲测根目录之外创建批次：${outputRoot}`);
if (fs.existsSync(outputRoot)) throw new Error(`批次目录已存在，拒绝覆盖：${outputRoot}`);

const participantIds = Array.from({ length: participantCount }, (_, index) => `P${String(index + 1).padStart(2, "0")}`);
const exposedCount = Math.ceil(participantCount / 2);
const registry = readJson(path.join(projectRoot, "data", "gameplay", "quarterly_age6_1984.json"));
const assignments = participantIds.map((participantId, index) => {
  const draftCondition = index < exposedCount ? "resource_shortage" : "empty";
  const eventCondition = index < exposedCount
    ? (index % 2 === 0 ? "rainy_day_inside" : "minor_play_injury")
    : "natural";
  const motionMode = index === 1 ? "reduced" : "full";
  const sound = index === 2 ? "off" : "on";
  const query = new URLSearchParams({
    batch: batchId,
    participant: participantId,
    draft: draftCondition,
    event: eventCondition,
    motion: motionMode,
    sound,
    build: releaseInfo.contentSha256,
  });
  return {
    participantId,
    seed: "age6-blind-p2-v1",
    draftCondition,
    eventCondition,
    motionMode,
    sound,
    saveRestoreTask: index === Math.min(3, participantCount - 1),
    recordsTask: true,
    launchPath: `/public/playtest/age6.html?${query}`,
  };
});

const gitStatus = git("status", "--porcelain=v1") ?? "git-unavailable";
const gitDiff = git("diff", "--no-ext-diff", "--no-textconv", "HEAD") ?? "git-unavailable";
const manifest = {
  schemaVersion: "age6-blind-manifest-v1",
  studyId: "life.age6.p2.exploratory",
  batchId,
  status: "scheduled",
  protocolVersion: "P2-v2",
  baselineDocument: "docs/QUARTERLY_LIFE_SIMULATOR_MASTER_PLAN.md",
  baselineSections: ["13.4", "18.3"],
  protocolDocument: "docs/AGE6_QUARTERLY_SIMULATOR_BLIND_TEST.md",
  sliceId: registry.slice.id,
  contentVersion: registry.contentVersion,
  entryRoute: "#/life",
  plannedParticipantIds: participantIds,
  assignments,
  environment: {
    primaryViewport: { width: 390, height: 844 },
    touchPreferred: true,
    debugUiVisible: false,
    candidatePath: "/dist/#/life",
  },
  buildFingerprint: {
    version: releaseInfo.version,
    releaseGeneratedAt: releaseInfo.generatedAt,
    releaseContentSha256: releaseInfo.contentSha256,
    releaseFileCount: releaseInfo.fileCount,
    releaseBytes: releaseInfo.bytes,
    gitHead: git("rev-parse", "HEAD"),
    gitDirty: gitStatus.length > 0,
    gitStatusSha256: sha256(gitStatus),
    gitDiffSha256: sha256(gitDiff),
    packageJsonSha256: sha256(fs.readFileSync(path.join(projectRoot, "package.json"))),
    packageLockSha256: sha256(fs.readFileSync(path.join(projectRoot, "package-lock.json"))),
  },
  automationEvidence: {
    requiredCommands: [
      "npm run check",
      "npm run ui:check",
      "npm run browser:check",
      "npm run h5:check",
      "npm run age6:blind:browser:check",
    ],
    checks: [],
    phoneScreenshotReviewed: null,
    desktopScreenshotReviewed: null,
    reviewerId: "",
    reviewedAt: "",
  },
  privacy: {
    realNamesStored: false,
    contactDataStored: false,
    identityMapOutsideRepository: true,
    recordingsRequireConsent: true,
  },
  createdAt: new Date().toISOString(),
  createdBy: "",
  exclusions: [],
};

fs.mkdirSync(path.join(outputRoot, "records"), { recursive: true });
fs.mkdirSync(path.join(outputRoot, "evidence"), { recursive: true });
fs.mkdirSync(path.join(outputRoot, "checks"), { recursive: true });
fs.writeFileSync(path.join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(JSON.stringify({
  ok: true,
  status: "scheduled",
  batchDirectory: outputRoot,
  participantCount,
  resourceShortageAssignments: assignments.filter((entry) => entry.draftCondition === "resource_shortage").length,
  forcedEventAssignments: assignments.filter((entry) => entry.eventCondition !== "natural").length,
  participantRecordsCreated: 0,
  releaseContentSha256: releaseInfo.contentSha256,
}, null, 2));
