import Phaser from "phaser";
import { pixelPalette, toColorString } from "./pixel-palette";
import { DEFAULT_FONT_FAMILY, GAME_RESOLUTION, snapToPixel } from "../ui/game-text";

export type PixelButtonVariant =
  | "primary"     // 湛蓝/专注
  | "gold"        // 帝王金/核心确认
  | "success"     // 青铜绿/行动与达成
  | "danger"      // 绯红/冒险与放弃
  | "wood"        // 胡桃木/次级通用
  | "secondary"   // 羊皮纸白/取消与详情
  | "cyan";       // 电竞天青/技能与微操

export interface PixelButtonOptions {
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  fontSize?: number;
  variant?: PixelButtonVariant;
  disabled?: boolean;
  enableSound?: boolean;
  enableHaptic?: boolean;
  onPress?: () => void;
  onClick?: () => void;
  depth?: number;
}

interface ButtonColorScheme {
  base: number;
  lightHighlight: number;
  darkShade: number;
  shadowBase: number;
  textColor: number;
}

const VARIANT_COLORS: Record<PixelButtonVariant, ButtonColorScheme> = {
  primary: {
    base: pixelPalette.pixelBlue,
    lightHighlight: 0x64b5f6,
    darkShade: 0x0d47a1,
    shadowBase: 0x082554,
    textColor: 0xffffff,
  },
  gold: {
    base: pixelPalette.goldAccent,
    lightHighlight: pixelPalette.goldHighlight,
    darkShade: pixelPalette.brassGold,
    shadowBase: pixelPalette.goldShadow,
    textColor: 0x221a02,
  },
  success: {
    base: pixelPalette.pixelGreen,
    lightHighlight: pixelPalette.greenHighlight,
    darkShade: 0x1b5e20,
    shadowBase: 0x0c330f,
    textColor: 0xffffff,
  },
  danger: {
    base: pixelPalette.pixelRed,
    lightHighlight: 0xe57373,
    darkShade: 0xb71c1c,
    shadowBase: 0x5b0606,
    textColor: 0xffffff,
  },
  wood: {
    base: pixelPalette.woodFrameLight,
    lightHighlight: pixelPalette.walnutHighlight,
    darkShade: pixelPalette.woodFrameDark,
    shadowBase: pixelPalette.walnutDeep,
    textColor: pixelPalette.parchmentLight,
  },
  secondary: {
    base: pixelPalette.parchmentDark,
    lightHighlight: 0xffffff,
    darkShade: pixelPalette.cardBorder,
    shadowBase: 0x544738,
    textColor: pixelPalette.charcoalInk,
  },
  cyan: {
    base: pixelPalette.pixelCyan,
    lightHighlight: 0x4dd0e1,
    darkShade: 0x004d40,
    shadowBase: 0x00251a,
    textColor: 0xffffff,
  },
};

/**
 * 纯代码合成 8-bit 复古按键音频生成器 (Web Audio API)
 * 无需任何外部 mp3/wav 资源加载，极速、干净、完全零依赖
 */
let sharedAudioContext: AudioContext | null = null;

function play8BitClickSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!sharedAudioContext) {
      sharedAudioContext = new AudioContextClass();
    }
    if (sharedAudioContext.state === "suspended") {
      sharedAudioContext.resume();
    }

    const ctx = sharedAudioContext;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // 经典 8-bit 方波 (Square Wave)
    osc.type = "square";
    // 快速由 480Hz 跃升至 880Hz (清脆复古 blip 声)
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.025);

    // 振幅快速包络衰减，时长仅 35ms，绝不轰鸣刺耳
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.035);
  } catch {
    // 忽略未交互前的音频策略限制
  }
}

/**
 * 像素立体按键组件 (Pixel 3D Button)
 * 具备 2px 精准像素物理下沉、高光反光边、弹性回弹动效与 8-bit 点击反馈
 */
export class PixelButton extends Phaser.GameObjects.Container {
  private btnWidth: number;
  private btnHeight: number;
  private labelText: string;
  private fontSize: number;
  private variant: PixelButtonVariant;
  private isDisabled: boolean;
  private enableSound: boolean;
  private enableHaptic: boolean;
  private onPressCallback?: () => void;

  private shadowGraphics: Phaser.GameObjects.Graphics;
  private bodyContainer: Phaser.GameObjects.Container;
  private bodyGraphics: Phaser.GameObjects.Graphics;
  private textObject: Phaser.GameObjects.Text;
  private isPressed = false;

  constructor(scene: Phaser.Scene, options: PixelButtonOptions) {
    super(scene, snapToPixel(options.x), snapToPixel(options.y));

    this.btnWidth = Math.max(24, Math.round(options.width ?? 100));
    this.btnHeight = Math.max(20, Math.round(options.height ?? 36));
    this.labelText = options.label;
    this.fontSize = options.fontSize ?? 13;
    this.variant = options.variant ?? "gold";
    this.isDisabled = options.disabled ?? false;
    this.enableSound = options.enableSound ?? true;
    this.enableHaptic = options.enableHaptic ?? true;
    this.onPressCallback = options.onClick ?? options.onPress;

    if (options.depth !== undefined) {
      this.setDepth(options.depth);
    }

    // 1. 底座固定立体暗槽阴影 (Bottom Fixed Shadow)
    this.shadowGraphics = scene.add.graphics();
    this.add(this.shadowGraphics);

    // 2. 可物理平移下沉的按键本体容器 (Sinkable Button Face)
    this.bodyContainer = scene.add.container(0, 0);
    this.add(this.bodyContainer);

    this.bodyGraphics = scene.add.graphics();
    this.bodyContainer.add(this.bodyGraphics);

    this.textObject = scene.add.text(
      snapToPixel(this.btnWidth / 2),
      snapToPixel(this.btnHeight / 2 - 1),
      this.labelText,
      {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: `${this.fontSize}px`,
        fontStyle: "bold",
        color: "#ffffff",
        resolution: GAME_RESOLUTION,
        padding: { x: 2, y: 2 },
      }
    ).setOrigin(0.5, 0.5);
    this.bodyContainer.add(this.textObject);

    this.renderButton();
    this.setupInteraction();

    scene.add.existing(this);
  }

