import Phaser from "phaser";
import { DEFAULT_FONT_FAMILY, GAME_RESOLUTION } from "../../ui/game-text.ts";

export type SmiteGrade = "PERFECT" | "GOOD" | "EARLY" | "LATE";

export interface QteSmiteResult {
  success: boolean;
  grade: SmiteGrade;
  deltaMs: number;
  playerApm: number;
  reactionMs: number;
  narrative: string;
}

export interface EsportsQteSmiteConfig {
  scene: Phaser.Scene;
  x?: number;
  y?: number;
  width?: number; // 390
  height?: number; // 844
  targetMonsterName?: "纳什男爵" | "远古巨龙" | "炼狱亚龙";
  playerApm?: number; // 选手 APM，默认 320
  playerReactionMs?: number; // 选手反应延时 ms，默认 165
  hasInjuryPenalty?: boolean;
  onComplete?: (result: QteSmiteResult) => void;
}

/**
 * 龙坑拼惩戒 / 抢大龙 QTE 交互小游戏 (EsportsQteSmite)
 * 核心机制：
 * 1. 龙坑残血逼团斩杀危局（巨龙血量 2500 -> 900 急速下降）；
 * 2. 动态收缩光圈至圆心靶心（Perfect Zone）；
 * 3. 选手实际 APM 与反应神经延时决定命中判定窗口宽度与光圈稳定性；
 * 4. 完美惩戒落雷全屏高能演出与音效震颤反馈。
 */
export class EsportsQteSmite extends Phaser.GameObjects.Container {
  private readonly qteWidth: number;
  private readonly qteHeight: number;
  private readonly targetMonster: string;
  private readonly playerApm: number;
  private readonly reactionMs: number;
  private readonly hasInjury: boolean;
  private onCompleteCallback?: (result: QteSmiteResult) => void;

  // QTE 运行状态
  private isRunning: boolean = false;
  private isFinished: boolean = false;
  private elapsedMs: number = 0;
  private readonly totalDurationMs: number = 1350; // 光圈从外围收缩到靶心的时间
  private readonly targetRadius: number = 38; // 靶心完美圆半径
  private readonly startRadius: number = 145; // 外围光圈初始半径
  private currentRadius: number = 145;
  private monsterHp: number = 2600;
  private readonly smiteExecuteHp: number = 900; // 真实惩戒斩杀线

  // 内部显示对象引用
  private ringGraphics!: Phaser.GameObjects.Graphics;
  private monsterHpText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private resultContainer!: Phaser.GameObjects.Container;
  private smiteButtonContainer!: Phaser.GameObjects.Container;
  private keyListener?: (event: KeyboardEvent) => void;

  constructor(config: EsportsQteSmiteConfig) {
    super(config.scene, config.x ?? 0, config.y ?? 0);
    this.qteWidth = config.width ?? 390;
    this.qteHeight = config.height ?? 844;
    this.targetMonster = config.targetMonsterName ?? "纳什男爵";
    this.playerApm = config.playerApm ?? 340;
    this.reactionMs = config.playerReactionMs ?? 160;
    this.hasInjury = config.hasInjuryPenalty ?? false;
    this.onCompleteCallback = config.onComplete;

    this.createQteElements();
    this.showTutorialCard();

    this.scene.add.existing(this);
  }

