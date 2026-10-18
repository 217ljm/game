import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const batchIndex = args.indexOf("--batch");
if (batchIndex < 0 || !args[batchIndex + 1]) throw new Error("请通过 --batch 指定盲测批次目录");
const batchRoot = path.resolve(projectRoot, args[batchIndex + 1]);
const allowedRoot = path.resolve(projectRoot, "artifacts", "playtest", "age6-p2-v1");
if (path.dirname(batchRoot) !== allowedRoot) throw new Error("盲测批次必须位于 artifacts/playtest/age6-p2-v1/ 下");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function majority(count) {
  return Math.floor(count / 2) + 1;
}

function isPass(observation) {
  return observation?.status === "pass";
}

function referencedEvidence(record, observation) {
  const ids = new Set((record.evidence ?? []).map((entry) => entry.id));
  return Array.isArray(observation?.evidenceRefs)
    && observation.evidenceRefs.length > 0
    && observation.evidenceRefs.every((id) => ids.has(id));
}

const manifestPath = path.join(batchRoot, "manifest.json");
if (!fs.existsSync(manifestPath)) throw new Error("批次缺少 manifest.json");
const manifest = readJson(manifestPath);
const assignmentMap = new Map(manifest.assignments.map((entry) => [entry.participantId, entry]));
const recordDirectory = path.join(batchRoot, "records");
const recordFiles = fs.existsSync(recordDirectory)
  ? fs.readdirSync(recordDirectory).filter((file) => file.endsWith(".json")).sort()
  : [];
const records = [];
const validationErrors = [];
if (manifest.status !== "scheduled") validationErrors.push(`manifest: 批次状态 ${manifest.status ?? "missing"} 不允许验收`);
if ((manifest.exclusions ?? []).some((entry) => entry.scope === "entire_batch")) validationErrors.push("manifest: 整批已被排除，不允许验收");
const requiredObservationKeys = [
  "stateAndGoal30s", "ordinaryQuarterWithin3m", "twoActionsWithoutHelp", "timeGridMeaning",
  "immediateFeedback", "actionDifferenceCostObject", "longTermChange", "resourceShortage",
  "eventInterruption", "q4Age7", "recordsPage", "saveRestore", "mobileUsability",
  "noticedPersonInterestLongTerm",
];
const statusValues = new Set(["pass", "fail", "ambiguous", "not_observed", "not_evaluable"]);

