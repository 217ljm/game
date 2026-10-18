/**
 * 《1978—一生》英雄联盟职业生涯状态机与事件调度器 (LOL Career Manager)
 * 纯逻辑、无 DOM、强类型架构。
 * 覆盖：
 * 1. 2011~2024 历年历史编年史时间线严格绑定与职业阶段状态机转换
 *    (unstarted -> amateur_king -> academy_trainee -> secondary_pro -> lpl_starter -> superstar)
 * 2. 四大季度与日常核心操作闭环：
 *    - trainRankSolo() 排位冲分与手速APM/反应提升，疲劳累积与伤病风险
 *    - receiveMedicalCare() 队医理疗与决胜局“封闭针”医疗干预
 *    - negotiateContract() 身价评估、俱乐部报价与阶梯签约/转会买断
 *    - prepareNextMatch() 与 recordMatchResult() 无缝对接 UI 演播与结算
 * 3. 常规赛大组积分榜动态自驱动、季后赛四强双败争银龙杯、S赛瑞士轮晋级推演
 */

import type {
  ContractRoleTier,
  DoubleEliminationBracket,
  EsportsContractTerms,
  InjurySeverity,
  InjuryType,
  LeagueSplit,
  LolSeasonYear,
  MatchFormat,
  MedicalTreatmentResult,
  MedicalTreatmentType,
  PlayerDerivedMetrics,
  PlayerInjury,
  PlayerMicroStats,
  RegularSeasonStanding,
  SeriesMatchResult,
  SwissStageReport,
  SwissStageTeamRecord,
  TournamentTier,
} from "./esports-contracts.ts";
import {
  HISTORICAL_TEAMS_DATABASE,
  LOL_HISTORICAL_CHRONICLES,
  type HistoricalSeasonChronicle,
  type HistoricalTeamInfo,
  getHistoricalSeason,
  getSeasonRules,
} from "./lol-historical-timeline.ts";
import {
  calculateDerivedMetrics,
  generateContractOffers,
  calculateContractBuyout,
  executeTransferBuyout,
  generateRandomInjury,
  administerMedicalTreatment,
} from "./esports-contracts-system.ts";
import {
  simulateSeriesMatch,
  simulateRegularSeason,
  simulateDoubleEliminationPlayoffs,
  simulateWorldsSwissStage,
  type TeamBattleStats,
} from "./esports-league-engine.ts";
import type { TacticalStyleType } from "./ui/esports-bp-board.ts";
import type { EsportsMatchSummary } from "./ui/esports-match-view.ts";

// ==========================================
// 1. 职业生涯阶段与状态定义
// ==========================================

export type LolCareerStage =
  | "unstarted"         // 未涉足 / 2011年前或15岁以下
  | "amateur_king"      // 网吧路人王 (2011国服公测后在网吧打天梯，冲上电信一区最强王者)
  | "academy_trainee"   // 俱乐部青训试训生 (2012~2013收到试训邀请入队，青训学徒合同)
  | "secondary_pro"     // 次级联赛职业选手 (LSPL/LDL次级联赛主力)
  | "lpl_starter"       // LPL顶级职业联赛首发 (顶级联赛常规赛、季后赛双败争银龙杯)
  | "superstar";        // 顶薪明星/世界冠军 (S赛世界赛常客、召唤师杯得主、大满贯争夺者)

export type PlayerRolePosition = "top" | "jungle" | "mid" | "adc" | "support";

export interface SoloRankTrainResult {
  success: boolean;
  focus: "mechanics" | "reaction" | "game_sense" | "all_round";
  fatigueDelta: number;
  statsGain: Partial<PlayerMicroStats>;
  rankPointsDelta: number;
  newRankPoints: number;
  newRankTier: string;
  hasRankPromoted: boolean;
  apmAfter: number;
  reactionMsAfter: number;
  triggeredInjury?: PlayerInjury;
  narrative: string;
}

export interface NextMatchPreparation {
  matchType: string;
  tournamentTier: TournamentTier;
  stageName: string;
  format: MatchFormat;
  myTeam: {
    teamId: string;
    name: string;
    shortName: string;
    league: string;
    badge: string;
    color: number;
    power: number;
    playerRole: string;
  };
  opponentTeam: {
    teamId: string;
    name: string;
    shortName: string;
    league: string;
    badge: string;
    color: number;
    power: number;
    acePlayer: string;
  };
  recommendedTactics: TacticalStyleType;
  playerSignatureHero: string;
  playerApm: number;
  playerReactionMs: number;
  hasInjuryPenalty: boolean;
  standingsContext: string;
}

export interface MatchSettlementFeedback {
  isWin: boolean;
  myScore: number;
  oppScore: number;
  isMvp: boolean;
  earningsDelta: number;
  prizeCashGained: number;
  salaryDistributed: number;
  fansGained: number;
  injuryRelapseTriggered: boolean;
  newInjuryAcquired?: PlayerInjury;
  standingsUpdateDesc: string;
  narrative: string;
  nextMilestoneDesc?: string;
}

