import Phaser from "phaser";
import { pixelPalette, toColorString } from "../ui-kit/pixel-palette";
import { DEFAULT_FONT_FAMILY, GAME_RESOLUTION } from "../ui/game-text";
import { spawnFloatingText } from "../ui-kit/floating-text";
import {
  CharacterAvatarStage,
  type CharacterMood,
  type AgeStageId,
  getStageByAge,
} from "./character-avatar-stage";

/**
 * 角色展台主屏组件配置选项
 */
export interface CharacterStageWidgetOptions {
  x: number;
  y: number;
  width?: number;                  // 组件宽度，默认 362 (适配 390 竖屏主屏，居中两侧留 14px)
  height?: number;                 // 组件高度，默认 256 (黄金展台高度 240~280)
  characterName?: string;          // 角色姓名，默认 "林晨"
  age?: number;                    // 角色初始年龄，默认 6
  identityLabel?: string;          // 自定义身份标签（如 "高三理科生"、"电竞职业选手"）
  mood?: CharacterMood;            // 角色初始表情状态，默认 "calm"
  avatarScale?: number;            // 像素角色立绘缩放比，默认 1.3
  depth?: number;                  // 渲染深度
  interactive?: boolean;           // 是否开启点击微互动，默认 true
  customThoughts?: Partial<Record<AgeStageId, string[]>>; // 自定义心声词库
  onCharacterClick?: (widget: CharacterStageWidget) => void; // 点击角色回调
}

/**
 * 7大人生阶段经典心声台词库 (富有强烈中国时代生活与年代质感)
 */
export const DEFAULT_STAGE_THOUGHTS: Record<AgeStageId, string[]> = {
  infant: [
    "咿呀咿呀~ (咬咬红布虎头鞋)",
    "咯咯咯~ (摇了摇小拨浪鼓)",
    "甜甜的麦乳精真好喝！",
    "要抱抱~ (张开肉乎乎的小手)",
    "裹在软乎乎的棉被里好暖和~",
  ],
  toddler: [
    "看！我的彩色小风车转起来啦！",
    "今天供销社有大白兔奶糖卖吗？",
    "大院里的小伙伴在喊我跳皮筋呢！",
    "爸爸的二八大杠自行车骑得好快！",
    "拧紧铁皮跳跳蛙的发条，看谁跳得远！",
    "摸摸我的红星小挎包，里面装着弹珠！",
  ],
  primary: [
    "时刻准备着，做共产主义接班人！",
    "红领巾是红旗的一角，每天都要佩戴整齐！",
    "今天轮到我做值日大队长，管好三道杠！",
    "吃小浣熊干脆面又拆到一张水浒闪卡！",
    "放学去工人文化宫打街机去不？一币通关！",
    "这双回力球鞋穿去上体育课跑得飞快！",
  ],
  adolescent: [
    "三年的青春与汗水，一定能考上省重点！",
    "这道压轴数理化大题我终于解出来了！",
    "下午自习课，去操场打场篮球透透气？",
    "磁带随身听里正放着《同桌的你》呢~",
    "高考倒计时，全力以赴，绝不轻言放弃！",
    "蓝白校服里写满了同窗好友的毕业签名。",
  ],
  youth: [
    "胜负就在大龙坑这一波团战，看我走位！",
    "我的手速和微操已经拉满了，开战！",
    "热血逐梦，属于我们的金色冠军奖杯！",
    "戴上专业电竞耳机，峡谷就是我的主战场！",
    "年轻就要敢拼敢闯，去争属于我的荣光！",
    "身披战队金线刺绣战袍，此战必胜！",
  ],
  adult: [
    "把这个季度的项目方案做扎实，冲！",
    "身为顶梁柱，工作和家庭都要挑得起担子。",
    "今天又谈成了一笔重要合作，心里格外踏实。",
    "下班去菜场买条新鲜活鱼，给家里做顿好菜。",
    "脚踏实地，生活一天比一天更有奔头了。",
    "西装革履，亦不改年少时的一腔热血。",
  ],
  elder: [
    "清晨在公园打一套太极拳，神清气爽！",
    "手捧老式保温杯，看大院云卷云舒，岁月静好。",
    "孩子们都平安健康有出息，就是最大的福气。",
    "戴上老花镜，翻翻老相册里的青葱岁月。",
    "岁月慢淌，这一生风雨走过，坦荡而从容。",
  ],
};

