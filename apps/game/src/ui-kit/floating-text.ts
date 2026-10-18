import Phaser from "phaser";
import { pixelPalette, toColorString } from "./pixel-palette";
import { DEFAULT_FONT_FAMILY, GAME_RESOLUTION } from "../ui/game-text";

export type FloatingType = "gain" | "loss" | "neutral" | "highlight" | "critical" | "achievement";

export interface FloatingTextOptions {
  x: number;
  y: number;
  text: string;
  type?: FloatingType;
  color?: number | string;
  fontSize?: number;
  duration?: number;
  distance?: number;
  depth?: number;
  onComplete?: () => void;
}

/**
 * 产生单条数值变动浮动数字组件
 * 绿色上升跳跃渐隐（如 智力 +5 ⬆）、红色下沉震颤（如 疲劳 +10 ⬇）、金色暴击成就（带星芒微粒弹跳）
 */
export function spawnFloatingText(
  scene: Phaser.Scene,
  options: FloatingTextOptions
): Phaser.GameObjects.Container {
  const {
    x,
    y,
    text,
    type = "gain",
    fontSize = type === "critical" ? 18 : type === "achievement" ? 16 : 15,
    duration = type === "critical" || type === "achievement" ? 1400 : 1000,
    distance = type === "critical" ? 48 : 36,
    depth = 9999,
    onComplete,
  } = options;

  let textColor: string;
  if (options.color !== undefined) {
    textColor = typeof options.color === "number"
      ? toColorString(options.color)
      : options.color;
  } else {
    switch (type) {
      case "gain":
        textColor = toColorString(pixelPalette.pixelGreen);
        break;
      case "loss":
        textColor = toColorString(pixelPalette.pixelRed);
        break;
      case "critical":
        textColor = toColorString(pixelPalette.goldHighlight);
        break;
      case "achievement":
        textColor = toColorString(pixelPalette.goldHighlight);
        break;
      case "highlight":
        textColor = toColorString(pixelPalette.goldHighlight);
        break;
      case "neutral":
      default:
        textColor = toColorString(pixelPalette.parchmentLight);
        break;
    }
  }

  const container = scene.add.container(x, y);
  container.setDepth(depth);

  // 像素高对比度深色描边字
  const strokeColor = type === "critical" ? "#4a3425" : "#111111";
  const strokeThickness = type === "critical" ? 4 : 3;

  const label = scene.add.text(0, 0, text, {
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSize: `${fontSize}px`,
    fontStyle: "bold",
    color: textColor,
    stroke: strokeColor,
    strokeThickness: strokeThickness,
    shadow: {
      offsetX: 1,
      offsetY: 2,
      color: "#000000",
      blur: 0,
      fill: true,
      stroke: true,
    },
    resolution: GAME_RESOLUTION,
  }).setOrigin(0.5, 0.5);

  container.add(label);

  // ==========================================
  //  不同类型的物理位移与视觉动效
  // ==========================================

  if (type === "critical" || type === "achievement") {
    // 【金色暴击 / 成就解锁】：弹跳跳跃 + 炸开金色小星芒粒子
    container.setScale(0.5);
    container.setAlpha(1);

    // 1. 强力 Back.Out 弹跳爆发放大
    scene.tweens.add({
      targets: container,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 180,
      ease: Phaser.Math.Easing.Back.Out,
      onComplete: () => {
        scene.tweens.add({
          targets: container,
          scaleX: 1.0,
          scaleY: 1.0,
          duration: 120,
        });
      },
    });

    // 2. 向上飞升与平缓漂浮
    scene.tweens.add({
      targets: container,
      y: y - distance,
      duration: duration,
      ease: Phaser.Math.Easing.Cubic.Out,
    });

    // 3. 喷射 5 颗金色星芒像素粒子
    const sparkColors = [pixelPalette.goldHighlight, pixelPalette.goldGlint, pixelPalette.goldAccent, 0xffffff];
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const sparkDist = Phaser.Math.Between(18, 30);
      const sparkX = Math.cos(angle) * sparkDist;
      const sparkY = Math.sin(angle) * sparkDist;

      const spark = scene.add.graphics();
      spark.fillStyle(Phaser.Utils.Array.GetRandom(sparkColors), 1);
      spark.fillRect(0, 0, 3, 3);
      container.add(spark);

      scene.tweens.add({
        targets: spark,
        x: sparkX,
        y: sparkY,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 450,
        ease: Phaser.Math.Easing.Cubic.Out,
        onComplete: () => {
          spark.destroy();
        },
      });
    }

    // 4. 尾部渐隐与销毁
    scene.tweens.add({
      targets: container,
      alpha: 0,
      delay: duration * 0.55,
      duration: duration * 0.45,
      ease: Phaser.Math.Easing.Linear,
      onComplete: () => {
        container.destroy();
        if (onComplete) onComplete();
      },
    });
  } else if (type === "gain" || type === "highlight") {
    // 上升跳跃渐隐动效 (绿色数值 +5 ⬆)
    container.setScale(0.7);
    container.setAlpha(1);

    // 1. 弹出轻微回弹缩放
    scene.tweens.add({
      targets: container,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 160,
      ease: Phaser.Math.Easing.Back.Out,
      onComplete: () => {
        scene.tweens.add({
          targets: container,
          scaleX: 1.0,
          scaleY: 1.0,
          duration: 100,
        });
      },
    });

    // 2. 向上位移并渐隐
    scene.tweens.add({
      targets: container,
      y: y - distance,
      duration: duration,
      ease: Phaser.Math.Easing.Cubic.Out,
    });

    scene.tweens.add({
      targets: container,
      alpha: 0,
      delay: duration * 0.45,
      duration: duration * 0.55,
      ease: Phaser.Math.Easing.Linear,
      onComplete: () => {
        container.destroy();
        if (onComplete) onComplete();
      },
    });
  } else if (type === "loss") {
    // 下沉下坠微震动效 (红色数值 +10 ⬇ / 疲劳上升 / 扣钱)
    container.setScale(1.0);
    container.setAlpha(1);

    // 左右微震颤下沉
    scene.tweens.add({
      targets: container,
      x: {
        value: x + 3,
        duration: 60,
        yoyo: true,
        repeat: 3,
      },
    });

    // 向下沉降
    scene.tweens.add({
      targets: container,
      y: y + distance * 0.75,
      duration: duration,
      ease: Phaser.Math.Easing.Quadratic.In,
    });

    scene.tweens.add({
      targets: container,
      alpha: 0,
      delay: duration * 0.4,
      duration: duration * 0.6,
      ease: Phaser.Math.Easing.Linear,
      onComplete: () => {
        container.destroy();
        if (onComplete) onComplete();
      },
    });
  } else {
    // 中性轻微漂浮
    scene.tweens.add({
      targets: container,
      y: y - distance * 0.5,
      alpha: 0,
      duration: duration,
      ease: Phaser.Math.Easing.Sine.Out,
      onComplete: () => {
        container.destroy();
        if (onComplete) onComplete();
      },
    });
  }

  return container;
}

