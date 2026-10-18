export interface EsportsGameState {
  phase: "regular_season" | "semifinal" | "wcg_finals";
  opponentTeamName: string;
  opponentPlayerName: string;
  gameTitle: string; // 《街头霸王2》《星际争霸》《反恐精英 CS 1.6》
  playerScore: number;
  opponentScore: number;
  playerHp: number;
  opponentHp: number;
  currentActionText: string;
  isGameOver: boolean;
  isWorldChampion: boolean;
}

export class EsportsCareerManager {
  public state: EsportsGameState;

  constructor() {
    this.state = {
      phase: "wcg_finals",
      opponentTeamName: "韩国首尔 SKT 电竞战队",
      opponentPlayerName: "BoxeR (人皇)",
      gameTitle: "《星际争霸 / 街霸世界巅峰决胜局》",
      playerScore: 1,
      opponentScore: 1,
      playerHp: 100,
      opponentHp: 100,
      currentActionText: "WCG 世界电子竞技大赛总决赛！决胜局一触即发，全场观众高呼你的名字！",
      isGameOver: false,
      isWorldChampion: false,
    };
  }

  executeSpecialMove(moveType: "hadoken" | "shoryuken" | "snipe_headshot" | "rush_tactics"): {
    damageDealt: number;
    opponentDamage: number;
    resultText: string;
  } {
    if (this.state.isGameOver) return { damageDealt: 0, opponentDamage: 0, resultText: "" };

    let damage = 0;
    let oppDamage = 0;
    let text = "";

    if (moveType === "hadoken") {
      damage = Math.floor(30 + Math.random() * 20);
      text = "⚡ 你极速手搓【波动拳 气功波】，精准命中对手破绽！造成大额伤害！";
    } else if (moveType === "shoryuken") {
      damage = Math.floor(40 + Math.random() * 25);
      text = "🔥 你抓住对手跳入破绽，极限预判手搓【无敌昇龙拳】！暴击重创对手！";
    } else if (moveType === "snipe_headshot") {
      damage = Math.floor(45 + Math.random() * 25);
      text = "🎯 听声辨位！AWP 瞬狙一枪爆头！全场解说起立欢呼！";
    } else {
      damage = Math.floor(35 + Math.random() * 20);
      text = "⚔️ 双线多点空投骚扰，神级多线操作打崩对手阵型！";
    }

    this.state.opponentHp = Math.max(0, this.state.opponentHp - damage);

    if (this.state.opponentHp <= 0) {
      this.state.isGameOver = true;
      this.state.isWorldChampion = true;
      this.state.playerScore += 1;
      this.state.currentActionText = "🏆 击倒对手！大获全胜！你斩获了 WCG 世界总决赛冠军！五星红旗在赛场中央冉冉升起！";
      return { damageDealt: damage, opponentDamage: 0, resultText: this.state.currentActionText };
    }

    // 对手反击
    oppDamage = Math.floor(15 + Math.random() * 20);
    this.state.playerHp = Math.max(0, this.state.playerHp - oppDamage);

    if (this.state.playerHp <= 0) {
      this.state.isGameOver = true;
      this.state.isWorldChampion = false;
      this.state.opponentScore += 1;
      this.state.currentActionText = "💔 决胜局惜败！对手顶住压力完成了防守反击，你获得了世界亚军银牌！";
    } else {
      this.state.currentActionText = `${text} 对手随后反击造成 ${oppDamage} 点伤害！`;
    }

    return { damageDealt: damage, opponentDamage: oppDamage, resultText: this.state.currentActionText };
  }
}