for (const file of recordFiles) {
  const filePath = path.join(recordDirectory, file);
  const record = readJson(filePath);
  const prefix = `${file}:`;
  if (!/^P0[1-8]\.json$/.test(file)) validationErrors.push(`${prefix} 文件名必须是 P01—P08`);
  if (record.schemaVersion !== "age6-blind-participant-v1") validationErrors.push(`${prefix} schemaVersion 不匹配`);
  if (record.studyId !== manifest.studyId || record.batchId !== manifest.batchId) validationErrors.push(`${prefix} 批次或研究 ID 不匹配`);
  if (`${record.participantId}.json` !== file) validationErrors.push(`${prefix} participantId 与文件名不一致`);
  const assignment = assignmentMap.get(record.participantId);
  if (!assignment) validationErrors.push(`${prefix} 不在预先冻结的分组中`);
  if (record.sessionStatus !== "completed") validationErrors.push(`${prefix} 只有 completed 会话能进入有效样本`);
  for (const key of ["firstTimePlayer", "notProjectContributor", "didNotSeeImplementation", "testedIndependently"]) {
    if (record.eligibility?.[key] !== true) validationErrors.push(`${prefix} eligibility.${key} 必须明确为 true`);
  }
  if (record.consent?.anonymousObservation !== true || record.consent?.notesUse !== true || record.consent?.withdrawn !== false) {
    validationErrors.push(`${prefix} 匿名观察/笔记同意无效或已撤回`);
  }
  if (!record.session?.startedAt || !record.session?.endedAt || !record.session?.observerId) validationErrors.push(`${prefix} 缺少会话时间或观察者编号`);
  if (record.session?.debugUiSeen !== false) validationErrors.push(`${prefix} 参与者看到调试 UI，协议已污染`);
  if (assignment && (record.session?.assignedDraftCondition !== assignment.draftCondition || record.session?.assignedEventCondition !== assignment.eventCondition)) {
    validationErrors.push(`${prefix} 实际记录与预先分组不一致`);
  }
  if ((record.session?.technicalFailures ?? []).length > 0) validationErrors.push(`${prefix} 存在未关闭的技术失败`);
  if (record.attestation?.humanSessionObserved !== true
    || record.attestation?.notAutomationOrDeveloperProxy !== true
    || record.attestation?.recordedLive !== true
    || record.attestation?.noSyntheticData !== true
    || !record.attestation?.observerStatement
    || !record.attestation?.observerConfirmedAt) {
    validationErrors.push(`${prefix} 缺少真人现场观察与非合成数据声明`);
  }
  const evidenceIds = new Set();
  for (const evidence of record.evidence ?? []) {
    if (!evidence.id || evidenceIds.has(evidence.id)) validationErrors.push(`${prefix} evidence ID 缺失或重复`);
    evidenceIds.add(evidence.id);
    if (!evidence.kind || !evidence.sourcePath || !/^[a-f0-9]{64}$/.test(evidence.sha256 ?? "")) {
      validationErrors.push(`${prefix} evidence ${evidence.id ?? "?"} 缺少类型、索引或 SHA-256`);
    }
  }
  for (const key of requiredObservationKeys) {
    const observation = record.observations?.[key];
    if (!observation || !statusValues.has(observation.status)) validationErrors.push(`${prefix} observations.${key} 缺少合法 status`);
    if (observation?.status === "pass" && !referencedEvidence(record, observation)) validationErrors.push(`${prefix} observations.${key} 的 pass 缺少有效 evidenceRefs`);
  }
  const frame = record.interview?.whatWereYouDoing;
  if (!frame?.quote || !Array.isArray(frame.evidenceRefs) || !frame.evidenceRefs.every((id) => evidenceIds.has(id))) {
    validationErrors.push(`${prefix} 产品描述必须保留原话和有效证据引用`);
  }
  if ((record.issues ?? []).some((issue) => issue.severity === "P0")) validationErrors.push(`${prefix} 存在 P0 阻断问题`);
  records.push({ ...record, _file: file, _sha256: sha256(filePath) });
}

const validCount = validationErrors.length === 0 ? records.length : 0;
const requiredMajority = validCount >= 5 ? majority(validCount) : null;
const criteria = {};
function addMajorityCriterion(id, predicate, denominator = records) {
  const passed = denominator.filter(predicate).length;
  const required = denominator.length > 0 ? majority(denominator.length) : null;
  criteria[id] = {
    passed,
    denominator: denominator.length,
    required,
    status: required && passed >= required ? "pass" : (validCount >= 5 ? "fail" : "pending"),
  };
}

