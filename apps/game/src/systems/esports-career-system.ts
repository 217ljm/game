/**
 * 《1978—一生》电竞职业生涯与对战模拟引擎 (Esports Career & Match Engine)
 * 纯逻辑、无 DOM、强类型导出。
 * 包含：
 * 1. 选手能力六维、反应时间(ms)、APM、年龄巅峰衰减曲线、伤病与封闭针机制
 * 2. 四级阶梯职业合同（青训学徒、次级新秀、LPL首发、顶薪明星）与转会买断体系
 * 3. 真实战术 BP（阵型风格克制、红蓝方优劣、招牌英雄与针对性Ban位）
 * 4. 真实比赛与单局模拟（一血、控龙、抢大龙逆转、残局1v3、五杀收割、KDA、MVP评定）
 * 5. 联赛常规赛循环赛、季后赛双败制、世界赛瑞士轮 (3胜晋级3败出局) 对局推演
 */

// ==========================================
// 1. 时代与电竞项目数据库
// ==========================================

export type EsportsGameId =
  | "starcraft"
  | "cs_streetfighter"
  | "warcraft_3"
  | "dota_1"
  | "lol"
  | "dota2"
  | "honor_of_kings"
  | "pubg"
  | "valorant"
  | "cs2";

export interface EsportsGameInfo {
  id: string;
  name: string;
  eraYears: [number, number];
  genre: string;
  majors: string[];
  desc: string;
  secondaryLeagueName: string;
  topLeagueName: string;
  midSeasonMajor: string;
  worldChampionship: string;
  attributeWeights?: {
    mechanics: number;   // 微操手速权重 (APM)
    reaction: number;    // 反应速度权重 (ms)
    gameSense: number;   // 大局意识权重
    teamwork: number;    // 团队协作权重
    mentality: number;   // 心理抗压权重
    consistency?: number;
  };
}

export const ESPORTS_TIMELINE_DATABASE: EsportsGameInfo[] = [
  {
    id: "starcraft",
    name: "《星际争霸：母巢之战》",
    eraYears: [1998, 2004],
    genre: "RTS 实时战略",
    majors: ["WCG 世界电子竞技大赛", "CPL 职业锦标赛", "局域网擂台争霸赛"],
    desc: "局域网对决的开山神作！APM 300+ 的极限手速、多线空投骚扰与神级微操，点燃了第一代中国电竞少年的热血！",
    secondaryLeagueName: "城市网吧巡回锦标赛",
    topLeagueName: "全国职业大师联赛",
    midSeasonMajor: "中韩星际对抗赛",
    worldChampionship: "WCG 世界电子竞技大赛总决赛",
    attributeWeights: { mechanics: 0.35, reaction: 0.25, gameSense: 0.25, teamwork: 0.05, mentality: 0.1 },
  },
  {
    id: "cs_streetfighter",
    name: "《反恐精英 CS 1.6 / 街头霸王》",
    eraYears: [2000, 2008],
    genre: "FPS / FTG 竞技对抗",
    majors: ["WCG 中国区总决赛", "ESWC 电子竞技世界杯", "EVO 格斗大赛"],
    desc: "Dust2 上的枪林弹雨！听声辨位、瞬狙甩枪与极限手搓波动拳昇龙拳，中国 wNv 战队首夺 CS 世界冠军！",
    secondaryLeagueName: "全国高校与网吧大奖赛",
    topLeagueName: "CEG 全国电子竞技运动会",
    midSeasonMajor: "WEG 国际大师赛",
    worldChampionship: "ESWC 电子竞技世界杯 / WCG 总决赛",
    attributeWeights: { mechanics: 0.25, reaction: 0.4, gameSense: 0.15, teamwork: 0.1, mentality: 0.1 },
  },
  {
    id: "warcraft_3",
    name: "《魔兽争霸3：冰封王座》",
    eraYears: [2003, 2010],
    genre: "RTS 英雄竞技",
    majors: ["WCG 世界总决赛", "WEG 邀请赛", "IEF 国际数字娱乐嘉年华"],
    desc: "人皇 Sky 披着五星红旗登顶 WCG 世界之巅！一波流压制与英雄神级走位，中国电竞第一块世界单人金牌载入史册！",
    secondaryLeagueName: "各大对战平台月赛",
    topLeagueName: "WCG 中国区预选赛",
    midSeasonMajor: "WEG 世界魔兽大师赛",
    worldChampionship: "WCG 世界总决赛单人金牌战",
    attributeWeights: { mechanics: 0.3, reaction: 0.2, gameSense: 0.3, teamwork: 0.05, mentality: 0.15 },
  },
  {
    id: "dota_1",
    name: "《DotA (守卫雅典娜/War3自定义地图)》",
    eraYears: [2005, 2012],
    genre: "MOBA 团队推塔",
    majors: ["SMM 国际锦标赛", "WCG DotA项目", "G联赛", "ACG 亚洲锦标赛"],
    desc: "大学宿舍彻夜开黑！中路影魔 Solo、神灵跳刀救世，EHOME 十冠王统治世界，中国 DotA 的黄金传奇时代！",
    secondaryLeagueName: "11平台天梯挑战赛",
    topLeagueName: "G联赛全国总决赛",
    midSeasonMajor: "SMM 马来西亚国际邀请赛",
    worldChampionship: "ESWC 世界杯 / WCG DotA 巅峰战",
    attributeWeights: { mechanics: 0.2, reaction: 0.2, gameSense: 0.25, teamwork: 0.25, mentality: 0.1 },
  },
  {
    id: "lol",
    name: "《英雄联盟 League of Legends》",
    eraYears: [2011, 2030],
    genre: "MOBA 全球电竞巅峰",
    majors: ["德玛西亚杯", "LDL 发展联赛", "LPL 职业联赛(春/夏季赛)", "MSI 季中冠军赛", "S赛 全球总决赛"],
    desc: "全球瞩目的电竞盛宴！登峰造极境、不破不立，万众欢呼捧起召唤师杯，电竞正式入亚与体育化黄金盛世！",
    secondaryLeagueName: "LDL 英雄联盟发展联赛",
    topLeagueName: "LPL 中国英雄联盟职业联赛",
    midSeasonMajor: "MSI 季中冠军赛",
    worldChampionship: "S赛 英雄联盟全球总决赛 (召唤师杯)",
    attributeWeights: { mechanics: 0.25, reaction: 0.2, gameSense: 0.2, teamwork: 0.25, mentality: 0.1 },
  },
  {
    id: "valorant",
    name: "《无畏契约 VALORANT (瓦罗兰特)》",
    eraYears: [2020, 2030],
    genre: "战术 FPS 英雄射击",
    majors: ["全国海选公开赛", "进化者系列公开赛 (ACT)", "VCT CN 顶级联赛", "Masters 大师赛", "Champions 全球冠军赛"],
    desc: "精准架枪、技能协同与心跳残局！EDG 巴黎捧杯点燃瓦圈热血，康康大狙斩获 FMVP 创造中国电竞新奇迹！",
    secondaryLeagueName: "无畏契约进化者系列公开赛 (Act)",
    topLeagueName: "VCT CN 顶级职业联赛",
    midSeasonMajor: "VCT Masters 国际大师赛 (马德里/上海/多伦多)",
    worldChampionship: "VALORANT Champions 全球冠军赛",
    attributeWeights: { mechanics: 0.2, reaction: 0.35, gameSense: 0.2, teamwork: 0.15, mentality: 0.1 },
  },
  {
    id: "cs2",
    name: "《反恐精英 2 (CS2 / CS:GO)》",
    eraYears: [2012, 2030],
    genre: "经典战术 FPS",
    majors: ["亚洲 RMR 资格赛", "IEM 卡托维兹 / 科隆顶级特锦赛", "CS Major 世界锦标赛"],
    desc: "绝对硬核的枪法对决！一颗烟一颗闪的精妙配合，亚洲预选征战 Major 挑战者组与传奇组，争夺冠军组金色贴纸！",
    secondaryLeagueName: "完美世界高校公开赛 / 亚洲 RMR 预选",
    topLeagueName: "IEM 顶级国际超级邀请赛",
    midSeasonMajor: "BLAST Premier 春季全球总决赛",
    worldChampionship: "CS2 Major 世界锦标赛 (Major Champions)",
    attributeWeights: { mechanics: 0.2, reaction: 0.4, gameSense: 0.2, teamwork: 0.1, mentality: 0.1 },
  },
  {
    id: "dota2",
    name: "《DOTA2》",
    eraYears: [2013, 2030],
    genre: "MOBA 国际邀请赛",
    majors: ["DPC 中国联赛", "Major 特锦赛", "TI 国际邀请赛(不朽神盾)"],
    desc: "数千万美元奖金的不朽神盾之争！IG、Newbee、Wings 护国神翼传奇，刀塔少年永不熄灭的热血与青春！",
    secondaryLeagueName: "DPC 乙级联赛 (A级/海选)",
    topLeagueName: "DPC 中国顶级甲级联赛",
    midSeasonMajor: "DOTA2 Major 国际特锦赛",
    worldChampionship: "TI 国际邀请赛 (The International)",
    attributeWeights: { mechanics: 0.2, reaction: 0.15, gameSense: 0.3, teamwork: 0.25, mentality: 0.1 },
  },
  {
    id: "honor_of_kings",
    name: "《王者荣耀》",
    eraYears: [2017, 2030],
    genre: "移动 MOBA 电竞",
    majors: ["全国大赛", "K甲 职业发展联赛 (KGL)", "KPL 职业联赛", "世界冠军杯 (KIC)"],
    desc: "移动电竞现象级霸主！随时随地开黑上王者，指尖极限微操，征战万人体育馆职业殿堂！",
    secondaryLeagueName: "K甲 职业发展联赛 (KGL)",
    topLeagueName: "KPL 王者荣耀职业联赛",
    midSeasonMajor: "KPL 夏季季后赛 / 挑战者杯",
    worldChampionship: "王者荣耀世界冠军杯 (KIC)",
    attributeWeights: { mechanics: 0.25, reaction: 0.25, gameSense: 0.2, teamwork: 0.2, mentality: 0.1 },
  },
  {
    id: "pubg",
    name: "《绝地求生 PUBG》",
    eraYears: [2017, 2030],
    genre: "大逃杀 战术竞技",
    majors: ["PCL 绝地求生冠军联赛", "PCS 洲际赛", "PGC 全球总决赛"],
    desc: "大吉大利今晚吃鸡！百人跳伞搜房、转移选点进圈、决赛圈一穿四封神！",
    secondaryLeagueName: "PDL 发展联赛",
    topLeagueName: "PCL 绝地求生冠军联赛",
    midSeasonMajor: "PCS 洲际锦标赛",
    worldChampionship: "PGC 全球总决赛",
    attributeWeights: { mechanics: 0.2, reaction: 0.3, gameSense: 0.25, teamwork: 0.15, mentality: 0.1 },
  },
];

// ==========================================
// 2. 天梯段位体系与生涯梯队
// ==========================================

export type EsportsRankTier =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "master"
  | "grandmaster"
  | "challenger";

export const RANK_TIER_ORDER: EsportsRankTier[] = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "master",
  "grandmaster",
  "challenger",
];

export const RANK_TIER_NAMES: Record<EsportsRankTier, string> = {
  bronze: "英勇黄铜",
  silver: "不屈白银",
  gold: "荣耀黄金",
  platinum: "华贵铂金",
  diamond: "璀璨钻石",
  master: "超凡大师",
  grandmaster: "傲世宗师",
  challenger: "最强王者 / 赋能战神 / 巅峰第一",
};

export type EsportsCareerLadderTier =
  | "amateur_ladder"      // 高分路人王（天梯排位、网吧赛、青训招募候选）
  | "youth_tryout"         // 青训试训期（残酷选拔考核）
  | "secondary_ldl"        // 次级发展联赛（LDL / 进化者系列赛 / K甲）
  | "top_pro_league"       // 顶级职业联赛（LPL / VCT CN / KPL 首发）
  | "international_msi"    // 季中冠军赛（MSI / Masters）
  | "worlds_championship"  // 全球总决赛（S赛瑞士轮与淘汰赛 / Champions / Major）
  | "retired";             // 退役转型期

export const CAREER_LADDER_NAMES: Record<EsportsCareerLadderTier, string> = {
  amateur_ladder: "高分路人王冲分期",
  youth_tryout: "俱乐部青训试训考察期",
  secondary_ldl: "次级职业发展联赛 (LDL / 进化者)",
  top_pro_league: "顶级职业联赛 (LPL / VCT CN)",
  international_msi: "季中冠军赛出征 (MSI / Masters)",
  worlds_championship: "全球总决赛决战 (S赛 / Champions)",
  retired: "退役转型名宿",
};

// ==========================================
// 3. 选手能力六维、伤病与生理状态
// ==========================================