  /**
   * 3秒前置规则教学提示卡 (Tutorial Overlay)
   */
  private showTutorialCard(): void {
    const w = this.qteWidth;
    const h = this.qteHeight;

    const tutContainer = this.scene.add.container(0, 0).setDepth(100);
    this.add(tutContainer);

    const tutMask = this.scene.add.graphics();
    tutMask.fillStyle(0x050b14, 0.92);
    tutMask.fillRect(0, 0, w, h);
    tutMask.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
    tutContainer.add(tutMask);

    const cardW = 320;
    const cardH = 220;
    const cardX = (w - cardW) / 2;
    const cardY = (h - cardH) / 2 - 20;

    const cardBg = this.scene.add.graphics();
    cardBg.fillStyle(0x0f172a, 0.98).fillRoundedRect(cardX, cardY, cardW, cardH, 12);
    cardBg.lineStyle(2, 0xf59e0b, 1).strokeRoundedRect(cardX, cardY, cardW, cardH, 12);
    tutContainer.add(cardBg);

    const tutTitle = this.scene.add.text(w / 2, cardY + 26, "⚡ 规则提示：龙坑拼惩戒", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "16px",
      fontStyle: "bold",
      color: "#f59e0b",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);
    tutContainer.add(tutTitle);

    const tutDesc = this.scene.add.text(w / 2, cardY + 68, "【胜负条件】\n当金色光圈收缩至中央靶心（900血斩杀线）瞬间，\n按下 [D] 键或点击【惩戒】抢下大龙！", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "12px",
      lineSpacing: 5,
      color: "#e2e8f0",
      align: "center",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);
    tutContainer.add(tutDesc);

    const tutHint = this.scene.add.text(w / 2, cardY + 120, "🎯 越贴合圆心判定越高：PERFECT 必抢大龙！", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "11px",
      color: "#86efac",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);
    tutContainer.add(tutHint);

    const btnW = 180;
    const btnH = 38;
    const btnX = (w - btnW) / 2;
    const btnY = cardY + cardH - 52;

    const btnG = this.scene.add.graphics();
    btnG.fillStyle(0xd97706, 1).fillRoundedRect(btnX, btnY, btnW, btnH, 8);
    btnG.lineStyle(1.5, 0xfde68a, 1).strokeRoundedRect(btnX, btnY, btnW, btnH, 8);
    tutContainer.add(btnG);

    const btnT = this.scene.add.text(w / 2, btnY + btnH / 2, "【 明白，开战！▶ 】", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "14px",
      fontStyle: "bold",
      color: "#ffffff",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);
    tutContainer.add(btnT);

    const hit = this.scene.add.rectangle(w / 2, btnY + btnH / 2, btnW, btnH, 0x000000, 0);
    hit.setInteractive({ useHandCursor: true });
    tutContainer.add(hit);

    hit.on("pointerdown", () => {
      tutContainer.destroy();
      this.startQteLoop();
    });
  }

  private createQteElements(): void {
    const w = this.qteWidth;
    const h = this.qteHeight;

    // 1. 半透明幽暗龙坑全屏遮罩
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x050b14, 0.94);
    overlay.fillRect(0, 0, w, h);
    this.add(overlay);

    // 2. 龙坑战场氛围边框与警报闪烁
    const alertBorder = this.scene.add.graphics();
    alertBorder.lineStyle(2, 0xd97706, 0.8);
    alertBorder.strokeRect(10, 10, w - 20, h - 20);
    this.add(alertBorder);

    // 3. 顶部警报与危机状态提示
    const title = this.scene.add.text(w / 2, 45, `⚡ 龙坑生死决战 · 拼惩抢${this.targetMonster}`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "16px",
      fontStyle: "bold",
      color: "#f59e0b",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);

    const statsHint = this.scene.add.text(w / 2, 70, `选手 APM: ${this.playerApm} · 反应神经: ${this.reactionMs}ms ${this.hasInjury ? "(⚠️伤病惩罚)" : ""}`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "11px",
      color: "#94a3b8",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);

    this.add([title, statsHint]);

    // 4. 中央巨龙立绘与血条展示区
    const centerY = h / 2 - 35;
    const monsterBg = this.scene.add.graphics();
    monsterBg.fillStyle(0x0f172a, 0.95);
    monsterBg.fillCircle(w / 2, centerY, 70);
    monsterBg.lineStyle(2, 0x8b5cf6, 0.9);
    monsterBg.strokeCircle(w / 2, centerY, 70);
    this.add(monsterBg);

    const dragonIcon = this.scene.add.text(w / 2, centerY - 6, "🐲", { fontSize: "52px" }).setOrigin(0.5);
    this.add(dragonIcon);

    // 巨龙动态血条
    this.monsterHpText = this.scene.add.text(w / 2, centerY + 52, `HP: 2,600 / 2,600 (斩杀线: 900)`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "11px",
      fontStyle: "bold",
      color: "#ef4444",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);
    this.add(this.monsterHpText);

    // 5. 动态收缩光圈渲染画布 (在巨龙正上方)
    this.ringGraphics = this.scene.add.graphics();
    this.add(this.ringGraphics);

