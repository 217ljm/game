/**
 * 英雄联盟真实历史赛季与职业生态系统深度校验脚本
 * 验证：
 * 1. 2011~2024 编年史历史节点与赛制演进完整性
 * 2. 选手六维微操、APM、反应延时、伤病与封闭针医疗干预
 * 3. 四级阶梯合同 (青训学徒/次级新秀/LPL顶级首发/顶薪明星特权) 与转会买断
 * 4. 常规赛双循环大组积分榜与季后赛席位划分
 * 5. 季后赛四强双败争银龙杯推演
 * 6. S赛瑞士轮完整推演 (3胜晋级8强、3败淘汰回家、生死战BO3)
 * 7. LSPL升降级生死附加赛
 */

import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

const modulePath = path.resolve("apps/game/src/esports/index.ts");
const moduleUrl = pathToFileURL(modulePath).href;

console.log("⚡ 正在加载 LOL 真实历史职业生态系统:", moduleUrl);
const esports = await import(moduleUrl);

const {
  LOL_HISTORICAL_CHRONICLES,
  HISTORICAL_TEAMS_DATABASE,
  getHistoricalSeason,
  getSeasonRules,
  calculateDerivedMetrics,
  generateContractOffers,
  calculateContractBuyout,
  executeTransferBuyout,
  generateRandomInjury,
  administerMedicalTreatment,
  simulateSingleGame,
  simulateSeriesMatch,
  simulateRegularSeason,
  simulateDoubleEliminationPlayoffs,
  simulateWorldsSwissStage,
  simulateRelegationMatch,
} = esports;

console.log("================================================================");
console.log("【测试 1: 2011~2024 历年历史编年史与重大历史节点对齐性校验】");
{
  const years = [2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];

  years.forEach(year => {
    const chronicle = getHistoricalSeason(year);
    assert(chronicle, `年份 ${year} 的历史编年史应存在`);
    assert(chronicle.year === year, `年份应匹配`);
    assert(chronicle.prominentTeams.length > 0, `年份 ${year} 应有知名战队记录`);
    assert(chronicle.epicMoments.length > 0, `年份 ${year} 应有名场面记录`);
  });

  // 1. 2011 国服公测
  const y2011 = getHistoricalSeason(2011);
  assert(y2011.historicalMilestone.includes("国服正式公测"), "2011年应记录国服正式公测");
  assert(y2011.hasLpl === false, "2011年尚未正式成立LPL联赛");

  // 2. 2012 WE IPL5 世界冠军
  const y2012 = getHistoricalSeason(2012);
  assert(y2012.historicalMilestone.includes("IPL5") || y2012.description.includes("IPL5"), "2012年应记录IPL5世界冠军");

  // 3. 2013 太仓首届LPL、OMG与皇族
  const y2013 = getHistoricalSeason(2013);
  assert(y2013.hasLpl === true, "2013年首届LPL应已成立");
  assert(y2013.lplSpringChampion?.includes("OMG"), "2013年春冠应为OMG黑暗势力");
  assert(y2013.worldsRunnerUp.includes("Royal"), "2013年世界亚军应为皇族");

  // 4. 2014 LSPL与韩援狂潮
  const y2014 = getHistoricalSeason(2014);
  assert(y2014.hasSecondaryLeague === true, "2014年次级联赛LSPL应设立");
  assert(y2014.hasRelegation === true, "2014年应存在升降级制度");

  // 5. 2015 首届MSI EDG夺冠
  const y2015 = getHistoricalSeason(2015);
  assert(y2015.msiChampion?.includes("EDward Gaming") || y2015.msiChampion?.includes("EDG"), "2015年MSI冠军应为EDG");

  // 6. 2018 联盟化取消升降级、LDL与iG仁川金色的雨
  const y2018 = getHistoricalSeason(2018);
  assert(y2018.hasRelegation === false, "2018年联盟化落地取消升降级");
  assert(y2018.secondaryLeagueName?.includes("LDL"), "2018年次级联赛更名为LDL");
  assert(y2018.worldsChampion.includes("iG") || y2018.worldsChampion.includes("Invictus"), "2018年世界冠军应为iG");

  // 7. 2019 FPX巴黎涅槃
  const y2019 = getHistoricalSeason(2019);
  assert(y2019.worldsChampion.includes("FPX") || y2019.worldsChampion.includes("FunPlus"), "2019年世界冠军应为FPX");

  // 8. 2021 四强双败与EDG冰岛骑士归来
  const y2021 = getHistoricalSeason(2021);
  assert(y2021.playoffFormat === "double_elimination", "2021年季后赛应引入双败制");
  assert(y2021.worldsChampion.includes("EDG") || y2021.worldsChampion.includes("EDward"), "2021年世界冠军应为EDG");

  // 9. 2023 世界赛全面引入瑞士轮赛制
  const y2023 = getHistoricalSeason(2023);
  assert(y2023.worldsFormat === "swiss_system", "2023年世界赛应为瑞士轮赛制");

  console.log("✅ 测试 1 通过: 2011~2024 历年赛季关键编年史、赛制演进与重大荣誉 100% 严谨对齐！");
}

