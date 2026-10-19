import Phaser from "phaser";
import {
  pixelPalette,
  toColorString,
  getHealthColor,
  WALNUT_PALETTE,
  IMPERIAL_GOLD_PALETTE,
  PARCHMENT_PALETTE,
  BRONZE_GREEN_PALETTE,
  CRIMSON_PALETTE,
  AZURE_CYAN_PALETTE,
} from "./pixel-palette";
import { PixelPanel, type PanelTheme } from "./pixel-panel";
import { PixelButton, createPixelButton, type PixelButtonVariant } from "./pixel-button";
import { DEFAULT_FONT_FAMILY, GAME_RESOLUTION, snapToPixel } from "../ui/game-text";

// ============================================================================
// 1. 纯代码 Web Audio 8-bit 复古像素音效合成器 (零外部音频文件加载)
// ============================================================================

let sharedHelperAudioCtx: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!sharedHelperAudioCtx) {
      sharedHelperAudioCtx = new AudioContextClass();
    }
    if (sharedHelperAudioCtx.state === "suspended") {
      sharedHelperAudioCtx.resume();
    }
    return sharedHelperAudioCtx;
  } catch {
    return null;
  }
}

/** 播放 8-bit 导航 Tab 切换清脆音效 (双音阶快速琶音) */
export function play8BitTabSound(): void {
  const ctx = getSharedAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.setValueAtTime(680, now + 0.02);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  } catch {
    // 忽略未交互前的音频策略限制
  }
}

/** 播放 8-bit 老物件/珍藏品闪光悬浮音效 (清脆泛音) */
export function play8BitChimeSound(): void {
  const ctx = getSharedAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.06);

    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch {
    // 忽略
  }
}

/** 播放 8-bit 卡片展开/折叠伸缩音效 */
export function play8BitToggleSound(expanding: boolean): void {
  const ctx = getSharedAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    if (expanding) {
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.04);
    } else {
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.04);
    }

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  } catch {
    // 忽略
  }
}

// ============================================================================
// 2. 【像素人物关系卡片 (PixelRelationCard)】
//    支持木质双重边框、黄铜角花、好感度像素彩色进度槽、头像金框与四个展开操作按钮
// ============================================================================

export interface PixelRelationCardOptions {
  x: number;
  y: number;
  width?: number;
  name: string;
  relation: string;
  intimacy: number; // 0 ~ 100
  maxIntimacy?: number;
  statusText?: string;
  avatarText?: string;
  expandable?: boolean;
  defaultExpanded?: boolean;
  onChat?: () => void;
  onGift?: () => void;
  onMoney?: () => void;
  onConsult?: () => void;
  disableChat?: boolean;
  disableGift?: boolean;
  disableMoney?: boolean;
  disableConsult?: boolean;
  onToggleExpand?: (expanded: boolean) => void;
  depth?: number;
}

export class PixelRelationCard extends Phaser.GameObjects.Container {
  private cardWidth: number;
  private headerHeight = 74;
  private expandedHeight = 124;
  private currentHeight: number;
  private isCardExpanded = false;
  private expandable: boolean;

  private intimacy: number;
  private maxIntimacy: number;

  private bgGraphics: Phaser.GameObjects.Graphics;
  private intimacyBarGraphics: Phaser.GameObjects.Graphics;
  private intimacyText: Phaser.GameObjects.Text;
  private statusTextObj: Phaser.GameObjects.Text;
  private arrowText?: Phaser.GameObjects.Text;

  private actionContainer: Phaser.GameObjects.Container;
  private chatBtn?: PixelButton;
  private giftBtn?: PixelButton;
  private moneyBtn?: PixelButton;
  private consultBtn?: PixelButton;

  private onToggleExpandCallback?: (expanded: boolean) => void;

  constructor(scene: Phaser.Scene, options: PixelRelationCardOptions) {
    super(scene, snapToPixel(options.x), snapToPixel(options.y));

    this.cardWidth = Math.max(260, Math.round(options.width ?? 350));
    this.expandable = options.expandable ?? true;
    this.isCardExpanded = this.expandable && (options.defaultExpanded ?? false);
    this.currentHeight = this.isCardExpanded ? this.expandedHeight : this.headerHeight;

    this.intimacy = Math.max(0, Math.min(100, options.intimacy));
    this.maxIntimacy = options.maxIntimacy ?? 100;
    this.onToggleExpandCallback = options.onToggleExpand;

    if (options.depth !== undefined) {
      this.setDepth(options.depth);
    }

    // 1. 底座背景与边框画布
    this.bgGraphics = scene.add.graphics();
    this.add(this.bgGraphics);

    // 2. 左侧头像金框
    const avatarBox = scene.add.container(12, 12);
    this.add(avatarBox);

    const avatarGfx = scene.add.graphics();
    avatarBox.add(avatarGfx);

    // 金框外层暗金阴影与外边
    avatarGfx.fillStyle(IMPERIAL_GOLD_PALETTE.shadow, 1);
    avatarGfx.fillRect(0, 0, 48, 48);
    avatarGfx.fillStyle(IMPERIAL_GOLD_PALETTE.brass, 1);
    avatarGfx.fillRect(2, 2, 44, 44);
    avatarGfx.fillStyle(IMPERIAL_GOLD_PALETTE.accent, 1);
    avatarGfx.fillRect(3, 3, 42, 42);
    avatarGfx.fillStyle(IMPERIAL_GOLD_PALETTE.highlight, 1);
    avatarGfx.fillRect(3, 3, 42, 2);
    avatarGfx.fillRect(3, 3, 2, 42);

    // 头像内底羊皮暖色
    avatarGfx.fillStyle(PARCHMENT_PALETTE.warm, 1);
    avatarGfx.fillRect(5, 5, 38, 38);

    // 头像文字/Emoji
    const avatarEmoji = options.avatarText ?? options.name.slice(0, 1);
    const avatarTextObj = scene.add.text(24, 24, avatarEmoji, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: avatarEmoji.length === 1 && !/[\u4e00-\u9fa5]/.test(avatarEmoji) ? "22px" : "18px",
      fontStyle: "bold",
      color: toColorString(pixelPalette.charcoalInk),
      resolution: GAME_RESOLUTION,
      padding: { x: 2, y: 2 },
    }).setOrigin(0.5, 0.5);
    avatarBox.add(avatarTextObj);

