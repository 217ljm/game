/**
 * 电竞职业生涯与模拟对战引擎深度校验脚本
 * 验证六维能力与巅峰曲线、四级阶梯合同、战术BP克制、单局详细关键事件与联赛/双败/瑞士轮赛制
 */

import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

const systemPath = path.resolve("apps/game/src/systems/esports-career-system.ts");
const systemUrl = pathToFileURL(systemPath).href;

console.log("⚡ 正在加载电竞职业系统模块:", systemUrl);
const esportsModule = await import(systemUrl);

const {
  EsportsCareerSystem,
  calculateEffectiveApm,
  calculateEffectiveReactionMs,
  getPlayerAgeCurveProfile,
  TACTICAL_STYLES,
  RANK_TIER_ORDER,
} = esportsModule;

console.log("----------------------------------------------------------------");
console.log("【测试 1: 选手六维能力、APM与反应毫秒、年龄衰减曲线与伤病/封闭针】");
{
  const system = new EsportsCareerSystem();
  const initialTalent = system.calculateTalentScore();
  console.log(`初始选手评分: ${initialTalent.overallRating} [${initialTalent.tierGrade}], APM: ${initialTalent.currentApm}, 反应延时: ${initialTalent.currentReactionMs}ms`);

  assert(initialTalent.currentApm >= 250, "选手初始手速 APM 应达到高玩水准 (>=250)");
  assert(initialTalent.currentReactionMs <= 200, "选手初始神经反应延时应处于极快范围 (<=200ms)");

  // 验证年龄巅峰曲线
  const teenProfile = getPlayerAgeCurveProfile(16);
  assert(teenProfile.reactionGrowth > 0, "16岁青训时期反应神经应持续提升");
  const peakProfile = getPlayerAgeCurveProfile(20);
  assert(peakProfile.gameSenseGrowth >= 3, "20岁黄金期战术大局观飞速跃升");
  const veteranProfile = getPlayerAgeCurveProfile(26);
  assert(veteranProfile.reactionGrowth < 0, "26岁高龄期反应时间出现生理衰减");

  // 年龄增长与衰减
  const updateResult = system.updateAgeAndPhysiology(27);
  assert(updateResult.isAgingDecline === true, "27岁应判定为老将衰退期");

  // 伤病产生与封闭针
  const injury = system.triggerRandomInjury();
  console.log(`遭受意外职业伤病: ${injury.name} (${injury.severity}), APM惩罚: -${injury.mechanicsPenalty}`);
  assert(system.state.physiology.injuries.length > 0, "伤病应被记录在选手的生理状态中");

  const injuredTalent = system.calculateTalentScore();
  assert(injuredTalent.currentApm < initialTalent.currentApm, "受伤后实际 APM 应受到削弱");

  // 队医注射封闭针
  const painkiller = system.administerPainkillerInjection();
  assert(painkiller.success === true, "注射封闭针应生效");
  const buffedTalent = system.calculateTalentScore();
  assert(buffedTalent.currentApm >= initialTalent.currentApm - 10, "封闭针加持下暂时免疫伤病惩罚");

  // 康复理疗
  system.state.physiology.hasPainkillerBuff = false;
  const therapy = system.receiveTherapy("acupuncture");
  console.log(`康复理疗反馈: ${therapy.narrative}`);
  assert(therapy.injuriesHealed === true, "针灸理疗应成功消除部分伤病");
  console.log("✅ 测试 1 通过: 选手能力六维、衍生属性、年龄衰减与伤病治疗机制验证无误！");
}