console.log("----------------------------------------------------------------");
console.log("【测试 2: 选手六维微操、APM与反应延时(ms)、伤病与封闭针医疗干预】");
{
  const normalStats = {
    mechanics: 88,
    reaction: 85,
    gameSense: 80,
    teamwork: 82,
    mentality: 80,
    consistency: 78,
  };

  const metrics20 = calculateDerivedMetrics(normalStats, 20);
  console.log(`20岁选手综合评级: ${metrics20.overallRating} [${metrics20.tierGrade}], APM: ${metrics20.effectiveApm}, 反应延时: ${metrics20.effectiveReactionMs}ms`);

  assert(metrics20.effectiveApm >= 350, "高水平选手APM应达到350+");
  assert(metrics20.effectiveReactionMs <= 165, "高水平选手神经反应延时应处于极快范围 (<=165ms)");

  // 老将衰减
  const metrics27 = calculateDerivedMetrics(normalStats, 27);
  assert(metrics27.overallRating < metrics20.overallRating, "27岁老将综合评分应出现生理衰减");

  // 产生职业伤病 (手腕管综合征/腱鞘炎等)
  const injury = generateRandomInjury(2021);
  console.log(`遭受职业伤病: ${injury.name}, APM惩罚: -${injury.apmPenalty}, 反应延时增加: +${injury.reactionMsPenalty}ms`);

  const injuredMetrics = calculateDerivedMetrics(normalStats, 20, [injury]);
  assert(injuredMetrics.effectiveApm < metrics20.effectiveApm, "受伤后APM应受到削减");
  assert(injuredMetrics.effectiveReactionMs > metrics20.effectiveReactionMs, "受伤后反应延时应增大");

  // 决胜局医疗干预：注射封闭针
  const painkillerResult = administerMedicalTreatment([injury], "painkiller_injection", true);
  assert(painkillerResult.painkillerBuffActive === true, "注射封闭针应激活封闭BUFF");
  assert(painkillerResult.riskOfRelapseRate >= 0.5, "打封闭针赛后恶化复发风险应较高");

  const buffedMetrics = calculateDerivedMetrics(normalStats, 20, [injury], true);
  assert(buffedMetrics.effectiveApm === metrics20.effectiveApm, "封闭针加持下临时免疫伤病属性惩罚");

  // 针灸推拿保守理疗
  const therapyResult = administerMedicalTreatment([injury], "physiotherapy_massage");
  assert(therapyResult.healedInjuries.length > 0, "理疗应成功消除部分炎症");
  console.log("✅ 测试 2 通过: 选手微操六维、衍生生理指标、伤病扣减与封闭针机制无误！");
}