    // 3. 中上部人物姓名与关系
    const nameText = scene.add.text(68, 14, options.name, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "15px",
      fontStyle: "bold",
      color: toColorString(pixelPalette.charcoalInk),
      resolution: GAME_RESOLUTION,
      padding: { x: 2, y: 2 },
    }).setOrigin(0, 0);
    this.add(nameText);

    // 关系徽章 (微型像素纸质标签)
    const relationBox = scene.add.container(68 + options.name.length * 16 + 6, 15);
    this.add(relationBox);

    const relGfx = scene.add.graphics();
    relationBox.add(relGfx);
    const relTagWidth = Math.max(34, options.relation.length * 12 + 10);
    relGfx.fillStyle(WALNUT_PALETTE.light, 1);
    relGfx.fillRect(0, 0, relTagWidth, 16);
    relGfx.fillStyle(PARCHMENT_PALETTE.light, 1);
    relGfx.fillRect(1, 1, relTagWidth - 2, 14);

    const relText = scene.add.text(snapToPixel(relTagWidth / 2), 8, options.relation, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "10px",
      fontStyle: "bold",
      color: toColorString(WALNUT_PALETTE.dark),
      resolution: GAME_RESOLUTION,
      padding: { x: 2, y: 2 },
    }).setOrigin(0.5, 0.5);
    relationBox.add(relText);

    // 右侧状态心声
    this.statusTextObj = scene.add.text(snapToPixel(this.cardWidth - 28), 16, options.statusText ?? "关系稳定", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "11px",
      color: toColorString(pixelPalette.bodyMuted),
      resolution: GAME_RESOLUTION,
      padding: { x: 2, y: 2 },
    }).setOrigin(1, 0);
    this.add(this.statusTextObj);

    // 4. 好感度彩色像素进度槽
    this.intimacyBarGraphics = scene.add.graphics();
    this.add(this.intimacyBarGraphics);

    this.intimacyText = scene.add.text(68, 52, `好感度 ${this.intimacy}/${this.maxIntimacy}`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "10px",
      fontStyle: "bold",
      color: toColorString(pixelPalette.bodyMuted),
      resolution: GAME_RESOLUTION,
      padding: { x: 2, y: 2 },
    }).setOrigin(0, 0.5);
    this.add(this.intimacyText);

    // 5. 右上展开箭头指示
    if (this.expandable) {
      this.arrowText = scene.add.text(snapToPixel(this.cardWidth - 14), 18, this.isCardExpanded ? "▲" : "▼", {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "11px",
        fontStyle: "bold",
        color: toColorString(pixelPalette.brassGold),
        resolution: GAME_RESOLUTION,
        padding: { x: 2, y: 2 },
      }).setOrigin(0.5, 0.5);
      this.add(this.arrowText);
    }

    // 6. 展开操作按钮栏 (四个立体 PixelButton)
    this.actionContainer = scene.add.container(0, this.headerHeight - 2);
    this.add(this.actionContainer);
    this.actionContainer.setVisible(this.isCardExpanded);

    this.createActionButtons(options);

    // 绘制主背景与好感度槽
    this.renderCard();

    // 绑定展开/收起点击交互
    if (this.expandable) {
      const headerHitArea = new Phaser.Geom.Rectangle(0, 0, this.cardWidth, this.headerHeight);
      this.setInteractive(headerHitArea, Phaser.Geom.Rectangle.Contains);
      if (this.input) {
        this.input.cursor = "pointer";
      }

      this.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
        // 如果点击是在操作按钮区，不触发头部折叠
        if (pointer.y - this.y > this.headerHeight && this.isCardExpanded) {
          return;
        }
        this.toggleExpand();
      });
    }

    scene.add.existing(this);
  }

  private createActionButtons(options: PixelRelationCardOptions): void {
    const btnW = Math.floor((this.cardWidth - 24 - 18) / 4);
    const btnH = 28;
    const startX = 12;
    const posY = 10;

    // 1. 谈心 (Chat) - 胡桃木质感
    this.chatBtn = createPixelButton(this.scene, {
      x: startX,
      y: posY,
      width: btnW,
      height: btnH,
      label: "谈心",
      fontSize: 11,
      variant: "wood",
      disabled: options.disableChat ?? false,
      onClick: () => {
        if (options.onChat) options.onChat();
      },
    });
    this.actionContainer.add(this.chatBtn);

    // 2. 送礼 (Gift) - 金色贵重质感
    this.giftBtn = createPixelButton(this.scene, {
      x: startX + btnW + 6,
      y: posY,
      width: btnW,
      height: btnH,
      label: "送礼",
      fontSize: 11,
      variant: "gold",
      disabled: options.disableGift ?? false,
      onClick: () => {
        if (options.onGift) options.onGift();
      },
    });
    this.actionContainer.add(this.giftBtn);

    // 3. 零花 (Money) - 翠绿收获质感
    this.moneyBtn = createPixelButton(this.scene, {
      x: startX + (btnW + 6) * 2,
      y: posY,
      width: btnW,
      height: btnH,
      label: "零花",
      fontSize: 11,
      variant: "success",
      disabled: options.disableMoney ?? false,
      onClick: () => {
        if (options.onMoney) options.onMoney();
      },
    });
    this.actionContainer.add(this.moneyBtn);

    // 4. 请教 (Consult) - 天青学业智力质感
    this.consultBtn = createPixelButton(this.scene, {
      x: startX + (btnW + 6) * 3,
      y: posY,
      width: btnW,
      height: btnH,
      label: "请教",
      fontSize: 11,
      variant: "cyan",
      disabled: options.disableConsult ?? false,
      onClick: () => {
        if (options.onConsult) options.onConsult();
      },
    });
    this.actionContainer.add(this.consultBtn);
  }

  /**
   * 绘制卡片双重木纹底座、黄铜角花与好感度槽
   */
  public renderCard(): void {
    const w = this.cardWidth;
    const h = this.currentHeight;
    this.bgGraphics.clear();

    // 1. 最外层深胡桃木底框
    this.bgGraphics.fillStyle(WALNUT_PALETTE.dark, 1);
    this.bgGraphics.fillRect(0, 0, w, h);

    // 2. 浅胡桃木高光棱边
    this.bgGraphics.fillStyle(WALNUT_PALETTE.light, 1);
    this.bgGraphics.fillRect(1, 1, w - 2, 2);
    this.bgGraphics.fillRect(1, 1, 2, h - 2);

    // 右/底凹槽微暗阴影
    this.bgGraphics.fillStyle(WALNUT_PALETTE.deep, 0.7);
    this.bgGraphics.fillRect(w - 2, 1, 2, h - 1);
    this.bgGraphics.fillRect(1, h - 2, w - 1, 2);

    // 3. 羊皮纸纸面内芯
    const coreX = 4;
    const coreY = 4;
    const coreW = w - 8;
    const coreH = h - 8;
    this.bgGraphics.fillStyle(PARCHMENT_PALETTE.light, 1);
    this.bgGraphics.fillRect(coreX, coreY, coreW, coreH);

    // 4. 内衬线 (复古米棕)
    this.bgGraphics.lineStyle(1, PARCHMENT_PALETTE.border, 0.65);
    this.bgGraphics.strokeRect(coreX + 2, coreY + 2, coreW - 4, coreH - 4);

    // 5. 展开分隔线
    if (this.isCardExpanded) {
      this.bgGraphics.fillStyle(PARCHMENT_PALETTE.border, 0.45);
      this.bgGraphics.fillRect(coreX + 6, this.headerHeight - 2, coreW - 12, 1);
    }

    // 6. 黄铜角花 (四个微型阶梯金角)
    this.drawCornerBrass(coreX, coreY, coreW, coreH);

    // 7. 渲染好感度像素槽
    this.renderIntimacyBar();
  }

  private drawCornerBrass(cx: number, cy: number, cw: number, ch: number): void {
    const gold = IMPERIAL_GOLD_PALETTE.accent;
    const light = IMPERIAL_GOLD_PALETTE.highlight;
    const brass = IMPERIAL_GOLD_PALETTE.brass;

    const corners = [
      { x: cx + 1, y: cy + 1, dx: 1, dy: 1 },
      { x: cx + cw - 2, y: cy + 1, dx: -1, dy: 1 },
      { x: cx + 1, y: cy + ch - 2, dx: 1, dy: -1 },
      { x: cx + cw - 2, y: cy + ch - 2, dx: -1, dy: -1 },
    ];

    for (const c of corners) {
      this.bgGraphics.fillStyle(brass, 1);
      this.bgGraphics.fillRect(c.x, c.y, 4 * c.dx, 1 * c.dy);
      this.bgGraphics.fillRect(c.x, c.y, 1 * c.dx, 4 * c.dy);

      this.bgGraphics.fillStyle(gold, 1);
      this.bgGraphics.fillRect(c.x, c.y, 3 * c.dx, 1 * c.dy);
      this.bgGraphics.fillRect(c.x, c.y, 1 * c.dx, 3 * c.dy);

      this.bgGraphics.fillStyle(light, 1);
      this.bgGraphics.fillRect(c.x, c.y, 1 * c.dx, 1 * c.dy);
    }
  }

  private renderIntimacyBar(): void {
    this.intimacyBarGraphics.clear();

    const barX = 68;
    const barY = 38;
    const barW = this.cardWidth - barX - (this.expandable ? 32 : 16);
    const barH = 8;

    // 槽底深色凹座
    this.intimacyBarGraphics.fillStyle(WALNUT_PALETTE.deep, 1);
    this.intimacyBarGraphics.fillRect(barX, barY, barW, barH);
    this.intimacyBarGraphics.fillStyle(0x000000, 0.5);
    this.intimacyBarGraphics.fillRect(barX, barY, barW, 1);

    // 彩色好感度填充
    const ratio = Math.max(0, Math.min(1, this.intimacy / this.maxIntimacy));
    const fillW = Math.round(barW * ratio);

    if (fillW > 0) {
      const fillColor = getHealthColor(ratio);
      this.intimacyBarGraphics.fillStyle(fillColor, 1);
      this.intimacyBarGraphics.fillRect(barX, barY, fillW, barH);

      // 上高光棱
      this.intimacyBarGraphics.fillStyle(0xffffff, 0.35);
      this.intimacyBarGraphics.fillRect(barX, barY, fillW, 2);

      // 8-bit 分段像素格栅刻度线 (每 6px 一根细暗线)
      this.intimacyBarGraphics.fillStyle(0x000000, 0.2);
      for (let px = barX + 6; px < barX + fillW; px += 6) {
        this.intimacyBarGraphics.fillRect(px, barY, 1, barH);
      }
    }

    this.intimacyText.setText(`❤ 好感度 ${this.intimacy}/${this.maxIntimacy}`);
  }

  /**
   * 切换展开与折叠状态
   */
  public toggleExpand(forceState?: boolean): this {
    if (!this.expandable) return this;
    const nextState = forceState !== undefined ? forceState : !this.isCardExpanded;
    if (this.isCardExpanded === nextState) return this;

    this.isCardExpanded = nextState;
    play8BitToggleSound(this.isCardExpanded);

    const targetH = this.isCardExpanded ? this.expandedHeight : this.headerHeight;
    this.currentHeight = targetH;

    if (this.arrowText) {
      this.arrowText.setText(this.isCardExpanded ? "▲" : "▼");
    }

    this.actionContainer.setVisible(this.isCardExpanded);
    this.renderCard();

    // 更新 hitArea
    if (this.input) {
      const hitArea = new Phaser.Geom.Rectangle(0, 0, this.cardWidth, this.currentHeight);
      this.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    }

    if (this.onToggleExpandCallback) {
      this.onToggleExpandCallback(this.isCardExpanded);
    }

    return this;
  }

  public setIntimacy(val: number, max?: number): this {
    this.intimacy = Math.max(0, Math.min(100, val));
    if (max !== undefined) {
      this.maxIntimacy = max;
    }
    this.renderIntimacyBar();
    return this;
  }

  public setStatusText(status: string): this {
    this.statusTextObj.setText(status);
    return this;
  }

  public setActionDisabled(
    action: "chat" | "gift" | "money" | "consult",
    disabled: boolean
  ): this {
    switch (action) {
      case "chat":
        this.chatBtn?.setDisabled(disabled);
        break;
      case "gift":
        this.giftBtn?.setDisabled(disabled);
        break;
      case "money":
        this.moneyBtn?.setDisabled(disabled);
        break;
      case "consult":
        this.consultBtn?.setDisabled(disabled);
        break;
    }
    return this;
  }

  public getHeight(): number {
    return this.currentHeight;
  }

  public isExpanded(): boolean {
    return this.isCardExpanded;
  }
}

