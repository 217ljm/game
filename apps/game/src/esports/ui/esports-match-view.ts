import Phaser from "phaser";
import { DEFAULT_FONT_FAMILY, GAME_RESOLUTION } from "../../ui/game-text.ts";
import type { TacticalStyleType } from "./esports-bp-board.ts";

export interface LanePushState {
  lane: "top" | "mid" | "bot";
  laneName: string;
  blueTowersLeft: number; // 3（外塔、二塔、高地）
  redTowersLeft: number;
  pushProgress: number; // -100(红推到蓝家) ~ +100(蓝推到红家)
}

export interface GoldTrendPoint {
  minute: number;
  blueGoldLead: number; // 正数蓝领先，负数红领先
  tag?: string; // "FB", "DRAGON", "BARON", "ACE"
}

export interface MatchLiveEvent {
  minute: number;
  title: string;
  narrative: string;
  type: "first_blood" | "dragon" | "baron" | "teamfight" | "tower_down" | "ace" | "nexus_destroy";
  goldLead: number;
  isBlueAdvantage: boolean;
  highlightText: string;
}

export interface EsportsMatchViewConfig {
  scene: Phaser.Scene;
  x?: number;
  y?: number;
  width?: number; // 390
  height?: number; // 844
  myTeamName?: string;
  opponentTeamName?: string;
  playerChampionTitle?: string;
  bpAdvantageScore?: number;
  playerTactics?: TacticalStyleType;
  onTriggerSmiteQte?: (callback: (success: boolean) => void) => void;
  onMatchFinish?: (stats: EsportsMatchSummary) => void;
}

export interface EsportsMatchSummary {
  isWin: boolean;
  myScore: number;
  oppScore: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: string;
  damageShare: number;
  isMvp: boolean;
  mvpRating: number;
  goldLeadFinal: number;
  durationMinutes: number;
}

/**
 * 像素级单局比赛演播切面 (EsportsMatchView)
 * 彻底告别纯文字弹窗！
 * 包含：
 * 1. 顶部比分与计时看板；
 * 2. 三路推塔动态进度条（Top/Mid/Bot 防御塔爆裂与小兵线推移）；
 * 3. 战队经济差动态折线图（0~35分钟正负金币差填充走势与关键转折锚点）；
 * 4. 实时团战技能对轰演播擂台（双方像素英雄站位、技能光效飞弹对轰、ACE与击杀播报）；
 * 5. 龙坑拼惩戒 QTE 无缝联动与赛况演播推进。
 */
export class EsportsMatchView extends Phaser.GameObjects.Container {
  private readonly viewWidth: number;
  private readonly viewHeight: number;
  private myTeamName: string;
  private opponentTeamName: string;
  private playerChampion: string;
  private bpAdvantageScore: number;
  private onTriggerSmiteQteCallback?: (callback: (success: boolean) => void) => void;
  private onMatchFinishCallback?: (stats: EsportsMatchSummary) => void;

  // 演播状态
  private currentEventIndex: number = 0;
  private currentMinute: number = 3;
  private blueKills: number = 1;
  private redKills: number = 0;
  private blueDrakes: number = 0;
  private redDrakes: number = 0;
  private isMatchOver: boolean = false;
  private isSmiteQteTriggered: boolean = false;
  private smiteWon: boolean = true;

  // 三路推塔状态
  private lanes: LanePushState[] = [
    { lane: "top", laneName: "上路 TOP", blueTowersLeft: 3, redTowersLeft: 3, pushProgress: 0 },
    { lane: "mid", laneName: "中路 MID", blueTowersLeft: 3, redTowersLeft: 3, pushProgress: 15 },
    { lane: "bot", laneName: "下路 BOT", blueTowersLeft: 3, redTowersLeft: 3, pushProgress: 0 },
  ];

  // 经济走势数据点
  private goldTrend: GoldTrendPoint[] = [
    { minute: 0, blueGoldLead: 0 },
    { minute: 3, blueGoldLead: 450, tag: "FB" },
  ];