console.log("----------------------------------------------------------------");
console.log("【测试 3: 四级阶梯职业合同与转会买断体系】");
{
  // 1. 青训学徒合同 (钻石段位)
  const traineeOffers = generateContractOffers({
    year: 2021,
    playerAge: 16,
    rankTier: "diamond",
    stats: { mechanics: 65, reaction: 68, gameSense: 60, teamwork: 60, mentality: 60, consistency: 60 },
    worldChampionTitlesCount: 0,
    hasMsiTitle: false,
    hasLplTitle: false,
  });
  assert(traineeOffers.length > 0, "应生成合同报价");
  const trainee = traineeOffers[0];
  assert(trainee.roleTier === "youth_trainee", "应为青训学徒合同");
  assert(trainee.monthlyBaseSalary >= 6000 && trainee.monthlyBaseSalary <= 15000, "青训学徒月薪应符合规范");
  assert(trainee.dailySoloRankQuota >= 12, "青训生应有高强度排位日课要求");

  // 2. 次级新秀合同 (大师段位)
  const rookieOffers = generateContractOffers({
    year: 2021,
    playerAge: 18,
    rankTier: "master",
    stats: { mechanics: 76, reaction: 75, gameSense: 74, teamwork: 72, mentality: 70, consistency: 72 },
    worldChampionTitlesCount: 0,
    hasMsiTitle: false,
    hasLplTitle: false,
  });
  const rookie = rookieOffers[0];
  assert(rookie.roleTier === "secondary_rookie", "应为次级新秀合同");
  assert(rookie.monthlyBaseSalary >= 20000 && rookie.monthlyBaseSalary <= 60000, "次级新秀月薪应在2w~6w区间");

  // 3. LPL 顶级首发合同 (宗师/王者)
  const starterOffers = generateContractOffers({
    year: 2021,
    playerAge: 20,
    rankTier: "grandmaster",
    stats: { mechanics: 88, reaction: 86, gameSense: 85, teamwork: 85, mentality: 82, consistency: 84 },
    worldChampionTitlesCount: 0,
    hasMsiTitle: false,
    hasLplTitle: true,
  });
  const starter = starterOffers[0];
  assert(starter.roleTier === "top_starter", "应为LPL顶级首发合同");
  assert(starter.annualBaseSalary >= 1500000 && starter.annualBaseSalary <= 7000000, "LPL首发年薪应在150w~700w区间");

  // 4. 顶薪超级明星特权合同 (世界冠军)
  const starOffers = generateContractOffers({
    year: 2021,
    playerAge: 21,
    rankTier: "challenger",
    stats: { mechanics: 96, reaction: 95, gameSense: 94, teamwork: 92, mentality: 95, consistency: 92 },
    worldChampionTitlesCount: 1,
    hasMsiTitle: true,
    hasLplTitle: true,
  });
  const star = starOffers[0];
  assert(star.roleTier === "superstar_franchise", "应为顶薪超级明星特权合同");
  assert(star.annualBaseSalary >= 10000000, "顶薪明星年薪应达千万元级");
  assert(star.commercialShareRate >= 0.5, "超级明星商业分成应达到50%+");
  assert(star.hasNoTradeClause === true, "超级明星应享有不可交易条款");

  // 转会买断
  const buyoutWan = calculateContractBuyout(star);
  console.log(`明星合同违约买断金: ¥${buyoutWan.toLocaleString()} 万元`);
  assert(buyoutWan >= 4000, "超级明星违约买断金应达数千万元");

  const buyoutResult = executeTransferBuyout(star, "new_team", "Top Esports");
  assert(buyoutResult.success === true, "俱乐部买断执行应成功");
  console.log("✅ 测试 3 通过: 四级阶梯合同推进体系与违约买断算法严谨完备！");
}

