import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../contracts";
import { DEFAULT_FONT_FAMILY } from "../ui/game-text";

export interface AdvanceDirectorConfig {
  fromYear: number;
  toYear: number;
  fromAge: number;
  toAge: number;
  playerName: string;
  seasonText?: string;
  historicalHeadline?: string;
  attributeChanges: Array<{
    label: string;
    delta: number;
    color: string;
  }>;
  onComplete: () => void;
}

/**
 * 季度/年度推进心跳演播导演管线 (AdvanceDirector)
 * 彻底消除突兀的网页式刷屏，提供 2~3 秒影视级翻页演播、四季色调流动、时代简报打字机动效与属性结算跳跃
 */
export class AdvanceDirector {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private isRunning: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = this.scene.add.container(0, 0).setDepth(200);
    this.container.setVisible(false);
  }

  public play(config: AdvanceDirectorConfig): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.container.removeAll(true);
    this.container.setVisible(true);

    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // 1. 半透明时代暗角遮罩 (从全黑柔和淡入至 0.88)
    const overlay = this.scene.add.rectangle(centerX, centerY, GAME_WIDTH, GAME_HEIGHT, 0x05131a, 0);
    overlay.setInteractive(); // 阻断点击穿透
    this.container.add(overlay);

    // 2. 核心日历翻页主卡片容器
    const calendarContainer = this.scene.add.container(centerX, centerY - 40);
    calendarContainer.setScale(0.85);
    calendarContainer.setAlpha(0);
    this.container.add(calendarContainer);

    // 日历背板（复古米白泛黄纸质感 + 烫金边框）
    const calW = 320;
    const calH = 240;
    const calBg = this.scene.add.graphics();
    calBg.fillStyle(0x0e242f, 0.98).fillRoundedRect(-calW / 2, -calH / 2, calW, calH, 14);
    calBg.lineStyle(2.5, 0xd4a359, 1).strokeRoundedRect(-calW / 2, -calH / 2, calW, calH, 14);
    // 日历顶部装订金属环
    calBg.fillStyle(0xb55a3c, 1).fillRoundedRect(-calW / 2 + 10, -calH / 2 + 8, calW - 20, 36, 8);
    calendarContainer.add(calBg);

    // 顶部横幅：“岁月流转 · 时代脉搏”
    const bannerText = this.scene.add.text(0, -calH / 2 + 26, "⏳ 岁月长河 · 时代翻篇", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "14px",
      fontStyle: "bold",
      color: "#ffd8a1",
    }).setOrigin(0.5);
    calendarContainer.add(bannerText);

    // 年代与岁数大字（动态翻牌动效）
    const yearText = this.scene.add.text(0, -30, `${config.fromYear} 年`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "36px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(0.5);
    calendarContainer.add(yearText);

    const ageText = this.scene.add.text(0, 16, `【 ${config.fromAge} 岁 · 青年岁月 】`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "16px",
      fontStyle: "bold",
      color: "#8be5d1",
    }).setOrigin(0.5);
    calendarContainer.add(ageText);

    // 时代大事记新闻简报框
    const headline = config.historicalHeadline || `${config.toYear} 年春，神州大地欣欣向荣，改革潮涌澎湃`;
    const newsBg = this.scene.add.graphics();
    newsBg.fillStyle(0x13303d, 0.9).fillRoundedRect(-calW / 2 + 16, 46, calW - 32, 54, 8);
    newsBg.lineStyle(1.2, 0x38bdf8, 0.7).strokeRoundedRect(-calW / 2 + 16, 46, calW - 32, 54, 8);
    calendarContainer.add(newsBg);

    const newsText = this.scene.add.text(0, 73, `📰 ${headline}`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "12px",
      color: "#cbd5e1",
      align: "center",
      wordWrap: { width: calW - 48, useAdvancedWrap: true },
    }).setOrigin(0.5);
    calendarContainer.add(newsText);

    // 3. 属性增减动效条（卡片下方跳出）
    const statsContainer = this.scene.add.container(centerX, centerY + 140);
    statsContainer.setAlpha(0);
    this.container.add(statsContainer);

    let statY = 0;
    config.attributeChanges.forEach((attr) => {
      const sign = attr.delta >= 0 ? "+" : "";
      const statPill = this.scene.add.text(0, statY, `${attr.label} ${sign}${attr.delta}`, {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "14px",
        fontStyle: "bold",
        color: attr.color,
        backgroundColor: "#0d2633",
        padding: { x: 10, y: 4 },
      }).setOrigin(0.5);
      statsContainer.add(statPill);
      statY += 28;
    });

    // 4. “点击任意处继续”提示
    const promptText = this.scene.add.text(centerX, GAME_HEIGHT - 70, "✨ 轻触屏幕 迈入人生新旅途 ▶", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "14px",
      fontStyle: "bold",
      color: "#fbbf24",
    }).setOrigin(0.5).setAlpha(0);
    this.container.add(promptText);

    // ---- 动效编排时序线 ----
    // 阶段 1: 遮罩渐显 + 日历牌弹性弹出 (0 ~ 400ms)
    this.scene.tweens.add({
      targets: overlay,
      fillAlpha: 0.88,
      duration: 350,
      ease: "Quad.easeOut",
    });

    this.scene.tweens.add({
      targets: calendarContainer,
      scale: 1,
      alpha: 1,
      duration: 400,
      ease: "Back.easeOut",
      onComplete: () => {
        // 阶段 2: 翻牌动效 (400ms ~ 900ms)
        this.scene.tweens.add({
          targets: yearText,
          scaleY: 0,
          duration: 200,
          ease: "Sine.easeIn",
          onComplete: () => {
            yearText.setText(`${config.toYear} 年`);
            ageText.setText(`【 ${config.toAge} 岁 · 崭新篇章 】`);
            this.scene.tweens.add({
              targets: yearText,
              scaleY: 1,
              duration: 250,
              ease: "Back.easeOut",
            });
          },
        });

        // 阶段 3: 属性跳动与金光浮升 (700ms ~ 1200ms)
        this.scene.tweens.add({
          targets: statsContainer,
          alpha: 1,
          y: centerY + 130,
          duration: 400,
          ease: "Cubic.easeOut",
        });

        // 阶段 4: 提示文本呼吸闪烁
        this.scene.tweens.add({
          targets: promptText,
          alpha: { from: 0, to: 1 },
          duration: 500,
          ease: "Sine.easeInOut",
          onComplete: () => {
            this.scene.tweens.add({
              targets: promptText,
              alpha: 0.4,
              duration: 700,
              yoyo: true,
              repeat: -1,
            });
            // 允许玩家点击跳过或推进
            overlay.once("pointerdown", () => {
              this.finish(config.onComplete);
            });
          },
        });
      },
    });
  }

  private finish(onComplete: () => void): void {
    if (!this.isRunning) return;
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 250,
      ease: "Quad.easeIn",
      onComplete: () => {
        this.container.setVisible(false);
        this.container.setAlpha(1);
        this.container.removeAll(true);
        this.isRunning = false;
        onComplete();
      },
    });
  }
}