export interface EsportsPlayerStats {
  mechanics: number;   // 微操与手速 (APM 100~450+，数值 0~100)
  reaction: number;    // 反应速度 (毫秒级神经反射 140~240ms，数值 0~100)
  gameSense: number;   // 战术大局观与意识 (数值 0~100)
  mentality: number;   // 心理抗压与大心脏 (数值 0~100)
  teamwork: number;    // 团队协作与沟通 (数值 0~100)
  consistency: number; // 竞技状态稳定性 (数值 0~100)
}

export type InjuryId =
  | "tenosynovitis"     // 手腕腱鞘炎
  | "cervical_strain"   // 颈椎腰椎劳损
  | "carpal_tunnel"     // 腕管综合征
  | "dry_eye";          // 重度干眼与视疲劳

export interface EsportsInjury {
  id: string;
  name: string;
  severity: "mild" | "moderate" | "severe";
  description: string;
  reactionPenalty: number;
  mechanicsPenalty: number;
  consistencyPenalty?: number;
  remainingQuarters: number;
}

export interface EsportsPhysiology {
  fatigue: number;             // 疲劳度 (0~100)
  mentalPressure: number;      // 心理压力 (0~100)
  injuries: EsportsInjury[];
  hasPainkillerBuff?: boolean; // 封闭针加持
  painkillerRemainingGames?: number;
}

/** 衍生属性：计算实际 APM (手速操作频度) */
export function calculateEffectiveApm(mechanics: number, fatigue: number = 0, injuries: EsportsInjury[] = []): number {
  let penalty = 0;
  for (const inj of injuries) {
    penalty += inj.mechanicsPenalty * 2.5;
  }
  const fatiguePen = (fatigue / 100) * 45;
  return Math.max(120, Math.round(140 + mechanics * 3.1 - penalty - fatiguePen));
}

/** 衍生属性：计算实际反应时间 (毫秒 ms，越低越好) */
export function calculateEffectiveReactionMs(reaction: number, fatigue: number = 0, injuries: EsportsInjury[] = []): number {
  let penalty = 0;
  for (const inj of injuries) {
    penalty += inj.reactionPenalty * 1.5;
  }
  const fatiguePen = (fatigue / 100) * 35;
  const reduction = reaction * 1.1; // 100反应减少110ms -> 140ms
  return Math.max(135, Math.round(250 - reduction + penalty + fatiguePen));
}

/** 年龄巅峰曲线与衰减系数计算 */
export interface AgeCurveProfile {
  age: number;
  phaseName: string;
  mechanicsGrowth: number;
  reactionGrowth: number;
  gameSenseGrowth: number;
  mentalityGrowth: number;
  teamworkGrowth: number;
  consistencyGrowth: number;
  injuryRiskMultiplier: number;
  summary: string;
}

export function getPlayerAgeCurveProfile(age: number): AgeCurveProfile {
  if (age <= 16) {
    return {
      age,
      phaseName: "青训天才少年期 (14-16岁)",
      mechanicsGrowth: 4,
      reactionGrowth: 4,
      gameSenseGrowth: 2,
      mentalityGrowth: 1,
      teamworkGrowth: 1,
      consistencyGrowth: 1,
      injuryRiskMultiplier: 0.5,
      summary: "🌱 身体处于生长发育黄金期，神经反射极快，APM 飙升，但赛场阅历尚浅，急需大赛洗礼！",
    };
  } else if (age <= 21) {
    return {
      age,
      phaseName: "黄金统治巅峰期 (17-21岁)",
      mechanicsGrowth: 2,
      reactionGrowth: 1,
      gameSenseGrowth: 3,
      mentalityGrowth: 2,
      teamworkGrowth: 2,
      consistencyGrowth: 2,
      injuryRiskMultiplier: 1.0,
      summary: "👑 电竞选手的绝对统治黄金期！微操与反应处于历史最高点，战术意识与团队协同全面成熟！",
    };
  } else if (age <= 24) {
    return {
      age,
      phaseName: "老将成熟领袖期 (22-24岁)",
      mechanicsGrowth: -1,
      reactionGrowth: -2,
      gameSenseGrowth: 2,
      mentalityGrowth: 3,
      teamworkGrowth: 2,
      consistencyGrowth: 1,
      injuryRiskMultiplier: 1.6,
      summary: "🛡️ 赛场领袖与指挥大核！微操略有波动，但心理大心脏、战术阅读与抗压能力达到峰值！",
    };
  } else if (age <= 27) {
    return {
      age,
      phaseName: "高龄衰退期 (25-27岁)",
      mechanicsGrowth: -3,
      reactionGrowth: -4,
      gameSenseGrowth: 0,
      mentalityGrowth: 1,
      teamworkGrowth: 0,
      consistencyGrowth: -2,
      injuryRiskMultiplier: 2.5,
      summary: "⌛ 神经反应与微操出现生理性下滑，手腕与颈椎伤病频发，需依靠极致的经验与预判维持战力。",
    };
  } else {
    return {
      age,
      phaseName: "暮年退役抉择期 (28岁+)",
      mechanicsGrowth: -5,
      reactionGrowth: -6,
      gameSenseGrowth: -1,
      mentalityGrowth: 0,
      teamworkGrowth: -1,
      consistencyGrowth: -4,
      injuryRiskMultiplier: 3.5,
      summary: "🛑 已经打破电竞高龄纪录，身体高负荷运转，是时候光荣退役转型教练、解说或战队老板！",
    };
  }
}

// ==========================================
// 4. 俱乐部与合同体系（4级阶梯合同与转会）
// ==========================================

export type EsportsTeamTier = "T1_elite" | "T2_strong" | "T3_mid" | "T4_academy";

export interface EsportsTeam {
  id: string;
  name: string;
  shortName: string;
  tier: EsportsTeamTier;
  region: string;
  strength: number;      // 基础战力 (0~100)
  popularity: number;    // 俱乐部知名度与粉丝底蕴 (0~100)
  eraFit: [number, number];
  historyHonors: string[];
}

export const ESPORTS_TEAMS_DATABASE: EsportsTeam[] = [
  {
    id: "team_blg",
    name: "Bilibili Gaming (BLG 哔哩哔哩)",
    shortName: "BLG",
    tier: "T1_elite",
    region: "LPL",
    strength: 95,
    popularity: 96,
    eraFit: [2018, 2030],
    historyHonors: ["2024 LPL 春夏双冠王", "2024 MSI 亚军", "2024 S14 全球总决赛世界亚军"],
  },
  {
    id: "team_tes",
    name: "Top Esports (TES 滔搏)",
    shortName: "TES",
    tier: "T1_elite",
    region: "LPL",
    strength: 93,
    popularity: 94,
    eraFit: [2019, 2030],
    historyHonors: ["2020 MSC 季中杯冠军", "2020 LPL 夏季赛冠军", "多届世界总决赛八强"],
  },
  {
    id: "team_jdg",
    name: "JD Gaming (JDG 京东)",
    shortName: "JDG",
    tier: "T1_elite",
    region: "LPL",
    strength: 94,
    popularity: 92,
    eraFit: [2018, 2030],
    historyHonors: ["2023 MSI 季中冠军赛世界冠军", "LPL 四座银龙杯总冠军"],
  },
  {
    id: "team_wbg",
    name: "Weibo Gaming (WBG 微博)",
    shortName: "WBG",
    tier: "T1_elite",
    region: "LPL",
    strength: 91,
    popularity: 93,
    eraFit: [2021, 2030],
    historyHonors: ["2023 S13 全球总决赛世界亚军", "2024 S14 四强"],
  },
  {
    id: "team_edg",
    name: "EDward Gaming (EDG 骑士团)",
    shortName: "EDG",
    tier: "T1_elite",
    region: "LPL / VCT",
    strength: 94,
    popularity: 98,
    eraFit: [2014, 2030],
    historyHonors: [
      "2021 S11 英雄联盟全球总决赛世界总冠军",
      "2024 VALORANT Champions 全球冠军赛世界总冠军",
      "LPL 六冠王",
      "首届 2015 MSI 冠军",
    ],
  },
  {
    id: "team_rng",
    name: "Royal Never Give Up (RNG 皇族)",
    shortName: "RNG",
    tier: "T1_elite",
    region: "LPL",
    strength: 91,
    popularity: 95,
    eraFit: [2015, 2030],
    historyHonors: ["三届 MSI 季中冠军赛世界总冠军 (2018/2021/2022)", "雅加达亚运会金牌班底"],
  },
  {
    id: "team_ig",
    name: "Invictus Gaming (iG 极之极)",
    shortName: "iG",
    tier: "T1_elite",
    region: "LPL / DOTA",
    strength: 92,
    popularity: 96,
    eraFit: [2011, 2030],
    historyHonors: ["2018 S8 全球总决赛世界总冠军 (LPL首冠)", "TI2 国际邀请赛不朽神盾世界冠军"],
  },
  {
    id: "team_fpx",
    name: "FunPlus Phoenix (FPX 凤凰)",
    shortName: "FPX",
    tier: "T2_strong",
    region: "LPL / VCT",
    strength: 89,
    popularity: 88,
    eraFit: [2018, 2030],
    historyHonors: ["2019 S9 全球总决赛世界总冠军", "VCT CN 顶级强队"],
  },
  {
    id: "team_lng",
    name: "LNG Esports (苏州 LNG)",
    shortName: "LNG",
    tier: "T2_strong",
    region: "LPL",
    strength: 89,
    popularity: 85,
    eraFit: [2019, 2030],
    historyHonors: ["多次进军 S 赛全球八强", "LPL 季后赛季军"],
  },
  {
    id: "team_we",
    name: "World Elite (WE 战队)",
    shortName: "WE",
    tier: "T2_strong",
    region: "LPL",
    strength: 87,
    popularity: 92,
    eraFit: [2005, 2030],
    historyHonors: ["Sky 魔兽争霸 WCG 双冠", "IPL5 英雄联盟世界总冠军", "2017 LPL 春冠"],
  },
  {
    id: "team_young_miracles",
    name: "Young Miracles (YM 电竞黄埔军校)",
    shortName: "YM",
    tier: "T4_academy",
    region: "LDL",
    strength: 80,
    popularity: 85,
    eraFit: [2015, 2030],
    historyHonors: ["输出 Ning、Tian 两位 S 赛 FMVP 与顶尖巨星的传奇青训基地"],
  },
  {
    id: "team_edg_youth",
    name: "EDG.Y 青训战队",
    shortName: "EDG.Y",
    tier: "T4_academy",
    region: "LDL",
    strength: 82,
    popularity: 80,
    eraFit: [2018, 2030],
    historyHonors: ["LDL 次级联赛总冠军", "一线豪门核心人才储备库"],
  },
  {
    id: "team_te",
    name: "Trace Esports (TE 溯)",
    shortName: "TE",
    tier: "T1_elite",
    region: "VCT CN",
    strength: 90,
    popularity: 88,
    eraFit: [2022, 2030],
    historyHonors: ["2024 Champions 首尔全球八强", "击败欧美豪门创造黑马神话"],
  },
  {
    id: "team_drg",
    name: "Dragon Ranger Gaming (DRG)",
    shortName: "DRG",
    tier: "T2_strong",
    region: "VCT CN",
    strength: 86,
    popularity: 82,
    eraFit: [2022, 2030],
    historyHonors: ["VCT CN 进化者晋级总决赛", "顶尖战术枪法战队"],
  },
  {
    id: "team_tyloo",
    name: "TYLOO 电子竞技俱乐部 (天禄)",
    shortName: "TYLOO",
    tier: "T1_elite",
    region: "CS2 / CN",
    strength: 90,
    popularity: 95,
    eraFit: [2007, 2030],
    historyHonors: ["多次打进 CS:GO Major 传奇组", "亚洲 CS 多年绝对霸主"],
  },
  {
    id: "team_lvg",
    name: "Lynn Vision Gaming (LVG 战队)",
    shortName: "LVG",
    tier: "T1_elite",
    region: "CS2 / CN",
    strength: 88,
    popularity: 89,
    eraFit: [2018, 2030],
    historyHonors: ["成功晋级 2024 哥本哈根 Major 世界锦标赛", "新生代拼抢之王"],
  },
  {
    id: "team_wolves",
    name: "Chongqing Wolves (重庆狼队)",
    shortName: "Wolves",
    tier: "T1_elite",
    region: "KPL",
    strength: 94,
    popularity: 96,
    eraFit: [2017, 2030],
    historyHonors: ["KPL 十冠王朝超级霸主", "世界冠军杯 KIC 大满贯总冠军"],
  },
  {
    id: "team_ag",
    name: "Chengdu AG SuperPlay (成都 AG 超玩会)",
    shortName: "AG",
    tier: "T1_elite",
    region: "KPL / CF",
    strength: 93,
    popularity: 98,
    eraFit: [1999, 2030],
    historyHonors: ["KPL 超人气总冠军", "穿越火线多冠王朝", "最高人气俱乐部"],
  },
];

