import Phaser from "phaser";
import { palette } from "./game-palette";

/**
 * 统一跨平台现代高清中文字体栈
 * 优先匹配系统现代无衬线字体（iOS/macOS PingFang SC，Windows 微软雅黑/Segoe UI，Android 思源黑体/Noto Sans），杜绝生硬点阵/老旧黑体
 */
export const DEFAULT_FONT_FAMILY = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', 'Source Han Sans SC', 'Noto Sans SC', sans-serif";

/**
 * 统一跨平台高清超采样分辨率，默认最小2倍，彻底杜绝Canvas字体与像素拉伸发虚
 */
export const GAME_RESOLUTION = typeof window !== "undefined" ? Math.max(window.devicePixelRatio || 2, 2) : 2;

export function text(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size = 16,
  color = palette.ink,
  bold = false,
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, value, {
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSize: `${size}px`,
    color: `#${color.toString(16).padStart(6, "0")}`,
    fontStyle: bold ? "bold" : "normal",
    resolution: GAME_RESOLUTION,
    padding: { x: 2, y: 2 },
  }).setOrigin(0, 0.5);
}

export function panel(scene: Phaser.Scene, x: number, y: number, width: number, height: number, fill = palette.paper, radius = 16): Phaser.GameObjects.Graphics {
  return scene.add.graphics().fillStyle(fill, 1).fillRoundedRect(x, y, width, height, radius).lineStyle(1, palette.line, 1).strokeRoundedRect(x, y, width, height, radius);
}

export interface ButtonFeedbackOptions {
  pressScale?: number;
  useHandCursor?: boolean;
  onPress?: () => void;
  onClick?: () => void;
}

/**
 * 为任意 Phaser GameObject 绑定完整的 Pointer 按下/抬起/移出/取消交互与按压手感反馈
 */
export function bindInteractiveFeedback(
  target: Phaser.GameObjects.GameObject & { setScale?: (x: number, y?: number) => unknown; scene?: Phaser.Scene },
  options: ButtonFeedbackOptions = {}
): void {
  const {
    pressScale = 0.95,
    onClick,
    onPress,
  } = options;

  target.on(Phaser.Input.Events.POINTER_DOWN, () => {
    if (typeof target.setScale === "function" && target.scene?.tweens) {
      target.scene.tweens.add({
        targets: target,
        scaleX: pressScale,
        scaleY: pressScale,
        duration: 75,
        yoyo: true,
        ease: "Quad.easeOut",
      });
    }
    onPress?.();
    onClick?.();
  });
}