  /**
   * 渲染按钮图形：高光反光边、暗边、底座
   */
  private renderButton(): void {
    this.shadowGraphics.clear();
    this.bodyGraphics.clear();

    const w = this.btnWidth;
    const h = this.btnHeight;
    const scheme = this.isDisabled
      ? {
          base: 0x757575,
          lightHighlight: 0x9e9e9e,
          darkShade: 0x424242,
          shadowBase: 0x212121,
          textColor: 0xcccccc,
        }
      : VARIANT_COLORS[this.variant];

    // --- 绘制固定底座阴影 (厚度 2~3px) ---
    this.shadowGraphics.fillStyle(scheme.shadowBase, 1);
    this.shadowGraphics.fillRect(0, 2, w, h);

    // --- 绘制按键主体表面 ---
    // 基础面
    this.bodyGraphics.fillStyle(scheme.base, 1);
    this.bodyGraphics.fillRect(0, 0, w, h - 2);

    // 顶部与左侧 1~2px 高光反光边 (Highlights)
    this.bodyGraphics.fillStyle(scheme.lightHighlight, 0.95);
    this.bodyGraphics.fillRect(0, 0, w, 2);
    this.bodyGraphics.fillRect(0, 0, 2, h - 2);

    // 底部与右侧暗色立体阴影棱 (Inner Shade)
    this.bodyGraphics.fillStyle(scheme.darkShade, 1);
    this.bodyGraphics.fillRect(w - 2, 2, 2, h - 4);
    this.bodyGraphics.fillRect(0, h - 4, w, 2);

    // 文字颜色更新
    this.textObject.setColor(toColorString(scheme.textColor));
  }

  /**
   * 绑定 Pointer 交互、2px 下沉、8-bit 音效与点击回弹
   */
  private setupInteraction(): void {
    if (this.isDisabled) {
      this.bodyContainer.removeInteractive();
      return;
    }

    const hitArea = new Phaser.Geom.Rectangle(0, 0, this.btnWidth, this.btnHeight);
    this.bodyContainer.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    if (this.bodyContainer.input) {
      this.bodyContainer.input.cursor = "pointer";
    }

    this.bodyContainer.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (this.isDisabled) return;
      this.isPressed = true;

      // 1. 物理按压下沉 2px
      this.bodyContainer.setY(2);

      // 2. 8-bit 点击反馈音效
      if (this.enableSound) {
        play8BitClickSound();
      }

      // 3. 触觉振动反馈 (手机端 12ms 短促微震)
      if (this.enableHaptic && typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(12);
        } catch {
          // 忽略非交互权限
        }
      }
    });

    this.bodyContainer.on(Phaser.Input.Events.POINTER_UP, () => {
      if (this.isDisabled) return;
      if (this.isPressed) {
        this.isPressed = false;
        // 回弹动效 (Elastic Back.Out Bounce)
        this.scene.tweens.add({
          targets: this.bodyContainer,
          y: 0,
          duration: 120,
          ease: Phaser.Math.Easing.Back.Out,
          onComplete: () => {
            if (this.onPressCallback) {
              this.onPressCallback();
            }
          },
        });
      }
    });

    this.bodyContainer.on(Phaser.Input.Events.POINTER_OUT, () => {
      if (this.isPressed) {
        this.isPressed = false;
        this.bodyContainer.setY(0);
      }
    });

    this.bodyContainer.on(Phaser.Input.Events.POINTER_OVER, () => {
      if (this.isDisabled) return;
      // 悬停轻微光晕微动
      this.scene.tweens.add({
        targets: this.bodyContainer,
        scaleX: 1.015,
        scaleY: 1.015,
        duration: 80,
        yoyo: true,
      });
    });
  }

  public setDisabled(disabled: boolean): this {
    if (this.isDisabled === disabled) return this;
    this.isDisabled = disabled;
    this.isPressed = false;
    this.bodyContainer.setY(0);
    this.renderButton();
    this.setupInteraction();
    return this;
  }

  public setLabel(label: string): this {
    this.labelText = label;
    this.textObject.setText(label);
    return this;
  }

  public setVariant(variant: PixelButtonVariant): this {
    this.variant = variant;
    this.renderButton();
    return this;
  }

  public override destroy(fromScene?: boolean): void {
    this.bodyContainer.removeAllListeners();
    super.destroy(fromScene);
  }
}

/**
 * 便捷工厂函数：创建立体像素按钮
 */
export function createPixelButton(scene: Phaser.Scene, options: PixelButtonOptions): PixelButton {
  return new PixelButton(scene, options);
}