  // 事件链脚本
  private matchEvents: MatchLiveEvent[] = [];

  // 视图元素引用
  private timeText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private drakeIndicator!: Phaser.GameObjects.Text;
  private laneGraphics!: Phaser.GameObjects.Graphics;
  private chartGraphics!: Phaser.GameObjects.Graphics;
  private teamfightStage!: Phaser.GameObjects.Container;
  private commentaryText!: Phaser.GameObjects.Text;
  private blueHeroSprites: Phaser.GameObjects.Container[] = [];
  private redHeroSprites: Phaser.GameObjects.Container[] = [];
  private nextBtnText!: Phaser.GameObjects.Text;

  constructor(config: EsportsMatchViewConfig) {
    super(config.scene, config.x ?? 0, config.y ?? 0);
    this.viewWidth = config.width ?? 390;
    this.viewHeight = config.height ?? 844;
    this.myTeamName = config.myTeamName ?? "BLG";
    this.opponentTeamName = config.opponentTeamName ?? "T1";
    this.playerChampion = config.playerChampionTitle ?? "劫";
    this.bpAdvantageScore = config.bpAdvantageScore ?? 10;
    this.onTriggerSmiteQteCallback = config.onTriggerSmiteQte;
    this.onMatchFinishCallback = config.onMatchFinish;

    this.initMatchScript();
    this.createViewLayout();
    this.renderLaneProgress();
    this.renderGoldTrendChart();

    this.scene.add.existing(this);
  }

  private initMatchScript(): void {
    const isAdv = this.bpAdvantageScore >= 0;
    this.matchEvents = [
      {
        minute: 3,
        title: "⚡ 一血诞生：中路极限对线单杀！",
        narrative: `你操控【${this.playerChampion}】抓住敌方走位破绽，行云流水挂上引燃，越塔斩获【First Blood 一血】！全场尖叫！`,
        type: "first_blood",
        goldLead: 500,
        isBlueAdvantage: true,
        highlightText: "【FIRST BLOOD 一血爆发】",
      },
      {
        minute: 12,
        title: "🛡️ 越塔推塔：撕裂下路一塔！",
        narrative: "下路组织四包二越塔强杀，野辅完美抗塔，成功破掉敌方下路一血塔并斩获峡谷先锋！",
        type: "tower_down",
        goldLead: 2400,
        isBlueAdvantage: true,
        highlightText: "【下路一血塔破除】",
      },
      {
        minute: 18,
        title: "🐲 听牌小龙团：河道致命伏击！",
        narrative: "第三条听牌小龙刷新！双方在龙坑河道狭路相逢，你大招精准突击秒杀敌方主力输出，打出0换3并斩获听牌龙！",
        type: "dragon",
        goldLead: 4200,
        isBlueAdvantage: true,
        highlightText: "【三龙听牌 团战大胜】",
      },
      {
        minute: 24,
        title: "👑 纳什男爵决胜：龙坑极限拼惩拼手速！",
        narrative: "大龙坑生死一搏！大龙血量飞速下降，双方技能光波乱飞，全场目光聚焦在龙坑惩戒斩杀线！",
        type: "baron",
        goldLead: 6800,
        isBlueAdvantage: isAdv,
        highlightText: "【纳什男爵 生死争夺】",
      },
      {
        minute: 29,
        title: "💥 高地决战：势如破竹摧枯拉朽！",
        narrative: "携带强化大龙Buff，三路超级兵压境！你绝活英雄万军从中七进七出，直捣黄龙打出全员【ACE 团灭】！",
        type: "ace",
        goldLead: 9500,
        isBlueAdvantage: true,
        highlightText: "【团灭敌方 破两路高地】",
      },
      {
        minute: 32,
        title: "🏆 水晶爆炸：VICTORY 斩获大捷！",
        narrative: "门牙双塔轰然倒塌，敌方基地水晶化作漫天像素碎屑！全场高呼你的名字！",
        type: "nexus_destroy",
        goldLead: 11200,
        isBlueAdvantage: true,
        highlightText: "【点爆水晶 胜利终局】",
      },
    ];
  }

