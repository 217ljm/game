/**
 * 《1978—一生》英雄联盟职业合同与转会买断体系 (Esports Contracts System)
 * 纯逻辑、无 DOM、强类型实现。
 * 覆盖：
 * 1. 四级阶梯职业合同 (青训学徒 -> 次级新秀 -> LPL顶级首发 -> 顶薪超级明星)
 * 2. 真实转会身价评估、俱乐部报价与违约金买断算法
 * 3. 选手巅峰年龄衰减曲线、有效 APM 与神经反应延时 (ms) 折算
 * 4. 职业伤病衍生、理疗康复与决胜局“封闭针”医疗干预逻辑
 */

import type {
  ContractBuyoutResult,
  ContractRoleTier,
  EsportsContractTerms,
  InjurySeverity,
  InjuryType,
  LolSeasonYear,
  MedicalTreatmentResult,
  MedicalTreatmentType,
  PlayerDerivedMetrics,
  PlayerInjury,
  PlayerMicroStats,
  TournamentTier,
} from "./esports-contracts.ts";
import { HISTORICAL_TEAMS_DATABASE } from "./lol-historical-timeline.ts";

// ==========================================
// 1. 选手衍生指标与巅峰曲线
// ==========================================

export function calculateDerivedMetrics(
  stats: PlayerMicroStats,
  age: number,
  injuries: PlayerInjury[] = [],
  hasPainkillerBuff: boolean = false
): PlayerDerivedMetrics {
  // 基础六维综合加权分
  // 微操 25%, 反应 25%, 意识 20%, 协同 15%, 心态 10%, 稳定 5%
  let rawRating =
    stats.mechanics * 0.25 +
    stats.reaction * 0.25 +
    stats.gameSense * 0.20 +
    stats.teamwork * 0.15 +
    stats.mentality * 0.10 +
    stats.consistency * 0.05;

  // 伤病扣减 (若有封闭针BUFF，则临时免疫扣减)
  let apmDeduction = 0;
  let reactionMsPenalty = 0;
  let mechanicsDeduction = 0;

  if (!hasPainkillerBuff) {
    injuries.forEach(inj => {
      apmDeduction += inj.apmPenalty;
      reactionMsPenalty += inj.reactionMsPenalty;
      mechanicsDeduction += inj.mechanicsPenalty;
    });
  }

  // 基础 APM: 200 + mechanics * 2.2 - apmDeduction
  const baseApm = Math.round(200 + stats.mechanics * 2.2 - apmDeduction);
  const effectiveApm = Math.max(160, Math.min(480, baseApm));

  // 神经反射延时: 100分对应 135ms，60分对应 210ms
  // 公式: 210 - (reaction / 100) * 75 + reactionMsPenalty
  const baseReactionMs = Math.round(210 - (stats.reaction / 100) * 75 + reactionMsPenalty);
  const effectiveReactionMs = Math.max(130, Math.min(260, baseReactionMs));

  // 年龄曲线对综合战力的微调
  let ageModifier = 0;
  if (age >= 18 && age <= 22) {
    ageModifier = +2; // 黄金巅峰期
  } else if (age >= 25) {
    ageModifier = -Math.min(10, (age - 24) * 2.5); // 老将衰退
  }

  const overallRating = Math.max(50, Math.min(99, Math.round(rawRating - mechanicsDeduction * 0.3 + ageModifier)));

  // 等级评定
  let tierGrade: PlayerDerivedMetrics["tierGrade"] = "C";
  if (overallRating >= 93) tierGrade = "S+";
  else if (overallRating >= 86) tierGrade = "S";
  else if (overallRating >= 78) tierGrade = "A";
  else if (overallRating >= 68) tierGrade = "B";

  // 绝活英雄池
  const championPoolDepth = Math.max(3, Math.min(16, Math.floor((stats.gameSense + stats.consistency) / 14)));

  // 市场预估身价 (万元人民币)
  let marketValueWan = 0;
  if (overallRating >= 93) marketValueWan = 1500 + (overallRating - 93) * 300;
  else if (overallRating >= 86) marketValueWan = 600 + (overallRating - 86) * 120;
  else if (overallRating >= 78) marketValueWan = 150 + (overallRating - 78) * 55;
  else if (overallRating >= 68) marketValueWan = 30 + (overallRating - 68) * 12;
  else marketValueWan = 10;

  return {
    overallRating,
    tierGrade,
    effectiveApm,
    effectiveReactionMs,
    championPoolDepth,
    marketValueWan,
  };
}

