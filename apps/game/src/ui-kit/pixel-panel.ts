import Phaser from "phaser";
import { pixelPalette, toColorString } from "./pixel-palette";
import { DEFAULT_FONT_FAMILY, GAME_RESOLUTION } from "../ui/game-text";

export type PanelTheme = "parchment" | "wood" | "dark" | "brass";

export interface PixelPanelOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string;
  subtitle?: string;
  theme?: PanelTheme;
  fillColor?: number;
  woodDarkColor?: number;
  woodLightColor?: number;
  goldColor?: number;
  goldHighlightColor?: number;
  borderWidth?: number;
  showCorners?: boolean;
  innerBorder?: boolean;
  depth?: number;
}

/**
 * 复古像素九宫格/多重木纹与黄铜角花面板
 * 完全由 Phaser Canvas Graphics 原生像素图元精细刻画，杜绝任何外部贴图依赖与 DOM 污染
 */
export class PixelPanel extends Phaser.GameObjects.Container {
  private panelWidth: number;
  private panelHeight: number;
  private theme: PanelTheme;
  private fillColor: number;
  private woodDarkColor: number;
  private woodLightColor: number;
  private goldColor: number;
  private goldHighlightColor: number;
  private borderWidth: number;
  private showCorners: boolean;
  private innerBorder: boolean;