/**
 * 【像素角色展台主屏组件 (CharacterStageWidget)】
 * 专为 390x844 中文竖屏主屏设计的核心视觉焦点组件。
 * 包含：
 * 1. 复古木纹深色展台底座（带精致像素黄铜角花与柔和舞台背景）；
 * 2. 居中挂载 0~80 岁 7 大人生阶段像素立绘 (CharacterAvatarStage)；
 * 3. 待机轻微呼吸浮动动效、偶发自然眨眼、柔和光圈微弱呼吸脉冲；
 * 4. 随玩家年龄/状态自动切换形象、表情与道具 (setAge / setMood)；
 * 5. 展台下方精致黄铜金边铭牌展示角色姓名、当前年龄与身份标签；
 * 6. 状态变动反馈方法 playStatusReaction (自动发射浮升绿字或下沉红字)；
 * 7. 点击角色微互动（轻微弹性弹跳、头顶年代心声飘字、眨眼互动）。
 */
export class CharacterStageWidget extends Phaser.GameObjects.Container {
  private widgetWidth: number;
  private widgetHeight: number;
  private currentName: string;
  private currentAge: number;
  private currentIdentity: string;
  private currentMood: CharacterMood;
  private avatarScale: number;
  private isInteractiveEnabled: boolean;
  private thoughtsMap: Record<AgeStageId, string[]>;
  private onCharacterClickCallback?: (widget: CharacterStageWidget) => void;

  // 内部图形与渲染节点
  private backgroundGraphics: Phaser.GameObjects.Graphics;
  private spotlightContainer: Phaser.GameObjects.Container;
  private spotlightGraphics: Phaser.GameObjects.Graphics;
  private stagePedestalGraphics: Phaser.GameObjects.Graphics;
  private avatarStage: CharacterAvatarStage;
  private nameplateContainer: Phaser.GameObjects.Container;
  private nameplateGraphics: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private ageStageText: Phaser.GameObjects.Text;
  private identityBadgeText: Phaser.GameObjects.Text;
  private hitZone?: Phaser.GameObjects.Zone;