export type ContractRoleType =
  | "youth_trainee"         // 1. 青训学徒合同 (包吃住月薪 6k~1w)
  | "substitute"            // 2. 次级新秀合同 (月薪 2w~5w)
  | "starter"               // 3. 顶级联赛首发合同 (年薪 100w~500w)
  | "franchise_star";       // 4. 顶薪明星合同 (年薪千万级 + 高额代言直播分成)

export interface EsportsContract {
  teamId: string;
  teamName: string;
  teamTier: EsportsTeamTier;
  role: ContractRoleType;
  roleName: string;
  durationYears: number;
  monthlyBaseSalary: number;
  annualBaseSalary?: number;
  sponsorshipShareRate: number;
  streamingShareRate: number;
  prizePoolShareRate: number;
  buyoutFee: number;
  signingBonus: number;
  estimatedAnnualTotal: number;
  perksDesc?: string;
}

// ==========================================
// 5. 战术 BP 系统（阵型风格、红蓝方优劣、招牌英雄与Ban位）
// ==========================================

export type EsportsTacticsBP =
  | "aggressive_dive"       // 前期进攻越塔打架
  | "dragon_control"       // 控龙与野区资源稳健运营
  | "split_push"           // 四一分推单带抓单
  | "teamfight_wombo"      // 大招流协同决胜团
  | "tempo_fast_push";     // 前期快节奏推塔

export const TACTICS_BP_NAMES: Record<EsportsTacticsBP, { name: string; desc: string }> = {
  aggressive_dive: {
    name: "前期进攻越塔强杀",
    desc: "注重前期对线击杀与野区入侵，微操优势显著时极易滚雪球，但失误会被反蹲打崩。",
  },
  dragon_control: {
    name: "控龙与野区资源运营",
    desc: "稳健控小龙控巢虫，不给对手抓破绽机会，依靠扎实的经济运营步步蚕食。",
  },
  split_push: {
    name: "四一分推与抓单打团",
    desc: "由单人路进行兵线牵制，诱敌分兵后抓单各个击破，逆风翻盘利器。",
  },
  teamfight_wombo: {
    name: "大招流全员团战决胜",
    desc: "选出强开团阵容，围绕大龙与远古龙爆发决胜 5v5 团战，考验团队默契与大心脏。",
  },
  tempo_fast_push: {
    name: "前期快节奏推塔",
    desc: "选强势推线组合，控先锋抢一血，快速滚雪球推平防御塔。",
  },
};

export type TacticalStyleType =
  | "dive_teamfight"     // 强开团冲脸体系
  | "poke_siege"         // 长手消耗拉扯体系
  | "split_push"         // 四一分推单带体系
  | "early_rush"         // 前期快攻节奏体系
  | "protect_carry";     // 后期四保一大核体系

export interface TacticalStyleInfo {
  type: TacticalStyleType;
  name: string;
  counteredBy: TacticalStyleType;
  counters: TacticalStyleType;
  description: string;
}

export const TACTICAL_STYLES: Record<TacticalStyleType, TacticalStyleInfo> = {
  dive_teamfight: {
    type: "dive_teamfight",
    name: "强势开团强冲脸体系",
    counters: "poke_siege",
    counteredBy: "split_push",
    description: "多点硬控、强开摧毁后排，最擅长在龙坑和野区直接接团！",
  },
  poke_siege: {
    type: "poke_siege",
    name: "长手消耗与阵地拉扯体系",
    counters: "protect_carry",
    counteredBy: "dive_teamfight",
    description: "手长消耗磨血，推塔守关能力极强，折磨对手心态！",
  },
  split_push: {
    type: "split_push",
    name: "四一分推与兵线牵制体系",
    counters: "dive_teamfight",
    counteredBy: "early_rush",
    description: "无解单带拉扯空间，正面拉扯逼对手回防，用兵线蚕食资源！",
  },
  early_rush: {
    type: "early_rush",
    name: "前期快攻越塔滚雪球体系",
    counters: "split_push",
    counteredBy: "protect_carry",
    description: "野区入侵抢节奏、对线越塔压制，在20分钟内终结比赛！",
  },
  protect_carry: {
    type: "protect_carry",
    name: "后期四保一超级大核体系",
    counters: "early_rush",
    counteredBy: "poke_siege",
    description: "筑牢防线稳健发育，将胜负交由后期绝对大核心终结！",
  },
};

export interface ChampionPick {
  id: string;
  name: string;
  role: "top" | "jungle" | "mid" | "adc" | "support";
  tier: "T0_meta" | "T1_strong" | "T2_comfort";
  isSignature: boolean;
  mastery: number;
}

export interface DraftPickBanResult {
  blueSidePicks: string[];
  redSidePicks: string[];
  blueSideBans: string[];
  redSideBans: string[];
  playerPickedHero: string;
  isPlayerSignatureBanned: boolean;
  playerTacticalStyle: TacticalStyleType;
  opponentTacticalStyle: TacticalStyleType;
  bpAdvantageScore: number;
  bpAdvantageReason: string;
}

// ==========================================
// 6. 单局关键事件与详细战报
// ==========================================

export type MatchKeyEventType =
  | "first_blood"      // 一血极限单杀
  | "dragon_control"    // 控下关键听牌龙/龙魂
  | "baron_steal"      // 绝境抢大龙逆转乾坤
  | "clutch_1v3"       // 残局 1v3 极限界限反杀
  | "pentakill"        // 团战毁天灭地五杀收割
  | "backdoor_win";    // 绝命偷家破水晶逆天绝杀

export interface MatchKeyEvent {
  minute: number;
  type: MatchKeyEventType;
  title: string;
  narrative: string;
  isPlayerSideHeroic: boolean;
}

export interface SingleGameDetail {
  gameIndex: number;
  durationMinutes: number;
  playerTeamScore: number;
  opponentTeamScore: number;
  isWin: boolean;
  kills: number;
  deaths: number;
  assists: number;
  damageShare: number;
  goldLead: number;
  isMvp: boolean;
  mvpRating: number;
  keyEvents: MatchKeyEvent[];
  briefHighlight: string;
}

export interface MatchScoreLog {
  opponentTeam: string;
  playerScore: number;
  opponentScore: number;
  isWin: boolean;
  playerKDA: string;
  isMVP: boolean;
  tacticsUsed: EsportsTacticsBP;
  matchDescription: string;
  damageShare: number;
  highlightMoments: string[];
  detailedGames?: SingleGameDetail[];
}

// ==========================================
// 7. 联赛赛制与瑞士轮体系
// ==========================================

export interface LeagueStandingRow {
  rank: number;
  teamName: string;
  wins: number;
  losses: number;
  points: number;
  gameDiff: number;
}

export interface SwissTeamRecord {
  teamName: string;
  wins: number;
  losses: number;
  isEliminated: boolean;
  isQualified: boolean;
  historyRounds: string[];
}

export interface SwissTournamentResult {
  qualifiedTeams: string[];
  eliminatedTeams: string[];
  playerRecord: SwissTeamRecord;
  roundsSummary: Array<{
    roundIndex: number;
    description: string;
    playerMatch?: MatchScoreLog;
  }>;
  isPlayerQualified: boolean;
}

export type EsportsSeasonPhase =
  | "spring_regular"
  | "spring_playoffs"
  | "msi_international"
  | "summer_regular"
  | "summer_playoffs"
  | "worlds_swiss_stage"
  | "worlds_knockout"
  | "offseason";

export interface SeasonHistoryArchive {
  year: number;
  gameId: string;
  gameName: string;
  teamName: string;
  springRegularRank: number;
  springPlayoffResult: string;
  msiResult: string;
  summerRegularRank: number;
  summerPlayoffResult: string;
  worldsResult: string;
  annualSalaryEarned: number;
  annualPrizeEarned: number;
  annualStreamEarned: number;
  honorsWon: string[];
}

export type EsportsTransitionCareer =
  | "gold_coach"
  | "official_caster"
  | "top_streamer"
  | "club_founder";

export interface TransitionCareerInfo {
  careerType: EsportsTransitionCareer;
  title: string;
  monthlyBaseIncome: number;
  reputationGainPerYear: number;
  requirementsDesc: string;
  narrative: string;
}

export interface EsportsSeasonState {
  currentRank: EsportsRankTier;
  rankPoints: number;
  ladderMMR: number;
  isSignedPro: boolean;
  currentContract: EsportsContract | null;
  teamName: string;
  careerLadderTier: EsportsCareerLadderTier;
  playerStats: EsportsPlayerStats;
  physiology: EsportsPhysiology;
  seasonPhase: EsportsSeasonPhase;
  currentYear: number;
  currentGameId: EsportsGameId;
  springRank: number;
  summerRank: number;
  isWorldChampion: boolean;
  proMonthlySalary: number;
  regularSeasonMatches: MatchScoreLog[];
  playoffMatches: MatchScoreLog[];
  worldsMatches: MatchScoreLog[];
  leagueStandings: LeagueStandingRow[];
  trophyCabinet: string[];
  totalPrizeMoneyWon: number;
  careerHistory: SeasonHistoryArchive[];
  isRetired: boolean;
  transitionCareer: EsportsTransitionCareer | null;
  transitionMonthlyIncome: number;
  // 赛制与阶段关键状态
  regularSeasonWins: number;
  regularSeasonLosses: number;
  playoffRound: number;
  isPlayoffEliminated: boolean;
  swissWins: number;
  swissLosses: number;
  tacticsPreference: EsportsTacticsBP;
  consecutiveWins: number;
  signatureChampions?: ChampionPick[];
}

// ==========================================
// 8. 核心模拟与对战引擎实现 (EsportsCareerSystem)
// ==========================================

export class EsportsCareerSystem {
  public state: EsportsSeasonState;

  constructor() {
    this.state = {
      currentRank: "diamond",
      rankPoints: 65,
      ladderMMR: 2150,
      isSignedPro: false,
      currentContract: null,
      teamName: "峡谷路人王 / 自由人",
      careerLadderTier: "amateur_ladder",
      playerStats: {
        mechanics: 82,   // 约 360 APM
        reaction: 85,    // 约 165 ms
        gameSense: 74,
        mentality: 78,
        teamwork: 72,
        consistency: 76,
      },
      physiology: {
        fatigue: 12,
        mentalPressure: 15,
        injuries: [],
        hasPainkillerBuff: false,
        painkillerRemainingGames: 0,
      },
      seasonPhase: "spring_regular",
      currentYear: 2020,
      currentGameId: "lol",
      springRank: 0,
      summerRank: 0,
      isWorldChampion: false,
      proMonthlySalary: 0,
      regularSeasonMatches: [],
      playoffMatches: [],
      worldsMatches: [],
      leagueStandings: [],
      trophyCabinet: [],
      totalPrizeMoneyWon: 0,
      careerHistory: [],
      isRetired: false,
      transitionCareer: null,
      transitionMonthlyIncome: 0,
      regularSeasonWins: 0,
      regularSeasonLosses: 0,
      playoffRound: 0,
      isPlayoffEliminated: false,
      swissWins: 0,
      swissLosses: 0,
      tacticsPreference: "aggressive_dive",
      consecutiveWins: 0,
      signatureChampions: [
        { id: "hero_mid_1", name: "影流之主 / 刺客核心", role: "mid", tier: "T0_meta", isSignature: true, mastery: 96 },
        { id: "hero_mid_2", name: "暗黑元首 / 掌控球权", role: "mid", tier: "T1_strong", isSignature: true, mastery: 90 },
        { id: "hero_mid_3", name: "发条魔灵 / 控场万金油", role: "mid", tier: "T1_strong", isSignature: false, mastery: 84 },
      ],
    };
    this.refreshLeagueStandings();
  }

  getCurrentEraGame(year: number): EsportsGameInfo {
    const found = ESPORTS_TIMELINE_DATABASE.find(
      (g) => year >= g.eraYears[0] && year <= g.eraYears[1],
    );
    return found || ESPORTS_TIMELINE_DATABASE[4];
  }

  getAvailableGamesForYear(year: number): EsportsGameInfo[] {
    return ESPORTS_TIMELINE_DATABASE.filter(
      (g) => year >= g.eraYears[0] && year <= g.eraYears[1],
    );
  }

  switchGame(gameId: EsportsGameId): void {
    this.state.currentGameId = gameId;
    this.refreshLeagueStandings();
  }

  // 计算选手当前真实的极限 APM (微操)
  calculateApm(): number {
    return calculateEffectiveApm(
      this.state.playerStats.mechanics,
      this.state.physiology.fatigue,
      this.state.physiology.hasPainkillerBuff ? [] : this.state.physiology.injuries
    );
  }

