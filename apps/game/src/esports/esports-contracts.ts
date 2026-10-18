/**
 * 《1978—一生》英雄联盟职业联赛系统与合同规范 (LOL Esports Contracts & Types)
 * 纯逻辑、无 DOM、强类型定义。
 * 覆盖：
 * 1. 2011~2024 历年赛季时代划分与赛制类型 (LSPL/LDL次级联赛、LPL顶级联赛、MSI、全球总决赛S赛)
 * 2. 真实赛制架构 (常规赛大组双循环积分、季后赛双败争银龙杯、S赛瑞士轮)
 * 3. 选手六维微操、手速APM、神经反应延时(ms)与伤病指标
 * 4. 阶梯职业合同 (青训学徒 -> 次级新秀 -> LPL首发 -> 顶薪超级明星) 与转会买断规范
 */

// ==========================================
// 1. 历年赛季与电竞赛制类型
// ==========================================

export type LolSeasonYear =
  | 2011
  | 2012
  | 2013
  | 2014
  | 2015
  | 2016
  | 2017
  | 2018
  | 2019
  | 2020
  | 2021
  | 2022
  | 2023
  | 2024;

export type LolEraId =
  | "era_2011_inception"       // 2011 国服公测、TGA与城市英雄争霸赛
  | "era_2012_we_ig"           // 2012 IPL5世界冠军、WE与iG双雄
  | "era_2013_lpl_birth"       // 2013 首届LPL成立、OMG黑暗势力与皇族亚军
  | "era_2014_korean_lspl"     // 2014 LSPL创办、韩援狂潮来华、皇族二度亚军
  | "era_2015_edg_msi"         // 2015 首届MSI季中赛EDG破魔咒夺冠、S5滑铁卢
  | "era_2016_group_cross"     // 2016 异组双循环赛制、升降级赛残酷争夺
  | "era_2017_bird_nest"       // 2017 洲际赛夺冠、S7鸟巢韩国内战、四强之憾
  | "era_2018_franchise_ig"    // 2018 LPL联盟化取消升降级、LDL成立、iG首夺S赛总冠军(金色的雨)
  | "era_2019_fpx_phoenix"     // 2019 FPX凤凰涅槃巴黎捧杯、LPL卫冕
  | "era_2020_shanghai_dwg"    // 2020 联盟扩军17队、疫情线上赛、SN黑马亚军
  | "era_2021_edg_reignite"    // 2021 LPL四强引入双败制、冰岛冰河EDG夺冠(银龙重铸骑士归来)
  | "era_2022_drx_miracle"     // 2022 RNG三冠MSI、北美总决赛DRX黑马最后一舞
  | "era_2023_swiss_format"    // 2023 世界赛全面引入瑞士轮(3胜晋级3败出局)、JDG春夏双冠与T1四冠
  | "era_2024_fearless_draft"; // 2024 全局BP新赛制探索、新一代群雄逐鹿

export type TournamentTier =
  | "secondary_league" // 次级发展联赛 (LSPL 2014~2017 / LDL 2018~至今)
  | "top_league"        // 顶级职业联赛 (LPL 2013~至今)
  | "mid_season"        // 季中冠军赛 (MSI 2015~至今)
  | "world_championship"// 英雄联盟全球总决赛 (S赛 2011~至今)
  | "regional_qualifier"// 区域资格赛 / 冒泡赛 / 升降级赛
  | "demacia_cup";      // 德玛西亚杯杯赛

export type LeagueSplit = "spring" | "summer" | "annual";

export type MatchFormat = "bo1" | "bo3" | "bo5";

// ==========================================
// 2. 选手六维微操与生理指标
// ==========================================

export interface PlayerMicroStats {
  mechanics: number;   // 极限微操手速 (1~100)
  reaction: number;    // 神经反射延时折算 (1~100)
  gameSense: number;   // 战术大局观与地图嗅觉 (1~100)
  teamwork: number;    // 团队协同与团战走位 (1~100)
  mentality: number;   // 逆风大心脏与抗压心态 (1~100)
  consistency: number; // 稳定性与失误控制率 (1~100)
}

export interface PlayerDerivedMetrics {
  overallRating: number;         // 综合评级 (60~99)
  tierGrade: "C" | "B" | "A" | "S" | "S+";
  effectiveApm: number;          // 真实APM (220 ~ 450)
  effectiveReactionMs: number;   // 神经反应延时 (135ms ~ 220ms，越低越神级)
  championPoolDepth: number;     // 熟练绝活英雄数量 (3 ~ 15)
  marketValueWan: number;        // 市场预估身价 (万元人民币)
}

export type InjurySeverity = "mild" | "moderate" | "severe" | "critical";

export type InjuryType =
  | "carpal_tunnel"         // 腕管综合征 (手腕积水酸麻，微操大砍)
  | "tenosynovitis"         // 腱鞘炎 (手指僵硬刺痛，连招断档)
  | "cervical_spondylosis"  // 颈椎压迫神经 (久坐头晕恶心，大局观削弱)
  | "lumbar_strain"         // 腰肌劳损 (长局持久战体力透支)
  | "eye_strain_dryness"    // 深度视疲劳/干眼症 (观察力与反应延时增加)
  | "spontaneous_pneumothorax"; // 自发性气胸 (职业重疾，必须急诊休战)

export interface PlayerInjury {
  id: string;
  type: InjuryType;
  name: string;
  severity: InjurySeverity;
  apmPenalty: number;           // APM削减数值
  reactionMsPenalty: number;    // 反应延时增加(ms)
  mechanicsPenalty: number;     // 微操六维削减
  acquiredYear: number;
  isChronic: boolean;           // 是否已转化为慢性劳损
  painLevel: number;            // 疼痛指数 (1~10)
}