console.log("----------------------------------------------------------------");
console.log("【测试 2: 四级阶梯职业合同 (青训学徒/次级新秀/LPL首发/顶薪明星) 与转会】");
{
  const system = new EsportsCareerSystem();

  // 1. 青训学徒合同 (钻石段位)
  system.state.currentRank = "diamond";
  system.state.playerStats = { mechanics: 68, reaction: 70, gameSense: 65, mentality: 65, teamwork: 60, consistency: 65 };
  let offers = system.generateContractOffers(16, 30);
  assert(offers.length > 0, "钻石段位应能收到青训学徒报价");
  const traineeOffer = offers.find(o => o.role === "youth_trainee");
  assert(traineeOffer, "应存在青训学徒合同");
  assert(traineeOffer.monthlyBaseSalary >= 6000 && traineeOffer.monthlyBaseSalary <= 10000, "青训学徒月薪应在 6k~1w 范围");

  // 2. 次级新秀合同 (大师段位)
  system.state.currentRank = "master";
  system.state.playerStats = { mechanics: 78, reaction: 78, gameSense: 75, mentality: 75, teamwork: 75, consistency: 75 };
  offers = system.generateContractOffers(18, 50);
  const rookieOffer = offers.find(o => o.role === "substitute");
  assert(rookieOffer, "应存在次级新秀轮换合同");
  assert(rookieOffer.monthlyBaseSalary >= 20000 && rookieOffer.monthlyBaseSalary <= 50000, "次级新秀月薪应在 2w~5w 范围");

  // 3. 顶级联赛首发合同 (宗师/王者，A/S级)
  system.state.currentRank = "grandmaster";
  system.state.playerStats = { mechanics: 88, reaction: 86, gameSense: 85, mentality: 85, teamwork: 85, consistency: 85 };
  offers = system.generateContractOffers(20, 80);
  const starterOffer = offers.find(o => o.role === "starter");
  assert(starterOffer, "应存在顶级联赛首发合同");
  assert(starterOffer.annualBaseSalary >= 1000000 && starterOffer.annualBaseSalary <= 5000000, "LPL首发年薪应在 100w~500w 范围");

  // 4. 顶薪明星特权合同 (世界冠军/S+超级明星)
  system.state.currentRank = "challenger";
  system.state.isWorldChampion = true;
  system.state.playerStats = { mechanics: 96, reaction: 95, gameSense: 94, mentality: 95, teamwork: 92, consistency: 94 };
  offers = system.generateContractOffers(21, 99);
  const starOffer = offers.find(o => o.role === "franchise_star");
  assert(starOffer, "应存在顶薪明星特权合同");
  assert(starOffer.annualBaseSalary >= 10000000, "顶薪明星年薪应达到千万级 (>=1000w)");
  assert(starOffer.sponsorshipShareRate >= 0.5, "顶薪明星赞助代言分成应达到 50%+");

  // 签约与买断
  system.signContract(starOffer);
  assert(system.state.isSignedPro === true, "应成功签约为职业选手");
  assert(system.state.proMonthlySalary === starOffer.monthlyBaseSalary, "月薪应同步为合同月薪");

  const buyoutResult = system.releaseOrBuyoutContract();
  assert(buyoutResult.success === true, "买断解约应成功执行");
  assert(system.state.currentContract === null, "解约后当前合同应置空");
  assert(system.state.isSignedPro === false, "解约后身份恢复为自由人");
  console.log("✅ 测试 2 通过: 四级阶梯合同与转会买断体系运行精准！");
}

console.log("----------------------------------------------------------------");
console.log("【测试 3: 战术 BP 模拟（阵容风格克制、红蓝方优劣、招牌英雄与针对Ban位）】");
{
  const system = new EsportsCareerSystem();
  // 测试阵容风格相克
  const bpDiveVsPoke = system.simulateDraftPhase("blue", "dive_teamfight", "poke_siege");
  console.log(`BP克制推演 (强开冲脸 vs 消耗拉扯): 得分 ${bpDiveVsPoke.bpAdvantageScore}, 评述: ${bpDiveVsPoke.bpAdvantageReason}`);
  assert(bpDiveVsPoke.bpAdvantageScore > 0, "强开团体系对阵POKE消耗体系应获得正向克制加分");

  const bpPokeVsDive = system.simulateDraftPhase("red", "poke_siege", "dive_teamfight");
  console.log(`BP反制推演 (消耗拉扯 vs 强开冲脸): 得分 ${bpPokeVsDive.bpAdvantageScore}, 评述: ${bpPokeVsDive.bpAdvantageReason}`);
  assert(bpDiveVsPoke.bpAdvantageScore > bpPokeVsDive.bpAdvantageScore, "强开冲脸面对POKE体系的整体得分应显著高于反向对位");
  assert(bpPokeVsDive.bpAdvantageReason.includes("反制"), "POKE体系面对强冲脸体系评述中应体现遭到反制");

  // 检查红蓝方机制与招牌英雄针对
  assert(bpDiveVsPoke.blueSidePicks.length === 5, "蓝方选角应为完整5人阵容");
  assert(bpDiveVsPoke.redSidePicks.length === 5, "红方选角应为完整5人阵容");
  assert(bpDiveVsPoke.playerPickedHero.length > 0, "选手应锁定登场英雄");
  console.log("✅ 测试 3 通过: 战术 BP 克制与阵型选角推演准确无误！");
}