  // 计算选手当前的反应时间 (毫秒，越低越神反应)
  calculateReactionTimeMs(): number {
    return calculateEffectiveReactionMs(
      this.state.playerStats.reaction,
      this.state.physiology.fatigue,
      this.state.physiology.hasPainkillerBuff ? [] : this.state.physiology.injuries
    );
  }

  // 综合竞技战力评级 (0~100)
  calculateTalentScore(): {
    overallRating: number;
    ratingGrade: "S+" | "S" | "A+" | "A" | "B" | "C";
    tierGrade: "S+" | "S" | "A" | "B" | "C" | "D";
    evaluationSummary: string;
    effectiveMechanics: number;
    effectiveReaction: number;
    currentApm: number;
    currentReactionMs: number;
  } {
    const stats = this.state.playerStats;
    const game = ESPORTS_TIMELINE_DATABASE.find((g) => g.id === this.state.currentGameId) || ESPORTS_TIMELINE_DATABASE[4];
    const w = game.attributeWeights || {
      mechanics: 0.25,
      reaction: 0.25,
      gameSense: 0.2,
      teamwork: 0.15,
      mentality: 0.15,
    };

    let penMech = 0;
    let penReact = 0;
    if (!this.state.physiology.hasPainkillerBuff) {
      for (const inj of this.state.physiology.injuries) {
        penMech += inj.mechanicsPenalty;
        penReact += inj.reactionPenalty;
      }
    }

    const fatigueDebuff = this.state.physiology.fatigue > 60
      ? (this.state.physiology.fatigue - 60) * 0.35
      : 0;

    const effMech = Math.max(15, Math.min(100, stats.mechanics - penMech - fatigueDebuff));
    const effReact = Math.max(15, Math.min(100, stats.reaction - penReact - fatigueDebuff));

    let baseScore =
      effMech * w.mechanics +
      effReact * w.reaction +
      stats.gameSense * w.gameSense +
      stats.teamwork * w.teamwork +
      stats.mentality * w.mentality;

    const finalRating = Math.max(10, Math.min(99, Math.round(baseScore)));

    let grade: "S+" | "S" | "A+" | "A" | "B" | "C" = "C";
    let tierGrade: "S+" | "S" | "A" | "B" | "C" | "D" = "C";
    let summary = "路人普通水准，缺乏职业赛场统治力";

    if (finalRating >= 93) {
      grade = "S+";
      tierGrade = "S+";
      summary = "世界第一梯队！具备 S 赛全球总冠军 FMVP 的超级巨星天资！";
    } else if (finalRating >= 86) {
      grade = "S";
      tierGrade = "S";
      summary = "顶级职业联赛全明星首发！操作拉满、大局观出众的明星选手！";
    } else if (finalRating >= 78) {
      grade = "A+";
      tierGrade = "A";
      summary = "次级发展联赛首发 / 顶级联赛强力轮换，具备极高职业上限！";
    } else if (finalRating >= 70) {
      grade = "A";
      tierGrade = "A";
      summary = "豪门青训考核通过水准，高分路人王实力！";
    } else if (finalRating >= 60) {
      grade = "B";
      tierGrade = "B";
      summary = "天梯高分玩家，操作有亮点但心态或意识需磨炼。";
    } else {
      tierGrade = "D";
    }

    const currentApm = this.calculateApm();
    const currentReactionMs = this.calculateReactionTimeMs();

    return {
      overallRating: finalRating,
      ratingGrade: grade,
      tierGrade,
      evaluationSummary: summary,
      effectiveMechanics: Math.round(effMech),
      effectiveReaction: Math.round(effReact),
      currentApm,
      currentReactionMs,
    };
  }

  // 1. 天梯冲分与排位训练
  playRankedLadder(): {
    deltaMMR: number;
    deltaRankPoints: number;
    resultNarrative: string;
    newRank: EsportsRankTier;
    promoted: boolean;
    scoutedByTeam?: EsportsTeam;
  } {
    const talent = this.calculateTalentScore();
    const curIdx = RANK_TIER_ORDER.indexOf(this.state.currentRank);

    const winRate = Math.min(0.85, Math.max(0.25, 0.4 + (talent.overallRating - 50) * 0.008));
    const isWin = Math.random() < winRate;

    let deltaMMR = 0;
    let deltaPoints = 0;
    let narrative = "";

    if (isWin) {
      deltaMMR = Math.floor(18 + Math.random() * 15);
      deltaPoints = Math.floor(20 + Math.random() * 12);
      this.state.consecutiveWins += 1;
      narrative = `🔥 【排位大捷】一波残血反杀锁定胜局！MMR +${deltaMMR}，当前连胜 ${this.state.consecutiveWins} 场！`;
      this.state.playerStats.mechanics = Math.min(99, this.state.playerStats.mechanics + 0.3);
    } else {
      deltaMMR = -Math.floor(12 + Math.random() * 10);
      deltaPoints = -Math.floor(15 + Math.random() * 8);
      this.state.consecutiveWins = 0;
      narrative = `💔 【惜败对局】队友遭针对崩盘，你虽力挽狂澜仍无力回天。MMR ${deltaMMR}。`;
      this.state.playerStats.mentality = Math.min(99, this.state.playerStats.mentality + 0.2);
    }

    this.state.ladderMMR = Math.max(1000, this.state.ladderMMR + deltaMMR);
    this.state.rankPoints += deltaPoints;
    this.state.physiology.fatigue = Math.min(100, this.state.physiology.fatigue + 8);
    this.state.physiology.mentalPressure = Math.min(100, this.state.physiology.mentalPressure + 5);

    let promoted = false;
    if (this.state.rankPoints >= 100 && curIdx < RANK_TIER_ORDER.length - 1) {
      this.state.currentRank = RANK_TIER_ORDER[curIdx + 1];
      this.state.rankPoints = 0;
      promoted = true;
      narrative += ` 🎉 恭喜成功晋级至【${RANK_TIER_NAMES[this.state.currentRank]}】！`;
    } else if (this.state.rankPoints < 0) {
      if (curIdx > 0) {
        this.state.currentRank = RANK_TIER_ORDER[curIdx - 1];
        this.state.rankPoints = 75;
        narrative += ` ⚠️ 胜点耗尽，掉段至【${RANK_TIER_NAMES[this.state.currentRank]}】。`;
      } else {
        this.state.rankPoints = 0;
      }
    }

    let scoutedTeam: EsportsTeam | undefined = undefined;
    if (!this.state.isSignedPro && curIdx >= 5 && Math.random() < 0.4) {
      const candidates = ESPORTS_TEAMS_DATABASE.filter(
        (t) => t.tier === "T4_academy" || t.tier === "T1_elite",
      );
      if (candidates.length > 0) {
        scoutedTeam = candidates[Math.floor(Math.random() * candidates.length)];
        narrative += `\n📩 【俱乐部星探私信】${scoutedTeam.name} 赛训总监关注到了你的超高胜率，向你发出了青训试训邀请！`;
      }
    }

    return {
      deltaMMR,
      deltaRankPoints: deltaPoints,
      resultNarrative: narrative,
      newRank: this.state.currentRank,
      promoted,
      scoutedByTeam: scoutedTeam,
    };
  }

  // 兼容方法：训练排位
  trainRankMatch(energyCost: number = 15): {
    gainedPoints: number;
    promoted: boolean;
    demoted?: boolean;
    isWin?: boolean;
    mmrChange?: number;
    fatigueGain?: number;
    logText?: string;
  } {
    const res = this.playRankedLadder();
    return {
      gainedPoints: res.deltaRankPoints,
      promoted: res.promoted,
      demoted: res.deltaRankPoints < 0 && this.state.rankPoints === 75,
      isWin: res.deltaMMR > 0,
      mmrChange: res.deltaMMR,
      fatigueGain: 8,
      logText: res.resultNarrative,
    };
  }

  // 2. 青训试训考核 (Tryout)
  attendYouthTryout(targetTeamId?: string): {
    passed: boolean;
    contractOffer: EsportsContract | null;
    reportText: string;
    details: { apmScore: number; reactionScore: number; mentalityScore: number };
  } {
    const talent = this.calculateTalentScore();
    const apm = this.calculateApm();
    const reactionMs = this.calculateReactionTimeMs();

    const team = targetTeamId
      ? ESPORTS_TEAMS_DATABASE.find((t) => t.id === targetTeamId) || ESPORTS_TEAMS_DATABASE[10]
      : ESPORTS_TEAMS_DATABASE[10];

    const apmScore = Math.min(100, Math.round((apm / 350) * 100));
    const reactionScore = Math.min(100, Math.round(((230 - reactionMs) / 75) * 100));
    const mentalityScore = Math.round(this.state.playerStats.mentality);

    const totalEval = apmScore * 0.35 + reactionScore * 0.35 + mentalityScore * 0.3;
    const passed = totalEval >= 72 || talent.overallRating >= 75;

    let contract: EsportsContract | null = null;
    let reportText = "";

    if (passed) {
      contract = {
        teamId: team.id,
        teamName: team.name,
        teamTier: team.tier,
        role: "youth_trainee",
        roleName: "青训学徒合同 (包吃住)",
        durationYears: 2,
        monthlyBaseSalary: 8000,
        annualBaseSalary: 96000,
        sponsorshipShareRate: 0.15,
        streamingShareRate: 0.25,
        prizePoolShareRate: 0.25,
        buyoutFee: 400000,
        signingBonus: 20000,
        estimatedAnnualTotal: 130000,
        perksDesc: "基地包吃包住、高配训练机房、专职二队教练指导复盘。",
      };

      this.state.isSignedPro = true;
      this.state.currentContract = contract;
      this.state.teamName = team.name;
      this.state.careerLadderTier = "secondary_ldl";
      this.state.proMonthlySalary = contract.monthlyBaseSalary;

      reportText = `🎉 【试训通过！正式签约】在 ${team.name} 基地为期三天的极限抗压试训中，你的 APM (${apm}) 与反应速度 (${reactionMs}ms) 惊艳了全场教练组！正式签下青训学徒合同，月薪 ¥${contract.monthlyBaseSalary.toLocaleString()}，即将征战次级职业发展联赛！`;
    } else {
      this.state.physiology.mentalPressure = Math.min(100, this.state.physiology.mentalPressure + 20);
      reportText = `💔 【试训遗憾淘汰】基地内的高压节奏让你在前两局 Solo 赛中手抖出现致命失误。主教练评价：“微操潜力极佳，但高压心态还需沉淀，回去多打天梯保持手感，明年再来！”`;
    }

    return {
      passed,
      contractOffer: contract,
      reportText,
      details: { apmScore, reactionScore, mentalityScore },
    };
  }

  // 兼容方法：申请试训
  applyYouthTryout(targetTeamId?: string, playerAge: number = 18): {
    passed: boolean;
    coachRating: "S+" | "S" | "A" | "B" | "C" | "D";
    teamName: string;
    reportText: string;
    recommendedRole: ContractRoleType;
  } {
    const res = this.attendYouthTryout(targetTeamId);
    const talent = this.calculateTalentScore();
    return {
      passed: res.passed,
      coachRating: talent.tierGrade,
      teamName: res.contractOffer?.teamName || "电竞俱乐部",
      reportText: res.reportText,
      recommendedRole: res.contractOffer?.role || "youth_trainee",
    };
  }

