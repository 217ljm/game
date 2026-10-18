import Phaser from "phaser";
import { DEFAULT_FONT_FAMILY, GAME_RESOLUTION } from "../../ui/game-text.ts";

export type TacticalStyleType =
  | "dive_teamfight"     // 强开冲脸体系 ⚡
  | "split_push"         // 四一分推体系 🏹
  | "teamfight_wombo"    // 阵地团控体系 🛡️
  | "poke_siege";        // POKE消耗体系 🎯

export interface TacticalStyleDefinition {
  type: TacticalStyleType;
  name: string;
  shortDesc: string;
  fullDesc: string;
  counters: TacticalStyleType;
  counteredBy: TacticalStyleType;
  counterNarrative: string;
  color: number;
  accentColor: number;
  icon: string;
}

export const TACTICAL_STYLE_DEFINITIONS: Record<TacticalStyleType, TacticalStyleDefinition> = {
  dive_teamfight: {
    type: "dive_teamfight",
    name: "强开冲脸",
    shortDesc: "多点硬控·强切后排",
    fullDesc: "选择具备超远突进与致命硬控的阵容，野区与河道强行开团融化敌方后排！",
    counters: "poke_siege",
    counteredBy: "split_push",
    counterNarrative: "强开冲脸克制POKE消耗（贴脸爆发让长手无处遁形），但被四一分推拉扯牵制！",
    color: 0x991b1b,
    accentColor: 0xef4444,
    icon: "⚡",
  },
  split_push: {
    type: "split_push",
    name: "四一分推",
    shortDesc: "单带牵制·避战破局",
    fullDesc: "核心单带点带穿一路，正面四人防守拉扯，以兵线压力撕裂对手阵型！",
    counters: "dive_teamfight",
    counteredBy: "teamfight_wombo",
    counterNarrative: "四一分推克制强开冲脸（正面避战让冲脸扑空），但忌惮阵地团控的大招直接逼团！",
    color: 0x854d0e,
    accentColor: 0xfacc15,
    icon: "🏹",
  },
  teamfight_wombo: {
    type: "teamfight_wombo",
    name: "阵地团控",
    shortDesc: "大招融化·毁天灭地",
    fullDesc: "选出强团控与大招流协同体系，围绕大龙与远古龙打出完美 5v5 团战！",
    counters: "split_push",
    counteredBy: "poke_siege",
    counterNarrative: "阵地团控克制四一分推（大招强压正面5打4），但容易被POKE消耗阵地折磨！",
    color: 0x1e3a8a,
    accentColor: 0x60a5fa,
    icon: "🛡️",
  },
  poke_siege: {
    type: "poke_siege",
    name: "POKE消耗",
    shortDesc: "超远手长·折磨血线",
    fullDesc: "利用手长优势在防守与推塔中远程消耗，团战未开已将敌方血线压残！",
    counters: "teamfight_wombo",
    counteredBy: "dive_teamfight",
    counterNarrative: "POKE消耗克制阵地团控（未接团先残血），但极度害怕强开冲脸的蛮横近身！",
    color: 0x065f46,
    accentColor: 0x34d399,
    icon: "🎯",
  },
};

export interface ChampionSlotData {
  id: string;
  name: string;
  title: string;
  role: "top" | "jungle" | "mid" | "adc" | "support";
  roleName: string;
  icon: string;
  isSignature?: boolean;
  archetype: TacticalStyleType;
}

export interface EsportsBpResult {
  playerSide: "blue" | "red";
  playerTactics: TacticalStyleType;
  opponentTactics: TacticalStyleType;
  playerChampion: ChampionSlotData;
  advantageScore: number; // -20 ~ +20
  advantageTitle: string;
  advantageReason: string;
  isSignatureLocked: boolean;
}