/** 便捷工厂：创建像素人物关系卡片 */
export function createPixelRelationCard(
  scene: Phaser.Scene,
  options: PixelRelationCardOptions
): PixelRelationCard {
  return new PixelRelationCard(scene, options);
}

// ============================================================================
// 3. 【像素地点活动卡片 (PixelLocationCard)】
//    支持主题色木纹边框、精力消耗像素胶囊、行动 PixelButton
// ============================================================================

export interface PixelLocationCardOptions {
  x: number;
  y: number;
  width?: number;
  height?: number;
  title: string;
  description: string;
  icon?: string;
  energyCost: number;
  rewardBadge?: string;
  actionLabel?: string;
  actionVariant?: PixelButtonVariant;
  disabled?: boolean;
  themeColor?: number;
  onAction?: () => void;
  depth?: number;
}

export class PixelLocationCard extends Phaser.GameObjects.Container {
  private cardWidth: number;
  private cardHeight: number;
  private themeColor: number;
  private energyCost: number;
  private isDisabled: boolean;

  private bgGraphics: Phaser.GameObjects.Graphics;
  private actionBtn: PixelButton;
  private titleTextObj: Phaser.GameObjects.Text;
  private descTextObj: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, options: PixelLocationCardOptions) {
    super(scene, snapToPixel(options.x), snapToPixel(options.y));

    this.cardWidth = Math.max(260, Math.round(options.width ?? 350));
    this.cardHeight = Math.max(64, Math.round(options.height ?? 74));
    this.themeColor = options.themeColor ?? WALNUT_PALETTE.medium;
    this.energyCost = options.energyCost;
    this.isDisabled = options.disabled ?? false;

    if (options.depth !== undefined) {
      this.setDepth(options.depth);
    }

    // 1. 背景与边框
    this.bgGraphics = scene.add.graphics();
    this.add(this.bgGraphics);

    // 2. 左侧图标展示框 (带金属底座)
    const iconContainer = scene.add.container(10, 12);
    this.add(iconContainer);

    const iconGfx = scene.add.graphics();
    iconContainer.add(iconGfx);

    // 图标外框立体阴影
    iconGfx.fillStyle(WALNUT_PALETTE.deep, 1);
    iconGfx.fillRect(0, 0, 48, 48);
    iconGfx.fillStyle(this.themeColor, 1);
    iconGfx.fillRect(2, 2, 44, 44);
    iconGfx.fillStyle(IMPERIAL_GOLD_PALETTE.highlight, 0.8);
    iconGfx.fillRect(2, 2, 44, 2);
    iconGfx.fillRect(2, 2, 2, 44);
    iconGfx.fillStyle(PARCHMENT_PALETTE.warm, 1);
    iconGfx.fillRect(4, 4, 40, 40);

    const iconStr = options.icon ?? "📍";
    const iconText = scene.add.text(24, 24, iconStr, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "22px",
      resolution: GAME_RESOLUTION,
      padding: { x: 2, y: 2 },
    }).setOrigin(0.5, 0.5);
    iconContainer.add(iconText);

    // 3. 中间文本与胶囊
    this.titleTextObj = scene.add.text(66, 12, options.title, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "14px",
      fontStyle: "bold",
      color: toColorString(pixelPalette.charcoalInk),
      resolution: GAME_RESOLUTION,
      padding: { x: 2, y: 2 },
    }).setOrigin(0, 0);
    this.add(this.titleTextObj);

    this.descTextObj = scene.add.text(66, 31, options.description, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "10px",
      color: toColorString(pixelPalette.bodyMuted),
      resolution: GAME_RESOLUTION,
      padding: { x: 2, y: 2 },
    }).setOrigin(0, 0);
    this.add(this.descTextObj);

    // 精力消耗像素胶囊 (Energy Pill)
    const pillContainer = scene.add.container(66, 48);
    this.add(pillContainer);

    const pillGfx = scene.add.graphics();
    pillContainer.add(pillGfx);

    const energyText = `⚡ ${this.energyCost} 精力`;
    const pillW = Math.max(54, energyText.length * 8 + 10);
    pillGfx.fillStyle(0x1e272c, 1);
    pillGfx.fillRect(0, 0, pillW, 16);
    pillGfx.fillStyle(AZURE_CYAN_PALETTE.cyanDark, 1);
    pillGfx.fillRect(1, 1, pillW - 2, 14);

    const pillLabel = scene.add.text(snapToPixel(pillW / 2), 8, energyText, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "9px",
      fontStyle: "bold",
      color: "#ffffff",
      resolution: GAME_RESOLUTION,
      padding: { x: 2, y: 2 },
    }).setOrigin(0.5, 0.5);
    pillContainer.add(pillLabel);

    // 额外收益标签 (若有)
    if (options.rewardBadge) {
      const rewardBox = scene.add.container(66 + pillW + 6, 48);
      this.add(rewardBox);

      const rGfx = scene.add.graphics();
      rewardBox.add(rGfx);
      const rW = Math.max(40, options.rewardBadge.length * 9 + 8);
      rGfx.fillStyle(BRONZE_GREEN_PALETTE.dark, 1);
      rGfx.fillRect(0, 0, rW, 16);
      rGfx.fillStyle(BRONZE_GREEN_PALETTE.jade, 1);
      rGfx.fillRect(1, 1, rW - 2, 14);

      const rLabel = scene.add.text(snapToPixel(rW / 2), 8, options.rewardBadge, {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "9px",
        fontStyle: "bold",
        color: "#ffffff",
        resolution: GAME_RESOLUTION,
        padding: { x: 2, y: 2 },
      }).setOrigin(0.5, 0.5);
      rewardBox.add(rLabel);
    }

    // 4. 右侧行动 PixelButton
    const btnW = 72;
    const btnH = 32;
    const btnX = this.cardWidth - btnW - 12;
    const btnY = snapToPixel((this.cardHeight - btnH) / 2);

    this.actionBtn = createPixelButton(scene, {
      x: btnX,
      y: btnY,
      width: btnW,
      height: btnH,
      label: options.actionLabel ?? "前往",
      fontSize: 12,
      variant: options.actionVariant ?? "primary",
      disabled: this.isDisabled,
      onClick: () => {
        if (!this.isDisabled && options.onAction) {
          options.onAction();
        }
      },
    });
    this.add(this.actionBtn);

    // 绘制卡片
    this.renderCard();

    scene.add.existing(this);
  }

  private renderCard(): void {
    const w = this.cardWidth;
    const h = this.cardHeight;
    this.bgGraphics.clear();

    // 1. 主题色深木外框
    this.bgGraphics.fillStyle(this.themeColor, 1);
    this.bgGraphics.fillRect(0, 0, w, h);

    // 2. 浅色立体反光边
    this.bgGraphics.fillStyle(WALNUT_PALETTE.highlight, 0.8);
    this.bgGraphics.fillRect(1, 1, w - 2, 2);
    this.bgGraphics.fillRect(1, 1, 2, h - 2);

    // 暗部凹槽阴影
    this.bgGraphics.fillStyle(WALNUT_PALETTE.deep, 0.65);
    this.bgGraphics.fillRect(w - 2, 1, 2, h - 1);
    this.bgGraphics.fillRect(1, h - 2, w - 1, 2);

    // 3. 羊皮纸暖白内幕
    const coreX = 4;
    const coreY = 4;
    const coreW = w - 8;
    const coreH = h - 8;
    this.bgGraphics.fillStyle(PARCHMENT_PALETTE.light, 1);
    this.bgGraphics.fillRect(coreX, coreY, coreW, coreH);

    // 4. 纸质卡片内衬线
    this.bgGraphics.lineStyle(1, PARCHMENT_PALETTE.border, 0.5);
    this.bgGraphics.strokeRect(coreX + 2, coreY + 2, coreW - 4, coreH - 4);
  }

  public setDisabled(disabled: boolean, newLabel?: string): this {
    this.isDisabled = disabled;
    this.actionBtn.setDisabled(disabled);
    if (newLabel) {
      this.actionBtn.setLabel(newLabel);
    }
    return this;
  }

  public setActionLabel(label: string): this {
    this.actionBtn.setLabel(label);
    return this;
  }
}