    // 6. 操作指引文本
    this.promptText = this.scene.add.text(w / 2, centerY + 145, "【 在外围能量环精准收缩至金色靶心圆时按下惩戒！】", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "11.5px",
      fontStyle: "bold",
      color: "#fbbf24",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);
    this.add(this.promptText);

    // 7. 屏幕下方超大【⚡ 惩戒 SMITE】触发按钮
    this.createSmiteButton(w, h / 2 + 185);

    // 8. 键盘监听（支持按空格、D 或 F 键抢龙）
    if (typeof window !== "undefined") {
      this.keyListener = (e: KeyboardEvent) => {
        if (e.code === "Space" || e.key === "d" || e.key === "D" || e.key === "f" || e.key === "F") {
          this.handleSmitePress();
        }
      };
      window.addEventListener("keydown", this.keyListener);
    }
  }

  private createSmiteButton(w: number, btnY: number): void {
    this.smiteButtonContainer = this.scene.add.container(w / 2, btnY);
    const radius = 48;

    const btnG = this.scene.add.graphics();
    btnG.fillStyle(0x0284c7, 1);
    btnG.fillCircle(0, 0, radius);
    btnG.lineStyle(3, 0x38bdf8, 1);
    btnG.strokeCircle(0, 0, radius);

    const smiteIcon = this.scene.add.text(0, -10, "⚡", { fontSize: "28px" }).setOrigin(0.5);
    const smiteText = this.scene.add.text(0, 18, "【惩戒】", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#ffffff",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);

    const hit = this.scene.add.circle(0, 0, radius, 0x000000, 0);
    hit.setInteractive({ useHandCursor: true });
    hit.on("pointerdown", () => {
      this.handleSmitePress();
    });

    this.smiteButtonContainer.add([btnG, smiteIcon, smiteText, hit]);
    this.add(this.smiteButtonContainer);
  }

  private startQteLoop(): void {
    this.isRunning = true;
    this.elapsedMs = 0;
    this.currentRadius = this.startRadius;
  }

  public preUpdate(time: number, delta: number): void {
    if (!this.isRunning || this.isFinished) return;

    this.elapsedMs += delta;
    const progress = Math.min(1.2, this.elapsedMs / this.totalDurationMs);

    // 动态模拟男爵血量飞速下降至斩杀线
    const hpProgress = Math.min(1, progress);
    this.monsterHp = Math.floor(2600 - hpProgress * 1800);
    this.monsterHpText.setText(`HP: ${this.monsterHp} (斩杀线: ${this.smiteExecuteHp})`);

    // 光圈平滑收缩
    const apmBonus = (this.playerApm - 250) * 0.05; // APM 越高收缩越均匀
    this.currentRadius = this.startRadius - (this.startRadius - this.targetRadius) * progress;

    // 伤病微幅抖动
    if (this.hasInjury) {
      this.currentRadius += (Math.random() - 0.5) * 4;
    }

    this.renderRings();

    // 超时判定为未按
    if (progress >= 1.2) {
      this.handleSmitePress(true);
    }
  }

  private renderRings(): void {
    this.ringGraphics.clear();
    const w = this.qteWidth;
    const centerY = this.qteHeight / 2 - 35;

    // 1. 金色靶心完美判定圆 (Target Zone)
    // 根据选手反应速度微调靶心允许厚度
    const windowTolerance = Math.max(6, 12 + (200 - this.reactionMs) * 0.1);
    this.ringGraphics.lineStyle(2.5, 0xfbbf24, 0.95);
    this.ringGraphics.strokeCircle(w / 2, centerY, this.targetRadius);

    this.ringGraphics.fillStyle(0xfbbf24, 0.15);
    this.ringGraphics.fillCircle(w / 2, centerY, this.targetRadius);

    // 2. 动态收缩的外圈能量环
    if (this.currentRadius > 0) {
      const isNearTarget = Math.abs(this.currentRadius - this.targetRadius) <= windowTolerance;
      const ringColor = isNearTarget ? 0x22c55e : 0x38bdf8;

      this.ringGraphics.lineStyle(3, ringColor, 1);
      this.ringGraphics.strokeCircle(w / 2, centerY, this.currentRadius);

      // 发光外辉晕
      this.ringGraphics.lineStyle(1.5, ringColor, 0.4);
      this.ringGraphics.strokeCircle(w / 2, centerY, this.currentRadius + 3);
    }
  }

  private handleSmitePress(isTimeout: boolean = false): void {
    if (this.isFinished) return;
    this.isFinished = true;
    this.isRunning = false;

    // 移除键盘监听
    if (typeof window !== "undefined" && this.keyListener) {
      window.removeEventListener("keydown", this.keyListener);
    }

    const centerY = this.qteHeight / 2 - 35;
    const diffRadius = this.currentRadius - this.targetRadius;
    const windowTolerance = Math.max(7, 12 + (200 - this.reactionMs) * 0.1);

    let grade: SmiteGrade = "GOOD";
    let success = false;
    let narrative = "";

    if (isTimeout || diffRadius < -windowTolerance) {
      grade = "LATE";
      success = false;
      narrative = "⚠️ 惩慢了！敌方打野先一步斩下男爵，痛失大龙 Buff！";
    } else if (diffRadius > windowTolerance) {
      grade = "EARLY";
      success = false;
      narrative = "⚠️ 惩早了！大龙还剩一丝血被敌方偷走！";
    } else if (Math.abs(diffRadius) <= windowTolerance * 0.4) {
      grade = "PERFECT";
      success = true;
      narrative = "⚡【神级极限拼惩！】分毫不差天降狂雷，稳稳将大龙收入囊中！全场沸腾！";
    } else {
      grade = "GOOD";
      success = true;
      narrative = "✨【稳稳控龙！】在敌方干扰下稳健出击惩戒得手！团队士气大振！";
    }

    this.playSmiteResolutionFx(success, grade, narrative);
  }

  private playSmiteResolutionFx(success: boolean, grade: SmiteGrade, narrative: string): void {
    const w = this.qteWidth;
    const centerY = this.qteHeight / 2 - 35;

    // 1. 狂暴天雷惩戒特效从天轰落
    const thunderBolt = this.scene.add.graphics();
    thunderBolt.lineStyle(6, success ? 0xfbbf24 : 0xef4444, 1);
    thunderBolt.beginPath();
    thunderBolt.moveTo(w / 2, 0);
    thunderBolt.lineTo(w / 2 - 8, centerY / 2);
    thunderBolt.lineTo(w / 2 + 10, centerY * 0.7);
    thunderBolt.lineTo(w / 2, centerY);
    thunderBolt.strokePath();
    this.add(thunderBolt);

    this.scene.tweens.add({
      targets: thunderBolt,
      alpha: 0,
      duration: 350,
      ease: "Quad.easeOut",
      onComplete: () => thunderBolt.destroy(),
    });

    // 2. 巨龙震颤与消散
    this.scene.tweens.add({
      targets: this.ringGraphics,
      scaleX: 1.2,
      scaleY: 1.2,
      alpha: 0,
      duration: 300,
    });

    // 3. 评级大横幅弹出
    const gradeColor = grade === "PERFECT" ? "#fbbf24" : grade === "GOOD" ? "#34d399" : "#f87171";
    const gradeTitle = this.scene.add.text(w / 2, centerY, `【 ${grade} 】`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "26px",
      fontStyle: "bold",
      color: gradeColor,
      stroke: "#000000",
      strokeThickness: 4,
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);
    this.add(gradeTitle);

    this.scene.tweens.add({
      targets: gradeTitle,
      scale: 1.2,
      yoyo: true,
      duration: 150,
    });

    // 4. 结算信息展示与自动退出
    this.promptText.setText(narrative);
    this.promptText.setColor(success ? "#86efac" : "#fca5a5");

    const result: QteSmiteResult = {
      success,
      grade,
      deltaMs: Math.round((this.currentRadius - this.targetRadius) * 4),
      playerApm: this.playerApm,
      reactionMs: this.reactionMs,
      narrative,
    };

    this.scene.time.delayedCall(1200, () => {
      if (this.onCompleteCallback) {
        this.onCompleteCallback(result);
      }
      this.destroy();
    });
  }

  public destroy(fromScene?: boolean): void {
    if (typeof window !== "undefined" && this.keyListener) {
      window.removeEventListener("keydown", this.keyListener);
    }
    super.destroy(fromScene);
  }
}
