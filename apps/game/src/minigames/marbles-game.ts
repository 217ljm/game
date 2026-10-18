export interface Marble {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: number;
  isPlayer: boolean;
  isOut: boolean;
}

export interface MarblesGameState {
  playerMarblesLeft: number;
  opponentMarblesLeft: number;
  dragStartX: number;
  dragStartY: number;
  dragCurrentX: number;
  dragCurrentY: number;
  isDragging: boolean;
  powerPercent: number;
  gameStatus: "aiming" | "shooting" | "resolving" | "game_over";
  winner: "player" | "opponent" | null;
  lastActionText: string;
}

export class MarblesMiniGame {
  public state: MarblesGameState;
  public marbles: Marble[];

  constructor() {
    this.state = {
      playerMarblesLeft: 3,
      opponentMarblesLeft: 3,
      dragStartX: 0,
      dragStartY: 0,
      dragCurrentX: 0,
      dragCurrentY: 0,
      isDragging: false,
      powerPercent: 0,
      gameStatus: "aiming",
      winner: null,
      lastActionText: "拖拽底部金色母弹珠向后拉力瞄准，松手极速弹射撞击对方弹珠！",
    };

    this.marbles = [
      { id: "p1", x: 195, y: 380, radius: 12, color: 0xf59e0b, isPlayer: true, isOut: false },
      { id: "o1", x: 160, y: 220, radius: 12, color: 0x38bdf8, isPlayer: false, isOut: false },
      { id: "o2", x: 230, y: 220, radius: 12, color: 0x38bdf8, isPlayer: false, isOut: false },
      { id: "o3", x: 195, y: 180, radius: 12, color: 0x818cf8, isPlayer: false, isOut: false },
    ];
  }

  startDrag(x: number, y: number): void {
    if (this.state.gameStatus !== "aiming") return;
    this.state.isDragging = true;
    this.state.dragStartX = x;
    this.state.dragStartY = y;
    this.state.dragCurrentX = x;
    this.state.dragCurrentY = y;
    this.state.powerPercent = 0;
  }

  updateDrag(x: number, y: number): void {
    if (!this.state.isDragging) return;
    this.state.dragCurrentX = x;
    this.state.dragCurrentY = y;
    const dx = x - this.state.dragStartX;
    const dy = y - this.state.dragStartY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.state.powerPercent = Math.min(100, Math.round((dist / 80) * 100));
  }

  shoot(): { hitCount: number; resultText: string } {
    if (!this.state.isDragging) return { hitCount: 0, resultText: "" };
    this.state.isDragging = false;
    this.state.gameStatus = "resolving";

    const power = this.state.powerPercent;
    // 根据拉力计算击出概率
    let hitSuccess = false;
    if (power >= 40 && power <= 90) {
      hitSuccess = Math.random() < 0.78;
    } else if (power > 90) {
      hitSuccess = Math.random() < 0.5; // 力道过猛容易打偏
    } else {
      hitSuccess = Math.random() < 0.3;
    }

    if (hitSuccess) {
      // 击飞一颗对方弹珠
      const target = this.marbles.find((m) => !m.isPlayer && !m.isOut);
      if (target) {
        target.isOut = true;
        this.state.opponentMarblesLeft -= 1;
      }
      this.state.lastActionText = `🎯 砰！清脆碰撞！精准将对方一颗琉璃弹珠撞出白线圈！`;
    } else {
      this.state.lastActionText = `💨 弹珠擦边滑过，没有将对方弹珠撞出圈外！`;
    }

    if (this.state.opponentMarblesLeft <= 0) {
      this.state.gameStatus = "game_over";
      this.state.winner = "player";
      this.state.lastActionText = "🏆 大获全胜！你清空了对手所有弹珠，赢取了珍贵的特级猫眼弹珠！";
    } else {
      // 对手回合
      const oppHit = Math.random() < 0.45;
      if (oppHit && this.state.playerMarblesLeft > 0) {
        this.state.playerMarblesLeft -= 1;
        this.state.lastActionText += " 对方随后反击撞掉你一颗弹珠！";
      }
      if (this.state.playerMarblesLeft <= 0) {
        this.state.gameStatus = "game_over";
        this.state.winner = "opponent";
      } else {
        this.state.gameStatus = "aiming";
      }
    }

    return { hitCount: hitSuccess ? 1 : 0, resultText: this.state.lastActionText };
  }
}