  // 3. 四级阶梯合同生成器与转会报价体系
  generateContractOffers(playerAge: number = 18, popularity: number = 50): EsportsContract[] {
    const talent = this.calculateTalentScore();
    const curTierIndex = RANK_TIER_ORDER.indexOf(this.state.currentRank);
    const offers: EsportsContract[] = [];

    const activeTeams = ESPORTS_TEAMS_DATABASE.filter(
      (t) => this.state.currentYear >= t.eraFit[0] && this.state.currentYear <= t.eraFit[1],
    );
    const candidates = activeTeams.length > 0 ? activeTeams : ESPORTS_TEAMS_DATABASE.slice(0, 5);

    for (const team of candidates) {
      let role: ContractRoleType = "youth_trainee";
      let roleName = "青训学徒合同 (包吃住)";
      let monthlyBaseSalary = 8000;
      let annualBaseSalary = 96000;
      let sponsorshipShare = 0.15;
      let streamingShare = 0.25;
      let prizeShare = 0.25;
      let buyoutFee = 400000;
      let signingBonus = 20000;
      let perksDesc = "包吃包住、专业高配训练工位、二队教练指导。";

      // 4. 顶薪明星合同 (年薪千万级，FMVP/世界冠军/S+巨星)
      if (talent.overallRating >= 90 && (this.state.isWorldChampion || curTierIndex >= 7)) {
        role = "franchise_star";
        roleName = "顶薪明星特权合同 (建队基石)";
        annualBaseSalary = team.tier === "T1_elite" ? 18000000 : 12000000; // 1200w ~ 1800w
        monthlyBaseSalary = Math.round(annualBaseSalary / 12);
        sponsorshipShare = 0.55;
        streamingShare = 0.70;
        prizeShare = 0.60;
        buyoutFee = 50000000;
        signingBonus = 3000000;
        perksDesc = "千万级顶薪保障、独享独立套房、私人理疗师、个人品牌联名分成与战队绝对话语权！";
      }
      // 3. 顶级联赛首发合同 (年薪 100w ~ 500w)
      else if (talent.overallRating >= 83 && curTierIndex >= 6) {
        role = "starter";
        roleName = "顶级联赛首发主力合同 (LPL一队)";
        annualBaseSalary = team.tier === "T1_elite" ? 3600000 : 1800000; // 180w ~ 360w
        monthlyBaseSalary = Math.round(annualBaseSalary / 12);
        sponsorshipShare = 0.40;
        streamingShare = 0.50;
        prizeShare = 0.45;
        buyoutFee = 12000000;
        signingBonus = 500000;
        perksDesc = "顶级联赛一队首发席位保障、基地高端伙食、专职康复团队、高额赛事奖金池提成。";
      }
      // 2. 次级新秀合同 (月薪 2w ~ 5w)
      else if (talent.overallRating >= 75 && curTierIndex >= 5) {
        role = "substitute";
        roleName = "次级新秀轮换合同 (LDL主力/一队替补)";
        monthlyBaseSalary = 35000;
        annualBaseSalary = monthlyBaseSalary * 12;
        sponsorshipShare = 0.25;
        streamingShare = 0.35;
        prizeShare = 0.35;
        buyoutFee = 2000000;
        signingBonus = 100000;
        perksDesc = "次级联赛固定登场机会、一队随队轮换集训、基地住宿补贴与直播设备支持。";
      }
      // 1. 青训学徒合同 (包吃住月薪 6k ~ 1w)
      else if (curTierIndex >= 4 || talent.overallRating >= 65) {
        role = "youth_trainee";
        roleName = "青训学徒合同 (包吃住)";
        monthlyBaseSalary = 8000;
        annualBaseSalary = monthlyBaseSalary * 12;
        sponsorshipShare = 0.15;
        streamingShare = 0.25;
        prizeShare = 0.25;
        buyoutFee = 400000;
        signingBonus = 20000;
        perksDesc = "俱乐部包吃包住、专业高配训练机房、教练一对一复盘指导。";
      } else {
        continue;
      }

      const estimatedAnnualTotal = Math.round(
        annualBaseSalary +
        signingBonus +
        (popularity * 2000) * sponsorshipShare +
        (monthlyBaseSalary * 0.5 * 12) * streamingShare
      );

      offers.push({
        teamId: team.id,
        teamName: team.name,
        teamTier: team.tier,
        role,
        roleName,
        durationYears: role === "franchise_star" ? 3 : 2,
        monthlyBaseSalary,
        annualBaseSalary,
        sponsorshipShareRate: sponsorshipShare,
        streamingShareRate: streamingShare,
        prizePoolShareRate: prizeShare,
        buyoutFee,
        signingBonus,
        estimatedAnnualTotal,
        perksDesc,
      });
    }

    return offers;
  }

  signContract(offer: EsportsContract): boolean {
    this.state.isSignedPro = true;
    this.state.currentContract = offer;
    this.state.teamName = offer.teamName;
    this.state.proMonthlySalary = offer.monthlyBaseSalary;
    if (offer.role === "youth_trainee") {
      this.state.careerLadderTier = "secondary_ldl";
    } else if (offer.role === "substitute") {
      this.state.careerLadderTier = "secondary_ldl";
    } else {
      this.state.careerLadderTier = "top_pro_league";
    }
    return true;
  }

  signProContract(teamName: string = "中国顶尖电竞俱乐部 (EDG/RNG/IG/TES)"): boolean {
    const curIdx = RANK_TIER_ORDER.indexOf(this.state.currentRank);
    if (curIdx >= 4) {
      const defaultOffer: EsportsContract = {
        teamId: "default_pro_team",
        teamName,
        teamTier: "T1_elite",
        role: "starter",
        roleName: "顶级联赛首发主力合同",
        durationYears: 2,
        monthlyBaseSalary: 120000,
        annualBaseSalary: 1440000,
        sponsorshipShareRate: 0.35,
        streamingShareRate: 0.5,
        prizePoolShareRate: 0.45,
        buyoutFee: 8000000,
        signingBonus: 300000,
        estimatedAnnualTotal: 1800000,
        perksDesc: "顶级豪门一队首发，高额商业赞助与奖金池分成。",
      };
      return this.signContract(defaultOffer);
    }
    return false;
  }

  // 升入顶级联赛一队首发
  promoteToTopLeague(targetTeam?: EsportsTeam): {
    success: boolean;
    newContract: EsportsContract;
    narrative: string;
  } {
    const topTeam = targetTeam || ESPORTS_TEAMS_DATABASE[0];
    const newContract: EsportsContract = {
      teamId: topTeam.id,
      teamName: topTeam.name,
      teamTier: "T1_elite",
      role: "starter",
      roleName: "一队正选首发主力",
      durationYears: 2,
      monthlyBaseSalary: 100000,
      annualBaseSalary: 1200000,
      sponsorshipShareRate: 0.35,
      streamingShareRate: 0.5,
      prizePoolShareRate: 0.45,
      buyoutFee: 12000000,
      signingBonus: 300000,
      estimatedAnnualTotal: 1500000,
      perksDesc: "顶级联赛一队正选席位，百万年薪保障与高额商业分成。",
    };

    this.signContract(newContract);
    const narrative = `⚡ 【荣升一队首发主力！】由于在次级赛场的惊艳表现与统治级数据，${topTeam.name} 正式行使上调协议，将你上调为一队首发！签下百万年薪主力合同，正式登临顶级职业联赛主舞台！`;

    return {
      success: true,
      newContract,
      narrative,
    };
  }

  // 转会挂牌与买断机制
  releaseOrBuyoutContract(): { success: boolean; cost: number; message: string } {
    if (!this.state.currentContract) {
      return { success: false, cost: 0, message: "当前为自由人，无需支付买断费。" };
    }
    const cost = this.state.currentContract.buyoutFee;
    const oldTeam = this.state.teamName;
    this.state.currentContract = null;
    this.state.isSignedPro = false;
    this.state.teamName = "自由人 / 转会市场待价而沽";
    this.state.proMonthlySalary = 0;
    this.state.careerLadderTier = "amateur_ladder";
    return {
      success: true,
      cost,
      message: `已触发买断条款离开 ${oldTeam}，正式成为自由人，可自由接触任何俱乐部！`,
    };
  }

  // 4. 战术 BP 模拟算法（阵型风格、红蓝方优劣、招牌英雄与Ban位）
  simulateDraftPhase(
    playerSide: "blue" | "red" = "blue",
    playerStylePreference?: TacticalStyleType,
    opponentStyleOverride?: TacticalStyleType,
  ): DraftPickBanResult {
    const availableStyles: TacticalStyleType[] = [
      "dive_teamfight",
      "poke_siege",
      "split_push",
      "early_rush",
      "protect_carry",
    ];

    const playerStyle = playerStylePreference || availableStyles[Math.floor(Math.random() * availableStyles.length)];
    const opponentStyle = opponentStyleOverride || availableStyles[Math.floor(Math.random() * availableStyles.length)];

    const styleInfo = TACTICAL_STYLES[playerStyle];
    let bpAdvantageScore = 0;
    let bpAdvantageReason = "";

    // 1. 战术克制判定
    if (styleInfo.counters === opponentStyle) {
      bpAdvantageScore += 8;
      bpAdvantageReason = `【阵容完美克制】我方【${styleInfo.name}】完美撕裂了敌方【${TACTICAL_STYLES[opponentStyle].name}】！`;
    } else if (styleInfo.counteredBy === opponentStyle) {
      bpAdvantageScore -= 8;
      bpAdvantageReason = `【阵容遭到反制】敌方【${TACTICAL_STYLES[opponentStyle].name}】精准封锁了我方【${styleInfo.name}】的发挥空间！`;
    } else {
      bpAdvantageReason = `双方阵容风格势均力敌，考验选手临场对线与团战执行力！`;
    }

    // 2. 红蓝方优劣势
    if (playerSide === "blue") {
      bpAdvantageScore += 3;
      bpAdvantageReason += " 蓝方一抢版本 T0 核心体系！";
    } else {
      bpAdvantageScore += 2;
      bpAdvantageReason += " 红方手握最后一手康特位 (Last Counter Pick)！";
    }

    // 3. 针对性 Ban 位与招牌英雄
    const targetBans: string[] = ["卡牌大师", "盲僧李青", "妖姬乐芙兰"];
    let isPlayerSignatureBanned = false;
    let playerPickedHero = "发条魔灵 (稳健万金油)";

    if (this.state.signatureChampions && this.state.signatureChampions.length > 0) {
      const signature = this.state.signatureChampions[0];
      if (Math.random() < 0.4) {
        isPlayerSignatureBanned = true;
        targetBans.push(signature.name);
        bpAdvantageScore -= 4;
        bpAdvantageReason += ` ⚠️ 敌方教练严密针对，Ban掉了你的招牌绝活【${signature.name}】！`;
        playerPickedHero = this.state.signatureChampions[1]?.name || "发条魔灵 (被迫选下次选英雄)";
      } else {
        bpAdvantageScore += 6;
        playerPickedHero = signature.name;
        bpAdvantageReason += ` 🔥 成功锁下你的招牌本命【${signature.name}】！全场观众欢呼！`;
      }
    }

    const blueSidePicks = playerSide === "blue"
      ? [playerPickedHero, "战争之影", "雷克塞", "虚空之女", "深海泰坦"]
      : ["暗裔剑魔", "破败之王", "岩雀", "惩戒之箭", "幻翎"];
    const redSidePicks = playerSide === "red"
      ? ["狂暴之心", "北地之怒", playerPickedHero, "残月之肃", "曙光女神"]
      : ["荒漠屠夫", "德邦总管", "辛德拉", "探险家", "牛头酋长"];

    return {
      blueSidePicks,
      redSidePicks,
      blueSideBans: targetBans.slice(0, 3),
      redSideBans: targetBans.slice(1, 4),
      playerPickedHero,
      isPlayerSignatureBanned,
      playerTacticalStyle: playerStyle,
      opponentTacticalStyle: opponentStyle,
      bpAdvantageScore,
      bpAdvantageReason,
    };
  }

