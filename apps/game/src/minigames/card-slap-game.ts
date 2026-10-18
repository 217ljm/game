export interface CardSlapGameState {
  playerCardName: string;
  opponentCardName: string;
  opponentName: string;
  playerScore: number;
  opponentScore: number;
  currentTurn: "player" | "opponent";
  powerValue: number; // 0 ~ 100
  angleOffset: number; // -45 ~ 45
  isCharging: boolean;
  gameStatus: "ready" | "charging" | "resolving" | "game_over";
  winner: "player" | "opponent" | null;
  lastActionText: string;
}

export class CardSlapMiniGame {
  public state: CardSlapGameState;

  constructor(opponentName: string = "大院孩子王 · 王小军") {
    this.state = {
      playerCardName: "齐天大圣孙悟空 (金卡)",
      opponentCardName: "哪吒闹海三太子 (银卡)",
      opponentName,
      playerScore: 0,
      opponentScore: 0,
      currentTurn: "player",
      powerValue: 0,
      angleOffset: 0,
      isCharging: false,
      gameStatus: "ready",
      winner: null,
      lastActionText: "点击并按住【下掌蓄力】，在黄色最佳区间松开以掀起强劲掌风！",
    };
  }

  startCharge(): void {
    if (this.state.gameStatus !== "ready" || this.state.currentTurn !== "player") return;
    this.state.isCharging = true;
    this.state.gameStatus = "charging";
    this.state.powerValue = 0;
  }

  updateCharge(delta: number): void {
    if (!this.state.isCharging) return;
    // 蓄力条往复摆动
    this.state.powerValue = (this.state.powerValue + delta * 0.12) % 100;
  }

  releaseCharge(): { isFlipped: boolean; resultText: string } {
    this.state.isCharging = false;
    this.state.gameStatus = "resolving";

    const power = this.state.powerValue;
    // 最佳力量区间 70 ~ 90
    let flipChance = 0.2;
    if (power >= 65 && power <= 92) {
      flipChance = 0.85; // 完美掌风
    } else if (power > 92) {
      flipChance = 0.4; // 用力过猛拍偏
    } else {
      flipChance = 0.35 + (power / 100) * 0.3;
    }

    const isFlipped = Math.random() < flipChance;
    if (isFlipped) {
      this.state.playerScore += 1;
      this.state.lastActionText = `🎉 完美一掌！掌风呼啸而过，精准将对方画片掀翻翻面！得分 +1！`;
    } else {
      this.state.lastActionText = `💨 掌风偏斜，画片只是晃了晃并未翻面！轮到对方拍击！`;
    }

    if (this.state.playerScore >= 2) {
      this.state.gameStatus = "game_over";
      this.state.winner = "player";
    } else {
      this.state.currentTurn = "opponent";
    }

    return { isFlipped, resultText: this.state.lastActionText };
  }

  executeOpponentTurn(): { isFlipped: boolean; resultText: string } {
    this.state.gameStatus = "resolving";
    const oppFlip = Math.random() < 0.55;
    if (oppFlip) {
      this.state.opponentScore += 1;
      this.state.lastActionText = `⚠️ ${this.state.opponentName} 猛烈下掌，成功翻起一张画片！对方得分 +1！`;
    } else {
      this.state.lastActionText = `💨 ${this.state.opponentName} 拍空了，气流没能翻动画片！轮到你反击！`;
    }

    if (this.state.opponentScore >= 2) {
      this.state.gameStatus = "game_over";
      this.state.winner = "opponent";
    } else {
      this.state.currentTurn = "player";
      this.state.gameStatus = "ready";
    }

    return { isFlipped: oppFlip, resultText: this.state.lastActionText };
  }
}
