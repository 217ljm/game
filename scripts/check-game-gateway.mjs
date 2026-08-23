import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGameGateway, ReplayGameGateway } from "../src/game/game-gateway.mjs";
import {
  createGameSession,
  runLifeSession,
  validateGameSession,
} from "../src/game/game-engine.mjs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");
const readJson = (...segments) =>
  JSON.parse(fs.readFileSync(path.join(projectRoot, ...segments), "utf8"));

const data = {
  annualOperations: readJson("data", "annual_life_operations.json"),
  quarterlyLife: readJson("data", "quarterly_life_content.json"),
  timeline: readJson("data", "calibration", "timeline_1978_2026.json"),
  socialCharacters: readJson("data", "social_character_catalog.json"),
  birth: readJson("data", "calibration", "birth_1978_1982.json"),
  childhood: readJson("data", "calibration", "childhood_1978_1988.json"),
  childhoodEvents: readJson("data", "childhood_events.json"),
  primary: readJson("data", "calibration", "primary_education_1984_1996.json"),
  primaryEvents: readJson("data", "primary_education_events.json"),
  adolescence: readJson("data", "calibration", "adolescence_education_1986_2000.json"),
  adolescenceEvents: readJson("data", "adolescence_events.json"),
  youth: readJson("data", "calibration", "youth_entry_1992_2006.json"),
  youthEvents: readJson("data", "youth_entry_events.json"),
  entryJobs: readJson("data", "entry_job_catalog.json"),
  adult: readJson("data", "calibration", "adult_life_1992_2025.json"),
  adultEvents: readJson("data", "adult_life_events.json"),
  adultJobs: readJson("data", "adult_job_catalog.json"),
};

console.log("【1/4】校验 GameGateway 实例构建与接口合同...");
assert.throws(() => createGameGateway(null), TypeError);
const gateway = createGameGateway(data);
assert.ok(gateway instanceof ReplayGameGateway);

console.log("【2/4】校验新扩充中老年与新时代生活内容合法性...");
const leisureIds = data.quarterlyLife.eraLeisure.map((item) => item.id);
assert.ok(leisureIds.includes("leisure_senior_wellness_and_leisure"), "需包含银发养生文体活动");
assert.ok(leisureIds.includes("leisure_digital_skill_adaptation"), "需包含数字技能适应活动");
const eventIds = data.quarterlyLife.randomEvents.map((event) => event.id);
assert.ok(eventIds.includes("senior_health_checkup_advice"), "需包含中老年健康体检事件");
assert.ok(eventIds.includes("family_memoir_and_photo_album"), "需包含家庭相册整理事件");

console.log("【3/4】校验 startLife 与确定性等价...");
const seed = "gateway-determinism-audit";
const birthYear = 1980;
const { session: gwSession, result: gwResult } = gateway.startLife({ seed, birthYear, mortality: false });
assert.equal(validateGameSession(gwSession), true);

const rawSession = createGameSession({ seed, birthYear, mortality: false });
const rawResult = runLifeSession(data, rawSession, { autoChoose: false });

assert.equal(gwResult.status, rawResult.status);
assert.equal(gwResult.stage, rawResult.stage);
assert.equal(gwResult.pendingDecision.eventId, rawResult.pendingDecision.eventId);
assert.deepEqual(gwResult.currentState.visibleStats, rawResult.currentState.visibleStats);

console.log("【4/4】校验连续步骤提交与状态推进一致性...");
// 推进 0 岁年度结算
const step1 = gateway.submitChoice(gwSession, gwResult.pendingDecision, "confirm_year_review");
assert.equal(step1.result.status, "awaiting_choice");
assert.equal(step1.result.pendingDecision.age, 1);
assert.equal(step1.result.pendingDecision.kind, "quarter_plan");

// 推进 1 岁幼儿反应
const availableOptions = step1.result.pendingDecision.options.filter((opt) => opt.available);
assert.ok(availableOptions.length >= 1);
const step2 = gateway.submitChoice(step1.session, step1.result.pendingDecision, availableOptions[0].id);
assert.equal(step2.result.status, "awaiting_choice");

console.log("✅ GameGateway 契约测试与确定性回归全部通过！");