/** 便捷工厂：创建像素地点活动卡片 */
export function createPixelLocationCard(
  scene: Phaser.Scene,
  options: PixelLocationCardOptions
): PixelLocationCard {
  return new PixelLocationCard(scene, options);
}

// ============================================================================
// 4. 【像素老物件珍藏展柜格子 (PixelVintageItemSlot)】
//    带木纹阴影展台底座、金色品质光圈、悬浮提示时代心声回忆
// ============================================================================

export type ItemQuality = "common" | "rare" | "epic" | "legendary";

export interface PixelVintageItemSlotOptions {
  x: number;
  y: number;
  size?: number;
  id?: string;
  name: string;
  icon?: string;
  quality?: ItemQuality;
  count?: number;
  memoirText?: string;
  isUnlocked?: boolean;
  onClick?: () => void;
  depth?: number;
}

export class PixelVintageItemSlot extends Phaser.GameObjects.Container {
  private slotSize: number;
  private quality: ItemQuality;
  private isUnlocked: boolean;
  private itemName: string;
  private memoirText: string;
  private iconStr: string;
  private count: number;

  private baseGraphics: Phaser.GameObjects.Graphics;
  private auraGraphics: Phaser.GameObjects.Graphics;
  private iconTextObj: Phaser.GameObjects.Text;
  private nameTextObj: Phaser.GameObjects.Text;
  private badgeTextObj?: Phaser.GameObjects.Text;