export interface EsportsBpBoardConfig {
  scene: Phaser.Scene;
  x?: number;
  y?: number;
  width?: number; // 390
  height?: number; // 844
  mySide?: "blue" | "red";
  myTeamName?: string;
  opponentTeamName?: string;
  playerRole?: "top" | "jungle" | "mid" | "adc" | "support";
  playerSignatureHero?: string;
  defaultTactics?: TacticalStyleType;
  onConfirm?: (result: EsportsBpResult) => void;
  onCancel?: () => void;
}

/**
 * 像素风格战术 BP 棋盘博弈组件
 * 核心机制：
 * 1. 红蓝方选边机制（蓝方一选优势 vs 红方五楼 Counter Pick 绝活特权）；
 * 2. 阵型风格四象限克制（强开冲脸 vs 四一分推 vs 阵地团控 vs POKE消耗）；
 * 3. 招牌绝活英雄锁下特效（高亮粒子狂闪、金色绝活光环、震颤演出）；
 * 4. 实时战力增益推演与解说席弹幕。
 */
export class EsportsBpBoard extends Phaser.GameObjects.Container {
  private readonly boardWidth: number;
  private readonly boardHeight: number;
  private playerSide: "blue" | "red";
  private selectedTactics: TacticalStyleType;
  private opponentTactics: TacticalStyleType;
  private isSignatureLocked: boolean = false;
  private myTeamName: string;
  private opponentTeamName: string;
  private playerRole: "top" | "jungle" | "mid" | "adc" | "support";
  private signatureHeroName: string;
  private onConfirmCallback?: (result: EsportsBpResult) => void;
  private onCancelCallback?: () => void;

  // 内部图形与文本引用
  private tacticsButtons: Map<TacticalStyleType, Phaser.GameObjects.Container> = new Map();
  private sideSelectorContainer!: Phaser.GameObjects.Container;
  private counterFeedbackText!: Phaser.GameObjects.Text;
  private advantageScoreText!: Phaser.GameObjects.Text;
  private signatureButton!: Phaser.GameObjects.Container;
  private signatureGlowFx!: Phaser.GameObjects.Graphics;
  private playerSlotContainer!: Phaser.GameObjects.Container;
  private slotsContainer!: Phaser.GameObjects.Container;

  // 模拟可选英雄库
  private availableChampions: ChampionSlotData[] = [];
  private selectedChampion!: ChampionSlotData;

  constructor(config: EsportsBpBoardConfig) {
    super(config.scene, config.x ?? 0, config.y ?? 0);
    this.boardWidth = config.width ?? 390;
    this.boardHeight = config.height ?? 844;
    this.playerSide = config.mySide ?? "blue";
    this.myTeamName = config.myTeamName ?? "BLG 战队";
    this.opponentTeamName = config.opponentTeamName ?? "T1 战队";
    this.playerRole = config.playerRole ?? "mid";
    this.signatureHeroName = config.playerSignatureHero ?? "影流之主 (劫)";
    this.selectedTactics = config.defaultTactics ?? "dive_teamfight";
    this.opponentTactics = "poke_siege"; // 默认对手选择
    this.onConfirmCallback = config.onConfirm;
    this.onCancelCallback = config.onCancel;

    this.initChampionPool();
    this.createBoardVisuals();
    this.updateTacticsAdvantage();

    this.scene.add.existing(this);
  }