export interface LolCareerHonors {
  lplSpringTitles: number;
  lplSummerTitles: number;
  msiTitles: number;
  worldsTitles: number;
  demaciaCupTitles: number;
  asianGamesGold: number;
  mvpCount: number;
  fmvpCount: number;
}

export interface LolCareerSeasonRecord {
  year: number;
  split: LeagueSplit;
  tier: TournamentTier;
  clubName: string;
  regularWins: number;
  regularLosses: number;
  regularRank: number;
  playoffPlacement?: string;
  worldsPlacement?: string;
  earningsWan: number;
  isChampion: boolean;
}

export interface LolCareerState {
  stage: LolCareerStage;
  careerStage: LolCareerStage;
  currentYear: LolSeasonYear;
  currentQuarter: 1 | 2 | 3 | 4;
  currentSplit: LeagueSplit;
  playerAge: number;
  playerStats: PlayerMicroStats;
  playerRole: PlayerRolePosition;
  signatureChampion: string;
  
  // 天梯与声誉
  rankTier: "diamond" | "master" | "grandmaster" | "challenger";
  rankPoints: number;
  rankServer: string; // "电信一区 艾欧尼亚" / "韩服超级服" / "峡谷之巅"
  fansCount: number;
  careerCash: number; // 个人累计到手财富 (元)
  
  // 生理健康
  fatigue: number; // 0 ~ 100 疲劳值
  injuries: PlayerInjury[];
  hasPainkillerBuff: boolean;
  painkillerRiskRate: number;
  
  // 战队与合同
  currentClub: HistoricalTeamInfo | null;
  currentContract: EsportsContractTerms | null;
  
  // 赛季与赛制
  currentTournamentTier: TournamentTier;
  standings: RegularSeasonStanding[];
  currentMatchRound: number;
  totalMatchRounds: number;
  playoffBracket: DoubleEliminationBracket | null;
  swissReport: SwissStageReport | null;
  
  // 荣誉与履历
  careerHonors: LolCareerHonors;
  historyRecords: LolCareerSeasonRecord[];
  regularSeasonRecord: {
    wins: number;
    losses: number;
    gameDiff: number;
  };
}

// ==========================================
// 2. 状态机与事件调度器实现
// ==========================================

export class LolCareerManager {
  public state: LolCareerState;

  constructor(initialAge: number = 15, initialYear: number = 2011) {
    const validYear = Math.max(2010, Math.min(2024, initialYear)) as LolSeasonYear;
    this.state = {
      stage: "unstarted",
      careerStage: "unstarted",
      currentYear: validYear,
      currentQuarter: 3, // 2011年9月对应Q3国服公测
      currentSplit: "summer",
      playerAge: initialAge,
      playerStats: {
        mechanics: 75,
        reaction: 78,
        gameSense: 70,
        teamwork: 68,
        mentality: 72,
        consistency: 70,
      },
      playerRole: "mid",
      signatureChampion: "影流之主 (劫)",
      rankTier: "diamond",
      rankPoints: 50,
      rankServer: "电信一区 艾欧尼亚",
      fansCount: 500,
      careerCash: 1200,
      fatigue: 10,
      injuries: [],
      hasPainkillerBuff: false,
      painkillerRiskRate: 0,
      currentClub: null,
      currentContract: null,
      currentTournamentTier: "secondary_league",
      standings: [],
      currentMatchRound: 0,
      totalMatchRounds: 8,
      playoffBracket: null,
      swissReport: null,
      careerHonors: {
        lplSpringTitles: 0,
        lplSummerTitles: 0,
        msiTitles: 0,
        worldsTitles: 0,
        demaciaCupTitles: 0,
        asianGamesGold: 0,
        mvpCount: 0,
        fmvpCount: 0,
      },
      historyRecords: [],
      regularSeasonRecord: {
        wins: 0,
        losses: 0,
        gameDiff: 0,
      },
    };
  }

  // ==========================================
  // 3. 时代演进与生涯阶段同步
  // ==========================================

  /**
   * 同步当前游戏年份，如果未到公测年份则恢复为 unstarted
   */
  public syncYear(year: number): void {
    const validYear = Math.max(2010, Math.min(2024, year)) as LolSeasonYear;
    this.state.currentYear = validYear;
    if (year < 2011) {
      this.state.stage = "unstarted";
      this.state.careerStage = "unstarted";
    }
  }