  // 5. 单局关键事件与详细战报模拟
  simulateSingleGameDetail(
    gameIndex: number,
    opponentTeamName: string,
    bpResult: DraftPickBanResult,
    isDecidingGame: boolean = false
  ): SingleGameDetail {
    const talent = this.calculateTalentScore();
    const myTeamStrength = this.state.currentContract
      ? (this.state.currentContract.teamTier === "T1_elite" ? 92 : 82)
      : 76;
    const oppStrength = 82 + Math.floor(Math.random() * 12);

    const mentalityBonus = isDecidingGame ? (talent.effectiveReaction > 75 ? 4 : -4) : 0;
    const totalPower = (myTeamStrength * 0.55 + talent.overallRating * 0.45) + bpResult.bpAdvantageScore + mentalityBonus;
    const winProb = Math.max(0.15, Math.min(0.88, 0.5 + (totalPower - oppStrength) * 0.02));

    const isWin = Math.random() < winProb;
    const durationMinutes = Math.floor(26 + Math.random() * 14);

    let myKills = 0;
    let oppKills = 0;
    let goldLead = 0;

    if (isWin) {
      myKills = Math.floor(14 + Math.random() * 12);
      oppKills = Math.floor(4 + Math.random() * 10);
      goldLead = Math.floor(4000 + Math.random() * 9000);
    } else {
      oppKills = Math.floor(15 + Math.random() * 13);
      myKills = Math.floor(5 + Math.random() * 9);
      goldLead = -Math.floor(4000 + Math.random() * 8000);
    }

    const kills = isWin ? Math.floor(4 + Math.random() * 7) : Math.floor(1 + Math.random() * 4);
    const deaths = isWin ? Math.floor(0 + Math.random() * 3) : Math.floor(3 + Math.random() * 5);
    const assists = Math.floor(5 + Math.random() * 9);
    const damageShare = Math.round(23 + Math.random() * 14);

    const keyEvents: MatchKeyEvent[] = [];

    // 1. 一血 First Blood (85% 触发)
    if (Math.random() < 0.85) {
      const isPlayerFb = isWin || Math.random() < 0.55;
      keyEvents.push({
        minute: Math.floor(2 + Math.random() * 4),
        type: "first_blood",
        title: isPlayerFb ? "⚡ 对线细节单杀拿下一血！" : "⚠️ 遭敌方中野包夹送出一血",
        narrative: isPlayerFb
          ? `在第 3 分钟，你敏锐抓住对手补刀间隙，光速连招极限挂引燃，单杀对手斩获全场一血！解说起立欢呼！`
          : `敌方打野二级抓中，你交出闪现仍被逼入绝境，遗憾送出一血。`,
        isPlayerSideHeroic: isPlayerFb,
      });
    }

    // 2. 控龙 Dragon Control
    keyEvents.push({
      minute: Math.floor(18 + Math.random() * 5),
      type: "dragon_control",
      title: isWin ? "🐉 完美视野布控收下关键听牌龙" : "🐉 龙坑拉扯失利龙魂丢失",
      narrative: isWin
        ? `战队默契排空龙坑视野，你精准技能逼退敌方打野，稳稳惩戒斩杀水龙魂，全队士气大振！`
        : `对手先行占住河道草丛，我方视野被排空，强行接团被对手抢下龙魂。`,
      isPlayerSideHeroic: isWin,
    });

    // 3. 抢大龙逆转 Baron Steal 或 残局 1v3 / 五杀收割
    const specialRoll = Math.random();
    if (specialRoll < 0.35) {
      keyEvents.push({
        minute: Math.floor(25 + Math.random() * 6),
        type: "baron_steal",
        title: isWin ? "🔥【天神下凡】绝境大龙坑拼惩戒抢龙逆转！" : "💔 纳什男爵被对手搏命强行惩下",
        narrative: isWin
          ? `全场屏息！敌方打大龙至 1200 血，你闪现下龙坑，极限手速一套技能秒杀敌方打野并抢下纳什男爵！惊天逆转！`
          : `我方在大龙坑陷入迟疑，对手中单入场抢龙成功，大龙Buff被夺。`,
        isPlayerSideHeroic: isWin,
      });
    } else if (specialRoll < 0.65 && isWin) {
      keyEvents.push({
        minute: Math.floor(27 + Math.random() * 5),
        type: "clutch_1v3",
        title: "⚔️【残局1v3】名场面诞生！高地丝血秀翻全场！",
        narrative: `正面团战队友溃败，面对三人包夹，你利用走位扭掉致命控制，拉扯狂秀秒杀敌方后排，完成不可思议的 1v3 逆天守家！`,
        isPlayerSideHeroic: true,
      });
    } else if (specialRoll >= 0.88 && isWin) {
      keyEvents.push({
        minute: durationMinutes - 1,
        type: "pentakill",
        title: "👑【PENTAKILL！】漫天金雨！绝世五杀收割！",
        narrative: `决胜团战你犹如战神降临，大招进场瞬间融化敌方双C，追杀残血完成终极【五杀收割】！官方解说彻底疯狂：“五杀！这是属于他的时代！”`,
        isPlayerSideHeroic: true,
      });
    }

    const isMvp = isWin && (kills >= 6 || deaths <= 1 || talent.overallRating >= 88);
    const mvpRating = isWin ? Math.round((8.8 + Math.random() * 1.1) * 10) / 10 : Math.round((5.8 + Math.random() * 1.5) * 10) / 10;

    let briefHighlight = isWin
      ? `第 ${gameIndex} 局 (${durationMinutes}m)：以 ${myKills}-${oppKills} 大胜！战绩 ${kills}/${deaths}/${assists}，伤害占比 ${damageShare}%` + (isMvp ? "，荣膺本局 MVP！" : "。")
      : `第 ${gameIndex} 局 (${durationMinutes}m)：苦战惜败 (${myKills}-${oppKills})，战绩 ${kills}/${deaths}/${assists}。`;

    return {
      gameIndex,
      durationMinutes,
      playerTeamScore: myKills,
      opponentTeamScore: oppKills,
      isWin,
      kills,
      deaths,
      assists,
      damageShare,
      goldLead,
      isMvp,
      mvpRating,
      keyEvents,
      briefHighlight,
    };
  }

  // 6. 系列赛模拟（BO3 / BO5）
  simulateSeriesMatch(opponentName: string, isBO5: boolean = false): MatchScoreLog {
    const winsNeeded = isBO5 ? 3 : 2;
    let pScore = 0;
    let oScore = 0;
    const detailedGames: SingleGameDetail[] = [];

    let totalKills = 0;
    let totalDeaths = 0;
    let totalAssists = 0;
    let hasWonMvp = false;

    let currentSide: "blue" | "red" = Math.random() < 0.5 ? "blue" : "red";

    while (pScore < winsNeeded && oScore < winsNeeded) {
      const gameIdx = pScore + oScore + 1;
      const isDecidingGame = (pScore === winsNeeded - 1 && oScore === winsNeeded - 1);
      const bp = this.simulateDraftPhase(currentSide);
      const gameDetail = this.simulateSingleGameDetail(gameIdx, opponentName, bp, isDecidingGame);

      detailedGames.push(gameDetail);
      totalKills += gameDetail.kills;
      totalDeaths += gameDetail.deaths;
      totalAssists += gameDetail.assists;
      if (gameDetail.isMvp) hasWonMvp = true;

      if (gameDetail.isWin) {
        pScore++;
        currentSide = "red";
      } else {
        oScore++;
        currentSide = "blue";
      }
    }

    const isSeriesWin = pScore > oScore;
    const totalGames = pScore + oScore;
    const avgKDA = `${totalKills}/${totalDeaths}/${totalAssists}`;
    const avgDamageShare = Math.round(detailedGames.reduce((acc, g) => acc + g.damageShare, 0) / totalGames);

    const fatigueDelta = isBO5 ? (totalGames === 5 ? 24 : 18) : 12;
    this.state.physiology.fatigue = Math.min(100, this.state.physiology.fatigue + fatigueDelta);

    if (this.state.physiology.fatigue > 75 && Math.random() < 0.2) {
      this.triggerRandomInjury();
    }

    if (this.state.physiology.hasPainkillerBuff && this.state.physiology.painkillerRemainingGames) {
      this.state.physiology.painkillerRemainingGames--;
      if (this.state.physiology.painkillerRemainingGames <= 0) {
        this.state.physiology.hasPainkillerBuff = false;
      }
    }

    let narrative = "";
    if (isSeriesWin) {
      if (pScore === winsNeeded && oScore === winsNeeded - 1) {
        narrative = `🔥【战歌响起！鏖战满局绝杀！】面对强敌 ${opponentName}，双方战至终局决胜局！你凭借大心脏操作带领队伍艰难取胜 (${pScore}-${oScore})！系列赛总战绩 ${avgKDA}！`;
      } else {
        narrative = `🏆【兵不血刃力克对手！】战队全员状态火热，以 ${pScore}-${oScore} 击溃 ${opponentName}！展现出顶尖争冠级战力！`;
      }
    } else {
      narrative = `💔【系列赛遗憾惜败】激战数局不敌 ${opponentName} (${pScore}-${oScore})，赛后全队进行了通宵复盘讨论。`;
    }

    const highlights = detailedGames.flatMap((g) => g.keyEvents.map((e) => `[第${g.gameIndex}局] ${e.title}`));

    const log: MatchScoreLog = {
      opponentTeam: opponentName,
      playerScore: pScore,
      opponentScore: oScore,
      isWin: isSeriesWin,
      playerKDA: avgKDA,
      isMVP: hasWonMvp && isSeriesWin,
      tacticsUsed: this.state.tacticsPreference,
      matchDescription: narrative,
      damageShare: avgDamageShare,
      highlightMoments: highlights,
      detailedGames,
    };

    return log;
  }

  simulateMatch(opponentName: string, isBO5: boolean = false): MatchScoreLog {
    return this.simulateSeriesMatch(opponentName, isBO5);
  }

  // 现有方法兼容与战术比赛模拟
  simulateMatchWithTactics(
    opponentName: string,
    isBO5: boolean = false,
    tactics: EsportsTacticsBP = "aggressive_dive",
  ): MatchScoreLog {
    this.state.tacticsPreference = tactics;
    return this.simulateSeriesMatch(opponentName, isBO5);
  }

  // 7. 联赛赛制：常规赛循环、季后赛双败、世界赛瑞士轮
  simulateSpringRegularSeason(): {
    standingRank: number;
    wins: number;
    losses: number;
    qualifiedPlayoffs: boolean;
    narrative: string;
  } {
    this.state.regularSeasonMatches = [];
    const opponents = ["TES", "JDG", "BLG", "WBG", "RNG", "EDG", "WE", "LNG", "NIP", "OMG", "FPX", "IG", "TT", "AL", "LGD", "RA"];

    let totalWins = 0;
    let totalLosses = 0;

    for (const opp of opponents) {
      const matchLog = this.simulateSeriesMatch(opp, false);
      this.state.regularSeasonMatches.push(matchLog);
      if (matchLog.isWin) totalWins++;
      else totalLosses++;
    }

    let standingRank = 17 - totalWins;
    standingRank = Math.max(1, Math.min(16, standingRank + Math.floor(Math.random() * 2) - 1));
    this.state.springRank = standingRank;
    this.state.regularSeasonWins = totalWins;
    this.state.regularSeasonLosses = totalLosses;
    this.refreshLeagueStandings();

    const qualifiedPlayoffs = standingRank <= 10;
    this.state.seasonPhase = qualifiedPlayoffs ? "spring_playoffs" : "offseason";

    const narrative = `🏆 春季赛常规赛落下帷幕！战队取得 ${totalWins} 胜 ${totalLosses} 负，位列联赛常规赛积分榜第 ${standingRank} 名！` +
      (qualifiedPlayoffs ? " 成功挺进春季赛季后赛！" : " 遗憾未能晋级季后赛。");

    return {
      standingRank,
      wins: totalWins,
      losses: totalLosses,
      qualifiedPlayoffs,
      narrative,
    };
  }

  // 季后赛双败淘汰制 (Double Elimination)
  simulateSpringPlayoffs(): {
    champion: boolean;
    finalPlacement: string;
    prizeWon: number;
    narrative: string;
    bracketSummary: string;
  } {
    this.state.playoffMatches = [];
    let champion = false;
    let prizeWon = 0;
    let finalPlacement = "季后赛十强";

    const ubR1 = this.simulateSeriesMatch("季后赛八强强敌 (WBG/LNG)", true);
    this.state.playoffMatches.push(ubR1);

    if (ubR1.isWin) {
      finalPlacement = "胜者组半决赛四强";
      prizeWon = 400000;
      const ubFinals = this.simulateSeriesMatch("胜者组决赛 银龙巅峰之争 (BLG/TES)", true);
      this.state.playoffMatches.push(ubFinals);

      if (ubFinals.isWin) {
        finalPlacement = "春季赛亚军";
        prizeWon = 1000000;
        const grandFinals = this.simulateSeriesMatch("春季赛总决赛 银龙杯决胜巅峰 (JDG/BLG)", true);
        this.state.playoffMatches.push(grandFinals);

        if (grandFinals.isWin) {
          champion = true;
          finalPlacement = "春季赛总冠军 🏆";
          prizeWon = 2500000;
          this.state.trophyCabinet.push("LPL 职业联赛春季赛银龙杯总冠军");
          this.state.seasonPhase = "msi_international";
        }
      } else {
        const lbFinals = this.simulateSeriesMatch("败者组决赛 生死突围战 (TES)", true);
        this.state.playoffMatches.push(lbFinals);

        if (lbFinals.isWin) {
          finalPlacement = "春季赛亚军";
          prizeWon = 1000000;
          const grandFinals2 = this.simulateSeriesMatch("春季赛总决赛 败者组杀回巅峰对决", true);
          this.state.playoffMatches.push(grandFinals2);

          if (grandFinals2.isWin) {
            champion = true;
            finalPlacement = "春季赛总冠军 🏆 (败者组逆袭)";
            prizeWon = 2500000;
            this.state.trophyCabinet.push("LPL 职业联赛春季赛银龙杯总冠军");
            this.state.seasonPhase = "msi_international";
          }
        }
      }
    } else {
      const lbR1 = this.simulateSeriesMatch("败者组首轮 绝境生死战 (OMG)", true);
      this.state.playoffMatches.push(lbR1);
      if (lbR1.isWin) {
        finalPlacement = "春季赛六强";
        prizeWon = 200000;
      }
    }

    this.state.totalPrizeMoneyWon += prizeWon;

    const narrative = champion
      ? `🎉 金色的雨漫天飞舞！你带领战队捧起了【LPL 春季赛银龙杯总冠军】！斩获奖金 ¥${prizeWon.toLocaleString()}，获得代表 CN 赛区出征 MSI 季中冠军赛的名额！`
      : `季后赛征程结束，战队获得【${finalPlacement}】，斩获赛事奖金 ¥${prizeWon.toLocaleString()}。`;

    return {
      champion,
      finalPlacement,
      prizeWon,
      narrative,
      bracketSummary: `完成季后赛双败制对局，共战 ${this.state.playoffMatches.length} 轮系列赛。`,
    };
  }