/**
 * 便捷函数：触发数值增长浮动提示 (绿色上升)
 */
export function spawnFloatingGain(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  onComplete?: () => void
): Phaser.GameObjects.Container {
  return spawnFloatingText(scene, {
    x,
    y,
    text: text.includes("⬆") ? text : `${text} ⬆`,
    type: "gain",
    onComplete,
  });
}

/**
 * 便捷函数：触发数值消耗/负面浮动提示 (红色下沉)
 */
export function spawnFloatingLoss(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  onComplete?: () => void
): Phaser.GameObjects.Container {
  return spawnFloatingText(scene, {
    x,
    y,
    text: text.includes("⬇") ? text : `${text} ⬇`,
    type: "loss",
    onComplete,
  });
}

/**
 * 便捷函数：触发金色暴击数值浮动提示 (金色星芒弹跳)
 */
export function spawnFloatingCritical(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  onComplete?: () => void
): Phaser.GameObjects.Container {
  return spawnFloatingText(scene, {
    x,
    y,
    text: text.includes("★") ? text : `★ ${text} 暴击! ★`,
    type: "critical",
    onComplete,
  });
}

/**
 * 便捷函数：触发金色成就达成浮动提示
 */
export function spawnFloatingAchievement(
  scene: Phaser.Scene,
  x: number,
  y: number,
  title: string,
  onComplete?: () => void
): Phaser.GameObjects.Container {
  return spawnFloatingText(scene, {
    x,
    y,
    text: `【成就】${title}`,
    type: "achievement",
    onComplete,
  });
}

/**
 * 批量弹出浮动数字（按间隔毫秒级阶梯弹出，防止文字堆叠重合）
 */
export function spawnFloatingBatch(
  scene: Phaser.Scene,
  x: number,
  y: number,
  items: Array<{ text: string; type: FloatingType }>,
  staggerMs = 220
): void {
  items.forEach((item, index) => {
    scene.time.delayedCall(index * staggerMs, () => {
      spawnFloatingText(scene, {
        x,
        y: y + index * 16,
        text: item.text,
        type: item.type,
      });
    });
  });
}