  private auraTween?: Phaser.Tweens.Tween;
  private tooltipBox?: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, options: PixelVintageItemSlotOptions) {
    super(scene, snapToPixel(options.x), snapToPixel(options.y));

    this.slotSize = Math.max(56, Math.round(options.size ?? 72));
    this.quality = options.quality ?? "common";
    this.isUnlocked = options.isUnlocked ?? true;
    this.itemName = options.name;
    this.memoirText = options.memoirText ?? "一件珍贵的时代老物件，沉淀着泛黄的记忆岁月。";
    this.iconStr = options.icon ?? "📻";
    this.count = options.count ?? 1;

    if (options.depth !== undefined) {
      this.setDepth(options.depth);
    }

    // 1. 底座与阴影
    this.baseGraphics = scene.add.graphics();
    this.add(this.baseGraphics);

    // 2. 动态品质光圈层
    this.auraGraphics = scene.add.graphics();
    this.add(this.auraGraphics);

    // 3. 物件图标
    this.iconTextObj = scene.add.text(
      snapToPixel(this.slotSize / 2),
      snapToPixel(this.slotSize / 2 - 4),
      this.isUnlocked ? this.iconStr : "🔒",
      {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "26px",
        resolution: GAME_RESOLUTION,
        padding: { x: 2, y: 2 },
      }
    ).setOrigin(0.5, 0.5);
    this.add(this.iconTextObj);

    // 4. 底部物品简称
    this.nameTextObj = scene.add.text(
      snapToPixel(this.slotSize / 2),
      snapToPixel(this.slotSize - 8),
      this.isUnlocked ? this.itemName.slice(0, 4) : "???",
      {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "10px",
        fontStyle: "bold",
        color: this.isUnlocked ? toColorString(pixelPalette.charcoalInk) : toColorString(pixelPalette.bodyMuted),
        resolution: GAME_RESOLUTION,
        padding: { x: 2, y: 2 },
      }
    ).setOrigin(0.5, 0.5);
    this.add(this.nameTextObj);

    // 5. 右上角数量徽章
    if (this.count > 1 && this.isUnlocked) {
      const badgeBox = scene.add.container(this.slotSize - 6, 6);
      this.add(badgeBox);

      const bGfx = scene.add.graphics();
      badgeBox.add(bGfx);
      bGfx.fillStyle(CRIMSON_PALETTE.crimson, 1);
      bGfx.fillRect(-6, -6, 14, 12);

      this.badgeTextObj = scene.add.text(1, 0, `×${this.count}`, {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "9px",
        fontStyle: "bold",
        color: "#ffffff",
        resolution: GAME_RESOLUTION,
        padding: { x: 2, y: 2 },
      }).setOrigin(0.5, 0.5);
      badgeBox.add(this.badgeTextObj);
    }

    this.renderSlot();
    this.setupInteractivity(options.onClick);

    scene.add.existing(this);
  }

  private renderSlot(): void {
    const s = this.slotSize;
    this.baseGraphics.clear();
    this.auraGraphics.clear();

    // 1. 展台立体梯形暗影基座
    this.baseGraphics.fillStyle(WALNUT_PALETTE.deep, 1);
    this.baseGraphics.fillRect(2, s - 4, s - 4, 4);

    // 2. 实木外展框 (胡桃木)
    this.baseGraphics.fillStyle(WALNUT_PALETTE.dark, 1);
    this.baseGraphics.fillRect(0, 0, s, s - 3);

    // 高光棱边
    this.baseGraphics.fillStyle(WALNUT_PALETTE.light, 1);
    this.baseGraphics.fillRect(1, 1, s - 2, 2);
    this.baseGraphics.fillRect(1, 1, 2, s - 4);

    // 3. 展柜深色内幕 (复古天鹅绒黑)
    const pad = 4;
    this.baseGraphics.fillStyle(this.isUnlocked ? 0x241812 : 0x181512, 1);
    this.baseGraphics.fillRect(pad, pad, s - pad * 2, s - pad * 2 - 2);

    // 4. 品质光圈与角花
    let auraColor = WALNUT_PALETTE.light;
    let hasPulse = false;

    switch (this.quality) {
      case "rare":
        auraColor = AZURE_CYAN_PALETTE.azure;
        break;
      case "epic":
        auraColor = 0x9c27b0;
        hasPulse = true;
        break;
      case "legendary":
        auraColor = IMPERIAL_GOLD_PALETTE.highlight;
        hasPulse = true;
        break;
      case "common":
      default:
        auraColor = IMPERIAL_GOLD_PALETTE.brass;
        break;
    }

    if (this.isUnlocked) {
      this.auraGraphics.lineStyle(1.5, auraColor, 0.9);
      this.auraGraphics.strokeRect(pad + 1, pad + 1, s - pad * 2 - 2, s - pad * 2 - 4);

      // 传说级四角金星芒点
      if (this.quality === "legendary") {
        this.auraGraphics.fillStyle(IMPERIAL_GOLD_PALETTE.glint, 1);
        this.auraGraphics.fillRect(pad + 1, pad + 1, 2, 2);
        this.auraGraphics.fillRect(s - pad - 3, pad + 1, 2, 2);
        this.auraGraphics.fillRect(pad + 1, s - pad - 5, 2, 2);
        this.auraGraphics.fillRect(s - pad - 3, s - pad - 5, 2, 2);
      }

      // 呼吸脉冲动效
      if (hasPulse && !this.auraTween) {
        this.auraTween = this.scene.tweens.add({
          targets: this.auraGraphics,
          alpha: { from: 0.55, to: 1 },
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: Phaser.Math.Easing.Sine.InOut,
        });
      }
    }
  }

  private setupInteractivity(onClick?: () => void): void {
    const hitArea = new Phaser.Geom.Rectangle(0, 0, this.slotSize, this.slotSize);
    this.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    if (this.input) {
      this.input.cursor = "pointer";
    }

    this.on(Phaser.Input.Events.POINTER_OVER, () => {
      play8BitChimeSound();
      this.setScale(1.05);
      this.showMemoir();
    });

    this.on(Phaser.Input.Events.POINTER_OUT, () => {
      this.setScale(1.0);
      this.hideMemoir();
    });

    this.on(Phaser.Input.Events.POINTER_UP, () => {
      if (onClick) onClick();
    });
  }

  /**
   * 弹出时代回忆心声气泡 (悬浮窗自适应屏幕边界)
   */
  public showMemoir(): void {
    if (this.tooltipBox) return;

    const tipW = 200;
    const tipH = 74;
    // 计算世界坐标并判定不超出屏幕左右
    const worldPos = this.getWorldTransformMatrix();
    const wx = worldPos.tx;
    const wy = worldPos.ty;

    let tipX = this.slotSize / 2 - tipW / 2;
    if (wx + tipX < 10) tipX = 10 - wx;
    if (wx + tipX + tipW > 380) tipX = 380 - wx - tipW;

    const tipY = wy > 120 ? -tipH - 8 : this.slotSize + 8;

    this.tooltipBox = this.scene.add.container(tipX, tipY);
    this.add(this.tooltipBox);
    this.tooltipBox.setDepth(99999);

    const tipGfx = this.scene.add.graphics();
    this.tooltipBox.add(tipGfx);

    // 绘制复古像素纸质卡片
    tipGfx.fillStyle(WALNUT_PALETTE.deep, 1);
    tipGfx.fillRect(0, 0, tipW, tipH);
    tipGfx.fillStyle(IMPERIAL_GOLD_PALETTE.brass, 1);
    tipGfx.fillRect(1, 1, tipW - 2, tipH - 2);
    tipGfx.fillStyle(PARCHMENT_PALETTE.light, 1);
    tipGfx.fillRect(2, 2, tipW - 4, tipH - 4);

    // 标题与品质
    const qualityNames: Record<ItemQuality, string> = {
      common: "【普通回忆】",
      rare: "【珍贵老物】",
      epic: "【稀世珍藏】",
      legendary: "【时代传说】",
    };

    const titleStr = `${this.itemName} ${qualityNames[this.quality]}`;
    const tipTitle = this.scene.add.text(8, 6, titleStr, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "11px",
      fontStyle: "bold",
      color: toColorString(WALNUT_PALETTE.dark),
      resolution: GAME_RESOLUTION,
    });
    this.tooltipBox.add(tipTitle);

    // 心声正文 (自动换行)
    const memoirStr = this.isUnlocked ? this.memoirText : "该老物件尚未在岁月中发掘……";
    const tipBody = this.scene.add.text(8, 22, memoirStr, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "9px",
      color: toColorString(pixelPalette.bodyMuted),
      wordWrap: { width: tipW - 16 },
      resolution: GAME_RESOLUTION,
    });
    this.tooltipBox.add(tipBody);

    // 弹出动画
    this.tooltipBox.setAlpha(0);
    this.scene.tweens.add({
      targets: this.tooltipBox,
      alpha: 1,
      duration: 140,
    });
  }

  public hideMemoir(): void {
    if (!this.tooltipBox) return;
    const box = this.tooltipBox;
    this.tooltipBox = undefined;
    this.scene.tweens.add({
      targets: box,
      alpha: 0,
      duration: 100,
      onComplete: () => {
        box.destroy();
      },
    });
  }

  public unlock(unlocked: boolean): this {
    this.isUnlocked = unlocked;
    this.iconTextObj.setText(this.isUnlocked ? this.iconStr : "🔒");
    this.nameTextObj.setText(this.isUnlocked ? this.itemName.slice(0, 4) : "???");
    this.renderSlot();
    return this;
  }

  public override destroy(fromScene?: boolean): void {
    if (this.auraTween) {
      this.auraTween.stop();
      this.auraTween = undefined;
    }
    if (this.tooltipBox) {
      this.tooltipBox.destroy();
      this.tooltipBox = undefined;
    }
    super.destroy(fromScene);
  }
}