  // 动画与生命周期句柄
  private spotlightPulseTween?: Phaser.Tweens.Tween;
  private bounceTween?: Phaser.Tweens.Tween;
  private resetMoodTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, options: CharacterStageWidgetOptions) {
    super(scene, options.x, options.y);

    this.widgetWidth = Math.max(280, Math.round(options.width ?? 362));
    this.widgetHeight = Math.max(200, Math.round(options.height ?? 256));
    this.currentName = options.characterName ?? "林晨";
    this.currentAge = Math.max(0, Math.round(options.age ?? 6));
    this.currentIdentity = options.identityLabel ?? this.getDefaultIdentityForAge(this.currentAge);
    this.currentMood = options.mood ?? "calm";
    this.avatarScale = options.avatarScale ?? 1.3;
    this.isInteractiveEnabled = options.interactive ?? true;
    this.onCharacterClickCallback = options.onCharacterClick;

    // 组合心声库
    this.thoughtsMap = {
      ...DEFAULT_STAGE_THOUGHTS,
      ...(options.customThoughts ?? {}),
    };

    if (options.depth !== undefined) {
      this.setDepth(options.depth);
    }

    // 1. 底层复古木框与展台背板
    this.backgroundGraphics = scene.add.graphics();
    this.add(this.backgroundGraphics);

    // 2. 舞台聚光柔和光圈容器 (位于角色背后)
    this.spotlightContainer = scene.add.container(this.widgetWidth / 2, this.widgetHeight - 88);
    this.spotlightGraphics = scene.add.graphics();
    this.spotlightContainer.add(this.spotlightGraphics);
    this.add(this.spotlightContainer);

    // 3. 复古立体木纹大展台地台 (位于角色脚下)
    this.stagePedestalGraphics = scene.add.graphics();
    this.add(this.stagePedestalGraphics);

    // 4. 居中挂载全年龄像素角色立绘展台 (不开启自带地台与自带标签，由本组件统一管理)
    const avatarY = this.widgetHeight - 110;
    this.avatarStage = new CharacterAvatarStage(scene, {
      x: this.widgetWidth / 2,
      y: avatarY,
      age: this.currentAge,
      mood: this.currentMood,
      showPedestal: false,
      showTag: false,
      scale: this.avatarScale,
    });
    this.add(this.avatarStage);

    // 5. 底部角色姓名与身份铭牌容器
    this.nameplateContainer = scene.add.container(this.widgetWidth / 2, this.widgetHeight - 34);
    this.nameplateGraphics = scene.add.graphics();
    this.nameplateContainer.add(this.nameplateGraphics);

    // 角色姓名文本
    this.nameText = scene.add.text(-60, 0, this.currentName, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: toColorString(pixelPalette.goldHighlight),
      stroke: "#1a120b",
      strokeThickness: 2,
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5, 0.5);
    this.nameplateContainer.add(this.nameText);

    // 年龄与阶段文本
    this.ageStageText = scene.add.text(0, 0, "", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "11px",
      fontStyle: "bold",
      color: toColorString(pixelPalette.parchmentLight),
      stroke: "#261910",
      strokeThickness: 2,
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5, 0.5);
    this.nameplateContainer.add(this.ageStageText);

    // 身份标签文本 (如【电竞职业选手】、【高三理科生】)
    this.identityBadgeText = scene.add.text(68, 0, "", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "10px",
      fontStyle: "bold",
      color: toColorString(pixelPalette.pixelCyan),
      stroke: "#111111",
      strokeThickness: 2,
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5, 0.5);
    this.nameplateContainer.add(this.identityBadgeText);

    this.add(this.nameplateContainer);

    // 渲染整体视觉
    this.renderWidget();
    this.startSpotlightPulse();
    this.setupInteractivity();

    scene.add.existing(this);
  }

  // ==========================================
  //  界面与展台绘制渲染器
  // ==========================================

  /**
   * 完整重绘展台底座、光圈、铭牌
   */
  public renderWidget(): void {
    const w = this.widgetWidth;
    const h = this.widgetHeight;
    const centerX = w / 2;
    const stageBaseY = h - 68;

    // 1. 绘制复古展台深木边框与暗光内幕
    this.backgroundGraphics.clear();
    const bg = this.backgroundGraphics;

    // (1) 外框：深胡桃木像素实心底
    bg.fillStyle(pixelPalette.woodFrameDark, 1);
    bg.fillRect(0, 0, w, h);

    // (2) 外框高光棱：顶边与左边浅胡桃木
    bg.fillStyle(pixelPalette.woodFrameLight, 1);
    bg.fillRect(1, 1, w - 2, 2);
    bg.fillRect(1, 1, 2, h - 2);

    // (3) 外框阴影槽：右边与底边
    bg.fillStyle(pixelPalette.innerShadow, 0.6);
    bg.fillRect(w - 2, 1, 2, h - 1);
    bg.fillRect(1, h - 2, w - 1, 2);

    // (4) 展台内幕核心深暗舞台壁面 (突出中央光圈与像素立绘)
    const pad = 5;
    const innerW = w - pad * 2;
    const innerH = h - pad * 2;
    bg.fillStyle(0x231810, 1); // 幽深木质暗光舞台色
    bg.fillRect(pad, pad, innerW, innerH);

    // 内部微弱渐变凹槽阴影
    bg.fillStyle(0x130d09, 0.85);
    bg.fillRect(pad, pad, innerW, 3);
    bg.fillRect(pad, pad, 3, innerH);
    bg.fillStyle(pixelPalette.cardBorder, 0.25);
    bg.fillRect(pad + innerW - 2, pad, 2, innerH);
    bg.fillRect(pad, pad + innerH - 2, innerW, 2);

    // (5) 四角像素黄铜角花
    this.drawCornerOrnaments(pad, pad, innerW, innerH);

    // 2. 绘制展台聚光柔和光圈
    this.renderSpotlight();

    // 3. 绘制立体复古木纹大展台地台
    this.renderStagePedestal(centerX, stageBaseY);

    // 4. 刷新底部铭牌
    this.renderNameplate();
  }

  /**
   * 绘制四角复古阶梯式黄铜角花
   */
  private drawCornerOrnaments(cx: number, cy: number, cw: number, ch: number): void {
    const bg = this.backgroundGraphics;
    const gold = pixelPalette.goldAccent;
    const goldLight = pixelPalette.goldHighlight;
    const brassDark = pixelPalette.brassGold;

    const corners = [
      { x: cx + 1, y: cy + 1, dx: 1, dy: 1 },                 // 左上
      { x: cx + cw - 2, y: cy + 1, dx: -1, dy: 1 },           // 右上
      { x: cx + 1, y: cy + ch - 2, dx: 1, dy: -1 },           // 左下
      { x: cx + cw - 2, y: cy + ch - 2, dx: -1, dy: -1 },     // 右下
    ];

    for (const c of corners) {
      // 1. 黄铜底层
      bg.fillStyle(brassDark, 1);
      bg.fillRect(c.x, c.y, 5 * c.dx, 1 * c.dy);
      bg.fillRect(c.x, c.y, 1 * c.dx, 5 * c.dy);

      // 2. 琥珀金阶梯
      bg.fillStyle(gold, 1);
      bg.fillRect(c.x, c.y, 4 * c.dx, 1 * c.dy);
      bg.fillRect(c.x, c.y, 1 * c.dx, 4 * c.dy);
      bg.fillRect(c.x + 1 * c.dx, c.y + 1 * c.dy, 2 * c.dx, 1 * c.dy);
      bg.fillRect(c.x + 1 * c.dx, c.y + 1 * c.dy, 1 * c.dx, 2 * c.dy);

      // 3. 高光螺栓点
      bg.fillStyle(goldLight, 1);
      bg.fillRect(c.x, c.y, 1 * c.dx, 1 * c.dy);
      bg.fillRect(c.x + 2 * c.dx, c.y + 2 * c.dy, 1 * c.dx, 1 * c.dy);
    }
  }

  /**
   * 绘制舞台聚光柔和光圈 (多层半透明光环效果)
   */
  private renderSpotlight(): void {
    this.spotlightGraphics.clear();
    const g = this.spotlightGraphics;

    const isChampion = this.currentMood === "champion";
    const isFullScore = this.currentMood === "full_score";
    const isSick = this.currentMood === "sick" || this.currentMood === "fever";

    // 基础色阶选择
    let auraColorOuter = pixelPalette.goldHighlight;
    let auraColorMid = pixelPalette.goldAccent;
    let auraColorCore = pixelPalette.parchmentLight;

    if (isSick) {
      auraColorOuter = 0x4fc3f7;
      auraColorMid = 0x0288d1;
      auraColorCore = 0xe1f5fe;
    } else if (isChampion || isFullScore) {
      auraColorOuter = 0xffea00;
      auraColorMid = 0xffb300;
      auraColorCore = 0xffffff;
    }

    // 1. 最外层宏大微弱金晕 (半径 96 x 42)
    g.fillStyle(auraColorOuter, isChampion ? 0.22 : 0.08);
    g.fillEllipse(0, -18, 96, 42);

    // 2. 中层温润光圈 (半径 72 x 32)
    g.fillStyle(auraColorMid, isChampion ? 0.32 : 0.15);
    g.fillEllipse(0, -14, 72, 32);

    // 3. 内层舞台核心聚光 (半径 48 x 22)
    g.fillStyle(auraColorCore, isChampion ? 0.46 : 0.24);
    g.fillEllipse(0, -10, 48, 22);
  }

  /**
   * 绘制宏大立体复古木纹大展台地台
   */
  private renderStagePedestal(cx: number, cy: number): void {
    this.stagePedestalGraphics.clear();
    const g = this.stagePedestalGraphics;

    const rx = 104;
    const ry = 22;

    // 1. 最底层深暗投影
    g.fillStyle(0x0c0805, 0.75);
    g.fillEllipse(cx, cy + 16, rx + 12, ry + 6);

    // 2. 阶梯基座下层 (深木暗阶)
    g.fillStyle(0x321f14, 1);
    g.fillEllipse(cx, cy + 10, rx + 6, ry + 3);

    // 3. 展台立体琥珀金边镶嵌环
    g.fillStyle(pixelPalette.goldAccent, 1);
    g.fillEllipse(cx, cy + 5, rx + 2, ry + 1.5);

    // 金边高光细条 (增强金属质感)
    g.fillStyle(pixelPalette.goldHighlight, 1);
    g.fillEllipse(cx, cy + 3, rx - 4, ry - 0.5);

    // 4. 地台台面 (温润胡桃木纹表面)
    g.fillStyle(0x4e3725, 1);
    g.fillEllipse(cx, cy, rx, ry);

    // 5. 台面中央聚光暖木斑
    g.fillStyle(0x6b4c33, 1);
    g.fillEllipse(cx, cy - 2, rx - 18, ry - 5);

    // 6. 台面核心高光微光
    g.fillStyle(pixelPalette.parchmentLight, 0.12);
    g.fillEllipse(cx, cy - 3, rx - 36, ry - 8);
  }

  /**
   * 绘制并更新底部角色信息铭牌
   */
  private renderNameplate(): void {
    const stage = getStageByAge(this.currentAge);
    const stageName = stage.label.split(" ")[0] ?? stage.label;

    // 重新排列文字
    this.nameText.setText(this.currentName);
    this.ageStageText.setText(`【${this.currentAge}岁 · ${stageName}】`);
    this.identityBadgeText.setText(this.currentIdentity ? `◆ ${this.currentIdentity}` : "");

    // 测量文字宽度以动态自适应居中排版
    const nameWidth = this.nameText.width;
    const ageWidth = this.ageStageText.width;
    const identityWidth = this.identityBadgeText.width;
    const spacing = 12;

    const totalContentWidth = nameWidth + spacing + ageWidth + (this.currentIdentity ? spacing + identityWidth : 0);
    const startX = -totalContentWidth / 2;

    this.nameText.setX(startX + nameWidth / 2);
    this.ageStageText.setX(startX + nameWidth + spacing + ageWidth / 2);
    if (this.currentIdentity) {
      this.identityBadgeText.setX(startX + nameWidth + spacing + ageWidth + spacing + identityWidth / 2);
      this.identityBadgeText.setVisible(true);
    } else {
      this.identityBadgeText.setVisible(false);
    }

    // 绘制铭牌外框
    this.nameplateGraphics.clear();
    const g = this.nameplateGraphics;

    const plateW = Math.min(this.widgetWidth - 40, Math.max(220, totalContentWidth + 32));
    const plateH = 26;
    const px = -plateW / 2;
    const py = -plateH / 2;

    // 铭牌底层深黑炭木
    g.fillStyle(0x19120c, 0.95);
    g.fillRect(px, py, plateW, plateH);

    // 铭牌高光顶边与左边
    g.fillStyle(pixelPalette.woodFrameLight, 1);
    g.fillRect(px, py, plateW, 1);
    g.fillRect(px, py, 1, plateH);

    // 铭牌黄铜金边内衬线
    g.lineStyle(1, pixelPalette.goldAccent, 0.85);
    g.strokeRect(px + 2, py + 2, plateW - 4, plateH - 4);

    // 四角精致金色微点
    g.fillStyle(pixelPalette.goldHighlight, 1);
    g.fillRect(px + 2, py + 2, 2, 2);
    g.fillRect(px + plateW - 4, py + 2, 2, 2);
    g.fillRect(px + 2, py + plateH - 4, 2, 2);
    g.fillRect(px + plateW - 4, py + plateH - 4, 2, 2);
  }

  // ==========================================
  //  动画系统：光圈微弱呼吸脉冲
  // ==========================================

  private startSpotlightPulse(): void {
    if (this.spotlightPulseTween) {
      this.spotlightPulseTween.stop();
      this.spotlightPulseTween.remove();
    }

    // 光圈微弱呼吸脉动，让主屏具有生命力与氛围感
    this.spotlightPulseTween = this.scene.tweens.add({
      targets: this.spotlightContainer,
      scaleX: 1.06,
      scaleY: 1.06,
      alpha: 0.85,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: Phaser.Math.Easing.Sine.InOut,
    });
  }

  // ==========================================
  //  微互动系统 (Micro-Interaction)
  // ==========================================

  private setupInteractivity(): void {
    if (!this.isInteractiveEnabled) return;

    const centerX = this.widgetWidth / 2;
    const centerY = this.widgetHeight - 110;

    // 在角色区域创建交互命中区
    this.hitZone = this.scene.add.zone(centerX, centerY, 130, 150);
    this.hitZone.setInteractive({ useHandCursor: true });
    this.add(this.hitZone);

    this.hitZone.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.triggerClickInteraction();
    });
  }

  /**
   * 触发点击角色微互动：
   * 1. 角色轻微弹性弹跳微动；
   * 2. 头顶弹出富有年代感的心声气泡飘字；
   * 3. 角色眨眼并短暂展示微笑表情；
   * 4. 触发外部回调。
   */
  public triggerClickInteraction(): void {
    // 1. 角色轻微弹性跳跃与缩放回弹
    if (this.bounceTween) {
      this.bounceTween.stop();
      this.bounceTween.remove();
    }

    const originalScale = this.avatarScale;
    this.bounceTween = this.scene.tweens.add({
      targets: this.avatarStage,
      scaleX: originalScale * 1.08,
      scaleY: originalScale * 0.92,
      y: this.widgetHeight - 118,
      duration: 110,
      yoyo: true,
      ease: Phaser.Math.Easing.Back.Out,
      onComplete: () => {
        this.avatarStage.setScale(originalScale);
        this.avatarStage.setY(this.widgetHeight - 110);
      },
    });

    // 2. 触发眨眼
    this.avatarStage.triggerBlink();

    // 3. 短暂切换开心表情 (1.4 秒后恢复)
    const prevMood = this.currentMood;
    if (prevMood !== "happy" && prevMood !== "champion" && prevMood !== "full_score") {
      this.avatarStage.setMood("happy");

      if (this.resetMoodTimer) {
        this.resetMoodTimer.destroy();
      }
      this.resetMoodTimer = this.scene.time.delayedCall(1400, () => {
        this.avatarStage.setMood(prevMood);
      });
    }

    // 4. 头顶弹出年代心声飘字
    this.popupRandomThought();

    // 5. 触发外部交互回调
    this.onCharacterClickCallback?.(this);
  }

  /**
   * 在展台角色头顶弹出随机年代心声
   */
  public popupRandomThought(): void {
    const stage = getStageByAge(this.currentAge);
    const pool = this.thoughtsMap[stage.stageId] ?? DEFAULT_STAGE_THOUGHTS[stage.stageId] ?? DEFAULT_STAGE_THOUGHTS.toddler;
    const thought = Phaser.Utils.Array.GetRandom(pool);

    // 计算头顶在场景中的绝对世界坐标
    const worldX = this.x + this.widgetWidth / 2;
    const worldY = this.y + 44;

    spawnFloatingText(this.scene, {
      x: worldX,
      y: worldY,
      text: thought,
      type: "highlight",
      fontSize: 13,
      duration: 1300,
      distance: 30,
      depth: 99999,
    });
  }

  // ==========================================
  //  状态反馈浮升/下沉飘字方法
  // ==========================================

  /**
   * 播放属性变动即时反馈飘字：
   * @param type "up" (数值增长，绿色上升) 或 "down" (数值减少/负面，红色下沉微震)
   * @param label 属性或状态名称（如 "智力"、"健康"、"专注"、"压力"）
   * @param value 变动数值
   */
  public playStatusReaction(type: "up" | "down", label: string, value: number): void {
    const worldX = this.x + this.widgetWidth / 2;
    const worldY = this.y + (type === "up" ? 48 : 64);
    const absVal = Math.abs(value);

    if (type === "up") {
      const displayText = `${label} +${absVal} ⬆`;
      spawnFloatingText(this.scene, {
        x: worldX,
        y: worldY,
        text: displayText,
        type: "gain",
        fontSize: 16,
        duration: 1100,
        distance: 40,
        depth: 99999,
      });

      // 角色播放欢呼/欢庆动作
      this.avatarStage.playReaction("cheer");
    } else {
      const displayText = `${label} -${absVal} ⬇`;
      spawnFloatingText(this.scene, {
        x: worldX,
        y: worldY,
        text: displayText,
        type: "loss",
        fontSize: 16,
        duration: 1100,
        distance: 35,
        depth: 99999,
      });

      // 角色播放压力/吃力动作
      this.avatarStage.playReaction("strain");
    }
  }

  // ==========================================
  //  外部公开控制 API
  // ==========================================

  /**
   * 设置角色年龄（自动切换人生阶段、服饰立绘与身份标签）
   */
  public setAge(age: number): this {
    const cleanAge = Math.max(0, Math.round(age));
    if (this.currentAge === cleanAge) return this;

    const oldStage = getStageByAge(this.currentAge);
    const newStage = getStageByAge(cleanAge);

    this.currentAge = cleanAge;
    this.avatarStage.setAge(cleanAge);

    // 若未手动锁定自定义身份，则自动跟随年龄段切换生动身份
    if (!this.currentIdentity || this.isDefaultIdentity(this.currentIdentity)) {
      this.currentIdentity = this.getDefaultIdentityForAge(cleanAge);
    }

    // 若跨越了人生大阶段，在展台绽放金色光彩！
    if (oldStage.stageId !== newStage.stageId) {
      this.celebrateStageEvolution();
    }

    this.renderNameplate();
    return this;
  }

  /**
   * 设置角色心情/表情
   */
  public setMood(mood: CharacterMood): this {
    if (this.currentMood === mood) return this;
    this.currentMood = mood;
    this.avatarStage.setMood(mood);
    this.renderSpotlight();
    return this;
  }

  /**
   * 设置角色姓名
   */
  public setCharacterName(name: string): this {
    if (this.currentName === name) return this;
    this.currentName = name;
    this.renderNameplate();
    return this;
  }

  /**
   * 设置角色专属身份标签（如 "高三理科生"、"电竞职业选手"、"青年骨干"）
   */
  public setIdentity(identity: string): this {
    if (this.currentIdentity === identity) return this;
    this.currentIdentity = identity;
    this.renderNameplate();
    return this;
  }

  /**
   * 触发角色特定动作反应 (庆祝、生病、吃力、欢呼)
   */
  public playReaction(reaction: "celebrate" | "sick" | "strain" | "cheer"): void {
    this.avatarStage.playReaction(reaction);
  }

  /**
   * 人生阶段进化微特效
   */
  private celebrateStageEvolution(): void {
    // 光圈微闪烁提亮
    this.scene.tweens.add({
      targets: this.spotlightContainer,
      scaleX: 1.25,
      scaleY: 1.25,
      alpha: 1.0,
      duration: 350,
      yoyo: true,
      ease: Phaser.Math.Easing.Back.Out,
    });

    // 发射升级金字
    const worldX = this.x + this.widgetWidth / 2;
    const worldY = this.y + 42;
    const stage = getStageByAge(this.currentAge);

    spawnFloatingText(this.scene, {
      x: worldX,
      y: worldY,
      text: `★ 步入新篇章：${stage.label} ★`,
      type: "highlight",
      fontSize: 14,
      duration: 1600,
      distance: 36,
      depth: 99999,
    });
  }

  /**
   * 根据年龄推断生动的默认身份标签
   */
  private getDefaultIdentityForAge(age: number): string {
    if (age <= 3) return "襁褓幼婴";
    if (age <= 6) return "大院幼童";
    if (age <= 12) return "少先队员";
    if (age <= 18) return "高中学子";
    if (age <= 24) return "热血青年";
    if (age <= 50) return "社会骨干";
    return "退休长者";
  }

  private isDefaultIdentity(id: string): boolean {
    const defaults = ["襁褓幼婴", "大院幼童", "少先队员", "高中学子", "热血青年", "社会骨干", "退休长者"];
    return defaults.includes(id);
  }

  public getAge(): number {
    return this.currentAge;
  }

  public getMood(): CharacterMood {
    return this.currentMood;
  }

  public getCharacterName(): string {
    return this.currentName;
  }

  public getIdentity(): string {
    return this.currentIdentity;
  }

  public getAvatarStage(): CharacterAvatarStage {
    return this.avatarStage;
  }

  public getWidth(): number {
    return this.widgetWidth;
  }

  public getHeight(): number {
    return this.widgetHeight;
  }

  /**
   * 动态调整组件尺寸
   */
  public resize(width: number, height: number): this {
    this.widgetWidth = Math.max(280, Math.round(width));
    this.widgetHeight = Math.max(200, Math.round(height));

    const centerX = this.widgetWidth / 2;
    const avatarY = this.widgetHeight - 110;

    this.spotlightContainer.setPosition(centerX, this.widgetHeight - 88);
    this.avatarStage.setPosition(centerX, avatarY);
    this.nameplateContainer.setPosition(centerX, this.widgetHeight - 34);

    if (this.hitZone) {
      this.hitZone.setPosition(centerX, avatarY);
    }

    this.renderWidget();
    return this;
  }

  /**
   * 完整清理生命周期句柄
   */
  public override destroy(fromScene?: boolean): void {
    if (this.spotlightPulseTween) {
      this.spotlightPulseTween.stop();
      this.spotlightPulseTween.remove();
      this.spotlightPulseTween = undefined;
    }
    if (this.bounceTween) {
      this.bounceTween.stop();
      this.bounceTween.remove();
      this.bounceTween = undefined;
    }
    if (this.resetMoodTimer) {
      this.resetMoodTimer.destroy();
      this.resetMoodTimer = undefined;
    }
    super.destroy(fromScene);
  }
}

/**
 * 便捷工厂函数：创建角色展台主屏组件
 */
export function createCharacterStageWidget(
  scene: Phaser.Scene,
  options: CharacterStageWidgetOptions
): CharacterStageWidget {
  return new CharacterStageWidget(scene, options);
}