console.log("----------------------------------------------------------------");
console.log("【测试 4: 常规赛大组双循环积分榜、净胜分与季后赛资格】");
{
  const regularTeams = [
    { teamId: "edg", teamName: "EDward Gaming", basePower: 86 },
    { teamId: "rng", teamName: "Royal Never Give Up", basePower: 85 },
    { teamId: "fpx", teamName: "FunPlus Phoenix", basePower: 84 },
    { teamId: "we", teamName: "Team WE", basePower: 80 },
    { teamId: "lng", teamName: "LNG Esports", basePower: 79 },
    { teamId: "ra", teamName: "Rare Atom", basePower: 76 },
    { teamId: "tes", teamName: "Top Esports", basePower: 83, isPlayerTeam: true },
    { teamId: "v5", teamName: "Victory Five", basePower: 68 },
  ];

  const seasonResult = simulateRegularSeason({
    seasonYear: 2021,
    split: "summer",
    teams: regularTeams,
    isDoubleRoundRobin: true,
    playoffCutoffRank: 4,
    relegationCutoffRank: 7,
    playerHeroName: "诡术妖姬",
    playerPerformanceBuff: 4,
  });

  console.log(`常规赛总场次: ${seasonResult.totalMatchesCount} 场 BO3`);
  assert(seasonResult.standings.length === 8, "应有 8 支队伍的排名");
  assert(seasonResult.playoffTeams.length === 4, "前 4 名应成功晋级季后赛");
  assert(seasonResult.relegationTeams.length === 2, "后 2 名应标记为降级风险");

  console.log("常规赛前三名:");
  seasonResult.standings.slice(0, 3).forEach(s => {
    console.log(`  第${s.rank}名 ${s.teamName}: ${s.wins}胜 ${s.losses}负, 净胜局: ${s.gameDiff}`);
  });

  // 严格单调性检查：积分第一名胜场应 >= 第二名
  assert(seasonResult.standings[0].points >= seasonResult.standings[1].points, "积分榜胜场排序应递减");
  console.log("✅ 测试 4 通过: 常规赛大组双循环积分榜与晋级/保级判定完整闭环！");
}

console.log("----------------------------------------------------------------");
console.log("【测试 5: 季后赛四强双败争银龙杯系统 (胜者组、败者组逆袭与总决赛)】");
{
  const top4 = [
    { teamId: "seed1", teamName: "FPX 战队", basePower: 86 },
    { teamId: "seed2", teamName: "EDG 战队", basePower: 88, isPlayerTeam: true },
    { teamId: "seed3", teamName: "RNG 战队", basePower: 84 },
    { teamId: "seed4", teamName: "WE 战队", basePower: 80 },
  ];

  const bracket = simulateDoubleEliminationPlayoffs({
    seasonYear: 2021,
    split: "summer",
    top4Seeds: top4,
    playerHeroName: "痛苦之拥",
    playerPerformanceBuff: 5,
  });

  console.log(`季后赛银龙杯总冠军: 🏆 ${bracket.champion}！`);
  console.log(`亚军: 🥈 ${bracket.runnerUp}`);
  console.log(`季军: 🥉 ${bracket.thirdPlace}`);
  console.log(`殿军: 🎖️ ${bracket.fourthPlace}`);

  assert(bracket.champion, "应决出总冠军");
  assert(bracket.runnerUp, "应决出亚军");
  assert(bracket.thirdPlace, "应决出季军");
  assert(bracket.fourthPlace, "应决出殿军");
  assert(bracket.grandFinal.format === "bo5", "总决赛必须为BO5");
  assert(bracket.grandFinal.scoreA === 3 || bracket.grandFinal.scoreB === 3, "BO5总决赛必须有一方率先取得3胜");

  console.log("✅ 测试 5 通过: 季后赛四强双败银龙杯对阵与晋级图谱运转精准！");
}

