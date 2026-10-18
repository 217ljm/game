/**
 * 《1978—一生》英雄联盟联赛核心对战与赛制引擎 (Esports League Engine)
 * 纯逻辑、无 DOM、强类型实现。
 * 包含：
 * 1. 真实常规赛大组双循环/单循环积分榜 (BO3积分、净胜分、胜负关系与季后赛席位划分)
 * 2. 季后赛四强双败争银龙杯系统 (胜者组、败者组逆袭、总决赛决出银龙杯得主)
 * 3. S赛瑞士轮系统 (16支战队，3胜晋级八强/3负淘汰回家，晋级/淘汰生死战BO3其余BO1)
 * 4. 次级联赛(LSPL)与升降级赛选拔机制
 */

import type {
  MatchFormat,
  RegularSeasonStanding,
  SeriesMatchResult,
  SingleGameDetail,
  SwissStageReport,
  SwissStageTeamRecord,
  DoubleEliminationBracket,
  LeagueSplit,
} from "./esports-contracts.ts";

// ==========================================
// 1. 单局与系列赛对决模拟器
// ==========================================

export interface TeamBattleStats {
  teamName: string;
  basePower: number;          // 团队综合战力 (60~95)
  tacticalAdvantage?: number; // BP阵容克制修正 (-10 ~ +10)
  isPlayerTeam?: boolean;
}

export function simulateSingleGame(
  gameIndex: number,
  teamBlue: TeamBattleStats,
  teamRed: TeamBattleStats,
  playerHeroName?: string,
  playerPerformanceBuff: number = 0
): SingleGameDetail {
  // 蓝方胜率天然微幅优势 (51% ~ 53% 真实电竞历史红蓝方胜率)
  const blueSideBuff = 2;
  const effectiveBluePower = teamBlue.basePower + (teamBlue.tacticalAdvantage ?? 0) + blueSideBuff + (teamBlue.isPlayerTeam ? playerPerformanceBuff : 0);
  const effectiveRedPower = teamRed.basePower + (teamRed.tacticalAdvantage ?? 0) + (teamRed.isPlayerTeam ? playerPerformanceBuff : 0);

  const totalPower = effectiveBluePower + effectiveRedPower;
  const blueWinChance = effectiveBluePower / totalPower;
  const isBlueWin = Math.random() < blueWinChance;
  const winner = isBlueWin ? "blue" : "red";

  // 模拟对战时长 (25分到42分之间)
  const baseMinutes = Math.floor(25 + Math.random() * 15);
  const baseSeconds = Math.floor(Math.random() * 60);
  const durationSeconds = baseMinutes * 60 + baseSeconds;
  const durationFormatted = `${baseMinutes}:${baseSeconds.toString().padStart(2, "0")}`;

  const winningKills = Math.floor(14 + Math.random() * 14);
  const losingKills = Math.floor(4 + Math.random() * (winningKills - 5));
  const blueKills = isBlueWin ? winningKills : losingKills;
  const redKills = isBlueWin ? losingKills : winningKills;

  const blueTowers = isBlueWin ? 9 + Math.floor(Math.random() * 3) : Math.floor(Math.random() * 4);
  const redTowers = isBlueWin ? Math.floor(Math.random() * 4) : 9 + Math.floor(Math.random() * 3);

  const dragonSoulPool: NonNullable<SingleGameDetail["dragonSoulType"]>[] = [
    "infernal", "ocean", "mountain", "cloud", "hextech", "chemtech"
  ];
  const soul = dragonSoulPool[Math.floor(Math.random() * dragonSoulPool.length)];

  const hasBaronNashorSteal = Math.random() < 0.22;
  const hasElderDragonSteal = baseMinutes >= 35 && Math.random() < 0.18;

  const highlights: string[] = [];
  if (hasBaronNashorSteal) {
    highlights.push(isBlueWin ? "蓝方打野惩戒神级抢下大龙逆转战局！" : "红方极限盲视野盲僧回旋抢下大龙！");
  }
  if (hasElderDragonSteal) {
    highlights.push("决胜龙坑混战，远古巨龙被斩杀斩获龙魂双BUFF！");
  }

  // MVP 评选
  const winningTeamName = isBlueWin ? teamBlue.teamName : teamRed.teamName;
  const playerOnWinning = (isBlueWin && teamBlue.isPlayerTeam) || (!isBlueWin && teamRed.isPlayerTeam);
  const isPlayerMvp = Boolean(playerOnWinning && Math.random() < 0.45);

  const mvpRoles = ["中单", "ADC", "打野", "上单", "辅助"];
  const mvpRole = isPlayerMvp ? "核心C位" : mvpRoles[Math.floor(Math.random() * mvpRoles.length)];
  const mvpPlayer = isPlayerMvp ? "玩家选手" : `${winningTeamName}.${mvpRole}`;
  const mvpRating = Math.round((8.2 + Math.random() * 1.7) * 10) / 10;

  return {
    gameIndex,
    durationSeconds,
    durationFormatted,
    winner,
    blueTeamName: teamBlue.teamName,
    redTeamName: teamRed.teamName,
    blueKills,
    redKills,
    blueTowers,
    redTowers,
    blueDragons: isBlueWin ? 4 : Math.floor(Math.random() * 2),
    redDragons: isBlueWin ? Math.floor(Math.random() * 2) : 4,
    blueBarons: isBlueWin ? 1 + (baseMinutes > 32 ? 1 : 0) : (hasBaronNashorSteal ? 1 : 0),
    redBarons: !isBlueWin ? 1 + (baseMinutes > 32 ? 1 : 0) : (hasBaronNashorSteal ? 1 : 0),
    firstBloodClaimedBy: Math.random() < 0.5 ? "blue" : "red",
    dragonSoulType: soul,
    hasBaronNashorSteal,
    hasElderDragonSteal,
    mvpPlayer,
    mvpRole,
    mvpRating,
    playerPerformance: (teamBlue.isPlayerTeam || teamRed.isPlayerTeam) ? {
      champion: playerHeroName || "招牌英雄",
      kills: isBlueWin ? Math.floor(4 + Math.random() * 7) : Math.floor(1 + Math.random() * 4),
      deaths: isBlueWin ? Math.floor(Math.random() * 3) : Math.floor(2 + Math.random() * 5),
      assists: Math.floor(5 + Math.random() * 10),
      cs: Math.floor(baseMinutes * (8.5 + Math.random() * 2)),
      damageShare: Math.round((0.25 + Math.random() * 0.15) * 100) / 100,
      isMvp: isPlayerMvp,
    } : undefined,
    highlightMoments: highlights,
  };
}