export type MedicalTreatmentType =
  | "rest_and_rotation"        // 替补轮休与保守疗养
  | "physiotherapy_massage"    // 物理理疗/推拿针灸
  | "painkiller_injection"     // 打封闭针强行出战 (临时锁死伤病惩罚，赛后恶化风险加剧)
  | "surgical_repair";         // 微创手术切除/康复治疗

export interface MedicalTreatmentResult {
  treatment: MedicalTreatmentType;
  success: boolean;
  healedInjuries: string[];
  painkillerBuffActive: boolean;
  riskOfRelapseRate: number;
  narrative: string;
}

// ==========================================
// 3. 阶梯职业合同与转会买断
// ==========================================

export type ContractRoleTier =
  | "youth_trainee"       // 1. 青训学徒合同 (俱乐部二队青训生)
  | "secondary_rookie"    // 2. 次级新秀合同 (LSPL/LDL次级主力或LPL二队替补)
  | "top_starter"         // 3. LPL顶级首发合同 (LPL一队稳定首发)
  | "superstar_franchise"; // 4. 顶薪超级明星特权合同 (S赛冠军/顶级战队核心)

export interface EsportsContractTerms {
  contractId: string;
  teamId: string;
  teamName: string;
  leagueType: TournamentTier;
  roleTier: ContractRoleTier;
  signYear: number;
  durationYears: number;          // 合同年限 (1~3年)
  monthlyBaseSalary: number;      // 月薪 (元)
  annualBaseSalary: number;       // 年薪总额 (元)
  signingBonusWan: number;        // 签字费 (万元)
  winBonusPerMatch: number;       // 单场胜场奖金 (元)
  championshipBonusRate: number;  // 赛事奖金分成比率 (0.1 ~ 0.5)
  commercialShareRate: number;    // 商业赞助/直播收益分成比率 (0.1 ~ 0.7)
  buyoutClauseWan: number;        // 违约金/强行买断金额 (万元)
  hasNoTradeClause: boolean;      // 是否包含不可交易条款
  minimumMatchGuarantee: number; // 赛季承诺最低出场小局率 (0.0 ~ 0.9)
  dailySoloRankQuota: number;     // 俱乐部规定的每日韩服排位盘数硬性指标 (如10~14把)
}

export interface ContractBuyoutResult {
  success: boolean;
  buyoutAmountWan: number;
  paidByPlayerOrNewTeam: "player" | "new_team";
  freeAgentDate: string;
  narrative: string;
}

// ==========================================
// 4. 真实赛事赛制积分与对局模型
// ==========================================

export interface RegularSeasonStanding {
  rank: number;
  teamId: string;
  teamName: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  gameWins: number;
  gameLosses: number;
  gameDiff: number; // 净胜局
  headToHeadRecords: Record<string, number>; // 对战其他队伍的小局净胜
  points: number;
  qualifiedForPlayoffs: boolean;
  seedPosition?: number;
  isRelegationRisk?: boolean; // 升降级风险 (2014-2017)
}

export interface SingleGameDetail {
  gameIndex: number;
  durationSeconds: number;
  durationFormatted: string; // "32:45"
  winner: "blue" | "red";
  blueTeamName: string;
  redTeamName: string;
  blueKills: number;
  redKills: number;
  blueTowers: number;
  redTowers: number;
  blueDragons: number;
  redDragons: number;
  blueBarons: number;
  redBarons: number;
  firstBloodClaimedBy: "blue" | "red";
  dragonSoulType?: "infernal" | "ocean" | "mountain" | "cloud" | "hextech" | "chemtech" | "elder";
  hasElderDragonSteal: boolean;
  hasBaronNashorSteal: boolean;
  mvpPlayer: string;
  mvpRole: string;
  mvpRating: number;
  playerPerformance?: {
    champion: string;
    kills: number;
    deaths: number;
    assists: number;
    cs: number;
    damageShare: number; // 伤害占比 (e.g. 0.32)
    isMvp: boolean;
  };
  highlightMoments: string[];
}

export interface SeriesMatchResult {
  matchId: string;
  stageName: string;
  format: MatchFormat;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  winnerTeam: string;
  loserTeam: string;
  isPlayerMatch: boolean;
  playerWon: boolean;
  games: SingleGameDetail[];
  narrative: string;
}

// ==========================================
// 5. 季后赛双败制与S赛瑞士轮模型
// ==========================================

export interface DoubleEliminationBracket {
  seasonYear: number;
  split: LeagueSplit;
  winnerBracketRounds: {
    roundName: string;
    matches: SeriesMatchResult[];
  }[];
  loserBracketRounds: {
    roundName: string;
    matches: SeriesMatchResult[];
  }[];
  grandFinal: SeriesMatchResult;
  champion: string;
  runnerUp: string;
  thirdPlace: string;
  fourthPlace: string;
}

export interface SwissStageTeamRecord {
  teamName: string;
  region: "LPL" | "LCK" | "LEC" | "LCS" | "PCS" | "VCS" | "CBLOL" | "LJL";
  wins: number;
  losses: number;
  status: "active" | "qualified" | "eliminated";
  roundResults: {
    round: number;
    opponent: string;
    format: "bo1" | "bo3";
    won: boolean;
    score: string;
  }[];
  historicalOpponents: string[];
}

export interface SwissStageReport {
  year: number;
  totalTeams: number; // 16
  currentRound: number;
  roundsSummary: {
    roundIndex: number;
    matchCount: number;
    bo3Count: number;
    bo1Count: number;
    matches: SeriesMatchResult[];
  }[];
  qualifiedTeams: SwissStageTeamRecord[]; // 8支 3胜队伍
  eliminatedTeams: SwissStageTeamRecord[]; // 8支 3负队伍
  playerTeamRecord?: SwissStageTeamRecord;
}
