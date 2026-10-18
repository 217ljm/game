/**
 * 像素角色展台与 LOL 真实职业生涯管理器自动化回归测试脚本
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(".");
const avatarStagePath = path.resolve(root, "apps/game/src/views/character-avatar-stage.ts");
const stageWidgetPath = path.resolve(root, "apps/game/src/views/character-stage-widget.ts");
const lolCareerPath = path.resolve(root, "apps/game/src/esports/lol-career-manager.ts");
const esportsContractsPath = path.resolve(root, "apps/game/src/esports/esports-contracts.ts");

console.log("================================================================");
console.log("【像素展台组件与 LOL 职业生涯管理器自动化回归验证】");
console.log("================================================================");

// ----------------------------------------------------
// 1. 静态源码与类继承规范检查
// ----------------------------------------------------
console.log("[测试 1: 静态源码契约与视口规范校验]");
{
  assert.ok(fs.existsSync(stageWidgetPath), `CharacterStageWidget 文件必须存在: ${stageWidgetPath}`);
  assert.ok(fs.existsSync(avatarStagePath), `CharacterAvatarStage 文件必须存在: ${avatarStagePath}`);
  assert.ok(fs.existsSync(lolCareerPath), `LolCareerManager 文件必须存在: ${lolCareerPath}`);

  const widgetSource = fs.readFileSync(stageWidgetPath, "utf8");
  assert.ok(
    widgetSource.includes("export class CharacterStageWidget extends Phaser.GameObjects.Container"),
    "CharacterStageWidget 必须继承自 Phaser.GameObjects.Container"
  );
  assert.ok(
    widgetSource.includes("playStatusReaction"),
    "必须提供 playStatusReaction 属性浮动飘字方法"
  );
  assert.ok(
    widgetSource.includes("DEFAULT_STAGE_THOUGHTS"),
    "必须提供 7 大人生阶段时代心声台词库"
  );

  const lolSource = fs.readFileSync(lolCareerPath, "utf8");
  assert.ok(
    lolSource.includes("export class LolCareerManager"),
    "LolCareerManager 类必须存在并导出"
  );
  assert.ok(
    lolSource.includes("trainRankSolo"),
    "必须提供排位冲分训练方法 trainRankSolo"
  );
  assert.ok(
    lolSource.includes("receiveMedicalCare"),
    "必须提供队医理疗与封闭针干预方法 receiveMedicalCare"
  );
  assert.ok(
    lolSource.includes("prepareNextMatch"),
    "必须提供下一场对阵生成方法 prepareNextMatch"
  );
  assert.ok(
    lolSource.includes("recordMatchResult"),
    "必须提供比赛结果结算方法 recordMatchResult"
  );

  console.log("✅ 测试 1 通过: 静态源码契约、继承规范与方法导出全部完整！");
}

// ----------------------------------------------------
// 2. LOL 职业生涯状态机流转与历史锚定动态测试
// ----------------------------------------------------
console.log("[测试 2: LOL 职业生涯历史锚定与阶段晋升闭环推演]");
{
  const lolUrl = pathToFileURL(lolCareerPath).href;
  const { LolCareerManager } = await import(lolUrl);

  const mgr = new LolCareerManager();
  assert.equal(mgr.state.careerStage, "unstarted", "初始阶段应为 unstarted");

  // 1. 2010 年 14 岁：未公测前不能接触
  mgr.syncYear(2010);
  assert.equal(mgr.state.careerStage, "unstarted", "2010年国服尚未公测，不可涉足职业电竞");

  // 2. 2011 年 15 岁：国服正式公测，在网吧通宵接触 LOL 成为高分路人王
  mgr.syncYear(2011);
  const startAmateur = mgr.startAmateurEra(15);
  assert.ok(startAmateur.success, "2011年应可成功开启网吧路人王阶段");
  assert.equal(mgr.state.careerStage, "amateur_king", "阶段应晋升为 amateur_king");
  assert.ok(startAmateur.narrative.includes("国服正式公测"), "台词中必须包含国服公测历史真实背景");

  // 3. 排位冲分训练：提升 APM 与胜点
  const trainRes = mgr.trainRankSolo("mechanics");
  assert.ok(trainRes.success, "排位训练应成功");
  assert.ok(trainRes.apmAfter >= 250, "手速 APM 应达到高玩水平");
  assert.ok(mgr.state.fatigue > 0, "训练应累积疲劳度");

  // 4. 2013 年 17 岁：首届 LPL 创立，收到青训试训邀请
  mgr.syncYear(2013);
  const signTrainee = mgr.signTraineeContract("omg", "OMG 电子竞技俱乐部");
  assert.ok(signTrainee.success, "2013年应可签约青训学徒合同");
  assert.equal(mgr.state.careerStage, "academy_trainee", "阶段应晋升为 academy_trainee");
  assert.ok(mgr.state.currentContract !== null, "合同应已建立");

  // 5. 晋升次级联赛主力
  mgr.promoteToSecondaryPro("lspl_starter");
  assert.equal(mgr.state.careerStage, "secondary_pro", "阶段应为 secondary_pro");

  // 6. 2018 年 22 岁：联盟化与顶级联赛首发，冲击世界之巅
  mgr.syncYear(2018);
  mgr.promoteToLplStarter();
  assert.equal(mgr.state.careerStage, "lpl_starter", "阶段应为 lpl_starter");

  // 7. 对阵准备与比赛模拟结算
  const nextMatch = mgr.prepareNextMatch();
  assert.ok(nextMatch.myTeam.name.length > 0, "应生成玩家战队名称");
  assert.ok(nextMatch.opponentTeam.name.length > 0, "应生成对手战队名称");

  const recordRes = mgr.recordMatchResult({
    isWin: true,
    myScore: 2,
    oppScore: 0,
    kills: 12,
    deaths: 1,
    assists: 15,
    kda: "12/1/15",
    damageShare: 38,
    isMvp: true,
    mvpRating: 9.9,
    goldLeadFinal: 10500,
    durationMinutes: 28,
  });
  assert.ok(recordRes.earningsDelta > 0, "胜利应结算比赛奖金收益");
  assert.ok(recordRes.isMvp, "本场应荣膺 MVP");
  assert.ok(mgr.state.regularSeasonRecord.wins >= 1, "常规赛胜场应更新");

  // 8. 封闭针与队医医疗干预测试
  const medRes = mgr.receiveMedicalCare("painkiller_injection");
  assert.ok(medRes.success, "封闭针注射应成功");
  assert.ok(medRes.painkillerBuffActive, "封闭针 Buff 应激活");

  console.log("✅ 测试 2 通过: LOL职业生涯历史锚定、四级晋升、比赛与封闭针闭环验证 100% 成功！");
}

console.log("================================================================");
console.log("🎉 全部测试全部绿灯通过！");
console.log("================================================================");