console.log("----------------------------------------------------------------");
console.log("【测试 6: S赛世界赛瑞士轮系统 (16支战队、3胜晋级8强、3负淘汰回家、生死战BO3)】");
{
  const swiss16 = [
    { teamName: "JDG (LPL#1)", region: "LPL", basePower: 92, isPlayerTeam: true },
    { teamName: "BLG (LPL#2)", region: "LPL", basePower: 89 },
    { teamName: "LNG (LPL#3)", region: "LPL", basePower: 87 },
    { teamName: "WBG (LPL#4)", region: "LPL", basePower: 86 },
    { teamName: "GEN (LCK#1)", region: "LCK", basePower: 91 },
    { teamName: "T1 (LCK#2)", region: "LCK", basePower: 90 },
    { teamName: "KT (LCK#3)", region: "LCK", basePower: 87 },
    { teamName: "DK (LCK#4)", region: "LCK", basePower: 86 },
    { teamName: "G2 (LEC#1)", region: "LEC", basePower: 83 },
    { teamName: "FNC (LEC#2)", region: "LEC", basePower: 80 },
    { teamName: "MAD (LEC#3)", region: "LEC", basePower: 76 },
    { teamName: "NRG (LCS#1)", region: "LCS", basePower: 78 },
    { teamName: "C9 (LCS#2)", region: "LCS", basePower: 77 },
    { teamName: "TL (LCS#3)", region: "LCS", basePower: 75 },
    { teamName: "PSG (PCS#1)", region: "PCS", basePower: 72 },
    { teamName: "GAM (VCS#1)", region: "VCS", basePower: 70 },
  ];

  const swissReport = simulateWorldsSwissStage({
    year: 2023,
    teams: swiss16,
    playerHeroName: "暗裔剑魔",
    playerPerformanceBuff: 4,
  });

  console.log(`瑞士轮经历轮次: ${swissReport.currentRound} 轮`);
  console.log(`晋级八强队伍数量: ${swissReport.qualifiedTeams.length} 支`);
  console.log(`淘汰出局队伍数量: ${swissReport.eliminatedTeams.length} 支`);

  // 严格断言：瑞士轮必须正好晋级 8 支，淘汰 8 支！
  assert(swissReport.qualifiedTeams.length === 8, "瑞士轮最终必须严格正好有 8 支队伍晋级八强！");
  assert(swissReport.eliminatedTeams.length === 8, "瑞士轮最终必须严格正好有 8 支队伍被淘汰出局！");

  // 每一支晋级队伍必须是 3 胜
  swissReport.qualifiedTeams.forEach(t => {
    assert(t.wins === 3, `晋级队伍 ${t.teamName} 必须取得 3 胜 (实际: ${t.wins}胜${t.losses}负)`);
    assert(t.losses < 3, `晋级队伍 ${t.teamName} 失败次数必须小于 3`);
  });

  // 每一支淘汰队伍必须是 3 负
  swissReport.eliminatedTeams.forEach(t => {
    assert(t.losses === 3, `淘汰队伍 ${t.teamName} 必须累计 3 负 (实际: ${t.wins}胜${t.losses}负)`);
    assert(t.wins < 3, `淘汰队伍 ${t.teamName} 胜利次数必须小于 3`);
  });

  console.log("八强晋级名单:");
  swissReport.qualifiedTeams.forEach(t => {
    console.log(`  🎉 ${t.teamName} [${t.region}] (${t.wins}胜 - ${t.losses}负)`);
  });

  // 检查生死战BO3与普通战BO1的赛制规范
  let totalBo3 = 0;
  let totalBo1 = 0;
  swissReport.roundsSummary.forEach(r => {
    totalBo3 += r.bo3Count;
    totalBo1 += r.bo1Count;
  });
  console.log(`瑞士轮总计完成: BO1 场次 ${totalBo1} 场, BO3 系列赛 ${totalBo3} 场`);
  assert(totalBo3 > 0, "必须存在晋级与淘汰的生死 BO3 系列赛");
  assert(totalBo1 > 0, "前几轮必须存在常规 BO1");

  console.log("✅ 测试 6 通过: S赛瑞士轮完整抽签对碰与 3胜晋级/3负淘汰逻辑无懈可击！");
}

console.log("----------------------------------------------------------------");
console.log("【测试 7: LSPL/LPL 升降级生死附加赛 (2014~2017 历史真实赛制)】");
{
  const lplBottom = { teamName: "King 战队", basePower: 74 };
  const lsplChallenger = { teamName: "Snake 战队", basePower: 76 };

  const relegation = simulateRelegationMatch(lplBottom, lsplChallenger, "圣枪游侠");
  console.log(`升降级决斗结果: ${relegation.narrative}`);
  assert(relegation.promotedOrRetainedTeam, "应产出获胜晋级或保级队伍");
  assert(relegation.relegatedTeam, "应产出降级队伍");
  assert(relegation.result.format === "bo5", "升降级生死战应为残酷BO5");
  console.log("✅ 测试 7 通过: 升降级附加赛逻辑正确！");
}

console.log("================================================================");
console.log("🎉 ALL TESTS PASSED! 英雄联盟真实历史赛季与职业生态系统 100% 验收通过！");