// ==========================================
// 2. 四级阶梯合同生成器
// ==========================================

export interface ContractGenerationContext {
  year: LolSeasonYear;
  playerAge: number;
  rankTier: "diamond" | "master" | "grandmaster" | "challenger";
  stats: PlayerMicroStats;
  worldChampionTitlesCount: number;
  hasMsiTitle: boolean;
  hasLplTitle: boolean;
  preferredTeamId?: string;
}

export function generateContractOffers(ctx: ContractGenerationContext): EsportsContractTerms[] {
  const derived = calculateDerivedMetrics(ctx.stats, ctx.playerAge);
  const offers: EsportsContractTerms[] = [];

  // 获取该年份活跃的历史队伍
  const availableTeams = HISTORICAL_TEAMS_DATABASE.filter(t => t.foundedYear <= ctx.year);
  const selectedTeams = availableTeams.slice(0, 4);

  // 年份薪资通胀系数 (2011年基准 0.1x，2014年 0.4x，2018年 1.0x，2021年 1.2x)
  let inflationFactor = 1.0;
  if (ctx.year <= 2012) inflationFactor = 0.12;
  else if (ctx.year <= 2014) inflationFactor = 0.4;
  else if (ctx.year <= 2017) inflationFactor = 0.75;
  else if (ctx.year <= 2020) inflationFactor = 1.1;
  else inflationFactor = 1.25;

  selectedTeams.forEach((team, idx) => {
    // 判定可获得的合同阶梯
    let roleTier: ContractRoleTier = "youth_trainee";
    let leagueType: TournamentTier = "secondary_league";

    const isLegend = ctx.worldChampionTitlesCount > 0 || (derived.overallRating >= 93 && (ctx.hasMsiTitle || ctx.hasLplTitle));
    const isStarter = derived.overallRating >= 82 || ctx.rankTier === "grandmaster" || ctx.rankTier === "challenger";
    const isSecondary = derived.overallRating >= 72 || ctx.rankTier === "master";

    if (isLegend) {
      roleTier = "superstar_franchise";
      leagueType = "top_league";
    } else if (isStarter) {
      roleTier = "top_starter";
      leagueType = "top_league";
    } else if (isSecondary) {
      roleTier = "secondary_rookie";
      leagueType = ctx.year >= 2018 ? "secondary_league" : "secondary_league";
    } else {
      roleTier = "youth_trainee";
      leagueType = "secondary_league";
    }

    let monthlyBaseSalary = 0;
    let annualBaseSalary = 0;
    let signingBonusWan = 0;
    let buyoutClauseWan = 0;
    let commercialShareRate = 0.1;
    let winBonusPerMatch = 1000;
    let hasNoTradeClause = false;
    let minimumMatchGuarantee = 0.5;

    switch (roleTier) {
      case "youth_trainee":
        monthlyBaseSalary = Math.round((6000 + idx * 1000) * inflationFactor);
        annualBaseSalary = monthlyBaseSalary * 12;
        signingBonusWan = Math.round(1 * inflationFactor);
        buyoutClauseWan = Math.round(40 * inflationFactor);
        commercialShareRate = 0.1;
        winBonusPerMatch = 500;
        minimumMatchGuarantee = 0.2;
        break;

      case "secondary_rookie":
        monthlyBaseSalary = Math.round((25000 + idx * 5000) * inflationFactor);
        annualBaseSalary = monthlyBaseSalary * 12;
        signingBonusWan = Math.round(15 * inflationFactor);
        buyoutClauseWan = Math.round(180 * inflationFactor);
        commercialShareRate = 0.2;
        winBonusPerMatch = 2000;
        minimumMatchGuarantee = 0.4;
        break;

      case "top_starter":
        annualBaseSalary = Math.round((1800000 + idx * 400000) * inflationFactor);
        monthlyBaseSalary = Math.round(annualBaseSalary / 12);
        signingBonusWan = Math.round((60 + idx * 20) * inflationFactor);
        buyoutClauseWan = Math.round((1200 + idx * 300) * inflationFactor);
        commercialShareRate = 0.35;
        winBonusPerMatch = 10000;
        minimumMatchGuarantee = 0.75;
        break;

      case "superstar_franchise":
        annualBaseSalary = Math.round((12000000 + idx * 2500000) * inflationFactor);
        monthlyBaseSalary = Math.round(annualBaseSalary / 12);
        signingBonusWan = Math.round((300 + idx * 100) * inflationFactor);
        buyoutClauseWan = Math.round((6000 + idx * 1500) * inflationFactor);
        commercialShareRate = 0.6;
        winBonusPerMatch = 30000;
        hasNoTradeClause = true;
        minimumMatchGuarantee = 0.9;
        break;
    }

    offers.push({
      contractId: `contract_${ctx.year}_${team.teamId}_${idx}`,
      teamId: team.teamId,
      teamName: team.fullName,
      leagueType,
      roleTier,
      signYear: ctx.year,
      durationYears: roleTier === "superstar_franchise" ? 2 : (roleTier === "top_starter" ? 2 : 1),
      monthlyBaseSalary,
      annualBaseSalary,
      signingBonusWan,
      winBonusPerMatch,
      championshipBonusRate: roleTier === "superstar_franchise" ? 0.35 : 0.2,
      commercialShareRate,
      buyoutClauseWan,
      hasNoTradeClause,
      minimumMatchGuarantee,
      dailySoloRankQuota: roleTier === "youth_trainee" ? 14 : (roleTier === "secondary_rookie" ? 12 : 10),
    });
  });

  return offers;
}