console.log("----------------------------------------------------------------");
console.log("【测试 4: 单局比赛事件链 (一血/控龙/抢大龙/残局1v3/五杀/KDA/MVP)】");
{
  const system = new EsportsCareerSystem();
  system.signProContract("EDward Gaming");
  const bp = system.simulateDraftPhase("blue");
  const singleGame = system.simulateSingleGameDetail(1, "TES 滔搏", bp, false);

  console.log(`单局战报: ${singleGame.briefHighlight}`);
  console.log(`选手单局个人表现: ${singleGame.kills}/${singleGame.deaths}/${singleGame.assists}, MVP: ${singleGame.isMvp} (评分 ${singleGame.mvpRating})`);
  console.log(`关键事件数量: ${singleGame.keyEvents.length}`);
  singleGame.keyEvents.forEach(e => {
    console.log(`  - [${e.minute}m] ${e.title}: ${e.narrative}`);
  });

  assert(singleGame.durationMinutes >= 20, "比赛时长应合理 (>=20分钟)");
  assert(singleGame.keyEvents.length >= 1, "应至少触发一个关键比赛事件 (如一血/龙魂/大龙逆转)");

  // 测试系列赛 BO5
  const bo5Match = system.simulateSeriesMatch("韩国 T1 战队", true);
  console.log(`BO5 系列赛结果: 比分 ${bo5Match.playerScore}-${bo5Match.opponentScore}, 胜负: ${bo5Match.isWin ? "胜利" : "失利"}`);
  assert(bo5Match.playerScore === 3 || bo5Match.opponentScore === 3, "BO5系列赛必须有一方率先达到3胜");
  assert(bo5Match.detailedGames.length >= 3 && bo5Match.detailedGames.length <= 5, "BO5应进行 3 到 5 场小局");
  console.log("✅ 测试 4 通过: 单局详细事件链与 BO5 系列赛模拟完美闭环！");
}

console.log("----------------------------------------------------------------");
console.log("【测试 5: 联赛赛制推演 (常规赛循环赛、季后赛双败制、世界赛瑞士轮)】");
{
  const system = new EsportsCareerSystem();
  system.signProContract("JD Gaming");

  // 1. 常规赛循环赛
  const regularSeason = system.simulateSpringRegularSeason();
  console.log(`常规赛积分榜成绩: ${regularSeason.wins} 胜 ${regularSeason.losses} 负, 排名第 ${regularSeason.standingRank} 名, 晋级季后赛: ${regularSeason.qualifiedPlayoffs}`);
  assert(regularSeason.wins + regularSeason.losses === 16, "常规赛应包含完整 16 轮循环对决");

  // 2. 季后赛双败制
  const playoffs = system.simulateSpringPlayoffs();
  console.log(`季后赛双败结算: ${playoffs.finalPlacement}, 斩获奖金 ¥${playoffs.prizeWon.toLocaleString()}`);
  assert(system.state.playoffMatches.length >= 1, "季后赛应经历至少一轮对决");

  // 3. 世界赛瑞士轮 (3胜晋级3败出局)
  const swissResult = system.simulateSwissStage();
  console.log(`瑞士轮战绩: ${swissResult.playerRecord.wins} 胜 ${swissResult.playerRecord.losses} 负, 晋级八强: ${swissResult.isPlayerQualified}`);
  assert(swissResult.playerRecord.wins === 3 || swissResult.playerRecord.losses === 3, "瑞士轮最终必须以 3 胜晋级或 3 败淘汰告终！");
  assert(swissResult.roundsSummary.length >= 3 && swissResult.roundsSummary.length <= 5, "瑞士轮轮次应在 3 到 5 轮之间");

  // 4. 退役转型
  const retireResult = system.retireAndTransition("gold_coach");
  assert(retireResult.success === true, "退役转型应成功");
  assert(system.state.isRetired === true, "选手状态应标记为退役");
  console.log(`退役战报: ${retireResult.summaryText}`);
  console.log("✅ 测试 5 通过: 完整常规赛循环、季后赛双败淘汰、世界赛瑞士轮及退役体系验证无误！");
}

console.log("----------------------------------------------------------------");
console.log("🎉 ALL TESTS PASSED! 全部电竞职业与对战模拟引擎测试 100% 顺利通过！");