  /**
   * 2011年国服公测后开启网吧路人王阶段
   */
  public startAmateurEra(age: number = 15): { success: boolean; narrative: string } {
    this.state.playerAge = age;
    if (this.state.currentYear < 2011 || age < 15) {
      return {
        success: false,
        narrative: "2011年9月22日前英雄联盟国服尚未正式公测，或尚未年满15岁，不可涉足职业电竞。",
      };
    }
    this.state.stage = "amateur_king";
    this.state.careerStage = "amateur_king";
    this.state.rankServer = "电信一区 艾欧尼亚";
    this.state.rankTier = "challenger";
    this.state.rankPoints = 350;
    return {
      success: true,
      narrative: "2011年9月22日《英雄联盟》国服正式公测开启！你在县城网吧通宵达旦通宵冲分，凭借凌厉微操手速杀入电信一区艾欧尼亚最强王者，成为名震一方的网吧路人王！各大俱乐部星探投来关注目光！",
    };
  }

  /**
   * 签约青训学徒合同
   */
  public signTraineeContract(teamId: string, teamName: string): { success: boolean; narrative: string } {
    this.state.stage = "academy_trainee";
    this.state.careerStage = "academy_trainee";
    this.state.currentTournamentTier = "secondary_league";

    const club = HISTORICAL_TEAMS_DATABASE.find(t => t.teamId === teamId) || {
      teamId,
      shortName: teamName,
      fullName: teamName,
      foundedYear: this.state.currentYear,
      isActiveNow: true,
      legacyTitle: "职业电竞俱乐部",
      signatureChampions: ["盲僧", "劫"],
      signaturePlayers: ["核心主力"],
    };
    this.state.currentClub = club;

    this.state.currentContract = {
      contractId: `contract_trainee_${this.state.currentYear}_${teamId}`,
      teamId,
      teamName,
      leagueType: "secondary_league",
      roleTier: "youth_trainee",
      signYear: this.state.currentYear,
      durationYears: 1,
      monthlyBaseSalary: 8000,
      annualBaseSalary: 96000,
      signingBonusWan: 1,
      winBonusPerMatch: 800,
      championshipBonusRate: 0.15,
      commercialShareRate: 0.1,
      buyoutClauseWan: 30,
      hasNoTradeClause: false,
      minimumMatchGuarantee: 0.3,
      dailySoloRankQuota: 14,
    };

    return {
      success: true,
      narrative: `首届 LPL 创立之年，你顺利通过线下试训，与 ${teamName} 成功签约青训学徒合同，正式入驻俱乐部二队青训营！`,
    };
  }

  /**
   * 晋升次级联赛主力 (LSPL/LDL)
   */
  public promoteToSecondaryPro(tier: string = "lspl_starter"): { success: boolean; narrative: string } {
    this.state.stage = "secondary_pro";
    this.state.careerStage = "secondary_pro";
    this.state.currentTournamentTier = "secondary_league";

    if (this.state.currentContract) {
      this.state.currentContract.roleTier = "secondary_rookie";
      this.state.currentContract.monthlyBaseSalary = 25000;
      this.state.currentContract.annualBaseSalary = 300000;
    }

    return {
      success: true,
      narrative: `正式晋升为次级联赛 (${tier.includes("ldl") ? "LDL" : "LSPL"}) 主力首发，投身残酷升降级生死战！`,
    };
  }

  /**
   * 晋升 LPL 顶级联赛首发主力
   */
  public promoteToLplStarter(): { success: boolean; narrative: string } {
    this.state.stage = "lpl_starter";
    this.state.careerStage = "lpl_starter";
    this.state.currentTournamentTier = "top_league";

    if (this.state.currentContract) {
      this.state.currentContract.roleTier = "top_starter";
      this.state.currentContract.monthlyBaseSalary = 150000;
      this.state.currentContract.annualBaseSalary = 1800000;
    }

    return {
      success: true,
      narrative: "2018年联盟化落地取消升降级！你凭借优异的赛场表现升入 LPL 一队担任首发主力，冲击银龙杯与 S 赛世界冠军！",
    };
  }