// ==========================================
// 3. 转会与违约买断算法
// ==========================================

export function calculateContractBuyout(
  contract: EsportsContractTerms,
  elapsedYears: number = 0,
  isMutualAgreement: boolean = false
): number {
  const remainingYears = Math.max(0.5, contract.durationYears - elapsedYears);

  // 双方协议解约折价
  if (isMutualAgreement) {
    return Math.round((contract.annualBaseSalary / 10000) * remainingYears * 0.6);
  }

  // 强行买断条款基准
  if (contract.buyoutClauseWan > 0) {
    return contract.buyoutClauseWan;
  }

  // 默认违约倍率：剩余薪资总额的 2.0 倍
  const remainingSalaryWan = (contract.annualBaseSalary / 10000) * remainingYears;
  return Math.round(remainingSalaryWan * 2.0);
}

export function executeTransferBuyout(
  currentContract: EsportsContractTerms,
  paidBy: "player" | "new_team",
  newTeamName?: string
): ContractBuyoutResult {
  const buyoutAmountWan = calculateContractBuyout(currentContract);

  const narrative = paidBy === "player"
    ? `选手自掏腰包支付违约金 ¥${buyoutAmountWan.toLocaleString()} 万元买断与 ${currentContract.teamName} 的合同，重获自由人身份！`
    : `新东家 ${newTeamName || "新俱乐部"} 豪掷违约买断金 ¥${buyoutAmountWan.toLocaleString()} 万元激活违约买断条款，成功将选手从 ${currentContract.teamName} 招入麾下！`;

  return {
    success: true,
    buyoutAmountWan,
    paidByPlayerOrNewTeam: paidBy,
    freeAgentDate: new Date().toISOString().split("T")[0],
    narrative,
  };
}

// ==========================================
// 4. 职业伤病与“封闭针”医疗干预机制
// ==========================================

