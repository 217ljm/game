import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const batchIndex = args.indexOf("--batch");
if (batchIndex < 0 || !args[batchIndex + 1]) throw new Error("请通过 --batch 指定盲测批次目录");
const batchRoot = path.resolve(projectRoot, args[batchIndex + 1]);
const allowedRoot = path.resolve(projectRoot, "artifacts", "playtest", "age6-p2-v1");
assert.equal(path.dirname(batchRoot), allowedRoot, "批次必须位于 artifacts/playtest/age6-p2-v1/ 下");

const manifestPath = path.join(batchRoot, "manifest.json");
assert.ok(fs.existsSync(manifestPath), "盲测批次缺少 manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
assert.equal(manifest.schemaVersion, "age6-blind-manifest-v1");
assert.equal(manifest.studyId, "life.age6.p2.exploratory");
assert.equal(manifest.status, "scheduled", "只有未作废的 scheduled 批次可进入真人会话");
assert.deepEqual(manifest.baselineSections, ["13.4", "18.3"]);
assert.equal(manifest.entryRoute, "#/life");
assert.equal(manifest.environment?.debugUiVisible, false);
assert.equal(manifest.environment?.candidatePath, "/dist/#/life");
assert.deepEqual(manifest.environment?.primaryViewport, { width: 390, height: 844 });
assert.deepEqual(manifest.automationEvidence?.requiredCommands, [
  "npm run check",
  "npm run ui:check",
  "npm run browser:check",
  "npm run h5:check",
  "npm run age6:blind:browser:check",
]);

const ids = manifest.plannedParticipantIds;
assert.ok(Array.isArray(ids) && ids.length >= 5 && ids.length <= 8, "计划参与者必须为5～8人");
assert.equal(new Set(ids).size, ids.length, "参与者匿名 ID 必须唯一");
assert.ok(ids.every((id) => /^P0[1-8]$/.test(id)), "参与者匿名 ID 必须使用 P01—P08");
assert.equal(manifest.assignments?.length, ids.length, "每个计划参与者都必须有唯一分组");
assert.deepEqual(manifest.assignments.map((entry) => entry.participantId), ids);
const exposureTarget = Math.ceil(ids.length / 2);
assert.ok(manifest.assignments.filter((entry) => entry.draftCondition === "resource_shortage").length >= exposureTarget, "至少一半参与者必须分配资源受限路径");
assert.ok(manifest.assignments.filter((entry) => entry.eventCondition !== "natural").length >= exposureTarget, "至少一半参与者必须分配隐藏强制事件路径");
assert.ok(manifest.assignments.some((entry) => entry.motionMode === "reduced"), "至少一场必须覆盖 reduced motion");
assert.ok(manifest.assignments.some((entry) => entry.sound === "off"), "至少一场必须覆盖静音");
assert.ok(manifest.assignments.some((entry) => entry.saveRestoreTask === true), "至少一场必须覆盖真人保存刷新恢复");
assert.ok(manifest.assignments.every((entry) => entry.recordsTask === true), "每场都必须覆盖四季度记录页");
for (const assignment of manifest.assignments) {
  assert.match(assignment.launchPath, /^\/public\/playtest\/age6\.html\?/);
  const url = new URL(assignment.launchPath, "http://playtest.local");
  assert.equal(url.searchParams.get("participant"), assignment.participantId);
  assert.equal(url.searchParams.get("build"), manifest.buildFingerprint.releaseContentSha256);
  assert.equal(url.searchParams.has("debug"), false, "主持入口不得暴露 debug 参数");
}

const release = JSON.parse(fs.readFileSync(path.join(projectRoot, "dist", "release-info.json"), "utf8"));
assert.equal(manifest.buildFingerprint.releaseContentSha256, release.contentSha256, "批次候选指纹必须等于当前冻结 H5 包");
assert.match(manifest.buildFingerprint.gitStatusSha256, /^[a-f0-9]{64}$/);
assert.match(manifest.buildFingerprint.gitDiffSha256, /^[a-f0-9]{64}$/);
assert.equal(manifest.privacy?.realNamesStored, false);
assert.equal(manifest.privacy?.contactDataStored, false);
assert.equal(manifest.privacy?.identityMapOutsideRepository, true);

for (const relative of [
  "playtests/age6-p2/README.md",
  "playtests/age6-p2/participant-record.template.json",
  "public/playtest/age6.html",
  "public/playtest/age6.mjs",
  "scripts/serve-age6-blind-test.mjs",
  "scripts/start-age6-blind-session.mjs",
]) assert.ok(fs.existsSync(path.join(projectRoot, relative)), `盲测工具缺少 ${relative}`);
assert.equal(fs.existsSync(path.join(projectRoot, "dist", "public", "playtest")), false, "主持工具不得进入正式 H5 候选包");
const launcher = fs.readFileSync(path.join(projectRoot, "public", "playtest", "age6.mjs"), "utf8");
assert.match(launcher, /people-life:active:v5/);
assert.match(launcher, /\.\.\/\.\.\/dist\//);
assert.doesNotMatch(launcher, /\?debug=1/);
const facilitatorServer = fs.readFileSync(path.join(projectRoot, "scripts", "serve-age6-blind-test.mjs"), "utf8");
assert.match(facilitatorServer, /createGameServer\(stagingRoot\)/, "主持服务必须从隔离暂存目录提供候选包");
assert.match(facilitatorServer, /--allow-lan/, "局域网监听必须有显式授权门槛");
assert.doesNotMatch(facilitatorServer, /createGameServer\(projectRoot\)/, "主持服务不得向网络公开整个工作区");
const sessionStarter = fs.readFileSync(path.join(projectRoot, "scripts", "start-age6-blind-session.mjs"), "utf8");
assert.match(sessionStarter, /--confirm-human-present/, "创建真人记录必须显式确认参与者已在场");
assert.match(sessionStarter, /sessionStatus\s*=\s*"in_progress"/, "新记录只能以 in_progress 开始");
assert.match(sessionStarter, /--dry-run/, "单场启动必须支持不写文件的预检");
assert.doesNotMatch(sessionStarter, /status\s*=\s*"pass"/, "单场启动不得预填通过状态");

const recordFiles = fs.readdirSync(path.join(batchRoot, "records")).filter((file) => file.endsWith(".json"));
assert.ok(recordFiles.every((file) => /^P0[1-8]\.json$/.test(file)), "records/ 只能包含 P01—P08 匿名 JSON");

console.log(JSON.stringify({
  ok: true,
  status: recordFiles.length >= 5 ? "ready-with-records" : "ready-for-human-sessions",
  batchId: manifest.batchId,
  participantSlots: ids.length,
  currentRecordCount: recordFiles.length,
  resourceShortageAssignments: manifest.assignments.filter((entry) => entry.draftCondition === "resource_shortage").length,
  forcedEventAssignments: manifest.assignments.filter((entry) => entry.eventCondition !== "natural").length,
  releaseContentSha256: release.contentSha256,
  checks: [
    "five_to_eight_anonymous_slots",
    "balanced_resource_and_event_exposure",
    "reduced_motion_muted_save_restore_records_coverage",
    "immutable_candidate_fingerprint",
    "formal_dist_route_without_debug_ui",
    "playtest_launcher_excluded_from_release",
    "isolated_facilitator_server_and_human_present_record_guard",
    "no_pii_manifest_contract",
  ],
}, null, 2));