  /**
   * 根据当前年份和年龄，自动推进或校准职业生涯状态机阶段
   */
  public syncCareerStageWithEra(): { stageChanged: boolean; message: string } {
    const { currentYear, playerAge, stage } = this.state;
    let stageChanged = false;
    let message = "";

    // 1. 2011 年 9 月国服公测门槛检查
    if (currentYear < 2011 || playerAge < 15) {
      if (stage !== "unstarted") {
        this.state.stage = "unstarted";
        this.state.careerStage = "unstarted";
        stageChanged = true;
        message = "尚未达到电竞启蒙年龄或《英雄联盟》国服尚未正式公测。";
      }
      return { stageChanged, message };
    }

    // 2. 2011年9月公测后，15岁以上玩家进入网吧路人王阶段
    if (stage === "unstarted" && currentYear >= 2011 && playerAge >= 15) {
      this.state.stage = "amateur_king";
      this.state.careerStage = "amateur_king";
      this.state.rankServer = "电信一区 艾欧尼亚";
      this.state.rankTier = "challenger";
      this.state.rankPoints = 350;
      stageChanged = true;
      message = "🎉 2011年9月22日《英雄联盟》国服正式公测开启！你在县城网吧包宿冲天梯，一路连胜登顶艾欧尼亚电信一区最强王者！全国各大战队星探投来关注目光！";
      return { stageChanged, message };
    }

    // 3. 2012~2013年收到青训试训
    if (stage === "amateur_king" && currentYear >= 2012 && !this.state.currentClub) {
      // 自动签约历史早期知名战队青训
      const initialClub = HISTORICAL_TEAMS_DATABASE.find(t => t.teamId === "we" || t.teamId === "ig" || t.teamId === "omg")
        || HISTORICAL_TEAMS_DATABASE[0];

      this.state.stage = "academy_trainee";
      this.state.careerStage = "academy_trainee";
      this.state.currentClub = initialClub;
      this.state.currentContract = {
        contractId: `contract_youth_${currentYear}_${initialClub.teamId}`,
        teamId: initialClub.teamId,
        teamName: initialClub.fullName,
        leagueType: "secondary_league",
        roleTier: "youth_trainee",
        signYear: currentYear,
        durationYears: 1,
        monthlyBaseSalary: currentYear <= 2012 ? 3000 : 8000,
        annualBaseSalary: (currentYear <= 2012 ? 3000 : 8000) * 12,
        signingBonusWan: 1,
        winBonusPerMatch: 800,
        championshipBonusRate: 0.15,
        commercialShareRate: 0.1,
        buyoutClauseWan: 30,
        hasNoTradeClause: false,
        minimumMatchGuarantee: 0.3,
        dailySoloRankQuota: 12,
      };
      stageChanged = true;
      message = `📬 收到 ${initialClub.fullName} 的青训试训邀请！通过线下面试与Solo对抗考核，正式签下首份青训职业学徒合同！`;
      this.initLeagueSeason();
      return { stageChanged, message };
    }

    return { stageChanged, message };
  }

  /**
   * 初始化当前季度的联赛积分榜和赛程
   */
  public initLeagueSeason(): void {
    const chronicle = getHistoricalSeason(this.state.currentYear);
    const availableClubs = HISTORICAL_TEAMS_DATABASE.filter(t => t.foundedYear <= this.state.currentYear);
    const myClub = this.state.currentClub || availableClubs[0];

    // 保证有至少 4~8 支对手队伍
    const leagueTeams = availableClubs.slice(0, 8).map(club => ({
      teamId: club.teamId,
      teamName: club.shortName,
      basePower: club.teamId === myClub.teamId ? 85 : Math.floor(78 + Math.random() * 12),
      isPlayerTeam: club.teamId === myClub.teamId,
    }));

    if (!leagueTeams.some(t => t.teamId === myClub.teamId)) {
      leagueTeams[0] = {
        teamId: myClub.teamId,
        teamName: myClub.shortName,
        basePower: 86,
        isPlayerTeam: true,
      };
    }

    const regResult = simulateRegularSeason({
      seasonYear: this.state.currentYear,
      split: this.state.currentSplit,
      teams: leagueTeams,
      isDoubleRoundRobin: chronicle.regularSeasonFormat === "double_round_robin",
      playoffCutoffRank: 4,
      relegationCutoffRank: chronicle.hasRelegation ? 7 : undefined,
    });

    this.state.standings = regResult.standings;
    this.state.totalMatchRounds = Math.max(6, leagueTeams.length - 1);
    this.state.currentMatchRound = 1;
  }

  // ==========================================
  // 4. 四大核心操作接口
  // ==========================================