  private createViewLayout(): void {
    const w = this.viewWidth;
    const h = this.viewHeight;

    // 1. 深暗像素赛博背景
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x07111c, 0.98);
    bg.fillRect(0, 0, w, h);
    this.add(bg);

    // 2. 顶部比分牌 HUD (高度 54)
    this.createTopScoreHud(w);

    // 3. 实时团战像素对轰擂台 (高度 210)
    this.createTeamfightArena(w, 64);

    // 4. 三路推塔动态进度条 (高度 120)
    this.createLanePushSection(w, 282);

    // 5. 战队经济差走势折线图 (高度 170)
    this.createGoldTrendSection(w, 412);

    // 6. 实时解说弹幕与高光评述卡 (高度 130)
    this.createCommentaryCard(w, 592);

    // 7. 底部演播推进控制栏 (高度 54)
    this.createControlFooter(w, 734);
  }

  private createTopScoreHud(w: number): void {
    const hudG = this.scene.add.graphics();
    hudG.fillStyle(0x0a1c2a, 0.96);
    hudG.fillRoundedRect(10, 8, w - 20, 50, 6);
    hudG.lineStyle(1.5, 0x0284c7, 0.9);
    hudG.strokeRoundedRect(10, 8, w - 20, 50, 6);
    this.add(hudG);

    // 蓝方短队名与击杀数
    const blueName = this.scene.add.text(20, 18, `🟦 ${this.myTeamName}`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#38bdf8",
      resolution: GAME_RESOLUTION,
    });

    // 居中比分与对局时间
    this.scoreText = this.scene.add.text(w / 2, 24, `${this.blueKills}  :  ${this.redKills}`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "18px",
      fontStyle: "bold",
      color: "#f8fafc",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);

    this.timeText = this.scene.add.text(w / 2, 44, `⏱️ 03:15`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "11px",
      color: "#fbbf24",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);

    // 红方短队名与击杀数
    const redName = this.scene.add.text(w - 20, 18, `${this.opponentTeamName} 🟥`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#f87171",
      resolution: GAME_RESOLUTION,
    }).setOrigin(1, 0);

    // 龙坑龙魂状态栏
    this.drakeIndicator = this.scene.add.text(20, 42, `🐲 龙数: 蓝 ${this.blueDrakes} - ${this.redDrakes} 红`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "10px",
      color: "#7dd3fc",
      resolution: GAME_RESOLUTION,
    });

    const towerCount = this.scene.add.text(w - 20, 42, `🏰 防御塔: 蓝 9 - 9 红`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "10px",
      color: "#fca5a5",
      resolution: GAME_RESOLUTION,
    }).setOrigin(1, 0);

    this.add([blueName, this.scoreText, this.timeText, redName, this.drakeIndicator, towerCount]);
  }

  private createTeamfightArena(w: number, startY: number): void {
    this.teamfightStage = this.scene.add.container(0, startY);

    const arenaH = 208;
    const stageG = this.scene.add.graphics();
    stageG.fillStyle(0x061521, 0.98);
    stageG.fillRoundedRect(10, 0, w - 20, arenaH, 8);
    stageG.lineStyle(1.5, 0x1e3a5f, 0.9);
    stageG.strokeRoundedRect(10, 0, w - 20, arenaH, 8);

    // 峡谷河道地砖与草丛色块
    stageG.fillStyle(0x08253a, 0.7);
    stageG.fillRect(16, 80, w - 32, 48); // 河道
    stageG.fillStyle(0x0d3f2d, 0.8);
    stageG.fillRoundedRect(24, 88, 50, 32, 6); // 左草丛
    stageG.fillRoundedRect(w - 74, 88, 50, 32, 6); // 右草丛

    const stageTitle = this.scene.add.text(18, 8, "⚔️ 实时召唤师峡谷 · 团战对轰演播", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "11px",
      fontStyle: "bold",
      color: "#38bdf8",
      resolution: GAME_RESOLUTION,
    });

    this.teamfightStage.add([stageG, stageTitle]);

    // 创建双方像素小人阵列 (5 vs 5)
    this.blueHeroSprites = [];
    this.redHeroSprites = [];

    const blueHeroes = ["🥷", "🤺", "⚙️", "🦋", "⚓"];
    const redHeroes = ["👑", "🗡️", "🏹", "🪓", "🛡️"];

    for (let i = 0; i < 5; i++) {
      // 蓝方英雄 (位于左上方向右下突刺)
      const bx = 45 + i * 42;
      const by = 50 + (i % 2) * 22;
      const bContainer = this.createPixelHeroAvatar(bx, by, blueHeroes[i], true, i === 0 ? `你(${this.playerChampion})` : `队友${i}`);
      this.blueHeroSprites.push(bContainer);
      this.teamfightStage.add(bContainer);

      // 红方英雄 (位于右下方)
      const rx = 160 + i * 42;
      const ry = 135 - (i % 2) * 22;
      const rContainer = this.createPixelHeroAvatar(rx, ry, redHeroes[i], false, `对手${i}`);
      this.redHeroSprites.push(rContainer);
      this.teamfightStage.add(rContainer);
    }

    this.add(this.teamfightStage);
  }

  private createPixelHeroAvatar(x: number, y: number, icon: string, isBlue: boolean, nameTag: string): Phaser.GameObjects.Container {
    const c = this.scene.add.container(x, y);

    const baseG = this.scene.add.graphics();
    baseG.fillStyle(isBlue ? 0x0369a1 : 0x991b1b, 0.9);
    baseG.fillCircle(0, 0, 15);
    baseG.lineStyle(1.5, isBlue ? 0x38bdf8 : 0xf87171, 1);
    baseG.strokeCircle(0, 0, 15);

    const iconT = this.scene.add.text(0, 0, icon, { fontSize: "16px" }).setOrigin(0.5);

    // 血条背景与血量条
    const hpG = this.scene.add.graphics();
    hpG.fillStyle(0x0f172a, 1);
    hpG.fillRect(-14, 18, 28, 4);
    hpG.fillStyle(isBlue ? 0x22c55e : 0xef4444, 1);
    hpG.fillRect(-14, 18, 28, 4);

    const nameT = this.scene.add.text(0, -22, nameTag, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "9px",
      color: isBlue ? "#bae6fd" : "#fecaca",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);

    c.add([baseG, iconT, hpG, nameT]);
    return c;
  }

  private createLanePushSection(w: number, startY: number): void {
    const laneBox = this.scene.add.graphics();
    laneBox.fillStyle(0x091724, 0.96);
    laneBox.fillRoundedRect(10, startY, w - 20, 120, 8);
    laneBox.lineStyle(1.5, 0x1e3a5f, 0.9);
    laneBox.strokeRoundedRect(10, startY, w - 20, 120, 8);
    this.add(laneBox);

    const laneTitle = this.scene.add.text(18, startY + 8, "🏰 三路推塔动态进度条 (Lane Dominance)", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "11px",
      fontStyle: "bold",
      color: "#ffd8a1",
      resolution: GAME_RESOLUTION,
    });
    this.add(laneTitle);

    this.laneGraphics = this.scene.add.graphics();
    this.add(this.laneGraphics);
  }

  private renderLaneProgress(): void {
    this.laneGraphics.clear();
    const w = this.viewWidth;
    const startY = 282;

    this.lanes.forEach((lane, idx) => {
      const rowY = startY + 30 + idx * 28;
      const barX = 86;
      const barW = w - 108;
      const barH = 16;

      // 轨道底槽
      this.laneGraphics.fillStyle(0x0f2233, 0.95);
      this.laneGraphics.fillRoundedRect(barX, rowY, barW, barH, 4);
      this.laneGraphics.lineStyle(1, 0x1e293b, 0.8);
      this.laneGraphics.strokeRoundedRect(barX, rowY, barW, barH, 4);

      // 中轴零线 (50% 居中)
      const midX = barX + barW / 2;
      this.laneGraphics.lineStyle(1, 0x475569, 0.9);
      this.laneGraphics.lineBetween(midX, rowY, midX, rowY + barH);

      // 兵线推移进度条
      const ratio = (lane.pushProgress + 100) / 200; // 0 ~ 1
      const progressW = barW * ratio;
      const isBlueAdv = lane.pushProgress >= 0;

      this.laneGraphics.fillStyle(isBlueAdv ? 0x0284c7 : 0xb91c1c, 0.85);
      if (isBlueAdv) {
        this.laneGraphics.fillRoundedRect(midX, rowY + 2, progressW - barW / 2, barH - 4, 2);
      } else {
        this.laneGraphics.fillRoundedRect(barX + progressW, rowY + 2, barW / 2 - progressW, barH - 4, 2);
      }

      // 兵线推挤点像素小兵标记
      const markerX = barX + progressW;
      this.laneGraphics.fillStyle(0xfbbf24, 1);
      this.laneGraphics.fillCircle(markerX, rowY + barH / 2, 4);
    });
  }

  private createGoldTrendSection(w: number, startY: number): void {
    const chartBox = this.scene.add.graphics();
    chartBox.fillStyle(0x071520, 0.96);
    chartBox.fillRoundedRect(10, startY, w - 20, 170, 8);
    chartBox.lineStyle(1.5, 0x1e3a5f, 0.9);
    chartBox.strokeRoundedRect(10, startY, w - 20, 170, 8);
    this.add(chartBox);

    const chartTitle = this.scene.add.text(18, startY + 8, "📈 战队经济差走势折线图 (Gold Difference)", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "11px",
      fontStyle: "bold",
      color: "#38bdf8",
      resolution: GAME_RESOLUTION,
    });
    this.add(chartTitle);

    this.chartGraphics = this.scene.add.graphics();
    this.add(this.chartGraphics);
  }

  private renderGoldTrendChart(): void {
    this.chartGraphics.clear();
    const w = this.viewWidth;
    const startY = 412;
    const chartX = 26;
    const chartW = w - 52;
    const chartH = 120;
    const chartY = startY + 34;

    // 1. 背景网格与0轴刻度
    const zeroY = chartY + chartH / 2;
    this.chartGraphics.lineStyle(1, 0x334155, 0.6);
    this.chartGraphics.lineBetween(chartX, zeroY, chartX + chartW, zeroY);

    // +5k 与 -5k 辅助虚线
    this.chartGraphics.lineStyle(1, 0x1e293b, 0.4);
    this.chartGraphics.lineBetween(chartX, zeroY - 35, chartX + chartW, zeroY - 35);
    this.chartGraphics.lineBetween(chartX, zeroY + 35, chartX + chartW, zeroY + 35);

    // 2. 绘制连续折线
    if (this.goldTrend.length < 2) return;

    const maxMinutes = 35;
    const maxGoldScale = 12000;

    const points: Array<{ x: number; y: number; tag?: string; gold: number }> = this.goldTrend.map((pt) => {
      const px = chartX + (pt.minute / maxMinutes) * chartW;
      const clampedGold = Math.max(-maxGoldScale, Math.min(maxGoldScale, pt.blueGoldLead));
      const py = zeroY - (clampedGold / maxGoldScale) * (chartH / 2 - 8);
      return { x: px, y: py, tag: pt.tag, gold: pt.blueGoldLead };
    });

    // 填充折线下方半透明色彩
    this.chartGraphics.fillStyle(0x0284c7, 0.25);
    this.chartGraphics.beginPath();
    this.chartGraphics.moveTo(points[0].x, zeroY);
    points.forEach((p) => this.chartGraphics.lineTo(p.x, p.y));
    this.chartGraphics.lineTo(points[points.length - 1].x, zeroY);
    this.chartGraphics.closePath();
    this.chartGraphics.fillPath();

    // 描绘金色折线
    this.chartGraphics.lineStyle(2, 0x38bdf8, 1);
    this.chartGraphics.beginPath();
    this.chartGraphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.chartGraphics.lineTo(points[i].x, points[i].y);
    }
    this.chartGraphics.strokePath();

    // 绘制关键转折锚点与标签
    points.forEach((p) => {
      this.chartGraphics.fillStyle(0xfbbf24, 1);
      this.chartGraphics.fillCircle(p.x, p.y, 3.5);
      this.chartGraphics.lineStyle(1, 0xffffff, 1);
      this.chartGraphics.strokeCircle(p.x, p.y, 3.5);
    });
  }

  private createCommentaryCard(w: number, startY: number): void {
    const cardBox = this.scene.add.graphics();
    cardBox.fillStyle(0x0a1622, 0.98);
    cardBox.fillRoundedRect(10, startY, w - 20, 132, 8);
    cardBox.lineStyle(1.5, 0xd4a359, 0.9);
    cardBox.strokeRoundedRect(10, startY, w - 20, 132, 8);
    this.add(cardBox);

    const cTitle = this.scene.add.text(18, startY + 10, "🎙️ 现场解说席与关键高光时刻播报：", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "11px",
      fontStyle: "bold",
      color: "#ffd8a1",
      resolution: GAME_RESOLUTION,
    });
    this.add(cTitle);

    this.commentaryText = this.scene.add.text(18, startY + 34, this.matchEvents[0].narrative, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "11.5px",
      lineSpacing: 5,
      color: "#f1f5f9",
      wordWrap: { width: w - 36, useAdvancedWrap: true },
      resolution: GAME_RESOLUTION,
    });
    this.add(this.commentaryText);
  }

  private createControlFooter(w: number, startY: number): void {
    // 推进下一波关键赛况按钮
    const nextBtn = this.scene.add.container(10, startY);
    const btnW = w - 20;
    const btnH = 46;

    const g = this.scene.add.graphics();
    g.fillStyle(0x0284c7, 1);
    g.fillRoundedRect(0, 0, btnW, btnH, 6);
    g.lineStyle(1.5, 0x38bdf8, 1);
    g.strokeRoundedRect(0, 0, btnW, btnH, 6);

    this.nextBtnText = this.scene.add.text(btnW / 2, btnH / 2, "【 ▶ 推进下一波关键对决 (1/6) 】", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "14px",
      fontStyle: "bold",
      color: "#ffffff",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);

    const hit = this.scene.add.rectangle(btnW / 2, btnH / 2, btnW, btnH, 0x000000, 0);
    hit.setInteractive({ useHandCursor: true });
    hit.on("pointerdown", () => {
      this.advanceNextEvent();
    });

    nextBtn.add([g, this.nextBtnText, hit]);
    this.add(nextBtn);
  }

  /**
   * 演播事件推进
   */
  public advanceNextEvent(): void {
    if (this.isMatchOver) {
      this.finishMatch();
      return;
    }

    // 检查是否到了大龙团拼惩戒节点
    if (this.currentEventIndex === 3 && !this.isSmiteQteTriggered && this.onTriggerSmiteQteCallback) {
      this.isSmiteQteTriggered = true;
      this.onTriggerSmiteQteCallback((smiteWon: boolean) => {
        this.smiteWon = smiteWon;
        if (smiteWon) {
          this.commentaryText.setText(`⚡【神仙抢龙！】你顶住巨大压力，极限惩戒斩杀大龙！全场观众沸腾，胜利天平彻底倾斜！`);
          this.goldTrend.push({ minute: 24, blueGoldLead: 7500, tag: "BARON" });
          this.blueKills += 2;
        } else {
          this.commentaryText.setText(`⚠️【男爵被抢！】敌方打野拼惩得手，但我方凭借绝活英雄反打瞬秒敌方双C，战局依然保持微弱优势！`);
          this.goldTrend.push({ minute: 24, blueGoldLead: 5200, tag: "BARON" });
        }
        this.renderGoldTrendChart();
        this.triggerTeamfightFx();
      });
      return;
    }

    this.currentEventIndex++;
    if (this.currentEventIndex >= this.matchEvents.length) {
      this.isMatchOver = true;
      this.finishMatch();
      return;
    }

    const ev = this.matchEvents[this.currentEventIndex];
    this.currentMinute = ev.minute;
    this.timeText.setText(`⏱️ ${ev.minute < 10 ? "0" + ev.minute : ev.minute}:30`);
    this.commentaryText.setText(ev.narrative);

    // 更新击杀与推塔
    if (ev.type === "first_blood") {
      this.blueKills = 1;
      this.lanes[1].pushProgress = 35;
    } else if (ev.type === "tower_down") {
      this.blueKills = 4;
      this.redKills = 1;
      this.lanes[2].pushProgress = 65;
      this.lanes[2].redTowersLeft = 2;
    } else if (ev.type === "dragon") {
      this.blueKills = 9;
      this.redKills = 3;
      this.blueDrakes = 3;
      this.drakeIndicator.setText(`🐲 龙数: 蓝 3 - 0 红 (听牌龙魂)`);
      this.lanes[0].pushProgress = 40;
    } else if (ev.type === "baron") {
      this.blueKills = 14;
      this.redKills = 7;
      this.lanes[1].pushProgress = 85;
      this.lanes[1].redTowersLeft = 1;
    } else if (ev.type === "ace") {
      this.blueKills = 19;
      this.redKills = 8;
      this.lanes[0].pushProgress = 95;
      this.lanes[1].pushProgress = 100;
      this.lanes[2].pushProgress = 90;
    } else if (ev.type === "nexus_destroy") {
      this.blueKills = 22;
      this.redKills = 9;
      this.lanes[1].pushProgress = 100;
      this.lanes[1].redTowersLeft = 0;
    }

    this.scoreText.setText(`${this.blueKills}  :  ${this.redKills}`);
    this.goldTrend.push({ minute: ev.minute, blueGoldLead: ev.goldLead, tag: ev.type.toUpperCase() });

    // 重新渲染折线图与推塔轨道
    this.renderLaneProgress();
    this.renderGoldTrendChart();
    this.triggerTeamfightFx();

    if (this.currentEventIndex >= this.matchEvents.length - 1) {
      this.isMatchOver = true;
      this.nextBtnText.setText("【 🏆 比赛胜利 · 查看荣誉结算看板 ▶ 】");
    } else {
      this.nextBtnText.setText(`【 ▶ 推进下一波关键对决 (${this.currentEventIndex + 1}/6) 】`);
    }
  }

  private triggerTeamfightFx(): void {
    // 团战像素对轰闪烁与飞弹特效
    const projectile = this.scene.add.circle(60, 200, 4, 0x00f0ff);
    this.add(projectile);

    this.scene.tweens.add({
      targets: projectile,
      x: 280,
      y: 180,
      duration: 350,
      ease: "Quad.easeIn",
      onComplete: () => {
        projectile.destroy();
        this.playExplosionFx(280, 180);
      },
    });

    // 英雄小人前后摇摆
    this.blueHeroSprites.forEach((s) => {
      this.scene.tweens.add({
        targets: s,
        x: s.x + 8,
        duration: 90,
        yoyo: true,
      });
    });
  }

  private playExplosionFx(x: number, y: number): void {
    const flash = this.scene.add.circle(x, y, 16, 0xfbbf24, 0.9);
    this.add(flash);
    this.scene.tweens.add({
      targets: flash,
      scale: 1.8,
      alpha: 0,
      duration: 250,
      onComplete: () => flash.destroy(),
    });
  }

  private finishMatch(): void {
    const summary: EsportsMatchSummary = {
      isWin: true,
      myScore: 2,
      oppScore: 0,
      kills: 11,
      deaths: 1,
      assists: 14,
      kda: "11/1/14",
      damageShare: 38,
      isMvp: true,
      mvpRating: 9.8,
      goldLeadFinal: 11200,
      durationMinutes: 32,
    };

    if (this.onMatchFinishCallback) {
      this.onMatchFinishCallback(summary);
    }
  }
}