if (validCount >= 5 && validCount <= 8) {
  addMajorityCriterion("13.4.1_state_and_goal_30s", (record) => {
    const value = record.observations.stateAndGoal30s;
    return isPass(value) && value.seconds <= 30 && value.ageCorrect && value.quarterCorrect && value.goalCorrect && value.source === "spontaneous";
  });
  addMajorityCriterion("13.4.2_ordinary_quarter_3m", (record) => {
    const value = record.observations.ordinaryQuarterWithin3m;
    return isPass(value) && value.seconds <= 180 && value.source === "behavior";
  });
  addMajorityCriterion("13.4.3_two_actions", (record) => {
    const value = record.observations.twoActionsWithoutHelp;
    return isPass(value) && value.executed === true && value.actionIds?.length >= 2 && value.source === "behavior";
  });
  addMajorityCriterion("13.4.4_time_grid_meaning", (record) => {
    const value = record.observations.timeGridMeaning;
    return isPass(value) && value.code === "quarter_span_not_hours" && value.source === "spontaneous" && value.quote;
  });
  addMajorityCriterion("13.4.5_immediate_feedback", (record) => {
    const value = record.observations.immediateFeedback;
    return isPass(value) && value.noticed === true && value.source === "spontaneous" && value.quote;
  });
  addMajorityCriterion("13.4.6_action_difference_cost_object", (record) => {
    const value = record.observations.actionDifferenceCostObject;
    return isPass(value) && value.actionIds?.length >= 2 && value.identifiedCosts >= 2 && value.identifiedObjects >= 2 && value.source === "spontaneous" && value.quote;
  });
  addMajorityCriterion("13.4.7_cross_quarter_causality", (record) => {
    const value = record.observations.longTermChange;
    return isPass(value) && value.q1ActionId && value.laterChange && value.source === "spontaneous" && value.quote;
  });
  const resourceExposed = records.filter((record) => record.observations.resourceShortage.encountered === true);
  addMajorityCriterion("13.4.8_resource_shortage", (record) => {
    const value = record.observations.resourceShortage;
    return isPass(value) && value.understoodReason === true && value.recoveredWithoutHelp === true;
  }, resourceExposed);
  if (resourceExposed.length < Math.ceil(validCount / 2)) criteria["13.4.8_resource_shortage"].status = "fail";
  const eventExposed = records.filter((record) => record.observations.eventInterruption.encountered === true);
  addMajorityCriterion("13.4.9_event_interruption", (record) => {
    const value = record.observations.eventInterruption;
    return isPass(value) && value.eventId && value.identifiedAffectedActionOrMonthOrResource === true && value.source === "spontaneous" && value.quote;
  }, eventExposed);
  if (eventExposed.length < Math.ceil(validCount / 2)) criteria["13.4.9_event_interruption"].status = "fail";
  addMajorityCriterion("13.4.10_q4_age7", (record) => {
    const value = record.observations.q4Age7;
    return isPass(value) && value.completedYear && value.reviewBeforeAgeUp && value.recognizedAge7 && value.actionPoolChanged;
  });
  addMajorityCriterion("13.4.11_records_four_quarters", (record) => {
    const value = record.observations.recordsPage;
    return isPass(value) && value.opened && value.expandedQuarterCount >= 4 && value.recalledFacts?.length > 0;
  });
  addMajorityCriterion("13.4.14_mobile_usability", (record) => {
    const value = record.observations.mobileUsability;
    return isPass(value) && value.horizontalOverflow === false && value.importantButtonVisible === true && value.blockedTouchTarget === false;
  });
  addMajorityCriterion("13.4.17_life_arrangement_framing", (record) => {
    const value = record.interview.whatWereYouDoing;
    return value.source === "spontaneous" && (
      value.uncuedProductFrame === "life_arrangement_simulator"
      || (value.uncuedProductFrame === "game" && /安排|体验.*人生|人生.*模拟/.test(value.quote))
    );
  });

  const saveAssigned = records.filter((record) => assignmentMap.get(record.participantId)?.saveRestoreTask);
  criteria["13.4.13_save_restore_human"] = {
    passed: saveAssigned.filter((record) => {
      const value = record.observations.saveRestore;
      return isPass(value) && value.tested && value.lostFactIds?.length === 0
        && JSON.stringify(value.beforeFactIds) === JSON.stringify(value.afterFactIds);
    }).length,
    denominator: saveAssigned.length,
    required: 1,
    status: saveAssigned.some((record) => isPass(record.observations.saveRestore)) ? "pass" : "fail",
  };
  const reducedSessions = records.filter((record) => assignmentMap.get(record.participantId)?.motionMode === "reduced");
  const mutedSessions = records.filter((record) => assignmentMap.get(record.participantId)?.sound === "off");
  criteria["13.4.15_reduced_motion_muted_human"] = {
    passed: Number(reducedSessions.some((record) => isPass(record.observations.q4Age7))) + Number(mutedSessions.some((record) => isPass(record.observations.q4Age7))),
    denominator: 2,
    required: 2,
    status: reducedSessions.some((record) => isPass(record.observations.q4Age7)) && mutedSessions.some((record) => isPass(record.observations.q4Age7)) ? "pass" : "fail",
  };
} else {
  for (const id of [
    "13.4.1_state_and_goal_30s",
    "13.4.2_ordinary_quarter_3m",
    "13.4.3_two_actions",
    "13.4.4_time_grid_meaning",
    "13.4.5_immediate_feedback",
    "13.4.6_action_difference_cost_object",
    "13.4.7_cross_quarter_causality",
    "13.4.8_resource_shortage",
    "13.4.9_event_interruption",
    "13.4.10_q4_age7",
    "13.4.11_records_four_quarters",
    "13.4.13_save_restore_human",
    "13.4.14_mobile_usability",
    "13.4.15_reduced_motion_muted_human",
    "13.4.17_life_arrangement_framing",
  ]) {
    criteria[id] = { passed: 0, denominator: 0, required: null, status: "pending" };
  }
}