  /**
   * 操作 1: 【排位训练 (trainRankSolo)】
   * 提升微操手速、反应延时与大局观，累积疲劳，若过度劳累有几率诱发职业伤病
   */
  public trainRankSolo(focus: "mechanics" | "reaction" | "game_sense" | "all_round" = "all_round"): SoloRankTrainResult {
    const fatigueDelta = Math.floor(16 + Math.random() * 9);
    this.state.fatigue = Math.min(100, this.state.fatigue + fatigueDelta);

    const statsGain: Partial<PlayerMicroStats> = {};
    let narrative = "";

    switch (focus) {
      case "mechanics":
        statsGain.mechanics = Math.min(99, this.state.playerStats.mechanics + Math.floor(1 + Math.random() * 2));
        narrative = "【极限微操特训】开启自定义练兵补刀与极限手速APM专项拉扯，微操反应明显增强！";
        break;
      case "reaction":
        statsGain.reaction = Math.min(99, this.state.playerStats.reaction + Math.floor(1 + Math.random() * 2));
        narrative = "【神经反射特训】连续进行盲视野闪现躲技能与防抓专项测试，神经延时得到极限缩短！";
        break;
      case "game_sense":
        statsGain.gameSense = Math.min(99, this.state.playerStats.gameSense + Math.floor(1 + Math.random() * 2));
        statsGain.teamwork = Math.min(99, this.state.playerStats.teamwork + 1);
        narrative = "【战术复盘大局观】通宵研读全球赛区BP阵容体系与河道视野控图节奏，大局观深度提升！";
        break;
      case "all_round":
      default:
        statsGain.mechanics = Math.min(99, this.state.playerStats.mechanics + 1);
        statsGain.reaction = Math.min(99, this.state.playerStats.reaction + 1);
        statsGain.gameSense = Math.min(99, this.state.playerStats.gameSense + 1);
        narrative = "【高分巅峰对决】在韩服与峡谷之巅高分王者局征战一整天，与顶尖职业选手激情碰撞！";
        break;
    }

    // 状态合并
    Object.assign(this.state.playerStats, statsGain);

    // 胜点增加
    const rankGain = Math.floor(18 + Math.random() * 15);
    this.state.rankPoints += rankGain;

    let hasPromoted = false;
    if (this.state.rankPoints >= 1000 && this.state.rankTier !== "challenger") {
      this.state.rankTier = "challenger";
      hasPromoted = true;
    } else if (this.state.rankPoints >= 600 && this.state.rankTier === "master") {
      this.state.rankTier = "grandmaster";
      hasPromoted = true;
    }

    // 伤病风险检测: 疲劳度 > 75 时可能触发意外职业伤病
    let triggeredInjury: PlayerInjury | undefined;
    if (this.state.fatigue >= 75 && Math.random() < 0.28) {
      triggeredInjury = generateRandomInjury(this.state.currentYear);
      this.state.injuries.push(triggeredInjury);
      narrative += ` ⚠️【职业劳损警报】由于连续高负荷高强度通宵排位，右手腕与颈椎剧烈酸痛，确诊为【${triggeredInjury.name}】！`;
    }

    const derived = calculateDerivedMetrics(
      this.state.playerStats,
      this.state.playerAge,
      this.state.injuries,
      this.state.hasPainkillerBuff
    );

    return {
      success: true,
      focus,
      fatigueDelta,
      statsGain,
      rankPointsDelta: rankGain,
      newRankPoints: this.state.rankPoints,
      newRankTier: this.state.rankTier,
      hasRankPromoted: hasPromoted,
      apmAfter: derived.effectiveApm,
      reactionMsAfter: derived.effectiveReactionMs,
      triggeredInjury,
      narrative,
    };
  }

  /**
   * 操作 2: 【队医理疗与封闭针 (receiveMedicalCare)】
   * 恢复疲劳、针灸推拿消除手部劳损，或在生死战前注射止痛封闭针强行出战
   */
  public receiveMedicalCare(treatment: MedicalTreatmentType): MedicalTreatmentResult {
    const result = administerMedicalTreatment(this.state.injuries, treatment);

    if (treatment === "painkiller_injection") {
      this.state.hasPainkillerBuff = true;
      this.state.painkillerRiskRate = 0.65;
    } else if (treatment === "rest_and_rotation") {
      this.state.fatigue = Math.max(0, this.state.fatigue - 50);
      this.state.injuries = [];
      this.state.hasPainkillerBuff = false;
    } else if (treatment === "physiotherapy_massage") {
      this.state.fatigue = Math.max(0, this.state.fatigue - 30);
      if (this.state.injuries.length > 0) {
        this.state.injuries.shift(); // 消除一个急性伤病
      }
    } else if (treatment === "surgical_repair") {
      this.state.fatigue = 0;
      this.state.injuries = [];
      this.state.hasPainkillerBuff = false;
    }

    return result;
  }