  private initChampionPool(): void {
    this.availableChampions = [
      { id: "hero_zed", name: "影流之主", title: "劫", role: "mid", roleName: "中单", icon: "🥷", isSignature: true, archetype: "dive_teamfight" },
      { id: "hero_fiora", name: "无双剑姬", title: "菲奥娜", role: "top", roleName: "上单", icon: "🤺", isSignature: false, archetype: "split_push" },
      { id: "hero_orianna", name: "发条魔灵", title: "奥莉安娜", role: "mid", roleName: "中单", icon: "⚙️", isSignature: false, archetype: "teamfight_wombo" },
      { id: "hero_jayce", name: "未来守护者", title: "杰斯", role: "mid", roleName: "中单", icon: "🔨", isSignature: false, archetype: "poke_siege" },
      { id: "hero_jarvan", name: "德玛西亚皇子", title: "嘉文四世", role: "jungle", roleName: "打野", icon: "🚩", isSignature: false, archetype: "dive_teamfight" },
      { id: "hero_kaisa", name: "虚空之女", title: "卡莎", role: "adc", roleName: "射手", icon: "🦋", isSignature: false, archetype: "dive_teamfight" },
      { id: "hero_nautilus", name: "深海泰坦", title: "诺提勒斯", role: "support", roleName: "辅助", icon: "⚓", isSignature: false, archetype: "dive_teamfight" },
      { id: "hero_varus", name: "惩戒之箭", title: "韦鲁斯", role: "adc", roleName: "射手", icon: "🏹", isSignature: false, archetype: "poke_siege" },
      { id: "hero_malphite", name: "熔岩巨兽", title: "墨菲特", role: "top", roleName: "上单", icon: "🪨", isSignature: false, archetype: "teamfight_wombo" },
    ];

    // 默认选择招牌英雄
    this.selectedChampion = this.availableChampions[0];
  }

  private createBoardVisuals(): void {
    const w = this.boardWidth;
    const h = this.boardHeight;

    // 1. 深色像素网格背景板
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x060c14, 0.98);
    bg.fillRect(0, 0, w, h);

    // 绘制复古像素电子竞技网格线
    bg.lineStyle(1, 0x132738, 0.6);
    for (let gx = 0; gx < w; gx += 20) {
      bg.lineBetween(gx, 0, gx, h);
    }
    for (let gy = 0; gy < h; gy += 20) {
      bg.lineBetween(0, gy, w, gy);
    }
    this.add(bg);

    // 2. 顶部赛事与战队标题 HUD
    this.createHeaderHud(w);

    // 3. 红蓝方选边切换器 (蓝方一选 vs 红方 Counter)
    this.createSideToggle(w);

    // 4. 像素对阵双方阵容棋盘槽位 (5 vs 5)
    this.createDraftSlots(w);

    // 5. 战术阵型风格克制选择博弈盘
    this.createTacticsMatrix(w);

    // 6. 招牌绝活锁下控制区与克制评分反馈
    this.createSignatureAndAdvantageSection(w);