  private graphics: Phaser.GameObjects.Graphics;
  private titleText?: Phaser.GameObjects.Text;
  private subtitleText?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, options: PixelPanelOptions) {
    super(scene, options.x, options.y);

    this.panelWidth = Math.max(32, Math.round(options.width));
    this.panelHeight = Math.max(32, Math.round(options.height));
    this.theme = options.theme ?? "parchment";

    // 根据主题配置默认颜色
    if (this.theme === "wood") {
      this.fillColor = options.fillColor ?? pixelPalette.walnutMedium;
      this.woodDarkColor = options.woodDarkColor ?? pixelPalette.walnutDeep;
      this.woodLightColor = options.woodLightColor ?? pixelPalette.walnutHighlight;
    } else if (this.theme === "dark") {
      this.fillColor = options.fillColor ?? 0x1e150f;
      this.woodDarkColor = options.woodDarkColor ?? pixelPalette.walnutDeep;
      this.woodLightColor = options.woodLightColor ?? pixelPalette.woodFrameLight;
    } else if (this.theme === "brass") {
      this.fillColor = options.fillColor ?? 0x2d2118;
      this.woodDarkColor = options.woodDarkColor ?? pixelPalette.goldShadow;
      this.woodLightColor = options.woodLightColor ?? pixelPalette.brassGold;
    } else {
      // 默认 parchment (羊皮纸白)
      this.fillColor = options.fillColor ?? pixelPalette.parchmentLight;
      this.woodDarkColor = options.woodDarkColor ?? pixelPalette.woodFrameDark;
      this.woodLightColor = options.woodLightColor ?? pixelPalette.woodFrameLight;
    }

    this.goldColor = options.goldColor ?? pixelPalette.goldAccent;
    this.goldHighlightColor = options.goldHighlightColor ?? pixelPalette.goldHighlight;
    this.borderWidth = options.borderWidth ?? 5;
    this.showCorners = options.showCorners ?? true;
    this.innerBorder = options.innerBorder ?? true;

    if (options.depth !== undefined) {
      this.setDepth(options.depth);
    }

    this.graphics = scene.add.graphics();
    this.add(this.graphics);

    this.redraw();

    if (options.title) {
      this.setTitle(options.title, options.subtitle);
    }

    scene.add.existing(this);
  }

  /**
   * 重绘九宫格像素木纹与黄铜金边角花
   */
  public redraw(): void {
    this.graphics.clear();

    const w = this.panelWidth;
    const h = this.panelHeight;
    const bw = this.borderWidth;

    // 1. 最外层深胡桃木像素底框 (Outer Dark Walnut Frame)
    this.graphics.fillStyle(this.woodDarkColor, 1);
    this.graphics.fillRect(0, 0, w, h);

    // 2. 双重像素立体高光棱（顶边与左边浅木纹高光棱）
    this.graphics.fillStyle(this.woodLightColor, 1);
    this.graphics.fillRect(1, 1, w - 2, 2);
    this.graphics.fillRect(1, 1, 2, h - 2);

    // 右边与底边深凹槽像素阴影
    this.graphics.fillStyle(pixelPalette.innerShadow, 0.55);
    this.graphics.fillRect(w - 2, 1, 2, h - 1);
    this.graphics.fillRect(1, h - 2, w - 1, 2);

    // 3. 面板内芯纸面/内幕铺底 (Core Area)
    const coreX = bw;
    const coreY = bw;
    const coreW = w - bw * 2;
    const coreH = h - bw * 2;

    this.graphics.fillStyle(this.fillColor, 1);
    this.graphics.fillRect(coreX, coreY, coreW, coreH);

    // 4. 复古微暗渐变边/内凹槽
    if (this.theme === "parchment") {
      this.graphics.fillStyle(pixelPalette.parchmentDark, 0.65);
      this.graphics.fillRect(coreX, coreY, coreW, 2);
      this.graphics.fillRect(coreX, coreY, 2, coreH);
      this.graphics.fillStyle(pixelPalette.cardBorder, 0.35);
      this.graphics.fillRect(coreX + coreW - 2, coreY, 2, coreH);
      this.graphics.fillRect(coreX, coreY + coreH - 2, coreW, 2);
    } else {
      this.graphics.fillStyle(pixelPalette.innerShadow, 0.4);
      this.graphics.fillRect(coreX, coreY, coreW, 2);
      this.graphics.fillRect(coreX, coreY, 2, coreH);
      this.graphics.fillStyle(this.woodLightColor, 0.2);
      this.graphics.fillRect(coreX + coreW - 2, coreY, 2, coreH);
      this.graphics.fillRect(coreX, coreY + coreH - 2, coreW, 2);
    }

    // 5. 内衬精致金/细线 (Inner Trim Line)
    if (this.innerBorder && coreW > 16 && coreH > 16) {
      const pad = 4;
      const ix = coreX + pad;
      const iy = coreY + pad;
      const iw = coreW - pad * 2;
      const ih = coreH - pad * 2;

      const trimColor = this.theme === "parchment" ? pixelPalette.cardBorder : pixelPalette.brassGold;
      this.graphics.lineStyle(1, trimColor, 0.85);
      this.graphics.strokeRect(ix, iy, iw, ih);
    }

    // 6. 黄铜像素阶梯角花 (Brass Corner Ornaments)
    if (this.showCorners && coreW > 24 && coreH > 24) {
      this.drawBrassCornerOrnaments(coreX, coreY, coreW, coreH);
    }
  }

  /**
   * 绘制四角复古阶梯式黄铜角花（带金属螺栓与高光点）
   */
  private drawBrassCornerOrnaments(cx: number, cy: number, cw: number, ch: number): void {
    const gold = this.goldColor;
    const goldLight = this.goldHighlightColor;
    const brassDark = pixelPalette.brassGold;

    // 四个拐角定位
    const corners = [
      { x: cx + 1, y: cy + 1, dx: 1, dy: 1 },                 // 左上
      { x: cx + cw - 2, y: cy + 1, dx: -1, dy: 1 },           // 右上
      { x: cx + 1, y: cy + ch - 2, dx: 1, dy: -1 },           // 左下
      { x: cx + cw - 2, y: cy + ch - 2, dx: -1, dy: -1 },     // 右下
    ];

    for (const c of corners) {
      // 1. 底层黄铜阶梯基座 (Brass Base)
      this.graphics.fillStyle(brassDark, 1);
      this.graphics.fillRect(c.x, c.y, 5 * c.dx, 1 * c.dy);
      this.graphics.fillRect(c.x, c.y, 1 * c.dx, 5 * c.dy);

      // 2. 拐角主体琥珀金阶梯
      this.graphics.fillStyle(gold, 1);
      this.graphics.fillRect(c.x, c.y, 4 * c.dx, 1 * c.dy);
      this.graphics.fillRect(c.x, c.y, 1 * c.dx, 4 * c.dy);
      this.graphics.fillRect(c.x + 1 * c.dx, c.y + 1 * c.dy, 2 * c.dx, 1 * c.dy);
      this.graphics.fillRect(c.x + 1 * c.dx, c.y + 1 * c.dy, 1 * c.dx, 2 * c.dy);

      // 3. 黄铜角花核心高光螺栓点 (Glint Bolt)
      this.graphics.fillStyle(goldLight, 1);
      this.graphics.fillRect(c.x, c.y, 1 * c.dx, 1 * c.dy);
      this.graphics.fillRect(c.x + 2 * c.dx, c.y + 2 * c.dy, 1 * c.dx, 1 * c.dy);
    }
  }

  /**
   * 设置并渲染面板复古标题
   */
  public setTitle(title: string, subtitle?: string): this {
    const titleColorHex = this.theme === "parchment"
      ? toColorString(pixelPalette.charcoalInk)
      : toColorString(pixelPalette.goldHighlight);

    const subtitleColorHex = this.theme === "parchment"
      ? toColorString(pixelPalette.bodyMuted)
      : toColorString(pixelPalette.parchmentWarm);

    if (!this.titleText) {
      this.titleText = this.scene.add.text(this.panelWidth / 2, 14, title, {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "14px",
        fontStyle: "bold",
        color: titleColorHex,
        stroke: this.theme === "parchment" ? undefined : "#111111",
        strokeThickness: this.theme === "parchment" ? 0 : 2,
        resolution: GAME_RESOLUTION,
      }).setOrigin(0.5, 0.5);
      this.add(this.titleText);
    } else {
      this.titleText.setText(title);
      this.titleText.setColor(titleColorHex);
    }

    if (subtitle) {
      if (!this.subtitleText) {
        this.subtitleText = this.scene.add.text(this.panelWidth / 2, 28, subtitle, {
          fontFamily: DEFAULT_FONT_FAMILY,
          fontSize: "10px",
          color: subtitleColorHex,
          stroke: this.theme === "parchment" ? undefined : "#111111",
          strokeThickness: this.theme === "parchment" ? 0 : 1,
          resolution: GAME_RESOLUTION,
        }).setOrigin(0.5, 0.5);
        this.add(this.subtitleText);
      } else {
        this.subtitleText.setText(subtitle);
        this.subtitleText.setColor(subtitleColorHex);
      }
    } else if (this.subtitleText) {
      this.subtitleText.destroy();
      this.subtitleText = undefined;
    }

    return this;
  }

  /**
   * 动态调整面板尺寸
   */
  public resize(width: number, height: number): this {
    this.panelWidth = Math.max(32, Math.round(width));
    this.panelHeight = Math.max(32, Math.round(height));
    this.redraw();
    if (this.titleText) {
      this.titleText.setX(this.panelWidth / 2);
    }
    if (this.subtitleText) {
      this.subtitleText.setX(this.panelWidth / 2);
    }
    return this;
  }

  public getWidth(): number {
    return this.panelWidth;
  }

  public getHeight(): number {
    return this.panelHeight;
  }
}

/**
 * 便捷工厂函数：创建复古像素面板
 */
export function createPixelPanel(scene: Phaser.Scene, options: PixelPanelOptions): PixelPanel {
  return new PixelPanel(scene, options);
}