  /**
   * 操作 3: 【签约与转会商谈 (negotiateContract)】
   * 根据当前身价、荣誉与年份通胀获取俱乐部报价，执行自由人加盟或违约金买断
   */
  public negotiateContract(preferredClubId?: string): {
    offers: EsportsContractTerms[];
    signedContract?: EsportsContractTerms;
    narrative: string;
  } {
    const derived = calculateDerivedMetrics(
      this.state.playerStats,
      this.state.playerAge,
      this.state.injuries,
      this.state.hasPainkillerBuff
    );

    const offers = generateContractOffers({
      year: this.state.currentYear,
      playerAge: this.state.playerAge,
      rankTier: this.state.rankTier,
      stats: this.state.playerStats,
      worldChampionTitlesCount: this.state.careerHonors.worldsTitles,
      hasMsiTitle: this.state.careerHonors.msiTitles > 0,
      hasLplTitle: this.state.careerHonors.lplSpringTitles > 0 || this.state.careerHonors.lplSummerTitles > 0,
      preferredTeamId: preferredClubId,
    });

    if (!preferredClubId) {
      return {
        offers,
        narrative: `经纪团队整理了当前转会市场上 ${offers.length} 家俱乐部的正式报价合同意向书。`,
      };
    }

    const selectedOffer = offers.find(o => o.teamId === preferredClubId) || offers[0];
    const targetClub = HISTORICAL_TEAMS_DATABASE.find(t => t.teamId === selectedOffer.teamId)
      || HISTORICAL_TEAMS_DATABASE[0];

    // 处理旧合同解约或买断
    let buyoutDesc = "";
    if (this.state.currentContract && this.state.currentContract.teamId !== targetClub.teamId) {
      const buyoutRes = executeTransferBuyout(this.state.currentContract, "new_team", targetClub.fullName);
      buyoutDesc = buyoutRes.narrative + " ";
    }

    // 履约新合同
    this.state.currentClub = targetClub;
    this.state.currentContract = selectedOffer;
    this.state.careerCash += selectedOffer.signingBonusWan * 10000;

    // 生涯阶段跃迁
    if (selectedOffer.roleTier === "superstar_franchise") {
      this.state.stage = "superstar";
      this.state.careerStage = "superstar";
    } else if (selectedOffer.roleTier === "top_starter") {
      this.state.stage = "lpl_starter";
      this.state.careerStage = "lpl_starter";
    } else if (selectedOffer.roleTier === "secondary_rookie") {
      this.state.stage = "secondary_pro";
      this.state.careerStage = "secondary_pro";
    } else {
      this.state.stage = "academy_trainee";
      this.state.careerStage = "academy_trainee";
    }

    return {
      offers,
      signedContract: selectedOffer,
      narrative: `${buyoutDesc}🎉 恭喜！你已与 ${targetClub.fullName} 正式签下【${selectedOffer.roleTier}】合同！签字费 ¥${selectedOffer.signingBonusWan} 万元已即时打入账户，年薪达 ¥${(selectedOffer.annualBaseSalary / 10000).toFixed(1)} 万元！`,
    };
  }

  /**
   * 操作 4: 【出战下一场正式比赛 (prepareNextMatch)】
   * 生成下一场赛事的对阵数据，与 life-scene.ts 的 EsportsBpBoard 与 EsportsMatchView 完全对齐
   */
  public prepareNextMatch(): NextMatchPreparation {
    const derived = calculateDerivedMetrics(
      this.state.playerStats,
      this.state.playerAge,
      this.state.injuries,
      this.state.hasPainkillerBuff
    );

    const chronicle = getHistoricalSeason(this.state.currentYear);
    const myClub = this.state.currentClub || HISTORICAL_TEAMS_DATABASE[0];

    // 寻找下一个对手战队
    const otherClubs = HISTORICAL_TEAMS_DATABASE.filter(t => t.teamId !== myClub.teamId && t.foundedYear <= this.state.currentYear);
    const opponentClub = otherClubs[Math.floor(Math.random() * otherClubs.length)] || HISTORICAL_TEAMS_DATABASE[1];

    const isWorldsStage = this.state.currentQuarter === 4 && this.state.stage === "superstar";
    const tournamentTier: TournamentTier = isWorldsStage
      ? "world_championship"
      : (this.state.stage === "secondary_pro" ? "secondary_league" : "top_league");

    const matchType = isWorldsStage
      ? (chronicle.worldsFormat === "swiss_system" ? "S赛瑞士轮关键生死出线之战" : "全球总决赛淘汰赛巅峰碰撞")
      : (this.state.stage === "secondary_pro" ? "次级联赛 LSPL/LDL 焦点抢分赛" : `LPL ${this.state.currentYear} 常规赛积分双雄榜首对决`);

    const stageName = `第 ${this.state.currentMatchRound}/${this.state.totalMatchRounds} 轮常规大组焦点赛`;

    // 积分榜上下文概览
    const myStanding = this.state.standings.find(s => s.teamId === myClub.teamId);
    const standingsContext = myStanding
      ? `目前积分榜排名第 ${myStanding.rank} 位 (${myStanding.wins}胜 ${myStanding.losses}负，净胜分 ${myStanding.gameDiff})`
      : "常规赛首战揭幕";

    return {
      matchType,
      tournamentTier,
      stageName,
      format: isWorldsStage ? "bo5" : "bo3",
      myTeam: {
        teamId: myClub.teamId,
        name: myClub.fullName,
        shortName: myClub.shortName,
        league: tournamentTier === "top_league" ? "LPL 顶级职业联赛" : (tournamentTier === "world_championship" ? "S赛全球总决赛" : "次级发展联赛"),
        badge: "🛡️",
        color: 0x0284c7,
        power: Math.min(98, Math.round(derived.overallRating * 0.95)),
        playerRole: `核心首发${this.state.playerRole.toUpperCase()}`,
      },
      opponentTeam: {
        teamId: opponentClub.teamId,
        name: opponentClub.fullName,
        shortName: opponentClub.shortName,
        league: tournamentTier === "top_league" ? "LPL 顶级联赛豪强" : (tournamentTier === "world_championship" ? "海外赛区顶尖豪门" : "次级争冠劲旅"),
        badge: "⚔️",
        color: 0xd97706,
        power: Math.floor(82 + Math.random() * 12),
        acePlayer: opponentClub.signaturePlayers[0] || "招牌王牌选手",
      },
      recommendedTactics: "dive_teamfight",
      playerSignatureHero: this.state.signatureChampion,
      playerApm: derived.effectiveApm,
      playerReactionMs: derived.effectiveReactionMs,
      hasInjuryPenalty: this.state.injuries.length > 0 && !this.state.hasPainkillerBuff,
      standingsContext,
    };
  }

