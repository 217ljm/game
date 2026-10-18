import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
const participantId = argument("participant");
const observerId = argument("observer-id");
const dryRun = args.includes("--dry-run");
if (!batchArgument) throw new Error("请通过 --batch 指定盲测批次目录");
if (!/^P0[1-8]$/.test(participantId ?? "")) throw new Error("--participant 必须是 P01—P08");
if (!/^[A-Za-z0-9][A-Za-z0-9_-]{1,31}$/.test(observerId ?? "")) {
  throw new Error("--observer-id 必须是 2—32 位匿名字母、数字、下划线或连字符编号");
}
if (!dryRun && !args.includes("--confirm-human-present")) {
  throw new Error("只有真人参与者已经在场时才能创建记录；请显式添加 --confirm-human-present，或先用 --dry-run 检查");
}

const batchRoot = path.resolve(projectRoot, batchArgument);
const allowedRoot = path.resolve(projectRoot, "artifacts", "playtest", "age6-p2-v1");
if (path.dirname(batchRoot) !== allowedRoot) throw new Error("批次必须位于 artifacts/playtest/age6-p2-v1/ 下");
const manifest = readJson(path.join(batchRoot, "manifest.json"));
if (manifest.status !== "scheduled") throw new Error(`批次状态 ${manifest.status ?? "missing"} 不允许开始真人会话`);
const assignment = manifest.assignments?.find((entry) => entry.participantId === participantId);
if (!assignment) throw new Error(`${participantId} 不在该批次的冻结分组中`);

const recordPath = path.join(batchRoot, "records", `${participantId}.json`);
if (fs.existsSync(recordPath)) throw new Error(`${participantId} 的记录已经存在，拒绝覆盖`);
const template = readJson(path.join(projectRoot, "playtests", "age6-p2", "participant-record.template.json"));
const record = structuredClone(template);
record.studyId = manifest.studyId;
record.batchId = manifest.batchId;
record.participantId = participantId;
record.sessionStatus = "in_progress";
record.session.startedAt = new Date().toISOString();
record.session.endedAt = "";
record.session.observerId = observerId;
record.session.viewport = structuredClone(manifest.environment.primaryViewport);
record.session.assignedDraftCondition = assignment.draftCondition;
record.session.assignedEventCondition = assignment.eventCondition;
record.session.reducedMotion = assignment.motionMode === "reduced";
record.session.muted = assignment.sound === "off";
record.session.saveRestoreTask = assignment.saveRestoreTask;
record.session.hostPromptCount = 0;
record.session.debugUiSeen = false;
record.evidence = [];
record.issues = [];

const observationValues = Object.values(record.observations ?? {});
if (observationValues.some((entry) => entry.status !== "not_observed")) {
  throw new Error("记录模板包含非 not_observed 的预填观察，拒绝创建");
}
if (Object.values(record.eligibility ?? {}).some((value) => value !== null)
  || record.consent?.anonymousObservation !== null
  || record.consent?.notesUse !== null
  || Object.values(record.attestation ?? {}).some((value) => value !== null && value !== "")) {
  throw new Error("记录模板预填了真人资格、同意或证明字段，拒绝创建");
}

const output = {
  ok: true,
  status: dryRun ? "dry-run-no-files-written" : "in-progress-record-created",
  batchId: manifest.batchId,
  participantId,
  observerId,
  launchPath: assignment.launchPath,
  recordPath: path.relative(projectRoot, recordPath).replaceAll("\\", "/"),
  record,
  warnings: [
    "此文件不是通过证据；必须现场填写资格、同意、观察、原话、证据引用和证明后才能改为 completed。",
    "不得写入真实姓名、联系方式或身份映射。",
  ],
};

if (!dryRun) {
  const evidenceDirectory = path.join(batchRoot, "evidence", participantId);
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  fs.writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`);
  fs.writeFileSync(path.join(evidenceDirectory, "notes.md"), [
    `# ${participantId} 真人会话现场笔记`,
    "",
    "> 状态：in_progress。此空白骨架本身不是验收证据，不得据此填写 pass。",
    "",
    `- 批次：${manifest.batchId}`,
    `- 观察者：${observerId}`,
    `- 开始时间：${record.session.startedAt}`,
    "- 参与者真实身份：不得写入仓库",
    "",
    "## 时间戳、原话与行为",
    "",
    "## 资源不足与事件打断",
    "",
    "## Q4、7 岁、人物/兴趣、记录页与保存恢复",
    "",
    "## 技术问题与主持人提示",
    "",
  ].join("\n"));
}

console.log(JSON.stringify(output, null, 2));