/** 便捷工厂：创建像素老物件珍藏展柜格子 */
export function createPixelVintageItemSlot(
  scene: Phaser.Scene,
  options: PixelVintageItemSlotOptions
): PixelVintageItemSlot {
  return new PixelVintageItemSlot(scene, options);
}

// ============================================================================
// 5. 【像素导航栏与主按钮 (createPixelActionButton & createPixelNavBar)】
// ============================================================================

export interface PixelActionButtonOptions {
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  icon?: string;
  badge?: string | number;
  variant?: PixelButtonVariant;
  pulsing?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  depth?: number;
}

/**
 * 快捷创建核心主行动按钮 (带呼吸脉冲、红点通知角标与 8-bit 下沉手感)
 */
export function createPixelActionButton(
  scene: Phaser.Scene,
  options: PixelActionButtonOptions
): PixelButton {
  const fullLabel = options.icon ? `${options.icon} ${options.label}` : options.label;

  const btn = createPixelButton(scene, {
    x: snapToPixel(options.x),
    y: snapToPixel(options.y),
    width: options.width ?? 180,
    height: options.height ?? 42,
    label: fullLabel,
    fontSize: 14,
    variant: options.variant ?? "gold",
    disabled: options.disabled,
    onClick: options.onClick,
    depth: options.depth,
  });

  // 金色高光呼吸脉冲动效
  if (options.pulsing && !options.disabled) {
    scene.tweens.add({
      targets: btn,
      scaleX: 1.025,
      scaleY: 1.025,
      duration: 750,
      yoyo: true,
      repeat: -1,
      ease: Phaser.Math.Easing.Sine.InOut,
    });
  }

  // 右上角红点/徽章
  if (options.badge !== undefined && options.badge !== "") {
    const badgeStr = String(options.badge);
    const badgeW = Math.max(14, badgeStr.length * 8 + 6);
    const badgeH = 14;
    const badgeContainer = scene.add.container(
      snapToPixel((options.width ?? 180) - badgeW / 2 + 2),
      -2
    );
    btn.add(badgeContainer);

    const bGfx = scene.add.graphics();
    badgeContainer.add(bGfx);
    bGfx.fillStyle(CRIMSON_PALETTE.crimson, 1);
    bGfx.fillRect(0, 0, badgeW, badgeH);

    const bText = scene.add.text(snapToPixel(badgeW / 2), snapToPixel(badgeH / 2), badgeStr, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "9px",
      fontStyle: "bold",
      color: "#ffffff",
      resolution: GAME_RESOLUTION,
      padding: { x: 2, y: 2 },
    }).setOrigin(0.5, 0.5);
    badgeContainer.add(bText);
  }

  return btn;
}