const expectedCommands = [
  "npm run check",
  "npm run ui:check",
  "npm run browser:check",
  "npm run h5:check",
  "npm run age6:blind:browser:check",
];
const checkMap = new Map((manifest.automationEvidence?.checks ?? []).map((entry) => [entry.command, entry]));
const releaseInfoPath = path.join(projectRoot, "dist", "release-info.json");
const releaseMatches = fs.existsSync(releaseInfoPath)
  && readJson(releaseInfoPath).contentSha256 === manifest.buildFingerprint?.releaseContentSha256;
const machineChecksPass = expectedCommands.every((command) => {
  const entry = checkMap.get(command);
  if (entry?.exitCode !== 0 || !/^[a-f0-9]{64}$/.test(entry.logSha256 ?? "")) return false;
  const logPath = path.resolve(batchRoot, entry.logPath ?? "");
  const checksRoot = path.join(batchRoot, "checks");
  return path.dirname(logPath) === checksRoot && fs.existsSync(logPath) && sha256(logPath) === entry.logSha256;
}) && releaseMatches;
const screenshotsReviewed = manifest.automationEvidence?.phoneScreenshotReviewed === true
  && manifest.automationEvidence?.desktopScreenshotReviewed === true
  && manifest.automationEvidence?.reviewerId
  && manifest.automationEvidence?.reviewedAt;
for (const id of ["13.4.12_determinism", "13.4.13_save_restore_machine", "13.4.14_390x844_machine", "13.4.15_accessibility_machine", "13.4.16_automatic_checks"]) {
  criteria[id] = {
    passed: machineChecksPass && screenshotsReviewed ? 1 : 0,
    denominator: 1,
    required: 1,
    status: machineChecksPass && screenshotsReviewed ? "pass" : "pending",
  };
}

const enoughRecords = validCount >= 5 && validCount <= 8;
const allCriteriaPass = Object.values(criteria).length >= 17 && Object.values(criteria).every((criterion) => criterion.status === "pass");
const status = validationErrors.length > 0
  ? "invalid"
  : (!enoughRecords ? "pending" : (allCriteriaPass ? "pass" : "fail"));
const output = {
  schemaVersion: "age6-blind-summary-v1",
  batchId: manifest.batchId,
  status,
  validParticipantCount: validCount,
  majorityThreshold: requiredMajority,
  recordFiles: records.map((record) => ({ participantId: record.participantId, file: record._file, sha256: record._sha256 })),
  criteria,
  validationErrors,
  diagnostics: {
    failedCriteria: Object.entries(criteria).filter(([, value]) => value.status === "fail").map(([id]) => id),
    pendingCriteria: Object.entries(criteria).filter(([, value]) => value.status === "pending").map(([id]) => id),
    missingParticipantCount: Math.max(0, 5 - validCount),
    humanEvidenceMayNotBeReplacedByAutomation: true,
  },
};
console.log(JSON.stringify(output, null, 2));
if (status === "pass") process.exitCode = 0;
else if (status === "pending") process.exitCode = 2;
else process.exitCode = 1;