  simulateMSITournament(): {
    isMSIChampion: boolean;
    prizeWon: number;
    narrative: string;
  } {
    const semi = this.simulateSeriesMatch("MSI 四强战 (LEC 欧洲王者 G2 / LCS 冠军 TL)", true);
    let isMSIChampion = false;
    let prizeWon = 500000;

    if (semi.isWin) {
      const finals = this.simulateSeriesMatch("MSI 总决赛 (韩国 LCK 霸主 T1 / Gen.G)", true);
      if (finals.isWin) {
        isMSIChampion = true;
        prizeWon = 3000000;
        this.state.trophyCabinet.push("MSI 季中冠军赛世界总冠军 🥇");
      }
    }

    this.state.totalPrizeMoneyWon += prizeWon;
    this.state.seasonPhase = "summer_regular";

    const narrative = isMSIChampion
      ? `👑 扬威国际赛场！在数万名全球电竞观众的呐喊声中，你率队力克宿敌韩国冠军，斩获【MSI 季中冠军赛世界总冠军】！`
      : `MSI 国际舞台对抗激烈，战队打出赛区风采，获得全球季军/亚军好成绩。`;

    return {
      isMSIChampion,
      prizeWon,
      narrative,
    };
  }

  // 世界赛瑞士轮阶段真实模拟 (3胜晋级淘汰赛、3败出局淘汰)
  simulateSwissStage(): SwissTournamentResult {
    const playerRecord: SwissTeamRecord = {
      teamName: this.state.teamName,
      wins: 0,
      losses: 0,
      isEliminated: false,
      isQualified: false,
      historyRounds: [],
    };

    const roundsSummary: SwissTournamentResult["roundsSummary"] = [];
    const internationalPool = ["T1", "Gen.G", "HLE", "G2", "FNC", "TL", "FLY", "DK", "WBG", "LNG", "BLG", "TES", "MDK", "GAM", "PSG"];

    let roundIndex = 1;

    while (playerRecord.wins < 3 && playerRecord.losses < 3 && roundIndex <= 5) {
      const opp = internationalPool[(roundIndex * 3 + playerRecord.wins) % internationalPool.length];
      const isBo3 = playerRecord.wins === 2 || playerRecord.losses === 2;
      const matchLog = this.simulateSeriesMatch(`瑞士轮 R${roundIndex} [${playerRecord.wins}-${playerRecord.losses}池] 对决 ${opp}`, isBo3);

      this.state.worldsMatches.push(matchLog);

      if (matchLog.isWin) {
        playerRecord.wins++;
        playerRecord.historyRounds.push(`R${roundIndex}: 胜 ${opp} (${matchLog.playerScore}-${matchLog.opponentScore})`);
      } else {
        playerRecord.losses++;
        playerRecord.historyRounds.push(`R${roundIndex}: 负 ${opp} (${matchLog.playerScore}-${matchLog.opponentScore})`);
      }

      roundsSummary.push({
        roundIndex,
        description: `第 ${roundIndex} 轮 (${isBo3 ? "BO3生死战" : "BO1单局"}): 战绩更新为 ${playerRecord.wins} 胜 ${playerRecord.losses} 负`,
        playerMatch: matchLog,
      });

      if (playerRecord.wins >= 3) {
        playerRecord.isQualified = true;
        break;
      }
      if (playerRecord.losses >= 3) {
        playerRecord.isEliminated = true;
        break;
      }
      roundIndex++;
    }

    const qualifiedTeams = playerRecord.isQualified ? [this.state.teamName, "Gen.G", "BLG", "T1", "TES", "HLE", "G2", "WBG"] : ["Gen.G", "BLG", "T1", "TES", "HLE", "G2", "WBG", "LNG"];
    const eliminatedTeams = playerRecord.isEliminated ? [this.state.teamName, "FNC", "TL", "FLY", "DK", "MDK", "GAM", "PSG"] : ["FNC", "TL", "FLY", "DK", "MDK", "GAM", "PSG"];

    return {
      qualifiedTeams,
      eliminatedTeams,
      playerRecord,
      roundsSummary,
      isPlayerQualified: playerRecord.isQualified,
    };
  }

  // S赛全球总决赛完整推演 (瑞士轮 -> 8强淘汰赛)
  simulateWorldChampionship(): {
    isWorldChampion: boolean;
    finalPlacement: string;
    prizeWon: number;
    narrative: string;
    swissResult: SwissTournamentResult;
  } {
    this.state.worldsMatches = [];
    let isWorldChampion = false;
    let finalPlacement = "全球16强 (瑞士轮淘汰)";
    let prizeWon = 500000;

    const swissResult = this.simulateSwissStage();

    if (swissResult.isPlayerQualified) {
      finalPlacement = "全球八强 (Quarterfinals)";
      prizeWon = 1500000;

      const qf = this.simulateSeriesMatch("S赛八强淘汰赛 (BO5 对战 LCK 顶级豪门)", true);
      this.state.worldsMatches.push(qf);

      if (qf.isWin) {
        finalPlacement = "全球四强 (Semifinals)";
        prizeWon = 3500000;

        const sf = this.simulateSeriesMatch("S赛全球半决赛 (BO5 宿命之决)", true);
        this.state.worldsMatches.push(sf);

        if (sf.isWin) {
          finalPlacement = "全球亚军 (Runner-up)";
          prizeWon = 7000000;

          const gf = this.simulateSeriesMatch("S赛全球总决赛！召唤师杯之巅 (Grand Finals BO5)", true);
          this.state.worldsMatches.push(gf);

          if (gf.isWin) {
            isWorldChampion = true;
            this.state.isWorldChampion = true;
            finalPlacement = "全球总决赛世界总冠军 🏆 (FMVP)";
            prizeWon = 18000000;
            this.state.trophyCabinet.push("英雄联盟 S赛全球总决赛世界冠军 / 召唤师杯 (FMVP)");
          }
        }
      }
    }

    this.state.totalPrizeMoneyWon += prizeWon;
    this.state.seasonPhase = "offseason";

    const narrative = isWorldChampion
      ? `🌟✨【登峰造极境，万众加冕为王！】你捧起了象征电竞最高荣耀的【全球总决赛召唤师杯】！漫天金雨与数千万观众的狂欢见证了你的传奇王朝！斩获世界冠军奖金 ¥${prizeWon.toLocaleString()}！`
      : `全球总决赛征程落幕，战队斩获【${finalPlacement}】，荣获赛事奖金 ¥${prizeWon.toLocaleString()}。`;

    return {
      isWorldChampion,
      finalPlacement,
      prizeWon,
      narrative,
      swissResult,
    };
  }

  // 推进一轮职业联赛赛程
  advanceLeagueSchedule(tactics?: EsportsTacticsBP): {
    matchLog: MatchScoreLog;
    stageMessage: string;
    isPhaseCompleted: boolean;
  } {
    const curTactics = tactics || this.state.tacticsPreference;
    const opponent = this.getRandomOpponentTeam();
    let stageMsg = "";
    let completed = false;

    if (this.state.careerLadderTier === "secondary_ldl") {
      const match = this.simulateMatchWithTactics(opponent.name, false, curTactics);
      this.state.regularSeasonMatches.push(match);
      if (match.isWin) {
        this.state.regularSeasonWins += 1;
      } else {
        this.state.regularSeasonLosses += 1;
      }
      this.refreshLeagueStandings();

      const totalMatches = this.state.regularSeasonWins + this.state.regularSeasonLosses;
      stageMsg = `【LDL 次级发展联赛 · 第 ${totalMatches} 轮】当前战绩：${this.state.regularSeasonWins} 胜 ${this.state.regularSeasonLosses} 负`;

      if (totalMatches >= 6) {
        completed = true;
        if (this.state.regularSeasonWins >= 4) {
          this.promoteToTopLeague();
          stageMsg += "\n🎖️ 【统治次级赛场】由于出色胜率，豪门一队行使提拔权，你正式晋升 LPL 顶级联赛首发！";
        }
      }
      return { matchLog: match, stageMessage: stageMsg, isPhaseCompleted: completed };
    }

    if (this.state.seasonPhase === "spring_regular" || this.state.seasonPhase === "summer_regular") {
      const match = this.simulateMatchWithTactics(opponent.name, false, curTactics);
      this.state.regularSeasonMatches.push(match);
      if (match.isWin) {
        this.state.regularSeasonWins += 1;
      } else {
        this.state.regularSeasonLosses += 1;
      }
      this.refreshLeagueStandings();

      const totalMatches = this.state.regularSeasonWins + this.state.regularSeasonLosses;
      stageMsg = `【LPL 职业联赛 · 常规赛第 ${totalMatches} 轮】对阵 ${opponent.name}。当前战绩：${this.state.regularSeasonWins}胜 ${this.state.regularSeasonLosses}负`;

      if (totalMatches >= 8) {
        completed = true;
        if (this.state.regularSeasonWins >= 5) {
          this.state.seasonPhase = this.state.seasonPhase === "spring_regular" ? "spring_playoffs" : "summer_playoffs";
          this.state.playoffRound = 1;
          this.state.isPlayoffEliminated = false;
          stageMsg += "\n🎉 【锁定季后赛名额！】常规赛名列前茅，挺进季后赛双败淘汰争冠阶段！";
        } else {
          stageMsg += "\n💔 【未进季后赛】常规赛战绩不佳，无缘季后赛，进入休赛期总结训练。";
          this.state.seasonPhase = "offseason";
        }
      }
      return { matchLog: match, stageMessage: stageMsg, isPhaseCompleted: completed };
    }

    if (this.state.seasonPhase === "spring_playoffs" || this.state.seasonPhase === "summer_playoffs") {
      const match = this.simulateMatchWithTactics(opponent.name, true, curTactics);
      this.state.playoffMatches.push(match);

      if (match.isWin) {
        this.state.playoffRound += 1;
        if (this.state.playoffRound >= 3) {
          const trophyName = this.state.seasonPhase === "spring_playoffs"
            ? `${this.state.currentYear} LPL 春季赛总冠军 (银龙杯)`
            : `${this.state.currentYear} LPL 夏季赛总冠军 (银龙杯)`;
          this.state.trophyCabinet.push(trophyName);
          this.state.totalPrizeMoneyWon += 1000000;
          stageMsg = `🏆 【我们是冠军！】经过五局鏖战，你们斩获 ${trophyName}！捧起银龙杯，全场洒下金色的雨！获得直通世界赛名额！`;
          this.state.seasonPhase = this.state.seasonPhase === "spring_playoffs" ? "msi_international" : "worlds_swiss_stage";
          completed = true;
        } else {
          stageMsg = `🔥 【季后赛挺进下一轮！】BO5 力克强敌 ${opponent.name}，顺利晋级下一轮半决赛！`;
        }
      } else {
        this.state.isPlayoffEliminated = true;
        stageMsg = `💔 【季后赛止步】在与 ${opponent.name} 的生死决胜局中惜败，获得季后赛四强。`;
        this.state.seasonPhase = this.state.seasonPhase === "spring_playoffs" ? "summer_regular" : "worlds_swiss_stage";
        completed = true;
      }
      return { matchLog: match, stageMessage: stageMsg, isPhaseCompleted: completed };
    }

    if (this.state.seasonPhase === "worlds_swiss_stage") {
      const isElimOrQual = this.state.swissWins === 2 || this.state.swissLosses === 2;
      const match = this.simulateMatchWithTactics(opponent.name, isElimOrQual, curTactics);
      this.state.worldsMatches.push(match);

      if (match.isWin) {
        this.state.swissWins += 1;
      } else {
        this.state.swissLosses += 1;
      }

      stageMsg = `【S赛全球总决赛 · 瑞士轮】当前战绩：${this.state.swissWins} 胜 - ${this.state.swissLosses} 负`;

      if (this.state.swissWins >= 3) {
        completed = true;
        this.state.seasonPhase = "worlds_knockout";
        stageMsg += "\n🎉 【瑞士轮出线！】三胜昂首挺进全球总决赛八强淘汰赛！";
      } else if (this.state.swissLosses >= 3) {
        completed = true;
        this.state.seasonPhase = "offseason";
        stageMsg += "\n💔 【瑞士轮遗憾出局】三败无缘淘汰赛，止步十六强，结束本届世界赛征程。";
      }

      return { matchLog: match, stageMessage: stageMsg, isPhaseCompleted: completed };
    }

    if (this.state.seasonPhase === "worlds_knockout") {
      const match = this.simulateMatchWithTactics(opponent.name, true, curTactics);
      this.state.worldsMatches.push(match);

      if (match.isWin) {
        this.state.playoffRound += 1;
        if (this.state.playoffRound >= 3) {
          const trophy = `${this.state.currentYear} S赛 英雄联盟全球总冠军 (召唤师杯)`;
          this.state.trophyCabinet.push(trophy);
          this.state.isWorldChampion = true;
          this.state.totalPrizeMoneyWon += 3000000;
          stageMsg = `👑 【登峰造极！世界之巅！】漫天金色的雨落下！你率队战胜世界豪强，斩获 ${trophy}！你是全世界最顶尖的传奇召唤师！`;
          this.state.seasonPhase = "offseason";
          completed = true;
        } else {
          stageMsg = `🔥 【挺进决赛！】世界赛淘汰赛力斩强敌，迈向终极冠军领奖台！`;
        }
      } else {
        stageMsg = `💔 【世界赛遗憾谢幕】在与 ${opponent.name} 的决胜局中惜败，获得本届全球总决赛亚军/四强。`;
        this.state.seasonPhase = "offseason";
        completed = true;
      }
      return { matchLog: match, stageMessage: stageMsg, isPhaseCompleted: completed };
    }

    const defMatch = this.simulateMatchWithTactics(opponent.name, false, curTactics);
    stageMsg = "【休赛期友谊训练赛】保持竞技状态，备战下赛季。";
    return { matchLog: defMatch, stageMessage: stageMsg, isPhaseCompleted: true };
  }