  /**
   * 操作 5: 【记录比赛结果与结算 (recordMatchResult)】
   * 接收 UI 演播与赛后结算返回的单局/系列赛数据，累积荣誉、发放胜场奖金，并推动积分榜和赛程
   */
  public recordMatchResult(summary: EsportsMatchSummary): MatchSettlementFeedback {
    const isWin = summary.isWin;
    const contract = this.state.currentContract;
    const myClub = this.state.currentClub;

    // 1. 薪水与胜场奖金分发
    let prizeCashGained = 0;
    if (contract) {
      if (isWin) {
        prizeCashGained += contract.winBonusPerMatch;
      }
      if (summary.isMvp) {
        prizeCashGained += Math.round(contract.winBonusPerMatch * 0.5);
      }
    } else {
      prizeCashGained = isWin ? 5000 : 1000;
    }

    const salaryDistributed = contract ? Math.round(contract.monthlyBaseSalary / 4) : 2000;
    const earningsDelta = prizeCashGained + salaryDistributed;
    this.state.careerCash += earningsDelta;

    // 维护常规赛战绩
    if (!this.state.regularSeasonRecord) {
      this.state.regularSeasonRecord = { wins: 0, losses: 0, gameDiff: 0 };
    }
    if (isWin) {
      this.state.regularSeasonRecord.wins++;
    } else {
      this.state.regularSeasonRecord.losses++;
    }
    this.state.regularSeasonRecord.gameDiff += (summary.myScore - summary.oppScore);

    // 2. 粉丝增长
    const fansDelta = isWin
      ? Math.floor(12000 + Math.random() * 15000)
      : Math.floor(2000 + Math.random() * 3000);
    this.state.fansCount += fansDelta;

    // 3. MVP 统计
    if (summary.isMvp) {
      this.state.careerHonors.mvpCount++;
    }

    // 4. 维护积分榜
    let standingsUpdateDesc = "";
    if (myClub && this.state.standings.length > 0) {
      const standing = this.state.standings.find(s => s.teamId === myClub.teamId);
      if (standing) {
        standing.matchesPlayed++;
        if (isWin) {
          standing.wins++;
          standing.points++;
        } else {
          standing.losses++;
        }
        standing.gameWins += summary.myScore;
        standing.gameLosses += summary.oppScore;
        standing.gameDiff = standing.gameWins - standing.gameLosses;
        standing.winRate = Math.round((standing.wins / standing.matchesPlayed) * 100) / 100;
      }

      // 重新排序常规赛积分榜
      this.state.standings.sort((a, b) => b.points - a.points || b.gameDiff - a.gameDiff);
      this.state.standings.forEach((s, idx) => {
        s.rank = idx + 1;
      });

      const updatedMyRank = this.state.standings.find(s => s.teamId === myClub.teamId)?.rank || 1;
      standingsUpdateDesc = `常规赛战罢，战队积分榜排名更新至第 ${updatedMyRank} 位 (${isWin ? "胜场+1" : "惜败"}, 净胜分 ${standing?.gameDiff ?? 0})`;
    }

    // 5. 封闭针反噬检测与伤病恶化
    let injuryRelapseTriggered = false;
    let newInjuryAcquired: PlayerInjury | undefined;

    if (this.state.hasPainkillerBuff) {
      if (Math.random() < this.state.painkillerRiskRate) {
        injuryRelapseTriggered = true;
        const chronicInjury = generateRandomInjury(this.state.currentYear);
        chronicInjury.isChronic = true;
        chronicInjury.name += " (封闭针赛后严重水肿恶化)";
        chronicInjury.severity = "severe";
        chronicInjury.apmPenalty += 20;
        chronicInjury.reactionMsPenalty += 10;
        this.state.injuries.push(chronicInjury);
      }
      // 封闭针药效赛后消退
      this.state.hasPainkillerBuff = false;
      this.state.painkillerRiskRate = 0;
    }

    // 推进赛程轮次
    this.state.currentMatchRound = Math.min(this.state.totalMatchRounds, this.state.currentMatchRound + 1);

    const narrative = isWin
      ? `【鏖战凯旋】凭借全队严丝合缝的默契配合与你招牌绝活的致命进场，以 ${summary.myScore}:${summary.oppScore} 斩获大胜！${summary.isMvp ? "你荣膺全场最高荣誉 MVP！" : ""} 赛事奖金 ¥${prizeCashGained.toLocaleString()} 元已实时到账！`
      : `【遗憾告负】系列赛以 ${summary.myScore}:${summary.oppScore} 惜败于对手强悍的阵型拉扯，全队赛后立即进入战术分析室闭门复盘。获得出场津贴 ¥${prizeCashGained.toLocaleString()} 元。`;

    return {
      isWin,
      myScore: summary.myScore,
      oppScore: summary.oppScore,
      isMvp: summary.isMvp,
      earningsDelta,
      prizeCashGained,
      salaryDistributed,
      fansGained: fansDelta,
      injuryRelapseTriggered,
      newInjuryAcquired,
      standingsUpdateDesc,
      narrative,
    };
  }