export function generateRandomInjury(year: LolSeasonYear): PlayerInjury {
  const injuryCatalog: {
    type: InjuryType;
    name: string;
    severity: InjurySeverity;
    apmPenalty: number;
    reactionMsPenalty: number;
    mechanicsPenalty: number;
  }[] = [
    {
      type: "carpal_tunnel",
      name: "手腕管综合征 (腕部积水钝痛)",
      severity: "moderate",
      apmPenalty: 35,
      reactionMsPenalty: 8,
      mechanicsPenalty: 7,
    },
    {
      type: "tenosynovitis",
      name: "右手手指狭窄性腱鞘炎 (连招微操僵硬)",
      severity: "mild",
      apmPenalty: 25,
      reactionMsPenalty: 5,
      mechanicsPenalty: 5,
    },
    {
      type: "cervical_spondylosis",
      name: "颈椎生理曲度变直压迫神经",
      severity: "moderate",
      apmPenalty: 15,
      reactionMsPenalty: 12,
      mechanicsPenalty: 4,
    },
    {
      type: "eye_strain_dryness",
      name: "重度视网膜视疲劳与干眼症 (观察延缓)",
      severity: "mild",
      apmPenalty: 10,
      reactionMsPenalty: 15,
      mechanicsPenalty: 3,
    },
    {
      type: "lumbar_strain",
      name: "重度腰肌劳损 (长局持久战耐力骤降)",
      severity: "moderate",
      apmPenalty: 20,
      reactionMsPenalty: 6,
      mechanicsPenalty: 5,
    },
  ];

  const template = injuryCatalog[Math.floor(Math.random() * injuryCatalog.length)];

  return {
    id: `inj_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: template.type,
    name: template.name,
    severity: template.severity,
    apmPenalty: template.apmPenalty,
    reactionMsPenalty: template.reactionMsPenalty,
    mechanicsPenalty: template.mechanicsPenalty,
    acquiredYear: year,
    isChronic: false,
    painLevel: 6,
  };
}

export function administerMedicalTreatment(
  injuries: PlayerInjury[],
  treatment: MedicalTreatmentType,
  isCriticalPlayoffsOrWorlds: boolean = false
): MedicalTreatmentResult {
  if (injuries.length === 0) {
    return {
      treatment,
      success: true,
      healedInjuries: [],
      painkillerBuffActive: false,
      riskOfRelapseRate: 0,
      narrative: "身体机能处于健康巅峰，无须额外医疗干预。",
    };
  }

  // 1. 打封闭针强行出战 (真实职业电竞生死局抉择)
  if (treatment === "painkiller_injection") {
    // 封闭针强行屏蔽疼痛与微操扣罚，但赛后伤病转化为慢性劳损的复发概率高达 65%
    return {
      treatment,
      success: true,
      healedInjuries: [],
      painkillerBuffActive: true,
      riskOfRelapseRate: 0.65,
      narrative: `【队医紧急干预】在关键生死战前，队医为选手患处注射强效止痛封闭针！短时间内手部神经疼痛被强行压制，微操手速与反应延时暂时完全恢复！但赛后旧伤复发加重风险极高！`,
    };
  }

  // 2. 针灸理疗
  if (treatment === "physiotherapy_massage") {
    const healed = injuries.slice(0, 1).map(i => i.name);
    return {
      treatment,
      success: true,
      healedInjuries: healed,
      painkillerBuffActive: false,
      riskOfRelapseRate: 0.15,
      narrative: `队医采用针灸电疗与穴位深层推拿，成功缓解了【${healed.join("、")}】的急性炎症。`,
    };
  }

  // 3. 轮换休养
  if (treatment === "rest_and_rotation") {
    const healed = injuries.map(i => i.name);
    return {
      treatment,
      success: true,
      healedInjuries: healed,
      painkillerBuffActive: false,
      riskOfRelapseRate: 0.05,
      narrative: `进入轮换替补名单进行为期两个月的封闭保守疗养，全部劳损基本消除。`,
    };
  }

  // 4. 手术治疗
  const healed = injuries.map(i => i.name);
  return {
    treatment,
    success: true,
    healedInjuries: healed,
    painkillerBuffActive: false,
    riskOfRelapseRate: 0.02,
    narrative: `微创关节镜手术圆满成功，病灶完全切除，但本赛季剩余赛事确认报销。`,
  };
}