export interface PixelNavItem {
  id: string;
  label: string;
  icon?: string;
  badge?: number | string;
}

export interface PixelNavBarOptions {
  x: number;
  y: number;
  width?: number;
  height?: number;
  items: PixelNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  depth?: number;
}

export class PixelNavBar extends Phaser.GameObjects.Container {
  private navWidth: number;
  private navHeight: number;
  private items: PixelNavItem[];
  private activeId: string;
  private onSelectCallback: (id: string) => void;

  private bgGraphics: Phaser.GameObjects.Graphics;
  private itemContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  private indicatorGraphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, options: PixelNavBarOptions) {
    super(scene, snapToPixel(options.x), snapToPixel(options.y));

    this.navWidth = Math.max(200, Math.round(options.width ?? 370));
    this.navHeight = Math.max(36, Math.round(options.height ?? 46));
    this.items = options.items;
    this.activeId = options.activeId;
    this.onSelectCallback = options.onSelect;

    if (options.depth !== undefined) {
      this.setDepth(options.depth);
    }

    // 1. 底座背景画布
    this.bgGraphics = scene.add.graphics();
    this.add(this.bgGraphics);

    // 2. 指示条画布
    this.indicatorGraphics = scene.add.graphics();
    this.add(this.indicatorGraphics);

    // 3. 构建各 Tab 项
    this.buildNavItems();
    this.renderNavBar();

    scene.add.existing(this);
  }

  private buildNavItems(): void {
    const count = this.items.length;
    if (count === 0) return;

    const itemW = Math.floor(this.navWidth / count);

    this.items.forEach((item, index) => {
      const itemX = snapToPixel(index * itemW);
      const container = this.scene.add.container(itemX, 0);
      this.add(container);
      this.itemContainers.set(item.id, container);

      const hitArea = new Phaser.Geom.Rectangle(0, 0, itemW, this.navHeight);
      container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
      if (container.input) {
        container.input.cursor = "pointer";
      }

      container.on(Phaser.Input.Events.POINTER_UP, () => {
        if (this.activeId !== item.id) {
          play8BitTabSound();
          this.setActiveTab(item.id);
          this.onSelectCallback(item.id);
        }
      });
    });
  }

  public renderNavBar(): void {
    const w = this.navWidth;
    const h = this.navHeight;
    const count = this.items.length;
    if (count === 0) return;

    const itemW = Math.floor(w / count);

    // 1. 整体胡桃木长条底座
    this.bgGraphics.clear();
    this.bgGraphics.fillStyle(WALNUT_PALETTE.dark, 1);
    this.bgGraphics.fillRect(0, 0, w, h);

    // 上边沿黄铜金衬线
    this.bgGraphics.fillStyle(IMPERIAL_GOLD_PALETTE.brass, 1);
    this.bgGraphics.fillRect(0, 0, w, 2);

    // 底部深色凹影
    this.bgGraphics.fillStyle(WALNUT_PALETTE.deep, 1);
    this.bgGraphics.fillRect(0, h - 2, w, 2);

    // 2. 绘制每个 Tab 项的视觉状态
    this.indicatorGraphics.clear();

    this.items.forEach((item, index) => {
      const container = this.itemContainers.get(item.id);
      if (!container) return;

      container.removeAll(true);
      const isActive = item.id === this.activeId;
      const tabGfx = this.scene.add.graphics();
      container.add(tabGfx);

      if (isActive) {
        // 激活项：羊皮纸凸起底衬
        tabGfx.fillStyle(PARCHMENT_PALETTE.light, 1);
        tabGfx.fillRect(2, 3, itemW - 4, h - 6);

        // 顶金边与底金光指示条
        tabGfx.fillStyle(IMPERIAL_GOLD_PALETTE.highlight, 1);
        tabGfx.fillRect(2, 3, itemW - 4, 2);
        tabGfx.fillRect(4, h - 5, itemW - 8, 2);
      } else {
        // 非激活项：半透明木底与分割线
        if (index > 0) {
          tabGfx.fillStyle(WALNUT_PALETTE.deep, 0.7);
          tabGfx.fillRect(0, 6, 1, h - 12);
        }
      }

      // 图标与文本
      const labelColor = isActive
        ? toColorString(pixelPalette.charcoalInk)
        : toColorString(PARCHMENT_PALETTE.warm);

      const contentStr = item.icon ? `${item.icon} ${item.label}` : item.label;
      const labelText = this.scene.add.text(snapToPixel(itemW / 2), snapToPixel(h / 2), contentStr, {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: isActive ? "12px" : "11px",
        fontStyle: isActive ? "bold" : "normal",
        color: labelColor,
        resolution: GAME_RESOLUTION,
        padding: { x: 2, y: 2 },
      }).setOrigin(0.5, 0.5);
      container.add(labelText);

      // 角标通知
      if (item.badge !== undefined && item.badge !== "") {
        const bStr = String(item.badge);
        const bW = Math.max(12, bStr.length * 6 + 4);
        const bGfx = this.scene.add.graphics();
        bGfx.fillStyle(CRIMSON_PALETTE.crimson, 1);
        bGfx.fillRect(itemW - bW - 4, 4, bW, 11);
        container.add(bGfx);

        const bText = this.scene.add.text(snapToPixel(itemW - bW / 2 - 4), 9, bStr, {
          fontFamily: DEFAULT_FONT_FAMILY,
          fontSize: "8px",
          fontStyle: "bold",
          color: "#ffffff",
          resolution: GAME_RESOLUTION,
          padding: { x: 2, y: 2 },
        }).setOrigin(0.5, 0.5);
        container.add(bText);
      }
    });
  }

  public setActiveTab(tabId: string): this {
    if (this.activeId === tabId) return this;
    this.activeId = tabId;
    this.renderNavBar();
    return this;
  }

  public setBadge(tabId: string, badge?: string | number): this {
    const item = this.items.find((i) => i.id === tabId);
    if (item) {
      item.badge = badge;
      this.renderNavBar();
    }
    return this;
  }
}

/** 便捷工厂：创建像素导航栏 */
export function createPixelNavBar(
  scene: Phaser.Scene,
  options: PixelNavBarOptions
): PixelNavBar {
  return new PixelNavBar(scene, options);
}

// ============================================================================
// 6. 统一装配套件门面类 (PixelUIHelper)
// ============================================================================

export class PixelUIHelper {
  static createRelationCard = createPixelRelationCard;
  static createLocationCard = createPixelLocationCard;
  static createVintageItemSlot = createPixelVintageItemSlot;
  static createActionButton = createPixelActionButton;
  static createNavBar = createPixelNavBar;
}