  // ==========================================
  // 5. 季度时间推移与年度大结算
  // ==========================================

  /**
   * 推进一个自然季度 (Q1 -> Q2 -> Q3 -> Q4 -> 次年Q1)
   */
  public advanceQuarter(): {
    newYear: LolSeasonYear;
    newQuarter: 1 | 2 | 3 | 4;
    quarterTitle: string;
    narrative: string;
  } {
    let newQ = (this.state.currentQuarter + 1) as 1 | 2 | 3 | 4 | 5;
    let newYear = this.state.currentYear;

    if (newQ > 4) {
      newQ = 1;
      newYear = Math.min(2024, this.state.currentYear + 1) as LolSeasonYear;
      this.state.playerAge++;
      this.state.currentYear = newYear;
    }
    this.state.currentQuarter = newQ as 1 | 2 | 3 | 4;

    let quarterTitle = "";
    let narrative = "";

    switch (this.state.currentQuarter) {
      case 1:
        this.state.currentSplit = "spring";
        quarterTitle = `${newYear} 年春季赛常规赛开战`;
        narrative = "新赛季揭幕！各大俱乐部完成转会阵容重组，春季赛银龙积分大战争夺拉开大幕！";
        this.initLeagueSeason();
        break;
      case 2:
        this.state.currentSplit = "spring";
        quarterTitle = `${newYear} 年春季季后赛与 MSI 季中冠军赛`;
        narrative = "春季季后赛四强争雄！银龙杯决战打响，冠军战队代表 LPL 出征季中冠军赛！";
        break;
      case 3:
        this.state.currentSplit = "summer";
        quarterTitle = `${newYear} 年夏季赛常规赛血战`;
        narrative = "夏季赛全面打响！决定全球总决赛 S 赛积分直通席位的生死鏖战全面升温！";
        this.initLeagueSeason();
        break;
      case 4:
        this.state.currentSplit = "annual";
        quarterTitle = `${newYear} 全球总决赛 S 赛盛典与转会冬窗期`;
        narrative = "英雄联盟全球总决赛打响！全赛区豪强会师最高殿堂，向召唤师杯发起终极冲击！";
        break;
    }

    // 疲劳自然恢复
    this.state.fatigue = Math.max(0, this.state.fatigue - 25);

    // 时代阶段同步
    this.syncCareerStageWithEra();

    return {
      newYear,
      newQuarter: this.state.currentQuarter,
      quarterTitle,
      narrative,
    };
  }

  // ==========================================
  // 6. 辅助只读查询接口
  // ==========================================

  public getDerivedMetrics(): PlayerDerivedMetrics {
    return calculateDerivedMetrics(
      this.state.playerStats,
      this.state.playerAge,
      this.state.injuries,
      this.state.hasPainkillerBuff
    );
  }

  public getChronicle(): HistoricalSeasonChronicle {
    return getHistoricalSeason(this.state.currentYear);
  }

  public getCareerSummary() {
    const derived = this.getDerivedMetrics();
    const chronicle = this.getChronicle();
    return {
      stage: this.state.stage,
      careerStage: this.state.careerStage,
      currentYear: this.state.currentYear,
      currentQuarter: this.state.currentQuarter,
      playerAge: this.state.playerAge,
      clubName: this.state.currentClub?.fullName ?? "无所属自由人",
      contractTier: this.state.currentContract?.roleTier ?? "未签约",
      annualSalaryWan: this.state.currentContract ? (this.state.currentContract.annualBaseSalary / 10000).toFixed(1) : "0",
      effectiveApm: derived.effectiveApm,
      effectiveReactionMs: derived.effectiveReactionMs,
      tierGrade: derived.tierGrade,
      marketValueWan: derived.marketValueWan,
      fansCount: this.state.fansCount,
      careerCash: this.state.careerCash,
      injuriesCount: this.state.injuries.length,
      historicalMilestone: chronicle.historicalMilestone,
      careerHonors: { ...this.state.careerHonors },
    };
  }
}