    // 7. 底部确认锁定按钮
    this.createConfirmFooter(w);
  }

  private createHeaderHud(w: number): void {
    const headerBg = this.scene.add.graphics();
    headerBg.fillStyle(0x0d1e2e, 0.95);
    headerBg.fillRoundedRect(12, 10, w - 24, 46, 6);
    headerBg.lineStyle(1.5, 0x00f0ff, 0.8);
    headerBg.strokeRoundedRect(12, 10, w - 24, 46, 6);
    this.add(headerBg);

    const titleText = this.scene.add.text(w / 2, 24, "⚡ 像素电竞 · 战术 BP 棋盘博弈", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "14.5px",
      fontStyle: "bold",
      color: "#00f0ff",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);
    this.add(titleText);

    const subTitle = this.scene.add.text(w / 2, 42, `${this.myTeamName}  VS  ${this.opponentTeamName} · BO3 决胜局`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "11px",
      color: "#94a3b8",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);
    this.add(subTitle);
  }

  private createSideToggle(w: number): void {
    this.sideSelectorContainer = this.scene.add.container(0, 62);

    const barW = w - 24;
    const halfW = (barW - 8) / 2;

    // 蓝方选边按钮
    const blueBtn = this.createSideButton(12, 0, halfW, "blue", "🟦 蓝方 (先手一选抢核心)");
    // 红方选边按钮
    const redBtn = this.createSideButton(12 + halfW + 8, 0, halfW, "red", "🟥 红方 (后手五楼 Counter)");

    this.sideSelectorContainer.add([blueBtn, redBtn]);
    this.add(this.sideSelectorContainer);
  }

  private createSideButton(x: number, y: number, btnW: number, side: "blue" | "red", label: string): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    const isSelected = this.playerSide === side;

    const g = this.scene.add.graphics();
    const bgColor = isSelected ? (side === "blue" ? 0x0369a1 : 0x991b1b) : 0x0f172a;
    const strokeColor = side === "blue" ? 0x38bdf8 : 0xf87171;

    g.fillStyle(bgColor, 0.95);
    g.fillRoundedRect(0, 0, btnW, 30, 4);
    g.lineStyle(isSelected ? 2 : 1, strokeColor, isSelected ? 1 : 0.5);
    g.strokeRoundedRect(0, 0, btnW, 30, 4);

    const t = this.scene.add.text(btnW / 2, 15, label, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "10.5px",
      fontStyle: isSelected ? "bold" : "normal",
      color: isSelected ? "#ffffff" : "#94a3b8",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);

    const hit = this.scene.add.rectangle(btnW / 2, 15, btnW, 30, 0x000000, 0);
    hit.setInteractive({ useHandCursor: true });
    hit.on("pointerdown", () => {
      if (this.playerSide !== side) {
        this.playerSide = side;
        // 重新刷新选边栏与槽位高亮
        this.sideSelectorContainer.destroy();
        this.createSideToggle(this.boardWidth);
        this.updateTacticsAdvantage();
      }
    });

    container.add([g, t, hit]);
    return container;
  }

  private createDraftSlots(w: number): void {
    if (this.slotsContainer) {
      this.slotsContainer.destroy();
    }
    this.slotsContainer = this.scene.add.container(0, 98);

    const boxW = (w - 32) / 2;
    const boxH = 158;

    // 蓝方阵容面板
    const blueBox = this.scene.add.graphics();
    blueBox.fillStyle(0x061826, 0.9);
    blueBox.fillRoundedRect(12, 0, boxW, boxH, 6);
    blueBox.lineStyle(1.5, 0x0284c7, 0.8);
    blueBox.strokeRoundedRect(12, 0, boxW, boxH, 6);

    const blueTitle = this.scene.add.text(18, 8, "🟦 蓝方阵容 (BLUE)", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "11px",
      fontStyle: "bold",
      color: "#38bdf8",
      resolution: GAME_RESOLUTION,
    });

    // 红方阵容面板
    const redBox = this.scene.add.graphics();
    redBox.fillStyle(0x210808, 0.9);
    redBox.fillRoundedRect(12 + boxW + 8, 0, boxW, boxH, 6);
    redBox.lineStyle(1.5, 0xb91c1c, 0.8);
    redBox.strokeRoundedRect(12 + boxW + 8, 0, boxW, boxH, 6);

    const redTitle = this.scene.add.text(12 + boxW + 14, 8, "🟥 红方阵容 (RED)", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "11px",
      fontStyle: "bold",
      color: "#f87171",
      resolution: GAME_RESOLUTION,
    });

    this.slotsContainer.add([blueBox, blueTitle, redBox, redTitle]);

    // 双方 5 位置阵容列表
    const roles: Array<{ key: "top" | "jungle" | "mid" | "adc" | "support"; label: string }> = [
      { key: "top", label: "上单" },
      { key: "jungle", label: "打野" },
      { key: "mid", label: "中单" },
      { key: "adc", label: "射手" },
      { key: "support", label: "辅助" },
    ];

    roles.forEach((r, idx) => {
      const rowY = 28 + idx * 24;

      // 蓝方槽位
      const isPlayerSlotBlue = this.playerSide === "blue" && this.playerRole === r.key;
      const blueSlotG = this.scene.add.graphics();
      blueSlotG.fillStyle(isPlayerSlotBlue ? 0x0c4a6e : 0x082f49, 0.8);
      blueSlotG.fillRoundedRect(16, rowY, boxW - 8, 20, 3);
      if (isPlayerSlotBlue) {
        blueSlotG.lineStyle(1.5, 0x38bdf8, 1);
        blueSlotG.strokeRoundedRect(16, rowY, boxW - 8, 20, 3);
      }
      this.slotsContainer.add(blueSlotG);

      const blueRoleText = this.scene.add.text(20, rowY + 10, `[${r.label}]`, {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "10px",
        color: "#7dd3fc",
        resolution: GAME_RESOLUTION,
      }).setOrigin(0, 0.5);

      const heroNameBlue = isPlayerSlotBlue ? this.selectedChampion.title : this.getDefaultPick(r.key, "blue");
      const blueHeroText = this.scene.add.text(56, rowY + 10, heroNameBlue, {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "10.5px",
        fontStyle: isPlayerSlotBlue ? "bold" : "normal",
        color: isPlayerSlotBlue ? "#fef08a" : "#e2e8f0",
        resolution: GAME_RESOLUTION,
      }).setOrigin(0, 0.5);

      this.slotsContainer.add([blueRoleText, blueHeroText]);

      // 红方槽位
      const isPlayerSlotRed = this.playerSide === "red" && this.playerRole === r.key;
      const redX = 12 + boxW + 8;
      const redSlotG = this.scene.add.graphics();
      redSlotG.fillStyle(isPlayerSlotRed ? 0x7f1d1d : 0x450a0a, 0.8);
      redSlotG.fillRoundedRect(redX + 4, rowY, boxW - 8, 20, 3);
      if (isPlayerSlotRed) {
        redSlotG.lineStyle(1.5, 0xf87171, 1);
        redSlotG.strokeRoundedRect(redX + 4, rowY, boxW - 8, 20, 3);
      }
      this.slotsContainer.add(redSlotG);

      const redRoleText = this.scene.add.text(redX + 8, rowY + 10, `[${r.label}]`, {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "10px",
        color: "#fca5a5",
        resolution: GAME_RESOLUTION,
      }).setOrigin(0, 0.5);

      const heroNameRed = isPlayerSlotRed ? this.selectedChampion.title : this.getDefaultPick(r.key, "red");
      const redHeroText = this.scene.add.text(redX + 44, rowY + 10, heroNameRed, {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "10.5px",
        fontStyle: isPlayerSlotRed ? "bold" : "normal",
        color: isPlayerSlotRed ? "#fef08a" : "#e2e8f0",
        resolution: GAME_RESOLUTION,
      }).setOrigin(0, 0.5);

      this.slotsContainer.add([redRoleText, redHeroText]);
    });

    // Ban 位禁选徽标栏 (底部条)
    const banBar = this.scene.add.graphics();
    banBar.fillStyle(0x0a0f16, 0.95);
    banBar.fillRoundedRect(12, 164, w - 24, 24, 4);
    banBar.lineStyle(1, 0x334155, 0.7);
    banBar.strokeRoundedRect(12, 164, w - 24, 24, 4);
    this.slotsContainer.add(banBar);

    const banText = this.scene.add.text(w / 2, 176, "🚫 BAN位限制：封锁 妖姬 / 卢锡安 / 蔚 / 辛德拉 / 蕾欧娜", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "10px",
      color: "#94a3b8",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);
    this.slotsContainer.add(banText);

    this.add(this.slotsContainer);
  }

  private getDefaultPick(role: string, side: "blue" | "red"): string {
    const blueDefaults: Record<string, string> = { top: "纳尔", jungle: "盲僧", mid: "阿卡丽", adc: "卡莎", support: "泰坦" };
    const redDefaults: Record<string, string> = { top: "贾克斯", jungle: "赵信", mid: "发条", adc: "韦鲁斯", support: "日女" };
    return side === "blue" ? blueDefaults[role] || "常规选择" : redDefaults[role] || "常规选择";
  }

  private createTacticsMatrix(w: number): void {
    const startY = 300;

    const tacticsHeader = this.scene.add.text(14, startY, "⚔️ 战术阵型风格克制选择（点击切换博弈）：", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "12px",
      fontStyle: "bold",
      color: "#ffd8a1",
      resolution: GAME_RESOLUTION,
    });
    this.add(tacticsHeader);

    const styles: TacticalStyleType[] = ["dive_teamfight", "split_push", "teamfight_wombo", "poke_siege"];
    const btnW = (w - 32) / 2;
    const btnH = 68;

    styles.forEach((st, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const bx = 12 + col * (btnW + 8);
      const by = startY + 20 + row * (btnH + 8);

      const btnContainer = this.scene.add.container(bx, by);
      this.tacticsButtons.set(st, btnContainer);
      this.drawTacticsButton(st, btnContainer, btnW, btnH);
      this.add(btnContainer);
    });
  }

  private drawTacticsButton(styleType: TacticalStyleType, container: Phaser.GameObjects.Container, btnW: number, btnH: number): void {
    container.removeAll(true);
    const def = TACTICAL_STYLE_DEFINITIONS[styleType];
    const isSelected = this.selectedTactics === styleType;

    const g = this.scene.add.graphics();
    g.fillStyle(isSelected ? def.color : 0x0f172a, 0.95);
    g.fillRoundedRect(0, 0, btnW, btnH, 6);
    g.lineStyle(isSelected ? 2 : 1, isSelected ? 0x00f0ff : def.accentColor, isSelected ? 1 : 0.6);
    g.strokeRoundedRect(0, 0, btnW, btnH, 6);

    const title = this.scene.add.text(8, 8, `${def.icon} ${def.name}`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "12.5px",
      fontStyle: "bold",
      color: isSelected ? "#ffffff" : "#f1f5f9",
      resolution: GAME_RESOLUTION,
    });

    const statusBadge = isSelected ? " [已选用]" : "";
    const badgeText = this.scene.add.text(btnW - 8, 9, statusBadge, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "10px",
      fontStyle: "bold",
      color: "#38bdf8",
      resolution: GAME_RESOLUTION,
    }).setOrigin(1, 0);

    const desc = this.scene.add.text(8, 28, def.shortDesc, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "10px",
      color: isSelected ? "#e2e8f0" : "#94a3b8",
      resolution: GAME_RESOLUTION,
    });

    const counterHint = this.scene.add.text(8, 46, `克制 ➔ ${TACTICAL_STYLE_DEFINITIONS[def.counters].name}`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "9.5px",
      fontStyle: "bold",
      color: "#86efac",
      resolution: GAME_RESOLUTION,
    });

    const hit = this.scene.add.rectangle(btnW / 2, btnH / 2, btnW, btnH, 0x000000, 0);
    hit.setInteractive({ useHandCursor: true });
    hit.on("pointerdown", () => {
      this.selectedTactics = styleType;
      this.refreshTacticsSelection();
      this.updateTacticsAdvantage();
    });

    container.add([g, title, badgeText, desc, counterHint, hit]);
  }

  private refreshTacticsSelection(): void {
    const btnW = (this.boardWidth - 32) / 2;
    const btnH = 68;
    this.tacticsButtons.forEach((c, st) => {
      this.drawTacticsButton(st, c, btnW, btnH);
    });
  }

  private createSignatureAndAdvantageSection(w: number): void {
    const startY = 472;

    // 1. 招牌绝活英雄锁下按钮卡片
    this.signatureButton = this.scene.add.container(12, startY);

    const btnW = w - 24;
    const btnH = 58;

    const btnG = this.scene.add.graphics();
    this.signatureGlowFx = btnG;
    this.renderSignatureButtonGraphics(btnG, btnW, btnH);

    const iconText = this.scene.add.text(18, 16, "👑", { fontSize: "26px" });
    const heroTitle = this.scene.add.text(54, 12, `【招牌绝活】锁下本命：${this.signatureHeroName}`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#fbbf24",
      resolution: GAME_RESOLUTION,
    });

    const heroDesc = this.scene.add.text(54, 34, "熟练度 S+ · 战力爆发 +15% · 解锁招牌击杀高光动画", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "10.5px",
      color: "#fef08a",
      resolution: GAME_RESOLUTION,
    });

    const lockTag = this.scene.add.text(btnW - 14, 20, this.isSignatureLocked ? "✅ 已锁下" : "⚡ 点击锁下", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "11px",
      fontStyle: "bold",
      color: this.isSignatureLocked ? "#34d399" : "#ffffff",
      resolution: GAME_RESOLUTION,
    }).setOrigin(1, 0);

    const hit = this.scene.add.rectangle(btnW / 2, btnH / 2, btnW, btnH, 0x000000, 0);
    hit.setInteractive({ useHandCursor: true });
    hit.on("pointerdown", () => {
      this.toggleSignatureHero();
      lockTag.setText(this.isSignatureLocked ? "✅ 已锁下" : "⚡ 点击锁下");
      lockTag.setColor(this.isSignatureLocked ? "#34d399" : "#ffffff");
    });

    this.signatureButton.add([btnG, iconText, heroTitle, heroDesc, lockTag, hit]);
    this.add(this.signatureButton);

    // 2. 阵型克制推演结果面板 (高度 120)
    const advPanelY = startY + 68;
    const advBox = this.scene.add.graphics();
    advBox.fillStyle(0x0f172a, 0.96);
    advBox.fillRoundedRect(12, advPanelY, w - 24, 114, 8);
    advBox.lineStyle(1.5, 0x38bdf8, 0.9);
    advBox.strokeRoundedRect(12, advPanelY, w - 24, 114, 8);
    this.add(advBox);

    this.advantageScoreText = this.scene.add.text(24, advPanelY + 12, "📊 BP克制推演：正在评估阵型...", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#38bdf8",
      resolution: GAME_RESOLUTION,
    });
    this.add(this.advantageScoreText);

    this.counterFeedbackText = this.scene.add.text(24, advPanelY + 36, "", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "11px",
      lineSpacing: 4,
      color: "#cbd5e1",
      wordWrap: { width: w - 48, useAdvancedWrap: true },
      resolution: GAME_RESOLUTION,
    });
    this.add(this.counterFeedbackText);
  }

  private renderSignatureButtonGraphics(g: Phaser.GameObjects.Graphics, btnW: number, btnH: number): void {
    g.clear();
    if (this.isSignatureLocked) {
      g.fillStyle(0x78350f, 0.98);
      g.fillRoundedRect(0, 0, btnW, btnH, 6);
      g.lineStyle(2, 0xf59e0b, 1);
      g.strokeRoundedRect(0, 0, btnW, btnH, 6);
    } else {
      g.fillStyle(0x1e293b, 0.9);
      g.fillRoundedRect(0, 0, btnW, btnH, 6);
      g.lineStyle(1.5, 0xd97706, 0.8);
      g.strokeRoundedRect(0, 0, btnW, btnH, 6);
    }
  }

  private toggleSignatureHero(): void {
    this.isSignatureLocked = !this.isSignatureLocked;
    const btnW = this.boardWidth - 24;
    const btnH = 58;
    this.renderSignatureButtonGraphics(this.signatureGlowFx, btnW, btnH);

    if (this.isSignatureLocked) {
      // 触发绝活锁下粒子爆炸与震颤动画
      this.playSignatureLockedFx();
    }
    this.updateTacticsAdvantage();
    this.createDraftSlots(this.boardWidth);
  }

  private playSignatureLockedFx(): void {
    // 棋盘震颤
    this.scene.tweens.add({
      targets: this.signatureButton,
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 80,
      yoyo: true,
      repeat: 2,
    });

    // 产生金色闪光高亮横幅
    const flash = this.scene.add.text(this.boardWidth / 2, 450, "✨ SIGNATURE HERO LOCKED! 绝活锁下！", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "14px",
      fontStyle: "bold",
      color: "#fef08a",
      backgroundColor: "#b45309",
      padding: { x: 8, y: 4 },
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5).setDepth(100);

    this.scene.tweens.add({
      targets: flash,
      alpha: { from: 1, to: 0 },
      y: 420,
      duration: 1200,
      ease: "Quad.easeOut",
      onComplete: () => flash.destroy(),
    });
  }

  private updateTacticsAdvantage(): void {
    const current = TACTICAL_STYLE_DEFINITIONS[this.selectedTactics];
    let score = 0;
    let title = "";
    let reason = "";

    // 阵容相克判定
    if (current.counters === this.opponentTactics) {
      score += 15;
      title = `🏆 BP大优：【${current.name}】完美反制敌方【${TACTICAL_STYLE_DEFINITIONS[this.opponentTactics].name}】！`;
      reason = `${current.counterNarrative}\n我方在关键团战切入与对线期拥有绝对主导权，全队对线压制率 +15%！`;
    } else if (current.counteredBy === this.opponentTactics) {
      score -= 12;
      title = `⚠️ BP受制：【${current.name}】遭到敌方【${TACTICAL_STYLE_DEFINITIONS[this.opponentTactics].name}】的反制！`;
      reason = `敌方阵容在射程或机动性上占优，需要凭借个人神级微操或龙坑抓机会逆转战局！`;
    } else {
      score += 5;
      title = `⚖️ 战术势均力敌：双方见招拆招！`;
      reason = `双方阵型均有发挥空间，成败完全取决于选手的个人操作手速与龙坑团战决策！`;
    }

    // 绝活英雄加成
    if (this.isSignatureLocked) {
      score += 10;
      reason += `\n✨ 招牌绝活加持：本命英雄进入无双状态，绝境翻盘概率大幅提升！`;
    }

    // 选边加成
    if (this.playerSide === "blue") {
      score += 3;
      reason += ` (蓝方先手一选强化核心体系)`;
    } else {
      score += 2;
      reason += ` (红方后手反制针对敌方王牌)`;
    }

    const color = score > 0 ? "#34d399" : score < 0 ? "#f87171" : "#38bdf8";
    this.advantageScoreText.setText(title);
    this.advantageScoreText.setColor(color);
    this.counterFeedbackText.setText(reason);
  }

  private createConfirmFooter(w: number): void {
    const footerY = 740;

    // 确认锁定阵容大按钮
    const confirmBtn = this.scene.add.container(12, footerY);
    const btnW = w - 24;
    const btnH = 50;

    const g = this.scene.add.graphics();
    g.fillStyle(0x0284c7, 1);
    g.fillRoundedRect(0, 0, btnW, btnH, 8);
    g.lineStyle(2, 0x38bdf8, 1);
    g.strokeRoundedRect(0, 0, btnW, btnH, 8);

    const t = this.scene.add.text(btnW / 2, btnH / 2, "【 🔒 锁定阵容 · 步入召唤师峡谷 ▶ 】", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "15px",
      fontStyle: "bold",
      color: "#ffffff",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);

    const hit = this.scene.add.rectangle(btnW / 2, btnH / 2, btnW, btnH, 0x000000, 0);
    hit.setInteractive({ useHandCursor: true });
    hit.on("pointerdown", () => {
      this.handleConfirm();
    });

    confirmBtn.add([g, t, hit]);
    this.add(confirmBtn);
  }

  private handleConfirm(): void {
    let score = 0;
    const current = TACTICAL_STYLE_DEFINITIONS[this.selectedTactics];
    if (current.counters === this.opponentTactics) score += 15;
    else if (current.counteredBy === this.opponentTactics) score -= 12;
    if (this.isSignatureLocked) score += 10;
    if (this.playerSide === "blue") score += 3;

    const result: EsportsBpResult = {
      playerSide: this.playerSide,
      playerTactics: this.selectedTactics,
      opponentTactics: this.opponentTactics,
      playerChampion: this.selectedChampion,
      advantageScore: score,
      advantageTitle: this.advantageScoreText.text,
      advantageReason: this.counterFeedbackText.text,
      isSignatureLocked: this.isSignatureLocked,
    };

    if (this.onConfirmCallback) {
      this.onConfirmCallback(result);
    }
  }
}