  // 刷新当前联赛积分榜
  refreshLeagueStandings(): void {
    const activeTeams = ESPORTS_TEAMS_DATABASE.filter(
      (t) => t.region.includes("LPL") || t.region.includes("LDL") || t.region.includes("CN"),
    );

    const rows: LeagueStandingRow[] = [];
    const playerTeam = this.state.teamName;

    let pWins = this.state.regularSeasonWins;
    let pLosses = this.state.regularSeasonLosses;

    rows.push({
      rank: 1,
      teamName: playerTeam,
      wins: pWins,
      losses: pLosses,
      points: pWins * 3,
      gameDiff: pWins - pLosses,
    });

    activeTeams.slice(0, 11).forEach((t) => {
      if (t.name === playerTeam) return;
      const w = Math.floor(2 + Math.random() * 6);
      const l = Math.floor(1 + Math.random() * 6);
      rows.push({
        rank: 2,
        teamName: t.shortName,
        wins: w,
        losses: l,
        points: w * 3,
        gameDiff: w - l,
      });
    });

    rows.sort((a, b) => b.points - a.points);
    rows.forEach((r, idx) => {
      r.rank = idx + 1;
    });

    this.state.leagueStandings = rows;
  }

  getRandomOpponentTeam(): EsportsTeam {
    const list = ESPORTS_TEAMS_DATABASE.filter((t) => t.name !== this.state.teamName);
    return list[Math.floor(Math.random() * list.length)] || ESPORTS_TEAMS_DATABASE[0];
  }

  // 伤病产生、封闭针与医疗康复
  triggerRandomInjury(): EsportsInjury {
    const injuryPool: Omit<EsportsInjury, "remainingQuarters">[] = [
      {
        id: "tenosynovitis",
        name: "腕关节腱鞘炎 (高强度微操劳损)",
        severity: "moderate",
        description: "高强度微操导致右手腕剧烈刺痛，手速与走位受到明显影响。",
        reactionPenalty: 8,
        mechanicsPenalty: 16,
        consistencyPenalty: 10,
      },
      {
        id: "cervical_strain",
        name: "颈椎与腰肌劳损",
        severity: "mild",
        description: "长期久坐训练导致脖颈僵硬、头晕，专注耐力下降。",
        reactionPenalty: 5,
        mechanicsPenalty: 7,
        consistencyPenalty: 12,
      },
      {
        id: "carpal_tunnel",
        name: "腕管综合征 (严重鼠标手)",
        severity: "severe",
        description: "手指麻木无力，神经压迫剧痛，需立即针灸封闭干预。",
        reactionPenalty: 16,
        mechanicsPenalty: 26,
        consistencyPenalty: 18,
      },
      {
        id: "dry_eye",
        name: "重度干眼与视疲劳",
        severity: "mild",
        description: "屏幕凝视过久导致眼睛干涩畏光，极限团战信息捕捉迟缓。",
        reactionPenalty: 10,
        mechanicsPenalty: 4,
        consistencyPenalty: 8,
      },
    ];

    const pick = injuryPool[Math.floor(Math.random() * injuryPool.length)];
    const fullInjury: EsportsInjury = {
      ...pick,
      remainingQuarters: 2,
    };

    this.state.physiology.injuries.push(fullInjury);
    return fullInjury;
  }

  // 注射封闭针救急
  administerPainkillerInjection(): { success: boolean; narrative: string } {
    if (this.state.physiology.injuries.length === 0) {
      return { success: false, narrative: "当前身体未有严重伤病，队医严厉拒绝了打封闭针的申请！" };
    }
    this.state.physiology.hasPainkillerBuff = true;
    this.state.physiology.painkillerRemainingGames = 5;
    this.state.physiology.fatigue = Math.max(0, this.state.physiology.fatigue - 30);

    return {
      success: true,
      narrative: "💉 队医在后台为你手腕注射了强效封闭止痛针！痛觉被瞬间封锁，你重新披挂上阵！(警告：药效褪去后劳损将加重)",
    };
  }

  // 医疗康复理疗
  receiveMedicalTherapy(): {
    curedInjuries: string[];
    fatigueCleared: number;
    cost: number;
    narrative: string;
  } {
    const cost = 2000;
    const cured: string[] = [];
    for (const inj of this.state.physiology.injuries) {
      cured.push(inj.name);
    }
    this.state.physiology.injuries = [];
    const oldFatigue = this.state.physiology.fatigue;
    this.state.physiology.fatigue = Math.max(0, this.state.physiology.fatigue - 40);
    this.state.physiology.mentalPressure = Math.max(0, this.state.physiology.mentalPressure - 30);

    const narrative = `🏥 【队医康复理疗】经过高压氧舱、腕关节针灸理疗与专业运动康复按摩，${cured.length > 0 ? "彻底治愈了【" + cured.join("、") + "】！" : "疲劳度大幅恢复！"} 身心竞技状态重新拉满！`;

    return {
      curedInjuries: cured,
      fatigueCleared: oldFatigue - this.state.physiology.fatigue,
      cost,
      narrative,
    };
  }

  // 多档位康复理疗
  receiveTherapy(type: "massage" | "acupuncture" | "medical_rest"): {
    fatigueRecovered: number;
    injuriesHealed: boolean;
    cost: number;
    narrative: string;
  } {
    let fatigueRecovered = 0;
    let cost = 0;
    let injuriesHealed = false;
    let narrative = "";

    if (type === "massage") {
      fatigueRecovered = 35;
      cost = 2000;
      this.state.physiology.fatigue = Math.max(0, this.state.physiology.fatigue - fatigueRecovered);
      narrative = "💆 俱乐部专职康复师为你进行了深层筋膜放松与手部推拿，疲劳感大幅消退。";
    } else if (type === "acupuncture") {
      fatigueRecovered = 50;
      cost = 8000;
      this.state.physiology.fatigue = Math.max(0, this.state.physiology.fatigue - fatigueRecovered);
      if (this.state.physiology.injuries.length > 0) {
        this.state.physiology.injuries.shift();
        injuriesHealed = true;
      }
      narrative = "🩺 找老中医进行了电针针灸与中药熏蒸，手腕劳损与腱鞘炎症状显著好转！";
    } else {
      fatigueRecovered = 70;
      cost = 0;
      this.state.physiology.fatigue = Math.max(0, this.state.physiology.fatigue - fatigueRecovered);
      this.state.physiology.injuries = [];
      injuriesHealed = true;
      narrative = "🏖️ 俱乐部批准了休赛期疗养长假，身体机能与竞技状态得到充分重启恢复！";
    }

    return { fatigueRecovered, injuriesHealed, cost, narrative };
  }

  // 年龄增长与生理巅峰曲线流逝
  updateAgeAndPhysiology(playerAge: number): {
    growthSummary: string;
    isAgingDecline: boolean;
  } {
    const profile = getPlayerAgeCurveProfile(playerAge);

    this.state.playerStats.mechanics = Math.max(30, Math.min(99, this.state.playerStats.mechanics + profile.mechanicsGrowth));
    this.state.playerStats.reaction = Math.max(30, Math.min(99, this.state.playerStats.reaction + profile.reactionGrowth));
    this.state.playerStats.gameSense = Math.max(40, Math.min(99, this.state.playerStats.gameSense + profile.gameSenseGrowth));
    this.state.playerStats.mentality = Math.max(40, Math.min(99, this.state.playerStats.mentality + profile.mentalityGrowth));
    this.state.playerStats.teamwork = Math.max(40, Math.min(99, this.state.playerStats.teamwork + profile.teamworkGrowth));
    this.state.playerStats.consistency = Math.max(35, Math.min(99, this.state.playerStats.consistency + profile.consistencyGrowth));

    this.state.physiology.injuries.forEach((inj) => {
      inj.remainingQuarters = Math.max(0, inj.remainingQuarters - 1);
    });
    this.state.physiology.injuries = this.state.physiology.injuries.filter((inj) => inj.remainingQuarters > 0);

    const isAgingDecline = playerAge >= 25;
    return {
      growthSummary: profile.summary,
      isAgingDecline,
    };
  }

  getCareerTierTitle(): string {
    if (this.state.isRetired) {
      return "🏆 退役名宿 / 传奇名宿";
    }
    if (!this.state.isSignedPro) {
      return `🎮 ${RANK_TIER_NAMES[this.state.currentRank]} (路人王)`;
    }
    const roleTitle = this.state.currentContract?.roleName || "首发队员";
    return `⭐ 【${this.state.teamName}】${roleTitle}`;
  }

  getAvailableTransitionCareers(): TransitionCareerInfo[] {
    const isChamp = this.state.isWorldChampion;
    return [
      {
        careerType: "gold_coach",
        title: "金牌主教练 / 战术总监",
        monthlyBaseIncome: isChamp ? 120000 : 50000,
        reputationGainPerYear: 15,
        requirementsDesc: "战术大局观 >= 80，具备丰富职业正赛实战经验",
        narrative: "执掌教鞭！将你传奇的战术理念与团战思路倾囊相授，率领新一代天才少年再夺世界总冠军！",
      },
      {
        careerType: "official_caster",
        title: "官方赛事核心解说 / 评论席嘉宾",
        monthlyBaseIncome: isChamp ? 150000 : 70000,
        reputationGainPerYear: 20,
        requirementsDesc: "选手知名度与粉丝声望 >= 60",
        narrative: "坐镇官方解说席！凭借对职业团战细节的秒懂级深度解读与金句频出，成为电竞顶流名嘴！",
      },
      {
        careerType: "top_streamer",
        title: "顶流百万大主播 / 游戏视频创作者",
        monthlyBaseIncome: isChamp ? 350000 : 160000,
        reputationGainPerYear: 25,
        requirementsDesc: "拥有大量忠实粉丝与绝活直播节目效果",
        narrative: "签约顶流直播平台！每晚千万热度直播开黑连麦整活，年入千万人气爆棚！",
      },
      {
        careerType: "club_founder",
        title: "创立属于自己的电竞战队俱乐部老板",
        monthlyBaseIncome: isChamp ? 600000 : 250000,
        reputationGainPerYear: 35,
        requirementsDesc: "丰厚资金积累 (>= 200万) 与电竞圈深厚人脉",
        narrative: "创立以自己名字命名的战队基地！招募青训新星、拉来千万级品牌赞助，进军职业联赛建立属于你的电竞帝国！",
      },
    ];
  }

  retireAndTransition(targetCareer: EsportsTransitionCareer): {
    success: boolean;
    careerInfo: TransitionCareerInfo;
    summaryText: string;
  } {
    const list = this.getAvailableTransitionCareers();
    const info = list.find((c) => c.careerType === targetCareer) || list[0];

    this.state.isRetired = true;
    this.state.transitionCareer = targetCareer;
    this.state.transitionMonthlyIncome = info.monthlyBaseIncome;
    this.state.proMonthlySalary = info.monthlyBaseIncome;
    this.state.careerLadderTier = "retired";

    const summaryText = `🎖️ 【光荣退役，开启人生新篇章】你正式宣布卸下职业选手战袍！生涯斩获 ${this.state.trophyCabinet.length} 座冠军奖杯，总奖金 ¥${this.state.totalPrizeMoneyWon.toLocaleString()}！已正式转型为【${info.title}】，月薪津贴 ¥${info.monthlyBaseIncome.toLocaleString()}！`;

    return {
      success: true,
      careerInfo: info,
      summaryText,
    };
  }
}