export function simulateSeriesMatch(
  stageName: string,
  format: MatchFormat,
  teamA: TeamBattleStats,
  teamB: TeamBattleStats,
  playerHeroName?: string,
  playerPerformanceBuff: number = 0
): SeriesMatchResult {
  const gamesTarget = format === "bo1" ? 1 : format === "bo3" ? 2 : 3;
  let scoreA = 0;
  let scoreB = 0;
  const games: SingleGameDetail[] = [];
  let gameIndex = 1;

  while (scoreA < gamesTarget && scoreB < gamesTarget) {
    // 轮流挑选蓝方
    const teamBlue = (gameIndex % 2 === 1) ? teamA : teamB;
    const teamRed = (gameIndex % 2 === 1) ? teamB : teamA;

    const game = simulateSingleGame(gameIndex, teamBlue, teamRed, playerHeroName, playerPerformanceBuff);
    games.push(game);

    const isTeamBlueWinner = game.winner === "blue";
    const winningTeam = isTeamBlueWinner ? teamBlue.teamName : teamRed.teamName;

    if (winningTeam === teamA.teamName) {
      scoreA++;
    } else {
      scoreB++;
    }
    gameIndex++;
  }

  const winnerTeam = scoreA > scoreB ? teamA.teamName : teamB.teamName;
  const loserTeam = scoreA > scoreB ? teamB.teamName : teamA.teamName;
  const isPlayerMatch = Boolean(teamA.isPlayerTeam || teamB.isPlayerTeam);
  const playerWon = Boolean((teamA.isPlayerTeam && scoreA > scoreB) || (teamB.isPlayerTeam && scoreB > scoreA));

  const narrative = `【${stageName}】${teamA.teamName} ${scoreA} : ${scoreB} ${teamB.teamName}，${winnerTeam} 赢得系列赛胜利！`;

  return {
    matchId: `match_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    stageName,
    format,
    teamA: teamA.teamName,
    teamB: teamB.teamName,
    scoreA,
    scoreB,
    winnerTeam,
    loserTeam,
    isPlayerMatch,
    playerWon,
    games,
    narrative,
  };
}

// ==========================================
// 2. 常规赛大组双循环/单循环积分榜系统
// ==========================================

export interface RegularSeasonConfig {
  seasonYear: number;
  split: LeagueSplit;
  teams: { teamId: string; teamName: string; basePower: number; isPlayerTeam?: boolean }[];
  isDoubleRoundRobin: boolean; // 是否为双循环 (单循环则是每对交手1次)
  playoffCutoffRank: number;   // 晋级季后赛的名次线 (如前8名或前10名)
  relegationCutoffRank?: number; // 升降级危险线 (2014~2017后2名打保级赛)
  playerHeroName?: string;
  playerPerformanceBuff?: number;
}

export interface RegularSeasonResult {
  standings: RegularSeasonStanding[];
  totalMatchesCount: number;
  playoffTeams: RegularSeasonStanding[];
  relegationTeams: RegularSeasonStanding[];
  matchesHistory: SeriesMatchResult[];
  playerStanding?: RegularSeasonStanding;
}

export function simulateRegularSeason(config: RegularSeasonConfig): RegularSeasonResult {
  const standingsMap: Record<string, RegularSeasonStanding> = {};

  config.teams.forEach(t => {
    standingsMap[t.teamId] = {
      rank: 0,
      teamId: t.teamId,
      teamName: t.teamName,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      gameWins: 0,
      gameLosses: 0,
      gameDiff: 0,
      headToHeadRecords: {},
      points: 0,
      qualifiedForPlayoffs: false,
    };
  });

  const matchesHistory: SeriesMatchResult[] = [];
  const rounds = config.isDoubleRoundRobin ? 2 : 1;

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < config.teams.length; i++) {
      for (let j = i + 1; j < config.teams.length; j++) {
        const team1 = config.teams[i];
        const team2 = config.teams[j];

        // BO3 比赛
        const matchResult = simulateSeriesMatch(
          `常规赛第${r + 1}轮`,
          "bo3",
          team1,
          team2,
          config.playerHeroName,
          config.playerPerformanceBuff
        );
        matchesHistory.push(matchResult);

        const s1 = standingsMap[team1.teamId];
        const s2 = standingsMap[team2.teamId];

        s1.matchesPlayed++;
        s2.matchesPlayed++;

        s1.gameWins += matchResult.scoreA;
        s1.gameLosses += matchResult.scoreB;
        s2.gameWins += matchResult.scoreB;
        s2.gameLosses += matchResult.scoreA;

        s1.gameDiff = s1.gameWins - s1.gameLosses;
        s2.gameDiff = s2.gameWins - s2.gameLosses;

        if (matchResult.scoreA > matchResult.scoreB) {
          s1.wins++;
          s1.points++;
          s2.losses++;
          s1.headToHeadRecords[team2.teamId] = (s1.headToHeadRecords[team2.teamId] || 0) + (matchResult.scoreA - matchResult.scoreB);
          s2.headToHeadRecords[team1.teamId] = (s2.headToHeadRecords[team1.teamId] || 0) - (matchResult.scoreA - matchResult.scoreB);
        } else {
          s2.wins++;
          s2.points++;
          s1.losses++;
          s2.headToHeadRecords[team1.teamId] = (s2.headToHeadRecords[team1.teamId] || 0) + (matchResult.scoreB - matchResult.scoreA);
          s1.headToHeadRecords[team2.teamId] = (s1.headToHeadRecords[team2.teamId] || 0) - (matchResult.scoreB - matchResult.scoreA);
        }

        s1.winRate = Math.round((s1.wins / s1.matchesPlayed) * 100) / 100;
        s2.winRate = Math.round((s2.wins / s2.matchesPlayed) * 100) / 100;
      }
    }
  }

  // 严格排序规则：
  // 1. 积分 (胜场)
  // 2. 净胜小局 (gameDiff)
  // 3. 双方胜负关系
  // 4. 总小局获胜数
  const sortedStandings = Object.values(standingsMap).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gameDiff !== a.gameDiff) return b.gameDiff - a.gameDiff;
    const h2h = (a.headToHeadRecords[b.teamId] || 0);
    if (h2h !== 0) return -h2h; // 若 a 对 b 净胜为正，则 a 排在前面
    return b.gameWins - a.gameWins;
  });

  sortedStandings.forEach((st, idx) => {
    st.rank = idx + 1;
    st.seedPosition = idx + 1;
    st.qualifiedForPlayoffs = st.rank <= config.playoffCutoffRank;
    if (config.relegationCutoffRank && st.rank >= config.relegationCutoffRank) {
      st.isRelegationRisk = true;
    }
  });

  const playoffTeams = sortedStandings.filter(s => s.qualifiedForPlayoffs);
  const relegationTeams = sortedStandings.filter(s => s.isRelegationRisk);
  const playerStanding = sortedStandings.find(s => {
    const original = config.teams.find(t => t.teamId === s.teamId);
    return original?.isPlayerTeam;
  });

  return {
    standings: sortedStandings,
    totalMatchesCount: matchesHistory.length,
    playoffTeams,
    relegationTeams,
    matchesHistory,
    playerStanding,
  };
}

// ==========================================
// 3. 季后赛四强双败争银龙杯系统
// ==========================================

export interface DoubleEliminationPlayoffsConfig {
  seasonYear: number;
  split: LeagueSplit;
  top4Seeds: { teamId: string; teamName: string; basePower: number; isPlayerTeam?: boolean }[];
  playerHeroName?: string;
  playerPerformanceBuff?: number;
}

export function simulateDoubleEliminationPlayoffs(config: DoubleEliminationPlayoffsConfig): DoubleEliminationBracket {
  const [seed1, seed2, seed3, seed4] = config.top4Seeds;

  // 1. 胜者组半决赛 (Upper Bracket Semifinals) - BO5
  // Match 1: Seed 1 vs Seed 4
  const ubSemis1 = simulateSeriesMatch(
    "胜者组半决赛 M1",
    "bo5",
    seed1,
    seed4,
    config.playerHeroName,
    config.playerPerformanceBuff
  );

  // Match 2: Seed 2 vs Seed 3
  const ubSemis2 = simulateSeriesMatch(
    "胜者组半决赛 M2",
    "bo5",
    seed2,
    seed3,
    config.playerHeroName,
    config.playerPerformanceBuff
  );

  const ubWinner1 = ubSemis1.winnerTeam === seed1.teamName ? seed1 : seed4;
  const ubLoser1 = ubSemis1.winnerTeam === seed1.teamName ? seed4 : seed1;

  const ubWinner2 = ubSemis2.winnerTeam === seed2.teamName ? seed2 : seed3;
  const ubLoser2 = ubSemis2.winnerTeam === seed2.teamName ? seed3 : seed2;

  // 2. 败者组第一轮 (Lower Bracket Round 1 / 殿军排定) - BO5
  const lbRound1 = simulateSeriesMatch(
    "败者组半决赛",
    "bo5",
    ubLoser1,
    ubLoser2,
    config.playerHeroName,
    config.playerPerformanceBuff
  );

  const fourthPlaceTeam = lbRound1.loserTeam;
  const lbSurvivingTeam = lbRound1.winnerTeam === ubLoser1.teamName ? ubLoser1 : ubLoser2;

  // 3. 胜者组决赛 (Upper Bracket Final) - BO5
  const ubFinal = simulateSeriesMatch(
    "胜者组决赛",
    "bo5",
    ubWinner1,
    ubWinner2,
    config.playerHeroName,
    config.playerPerformanceBuff
  );

  const grandFinalSeedUpper = ubFinal.winnerTeam === ubWinner1.teamName ? ubWinner1 : ubWinner2;
  const ubFinalLoser = ubFinal.winnerTeam === ubWinner1.teamName ? ubWinner2 : ubWinner1;

  // 4. 败者组决赛 (Lower Bracket Final / 季军排定) - BO5
  const lbFinal = simulateSeriesMatch(
    "败者组决赛",
    "bo5",
    ubFinalLoser,
    lbSurvivingTeam,
    config.playerHeroName,
    config.playerPerformanceBuff
  );

  const thirdPlaceTeam = lbFinal.loserTeam;
  const grandFinalSeedLower = lbFinal.winnerTeam === ubFinalLoser.teamName ? ubFinalLoser : lbSurvivingTeam;

  // 5. 银龙杯总决赛 (Grand Finals) - BO5
  const grandFinal = simulateSeriesMatch(
    "银龙杯春/夏季总决赛",
    "bo5",
    grandFinalSeedUpper,
    grandFinalSeedLower,
    config.playerHeroName,
    config.playerPerformanceBuff
  );

  const champion = grandFinal.winnerTeam;
  const runnerUp = grandFinal.loserTeam;

  return {
    seasonYear: config.seasonYear,
    split: config.split,
    winnerBracketRounds: [
      {
        roundName: "胜者组半决赛",
        matches: [ubSemis1, ubSemis2],
      },
      {
        roundName: "胜者组决赛",
        matches: [ubFinal],
      },
    ],
    loserBracketRounds: [
      {
        roundName: "败者组半决赛",
        matches: [lbRound1],
      },
      {
        roundName: "败者组决赛",
        matches: [lbFinal],
      },
    ],
    grandFinal,
    champion,
    runnerUp,
    thirdPlace: thirdPlaceTeam,
    fourthPlace: fourthPlaceTeam,
  };
}

// ==========================================
// 4. S赛世界赛瑞士轮系统 (Worlds Swiss Stage Engine)
// ==========================================

export interface WorldsSwissConfig {
  year: number;
  teams: {
    teamName: string;
    region: SwissStageTeamRecord["region"];
    basePower: number;
    isPlayerTeam?: boolean;
  }[]; // 必须严格为 16 支
  playerHeroName?: string;
  playerPerformanceBuff?: number;
}

export function simulateWorldsSwissStage(config: WorldsSwissConfig): SwissStageReport {
  if (config.teams.length !== 16) {
    throw new Error("瑞士轮赛制必须严格由 16 支世界赛入围战队参与！");
  }

  // 初始化队伍记录
  const teamRecords: Record<string, SwissStageTeamRecord & { basePower: number; isPlayerTeam?: boolean }> = {};
  config.teams.forEach(t => {
    teamRecords[t.teamName] = {
      teamName: t.teamName,
      region: t.region,
      basePower: t.basePower,
      isPlayerTeam: t.isPlayerTeam,
      wins: 0,
      losses: 0,
      status: "active",
      roundResults: [],
      historicalOpponents: [],
    };
  });

  const roundsSummary: SwissStageReport["roundsSummary"] = [];

  // 瑞士轮一共持续最多 5 轮
  for (let currentRound = 1; currentRound <= 5; currentRound++) {
    // 找出所有仍未晋级、也未淘汰的队伍
    const activeTeams = Object.values(teamRecords).filter(t => t.status === "active");
    if (activeTeams.length === 0) break;

    // 按现有胜负战绩分组 (e.g. 0-0; 1-0, 0-1; 2-0, 1-1, 0-2; 2-1, 1-2; 2-2)
    const recordGroups: Record<string, typeof activeTeams> = {};
    activeTeams.forEach(t => {
      const key = `${t.wins}-${t.losses}`;
      if (!recordGroups[key]) recordGroups[key] = [];
      recordGroups[key].push(t);
    });

    const roundMatches: SeriesMatchResult[] = [];
    let bo1Count = 0;
    let bo3Count = 0;

    // 针对每个战绩池进行组内抽签配对
    for (const [recordKey, group] of Object.entries(recordGroups)) {
      const isQualificationOrEliminationMatch =
        recordKey.startsWith("2-") || // 2胜队伍赢即 3胜晋级
        recordKey.endsWith("-2");     // 2败队伍输即 3败淘汰

      const format: MatchFormat = isQualificationOrEliminationMatch ? "bo3" : "bo1";
      if (format === "bo3") {
        bo3Count += group.length / 2;
      } else {
        bo1Count += group.length / 2;
      }

      // 洗牌抽签
      const pool = [...group].sort(() => Math.random() - 0.5);

      // 尽量避开此前已经交手过的历史对手
      const paired: boolean[] = new Array(pool.length).fill(false);

      for (let i = 0; i < pool.length; i++) {
        if (paired[i]) continue;
        let matchedIndex = -1;

        // 优先挑选未曾交手的对手
        for (let j = i + 1; j < pool.length; j++) {
          if (!paired[j] && !pool[i].historicalOpponents.includes(pool[j].teamName)) {
            matchedIndex = j;
            break;
          }
        }

        // 若无法避开，则取下一个未配对的对手
        if (matchedIndex === -1) {
          for (let j = i + 1; j < pool.length; j++) {
            if (!paired[j]) {
              matchedIndex = j;
              break;
            }
          }
        }

        if (matchedIndex !== -1) {
          paired[i] = true;
          paired[matchedIndex] = true;

          const teamA = pool[i];
          const teamB = pool[matchedIndex];

          teamA.historicalOpponents.push(teamB.teamName);
          teamB.historicalOpponents.push(teamA.teamName);

          const stageTitle = `S赛瑞士轮第${currentRound}轮 [${recordKey}组]`;
          const matchResult = simulateSeriesMatch(
            stageTitle,
            format,
            teamA,
            teamB,
            config.playerHeroName,
            config.playerPerformanceBuff
          );

          roundMatches.push(matchResult);

          const winner = matchResult.winnerTeam === teamA.teamName ? teamA : teamB;
          const loser = matchResult.winnerTeam === teamA.teamName ? teamB : teamA;

          winner.wins++;
          loser.losses++;

          winner.roundResults.push({
            round: currentRound,
            opponent: loser.teamName,
            format,
            won: true,
            score: `${matchResult.scoreA}-${matchResult.scoreB}`,
          });

          loser.roundResults.push({
            round: currentRound,
            opponent: winner.teamName,
            format,
            won: false,
            score: `${matchResult.scoreA}-${matchResult.scoreB}`,
          });

          // 判定 3 胜晋级或 3 败淘汰
          if (winner.wins >= 3) {
            winner.status = "qualified";
          }
          if (loser.losses >= 3) {
            loser.status = "eliminated";
          }
        }
      }
    }

    roundsSummary.push({
      roundIndex: currentRound,
      matchCount: roundMatches.length,
      bo3Count,
      bo1Count,
      matches: roundMatches,
    });
  }

  const allRecords = Object.values(teamRecords);
  const qualifiedTeams = allRecords.filter(t => t.wins >= 3);
  const eliminatedTeams = allRecords.filter(t => t.losses >= 3);
  const playerTeamRecord = allRecords.find(t => t.isPlayerTeam);

  return {
    year: config.year,
    totalTeams: 16,
    currentRound: roundsSummary.length,
    roundsSummary,
    qualifiedTeams,
    eliminatedTeams,
    playerTeamRecord,
  };
}

// ==========================================
// 5. 升降级附加赛 (2014~2017 历史真实赛制)
// ==========================================

export interface RelegationMatchResult {
  lplTeam: string;
  lsplTeam: string;
  result: SeriesMatchResult;
  promotedOrRetainedTeam: string;
  relegatedTeam: string;
  narrative: string;
}

export function simulateRelegationMatch(
  lplBottomTeam: TeamBattleStats,
  lsplChampionTeam: TeamBattleStats,
  playerHeroName?: string,
  playerPerformanceBuff: number = 0
): RelegationMatchResult {
  const match = simulateSeriesMatch(
    "LPL/LSPL 升降级生死附加赛",
    "bo5",
    lplBottomTeam,
    lsplChampionTeam,
    playerHeroName,
    playerPerformanceBuff
  );

  const promotedOrRetainedTeam = match.winnerTeam;
  const relegatedTeam = match.loserTeam;

  const narrative = match.winnerTeam === lsplChampionTeam.teamName
    ? `【升降级奇迹】次级黑马 ${lsplChampionTeam.teamName} 在BO5鏖战中以 ${match.scoreB}:${match.scoreA} 爆冷掀翻顶级联赛战队 ${lplBottomTeam.teamName}，成功晋级 LPL 顶级联赛！`
    : `【坚韧保级】老牌劲旅 ${lplBottomTeam.teamName} 顶住压力以 ${match.scoreA}:${match.scoreB} 击溃次级联赛挑战者，成功保卫 LPL 职业席位！`;

  return {
    lplTeam: lplBottomTeam.teamName,
    lsplTeam: lsplChampionTeam.teamName,
    result: match,
    promotedOrRetainedTeam,
    relegatedTeam,
    narrative,
  };
}
